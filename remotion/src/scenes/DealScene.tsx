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

      {/* ═══ HEADER : logo marque ═══ */}
      <div style={{
        position: "absolute",
        top: 90,
        left: 56,
        right: 56,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 30,
      }}>
        {/* Bloc gauche : logo + titre (comme la capture Instagram) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", height: 90 }}>
            {brandLogo ? (
              <Img src={brandLogo} style={{ height: 80, width: "auto", objectFit: "contain" }} />
            ) : (
              <span style={{
                fontFamily: "sans-serif",
                fontSize: 42,
                fontWeight: 900,
                color: INK,
                letterSpacing: -1,
                textTransform: "uppercase",
              }}>{deal.brand}</span>
            )}
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 800,
            color: INK,
            textTransform: "uppercase",
            letterSpacing: 0.3,
            lineHeight: 1.15,
            maxWidth: 560,
          }}>
            {deal.title}
          </div>
        </div>

        {/* Bloc prix à droite */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 12,
          transform: `scale(${priceScale})`,
          transformOrigin: "top right",
          flexShrink: 0,
        }}>
          <div style={{
            backgroundColor: RED,
            color: "#fff",
            padding: "16px 30px",
            fontFamily: "sans-serif",
            fontSize: 50,
            fontWeight: 800,
            letterSpacing: -1,
            lineHeight: 1,
            boxShadow: `0 0 0 4px #fff, 0 0 0 7px ${RED}`,
          }}>
            {Number.isInteger(deal.salePrice) ? `${deal.salePrice}.00` : deal.salePrice.toFixed(2)} €
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 30,
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

      {/* ═══ Produit détouré, centré ═══ */}
      <div style={{
        position: "absolute",
        top: 420,
        left: 0,
        right: 0,
        bottom: 280,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}>
        {/* Wrapper avec drop-shadow appliqué APRÈS le blend (sur le silhouette) */}
        <div style={{
          width: "88%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          filter: "drop-shadow(0 25px 30px rgba(0,0,0,0.22))",
          transform: `scale(${kenZoom}) translate(${kenPanX}px, ${kenPanY}px)`,
          transformOrigin: "center center",
          willChange: "transform",
        }}>
          <Img
            src={deal.imageUrl}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              // mix-blend multiply supprime les fonds blancs des photos produit
              // → vrai effet "détouré" sur fond gris studio
              mixBlendMode: "multiply",
            }}
          />
        </div>
      </div>

      {/* ═══ CTA "🔗 Acheter" (pilule blanche) ═══ */}
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
          padding: "26px 80px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
        }}>
          <LinkIcon size={38} />
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 54,
            fontWeight: 500,
            color: INK,
            letterSpacing: -0.5,
          }}>
            Acheter
          </span>
        </div>
      </div>

      {/* Barre noire bas (sponsorisé) */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        backgroundColor: "#000",
        display: "flex",
        alignItems: "center",
        paddingLeft: 36,
      }}>
        <span style={{
          fontFamily: "sans-serif",
          fontSize: 22,
          fontWeight: 400,
          color: "#fff",
          opacity: 0.95,
        }}>
          Sponsorisé
        </span>
      </div>
    </AbsoluteFill>
  );
};

