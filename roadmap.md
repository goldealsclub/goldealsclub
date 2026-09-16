# Roadmap

- [x] Générer les 3 vidéos (adidas, zara, nike), les publier, vérifier l'affichage public
- [x] Cron automatique par style avec date de publication réelle (workflow quotidien 06:00 UTC, matrice 3 styles)
- [x] Page admin de gestion des styles `/admin/styles` (prix, titre, typographie, couleurs)
- [x] Écart de rendu expliqué : génération sur le site = moteur Canvas ; vidéos de référence = moteur Remotion (rendu automatique quotidien, publié directement)
- [x] Bouton « Générer » du site = vrai moteur Remotion (déclenche le rendu GitHub Actions, publie via l'endpoint sécurisé, histoire et date de publication réelles)
- [x] Rendu de contrôle : les 3 styles régénérés et publiés depuis la chaîne complète, visibles sur l'accueil
