#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  assertCleanCutout,
  measureCutout,
  removeConnectedStudioBackground,
} from "./lib/studio-cutout.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptsDir, "..");
const qaDir = path.join(rootDir, "qa", "cutout");
const baselineDir = path.join(qaDir, "baseline");
const currentDir = path.join(qaDir, "current");
const diffDir = path.join(qaDir, "diff");
const reportPath = path.join(qaDir, "report.json");
const config = JSON.parse(fs.readFileSync(path.join(rootDir, "qa", "cutout-thresholds.json"), "utf8"));
const updateRequested = process.argv.includes("--update");

if (updateRequested && process.env.CUTOUT_BASELINE_APPROVED !== "YES") {
  throw new Error("Mise à jour refusée : définir CUTOUT_BASELINE_APPROVED=YES après validation visuelle.");
}

for (const dir of [baselineDir, currentDir, diffDir]) fs.mkdirSync(dir, { recursive: true });

const setPixel = (png, x, y, r, g, b, a = 255) => {
  const i = (y * png.width + x) * 4;
  png.data[i] = r; png.data[i + 1] = g; png.data[i + 2] = b; png.data[i + 3] = a;
};

function fixture(name) {
  const width = 320;
  const height = 320;
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const shade = name === "light-product" ? 250 : 247 + ((x + y) % 4);
      setPixel(png, x, y, shade, shade, shade - 1);
    }
  }
  for (let y = 82; y < 238; y++) {
    for (let x = 45; x < 275; x++) {
      const dx = (x - 160) / 118;
      const dy = (y - 160) / 78;
      if (dx * dx + dy * dy <= 1) {
        if (name === "light-product") setPixel(png, x, y, 203, 205, 198);
        else setPixel(png, x, y, 28 + (y % 18), 42, 52 + (x % 22));
      }
    }
  }
  return PNG.sync.write(png);
}

function injectBorder(buf) {
  const png = PNG.sync.read(buf);
  for (let x = 0; x < png.width; x++) setPixel(png, x, 0, 255, 255, 255, 255);
  return PNG.sync.write(png);
}

function injectHalo(buf) {
  const png = PNG.sync.read(buf);
  for (let y = 65; y < 255; y++) {
    for (let x = 28; x < 292; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] === 0 && ((x + y) % 2 === 0)) png.data[i + 3] = 110;
    }
  }
  return PNG.sync.write(png);
}

const cases = ["dark-product", "light-product"];
const report = { generatedAt: new Date().toISOString(), config, cases: [], guards: {}, regressions: 0 };

for (const name of cases) {
  const output = removeConnectedStudioBackground(fixture(name));
  const metrics = assertCleanCutout(output, config.limits);
  const currentPath = path.join(currentDir, `${name}.png`);
  const baselinePath = path.join(baselineDir, `${name}.png`);
  fs.writeFileSync(currentPath, output);
  if (updateRequested) fs.writeFileSync(baselinePath, output);
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Référence manquante : ${baselinePath}. Une validation explicite est requise.`);
  }
  const actual = PNG.sync.read(output);
  const expected = PNG.sync.read(fs.readFileSync(baselinePath));
  if (actual.width !== expected.width || actual.height !== expected.height) {
    throw new Error(`Dimensions modifiées pour ${name}`);
  }
  const diff = new PNG({ width: actual.width, height: actual.height });
  const changed = pixelmatch(expected.data, actual.data, diff.data, actual.width, actual.height, {
    threshold: config.pixelmatchThreshold,
    includeAA: true,
  });
  const diffPercent = changed / (actual.width * actual.height) * 100;
  const ok = diffPercent <= config.maxVisualDiffPercent;
  if (!ok) {
    report.regressions++;
    fs.writeFileSync(path.join(diffDir, `${name}-diff.png`), PNG.sync.write(diff));
  }
  report.cases.push({ name, ok, diffPercent: Number(diffPercent.toFixed(4)), metrics });
}

const clean = removeConnectedStudioBackground(fixture("dark-product"));
for (const [name, corrupted] of [["rectangle", injectBorder(clean)], ["halo", injectHalo(clean)]]) {
  let rejected = false;
  try { assertCleanCutout(corrupted, config.limits); } catch { rejected = true; }
  report.guards[name] = { rejected, metrics: measureCutout(corrupted) };
  if (!rejected) report.regressions++;
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Cutout QA: ${report.cases.length} références, protections rectangle/halo ${report.regressions ? "EN ÉCHEC" : "OK"}.`);
if (report.regressions) process.exit(1);