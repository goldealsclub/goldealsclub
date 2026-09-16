# Correction genres et rendu vidéo

## Objectif
Réduire les classements « Unisexe » injustifiés et rendre les produits plus propres et plus fluides dans les vidéos générées, sans modifier les trois directions artistiques.

## Modifications
- Renforcer l’identification Homme, Femme et Enfant à partir des champs du marchand, du titre, de la catégorie et de formulations multilingues, tout en conservant « Unisexe » pour les cas réellement ambigus.
- Appliquer les mêmes règles à tous les chemins d’import afin d’éviter des résultats différents selon la source.
- Reclasser les offres existantes qui contiennent un signal explicite, par petites opérations sûres, sans deviner le genre des produits ambigus.
- Remplacer le faux détourage par fond blanc + fusion par une préparation d’image sans halo, avec transparence réelle lorsque la source le permet et un repli propre sinon.
- Stabiliser les mouvements produit et bandeaux : interpolation continue, cadence partagée, phase fixe entrée/maintien/sortie et suppression des arrondis image par image qui provoquent les à-coups.
- Vérifier les trois styles sur des captures d’entrée, de maintien et de sortie, puis exécuter les tests de régression existants.

## Détails techniques
- Centraliser les règles de genre pour l’import Awin et l’import standard.
- Produire les packshots en PNG/WebP avec canal alpha au lieu d’un JPEG blanc fusionné en `multiply`.
- Garder l’arrondi uniquement pour les éléments graphiques statiques ; utiliser des transformations sous-pixel continues pour les produits.
- Ne toucher ni au classement des deals, ni aux prix, ni au nombre d’offres affichées.
