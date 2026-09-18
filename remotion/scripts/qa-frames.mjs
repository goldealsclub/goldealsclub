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

const UPDATE = process.argv.includes("--update");
if (UPDATE && process.env.VISUAL_BASELINE_APPROVED !== "YES") {
  throw new Error("Mise à jour refusée : définir VISUAL_BASELINE_APPROVED=YES après validation visuelle.");
}
const getArg = (name) => {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split("=").slice(1).join("=") : null;
};
// --scene=intro|deal|outro : restreint la QA à une seule scène
const SCENE_FILTER = getArg("scene");
// --style=adidas|zara|nike : QA d'une direction artistique (défaut adidas)
const STYLE_ID = getArg("style") ?? "adidas";
const VALID_STYLES = ["adidas", "zara", "nike"];
if (!VALID_STYLES.includes(STYLE_ID)) {
  console.error(`❌ Style inconnu: ${STYLE_ID}. Valides: ${VALID_STYLES.join(", ")}`);
  process.exit(1);
}
// --report=path : écrit le rapport JSON à un chemin custom
const REPORT_PATH = getArg("report");
// --config=path : fichier JSON de seuils (défaut: qa/thresholds.json)
const CONFIG_PATH = getArg("config") ?? path.join(qaDir, "thresholds.json");

// Baselines / current / diff isolés par style → switcher Zara ne
// casse pas la baseline Adidas, et inversement.
const baselineDir = path.join(qaDir, "baseline", STYLE_ID);
const currentDir  = path.join(qaDir, "current",  STYLE_ID);
const diffDir     = path.join(qaDir, "diff",     STYLE_ID);
for (const d of [qaDir, baselineDir, currentDir, diffDir]) {
  fs.mkdirSync(d, { recursive: true });
}

