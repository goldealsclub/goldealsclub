import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

const PHOTO_BG = "#eaecf0";
const NOIR = "#111111";
const IVOIRE = "#f6f0e9";
const TAUPE = "#45403a";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  const ctaY = interpolate(
    spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200 } }),
    [0, 1], [40, 0]
  );
  const ctaOpacity = interpolate(frame, [20, 33], [0, 1], { extrapolateRight: "clamp" });

  const linkScale = spring({ frame: frame - 38, fps, config: { damping: 12, stiffness: 180 } });
  const pulse = Math.sin(frame * 0.1) * 0.3 + 1;
  const floatY = Math.sin(frame * 0.03) * 4;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: PHOTO_BG }} />

      <AbsoluteFill style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translateY(${floatY}px)`,
        padding: "0 40px",
      }}>
        {/* Logo — full width, dark on light bg */}
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
              width: "85%",
              maxHeight: 400,
              objectFit: "contain",
            }}
          />
        </div>

        {/* Decorative line */}
        <div style={{
          marginTop: 40, height: 2, width: 120,
          backgroundColor: NOIR, opacity: 0.15,
        }} />

        {/* CTA */}
        <div style={{
          marginTop: 40,
          transform: `translateY(${ctaY}px)`,
          opacity: ctaOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "sans-serif", fontSize: 36, fontWeight: 600, color: NOIR,
          }}>Ne rate aucun deal</div>
          <div style={{
            fontFamily: "sans-serif", fontSize: 22, fontWeight: 400,
            color: TAUPE, marginTop: 12, opacity: 0.7,
          }}>Les meilleures offres streetwear</div>
        </div>

        {/* Link button */}
        <div style={{
          marginTop: 50,
          transform: `scale(${linkScale})`,
          backgroundColor: NOIR, borderRadius: 16,
          padding: "24px 50px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: "#90EE90", transform: `scale(${pulse})`,
            }} />
            <span style={{
              fontFamily: "sans-serif", fontSize: 22, fontWeight: 600,
              color: IVOIRE, letterSpacing: 2,
            }}>goldealsclub.com</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
