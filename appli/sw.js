// Librejo : met en cache le code de l'application (dossier appli/) pour fonctionner hors ligne. Les documents de la structure ne passent jamais par ici.
/* Nom du cache : toujours « librejo-appli-… » (incrémenter le numéro à chaque mise à jour du code).
   À l'activation, seuls les anciens caches « librejo-appli-* » sont supprimés : jamais ceux du site ni d'autres. */
const PREFIX='librejo-appli-';
const VERSION=PREFIX+'v4';
/* Mise en cache en deux temps.
   1. À l'installation (~2,4 Mo) : ce qu'il faut pour ouvrir Librejo et produire un PDF hors ligne. */
const BASE=['./','index.html','app.js','fichier.js','boot.js','boot.css','logo.svg','logo-blanc.svg','manifest.webmanifest','favicon.ico','favicon.svg','app/polices.css',
 'app/lib/jspdf.umd.min.js','app/lib/jszip.min.js','app/lib/pdf-lib.min.js', // PDF : créer, assembler, remplir
 'app/polices-pdf/repli.js']; // caractères des PDF (latin étendu, vietnamien, grec, cyrillique)
/* 2. Ensuite (~1,9 Mo), quand la page le demande, quelques secondes après l'ouverture de l'application : aperçus et
   impression (pdf.js), documents Word, polices arabe et géorgienne. La page ne les charge elle-même que si
   besoin ; ce second temps les garde pour le travail hors ligne. Tout fichier de l'application chargé en ligne
   est aussi gardé au passage (voir « fetch »). */
const SUITE=['app/lib/pdf.min.js','app/lib/pdf.worker.min.js','app/lib/docx-preview.min.js',
 'app/polices-pdf/arabe.js','app/polices-pdf/georgien.js','app/lib/bidi.min.js'];
/* Seuls les fichiers de l'application vont au cache : la page, ses scripts, ses icônes, ses bibliothèques
   et ses polices. Tout le reste du site (dossier de test, documents d'exemple, robot des Cerfa…) n'y va
   jamais, et les réglages d'une structure non plus. Une exception : le zip de la structure fictive, que la démo
   (appli/?demo) copie dans le navigateur. Il est hors de appli/ mais sur le même site : gardé à la demande de la
   démo (message « librejo-cache-demo »), il permet de « Remettre à zéro » la démo hors ligne. Il n'est jamais
   téléchargé hors de la démo. */
const APP_FILES=new Set(['','index.html','app.js','fichier.js','boot.js','boot.css','sw.js','logo.svg','logo-blanc.svg','manifest.webmanifest','favicon.ico','favicon.svg',
 'apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','app/polices.css','app/favicon.png','app/favicon.svg']);
const APP_DIRS=['app/lib/','app/polices-pdf/'];
const SCOPE=new URL('./',self.location).pathname;
const DEMO_ZIP=new URL('../telechargements/Librejo-dossier-test.zip',self.location).pathname;
function appFile(u){
  if(u.origin===location.origin&&u.pathname===DEMO_ZIP) return true;
  if(u.origin!==location.origin||!u.pathname.startsWith(SCOPE)) return false;
  const p=decodeURIComponent(u.pathname.slice(SCOPE.length));
  if(/(^|\/)(parametres|donnees|annuaire|logo-association)\.js$/.test(p)||/^app\/polices-pdf\/perso\./.test(p)) return false; // réglages et police d'une structure
  return APP_FILES.has(p)||APP_DIRS.some(d=>p.startsWith(d));
}
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting())));
self.addEventListener('message',e=>{
  /* la démo demande aussi son zip (une seule fois : il n'est repris que si le cache change de version) */
  const l=e.data==='librejo-cache-suite'?SUITE:e.data==='librejo-cache-demo'?[DEMO_ZIP]:null; if(!l) return;
  e.waitUntil(caches.open(VERSION).then(c=>Promise.all(l.map(u=>c.match(u).then(r=>r||c.add(u)).catch(()=>{}))))); });
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith(PREFIX)&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!appFile(u)) return; // hors de l'application : le navigateur s'en charge, rien n'est gardé
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok&&r.type==='basic'){ const c=r.clone(); caches.open(VERSION).then(x=>x.put(e.request,c)); } return r; })
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
