// Serves the full deals catalog as JSON, fresh from the database.
// Used by the frontend so it stays synchronized after each Awin import,
// without needing to redeploy public/deals.json.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FIELDS = [
  "id", "title", "brand", "category", "gender", "gender_label",
  "sale_price", "original_price", "discount_percent",
  "image_url", "product_url", "affiliate_url",
  "merchant", "source", "currency", "description",
  "promo_start_date", "promo_end_date",
  "is_super_deal", "deal_level", "flame_count", "popularity", "saved",
  "detected_at",
].join(",");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Page through deals (Supabase caps at 1000 rows per query)
    const PAGE = 1000;
    const all: any[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("deals")
        .select(FIELDS)
        .order("detected_at", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    return new Response(JSON.stringify(all), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // 5-minute CDN cache; stale-while-revalidate keeps responses snappy
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("deals-json error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
