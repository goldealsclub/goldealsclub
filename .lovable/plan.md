# Corriger le cadrage des vidéos

## Objectif
Faire entrer entièrement les titres, prix, marques et produits dans le format vertical 1080 × 1920 pour les trois styles.

## Modifications
- Réduire automatiquement les grands titres d’intro selon la largeur réellement disponible, notamment Adidas et Nike actuellement coupés.
- Adapter la taille des titres produit et des prix aux contenus longs au lieu de les tronquer après deux lignes.
- Fixer une zone de sécurité sur les bords et préserver des espaces stables entre produit, titre, prix et pied de page.
- Ajouter un cas de contrôle volontairement long pour tester les limites réelles du catalogue.
- Générer et inspecter les captures intro, offre et conclusion des trois styles, puis lancer les contrôles de stabilité existants.

## Détails techniques
- Calcul de tailles bornées à partir de la longueur du texte et de la largeur de chaque zone, sans changement de direction artistique.
- Maximum de trois lignes pour les titres produit, avec taille réduite progressivement plutôt qu’une coupe brutale.
- Contrôle 1080 × 1920 sur les phases d’entrée, stable et sortie.
