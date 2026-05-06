// Generates the daily TikTok/Instagram video brief: picks 3 top deals + 2 deals
// from the brand of the day, writes a French caption + hashtags, stores it in
// public.daily_video_briefs (one row per day, idempotent via UNIQUE brief_date).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 7-day rotation of focus brand (Mon=0)
const BRAND_ROTATION = ["Nike", "Snipes", "JD Sports", "Adidas", "New Balance", "Nike", "Snipes"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Pull a healthy pool of recent, well-discounted deals
    const { data: pool, error } = await supabase
      .from("deals")
      .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url,gender,category")
      .gte("discount_percent", 20)
      .not("image_url", "is", null)
      .neq("image_url", "")
      .order("discount_percent", { ascending: false })
      .limit(500);

    if (error) throw error;
    const deals = pool ?? [];

    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // Monday = 0
    const focusBrand = BRAND_ROTATION[dow];

    const norm = (s: string | null) => (s ?? "").toLowerCase();

    // Top 3 overall (highest discount, dedup per brand to vary)
    const seenBrand = new Set<string>();
    const top: any[] = [];
    for (const d of deals) {
      const b = norm(d.brand);
      if (seenBrand.has(b)) continue;
      seenBrand.add(b);
      top.push(d);
      if (top.length === 3) break;
    }

    // 2 from focus brand (excluding ones already in top)
    const topIds = new Set(top.map((d) => d.id));
    const focus = deals
      .filter((d) => norm(d.brand) === norm(focusBrand) && !topIds.has(d.id))
      .slice(0, 2);

    const selection = [...top, ...focus].slice(0, 5).map((d) => ({
      id: d.id,
      title: d.title,
      brand: d.brand,
      merchant: d.merchant,
      sale_price: d.sale_price,
      original_price: d.original_price,
      discount_percent: d.discount_percent,
      currency: d.currency || "EUR",
      image_url: d.image_url,
      url: d.affiliate_url || d.product_url,
    }));

    const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const caption =
      `🔥 Les meilleurs deals streetwear du ${dateStr}\n\n` +
      selection.map((d, i) => `${i + 1}. ${d.brand} — -${Math.round(Number(d.discount_percent))}%`).join("\n") +
      `\n\n👉 Tous les deals sur goldealsclub.com\n#GOLDEALSCLUB`;

    const hashtags =
      "#streetwear #sneakers #deals #bonplan #goldealsclub " +
      `#${(focusBrand || "").toLowerCase().replace(/\s+/g, "")} #nike #snipes #adidas #newbalance #jdsports #fyp #pourtoi`;

    const briefDate = today.toISOString().slice(0, 10);

    const { error: upErr } = await supabase
      .from("daily_video_briefs")
      .upsert(
        { brief_date: briefDate, focus_brand: focusBrand, deals: selection, caption, hashtags },
        { onConflict: "brief_date" },
      );
    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ ok: true, brief_date: briefDate, focus_brand: focusBrand, count: selection.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("prepare-daily-video-brief failed", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
