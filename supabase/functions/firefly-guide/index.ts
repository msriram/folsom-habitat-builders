import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "gpt-5.6-luna";
const DAILY_LIMIT = 12;
const refusal = "I can only help with biodiversity, ecosystems, conservation, and related FLL Innovation Project research.";
const topics = /biodiversity|ecosystem|species|habitat|pollinat|conservation|wildlife|environment|food (?:web|chain)|invasive|endangered|innovation project/i;
const cors = {
  "Access-Control-Allow-Origin": "https://msriram.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return reply({ error: "Please sign in first." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return reply({ error: "Your sign-in expired. Please sign in again." }, 401);

    const { data: profile } = await admin.from("profiles")
      .select("id,team_id,role,approval_status,is_active")
      .eq("id", user.id).maybeSingle();
    if (!profile || profile.approval_status !== "approved" || !profile.is_active || !["student", "coach"].includes(profile.role)) {
      return reply({ error: "Only approved students and coaches can use Ask AI." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (question.length < 5 || question.length > 800) return reply({ error: "Enter a question between 5 and 800 characters." }, 400);

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const { count } = await admin.from("questions").select("id", { count: "exact", head: true })
      .eq("author_id", user.id).gte("created_at", since.toISOString()).not("ai_answer", "is", null);
    if ((count || 0) >= DAILY_LIMIT) return reply({ error: `Daily AI limit reached (${DAILY_LIMIT}). Bring your next question to a coach.` }, 429);

    if (!topics.test(question)) {
      await admin.from("questions").insert({ team_id: profile.team_id, author_id: user.id, question, ai_answer: refusal, visibility: "team", moderation_status: "out_of_scope" });
      return reply({ answer: refusal, inScope: false, remaining: DAILY_LIMIT - (count || 0) });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return reply({ error: "Ask AI is not configured." }, 503);
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: "none" },
        max_output_tokens: 350,
        instructions: "You are Ask AI, a warm research coach for elementary and middle-school FLL students. Answer only questions about biodiversity, ecosystems, conservation, or a directly related FLL Innovation Project. Refuse unrelated requests. Be age-appropriate and never request personal information. Do not complete homework for the student. Give a concise explanation, then 2-3 research steps or questions. Clearly say when a factual claim should be verified and suggest trustworthy source types such as government, university, museum, or scientific organizations. Never invent citations or URLs.",
        input: question,
      }),
    });
    const result = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error("OpenAI error", openaiResponse.status, result?.error?.code || "unknown");
      return reply({ error: "Ask AI is temporarily unavailable. No usage was saved." }, 502);
    }
    const answer = String(result.output_text || "").trim();
    if (!answer) return reply({ error: "Ask AI returned an empty answer. Please try again." }, 502);

    const { data: saved, error: saveError } = await admin.from("questions").insert({
      team_id: profile.team_id, author_id: user.id, question, ai_answer: answer,
      visibility: "team", moderation_status: "ai_answered", model: MODEL,
      input_tokens: result.usage?.input_tokens || null, output_tokens: result.usage?.output_tokens || null,
      response_id: result.id || null,
    }).select("id,created_at").single();
    if (saveError) return reply({ error: "The answer was generated but could not be saved. Please tell a coach." }, 500);
    return reply({ answer, inScope: true, id: saved.id, createdAt: saved.created_at, remaining: Math.max(0, DAILY_LIMIT - (count || 0) - 1) });
  } catch (error) {
    console.error("Ask AI failure", error instanceof Error ? error.message : "unknown");
    return reply({ error: "Ask AI could not process that request." }, 500);
  }
});
