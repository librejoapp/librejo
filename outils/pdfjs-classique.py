#!/usr/bin/env python3
"""Prépare pdf.js (pdfjs-dist, version « legacy ») pour Librejo.

pdfjs-dist ne fournit plus que des modules (.mjs). Librejo charge pdf.js comme des scripts classiques, dans la page
et sans worker séparé : c'est ce qui permet la version fichier (file://), où les modules et les workers sont interdits.
Ce script transforme les deux modules en scripts classiques :
- retire la dernière ligne « export {…} » (les deux fichiers créent déjà globalThis.pdfjsLib et globalThis.pdfjsWorker) ;
- enferme chaque fichier dans sa propre fonction (ils déclarent les mêmes noms au niveau global) ;
- remplace import.meta.url par l'adresse du dossier des bibliothèques (self.LJ_PDFJS_BASE, réglée par Librejo).
Il copie aussi les décodeurs d'images (JBIG2, JPEG 2000) en WebAssembly, avec leur version de secours.

Usage :  npm pack pdfjs-dist@VERSION && tar xzf pdfjs-dist-VERSION.tgz
         python3 outils/pdfjs-classique.py package appli/app/lib
"""
import re, shutil, sys, pathlib
src, dst = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
version = __import__('json').loads((src/'package.json').read_text())['version']
for name, out in [('pdf.min.mjs', 'pdf.min.js'), ('pdf.worker.min.mjs', 'pdf.worker.min.js')]:
    t = (src/'legacy'/'build'/name).read_text(encoding='utf-8')
    t, n = re.subn(r'export\s*\{[^{}]*\};?\s*$', '', t.rstrip())
    assert n == 1, f'{name} : export final introuvable'
    t = t.replace('import.meta.url', '(self.LJ_PDFJS_BASE||location.href)')
    assert 'import.meta' not in t, f'{name} : import.meta restant'
    head = f'/* pdf.js {version} (pdfjs-dist, build legacy), transformé en script classique par outils/pdfjs-classique.py */\n'
    # chaque fichier dans sa propre fonction : les deux déclarent les mêmes noms au niveau global
    (dst/out).write_text(head + '(function(){\n' + t + '\n}).call(globalThis);\n', encoding='utf-8')
w = dst/'pdfjs-wasm'; w.mkdir(exist_ok=True)
for f in (src/'wasm').iterdir():
    if f.name.startswith('quickjs'): continue  # JavaScript des PDF : jamais exécuté par Librejo (enableScripting désactivé)
    if f.suffix in ('.wasm', '.js') or f.name.startswith('LICENSE'): shutil.copy(f, w/f.name)
shutil.copy(src/'LICENSE', dst/'LICENSE-pdfjs.txt')
print('pdf.js', version, '→', dst)
