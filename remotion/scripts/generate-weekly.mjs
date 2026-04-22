#!/usr/bin/env node
/**
 * Auto-generate daily TikTok video from live deals.
 * 
 * Usage:
 *   cd remotion && node scripts/generate-weekly.mjs
 * 
 * What it does:
 *   1. Fetches the top 5 deals from Supabase (best discount, premium brands)
 *   2. Writes them to src/data.ts
 *   3. Renders the video
 *   4. Mixes lofi music (starting at the drop) + subtle SFX
 *   5. Outputs final MP4 to /mnt/documents/
 * 
 * Env vars needed (auto-set in Lovable Cloud):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 * 
 * Requirements:
 *   - ffmpeg in PATH
 *   - remotion/public/audio/lofi-bg.mp3 (background music)
 *   - remotion/public/audio/whoosh.mp3 (transition SFX)
 *   - remotion/public/audio/ding.mp3 (deal reveal SFX)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// ── 1. Read env from the main project's .env ──
const envPath = path.resolve(rootDir, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^(\w+)=(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

// ── 2. Fetch top 5 deals ──
console.log("📡 Fetching top deals from database...");

const query = new URLSearchParams({
  select: "title,brand,merchant,original_price,sale_price,discount_percent,image_url,category,currency,product_url",
  order: "discount_percent.desc.nullslast",
  limit: "300",
  category: "eq.sneakers",
});

const localDealsPath = path.resolve(rootDir, "../public/deals.json");
let allDeals;
if (fs.existsSync(localDealsPath)) {
  console.log("📂 Reading deals from local public/deals.json");
  const payload = JSON.parse(fs.readFileSync(localDealsPath, "utf-8"));
  allDeals = Array.isArray(payload) ? payload : (payload.deals || []);
} else {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    console.error("Edge function fetch failed:", res.status, await res.text());
    process.exit(1);
  }
  const payload = await res.json();
  allDeals = Array.isArray(payload) ? payload : (payload.deals || []);
}
const allowedBrands = new Set(["Nike", "adidas", "Jordan", "New Balance", "Puma", "Reebok"]);

const rawDeals = allDeals
  .filter((d) => {
    const cat = (d.category || "").toLowerCase();
    return cat === "sneakers" &&
      d.image_url &&
      d.sale_price &&
      (d.discount_percent ?? 0) >= 40 &&
      allowedBrands.has(d.brand);
  })
  .sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0))
  .slice(0, 50);

console.log(`✅ Got ${rawDeals.length} sneakers deals (from ${allDeals.length} total)`);

if (rawDeals.length < 3) {
  console.error("Not enough deals found (need at least 3)");
  process.exit(1);
}

// ── 3. Write data.ts ──
// Use simple text-based SVG data URIs — Wikimedia blocks puppeteer requests
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

// Pre-download deal images as base64 data URIs (productserve.com blocks puppeteer)
console.log("🖼️  Downloading deal images...");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
async function imageToDataUri(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*,*/*" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = r.headers.get("content-type") || "image/jpeg";
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch (e) {
    console.warn(`   ⚠️  Failed to download ${url.slice(0, 80)}... (${e.message})`);
    return null;
  }
}

const deals = [];
for (const d of rawDeals) {
  if (deals.length >= 5) break;
  const dataUri = await imageToDataUri(d.image_url);
  if (!dataUri) {
    console.log(`   ⏭️  Skipping ${d.brand} — image unavailable`);
    continue;
  }
  deals.push({
    title: d.title,
    brand: d.brand,
    originalPrice: d.original_price,
    salePrice: d.sale_price,
    discountPercent: d.discount_percent,
    imageUrl: dataUri,
    category: d.category.charAt(0).toUpperCase() + d.category.slice(1),
    currency: d.currency || "EUR",
    merchant: d.merchant,
    productUrl: "goldealsclub.com",
  });
  console.log(`   ✅ ${d.brand} — ${d.title.slice(0, 50)}`);
}

if (deals.length < 5) {
  console.error(`❌ Only ${deals.length} deals with valid images — need 5`);
  process.exit(1);
}
console.log(`✅ ${deals.length} deals ready with embedded images`);

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
console.log("📝 Updated src/data.ts with fresh deals");

// ── 4. Render video (muted) ──
console.log("🎬 Starting render...");

const { bundle } = await import("@remotion/bundler");
const { renderMedia, selectComposition, openBrowser } = await import("@remotion/renderer");

