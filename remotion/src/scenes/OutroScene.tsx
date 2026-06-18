import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Playfair";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { snap, settled, fadeIn, slideY, gpuLayer, TIMING, SPRING_PRESETS } from "../lib/motion";

const { fontFamily: playfair } = loadFont("normal", { weights: ["400", "500"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const PAPER = "#f5f3ee";
const PAPER_MID = "#efece5";
const INK = "#0d0d0d";
const INK_SOFT = "rgba(13,13,13,0.55)";
const RULE = "rgba(13,13,13,0.22)";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroSp = settled({ frame, fps, delay: 0, preset: "hero" });
  const heroOpacity = fadeIn(heroSp);
  const heroY = slideY(heroSp, 22);

  const urlSp = settled({ frame, fps, delay: TIMING.secondaryDelay, preset: "num" });
  const urlOpacity = fadeIn(urlSp);

  const ruleWidth = snap(interpolate(
    spring({ frame: frame - 14, fps, config: SPRING_PRESETS.rule }),
    [0, 1], [0, 400]
  ));

  const ctaOpacity = interpolate(frame, [TIMING.ctaIn, TIMING.ctaOut], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 50% 35%, rgba(255,253,247,0.55) 0%, ${PAPER_MID} 55%, #e8e4dd 100%)`,
      }} />

      <AbsoluteFill style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)",
        backgroundSize: "3px 3px",
        opacity: 0.5,
      }} />

      {/* Cadre */}
      <div style={{ position: "absolute", top: 92, left: 60, right: 60, height: 1, backgroundColor: RULE }} />
      <div style={{ position: "absolute", bottom: 92, left: 60, right: 60, height: 1, backgroundColor: RULE }} />

      <div style={{
        position: "absolute", top: 64, left: 60,
        fontFamily: inter, fontSize: 19, fontWeight: 600, color: INK_SOFT, letterSpacing: 6,
      }}>GOLDEALS · ÉDITION</div>

      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", textAlign: "center",
      }}>
        {/* Eyebrow */}
        <div style={{
          fontFamily: inter, fontSize: 22, fontWeight: 600,
          color: INK_SOFT, letterSpacing: 10,
        }}>MERCI DE VOTRE LECTURE</div>

        <div style={{ marginTop: 24, height: 1, width: 60, backgroundColor: RULE }} />

        {/* Hero */}
        <div style={{
          marginTop: 56,
          fontFamily: playfair, fontStyle: "italic", fontWeight: 400,
          fontSize: 150, color: INK, lineHeight: 1, letterSpacing: -1.5,
          opacity: heroOpacity, transform: `translate3d(0, ${heroY}px, 0)`,
          ...gpuLayer,
        }}>À demain.</div>

        <div style={{
          marginTop: 28,
          fontFamily: inter, fontSize: 30, fontWeight: 400, color: INK_SOFT, letterSpacing: 0.5,
        }}>Une nouvelle sélection chaque jour.</div>

        <div style={{ marginTop: 60, height: 1, width: ruleWidth, backgroundColor: INK, opacity: 0.6 }} />

        <div style={{
          marginTop: 56,
          fontFamily: playfair, fontStyle: "italic", fontWeight: 500,
          fontSize: 80, color: INK, opacity: urlOpacity,
        }}>goldealsclub.com</div>
      </AbsoluteFill>

      <div style={{
        position: "absolute", bottom: 56, left: 0, right: 0,
        textAlign: "center", opacity: ctaOpacity,
        fontFamily: inter, fontSize: 20, fontWeight: 600,
        color: INK_SOFT, letterSpacing: 8,
      }}>ABONNEZ-VOUS · NE RATEZ AUCUN DEAL</div>
    </AbsoluteFill>
  );
};
