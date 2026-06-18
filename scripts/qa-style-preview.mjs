#!/usr/bin/env node
/**
 * Régression visuelle — grille StylePreview (Adidas / Zara / Nike).
 *
 * Capture chaque grille rendue sur /admin/style-preview-qa à 3 largeurs
 * (desktop 900, tablet 600, mobile 360) et la compare au baseline png
 * via pixelmatch. Le but : garantir que les 3 styles gardent une grille
 * cohérente sur toutes les viewports — pas de débordement, pas de
 * collision typographique entre Adidas / Zara / Nike.
 *
 * Usage :
 *   node scripts/qa-style-preview.mjs           # check vs baselines
 *   node scripts/qa-style-preview.mjs --update  # régénère les baselines
 *
 * Prérequis : `bun run dev` actif sur http://localhost:8080
 * (le script vérifie la disponibilité avant de lancer le browser).
 *
 * Seuil de tolérance : 0.15 % de pixels différents par scène, identique
 * à celui des QA Remotion (cohérence d'approche).
 */
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const QA_DIR = path.join(ROOT, "qa/style-preview");
const BASE_DIR = path.join(QA_DIR, "baseline");
const ACTUAL_DIR = path.join(QA_DIR, "actual");
const DIFF_DIR = path.join(QA_DIR, "diff");

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:8080";
const URL = `${BASE_URL}/admin/style-preview-qa`;
const THRESHOLD = 0.0015; // 0.15 % de pixels différents max

const SCENES = [
  { id: "desktop", viewport: { width: 1280, height: 800 }, testid: "scene-desktop-grid" },
  { id: "tablet",  viewport: { width: 820,  height: 1180 }, testid: "scene-tablet-grid"  },
  { id: "mobile",  viewport: { width: 390,  height: 844  }, testid: "scene-mobile-grid"  },
];

const update = process.argv.includes("--update");

async function ensureServer() {
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    if (!res.ok && res.status !== 404) throw new Error(`status ${res.status}`);
  } catch (err) {
    console.error(`❌ Dev server not reachable at ${BASE_URL} — start it with 'bun run dev'`);
    console.error(`   ${err.message}`);
    process.exit(1);
  }
}

async function ensureDirs() {
  for (const d of [BASE_DIR, ACTUAL_DIR, DIFF_DIR]) {
    await fs.mkdir(d, { recursive: true });
  }
}

async function readPngAsync(file) {
  const buf = await fs.readFile(file);
  return PNG.sync.read(buf);
}

async function writePng(file, png) {
  await fs.writeFile(file, PNG.sync.write(png));
}

async function captureScene(page, scene) {
  await page.setViewportSize(scene.viewport);
  await page.goto(URL, { waitUntil: "networkidle" });
  // Laisse les fonts régler avant la capture (sinon FOUT entre 2 runs)
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const el = await page.waitForSelector(`[data-testid="${scene.testid}"]`, { timeout: 5000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`Could not locate ${scene.testid}`);
  const tmp = path.join(ACTUAL_DIR, `${scene.id}.png`);
  await page.screenshot({
    path: tmp,
    clip: {
      x: Math.floor(box.x),
      y: Math.floor(box.y),
      width: Math.ceil(box.width),
      height: Math.ceil(box.height),
    },
  });
  return tmp;
}

async function compareOrUpdate(scene, actualPath) {
  const baseFile = path.join(BASE_DIR, `${scene.id}.png`);
  if (update || !(await fileExists(baseFile))) {
    await fs.copyFile(actualPath, baseFile);
    console.log(`📌 baseline ${scene.id} écrite`);
    return { scene: scene.id, status: "baseline", diffPct: 0 };
  }
  const baseline = await readPngAsync(baseFile);
  const actual = await readPngAsync(actualPath);
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    console.error(`❌ ${scene.id}: dimensions changed (baseline ${baseline.width}x${baseline.height} vs actual ${actual.width}x${actual.height})`);
    return { scene: scene.id, status: "size-mismatch", diffPct: 1 };
  }
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPx = pixelmatch(
    baseline.data, actual.data, diff.data,
    baseline.width, baseline.height,
    { threshold: 0.1, includeAA: false },
  );
  const totalPx = baseline.width * baseline.height;
  const diffPct = diffPx / totalPx;
  if (diffPct > THRESHOLD) {
    await writePng(path.join(DIFF_DIR, `${scene.id}.png`), diff);
    console.log(`❌ ${scene.id}: ${(diffPct * 100).toFixed(3)}% diff (seuil ${(THRESHOLD * 100).toFixed(2)}%)`);
    return { scene: scene.id, status: "regression", diffPct };
  }
  console.log(`✅ ${scene.id}: ${(diffPct * 100).toFixed(3)}% diff`);
  return { scene: scene.id, status: "ok", diffPct };
}

async function fileExists(f) {
  try { await fs.access(f); return true; } catch { return false; }
}

async function main() {
  await ensureServer();
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  try {
    for (const scene of SCENES) {
      console.log(`\n📸 Capturing ${scene.id} (${scene.viewport.width}x${scene.viewport.height})`);
      const actualPath = await captureScene(page, scene);
      const r = await compareOrUpdate(scene, actualPath);
      results.push(r);
    }
  } finally {
    await browser.close();
  }
  await fs.writeFile(
    path.join(QA_DIR, "report.json"),
    JSON.stringify({ at: new Date().toISOString(), threshold: THRESHOLD, results }, null, 2),
  );
  const regressions = results.filter((r) => r.status === "regression" || r.status === "size-mismatch");
  if (regressions.length > 0) {
    console.error(`\n❌ ${regressions.length} régression(s) visuelle(s) — voir qa/style-preview/diff/`);
    process.exit(1);
  }
  console.log(`\n✅ Style preview grids cohérentes sur ${SCENES.length} viewports.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
