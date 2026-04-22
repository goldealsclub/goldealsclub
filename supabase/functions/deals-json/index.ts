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
    const PER_MERCHANT = 2500; // freshest N per merchant — keeps catalog diverse
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

    // Discover active merchants in the window
    const { data: merchantRows, error: merchantErr } = await supabase
      .from("deals")
      .select("merchant")
      .gte("detected_at", since)
      .limit(50000);
    if (merchantErr) throw merchantErr;
    const merchants = Array.from(
      new Set((merchantRows || []).map((r: any) => r.merchant).filter(Boolean)),
    );

    // Fetch the freshest PER_MERCHANT rows for each merchant in parallel pages.
    for (const m of merchants) {
      let from = 0;
      let collected = 0;
      while (collected < PER_MERCHANT) {
        const to = from + PAGE - 1;
        const { data, error } = await supabase
          .from("deals")
          .select(FIELDS)
          .gte("detected_at", since)
          .eq("merchant", m)
          .order("detected_at", { ascending: false, nullsFirst: false })
          .range(from, Math.min(to, from + (PER_MERCHANT - collected) - 1));
        if (error) throw error;
        if (!data || data.length === 0) break;
        pushUnique(data);
        collected += data.length;
        if (data.length < PAGE) break;
        from += PAGE;
      }
    }

    // Final dedupe: collapse SKU/size variants while preserving COLOR variants.
    // Variants of the same product/color share the same image URL on every feed
    // (Snipes, Sneakin, etc.) but different colors have different images, so
    // image_url is the most precise key. Fallback to title-norm when missing.
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
      const merchant = norm(r.merchant);
      const img = (r.image_url || "").trim();
      const k = img
        ? `${merchant}|img:${img}`
        : `${merchant}|t:${norm(r.brand)}|${norm(r.title)}`;
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
