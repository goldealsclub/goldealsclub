# StylePreview — Régression visuelle

Vérifie que la grille des 3 directions artistiques (Adidas / Zara / Nike) du
composant `src/components/admin/StylePreview.tsx` reste cohérente sur 3
viewports (desktop 1280, tablet 820, mobile 390).

## Lancer

```bash
# 1) Dev server actif
bun run dev

# 2) Dans un autre terminal
node scripts/qa-style-preview.mjs           # check
node scripts/qa-style-preview.mjs --update  # régénère les baselines
```

## Seuil

0.15 % de pixels différents max par scène (identique au QA Remotion).
Au-dessus → image de diff écrite dans `qa/style-preview/diff/<scene>.png`
et exit code 1.

## Quand mettre à jour les baselines ?

Uniquement quand le changement visuel de `StylePreview.tsx` est **voulu** :
nouvelle palette, nouveau layout, nouveau preset. Sinon : c'est une
régression à corriger.
