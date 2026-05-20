import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import type { Deal } from "../data";
import { brandLogos } from "../data";

interface DealSceneProps {
  deal: Deal;
  index: number;
}

// Palette inspirée des pubs Instagram adidas (fond gris clair, prix rouge)
const BG = "#eaecf0";
const INK = "#0a0a0a";
const RED = "#e11d2a";
const MUTED = "#6b6b6b";

const LinkIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#1d8cf0" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  </svg>
);

export const DealScene: React.FC<DealSceneProps> = ({ deal, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade global doux
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Ken Burns très subtil et lent sur l'image (pas de jump entre scènes)
  const kenZoom = interpolate(frame, [0, 140], [1.0, 1.05], { extrapolateRight: "clamp" });
  const panDir = index % 2 === 0 ? 1 : -1;
  const kenPanX = interpolate(frame, [0, 140], [-5 * panDir, 6 * panDir], { extrapolateRight: "clamp" });
  const kenPanY = interpolate(frame, [0, 140], [3, -5], { extrapolateRight: "clamp" });

  // Prix : entrée légère
  const priceIn = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 180 } });
  const priceScale = interpolate(priceIn, [0, 1], [0.92, 1]);

  // CTA fade
  const ctaOpacity = interpolate(frame, [22, 36], [0, 1], { extrapolateRight: "clamp" });

  const brandLogo = brandLogos[deal.brand];

  return (
    <AbsoluteFill style={{ backgroundColor: BG, opacity }}>
      {/* Léger dégradé pour donner de la profondeur (studio look) */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 45%, #f4f5f7 0%, #e2e4e8 70%, #d6d8dc 100%)",
      }} />

      {/* ═══ HEADER : logo marque + prix ═══ */}
      <div style={{
        position: "absolute",
        top: 110,
        left: 56,
        right: 56,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        {/* Logo marque */}
        <div style={{ display: "flex", alignItems: "center", height: 80 }}>
          {brandLogo ? (
            <Img src={brandLogo} style={{ height: 70, width: "auto", objectFit: "contain" }} />
          ) : (
            <span style={{
              fontFamily: "sans-serif",
              fontSize: 36,
              fontWeight: 900,
              color: INK,
              letterSpacing: -1,
              textTransform: "uppercase",
            }}>{deal.brand}</span>
          )}
        </div>

        {/* Bloc prix */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 10,
          transform: `scale(${priceScale})`,
          transformOrigin: "top right",
        }}>
          <div style={{
            backgroundColor: RED,
            border: `3px solid ${RED}`,
            color: "#fff",
            padding: "14px 28px",
            fontFamily: "sans-serif",
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1,
            boxShadow: "0 0 0 4px #fff inset",
          }}>
            <span style={{ color: RED, background: "#fff", padding: "8px 18px", display: "inline-block" }}>
              {Number.isInteger(deal.salePrice) ? `${deal.salePrice}.00` : deal.salePrice.toFixed(2)} €
            </span>
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 500,
            color: INK,
            textDecoration: "line-through",
            textDecorationColor: INK,
            opacity: 0.85,
          }}>
            {Number.isInteger(deal.originalPrice) ? `${deal.originalPrice}.00` : deal.originalPrice.toFixed(2)} €
          </div>
        </div>
      </div>

      {/* ═══ Titre produit ═══ */}
      <div style={{
        position: "absolute",
        top: 230,
        left: 56,
        right: 56,
        fontFamily: "sans-serif",
        fontSize: 36,
        fontWeight: 800,
        color: INK,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        lineHeight: 1.15,
      }}>
        {deal.title}
      </div>

      {/* ═══ Produit détouré, centré, plein cadre ═══ */}
      <div style={{
        position: "absolute",
        top: 360,
        left: 0,
        right: 0,
        bottom: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        <Img
          src={deal.imageUrl}
          style={{
            maxWidth: "88%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            transform: `scale(${kenZoom}) translate(${kenPanX}px, ${kenPanY}px)`,
            transformOrigin: "center center",
            filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.18))",
            willChange: "transform",
          }}
        />
      </div>

      {/* ═══ CTA "Acheter" ═══ */}
      <div style={{
        position: "absolute",
        bottom: 110,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: ctaOpacity,
      }}>
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 80,
          padding: "26px 70px",
          display: "flex",
          alignItems: "center",
          gap: 22,
          boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
        }}>
          <LinkIcon size={36} />
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 52,
            fontWeight: 500,
            color: INK,
            letterSpacing: -0.5,
          }}>
            Acheter
          </span>
        </div>
      </div>

      {/* Barre noire bas (sponsorisé) — clin d'œil aux ads IG */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        backgroundColor: "#000",
      }} />
    </AbsoluteFill>
  );
};
