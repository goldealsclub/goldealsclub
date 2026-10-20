/**
 * Sélection des produits de la vidéo du jour : uniquement des produits tendance,
 * une sélection différente chaque jour et pour chacun des 3 styles.
 *
 * Thème du jour (THEME_PAR_JOUR) : sneakers, vêtements, enfants, accessoires ou
 * best-of. Chaque thème a ses règles « tendance » (modèles, marques, pièces phares).
 * Ci-dessous, les règles détaillées du thème sneakers ; les autres suivent la même logique.
 *
 * 1. Éligibles : sneakers de marques recherchées, modèle présent dans la liste
 *    TENDANCES, remise entre 25 et 80 %, prix ≥ 25 €, ni enfant ni chaussure de
 *    sport technique (crampons, rugby, golf…), ni claquettes.
 * 2. Score : popularité du modèle (« incontournable » > « tendance ») + remise.
 * 3. Variété du jour : ordre mélangé selon la date (pondéré par le score), puis
 *    les 3 styles se partagent les candidats en alternance → 3 vidéos différentes.
 * 4. Pas de redite : un produit montré ces 3 derniers jours est écarté (historique).
 * 5. Diversité dans la vidéo : 1 seul modèle par famille (pas deux Chuck Taylor),
 *    2 produits max par marque.
 *
 * Liste établie le 19/10/2026 (meilleures ventes et recherches 2025-2026 :
 * Samba/Gazelle/Spezial, Asics 1130/NYC/Kayano 14, NB 1906/9060/204L/740,
 * Puma Speedcat/Palermo, Salomon XT-6…). À rafraîchir chaque saison.
 */

import fs from "fs";
import path from "path";

// [motif, poids] : 3 = incontournable du moment, 2 = valeur sûre tendance
const TENDANCES = [
  // adidas
  [/\bsamba\b/i, 3], [/\bgazelle\b/i, 3], [/\bspezial\b/i, 3], [/\bcampus\b/i, 3], [/\bsl ?72\b/i, 3],
  [/taekwondo/i, 3], [/\btokyo\b/i, 3], [/superstar/i, 2], [/stan smith/i, 2], [/forum (low|84)/i, 2], [/handball spezial/i, 3],
  // Nike / Jordan
  [/air force 1|\baf-?1\b/i, 3], [/\bdunk\b/i, 3], [/vomero ?5/i, 3], [/p-?6000/i, 3], [/air max (dn|plus|tn)\b/i, 3],
  [/air max (1|90|95|97)\b/i, 2], [/cortez/i, 2], [/killshot/i, 2], [/ld-?1000/i, 2], [/blazer/i, 2],
  [/jordan (1|4)\b/i, 3], [/jordan (3|5|6|11)\b/i, 2],
  // New Balance
  [/\b1906/i, 3], [/\b9060\b/i, 3], [/\b204l\b/i, 3], [/\b530\b/i, 2], [/\b550\b/i, 2], [/2002r/i, 2], [/\b740\b/i, 2], [/\b327\b/i, 2], [/\b1000\b/i, 2],
  // Asics
  [/gel-?1130/i, 3], [/gel-?nyc/i, 3], [/kayano 14/i, 3], [/gt-?2160/i, 2], [/gel-?lyte/i, 2], [/gel-?kahana/i, 2],
  // Salomon, Puma, Converse, Vans, Reebok, Saucony, Hoka
  [/xt-?6|xt-?4|acs pro/i, 3], [/speedcat/i, 3], [/palermo/i, 2], [/puma suede|\bsuede classic/i, 2],
  [/chuck 70/i, 3], [/chuck taylor/i, 2], [/old skool|knu skool/i, 2], [/\bclub c\b/i, 2], [/classic leather/i, 2],
  [/shadow 6000|jazz original|progrid omni/i, 2], [/clifton|bondi/i, 2],
];

const MARQUES = new Set(["nike", "jordan", "adidas", "adidas originals", "new balance", "asics", "salomon", "puma",
  "converse", "vans", "reebok", "saucony", "hoka"]);

