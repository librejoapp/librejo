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

## Si l'accès aux dossiers est bloqué

Librejo n'a pas de serveur : il lit et écrit dans le dossier partagé de la structure, que le navigateur ouvre avec l'accord de l'utilisateur (API File System Access). Quand c'est impossible, Librejo passe en mode **« formulaires seulement »** au lieu de s'arrêter :

- navigateur sans accès aux dossiers (Firefox, Safari, téléphone) : le mode s'active tout seul ;
- autorisation refusée, accès bloqué par une stratégie de l'informatique, dossier introuvable : l'écran de démarrage propose « Remplir un formulaire sans dossier ».

Dans ce mode, les formulaires intégrés et les modèles de la bibliothèque marchent (PDF, impression, téléchargement, mail), avec les mêmes garde-fous. L'en-tête (nom et adresse de la structure) se saisit sur le poste et reste dans ce navigateur. Il manque les documents, l'annuaire, les réglages de la structure et le mode admin. Un bandeau le rappelle en permanence, avec « Choisir le dossier » quand le navigateur le permet.

**Ce qu'il faut demander au service informatique** (en attendant le kit DSI) :

- utiliser **Microsoft Edge** ou **Google Chrome** sur ordinateur ;
- autoriser l'adresse du site de Librejo ;
- autoriser l'accès aux dossiers pour ce seul site : stratégies `FileSystemReadAskForUrls` et `FileSystemWriteAskForUrls` (Edge et Chrome), avec l'adresse du site ; vérifier qu'aucune stratégie `DefaultFileSystemReadGuardSetting` ou `DefaultFileSystemWriteGuardSetting` ne bloque tout ;
- que tous les postes voient **le même dossier** (lecteur réseau avec une lettre, NAS, ou dossier OneDrive, SharePoint, Google Drive, Dropbox synchronisé sur chaque poste).

Librejo n'envoie aucune donnée : le site ne sert que le code, les PDF sont faits sur le poste. On ne cherche jamais à contourner la sécurité de la structure : on lui donne de quoi dire oui.

## Contenu du dépôt

- `index.html`, `boot.js`, `sw.js`, `app/` : l'application (`app/lib/ocr` : lecture des PDF scannés, Tesseract.js, licence Apache 2.0 ; `app/polices-pdf` : polices libres OFL, dont les polices de repli pour le latin étendu, le grec, le cyrillique, l'arabe et le géorgien ; `app/lib/bidi.min.js` : ordre d'affichage de l'arabe, bidi-js, licence MIT).
- `test/Librejo-dossier-test/` : dossier de structure fictive pour les essais.
- `cerfa/` et `.github/workflows/cerfa.yml` : le robot qui publie chaque mois la liste des Cerfa (données ouvertes de Service-Public, DILA). L'application lit pour l'instant la liste publiée sur `julienaron/librejo`.
- `docs/BRIEF.md` : l'état du projet, les décisions et ce qui reste à faire.

## Avertissements

- Les modèles de formulaires et de procédures sont des trames **à faire relire** (juriste, médecin, direction) avant usage.
- Librejo n'est ni une ordonnance numérique ni un logiciel d'aide à la prescription.
- Licence : à choisir (logiciel libre prévu).
