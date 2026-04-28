# Procédé de non-régression — GOLDEALS CLUB

Site marchand : **toute régression coûte des ventes**. Cette doc décrit
le filet de sécurité multi-niveaux mis en place pour qu'aucune
régression critique n'atteigne la prod.

## 🛡️ 4 niveaux de protection

### 1. Tests unitaires (rapides, isolés)

| Fichier | Vérifie |
|---------|---------|
| `src/test/brand-filtering.test.ts` | Logique `inferBrand` / `canonicalizeBrand`, rejet des tokens génériques (Sportswear, Originals, WMNS), fallback "Non classé" |
| `supabase/functions/deals-json/pipeline_test.ts` | Logique `PROTECTED_MERCHANTS` + pagination — reproduit le scénario "merchant starvation" sans dépendre du live |

### 2. Audit live (catalogue actuel)

| Fichier | Vérifie |
|---------|---------|
| `src/test/site-audit.test.ts` | **AUDIT COMPLET** : volume ≥ 4 000, marchands protégés non vides, IDs uniques, prix valides, devise EUR, RRP Snipes ≥ 20 %, genres/catégories valides, pureté des filtres marque, URLs https |
| `src/test/deals-pipeline.test.ts` | Volume par marchand sur 30 j, présence des marchands clés (détecte les renommages Awin), variantes de couleur préservées |
| `src/test/brand-filter-audit.test.ts` | Pureté des filtres Nike/adidas (≤ 5 % de pollution), marchands protégés non vides en mode live |

### 3. Bloqueur de build

Le hook `prebuild` lance les 3 audits avant chaque `vite build`. Si un
seul invariant casse, le build échoue → **impossible de déployer une
régression**.

```json
"prebuild": "vitest run brand-filter-audit + brand-filtering + site-audit"
```

### 4. CI continue (GitHub Actions)

`.github/workflows/audit-non-regression.yml` :
- À chaque PR / push main → bloque le merge si régression
- Cron toutes les 6 h → alerte si le pipeline live se dégrade entre
  deux déploiements (ex. flux Awin renommé, scraper en panne)

## 🪂 Fallback en cas de régression

Si malgré tout le pipeline live échoue (Awin down, edge function KO),
deux fallbacks s'enchaînent automatiquement côté frontend
(`src/lib/data.ts`) :

1. Snapshots Storage quotidiens (`deals-snapshots` bucket — généré par
   l'edge function `snapshot-deals` en cron)
2. Fichier statique `public/deals.json` versionné dans le repo

## 🔧 Commandes utiles

```bash
bun run audit:site      # audit live complet (20 invariants)
bun run audit:brands    # audit pureté filtres marque
bun run audit:full      # tous les audits
bun run test            # tests unitaires
```

## ➕ Ajouter une nouvelle règle

Pour protéger un nouvel invariant marchand :

1. Ajouter le test dans `src/test/site-audit.test.ts` (préféré pour
   les invariants live) ou créer un nouveau fichier `src/test/*.test.ts`
2. S'assurer qu'il est inclus dans le script `prebuild` du `package.json`
3. Calibrer les seuils ~30-50 % sous le volume observé en prod pour
   tolérer les variations naturelles

## 📊 Seuils actuels (calibrés 28/04/2026)

| Métrique | Seuil min | Observé |
|----------|-----------|---------|
| Catalogue total | 4 000 | 5 197 |
| Snipes | 300 | 615 |
| Sneakin | 300 | 733 |
| Sport Outlet | 500 | 1 185 |
| Sport Is Good | 500 | 1 590 |
| Snipes RRP | 20 % | 27 % |
| Pollution Nike/adidas | ≤ 5 % | ~0 % |
