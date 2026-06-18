/**
 * Miniatures instantanées des 3 directions artistiques (Adidas / Zara / Nike).
 * Chaque carte = un mini-mockup canvas 9:16 rendu côté client à partir de la
 * palette du preset, cliquable pour sélectionner le style avant le rendu.
 *
 * Pas de network, pas de Remotion — c'est juste un repère visuel pour
 * l'utilisateur dans /admin/video.
 */
import { useEffect, useRef } from "react";
import { BG_PRESETS, type BgPreset } from "@/pages/AdminVideoPage";
import { cn } from "@/lib/utils";

// Tokens spécifiques de mise en page par direction (mirroir des choix Remotion).
const STYLE_BLUEPRINT: Record<
  "adidas" | "zara" | "nike",
  {
    label: string;
    sub: string;
    headline: string;
    brand: string;
    layout: "block" | "editorial" | "kinetic";
    chipBg: "ink" | "accent" | "paper";
    showStripes: boolean;
    fontDisplay: string;
    fontSerif?: boolean;
  }
> = {
  adidas: {
    label: "Adidas",
    sub: "Geometric & graphic",
    headline: "−45%",
    brand: "ADIDAS",
    layout: "block",
    chipBg: "paper",
    showStripes: true,
    fontDisplay: "900 22px 'Archivo Black', 'Archivo', system-ui, sans-serif",
  },
  zara: {
    label: "Zara",
    sub: "Editorial fashion",
    headline: "199 €",
    brand: "ZARA",
    layout: "editorial",
    chipBg: "paper",
    showStripes: false,
    fontDisplay: "500 28px 'Playfair Display', Georgia, serif",
    fontSerif: true,
  },
  nike: {
    label: "Nike",
    sub: "Athletic & kinetic",
    headline: "−50%",
    brand: "NIKE",
    layout: "kinetic",
    chipBg: "accent",
    showStripes: false,
    fontDisplay: "900 24px 'Archivo Black', 'Archivo', system-ui, sans-serif",
  },
};

const W = 180;
const H = 320;

function drawThumbnail(
  ctx: CanvasRenderingContext2D,
  preset: keyof typeof STYLE_BLUEPRINT,
) {
  const p = BG_PRESETS[preset];
  const b = STYLE_BLUEPRINT[preset];

  // ── Background gradient ──
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, p.bgTop);
  grad.addColorStop(0.5, p.bgMid);
  grad.addColorStop(1, p.bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Bandes diagonales (signature adidas/nike) ──
  if (b.showStripes) {
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.fillStyle = p.ink;
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(-40, 20 + i * 28, 320, 14);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Header marque + index dossard ──
  ctx.fillStyle = p.inkSoft;
  ctx.font = "700 8px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText("ÉDITION QUOTIDIENNE", 12, 14);
  ctx.font = "700 9px system-ui, sans-serif";
  ctx.fillStyle = p.ink;
  ctx.textAlign = "right";
  ctx.fillText("01/05", W - 12, 14);
  ctx.textAlign = "left";

  // ── Mock produit (forme abstraite) ──
  const productY = b.layout === "editorial" ? 60 : 50;
  ctx.save();
  ctx.fillStyle = p.ink;
  ctx.globalAlpha = 0.15;
  // semelle ovale
  ctx.beginPath();
  ctx.ellipse(W / 2, productY + 80, 55, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.55;
  // silhouette sneaker stylisée
  ctx.beginPath();
  ctx.moveTo(W / 2 - 50, productY + 75);
  ctx.quadraticCurveTo(W / 2 - 55, productY + 30, W / 2 - 20, productY + 25);
  ctx.quadraticCurveTo(W / 2, productY + 15, W / 2 + 35, productY + 35);
  ctx.quadraticCurveTo(W / 2 + 55, productY + 50, W / 2 + 50, productY + 75);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Variante layout ──
  if (b.layout === "editorial") {
    // ZARA : serif centré sous le produit, prix discret en bas
    ctx.fillStyle = p.inkSoft;
    ctx.font = "500 6.5px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("S É L E C T I O N", W / 2, 175);
    ctx.fillStyle = p.ink;
    ctx.font = b.fontDisplay;
    ctx.fillText(b.headline, W / 2, 200);
    ctx.font = "400 7px system-ui, sans-serif";
    ctx.fillStyle = p.inkSoft;
    ctx.fillText("GOLDEALSCLUB.COM", W / 2, 295);
    ctx.textAlign = "left";
    return;
  }

  // ── ADIDAS / NIKE : bloc ink en bas avec prix + chip ──
  const blockY = 195;
  ctx.fillStyle = p.ink;
  ctx.fillRect(0, blockY, W, H - blockY);

  // 3-stripes frontière (adidas)
  if (b.showStripes) {
    ctx.fillStyle = p.ink;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(0, blockY - 8 + i * 3, W, 1.4);
    }
  }

  // titre court
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "700 6px system-ui, sans-serif";
  ctx.fillText("SNEAKERS", 12, blockY + 12);
  ctx.fillStyle = "#fff";
  ctx.font = "800 11px system-ui, sans-serif";
  ctx.fillText("AIR MAX 90", 12, blockY + 24);

  // prix XXL
  ctx.fillStyle = "#fff";
  ctx.font = b.fontDisplay.replace(/\d+px/, "34px");
  ctx.fillText(b.headline, 12, blockY + 70);

  // chip discount
  const chipColor =
    b.chipBg === "accent" ? p.accent : b.chipBg === "ink" ? p.ink : p.bgTop;
  const chipFg = b.chipBg === "accent" ? "#fff" : p.ink;
  const chipW = 42, chipH = 22;
  const chipX = W - chipW - 12, chipY = blockY + 80;
  ctx.fillStyle = chipColor;
  ctx.fillRect(chipX, chipY, chipW, chipH);
  ctx.fillStyle = chipFg;
  ctx.font = "900 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("−50%", chipX + chipW / 2, chipY + 7);
  ctx.textAlign = "left";
}

interface CardProps {
  styleId: keyof typeof STYLE_BLUEPRINT;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const PreviewCard: React.FC<CardProps> = ({ styleId, active, disabled, onClick }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const b = STYLE_BLUEPRINT[styleId];
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawThumbnail(ctx, styleId);
  }, [styleId, dpr]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-stretch gap-2 rounded-lg border bg-card p-2 text-left transition",
        "hover:border-foreground/50 hover:shadow-md",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active && "border-foreground ring-2 ring-foreground/80 shadow-md",
      )}
    >
      <canvas
        ref={ref}
        style={{ width: W, height: H, display: "block", borderRadius: 6 }}
      />
      <div className="px-1 pb-1">
        <div className="text-sm font-semibold leading-tight">{b.label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight">{b.sub}</div>
      </div>
      {active && (
        <span
          aria-hidden
          className="absolute right-3 top-3 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background"
        >
          Actif
        </span>
      )}
    </button>
  );
};

interface Props {
  value: BgPreset;
  onChange: (v: BgPreset) => void;
  disabled?: boolean;
}

export const StylePreview: React.FC<Props> = ({ value, onChange, disabled }) => {
  const ids: (keyof typeof STYLE_BLUEPRINT)[] = ["adidas", "zara", "nike"];
  return (
    <div className="grid grid-cols-3 gap-3">
      {ids.map((id) => (
        <PreviewCard
          key={id}
          styleId={id}
          active={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
        />
      ))}
    </div>
  );
};
