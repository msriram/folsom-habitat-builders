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
    .select("id,assignment_id,student_id,recipient_id,reminder_kind,attempts,assignments(title,description,due_at,week_number),student:profiles!homework_reminders_student_id_fkey(display_name),recipient:profiles!homework_reminders_recipient_id_fkey(display_name,email)")
    .in("status", ["pending","failed"]).lt("attempts",3).lte("scheduled_for",new Date().toISOString()).order("scheduled_for").limit(100);
  if (error) return Response.json({error:"Could not load reminder queue"},{status:500});

  let sent=0, failed=0;
  for (const reminder of reminders || []) {
    const assignment = Array.isArray(reminder.assignments) ? reminder.assignments[0] : reminder.assignments;
    const recipient = Array.isArray(reminder.recipient) ? reminder.recipient[0] : reminder.recipient;
    const student = Array.isArray(reminder.student) ? reminder.student[0] : reminder.student;
    if (!recipient?.email || !assignment) continue;
    await admin.from("homework_reminders").update({status:"sending",attempts:(reminder.attempts||0)+1,last_error:null}).eq("id",reminder.id).in("status",["pending","failed"]);
    const lead = reminder.reminder_kind === "one_week" ? "One week" : "Two days";
    const subject = `${lead} reminder: ${assignment.title}`;
    const body = `<div style="font-family:Arial,sans-serif;line-height:1.5;max-width:640px"><p>Hello ${html(recipient.display_name || "team family")},</p><h1 style="font-size:22px">${html(assignment.title)}</h1><p>${html(lead)} until ${html(student?.display_name || "your student")}’s homework is due.</p><p><strong>Due:</strong> ${html(dateText(assignment.due_at))}</p><p>${html(assignment.description)}</p><p><a href="${siteUrl}/portal.html?tab=homework">Open the homework page</a></p><p>This is an automatic team reminder. Please reply to your coach with any question.</p></div>`;
    try { await sendEmail(recipient.email, subject, body); await admin.from("homework_reminders").update({status:"sent",sent_at:new Date().toISOString()}).eq("id",reminder.id); sent++; }
    catch (sendError) { await admin.from("homework_reminders").update({status:"failed",last_error:String(sendError).slice(0,500)}).eq("id",reminder.id); failed++; }
  }
  return Response.json({queued:queued || 0, sent, failed});
});
