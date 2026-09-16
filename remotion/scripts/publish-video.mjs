#!/usr/bin/env node
/**
 * Publie une vidéo rendue par Remotion via l'Edge Function
 * `publish-generated-video` (URL d'upload signée + insertion en base).
 *
 * Variables requises :
 *   VIDEO_PUBLISH_TOKEN  — secret partagé avec l'Edge Function
 *   SUPABASE_URL ou VITE_SUPABASE_URL (sinon lu depuis le .env du repo)
 *
 * Usage :
 *   node remotion/scripts/publish-video.mjs <fichier.mp4> --style=adidas \
 *        [--label="Top 5 du jour"] [--category=top] [--publish-at=ISO] [--draft]
 */
import fs from "fs";
import path from "path";

// Lecture du .env du repo en secours (SUPABASE_URL non sensible)
const readEnvFile = () => {
  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch { /* pas de .env, tant pis */ }
};
readEnvFile();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const TOKEN = process.env.VIDEO_PUBLISH_TOKEN;

const args = process.argv.slice(2);
const localPath = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_URL manquant (env ou .env)");
  process.exit(1);
}
if (!TOKEN) {
  console.error("❌ VIDEO_PUBLISH_TOKEN manquant");
  process.exit(1);
}
if (!localPath || !fs.existsSync(localPath)) {
  console.error(`❌ Fichier introuvable : ${localPath}`);
  process.exit(1);
}

const style = flag("style", "adidas");
const category = flag("category", "top");
const label = flag("label", `Sélection du jour — ${style}`);
const briefDate = flag("date", new Date().toISOString().slice(0, 10));
const publishAt = flag("publish-at", new Date().toISOString());
const isPublished = !args.includes("--draft");

const buffer = fs.readFileSync(localPath);
const remoteName = `styles/${style}/${briefDate}/${category}-${Date.now()}.mp4`;
const FN = `${SUPABASE_URL}/functions/v1/publish-generated-video`;

const callFn = async (payload) => {
  const res = await fetch(FN, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-video-token": TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`❌ publish-generated-video [${res.status}]`, body);
    process.exit(1);
  }
  return body;
};

const upload = async (storagePath, upsert) => {
  const { signedUrl } = await callFn({ action: "sign", path: storagePath });
  // Les URL signées n'acceptent pas x-upsert : pour l'alias latest, on
  // tente l'upload ; si le fichier existe déjà, on le supprime d'abord via sign.
  const up = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", ...(upsert ? { "x-upsert": "true" } : {}) },
    body: buffer,
  });
  if (!up.ok) {
    console.error(`❌ Upload échoué [${up.status}]`, await up.text());
    process.exit(1);
  }
};

await upload(remoteName, false);
// Alias stable par style (URL fixe partageable) — non bloquant
try {
  await upload(`latest-${style}.mp4`, true);
} catch (e) {
  console.warn("⚠️ Alias latest ignoré :", e?.message ?? e);
}

const { video } = await callFn({
  action: "finalize",
  style,
  storage_path: remoteName,
  category,
  label,
  brief_date: briefDate,
  published_at: publishAt,
  is_published: isPublished,
  size_bytes: buffer.length,
});

console.log(`✅ ${path.basename(localPath)} → ${video?.public_url ?? remoteName}`);
console.log(`   style=${style} publiée=${isPublished} date=${publishAt}`);
