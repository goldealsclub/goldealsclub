#!/usr/bin/env node
/**
 * Régression visuelle — grille StylePreview (Adidas / Zara / Nike).
 *
 * Capture chaque grille rendue sur /admin/style-preview-qa à 3 largeurs
 * (desktop 900, tablet 600, mobile 360) et la compare au baseline png
 * via pixelmatch.
 *
 * Usage :
 *   node scripts/qa-style-preview.mjs                  # check vs baselines
 *   node scripts/qa-style-preview.mjs --update         # régénère les baselines
 *   node scripts/qa-style-preview.mjs --retries=2      # relance auto les scènes en échec
 *   node scripts/qa-style-preview.mjs --report         # écrit qa/style-preview/report.md
 *
 * Prérequis : `bun run dev` actif sur http://localhost:8080.
 * Seuil de tolérance : 0.15 % de pixels différents par scène.
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
const THRESHOLD = 0.0015;

const SCENES = [
  { id: "desktop", viewport: { width: 1280, height: 800 }, testid: "scene-desktop-grid" },
  { id: "tablet",  viewport: { width: 820,  height: 1180 }, testid: "scene-tablet-grid"  },
  { id: "mobile",  viewport: { width: 390,  height: 844  }, testid: "scene-mobile-grid"  },
];

const argv = process.argv.slice(2);
const update = argv.includes("--update");
const writeReport = argv.includes("--report") || process.env.CI === "true";
const retries = (() => {
  const a = argv.find((x) => x.startsWith("--retries="));
  if (a) return Math.max(0, parseInt(a.split("=")[1], 10) || 0);
  return process.env.CI === "true" ? 2 : 0;
})();

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
async function fileExists(f) { try { await fs.access(f); return true; } catch { return false; } }

async function captureScene(page, scene) {
  await page.setViewportSize(scene.viewport);
  await page.goto(`${URL}?scene=${scene.id}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const el = await page.waitForSelector(`[data-testid="${scene.testid}"]`, { timeout: 5000 });
  const tmp = path.join(ACTUAL_DIR, `${scene.id}.png`);
  await el.screenshot({ path: tmp });
  return tmp;
}

/**
 * Detecte les zones (bounding boxes) de différences à partir du buffer diff.
 * Découpe l'image en cellules de 32px et marque celles qui contiennent
 * suffisamment de pixels divergents, puis fusionne les cellules adjacentes
 * en clusters (flood-fill 4-connexité).
 */
function detectZones(diff, width, height) {
  const CELL = 32;
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const grid = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // pixelmatch marque les diffs en rouge intense
      if (diff[idx] > 200 && diff[idx + 1] < 100 && diff[idx + 2] < 100) {
        const c = Math.floor(x / CELL);
        const r = Math.floor(y / CELL);
        grid[r * cols + c]++;
      }
    }
  }
  const MIN_PX_PER_CELL = 4;
  const visited = new Uint8Array(cols * rows);
  const zones = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (visited[i] || grid[i] < MIN_PX_PER_CELL) continue;
      // BFS
      const queue = [[c, r]];
      visited[i] = 1;
      let x1 = c, y1 = r, x2 = c, y2 = r, count = 0;
      while (queue.length) {
        const [cc, rr] = queue.shift();
        count++;
        if (cc < x1) x1 = cc; if (cc > x2) x2 = cc;
        if (rr < y1) y1 = rr; if (rr > y2) y2 = rr;
        for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nc = cc + dc, nr = rr + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (!visited[ni] && grid[ni] >= MIN_PX_PER_CELL) {
            visited[ni] = 1;
            queue.push([nc, nr]);
          }
        }
      }
      zones.push({
        x: x1 * CELL,
        y: y1 * CELL,
        w: (x2 - x1 + 1) * CELL,
        h: (y2 - y1 + 1) * CELL,
        cells: count,
      });
    }
  }
  // Tri par taille décroissante, on garde les 5 plus grosses
  zones.sort((a, b) => b.cells - a.cells);
  return zones.slice(0, 5);
}

/** Surimprime les bounding boxes sur l'image diff pour le rapport. */
function annotateDiff(diff, width, height, zones) {
  const out = new PNG({ width, height });
  out.data.set(diff);
  const stroke = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const idx = (y * width + x) * 4;
    out.data[idx] = 255; out.data[idx + 1] = 215; out.data[idx + 2] = 0; out.data[idx + 3] = 255;
  };
  for (const z of zones) {
    for (let t = 0; t < 2; t++) {
      for (let x = z.x; x < z.x + z.w; x++) { stroke(x, z.y + t); stroke(x, z.y + z.h - 1 - t); }
      for (let y = z.y; y < z.y + z.h; y++) { stroke(z.x + t, y); stroke(z.x + z.w - 1 - t, y); }
    }
  }
  return out;
}

