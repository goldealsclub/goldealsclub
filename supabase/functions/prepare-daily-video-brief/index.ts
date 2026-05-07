// Generates the daily HYPE BATTLE briefs: one Versus video per category
// (sneakers, vêtements, accessoires). For each category, picks 2 deals from
// hype brands with strong discounts. Stored in public.daily_video_briefs.deals
// as an array of battles: [{type:'battle', category, label, a, b}, ...]
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hype brands — sneakers premium + streetwear hype
const HYPE_BRANDS = [
  // sneakers premium
  "nike", "jordan", "air jordan", "yeezy", "adidas", "new balance", "asics",
  "travis scott", "off-white", "off white", "dunk", "sb dunk",
  // streetwear hype
  "trapstar", "corteiz", "stussy", "stüssy", "carhartt", "carhartt wip",
  "palace", "supreme", "essentials", "fear of god", "represent",
  "kappa", "the north face", "patta", "aimé leon dore", "ami",
];

// Categories targeted (slug -> display label + matching keywords in DB category/title)
const BATTLE_CATEGORIES: { slug: string; label: string; match: (c: string, t: string) => boolean }[] = [
  {
    slug: "sneakers",
    label: "SNEAKERS",
    match: (c, t) => /sneaker|chaussure|basket|shoe/i.test(c) || /sneaker|jordan|dunk|air max|yeezy|550|990/i.test(t),
  },
  {
    slug: "vetements",
    label: "VÊTEMENTS",
    match: (c, t) =>
      /v[eê]tement|hoodie|sweat|tshirt|t-shirt|pull|veste|jacket|pant|jean|short/i.test(c) ||
      /hoodie|sweat|t-shirt|tshirt|veste|jacket|pant|jean|short|cargo/i.test(t),
  },
  {
    slug: "accessoires",
    label: "ACCESSOIRES",
    match: (c, t) =>
      /accessoir|sac|bag|cap|bonnet|chaussette|sock|ceinture|belt/i.test(c) ||
      /sac\b|bag|casquette|cap\b|bonnet|chaussette|sock|ceinture|belt/i.test(t),
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: pool, error } = await supabase
      .from("deals")
      .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url,category")
      .gte("discount_percent", 20)
      .lte("discount_percent", 70) // au-delà de 70% = prix barré quasi systématiquement gonflé
      .not("image_url", "is", null)
      .neq("image_url", "")
      .not("sale_price", "is", null)
      .not("original_price", "is", null)
      .gt("sale_price", 0)
      .order("discount_percent", { ascending: false })
      .limit(600);

    if (error) throw error;

    const norm = (s: string | null) => (s ?? "").toLowerCase().trim();
    const isHype = (brand: string) => {
      const b = norm(brand);
      return HYPE_BRANDS.some((h) => b === h || b.includes(h));
    };

    // Garde-fou supplémentaire : image valide (http) + ratio prix sain
    const validImage = (u: string | null) => !!u && /^https?:\/\//i.test(u) && !/placeholder|no.?image|default/i.test(u);
    const hypeDeals = (pool ?? []).filter(
      (d) => isHype(d.brand) && validImage(d.image_url) && Number(d.sale_price) > 5,
    );

    const battles: any[] = [];
    for (const cat of BATTLE_CATEGORIES) {
      const candidates = hypeDeals.filter((d) => cat.match(norm(d.category), norm(d.title)));
      // Try to pick 2 from different brands
      const seenBrands = new Set<string>();
      const picks: any[] = [];
      for (const d of candidates) {
        const b = norm(d.brand);
        if (seenBrands.has(b)) continue;
        seenBrands.add(b);
        picks.push(d);
        if (picks.length === 2) break;
      }
      if (picks.length === 2) {
        const map = (d: any) => ({
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
        });
        battles.push({
          type: "battle",
          category: cat.slug,
          label: cat.label,
          a: map(picks[0]),
          b: map(picks[1]),
        });
      }
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const briefDate = today.toISOString().slice(0, 10);

    const caption =
      `⚔️ HYPE BATTLE — ${dateStr}\n\n` +
      battles.map((b) => `${b.label} : ${b.a.brand} VS ${b.b.brand}`).join("\n") +
      `\n\n👉 Quel camp tu choisis ? Tous les deals sur goldealsclub.com\n#GOLDEALSCLUB`;

    const hashtags =
      "#sneakers #streetwear #hype #jordan #yeezy #trapstar #corteiz #stussy " +
      "#dunk #travisscott #offwhite #newbalance #carhartt #palace #supreme " +
      "#deals #bonplan #goldealsclub #fyp #pourtoi";

    const { error: upErr } = await supabase
      .from("daily_video_briefs")
      .upsert(
        {
          brief_date: briefDate,
          focus_brand: "HYPE_BATTLE",
          deals: battles,
          caption,
          hashtags,
        },
        { onConflict: "brief_date" },
      );
    if (upErr) throw upErr;

    return new Response(
      JSON.stringify({ ok: true, brief_date: briefDate, battles: battles.length, categories: battles.map((b) => b.category) }),
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
