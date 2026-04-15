import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgRotate = interpolate(frame, [0, 120], [0, -10]);

  // Logo
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  // CTA text
  const ctaY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const ctaOpacity = interpolate(frame, [20, 35], [0, 1], { extrapolateRight: "clamp" });

  // Handle
  const handleY = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [30, 0]
  );
  const handleOpacity = interpolate(frame, [35, 48], [0, 1], { extrapolateRight: "clamp" });

  // Pulsing dot
  const pulse = Math.sin(frame * 0.1) * 0.3 + 1;

  const floatY = Math.sin(frame * 0.03) * 4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #111111 0%, #1a1a1a 40%, #222218 100%)`,
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
          width: 120,
          height: 120,
          borderRadius: 24,
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
            fontSize: 76,
            fontWeight: 700,
            color: "#111111",
            lineHeight: 1,
          }}>G</span>
        </div>

        {/* CTA */}
        <div style={{
          marginTop: 50,
          transform: `translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 44,
            fontWeight: 700,
            color: "#f6f0e9",
            letterSpacing: 3,
          }}>
            NE RATE AUCUN DEAL
          </div>
        </div>

        {/* Decorative line */}
        <div style={{
          marginTop: 30,
          height: 1,
          width: 120,
          backgroundColor: "#d4c4b0",
          opacity: 0.4,
        }} />

        {/* Handle / URL */}
        <div style={{
          marginTop: 30,
          transform: `translateY(${handleY}px)`,
          opacity: handleOpacity,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 26,
            fontWeight: 400,
            color: "#d4c4b0",
            letterSpacing: 4,
          }}>
            goldealsclub.lovable.app
          </div>
          {/* Live indicator */}
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
              fontSize: 16,
              color: "rgba(212,196,176,0.5)",
              letterSpacing: 3,
            }}>DEALS EN LIVE</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
