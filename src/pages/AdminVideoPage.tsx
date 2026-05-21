import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Copy, RefreshCw, ArrowLeft, Sparkles, Share2, Cloud, History, Pencil, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import VideoHistory from "@/components/admin/VideoHistory";
import brandNikeUrl from "@/assets/brand-nike.svg";
import brandAdidasUrl from "@/assets/brand-adidas.svg";
import brandJdUrl from "@/assets/brand-jdsports.png";
// Logos partenaires servis depuis /public — URLs absolues.
const snipesLogoUrl = "/partners/snipes-logo.png";
const kappaLogoUrl = "/partners/kappa-logo.png";

// Map marque normalisée → URL logo. Si non trouvé : fallback texte uppercase bold.
const BRAND_LOGO_URLS: Record<string, string> = {
  nike: brandNikeUrl,
  adidas: brandAdidasUrl,
  "jd sports": brandJdUrl,
  jdsports: brandJdUrl,
  snipes: snipesLogoUrl,
  kappa: kappaLogoUrl,
};

const brandLogoCache = new Map<string, HTMLImageElement | null>();
async function getBrandLogo(brand: string): Promise<HTMLImageElement | null> {
  const key = (brand || "").trim().toLowerCase();
  if (!key) return null;
  if (brandLogoCache.has(key)) return brandLogoCache.get(key)!;
  const url = BRAND_LOGO_URLS[key];
  if (!url) {
    brandLogoCache.set(key, null);
    return null;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { brandLogoCache.set(key, img); resolve(img); };
    img.onerror = () => { brandLogoCache.set(key, null); resolve(null); };
    img.src = url;
  });
}

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
const FPS = 60;                     // 60 fps → mouvement perçu parfaitement fluide (mobile)
const PER_DEAL_SEC = 4.2;          // produit affiché 4.2s — laisse respirer + crossfade ample
const INTRO = 2.2;
const OUTRO = 2.6;

// ─── PRESETS DE FOND ───
type BgPreset = "zara" | "charcoal" | "ivoire";

type Palette = {
  bgTop: string;
  bgMid: string;
  bgBot: string;
  ink: string;        // texte principal (anciennement IVOIRE)
  inkSoft: string;    // texte secondaire (rgba string)
  accent: string;     // accent / filets (anciennement GOLD)
  taupe: string;      // gris neutre intermédiaire
  haloInner: string;  // halo lumineux derrière le produit (rgba)
  haloMid: string;
  vignette: string;   // teinte de la vignette périphérique (rgba)
  grainOnDark: boolean; // true → grain blanc dominant, false → grain noir dominant
};

const BG_PRESETS: Record<BgPreset, Palette> = {
  // Studio gris clair façon ZARA — minimal, lumineux
  zara: {
    bgTop: "#e6e3de",
    bgMid: "#d8d4cd",
    bgBot: "#c7c2ba",
    ink: "#0a0a0a",
    inkSoft: "rgba(20,20,20,0.5)",
    accent: "#1a1a1a",
    taupe: "#5a5650",
    haloInner: "rgba(255,255,255,0.35)",
    haloMid: "rgba(255,255,255,0.08)",
    vignette: "rgba(0,0,0,0.12)",
    grainOnDark: false,
  },
  // Charcoal nuit — éditorial sombre avec or chaud
  charcoal: {
    bgTop: "#1a1a1d",
    bgMid: "#121214",
    bgBot: "#070708",
    ink: "#f5f1ea",
    inkSoft: "rgba(245,241,234,0.55)",
    accent: "#c9a876",
    taupe: "#8a8278",
    haloInner: "rgba(201,168,118,0.18)",
    haloMid: "rgba(201,168,118,0.06)",
    vignette: "rgba(0,0,0,0.55)",
    grainOnDark: true,
  },
  // Ivoire premium — fond crème chaud, accents bronze
  ivoire: {
    bgTop: "#f3ece1",
    bgMid: "#ece2d2",
    bgBot: "#d9ccb6",
    ink: "#1d1a14",
    inkSoft: "rgba(29,26,20,0.55)",
    accent: "#8a6a3c",
    taupe: "#7a6f5a",
    haloInner: "rgba(255,250,240,0.4)",
    haloMid: "rgba(255,250,240,0.08)",
    vignette: "rgba(60,40,15,0.18)",
    grainOnDark: false,
  },
};

