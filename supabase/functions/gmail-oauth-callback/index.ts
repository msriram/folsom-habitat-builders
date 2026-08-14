import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const clientId = (Deno.env.get("GMAIL_CLIENT_ID") || "").trim();
const clientSecret = (Deno.env.get("GMAIL_CLIENT_SECRET") || "").trim();
const redirectUri = `${url}/functions/v1/gmail-oauth-callback`;
const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://msriram.github.io/folsom-fireflies";
const admin = createClient(url, serviceKey);

Deno.serve(async req => {
  const requestUrl = new URL(req.url), code = requestUrl.searchParams.get("code"), state = requestUrl.searchParams.get("state");
  if (!code || !state) return new Response("Google authorization was not completed.", {status:400});
  const {data:pending} = await admin.from("gmail_oauth_states").select("profile_id,expires_at").eq("state",state).maybeSingle();
  await admin.from("gmail_oauth_states").delete().eq("state",state);
  if (!pending || new Date(pending.expires_at) < new Date()) return new Response("This authorization link has expired. Return to the admin page and try again.", {status:400});
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"})});
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.refresh_token) return new Response("Google did not return a reusable authorization. Return to the admin page and try again.", {status:400});
  const {data:profile} = await admin.from("profiles").select("email").eq("id",pending.profile_id).maybeSingle();
  const {error} = await admin.from("gmail_sender_credentials").upsert({id:true,email:profile?.email || "Connected Gmail account",refresh_token:tokens.refresh_token,connected_by:pending.profile_id,connected_at:new Date().toISOString()});
  if (error) return new Response("Gmail authorization could not be saved.", {status:500});
  return Response.redirect(`${siteUrl}/admin.html?gmail=connected`, 302);
});
