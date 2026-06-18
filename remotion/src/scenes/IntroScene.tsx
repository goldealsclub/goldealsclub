import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Playfair";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { snap, settled, fadeIn, slideY, popScale, gpuLayer, TIMING, SPRING_PRESETS } from "../lib/motion";

const { fontFamily: playfair } = loadFont("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

// ── Paper & Ink ───────────────────────────────────────────────────────
const PAPER = "#f5f3ee";
const PAPER_MID = "#efece5";
const INK = "#0d0d0d";
const INK_SOFT = "rgba(13,13,13,0.55)";
const RULE = "rgba(13,13,13,0.22)";

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cadence partagée des bandeaux
  const railOpacity = interpolate(frame, [TIMING.rail.in, TIMING.rail.out], [0, 1], { extrapolateRight: "clamp" });
  const eyebrowOpacity = interpolate(frame, [TIMING.eyebrow.in, TIMING.eyebrow.out], [0, 1], { extrapolateRight: "clamp" });

  const heroSpring = settled({ frame, fps, delay: TIMING.heroDelay, preset: "hero" });
  const heroOpacity = fadeIn(heroSpring);
  const heroY = slideY(heroSpring, 22);

  const numSpring = settled({ frame, fps, delay: TIMING.secondaryDelay, preset: "num" });
  const numOpacity = fadeIn(numSpring);
  const numScale = popScale(numSpring, 0.94);

  const ruleWidth = snap(interpolate(
    spring({ frame: frame - TIMING.ruleDelay, fps, config: SPRING_PRESETS.rule }),
    [0, 1], [0, 400]
  ));

  const tagOpacity = interpolate(frame, [TIMING.ctaIn, TIMING.ctaOut], [0, 1], { extrapolateRight: "clamp" });

  // Date du jour (formatée fr)
  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      {/* Lumière éditoriale chaude off-center */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 32% 30%, rgba(255,253,247,0.55) 0%, ${PAPER_MID} 55%, #e8e4dd 100%)`,
      }} />

      {/* Grain papier */}
      <AbsoluteFill style={{
        backgroundImage:
          "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "3px 3px, 5px 5px",
        backgroundPosition: "0 0, 1px 2px",
        mixBlendMode: "multiply",
        opacity: 0.6,
      }} />

      {/* ── Cadre hairline éditorial ── */}
      <div style={{
        position: "absolute", top: 92, left: 60, right: 60, height: 1,
        backgroundColor: RULE, opacity: railOpacity,
      }} />
      <div style={{
        position: "absolute", bottom: 92, left: 60, right: 60, height: 1,
        backgroundColor: RULE, opacity: railOpacity,
      }} />
      {/* Tickmarks coins */}
      {[
        { top: 80, left: 60 }, { top: 80, right: 60 },
        { bottom: 80, left: 60 }, { bottom: 80, right: 60 },
      ].map((s, i) => (
        <div key={i} style={{
          position: "absolute", width: 1, height: 24,
          backgroundColor: RULE, opacity: railOpacity, ...s,
        }} />
      ))}

      {/* ── Rail haut : signature + date ── */}
      <div style={{
        position: "absolute", top: 64, left: 60,
        fontFamily: inter, fontSize: 19, fontWeight: 600, color: INK_SOFT,
        letterSpacing: 6, opacity: railOpacity,
      }}>GOLDEALS · ÉDITION</div>
      <div style={{
        position: "absolute", top: 64, right: 60,
        fontFamily: inter, fontSize: 18, fontWeight: 500, color: INK_SOFT,
        letterSpacing: 4, opacity: railOpacity,
      }}>{dateLabel}</div>

      {/* ── Bloc central ── */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "0 60px", textAlign: "center",
      }}>
        {/* Eyebrow */}
        <div style={{
          fontFamily: inter, fontSize: 22, fontWeight: 600,
          color: INK_SOFT, letterSpacing: 10, opacity: eyebrowOpacity,
        }}>ÉDITION QUOTIDIENNE</div>

        {/* Filet court */}
        <div style={{
          marginTop: 24, height: 1, width: 60,
          backgroundColor: RULE, opacity: eyebrowOpacity,
        }} />

        {/* Hero serif italic */}
        <div style={{
          marginTop: 56,
          fontFamily: playfair, fontStyle: "italic", fontWeight: 400,
          fontSize: 180, color: INK, lineHeight: 1, letterSpacing: -2,
          opacity: heroOpacity, transform: `translate3d(0, ${heroY}px, 0)`,
          ...gpuLayer,
        }}>Sélection</div>

        {/* Numéro */}
        <div style={{
          marginTop: 32,
          fontFamily: playfair, fontStyle: "italic", fontWeight: 500,
          fontSize: 110, color: INK, lineHeight: 1,
          opacity: numOpacity, transform: `scale(${numScale}) translateZ(0)`,
          ...gpuLayer,
        }}>N° 05</div>

        {/* Filet animé */}
        <div style={{
          marginTop: 52, height: 1, width: ruleWidth,
          backgroundColor: INK, opacity: 0.5,
        }} />

        {/* Tagline */}
        <div style={{
          marginTop: 40, opacity: tagOpacity,
          fontFamily: inter, fontSize: 22, fontWeight: 500,
          color: INK_SOFT, letterSpacing: 8,
        }}>LES MEILLEURS DEALS · CHAQUE JOUR</div>
      </AbsoluteFill>

      {/* ── Pied éditorial ── */}
      <div style={{
        position: "absolute", bottom: 56, left: 0, right: 0,
        textAlign: "center", opacity: tagOpacity,
        fontFamily: inter, fontSize: 22, fontWeight: 600,
        color: INK, letterSpacing: 8,
      }}>GOLDEALSCLUB.COM</div>
    </AbsoluteFill>
  );
};
