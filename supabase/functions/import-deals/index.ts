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

    // Allowed columns in the deals table
    const allowedKeys = new Set([
      "id", "title", "brand", "category", "gender", "gender_label",
      "sale_price", "original_price", "discount_percent", "image_url",
      "product_url", "merchant", "source", "currency", "description",
      "promo_start_date", "promo_end_date", "is_super_deal", "detected_at",
      "deal_level", "flame_count", "display_score", "popularity", "saved",
    ]);

    // Clean deals: generate IDs, strip unknown columns
    const cleaned = deals.map((d: any, i: number) => {
      const row: Record<string, any> = {};
      for (const [k, v] of Object.entries(d)) {
        if (allowedKeys.has(k)) row[k] = v;
      }
      // Generate ID if missing
      row.id = row.id || `deal-${i}-${(d.title || "").slice(0, 30).replace(/\s+/g, "-").toLowerCase()}`;
      return row;
    });

    // Upsert in batches of 500
    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
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
