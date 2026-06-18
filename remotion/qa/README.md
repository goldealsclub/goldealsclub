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

| Test            | Seuil  | Détecte                       |
|-----------------|--------|-------------------------------|
| Diff visuel     | 2.0 %  | halos, drift layout, palette  |
| Jitter (f+1)    | 0.15 % | tremblement résiduel scenes   |

Ajuster en tête de `scripts/qa-frames.mjs`.
