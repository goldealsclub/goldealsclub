// Generates daily SELECTION briefs: one selection of TOP 5 deals per category
// (sneakers, vêtements, accessoires). Hype brands, biggest discounts, dedup
// by brand. Stored in public.daily_video_briefs.deals as:
// [{type:'selection', category, label, deals: Deal[5]}, ...]
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HYPE_BRANDS = [
  "nike", "jordan", "air jordan", "yeezy", "adidas", "new balance", "asics",
  "puma", "converse", "vans",
  "travis scott", "off-white", "off white", "dunk", "sb dunk",
  "trapstar", "corteiz", "stussy", "stüssy", "carhartt", "carhartt wip",
  "palace", "supreme", "essentials", "fear of god", "represent",
  "the north face", "patta", "aimé leon dore", "ami",
  "kappa", "karl kani", "new era", "champion", "fila", "ellesse",
];

const SELECTION_CATEGORIES: { slug: string; label: string; categories: string[]; titleHints: RegExp; titleExclude: RegExp }[] = [
  {
    slug: "sneakers",
    label: "SNEAKERS",
    categories: ["sneakers", "chaussures"],
    titleHints: /sneaker|basket|chaussure|shoe|trainer|jordan|dunk|air\s?max|air\s?force|yeezy|\b550\b|\b990\b|\b327\b|\b574\b|gel[-\s]?|samba|gazelle|stan\s?smith|superstar|forum|campus|huarache|cortez|blazer|tongs?|adilette|slide|sandal|mule/i,
    titleExclude: /hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo|sac\b|bag\b|hip\s?bag|casquette|cap\b|hat\b|bonnet|chaussette|sock|ceinture|belt|ballon|football/i,
  },
  {
    slug: "vetements",
    label: "VÊTEMENTS",
    categories: ["hoodies", "t-shirts", "vestes", "pantalons", "vetements", "vêtements"],
    titleHints: /hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo|polo|chemise|robe|crewneck|pull/i,
    titleExclude: /sneaker|basket|chaussure|shoe|trainer|tongs?|adilette|slide|sandal|mule|sac\b|bag\b|casquette|cap\b|bonnet|chaussette|sock|ceinture|belt/i,
  },
  {
    slug: "accessoires",
    label: "ACCESSOIRES",
    categories: ["accessoires"],
    titleHints: /sac\b|bag\b|hip\s?bag|backpack|casquette|cap\b|hat\b|bonnet|beanie|chaussette|sock|ceinture|belt|portefeuille|wallet|gants?|scarf|écharpe|bandana/i,
    titleExclude: /sneaker|basket|chaussure|shoe|trainer|tongs?|adilette|hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo/i,
  },
];

const norm = (s: string | null) => (s ?? "").toLowerCase().trim();
const isHype = (brand: string) => {
  const b = norm(brand);
  return HYPE_BRANDS.some((h) => b === h || b.includes(h));
};
const validImage = (u: string | null) =>
  !!u && /^https?:\/\//i.test(u) && !/placeholder|no.?image|default/i.test(u) && !/sportspar\.de/i.test(u);

const BLACKLIST_MERCHANTS = new Set([
  "sport outlet fr", "sport is good fr", "training fit fr", "sneakin fr",
]);
const isAllowedMerchant = (m: string | null) => !BLACKLIST_MERCHANTS.has(norm(m));

const PREMIUM_MERCHANTS = new Set(["snipes eu", "kappa fr", "jd sports fr", "nike fr"]);
const isPremium = (m: string | null) => PREMIUM_MERCHANTS.has(norm(m));

const TOP_N = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let shuffle = false;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      shuffle = Boolean(body?.shuffle);
    }
  } catch { /* ignore */ }



  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const perCatResults: { cat: typeof SELECTION_CATEGORIES[number]; deals: any[] }[] = [];
    for (const cat of SELECTION_CATEGORIES) {
      const all: any[] = [];
      for (const c of cat.categories) {
        const { data, error } = await supabase
          .from("deals")
          .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url,category")
          .eq("category", c)
          .gte("discount_percent", 25)
          .lte("discount_percent", 75)
          .order("discount_percent", { ascending: false })
          .limit(2000);
        if (error) console.error(`query ${cat.slug}/${c} failed`, error);
        else if (data) all.push(...data.filter((d) => isAllowedMerchant(d.merchant)));
      }
      perCatResults.push({ cat, deals: all });
    }

    const selections: any[] = [];
    for (const { cat, deals } of perCatResults) {
      const matchesCategory = (d: any) => {
        const t = `${d.title || ""}`;
        return cat.titleHints.test(t) && !cat.titleExclude.test(t);
      };
      const candidates = deals.filter(
        (d) =>
          isHype(d.brand) &&
          validImage(d.image_url) &&
          isAllowedMerchant(d.merchant) &&
          matchesCategory(d) &&
          Number(d.sale_price) > 5 &&
          Number(d.discount_percent) >= 25 &&
          Number(d.discount_percent) <= 75,
      );
      candidates.sort((a, b) => {
        const pa = isPremium(a.merchant) ? 0 : 1;
        const pb = isPremium(b.merchant) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return Number(b.discount_percent) - Number(a.discount_percent);
      });

      // Si shuffle, on prend un pool large (top 30) puis on mélange
      // pour varier les sélections sans sacrifier la qualité.
      const pool = shuffle ? candidates.slice(0, 30).sort(() => Math.random() - 0.5) : candidates;

      // Dédup par marque pour avoir une vraie diversité dans le top 5
      const seenBrands = new Set<string>();
      const picks: any[] = [];
      for (const d of pool) {
        const b = norm(d.brand);
        if (seenBrands.has(b)) continue;
        seenBrands.add(b);
        picks.push(d);
        if (picks.length === TOP_N) break;
      }

      // Si on n'a pas TOP_N marques différentes, complète sans contrainte de dédup
      if (picks.length < TOP_N) {
        for (const d of candidates) {
          if (picks.find((p) => p.id === d.id)) continue;
          picks.push(d);
          if (picks.length === TOP_N) break;
        }
      }

      console.log(`[${cat.slug}] picks=${picks.length}`);
      if (picks.length >= 3) {
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
        selections.push({
          type: "selection",
          category: cat.slug,
          label: cat.label,
          deals: picks.map(map),
        });
      } else {
        console.warn(`Pas assez de candidats hype pour ${cat.slug} (${candidates.length})`);
      }
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const briefDate = today.toISOString().slice(0, 10);

    const caption =
      `✨ TOP DEALS — ${dateStr}\n\n` +
      selections.map((s) => `${s.label} : top ${s.deals.length} (${s.deals.map((d: any) => d.brand).join(" · ")})`).join("\n") +
      `\n\n👉 Tous les deals sur goldealsclub.com\n#GOLDEALSCLUB`;

    const hashtags =
      "#sneakers #streetwear #hype #jordan #yeezy #trapstar #corteiz #stussy " +
      "#dunk #travisscott #offwhite #newbalance #carhartt #palace #supreme " +
      "#deals #bonplan #goldealsclub #fyp #pourtoi";

    const { error: upErr } = await supabase
      .from("daily_video_briefs")
      .upsert(
        {
          brief_date: briefDate,
          focus_brand: "TOP_SELECTION",
          deals: selections,
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
        selections: selections.length,
        categories: selections.map((s) => `${s.category}(${s.deals.length})`),
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
