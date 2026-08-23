import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gmailClientId = (Deno.env.get("GMAIL_CLIENT_ID") || "").trim();
const gmailClientSecret = (Deno.env.get("GMAIL_CLIENT_SECRET") || "").trim();
const openaiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
const siteOrigin = "https://msriram.github.io";
const siteUrl = `${siteOrigin}/folsom-fireflies`;
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
    admin.from("assignments").select("id,title,description,due_at,week_number").eq("team_id", profile.team_id).eq("published", true).lte("due_at", new Date().toISOString()).order("due_at", { ascending: false }).limit(1),
  ]);
  const items = scheduleItems || [];
  const groups = new Map<string, typeof items>();
  items.forEach(item => groups.set(item.session_key, [...(groups.get(item.session_key) || []), item]));
  const sessionGroups = [...groups.entries()].sort(([a], [b]) => sessionNumber(a) - sessionNumber(b));
  const completedSessions = sessionGroups.filter(([, rows]) => rows.length && rows.every(row => row.completed));
  const lastCompleted = completedSessions.at(-1)?.[0] || "No complete session recorded yet";
  const latestSession = (sessions || []).find(session => session.coach_notes?.trim()) || (sessions || [])[0];
  const rawNotes = latestSession?.coach_notes?.trim() || "The coach has not added a shareable session recap yet.";
  const sessionSummary = await summarizeWithAi(
    "Write a lively, warm family recap in 3–4 short sentences. Use concrete action verbs and name the actual builds, tests, ideas, or next steps in the supplied notes. Make it a useful snapshot of the team’s week, not a generic progress report. Do not add facts, names, judgments, or sensitive information. If the notes are sparse, be simple rather than inventing detail.",
    rawNotes,
    rawNotes,
  );
  const researchPrompts = (questions || []).map(item => item.question).join("\n");
  const researchSummary = questions?.length
    ? await summarizeWithAi(
      "Write a bright, specific 2–3 sentence family-facing curiosity recap of these elementary-school science and robotics questions. Mention the real themes and examples that appear, but no names. Do not answer the questions, add facts, or make vague claims such as 'students explored science.'",
      researchPrompts,
      `${questions.length} team research question${questions.length === 1 ? " was" : "s were"} explored this week.`,
    )
    : "No new shared Research with AI questions were recorded this week.";
  const completedAssignment = assignments?.[0];
  const [{ data: assignmentQuestions }, { data: robotTask }, { count: completedHomeworkCount }] = completedAssignment
    ? await Promise.all([
      admin.from("assignment_questions").select("prompt,display_order").eq("assignment_id", completedAssignment.id).order("display_order"),
      admin.from("robot_homework_tasks").select("title,description,cs2n_url").eq("week_number", completedAssignment.week_number).eq("phase", "required").limit(1).maybeSingle(),
      admin.from("submissions").select("id", { count: "exact", head: true }).eq("assignment_id", completedAssignment.id).in("status", ["submitted", "review", "revise", "complete"]),
    ])
    : [{ data: [] }, { data: null }, { count: 0 }];
  const due = completedAssignment?.due_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "America/Los_Angeles" }).format(new Date(completedAssignment.due_at)) : "To be announced";
  const questionLink = `${siteUrl}/portal.html?tab=research`;
  const homeworkLink = `${siteUrl}/portal.html?tab=homework`;
  const latestLabel = latestSession ? `Session ${sessionNumber(latestSession.session_key)} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" }).format(new Date(`${latestSession.session_date}T12:00:00`))}` : "Latest session";
  const homeworkSection = completedAssignment ? `<h2 style="font-size:18px">The work the team just wrapped up</h2><p><strong>Week ${completedAssignment.week_number}: ${esc(completedAssignment.title)}</strong><br>Due ${esc(due)}<br>${esc(completedAssignment.description)}</p><p><strong>${completedHomeworkCount || 0}</strong> homework submission${completedHomeworkCount === 1 ? " was" : "s were"} received for this week’s work.</p>${assignmentQuestions?.length ? `<h3 style="font-size:16px">The challenge</h3><ol>${assignmentQuestions.map(question => `<li style="margin:8px 0">${esc(question.prompt)}</li>`).join("")}</ol>` : ""}${robotTask ? `<h3 style="font-size:16px">Robot programming adventure</h3><p><strong>${esc(robotTask.title)}</strong><br>${esc(robotTask.description)}</p>` : ""}<p><a href="${homeworkLink}" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Open homework</a></p>` : "";
  const weeklyHighlight = `<section style="margin:20px 0;padding:18px 20px;border:1px solid #6f9a57;border-left:6px solid #175b3c;border-radius:12px;background:#eef7e8"><p style="margin:0 0 6px;color:#476637;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">This week’s highlight</p><h2 style="margin:0 0 8px;font-size:22px;color:#173a2a">Meet the Habitat Builders!</h2><p style="margin:0 0 10px">The team has chosen its new name: <strong>Habitat Builders</strong>.</p><p style="margin:0"><a href="https://msriram.github.io/folsom-habitat-builders" style="color:#175b3c;font-weight:700">Visit the new team home →</a></p></section>`;
  const html = `<p style="margin:0;color:#64746d;font-size:12px;letter-spacing:.1em;text-transform:uppercase">Habitat Builders · Family digest</p><h1 style="font-size:25px">What the Habitat Builders explored this week</h1>${weeklyHighlight}<h2 style="font-size:18px">Our season journey</h2><p>${items.filter(item => item.completed).length} of ${items.length} session checklist items are complete, with ${completedSessions.length} of ${sessionGroups.length} sessions fully completed.</p><h2 style="font-size:18px">Milestone reached</h2><p><strong>${esc(lastCompleted.replace("meeting-", "Session "))}</strong></p><h2 style="font-size:18px">${esc(latestLabel)}</h2><p>${esc(sessionSummary).replace(/\n/g, "<br>")}</p><h2 style="font-size:18px">Curiosity trail · last 7 days</h2><p>${esc(researchSummary).replace(/\n/g, "<br>")}</p><p><a href="${questionLink}">Explore the team’s Research with AI →</a></p>${homeworkSection}<p style="margin-top:28px;color:#64746d">Thank you for supporting the team’s learning, teamwork, and curiosity.</p>`;
  const { data: people } = preview
    ? await admin.from("profiles").select("display_name,email").eq("email", "sriram87@gmail.com").eq("approval_status", "approved").eq("is_active", true).limit(1)
    : await admin.from("profiles").select("display_name,email").eq("team_id", profile.team_id).in("role", ["student", "parent"]).eq("approval_status", "approved").eq("is_active", true).not("email", "is", null);
  const recipients = [...new Map((people || []).filter(person => person.email).map(person => [person.email!.toLowerCase(), person])).values()];
  if (preview && !recipients.length) return reply({ error: "The Sriram coach account is not available for a preview" }, 404);
  let sent = 0;
  let failed = 0;
  for (const person of recipients) {
    const raw = `To: ${person.email}\r\nSubject: Habitat Builders: Weekly Team Digest\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div style="font-family:Arial,sans-serif;line-height:1.5;color:#173a2a;max-width:680px"><img src="${emailLogo}" width="76" height="76" alt="Habitat Builders" style="display:block;width:76px;height:76px;margin:0 0 14px;border:0;border-radius:12px"><p>Hello ${esc(person.display_name || "team member")},</p>${html}</div>`;
    const sentResult = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${gmailTokens.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encode(raw) }) });
    if (sentResult.ok) sent++; else failed++;
  }
  return reply({ sent, failed, recipients: recipients.length, preview });
});
