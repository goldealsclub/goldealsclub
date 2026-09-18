/**
 * OutroScene — direction artistique pilotée par useStyle().
 *
 * Layouts :
 *  - "stripes-signature" (adidas) : fond ink + 3 bandes diagonales paper
 *  - "serif-fade"        (zara)   : fond paper, serif fin, beaucoup d'air
 *  - "kinetic-cuts"      (nike)   : fond ink, type ultra-condensé, bandes nettes
 */
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { snap, smoothEnter, gpuLayer, TIMING } from "../lib/motion";
import { useStyle } from "../lib/style-context";

const clamp = (t: number) => Math.max(0, Math.min(1, t));
const fitDisplaySize = (text: string, configuredSize: number, width: number, minSize: number) => {
  const glyphWidth = text.length * configuredSize * 0.54;
  return Math.max(minSize, Math.min(configuredSize, configuredSize * width / Math.max(width, glyphWidth)));
};

export const OutroScene: React.FC = () => {
  const s = useStyle();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mul = s.motion.staggerMul;
  const ease = s.motion.easing;
  const useSpring = s.motion.useSpring;

  const enter = (delay: number, dur: number, fromY: number) => {
    return smoothEnter({ frame, fps, delay, duration: dur, from: fromY, multiplier: mul, easing: ease, springEnabled: useSpring });
  };

  const stripeT = (i: number) => clamp(ease((frame - (6 + i * 5) * mul) / (22 * mul)));
  const eye = enter(TIMING.eyebrow.in, 10, 0);
  const hero = enter(TIMING.heroDelay, 12, 70);
  const sub = enter(TIMING.secondaryDelay, 12, 70);
  const ruleW = snap(interpolate(clamp(ease((frame - TIMING.ctaIn * mul) / (16 * mul))), [0, 1], [0, 600]));
  const url = enter(TIMING.ctaOut, 14, 0);

  const isInkBg = s.outro.background === "ink";
  const bg = isInkBg ? s.ink : `linear-gradient(180deg, ${s.paper} 0%, ${s.paperDeep} 100%)`;
  const fg = isInkBg ? s.paper : s.ink;
  const fgSoft = isInkBg ? s.paperSoft : s.inkSoft;
  const stripeBg = isInkBg ? s.paper : s.ink;
  const heroFamily = s.outro.heroFont === "body" ? s.fonts.body : s.fonts.display;
  const heroSize = fitDisplaySize(s.outro.heroText, s.outro.heroFontSize, 960, 96);

  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Bandes diagonales */}
      {s.outro.showStripes && [0, 1, 2].map((i) => {
        const t = stripeT(i);
        const x = snap(interpolate(t, [0, 1], [1400, 0]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: 100 + i * 130, left: -200,
            width: 1500, height: 90,
            background: stripeBg,
            transform: `translate3d(${x}px, 0, 0) rotate(-22deg)`,
            transformOrigin: "0 0",
            opacity: 0.06 + i * 0.02,
            ...gpuLayer,
          }} />
        );
      })}

      {/* Header eyebrow */}
      <div style={{
        position: "absolute", top: 110, left: 60, right: 60,
        display: "flex", justifyContent: "space-between",
        fontFamily: s.fonts.body, fontWeight: 700,
        fontSize: 20, color: fgSoft, letterSpacing: 8,
        opacity: eye.t,
      }}>
        <span>GOLDEALS · CLUB</span>
        <span style={{ fontFamily: s.fonts.kinetic, fontSize: 26, color: fg, letterSpacing: 6 }}>
          ÉDITION TERMINÉE
        </span>
      </div>

      {/* Hero */}
      <div style={{
        position: "absolute", top: 700, left: 60, right: 60,
        display: "flex", flexDirection: "column", gap: 6,
        overflow: "hidden",
        textAlign: s.outro.layout === "serif-fade" ? "center" : "left",
      }}>
        <div style={{
          fontFamily: heroFamily,
          fontWeight: s.outro.heroFont === "body" ? 400 : 900,
          fontSize: heroSize, color: fg,
          lineHeight: 0.92, letterSpacing: s.outro.heroLetterSpacing,
          textTransform: s.outro.heroFont === "body" ? "none" : "uppercase",
          opacity: hero.t, whiteSpace: "nowrap",
          transform: `translate3d(0, ${hero.y}px, 0)`,
          ...gpuLayer,
        }}>{s.outro.heroText}</div>
        <div style={{
          marginTop: 24,
          fontFamily: s.fonts.kinetic, fontSize: 38, color: fgSoft, letterSpacing: 6,
          opacity: sub.t,
          transform: `translate3d(0, ${sub.y}px, 0)`,
          ...gpuLayer,
        }}>NOUVELLE SÉLECTION CHAQUE JOUR</div>
      </div>

      {/* Filet + URL pied */}
      <div style={{
        position: "absolute", bottom: 130, left: 60,
        height: 3, width: ruleW, background: fg,
        ...gpuLayer,
      }} />
      <div style={{
        position: "absolute", bottom: 70, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: url.t,
        fontFamily: s.fonts.body, fontWeight: 700,
      }}>
        <span style={{ fontSize: 32, color: fg, letterSpacing: 8 }}>GOLDEALSCLUB.COM</span>
        <span style={{
          fontFamily: s.fonts.display, fontWeight: 900,
          fontSize: 28, color: fgSoft, letterSpacing: 4,
        }}>—</span>
      </div>
    </AbsoluteFill>
  );
};
