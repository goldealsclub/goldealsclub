import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

const IVOIRE = "#f6f0e9";
const NOIR = "#111111";
const TAUPE = "#45403a";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgRotate = interpolate(frame, [0, 90], [0, 8]);

  // Logo entrance — bounce in
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  // Slogan entrance
  const sloganY = interpolate(
    spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 220 } }),
    [0, 1], [40, 0]
  );
  const sloganOpacity = interpolate(frame, [14, 26], [0, 1], { extrapolateRight: "clamp" });

  // Line
  const lineWidth = interpolate(
    spring({ frame: frame - 26, fps, config: { damping: 200 } }),
    [0, 1], [0, 280]
  );

  // Top 5 text
  const topY = interpolate(
    spring({ frame: frame - 34, fps, config: { damping: 18, stiffness: 220 } }),
    [0, 1], [30, 0]
  );
  const topOpacity = interpolate(frame, [34, 46], [0, 1], { extrapolateRight: "clamp" });

  const floatY = Math.sin(frame * 0.05) * 4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #0a0a0a 0%, #141414 35%, #1a1a16 100%)`,
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 35%, rgba(246,240,233,0.04) 0%, transparent 60%)",
      }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
        padding: "0 60px",
      }}>
        {/* Real logo */}
        <div style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              height: 120,
              objectFit: "contain",
              filter: "brightness(10)",
            }}
          />
        </div>

        {/* Slogan */}
        <div style={{
          marginTop: 50,
          transform: `translateY(${sloganY}px)`,
          opacity: sloganOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 30,
            fontWeight: 500,
            color: "#d4c4b0",
            lineHeight: 1.5,
            letterSpacing: 1,
          }}>
            Vos marques préférées.
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 30,
            fontWeight: 500,
            color: "#d4c4b0",
            lineHeight: 1.5,
            letterSpacing: 1,
          }}>
            Les sites les plus fiables.
          </div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 32,
            fontWeight: 700,
            color: IVOIRE,
            lineHeight: 1.5,
            letterSpacing: 1,
            marginTop: 6,
          }}>
            Les meilleurs prix, ici.
          </div>
        </div>

        {/* Line */}
        <div style={{
          marginTop: 40,
          height: 1,
          width: lineWidth,
          backgroundColor: "#d4c4b0",
          opacity: 0.4,
        }} />

        {/* Top 5 */}
        <div style={{
          marginTop: 36,
          transform: `translateY(${topY}px)`,
          opacity: topOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: IVOIRE,
            letterSpacing: 5,
          }}>★ TOP 5 DEALS ★</div>
          <div style={{
            fontFamily: "sans-serif",
            fontSize: 18,
            fontWeight: 300,
            color: "rgba(212,196,176,0.5)",
            letterSpacing: 3,
            marginTop: 10,
          }}>DE LA SEMAINE</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
