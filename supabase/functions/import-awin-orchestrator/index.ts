// Orchestrates the Awin feed import for all 4 FIDs (merchants).
// Each FID is processed by a separate `import-awin-feed` invocation
// to stay within edge-function CPU limits.
//
// Modes:
//   - sequential (default): waits for each FID to complete before triggering the next.
//     Slower but easy to monitor. Total: ~4–8 min.
//   - parallel: fires all 4 in parallel without waiting (returns immediately).
//     Fastest but harder to track. Recommended for cron.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_FIDS = ["48225", "87190", "87833", "90621", "111256", "112989"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let mode: "sequential" | "parallel" = "parallel";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.mode === "sequential") mode = "sequential";
      } catch { /* no body */ }
    }
    const url = new URL(req.url);
    if (url.searchParams.get("mode") === "sequential") mode = "sequential";

    const callFid = (fid: string) =>
      fetch(`${SUPABASE_URL}/functions/v1/import-awin-feed?fid=${fid}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
      });

    if (mode === "parallel") {
      // Fire-and-forget: trigger all 4 in parallel and return immediately.
      // Each invocation runs in its own isolate with its own CPU quota.
      const triggers = ALL_FIDS.map(fid => {
        callFid(fid).catch(err => console.error(`FID ${fid} failed:`, err));
        return fid;
      });
      console.log(`🚀 Triggered ${triggers.length} parallel imports`);
      return new Response(
        JSON.stringify({
          success: true,
          mode: "parallel",
          triggered: triggers,
          note: "Imports run in background. Check logs of `import-awin-feed` for results.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sequential: wait for each FID
    const results: Array<{ fid: string; ok: boolean; result?: any; error?: string }> = [];
    for (const fid of ALL_FIDS) {
      console.log(`▶️  Importing FID ${fid}...`);
      try {
        const res = await callFid(fid);
        const data = await res.json();
        results.push({ fid, ok: res.ok, result: data });
        console.log(`✅ FID ${fid}: ${JSON.stringify(data)}`);
      } catch (err) {
        const msg = (err as Error).message;
        console.error(`❌ FID ${fid}: ${msg}`);
        results.push({ fid, ok: false, error: msg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, mode: "sequential", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Orchestrator error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
