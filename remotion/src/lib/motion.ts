/**
 * Motion utilities partagées : arrondi global anti-jitter
 * + cadence commune des bandeaux (rails, hairlines, springs).
 *
 * Tous les helpers passent par SNAP_ENABLED pour pouvoir désactiver
 * l'arrondi globalement (debug). En prod on garde true pour éviter
 * tout shimmer sub-pixel.
 */
import { spring, interpolate } from "remotion";

// ── Options globales ──────────────────────────────────────────────
export const SNAP_ENABLED = true;
export const SETTLE_THRESHOLD = 0.995;

// ── Arrondis ──────────────────────────────────────────────────────
/** Arrondi entier (translate en px) */
export const snap = (v: number) => (SNAP_ENABLED ? Math.round(v) : v);
/** Arrondi 3 décimales (scale) */
export const snapScale = (v: number) =>
  SNAP_ENABLED ? Math.round(v * 1000) / 1000 : v;
/** Fige une spring une fois quasi-stabilisée pour éviter les micro-oscillations */
export const settle = (v: number) => (v > SETTLE_THRESHOLD ? 1 : v);

// ── GPU layer commun ─────────────────────────────────────────────
export const gpuLayer: React.CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitFontSmoothing: "antialiased",
  transform: "translateZ(0)",
};

// ── Cadence commune des bandeaux ─────────────────────────────────
// Toutes les scènes partagent ces frames pour un rythme homogène.
export const TIMING = {
  rail: { in: 0, out: 12 },        // hairlines / rails latéraux
  eyebrow: { in: 6, out: 20 },     // libellés secondaires
  heroDelay: 10,                   // décalage du hero
  secondaryDelay: 22,              // prix / numéro / url
  ctaIn: 38,
  ctaOut: 52,
} as const;

// ── Spring presets partagés ──────────────────────────────────────
export const SPRING_PRESETS = {
  hero: { damping: 22, stiffness: 110 },
  header: { damping: 22, stiffness: 120 },
  image: { damping: 24, stiffness: 100 },
  price: { damping: 22, stiffness: 130 },
  num: { damping: 20, stiffness: 130 },
  rule: { damping: 200 },
} as const;

type SpringArgs = {
  frame: number;
  fps: number;
  delay?: number;
  preset?: keyof typeof SPRING_PRESETS;
  duration?: number;
};

/** Spring auto-settlée — usage : settled({ frame, fps, delay: 10, preset: "hero" }) */
export const settled = ({
  frame,
  fps,
  delay = 0,
  preset = "hero",
  duration = 30,
}: SpringArgs) =>
  settle(
    spring({
      frame: frame - delay,
      fps,
      config: SPRING_PRESETS[preset],
      durationInFrames: duration,
    })
  );

/** Opacité standard 0→1 depuis une spring settlée */
export const fadeIn = (sp: number) => interpolate(sp, [0, 1], [0, 1]);
/** TranslateY arrondi entre [from, 0] piloté par spring */
export const slideY = (sp: number, from: number) =>
  snap(interpolate(sp, [0, 1], [from, 0]));
/** Scale arrondi entre [from, 1] piloté par spring */
export const popScale = (sp: number, from: number) =>
  snapScale(interpolate(sp, [0, 1], [from, 1]));
