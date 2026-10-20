#!/usr/bin/env node
/**
 * Reprise des offres de l'ancien projet (snapshot public all.json) dans la table
 * deals du nouveau projet, en attendant le premier import Awin réussi.
 * Usage (CI) : OLD_SNAPSHOT_URL=… NEW_URL=… SERVICE_KEY=… node scripts/seed-deals-from-old.mjs
 */
const { OLD_SNAPSHOT_URL, NEW_URL, SERVICE_KEY } = process.env;
const r = await fetch(OLD_SNAPSHOT_URL, { signal: AbortSignal.timeout(120000) });
if (!r.ok) { console.log(`⚠️  ancien snapshot indisponible (HTTP ${r.status})`); process.exit(0); }
const deals = await r.json();
console.log(`📦 ${deals.length} offres dans l'ancien snapshot`);
const cols = ["id", "title", "brand", "category", "gender", "sale_price", "original_price", "discount_percent", "image_url",
  "product_url", "affiliate_url", "merchant", "source", "currency", "promo_start_date", "promo_end_date", "is_super_deal",
  "deal_level", "flame_count", "detected_at"];
let ok = 0;
for (let i = 0; i < deals.length; i += 500) {
  const batch = deals.slice(i, i + 500).map((d) => Object.fromEntries(cols.filter((c) => c in d).map((c) => [c, d[c]])));
  const res = await fetch(`${NEW_URL}/rest/v1/deals?on_conflict=id`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(batch),
  });
  if (!res.ok) { console.log(`❌ lot ${i} : HTTP ${res.status} ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  ok += batch.length;
}
console.log(`✅ ${ok} offres reprises dans le nouveau projet`);
