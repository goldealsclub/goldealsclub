/**
 * Garde anti-régression du pipeline deals.
 *
 * Ces invariants doivent rester vrais à chaque modification du pipeline
 * (`supabase/functions/deals-json/index.ts` ou `src/lib/data.ts`) :
 *
 *  1. Le catalogue total renvoyé par la source live reste ≥ 4 000 deals.
 *  2. Snipes EU expose des prix barrés (`original_price > sale_price`) sur
 *     une majorité significative de ses deals.
 *  3. Les variantes de COULEUR ne sont jamais écrasées par la déduplication
 *     (un même titre/marchand peut apparaître plusieurs fois si les images
 *     diffèrent).
 *
 * Le test est ignoré automatiquement si la source live est injoignable
 * (offline, CI sans accès réseau) afin de ne pas casser les builds isolés.
 */
import { describe, it, expect } from "vitest";

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ??
  "https://yyqgxhuzobmqygksbaze.supabase.co";
const PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cWd4aHV6b2JtcXlna3NiYXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMjU0NDgsImV4cCI6MjA4ODgwMTQ0OH0.yndVTKpuMkgee4a8YIfezymps5L2YGMNXhNNr1xkBiE";

const MIN_TOTAL_DEALS = 4000;
const MIN_SNIPES_DEALS = 100;
const MIN_SNIPES_WITH_STRIKETHROUGH_RATIO = 0.6;

interface RawDeal {
  id: string;
  title: string;
  brand: string;
  merchant: string;
  image_url: string | null;
  sale_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
}

let cachedDeals: RawDeal[] | null = null;
let fetchError: Error | null = null;

async function fetchLiveDeals(): Promise<RawDeal[] | null> {
  if (cachedDeals || fetchError) return cachedDeals;
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`, {
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
      },
    });
    if (!resp.ok) {
      fetchError = new Error(`deals-json returned HTTP ${resp.status}`);
      return null;
    }
    cachedDeals = (await resp.json()) as RawDeal[];
    return cachedDeals;
  } catch (e) {
    fetchError = e as Error;
    return null;
  }
}

describe("deals pipeline — anti-regression invariants", () => {
  it(`renvoie ≥ ${MIN_TOTAL_DEALS} deals au total`, async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }
    expect(deals.length).toBeGreaterThanOrEqual(MIN_TOTAL_DEALS);
  }, 60_000);

  it("Snipes EU affiche des prix barrés sur la majorité de ses deals", async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }

    const snipes = deals.filter((d) =>
      (d.merchant || "").toLowerCase().includes("snipes"),
    );
    expect(
      snipes.length,
      "Snipes doit être présent dans le catalogue",
    ).toBeGreaterThanOrEqual(MIN_SNIPES_DEALS);

    const withStrikethrough = snipes.filter((d) => {
      const sale = Number(d.sale_price);
      const orig = Number(d.original_price);
      return Number.isFinite(sale) && Number.isFinite(orig) && orig > sale;
    });

    const ratio = withStrikethrough.length / snipes.length;
    expect(
      ratio,
      `Snipes doit avoir un prix barré sur au moins ` +
        `${Math.round(MIN_SNIPES_WITH_STRIKETHROUGH_RATIO * 100)}% de ses deals ` +
        `(actuel: ${withStrikethrough.length}/${snipes.length})`,
    ).toBeGreaterThanOrEqual(MIN_SNIPES_WITH_STRIKETHROUGH_RATIO);
  }, 60_000);

  it("préserve les variantes de couleur (dedup ne se fait PAS sur title seul)", async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }

    // Pour chaque (merchant|title), si plusieurs images existent, on doit
    // retrouver plusieurs entrées (preuve que les couleurs n'ont pas été
    // écrasées). On vérifie qu'au moins quelques groupes ont >1 variante.
    const groups = new Map<string, Set<string>>();
    for (const d of deals) {
      const merchant = (d.merchant || "").toLowerCase().trim();
      const title = (d.title || "").toLowerCase().trim();
      const img = (d.image_url || "").trim();
      if (!merchant || !title || !img) continue;
      const k = `${merchant}|${title}`;
      if (!groups.has(k)) groups.set(k, new Set());
      groups.get(k)!.add(img);
    }

    const groupsWithMultipleColors = Array.from(groups.values()).filter(
      (imgs) => imgs.size > 1,
    ).length;

    expect(
      groupsWithMultipleColors,
      "Aucune variante de couleur trouvée — la déduplication écrase " +
        "probablement les couleurs (clé title seule au lieu de image_url).",
    ).toBeGreaterThan(0);
  }, 60_000);
});
