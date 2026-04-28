// Tests unitaires de la pipeline deals-json — reproduisent une situation
// de "merchant starvation" sans toucher la base live.
//
// Lancer via : `supabase--test_edge_functions { functions: ["deals-json"] }`
//
// Scénarios couverts :
//   1. Merchant starvation simulée : un flux récent géant (Sport Is Good
//      avec 10 000 deals frais) pousserait Snipes/Sneakin hors d'un global
//      LIMIT — la pipeline doit quand même les ramener via PROTECTED_MERCHANTS.
//   2. PER_MERCHANT_CAP plafonne un merchant abusif (10 000 → 2500 max).
//   3. Pagination en plusieurs pages assemble correctement les rangées
//      et s'arrête sur une page incomplète (early exit).
//   4. Dedup préserve les variantes de couleur (image_url différente)
//      mais collapse les variantes de taille (même image).
//   5. Aucun PROTECTED_MERCHANT n'est dropé même si recentMerchants() est vide.

import {
  buildMerchantList,
  type DealRow,
  type DealsRepo,
  dedupePreservingColors,
  PROTECTED_MERCHANTS,
  runPipeline,
} from "./pipeline.ts";

// Inline assertions — pas de dépendance réseau (sandbox offline-friendly).
function assert(cond: unknown, msg = "assertion failed"): asserts cond {
  if (!cond) throw new Error(msg);
}
function assertEquals<T>(a: T, b: T, msg?: string) {
  const ja = JSON.stringify(a);
  const jb = JSON.stringify(b);
  if (ja !== jb) throw new Error(msg ?? `expected ${jb}, got ${ja}`);
}
function assertGreater(a: number, b: number, msg?: string) {
  if (!(a > b)) throw new Error(msg ?? `expected ${a} > ${b}`);
}

import {
  buildMerchantList,
  type DealRow,
  type DealsRepo,
  dedupePreservingColors,
  PROTECTED_MERCHANTS,
  runPipeline,
} from "./pipeline.ts";

// ---------- In-memory repo factory ----------

interface FakeStore {
  // merchant → ordered list of deals (most recent first)
  byMerchant: Record<string, DealRow[]>;
  // global "recent" order used by recentMerchants() — simulates the 5000-row
  // discovery scan that gets dominated by the freshest merchant.
  recentScanOrder: string[];
}

function makeRepo(store: FakeStore): DealsRepo & { calls: { pages: Array<[string, number, number]> } } {
  const calls = { pages: [] as Array<[string, number, number]> };
  return {
    calls,
    async recentMerchants(limit: number) {
      return store.recentScanOrder.slice(0, limit);
    },
    async pageForMerchant(merchant, from, to) {
      calls.pages.push([merchant, from, to]);
      const rows = store.byMerchant[merchant] ?? [];
      return rows.slice(from, to + 1);
    },
  };
}

function makeDeals(merchant: string, count: number, opts: { sameImage?: boolean } = {}): DealRow[] {
  const out: DealRow[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: `${merchant}-${i}`,
      title: `Product ${i}`,
      brand: merchant.split(" ")[0],
      merchant,
      image_url: opts.sameImage ? `https://img/${merchant}/shared.jpg` : `https://img/${merchant}/${i}.jpg`,
    });
  }
  return out;
}

// ---------- Tests ----------

Deno.test("buildMerchantList: PROTECTED_MERCHANTS toujours en tête, dédupliqués", () => {
  const merchants = buildMerchantList(
    ["Snipes EU", "Sneakin FR"],
    ["Sport Is Good FR", "Snipes EU", "Other FR"],
  );
  assertEquals(merchants, ["Snipes EU", "Sneakin FR", "Sport Is Good FR", "Other FR"]);
});

Deno.test("buildMerchantList: vide côté discovery → PROTECTED conservé", () => {
  const merchants = buildMerchantList(["Snipes EU", "Sneakin FR"], []);
  assertEquals(merchants, ["Snipes EU", "Sneakin FR"]);
});

Deno.test("starvation simulée: Snipes/Sneakin sont quand même retournés malgré un flux Sport Is Good qui sature la discovery", async () => {
  // Sport Is Good vient de réimporter 10 000 deals frais → il sature
  // entièrement le scan de découverte (les 5000 premières lignes).
  // Snipes/Sneakin n'apparaissent PAS dans recentScanOrder.
  const store: FakeStore = {
    byMerchant: {
      "Sport Is Good FR": makeDeals("Sport Is Good FR", 10_000),
      "Snipes EU": makeDeals("Snipes EU", 800),
      "Sneakin FR": makeDeals("Sneakin FR", 600),
      "Sport Outlet FR": makeDeals("Sport Outlet FR", 1200),
    },
    // Discovery ne voit QUE Sport Is Good (cas pathologique).
    recentScanOrder: Array(5000).fill("Sport Is Good FR"),
  };
  const repo = makeRepo(store);

  const { deals, queriedMerchants } = await runPipeline(repo);

  // PROTECTED_MERCHANTS doivent avoir été interrogés explicitement.
  for (const m of ["Snipes EU", "Sneakin FR", "Sport Outlet FR"]) {
    assert(queriedMerchants.includes(m), `${m} doit être interrogé`);
  }

  // Les deals doivent contenir au moins quelques unités de chaque PROTECTED.
  const countsByMerchant: Record<string, number> = {};
  for (const d of deals) {
    countsByMerchant[d.merchant] = (countsByMerchant[d.merchant] ?? 0) + 1;
  }
  assertEquals(countsByMerchant["Snipes EU"], 800, "Snipes ne doit jamais disparaître");
  assertEquals(countsByMerchant["Sneakin FR"], 600, "Sneakin ne doit jamais disparaître");
  assertEquals(countsByMerchant["Sport Outlet FR"], 1200, "Sport Outlet ne doit jamais disparaître");
});

