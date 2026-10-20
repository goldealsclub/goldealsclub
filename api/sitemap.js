// Sitemap dynamique : pages fixes + catégories + marques + offres du jour.
// Servi sur /sitemap.xml (voir vercel.json), mis en cache 6 h par le CDN Vercel.
const SITE = "https://www.goldealsclub.com";
const SUPABASE_URL = "https://wyfqswrhlupauvwutlla.supabase.co";

const STATIC = ["/", "/codes-promo", "/trends", "/sellers", "/coupe-du-monde-2026", "/about", "/contact", "/privacy", "/terms"];
const CATEGORIES = ["sneakers", "vestes", "hoodies", "t-shirts", "pantalons", "accessoires"];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const url = (loc, lastmod, changefreq, priority) =>
  `<url><loc>${esc(SITE + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

export default async function handler(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const entries = [
    ...STATIC.map((p) => url(p, today, p === "/" ? "daily" : "weekly", p === "/" ? "1.0" : "0.5")),
    ...CATEGORIES.map((c) => url(`/category/${c}`, today, "daily", "0.9")),
  ];

  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`);
    const deals = r.ok ? await r.json() : [];
    if (Array.isArray(deals)) {
      const brandCounts = new Map();
      for (const d of deals) {
        const b = (d.brand || "").trim();
        if (b) brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
      }
      for (const [b, n] of brandCounts) {
        if (n >= 5) entries.push(url(`/brand/${encodeURIComponent(b)}`, today, "daily", "0.7"));
      }
      const seen = new Set();
      for (const d of deals) {
        if (!d.id || seen.has(d.id) || !(Number(d.sale_price) > 0)) continue;
        seen.add(d.id);
        entries.push(url(`/deal/${encodeURIComponent(d.id)}`, (d.detected_at || "").slice(0, 10) || today, "daily", "0.6"));
      }
    }
  } catch {
    // En cas d'indisponibilité des offres, on sert au moins les pages fixes.
  }

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`);
}
