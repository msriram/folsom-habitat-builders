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
  const subject="Folsom Fireflies homework reminders are connected";
  const raw=`To: ${credential.email}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>Gmail is connected</h2><p>This is a test message from the Folsom Fireflies Team Room.</p><p>Weekly homework reminders will be sent here from this Gmail account once the schedule is enabled.</p></div>`;
  const sent=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:`Bearer ${tokens.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({raw:encode(raw)})});
  if(!sent.ok)return reply({error:"Gmail could not send the test message"},502);
  return reply({sent:true});
});
