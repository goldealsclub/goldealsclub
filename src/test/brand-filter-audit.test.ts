/**
 * Audit automatique des filtres marque & marchand — anti-régression.
 *
 * Bloque le build (`prebuild` → `vitest run …`) lorsqu'une régression
 * structurelle est détectée :
 *   - Cohérence stricte : aucun deal d'une autre marque canonique ne doit
 *     apparaître dans un filtre marque (Nike, adidas…).
 *   - Marchands protégés : Snipes, Sport Outlet, Sneakin ne doivent jamais
 *     être vides dans la source live.
 *
 * Source par défaut : snapshot `public/deals.json` (fallback figé). Pour
 * auditer le pipeline live, fournir `AUDIT_SOURCE_URL` (ex. l'edge function
 * `deals-json`). Les vérifications de volume/présence marchand sont
 * appliquées uniquement à la source live (le snapshot peut être obsolète).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inferBrand, UNCLASSIFIED_BRAND } from "@/lib/brand-normalization";

type Deal = {
  id: string;
  title: string;
  brand: string;
  merchant?: string | null;
  source?: string | null;
};

const PROTECTED_MERCHANTS = ["Snipes", "Sport Outlet", "Sneakin"];
const BRAND_FILTERS = [
  { canonical: "Nike", minDeals: 5 },
  { canonical: "adidas", minDeals: 5 },
];
const MAX_FOREIGN_BRAND_RATIO = 0.05; // 5 % max — flux Awin a quelques erreurs amont
const MIN_LIVE_DEALS = 200;

const LIVE_URL = process.env.AUDIT_SOURCE_URL;
const SNAPSHOT = resolve(process.cwd(), "public/deals.json");

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

function loadFromFile(): Deal[] {
  const raw = readFileSync(SNAPSHOT, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.deals ?? [];
}

async function loadFromUrl(url: string): Promise<Deal[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = await res.json();
  return Array.isArray(parsed) ? parsed : parsed.deals ?? [];
}

let deals: Deal[] = [];
let isLive = false;

beforeAll(async () => {
  if (LIVE_URL) {
    try {
      deals = await loadFromUrl(LIVE_URL);
      isLive = true;
      return;
    } catch (err) {
      console.warn(`⚠️  AUDIT_SOURCE_URL injoignable (${(err as Error).message}), fallback snapshot.`);
    }
  }
  deals = loadFromFile();
});

describe("Audit filtres marque & marchand (anti-régression)", () => {
  it("charge des deals", () => {
    expect(deals.length).toBeGreaterThan(0);
  });

  // ---- Vérifications STRICTES — toujours bloquantes ----
  describe("Cohérence du filtre par marque (toutes sources)", () => {
    it.each(BRAND_FILTERS)(
      'le filtre "$canonical" ne doit pas être pollué par d\'autres marques canoniques',
      ({ canonical }) => {
        const filtered = deals.filter((d) => d.brand === canonical);
        if (filtered.length === 0) return; // marchand peut être absent sur snapshot
        const foreign = filtered.filter((d) => {
          const inferred = inferBrand(d.brand, d.title);
          return inferred !== canonical && inferred !== UNCLASSIFIED_BRAND;
        });
        const ratio = foreign.length / filtered.length;
        const examples = foreign
          .slice(0, 3)
          .map((d) => `"${d.title}" → ${inferBrand(d.brand, d.title)}`)
          .join(" | ");
        expect(
          ratio,
          `Filtre "${canonical}" pollué : ${foreign.length}/${filtered.length} (${(ratio * 100).toFixed(1)} %). Exemples : ${examples}`,
        ).toBeLessThanOrEqual(MAX_FOREIGN_BRAND_RATIO);
      },
    );
  });

  // ---- Vérifications LIVE — seulement si AUDIT_SOURCE_URL est défini ----
  describe("Pipeline live (AUDIT_SOURCE_URL)", () => {
    it("renvoie un volume minimum de deals", () => {
      if (!isLive) return;
      expect(deals.length).toBeGreaterThanOrEqual(MIN_LIVE_DEALS);
    });

    it.each(PROTECTED_MERCHANTS)(
      'le marchand protégé "%s" ne doit jamais être vide',
      (merchant) => {
        if (!isLive) return;
        const count = deals.filter((d) => matchesMerchant(d, merchant)).length;
        expect(
          count,
          `Marchand "${merchant}" : 0 deal renvoyé. Régression critique du pipeline deals-json.`,
        ).toBeGreaterThan(0);
      },
    );

    it.each(BRAND_FILTERS)(
      'le filtre "$canonical" renvoie au moins $minDeals deals',
      ({ canonical, minDeals }) => {
        if (!isLive) return;
        const filtered = deals.filter((d) => d.brand === canonical);
        expect(filtered.length).toBeGreaterThanOrEqual(minDeals);
      },
    );
  });
});
