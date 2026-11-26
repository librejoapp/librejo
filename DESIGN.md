---
name: Librejo
description: La boîte à outils documentaire des petites structures sociales et médico-sociales
colors:
  canard: "#1F6F6B"
  canard-nuit: "#174f4c"
  ambre: "#E9A23B"
  ambre-encre: "#2b1d05"
  ambre-doux: "#fcf1dc"
  ambre-texte: "#8a5a0b"
  ambre-sur-nuit: "#f2c26b"
  encre: "#17302F"
  encre-2: "#263d3b"
  encre-3: "#46595a"
  encre-attenuee: "#5b6b6a"
  texte-sur-nuit: "#d3e5e2"
  texte-sur-nuit-2: "#9cbcb8"
  creme: "#f7f4ec"
  creme-charte: "#FBF6EC"
  papier: "#ffffff"
  papier-2: "#f0ece2"
  papier-3: "#faf8f3"
  filet: "#ece5d8"
  filet-fort: "#d2cbbb"
  ok: "#178a47"
  ok-fond: "#e3f4ea"
  alerte: "#b0480c"
  alerte-fond: "#fdefe2"
  danger: "#c2410c"
  surligne: "#ffe08a"
typography:
  marque:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontWeight: 700
  titre-section:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  titre:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "22px"
    fontWeight: 700
  intertitre:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
  corps:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  aide:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  etiquette:
    fontFamily: "Asap, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.09em"
rounded:
  sm: "8px"
  md: "14px"
  lg: "18px"
  full: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "40px"
components:
  bouton-principal:
    backgroundColor: "{colors.ambre}"
    textColor: "{colors.ambre-encre}"
    rounded: "{rounded.sm}"
    height: "40px"
  bouton-principal-alt:
    backgroundColor: "{colors.canard-nuit}"
    textColor: "{colors.papier}"
    rounded: "{rounded.sm}"
    height: "40px"
  bouton-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.papier}"
    rounded: "{rounded.sm}"
  champ:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    height: "48px"
  carte:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    rounded: "{rounded.md}"
    padding: "16px"
  pastille:
    backgroundColor: "{colors.papier-2}"
    textColor: "{colors.encre-3}"
    rounded: "{rounded.full}"
    padding: "1px 8px"
  pastille-accent:
    backgroundColor: "{colors.ambre-doux}"
    textColor: "{colors.ambre-texte}"
    rounded: "{rounded.full}"
  menu-lateral:
    backgroundColor: "{colors.canard-nuit}"
    textColor: "{colors.texte-sur-nuit}"
    width: "256px"
---

# Design System: Librejo

## Overview

**Creative North Star: "Le bureau d'accueil"**

Librejo est le bureau d'accueil d'une petite structure : l'endroit chaleureux où, la personne en face de soi, on trouve tout de suite le bon papier, rempli proprement, à l'en-tête de la maison. Tout le système sert ce geste : un menu sombre et stable à gauche, comme le meuble du bureau ; à droite, une surface crème et calme où les documents et formulaires sont posés comme des fiches sur la table, à portée de main. Rien ne doit faire hésiter : on voit d'abord ce qu'on cherche, puis l'action qui suit.

La densité est moyenne : assez d'air pour lire vite entre deux rendez-vous, assez d'information pour qu'un admin range une cinquantaine de documents sans tourner les pages. La chaleur vient de la matière (fond crème, ombres dorées très douces, arrondis généreux, une seule touche ambre), pas de la décoration. Le logo donne la mesure : une étagère bien rangée, rassurante, ordonnée, bienveillante.

Les écrans d'équipe restent simples et directs ; les écrans d'administration peuvent être plus denses, mais toujours rangés par tâche. Librejo est fait pour l'ordinateur (Chrome ou Edge) : la mise en page n'est pas pensée pour le téléphone.

**Key Characteristics:**
- Menu latéral fixe bleu canard nuit, contenu sur fond crème.
- Cartes blanches arrondies, posées par une ombre chaude et légère.
- Une seule couleur chaude, l'ambre, pour l'action principale et les repères.
- Une police de lecture unique (Asap) pour l'interface ; Poppins réservé au nom.
- Vouvoiement, phrases courtes, honnêteté sur ce qui est enregistré ou non.

## Colors

Une palette de bureau chaleureux : bleu canard profond pour la structure, crème et papier pour les surfaces, une seule touche d'ambre pour agir.

### Primary
- **Bleu canard** (`canard`) : la couleur de la charte. Liens, titres secondaires, accents de cartes (`border-top` des cartes bleues), anneau de focus des champs.
- **Bleu canard nuit** (`canard-nuit`) : le menu latéral, les titres de section, le bouton principal alternatif. C'est la couleur du « meuble » : elle encadre, elle ne crie pas.