// Theme actif — réassigné via applyBgPreset() avant chaque rendu
let activePalette: Palette = BG_PRESETS.zara;
let NOIR = "#0a0a0a";
let NOIR_SOFT = "#1a1a1a";
let CHARCOAL_TOP = activePalette.bgTop;
let CHARCOAL_MID = activePalette.bgMid;
let CHARCOAL_BOT = activePalette.bgBot;
let IVOIRE = activePalette.ink;
let TAUPE = activePalette.taupe;
let GOLD = activePalette.accent;
let GOLD_DEEP = activePalette.accent;

function applyBgPreset(preset: BgPreset) {
  activePalette = BG_PRESETS[preset];
  CHARCOAL_TOP = activePalette.bgTop;
  CHARCOAL_MID = activePalette.bgMid;
  CHARCOAL_BOT = activePalette.bgBot;
  IVOIRE = activePalette.ink;
  TAUPE = activePalette.taupe;
  GOLD = activePalette.accent;
  GOLD_DEEP = activePalette.accent;
}

const PROXY_BASE = `https://yyqgxhuzobmqygksbaze.supabase.co/functions/v1/image-proxy`;
const proxify = (src: string) => `${PROXY_BASE}?url=${encodeURIComponent(src)}`;

// Filtre qualité : rejette les images trop petites (thumbnails moches)
const MIN_IMG_DIM = 500;
async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const tryLoad = (url: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = async () => {
        if (img.naturalWidth <= 0) return resolve(null);
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        if (minDim < MIN_IMG_DIM) return resolve(null);
        // Décode explicitement → évite le coût au 1er draw (= saccade au début du deal)
        try { await img.decode(); } catch {}
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  const viaProxy = await tryLoad(proxify(src));
  if (viaProxy) return viaProxy;
  return tryLoad(src);
}

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// Courbes cinéma — sans rebond, ultra fluides
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
const easeInOutQuint = (t: number) =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
// "Spring" sans overshoot (rendu cinéma, plus chic qu'un rebond)
const springEase = (t: number) => easeOutQuint(clamp01(t));

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

// Cache de détourage adaptatif : détecte la couleur de fond aux 4 coins
// (blanc, gris clair, beige…) et la rend transparente avec feathering doux.
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
    const W0 = c.width, H0 = c.height;

    // Échantillonne les 4 coins (16x16 px) pour détecter la couleur de fond
    const sampleCorner = (x0: number, y0: number) => {
      let r = 0, g = 0, b = 0, n = 0;
      const sz = 16;
      for (let y = y0; y < y0 + sz && y < H0; y++) {
        for (let x = x0; x < x0 + sz && x < W0; x++) {
          const i = (y * W0 + x) * 4;
          r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
        }
      }
      return n > 0 ? [r / n, g / n, b / n] : [255, 255, 255];
    };
    const corners = [
      sampleCorner(0, 0),
      sampleCorner(W0 - 16, 0),
      sampleCorner(0, H0 - 16),
      sampleCorner(W0 - 16, H0 - 16),
    ];
    // Couleur de fond moyenne
    let br = 0, bg = 0, bb = 0;
    for (const [r, g, b] of corners) { br += r; bg += g; bb += b; }
    br /= 4; bg /= 4; bb /= 4;
    // Variance entre coins → si trop élevée, on annule (probablement une lifestyle photo)
    let variance = 0;
    for (const [r, g, b] of corners) {
      variance += Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    }
    if (variance > 80) {
      // Pas de fond uniforme → on garde l'image brute
      cutoutCache.set(img, c);
      return c;
    }
    // Si fond très sombre (lifestyle dark) : on n'enlève rien
    const bgLum = (br + bg + bb) / 3;
    if (bgLum < 140) {
      cutoutCache.set(img, c);
      return c;
    }

    // Tolérance adaptative : fonds très clairs (JPEG e-commerce typiques)
    // nécessitent une plage plus large pour éliminer le halo résiduel.
    const veryLight = bgLum > 220;
    const TOL_HARD = veryLight ? 26 : 14;   // distance euclidienne max pour transparence totale
    const TOL_SOFT = veryLight ? 88 : 56;   // feathering plus large → bord plus doux, pas de "halo"
    for (let i = 0; i < d.length; i += 4) {
      const dr = d[i] - br;
      const dg = d[i + 1] - bg;
      const db = d[i + 2] - bb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < TOL_HARD) {
        d[i + 3] = 0;
      } else if (dist < TOL_SOFT) {
        const t = (dist - TOL_HARD) / (TOL_SOFT - TOL_HARD);
        // courbe smoothstep pour transition plus naturelle
        const sm = t * t * (3 - 2 * t);
        d[i + 3] = Math.round(d[i + 3] * sm);
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

  ctx.fillStyle = "rgba(20,20,20,0.7)";
  ctx.font = "500 16px 'Inter',sans-serif";
  ctx.textAlign = "right";
  (ctx as any).letterSpacing = "6px";
  ctx.fillText(`${label} · ${String(rank).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 60, y);
  (ctx as any).letterSpacing = "0px";

  // Filet or très fin sous le header
  ctx.fillStyle = "rgba(20,20,20,0.25)";
  ctx.fillRect(60, y + 26, W - 120, 1);

  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

function drawCharcoalBg(ctx: CanvasRenderingContext2D, t01: number) {
  // Fond studio gris clair, style ZARA — dégradé vertical doux, presque uniforme
  const drift = Math.sin(t01 * Math.PI) * 0.03;
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, CHARCOAL_TOP);
  bgGrad.addColorStop(0.6 + drift, CHARCOAL_MID);
  bgGrad.addColorStop(1, CHARCOAL_BOT);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Halo lumineux centré (couleur dépendante du preset)
  const haloR = ctx.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.42, W * 0.75);
  haloR.addColorStop(0, activePalette.haloInner);
  haloR.addColorStop(0.5, activePalette.haloMid);
  haloR.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = haloR;
  ctx.fillRect(0, 0, W, H);

  // Vignette périphérique (intensité dépendante du preset)
  const vign = ctx.createRadialGradient(W / 2, H * 0.5, W * 0.35, W / 2, H * 0.5, W * 0.95);
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, activePalette.vignette);
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  // Grain très fin (texture papier mat)
  ctx.save();
  ctx.globalAlpha = activePalette.grainOnDark ? 0.05 : 0.035;
  for (let i = 0; i < 130; i++) {
    const gx = (i * 137.13) % W;
    const gy = (i * 241.91) % H;
    const dark = i % 2 === 0;
    ctx.fillStyle = activePalette.grainOnDark
      ? (dark ? "#ffffff" : "#000000")
      : (dark ? "#000000" : "#ffffff");
    ctx.fillRect(gx, gy, 2, 2);
  }
  ctx.restore();
}

// ─── Rendu "Instagram ad" : fond studio gris, header marque + titre,
//     bloc prix rouge encadré à droite, produit détouré centré,
//     CTA pilule blanche "Acheter" + barre noire "Sponsorisé".
const RED_ACCENT = "#e11d2a";
const INK_BLACK = "#0a0a0a";
const LINK_BLUE = "#1d8cf0";

function drawAdHeader(
  ctx: CanvasRenderingContext2D,
  deal: Deal,
  reveal: number,
  exit: number,
  logo: HTMLImageElement | null,
) {
  const alpha = reveal * (1 - exit);
  const slide = (1 - reveal) * 30;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, -slide);

  // ── Bloc gauche : logo (si dispo) sinon nom marque + titre produit ──
  if (logo && logo.naturalWidth > 0) {
    // Affiche le logo officiel — hauteur fixe 110px, largeur auto, alignée à gauche
    const targetH = 110;
    const ratio = logo.naturalWidth / logo.naturalHeight;
    const targetW = targetH * ratio;
    const maxW = 380;
    const finalW = Math.min(targetW, maxW);
    const finalH = finalW / ratio;
    ctx.drawImage(logo, 60, 130, finalW, finalH);
  } else {
    ctx.fillStyle = INK_BLACK;
    ctx.font = "900 78px 'Inter','Helvetica',sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    (ctx as any).letterSpacing = "-2px";
    ctx.fillText((deal.brand || "").toUpperCase(), 60, 220);
    (ctx as any).letterSpacing = "0px";
  }

  // Titre produit — wrap sur 2 lignes max
  ctx.fillStyle = INK_BLACK;
  ctx.font = "800 38px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  (ctx as any).letterSpacing = "0.5px";
  const titleMax = 620;
  const words = (deal.title || "").toUpperCase().split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > titleMax && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < 2) lines.push(cur);
  if (lines.length === 2 && ctx.measureText(lines[1]).width > titleMax) {
    while (lines[1].length > 4 && ctx.measureText(lines[1] + "…").width > titleMax) {
      lines[1] = lines[1].slice(0, -1);
    }
    lines[1] = lines[1] + "…";
  }
  const titleStartY = logo ? 290 : 290;
  lines.forEach((ln, i) => ctx.fillText(ln, 60, titleStartY + i * 48));
  (ctx as any).letterSpacing = "0px";

  ctx.restore();
}

function drawAdPriceBlock(
  ctx: CanvasRenderingContext2D,
  deal: Deal,
  reveal: number,
  exit: number,
) {
  const alpha = reveal * (1 - exit);
  const scale = 0.9 + 0.1 * reveal;
  ctx.save();
  ctx.globalAlpha = alpha;

  // Prix barré (à dessiner sous la boîte rouge mais on calcule la boîte d'abord)
  const priceVal = deal.sale_price != null ? Number(deal.sale_price) : 0;
  const priceTxt = `${priceVal.toFixed(2).replace(".00", ".00")} €`;

  // Mesure de la boîte
  ctx.font = "800 64px 'Inter','Helvetica',sans-serif";
  (ctx as any).letterSpacing = "-1px";
  const tw = ctx.measureText(priceTxt).width;
  const padX = 30;
  const padY = 18;
  const boxW = tw + padX * 2;
  const boxH = 64 + padY * 2 - 28;
  const boxX = W - 60 - boxW;
  const boxY = 150;

  // Origine top-right pour le scale (comme la capture Instagram)
  ctx.translate(W - 60, boxY);
  ctx.scale(scale, scale);
  ctx.translate(-(W - 60), -boxY);

  // Boîte rouge avec double bordure : blanc puis rouge à l'extérieur
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(boxX - 7, boxY - 7, boxW + 14, boxH + 14);
  ctx.fillStyle = RED_ACCENT;
  ctx.fillRect(boxX - 4, boxY - 4, boxW + 8, boxH + 8);
  ctx.fillStyle = RED_ACCENT;
  ctx.fillRect(boxX, boxY, boxW, boxH);

  // Texte prix
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(priceTxt, boxX + boxW / 2, boxY + boxH / 2 + 2);
  (ctx as any).letterSpacing = "0px";

  // Prix barré sous la boîte
  if (deal.original_price && Number(deal.original_price) > priceVal) {
    const op = `${Number(deal.original_price).toFixed(2).replace(".00", ".00")} €`;
    ctx.font = "500 38px 'Inter','Helvetica',sans-serif";
    ctx.fillStyle = INK_BLACK;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    const opY = boxY + boxH + 56;
    ctx.fillText(op, W - 60, opY);
    const opW = ctx.measureText(op).width;
    ctx.strokeStyle = INK_BLACK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W - 60 - opW, opY - 14);
    ctx.lineTo(W - 60, opY - 14);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAdCTA(ctx: CanvasRenderingContext2D, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;

  const label = "Acheter";
  ctx.font = "500 56px 'Inter','Helvetica',sans-serif";
  const tw = ctx.measureText(label).width;
  const iconSize = 42;
  const gap = 22;
  const padX = 84;
  const padY = 28;
  const pillW = tw + iconSize + gap + padX * 2;
  const pillH = 56 + padY * 2;
  const pillX = (W - pillW) / 2;
  const pillY = H - 110 - pillH;

  // Ombre
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Icône lien (deux maillons stylisés)
  const ix = pillX + padX;
  const iy = pillY + pillH / 2;
  ctx.strokeStyle = LINK_BLUE;
  ctx.lineWidth = 4.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  // Premier maillon (haut-droit)
  ctx.moveTo(ix + 6, iy + 2);
  ctx.quadraticCurveTo(ix + 22, iy - 14, ix + 36, iy - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ix + 6, iy - 2);
  ctx.quadraticCurveTo(ix - 10, iy + 14, ix - 16, iy + 18);
  ctx.stroke();
  // Croisement central
  ctx.beginPath();
  ctx.moveTo(ix - 4, iy + 8);
  ctx.lineTo(ix + 14, iy - 10);
  ctx.stroke();

  // Texte
  ctx.fillStyle = INK_BLACK;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, ix + iconSize + gap, iy + 2);

  ctx.restore();
}

function drawSponsoBar(ctx: CanvasRenderingContext2D, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const barH = 64;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, H - barH, W, barH);
  ctx.fillStyle = "#ffffff";
  ctx.font = "400 22px 'Inter','Helvetica',sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Sponsorisé", 40, H - barH / 2);
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
  drawBg: boolean = true,
  logo: HTMLImageElement | null = null,
) {
  if (drawBg) drawCharcoalBg(ctx, hold);

  // Zone produit : centre, sous le header, au-dessus du CTA
  const stageY = 470;
  const stageH = Math.round(H * 0.50);
  const cxC = W / 2;
  const cyC = stageY + stageH * 0.5;

  const revealE = easeOutExpo(clamp01(reveal));
  const exitE = easeInOutQuint(clamp01(exit));
  const alphaK = (1 - exitE) * revealE;
  const slideIn = (1 - revealE) * 50;
  const slideOut = exitE * -45;
  const exitScale = 1 + exitE * 0.04;

  // Ombre au sol douce
  ctx.save();
  ctx.globalAlpha = 0.22 * revealE * (1 - exitE);
  const groundY = stageY + stageH - 30;
  const shGrad = ctx.createRadialGradient(cxC, groundY, 20, cxC, groundY, W * 0.38);
  shGrad.addColorStop(0, "rgba(0,0,0,0.55)");
  shGrad.addColorStop(0.5, "rgba(0,0,0,0.18)");
  shGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shGrad;
  ctx.beginPath();
  ctx.ellipse(cxC, groundY, W * 0.30, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Produit détouré centré + ken-burns subtil
  ctx.save();
  ctx.globalAlpha = alphaK;
  if (img) {
    const padImg = 110;
    const baseW = W - padImg * 2;
    const baseH = stageH - padImg * 0.6;
    const kbScale = (0.96 + 0.04 * revealE) * (1 + 0.03 * hold) * exitScale;
    const drift = Math.sin(hold * Math.PI) * 5;
    const drawW = baseW * kbScale;
    const drawH = baseH * kbScale;
    const ix = (W - drawW) / 2 + drift;
    const iy = stageY + (stageH - drawH) / 2 + slideIn + slideOut;

    const cut = getCutout(img);
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 24;
    drawContainImage(ctx, cut, ix, iy, drawW, drawH);
  } else {
    ctx.fillStyle = INK_BLACK;
    ctx.globalAlpha = 0.08 * alphaK;
    ctx.font = "900 480px 'Inter','Helvetica',sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((deal.brand || "G").charAt(0).toUpperCase(), cxC, cyC);
  }
  ctx.restore();

  // Header marque + titre (gauche) — entrée légère
  drawAdHeader(ctx, deal, revealE, exitE, logo);

  // Bloc prix rouge (droite)
  drawAdPriceBlock(ctx, deal, revealE, exitE);

  // CTA pilule + barre sponsorisé — fade-in après le produit
  const ctaAlpha = easeOutExpo(clamp01((reveal - 0.25) / 0.6)) * (1 - exitE);
  drawAdCTA(ctx, ctaAlpha);
  drawSponsoBar(ctx, ctaAlpha);

  ctx.globalAlpha = 1;
}

function drawSelectionFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  selection: Selection,
  imgs: (HTMLImageElement | null)[],
  totalSec: number,
  logos: (HTMLImageElement | null)[] = [],
) {
  const n = selection.deals.length;

  // INTRO — éditorial nuit
  if (t < INTRO) {
    const k = easeOut(t / INTRO);
    drawCharcoalBg(ctx, t / INTRO);

    ctx.globalAlpha = k;
    ctx.fillStyle = "rgba(20,20,20,0.7)";
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

    ctx.fillStyle = "rgba(20,20,20,0.5)";
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

    ctx.fillStyle = "rgba(20,20,20,0.65)";
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

  // Fenêtres : entrée 0.9s, transition crossfade 1.5s entre deals (plus doux)
  const REVEAL_DUR = 0.9;
  const TRANS_DUR = 1.5;

  // Fond une seule fois — les deals sont composités par dessus
  drawCharcoalBg(ctx, clamp01(localT / PER_DEAL_SEC));

  // Crossfade : on dessine le suivant qui monte, puis le courant qui s'efface par-dessus.
  const inTransition = idx < n - 1 && localT > PER_DEAL_SEC - TRANS_DUR;
  if (inTransition) {
    const ttRaw = clamp01((localT - (PER_DEAL_SEC - TRANS_DUR)) / TRANS_DUR);
    // Courbe ease-in-out plus douce → pas de jump perceptible
    const tt = easeInOutQuint(ttRaw);
    const nextReveal = tt;
    const nextHold = tt * 0.3;
    drawDealFullScreen(
      ctx,
      selection.deals[idx + 1],
      imgs[idx + 1],
      nextReveal,
      0,
      idx + 2,
      nextHold,
      false,
      logos[idx + 1] ?? null,
    );
    const curHold = clamp01(localT / PER_DEAL_SEC);
    drawDealFullScreen(
      ctx,
      selection.deals[idx],
      imgs[idx],
      1,
      tt,
      idx + 1,
      curHold,
      false,
      logos[idx] ?? null,
    );
    return;
  }

  const reveal = clamp01(localT / REVEAL_DUR);
  const hold = clamp01(localT / PER_DEAL_SEC);
  drawDealFullScreen(ctx, selection.deals[idx], imgs[idx], reveal, 0, idx + 1, hold, false, logos[idx] ?? null);
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
  const [bgPreset, setBgPreset] = useState<BgPreset>("zara");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

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
    const textarea = captionRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [editableCaption]);

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

  const [refreshingCat, setRefreshingCat] = useState<string | null>(null);
  const [pickerCat, setPickerCat] = useState<{ category: string; label: string; idx: number } | null>(null);
  const [candidates, setCandidates] = useState<Deal[]>([]);
  const [candLoading, setCandLoading] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [savingPicks, setSavingPicks] = useState(false);

  const openPicker = async (idx: number, selection: Selection) => {
    setPickerCat({ category: selection.category, label: selection.label, idx });
    setPickedIds(selection.deals.map((d) => d.id));
    setCandidates([]);
    setCandLoading(true);
    const { data, error } = await supabase.functions.invoke("video-candidates", {
      body: { category: selection.category, limit: 80 },
    });
    if (error) {
      toast({ title: "Erreur chargement candidats", description: error.message, variant: "destructive" });
    } else {
      setCandidates(((data as any)?.candidates as Deal[]) || []);
    }
    setCandLoading(false);
  };

  const togglePick = (id: string) => {
    setPickedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        toast({ title: "Max 5 produits", description: "Décoches-en un d'abord." });
        return prev;
      }
      return [...prev, id];
    });
  };

  const savePicks = async () => {
    if (!pickerCat) return;
    if (pickedIds.length < 3) {
      toast({ title: "Sélectionne au moins 3 produits", variant: "destructive" });
      return;
    }
    setSavingPicks(true);
    const { error } = await supabase.functions.invoke("save-video-selection", {
      body: { category: pickerCat.category, dealIds: pickedIds },
    });
    if (error) {
      toast({ title: "Erreur sauvegarde", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sélection enregistrée ✓" });
      setVideoUrls((prev) => { const n = { ...prev }; delete n[pickerCat.idx]; return n; });
      await loadBrief();
      setPickerCat(null);
    }
    setSavingPicks(false);
  };


  const regenerate = async (shuffle = false, category?: string) => {
    if (category) {
      setRefreshingCat(category);
    } else {
      setLoading(true);
      setVideoUrls({});
    }
    const { error } = await supabase.functions.invoke("prepare-daily-video-brief", {
      body: { shuffle, ...(category ? { category } : {}) },
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: category
          ? `Catégorie ${category} rafraîchie 🎲`
          : shuffle ? "Deals rafraîchis 🎲" : "Brief régénéré",
      });
    }
    await loadBrief();
    setRefreshingCat(null);
  };



  const renderSelection = async (idx: number) => {
    if (!brief) return;
    const selection = brief.deals[idx];
    const totalSec = INTRO + selection.deals.length * PER_DEAL_SEC + OUTRO;
    applyBgPreset(bgPreset);
    setRenderingIdx(idx);
    setProgress(0);
    setVideoUrls((prev) => { const n = { ...prev }; delete n[idx]; return n; });

    try {
      const canvas = canvasRef.current!;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;

      // Préchargement explicite Inter + Playfair (sinon fallback Arial = typo générique)
      try {
        await Promise.all([
          (document as any).fonts?.load("200 200px 'Playfair Display'"),
          (document as any).fonts?.load("300 96px 'Playfair Display'"),
          (document as any).fonts?.load("400 40px 'Playfair Display'"),
          (document as any).fonts?.load("300 30px 'Inter'"),
          (document as any).fonts?.load("400 40px 'Inter'"),
          (document as any).fonts?.load("500 22px 'Inter'"),
          (document as any).fonts?.load("500 34px 'Inter'"),
          (document as any).fonts?.load("600 22px 'Inter'"),
          (document as any).fonts?.load("700 22px 'Inter'"),
        ]);
        await (document as any).fonts?.ready;
      } catch {}

      const [imgs, logos] = await Promise.all([
        Promise.all(selection.deals.map((d) => loadImage(d.image_url))),
        Promise.all(selection.deals.map((d) => getBrandLogo(d.brand))),
      ]);
      const imagesLoaded = imgs.filter(Boolean).length;
      if (imagesLoaded < selection.deals.length) {
        toast({
          title: `⚠️ ${selection.deals.length - imagesLoaded} photo(s) manquante(s)`,
          description: "Placeholder utilisé.",
        });
      }

      const totalFrames = Math.round(totalSec * FPS);
      // captureStream(0) → on pilote nous-mêmes chaque frame avec requestFrame()
      // → AUCUNE frame dupliquée/perdue → zéro saccade à la lecture (mobile inclus)
      const videoStream = (canvas as any).captureStream(0) as MediaStream;
      const videoTrack = videoStream.getVideoTracks()[0] as any;
      const canRequestFrame = typeof videoTrack?.requestFrame === "function";

      // ─── Vraie musique lofi via ElevenLabs Music API ───
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx: AudioContext = new AC({ sampleRate: 48000 });
      if (audioCtx.state === "suspended") {
        try { await audioCtx.resume(); } catch {}
      }
      const dest = audioCtx.createMediaStreamDestination();
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0;
      masterGain.connect(dest);

      let musicEl: HTMLAudioElement | null = null;
      let musicBlobUrl: string | null = null;
      try {
        toast({ title: "🎵 Génération musique lofi…", description: "Quelques secondes…" });
        const musicRes = await supabase.functions.invoke("generate-lofi-music", {
          body: { duration_ms: Math.max(10_000, Math.round(totalSec * 1000)) },
        });
        if (musicRes.error) throw musicRes.error;
        const blob: Blob =
          musicRes.data instanceof Blob
            ? musicRes.data
            : new Blob([musicRes.data as ArrayBuffer], { type: "audio/mpeg" });
        musicBlobUrl = URL.createObjectURL(blob);
        musicEl = new Audio(musicBlobUrl);
        musicEl.crossOrigin = "anonymous";
        musicEl.loop = true;
        musicEl.preload = "auto";
        await new Promise<void>((res) => {
          if (!musicEl) return res();
          musicEl.oncanplaythrough = () => res();
          musicEl.onerror = () => res();
          setTimeout(() => res(), 4000);
        });
        const musicSource = audioCtx.createMediaElementSource(musicEl);
        const lp = audioCtx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 8000;
        lp.Q.value = 0.4;
        musicSource.connect(lp);
        lp.connect(masterGain);
      } catch (musicErr) {
        console.error("Music fetch failed", musicErr);
        toast({
          title: "⚠️ Musique indisponible",
          description: "Vidéo générée sans son.",
          variant: "destructive",
        });
      }

      const now0 = audioCtx.currentTime;
      masterGain.gain.setValueAtTime(0.0, now0);
      masterGain.gain.linearRampToValueAtTime(0.55, now0 + 1.5);
      masterGain.gain.setValueAtTime(0.55, now0 + Math.max(1.5, totalSec - 1.5));
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
      if (musicEl) {
        try { musicEl.currentTime = 0; await musicEl.play(); } catch (e) { console.warn("audio play failed", e); }
      }
      const start = performance.now();
      for (let f = 0; f < totalFrames; f++) {
        const t = f / FPS;
        drawSelectionFrame(ctx, t, selection, imgs, totalSec, logos);
        setProgress(Math.round((f / totalFrames) * 100));
        const target = start + (f / FPS) * 1000;
        const now = performance.now();
        if (target > now) await new Promise((r) => setTimeout(r, target - now));
      }
      await new Promise((r) => setTimeout(r, 200));
      recorder.stop();

      const blob = await done;
      try { musicEl?.pause(); } catch {}
      if (musicBlobUrl) URL.revokeObjectURL(musicBlobUrl);
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
    <main className="admin-video-scroll min-h-[100svh] bg-background text-foreground px-4 pt-4 pb-28 md:p-8 md:pb-12 max-w-6xl mx-auto touch-pan-y">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour Admin
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => regenerate(true)} disabled={loading || renderingIdx !== null}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Rafraîchir deals
          </Button>
          <Button variant="outline" size="sm" onClick={() => regenerate(false)} disabled={loading || renderingIdx !== null}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Régénérer briefs
          </Button>
        </div>

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
          <Button onClick={() => regenerate(false)}>Régénérer maintenant</Button>
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
              ref={captionRef}
              value={editableCaption}
              onChange={(e) => setEditableCaption(e.target.value)}
              rows={1}
              className="resize-none overflow-hidden text-sm font-mono leading-relaxed md:min-h-[140px]"
            />
          </div>

          <div className="border rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h2 className="font-semibold text-sm">Fond de la vidéo</h2>
              <p className="text-xs text-muted-foreground">
                Choisis l'ambiance avant de générer.
              </p>
            </div>
            <Select value={bgPreset} onValueChange={(v) => setBgPreset(v as BgPreset)} disabled={renderingIdx !== null}>
              <SelectTrigger className="w-full sm:w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zara">Zara — studio gris clair</SelectItem>
                <SelectItem value="charcoal">Charcoal — nuit éditoriale</SelectItem>
                <SelectItem value="ivoire">Ivoire — premium crème</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <canvas ref={canvasRef} className="hidden" />


          <div className="grid md:grid-cols-3 gap-4">
            {brief.deals.map((selection, idx) => (
              <div key={idx} className="border rounded-lg p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4" />
                  <h3 className="font-semibold">{selection.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">Top {selection.deals.length}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="Rafraîchir cette catégorie"
                    onClick={() => {
                      setVideoUrls((prev) => { const n = { ...prev }; delete n[idx]; return n; });
                      regenerate(true, selection.category);
                    }}
                    disabled={loading || renderingIdx !== null || refreshingCat !== null}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingCat === selection.category ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="Choisir manuellement les 5 produits"
                    onClick={() => openPicker(idx, selection)}
                    disabled={loading || renderingIdx !== null || refreshingCat !== null}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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

      <div className="mt-12 border-t pt-8 hidden md:block">
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

      <Dialog open={!!pickerCat} onOpenChange={(o) => !o && !savingPicks && setPickerCat(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Choisir les produits — {pickerCat?.label}
              <span className="ml-3 text-sm font-normal text-muted-foreground">
                {pickedIds.length}/5 sélectionnés
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {candLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Aucun candidat disponible.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {candidates.map((d) => {
                  const idx = pickedIds.indexOf(d.id);
                  const picked = idx !== -1;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => togglePick(d.id)}
                      className={`relative text-left border rounded-lg overflow-hidden transition-all ${
                        picked
                          ? "border-primary ring-2 ring-primary"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      <div className="aspect-square bg-muted/30 relative">
                        <img src={d.image_url} alt={d.title} className="w-full h-full object-contain" loading="lazy" />
                        {picked && (
                          <div className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-[10px] font-bold uppercase truncate">{d.brand}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{d.title}</div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="font-semibold">{Math.round(Number(d.sale_price))} €</span>
                          <span className="text-muted-foreground">-{Math.round(Number(d.discount_percent))}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPickerCat(null)} disabled={savingPicks}>
              Annuler
            </Button>
            <Button onClick={savePicks} disabled={savingPicks || pickedIds.length < 3}>
              {savingPicks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Enregistrer ({pickedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
