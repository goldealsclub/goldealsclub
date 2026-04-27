#!/usr/bin/env node
/**
 * Upload the generated TikTok video to Supabase Storage (public bucket).
 *
 * Required env vars (set as GitHub Actions secrets):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node remotion/scripts/upload-to-storage.mjs <local-video-path>
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

const date = new Date().toISOString().slice(0, 10);
const fileName = `goldeals-tiktok-${date}.mp4`;
const bucket = "tiktok-videos";

const buffer = fs.readFileSync(localPath);
console.log(`📤 Uploading ${(buffer.length / 1024 / 1024).toFixed(1)} MB to ${bucket}/${fileName}...`);

const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`;
const res = await fetch(uploadUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "video/mp4",
    "x-upsert": "true",
  },
  body: buffer,
});

if (!res.ok) {
  console.error(`❌ Upload failed [${res.status}]:`, await res.text());
  process.exit(1);
}

// Also upload as "latest.mp4" for stable URL
const latestRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/latest.mp4`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "video/mp4",
    "x-upsert": "true",
  },
  body: buffer,
});
if (!latestRes.ok) {
  console.warn(`⚠️  latest.mp4 upload failed [${latestRes.status}]:`, await latestRes.text());
}

const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
const latestUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/latest.mp4`;
console.log(`✅ Uploaded!`);
console.log(`📎 Dated URL  : ${publicUrl}`);
console.log(`📎 Latest URL : ${latestUrl}`);
