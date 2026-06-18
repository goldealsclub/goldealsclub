# Variantes de style pour les vidéos Remotion

Objectif : pouvoir switcher entre 3 directions artistiques (Adidas geometric — actuel, Zara editorial, Nike kinetic) en changeant **un seul paramètre**, sans dupliquer les 3 fichiers de scènes.

## Architecture

Un **thème = un objet de tokens** (palette, polices, easing, transition, options de layout). Les 3 scènes lisent ces tokens via un `useTheme()` au lieu de constantes en dur. Les variations « lourdes » (split asymétrique, bandes 3-stripes, serif éditorial) deviennent des **booléens conditionnels** dans le même JSX.

```text
remotion/src/
  lib/
    themes.ts            ← NOUVEAU : type Theme + 3 presets
    theme-context.tsx    ← NOUVEAU : Provider + useTheme()
    motion.ts            ← inchangé
  MainVideo.tsx          ← wrap dans <ThemeProvider themeId={...} />
  Root.tsx               ← 3 compositions : main-adidas / main-zara / main-nike
  scenes/
    IntroScene.tsx       ← lit useTheme(), branches selon tokens
    DealScene.tsx        ← idem
    OutroScene.tsx       ← idem
```

## Tokens exposés par chaque thème

| Catégorie | Champs |
|---|---|
| Palette | `ink`, `paper`, `paperDeep`, `inkSoft`, `paperSoft`, `accent` |
| Fonts | `display` (gros titres), `kinetic` (eyebrow/compteur), `body` |
| Motion | `useSpring` (bool), `easing` (fn), `staggerMs`, `transitionKind` (`wipe` / `fade` / `slide`), `transitionFrames` |
| Layout intro | `layout` (`split` / `editorial` / `centered`), `showStripes`, `heroLines` (3 lignes Adidas ou serif 1 ligne Zara) |
| Layout deal | `dealLayout` (`block-bottom` / `full-bleed-serif` / `kinetic-card`), `showStripes`, `showDossard` |
| Layout outro | `outroLayout` (`stripes-signature` / `serif-fade` / `kinetic-cuts`) |

## Les 3 presets

**`adidas` (actuel, par défaut)** — palette ivoire/encre, Archivo Black + Bebas, motion linear ferme, transitions wipe/slide, bandes diagonales visibles, dossard 01/05 encadré, split asymétrique intro.

**`zara`** — palette ivoire/taupe/encre, Playfair Display (serif fin) + Inter, motion lent fade-only avec easeInOut, transitions fade longues (35f), **pas de bandes**, layout intro centré, deal full-bleed produit + serif oversize, beaucoup de silence visuel, prix en chiffres fins.

**`nike`** — palette ivoire/encre + accent unique (orange Nike #FA5400 utilisé avec parcimonie), Bebas Neue + Archivo Black ultra-condensés, motion **spring bouncy** (damping 12), transitions slide rapides (12f), grosse % géant en type-as-design, cuts nerveux, pas de wordmark fantôme — tout sur le produit et le %.

## Mécanisme de switch

1. **Via composition** : `Root.tsx` enregistre 3 IDs (`main-adidas`, `main-zara`, `main-nike`) qui passent tous le même `MainVideo` avec `defaultProps={{ themeId }}`.
2. **Via CLI render** : `bunx remotion render src/index.ts main-zara out.mp4` ou override : `--props='{"themeId":"nike"}'`.
3. **Via UI admin** : la page `/admin/video` reçoit un select Adidas/Zara/Nike qui appelle le pipeline avec la bonne compo (changement côté `remotion/scripts/generate-variant.mjs` : prend un `--theme` flag).

## Refacto des scènes (inchangé côté layout par défaut)

Chaque scène garde sa structure JSX actuelle. Les valeurs hardcodées (`INK`, `PAPER`, `archivo`, `linEase`, durées, présence des stripes…) deviennent `const t = useTheme()` + `t.ink`, `t.fonts.display`, `t.ease`, `t.intro.showStripes && (...)`. Aucun fichier scène n'est dupliqué — un seul JSX qui réagit aux tokens.

Pour Zara où la structure diverge vraiment (serif 1 ligne au lieu de 3 lignes Archivo) : un sous-bloc `{t.intro.layout === "editorial" ? <EditorialHero/> : <KineticHero/>}` à l'intérieur de la même `IntroScene`.

## QA & non-régression

- `scripts/qa-frames.mjs` reçoit `--theme=adidas|zara|nike` et écrit `qa/report-<scene>-<theme>.json` + baselines `qa/baseline/<theme>/<scene>-...png`.
- `.github/workflows/remotion-qa.yml` : matrice élargie `scene × theme` (9 jobs au lieu de 3) ; chaque thème a sa baseline indépendante donc un changement Zara n'invalide pas Adidas.
- Seuils dans `qa/thresholds.json` : ajout d'une clé `themes` optionnelle pour surcharger par thème si besoin.

## Pipeline de génération

- `remotion/scripts/generate-variant.mjs` accepte `--theme=<id>` (défaut `adidas`) et rend `main-<theme>`.
- `remotion/scripts/generate-weekly.mjs` boucle sur les 3 thèmes si on veut produire les 3 variantes le même jour.

## Livrables

1. `remotion/src/lib/themes.ts` — types + 3 presets
2. `remotion/src/lib/theme-context.tsx` — Provider + hook
3. `remotion/src/MainVideo.tsx` — accepte `themeId` prop, wrap dans Provider, transitions choisies selon `t.transition`
4. `remotion/src/Root.tsx` — 3 compositions `main-{adidas,zara,nike}` + QA solo compositions paramétrées par thème
5. `remotion/src/scenes/{Intro,Deal,Outro}Scene.tsx` — branchées sur `useTheme()`, layouts conditionnels
6. `remotion/scripts/qa-frames.mjs` — flag `--theme`, baselines isolées
7. `remotion/scripts/generate-variant.mjs` + `generate-weekly.mjs` — flag `--theme`
8. `.github/workflows/remotion-qa.yml` — matrice `scene × theme`
9. `remotion/qa/README.md` — doc des 3 thèmes + commandes
