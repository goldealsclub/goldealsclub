import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Playfair";

const { fontFamily: playfair } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });

const IVOIRE = "#f6f0e9";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgRotate = interpolate(frame, [0, 90], [0, 8]);

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  const logoOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  const sloganY = interpolate(
    spring({ frame: frame - 14, fps, config: { damping: 18, stiffness: 220 } }),
    [0, 1], [40, 0]
  );
  const sloganOpacity = interpolate(frame, [14, 26], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = interpolate(
    spring({ frame: frame - 30, fps, config: { damping: 200 } }),
    [0, 1], [0, 280]
  );

  const topY = interpolate(
    spring({ frame: frame - 38, fps, config: { damping: 18, stiffness: 220 } }),
    [0, 1], [30, 0]
  );
  const topOpacity = interpolate(frame, [38, 50], [0, 1], { extrapolateRight: "clamp" });

  const floatY = Math.sin(frame * 0.05) * 4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        background: `linear-gradient(${135 + bgRotate}deg, #0a0a0a 0%, #141414 35%, #1a1a16 100%)`,
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(246,240,233,0.05) 0%, transparent 60%)",
      }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
        padding: "0 30px",
      }}>
        {/* Logo — massive, white on dark */}
        <div style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        }}>
          <Img
            src={staticFile("logo.png")}
            style={{
              width: "100%",
              objectFit: "contain",
              filter: "invert(1) brightness(2)",
            }}
          />
        </div>

        {/* Slogan — Playfair Display italic feel */}
        <div style={{
          marginTop: 60,
          transform: `translateY(${sloganY}px)`,
          opacity: sloganOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: playfair, fontSize: 38, fontWeight: 700,
            color: "#d4c4b0", lineHeight: 1.6, letterSpacing: 0.5,
            fontStyle: "italic",
          }}>
            Vos marques préférées.
          </div>
          <div style={{
            fontFamily: playfair, fontSize: 38, fontWeight: 700,
            color: "#d4c4b0", lineHeight: 1.6, letterSpacing: 0.5,
            fontStyle: "italic",
          }}>
            Les sites les plus fiables.
          </div>
          <div style={{
            fontFamily: playfair, fontSize: 44, fontWeight: 700,
            color: IVOIRE, lineHeight: 1.6, letterSpacing: 1,
            marginTop: 10,
          }}>
            Les meilleurs prix, ici.
          </div>
        </div>

        {/* Line */}
        <div style={{
          marginTop: 44, height: 1, width: lineWidth,
          backgroundColor: "#d4c4b0", opacity: 0.4,
        }} />

        {/* Top 5 */}
        <div style={{
          marginTop: 40,
          transform: `translateY(${topY}px)`,
          opacity: topOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif", fontSize: 28, fontWeight: 700,
            color: IVOIRE, letterSpacing: 5,
          }}>★ TOP 5 DEALS ★</div>
          <div style={{
            fontFamily: "sans-serif", fontSize: 18, fontWeight: 300,
            color: "rgba(212,196,176,0.5)", letterSpacing: 3, marginTop: 10,
          }}>DE LA SEMAINE</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
