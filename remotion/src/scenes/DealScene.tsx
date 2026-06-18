/**
 * DealScene — direction Adidas geometric & graphic.
 *
 * Grille tranchée :
 *  - Ivoire en haut (60%) : produit full-bleed centré, wordmark marque
 *    en bandeau diagonal derrière.
 *  - Bloc noir en bas (40%) : prix XXL + chip −% glissée depuis la droite.
 *  - Bande tricolore horizontale (3-stripes) cale la frontière haut/bas.
 *
 * Motion ferme : tout en linear ease, pas de spring bouncy.
 */
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig, Img } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import type { Deal } from "../data";
import { brandLogos } from "../data";
import { snap, snapScale, gpuLayer } from "../lib/motion";

const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const INK = "#0a0a0a";
const PAPER = "#f4f1ea";
const PAPER_DEEP = "#e3ddd1";
const INK_SOFT = "rgba(10,10,10,0.55)";
const PAPER_SOFT = "rgba(244,241,234,0.6)";

interface DealSceneProps {
  deal: Deal;
  index: number;
  total?: number;
}

const fmtPrice = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? `${r}` : r.toFixed(2);
};

const linEase = (t: number) => Math.max(0, Math.min(1, t));

const slideIn = (frame: number, delay: number, dur: number, from: number) => {
  const t = linEase((frame - delay) / dur);
  return { t, y: snap(interpolate(t, [0, 1], [from, 0])) };
};

