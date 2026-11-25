# Librejo

La boîte à outils documentaire des petites structures sociales et médico-sociales : documents à jour, formulaires qui produisent un PDF, Cerfa pré-remplis, impression rapide, annuaire des partenaires, préparation de l'évaluation HAS.

**Prototype en test (3h, 25/11/2026).** À essayer avec des données fictives uniquement.

## Principes

- Aucun serveur : l'application est une page web ; les documents et les réglages restent dans le dossier de la structure (NAS, dossier partagé, OneDrive ou Google Drive synchronisé).
- Aucune donnée de personne accompagnée n'est enregistrée : elle ne va que dans le PDF ou le mail produit.
- Les fichiers d'origine ne sont jamais écrasés : les anciennes versions vont aux archives.
- Chrome ou Edge sur ordinateur. Pas prévu pour les téléphones.

## Essayer

1. Publier ce dépôt avec GitHub Pages (Settings › Pages › branche `main`, dossier racine), ou ouvrir l'adresse du site.
2. Copier `test/Librejo-dossier-test` (structure fictive « Association des Tilleuls ») sur l'ordinateur.
3. Ouvrir le site, choisir ce dossier. Mot de passe admin : `test`.

## Contenu du dépôt

- `index.html`, `boot.js`, `sw.js`, `app/` : l'application (`app/lib/ocr` : lecture des PDF scannés, Tesseract.js, licence Apache 2.0 ; `app/polices-pdf` : polices libres OFL, dont les polices de repli pour le latin étendu, le grec, le cyrillique, l'arabe et le géorgien ; `app/lib/bidi.min.js` : ordre d'affichage de l'arabe, bidi-js, licence MIT).
- `test/Librejo-dossier-test/` : dossier de structure fictive pour les essais.
- `cerfa/` et `.github/workflows/cerfa.yml` : le robot qui publie chaque mois la liste des Cerfa (données ouvertes de Service-Public, DILA). L'application lit pour l'instant la liste publiée sur `julienaron/librejo`.
- `docs/BRIEF.md` : l'état du projet, les décisions et ce qui reste à faire.

## Avertissements

- Les modèles de formulaires et de procédures sont des trames **à faire relire** (juriste, médecin, direction) avant usage.
- Librejo n'est ni une ordonnance numérique ni un logiciel d'aide à la prescription.
- Licence : à choisir (logiciel libre prévu).
