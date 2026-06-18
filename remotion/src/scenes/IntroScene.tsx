/**
 * IntroScene — direction Adidas geometric & graphic.
 *
 * Split asymétrique noir (gauche, 40%) / ivoire (droite, 60%).
 * Trois bandes diagonales (réinterprétation 3-stripes) qui balaient
 * la scène depuis le bas. Typo Archivo Black massive cadrée à gauche,
 * compteur "N°" pinné en bas-droit. Pas de fade — tout entre par
 * translation FERME (linear ease) façon planche graphique.
 */
import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { snap, gpuLayer } from "../lib/motion";

const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800", "900"], subsets: ["latin"] });
const { fontFamily: bebas } = loadBebas("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "700"], subsets: ["latin"] });

const INK = "#0a0a0a";
const PAPER = "#f4f1ea";
const PAPER_DEEP = "#e3ddd1";
const INK_SOFT = "rgba(10,10,10,0.55)";
const PAPER_SOFT = "rgba(244,241,234,0.55)";

// Easing dur Adidas : linéaire, pas de spring.
const linEase = (t: number) => Math.max(0, Math.min(1, t));

// Slide ferme : entre par translate hard, sans bounce.
const slideIn = (frame: number, delay: number, dur: number, from: number) => {
  const t = linEase((frame - delay) / dur);
  return { t, y: snap(interpolate(t, [0, 1], [from, 0])) };
};

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  // ── Bandes diagonales (3-stripes) — sweep depuis bas-gauche ──
  const stripeT = (i: number) => linEase((frame - (4 + i * 4)) / 18);

  // ── Bloc noir gauche — slide from left ──
  const blockT = linEase((frame - 0) / 14);
  const blockX = snap(interpolate(blockT, [0, 1], [-440, 0]));

  // ── Eyebrow ──
  const { y: eyeY, t: eyeT } = slideIn(frame, 14, 8, 18);

  // ── Hero lines stagger ──
  const l1 = slideIn(frame, 18, 10, 80);
  const l2 = slideIn(frame, 24, 10, 80);
  const l3 = slideIn(frame, 30, 10, 80);

  // ── Compteur ──
  const counterT = linEase((frame - 38) / 12);
  const counterX = snap(interpolate(counterT, [0, 1], [60, 0]));

  // ── Filet ──
  const ruleW = snap(interpolate(linEase((frame - 22) / 16), [0, 1], [0, 380]));

  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getFullYear()).slice(-2)}`;

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(180deg, ${PAPER} 0%, ${PAPER_DEEP} 100%)`,
    }}>
      {/* ── Bandes diagonales (3-stripes) en fond ── */}
      {[0, 1, 2].map((i) => {
        const t = stripeT(i);
        const x = snap(interpolate(t, [0, 1], [-1400, 0]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: -200, left: -100,
            width: 1400, height: 80,
            background: INK,
            transform: `translate3d(${x}px, ${i * 140}px, 0) rotate(-22deg)`,
            transformOrigin: "0 0",
            opacity: 0.08,
            ...gpuLayer,
          }} />
        );
      })}

      {/* ── Bloc noir asymétrique gauche (40%) ── */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0, left: 0,
        width: 440,
        background: INK,
        transform: `translate3d(${blockX}px, 0, 0)`,
        ...gpuLayer,
      }}>
        {/* Wordmark vertical "GOLDEALS" sur le bloc noir */}
        <div style={{
          position: "absolute",
          top: 200, left: 60,
          transform: "rotate(-90deg)", transformOrigin: "0 0",
          fontFamily: bebas, fontSize: 28,
          color: PAPER_SOFT, letterSpacing: 14,
          whiteSpace: "nowrap",
          opacity: blockT,
        }}>GOLDEALS · CLUB</div>

        {/* Date verticale bas */}
        <div style={{
          position: "absolute",
          bottom: 70, left: 36,
          fontFamily: bebas, fontSize: 22,
          color: PAPER_SOFT, letterSpacing: 6,
          opacity: blockT,
        }}>{dateLabel}</div>
      </div>

      {/* ── Header date côté ivoire ── */}
      <div style={{
        position: "absolute", top: 90, left: 510, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontFamily: inter, fontSize: 20, fontWeight: 700,
        color: INK_SOFT, letterSpacing: 6,
        opacity: eyeT, transform: `translate3d(0, ${eyeY}px, 0)`,
        ...gpuLayer,
      }}>
        <span>ÉDITION QUOTIDIENNE</span>
        <span style={{ fontFamily: bebas, fontSize: 26, color: INK, letterSpacing: 4 }}>
          {dateLabel}
        </span>
      </div>

      {/* ── Filet noir massif (séparateur header) ── */}
      <div style={{
        position: "absolute", top: 150, left: 510,
        height: 3, width: ruleW, background: INK,
        ...gpuLayer,
      }} />

      {/* ── Hero lines cadrées à gauche (sur ivoire) ── */}
      <div style={{
        position: "absolute",
        top: 720, left: 510, right: 60,
        display: "flex", flexDirection: "column", gap: 4,
        overflow: "hidden",
      }}>
        {[
          { txt: "DEALS", line: l1 },
          { txt: "OF THE", line: l2 },
          { txt: "DAY.", line: l3 },
        ].map(({ txt, line }, i) => (
          <div key={i} style={{
            fontFamily: archivo, fontWeight: 900,
            fontSize: 200, color: INK,
            lineHeight: 0.88, letterSpacing: -6,
            textTransform: "uppercase",
            opacity: line.t,
            transform: `translate3d(0, ${line.y}px, 0)`,
            ...gpuLayer,
          }}>{txt}</div>
        ))}
      </div>

      {/* ── Compteur N°XX pinné en bas-droit ── */}
      <div style={{
        position: "absolute",
        bottom: 90, right: 60,
        display: "flex", alignItems: "baseline", gap: 14,
        opacity: counterT, transform: `translate3d(${counterX}px, 0, 0)`,
        ...gpuLayer,
      }}>
        <span style={{
          fontFamily: bebas, fontSize: 28, color: INK_SOFT, letterSpacing: 6,
        }}>N°</span>
        <span style={{
          fontFamily: archivo, fontWeight: 900,
          fontSize: 120, color: INK, lineHeight: 0.85, letterSpacing: -4,
        }}>{String(now.getDate()).padStart(2, "0")}</span>
      </div>

      {/* ── URL pied de page ── */}
      <div style={{
        position: "absolute", bottom: 92, left: 510,
        fontFamily: inter, fontWeight: 700,
        fontSize: 20, color: INK, letterSpacing: 8,
        opacity: counterT,
      }}>GOLDEALSCLUB.COM</div>
    </AbsoluteFill>
  );
};
