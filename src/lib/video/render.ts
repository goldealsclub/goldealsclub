/**
 * Moteur de rendu vidéo partagé (Canvas + MediaRecorder).
 *
 * Extrait du flux de la page « Vidéo du jour » pour pouvoir être appelé
 * depuis la page de gestion des vidéos par style, sans dupliquer le dessin.
 */
import { supabase } from "@/integrations/supabase/client";
import { VIDEO_FONT_PRELOAD } from "@/lib/video-tokens";
import {
  applyBgPreset,
  drawSelectionFrame,
  getBrandLogo,
  loadImage,
  FPS,
  H,
  INTRO,
  MAX_TOTAL_SEC,
  OUTRO,
  PER_DEAL_SEC,
  W,
  type BgPreset,
  type Selection,
} from "@/pages/AdminVideoPage";

export type RenderOptions = {
  canvas: HTMLCanvasElement;
  selection: Selection;
  preset: BgPreset;
  briefDate: string;
  caption?: string;
  hashtags?: string;
  /** Style publié en base : adidas | zara | nike | … (par défaut le preset) */
  style?: string;
  onProgress?: (pct: number) => void;
  onStatus?: (message: string) => void;
};

export type RenderResult = {
  blob: Blob;
  objectUrl: string;
  durationSec: number;
  imagesLoaded: number;
  publicUrl: string;
  storagePath: string;
  rowId: string | null;
};

function pickMime() {
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) return "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) return "video/webm;codecs=vp8,opus";
  return "video/webm";
}