### Secondary
- **Ambre** (`ambre`) : l'action principale (bouton « Créer », « Entrer »), le contour de focus clavier (3 px) et les signaux de mode (mode admin). Texte posé dessus : **encre d'ambre** (`ambre-encre`), jamais du blanc.
- **Ambre doux** (`ambre-doux`) et **texte ambre** (`ambre-texte`) : fonds et textes des badges « Formulaire », rappels et bandeaux d'attention douce.
- **Ambre sur nuit** (`ambre-sur-nuit`) : l'ambre lisible sur le menu sombre.

### Neutral
- **Encre** (`encre`) : le texte courant ; **encre 2** et **encre 3** pour les niveaux secondaires ; **encre atténuée** pour les aides et métadonnées (toujours au-dessus de 4,5:1 sur crème et papier).
- **Crème** (`creme`) : le fond de l'application. La **crème de la charte** (`creme-charte`) est réservée au fond du manifeste et aux supports de marque.
- **Papier** (`papier`, `papier-2`, `papier-3`) : surfaces des cartes, champs, zones secondaires.
- **Filet** (`filet`, `filet-fort`) : bordures de cartes et de champs.
- **Texte sur nuit** (`texte-sur-nuit`, `texte-sur-nuit-2`) : texte et étiquettes dans le menu latéral.

### Statuts
- **Vert** (`ok`, `ok-fond`) : réussite, « Document prêt ». **Orange brûlé** (`alerte`, `alerte-fond`) : avertissements, rappels de suppression, MSSanté. **Danger** (`danger`) : actions destructrices seulement. **Surligné** (`surligne`) : correspondances de recherche.
- Les teintes de **saison** (`--saison`, bleu, vert, jaune, abricot pâles) colorent discrètement l'accueil selon la période ; elles restent des fonds, jamais des couleurs de texte.

### Named Rules
**The One Warm Voice Rule.** L'ambre est la seule couleur chaude de l'interface, comme le livre ambre de l'étagère. Il sert l'action principale et les signaux d'attention ; il n'habille jamais une surface entière.

**The Adjusted Colour Rule.** Quand une structure choisit ses couleurs (Réglages › Apparence), Librejo corrige la couleur pour rester lisible (WCAG AA) et affiche la couleur réellement appliquée. Aucune couleur de structure ne passe sous 4,5:1 pour du texte.

## Typography

