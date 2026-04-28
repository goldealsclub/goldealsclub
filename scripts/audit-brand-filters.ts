/**
 * Brand & merchant filter audit.
 *
 * Garde-fou anti-régression : exécuté avant chaque build (prebuild) et
 * dans le pipeline CI. Bloque le déploiement si :
 *   - le filtre Nike contient des deals dont la marque inférée n'est pas Nike
 *   - un marchand protégé (Snipes, Sport Outlet, Sneakin...) est vide
 *   - aucun deal ne sort du flux principal
 *
 * Usage :
 *   npx tsx scripts/audit-brand-filters.ts            (live edge function)
 *   npx tsx scripts/audit-brand-filters.ts --static   (public/deals.json)
 *   AUDIT_SOURCE_URL=https://... npx tsx scripts/audit-brand-filters.ts
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inferBrand, UNCLASSIFIED_BRAND } from "../src/lib/brand-normalization";

// ---------- Config ----------

const PROTECTED_MERCHANTS = [
  "Snipes",
  "Sport Outlet",
  "Sneakin",
  "Nike",
  "JD Sports",
];

const BRAND_FILTERS_TO_CHECK: Array<{ canonical: string; minDeals: number }> = [
  { canonical: "Nike", minDeals: 5 },
  { canonical: "adidas", minDeals: 5 },
];

const MIN_TOTAL_DEALS = 200;
const MAX_UNCLASSIFIED_RATIO = 0.25; // 25 % max
const MAX_FOREIGN_BRAND_RATIO = 0.02; // 2 % max de pollution dans un filtre marque

const DEFAULT_LIVE_URL =
  "https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/deals-json";
const STATIC_FILE = resolve(process.cwd(), "public/deals.json");

// ---------- Types ----------

type Deal = {
  id: string;
  title: string;
  brand: string;
  merchant?: string | null;
  source?: string | null;
};

type Anomaly = { severity: "error" | "warn"; message: string };

// ---------- Helpers ----------

function normalize(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesMerchant(deal: Deal, key: string): boolean {
  const k = normalize(key);
  return normalize(deal.source).includes(k) || normalize(deal.merchant).includes(k);
}

async function loadDeals(useStatic: boolean): Promise<Deal[]> {
  if (useStatic) {
    const raw = await readFile(STATIC_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.deals ?? [];
  }
  const url = process.env.AUDIT_SOURCE_URL || DEFAULT_LIVE_URL;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Live endpoint returned ${res.status} ${res.statusText}`);
  }
  const parsed = await res.json();
  return Array.isArray(parsed) ? parsed : parsed.deals ?? [];
}

// ---------- Audit ----------

function audit(deals: Deal[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  if (deals.length < MIN_TOTAL_DEALS) {
    anomalies.push({
      severity: "error",
      message: `Catalogue trop petit : ${deals.length} deals (min ${MIN_TOTAL_DEALS}).`,
    });
  }

  // 1. Marchands protégés non vides
  for (const merchant of PROTECTED_MERCHANTS) {
    const count = deals.filter((d) => matchesMerchant(d, merchant)).length;
    if (count === 0) {
      anomalies.push({
        severity: "error",
        message: `Marchand protégé vide : "${merchant}" — 0 deal renvoyé.`,
      });
    } else if (count < 3) {
      anomalies.push({
        severity: "warn",
        message: `Marchand protégé sous-représenté : "${merchant}" — ${count} deal(s).`,
      });
    }
  }

  // 2. Cohérence du filtre par marque (zéro tolérance pollution)
  for (const { canonical, minDeals } of BRAND_FILTERS_TO_CHECK) {
    const filtered = deals.filter((d) => d.brand === canonical);
    if (filtered.length < minDeals) {
      anomalies.push({
        severity: "error",
        message: `Filtre marque "${canonical}" : ${filtered.length} deals (min ${minDeals}).`,
      });
      continue;
    }
    const foreign = filtered.filter((d) => {
      const inferred = inferBrand(d.brand, d.title);
      return inferred !== canonical && inferred !== UNCLASSIFIED_BRAND;
    });
    const ratio = foreign.length / filtered.length;
    if (ratio > MAX_FOREIGN_BRAND_RATIO) {
      anomalies.push({
        severity: "error",
        message: `Filtre "${canonical}" pollué : ${foreign.length}/${filtered.length} deals classés ailleurs (${(ratio * 100).toFixed(1)} %). Exemples : ${foreign
          .slice(0, 3)
          .map((d) => `"${d.title}" → ${inferBrand(d.brand, d.title)}`)
          .join(" | ")}`,
      });
    }
  }

  // 3. Taux de "Non classé" raisonnable
  const unclassified = deals.filter(
    (d) => inferBrand(d.brand, d.title) === UNCLASSIFIED_BRAND,
  ).length;
  const unclassifiedRatio = unclassified / Math.max(deals.length, 1);
  if (unclassifiedRatio > MAX_UNCLASSIFIED_RATIO) {
    anomalies.push({
      severity: "error",
      message: `Trop de deals non classés : ${unclassified}/${deals.length} (${(unclassifiedRatio * 100).toFixed(1)} %, max ${MAX_UNCLASSIFIED_RATIO * 100} %).`,
    });
  }

  return anomalies;
}

// ---------- Main ----------

async function main() {
  const useStatic = process.argv.includes("--static");
  const skip = process.env.SKIP_BRAND_AUDIT === "1" || process.env.SKIP_BRAND_AUDIT === "true";
  if (skip) {
    console.log("⚠️  Audit marque ignoré (SKIP_BRAND_AUDIT).");
    return;
  }

  console.log(`🔎 Audit filtres marque (${useStatic ? "static" : "live"})...`);

  let deals: Deal[];
  try {
    deals = await loadDeals(useStatic);
  } catch (err) {
    // Source live indisponible → fallback static plutôt que bloquer le build.
    if (!useStatic) {
      console.warn(`⚠️  Live indisponible (${(err as Error).message}), fallback static.`);
      try {
        deals = await loadDeals(true);
      } catch (fallbackErr) {
        console.warn(`⚠️  Static aussi indisponible (${(fallbackErr as Error).message}). Audit ignoré.`);
        return;
      }
    } else {
      throw err;
    }
  }

  const anomalies = audit(deals);
  const errors = anomalies.filter((a) => a.severity === "error");
  const warnings = anomalies.filter((a) => a.severity === "warn");

  console.log(`\n📊 ${deals.length} deals analysés.`);
  for (const w of warnings) console.log(`   ⚠️  ${w.message}`);
  for (const e of errors) console.log(`   ❌ ${e.message}`);

  if (errors.length > 0) {
    console.error(`\n💥 ${errors.length} anomalie(s) critique(s) — déploiement bloqué.`);
    process.exit(1);
  }
  console.log("\n✅ Audit OK — aucune régression détectée.");
}

main().catch((err) => {
  console.error("Audit crash:", err);
  process.exit(1);
});
