// Score de popularité streetwear / sneakers (subjectif, ajustable).
// Sert au tri "par popularité" du filtre marques et à toute liste
// de marques tendance (overlay de recherche, etc.).
//
// Plus le score est élevé, plus la marque remonte. Les marques absentes
// de la table reçoivent 0 et sont triées ensuite par volume de deals.

export const BRAND_POPULARITY: Record<string, number> = {
  // Tier S — les incontournables
  nike: 100,
  jordan: 98,
  adidas: 95,
  "new balance": 90,
  // Tier A — sneaker / streetwear majeurs
  puma: 80,
  asics: 78,
  "on": 76,
  hoka: 74,
  salomon: 72,
  vans: 70,
  converse: 68,
  ugg: 66,
  // Tier B — lifestyle & outdoor
  "the north face": 62,
  carhartt: 60,
  "dr. martens": 58,
  timberland: 56,
  birkenstock: 54,
  crocs: 52,
  reebok: 50,
  lacoste: 48,
  saucony: 46,
  // Tier C — heritage / sport
  champion: 40,
  fila: 38,
  "polo ralph lauren": 38,
  ellesse: 36,
  "sergio tacchini": 34,
  kappa: 34,
  umbro: 30,
  "karl kani": 30,
  "mitchell & ness": 30,
  "new era": 30,
  "under armour": 28,
  dickies: 28,
  columbia: 26,
  helly hansen: 24,
  oakley: 22,
  diadora: 22,
  mizuno: 20,
  hummel: 18,
  joma: 16,
  "le coq sportif": 16,
  errea: 14,
  macron: 14,
  givova: 12,
  jako: 10,
  uhlsport: 10,
};

/**
 * Score de popularité d'une marque (0 si inconnue).
 * Insensible à la casse / aux espaces multiples.
 */
export function brandPopularity(brand: string): number {
  const k = (brand || "").trim().toLowerCase().replace(/\s+/g, " ");
  return BRAND_POPULARITY[k] ?? 0;
}

/**
 * Trie un tableau de marques par popularité décroissante,
 * puis par volume (counts) en tie-breaker, puis alphabétiquement.
 */
export function sortBrandsByPopularity(
  brands: string[],
  counts: Record<string, number> = {}
): string[] {
  return [...brands].sort((a, b) => {
    const pa = brandPopularity(a);
    const pb = brandPopularity(b);
    if (pa !== pb) return pb - pa;
    const ca = counts[a] || 0;
    const cb = counts[b] || 0;
    if (ca !== cb) return cb - ca;
    return a.localeCompare(b);
  });
}