// ── Seuils : config JSON + surcharges CLI/env ────────────────────────
// Priorité (du + faible au + fort) :
//   1) qa/thresholds.json (defaults + per-scene)
//   2) env globaux        : QA_PIXELMATCH, QA_JITTER, QA_VISUAL
//   3) env par scène      : QA_JITTER_<SCENE>, QA_VISUAL_<SCENE>
//   4) env par phase      : QA_VISUAL_<SCENE>_<PHASE>   (PHASE = ENTRY|SETTLED|EXIT)
//   5) flags CLI          : --jitter=, --visual=, --pixelmatch=
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
let configFile = {};
if (fs.existsSync(CONFIG_PATH)) {
  try { configFile = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")); }
  catch (e) { console.warn(`⚠️ Config illisible (${CONFIG_PATH}): ${e.message}`); }
} else {
  console.warn(`⚠️ Pas de fichier de seuils à ${CONFIG_PATH}, valeurs par défaut.`);
}
const CLI_JITTER = num(getArg("jitter"));
const CLI_VISUAL = num(getArg("visual"));
const CLI_PIXELMATCH = num(getArg("pixelmatch"));

const PIXELMATCH_THRESHOLD =
  CLI_PIXELMATCH ?? num(process.env.QA_PIXELMATCH) ?? num(configFile.pixelmatch) ?? 0.1;

const defaultJitter =
  num(process.env.QA_JITTER) ?? num(configFile?.defaults?.jitter) ?? 0.15;
const defaultVisual = {
  entry:   num(configFile?.defaults?.visual?.entry)   ?? num(process.env.QA_VISUAL) ?? 2.0,
  settled: num(configFile?.defaults?.visual?.settled) ?? num(process.env.QA_VISUAL) ?? 2.0,
  exit:    num(configFile?.defaults?.visual?.exit)    ?? num(process.env.QA_VISUAL) ?? 2.0,
};
if (num(process.env.QA_VISUAL) !== null) {
  for (const k of ["entry", "settled", "exit"]) defaultVisual[k] = num(process.env.QA_VISUAL);
}

function resolveThresholds(sceneName) {
  const sceneCfg = configFile?.scenes?.[sceneName] ?? {};
  const upper = sceneName.toUpperCase();
  const jitter =
    CLI_JITTER ??
    num(process.env[`QA_JITTER_${upper}`]) ??
    num(sceneCfg.jitter) ??
    defaultJitter;
  const visualScene =
    num(process.env[`QA_VISUAL_${upper}`]) ??
    (CLI_VISUAL !== null ? CLI_VISUAL : null);
  const visual = {};
  for (const phase of ["entry", "settled", "exit"]) {
    visual[phase] =
      num(process.env[`QA_VISUAL_${upper}_${phase.toUpperCase()}`]) ??
      visualScene ??
      num(sceneCfg?.visual?.[phase]) ??
      defaultVisual[phase];
  }
  return { jitter, visual };
}

// ── Plan de capture ───────────────────────────────────────────────────
// Frames calées sur les durées MainVideo (intro 80 / deal 130 / outro 110).
// Les compositions Remotion sont suffixées par le style.
const PLAN = [
  { id: `qa-intro-${STYLE_ID}`, name: "intro",
    frames: { entry: 22, settled: 60, settledNext: 61, exit: 78 } },
  { id: `qa-deal-${STYLE_ID}`, name: "deal",
    frames: { entry: 35, settled: 90, settledNext: 91, exit: 125 } },
  { id: `qa-outro-${STYLE_ID}`, name: "outro",
    frames: { entry: 28, settled: 80, settledNext: 81, exit: 105 } },
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
  styleId: STYLE_ID,
  configPath: path.relative(rootDir, CONFIG_PATH),
  thresholds: {
    pixelmatch: PIXELMATCH_THRESHOLD,
    defaults: { jitter: defaultJitter, visual: defaultVisual },
    perScene: {},
  },
  scenes: [],
};
let regressions = 0;

console.log(`\n🎨 Style QA : ${STYLE_ID}`);

const scenesToRun = SCENE_FILTER
  ? PLAN.filter((s) => s.name === SCENE_FILTER)
  : PLAN;
if (SCENE_FILTER && scenesToRun.length === 0) {
  console.error(`❌ Scène inconnue: ${SCENE_FILTER}. Valides: ${PLAN.map(p => p.name).join(", ")}`);
  process.exit(1);
}
report.sceneFilter = SCENE_FILTER;

for (const scene of scenesToRun) {
  const T = resolveThresholds(scene.name);
  report.thresholds.perScene[scene.name] = T;
  console.log(`\n🎬 ${scene.name} (${scene.id}) — seuils jitter=${T.jitter}% visual=${T.visual.entry}/${T.visual.settled}/${T.visual.exit}%`);
  const composition = await selectComposition({
    serveUrl, id: scene.id, puppeteerInstance: browser,
  });

  const sceneReport = { name: scene.name, captures: {}, jitter: null, visual: {}, thresholds: T };

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
    threshold: T.jitter,
    ok: jitterDiff.pct <= T.jitter,
  };
  const jitterMark = sceneReport.jitter.ok ? "✅" : "❌";
  console.log(`   ${jitterMark} jitter : ${sceneReport.jitter.diffPct}% (seuil ${T.jitter}%)`);
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
    const threshold = T.visual[label];
    const d = diffPngs(cur, base, path.join(diffDir, `${scene.name}-${label}-diff.png`));
    const ok = d.pct <= threshold;
    sceneReport.visual[label] = {
      diffPct: +d.pct.toFixed(4),
      threshold,
      ok, sizeMismatch: d.sizeMismatch,
    };
    const mark = ok ? "✅" : "❌";
    console.log(`   ${mark} visual ${label} : ${sceneReport.visual[label].diffPct}% vs baseline (seuil ${threshold}%)`);
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

console.log(`\n📊 Rapport : ${path.relative(rootDir, reportOut)}`);
if (UPDATE) {
  console.log("✅ Baselines mises à jour.");
  process.exit(0);
}
if (regressions > 0) {
  console.log(`\n❌ ${regressions} régression(s) détectée(s) — voir qa/diff/`);
  process.exit(2);
}
console.log("✅ Aucune régression visuelle ni tremblement.");
