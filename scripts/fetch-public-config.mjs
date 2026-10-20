#!/usr/bin/env node
/**
 * Récupère la clé publique (anon) du projet Supabase avant le build.
 *
 * Le workflow « Migration vers Supabase » dépose public-config.json (adresse +
 * clé anon, publique par nature) dans le stockage public du projet. Ce script le
 * lit et écrit .env.production.local, prioritaire sur .env pour Vite : la clé n'a
 * jamais besoin d'être copiée à la main dans le dépôt.
 *
 * Usage : node scripts/fetch-public-config.mjs            → écrit .env.production.local
 *         node scripts/fetch-public-config.mjs --github-env → ajoute à $GITHUB_ENV (CI)
 */
import fs from "fs";

const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const url = process.env.VITE_SUPABASE_URL || (env.match(/^VITE_SUPABASE_URL="?([^"\n]+)"?/m) || [])[1];
if (!url) { console.log("ℹ️  VITE_SUPABASE_URL absent : config publique non récupérée"); process.exit(0); }

let cfg;
try {
  const r = await fetch(`${url}/storage/v1/object/public/deals-snapshots/public-config.json`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  cfg = await r.json();
} catch (e) {
  console.log(`⚠️  config publique indisponible (${e.message}) : on garde le .env`);
  process.exit(0);
}
if (!cfg?.anonKey || !cfg?.url) { console.log("⚠️  config publique incomplète : on garde le .env"); process.exit(0); }

const lines = [
  `VITE_SUPABASE_URL="${cfg.url}"`,
  `VITE_SUPABASE_PUBLISHABLE_KEY="${cfg.anonKey}"`,
  `VITE_SUPABASE_PROJECT_ID="${cfg.projectRef || ""}"`,
];
if (process.argv.includes("--github-env") && process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, lines.map((l) => l.replace(/"/g, "")).join("\n") + "\n");
  console.log("✅ Config Supabase publique chargée dans l'environnement du job");
} else {
  fs.writeFileSync(".env.production.local", lines.join("\n") + "\n");
  fs.writeFileSync(".supabase-public.json", JSON.stringify(cfg));
  console.log(`✅ Config Supabase publique écrite (.env.production.local, projet ${cfg.projectRef || "?"})`);
}
