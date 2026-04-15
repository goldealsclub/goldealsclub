import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

const IVOIRE = "#f6f0e9";
const NOIR = "#111111";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgRotate = interpolate(frame, [0, 75], [0, 8]);

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });
  const logoOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: "clamp" });

  const titleY = interpolate(
    spring({ frame: frame - 10, fps, config: { damping: 18, stiffness: 250 } }),
    [0, 1], [50, 0]
  );
  const titleOpacity = interpolate(frame, [10, 22], [0, 1], { extrapolateRight: "clamp" });

  const subY = interpolate(
    spring({ frame: frame - 22, fps, config: { damping: 18, stiffness: 250 } }),
    [0, 1], [30, 0]
  );
  const subOpacity = interpolate(frame, [22, 34], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 200 } }),
    [0, 1], [0, 160]
  );

  const floatY = Math.sin(frame * 0.05) * 4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #0a0a0a 0%, #151515 40%, #1a1a16 100%)`,
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 40%, rgba(212,196,176,0.05) 0%, transparent 70%)",
      }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
      }}>
        <div style={{
          width: 130,
          height: 130,
          borderRadius: 28,
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
            fontSize: 82,
            fontWeight: 700,
            color: NOIR,
            lineHeight: 1,
          }}>G</span>
        </div>

        <div style={{
          marginTop: 50,
          transform: `translateY(${titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 68,
            fontWeight: 800,
            color: IVOIRE,
            letterSpacing: 6,
          }}>GOLDEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 34,
            fontWeight: 300,
            color: "#d4c4b0",
            letterSpacing: 16,
            marginTop: 6,
          }}>CLUB</div>
        </div>

        <div style={{
          marginTop: 40,
          height: 1,
          width: lineWidth,
          backgroundColor: "#d4c4b0",
          opacity: 0.5,
        }} />

        <div style={{
          marginTop: 30,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 30,
            fontWeight: 600,
            color: IVOIRE,
            letterSpacing: 4,
          }}>🔥 TOP 5 DEALS 🔥</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 20,
            fontWeight: 300,
            color: "rgba(212,196,176,0.6)",
            letterSpacing: 3,
            marginTop: 12,
          }}>DE LA SEMAINE</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
