#!/usr/bin/env node
/**
 * Auto-generate weekly TikTok video from live deals in DB.
 * 
 * Usage:
 *   cd remotion && node scripts/generate-weekly.mjs
 * 
 * What it does:
 *   1. Fetches the top 5 deals from Supabase (best discount, premium brands)
 *   2. Writes them to src/data.ts
 *   3. Renders the video to /mnt/documents/
 * 
 * Env vars needed (auto-set in Lovable Cloud):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// ── 1. Read env from the main project's .env ──
const envPath = path.resolve(rootDir, "../.env");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^(\w+)=(.*)$/);
  if (match) env[match[1]] = match[2];
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
  order: "discount_percent.desc",
  limit: "5",
  discount_percent: "gte.40",
  image_url: "not.is.null",
  sale_price: "not.is.null",
  category: "in.(sneakers,hoodies,vestes,t-shirts,pantalons)",
  brand: "in.(Nike,adidas,Jordan,New Balance,Puma,Reebok)",
});

const res = await fetch(`${SUPABASE_URL}/rest/v1/deals?${query}`, {
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  },
});

if (!res.ok) {
  console.error("DB fetch failed:", res.status, await res.text());
  process.exit(1);
}

const rawDeals = await res.json();
console.log(`✅ Got ${rawDeals.length} deals`);

if (rawDeals.length < 3) {
  console.error("Not enough deals found (need at least 3)");
  process.exit(1);
}

// ── 3. Write data.ts ──
const brandLogos = {
  Nike: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
  adidas: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
  Jordan: "https://upload.wikimedia.org/wikipedia/en/3/37/Jumpman_logo.svg",
  "New Balance": "https://upload.wikimedia.org/wikipedia/commons/e/ea/New_Balance_logo.svg",
  Puma: "https://upload.wikimedia.org/wikipedia/commons/d/da/Puma_complete_logo.svg",
  Reebok: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Reebok_2019_logo.svg",
};

const deals = rawDeals.map((d) => ({
  title: d.title,
  brand: d.brand,
  originalPrice: d.original_price,
  salePrice: d.sale_price,
  discountPercent: d.discount_percent,
  imageUrl: d.image_url,
  category: d.category.charAt(0).toUpperCase() + d.category.slice(1),
  currency: d.currency || "EUR",
  merchant: d.merchant,
  productUrl: "goldealsclub.lovable.app",
}));

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

// ── 4. Render video ──
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
const outputPath = `/mnt/documents/goldeals-tiktok-${date}.mp4`;

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: outputPath,
  puppeteerInstance: browser,
  muted: true,
  concurrency: 1,
  onProgress: ({ progress }) => {
    const pct = Math.round(progress * 100);
    if (pct % 10 === 0) process.stdout.write(`\r🎞️  ${pct}%`);
  },
});

await browser.close({ silent: false });

const stats = fs.statSync(outputPath);
const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
console.log(`\n✅ Video saved: ${outputPath} (${sizeMB} MB)`);
console.log(`📱 Deals featured:`);
deals.forEach((d, i) => console.log(`   #${i + 1} ${d.brand} — ${d.title} → ${d.salePrice}€ (-${d.discountPercent}%)`));
