# Librejo (Docubus grand public) : point de départ

Ce fichier sert à reprendre le travail dans une nouvelle conversation. Mis à jour le 25/11/2026.

Fichiers de référence, dans le Drive « Bus 31-32 & BPM » :
- `Docubus-base-grand-public.zip` : la version BPM d'origine, point de départ du code ;
- `Librejo-prototype-3h.zip` (+ `-ocr.zip`) : le prototype le plus récent (voir « État du prototype ») ;
- `Librejo-robot-cerfa.zip` : le robot qui tient à jour la liste des Cerfa (aussi sur GitHub, voir plus bas) ;
- les films de présentation (voir « Films de présentation »).
- `Librejo-kit-logo.zip` et `Librejo - logo et règles d'usage.pdf` : l'identité visuelle.

## Nom et identité de la version grand public

« Docubus » renvoie au Bus 3132. La version grand public s'appelle **Librejo** (choisi le 23/11/2026).

### Le nom

- En espéranto, *libro* (livre) + *-ejo* (lieu) : « le lieu des livres », la librairie. On y entend aussi « libre » (logiciel libre, gratuit, partagé). Nom abstrait, sans jeu de mots gênant.
- Prononciation à fixer : « li-bré-jo » à la française (en espéranto, « li-bré-yo »).
- Le médico-social n'est pas dans le nom : c'est le slogan qui le porte. Piste : « Librejo, la bibliothèque libre du médico-social ».
- Dans un texte on écrit « Librejo », dans le logo « librejo ».
- **Vérifications :**
  - INPI : vérifié par Julien le 23/11/2026, le nom est libre.
  - Recherche web : aucun logiciel documentaire ni médico-social à ce nom trouvé.
  - `librejo.com` est pris (boutique en ligne de Mondial, éditeur de littérature en espéranto : activité différente).
  - `librejo.fr` et `librejo.org` : aucun site ne répond, probablement libres. **À réserver.**
  - GitHub : quelques petits dépôts personnels nommés « librejo », rien de comparable. Le projet a un dépôt **`julienaron/librejo`** (site julienaron.github.io/librejo), auquel Claude a accès (le compte Hsa-Lejeu y est collaborateur). Une organisation `librejo` reste possible plus tard.
  - Une recherche d'antériorité professionnelle reste recommandée avant tout dépôt de marque.