async function compareOrUpdate(scene, actualPath) {
  const baseFile = path.join(BASE_DIR, `${scene.id}.png`);
  if (update || !(await fileExists(baseFile))) {
    await fs.copyFile(actualPath, baseFile);
    console.log(`📌 baseline ${scene.id} écrite`);
    return { scene: scene.id, status: "baseline", diffPct: 0, zones: [] };
  }
  const baseline = await readPngAsync(baseFile);
  const actual = await readPngAsync(actualPath);
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    console.error(`❌ ${scene.id}: dimensions changed (baseline ${baseline.width}x${baseline.height} vs actual ${actual.width}x${actual.height})`);
    return { scene: scene.id, status: "size-mismatch", diffPct: 1, zones: [],
      baselineSize: [baseline.width, baseline.height], actualSize: [actual.width, actual.height] };
  }
  const diff = new PNG({ width: baseline.width, height: baseline.height });
  const diffPx = pixelmatch(
    baseline.data, actual.data, diff.data,
    baseline.width, baseline.height,
    { threshold: 0.1, includeAA: false },
  );
  const totalPx = baseline.width * baseline.height;
  const diffPct = diffPx / totalPx;
  const zones = diffPct > 0 ? detectZones(diff.data, baseline.width, baseline.height) : [];
  if (diffPct > THRESHOLD) {
    await writePng(path.join(DIFF_DIR, `${scene.id}.png`), diff);
    const annotated = annotateDiff(diff.data, baseline.width, baseline.height, zones);
    await writePng(path.join(DIFF_DIR, `${scene.id}-zones.png`), annotated);
    console.log(`❌ ${scene.id}: ${(diffPct * 100).toFixed(3)}% diff (seuil ${(THRESHOLD * 100).toFixed(2)}%) — ${zones.length} zone(s)`);
    return { scene: scene.id, status: "regression", diffPct, zones,
      size: [baseline.width, baseline.height] };
  }
  console.log(`✅ ${scene.id}: ${(diffPct * 100).toFixed(3)}% diff`);
  return { scene: scene.id, status: "ok", diffPct, zones: [] };
}

async function runOnce(page, scenes) {
  const results = [];
  for (const scene of scenes) {
    console.log(`\n📸 Capturing ${scene.id} (${scene.viewport.width}x${scene.viewport.height})`);
    const actualPath = await captureScene(page, scene);
    results.push(await compareOrUpdate(scene, actualPath));
  }
  return results;
}

function isFailure(r) { return r.status === "regression" || r.status === "size-mismatch"; }

async function buildMarkdownReport(finalResults, attempts) {
  const lines = [];
  lines.push("# StylePreview — Visual regression report");
  lines.push("");
  lines.push(`_Generated ${new Date().toISOString()} · threshold ${(THRESHOLD * 100).toFixed(2)}% · ${attempts} attempt(s)_`);
  lines.push("");
  lines.push("| Scene | Status | Diff % | Zones |");
  lines.push("| --- | --- | ---: | ---: |");
  for (const r of finalResults) {
    const icon = r.status === "ok" ? "✅" : r.status === "baseline" ? "📌" : "❌";
    lines.push(`| \`${r.scene}\` | ${icon} ${r.status} | ${(r.diffPct * 100).toFixed(3)} | ${r.zones?.length ?? 0} |`);
  }
  const failures = finalResults.filter(isFailure);
  if (failures.length) {
    lines.push("");
    lines.push("## Failed scenes");
    for (const r of failures) {
      lines.push("");
      lines.push(`### \`${r.scene}\` — ${(r.diffPct * 100).toFixed(3)}% diff`);
      if (r.status === "size-mismatch") {
        lines.push(`Dimensions baseline ${r.baselineSize?.join("x")} vs actual ${r.actualSize?.join("x")}.`);
        continue;
      }
      if (r.zones?.length) {
        lines.push("");
        lines.push("Diff zones (px):");
        lines.push("");
        lines.push("| # | x | y | width | height |");
        lines.push("| --: | --: | --: | --: | --: |");
        r.zones.forEach((z, i) => lines.push(`| ${i + 1} | ${z.x} | ${z.y} | ${z.w} | ${z.h} |`));
      }
      lines.push("");
      lines.push(`Artifacts: \`qa/style-preview/diff/${r.scene}.png\`, \`qa/style-preview/diff/${r.scene}-zones.png\`, \`qa/style-preview/actual/${r.scene}.png\`.`);
    }
  } else {
    lines.push("");
    lines.push("All scenes passed ✨");
  }
  const out = path.join(QA_DIR, "report.md");
  await fs.writeFile(out, lines.join("\n"));
  console.log(`\n📝 Markdown report: ${path.relative(ROOT, out)}`);
}

async function main() {
  await ensureServer();
  await ensureDirs();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let results = [];
  let attempts = 0;
  try {
    results = await runOnce(page, SCENES);
    attempts = 1;
    let failing = results.filter(isFailure);
    let attempt = 0;
    while (failing.length && attempt < retries) {
      attempt++;
      attempts++;
      console.log(`\n🔁 Retry ${attempt}/${retries} — recapturing ${failing.length} scene(s): ${failing.map((f) => f.scene).join(", ")}`);
      const retryScenes = SCENES.filter((s) => failing.some((f) => f.scene === s.id));
      const retried = await runOnce(page, retryScenes);
      // merge
      const byId = new Map(results.map((r) => [r.scene, r]));
      for (const r of retried) byId.set(r.scene, r);
      results = SCENES.map((s) => byId.get(s.id));
      failing = results.filter(isFailure);
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(
    path.join(QA_DIR, "report.json"),
    JSON.stringify({ at: new Date().toISOString(), threshold: THRESHOLD, attempts, results }, null, 2),
  );
  if (writeReport) await buildMarkdownReport(results, attempts);

  const regressions = results.filter(isFailure);
  if (regressions.length > 0) {
    console.error(`\n❌ ${regressions.length} régression(s) après ${attempts} tentative(s) — voir qa/style-preview/diff/ et report.md`);
    process.exit(1);
  }
  console.log(`\n✅ Style preview grids cohérentes sur ${SCENES.length} viewports (en ${attempts} tentative(s)).`);
}

main().catch((err) => { console.error(err); process.exit(1); });
