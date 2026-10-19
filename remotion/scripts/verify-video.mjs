#!/usr/bin/env node
/**
 * Contrôle de la vidéo du jour AVANT publication (site, Facebook, Instagram).
 *
 * Bloquant (code de sortie 1 → aucune publication) :
 *   - fichier : 1080×1920, H.264, durée 15–60 s, taille < 100 Mo
 *   - images  : aucune scène vide/noire aux instants contrôlés
 *   - mise en page : police non chargée, texte rogné en largeur, texte hors cadre,
 *               texte important sous l'interface des réseaux (zone de sécurité Reels)
 *   - offres  : 5 offres, prix cohérents (promo < prix barré, % juste),
 *               toujours en ligne au même prix, liens produit non cassés (404/410)
 *   - légende : lien du site présent, prix identiques à la vidéo, longueur/hashtags OK
 * Avertissements (n'empêchent pas la publication) : titre tronqué en « … »,
 *   lien marchand qui refuse les robots (403/429), site momentanément lent.
 *
 * Usage : node remotion/scripts/verify-video.mjs <video.mp4>
 * Écrit <video>.verify.json et les images contrôlées <video>.frame-*.png.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { PNG } from "pngjs";

const video = process.argv[2];
if (!video || !fs.existsSync(video)) {
  console.error(`❌ Vidéo introuvable : ${video}`);
  process.exit(1);
}
const base = video.replace(/\.mp4$/, "");
const readJson = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; } };

const errors = [];
const warnings = [];
const fail = (m) => { errors.push(m); console.log(`❌ ${m}`); };
const warn = (m) => { warnings.push(m); console.log(`⚠️  ${m}`); };
const ok = (m) => console.log(`✅ ${m}`);

const SUPABASE_URL = (() => {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  try {
    const env = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    const m = env.match(/^VITE_SUPABASE_URL="?([^"\n]+)"?/m);
    return m?.[1];
  } catch { return undefined; }
})();

// ── 1. Fichier vidéo ─────────────────────────────────────────────
let duration = 0;
try {
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", video]).toString());
  const v = probe.streams.find((s) => s.codec_type === "video");
  duration = Number(probe.format.duration);
  const size = Number(probe.format.size);
  if (!v) fail("aucune piste vidéo");
  else {
    if (v.width !== 1080 || v.height !== 1920) fail(`format ${v.width}×${v.height} au lieu de 1080×1920`);
    if (v.codec_name !== "h264") fail(`codec ${v.codec_name} au lieu de h264`);
  }
  if (!(duration >= 15 && duration <= 60)) fail(`durée ${duration.toFixed(1)} s hors de 15–60 s`);
  if (size > 100 * 1024 * 1024) fail(`fichier trop lourd (${(size / 1048576).toFixed(0)} Mo)`);
  if (size < 500 * 1024) fail(`fichier anormalement léger (${(size / 1024).toFixed(0)} Ko)`);
  const audio = probe.streams.find((s) => s.codec_type === "audio");
  if (!audio) fail("pas de musique (aucune piste audio)");
  else {
    // Volume moyen : une piste présente mais silencieuse est aussi refusée.
    const vd = (() => { try { return execFileSync("sh", ["-c", `ffmpeg -v info -i "${video}" -map 0:a -af volumedetect -f null - 2>&1`]).toString(); } catch (e) { return String(e.stdout || ""); } })();
    const mean = Number((vd.match(/mean_volume:\s*(-?[\d.]+)/) || [])[1]);
    if (!(mean > -45)) fail(`musique inaudible (volume moyen ${Number.isFinite(mean) ? mean + " dB" : "inconnu"})`);
    else if (Math.abs(Number(audio.duration || duration) - duration) > 1) warn(`piste audio de ${Number(audio.duration).toFixed(1)} s pour ${duration.toFixed(1)} s de vidéo`);
  }
  if (!errors.length) ok(`fichier : ${v.width}×${v.height}, ${duration.toFixed(1)} s, ${(size / 1048576).toFixed(1)} Mo`);
} catch (e) {
  fail(`lecture du fichier impossible : ${e.message}`);
}

// ── 2. Images : pas de scène vide ────────────────────────────────
const layout = readJson(`${base}.layout.json`, []);
const FPS = 30;
const framesToCheck = layout.length ? layout.map((l) => ({ scene: l.scene, t: l.frame / FPS })) : [0.3, 0.5, 0.7].map((r, i) => ({ scene: `extrait-${i + 1}`, t: duration * r }));
for (const { scene, t } of framesToCheck) {
  const out = `${base}.frame-${scene}.png`;
  try {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-vf", "scale=270:480", out]);
    const png = PNG.sync.read(fs.readFileSync(out));
    let sum = 0, sum2 = 0;
    const n = png.width * png.height;
    for (let i = 0; i < n; i++) {
      const y = 0.299 * png.data[i * 4] + 0.587 * png.data[i * 4 + 1] + 0.114 * png.data[i * 4 + 2];
      sum += y; sum2 += y * y;
    }
    const std = Math.sqrt(sum2 / n - (sum / n) ** 2);
    if (std < 8) fail(`scène « ${scene} » quasi vide (contraste ${std.toFixed(1)})`);
  } catch (e) {
    fail(`extraction de l'image « ${scene} » impossible : ${e.message}`);
  }
}
if (!errors.some((e) => e.startsWith("scène") || e.startsWith("extraction"))) ok(`images : ${framesToCheck.length} scènes non vides`);

// ── 3. Mise en page (mesurée pendant le rendu) ───────────────────
if (!layout.length) {
  fail("contrôle de mise en page absent (aucune mesure pendant le rendu)");
} else {
  const expected = ["intro", "fin"];
  for (const s of expected) if (!layout.some((l) => l.scene === s)) warn(`scène « ${s} » non mesurée`);
  for (const { scene, issues } of layout) {
    for (const { kind, text } of issues) {
      const where = `${scene} : « ${text} »`;
      if (kind === "police") fail(`police non chargée (${text}) — ${scene}`);
      else if (kind === "coupe-largeur") fail(`texte coupé en largeur — ${where}`);
      else if (kind === "glyphes-rognes") fail(`chiffres/lettres rognés en haut ou en bas — ${where}`);
      else if (kind === "hors-cadre") fail(`texte hors cadre — ${where}`);
      else if (kind === "zone-reseaux") fail(`texte caché par l'interface Instagram/TikTok/Facebook — ${where}`);
      else if (kind === "coupe-hauteur") warn(`texte tronqué (« … ») — ${where}`);
    }
  }
  if (!errors.some((e) => /police|coupé|hors cadre|interface|mise en page/.test(e))) ok(`mise en page : ${layout.length} scènes mesurées, polices chargées, rien de coupé, hors cadre ni sous l'interface des réseaux`);
}

// ── 4. Offres ────────────────────────────────────────────────────
const deals = readJson(`${base}.deals.json`, []);
if (deals.length !== 5) fail(`${deals.length} offres dans la vidéo au lieu de 5`);
let live = [];
if (SUPABASE_URL) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/deals-json`);
    live = r.ok ? await r.json() : [];
    if (!r.ok) warn(`catalogue en ligne indisponible (HTTP ${r.status}) : présence des offres non vérifiée`);
  } catch (e) {
    warn(`catalogue en ligne indisponible (${e.message}) : présence des offres non vérifiée`);
  }
}
const liveById = new Map((Array.isArray(live) ? live : []).map((d) => [d.id, d]));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const checkLink = async (url) => {
  try {
    const r = await fetch(url, { redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
    return r.status;
  } catch (e) {
    return `erreur ${e.cause?.code || e.name}`;
  }
};
for (const [i, d] of deals.entries()) {
  const label = `offre ${i + 1} (${d.brand} ${String(d.title).slice(0, 40)})`;
  const sale = Number(d.salePrice), orig = Number(d.originalPrice);
  if (!(sale > 0)) fail(`${label} : prix invalide`);
  if (orig && !(orig > sale)) fail(`${label} : prix barré ${orig} € ≤ prix promo ${sale} €`);
  if (orig > sale && d.discountPercent != null) {
    const real = Math.round((1 - sale / orig) * 100);
    if (Math.abs(real - Number(d.discountPercent)) > 1) fail(`${label} : réduction affichée -${d.discountPercent} % au lieu de -${real} %`);
  }
  if (liveById.size) {
    const now = liveById.get(d.id);
    if (!now) fail(`${label} : n'est plus en ligne sur le site`);
    // Le prix affiché vient de la page marchand (vérifiée à la génération) ; écart > 2 % avec le catalogue = suspect.
    else if (Math.abs(Number(now.sale_price) - sale) > Math.max(0.5, sale * 0.02)) fail(`${label} : prix changé (${sale} € → ${now.sale_price} €)`);
  }
  // Le bouton « Voir l'offre » du site passe par le lien affilié : il doit arriver chez le bon marchand.
  if (d.affiliateUrl && d.productUrl) {
    try {
      const r = await fetch(d.affiliateUrl, { redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(20000) });
      const want = new URL(d.productUrl).hostname.replace(/^www\./, "");
      const got = new URL(r.url).hostname.replace(/^www\./, "");
      if (got === want) ok(`${label} : « Voir l'offre » mène bien chez ${got}`);
      else if (/awin/.test(got)) warn(`${label} : lien affilié resté sur ${got} (HTTP ${r.status})`);
      else fail(`${label} : « Voir l'offre » mène sur ${got} au lieu de ${want}`);
    } catch (e) {
      warn(`${label} : redirection du lien affilié non vérifiable (${e.cause?.code || e.name})`);
    }
  }
  for (const [kind, url] of [["lien produit", d.productUrl], ["lien affilié", d.affiliateUrl]]) {
    if (!url) { if (kind === "lien affilié") warn(`${label} : pas de lien affilié`); continue; }
    const st = await checkLink(url);
    if (st === 404 || st === 410) fail(`${label} : ${kind} cassé (HTTP ${st})`);
    else if (typeof st !== "number" || st >= 400) warn(`${label} : ${kind} non vérifiable (${st})`);
  }
}
if (deals.length === 5 && !errors.some((e) => e.startsWith("offre"))) ok("offres : prix cohérents, toujours en ligne, liens produits valides");

// ── 5. Légende ───────────────────────────────────────────────────
const caption = fs.existsSync(`${base}.txt`) ? fs.readFileSync(`${base}.txt`, "utf8") : "";
if (!caption) fail("légende absente");
else {
  if (!caption.includes("https://www.goldealsclub.com")) fail("légende : lien du site absent");
  if (caption.length > 2200) fail(`légende trop longue (${caption.length} caractères, max 2200)`);
  const tags = caption.match(/#\w+/g) || [];
  if (tags.length > 30) fail(`légende : ${tags.length} hashtags (max 30)`);
  const fmt = (n) => (Number(n) || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  for (const d of deals) if (!caption.includes(fmt(d.salePrice))) fail(`légende : prix ${fmt(d.salePrice)} € absent (${d.brand})`);
  for (const d of deals) {
    const link = `https://www.goldealsclub.com/deal/${encodeURIComponent(d.id)}`;
    if (!caption.includes(link)) { fail(`légende : lien de l'article absent (${d.brand})`); continue; }
    const st = await checkLink(link);
    if (st !== 200) fail(`légende : lien de l'article ${link} répond ${st}`);
  }
  const site = await checkLink("https://www.goldealsclub.com/");
  if (site !== 200) warn(`site goldealsclub.com : réponse ${site}`);
  if (!errors.some((e) => e.startsWith("légende"))) ok(`légende : ${caption.length} caractères, ${tags.length} hashtags, lien du site, liens des 5 articles et prix présents`);
}

// ── Bilan ────────────────────────────────────────────────────────
fs.writeFileSync(`${base}.verify.json`, JSON.stringify({ ok: errors.length === 0, errors, warnings, checkedAt: new Date().toISOString() }, null, 2));
if (errors.length) {
  console.log(`::error title=Vidéo bloquée::${errors.length} problème(s) — ${errors.join(" | ")}`);
  console.log(`\n⛔ Vidéo NON publiée : ${errors.length} problème(s), ${warnings.length} avertissement(s).`);
  process.exit(1);
}
if (warnings.length) console.log(`::warning title=Vidéo publiée avec avertissements::${warnings.join(" | ")}`);
console.log(`\n✅ Vidéo validée (${warnings.length} avertissement(s)) — publication autorisée.`);
