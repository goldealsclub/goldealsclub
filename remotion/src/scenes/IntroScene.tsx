import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { snap, settled, fadeIn, slideY, popScale, gpuLayer, TIMING, SPRING_PRESETS } from "../lib/motion";

const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const STAGE_TOP = "#f4f1ea";
const STAGE_BOT = "#e3ddd1";
const INK = "#0a0a0a";
const INK_SOFT = "rgba(10,10,10,0.55)";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const eyebrowOpacity = interpolate(frame, [TIMING.eyebrow.in, TIMING.eyebrow.out], [0, 1], { extrapolateRight: "clamp" });

  const heroSp = settled({ frame, fps, delay: TIMING.heroDelay, preset: "hero" });
  const heroOpacity = fadeIn(heroSp);
  const heroY = slideY(heroSp, 28);

  const subSp = settled({ frame, fps, delay: TIMING.heroDelay + 8, preset: "hero" });
  const subOpacity = fadeIn(subSp);
  const subY = slideY(subSp, 22);

  const numSp = settled({ frame, fps, delay: TIMING.secondaryDelay, preset: "num" });
  const numOpacity = fadeIn(numSp);
  const numScale = popScale(numSp, 0.92);

  const ruleWidth = snap(interpolate(
    spring({ frame: frame - TIMING.ruleDelay, fps, config: SPRING_PRESETS.rule }),
    [0, 1], [0, 520]
  ));

  const tagOpacity = interpolate(frame, [TIMING.ctaIn, TIMING.ctaOut], [0, 1], { extrapolateRight: "clamp" });

  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${STAGE_TOP} 0%, ${STAGE_TOP} 55%, ${STAGE_BOT} 100%)`,
    }}>
      {/* Spotlight central */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
      }} />

      {/* Wordmark fantôme GOLDEALS en fond */}
      <div style={{
        position: "absolute", top: 700, left: 0, right: 0,
        textAlign: "center",
        fontFamily: archivo, fontWeight: 900,
        fontSize: 380, lineHeight: 0.85, letterSpacing: -6,
        color: INK, opacity: 0.06,
        whiteSpace: "nowrap", overflow: "hidden",
      }}>GOLDEALS</div>

      {/* Header */}
      <div style={{
        position: "absolute", top: 96, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: bebas, fontSize: 34, color: INK, letterSpacing: 6,
      }}>
        <span>GOLDEALS · CLUB</span>
        <span style={{ color: INK_SOFT }}>{dateLabel}</span>
      </div>

      {/* Centre */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", textAlign: "center",
      }}>
        {/* Eyebrow */}
        <div style={{
          fontFamily: inter, fontSize: 22, fontWeight: 700,
          color: INK_SOFT, letterSpacing: 10, opacity: eyebrowOpacity,
        }}>ÉDITION QUOTIDIENNE</div>

        {/* Hero condensed mass */}
        <div style={{
          marginTop: 64,
          fontFamily: bebas, fontWeight: 400,
          fontSize: 320, color: INK, lineHeight: 0.82, letterSpacing: -3,
          opacity: heroOpacity, transform: `translate3d(0, ${heroY}px, 0)`,
          ...gpuLayer,
        }}>TOP 5</div>

        <div style={{
          marginTop: 12,
          fontFamily: archivo, fontWeight: 900,
          fontSize: 90, color: INK, lineHeight: 1, letterSpacing: -2,
          opacity: subOpacity, transform: `translate3d(0, ${subY}px, 0)`,
          ...gpuLayer,
        }}>DEALS DU JOUR</div>

        {/* Filet animé */}
        <div style={{
          marginTop: 52, height: 3, width: ruleWidth, backgroundColor: INK,
        }} />

        {/* Numéro */}
        <div style={{
          marginTop: 40,
          fontFamily: bebas, fontSize: 78, color: INK_SOFT, letterSpacing: 6,
          opacity: numOpacity, transform: `scale(${numScale}) translateZ(0)`,
          ...gpuLayer,
        }}>N° {String(now.getDate()).padStart(2, "0")}</div>
      </AbsoluteFill>

      {/* Pied */}
      <div style={{
        position: "absolute", bottom: 70, left: 0, right: 0,
        textAlign: "center", opacity: tagOpacity,
        fontFamily: inter, fontSize: 22, fontWeight: 700,
        color: INK, letterSpacing: 8,
      }}>GOLDEALSCLUB.COM</div>
    </AbsoluteFill>
  );
};
