import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientId = (Deno.env.get("GMAIL_CLIENT_ID") || "").trim();
const clientSecret = (Deno.env.get("GMAIL_CLIENT_SECRET") || "").trim();
const admin = createClient(url, serviceKey);
const cors = {"Access-Control-Allow-Origin":"https://msriram.github.io","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:cors});
const encode=(value:string)=>btoa(unescape(encodeURIComponent(value))).replaceAll("+","-").replaceAll("/","_").replace(/=+$/," ").trim();

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return reply({error:"Method not allowed"},405);
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  const {data:{user}}=token?await admin.auth.getUser(token):{data:{user:null}};
  const {data:profile}=user?await admin.from("profiles").select("role,is_admin,email,approval_status,is_active").eq("id",user.id).maybeSingle():{data:null};
  if(!profile||profile.approval_status!=="approved"||!profile.is_active||profile.role!=="coach"||!(profile.is_admin||profile.email?.toLowerCase()==="sriram87@gmail.com"))return reply({error:"Administrator access required"},403);
  const {data:credential}=await admin.from("gmail_sender_credentials").select("email,refresh_token").eq("id",true).maybeSingle();
  if(!credential)return reply({error:"Connect Gmail first"},400);
  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:credential.refresh_token,grant_type:"refresh_token"})});
  const tokens=await tokenResponse.json();
  if(!tokenResponse.ok||!tokens.access_token)return reply({error:"Gmail authorization expired. Connect Gmail again."},401);
  const body=await req.json().catch(()=>({}));
  let subject="Folsom Fireflies homework reminders are connected";
  let content=`<h2>Gmail is connected</h2><p>This is a test message from the Folsom Fireflies Team Room.</p><p>Weekly homework reminders will be sent here from this Gmail account once the schedule is enabled.</p>`;
  if(body?.kind==="week2" || body?.kind==="current"){
    let assignmentQuery=admin.from("assignments").select("id,title,description,due_at,week_number").eq("published",true).order("due_at");
    if(body?.kind==="week2") assignmentQuery=assignmentQuery.eq("week_number",2);
    else assignmentQuery=assignmentQuery.gte("due_at",new Date().toISOString());
    const {data:assignment}=await assignmentQuery.limit(1).maybeSingle();
    if(!assignment)return reply({error:"No current published homework is available"},404);
    const {data:questions}=await admin.from("assignment_questions").select("prompt,display_order").eq("assignment_id",assignment.id).order("display_order");
    const esc=(value:unknown)=>String(value??"").replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]!));
    const due=new Intl.DateTimeFormat("en-US",{dateStyle:"full",timeStyle:"short",timeZone:"America/Los_Angeles"}).format(new Date(assignment.due_at));
    const {data:robotTask}=await admin.from("robot_homework_tasks").select("title,description,cs2n_url").eq("week_number",assignment.week_number).eq("phase","required").limit(1).maybeSingle();
    subject=`Folsom FLL Team: Week ${assignment.week_number} Homework Posted`;
    content=`<p style="margin:0;color:#64746d;font-size:12px;letter-spacing:.1em;text-transform:uppercase">Folsom FLL Team · Week ${assignment.week_number}</p><h1 style="font-size:25px">TOPIC: ${esc(assignment.title)}</h1><p>Hello Sriram,</p><p>Please help your student set aside time to explore, create their own response, and upload any required work.</p><p><strong>Due:</strong> ${esc(due)}</p><div style="background:#f2f7ef;border-left:4px solid #175b3c;padding:14px 16px">${esc(assignment.description)}</div><h2 style="font-size:18px">What to complete</h2><ol>${(questions||[]).map(q=>`<li style="margin:8px 0">${esc(q.prompt)}</li>`).join("")}</ol>${robotTask?`<h2 style="font-size:18px">Robot programming</h2><p><strong>${esc(robotTask.title)}</strong><br>${esc(robotTask.description)}</p><p>Complete the program, upload a screenshot of the finished work, and explain in a few sentences how the program worked.</p><p><a href="${esc(robotTask.cs2n_url)}">Open the programming activity</a></p>`:""}<p><a href="https://msriram.github.io/folsom-fireflies/portal.html?tab=homework" style="display:inline-block;background:#175b3c;color:#fff;padding:11px 16px;border-radius:6px;text-decoration:none">Open homework</a></p>`;
  }
  const send = async (to:string, name="team member", role="parent") => {
    const intro=role === "student" ? "Set aside time to explore, create your own response, and upload any required work." : "Please help your student set aside time to explore, create their own response, and upload any required work.";
    const personalized=content.replace("Hello Sriram,",`Hello ${name},`).replace("Please help your student set aside time to explore, create their own response, and upload any required work.",intro);
    const raw=`To: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div style="font-family:Arial,sans-serif;line-height:1.5;color:#173a2a;max-width:680px">${personalized}</div>`;
    return fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${tokens.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({raw:encode(raw)})});
  };
  if(body?.deliverToTeam===true){
    if(!["week2","current"].includes(body?.kind)) return reply({error:"No homework release is available"},400);
    const roles=body?.coachesOnly===true?["coach","student_coach"]:["student","parent"];
    const {data:people}=await admin.from("profiles").select("display_name,email,role").in("role",roles).eq("approval_status","approved").eq("is_active",true).not("email","is",null);
    const recipients=[...new Map((people||[]).filter(p=>p.email).map(p=>[p.email!.toLowerCase(),p])).values()];
    let sent=0,failed=0;
    for(const person of recipients){const result=await send(person.email!,person.display_name||"team member",person.role||"parent");if(result.ok)sent++;else failed++;}
    return reply({sent,failed,recipients:recipients.length});
  }
  const sent=await send(credential.email,"Sriram");
  if(!sent.ok)return reply({error:"Gmail could not send the test message"},502);
  return reply({sent:true});
});
