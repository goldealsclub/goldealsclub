// Serves the full deals catalog as JSON, fresh from the database.
// Used by the frontend so it stays synchronized after each Awin import,
// without needing to redeploy public/deals.json.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type DealRow,
  type DealsRepo,
  RECENT_DISCOVERY_LIMIT,
  runPipeline,
} from "./pipeline.ts";

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

    // Keep 30 days as the stable catalog window. Do not reduce this without
    // updating mem://constraints/deals-pipeline-no-regression.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // CRITICAL: Fetch PER MERCHANT to avoid starvation. See pipeline.ts and
    // mem://constraints/deals-pipeline-no-regression. Pure logic lives in
    // pipeline.ts so it can be unit-tested without the live DB.
    const repo: DealsRepo = {
      async recentMerchants(limit) {
        const { data, error } = await supabase
          .from("deals")
          .select("merchant")
          .gte("detected_at", since)
          .order("detected_at", { ascending: false, nullsFirst: false })
          .limit(limit);
        if (error) throw error;
        return ((data ?? []) as Array<{ merchant: string | null }>)
          .map((r) => r.merchant ?? "")
          .filter(Boolean);
      },
      async pageForMerchant(merchant, from, to) {
        const { data, error } = await supabase
          .from("deals")
          .select(FIELDS)
          .eq("merchant", merchant)
          .gte("detected_at", since)
          .order("detected_at", { ascending: false, nullsFirst: false })
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as DealRow[];
      },
    };

    const { deals } = await runPipeline(repo, {
      recentDiscoveryLimit: RECENT_DISCOVERY_LIMIT,
    });

    return new Response(JSON.stringify(deals), {
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