export const DealScene: React.FC<DealSceneProps> = ({ deal, index, total = 5 }) => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  // ── Bloc noir bas — slide from bottom ──
  const blockT = linEase((frame - 18) / 16);
  const blockY = snap(interpolate(blockT, [0, 1], [320, 0]));

  // ── Bandes 3-stripes (frontière haut/bas) ──
  const stripeT = (i: number) => linEase((frame - (10 + i * 3)) / 14);

  // ── Header marque ──
  const headT = linEase((frame - 4) / 12);
  const headY = snap(interpolate(headT, [0, 1], [-26, 0]));

  // ── Produit : entrée nette + Ken Burns ferme ──
  const imgT = linEase((frame - 10) / 18);
  const imgScale = snapScale(interpolate(imgT, [0, 1], [0.94, 1]));
  const kenZoom = snapScale(interpolate(frame, [0, 130], [1.0, 1.06], { extrapolateRight: "clamp" }));
  const kenPanX = snap(interpolate(frame, [0, 130], [-6, 6], { extrapolateRight: "clamp" }));

  // ── Wordmark marque diagonal derrière le produit ──
  const ghostT = linEase((frame - 6) / 22);
  const ghostX = snap(interpolate(frame, [0, 130], [-10, 10], { extrapolateRight: "clamp" }));

  // ── Titre produit ──
  const titleSlide = slideIn(frame, 22, 14, 20);

  // ── Prix : slide from right ──
  const priceT = linEase((frame - 30) / 14);
  const priceX = snap(interpolate(priceT, [0, 1], [120, 0]));

  // ── Discount chip : slide from right plus tardif ──
  const chipT = linEase((frame - 40) / 12);
  const chipX = snap(interpolate(chipT, [0, 1], [180, 0]));

  // ── CTA footer ──
  const ctaT = linEase((frame - 50) / 14);

  const brandLogo = brandLogos[deal.brand];
  const sale = Number(deal.salePrice ?? 0);
  const orig = Number(deal.originalPrice ?? 0);
  const hasOrig = orig > sale && sale > 0;
  const discount = hasOrig ? Math.round((1 - sale / orig) * 100) : 0;
  const brandUpper = (deal.brand || "").toUpperCase();

  // Frontière haut/bas
  const BORDER_Y = 1180;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER_DEEP} 100%)`,
    }}>
      {/* ═══ Wordmark marque diagonal derrière le produit ═══ */}
      <div style={{
        position: "absolute",
        top: 380, left: -120, right: -120,
        textAlign: "center",
        fontFamily: archivo, fontWeight: 900,
        fontSize: 420, lineHeight: 0.85, letterSpacing: -12,
        color: INK,
        opacity: ghostT * 0.07,
        transform: `translate3d(${ghostX}px, 0, 0) rotate(-8deg)`,
        whiteSpace: "nowrap", overflow: "hidden",
        textTransform: "uppercase",
        ...gpuLayer,
      }}>{brandUpper}</div>

      {/* ═══ Header marque + index ═══ */}
      <div style={{
        position: "absolute", top: 90, left: 60, right: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: headT, transform: `translate3d(0, ${headY}px, 0)`,
        ...gpuLayer,
      }}>
        <div style={{ display: "flex", alignItems: "center", height: 72 }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{ height: 60, width: "auto", objectFit: "contain", filter: "brightness(0)" }} />
          ) : (
            <span style={{
              fontFamily: archivo, fontWeight: 900,
              fontSize: 52, color: INK, letterSpacing: -1,
              textTransform: "uppercase",
            }}>{brandUpper}</span>
          )}
        </div>
        {/* Index : encadré façon dossard */}
        <div style={{
          padding: "10px 22px",
          border: `3px solid ${INK}`,
          fontFamily: archivo, fontWeight: 900, fontSize: 36,
          color: INK, letterSpacing: 0, lineHeight: 1,
        }}>
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </div>
      </div>

      {/* ═══ Produit ═══ */}
      <div style={{
        position: "absolute", top: 220, left: 0, right: 0, height: 900,
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: imgT, transform: `scale(${imgScale}) translateZ(0)`,
        ...gpuLayer,
      }}>
        <div style={{
          width: "88%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          filter: "drop-shadow(0 50px 36px rgba(0,0,0,0.22)) drop-shadow(0 8px 12px rgba(0,0,0,0.10))",
          transform: `translate3d(${kenPanX}px, 0, 0) scale(${kenZoom})`,
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

      {/* ═══ 3-stripes — frontière haut/bas ═══ */}
      {[0, 1, 2].map((i) => {
        const t = stripeT(i);
        const w = snap(interpolate(t, [0, 1], [0, 1080]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: BORDER_Y - 30 + i * 10,
            left: 0,
            height: 4,
            width: w,
            background: INK,
            ...gpuLayer,
          }} />
        );
      })}

      {/* ═══ Bloc noir bas (prix + titre) ═══ */}
      <div style={{
        position: "absolute",
        top: BORDER_Y, left: 0, right: 0, bottom: 0,
        background: INK,
        transform: `translate3d(0, ${blockY}px, 0)`,
        opacity: blockT,
        ...gpuLayer,
      }}>
        {/* Titre produit (en haut du bloc noir) */}
        <div style={{
          position: "absolute", top: 50, left: 60, right: 60,
          opacity: titleSlide.t,
          transform: `translate3d(0, ${titleSlide.y}px, 0)`,
          ...gpuLayer,
        }}>
          <div style={{
            fontFamily: inter, fontSize: 17, fontWeight: 700,
            color: PAPER_SOFT, letterSpacing: 6,
            textTransform: "uppercase",
          }}>{deal.category}</div>
          <div style={{
            marginTop: 12,
            fontFamily: archivo, fontWeight: 800,
            fontSize: 46, color: PAPER, lineHeight: 1.05, letterSpacing: -0.5,
            textTransform: "uppercase",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>{deal.title}</div>
        </div>

        {/* Bloc prix */}
        <div style={{
          position: "absolute", left: 60, right: 60, top: 250,
          display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30,
        }}>
          {/* Prix principal */}
          <div style={{
            opacity: priceT, transform: `translate3d(${priceX}px, 0, 0)`,
            ...gpuLayer,
          }}>
            <div style={{
              fontFamily: inter, fontSize: 16, fontWeight: 700,
              color: PAPER_SOFT, letterSpacing: 6,
              textTransform: "uppercase",
            }}>Prix membre</div>
            <div style={{
              marginTop: 8,
              fontFamily: archivo, fontWeight: 900,
              fontSize: 230, color: PAPER,
              lineHeight: 0.85, letterSpacing: -8,
            }}>{fmtPrice(sale)}<span style={{ fontSize: 130, marginLeft: 8 }}>€</span></div>
          </div>

          {/* Discount chip rectangulaire */}
          {hasOrig && (
            <div style={{
              opacity: chipT,
              transform: `translate3d(${chipX}px, 0, 0)`,
              ...gpuLayer,
              display: "flex", flexDirection: "column", alignItems: "flex-end",
              gap: 18, paddingBottom: 24,
            }}>
              <div style={{
                fontFamily: inter, fontSize: 30, fontWeight: 600,
                color: PAPER_SOFT, textDecoration: "line-through",
                textDecorationThickness: 2,
              }}>{fmtPrice(orig)} €</div>
              <div style={{
                background: PAPER, color: INK,
                padding: "18px 26px",
                fontFamily: archivo, fontWeight: 900,
                fontSize: 64, letterSpacing: -2, lineHeight: 1,
                border: `3px solid ${PAPER}`,
              }}>−{discount}%</div>
            </div>
          )}
        </div>

        {/* CTA bas du bloc noir */}
        <div style={{
          position: "absolute", bottom: 60, left: 60, right: 60,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          opacity: ctaT,
          fontFamily: inter, fontWeight: 700,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ fontSize: 26, color: PAPER, letterSpacing: 4 }}>VOIR L'OFFRE</span>
            <span style={{ width: 60, height: 2, background: PAPER }} />
          </div>
          <span style={{
            fontFamily: bebas, fontSize: 26,
            color: PAPER_SOFT, letterSpacing: 6,
          }}>GOLDEALSCLUB.COM</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