- Écartés : Hestia (déjà très utilisé, notamment dans l'hébergement), Weriz, Omnidoc (plateforme française de téléexpertise, et OmniDocs, une GED), Eurêka (EurekaSanté de Vidal, Eureka Med d'UniHA), Eurekadoc (start-up britannique, et « doc » se lit « docteur »), Codex (application de programmation d'OpenAI), MS Docs (MS = Microsoft, MS-DOS est une marque), Charlie (personnage protégé, et renvoie à Charlie Hebdo), Seshat et Quipu (jeux de mots faciles), Passerelle, Boussole et Relais (trop courants dans le secteur).
- Méthode gardée pour tout futur nom (packs, modules) : INPI, nom de domaine, GitHub, puis « test de la salle de pause » (le dire à voix haute et chercher le jeu de mots qu'un collègue trouverait).

### Le logo (validé le 23/11/2026)

- **L'idée :** une étagère bien rangée, où le dernier livre s'appuie sur les autres. L'ordre, et le soutien. Mots-clés donnés par Julien : rassurant, ordonné, bienveillant.
- Quatre livres sur une étagère ; trois en bleu canard, le dernier, penché, en ambre (seule touche chaude : ne pas colorer les autres).
- **Couleurs :** bleu canard `#1F6F6B`, ambre `#E9A23B`, encre `#17302F` (texte), crème `#FBF6EC` (fond).
- **Police du nom :** Poppins Bold (libre, licence OFL), convertie en tracés dans le logo.
- **Version « petit »** pour moins de 48 px (icône d'onglet) : trois livres plus épais.
- **Fichiers :** `Librejo-kit-logo.zip` (logo horizontal et empilé, symbole, nom seul, en couleur, noir et blanc ; icône d'application ; favicon ; manifeste PWA ; SVG et PNG) et `Librejo - logo et règles d'usage.pdf`.
- Ces couleurs sont la base de la charte de l'application et du site.
- Pistes non retenues, pour mémoire : le L et son point (abstrait), le meuble d'apothicaire, le tiroir d'où sort un document, la maison des livres.

## Ce qu'est Docubus aujourd'hui (version BPM)

Docubus est l'outil documentaire de l'association Bus Paris-Marseille (BPM), un CSAPA/CAARUD de Marseille. Il est construit par le Dr Julien Aron.

- Un seul fichier `Docubus.html`, avec un dossier `app/` (réglages, données, bibliothèques) et un dossier `Documents/` (les fichiers rangés par catégorie et sous-dossier).
- Il s'ouvre dans Chrome en `file://`, sans serveur. L'accès au dossier passe par l'API File System Access : l'utilisateur autorise le dossier, et l'autorisation est mémorisée.
  - Piège connu : ouvrir par un chemin réseau `\\serveur\...` empêche l'autorisation. Il faut une lettre de lecteur (Z:, X:…). Docubus l'affiche dans la fenêtre d'autorisation.
- Les données de la structure sont dans des fichiers JS séparés, à ne jamais écraser lors d'une mise à jour :
  - `app/donnees.js` : catégories, documents, liens, kits, formulaires épinglés, migrations, listes de l'ordonnance ;
  - `app/parametres.js` : structure, médecins et RPPS, destinataires de la délivrance, réglages, mot de passe admin ;
  - `app/annuaire.js` : les partenaires et leurs mails ;
  - `app/miniatures` et `Documents/`.
- Mode admin protégé par mot de passe : ajout et rangement des documents, catégories, emojis, liste d'impression rapide, épinglage. Il est bien visible : bandeau orange et badge « MODE ADMIN ».
  - Le mot de passe est écrit en clair dans `parametres.js` (par défaut « docubus »). C'est un verrou contre les erreurs de manipulation, pas une protection réelle : à dire dans la doc.

### Fonctions

- **Accueil** : la date, une teinte selon la saison, un message pour les fêtes et journées, une recherche, « Les plus utilisés » (épinglés par l'admin puis complétés par les usages du poste), puis Formulaires et Documents en menus repliables.
- **Documents** : PDF, Word, images et liens web ; miniatures, aperçu, impression et envoi.
- **Formulaires intégrés**, rangés en Médico-social, Médical et Social :
  - délivrance exceptionnelle (TSO) : PDF et mail .eml prêt. Les cases manquantes ne bloquent pas, une alerte les liste ;
  - ordonnance, avec les médecins et leurs RPPS en haut à gauche, des listes de médicaments à posologie pré-remplie, bilan, imagerie, vaccins, bizone ALD (voir la section réglementaire plus bas) ;
  - orientation aux urgences ;
  - courrier à un partenaire ;
  - en-tête libre ;
  - bon d'orientation CCAS ;
  - attestation de passage.
- **Impression rapide** : une liste choisie par l'admin, une quantité par document, un seul bouton Imprimer. Les PDF passent par pdf.js, les Word par docx-preview.
- **Annuaire** des partenaires.
- **Mail** : un fichier .eml avec `X-Unsent: 1`, qui s'ouvre en brouillon dans Outlook avec le PDF joint.
  - Limite connue : Outlook place sa signature automatique au-dessus du texte.

### Principes à garder

- Aucun serveur. Les données d'un usager ne vont que dans le mail ou le PDF.
- Aucune sauvegarde automatique ni historique des données d'usagers. Le formulaire est vidé après l'envoi.
- Ne demander que les données nécessaires.
- Pendant les tests : données fictives uniquement.
- À valider avec la direction ou le DPO.
- Ne jamais chercher à contourner la sécurité informatique d'une structure : on l'aide à dire oui.

## Objectif : une version grand public

Une version que n'importe quelle petite structure médico-sociale peut installer seule, sur un NAS, un disque dur, une clé, ou un dossier OneDrive, Google Drive ou Dropbox synchronisé.

**Prérequis (25/11/2026) : tous les postes doivent voir le même dossier.** Librejo n'a pas de serveur : c'est le dossier partagé qui en tient lieu (réglages, liste des documents, annuaire, documents). NAS ou serveur de fichiers ; dossier OneDrive, SharePoint ou Teams synchronisé sur chaque poste (Teams ouvert seulement dans le navigateur ne suffit pas) ; Google Drive pour ordinateur ; Dropbox ou Nextcloud. Sans dossier partagé, chaque poste a son propre Librejo et rien ne se synchronise ; sur un seul poste, tout marche. Le dossier ne contient aucune donnée de personnes accompagnées. Risque à connaître : deux admins qui modifient en même temps sur un dossier cloud (copie en conflit). Guide écrit : « Librejo – Installer sur plusieurs postes » (doc Claude, https://claude.ai/artifact/LqpgCzTRngMb8F2HxwiEoK), à reprendre dans le kit DSI.

### Chantiers identifiés (état au 25/11/2026)

1. **Séparer le contenu propre à BPM du reste** : nom, logo, adresses @bus3132.org, documents Hébergement et Cure de Marseille, délivrance exceptionnelle TSO, migrations BPM. → **Fait dans le prototype 2** pour l'interface, le nom, les couleurs et les migrations. Les packs de formulaires sont remplacés par la bibliothèque de modèles (voir plus bas).
2. **Assistant au premier lancement** : détaillé dans une section dédiée. → **Fait dans le prototype 2x** (voir « Le premier lancement »).
3. **Mail sans Outlook** : PDF téléchargé et messagerie web pré-remplie. → **Fait** (réglage « Messagerie » : Outlook ou web).
4. **Edge en plus de Chrome**, puisqu'il est installé sur tous les Windows. Firefox et Safari donnent un mode consultation seule. → À tester.
5. **Distribution et installation** : PWA en voie principale, zip hors ligne en secours, mode dégradé et kit DSI. → **PWA prototypée** (voir « État du prototype ») ; zip, mode dégradé et kit DSI à faire.
6. **Documentation et support** : un mode d'emploi générique, et une décision sur qui maintient (licence libre, diffusion par un réseau comme la Fédération Addiction ?). → Un `LISEZ-MOI.md` accompagne le prototype ; le reste est à faire.
7. **Prévenir dans la doc** : si deux admins modifient les réglages en même temps, le dernier enregistrement l'emporte. → Écrit dans le LISEZ-MOI.
8. **Ordonnance** : la remplacer par un « En-tête d'ordonnance ». → **Fait** : c'est un modèle de la bibliothèque, et l'ancien formulaire est masqué par défaut.

### Ordre de travail (mis à jour le 25/11/2026)

1. **Tester le prototype sur un vrai poste de BPM** (Chrome et Edge, lecteur réseau, NAS, OneDrive) :
   - l'autorisation du dossier tient-elle d'un jour à l'autre ? Chrome propose-t-il « Autoriser à chaque visite » ?
   - en mode admin, l'enregistrement fonctionne-t-il avec un vrai clic : ajout de document, logo, réglages ?
   - l'envoi par mail avec Outlook va-t-il jusqu'au bout ?
   - l'assistant de démarrage sur un dossier vide (« Première installation ») ;
   - l'import d'un vrai export de contacts Outlook ou Gmail (contacts professionnels) ;
   - le pré-remplissage du vrai Cerfa 16029\*01 (domiciliation), et le bouton « Vérifier les Cerfa » depuis le réseau de la structure.
2. **Faire relire les modèles** par un juriste, un médecin et la direction (voir la liste plus bas).
3. **Note pour le DPO** (données, ce qui sort du poste, ce qui n'est jamais enregistré) et **kit DSI**.
4. Trouver une ou deux **structures pilotes** d'un autre secteur (CHRS, MECS…).
5. Réserver les noms (domaines, organisation GitHub), mise en ligne sur GitHub Pages.
6. En parallèle : DPO de BPM, Fédération Addiction (diffusion, maintenance, avis juridique sur l'en-tête d'ordonnance), choix d'une licence libre.
7. Site d'accueil, kit DSI, mode d'emploi.

## État du prototype (25/11/2026)

### Prototype 1 : faisabilité de l'application web

Mini-prototype : installer l'application, choisir un dossier, y écrire un réglage, le relire au redémarrage. Testé par Julien dans Chrome 157, application installée :
- dossier choisi à la main, puis **autorisation conservée** à la réouverture immédiate ;
- après 10 minutes, autorisation **redemandée** (un clic suffit).

Reste à vérifier : la tenue de l'autorisation sur plusieurs jours, et l'option « Autoriser à chaque visite » de Chrome.

### Prototype 2 : Librejo complet, en application web

Le code de Docubus, nettoyé de tout ce qui est propre à BPM, tourne en application web installable.
- **Démarrage** : `boot.js` demande le dossier de la structure (mémorisé dans le navigateur), vérifie qu'il contient bien `app/` et `Documents/`, puis lit les fichiers de réglages. En mode web, ces fichiers sont **lus comme des données (JSON), jamais exécutés**. En `file://`, l'ancien mode marche toujours.
- **Hors ligne** : un service worker garde le code en cache, mais **jamais** les fichiers de la structure (réglages, données, annuaire, logo).
- **Dossier de test fictif** fourni dans le zip : « Association des Tilleuls », mot de passe admin « test ».

### Nouveautés du prototype 2

**Apparence (Réglages › Apparence).** L'admin choisit la couleur du menu et la couleur d'accent (nuancier ou couleur libre), ajoute le logo de la structure et choisit ce qui s'affiche en haut du menu (logo Librejo ou celui de la structure, nom ou pas). Les contrastes sont corrigés automatiquement pour rester lisibles (WCAG). Les couleurs sont reprises dans les PDF.

**Papier à en-tête des PDF (Réglages › Papier à en-tête).** En-tête et pied de page par défaut, position du logo et taille (petit, moyen, grand), alignement de l'en-tête et du pied, filet de séparation, police (moderne ou classique), signataire et ville. **Aperçu en direct** d'une page, avec un bouton pour l'ouvrir en grand. Le déplacement des éléments à la souris a été jugé trop complexe : on choisit dans des listes.

**Bibliothèque de modèles (Formulaires › Ajouter depuis la bibliothèque).** L'admin choisit des modèles prêts à l'emploi, rangés par rubriques ; il les modifie ensuite comme ses propres formulaires. Deux sortes de modèles :
- **les formulaires** : un texte à trous, rempli au moment de l'usage, qui produit un PDF ;
- **les liens** vers un formulaire officiel (Cerfa) : on renvoie vers la version à jour plutôt que de recopier un document qui change.

Le champ `{Association}` d'un modèle est rempli tout seul avec le nom de la structure.

**Éditeur de formulaire avec aperçu.** En modifiant un formulaire, on voit à côté à quoi il ressemble : soit la page de saisie, soit le PDF final.

**Formulaires intégrés masquables.** L'admin peut masquer un formulaire intégré dont il n'a pas besoin. L'ancien formulaire d'ordonnance est masqué par défaut.

**Miniatures des liens.** Les liens web ont une vignette (générée, ou une image choisie par l'admin : collée ou depuis un fichier).

**Mention « Confidentiel ».** Les formulaires médicaux portent « Confidentiel – données de santé » ; les autres formulaires confidentiels portent seulement « Confidentiel ».

**Fenêtre « Document prêt » unifiée.** Une seule fenêtre, partout, à la place des deux qui s'enchaînaient :
- le fichier avec son lien « Aperçu » ;
- trois grosses tuiles : **Imprimer** (mise en avant), **Envoyer par mail** (avec le destinataire), **Télécharger** ;
- l'explication n'apparaît qu'après le clic (par exemple « Ouvrez le fichier .eml… ») et la tuile utilisée affiche « ✓ fait » ;
- en bas : « Revenir sans effacer » ou « Terminé : effacer » ;
- **quand il y a plusieurs PDF**, un choix « Groupés en un seul PDF » ou « Séparés » s'applique aux trois actions (impression, mail, téléchargement). Par défaut : groupés.

### Nouveautés des prototypes 2o à 2x (24 et 25/11/2026)

**Interface plus chaleureuse (prototype 2o).** Salutation selon l'heure, date et nom de la structure ; menu clair par défaut (foncé au choix) ; une couleur par catégorie ; vignettes pour l'équipe, liste pour l'admin ; illustrations dans les écrans vides ; animations discrètes (respectent « réduire les animations »). Écarté par Julien : la phrase qui change selon la saison.

**Corrections issues de la critique Impeccable (prototype 2p, score de départ 27/40).** Boutons « Imprimer » et « Envoyer » écrits en toutes lettres sur les vignettes ; section « Remplir un formulaire » sur l'accueil ; icônes dessinées à la place des emojis ; raccourci `/` ou Ctrl+K pour chercher. Les remarques sur les téléphones ont été ignorées : **Librejo n'est pas destiné aux téléphones** (décision de Julien). L'onglet « Accueil » est gardé.

**Mode admin plus clair (prototype 2n-2p).** Barre « Vous modifiez » avec « Ajouter un document » en bouton principal, « Ajouter un lien », « Nouvelle catégorie » et un menu « Outils ». Fenêtre d'ajout de documents simplifiée : une seule zone de dépôt, une carte par fichier (titre, rangement, mots-clés facultatifs), « Tout ranger dans ».

**Miniature en direct (prototype 2r).** Pendant qu'on remplit un formulaire, la première page du document se dessine à droite et se met à jour pendant la saisie (fabriquée en mémoire, rien n'est enregistré). Un clic l'ouvre en grand ; on peut la masquer. Pas sur le certificat médical initial (photos) ni sur la délivrance exceptionnelle.

**Annuaire refait (prototype 2s).** Fiches de structures avec leurs **contacts** (nom, fonction, mail, téléphone) et des notes.
- **Import** des exports CSV d'Outlook (classique, nouveau, web), Gmail, Thunderbird, des vCard et des fichiers Excel ; colonnes reconnues en français et en anglais ; contacts d'une même structure regroupés. Avant l'import, chaque fiche est marquée « Nouvelle », « Complète une fiche existante », « Déjà présente » ou « Adresse personnelle ? » (Gmail, Orange… sans structure : décochée). Rappel : jamais d'usagers ni de contacts personnels.
- **Doublons** : alerte pendant la saisie, outil « Doublons (n) » (même mail, même nom, même téléphone, nom très proche) avec « Fusionner » (rien n'est perdu) ou « Ce ne sont pas des doublons ».
- **Export** pour toute l'équipe : tableur (Excel), carnet d'adresses (Outlook, Gmail), vCard.
- Recherche à plusieurs mots, y compris les contacts et les numéros de téléphone. Import, modification et fusion restent réservés à l'admin.
- Pas de branchement direct sur Outlook (il faudrait une autorisation Microsoft et un serveur) : on passe par l'export de la messagerie.

**Cerfa pré-remplis (prototypes 2t à 2v).** Constat de Julien : un simple lien vers un Cerfa ne fait pas mieux que Google. Librejo doit apporter la bonne version, le pré-remplissage, le mode d'emploi et l'impression groupée.
- L'admin dépose le Cerfa officiel (PDF à cases) dans Documents, puis « Préparer le pré-remplissage » : Librejo devine les cases de la structure (nom, adresse, SIRET, agrément, responsable, « fait à », date) à partir des infobulles ou du texte imprimé à côté, et laisse vides celles de la personne. Chaque case se voit surlignée sur la page ; bouton « Essayer ».
- Infos de la structure communes à tous les Cerfa (SIRET, FINESS, agrément, responsable…), reprises d'abord de l'en-tête.
- Côté équipe : le Cerfa apparaît dans Formulaires, avec les pièces à joindre et où l'envoyer (fiche de l'annuaire) ; il s'ouvre pré-rempli, on complète la partie de la personne dans le PDF, on imprime. Rien n'est enregistré.
- **Vérifier les Cerfa** (bouton admin, rappel à 3 mois) : Librejo lit une liste publique, ne fait que lire, et affiche « À jour », « Nouvelle version » ou « Absent de la liste ». Une nouvelle version n'est **jamais installée sans l'admin** : Librejo la télécharge si le site le permet (sinon l'admin la dépose), reprend les réglages des cases par leur libellé, montre les deux versions côte à côte, puis l'admin valide ; l'ancienne est archivée.
- **Le robot** : dépôt `julienaron/librejo`, dossier `cerfa/` et workflow `.github/workflows/cerfa.yml`. Le 1er de chaque mois, il lit les données ouvertes de Service-Public (DILA, licence ouverte 2.0 : archive zip de fiches XML au format 3.5, une fiche `R….xml` par ressource, balise `<NumeroCerfa>`) et publie `cerfa/cerfa.json`. Premier lancement réel le 25/11/2026 : **591 Cerfa**. Garde-fou : moins de 50 Cerfa lus, rien n'est publié. Seuls 64 donnent un lien direct vers le PDF (pas la domiciliation) : pour les autres, l'admin télécharge depuis la page officielle.
- Adresse lue par Librejo : `https://raw.githubusercontent.com/julienaron/librejo/main/cerfa/cerfa.json` (GitHub autorise la lecture depuis un navigateur).
- Testé sur un **faux Cerfa** : le pré-remplissage du vrai 16029\*01 reste à essayer (les vrais Cerfa sont parfois protégés).

**Papier à en-tête enrichi (prototypes 2w-2x).** Demande de Julien : que l'équipe s'approprie le format général des documents.
- **Polices** : Helvetica, Times, et cinq polices libres (licence OFL, réduites aux caractères latins) : Atkinson Hyperlegible (très lisible, malvoyance), Lato, Nunito, Source Serif, Libre Baskerville. Ou **la police de la structure** (fichiers .ttf déposés par l'admin, enregistrés dans `app/polices-pdf/perso.json`). Quand la police choisie ne sait pas écrire un texte, il passe sur une police de repli : latin étendu, vietnamien, grec, cyrillique (`repli.js`, chargée au démarrage) ; géorgien (`georgien.js`) et arabe (`arabe.js`, lettres liées, droite à gauche, algorithme bidirectionnel Unicode avec `app/lib/bidi.min.js`), chargés seulement quand un texte en a besoin. Le Cerfa (formulaire officiel, WinAnsi) reste limité au latin d'Europe de l'Ouest.
- **Couleurs** des titres et des traits (par défaut, celles de l'application).
- **Taille du texte des documents** (petite, normale, grande) et taille de l'en-tête, de la marge et du bas de page.
- **Marge à gauche** (aucune, étroite, large) : services, numéros utiles, membres du bureau… sur la première page ou sur toutes, trait vertical et fond coloré au choix ; le texte du document se décale tout seul.
- **Mise en forme des lignes** (sous le logo, marge, bas de page) : `# Titre` en couleur, `**gras**`, `_italique_`, `---` pour un trait, ligne vide pour aérer.
- Les modèles Word (.docx) gardent leur propre mise en page.
- Correction au passage : l'enregistrement des réglages effaçait les infos ajoutées pour les Cerfa.

**Assistant de démarrage et liste de démarrage (prototype 2x).** Voir « Le premier lancement ».

**Favoris et validation (prototype 3h, 25/11/2026).**
- **⭐ Favoris personnels** : une étoile sur chaque document et formulaire ; « Mes favoris » en haut de l'accueil. Gardés sur le poste (navigateur), pour toute l'équipe, sans rien écrire dans le dossier.
- **Circuit de validation** : statut d'un document « Brouillon », « À valider » ou « Publié » (choisi à l'ajout, puis dans Gérer). L'équipe ne voit que les documents publiés (liste, recherche, favoris, kits, impression rapide). « Valider et publier » demande le nom de la personne qui valide ; chaque étape est notée dans le journal ; carte « à valider » dans le tableau de bord. Limite : une nouvelle version d'un document publié est publiée tout de suite (pas de brouillon de version).
- Idées discutées, non faites : plan d'actions, auto-évaluation HAS notée, fiches pratiques écrites dans Librejo, enquête de satisfaction papier, QR codes. Le kit du nouvel arrivant se fait avec les Kits existants.
- À ne pas copier des logiciels qualité (Ageval, Qualineo, BlueKanGo) : registres nominatifs des plaintes et événements indésirables, DUERP, audits ; ni des wikis : écriture à plusieurs, comptes avec droits.

**Nommage choisi par l'admin (prototype 3f, 25/11/2026).** Réglages › Documents › « Nom des fichiers et des dossiers » : une règle de nom de fichier avec des éléments à placer (`{Titre}` `{titre}` `{TITRE}` `{version}` `{AAAA}` `{AA}` `{MM}` `{JJ}` `{categorie}` `{structure}`, le reste écrit tel quel), 5 modèles prêts (dont `{AAAA}_{MM}_v{version}_{titre}` → `2026_11_v1_protocole_douleur.pdf`), le séparateur entre les mots du titre (tiret, tiret bas, espace), et la règle des nouveaux dossiers de catégorie (`01 Accueil`, `01_Accueil`, `Accueil`, `01 - ACCUEIL`). Aperçu en direct. S'applique à l'ajout, aux nouvelles versions, aux corrections et aux nouvelles catégories ; « Actualiser depuis le dossier » relit les noms faits avec la règle (titre, version, date). Prototype 3g : la règle se choisit aussi dans l'assistant de démarrage (étape « Catégories et noms », avec aperçu) ; et si l'admin change de règle plus tard, « Renommer les fichiers déjà rangés » montre la liste ancien nom → nouveau nom, puis renomme sur place (les archives gardent leur nom ; noté dans le journal).

**Module d'import (maquette cliquable, 25/11/2026)** : https://claude.ai/artifact/Fdk9xWQqdxr1rySCU6gz2J. Décisions de Julien : travail en plusieurs fois (séances par groupes de sous-dossiers, « Enregistrer et reprendre plus tard » à chaque étape, reprise possible par un autre admin) ; tri par problème par défaut (doublons exacts, plusieurs versions, probablement inutiles, à garder, pas lisibles), avec l'option « dossier par dossier » ; anciennes versions et doublons laissés de côté (pas importés, restent dans l'ancien dossier) ; doublons ouvrables côte à côte ; dossiers personnels proposés comme les autres (avec un rappel : pas de documents d'usagers) ; étape « Ranger » = chaque ancien sous-dossier va dans une catégorie, en une fois, avec des exceptions fichier par fichier ; noms selon la règle de nommage. Rien n'est codé dans l'application.

**Évaluation HAS et relecture (prototype 3e, 25/11/2026).**
- **🏅 Préparer l'évaluation HAS** (Outils) : 35 critères du référentiel HAS d'évaluation des ESSMS (2022, manuel mis à jour en juillet 2025) où une preuve écrite compte, dont les 18 critères impératifs (intitulé exact) ; les autres sont résumés, avec un lien vers le site de la HAS. Pour chaque critère : les preuves habituelles, les documents ou formulaires reliés, leur état (✅ à jour, ⏰ à relire, ❌ aucune preuve), « Relier un document » et « Créer depuis le modèle » quand la bibliothèque en a un. Compteurs « critères prouvés » et « impératifs prouvés », filtres, export du dossier de preuves (tableur) et des documents de preuve rangés par critère (zip). Les critères reliés sont gardés dans le document (`has`). Une trame vide ne compte pas comme preuve : c'est le document rempli qu'il faut relier.
- **⏰ Date de relecture** : par document (pas de rappel, 6 mois, 1, 2, 3 ou 5 ans), choisie à l'ajout ou dans Gérer, avec la prochaine date et un bouton « Relu aujourd'hui ». Elle repart à chaque nouvelle version. Badge « À relire » dans la liste (admin), carte dans le tableau de bord.
- **4 nouveaux modèles** (rubrique Qualité, à faire relire) : formulaire de réclamation pour la personne accompagnée ; trame de procédure plaintes et réclamations (3.12) ; trame de plan de prévention de la maltraitance et de la violence (3.11) ; trame de plan de gestion de crise et de continuité (3.14). 50 modèles au total.
- « Lu et compris » pour les procédures : écarté, l'envoi par mail suffit pour prouver la diffusion (décision de Julien).
- Positionnement face à Paperless-ngx (25/11) : Paperless archive le papier entrant sur un serveur (Docker, PostgreSQL, Redis) avec OCR, classement automatique et vrais comptes ; Librejo est la boîte à outils documentaire de l'équipe, sans serveur. Ne pas courir après ses fonctions.

**Outils de l'admin (prototype 3d, 25/11/2026).** Tous dans Documents › Outils, en mode admin.
- **📊 Tableau de bord** : « À surveiller » (jours depuis la dernière sauvegarde, documents très utilisés mais vieux de plus d'un an, doublons possibles par titre ou par taille, documents sans description ni mots-clés, Cerfa non vérifiés depuis 3 mois, documents pas encore dans la recherche dans le texte) ; « Statistiques d'utilisation » sur 1, 3 ou 12 mois ou depuis le début : nombre d'utilisations, d'impressions, de documents produits par les formulaires, courbe par mois, documents les plus ouverts, les plus imprimés (impression rapide comprise, en exemplaires), les plus envoyés, formulaires les plus remplis, utilisation par catégorie, documents et formulaires jamais utilisés. Export tableur.
- **Comment on compte** : chaque poste compte dans son navigateur (identifiant du document et nombre, par mois, 14 mois gardés) et dépose ses chiffres dans `app/statistiques/<poste>.json` dès qu'il a le droit d'écrire dans le dossier (après un passage en mode admin sur ce poste ; aucune demande d'autorisation pour ça). Les postes de l'équipe qui n'ont que la lecture ne sont donc pas comptés : limite à régler. Les recherches tapées ne sont jamais enregistrées (elles pourraient contenir un nom).
- **📜 Journal des modifications** (`app/journal.json`, 5 000 actions au plus) : ajout, nouvelle version, correction, marquage, archivage, restauration, infos modifiées, formulaires, catégories, réglages, actualisation, sauvegarde. Classé par jour, recherche, filtre par action et par personne, export tableur. Le prénom de l'admin est demandé (facultatif) à l'entrée en mode admin et gardé sur le poste.
- **🗄️ Archives** : tout ce qui est dans les dossiers `_Archives`, trié par date, par nom ou par catégorie, avec recherche. Pour chaque fichier : ouvrir, comparer avec la version actuelle, restaurer (une ancienne version redevient la version en place sous un nouveau numéro, l'actuelle est archivée ; un document archivé revient avec sa description et ses mots-clés). Les infos des documents archivés sont désormais gardées (`DATA.archives`).
- **🔎 Recherche dans le texte** : l'admin prépare l'index une fois (`app/recherche-texte.json`), mis à jour tout seul à chaque ajout ou nouvelle version. L'équipe coche « Chercher aussi dans le texte des documents » sous la barre de recherche ; un extrait du passage trouvé s'affiche.
- **💾 Sauvegarde** : zip « réglages seulement » ou « tout, documents compris » (taille affichée), à ranger hors du dossier Librejo. Restauration depuis le même écran : l'état actuel est d'abord copié dans `app/_sauvegardes/`, puis Librejo se recharge.

**Modifier un document et le marquer (prototype 3b, 25/11/2026).**
- **Modifier (admin)** : menu « … » d'un document, ou Gérer › « Modifier le contenu ». Librejo télécharge une copie de travail ; on la modifie dans Word, LibreOffice ou le lecteur PDF, on la redépose, on voit les différences côte à côte, puis « Enregistrer comme version N+1 » ou « Petite correction » (même numéro). Dans les deux cas l'ancien fichier part dans les archives. Le navigateur ne peut pas ouvrir directement le fichier du NAS dans Word : d'où la copie de travail.
- **Modifier avant d'ajouter** : dans la fenêtre d'ajout, chaque fichier a « Modifier avant d'ajouter » (copie téléchargée, puis on choisit le fichier modifié).
- **Marquer le document** (PDF et Word, à l'ajout) : nom du fichier, version et date en bas à droite ; numéros de page « Page 1 / 3 » ; logo de la structure en haut à gauche ; pied de page de la structure. Librejo lit d'abord le document et pré-coche seulement ce qui manque (pas de numéros si le document en a, pas de logo ni de pied s'il a déjà un en-tête, un pied ou le nom de la structure ; rien sur un PDF à cases type Cerfa). Le choix « nom et version » est mémorisé sur le poste. Word : pied de page réel avec champs PAGE et NUMPAGES, logo dans l'en-tête seulement s'il n'y en a pas. PDF : ajout par-dessus la page (le logo peut chevaucher le contenu si la marge du haut est petite : décoché par défaut dans ce cas).
- **Aux versions suivantes**, le nom, la version et la date sont mis à jour tout seuls (PDF : l'ancien marquage est recouvert ; Word : le paragraphe Librejo est remplacé).
- Limites : non testé sur de vrais documents de structure.

**Comparateur visuel et OCR (prototype 3c, 25/11/2026).**
- Comparer deux documents : les pages s'affichent en miniatures côte à côte (vraies pages pour les PDF, feuilles de texte pour Word, LibreOffice et texte). Les différences sont surlignées sur la page (orange : modifié, vert : ajouté, rouge : retiré) et numérotées ; un trait pointillé montre où une ligne manque de l'autre côté. Pastilles de comptage en haut, résumé numéroté en bas (avant → après, mots changés en couleur) ; un clic sur une différence fait défiler les deux côtés jusqu'à elle. Défilement lié, trois tailles de pages, texte ligne à ligne en option. Même vue quand l'admin modifie un document.
- OCR (PDF scannés seulement) : Tesseract.js 5 (licence Apache 2.0), modèle français « best_int », dans `app/lib/ocr/` (environ 4,8 Mo, chargés seulement au premier usage). Tout se fait sur le poste. Proposé dans le comparateur (« Lire le texte des scans ») et à l'ajout d'un PDF scanné (propose une description pour la recherche). 20 pages au plus. Ne marche pas en `file://` (le navigateur interdit les « workers »). Testé sur un scan fictif : texte bien lu.
- Marquer un document déjà dans Librejo : menu « … » ou Gérer › « Marquer le document » (même version, l'ancien fichier archivé).
- Le zip est livré en deux morceaux (limite du dépôt sur le Drive) : `Librejo-prototype-3c.zip` et `Librejo-prototype-3c-ocr.zip`, à décompresser au même endroit.

**Comparer deux documents (prototype 3a, 25/11/2026).** Demande de Julien : un admin trouve deux versions d'un même document sur le NAS. Documents › Outils › « Comparer deux documents » : on glisse les deux fichiers (ou on prend un document déjà dans Librejo), le texte s'affiche côte à côte, les lignes différentes sont encadrées, les mots retirés barrés en rouge et les mots ajoutés surlignés en vert ; les longs passages identiques sont repliés. PDF (avec n° de page), Word, LibreOffice et texte ; fichiers identiques à l'octet près signalés. Puis « Garder A », « Garder B », « Garder les deux » ou « Aucun » : un fichier gardé s'ajoute avec le formulaire habituel (titre, catégorie, mots-clés) ; si l'autre est déjà dans Librejo, le fichier gardé en devient la nouvelle version ; un document écarté qui était dans Librejo est archivé, jamais supprimé. Limites : PDF scannés (pas de texte) et images non comparables ; la mise en forme n'est pas comparée.

**Ordinateurs non reliés au NAS (réflexion du 25/11, rien de codé).** Pistes : dossier cloud synchronisé sur ce poste (OneDrive, Google Drive) ; copie datée en lecture seule, refaite par l'admin ; mode « formulaires seulement » (les formulaires intégrés marchent sans dossier, mais les documents et réglages de la structure manquent) ; accès au NAS à distance (VPN) si la DSI le permet.

**Équipe (prototype 2z, 25/11/2026).** Demande de Julien : en plus des médecins, une liste d'autres professionnels gérée par l'admin (Réglages › Équipe : nom, fonction, téléphone, mail, n° professionnel). Dans l'éditeur, un type de champ « Professionnel(s) de l'équipe » (une ou plusieurs personnes) : au remplissage, on choisit les personnes d'un clic et ce qui apparaît sur le document (fonction, téléphone, mail, n°), l'admin réglant ce qui est coché par défaut. Dans l'attestation de suivi, l'orientation aux urgences et le courrier à un partenaire, « Choisir dans l'équipe » remplit le nom et la fonction du signataire. Coordonnées professionnelles seulement. Les Réglages ont maintenant cinq sections (Documents, Apparence, Mail, Équipe, Accès) ; les médecins sont passés dans Équipe.

**Interface (prototype 2y).** Décision de Julien : emojis partout (rubriques, catégories, sections, liens, messages de confidentialité), icônes dessinées seulement sur les boutons d'action. Un seul bouton orange par écran (« Remplir » au style d'« Imprimer » et « Envoyer », « Ajouter » de la bibliothèque en secondaire). Administration : onglets « Formulaires et modèles », « Mots de la recherche », « Réglages » (« Listes de l'ordonnance » seulement si l'ancienne ordonnance est activée). Miniature plus grande sur 1366 px, bouton collant qui ne masque plus les champs. Contenu replié de l'accueil et de la page Formulaires : laissé tel quel (Julien pas convaincu). Critique Impeccable du 25/11 : 29/40.

**Inventaire (prototype 2x).** Documents › Outils › « Exporter l'inventaire » : tous les documents, Cerfa, liens, formulaires créés et intégrés (masqués compris), avec catégorie, version, dates (du document, d'ajout, de modification), format, taille, emplacement, versions archivées, épinglage, n° et date de vérification des Cerfa, modèle d'origine, mots-clés. En tableur (Excel) ou en PDF à imprimer. Utile pour un audit, une évaluation ou une relecture par la direction.

### La bibliothèque de modèles : 50 modèles en 9 rubriques

Les textes des formulaires ont été rédigés par Claude à partir de sources publiques. **Tous sont à faire relire** (juriste, médecin, direction) avant diffusion. Les articles de loi marqués « de mémoire » n'ont pas été vérifiés en ligne.

- **Droits des usagers (loi 2002-2)** : DIPC ; personne de confiance (désignation, révocation, désignation avec témoins, attestation d'information) ; accord pour partager des informations avec un partenaire.
- **Qualité** : fiche d'incident ou d'événement indésirable (interne, trace écrite datée) ; formulaire de réclamation ; trames de procédure plaintes et réclamations, de plan de prévention de la maltraitance et de plan de crise ; trames de livret d'accueil et de règlement de fonctionnement.
- **Social** : liens Cerfa 16029\*01 et 16030\*01 (domiciliation) ; attestation de suivi régulier (preuve de présence en France, utile pour l'AME : rédigée sans aucune information de santé) ; courrier de signalement d'un refus de soins C2S ou AME (à l'Ordre ou à la CPAM, copie possible au Défenseur des droits, art. L. 1110-3 du CSP, d'après France Assos Santé) ; courrier de soutien (SIAO, CAF, bailleur, DALO, mairie) ; bon interne (colis, vestiaire, douche, laverie, bagagerie : initiales seulement) ; reçu de dépôt de documents (liste, originaux ou copies, restitution signée). L'attestation pour le SPIP ou le juge existe déjà dans l'attestation de suivi intégrée (cadre obligation de soins, injonction thérapeutique, rendez-vous honorés).
- **Liaison et démarches** : DLU (document et fiche de liaison d'urgence, lien HAS) ; titre de séjour pour soins (lien OFII, certificat médical non descriptif d'après le guide du Comede) ; lien Cerfa 13960\*02 (permis de visite en prison) et courrier de demande de permis de visite pour un professionnel.
- **Handicap et protection des majeurs** : liens Cerfa 15692\*01 et 15695\*01 (MDPH), 15891\*03 et 14919 (mesures de protection) ; courrier à la MDPH ; projet personnalisé (avenant au contrat de séjour ou au DIPC) ; signalement au procureur pour un majeur vulnérable (art. 430 du code civil).
- **Enfance et protection de l'enfance** : information préoccupante à la CRIP ; signalement au procureur pour un mineur en danger grave (copie CRIP) ; lien vers les modèles du Conseil de l'Ordre des médecins ; rapport au juge des enfants ; déclaration de fugue ; autorisation parentale pour un acte non usuel (art. 373-4 et 375-7 du code civil, de mémoire) ; lien Cerfa 15646\*01 (sortie du territoire) ; entretien des 17 ans (art. L. 222-5-1 du CASF, de mémoire) ; lien GEVA-Sco.
- **Personnes âgées** : liens Cerfa 14732\*03 (admission en EHPAD), 16301\*01 (APA à domicile) et directives anticipées (modèles officiels ; un nouveau modèle est prévu par la loi du 26 mai 2026, d'où un lien plutôt qu'une copie) ; annexe au contrat de séjour sur la liberté d'aller et venir (art. L. 311-4-1 du CASF, de mémoire).
- **Asile et hébergement** : courrier à l'OFII pour rétablir les conditions matérielles d'accueil (art. L. 551-16 du CESEDA) ; attestation d'hébergement par la structure.
- **Addictologie** : en-tête d'ordonnance.

Écartés volontairement : l'autorisation de droit à l'image (décision de Julien) ; les dossiers d'admission LHSS, LAM et ACT (propres à chaque territoire). Domaines encore peu couverts : précarité et soins (LHSS, LAM, ACT), insertion et justice, coordination (DAC).

### Points ouverts

- Persistance de l'autorisation du dossier sur plusieurs jours, et type de dossier testé.
- Écritures en mode admin avec un vrai clic (ajout de document, logo, réglages) : pas encore testées en conditions réelles.
- Impression et mail en mode « plusieurs PDF » : seul le téléchargement a été testé.
- Relecture juridique et médicale de tous les modèles.
- Vrais exports de contacts (Outlook, Gmail) et vrai Cerfa 16029\*01 : pas encore essayés.
- Accès à GitHub depuis le réseau des structures (bouton « Vérifier les Cerfa ») : à vérifier.
- Qui maintient le robot et la liste des Cerfa si le projet grandit ; licence ; prix (aucun abonnement prévu à ce jour) ; avis d'un DPO.

## Distribution et installation

But : obtenir l'outil sans rien dézipper ni lancer de script, avec des mises à jour qui se font seules, sans jamais contourner la sécurité informatique de la structure.

### Une seule page d'accueil sur le site

La page détecte le navigateur. En grand : **Installer** (voie 1). En petit, en dessous : « Pas d'accès Internet ? Téléchargez la version hors ligne » (voie 2). Avec un lien vers le kit DSI.

### Voie 1, principale : l'application web installable (PWA)

Le code est publié sur un site statique (par exemple GitHub Pages, comme le jeu HSA). Les documents et les réglages restent dans le dossier de la structure.

1. Aller sur le site avec Edge ou Chrome et cliquer sur **Installer**.
2. L'icône apparaît sur le bureau et dans le menu Démarrer. L'outil s'ouvre dans sa propre fenêtre.
3. L'assistant démarre et demande de choisir le dossier (NAS, OneDrive, disque…).

Avantages :
- rien à télécharger ni à dézipper, pas d'alerte Windows ;
- **mises à jour automatiques** (avec le zip, il faut remplacer le fichier à la main sur chaque poste de chaque structure) ;
- autorisation du dossier mieux mémorisée pour une application installée ;
- plus de problème de chemin `\\serveur` : on choisit le dossier dans une fenêtre ;
- le site ne sert que le code et ne reçoit **aucune donnée**. Les PDF sont produits sur le poste.
- Si l'installation est interdite, **l'outil marche aussi dans un simple onglet**, avec un favori sur le bureau.

Limites et travaux :
- Internet est nécessaire à l'installation. Ensuite, l'outil fonctionne hors ligne (service worker, fait dans le prototype 2).
- Certains DPO ou services informatiques tiqueront sur « un code chargé depuis Internet ». Il faut expliquer : site statique, aucun serveur de données, code public et vérifiable.
- Les réglages sont lus dans le dossier choisi comme des données (fait dans le prototype 2, voir plus haut).

### Voie 2, secours : la version hors ligne en zip, sans script

Pour les structures sans Internet ou avec une informatique très fermée.

1. Télécharger le zip et l'**extraire**. Beaucoup de gens ouvrent le zip sans l'extraire : l'outil doit le détecter (chemin temporaire) et l'expliquer.
2. Double-cliquer sur le fichier HTML. C'est tout.
3. La création du raccourci se fait ensuite depuis l'outil lui-même.

Pas de `.cmd`, `.bat` ou `.vbs` : un script téléchargé déclenche l'alerte « Windows a protégé votre ordinateur », anxiogène. Un vrai installateur `.exe` signé éviterait l'alerte, mais un certificat de signature de code est payant chaque année et demande une structure juridique : écarté pour l'instant. Inconvénient de cette voie : mises à jour manuelles.

### Mode dégradé

Si le service informatique a bloqué l'accès aux dossiers dans le navigateur, l'outil ne plante pas. Il passe en mode **« formulaires seulement »** : on remplit, on obtient le PDF, on l'imprime ou on l'envoie. Les formulaires n'ont besoin d'aucune autorisation.

### Le kit DSI

Une page à transmettre au service informatique, pour transformer une informatique stricte en alliée :
- ce que fait l'outil, et surtout ce qu'il ne fait pas : aucune donnée envoyée, pas de serveur, code public et vérifiable ;
- les deux réglages à autoriser : l'adresse du site, et l'accès aux dossiers pour ce seul site (Edge et Chrome ont des stratégies de groupe prévues pour ça) ;
- comment **déployer l'application sur tous les postes d'un coup** par stratégie de groupe : une fois l'informatique convaincue, c'est l'installation la plus simple, l'icône apparaît seule sur chaque poste.

À noter honnêtement : il restera quelques cas sans solution (aucun site web autorisé). Ces structures n'auraient pas pu utiliser Docubus non plus.

## Le premier lancement : l'assistant de configuration (codé dans le prototype 2x)

But : en moins de 10 minutes, une structure qui n'y connaît rien a un outil à son nom et prêt à servir. Chaque étape peut être passée et tout reste modifiable ensuite dans les Réglages.

**0. Accueil et vérifications.** Écran « Bienvenue dans Librejo ». En arrière-plan : vérification du navigateur (Chrome ou Edge : complet ; Firefox ou Safari : message clair, consultation seule), du chemin pour la version zip (`\\serveur\…` ou zip non extrait, détectés et expliqués tout de suite) et de l'accès aux dossiers (sinon, mode dégradé). Deux boutons : **Configurer ma structure** et **Essayer avec une structure fictive** (pour découvrir l'outil avant de s'engager).

**1. Autoriser le dossier.** En premier, car rien ne peut s'enregistrer sans cette autorisation. Une phrase simple (« Librejo a besoin de votre accord pour ranger vos documents dans ce dossier ») et une image de la fenêtre du navigateur qui va s'ouvrir. Si le dossier contient déjà une configuration (deuxième poste de l'équipe), l'assistant est sauté : on autorise et c'est prêt.

**2. Votre structure.** Nom, type (CSAPA, CAARUD, CHRS, MECS, EHPAD, SAVS, autre…), adresse, téléphone, mail, logo. SIRET et FINESS facultatifs. **Aperçu en direct de l'en-tête** d'un courrier à côté du formulaire (le composant existe déjà dans Réglages › Papier à en-tête). Le choix des couleurs (Réglages › Apparence) peut être proposé ici.

**3. Votre équipe.** Les signataires habituels. Question : « Des médecins prescrivent-ils dans votre structure ? » Si oui : noms et RPPS, et l'en-tête d'ordonnance s'active (avec l'avertissement réglementaire, voir plus bas). Sinon, il n'apparaît pas.

**4. Vos catégories.** Un modèle proposé selon le type de structure (exemple CHRS : Admission, Hébergement, Santé, Démarches, Règlement), à renommer, supprimer ou compléter. Les dossiers sont créés automatiquement.

**5. Vos modèles.** Les rubriques de la bibliothèque de modèles, pré-cochées selon le type de structure (exemple MECS : Droits des usagers, Enfance ; EHPAD : Droits, Personnes âgées, Liaison). Chaque modèle reste modifiable ensuite.

**6. Le mail.** « Comment envoyez-vous vos mails ? » : Outlook installé, webmail (Gmail, Outlook web…) ou pas de mail. Puis les adresses d'envoi, et un bouton **Tester** qui génère un mail d'essai.

**7. Le mot de passe admin.** Obligatoire : on ne garde pas de mot de passe par défaut. Explication honnête : c'est un verrou contre les erreurs, pas un coffre-fort (il est stocké en clair dans les réglages).

**8. Récapitulatif, puis « C'est parti ».** Écriture des fichiers de réglages. L'accueil affiche ensuite une **liste de démarrage** qui se coche au fil de l'eau : ajouter vos 5 premiers documents, importer votre annuaire (CSV ou Excel), épingler les plus utilisés, installer sur les autres postes.

Principes de l'assistant :
- **On peut s'arrêter en cours de route** et reprendre là où on en était. Les réponses de l'assistant ne contiennent aucune donnée d'usager.
- **Le facultatif est clairement signalé**, pour que personne ne bloque sur un numéro FINESS introuvable.

### Ce qui est codé (prototype 2x, 25/11/2026)

- **Démarrage** : l'écran d'accueil propose « Première installation ? Créer le dossier Librejo de votre structure ». Librejo prépare `app/` et `Documents/` dans le dossier choisi (ou dans un sous-dossier `Librejo` s'il n'est pas vide), puis l'assistant s'ouvre. Il s'ouvre aussi quand les réglages n'ont pas encore de nom de structure (version `file://`). Un deuxième poste qui choisit le même dossier n'a pas d'assistant.
- **8 étapes** : Bienvenue ; Votre structure (nom, type parmi 9, adresse, téléphone, mail, SIRET et FINESS facultatifs, logo, **aperçu en direct** d'un courrier) ; Votre équipe (signature, médecins et RPPS vérifiés à 11 chiffres) ; Vos catégories (proposées selon le type, modifiables) ; Vos modèles (rubriques cochées selon le type, rangées dans la catégorie qui leur correspond) ; Le mail (Outlook, messagerie web ou pas de mail, adresses d'envoi, bouton **Tester** qui prépare un mail d'essai sans données) ; Le mot de passe (6 caractères au moins, deux fois, mots de passe évidents refusés, avertissement honnête) ; récapitulatif et « C'est parti ».
- Sans médecin, les formulaires médicaux (ordonnance, certificats, relais, courrier au médecin traitant, délivrance) sont masqués ; hors CSAPA et CAARUD, la délivrance et le relais de traitement aussi. Tout se réactive ensuite.
- Brouillon gardé sur le poste (sans le mot de passe) : « Continuer plus tard » reprend à la même étape.
- **Liste de démarrage** sur l'accueil (admin) : 5 premiers documents, annuaire, épingler, papier à en-tête, installer sur les autres postes (avec la marche à suivre). Elle se coche toute seule et se masque.
- Relançable : Documents › Outils › « Assistant de démarrage ».
- Pas encore fait : « Essayer avec une structure fictive », vérifications du navigateur et du chemin dans l'assistant, choix des couleurs (restent dans Réglages › Apparence).

## Films de présentation (24-25/11/2026)

Demande de Julien : 1 min 30 au plus, montrer concrètement le désordre de départ (versions multiples), expliquer que les originaux ne sont pas touchés et que tout est local, les bénéfices pour l'équipe (formulaires) et pour l'admin, ton chaleureux mais rassurant pour les institutions, à destination du médico-social. Faits en code avec la bibliothèque Lemo-Opuscar.
- **Film 1** (`Librejo-presentation.mp4`, style papier chaleureux) : personnages Open Peeps (CC0). Retours : problèmes du début pas assez clairs, métaphore du bibliothécaire peu claire.
- **Film 2** (`Librejo-affaire-documents.mp4`, style « Halftone Dossier ») : désordre montré concrètement, captures vidéo animées du logiciel, métaphore de l'original scellé et de la copie classée.
- **Film 3** (`Librejo-pictogrammes-v3.mp4`, style pictogrammes, 1 min 28) : critiqué du point de vue d'un coordinateur de CSAPA et de MECS, d'un membre d'équipe et d'un décideur (ARS), puis corrigé (zéro donnée gardée, sans formation, 43 modèles par secteur, loi 2002-2, « complète votre DUI », « un navigateur, un dossier », fin honnête : prototype en test, structures pilotes recherchées, modèles à faire relire). Fond allégé ; musique « And Just Like That » de Bryan Teoh (FreePD, domaine public), ralentie à 120 BPM. Version légère sur le Drive (`Librejo-pictogrammes-v3-leger.mp4`), versions complètes à déposer à la main (trop lourdes pour le dépôt depuis Claude).
- **Prochaine version du film (pas tout de suite, demande de Julien du 25/11/2026)** : montrer le prérequis du dossier partagé (NAS, OneDrive ou Teams synchronisé…) ; la carte « Un navigateur, un dossier » devrait dire « un dossier que tous les postes voient ».
- À valider avant diffusion : « sans abonnement », « sans formation », « une minute », « Né dans un CSAPA-CAARUD ». Questions qu'un décideur posera et que le film ne tranche pas : prix et licence, qui maintient, avis d'un DPO.

## Ordonnance : cadre réglementaire (point de vigilance avant diffusion)

Vérification faite le 20/11/2026, à faire confirmer par un juriste (Ordre des médecins, ANS ou HAS, service juridique de la Fédération Addiction). Ce n'est pas un avis juridique.

**Le logiciel n'est pas une ordonnance numérique.** L'ordonnance numérique (e-prescription) passe par les téléservices de l'Assurance Maladie, depuis un logiciel référencé Ségur, avec un LAP certifié HAS. Elle est obligatoire pour les médecins depuis le 1er janvier 2025, avec des dérogations. Le logiciel produit une ordonnance papier, à imprimer, **signer et tamponner à la main**. Il ne remplace pas l'obligation d'ordonnance numérique quand elle s'applique au prescripteur.

**Le vrai risque, c'est la certification des logiciels d'aide à la prescription (LAP).** L'article R.161-76-1 du code de la sécurité sociale soumet à la certification HAS (article L.161-38) tout logiciel dont l'objet est de proposer aux prescripteurs, y compris en établissement médico-social, une aide à la réalisation de la prescription de médicaments. La HAS définit un LAP comme un logiciel dont au moins une fonction permet d'élaborer et d'éditer des prescriptions médicales. Le formulaire actuel, avec ses listes de médicaments et ses posologies pré-remplies, entre probablement dans cette définition.

**Pourquoi la certification est hors de portée :**
- elle exige une base de données sur les médicaments agréée par la HAS (bases commerciales sous licence payante : Vidal, Claude Bernard…) ;
- le référentiel suppose de connaître le patient (traitements en cours, allergies, interactions), donc de stocker ses données, ce qui contredit le principe de l'outil ;
- un audit par un organisme accrédité Cofrac (aujourd'hui SGS-ICS), payant, à repasser avec les nouvelles versions, et un éditeur juridiquement responsable ;
- les alertes (interactions, contre-indications, posologies excessives) font en plus du logiciel un dispositif médical, avec marquage CE (arrêt CJUE du 7 décembre 2017). À l'inverse, selon le même arrêt, un outil qui stocke ou met en forme sans exploiter les données n'est pas un dispositif médical.

**Médicaments stupéfiants et assimilés (méthadone, buprénorphine…).** Ils exigent une ordonnance numérique ou une ordonnance sécurisée papier, avec posologie et dosage en toutes lettres. Depuis le décret n° 2023-1222 du 20 décembre 2023, l'ordonnance dématérialisée est la règle et le papier sécurisé une dérogation (article R.4073-2 du CSP). Le logiciel ne doit pas servir à les prescrire.

**Décision pour la version grand public (20/11/2026) :**
1. Remplacer le formulaire par un **« En-tête d'ordonnance »** : structure, médecin, RPPS (et identifiant de la structure pour les salariés), date, identité du patient, puis texte libre tapé par le médecin. Sans catalogue de médicaments ni posologie proposée : on met en page, le médecin prescrit. → **Fait dans le prototype 2** (modèle de la bibliothèque).
   - Le mot « ordonnance » peut être gardé : il n'est pas protégé, et c'est ce que les médecins cherchent. Le garder aussi dans les mots-clés de la recherche.
   - Description proposée : « Page à l'en-tête du médecin (nom, RPPS, structure) et identité du patient. Le médecin rédige lui-même sa prescription, puis l'imprime, la signe et la tamponne. »
   - Proscrire dans l'interface et la doc les formules « aide à la prescription », « posologies proposées », « prescription sécurisée » : c'est la destination annoncée qui compte.
2. Le catalogue actuel reste une fonction de la version BPM. S'il devait être diffusé : zone grise, avis juridique indispensable.
3. Signaler les stupéfiants et assimilés : « à prescrire en ordonnance numérique ou sur ordonnance sécurisée ».
4. Afficher un avertissement clair dans l'outil et la doc : « Cet outil n'est ni une ordonnance numérique ni un logiciel d'aide à la prescription certifié. Il ne vérifie ni les interactions ni les contre-indications. Le prescripteur reste seul responsable de sa prescription. Imprimez, signez et tamponnez à la main. »
5. Envoi par mail d'une ordonnance : rappeler qu'un mail ordinaire n'est pas une messagerie sécurisée de santé (MSSanté).

## Le marché, en bref

Il existe des logiciels de dossier usager (DUI, financés par le Ségur), des GED (M-Files, DocuWare, Alfresco, SharePoint) et des outils de formulaires en ligne. Aucun trouvé ne combine, pour une petite structure, des documents à jour, des formulaires métier qui produisent PDF et mail, l'impression rapide et un annuaire, sans serveur ni abonnement.

## Les zips

### `Docubus-base-grand-public.zip` (point de départ)

- `Docubus.html` : la version BPM du 20/11/2026 (n° 1). Tout le code y est lisible, JavaScript et CSS inclus.
- `app/lib` (pdf.js, jsPDF, docx-preview…), `app/polices.css`, `app/docubus.ico`.
- `app/donnees.js`, `app/parametres.js` et `app/annuaire.js` : les fichiers de BPM, **comme exemples** de la structure des données.

### `Librejo-prototype-3h.zip` (le plus récent)

- `site/` : l'application web (à publier telle quelle sur GitHub Pages, par exemple dans un dossier `essai2/`) : `index.html` (l'application), `boot.js` (démarrage, choix ou création du dossier), `sw.js` (hors ligne), manifeste, logos, `app/lib`, `app/polices-pdf` (polices libres des PDF et leurs licences).
- `test/Librejo-dossier-test/` : un dossier de structure fictive (Association des Tilleuls, mot de passe « test »), à choisir au démarrage. Il contient un **faux Cerfa** remplissable pour essayer le pré-remplissage, et un formulaire d'essai « Fiche de liaison » qui propose l'équipe.
- Fichiers de contacts fictifs pour essayer l'import de l'annuaire : `Librejo-contacts-fictifs-test.zip`.
- `LISEZ-MOI.md` : installation, personnalisation, limites connues.
