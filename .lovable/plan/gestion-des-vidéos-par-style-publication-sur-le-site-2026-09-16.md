# Gestion des vidéos par style + publication sur le site

## 1. Nouvelle page « Vidéos » (admin) — `/admin/videos`

Une page unique pour piloter les vidéos sans relancer de script :

- **Trois colonnes, une par direction artistique** (Adidas, Zara, Nike). Chaque colonne montre la dernière vidéo du style, sa date de publication et son état (brouillon / publiée).
- **Bouton « Régénérer »** par style : relance la génération directement dans le navigateur, avec les offres du jour (les plus fraîches du catalogue), puis archive automatiquement le résultat.
- **Bouton « Publier »** : rend la vidéo visible sur le site public, avec une date de publication choisie (immédiate ou programmée).
- **Bouton « Dépublier »** et **« Supprimer »**.
- **Historique complet** en bas de page, filtrable par style, catégorie et date (reprend l'affichage existant de l'historique vidéo, enrichi du style et de l'état de publication).

## 2. Génération en live

La génération réutilise le moteur déjà en place dans la page « Vidéo du jour » (rendu dans le navigateur), extrait dans un module partagé pour être appelé depuis la nouvelle page :

- sélection automatique des offres fraîches du jour (meilleures remises, images valides) ;
- rendu avec le style choisi ;
- envoi dans le stockage cloud + enregistrement en base (style, date de publication, légende, hashtags).

## 3. Affichage sur le site

Un bloc « En vidéo » sur la page d'accueil montre la ou les vidéos publiées les plus récentes (lecture silencieuse en boucle, format vertical). Seules les vidéos publiées et dont la date de publication est passée sont visibles.

## 4. QA StylePreview

Exécution de la vérification visuelle des trois styles (bureau, tablette, mobile), correction des écarts constatés, puis mise à jour des références avant publication.

## 5. Favoris et agents (MCP)

Les favoris sont déjà rattachés au compte : même liste sur le site et via les agents. Ajouts :

- rechargement automatique de la liste quand elle change ailleurs (autre appareil ou agent), sans recharger la page ;
- bouton « Actualiser » sur la page Favoris ;
- alignement des libellés et de l'affichage avec le reste du site.

## Détails techniques

- Table `generated_videos` : ajout des colonnes `style` (adidas|zara|nike), `published_at` (timestamptz, nullable), `is_published` (bool, défaut false). Politique de lecture publique (anon + authenticated) restreinte à `is_published = true AND published_at <= now()`; écriture réservée aux admins.
- Extraction du moteur de rendu Canvas de `AdminVideoPage.tsx` vers `src/lib/video/render.ts` (aucun changement de rendu, juste un déplacement) pour réutilisation par la nouvelle page.
- Nouvelle page `src/pages/AdminVideosPage.tsx` + route `/admin/videos`, réutilisant `VideoHistory` étendu (colonne style + état publication).
- Composant public `src/components/PublishedVideos.tsx` + requête filtrée sur les vidéos publiées.
- Favoris : abonnement Realtime sur la table `favorites` filtré par utilisateur dans `src/lib/favorites.tsx`.
- QA : `node scripts/qa-style-preview.mjs --report` pour les trois styles, correction des diffs, mise à jour des baselines.
