# StylePreview — Régression visuelle

Vérifie que la grille des 3 directions artistiques (Adidas / Zara / Nike) du
composant `src/components/admin/StylePreview.tsx` reste cohérente sur 3
viewports (desktop 1280, tablet 820, mobile 390).

## Lancer

```bash
# 1) Dev server actif
bun run dev

# 2) Dans un autre terminal
node scripts/qa-style-preview.mjs                 # check
node scripts/qa-style-preview.mjs --update        # régénère les baselines
node scripts/qa-style-preview.mjs --retries=2     # relance auto les scènes en échec
node scripts/qa-style-preview.mjs --report        # écrit qa/style-preview/report.md
```

En CI (`CI=true`), `--retries=2` et `--report` sont activés par défaut.

## Seuil

0.15 % de pixels différents max par scène (identique au QA Remotion).
Au-dessus → diff écrite dans `qa/style-preview/diff/<scene>.png`, version
annotée avec bounding boxes dans `<scene>-zones.png`, et exit code 1.

## Auto-retry + rapport CI

Le workflow `style-preview-qa.yml` :

1. Lance le script avec `--retries=2 --report` → toute scène qui échoue est
   recapturée jusqu'à 2 fois avant d'être déclarée régression (filtre les
   flakes : font loading, layout pre-paint, etc.).
2. Upload `actual/`, `diff/` (incl. `*-zones.png`), `report.json` et
   `report.md` en artifact `style-preview-diffs`.
3. Poste un commentaire sticky sur la PR avec le tableau des scènes en
   échec et les coordonnées (x/y/w/h) des zones de divergence.

## Quand mettre à jour les baselines ?

Uniquement quand le changement visuel de `StylePreview.tsx` est **voulu** :
nouvelle palette, nouveau layout, nouveau preset. Sinon : c'est une
régression à corriger.

