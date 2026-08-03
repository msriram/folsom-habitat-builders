import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(() => Response.json({error:"Weekly reports are disabled until parent consent, authorization, and delivery providers are configured."},{status:503}));
