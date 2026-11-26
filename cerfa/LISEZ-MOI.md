# Liste des Cerfa pour Librejo

`cerfa.json` donne les numéros et versions des Cerfa en vigueur, tirés des données ouvertes de Service-Public.gouv.fr (DILA, licence ouverte 2.0).

- Le robot (`.github/workflows/cerfa.yml`) met la liste à jour **le 1er de chaque mois**. Pour le lancer à la main : onglet *Actions › Liste des Cerfa › Run workflow*.
- Si la lecture de la source échoue ou donne une liste anormalement courte, il **ne publie rien** : l'ancienne liste reste.
- Librejo lit ce fichier seulement quand un admin clique sur « Vérifier les Cerfa ». Il ne fait que lire : rien n'est envoyé.

Adresse lue par Librejo : https://raw.githubusercontent.com/librejoapp/librejo/main/cerfa/cerfa.json

## Entretenir le robot (sans outil particulier)

Le robot utilise deux outils de GitHub (`actions/checkout` et `actions/setup-node`). Ils sont **figés sur une version précise**, désignée par une longue suite de chiffres et de lettres (son empreinte). Une version piégée publiée plus tard sous le même nom ne pourrait donc pas s'exécuter ici. Cela ne touche pas aux données : la liste des Cerfa est relue chaque mois à la source.

**Vérifier que tout va bien**
- Onglet *Actions › Liste des Cerfa* : une coche verte pour chaque mois.
- Pour un essai à la main : *Run workflow* (en haut à droite), puis *Run workflow*. Au bout d'une minute environ, la coche verte apparaît. Dans le détail, « Aucun changement » ou « cerfa.json : … Cerfa » veut dire que la liste a été lue.

**Accepter une mise à jour des outils** (Dependabot, environ une fois par mois au plus)
1. Quand une nouvelle version sort, Dependabot ouvre une demande dans l'onglet *Pull requests* (GitHub prévient aussi par mail). Son titre commence par « Robot ».
2. Elle ne change que les lignes `uses:` du fichier `.github/workflows/cerfa.yml`. Cliquez sur *Merge pull request*, puis *Confirm merge*.
3. Lancez un essai à la main (voir plus haut) pour vérifier la coche verte.

**Si personne ne s'en occupe**
- Rien ne casse : le robot continue chaque mois avec les versions figées, et les demandes de Dependabot restent simplement en attente.
- Il faudra agir un jour seulement si GitHub retire la version de Node.js qu'utilisent ces outils. Le robot s'arrête alors, et une croix rouge apparaît dans *Actions* (GitHub prévient par mail). Il suffit d'accepter la dernière demande de Dependabot, puis de faire un essai à la main.
- Tant que le robot est arrêté, Librejo continue de marcher. Seule la vérification des Cerfa s'appuie sur la dernière liste publiée.

**Arrêter les demandes de Dependabot** : supprimer le fichier `.github/dependabot.yml` (sur GitHub : ouvrir le fichier, « … » › *Delete file*). Le robot continue sans lui.
