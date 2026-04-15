import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img } from "remotion";
import type { Deal } from "../data";

interface DealSceneProps {
  deal: Deal;
  index: number;
}

export const DealScene: React.FC<DealSceneProps> = ({ deal, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rankNum = index + 1;

  // Background subtle shift
  const bgHue = interpolate(frame, [0, 120], [0, 5]);

  // Image entrance — slide up + scale
  const imgScale = interpolate(
    spring({ frame, fps, config: { damping: 15, stiffness: 120 } }),
    [0, 1], [1.1, 1]
  );
  const imgY = interpolate(
    spring({ frame, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [80, 0]
  );
  const imgOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Rank number — big dramatic entrance
  const rankScale = spring({ frame: frame - 5, fps, config: { damping: 10, stiffness: 150 } });
  const rankOpacity = interpolate(frame, [5, 18], [0, 0.08], { extrapolateRight: "clamp" });

  // Brand name
  const brandY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [30, 0]
  );
  const brandOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateRight: "clamp" });

  // Title
  const titleY = interpolate(
    spring({ frame: frame - 22, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [30, 0]
  );
  const titleOpacity = interpolate(frame, [22, 35], [0, 1], { extrapolateRight: "clamp" });

  // Price card
  const priceScale = spring({ frame: frame - 30, fps, config: { damping: 12, stiffness: 180 } });
  const priceOpacity = interpolate(frame, [30, 42], [0, 1], { extrapolateRight: "clamp" });

  // Discount badge
  const badgeScale = spring({ frame: frame - 38, fps, config: { damping: 8, stiffness: 200 } });

  // Category tag
  const tagX = interpolate(
    spring({ frame: frame - 25, fps, config: { damping: 200 } }),
    [0, 1], [-60, 0]
  );
  const tagOpacity = interpolate(frame, [25, 35], [0, 1], { extrapolateRight: "clamp" });

  // Floating motion
  const floatY = Math.sin(frame * 0.04) * 3;

  return (
    <AbsoluteFill>
      {/* Background */}
      <AbsoluteFill style={{
        background: `linear-gradient(${160 + bgHue}deg, #111111 0%, #1c1c18 50%, #111111 100%)`,
      }} />

      {/* Big rank number watermark */}
      <div style={{
        position: "absolute",
        top: 120,
        right: -20,
        fontFamily: "sans-serif",
        fontSize: 500,
        fontWeight: 900,
        color: "#f6f0e9",
        opacity: rankOpacity,
        transform: `scale(${rankScale})`,
        lineHeight: 1,
      }}>
        {rankNum}
      </div>

      {/* Top rank indicator */}
      <div style={{
        position: "absolute",
        top: 100,
        left: 60,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: brandOpacity,
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: 25,
          border: "2px solid #d4c4b0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          fontSize: 22,
          fontWeight: 700,
          color: "#f6f0e9",
        }}>
          #{rankNum}
        </div>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 16,
          fontWeight: 400,
          color: "#d4c4b0",
          letterSpacing: 4,
          textTransform: "uppercase",
        }}>TOP DEAL</div>
      </div>

      {/* Product Image */}
      <div style={{
        position: "absolute",
        top: 250,
        left: "50%",
        transform: `translateX(-50%) translateY(${imgY + floatY}px) scale(${imgScale})`,
        opacity: imgOpacity,
        width: 800,
        height: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#f8f8f8",
        boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
      }}>
        <Img
          src={deal.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Category tag */}
      <div style={{
        position: "absolute",
        top: 770,
        left: 60,
        transform: `translateX(${tagX}px)`,
        opacity: tagOpacity,
        padding: "8px 20px",
        border: "1px solid rgba(212,196,176,0.3)",
        borderRadius: 20,
        fontFamily: "sans-serif",
        fontSize: 14,
        fontWeight: 400,
        color: "#d4c4b0",
        letterSpacing: 3,
        textTransform: "uppercase",
      }}>
        {deal.category}
      </div>

      {/* Brand */}
      <div style={{
        position: "absolute",
        top: 840,
        left: 60,
        transform: `translateY(${brandY}px)`,
        opacity: brandOpacity,
        fontFamily: "sans-serif",
        fontSize: 52,
        fontWeight: 800,
        color: "#f6f0e9",
        letterSpacing: 4,
        textTransform: "uppercase",
      }}>
        {deal.brand}
      </div>

      {/* Title */}
      <div style={{
        position: "absolute",
        top: 910,
        left: 60,
        right: 60,
        transform: `translateY(${titleY}px)`,
        opacity: titleOpacity,
        fontFamily: "sans-serif",
        fontSize: 28,
        fontWeight: 300,
        color: "#d4c4b0",
        lineHeight: 1.4,
      }}>
        {deal.title}
      </div>

      {/* Price section */}
      <div style={{
        position: "absolute",
        bottom: 350,
        left: 60,
        right: 60,
        transform: `scale(${priceScale})`,
        opacity: priceOpacity,
        display: "flex",
        alignItems: "flex-end",
        gap: 30,
      }}>
        {/* Sale price */}
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 80,
          fontWeight: 800,
          color: "#f6f0e9",
          lineHeight: 1,
        }}>
          {deal.salePrice}€
        </div>
        {/* Original price */}
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 34,
          fontWeight: 300,
          color: "rgba(212,196,176,0.5)",
          textDecoration: "line-through",
          lineHeight: 1,
          marginBottom: 10,
        }}>
          {deal.originalPrice}€
        </div>
      </div>

      {/* Discount badge */}
      <div style={{
        position: "absolute",
        bottom: 240,
        left: 60,
        transform: `scale(${badgeScale})`,
        backgroundColor: "#f6f0e9",
        color: "#111111",
        padding: "14px 30px",
        borderRadius: 30,
        fontFamily: "sans-serif",
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 2,
      }}>
        -{deal.discountPercent}%
      </div>

      {/* Bottom branding */}
      <div style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
      }}>
        <div style={{
          fontFamily: "sans-serif",
          fontSize: 16,
          fontWeight: 400,
          color: "rgba(212,196,176,0.4)",
          letterSpacing: 6,
          textTransform: "uppercase",
        }}>
          GOLDEALS CLUB
        </div>
      </div>
    </AbsoluteFill>
  );
};
