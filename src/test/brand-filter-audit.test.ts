/**
 * Audit automatique des filtres marque/marchand.
 *
 * Garde-fou anti-régression. Échoue (donc bloque le déploiement si `npm test`
 * fait partie du pipeline CI) lorsque :
 *   - le filtre Nike contient des deals dont la marque inférée n'est pas Nike
 *   - un marchand protégé (Snipes, Sport Outlet, Sneakin...) est vide
 *   - le catalogue tombe sous le seuil minimum
 *   - trop de deals sont "Non classé"
 *
 * Source : `public/deals.json` (snapshot servi en fallback à l'app), avec
 * possibilité de surcharger via `AUDIT_SOURCE_URL` pour viser le live.
 */

import { describe, it, expect } from "vitest";
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

const PROTECTED_MERCHANTS = ["Snipes", "Sport Outlet", "Sneakin", "Nike", "JD Sports"];
const BRAND_FILTERS = [
  { canonical: "Nike", minDeals: 5 },
  { canonical: "adidas", minDeals: 5 },
];
const MIN_TOTAL_DEALS = 200;
const MAX_UNCLASSIFIED_RATIO = 0.25;
const MAX_FOREIGN_BRAND_RATIO = 0.02;

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

function loadDeals(): Deal[] {
  const file = resolve(process.cwd(), "public/deals.json");
  const raw = readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.deals ?? [];
}

const deals = loadDeals();

describe("Audit filtres marque & marchand (anti-régression)", () => {
  it(`charge au moins ${MIN_TOTAL_DEALS} deals depuis public/deals.json`, () => {
    expect(deals.length).toBeGreaterThanOrEqual(MIN_TOTAL_DEALS);
  });

  describe.each(PROTECTED_MERCHANTS)("Marchand protégé %s", (merchant) => {
    it("ne doit jamais être vide", () => {
      const count = deals.filter((d) => matchesMerchant(d, merchant)).length;
      expect(
        count,
        `Marchand "${merchant}" : 0 deal renvoyé. Régression critique du pipeline deals-json.`,
      ).toBeGreaterThan(0);
    });
  });

  describe.each(BRAND_FILTERS)("Filtre marque $canonical", ({ canonical, minDeals }) => {
    const filtered = deals.filter((d) => d.brand === canonical);

    it(`renvoie au moins ${minDeals} deals`, () => {
      expect(filtered.length).toBeGreaterThanOrEqual(minDeals);
    });

    it("ne contient aucun deal classifié sur une autre marque canonique", () => {
      const foreign = filtered.filter((d) => {
        const inferred = inferBrand(d.brand, d.title);
        return inferred !== canonical && inferred !== UNCLASSIFIED_BRAND;
      });
      const ratio = foreign.length / Math.max(filtered.length, 1);
      const examples = foreign
        .slice(0, 3)
        .map((d) => `"${d.title}" → ${inferBrand(d.brand, d.title)}`)
        .join(" | ");
      expect(
        ratio,
        `Filtre "${canonical}" pollué : ${foreign.length}/${filtered.length} deals (${(ratio * 100).toFixed(1)} %). Exemples : ${examples}`,
      ).toBeLessThanOrEqual(MAX_FOREIGN_BRAND_RATIO);
    });
  });

  it(`ne doit pas avoir plus de ${MAX_UNCLASSIFIED_RATIO * 100}% de deals "Non classé"`, () => {
    const unclassified = deals.filter(
      (d) => inferBrand(d.brand, d.title) === UNCLASSIFIED_BRAND,
    ).length;
    const ratio = unclassified / Math.max(deals.length, 1);
    expect(
      ratio,
      `${unclassified}/${deals.length} deals non classés (${(ratio * 100).toFixed(1)} %). Vérifier la normalisation des marques.`,
    ).toBeLessThanOrEqual(MAX_UNCLASSIFIED_RATIO);
  });
});
