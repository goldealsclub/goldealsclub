#!/usr/bin/env node
/**
 * QA visuelle des scènes Remotion : génère des stills par scène et les
 * compare aux baselines pour repérer halos (diff visuel) et tremblement
 * (diff entre 2 frames consécutives en zone "settled").
 *
 * Usage :
 *   cd remotion && node scripts/qa-frames.mjs           → compare vs baseline
 *   cd remotion && node scripts/qa-frames.mjs --update  → écrit/écrase baseline
 *
 * Sortie :
 *   remotion/qa/current/<scene>-<frame>.png         (frames du run)
 *   remotion/qa/baseline/<scene>-<frame>.png        (référence versionnée)
 *   remotion/qa/diff/<scene>-<frame>.png            (pixels qui ont bougé)
 *   remotion/qa/report.json                          (résumé chiffré)
 *
 * Codes de sortie :
 *   0 → tout OK (baseline régénérée, ou diffs < seuils)
 *   2 → régression : diff visuel ou jitter au-dessus du seuil
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill, openBrowser } from "@remotion/renderer";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const qaDir = path.join(rootDir, "qa");
const baselineDir = path.join(qaDir, "baseline");
const currentDir = path.join(qaDir, "current");
const diffDir = path.join(qaDir, "diff");
for (const d of [qaDir, baselineDir, currentDir, diffDir]) {
  fs.mkdirSync(d, { recursive: true });
}

const UPDATE = process.argv.includes("--update");
// --scene=intro|deal|outro : restreint la QA à une seule scène
// (utilisé par la matrice GitHub Actions pour un check par scène)
const sceneArg = process.argv.find((a) => a.startsWith("--scene="));
const SCENE_FILTER = sceneArg ? sceneArg.split("=")[1] : null;
// --report=path : écrit le rapport JSON à un chemin custom (sinon qa/report.json)
const reportArg = process.argv.find((a) => a.startsWith("--report="));
const REPORT_PATH = reportArg ? reportArg.split("=")[1] : null;

// ── Seuils ────────────────────────────────────────────────────────────
// Diff visuel scène vs baseline : > 2 % des pixels = halo / régression layout.
const VISUAL_DIFF_THRESHOLD_PCT = 2.0;
// Jitter : 2 frames consécutives en zone settled doivent être quasi-identiques.
// > 0.15 % de pixels différents = tremblement résiduel.
const JITTER_THRESHOLD_PCT = 0.15;
// Sensibilité pixelmatch (0 = strict, 1 = laxiste). 0.1 = par défaut.
const PIXELMATCH_THRESHOLD = 0.1;

// ── Plan de capture ───────────────────────────────────────────────────
// Pour chaque scène :
//   - "entry"   : pendant l'animation d'entrée (utile pour visual diff)
//   - "settled" : tout est posé, c'est ici qu'on traque les halos
//   - "settledNext" : settled + 1 frame, sert au test de tremblement
//   - "exit"    : juste avant la transition
const PLAN = [
  { id: "qa-intro", name: "intro",
    frames: { entry: 25, settled: 70, settledNext: 71, exit: 88 } },
  { id: "qa-deal", name: "deal",
    frames: { entry: 40, settled: 100, settledNext: 101, exit: 135 } },
  { id: "qa-outro", name: "outro",
    frames: { entry: 30, settled: 95, settledNext: 96, exit: 125 } },
];

// ── Helpers ───────────────────────────────────────────────────────────
const readPng = (p) => PNG.sync.read(fs.readFileSync(p));

function diffPngs(aPath, bPath, outPath) {
  const a = readPng(aPath);
  const b = readPng(bPath);
  if (a.width !== b.width || a.height !== b.height) {
    return { pct: 100, mismatch: a.width * a.height, total: a.width * a.height, sizeMismatch: true };
  }
  const diff = new PNG({ width: a.width, height: a.height });
  const mismatch = pixelmatch(
    a.data, b.data, diff.data, a.width, a.height,
    { threshold: PIXELMATCH_THRESHOLD, includeAA: false, alpha: 0.3 }
  );
  if (outPath) fs.writeFileSync(outPath, PNG.sync.write(diff));
  const total = a.width * a.height;
  return { pct: (mismatch / total) * 100, mismatch, total, sizeMismatch: false };
}

// ── Bundle Remotion une seule fois ────────────────────────────────────
console.log("🔧 Bundle Remotion...");
const serveUrl = await bundle({
  entryPoint: path.resolve(rootDir, "src/index.ts"),
  webpackOverride: (c) => c,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const report = {
  generatedAt: new Date().toISOString(),
  mode: UPDATE ? "update-baseline" : "compare",
  thresholds: {
    visualDiffPct: VISUAL_DIFF_THRESHOLD_PCT,
    jitterPct: JITTER_THRESHOLD_PCT,
    pixelmatch: PIXELMATCH_THRESHOLD,
  },
  scenes: [],
};
let regressions = 0;

const scenesToRun = SCENE_FILTER
  ? PLAN.filter((s) => s.name === SCENE_FILTER)
  : PLAN;
if (SCENE_FILTER && scenesToRun.length === 0) {
  console.error(`❌ Scène inconnue: ${SCENE_FILTER}. Valides: ${PLAN.map(p => p.name).join(", ")}`);
  process.exit(1);
}
report.sceneFilter = SCENE_FILTER;



for (const scene of scenesToRun) {
  console.log(`\n🎬 ${scene.name} (${scene.id})`);
  const composition = await selectComposition({
    serveUrl, id: scene.id, puppeteerInstance: browser,
  });

  const sceneReport = { name: scene.name, captures: {}, jitter: null, visual: {} };

  for (const [label, frame] of Object.entries(scene.frames)) {
    const file = `${scene.name}-${label}-f${frame}.png`;
    const outPath = path.join(currentDir, file);
    await renderStill({
      composition, serveUrl, frame,
      output: outPath, puppeteerInstance: browser,
    });
    sceneReport.captures[label] = { frame, file };
    process.stdout.write(`   📸 ${label} (f${frame})\n`);
  }

  // ── Test #1 : tremblement (settled vs settled+1) ─────────────────
  const settled = path.join(currentDir, sceneReport.captures.settled.file);
  const settledNext = path.join(currentDir, sceneReport.captures.settledNext.file);
  const jitterDiff = diffPngs(settled, settledNext,
    path.join(diffDir, `${scene.name}-jitter.png`));
  sceneReport.jitter = {
    diffPct: +jitterDiff.pct.toFixed(4),
    threshold: JITTER_THRESHOLD_PCT,
    ok: jitterDiff.pct <= JITTER_THRESHOLD_PCT,
  };
  const jitterMark = sceneReport.jitter.ok ? "✅" : "❌";
  console.log(`   ${jitterMark} jitter : ${sceneReport.jitter.diffPct}% (seuil ${JITTER_THRESHOLD_PCT}%)`);
  if (!sceneReport.jitter.ok) regressions++;

  // ── Test #2 : diff visuel vs baseline (halos, drift layout) ──────
  for (const label of ["entry", "settled", "exit"]) {
    const file = sceneReport.captures[label].file;
    const cur = path.join(currentDir, file);
    const base = path.join(baselineDir, file);
    if (UPDATE || !fs.existsSync(base)) {
      fs.copyFileSync(cur, base);
      sceneReport.visual[label] = { status: "baseline-written", diffPct: 0 };
      console.log(`   📌 baseline ${label} écrite`);
      continue;
    }
    const d = diffPngs(cur, base, path.join(diffDir, `${scene.name}-${label}-diff.png`));
    const ok = d.pct <= VISUAL_DIFF_THRESHOLD_PCT;
    sceneReport.visual[label] = {
      diffPct: +d.pct.toFixed(4),
      threshold: VISUAL_DIFF_THRESHOLD_PCT,
      ok, sizeMismatch: d.sizeMismatch,
    };
    const mark = ok ? "✅" : "❌";
    console.log(`   ${mark} visual ${label} : ${sceneReport.visual[label].diffPct}% vs baseline`);
    if (!ok) regressions++;
  }

  report.scenes.push(sceneReport);
}

await browser.close({ silent: false });

report.regressions = regressions;
const reportOut = REPORT_PATH
  ? path.resolve(rootDir, REPORT_PATH)
  : path.join(qaDir, "report.json");
fs.mkdirSync(path.dirname(reportOut), { recursive: true });
fs.writeFileSync(reportOut, JSON.stringify(report, null, 2));

console.log(`\n📊 Rapport : ${path.relative(rootDir, path.join(qaDir, "report.json"))}`);
if (UPDATE) {
  console.log("✅ Baselines mises à jour.");
  process.exit(0);
}
if (regressions > 0) {
  console.log(`\n❌ ${regressions} régression(s) détectée(s) — voir qa/diff/`);
  process.exit(2);
}
console.log("✅ Aucune régression visuelle ni tremblement.");
