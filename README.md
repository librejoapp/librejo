# Librejo

La boîte à outils documentaire des petites structures sociales et médico-sociales : documents à jour, formulaires qui produisent un PDF, Cerfa pré-remplis, impression rapide, annuaire des partenaires, préparation de l'évaluation HAS.

**Prototype en test (3h, 25/11/2026).** À essayer avec des données fictives uniquement.

## Principes

- Aucun serveur : l'application est une page web ; les documents et les réglages restent dans le dossier de la structure (NAS, dossier partagé, OneDrive ou Google Drive synchronisé).
- Aucune donnée de personne accompagnée n'est enregistrée : elle ne va que dans le PDF ou le mail produit.
- Les fichiers d'origine ne sont jamais écrasés : les anciennes versions vont aux archives.
- Chrome ou Edge sur ordinateur. Pas prévu pour les téléphones.

## Essayer

Le site de présentation est à la racine du dépôt, l'application dans `appli/`. Le dépôt est publié avec GitHub Pages (Settings › Pages › branche `main`, dossier racine) :

- le site : https://librejoapp.github.io/librejo/
- l'application : https://librejoapp.github.io/librejo/appli/ (l'adresse à installer et à faire autoriser par l'informatique)

**La démo en ligne, sans rien installer :** https://librejoapp.github.io/librejo/appli/?demo (bouton « Essayer la démo » du site). C'est l'application elle-même, toujours à jour, ouverte sur la structure fictive « Association des Tilleuls ». Mot de passe admin : `test`.

- Au premier lancement, `telechargements/Librejo-dossier-test.zip` (le même zip que la page « Télécharger ») est décompressé dans le stockage privé du navigateur (Origin Private File System, dossier `librejo-demo`), puis l'accueil s'ouvre directement, sans choix de dossier.
- Tout marche comme en vrai (formulaires et PDF, impression, mail en .eml téléchargé, annuaire, impression rapide, réglages, mode admin) et tout reste dans ce navigateur : rien n'est envoyé, rien n'est partagé entre visiteurs.
- Un bandeau en haut le rappelle, avec « Remettre à zéro » (efface les essais, recharge la démo neuve) et « Quitter la démo ».
- La vraie installation du poste n'est pas touchée : le dossier mémorisé n'est ni lu ni remplacé, et les préférences du poste sont rangées à part (clés préfixées `librejo-demo:`). `appli/` sans `?demo` retrouve tout comme avant.
- Navigateurs : Chrome, Edge, Firefox et Safari récents (il faut le stockage privé des navigateurs, `navigator.storage.getDirectory`, et l'écriture de fichiers dedans). Après un premier passage, la démo marche aussi hors ligne.

**Avec le dossier de test, comme une vraie structure :**

1. Copier `test/Librejo-dossier-test` (structure fictive « Association des Tilleuls ») sur l'ordinateur (il est aussi sur le site, en zip, page « Télécharger »). Le zip et le dossier doivent rester identiques : la démo en ligne lit le zip.
2. Ouvrir l'application, choisir ce dossier. Mot de passe admin : `test`.

Les postes qui avaient installé l'application quand elle était à la racine (avant le déplacement dans `appli/`) : l'icône ouvre la racine, qui renvoie vers `appli/` ; l'ancien service worker est remplacé par `sw.js` à la racine, qui efface les anciens caches et se retire. Le dossier choisi et les réglages du poste sont gardés (même adresse d'origine). Pour avoir la nouvelle icône, réinstaller depuis `appli/`.

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

## Deux postes qui modifient en même temps

Librejo n'a pas de serveur : deux admins (ou un dossier OneDrive, Google Drive, Dropbox, Nextcloud) peuvent enregistrer les mêmes réglages presque en même temps.

- **Avant chaque enregistrement** de `app/parametres.js`, `app/donnees.js`, `app/annuaire.js` ou `app/logo-association.js`, Librejo relit le fichier et le compare à ce qu'il avait lu au démarrage (ou à son dernier enregistrement). S'il a changé entre-temps, rien n'est écrasé en silence : « Ce fichier a été modifié sur un autre poste depuis que vous l'avez ouvert », avec **Recharger ses modifications** (vos changements pas encore enregistrés sont perdus, après confirmation), **Enregistrer quand même** (ceux de l'autre poste sont remplacés, après confirmation, et c'est noté dans le journal) et **Voir les différences** (les sections changées de chaque côté : équipe, apparence, documents ajoutés ou retirés…). Pas de fusion automatique.
- **Copies en conflit** : quand le service de synchronisation garde deux versions (`parametres-NOMDUPOSTE.js`, `parametres (1).js`, `… (conflicted copy …).js`, `…_conflict-….js`, `Copie de ….js`), Librejo les signale à l'admin avec la marche à suivre (comparer, garder la bonne, supprimer l'autre) et montre ce qui diffère. Il ne les supprime jamais lui-même.
- **En entrant en mode admin**, Librejo prévient si un autre poste vient de modifier (« Quelqu'un a modifié les réglages il y a 2 minutes », d'après le journal des modifications) ou si les fichiers ont changé depuis l'ouverture (il propose alors de recharger).
- Le journal (`app/journal.json`) est relu avant chaque ajout ; les statistiques sont rangées dans un fichier par poste. L'index de la recherche dans le texte (`app/recherche-texte.json`) et la police de la structure (`app/polices-pdf/perso.json`) ne sont pas vérifiés : ils se refont.

## Contenu du dépôt

- `index.html`, `installer.html`, `guides.html`, `faq.html`, `telecharger.html` et leurs fichiers (`base.css`, `site.css`, `tokens.css`, `fonts.css`, `fonts/`, `images/`, `cotton.svg`, `felt.svg`) : le site de présentation ; `guides/` : les guides en PDF ; `telechargements/` : le dossier de test en zip.
- `sw.js` (à la racine) : service worker de remplacement, pour les postes qui avaient l'ancienne application à la racine (il efface ses caches et se retire ; à supprimer dans quelques mois).
- `appli/` : l'application : `appli/index.html`, `appli/boot.js`, `appli/sw.js`, manifeste, icônes, `appli/app/` (`appli/app/lib/ocr` : lecture des PDF scannés, Tesseract.js, licence Apache 2.0 ; `appli/app/polices-pdf` : polices libres OFL, dont les polices de repli pour le latin étendu, le grec, le cyrillique, l'arabe et le géorgien ; `appli/app/lib/bidi.min.js` : ordre d'affichage de l'arabe, bidi-js, licence MIT).
- `test/Librejo-dossier-test/` : dossier de structure fictive pour les essais (le même, zippé, dans `telechargements/`, sert aussi à la démo en ligne).
- `cerfa/` et `.github/workflows/cerfa.yml` : le robot qui publie chaque mois la liste des Cerfa (données ouvertes de Service-Public, DILA). L'application lit pour l'instant la liste publiée sur `julienaron/librejo`.
- `docs/BRIEF.md` : l'état du projet, les décisions et ce qui reste à faire.

## Avertissements

- Les modèles de formulaires et de procédures sont des trames **à faire relire** (juriste, médecin, direction) avant usage.
- Librejo n'est ni une ordonnance numérique ni un logiciel d'aide à la prescription.
- Licence : à choisir (logiciel libre prévu).
