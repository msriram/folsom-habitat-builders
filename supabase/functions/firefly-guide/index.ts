import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const refusal = "I don’t have permission to answer that here. Ask me about BIOGLOW, biodiversity, LEGO robotics, SPIKE Prime, the Innovation Project, or our team work.";
const topics = /bioglow|biodiversity|ecosystem|species|habitat|lego|spike|robot|mission|innovation project|teamwork|coding/i;
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  const {question=""} = await req.json();
  if (typeof question !== "string" || question.length > 1000) return Response.json({error:"Invalid question"},{status:400});
  if (!topics.test(question)) return Response.json({answer:refusal, inScope:false});
  return Response.json({answer:"Live model and approved-document retrieval must be configured before enabling this endpoint.",inScope:true});
});
