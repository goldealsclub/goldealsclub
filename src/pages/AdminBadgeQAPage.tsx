// QA automatique du badge prix sur une grille de fonds variés
// (beige, ivoire, gris, blancs cassés) + quelques photos texturées issues
// du catalogue. Pour chaque cellule, on échantillonne la luminance, on
// sélectionne la variante (claire/sombre) via pickBadgeContrast, on dessine
// le badge et on calcule le contraste WCAG fg/bg réel afin de flaguer les
// cas limites. Route : /admin/badge-qa
import { useEffect, useMemo, useRef, useState } from "react";
import {
  VIDEO_BADGE,
  VIDEO_RADII,
  VIDEO_TYPO,
  VIDEO_COLORS,
  applyShadow,
  clearShadow,
  VIDEO_SHADOWS,
  sampleAreaLuminance,
  pickBadgeContrast,
  getBadgeSampleRect,
} from "@/lib/video-tokens";

type Swatch = { label: string; kind: "solid" | "gradient" | "noise" | "image"; value: string };

const SOLID_SWATCHES: Swatch[] = [
  { label: "Ivoire #fafaf7", kind: "solid", value: "#fafaf7" },
  { label: "Off-white #f4efe6", kind: "solid", value: "#f4efe6" },
  { label: "Beige #e8e1d4", kind: "solid", value: "#e8e1d4" },
  { label: "Beige foncé #d6c8b0", kind: "solid", value: "#d6c8b0" },
  { label: "Sable #c9b99a", kind: "solid", value: "#c9b99a" },
  { label: "Taupe #9a9285", kind: "solid", value: "#9a9285" },
  { label: "Gris clair #e5e5e5", kind: "solid", value: "#e5e5e5" },
  { label: "Gris moyen #bdbdbd", kind: "solid", value: "#bdbdbd" },
  { label: "Gris foncé #6b6b6b", kind: "solid", value: "#6b6b6b" },
  { label: "Anthracite #2a2a2a", kind: "solid", value: "#2a2a2a" },
  { label: "Blanc pur #ffffff", kind: "solid", value: "#ffffff" },
  { label: "Noir d'encre #0a0a0a", kind: "solid", value: VIDEO_COLORS.ink },
];

const GRADIENT_SWATCHES: Swatch[] = [
  { label: "Dégradé beige→taupe", kind: "gradient", value: "linear:#efe7d8,#9a9285" },
  { label: "Dégradé ivoire→gris", kind: "gradient", value: "linear:#fafaf7,#6b6b6b" },
];

// Dimensions du badge (proportions identiques au pipeline vidéo, downscalées)
const CELL_W = 320;
const CELL_H = 220;
const BADGE_W = 220;
const BADGE_H = 96;

// Ratio de contraste WCAG (relative luminance)
function relLuminance(hex: string): number {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, sw: Swatch, img?: HTMLImageElement) {
  if (sw.kind === "solid") {
    ctx.fillStyle = sw.value;
    ctx.fillRect(0, 0, CELL_W, CELL_H);
  } else if (sw.kind === "gradient") {
    const [, colors] = sw.value.split(":");
    const [c1, c2] = colors.split(",");
    const g = ctx.createLinearGradient(0, 0, CELL_W, CELL_H);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CELL_W, CELL_H);
  } else if (sw.kind === "noise") {
    ctx.fillStyle = sw.value;
    ctx.fillRect(0, 0, CELL_W, CELL_H);
    // grain
    const id = ctx.getImageData(0, 0, CELL_W, CELL_H);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 40;
      id.data[i] = Math.max(0, Math.min(255, id.data[i] + n));
      id.data[i + 1] = Math.max(0, Math.min(255, id.data[i + 1] + n));
      id.data[i + 2] = Math.max(0, Math.min(255, id.data[i + 2] + n));
    }
    ctx.putImageData(id, 0, 0);
  } else if (sw.kind === "image" && img) {
    // cover
    const ar = img.width / img.height;
    const tar = CELL_W / CELL_H;
    let dw = CELL_W, dh = CELL_H, dx = 0, dy = 0;
    if (ar > tar) { dh = CELL_H; dw = CELL_H * ar; dx = (CELL_W - dw) / 2; }
    else { dw = CELL_W; dh = CELL_W / ar; dy = (CELL_H - dh) / 2; }
    ctx.drawImage(img, dx, dy, dw, dh);
  }
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

type CellResult = {
  label: string;
  luminance: number;
  variant: "dark" | "light";
  fill: string;
  fg: string;
  scrim: number;
  contrast: number;
  pass: boolean;
};

