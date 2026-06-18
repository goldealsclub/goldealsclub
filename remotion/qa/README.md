# QA visuelle Remotion

Génère et compare des stills par scène pour repérer halos / tremblements.

```bash
cd remotion
# première fois : crée les baselines
node scripts/qa-frames.mjs --update

# à chaque itération : compare au baseline + détecte le jitter
node scripts/qa-frames.mjs
```

Sortie :
- `qa/current/`  – stills du run (gitignored)
- `qa/baseline/` – référence versionnée (committée)
- `qa/diff/`     – pixels qui ont bougé (gitignored)
- `qa/report.json` – résumé chiffré, mode CI

Exit code `2` = régression au-dessus des seuils.

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
