// Generates the daily HYPE BATTLE briefs: one Versus video per category
// (sneakers, vêtements, accessoires). For each category, picks 2 deals from
// hype brands with strong discounts. Stored in public.daily_video_briefs.deals
// as an array of battles: [{type:'battle', category, label, a, b}, ...]
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hype brands STRICT — uniquement vraies marques hype/premium streetwear & sneakers
const HYPE_BRANDS = [
  // sneakers premium
  "nike", "jordan", "air jordan", "yeezy", "adidas", "new balance", "asics",
  "puma", "converse", "vans",
  "travis scott", "off-white", "off white", "dunk", "sb dunk",
  // streetwear hype
  "trapstar", "corteiz", "stussy", "stüssy", "carhartt", "carhartt wip",
  "palace", "supreme", "essentials", "fear of god", "represent",
  "the north face", "patta", "aimé leon dore", "ami",
  // streetwear partenaires bien représentés
  "kappa", "karl kani", "new era", "champion", "fila", "ellesse",
];

// Categories targeted — pushed as SQL filter via category column (indexed)
const BATTLE_CATEGORIES: { slug: string; label: string; categories: string[]; titleHints: RegExp; titleExclude: RegExp }[] = [
  {
    slug: "sneakers",
    label: "SNEAKERS",
    categories: ["sneakers", "chaussures"],
    // doit ressembler à une chaussure
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
  !!u &&
  /^https?:\/\//i.test(u) &&
  !/placeholder|no.?image|default/i.test(u) &&
  // sportspar.de = hotlink réellement bloqué (Snipes via productserve charge bien donc on ne bloque pas productserve.com en général)
  !/sportspar\.de/i.test(u);

// Marchands à exclure : sportspar.de bloque le hotlinking (403) ET a des prix d'origine
// artificiellement gonflés (-94% non crédibles). On les retire des battles vidéo.
const BLACKLIST_MERCHANTS = new Set([
  "sport outlet fr",
  "sport is good fr",   // même feed productserve / hotlink bloqué
  "training fit fr",    // même feed productserve / hotlink bloqué
  "sneakin fr",         // même feed productserve / hotlink bloqué
]);
const isAllowedMerchant = (m: string | null) => !BLACKLIST_MERCHANTS.has(norm(m));

// Marchands premium dont les images chargent et les prix sont fiables
const PREMIUM_MERCHANTS = new Set(["snipes eu", "kappa fr", "jd sports fr", "nike fr"]);
const isPremium = (m: string | null) => PREMIUM_MERCHANTS.has(norm(m));

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
      // Stratégie : utiliser l'index (category, discount_percent DESC) en filtrant
      // par catégorie une à une. neq merchant fait sauter l'index → on filtre en JS.
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
        if (error) {
          console.error(`query ${cat.slug}/${c} failed`, error);
        } else if (data) {
          // Filtre marchands blacklist en JS (PostgREST .not.in casse avec espaces dans valeurs)
          all.push(...data.filter((d) => isAllowedMerchant(d.merchant)));
        }
      }
      perCatResults.push({ cat, deals: all });
      console.log(`[${cat.slug}] kept=${all.length} sample_brands=`, [...new Set(all.slice(0, 20).map((d) => d.brand))]);
    }

    const battles: any[] = [];
    for (const { cat, deals } of perCatResults) {
      // La catégorie en base est parfois fausse (ex: short Kappa tagué "sneakers").
      // On force le titre à matcher la catégorie cible et à NE PAS matcher une catégorie voisine.
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
      console.log(`[${cat.slug}] candidates_after_title=${candidates.length} sample=`, candidates.slice(0, 5).map((d: any) => `${d.brand}|${d.title}`));
      candidates.sort((a, b) => {
        const pa = isPremium(a.merchant) ? 0 : 1;
        const pb = isPremium(b.merchant) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return Number(b.discount_percent) - Number(a.discount_percent);
      });
      const seenBrands = new Set<string>();
      const picks: any[] = [];
      for (const d of candidates) {
        const b = norm(d.brand);
        if (seenBrands.has(b)) continue;
        seenBrands.add(b);
        picks.push(d);
        if (picks.length === 2) break;
      }
      if (picks.length < 2) {
        for (const d of candidates) {
          if (picks.find((p) => p.id === d.id)) continue;
          picks.push(d);
          if (picks.length === 2) break;
        }
      }
      // Pas de fallback générique : on n'autorise QUE les marques hype.
      // Mieux vaut une catégorie vide qu'une battle avec une marque random.
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
