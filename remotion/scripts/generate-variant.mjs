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
import { execSync } from "child_process";
import { imageSize } from "image-size";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const preset = (process.argv[2] || "top").toLowerCase();
const validPresets = ["top", "nike", "budget", "adidas"];
if (!validPresets.includes(preset)) {
  console.error(`Preset invalide. Utiliser: ${validPresets.join(", ")}`);
  process.exit(1);
}

console.log(`🎬 Génération vidéo variant: ${preset.toUpperCase()}`);

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
let allDeals;
if (fs.existsSync(localDealsPath)) {
  const payload = JSON.parse(fs.readFileSync(localDealsPath, "utf-8"));
  allDeals = Array.isArray(payload) ? payload : (payload.deals || []);
} else {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  const payload = await res.json();
  allDeals = Array.isArray(payload) ? payload : (payload.deals || []);
}

const allowedBrands = new Set(["Nike", "adidas", "Jordan", "New Balance", "Puma", "Reebok", "Asics", "Converse", "Vans", "Salomon", "Mizuno", "Saucony", "Hoka", "Under Armour"]);

let rawDeals = allDeals.filter((d) => {
  const cat = (d.category || "").toLowerCase();
  return cat === "sneakers" && d.image_url && d.sale_price;
});

if (preset === "top") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 30 && allowedBrands.has(d.brand))
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
} else if (preset === "nike") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 25 && (d.brand === "Nike" || d.brand === "Jordan"))
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
} else if (preset === "adidas") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 25 && d.brand === "adidas")
    .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
} else if (preset === "budget") {
  rawDeals = rawDeals
    .filter((d) => (d.discount_percent ?? 0) >= 40 && allowedBrands.has(d.brand) && d.sale_price <= 80)
    .sort((a, b) => (a.sale_price || 999) - (b.sale_price || 999));
}

rawDeals = rawDeals.slice(0, 100);
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

// Normalise le packshot via wsrv.nl :
//   - trim=30           → tolérance plus permissive : coupe les bords presque-blancs
//                         (chasse les halos JPG des merchant feeds)
//   - fit=contain + pad → on contient puis on rajoute 60px de blanc strict tout autour
//                         pour que le crop ne mange jamais le produit
//   - cbg/bg=ffffff     → fond blanc pur indispensable au mixBlendMode:multiply
//   - sharp=1           → re-sharpen léger après resize, packshot net en 1080p
//   - output=jpg/q=94   → JPEG quasi sans perte
//
// Résultat : packshot toujours centré sur fond blanc strict, halos JPG des
// merchant feeds neutralisés, blend "multiply" invisible sur le stage ivoire.
async function fetchStudioImage(rawUrl) {
  const stripped = rawUrl.replace(/^https?:\/\//, "");
  const wsrv = `https://wsrv.nl/?url=${encodeURIComponent(stripped)}` +
    `&w=1500&h=1500&fit=contain&cbg=ffffff&bg=ffffff` +
    `&trim=30&pad=60&sharp=1&output=jpg&q=94`;
  const r = await fetch(wsrv, {
    headers: { "User-Agent": UA, Accept: "image/*,*/*", Referer: "https://wsrv.nl/" },
  });
  if (!r.ok) throw new Error(`wsrv HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let dims;
  try { dims = imageSize(buf); } catch { throw new Error("wsrv undecodable"); }
  return { dataUri: `data:image/jpeg;base64,${buf.toString("base64")}`, dims };
}

async function imageToDataUri(url) {
  const candidates = [url];
  const direct = extractDirectImageUrl(url);
  if (direct) candidates.push(direct);

  // 1) tente la version "studio" (wsrv trim + bg blanc) — meilleur rendu
  for (const c of candidates) {
    try {
      // qualité source minimale d'abord (évite d'upscaler un thumbnail)
      const probe = await fetchImage(c);
      try {
        const studio = await fetchStudioImage(c);
        return { dataUri: studio.dataUri, dims: studio.dims, source: "studio" };
      } catch {
        return { dataUri: probe.dataUri, dims: probe.dims, source: c === url ? "cdn" : "direct" };
      }
    } catch {}
  }
  return null;
}


const deals = [];
const seenTitles = new Set();
for (const d of rawDeals) {
  if (deals.length >= 5) break;
  // Évite doublons exacts pour varier les modèles
  const key = `${d.brand}|${(d.title || "").slice(0, 40)}`;
  if (seenTitles.has(key)) continue;
  const result = await imageToDataUri(d.image_url);
  if (!result) {
    console.log(`   ⏭️  ${d.brand} — pas d'image HD`);
    continue;
  }
  seenTitles.add(key);
  deals.push({
    title: d.title,
    brand: d.brand,
    originalPrice: d.original_price,
    salePrice: d.sale_price,
    discountPercent: d.discount_percent,
    imageUrl: result.dataUri,
    category: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    currency: d.currency || "EUR",
    merchant: d.merchant,
    productUrl: "goldealsclub.com",
  });
  console.log(`   ✅ ${d.brand} — ${result.dims.width}×${result.dims.height} — ${d.title.slice(0, 45)} → ${d.sale_price}€ (-${d.discount_percent}%)`);
}

if (deals.length < 5) {
  console.error(`❌ Seulement ${deals.length} deals avec images HD`);
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
const composition = await selectComposition({ serveUrl: bundled, id: "main", puppeteerInstance: browser });

const date = new Date().toISOString().slice(0, 10);
const rawVideoPath = `/tmp/goldeals-${preset}-raw-${date}.mp4`;
const outputPath = `/mnt/documents/goldeals-tiktok-${preset}-${date}.mp4`;

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: rawVideoPath,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (pct % 10 === 0) process.stdout.write(`\r🎞️  ${pct}%`);
  },
});
await browser.close({ silent: false });
console.log("\n✅ Vidéo rendue");