export default function AdminBadgeQAPage() {
  const [swatches, setSwatches] = useState<Swatch[]>([...SOLID_SWATCHES, ...GRADIENT_SWATCHES]);
  const [results, setResults] = useState<CellResult[]>([]);
  const [status, setStatus] = useState("Préparation…");
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    document.title = "QA Badge Prix — Fonds";
  }, []);

  // Charge 4 photos texturées depuis le catalogue
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/deals.json", { cache: "no-store" });
        const all = await res.json();
        const valid = all.filter((d: any) => d.image_url);
        const pick = (n: number) => {
          const out: any[] = [];
          const used = new Set<number>();
          while (out.length < n && used.size < valid.length) {
            const i = Math.floor(Math.random() * valid.length);
            if (used.has(i)) continue;
            used.add(i);
            out.push(valid[i]);
          }
          return out;
        };
        const photos = pick(4).map((d: any, i: number): Swatch => ({
          label: `Photo · ${d.brand ?? "?"} #${i + 1}`,
          kind: "image",
          value: d.image_url,
        }));
        const noise: Swatch[] = [
          { label: "Grain beige", kind: "noise", value: "#d8cdb6" },
          { label: "Grain gris", kind: "noise", value: "#a8a8a8" },
        ];
        setSwatches([...SOLID_SWATCHES, ...GRADIENT_SWATCHES, ...noise, ...photos]);
      } catch (e: any) {
        setStatus("Erreur chargement deals : " + e?.message);
      }
    })();
  }, []);

  // Rendu de chaque cellule
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus(`Rendu de ${swatches.length} cellules…`);
      const imgs = await Promise.all(
        swatches.map((sw) => (sw.kind === "image" ? loadImage(sw.value) : Promise.resolve(null))),
      );
      const out: CellResult[] = [];
      for (let i = 0; i < swatches.length; i++) {
        if (cancelled) return;
        const sw = swatches[i];
        const canvas = refs.current[i];
        if (!canvas) continue;
        canvas.width = CELL_W;
        canvas.height = CELL_H;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        drawBackground(ctx, sw, imgs[i] ?? undefined);

        // Position du badge centré
        const bx = (CELL_W - BADGE_W) / 2;
        const by = (CELL_H - BADGE_H) / 2;

        // Échantillonnage de la luminance sous la zone du badge
        const sr = getBadgeSampleRect(ctx, bx, by, BADGE_W, BADGE_H);
        const lum = sampleAreaLuminance(ctx, sr.x, sr.y, sr.w, sr.h);
        const c = pickBadgeContrast(lum);

        // Scrim (voile additionnel) si nécessaire
        if (c.scrim > 0) {
          ctx.fillStyle = c.isLightBg
            ? VIDEO_COLORS.alphaBlack(c.scrim)
            : VIDEO_COLORS.alphaWhite(c.scrim);
          ctx.fillRect(bx - 8, by - 8, BADGE_W + 16, BADGE_H + 16);
        }

        // Badge
        applyShadow(ctx, VIDEO_SHADOWS.pill);
        ctx.globalAlpha = c.fillOpacity;
        ctx.fillStyle = c.fill;
        roundRect(ctx, bx, by, BADGE_W, BADGE_H, VIDEO_RADII.md);
        ctx.fill();
        ctx.globalAlpha = 1;
        clearShadow(ctx);

        // Ring
        ctx.strokeStyle = c.ring;
        ctx.lineWidth = c.ringWidth;
        roundRect(ctx, bx + 0.5, by + 0.5, BADGE_W - 1, BADGE_H - 1, VIDEO_RADII.md);
        ctx.stroke();

        // Texte prix factice
        ctx.fillStyle = c.fg;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.font = "800 44px 'Inter','Helvetica',sans-serif";
        ctx.fillText("49,90 €", bx + BADGE_W / 2, by + BADGE_H / 2);

        const ratio = contrastRatio(c.fill, c.fg);
        out.push({
          label: sw.label,
          luminance: Math.round(lum),
          variant: c.isLightBg ? "dark" : "light",
          fill: c.fill,
          fg: c.fg,
          scrim: c.scrim,
          contrast: Math.round(ratio * 10) / 10,
          pass: ratio >= 4.5, // WCAG AA texte large
        });
      }
      if (!cancelled) {
        setResults(out);
        setStatus(`✓ ${out.length} cellules · ${out.filter((r) => r.pass).length} WCAG AA OK`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [swatches]);

  const failing = useMemo(() => results.filter((r) => !r.pass), [results]);

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-light tracking-wide mb-1">
          QA Badge Prix — Fonds variés
        </h1>
        <p className="text-sm text-neutral-400 mb-2">{status}</p>
        <p className="text-xs text-neutral-500 mb-6">
          Seuil luminance pour basculer en badge sombre : <code>{VIDEO_BADGE.luminanceThreshold}</code> ·
          Voile additionnel : <code>{VIDEO_BADGE.scrimOpacity}</code> · Contraste cible WCAG AA ≥ 4.5
        </p>

        {failing.length > 0 && (
          <div className="mb-6 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <strong>{failing.length} cellules sous WCAG AA :</strong>{" "}
            {failing.map((f) => `${f.label} (${f.contrast})`).join(" · ")}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {swatches.map((sw, i) => {
            const r = results[i];
            return (
              <div key={sw.label} className="space-y-1.5">
                <div className="rounded-md overflow-hidden ring-1 ring-white/10">
                  <canvas ref={(el) => (refs.current[i] = el)} className="w-full h-auto block" />
                </div>
                <div className="text-[11px] leading-tight">
                  <div className="font-medium text-neutral-200 truncate">{sw.label}</div>
                  {r && (
                    <div className="flex flex-wrap gap-x-2 text-neutral-400">
                      <span>lum {r.luminance}</span>
                      <span>· {r.variant}</span>
                      <span>· scrim {r.scrim}</span>
                      <span
                        className={
                          r.pass ? "text-emerald-400" : "text-amber-300 font-semibold"
                        }
                      >
                        · {r.contrast}:1 {r.pass ? "✓" : "⚠"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
