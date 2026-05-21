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
