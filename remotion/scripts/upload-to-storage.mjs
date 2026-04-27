#!/usr/bin/env node
/**
 * Upload the generated TikTok video to Supabase Storage (public bucket).
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node remotion/scripts/upload-to-storage.mjs <local-video-path>
 *
 * Le nom du fichier doit suivre `goldeals-tiktok-YYYY-MM-DD-<theme>.mp4`.
 * Upload :
 *   - <bucket>/goldeals-tiktok-YYYY-MM-DD-<theme>.mp4  (archive datée)
 *   - <bucket>/latest-<theme>.mp4                       (URL stable par thème)
 *   - <bucket>/latest.mp4                               (URL stable globale = dernier upload)
 */

import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localPath = process.argv[2];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!localPath || !fs.existsSync(localPath)) {
  console.error(`❌ Video file not found: ${localPath}`);
  process.exit(1);
}

const bucket = "tiktok-videos";
const fileName = path.basename(localPath);
// Extract theme from filename: goldeals-tiktok-YYYY-MM-DD-<theme>.mp4
const themeMatch = fileName.match(/-(\d{4}-\d{2}-\d{2})-([a-z]+)\.mp4$/);
const theme = themeMatch?.[2] || "default";

const buffer = fs.readFileSync(localPath);
const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);

async function upload(remoteName) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${remoteName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "video/mp4",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Upload failed for ${remoteName} [${res.status}]:`, body);
    return false;
  }
  console.log(`📎 ${SUPABASE_URL}/storage/v1/object/public/${bucket}/${remoteName}`);
  return true;
}

console.log(`📤 Uploading ${sizeMb} MB → bucket="${bucket}" theme="${theme}"`);
const ok1 = await upload(fileName);
const ok2 = await upload(`latest-${theme}.mp4`);
const ok3 = await upload("latest.mp4");

if (!(ok1 && ok2 && ok3)) process.exit(1);
console.log(`✅ Uploaded all 3 variants`);
