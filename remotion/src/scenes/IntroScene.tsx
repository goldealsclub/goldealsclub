import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background gradient rotation
  const bgRotate = interpolate(frame, [0, 150], [0, 15]);

  // "G" logo entrance
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // Title entrance
  const titleY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

  // Subtitle
  const subY = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const subOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: "clamp" });

  // Decorative line
  const lineWidth = interpolate(
    spring({ frame: frame - 45, fps, config: { damping: 200 } }),
    [0, 1], [0, 200]
  );

  // Subtle floating motion
  const floatY = Math.sin(frame * 0.03) * 5;

  return (
    <AbsoluteFill>
      {/* Background */}
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #111111 0%, #1a1a1a 40%, #222218 100%)`,
      }} />

      {/* Subtle grain texture */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 30% 20%, rgba(212,196,176,0.06) 0%, transparent 60%)",
      }} />

      {/* Content */}
      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
      }}>
        {/* G Logo */}
        <div style={{
          width: 140,
          height: 140,
          borderRadius: 28,
          backgroundColor: "#f6f0e9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <span style={{
            fontFamily: "Georgia, serif",
            fontSize: 90,
            fontWeight: 700,
            color: "#111111",
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
            fontSize: 72,
            fontWeight: 800,
            color: "#f6f0e9",
            letterSpacing: 8,
            textTransform: "uppercase",
          }}>GOLDEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 36,
            fontWeight: 300,
            color: "#d4c4b0",
            letterSpacing: 16,
            textTransform: "uppercase",
            marginTop: 8,
          }}>CLUB</div>
        </div>

        {/* Decorative line */}
        <div style={{
          marginTop: 40,
          height: 1,
          width: lineWidth,
          backgroundColor: "#d4c4b0",
          opacity: 0.6,
        }} />

        {/* Subtitle */}
        <div style={{
          marginTop: 30,
          transform: `translateY(${subY}px)`,
          opacity: subOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: "#d4c4b0",
            letterSpacing: 3,
          }}>TOP 5 DEALS</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 20,
            fontWeight: 300,
            color: "rgba(212,196,176,0.6)",
            letterSpacing: 2,
            marginTop: 10,
          }}>DE LA SEMAINE</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
