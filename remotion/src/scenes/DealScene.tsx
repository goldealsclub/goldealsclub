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

const FlameSvg: React.FC<{ size?: number }> = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6B35" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 23C16.5 23 20 19.5 20 15C20 11 17 8.5 15.5 7.5C15.5 9 14.5 11 13 12C13 10 12.5 7.5 10 5C9.5 7.5 8 9 6.5 11C5.5 12.5 4 14 4 16C4 19.5 7.5 23 12 23Z"/>
  </svg>
);

export const DealScene: React.FC<DealSceneProps> = ({ deal, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rankNum = index + 1;

  // Product image — soft entrance + slow Ken Burns (zoom + pan)
  const imgEnter = spring({ frame, fps, config: { damping: 200, mass: 1.2 }, durationInFrames: 30 });
  const imgScaleEnter = interpolate(imgEnter, [0, 1], [1.04, 1]);
  const imgY = interpolate(imgEnter, [0, 1], [24, 0]);
  const imgOpacity = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Ken Burns: slow zoom 1 → 1.06 + subtle horizontal pan, alternating direction per index
  const kenZoom = interpolate(frame, [0, 130], [1, 1.06], { extrapolateRight: "clamp" });
  const panDir = index % 2 === 0 ? 1 : -1;
  const kenPanX = interpolate(frame, [0, 130], [0, 14 * panDir], { extrapolateRight: "clamp" });
  const kenPanY = interpolate(frame, [0, 130], [0, -8], { extrapolateRight: "clamp" });

  // Brand logo
  const logoOpacity = interpolate(frame, [6, 16], [0, 1], { extrapolateRight: "clamp" });

  // Rank badge
  const badgeScale = spring({ frame: frame - 3, fps, config: { damping: 10, stiffness: 200 } });

  // Info section
  const infoY = interpolate(
    spring({ frame: frame - 12, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [30, 0]
  );
  const infoOpacity = interpolate(frame, [12, 22], [0, 1], { extrapolateRight: "clamp" });

  // Price — dramatic bounce
  const priceScale = spring({ frame: frame - 18, fps, config: { damping: 7, stiffness: 120 } });
  const priceOpacity = interpolate(frame, [18, 28], [0, 1], { extrapolateRight: "clamp" });

  // Discount + flames
  const discountScale = spring({ frame: frame - 24, fps, config: { damping: 6, stiffness: 180 } });
  const flameScale = spring({ frame: frame - 28, fps, config: { damping: 8, stiffness: 200 } });

  // Link
  const linkOpacity = interpolate(frame, [34, 44], [0, 1], { extrapolateRight: "clamp" });

  const floatY = Math.sin(frame * 0.04) * 3;
  const brandLogo = brandLogos[deal.brand];
  const flameCount = getFlameCount(deal.discountPercent);
  const flameLabel = getFlameLabel(deal.discountPercent);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: PHOTO_BG }} />

      {/* ═══ TOP BAR ═══ */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 100,
        backgroundColor: NOIR,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            backgroundColor: IVOIRE,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: NOIR, lineHeight: 1 }}>G</span>
          </div>
          <span style={{ fontFamily: "sans-serif", fontSize: 16, fontWeight: 800, color: IVOIRE, letterSpacing: 3 }}>GOLDEALS CLUB</span>
        </div>
        <div style={{
          transform: `scale(${badgeScale})`,
          backgroundColor: IVOIRE, color: NOIR,
          width: 48, height: 48, borderRadius: 24,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "sans-serif", fontSize: 22, fontWeight: 800,
        }}>#{rankNum}</div>
      </div>

      {/* ═══ FULL-BLEED PRODUCT IMAGE — top half ═══ */}
      <div style={{
        position: "absolute",
        top: 100,
        left: 0,
        right: 0,
        bottom: "50%",
        backgroundColor: PHOTO_BG,
        overflow: "hidden",
        transform: `translateY(${imgY + floatY}px)`,
        opacity: imgOpacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <Img
          src={deal.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 20,
          }}
        />
      </div>

      {/* ═══ INFO SECTION — Below image ═══ */}
      <div style={{
        position: "absolute",
        top: "52%",
        left: 40, right: 40,
        transform: `translateY(${infoY}px)`,
        opacity: infoOpacity,
      }}>
        {/* Brand logo + category */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
          {brandLogo && (
            <Img src={brandLogo} style={{ height: 36, objectFit: "contain", opacity: logoOpacity }} />
          )}
          <span style={{
            fontFamily: "sans-serif", fontSize: 13, fontWeight: 500,
            color: TAUPE, letterSpacing: 3, textTransform: "uppercase", opacity: 0.6,
          }}>{deal.category} · {deal.merchant}</span>
        </div>
        <div style={{
          fontFamily: "sans-serif", fontSize: 30, fontWeight: 700, color: NOIR, lineHeight: 1.2,
        }}>{deal.title}</div>
      </div>

      {/* ═══ MASSIVE PRICE ═══ */}
      <div style={{
        position: "absolute",
        bottom: 310, left: 40, right: 40,
        transform: `scale(${priceScale})`,
        opacity: priceOpacity,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <span style={{
            fontFamily: "sans-serif", fontSize: 150, fontWeight: 900,
            color: NOIR, lineHeight: 1, letterSpacing: -5,
          }}>{deal.salePrice}€</span>
        </div>
        <div style={{
          fontFamily: "sans-serif", fontSize: 46, fontWeight: 400,
          color: TAUPE, textDecoration: "line-through", opacity: 0.4, marginTop: 2,
        }}>{deal.originalPrice}€</div>
      </div>

      {/* ═══ DISCOUNT + FLAMES ═══ */}
      <div style={{
        position: "absolute",
        bottom: 190, left: 40, right: 40,
        display: "flex", alignItems: "center", gap: 16,
      }}>
        <div style={{
          transform: `scale(${discountScale})`,
          backgroundColor: NOIR, color: IVOIRE,
          padding: "16px 34px", borderRadius: 40,
          fontFamily: "sans-serif", fontSize: 40, fontWeight: 900, letterSpacing: 2,
        }}>-{deal.discountPercent}%</div>

        <div style={{
          transform: `scale(${flameScale})`,
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
        }}>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({ length: flameCount }).map((_, i) => <FlameSvg key={i} size={36} />)}
          </div>
          <span style={{
            fontFamily: "sans-serif", fontSize: 14, fontWeight: 700,
            color: TAUPE, letterSpacing: 2, opacity: 0.7,
          }}>{flameLabel}</span>
        </div>
      </div>

      {/* ═══ LINK ═══ */}
      <div style={{
        position: "absolute",
        bottom: 80, left: 40, right: 40,
        opacity: linkOpacity,
      }}>
        <div style={{
          backgroundColor: NOIR, borderRadius: 14,
          padding: "20px 36px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontFamily: "sans-serif", fontSize: 20, fontWeight: 600,
            color: IVOIRE, letterSpacing: 1.5,
          }}>{deal.productUrl}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
