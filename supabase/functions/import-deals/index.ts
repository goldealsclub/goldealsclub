import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const deals = await req.json();

    if (!Array.isArray(deals)) {
      return new Response(JSON.stringify({ error: "Expected array of deals" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate IDs if missing
    const dealsWithIds = deals.map((d: any, i: number) => ({
      ...d,
      id:
        d.id ||
        `deal-${i}-${(d.title || "")
          .slice(0, 30)
          .replace(/\s+/g, "-")
          .toLowerCase()}`,
    }));

    // Upsert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < dealsWithIds.length; i += batchSize) {
      const batch = dealsWithIds.slice(i, i + batchSize);
      const { error } = await supabase
        .from("deals")
        .upsert(batch, { onConflict: "id" });
      if (error) throw error;
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, count: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
