/**
 * OutroScene — direction Adidas geometric & graphic.
 *
 * Fond noir plein, "À DEMAIN." en Archivo Black massif au centre-gauche.
 * Trois bandes diagonales blanches qui sweepent en signature 3-stripes,
 * URL clouée en bas avec filet horizontal.
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
const PAPER_SOFT = "rgba(244,241,234,0.55)";

const linEase = (t: number) => Math.max(0, Math.min(1, t));

const slideIn = (frame: number, delay: number, dur: number, from: number) => {
  const t = linEase((frame - delay) / dur);
  return { t, y: snap(interpolate(t, [0, 1], [from, 0])) };
};

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps: _fps } = useVideoConfig();

  // ── Bandes diagonales (3-stripes) — signature ──
  const stripeT = (i: number) => linEase((frame - (6 + i * 5)) / 22);

  // ── Eyebrow ──
  const eyeT = linEase((frame - 14) / 10);

  // ── Hero lines stagger ──
  const l1 = slideIn(frame, 18, 12, 70);
  const l2 = slideIn(frame, 26, 12, 70);

  // ── Filet + URL ──
  const ruleW = snap(interpolate(linEase((frame - 38) / 16), [0, 1], [0, 600]));
  const urlT = linEase((frame - 50) / 14);

  return (
    <AbsoluteFill style={{ background: INK }}>
      {/* ── Bandes diagonales blanches ── */}
      {[0, 1, 2].map((i) => {
        const t = stripeT(i);
        const x = snap(interpolate(t, [0, 1], [1400, 0]));
        return (
          <div key={i} style={{
            position: "absolute",
            top: 100 + i * 130, left: -200,
            width: 1500, height: 90,
            background: PAPER,
            transform: `translate3d(${x}px, 0, 0) rotate(-22deg)`,
            transformOrigin: "0 0",
            opacity: 0.06 + i * 0.02,
            ...gpuLayer,
          }} />
        );
      })}

      {/* ── Header eyebrow ── */}
      <div style={{
        position: "absolute", top: 110, left: 60, right: 60,
        display: "flex", justifyContent: "space-between",
        fontFamily: inter, fontWeight: 700,
        fontSize: 20, color: PAPER_SOFT, letterSpacing: 8,
        opacity: eyeT,
      }}>
        <span>GOLDEALS · CLUB</span>
        <span style={{ fontFamily: bebas, fontSize: 26, color: PAPER, letterSpacing: 6 }}>
          ÉDITION TERMINÉE
        </span>
      </div>

      {/* ── Hero ── */}
      <div style={{
        position: "absolute", top: 700, left: 60, right: 60,
        display: "flex", flexDirection: "column", gap: 6,
        overflow: "hidden",
      }}>
        <div style={{
          fontFamily: archivo, fontWeight: 900,
          fontSize: 240, color: PAPER,
          lineHeight: 0.88, letterSpacing: -8,
          textTransform: "uppercase",
          opacity: l1.t,
          transform: `translate3d(0, ${l1.y}px, 0)`,
          ...gpuLayer,
        }}>À DEMAIN.</div>
        <div style={{
          marginTop: 24,
          fontFamily: bebas, fontSize: 56, color: PAPER_SOFT, letterSpacing: 8,
          opacity: l2.t,
          transform: `translate3d(0, ${l2.y}px, 0)`,
          ...gpuLayer,
        }}>NOUVELLE SÉLECTION CHAQUE JOUR</div>
      </div>

      {/* ── Filet + URL pied ── */}
      <div style={{
        position: "absolute", bottom: 130, left: 60,
        height: 3, width: ruleW, background: PAPER,
        ...gpuLayer,
      }} />
      <div style={{
        position: "absolute", bottom: 70, left: 60, right: 60,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: urlT,
        fontFamily: inter, fontWeight: 700,
      }}>
        <span style={{ fontSize: 32, color: PAPER, letterSpacing: 8 }}>
          GOLDEALSCLUB.COM
        </span>
        <span style={{
          fontFamily: archivo, fontWeight: 900,
          fontSize: 28, color: PAPER_SOFT, letterSpacing: 4,
        }}>—</span>
      </div>
    </AbsoluteFill>
  );
};
