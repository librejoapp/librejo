# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Deux publics comptent **à égalité** ; quand leurs besoins se contredisent, on arbitre au cas par cas.

- **L'équipe au quotidien** : travailleurs sociaux, éducateurs, secrétariat, infirmiers, médecins. Ils produisent un document (bon d'orientation, attestation, courrier, Cerfa) ou impriment une liasse entre deux rendez-vous, souvent avec la personne accompagnée en face, sur un PC de bureau parfois ancien et partagé. Peu techniques, pressés.
- **La direction ou la personne qui installe et administre** : elle décide, installe seule (sans informaticien la plupart du temps), range les documents, configure le papier à en-tête, les modèles et l'annuaire, et doit pouvoir rassurer son DPO et son informatique.

Structures visées : addictologie (CSAPA, CAARUD), hébergement et insertion (CHRS, hébergement d'urgence, CADA, pensions de famille), protection de l'enfance (MECS, foyers, AEMO), handicap et santé mentale (SAVS, SAMSAH, GEM, foyers de vie). Petites structures, sans service informatique dédié ou avec une informatique stricte.

## Product Purpose

Librejo est la boîte à outils documentaire des petites structures sociales et médico-sociales : des documents toujours à jour, des formulaires qui produisent un PDF à l'en-tête de la structure, des Cerfa pré-remplis, l'impression rapide de liasses, l'annuaire des partenaires, la préparation de l'évaluation HAS. Il vient de Docubus, l'outil documentaire de l'association Bus Paris-Marseille (CSAPA/CAARUD, Marseille).

Il réussit quand une structure l'installe seule en quelques minutes, que l'équipe trouve et produit le bon document en moins d'une minute, et que la direction et le DPO peuvent expliquer en une phrase pourquoi aucune donnée de personne n'est conservée.

## Positioning

Aucun outil trouvé ne combine, pour une petite structure, documents à jour, formulaires métier qui produisent des PDF, Cerfa pré-remplis et annuaire, **sans serveur ni abonnement** : Librejo n'est ni un dossier usager informatisé (DUI), ni une GED d'entreprise, ni un outil de formulaires en ligne. Le dossier partagé de la structure tient lieu de serveur ; le site ne sert que le code et ne reçoit aucune donnée. Logiciel libre prévu, gratuit.

## Operating Context

- Application web installable (PWA) depuis Edge ou Chrome, sur ordinateur. Pas prévue pour les téléphones.
- Les documents et réglages vivent dans le dossier de la structure : NAS ou serveur de fichiers, dossier OneDrive/SharePoint/Teams synchronisé, Google Drive pour ordinateur, Dropbox, Nextcloud. Tous les postes doivent voir le même dossier.
- Accès au dossier par l'API File System Access, autorisation mémorisée par le navigateur ; hors ligne après installation.
- Mail : fichier .eml en brouillon pour Outlook, ou messagerie web ; jamais d'envoi direct par Librejo.
- Mode admin protégé par un mot de passe, enregistré en empreinte (verrou contre les erreurs, pas une protection réelle).
- Mode « formulaires seulement » quand l'informatique bloque l'accès aux dossiers.
- Distribution prévue : site d'installation, version hors ligne en zip en secours, kit DSI pour déployer par stratégie de groupe.

## Capabilities and Constraints

- **Aucune donnée de personne accompagnée enregistrée** : elle ne va que dans le PDF ou le mail produit ; le formulaire est vidé après usage ; ne demander que le nécessaire.
- **Aucune case n'est bloquante** : ce qui manque est listé (« Revenir compléter » ou « Continuer quand même ») et laissé en pointillés sur le PDF, à compléter à la main. Seule exception : un caractère que le PDF ne sait pas écrire.
- **Aucun serveur.** Le site ne reçoit rien. Seule lecture externe : la liste publique des Cerfa (robot mensuel, données ouvertes DILA), sur demande d'un admin.
- Les fichiers d'origine ne sont jamais écrasés : les anciennes versions vont aux archives.
- Ne jamais chercher à contourner la sécurité informatique d'une structure : l'aider à dire oui (kit DSI).
- Les PDF impriment les noms tels quels : latin étendu, vietnamien, grec, cyrillique, arabe, géorgien ; un caractère impossible bloque le document avec un message.
- Données de santé : un mail ordinaire n'est pas une messagerie sécurisée (MSSanté) ; l'appli le rappelle.
- Ni ordonnance numérique, ni logiciel d'aide à la prescription (en-tête d'ordonnance seulement, avis juridique à obtenir).
- Ouvert / non décidé : licence libre ; qui maintient l'outil et le robot Cerfa ; avis d'un DPO ; noms de domaine `librejo.fr` et `librejo.org` à réserver.

## Brand Commitments

- Nom : **Librejo** (espéranto *libro* + *-ejo*, « le lieu des livres » ; on y entend « libre »). « Librejo » dans un texte, « librejo » dans le logo. Piste de slogan : « Librejo, la bibliothèque libre du médico-social ».
- Logo validé le 23/11/2026 : une étagère bien rangée où le dernier livre s'appuie sur les autres. Mots-clés : **rassurant, ordonné, bienveillant**.
- Couleurs de la charte : bleu canard `#1F6F6B`, ambre `#E9A23B` (seule touche chaude), encre `#17302F`, crème `#FBF6EC`. Nom en Poppins Bold dans le logo. Fichiers : `Librejo-kit-logo.zip` et « Librejo - logo et règles d'usage » (Drive).
- Ton : vouvoiement, clair, honnête sur les limites (« un verrou, pas un coffre-fort »), sans jargon informatique.
- Indépendant ; construit par le Dr Julien Aron (BPM). Pistes de diffusion : Fédération Addiction.

## Evidence on Hand

- Dossier de structure fictive « Association des Tilleuls » (`test/Librejo-dossier-test`, mot de passe admin `test`) avec documents, faux Cerfa, textes d'essai multilingues.
- 50 modèles en 9 rubriques, rédigés à partir de sources publiques, **tous à faire relire** (juriste, médecin, direction).
- Films de présentation et kit logo (Drive).
- Aucun utilisateur hors BPM, aucun témoignage, aucune structure pilote encore : ne rien inventer.

## Product Principles

1. Rien n'est enregistré sur la personne : chaque écran le respecte et le dit simplement.
2. Le bon document en moins d'une minute, avec la personne en face.
3. Une structure s'installe seule, et une informatique stricte peut dire oui.
4. Le dossier de la structure est la seule source de vérité ; ne jamais perdre ni écraser en silence.
5. Honnête sur les limites : ce qui doit être relu, ce qui n'est pas protégé, ce qui n'est pas testé.

## Accessibility & Inclusion

- Viser **RGAA / WCAG 2.1 AA** (des structures publiques ou financées peuvent l'exiger).
- Utilisable au clavier, contrastes suffisants, titres et champs correctement décrits.
- Documents produits fidèles à l'identité des personnes, quelle que soit leur langue d'écriture.
