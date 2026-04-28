// Pure pipeline logic for deals-json, extracted to be unit-testable
// without hitting the live database. Reproduces the merchant starvation
// guarantees: PROTECTED_MERCHANTS are always queried, per-merchant
// pagination caps individual feeds, and dedup preserves color variants.

export const PROTECTED_MERCHANTS = [
  "Snipes EU",
  "Sneakin FR",
  "Sport Outlet FR",
  "Sport Is Good FR",
  "Kappa FR",
  "Training Fit FR",
];

export const PER_MERCHANT_CAP = 2500;
export const PAGE = 1000;
export const RECENT_DISCOVERY_LIMIT = 5000;

export interface DealRow {
  id: string;
  title?: string;
  brand?: string;
  merchant: string;
  image_url?: string | null;
  // Other fields are not used by the pipeline logic itself.
  [k: string]: unknown;
}

/**
 * Minimal interface the pipeline needs from the DB layer. Keeps the
 * implementation independent from `@supabase/supabase-js` so we can
 * swap in a deterministic in-memory store for tests.
 */
export interface DealsRepo {
  /** Returns the most-recent N merchant labels (with duplicates allowed). */
  recentMerchants(limit: number): Promise<string[]>;
  /** Page rows for a single merchant, ordered by detected_at desc. */
  pageForMerchant(merchant: string, from: number, to: number): Promise<DealRow[]>;
}

/**
 * Builds the ordered list of merchants to query. PROTECTED_MERCHANTS
 * always come first and are never dropped, regardless of what the
 * recent-discovery scan returns.
 */
export function buildMerchantList(
  protectedMerchants: string[],
  recentMerchants: string[],
): string[] {
  return Array.from(
    new Set([
      ...protectedMerchants,
      ...recentMerchants.filter(Boolean),
    ]),
  );
}

/**
 * Dedup that preserves color variants: same merchant + same image = dup.
 * Falls back to (brand, title) when image is missing.
 */
export function dedupePreservingColors(rows: DealRow[]): DealRow[] {
  const norm = (s: string | null | undefined) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const seen = new Set<string>();
  const out: DealRow[] = [];
  for (const r of rows) {
    const merchant = norm(r.merchant);
    const img = (r.image_url || "").toString().trim();
    const k = img
      ? `${merchant}|img:${img}`
      : `${merchant}|t:${norm(r.brand)}|${norm(r.title)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/**
 * Full pipeline: discover merchants → fetch per-merchant pages capped at
 * PER_MERCHANT_CAP → dedupe by id → dedupe preserving color variants.
 *
 * `queriedMerchants` is exposed for tests to assert that PROTECTED_MERCHANTS
 * were actually queried even when the recent-discovery scan misses them.
 */
export async function runPipeline(
  repo: DealsRepo,
  opts: {
    protectedMerchants?: string[];
    perMerchantCap?: number;
    page?: number;
    recentDiscoveryLimit?: number;
  } = {},
): Promise<{ deals: DealRow[]; queriedMerchants: string[] }> {
  const protectedM = opts.protectedMerchants ?? PROTECTED_MERCHANTS;
  const cap = opts.perMerchantCap ?? PER_MERCHANT_CAP;
  const page = opts.page ?? PAGE;
  const discoveryLimit = opts.recentDiscoveryLimit ?? RECENT_DISCOVERY_LIMIT;

  const recent = await repo.recentMerchants(discoveryLimit);
  const merchants = buildMerchantList(protectedM, recent);

  const collected: DealRow[] = [];
  const seenIds = new Set<string>();

  for (const merchant of merchants) {
    for (let from = 0; from < cap; from += page) {
      const to = Math.min(from + page, cap) - 1;
      const rows = await repo.pageForMerchant(merchant, from, to);
      if (!rows || rows.length === 0) break;
      for (const r of rows) {
        if (r?.id && !seenIds.has(r.id)) {
          seenIds.add(r.id);
          collected.push(r);
        }
      }
      if (rows.length < to - from + 1) break;
    }
  }

  return {
    deals: dedupePreservingColors(collected),
    queriedMerchants: merchants,
  };
}
