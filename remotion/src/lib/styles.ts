/**
 * Direction artistique des vidéos Remotion — 3 presets switchables.
 *
 * Chaque style = un set de tokens (palette, polices, motion, layout)
 * que les scènes consomment via `useStyle()` au lieu de constantes en
 * dur. Ajouter un style = ajouter une entrée dans `STYLES`.
 *
 * Naming : on parle de "style" (direction artistique) et non de "theme"
 * pour éviter la collision avec `themeKey` côté pipeline
 * (sneakers / streetwear / accessoires).
 */
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

// On force le chargement des 4 familles au boot — Remotion attend
// l'idle des fonts avant de rendre, donc pas de FOUT entre scènes.
const { fontFamily: archivo } = loadArchivo("normal", {
  weights: ["700", "800", "900"], subsets: ["latin"],
});
const { fontFamily: bebas } = loadBebas("normal", {
  weights: ["400"], subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["400", "500", "600", "700"], subsets: ["latin"],
});
const { fontFamily: playfair } = loadPlayfair("normal", {
  weights: ["400", "500", "600"], subsets: ["latin"],
});

export type StyleId = "adidas" | "zara" | "nike";

export type TransitionKind = "wipe" | "fade" | "slide";
export type IntroLayout = "split" | "editorial" | "centered";
export type DealLayout = "block-bottom" | "full-bleed-serif" | "kinetic-card";
export type OutroLayout = "stripes-signature" | "serif-fade" | "kinetic-cuts";

export interface VideoStyle {
  id: StyleId;
  label: string;

  // ── Palette ────────────────────────────────────────────────────
  ink: string;        // texte / blocs sombres
  paper: string;      // fond clair
  paperDeep: string;  // gradient bas du fond
  inkSoft: string;    // texte secondaire (sur paper)
  paperSoft: string;  // texte secondaire (sur ink)
  accent: string;     // couleur accent (utilisée avec parcimonie)

  // ── Polices ────────────────────────────────────────────────────
  fonts: {
    display: string;   // titres XXL
    kinetic: string;   // eyebrow / compteurs / labels
    body: string;      // texte courant
  };

  // ── Motion ─────────────────────────────────────────────────────
  motion: {
    /** spring bouncy vs slide linéaire ferme */
    useSpring: boolean;
    /** easing pour les slides linéaires (ignoré si useSpring) */
    easing: (t: number) => number;
    /** durée des transitions de scène (frames) */
    transitionFrames: number;
    /** type de transition entre scènes */
    transitionKind: TransitionKind;
    /** durations multiplier pour les staggers internes (1 = défaut) */
    staggerMul: number;
  };

  // ── Layouts par scène ──────────────────────────────────────────
  intro: {
    layout: IntroLayout;
    showStripes: boolean;
    heroLines: string[]; // multi-lignes (adidas/nike) ou 1 ligne (zara)
    heroFontSize: number;
    heroLetterSpacing: number;
    heroFont: "display" | "body"; // body = serif Playfair en Zara
    heroLineHeight: number;
  };
  deal: {
    layout: DealLayout;
    showStripes: boolean;
    showDossard: boolean;
    showGhostBrand: boolean;
    titleUppercase: boolean;
    priceFontSize: number;
    discountChipBg: "paper" | "accent";
  };
  outro: {
    layout: OutroLayout;
    showStripes: boolean;
    heroText: string;
    heroFontSize: number;
    heroFont: "display" | "body";
    heroLetterSpacing: number;
    background: "ink" | "paper";
  };
}

