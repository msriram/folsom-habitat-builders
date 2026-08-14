import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientId = Deno.env.get("GMAIL_CLIENT_ID")!;
const redirectUri = `${url}/functions/v1/gmail-oauth-callback`;
const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://msriram.github.io/folsom-fireflies";
const admin = createClient(url, serviceKey);

Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({error:"Sign in required"},{status:401});
  const {data:{user}} = await admin.auth.getUser(token);
  if (!user) return Response.json({error:"Sign in required"},{status:401});
  const {data:profile} = await admin.from("profiles").select("id,role,is_admin,email,approval_status,is_active").eq("id",user.id).maybeSingle();
  const allowed = profile?.approval_status === "approved" && profile?.is_active && profile.role === "coach" && (profile.is_admin || profile.email?.toLowerCase() === "sriram87@gmail.com");
  if (!allowed) return Response.json({error:"Administrator access required"},{status:403});
  const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const {error} = await admin.from("gmail_oauth_states").insert({state,profile_id:user.id,expires_at:new Date(Date.now()+10*60*1000).toISOString()});
  if (error) return Response.json({error:"Could not begin Gmail authorization"},{status:500});
  const params = new URLSearchParams({client_id:clientId,redirect_uri:redirectUri,response_type:"code",scope:"https://www.googleapis.com/auth/gmail.send",access_type:"offline",prompt:"consent",state});
  return Response.json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`,return_to:`${siteUrl}/admin.html`});
});