const EXCLUS = /enfant|junior|kids|b[ée]b[ée]|tout-?petits|\b(gs|ps|td)\b|football|crampon|\b(fg|ag|sg|tf|mg)\b|rugby|golf|baseball|handball (?!spezial)|volley|chaussures de tennis|basketball|spikes|pointes|claquette|\bslides?\b|sandale|\bmules?\b|cyclisme|randonn/i;

const brandKey = (b) => (b || "").trim().toLowerCase();

/** Clé de modèle : « adidas gazelle bold » pour tous les coloris d'un même modèle. */
export function modelKey(d) {
  const t = String(d.title || "").toLowerCase()
    .replace(/\(.*?\)|".*?"|«.*?»/g, " ")
    .replace(/\b(baskets?|chaussures?|sneakers?|homme|hommes|femme|femmes|unisexe|mixte|en|de|du|cuir|daim)\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  return `${brandKey(d.brand)}|${t.split(" ").slice(0, 4).join(" ")}`;
}

export function trendWeight(d) {
  let w = 0;
  for (const [re, weight] of TENDANCES) if (re.test(d.title || "")) w = Math.max(w, weight);
  return w;
}

/** Famille du modèle (« chuck taylor », « p-6000 »…) : une seule par vidéo. */
export function familyKey(d) {
  let best = null;
  for (const [re, weight] of TENDANCES) if (re.test(d.title || "") && (!best || weight > best[1])) best = [re, weight];
  return `${brandKey(d.brand)}|${best ? best[0].source : modelKey(d)}`;
}

export function isEligible(d) {
  const discount = Number(d.discount_percent) || 0;
  return (d.category || "").toLowerCase() === "sneakers"
    && d.image_url && Number(d.sale_price) >= 25
    && discount >= 25 && discount <= 80
    && MARQUES.has(brandKey(d.brand))
    && !/enfant|kid/i.test(d.gender || "")
    && !EXCLUS.test(d.title || "")
    && trendWeight(d) > 0;
}

// ── Vêtements ────────────────────────────────────────────────────────────────
// Marques recherchées : 3 = très tendance, 2 = tendance / rétro qui revient.
const MARQUES_MODE = new Map(Object.entries({
  nike: 3, jordan: 3, adidas: 3, "adidas originals": 3, "new balance": 3, "the north face": 3, carhartt: 3,
  "carhartt wip": 3, stussy: 3, "stüssy": 3, "ralph lauren": 3, "polo ralph lauren": 3, lacoste: 3,
  "arc'teryx": 3, arcteryx: 3, "karl kani": 3, patagonia: 3, salomon: 3,
  dickies: 2, "helly hansen": 2, ellesse: 2, "mitchell & ness": 2, "new era": 2, kappa: 2, umbro: 2,
  champion: 2, columbia: 2, puma: 2, "project x paris": 2, pegador: 2, "tommy hilfiger": 2, "tommy jeans": 2,
  "calvin klein": 2, "levi's": 2, levis: 2, fila: 2, "sergio tacchini": 2, "le coq sportif": 2, reebok: 2, asics: 2,
  converse: 2, vans: 2,
}));
const brandTier = (d) => MARQUES_MODE.get(brandKey(d.brand)) || 0;

// Pièces phares (une seule par vidéo et par famille) : [motif, nom de famille]
const PIECES = [
  [/tech ?fleece/i, "tech fleece"], [/windrunner/i, "windrunner"], [/firebird|beckenbauer|\bsst\b|track ?(top|jacket|pant)|veste de surv[eê]tement|survêtement|tracksuit/i, "survetement"],
  [/doudoune|puffer|nuptse|down jacket|parka/i, "doudoune"], [/jersey|maillot(?! de bain)/i, "maillot"],
  [/cargo/i, "cargo"], [/polaire|fleece|sherpa/i, "polaire"], [/hoodie|sweat.*capuche|à capuche/i, "hoodie"],
  [/crewneck|sweat-?shirt|\bcrew\b/i, "sweat"], [/coupe-?vent|windbreaker|anorak|veste/i, "veste"],
  [/jogging|jogger|sweatpants?|pantalon de surv/i, "jogging"], [/baggy|wide leg|carpenter|work pant|\bjean/i, "pantalon"],
  [/polo/i, "polo"], [/t-?shirt|\btee\b/i, "t-shirt"],
];
const pieceOf = (d) => { for (const [re, name] of PIECES) if (re.test(d.title || "")) return name; return null; };
const PIECES_FORTES = new Set(["tech fleece", "windrunner", "survetement", "doudoune", "maillot", "cargo", "polaire"]);

// Hors saison ou peu vendeur en vidéo : sous-vêtements, maillots de bain, technique sport…
const EXCLUS_MODE = /maillot de bain|bikini|boxer|slip|culotte|brassi[eè]re|soutien|chaussette|legging|collant|compression|thermique|base ?layer|cyclisme|ski\b|arbitre|gardien|training top|entra[iî]nement|running|golf|ultimate ?365|cold\.?rdy|heat\.?rdy/i;
// Pièces d'été écartées d'octobre à mars (et inversement pour les doudounes l'été).
const horsSaison = (d, date) => {
  const m = Number(String(date).slice(5, 7));
  const hiver = m >= 10 || m <= 3;
  if (hiver) return /\bshorts?\b|\bjorts\b|débardeur|tank top|bermuda/i.test(d.title || "");
  return /doudoune|puffer|parka|polaire|bonnet|beanie/i.test(d.title || "");
};
const VETEMENTS = new Set(["t-shirts", "pantalons", "vestes", "hoodies"]);

// ── Accessoires ──────────────────────────────────────────────────────────────
const ACCESSOIRES_TENDANCE = [
  [/casquette|\bcap\b|snapback|trucker|9forty|9fifty|59fifty|39thirty|dad hat/i, "casquette"],
  [/bonnet|beanie/i, "bonnet"], [/banane|fanny|waist ?bag|sling|crossbody|shoulder bag|sacoche/i, "sacoche"],
  [/sac à dos|backpack|rucksack/i, "sac a dos"], [/tote|sac\b|bag\b|duffel/i, "sac"],
];
const accessoireOf = (d) => { for (const [re, name] of ACCESSOIRES_TENDANCE) if (re.test(d.title || "")) return name; return null; };

const prixMini = (d, min) => Number(d.sale_price) >= min;
const remiseOk = (d) => { const x = Number(d.discount_percent) || 0; return x >= 25 && x <= 80; };
const estEnfant = (d) => /enfant|kid/i.test(d.gender || "") || /enfant|junior|kids|\b(gs|ps|td)\b|tout-?petits|b[ée]b[ée]/i.test(d.title || "");
const SPORT_TECHNIQUE = /football|crampon|\b(fg|ag|sg|tf|mg)\b|rugby|golf|baseball|handball (?!spezial)|volley|chaussures de tennis|basketball|spikes|pointes|cyclisme|randonn/i;

export const THEMES = {
  sneakers: {
    label: "Sneakers", hashtags: ["#sneakers", "#sneakerhead", "#bonplan", "#promo", "#streetwear"],
    eligible: (d) => isEligible(d),
    weight: (d) => trendWeight(d),
    family: (d) => familyKey(d),
  },
  vetements: {
    label: "Vêtements", hashtags: ["#streetwear", "#mode", "#outfit", "#bonplan", "#promo"],
    eligible: (d, date) => VETEMENTS.has((d.category || "").toLowerCase()) && !estEnfant(d) && d.image_url
      && prixMini(d, 20) && remiseOk(d) && brandTier(d) > 0 && !EXCLUS_MODE.test(d.title || "") && !horsSaison(d, date)
      && (brandTier(d) === 3 || PIECES_FORTES.has(pieceOf(d))),
    weight: (d) => brandTier(d) + (PIECES_FORTES.has(pieceOf(d)) ? 1 : 0),
    family: (d) => `${brandKey(d.brand)}|${pieceOf(d) || d.category}`,
    kind: (d) => pieceOf(d) || d.category,
  },
  enfants: {
    label: "Enfants", hashtags: ["#enfant", "#modeenfant", "#sneakers", "#bonplan", "#promo"],
    eligible: (d, date) => estEnfant(d) && d.image_url && prixMini(d, 15) && remiseOk(d) && !SPORT_TECHNIQUE.test(d.title || "")
      && !EXCLUS_MODE.test(d.title || "") && !horsSaison(d, date) && !/claquette|slide|sandale|\bpack\b/i.test(d.title || "")
      && (((d.category || "").toLowerCase() === "sneakers" && trendWeight(d) > 0)
        || (VETEMENTS.has((d.category || "").toLowerCase()) && brandTier(d) === 3)),
    weight: (d) => (d.category || "").toLowerCase() === "sneakers" ? trendWeight(d) : brandTier(d) - 1 + (PIECES_FORTES.has(pieceOf(d)) ? 1 : 0),
    family: (d) => (d.category || "").toLowerCase() === "sneakers" ? familyKey(d) : `${brandKey(d.brand)}|${pieceOf(d) || d.category}`,
  },
  accessoires: {
    label: "Accessoires", hashtags: ["#accessoires", "#casquette", "#streetwear", "#bonplan", "#promo"],
    eligible: (d, date) => (d.category || "").toLowerCase() === "accessoires" && d.image_url && prixMini(d, 15) && remiseOk(d)
      && brandTier(d) > 0 && accessoireOf(d)
      && !/\bpack\b|chaussette|sock|gant|glove|écharpe set|set \(|\bjeans?\b|pantalon|\bpull\b|sweat|t-?shirt|veste/i.test(d.title || "")
      && !horsSaison(d, date),
    weight: (d) => brandTier(d),
    family: (d) => `${brandKey(d.brand)}|${accessoireOf(d)}`,
    kind: (d) => accessoireOf(d), // pas 4 casquettes dans la même vidéo
  },
};
// Best-of du dimanche : sneakers et vêtements mélangés.
THEMES.bestof = {
  label: "Best-of", hashtags: ["#bonplan", "#promo", "#sneakers", "#streetwear", "#mode"],
  eligible: (d, date) => THEMES.sneakers.eligible(d, date) || THEMES.vetements.eligible(d, date),
  weight: (d) => (VETEMENTS.has((d.category || "").toLowerCase()) ? THEMES.vetements.weight(d) : THEMES.sneakers.weight(d)),
  family: (d) => (VETEMENTS.has((d.category || "").toLowerCase()) ? THEMES.vetements.family(d) : THEMES.sneakers.family(d)),
};

/** Libellé affiché dans la vidéo (« Hoodie », « Doudoune »… plutôt que la catégorie du flux). */
const LIBELLES = { "tech fleece": "Tech Fleece", windrunner: "Windrunner", survetement: "Survêtement", doudoune: "Doudoune",
  maillot: "Maillot", cargo: "Cargo", polaire: "Polaire", hoodie: "Hoodie", sweat: "Sweat", veste: "Veste", jogging: "Jogging",
  pantalon: "Pantalon", polo: "Polo", "t-shirt": "T-shirt", casquette: "Casquette", bonnet: "Bonnet", sacoche: "Sacoche",
  "sac a dos": "Sac à dos", sac: "Sac" };
export function displayCategory(d) {
  const cat = (d.category || "").toLowerCase();
  const enfant = estEnfant(d) ? " enfant" : "";
  if (cat === "sneakers") return `Sneakers${enfant}`;
  const k = cat === "accessoires" ? accessoireOf(d) : pieceOf(d);
  const base = LIBELLES[k] || (d.category ? d.category.charAt(0).toUpperCase() + d.category.slice(1) : "");
  return `${base}${enfant}`;
}

// Lundi → dimanche (le mercredi, jour des enfants)
const THEME_PAR_JOUR = ["bestof", "sneakers", "vetements", "enfants", "sneakers", "vetements", "accessoires"]; // index = getUTCDay()
export function themeForDate(date) {
  return THEME_PAR_JOUR[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/**
 * 3 vidéos par jour : sneakers, vêtements et accessoires. Chaque style graphique
 * (adidas, zara, nike) change de thème chaque jour pour varier les rendus.
 */
export const THEMES_DU_JOUR = ["sneakers", "vetements", "accessoires"];
export function themeForStyle(date, styleIndex) {
  const day = Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86400000);
  return THEMES_DU_JOUR[(styleIndex + day) % THEMES_DU_JOUR.length];
}

// Générateur pseudo-aléatoire déterministe (même date → même ordre pour les 3 styles).
function rng(seedText) {
  let h = 2166136261;
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param deals       catalogue complet
 * @param date        "AAAA-MM-JJ"
 * @param styleIndex  0, 1 ou 2 (adidas, zara, nike) : chaque style reçoit ses propres candidats
 * @param recentKeys  clés de modèles montrés les jours précédents
 * @returns candidats ordonnés (la vérification marchand/photo prend les 5 premiers valides)
 */
export function rankTrendingDeals({ deals, date, styleIndex = 0, styles = 3, recentKeys = new Set(), theme = "sneakers" }) {
  const T = THEMES[theme] || THEMES.sneakers;
  const pool = deals.filter((d) => T.eligible(d, date));
  // Un seul coloris par modèle : on garde le plus intéressant (remise la plus forte).
  const byModel = new Map();
  for (const d of pool) {
    const k = modelKey(d);
    const prev = byModel.get(k);
    if (!prev || (d.discount_percent || 0) > (prev.discount_percent || 0)) byModel.set(k, d);
  }
  let models = [...byModel.values()];
  const fresh = models.filter((d) => !recentKeys.has(modelKey(d)));
  // S'il ne reste pas assez de nouveautés, on s'autorise des modèles déjà vus.
  if (fresh.length >= styles * 6) models = fresh;

  // Tirage pondéré : score = popularité du modèle (dominant) + remise.
  const rand = rng(`goldeals-${theme}-${date}`);
  const keyed = models.map((d) => {
    const score = T.weight(d) * 25 + (Number(d.discount_percent) || 0);
    return { d, key: Math.pow(rand(), 1 / score) }; // tirage pondéré sans remise (Efraimidis-Spirakis)
  }).sort((a, b) => b.key - a.key).map((x) => x.d);

  // Une famille de modèle (ex. Chuck Taylor) n'apparaît que dans UNE des 3 vidéos du jour :
  // on garde le premier tiré de chaque famille, puis répartition en alternance entre les styles.
  const seenFamilies = new Set();
  const unique = [];
  const repeats = [];
  for (const d of keyed) {
    const f = T.family(d);
    if (seenFamilies.has(f)) repeats.push(d); else { seenFamilies.add(f); unique.push(d); }
  }
  const mine = [
    ...unique.filter((_, i) => i % styles === styleIndex),
    ...repeats.filter((_, i) => i % styles === styleIndex), // secours si trop d'offres sont refusées
  ];
  const perBrand = new Map();
  const perKind = new Map();
  const families = new Set();
  const out = [];
  const overflow = [];
  for (const d of mine) {
    const b = brandKey(d.brand) === "adidas originals" ? "adidas" : brandKey(d.brand);
    const n = perBrand.get(b) || 0;
    const f = T.family(d);
    const k = T.kind ? T.kind(d) : null; // 2 max par type d'article (casquettes, hoodies…)
    if (n >= 2 || families.has(f) || (k && (perKind.get(k) || 0) >= 2)) { overflow.push(d); continue; }
    perBrand.set(b, n + 1);
    if (k) perKind.set(k, (perKind.get(k) || 0) + 1);
    families.add(f);
    out.push(d);
  }
  return [...out, ...overflow];
}

// ── Historique (3 derniers jours, tous styles) ───────────────────────────────

export function loadRecentKeys(dir, today, days = 3) {
  const keys = new Set();
  if (!dir || !fs.existsSync(dir)) return keys;
  const limit = new Date(`${today}T00:00:00Z`).getTime() - days * 86400000;
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json"))) {
    try {
      for (const e of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
        const t = new Date(`${e.date}T00:00:00Z`).getTime();
        if (t >= limit && e.date !== today) for (const k of e.keys || []) keys.add(k);
      }
    } catch { /* fichier illisible : ignoré */ }
  }
  return keys;
}

export function saveHistory(dir, style, today, deals) {
  if (!dir) return;
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${style}.json`);
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* nouveau */ }
  entries = entries.filter((e) => e.date !== today).slice(-30);
  entries.push({ date: today, keys: deals.map(modelKey) });
  fs.writeFileSync(file, JSON.stringify(entries, null, 1));
}
