#!/usr/bin/env node
/**
 * Publie la vidéo du jour en Reel sur la page Facebook Goldeals Club
 * (API Graph « video_reels » : start → upload binaire → finish).
 *
 * Variables (secrets GitHub) :
 *   FB_PAGE_ID     — identifiant numérique de la page
 *   FB_PAGE_TOKEN  — jeton d'accès de PAGE (pages_manage_posts, pages_read_engagement)
 * Sans ces deux secrets, le script ne fait rien (sortie 0) : la publication
 * Facebook est simplement désactivée.
 *
 * Une seule vidéo par jour : le style publié tourne (adidas → zara → nike).
 *
 * Usage : node remotion/scripts/publish-facebook.mjs <video.mp4> --style=adidas [--force]
 */
import fs from "fs";

const GRAPH = "v23.0";
const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_TOKEN;
const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--"));
const style = (args.find((a) => a.startsWith("--style=")) || "--style=adidas").slice(8);
const force = args.includes("--force");

if (!PAGE_ID || !TOKEN) {
  console.log("ℹ️  FB_PAGE_ID / FB_PAGE_TOKEN absents : publication Facebook désactivée.");
  process.exit(0);
}
if (!video || !fs.existsSync(video)) {
  console.error(`❌ Vidéo introuvable : ${video}`);
  process.exit(1);
}

const STYLES = ["adidas", "zara", "nike"];
const dayOfYear = Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86400000);
const todayStyle = STYLES[dayOfYear % STYLES.length];
if (!force && style !== todayStyle) {
  console.log(`ℹ️  Style du jour pour Facebook : ${todayStyle} (pas ${style}) — rien à publier.`);
  process.exit(0);
}

const captionPath = video.replace(/\.mp4$/, ".txt");
const description = fs.existsSync(captionPath)
  ? fs.readFileSync(captionPath, "utf8")
  : "🔥 La sélection du jour Goldeals Club 👉 https://www.goldealsclub.com";

const graph = async (params) => {
  const r = await fetch(`https://graph.facebook.com/${GRAPH}/${PAGE_ID}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, access_token: TOKEN }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`${params.upload_phase}: ${JSON.stringify(data.error || data)}`);
  return data;
};

try {
  const { video_id } = await graph({ upload_phase: "start" });
  console.log(`📤 Reel ${video_id} : envoi du fichier…`);

  const buf = fs.readFileSync(video);
  const up = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH}/${video_id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${TOKEN}`, offset: "0", file_size: String(buf.length) },
    body: buf,
  });
  const upData = await up.json().catch(() => ({}));
  if (!up.ok || !upData.success) throw new Error(`upload: ${JSON.stringify(upData)}`);

  await graph({ upload_phase: "finish", video_id, video_state: "PUBLISHED", description });
  console.log(`✅ Reel publié sur la page Facebook (${style}).`);
} catch (e) {
  // Un échec Facebook ne doit pas faire échouer la vidéo du site.
  console.log(`::warning title=Facebook::Publication Facebook échouée : ${e.message}`);
  process.exit(0);
}
