# Librejo

La boîte à outils documentaire des petites structures sociales et médico-sociales : documents à jour, formulaires qui produisent un PDF, Cerfa pré-remplis, impression rapide, annuaire des partenaires, préparation de l'évaluation HAS.

**Prototype en test (3h, 25/11/2026).** À essayer avec des données fictives uniquement.

## Principes

- Aucun serveur : l'application est une page web ; les documents et les réglages restent dans le dossier de la structure (NAS, dossier partagé, OneDrive ou Google Drive synchronisé).
- Aucune donnée de personne accompagnée n'est enregistrée : elle ne va que dans le PDF ou le mail produit.
- Les fichiers d'origine ne sont jamais écrasés : les anciennes versions vont aux archives.
- Chrome ou Edge sur ordinateur. Pas prévu pour les téléphones.
- Aucune case n'est bloquante : quand il manque quelque chose dans un formulaire, Librejo le liste (« Revenir compléter » ou « Continuer quand même ») ; les cases vides sont laissées en pointillés sur le PDF, à compléter à la main.

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

## Dossier sur un NAS : le lecteur réseau qui disparaît

Retour d'expérience de Docubus (BPM, Marseille, novembre 2026). Librejo s'ouvre depuis le web : il ne dépend plus d'un chemin `\\NAS\…`, ni de la lettre du lecteur dans une icône, ni d'un fichier renommé à la mise à jour. Mais si les documents sont sur un NAS, le **lecteur réseau** (Z:, X:…) doit être connecté pour que Librejo les trouve.

**Ce que fait Librejo :**

- Si le dossier ne répond pas à l'ouverture, Librejo affiche **« Le dossier ne répond pas »**, avec **Réessayer**, **Choisir un autre dossier** et le mode formulaires seulement, au lieu d'une erreur.
- Sur cet écran (et dans Administration › Vérifications du poste › **Lecteur réseau…**), Librejo prépare un **programme de réparation** pour le poste : on indique la lettre et le chemin réseau (`\\192.168.1.10\Partage`), Librejo télécharge `Librejo - lecteur Z.cmd`. Lancé d'un double-clic, il :
  1. mémorise l'identifiant du NAS dans le Gestionnaire d'identification Windows (le mot de passe est demandé par Windows et n'est jamais écrit dans le fichier) ;
  2. connecte le lecteur, avec reconnexion automatique ;
  3. se copie dans le dossier de démarrage de Windows (`shell:startup`) : à chaque ouverture de session, il attend le réseau (jusqu'à 2 minutes) et reconnecte le lecteur ; il ne s'affiche que s'il échoue, avec la réponse de Windows ;
  4. propose de couper le démarrage rapide de Windows (s'il est lancé en administrateur).
- La lettre et le chemin sont gardés sur le poste (pas dans le dossier partagé) : chaque poste peut avoir sa propre lettre.
- **Pas encore essayé sur un vrai poste Windows.** Les étapes viennent de ce qui a été diagnostiqué chez BPM ; à confirmer sur un poste.

**Les causes connues**, de la plus fréquente à la moins fréquente : lecteur créé sans « Se reconnecter lors de la connexion » ; identifiant du NAS non mémorisé (Windows échoue sans rien dire) ; lecteur créé depuis une session administrateur ; démarrage rapide (un arrêt est en fait une veille prolongée) ; réseau pas prêt à l'ouverture de session (sur Windows Pro, la stratégie « Toujours attendre le réseau lors du démarrage de l'ordinateur et de l'ouverture de session » règle ce cas) ; script du prestataire informatique qui supprime le lecteur.

**Sans NAS**, la question ne se pose pas : un dossier OneDrive, SharePoint, Google Drive ou Dropbox synchronisé sur chaque poste est la piste conseillée pour une petite structure.

## Mail préparé : la signature Outlook au-dessus du texte

Librejo prépare un brouillon (.eml) ; Outlook y ajoute la signature automatique en l'ouvrant, au-dessus du texte. Aucun en-tête connu ne l'empêche. Sur chaque poste : Outlook › Fichier › Options › Courrier › Signatures, et pour **Nouveaux messages**, choisir **(aucune)**. Des brouillons mal ouverts ont aussi été signalés avec le « nouvel Outlook » : à surveiller.

## Signaler un problème

Dans l'aide (« ? ») et dans les vérifications du poste, **Signaler un problème** prépare un mail avec la version de Librejo, le navigateur, l'adresse d'ouverture et le résultat des vérifications, jamais de données sur les personnes. Il part par défaut à l'équipe Librejo, **librejo@proton.me** ; une structure peut mettre une autre adresse dans Réglages › Mail. Rien n'est envoyé par Librejo.

## Sécurité

- **Politique de sécurité du contenu (CSP)** dans `appli/index.html` : seuls les scripts du site s'exécutent. Le code de l'application est dans `appli/app.js` (chargé par `boot.js`) ; aucun code n'est écrit dans la page ni dans des attributs `onclick`, `onload`… Les seules lectures hors du site sont la liste des Cerfa (`raw.githubusercontent.com`) et les PDF officiels (`*.service-public.fr`, `*.gouv.fr`). Toute nouvelle bibliothèque ou adresse doit y être ajoutée.
- **Fichiers du dossier** : seuls PDF, images et texte s'ouvrent dans le navigateur ; les autres (HTML, SVG, Word…) sont téléchargés, jamais exécutés. Les liens des documents et de la liste des Cerfa ne sont acceptés qu'en `http(s)`.
- **Mot de passe admin** : seule une empreinte (PBKDF2-SHA-256, sel aléatoire) est enregistrée dans `app/parametres.js`. Les anciens mots de passe en clair restent acceptés et sont convertis au premier enregistrement. Cela reste un verrou contre les erreurs, pas une protection : la vraie protection, ce sont les droits sur le dossier.
- Librejo refuse de s'afficher dans un cadre (iframe) d'un autre site.

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
