import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", {status:405});
  // Authenticate the coach, resolve the linked parent server-side, verify channel opt-in,
  // send an approved template, and write an audit record. Never accept a destination
  // address or student record directly from an untrusted browser request.
  return Response.json({error:"Notification delivery is disabled until providers and authorization checks are configured."},{status:503});
});
