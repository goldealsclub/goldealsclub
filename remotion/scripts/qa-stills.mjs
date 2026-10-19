#!/usr/bin/env node
/**
 * Rendu d'images fixes aux instants contrôlés (intro, chaque offre, fin) pour
 * relecture visuelle, + mesures <LayoutQA />.
 * Usage : node scripts/qa-stills.mjs <style> <dossier-sortie> [--browser=chemin]
 */
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { bundle } from "@remotion/bundler";
import { selectComposition, renderStill, openBrowser } from "@remotion/renderer";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const style = process.argv[2] || "zara";
const outDir = process.argv[3] || "/tmp/qa-stills";
const browserArg = process.argv.find((a) => a.startsWith("--browser="));
fs.mkdirSync(outDir, { recursive: true });

const T = { adidas: 16, zara: 32, nike: 12 }[style];
const { deals } = await import(path.join(root, "src/data.ts")).catch(() => ({ deals: new Array(5) }));
const N = 5, INTRO = 80, DEAL = 130, OUTRO = 110;
const ds = (i) => INTRO - T + i * (DEAL - T);
const frames = [
  ["intro", INTRO - T - 5],
  ...Array.from({ length: N }, (_, i) => [`offre-${i + 1}`, ds(i) + DEAL - T - 8]),
  ["fin", ds(N) + OUTRO - 10],
];
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const browser = await openBrowser("chrome", browserArg
  ? { browserExecutable: browserArg.slice(10), chromeMode: "headless-shell", chromiumOptions: { args: ["--no-sandbox"] } }
  : { chromiumOptions: { args: ["--no-sandbox"] } });
const composition = await selectComposition({ serveUrl, id: `main-${style}`, puppeteerInstance: browser });
for (const [name, frame] of frames) {
  await renderStill({
    composition, serveUrl, frame, puppeteerInstance: browser,
    output: path.join(outDir, `${style}-${name}.png`),
    onBrowserLog: (l) => { if (l.text.startsWith("QA_")) console.log(l.text); },
  });
}
await browser.close({ silent: true });
void deals;
