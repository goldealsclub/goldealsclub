import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const PHOTO_BG = "#eaecf0";
const IVOIRE = "#f6f0e9";
const NOIR = "#111111";
const TAUPE = "#45403a";
const SABLE = "#d4c4b0";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const titleY = interpolate(
    spring({ frame: frame - 15, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [50, 0]
  );
  const titleOpacity = interpolate(frame, [15, 28], [0, 1], { extrapolateRight: "clamp" });

  const ctaY = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const ctaOpacity = interpolate(frame, [30, 43], [0, 1], { extrapolateRight: "clamp" });

  const linkScale = spring({ frame: frame - 42, fps, config: { damping: 12, stiffness: 180 } });

  const pulse = Math.sin(frame * 0.1) * 0.3 + 1;
  const floatY = Math.sin(frame * 0.03) * 4;

  return (
    <AbsoluteFill>
      {/* Grey bg like the site */}
      <AbsoluteFill style={{ backgroundColor: PHOTO_BG }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
      }}>
        {/* G Logo — large */}
        <div style={{
          width: 160,
          height: 160,
          borderRadius: 32,
          backgroundColor: NOIR,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}>
          <span style={{
            fontFamily: "Georgia, serif",
            fontSize: 100,
            fontWeight: 700,
            color: IVOIRE,
            lineHeight: 1,
          }}>G</span>
        </div>

        {/* Title */}
        <div style={{
          marginTop: 50,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 64,
            fontWeight: 800,
            color: NOIR,
            letterSpacing: 6,
          }}>GOLDEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 300,
            color: TAUPE,
            letterSpacing: 14,
            marginTop: 8,
          }}>CLUB</div>
        </div>

        {/* Decorative line */}
        <div style={{
          marginTop: 40,
          height: 2,
          width: 120,
          backgroundColor: NOIR,
          opacity: 0.15,
        }} />

        {/* CTA */}
        <div style={{
          marginTop: 40,
          transform: `translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 36,
            fontWeight: 600,
            color: NOIR,
          }}>
            Ne rate aucun deal
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 22,
            fontWeight: 400,
            color: TAUPE,
            marginTop: 12,
            opacity: 0.7,
          }}>
            Les meilleures offres streetwear
          </div>
        </div>

        {/* Link button */}
        <div style={{
          marginTop: 50,
          transform: `scale(${linkScale})`,
          backgroundColor: NOIR,
          borderRadius: 16,
          padding: "24px 50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: "#90EE90",
              transform: `scale(${pulse})`,
            }} />
            <span style={{
              fontFamily: "sans-serif",
              fontSize: 22,
              fontWeight: 600,
              color: IVOIRE,
              letterSpacing: 2,
            }}>
              goldealsclub.lovable.app
            </span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
