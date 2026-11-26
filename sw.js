/* Librejo : service worker de remplacement, à la racine du site.

   Pourquoi il existe
   Jusqu'en novembre 2026, l'application était publiée à la racine (https://librejoapp.github.io/librejo/)
   avec un service worker de portée racine (caches « librejo-proto3h » à « librejo-proto3m »). L'application
   est maintenant dans appli/, avec son propre service worker (portée appli/, caches « librejo-appli-* »),
   et la racine est le site de présentation.
   Sur un poste où l'ancienne application a été ouverte, l'ancien service worker contrôle encore toute la
   racine. Le navigateur vérifie de lui-même s'il a changé (en relisant ce fichier, /sw.js) : il trouve
   celui-ci, qui le remplace aussitôt, efface les anciens caches de l'application à la racine, se désinscrit
   et recharge les fenêtres ouvertes. Elles affichent alors la version en ligne (le site, ou l'appli dans appli/).

   Ce qu'il ne fait pas
   Pas de gestionnaire « fetch » : rien n'est mis en cache ni intercepté. Il ne touche jamais aux caches
   « librejo-appli-* » de l'application, ni à aucun autre.

   Quand le retirer
   Quand on pourra considérer que tous les postes qui avaient ouvert l'ancienne application sont revenus
   au moins une fois sur le site (par exemple quelques mois après le déplacement, au printemps 2027).
   Le retirer trop tôt n'est pas grave pour les données (elles sont dans le dossier de la structure), mais un
   poste resté sur l'ancien service worker pourrait continuer d'afficher l'ancienne application en cache
   hors ligne. Ne jamais faire enregistrer ce fichier par une page : il n'est là que pour remplacer l'ancien. */
'use strict';
const ANCIENS = 'librejo-proto'; // préfixe des anciens caches de l'application à la racine (proto3h … proto3m)

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => e.waitUntil((async () => {
  const noms = await caches.keys();
  await Promise.all(noms.filter(n => n.startsWith(ANCIENS)).map(n => caches.delete(n)));
  await self.registration.unregister();
  const fenetres = await self.clients.matchAll({ type: 'window' });
  for (const f of fenetres) { try { await f.navigate(f.url); } catch (err) {} }
})()));
