// Renvoie ~60 candidats pour une catégorie donnée (sneakers / vetements / accessoires)
// pour permettre une sélection MANUELLE des 5 produits dans l'admin.
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

const SELECTION_CATEGORIES: Record<string, { categories: string[]; titleHints: RegExp; titleExclude: RegExp }> = {
  sneakers: {
    categories: ["sneakers", "chaussures"],
    titleHints: /sneaker|basket|chaussure|shoe|trainer|jordan|dunk|air\s?max|air\s?force|yeezy|\b550\b|\b990\b|\b327\b|\b574\b|gel[-\s]?|samba|gazelle|stan\s?smith|superstar|forum|campus|huarache|cortez|blazer|tongs?|adilette|slide|sandal|mule/i,
    titleExclude: /hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo|sac\b|bag\b|hip\s?bag|casquette|cap\b|hat\b|bonnet|chaussette|sock|ceinture|belt|ballon|football/i,
  },
  vetements: {
    categories: ["hoodies", "t-shirts", "vestes", "pantalons", "vetements", "vêtements"],
    titleHints: /hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo|polo|chemise|robe|crewneck|pull/i,
    titleExclude: /sneaker|basket|chaussure|shoe|trainer|tongs?|adilette|slide|sandal|mule|sac\b|bag\b|casquette|cap\b|bonnet|chaussette|sock|ceinture|belt/i,
  },
  accessoires: {
    categories: ["accessoires"],
    titleHints: /sac\b|bag\b|hip\s?bag|backpack|casquette|cap\b|hat\b|bonnet|beanie|chaussette|sock|ceinture|belt|portefeuille|wallet|gants?|scarf|écharpe|bandana/i,
    titleExclude: /sneaker|basket|chaussure|shoe|trainer|tongs?|adilette|hoodie|sweat|t-?shirt|tee\b|trikot|jersey|maillot|veste|jacket|pantalon|pant\b|jean|short|cargo/i,
  },
};

const norm = (s: string | null) => (s ?? "").toLowerCase().trim();
const isHype = (brand: string) => {
  const b = norm(brand);
  return HYPE_BRANDS.some((h) => b === h || b.includes(h));
};
const validImage = (u: string | null) =>
  !!u && /^https?:\/\//i.test(u) && !/placeholder|no.?image|default/i.test(u) && !/sportspar\.de/i.test(u);

const BLACKLIST_MERCHANTS = new Set(["sport outlet fr", "sport is good fr", "training fit fr", "sneakin fr"]);
const isAllowedMerchant = (m: string | null) => !BLACKLIST_MERCHANTS.has(norm(m));
const PREMIUM_MERCHANTS = new Set(["snipes eu", "kappa fr", "jd sports fr", "nike fr"]);
const isPremium = (m: string | null) => PREMIUM_MERCHANTS.has(norm(m));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const category = String(body?.category || "").trim();
    const limit = Math.min(400, Math.max(20, Number(body?.limit) || 250));
    const cat = SELECTION_CATEGORIES[category];
    if (!cat) {
      return new Response(JSON.stringify({ error: "Unknown category" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const all: any[] = [];
    for (const c of cat.categories) {
      const { data, error } = await supabase
        .from("deals")
        .select("id,title,brand,merchant,sale_price,original_price,discount_percent,currency,image_url,affiliate_url,product_url,category")
        .eq("category", c)
        .gte("discount_percent", 10)
        .order("discount_percent", { ascending: false })
        .limit(3000);
      if (!error && data) all.push(...data);
    }

    const matchesCategory = (d: any) => {
      const t = `${d.title || ""}`;
      if (cat.titleExclude.test(t)) return false;
      // Match si la catégorie DB est valide OU si le titre contient un mot-clé pertinent
      const dbOk = cat.categories.includes(String(d.category || "").toLowerCase());
      return dbOk || cat.titleHints.test(t);
    };
    // Plus permissif: on garde toutes les marques, on rank simplement les hype en premier
    const filtered = all.filter(
      (d) =>
        validImage(d.image_url) &&
        isAllowedMerchant(d.merchant) &&
        matchesCategory(d) &&
        Number(d.sale_price) > 5,
    );
    filtered.sort((a, b) => {
      const pa = isPremium(a.merchant) ? 0 : 1;
      const pb = isPremium(b.merchant) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const ha = isHype(a.brand) ? 0 : 1;
      const hb = isHype(b.brand) ? 0 : 1;
      if (ha !== hb) return ha - hb;
      return Number(b.discount_percent) - Number(a.discount_percent);
    });

    // Dédup par image (évite les vraies doublons strictes)
    const seenImg = new Set<string>();
    const out: any[] = [];
    for (const d of filtered) {
      const k = norm(d.image_url);
      if (seenImg.has(k)) continue;
      seenImg.add(k);
      const sale = Number(d.sale_price) || 0;
      const disc = Number(d.discount_percent) || 0;
      const orig = d.original_price != null
        ? Number(d.original_price)
        : disc > 0 && sale > 0
          ? Math.round((sale / (1 - disc / 100)) * 100) / 100
          : sale;
      out.push({
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
      });
      if (out.length >= limit) break;
    }

    return new Response(JSON.stringify({ ok: true, candidates: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("video-candidates failed", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
