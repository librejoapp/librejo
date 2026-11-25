// Librejo : met en cache le code du site pour fonctionner hors ligne. Les documents de la structure ne passent jamais par ici.
const VERSION='librejo-proto3i';
const BASE=['./','index.html','boot.js','boot.css','logo.svg','logo-blanc.svg','manifest.webmanifest','favicon.ico','favicon.svg','app/polices.css',
 'app/lib/jspdf.umd.min.js','app/lib/jszip.min.js','app/lib/pdf-lib.min.js', // PDF : créer, assembler, remplir
 'app/lib/pdf.min.js','app/lib/pdf.worker.min.js','app/lib/docx-preview.min.js','app/polices-pdf/repli.js']; // aperçus, impression, caractères des PDF
/* Seuls les fichiers de l'application vont au cache : la page, ses scripts, ses icônes, ses bibliothèques
   et ses polices. Tout le reste du site (dossier de test, documents d'exemple, robot des Cerfa…) n'y va
   jamais, et les réglages d'une structure non plus. */
const APP_FILES=new Set(['','index.html','boot.js','boot.css','sw.js','logo.svg','logo-blanc.svg','manifest.webmanifest','favicon.ico','favicon.svg',
 'apple-touch-icon.png','icon-192.png','icon-512.png','icon-maskable-512.png','app/polices.css','app/favicon.png','app/favicon.svg']);
const APP_DIRS=['app/lib/','app/polices-pdf/'];
const SCOPE=new URL('./',self.location).pathname;
function appFile(u){
  if(u.origin!==location.origin||!u.pathname.startsWith(SCOPE)) return false;
  const p=decodeURIComponent(u.pathname.slice(SCOPE.length));
  if(/(^|\/)(parametres|donnees|annuaire|logo-association)\.js$/.test(p)||/^app\/polices-pdf\/perso\./.test(p)) return false; // réglages et police d'une structure
  return APP_FILES.has(p)||APP_DIRS.some(d=>p.startsWith(d));
}
self.addEventListener('install',e=>e.waitUntil(caches.open(VERSION).then(c=>c.addAll(BASE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||!appFile(u)) return; // hors de l'application : le navigateur s'en charge, rien n'est gardé
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok&&r.type==='basic'){ const c=r.clone(); caches.open(VERSION).then(x=>x.put(e.request,c)); } return r; })
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
