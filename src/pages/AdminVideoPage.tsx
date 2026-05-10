import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, RefreshCw, ArrowLeft, Sparkles, Share2, Cloud, History } from "lucide-react";
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

type Selection = {
  type: "selection";
  category: string;
  label: string;
  deals: Deal[];
};

type Brief = {
  brief_date: string;
  focus_brand: string;
  deals: Selection[];
  caption: string;
  hashtags: string;
};

const W = 1080;
const H = 1920;
const FPS = 30;
const PER_DEAL_SEC = 3.2;          // chaque produit reste à l'écran 3.2s — respiration cinéma
const INTRO = 2.2;
const OUTRO = 2.6;

// Palette — éditorial nuit (charcoal & or)
const NOIR = "#0a0a0c";
const NOIR_SOFT = "#141416";
const CHARCOAL_TOP = "#1a1a1d";
const CHARCOAL_MID = "#121214";
const CHARCOAL_BOT = "#070708";
const IVOIRE = "#f5f1ea";
const TAUPE = "#8a8278";
const GOLD = "#c9a876";
const GOLD_DEEP = "#9d7d4f";

const PROXY_BASE = `https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/image-proxy`;
const proxify = (src: string) => `${PROXY_BASE}?url=${encodeURIComponent(src)}`;

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const tryLoad = (url: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  const viaProxy = await tryLoad(proxify(src));
  if (viaProxy) return viaProxy;
  return tryLoad(src);
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// Spring approximation 0..1 (overshoots ~1.05 then settles)
const springEase = (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6 * t) * Math.cos(t * Math.PI * 1.6);
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawContainImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const iw0 = (img as any).width;
  const ih0 = (img as any).height;
  const ratio = Math.min(w / iw0, h / ih0);
  const iw = iw0 * ratio;
  const ih = ih0 * ratio;
  (ctx as any).imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = "high";
  ctx.drawImage(img as any, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

// Cache de détourage chroma-key blanc → canvas avec fond transparent
const cutoutCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function getCutout(img: HTMLImageElement): HTMLCanvasElement | HTMLImageElement {
  const cached = cutoutCache.get(img);
  if (cached) return cached;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const cx = c.getContext("2d");
  if (!cx) return img;
  cx.drawImage(img, 0, 0);
  try {
    const id = cx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    // Sur fond charcoal très sombre : on est plus agressif sur le blanc
    // pour ne laisser AUCUN halo lumineux autour du produit.
    const HI = 232;
    const LO = 195;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mn = Math.min(r, g, b);
      const mx = Math.max(r, g, b);
      const sat = mx - mn;
      if (sat < 16 && mn > HI) {
        d[i + 3] = 0;
      } else if (sat < 20 && mn > LO) {
        const t = (mn - LO) / (HI - LO);
        d[i + 3] = Math.round(d[i + 3] * (1 - t));
      }
    }
    cx.putImageData(id, 0, 0);
    cutoutCache.set(img, c);
    return c;
  } catch {
    return img;
  }
}

function drawTopBar(ctx: CanvasRenderingContext2D, label: string, rank: number, total: number, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Pas de bandeau plein — juste typographie sur le fond, pour rester aérien
  const y = 70;

  ctx.fillStyle = IVOIRE;
  ctx.font = "600 22px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  (ctx as any).letterSpacing = "8px";
  ctx.fillText("GOLDEALS CLUB", 60, y);

  ctx.fillStyle = "rgba(201,168,118,0.9)";
  ctx.font = "500 16px 'Inter',sans-serif";
  ctx.textAlign = "right";
  (ctx as any).letterSpacing = "6px";
  ctx.fillText(`${label} · ${String(rank).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 60, y);
  (ctx as any).letterSpacing = "0px";

  // Filet or très fin sous le header
  ctx.fillStyle = "rgba(201,168,118,0.35)";
  ctx.fillRect(60, y + 26, W - 120, 1);

  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

function drawCharcoalBg(ctx: CanvasRenderingContext2D, t01: number) {
  // Dégradé charcoal vertical, légèrement animé (drift de la luminance)
  const drift = Math.sin(t01 * Math.PI) * 0.04;
  const top = CHARCOAL_TOP;
  const mid = CHARCOAL_MID;
  const bot = CHARCOAL_BOT;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, top);
  bgGrad.addColorStop(0.55 + drift, mid);
  bgGrad.addColorStop(1, bot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Halo or doux derrière le produit (centré, large)
  const haloR = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, W * 0.7);
  haloR.addColorStop(0, "rgba(201,168,118,0.18)");
  haloR.addColorStop(0.4, "rgba(201,168,118,0.06)");
  haloR.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = haloR;
  ctx.fillRect(0, 0, W, H);

  // Vignette périphérique
  const vign = ctx.createRadialGradient(W / 2, H * 0.5, W * 0.25, W / 2, H * 0.5, W * 0.95);
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Grain fin
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 140; i++) {
    const gx = (i * 137.13) % W;
    const gy = (i * 241.91) % H;
    ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#000000";
    ctx.fillRect(gx, gy, 2, 2);
  }
  ctx.restore();
}

function drawDealFullScreen(
  ctx: CanvasRenderingContext2D,
  deal: Deal,
  img: HTMLImageElement | null,
  reveal: number,
  exit: number,
  rank: number,
  hold: number, // 0..1 progression à l'intérieur du hold (pour ken-burns)
) {
  drawCharcoalBg(ctx, hold);

  const stageY = 180;
  const stageH = Math.round(H * 0.58);
  const infoY = stageY + stageH + 20;
  const cxC = W / 2;
  const cyC = stageY + stageH * 0.5;

  // Springs entrée/sortie
  const springR = springEase(reveal);
  const exitE = easeInOut(exit);
  const slideIn = (1 - springR) * 70;
  // Sortie : fade + léger zoom out, pas de slide horizontal (plus chic)
  const exitScale = 1 - exitE * 0.06;
  const alphaK = (1 - exitE) * Math.min(1, reveal * 1.4);

  // Rang en filigrane (chiffre serif énorme, derrière le produit)
  ctx.save();
  ctx.globalAlpha = 0.06 * springR * (1 - exitE);
  ctx.fillStyle = IVOIRE;
  ctx.font = "200 920px 'Playfair Display','Didot',Georgia,serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${rank}`, cxC, cyC + 30);
  ctx.restore();

  // Ombre au sol
  ctx.save();
  ctx.globalAlpha = 0.55 * springR * (1 - exitE);
  const groundY = stageY + stageH - 20;
  const shGrad = ctx.createRadialGradient(cxC, groundY, 20, cxC, groundY, W * 0.42);
  shGrad.addColorStop(0, "rgba(0,0,0,0.85)");
  shGrad.addColorStop(0.5, "rgba(0,0,0,0.35)");
  shGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.ellipse(cxC, groundY, W * 0.34, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Produit détouré — ken-burns subtil pendant le hold
  ctx.save();
  ctx.globalAlpha = alphaK;
  if (img) {
    const padImg = 90;
    const baseW = (W - padImg * 2);
    const baseH = (stageH - padImg);
    // Ken burns : drift lent + zoom doux 1.0 → 1.04
    const kbScale = (0.94 + 0.06 * springR) * (1 + 0.04 * hold) * exitScale;
    const drift = Math.sin(hold * Math.PI) * 6;
    const float = Math.sin(reveal * Math.PI) * 10;
    const drawW = baseW * kbScale;
    const drawH = baseH * kbScale;
    const ix = (W - drawW) / 2 + drift;
    const iy = stageY + (stageH - drawH) / 2 + float - 10 + slideIn;

    const cut = getCutout(img);

    // Glow chaud derrière le produit (or doux)
    ctx.save();
    ctx.globalAlpha = 0.32 * springR * (1 - exitE);
    const glow = ctx.createRadialGradient(cxC, cyC, 30, cxC, cyC, W * 0.45);
    glow.addColorStop(0, "rgba(201,168,118,0.45)");
    glow.addColorStop(0.6, "rgba(201,168,118,0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cxC, cyC, W * 0.42, H * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ombre portée
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 70;
    ctx.shadowOffsetY = 40;
    drawContainImage(ctx, cut, ix, iy, drawW, drawH);
  } else {
    ctx.fillStyle = IVOIRE;
    ctx.globalAlpha = 0.10 * alphaK;
    ctx.font = "200 560px 'Playfair Display',Georgia,serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((deal.brand || "G").charAt(0).toUpperCase(), cxC, cyC);
  }
  ctx.restore();

  // Header au-dessus du produit, avec fade in
  drawTopBar(ctx, "DEAL", rank, 5, alphaK); // label sera réécrit par caller via param? non — laisse pour fallback

  // === Bloc info en bas, éditorial ===
  const infoAlpha = easeOut(Math.max(0, Math.min(1, (reveal - 0.3) / 0.55))) * (1 - exitE);
  const infoSlide = (1 - infoAlpha) * 36;
  ctx.save();
  ctx.translate(0, infoSlide);
  ctx.globalAlpha = infoAlpha;

  // Filet or
  ctx.fillStyle = GOLD;
  ctx.fillRect(70, infoY + 10, 64, 1);

  // Marque (Playfair serif, ivoire)
  ctx.fillStyle = IVOIRE;
  ctx.font = "300 96px 'Playfair Display','Didot',Georgia,serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(deal.brand, 70, infoY + 100);

  // Merchant
  ctx.fillStyle = "rgba(201,168,118,0.85)";
  ctx.font = "500 18px 'Inter',sans-serif";
  (ctx as any).letterSpacing = "6px";
  ctx.fillText(`${deal.merchant || ""}`.toUpperCase(), 70, infoY + 142);
  (ctx as any).letterSpacing = "0px";

  // Prix — gros chiffres serif light
  const priceStr = deal.sale_price != null ? `${Math.round(Number(deal.sale_price))} €` : "—";
  ctx.fillStyle = IVOIRE;
  ctx.font = "200 196px 'Playfair Display','Didot',Georgia,serif";
  ctx.fillText(priceStr, 70, infoY + 320);

  if (deal.original_price && deal.sale_price && Number(deal.original_price) > Number(deal.sale_price)) {
    ctx.save();
    ctx.fillStyle = TAUPE;
    ctx.globalAlpha = infoAlpha * 0.75;
    ctx.font = "400 40px 'Inter',sans-serif";
    const op = `${Math.round(Number(deal.original_price))} €`;
    const x = 70;
    const y = infoY + 380;
    ctx.fillText(op, x, y);
    const w = ctx.measureText(op).width;
    ctx.strokeStyle = TAUPE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + w, y - 14);
    ctx.stroke();
    ctx.restore();
  }

  // Discount — capsule or contour, élégante
  const disc = Math.round(Number(deal.discount_percent || 0));
  if (disc > 0) {
    ctx.save();
    ctx.font = "500 34px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "4px";
    const t = `−${disc}%`;
    const tw = ctx.measureText(t).width;
    const padX = 36;
    const pillH = 72;
    const pillW = tw + padX * 2;
    const pillX = W - pillW - 70;
    const pillY = infoY + 70;
    // Bordure or fine
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 2);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(t, pillX + pillW / 2, pillY + pillH / 2 + 2);
    (ctx as any).letterSpacing = "0px";
    ctx.restore();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawSelectionFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  selection: Selection,
  imgs: (HTMLImageElement | null)[],
  totalSec: number,
) {
  const n = selection.deals.length;

  // INTRO — éditorial nuit
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    drawCharcoalBg(ctx, t / INTRO);

    ctx.globalAlpha = k;
    ctx.fillStyle = "rgba(201,168,118,0.9)";
    ctx.font = "500 26px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as any).letterSpacing = "14px";
    ctx.fillText("GOLDEALS CLUB", W / 2, H / 2 - 280);

    ctx.fillStyle = GOLD;
    ctx.fillRect(W / 2 - 32, H / 2 - 220, 64, 1);

    ctx.fillStyle = IVOIRE;
    ctx.font = "200 220px 'Playfair Display','Didot',Georgia,serif";
    (ctx as any).letterSpacing = "0px";
    const scale = 0.88 + 0.12 * springEase(k);
    ctx.save();
    ctx.translate(W / 2, H / 2 - 20);
    ctx.scale(scale, scale);
    ctx.fillText(`Top ${n}`, 0, 0);
    ctx.restore();

    ctx.fillStyle = "rgba(245,241,234,0.55)";
    ctx.font = "300 30px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "12px";
    ctx.fillText(selection.label.toUpperCase(), W / 2, H / 2 + 180);
    (ctx as any).letterSpacing = "0px";
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // OUTRO
  if (t > totalSec - OUTRO) {
    const k = easeOut((t - (totalSec - OUTRO)) / OUTRO);
    drawCharcoalBg(ctx, 1);
    ctx.globalAlpha = k;

    ctx.fillStyle = "rgba(201,168,118,0.85)";
    ctx.font = "500 22px 'Inter',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    (ctx as any).letterSpacing = "10px";
    ctx.fillText("RETROUVE TOUS LES DEALS", W / 2, H / 2 - 240);

    ctx.fillStyle = IVOIRE;
    ctx.font = "200 150px 'Playfair Display','Didot',Georgia,serif";
    (ctx as any).letterSpacing = "0px";
    ctx.fillText("Sur le site", W / 2, H / 2 - 60);

    ctx.fillStyle = GOLD;
    ctx.fillRect(W / 2 - 32, H / 2 + 30, 64, 1);

    const pillW = 760, pillH = 130;
    const pillX = (W - pillW) / 2;
    const pillY = H / 2 + 110;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 2);
    ctx.stroke();
    ctx.fillStyle = IVOIRE;
    ctx.font = "500 40px 'Inter',sans-serif";
    (ctx as any).letterSpacing = "8px";
    ctx.fillText("GOLDEALSCLUB.COM", W / 2, pillY + pillH / 2 + 2);
    (ctx as any).letterSpacing = "0px";
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
    return;
  }

  // SLIDESHOW
  const slideT = t - INTRO;
  const idx = Math.min(n - 1, Math.floor(slideT / PER_DEAL_SEC));
  const localT = slideT - idx * PER_DEAL_SEC;
  const reveal = Math.min(1, localT / 0.85);
  const exit = idx < n - 1 ? Math.max(0, Math.min(1, (localT - (PER_DEAL_SEC - 0.7)) / 0.7)) : 0;
  const hold = Math.min(1, Math.max(0, localT / PER_DEAL_SEC));

  drawDealFullScreen(ctx, selection.deals[idx], imgs[idx], reveal, exit, idx + 1, hold);
  // Header par dessus avec le bon label
  const headerAlpha = (1 - easeInOut(exit)) * Math.min(1, reveal * 1.4);
  drawTopBar(ctx, selection.label, idx + 1, n, headerAlpha);
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
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("generated_videos" as any)
      .select("*")
      .order("brief_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);
    setHistory((data as any[]) || []);
  };

  useEffect(() => {
    document.title = "Vidéos Top Sélection — Admin";
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
      const raw = (data as any).deals;
      const isNewFormat =
        Array.isArray(raw) &&
        raw.length > 0 &&
        raw.every((s: any) => s && s.type === "selection" && Array.isArray(s.deals));
      if (isNewFormat) {
        setBrief(data as unknown as Brief);
        setEditableCaption(`${data.caption}\n\n${data.hashtags}`);
      } else {
        // Vieux format (battle) — on l'ignore, le user devra régénérer
        setBrief(null);
        setEditableCaption("");
      }
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

  const renderSelection = async (idx: number) => {
    if (!brief) return;
    const selection = brief.deals[idx];
    const totalSec = INTRO + selection.deals.length * PER_DEAL_SEC + OUTRO;
    setRenderingIdx(idx);
    setProgress(0);
    setVideoUrls((prev) => { const n = { ...prev }; delete n[idx]; return n; });

    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      const imgs = await Promise.all(selection.deals.map((d) => loadImage(d.image_url)));
      const imagesLoaded = imgs.filter(Boolean).length;
      if (imagesLoaded < selection.deals.length) {
        toast({
          title: `⚠️ ${selection.deals.length - imagesLoaded} photo(s) manquante(s)`,
          description: "Placeholder utilisé.",
        });
      }

      const totalFrames = Math.round(totalSec * FPS);
      const videoStream = (canvas as any).captureStream(FPS) as MediaStream;

      // Audio chill lo-fi (boucle accords)
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx: AudioContext = new AC();
      const dest = audioCtx.createMediaStreamDestination();
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.25;
      const lp = audioCtx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2200;
      masterGain.connect(lp);
      lp.connect(dest);

      const now0 = audioCtx.currentTime;
      const chords: number[][] = [
        [261.63, 329.63, 392.0, 493.88],
        [220.0, 261.63, 329.63, 392.0],
        [174.61, 220.0, 261.63, 329.63],
        [196.0, 246.94, 293.66, 349.23],
      ];
      const chordDur = totalSec / chords.length;
      chords.forEach((notes, ci) => {
        const startT = now0 + ci * chordDur;
        const endT = startT + chordDur;
        notes.forEach((freq, ni) => {
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
      masterGain.gain.setValueAtTime(0.25, now0 + totalSec - 1);
      masterGain.gain.linearRampToValueAtTime(0, now0 + totalSec);

      const stream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 28_000_000, audioBitsPerSecond: 192_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      });

      recorder.start();
      const start = performance.now();
      for (let f = 0; f < totalFrames; f++) {
        const t = f / FPS;
        drawSelectionFrame(ctx, t, selection, imgs, totalSec);
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
      toast({ title: `Vidéo ${selection.label} prête !` });

      setUploadingIdx(idx);
      try {
        const filename = `selections/${brief.brief_date}/${selection.category}-${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage
          .from("tiktok-videos")
          .upload(filename, blob, { contentType: "video/webm", upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("tiktok-videos").getPublicUrl(filename);
        await supabase.from("generated_videos" as any).insert({
          brief_date: brief.brief_date,
          category: selection.category,
          label: selection.label,
          storage_path: filename,
          public_url: pub.publicUrl,
          caption: brief.caption,
          hashtags: brief.hashtags,
          size_bytes: blob.size,
          duration_sec: Math.round(totalSec),
          images_loaded: imagesLoaded,
        });
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
        <Sparkles className="h-7 w-7" /> Top Sélection du jour
      </h1>
      <p className="text-muted-foreground mb-6">
        3 vidéos · une par catégorie · Top 5 produits hype · 9:16
      </p>

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {!loading && (!brief || brief.deals.length === 0) && (
        <div className="border rounded-lg p-6 text-center">
          <p className="mb-4">Aucune sélection au nouveau format pour aujourd'hui. Clique sur « Régénérer » pour créer le top 5 par catégorie.</p>
          <Button onClick={regenerate}>Régénérer maintenant</Button>
        </div>
      )}

      {!loading && brief && brief.deals.length > 0 && (
        <>
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

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid md:grid-cols-3 gap-4">
            {brief.deals.map((selection, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="font-semibold">{selection.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Top {selection.deals.length}</span>
                </div>

                <div className="grid grid-cols-5 gap-1 mb-3">
                  {selection.deals.map((d, i) => (
                    <div key={i} className="text-center">
                      <div className="aspect-square bg-muted/30 rounded overflow-hidden">
                        <img
                          src={d.image_url}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="text-[9px] font-bold uppercase truncate mt-1">{d.brand}</div>
                      <div className="text-[9px] text-muted-foreground">-{Math.round(Number(d.discount_percent))}%</div>
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
                    onClick={() => renderSelection(idx)}
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
                        <a href={videoUrls[idx]} download={`top5-${selection.category}-${brief.brief_date}.webm`}>
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
                              `top5-${selection.category}-${brief.brief_date}.webm`,
                              { type: "video/webm" },
                            );
                            const nav: any = navigator;
                            if (nav.canShare && nav.canShare({ files: [file] })) {
                              await nav.share({ files: [file], title: selection.label, text: editableCaption });
                            } else {
                              await navigator.clipboard.writeText(editableCaption);
                              toast({ title: "Partage natif indisponible", description: "Caption copiée." });
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
                        <>Sauvegardée · MP4 via <a href="https://cloudconvert.com/webm-to-mp4" target="_blank" rel="noreferrer" className="underline">cloudconvert</a></>
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