**Display Font:** Poppins Bold (nom « librejo » dans le logo et l'en-tête du menu)
**Body Font:** Asap (avec system-ui, -apple-system, Segoe UI)

**Character:** Asap, humaniste et légèrement arrondie, se lit vite et reste aimable ; Poppins, géométrique, n'apparaît que pour le nom, comme une enseigne.

### Hierarchy
- **Titre de section** (700, 26px, 1,15, −0,01em) : titre de page et grands titres de section, en bleu canard nuit.
- **Titre** (700, 22px) : titres de blocs (« Les plus utilisés », « Remplir un formulaire »).
- **Intertitre** (700, 18px) : titres de cartes et de sections de formulaire.
- **Corps** (400, 16px, 1,5) : texte courant et champs. Lignes de texte courant limitées à environ 70 caractères.
- **Aide** (400, 14px) : textes d'aide sous les champs, métadonnées.
- **Étiquette** (700, 12px, 0,09em, majuscules) : étiquettes de groupes du menu latéral.
- Le plancher de lecture est 12px ; 10px n'est admis que pour des compteurs décoratifs doublés d'un texte accessible.

### Named Rules
**The Enseigne Rule.** Poppins est l'enseigne : il écrit « librejo » et rien d'autre. Toute l'interface parle en Asap. (Le nom du menu encore écrit en Permanent Marker incliné est un reste de Docubus, à remplacer par Poppins.)

## Layout

- Menu latéral fixe de 256px à gauche ; contenu à droite, largeur maximale 1200px, formulaires à 860px, écrans larges (réglages, administration) à 980px.
- Grille de cartes en `auto-fill` (minimum 260px, 220px en version étroite), gouttière de 16px.
- Rythme d'espacement par pas de 4 (4, 8, 12, 16, 24, 32, 40px) ; 24 à 32px entre sections, 12 à 16px dans une carte.
- Champs sur deux colonnes dans les formulaires (pleine largeur pour les champs longs) ; aperçu en direct du PDF à droite, agrandissable.
- Cibles : contrôles de 40px, champs de 48px. Pensé pour 1366×768 et 1920×1080, et confortable à 125 % de zoom. Sous 900px environ, le menu passe au-dessus du contenu, sans plus d'adaptation : Librejo n'est pas fait pour le téléphone.

## Elevation & Depth

Système en couches douces : les surfaces sont posées sur le fond crème par une ombre chaude (teinte brun doré), jamais grise ni colorée. La profondeur dit « on peut prendre cette fiche », pas « regardez-moi ».

### Shadow Vocabulary
- **Carte posée** (`box-shadow: 0 1px 2px rgba(90,60,20,.05), 0 6px 20px rgba(90,60,20,.07)`) : cartes de documents et de formulaires au repos.
- **Carte soulevée** (`box-shadow: 0 10px 24px rgba(90,60,20,.12)`) : survol des cartes, menus déroulants.
- **Fenêtre** (`box-shadow: 0 18px 40px -14px rgba(13,42,94,.45)`) : fenêtres modales et volets, au-dessus d'un voile.

### Named Rules
**The Warm Shadow Rule.** Les ombres sont chaudes et diffuses, jamais décalées ni dures, jamais en lueur colorée.

## Shapes

Arrondis généreux et réguliers : 8px pour les boutons et petits contrôles, 14px pour les cartes et champs, 18px pour les grands panneaux et fenêtres, cercle complet pour les pastilles et badges. Bordures fines (1px, filet) ; un liseré de 4px en haut des cartes de formulaire (bleu canard nuit ou bleu canard) range les sections comme des intercalaires. Le logo du menu est posé sur une tuile blanche arrondie cerclée d'ambre.

## Components

### Buttons
**Chaleureux et tactile : un bouton invite, et dit ce qu'il fait.**
- **Shape :** arrondi doux (8px), hauteur 40px (52px pour le grand bouton de fin de formulaire, 32px pour la petite taille).
- **Principal :** fond ambre, texte encre d'ambre, graisse 700. Une seule action principale par zone.
- **Principal alternatif :** fond bleu canard nuit, texte blanc (« Entrer », actions d'admin).
- **Secondaire :** fond papier, bordure filet fort, texte encre.
- **Danger :** fond orange brûlé foncé, texte blanc, toujours précédé d'une confirmation.
- **Focus :** contour ambre de 3px décalé de 2px, sur tous les éléments interactifs.
- **Désactivé :** opacité 45 %, curseur normal.

### Chips
- **Style :** pastilles arrondies (cercle complet) pour les choix rapides (civilité, motif, situation) ; état choisi marqué par le remplissage **et** une coche, et annoncé (`aria-pressed`).
- **Badges :** fond papier 2 et texte encre 3 ; variante « Formulaire » en ambre doux et texte ambre.

### Cards / Containers
- **Corner Style :** 14px.
- **Background :** papier blanc sur fond crème.
- **Shadow Strategy :** carte posée au repos, soulevée au survol.
- **Border :** filet 1px ; liseré haut de 4px pour les sections de formulaire.
- **Internal Padding :** 16px, gouttière interne 12px.
- **Carte de document :** vignette en haut, titre cliquable, actions libellées (« Imprimer », « Envoyer », « Gérer »).

### Inputs / Fields
- **Style :** fond papier, bordure filet fort 1px, arrondi 14px, hauteur 48px, texte 16px ; zones de texte de 70px minimum ; `dir="auto"` pour accueillir l'arabe.
- **Focus :** bordure bleu canard et halo de 3px à 30 % de bleu canard.
- **Error :** message sous le champ, en orange brûlé, relié au champ (`aria-describedby`, `aria-invalid`).

### Navigation
- **Menu latéral :** fond bleu canard nuit, texte « sur nuit » 16px graisse 600, icônes 19px ; survol en voile blanc 7 %, élément actif en voile blanc 11 % et texte blanc. Étiquettes de groupe en petites capitales espacées. Lien « Aller au contenu » en premier, onglets parcourables aux flèches.

### Signature Component : « Document prêt »
La fenêtre de fin de formulaire : coche verte, « Imprimer » mis en avant, puis « Envoyer » et « Télécharger », et un encadré orange qui rappelle de supprimer le fichier de Téléchargements avec son nom exact. C'est le moment où le bureau d'accueil tend le papier : clair, rassurant, honnête.

## Do's and Don'ts

### Do:
- **Do** garder l'ambre pour l'action principale et les signaux d'attention, avec texte encre d'ambre (`#2b1d05`) dessus.
- **Do** poser chaque contenu sur une carte papier (14px, ombre chaude) au-dessus du fond crème.
- **Do** écrire tout le texte de l'interface en Asap, et le nom « librejo » en Poppins Bold.
- **Do** libeller les actions par leur verbe (« Imprimer », « Créer le document ») plutôt que par une icône seule.
- **Do** viser RGAA / WCAG AA : 4,5:1 pour le texte, focus ambre 3px visible partout, titres réels.
- **Do** dire ce qui est enregistré ou non au moment où ça compte (rappels, MSSanté), dans un encadré, pas en petits caractères.

### Don't:
- **Don't** utiliser le Permanent Marker ni le nom incliné hérités de Docubus.
- **Don't** introduire une deuxième couleur chaude ou colorer de grandes surfaces en ambre.
- **Don't** utiliser d'ombres dures, décalées ou en lueur colorée.
- **Don't** descendre sous 12px pour du texte lu.
- **Don't** adapter les écrans pour le téléphone au détriment de l'ordinateur.
