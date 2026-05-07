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
  const barH = 96;
  ctx.fillStyle = NOIR;
  ctx.fillRect(0, 0, W, barH);

  // Wordmark à gauche, lettrage espacé (Zara-like)
  ctx.fillStyle = IVOIRE;
  ctx.font = "600 22px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  (ctx as any).letterSpacing = "8px";
  ctx.fillText("GOLDEALS CLUB", 48, barH / 2 + 1);
  (ctx as any).letterSpacing = "0px";

  // Catégorie à droite, taupe clair, fine
  ctx.fillStyle = "rgba(246,240,233,0.55)";
  ctx.font = "500 18px 'Inter',sans-serif";
  ctx.textAlign = "right";
  (ctx as any).letterSpacing = "6px";
  ctx.fillText(label.toUpperCase(), W - 48, barH / 2 + 1);
  (ctx as any).letterSpacing = "0px";

  // Filet doré ultra-fin (signature unique de la marque)
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, barH - 1, W, 1);

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
  // Hash deterministe pour micro-variations subtiles
  let hash = 0;
  const seed = (deal.id || deal.brand || "x") + category;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  // Animation continue (très subtile)
  const phase = (hash % 1000) / 1000;
  const breathe = (Math.sin((time * 1.0 + phase) * Math.PI * 2) + 1) / 2;
  const drift = Math.sin((time * 0.5 + phase) * Math.PI * 2);
  const parallaxX = drift * 8;
  const parallaxY = Math.cos((time * 0.45 + phase) * Math.PI * 2) * 6;

  // Fond éditorial — palette ivoire/taupe (zéro doré sur le fond)
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, "#efe9df");
  grad.addColorStop(0.55, "#e7e1d6");
  grad.addColorStop(1, "#d8d2c5");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Vignette taupe
  const cx = x + w / 2;
  const cy = y + h / 2;
  const vignette = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(69,64,58,0.18)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);

  // Halo studio ivoire (lumière douce, PAS doré)
  const haloR = Math.max(w, h) * (0.45 + breathe * 0.18);
  const haloAlpha = 0.10 + breathe * 0.08;
  const haloCx = cx + parallaxX * 0.6;
  const haloCy = cy + parallaxY * 0.6 - h * 0.12;
  const radial = ctx.createRadialGradient(haloCx, haloCy, 20, haloCx, haloCy, haloR);
  radial.addColorStop(0, `rgba(255,250,240,${haloAlpha.toFixed(3)})`);
  radial.addColorStop(1, "rgba(255,250,240,0)");
  ctx.fillStyle = radial;
  ctx.fillRect(x, y, w, h);

  // Grain papier très léger
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = "#45403a";
  ctx.lineWidth = 1;
  const off = (drift * 4) | 0;
  for (let i = -h; i < w; i += 22) {
    ctx.beginPath();
    ctx.moveTo(x + i + off, y);
    ctx.lineTo(x + i + h + off, y + h);
    ctx.stroke();
  }
  ctx.restore();

  // Cadre intérieur taupe ultra-fin
  ctx.strokeStyle = "rgba(69,64,58,0.30)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 32, y + 32, w - 64, h - 64);

  // Monogramme géant en noir filigrane (pas en or)
  const initial = (deal.brand || "G").trim().charAt(0).toUpperCase();
  ctx.save();
  ctx.globalAlpha = (0.10 + breathe * 0.04) * easeOut(reveal);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "300 580px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, cx - parallaxX * 1.2, cy + 20 - parallaxY * 1.0);
  ctx.restore();

  // Étiquette catégorie en haut — taupe sobre
  ctx.save();
  ctx.globalAlpha = easeOut(reveal);
  ctx.font = "500 24px 'Inter',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  (ctx as any).letterSpacing = "10px";
  const catLabel = (category || "EXCLUSIVE").toUpperCase();
  const lineY = y + 80 + parallaxY * 0.2;
  const tw = ctx.measureText(catLabel).width;
  const labelCx = cx + parallaxX * 0.3;
  // Mini filets dorés ultra fins (signature discrète)
  ctx.fillStyle = GOLD;
  ctx.fillRect(labelCx - tw / 2 - 50, lineY - 10, 30, 1);
  ctx.fillRect(labelCx + tw / 2 + 20, lineY - 10, 30, 1);
  ctx.fillStyle = TAUPE;
  ctx.fillText(catLabel, labelCx, lineY);
  (ctx as any).letterSpacing = "0px";

  // Marque centrale — display serif élégant noir
  ctx.fillStyle = NOIR;
  ctx.font = "300 110px Georgia, serif";
  ctx.fillText(
    (deal.brand || "GOLDEALS"),
    cx + parallaxX * 0.5,
    cy + h * 0.26 + parallaxY * 0.5,
  );

  // Mention bas, taupe clair
  ctx.fillStyle = "rgba(69,64,58,0.55)";
  ctx.font = "500 18px 'Inter',sans-serif";
  (ctx as any).letterSpacing = "6px";
  ctx.fillText("VISUAL EN COURS", cx, y + h - 50);
  (ctx as any).letterSpacing = "0px";
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
  // Fond ivoire subtilement dégradé (studio éditorial, pas gris plat)
  const bgGrad = ctx.createLinearGradient(0, yTop, 0, yTop + height);
  bgGrad.addColorStop(0, "#f4efe6");
  bgGrad.addColorStop(0.6, "#ece6da");
  bgGrad.addColorStop(1, "#e2dccf");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, yTop, W, height);

  // Photo full-bleed (haut de la moitié) — plus généreuse (68%)
  const photoH = height * 0.68;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, yTop, W, photoH);
  ctx.clip();

  if (img) {
    // Halo lumineux derrière le produit (effet studio)
    const cx = W / 2;
    const cy = yTop + photoH / 2;
    const halo = ctx.createRadialGradient(cx, cy, 60, cx, cy, Math.max(W, photoH) * 0.7);
    halo.addColorStop(0, "rgba(255,250,240,0.55)");
    halo.addColorStop(1, "rgba(255,250,240,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, yTop, W, photoH);

    const floatY = Math.sin(reveal * Math.PI) * 4;
    const enterY = (1 - reveal) * (isTop ? -30 : 30);

    // Ombre portée douce sous le produit
    ctx.save();
    const shadowAlpha = 0.22 * easeOut(reveal);
    const shadowGrad = ctx.createRadialGradient(cx, yTop + photoH - 60, 20, cx, yTop + photoH - 60, W * 0.42);
    shadowGrad.addColorStop(0, `rgba(40,36,32,${shadowAlpha.toFixed(3)})`);
    shadowGrad.addColorStop(1, "rgba(40,36,32,0)");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, yTop + photoH - 50, W * 0.36, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Le produit lui-même, plus grand et mieux intégré
    drawCoverImage(ctx, img, 30, yTop + 20 + enterY + floatY, W - 60, photoH - 60, 1.05);
  } else {
    drawPremiumPlaceholder(ctx, deal, category, 0, yTop, W, photoH, reveal, time);
  }
  ctx.restore();

  // Bas : bloc info ivoire
  const infoY = yTop + photoH;
  const infoH = height - photoH;
  ctx.fillStyle = IVOIRE;
  ctx.fillRect(0, infoY, W, infoH);
  // Filet doré séparateur ultra-fin
  ctx.fillStyle = "rgba(201,168,112,0.45)";
  ctx.fillRect(0, infoY, W, 1);

  const alpha = easeOut(Math.max(0, Math.min(1, (reveal - 0.2) / 0.6)));
  ctx.globalAlpha = alpha;

  // Brand — display serif Zara-like, fin et raffiné
  ctx.fillStyle = NOIR;
  ctx.font = "300 78px Georgia, serif";
  ctx.textAlign = "left";
  ctx.fillText(deal.brand, 60, infoY + 90);

  // Merchant — petit, taupe, espacé
  ctx.fillStyle = TAUPE;
  ctx.font = "500 18px 'Inter',sans-serif";
  (ctx as any).letterSpacing = "5px";
  ctx.fillText(`${deal.merchant || ""}`.toUpperCase(), 60, infoY + 122);
  (ctx as any).letterSpacing = "0px";

  // Filet doré ultra-fin sous le merchant (signature unique)
  ctx.fillStyle = GOLD;
  ctx.fillRect(60, infoY + 138, 32, 1);

  // Prix XXL — sans-serif noir, weight medium pas extra-bold (plus chic)
  const priceStr = deal.sale_price != null ? `${Math.round(Number(deal.sale_price))} €` : "—";
  ctx.fillStyle = NOIR;
  ctx.font = "500 124px 'Inter',sans-serif";
  ctx.fillText(priceStr, 60, infoY + 260);

  // Prix barré
  if (deal.original_price && deal.sale_price && Number(deal.original_price) > Number(deal.sale_price)) {
    ctx.fillStyle = TAUPE;
    ctx.globalAlpha = alpha * 0.55;
    ctx.font = "400 36px 'Inter',sans-serif";
    const op = `${Math.round(Number(deal.original_price))} €`;
    const x = 60;
    const y = infoY + 305;
    ctx.fillText(op, x, y);
    const w = ctx.measureText(op).width;
    ctx.strokeStyle = TAUPE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + w, y - 12);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }

  // Discount — capsule outlined ivoire/noir, plus chic et plus petit
  const disc = Math.round(Number(deal.discount_percent || 0));
  if (disc > 0) {
    ctx.font = "500 30px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "2px";
    const t = `−${disc}%`;
    const tw = ctx.measureText(t).width;
    const padX = 28;
    const pillH = 56;
    const pillW = tw + padX * 2;
    const pillX = W - pillW - 60;
    const pillY = infoY + 90;
    // Capsule outlined noir (pas plein, pas doré)
    ctx.strokeStyle = NOIR;
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 2);
    ctx.stroke();
    ctx.fillStyle = NOIR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, pillX + pillW / 2, pillY + pillH / 2 + 2);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    (ctx as any).letterSpacing = "0px";
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
  // ─── INTRO ─── (noir profond, ivoire, accent or filaire)
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    ctx.fillStyle = NOIR;
    ctx.fillRect(0, 0, W, H);

    // Vignette douce taupe (pas de halo doré agressif)
    const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W);
    grad.addColorStop(0, "rgba(246,240,233,0.06)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = k;

    // Wordmark sobre, espacement large
    ctx.fillStyle = IVOIRE;
    ctx.font = "600 38px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as any).letterSpacing = "12px";
    ctx.fillText("GOLDEALS CLUB", W / 2, H / 2 - 200);
    (ctx as any).letterSpacing = "0px";

    // Filet doré ultra fin (signature)
    ctx.fillStyle = GOLD;
    ctx.fillRect(W / 2 - 28, H / 2 - 150, 56, 1);

    // BATTLE en display ivoire, pas en gold
    ctx.fillStyle = IVOIRE;
    ctx.font = "300 200px Georgia, serif";
    const scale = 0.85 + 0.15 * k;
    ctx.save();
    ctx.translate(W / 2, H / 2 + 40);
    ctx.scale(scale, scale);
    ctx.fillText("Battle", 0, 0);
    ctx.restore();

    // Catégorie en petites caps taupe clair
    ctx.fillStyle = "rgba(246,240,233,0.55)";
    ctx.font = "500 26px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "10px";
    ctx.fillText(battle.label.toUpperCase(), W / 2, H / 2 + 200);
    (ctx as any).letterSpacing = "0px";

    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // ─── OUTRO ─── (noir, ivoire, CTA filaire or)
  if (t > TOTAL_SEC - OUTRO) {
    const k = easeOut((t - (TOTAL_SEC - OUTRO)) / OUTRO);
    ctx.fillStyle = NOIR;
    ctx.fillRect(0, 0, W, H);

    const grad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, W);
    grad.addColorStop(0, "rgba(246,240,233,0.05)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = k;
    // Petit eyebrow
    ctx.fillStyle = "rgba(246,240,233,0.5)";
    ctx.font = "500 24px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as any).letterSpacing = "8px";
    ctx.fillText("ALORS —", W / 2, H / 2 - 220);
    (ctx as any).letterSpacing = "0px";

    ctx.fillStyle = IVOIRE;
    ctx.font = "300 150px Georgia, serif";
    ctx.fillText("Tu choisis qui ?", W / 2, H / 2 - 60);

    // Filet or signature
    ctx.fillStyle = GOLD;
    ctx.fillRect(W / 2 - 28, H / 2 + 30, 56, 1);

    // CTA filaire (pas plein doré) — noir + bordure ivoire fine
    const pillW = 720;
    const pillH = 120;
    const pillX = (W - pillW) / 2;
    const pillY = H / 2 + 130;
    ctx.strokeStyle = IVOIRE;
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 4);
    ctx.stroke();
    ctx.fillStyle = IVOIRE;
    ctx.font = "500 38px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "6px";
    ctx.fillText("GOLDEALSCLUB.COM", W / 2, pillY + pillH / 2 + 2);
    (ctx as any).letterSpacing = "0px";

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

  const barH = 96;
  const halfH = (H - barH) / 2;

  // Slide A from top, B from bottom
  const slideA = easeOut(Math.min(1, battleT / 0.45));
  const slideB = easeOut(Math.min(1, (battleT - 0.15) / 0.45));

  ctx.save();
  ctx.translate(0, (1 - slideA) * -halfH);
  drawDealHalf(ctx, battle.a, imgA, barH, halfH, slideA, true, battle.category, battleT);
  ctx.restore();

  ctx.save();
  ctx.translate(0, (1 - slideB) * halfH);
  drawDealHalf(ctx, battle.b, imgB, barH + halfH, halfH, slideB, false, battle.category, battleT);
  ctx.restore();

  // ─── VS BADGE central — chic, ivoire/noir, accent or 1px ───
  const vsAppear = easeOut(Math.min(1, (battleT - 0.5) / 0.4));
  const pulse = 1 + Math.sin(battleT * 4) * 0.025; // pulse très subtil
  const vsScale = vsAppear * pulse;
  const vsCx = W / 2;
  const vsCy = barH + halfH;

  // halo lumière douce ivoire (pas doré)
  ctx.globalAlpha = vsAppear * 0.6;
  const haloGrad = ctx.createRadialGradient(vsCx, vsCy, 20, vsCx, vsCy, 220);
  haloGrad.addColorStop(0, "rgba(255,250,240,0.45)");
  haloGrad.addColorStop(1, "rgba(255,250,240,0)");
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(vsCx, vsCy, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = vsAppear;
  ctx.save();
  ctx.translate(vsCx, vsCy);
  ctx.scale(vsScale, vsScale);
  // disque noir profond
  ctx.fillStyle = NOIR;
  ctx.beginPath();
  ctx.arc(0, 0, 110, 0, Math.PI * 2);
  ctx.fill();
  // anneau or ultra-fin (signature)
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();
  // VS en serif italique ivoire (raffiné, éditorial)
  ctx.fillStyle = IVOIRE;
  ctx.font = "italic 300 92px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("vs", 0, 4);
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
      const imagesLoaded = (imgA ? 1 : 0) + (imgB ? 1 : 0);
      if (imagesLoaded < 2) {
        const missing = [!imgA && battle.a.brand, !imgB && battle.b.brand].filter(Boolean).join(", ");
        toast({
          title: imagesLoaded === 0 ? "⚠️ Aucune photo chargée" : "⚠️ Photo manquante",
          description: `Placeholder éditorial utilisé pour : ${missing}`,
          variant: "destructive",
        });
      }

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
          images_loaded: imagesLoaded,
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

      {/* AUDIT GÉNÉRATION — vue par catégorie */}
      {!loading && (
        <div className="border rounded-lg p-4 mb-6 bg-muted/20">
          <h2 className="text-sm font-semibold uppercase tracking-widest mb-3 text-muted-foreground">
            Audit génération du jour
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {(["sneakers", "vetements", "accessoires"] as const).map((cat) => {
              const inBrief = brief?.deals.find((b) => b.category === cat);
              const todayVideos = history.filter(
                (h: any) => h.brief_date === brief?.brief_date && h.category === cat,
              );
              const count = todayVideos.length;
              const missingPhotos = todayVideos.filter((v: any) => (v.images_loaded ?? 2) < 2).length;
              const status = !inBrief
                ? { label: "Vide / timeout", color: "text-amber-600", dot: "bg-amber-500" }
                : count === 0
                ? { label: "Brief OK · vidéo non générée", color: "text-foreground/70", dot: "bg-foreground/40" }
                : missingPhotos > 0
                ? { label: `${count} vidéo${count > 1 ? "s" : ""} · ${missingPhotos} sans photo`, color: "text-amber-600", dot: "bg-amber-500" }
                : { label: `${count} vidéo${count > 1 ? "s" : ""} · photos OK`, color: "text-emerald-600", dot: "bg-emerald-500" };
              return (
                <div key={cat} className="border rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                    <span className="text-xs uppercase tracking-wider font-medium">{cat}</span>
                  </div>
                  <p className={`text-sm ${status.color}`}>{status.label}</p>
                  {inBrief && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {inBrief.a.brand} vs {inBrief.b.brand}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
