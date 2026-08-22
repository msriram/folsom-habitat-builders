import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const gmailClientId = (Deno.env.get("GMAIL_CLIENT_ID") || "").trim();
const gmailClientSecret = (Deno.env.get("GMAIL_CLIENT_SECRET") || "").trim();
const openaiKey = (Deno.env.get("OPENAI_API_KEY") || "").trim();
const siteUrl = "https://msriram.github.io/folsom-fireflies";
const admin = createClient(supabaseUrl, serviceKey);
const cors = {
  "Access-Control-Allow-Origin": siteUrl,
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
    admin.from("assignments").select("title,description,due_at,week_number").eq("team_id", profile.team_id).eq("published", true).gte("due_at", new Date().toISOString()).order("due_at").limit(1),
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
    "Rewrite the coach’s session notes as a warm, accurate 2–3 sentence family update. Keep concrete accomplishments and next steps. Do not add facts, names, judgments, or sensitive information.",
    rawNotes,
    rawNotes,
  );
  const researchPrompts = (questions || []).map(item => item.question).join("\n");
  const researchSummary = questions?.length
    ? await summarizeWithAi(
      "Summarize these elementary-school science and robotics research questions for a family email in 1–2 short sentences. Mention broad themes, not names. Do not answer the questions or invent facts.",
      researchPrompts,
      `${questions.length} team research question${questions.length === 1 ? " was" : "s were"} explored this week.`,
    )
    : "No new shared Research with AI questions were recorded this week.";
  const nextAssignment = assignments?.[0];
  const due = nextAssignment?.due_at ? new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "America/Los_Angeles" }).format(new Date(nextAssignment.due_at)) : "To be announced";
  const questionLink = `${siteUrl}/portal.html?tab=research`;
  const homeworkLink = `${siteUrl}/portal.html?tab=homework`;
  const latestLabel = latestSession ? `Session ${sessionNumber(latestSession.session_key)} · ${new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "America/Los_Angeles" }).format(new Date(`${latestSession.session_date}T12:00:00`))}` : "Latest session";
  const html = `<p style="margin:0;color:#64746d;font-size:12px;letter-spacing:.1em;text-transform:uppercase">Habitat Builders · Family digest</p><h1 style="font-size:25px">This week with the team</h1><h2 style="font-size:18px">Overall progress</h2><p>${items.filter(item => item.completed).length} of ${items.length} session checklist items are complete, with ${completedSessions.length} of ${sessionGroups.length} sessions fully completed.</p><h2 style="font-size:18px">Session completed</h2><p><strong>${esc(lastCompleted.replace("meeting-", "Session "))}</strong></p><h2 style="font-size:18px">${esc(latestLabel)}</h2><p>${esc(sessionSummary).replace(/\n/g, "<br>")}</p><h2 style="font-size:18px">Research with AI · last 7 days</h2><p>${esc(researchSummary).replace(/\n/g, "<br>")}</p><p><a href="${questionLink}">Explore the team’s Research with AI →</a></p>${nextAssignment ? `<h2 style="font-size:18px">Next homework</h2><p><strong>Week ${nextAssignment.week_number}: ${esc(nextAssignment.title)}</strong><br>Due ${esc(due)}<br>${esc(nextAssignment.description)}</p><p><a href="${homeworkLink}" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Open homework</a></p>` : ""}<p style="margin-top:28px;color:#64746d">Thank you for supporting the team’s learning, teamwork, and curiosity.</p>`;
  const { data: people } = await admin.from("profiles").select("display_name,email").eq("team_id", profile.team_id).in("role", ["student", "parent"]).eq("approval_status", "approved").eq("is_active", true).not("email", "is", null);
  const recipients = [...new Map((people || []).filter(person => person.email).map(person => [person.email!.toLowerCase(), person])).values()];
  let sent = 0;
  let failed = 0;
  for (const person of recipients) {
    const raw = `To: ${person.email}\r\nSubject: Habitat Builders: Weekly Team Digest\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div style="font-family:Arial,sans-serif;line-height:1.5;color:#173a2a;max-width:680px"><p>Hello ${esc(person.display_name || "team member")},</p>${html}</div>`;
    const sentResult = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", { method: "POST", headers: { Authorization: `Bearer ${gmailTokens.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encode(raw) }) });
    if (sentResult.ok) sent++; else failed++;
  }
  return reply({ sent, failed, recipients: recipients.length });
});
