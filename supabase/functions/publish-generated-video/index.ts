// Endpoint sécurisé pour publier une vidéo générée (GitHub Actions).
// Auth : header `x-video-token` === VIDEO_PUBLISH_TOKEN (secret partagé).
// Deux actions :
//   { action: "sign", path }     → URL d'upload signée dans le bucket tiktok-videos
//   { action: "finalize", ... }  → insère la ligne generated_videos
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-video-token",
};

const BUCKET = "tiktok-videos";
const STYLES = ["adidas", "zara", "nike"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("VIDEO_PUBLISH_TOKEN");
  if (!expected) return json({ error: "server_not_configured" }, 500);
  const token = req.headers.get("x-video-token") ?? "";
  if (token !== expected) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (body.action === "sign") {
    const path = String(body.path ?? "");
    // N'autorise que des chemins styles/<style>/... ou latest-<style>.mp4
    const ok =
      /^styles\/(adidas|zara|nike)\/[a-zA-Z0-9/_\-.]+\.mp4$/.test(path) ||
      /^latest-(adidas|zara|nike)\.mp4$/.test(path);
    if (!ok) return json({ error: "invalid_path" }, 400);

    const upsert = body.upsert === true;
    if (upsert) {
      // Les URLs signées "upload" acceptent le remplacement d'un objet existant.
      const signed = await supabase.storage
        .from(BUCKET)
        .createUploadSignedUrl(path, { upsert: true });
      if (!signed.error && signed.data) {
        return json({
          path,
          signedUrl: signed.data.signedUrl,
          token: signed.data.token,
        });
      }
      // Secours : on supprime l'ancien objet avant de renégocier une URL.
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) return json({ error: "sign_failed", details: error.message }, 500);
    return json({ path: data.path, signedUrl: data.signedUrl, token: data.token });
  }

  if (body.action === "finalize") {
    const style = String(body.style ?? "");
    const storagePath = String(body.storage_path ?? "");
    if (!STYLES.includes(style)) return json({ error: "invalid_style" }, 400);
    if (!/^styles\/(adidas|zara|nike)\/[a-zA-Z0-9/_\-.]+\.mp4$/.test(storagePath)) {
      return json({ error: "invalid_path" }, 400);
    }
    const isPublished = body.is_published !== false;
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const row = {
      brief_date: String(body.brief_date ?? new Date().toISOString().slice(0, 10)),
      category: String(body.category ?? "top"),
      label: String(body.label ?? `Sélection du jour — ${style}`),
      storage_path: storagePath,
      public_url: pub.publicUrl,
      size_bytes: Number(body.size_bytes ?? 0),
      style,
      is_published: isPublished,
      published_at: isPublished ? String(body.published_at ?? new Date().toISOString()) : null,
    };
    const { data, error } = await supabase
      .from("generated_videos")
      .insert(row)
      .select()
      .single();
    if (error) return json({ error: "insert_failed", details: error.message }, 500);
    return json({ ok: true, video: data });
  }

  return json({ error: "unknown_action" }, 400);
});
