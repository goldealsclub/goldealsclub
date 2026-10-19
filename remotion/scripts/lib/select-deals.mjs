/**
 * Sélection des produits de la vidéo du jour : uniquement des modèles tendance,
 * une sélection différente chaque jour et pour chacun des 3 styles.
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
export function rankTrendingDeals({ deals, date, styleIndex = 0, styles = 3, recentKeys = new Set() }) {
  const pool = deals.filter(isEligible);
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
  const rand = rng(`goldeals-${date}`);
  const keyed = models.map((d) => {
    const score = trendWeight(d) * 25 + (Number(d.discount_percent) || 0);
    return { d, key: Math.pow(rand(), 1 / score) }; // tirage pondéré sans remise (Efraimidis-Spirakis)
  }).sort((a, b) => b.key - a.key).map((x) => x.d);

  // Répartition en alternance entre les styles, puis 1 modèle par famille et 2 max par marque.
  const mine = keyed.filter((_, i) => i % styles === styleIndex);
  const perBrand = new Map();
  const families = new Set();
  const out = [];
  const overflow = [];
  for (const d of mine) {
    const b = brandKey(d.brand) === "adidas originals" ? "adidas" : brandKey(d.brand);
    const n = perBrand.get(b) || 0;
    const f = familyKey(d);
    if (n >= 2 || families.has(f)) { overflow.push(d); continue; }
    perBrand.set(b, n + 1);
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
