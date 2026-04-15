import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const PHOTO_BG = "#eaecf0";
const IVOIRE = "#f6f0e9";
const NOIR = "#111111";
const TAUPE = "#45403a";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgRotate = interpolate(frame, [0, 150], [0, 15]);

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const titleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

  const subY = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const subOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = interpolate(
    spring({ frame: frame - 45, fps, config: { damping: 200 } }),
    [0, 1], [0, 200]
  );

  const floatY = Math.sin(frame * 0.03) * 5;

  return (
    <AbsoluteFill>
      {/* Dark intro — contrast with grey deal scenes */}
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #111111 0%, #1a1a1a 40%, #222218 100%)`,
      }} />

      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 30% 20%, rgba(212,196,176,0.06) 0%, transparent 60%)",
      }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
      }}>
        {/* G Logo */}
        <div style={{
          width: 160,
          height: 160,
          borderRadius: 32,
          backgroundColor: IVOIRE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <span style={{
            fontFamily: "Georgia, serif",
            fontSize: 100,
            fontWeight: 700,
            color: NOIR,
            lineHeight: 1,
          }}>G</span>
        </div>

        {/* Title */}
        <div style={{
          marginTop: 60,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 80,
            fontWeight: 800,
            color: IVOIRE,
            letterSpacing: 8,
          }}>GOLDEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 38,
            fontWeight: 300,
            color: "#d4c4b0",
            letterSpacing: 18,
            marginTop: 10,
          }}>CLUB</div>
        </div>

        <div style={{
          marginTop: 50,
          height: 1,
          width: lineWidth,
          backgroundColor: "#d4c4b0",
          opacity: 0.6,
        }} />

        <div style={{
          marginTop: 40,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 600,
            color: IVOIRE,
            letterSpacing: 4,
          }}>TOP 5 DEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 22,
            fontWeight: 300,
            color: "rgba(212,196,176,0.6)",
            letterSpacing: 3,
            marginTop: 14,
          }}>DE LA SEMAINE</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
