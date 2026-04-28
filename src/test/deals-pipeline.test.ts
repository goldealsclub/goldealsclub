/**
 * Garde anti-régression du pipeline deals.
 *
 * Invariants vérifiés à chaque modification du pipeline
 * (`supabase/functions/deals-json/index.ts` ou `src/lib/data.ts`) :
 *
 *  1. Le catalogue total renvoyé par la source live reste ≥ 4 000 deals.
 *  2. Les marchands clés attendus (Snipes, Sneakin, Sport Outlet…) sont
 *     toujours présents — détecte automatiquement un changement de label
 *     côté flux Awin (ex: "Snipes EU" → "SNIPES.com").
 *  3. Snipes (peu importe la variante d'orthographe du merchant) expose des
 *     prix barrés (`original_price > sale_price`) sur une fraction
 *     significative de ses deals.
 *  4. Les variantes de COULEUR ne sont jamais écrasées par la déduplication
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

/**
 * Volume minimum par marchand sur la fenêtre 30 jours.
 * Ces seuils sont calibrés ~50% sous le volume observé en prod pour
 * tolérer les variations naturelles tout en détectant une régression
 * type "merchant starvation" (cf. incident 28/04/2026).
 */
const MIN_DEALS_PER_MERCHANT: Record<string, number> = {
  Snipes: 300,
  Sneakin: 300,
  "Sport Outlet": 500,
};
// Réaliste vu le flux Awin actuel (≈30 % des Snipes ont un RRP).
// Si ce taux chute brutalement, c'est probablement une régression du mapping.
const MIN_SNIPES_WITH_STRIKETHROUGH_RATIO = 0.2;

/**
 * Marchands attendus dans le catalogue. Pour chacun, plusieurs variantes
 * d'orthographe possibles (le flux Awin renomme parfois ses marchands —
 * ex. "Snipes EU" devient "SNIPES.com"). Le test passe dès qu'UNE variante
 * matche, et signale clairement le marchand absent sinon.
 */
const EXPECTED_MERCHANTS: Record<string, string[]> = {
  Snipes: ["snipes"],
  Sneakin: ["sneakin"],
  "Sport Outlet": ["sport outlet"],
};

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

const norm = (s: string | null | undefined) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Renvoie tous les deals dont le merchant matche une des variantes données. */
function dealsForMerchant(deals: RawDeal[], variants: string[]): RawDeal[] {
  return deals.filter((d) => {
    const m = norm(d.merchant);
    return variants.some((v) => m.includes(v));
  });
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

  it("présence des marchands clés (détecte les renommages côté flux Awin)", async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }

    const presentMerchants = Array.from(
      new Set(deals.map((d) => norm(d.merchant)).filter(Boolean)),
    );

    const missing: string[] = [];
    for (const [label, variants] of Object.entries(EXPECTED_MERCHANTS)) {
      const found = dealsForMerchant(deals, variants).length > 0;
      if (!found) missing.push(label);
    }

    expect(
      missing,
      `Marchands attendus introuvables: ${missing.join(", ")}. ` +
        `Liste actuelle des merchants (${presentMerchants.length}): ` +
        `${presentMerchants.slice(0, 30).join(" | ")}` +
        (presentMerchants.length > 30 ? " | …" : "") +
        `. Vérifier un éventuel renommage côté flux Awin et mettre à jour ` +
        `EXPECTED_MERCHANTS dans ce test.`,
    ).toEqual([]);
  }, 60_000);

  it("volume minimum par marchand clé (anti merchant-starvation, fenêtre 30j)", async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }

    const failures: string[] = [];
    const summary: string[] = [];
    for (const [label, minCount] of Object.entries(MIN_DEALS_PER_MERCHANT)) {
      const variants = EXPECTED_MERCHANTS[label] ?? [label.toLowerCase()];
      const count = dealsForMerchant(deals, variants).length;
      summary.push(`${label}=${count} (min ${minCount})`);
      if (count < minCount) {
        failures.push(`${label}: ${count} < ${minCount}`);
      }
    }

    expect(
      failures,
      `Régression de volume détectée — ${failures.join(" ; ")}. ` +
        `Détail: ${summary.join(", ")}. ` +
        `Vérifier deals-json (PROTECTED_MERCHANTS, PER_MERCHANT_CAP, ` +
        `fenêtre 30j) ou le scraper Awin.`,
    ).toEqual([]);
  }, 60_000);

  it("Snipes affiche des prix barrés sur une part significative de ses deals", async () => {
    const deals = await fetchLiveDeals();
    if (!deals) {
      console.warn(
        "[skip] deals-json injoignable, test ignoré:",
        fetchError?.message,
      );
      return;
    }

    const snipes = dealsForMerchant(deals, EXPECTED_MERCHANTS.Snipes);

    // Si Snipes est absent du catalogue, les autres tests l'auront déjà
    // signalé — on évite ici un faux négatif "ratio NaN".
    if (snipes.length === 0) {
      console.warn(
        "[skip] Aucun deal Snipes trouvé — couvert par le test de présence des marchands.",
      );
      return;
    }

    expect(
      snipes.length,
      "Snipes doit avoir un volume minimum dans le catalogue",
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
        `(actuel: ${withStrikethrough.length}/${snipes.length} = ` +
        `${Math.round(ratio * 100)}%). Vérifier le mapping RRP côté ` +
        `import-awin-feed (rrp_price → product_price_old → base_price → saving).`,
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
      const merchant = norm(d.merchant);
      const title = norm(d.title);
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
