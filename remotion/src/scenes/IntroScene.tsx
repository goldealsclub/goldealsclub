/**
 * IntroScene — direction artistique pilotée par useStyle().
 *
 * Layouts supportés :
 *  - "split"     (adidas, nike) : bloc ink à gauche + hero multi-lignes
 *  - "centered"  (zara)         : full paper, hero serif centré
 *  - "editorial" (réservé)
 *
 * Le motion choisit linear-ease ou spring selon style.motion.useSpring.
 */
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { snap, smoothEnter, gpuLayer, TIMING } from "../lib/motion";
import { useStyle } from "../lib/style-context";

const clamp = (t: number) => Math.max(0, Math.min(1, t));

const fitDisplaySize = (text: string, configuredSize: number, width: number, minSize: number) => {
  const glyphWidth = text.length * configuredSize * 0.53;
  return Math.max(minSize, Math.min(configuredSize, configuredSize * width / Math.max(width, glyphWidth)));
};

export const IntroScene: React.FC = () => {
  const s = useStyle();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mul = s.motion.staggerMul;
  const ease = s.motion.easing;
  const useSpring = s.motion.useSpring;

  /** Slide ferme OU spring bouncy selon style. Renvoie {t, y}. */
  const enter = (delay: number, dur: number, fromY: number) => {
    return smoothEnter({ frame, fps, delay, duration: dur, from: fromY, multiplier: mul, easing: ease, springEnabled: useSpring });
  };

  // Bloc noir / bandes — uniquement layouts non-centered
  const isCentered = s.intro.layout === "centered";
  const blockEnter = enter(TIMING.rail.in, 14, -440);
  const blockX = isCentered ? 0 : -440 + blockEnter.y + 440; // = blockEnter.y bounded
  const actualBlockX = isCentered ? 0 : snap(interpolate(blockEnter.t, [0, 1], [-440, 0]));

  // Bandes diagonales
  const stripeT = (i: number) =>
    clamp(ease((frame - (4 + i * 4) * mul) / (18 * mul)));

  const eye = enter(TIMING.eyebrow.in, 8, 18);
  const heroFontKey = s.intro.heroFont;
  const heroFamily = heroFontKey === "body" ? s.fonts.body : s.fonts.display;

  // Multi-lignes ou single-line
  const heroLines = s.intro.heroLines.map((txt, i) =>
    ({ txt, line: enter(TIMING.heroDelay + 8 + i * 6, 12, 80) })
  );

  const counter = enter(TIMING.ctaIn, 12, 0);
  const ruleW = snap(interpolate(clamp(ease((frame - TIMING.secondaryDelay * mul) / (16 * mul))), [0, 1], [0, 380]));

  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  // ── Background ──
  const bg = `linear-gradient(180deg, ${s.paper} 0%, ${s.paperDeep} 100%)`;

  // ── Variantes layout ──
  if (isCentered) {
    // ZARA : tout centré, serif oversize, énormément d'air
    return (
      <AbsoluteFill style={{ background: bg }}>
        <div style={{
          position: "absolute", top: 110, left: 60, right: 60,
          display: "flex", justifyContent: "space-between",
          fontFamily: s.fonts.body, fontWeight: 500,
          fontSize: 20, color: s.inkSoft, letterSpacing: 8,
          opacity: eye.t,
        }}>
          <span style={{ textTransform: "uppercase" }}>Édition Quotidienne</span>
          <span style={{ fontFamily: s.fonts.kinetic, letterSpacing: 4 }}>{dateLabel}</span>
        </div>

        <AbsoluteFill style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "0 80px", textAlign: "center",
        }}>
          {heroLines.map(({ txt, line }, i) => (
            <div key={i} style={{
              fontFamily: heroFamily,
              fontWeight: 400,
              fontSize: fitDisplaySize(txt, s.intro.heroFontSize, 920, 120),
              color: s.ink,
              lineHeight: s.intro.heroLineHeight,
              letterSpacing: s.intro.heroLetterSpacing,
              opacity: line.t,
              transform: `translate3d(0, ${line.y}px, 0)`,
              ...gpuLayer,
            }}>{txt}</div>
          ))}

          <div style={{
            marginTop: 60, height: 1, width: ruleW, background: s.ink, opacity: 0.6,
          }} />

          <div style={{
            marginTop: 50,
            fontFamily: s.fonts.kinetic, fontSize: 32,
            color: s.inkSoft, letterSpacing: 12,
            opacity: counter.t,
            transform: `translate3d(0, ${counter.y}px, 0)`,
          }}>N° {String(now.getDate()).padStart(2, "0")}</div>
        </AbsoluteFill>

        <div style={{
          position: "absolute", bottom: 80, left: 0, right: 0,
          textAlign: "center", opacity: counter.t,
          fontFamily: s.fonts.body, fontWeight: 500,
          fontSize: 20, color: s.ink, letterSpacing: 10,
        }}>GOLDEALSCLUB.COM</div>
      </AbsoluteFill>
    );
  }

  // ADIDAS / NIKE : split asymétrique
  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* Bandes diagonales */}
      {s.intro.showStripes && [0, 1, 2].map((i) => {
        const t = stripeT(i);
        const x = snap(interpolate(t, [0, 1], [-1400, 0]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: -200, left: -100,
            width: 1400, height: 80,
            background: s.ink,
            transform: `translate3d(${x}px, ${i * 140}px, 0) rotate(-22deg)`,
            transformOrigin: "0 0",
            opacity: 0.08,
            ...gpuLayer,
          }} />
        );
      })}

      {/* Bloc noir asymétrique gauche */}
      <div style={{
        position: "absolute", top: 0, bottom: 0, left: 0,
        width: 440, background: s.ink,
        transform: `translate3d(${actualBlockX}px, 0, 0)`,
        ...gpuLayer,
      }}>
        <div style={{
          position: "absolute", top: 200, left: 60,
          transform: "rotate(-90deg)", transformOrigin: "0 0",
          fontFamily: s.fonts.kinetic, fontSize: 28,
          color: s.paperSoft, letterSpacing: 14,
          whiteSpace: "nowrap",
          opacity: blockEnter.t,
        }}>GOLDEALS · CLUB</div>

        <div style={{
          position: "absolute", bottom: 70, left: 36,
          fontFamily: s.fonts.kinetic, fontSize: 22,
          color: s.paperSoft, letterSpacing: 6,
          opacity: blockEnter.t,
        }}>{dateLabel}</div>
      </div>

      {/* Header date côté paper */}
      <div style={{
        position: "absolute", top: 90, left: 510, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: s.fonts.body, fontSize: 20, fontWeight: 700,
        color: s.inkSoft, letterSpacing: 6,
        opacity: eye.t, transform: `translate3d(0, ${eye.y}px, 0)`,
        ...gpuLayer,
      }}>
        <span>ÉDITION QUOTIDIENNE</span>
        <span style={{ fontFamily: s.fonts.kinetic, fontSize: 26, color: s.ink, letterSpacing: 4 }}>
          {dateLabel}
        </span>
      </div>

      {/* Filet noir */}
      <div style={{
        position: "absolute", top: 150, left: 510,
        height: 3, width: ruleW, background: s.ink,
        ...gpuLayer,
      }} />

      {/* Hero multi-lignes */}
      <div style={{
        position: "absolute", top: 720, left: 510, right: 60,
        display: "flex", flexDirection: "column", gap: 4,
        overflow: "hidden",
      }}>
        {heroLines.map(({ txt, line }, i) => (
          <div key={i} style={{
            fontFamily: heroFamily, fontWeight: 900,
            fontSize: fitDisplaySize(txt, s.intro.heroFontSize, 510, 118), color: s.ink,
            lineHeight: s.intro.heroLineHeight,
            letterSpacing: s.intro.heroLetterSpacing,
            textTransform: "uppercase",
            opacity: line.t,
            transform: `translate3d(0, ${line.y}px, 0)`,
            ...gpuLayer,
          }}>{txt}</div>
        ))}
      </div>

      {/* Compteur N°XX */}
      <div style={{
        position: "absolute", bottom: 90, right: 60,
        display: "flex", alignItems: "baseline", gap: 14,
        opacity: counter.t, transform: `translate3d(${snap(interpolate(counter.t, [0, 1], [60, 0]))}px, 0, 0)`,
        ...gpuLayer,
      }}>
        <span style={{ fontFamily: s.fonts.kinetic, fontSize: 28, color: s.inkSoft, letterSpacing: 6 }}>N°</span>
        <span style={{
          fontFamily: s.fonts.display, fontWeight: 900,
          fontSize: 120, color: s.ink, lineHeight: 0.85, letterSpacing: -4,
        }}>{String(now.getDate()).padStart(2, "0")}</span>
      </div>

      <div style={{
        position: "absolute", bottom: 92, left: 510,
        fontFamily: s.fonts.body, fontWeight: 700,
        fontSize: 20, color: s.ink, letterSpacing: 8,
        opacity: counter.t,
      }}>GOLDEALSCLUB.COM</div>
    </AbsoluteFill>
  );
};
