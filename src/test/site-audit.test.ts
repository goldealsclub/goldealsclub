/**
 * AUDIT TOTAL SITE — Anti-régression marchand.
 *
 * Vérifie en un seul fichier l'ensemble des invariants critiques d'un
 * site marchand qui ne peut pas se permettre de régression :
 *
 *   1. VOLUME       → catalogue ≥ seuil + chaque marchand protégé
 *   2. INTÉGRITÉ    → pas de doublon d'ID, image / url / prix présents
 *   3. PRIX         → original ≥ sale, discount cohérent, devise EUR
 *   4. CLASSIFICATION → genre dans liste blanche, catégorie non vide,
 *                       brand jamais "Snipes" par défaut
 *   5. PURETÉ MARQUE → filtre Nike/adidas non pollué (>95 % conformes)
 *   6. URLS         → produit/affilié bien formées (https)
 *   7. SNIPES RRP   → >= 20 % des deals Snipes ont un prix barré
 *
 * Tous ces tests s'exécutent contre la source LIVE (deals-json). En cas
 * d'indisponibilité réseau, ils sont skippés (warning) pour ne pas
 * bloquer un build local hors-ligne — la CI doit forcer le réseau.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { inferBrand, UNCLASSIFIED_BRAND } from "@/lib/brand-normalization";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ??
  "https://yyqgxhuzobmqygksbaze.supabase.co";
const PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cWd4aHV6b2JtcXlna3NiYXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjU0NDgsImV4cCI6MjA4ODgwMTQ0OH0.yndVTKpuMkgee4a8YIfezymps5L2YGMNXhNNr1xkBiE";

// ---------- Seuils calibrés sur l'observation prod 28/04/2026 ----------
const MIN_TOTAL_DEALS = 4000;
const MIN_PER_MERCHANT: Record<string, number> = {
  Snipes: 300,
  Sneakin: 300,
  "Sport Outlet": 500,
  "Sport Is Good": 500,
};
const ALLOWED_GENDERS = new Set(["homme", "femme", "enfant", "unisexe"]);
const MAX_FOREIGN_BRAND_RATIO = 0.05;
const MIN_SNIPES_RRP_RATIO = 0.2;
const BRAND_PURITY_TARGETS = ["Nike", "adidas", "Jordan", "PUMA"];

interface Deal {
  id: string;
  title: string;
  brand: string;
  merchant: string;
  source?: string | null;
  image_url: string | null;
  product_url: string | null;
  affiliate_url: string | null;
  sale_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string | null;
  gender: string;
  category: string;
}

let deals: Deal[] = [];
let networkError: Error | null = null;

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const merchantHas = (d: Deal, key: string) =>
  norm(d.merchant).includes(norm(key)) || norm(d.source).includes(norm(key));

beforeAll(async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`, {
      headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    deals = (await res.json()) as Deal[];
  } catch (e) {
    networkError = e as Error;
  }
}, 60_000);

const skipIfOffline = () => {
  if (networkError) {
    console.warn(`[skip] deals-json injoignable: ${networkError.message}`);
    return true;
  }
  return false;
};

describe("AUDIT SITE — anti-régression globale", () => {
  // ---------- 1. VOLUME ----------
  describe("1. Volume catalogue", () => {
    it(`renvoie ≥ ${MIN_TOTAL_DEALS} deals`, () => {
      if (skipIfOffline()) return;
      expect(deals.length).toBeGreaterThanOrEqual(MIN_TOTAL_DEALS);
    });

    it.each(Object.entries(MIN_PER_MERCHANT))(
      'marchand "%s" renvoie au moins %i deals',
      (label, min) => {
        if (skipIfOffline()) return;
        const count = deals.filter((d) => merchantHas(d, label)).length;
        expect(count, `${label}: ${count} deals (min ${min})`).toBeGreaterThanOrEqual(
          min as number,
        );
      },
    );
  });

  // ---------- 2. INTÉGRITÉ ----------
  describe("2. Intégrité des données", () => {
    it("aucun doublon d'ID", () => {
      if (skipIfOffline()) return;
      const ids = deals.map((d) => d.id);
      const dup = ids.length - new Set(ids).size;
      expect(dup, `${dup} doublons d'ID détectés`).toBe(0);
    });

    it("tous les deals ont une image", () => {
      if (skipIfOffline()) return;
      const missing = deals.filter((d) => !d.image_url || d.image_url.length < 10);
      expect(missing.length, `${missing.length} deals sans image`).toBe(0);
    });

    it("tous les deals ont une URL produit ou affiliée", () => {
      if (skipIfOffline()) return;
      const missing = deals.filter((d) => !d.product_url && !d.affiliate_url);
      expect(missing.length, `${missing.length} deals sans URL`).toBe(0);
    });

    it("tous les deals ont un prix de vente > 0", () => {
      if (skipIfOffline()) return;
      const missing = deals.filter((d) => !d.sale_price || Number(d.sale_price) <= 0);
      expect(missing.length, `${missing.length} deals sans prix valide`).toBe(0);
    });
  });

  // ---------- 3. PRIX ----------
  describe("3. Cohérence des prix", () => {
    it("original_price ≥ sale_price quand présent", () => {
      if (skipIfOffline()) return;
      const invalid = deals.filter(
        (d) =>
          d.original_price != null &&
          d.sale_price != null &&
          Number(d.original_price) < Number(d.sale_price),
      );
      const examples = invalid.slice(0, 3).map(
        (d) => `${d.merchant}|${d.title} (orig=${d.original_price} sale=${d.sale_price})`,
      );
      expect(
        invalid.length,
        `${invalid.length} deals avec prix invalide. Ex: ${examples.join(" | ")}`,
      ).toBe(0);
    });

    it("devise EUR sur la grande majorité (>95 %)", () => {
      if (skipIfOffline()) return;
      const eur = deals.filter((d) => (d.currency || "EUR") === "EUR").length;
      const ratio = eur / deals.length;
      expect(ratio).toBeGreaterThanOrEqual(0.95);
    });

    it(`Snipes a un prix barré sur ≥ ${MIN_SNIPES_RRP_RATIO * 100}% de ses deals`, () => {
      if (skipIfOffline()) return;
      const snipes = deals.filter((d) => merchantHas(d, "snipes"));
      if (snipes.length === 0) return;
      const withRRP = snipes.filter(
        (d) => Number(d.original_price) > Number(d.sale_price),
      );
      const ratio = withRRP.length / snipes.length;
      expect(
        ratio,
        `Snipes RRP: ${withRRP.length}/${snipes.length} = ${Math.round(ratio * 100)}%`,
      ).toBeGreaterThanOrEqual(MIN_SNIPES_RRP_RATIO);
    });
  });

  // ---------- 4. CLASSIFICATION ----------
  describe("4. Classification", () => {
    it("tous les genres appartiennent à la liste blanche", () => {
      if (skipIfOffline()) return;
      const invalid = deals.filter((d) => !ALLOWED_GENDERS.has(d.gender));
      const samples = Array.from(new Set(invalid.map((d) => d.gender))).slice(0, 5);
      expect(
        invalid.length,
        `${invalid.length} deals avec genre invalide. Valeurs: ${samples.join(", ")}`,
      ).toBe(0);
    });

    it("toutes les catégories sont définies", () => {
      if (skipIfOffline()) return;
      const missing = deals.filter((d) => !d.category || d.category.trim().length === 0);
      expect(missing.length).toBe(0);
    });

    it('aucun deal n\'utilise "Snipes" comme marque par défaut (fallback supprimé)', () => {
      if (skipIfOffline()) return;
      // Snipes n'est PAS une marque → devrait être nettoyé en amont.
      const snipesAsBrand = deals.filter((d) => d.brand === "Snipes");
      // Tolérance 0 — s'il y en a, c'est que le fallback "Snipes" est revenu.
      expect(
        snipesAsBrand.length,
        `${snipesAsBrand.length} deals avec brand="Snipes" (fallback prohibé)`,
      ).toBe(0);
    });
  });

  // ---------- 5. PURETÉ DES FILTRES MARQUE ----------
  describe("5. Pureté du filtre marque", () => {
    it.each(BRAND_PURITY_TARGETS)(
      'filtre "%s" : ≤ 5 %% de deals d\'une autre marque canonique',
      (target) => {
        if (skipIfOffline()) return;
        const filtered = deals.filter((d) => d.brand === target);
        if (filtered.length < 10) return;
        const foreign = filtered.filter((d) => {
          const inferred = inferBrand(d.brand, d.title);
          return inferred !== target && inferred !== UNCLASSIFIED_BRAND;
        });
        const ratio = foreign.length / filtered.length;
        const examples = foreign
          .slice(0, 3)
          .map((d) => `"${d.title}" → ${inferBrand(d.brand, d.title)}`)
          .join(" | ");
        expect(
          ratio,
          `${target} pollué: ${foreign.length}/${filtered.length} (${(ratio * 100).toFixed(1)} %). Ex: ${examples}`,
        ).toBeLessThanOrEqual(MAX_FOREIGN_BRAND_RATIO);
      },
    );
  });

  // ---------- 6. URLs ----------
  describe("6. Validité des URLs", () => {
    it("toutes les URLs (produit/affilié/image) sont en https", () => {
      if (skipIfOffline()) return;
      const bad = deals.filter((d) => {
        const urls = [d.product_url, d.affiliate_url, d.image_url].filter(Boolean) as string[];
        return urls.some((u) => !/^https:\/\//i.test(u));
      });
      const sample = bad.slice(0, 3).map((d) => d.id).join(", ");
      expect(bad.length, `${bad.length} deals avec URL non-https. Ex: ${sample}`).toBe(0);
    });
  });
});
