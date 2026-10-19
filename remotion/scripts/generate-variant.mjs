#!/usr/bin/env node
/**
 * Génère une vidéo TikTok variant selon un preset:
 *   - top      : top 5 plus grosses réductions toutes marques premium (défaut)
 *   - nike     : 5 deals Nike/Jordan uniquement
 *   - budget   : 5 deals sneakers les moins chers (sale_price asc, ≥40%)
 *   - adidas   : 5 deals adidas uniquement
 *
 * Usage:
 *   cd remotion && node scripts/generate-variant.mjs <preset>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execFileSync, execSync } from "child_process";
import { mixAudio } from "./lib/audio-mix.mjs";
import { checkLiveOffer } from "./lib/live-offer.mjs";
import { rankTrendingDeals, loadRecentKeys, saveHistory, themeForDate, THEMES, displayCategory } from "./lib/select-deals.mjs";
import { imageSize } from "image-size";
import { assertCleanCutout, CUTOUT_LIMITS, padStudioMargin, removeConnectedStudioBackground } from "./lib/studio-cutout.mjs";

// Détourage IA disponible ? (python3 + rembg installés par le workflow)
const AI_CUTOUT_SCRIPT = new URL("./lib/ai_cutout.py", import.meta.url).pathname;
const AI_CUTOUT = (() => {
  try { execFileSync("python3", ["-c", "import rembg"], { stdio: "ignore" }); return true; } catch { return false; }
})();
console.log(AI_CUTOUT ? "✂️  Détourage IA (u2net) actif" : "✂️  rembg absent : détourage classique");
import { loadDeals } from "./lib/load-deals.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("🛡️  Contrôle anti-régression du détourage...");
execFileSync(process.execPath, [path.join(__dirname, "qa-cutout.mjs")], { cwd: rootDir, stdio: "inherit" });

// CLI : 1er arg positionnel = preset deals, --style=<id> = direction artistique
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const styleArg = process.argv.find((a) => a.startsWith("--style="));
const preset = (positional[0] || "top").toLowerCase();
const STYLE_ID = (styleArg ? styleArg.split("=")[1] : "adidas").toLowerCase();
const validPresets = ["top", "nike", "budget", "adidas"];
const validStyles = ["adidas", "zara", "nike"];
if (!validPresets.includes(preset)) {
  console.error(`Preset invalide. Utiliser: ${validPresets.join(", ")}`);
  process.exit(1);
}
if (!validStyles.includes(STYLE_ID)) {
  console.error(`Style invalide. Utiliser: ${validStyles.join(", ")}`);
  process.exit(1);
}

console.log(`🎬 Génération vidéo variant: ${preset.toUpperCase()} — style ${STYLE_ID}`);

const envPath = path.resolve(rootDir, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const m = line.match(/^(\w+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const localDealsPath = path.resolve(rootDir, "../public/deals.json");
const allDeals = await loadDeals({ supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, localPath: localDealsPath });

// Comparaison insensible à la casse : les flux mélangent "Adidas"/"adidas", "PUMA"/"Puma"…
const brandKey = (b) => (b || "").trim().toLowerCase();
const allowedBrands = new Set(["Nike", "adidas", "Jordan", "New Balance", "Puma", "Reebok", "Asics", "Converse", "Vans", "Salomon", "Mizuno", "Saucony", "Hoka", "Under Armour"].map(brandKey));
// Nom de marque canonique (pour les logos et l'affichage)
const CANONICAL_BRAND = { nike: "Nike", adidas: "adidas", jordan: "Jordan", "new balance": "New Balance", puma: "Puma", reebok: "Reebok" };

let rawDeals = allDeals.map((d) => ({ ...d, brand: CANONICAL_BRAND[brandKey(d.brand)] ?? d.brand })).filter((d) => {
  const cat = (d.category || "").toLowerCase();
  return cat === "sneakers" && d.image_url && d.sale_price;
});

const today = new Date().toISOString().slice(0, 10);
const HISTORY_DIR = process.env.VIDEO_HISTORY_DIR;
// Thème du jour (sneakers, vêtements, enfants, accessoires, best-of) ; forçable via --theme=…
const themeArg = process.argv.find((a) => a.startsWith("--theme="))?.slice(8) || process.env.VIDEO_THEME;
const THEME = themeArg && THEMES[themeArg] ? themeArg : themeForDate(today);
console.log(`🗓️  Thème du jour : ${THEMES[THEME].label}`);
if (preset === "top") {
  // Modèles tendance uniquement, sélection différente chaque jour et pour chaque style.
  const recentKeys = loadRecentKeys(HISTORY_DIR, today);
  rawDeals = rankTrendingDeals({
    deals: allDeals.map((d) => ({ ...d, brand: CANONICAL_BRAND[brandKey(d.brand)] ?? d.brand })),
    date: today,
    styleIndex: validStyles.indexOf(STYLE_ID),
    recentKeys,
    theme: THEME,
  });
  console.log(`🔥 ${rawDeals.length} produits tendance candidats (${recentKeys.size} déjà montrés ces 3 derniers jours, écartés)`);
} else if (preset === "nike") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 25 && (brandKey(d.brand) === "nike" || brandKey(d.brand) === "jordan"))
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
} else if (preset === "adidas") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 25 && brandKey(d.brand) === "adidas")
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
} else if (preset === "budget") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 40 && allowedBrands.has(brandKey(d.brand)) && d.sale_price <= 80)
    .sort((a, b) => (a.sale_price || 999) - (b.sale_price || 999));
}

rawDeals = rawDeals.slice(0, 250);
console.log(`✅ ${rawDeals.length} deals candidats`);

if (rawDeals.length < 5) {
  console.error(`❌ Pas assez de deals pour preset ${preset} (${rawDeals.length})`);
  process.exit(1);
}

const makeBrandLogo = (label) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 60'><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='Helvetica,Arial,sans-serif' font-size='42' font-weight='800' letter-spacing='2' fill='%23111'>${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
};
const brandLogos = {
  Nike: makeBrandLogo("NIKE"),
  adidas: makeBrandLogo("adidas"),
  Jordan: makeBrandLogo("JORDAN"),
  "New Balance": makeBrandLogo("NB"),
  Puma: makeBrandLogo("PUMA"),
  Reebok: makeBrandLogo("Reebok"),
};

console.log("🖼️  Téléchargement images HD...");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
function extractDirectImageUrl(u) {
  try {
    const url = new URL(u);
    const inner = url.searchParams.get("url");
    if (!inner) return null;
    const decoded = decodeURIComponent(inner).replace(/^ssl:/, "https://");
    return decoded.startsWith("http") ? decoded : `https://${decoded.replace(/^\/+/, "")}`;
  } catch { return null; }
}
const MIN_IMG_SIZE = 600;
async function fetchImage(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*,*/*", Referer: "https://www.google.com/" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get("content-type") || "image/jpeg";
  if (!ct.startsWith("image/")) throw new Error(`bad type ${ct}`);
  let dims;
  try { dims = imageSize(buf); } catch { throw new Error("undecodable"); }
  const minDim = Math.min(dims.width || 0, dims.height || 0);
  if (minDim < MIN_IMG_SIZE) throw new Error(`too small ${dims.width}x${dims.height}`);
  return { dataUri: `data:${ct};base64,${buf.toString("base64")}`, dims };
}