/** Génère la vidéo, l'envoie dans le stockage cloud et enregistre la ligne en base. */
export async function renderStyleVideo(opts: RenderOptions): Promise<RenderResult> {
  const { canvas, selection, preset, briefDate, onProgress, onStatus } = opts;
  const style = opts.style ?? preset;

  const n = selection.deals.length;
  const perDealSec = Math.min(PER_DEAL_SEC, (MAX_TOTAL_SEC - INTRO - OUTRO) / n);
  const totalSec = INTRO + n * perDealSec + OUTRO;

  // Réglages éditables du style (page /admin/styles) — facultatifs.
  let styleSettings: any = null;
  try {
    const { data } = await supabase
      .from("video_style_settings" as any)
      .select("*")
      .eq("style_id", style)
      .maybeSingle();
    styleSettings = data ?? null;
  } catch {}
  applyBgPreset(preset, styleSettings);

  onProgress?.(0);

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  try {
    await Promise.all(VIDEO_FONT_PRELOAD.map((f) => (document as any).fonts?.load(f)));
    await (document as any).fonts?.ready;
  } catch {}

  onStatus?.("Chargement des visuels…");
  const [imgs, logos] = await Promise.all([
    Promise.all(selection.deals.map((d) => loadImage(d.image_url))),
    Promise.all(selection.deals.map((d) => getBrandLogo(d.brand))),
  ]);
  const imagesLoaded = imgs.filter(Boolean).length;

  const totalFrames = Math.round(totalSec * FPS);
  const videoStream = (canvas as any).captureStream(0) as MediaStream;
  const videoTrack = videoStream.getVideoTracks()[0] as any;
  const canRequestFrame = typeof videoTrack?.requestFrame === "function";

  // ─── Musique lofi (facultative) ───
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx: AudioContext = new AC({ sampleRate: 48000 });
  if (audioCtx.state === "suspended") {
    try { await audioCtx.resume(); } catch {}
  }
  const dest = audioCtx.createMediaStreamDestination();
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  const lp = audioCtx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 8000;
  lp.Q.value = 0.4;
  lp.connect(masterGain);
  masterGain.connect(dest);

  let musicBuffer: AudioBuffer | null = null;
  const scheduledSources: AudioBufferSourceNode[] = [];

  try {
    onStatus?.("Génération de la musique…");
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lofi-music`;
    const apiKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        apikey: apiKey,
        Authorization: `Bearer ${session?.access_token ?? apiKey}`,
      },
      body: JSON.stringify({ duration_ms: Math.max(10_000, Math.round(totalSec * 1000)) }),
    });
    if (!res.ok) throw new Error(`Music HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 1024) throw new Error("Music payload too small");
    musicBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
      audioCtx.decodeAudioData(arrayBuf.slice(0), resolve, reject);
    });
  } catch (e) {
    console.warn("Musique indisponible", e);
  }

  const now0 = audioCtx.currentTime;
  const TARGET_VOL = 0.55;
  const FADE = 1.5;
  masterGain.gain.setValueAtTime(0, now0);
  masterGain.gain.linearRampToValueAtTime(TARGET_VOL, now0 + FADE);
  masterGain.gain.setValueAtTime(TARGET_VOL, now0 + Math.max(FADE, totalSec - FADE));
  masterGain.gain.linearRampToValueAtTime(0, now0 + totalSec);

  const startMusicLoop = () => {
    if (!musicBuffer) return;
    const dur = musicBuffer.duration;
    const CROSSFADE = Math.min(1.2, dur * 0.15);
    const cycle = Math.max(0.1, dur - CROSSFADE);
    let when = now0;
    const cycles = Math.ceil((totalSec + 1) / cycle) + 1;
    for (let i = 0; i < cycles; i++) {
      if (when > now0 + totalSec) break;
      const src = audioCtx.createBufferSource();
      src.buffer = musicBuffer;
      const g = audioCtx.createGain();
      if (i === 0) {
        g.gain.setValueAtTime(1, when);
      } else {
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(1, when + CROSSFADE);
      }
      const endAt = when + dur;
      g.gain.setValueAtTime(1, endAt - CROSSFADE);
      g.gain.linearRampToValueAtTime(0, endAt);
      src.connect(g);
      g.connect(lp);
      src.start(when);
      src.stop(endAt + 0.05);
      scheduledSources.push(src);
      when += cycle;
    }
  };

  const stream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 28_000_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  onStatus?.("Rendu en cours…");
  recorder.start();
  startMusicLoop();
  const start = performance.now();
  const nextRaf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  for (let f = 0; f < totalFrames; f++) {
    const t = f / FPS;
    drawSelectionFrame(ctx, t, selection, imgs, totalSec, logos, false, perDealSec);
    if (canRequestFrame) videoTrack.requestFrame();
    if ((f & 7) === 0) onProgress?.(Math.round((f / totalFrames) * 100));
    await nextRaf();
    const target = start + (f / FPS) * 1000;
    const now = performance.now();
    if (target > now) await new Promise((r) => setTimeout(r, target - now));
  }
  await new Promise((r) => setTimeout(r, 200));
  recorder.stop();

  const blob = await done;
  scheduledSources.forEach((s) => { try { s.stop(); } catch {} });
  try { await audioCtx.close(); } catch {}
  onProgress?.(100);

  onStatus?.("Envoi dans le cloud…");
  const storagePath = `styles/${style}/${briefDate}/${selection.category}-${Date.now()}.webm`;
  const { error: upErr } = await supabase.storage
    .from("tiktok-videos")
    .upload(storagePath, blob, { contentType: "video/webm", upsert: false });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("tiktok-videos").getPublicUrl(storagePath);

  const { data: row, error: insErr } = await supabase
    .from("generated_videos" as any)
    .insert({
      brief_date: briefDate,
      category: selection.category,
      label: selection.label,
      storage_path: storagePath,
      public_url: pub.publicUrl,
      caption: opts.caption ?? "",
      hashtags: opts.hashtags ?? "",
      size_bytes: blob.size,
      duration_sec: Math.round(totalSec),
      images_loaded: imagesLoaded,
      style,
      is_published: false,
    })
    .select("id")
    .maybeSingle();
  if (insErr) throw insErr;

  return {
    blob,
    objectUrl: URL.createObjectURL(blob),
    durationSec: Math.round(totalSec),
    imagesLoaded,
    publicUrl: pub.publicUrl,
    storagePath,
    rowId: (row as any)?.id ?? null,
  };
}
