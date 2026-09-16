#!/usr/bin/env node
/**
 * Upload une vidéo rendue par Remotion dans le stockage cloud puis crée
 * la ligne correspondante dans `generated_videos`, publiée immédiatement
 * (ou à la date fournie).
 *
 * Variables requises : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage :
 *   node remotion/scripts/publish-video.mjs <fichier.mp4> --style=adidas \
 *        [--label="Top 5 du jour"] [--category=top] [--publish-at=ISO] [--draft]
 */
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = process.argv.slice(2);
const localPath = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
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

const bucket = "tiktok-videos";
const buffer = fs.readFileSync(localPath);
const remoteName = `styles/${style}/${briefDate}/${category}-${Date.now()}.mp4`;

const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${remoteName}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "video/mp4",
    "x-upsert": "true",
  },
  body: buffer,
});
if (!up.ok) {
  console.error(`❌ Upload échoué [${up.status}]`, await up.text());
  process.exit(1);
}

// Alias stable par style (pratique pour partager une URL fixe)
await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/latest-${style}.mp4`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "video/mp4",
    "x-upsert": "true",
  },
  body: buffer,
});

const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${remoteName}`;

const ins = await fetch(`${SUPABASE_URL}/rest/v1/generated_videos`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    brief_date: briefDate,
    category,
    label,
    storage_path: remoteName,
    public_url: publicUrl,
    size_bytes: buffer.length,
    style,
    is_published: isPublished,
    published_at: isPublished ? publishAt : null,
  }),
});
if (!ins.ok) {
  console.error(`❌ Enregistrement en base échoué [${ins.status}]`, await ins.text());
  process.exit(1);
}

console.log(`✅ ${path.basename(localPath)} → ${publicUrl}`);
console.log(`   style=${style} publiée=${isPublished} date=${publishAt}`);
