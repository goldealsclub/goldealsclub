#!/usr/bin/env node
/**
 * Publie la vidéo du jour en Reel sur la page Facebook ET sur le compte
 * Instagram professionnel relié à cette page (API Graph de Meta).
 *
 * Secrets GitHub :
 *   FB_PAGE_ID     — identifiant numérique de la page Facebook
 *   FB_PAGE_TOKEN  — jeton d'accès de PAGE, autorisations :
 *                    pages_manage_posts, pages_read_engagement, pages_show_list,
 *                    instagram_basic, instagram_content_publish
 *   IG_USER_ID     — (facultatif) compte Instagram ; sinon lu depuis la page.
 * Sans FB_PAGE_ID / FB_PAGE_TOKEN, le script ne fait rien (sortie 0).
 *
 * Une seule vidéo par jour : le style publié tourne (adidas → zara → nike).
 * Un échec sur un réseau n'empêche ni l'autre réseau ni la publication sur le site.
 *
 * Usage : node remotion/scripts/publish-social.mjs <video.mp4> --style=adidas [--force] [--only=facebook|instagram]
 */
import fs from "fs";

const GRAPH = "v23.0";
const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_TOKEN;
const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--"));
const style = (args.find((a) => a.startsWith("--style=")) || "--style=adidas").slice(8);
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7);
const force = args.includes("--force");

const warn = (title, msg) => console.log(`::warning title=${title}::${msg}`);

if (!PAGE_ID || !TOKEN) {
  console.log("ℹ️  FB_PAGE_ID / FB_PAGE_TOKEN absents : publication Facebook/Instagram désactivée.");
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
  console.log(`ℹ️  Style du jour pour les réseaux : ${todayStyle} (pas ${style}) — rien à publier.`);
  process.exit(0);
}

const captionPath = video.replace(/\.mp4$/, ".txt");
const caption = fs.existsSync(captionPath)
  ? fs.readFileSync(captionPath, "utf8")
  : "🔥 La sélection du jour Goldeals Club 👉 https://www.goldealsclub.com";

const api = async (method, pathAndQuery, params) => {
  const url = `https://graph.facebook.com/${GRAPH}/${pathAndQuery}`;
  const init = method === "GET"
    ? { method }
    : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...params, access_token: TOKEN }) };
  const full = method === "GET" ? `${url}${url.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(TOKEN)}` : url;
  const r = await fetch(full, init);
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) throw new Error(`${pathAndQuery.split("?")[0]} → ${JSON.stringify(data.error || data)}`);
  return data;
};

async function publishFacebook() {
  const { video_id } = await api("POST", `${PAGE_ID}/video_reels`, { upload_phase: "start" });
  const buf = fs.readFileSync(video);
  const up = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH}/${video_id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${TOKEN}`, offset: "0", file_size: String(buf.length) },
    body: buf,
  });
  const upData = await up.json().catch(() => ({}));
  if (!up.ok || !upData.success) throw new Error(`upload → ${JSON.stringify(upData)}`);
  await api("POST", `${PAGE_ID}/video_reels`, { upload_phase: "finish", video_id, video_state: "PUBLISHED", description: caption });
  console.log(`✅ Facebook : Reel publié (${style}).`);
}

async function publishInstagram() {
  const urlFile = `${video}.url`;
  if (!fs.existsSync(urlFile)) throw new Error("URL publique de la vidéo introuvable (publication site échouée ?)");
  const videoUrl = fs.readFileSync(urlFile, "utf8").trim();

  let igId = process.env.IG_USER_ID;
  if (!igId) {
    const page = await api("GET", `${PAGE_ID}?fields=instagram_business_account`);
    igId = page.instagram_business_account?.id;
  }
  if (!igId) throw new Error("aucun compte Instagram professionnel relié à la page Facebook");

  // Les liens ne sont pas cliquables dans une légende Instagram.
  const igCaption = caption.replace(/https?:\/\/www\.goldealsclub\.com/g, "goldealsclub.com (lien en bio)");
  const { id: creationId } = await api("POST", `${igId}/media`, {
    media_type: "REELS", video_url: videoUrl, caption: igCaption, share_to_feed: true,
  });

  // Instagram télécharge et encode la vidéo : on attend qu'elle soit prête (max ~6 min).
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    const { status_code } = await api("GET", `${creationId}?fields=status_code`);
    if (status_code === "FINISHED") {
      await api("POST", `${igId}/media_publish`, { creation_id: creationId });
      console.log(`✅ Instagram : Reel publié (${style}).`);
      return;
    }
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new Error(`traitement Instagram : ${status_code}`);
  }
  throw new Error("traitement Instagram trop long (> 6 min)");
}

const failures = [];
for (const [name, fn] of [["Facebook", publishFacebook], ["Instagram", publishInstagram]]) {
  if (only && only !== name.toLowerCase()) continue;
  try {
    await fn();
  } catch (e) {
    failures.push(name);
    const expired = /expired|code":190|OAuthException/i.test(e.message);
    console.log(`::error title=${name}::Publication ${name} échouée${expired ? " — JETON META EXPIRÉ : régénérer FB_PAGE_TOKEN (jeton de page permanent)" : ""} : ${e.message}`);
  }
}
// Échec visible (croix rouge + e-mail GitHub) au lieu d'un simple avertissement.
if (failures.length) process.exit(1);