Deno.test("PER_MERCHANT_CAP plafonne un merchant abusif à 2500", async () => {
  const store: FakeStore = {
    byMerchant: {
      "Sport Is Good FR": makeDeals("Sport Is Good FR", 10_000),
    },
    recentScanOrder: ["Sport Is Good FR"],
  };
  const repo = makeRepo(store);

  const { deals } = await runPipeline(repo, {
    protectedMerchants: [],
    perMerchantCap: 2500,
    page: 1000,
  });

  const sigCount = deals.filter((d) => d.merchant === "Sport Is Good FR").length;
  assertEquals(sigCount, 2500, "Le cap doit limiter à 2500 même si 10000 sont dispo");
});

Deno.test("pagination: requêtes successives 0-999, 1000-1999, 2000-2499 puis stop", async () => {
  const store: FakeStore = {
    byMerchant: { "M FR": makeDeals("M FR", 10_000) },
    recentScanOrder: ["M FR"],
  };
  const repo = makeRepo(store);

  await runPipeline(repo, {
    protectedMerchants: [],
    perMerchantCap: 2500,
    page: 1000,
  });

  assertEquals(repo.calls.pages, [
    ["M FR", 0, 999],
    ["M FR", 1000, 1999],
    ["M FR", 2000, 2499],
  ]);
});

Deno.test("pagination: early exit si la page renvoie moins que demandé", async () => {
  const store: FakeStore = {
    // Seulement 1500 deals → 2e page renvoie 500 lignes (incomplète) → stop
    byMerchant: { "M FR": makeDeals("M FR", 1500) },
    recentScanOrder: ["M FR"],
  };
  const repo = makeRepo(store);

  const { deals } = await runPipeline(repo, {
    protectedMerchants: [],
    perMerchantCap: 2500,
    page: 1000,
  });

  assertEquals(deals.length, 1500);
  assertEquals(repo.calls.pages.length, 2, "Doit s'arrêter après la page incomplète");
});

Deno.test("dedup: préserve les variantes de COULEUR (images différentes)", () => {
  const rows: DealRow[] = [
    { id: "1", merchant: "Snipes EU", title: "Air Max 90", brand: "Nike", image_url: "https://img/red.jpg" },
    { id: "2", merchant: "Snipes EU", title: "Air Max 90", brand: "Nike", image_url: "https://img/blue.jpg" },
    { id: "3", merchant: "Snipes EU", title: "Air Max 90", brand: "Nike", image_url: "https://img/black.jpg" },
  ];
  const out = dedupePreservingColors(rows);
  assertEquals(out.length, 3, "3 couleurs distinctes doivent être conservées");
});

Deno.test("dedup: collapse les variantes de TAILLE (même image)", () => {
  const rows: DealRow[] = [
    { id: "s38", merchant: "Snipes EU", title: "Air Max 90 T38", brand: "Nike", image_url: "https://img/same.jpg" },
    { id: "s39", merchant: "Snipes EU", title: "Air Max 90 T39", brand: "Nike", image_url: "https://img/same.jpg" },
    { id: "s40", merchant: "Snipes EU", title: "Air Max 90 T40", brand: "Nike", image_url: "https://img/same.jpg" },
  ];
  const out = dedupePreservingColors(rows);
  assertEquals(out.length, 1, "Tailles partageant la même image doivent être fusionnées");
});

Deno.test("dedup: fallback brand+title quand image manque", () => {
  const rows: DealRow[] = [
    { id: "1", merchant: "M FR", title: "Veste Nike", brand: "Nike", image_url: "" },
    { id: "2", merchant: "M FR", title: "Veste Nike", brand: "Nike", image_url: null },
    { id: "3", merchant: "M FR", title: "Veste Adidas", brand: "Adidas", image_url: "" },
  ];
  const out = dedupePreservingColors(rows);
  assertEquals(out.length, 2);
});

Deno.test("intégration: dataset multi-marchands → tous présents, tailles fusionnées, couleurs gardées", async () => {
  const snipesColors: DealRow[] = [
    { id: "sn1", merchant: "Snipes EU", title: "AM90", brand: "Nike", image_url: "https://i/sn-red.jpg" },
    { id: "sn2", merchant: "Snipes EU", title: "AM90", brand: "Nike", image_url: "https://i/sn-blue.jpg" },
  ];
  const snipesSizes: DealRow[] = [
    { id: "sn3", merchant: "Snipes EU", title: "AM95 T38", brand: "Nike", image_url: "https://i/sn-95.jpg" },
    { id: "sn4", merchant: "Snipes EU", title: "AM95 T39", brand: "Nike", image_url: "https://i/sn-95.jpg" },
  ];
  const sneakinDeals = makeDeals("Sneakin FR", 50);

  const store: FakeStore = {
    byMerchant: {
      "Snipes EU": [...snipesColors, ...snipesSizes],
      "Sneakin FR": sneakinDeals,
    },
    recentScanOrder: ["Sneakin FR", "Sneakin FR", "Sneakin FR"], // pas de Snipes !
  };
  const repo = makeRepo(store);

  const { deals } = await runPipeline(repo);

  const snipes = deals.filter((d) => d.merchant === "Snipes EU");
  const sneakin = deals.filter((d) => d.merchant === "Sneakin FR");

  // 2 couleurs AM90 + 1 ligne fusionnée pour AM95 = 3
  assertEquals(snipes.length, 3, "Snipes : couleurs gardées, tailles fusionnées");
  assertEquals(sneakin.length, 50);
  assertGreater(deals.length, 50, "Snipes ET Sneakin doivent coexister");
});