const bundled = await bundle({
  entryPoint: path.resolve(rootDir, "src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: {
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "main",
  puppeteerInstance: browser,
});

const date = new Date().toISOString().slice(0, 10);
const rawVideoPath = `/tmp/goldeals-raw-${date}.mp4`;
const outputPath = `/mnt/documents/goldeals-tiktok-${date}.mp4`;

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
console.log("\n✅ Raw video rendered");

// ── 5. Mix audio: lofi music at drop + subtle SFX ──
console.log("🎵 Mixing audio...");

const audioDir = path.join(rootDir, "public/audio");
const lofiPath = path.join(audioDir, "lofi-bg.mp3");
const whooshPath = path.join(audioDir, "whoosh.mp3");
const dingPath = path.join(audioDir, "ding.mp3");

// Check if audio files exist
const hasAudio = fs.existsSync(lofiPath) && fs.existsSync(whooshPath) && fs.existsSync(dingPath);

if (hasAudio) {
  // Transition timestamps (seconds) — based on 30fps, 18-frame overlaps
  // Intro 80f → Deal1 at ~2.07s → Deal2 ~5.8s → Deal3 ~9.5s → Deal4 ~13.3s → Deal5 ~17s → Outro ~20.7s
  const transitions = [2070, 5800, 9500, 13300, 17000]; // whoosh times (ms)
  const reveals = [3000, 6800, 10500, 14300, 18000];     // ding times (ms)

  const whooshFilters = transitions.map((t, i) =>
    `[2:a]atrim=0:1.0,asetpts=PTS-STARTPTS,lowpass=f=3000,volume=0.4,adelay=${t}|${t}[w${i}]`
  );
  // Use asplit for ding since we need multiple copies
  const dingFilters = reveals.map((t, i) =>
    `[3:a]atrim=0:0.8,asetpts=PTS-STARTPTS,lowpass=f=4000,volume=0.3,adelay=${t}|${t}[d${i}]`
  );

  // Build the amix inputs list
  const mixInputs = ["[music]", ...transitions.map((_, i) => `[w${i}]`), ...reveals.map((_, i) => `[d${i}]`)];
  const totalInputs = mixInputs.length;

  // We need asplit for whoosh and ding since we reuse them
  const filterComplex = [
    // Music: start at drop (~9.3s into the track), trim to video length
    `[1:a]atrim=9.3:34.3,asetpts=PTS-STARTPTS,volume=0.55,afade=t=in:st=0:d=0.5,afade=t=out:st=22:d=3[music]`,
    // Whoosh: split into 5
    `[2:a]asplit=5${transitions.map((_, i) => `[wi${i}]`).join("")}`,
    ...transitions.map((t, i) =>
      `[wi${i}]atrim=0:1.0,asetpts=PTS-STARTPTS,lowpass=f=3000,volume=0.4,adelay=${t}|${t}[w${i}]`
    ),
    // Ding: split into 5
    `[3:a]asplit=5${reveals.map((_, i) => `[di${i}]`).join("")}`,
    ...reveals.map((t, i) =>
      `[di${i}]atrim=0:0.8,asetpts=PTS-STARTPTS,lowpass=f=4000,volume=0.3,adelay=${t}|${t}[d${i}]`
    ),
    // Mix all together
    `${mixInputs.join("")}amix=inputs=${totalInputs}:duration=first:normalize=0,volume=1.8,loudnorm=I=-14:TP=-1:LRA=11[audio]`,
  ].join(";\n    ");

  const ffmpegCmd = [
    "ffmpeg", "-y",
    "-i", rawVideoPath,
    "-i", lofiPath,
    "-stream_loop", "-1", "-i", whooshPath,
    "-stream_loop", "-1", "-i", dingPath,
    "-filter_complex", `"\n    ${filterComplex}\n  "`,
    "-map", "0:v", "-map", '"[audio]"',
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
    outputPath,
  ].join(" ");

  try {
    execSync(ffmpegCmd, { stdio: "inherit", shell: true });
    console.log("✅ Audio mixed successfully");
  } catch (e) {
    console.error("⚠️ Audio mixing failed, saving video without audio");
    fs.copyFileSync(rawVideoPath, outputPath);
  }
} else {
  console.log("⚠️ Audio files not found in public/audio/, saving video without audio");
  console.log("   Place lofi-bg.mp3, whoosh.mp3, and ding.mp3 in remotion/public/audio/");
  fs.copyFileSync(rawVideoPath, outputPath);
}

// Clean up raw video
try { fs.unlinkSync(rawVideoPath); } catch {}

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
console.log(`\n🎉 Video saved: ${outputPath} (${sizeMB} MB)`);
console.log(`📱 Deals featured:`);
deals.forEach((d, i) => console.log(`   #${i + 1} ${d.brand} — ${d.title} → ${d.salePrice}€ (-${d.discountPercent}%)`));
