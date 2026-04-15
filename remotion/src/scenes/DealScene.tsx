import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import type { Deal } from "../data";
import { brandLogos } from "../data";

interface DealSceneProps {
  deal: Deal;
  index: number;
}

const PHOTO_BG = "#eaecf0";
const IVOIRE = "#f6f0e9";
const NOIR = "#111111";
const TAUPE = "#45403a";

// Flame count based on discount
const getFlameCount = (discount: number): number => {
  if (discount >= 50) return 3;
  if (discount >= 30) return 2;
  return 1;
};

const getFlameLabel = (discount: number): string => {
  if (discount >= 50) return "SUPER DEAL";
  if (discount >= 30) return "BON DEAL";
  return "DEAL";
};

// SVG flame component (no emoji — Chromium renderer doesn't support color emoji)
const FlameSvg: React.FC<{ size?: number; color?: string }> = ({ size = 32, color = "#FF6B35" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 23C16.5 23 20 19.5 20 15C20 11 17 8.5 15.5 7.5C15.5 9 14.5 11 13 12C13 10 12.5 7.5 10 5C9.5 7.5 8 9 6.5 11C5.5 12.5 4 14 4 16C4 19.5 7.5 23 12 23Z"/>
  </svg>
);


export const DealScene: React.FC<DealSceneProps> = ({ deal, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rankNum = index + 1;

  // Image entrance
  const imgScale = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 110 } }),
    [0, 1], [1.12, 1]
  );
  const imgY = interpolate(
    spring({ frame, fps, config: { damping: 16, stiffness: 160 } }),
    [0, 1], [80, 0]
  );
  const imgOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  // Brand logo
  const logoScale = spring({ frame: frame - 6, fps, config: { damping: 12, stiffness: 180 } });
  const logoOpacity = interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" });

  // Rank badge
  const badgeScale = spring({ frame: frame - 3, fps, config: { damping: 10, stiffness: 200 } });

  // Title
  const titleY = interpolate(
    spring({ frame: frame - 14, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [30, 0]
  );
  const titleOpacity = interpolate(frame, [14, 24], [0, 1], { extrapolateRight: "clamp" });

  // PRICE — dramatic bounce
  const priceScale = spring({ frame: frame - 20, fps, config: { damping: 7, stiffness: 120 } });
  const priceOpacity = interpolate(frame, [20, 32], [0, 1], { extrapolateRight: "clamp" });

  // Discount badge — dramatic
  const discountScale = spring({ frame: frame - 26, fps, config: { damping: 6, stiffness: 180 } });
  const discountOpacity = interpolate(frame, [26, 36], [0, 1], { extrapolateRight: "clamp" });

  // Flames
  const flameScale = spring({ frame: frame - 30, fps, config: { damping: 8, stiffness: 200 } });

  // Link
  const linkY = interpolate(
    spring({ frame: frame - 36, fps, config: { damping: 200 } }),
    [0, 1], [20, 0]
  );
  const linkOpacity = interpolate(frame, [36, 46], [0, 1], { extrapolateRight: "clamp" });

  const floatY = Math.sin(frame * 0.04) * 3;
  const brandLogo = brandLogos[deal.brand];
  const flameCount = getFlameCount(deal.discountPercent);
  const flameLabel = getFlameLabel(deal.discountPercent);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: PHOTO_BG }} />

      {/* ═══ TOP BAR — GOLDEALS CLUB ═══ */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 110,
        backgroundColor: NOIR,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 40px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 9,
            backgroundColor: IVOIRE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "Georgia, serif",
              fontSize: 25,
              fontWeight: 700,
              color: NOIR,
              lineHeight: 1,
            }}>G</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{
              fontFamily: "sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: IVOIRE,
              letterSpacing: 3,
            }}>GOLDEALS CLUB</span>
          </div>
        </div>

        {/* Rank badge */}
        <div style={{
          transform: `scale(${badgeScale})`,
          backgroundColor: IVOIRE,
          color: NOIR,
          width: 52,
          height: 52,
          borderRadius: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 24,
          fontWeight: 800,
        }}>
          #{rankNum}
        </div>
      </div>

      {/* ═══ PRODUCT IMAGE — HERO SIZE ═══ */}
      <div style={{
        position: "absolute",
        top: 130,
        left: 24,
        right: 24,
        height: 750,
        borderRadius: 20,
        backgroundColor: "#ffffff",
        overflow: "hidden",
        transform: `translateY(${imgY + floatY}px) scale(${imgScale})`,
        opacity: imgOpacity,
        boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}>
        <Img
          src={deal.imageUrl}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: "scale(1.15)",
          }}
        />
      </div>

      {/* ═══ BRAND LOGO + TITLE SECTION ═══ */}
      <div style={{
        position: "absolute",
        top: 900,
        left: 44,
        right: 44,
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
      }}>
        {/* Brand logo */}
        {brandLogo && (
          <div style={{
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            height: 44,
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
          }}>
            <Img src={brandLogo} style={{ height: 40, objectFit: "contain" }} />
          </div>
        )}

        <div style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 500,
          color: TAUPE,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: 0.6,
          marginBottom: 8,
        }}>
          {deal.category} · {deal.merchant}
        </div>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 32,
          fontWeight: 700,
          color: NOIR,
          lineHeight: 1.2,
        }}>
          {deal.title}
        </div>
      </div>

      {/* ═══ MASSIVE PRICE SECTION ═══ */}
      <div style={{
        position: "absolute",
        bottom: 340,
        left: 44,
        right: 44,
        transform: `scale(${priceScale})`,
        opacity: priceOpacity,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 140,
            fontWeight: 900,
            color: NOIR,
            lineHeight: 1,
            letterSpacing: -4,
          }}>
            {deal.salePrice}€
          </span>
        </div>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 44,
          fontWeight: 400,
          color: TAUPE,
          textDecoration: "line-through",
          opacity: 0.45,
          marginTop: 4,
        }}>
          {deal.originalPrice}€
        </div>
      </div>

      {/* ═══ DISCOUNT + FLAMES ROW ═══ */}
      <div style={{
        position: "absolute",
        bottom: 210,
        left: 44,
        right: 44,
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        {/* Big discount badge */}
        <div style={{
          transform: `scale(${discountScale})`,
          opacity: discountOpacity,
          backgroundColor: NOIR,
          color: IVOIRE,
          padding: "18px 36px",
          borderRadius: 40,
          fontFamily: "sans-serif",
          fontSize: 38,
          fontWeight: 900,
          letterSpacing: 2,
        }}>
          -{deal.discountPercent}%
        </div>

        {/* Flames + label */}
        <div style={{
          transform: `scale(${flameScale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 2,
        }}>
          <span style={{ fontSize: 36 }}>{flames}</span>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: TAUPE,
            letterSpacing: 2,
            opacity: 0.7,
          }}>{flameLabel}</span>
        </div>
      </div>

      {/* ═══ LINK BUTTON ═══ */}
      <div style={{
        position: "absolute",
        bottom: 100,
        left: 44,
        right: 44,
        transform: `translateY(${linkY}px)`,
        opacity: linkOpacity,
      }}>
        <div style={{
          backgroundColor: NOIR,
          borderRadius: 14,
          padding: "20px 36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: IVOIRE,
            letterSpacing: 1.5,
          }}>
            {deal.productUrl}
          </span>
        </div>
      </div>

      {/* Bottom hint */}
      <div style={{
        position: "absolute",
        bottom: 50,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "sans-serif",
          fontSize: 13,
          fontWeight: 400,
          color: TAUPE,
          opacity: 0.35,
          letterSpacing: 2,
        }}>
          {rankNum < 5 ? "▼ DEAL SUIVANT" : "▼ DERNIER DEAL"}
        </span>
      </div>
    </AbsoluteFill>
  );
};