// Mix audio (identique à generate-weekly.mjs)
const audioDir = path.join(rootDir, "public/audio");
const lofiPath = path.join(audioDir, "lofi-bg.mp3");
const whooshPath = path.join(audioDir, "whoosh.mp3");
const dingPath = path.join(audioDir, "ding.mp3");
const hasAudio = fs.existsSync(lofiPath) && fs.existsSync(whooshPath) && fs.existsSync(dingPath);

if (hasAudio) {
  const transitions = [2070, 5800, 9500, 13300, 17000];
  const reveals = [3000, 6800, 10500, 14300, 18000];
  const mixInputs = ["[music]", ...transitions.map((_, i) => `[w${i}]`), ...reveals.map((_, i) => `[d${i}]`)];
  const filterComplex = [
    `[1:a]atrim=9.3:34.3,asetpts=PTS-STARTPTS,volume=0.55,afade=t=in:st=0:d=0.5,afade=t=out:st=22:d=3[music]`,
    `[2:a]asplit=5${transitions.map((_, i) => `[wi${i}]`).join("")}`,
    ...transitions.map((t, i) => `[wi${i}]atrim=0:1.0,asetpts=PTS-STARTPTS,lowpass=f=3000,volume=0.4,adelay=${t}|${t}[w${i}]`),
    `[3:a]asplit=5${reveals.map((_, i) => `[di${i}]`).join("")}`,
    ...reveals.map((t, i) => `[di${i}]atrim=0:0.8,asetpts=PTS-STARTPTS,lowpass=f=4000,volume=0.3,adelay=${t}|${t}[d${i}]`),
    `${mixInputs.join("")}amix=inputs=${mixInputs.length}:duration=first:normalize=0,volume=1.8,loudnorm=I=-14:TP=-1:LRA=11[audio]`,
  ].join(";\n    ");
  const ffmpegCmd = [
    "ffmpeg", "-y", "-i", rawVideoPath, "-i", lofiPath,
    "-stream_loop", "-1", "-i", whooshPath, "-stream_loop", "-1", "-i", dingPath,
    "-filter_complex", `"\n    ${filterComplex}\n  "`,
    "-map", "0:v", "-map", '"[audio]"',
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", outputPath,
  ].join(" ");
  try {
    execSync(ffmpegCmd, { stdio: "inherit", shell: true });
    console.log("✅ Audio mixé");
  } catch {
    console.error("⚠️ Mix audio échoué, copie sans audio");
    fs.copyFileSync(rawVideoPath, outputPath);
  }
} else {
  fs.copyFileSync(rawVideoPath, outputPath);
}
try { fs.unlinkSync(rawVideoPath); } catch {}

const stats = fs.statSync(outputPath);
console.log(`\n🎉 ${outputPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
deals.forEach((d, i) => console.log(`   #${i + 1} ${d.brand} — ${d.title.slice(0, 50)} → ${d.salePrice}€ (-${d.discountPercent}%)`));
