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
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const MAX_ROWS = 3000;
    const PAGE = 1000;
    const all: any[] = [];
    const seen = new Set<string>();

    const pushUnique = (rows: any[]) => {
      for (const r of rows) {
        if (r?.id && !seen.has(r.id)) {
          seen.add(r.id);
          all.push(r);
        }
      }
    };

    // 1) Guarantee partner representation (Snipes) — fetched first so it survives the cap.
    const PARTNER_QUOTA = 600;
    const { data: partnerRows, error: partnerErr } = await supabase
      .from("deals")
      .select(FIELDS)
      .gte("detected_at", since)
      .ilike("merchant", "%snipes%")
      .order("detected_at", { ascending: false, nullsFirst: false })
      .range(0, PARTNER_QUOTA - 1);
    if (partnerErr) throw partnerErr;
    pushUnique(partnerRows || []);

    // 2) Fill the rest with the most recent deals across all merchants.
    let from = 0;
    while (all.length < MAX_ROWS) {
      const to = from + PAGE - 1;
      const { data, error } = await supabase
        .from("deals")
        .select(FIELDS)
        .gte("detected_at", since)
        .order("detected_at", { ascending: false, nullsFirst: false })
        .range(from, to);
      if (error) throw error;
      if (!data || data.length === 0) break;
      pushUnique(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    // Final dedupe: collapse SKU/size variants from feeds (esp. Snipes) by
    // (merchant, brand, normalized-title). Keeps the first occurrence which —
    // because rows are ordered by detected_at desc — is the freshest variant.
    const norm = (s: string) =>
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const dedupKey = new Set<string>();
    const deduped: any[] = [];
    for (const r of all) {
      const k = `${norm(r.merchant)}|${norm(r.brand)}|${norm(r.title)}`;
      if (dedupKey.has(k)) continue;
      dedupKey.add(k);
      deduped.push(r);
    }

    return new Response(JSON.stringify(deduped), {
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
