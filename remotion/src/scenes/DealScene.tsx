import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import type { Deal } from "../data";
import { brandLogos } from "../data";

interface DealSceneProps {
  deal: Deal;
  index: number;
}

// Photo surface grey from the site: hsl(220, 12%, 93%)
const PHOTO_BG = "#eaecf0";
const IVOIRE = "#f6f0e9";
const NOIR = "#111111";
const TAUPE = "#45403a";
const SABLE = "#d4c4b0";

export const DealScene: React.FC<DealSceneProps> = ({ deal, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rankNum = index + 1;

  // === ANIMATIONS ===

  // Image: scale up dramatically
  const imgScale = interpolate(
    spring({ frame, fps, config: { damping: 14, stiffness: 100 } }),
    [0, 1], [1.15, 1]
  );
  const imgY = interpolate(
    spring({ frame, fps, config: { damping: 18, stiffness: 180 } }),
    [0, 1], [100, 0]
  );
  const imgOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // Brand logo
  const logoScale = spring({ frame: frame - 8, fps, config: { damping: 12, stiffness: 180 } });
  const logoOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateRight: "clamp" });

  // Rank badge
  const badgeScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 200 } });

  // Title
  const titleY = interpolate(
    spring({ frame: frame - 18, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const titleOpacity = interpolate(frame, [18, 30], [0, 1], { extrapolateRight: "clamp" });

  // PRICE — dramatic entrance
  const priceScale = spring({ frame: frame - 25, fps, config: { damping: 8, stiffness: 150 } });
  const priceOpacity = interpolate(frame, [25, 38], [0, 1], { extrapolateRight: "clamp" });

  // Discount pill
  const discountScale = spring({ frame: frame - 32, fps, config: { damping: 8, stiffness: 200 } });

  // Link
  const linkY = interpolate(
    spring({ frame: frame - 40, fps, config: { damping: 200 } }),
    [0, 1], [20, 0]
  );
  const linkOpacity = interpolate(frame, [40, 52], [0, 1], { extrapolateRight: "clamp" });

  // Subtle float
  const floatY = Math.sin(frame * 0.04) * 3;

  const brandLogo = brandLogos[deal.brand];

  return (
    <AbsoluteFill>
      {/* Background — site grey */}
      <AbsoluteFill style={{ backgroundColor: PHOTO_BG }} />

      {/* Top bar — dark */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: NOIR,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 50px",
      }}>
        {/* GOLDEALS branding */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: IVOIRE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{
              fontFamily: "Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: NOIR,
              lineHeight: 1,
            }}>G</span>
          </div>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: IVOIRE,
            letterSpacing: 4,
          }}>GOLDEALS</span>
        </div>

        {/* Rank badge */}
        <div style={{
          transform: `scale(${badgeScale})`,
          backgroundColor: IVOIRE,
          color: NOIR,
          width: 56,
          height: 56,
          borderRadius: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 26,
          fontWeight: 800,
        }}>
          #{rankNum}
        </div>
      </div>

      {/* HUGE Product Image — takes up most of the screen */}
      <div style={{
        position: "absolute",
        top: 140,
        left: 30,
        right: 30,
        height: 850,
        borderRadius: 24,
        backgroundColor: "#ffffff",
        overflow: "hidden",
        transform: `translateY(${imgY + floatY}px) scale(${imgScale})`,
        opacity: imgOpacity,
        boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Img
          src={deal.imageUrl}
          style={{
            width: "90%",
            height: "90%",
            objectFit: "contain",
          }}
        />

        {/* Discount pill overlay — top right */}
        <div style={{
          position: "absolute",
          top: 30,
          right: 30,
          transform: `scale(${discountScale})`,
          backgroundColor: NOIR,
          color: IVOIRE,
          padding: "14px 28px",
          borderRadius: 40,
          fontFamily: "sans-serif",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1,
        }}>
          -{deal.discountPercent}%
        </div>
      </div>

      {/* Brand logo */}
      {brandLogo && (
        <div style={{
          position: "absolute",
          top: 1020,
          left: 50,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          height: 50,
          display: "flex",
          alignItems: "center",
        }}>
          <Img
            src={brandLogo}
            style={{
              height: 45,
              objectFit: "contain",
              // Invert for dark logos on light bg won't be needed since bg is grey
            }}
          />
        </div>
      )}

      {/* Title + Category */}
      <div style={{
        position: "absolute",
        top: 1090,
        left: 50,
        right: 50,
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
      }}>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 14,
          fontWeight: 500,
          color: TAUPE,
          letterSpacing: 4,
          textTransform: "uppercase",
          marginBottom: 10,
          opacity: 0.7,
        }}>
          {deal.category} · {deal.merchant}
        </div>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 36,
          fontWeight: 700,
          color: NOIR,
          lineHeight: 1.2,
        }}>
          {deal.title}
        </div>
      </div>

      {/* === HUGE PRICE SECTION === */}
      <div style={{
        position: "absolute",
        bottom: 280,
        left: 50,
        right: 50,
        transform: `scale(${priceScale})`,
        opacity: priceOpacity,
      }}>
        {/* Sale price — MASSIVE */}
        <div style={{
          display: "flex",
          alignItems: "baseline",
          gap: 20,
        }}>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 120,
            fontWeight: 900,
            color: NOIR,
            lineHeight: 1,
            letterSpacing: -3,
          }}>
            {deal.salePrice}€
          </span>
        </div>
        {/* Original price — struck */}
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 40,
          fontWeight: 400,
          color: TAUPE,
          textDecoration: "line-through",
          opacity: 0.5,
          marginTop: 8,
        }}>
          {deal.originalPrice}€
        </div>
      </div>

      {/* Product link */}
      <div style={{
        position: "absolute",
        bottom: 120,
        left: 50,
        right: 50,
        transform: `translateY(${linkY}px)`,
        opacity: linkOpacity,
      }}>
        <div style={{
          backgroundColor: NOIR,
          borderRadius: 16,
          padding: "22px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}>
          <span style={{
            fontFamily: "sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: IVOIRE,
            letterSpacing: 2,
          }}>
            {deal.productUrl}
          </span>
        </div>
      </div>

      {/* Bottom swipe hint */}
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
          fontSize: 14,
          fontWeight: 400,
          color: TAUPE,
          opacity: 0.4,
          letterSpacing: 3,
        }}>
          {rankNum < 5 ? "▼  SWIPE POUR LE SUIVANT" : "▼  DERNIER DEAL"}
        </span>
      </div>
    </AbsoluteFill>
  );
};
