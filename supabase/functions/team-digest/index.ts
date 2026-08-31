import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gmailClientId = (Deno.env.get("GMAIL_CLIENT_ID") || "").trim();
const gmailClientSecret = (Deno.env.get("GMAIL_CLIENT_SECRET") || "").trim();
const openaiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
const siteOrigin = "https://msriram.github.io";
const siteUrl = `${siteOrigin}/folsom-habitat-builders`;
const emailLogo = `${siteUrl}/assets/img/habitat-builders-logo.png`;
const admin = createClient(supabaseUrl, serviceKey);
const cors = {
  "Access-Control-Allow-Origin": siteOrigin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const esc = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
const encode = (value: string) => btoa(unescape(encodeURIComponent(value))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
const sessionNumber = (key: string) => Number(key.match(/(\d+)$/)?.[1] || 0);

async function summarizeWithAi(instructions: string, input: string, fallback: string) {
  if (!openaiKey || !input.trim()) return fallback;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 180,
        instructions,
        input,
      }),
    });
    const data = await response.json();
    const text = String(data.output_text || data.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) =>
      (item.content || []).filter(content => content.type === "output_text").map(content => content.text || "")
    ).join("") || "").trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const preview = body?.preview === true;

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const { data: { user } } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const { data: profile } = user ? await admin.from("profiles")
    .select("id,team_id,role,approval_status,is_active")
    .eq("id", user.id).maybeSingle() : { data: null };
  if (!profile || profile.approval_status !== "approved" || !profile.is_active || profile.role !== "coach") {
    return reply({ error: "Coach access is required" }, 403);
  }

  const { data: credential } = await admin.from("gmail_sender_credentials").select("email,refresh_token").eq("id", true).maybeSingle();
  if (!credential) return reply({ error: "Connect Gmail first" }, 400);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: gmailClientId, client_secret: gmailClientSecret, refresh_token: credential.refresh_token, grant_type: "refresh_token" }),
  });
  const gmailTokens = await tokenResponse.json();
  if (!tokenResponse.ok || !gmailTokens.access_token) return reply({ error: "Gmail authorization expired. Reconnect Gmail from the admin page." }, 401);

  const [{ data: scheduleItems }, { data: sessions }, { data: questions }, { data: assignments }] = await Promise.all([
    admin.from("schedule_items").select("session_key,completed").eq("team_id", profile.team_id),
    admin.from("schedule_sessions").select("session_key,session_date,coach_notes,published").eq("team_id", profile.team_id).eq("published", true).order("session_date", { ascending: false }),
    admin.from("questions").select("question,created_at").eq("team_id", profile.team_id).eq("visibility", "team").not("ai_answer", "is", null).gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: false }).limit(20),
    admin.from("assignments").select("id,title,description,due_at,week_number").eq("team_id", profile.team_id).eq("published", true).gte("due_at", new Date().toISOString()).order("due_at", { ascending: true }).limit(1),
  ]);
  const items = scheduleItems || [];
  const groups = new Map<string, typeof items>();
  items.forEach(item => groups.set(item.session_key, [...(groups.get(item.session_key) || []), item]));
  const sessionGroups = [...groups.entries()].sort(([a], [b]) => sessionNumber(a) - sessionNumber(b));
  const completedSessions = sessionGroups.filter(([, rows]) => rows.length && rows.every(row => row.completed));
  // The digest must describe the latest published session, not silently fall
  // back to an older one just because its recap field happens to be populated.
  const latestSession = (sessions || [])[0];
  const rawNotes = latestSession?.coach_notes?.trim() || "The coach has not added a shareable session recap yet.";
  const { data: studentReviews } = latestSession
    ? await admin.from("session_student_reviews").select("work_completed,went_well,next_improvement").eq("team_id", profile.team_id).eq("session_key", latestSession.session_key)
    : { data: [] };
  const studentFeedback = (studentReviews || []).map(review => [review.work_completed, review.went_well, review.next_improvement].filter(Boolean).join(" ")).filter(Boolean).join("\n");
  const sessionSummary = await summarizeWithAi(
    "Write a warm, practical coach message for families in 4–5 short sentences. Start naturally like ‘Good job, team!’ and describe the real builds, tests, ideas, or effort from the notes. Include one encouraging, specific area to improve next time. Do not name students, give grades, add facts, or invent criticism. Keep it kind, concrete, and useful.",
    [rawNotes, studentFeedback].filter(Boolean).join("\n"),
    rawNotes,
  );
  const researchPrompts = (questions || []).map(item => item.question).join("\n");
  const researchSummary = questions?.length
    ? await summarizeWithAi(
      "Write a bright, specific 3–4 sentence family-facing curiosity recap of these elementary-school science and robotics questions. Explain the real themes and examples the students chose to explore, but do not name students or answer the questions. Celebrate thoughtful asking without vague claims such as 'students explored science.'",
      researchPrompts,
      `${questions.length} team research question${questions.length === 1 ? " was" : "s were"} explored this week.`,
    )
    : "No new shared Research with AI questions were recorded this week.";
  const completedAssignment = assignments?.[0];
  const [{ data: assignmentQuestions }, { data: robotTask }] = completedAssignment
    ? await Promise.all([
      admin.from("assignment_questions").select("prompt,display_order").eq("assignment_id", completedAssignment.id).order("display_order"),
      admin.from("robot_homework_tasks").select("title,description,cs2n_url").eq("week_number", completedAssignment.week_number).eq("phase", "required").limit(1).maybeSingle(),
    ])
    : [{ data: [] }, { data: null }];
  const due = completedAssignment?.due_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "America/Los_Angeles" }).format(new Date(completedAssignment.due_at)) : "To be announced";
  const questionLink = `${siteUrl}/portal.html?tab=research`;
  const homeworkLink = `${siteUrl}/portal.html?tab=homework`;
  const latestLabel = latestSession ? `Session ${sessionNumber(latestSession.session_key)} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" }).format(new Date(`${latestSession.session_date}T12:00:00`))}` : "Latest session";
  const nextPlanInput = completedAssignment ? [`Week ${completedAssignment.week_number}: ${completedAssignment.title}`, completedAssignment.description, ...(assignmentQuestions || []).map(question => question.prompt), robotTask?.title, robotTask?.description].filter(Boolean).join("\n") : "";
  const nextPlan = completedAssignment ? await summarizeWithAi(
    "Write a friendly coach’s game plan for the coming week in 3 short sentences. Turn the supplied assignment into an encouraging sequence: prepare, try, and bring one useful observation or question. Be specific to the supplied work, age-appropriate, and do not invent requirements.",
    nextPlanInput,
    "Read the upcoming task, try one part at a time, and bring one useful observation or question to the next session.",
  ) : "";
  const homeworkSection = completedAssignment ? `<h2 style="font-size:18px">What’s next</h2><p><strong>Week ${completedAssignment.week_number}: ${esc(completedAssignment.title)}</strong><br>Due ${esc(due)}<br>${esc(completedAssignment.description)}</p><h3 style="font-size:16px">Coach’s game plan</h3><p>${esc(nextPlan).replace(/\n/g, "<br>")}</p>${assignmentQuestions?.length ? `<h3 style="font-size:16px">The next challenge</h3><ol>${assignmentQuestions.map(question => `<li style="margin:8px 0">${esc(question.prompt)}</li>`).join("")}</ol>` : ""}${robotTask ? `<h3 style="font-size:16px">Robot programming adventure</h3><p><strong>${esc(robotTask.title)}</strong><br>${esc(robotTask.description)}</p>` : ""}<p><a href="${homeworkLink}" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Open upcoming homework</a></p>` : "";
  const weeklyHighlight = `<section style="margin:20px 0;padding:18px 20px;border:1px solid #6f9a57;border-left:6px solid #175b3c;border-radius:12px;background:#eef7e8"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="vertical-align:top"><p style="margin:0 0 6px;color:#476637;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">This week’s highlight</p><h2 style="margin:0 0 8px;font-size:22px;color:#173a2a">Meet the Habitat Builders!</h2><p style="margin:0 0 10px">The team has chosen its new name: <strong>Habitat Builders</strong>.</p><p style="margin:0"><a href="${siteUrl}" style="color:#175b3c;font-weight:700">Visit the new team home →</a></p></td><td width="76" style="width:76px;padding-left:16px;vertical-align:top"><img src="${emailLogo}" width="64" height="64" alt="Habitat Builders" style="display:block;width:64px;height:64px;border:0;border-radius:12px"></td></tr></table></section>`;
  const missionVideoSection = `<section style="margin:24px 0"><h2 style="margin:0 0 6px;font-size:18px">Mission videos to explore</h2><p style="margin:0 0 14px">Click a mission picture to watch the video and see how another team approached it.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td width="33.33%" style="width:33.33%;padding:0 5px 0 0;vertical-align:top"><a href="https://www.youtube.com/watch?v=iFuf68nOwbY" target="_blank" style="text-decoration:none;color:#173a2a"><img src="${siteUrl}/assets/img/missions/mission-01.jpg" width="200" alt="Mission 1: Drone Survey — watch video" style="display:block;width:100%;height:auto;border:0;border-radius:10px"><p style="margin:8px 0 0;font-size:14px;line-height:1.3"><strong>Mission 1</strong><br>Drone Survey</p></a></td><td width="33.33%" style="width:33.33%;padding:0 3px;vertical-align:top"><a href="https://www.youtube.com/results?search_query=FLL+BIOGLOW+Mission+3+Flip+the+Rock" target="_blank" style="text-decoration:none;color:#173a2a"><img src="${siteUrl}/assets/img/missions/mission-03.jpg" width="200" alt="Mission 3: Flip the Rock — find videos on YouTube" style="display:block;width:100%;height:auto;border:0;border-radius:10px"><p style="margin:8px 0 0;font-size:14px;line-height:1.3"><strong>Mission 3</strong><br>Flip the Rock</p></a></td><td width="33.33%" style="width:33.33%;padding:0 0 0 5px;vertical-align:top"><a href="https://www.youtube.com/watch?v=FCZjjMgkUdY" target="_blank" style="text-decoration:none;color:#173a2a"><img src="${siteUrl}/assets/img/missions/mission-06.jpg" width="200" alt="Mission 6: Leafcutter Frenzy — watch video" style="display:block;width:100%;height:auto;border:0;border-radius:10px"><p style="margin:8px 0 0;font-size:14px;line-height:1.3"><strong>Mission 6</strong><br>Leafcutter Frenzy</p></a></td></tr></table></section>`;
  const curiositySection = questions?.length ? `<h2 style="font-size:18px">Curiosity showcase</h2><p>These are questions the students brought to Ask AI this week. They are the starting points for the team’s research and discussion.</p><ol>${questions.slice(0, 8).map(question => `<li style="margin:8px 0">${esc(question.question)}</li>`).join("")}</ol><p><strong>What the team is exploring:</strong> ${esc(researchSummary).replace(/\n/g, "<br>")}</p><p><a href="${questionLink}" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Continue research with Ask AI</a></p>` : `<h2 style="font-size:18px">Curiosity showcase</h2><p>Ask AI is ready for the team’s biodiversity, robot, and Innovation Project questions. The first questions shared this week will appear here.</p><p><a href="${questionLink}">Open Ask AI →</a></p>`;
  const html = `<p style="margin:0;color:#64746d;font-size:12px;letter-spacing:.1em;text-transform:uppercase">Habitat Builders · Family digest</p><h1 style="font-size:25px">What the Habitat Builders explored this week</h1>${weeklyHighlight}<h2 style="font-size:18px">Our season journey</h2><p>${items.filter(item => item.completed).length} of ${items.length} session checklist items are complete, with ${completedSessions.length} of ${sessionGroups.length} sessions fully completed.</p><h2 style="font-size:18px">${esc(latestLabel)}</h2><p>${esc(sessionSummary).replace(/\n/g, "<br>")}</p>${homeworkSection}${missionVideoSection}${curiositySection}<p style="margin-top:28px;color:#64746d">Thank you for supporting the team’s learning, teamwork, and curiosity.</p>`;
  const { data: people } = preview
    ? await admin.from("profiles").select("display_name,email").eq("email", "sriram87@gmail.com").eq("approval_status", "approved").eq("is_active", true).limit(1)
    : await admin.from("profiles").select("display_name,email").eq("team_id", profile.team_id).in("role", ["student", "parent"]).eq("approval_status", "approved").eq("is_active", true).not("email", "is", null);
  const recipients = [...new Map((people || []).filter(person => person.email).map(person => [person.email!.toLowerCase(), person])).values()];
  if (preview && !recipients.length) return reply({ error: "The Sriram coach account is not available for a preview" }, 404);
  let sent = 0;
  let failed = 0;
  for (const person of recipients) {
    const raw = `To: ${person.email}\r\nSubject: Habitat Builders: Weekly Team Digest\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div style="font-family:Arial,sans-serif;line-height:1.5;color:#173a2a;max-width:680px"><p>Hello ${esc(person.display_name || "team member")},</p>${html}</div>`;
    const sentResult = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${gmailTokens.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encode(raw) }) });
    if (sentResult.ok) sent++; else failed++;
  }
  return reply({ sent, failed, recipients: recipients.length, preview });
});
