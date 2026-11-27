#!/usr/bin/env python3
"""Fabrique telechargements/Librejo-hors-ligne.zip à partir du dossier appli/.

Le zip contient un dossier « Librejo » : Librejo.html, le code et les bibliothèques.
Il ne contient aucun réglage ni aucun document : l'assistant de démarrage les crée
dans ce dossier au premier lancement. Décompresser une nouvelle version par-dessus
met donc le code à jour sans toucher aux réglages ni aux documents de la structure.

Usage : python3 outils/hors-ligne.py   (depuis la racine du dépôt)
"""
import os, re, zipfile, time
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'appli')
OUT = os.path.join(ROOT, 'telechargements', 'Librejo-hors-ligne.zip')
# fichiers propres à la version web (installation, service worker) : inutiles en version fichier
SKIP = {'sw.js', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'}
version = re.search(r"DOCUBUS_VERSION='([^']+)'", open(os.path.join(SRC, 'app.js'), encoding='utf-8').read()).group(1)

LISEZ_MOI = f"""Librejo, version hors ligne ({version})
=========================================

Cette version s'utilise sans Internet. Le code est dans ce dossier, au lieu d'être chargé depuis le site.

Installer
---------
1. Placez ce dossier « Librejo » là où l'équipe range ses documents :
   - sur l'ordinateur, s'il n'y a qu'un poste ;
   - sur un dossier partagé (NAS, serveur de fichiers, OneDrive synchronisé…) s'il y en a plusieurs.
2. Ouvrez Librejo.html avec Google Chrome ou Microsoft Edge (clic droit › Ouvrir avec).
3. L'assistant de démarrage vous guide. Quand le navigateur demande un dossier, choisissez ce dossier « Librejo ».
4. Ajoutez Librejo.html aux favoris du navigateur, sur chaque poste.

Sur les autres postes, ouvrez le même Librejo.html : tout est déjà réglé.
Si le dossier est sur le réseau, ouvrez-le par une lettre de lecteur (Z:\\Librejo\\Librejo.html) plutôt que par
un chemin \\\\NAS\\partage : Chrome et Edge autorisent mal les dossiers ouverts de cette façon.

Mettre à jour
-------------
Téléchargez la nouvelle version sur https://librejoapp.github.io/librejo/telecharger.html et décompressez-la
au même endroit, en remplaçant les fichiers. Le zip ne contient ni réglages ni documents : ceux de votre
structure (dossier Documents, app/parametres.js, app/donnees.js, app/annuaire.js, app/miniatures…) restent
tels quels. Faites quand même une sauvegarde avant.

Différences avec la version installée
-------------------------------------
- Pas de mise à jour automatique : vous changez de version quand vous le décidez.
- La lecture des documents scannés (reconnaissance du texte) n'est pas disponible, et certaines images de scans
  ne s'affichent pas dans les aperçus.
- Le navigateur peut redemander l'accès au dossier de temps en temps : cliquez sur « Autoriser ».

Librejo est gratuit et libre (licence EUPL 1.2). Code source : https://github.com/librejoapp/librejo
Une question : librejo@proton.me
"""

def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    stamp = time.localtime()[:6]
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        def add(arc, data):
            zi = zipfile.ZipInfo('Librejo/' + arc, stamp); zi.compress_type = zipfile.ZIP_DEFLATED
            zi.external_attr = 0o644 << 16; z.writestr(zi, data)
        for dp, dns, fns in os.walk(SRC):
            dns.sort()
            for fn in sorted(fns):
                rel = os.path.relpath(os.path.join(dp, fn), SRC).replace(os.sep, '/')
                if rel in SKIP: continue
                data = open(os.path.join(dp, fn), 'rb').read()
                if rel == 'index.html':
                    rel = 'Librejo.html'
                    data = re.sub(rb'<link rel="(manifest|apple-touch-icon)"[^>]*>\n?', b'', data)
                add(rel, data)
        add('LISEZ-MOI.txt', LISEZ_MOI.replace('\n', '\r\n').encode('utf-8'))
        zi = zipfile.ZipInfo('Librejo/Documents/', stamp); zi.external_attr = 0o40755 << 16; z.writestr(zi, b'')
    print(OUT, os.path.getsize(OUT) // 1024, 'Ko')

if __name__ == '__main__':
    main()
