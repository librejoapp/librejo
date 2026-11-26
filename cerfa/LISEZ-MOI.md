# Liste des Cerfa pour Librejo

`cerfa.json` donne les numéros et versions des Cerfa en vigueur, tirés des données ouvertes de Service-Public.gouv.fr (DILA, licence ouverte 2.0).

- Le robot (`.github/workflows/cerfa.yml`) met la liste à jour **le 1er de chaque mois**. Pour le lancer à la main : onglet *Actions › Liste des Cerfa › Run workflow*.
- Si la lecture de la source échoue ou donne une liste anormalement courte, il **ne publie rien** : l'ancienne liste reste.
- Librejo lit ce fichier seulement quand un admin clique sur « Vérifier les Cerfa ». Il ne fait que lire : rien n'est envoyé.

Adresse lue par Librejo : https://raw.githubusercontent.com/librejoapp/librejo/main/cerfa/cerfa.json
