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

    // Only return deals detected in the last 30 days to keep payload + query bounded.
    // Avoids statement timeouts on the full table and keeps the JSON under client memory limits.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const MAX_ROWS = 3000;
    const PAGE = 1000;
    const all: any[] = [];
    let from = 0;
    while (from < MAX_ROWS) {
      const to = Math.min(from + PAGE - 1, MAX_ROWS - 1);
      const { data, error } = await supabase
        .from("deals")
        .select(FIELDS)
        .gte("detected_at", since)
        .order("detected_at", { ascending: false, nullsFirst: false })
        .range(from, to);
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
