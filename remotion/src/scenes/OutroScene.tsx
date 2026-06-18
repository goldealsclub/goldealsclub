import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { snap, settled, fadeIn, slideY, gpuLayer, TIMING, SPRING_PRESETS } from "../lib/motion";

const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const STAGE_TOP = "#f4f1ea";
const STAGE_BOT = "#e3ddd1";
const INK = "#0a0a0a";
const INK_SOFT = "rgba(10,10,10,0.55)";

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const heroSp = settled({ frame, fps, delay: 0, preset: "hero" });
  const heroOpacity = fadeIn(heroSp);
  const heroY = slideY(heroSp, 26);

  const subSp = settled({ frame, fps, delay: 10, preset: "hero" });
  const subOpacity = fadeIn(subSp);

  const urlSp = settled({ frame, fps, delay: TIMING.secondaryDelay, preset: "num" });
  const urlOpacity = fadeIn(urlSp);

  const ruleWidth = snap(interpolate(
    spring({ frame: frame - TIMING.ruleDelay, fps, config: SPRING_PRESETS.rule }),
    [0, 1], [0, 520]
  ));

  const ctaOpacity = interpolate(frame, [TIMING.ctaIn, TIMING.ctaOut], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${STAGE_TOP} 0%, ${STAGE_TOP} 55%, ${STAGE_BOT} 100%)`,
    }}>
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
      }} />

      {/* Wordmark fantôme */}
      <div style={{
        position: "absolute", top: 720, left: 0, right: 0,
        textAlign: "center",
        fontFamily: archivo, fontWeight: 900,
        fontSize: 380, lineHeight: 0.85, letterSpacing: -6,
        color: INK, opacity: 0.06,
        whiteSpace: "nowrap", overflow: "hidden",
      }}>À DEMAIN</div>

      {/* Header */}
      <div style={{
        position: "absolute", top: 96, left: 60, right: 60,
        fontFamily: bebas, fontSize: 34, color: INK, letterSpacing: 6,
        display: "flex", justifyContent: "space-between",
      }}>
        <span>GOLDEALS · CLUB</span>
        <span style={{ color: INK_SOFT }}>FIN DE SÉLECTION</span>
      </div>

      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", textAlign: "center",
      }}>
        <div style={{
          fontFamily: inter, fontSize: 22, fontWeight: 700,
          color: INK_SOFT, letterSpacing: 10,
        }}>MERCI DE VOTRE LECTURE</div>

        <div style={{
          marginTop: 56,
          fontFamily: bebas, fontWeight: 400,
          fontSize: 300, color: INK, lineHeight: 0.82, letterSpacing: -3,
          opacity: heroOpacity, transform: `translate3d(0, ${heroY}px, 0)`,
          ...gpuLayer,
        }}>À DEMAIN</div>

        <div style={{
          marginTop: 24,
          fontFamily: archivo, fontWeight: 800,
          fontSize: 44, color: INK, lineHeight: 1.1, letterSpacing: -0.5,
          opacity: subOpacity,
          ...gpuLayer,
        }}>UNE NOUVELLE SÉLECTION CHAQUE JOUR</div>

        <div style={{ marginTop: 60, height: 3, width: ruleWidth, backgroundColor: INK }} />

        <div style={{
          marginTop: 56,
          fontFamily: bebas, fontSize: 110, color: INK, letterSpacing: 2,
          opacity: urlOpacity,
        }}>GOLDEALSCLUB.COM</div>
      </AbsoluteFill>

      <div style={{
        position: "absolute", bottom: 70, left: 0, right: 0,
        textAlign: "center", opacity: ctaOpacity,
        fontFamily: inter, fontSize: 20, fontWeight: 700,
        color: INK_SOFT, letterSpacing: 8,
      }}>ABONNEZ-VOUS · NE RATEZ AUCUN DEAL</div>
    </AbsoluteFill>
  );
};
