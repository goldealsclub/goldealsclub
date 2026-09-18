# Verrouillage anti-régression des vidéos

## Objectif
Empêcher qu'une future modification dégrade silencieusement le détourage, le cadrage ou la fluidité des trois styles vidéo.

## Mise en œuvre
- Constituer un petit corpus versionné d'images produits difficiles et de résultats de détourage approuvés.
- Ajouter un test dédié qui mesure notamment les coins opaques, le halo de bord, le rectangle résiduel et l'écart visuel avec les références.
- Centraliser des seuils stricts et faire échouer le test dès qu'une métrique régresse.
- Faire exécuter ce contrôle par les deux scripts de génération avant le rendu vidéo.
- Étendre le workflow automatique pour tester le détourage et les images clés des styles Adidas, Zara et Nike avant toute génération ou publication.
- Produire, en cas d'échec, un rapport avec image attendue, image obtenue, différence et zones problématiques.
- Séparer explicitement la mise à jour volontaire des références de l'exécution normale afin qu'une régression ne puisse pas valider ses propres images.

## Validation
- Tester un cas propre, un halo artificiel et un fond rectangulaire artificiel.
- Exécuter les contrôles des trois styles et confirmer qu'ils passent avec les références actuelles.
- Vérifier que chaque défaut injecté bloque bien la chaîne avant publication.