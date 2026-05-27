/**
 * Design tokens — pipeline vidéo (canvas 1080×1920).
 *
 * Source unique de vérité pour les couleurs, ombres, rayons et typographie
 * utilisés dans tout le rendu vidéo. Toute modification visuelle (palette,
 * intensité d'ombre, famille typographique…) doit passer par ce fichier
 * pour garantir une cohérence premium sur l'ensemble des frames.
 */

// ─────────────────────────────  COULEURS  ─────────────────────────────
export const VIDEO_COLORS = {
  ink: "#0a0a0a",          // noir d'encre — texte, badges, contours
  paper: "#fafaf7",        // off-white luxe — fond éditorial
  beige: "#e8e1d4",        // beige Zara
  taupe: "#9a9285",        // taupe — accents discrets
  /** Usage exceptionnel — réservé au header "sponsorisé"/lien externe. */
  link: "#1d8cf0",
  /** À NE PAS UTILISER pour des CTA (charte luxe : pas de rouge promo). */
  red: "#e11d2a",
  alphaInk: (a: number) => `rgba(10,10,10,${a})`,
  alphaBlack: (a: number) => `rgba(0,0,0,${a})`,
  alphaWhite: (a: number) => `rgba(255,255,255,${a})`,
} as const;

// ──────────────────────────────  OMBRES  ──────────────────────────────
export type ShadowToken = {
  color: string;
  blur: number;
  offsetY: number;
};

export const VIDEO_SHADOWS = {
  /** Ombre produit standard (fond gris/beige, sujet coloré). */
  product:       { color: VIDEO_COLORS.alphaBlack(0.28), blur: 42, offsetY: 24 } as ShadowToken,
  /** Ombre renforcée pour les produits clairs (sneakers/t-shirts blancs). */
  productLight:  { color: VIDEO_COLORS.alphaBlack(0.55), blur: 42, offsetY: 24 } as ShadowToken,
  /** Pilule CTA, prix, éléments flottants. */
  pill:          { color: VIDEO_COLORS.alphaBlack(0.18), blur: 30, offsetY: 12 } as ShadowToken,
  /** Halo doux pour le logo marque dans le header. */
  brand:         { color: VIDEO_COLORS.alphaBlack(0.12), blur: 20, offsetY: 8 } as ShadowToken,
} as const;

/** Applique une ShadowToken sur un contexte canvas. */
export function applyShadow(ctx: CanvasRenderingContext2D, s: ShadowToken) {
  ctx.shadowColor = s.color;
  ctx.shadowBlur = s.blur;
  ctx.shadowOffsetY = s.offsetY;
}

/** Réinitialise toute ombre active. */
export function clearShadow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

// ──────────────────────────────  RAYONS  ──────────────────────────────
export const VIDEO_RADII = {
  xs: 2,
  sm: 8,
  md: 14,    // badges prix, blocs cartouches
  lg: 22,
  pill: 9999,
} as const;

// ──────────────────────────  TYPOGRAPHIE  ─────────────────────────────
const SANS = "'Inter','Helvetica',sans-serif";
const SERIF = "'Playfair Display','Didot',Georgia,serif";

/** Construit une `ctx.font` à partir d'un poids + taille + famille. */
export const font = (weight: number, size: number, family: string = SANS) =>
  `${weight} ${size}px ${family}`;

export const VIDEO_TYPO = {
  sans: SANS,
  serif: SERIF,
  // — Frame produit —
  brandLabel:   font(700, 22),   // "NIKE" header gauche
  brandMeta:    font(500, 16),   // sous-titre "Sponsored"
  title:        font(800, 38),   // titre du produit
  priceBig:     font(800, 64),   // prix promo
  priceStrike:  font(500, 38),   // prix barré
  cta:          font(500, 56),   // pilule "Acheter"
  sponso:       font(400, 22),   // bandeau bas
  monogram:     font(900, 480),  // fallback initiale géante
  // — Intro / Outro —
  introLabel:   font(500, 26),
  introHero:    font(200, 220, SERIF),
  introTagline: font(300, 30),
  introRow:     font(500, 22),
  outroHero:    font(200, 150, SERIF),
  outroCta:     font(500, 40),
} as const;

/** Polices à pré-charger avant le rendu (document.fonts.load). */
export const VIDEO_FONT_PRELOAD = [
  font(300, 30),
  font(400, 40),
  font(500, 22),
  font(500, 34),
  font(600, 22),
  font(700, 22),
  font(800, 38),
  font(800, 64),
  font(200, 150, SERIF),
  font(200, 220, SERIF),
] as const;

// ──────────────────────────  BADGE PRIX  ───────────────────────────────
/**
 * Réglages adaptatifs du badge prix. L'algorithme échantillonne la zone
 * sous le badge AVANT de le dessiner et choisit automatiquement une
 * variante claire ou sombre, avec un voile d'opacité + un anneau fin
 * pour garantir la lisibilité sur fond beige, ivoire, gris ou photo
 * texturée.
 */
