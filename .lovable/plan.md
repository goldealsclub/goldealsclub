## Diagnostic

Après lecture de `src/pages/AdminVideoPage.tsx` (2063 lignes, pipeline canvas qui rend réellement la vidéo) :

1. **La direction artistique ne change quasi rien.** `applyBgPreset()` ne swap que la palette (fond, encre, accent). Tout le reste — layout, typographie, header, bloc prix, CTA, transitions, ken-burns — est **monolithique** : Adidas, Zara et Nike sortent à 90% identiques avec juste un fond légèrement différent. Le preset `nike` n'utilise même pas son orange `#fa5400` dans le badge prix.
2. **Détourage catastrophique.** `getCutout()` (lignes 432-577) fait un flood-fill global qui :
   - laisse des halos colorés sur fonds non blancs (Snipes, lifestyle…),
   - écrase les ombres portées naturelles du produit,
   - applique un contour silhouette systématique (le « liseré pixellisé »),
   - se déclenche même quand le fond est déjà parfaitement propre → dégrade au lieu d'améliorer.

## Plan d'action

### 1. Refonte du système de direction artistique (impact visuel max)

Créer `src/lib/video-art-direction.ts` : un objet `ART_DIRECTIONS[bgPreset]` qui expose **tout** ce qui doit varier — pas juste les couleurs :

```text
ArtDirection {
  palette          (existant)
  layout: {
    productPad, productStageY, productStageH,
    headerStyle:   'split' | 'centered' | 'kinetic',
    priceLayout:   'block-bottom' | 'baseline-serif' | 'kinetic-card',
    ctaStyle:      'underline' | 'minimal' | 'pill-accent',
    showStripes:   bool,    // 3-stripes Adidas
    showDossard:   bool,    // 01/05
    showGhostBrand:bool,    // wordmark fantôme
  }
  typography: {
    display:   { family, weight, tracking, transform }
    body:      { ... }
    titleSize, priceSize, eyebrowSize
  }
  motion: {
    revealCurve:    'expo' | 'quint' | 'spring',
    transitionDur:  ms,
    kenBurnsAmp:    number,
    staggerMul:     number,
  }
  accents: {
    priceChipBg:   'paper' | 'accent' | 'ink',
    priceChipFg:   string,
    underlineColor:string,
  }
}
```

Trois presets vraiment distincts :

- **Adidas** — geometric : split header avec dossard `01/05`, 3-stripes au sol, bloc prix XXL en bas, ghost wordmark de la marque, Archivo Black tracking serré, motion ferme (easeOutQuart, 280ms).
- **Zara** — editorial : composition centrée, Playfair serif pour titre et prix, beaucoup d'air, line-through discret, pas de chip badge, fades longs (easeInOutCubic, 600ms), ken-burns plus lent.
- **Nike** — kinetic : carte ink à droite décalée, % géant en chip orange `#fa5400`, dossard en oblique, Bebas Neue eyebrow, motion nerveuse (spring stiff, 220ms, stagger 0.7×).

Refactor :

- Découper les fonctions monolithiques `drawAdHeader / drawAdPriceBlock / drawAdCTA / drawDealFullScreen` en variantes par direction (lookup table `{ split: drawHeaderSplit, centered: drawHeaderCentered, kinetic: drawHeaderKinetic }`).
- Remplacer les constantes module-scope `IVOIRE / GOLD / NOIR` par lecture directe de `getActiveDirection()` (single source of truth, pas de drift).
- Étendre `BgPreset` : `paper | adidas | zara | nike | charcoal | ivoire` (les 3 derniers gardent l'ancien rendu monolithique pour ne rien casser).

### 2. Refonte du détourage produit

Remplacer `getCutout()` par `cutoutProduct()` en 3 passes intelligentes :

1. **Détection préalable** — si l'image a déjà un canal alpha (PNG transparent ecommerce) ou un fond uniforme < 8 d'écart-type RGB sur les 4 coins **ET** lum > 240 → **on ne touche à rien**, l'image est déjà propre. Aujourd'hui on dégrade ces images.
2. **Flood-fill avec tolérance adaptative** par bande de luminance (au lieu d'un seuil unique), pour mieux gérer les dégradés Snipes / fonds gris doux.
3. **Edge-aware feathering** — au lieu du smoothstep aveugle qui produit le halo, utiliser un kernel 3×3 sur les pixels candidats : on ne décrémente l'alpha que si la majorité des voisins sont aussi marqués « fond » → arrête les nuages pixelisés autour des semelles.
4. **Supprimer le contour silhouette par défaut** (lignes 1072-1089). Aujourd'hui un offset 8 directions est dessiné → ça crée un liseré gras sur tous les produits. Le passer en **opt-in** par direction artistique (`accents.productOutline: false` partout sauf Adidas où on garde un 1px très subtil).
5. **Préserver les ombres naturelles** — détecter la composante d'ombre sous le produit (zone juste sous la bbox du produit, lum < bg) et la conserver hors du masque alpha.

Toutes les options exposées via les flags de la direction artistique, donc Zara peut demander « zéro contour, multiply propre » et Nike « hard cutout + ombre dropshadow ».

### 3. QA visuelle dédiée

- Ajouter `scripts/qa-video-frames.mjs` : pour chaque direction `{adidas, zara, nike}`, rendre la frame du 1er deal (`drawDealFullScreen` dans un canvas offscreen via jsdom + canvas) et la sauvegarder dans `qa/video-directions/baseline/`.
- Étendre le workflow `style-preview-qa.yml` existant pour aussi capturer ces 3 frames → détection immédiate si une refonte casse une direction.
- Tests unitaires `src/test/art-direction.test.ts` qui vérifient que chaque preset expose bien toutes les clés requises (pas de fallback silencieux sur Adidas).

### 4. Validation manuelle

- Rendre 3 vidéos de bout en bout (1 par direction) via `bun run dev` + `/admin/video`, screenshots de 4 frames clés (intro / deal-2 / deal-5 / outro) postés dans le chat avec comparaison côte à côte.
- Vérifier sur 3 images produit représentatives :
  - **Nike studio blanc pur** → cutout no-op + multiply propre,
  - **Snipes dégradé gris** → cutout adaptatif sans halo,
  - **Lifestyle dark** → no cutout, l'image passe telle quelle.

## Détails techniques (annexe)

Fichiers touchés :
- `src/lib/video-art-direction.ts` *(nouveau)* — registry direction artistique
- `src/lib/video-cutout.ts` *(nouveau)* — `cutoutProduct()`, helpers de détection
- `src/pages/AdminVideoPage.tsx` — refactor : remplacer `applyBgPreset / IVOIRE / GOLD / getCutout`, découper les `drawAd*` en variantes par layout
- `src/components/admin/StylePreview.tsx` — miniatures alignées sur les nouveaux layouts (split / centered / kinetic)
- `scripts/qa-video-frames.mjs` *(nouveau)* + extension `style-preview-qa.yml`
- `src/test/art-direction.test.ts` *(nouveau)*

Non-régression : les presets `paper / charcoal / ivoire` continuent d'utiliser le pipeline monolithique actuel (zéro changement). Seuls `adidas / zara / nike` passent au nouveau système. `prebuild` reste vert.

Temps estimé : ~6-8 itérations file-edit (la `AdminVideoPage` est très grosse, on procède section par section avec QA frame-by-frame entre chaque).

Tu valides ce plan ? Une fois OK je commence par le registry + le cutout, puis je branche les 3 directions et je te montre les rendus avant d'aller plus loin.