// Normalise puis retire uniquement le fond clair connecté aux bords.
//   - trim=30           → tolérance plus permissive : coupe les bords presque-blancs
//                         (chasse les halos JPG des merchant feeds)
//   - fit=contain + pad → on contient puis on rajoute 60px de blanc strict tout autour
//                         pour que le crop ne mange jamais le produit
//   - cbg/bg=ffffff     → fond blanc pur indispensable au mixBlendMode:multiply
//   - sharp=1           → re-sharpen léger après resize, packshot net en 1080p
//   - output=jpg/q=94   → JPEG quasi sans perte
//
// Résultat : packshot centré avec un canal alpha réel, sans rectangle blanc.
async function fetchStudioImage(rawUrl) {
  const stripped = rawUrl.replace(/^https?:\/\//, "");
  const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(stripped)}` +
    `&w=1500&h=1500&fit=contain&cbg=ffffff&bg=ffffff` +
    `&trim=30&pad=60&sharp=1&output=png&q=94`;
  const r = await fetch(wsrv, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*", Referer: "https://wsrv.nl/" },
  });
  if (!r.ok) throw new Error(`wsrv HTTP ${r.status}`);
  const raw = Buffer.from(await r.arrayBuffer());
  let buf;
  if (AI_CUTOUT) {
    // Détourage IA (u2net) : retire aussi sol, reflet et ombre du studio, sans cadre.
    try {
      buf = execFileSync("python3", [AI_CUTOUT_SCRIPT], { input: raw, maxBuffer: 64 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] });
      // Bords anti-crénelés du modèle : un peu plus de semi-transparence tolérée.
      assertCleanCutout(buf, { ...CUTOUT_LIMITS, maxSemiTransparentRatio: 0.06 });
    } catch (e) {
      console.warn(`   ⚠️ détourage IA refusé (${String(e.stderr || e.message).trim().slice(0, 120)}) → méthode classique`);
      buf = undefined;
    }
  }
  if (!buf) {
    buf = removeConnectedStudioBackground(padStudioMargin(raw));
    assertCleanCutout(buf);
  }
  let dims;
  try { dims = imageSize(buf); } catch { throw new Error("wsrv undecodable"); }
  return { dataUri: `data:image/png;base64,${buf.toString("base64")}`, dims };
}

async function imageToDataUri(url) {
  const candidates = [url];
  const direct = extractDirectImageUrl(url);
  if (direct) candidates.push(direct);

  // Version studio détourée uniquement (contrôle qualité strict conservé).
  // Les motifs de rejet sont journalisés : avant, ils étaient avalés et le job
  // échouait sans explication.
  const reasons = [];
  for (const c of candidates) {
    try {
      // qualité source minimale d'abord (évite d'upscaler un thumbnail)
      await fetchImage(c);
    } catch (e) {
      reasons.push(`source: ${e.message}`);
      continue;
    }
    try {
      const studio = await fetchStudioImage(c);
      return { dataUri: studio.dataUri, dims: studio.dims, source: "studio" };
    } catch (e) {
      reasons.push(`détourage: ${e.message}`);
    }
  }
  return { rejected: reasons.join(" | ") || "aucune source" };
}


const deals = [];
const manifest = []; // offres retenues, avec liens et prix source (contrôle avant publication)
const seenTitles = new Set();
const offerAudit = []; // contrôle des offres sur les sites marchands (écrit à côté de la vidéo)
let rejectedCount = 0;
for (const d of rawDeals) {
  if (deals.length >= 5) break;
  // Évite doublons exacts pour varier les modèles
  const key = `${d.brand}|${(d.title || "").slice(0, 40)}`;
  if (seenTitles.has(key)) continue;
  // Prix barré peu crédible (> 80 % de remise) : écarté d'office.
  if ((d.discount_percent ?? 0) > 80) {
    console.log(`   ⏭️  ${d.brand} ${d.title.slice(0, 40)} — remise de ${d.discount_percent} % jugée peu crédible`);
    offerAudit.push({ id: d.id, merchant: d.merchant, title: d.title, status: "remise-suspecte" });
    continue;
  }
  // Offre confirmée sur la page du marchand (prix identique, en stock) avant d'entrer dans la vidéo.
  const live = await checkLiveOffer({ productUrl: d.product_url, salePrice: Number(d.sale_price) });
  offerAudit.push({ id: d.id, merchant: d.merchant, title: d.title, feedPrice: d.sale_price, ...live });
  if (live.status !== "ok") {
    rejectedCount++;
    console.log(`   ⏭️  ${d.merchant} — ${d.title.slice(0, 40)} — ${live.status} (${live.detail})`);
    continue;
  }
  console.log(`   ✔︎ ${d.merchant} — ${d.title.slice(0, 40)} — ${live.detail}`);
  // Petit écart toléré (arrondis, variante de taille) : on affiche le prix de la page marchand.
  if (live.livePrice && Math.abs(live.livePrice - Number(d.sale_price)) >= 0.01) {
    d.sale_price = live.livePrice;
    if (d.original_price > d.sale_price) d.discount_percent = Math.round((1 - d.sale_price / d.original_price) * 100);
  }
  const result = await imageToDataUri(d.image_url);
  if (!result || result.rejected) {
    rejectedCount++;
    console.log(`   ⏭️  ${d.brand} — rejeté (${result?.rejected ?? "inconnu"})`);
    continue;
  }
  seenTitles.add(key);
  manifest.push({
    id: d.id, title: d.title, brand: d.brand, merchant: d.merchant,
    salePrice: d.sale_price, originalPrice: d.original_price, discountPercent: d.discount_percent,
    productUrl: d.product_url, affiliateUrl: d.affiliate_url,
  });
  deals.push({
    title: d.title,
    brand: d.brand,
    originalPrice: d.original_price,
    salePrice: d.sale_price,
    discountPercent: d.discount_percent,
    imageUrl: result.dataUri,
    category: displayCategory(d),
    currency: d.currency || "EUR",
    merchant: d.merchant,
    productUrl: "goldealsclub.com",
  });
  console.log(`   ✅ ${d.brand} — ${result.dims.width}×${result.dims.height} — ${d.title.slice(0, 45)} → ${d.sale_price}€ (-${d.discount_percent}%)`);
}

if (deals.length < 5) {
  console.error(`❌ Seulement ${deals.length} deals avec images HD (${rejectedCount} images rejetées sur ${rawDeals.length} candidats)`);
  process.exit(1);
}

const dataTs = `export interface Deal {
  title: string;
  brand: string;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  imageUrl: string;
  category: string;
  currency: string;
  merchant: string;
  productUrl: string;
}

export const deals: Deal[] = ${JSON.stringify(deals, null, 2)};

export const brandLogos: Record<string, string> = ${JSON.stringify(brandLogos, null, 2)};

export const edition = ${JSON.stringify(THEMES[THEME].label)};
`;
fs.writeFileSync(path.join(rootDir, "src/data.ts"), dataTs);
console.log("📝 src/data.ts mis à jour");

console.log("🎬 Rendu...");
const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition, openBrowser } = await import("@remotion/renderer");

const bundled = await bundle({
  entryPoint: path.resolve(rootDir, "src/index.ts"),
  webpackOverride: (config) => config,
});
const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});
const composition = await selectComposition({ serveUrl: bundled, id: `main-${STYLE_ID}`, puppeteerInstance: browser });

const date = new Date().toISOString().slice(0, 10);
const rawVideoPath = `/tmp/goldeals-${preset}-${STYLE_ID}-raw-${date}.mp4`;
const outputPath = `/mnt/documents/goldeals-tiktok-${preset}-${STYLE_ID}-${date}.mp4`;

// Légende prête à publier (Facebook automatique, copier-coller pour TikTok/Instagram).
{
  const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const lines = deals.map((d, i) => {
    const was = d.originalPrice && d.originalPrice > d.salePrice ? ` au lieu de ${fmt(d.originalPrice)}` : "";
    const pct = d.discountPercent ? ` (-${d.discountPercent} %)` : "";
    const name = d.title.toLowerCase().includes(String(d.brand || "").toLowerCase()) ? d.title : `${d.brand} ${d.title}`;
    const link = manifest[i]?.id ? `\n   👉 https://www.goldealsclub.com/deal/${encodeURIComponent(manifest[i].id)}` : "";
    return `${i + 1}. ${name} — ${fmt(d.salePrice)}${was}${pct}${link}`;
  });
  const tag = (b) => "#" + String(b || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const brandTags = [...new Set(deals.map((d) => tag(d.brand)).filter((t) => t.length > 2))];
  const caption = [
    `🔥 La sélection ${THEMES[THEME].label.toLowerCase()} du jour Goldeals Club`,
    "",
    ...lines,
    "",
    "📲 Sur Instagram les liens ne sont pas cliquables : retrouve chaque article sur goldealsclub.com",
    "👉 Toutes les promos mode & sneakers, vérifiées chaque matin : https://www.goldealsclub.com",
    "",
    [...new Set([...THEMES[THEME].hashtags, "#soldes", ...brandTags])].join(" "),
  ].join("\n");
  fs.writeFileSync(outputPath.replace(/\.mp4$/, ".txt"), caption);
  console.log("📝 Légende écrite :\n" + caption);
}

