import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Playfair";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { Deal } from "../data";
import { brandLogos } from "../data";

const { fontFamily: playfair } = loadFont("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

// ── Paper & Ink ───────────────────────────────────────────────────────
const PAPER = "#f5f3ee";
const PAPER_MID = "#efece5";
const INK = "#0d0d0d";
const INK_SOFT = "rgba(13,13,13,0.55)";
const RULE = "rgba(13,13,13,0.22)";

interface DealSceneProps {
  deal: Deal;
  index: number;
  total?: number;
}

const fmtPrice = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? `${r}` : r.toFixed(2);
};

export const DealScene: React.FC<DealSceneProps> = ({ deal, index, total = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Helpers anti-jitter : snap entier pixel & arrondi scale
  const snap = (v: number) => Math.round(v);
  const snapScale = (v: number) => Math.round(v * 1000) / 1000;
  // Une fois la spring quasi-stabilisée, on fige la valeur pour éviter
  // les micro-oscillations sub-pixel qui font shimmer la typo.
  const settle = (v: number) => (v > 0.995 ? 1 : v);

  // Entrée éditoriale séquentielle
  const railOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const headerSp = settle(spring({ frame: frame - 4, fps, config: { damping: 22, stiffness: 120 }, durationInFrames: 30 }));
  const headerOpacity = interpolate(headerSp, [0, 1], [0, 1]);
  const headerY = snap(interpolate(headerSp, [0, 1], [16, 0]));

  const imgSp = settle(spring({ frame: frame - 12, fps, config: { damping: 24, stiffness: 100 }, durationInFrames: 30 }));
  const imgOpacity = interpolate(imgSp, [0, 1], [0, 1]);
  const imgScale = snapScale(interpolate(imgSp, [0, 1], [0.96, 1]));

  // Ken Burns (arrondis pour éviter le scintillement)
  const kenZoom = snapScale(interpolate(frame, [0, 140], [1.0, 1.04], { extrapolateRight: "clamp" }));
  const kenPanX = snap(interpolate(frame, [0, 140], [-3, 3], { extrapolateRight: "clamp" }) * (index % 2 === 0 ? 1 : -1));
  const kenPanY = snap(interpolate(frame, [0, 140], [2, -2], { extrapolateRight: "clamp" }));

  const priceSp = settle(spring({ frame: frame - 22, fps, config: { damping: 22, stiffness: 130 }, durationInFrames: 30 }));
  const priceOpacity = interpolate(priceSp, [0, 1], [0, 1]);
  const priceY = snap(interpolate(priceSp, [0, 1], [18, 0]));

  const ctaOpacity = interpolate(frame, [38, 52], [0, 1], { extrapolateRight: "clamp" });

  // Styles communs pour stabiliser le rendu typographique
  const gpuLayer: React.CSSProperties = {
    willChange: "transform, opacity",
    backfaceVisibility: "hidden",
    WebkitFontSmoothing: "antialiased",
    transform: "translateZ(0)",
  };

  const brandLogo = brandLogos[deal.brand];

  const sale = Number(deal.salePrice ?? 0);
  const orig = Number(deal.originalPrice ?? 0);
  const hasOrig = orig > sale && sale > 0;
  const discount = hasOrig ? Math.round((1 - sale / orig) * 100) : 0;

  const dateLabel = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getFullYear()).slice(-2)}`;
  })();

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {/* Lumière éditoriale */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 32% 30%, rgba(255,253,247,0.55) 0%, ${PAPER_MID} 55%, #e8e4dd 100%)`,
      }} />

      {/* Grain */}
      <AbsoluteFill style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "3px 3px, 5px 5px",
        backgroundPosition: "0 0, 1px 2px",
        mixBlendMode: "multiply",
        opacity: 0.6,
      }} />

      {/* Cadre hairline */}
      <div style={{ position: "absolute", top: 92, left: 60, right: 60, height: 1, backgroundColor: RULE, opacity: railOpacity }} />
      <div style={{ position: "absolute", bottom: 92, left: 60, right: 60, height: 1, backgroundColor: RULE, opacity: railOpacity }} />
      {[
        { top: 80, left: 60 }, { top: 80, right: 60 },
        { bottom: 80, left: 60 }, { bottom: 80, right: 60 },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute", width: 1, height: 24,
          backgroundColor: RULE, opacity: railOpacity, ...s,
        }} />
      ))}

      {/* Rail haut */}
      <div style={{
        position: "absolute", top: 64, left: 60,
        fontFamily: inter, fontSize: 19, fontWeight: 600, color: INK_SOFT, letterSpacing: 6, opacity: railOpacity,
      }}>GOLDEALS · ÉDITION</div>
      <div style={{
        position: "absolute", top: 64, right: 60,
        fontFamily: inter, fontSize: 18, fontWeight: 500, color: INK_SOFT, letterSpacing: 4, opacity: railOpacity,
        display: "flex", gap: 16, alignItems: "baseline",
      }}>
        <span>{dateLabel}</span>
        <span style={{ opacity: 0.6 }}>·</span>
        <span>N° {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}</span>
      </div>

      {/* ═══ Header marque + titre ═══ */}
      <div style={{
        position: "absolute", top: 160, left: 60, right: 60,
        opacity: headerOpacity, transform: `translateY(${headerY}px)`,
      }}>
        {/* Marque */}
        <div style={{ height: 100, display: "flex", alignItems: "center" }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{ height: 90, width: "auto", objectFit: "contain", filter: "brightness(0)" }} />
          ) : (
            <span style={{
              fontFamily: playfair, fontStyle: "italic", fontWeight: 700,
              fontSize: 78, color: INK, letterSpacing: -1,
            }}>{deal.brand}</span>
          )}
        </div>

        {/* Hairline + label */}
        <div style={{ marginTop: 24, height: 1, backgroundColor: RULE }} />
        <div style={{
          marginTop: 22,
          fontFamily: inter, fontSize: 17, fontWeight: 600,
          color: INK_SOFT, letterSpacing: 5,
        }}>L'OBJET DU JOUR</div>

        {/* Titre serif italic */}
        <div style={{
          marginTop: 28,
          fontFamily: playfair, fontStyle: "italic", fontWeight: 500,
          fontSize: 46, color: INK, lineHeight: 1.18, letterSpacing: -0.2,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{deal.title}</div>
      </div>

      {/* ═══ Produit ═══ */}
      <div style={{
        position: "absolute", top: 510, left: 0, right: 0, height: 880,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: imgOpacity, transform: `scale(${imgScale})`,
      }}>
        <div style={{
          width: "88%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: "drop-shadow(0 30px 28px rgba(0,0,0,0.18))",
          transform: `scale(${kenZoom}) translate(${kenPanX}px, ${kenPanY}px)`,
          transformOrigin: "center",
        }}>
          <Img src={deal.imageUrl} style={{
            maxWidth: "100%", maxHeight: "100%",
            width: "auto", height: "auto", objectFit: "contain",
            mixBlendMode: "multiply",
          }} />
        </div>
      </div>

      {/* ═══ Bande prix ═══ */}
      <div style={{
        position: "absolute", left: 60, right: 60, top: 1420,
        opacity: priceOpacity, transform: `translateY(${priceY}px)`,
      }}>
        {/* Hairline + label + remise */}
        <div style={{ height: 1, backgroundColor: RULE }} />
        <div style={{
          marginTop: 18, display: "flex", justifyContent: "space-between",
          fontFamily: inter, fontWeight: 600, letterSpacing: 6, fontSize: 17,
        }}>
          <span style={{ color: INK_SOFT }}>PRIX</span>
          {hasOrig && <span style={{ color: INK, letterSpacing: 4, fontSize: 19, fontWeight: 700 }}>-{discount}%</span>}
        </div>

        {/* Prix principal + barré */}
        <div style={{
          marginTop: 12, display: "flex",
          alignItems: "baseline", justifyContent: "space-between", gap: 30,
        }}>
          <div style={{
            fontFamily: playfair, fontStyle: "italic", fontWeight: 500,
            fontSize: 138, color: INK, lineHeight: 1, letterSpacing: -2,
          }}>{fmtPrice(sale)} €</div>

          {hasOrig && (
            <div style={{
              fontFamily: inter, fontSize: 34, fontWeight: 500,
              color: INK_SOFT, textDecoration: "line-through",
              textDecorationThickness: 1.8,
            }}>{fmtPrice(orig)} €</div>
          )}
        </div>

        {/* Hairline */}
        <div style={{ marginTop: 30, height: 1, backgroundColor: RULE }} />
      </div>

      {/* ═══ CTA éditorial ═══ */}
      <div style={{
        position: "absolute", bottom: 116, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: ctaOpacity,
        fontFamily: inter, fontWeight: 600,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <span style={{ fontSize: 38, color: INK, letterSpacing: 4 }}>VOIR L'OFFRE</span>
          <span style={{
            display: "inline-block", width: 70, height: 2, background: INK,
            position: "relative",
          }}>
            <span style={{
              position: "absolute", right: -1, top: -7,
              width: 14, height: 14, borderTop: `2px solid ${INK}`, borderRight: `2px solid ${INK}`,
              transform: "rotate(45deg)",
            }} />
          </span>
        </div>
        <span style={{ fontSize: 20, color: INK, letterSpacing: 5 }}>GOLDEALSCLUB.COM</span>
      </div>

      {/* Crédit pied de page */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center",
        fontFamily: inter, fontSize: 16, fontWeight: 500, color: INK_SOFT, letterSpacing: 6,
      }}>ÉDITION QUOTIDIENNE · GOLDEALS CLUB</div>
    </AbsoluteFill>
  );
};
