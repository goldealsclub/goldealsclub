# QA visuelle Remotion

Génère et compare des stills par scène pour repérer halos / tremblements.
La QA est isolée **par direction artistique** (`adidas` / `zara` / `nike`) :
chaque style a ses propres baselines, donc bumper Zara ne casse pas Adidas.

```bash
cd remotion
# première fois : crée les baselines du style adidas (défaut)
bun qa:update                       # = --update --style=adidas (par défaut script)
bun qa:update:zara                  # baselines Zara
bun qa:update:nike                  # baselines Nike

# à chaque itération : compare au baseline + détecte le jitter
bun qa                              # adidas
bun qa:zara
bun qa:nike

# ou forme générique
node scripts/qa-frames.mjs --style=zara --scene=deal
```

Sortie (isolée par style) :
- `qa/current/<style>/`  – stills du run (gitignored)
- `qa/baseline/<style>/` – référence versionnée (committée)
- `qa/diff/<style>/`     – pixels qui ont bougé (gitignored)
- `qa/report.json` ou `qa/report-<scene>.json` – résumé chiffré, mode CI

Exit code `2` = régression au-dessus des seuils.

## Directions artistiques

| `--style=`  | Vibe                          | Layouts                                |
|-------------|-------------------------------|----------------------------------------|
| `adidas`    | Geometric & graphic           | Split asymétrique, bandes diagonales, bloc ink |
| `zara`      | Editorial fashion serif       | Centré, full-bleed produit, serif Playfair |
| `nike`      | Athletic & kinetic            | Carte ink + chip orange accent, spring bouncy |

Switcher = changer un seul paramètre — aucune scène n'est dupliquée, tout passe par les tokens de `src/lib/styles.ts`.

## Seuils

Tout est piloté par **`qa/thresholds.json`** (versionné). Pas besoin de toucher au code.

```jsonc
{
  "pixelmatch": 0.1,             // 0 strict → 1 laxiste
  "defaults": {
    "jitter": 0.15,              // % pixels qui bougent settled vs settled+1
    "visual": { "entry": 2.0, "settled": 2.0, "exit": 2.0 }
  },
  "scenes": {
    "intro": { "jitter": 0.15, "visual": { "entry": 2.0, "settled": 2.0, "exit": 2.0 } },
    "deal":  { "jitter": 0.15, "visual": { "entry": 2.0, "settled": 2.0, "exit": 2.0 } },
    "outro": { "jitter": 0.15, "visual": { "entry": 2.0, "settled": 2.0, "exit": 2.0 } }
  }
}
```

| Test            | Détecte                       |
|-----------------|-------------------------------|
| Diff visuel     | halos, drift layout, palette  |
| Jitter (f+1)    | tremblement résiduel          |

### Surcharges ponctuelles (ordre de priorité décroissant)

1. Flags CLI : `--jitter=0.3 --visual=3 --pixelmatch=0.15`
2. Env par phase : `QA_VISUAL_DEAL_SETTLED=4`
3. Env par scène : `QA_JITTER_DEAL=0.3`, `QA_VISUAL_INTRO=3`
4. Env globaux : `QA_JITTER`, `QA_VISUAL`, `QA_PIXELMATCH`
5. `qa/thresholds.json` (defaults + per-scene)
6. Valeurs hard-codées (fallback)

Config alternative : `--config=path/to/file.json`.

### Sur GitHub Actions

Le workflow **Remotion QA visuelle** (onglet *Actions* → *Run workflow*) expose
les mêmes seuils comme inputs (`jitter`, `visual`, `pixelmatch`, et override
par scène) — laisser vide pour utiliser `qa/thresholds.json`.
