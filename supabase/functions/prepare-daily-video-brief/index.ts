// Generates the daily HYPE BATTLE briefs: one Versus video per category
// (sneakers, vêtements, accessoires). For each category, picks 2 deals from
// hype brands with strong discounts. Stored in public.daily_video_briefs.deals
// as an array of battles: [{type:'battle', category, label, a, b}, ...]
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hype brands — sneakers premium + streetwear hype + marques streetwear partenaires
const HYPE_BRANDS = [
  // sneakers premium
  "nike", "jordan", "air jordan", "yeezy", "adidas", "new balance", "asics",
  "travis scott", "off-white", "off white", "dunk", "sb dunk",
  // streetwear hype
  "trapstar", "corteiz", "stussy", "stüssy", "carhartt", "carhartt wip",
  "palace", "supreme", "essentials", "fear of god", "represent",
  "kappa", "the north face", "patta", "aimé leon dore", "ami",
  // marques streetwear bien représentées dans le catalogue
  "karl kani", "new era", "hummel", "urban classics", "project x paris",
  "mister tee", "ellesse", "puma", "fila", "champion",
];

// Categories targeted — pushed as SQL filter via category column (indexed)
const BATTLE_CATEGORIES: { slug: string; label: string; categories: string[]; titleHints: RegExp }[] = [
  {
    slug: "sneakers",
    label: "SNEAKERS",
    categories: ["sneakers", "chaussures"],
    titleHints: /sneaker|jordan|dunk|air max|yeezy|550|990|nike|adidas/i,
  },
  {
    slug: "vetements",
    label: "VÊTEMENTS",
    categories: ["hoodies", "t-shirts", "vestes", "pantalons", "vetements", "vêtements"],
    titleHints: /hoodie|sweat|t-shirt|tshirt|veste|jacket|pant|jean|short|cargo/i,
  },
  {
    slug: "accessoires",
    label: "ACCESSOIRES",
    categories: ["accessoires"],
    titleHints: /sac\b|bag|casquette|cap\b|bonnet|chaussette|sock|ceinture|belt/i,
  },
];

const norm = (s: string | null) => (s ?? "").toLowerCase().trim();
const isHype = (brand: string) => {
  const b = norm(brand);
  return HYPE_BRANDS.some((h) => b === h || b.includes(h));
};
const validImage = (u: string | null) =>
  !!u && /^https?:\/\//i.test(u) && !/placeholder|no.?image|default/i.test(u);

// Marchands à exclure : sportspar.de bloque le hotlinking (403) ET a des prix d'origine
// artificiellement gonflés (-94% non crédibles). On les retire des battles vidéo.
const BLACKLIST_MERCHANTS = new Set(["sport outlet fr"]);
const isAllowedMerchant = (m: string | null) => !BLACKLIST_MERCHANTS.has(norm(m));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Stratégie : requête SQL minimale (idx_deals_category_discount) puis filtre marque/image en JS.
    // Séquentiel pour éviter de saturer le pool DB et déclencher des statement timeouts.
    const perCatResults: { cat: typeof BATTLE_CATEGORIES[number]; deals: any[] }[] = [];
    for (const cat of BATTLE_CATEGORIES) {
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url,category")
        .in("category", cat.categories)
        .gte("discount_percent", 25)
        .lte("discount_percent", 75)
        .neq("merchant", "Sport Outlet FR")
        .order("discount_percent", { ascending: false })
        .limit(3000);
      if (error) {
        console.error(`query ${cat.slug} failed`, error);
        perCatResults.push({ cat, deals: [] });
      } else {
        perCatResults.push({ cat, deals: data ?? [] });
      }
    }

    const battles: any[] = [];
    for (const { cat, deals } of perCatResults) {
      const candidates = deals.filter(
        (d) =>
          isHype(d.brand) &&
          validImage(d.image_url) &&
          isAllowedMerchant(d.merchant) &&
          Number(d.sale_price) > 5 &&
          Number(d.discount_percent) >= 25 &&
          Number(d.discount_percent) <= 75,
      );
      const seenBrands = new Set<string>();
      const picks: any[] = [];
      for (const d of candidates) {
        const b = norm(d.brand);
        if (seenBrands.has(b)) continue;
        seenBrands.add(b);
        picks.push(d);
        if (picks.length === 2) break;
      }
      // Fallback: si on n'a qu'une marque hype, compléter avec les meilleurs candidats restants
      if (picks.length < 2) {
        for (const d of candidates) {
          if (picks.find((p) => p.id === d.id)) continue;
          picks.push(d);
          if (picks.length === 2) break;
        }
      }
      if (picks.length === 2) {
        const map = (d: any) => {
          const sale = Number(d.sale_price) || 0;
          const disc = Number(d.discount_percent) || 0;
          const orig = d.original_price != null
            ? Number(d.original_price)
            : disc > 0 && sale > 0
              ? Math.round((sale / (1 - disc / 100)) * 100) / 100
              : sale;
          return {
            id: d.id,
            title: d.title,
            brand: d.brand,
            merchant: d.merchant,
            sale_price: sale,
            original_price: orig,
            discount_percent: disc,
            currency: d.currency || "EUR",
            image_url: d.image_url,
            url: d.affiliate_url || d.product_url,
          };
        };
        battles.push({
          type: "battle",
          category: cat.slug,
          label: cat.label,
          a: map(picks[0]),
          b: map(picks[1]),
        });
      } else {
        console.warn(`Pas assez de candidats hype pour ${cat.slug} (${candidates.length})`);
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
      JSON.stringify({
        ok: true,
        brief_date: briefDate,
        battles: battles.length,
        categories: battles.map((b) => b.category),
      }),
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
