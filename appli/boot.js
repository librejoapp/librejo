/* Librejo – démarrage en application web (prototype 2).
   En version fichier (file://), les réglages sont chargés par les balises <script> comme avant.
   En version web (https), le code vient du site, mais les réglages et les documents sont lus
   dans le dossier de la structure, choisi et autorisé sur ce poste. Rien n'est envoyé au site.
   Les fichiers de réglages sont lus comme des données (JSON), jamais exécutés. */
(function(){
'use strict';
var WEB = location.protocol !== 'file:';
var DATA_FILES = [['app/parametres.js','DOCUBUS_PARAMETRES',true],['app/donnees.js','DOCUBUS_DONNEES',true],
                  ['app/annuaire.js','DOCUBUS_ANNUAIRE',false],['app/logo-association.js','DOCUBUS_LOGO_ASSO',false]];
var MIME = {pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',odt:'application/vnd.oasis.opendocument.text'};

/* Bibliothèques PDF (jsPDF, pdf-lib, JSZip, police de repli : ~1,3 Mo) : l'application les charge elle-même
   à la première demande (ouverture d'un formulaire, de l'administration…), pas au choix du dossier : l'accueil
   arrive plus vite. Elles restent dans le cache du service worker : Librejo marche aussi hors ligne. */
async function startMain(){
  var src = document.getElementById('docubus-main');
  var s = document.createElement('script'); s.textContent = src.textContent; document.body.appendChild(s);
  return true;
}
if (!WEB) { startMain(); return; }

/* ---------- Démo en ligne : appli/?demo ----------
   La même application, ouverte sur la structure fictive « Association des Tilleuls », copiée dans le stockage privé
   du navigateur (Origin Private File System, dossier « librejo-demo »). Rien n'est envoyé, rien n'est partagé entre
   visiteurs. La démo ne touche jamais à la vraie installation du poste :
   - le dossier de la structure mémorisé en IndexedDB (« docubus » › « dossier ») n'est ni lu ni écrit ;
   - les préférences du poste (localStorage) et le mode admin (sessionStorage) sont rangés à part : pendant la démo,
     localStorage et sessionStorage sont remplacés par des vues préfixées « librejo-demo: » (comme STK_NS dans la
     démo de Stockaarud). Sans « ?demo », l'application retrouve le vrai dossier et les vraies préférences.
   La démo reste active tant que l'adresse garde « ?demo » (l'application ne change que le #ancre en naviguant). */
var DEMO = /^\?(?:.*&)?demo(?:[=&]|$)/.test(location.search);
var DEMO_NS = 'librejo-demo:', DEMO_DIR = 'librejo-demo', DEMO_ZIP = '../telechargements/Librejo-dossier-test.zip', DEMO_OK = '.demo-prete';
var realStore = {};
function nsStore(name){
  var real = null; try { real = window[name]; } catch(e){}
  realStore[name] = real;
  function own(){ var out=[]; if (!real) return out; for (var i=0;i<real.length;i++){ var k=real.key(i); if (k && k.indexOf(DEMO_NS)===0) out.push(k.slice(DEMO_NS.length)); } return out; }
  function need(){ if (!real) throw new DOMException('Stockage indisponible', 'SecurityError'); return real; }
  var api = {
    getItem: function(k){ return need().getItem(DEMO_NS+k); },
    setItem: function(k,v){ need().setItem(DEMO_NS+k, String(v)); },
    removeItem: function(k){ need().removeItem(DEMO_NS+k); },
    key: function(i){ var o=own(); return i<o.length ? o[i] : null; },
    clear: function(){ own().forEach(function(k){ real.removeItem(DEMO_NS+k); }); }
  };
  Object.defineProperty(api, 'length', {get:function(){ return own().length; }});
  try { Object.defineProperty(window, name, {configurable:true, enumerable:true, get:function(){ return api; }}); } catch(e){ return false; }
  return window[name] === api;
}
function nsClear(name){ var r = realStore[name]; if (!r) return; try { for (var i=r.length-1;i>=0;i--){ var k=r.key(i); if (k && k.indexOf(DEMO_NS)===0) r.removeItem(k); } } catch(e){} }
var DEMO_NS_OK = true;
if (DEMO) {
  DEMO_NS_OK = nsStore('localStorage') && nsStore('sessionStorage');
  window.LJ_DEMO = {
    dir: null, installer: '../installer.html',
    /* Remettre à zéro : efface le dossier de démo et les clés de démo de ce navigateur, puis recharge une démo neuve */
    reset: async function(){
      try { var root = await navigator.storage.getDirectory(); await root.removeEntry(DEMO_DIR, {recursive:true}); } catch(e){}
      nsClear('localStorage'); nsClear('sessionStorage');
      location.reload();
    },
    /* Quitter : l'application normale, sur ce poste (vrai dossier, vraies préférences) */
    quit: function(){ location.href = location.pathname; }
  };
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', {scope:'./'}).catch(function(){});

/* même base que le reste de l'application : la poignée du dossier est partagée */
function idbOpen(){ return new Promise(function(res,rej){ var r=indexedDB.open('docubus',1); r.onupgradeneeded=function(){ r.result.createObjectStore('h'); }; r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }
function idbGet(k){ return idbOpen().then(function(db){ return new Promise(function(res){ var t=db.transaction('h').objectStore('h').get(k); t.onsuccess=function(){ res(t.result||null); }; t.onerror=function(){ res(null); }; }); }).catch(function(){ return null; }); }
function idbSet(k,v){ return idbOpen().then(function(db){ return new Promise(function(res){ var t=db.transaction('h','readwrite'); t.objectStore('h').put(v,k); t.oncomplete=function(){ res(true); }; t.onerror=function(){ res(false); }; }); }); }

var dir = null;
/* Mode « formulaires seulement » : choisi sur ce poste (ou imposé quand le navigateur n'a pas l'accès aux dossiers) */
var SD_KEY = 'librejo-sans-dossier';
var KIT_DSI = 'https://github.com/librejoapp/librejo#si-lacc%C3%A8s-aux-dossiers-est-bloqu%C3%A9';
function sdSet(v){ try { if (v) localStorage.setItem(SD_KEY, v); else localStorage.removeItem(SD_KEY); } catch(e){} }
function sdGet(){ try { return localStorage.getItem(SD_KEY); } catch(e){ return null; } }
async function sub(parts, h){ var d=h||dir; for (var i=0;i<parts.length;i++) d=await d.getDirectoryHandle(parts[i]); return d; }
/* Ce qui a été lu au démarrage (date et contenu) : avant d'écrire un fichier de réglages, l'application
   vérifie qu'il n'a pas été modifié entre-temps sur un autre poste */
window.LJ_LUS = {};
async function readText(rel){ var p=rel.split('/'), n=p.pop(); var d=await sub(p); var f=await (await d.getFileHandle(n)).getFile(); var t=await f.text(); window.LJ_LUS[rel]={t:f.lastModified, txt:t}; return t; }
function parseData(text, name){
  var m = text.match(new RegExp('window\\.'+name+'\\s*=\\s*([\\s\\S]*?);?\\s*$'));
  if (!m) throw new Error('format');
  return JSON.parse(m[1]);
}
async function looksRight(h){
  var app=false, docs=false;
  for await (var e of h.values()){ var l=e.name.toLowerCase(); if(e.kind==='directory'&&l==='app') app=true; if(e.kind==='directory'&&l==='documents') docs=true; }
  return app && docs;
}

/* ---------- écran d'ouverture ---------- */
var ui = document.getElementById('lj-boot');
/* Tant que l'écran d'ouverture est affiché, l'application (cachée dessous) est inerte : ni Tab, ni clic,
   ni lecteur d'écran. Le premier arrêt de Tab est le premier bouton de l'écran d'ouverture. */
function cover(on){
  for (var i=0, k=document.body.children; i<k.length; i++){ var el=k[i];
    if (el===ui || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) continue;
    if (on && !el.inert){ el.inert=true; el.setAttribute('data-lj-boot-inert',''); }
    else if (!on && el.hasAttribute('data-lj-boot-inert')){ el.inert=false; el.removeAttribute('data-lj-boot-inert'); } }
  if (!on && window.LJ_LAYERS_SYNC) window.LJ_LAYERS_SYNC();
}
cover(true);
function done(){ ui.hidden = true; cover(false); cacheSuite(); }
/* Service worker : second temps de la mise en cache (aperçus, polices arabe et géorgienne), une fois l'application ouverte */
function cacheSuite(){ if (!('serviceWorker' in navigator)) return;
  setTimeout(function(){ navigator.serviceWorker.ready.then(function(r){ if (!r.active) return; r.active.postMessage('librejo-cache-suite');
    if (DEMO) r.active.postMessage('librejo-cache-demo'); /* le zip de la démo : « Remettre à zéro » marche aussi hors ligne */ }).catch(function(){}); }, 4000); }
function show(html){ ui.hidden=false; cover(true); ui.querySelector('.lj-in').innerHTML = html;
  var h=ui.querySelector('.lj-in h1'); if (h) { h.id='lj-t';
    /* titre de l'onglet : l'écran affiché (« Accès au dossier refusé – Librejo ») ; l'application prend ensuite le relais */
    var t=h.textContent.trim(); document.title = /Librejo/.test(t) ? t : t+' – Librejo'; } }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
/* Entrée « Remplir un formulaire sans dossier », sous le choix du dossier (raison : refus, introuvable, choix) */
function sdOffer(raison){
  var b=document.createElement('div'); b.className='lj-sd';
  b.innerHTML='<button class="lj-btn lj-sec" id="lj-sd">Remplir un formulaire sans dossier</button>'
    +'<p class="lj-aide">Sans le dossier, vous n’aurez pas les documents, l’annuaire ni les réglages de la structure : seulement les formulaires, avec l’en-tête que vous saisissez. C’est la solution quand le navigateur ou le service informatique bloque l’accès aux dossiers. <a href="'+KIT_DSI+'" target="_blank" rel="noopener">Ce qu’il faut demander à l’informatique</a></p>';
  ui.querySelector('.lj-in').appendChild(b);
  document.getElementById('lj-sd').onclick=function(){ formsOnly(raison||'choix'); };
}
/* Lancer l'application sans dossier : formulaires intégrés et modèles de la bibliothèque, en-tête saisi sur ce poste */
async function formsOnly(raison){
  if (raison!=='api') sdSet(raison==='choix'?'choix':'refus');
  window.LJ_SANS_DOSSIER = {raison:raison, api:!!window.showDirectoryPicker};
  window.DOCUBUS_PARAMETRES = {assistant:'fait'}; window.DOCUBUS_DONNEES = {categories:[],documents:[],formulaires:[]};
  window.DOCUBUS_ANNUAIRE = {partenaires:[],types:[]}; window.DOCUBUS_LOGO_ASSO = null;
  if (!(await startMain())) return;
  done();
}

async function load(){
  var missing = [];
  for (var i=0;i<DATA_FILES.length;i++){
    var f=DATA_FILES[i];
    try { window[f[1]] = parseData(await readText(f[0]), f[1]); }
    catch(e){ if (f[2]) missing.push(f[0]+(e.message==='format'||e instanceof SyntaxError?' (illisible)':' (introuvable)')); }
  }
  if (missing.length && DEMO) { demoFailed({name:'format'}); return; }
  if (missing.length) {
    show('<h1>Le dossier ne contient pas les réglages attendus</h1><p>Fichiers manquants ou illisibles :</p><ul>'+missing.map(function(m){ return '<li>'+esc(m)+'</li>'; }).join('')+'</ul><p>Choisissez le dossier qui contient <b>app</b> et <b>Documents</b>.</p><button class="lj-btn" id="lj-pick">Choisir un autre dossier</button>');
    document.getElementById('lj-pick').onclick = pick; sdOffer('introuvable');
    return;
  }
  sdSet(null);
  if (!(await startMain())) return;
  done();
  try { var n=(window.DOCUBUS_PARAMETRES||{}).attestation; var f=document.getElementById('lj-foot'); if(f&&n&&n.nom) f.textContent='Librejo · '+n.nom; } catch(e){}
}
async function pick(){
  try {
    var h = await window.showDirectoryPicker({id:'docubus', mode:'read'});
    if (!(await looksRight(h))) {
      var inner = null;
      for await (var e of h.values()) if (e.kind==='directory' && (await looksRight(e).catch(function(){ return false; }))) { inner=e; break; }
      if (!inner) { show('<h1>Ce n’est pas le bon dossier</h1><p>Le dossier <b>'+esc(h.name)+'</b> ne contient pas les sous-dossiers <b>app</b> et <b>Documents</b>. Choisissez le dossier de votre structure.</p><button class="lj-btn" id="lj-pick">Choisir le dossier</button>'); document.getElementById('lj-pick').onclick=pick; sdOffer('choix'); return; }
      h = inner;
    }
    dir = h; window.LJ_CHOIX = 'dossier'; await idbSet('dossier', h); await load();
  } catch(e) {
    if (e && e.name === 'AbortError') return;
    refused(e);
  }
}
/* Première installation : prépare un dossier vide (app + Documents) ; l'assistant s'ouvre ensuite */
async function create(){
  try {
    var h = await window.showDirectoryPicker({id:'docubus', mode:'readwrite'});
    if (await looksRight(h)) { dir=h; window.LJ_CHOIX='dossier'; await idbSet('dossier', h); return load(); }
    var empty=true; for await (var e of h.values()){ if (e.name.charAt(0)!=='.') { empty=false; break; } }
    var root = empty ? h : await h.getDirectoryHandle('Librejo', {create:true});
    var app = await root.getDirectoryHandle('app', {create:true}); await root.getDirectoryHandle('Documents', {create:true});
    var files = [['parametres.js','window.DOCUBUS_PARAMETRES = {"assistant":"a-faire"};\n'],['donnees.js','window.DOCUBUS_DONNEES = {"categories":[],"documents":[],"formulaires":[]};\n'],['annuaire.js','window.DOCUBUS_ANNUAIRE = {"partenaires":[],"types":[]};\n']];
    for (var i=0;i<files.length;i++){ var ex=true; try { await app.getFileHandle(files[i][0]); } catch(_){ ex=false; }
      if (!ex) { var w=await (await app.getFileHandle(files[i][0], {create:true})).createWritable(); await w.write('// Librejo (créé à l\'installation)\n'+files[i][1]); await w.close(); } }
    dir = root; window.LJ_CHOIX = 'creation'; await idbSet('dossier', root); await load();
  } catch(e) {
    if (e && e.name === 'AbortError') return;
    show('<h1>Création impossible</h1><p>Le navigateur n’a pas pu écrire dans ce dossier ('+esc(e && e.name || 'erreur')+'). Choisissez un dossier où vous avez le droit d’écrire.</p><button class="lj-btn" id="lj-pick">Réessayer</button>');
    document.getElementById('lj-pick').onclick = create; sdOffer('refus');
  }
}
/* Accès refusé (navigateur, stratégie de l'informatique, ou réponse « Bloquer ») : on le dit, et les formulaires restent possibles */
function refused(e){
  var n = e && e.name || '';
  show('<h1>Accès au dossier refusé</h1><p>Le navigateur n’a pas pu ouvrir le dossier'+(n?' ('+esc(n)+')':'')+'. Si le dossier est sur le réseau, vérifiez qu’il est bien connecté. Si votre service informatique bloque l’accès aux dossiers dans le navigateur, il peut l’autoriser pour Librejo seulement.</p><button class="lj-btn" id="lj-pick">Réessayer</button>');
  document.getElementById('lj-pick').onclick = pick; sdOffer('refus');
}
async function reauth(){
  var st = 'prompt';
  try { st = await dir.requestPermission({mode:'read'}); } catch(e){ return refused(e); }
  if (st==='granted') { try { return await load(); } catch(e){ return refused(e); } }
  if (st==='denied') return refused({name:'NotAllowedError'});
  pick();
}

/* ---------- Démo : préparation du dossier fictif dans le stockage privé du navigateur ---------- */
function demoScreen(title, html){
  show('<h1>'+title+'</h1>'+html+'<p class="lj-aide"><a href="'+DEMO_ZIP+'" download>Télécharger le dossier de test</a> · <a href="../installer.html">Installer Librejo pour votre structure</a></p><a class="lj-btn lj-sec" href="./">Ouvrir Librejo sans la démo</a>');
}
function demoUnsupported(){
  demoScreen('La démo ne marche pas dans ce navigateur',
    '<p>Elle a besoin du stockage privé des navigateurs récents : Google Chrome, Microsoft Edge, Firefox ou Safari à jour, sur ordinateur. Ce navigateur ne le propose pas (ou la navigation privée le bloque).</p>'
    +'<p class="lj-aide">Vous pouvez aussi télécharger le dossier de test et le choisir dans Librejo, avec Chrome ou Edge.</p>');
}
function demoFailed(e){
  var n = e && e.name || '';
  demoScreen('La démo n’a pas pu démarrer',
    '<p>'+(n==='QuotaExceededError'?'Le navigateur manque de place pour la démo (environ 100 Ko).'
      :n==='reseau'?'Le dossier fictif n’a pas pu être téléchargé. Vérifiez la connexion à Internet, puis réessayez.'
      :n==='SecurityError'||n==='NotAllowedError'?'Le navigateur refuse le stockage privé (navigation privée, ou stockage bloqué pour ce site).'
      :'Le dossier fictif n’a pas pu être préparé dans ce navigateur'+(n?' ('+esc(n)+')':'')+'.')+'</p>'
    +'<button class="lj-btn" id="lj-demo-again">Recommencer la démo</button>');
  document.getElementById('lj-demo-again').onclick = function(){ window.LJ_DEMO.reset(); };
}
function loadScript(src){ return new Promise(function(res,rej){ var s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=function(){ rej({name:'reseau'}); }; document.head.appendChild(s); }); }
/* le dossier de la structure dans librejo-demo (celui qui contient app et Documents) */
async function demoFind(base){ for await (var e of base.values()) if (e.kind==='directory' && await looksRight(e).catch(function(){ return false; })) return e; return null; }
/* Une seule source : le zip du site (telechargements/Librejo-dossier-test.zip, le même que la page « Télécharger »),
   décompressé avec JSZip. Le repère « .demo-prete » n'est écrit qu'une fois tout copié : une copie interrompue
   est refaite au lancement suivant. */
async function demoInstall(root){
  try { await root.removeEntry(DEMO_DIR, {recursive:true}); } catch(e){}
  var base = await root.getDirectoryHandle(DEMO_DIR, {create:true});
  var r; try { r = await fetch(DEMO_ZIP); } catch(e){ throw {name:'reseau'}; }
  if (!r.ok) throw {name:'reseau'};
  var buf = await r.arrayBuffer();
  if (!window.JSZip) await loadScript('app/lib/jszip.min.js');
  var zip = await window.JSZip.loadAsync(buf), files = [];
  zip.forEach(function(path, f){ if (!f.dir) files.push(f); });
  for (var i=0;i<files.length;i++){
    var parts = files[i].name.normalize('NFC').split('/').filter(function(p){ return p && p!=='.' && p!=='..'; }), name = parts.pop(), d = base;
    for (var j=0;j<parts.length;j++) d = await d.getDirectoryHandle(parts[j], {create:true});
    var w = await (await d.getFileHandle(name, {create:true})).createWritable(); await w.write(await files[i].async('blob')); await w.close();
  }
  var h = await demoFind(base); if (!h) throw {name:'format'};
  var m = await (await base.getFileHandle(DEMO_OK, {create:true})).createWritable(); await m.write(new Date().toISOString()); await m.close();
  return h;
}
async function demoBoot(){
  document.title = 'Démo – Librejo';
  var ok = DEMO_NS_OK && navigator.storage && typeof navigator.storage.getDirectory === 'function'
    && typeof FileSystemFileHandle !== 'undefined' && 'createWritable' in FileSystemFileHandle.prototype;
  if (!ok) { demoUnsupported(); return; }
  try {
    var root = await navigator.storage.getDirectory(), h = null;
    try { var base = await root.getDirectoryHandle(DEMO_DIR); await base.getFileHandle(DEMO_OK); h = await demoFind(base); } catch(e){ h = null; }
    if (!h) {
      show('<h1>Préparation de la démo</h1><p role="status">Librejo copie la structure fictive « Association des Tilleuls » dans ce navigateur…</p>');
      h = await demoInstall(root);
    }
    dir = h; window.LJ_DEMO.dir = h; window.LJ_CHOIX = 'demo';
    await load();
  } catch(e) {
    console.warn('démo', e);
    demoFailed(e);
  }
}

async function boot(){
  if (DEMO) { demoBoot(); return; }
  /* Navigateur sans accès aux dossiers (Firefox, Safari…) : les formulaires marchent quand même */
  if (!window.showDirectoryPicker) { formsOnly('api'); return; }
  dir = await idbGet('dossier');
  /* « Formulaires seulement » choisi sur ce poste, sans dossier connu : on y retourne directement
     (le bandeau propose « Choisir le dossier ») */
  if (!dir && sdGet()) { formsOnly(sdGet()==='refus'?'refus':'choix'); return; }
  if (dir) {
    var st = 'prompt'; try { st = await dir.queryPermission({mode:'read'}); } catch(e){}
    if (st === 'granted') { try { await load(); return; } catch(e){} }
    show('<h1>Bonjour</h1><p>Pour ouvrir les documents de votre structure, Librejo a besoin de votre accord pour lire le dossier <b>'+esc(dir.name)+'</b>.</p><p class="lj-aide">Si le navigateur propose <b>« Autoriser à chaque visite »</b>, choisissez-le : vous n’aurez plus à le refaire.</p><button class="lj-btn" id="lj-go">Ouvrir le dossier</button> <button class="lj-btn lj-sec" id="lj-other">Choisir un autre dossier</button>');
    document.getElementById('lj-go').onclick = reauth;
    document.getElementById('lj-other').onclick = pick;
    sdOffer('choix');
    return;
  }
  show('<h1>Bienvenue dans Librejo</h1><p>Choisissez le dossier de votre structure : celui qui contient les sous-dossiers <b>app</b> et <b>Documents</b> (sur le NAS, un lecteur réseau, OneDrive…).</p><p class="lj-aide">Les documents restent dans ce dossier. Rien n’est envoyé sur Internet.</p><button class="lj-btn" id="lj-pick">Choisir le dossier</button>');
  document.getElementById('lj-pick').onclick = pick;
  var nb=document.createElement('p'); nb.className='lj-aide'; nb.innerHTML='Première installation ? <button class="lj-link" id="lj-new">Créer le dossier Librejo de votre structure</button>'; ui.querySelector('.lj-in').appendChild(nb);
  document.getElementById('lj-new').onclick = create;
  sdOffer('choix');
}
/* Depuis le bandeau « formulaires seulement » : revenir à l'écran de choix du dossier */
window.LJ_CHOISIR_DOSSIER = function(){ sdSet(null); location.reload(); };

/* ---------- liens vers les documents : lus dans le dossier, pas sur le site ---------- */
document.addEventListener('click', async function(ev){
  var a = ev.target.closest && ev.target.closest('a[href]');
  if (!a || !dir) return;
  var href = a.getAttribute('href');
  if (!href || /^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(href) || /^app\//.test(href)) return;
  ev.preventDefault(); ev.stopPropagation();
  try {
    var parts = href.split('?')[0].split('/').map(decodeURIComponent), name = parts.pop();
    var d = await sub(parts); var f = await (await d.getFileHandle(name)).getFile();
    var ext = (name.split('.').pop()||'').toLowerCase();
    var url = URL.createObjectURL(new Blob([f], {type: MIME[ext] || f.type || 'application/octet-stream'}));
    if (['pdf','png','jpg','jpeg','webp','txt'].indexOf(ext) >= 0) window.open(url, '_blank');
    else { var l=document.createElement('a'); l.href=url; l.download=name; document.body.appendChild(l); l.click(); l.remove(); }
    setTimeout(function(){ URL.revokeObjectURL(url); }, 300000);
  } catch(e) {
    alert('Document introuvable dans le dossier : ' + decodeURIComponent(href));
  }
}, true);

/* ---------- miniatures (app/miniatures) : lues dans le dossier ---------- */
var thumbs = {};
async function fixImg(img){
  var src = img.getAttribute('src');
  if (!src || !/^app\/miniatures\//.test(src) || !dir) return;
  img.removeAttribute('src');
  try {
    var key = src.split('?')[0];
    if (!thumbs[key]) { var p=key.split('/'), n=p.pop(); var d=await sub(p); thumbs[key] = URL.createObjectURL(await (await d.getFileHandle(n)).getFile()); }
    img.src = thumbs[key];
  } catch(e) { img.dispatchEvent(new Event('error')); }
}
new MutationObserver(function(ms){
  ms.forEach(function(m){
    if (m.type === 'attributes') fixImg(m.target);
    m.addedNodes && m.addedNodes.forEach(function(n){ if (n.nodeType!==1) return; if (n.tagName==='IMG') fixImg(n); n.querySelectorAll && n.querySelectorAll('img[src^="app/miniatures/"]').forEach(fixImg); });
  });
}).observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:['src']});

boot();
})();
