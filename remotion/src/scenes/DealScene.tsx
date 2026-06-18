import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img } from "remotion";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import type { Deal } from "../data";
import { brandLogos } from "../data";
import { snap, snapScale, settled, fadeIn, slideY, popScale, gpuLayer, TIMING } from "../lib/motion";

const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

// ── Campaign palette : stage clair, encre noire, accent rouge campagne ───
const STAGE_TOP = "#f4f1ea";
const STAGE_BOT = "#e3ddd1";
const INK = "#0a0a0a";
const INK_SOFT = "rgba(10,10,10,0.55)";
const ACCENT = "#0a0a0a"; // gardé sobre, Zara/Nike style

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

  // Wordmark fantôme derrière le produit (entrée lente + drift sub-pixel maîtrisé)
  const ghostSp = settled({ frame, fps, delay: 2, preset: "hero", duration: 40 });
  const ghostOpacity = interpolate(ghostSp, [0, 1], [0, 0.085]);
  const ghostX = snap(interpolate(frame, [0, 140], [-12, 12], { extrapolateRight: "clamp" }));

  // Header marque (logo + numéro édition)
  const headerSp = settled({ frame, fps, delay: TIMING.headerDelay, preset: "header" });
  const headerOpacity = fadeIn(headerSp);
  const headerY = slideY(headerSp, 18);

  // Produit
  const imgSp = settled({ frame, fps, delay: TIMING.imageDelay, preset: "image" });
  const imgOpacity = fadeIn(imgSp);
  const imgScale = popScale(imgSp, 0.94);

  // Ken Burns très léger, arrondi pour zéro shimmer
  const kenZoom = snapScale(interpolate(frame, [0, 140], [1.0, 1.05], { extrapolateRight: "clamp" }));
  const kenPanY = snap(interpolate(frame, [0, 140], [4, -4], { extrapolateRight: "clamp" }));

  // Titre produit
  const titleSp = settled({ frame, fps, delay: TIMING.imageDelay + 4, preset: "header" });
  const titleOpacity = fadeIn(titleSp);
  const titleY = slideY(titleSp, 14);

  // Prix : bloc qui slide depuis le bas
  const priceSp = settled({ frame, fps, delay: TIMING.secondaryDelay, preset: "price" });
  const priceOpacity = fadeIn(priceSp);
  const priceY = slideY(priceSp, 40);

  // Discount chip — pop tardif
  const chipSp = settled({ frame, fps, delay: TIMING.secondaryDelay + 4, preset: "num" });
  const chipScale = popScale(chipSp, 0.7);
  const chipOpacity = fadeIn(chipSp);

  // CTA footer
  const ctaOpacity = interpolate(frame, [TIMING.ctaIn, TIMING.ctaOut], [0, 1], { extrapolateRight: "clamp" });

  const brandLogo = brandLogos[deal.brand];

  const sale = Number(deal.salePrice ?? 0);
  const orig = Number(deal.originalPrice ?? 0);
  const hasOrig = orig > sale && sale > 0;
  const discount = hasOrig ? Math.round((1 - sale / orig) * 100) : 0;

  const brandUpper = (deal.brand || "").toUpperCase();

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${STAGE_TOP} 0%, ${STAGE_TOP} 55%, ${STAGE_BOT} 100%)`,
    }}>
      {/* Spotlight très léger pour donner du volume au produit */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 70% 55% at 50% 52%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
        pointerEvents: "none",
      }} />

      {/* ═══ Wordmark fantôme de la marque (toile de fond éditoriale) ═══ */}
      <div style={{
        position: "absolute", top: 480, left: 0, right: 0,
        textAlign: "center",
        fontFamily: archivo, fontWeight: 900,
        fontSize: 460, lineHeight: 0.85, letterSpacing: -8,
        color: INK,
        opacity: ghostOpacity,
        transform: `translate3d(${ghostX}px, 0, 0)`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        ...gpuLayer,
      }}>{brandUpper}</div>

      {/* ═══ Header : logo marque + N° édition ═══ */}
      <div style={{
        position: "absolute", top: 96, left: 60, right: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: headerOpacity, transform: `translate3d(0, ${headerY}px, 0)`,
        ...gpuLayer,
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 72 }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{ height: 64, width: "auto", objectFit: "contain", filter: "brightness(0)" }} />
          ) : (
            <span style={{
              fontFamily: archivo, fontWeight: 900,
              fontSize: 56, color: INK, letterSpacing: -1,
            }}>{brandUpper}</span>
          )}
        </div>
        <div style={{
          fontFamily: bebas, fontSize: 38, color: INK, letterSpacing: 6, lineHeight: 1,
        }}>
          {String(index + 1).padStart(2, "0")} <span style={{ opacity: 0.4 }}>/</span> {String(total).padStart(2, "0")}
        </div>
      </div>

      {/* ═══ Produit ═══ */}
      <div style={{
        position: "absolute", top: 280, left: 0, right: 0, height: 1080,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: imgOpacity, transform: `scale(${imgScale}) translateZ(0)`,
        ...gpuLayer,
      }}>
        <div style={{
          width: "92%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: "drop-shadow(0 50px 36px rgba(0,0,0,0.22)) drop-shadow(0 8px 12px rgba(0,0,0,0.10))",
          transform: `translate3d(0, ${kenPanY}px, 0) scale(${kenZoom})`,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}>
          <Img src={deal.imageUrl} style={{
            maxWidth: "100%", maxHeight: "100%",
            width: "auto", height: "auto", objectFit: "contain",
            mixBlendMode: "multiply",
          }} />
        </div>
      </div>

      {/* ═══ Titre produit (au-dessus du bloc prix) ═══ */}
      <div style={{
        position: "absolute", left: 60, right: 60, top: 1340,
        opacity: titleOpacity, transform: `translate3d(0, ${titleY}px, 0)`,
        ...gpuLayer,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 18, fontWeight: 700,
          color: INK_SOFT, letterSpacing: 5,
          textTransform: "uppercase",
        }}>{deal.category}</div>
        <div style={{
          marginTop: 14,
          fontFamily: archivo, fontWeight: 800,
          fontSize: 56, color: INK, lineHeight: 1.08, letterSpacing: -0.8,
          textTransform: "uppercase",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>{deal.title}</div>
      </div>

      {/* ═══ Bloc prix campagne ═══ */}
      <div style={{
        position: "absolute", left: 60, right: 60, top: 1560,
        opacity: priceOpacity, transform: `translate3d(0, ${priceY}px, 0)`,
        ...gpuLayer,
      }}>
        {/* Filet noir massif */}
        <div style={{ height: 3, backgroundColor: INK }} />

        <div style={{
          marginTop: 28, display: "flex",
          alignItems: "flex-end", justifyContent: "space-between", gap: 30,
        }}>
          {/* Prix principal — Bebas oversize */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{
              fontFamily: inter, fontSize: 17, fontWeight: 700,
              color: INK_SOFT, letterSpacing: 5,
            }}>PRIX MEMBRE</div>
            <div style={{
              marginTop: 4,
              fontFamily: bebas, fontSize: 220, color: INK,
              lineHeight: 0.85, letterSpacing: -2,
            }}>{fmtPrice(sale)}<span style={{ fontSize: 130, marginLeft: 8 }}>€</span></div>
          </div>

          {/* Colonne droite — prix barré + chip remise */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 22, paddingBottom: 24 }}>
            {hasOrig && (
              <div style={{
                fontFamily: inter, fontSize: 32, fontWeight: 600,
                color: INK_SOFT, textDecoration: "line-through",
                textDecorationThickness: 2,
              }}>{fmtPrice(orig)} €</div>
            )}
            {hasOrig && (
              <div style={{
                transform: `scale(${chipScale}) translateZ(0)`,
                opacity: chipOpacity,
                background: INK, color: STAGE_TOP,
                padding: "16px 28px",
                fontFamily: archivo, fontWeight: 900, fontSize: 52,
                letterSpacing: -1, lineHeight: 1,
                ...gpuLayer,
              }}>−{discount}%</div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CTA bas ═══ */}
      <div style={{
        position: "absolute", bottom: 70, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: ctaOpacity,
        fontFamily: inter, fontWeight: 700,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <span style={{ fontSize: 30, color: INK, letterSpacing: 4 }}>VOIR L'OFFRE</span>
          <span style={{
            display: "inline-block", width: 60, height: 2, background: INK, position: "relative",
          }}>
            <span style={{
              position: "absolute", right: -1, top: -6,
              width: 12, height: 12, borderTop: `2px solid ${INK}`, borderRight: `2px solid ${INK}`,
              transform: "rotate(45deg)",
            }} />
          </span>
        </div>
        <span style={{ fontSize: 22, color: INK, letterSpacing: 5 }}>GOLDEALSCLUB.COM</span>
      </div>
    </AbsoluteFill>
  );
};