const layoutQA = []; // rempli par <LayoutQA /> pendant le rendu
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: rawVideoPath,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onBrowserLog: (log) => {
    if (log.text.startsWith("QA_LAYOUT ")) {
      try { layoutQA.push(JSON.parse(log.text.slice(10))); } catch { /* ligne illisible */ }
    }
  },
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (pct % 10 === 0) process.stdout.write(`\r🎞️  ${pct}%`);
  },
});
await browser.close({ silent: false });
console.log("\n✅ Vidéo rendue");

// Musique + bruitages calés sur le découpage réel de ce style.
try {
  mixAudio({ rawVideo: rawVideoPath, output: outputPath, style: STYLE_ID, audioDir: path.join(rootDir, "public/audio") });
  console.log("✅ Musique et bruitages ajoutés");
} catch (e) {
  // Sans musique, la vérification bloque la publication (vidéo muette refusée).
  console.error(`⚠️ Mixage audio échoué (${e.message}) : vidéo sans son`);
  fs.copyFileSync(rawVideoPath, outputPath);
}
try { fs.unlinkSync(rawVideoPath); } catch {}

const stats = fs.statSync(outputPath);
console.log(`\n🎉 ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
deals.forEach((d, i) => console.log(`   #${i + 1} ${d.brand} — ${d.title.slice(0, 50)} → ${d.salePrice}€ (-${d.discountPercent}%)`));

// Fichiers lus par verify-video.mjs avant toute publication.
fs.writeFileSync(outputPath.replace(/\.mp4$/, ".deals.json"), JSON.stringify(manifest, null, 2));
fs.writeFileSync(outputPath.replace(/\.mp4$/, ".offers-audit.json"), JSON.stringify(offerAudit, null, 2));
// Historique des produits montrés (évite de les remontrer les jours suivants).
saveHistory(HISTORY_DIR, STYLE_ID, today, manifest);
fs.writeFileSync(outputPath.replace(/\.mp4$/, ".layout.json"), JSON.stringify(layoutQA, null, 2));
console.log(`🧪 Contrôle de mise en page : ${layoutQA.length} instants mesurés`);
