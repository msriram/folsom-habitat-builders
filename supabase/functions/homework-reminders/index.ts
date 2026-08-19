import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendKey = Deno.env.get("RESEND_API_KEY");
const from = Deno.env.get("REMINDER_FROM_EMAIL") || "Team Room <onboarding@resend.dev>";
const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://msriram.github.io/folsom-fireflies";
const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
const admin = createClient(supabaseUrl, serviceKey);

const html = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]!));
const dateText = (value: string) => new Intl.DateTimeFormat("en-US", {dateStyle:"full", timeStyle:"short", timeZone:"America/Los_Angeles"}).format(new Date(value));

async function sendEmail(to: string, subject: string, body: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({from, to: [to], subject, html: body}),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  if (!cronSecret || req.headers.get("x-reminder-secret") !== cronSecret) return Response.json({error:"Unauthorized"},{status:401});
  if (!resendKey) return Response.json({error:"RESEND_API_KEY is not configured"},{status:503});

  const {data:queued,error:queueError} = await admin.rpc("queue_homework_reminders");
  if (queueError) return Response.json({error:"Could not queue homework reminders"},{status:500});
  const {data:reminders,error} = await admin.from("homework_reminders")
    .select("id,assignment_id,student_id,recipient_id,reminder_kind,attempts,scheduled_for,assignments(title,description,due_at,week_number),student:profiles!homework_reminders_student_id_fkey(display_name),recipient:profiles!homework_reminders_recipient_id_fkey(display_name,email)")
    .in("status", ["pending","failed"]).lt("attempts",3).lte("scheduled_for",new Date().toISOString()).order("scheduled_for").limit(100);
  if (error) return Response.json({error:"Could not load reminder queue"},{status:500});

  let sent=0, failed=0;
  for (const reminder of reminders || []) {
    const assignment = Array.isArray(reminder.assignments) ? reminder.assignments[0] : reminder.assignments;
    const recipient = Array.isArray(reminder.recipient) ? reminder.recipient[0] : reminder.recipient;
    const student = Array.isArray(reminder.student) ? reminder.student[0] : reminder.student;
    if (!recipient?.email || !assignment) continue;
    await admin.from("homework_reminders").update({status:"sending",attempts:(reminder.attempts||0)+1,last_error:null}).eq("id",reminder.id).in("status",["pending","failed"]);
    const isCoachDigest = reminder.reminder_kind === "wednesday_coach";
    const humanWeek = Number(assignment.week_number || 0) + 1;
    // Rotate one Core Values activity each season week. Week 3 starts with
    // Discovery 1, then Innovation, Impact, Inclusion, Teamwork, and Fun;
    // after six weeks the activity number advances to 2 (then 3).
    const coreValues = ["discovery", "innovation", "impact", "inclusion", "teamwork", "fun"];
    const coreIndex = humanWeek - 3;
    const scheduledOverride = humanWeek === 5 ? ["fun", 2] as const : null;
    const coreActivity = scheduledOverride?.[1] ?? (coreIndex >= 0 ? Math.floor(coreIndex / coreValues.length) + 1 : 0);
    const coreValue = scheduledOverride?.[0] ?? (coreIndex >= 0 ? coreValues[coreIndex % coreValues.length] : "");
    const groupOnly = new Set(["innovation-2", "innovation-3", "inclusion-1", "teamwork-2", "teamwork-3"]);
    const coreKey = `${coreValue}-${coreActivity}`;
    const homeworkSafe = coreActivity >= 1 && coreActivity <= 3 && !groupOnly.has(coreKey);
    const coreHref = coreKey === "teamwork-1" || coreKey === "fun-1"
      ? `${siteUrl}/portal.html?tab=homework#core-values-teamwork-1`
      : `${siteUrl}/downloads/bioglow/core-values-${coreValue}-${coreActivity}.pdf`;
    const worksheetLink = homeworkSafe
      ? `<p style="margin:18px 0"><strong>Optional team meeting activity</strong><br><span style="color:#53645a">Some Core Values pages are designed for the whole group, so do this together during a practice rather than as individual homework.</span><br><a href="${coreHref}" style="display:inline-block;border:1px solid #175b3c;color:#175b3c;padding:10px 14px;border-radius:6px;text-decoration:none;margin-top:8px">Open ${coreValue} Activity ${coreActivity} ↗</a></p>`
      : coreActivity >= 1 && coreActivity <= 3
        ? `<p style="margin:18px 0;color:#53645a"><strong>Core Values team meeting:</strong> ${coreValue} Activity ${coreActivity} is a group activity. It is not assigned as individual homework; the coach will use it during a team practice.</p>`
        : "";
    const lead = isCoachDigest ? "Wednesday coach digest" : "Wednesday homework notice";
    const subject = `Week ${humanWeek} · ${lead}: ${assignment.title}`;
    const { data: questions } = await admin.from("assignment_questions").select("prompt,display_order").eq("assignment_id", assignment.id).order("display_order");
    const questionList = (questions || []).map(question => `<li style="margin:8px 0">${html(question.prompt)}</li>`).join("");
    const body = `<div style="font-family:Arial,sans-serif;line-height:1.55;max-width:680px;color:#173a2a"><div style="border-top:6px solid #175b3c;padding:22px 0 8px"><p style="margin:0;color:#6b766e;font-size:12px;letter-spacing:.12em;text-transform:uppercase">Folsom Fireflies · Team Room · Week ${humanWeek}</p><h1 style="font-size:24px;line-height:1.2;margin:8px 0">${html(assignment.title)}</h1></div><p>Hello ${html(recipient.display_name || student?.display_name || "team member")},</p><p>${isCoachDigest ? "This is the Wednesday coach digest for the current homework cycle." : `This is the Wednesday homework notice for ${html(student?.display_name || "your student")}.`}</p><p><strong>Due:</strong> ${html(dateText(assignment.due_at))}</p><div style="background:#f2f7ef;border-left:4px solid #78a85b;padding:14px 16px;margin:18px 0"><p style="margin:0">${html(assignment.description)}</p></div>${questionList ? `<h2 style="font-size:17px;margin:20px 0 8px">What to complete</h2><ol style="padding-left:22px">${questionList}</ol>` : ""}${worksheetLink}<p style="margin:22px 0"><a href="${siteUrl}/portal.html?tab=homework" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Open the homework page</a></p><p style="font-size:12px;color:#6b766e">Family notices are scheduled Wednesday at 9:00 PM Pacific. The coach digest is scheduled Wednesday at 11:15 AM Pacific.</p></div>`;
    try { await sendEmail(recipient.email, subject, body); await admin.from("homework_reminders").update({status:"sent",sent_at:new Date().toISOString()}).eq("id",reminder.id); sent++; }
    catch (sendError) { await admin.from("homework_reminders").update({status:"failed",last_error:String(sendError).slice(0,500)}).eq("id",reminder.id); failed++; }
  }
  return Response.json({queued:queued || 0, sent, failed});
});
