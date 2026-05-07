import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, RefreshCw, ArrowLeft, Swords, Share2, Trash2, Cloud, History } from "lucide-react";
import VideoHistory from "@/components/admin/VideoHistory";

type Deal = {
  id: string;
  title: string;
  brand: string;
  merchant: string;
  sale_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string;
  image_url: string;
  url: string;
};

type Battle = {
  type: "battle";
  category: string;
  label: string;
  a: Deal;
  b: Deal;
};

type Brief = {
  brief_date: string;
  focus_brand: string;
  deals: Battle[];
  caption: string;
  hashtags: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const TOTAL_SEC = 15;
const INTRO = 1.8;
const OUTRO = 2.2;

// Palette premium GOLDEALS
const NOIR = "#111111";
const IVOIRE = "#f6f0e9";
const PHOTO_BG = "#eaecf0";
const TAUPE = "#45403a";
const GOLD = "#c9a870";
const FLAME = "#FF6B35";

// Proxy CORS via edge function (bypass anti-hotlink productserve, etc.)
const PROXY_BASE = `https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/image-proxy`;
function proxify(src: string): string {
  if (!src) return src;
  return `${PROXY_BASE}?url=${encodeURIComponent(src)}`;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const tryLoad = (url: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  // 1) edge proxy en premier (bypass hotlink + CORS garanti)
  const viaProxy = await tryLoad(proxify(src));
  if (viaProxy) return viaProxy;
  // 2) fallback direct
  return tryLoad(src);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = FLAME;
  ctx.beginPath();
  ctx.moveTo(12, 23);
  ctx.bezierCurveTo(16.5, 23, 20, 19.5, 20, 15);
  ctx.bezierCurveTo(20, 11, 17, 8.5, 15.5, 7.5);
  ctx.bezierCurveTo(15.5, 9, 14.5, 11, 13, 12);
  ctx.bezierCurveTo(13, 10, 12.5, 7.5, 10, 5);
  ctx.bezierCurveTo(9.5, 7.5, 8, 9, 6.5, 11);
  ctx.bezierCurveTo(5.5, 12.5, 4, 14, 4, 16);
  ctx.bezierCurveTo(4, 19.5, 7.5, 23, 12, 23);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  scale = 1,
) {
  const ratio = Math.min(w / img.width, h / img.height) * scale;
  const iw = img.width * ratio;
  const ih = img.height * ratio;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function drawTopBar(ctx: CanvasRenderingContext2D, label: string) {
  const barH = 110;
  ctx.fillStyle = NOIR;
  ctx.fillRect(0, 0, W, barH);
  // Logo G
  ctx.fillStyle = IVOIRE;
  roundRect(ctx, 36, (barH - 50) / 2, 50, 50, 10);
  ctx.fill();
  ctx.fillStyle = NOIR;
  ctx.font = "700 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("G", 36 + 25, barH / 2 + 1);
  // Wordmark
  ctx.fillStyle = IVOIRE;
  ctx.font = "800 22px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  (ctx as any).letterSpacing = "3px";
  ctx.fillText("GOLDEALS CLUB", 100, barH / 2 + 1);
  // Battle label
  ctx.fillStyle = GOLD;
  ctx.font = "800 22px 'Inter',sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(label.toUpperCase(), W - 36, barH / 2 + 1);
  ctx.textBaseline = "alphabetic";
}

function drawPremiumPlaceholder(
  ctx: CanvasRenderingContext2D,
  deal: Deal,
  category: string,
  x: number, y: number, w: number, h: number,
  reveal: number,
  time = 0, // secondes — pour animation continue (halo + parallax)
) {
  // Hash deterministe pour varier les teintes par deal
  let hash = 0;
  const seed = (deal.id || deal.brand || "x") + category;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = hash % 360;

  // Phase d'animation propre à ce deal
  const phase = (hash % 1000) / 1000;
  const breathe = (Math.sin((time * 1.4 + phase) * Math.PI * 2) + 1) / 2; // 0..1
  const drift = Math.sin((time * 0.6 + phase) * Math.PI * 2);             // -1..1
  const parallaxX = drift * 14;
  const parallaxY = Math.cos((time * 0.55 + phase) * Math.PI * 2) * 10;

  // Fond éditorial : dégradé diagonal sombre teinté or
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `hsl(${hue}, 14%, 12%)`);
  grad.addColorStop(0.55, `hsl(${(hue + 20) % 360}, 18%, 18%)`);
  grad.addColorStop(1, "#0d0d0d");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Halo doré qui respire — plus large et plus chaud au pic
  const cx = x + w / 2;
  const cy = y + h / 2;
  const haloR = Math.max(w, h) * (0.55 + breathe * 0.25);
  const haloAlpha = 0.28 + breathe * 0.22;
  const haloCx = cx + parallaxX * 0.6;
  const haloCy = cy + parallaxY * 0.6;
  const radial = ctx.createRadialGradient(haloCx, haloCy, 20, haloCx, haloCy, haloR);
  radial.addColorStop(0, `rgba(212,180,124,${haloAlpha.toFixed(3)})`);
  radial.addColorStop(0.55, "rgba(201,168,112,0.10)");
  radial.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(x, y, w, h);

  // Second halo froid pour la profondeur
  const cool = ctx.createRadialGradient(
    cx - parallaxX * 0.8, cy - parallaxY * 0.8, 10,
    cx - parallaxX * 0.8, cy - parallaxY * 0.8, haloR * 0.7,
  );
  cool.addColorStop(0, `rgba(80,90,110,${(0.18 - breathe * 0.08).toFixed(3)})`);
  cool.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cool;
  ctx.fillRect(x, y, w, h);

  // Grain subtil via lignes diagonales (offset pour parallax)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  const off = (drift * 6) | 0;
  for (let i = -h; i < w; i += 14) {
    ctx.beginPath();
    ctx.moveTo(x + i + off, y);
    ctx.lineTo(x + i + h + off, y + h);
    ctx.stroke();
  }
  ctx.restore();

  // Cadre intérieur fin doré (légèrement plus brillant au pic du halo)
  ctx.strokeStyle = `rgba(201,168,112,${(0.45 + breathe * 0.25).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 24, y + 24, w - 48, h - 48);

  // Monogramme géant filigrane (initiale marque) — parallax inverse pour effet de profondeur
  const initial = (deal.brand || "G").trim().charAt(0).toUpperCase();
  ctx.save();
  ctx.globalAlpha = (0.16 + breathe * 0.08) * easeOut(reveal);
  ctx.fillStyle = "#c9a870";
  ctx.font = "900 540px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx - parallaxX * 1.4, cy + 20 - parallaxY * 1.2);
  ctx.restore();

  // Étiquette catégorie en haut — léger parallax positif
  ctx.save();
  ctx.globalAlpha = easeOut(reveal);
  ctx.fillStyle = "#c9a870";
  ctx.font = "800 26px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  (ctx as any).letterSpacing = "6px";
  const catLabel = (category || "EXCLUSIVE").toUpperCase();
  const lineY = y + 70 + parallaxY * 0.25;
  const tw = ctx.measureText(catLabel).width;
  const labelCx = cx + parallaxX * 0.3;
  ctx.fillRect(labelCx - tw / 2 - 60, lineY - 12, 40, 2);
  ctx.fillRect(labelCx + tw / 2 + 20, lineY - 12, 40, 2);
  ctx.fillText(catLabel, labelCx, lineY);

  // Marque centrale — parallax plus marqué (plan avant)
  ctx.fillStyle = "#f5f1e8";
  ctx.font = "900 96px 'Inter',sans-serif";
  ctx.fillText(
    (deal.brand || "GOLDEALS").toUpperCase(),
    cx + parallaxX * 0.7,
    cy + h * 0.28 + parallaxY * 0.6,
  );

  // Mention bas
  ctx.fillStyle = "rgba(245,241,232,0.55)";
  ctx.font = "500 20px 'Inter',sans-serif";
  ctx.fillText("VISUAL COMING SOON", cx, y + h - 50);
  ctx.restore();
}

function drawDealHalf(
  ctx: CanvasRenderingContext2D,
  deal: Deal,
  img: HTMLImageElement | null,
  yTop: number,
  height: number,
  reveal: number, // 0..1
  isTop: boolean,
  category = "",
  time = 0,
) {
  // Background ivoire/photo
  ctx.fillStyle = PHOTO_BG;
  ctx.fillRect(0, yTop, W, height);

  // Photo full-bleed (haut de la moitié)
  const photoH = height * 0.62;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, yTop, W, photoH);
  ctx.clip();
  if (img) {
    const floatY = Math.sin(reveal * Math.PI) * 6;
    const enterY = (1 - reveal) * (isTop ? -40 : 40);
    drawCoverImage(ctx, img, 40, yTop + 20 + enterY + floatY, W - 80, photoH - 40, 1);
  } else {
    drawPremiumPlaceholder(ctx, deal, category, 0, yTop, W, photoH, reveal, time);
  }
  ctx.restore();

  // Bas : bloc info ivoire
  const infoY = yTop + photoH;
  const infoH = height - photoH;
  ctx.fillStyle = IVOIRE;
  ctx.fillRect(0, infoY, W, infoH);

  const alpha = easeOut(Math.max(0, Math.min(1, (reveal - 0.2) / 0.6)));
  ctx.globalAlpha = alpha;

  // Brand
  ctx.fillStyle = NOIR;
  ctx.font = "900 64px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(deal.brand.toUpperCase(), 50, infoY + 80);

  // Catégorie · merchant
  ctx.fillStyle = TAUPE;
  ctx.font = "600 22px 'Inter',sans-serif";
  ctx.fillText(`${deal.merchant || ""}`.toUpperCase(), 50, infoY + 115);

  // Prix XXL
  const priceStr = deal.sale_price != null ? `${Math.round(Number(deal.sale_price))}€` : "—";
  ctx.fillStyle = NOIR;
  ctx.font = "900 130px 'Inter',sans-serif";
  ctx.fillText(priceStr, 50, infoY + 245);

  // Prix barré
  if (deal.original_price && deal.sale_price && Number(deal.original_price) > Number(deal.sale_price)) {
    ctx.fillStyle = TAUPE;
    ctx.globalAlpha = alpha * 0.5;
    ctx.font = "500 38px 'Inter',sans-serif";
    const op = `${Math.round(Number(deal.original_price))}€`;
    const x = 50;
    const y = infoY + 285;
    ctx.fillText(op, x, y);
    const w = ctx.measureText(op).width;
    ctx.strokeStyle = TAUPE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + w, y - 12);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  // Discount pill
  const disc = Math.round(Number(deal.discount_percent || 0));
  if (disc > 0) {
    ctx.font = "900 42px 'Inter',sans-serif";
    const t = `-${disc}%`;
    const tw = ctx.measureText(t).width;
    const padX = 32;
    const pillH = 78;
    const pillW = tw + padX * 2;
    const pillX = W - pillW - 50;
    const pillY = infoY + 175;
    ctx.fillStyle = NOIR;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = IVOIRE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, pillX + pillW / 2, pillY + pillH / 2 + 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    // Flames
    const flameCount = disc >= 50 ? 3 : disc >= 30 ? 2 : 1;
    const flameSize = 44;
    const flameY = pillY + pillH + 18;
    for (let i = 0; i < flameCount; i++) {
      drawFlame(ctx, W - 50 - flameSize - i * (flameSize + 6), flameY, flameSize);
    }
  }

  ctx.globalAlpha = 1;
}

function drawBattleFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  battle: Battle,
  imgA: HTMLImageElement | null,
  imgB: HTMLImageElement | null,
) {
  // ─── INTRO ───
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    ctx.fillStyle = NOIR;
    ctx.fillRect(0, 0, W, H);

    // Halo doré
    const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W);
    grad.addColorStop(0, "rgba(201,168,112,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = k;
    // G logo
    ctx.fillStyle = IVOIRE;
    roundRect(ctx, W / 2 - 90, H / 2 - 280, 180, 180, 28);
    ctx.fill();
    ctx.fillStyle = NOIR;
    ctx.font = "700 130px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", W / 2, H / 2 - 185);

    ctx.fillStyle = IVOIRE;
    ctx.font = "800 56px 'Inter',sans-serif";
    ctx.fillText("GOLDEALS CLUB", W / 2, H / 2 - 40);

    ctx.fillStyle = GOLD;
    ctx.font = "900 180px 'Inter',sans-serif";
    const scale = 0.7 + 0.3 * k;
    ctx.save();
    ctx.translate(W / 2, H / 2 + 130);
    ctx.scale(scale, scale);
    ctx.fillText("BATTLE", 0, 0);
    ctx.restore();

    ctx.fillStyle = IVOIRE;
    ctx.font = "700 48px 'Inter',sans-serif";
    ctx.fillText(battle.label.toUpperCase(), W / 2, H / 2 + 260);

    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // ─── OUTRO ───
  if (t > TOTAL_SEC - OUTRO) {
    const k = easeOut((t - (TOTAL_SEC - OUTRO)) / OUTRO);
    ctx.fillStyle = NOIR;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W);
    grad.addColorStop(0, "rgba(201,168,112,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = k;
    ctx.fillStyle = IVOIRE;
    ctx.font = "900 110px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TU CHOISIS", W / 2, H / 2 - 120);
    ctx.fillText("QUI ?", W / 2, H / 2 + 10);

    // CTA pill
    const pillW = 760;
    const pillH = 130;
    const pillX = (W - pillW) / 2;
    const pillY = H / 2 + 180;
    ctx.fillStyle = GOLD;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = NOIR;
    ctx.font = "900 52px 'Inter',sans-serif";
    ctx.fillText("GOLDEALSCLUB.COM", W / 2, pillY + pillH / 2 + 4);

    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // ─── BATTLE ───
  const battleT = t - INTRO;
  const battleDur = TOTAL_SEC - INTRO - OUTRO;
  const reveal = Math.min(1, battleT / 0.7);

  // Background
  ctx.fillStyle = PHOTO_BG;
  ctx.fillRect(0, 0, W, H);

  drawTopBar(ctx, battle.label);

  const barH = 110;
  const halfH = (H - barH) / 2;

  // Slide A from top, B from bottom
  const slideA = easeOut(Math.min(1, battleT / 0.45));
  const slideB = easeOut(Math.min(1, (battleT - 0.15) / 0.45));

  ctx.save();
  ctx.translate(0, (1 - slideA) * -halfH);
  drawDealHalf(ctx, battle.a, imgA, barH, halfH, slideA, true, battle.category);
  ctx.restore();

  ctx.save();
  ctx.translate(0, (1 - slideB) * halfH);
  drawDealHalf(ctx, battle.b, imgB, barH + halfH, halfH, slideB, false, battle.category);
  ctx.restore();

  // ─── VS BADGE central ───
  const vsAppear = easeOut(Math.min(1, (battleT - 0.5) / 0.4));
  const pulse = 1 + Math.sin(battleT * 6) * 0.06;
  const vsScale = vsAppear * pulse;
  const vsCx = W / 2;
  const vsCy = barH + halfH;

  // halo
  ctx.globalAlpha = vsAppear;
  const haloGrad = ctx.createRadialGradient(vsCx, vsCy, 20, vsCx, vsCy, 250);
  haloGrad.addColorStop(0, "rgba(201,168,112,0.7)");
  haloGrad.addColorStop(1, "rgba(201,168,112,0)");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(vsCx, vsCy, 250, 0, Math.PI * 2);
  ctx.fill();

  // VS disc
  ctx.save();
  ctx.translate(vsCx, vsCy);
  ctx.scale(vsScale, vsScale);
  ctx.fillStyle = NOIR;
  ctx.beginPath();
  ctx.arc(0, 0, 130, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 130, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.font = "900 110px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("VS", 0, 4);
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

export default function AdminVideoPage() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderingIdx, setRenderingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
  const [editableCaption, setEditableCaption] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("generated_videos" as any)
      .select("*")
      .order("brief_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast({ title: "Erreur historique", description: error.message, variant: "destructive" });
    setHistory((data as any[]) || []);
    setHistoryLoading(false);
  };

  const deleteHistoryItem = async (item: any) => {
    if (!confirm(`Supprimer "${item.label}" du ${item.brief_date} ?`)) return;
    await supabase.storage.from("tiktok-videos").remove([item.storage_path]);
    const { error } = await supabase.from("generated_videos" as any).delete().eq("id", item.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Vidéo supprimée" });
      loadHistory();
    }
  };

  useEffect(() => {
    document.title = "Vidéos Hype Battle — Admin";
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return setIsAdmin(false);
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  const loadBrief = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_video_briefs")
      .select("*")
      .eq("brief_date", today)
      .maybeSingle();
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    if (data) {
      setBrief(data as unknown as Brief);
      setEditableCaption(`${data.caption}\n\n${data.hashtags}`);
    } else {
      setBrief(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      loadBrief();
      loadHistory();
    }
  }, [isAdmin]);

  const regenerate = async () => {
    setLoading(true);
    setVideoUrls({});
    const { error } = await supabase.functions.invoke("prepare-daily-video-brief");
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else toast({ title: "Brief régénéré" });
    await loadBrief();
  };

  const renderBattle = async (idx: number) => {
    if (!brief) return;
    const battle = brief.deals[idx];
    setRenderingIdx(idx);
    setProgress(0);
    setVideoUrls((prev) => {
      const n = { ...prev };
      delete n[idx];
      return n;
    });

    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const [imgA, imgB] = await Promise.all([loadImage(battle.a.image_url), loadImage(battle.b.image_url)]);

      const totalFrames = TOTAL_SEC * FPS;
      const videoStream = (canvas as any).captureStream(FPS) as MediaStream;

      // ===== Musique chill lo-fi générée procéduralement =====
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx: AudioContext = new AC();
      const dest = audioCtx.createMediaStreamDestination();
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.25;
      // Filtre passe-bas pour vibe lo-fi
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;
      lp.Q.value = 0.7;
      masterGain.connect(lp);
      lp.connect(dest);

      const now0 = audioCtx.currentTime;
      // Accord chill: Cmaj7 -> Am7 -> Fmaj7 -> G7 (boucle douce)
      // Notes en Hz
      const chords: number[][] = [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 349.23], // G7
      ];
      const chordDur = TOTAL_SEC / chords.length; // ~3.75s par accord
      chords.forEach((notes, ci) => {
        const startT = now0 + ci * chordDur;
        const endT = startT + chordDur;
        notes.forEach((freq, ni) => {
          // Pad sinusoïdal doux
          const osc = audioCtx.createOscillator();
          osc.type = ni === 0 ? "triangle" : "sine";
          osc.frequency.value = freq;
          const g = audioCtx.createGain();
          g.gain.setValueAtTime(0, startT);
          g.gain.linearRampToValueAtTime(0.18, startT + 0.6);
          g.gain.linearRampToValueAtTime(0.14, endT - 0.4);
          g.gain.linearRampToValueAtTime(0, endT);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(startT);
          osc.stop(endT + 0.05);
        });
        // Basse douce (octave en dessous de la fondamentale)
        const bass = audioCtx.createOscillator();
        bass.type = "sine";
        bass.frequency.value = notes[0] / 2;
        const bg = audioCtx.createGain();
        bg.gain.setValueAtTime(0, startT);
        bg.gain.linearRampToValueAtTime(0.22, startT + 0.3);
        bg.gain.linearRampToValueAtTime(0.18, endT - 0.3);
        bg.gain.linearRampToValueAtTime(0, endT);
        bass.connect(bg);
        bg.connect(masterGain);
        bass.start(startT);
        bass.stop(endT + 0.05);
      });

      // Fade out global sur la dernière seconde
      masterGain.gain.setValueAtTime(0.25, now0 + TOTAL_SEC - 1);
      masterGain.gain.linearRampToValueAtTime(0, now0 + TOTAL_SEC);

      // Combine audio + video
      const stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16_000_000, audioBitsPerSecond: 128_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      recorder.start();
      const start = performance.now();
      for (let f = 0; f < totalFrames; f++) {
        const t = f / FPS;
        drawBattleFrame(ctx, t, battle, imgA, imgB);
        setProgress(Math.round((f / totalFrames) * 100));
        const target = start + (f / FPS) * 1000;
        const now = performance.now();
        if (target > now) await new Promise((r) => setTimeout(r, target - now));
      }
      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();

      const blob = await done;
      try { await audioCtx.close(); } catch {}
      const url = URL.createObjectURL(blob);
      setVideoUrls((prev) => ({ ...prev, [idx]: url }));
      setProgress(100);
      toast({ title: `Vidéo ${battle.label} prête !` });

      // Auto-save dans le bucket tiktok-videos
      setUploadingIdx(idx);
      try {
        const filename = `battles/${brief!.brief_date}/${battle.category}-${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage
          .from("tiktok-videos")
          .upload(filename, blob, { contentType: "video/webm", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("tiktok-videos").getPublicUrl(filename);
        const { error: insErr } = await supabase.from("generated_videos" as any).insert({
          brief_date: brief!.brief_date,
          category: battle.category,
          label: battle.label,
          storage_path: filename,
          public_url: pub.publicUrl,
          caption: brief!.caption,
          hashtags: brief!.hashtags,
          size_bytes: blob.size,
          duration_sec: TOTAL_SEC,
        });
        if (insErr) throw insErr;
        toast({ title: "Sauvegardée dans le cloud ☁️" });
        loadHistory();
      } catch (e: any) {
        toast({ title: "Sauvegarde cloud échouée", description: e?.message || String(e), variant: "destructive" });
      } finally {
        setUploadingIdx(null);
      }
    } catch (e: any) {
      toast({ title: "Échec du rendu", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRenderingIdx(null);
    }
  };

  const copyCaption = async () => {
    await navigator.clipboard.writeText(editableCaption);
    toast({ title: "Caption copiée" });
  };

  if (isAdmin === null) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-8 text-center">Accès réservé aux administrateurs.</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Admin
        </Link>
        <Button variant="outline" size="sm" onClick={regenerate} disabled={loading || renderingIdx !== null}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Régénérer briefs
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <Swords className="h-7 w-7" /> Hype Battle du jour
      </h1>
      <p className="text-muted-foreground mb-6">
        Une vidéo VS par catégorie · 9:16 · 15s · marques hype
      </p>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && (!brief || brief.deals.length === 0) && (
        <div className="border rounded-lg p-6 text-center">
          <p className="mb-4">Aucun battle disponible aujourd'hui (pas assez de deals hype par catégorie).</p>
          <Button onClick={regenerate}>Régénérer</Button>
        </div>
      )}

      {!loading && brief && brief.deals.length > 0 && (
        <>
          {/* Caption globale */}
          <div className="border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Caption (utilisable pour tous les posts)</h2>
              <Button size="sm" variant="ghost" onClick={copyCaption}><Copy className="h-4 w-4" /> Copier</Button>
            </div>
            <Textarea
              value={editableCaption}
              onChange={(e) => setEditableCaption(e.target.value)}
              rows={6}
              className="text-sm font-mono"
            />
          </div>

          {/* Canvas hidden — utilisé en rendu */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Une carte par battle */}
          <div className="grid md:grid-cols-3 gap-4">
            {brief.deals.map((battle, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="h-4 w-4" />
                  <h3 className="font-semibold">{battle.label}</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[battle.a, battle.b].map((d, i) => (
                    <div key={i} className="text-center">
                      <img src={d.image_url} alt="" className="w-full aspect-square object-cover rounded mb-1" />
                      <div className="text-xs font-bold uppercase">{d.brand}</div>
                      <div className="text-xs text-muted-foreground">-{Math.round(Number(d.discount_percent))}%</div>
                    </div>
                  ))}
                </div>

                {renderingIdx === idx && (
                  <div className="mb-2">
                    <div className="h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-center mt-1 text-muted-foreground">{progress}%</p>
                  </div>
                )}

                {!videoUrls[idx] && (
                  <Button
                    size="sm"
                    onClick={() => renderBattle(idx)}
                    disabled={renderingIdx !== null}
                    className="w-full"
                  >
                    {renderingIdx === idx ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rendu…</>
                    ) : (
                      "🎬 Générer la vidéo"
                    )}
                  </Button>
                )}

                {videoUrls[idx] && (
                  <div className="space-y-2">
                    <video src={videoUrls[idx]} controls className="w-full rounded" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={videoUrls[idx]} download={`battle-${battle.category}-${brief.brief_date}.webm`}>
                          <Download className="h-4 w-4 mr-1" /> WebM
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const blob = await fetch(videoUrls[idx]).then((r) => r.blob());
                            const file = new File(
                              [blob],
                              `battle-${battle.category}-${brief.brief_date}.webm`,
                              { type: "video/webm" },
                            );
                            const nav: any = navigator;
                            if (nav.canShare && nav.canShare({ files: [file] })) {
                              await nav.share({
                                files: [file],
                                title: battle.label,
                                text: editableCaption,
                              });
                            } else {
                              await navigator.clipboard.writeText(editableCaption);
                              toast({
                                title: "Partage natif indisponible",
                                description: "Caption copiée. Télécharge la vidéo et poste-la manuellement.",
                              });
                            }
                          } catch (e: any) {
                            if (e?.name !== "AbortError") {
                              toast({ title: "Échec partage", description: e?.message || String(e), variant: "destructive" });
                            }
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-1" /> Partager
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      {uploadingIdx === idx ? (
                        <span className="inline-flex items-center gap-1"><Cloud className="h-3 w-3 animate-pulse" /> Sauvegarde cloud…</span>
                      ) : (
                        <>Sauvegardée dans le cloud · MP4 via <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" className="underline">cloudconvert</a></>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6">
            Format .webm — accepté par TikTok et Instagram. Sinon convertis en .mp4 via cloudconvert.com
          </p>
        </>
      )}

      {/* HISTORIQUE DES VIDÉOS (avec recherche + filtres) */}
      <div className="mt-12 border-t pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" /> Historique
          </h2>
          <Link
            to="/admin/video/historique"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            Voir tout →
          </Link>
        </div>
        <VideoHistory limit={12} compact />
      </div>
    </div>
  );
}