export const VIDEO_BADGE = {
  /** Couleur de fond du badge en mode "sur fond clair" (par défaut). */
  darkBg: VIDEO_COLORS.ink,
  darkFg: "#ffffff",
  /** Couleur de fond du badge en mode "sur fond sombre". */
  lightBg: "#ffffff",
  lightFg: VIDEO_COLORS.ink,
  /** Opacité minimale du fond du badge — assure un contraste constant. */
  fillOpacity: 0.96,
  /** Anneau de contour fin (toujours appliqué pour décoller du fond). */
  ringWidth: 1.5,
  ringDarkBg: VIDEO_COLORS.alphaWhite(0.18),
  ringLightBg: VIDEO_COLORS.alphaBlack(0.18),
  /** Seuil de luminance (0-255) au-dessus duquel le fond est jugé "clair". */
  luminanceThreshold: 150,
  /** Voile additionnel quand le contraste mesuré est insuffisant. */
  scrimOpacity: 0.12,
  /** Contraste minimal (ratio simple bg/fg sur 0-255) sous lequel on renforce. */
  minContrast: 90,
  /**
   * Ratio d'inset (0-0.49) appliqué à la zone d'échantillonnage par rapport
   * à la boîte du badge. Un inset positif évite de capter les pixels du
   * voisinage (ombres, ring, transitions photo) et stabilise le rendu.
   */
  sampleInsetRatio: 0.12,
  /** Plafond de pixels échantillonnés — borne la charge CPU. */
  sampleMaxPixels: 4096,
  /** Pas minimum entre deux pixels échantillonnés (perf). */
  sampleMinStride: 3,
} as const;

/**
 * Calcule le rectangle d'échantillonnage à utiliser pour mesurer la
 * luminance derrière un badge. On rétrécit volontairement la boîte vers
 * le centre (inset) pour ne capter QUE les pixels qui seront masqués par
 * le badge — pas les ombres, le ring ou le voisinage photo. Le rectangle
 * est borné aux dimensions du canvas pour éviter tout débordement.
 */
export function getBadgeSampleRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  insetRatio = VIDEO_BADGE.sampleInsetRatio,
): { x: number; y: number; w: number; h: number } {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const inset = Math.max(0, Math.min(0.49, insetRatio));
  const ix = x + w * inset;
  const iy = y + h * inset;
  const iw = w * (1 - inset * 2);
  const ih = h * (1 - inset * 2);
  const sx = Math.max(0, Math.min(cw - 1, Math.round(ix)));
  const sy = Math.max(0, Math.min(ch - 1, Math.round(iy)));
  const sw = Math.max(1, Math.min(cw - sx, Math.round(iw)));
  const sh = Math.max(1, Math.min(ch - sy, Math.round(ih)));
  return { x: sx, y: sy, w: sw, h: sh };
}

/**
 * Échantillonne la luminance moyenne d'une zone canvas (0 → 255).
 * Pas adaptatif : on vise ~`sampleMaxPixels` pixels lus quel que soit
 * le format de la zone, ce qui rend le rendu stable et borne le coût.
 */
export function sampleAreaLuminance(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): number {
  try {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const sx = Math.max(0, Math.min(cw - 1, Math.round(x)));
    const sy = Math.max(0, Math.min(ch - 1, Math.round(y)));
    const sw = Math.max(1, Math.min(cw - sx, Math.round(w)));
    const sh = Math.max(1, Math.min(ch - sy, Math.round(h)));
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    const totalPx = sw * sh;
    const stride = Math.max(
      VIDEO_BADGE.sampleMinStride,
      Math.ceil(Math.sqrt(totalPx / VIDEO_BADGE.sampleMaxPixels)),
    );
    let sum = 0;
    let count = 0;
    for (let py = 0; py < sh; py += stride) {
      for (let px = 0; px < sw; px += stride) {
        const i = (py * sw + px) * 4;
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        count++;
      }
    }
    return count ? sum / count : 128;
  } catch {
    return 128;
  }
}

/**
 * Sélectionne les couleurs du badge prix en fonction de la luminance
 * mesurée derrière sa zone. Renvoie aussi un voile d'appoint si le
 * contraste reste trop faible.
 */
export function pickBadgeContrast(bgLuminance: number) {
  const isLightBg = bgLuminance > VIDEO_BADGE.luminanceThreshold;
  const fill = isLightBg ? VIDEO_BADGE.darkBg : VIDEO_BADGE.lightBg;
  const fg = isLightBg ? VIDEO_BADGE.darkFg : VIDEO_BADGE.lightFg;
  const ring = isLightBg ? VIDEO_BADGE.ringLightBg : VIDEO_BADGE.ringDarkBg;
  // Estime le contraste fill vs bg (proche du seuil → scrim).
  const fillLum = isLightBg ? 10 : 245;
  const contrast = Math.abs(fillLum - bgLuminance);
  const needsScrim = contrast < VIDEO_BADGE.minContrast;
  return {
    fill,
    fg,
    ring,
    fillOpacity: VIDEO_BADGE.fillOpacity,
    ringWidth: VIDEO_BADGE.ringWidth,
    scrim: needsScrim ? VIDEO_BADGE.scrimOpacity : 0,
    isLightBg,
  };
}