// ── Easings ──────────────────────────────────────────────────────
const linEase = (t: number) => Math.max(0, Math.min(1, t));
const easeOutQuart = (t: number) => 1 - Math.pow(1 - linEase(t), 4);
const easeInOutCubic = (t: number) => {
  const c = linEase(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

// ─────────────────────────────────────────────────────────────────
// PRESETS
// ─────────────────────────────────────────────────────────────────
export const STYLES: Record<StyleId, VideoStyle> = {
  adidas: {
    id: "adidas",
    label: "Adidas — geometric & graphic",
    ink: "#0a0a0a",
    paper: "#f4f1ea",
    paperDeep: "#e3ddd1",
    inkSoft: "rgba(10,10,10,0.55)",
    paperSoft: "rgba(244,241,234,0.6)",
    accent: "#0a0a0a",
    fonts: { display: archivo, kinetic: bebas, body: inter },
    motion: {
      useSpring: false,
      easing: easeOutQuart,
      transitionFrames: 16,
      transitionKind: "wipe",
      staggerMul: 1,
    },
    intro: {
      layout: "split",
      showStripes: true,
      heroLines: ["DEALS", "OF THE", "DAY."],
      heroFontSize: 200,
      heroLetterSpacing: -6,
      heroFont: "display",
      heroLineHeight: 0.88,
    },
    deal: {
      layout: "block-bottom",
      showStripes: true,
      showDossard: true,
      showGhostBrand: true,
      titleUppercase: true,
      priceFontSize: 230,
      discountChipBg: "paper",
    },
    outro: {
      layout: "stripes-signature",
      showStripes: true,
      heroText: "À DEMAIN.",
      heroFontSize: 240,
      heroFont: "display",
      heroLetterSpacing: -8,
      background: "ink",
    },
  },

  zara: {
    id: "zara",
    label: "Zara — editorial fashion",
    ink: "#1a1a1a",
    paper: "#f7f4ed",
    paperDeep: "#ece6da",
    inkSoft: "rgba(26,26,26,0.5)",
    paperSoft: "rgba(247,244,237,0.65)",
    accent: "#9a9285", // taupe
    fonts: { display: playfair, kinetic: inter, body: inter },
    motion: {
      useSpring: false,
      easing: easeInOutCubic,
      transitionFrames: 32,
      transitionKind: "fade",
      staggerMul: 1.6, // tout plus lent
    },
    intro: {
      layout: "centered",
      showStripes: false,
      heroLines: ["Sélection"],
      heroFontSize: 230,
      heroLetterSpacing: -2,
      heroFont: "body", // = playfair via display swap
      heroLineHeight: 1.0,
    },
    deal: {
      layout: "full-bleed-serif",
      showStripes: false,
      showDossard: false,
      showGhostBrand: false,
      titleUppercase: false,
      priceFontSize: 180,
      discountChipBg: "paper",
    },
    outro: {
      layout: "serif-fade",
      showStripes: false,
      heroText: "À demain.",
      heroFontSize: 200,
      heroFont: "body",
      heroLetterSpacing: -1,
      background: "paper",
    },
  },

  nike: {
    id: "nike",
    label: "Nike — athletic & kinetic",
    ink: "#0a0a0a",
    paper: "#f4f1ea",
    paperDeep: "#e3ddd1",
    inkSoft: "rgba(10,10,10,0.55)",
    paperSoft: "rgba(244,241,234,0.6)",
    accent: "#fa5400", // orange Nike, usage chip uniquement
    fonts: { display: archivo, kinetic: bebas, body: inter },
    motion: {
      useSpring: true,
      easing: easeOutQuart,
      transitionFrames: 12,
      transitionKind: "slide",
      staggerMul: 0.75, // tout plus nerveux
    },
    intro: {
      layout: "split",
      showStripes: true,
      heroLines: ["JUST", "DEAL.", "DONE."],
      heroFontSize: 220,
      heroLetterSpacing: -7,
      heroFont: "display",
      heroLineHeight: 0.85,
    },
    deal: {
      layout: "kinetic-card",
      showStripes: false,
      showDossard: true,
      showGhostBrand: false, // tout sur le produit + %
      titleUppercase: true,
      priceFontSize: 240,
      discountChipBg: "accent", // orange Nike
    },
    outro: {
      layout: "kinetic-cuts",
      showStripes: true,
      heroText: "TOMORROW.",
      heroFontSize: 180,
      heroFont: "display",
      heroLetterSpacing: -9,
      background: "ink",
    },
  },
};

export const DEFAULT_STYLE_ID: StyleId = "adidas";

export const getStyle = (id?: StyleId | string): VideoStyle => {
  if (id && id in STYLES) return STYLES[id as StyleId];
  return STYLES[DEFAULT_STYLE_ID];
};
