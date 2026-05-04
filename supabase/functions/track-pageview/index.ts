import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { path, referrer, session_id, user_agent } = body || {};
    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "path required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geo from Cloudflare/edge headers
    const country =
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("x-country") ||
      null;

    // Try to resolve user_id from JWT (optional)
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const anon = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: { user } } = await anon.auth.getUser();
        if (user) user_id = user.id;
      } catch { /* ignore */ }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await admin.from("page_views").insert({
      path: String(path).slice(0, 500),
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      session_id: session_id ? String(session_id).slice(0, 100) : null,
      user_agent: user_agent ? String(user_agent).slice(0, 300) : null,
      country: country && country !== "XX" ? country.toUpperCase().slice(0, 2) : null,
      user_id,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, country, user_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
