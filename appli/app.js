/* Librejo : le code de l'application. Chargé par boot.js (startMain) une fois les réglages lus,
   ou directement en version fichier. Fichier à part pour la politique de sécurité (CSP : script-src 'self'). */
(function(){
'use strict';
/* Miniatures : orientation et image absente. Écouteurs posés ici plutôt que dans des attributs onload/onerror
   (la politique de sécurité de la page interdit le code écrit dans le HTML). */
document.addEventListener('load',e=>{ const t=e.target; if(t.tagName==='IMG'&&t.hasAttribute('data-land')&&t.naturalWidth>t.naturalHeight) t.classList.add('land'); },true);
document.addEventListener('error',e=>{ const t=e.target; if(t.tagName!=='IMG'||!t.dataset.err) return;
  if(t.dataset.err==='ico'){ const sp=document.createElement('span'); sp.className='ico '+(t.dataset.k||''); sp.setAttribute('role','img'); sp.setAttribute('aria-label','Fichier '+(t.dataset.lab||'')); sp.textContent=t.dataset.lab||''; t.replaceWith(sp); }
  else if(t.dataset.err==='noimg'){ t.parentNode&&t.parentNode.classList.add('noimg'); t.remove(); }
  else t.remove(); },true);
/* ======================================================================
   Librejo — version locale (ordinateurs du bureau, sans internet).
   - La liste des documents, leurs descriptions et les formulaires sont dans
     app/donnees.js ; les réglages dans app/parametres.js. Le mode admin les
     réécrit directement dans le dossier (accès au dossier autorisé dans le navigateur).
   - Les droits (lecture seule pour l'équipe, écriture pour les responsables)
     sont ceux du dossier dans le dossier.
   CONFIDENTIALITÉ : le formulaire de délivrance vit uniquement en mémoire ;
   rien n'est enregistré. Seuls les PDF téléchargés par l'utilisateur quittent
   la page, pour être joints au mail puis supprimés.
   ====================================================================== */
const $=s=>document.querySelector(s);
/* Défilement vers un repère : animé, sauf si la personne a demandé de réduire les animations */
const smooth=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svg=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON={
  open:svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'),
  share:svg('<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/><path d="M5 12v8h14v-8"/>'),
  chev:'<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  search:svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  trash:svg('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  copy:svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  mail:svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
  file:svg('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>'),
  shield:svg('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  pen:svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>'),
  dl:svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
  print:svg('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1"/><path d="M7 14h10v7H7z"/>'),
  up:svg('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>'),
  upA:svg('<path d="m6 15 6-6 6 6"/>'), downA:svg('<path d="m6 9 6 6 6-6"/>')
};

const TOAST_ERR=/impossible|introuvable|erreur|incorrect|manquant|trop lourd|refus|échec|aucun|n'a pas|pas d.adresse|choisissez|donnez/i;
const TOAST_OK=/enregistr|ajouté|créé|copié|supprimé|connecté|prêt|effacé|activé|quitté|retiré|mis à jour|actualisée|téléchargé|imprim/i;
function toast(msg,kind){ const t=$('#toast'); kind=kind||(TOAST_ERR.test(msg)?'err':TOAST_OK.test(msg)?'ok':''); t.className='toast'+(kind?' '+kind:''); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,3000); }
const pad=n=>String(n).padStart(2,'0');
const BLANK='………………'; // case laissée vide sur le PDF, à compléter à la main
let MISS_OK=false;  // « Continuer quand même » en cours (voir missingStop)
function frDate(iso){ if(!iso) return ''; if(iso===BLANK) return BLANK; const [y,m,d]=String(iso).slice(0,10).split('-'); return `${d}/${m}/${y}`; }
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const sizeTxt=n=>!n?'':n>1048576?(n/1048576).toFixed(1).replace('.',',')+' Mo':Math.max(1,Math.round(n/1024))+' Ko';

/* ---------- Fenêtres ---------- */
let lastFocus=null, modalGuard=null;
/* Échap, clic à côté ou « Annuler » : si la fenêtre contient un travail en cours, on demande d'abord */
function closeAsked(){ if($('#modal').hidden) return; const g=modalGuard&&modalGuard(); if(!g){ closeModal(); return; }
  if($('#mguard')){ $('#mg-stay').focus(); return; }
  const box=$('#modal-box'), w=document.createElement('div'); w.id='mguard'; w.className='mguard'; w.setAttribute('role','alertdialog'); w.setAttribute('aria-labelledby','mg-t');
  w.innerHTML=`<p id="mg-t"><b>${esc(g)}</b></p><div class="row"><button type="button" class="primary danger" id="mg-close">Fermer sans ajouter</button><button type="button" class="secondary" id="mg-stay">Continuer</button></div>`;
  box.prepend(w); box.scrollTop=0; $('#mg-stay').focus();
  $('#mg-close').onclick=()=>{ modalGuard=null; closeModal(); }; $('#mg-stay').onclick=()=>{ w.remove(); const f=box.querySelector('input,button'); f&&f.focus(); }; }
/* Fenêtres vraiment modales. Tant qu'une fenêtre est ouverte, le reste de la page est inerte
   (ni clic, ni Tab, ni lecteur d'écran) et Tab boucle dans la fenêtre. Les fenêtres peuvent s'empiler
   (conflit de réglages ou aperçu d'un PDF au-dessus d'une autre) : seule celle du dessus reste active,
   dans l'ordre de leur z-index. L'aide « ? » est rattachée à la fenêtre ouverte (aideHost) : elle reste utilisable.
   L'écran de démarrage (#lj-boot) compte comme une fenêtre tant qu'il est affiché. */
const LAYERS=['#lj-boot:not([hidden])','#pdfprev','#cfdlg','#wiz:not([hidden])','#modal:not([hidden])'];
const layerTop=()=>{ for(const s of LAYERS){ const e=document.querySelector(s); if(e) return e; } return null; };
const inertSet=new Set();
function layersSync(){
  const top=layerTop();
  inertSet.forEach(el=>{ if(!top||el.parentNode!==document.body||el===top||el.contains(top)){ el.inert=false; inertSet.delete(el); } });
  if(!top) return;
  for(const el of document.body.children){
    if(el===top||el.contains(top)||el.id==='toast'||el.id==='lj-boot'||/^(SCRIPT|STYLE|LINK)$/.test(el.tagName)||el.inert) continue;
    el.inert=true; inertSet.add(el);
  }
}
window.LJ_LAYERS_SYNC=layersSync;
new MutationObserver(ms=>{ if(ms.some(m=>m.target===document.body||m.target.parentNode===document.body)) layersSync(); })
  .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
const FOCUSABLE='a[href],button,input:not([type=hidden]),select,textarea,summary,iframe,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
function layerFocusables(top){
  const seen=new Set();
  return [...top.querySelectorAll(FOCUSABLE)].filter(e=>{
    if(e.disabled||e.closest('[inert]')||!e.getClientRects().length||getComputedStyle(e).visibility==='hidden') return false;
    if(e.type==='radio'&&e.name){ const k=e.form+'|'+e.name; const g=[...top.querySelectorAll(`input[type=radio][name="${CSS.escape(e.name)}"]`)]; const on=g.find(x=>x.checked)||g[0]; if(e!==on||seen.has(k)) return false; seen.add(k); }
    return true; });
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||e.defaultPrevented||e.ctrlKey||e.altKey||e.metaKey) return;
  const top=layerTop(); if(!top) return;
  const f=layerFocusables(top); if(!f.length){ e.preventDefault(); return; }
  const a=document.activeElement, first=f[0], last=f[f.length-1];
  let go=null;
  if(!top.contains(a)) go=e.shiftKey?last:first;
  else if(!e.shiftKey&&(a===last||!f.some(x=>a.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_FOLLOWING))) go=first;
  else if(e.shiftKey&&(a===first||!f.some(x=>a.compareDocumentPosition(x)&Node.DOCUMENT_POSITION_PRECEDING))) go=last;
  if(go){ e.preventDefault(); go.focus(); }
},true);
function openModal(html,cls){
  /* une fenêtre qui en remplace une autre (étapes de la visite, confirmation) garde le bouton d'origine */
  if($('#modal').hidden||!lastFocus) lastFocus=document.activeElement; modalGuard=null;
  const box=$('#modal-box'); box.className='dialog'+(cls?' '+cls:''); box.innerHTML=html;
  $('#modal').hidden=false; document.body.style.overflow='hidden'; layersSync();
  const f=box.querySelector('[data-autofocus]')||box.querySelector('input,button'); f&&f.focus();
}
function closeModal(){
  if($('#modal').hidden) return;
  $('#modal').hidden=true; document.body.style.overflow=''; $('#modal-box').innerHTML=''; layersSync();
  /* Le focus revient au bouton d'origine au tour suivant : si la fenêtre se ferme sur la touche Entrée,
     le même appui ne doit pas « cliquer » ce bouton (ex. Accès admin, qui ressortirait aussitôt). */
  const lf=lastFocus; lastFocus=null;
  /* Sans bouton d'origine (visite guidée ouverte au démarrage, bouton redessiné entre-temps), le focus va au
     début du contenu de la page plutôt que de se perdre sur le document */
  setTimeout(()=>{ const a=document.activeElement; if(!$('#modal').hidden||(a&&a!==document.body)) return;
    const t=lf&&lf!==document.body&&lf.isConnected&&lf.getClientRects().length?lf:$('#contenu'); t&&t.focus({preventScroll:t.id==='contenu'}); },0);
}
$('#modal').addEventListener('click',e=>{ if(e.target.id==='modal'||e.target.closest('[data-close]')) closeAsked(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($('#mguard')){ $('#mguard').remove(); return; } closeAsked(); } });
/* « / » (hors champ de saisie) ou Ctrl+K : aller à la recherche de la page, l'annuaire ayant la sienne.
   Le caractère n'est jamais écrit dans la recherche : la touche sert seulement de raccourci. */
document.addEventListener('keydown',e=>{ const t=e.target, typing=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const slash=e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey, ck=(e.ctrlKey||e.metaKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='k';
  if(!slash&&!ck) return; if(layerTop()||document.getElementById('menu')) return;
  e.preventDefault();
  let q=tab==='annu'?$('#an-q'):$('#q');
  if(!q||!q.getClientRects().length){ setTab('docs'); q=$('#q'); }
  if(q){ q.focus(); q.select(); } });
function askConfirm(title,text,yes,fn,danger=true){
  openModal(`<h3 id="modal-title">${esc(title)}</h3><p>${text}</p>
    <div class="btns"><button class="primary ${danger?'danger':'alt'}" id="cf-yes">${esc(yes)}</button><button class="secondary" data-close data-autofocus>Annuler</button></div>`);
  $('#cf-yes').onclick=()=>{ closeModal(); fn(); };
}
function askText(title,label,value,fn){
  openModal(`<h3 id="modal-title">${esc(title)}</h3><label class="field"><span>${esc(label)}</span><input class="in" id="pv" value="${esc(value)}" data-autofocus></label>
    <div class="btns"><button class="primary alt" id="pok">Valider</button><button class="secondary" data-close>Annuler</button></div>`);
  const go=()=>{ const v=$('#pv').value.trim(); if(!v) return; closeModal(); fn(v); };
  $('#pok').onclick=go; $('#pv').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } }); $('#pv').select();
}
let logoData=null;
function isoToday(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function isoAdd(iso,days){ const [y,m,d]=iso.split('-').map(Number); const t=new Date(y,m-1,d+days); return `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`; }
function isoDate(iso){ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); }
function weekday(iso){ return iso?isoDate(iso).toLocaleDateString('fr-FR',{weekday:'long'}):''; }
let uid=0;
function newDate(prev){ return {id:++uid,d:prev&&prev.d?isoAdd(prev.d,1):isoToday(),mg:prev?prev.mg:''}; }
function newPatient(){ return {id:++uid,civ:'',ini:'',ddn:'',dossier:'',trt:'',forme:'',comment:'',dates:[newDate()]}; }
function blank(){ return {date:isoToday(),csapa:'',libreNom:'',libreMail:'',attention:'',patients:[newPatient()]}; }
let F=blank(), showErrors=false, files=[], urls=[];
const FORMES={metha:['Sirop','Gélules'],bupre:['Comprimé sublingual','Lyophilisat oral (Orobupré)']};
const TRT_NAME={metha:'Méthadone',bupre:'Buprénorphine'};

function dest(){
  if(F.csapa==='libre') return {structure:F.libreNom.trim(),adresses:splitMails(F.libreMail)};
  const l=dests.find(x=>x.id===F.csapa); return l?{structure:l.structure||l.nom,adresses:l.adresses||[]}:null;
}
function splitMails(s){ return String(s||'').split(/[\s,;]+/).map(x=>x.trim()).filter(Boolean); }
const MAIL=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/* posologie écrite sur un PDF : en chiffres et en lettres, ou en pointillés si elle manque (« Continuer quand même ») */
function doseTxt(v){ return parseDose(v)>0?`${fmtDose(v)} mg par jour (${doseLettres(v)} par jour)`:`${BLANK} mg par jour`; }
function parseDose(v){ const n=parseFloat(String(v).replace(',','.')); return isFinite(n)?n:NaN; }
function fmtDose(v){ return (Math.round(parseDose(v)*100)/100).toString().replace('.',','); }
/* Dose en toutes lettres (orthographe traditionnelle : vingt et un, quatre-vingts, deux cents…) */
const UNITS=['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize'];
const TENS={2:'vingt',3:'trente',4:'quarante',5:'cinquante',6:'soixante'};
function lt100(n){
  if(n<17) return UNITS[n]; if(n<20) return 'dix-'+UNITS[n-10];
  const t=Math.floor(n/10),u=n%10;
  if(t<7) return TENS[t]+(u===0?'':u===1?' et un':'-'+UNITS[u]);
  if(t===7) return 'soixante'+(u===1?' et onze':'-'+lt100(10+u));
  if(t===8) return u===0?'quatre-vingts':'quatre-vingt-'+UNITS[u];
  return 'quatre-vingt-'+lt100(10+u);
}
function lt1000(n){
  if(n===1000) return 'mille';
  const h=Math.floor(n/100),r=n%100; if(!h) return lt100(r);
  const hs=h===1?'cent':UNITS[h]+' cent';
  return r?hs+' '+lt100(r):(h>1?hs+'s':hs);
}
function doseLettres(v){
  const n=parseDose(v); if(!(n>=0)||n>1000) return '';
  const [ent,dec]=fmtDose(v).split(',');
  let txt=lt1000(+ent);
  if(dec){ const zeros=dec.match(/^0*/)[0].length; txt+=' virgule '+(zeros?Array(zeros).fill('zéro').join(' ')+' ':'')+(+dec.slice(zeros)?lt100(+dec.slice(zeros)):'').trim(); txt=txt.trim(); }
  return txt+(n<2?' milligramme':' milligrammes');
}
function parseDDN(s){
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s||''); if(!m) return null;
  const d=+m[1],mo=+m[2],y=+m[3],t=new Date(y,mo-1,d);
  if(t.getFullYear()!==y||t.getMonth()!==mo-1||t.getDate()!==d) return null;
  if(y<1900||t>new Date()) return null; return t;
}
function validate(){
  /* chaque message garde la clé de son champ (keys) : la liste « À corriger » et la fenêtre « Il manque des informations » y mènent */
  const errs=[],bad=new Set(),keys=[], no=(m,k)=>{ errs.push(m); keys.push(k); bad.add(k); };
  if(!F.date){ no('Date du document manquante.','date'); }
  if(F.csapa===''||(F.csapa!=='libre'&&!dest())){ no('Choisissez le CSAPA de suivi.','csapa'); }
  if(F.csapa==='libre'){
    if(!F.libreNom.trim()){ no('Indiquez le nom de la structure.','libreNom'); }
    const m=splitMails(F.libreMail);
    if(!m.length||m.some(x=>!MAIL.test(x))){ no('Adresse mail du destinataire manquante ou incorrecte.','libreMail'); }
  }
  F.patients.forEach((p,i)=>{
    const P=`Patient ${i+1} : `;
    if(!p.civ){ no(P+'choisissez M. ou Mme.',p.id+'civ'); }
    if(!p.ini.trim()){ no(P+'initiales manquantes.',p.id+'ini'); }
    if(!parseDDN(p.ddn)){ no(P+(p.ddn.trim()?'date de naissance incorrecte (JJ/MM/AAAA).':'date de naissance manquante.'),p.id+'ddn'); }
    if(!p.trt){ no(P+'choisissez le traitement.',p.id+'trt'); }
    const seen=new Set();
    p.dates.forEach((d,j)=>{
      if(!d.d){ no(P+`date de délivrance n° ${j+1} manquante.`,d.id+'d'); }
      else if(seen.has(d.d)){ no(P+`la date du ${frDate(d.d)} est en double.`,d.id+'d'); }
      seen.add(d.d);
      const n=parseDose(d.mg);
      if(!(n>0)||n>1000){ no(P+`dose manquante pour le ${d.d?frDate(d.d):'n° '+(j+1)}.`,d.id+'mg'); }
    });
  });
  return {errs,bad,keys};
}

function renderDeliv(){
  const p=$('#p-deliv');
  const {errs,bad,keys}=showErrors?validate():{errs:[],bad:new Set(),keys:[]};
  const B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const d=F.csapa!==''?dest():null;
  const patients=F.patients.map((pt,i)=>{
    const formes=pt.trt?FORMES[pt.trt]:[];
    const dates=pt.dates.map((x,j)=>`
      <div class="daterow" data-p="${pt.id}" data-d="${x.id}">
        <label class="field"><span>Date ${j+1} <small class="wd">${esc(weekday(x.d))}</small></span>
          <input class="in${B(x.id+'d')}" type="date" data-k="d" value="${esc(x.d)}" autocomplete="off"></label>
        <label class="field dose"><span>Dose / jour</span>
          <input class="in num${B(x.id+'mg')}" data-k="mg" inputmode="decimal" placeholder="—" value="${esc(x.mg)}" autocomplete="off"><em>mg</em></label>
        <button class="iconbtn" data-act="deldate" ${pt.dates.length<2?'disabled':''} aria-label="Retirer cette date" title="Retirer cette date">${ICON.trash}</button>
        <div class="lettres" aria-live="polite">${parseDose(x.mg)>0?esc(doseLettres(x.mg)):''}</div>
      </div>`).join('');
    return `<div class="card top patient blue" data-p="${pt.id}">
      <h3><span class="n">Patient ${i+1}</span>
        ${F.patients.length>1?`<button class="ghost danger" data-act="delpat">${ICON.trash}Retirer</button>`:''}</h3>
      <div class="grid2">
        <div class="field"><span>Civilité</span>
          <div class="seg${B(pt.id+'civ')}" role="group" aria-label="Civilité">
            <button type="button" data-civ="M." aria-pressed="${pt.civ==='M.'}">M.</button>
            <button type="button" data-civ="Mme" aria-pressed="${pt.civ==='Mme'}">Mme</button></div></div>
        <label class="field"><span>Initiales</span>
          <input class="in${B(pt.id+'ini')}" data-k="ini" value="${esc(pt.ini)}" placeholder="ex. J.D." maxlength="8" autocapitalize="characters" autocomplete="off" spellcheck="false"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>Né(e) le</span>
          <input class="in num${B(pt.id+'ddn')}" data-k="ddn" value="${esc(pt.ddn)}" placeholder="JJ/MM/AAAA" inputmode="numeric" maxlength="10" autocomplete="off"></label>
        <label class="field"><span>N° de dossier <small>(facultatif)</small></span>
          <input class="in" data-k="dossier" value="${esc(pt.dossier)}" placeholder="—" maxlength="20" autocomplete="off" spellcheck="false"></label>
      </div>
      <div class="field"><span>Traitement</span>
        <div class="seg ${pt.trt==='metha'?'metha':''}${B(pt.id+'trt')}" role="group" aria-label="Traitement">
          <button type="button" data-trt="metha" aria-pressed="${pt.trt==='metha'}">Méthadone</button>
          <button type="button" data-trt="bupre" aria-pressed="${pt.trt==='bupre'}">Buprénorphine</button></div></div>
      ${pt.trt?`<label class="field"><span>Forme <small>(facultatif)</small></span>
        <select class="in" data-k="forme"><option value="">Non précisée</option>${formes.map(f=>`<option ${pt.forme===f?'selected':''}>${esc(f)}</option>`).join('')}</select></label>`:''}
      <div class="field"><span>Dates de délivrance</span></div>
      <div class="dates">${dates}</div>
      <div><button class="secondary" data-act="adddate">${ICON.plus}Ajouter une date</button></div>
      <label class="field"><span>Commentaire <small>(facultatif · imprimé sous les doses)</small></span>
        <textarea class="in" data-k="comment" rows="3" maxlength="500" placeholder="ex. dernière prise vue le …, à revoir lundi" autocomplete="off">${esc(pt.comment)}</textarea>
        <small class="hint">Uniquement ce qui est utile au CSAPA de suivi : pas de nom ni d'information superflue.</small></label>
    </div>`;
  }).join('');
  p.innerHTML=`
    <button class="backlink" data-back>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">💊</span>Délivrance exceptionnelle</h2>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface après l'envoi, ou si vous fermez la page.</span></div>
    <div class="card top">
      <h3>Pour qui ?</h3>
      <div class="field"><span>CSAPA de suivi</span>
        <div class="dest-chips${B('csapa')}" role="group" aria-label="CSAPA de suivi">
          ${dests.map(l=>`<button type="button" class="chip" data-dest="${esc(l.id)}" aria-pressed="${l.id===F.csapa}">${esc(l.nom)}</button>`).join('')}
          <button type="button" class="chip other" data-dest="libre" aria-pressed="${F.csapa==='libre'}">Autre…</button>
        </div>
        ${!dests.length&&loaded?'<small class="hint">Liste indisponible : utilisez « Autre ».</small>':''}
        ${bad.has('csapa')?'<small class="warn-text">Choisissez le CSAPA.</small>':''}</div>
      ${F.csapa==='libre'?`
        <label class="field"><span>Nom de la structure</span><input class="in${B('libreNom')}" data-k="libreNom" value="${esc(F.libreNom)}" placeholder="ex. CSAPA …" autocomplete="off"></label>
        <label class="field"><span>Adresse(s) mail</span><input class="in${B('libreMail')}" data-k="libreMail" type="email" multiple value="${esc(F.libreMail)}" placeholder="nom@exemple.fr" autocomplete="off" autocapitalize="off" spellcheck="false"></label>`
      :d?`<div class="addr">${d.adresses.map(esc).join('<br>')||'Aucune adresse'}</div>`:''}
      <label class="field"><span>À l'attention de <small>(facultatif)</small></span>
        <input class="in" data-k="attention" value="${esc(F.attention)}" placeholder="ex. Dr …" autocomplete="off"></label>
      <label class="field"><span>Date du document</span>
        <input class="in${B('date')}" type="date" data-k="date" value="${esc(F.date)}"></label>
      ${medSelectHTML('dv-med')}
    </div>
    ${patients}
    <button class="secondary wide" data-act="addpat">${ICON.plus}Ajouter un patient</button>
    ${errs.length?`<ul class="errors">${errs.map((x,i)=>`<li${keys[i]?` data-errk="${esc(keys[i])}"`:''}>${esc(x)}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot"><button class="primary big" data-act="prepare">${ICON.mail}Préparer l'envoi (${F.patients.length} PDF)</button></div>
    <div class="row end"><button class="ghost danger" data-act="clear">${ICON.trash}Tout effacer</button></div>`;
}
function findP(el){ const c=el.closest('[data-p]'); return c&&F.patients.find(x=>x.id===+c.dataset.p); }
function clearStaleErrors(el){
  if(!showErrors) return;
  showErrors=false; const ul=$('#p-deliv .errors'); ul&&ul.remove();
  el.classList&&el.classList.remove('bad'); const sg=el.closest&&el.closest('.seg'); sg&&sg.classList.remove('bad');
}
$('#p-deliv').addEventListener('input',e=>{
  const el=e.target,k=el.dataset.k; if(!k) return;
  clearStaleErrors(el);
  const row=el.closest('.daterow');
  if(row){ const pt=findP(row),dd=pt.dates.find(x=>x.id===+row.dataset.d);
    if(k==='d'){ const w=row.querySelector('.wd'); if(w) w.textContent=weekday(el.value); }
    if(k==='mg'){ el.value=el.value.replace(/[^\d.,]/g,''); const lt=row.querySelector('.lettres'); if(lt) lt.textContent=parseDose(el.value)>0?doseLettres(el.value):''; }
    dd[k]=el.value; return; }
  const pt=findP(el);
  if(pt){
    if(k==='ini'){ const v=el.value.toUpperCase().replace(/[^A-ZÀ-Ÿ.\- ]/g,''); if(v!==el.value) el.value=v; }
    if(k==='ddn'){ const dg=el.value.replace(/\D/g,'').slice(0,8); let v=dg;
      if(dg.length>4) v=dg.slice(0,2)+'/'+dg.slice(2,4)+'/'+dg.slice(4); else if(dg.length>2) v=dg.slice(0,2)+'/'+dg.slice(2);
      if(v!==el.value) el.value=v; }
    pt[k]=el.value; return;
  }
  F[k]=el.value;
  if(k==='csapa'){ const l=dests.find(x=>x.id===el.value); F.attention=(l&&l.attention)||''; renderDeliv(); }
});
$('#p-deliv').addEventListener('change',e=>{ if(e.target.dataset.k==='forme'){ findP(e.target).forme=e.target.value; } });
$('#p-deliv').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.dest){ F.csapa=b.dataset.dest; const l=dests.find(x=>x.id===F.csapa); F.attention=(l&&l.attention)||''; showErrors=false; renderDeliv(); return; }
  const pt=findP(b);
  if(b.dataset.civ){ pt.civ=b.dataset.civ; renderDeliv(); return; }
  if(b.dataset.trt){ if(pt.trt!==b.dataset.trt){ pt.trt=b.dataset.trt; pt.forme=''; } renderDeliv(); return; }
  const a=b.dataset.act;
  if(a==='adddate'){ pt.dates.push(newDate(pt.dates[pt.dates.length-1])); renderDeliv();
    const rows=document.querySelectorAll(`.daterow[data-p="${pt.id}"]`); const last=rows[rows.length-1]; last&&last.querySelector('[data-k=mg]').focus(); }
  if(a==='deldate'){ const row=b.closest('.daterow'); pt.dates=pt.dates.filter(x=>x.id!==+row.dataset.d); renderDeliv(); }
  if(a==='addpat'){ const np=newPatient(); const prev=F.patients[F.patients.length-1]; np.dates=[{...newDate(),d:prev.dates[0].d}]; F.patients.push(np); renderDeliv();
    const c=document.querySelector(`.patient[data-p="${np.id}"]`); c&&c.scrollIntoView({behavior:smooth(),block:'start'}); }
  if(a==='delpat') askConfirm('Retirer ce patient ?','Ses informations seront effacées.','Retirer',()=>{ F.patients=F.patients.filter(x=>x!==pt); renderDeliv(); });
  if(a==='clear') askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ clearAll(); toast('C’est fait : le formulaire est vidé'); });
  if(a==='prepare') prepare();
});
function revoke(){ urls.forEach(u=>URL.revokeObjectURL(u)); urls=[]; files=[]; }
function clearAll(){ revoke(); F=blank(); showErrors=false; renderDeliv(); window.scrollTo({top:0}); }

/* ---------- PDF ---------- */
/* Tampon de l'association : enregistré dans les réglages (app/parametres.js) */
async function loadTampon(){
  const url=PAR.tampon; if(!url) return null;
  const dim=await new Promise(res=>{ const im=new Image(); im.onload=()=>res([im.naturalWidth,im.naturalHeight]); im.onerror=()=>res(null); im.src=url; });
  if(!dim) return null;
  return {url,fmt:/^data:image\/png/i.test(url)?'PNG':'JPEG',w:dim[0],h:dim[1]};
}
async function loadLogo(){ return window.DOCUBUS_LOGO_ASSO; }
function makePdf(pt,logo,tp){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'mm',format:'a4'});
  const st=structure, D=dest()||{structure:'',adresses:[]}, BL='………………';
  const NAVY=pdfRGB('--navy'),ORANGE=pdfRGB('--accent'),GREY=[93,103,121],INK=[20,32,58];
  doc.setProperties({title:'Attestation de délivrance exceptionnelle',subject:'Délivrance exceptionnelle de TSO',author:st.nom,creator:'Librejo'});
  const {L,R,W,PL}=GEO();
  pdfLogo(doc,PL+2,14,30,28.2,logo);
  doc.setFontSize(8.5); doc.setTextColor(...INK);
  pdfEntete(doc,PL,47,4);
  doc.setTextColor(...GREY); doc.setFont(PF(),'bold'); doc.setFontSize(8);
  doc.text('CONFIDENTIEL – DONNÉES DE SANTÉ',R,16,{align:'right'});
  doc.setTextColor(...NAVY); doc.setFontSize(16);
  doc.text('Attestation de',R,30,{align:'right'}); doc.text('délivrance exceptionnelle',R,37.5,{align:'right'});
  doc.setDrawColor(...ORANGE); doc.setLineWidth(1.2); doc.line(R-62,41.5,R,41.5);
  doc.setFont(PF(),'normal'); doc.setFontSize(9.5); doc.setTextColor(...GREY);
  doc.text('Traitement de substitution aux opiacés',R,47,{align:'right'});
  let y=72;
  doc.setTextColor(...INK); doc.setFontSize(11.5); doc.setFont(PF(),'normal');
  doc.text(`${villeLe(st)}${F.date?frDate(F.date):BL}`,L,y); y+=12;
  doc.setFont(PF(),'bold'); doc.text("À l'attention de :",L,y);
  doc.setFont(PF(),'normal');
  const att=[D.structure,F.attention.trim()].filter(Boolean); if(!att.length) att.push(BL+BL);
  att.forEach((t,i)=>{ doc.text(doc.splitTextToSize(t,W-36),L+36,y+i*6); }); y+=Math.max(1,att.length)*6+8;
  const fem=pt.civ==='Mme';
  const who=`${pt.civ||'M./Mme'} ${pt.ini.trim()||BL}`+(pt.dossier.trim()?` (n° de dossier : ${pt.dossier.trim()})`:'');
  const body=`L'équipe du ${st.nom||'notre structure'} vous informe que ${who}, né${fem?'e':pt.civ?'':'(e)'} le ${pt.ddn.trim()||BL}, a bénéficié à titre exceptionnel, dans notre structure, de la délivrance de son traitement aux dates suivantes :`;
  const lines=doc.splitTextToSize(body,W);
  doc.text(lines,L,y,{lineHeightFactor:1.45}); y+=lines.length*11.5*0.3528*1.45+6;
  const trt=(TRT_NAME[pt.trt]||BL)+(pt.forme?` (${pt.forme.charAt(0).toLowerCase()+pt.forme.slice(1)})`:'');
  const cols=[L,L+46,L+96],hdrH=9,LH=4.6;
  const footTop=297-14-((st.pied||[]).length)*4-8;
  const header=()=>{
    doc.setFillColor(...NAVY); doc.rect(L,y,W,hdrH,'F');
    doc.setTextColor(255,255,255); doc.setFont(PF(),'bold'); doc.setFontSize(10);
    doc.text('Date',cols[0]+3,y+6); doc.text('Traitement',cols[1]+3,y+6); doc.text('Dose du jour',cols[2]+3,y+6);
    doc.setTextColor(...INK); top=y; y+=hdrH;
  };
  const frame=()=>{ doc.setDrawColor(...NAVY); doc.setLineWidth(.3); doc.rect(L,top,W,y-top); };
  let top=y; header();
  const sorted=[...pt.dates].sort((a,b)=>a.d.localeCompare(b.d));
  sorted.forEach((x,i)=>{
    doc.setFontSize(10.5); doc.setFont(PF(),'normal');
    const trtL=doc.splitTextToSize(trt,cols[2]-cols[1]-5);
    doc.setFontSize(9.5); doc.setFont(PF(),'italic');
    const letL=doc.splitTextToSize(parseDose(x.mg)>0&&doseLettres(x.mg)?'('+doseLettres(x.mg)+')':'',R-cols[2]-5);
    const h=Math.max(trtL.length,1+letL.length)*LH+4.4;
    if(y+h>footTop){ frame(); doc.addPage(); y=25; header(); }   // tableau trop long : suite page suivante
    if(i%2===0){ doc.setFillColor(243,245,249); doc.rect(L,y,W,h,'F'); }
    const wd=weekday(x.d);
    doc.setFontSize(10.5); doc.setFont(PF(),'normal');
    doc.text(x.d?`${wd.charAt(0).toUpperCase()+wd.slice(1)} ${frDate(x.d)}`:BL,cols[0]+3,y+5.6);
    doc.text(trtL,cols[1]+3,y+5.6,{lineHeightFactor:1.25});
    doc.setFontSize(11); doc.setFont(PF(),'bold'); doc.text(parseDose(x.mg)>0?`${fmtDose(x.mg)} mg`:`${BL} mg`,cols[2]+3,y+5.6);
    doc.setFontSize(9.5); doc.setFont(PF(),'italic'); doc.text(letL,cols[2]+3,y+5.6+LH,{lineHeightFactor:1.25});
    y+=h;
  });
  doc.setFont(PF(),'normal');
  frame();
  y+=10;
  const room=need=>{ if(y+need>footTop){ doc.addPage(); y=25; } };
  doc.setTextColor(...INK);
  const com=(pt.comment||'').trim();
  if(com){
    doc.setFontSize(11.5); doc.setFont(PF(),'bold');
    room(12); doc.text('Commentaire :',L,y); y+=6;
    doc.setFont(PF(),'normal');
    doc.splitTextToSize(com,W).forEach(line=>{ room(6); doc.text(line,L,y); y+=5.6; });
    y+=6;
  }
  doc.setFontSize(11.5); doc.setFont(PF(),'normal');
  let tw=0,th=0; if(tp){ tw=40; th=tw*tp.h/tp.w; if(th>32){ th=32; tw=th*tp.w/tp.h; } }
  room(44+(tp?th+4:0));
  doc.text("N'hésitez pas à nous contacter pour toute information complémentaire.",L,y); y+=16;
  doc.setFont(PF(),'bold'); doc.setTextColor(...NAVY);
  const md=medChoice();
  if(md){ doc.text(md.nom,R,y,{align:'right'}); y+=5; doc.text('N° RPPS : '+md.rpps,R,y,{align:'right'});
    doc.setFont(PF(),'normal'); doc.setFontSize(9); doc.setTextColor(...GREY);
    String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n').filter(Boolean).forEach(t=>{ y+=4.5; doc.text(t,R,y,{align:'right'}); });
    doc.setFontSize(11.5); doc.setTextColor(...INK); }
  else doc.text(st.signataire,R,y,{align:'right'});
  if(tp){ try{ doc.addImage(tp.url,tp.fmt,R-tw,y+3,tw,th); }catch(e){ console.error(e); } }
  const pied=st.pied||[]; const fy=297-12-(pied.length-1)*4;
  for(let pg=1;pg<=doc.getNumberOfPages();pg++){ doc.setPage(pg);
  pdfMarge(doc,pg,fy); pdfFilet(doc,PL,R,fy,ORANGE);
  doc.setFontSize(8); doc.setTextColor(...GREY);
  pdfPied(doc,pied,fy,PL);
  }
  return doc.output('blob');
}

/* ======================================================================
   DONNÉES
   ====================================================================== */
const DEFAULT_STRUCT={nom:'',signataire:'',ville:'',entete:[],pied:[]};
const villeLe=st=>st&&String(st.ville||'').trim()?String(st.ville).trim()+', le ':'Le '; // « Marseille, le 26/11/2026 », ou « Le 26/11/2026 » sans ville
const DATA=window.DOCUBUS_DONNEES||{categories:[],documents:[],formulaires:[]};
DATA.categories=DATA.categories||[]; DATA.documents=DATA.documents||[]; DATA.formulaires=DATA.formulaires||[];
let PAR=window.DOCUBUS_PARAMETRES||{};
/* Mode « formulaires seulement » : pas de dossier (navigateur sans accès aux dossiers, accès refusé,
   dossier introuvable). L'en-tête (nom et adresse de la structure) est saisi sur ce poste et gardé
   dans ce navigateur : c'est un réglage de la structure, jamais une donnée de personne. */
const SANS=window.LJ_SANS_DOSSIER||null, SD_ENT='librejo-entete-poste';
function sdEnt(){ try{ return JSON.parse(localStorage.getItem(SD_ENT)||'null')||{}; }catch(e){ return {}; } }
function sdAtt(E){ const v=k=>String(E[k]||'').trim(), n=v('nom'), a=v('adresse'), cp=v('cp'), vi=v('ville');
  return {nom:n,signataire:n,ville:vi,entete:[n,a,[cp,vi.toUpperCase()].filter(Boolean).join(' ')].filter(Boolean),
    pied:[n,[a,[cp,vi].filter(Boolean).join(' ')].filter(Boolean).join(' – '),[v('tel')&&'Tél. : '+v('tel'),v('mail')].filter(Boolean).join(' – ')].filter(Boolean)}; }
if(SANS) PAR={...PAR,attestation:sdAtt(sdEnt())};
/* Démo en ligne (appli/?demo, voir boot.js) : le dossier est la structure fictive copiée dans le stockage privé
   du navigateur ; les préférences du poste sont rangées à part. La vraie installation n'est jamais lue ni écrite. */
const DEMO=window.LJ_DEMO&&window.LJ_DEMO.dir?window.LJ_DEMO:null;
let structure, dests, envoi, webmail;
/* Destinataire relié à une fiche de l'annuaire : ses adresses viennent de la fiche (sauf celles décochées).
   Si la fiche a disparu ou n'a plus d'adresse, on garde les adresses enregistrées dans les réglages. */
const annuPart=id=>id?(((window.DOCUBUS_ANNUAIRE||{}).partenaires)||[]).find(x=>x.id===id):null;
const destMails=d=>{ const p=annuPart(d.partenaire); if(!p) return null; const ex=new Set(d.exclues||[]); return (p.emails||[]).filter(m=>!ex.has(m)); };
function mkDests(){ return (PAR.destinataires||[]).map((d,i)=>{ const em=destMails(d); return {...d,id:'d'+i,adresses:em&&em.length?em:(d.adresses||[])}; }); }
function applyParams(){
  structure={...DEFAULT_STRUCT,...(PAR.attestation||{})};
  dests=mkDests();
  envoi=(PAR.envoi&&PAR.envoi.length)?PAR.envoi:[];
  webmail=PAR.webmail||'https://outlook.office.com/mail/deeplink/compose';
}
applyParams();

/* ---------- Apparence choisie par l'admin : couleurs du menu et des boutons, logo de la structure ---------- */
const THEME_DEF={menu:'#174f4c',accent:'#E9A23B',logo:null,menuLogo:'librejo',nom:true,menuStyle:'fonce'};
const THEME_MENUS=[['#174f4c','Canard'],['#0d2a5e','Marine'],['#1f5130','Forêt'],['#5a2a52','Prune'],['#2f3a4a','Ardoise'],['#7a2e1f','Brique']];
const THEME_ACCENTS=[['#E9A23B','Ambre'],['#ee8a12','Orange'],['#e8735a','Corail'],['#f2c230','Soleil'],['#3fbf9b','Menthe'],['#e57fa6','Rose']];
function hexRgb(x){ x=String(x||'').replace('#',''); if(x.length===3) x=x.split('').map(c=>c+c).join(''); const n=parseInt(x,16); return x.length!==6||isNaN(n)?null:[n>>16&255,n>>8&255,n&255]; }
function rgbHex(r){ return '#'+r.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join(''); }
function relLum(r){ const c=r.map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*c[0]+.7152*c[1]+.0722*c[2]; }
function ratio(a,b){ const x=relLum(a), y=relLum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
function mixRgb(a,b,t){ return a.map((v,i)=>v+(b[i]-v)*t); }
function reach(c,bg,target,toward){ let r=c, i=0; while(ratio(r,bg)<target&&i<60){ r=mixRgb(r,toward,.06); i++; } return r; }
function themeVars(t){
  const W=[255,255,255], K=[0,0,0];
  const m0=hexRgb(t.menu)||hexRgb(THEME_DEF.menu), a=hexRgb(t.accent)||hexRgb(THEME_DEF.accent);
  const CREAM=[251,246,236], BG=[247,244,236], mbg=mixRgb(m0,CREAM,.84);
  /* Les jetons de texte tirés du thème sont lisibles sur tous les fonds clairs où ils sont posés, pas seulement
     sur le blanc : papier, crème, papier 2 (survols), les quatre fonds de saison de l'accueil et le menu clair. */
  const SURF=[W,BG,[240,236,226],[230,238,249],[234,245,230],[253,243,220],[248,233,220],mbg];
  const onAll=(c,t)=>SURF.reduce((x,bg)=>reach(x,bg,t,K),c);
  const m=onAll(reach(m0,W,7,K),4.6);   // le texte blanc du menu doit rester très lisible ; sert aussi de titre sur les fonds clairs
  /* menu sombre : texte et intitulés tirés de la couleur du menu, éclaircis jusqu'à rester lisibles
     sur le fond du menu et sur son survol (voile blanc de 7 %) */
  const hov=mixRgb(m,W,.07);
  return {vars:{'--menu-bg':rgbHex(mbg),'--menu-ink':rgbHex(reach(m0,mbg,7,K)),'--navy':rgbHex(t.menuStyle==='clair'?onAll(reach(m0,W,7,K),4.6):m),'--blue':rgbHex(onAll(m0,4.6)),'--accent':rgbHex(a),
    '--accent-ink':ratio(a,K)>=ratio(a,W)?'#1d1405':'#ffffff','--accent-soft':rgbHex(mixRgb(a,W,.86)),
    // texte ambré : lisible sur blanc, sur le fond ambré pâle des badges et sur le fond du menu clair
    '--accent-text':rgbHex([...SURF,mixRgb(a,W,.86),mixRgb(mbg,W,.5)].reduce((c,bg)=>reach(c,bg,4.6,K),a)),'--accent-on-dark':rgbHex(reach(a,m,4.6,W)),
    // ambre des repères non textuels (choix, bordures d'état, barres) : au moins 3:1 sur la crème et le blanc (WCAG 1.4.11)
    '--accent-line':rgbHex(reach(a,BG,3,K)),
    '--text-on-dark':rgbHex(reach(mixRgb(m,W,.82),hov,4.6,W)),'--text-on-dark-2':rgbHex(reach(mixRgb(m,W,.62),hov,4.6,W)),
    // menu clair : intitulés et compteurs, lisibles sur le fond du menu
    '--menu-muted':rgbHex(reach([91,107,106],mbg,4.6,K))},
    menuAdjusted:t.menuStyle!=='clair'&&ratio(m0,W)<7};
}
function ownLogo(t){ return t.logo||window.DOCUBUS_LOGO_ASSO||null; }
function applyTheme(t0){
  const t={...THEME_DEF,...(t0||{})}, th=themeVars(t), st=document.documentElement.style;
  Object.entries(th.vars).forEach(([k,v])=>st.setProperty(k,v));
  const clair=t.menuStyle==='clair'; document.documentElement.classList.toggle('menu-clair',clair);
  const meta=document.querySelector('meta[name=theme-color]'); if(meta) meta.content=t.menuStyle==='clair'?th.vars['--menu-bg']:th.vars['--navy'];
  const b=document.querySelector('.lj-brand'), own=ownLogo(t);
  if(b){ const lj=small=>`<img class="lj-lib${small?' small':''}" src="${clair?'logo.svg':'logo-blanc.svg'}" alt="Librejo">`,
      ow=own?`<span class="lj-own"><img src="${own}" alt="${esc(structure.nom||'Logo de la structure')}"></span>`:'';
    b.innerHTML=t.menuLogo==='structure'&&ow?ow:t.menuLogo==='both'&&ow?ow+lj(true):lj(false); }
  const n=document.getElementById('lj-name'); if(n){ const show=!!(t.nom&&structure.nom); n.textContent=show?structure.nom:''; n.hidden=!show; }
  return th;
}
applyTheme(PAR.apparence);
/* Papier à en-tête : réglé par l'admin (Réglages > Papier à en-tête), commun à tous les PDF.
   Police, couleurs, taille du texte d'en-tête et de bas de page, marge à gauche (services,
   numéros utiles…), mise en forme simple des lignes : « # Titre », « **gras** », « _italique_ », « --- ». */
const MISE_DEF={logo:'moyen',entete:'centre',pied:'centre',filet:true,police:'moderne',taille:'normal',corps:'normal',c1:'',c2:'',
  marge:'non',margeTexte:[],margePages:'premiere',margeTrait:true,margeFond:false};
const MISE=()=>({...MISE_DEF,...(PAR.mise||{})});
const PDF_POLICES=[['moderne','Helvetica','Sans empattement, sobre'],['classique','Times','Classique, à empattement'],['atkinson','Atkinson Hyperlegible','Très lisible (malvoyance)'],['lato','Lato','Moderne, douce'],
  ['nunito','Nunito','Arrondie, chaleureuse'],['sourceserif','Source Serif','Classique moderne'],['baskerville','Libre Baskerville','Élégante'],['perso','Votre police','Fichier .ttf de votre charte']];
const LJ_FONT_OK=new Set(), LJ_FONT_LOAD={}, LJ_FONT_EVT=new Set();
function registerPdfFont(k){
  if(LJ_FONT_EVT.has(k)){ LJ_FONT_OK.add(k); return; } LJ_FONT_EVT.add(k);
  window.jspdf.jsPDF.API.events.push(['addFonts',function(){ const F=(window.LJ_PDF_FONTS||{})[k]; if(!F||!F.normal) return; const fam='lj-'+k;
    ['normal','bold','italic','bolditalic'].forEach(s=>{ const b=F[s]||(s==='bolditalic'?(F.bold||F.normal):F.normal); const n=`${fam}-${s}.ttf`; try{ this.addFileToVFS(n,b); this.addFont(n,fam,s); }catch(e){} }); }]);
  LJ_FONT_OK.add(k);
}
function loadPdfFont(k){
  if(!k||k==='moderne'||k==='classique') return Promise.resolve();
  if(!window.jspdf) return LJ_PDF_P?LJ_PDF_P.then(()=>loadPdfFont(k)):Promise.resolve();   // pdfReady() la chargera
  if(LJ_FONT_OK.has(k)&&(window.LJ_PDF_FONTS||{})[k]) return Promise.resolve();
  if(!LJ_FONT_LOAD[k]) LJ_FONT_LOAD[k]=(async()=>{
    if(k==='perso'){ const f=await readRel('app/polices-pdf/perso.json'); (window.LJ_PDF_FONTS=window.LJ_PDF_FONTS||{}).perso=JSON.parse(await f.text()); }
    else await loadScript('app/polices-pdf/'+k+'.js');
    registerPdfFont(k);
  })().catch(e=>{ delete LJ_FONT_LOAD[k]; throw e; });
  return LJ_FONT_LOAD[k];
}
const PF=()=>{ const p=MISE().police; if(p==='classique') return 'times'; if(!p||p==='moderne') return 'helvetica'; return LJ_FONT_OK.has(p)&&(window.LJ_PDF_FONTS||{})[p]?'lj-'+p:'helvetica'; };
const TS=()=>({petit:.88,normal:1,grand:1.15}[MISE().taille]||1);
/* Taille du texte des documents : chaque PDF créé applique le coefficient à toutes ses tailles de police.
   Les retours à la ligne suivent (ils dépendent de la taille réelle) ; les interlignes fixes laissent assez de marge pour ±8 %. */
const BS=()=>({petit:.93,normal:1,grand:1.08}[MISE().corps]||1);
function ljHookBS(){ if(!window.jspdf||window.__ljBS) return; window.__ljBS=true; window.jspdf.jsPDF.API.events.push(['initialized',function(){ const k=BS(); if(k===1) return;
  const set=this.setFontSize, get=this.getFontSize; let cur=get.call(this)/k;
  this.setFontSize=function(v){ cur=v; return set.call(this,v*k); }; this.getFontSize=function(){ return cur; }; this.setFontSize(cur); }]); }
/* ---------- Caractères des PDF ----------
   Helvetica et Times (polices standard du PDF) n'écrivent que le jeu WinAnsi (français, Europe de l'Ouest),
   et les polices embarquées sont réduites au latin courant : « NGUYỄN Thị Şahin » sortait « NGUYÄN ThË ^ahin ».
   Chaque texte d'un PDF (text, splitTextToSize, largeur) est vérifié : s'il contient un caractère que la police
   choisie ne sait pas dessiner, ce texte passe sur une police de repli (app/polices-pdf) :
   - repli.js : latin étendu, vietnamien, grec, cyrillique, symboles (chargée au démarrage) ;
   - georgien.js : géorgien + latin ; arabe.js : arabe (persan et ourdou de base) + latin. Ces deux-là ne sont
     chargées que si un texte en a besoin (saisie, réglages, ou au plus tard à la production du PDF).
   L'arabe est mis en forme ici (lettres liées : formes isolée, initiale, médiane, finale, lam-alif), puis remis
   dans l'ordre d'affichage par l'algorithme bidirectionnel Unicode (app/lib/bidi.min.js) : chaque morceau garde
   son sens, les chiffres restent de gauche à droite. Un paragraphe arabe coupé en lignes est aligné à droite.
   Ce qu'aucune police ne sait dessiner (emoji, chinois, hébreu…) est noté : deliver() refuse alors le document
   et dit quel caractère retirer, dans quel champ. */
const LJ_WINANSI=new Set([...Array(95)].map((_,i)=>32+i).concat([...Array(96)].map((_,i)=>160+i),
  [0x20AC,0x201A,0x192,0x201E,0x2026,0x2020,0x2021,0x2C6,0x2030,0x160,0x2039,0x152,0x17D,0x2018,0x2019,0x201C,0x201D,0x2022,0x2013,0x2014,0x2DC,0x2122,0x161,0x203A,0x153,0x17E,0x178]));
const LJ_AR=/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/, LJ_KA=/[\u10A0-\u10FF\u1C90-\u1CBF\u2D00-\u2D2F]/;
const LJ_INVISIBLE=/[\u00AD\u200B\u2060\uFE00-\uFE0F\uFEFF]/g, LJ_JOIN=/[\u200C-\u200F]/g, LJ_BIDI_CTRL=/[\u200C-\u200F\u202A-\u202E\u2066-\u2069]/g;   // ZWNJ, ZWJ, LRM, RLM : utiles à l'arabe, retirés ailleurs
const ljPdfStr=s=>{ s=String(s??'').normalize('NFC').replace(LJ_INVISIBLE,''); return LJ_AR.test(s)?s:s.replace(LJ_JOIN,''); };
const LJ_REPLIS={repli:{f:'app/polices-pdf/repli.js'},georgien:{f:'app/polices-pdf/georgien.js',re:LJ_KA},arabe:{f:'app/polices-pdf/arabe.js',re:LJ_AR,lib:'app/lib/bidi.min.js'}};
let LJ_REPLI=null, LJ_ARABE=null, LJ_BIDI=null;
function loadPdfRepli(k='repli'){ const R=LJ_REPLIS[k];
  if(!R.load) R.load=Promise.all([(window.LJ_PDF_FONTS||{})[k]?0:loadScript(R.f),R.lib&&!window.bidi_js?loadScript(R.lib):0])
    .then(()=>{ const F=window.LJ_PDF_FONTS[k], s=new Set(); (F.couvre||[]).forEach(([a,b])=>{ for(let c=a;c<=b;c++) s.add(c); }); R.set=s;
      if(k==='repli') LJ_REPLI=s;
      if(k==='arabe'){ LJ_BIDI=window.bidi_js(); LJ_ARABE={formes:new Map(Object.entries(F.formes).map(([c,f])=>[+c,f])),lamalef:new Map(Object.entries(F.lamalef).map(([c,f])=>[+c,f]))}; }
      if(k!=='repli') liveSoon(0); })   // l'aperçu en direct se redessine avec la bonne police
    .catch(e=>{ R.load=null; throw e; });
  return R.load; }
/* Écritures repérées dans un texte (saisie, réglages) : leur police est chargée d'avance */
function ljWantScripts(s){ if(!s) return; for(const k of ['arabe','georgien']){ const R=LJ_REPLIS[k]; if(!R.set&&R.re.test(s)) loadPdfRepli(k).catch(()=>{}); } }
document.addEventListener('input',e=>{ const v=e.target&&e.target.value; if(typeof v==='string') ljWantScripts(v); },true);
try{ ljWantScripts(JSON.stringify([window.DOCUBUS_PARAMETRES,window.DOCUBUS_DONNEES,window.DOCUBUS_ANNUAIRE])); }catch(e){}
/* À l'écran aussi : chaque champ texte prend le sens de ce qu'on y écrit (arabe à droite, français à gauche) */
const LJ_DIR_SEL='input:not([dir]):not([type]),input[type=text]:not([dir]),input[type=search]:not([dir]),textarea:not([dir])';
const ljDirAuto=n=>{ if(n.nodeType!==1) return; if(n.matches(LJ_DIR_SEL)) n.setAttribute('dir','auto'); n.querySelectorAll(LJ_DIR_SEL).forEach(el=>el.setAttribute('dir','auto')); };
ljDirAuto(document.body); new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(ljDirAuto))).observe(document.body,{childList:true,subtree:true});
/* Un caractère est-il imprimable par au moins une police de Librejo ? */
const ljPrintable=cp=>cp<32||LJ_WINANSI.has(cp)||Object.values(LJ_REPLIS).some(R=>R.set&&R.set.has(cp));
function ljFontHas(f,cp){
  if(cp<32) return true;
  if(f&&f.encoding==='Identity-H'){ const u=f.metadata&&f.metadata.cmap&&f.metadata.cmap.unicode; return !!(u&&u.codeMap[cp]); }
  return LJ_WINANSI.has(cp);
}
/* Arabe : lettres liées. Le texte reste dans l'ordre logique ; chaque lettre prend sa forme de présentation
   selon ses voisines (les signes diacritiques sont transparents, le tatweel et le ZWJ lient, le ZWNJ coupe). */
const ljArMark=c=>(c>=0x610&&c<=0x61A)||(c>=0x64B&&c<=0x65F)||c===0x670||(c>=0x6D6&&c<=0x6DC)||(c>=0x6DF&&c<=0x6E4)||c===0x6E7||c===0x6E8||(c>=0x6EA&&c<=0x6ED);
function ljShape(s){
  if(!LJ_ARABE||!LJ_AR.test(s)) return s;
  const F=LJ_ARABE.formes, LA=LJ_ARABE.lamalef, cs=[...s].map(ch=>ch.codePointAt(0)), n=cs.length;
  const jt=c=>ljArMark(c)?'T':(c===0x640||c===0x200D)?'C':F.has(c)?(F.get(c)[2]?'D':F.get(c)[1]?'R':'U'):'U';
  const near=(i,d)=>{ for(let j=i+d;j>=0&&j<n;j+=d){ const t=jt(cs[j]); if(t!=='T') return [t,j]; } return ['U',-1]; };
  let o='';
  for(let i=0;i<n;i++){ const c=cs[i], f=F.get(c); if(!f){ o+=String.fromCodePoint(c); continue; }
    const p=near(i,-1)[0], jp=p==='D'||p==='C', [nt,nj]=near(i,1);
    if(c===0x644&&nj>=0&&LA.has(cs[nj])){ o+=String.fromCharCode(LA.get(cs[nj])[jp?1:0]); for(let j=i+1;j<nj;j++) o+=String.fromCodePoint(cs[j]); i=nj; continue; }
    const jn=jt(c)==='D'&&(nt==='D'||nt==='R'||nt==='C'), k=jp&&jn?3:jp?1:jn?2:0;
    o+=String.fromCharCode(f[k]||f[jp?1:0]||f[0]); }
  return o;
}
/* Ordre d'affichage d'une ligne (algorithme bidirectionnel Unicode) ; lvl : sens du paragraphe (0 gauche à droite,
   1 droite à gauche), sinon déduit de la première lettre. Les parenthèses des passages arabes sont retournées. */
function ljVisual(s,lvl){
  s=ljShape(s); if(!LJ_BIDI) return s.replace(LJ_BIDI_CTRL,'');
  /* un numéro en plusieurs groupes (04 91 00 00 00) reste d'un seul tenant, de gauche à droite, même dans une phrase
     arabe : ses espaces deviennent insécables (séparateurs de nombre pour l'algorithme), et dans un paragraphe arabe
     il est isolé en entier (indicatif « +33 » compris) */
  const rp=lvl==null?ljParaLevel(s):lvl;
  s=s.replace(/\+?\d+(?:[ \u00A0.\-]\d+)+/g,m=>{ m=m.replace(/ (?=\d)/g,'\u00A0'); return rp?'\u2066'+m+'\u2069':m; });
  const emb=LJ_BIDI.getEmbeddingLevels(s,lvl==null?undefined:lvl?'rtl':'ltr'), ch=s.split('');
  LJ_BIDI.getMirroredCharactersMap(s,emb.levels).forEach((c,i)=>{ ch[i]=c; });
  LJ_BIDI.getReorderSegments(s,emb).forEach(([a,b])=>{ const r=ch.slice(a,b+1).reverse(); for(let i=a;i<=b;i++) ch[i]=r[i-a]; });
  for(let i=0;i+1<ch.length;i++) if(/[\uDC00-\uDFFF]/.test(ch[i])&&/[\uD800-\uDBFF]/.test(ch[i+1])){ const t=ch[i]; ch[i]=ch[i+1]; ch[i+1]=t; i++; }
  return ch.join('').replace(LJ_BIDI_CTRL,'');
}
const ljParaLevel=p=>{ try{ return LJ_BIDI.getEmbeddingLevels(p).paragraphs[0].level&1; }catch(e){ return 0; } };
/* Caractères qu'aucune police n'a su dessiner pendant la dernière production de PDF */
const LJ_PDF_MISS=new Set(); let LJ_PDF_T0=0;
function ljHookTxt(){ if(!window.jspdf||window.__ljTxt) return; window.__ljTxt=true;
  /* jsPDF met en forme l'arabe et réordonne chaque texte lui-même, mais sa mise en forme refait des ligatures
     lam-alif sur un texte déjà réordonné (« سالم » deviendrait « سلام ») : Librejo s'en charge ci-dessus. */
  const API=window.jspdf.jsPDF.API, E=API.events;
  for(let i=E.length-1;i>=0;i--){ const [n,f]=E[i]; if((n==='preProcessText'&&f===API.processArabic)||(n==='postProcessText'&&/doBidiReorder/.test(String(f)))) E.splice(i,1); }
  API.processArabic=null;
  window.jspdf.jsPDF.API.events.push(['initialized',function(){
  const doc=this, now=Date.now(); if(now-LJ_PDF_T0>800) LJ_PDF_MISS.clear(); LJ_PDF_T0=now;
  const T=doc.text, S=doc.splitTextToSize, W=doc.getStringUnitWidth, force=new Set(), rtl=new Map();
  const prep=txt=>{ const f=doc.internal.getFont(); let need=false;
    const one=s=>{ s=ljPdfStr(s); if(force.has(s)) need=true; let o='';
      for(const ch of s){ const cp=ch.codePointAt(0);
        if(ljFontHas(f,cp)) o+=ch;
        else if(/\s/.test(ch)) o+=ljFontHas(f,0xA0)?' ':' ';   // espace fine, cadratin… : espace insécable
        else { need=true; o+=ch; } }
      return o; };
    return {t:Array.isArray(txt)?txt.map(one):one(txt),need}; };
  const added=new Set();
  const repli=t=>{ const all=[].concat(t).join('\n'), cur=doc.internal.getFont(), size=doc.getFontSize();
    let k=LJ_AR.test(all)?'arabe':LJ_KA.test(all)?'georgien':'repli';
    if(!(window.LJ_PDF_FONTS||{})[k]){ ljWantScripts(all); k='repli'; }
    const F=(window.LJ_PDF_FONTS||{})[k], fam='lj-'+k;
    if(F){ const s0=String(cur.fontStyle||'normal').toLowerCase(), b=/bold/.test(s0), i=/italic|oblique/.test(s0), st=b&&i?'bolditalic':b?'bold':i?'italic':'normal';
      if(!added.has(fam+st)){ added.add(fam+st); const n=`${fam}-${st}.ttf`;   // seuls les styles utilisés vont dans le PDF
        try{ doc.addFileToVFS(n,F[st]||(st==='bolditalic'?F.bold:F.normal)); doc.addFont(n,fam,st); }catch(e){} }
      doc.setFont(fam,st);
      /* même hauteur d'x que la police remplacée, pour que le texte ne paraisse pas plus petit */
      const z={helvetica:1.08,times:.96}[String(cur.fontName).toLowerCase()]||1; if(z!==1) doc.setFontSize(size*z); }
    const f=doc.internal.getFont(); [].concat(t).forEach(s=>{ for(const ch of String(s)) if(!/[\s\u200C-\u200F]/.test(ch)&&!ljFontHas(f,ch.codePointAt(0))) LJ_PDF_MISS.add(ch); });
    return {cur,size}; };
  const around=(txt,fn,keep)=>{ const p=prep(txt); if(!p.need) return fn(p.t);
    const {cur,size}=repli(p.t); try{ const r=fn(p.t); if(keep&&Array.isArray(r)) r.forEach(l=>force.add(l)); return r; }
    finally{ doc.setFont(cur.fontName,cur.fontStyle); if(doc.getFontSize()!==size) doc.setFontSize(size); } };
  const arabic=t=>!!LJ_ARABE&&[].concat(t).some(s=>LJ_AR.test(s));
  /* Le PDF garde, pour le copier-coller et la lecture d'écran, la lettre de base plutôt que sa forme liée */
  const toUni=v=>{ const f=doc.internal.getFont(), m=f.metadata; if(!m||!m.toUnicode||!m.characterToGlyph) return;
    for(const ch of v){ const c=ch.charCodeAt(0); if((c>=0xFB50&&c<=0xFDFF)||(c>=0xFE70&&c<=0xFEFC)){ const b=ch.normalize('NFKC'); if(b.length===1) m.toUnicode[m.characterToGlyph(c)]=b.charCodeAt(0); } } };
  doc.text=function(txt,...a){
    if(!(typeof txt==='string'||Array.isArray(txt))) return T.call(doc,txt,...a);
    return around(txt,t=>{ if(!arabic(t)) return T.call(doc,t,...a);
      const ls=[].concat(t).flatMap(s=>String(s).split(/\r?\n/)), info=ls.map(l=>rtl.get(l));
      const v=ls.map((l,i)=>ljVisual(l,info[i]?info[i].lvl:null));
      let [x,y,o,...rest]=a; o=Object.assign({},o||{});
      /* paragraphe arabe coupé en lignes : aligné à droite, sur la largeur demandée */
      if((!o.align||o.align==='left')&&info.every(z=>z&&z.lvl===1)&&typeof x==='number'){ o.align='right'; x+=Math.max(...info.map(z=>z.w)); }
      const r=T.call(doc,v.length>1?v:v[0],x,y,o,...rest); v.forEach(toUni); return r; }); };
  /* les lignes coupées sur une police de repli seront écrites avec elle (sinon elles déborderaient) ;
     un texte arabe est coupé d'après la largeur de ses lettres liées, dans l'ordre logique */
  doc.splitTextToSize=function(txt,...a){ const o=a[1]||{}; if(o.fontName||o.widths) return S.call(doc,txt,...a);
    return around(txt,t=>{ if(!arabic(t)) return S.call(doc,t,...a);
      const w=a[0], fs=doc.internal.getFontSize(), sf=doc.internal.scaleFactor, ww=s=>W.call(doc,ljShape(s))*fs/sf, out=[];
      [].concat(t).forEach(par=>String(par).split(/\r?\n/).forEach(p=>{ const lvl=ljParaLevel(p); let line=null;
        const push=l=>{ out.push(l); rtl.set(l,{lvl,w}); };
        p.split(' ').forEach(wd=>{ if(line===null){ line=wd; return; } const c=line+' '+wd; if(ww(c)>w){ push(line); line=wd; } else line=c; });
        push(line||''); }));
      return out; },true); };
  doc.getStringUnitWidth=function(txt,o){ return (o&&o.font)?W.call(doc,txt,o):around(txt,t=>W.call(doc,ljShape(t),o)); };
}]); }
/* Géométrie : PL = bord gauche de la page (logo, en-tête, bas de page) ; L = début du texte (décalé si marge à gauche) */
const MARGE_W={etroite:38,large:52};
function GEO(){ const mw=MARGE_W[MISE().marge]||0; const L=20+(mw?mw+8:0); return {PL:20,L,R:190,W:190-L}; }
let LG={x:22,y:14,w:30,h:28.2,dy:0}, ENT_BOTTOM=60;
function pdfLogo(doc,x,y,w,h,img){
  const k={petit:.75,moyen:1,grand:1.2}[MISE().logo]||1, src=img||window.DOCUBUS_LOGO_ASSO;
  LG={x,y,w:w*k,h:h*k,dy:h*(k-1)}; ENT_BOTTOM=y+h*k+4;
  if(src&&MISE().logo!=='aucun'){ try{ doc.addImage(src,'JPEG',x,y,w*k,h*k); }catch(e){} }
}
/* Une ligne mise en forme : « # Titre », « **gras** », « _italique_ », « --- » (trait) ; sinon le style par défaut */
function lineStyle(t,def){ t=String(t??'');
  if(/^\s*-{3,}\s*$/.test(t)) return {rule:true};
  if(/^#\s+/.test(t)) return {txt:t.replace(/^#\s+/,''),style:'bold',title:true};
  let m=t.match(/^\*\*(.+)\*\*$/); if(m) return {txt:m[1],style:'bold'};
  m=t.match(/^_(.+)_$/); if(m) return {txt:m[1],style:'italic'};
  return {txt:t,style:def}; }
function pdfEntete(doc,L,y0,step){
  const m=MISE(), lines=structure.entete||[], cx=LG.x+LG.w/2, k=TS(), base=doc.getFontSize()*k, col=doc.getTextColor(); let y=y0+LG.dy;
  lines.forEach((t,i)=>{ const s=lineStyle(t,i===0?'bolditalic':'bold');
    if(s.rule){ doc.setDrawColor(...pdfRGB('--accent')); doc.setLineWidth(.3); doc.line(m.entete==='gauche'?L:cx-14,y-2.4,m.entete==='gauche'?L+28:cx+14,y-2.4); y+=step*k*.6; return; }
    if(!s.txt.trim()){ y+=step*k*.6; return; }
    doc.setFont(PF(),s.style); doc.setFontSize(s.title?base*1.18:base); if(s.title) doc.setTextColor(...pdfRGB('--navy'));
    if(m.entete==='gauche') doc.text(s.txt,L,y); else doc.text(s.txt,cx,y,{align:'center'});
    doc.setTextColor(col); y+=step*k*(s.title?1.15:1); });
  doc.setFontSize(base/k); ENT_BOTTOM=Math.max(ENT_BOTTOM,y);
}
function pdfFilet(doc,L,R,fy,col){ const m=MISE(); if(!m.filet) return; doc.setDrawColor(...col); doc.setLineWidth(.6); if(m.pied==='gauche') doc.line(L,fy-6,L+70,fy-6); else doc.line(L+40,fy-6,R-40,fy-6); }
function pdfPied(doc,pied,fy,L){ const m=MISE(), k=TS(), base=doc.getFontSize()*k, col=doc.getTextColor(); let y=fy;
  pied.forEach((t,i)=>{ const s=lineStyle(t,i===0?'bold':'normal'); if(s.rule||!s.txt.trim()){ y+=4*k*.5; return; }
    doc.setFont(PF(),s.style); doc.setFontSize(s.title?base*1.1:base); if(s.title) doc.setTextColor(...pdfRGB('--navy'));
    if(m.pied==='gauche') doc.text(s.txt,L||20,y); else doc.text(s.txt,105,y,{align:'center'});
    doc.setTextColor(col); y+=4*k; });
  doc.setFontSize(base/k);
}
/* Marge à gauche : services, numéros utiles, membres du bureau… sur la 1re page ou sur toutes */
function pdfMarge(doc,pg,fy){
  const m=MISE(), w=MARGE_W[m.marge]; if(!w) return; if(m.margePages==='premiere'&&pg>1) return;
  const x=20, top=pg===1?Math.max(ENT_BOTTOM+6,58):22, bot=fy-12, c2=pdfRGB('--accent'), c1=pdfRGB('--navy'), k=TS();
  if(m.margeFond){ const s=c2.map(v=>Math.round(v+(255-v)*.88)); doc.setFillColor(...s); doc.rect(x-3,top-5,w+3,bot-top+5,'F'); }
  if(m.margeTrait){ doc.setDrawColor(...c2); doc.setLineWidth(.5); doc.line(x+w+3,top-4,x+w+3,bot); }
  let y=top; const fs=7.6*k;
  (m.margeTexte||[]).forEach(t=>{ if(y>bot) return; const s=lineStyle(t,'normal');
    if(s.rule){ doc.setDrawColor(...c2); doc.setLineWidth(.3); doc.line(x,y-1.5,x+w-2,y-1.5); y+=2.6*k; return; }
    if(!s.txt.trim()){ y+=2.4*k; return; }
    doc.setFont(PF(),s.style); doc.setFontSize(s.title?fs*1.12:fs); doc.setTextColor(...(s.title?c1:[60,66,80]));
    doc.splitTextToSize(s.txt,w-1).forEach(l=>{ if(y>bot) return; doc.text(l,x,y); y+=3.4*k*(s.title?1.1:1); }); if(s.title) y+=.6; });
  doc.setTextColor(93,103,121);
}
/* ---------- Bibliothèques PDF : chargées à la première demande ----------
   jsPDF (créer un PDF), pdf-lib (assembler, tamponner, remplir un Cerfa) et JSZip (Word, sauvegardes) pèsent
   ~1 Mo : elles ne sont plus chargées au choix du dossier, mais à la première ouverture d'un formulaire, de
   l'administration, ou d'une fonction qui en a besoin. Une seule promesse par bibliothèque : jamais deux
   chargements. Elles restent dans le cache du service worker : Librejo marche aussi hors ligne.
   pdfReady() = jsPDF + ses réglages Librejo (taille du texte, caractères) + la police de repli et la police
   choisie : ce dont pdfCharsOk() a besoin pour savoir quels caractères s'impriment. */
const LJ_LIB={jspdf:['app/lib/jspdf.umd.min.js',()=>window.jspdf],pdflib:['app/lib/pdf-lib.min.js',()=>window.PDFLib],jszip:['app/lib/jszip.min.js',()=>window.JSZip]}, LJ_LIB_P={};
function needLib(k){ const [src,ok]=LJ_LIB[k]; if(ok()) return Promise.resolve();
  if(!LJ_LIB_P[k]) LJ_LIB_P[k]=loadScript(src).catch(e=>{ delete LJ_LIB_P[k]; toast('Un module de Librejo n’a pas pu se charger : vérifiez la connexion, puis rechargez la page.'); throw e; });
  return LJ_LIB_P[k]; }
let LJ_PDF_P=null, LJ_PDF_OK=false;
function pdfReady(){
  if(!LJ_PDF_P) LJ_PDF_P=needLib('jspdf').then(()=>{ ljHookBS(); ljHookTxt();
      return Promise.all([loadPdfRepli().catch(()=>{}),loadPdfFont(MISE().police).catch(()=>{})]); })
    .then(()=>{ LJ_PDF_OK=true; liveSoon(0); })
    .catch(e=>{ LJ_PDF_P=null; throw e; });
  return LJ_PDF_P; }
/* Filet de sécurité : un bouton qui fabrique un PDF, cliqué avant la fin du chargement, attend la bibliothèque
   puis reprend son clic (rien n'est perdu, pas de message d'erreur). */
const PDF_GO='[data-rgo],[data-cgo],[data-ago],[data-mgo],[data-clgo],[data-orgo],[data-ugo],[data-ego],[data-ckgo],[data-lpzoom],[data-act=prepare]';
document.addEventListener('click',e=>{ if(LJ_PDF_OK) return; const b=e.target.closest&&e.target.closest(PDF_GO); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation(); b.setAttribute('aria-busy','true');
  pdfReady().then(()=>{ b.removeAttribute('aria-busy'); if(b.isConnected) b.click(); },()=>b.removeAttribute('aria-busy')); },true);
/* Couleurs du papier à en-tête (Réglages › Papier à en-tête), corrigées comme celles de l'application :
   c1 écrit les titres, il reste à 4,5:1 au moins sur le papier blanc ; c2 trace les traits et filets,
   il reste visible à l'impression (2:1 au moins, l'ambre de la charte y est déjà). */
function pdfColor(k,hex){ const c=hexRgb(hex); if(!c) return null; return k==='c1'?reach(c,[255,255,255],4.5,[0,0,0]).map(Math.round):reach(c,[255,255,255],2,[0,0,0]).map(Math.round); }
function pdfRGB(v){ const m=MISE(); if(v==='--navy'&&hexRgb(m.c1)) return pdfColor('c1',m.c1); if(v==='--accent'&&hexRgb(m.c2)) return pdfColor('c2',m.c2); return hexRgb(getComputedStyle(document.documentElement).getPropertyValue(v).trim())||[23,48,47]; }
/* Logo : réduit pour les réglages (PNG, transparence gardée) ; version JPEG cadrée pour l'en-tête des PDF */
function imgFrom(url){ return new Promise((res,rej)=>{ const im=new Image(); im.onload=()=>res(im); im.onerror=rej; im.src=url; }); }
async function logoForMenu(url){ const im=await imgFrom(url), k=Math.min(1,400/Math.max(im.naturalWidth,im.naturalHeight));
  const c=document.createElement('canvas'); c.width=Math.round(im.naturalWidth*k); c.height=Math.round(im.naturalHeight*k);
  c.getContext('2d').drawImage(im,0,0,c.width,c.height); return c.toDataURL('image/png'); }
async function logoForPdf(url){ const im=await imgFrom(url), W=600, H=564, c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H);
  const k=Math.min(W/im.naturalWidth,H/im.naturalHeight), w=im.naturalWidth*k, hh=im.naturalHeight*k;
  g.drawImage(im,(W-w)/2,(H-hh)/2,w,hh); return c.toDataURL('image/jpeg',.9); }
const cats=()=>DATA.categories.slice().sort((a,b)=>(a.ordre||99)-(b.ordre||99)||a.nom.localeCompare(b.nom,'fr'));
/* Circuit de validation : brouillon → à valider → publié. L'équipe ne voit que les documents publiés. */
const ST_LAB={brouillon:'📝 Brouillon',avalider:'⏳ À valider'};
const isPub=d=>!d.statut||d.statut==='valide';
const docs=()=>isAdmin?DATA.documents:DATA.documents.filter(isPub);
const stBadge=d=>isPub(d)?'':`<span class="badge ${d.statut==='avalider'?'rel-soon':'st-draft'}" title="Invisible pour l’équipe tant qu’il n’est pas publié">${ST_LAB[d.statut]}</span>`;
const loaded=true;
const today=()=>{ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const month=()=>today().slice(0,7);
const nowStr=()=>{ const d=new Date(); return today()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); };
const rid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
DATA.kits=DATA.kits||[]; DATA.documents.forEach(d=>{ if(!d.id) d.id='d'+rid(); });
const baseDir=(()=>{ try{ let p=decodeURIComponent(location.pathname).replace(/\/[^/]*$/,''); if(/^\/[A-Za-z]:/.test(p)) p=p.slice(1); return location.protocol==='file:'?(location.host?'\\\\'+location.host:'')+p.replace(/\//g,'\\'):p; }catch(e){ return ''; } })();
const winPath=rel=>baseDir+(location.protocol==='file:'?'\\'+rel.replace(/\//g,'\\'):'/'+rel);
const hrefOf=rel=>rel.split('/').map(encodeURIComponent).join('/');
const MIME={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
  doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',odt:'application/vnd.oasis.opendocument.text',txt:'text/plain'};
const extOf=n=>(String(n).split('.').length>1?String(n).split('.').pop():'').toLowerCase();
const printable=d=>['pdf','png','jpg','jpeg','webp','docx'].includes(d.ext);
const docDate=v=>{ v=String(v||''); if(/^\d{4}-\d{2}$/.test(v)){ const [y,m]=v.split('-'); return m+'/'+y; } return frDate(v); };
// Nom de fichier lisible et sûr pour Windows (accents conservés)
const isoOr=d=>/^\d{4}-\d{2}-\d{2}/.test(String(d||''))?d:today(); // date d'un nom de fichier (pointillés ou vide : aujourd'hui)
const fileSafe=s=>String(s).trim().replace(/[\\/:*?"<>|#%…]+/g,' ').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'document';
function parseName(base){
  const pn=parseByNom(base); if(pn) return pn;
  const m=/^(.+?)(?:_v(\d+))?(?:_(\d{4}-\d{2}(?:-\d{2})?))?$/.exec(base)||[];
  return {titre:String(m[1]||base).replace(/[_-]+/g,' ').trim(),version:m[2]||'',date:m[3]||''};
}

function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(()=>true,()=>fallbackCopy(t));
  return Promise.resolve(fallbackCopy(t));
}
function fallbackCopy(t){ const back=document.activeElement, a=document.createElement('textarea'); a.value=t; a.setAttribute('readonly',''); a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select(); let ok=false; try{ ok=document.execCommand('copy'); }catch(e){} a.remove();
  if(back&&back!==document.body&&back.isConnected) back.focus({preventScroll:true}); return ok; }
function composeUrl(to,subject,body){
  const q=[]; if(to&&to.length) q.push('to='+encodeURIComponent(to.join(';')));
  if(subject) q.push('subject='+encodeURIComponent(subject)); if(body) q.push('body='+encodeURIComponent(body));
  return webmail+(webmail.includes('?')?'&':'?')+q.join('&');
}
/* Ouvrir un fichier du dossier : seuls PDF, images et texte s'affichent (sous un type imposé) ; le reste
   (HTML, SVG, Word…) est téléchargé. Une adresse blob: a l'origine de Librejo : un fichier HTML ou SVG ouvert
   ainsi pourrait exécuter du code avec les droits de l'application (même règle que boot.js). */
const SAFE_VIEW={pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',txt:'text/plain;charset=utf-8'};
function openSafe(blob,name){ const ext=String(name||'').split('.').pop().toLowerCase();
  if(!SAFE_VIEW[ext]){ downloadBlob(blob,name); toast('Ce type de fichier ne s’ouvre pas dans Librejo : il est téléchargé'); return; }
  const u=URL.createObjectURL(new Blob([blob],{type:SAFE_VIEW[ext]})); window.open(u,'_blank'); setTimeout(()=>URL.revokeObjectURL(u),300000); }
/* Liens venus du dossier, de l'annuaire ou d'une liste en ligne : seulement http(s) (jamais javascript:, data:…) */
const safeHref=u=>/^https?:\/\//i.test(String(u||'').trim())?String(u).trim():'';
function downloadBlob(blob,name){ const u=URL.createObjectURL(blob), a=document.createElement('a'); a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),120000); }

/* ======================================================================
   ACCÈS AU DOSSIER DOCUBUS DU NAS
   Le navigateur (Edge ou Chrome) demande une fois l'autorisation de lire le
   dossier ; l'autorisation est mémorisée sur ce PC. Pour écrire (admin),
   il faut en plus le droit d'écriture dans le dossier.
   ====================================================================== */
const FSA=(!!window.showDirectoryPicker||!!DEMO)&&!SANS; // la démo a son dossier, dans le navigateur (Firefox et Safari compris) ; sans dossier : rien n'est jamais demandé au navigateur
// Librejo ouvert par un chemin réseau (file://NAS/partage/…) plutôt que par une lettre de lecteur (Z:)
const UNC_OPEN=location.protocol==='file:'&&!!location.host;
const UNC_PARTS=UNC_OPEN?decodeURIComponent(location.pathname).split('/').filter(Boolean):[];
const UNC_SHARE=UNC_OPEN?UNC_PARTS[0]||'':'' , UNC_REST=UNC_OPEN?UNC_PARTS.slice(1,-1).join('\\'):'';
let dirH=null;
const idb={
  open(){ return new Promise((res,rej)=>{ const r=indexedDB.open('docubus',1); r.onupgradeneeded=()=>r.result.createObjectStore('h'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); },
  async get(k){ try{ const db=await this.open(); return await new Promise(res=>{ const t=db.transaction('h').objectStore('h').get(k); t.onsuccess=()=>res(t.result||null); t.onerror=()=>res(null); }); }catch(e){ return null; } },
  async set(k,v){ try{ const db=await this.open(); return await new Promise(res=>{ const t=db.transaction('h','readwrite'); t.objectStore('h').put(v,k); t.oncomplete=()=>res(true); t.onerror=()=>res(false); }); }catch(e){ return false; } }
};
/* Démo : le dossier mémorisé du poste n'est ni lu ni remplacé ; la démo a le sien */
if(DEMO){ idb.get=async k=>k==='dossier'?DEMO.dir:null; idb.set=async()=>true; dirH=DEMO.dir; }
class Cancel extends Error{}
async function permState(h,mode){ if(!h||!h.queryPermission) return h?'granted':'none'; try{ return await h.queryPermission({mode}); }catch(e){ return 'denied'; } }
function askPick(mode){
  return new Promise((resolve,reject)=>{
    openModal(`<h3 id="modal-title">Autoriser l'accès au dossier Librejo</h3>
      <p>Pour ${mode==='readwrite'?'modifier Librejo (admin)':'imprimer en un clic et joindre les documents aux mails'}, le navigateur doit pouvoir ${mode==='readwrite'?'lire et écrire dans':'lire'} le dossier Librejo. C'est à faire une seule fois sur ce PC.</p>
      <p>Dans la fenêtre qui s'ouvre, choisissez le dossier :</p><code class="path">${esc(baseDir||'Z:\\Librejo')}</code>
      <p>puis cliquez sur <b>Sélectionner le dossier</b>, et sur <b>Autoriser</b>${mode==='readwrite'?' / <b>Enregistrer les modifications</b>':''}.</p>
      ${UNC_OPEN?`<div class="pickwarn"><b>Librejo est ouvert par le réseau</b> (${esc(baseDir)}). Chrome et Edge ne savent souvent pas autoriser un dossier ouvert de cette façon : la fenêtre se ferme sans rien demander.<br><b>Solution :</b> ouvrez Librejo par une lettre de lecteur. Dans l'Explorateur de fichiers, clic droit sur <b>${esc(UNC_SHARE)}</b> › <b>Connecter un lecteur réseau…</b> › lettre <b>Z:</b> › cocher « Se reconnecter à la connexion ». Puis ouvrez <b>Z:\\${esc(UNC_REST||'Librejo')}\\Librejo.html</b> (et mettez-le en favori), et choisissez ici le dossier par Z:.</div>`:''}
      <p class="pickmsg" id="pick-msg" role="alert" hidden></p>
      <div class="btns"><button class="primary" id="pick">Choisir le dossier Librejo</button><button class="secondary" data-close id="pick-no">Annuler</button></div>`);
    let done=false;
    $('#pick-no').onclick=()=>{ done=true; reject(new Cancel()); };
    $('#modal').addEventListener('click',function f(e){ if(!done&&e.target.id==='modal'){ done=true; reject(new Cancel()); } $('#modal').removeEventListener('click',f); });
    $('#pick').onclick=async()=>{
      try{
        const say=t=>{ const m=$('#pick-msg'); if(m){ m.innerHTML=t; m.hidden=false; } };
        let h=await window.showDirectoryPicker({id:'docubus',mode});
        const r=await checkLibrejoDir(h);
        if(r.sub) h=r.sub; // dossier parent choisi (ex. Z:\) : on prend son sous-dossier Librejo
        else if(!r.ok){ say(r.msg); return; }
        if(mode==='readwrite'&&h.queryPermission){ let st=await permState(h,mode); if(st!=='granted'){ try{ st=await h.requestPermission({mode}); }catch(e){} }
          if(st!=='granted'){ say("Le navigateur n'a pas donné le droit de modifier : recommencez et, dans la seconde question du navigateur, cliquez sur <b>Modifier les fichiers</b> (ou <b>Autoriser</b>)."); return; } }
        done=true; closeModal(); resolve(h);
      }catch(e){
        if(e&&e.name==='AbortError'){ const m=$('#pick-msg'); if(m){ m.innerHTML=UNC_OPEN?"La fenêtre s'est fermée sans autorisation : c'est le cas habituel quand Librejo est ouvert par le réseau. Suivez la solution ci-dessus (lettre de lecteur Z:).":"La fenêtre du navigateur a été fermée sans autorisation. Recommencez : choisissez le dossier, cliquez sur <b>Sélectionner le dossier</b>, puis acceptez la question du navigateur (<b>Afficher les fichiers</b> / <b>Modifier les fichiers</b>)."; m.hidden=false; } return; }
        if(e&&(e.name==='SecurityError'||e.name==='NotAllowedError')){ const m=$('#pick-msg'); if(m){ m.innerHTML="Le navigateur refuse ce dossier (dossier système ou disque entier). Choisissez le dossier <b>Librejo</b> lui-même."; m.hidden=false; } return; }
        console.error('Choix du dossier',e); const m=$('#pick-msg'); if(m){ m.innerHTML=`Le navigateur a refusé l'accès (${esc((e&&e.name)||'Erreur')} : ${esc((e&&e.message)||String(e))}). Faites une capture de ce message pour l'admin. En attendant, Librejo fonctionne sans cette autorisation : les documents s'ouvrent, il faut seulement les imprimer depuis le document ouvert (Ctrl+P).`; m.hidden=false; } }
    };
  });
}
/* Le dossier choisi est-il bien celui de Librejo ? (nom du fichier sans tenir compte des majuscules) */
async function checkLibrejoDir(h){
  const names=[]; let html=false, app=false, docsDir=false, sub=null;
  try{ for await (const [n,e] of h.entries()){ names.push(n); const l=n.toLowerCase();
    if(e.kind==='file'&&/^(docubus|librejo).*\.html?$/.test(l)) html=true;
    if(e.kind==='directory'&&l==='app') app=true; if(e.kind==='directory'&&l==='documents') docsDir=true;
    if(e.kind==='directory'&&(l==='docubus'||l==='librejo')) sub=e; } }catch(e){}
  if(html||(app&&docsDir)) return {ok:true};
  if(sub){ const r=await checkLibrejoDir(sub); if(r.ok) return {ok:true,sub}; }
  const nm=esc(h.name||'?');
  if(['app','documents','miniatures','lib'].includes((h.name||'').toLowerCase())) return {ok:false,msg:`Vous avez choisi le dossier <b>${nm}</b>, qui est <i>dans</i> Librejo. Remontez d'un cran et choisissez le dossier <b>Librejo</b> lui-même (celui qui contient Librejo.html).`};
  return {ok:false,msg:`${h.name?`Le dossier <b>${nm}</b>`:'Le dossier choisi'} ne contient pas Librejo.html${names.length?` (il contient : ${names.slice(0,6).map(esc).join(', ')}${names.length>6?'…':''})`:' (il paraît vide)'}. Choisissez le dossier où se trouve le fichier Librejo.html que vous avez ouvert.`};
}
async function getDir(mode='read'){
  if(!FSA) throw new Error('nofsa');
  if(!dirH) dirH=await idb.get('dossier');
  if(dirH){
    let st=await permState(dirH,mode);
    if(st==='prompt'){ try{ st=await dirH.requestPermission({mode}); }catch(e){ st='prompt'; } }
    if(st==='granted'){ updateConn(); return dirH; }
  }
  const h=await askPick(mode);
  dirH=h; await idb.set('dossier',h); updateConn(); return h;
}
async function dirAt(parts,mode,create){ let d=await getDir(mode); for(const p of parts) d=await d.getDirectoryHandle(p,{create:!!create}); return d; }
async function readRel(rel){ const parts=rel.split('/'), name=parts.pop(); const d=await dirAt(parts,'read',false); return (await d.getFileHandle(name)).getFile(); }
async function writeRel(rel,data){ const parts=rel.split('/'), name=parts.pop(); const d=await dirAt(parts,'readwrite',true); const fh=await d.getFileHandle(name,{create:true}); const w=await fh.createWritable(); await w.write(data); await w.close(); }
async function existsRel(rel){ try{ const parts=rel.split('/'), name=parts.pop(); const d=await dirAt(parts,'read',false); await d.getFileHandle(name); return true; }catch(e){ return false; } }
async function removeRel(rel){ const parts=rel.split('/'), name=parts.pop(); const d=await dirAt(parts,'readwrite',false); await d.removeEntry(name); }
async function moveRel(from,to){ const f=await readRel(from); await writeRel(to,f); await removeRel(from); }
async function uniqueRel(dir,base,ext){ let n=`${dir}/${base}.${ext}`, i=2; while(await existsRel(n)) n=`${dir}/${base}-${i++}.${ext}`; return n; }
function fsErr(e){
  if(e instanceof Cancel) return null;
  if(e&&e.message==='nofsa') return "Ce navigateur ne permet pas l'accès au dossier : utilisez Microsoft Edge ou Google Chrome.";
  if(e&&(e.name==='NotAllowedError'||e.name==='SecurityError')) return "Accès refusé : vérifiez que votre compte a le droit d'écriture sur le dossier Librejo.";
  if(e&&e.name==='NotFoundError') return "Fichier introuvable dans le dossier : il a peut-être été déplacé. Un admin peut « Actualiser la liste ».";
  if(e&&e.name==='NoModificationAllowedError') return "Le fichier est ouvert ailleurs ou en lecture seule. Fermez-le puis réessayez.";
  return 'Erreur : '+((e&&e.message)||e);
}
async function updateConn(){
  const b=$('#conn'); if(!FSA){ b.hidden=true; return; }
  const h=dirH||await idb.get('dossier'); const st=h?await permState(h,'read'):'none';
  if(st==='granted'&&MISE().police==='perso'&&LJ_PDF_P) loadPdfFont('perso').catch(()=>{});
  if(st==='granted') cfBaseline();
  b.className='conn'+(st==='granted'?' ok status':h&&!isAdmin?' status quiet':'');
  if(DEMO&&st==='granted'){ b.title='Le dossier de démo est dans ce navigateur'; b.innerHTML=`${svg('<path d="m5 12 5 5 9-10"/>')}Dossier de démo`; return; }
  b.title=st==='granted'?'Librejo peut lire son dossier':'Autoriser Librejo à lire son dossier (impression en un clic, pièces jointes)';
  b.innerHTML=st==='granted'?`${svg('<path d="m5 12 5 5 9-10"/>')}Dossier connecté`:`${svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')}${h?(isAdmin?'Réautoriser le dossier':'Accès au dossier : demandé à la 1re impression'):'Connecter le dossier'}`;
}
$('#conn').addEventListener('click',async()=>{ try{ await getDir('read'); toast('Dossier connecté, tout est prêt'); }catch(e){ const m=fsErr(e); m&&toast(m); } });

async function saveData(){
  DATA.maj=nowStr();
  const text="// Librejo : liste des documents, descriptions et formulaires (écrit par le mode admin de Librejo.html).\n// Mis à jour le "+DATA.maj+"\nwindow.DOCUBUS_DONNEES = "+JSON.stringify(DATA,null,1)+";\n";
  await guardedWrite('app/donnees.js',text);
}
async function saveParams(){
  const text="// Librejo : réglages (écrit par le mode admin de Librejo.html).\n// Mis à jour le "+nowStr()+"\nwindow.DOCUBUS_PARAMETRES = "+JSON.stringify(PAR,null,1)+";\n";
  await guardedWrite('app/parametres.js',text);
}
async function run(fn,ok){ try{ await fn(); if(ok) toast(ok); return true; }catch(e){ if(!(e instanceof Cancel)) console.error(e); const m=fsErr(e); m&&openModal(`<h3 id="modal-title">Action impossible</h3><p>${esc(m)}</p><button class="secondary" data-close>OK</button>`); return false; } }

/* ---------- Mode admin (mot de passe simple, la vraie protection = droits du dossier) ---------- */
let isAdmin=false;
try{ isAdmin=sessionStorage.getItem('docubus-admin')==='1'; }catch(e){}
function setAdmin(v){
  isAdmin=v; setTimeout(updateConn,0); try{ v?sessionStorage.setItem('docubus-admin','1'):sessionStorage.removeItem('docubus-admin'); }catch(e){}
  const b=$('#adminbtn'); b.className='adminbtn'+(v?' on':''); b.innerHTML=`${svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0'+(v?'':'v4')+'"/>')}${v?'Quitter le mode admin':'Accès admin'}`;
  document.querySelector('[data-tab=admin]').hidden=!v;
  if(!v&&tab==='admin') setTab('docs');
  renderDocs(); renderForms(); if(typeof renderAnnu==='function'){ renderAnnu(); renderSemaine(); }
  if(typeof drawFormAdmin==='function') drawFormAdmin(tab);
  showAdminFlag();
}
$('#adminbtn').addEventListener('click',()=>{
  if(isAdmin){ const out=()=>{ setAdmin(false); toast('Vous avez quitté le mode admin'); }; if(regDirty()) regAsk(()=>{ regReset(); out(); }); else out(); return; }
  openModal(`<h3 id="modal-title">Accès admin</h3><label class="field"><span>Mot de passe</span><input class="in" id="pw" type="password" data-autofocus autocomplete="off"></label>
    <p class="fielderr" id="pw-err" role="alert" hidden></p>
    <label class="field"><span>Votre prénom <small>(facultatif, pour le journal des modifications)</small></span><input class="in" id="pw-who" value="${esc(jrWho())}" autocomplete="given-name"></label>
    <div class="btns"><button class="primary alt" id="pw-ok">Entrer</button><button class="secondary" data-close>Annuler</button></div>`);
  const go=async()=>{ const pw=$('#pw'), okb=$('#pw-ok'); okb.disabled=true; let ok=false; try{ ok=await pwCheck(pw.value); }finally{ okb.disabled=false; }
    /* ancien mot de passe en clair : converti en empreinte (enregistrée avec la prochaine modification des réglages) */
    if(ok&&pwPlain()&&pw.value) try{ const h=await pwHash(pw.value); if(typeof h==='object') PAR.motdepasse=h; }catch(e){}
    if(ok){ try{ localStorage.setItem(JR_WHO,$('#pw-who').value.trim()); }catch(e){} closeModal(); setAdmin(true); toast('Vous pouvez maintenant modifier'); if(FSA) getDir('readwrite').then(()=>cfAdminCheck()).then(ok=>{ if(ok) setTimeout(autoThumbs,600); }).catch(e=>{ const m=fsErr(e); m&&toast(m); }); }
    else { const m=$('#pw-err'); m.textContent=pw.value?'Ce n’est pas le bon mot de passe. Vérifiez les majuscules et réessayez.':'Saisissez le mot de passe admin.'; m.hidden=false; pw.setAttribute('aria-invalid','true'); pw.setAttribute('aria-describedby','pw-err'); pw.focus(); pw.select(); } };
  $('#pw-ok').onclick=go; $('#pw').addEventListener('input',()=>{ $('#pw-err').hidden=true; $('#pw').removeAttribute('aria-invalid'); });
  /* Entrée dans l'un ou l'autre champ : valider sans laisser l'appui atteindre un autre bouton */
  ['#pw','#pw-who'].forEach(sel=>$(sel).addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } }));
});

/* ---------- Onglets ---------- */
let tab=({'#formulaires':'forms','#annuaire':'annu','#partenaires':'annu','#semaine':'semaine'})[location.hash]||'docs';
function setTab(t){
  if(SANS&&['docs','semaine','annu','admin'].includes(t)) t='forms'; // formulaires seulement
  if(t==='admin'&&!isAdmin) t='docs';
  if(t!=='admin'&&tab==='admin'&&asub==='reg'&&isAdmin&&regDirty()){ regAsk(()=>setTab(t)); return; }
  tab=t;
  navCurrent(t);
  if(t==='forms'||t==='admin'||FORM_TABS.includes(t)) pdfReady().catch(()=>{});   // formulaires, administration : bibliothèques PDF
  document.querySelectorAll('main>section.panel').forEach(sec=>{ sec.hidden=sec.id!=='p-'+t; });
  history.replaceState(null,'',{docs:'#documents',forms:'#formulaires',deliv:'#delivrance',admin:'#admin',annu:'#annuaire',semaine:'#semaine',relais:'#relais',cmi:'#certificat',att:'#attestation',mt:'#courrier',cl:'#certificat-libre',urg:'#urgences',cp:'#courrier-partenaire',el:'#en-tete-libre',ccas:'#orientation-ccas'}[t]);
  const pt=$('#pagetitle'); if(pt){ pt.textContent={docs:'Documents',forms:'Formulaires',semaine:'Impression rapide',annu:'Annuaire',admin:'Administration'}[t]||'Formulaires'; pt.hidden=t==='docs'&&filter==='recent'&&!query; }
  drawFormAdmin(t);
  liveSoon(60);
  if(t==='admin') renderAdmin();
  if(t==='forms') renderForms();
  if(t==='annu') renderAnnu();
  if(t==='relais') renderRelais();
  if(t==='cmi') renderCmi();
  if(t==='att') renderAtt();
  if(t==='mt') renderMt();
  if(t==='cl') renderCl();
  if(t==='urg') renderUrg();
  if(t==='cp') renderCp();
  if(t==='el') renderEl();
  if(t==='ccas') renderCcas();
  if(t==='semaine') renderSemaine();
  renderSide();
}
/* Pastilles de choix : le groupe porte le nom du champ, l'état choisi est annoncé (aria-pressed) et coché */
let grpN=0;
function nameGroups(root){ (root||document).querySelectorAll('.field>.choice:not([role]),.field>.seg:not([role]),.field>div>.choice:not([role])').forEach(g=>{
  const f=g.closest('.field'), lab=f&&f.querySelector(':scope>span:first-child'); g.setAttribute('role','group'); if(lab){ if(!lab.id) lab.id='grp-l'+(++grpN); g.setAttribute('aria-labelledby',lab.id); } }); }
new MutationObserver(ms=>{ if(ms.some(m=>m.addedNodes.length)) nameGroups(); }).observe(document.body,{subtree:true,childList:true});
/* Menu principal : une navigation entre pages (pas des onglets). La page affichée porte aria-current="page" ;
   chaque entrée est atteinte par Tab, et les flèches passent aussi d'une entrée à l'autre (sans ouvrir la page). */
const FORM_TABS=['deliv','relais','cmi','att','mt','cl','urg','cp','el','ccas'];
function navCurrent(t){ document.querySelectorAll('nav.top button[data-tab]').forEach(b=>{ const on=b.dataset.tab===t||(FORM_TABS.includes(t)&&b.dataset.tab==='forms');
  if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); }); }
document.querySelector('nav.top').addEventListener('keydown',e=>{ const b=e.target.closest('button[data-tab]'); if(!b) return;
  const all=[...e.currentTarget.querySelectorAll('button[data-tab]')].filter(x=>!x.hidden&&x.offsetParent), i=all.indexOf(b), k=e.key;
  const n=k==='ArrowDown'||k==='ArrowRight'?i+1:k==='ArrowUp'||k==='ArrowLeft'?i-1:k==='Home'?0:k==='End'?all.length-1:null; if(n===null||i<0) return;
  e.preventDefault(); all[(n+all.length)%all.length].focus(); });
/* Onglets (sections des réglages) : une seule tabulation par liste, puis les flèches */
function rovingTabs(list){ if(!list) return; const tabs=[...list.querySelectorAll('[role=tab]')].filter(b=>!b.hidden);
  const cur=tabs.find(b=>b.getAttribute('aria-selected')==='true')||tabs[0]; tabs.forEach(b=>b.tabIndex=b===cur?0:-1); }
document.addEventListener('keydown',e=>{ const t=e.target.closest&&e.target.closest('[role=tab]'), list=t&&t.closest('[role=tablist]'); if(!list) return;
  const tabs=[...list.querySelectorAll('[role=tab]')].filter(b=>!b.hidden&&b.offsetParent), i=tabs.indexOf(t); if(i<0) return;
  const k=e.key, n=k==='ArrowDown'||k==='ArrowRight'?i+1:k==='ArrowUp'||k==='ArrowLeft'?i-1:k==='Home'?0:k==='End'?tabs.length-1:null; if(n===null) return;
  e.preventDefault(); const nx=tabs[(n+tabs.length)%tabs.length]; nx.click(); setTimeout(()=>{ const again=list.querySelector(`[role=tab][data-tab="${nx.dataset.tab}"],[role=tab][data-rsecgo="${nx.dataset.rsecgo}"]`)||nx; rovingTabs(list); again.focus(); },0); });
new MutationObserver(()=>{ rovingTabs(document.querySelector('.rsec-nav')); }).observe(document.querySelector('.app'),{subtree:true,attributes:true,attributeFilter:['aria-selected','hidden'],childList:true});
document.querySelector('nav.top').addEventListener('click',e=>{ const b=e.target.closest('button[data-tab]'); if(b){ if(b.dataset.tab==='forms') formView=null; if(b.dataset.tab==='docs'){ filter='recent'; query=''; } setTab(b.dataset.tab); if(b.dataset.tab==='docs') renderDocs(); window.scrollTo({top:0}); } });

/* ======================================================================
   1. DOCUMENTS : recherche, impression, copie modifiable, envoi
   ====================================================================== */
let query='', filter='recent', sortKey='date', sortDir=-1;
function kind(ext){ const x=String(ext||'').toLowerCase();
  if(x==='pdf') return ['pdf','PDF']; if(['doc','docx','odt','rtf'].includes(x)) return ['doc',x.toUpperCase().slice(0,4)];
  if(['xls','xlsx','ods','csv'].includes(x)) return ['xls',x.toUpperCase().slice(0,4)]; if(['jpg','jpeg','png','webp'].includes(x)) return ['img','IMG'];
  if(x==='form') return ['','FORM'];
  return ['',x.toUpperCase().slice(0,4)]; }
const catName=id=>(DATA.categories.find(c=>c.id===id)||{}).nom||id||'';

/* Moteur de recherche : tous les mots doivent être trouvés (sans tenir compte des accents) dans le titre,
   la description, les mots-clés, la catégorie ou le nom du fichier ; le titre compte le plus. */
function terms(q){ return norm(q).split(/[\s,;'’]+/).filter(t=>t.length>0); }
function scoreItem(it,ts){
  const F={t:norm(it.titre),k:norm((it.motscles||[]).join(' ')),d:norm(it.description),c:norm(catName(it.categorie)),f:norm(it.fichier||''),x:TXT_ON&&!it.kind?txOf(it):''};
  let s=0;
  for(const t0 of ts){
    let best=0;
    for(const t of expandTerm(t0)){
      let hit=0;
      const w=(txt,pts)=>{ if(!txt) return; const i=txt.indexOf(t); if(i<0) return; let p=pts; if(i===0||/[\s(«"'-]/.test(txt[i-1])) p+=pts/2; hit+=p; };
      w(F.t,10); w(F.k,6); w(F.d,4); w(F.c,2); w(F.f,1); w(F.x,1.5);
      if(t!==t0) hit*=0.8;
      best=Math.max(best,hit);
    }
    if(!best) return 0; s+=best;
  }
  return s;
}
function hl(text,ts){
  text=String(text||''); if(!ts.length||!text) return esc(text);
  ts=[...new Set(ts.flatMap(expandTerm))];
  const chars=[...text], nchars=chars.map(c=>norm(c)), joined=nchars.join(''), map=[];
  nchars.forEach((n,i)=>{ for(let k=0;k<n.length;k++) map.push(i); });
  const mark=new Array(chars.length).fill(false);
  for(const t of ts){ let i=joined.indexOf(t); while(i>=0){ for(let k=i;k<i+t.length&&k<map.length;k++) mark[map[k]]=true; i=joined.indexOf(t,i+t.length); } }
  let out='',open=false; chars.forEach((c,i)=>{ if(mark[i]&&!open){ out+='<mark>'; open=true; } if(!mark[i]&&open){ out+='</mark>'; open=false; } out+=esc(c); }); if(open) out+='</mark>';
  return out;
}
function excerpt(desc,ts,max=220){
  desc=String(desc||''); if(desc.length<=max||!ts.length) return desc.length>max?desc.slice(0,max)+'…':desc;
  const n=norm(desc); let i=-1; for(const t of ts){ i=n.indexOf(t); if(i>=0) break; }
  if(i<0) return desc.slice(0,max)+'…';
  const st=Math.max(0,i-60); return (st?'…':'')+desc.slice(st,st+max)+(st+max<desc.length?'…':'');
}
function sortDocs(list){
  const k=sortKey, s=sortDir;
  return list.sort((a,b)=>{
    const va=k==='titre'?norm(a.titre):k==='version'?(+a.version||0):String(a.date||''), vb=k==='titre'?norm(b.titre):k==='version'?(+b.version||0):String(b.date||'');
    if(va<vb) return -s; if(va>vb) return s; return a.titre.localeCompare(b.titre,'fr');
  });
}
/* Emoji de chaque formulaire : se repérer d'un coup d'œil (formulaires de l'admin : champ « Emoji », sinon 📝) */
const FORM_EMOJI={__ccas:'🏛️',__el:'📄',__cp:'📨',__urg:'🚑',__cl:'🖊️',__deliv:'💊',__relais:'🔁',__cmi:'🩺',__att:'📋',__mt:'✉️'};
const formEmoji=f=>FORM_EMOJI[f.id]||(f.emoji||'').trim()||'📝';
const DOCUBUS_VERSION='2026-11-26';
/* Ce que chaque formulaire intégré utilise, et où cela se règle */
const BUILTIN_FORMS=[
  {tab:'cl',id:'__cl',titre:'Certificat libre',sets:['med','entete']},
  {tab:'deliv',id:'__deliv',titre:'Délivrance exceptionnelle',sets:['dest','med','envoi']},
  {tab:'relais',id:'__relais',titre:'Demande de relais',sets:['annu','med','envoi']},
  {tab:'cmi',id:'__cmi',titre:'Certificat médical initial',sets:['med','entete']},
  {tab:'att',id:'__att',titre:'Attestation de suivi',sets:['med','entete']},
  {tab:'mt',id:'__mt',titre:'Courrier au médecin traitant',sets:['annu','med','envoi']},
  {tab:'urg',id:'__urg',titre:'Orientation aux urgences',sets:['annu','med','entete']},
  {tab:'cp',id:'__cp',titre:'Courrier à un partenaire',sets:['annu','med','entete']},
  {tab:'el',id:'__el',titre:'En-tête libre',sets:['entete']},
  {tab:'ccas',id:'__ccas',titre:'Bon d’orientation CCAS',sets:['annu','entete']}];
const SETTINGS={dest:{l:'CSAPA destinataires et leurs adresses',h:'Destinataires de la délivrance'},med:{l:'Médecins et RPPS',h:'Médecins'},
  envoi:{l:'Adresses d’envoi',h:'Envoi des mails'},structure:{l:'Infos de la structure',h:'Infos de la structure'},entete:{l:'En-tête et bas de page',h:'Papier à en-tête'},annu:{l:'Fiches de l’annuaire proposées',tab:'annu'}};
function gotoSetting(k){
  const S_=SETTINGS[k]||{};
  if(S_.tab){ formView=null; setTab(S_.tab); window.scrollTo({top:0}); return; }
  if(S_.asub){ formView=null; asub=S_.asub; fdraft=null; setTab('admin'); window.scrollTo({top:0}); return; }
  formView=null; asub='reg'; fdraft=null; setTab('admin');
  setTimeout(()=>{ const h=[...document.querySelectorAll('#asub .card h3')].find(x=>x.textContent.trim().replace(/^\S+\s(?=[A-ZÀ-Ý])/u,'').startsWith(S_.h||k)||x.textContent.trim().startsWith(S_.h||k)); const c=h&&h.closest('.card');
    if(c&&c.dataset.rsec&&c.dataset.rsec!==rsec) rsecShow(c.dataset.rsec);
    if(c){ c.scrollIntoView({behavior:smooth(),block:'start'}); c.classList.add('flash'); setTimeout(()=>c.classList.remove('flash'),3000);
      if(k==='newdest'){ const b=c.querySelector('#add-dest'); b&&b.click(); } } },60);
}
function drawFormAdmin(t){
  const box=$('#formadmin'); if(!box) return; const f=BUILTIN_FORMS.find(x=>x.tab===t);
  if(!isAdmin||!f){ box.hidden=true; box.innerHTML=''; return; }
  box.hidden=false;
  box.innerHTML=`<div class="adminbar w-form"><b>Mode admin</b><span class="dropnote">Ce formulaire se règle ici :</span>
    ${t==='deliv'?`<button class="primary alt sm" data-goset="newdest">${ICON.plus}Ajouter un CSAPA</button>`:''}
    ${f.sets.map(k=>`<button class="secondary" data-goset="${k}">${esc(SETTINGS[k].l)}</button>`).join('')}<button class="secondary" data-pinform="${f.id}">${DATA.formsEpingles.includes(f.id)?'★ Retirer de l’accueil':'☆ Épingler à l’accueil'}</button></div>`;
}
document.addEventListener('click',e=>{ const g=e.target.closest('[data-goset]'); if(g){ const k=g.dataset.goset; gotoSetting(k==='newdest'?'dest':k); if(k==='newdest') setTimeout(()=>{ const b=$('#add-dest'); b&&b.click(); const r=[...document.querySelectorAll('.dest-row [data-part]')].pop(); r&&r.focus(); },400); } });
function formItems(){ return [{id:'__ccas',titre:'Bon d’orientation CCAS',description:"Bon d'orientation vers le CCAS : motif (domiciliation, aide alimentaire ou financière, droits, accompagnement, hébergement), situation, pièces, contact dans la structure.",motscles:['CCAS','orientation','social','domiciliation','aide alimentaire','secours','droits','bon'],kind:'form'},{id:'__el',titre:'En-tête libre',description:"Page blanche à l'en-tête de la structure : titre, destinataire, objet, texte et signature libres, seule la date est fixe.",motscles:['en-tête','papier à en-tête','libre','lettre','courrier','note','attestation'],kind:'form'},{id:'__cp',titre:'Courrier à un partenaire',description:"Courrier type à l'en-tête de la structure pour écrire à un partenaire (structure, service, administration) : destinataire, objet, texte, signature.",motscles:['courrier','lettre','partenaire','structure','administration','en-tête'],kind:'form'},{id:'__urg',titre:'Orientation aux urgences',description:"Courrier d'orientation pour l'équipe des urgences : motif, constantes, antécédents, traitements, allergies, consommations récentes, contact dans la structure.",motscles:['urgences','hôpital','orientation','SAU','courrier','adressage','hospitalisation'],kind:'form'},
  {id:'__cl',titre:'Certificat libre',description:"Certificat « Je soussigné(e), Dr X, certifie que… » : le médecin, la date, et le texte à écrire.",motscles:['certificat','certifie','soussigné','attestation médicale','sport'],kind:'form'},{id:'__att',titre:'Attestation de suivi',description:"Atteste qu'une personne est suivie (obligation de soins, injonction thérapeutique, SPIP, employeur), sans information médicale.",motscles:['attestation','suivi','obligation de soins','injonction','SPIP','juge','justice','présence','rendez-vous'],kind:'form'},
  {id:'__mt',titre:'Courrier au médecin traitant',description:"Courrier médical au médecin traitant : information de suivi, compte rendu, demande d'avis ou fin de suivi.",motscles:['courrier','lettre','médecin traitant','généraliste','confrère','compte rendu','liaison'],kind:'form'},{id:'__cmi',titre:'Certificat médical initial – violences',description:"Certificat pour une personne majeure victime de violences (modèle inspiré de l'Ordre des médecins) : dires, examen, lésions, ITT, photos datées en annexe.",motscles:['certificat','CMI','violences','coups','agression','ITT','constatation','photos','plainte','médecin légiste'],kind:'form'},{id:'__relais',titre:'Demande de relais TSO',description:"Adresser un patient à un autre CSAPA ou à un médecin qui prendra le relais de la prescription : posologie, antécédents, traitements associés.",motscles:['relais','orientation','méthadone','buprénorphine','CSAPA','médecin','prescription','TSO'],categorie:(DATA.categories.find(c=>/orientation/i.test(c.nom))||{}).id||'',kind:'form'},{id:'__deliv',titre:'Délivrance exceptionnelle de TSO',description:"Attestation envoyée au CSAPA de suivi quand un patient est venu chercher son traitement (méthadone, buprénorphine) chez nous.",motscles:['attestation','méthadone','buprénorphine','CSAPA','week-end'],categorie:(DATA.categories.find(c=>/d[ée]livrance/i.test(c.nom))||{}).id||'',kind:'form'}]
  .filter(x=>!formsOff().includes(x.id)).concat(DATA.formulaires.map(f=>({...f,kind:'form'})))
  .concat(cerfaDocs().map(d=>({id:'cerfa:'+d.id,titre:d.titre,description:(d.cerfa.numero?'Cerfa '+d.cerfa.numero+', ':'Cerfa ')+'pré-rempli avec les infos de la structure'+(d.cerfa.pieces?', avec la liste des pièces':''),motscles:[...(d.motscles||[]),'cerfa',d.cerfa.numero||''],kind:'form',groupe:d.cerfa.rubrique||'social',emoji:'🧾'}))); }
/* Formulaires proposés selon la structure : les formulaires médicaux seulement s'il y a des médecins,
   ceux des traitements de substitution seulement pour un CSAPA ou un CAARUD. L'admin garde la main :
   « Proposer » les active quand même (PAR.formsOn), « Masquer » les retire (PAR.formsOff). */
const MED_FORMS=['__cl','__cmi','__att','__mt','__relais','__deliv'], TSO_FORMS=['__relais','__deliv'];
const tsoStruct=()=>['csapa','caarud'].includes(PAR.typeStructure);
function formsAuto(id){ if(MED_FORMS.includes(id)&&!meds().length) return 'masqué : aucun médecin enregistré';
  if(TSO_FORMS.includes(id)&&!tsoStruct()) return 'masqué : réservé aux CSAPA et CAARUD'; return ''; }
function formsOffBase(){ return Array.isArray(PAR.formsOff)?PAR.formsOff.filter(x=>x!=='__ordo'):[]; }
function formsOff(){ const on=new Set(PAR.formsOn||[]), off=new Set(formsOffBase());
  BUILTIN_FORMS.forEach(f=>{ if(!on.has(f.id)&&formsAuto(f.id)) off.add(f.id); }); return [...off]; }
const tsoOn=()=>TSO_FORMS.some(id=>!formsOff().includes(id)); // traitement de substitution proposé dans les courriers
function renderDocs(){
  if(!viewChosen) view=isAdmin?'liste':'vignettes';
  const p=$('#p-docs');
  const ts=terms(query);
  let list, title, showCat=true;
  if(ts.length){
    list=docs().concat(formItems()).concat(DATA.kits.map(k=>({...k,kind:'kit'}))).map(it=>({it,s:scoreItem(it,ts)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).map(x=>x.it);
    title=`${list.length} résultat${list.length>1?'s':''}`;
  }else if(filter==='recent'){ list=sortDocs(docs().slice()).slice(0,20); title='Derniers documents'; }
  else if(filter==='kits'){ list=[]; title='Kits de documents'; }
  else{ const [fc,fs]=splitDest(filter); list=sortDocs(docs().filter(d=>d.categorie===fc&&(!fs||d.sous===fs))).concat(fs?[]:formItems().filter(f=>f.categorie===fc)); title=esc(catName(fc))+(fs?` <span class="o">› ${esc(fs)}</span>`:''); showCat=false; }
  const th=(k,l)=>ts.length?`<th scope="col">${l}</th>`:`<th scope="col"><button data-sort="${k}" aria-label="Trier par ${l}">${l}${sortKey===k?(sortDir>0?' ▲':' ▼'):''}</button></th>`;
  const rowOf=d=>{
    if(isLink(d)) return linkRow(d,ts,showCat);
    if(d.kind==='form') return `<tr><td class="col-icon"><span class="ico emoji" aria-hidden="true">${esc(formEmoji(d))}</span></td>
      <td class="t"><a href="#" data-fill="${esc(d.id)}">${hl(d.titre,ts)}</a><span class="badge accent">Formulaire</span>${favBtn('f:'+d.id)}${d.description?`<span class="desc">${hl(excerpt(d.description,ts),ts)}</span>`:''}</td>
      <td class="num"></td><td class="num"></td>
      <td><div class="act"><button class="lbtn" data-fill="${esc(d.id)}">${ICON.pen}Remplir</button></div></td></tr>`;
    if(d.kind==='kit') return `<tr><td class="col-icon"><span class="ico navy" role="img" aria-label="Kit">KIT</span></td>
      <td class="t"><a href="#" data-filter="kits">${hl(d.titre,ts)}</a><span class="badge accent">Kit</span><span class="desc">${hl(excerpt(d.description||kitDocs(d).map(x=>x.titre).join(', '),ts),ts)}</span></td>
      <td class="num"></td><td class="num"></td>
      <td><div class="act"><button class="lbtn" data-kprint="${esc(d.id)}" title="Imprimer tous les documents du kit" aria-label="Imprimer le kit ${esc(d.titre)}">${ICON.print}Imprimer</button><button class="lbtn" data-ksend="${esc(d.id)}" title="Envoyer tous les documents du kit" aria-label="Envoyer le kit ${esc(d.titre)}">${ICON.mail}Envoyer</button></div></td></tr>`;
    const [k,lab]=kind(d.ext), href=hrefOf(d.chemin);
    return `<tr data-row="${esc(d.chemin)}"><td class="col-actions">${thumbHtml(d,'thumb')}</td>
      <td class="t"><a href="${href}" target="_blank" rel="noopener">${hl(d.titre,ts)}</a>${d.modele?'<span class="badge accent">Modèle à remplir</span>':''}${stBadge(d)}${isAdmin?relBadge(d):''}${favBtn('d:'+d.id)}${isAdmin&&d.epingle?' <span title="Épinglé en accueil">★</span>':''}
        <small>${showCat?esc(destName(destOf(d)))+' · ':(d.sous&&!filter.includes('/')?esc(d.sous)+' · ':'')}${esc(d.fichier)}</small>
        ${d.description?`<span class="desc">${hl(excerpt(d.description,ts),ts)}</span>`:''}
        ${TXT_ON&&ts.length&&txOf(d)&&ts.some(t=>txOf(d).includes(t))?`<span class="desc txhit">📄 « ${hl(excerpt(txRaw(d),ts,160),ts)} »</span>`:''}
        ${(d.motscles||[]).length?`<div>${(d.motscles||[]).map(m=>`<span class="badge">${hl(m,ts)}</span>`).join('')}</div>`:''}</td>
      <td class="num">${d.version?`<span class="badge">v${esc(d.version)}</span>`:''}</td>
      <td class="num">${docDate(d.date)}</td>
      <td><div class="act">
        ${d.modele?`<button class="lbtn" data-fillword="${esc(d.id)}" title="Remplir ce modèle">${ICON.pen}Remplir</button>`:''}
        ${printable(d)?`<button class="lbtn" data-print="${esc(d.chemin)}" aria-label="Imprimer ${esc(d.titre)}">${ICON.print}Imprimer</button>`:''}
        <button class="lbtn" data-send="${esc(d.chemin)}" aria-label="Envoyer ${esc(d.titre)} par mail">${ICON.mail}Envoyer</button>
        <a class="iconbtn" href="${href}" target="_blank" rel="noopener" title="Ouvrir" aria-label="Ouvrir ${esc(d.titre)}">${ICON.open}</a>
        <button class="lbtn more" data-more="${esc(d.chemin)}" title="${isAdmin?'Modifier, nouvelle version, archiver…':'Plus d’actions'}" aria-label="${isAdmin?'Gérer':'Plus d’actions pour'} ${esc(d.titre)}" aria-haspopup="menu">${svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>')}${isAdmin?'Gérer':'Plus'}</button>
      </div></td></tr>`; };
  const rows=list.map(rowOf).join(''), home=!ts.length&&filter==='recent';
  const pt=$('#pagetitle'); if(pt&&tab==='docs'){ pt.hidden=home; pt.textContent='Documents'; }
  p.innerHTML=`${home?homeHead():''}
    <div class="bigsearch">${ICON.search}<input class="in" id="q" type="search" placeholder="Rechercher un document ou un formulaire… (touche /)" value="${esc(query)}" autocomplete="off" aria-label="Rechercher un document"></div>
    <label class="check srch-txt"><input type="checkbox" id="qtxt" ${TXT_ON?'checked':''}> 📄 Chercher aussi dans le texte des documents <small>(plus lent)</small></label>
    ${isAdmin?`<div class="adminbar">
      <div class="ab-txt"><b>Vous modifiez</b><span>Ajoutez, rangez ou modifiez. Astuce : vous pouvez aussi glisser des fichiers n’importe où sur cette page.</span></div>
      <div class="ab-acts"><button class="primary" data-a="adddocs">${ICON.plus}Ajouter un document</button><button class="secondary" data-a="addlink">${ICON.plus}Ajouter un lien</button><button class="secondary" data-a="addcat">${ICON.plus}Nouvelle catégorie</button>
      <details class="ab-more"><summary class="secondary">Outils</summary><div class="ab-menu">
        <button data-a="hasprep"><b>🏅 Préparer l’évaluation HAS</b><small>Relier les documents aux critères du référentiel, voir ce qui manque</small></button>
        <button data-a="dashboard"><b>📊 Tableau de bord</b><small>À surveiller, statistiques d’utilisation, documents les moins utilisés</small></button>
        <button data-a="backup"><b>💾 Sauvegarde</b><small>Télécharger une sauvegarde complète, ou en restaurer une</small></button>
        <button data-a="journal"><b>📜 Journal des modifications</b><small>Qui a ajouté, modifié ou archivé quoi, et quand</small></button>
        <button data-a="archives"><b>🗄️ Archives</b><small>Anciennes versions et documents retirés : consulter, comparer, restaurer</small></button>
        <button data-a="txsetup"><b>🔎 Recherche dans le texte</b><small>Préparer la recherche dans le contenu des documents</small></button>
        <button data-a="compare"><b>Comparer deux documents</b><small>Deux versions dans le dossier ? Côte à côte, différences encadrées, puis choisir laquelle garder</small></button>
        <button data-a="inventaire"><b>Exporter l’inventaire</b><small>Tous les documents et formulaires, avec version et dates (tableur ou PDF)</small></button>
        <button data-a="wizard"><b>Assistant de démarrage</b><small>Revoir la structure, l’équipe, les catégories, les modèles, le mail</small></button>
        <button data-a="checks"><b>Vérifications du poste</b><small>Navigateur, autorisation, dossier synchronisé : tester, expliquer, copier pour l’informatique</small></button>
        <button data-a="rescan"><b>Actualiser depuis le dossier</b><small>Si des fichiers ont été ajoutés ou déplacés directement dans le dossier</small></button>
        ${DATA.documents.some(needThumb)?`<button data-a="thumbs"><b>Créer les miniatures</b><small>Pour les documents qui n’ont pas encore d’image</small></button>`:`<button data-a="rethumbs"><b>Refaire les miniatures</b><small>Si les images des documents ne correspondent plus</small></button>`}
      </div></details></div></div>`:''}
    ${isAdmin&&CF_COPIES.length?cfNoticeHTML():''}
    ${home?startHTML()+renderFavs()+renderPinned()+renderHome():''}
    <div class="panel"${home?' hidden':''}>
      <div class="listhead"><h2 class="sec">${title}</h2>${filter!=='kits'||ts.length?`<div class="viewtoggle" role="group" aria-label="Affichage"><button data-view="liste" aria-pressed="${view==='liste'}">${svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>')}Liste</button><button data-view="vignettes" aria-pressed="${view==='vignettes'}">${svg('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="9"/><rect x="3" y="15" width="7" height="6"/><rect x="14" y="15" width="7" height="6"/>')}Vignettes</button></div>`:''}</div>
      ${!ts.length&&filter!=='recent'&&filter!=='kits'&&isAdmin?(filter.includes('/')?`<div class="row"><button class="ghost danger" data-a="delsous">Supprimer le sous-dossier</button></div>`:`<div class="row"><button class="ghost" data-a="addsous">${ICON.plus}Nouveau sous-dossier</button><button class="ghost" data-a="renamecat">Renommer la catégorie</button><button class="ghost" data-a="emojicat">Changer l’emoji</button><button class="ghost danger" data-a="delcat">Supprimer la catégorie</button></div>`):''}
      ${!ts.length&&filter==='kits'?renderKits():view==='vignettes'&&list.some(x=>!x.kind)?`<div class="grid">${list.filter(x=>!x.kind).map(d=>gridCard(d,ts,showCat)).join('')}</div>${list.some(x=>x.kind)?`<div class="tablebox mt-m"><table class="docs"><tbody>${list.filter(x=>x.kind).map(rowOf).join('')}</tbody></table></div>`:''}`:`<div class="tablebox">${list.length?`<table class="docs"><thead><tr><th scope="col"><span class="sr">Type</span></th>${th('titre','Document')}${th('version','Version')}${th('date','Date')}<th class="right" scope="col">Actions</th></tr></thead><tbody>${rows}</tbody></table>`
        :(ts.length?illu('search','Rien trouvé pour cette recherche','Essayez un autre mot, ou moins de mots. La recherche regarde aussi les descriptions et les mots-clés.')
          :DATA.documents.length?illu('shelf','Rien ici pour l’instant',isAdmin?'Ajoutez un document avec le bouton « Ajouter un document », ou glissez un fichier sur la page.':'Les documents de cette catégorie apparaîtront ici.')
          :illu('shelf','Votre bibliothèque est encore vide',isAdmin?'Commencez par « Ajouter un document ».':'Un admin peut ajouter les premiers documents (bouton « Accès admin »).'))}</div>`}
    </div>`;
  renderSide();
}
/* Menu latéral : catégories */
const FOLDER='<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>';
function renderSide(){
  const el=$('#sidecats'); if(!el) return;
  const searching=!!query.trim(), on=id=>tab==='docs'&&filter===id&&!searching;
  el.innerHTML=`<div class="sidelab">Catégories</div>`
    +(DATA.kits.length||isAdmin?`<button class="catbtn" data-filter="kits" aria-pressed="${on('kits')}" title="Lots de documents à imprimer ou envoyer ensemble"><span class="cemo" aria-hidden="true">🧰</span><span class="name">Kits de documents</span><span class="count">${DATA.kits.length}</span></button>`:'')
    +cats().filter(c=>isAdmin||filter===c.id||filter.startsWith(c.id+'/')||docs().some(d=>d.categorie===c.id)||formItems().some(f=>f.categorie===c.id)).map(c=>{ const open=tab==='docs'&&!searching&&(filter===c.id||filter.startsWith(c.id+'/'));
      return `<button class="catbtn" style="${catColVars(c.id)}" data-filter="${esc(c.id)}" aria-pressed="${on(c.id)}" aria-expanded="${open}"><span class="cemo" aria-hidden="true">${catEmoji(c)}</span><span class="name">${esc(c.nom)}</span>${(()=>{ const nd=docs().filter(d=>d.categorie===c.id).length, nf=formItems().filter(f=>f.categorie===c.id).length, t=[nd?`${nd} document${nd>1?'s':''}`:'',nf?`${nf} formulaire${nf>1?'s':''}`:''].filter(Boolean).join(' et ')||'vide';
        return `<span class="count" title="${t}"><span class="sr">${t}</span><span aria-hidden="true">${nd}${nf?`<span class="cf">+${nf}${ICON.pen}</span>`:''}</span></span>`; })()}</button>`
      +(open?sousOf(c).map(sub=>`<button class="catbtn sub" style="${catColVars(c.id)}" data-filter="${esc(c.id+'/'+sub)}" aria-pressed="${on(c.id+'/'+sub)}"><span class="name">${esc(sub)}</span><span class="count">${docs().filter(d=>d.categorie===c.id&&d.sous===sub).length}</span></button>`).join(''):''); }).join('');
  const home=document.querySelector('nav.top [data-tab=docs]');
  if(home){ if(tab==='docs'&&(filter==='recent'||searching)) home.setAttribute('aria-current','page'); else if(tab==='docs') home.removeAttribute('aria-current'); }
}
$('#sidecats').addEventListener('click',e=>{ const f=e.target.closest('[data-filter]'); if(!f) return;
  filter=f.dataset.filter; query=''; if(tab!=='docs') setTab('docs'); renderDocs(); window.scrollTo({top:0}); });
$('#p-docs').addEventListener('change',async e=>{ if(e.target.id!=='qtxt') return; TXT_ON=e.target.checked;
  if(TXT_ON){ await txLoad(); if(!Object.keys(TXT).length){ toast(isAdmin?'Préparez d’abord la recherche dans le texte (Outils)':'La recherche dans le texte n’est pas encore préparée : demandez à l’admin'); } }
  renderDocs(); const qi=$('#q'); if(qi){ qi.focus(); const n=qi.value.length; try{ qi.setSelectionRange(n,n); }catch(_){} } });
$('#p-docs').addEventListener('input',e=>{ if(e.target.id==='q'){ query=e.target.value; const pos=e.target.selectionStart; renderDocs(); const qi=$('#q'); qi.focus(); try{ qi.setSelectionRange(pos,pos); }catch(_){} } });
$('#p-docs').addEventListener('click',e=>{
  const f=e.target.closest('[data-filter]'); if(f){ e.preventDefault(); filter=f.dataset.filter; query=''; renderDocs(); window.scrollTo({top:0}); return; }
  const s=e.target.closest('[data-sort]'); if(s){ const k=s.dataset.sort; if(sortKey===k) sortDir=-sortDir; else { sortKey=k; sortDir=k==='titre'?1:-1; } renderDocs(); return; }
  const vw=e.target.closest('[data-view]'); if(vw){ setView(vw.dataset.view); return; }
  const fi=e.target.closest('[data-fill]'); if(fi){ e.preventDefault(); openForm(fi.dataset.fill); return; }
  const kitOf=attr=>{ const el=e.target.closest(`[data-${attr}]`); return el?DATA.kits.find(k=>k.id===el.dataset[attr]):null; };
  let k;
  if((k=kitOf('kprint'))) return kitPrint(k);
  if((k=kitOf('ksend'))) return sendMany(k.titre,kitDocs(k));
  if((k=kitOf('kdl'))) return kitDownload(k);
  if((k=kitOf('kedit'))) return editKit(k.id);
  if(e.target.closest('[data-knew]')) return editKit(null);
  const fw=e.target.closest('[data-fillword]'); if(fw){ const d=docById(fw.dataset.fillword); d&&fillWord(d); return; }
  const byPath=attr=>{ const el=e.target.closest(`[data-${attr}]`); return el?DATA.documents.find(x=>x.chemin===el.dataset[attr]):null; };
  let d;
  if((d=byPath('print'))) return printDocAny(d);
  if((d=byPath('copy'))) return copyDoc(d);
  if((d=byPath('send'))) return sendDoc(d);
  if((d=byPath('edit'))) return editDoc(d);
  if((d=byPath('more'))) return moreMenu(e.target.closest('[data-more]'),d);
  const a=e.target.closest('[data-a]'); if(!a) return;
  const dm=a.closest('details.ab-more'); if(dm) dm.open=false; // le menu Outils se referme : il ne reste pas par-dessus la fenêtre ouverte
  ({hasprep:()=>hasPrep(),dashboard:()=>dashboard(),backup:()=>backup(),journal:()=>journal(),archives:()=>archives(),txsetup:()=>txSetup(),compare:()=>comparer(),inventaire:()=>inventaire(),wizard:()=>wizOpen(),checks:()=>openChecks(),adddocs:()=>addDocs(),addlink:()=>editLink(null),addcat:addCat,emojicat:emojiCat,rescan:rescan,renamecat:renameCat,delcat:delCat,addsous:addSous,delsous:delSous,thumbs:makeAllThumbs,rethumbs:()=>askConfirm('Refaire toutes les miniatures ?','Librejo relit chaque document du dossier pour refaire sa miniature. Cela peut prendre une minute.','Refaire',()=>makeAllThumbs(false,true))})[a.dataset.a]();
});

/* Imprimer en un clic : le fichier est lu dans le dossier, puis la fenêtre d'impression s'ouvre */
async function printDoc(d){
  let file;
  try{ file=await readRel(d.chemin); }
  catch(e){ if(e instanceof Cancel) return; if(e&&e.message==='nofsa'){ window.open(hrefOf(d.chemin),'_blank'); toast('Document ouvert : Ctrl+P pour imprimer'); return; } const m=fsErr(e); m&&toast(m); return; }
  printBlob(new Blob([file],{type:MIME[d.ext]||file.type}),d.ext==='pdf');
}

/* Modifier une copie : l'original reste intact dans le dossier */
async function copyDoc(d){
  let file;
  try{ file=await readRel(d.chemin); }catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
  const name=`${fileSafe(d.titre)}_copie_${today()}.${d.ext}`;
  downloadBlob(new Blob([file],{type:MIME[d.ext]||file.type}),name);
  openModal(`<h3 id="modal-title">Copie prête à modifier</h3>
    <p>La copie <b>${esc(name)}</b> est dans vos <b>Téléchargements</b>. L'original dans le dossier n'est pas modifié.</p>
    <ol class="how"><li>Cliquez sur la copie dans la barre de téléchargement du navigateur : elle s'ouvre dans ${['doc','docx','odt','rtf'].includes(d.ext)?'Word':d.ext==='pdf'?'le lecteur PDF (les champs de formulaire peuvent se remplir directement)':'le logiciel habituel'}.</li>
      <li>Modifiez et enregistrez.</li><li>Pour l'envoyer : dans Outlook, <b>Nouveau message → Joindre</b>, puis choisissez la copie dans Téléchargements.</li>
      <li>Pensez à supprimer la copie si elle contient des données de patient.</li></ol>
    <div class="btns"><button class="primary alt" id="cp-mail">${ICON.mail}Ouvrir un nouveau mail Outlook</button><button class="secondary" data-close>Fermer</button></div>`);
  $('#cp-mail').onclick=()=>{ closeModal(); mailCompose({to:[envoi[0]].filter(Boolean),subject:`Librejo – ${d.titre}`,body:'Bonjour,\n\nVeuillez trouver ci-joint : '+d.titre+'.\n\nCordialement',files:[]}); };
}

/* ---------- Envoi par mail : Outlook (application) avec pièces jointes, ou Outlook web ---------- */
const b64utf8=s=>btoa(unescape(encodeURIComponent(s)));
async function blobB64(b){ const buf=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<buf.length;i+=0x8000) s+=String.fromCharCode.apply(null,buf.subarray(i,i+0x8000)); return btoa(s).replace(/.{76}/g,'$&\r\n'); }
const hdr=s=>/^[\x20-\x7e]*$/.test(s)?s:`=?UTF-8?B?${b64utf8(s)}?=`;
async function makeEml({to,subject,body,files,from}){
  const bd='----=_Librejo_'+rid();
  let m=`${from?`From: ${from}\r\n`:''}To: ${to.join(', ')}\r\nSubject: ${hdr(subject)}\r\nX-Unsent: 1\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${bd}"\r\n\r\n`;
  m+=`--${bd}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64utf8(body).replace(/.{76}/g,'$&\r\n')}\r\n`;
  for(const f of files){ const n=hdr(f.name); m+=`--${bd}\r\nContent-Type: ${f.type||'application/octet-stream'}; name="${n}"\r\nContent-Disposition: attachment; filename="${n}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${await blobB64(f)}\r\n`; }
  return new Blob([m+`--${bd}--\r\n`],{type:'message/rfc822'});
}
/* Ouvre le mail selon le réglage : « outlook » = fichier .eml (Outlook s'ouvre avec destinataires, objet et pièces jointes) ; « web » = Outlook dans le navigateur */
/* Sans pièce jointe : lien mailto, Outlook (application de messagerie par défaut) s'ouvre directement, sans fichier.
   Avec pièces jointes : fichier .eml ; avec le réglage « Toujours ouvrir les fichiers de ce type », Outlook s'ouvre tout seul. */
const mailtoUrl=m=>{ const q=[]; if(m.subject) q.push('subject='+encodeURIComponent(m.subject)); if(m.body) q.push('body='+encodeURIComponent(m.body.replace(/\r?\n/g,'\r\n')));
  return 'mailto:'+m.to.map(a=>encodeURIComponent(a).replace(/%40/g,'@')).join(';')+(q.length?'?'+q.join('&'):''); };
function openMailto(url){ const a=document.createElement('a'); a.href=url; a.style.display='none'; document.body.appendChild(a); a.click(); a.remove(); document.documentElement.dataset.lastMail=url.slice(0,4000); }
const EML_TIP='docubus-astuce-eml';
function emlTip(){
  let done=false; try{ done=localStorage.getItem(EML_TIP)==='1'; }catch(e){}
  if(done||document.getElementById('emltip')) return;
  const t=document.createElement('div'); t.id='emltip'; t.setAttribute('role','note');
  t.innerHTML=`<b>Astuce : ouvrir Outlook sans cliquer sur le fichier</b>
    <ol><li>Dans les téléchargements du navigateur (en haut à droite), faites un <b>clic droit</b> sur le fichier <b>.eml</b>.</li>
    <li>Choisissez <b>« Toujours ouvrir les fichiers de ce type »</b>.</li></ol>
    <span>Ensuite, Outlook s'ouvrira tout seul à chaque envoi. À faire une fois sur ce poste.</span>
    <span>Si Outlook place votre signature au-dessus du texte : dans Outlook, Fichier › Options › Courrier › Signatures, choisissez <b>(aucune)</b> pour les nouveaux messages.</span>
    <div class="row"><button class="primary alt" data-tip="ok">C'est réglé</button><button class="secondary" data-tip="later">Plus tard</button></div>`;
  t.onclick=e=>{ const b=e.target.closest('[data-tip]'); if(!b) return; if(b.dataset.tip==='ok'){ try{ localStorage.setItem(EML_TIP,'1'); }catch(_){} } t.remove(); };
  document.body.appendChild(t); setTimeout(()=>t.remove(),30000);
}
const FROM_KEY='docubus-expediteur';
function senderPref(){ let v=''; try{ v=localStorage.getItem(FROM_KEY)||''; }catch(e){} return envoi.includes(v)?v:''; }
function senderHTML(){ const v=senderPref(); return `<label class="row fromline"><span>Envoyer depuis</span><select class="in" data-from><option value="">Compte Outlook par défaut</option>${envoi.map(a=>`<option value="${esc(a)}" ${a===v?'selected':''}>${esc(a)}</option>`).join('')}</select></label>`; }
document.addEventListener('change',e=>{ if(e.target.matches&&e.target.matches('[data-from]')){ try{ localStorage.setItem(FROM_KEY,e.target.value); }catch(_){} } });
async function mailCompose(m,opts={}){
  const mode=PAR.mail||'outlook';
  m.from=m.from||senderPref();
  if(mode==='outlook'){
    if(!(m.files&&m.files.length)){
      const url=mailtoUrl(m);
      if(url.length<=1900){ openMailto(url); toast('Ouverture d’Outlook…'); return 'mailto'; }
      toast('Trop d’adresses pour une ouverture directe : un fichier .eml est préparé');
    }
    const eml=await makeEml(m), emlName='Mail-'+fileSafe((m.subject||'message').replace(/^Librejo – /,'').replace(/[–—]/g,' ')).slice(0,60)+'.eml';
    downloadBlob(eml,emlName); mailCompose.lastEml=emlName;
    toast('Mail prêt : cliquez dessus dans la barre de téléchargement');
    setTimeout(emlTip,600);
    return 'outlook';
  }
  window.open(composeUrl(m.to,m.subject,m.body),'_blank','noopener');
  return 'web';
}
function mailHelp(nFiles,sensitive){
  return (PAR.mail||'outlook')==='outlook'
    ?(nFiles?`<p>Un fichier <b>.eml</b> est téléchargé : cliquez dessus (barre de téléchargement). <b>Outlook s'ouvre avec le mail prêt</b>, pièce jointe comprise : vérifiez et envoyez. <small class="hint">Astuce : clic droit sur le fichier › « Toujours ouvrir les fichiers de ce type », et Outlook s'ouvrira tout seul.</small></p>`:`<p><b>Outlook s'ouvre directement</b> avec le mail prêt : vérifiez et envoyez.</p>`)+`${sensitive?'<div class="notice">Après l\'envoi, supprimez le fichier .eml'+(nFiles?' et les PDF':'')+' du dossier Téléchargements (données de santé).</div>':''}`
    :`<p>Outlook s'ouvre dans le navigateur avec destinataires, objet et texte.${nFiles?' Joignez les fichiers téléchargés (bouton Joindre).':''}</p>`;
}
async function sendDoc(d){
  sendDialog(`Envoyer « ${d.titre} »`,'',1,async to=>{
    const subj=`Librejo – ${d.titre}`, body=`Bonjour,\n\nVeuillez trouver ci-joint : ${d.titre}${d.version?' (version '+d.version+')':''}.\n\nCordialement`;
    let files=[];
    if((PAR.mail||'outlook')==='outlook'){
      try{ const f=await readRel(d.chemin); files=[new File([f],d.fichier,{type:MIME[d.ext]||f.type})]; }
      catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
    }else{ copyText(winPath(d.chemin)); toast('Emplacement du fichier copié : collez-le dans « Joindre »'); }
    closeModal(); await mailCompose({to,subject:subj,body,files});
  });
}

/* ======================================================================
   2. ADMIN : documents, versions, descriptions, catégories
   ====================================================================== */
const ARCH='_Archives';
function catSelect(sel,id='f-cat'){ return `<select class="in" id="${id}">${cats().map(c=>`<option value="${esc(c.id)}" ${c.id===sel?'selected':''}>${esc(c.nom)}</option>`).join('')}</select>`; }
const kwParse=s=>String(s||'').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean);
/* « Cases à cocher » : un choix par ligne (une ligne peut contenir des virgules : « Paracétamol 1 g, 3 fois par jour »). */
const caseOpts=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);

/* ---------- Nommage et rangement automatiques ----------
   Nom du fichier : Titre-court_vN_AAAA-MM.ext (sans accents, espaces ni petits mots).
   Exemple : « Formulaire d'admission en cure » -> Formulaire-admission-cure_v1_2026-10.pdf
   Emplacement : Documents/<catégorie>/<sous-dossier éventuel>/ */
const STOPW=new Set(['de','du','des','la','le','les','l','d','un','une','en','et','a','au','aux','pour','par','sur','avec','dans']);
const noAcc=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
function codeName(titre){
  const w=noAcc(titre).replace(/[’']/g,' ').replace(/[^A-Za-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
  const k=w.filter((x,i)=>i===0||!STOPW.has(x.toLowerCase())), src=k.length?k:w;
  let out='';
  for(const [i,x] of src.entries()){
    const word=i===0?x.charAt(0).toUpperCase()+x.slice(1):x;
    if(out&&(out.length+word.length+1)>45) break;
    out+=(out?'-':'')+word;
  }
  return out||'Document';
}
/* Nommage des fichiers et des dossiers : règle choisie par l'admin (Réglages › Documents) */
const NOM_DEF={fichier:'{Titre}_v{version}_{AAAA}-{MM}',dossier:'{NN} {Nom}',sep:'-'};
const NOMMAGE=()=>({...NOM_DEF,...(PAR.nommage||{})});
const NOM_PRESETS=[['{Titre}_v{version}_{AAAA}-{MM}','Livret-accueil_v2_2026-11 (par défaut)'],['{AAAA}_{MM}_v{version}_{titre}','2026_11_v2_livret_accueil'],['{AAAA}-{MM}-{JJ} {Titre} v{version}','2026-11-25 Livret accueil v2'],['{TITRE}_V{version}','LIVRET_ACCUEIL_V2'],['{categorie}_{Titre}_v{version}','Accueil_Livret-accueil_v2']];
function nomWords(t,sep){ const w=codeName(t).split('-'); return w.join(sep===' '?' ':sep); }
function applyNom(pat,{titre,v,date,cat},sep){
  const [y,m]=String(date||month()).split('-'), dd=today().slice(8,10), base=nomWords(titre,sep);
  let s=String(pat||NOM_DEF.fichier).replace(/\{(\w+)\}/g,(all,k)=>({Titre:base,titre:base.toLowerCase(),TITRE:base.toUpperCase(),version:String(v||1),AAAA:y||'',AA:(y||'').slice(2),MM:m||'',JJ:dd,
    categorie:cat?nomWords(catName(splitDest(cat)[0])||'',sep):'',structure:nomWords(structure.nom||'',sep)}[k]??all));
  s=s.replace(/[\\/:*?"<>|#%]+/g,sep===' '?' ':sep).replace(/\s+/g,' ').replace(/([_-])\1+/g,'$1').replace(/^[\s._-]+|[\s._-]+$/g,'');
  return (s||'Document').slice(0,120);
}
const fileCode=(titre,v,date,cat)=>{ const n=NOMMAGE(); return applyNom(n.fichier,{titre,v,date,cat},n.sep); };
/* Relit un nom de fichier fait avec la règle de la structure : titre, version, date */
function parseByNom(base){ const n=NOMMAGE(); if(!n.fichier||n.fichier===NOM_DEF.fichier) return null;
  const parts=[]; const rx='^'+n.fichier.split(/(\{\w+\})/).map(t=>{ const m=t.match(/^\{(\w+)\}$/); if(!m) return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    parts.push(m[1]); return {version:'(\\d+)',AAAA:'(\\d{4})',AA:'(\\d{2})',MM:'(\\d{2})',JJ:'(\\d{2})'}[m[1]]||'(.+?)'; }).join('')+'$';
  const r=new RegExp(rx,'i').exec(base); if(!r) return null; const g={}; parts.forEach((k,i)=>g[k]=r[i+1]);
  const t=g.Titre||g.titre||g.TITRE; if(!t) return null;
  return {titre:t.replace(/[_-]+/g,' ').trim(),version:g.version||'',date:g.AAAA&&g.MM?`${g.AAAA}-${g.MM}`:''};
}
function folderName(nom,ordre){ const n=NOMMAGE(), base=fileSafe(nom).replace(/-/g,' ');
  return String(n.dossier||NOM_DEF.dossier).replace(/\{(\w+)\}/g,(all,k)=>({NN:pad(ordre),Nom:base,NOM:base.toUpperCase(),nom:base.toLowerCase()}[k]??all)).replace(/[\\/:*?"<>|#%]+/g,' ').replace(/\s+/g,' ').trim()||base; }
const splitDest=v=>{ const i=String(v||'').indexOf('/'); return i<0?[String(v||''),'']:[v.slice(0,i),v.slice(i+1)]; };
const destOf=d=>d.categorie+(d.sous?'/'+d.sous:'');
const sousOf=c=>(c&&c.sous||[]).slice().sort((a,b)=>a.localeCompare(b,'fr'));
const isDest=v=>{ const [c,s]=splitDest(v); const cat=DATA.categories.find(x=>x.id===c); return !!cat&&(!s||sousOf(cat).includes(s)); };
const destName=v=>{ const [c,s]=splitDest(v); return catName(c)+(s?' › '+s:''); };
const CAT_COL=[['#3f8f88','#8fd0c8'],['#c27d1f','#f0c37a'],['#4f74b0','#a9c2ee'],['#9c5a83','#e0a9ca'],['#5f8a35','#b7d68f'],['#b45a3a','#f0ad92'],['#6f5fae','#c4b8f0'],['#2f86a3','#97d2e6']];
function catColVars(id){ const i=DATA.categories.findIndex(c=>c.id===id); if(i<0) return ''; const [d,l]=CAT_COL[i%CAT_COL.length]; return `--cc:${d};--ccl:${l}`; }
function destOptions(sel){ return cats().map(c=>`<option value="${esc(c.id)}" ${sel===c.id?'selected':''}>${esc(c.nom)}</option>`
  +sousOf(c).map(s=>`<option value="${esc(c.id+'/'+s)}" ${sel===c.id+'/'+s?'selected':''}>${esc(c.nom)} › ${esc(s)}</option>`).join('')).join(''); }
const stemW=w=>w.replace(/(s|x)$/,'');
const wordsOf=s=>noAcc(s).toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>2&&!STOPW.has(w)).map(stemW);
/* Propose le dossier le plus proche du titre (mots en commun avec le nom du sous-dossier ou de la catégorie) */
function suggestDest(titre,onlyCat){
  const tw=new Set(wordsOf(titre)); if(!tw.size) return null;
  let best=null,score=0;
  for(const c of cats()){
    if(onlyCat&&c.id!==onlyCat) continue;
    const cs=wordsOf(c.nom).filter(w=>tw.has(w)).length;
    if(cs&&cs>score){ best=c.id; score=cs; }
    for(const sub of sousOf(c)){ const n=wordsOf(sub).filter(w=>tw.has(w)).length; if(n&&n*2+cs>score){ best=c.id+'/'+sub; score=n*2+cs; } }
  }
  return best;
}
const subName=n=>{ const t=String(n||'').replace(/[\\/:*?"<>|#%]+/g,' ').replace(/\s+/g,' ').trim().replace(/^[._~$]+/,''); return t?t.charAt(0).toUpperCase()+t.slice(1):''; };
async function createSous(c,nom){
  const s=subName(nom); if(!s){ toast('Nom de sous-dossier invalide.'); return null; }
  if(sousOf(c).some(x=>x.toLowerCase()===s.toLowerCase())){ toast('Ce sous-dossier existe déjà.'); return c.id+'/'+sousOf(c).find(x=>x.toLowerCase()===s.toLowerCase()); }
  const ok=await run(async()=>{ await dirAt(['Documents',c.id,s],'readwrite',true); (c.sous=c.sous||[]).push(s); await saveData(); },'Sous-dossier « '+s+' » créé');
  return ok?c.id+'/'+s:null;
}

function addDocs(initFiles,initDest){
  if(!cats().length){ toast("Créez d'abord une catégorie."); return; }
  let explicit=!!(initDest&&isDest(initDest))||isDest(filter);
  let def=initDest&&isDest(initDest)?initDest:(isDest(filter)?filter:cats()[0].id);
  let picked=[];
  const NEW='__new__';
  const opts=sel=>destOptions(sel)+`<option value="${NEW}">＋ Nouveau sous-dossier…</option>`;
  const guess=p=>{ if(explicit&&def.includes('/')) return def; return suggestDest(p.titre,explicit?splitDest(def)[0]:null)||def; };
  const extFor=p=>(extOf(p.file.name)||'bin').toLowerCase();
  const target=p=>`${destName(p.dest)} › ${fileCode(p.titre,1,null,p.dest)}.${extFor(p)}`;
  const addFiles=list=>{ [...list].forEach(f=>{ if(!f.size&&!f.type) return; const pn=parseName(f.name.replace(/\.[^.]+$/,'')); const p={file:f,titre:pn.titre.charAt(0).toUpperCase()+pn.titre.slice(1),description:'',motscles:'',manual:false}; p.dest=guess(p); picked.push(p);
    if(tpOK(extFor(p))){ p.tp={nom:false,num:false,logo:false,pied:false}; p.det=null; tpDetect(f).then(D=>{ p.det=D; p.tp=tpDefaults(D); if(picked.includes(p)&&$('#ad-list')) draw(); }); } }); };
  const draw=()=>{
    const n=picked.length;
    $('#ad-drop').classList.toggle('compact',n>0);
    $('#ad-drop b').textContent=n?'Ajouter d’autres fichiers':'Glissez vos fichiers ici';
    $('#ad-all').hidden=n<2; if(n>1) $('#ad-allsel').innerHTML=`<option value="">— choisir —</option>`+destOptions('');
    $('#ad-list').innerHTML=picked.map((p,i)=>`<div class="card addcard" data-i="${i}">
      <div class="ad-file"><span>📄 ${esc(p.file.name)} · ${sizeTxt(p.file.size)}${p.modifie?' · <b>✓ version modifiée</b>':''}</span><span class="row gap-s"><button type="button" class="ghost sm" data-modif>${ICON.pen}Modifier avant d’ajouter</button><button type="button" class="ghost sm" data-rm aria-label="Retirer ce fichier">Retirer</button></span></div>
      ${p.edit?`<div class="ad-modif" data-redz><p>Une copie est dans vos <b>Téléchargements</b>. Ouvrez-la dans ${editorOf(extFor(p))}, modifiez, enregistrez, puis déposez-la ici.</p>
        <label class="secondary sm self-start">${ICON.up}Choisir le fichier modifié<input type="file" data-refile hidden></label></div>`:''}
      <div class="fieldgrid"><label class="field"><span>Titre affiché</span><input class="in" data-k="titre" value="${esc(p.titre)}"></label>
        <label class="field"><span>Rangé dans</span><select class="in" data-k="dest">${opts(p.dest)}</select></label>
        <label class="field"><span>Statut</span><select class="in" data-k="statut"><option value="" ${!p.statut?'selected':''}>✅ Publié (visible par l’équipe)</option><option value="brouillon" ${p.statut==='brouillon'?'selected':''}>📝 Brouillon (invisible pour l’équipe)</option><option value="avalider" ${p.statut==='avalider'?'selected':''}>⏳ À valider par la direction</option></select></label>
        <label class="field"><span>⏰ Relecture</span><select class="in" data-k="relireMois">${REL_OPTS.map(([v,l])=>`<option value="${v}" ${(+p.relireMois||0)===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
      <div class="ad-sub" hidden><input class="in" data-subname placeholder="Nom du sous-dossier, ex. Cures"><button type="button" class="secondary" data-subok>Créer</button></div>
      <details><summary>Aider la recherche (facultatif)</summary>
        <div class="fieldgrid"><label class="field wide"><span>Description</span><textarea class="in" data-k="description" rows="2" placeholder="En une phrase : à quoi sert ce document ?">${esc(p.description)}</textarea></label>
        <label class="field wide"><span>Mots-clés <small>(séparés par des virgules)</small></span><input class="in" data-k="motscles" value="${esc(p.motscles)}" placeholder="ex. hébergement, orientation, 115"></label></div></details>
      ${p.det&&p.det.scan?`<div class="ad-scan">📷 PDF scanné, sans texte : la recherche ne trouvera que son titre et sa description. <button type="button" class="secondary sm" data-ocr ${p.ocring?'disabled':''}>${p.ocring?'Lecture…':'🔎 Lire le scan (OCR)'}</button>${p.ocrDone?' <b>✓ description remplie</b>':''}</div>`:''}
      ${tpOK(extFor(p))?`<details class="tp"${p.tpOpen?' open':''}><summary>🏷️ Marquer le document${p.det?(' : '+tpSum(p.tp)):' (lecture…)'}</summary>
        ${p.det?tpOptsHTML(p.tp,p.det,extFor(p)):'<p class="hint">Lecture du document…</p>'}<p class="hint">Ajouté à la copie rangée dans Librejo ; le fichier de votre ordinateur ne change pas.</p></details>`:''}
      <p class="hint">Copié sous le nom : <code data-prev>${esc(target(p))}</code></p></div>`).join('');
    const ok=$('#ad-ok'); ok.disabled=!n; ok.textContent=n>1?`Ajouter les ${n} documents`:'Ajouter le document';
  };
  openModal(`<h3 id="modal-title">Ajouter un document</h3>
    <p class="hint">PDF, Word, image… Le fichier est copié dans le dossier de la structure et renommé proprement ; l’original ne change pas.</p>
    <label class="dropzone ad-drop" id="ad-drop">${svg('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>')}<b>Glissez vos fichiers ici</b><span>ou cliquez pour les choisir sur l’ordinateur</span><input type="file" id="ad-files" multiple hidden></label>
    <div class="ad-all" id="ad-all" hidden><span>Tout ranger dans :</span><select class="in" id="ad-allsel"></select></div>
    <div class="stack" id="ad-list"></div>
    <details class="hint"><summary>Astuce : modèles Word à remplir</summary>Un document Word qui contient des champs entre accolades, comme {Destinataire}, devient un modèle : au moment de l’utiliser, Librejo demandera de remplir ces champs.</details>
    <div class="ad-foot"><button class="ghost" data-close>Annuler</button><button class="primary" id="ad-ok" disabled>Ajouter le document</button></div>`,'wide');
  modalGuard=()=>picked.length?`Fermer sans ajouter ${picked.length>1?`les ${picked.length} fiches préparées`:'la fiche préparée'} ? Les titres et les rangements choisis seront perdus.`:'';
  $('#ad-files').onchange=e=>{ addFiles(e.target.files); e.target.value=''; draw(); };
  const dz=$('#ad-drop');
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{ e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); }));
  dz.addEventListener('drop',e=>{ addFiles(e.dataTransfer.files); draw(); });
  $('#ad-allsel').onchange=e=>{ const v=e.target.value; if(!v) return; picked.forEach(p=>{ p.dest=v; p.manual=true; }); def=v; explicit=true; draw(); };
  if(initFiles&&initFiles.length){ addFiles(initFiles); }
  draw();
  const upd=(card,p)=>{ card.querySelector('[data-prev]').textContent=target(p); };
  const list=$('#ad-list');
  list.addEventListener('click',async e=>{ const c=e.target.closest('[data-i]'); if(!c) return; const i=+c.dataset.i;
    if(e.target.closest('[data-rm]')){ picked.splice(i,1); draw(); return; }
    if(e.target.closest('[data-ocr]')){ const p=picked[i]; p.ocring=true; draw();
      try{ const r=await ocrPdf(p.file); const txt=r.lines.map(l=>l.t).join(' ').replace(/\s+/g,' ').trim();
        if(!txt) toast('Aucun texte lisible trouvé'); else { if(!p.description.trim()) p.description=txt.slice(0,280).replace(/\s\S*$/,'')+(txt.length>280?'…':''); p.ocrDone=true; p.tpOpen=p.tpOpen; toast('Texte lu : description proposée, à relire'); } }
      catch(err){ toast('Lecture impossible : '+(err.message||err)); }
      p.ocring=false; draw(); return; }
    if(e.target.closest('[data-modif]')){ const p=picked[i]; downloadBlob(p.file,p.file.name.replace(/(\.[^.]+)?$/,'_a-modifier$1')); p.edit=true; draw(); return; }
    if(e.target.closest('[data-subok]')){ const p=picked[i]; const cat=DATA.categories.find(x=>x.id===splitDest(p.dest)[0])||cats()[0];
      const v=await createSous(cat,c.querySelector('[data-subname]').value); if(!v) return; p.dest=v; p.manual=true; renderSide(); draw(); } });
  const refile=(i,f)=>{ if(!f) return; const p=picked[i]; p.file=f; p.edit=false; p.modifie=true; if(tpOK(extFor(p))){ p.det=null; tpDetect(f).then(D=>{ p.det=D; p.tp=tpDefaults(D); if($('#ad-list')) draw(); }); } draw(); toast('Version modifiée prise en compte'); };
  list.addEventListener('toggle',e=>{ const c=e.target.closest&&e.target.closest('[data-i]'); if(c&&e.target.matches('details.tp')) picked[+c.dataset.i].tpOpen=e.target.open; },true);
  list.addEventListener('change',e=>{ if(e.target.matches('[data-tp]')){ const c=e.target.closest('[data-i]'), p=picked[+c.dataset.i]; p.tp[e.target.dataset.tp]=e.target.checked; tpSave(p.tp);
      const s=c.querySelector('details.tp summary'); if(s) s.textContent='🏷️ Marquer le document : '+tpSum(p.tp); return; }
    if(e.target.matches('[data-refile]')) refile(+e.target.closest('[data-i]').dataset.i,e.target.files[0]); });
  list.addEventListener('dragover',e=>{ if(e.target.closest('[data-redz]')){ e.preventDefault(); e.stopPropagation(); } });
  list.addEventListener('drop',e=>{ const z=e.target.closest('[data-redz]'); if(!z) return; e.preventDefault(); e.stopPropagation(); refile(+z.closest('[data-i]').dataset.i,e.dataTransfer.files[0]); });
  list.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.matches('[data-subname]')){ e.preventDefault(); e.target.closest('[data-i]').querySelector('[data-subok]').click(); } });
  list.addEventListener('input',e=>{ const c=e.target.closest('[data-i]'), k=e.target.dataset.k; if(!c||!k) return; const p=picked[+c.dataset.i];
    if(k==='dest'){ if(e.target.value===NEW){ e.target.value=p.dest; const s=c.querySelector('.ad-sub'); s.hidden=false; s.querySelector('input').focus(); return; } p.dest=e.target.value; p.manual=true; }
    else{ p[k]=e.target.value; if(k==='titre'&&!p.manual){ p.dest=guess(p); c.querySelector('[data-k=dest]').value=p.dest; } }
    upd(c,p); });
  $('#ad-ok').onclick=async()=>{
    if(!picked.length){ toast('Choisissez au moins un fichier.'); return; }
    if(picked.some(p=>!p.titre.trim())){ toast('Chaque document doit avoir un titre.'); return; }
    const b=$('#ad-ok'); b.disabled=true; b.textContent='Copie dans le dossier…';
    const ok=await run(async()=>{
      for(const p of picked){
        const ext=extFor(p), [cat,sous]=splitDest(p.dest);
        const rel=await uniqueRel(`Documents/${p.dest}`,fileCode(p.titre,1,null,p.dest),ext);
        const tp=p.det&&p.tp||null, f=tp?await stampFile(p.file,tp,{fichier:rel.split('/').pop(),version:1,date:today(),det:p.det}):p.file;
        await writeRel(rel,f);
        const nd={id:'d'+rid(),chemin:rel,fichier:rel.split('/').pop(),titre:p.titre.trim(),description:p.description.trim(),motscles:kwParse(p.motscles),categorie:cat,sous,ext,version:'1',date:month(),ajoute:today(),taille:f.size,historique:[]};
        if(tp&&(tp.nom||tp.num)) nd.tampon={nom:!!tp.nom,num:!!tp.num};
        if(p.statut) nd.statut=p.statut;
        if(+p.relireMois){ nd.relireMois=+p.relireMois; nd.relu=today(); nd.relire=addMonths(today(),nd.relireMois); }
        await detectModel(nd,f); await saveThumb(nd,f); DATA.documents.push(nd);
      }
      await saveData();
    },`C’est rangé ! ${picked.length} document${picked.length>1?'s':''} ajouté${picked.length>1?'s':''}`);
    if(ok){ picked.forEach(p=>jlog('Ajout',p.titre.trim(),destName(p.dest)+(p.tp&&p.det&&tpSum(p.tp)!=='rien'?' · marqué : '+tpSum(p.tp):''))); txRefresh(DATA.documents.slice(-picked.length));
      closeModal(); const ds=[...new Set(picked.map(p=>p.dest))]; filter=ds.length===1?ds[0]:splitDest(ds[0])[0]; renderDocs(); } else { draw(); }
  };
}
function editDoc(d){
  openModal(`<h3 id="modal-title">${esc(d.titre)}</h3>
    <div class="fieldgrid">
      <label class="field"><span>Titre</span><input class="in" id="e-titre" value="${esc(d.titre)}"></label>
      <label class="field"><span>Rangé dans</span><select class="in" id="f-cat">${destOptions(destOf(d))}</select></label>
      <label class="field wide"><span>Description <small>(utilisée par la recherche)</small></span><textarea class="in" id="e-desc" rows="4">${esc(d.description||'')}</textarea></label>
      <label class="field wide"><span>Mots-clés <small>(séparés par des virgules)</small></span><input class="in" id="e-kw" value="${esc((d.motscles||[]).join(', '))}"></label>
      <label class="field self-end"><span>Page d'accueil</span><label class="check"><input type="checkbox" id="e-pin" ${d.epingle?'checked':''}> Épingler dans « Les plus utilisés »</label></label>
      <label class="field"><span>⏰ Relecture</span><select class="in" id="e-relm">${REL_OPTS.map(([v,l])=>`<option value="${v}" ${(+d.relireMois||0)===v?'selected':''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Prochaine relecture ${relBadge(d)}</span><span class="row gap-s"><input class="in" type="date" id="e-reld" value="${esc(d.relire||'')}"><button type="button" class="secondary sm" id="e-relu" title="Le document a été relu aujourd’hui et reste valable">✅ Relu aujourd’hui</button></span>${d.relu?`<small class="hint">Dernière relecture : ${frDate(d.relu)}</small>`:''}</label>
      <div class="field wide"><span>Validation ${stBadge(d)}</span><div class="row gap-s wrap">${isPub(d)?`<span>✅ Publié${d.validePar?` · validé par ${esc(d.validePar)} le ${frDate(d.valideLe)}`:''}</span><button type="button" class="secondary sm" data-est="brouillon">Repasser en brouillon</button>`
        :`${d.statut==='brouillon'?`<button type="button" class="secondary sm" data-est="avalider">⏳ Demander la validation</button>`:''}<input class="in" id="e-valpar" placeholder="Validé par (nom, fonction)" value="${esc(d.validePar||'')}" style="max-width:260px"><button type="button" class="primary sm" data-est="valide">✅ Valider et publier</button>`}</div>
        <small class="hint">Brouillon et « à valider » : seuls les admins voient le document. Chaque étape est notée dans le journal.</small></div>
      <div class="field wide"><span>🏅 Critères HAS prouvés par ce document</span><div>${hasOf(d).length?hasOf(d).map(x=>`<span class="badge">${esc(x)}${(HAS_CRIT.find(c=>c.id===x)||{}).imp?' · impératif':''}</span>`).join(' '):'<small class="hint">Aucun pour l’instant.</small>'} <button type="button" class="linkbtn" id="e-has">Gérer dans « Préparer l’évaluation HAS »</button></div></div>
    </div>
    ${d.ext==='docx'?`<div class="step"><div class="sh">Modèle à remplir</div>
      <p>${d.modele?`Champs détectés : ${(d.champs||[]).map(c=>`<span class="badge">{${esc(c)}}</span>`).join(' ')}`:'Aucun champ détecté. Dans Word, écrivez les champs entre accolades, par ex. {Destinataire} ou {Date du jour}, puis déposez une nouvelle version.'}</p>
      <div><button type="button" class="secondary" id="e-detect">Relire les champs du fichier</button></div></div>`:''}
    ${d.ext==='pdf'?`<div class="step"><div class="sh">Formulaire officiel (Cerfa)</div><p>${d.cerfa?`Proposé dans Formulaires, pré-rempli (${Object.keys(d.cerfa.champs||{}).length} cases). Version vérifiée ${d.cerfa.verifie?'le '+esc(frDate(d.cerfa.verifie)):': jamais'}.`:'Si ce PDF est un formulaire à cases (Cerfa…), Librejo peut le proposer à l’équipe déjà rempli avec les infos de la structure, avec les pièces à joindre et l’adresse d’envoi.'}</p>
      <div><button type="button" class="secondary" id="e-cerfa">${d.cerfa?'Modifier le pré-remplissage':'Préparer le pré-remplissage'}</button></div></div>`:''}
    <div class="row"><button class="primary" id="e-save">Enregistrer</button></div>
    <div class="step"><div class="sh">Nouvelle version</div>
      <p>Le fichier actuel (v${esc(d.version||'1')}) est rangé dans les archives, pas écrasé. La nouvelle version devient v${(+d.version||1)+1}.</p>
      <div class="row gap-s wrap"><button type="button" class="primary" id="e-modif">${ICON.pen}Modifier le contenu</button>${tpOK(d.ext)?`<button type="button" class="secondary" id="e-mark">🏷️ Marquer le document</button>`:''}<label class="secondary self-start">${ICON.up}Choisir la nouvelle version<input type="file" id="e-ver" hidden></label></div></div>
    ${(d.historique||[]).length?`<div class="step"><div class="sh">Versions précédentes</div><div class="vlist">${d.historique.slice().reverse().map(h=>`<a href="${hrefOf(h.chemin)}" target="_blank" rel="noopener">v${esc(h.version||'?')} · ${docDate(h.date)} · ${esc(h.chemin.split('/').pop())}</a>`).join('')}</div></div>`:''}
    <div class="row between"><button class="ghost danger" id="e-arch">${ICON.trash}Archiver (retirer de Librejo)</button><button class="secondary" data-close>Fermer</button></div>`,'wide');
  const ecz=$('#e-cerfa'); if(ecz) ecz.onclick=()=>{ closeModal(); cerfaSetup(d); };
  $('#e-modif').onclick=()=>{ closeModal(); modifyDoc(d); };
  $('#e-has').onclick=()=>{ closeModal(); hasPrep(); };
  $('#modal-box').querySelectorAll('[data-est]').forEach(b=>b.onclick=async()=>{ const s=b.dataset.est, old={statut:d.statut,validePar:d.validePar,valideLe:d.valideLe};
    if(s==='valide'){ const who=($('#e-valpar').value||'').trim(); if(!who){ toast('Indiquez qui valide (nom, fonction).'); $('#e-valpar').focus(); return; } d.statut='valide'; d.validePar=who; d.valideLe=today(); }
    else d.statut=s;
    if(await run(saveData,s==='valide'?'Document validé et publié':s==='avalider'?'En attente de validation':'Repassé en brouillon')){ jlog('Validation',d.titre,s==='valide'?`validé par ${d.validePar} · publié`:s==='avalider'?'validation demandée':'repassé en brouillon'); closeModal(); renderDocs(); } else Object.assign(d,old); });
  $('#e-relm').onchange=e=>{ const m=+e.target.value; if(m&&!$('#e-reld').value) $('#e-reld').value=addMonths(d.relu||today(),m); if(!m) $('#e-reld').value=''; };
  $('#e-relu').onclick=async()=>{ const m=+$('#e-relm').value||+d.relireMois||12; d.relireMois=m; d.relu=today(); d.relire=addMonths(today(),m);
    if(await run(saveData,'Relecture notée : prochaine le '+frDate(d.relire))){ jlog('Relecture',d.titre,'relu, toujours valable · prochaine le '+frDate(d.relire)); closeModal(); renderDocs(); } };
  const emk=$('#e-mark'); if(emk) emk.onclick=()=>{ closeModal(); markDoc(d); };
  $('#e-save').onclick=async()=>{
    const titre=$('#e-titre').value.trim(); if(!titre){ toast('Donnez un titre pour continuer.'); return; }
    const newCat=$('#f-cat').value, before={...d};
    if(!isDest(newCat)){ toast('Emplacement inconnu.'); return; }
    const ok=await run(async()=>{
      const renamed=codeName(titre)!==codeName(d.titre);
      if(newCat!==destOf(d)||renamed){
        const base=renamed?fileCode(titre,d.version||1,String(d.date||month()).slice(0,7),newCat):d.fichier.replace(/\.[^.]+$/,'');
        const rel=await uniqueRel(`Documents/${newCat}`,base,d.ext);
        await moveRel(d.chemin,rel); d.chemin=rel; d.fichier=rel.split('/').pop(); [d.categorie,d.sous]=splitDest(newCat);
      }
      d.titre=titre; d.description=$('#e-desc').value.trim(); d.motscles=kwParse($('#e-kw').value); d.epingle=$('#e-pin').checked;
      d.relireMois=+$('#e-relm').value||0; d.relire=$('#e-reld').value||(d.relireMois?addMonths(d.relu||today(),d.relireMois):'');
      await saveData();
      jlog('Infos modifiées',titre,[before.titre!==titre&&'titre (avant : '+before.titre+')',destOf(before)!==destOf(d)&&'rangé dans '+destName(destOf(d)),before.description!==d.description&&'description',(before.motscles||[]).join()!==d.motscles.join()&&'mots-clés',!!before.epingle!==d.epingle&&(d.epingle?'épinglé':'désépinglé')].filter(Boolean).join(', ')||'');
    },'C’est enregistré');
    if(ok){ closeModal(); renderDocs(); } else Object.assign(d,before);
  };
  const det=$('#e-detect'); if(det) det.onclick=async()=>{ await run(async()=>{ await detectModel(d); await saveData(); }, 'Champs relus'); closeModal(); editDoc(d); renderDocs(); };
  $('#e-ver').onchange=async e=>{
    const f=e.target.files[0]; if(!f) return;
    if(await newVersion(d,f)){ closeModal(); renderDocs(); }
  };
  $('#e-arch').onclick=()=>archiveDoc(d);
}
async function newVersion(d,f){
    const ext=extOf(f.name)||d.ext, v=(+d.version||1)+1;
    return run(async()=>{
      const arch=await uniqueRel(`Documents/${d.categorie}/${ARCH}`,d.fichier.replace(/\.[^.]+$/,''),d.ext);
      const rel=await uniqueRel(d.chemin.split('/').slice(0,-1).join('/'),fileCode(d.titre,v,null,d.categorie),ext);
      f=await tpRestamp(d,f,rel,v);
      await writeRel(rel,f);
      await moveRel(d.chemin,arch);
      (d.historique=d.historique||[]).push({version:d.version||'1',date:d.date,chemin:arch});
      Object.assign(d,{chemin:rel,fichier:rel.split('/').pop(),ext,version:String(v),date:month(),taille:f.size,modifie:today()}); relAfterChange(d);
      await detectModel(d,f); await saveThumb(d,f);
      await saveData();
      jlog('Nouvelle version',d.titre,`v${v} (l’ancienne est archivée)`); txRefresh([d]);
    },`Version ${v} enregistrée, l'ancienne est archivée`);
}
/* ---------- Marquer un document (admin) : nom du fichier, version et date en bas à droite, n° de page, logo, pied de page ---------- */
const TP_KEY='librejo-tampon';
const TP_STAMP=/·\s*v\d+\s*·\s*\d{2}\/\d{2}\/\d{4}/;
const TP_NUM=/^(page\s*)?\d{1,3}(\s*(\/|sur|of)\s*\d{1,3})?$/i;
const tpOK=ext=>ext==='pdf'||ext==='docx';
const tpText=info=>`${info.fichier} · v${info.version} · ${frDate(info.date||today())}`;
const tpPied=()=>(structure.pied||[]).map(t=>lineStyle(t,'normal')).filter(s=>!s.rule&&s.txt&&s.txt.trim()).map(s=>s.txt.trim());
function tpLast(){ try{ return JSON.parse(localStorage.getItem(TP_KEY)||'null')||{}; }catch(e){ return {}; } }
function tpSave(o){ try{ localStorage.setItem(TP_KEY,JSON.stringify({nom:o.nom})); }catch(e){} }
/* Ce que le document a déjà : numérotation, pied de page, nom de la structure, ancien marquage Librejo, cases de formulaire */
async function tpDetect(file){
  const ext=(extOf(file.name)||'').toLowerCase(), nomS=norm(structure.nom||'').trim(), D={num:false,numOurs:false,pied:false,asso:false,old:false,form:false,header:false,scan:false}; let nch=0;
  try{
    if(ext==='pdf'){
      const buf=await file.arrayBuffer();
      try{ await needLib('pdflib'); const pd=await PDFLib.PDFDocument.load(buf.slice(0),{ignoreEncryption:true}); D.form=pd.getForm().getFields().length>0; }catch(e){}
      const lib=await getPdfjs(), pdf=await lib.getDocument({data:new Uint8Array(buf),isEvalSupported:false}).promise;
      try{ for(let n=1;n<=Math.min(pdf.numPages,4);n++){
        const pg=await pdf.getPage(n), vp=pg.getViewport({scale:1}), H=vp.height, W=vp.width, tc=await pg.getTextContent(); let all='';
        const rows=[]; tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; all+=' '+it.str; const y=it.transform[5], x=it.transform[4], s=it.str.trim();
          if(x>W*.55&&y<H*.05&&/^page\s*\d+\s*\/\s*\d+$/i.test(s)){ D.numOurs=true; return; }
          if(TP_STAMP.test(s)){ D.old=true; return; }
          let r=rows.find(r=>Math.abs(r.y-y)<2.5); if(!r){ r={y,x,s:[]}; rows.push(r); } r.x=Math.min(r.x,x); r.s.push(it.str); });
        rows.forEach(r=>{ const t=r.s.join(' ').replace(/\s+/g,' ').trim(), bas=r.y<H*.1, haut=r.y>H*.93;
          if(TP_STAMP.test(t)){ D.old=true; return; }
          if((bas||haut)&&TP_NUM.test(t)){ if(bas&&r.x>W*.55&&r.y<H*.05) D.numOurs=true; else D.num=true; return; }
          if((bas||haut)&&/page\s*\d+/i.test(t)) D.num=true;
          if(bas) D.pied=true; if(haut) D.header=true; });
        if(n===1&&nomS.length>3&&norm(all).includes(nomS)) D.asso=true; nch+=all.trim().length;
      } D.scan=nch<20; }finally{ pdf.destroy(); }
    }else if(ext==='docx'){
      await needLib('jszip'); const zip=await JSZip.loadAsync(file); let all='';
      for(const n of Object.keys(zip.files)){ const m=n.match(/^word\/(header|footer)[^/]*\.xml$/); if(!m) continue; const x=await zip.file(n).async('string');
        const sans=x.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?LibrejoTampon[\s\S]*?<\/w:p>/g,'');
        if(/PAGE/.test(sans)&&/(instrText|fldSimple)/.test(sans)) D.num=true; if(/LibrejoTampon/.test(x)) D.old=true;
        const t=sans.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); all+=' '+t;
        if(m[1]==='footer'&&t) D.pied=true; if(m[1]==='header'&&(t||/<w:drawing|<v:imagedata/.test(sans))) D.header=true; }
      all+=' '+(await zip.file('word/document.xml').async('string')).slice(0,40000).replace(/<[^>]+>/g,' ');
      if(nomS.length>3&&norm(all).includes(nomS)) D.asso=true;
    }
  }catch(e){ console.warn('tpDetect',e); }
  return D;
}
function tpDefaults(D){ const L=tpLast(), hasLogo=!!window.DOCUBUS_LOGO_ASSO&&MISE().logo!=='aucun', hasPied=tpPied().length>0;
  if(D.form) return {nom:false,num:false,logo:false,pied:false};
  return {nom:L.nom!==false, num:!D.num, logo:hasLogo&&!D.asso&&!D.header&&!D.old, pied:hasPied&&!D.asso&&!D.pied&&!D.old}; }
function tpOptsHTML(o,D,ext){ const hasLogo=!!window.DOCUBUS_LOGO_ASSO, hasPied=tpPied().length>0;
  const c=(k,lab,note,dis)=>`<label class="check"><input type="checkbox" data-tp="${k}" ${o[k]&&!dis?'checked':''} ${dis?'disabled':''}> ${lab}${note?` <small>${note}</small>`:''}</label>`;
  return `<div class="tp-opts">${D.form?'<p class="hint">📝 PDF à cases (Cerfa ?) : mieux vaut ne pas le modifier.</p>':''}
    ${c('nom','Nom du fichier, version et date en bas à droite',D.old?'(déjà marqué : mis à jour)':'')}
    ${c('num','Numéros de page',D.num?'(le document en a déjà)':'')}
    ${c('logo','Logo de la structure en haut à gauche',!hasLogo?'(aucun logo dans les Réglages)':D.header||D.asso?'(le document a déjà un en-tête)':(ext==='docx'?'':'(vérifiez qu’il ne cache rien)'),!hasLogo)}
    ${c('pied','Pied de page de la structure',!hasPied?'(aucun pied de page dans les Réglages)':D.pied?'(le document en a déjà un)':'',!hasPied)}</div>`; }
const tpSum=o=>[o.nom&&'nom et version',o.num&&'n° de page',o.logo&&'logo',o.pied&&'pied de page'].filter(Boolean).join(', ')||'rien';
/* Nouvelle version d'un document déjà marqué : on remet à jour le nom, la version et la date */
async function tpRestamp(d,f,rel,v){
  if(!d.tampon||!(d.tampon.nom||d.tampon.num)||!tpOK((extOf(f.name)||'').toLowerCase())) return f;
  const D=await tpDetect(f); if(D.form) return f;
  return stampFile(f,{nom:d.tampon.nom,num:d.tampon.num&&!D.num,logo:false,pied:false},{fichier:rel.split('/').pop(),version:v,date:today(),det:D});
}
async function stampFile(file,o,info){
  if(!o||!(o.nom||o.num||o.logo||o.pied)) return file;
  const ext=(extOf(file.name)||'').toLowerCase();
  try{ if(ext==='pdf') return await stampPdf(file,o,info); if(ext==='docx') return await stampDocx(file,o,info); }
  catch(e){ console.error('stamp',e); toast('Marquage impossible sur ce fichier : il est ajouté tel quel'); }
  return file;
}
async function stampPdf(file,o,info){
  await Promise.all([pdfReady(),needLib('pdflib')]);
  const D=info.det||await tpDetect(file);
  const src=await PDFLib.PDFDocument.load(await file.arrayBuffer(),{ignoreEncryption:true});
  const pages=src.getPages(), N=pages.length, logo=window.DOCUBUS_LOGO_ASSO, pied=tpPied(), txt=tpText(info);
  const {jsPDF}=window.jspdf; let ov=null;
  pages.forEach((pg,i)=>{
    const b=pg.getMediaBox(), rot=((pg.getRotation().angle%360)+360)%360, sw=(rot===90||rot===270);
    const w=(sw?b.height:b.width)*25.4/72, h=(sw?b.width:b.height)*25.4/72, or=w>h?'l':'p';
    if(!ov) ov=new jsPDF({unit:'mm',format:[w,h],orientation:or}); else ov.addPage([w,h],or);
    ov.setFont('helvetica','normal'); ov.setTextColor(110,110,110);
    if(D.old){ ov.setFillColor(255,255,255); ov.rect(w-100,h-13,94,11,'F'); }
    if(o.logo&&i===0&&logo){ try{ ov.addImage(logo,'JPEG',8,6,16*600/564,16); }catch(e){} }
    if(o.pied&&pied.length){ ov.setFontSize(6.5); const lines=pied.slice(0,3); lines.forEach((t,k)=>ov.text(ov.splitTextToSize(t,w-110)[0],10,h-4-(lines.length-1-k)*3)); }
    ov.setFontSize(7); const R=w-7;
    if(o.num&&o.nom){ ov.text(`Page ${i+1} / ${N}`,R,h-7.5,{align:'right'}); ov.text(txt,R,h-4,{align:'right'}); }
    else if(o.num) ov.text(`Page ${i+1} / ${N}`,R,h-4,{align:'right'});
    else if(o.nom) ov.text(txt,R,h-4,{align:'right'});
  });
  const emb=await src.embedPdf(ov.output('arraybuffer'),pages.map((_,i)=>i));
  pages.forEach((pg,i)=>{ const b=pg.getMediaBox(), rot=((pg.getRotation().angle%360)+360)%360;
    // page tournée : on dessine dans le repère de la page avant rotation
    if(!rot) pg.drawPage(emb[i],{x:b.x,y:b.y,width:b.width,height:b.height});
    else if(rot===90) pg.drawPage(emb[i],{x:b.x+b.width,y:b.y,width:b.height,height:b.width,rotate:PDFLib.degrees(90)});
    else if(rot===180) pg.drawPage(emb[i],{x:b.x+b.width,y:b.y+b.height,width:b.width,height:b.height,rotate:PDFLib.degrees(180)});
    else pg.drawPage(emb[i],{x:b.x,y:b.y+b.height,width:b.height,height:b.width,rotate:PDFLib.degrees(270)}); });
  return new File([await src.save()],file.name,{type:'application/pdf'});
}
async function stampDocx(file,o,info){
  await needLib('jszip'); const zip=await JSZip.loadAsync(file), X=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const RNS='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  let doc=await zip.file('word/document.xml').async('string');
  const relP='word/_rels/document.xml.rels'; let rels=await zip.file(relP).async('string');
  let ct=await zip.file('[Content_Types].xml').async('string');
  const rp='<w:rPr><w:color w:val="6E6E6E"/><w:sz w:val="14"/></w:rPr>', run=t=>`<w:r>${rp}<w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
  const fld=f=>`<w:r>${rp}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${rp}<w:instrText xml:space="preserve"> ${f} </w:instrText></w:r><w:r>${rp}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${rp}<w:t>1</w:t></w:r><w:r>${rp}<w:fldChar w:fldCharType="end"/></w:r>`;
  let tp='';
  if(o.num||o.nom){ tp=`<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:before="60" w:after="0"/></w:pPr><w:bookmarkStart w:id="9901" w:name="LibrejoTampon"/>`
    +(o.num?run('Page ')+fld('PAGE')+run(' / ')+fld('NUMPAGES'):'')+(o.num&&o.nom?`<w:r>${rp}<w:br/></w:r>`:'')+(o.nom?run(tpText(info)):'')+`<w:bookmarkEnd w:id="9901"/></w:p>`; }
  const pd=o.pied?tpPied().map(t=>`<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>${run(t)}</w:p>`).join(''):'';
  const relOf=id=>{ const m=rels.match(new RegExp(`<Relationship[^>]*Id="${id}"[^>]*>`)); return m?(m[0].match(/Target="([^"]+)"/)||[])[1]:null; };
  const addRel=(id,type,target)=>{ rels=rels.replace('</Relationships>',`<Relationship Id="${id}" Type="${RNS}/${type}" Target="${target}"/></Relationships>`); };
  const ovr=(part,type)=>{ if(!ct.includes(`PartName="/${part}"`)) ct=ct.replace('</Types>',`<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.${type}+xml"/></Types>`); };
  const sects=doc.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>|<w:sectPr\b[^>]*\/>/g)||[];
  const W_NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="'+RNS+'" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  // Pied de page : dans le pied existant de chaque section, sinon un pied Librejo commun
  if(tp||pd){
    const done=new Set(); let ours=false;
    for(const s of sects){ const m=s.match(/<w:footerReference[^>]*w:type="default"[^>]*>/); const id=m&&(m[0].match(/r:id="([^"]+)"/)||[])[1];
      if(id&&relOf(id)){ const part='word/'+relOf(id).replace(/^\/?word\//,''); if(done.has(part)||!zip.file(part)) continue; done.add(part);
        let f=await zip.file(part).async('string'); f=f.replace(/<w:p\b(?:(?!<\/w:p>)[\s\S])*?LibrejoTampon[\s\S]*?<\/w:p>/g,'');
        f=f.replace(/<\/w:ftr>\s*$/,pd+tp+'</w:ftr>'); zip.file(part,f); }
      else ours=true; }
    if(ours||!sects.length){
      zip.file('word/footer-librejo.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${W_NS}>${pd+tp||'<w:p/>'}</w:ftr>`);
      if(!rels.includes('Id="rIdLjFtr"')) addRel('rIdLjFtr','footer','footer-librejo.xml'); ovr('word/footer-librejo.xml','footer');
      doc=doc.replace(/<w:sectPr\b([^>]*)\/>/g,'<w:sectPr$1></w:sectPr>').replace(/<w:sectPr\b([^>]*)>([\s\S]*?)<\/w:sectPr>/g,(all,a,inner)=>/<w:footerReference[^>]*w:type="default"/.test(inner)?all:`<w:sectPr${a}><w:footerReference w:type="default" r:id="rIdLjFtr"/>${inner}</w:sectPr>`);
      if(!sects.length) doc=doc.replace('</w:body>','<w:sectPr><w:footerReference w:type="default" r:id="rIdLjFtr"/></w:sectPr></w:body>');
    }
  }
  // Logo : seulement s'il n'y a pas d'en-tête
  const logo=window.DOCUBUS_LOGO_ASSO;
  if(o.logo&&logo&&!/<w:headerReference[^>]*w:type="default"/.test(doc)){
    const b64=logo.split(',')[1]; zip.file('word/media/librejo-logo.jpeg',b64,{base64:true});
    if(!/Extension="jpeg"/i.test(ct)) ct=ct.replace('<Override','<Default Extension="jpeg" ContentType="image/jpeg"/><Override');
    const cy=Math.round(16/25.4*914400), cx=Math.round(cy*600/564);
    zip.file('word/header-librejo.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr ${W_NS}><w:p><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="9902" name="Logo de la structure"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="logo.jpeg"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLjLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>`);
    zip.file('word/_rels/header-librejo.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLjLogo" Type="${RNS}/image" Target="media/librejo-logo.jpeg"/></Relationships>`);
    if(!rels.includes('Id="rIdLjHdr"')) addRel('rIdLjHdr','header','header-librejo.xml'); ovr('word/header-librejo.xml','header');
    doc=doc.replace(/<w:sectPr\b([^>]*)\/>/g,'<w:sectPr$1></w:sectPr>').replace(/<w:sectPr\b([^>]*)>/g,'<w:sectPr$1><w:headerReference w:type="default" r:id="rIdLjHdr"/>');
  }
  if(!/xmlns:r=/.test(doc.slice(0,3000))) doc=doc.replace(/<w:document\b/,`<w:document xmlns:r="${RNS}"`);
  zip.file('word/document.xml',doc); zip.file(relP,rels); zip.file('[Content_Types].xml',ct);
  return new File([await zip.generateAsync({type:'blob',mimeType:MIME.docx})],file.name,{type:MIME.docx});
}
/* Modifier un document (admin) : copie de travail, puis on redépose ; on voit les différences avant d'enregistrer */
const editorOf=ext=>['doc','docx','odt','rtf'].includes(ext)?'Word ou LibreOffice':['xls','xlsx','ods','csv'].includes(ext)?'Excel ou LibreOffice':ext==='pdf'?'votre lecteur PDF (Acrobat, Edge…)':'le logiciel habituel';
async function modifyDoc(d){
  let orig;
  try{ orig=await readRel(d.chemin); }catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
  const name=`${fileCode(d.titre,d.version||1)}_a-modifier.${d.ext}`;
  const dl=()=>downloadBlob(new Blob([orig],{type:MIME[d.ext]||orig.type}),name);
  dl();
  openModal(`<h3 id="modal-title">✏️ Modifier « ${esc(d.titre)} »</h3>
    <ol class="how"><li>Une copie de travail, <b>${esc(name)}</b>, est dans vos <b>Téléchargements</b> <button type="button" class="linkbtn" id="md-again">(la télécharger de nouveau)</button>.</li>
      <li>Ouvrez-la dans ${editorOf(d.ext)}, modifiez, puis <b>enregistrez</b>.</li>
      <li>Déposez ici le fichier modifié : vous verrez les différences avant d’enregistrer.</li></ol>
    <label class="dropzone" id="md-drop">${svg('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>')}<b>Déposez le fichier modifié</b><span>ou cliquez pour le choisir</span><input type="file" id="md-file" hidden></label>
    <p class="hint">🔒 L’original n’est jamais écrasé : l’ancien fichier est rangé dans ${ARCH}. Pensez à supprimer la copie de vos Téléchargements ensuite.</p>
    <div class="row end"><button type="button" class="ghost" data-close>Annuler</button></div>`);
  $('#md-again').onclick=dl;
  const go=f=>{ if(!f) return; comparer({A:{file:orig,doc:d},B:{file:f}},{modif:d}); };
  $('#md-file').onchange=e=>go(e.target.files[0]);
  const z=$('#md-drop');
  ['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{ e.preventDefault(); z.classList.add('over'); }));
  z.addEventListener('dragleave',()=>z.classList.remove('over'));
  z.addEventListener('drop',e=>{ e.preventDefault(); z.classList.remove('over'); go(e.dataTransfer.files[0]); });
}
/* Marquer un document déjà dans Librejo (même version ; l'ancien fichier est archivé) */
async function markDoc(d){
  if(!tpOK(d.ext)){ toast('Le marquage est possible pour les PDF et les documents Word (.docx).'); return; }
  let file; try{ file=await readRel(d.chemin); }catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
  openModal(`<h3 id="modal-title">🏷️ Marquer « ${esc(d.titre)} »</h3><div id="mk-body"><p class="hint">Lecture du document…</p></div>
    <div class="row end mt"><button type="button" class="ghost" data-close>Annuler</button><button type="button" class="primary" id="mk-ok" disabled>Appliquer</button></div>`);
  const D=await tpDetect(file); const body=$('#mk-body'); if(!body) return;
  const o=tpDefaults(D); if(d.tampon){ o.nom=!!d.tampon.nom; o.num=!!d.tampon.num||o.num; }
  body.innerHTML=tpOptsHTML(o,D,d.ext)+`<p class="hint">Le document garde sa version (v${esc(d.version||'1')}). L’ancien fichier est rangé dans ${ARCH}, rien n’est supprimé.</p>`;
  const ok=$('#mk-ok'); ok.disabled=false;
  ok.onclick=async()=>{ body.querySelectorAll('[data-tp]').forEach(c=>o[c.dataset.tp]=c.checked&&!c.disabled);
    if(!(o.nom||o.num||o.logo||o.pied)){ toast('Cochez au moins une case.'); return; }
    ok.disabled=true; ok.textContent='Marquage…';
    const f=await stampFile(file,o,{fichier:d.fichier,version:d.version||1,date:today(),det:D});
    if(f===file){ ok.disabled=false; ok.textContent='Appliquer'; return; }
    const t=d.tampon; d.tampon=null;
    const done=await minorFix(d,f,'Document marqué, l’ancien fichier est archivé');
    if(done){ d.tampon=(o.nom||o.num)?{nom:!!o.nom,num:!!o.num}:t; await saveData(); closeModal(); renderDocs(); }
    else{ d.tampon=t; ok.disabled=false; ok.textContent='Appliquer'; } };
}
/* Petite correction : même numéro de version, l'ancien fichier part quand même aux archives */
async function minorFix(d,f,msg){
  const ext=(extOf(f.name)||d.ext).toLowerCase();
  return run(async()=>{
    const arch=await uniqueRel(`Documents/${d.categorie}/${ARCH}`,d.fichier.replace(/\.[^.]+$/,'')+'_avant-correction',d.ext);
    const dir=d.chemin.split('/').slice(0,-1).join('/');
    await moveRel(d.chemin,arch);
    const rel=ext===d.ext?d.chemin:await uniqueRel(dir,fileCode(d.titre,+d.version||1,null,d.categorie),ext);
    f=await tpRestamp(d,f,rel,d.version||1);
    await writeRel(rel,f);
    (d.historique=d.historique||[]).push({version:(d.version||'1')+' avant correction',date:d.date,chemin:arch});
    Object.assign(d,{chemin:rel,fichier:rel.split('/').pop(),ext,taille:f.size,modifie:today()}); if(!msg) relAfterChange(d);
    await detectModel(d,f); await saveThumb(d,f); await saveData();
    jlog(msg?'Marquage':'Correction',d.titre,`v${d.version||'1'} (l’ancien fichier est archivé)`); txRefresh([d]);
  },msg||'Correction enregistrée, l’ancien fichier est archivé');
}
function archiveDoc(d){
  askConfirm('Archiver ce document ?',`« ${esc(d.titre)} » sera retiré de Librejo et rangé dans le dossier ${ARCH} de sa catégorie dans le dossier. Rien n'est supprimé.`,'Archiver',async()=>{
    await archiveQuiet(d);
    renderDocs();
  });
}
function archiveQuiet(d){
  return run(async()=>{
    const arch=await uniqueRel(`Documents/${d.categorie}/${ARCH}`,d.fichier.replace(/\.[^.]+$/,''),d.ext);
    await moveRel(d.chemin,arch);
    const m={...d,archChemin:arch,archiveLe:new Date().toISOString()}; delete m.cerfa; (DATA.archives=DATA.archives||[]).push(m);
    DATA.documents=DATA.documents.filter(x=>x!==d); DATA.kits.forEach(k=>k.docs=(k.docs||[]).filter(id=>id!==d.id)); await saveData();
    jlog('Archivage',d.titre,`v${d.version||'1'} rangée dans ${ARCH}`);
  },'Document archivé');
}
function addCat(){
  askText('Nouvelle catégorie','Nom de la catégorie','',async nom=>{
    const ordre=Math.max(0,...DATA.categories.map(c=>c.ordre||0))+1;
    const id=folderName(nom,ordre);
    await run(async()=>{ await dirAt(['Documents',id],'readwrite',true); DATA.categories.push({id,nom,ordre}); await saveData(); jlog('Catégorie créée',nom); },'Nouvelle catégorie prête');
    filter=id; renderDocs(); renderForms();
  });
}
function addSous(){
  const c=DATA.categories.find(x=>x.id===filter); if(!c) return;
  askText('Nouveau sous-dossier',`Nom du sous-dossier dans « ${c.nom} » (ex. Cures)`,'',async nom=>{ const v=await createSous(c,nom); if(v){ filter=v; renderDocs(); } });
}
function delSous(){
  const [cid,sub]=splitDest(filter), c=DATA.categories.find(x=>x.id===cid); if(!c||!sub) return;
  if(DATA.documents.some(d=>d.categorie===cid&&d.sous===sub)){ toast('Archivez ou déplacez d’abord ses documents.'); return; }
  askConfirm('Supprimer le sous-dossier ?',`« ${esc(sub)} » disparaîtra de Librejo. S'il est vide dans le dossier, le dossier est aussi retiré.`,'Supprimer',async()=>{
    await run(async()=>{ try{ const d=await dirAt(['Documents',cid],'readwrite',false); await d.removeEntry(sub); }catch(e){} c.sous=(c.sous||[]).filter(x=>x!==sub); await saveData(); },'Sous-dossier supprimé');
    filter=cid; renderDocs();
  });
}
function renameCat(){
  const c=DATA.categories.find(x=>x.id===filter); if(!c) return;
  askText('Renommer la catégorie','Nom affiché',c.nom,async nom=>{ const old=c.nom; c.nom=nom; if(!await run(saveData,'Catégorie renommée')) c.nom=old; else jlog('Catégorie renommée',nom,'avant : '+old); renderDocs(); });
}
function delCat(){
  const c=DATA.categories.find(x=>x.id===filter); if(!c) return;
  if(DATA.documents.some(d=>d.categorie===c.id)||DATA.formulaires.some(f=>f.categorie===c.id)){ toast('Archivez ou déplacez d’abord ses documents et formulaires.'); return; }
  askConfirm('Supprimer la catégorie ?',`« ${esc(c.nom)} » disparaîtra de Librejo. Son dossier reste dans le dossier (avec ses archives éventuelles).`,'Supprimer',async()=>{
    DATA.categories=DATA.categories.filter(x=>x!==c);
    if(!await run(saveData,'Catégorie supprimée')) DATA.categories.push(c); else jlog('Catégorie supprimée',c.nom);
    filter='recent'; renderDocs();
  });
}
/* Actualiser : relit le dossier Documents du dossier (fichiers déposés à la main), en gardant titres et descriptions */
async function rescan(){
  await run(async()=>{
    const root=await getDir('readwrite'); const dd=await root.getDirectoryHandle('Documents',{create:true});
    const oldDocs=new Map(DATA.documents.map(d=>[d.chemin,d])), oldCats=new Map(DATA.categories.map(c=>[c.id,c]));
    const newCats=[], newDocs=[];
    const skip=n=>n.startsWith('_')||n.startsWith('.')||n.startsWith('~$')||['desktop.ini','thumbs.db'].includes(n.toLowerCase());
    for await (const [name,h] of dd.entries()){
      if(h.kind!=='directory'||skip(name)) continue;
      const m=/^(\d+)[\s._-]*(.+)$/.exec(name), oc=oldCats.get(name);
      newCats.push(oc||{id:name,nom:m?m[2].trim():name,ordre:m?+m[1]:99});
      const walk=async(dir,prefix)=>{ for await (const [n,x] of dir.entries()){
        if(skip(n)) continue;
        if(x.kind==='directory'){ await walk(x,prefix+n+'/'); continue; }
        const rel=`Documents/${prefix}${n}`, ex=oldDocs.get(rel);
        if(ex){ newDocs.push(ex); continue; }
        const f=await x.getFile(), p=parseName(n.replace(/\.[^.]+$/,'')), lm=new Date(f.lastModified);
        const nd={id:'d'+rid(),chemin:rel,fichier:n,titre:p.titre.charAt(0).toUpperCase()+p.titre.slice(1),description:'',motscles:[],categorie:name,ext:extOf(n),version:p.version,date:p.date||`${lm.getFullYear()}-${pad(lm.getMonth()+1)}-${pad(lm.getDate())}`,ajoute:today(),taille:f.size,historique:[]};
        await detectModel(nd,f); await saveThumb(nd,f); newDocs.push(nd);
      } };
      await walk(h,name+'/');
      const subs=[]; for await (const [n,x] of h.entries()){ if(x.kind==='directory'&&!skip(n)) subs.push(n); }
      newCats[newCats.length-1].sous=subs;
    }
    const keep=DATA.documents.filter(d=>isLink(d)||d.ranger);
    const added=newDocs.filter(d=>!oldDocs.has(d.chemin)).length, gone=DATA.documents.filter(d=>!newDocs.includes(d)&&!keep.includes(d)).length;
    newDocs.forEach(d=>{ const p=d.chemin.split('/'); d.sous=p.length>3?p[2]:''; });
    keep.forEach(l=>{ let c=newCats.find(x=>x.id===l.categorie); if(!c&&oldCats.get(l.categorie)){ c=oldCats.get(l.categorie); newCats.push(c); } if(c&&l.sous&&!(c.sous||[]).includes(l.sous)) (c.sous=c.sous||[]).push(l.sous); });
    DATA.categories=newCats; DATA.documents=newDocs.concat(keep); await saveData();
    toast(`Liste actualisée : ${added} nouveau(x), ${gone} retiré(s), ${newDocs.length} au total`); jlog('Actualisation','',`${added} nouveau(x), ${gone} retiré(s)`);
  });
  renderDocs(); renderForms();
}

/* ======================================================================
   3. FORMULAIRES : délivrance exceptionnelle + formulaires créés par l'admin
   ====================================================================== */
let formView=null, FV={}, fShowErr=false;
function renderForms(){
  const p=$('#p-forms');
  if(formView&&formView!=='__deliv'){ return renderFill(); }
  p.innerHTML=`<h2 class="sec">Formulaires</h2>
    <p class="hint">Remplissez, Librejo crée le PDF à l'en-tête de la structure, puis prépare le mail. Rien n'est enregistré.</p>
    ${SANS?sdEnteteHTML():''}
    ${formsByGroupHTML()}${SANS?sdPacksHTML():''}
    ${isAdmin?`<div class="adminbar"><b>Mode admin</b><button class="secondary" data-newform>${ICON.plus}Créer un formulaire</button>${cerfaDocs().length?`<button class="secondary" data-czcheck>Vérifier les Cerfa${cerfaDocs().some(d=>czAge(d)>CZ_DAYS)?' (à faire)':''}</button>`:''}<span class="hint">Les formulaires se modifient dans l'onglet Administration.</span></div>`:''}`;
}
$('#p-forms').addEventListener('click',e=>{
  const f=e.target.closest('[data-fill]'); if(f){ openForm(f.dataset.fill); return; }
  if(e.target.closest('[data-newform]')){ setTab('admin'); asub='forms'; editForm(null); }
  if(e.target.closest('[data-czcheck]')&&!formView) cerfaCheck();
});
function openForm(id){
  if(id==='__deliv'){ formView='__deliv'; setTab('deliv'); window.scrollTo({top:0}); return; }
  if(id==='__ccas'){ ccErr=false; formView='__ccas'; setTab('ccas'); window.scrollTo({top:0}); return; }
  if(id==='__el'){ elErr=false; formView='__el'; setTab('el'); window.scrollTo({top:0}); return; }
  if(id==='__cp'){ cpErr=false; formView='__cp'; setTab('cp'); window.scrollTo({top:0}); return; }
  if(id==='__urg'){ urErr=false; formView='__urg'; setTab('urg'); window.scrollTo({top:0}); return; }
  if(id==='__cl'){ clErr=false; formView='__cl'; setTab('cl'); window.scrollTo({top:0}); return; }
  if(id==='__att'){ asErr=false; formView='__att'; setTab('att'); window.scrollTo({top:0}); return; }
  if(id==='__mt'){ mtErr=false; formView='__mt'; setTab('mt'); window.scrollTo({top:0}); return; }
  if(id==='__cmi'){ cmErr=false; formView='__cmi'; setTab('cmi'); window.scrollTo({top:0}); return; }
  if(id==='__relais'){ rlErr=false; formView='__relais'; setTab('relais'); window.scrollTo({top:0}); return; }
  if(String(id).startsWith('cerfa:')){ formView=id; setTab('forms'); window.scrollTo({top:0}); return; }
  const f=DATA.formulaires.find(x=>x.id===id); if(!f) return;
  formView=id; FV={_date:today(),_to:f.destinataires||''}; fShowErr=false; setTab('forms'); window.scrollTo({top:0});
}
const fieldKey=c=>c.id;
function renderFill(){
  if(String(formView||'').startsWith('cerfa:')) return renderCerfa();
  const f=DATA.formulaires.find(x=>x.id===formView); if(!f){ formView=null; return renderForms(); }
  const errs=fShowErr?validateFill(f):[];
  const bad=new Set(errs.map(x=>x.k));
  const input=c=>{ const v=FV[c.id]??'', B=bad.has(c.id)?` bad" data-errk="${esc(c.id)}`:'';
    if(c.type==='long') return `<textarea class="in${B}" data-f="${c.id}" rows="4">${esc(v)}</textarea>`;
    if(c.type==='date') return `<input class="in${B}" type="date" data-f="${c.id}" value="${esc(v)}">`;
    if(c.type==='nombre') return `<input class="in num${B}" inputmode="decimal" data-f="${c.id}" value="${esc(v)}">`;
    if(c.type==='equipe') return eqField(c,B);
    if(c.type==='choix') return `<div class="choice${B}">${kwParse(c.options).map(o=>`<button type="button" class="chip" data-choice="${c.id}" data-v="${esc(o)}" aria-pressed="${v===o}">${esc(o)}</button>`).join('')}</div>`;
    if(c.type==='cases'){ const sel=new Set(String(v).split('\n')); return `<div class="choice cases${B}">${caseOpts(c.options).map(o=>`<button type="button" class="chip" data-case="${c.id}" data-v="${esc(o)}" aria-pressed="${sel.has(o)}">${esc(o)}</button>`).join('')}</div>`; }
    return `<input class="in${B}" data-f="${c.id}" value="${esc(v)}" autocomplete="off">`; };
  $('#p-forms').innerHTML=`<button class="backlink" data-back>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">${esc(formEmoji(f))}</span>${esc(f.titre)}</h2>
    ${f.description?`<p class="hint">${esc(f.description)}</p>`:''}
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface après l'envoi ou si vous fermez la page.</span></div>
    <div class="card top w-form">
      <div class="fieldgrid">
        ${(f.champs||[]).map(c=>{ const t=c.type==='equipe'||c.type==='cases'?'div':'label'; return `<${t} class="field ${c.type==='long'||c.type==='equipe'||c.type==='cases'?'wide':''}"><span>${esc(c.label)}${c.requis?'':' <small>(facultatif)</small>'}</span>${input(c)}</${t}>`; }).join('')}
        <label class="field"><span>Envoyer à <small>(adresses séparées par des virgules)</small></span><input class="in${bad.has('_to')?' bad" data-errk="_to':''}" data-f="_to" value="${esc(FV._to||'')}" spellcheck="false"></label>
        <label class="field"><span>Date du document</span><input class="in${bad.has('_date')?' bad" data-errk="_date':''}" type="date" data-f="_date" value="${esc(FV._date||'')}"></label>
      </div>
    </div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x.k)}">${esc(x.m)}</li>`).join('')}</ul>`:''}
    <div class="row w-form"><button class="primary big" data-mkpdf>${ICON.mail}Créer le PDF et préparer l'envoi</button></div>
    <div class="row w-form end"><button class="ghost danger" data-fclear>${ICON.trash}Tout effacer</button></div>`;
}
function validateFill(f){
  const errs=[];
  (f.champs||[]).forEach(c=>{ if(c.requis&&!String(FV[c.id]??'').trim()) errs.push({k:c.id,m:`« ${c.label} » est à remplir.`}); });
  const to=String(FV._to||'').split(/[\s,;]+/).filter(Boolean);
  if(to.some(a=>!MAIL.test(a))) errs.push({k:'_to',m:'Adresse mail incorrecte.'});
  if(!FV._date) errs.push({k:'_date',m:'Date du document manquante.'});
  return errs;
}
$('#p-forms').addEventListener('change',e=>{ const q=e.target.dataset.eqi; if(!q) return; const st=FV['_eq'+q]; if(!st) return; const I=new Set(st.infos); e.target.checked?I.add(e.target.dataset.k):I.delete(e.target.dataset.k); st.infos=EQ_INFOS.map(x=>x[0]).filter(x=>I.has(x)); FV[q]=eqText(st); renderFill(); });
$('#p-forms').addEventListener('input',e=>{ const k=e.target.dataset.f; if(!k) return; FV[k]=e.target.value; });
$('#p-forms').addEventListener('click',e=>{
  if(e.target.closest('[data-back]')){ formView=null; renderForms(); return; }
  const cs=e.target.closest('[data-case]'); if(cs){ const f=DATA.formulaires.find(x=>x.id===formView), c=f&&f.champs.find(x=>x.id===cs.dataset.case); if(!c) return;
    const sel=new Set(String(FV[c.id]||'').split('\n')); sel.has(cs.dataset.v)?sel.delete(cs.dataset.v):sel.add(cs.dataset.v);
    FV[c.id]=caseOpts(c.options).filter(o=>sel.has(o)).join('\n'); renderFill(); return; }
  const ch=e.target.closest('[data-choice]'); if(ch){ FV[ch.dataset.choice]=FV[ch.dataset.choice]===ch.dataset.v?'':ch.dataset.v; renderFill(); return; }
  const eq=e.target.closest('[data-eqc]'); if(eq){ const f=DATA.formulaires.find(x=>x.id===formView), c=f&&f.champs.find(x=>x.id===eq.dataset.eqc); if(!c) return; const st=FV['_eq'+c.id];
    const id=eq.dataset.id; st.ids=st.ids.includes(id)?st.ids.filter(x=>x!==id):(c.multi?[...st.ids,id]:[id]); FV[c.id]=eqText(st); renderFill(); return; }
  if(e.target.closest('[data-fclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ const f=DATA.formulaires.find(x=>x.id===formView); FV={_date:today(),_to:(f&&f.destinataires)||''}; renderFill(); }); return; }
  if(e.target.closest('[data-mkpdf]')) makeFormPdf();
});
function fillTemplate(f,vals){
  const map={}; Object.entries(AUTO_FIELDS).forEach(([k,fn])=>{ map[norm(k)]=fn()||''; }); (f.champs||[]).forEach(c=>{ let v=String(vals[c.id]??'').trim(); if(c.type==='date'&&v) v=frDate(v); map[norm(c.label)]=v; });
  return String(f.modele||'').replace(/\{([^{}]+)\}/g,(m,k)=>{ const n=norm(k.trim()); return n in map?map[n]:m; })
    .split(/\n{2,}/).map(p=>p.trim()).filter(Boolean);
}
function formBlob(f,tp){
  return makeLetter({titre:f.titre,confidentiel:f.confidentiel&&(f.groupe==='med'||!f.groupe?true:'CONFIDENTIEL'),date:FV._date||today(),paras:fillTemplate(f,FV),signataire:f.signataire||structure.signataire,tp});
}
async function makeFormPdf(){
  const f=DATA.formulaires.find(x=>x.id===formView); if(!f) return;
  fShowErr=true; if(missingStop(validateFill(f),'#p-forms',renderFill,makeFormPdf,()=>FV)) return; fShowErr=false;
  let tp=null; try{ tp=await loadTampon(); }catch(e){}
  try{ await pdfReady(); }catch(e){ return; }
  const blob=formBlob(f,tp);
  const file=new File([blob],`${fileSafe(f.titre)}_${isoOr(FV._date)}.pdf`,{type:'application/pdf'});
  const to=String(FV._to||'').split(/[\s,;]+/).filter(Boolean);
  showSendGeneric({files:[file],to,subject:(f.objet||f.titre)+' – '+frDate(FV._date||today()),body:`Bonjour,\n\nVeuillez trouver ci-joint : ${f.titre}.\n\nCordialement,\n${f.signataire||structure.signataire}`,sensitive:!!f.confidentiel,
    onDone:()=>{ FV={_date:today(),_to:f.destinataires||''}; renderFill(); }});
}
/* Courrier PDF à l'en-tête de l'association (formulaires créés par l'admin) */
function makeLetter({titre,confidentiel,date,paras,signataire,tp}){
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const st=structure;
  const NAVY=pdfRGB('--navy'),ORANGE=pdfRGB('--accent'),GREY=[93,103,121],INK=[20,32,58]; const {L,R,W,PL}=GEO();
  doc.setProperties({title:titre,author:st.nom,creator:'Librejo'});
  pdfLogo(doc,PL+2,14,30,28.2);
  doc.setFontSize(8.5); doc.setTextColor(...INK);
  pdfEntete(doc,PL,47,4);
  if(confidentiel){ doc.setTextColor(...GREY); doc.setFont(PF(),'bold'); doc.setFontSize(8); doc.text(typeof confidentiel==='string'?confidentiel:'CONFIDENTIEL – DONNÉES DE SANTÉ',R,16,{align:'right'}); }
  doc.setTextColor(...NAVY); doc.setFont(PF(),'bold'); doc.setFontSize(16);
  const tl=doc.splitTextToSize(titre,95); tl.forEach((t,i)=>doc.text(t,R,30+i*7.5,{align:'right'}));
  const ly=30+(tl.length-1)*7.5+4; doc.setDrawColor(...ORANGE); doc.setLineWidth(1.2); doc.line(R-62,ly,R,ly);
  let y=Math.max(72,ly+22);
  doc.setTextColor(...INK); doc.setFontSize(11.5); doc.setFont(PF(),'normal');
  doc.text(`${villeLe(st)}${frDate(date)}`,L,y); y+=14;
  const footTop=297-14-((st.pied||[]).length)*4-8;
  const room=n=>{ if(y+n>footTop){ doc.addPage(); y=25; doc.setFontSize(11.5); doc.setFont(PF(),'normal'); doc.setTextColor(...INK); } };
  /* un paragraphe « --- » seul trace un trait sur toute la largeur (ex. les deux zones d'une ordonnance bizone) */
  paras.forEach(p=>{ if(p.trim()==='---'){ room(10); doc.setDrawColor(...INK); doc.setLineWidth(.5); doc.line(L,y-1,R,y-1); y+=7; return; }
    p.split('\n').forEach(line=>{ const c=line.trim().match(/^>>\s*(.*?)\s*<<$/); /* « >> texte << » : centré, en gras */
      if(c){ doc.setFont(PF(),'bold'); let fs=10.5; doc.setFontSize(fs); while(fs>8&&doc.getTextWidth(c[1])>W){ fs-=.25; doc.setFontSize(fs); } /* plus petit plutôt que sur deux lignes */
        doc.splitTextToSize(c[1],W).forEach(l=>{ room(5.5); doc.text(l,L+W/2,y,{align:'center'}); y+=5.2; }); doc.setFontSize(11.5); doc.setFont(PF(),'normal'); return; }
      doc.splitTextToSize(line,W).forEach(l=>{ room(6); doc.text(l,L,y); y+=6; }); });
    y+=p.split('\n').every(l=>/^>>.*<<$/.test(l.trim()))?.5:4; }); /* intitulé centré : le trait suivant vient tout près */
  let tw=0,th=0; if(tp){ tw=40; th=tw*tp.h/tp.w; if(th>32){ th=32; tw=th*tp.w/tp.h; } }
  y+=6; room(20+(tp?th+4:0));
  doc.setFont(PF(),'bold'); doc.setTextColor(...NAVY); doc.text(signataire,R,y,{align:'right'});
  if(tp){ try{ doc.addImage(tp.url,tp.fmt,R-tw,y+3,tw,th); }catch(e){} }
  const pied=st.pied||[]; const fy=297-12-(pied.length-1)*4;
  for(let pg=1;pg<=doc.getNumberOfPages();pg++){ doc.setPage(pg);
    pdfMarge(doc,pg,fy); pdfFilet(doc,PL,R,fy,ORANGE); doc.setFontSize(8); doc.setTextColor(...GREY);
    pdfPied(doc,pied,fy,PL); }
  return doc.output('blob');
}

/* Fenêtre d'envoi commune (délivrance et formulaires) */
let sendUrls=[];
function showSendGeneric({files,to,subject,body,sensitive,onDone,title,steps}){
  deliver({files,title:title||(files.length>1?`${files.length} documents prêts`:'Document prêt'),steps,mail:{to:to||[],subject,body},sensitive,onDone});
}
/* Garde-fou avant la fenêtre « document prêt » : un caractère qu'aucune police ne sait imprimer
   (emoji, écriture non latine…) aurait disparu du PDF. On ne montre pas un document faux : on dit
   quel caractère, dans quel champ, et on y ramène la personne pour le corriger. */
function fieldLabel(el){
  const lab=el.closest('label')||(el.id&&document.querySelector(`label[for="${CSS.escape(el.id)}"]`)); let t='';
  if(lab){ const c=(lab.querySelector(':scope>span')||lab).cloneNode(true); c.querySelectorAll('small,input,textarea,select,datalist').forEach(x=>x.remove()); t=c.textContent; }
  return (t||el.getAttribute('aria-label')||el.placeholder||'').replace(/\s+/g,' ').trim();
}
function pdfCharsOk(){
  if(!LJ_PDF_MISS.size) return true;
  /* une police de repli pas encore là (réseau lent, écriture repérée trop tard) : on la charge et on fait patienter */
  const wait=Object.keys(LJ_REPLIS).filter(k=>{ const R=LJ_REPLIS[k]; return !R.set&&(!R.re||[...LJ_PDF_MISS].some(ch=>R.re.test(ch))); });
  if(wait.length){ wait.forEach(k=>loadPdfRepli(k).catch(()=>{})); openModal(`<h3 id="modal-title">Un instant</h3><p>Les polices des PDF finissent de se charger. Recommencez dans quelques secondes.</p><button class="secondary" data-close data-autofocus>OK</button>`); return false; }
  const miss=[...LJ_PDF_MISS]; LJ_PDF_MISS.clear();
  /* un caractère qu'une police sait dessiner, mais pas celle qu'a prise son texte : le texte mêle deux écritures
     de polices différentes (l'arabe et le géorgien, par exemple) */
  const mixCh=miss.filter(ch=>ljPrintable(ch.codePointAt(0))), badCh=miss.filter(ch=>!mixCh.includes(ch));
  const oneFont=v=>{ const cs=[...v].filter(c=>!/[\s\u200C-\u200F]/.test(c)).map(c=>c.codePointAt(0)); return [LJ_WINANSI,...Object.values(LJ_REPLIS).map(R=>R.set).filter(Boolean)].some(S=>cs.every(c=>S.has(c))); };
  const seg=v=>{ try{ return [...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(v)].map(x=>x.segment); }catch(e){ return [...v]; } };
  const panel=document.querySelector('main>section.panel:not([hidden])')||document;
  const fields=[...panel.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]),textarea')].filter(el=>el.value);
  const found=[], mixed=[];
  for(const el of fields){ const v=el.value.normalize('NFC'), gs=[...new Set(seg(v).filter(x=>badCh.some(ch=>x.includes(ch))))];
    if(gs.length) found.push({el,gs,g:gs[0],label:fieldLabel(el)||'un champ',at:el.value.indexOf(gs[0])});
    else if(mixCh.some(ch=>v.includes(ch))&&!oneFont(v)) mixed.push({el,label:fieldLabel(el)||'un champ',at:-1}); }
  const loose=miss.filter(ch=>!found.some(f=>f.gs.some(g=>g.includes(ch)))&&!(mixCh.includes(ch)&&mixed.some(f=>f.el.value.includes(ch))));
  const lines=found.slice(0,5).map(f=>{ const n=f.gs.length>1, l=f.gs.slice(0,8).join(' ')+(f.gs.length>8?' …':'');
      return `${n?'Les caractères':'Le caractère'} <b class="badch">${esc(l)}</b> dans « ${esc(f.label)} » ${n?'ne peuvent':'ne peut'} pas être imprimé${n?'s':''}.`; })
    .concat(mixed.slice(0,3).map(f=>`« ${esc(f.label)} » mêle deux écritures qui ne s’impriment pas ensemble (l’arabe et le vietnamien, par exemple)\u202f: mettez-les dans deux champs, ou écrivez l’une en lettres latines.`))
    .concat(loose.length?[`${loose.length>1?'Les caractères':'Le caractère'} <b class="badch">${esc(loose.join(' '))}</b> ${loose.length>1?'ne peuvent':'ne peut'} pas être imprimé${loose.length>1?'s':''} (texte venu des Réglages, de l’annuaire ou du modèle : prévenez l’admin).`]:[]);
  const plur=found.reduce((n,f)=>n+f.gs.length,0)+loose.length>1, onlyMix=!found.length&&!loose.length;
  openModal(`<h3 id="modal-title">${onlyMix?'Deux écritures dans un même champ':plur?'Des caractères ne peuvent pas être imprimés':'Un caractère ne peut pas être imprimé'}</h3>
    ${lines.length>1?`<ul class="errors">${lines.map(l=>`<li>${l}</li>`).join('')}</ul>`:`<p class="dv-sub">${lines[0]}</p>`}
    ${onlyMix?'':`<p>${plur?'Retirez-les ou remplacez-les':'Retirez-le ou remplacez-le'}, puis recommencez. Les lettres accentuées de toutes les langues à alphabet latin (vietnamien compris), le grec, le cyrillique, l’arabe et le géorgien s’impriment\u202f; les emoji et les autres écritures (chinois, hébreu…), non.</p>`}
    <div class="btns"><button class="primary alt" id="bc-fix" data-autofocus>${found.length||mixed.length?'Corriger':'OK'}</button></div>`);
  $('#bc-fix').onclick=()=>{ closeModal(); const f=found[0]||mixed[0]; if(!f) return; const el=f.el;
    el.scrollIntoView({block:'center'}); el.focus(); try{ if(f.at>=0) el.setSelectionRange(f.at,f.at+f.g.length); }catch(e){} };
  return false;
}
/* Documents qui portent des données de santé : formulaires de la rubrique Médical (dont l'orientation
   aux urgences) et formulaires marqués « Confidentiel – données de santé ». */
function docSante(){
  if(BUILTIN_CARDS.some(b=>b[1]==='med'&&b[0]==='__'+tab)) return true;
  const f=tab==='forms'&&formView&&DATA.formulaires.find(x=>x.id===formView);
  return !!(f&&(formGroup(f)==='med'||(f.confidentiel&&!f.groupe)));   // comme la mention « Confidentiel – données de santé » de makeLetter
}
/* Fenêtre unique « document prêt » : aperçu, puis Imprimer · Envoyer par mail · Télécharger. */
function deliver({files,title,steps,mail,sensitive,onDone,sante}){
  if(!LIVE_DRY&&!pdfCharsOk()) return;
  if(sante==null&&!LIVE_DRY) sante=docSante();
  if(stLastForm&&Date.now()-stLastForm.t<4*3600e3){ stBump(stLastForm.k,'g'); stLastForm=null; }
  if(LIVE_DRY){ LIVE_OUT=files; return; }
  sendUrls.forEach(u=>URL.revokeObjectURL(u)); sendUrls=files.map(f=>URL.createObjectURL(f));
  const N=files.length, mode=PAR.mail||'outlook', to=(mail&&mail.to)||[];
  const sub=(steps&&steps.length)?steps.join(' '):'Vérifiez avec « Aperçu », puis choisissez :';
  const toTxt=to.length?'À : '+to.slice(0,2).map(esc).join(', ')+(to.length>2?` +${to.length-2}`:''):(mode==='outlook'?'Outlook':'messagerie web');
  openModal(`<h3 id="modal-title">${esc(title)}</h3>
    <p class="dv-sub">${sub}</p>
    ${files.map((f,i)=>`<a class="dv-file" href="${sendUrls[i]}" target="_blank" rel="noopener">${ICON.file}<span>${esc(f.name)}</span><b>Aperçu ›</b></a>`).join('')}
    ${N>1?`<div class="dv-mode" role="radiogroup" aria-label="Plusieurs documents">
      <label><input type="radio" name="dv-mode" value="grp" checked>Groupés en un seul PDF</label>
      <label><input type="radio" name="dv-mode" value="sep">Séparés (${N} fichiers)</label></div>`:''}
    <div class="dv-acts">
      <button class="dv-act main" id="dv-print">${ICON.print}Imprimer</button>
      ${mail&&!PAR.sansMail?`<button class="dv-act" id="dv-mail" ${sante?'aria-describedby="dv-sante"':''}>${ICON.mail}Envoyer par mail<small>${sante?'Mail ordinaire, non sécurisé':toTxt}</small></button>`:''}
      <button class="dv-act" id="dv-dl">${ICON.dl}Télécharger</button>
    </div>
    ${sante&&mail&&!PAR.sansMail?`<div class="dv-warn" id="dv-sante" role="note"><b>${ICON.shield}Données de santé</b><span>Un mail ordinaire n’est pas une messagerie sécurisée de santé. Pour transmettre ce document, utilisez votre messagerie <b>MSSanté</b>, ou remettez-le en main propre.</span></div>`:''}
    <div class="dv-note" id="dv-note" hidden></div>
    <div class="dv-perso" id="dv-perso" role="status" hidden></div>
    <div class="dv-foot"><button class="ghost" data-close>Revenir sans effacer</button><button class="primary alt" id="dv-done">Terminé : effacer</button></div>`,'deliver');
  const box=$('#modal-box'), note=box.querySelector('#dv-note'), perso=box.querySelector('#dv-perso');
  const say=html=>{ note.innerHTML=html; note.hidden=false; };
  /* Rappel : un fichier créé sur le poste reste dans Téléchargements. Encadré visible dès sa création,
     avec le nom exact de chaque fichier, et rappel à « Terminé : effacer ». */
  const created=[];
  const remind=names=>{ names.forEach(n=>{ if(n&&!created.includes(n)) created.push(n); }); if(!created.length) return;
    perso.innerHTML=`<b>${sensitive?'Ce fichier contient des données personnelles.':'Si ce fichier contient des données personnelles, ne le laissez pas sur le poste.'}</b>
      <span>Supprimez-le de <b>Téléchargements</b> dès qu’il est envoyé ou imprimé${created.length>1?' (les '+created.length+' fichiers)':''} :</span>
      <ul>${created.map(n=>`<li><code>${esc(n)}</code></li>`).join('')}</ul>`;
    perso.hidden=false; perso.scrollIntoView({block:'nearest'}); };
  const mark=id=>box.querySelector(id).classList.add('done');
  const grouped=()=>N>1&&box.querySelector('input[name=dv-mode]:checked').value==='grp';
  let merged=null;
  const mergedFile=async()=>{ if(merged) return merged;
    await needLib('pdflib'); const out=await PDFLib.PDFDocument.create();
    for(const f of files){ const src=await PDFLib.PDFDocument.load(await f.arrayBuffer(),{ignoreEncryption:true}); (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p)); }
    return merged=new File([await out.save()],'Documents-groupes_'+today()+'.pdf',{type:'application/pdf'}); };
  const pick=async()=>{ if(!grouped()) return files; try{ return [await mergedFile()]; }catch(e){ toast('Regroupement impossible : fichiers séparés'); return files; } };
  box.querySelector('#dv-print').onclick=async()=>{
    mark('#dv-print');
    const fs=await pick(); fs.forEach((f,i)=>setTimeout(()=>printBlob(f,true),i*1500));
    if(fs.length>1) say(`${fs.length} fenêtres d’impression vont s’ouvrir l’une après l’autre.`);
  };
  box.querySelector('#dv-dl').onclick=async()=>{ const fs=await pick(); fs.forEach(f=>downloadBlob(f,f.name)); mark('#dv-dl'); say(`${fs.length>1?fs.length+' fichiers téléchargés':'PDF téléchargé'} dans le dossier Téléchargements.`); remind(fs.map(f=>f.name)); };
  const m=box.querySelector('#dv-mail');
  if(m) m.onclick=async()=>{
    const fs=await pick();
    if(mode!=='outlook') fs.forEach(f=>downloadBlob(f,f.name));
    mailCompose.lastEml=null;
    await mailCompose({to,subject:mail.subject,body:mail.body,files:mode==='outlook'?fs:[]});
    mark('#dv-mail'); remind(mode==='outlook'?[mailCompose.lastEml]:fs.map(f=>f.name));
    say(mode==='outlook'
      ?`<b>Ouvrez le fichier .eml</b> qui vient d’être téléchargé : Outlook s’ouvre avec le mail prêt et le PDF joint. Vérifiez, puis envoyez.`
      :`Votre messagerie s’ouvre avec le destinataire et le texte. <b>Joignez le PDF</b> téléchargé (bouton Joindre).`);
  };
  box.querySelector('#dv-done').onclick=()=>{ closeModal(); sendUrls.forEach(u=>URL.revokeObjectURL(u)); sendUrls=[]; onDone&&onDone();
    if(!created.length){ toast('C’est fait : le formulaire est vidé'); return; }
    openModal(`<h3 id="modal-title">Formulaire vidé. ${created.length>1?`Restent ${created.length} fichiers`:'Reste un fichier'} sur ce poste</h3>
      <div class="dv-perso"><b>${created.length>1?'Ces fichiers sont':'Ce fichier est'} encore dans Téléchargements${sensitive?', avec des données personnelles':''}.</b>
        <span>Supprimez-${created.length>1?'les':'le'} dès ${created.length>1?'qu’ils sont envoyés ou imprimés':'qu’il est envoyé ou imprimé'} :</span>
        <ul>${created.map(n=>`<li><code>${esc(n)}</code></li>`).join('')}</ul></div>
      <div class="btns"><button class="primary alt" data-close data-autofocus>J’ai compris</button></div>`); };
}

/* ---------- Délivrance : branchée sur la fenêtre d'envoi commune ---------- */
function subject(){ return `${structure.nom} – Délivrance exceptionnelle – ${frDate(F.date||today())}`; }
function mailBody(n){
  const D=dest()||{structure:''};
  return `Bonjour,\n\nVeuillez trouver ci-joint ${n>1?`${n} attestations`:'une attestation'} de délivrance exceptionnelle de traitement de substitution, pour ${n>1?'des patients suivis':'un patient suivi'} par ${D.structure||'votre structure'}.\n\nN'hésitez pas à nous contacter pour toute information complémentaire.\n\nCordialement,\n${structure.signataire}`;
}
async function prepare(force){
  const {errs,keys}=validate();
  if(errs.length&&!force){ showErrors=true; renderDeliv(); delivMissing(errs,()=>prepare(true),keys); return; }
  showErrors=false; renderDeliv();
  try{ await pdfReady(); }catch(e){ return; }
  revoke();
  try{
    const logo=await loadLogo(), N=F.patients.length;
    let tp=null; try{ tp=await loadTampon(); }catch(e){}
    files=F.patients.map((pt,i)=>new File([makePdf(pt,logo,tp)],`Delivrance-exceptionnelle_${F.date||today()}${N>1?`_${i+1}-sur-${N}`:''}.pdf`,{type:'application/pdf'}));
  }catch(e){ console.error(e); toast('Le PDF n’a pas pu être créé. Réessayez ; si cela recommence, prévenez l’admin.'); return; }
  const D=dest()||{structure:'',adresses:[]}, N=files.length;
  showSendGeneric({files,to:D.adresses,subject:subject(),body:mailBody(N),sensitive:true,onDone:()=>clearAll()});
}


/* ======================================================================
   5. KITS, ÉPINGLÉS, RÉVISIONS, MODÈLES WORD
   ====================================================================== */
const kitDocs=k=>(k.docs||[]).map(id=>DATA.documents.find(d=>d.id===id)).filter(Boolean);
const docById=id=>docs().find(d=>d.id===id);

/* ---------- Impression d'un fichier (commune) ---------- */
function printBlob(blob,isPdf){
  const u=URL.createObjectURL(blob);
  const old=document.getElementById('print-frame'); old&&old.remove();
  const fr=document.createElement('iframe'); fr.id='print-frame'; fr.setAttribute('aria-hidden','true'); fr.tabIndex=-1;
  fr.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
  if(isPdf) fr.src=u; else fr.srcdoc=`<html><head><style>body{margin:0}img{max-width:100%}</style></head><body><img src="${u}"></body></html>`;
  fr.onload=()=>setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(err){ previewUrl(u,'Impression'); toast('Ctrl+P pour imprimer'); } },400);
  document.body.appendChild(fr); toast('Ouverture de l’impression…');
  setTimeout(()=>URL.revokeObjectURL(u),10*60000);
}

/* ---------- Kits ---------- */
async function kitPrint(k){
  const ds=kitDocs(k), pr=ds.filter(d=>['pdf','png','jpg','jpeg'].includes(d.ext)), other=ds.filter(d=>!pr.includes(d));
  if(!pr.length){ kitOthers(other,true); return; }
  try{
    toast('Préparation du kit…');
    await needLib('pdflib'); const out=await PDFLib.PDFDocument.create();
    for(const d of pr){
      const buf=await (await readRel(d.chemin)).arrayBuffer();
      if(d.ext==='pdf'){ const src=await PDFLib.PDFDocument.load(buf,{ignoreEncryption:true}); (await out.copyPages(src,src.getPageIndices())).forEach(p=>out.addPage(p)); }
      else{ const img=d.ext==='png'?await out.embedPng(buf):await out.embedJpg(buf); const pg=out.addPage([595.28,841.89]); const s=Math.min(555/img.width,800/img.height,1); pg.drawImage(img,{x:(595.28-img.width*s)/2,y:(841.89-img.height*s)/2,width:img.width*s,height:img.height*s}); }
    }
    printBlob(new Blob([await out.save()],{type:'application/pdf'}),true);
    if(other.length) setTimeout(()=>kitOthers(other,false),800);
  }catch(e){ if(e instanceof Cancel) return; console.error(e); const m=fsErr(e); m&&toast(m); }
}
function kitOthers(list,none){
  openModal(`<h3 id="modal-title">${none?'Documents à imprimer depuis Word':'À imprimer aussi'}</h3>
    <p>${none?'Ce kit ne contient que des documents Word ou Excel :':'Ces documents ne peuvent pas être fusionnés à l’impression :'} ouvrez-les puis Ctrl+P.</p>
    <div class="vlist">${list.map(d=>`<a href="${hrefOf(d.chemin)}" target="_blank" rel="noopener">${esc(d.titre)} (${esc(d.ext.toUpperCase())})</a>`).join('')}</div>
    <button class="secondary" data-close>OK</button>`);
}
async function kitDownload(k){
  try{ for(const d of kitDocs(k)){ const f=await readRel(d.chemin); downloadBlob(new Blob([f],{type:MIME[d.ext]||f.type}),d.fichier); } toast('Téléchargements lancés'); }
  catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); }
}
function sendMany(titre,list){
  sendDialog(`Envoyer « ${titre} »`,`<p>${list.length} document${list.length>1?'s':''} : ${list.map(d=>esc(d.titre)).join(', ')}</p>`,list.length,async to=>{
    let files=[];
    try{ for(const d of list){ const f=await readRel(d.chemin); files.push(new File([f],d.fichier,{type:MIME[d.ext]||f.type})); } }
    catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
    if((PAR.mail||'outlook')!=='outlook') files.forEach(f=>downloadBlob(f,f.name));
    closeModal();
    await mailCompose({to,subject:`Librejo – ${titre}`,body:`Bonjour,\n\nVeuillez trouver ci-joint :\n${list.map(d=>'- '+d.titre).join('\n')}\n\nCordialement`,files:(PAR.mail||'outlook')==='outlook'?files:[]});
  });
}

function renderKits(){
  const ks=DATA.kits;
  return `<div class="cards">${ks.map(k=>{ const ds=kitDocs(k); return `<div class="fcard" data-kit="${esc(k.id)}">
      <b>${esc(k.titre)}${k.epingle&&isAdmin?' ★':''}</b><span>${esc(k.description||'')}</span>
      <ol class="how compact">${ds.map(d=>`<li><a class="ink" href="${hrefOf(d.chemin)}" target="_blank" rel="noopener">${esc(d.titre)}</a></li>`).join('')||'<li>Vide</li>'}</ol>
      <div class="row gap-s">
        <button class="iconbtn" data-kprint="${esc(k.id)}" title="Imprimer tout" aria-label="Imprimer tout le kit ${esc(k.titre)}">${ICON.print}</button>
        <button class="iconbtn" data-ksend="${esc(k.id)}" title="Envoyer tout par mail" aria-label="Envoyer tout le kit ${esc(k.titre)}">${ICON.mail}</button>
        <button class="iconbtn" data-kdl="${esc(k.id)}" title="Télécharger tout" aria-label="Télécharger tout le kit ${esc(k.titre)}">${ICON.dl}</button>
        ${isAdmin?`<button class="iconbtn adm" data-kedit="${esc(k.id)}" title="Modifier le kit" aria-label="Modifier le kit ${esc(k.titre)}">${ICON.pen}</button>`:''}
      </div></div>`; }).join('')}
    ${isAdmin?`<button class="fcard new" data-knew><b>+ Nouveau kit</b><span>Regrouper des documents à imprimer ou envoyer ensemble</span></button>`:''}</div>
    ${!ks.length&&!isAdmin?'<p class="hint">Aucun kit pour l’instant.</p>':''}`;
}
function editKit(id){
  const k=id?DATA.kits.find(x=>x.id===id):null;
  const kd=k?JSON.parse(JSON.stringify(k)):{id:'k'+rid(),titre:'',description:'',epingle:false,docs:[]};
  const draw=()=>{
    const sel=new Set(kd.docs);
    $('#k-docs').innerHTML=cats().map(c=>{ const ds=DATA.documents.filter(d=>d.categorie===c.id&&!isLink(d)); if(!ds.length) return '';
      return `<div class="mini-lbl mt-s">${esc(c.nom)}</div>${ds.map(d=>`<label class="check plain"><input type="checkbox" data-kd="${esc(d.id)}" ${sel.has(d.id)?'checked':''}> ${esc(d.titre)} <small class="hint muted">${esc(d.ext.toUpperCase())}</small></label>`).join('')}`; }).join('')||'<p class="hint">Aucun document.</p>';
    $('#k-order').innerHTML=kd.docs.map((did,i)=>{ const d=docById(did); return d?`<div class="row gap-s"><span class="grow">${i+1}. ${esc(d.titre)}</span><button class="iconbtn" data-kup="${i}" ${i?'':'disabled'} aria-label="Monter « ${esc(d.titre)} »">${ICON.upA}</button></div>`:''; }).join('');
  };
  openModal(`<h3 id="modal-title">${k?'Modifier le kit':'Nouveau kit'}</h3>
    <label class="field"><span>Nom du kit</span><input class="in" id="k-titre" value="${esc(kd.titre)}" placeholder="ex. Dossier d'inclusion complet"></label>
    <label class="field"><span>Description <small>(facultatif)</small></span><input class="in" id="k-desc" value="${esc(kd.description)}"></label>
    <label class="check"><input type="checkbox" id="k-pin" ${kd.epingle?'checked':''}> Épingler en page d'accueil</label>
    <div class="grid2 top"><div><div class="lbl">Documents du kit</div><div class="stack xs scroll" id="k-docs"></div></div>
      <div><div class="lbl">Ordre d'impression</div><div class="stack xs" id="k-order"></div></div></div>
    <div class="row between">${k?'<button class="ghost danger" id="k-del">Supprimer le kit</button>':'<span></span>'}<span class="row"><button class="secondary" data-close>Annuler</button><button class="primary" id="k-save">Enregistrer</button></span></div>`,'wide');
  draw();
  $('#k-docs').addEventListener('change',e=>{ const id=e.target.dataset.kd; if(!id) return; if(e.target.checked) kd.docs.push(id); else kd.docs=kd.docs.filter(x=>x!==id); draw(); });
  $('#k-order').addEventListener('click',e=>{ const b=e.target.closest('[data-kup]'); if(!b) return; const i=+b.dataset.kup; [kd.docs[i-1],kd.docs[i]]=[kd.docs[i],kd.docs[i-1]]; draw(); });
  $('#k-save').onclick=async()=>{
    kd.titre=$('#k-titre').value.trim(); kd.description=$('#k-desc').value.trim(); kd.epingle=$('#k-pin').checked;
    if(!kd.titre){ toast('Donnez un nom au kit.'); return; } if(!kd.docs.length){ toast('Choisissez au moins un document.'); return; }
    const keep=DATA.kits.slice(), i=DATA.kits.findIndex(x=>x.id===kd.id); if(i>=0) DATA.kits[i]=kd; else DATA.kits.push(kd);
    if(await run(saveData,'Kit enregistré')){ closeModal(); renderDocs(); } else DATA.kits=keep;
  };
  const del=$('#k-del'); if(del) del.onclick=()=>askConfirm('Supprimer ce kit ?','Les documents eux-mêmes ne sont pas touchés.','Supprimer',async()=>{ const keep=DATA.kits; DATA.kits=keep.filter(x=>x.id!==kd.id); if(!await run(saveData,'Kit supprimé')) DATA.kits=keep; renderDocs(); });
}

document.addEventListener('click',e=>{ const g=e.target.closest('[data-gotab]'); if(g){ setTab(g.dataset.gotab); window.scrollTo({top:0}); } });

/* ---------- Épinglés (page d'accueil) ---------- */
function renderPinned(){
  const {order}=pinnedAndUsed();
  if(!order.length) return '';
  const tile=(title,sub,btns,mark,th,href,fav)=>`<div class="fcard tile">${th||''}${mark}<b>${href?`<a class="gtitle" href="${href}" target="_blank" rel="noopener">${esc(title)}</a>`:esc(title)}${fav?favBtn(fav):''}</b>${sub?`<span>${esc(sub)}</span>`:''}<div class="row gap-s push">${btns}</div></div>`;
  const F=f=>tile(f.titre,'Formulaire',`<button class="lbtn" data-fill="${esc(f.id)}">${ICON.pen}Remplir</button>`,'',`<span class="tile-emoji" aria-hidden="true">${esc(formEmoji(f))}</span>`,'','f:'+f.id), K=k=>tile(k.titre,`Kit · ${kitDocs(k).length} documents`,`<button class="lbtn" data-kprint="${esc(k.id)}" aria-label="Imprimer le kit ${esc(k.titre)}">${ICON.print}Tout imprimer</button><button class="lbtn" data-ksend="${esc(k.id)}" aria-label="Envoyer le kit ${esc(k.titre)}">${ICON.mail}Tout envoyer</button>`,'<span class="badge accent m-0 self-start">Kit</span>'), D=d=>tile(d.titre,catName(d.categorie),`${d.modele?`<button class="lbtn" data-fillword="${esc(d.id)}">${ICON.pen}Remplir</button>`:''}${printable(d)?`<button class="lbtn" data-print="${esc(d.chemin)}" aria-label="Imprimer ${esc(d.titre)}">${ICON.print}Imprimer</button>`:''}<button class="lbtn" ${isLink(d)?`data-lsend="${esc(d.id)}"`:`data-send="${esc(d.chemin)}"`} aria-label="Envoyer ${esc(d.titre)}">${ICON.mail}Envoyer</button><a class="iconbtn" href="${isLink(d)?esc(d.url):hrefOf(d.chemin)}" target="_blank" rel="noopener" title="Ouvrir" aria-label="Ouvrir ${esc(d.titre)}">${ICON.open}</a>`,'',thumbSrc(d)?`<img class="tthumb" src="${thumbSrc(d)}" alt="" loading="lazy" data-err="remove">`:'',isLink(d)?esc(d.url):hrefOf(d.chemin),'d:'+d.id);
  return `<h2 class="lab">Les plus utilisés</h2>
  <div class="cards narrow">
    ${order.map(([t,x])=>t==='f'?F(x):t==='k'?K(x):D(x)).join('')}
  </div>`;
}

/* ---------- Modèles Word : champs {…} remplis par Librejo ---------- */
const WNS='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XMLNS='http://www.w3.org/XML/1998/namespace';
const AUTO_FIELDS={'date du jour':()=>frDate(today()),'ville':()=>structure.ville||'','association':()=>structure.nom};
const PREFILL={'signataire':()=>structure.signataire};
/* Médecins : nom tel qu'imprimé + n° RPPS (réglages admin). Le choix du signataire est retenu sur le poste. */
const DEFAULT_MED_LINE='';
var LIVE_DRY=false, LIVE_OUT=null;
const meds=()=>(PAR.medecins||[]).filter(m=>m&&m.nom);
const MED_KEY='docubus-medecin';
function medChoice(){ let v=''; try{ v=localStorage.getItem(MED_KEY)||''; }catch(e){} return meds().find(m=>m.rpps===v)||(LIVE_DRY?{nom:'Dr …',rpps:'…'}:MISS_OK?{nom:'Dr '+BLANK,rpps:BLANK}:null); }
function medSelectHTML(id){ const c=medChoice(); return meds().length?`<label class="field"><span>Signé par</span><select class="in" id="${id}" data-med>
  <option value="">${esc(structure.signataire)} (sans nom de médecin)</option>${meds().map(m=>`<option value="${esc(m.rpps)}" ${c&&c.rpps===m.rpps?'selected':''}>${esc(m.nom)} – RPPS ${esc(m.rpps)}</option>`).join('')}</select></label>`:''; }
document.addEventListener('change',e=>{ if(e.target.matches&&e.target.matches('[data-med]')){ try{ localStorage.setItem(MED_KEY,e.target.value); }catch(_){} } });
async function docxParts(zip){ return Object.keys(zip.files).filter(n=>/^word\/(document|header\d*|footer\d*)\.xml$/.test(n)); }
async function docxFields(blob){
  await needLib('jszip'); const zip=await JSZip.loadAsync(blob); const seen=new Map();
  for(const n of await docxParts(zip)){
    const x=new DOMParser().parseFromString(await zip.file(n).async('string'),'application/xml');
    for(const p of x.getElementsByTagNameNS(WNS,'p')){
      const txt=[...p.getElementsByTagNameNS(WNS,'t')].map(t=>t.textContent).join('');
      for(const m of txt.matchAll(/\{([^{}]{1,60})\}/g)){ const k=m[1].trim(); if(!seen.has(norm(k))) seen.set(norm(k),k); }
    }
  }
  return [...seen.values()];
}
/* Remplace {Champ} même si Word a coupé le texte en plusieurs morceaux */
async function docxFill(blob,vals){
  await needLib('jszip'); const zip=await JSZip.loadAsync(blob);
  for(const n of await docxParts(zip)){
    const x=new DOMParser().parseFromString(await zip.file(n).async('string'),'application/xml'); let changed=false;
    for(const p of [...x.getElementsByTagNameNS(WNS,'p')]){
      const ts=[...p.getElementsByTagNameNS(WNS,'t')]; if(!ts.length) continue;
      const full=ts.map(t=>t.textContent).join(''); if(!full.includes('{')) continue;
      const starts=[]; let acc=0; ts.forEach(t=>{ starts.push(acc); acc+=t.textContent.length; });
      const at=pos=>{ let i=ts.length-1; while(i>0&&starts[i]>pos) i--; return [i,pos-starts[i]]; };
      const ms=[...full.matchAll(/\{([^{}]{1,60})\}/g)].filter(m=>vals.has(norm(m[1].trim()))).reverse();
      for(const m of ms){
        const val=vals.get(norm(m[1].trim())), s=m.index, e=m.index+m[0].length;
        const [si,so]=at(s), [ei,eo]=at(e-1);
        if(si===ei){ const t=ts[si].textContent; ts[si].textContent=t.slice(0,so)+val+t.slice(eo+1); }
        else{ ts[si].textContent=ts[si].textContent.slice(0,so)+val; for(let i=si+1;i<ei;i++) ts[i].textContent=''; ts[ei].textContent=ts[ei].textContent.slice(eo+1); }
        ts[si].setAttributeNS(XMLNS,'xml:space','preserve'); ts[ei].setAttributeNS(XMLNS,'xml:space','preserve'); changed=true;
      }
      // Retours à la ligne dans une valeur : saut de ligne Word
      for(const t of ts){ if(!t.textContent.includes('\n')) continue;
        const parts=t.textContent.split('\n'); t.textContent=parts[0]; let ref=t;
        for(const part of parts.slice(1)){ const br=x.createElementNS(WNS,'w:br'); ref.parentNode.insertBefore(br,ref.nextSibling); const nt=x.createElementNS(WNS,'w:t'); nt.setAttributeNS(XMLNS,'xml:space','preserve'); nt.textContent=part; br.parentNode.insertBefore(nt,br.nextSibling); ref=nt; } }
    }
    if(changed) zip.file(n,new XMLSerializer().serializeToString(x));
  }
  return zip.generateAsync({type:'blob',mimeType:MIME.docx});
}
const fieldType=label=>{ const n=norm(label); if(/date/.test(n)) return 'date'; if(/(message|texte|motif|observation|commentaire|situation|element|contenu|precision)/.test(n)) return 'long'; return 'texte'; };
async function fillWord(d){
  let file;
  try{ file=await readRel(d.chemin); }catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); return; }
  let fields=d.champs&&d.champs.length?d.champs:await docxFields(file);
  const asked=fields.filter(f=>!(norm(f) in AUTO_FIELDS));
  const destField=asked.find(f=>/destinataire|partenaire|structure|hopital|^a l'attention/.test(norm(f))&&!/adresse|mail|tel/.test(norm(f)));
  const addrField=asked.find(f=>/adresse/.test(norm(f))&&!/mail/.test(norm(f)));
  const V={}; asked.forEach(f=>{ const p=PREFILL[norm(f)]; V[f]=p?p():''; });
  const medF=asked.filter(f=>/medecin|docteur|prescripteur|signataire/.test(norm(f))), rppsF=asked.find(f=>/rpps/.test(norm(f)));
  if(rppsF&&medChoice()){ const c=medChoice(); medF.forEach(f=>{ if(!/signataire/.test(norm(f))||!V[f]||V[f]===structure.signataire) V[f]=c.nom; }); V[rppsF]=c.rpps; }
  const inp=f=>{ const t=fieldType(f), v=V[f]??'';
    if(medF.includes(f)&&meds().length) return `<input class="in" data-w="${esc(f)}" value="${esc(v)}" list="w-meds" autocomplete="off" placeholder="Choisir un médecin ou écrire un nom">`;
    return t==='long'?`<textarea class="in" data-w="${esc(f)}" rows="4">${esc(v)}</textarea>`:t==='date'?`<input class="in" type="date" data-w="${esc(f)}" value="${esc(v)}">`:`<input class="in" data-w="${esc(f)}" value="${esc(v)}" autocomplete="off">`; };
  openModal(`<h3 id="modal-title">${esc(d.titre)}</h3>
    <p>Remplissez les champs : Librejo produit un fichier Word prêt, que vous pouvez encore retoucher.${fields.some(f=>norm(f) in AUTO_FIELDS)?' La date du jour est ajoutée automatiquement.':''}</p>
    ${meds().length&&(medF.length||rppsF)?`<datalist id="w-meds">${[structure.signataire,...meds().map(m=>m.nom)].map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`:''}
    ${destField?`<label class="field wide partpick"><span>Partenaire <small>(remplit ${esc(destField)}${addrField?' et '+esc(addrField):''}, et propose ses adresses mail)</small></span><input class="in" id="w-part" list="w-partlist" placeholder="Chercher dans l'annuaire : nom ou type (ex. LHSS)…" autocomplete="off"><datalist id="w-partlist">${ANNU.partenaires.map(p=>`<option value="${esc(p.nom)}">${esc(p.type)}</option>`).join('')}</datalist></label>`:''}
    <div class="fieldgrid">${asked.map(f=>`<label class="field ${fieldType(f)==='long'?'wide':''}"><span>${esc(f)}</span>${inp(f)}</label>`).join('')}
      <div class="field wide"><span>Envoyer à <small>(facultatif, pour préparer le mail)</small></span>${recipHTML('w-rc')}${senderHTML()}</div></div>
    <div class="notice">S'il contient des données de patient, supprimez le fichier de vos Téléchargements après usage.</div>
    <div class="btns"><button class="primary" id="w-dl">${ICON.dl}Télécharger le Word rempli (à retoucher)</button>
      <button class="secondary" id="w-mail">${ICON.mail}Préparer le mail avec ce Word joint</button><button class="ghost" data-close>Annuler</button></div>`,'wide');
  const box=$('#modal-box');
  box.addEventListener('input',e=>{ const k=e.target.dataset.w; if(k!==undefined) V[k]=e.target.value;
    if(k!==undefined&&medF.includes(k)&&rppsF){ const m=meds().find(x=>x.nom===e.target.value.trim()); if(m){ V[rppsF]=m.rpps; const r=box.querySelector(`[data-w="${CSS.escape(rppsF)}"]`); if(r) r.value=m.rpps; } } });
  const WR=bindRecip(box.querySelector('#w-rc'),[]);
  const wp=box.querySelector('#w-part');
  if(wp) wp.addEventListener('change',()=>{ const p=ANNU.partenaires.find(x=>x.nom===wp.value.trim()); if(!p) return;
    const setF=(f,v)=>{ if(!f) return; V[f]=v; const el=box.querySelector(`[data-w="${CSS.escape(f)}"]`); if(el) el.value=v; };
    setF(destField,p.nom); setF(addrField,partAddr(p)); p.emails.forEach(m=>WR.add(m));
    toast(p.emails.length?`${p.nom} : adresse${p.emails.length>1?'s':''} ajoutée${p.emails.length>1?'s':''} aux destinataires`:`${p.nom} : pas d’adresse mail dans l’annuaire`); });
  const build=async()=>{
    const vals=new Map(); fields.forEach(f=>{ const n=norm(f); let v=n in AUTO_FIELDS?AUTO_FIELDS[n]():String(V[f]??''); if(fieldType(f)==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(v)) v=frDate(v); vals.set(n,v); });
    const out=await docxFill(file,vals);
    return new File([out],`${fileSafe(d.titre)}_${today()}.docx`,{type:MIME.docx});
  };
  box.querySelector('#w-dl').onclick=async()=>{ const f=await build(); downloadBlob(f,f.name); toast('Word prêt : cliquez dessus dans la barre de téléchargement'); };
  box.querySelector('#w-mail').onclick=async()=>{
    const to=WR.get();
    const f=await build(); closeModal();
    if((PAR.mail||'outlook')!=='outlook') downloadBlob(f,f.name);
    await mailCompose({to,subject:d.titre,body:'Bonjour,\n\nVeuillez trouver ci-joint notre courrier.\n\nCordialement,\n'+(V['Signataire']||structure.signataire),files:(PAR.mail||'outlook')==='outlook'?[f]:[]});
  };
}
async function detectModel(d,file){
  if(d.ext!=='docx') { d.modele=false; d.champs=[]; return; }
  try{ const f=await docxFields(file||await readRel(d.chemin)); d.champs=f; d.modele=f.length>0; }catch(e){ d.modele=false; d.champs=[]; }
}


/* ---------- Menu « Plus d'actions » d'un document ---------- */
function closeMenu(){ const m=document.getElementById('menu'); if(m){ if(m._btn) m._btn.setAttribute('aria-expanded','false'); m.remove(); document.removeEventListener('mousedown',menuOutside,true); } }
/* Menus « Plus d'actions » (role=menu) au clavier : flèches haut et bas (en boucle), Début, Fin. Échap et Tab
   ferment le menu et rendent le focus à son bouton ; Tab continue ensuite vers l'élément suivant (Maj+Tab, le précédent). */
function menuWire(m,btn){
  m._btn=btn; btn.setAttribute('aria-expanded','true');
  m.querySelectorAll('[role=menuitem]').forEach(b=>b.tabIndex=-1);
  m.addEventListener('keydown',e=>{ const bs=[...m.querySelectorAll('[role=menuitem]')], i=bs.indexOf(document.activeElement), k=e.key;
    const n=k==='ArrowDown'?i+1:k==='ArrowUp'?i-1:k==='Home'?0:k==='End'?bs.length-1:null;
    if(n!==null){ e.preventDefault(); bs[(n+bs.length)%bs.length].focus(); return; }
    if(k==='Escape'){ e.preventDefault(); closeMenu(); btn.focus(); return; }
    if(k==='Tab'){ closeMenu(); btn.focus(); } });
}
function menuOutside(e){ if(!e.target.closest('#menu')&&!e.target.closest('[data-more]')) closeMenu(); }
function moreMenu(btn,d){
  if(document.getElementById('menu')){ closeMenu(); return; }
  const items=[
    ['Modifier une copie (l’original reste intact)',ICON.pen,()=>copyDoc(d)],
    ['Copier l’emplacement du fichier',ICON.copy,()=>copyText(winPath(d.chemin)).then(ok=>toast(ok?'Emplacement copié':'Copie impossible'))],
  ];
  if(isAdmin&&tpOK(d.ext)) items.unshift(['Marquer : nom, version, n° de page, logo, pied de page',ICON.pen,()=>markDoc(d)]);
  if(isAdmin) items.unshift(['Modifier ce document (admin : nouvelle version ou correction)',ICON.pen,()=>modifyDoc(d)]);
  if(isAdmin) items.push(['Gérer : description, version, archive…',svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),()=>editDoc(d)]);
  const m=document.createElement('div'); m.id='menu'; m.className='menu'; m.setAttribute('role','menu');
  m.innerHTML=items.map((it,i)=>`<button role="menuitem" data-i="${i}">${it[1]}<span>${esc(it[0])}</span></button>`).join('');
  document.body.appendChild(m);
  const r=btn.getBoundingClientRect(), w=m.offsetWidth;
  m.style.top=(window.scrollY+r.bottom+6)+'px'; m.style.left=Math.max(8,window.scrollX+r.right-w)+'px';
  m.addEventListener('click',e=>{ const b=e.target.closest('[data-i]'); if(!b) return; closeMenu(); btn.focus(); items[+b.dataset.i][2](); });
  menuWire(m,btn);
  m.querySelector('button').focus();
  setTimeout(()=>document.addEventListener('mousedown',menuOutside,true),0);
}
window.addEventListener('resize',closeMenu); window.addEventListener('scroll',()=>{ if(document.getElementById('menu')) closeMenu(); },{passive:true});

/* ---------- Glisser-déposer (mode admin) ----------
   - sur la page ou une catégorie : ajoute les fichiers (dans la catégorie visée)
   - sur la ligne d'un document : dépose une nouvelle version */
let dragDepth=0;
const hasFiles=e=>e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
function dropTarget(e){ return e.target.closest&&(e.target.closest('[data-row]')||e.target.closest('.catbtn[data-filter]')); }
function markTarget(el){ document.querySelectorAll('.droptarget').forEach(x=>x.classList.remove('droptarget')); if(el) el.classList.add('droptarget'); }
document.addEventListener('dragenter',e=>{ if(!isAdmin||!hasFiles(e)||!$('#modal').hidden||tab!=='docs') return; e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
document.addEventListener('dragover',e=>{ if(!isAdmin||!hasFiles(e)||!$('#modal').hidden||tab!=='docs') return; e.preventDefault(); e.dataTransfer.dropEffect='copy';
  const t=dropTarget(e), c=t&&t.classList.contains('catbtn')&&!isDest(t.dataset.filter)?null:t; markTarget(c);
  const hint=$('#drophint'); if(hint) hint.textContent=c?(c.matches('[data-row]')?`Nouvelle version de « ${(DATA.documents.find(d=>d.chemin===c.dataset.row)||{}).titre||''} »`:`Ajouter dans « ${destName(c.dataset.filter)} »`):(isDest(filter)?`Ajouter dans « ${destName(filter)} »`:'Déposez : Librejo proposera où ranger'); });
document.addEventListener('dragleave',e=>{ if(!document.body.classList.contains('dragging')) return; dragDepth=Math.max(0,dragDepth-1); if(!dragDepth){ document.body.classList.remove('dragging'); markTarget(null); } });
document.addEventListener('drop',e=>{
  if(!document.body.classList.contains('dragging')) return;
  e.preventDefault(); dragDepth=0; document.body.classList.remove('dragging'); markTarget(null);
  const files=[...e.dataTransfer.files]; if(!files.length) return;
  const t=dropTarget(e);
  if(t&&t.matches('[data-row]')){
    const d=DATA.documents.find(x=>x.chemin===t.dataset.row);
    if(d&&files.length===1){ askConfirm('Déposer une nouvelle version ?',`« ${esc(files[0].name)} » remplacera « ${esc(d.titre)} » (v${esc(d.version||'1')}) ; l’ancienne version est archivée, pas écrasée.`,'Nouvelle version',async()=>{ if(await newVersion(d,files[0])) renderDocs(); },false); return; }
  }
  const cat=t&&t.matches('.catbtn')&&isDest(t.dataset.filter)?t.dataset.filter:null;
  addDocs(files,cat);
});


/* ======================================================================
   6. MINIATURES (créées par l'admin, rangées dans app/miniatures dans le dossier)
   PDF : 1re page ; images : réduites ; Word : vignette intégrée au fichier, sinon aperçu du texte.
   ====================================================================== */
const THUMB_DIR='app/miniatures';
const thumbSrc=d=>d.miniature?`${THUMB_DIR}/${encodeURIComponent(d.id)}.jpg?v=${encodeURIComponent(d.miniature)}`:'';
let pdfjsReady=null;
function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=()=>rej(new Error('Chargement impossible : '+src)); document.head.appendChild(s); }); }
function getPdfjs(){
  if(!pdfjsReady) pdfjsReady=(async()=>{
    // Le moteur PDF tourne dans la page (pas de « worker » : interdit pour une page ouverte depuis le dossier).
    // pdf.js 5 (outils/pdfjs-classique.py) : décodeurs d'images en WebAssembly dans app/lib/pdfjs-wasm/.
    self.LJ_PDFJS_BASE=new URL('app/lib/',location.href).href;
    await loadScript('app/lib/pdf.worker.min.js'); await loadScript('app/lib/pdf.min.js');
    const lib=window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc='app/lib/pdf.worker.min.js';
    // réglages imposés à chaque ouverture : jamais de code exécuté depuis un PDF
    const open=lib.getDocument.bind(lib);
    return Object.assign(Object.create(lib),{getDocument:o=>open({...o,isEvalSupported:false,enableScripting:false,wasmUrl:self.LJ_PDFJS_BASE+'pdfjs-wasm/'})});
  })();
  return pdfjsReady;
}
const TW=240, TH=Math.round(240*1.414);
function pageCanvas(){ const c=document.createElement('canvas'); c.width=TW; c.height=TH; const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,TW,TH); return [c,x]; }
async function thumbPdf(file){
  const lib=await getPdfjs();
  const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false,disableFontFace:false}).promise;
  try{
    const page=await pdf.getPage(1), v1=page.getViewport({scale:1}), vp=page.getViewport({scale:2*TW/v1.width});
    const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
    const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:x,viewport:vp}).promise; return c;
  }finally{ pdf.destroy(); }
}
async function thumbImage(file){
  const bmp=await createImageBitmap(file); const s=Math.min(1,2*TW/bmp.width);
  const c=document.createElement('canvas'); c.width=Math.round(bmp.width*s); c.height=Math.round(bmp.height*s);
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(bmp,0,0,c.width,c.height); return c;
}
async function thumbDocx(file){
  await needLib('jszip'); const zip=await JSZip.loadAsync(file);
  const emb=Object.keys(zip.files).find(n=>/^docProps\/thumbnail\.(jpe?g|png)$/i.test(n));
  if(emb){ try{ return await thumbImage(await zip.file(emb).async('blob')); }catch(e){} }
  // Aperçu de la première page : paragraphes et tableaux dans l'ordre du document
  const x=new DOMParser().parseFromString(await zip.file('word/document.xml').async('string'),'application/xml');
  const kids=(el,name)=>[...el.children].filter(k=>k.namespaceURI===WNS&&k.localName===name);
  const ptext=p=>[...p.getElementsByTagNameNS(WNS,'t')].map(t=>t.textContent).join('').trim();
  const pbold=p=>!!p.getElementsByTagNameNS(WNS,'b').length;
  const body=x.getElementsByTagNameNS(WNS,'body')[0];
  const blocks=[];
  const walk=el=>{ for(const k of el.children){ if(k.namespaceURI!==WNS) continue;
    if(k.localName==='p'){ const t=ptext(k); if(t) blocks.push({p:t,b:pbold(k)}); }
    else if(k.localName==='tbl') blocks.push({tbl:k});
    else if(k.localName==='sdt'){ const c=kids(k,'sdtContent')[0]; if(c) walk(c); } } };
  if(body) walk(body);
  const pg=[...x.getElementsByTagNameNS(WNS,'pgSz')].pop();
  const land=!!pg&&(pg.getAttributeNS(WNS,'orient')==='landscape'||+pg.getAttributeNS(WNS,'w')>+pg.getAttributeNS(WNS,'h'));
  // canevas à la forme de la page (couchée si paysage), en double définition pour rester net
  const SC=2, PW=TW, PH=land?Math.round(TW/1.414):TH, OX=0, OY=0;
  const c=document.createElement('canvas'); c.width=PW*SC; c.height=PH*SC; const g=c.getContext('2d'); g.scale(SC,SC); g.fillStyle='#fff'; g.fillRect(0,0,PW,PH);
  const M=land?10:18, R=OX+PW-M, BOT=OY+PH-M; let y=OY+M+(land?4:6);
  const media=Object.keys(zip.files).find(n=>/^word\/media\/.+\.(jpe?g|png)$/i.test(n));
  if(media){ try{ const bmp=await createImageBitmap(await zip.file(media).async('blob')); const h=land?20:34, w=bmp.width*h/bmp.height; g.drawImage(bmp,OX+M,y-4,Math.min(w,land?40:60),h); y+=h+(land?2:4); }catch(e){} }
  const font=(b,s)=>{ g.font=`${b?'bold':'normal'} ${s}px Arial, sans-serif`; };
  // découpe un texte en lignes d'une largeur donnée
  const lines=(txt,max,width)=>{ const out=[]; let line='';
    for(const w of txt.split(/\s+/)){ const t=line?line+' '+w:w; if(g.measureText(t).width>width&&line){ out.push(line); line=w; if(out.length>=max) return out; } else line=t; }
    if(line) out.push(line); return out.slice(0,max); };
  const S=land?.72:1; // tout est plus petit sur une page couchée
  const para=(p,first)=>{ const big=first||(p.b&&p.p.length<60), size=(first?11:big?8:7)*S, lh=(first?13:big?10:9)*S;
    font(big,size); g.fillStyle=big?'#0d2a5e':'#4a5568';
    for(const l of lines(p.p,big?3:6,R-OX-M)){ if(y>BOT) return; g.fillText(l,OX+M,y); y+=lh; } y+=(big?2:3)*S; };
  const table=tbl=>{
    const cols=kids(kids(tbl,'tblGrid')[0]||tbl,'gridCol').map(gc=>+gc.getAttributeNS(WNS,'w')||1);
    const rows=kids(tbl,'tr'); if(!rows.length) return;
    const ncol=cols.length||Math.max(...rows.map(r=>kids(r,'tc').length),1);
    const cw=cols.length?cols:Array(ncol).fill(1), tot=cw.reduce((a,b)=>a+b,0), W=R-OX-M, X0=OX+M;
    const xs=[X0]; cw.forEach(w=>xs.push(xs[xs.length-1]+w/tot*W));
    const fs=Math.max(5,Math.min(7.5,(land?6:7)*S/.8)), lh=fs+1.6, pad=1.6;
    y-=fs*.6;
    rows.forEach((tr,ri)=>{
      if(y>BOT-lh) return;
      let ci=0; const cells=[];
      for(const tc of kids(tr,'tc')){ const pr=kids(tc,'tcPr')[0]; const sp=pr&&kids(pr,'gridSpan')[0]; const n=sp?+sp.getAttributeNS(WNS,'val')||1:1;
        const vm=pr&&kids(pr,'vMerge')[0]; const cont=vm&&vm.getAttributeNS(WNS,'val')!=='restart';
        const shd=pr&&kids(pr,'shd')[0]; const fill=shd&&shd.getAttributeNS(WNS,'fill');
        const ps=kids(tc,'p'); cells.push({x:xs[Math.min(ci,ncol)],x2:xs[Math.min(ci+n,ncol)],t:cont?'':ps.map(ptext).filter(Boolean).join(' '),b:ps.some(pbold),fill:fill&&/^[0-9a-f]{6}$/i.test(fill)&&fill.toLowerCase()!=='ffffff'?'#'+fill:null}); ci+=n; }
      const head=ri===0;
      let h=lh+pad;
      cells.forEach(cl=>{ font(cl.b||head,fs); cl.l=cl.t?lines(cl.t,3,cl.x2-cl.x-2*pad):[]; h=Math.max(h,cl.l.length*lh+pad); });
      const trPr=kids(tr,'trPr')[0], th=trPr&&kids(trPr,'trHeight')[0]; if(th&&cols.length) h=Math.max(h,Math.min(22,(+th.getAttributeNS(WNS,'val')||0)*W/tot)); // hauteur de ligne imposée (twips, comme les colonnes)
      if(y+h>BOT) h=BOT-y;
      cells.forEach(cl=>{ const bg=cl.fill||(head?'#eef1f6':null); if(bg){ g.fillStyle=bg; g.fillRect(cl.x,y,cl.x2-cl.x,h); }
        g.strokeStyle='#5f6b80'; g.lineWidth=.6; g.strokeRect(cl.x,y,cl.x2-cl.x,h);
        font(cl.b||head,fs); g.fillStyle=head||cl.b?'#17302F':'#2d3748'; g.save(); g.beginPath(); g.rect(cl.x,y,cl.x2-cl.x,h); g.clip();
        cl.l.forEach((l,k)=>g.fillText(l,cl.x+pad,y+pad+fs+k*lh-1)); g.restore(); });
      y+=h; });
    y+=fs+4; };
  blocks.slice(0,80).forEach((bk,i)=>{ if(y>BOT) return; if(bk.tbl) table(bk.tbl); else para(bk,i===0); });
  return c;
}
async function makeThumb(file,ext){
  if(ext==='pdf') return thumbPdf(file);
  if(['png','jpg','jpeg','webp'].includes(ext)) return thumbImage(file);
  if(ext==='docx') return thumbDocx(file);
  return null;
}
/* Crée et enregistre la miniature d'un document (sans bloquer en cas d'échec) */
async function saveThumb(d,file){
  try{
    const c=await makeThumb(file||await readRel(d.chemin),d.ext); if(!c) return false;
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.82));
    await writeRel(`${THUMB_DIR}/${d.id}.jpg`,blob); d.miniature=Date.now().toString(36); delete d.miniErr; if(d.ext==='docx') d.miniVer=THUMB_DOCX_V; return true;
  }catch(e){ console.warn('miniature',d.titre,e); thumbErr=(e&&e.message)||String(e); return false; }
}
let thumbErr='';
let autoThumbsDone=false;
async function autoThumbs(){
  if(autoThumbsDone||!isAdmin) return; autoThumbsDone=true;
  await persistMigrations();
  if(DATA.documents.some(d=>needThumb(d)&&!d.miniErr)) makeAllThumbs(true);
}
const THUMB_EXT=['pdf','png','jpg','jpeg','webp','docx'];
const THUMB_DOCX_V=3;
function needThumb(d){ return THUMB_EXT.includes(d.ext)&&(!d.miniature||d.ext==='docx'&&d.miniVer!==THUMB_DOCX_V); }
async function makeAllThumbs(auto,all){
  const todo=DATA.documents.filter(all?(d=>THUMB_EXT.includes(d.ext)):auto?(d=>needThumb(d)&&!d.miniErr):needThumb);
  if(!todo.length){ if(!auto) toast('Toutes les miniatures sont déjà créées'); return; }
  await run(async()=>{
    await getDir('readwrite'); let ok=0;
    const fails=[];
    for(const [i,d] of todo.entries()){ toast(`Miniatures : ${i+1} / ${todo.length}…`); thumbErr=''; if(await saveThumb(d)) ok++; else { d.miniErr=thumbErr||'format non reconnu'; fails.push([d,d.miniErr]); } }
    await saveData(); toast(`${ok} miniature${ok>1?'s':''} créée${ok>1?'s':''}`);
    if(fails.length) openModal(`<h3 id="modal-title">${fails.length} miniature${fails.length>1?'s':''} impossible${fails.length>1?'s':''}</h3>
      <p>Les autres sont faites. Pour celles-ci, Librejo affiche l'étiquette du type de fichier à la place.</p>
      <div class="vlist">${fails.map(([d,m])=>`<div><b>${esc(d.titre)}</b> <small>(${esc(d.chemin)})</small><br><small>${esc(m)}</small></div>`).join('')}</div>
      <p class="hint">Un PDF protégé par mot de passe, abîmé ou très lourd peut ne pas avoir de miniature.</p><button class="secondary" data-close>OK</button>`);
  });
  renderDocs();
}
function thumbHtml(d,cls){
  const [k,lab]=kind(d.ext), src=thumbSrc(d);
  return src?`<img class="${cls}" src="${src}" alt="" loading="lazy" data-land data-err="ico" data-k="${esc(k)}" data-lab="${esc(lab)}">`:`<span class="ico ${k}" role="img" aria-label="Fichier ${esc(lab)}">${esc(lab)}</span>`;
}

/* Survol d'une petite miniature (listes, impression rapide) : la page s'affiche en grand à côté du pointeur,
   en grandissant depuis la miniature. Seulement avec une souris ; rien de plus pour un lecteur d'écran (aria-hidden). */
(()=>{ if(!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const z=document.createElement('div'); z.className='thumbzoom'; z.setAttribute('aria-hidden','true');
  const im=document.createElement('img'); im.alt=''; z.append(im); document.body.append(z);
  let cur=null;
  const hide=()=>{ cur=null; z.classList.remove('on'); };
  const place=(x0,y0)=>{ const w=z.offsetWidth, h=z.offsetHeight, m=12; let x=x0+24, flip=false, y=y0-h/2;
    if(x+w>innerWidth-m){ x=x0-w-24; flip=true; } y=Math.max(m,Math.min(y,innerHeight-h-m));
    z.classList.toggle('flip',flip); z.style.left=x+'px'; z.style.top=y+'px'; };
  document.addEventListener('mouseover',e=>{ const t=e.target;
    if(!(t instanceof HTMLImageElement)||!(t.hasAttribute('data-land')||t.closest('.qthumb'))||!t.getAttribute('src')||t.getBoundingClientRect().width>120) return;
    cur=t; im.src=t.currentSrc||t.src; z.classList.toggle('land',t.classList.contains('land')||t.naturalWidth>t.naturalHeight); place(e.clientX,e.clientY);
    requestAnimationFrame(()=>{ if(cur===t) z.classList.add('on'); }); });
  document.addEventListener('mousemove',e=>{ if(cur) place(e.clientX,e.clientY); });
  document.addEventListener('mouseout',e=>{ if(e.target===cur) hide(); });
  window.addEventListener('scroll',hide,true); document.addEventListener('click',hide,true);
})();

/* ---------- Vue en vignettes ---------- */
let view='liste'; try{ view=localStorage.getItem('docubus-vue')||'liste'; }catch(e){}
let viewChosen=false; try{ viewChosen=!!localStorage.getItem('docubus-vue'); }catch(e){}
function setView(v){ view=v; viewChosen=true; try{ localStorage.setItem('docubus-vue',v); }catch(e){} renderDocs(); }
function gridCard(d,ts,showCat){
  if(d.kind) return '';
  if(isLink(d)) return linkCard(d,ts,showCat);
  const href=hrefOf(d.chemin);
  return `<div class="gcard" style="${catColVars(d.categorie)}" data-row="${esc(d.chemin)}">
    <a class="gthumb" href="${href}" target="_blank" rel="noopener" aria-label="Ouvrir ${esc(d.titre)}${d.ext?`, fichier ${esc(String(d.ext).toUpperCase())}`:''}">${thumbSrc(d)?`<img src="${thumbSrc(d)}" alt="" loading="lazy" data-land data-err="noimg">`:''}<span class="gext" aria-hidden="true">${esc((d.ext||'').toUpperCase())}</span></a>
    <div class="gbody"><b><a class="gtitle" href="${href}" target="_blank" rel="noopener">${hl(d.titre,ts)}</a>${favBtn('d:'+d.id)}</b>${stBadge(d)}${d.modele?'<span class="badge accent m-0">Modèle à remplir</span>':''}<small>${showCat?esc(catName(d.categorie))+' · ':''}${d.version?'v'+esc(d.version)+' · ':''}${docDate(d.date)}</small>${TXT_ON&&ts.length&&txOf(d)&&ts.some(t=>txOf(d).includes(t))?`<span class="desc txhit">📄 « ${hl(excerpt(txRaw(d),ts,110),ts)} »</span>`:''}</div>
    <div class="gact">
      ${d.modele?`<button class="lbtn" data-fillword="${esc(d.id)}">${ICON.pen}Remplir</button>`:''}
      ${printable(d)?`<button class="lbtn" data-print="${esc(d.chemin)}" aria-label="Imprimer ${esc(d.titre)}">${ICON.print}Imprimer</button>`:''}
      <button class="lbtn" data-send="${esc(d.chemin)}" aria-label="Envoyer ${esc(d.titre)} par mail">${ICON.mail}Envoyer</button>
      <button class="iconbtn" data-more="${esc(d.chemin)}" title="Plus d'actions" aria-label="Plus d'actions pour ${esc(d.titre)}" aria-haspopup="menu">${svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>')}</button>
    </div></div>`;
}

/* ======================================================================
   4. ADMINISTRATION : formulaires, réglages
   ====================================================================== */
let asub='forms', fdraft=null;
function renderAdmin(){
  if(!isAdmin){ $('#p-admin').innerHTML=''; return; }
  $('#p-admin').innerHTML=`<div class="stickhead"><h2 class="sec">Administration</h2>
    <div class="row"><button class="chip" data-asub="forms" aria-pressed="${asub==='forms'}">Formulaires et modèles</button>
      <button class="chip" data-asub="syn" aria-pressed="${asub==='syn'}" title="Mots équivalents pour que la recherche trouve les documents (ex. « CMU » trouve « C2S »)">Mots de la recherche</button><button class="chip" data-asub="reg" aria-pressed="${asub==='reg'}">Réglages</button></div>
    </div>
    <div id="asub"></div>`;
  if(asub==='forms') fdraft?drawFormEditor():drawFormList(); else if(asub==='syn') drawSyn(); else drawReg();
}
$('#p-admin').addEventListener('click',e=>{ const b=e.target.closest('[data-asub]'); if(b){ const go=()=>{ asub=b.dataset.asub; fdraft=null; renderAdmin(); };
    if(asub==='reg'&&b.dataset.asub!=='reg'&&regDirty()) regAsk(go); else go(); return; }
  const r=e.target.closest('[data-rsecgo]'); if(r){ rsecShow(r.dataset.rsecgo); if(rsec==='courriers') ppSchedule(0); window.scrollTo({top:0}); return; }
  const w=e.target.closest('#asub [data-a=wizard]'); if(w) wizOpen(); });

const MODELES=[{"id": "dipc", "pack": "droits", "emoji": "🤝", "titre": "Document individuel de prise en charge (DIPC)", "description": "Objectifs et modalités de l’accompagnement, établis avec la personne.", "source": "art. L. 311-4 et D. 311 du CASF – trame à adapter", "formulaire": {"titre": "Document individuel de prise en charge", "groupe": "mixte", "emoji": "🤝", "description": "Objectifs et modalités de l’accompagnement, établis avec la personne accueillie (DIPC).", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Date du premier accueil", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Professionnel référent", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Demande de la personne", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Objectifs de l’accompagnement", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Prestations proposées", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Rythme et modalités", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Durée prévue", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Date de la prochaine révision", "type": "date", "options": "", "requis": false}], "modele": "Ce document est établi entre {Association} et {Nom et prénom}, né(e) le {Date de naissance}, conformément à l’article L. 311-4 du code de l’action sociale et des familles. Il est élaboré avec la personne accueillie et peut être revu à tout moment, à sa demande ou à celle de l’équipe.\n\nPremier accueil le {Date du premier accueil}. Professionnel référent : {Professionnel référent}.\n\nVotre demande :\n{Demande de la personne}\n\nObjectifs de l’accompagnement :\n{Objectifs de l’accompagnement}\n\nPrestations proposées :\n{Prestations proposées}\n\nRythme et modalités : {Rythme et modalités}\nDurée prévue : {Durée prévue}\nProchaine révision au plus tard le : {Date de la prochaine révision}\n\nLa personne accueillie a reçu le livret d’accueil, la charte des droits et libertés de la personne accueillie et le règlement de fonctionnement. Elle peut faire appel à une personne qualifiée en cas de désaccord.\n\nSignature de la personne accueillie :\n\n\n\nSignature du professionnel :", "motscles": ["DIPC", "DIPEC", "contrat de séjour", "prise en charge", "admission", "accompagnement", "projet personnalisé"]}, "has": ["1.10.2", "1.10.6"]}, {"id": "pdc-designation", "pack": "droits", "emoji": "🙋", "titre": "Personne de confiance : désignation", "description": "La personne désigne sa personne de confiance, qui contresigne.", "source": "d’après l’annexe 4-10 du CASF", "formulaire": {"titre": "Désignation de la personne de confiance", "groupe": "mixte", "emoji": "🙋", "description": "Formulaire de désignation de la personne de confiance (article L. 311-5-1 du CASF).", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Personne de confiance", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Sa date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Lien avec la personne", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Adresse", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Téléphone", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Courriel", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Également personne de confiance pour la santé", "type": "choix", "options": "Oui, Non", "requis": true}, {"id": "", "label": "Directives anticipées remises à cette personne", "type": "choix", "options": "Oui, Non, Sans objet", "requis": false}], "modele": "Je soussigné(e) {Nom et prénom}, né(e) le {Date de naissance}, désigne :\n{Personne de confiance}, né(e) le {Sa date de naissance}, {Lien avec la personne}\nAdresse : {Adresse}\nTéléphone : {Téléphone} – Courriel : {Courriel}\n\ncomme personne de confiance en application de l’article L. 311-5-1 du code de l’action sociale et des familles.\n\nJ’indique que cette personne exercera aussi les missions de la personne de confiance prévue à l’article L. 1111-6 du code de la santé publique (domaine de la santé) : {Également personne de confiance pour la santé}.\n\nJ’ai remis mes directives anticipées à cette personne : {Directives anticipées remises à cette personne}.\n\nJe peux mettre fin à cette désignation à tout moment.\n\nSignature de la personne :\n\n\n\nCosignature de la personne de confiance :", "motscles": ["personne de confiance", "désignation", "L311-5-1", "directives anticipées"]}}, {"id": "pdc-revocation", "pack": "droits", "emoji": "✋", "titre": "Personne de confiance : révocation", "description": "La personne met fin à la désignation de sa personne de confiance.", "source": "d’après l’annexe 4-10 du CASF", "formulaire": {"titre": "Révocation de la personne de confiance", "groupe": "mixte", "emoji": "✋", "description": "Formulaire de révocation de la personne de confiance (article L. 311-5-1 du CASF).", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Personne de confiance", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Sa date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Lien avec la personne", "type": "texte", "options": "", "requis": false}], "modele": "Je soussigné(e) {Nom et prénom}, né(e) le {Date de naissance}, met fin à la désignation de :\n{Personne de confiance}, né(e) le {Sa date de naissance}, {Lien avec la personne},\ndésignée comme personne de confiance en application de l’article L. 311-5-1 du code de l’action sociale et des familles.\n\nPar conséquent, cette personne cesse aussi de remplir les missions de la personne de confiance prévue à l’article L. 1111-6 du code de la santé publique, si elle les exerçait.\n\nSignature de la personne :", "motscles": ["personne de confiance", "révocation", "fin de désignation"]}}, {"id": "pdc-temoins", "pack": "droits", "emoji": "👥", "titre": "Personne de confiance : désignation avec témoins", "description": "Quand la personne ne peut pas écrire elle-même : deux témoins attestent de sa volonté.", "source": "d’après l’annexe 4-10 du CASF", "formulaire": {"titre": "Désignation de la personne de confiance – attestation des témoins", "groupe": "mixte", "emoji": "👥", "description": "Pour une personne qui ne peut pas écrire elle-même : deux témoins attestent de sa volonté.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom de la personne", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Personne de confiance", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Témoin 1 : nom et qualité", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Témoin 2 : nom et qualité", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Également personne de confiance pour la santé", "type": "choix", "options": "Oui, Non", "requis": true}], "modele": "Nous, témoins :\n1. {Témoin 1 : nom et qualité}\n2. {Témoin 2 : nom et qualité}\n\nattestons que la désignation de {Personne de confiance} comme personne de confiance en application de l’article L. 311-5-1 du code de l’action sociale et des familles.\nest bien l’expression de la volonté libre et éclairée de {Nom et prénom de la personne}, qui ne peut pas écrire elle-même ce document.\n\nCette personne exercera aussi les missions de la personne de confiance prévue à l’article L. 1111-6 du code de la santé publique : {Également personne de confiance pour la santé}.\n\nSignature du témoin 1 :\n\n\n\nSignature du témoin 2 :\n\n\n\nCosignature de la personne de confiance :", "motscles": ["personne de confiance", "témoins", "impossibilité d’écrire"]}}, {"id": "pdc-info", "pack": "droits", "emoji": "ℹ️", "titre": "Personne de confiance : attestation d’information", "description": "L’établissement atteste avoir informé la personne de son droit à désigner une personne de confiance.", "source": "d’après l’annexe 4-10 du CASF", "formulaire": {"titre": "Attestation d’information sur la personne de confiance", "groupe": "mixte", "emoji": "ℹ️", "description": "Atteste que la personne a reçu l’information sur la personne de confiance (article D. 311-0-3 du CASF).", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Professionnel", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Fonction", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom de la personne", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Lieu de naissance", "type": "texte", "options": "", "requis": false}], "modele": "Je soussigné(e) {Professionnel}, {Fonction} à {Association}, atteste avoir délivré l’information prévue à l’article D. 311-0-3 du code de l’action sociale et des familles relative au droit de désigner une personne de confiance, et avoir remis la notice d’information, à :\n{Nom et prénom de la personne}, né(e) le {Date de naissance} à {Lieu de naissance}.\n\nSignature du directeur ou de son représentant :\n\n\n\nCosignature de la personne accueillie :", "motscles": ["personne de confiance", "information", "notice", "attestation"]}}, {"id": "partage", "pack": "droits", "emoji": "🔗", "titre": "Accord pour partager des informations avec un partenaire", "description": "La personne accepte que l’équipe échange des informations précises avec un partenaire, pour un but précis.", "source": "à adapter", "formulaire": {"titre": "Accord pour partager des informations", "groupe": "mixte", "emoji": "🔗", "description": "La personne accepte que l’équipe échange des informations précises avec un partenaire.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Partenaire", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Informations concernées", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Pour quoi faire", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Durée de l’accord", "type": "texte", "options": "", "requis": false}], "modele": "Je soussigné(e) {Nom et prénom} accepte que l’équipe de {Association} échange avec {Partenaire} les informations suivantes :\n{Informations concernées}\n\nCet échange a pour but : {Pour quoi faire}\n\nSeules les informations utiles à ce but seront partagées. Cet accord vaut pour : {Durée de l’accord}. Je peux le retirer à tout moment, par oral ou par écrit, auprès de l’équipe.\n\nSignature de la personne accueillie :\n\n\n\nSignature du professionnel :", "motscles": ["consentement", "accord", "partage", "secret", "échange d’informations"]}}, {"id": "ei", "pack": "qualite", "emoji": "⚠️", "titre": "Fiche d’incident ou d’événement indésirable (interne)", "description": "Pour garder une trace écrite et datée d’un incident, le signaler en interne et l’analyser en équipe. Les événements graves se signalent en plus à l’ARS.", "source": "référentiel HAS d’évaluation des ESSMS", "formulaire": {"titre": "Déclaration interne d’événement indésirable", "groupe": "mixte", "emoji": "⚠️", "description": "Pour signaler un événement en interne et l’analyser en équipe.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Date et heure de l’événement", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Lieu", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Déclarant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Type d’événement", "type": "choix", "options": "Violence ou comportement inapproprié, Accident ou chute, Erreur de soin ou de traitement, Problème matériel ou de locaux, Disparition inquiétante, Autre", "requis": true}, {"id": "", "label": "Description des faits", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Personnes concernées (initiales)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Mesures prises immédiatement", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Personnes prévenues", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Signalement à l’ARS ou au département", "type": "choix", "options": "Oui, Non, À voir avec la direction", "requis": false}], "modele": "Événement du {Date et heure de l’événement}, lieu : {Lieu}.\nDéclaré par : {Déclarant}.\nType : {Type d’événement}.\n\nDescription des faits :\n{Description des faits}\n\nPersonnes concernées : {Personnes concernées (initiales)}\n\nMesures prises immédiatement :\n{Mesures prises immédiatement}\n\nPersonnes prévenues : {Personnes prévenues}\nSignalement à l’ARS ou au département : {Signalement à l’ARS ou au département}\n\nCette fiche est remise à la direction. Elle sert à comprendre ce qui s’est passé et à éviter que cela se reproduise, pas à chercher un coupable.", "motscles": ["événement indésirable", "EI", "EIG", "incident", "signalement", "qualité", "fiche d’incident", "trace écrite", "violence", "agression", "chute"]}, "has": ["3.13.1", "3.13.3"]}, {"id": "livret", "pack": "qualite", "emoji": "📘", "titre": "Trame : livret d’accueil", "description": "Les rubriques du livret d’accueil à compléter, mises en page à l’en-tête de la structure.", "source": "art. L. 311-4 du CASF – trame à adapter", "formulaire": {"titre": "Livret d’accueil", "groupe": "mixte", "emoji": "📘", "description": "Trame du livret d’accueil, à compléter rubrique par rubrique.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Présentation de la structure", "type": "long", "options": "", "requis": true}, {"id": "", "label": "L’équipe", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Horaires et accès", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Ce que nous proposons", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Participation des personnes accueillies", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Contacts utiles", "type": "long", "options": "", "requis": false}], "modele": "Bienvenue à {Association}.\n\nQui sommes-nous ?\n{Présentation de la structure}\n\nL’équipe\n{L’équipe}\n\nHoraires et accès\n{Horaires et accès}\n\nCe que nous proposons\n{Ce que nous proposons}\n\nVotre participation\n{Participation des personnes accueillies}\n\nVos droits\nSont joints à ce livret : la charte des droits et libertés de la personne accueillie, le règlement de fonctionnement et la notice sur la personne de confiance. En cas de désaccord, vous pouvez faire appel à une personne qualifiée, dont la liste est affichée dans nos locaux.\n\nContacts utiles\n{Contacts utiles}", "motscles": ["livret d’accueil", "accueil", "présentation", "loi 2002-2"]}, "hasTpl": ["1.2.1", "1.2.4", "1.2.6"]}, {"id": "reglement", "pack": "qualite", "emoji": "📗", "titre": "Trame : règlement de fonctionnement", "description": "Les rubriques du règlement de fonctionnement à compléter.", "source": "art. L. 311-7 et D. 311-33 à D. 311-37 du CASF – trame à adapter", "formulaire": {"titre": "Règlement de fonctionnement", "groupe": "mixte", "emoji": "📗", "description": "Trame du règlement de fonctionnement, à compléter rubrique par rubrique.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Objet et champ d’application", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Droits des personnes accueillies", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Règles de vie collective", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Organisation des locaux et horaires", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Sécurité des personnes et des biens", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Mesures en cas de manquement", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Date d’adoption et de révision", "type": "texte", "options": "", "requis": false}], "modele": "Le présent règlement de fonctionnement est établi conformément à l’article L. 311-7 du code de l’action sociale et des familles. Il définit les droits des personnes accueillies et les obligations nécessaires au respect des règles de vie collective.\n\n1. Objet et champ d’application\n{Objet et champ d’application}\n\n2. Droits des personnes accueillies\n{Droits des personnes accueillies}\n\n3. Règles de vie collective\n{Règles de vie collective}\n\n4. Organisation des locaux et horaires\n{Organisation des locaux et horaires}\n\n5. Sécurité des personnes et des biens\n{Sécurité des personnes et des biens}\n\n6. Mesures en cas de manquement\n{Mesures en cas de manquement}\n\nAdopté et révisé : {Date d’adoption et de révision}. Il est remis à chaque personne accueillie et affiché dans les locaux.", "motscles": ["règlement de fonctionnement", "règlement intérieur", "règles", "loi 2002-2"]}, "hasTpl": ["1.2.2", "1.3.1"]}, {"id": "reclamation", "pack": "qualite", "emoji": "🗣️", "titre": "Formulaire de réclamation (pour la personne accompagnée)", "description": "Pour qu’une personne, un proche ou un représentant exprime une réclamation, par écrit ou avec l’aide d’un professionnel.", "source": "référentiel HAS ESSMS, objectif 3.12 – trame à faire relire", "has": ["3.12.1"], "formulaire": {"titre": "Réclamation", "groupe": "mixte", "emoji": "🗣️", "description": "Remplie par la personne ou avec elle. Remise à la direction, qui en accuse réception. La personne peut aussi saisir une personne qualifiée ou le Défenseur des droits.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Vous êtes", "type": "choix", "options": "La personne accompagnée, Un proche, Un représentant légal, Autre", "requis": true}, {"id": "", "label": "Nom et prénom (facultatif)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Comment vous joindre (facultatif)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Date", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Ce qui s’est passé", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Ce que vous souhaitez", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Souhaitez-vous être reçu(e) par la direction ?", "type": "choix", "options": "Oui, Non", "requis": false}, {"id": "", "label": "Aidé(e) pour remplir par", "type": "texte", "options": "", "requis": false}], "modele": "Réclamation du {Date}\n\nDe la part de : {Vous êtes} – {Nom et prénom (facultatif)}\nPour vous joindre : {Comment vous joindre (facultatif)}\n\nCe qui s’est passé\n{Ce qui s’est passé}\n\nCe que vous souhaitez\n{Ce que vous souhaitez}\n\nSouhaitez-vous être reçu(e) par la direction ? {Souhaitez-vous être reçu(e) par la direction ?}\nAidé(e) pour remplir par : {Aidé(e) pour remplir par}\n\nVotre réclamation est remise à la direction de {Association}, qui vous répondra. Elle sera étudiée en équipe pour améliorer l’accompagnement. Vous pouvez aussi faire appel à une personne qualifiée (liste affichée dans les locaux) ou au Défenseur des droits.", "motscles": ["réclamation", "plainte", "mécontentement", "insatisfaction", "droits", "personne qualifiée", "Défenseur des droits"]}}, {"id": "proc-plaintes", "pack": "qualite", "emoji": "📮", "titre": "Trame : procédure de recueil et de traitement des plaintes et réclamations", "description": "Qui reçoit, sous quel délai on répond, comment on analyse en équipe et comment on informe. Critères impératifs 3.12.1 à 3.12.3 du référentiel HAS.", "source": "référentiel HAS ESSMS, objectif 3.12 – trame à faire relire", "hasTpl": ["3.12.1", "3.12.2", "3.12.3"], "formulaire": {"titre": "Procédure plaintes et réclamations", "groupe": "mixte", "emoji": "📮", "description": "Trame de procédure, à compléter avec l’équipe puis à faire valider par la direction.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Comment une personne peut faire une réclamation", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Qui la reçoit et l’enregistre", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Délai d’accusé de réception et de réponse", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Analyse en équipe (quand, qui, comment)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Communication aux personnes, à l’équipe et au CVS", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Recours possibles (personne qualifiée, Défenseur des droits…)", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Responsable de la procédure", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de validation", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Prochaine révision", "type": "date", "options": "", "requis": false}], "modele": "Procédure de recueil et de traitement des plaintes et réclamations – {Association}\n\n1. Faire une réclamation\n{Comment une personne peut faire une réclamation}\n\n2. Réception et enregistrement\n{Qui la reçoit et l’enregistre}\n\n3. Délais\n{Délai d’accusé de réception et de réponse}\n\n4. Analyse en équipe et actions correctives\n{Analyse en équipe (quand, qui, comment)}\n\n5. Information des personnes, de l’équipe et du conseil de la vie sociale\n{Communication aux personnes, à l’équipe et au CVS}\n\n6. Recours\n{Recours possibles (personne qualifiée, Défenseur des droits…)}\n\nResponsable : {Responsable de la procédure}\nValidée le {Date de validation} – prochaine révision : {Prochaine révision}", "motscles": ["procédure", "plainte", "réclamation", "qualité", "HAS", "évaluation", "critère impératif", "CVS"]}}, {"id": "plan-maltraitance", "pack": "qualite", "emoji": "🛡️", "titre": "Trame : plan de prévention et de gestion des risques de maltraitance et de violence", "description": "Repérer les risques, prévenir, signaler, traiter et soutenir. Critères impératifs 3.11.1 et 3.11.2 du référentiel HAS.", "source": "référentiel HAS ESSMS, objectif 3.11 – trame à faire relire", "hasTpl": ["3.11.1", "3.11.2", "3.11.3"], "formulaire": {"titre": "Plan de prévention de la maltraitance et de la violence", "groupe": "mixte", "emoji": "🛡️", "description": "Trame à construire avec les professionnels (et, si possible, avec les personnes accompagnées ou le CVS), puis à faire valider.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Risques repérés dans notre structure", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Actions de prévention", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Formation et sensibilisation des professionnels", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Comment signaler (en interne et aux autorités)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Traitement des signalements et actions correctives", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Soutien des personnes et des professionnels concernés", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Contacts utiles (3977, 119, ARS, département, procureur)", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Construit avec", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Date de validation", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Prochaine révision", "type": "date", "options": "", "requis": false}], "modele": "Plan de prévention et de gestion des risques de maltraitance et de violence – {Association}\n\n1. Les risques repérés\n{Risques repérés dans notre structure}\n\n2. La prévention\n{Actions de prévention}\n\n3. Former et sensibiliser\n{Formation et sensibilisation des professionnels}\n\n4. Signaler\n{Comment signaler (en interne et aux autorités)}\n\n5. Traiter et corriger\n{Traitement des signalements et actions correctives}\n\n6. Soutenir\n{Soutien des personnes et des professionnels concernés}\n\nContacts utiles\n{Contacts utiles (3977, 119, ARS, département, procureur)}\n\nConstruit avec : {Construit avec}\nValidé le {Date de validation} – prochaine révision : {Prochaine révision}", "motscles": ["maltraitance", "bientraitance", "violence", "prévention", "signalement", "plan", "HAS", "critère impératif", "3977", "119"]}}, {"id": "plan-crise", "pack": "qualite", "emoji": "🚨", "titre": "Trame : plan de gestion de crise et de continuité de l’activité", "description": "Cellule de crise, scénarios, activités essentielles, contacts, communication interne et externe. Critères impératifs 3.14.1 et 3.14.2 du référentiel HAS.", "source": "référentiel HAS ESSMS, objectif 3.14 – trame à faire relire", "hasTpl": ["3.14.1", "3.14.2"], "formulaire": {"titre": "Plan de gestion de crise et de continuité", "groupe": "mixte", "emoji": "🚨", "description": "Trame à compléter avec l’équipe, à mettre à jour régulièrement, à communiquer en interne et à l’extérieur (ARS, département, partenaires).", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Cellule de crise (qui, comment la joindre)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Situations prévues (canicule, épidémie, panne, inondation, cyberattaque…)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Activités essentielles à maintenir", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Organisation en mode dégradé (personnel, locaux, matériel)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Personnes accompagnées les plus fragiles : comment les repérer", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Contacts d’urgence (ARS, mairie, préfecture, partenaires)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Communication interne", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Communication externe", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Retour d’expérience après la crise", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Date de mise à jour", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Prochaine révision", "type": "date", "options": "", "requis": false}], "modele": "Plan de gestion de crise et de continuité de l’activité – {Association}\n\n1. La cellule de crise\n{Cellule de crise (qui, comment la joindre)}\n\n2. Les situations prévues\n{Situations prévues (canicule, épidémie, panne, inondation, cyberattaque…)}\n\n3. Ce qui doit continuer\n{Activités essentielles à maintenir}\n\n4. Fonctionner en mode dégradé\n{Organisation en mode dégradé (personnel, locaux, matériel)}\n\n5. Les personnes les plus fragiles\n{Personnes accompagnées les plus fragiles : comment les repérer}\n\n6. Contacts d’urgence\n{Contacts d’urgence (ARS, mairie, préfecture, partenaires)}\n\n7. Communication interne\n{Communication interne}\n\n8. Communication externe\n{Communication externe}\n\n9. Après la crise\n{Retour d’expérience après la crise}\n\nMis à jour le {Date de mise à jour} – prochaine révision : {Prochaine révision}", "motscles": ["plan de crise", "continuité", "PCA", "plan bleu", "canicule", "épidémie", "cyberattaque", "HAS", "critère impératif"]}}, {"id": "cerfa-16029", "pack": "social", "emoji": "🏛️", "titre": "Cerfa 16029*01 : demande d’élection de domicile", "description": "Demande et décision de domiciliation des personnes sans domicile stable (lien vers la version officielle).", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R44660", "motscles": ["domiciliation", "élection de domicile", "Cerfa", "16029", "sans domicile"]}, {"id": "cerfa-16030", "pack": "social", "emoji": "🏛️", "titre": "Cerfa 16030*01 : attestation d’élection de domicile", "description": "Attestation remise à la personne domiciliée, valable un an (lien vers la version officielle).", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R18272", "motscles": ["domiciliation", "attestation", "Cerfa", "16030", "justificatif de domicile"]}, {"id": "attest-suivi", "pack": "social", "emoji": "📅", "titre": "Attestation de suivi régulier (présence en France)", "description": "Atteste qu’une personne est accompagnée de façon continue depuis une date donnée. Sert de preuve de présence, par exemple pour une demande d’AME.", "source": "à adapter", "formulaire": {"titre": "Attestation de suivi", "groupe": "social", "emoji": "📅", "description": "Atteste un accompagnement continu et régulier depuis une date. Restez neutre : aucune information de santé, aucun motif de suivi.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Suivi(e) depuis le", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Fréquence des rencontres", "type": "choix", "options": "au moins une fois par semaine, au moins deux fois par mois, au moins une fois par mois", "requis": false}, {"id": "", "label": "Dernière rencontre le", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "{Association} atteste que {Civilité} {Nom et prénom}, né(e) le {Date de naissance}, est accompagné(e) par notre structure de manière continue et régulière depuis le {Suivi(e) depuis le}.\n\nRythme des rencontres : {Fréquence des rencontres}. Dernière rencontre : {Dernière rencontre le}.\n\nAttestation délivrée à la demande de l’intéressé(e) pour faire valoir ce que de droit.\n\n{Signataire (nom et fonction)}", "motscles": ["attestation de suivi", "présence en France", "résidence", "AME", "aide médicale de l’État", "preuve de présence", "suivi social", "accompagnement"]}}, {"id": "refus-soins", "pack": "social", "emoji": "🚫", "titre": "Courrier : signalement d’un refus de soins (C2S, AME)", "description": "Lettre de la structure à l’Ordre professionnel ou à la CPAM quand une personne accompagnée s’est vu refuser des soins parce qu’elle a la C2S ou l’AME.", "source": "art. L. 1110-3 du CSP – d’après France Assos Santé, fiche A.10.1", "formulaire": {"titre": "Signalement de refus de soins", "groupe": "social", "emoji": "🚫", "description": "Signalement d’un refus de soins discriminatoire (C2S ou AME). À envoyer seulement avec l’accord de la personne. Copie possible au Défenseur des droits.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Destinataire", "type": "choix", "options": "Président du conseil départemental de l’Ordre des médecins, Président du conseil départemental de l’Ordre des chirurgiens-dentistes, Président du conseil départemental de l’Ordre des sages-femmes, Président du conseil régional de l’Ordre des pharmaciens, Président du conseil départemental de l’Ordre des infirmiers, Directeur de la caisse primaire d’assurance maladie", "requis": true}, {"id": "", "label": "Adresse du destinataire", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom de la personne", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Couverture", "type": "choix", "options": "la complémentaire santé solidaire (C2S), l’aide médicale de l’État (AME)", "requis": true}, {"id": "", "label": "Professionnel concerné (nom, profession, adresse)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Date des faits", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Forme du refus", "type": "choix", "options": "refus de rendez-vous, exigence d’une avance de frais, dépassement d’honoraires, orientation vers un autre professionnel sans motif, délai de rendez-vous anormalement long, autre", "requis": true}, {"id": "", "label": "Récit des faits", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Pièces jointes", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Copie à", "type": "choix", "options": "Défenseur des droits (Libre réponse 71120, 75342 Paris Cedex 07), aucune copie", "requis": false}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention du {Destinataire}\n{Adresse du destinataire}\n\nObjet : signalement d’un refus de soins fondé sur le bénéfice de {Couverture} – saisine au titre de l’article L. 1110-3 du code de la santé publique\n\nMadame, Monsieur,\n\n{Association} accompagne {Civilité} {Nom et prénom de la personne}, bénéficiaire de {Couverture}. Avec son accord, nous portons à votre connaissance les faits suivants.\n\nLe {Date des faits}, {Civilité} {Nom et prénom de la personne} s’est adressé(e) à : {Professionnel concerné (nom, profession, adresse)}.\n\nForme du refus : {Forme du refus}.\n\n{Récit des faits}\n\nL’article L. 1110-3 du code de la santé publique interdit à un professionnel de santé de refuser de soigner une personne au motif qu’elle bénéficie de la complémentaire santé solidaire ou de l’aide médicale de l’État. Nous vous demandons d’examiner ces faits et, le cas échéant, d’organiser la conciliation prévue par ce même article.\n\nNous restons à votre disposition, ainsi que {Civilité} {Nom et prénom de la personne}, pour tout complément.\n\nPièces jointes : {Pièces jointes}\nCopie : {Copie à}\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.\n\n{Signataire (nom et fonction)}", "motscles": ["refus de soins", "discrimination", "C2S", "AME", "CMU", "Ordre des médecins", "conciliation", "CPAM", "Défenseur des droits", "L1110-3", "avance de frais", "dépassement d’honoraires"]}}, {"id": "courrier-soutien", "pack": "social", "emoji": "🏘️", "titre": "Courrier de soutien : logement, SIAO, CAF ou bailleur", "description": "Lettre de la structure qui appuie une demande de logement, d’hébergement, de maintien de droits ou d’échéancier.", "source": "trame à adapter – à faire relire", "formulaire": {"titre": "Courrier de soutien", "groupe": "social", "emoji": "🏘️", "description": "À écrire avec l’accord de la personne. Ne donnez que les éléments utiles à la demande, jamais de diagnostic ni de détail médical.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Destinataire", "type": "choix", "options": "SIAO, CAF, Bailleur social, Commission de médiation DALO, Mairie ou CCAS, Autre", "requis": true}, {"id": "", "label": "Nom du service ou de l’organisme", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Demande soutenue", "type": "choix", "options": "Demande de logement social, Demande d’hébergement, Maintien ou rétablissement des droits, Échéancier de dette, Mutation de logement, Autre", "requis": true}, {"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "N° de dossier, d’allocataire ou de demande", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Accompagné(e) par la structure depuis le", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Situation actuelle", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Démarches déjà engagées", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Ce que nous demandons", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de {Nom du service ou de l’organisme} ({Destinataire})\n\nObjet : soutien à la demande de {Civilité} {Nom et prénom}, né(e) le {Date de naissance} – {Demande soutenue}\nRéférence : {N° de dossier, d’allocataire ou de demande}\n\nMadame, Monsieur,\n\n{Association} accompagne {Civilité} {Nom et prénom} depuis le {Accompagné(e) par la structure depuis le}. Avec son accord, nous souhaitons appuyer sa demande.\n\nSituation actuelle\n{Situation actuelle}\n\nDémarches déjà engagées\n{Démarches déjà engagées}\n\nNotre demande\n{Ce que nous demandons}\n\nNous restons à votre disposition pour tout complément et vous remercions de l’attention que vous porterez à cette demande.\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.\n\n{Signataire (nom et fonction)}", "motscles": ["courrier de soutien", "soutien", "logement", "logement social", "SIAO", "115", "hébergement", "CAF", "bailleur", "DALO", "dette", "échéancier", "expulsion"]}}, {"id": "bon-interne", "pack": "social", "emoji": "🎟️", "titre": "Bon interne : colis, vestiaire, douche, laverie", "description": "Bon remis à la personne pour une prestation de la structure. Il ne contient que les initiales.", "source": "trame à adapter – à faire relire", "formulaire": {"titre": "Bon interne", "groupe": "social", "emoji": "🎟️", "description": "Bon pour une prestation interne. Pour limiter les données, n’indiquez que les initiales ou un prénom.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Prestation", "type": "choix", "options": "Colis alimentaire, Vestiaire, Douche, Laverie, Bagagerie, Autre", "requis": true}, {"id": "", "label": "Initiales ou prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nombre de personnes au foyer", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Valable jusqu’au", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Précisions", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Délivré par", "type": "texte", "options": "", "requis": true}], "modele": "BON INTERNE – {Prestation}\n\nPour : {Initiales ou prénom}\nPersonnes au foyer : {Nombre de personnes au foyer}\nPrécisions : {Précisions}\n\nValable jusqu’au {Valable jusqu’au}, à présenter à l’accueil de {Association}.\n\nDélivré par {Délivré par}", "motscles": ["bon", "bon interne", "colis", "colis alimentaire", "aide alimentaire", "vestiaire", "vêtements", "douche", "laverie", "bagagerie"]}}, {"id": "recu-depot", "pack": "social", "emoji": "🗂️", "titre": "Reçu de dépôt de documents", "description": "Quand une personne confie ses papiers à l’équipe : liste, date, conditions de restitution. Un exemplaire pour elle, un pour la structure.", "source": "trame à adapter – à faire relire", "formulaire": {"titre": "Reçu de dépôt de documents", "groupe": "social", "emoji": "🗂️", "description": "Faites le reçu en deux exemplaires signés. Rangez les documents sous clé, à part du dossier.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Date du dépôt", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Documents confiés", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Nature", "type": "choix", "options": "Originaux, Copies, Originaux et copies", "requis": true}, {"id": "", "label": "Lieu de conservation", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Qui peut les récupérer", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Professionnel qui reçoit", "type": "texte", "options": "", "requis": true}], "modele": "{Association} atteste avoir reçu de {Nom et prénom}, né(e) le {Date de naissance}, le {Date du dépôt}, les documents suivants ({Nature}) :\n{Documents confiés}\n\nLieu de conservation : {Lieu de conservation}\n\nLes documents seront rendus à la personne sur simple demande, contre signature. Personne autorisée à les récupérer à sa place : {Qui peut les récupérer}\n\nReçu par {Professionnel qui reçoit}\n\nSignature de la personne accueillie :\n\n\n\nSignature du professionnel :\n\n\nRestitution le ......................  Signature :", "motscles": ["reçu", "dépôt", "documents", "papiers", "pièce d’identité", "consigne", "garde de documents", "restitution"]}}, {"id": "cerfa-15692", "pack": "handicap", "emoji": "🏛️", "titre": "Cerfa 15692*01 : demande à la MDPH", "description": "Formulaire unique de demande ou de renouvellement (AAH, PCH, RQTH, CMI, orientation…). Lien vers la version officielle.", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R19993", "motscles": ["MDPH", "AAH", "PCH", "RQTH", "CMI", "AEEH", "orientation", "handicap", "Cerfa", "15692"]}, {"id": "cerfa-15695", "pack": "handicap", "emoji": "🏛️", "titre": "Cerfa 15695*01 : certificat médical MDPH", "description": "Certificat obligatoire, rempli par le médecin, à joindre à toute demande à la MDPH. Lien vers la version officielle.", "source": "service-public.gouv.fr", "lien": "https://www.monparcourshandicap.gouv.fr/demarches/certificat-medical-formulaire-cerfa-ndeg-1569501", "motscles": ["MDPH", "certificat médical", "handicap", "Cerfa", "15695"]}, {"id": "mdph-courrier", "pack": "handicap", "emoji": "✉️", "titre": "Courrier à la MDPH : éléments complémentaires", "description": "Lettre de la structure qui accompagne un dossier MDPH : ce que l’équipe observe au quotidien, pour éclairer l’évaluation.", "source": "à adapter", "formulaire": {"titre": "Courrier à la MDPH", "groupe": "social", "emoji": "✉️", "description": "Lettre jointe à un dossier MDPH. Décrivez les besoins et le retentissement au quotidien ; les éléments médicaux vont dans le certificat du médecin.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "MDPH (département)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "N° de dossier MDPH", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Demande concernée", "type": "choix", "options": "première demande, renouvellement, révision", "requis": true}, {"id": "", "label": "Droits demandés", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Accompagné(e) depuis le", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Ce que nous observons au quotidien", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Pièces jointes", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de l’équipe pluridisciplinaire d’évaluation\nMDPH {MDPH (département)}\n\nObjet : {Demande concernée} – {Civilité} {Nom et prénom}, né(e) le {Date de naissance} – dossier n° {N° de dossier MDPH}\n\nMadame, Monsieur,\n\n{Association} accompagne {Civilité} {Nom et prénom} depuis le {Accompagné(e) depuis le}. Avec son accord, nous joignons ce courrier à sa demande ({Droits demandés}) pour vous faire part de ce que nous observons dans son quotidien.\n\n{Ce que nous observons au quotidien}\n\nNous restons à votre disposition pour participer à l’évaluation.\n\nPièces jointes : {Pièces jointes}\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.\n\n{Signataire (nom et fonction)}", "motscles": ["MDPH", "courrier", "rapport social", "AAH", "PCH", "RQTH", "orientation", "handicap", "évaluation"]}}, {"id": "pp-avenant", "pack": "handicap", "emoji": "🧭", "titre": "Projet personnalisé d’accompagnement (avenant)", "description": "Trame d’avenant au contrat de séjour ou au DIPC, à établir dans les 6 mois suivant l’admission puis à réviser chaque année.", "source": "art. L. 311-3 et D. 311 du CASF – trame à adapter", "formulaire": {"titre": "Projet personnalisé", "groupe": "mixte", "emoji": "🧭", "description": "Avenant au contrat de séjour ou au DIPC, co-construit avec la personne. À réviser au moins une fois par an.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom de la personne", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Représentant légal (le cas échéant)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Date d’admission", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Référent(e) du projet", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Type", "type": "choix", "options": "Projet initial, Révision", "requis": true}, {"id": "", "label": "Attentes de la personne (dans ses mots)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Objectifs retenus", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Actions et moyens", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Prochaine réévaluation", "type": "date", "options": "", "requis": true}], "modele": "Avenant au contrat de séjour / document individuel de prise en charge\n{Type} du projet personnalisé de {Nom et prénom de la personne}\n\nAdmission le {Date d’admission}. Référent(e) : {Référent(e) du projet}. Représentant légal : {Représentant légal (le cas échéant)}.\n\nCe que la personne souhaite\n{Attentes de la personne (dans ses mots)}\n\nObjectifs retenus ensemble\n{Objectifs retenus}\n\nActions et moyens mis en œuvre\n{Actions et moyens}\n\nCe projet sera réévalué au plus tard le {Prochaine réévaluation}, ou plus tôt à la demande de la personne.\n\nSignature de la personne :\n\nSignature du représentant légal :\n\nPour {Association} :", "motscles": ["projet personnalisé", "PPA", "PIA", "avenant", "contrat de séjour", "DIPC", "objectifs", "handicap", "loi 2002-2"]}}, {"id": "cerfa-15891", "pack": "handicap", "emoji": "🏛️", "titre": "Cerfa 15891*03 : requête en protection juridique d’un majeur", "description": "Demande au juge des tutelles (tutelle, curatelle, sauvegarde, habilitation familiale). À joindre : certificat médical circonstancié d’un médecin inscrit sur la liste du procureur.", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R45193", "motscles": ["tutelle", "curatelle", "sauvegarde de justice", "habilitation familiale", "juge des tutelles", "protection juridique", "Cerfa", "15891"]}, {"id": "cerfa-14919", "pack": "handicap", "emoji": "🏛️", "titre": "Cerfa 14919 : renouvellement ou révision d’une mesure de protection", "description": "Requête au juge des tutelles pour renouveler, alléger ou lever une mesure existante.", "source": "service-public.gouv.fr", "lien": "https://www.formulaires.service-public.fr/gf/cerfa_14919.do", "motscles": ["tutelle", "curatelle", "renouvellement", "mainlevée", "juge des tutelles", "Cerfa", "14919"]}, {"id": "signal-procureur", "pack": "handicap", "emoji": "⚖️", "titre": "Signalement au procureur : besoin de protection d’un majeur", "description": "Une structure ne peut pas saisir elle-même le juge des tutelles : elle signale la situation au procureur, qui peut le saisir.", "source": "art. 430 du code civil – à adapter", "formulaire": {"titre": "Signalement au procureur (majeur vulnérable)", "groupe": "social", "emoji": "⚖️", "description": "Signalement au procureur de la République quand un majeur semble avoir besoin d’une mesure de protection et qu’aucun proche ne fait la demande. Informez la personne de la démarche.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Tribunal judiciaire", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Adresse ou domiciliation", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Entourage connu (noms, liens, coordonnées)", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Accompagné(e) depuis le", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Difficultés constatées (gestion du budget, démarches, vulnérabilité…)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "La personne a été informée de ce signalement", "type": "choix", "options": "Oui, Non (préciser pourquoi dans le texte)", "requis": true}, {"id": "", "label": "Certificat médical circonstancié", "type": "choix", "options": "joint sous pli fermé, pas encore établi", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de Monsieur ou Madame le Procureur de la République\nTribunal judiciaire de {Tribunal judiciaire}\n\nObjet : signalement en vue d’une mesure de protection juridique – {Civilité} {Nom et prénom}, né(e) le {Date de naissance}\n\nMonsieur ou Madame le Procureur,\n\n{Association} accompagne {Civilité} {Nom et prénom}, demeurant ou domicilié(e) {Adresse ou domiciliation}, depuis le {Accompagné(e) depuis le}.\n\nNous constatons les difficultés suivantes, qui nous semblent l’empêcher de pourvoir seul(e) à ses intérêts :\n\n{Difficultés constatées (gestion du budget, démarches, vulnérabilité…)}\n\nEntourage connu : {Entourage connu (noms, liens, coordonnées)}\n\nLa personne a été informée de ce signalement : {La personne a été informée de ce signalement}.\nCertificat médical circonstancié : {Certificat médical circonstancié}.\n\nEn application de l’article 430 du code civil, nous vous demandons d’examiner l’opportunité de saisir le juge des contentieux de la protection.\n\nNous restons à votre disposition pour tout complément.\n\nVeuillez agréer, Monsieur ou Madame le Procureur, l’expression de notre haute considération.\n\n{Signataire (nom et fonction)}", "motscles": ["signalement", "procureur", "tutelle", "curatelle", "majeur vulnérable", "protection juridique", "article 430"]}}, {"id": "ip-crip", "pack": "enfance", "emoji": "🛟", "titre": "Information préoccupante à la CRIP", "description": "Transmission à la cellule départementale quand un enfant est en danger ou risque de l’être. Beaucoup de départements ont leur propre fiche : utilisez-la si elle existe.", "source": "art. L. 226-2-1 et L. 226-3 du CASF – à adapter", "formulaire": {"titre": "Information préoccupante", "groupe": "social", "emoji": "🛟", "description": "À adresser à la CRIP du département où vit l’enfant. Décrivez des faits datés, sans interpréter ni désigner de coupable. En cas de danger grave et immédiat : signalement au procureur.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "CRIP (département)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom de l’enfant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Adresse de l’enfant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Titulaires de l’autorité parentale (noms, adresses)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Autres enfants du foyer", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "École ou établissement fréquenté", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Comment l’information nous est parvenue", "type": "choix", "options": "constat direct d’un professionnel, propos de l’enfant, propos d’un tiers, autre", "requis": true}, {"id": "", "label": "Faits constatés (dates, propos rapportés entre guillemets)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Ce que la structure a déjà mis en place", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Les parents ont été informés", "type": "choix", "options": "Oui, Non : ce serait contraire à l’intérêt de l’enfant", "requis": true}, {"id": "", "label": "Personne à contacter à la structure (nom, téléphone)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de la cellule de recueil des informations préoccupantes\nDépartement : {CRIP (département)}\n\nObjet : information préoccupante concernant {Nom et prénom de l’enfant}, né(e) le {Date de naissance}\n\nEnfant : {Nom et prénom de l’enfant}, né(e) le {Date de naissance}, demeurant {Adresse de l’enfant}.\nTitulaires de l’autorité parentale : {Titulaires de l’autorité parentale (noms, adresses)}\nAutres enfants du foyer : {Autres enfants du foyer}\nÉcole ou établissement : {École ou établissement fréquenté}\n\nOrigine de l’information : {Comment l’information nous est parvenue}.\n\nFaits constatés\n{Faits constatés (dates, propos rapportés entre guillemets)}\n\nCe que nous avons déjà mis en place\n{Ce que la structure a déjà mis en place}\n\nInformation des parents : {Les parents ont été informés}.\n\nPersonne à contacter : {Personne à contacter à la structure (nom, téléphone)}\n\n{Signataire (nom et fonction)}", "motscles": ["information préoccupante", "IP", "CRIP", "enfant en danger", "protection de l’enfance", "maltraitance", "L226-3"]}}, {"id": "signal-mineur", "pack": "enfance", "emoji": "🚨", "titre": "Signalement au procureur : mineur en danger grave", "description": "Pour un danger grave et immédiat (violences, agression sexuelle…). Copie obligatoire à la CRIP. En urgence absolue, téléphonez d’abord au parquet ou au 17.", "source": "art. L. 226-4 du CASF et art. 375 du code civil – à adapter", "formulaire": {"titre": "Signalement au procureur (mineur)", "groupe": "social", "emoji": "🚨", "description": "Danger grave et immédiat. Faites suivre ce courrier d’un appel au parquet si nécessaire. Faits datés, sans désigner de coupable. Copie à la CRIP.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Tribunal judiciaire", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom de l’enfant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Lieu où se trouve l’enfant actuellement", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Titulaires de l’autorité parentale (noms, adresses)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Faits constatés (dates, propos rapportés entre guillemets)", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Mesures de mise à l’abri déjà prises", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Personne joignable à la structure (nom, téléphone)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de Monsieur ou Madame le Procureur de la République\nTribunal judiciaire de {Tribunal judiciaire}\nCopie : cellule de recueil des informations préoccupantes\n\nObjet : signalement d’un mineur en danger – {Nom et prénom de l’enfant}, né(e) le {Date de naissance}\n\nMonsieur ou Madame le Procureur,\n\nNous portons à votre connaissance la situation de {Nom et prénom de l’enfant}, né(e) le {Date de naissance}, qui se trouve actuellement : {Lieu où se trouve l’enfant actuellement}.\n\nTitulaires de l’autorité parentale : {Titulaires de l’autorité parentale (noms, adresses)}\n\nFaits constatés\n{Faits constatés (dates, propos rapportés entre guillemets)}\n\nMesures déjà prises\n{Mesures de mise à l’abri déjà prises}\n\nCes éléments nous paraissent caractériser un danger grave et immédiat justifiant une mesure de protection.\n\nPersonne joignable : {Personne joignable à la structure (nom, téléphone)}\n\nVeuillez agréer, Monsieur ou Madame le Procureur, l’expression de notre haute considération.\n\n{Signataire (nom et fonction)}", "motscles": ["signalement", "procureur", "parquet", "mineur en danger", "maltraitance", "violences", "protection de l’enfance"]}}, {"id": "cnom-ip", "pack": "enfance", "emoji": "🏛️", "titre": "Modèles du Conseil de l’Ordre des médecins : IP et signalement", "description": "Modèles d’information préoccupante et de signalement de sévices sur mineur, rédigés pour les médecins.", "source": "Conseil national de l’Ordre des médecins", "lien": "https://www.conseil-national.medecin.fr/documents-types-demarches/documents-types-medecins/pratique/modele-dinformation-preoccupante", "motscles": ["information préoccupante", "signalement", "médecin", "CNOM", "maltraitance", "mineur"]}, {"id": "rapport-juge", "pack": "enfance", "emoji": "📋", "titre": "Rapport de situation au juge des enfants", "description": "Trame de note d’échéance ou d’incident pour un enfant confié ou suivi en assistance éducative.", "source": "à adapter", "formulaire": {"titre": "Rapport au juge des enfants", "groupe": "social", "emoji": "📋", "description": "Trame de rapport. Distinguez les faits observés de l’analyse, et indiquez ce que l’enfant et ses parents en disent. Le rapport peut être consulté par la famille.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Juge des enfants (tribunal)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "N° de dossier", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Nom et prénom de l’enfant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Type de rapport", "type": "choix", "options": "Rapport d’échéance, Note d’incident, Rapport intermédiaire", "requis": true}, {"id": "", "label": "Mesure en cours et échéance", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Accueilli(e) depuis le", "type": "date", "options": "", "requis": false}, {"id": "", "label": "Santé, scolarité, vie quotidienne", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Liens familiaux et droits de visite", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Parole de l’enfant", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Parole des parents", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Analyse de l’équipe", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Propositions", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Rédacteurs (noms et fonctions)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de Madame ou Monsieur le Juge des enfants\n{Juge des enfants (tribunal)} – dossier n° {N° de dossier}\n\n{Type de rapport} concernant {Nom et prénom de l’enfant}, né(e) le {Date de naissance}\nMesure : {Mesure en cours et échéance}. Accueilli(e) depuis le {Accueilli(e) depuis le}.\n\nSanté, scolarité, vie quotidienne\n{Santé, scolarité, vie quotidienne}\n\nLiens familiaux et droits de visite\n{Liens familiaux et droits de visite}\n\nCe qu’en dit l’enfant\n{Parole de l’enfant}\n\nCe qu’en disent les parents\n{Parole des parents}\n\nAnalyse de l’équipe\n{Analyse de l’équipe}\n\nPropositions\n{Propositions}\n\n{Rédacteurs (noms et fonctions)}", "motscles": ["rapport", "juge des enfants", "assistance éducative", "échéance", "note d’incident", "MECS", "ASE", "placement"]}}, {"id": "fugue", "pack": "enfance", "emoji": "🏃", "titre": "Déclaration de fugue d’un mineur", "description": "Signalement d’absence aux forces de l’ordre, avec les éléments utiles aux recherches. À doubler d’une information à l’ASE, aux parents et, si besoin, au juge.", "source": "à adapter selon le protocole départemental", "formulaire": {"titre": "Déclaration de fugue", "groupe": "social", "emoji": "🏃", "description": "Déclaration de fugue ou de disparition d’un mineur accueilli. Prévenez aussi l’ASE, les parents et, selon la mesure, le juge des enfants.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Commissariat ou gendarmerie", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom du mineur", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Constat de l’absence (date et heure)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Dernier lieu où il ou elle a été vu(e)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Description physique et vêtements", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Téléphone du mineur", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Lieux ou personnes qu’il ou elle pourrait rejoindre", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Éléments de vulnérabilité", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Mesure de protection et service gardien", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Personnes déjà prévenues", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Contact de l’établissement joignable 24 h/24", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de : {Commissariat ou gendarmerie}\n\nObjet : déclaration de fugue d’un mineur – {Nom et prénom du mineur}, né(e) le {Date de naissance}\n\nNous vous informons de l’absence de {Nom et prénom du mineur}, né(e) le {Date de naissance}, accueilli(e) par {Association}.\n\nAbsence constatée : {Constat de l’absence (date et heure)}\nDernier lieu où il ou elle a été vu(e) : {Dernier lieu où il ou elle a été vu(e)}\n\nDescription et vêtements\n{Description physique et vêtements}\n\nTéléphone : {Téléphone du mineur}\nLieux ou personnes qu’il ou elle pourrait rejoindre : {Lieux ou personnes qu’il ou elle pourrait rejoindre}\n\nÉléments de vulnérabilité\n{Éléments de vulnérabilité}\n\nMesure de protection : {Mesure de protection et service gardien}\nPersonnes déjà prévenues : {Personnes déjà prévenues}\n\nNous vous préviendrons immédiatement de son retour.\nContact joignable 24 h/24 : {Contact de l’établissement joignable 24 h/24}\n\n{Signataire (nom et fonction)}", "motscles": ["fugue", "disparition", "absence", "mineur", "police", "gendarmerie", "MECS", "ASE"]}}, {"id": "autorisation-parentale", "pack": "enfance", "emoji": "✍️", "titre": "Autorisation parentale pour un acte non usuel", "description": "Accord écrit des titulaires de l’autorité parentale pour un acte qui dépasse la vie quotidienne (voyage, activité à risque, soins programmés, photo publiée…).", "source": "art. 373-4 et 375-7 du code civil – à adapter", "formulaire": {"titre": "Autorisation parentale", "groupe": "mixte", "emoji": "✍️", "description": "Pour les actes non usuels, l’accord des titulaires de l’autorité parentale est nécessaire. Faites signer chaque titulaire.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom de l’enfant", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Acte autorisé", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Dates ou période", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Titulaire 1 (nom, qualité)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Titulaire 2 (nom, qualité)", "type": "texte", "options": "", "requis": false}], "modele": "Je soussigné(e) {Titulaire 1 (nom, qualité)},\net je soussigné(e) {Titulaire 2 (nom, qualité)},\n\ntitulaire(s) de l’autorité parentale sur {Nom et prénom de l’enfant}, né(e) le {Date de naissance}, autorise(ons) {Association} à :\n\n{Acte autorisé}\n\nPériode : {Dates ou période}.\n\nCette autorisation peut être retirée à tout moment par écrit.\n\nFait le                           à\n\nSignature du titulaire 1 :\n\nSignature du titulaire 2 :", "motscles": ["autorisation parentale", "acte non usuel", "autorité parentale", "accord des parents", "sortie", "voyage", "activité", "MECS"]}}, {"id": "cerfa-15646", "pack": "enfance", "emoji": "🏛️", "titre": "Cerfa 15646*01 : autorisation de sortie du territoire (AST)", "description": "Obligatoire pour un mineur qui quitte la France sans un titulaire de l’autorité parentale, même dans l’Union européenne.", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R46121", "motscles": ["AST", "sortie du territoire", "voyage", "séjour à l’étranger", "mineur", "Cerfa", "15646"]}, {"id": "entretien-17", "pack": "enfance", "emoji": "🗝️", "titre": "Entretien des 17 ans : vers l’autonomie", "description": "Trame de l’entretien prévu un an avant la majorité d’un jeune confié à l’ASE, pour préparer la suite (logement, ressources, études, santé, papiers).", "source": "art. L. 222-5-1 du CASF – trame à adapter", "formulaire": {"titre": "Entretien des 17 ans", "groupe": "mixte", "emoji": "🗝️", "description": "Trame de l’entretien de préparation à la majorité. Écrivez les souhaits du jeune avec ses mots.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom du jeune", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Date de l’entretien", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Personnes présentes", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Souhaits du jeune", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Logement", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Ressources", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Études ou formation", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Santé et couverture maladie", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Papiers (identité, titre de séjour)", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Prochaines étapes et qui s’en charge", "type": "long", "options": "", "requis": true}], "modele": "Entretien de préparation à la majorité\n{Nom et prénom du jeune}, né(e) le {Date de naissance}\nEntretien du {Date de l’entretien}. Présents : {Personnes présentes}.\n\nCe que je souhaite\n{Souhaits du jeune}\n\nLogement\n{Logement}\n\nRessources\n{Ressources}\n\nÉtudes ou formation\n{Études ou formation}\n\nSanté et couverture maladie\n{Santé et couverture maladie}\n\nPapiers\n{Papiers (identité, titre de séjour)}\n\nProchaines étapes\n{Prochaines étapes et qui s’en charge}\n\nSignature du jeune :\n\nPour {Association} :", "motscles": ["entretien des 17 ans", "majorité", "autonomie", "jeune majeur", "ASE", "sortie de placement", "contrat jeune majeur"]}}, {"id": "geva-sco", "pack": "enfance", "emoji": "🏛️", "titre": "GEVA-Sco : besoins de scolarisation (MDPH)", "description": "Rempli par l’école : première demande par l’équipe éducative, réexamen par l’enseignant référent. Explications et accès au formulaire.", "source": "monparcourshandicap.gouv.fr", "lien": "https://www.monparcourshandicap.gouv.fr/scolarite/quest-ce-que-le-geva-sco", "motscles": ["GEVA-Sco", "scolarisation", "PPS", "MDPH", "handicap", "école", "enseignant référent", "AESH"]}, {"id": "cerfa-14732", "pack": "agees", "emoji": "🏛️", "titre": "Cerfa 14732*03 : demande d’admission en EHPAD", "description": "Dossier national unique, volet administratif et volet médical (sous pli au médecin coordonnateur). Ne vaut qu’inscription sur liste d’attente.", "source": "service-public.gouv.fr", "lien": "https://www.formulaires.service-public.fr/gf/cerfa_14732.do", "motscles": ["EHPAD", "admission", "maison de retraite", "hébergement temporaire", "accueil de jour", "Cerfa", "14732"]}, {"id": "cerfa-16301", "pack": "agees", "emoji": "🏛️", "titre": "Cerfa 16301*01 : aides à l’autonomie à domicile (APA)", "description": "Formulaire unique pour l’APA à domicile ou l’aide de la caisse de retraite ; permet aussi de demander la carte mobilité inclusion.", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R64469", "motscles": ["APA", "autonomie", "domicile", "caisse de retraite", "GIR", "CMI", "Cerfa", "16301"]}, {"id": "directives-anticipees", "pack": "agees", "emoji": "🏛️", "titre": "Directives anticipées : modèles officiels", "description": "Deux modèles du ministère de la Santé (malade grave ou en bonne santé), non obligatoires ; à compléter par la personne elle-même.", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/f32010", "motscles": ["directives anticipées", "fin de vie", "soins palliatifs", "personne de confiance", "volontés"]}, {"id": "annexe-aller-venir", "pack": "agees", "emoji": "🚪", "titre": "Annexe au contrat de séjour : liberté d’aller et venir", "description": "Mesures individuelles et proportionnées pour assurer la sécurité d’un résident tout en respectant sa liberté d’aller et venir, à réévaluer régulièrement.", "source": "art. L. 311-4-1 du CASF – trame à adapter", "formulaire": {"titre": "Annexe : liberté d’aller et venir", "groupe": "mixte", "emoji": "🚪", "description": "Annexe au contrat de séjour. Toute mesure doit être nécessaire, proportionnée et réévaluée ; elle est discutée avec le résident et, s’il le souhaite, sa personne de confiance.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom du résident", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Représentant légal ou personne de confiance", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Situation et risques identifiés", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Mesures retenues", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Ce qui a été essayé avant", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Avis du médecin coordonnateur (sans détail médical)", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Avis du résident", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Prochaine réévaluation", "type": "date", "options": "", "requis": true}], "modele": "Annexe au contrat de séjour de {Nom et prénom du résident}\nMesures particulières relatives à la liberté d’aller et venir\n\nPersonne associée : {Représentant légal ou personne de confiance}\n\nSituation et risques identifiés\n{Situation et risques identifiés}\n\nCe qui a été essayé avant\n{Ce qui a été essayé avant}\n\nMesures retenues\n{Mesures retenues}\n\nAvis du médecin coordonnateur\n{Avis du médecin coordonnateur (sans détail médical)}\n\nAvis du résident\n{Avis du résident}\n\nCes mesures seront réévaluées au plus tard le {Prochaine réévaluation}, et à tout moment à la demande du résident.\n\nSignature du résident ou de son représentant :\n\nPour la direction :", "motscles": ["liberté d’aller et venir", "annexe", "contrat de séjour", "EHPAD", "sécurité", "contention", "sortie", "résident"]}}, {"id": "ofii-cma", "pack": "asile", "emoji": "🧳", "titre": "Courrier à l’OFII : rétablissement des conditions matérielles d’accueil", "description": "Demande de rétablissement de l’hébergement et de l’allocation (ADA) quand ils ont été suspendus et que la raison de la suspension a cessé.", "source": "art. L. 551-16 du CESEDA – à adapter", "formulaire": {"titre": "Demande de rétablissement des CMA", "groupe": "social", "emoji": "🧳", "description": "Courrier à la direction territoriale de l’OFII. Joindre la décision de suspension et les justificatifs. En cas de refus, un recours devant le tribunal administratif est possible : orientez vers un juriste.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Direction territoriale de l’OFII", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "N° AGDREF ou n° OFII", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Date de la décision de suspension ou de retrait", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Motif indiqué dans la décision", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Pourquoi ce motif a cessé", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Situation actuelle et vulnérabilités", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Adresse de domiciliation", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Pièces jointes", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "À l’attention de Madame ou Monsieur le Directeur territorial\nOffice français de l’immigration et de l’intégration – {Direction territoriale de l’OFII}\n\nObjet : demande de rétablissement des conditions matérielles d’accueil – {Civilité} {Nom et prénom}, né(e) le {Date de naissance}, n° {N° AGDREF ou n° OFII}\n\nMadame, Monsieur,\n\n{Association} accompagne {Civilité} {Nom et prénom}, demandeur(se) d’asile. Avec son accord, nous sollicitons le rétablissement de ses conditions matérielles d’accueil, sur le fondement de l’article L. 551-16 du code de l’entrée et du séjour des étrangers et du droit d’asile.\n\nPar décision du {Date de la décision de suspension ou de retrait}, ses conditions matérielles d’accueil ont été suspendues ou retirées au motif suivant : {Motif indiqué dans la décision}.\n\nCe motif a aujourd’hui cessé :\n{Pourquoi ce motif a cessé}\n\nSituation actuelle\n{Situation actuelle et vulnérabilités}\n\nNous vous remercions de bien vouloir examiner cette demande dans les meilleurs délais, compte tenu de sa situation.\n\nAdresse de domiciliation : {Adresse de domiciliation}\nPièces jointes : {Pièces jointes}\n\nVeuillez agréer, Madame, Monsieur, l’expression de nos salutations distinguées.\n\n{Signataire (nom et fonction)}", "motscles": ["OFII", "conditions matérielles d’accueil", "CMA", "ADA", "allocation pour demandeur d’asile", "rétablissement", "suspension", "CADA", "HUDA", "asile"]}}, {"id": "attest-hebergement", "pack": "asile", "emoji": "🏠", "titre": "Attestation d’hébergement par la structure", "description": "Atteste qu’une personne est hébergée par la structure depuis une date. Utile pour la préfecture, la CAF, la CPAM ou une inscription scolaire.", "source": "à adapter", "formulaire": {"titre": "Attestation d’hébergement", "groupe": "social", "emoji": "🏠", "description": "Atteste l’hébergement d’une personne par la structure. Ne mentionnez ni le motif de l’accueil ni la nature du dispositif s’il révèle une situation sensible.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Civilité", "type": "choix", "options": "Madame, Monsieur", "requis": true}, {"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Adresse d’hébergement", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Hébergé(e) depuis le", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Personnes hébergées avec elle ou lui", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Signataire (nom et fonction)", "type": "texte", "options": "", "requis": true}], "modele": "{Association} atteste héberger {Civilité} {Nom et prénom}, né(e) le {Date de naissance}, à l’adresse suivante : {Adresse d’hébergement}, depuis le {Hébergé(e) depuis le}.\n\nPersonnes hébergées avec elle ou lui : {Personnes hébergées avec elle ou lui}\n\nAttestation délivrée à la demande de l’intéressé(e) pour faire valoir ce que de droit.\n\n{Signataire (nom et fonction)}", "motscles": ["attestation d’hébergement", "hébergement", "justificatif de domicile", "CHRS", "CADA", "HUDA", "préfecture", "CAF"]}}, {"id": "entete-ordo", "pack": "addicto", "emoji": "🧾", "titre": "En-tête d’ordonnance", "description": "Page à l’en-tête du médecin et identité du patient. Le médecin rédige lui-même sa prescription, puis l’imprime, la signe et la tamponne.", "source": "ni ordonnance numérique, ni logiciel d’aide à la prescription", "formulaire": {"titre": "Ordonnance", "groupe": "med", "emoji": "🧾", "description": "Page à l’en-tête du médecin et identité du patient. Le médecin rédige lui-même sa prescription, puis l’imprime, la signe et la tamponne. Ce n’est ni une ordonnance numérique ni un logiciel d’aide à la prescription. Stupéfiants et assimilés : ordonnance numérique ou sécurisée.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Médecin (nom et n° RPPS)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom du patient", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Poids (si utile)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Prescription", "type": "long", "options": "", "requis": true}], "modele": "{Médecin (nom et n° RPPS)}\n\nPatient(e) : {Nom et prénom du patient}, né(e) le {Date de naissance}\nPoids : {Poids (si utile)}\n\n{Prescription}\n\nSignature et cachet du médecin :", "motscles": ["ordonnance", "ordo", "prescription", "en-tête"]}}, {"id": "dlu-document", "pack": "liaison", "emoji": "🚑", "titre": "DLU : document de liaison d’urgence", "description": "Synthèse remplie « à froid » par le médecin, à garder accessible pour les urgences.", "source": "d’après le DLU de la HAS – à compléter avec le modèle officiel", "formulaire": {"titre": "Document de liaison d’urgence", "groupe": "med", "emoji": "🚑", "description": "Synthèse remplie à froid par le médecin, transmise au médecin qui intervient en urgence (DLU, HAS).", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}, {"id": "", "label": "Médecin traitant", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Personne de confiance et téléphone", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Proche à prévenir et téléphone", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Antécédents importants", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Allergies", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Traitements en cours", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Directives anticipées ou souhaits exprimés", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Autonomie, communication, aides techniques", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Risques particuliers", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Date de mise à jour", "type": "date", "options": "", "requis": true}], "modele": "Dossier de liaison d’urgence – à remettre au médecin qui intervient en urgence.\n\nPersonne : {Nom et prénom}, né(e) le {Date de naissance}\nAccompagnée par {Association}\nMédecin traitant : {Médecin traitant}\nPersonne de confiance : {Personne de confiance et téléphone}\nProche à prévenir : {Proche à prévenir et téléphone}\n\nAntécédents importants :\n{Antécédents importants}\n\nAllergies : {Allergies}\n\nTraitements en cours (joindre la dernière ordonnance) :\n{Traitements en cours}\n\nDirectives anticipées ou souhaits exprimés :\n{Directives anticipées ou souhaits exprimés}\n\nAutonomie, communication, aides techniques :\n{Autonomie, communication, aides techniques}\n\nRisques particuliers : {Risques particuliers}\n\nDocument mis à jour le {Date de mise à jour}. À revoir à chaque changement important et au moins une fois par an.\n\nSignature du médecin :", "motscles": ["DLU", "dossier de liaison d’urgence", "urgence", "synthèse médicale", "SAMU", "transfert"]}}, {"id": "dlu-fiche", "pack": "liaison", "emoji": "📋", "titre": "DLU : fiche de liaison d’urgence", "description": "Remplie par l’équipe au moment de l’urgence, jointe au document de liaison.", "source": "d’après le DLU de la HAS – à compléter avec le modèle officiel", "formulaire": {"titre": "Fiche de liaison d’urgence", "groupe": "med", "emoji": "📋", "description": "Remplie par l’équipe au moment de l’urgence et transmise avec le document de liaison d’urgence.", "confidentiel": true, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Nom et prénom", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date et heure", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Professionnel qui remplit", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Motif de l’appel ou du transfert", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Ce qui a été observé", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Constantes (si mesurées)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Soins ou traitements donnés", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Appel au 15", "type": "choix", "options": "Oui, Non", "requis": true}, {"id": "", "label": "Objets et documents transmis", "type": "long", "options": "", "requis": false}, {"id": "", "label": "Contact dans la structure", "type": "texte", "options": "", "requis": true}], "modele": "Fiche de liaison d’urgence – {Date et heure}\n\nPersonne : {Nom et prénom}\nRemplie par : {Professionnel qui remplit}, {Association}\n\nMotif de l’appel ou du transfert :\n{Motif de l’appel ou du transfert}\n\nCe qui a été observé :\n{Ce qui a été observé}\n\nConstantes : {Constantes (si mesurées)}\nSoins ou traitements donnés : {Soins ou traitements donnés}\nAppel au 15 : {Appel au 15}\n\nObjets et documents transmis : {Objets et documents transmis}\n\nPour nous joindre : {Contact dans la structure}", "motscles": ["DLU", "fiche de liaison", "urgence", "transfert", "SAMU", "15"]}}, {"id": "dlu-has", "pack": "liaison", "emoji": "🏛️", "titre": "DLU : page de la HAS (modèles officiels)", "description": "Le dossier de liaison d’urgence de la HAS, avec son guide d’utilisation et ses modèles à jour.", "source": "has-sante.fr", "lien": "https://has-sante.fr/jcms/c_2049090/fr/dossier-de-liaison-d-urgence-dlu-ehpad", "motscles": ["DLU", "HAS", "urgence", "modèle"]}, {"id": "etranger-malade", "pack": "liaison", "emoji": "🏛️", "titre": "Titre de séjour pour soins : certificat médical (OFII)", "description": "Le certificat est un formulaire officiel, téléchargé dans l’espace ANEF de la personne, rempli par son médecin et envoyé à l’OFII, jamais à la préfecture.", "source": "justice.fr", "lien": "https://www.justice.fr/fiche/etranger-habitant-france-gravement-malade-obtenir-titre-sejour", "motscles": ["étranger malade", "titre de séjour", "soins", "OFII", "ANEF", "certificat médical"]}, {"id": "cnd-sejour", "pack": "liaison", "emoji": "🩺", "titre": "Certificat médical non descriptif (séjour pour soins)", "description": "Court certificat sans diagnostic, d’après le modèle du Comede, pour une préfecture qui exige un document au guichet. Il ne remplace pas le certificat officiel envoyé à l’OFII.", "source": "d’après le Guide Comede, 15.3", "formulaire": {"titre": "Certificat médical", "groupe": "med", "emoji": "🩺", "description": "Certificat non descriptif (sans diagnostic), d’après le modèle du Comede. Ne remplace pas le certificat officiel envoyé à l’OFII. N’ajoutez aucune information médicale.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": " ", "champs": [{"id": "", "label": "Médecin (nom et n° RPPS)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Nom et prénom de la personne", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Date de naissance", "type": "date", "options": "", "requis": true}], "modele": "Je soussigné(e) {Médecin (nom et n° RPPS)}, docteur en médecine, certifie que l’état de santé de {Nom et prénom de la personne}, né(e) le {Date de naissance}, nécessite une prise en charge médicale dont le défaut pourrait entraîner pour cette personne des conséquences d’une exceptionnelle gravité, et dont elle risque d’être privée dans son pays.\n\nCertificat établi à la demande de l’intéressé(e) et remis en main propre.\n\nSignature et cachet du médecin :", "motscles": ["certificat médical non descriptif", "CND", "étranger malade", "titre de séjour", "soins", "préfecture", "exceptionnelle gravité", "Comede"]}}, {"id": "cerfa-13960", "pack": "liaison", "emoji": "🏛️", "titre": "Cerfa 13960*02 : demande de permis de visite (prison)", "description": "Toute personne qui veut rendre visite à une personne détenue doit avoir un permis de visite (lien vers la version officielle).", "source": "service-public.gouv.fr", "lien": "https://www.service-public.gouv.fr/particuliers/vosdroits/R1027", "motscles": ["parloir", "permis de visite", "prison", "détention", "Cerfa", "13960"]}, {"id": "parloir-pro", "pack": "liaison", "emoji": "🔑", "titre": "Courrier : demande de permis de visite d’un professionnel", "description": "Lettre de la structure pour qu’un professionnel puisse rencontrer une personne détenue qu’il accompagne.", "source": "à adapter", "formulaire": {"titre": "Demande de permis de visite", "groupe": "social", "emoji": "🔑", "description": "Lettre pour qu’un professionnel de la structure puisse rencontrer une personne détenue qu’il accompagne.", "confidentiel": false, "destinataires": "", "objet": "", "signataire": "", "champs": [{"id": "", "label": "Destinataire", "type": "choix", "options": "Chef d’établissement, Magistrat chargé du dossier", "requis": true}, {"id": "", "label": "Établissement pénitentiaire", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Personne détenue (nom et prénom)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Numéro d’écrou (si connu)", "type": "texte", "options": "", "requis": false}, {"id": "", "label": "Professionnel (nom et prénom)", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Fonction", "type": "texte", "options": "", "requis": true}, {"id": "", "label": "Motif de la visite", "type": "long", "options": "", "requis": true}, {"id": "", "label": "Pièces jointes", "type": "texte", "options": "", "requis": false}], "modele": "À l’attention du {Destinataire}\n{Établissement pénitentiaire}\n\nObjet : demande de permis de visite pour un professionnel\n\nMadame, Monsieur,\n\n{Association} accompagne {Personne détenue (nom et prénom)} (écrou : {Numéro d’écrou (si connu)}). Afin de poursuivre cet accompagnement, nous sollicitons un permis de visite pour {Professionnel (nom et prénom)}, {Fonction}.\n\nMotif : {Motif de la visite}\n\nVous trouverez ci-joint : {Pièces jointes}.\n\nNous restons à votre disposition pour tout renseignement et vous prions d’agréer, Madame, Monsieur, nos salutations distinguées.", "motscles": ["parloir", "permis de visite", "prison", "détention", "SPIP", "courrier"]}}];
const MODELE_PACKS=[['droits','Droits des usagers','Pour toutes les structures : document individuel de prise en charge, personne de confiance, accord de partage.'],
  ['qualite','Fonctionnement et qualité','Livret d’accueil, règlement de fonctionnement, fiche d’incident, réclamation, procédure plaintes, plan maltraitance, plan de crise (critères HAS).'],
  ['social','Social','Domiciliation (Cerfa), attestation de suivi régulier, courrier de soutien, bons internes, reçu de dépôt de documents, signalement de refus de soins.'],
  ['liaison','Liaison et démarches','Dossier de liaison d’urgence, titre de séjour pour soins, permis de visite en détention.'],
  ['handicap','Handicap et protection des majeurs','Dossier MDPH, courrier d’accompagnement, projet personnalisé, tutelle et curatelle.'],
  ['enfance','Enfance et protection de l’enfance','Information préoccupante, signalement, rapport au juge, fugue, autorisations parentales, entretien des 17 ans.'],
  ['agees','Personnes âgées','Admission en EHPAD, APA, directives anticipées, liberté d’aller et venir.'],
  ['asile','Asile et hébergement','Courrier à l’OFII, attestation d’hébergement.'],
  ['addicto','Addictologie','En-tête d’ordonnance. Le relais et la délivrance de traitement de substitution sont des formulaires intégrés (Administration › Formulaires et modèles).']];
const modeleAdded=m=>m.lien?DATA.documents.some(d=>d.modele_src===m.id):DATA.formulaires.some(f=>f.modele_src===m.id);
async function addModele(id){
  const m=MODELES.find(x=>x.id===id); if(!m) return;
  const cat=(cats()[0]||{}).id||'';
  if(m.lien){
    const x={id:'l'+rid(),ext:'lien',date:month(),ajoute:today(),historique:[],url:m.lien,titre:m.titre,categorie:cat,sous:'',description:m.description,motscles:m.motscles||[],epingle:false,modele_src:m.id};
    Object.assign(x,{chemin:'lien:'+x.id,fichier:linkHost(m.lien),modifie:today()});
    DATA.documents.push(x);
    if(!await run(saveData,'Lien ajouté aux documents')){ DATA.documents=DATA.documents.filter(d=>d!==x); }
    drawFormList(); renderDocs(); return;
  }
  const f=JSON.parse(JSON.stringify(m.formulaire)); f.id='f'+rid(); f.categorie=cat; f.modele_src=m.id; f.champs.forEach(c=>c.id='c'+rid()); if(m.has) f.has=[...m.has];
  DATA.formulaires.push(f);
  if(!await run(saveData,'Formulaire ajouté')){ DATA.formulaires=DATA.formulaires.filter(x=>x!==f); drawFormList(); return; }
  jlog('Formulaire ajouté',f.titre,'depuis la bibliothèque');
  renderForms(); drawFormList();
}
/* Administration › Formulaires et modèles : une liste déroulante par rubrique (même présentation que l'accueil).
   Ce qui est ouvert reste ouvert quand la liste se redessine (après « Ajouter », « Masquer »…). */
const FL_OPEN=new Set(['own:mixte','own:med','own:social']);
const PACK_EMOJI={droits:'⚖️',qualite:'✅',social:'🤝',liaison:'🔗',handicap:'♿',enfance:'🧒',agees:'🧓',asile:'🏠',addicto:'💊'};
function flSec(key,emo,titre,sous,rows){
  return `<details class="hsec flsec" data-fl="${esc(key)}"${FL_OPEN.has(key)?' open':''}>
    <summary><span class="he" aria-hidden="true">${emo}</span><span class="ht"><b>${esc(titre)}</b><small>${esc(sous)}</small></span><span class="chev" aria-hidden="true"></span></summary>
    <div class="tblwrap"><table class="docs"><tbody>${rows}</tbody></table></div></details>`;
}
const nb=(n,un,des)=>n+' '+(n>1?des:un);
function modelesHTML(){
  return `<div class="card top w-wide"><h3>Bibliothèque de modèles</h3>
    <p class="hint">Des formulaires prêts à l’emploi, rangés par thème. « Ajouter » en fait une copie que vous pouvez ensuite modifier librement. Relisez toujours le texte avant de l’utiliser.</p>
    <div class="homecol">${MODELE_PACKS.map(([k,nom,txt])=>{ const l=MODELES.filter(m=>m.pack===k); if(!l.length) return ''; const deja=l.filter(modeleAdded).length;
      return flSec('pack:'+k,PACK_EMOJI[k]||'📝',nom,nb(l.length,'modèle','modèles')+(deja?' · '+deja+' déjà ajouté'+(deja>1?'s':''):''),
        l.map(m=>`<tr><td class="col-icon"><span class="ico emoji" aria-hidden="true">${m.emoji||'📝'}</span></td><td class="t"><b>${esc(m.titre)}</b><small>${esc(m.description)}${m.source?` · <i>${esc(m.source)}</i>`:''}</small></td>
        <td><div class="act">${modeleAdded(m)?`<span class="badge">Déjà ajouté</span><button class="ghost" data-madd="${m.id}">Ajouter une copie</button>`:`<button class="secondary sm" data-madd="${m.id}">${ICON.plus}Ajouter</button>`}</div></td></tr>`).join('')); }).join('')}</div></div>`;
}
function builtinRow(f){
  return `<tr><td class="col-icon"><span class="ico emoji" aria-hidden="true">${FORM_EMOJI[f.id]}</span></td><td class="t"><b>${esc(f.titre)}</b><small>${f.sets.map(k=>esc(SETTINGS[k].l)).join(' · ')}${formsOff().includes(f.id)?` · <b>${esc(formsOffBase().includes(f.id)?'masqué':formsAuto(f.id)||'masqué')}</b>`:(PAR.formsOn||[]).includes(f.id)&&formsAuto(f.id)?' · <b>activé par vous</b>':''}</small></td>
      <td><div class="act"><button class="secondary sm" data-foff="${f.id}">${formsOff().includes(f.id)?'Proposer':'Masquer'}</button>${f.tab==='deliv'?`<button class="secondary" data-goset="dest">Destinataires</button>`:''}${f.sets.includes('annu')?`<button class="secondary" data-goset="annu">Annuaire</button>`:''}${f.sets.includes('med')?`<button class="secondary" data-goset="med">Médecins</button>`:''}</div></td></tr>`;
}
function ownRow(f){
  return `<tr><td class="col-icon"><span class="ico emoji" aria-hidden="true">${esc(formEmoji(f))}</span></td><td class="t"><b>${esc(f.titre)}</b><small>${esc(catName(f.categorie))} · ${(f.champs||[]).length} champ(s)</small></td>
      <td><div class="act"><button class="secondary" data-fedit="${esc(f.id)}">Modifier</button><button class="secondary" data-fdup="${esc(f.id)}">Dupliquer</button><button class="secondary" data-fexp="${esc(f.id)}">Exporter</button><button class="ghost danger" data-fdel="${esc(f.id)}" aria-label="Supprimer le formulaire « ${esc(f.titre)} »" title="Supprimer le formulaire">${ICON.trash}</button></div></td></tr>`;
}
/* Formulaires de la structure : exporter / importer (fichier .json). Rien d'exécutable : seuls le texte
   et les champs sont repris, vérifiés un par un ; l'admin confirme avant l'ajout. */
const FORM_FILE='librejo-formulaires';
function formExport(f){
  const o={format:FORM_FILE,version:1,formulaires:[{titre:f.titre,description:f.description||'',emoji:f.emoji||'',groupe:f.groupe||'mixte',confidentiel:!!f.confidentiel,
    destinataires:f.destinataires||'',objet:f.objet||'',signataire:f.signataire||'',modele:f.modele||'',motscles:f.motscles||[],
    champs:(f.champs||[]).map(c=>({label:c.label,type:c.type,options:c.options||'',requis:!!c.requis,...(c.multi?{multi:true}:{}),...(c.infos?{infos:c.infos}:{})}))}]};
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(o,null,2)],{type:'application/json'}));
  a.download=('Formulaire-'+f.titre).replace(/[\\/:*?"<>|]+/g,'-').slice(0,80)+'.json'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  toast('Formulaire exporté');
}
function formFromJson(o){
  if(!o||typeof o!=='object') return null;
  const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  const champs=(Array.isArray(o.champs)?o.champs:[]).slice(0,80).filter(c=>c&&typeof c==='object').map(c=>({id:'c'+rid(),label:str(c.label,200).trim(),
    type:TYPES.some(t=>t[0]===c.type)?c.type:'texte',options:str(c.options,20000),requis:!!c.requis,...(c.multi?{multi:true}:{}),
    ...(Array.isArray(c.infos)?{infos:c.infos.filter(x=>EQ_INFOS.some(i=>i[0]===x))}:{})})).filter(c=>c.label);
  const titre=str(o.titre,200).trim(); if(!titre||!champs.length) return null;
  const cat=cats().find(c=>o.groupe==='med'&&/m[ée]dic/i.test(c.nom))||cats()[0]||{};
  return {id:'f'+rid(),titre,description:str(o.description,1000),emoji:str(o.emoji,8),groupe:FORM_GROUPS.some(g=>g[0]===o.groupe)?o.groupe:'mixte',
    categorie:cat.id||'',confidentiel:!!o.confidentiel,destinataires:str(o.destinataires,500),objet:str(o.objet,200),signataire:str(o.signataire,200),
    champs,modele:str(o.modele,50000),motscles:Array.isArray(o.motscles)?o.motscles.filter(x=>typeof x==='string').slice(0,30):[]};
}
async function formsImport(file){
  let j; try{ if(file.size>2e6) throw 0; j=JSON.parse(await file.text()); }catch(e){ toast('Ce fichier n’est pas un formulaire Librejo.'); return; }
  const list=(Array.isArray(j)?j:Array.isArray(j&&j.formulaires)?j.formulaires:[j]).slice(0,50).map(formFromJson).filter(Boolean);
  if(!list.length){ toast('Aucun formulaire lisible dans ce fichier.'); return; }
  askConfirm(list.length>1?`Ajouter ${list.length} formulaires ?`:'Ajouter ce formulaire ?',
    `<ul class="m-0">${list.map(f=>`<li><b>${esc(f.titre)}</b> (${f.champs.length} champ${f.champs.length>1?'s':''})</li>`).join('')}</ul>Ils rejoignent les formulaires de la structure : relisez-les avant de les proposer à l’équipe.`,
    'Ajouter',async()=>{ const keep=DATA.formulaires.slice(); DATA.formulaires.push(...list);
      if(!await run(saveData,list.length>1?`${list.length} formulaires ajoutés`:'Formulaire ajouté')) DATA.formulaires=keep;
      else { list.forEach(f=>{ jlog('Formulaire importé',f.titre); FL_OPEN.add('own:'+f.groupe); }); }
      drawFormList(); renderForms(); },false);
}
function drawFormList(){
  if(!$('#asub')) return;
  const grpOf=id=>{ const g=formGroup({id}); return g; };
  const own=FORM_GROUPS.map(([g,nom,emo])=>{ const l=DATA.formulaires.filter(f=>formGroup(f)===g); return l.length?flSec('own:'+g,emo,nom,nb(l.length,'formulaire','formulaires'),l.map(ownRow).join('')):''; }).join('');
  const integ=FORM_GROUPS.map(([g,nom,emo])=>{ const l=BUILTIN_FORMS.filter(f=>grpOf(f.id)===g); if(!l.length) return ''; const off=l.filter(f=>formsOff().includes(f.id)).length;
    return flSec('int:'+g,emo,nom,nb(l.length,'formulaire','formulaires')+(off?' · '+off+' masqué'+(off>1?'s':''):''),l.map(builtinRow).join('')); }).join('');
  $('#asub').innerHTML=`<div class="card top w-wide">
    <h3>Formulaires de la structure</h3>
    <p class="hint">Un formulaire = des champs à remplir + un texte modèle. Librejo en fait un PDF à l'en-tête de la structure, puis prépare le mail.</p>
    ${own?`<div class="homecol">${own}</div>`:'<p class="hint">Aucun formulaire pour l’instant : créez-en un, ou ajoutez un modèle de la bibliothèque ci-dessous.</p>'}
    <div class="row gap-s"><button class="primary" data-fnew>${ICON.plus}Créer un formulaire</button><button class="secondary" data-fimp>Importer un formulaire (.json)</button><input type="file" id="f-imp" accept=".json,application/json" hidden></div>
    <p class="hint m-0">« Exporter » enregistre un formulaire dans un fichier, pour le donner à une autre structure ; « Importer » l’ajoute ici. Relisez toujours un formulaire importé.</p></div>
    <div class="card top w-wide">
    <h3>Formulaires intégrés</h3>
    <p class="hint">Leur texte est fixe, mais ce qu'ils proposent se règle : destinataires, adresses, médecins, partenaires. « Masquer » les retire de la liste de l'équipe.</p>
    <div class="homecol">${integ}</div></div>
    ${modelesHTML()}`;
  const box=$('#asub'); if(!box._flImp){ box._flImp=true; box.addEventListener('change',e=>{ if(e.target.id==='f-imp'&&e.target.files[0]){ formsImport(e.target.files[0]); e.target.value=''; } }); }
  if(!box._flToggle){ box._flToggle=true; box.addEventListener('toggle',e=>{ const d=e.target; if(d&&d.dataset&&d.dataset.fl){ if(d.open) FL_OPEN.add(d.dataset.fl); else FL_OPEN.delete(d.dataset.fl); } },true); }
  $('#asub').onclick=async e=>{
    const ma=e.target.closest('[data-madd]'); if(ma) return addModele(ma.dataset.madd);
    const fo=e.target.closest('[data-foff]'); if(fo){ const id=fo.dataset.foff, hidden=formsOff().includes(id), old=PAR.formsOff, oldOn=PAR.formsOn, base=formsOffBase();
      if(hidden){ PAR.formsOff=base.filter(x=>x!==id); if(formsAuto(id)) PAR.formsOn=[...new Set([...(PAR.formsOn||[]),id])]; }
      else{ PAR.formsOff=[...new Set([...base,id])]; PAR.formsOn=(PAR.formsOn||[]).filter(x=>x!==id); }
      if(!await run(saveParams,hidden?'Formulaire proposé à l’équipe':'Formulaire masqué pour l’équipe')){ PAR.formsOff=old; PAR.formsOn=oldOn; }
      renderForms(); drawFormList(); return; }
    if(e.target.closest('[data-fnew]')) return editForm(null);
    if(e.target.closest('[data-fimp]')) return $('#f-imp').click();
    const ex=e.target.closest('[data-fexp]'); if(ex){ const f=DATA.formulaires.find(x=>x.id===ex.dataset.fexp); if(f) formExport(f); return; }
    const ed=e.target.closest('[data-fedit]'); if(ed) return editForm(ed.dataset.fedit);
    const du=e.target.closest('[data-fdup]'); if(du){ const f=DATA.formulaires.find(x=>x.id===du.dataset.fdup); const c=JSON.parse(JSON.stringify(f)); c.id='f'+rid(); c.titre+=' (copie)'; DATA.formulaires.push(c); if(!await run(saveData,'Formulaire dupliqué')) DATA.formulaires.pop(); return drawFormList(); }
    const de=e.target.closest('[data-fdel]'); if(de){ const f=DATA.formulaires.find(x=>x.id===de.dataset.fdel);
      askConfirm('Supprimer ce formulaire ?',`« ${esc(f.titre)} » ne sera plus proposé.`,'Supprimer',async()=>{ const keep=DATA.formulaires; DATA.formulaires=keep.filter(x=>x!==f); if(!await run(saveData,'Formulaire supprimé')) DATA.formulaires=keep; else jlog('Formulaire supprimé',f.titre); drawFormList(); renderForms(); }); }
  };
}
const TYPES=[['texte','Texte court'],['long','Texte long'],['date','Date'],['nombre','Nombre'],['choix','Choix'],['equipe','Professionnel(s) de l’équipe'],['cases','Cases à cocher']];
function editForm(id){
  const f=id?DATA.formulaires.find(x=>x.id===id):null;
  fdraft=f?JSON.parse(JSON.stringify(f)):{id:'f'+rid(),titre:'',description:'',categorie:(cats()[0]||{}).id||'',confidentiel:false,destinataires:'',objet:'',signataire:'',
    champs:[{id:'c'+rid(),label:'Civilité',type:'choix',options:'M., Mme',requis:true},{id:'c'+rid(),label:'Initiales',type:'texte',options:'',requis:true}],
    modele:"L'équipe de {Association} atteste que {Civilité} {Initiales} …"};
  fdraft._new=!f;
  if(tab!=='admin'){ asub='forms'; setTab('admin'); } else renderAdmin();
}
/* Aperçu en direct de l'éditeur : le formulaire tel que l'équipe le remplit, ou le PDF produit */
let fePv='form', feTimer=null, fePdfUrl=null;
function feSchedule(ms=450){ clearTimeout(feTimer); feTimer=setTimeout(feRender,ms); }
async function feRender(){
  const box=document.getElementById('fe-pv'), f=fdraft; if(!box||!f) return;
  if(fePv==='form'){
    const fld=c=>{ const lab=`<span>${esc(c.label||'Sans nom')}${c.requis?' <b class="req" aria-hidden="true">*</b>':''}</span>`;
      if(c.type==='choix') return `<div class="field">${lab}<div class="choice">${kwParse(c.options).map(o=>`<span class="chip">${esc(o)}</span>`).join('')||'<small class="hint">indiquez les choix</small>'}</div></div>`;
      if(c.type==='cases') return `<div class="field">${lab}<div class="choice">${caseOpts(c.options).map(o=>`<span class="chip">☐ ${esc(o)}</span>`).join('')||'<small class="hint">indiquez les cases, une par ligne</small>'}</div></div>`;
      if(c.type==='equipe') return `<div class="field">${lab}<div class="choice">${(equipe().length?equipe().slice(0,4).map(p=>p.nom):['(liste de l’équipe)']).map(n=>`<span class="chip">${esc(n)}</span>`).join('')}</div></div>`;
      if(c.type==='long') return `<label class="field">${lab}<textarea class="in" rows="2" disabled></textarea></label>`;
      return `<label class="field">${lab}<input class="in" type="${c.type==='date'?'date':c.type==='nombre'?'number':'text'}" disabled></label>`; };
    box.innerHTML=`<div class="fe-mock"><div class="fe-mocktitle">${f.emoji?esc(f.emoji)+' ':''}${esc(f.titre||'Titre du formulaire')}</div>
      ${f.description?`<p class="hint m-0">${esc(f.description)}</p>`:''}
      ${f.champs.map(fld).join('')}
      <label class="field"><span>Date du document</span><input class="in" type="date" value="${today()}" disabled></label>
      <button class="primary" type="button" disabled>${ICON.file}Créer le PDF</button></div>`;
    return;
  }
  const vals={}; f.champs.forEach(c=>vals[c.id]=c.type==='date'?today():`[${c.label}]`);
  let tp=null; try{ tp=await loadTampon(); }catch(_){}
  try{ await pdfReady(); }catch(_){ return; }
  try{
    const blob=makeLetter({titre:f.titre||'Titre du formulaire',confidentiel:f.confidentiel&&(f.groupe==='med'||!f.groupe?true:'CONFIDENTIEL'),date:today(),paras:fillTemplate(f,vals),signataire:f.signataire||structure.signataire||'',tp});
    if(fePdfUrl) URL.revokeObjectURL(fePdfUrl); fePdfUrl=URL.createObjectURL(blob);
    const c=await thumbPdf(blob); if(fePv!=='pdf'||!document.getElementById('fe-pv')) return;
    c.className='fe-page'; c.setAttribute('role','img'); c.setAttribute('aria-label','Première page du PDF');
    box.innerHTML=''; box.appendChild(c);
    const o=document.createElement('button'); o.type='button'; o.className='ghost'; o.textContent='Ouvrir en grand'; o.onclick=()=>previewUrl(fePdfUrl,'Aperçu du formulaire'); box.appendChild(o);
  }catch(err){ box.innerHTML='<p class="hint">Aperçu impossible pour l’instant (logo ou texte incomplet).</p>'; }
}
function drawFormEditor(){
  const f=fdraft;
  $('#asub').innerHTML=`<div class="fe-layout"><div class="card top w-wide">
    <h3>${f._new?'Nouveau formulaire':'Modifier le formulaire'}</h3>
    <div class="fieldgrid">
      <label class="field"><span>Titre (imprimé en haut du PDF)</span><input class="in" data-fe="titre" value="${esc(f.titre)}"></label>
      <label class="field"><span>Emoji <small>(facultatif, pour le repérer d'un coup d'œil)</small></span><input class="in w-num" data-fe="emoji" value="${esc(f.emoji||'')}" maxlength="4" placeholder="📝"></label>
      <label class="field"><span>Rubrique des formulaires</span><select class="in" data-fe="groupe">${FORM_GROUPS.map(([g,nom,emo])=>`<option value="${g}" ${(f.groupe||'mixte')===g?'selected':''}>${emo} ${esc(nom)}</option>`).join('')}</select></label>
      <label class="field"><span>Catégorie</span><select class="in" data-fe="categorie">${cats().map(c=>`<option value="${esc(c.id)}" ${c.id===f.categorie?'selected':''}>${esc(c.nom)}</option>`).join('')}</select></label>
      <label class="field wide"><span>Description <small>(affichée et utilisée par la recherche)</small></span><input class="in" data-fe="description" value="${esc(f.description)}"></label>
      <label class="field"><span>Destinataires par défaut <small>(facultatif)</small></span><input class="in" data-fe="destinataires" value="${esc(f.destinataires)}" spellcheck="false"></label>
      <label class="field"><span>Objet du mail <small>(sinon le titre)</small></span><input class="in" data-fe="objet" value="${esc(f.objet)}"></label>
      <label class="field"><span>Signataire <small>(sinon celui des réglages)</small></span><input class="in" data-fe="signataire" value="${esc(f.signataire)}" placeholder="${esc(structure.signataire)}"></label>
      <label class="field self-end"><span>Données de santé ?</span><label class="check"><input type="checkbox" data-fe="confidentiel" ${f.confidentiel?'checked':''}> Mention « Confidentiel » (« données de santé » pour les formulaires médicaux)</label></label>
    </div>
    <h3 class="mt-s">Champs à remplir</h3>
    <div class="stack" id="fe-champs">${f.champs.map((c,i)=>`<div class="champ-row" data-ci="${i}">
      <label class="field"><span class="mini-lbl">Nom du champ</span><input class="in" data-ck="label" value="${esc(c.label)}"></label>
      <label class="field"><span class="mini-lbl">Type</span><select class="in" data-ck="type">${TYPES.map(([v,l])=>`<option value="${v}" ${c.type===v?'selected':''}>${l}</option>`).join('')}</select></label>
      ${c.type==='equipe'?`<div class="field"><span class="mini-lbl">Réglages</span><label class="chk"><input type="checkbox" data-ck="multi" ${c.multi?'checked':''}> Plusieurs personnes possibles</label>
        <div class="choice">${EQ_INFOS.map(([i,l])=>`<button type="button" class="chip sm" data-cinfo="${i}" data-cidx="${i}" aria-pressed="${(c.infos||['fonction','tel']).includes(i)}">${l}</button>`).join('')}</div><small class="hint">Coché = proposé par défaut ; l’équipe peut changer.</small></div>`
      :c.type==='cases'?`<label class="field"><span class="mini-lbl">Cases proposées <small>(une par ligne ; l’équipe en coche une ou plusieurs)</small></span><textarea class="in" data-ck="options" rows="4">${esc(c.options||'')}</textarea></label>`
      :`<label class="field"><span class="mini-lbl">Choix possibles <small>(si « Choix », séparés par des virgules)</small></span><input class="in" data-ck="options" value="${esc(c.options||'')}" ${c.type==='choix'?'':'disabled'}></label>`}
      <label class="chk"><input type="checkbox" data-ck="requis" ${c.requis?'checked':''}> Obligatoire</label>
      <div class="row gap-xs h-input"><button class="iconbtn" data-cup="${i}" aria-label="Monter le champ « ${esc(c.label||i+1)} »" ${i?'':'disabled'}>${ICON.upA}</button><button class="iconbtn" data-cdel="${i}" aria-label="Supprimer le champ « ${esc(c.label||i+1)} »">${ICON.trash}</button></div>
    </div>`).join('')}</div>
    <div><button class="secondary" data-cadd>${ICON.plus}Ajouter un champ</button></div>
    <h3 class="mt-s">Texte du document</h3>
    <p class="hint muted">Écrivez le texte du PDF. Mettez le nom d'un champ entre accolades pour l'insérer, par ex. {Initiales}. Laissez une ligne vide entre deux paragraphes. Une ligne avec seulement <code>---</code> trace un trait sur toute la largeur ; <code>&gt;&gt; texte &lt;&lt;</code> centre le texte, en gras.</p>
    <div class="tokens">${f.champs.map(c=>`<button type="button" data-tok="${esc(c.label)}">{${esc(c.label)}}</button>`).join('')}</div>
    <textarea class="in" id="fe-modele" rows="9">${esc(f.modele)}</textarea>
    <div class="row between"><button class="secondary" data-fprev>${ICON.file}Aperçu du PDF</button>
      <span class="row"><button class="secondary" data-fcancel>Annuler</button><button class="primary" data-fsave>Enregistrer le formulaire</button></span></div>
  </div>
  <aside class="card top fe-prev" aria-label="Aperçu">
    <div class="fe-prevhead"><b>Aperçu</b><div class="choice"><button type="button" class="chip" data-pv="form" aria-pressed="${fePv==='form'}">Ce que remplit l’équipe</button><button type="button" class="chip" data-pv="pdf" aria-pressed="${fePv==='pdf'}">Le PDF</button></div></div>
    <div id="fe-pv"></div>
    <p class="hint muted m-0">Mis à jour pendant que vous écrivez. ${fePv==='pdf'?'Les champs sont remplacés par leur nom entre crochets.':'Les champs sont désactivés : c’est un aperçu.'}</p>
  </aside></div>`;
  const box=$('#asub'); feSchedule(0);
  box.oninput=e=>{ feSchedule(); const k=e.target.dataset.fe; if(k){ f[k]=e.target.type==='checkbox'?e.target.checked:e.target.value; return; }
    const r=e.target.closest('[data-ci]'); if(r&&e.target.dataset.ck){ const c=f.champs[+r.dataset.ci], ck=e.target.dataset.ck; const old=c.label;
      c[ck]=e.target.type==='checkbox'?e.target.checked:e.target.value;
      if(ck==='label'){ const m=$('#fe-modele'); if(old&&m.value.includes('{'+old+'}')){ m.value=m.value.split('{'+old+'}').join('{'+c.label+'}'); f.modele=m.value; } box.querySelector('.tokens').innerHTML=f.champs.map(x=>`<button type="button" data-tok="${esc(x.label)}">{${esc(x.label)}}</button>`).join(''); } }
    if(e.target.id==='fe-modele') f.modele=e.target.value; };
  box.onchange=e=>{ feSchedule(); const r=e.target.closest('[data-ci]'); if(r&&e.target.dataset.ck==='type'){ drawFormEditor(); } if(e.target.dataset.fe==='confidentiel'||e.target.dataset.ck==='requis'||e.target.dataset.ck==='multi') box.oninput(e); };
  box.onclick=async e=>{
    const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.pv){ fePv=b.dataset.pv; return drawFormEditor(); }
    if(b.dataset.tok){ setTimeout(()=>feSchedule(),0); const m=$('#fe-modele'), t='{'+b.dataset.tok+'}', s=m.selectionStart??m.value.length; m.value=m.value.slice(0,s)+t+m.value.slice(m.selectionEnd??s); f.modele=m.value; m.focus(); m.selectionStart=m.selectionEnd=s+t.length; return; }
    if(b.dataset.cinfo){ const c=f.champs[+b.closest('[data-ci]').dataset.ci]; const I=new Set(c.infos||['fonction','tel']); I.has(b.dataset.cinfo)?I.delete(b.dataset.cinfo):I.add(b.dataset.cinfo); c.infos=EQ_INFOS.map(x=>x[0]).filter(x=>I.has(x)); return drawFormEditor(); }
    if(b.hasAttribute('data-cadd')){ f.champs.push({id:'c'+rid(),label:'Nouveau champ',type:'texte',options:'',requis:false}); return drawFormEditor(); }
    if(b.dataset.cdel!==undefined){ f.champs.splice(+b.dataset.cdel,1); return drawFormEditor(); }
    if(b.dataset.cup!==undefined){ const i=+b.dataset.cup; [f.champs[i-1],f.champs[i]]=[f.champs[i],f.champs[i-1]]; return drawFormEditor(); }
    if(b.hasAttribute('data-fcancel')){ fdraft=null; return renderAdmin(); }
    if(b.hasAttribute('data-fprev')){
      const vals={}; f.champs.forEach(c=>vals[c.id]=c.type==='date'?today():`[${c.label}]`);
      let tp=null; try{ tp=await loadTampon(); }catch(_){}
      try{ await pdfReady(); }catch(_){ return; }
      const blob=makeLetter({titre:f.titre||'Titre du formulaire',confidentiel:f.confidentiel&&(f.groupe==='med'||!f.groupe?true:'CONFIDENTIEL'),date:today(),paras:fillTemplate(f,vals),signataire:f.signataire||structure.signataire,tp});
      previewUrl(URL.createObjectURL(blob),'Aperçu du formulaire'); return;
    }
    if(b.hasAttribute('data-fsave')){
      const errs=[]; if(!f.titre.trim()) errs.push('Le titre est obligatoire.');
      if(!f.champs.length) errs.push('Ajoutez au moins un champ.');
      const labels=f.champs.map(c=>norm(c.label.trim())); if(labels.some(l=>!l)) errs.push('Chaque champ doit avoir un nom.');
      if(new Set(labels).size!==labels.length) errs.push('Deux champs ont le même nom.');
      f.champs.forEach(c=>{ if(c.type==='choix'&&kwParse(c.options).length<2) errs.push(`« ${c.label} » : indiquez au moins deux choix.`); if(c.type==='cases'&&!caseOpts(c.options).length) errs.push(`« ${c.label} » : indiquez au moins une case.`); });
      String(f.destinataires||'').split(/[\s,;]+/).filter(Boolean).forEach(a=>{ if(!MAIL.test(a)) errs.push(`Adresse incorrecte : ${a}`); });
      if(!String(f.modele||'').trim()) errs.push('Le texte du document est vide.');
      const unknown=[...String(f.modele).matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]).filter(k=>!labels.includes(norm(k.trim()))&&!Object.keys(AUTO_FIELDS).map(norm).includes(norm(k.trim())));
      if(unknown.length) errs.push('Champ inconnu dans le texte : {'+unknown.join('}, {')+'}');
      if(errs.length){ openModal(`<h3 id="modal-title">À corriger</h3><ul class="errors">${errs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button class="secondary" data-close>OK</button>`); return; }
      const clean={...f}; delete clean._new; clean.titre=clean.titre.trim();
      const i=DATA.formulaires.findIndex(x=>x.id===clean.id), keep=DATA.formulaires.slice();
      if(i>=0) DATA.formulaires[i]=clean; else DATA.formulaires.push(clean);
      if(await run(saveData,'Formulaire enregistré')){ jlog(i>=0?'Formulaire modifié':'Formulaire créé',clean.titre); fdraft=null; renderAdmin(); renderForms(); renderDocs(); } else DATA.formulaires=keep;
    }
  };
}

/* ---------- Réglages ---------- */
let rdraft=null, rdraftBase=null;
/* Un seul enregistrement pour toute la page des réglages : on sait toujours s'il reste des modifications */
const regDirty=()=>!!rdraft&&rdraftBase!==null&&JSON.stringify(rdraft)!==rdraftBase;
function regBar(){ const b=document.querySelector('.rsave'); if(!b) return; const d=regDirty();
  b.classList.toggle('dirty',d); document.documentElement.classList.toggle('reg-dirty',d);
  const t=b.querySelector('.rs-state'); if(t) t.textContent=d?'Modifications non enregistrées':'Tout est enregistré';
  b.querySelectorAll('button').forEach(x=>x.disabled=!d); }
function regReset(){ rdraft=null; rdraftBase=null; applyTheme(PAR.apparence); document.documentElement.classList.remove('reg-dirty'); }
/* Quitter la page des réglages sans enregistrer : on demande, et l'aperçu des couleurs est annulé si on n'enregistre pas */
function regAsk(next){
  openModal(`<h3 id="modal-title">Modifications non enregistrées</h3>
    <p>Vous avez modifié les réglages sans les enregistrer${JSON.stringify(rdraft.apparence)!==JSON.stringify({...THEME_DEF,...(PAR.apparence||{})})?' (les couleurs affichées en font partie)':''}. Que voulez-vous faire ?</p>
    <div class="btns"><button class="primary" id="ra-save" data-autofocus>Enregistrer</button><button class="secondary" id="ra-drop">Ne pas enregistrer</button><button class="ghost" data-close>Rester sur la page</button></div>`);
  $('#ra-save').onclick=async()=>{ closeModal(); if(await saveReg()) next(); };
  $('#ra-drop').onclick=()=>{ closeModal(); regReset(); toast('Modifications annulées'); next(); };
}
window.addEventListener('beforeunload',e=>{ if(isAdmin&&regDirty()){ e.preventDefault(); e.returnValue=''; } });
/* Aperçu du papier à en-tête dans les réglages (avec les valeurs en cours de modification) */
let ppTimer=null, ppUrl=null;
function ppSchedule(ms=450){ clearTimeout(ppTimer); ppTimer=setTimeout(ppRender,ms); }
async function ppRender(){
  const box=document.getElementById('pp-prev'); if(!box||!rdraft) return;
  try{ await pdfReady(); }catch(e){ return; }
  try{ if(rdraft.mise.police!=='perso'||!rdraft.persoFont) await loadPdfFont(rdraft.mise.police); }catch(e){}
  const S=structure, M=PAR.mise;
  try{
    structure={...structure,...rdraft.attestation}; PAR.mise=rdraft.mise;
    const blob=makeLetter({titre:'Exemple de document',confidentiel:false,date:today(),paras:['Madame, Monsieur,','Voici à quoi ressembleront vos documents : le logo, le texte sous le logo, le titre, puis le bas de page. Le contenu change selon le formulaire.','Cordialement.'],signataire:rdraft.attestation.signataire||'Le signataire',tp:null});
    structure=S; PAR.mise=M;
    if(ppUrl) URL.revokeObjectURL(ppUrl); ppUrl=URL.createObjectURL(blob);
    const c=await thumbPdf(blob); if(!document.getElementById('pp-prev')) return;
    c.className='fe-page'; c.setAttribute('role','img'); c.setAttribute('aria-label','Aperçu du papier à en-tête'); box.innerHTML=''; box.appendChild(c);
  }catch(e){ structure=S; PAR.mise=M; box.innerHTML='<p class="hint">Aperçu indisponible.</p>'; }
}
let rsec='structure';
/* Sections des réglages : de vrais onglets, qui commandent un même panneau (role=tabpanel) nommé par l'onglet choisi */
function rsecShow(k){ rsec=k; const g=document.querySelector('.reglages'); if(g) g.dataset.show=k;
  document.querySelectorAll('[data-rsecgo]').forEach(x=>x.setAttribute('aria-selected',String(x.dataset.rsecgo===k)));
  const p=$('#rsec-panel'); if(p) p.setAttribute('aria-labelledby','rsec-tab-'+k); }
/* Papier à en-tête : couleur réellement imprimée quand le contraste a demandé de l'ajuster (comme pour l'Apparence) */
function ppColAdj(M){ return [['c1','Couleur imprimée pour les titres'],['c2','Couleur imprimée pour les traits']].map(([k,what])=>{ const c=hexRgb(M[k]), x=c&&pdfColor(k,M[k]);
  if(!x||!c.some((v,i)=>Math.abs(v-x[i])>8)) return ''; const h=rgbHex(x);
  return `<p class="ap-adj"><span class="ap-dot" style="background:${h}" aria-hidden="true"></span><span>${what} : <code>${esc(h)}</code>, couleur ajustée pour rester lisible à l’impression</span></p>`; }).join(''); }
function drawReg(){
  if(!rdraft) rdraft={medecins:meds().map(m=>({...m})),medecinLigne:PAR.medecinLigne||DEFAULT_MED_LINE,attestation:{...structure},destinataires:dests.map(d=>{ const o={nom:d.nom||'',structure:d.structure||'',attention:d.attention||'',adresses:[...(d.adresses||[])],partenaire:annuPart(d.partenaire)?d.partenaire:'',exclues:[...(d.exclues||[])]};
      if(!o.partenaire&&o.adresses.length){ const c=ANNU.partenaires.filter(p=>o.adresses.every(a=>(p.emails||[]).includes(a))); if(c.length===1){ o.partenaire=c[0].id; o.exclues=c[0].emails.filter(m=>!o.adresses.includes(m)); o.auto=true; } }
      return o; }),envoi:[...envoi],webmail,support:PAR.support||'',mail:PAR.mail||'outlook',motdepasse:'',equipe:(PAR.equipe||[]).map(p=>({...p})),tampon:PAR.tampon||null,apparence:{...THEME_DEF,...(PAR.apparence||{})},mise:{...MISE_DEF,...(PAR.mise||{})},fiche:{...(PAR.fiche||{})},nommage:{...NOMMAGE()}};
  if(rdraftBase===null) rdraftBase=JSON.stringify(rdraft);
  const a=rdraft.attestation, ap=rdraft.apparence, th=applyTheme(ap), own=ownLogo(ap);
  /* Couleur réellement appliquée quand le contraste a demandé de l'ajuster */
  const adj=(chosen,applied,what)=>{ const c=hexRgb(chosen), x=hexRgb(applied); if(!c||!x||!c.some((v,i)=>Math.abs(v-x[i])>8)) return '';
    return `<p class="ap-adj"><span class="ap-dot" style="background:${applied}" aria-hidden="true"></span><span>${what} : <code>${esc(applied)}</code>, couleur ajustée pour rester lisible</span></p>`; };
  const sw=(list,key)=>list.map(([c,n])=>`<button type="button" style="background:${c}" data-ap="${key}" data-v="${c}" title="${n}" aria-label="${n}" aria-pressed="${String(ap[key]).toLowerCase()===c.toLowerCase()}"></button>`).join('')+`<input type="color" data-apc="${key}" value="${esc(ap[key])}" aria-label="Autre couleur">`;
  $('#asub').innerHTML=`<div class="reglages" data-show="${rsec}">
    <div class="rsec-nav" role="tablist" aria-label="Sections des réglages">${[['structure','🏢 Structure','Adresse, SIRET, agrément, responsable'],['courriers','📝 Mes courriers','Papier à en-tête, signature, tampon'],['fichiers','📁 Mes fichiers','Noms des fichiers et des dossiers'],['apparence','🎨 Apparence','Couleurs et logo de l’application'],['mail','✉️ Mail','Envoi des mails, destinataires'],['equipe','👥 Équipe','Médecins et autres professionnels'],['securite','🔑 Accès','Mot de passe, assistant de démarrage']].map(([k,t,d])=>`<button type="button" class="rsec-b" role="tab" id="rsec-tab-${k}" aria-controls="rsec-panel" data-rsecgo="${k}" aria-selected="${rsec===k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
    <div class="rsec-panel" id="rsec-panel" role="tabpanel" tabindex="-1" aria-labelledby="rsec-tab-${rsec}">
    <div class="card top w-wide" data-rsec="structure"><h3>Infos de la structure</h3>
      <p class="hint muted m-0">Servent à pré-remplir les Cerfa (et à rien d’autre). Laissez vide ce que vous n’avez pas : la case restera vide sur le Cerfa.${(()=>{ const g=czGuess(); return Object.keys(g).length?' En gris : ce que Librejo a trouvé dans votre en-tête et votre bas de page.':''; })()}</p>
      <div class="fieldgrid">${(()=>{ const g=czGuess(); return CZ_INFO.map(([k,l])=>`<label class="field${k==='adresse'||k==='responsable'?' wide':''}"><span>${esc(l)}</span><input class="in" data-fiche="${k}" value="${esc(rdraft.fiche[k]||'')}" placeholder="${esc(g[k]||'')}"${k==='mail'?' spellcheck="false"':''}></label>`).join(''); })()}</div></div>
    <div class="card top w-wide" data-rsec="apparence"><h3>Apparence</h3>
      <p class="hint muted m-0">Aperçu immédiat sur ce poste. Les couleurs ne s’appliquent à tous les postes qu’une fois enregistrées ; si vous quittez la page sans enregistrer, Librejo vous le demande.</p>
      <div class="ap-grid">
        <div><b>Style du menu</b><div class="choice">${[['fonce','Foncé (recommandé)'],['clair','Clair']].map(([v,l])=>`<button type="button" class="chip" data-apstyle="${v}" aria-pressed="${(ap.menuStyle||'fonce')===v}">${l}</button>`).join('')}</div></div>
        <div><b>Couleur du menu et des titres</b><div class="ap-sw">${sw(THEME_MENUS,'menu')}</div>
          ${adj(ap.menu,th.vars['--navy'],'Couleur appliquée aux titres et au menu')}</div>
        <div><b>Couleur des boutons et des repères</b><div class="ap-sw">${sw(THEME_ACCENTS,'accent')}</div>
          ${adj(ap.accent,th.vars['--accent-text'],'Couleur appliquée aux liens')}
          <div class="ap-apercu" aria-hidden="true"><span class="m">Menu</span><span class="b">Bouton</span><span class="l">Lien</span></div></div>
        <div><b>Logo de la structure</b>
          <div class="row">${own?`<img class="ap-logo" src="${own}" alt="Logo actuel">`:'<span class="hint muted">Aucun logo.</span>'}
            <label class="secondary">${ICON.up}${own?'Remplacer':'Ajouter'}<input type="file" id="r-logo" accept="image/png,image/jpeg" hidden></label>
            ${ap.logo?'<button class="ghost danger" id="r-logodel">Retirer</button>':''}</div>
          <p class="hint muted">PNG ou JPEG, 2 Mo maximum. Affiché dans le menu et en haut des documents PDF.</p></div>
        <div><b>Dans le menu</b>
          <div class="choice">${[['librejo','Logo Librejo'],['structure','Logo de la structure'],['both','Les deux']].map(([v,l])=>`<button type="button" class="chip" data-aplogo="${v}" aria-pressed="${ap.menuLogo===v}"${v!=='librejo'&&!own?' disabled':''}>${l}</button>`).join('')}</div>
          <label class="check"><input type="checkbox" id="r-apnom"${ap.nom?' checked':''}> Afficher le nom de la structure</label></div>
      </div>
      <div class="row end"><button class="ghost" id="r-apdef">Revenir aux couleurs Librejo</button></div></div>
    <div class="card top" data-rsec="mail"><h3>Envoi des mails</h3>
      <div class="choice">${[['outlook','Application Outlook (mail prêt avec pièces jointes)'],['web','Outlook dans le navigateur']].map(([v,l])=>`<button type="button" class="chip" data-mail="${v}" aria-pressed="${rdraft.mail===v}">${l}</button>`).join('')}</div>
      <label class="field"><span>Adresses proposées pour les documents (une par ligne)</span><textarea class="in" id="r-envoi" rows="3" spellcheck="false">${esc(rdraft.envoi.join('\n'))}</textarea></label>
      <label class="field"><span>Adresse d'Outlook dans le navigateur</span><input class="in" id="r-webmail" value="${esc(rdraft.webmail)}" spellcheck="false"></label>
      <label class="field"><span>Adresse pour « Signaler un problème » <small>(facultatif)</small></span><input class="in" id="r-support" type="email" value="${esc(rdraft.support)}" spellcheck="false" placeholder="librejo@proton.me (par défaut)" aria-describedby="r-support-h"></label>
      <p class="hint muted" id="r-support-h">Par défaut, le mail part à l’équipe Librejo (librejo@proton.me). Mettez une autre adresse si quelqu’un s’en occupe dans votre structure. Le mail contient la version, le navigateur et les vérifications du poste ; jamais de données sur les personnes.</p></div>
    <div class="card top" data-rsec="mail"><h3>Destinataires de la délivrance</h3>
      <p class="muted m-0">Reliez chaque destinataire à sa fiche de l'annuaire : ses adresses mail sont alors celles de l’Annuaire, à corriger à un seul endroit.</p>
      <datalist id="r-parts">${ANNU.partenaires.map(x=>`<option value="${esc(x.nom)}">${esc(x.type||'')}</option>`).join('')}</datalist>
      ${rdraft.destinataires.map((d,i)=>{ const p=annuPart(d.partenaire); return `<div class="dest-row linked" data-i="${i}">
        <label class="field"><span class="mini-lbl">Nom dans la liste</span><input class="in" data-k="nom" value="${esc(d.nom)}"></label>
        <label class="field"><span class="mini-lbl">Fiche de l'annuaire</span><input class="in" data-part list="r-parts" value="${esc(p?p.nom:'')}" placeholder="non relié : chercher un partenaire…" autocomplete="off"></label>
        <label class="field"><span class="mini-lbl">Nom imprimé</span><input class="in" data-k="structure" value="${esc(d.structure)}"></label>
        <label class="field"><span class="mini-lbl">À l'attention de</span><input class="in" data-k="attention" value="${esc(d.attention)}"></label>
        <button class="iconbtn align-input" data-del="${i}" aria-label="Supprimer ce destinataire">${ICON.trash}</button>
        ${p?`<div class="adr"><span class="mini-lbl">Adresses de la fiche${d.auto?' <small>(reliée automatiquement : vérifiez, puis enregistrez)</small>':''}</span>
            ${p.emails.length?`<div class="adrlist">${p.emails.map(m=>`<label class="check"><input type="checkbox" data-ex="${esc(m)}"${(d.exclues||[]).includes(m)?'':' checked'}> ${esc(m)}</label>`).join('')}</div>`:'<small class="hint">Cette fiche n’a pas d’adresse mail : ajoutez-la dans l’Annuaire.</small>'}</div>`
          :`<label class="field adr"><span class="mini-lbl">Adresses (une par ligne) <small>· non relié à l'annuaire</small></span><textarea class="in" data-k="adresses" rows="2" spellcheck="false">${esc(d.adresses.join('\n'))}</textarea></label>`}
        </div>`; }).join('')}
      <div><button class="secondary" id="add-dest">${ICON.plus}Ajouter un destinataire</button></div></div>
    <div class="card top w-wide" data-rsec="fichiers"><h3>📛 Nom des fichiers et des dossiers</h3>
      <p class="hint">La règle que Librejo suit quand il crée un fichier (ajout, nouvelle version, import) ou un dossier de catégorie. Les fichiers déjà rangés gardent leur nom.</p>
      <div class="fieldgrid">
        <label class="field wide"><span>Modèle de nom de fichier</span><select class="in" id="nm-preset">${NOM_PRESETS.map(([v,l])=>`<option value="${esc(v)}" ${rdraft.nommage.fichier===v?'selected':''}>${esc(l)}</option>`).join('')}<option value="__perso" ${NOM_PRESETS.some(([v])=>v===rdraft.nommage.fichier)?'':'selected'}>Personnalisé…</option></select></label>
        <label class="field"><span>Entre les mots du titre</span><select class="in" id="nm-sep">${[['-','tiret : livret-accueil'],['_','tiret bas : livret_accueil'],[' ','espace : livret accueil']].map(([v,l])=>`<option value="${v}" ${rdraft.nommage.sep===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Nom des nouveaux dossiers de catégorie</span><select class="in" id="nm-dir">${[['{NN} {Nom}','01 Accueil (par défaut)'],['{NN}_{Nom}','01_Accueil'],['{Nom}','Accueil'],['{NN} - {NOM}','01 - ACCUEIL']].map(([v,l])=>`<option value="${esc(v)}" ${rdraft.nommage.dossier===v?'selected':''}>${l}</option>`).join('')}</select></label>
      </div>
      <div class="nm-prev" id="nm-prev"></div>
      <details class="pp-sec"${NOM_PRESETS.some(([v])=>v===rdraft.nommage.fichier)?'':' open'}><summary>Règle personnalisée <small>(pour aller plus loin)</small></summary>
        <label class="field"><span>Règle</span><input class="in" id="nm-file" value="${esc(rdraft.nommage.fichier)}" spellcheck="false"></label>
        <p class="hint">Éléments possibles : <code>{Titre}</code> <code>{titre}</code> <code>{TITRE}</code> <code>{version}</code> <code>{AAAA}</code> <code>{AA}</code> <code>{MM}</code> <code>{JJ}</code> <code>{categorie}</code> <code>{structure}</code>. Le reste est écrit tel quel.</p></details>
      <details class="pp-sec"${rdraft.nommage.sortie==='initiales'?' open':''}><summary>PDF créés par les formulaires <small>(bon CCAS, urgences, attestation…)</small></summary>
        <label class="field"><span>Nom du fichier produit</span><select class="in" id="nm-out">${NOM_SORTIES.map(([v,l])=>`<option value="${v}" ${(rdraft.nommage.sortie||'sans')===v?'selected':''}>${esc(l)}${v==='initiales'?' (donnée personnelle dans le nom du fichier)':''}</option>`).join('')}</select>
          <small class="nm-warn" id="nm-out-warn" ${rdraft.nommage.sortie==='initiales'?'':'hidden'}>⚠️ Ce modèle met une donnée personnelle (les initiales) dans le nom du fichier. Le nom reste visible dans Téléchargements, la corbeille et les mails envoyés.</small></label></details>
      <div class="row"><button type="button" class="secondary" id="nm-ren">Renommer les fichiers déjà rangés…</button><small class="hint">Selon la règle enregistrée. Les fichiers restent à leur place.</small></div>
    </div>
    <div class="card top w-wide" data-rsec="courriers"><h3>Papier à en-tête des PDF</h3>
      <p class="hint muted m-0">Utilisé par tous les documents produits : attestations, courriers, formulaires. L'aperçu se met à jour quand vous modifiez.</p>
      <div class="pp-grid"><div>
        <div class="grid2"><label class="field"><span>Texte sous le logo <small>(une ligne par ligne)</small></span><textarea class="in" data-a="entete" rows="4">${esc((a.entete||[]).join('\n'))}</textarea></label>
          <label class="field"><span>Bas de page <small>(une ligne par ligne)</small></span><textarea class="in" data-a="pied" rows="4">${esc((a.pied||[]).join('\n'))}</textarea></label></div>
        ${(()=>{ const M=rdraft.mise, on=(k,v)=>String(['filet','margeTrait','margeFond'].includes(k)?(M[k]?'oui':'non'):M[k])===v;
          const chips=(k,l,opts)=>`<div class="field"><span>${l}</span><div class="choice">${opts.map(([v,t])=>`<button type="button" class="chip" data-mise="${k}" data-v="${v}" aria-pressed="${on(k,v)}">${t}</button>`).join('')}</div></div>`;
          const hex=v=>{ const c=pdfRGB(v); return '#'+c.map(x=>x.toString(16).padStart(2,'0')).join(''); };
          const chosen=(k,v)=>hexRgb(M[k])?String(M[k]).toLowerCase():hex(v);   // le sélecteur garde la couleur choisie ; la couleur imprimée est dite dessous
          const persoOk=!!(rdraft.persoFont||(window.LJ_PDF_FONTS||{}).perso);
          return `<details class="pp-sec" open><summary>Police et couleurs</summary>
            <div class="pp-fonts">${PDF_POLICES.map(([k,n,d])=>`<button type="button" class="pp-font" data-mise="police" data-v="${k}" aria-pressed="${M.police===k}"><b>${esc(n)}</b><small>${esc(d)}</small></button>`).join('')}</div>
            ${M.police==='perso'?`<div class="row"><label class="secondary">${ICON.up}${persoOk?'Remplacer les fichiers':'Choisir les fichiers .ttf'}<input type="file" id="pp-ttf" accept=".ttf" multiple hidden></label>
              <small class="hint">${persoOk?`Police : <b>${esc((rdraft.persoFont||LJ_PDF_FONTS.perso).nom)}</b>. `:''}Choisissez le fichier normal, et si vous les avez le gras et l’italique (plusieurs fichiers d’un coup). Format .ttf ; la licence de la police doit permettre de l’intégrer dans des PDF.</small></div>`:''}
            <div class="row pp-cols"><label class="pp-col"><input type="color" data-misec="c1" value="${chosen('c1','--navy')}"> Titres</label><label class="pp-col"><input type="color" data-misec="c2" value="${chosen('c2','--accent')}"> Traits et filets</label>
              ${M.c1||M.c2?'<button type="button" class="ghost sm" id="pp-coldef">Reprendre les couleurs de l’application</button>':'<small class="hint">Par défaut : celles de l’application.</small>'}</div>
            <div id="pp-coladj">${ppColAdj(M)}</div>
            ${chips('corps','Taille du texte des documents',[['petit','Petite'],['normal','Normale'],['grand','Grande']])}
            ${chips('taille','Taille de l’en-tête, de la marge et du bas de page',[['petit','Petite'],['normal','Normale'],['grand','Grande']])}</details>
          <details class="pp-sec" open><summary>En-tête et bas de page</summary>
            ${chips('logo','Logo',[['aucun','Aucun'],['petit','Petit'],['moyen','Moyen'],['grand','Grand']])}
            ${chips('entete','Texte sous le logo',[['centre','Centré sous le logo'],['gauche','Aligné à gauche']])}
            ${chips('pied','Bas de page',[['centre','Centré'],['gauche','Aligné à gauche']])}
            ${chips('filet','Trait au-dessus du bas de page',[['oui','Oui'],['non','Non']])}</details>
          <details class="pp-sec" ${M.marge!=='non'?'open':''}><summary>Marge à gauche <small>(services, numéros utiles, membres du bureau…)</small></summary>
            ${chips('marge','Marge',[['non','Aucune'],['etroite','Étroite'],['large','Large']])}
            ${M.marge!=='non'?`<label class="field"><span>Contenu de la marge <small>(une information par ligne)</small></span><textarea class="in" data-misem rows="9" placeholder="# Nos services&#10;Accueil : 01 00 00 00 00&#10;Hébergement : 01 00 00 00 01&#10;---&#10;# Bureau&#10;Présidente : …">${esc((M.margeTexte||[]).join('\n'))}</textarea></label>
              ${chips('margePages','Afficher la marge',[['premiere','Sur la première page'],['toutes','Sur toutes les pages']])}
              ${chips('margeTrait','Trait vertical',[['oui','Oui'],['non','Non']])}${chips('margeFond','Fond coloré',[['oui','Oui'],['non','Non']])}`:''}</details>
          <p class="hint pp-syntax">Pour mettre en forme une ligne (texte sous le logo, marge, bas de page) : <code># Titre</code> en couleur · <code>**gras**</code> · <code>_italique_</code> · <code>---</code> un trait · une ligne vide pour aérer.</p>`; })()}
        <details class="pp-sec" open><summary>Signature et nom</summary>
          <div class="grid2"><label class="field"><span>Signataire</span><input class="in" data-a="signataire" value="${esc(a.signataire)}"></label>
            <label class="field"><span>Ville</span><input class="in" data-a="ville" value="${esc(a.ville)}"></label></div>
          <label class="field"><span>Nom court (objet des mails, « L'équipe du … »)</span><input class="in" data-a="nom" value="${esc(a.nom)}"></label></details>
      </div><div class="pp-prev"><div id="pp-prev" aria-live="polite"></div><button type="button" class="ghost" id="pp-big">Ouvrir en grand</button></div></div></div>
    <div class="card top w-wide" data-rsec="equipe"><h3>Professionnels de l’équipe</h3>
      <p class="hint muted m-0">Proposés dans les formulaires : l’équipe choisit une ou plusieurs personnes, et ce qui apparaît (fonction, téléphone, mail, n° professionnel). Aussi en choix rapide pour les signataires. Coordonnées professionnelles seulement.</p>
      <div class="eqlist">${(rdraft.equipe||[]).map((p,i)=>`<div class="eqrow" data-eqr="${i}">${[['nom','Prénom Nom'],['fonction','Fonction'],['tel','Téléphone'],['mail','Mail'],['numero','N° pro (ADELI, RPPS…)']].map(([k,ph])=>`<input class="in" data-ek="${k}" value="${esc(p[k]||'')}" placeholder="${ph}" aria-label="${ph}" ${k==='mail'?'spellcheck="false"':''}>`).join('')}
        <div class="row gap-xs"><button type="button" class="iconbtn" data-equp="${i}" aria-label="Monter ${esc(p.nom||'cette personne')}" ${i?'':'disabled'}>${ICON.upA}</button><button type="button" class="iconbtn" data-eqdel="${i}" aria-label="Retirer ${esc(p.nom||'cette personne')}">${ICON.trash}</button></div></div>`).join('')||'<p class="hint">Personne pour l’instant.</p>'}</div>
      <div><button type="button" class="secondary" id="r-eqadd">${ICON.plus}Ajouter une personne</button></div></div>
    <div class="card top" data-rsec="equipe"><h3>Médecins (signature et RPPS)</h3>
      <p class="hint">Proposés comme signataires de l'attestation de délivrance et dans les modèles Word (champs {Médecin}, {Signataire}, {RPPS}). À mettre à jour à chaque arrivée ou départ.</p>
      ${rdraft.medecins.map((m,i)=>`<div class="med-row" data-mi="${i}"><label class="field"><span class="mini-lbl">Nom imprimé</span><input class="in" data-m="nom" value="${esc(m.nom)}" placeholder="Dr NOM Prénom"></label>
        <label class="field"><span class="mini-lbl">N° RPPS</span><input class="in" data-m="rpps" value="${esc(m.rpps)}" inputmode="numeric" maxlength="11" placeholder="11 chiffres"></label>
        <button class="iconbtn align-input" data-mdel="${i}" aria-label="Retirer ce médecin">${ICON.trash}</button></div>`).join('')||'<p class="hint">Aucun médecin.</p>'}
      <div><button class="secondary" id="add-med">${ICON.plus}Ajouter un médecin</button></div>
      <label class="field"><span>Lignes imprimées sous le nom et le RPPS</span><textarea class="in" id="r-medline" rows="2">${esc(rdraft.medecinLigne)}</textarea></label></div>
    <div class="card top" data-rsec="courriers"><h3>Tampon de la structure</h3>
      <div class="row">${rdraft.tampon?`<img class="tampon-preview" src="${rdraft.tampon}" alt="Tampon actuel">`:'<span class="hint muted">Aucun tampon.</span>'}
        <label class="secondary">${ICON.up}${rdraft.tampon?'Remplacer':'Ajouter'}<input type="file" id="r-tp" accept="image/png,image/jpeg" hidden></label>
        ${rdraft.tampon?'<button class="ghost danger" id="r-tpdel">Retirer</button>':''}</div>
      <p class="hint muted">PNG à fond transparent de préférence, 1 Mo maximum. Imprimé sous la signature des attestations et formulaires.</p></div>
    <div class="card top" data-rsec="securite"><h3>Mot de passe admin</h3>
      <label class="field"><span>Nouveau mot de passe <small>(laisser vide pour garder l’actuel)</small></span><input class="in" id="r-pw" type="password" value="${esc(rdraft.motdepasse)}" autocomplete="new-password" aria-describedby="r-pw-h"></label>
        <p class="hint muted" id="r-pw-h">Librejo n’enregistre qu’une empreinte du mot de passe : personne ne peut le relire, ni ici ni dans le dossier. En cas d’oubli, un admin qui a encore l’accès en choisit un nouveau.</p>
      <p class="hint muted">Il évite les erreurs de manipulation. La vraie protection, ce sont les droits d'écriture sur le dossier.</p></div>
    <div class="card top" data-rsec="securite"><h3>Assistant de démarrage</h3>
      <p class="hint muted m-0">Pour revoir d’un coup la structure, l’équipe, les catégories, les modèles et le mail.</p>
      <div><button type="button" class="secondary" data-a="wizard">Relancer l’assistant</button></div></div>
    </div>
    <div class="rsave" role="region" aria-label="Enregistrement des réglages"><span class="rs-state" aria-live="polite"></span><button class="secondary" id="r-reset">Annuler les modifications</button><button class="primary" id="r-save">Enregistrer les réglages</button></div>
  </div>`;
  const box=$('#asub'); ppSchedule(0);
  box.oninput=e=>{ const el=e.target, row=el.closest('[data-i]'); if(el.dataset.a) ppSchedule();
    const er=el.closest('[data-eqr]'); if(er&&el.dataset.ek){ rdraft.equipe[+er.dataset.eqr][el.dataset.ek]=el.value; return; }
    if(row&&el.dataset.k){ const d=rdraft.destinataires[+row.dataset.i]; d[el.dataset.k]=el.dataset.k==='adresses'?el.value.split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean):el.value; return; }
    if(el.dataset.a){ rdraft.attestation[el.dataset.a]=['entete','pied'].includes(el.dataset.a)?el.value.split('\n').map(x=>x.trim()).join('\n').replace(/^\n+|\n+$/g,'').split('\n').filter((x,i,a)=>x||a.length>1):el.value; return; }
    if(el.dataset.misem!==undefined){ rdraft.mise.margeTexte=el.value.split('\n').map(x=>x.trim()); ppSchedule(); return; }
    if(el.dataset.misec){ rdraft.mise[el.dataset.misec]=el.value; const j=$('#pp-coladj'); if(j) j.innerHTML=ppColAdj(rdraft.mise); ppSchedule(); return; }
    if(el.id==='r-envoi') rdraft.envoi=el.value.split(/[\s,;]+/).map(x=>x.trim().toLowerCase()).filter(Boolean);
    if(el.id==='r-webmail') rdraft.webmail=el.value.trim();
    if(el.id==='r-support') rdraft.support=el.value.trim();
    if(el.id==='r-pw') rdraft.motdepasse=el.value;
    const mr=el.closest('[data-mi]'); if(mr&&el.dataset.m){ rdraft.medecins[+mr.dataset.mi][el.dataset.m]=el.dataset.m==='rpps'?el.value.replace(/\D/g,''):el.value; }
    if(el.id==='r-medline') rdraft.medecinLigne=el.value;
    if(el.dataset.fiche){ rdraft.fiche[el.dataset.fiche]=el.value; return; }
    if(el.id==='nm-file') rdraft.nommage.fichier=el.value;
    if(el.dataset.apc){ rdraft.apparence[el.dataset.apc]=el.value; applyTheme(rdraft.apparence); } };
  box.onchange=e=>{ const el=e.target, row=el.closest('.dest-row');
    if(el.id==='nm-preset'&&el.value!=='__perso') rdraft.nommage.fichier=el.value;
    if(el.id==='nm-sep') rdraft.nommage.sep=el.value; if(el.id==='nm-dir') rdraft.nommage.dossier=el.value; if(el.id==='nm-out') rdraft.nommage.sortie=el.value;
    if(row&&el.dataset.part!==undefined){ const d=rdraft.destinataires[+row.dataset.i], v=el.value.trim(), p=ANNU.partenaires.find(x=>x.nom===v);
      if(p){ d.partenaire=p.id; d.exclues=[]; d.auto=false; if(!d.structure.trim()) d.structure=p.nom; if(!d.nom.trim()) d.nom=p.nom.split(/\s[–-]\s/)[0].replace(/^CSAPA\s+/i,'').replace(/\s*\([^)]*\)\s*$/,''); }
      else{ if(v) toast('Partenaire introuvable : choisissez-le dans la liste'); if(d.partenaire){ const em=destMails(d); if(em&&em.length) d.adresses=em; } d.partenaire=''; d.exclues=[]; d.auto=false; }
      setTimeout(drawReg,0); return; }
    if(row&&el.dataset.ex!==undefined){ const d=rdraft.destinataires[+row.dataset.i]; d.exclues=(d.exclues||[]).filter(m=>m!==el.dataset.ex); if(!el.checked) d.exclues.push(el.dataset.ex); return; }
    if(el.dataset.apc||el.dataset.misec){ drawReg(); return; }
    if(el.id==='r-apnom'){ rdraft.apparence.nom=el.checked; applyTheme(rdraft.apparence); return; }
    if(el.id==='r-logo'){ const f=el.files[0]; if(!f) return; if(f.size>2097152){ toast('Image trop lourde (2 Mo max).'); return; }
      const fr=new FileReader(); fr.onload=async()=>{ try{ rdraft.apparence.logo=await logoForMenu(fr.result); if(rdraft.apparence.menuLogo==='librejo') rdraft.apparence.menuLogo='both'; drawReg(); toast('Logo prêt : enregistrez les réglages'); }catch(err){ toast('Cette image ne s’ouvre pas : essayez un PNG ou un JPEG.'); } }; fr.readAsDataURL(f); return; }
    if(e.target.id==='pp-ttf'){ ttfPick([...e.target.files]); return; }
    if(e.target.id!=='r-tp') return; const f=e.target.files[0]; if(!f) return;
    if(f.size>1048576){ toast('Image trop lourde (1 Mo max).'); return; }
    const fr=new FileReader(); fr.onload=()=>{ rdraft.tampon=fr.result; drawReg(); toast('Tampon prêt : enregistrez les réglages'); }; fr.readAsDataURL(f); };
  box.onclick=e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.mail){ rdraft.mail=b.dataset.mail; drawReg(); }
    if(b.id==='add-dest'){ rdraft.destinataires.push({nom:'',structure:'',attention:'',adresses:[],partenaire:'',exclues:[]}); drawReg(); }
    if(b.dataset.del!==undefined){ rdraft.destinataires.splice(+b.dataset.del,1); drawReg(); }
    if(b.id==='r-tpdel'){ rdraft.tampon=null; drawReg(); }
    if(b.dataset.ap){ rdraft.apparence[b.dataset.ap]=b.dataset.v; drawReg(); }
    if(b.dataset.aplogo){ rdraft.apparence.menuLogo=b.dataset.aplogo; drawReg(); }
    if(b.dataset.apstyle){ rdraft.apparence.menuStyle=b.dataset.apstyle; drawReg(); }
    if(b.dataset.mise){ const k=b.dataset.mise; rdraft.mise[k]=['filet','margeTrait','margeFond'].includes(k)?b.dataset.v==='oui':b.dataset.v;
      if(k==='police'&&b.dataset.v!=='perso') loadPdfFont(b.dataset.v).then(()=>ppSchedule(0)).catch(()=>toast('Cette police n’a pas pu être chargée.'));
      if(k==='police'&&b.dataset.v==='perso'&&!(rdraft.persoFont||(window.LJ_PDF_FONTS||{}).perso)) loadPdfFont('perso').then(()=>{ drawReg(); }).catch(()=>{});
      drawReg(); }
    if(b.id==='pp-coldef'){ rdraft.mise.c1=''; rdraft.mise.c2=''; drawReg(); }
    if(b.id==='r-eqadd'){ rdraft.equipe.push({id:'e'+rid(),nom:'',fonction:'',tel:'',mail:'',numero:''}); drawReg(); const r=[...document.querySelectorAll('[data-eqr]')].pop(); r&&r.querySelector('input').focus(); return; }
    if(b.dataset.eqdel!=null){ rdraft.equipe.splice(+b.dataset.eqdel,1); drawReg(); return; }
    if(b.dataset.equp!=null){ const i=+b.dataset.equp; [rdraft.equipe[i-1],rdraft.equipe[i]]=[rdraft.equipe[i],rdraft.equipe[i-1]]; drawReg(); return; }
    if(b.id==='pp-big'&&ppUrl){ previewUrl(ppUrl,'Aperçu du papier à en-tête'); }
    if(b.id==='r-logodel'){ rdraft.apparence.logo=null; if(!window.DOCUBUS_LOGO_ASSO) rdraft.apparence.menuLogo='librejo'; drawReg(); }
    if(b.id==='r-apdef'){ Object.assign(rdraft.apparence,{menu:THEME_DEF.menu,accent:THEME_DEF.accent}); drawReg(); }
    if(b.id==='add-med'){ rdraft.medecins.push({nom:'Dr ',rpps:''}); drawReg(); }
    if(b.dataset.mdel!==undefined){ rdraft.medecins.splice(+b.dataset.mdel,1); drawReg(); }
    if(b.id==='r-reset'){ regReset(); drawReg(); toast('Modifications annulées'); }
    if(b.id==='r-save') saveReg(); };
  box.addEventListener('input',()=>setTimeout(regBar,0)); box.addEventListener('change',()=>setTimeout(regBar,0)); box.addEventListener('click',()=>setTimeout(regBar,0));
  regBar();
}
async function ttfPick(files){
  if(!files.length) return; const P={nom:''}; const b64=buf=>{ let s=''; const u=new Uint8Array(buf); for(let i=0;i<u.length;i+=32768) s+=String.fromCharCode.apply(null,u.subarray(i,i+32768)); return btoa(s); };
  for(const f of files){ if(f.size>3*1048576){ toast(`${f.name} : trop lourd (3 Mo max).`); return; }
    const buf=await f.arrayBuffer(), sig=new Uint8Array(buf.slice(0,4)), tag=String.fromCharCode(...sig);
    if(tag==='OTTO'){ toast(`${f.name} : format OpenType CFF non pris en charge. Cherchez la version .ttf de la police.`); return; }
    if(!(sig[0]===0&&sig[1]===1&&sig[2]===0&&sig[3]===0)&&tag!=='true'){ toast(`${f.name} n’est pas un fichier .ttf.`); return; }
    const n=f.name.toLowerCase(), st=/(bold|gras|700|heavy|black).*(italic|oblique|italique)|bolditalic|bi\.ttf$/.test(n)?'bolditalic':/bold|gras|700|heavy|black/.test(n)?'bold':/italic|oblique|italique/.test(n)?'italic':'normal';
    P[st]=b64(buf); if(st==='normal'||!P.nom) P.nom=f.name.replace(/\.ttf$/i,'').replace(/[-_ ]?(regular|normal|bold|italic|bolditalic|gras|italique|400|700)$/i,'').replace(/[-_]+/g,' ').trim(); }
  if(!P.normal){ toast('Il manque le fichier normal (Regular) de la police.'); return; }
  rdraft.persoFont=P; (window.LJ_PDF_FONTS=window.LJ_PDF_FONTS||{}).perso=P; registerPdfFont('perso'); rdraft.mise.police='perso';
  drawReg(); toast(`Police « ${P.nom} » prête : vérifiez l’aperçu, puis enregistrez.`);
}
async function saveReg(){
  const r=rdraft, errs=[];
  if(!/\{(Titre|titre|TITRE)\}/.test(r.nommage.fichier)) errs.push('Nom des fichiers : la règle doit contenir le titre ({Titre}, {titre} ou {TITRE}).');
  r.destinataires.forEach((d,i)=>{ const n=d.nom||`n° ${i+1}`;
    if(!d.nom.trim()) errs.push(`Destinataire ${i+1} : nom manquant.`);
    if(!d.structure.trim()) errs.push(`${n} : nom imprimé manquant.`);
    const em=destMails(d); if(em){ if(em.length) d.adresses=em; else { errs.push(`${n} : aucune adresse retenue dans sa fiche de l'annuaire.`); return; } }
    if(!d.adresses.length) errs.push(`${n} : aucune adresse.`);
    d.adresses.forEach(x=>{ if(!MAIL.test(x)) errs.push(`${n} : adresse incorrecte « ${x} ».`); }); });
  r.envoi.forEach(x=>{ if(!MAIL.test(x)) errs.push(`Envoi : adresse incorrecte « ${x} ».`); });
  if(!String(r.attestation.signataire||'').trim()) errs.push('Le signataire est obligatoire.');
  (r.equipe||[]).forEach(p=>{ if(String(p.mail||'').trim()&&!MAIL.test(String(p.mail).trim())) errs.push(`Équipe : l’adresse de ${p.nom||'une personne'} est incorrecte.`); });
  if(!/^https:\/\//.test(r.webmail)) errs.push("L'adresse d'Outlook doit commencer par https://");
  if(r.support&&!MAIL.test(r.support)) errs.push(`Signaler un problème : adresse incorrecte « ${r.support} ».`);
  if(r.motdepasse){ if(r.motdepasse.length<6) errs.push('Le nouveau mot de passe doit avoir au moins 6 caractères.');
    else if(/^(docubus|librejo|motdepasse|123456)$/i.test(r.motdepasse)) errs.push('Choisissez un mot de passe moins courant.');
    else if(pwLikeName(r.motdepasse,r.attestation.nom||structure.nom||'')) errs.push('Le mot de passe ressemble trop au nom de la structure : choisissez autre chose.'); }
  r.medecins.forEach((m,i)=>{ if(!String(m.nom||'').replace(/^Dr\s*/,'').trim()) errs.push(`Médecin ${i+1} : nom manquant.`); if(!/^\d{11}$/.test(m.rpps||'')) errs.push(`${m.nom||'Médecin '+(i+1)} : le n° RPPS doit compter 11 chiffres.`); });
  if(errs.length){ openModal(`<h3 id="modal-title">À corriger</h3><ul class="errors">${errs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button class="secondary" data-close>OK</button>`); return false; }
  /* mot de passe : empreinte du nouveau, ou de l'ancien s'il était encore en clair */
  const pwNew=r.motdepasse?await pwHash(r.motdepasse):pwPlain()?await pwHash(PAR.motdepasse||'docubus'):PAR.motdepasse;
  const old=PAR, nomChange=JSON.stringify(r.nommage)!==JSON.stringify(NOMMAGE());
  PAR={...PAR,equipe:(r.equipe||[]).map(p=>({id:p.id||'e'+rid(),nom:String(p.nom||'').trim(),fonction:String(p.fonction||'').trim(),tel:String(p.tel||'').trim(),mail:String(p.mail||'').trim(),numero:String(p.numero||'').trim()})).filter(p=>p.nom),attestation:r.attestation,destinataires:r.destinataires.map(d=>({nom:d.nom.trim(),structure:d.structure.trim(),attention:d.attention.trim(),adresses:d.adresses,...(annuPart(d.partenaire)?{partenaire:d.partenaire,exclues:d.exclues||[]}:{})})),envoi:r.envoi,webmail:r.webmail,support:r.support||'',mail:r.mail,motdepasse:pwNew,tampon:r.tampon,medecins:r.medecins.map(m=>({nom:m.nom.trim(),rpps:m.rpps})),medecinLigne:String(r.medecinLigne||'').trim(),apparence:r.apparence,mise:r.mise,formsOff:PAR.formsOff,fiche:Object.fromEntries(Object.entries(r.fiche||{}).map(([k,v])=>[k,String(v||'').trim()]).filter(([,v])=>v)),nommage:{...r.nommage}};
  const newLogo=r.apparence.logo&&r.apparence.logo!==((old.apparence||{}).logo);
  if(r.persoFont&&!await run(()=>writeRel('app/polices-pdf/perso.json',new Blob([JSON.stringify(r.persoFont)],{type:'application/json'})))){ PAR=old; return false; }
  if(await run(saveParams,'Réglages enregistrés')){ jlog('Réglages enregistrés',''); if(nomChange) jlog('Réglages enregistrés','Nom des fichiers',PAR.nommage.fichier+' · dossiers : '+PAR.nommage.dossier);
    if(newLogo) await run(async()=>{ const j=await logoForPdf(r.apparence.logo);
      await guardedWrite('app/logo-association.js','// Librejo : logo de la structure pour l\'en-tête des PDF (écrit par le mode admin).\nwindow.DOCUBUS_LOGO_ASSO = '+JSON.stringify(j)+';\n');
      window.DOCUBUS_LOGO_ASSO=j; });
    applyParams(); regReset(); if(tab==='admin'&&asub==='reg') drawReg(); renderDeliv(); return true; } else { PAR=old; return false; }
}


/* ======================================================================
   7. ANNUAIRE DES PARTENAIRES (app/annuaire.js, modifiable en mode admin)
   Mails et adresses professionnels des structures partenaires : aucune donnée de patient.
   ====================================================================== */
const ANNU=window.DOCUBUS_ANNUAIRE||{types:[],partenaires:[]};
ANNU.types=ANNU.types||[]; ANNU.partenaires=ANNU.partenaires||[];
const annuTypes=()=>[...new Set(ANNU.types.concat(ANNU.partenaires.map(p=>p.type)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fr'));
const partAddr=p=>{ const a=String(p.adresse||'').trim(), cv=[p.cp,p.ville].filter(Boolean).join(' '); return a&&(p.cp&&a.includes(p.cp)||!cv)?a:[a,cv].filter(Boolean).join(', '); };
async function saveAnnu(){
  ANNU.maj=nowStr(); ANNU.types=annuTypes();
  const text="// Librejo : annuaire des partenaires (écrit par le mode admin de Librejo.html).\n// Mis à jour le "+ANNU.maj+"\nwindow.DOCUBUS_ANNUAIRE = "+JSON.stringify(ANNU,null,0)+";\n";
  await guardedWrite('app/annuaire.js',text);
  dests=mkDests(); rdraft=null; rdraftBase=null;
}
const ICON_PEOPLE=svg('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5.4 6-5.4s5.4 2 6 5.4"/><path d="M16 4.5a3 3 0 0 1 0 6M18 14.8c1.7.7 2.8 2.4 3.1 5.2"/>');
const ICON_CAL=svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>');
const ICON_COPY=svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>');

/* ---------- Choix des destinataires : adresses de l'équipe, annuaire par type, ou adresse libre ---------- */
function recipHTML(id){
  const ts=annuTypes();
  return `<div class="recip" id="${id}">
    <div class="dest-chips" data-r="quick">${envoi.map(a=>`<button type="button" class="chip" data-to="${esc(a)}" aria-pressed="false">${esc(a)}</button>`).join('')}</div>
    <div class="recip-add">
      <select class="in" data-r="type" aria-label="Type de partenaire"><option value="">Annuaire : choisir un type…</option>${ts.map(t=>{ const n=ANNU.partenaires.filter(p=>p.type===t&&p.emails.length).length; return `<option value="${esc(t)}">${esc(t)} (${n} avec mail)</option>`; }).join('')}</select>
      <input class="in" data-r="q" placeholder="ou chercher un partenaire, ou taper une adresse" autocomplete="off" spellcheck="false" aria-label="Chercher un partenaire ou taper une adresse">
    </div>
    <div class="recip-list" data-r="list"></div>
    <div class="recip-selbox"><div class="recip-count" data-r="count"></div><div class="recip-sel" data-r="sel"></div></div>
  </div>`;
}
function bindRecip(root,initial){
  const sel=[...(initial||[])];
  const $r=k=>root.querySelector(`[data-r="${k}"]`);
  const has=a=>sel.some(x=>x.toLowerCase()===a.toLowerCase());
  const add=a=>{ a=String(a||'').trim(); if(MAIL.test(a)&&!has(a)) sel.push(a); };
  const del=a=>{ const i=sel.findIndex(x=>x.toLowerCase()===a.toLowerCase()); if(i>=0) sel.splice(i,1); };
  let list=[], title='';
  const drawSel=()=>{
    $r('count').innerHTML=sel.length?`<b>${sel.length}</b> destinataire${sel.length>1?'s':''} choisi${sel.length>1?'s':''}`:'';
    $r('sel').innerHTML=sel.length?sel.map(a=>`<span class="rchip">${esc(a)}<button type="button" data-del="${esc(a)}" aria-label="Retirer ${esc(a)}">×</button></span>`).join('')+(sel.length>1?`<button type="button" class="ghost" data-clear>Tout retirer</button>`:''):'<span class="hint">Aucun destinataire choisi.</span>';
    root.querySelectorAll('[data-r=quick] .chip').forEach(c=>c.setAttribute('aria-pressed',String(has(c.dataset.to))));
    root.querySelectorAll('[data-pick]').forEach(c=>c.setAttribute('aria-pressed',String(has(c.dataset.pick))));
  };
  const drawList=()=>{
    if(!list.length&&!title){ $r('list').innerHTML=''; return; }
    const mails=[...new Set(list.flatMap(p=>p.emails.map(m=>m.toLowerCase())))];
    $r('list').innerHTML=`<div class="row between recip-head"><b>${esc(title)}</b>${mails.length>1?`<button type="button" class="ghost" data-all>${ICON.plus}Tout ajouter (${mails.length} adresse${mails.length>1?'s':''})</button>`:''}</div>
      ${list.length?list.map(p=>`<div class="recip-row"><span class="rname">${esc(p.nom)}${title.startsWith('Résultats')?` <small>${esc(p.type)}</small>`:''}</span>
        <span class="rmails">${p.emails.length?p.emails.map(m=>`<button type="button" class="chip small" data-pick="${esc(m)}" aria-pressed="${has(m)}">${esc(m)}</button>`).join(''):'<span class="hint">pas d’adresse mail</span>'}</span></div>`).join(''):'<p class="hint">Aucun partenaire trouvé.</p>'}`;
  };
  root.addEventListener('click',e=>{
    const q=e.target.closest('[data-to]'); if(q){ has(q.dataset.to)?del(q.dataset.to):add(q.dataset.to); drawSel(); return; }
    const p=e.target.closest('[data-pick]'); if(p){ has(p.dataset.pick)?del(p.dataset.pick):add(p.dataset.pick); drawSel(); return; }
    const d=e.target.closest('[data-del]'); if(d){ del(d.dataset.del); drawSel(); return; }
    if(e.target.closest('[data-clear]')){ sel.length=0; drawSel(); return; }
    if(e.target.closest('[data-all]')){ list.flatMap(x=>x.emails).forEach(add); drawSel(); }
  });
  $r('type').addEventListener('change',e=>{ const t=e.target.value; $r('q').value='';
    list=t?ANNU.partenaires.filter(p=>p.type===t).sort((a,b)=>b.emails.length-a.emails.length||a.nom.localeCompare(b.nom,'fr')):[]; title=t?`${t} : ${list.length} partenaire${list.length>1?'s':''}`:''; drawList(); });
  $r('q').addEventListener('input',e=>{ const v=norm(e.target.value.trim()); $r('type').value='';
    if(v.length<2||v.includes('@')){ list=[]; title=''; drawList(); return; }
    list=ANNU.partenaires.filter(p=>norm(p.nom+' '+p.type+' '+p.emails.join(' ')+' '+(p.personnes||[]).map(c=>c.nom+' '+c.fonction).join(' ')).includes(v)).slice(0,25); title=`Résultats pour « ${e.target.value.trim()} »`; drawList(); });
  // adresse tapée sans Entrée : annoncée tout de suite, sur la même ligne (rien ne bouge sous la souris), et prise en compte à l'envoi
  $r('q').addEventListener('input',e=>{ const v=e.target.value.trim(), ok=MAIL.test(v)&&!has(v), pend=ok?`« ${esc(v)} » sera ${sel.length?'ajoutée aussi':'le destinataire'}`:'';
    if(!sel.length) $r('sel').innerHTML=`<span class="hint">${pend?pend+' (ou Entrée pour l’ajouter maintenant).':'Aucun destinataire choisi.'}</span>`;
    else $r('count').innerHTML=`<b>${sel.length}</b> destinataire${sel.length>1?'s':''} choisi${sel.length>1?'s':''}${pend?` <span class="hint">· ${pend}</span>`:''}`; });
  $r('q').addEventListener('keydown',e=>{ if(e.key!=='Enter') return; e.preventDefault(); const v=e.target.value.trim(); if(MAIL.test(v)){ add(v); e.target.value=''; list=[]; title=''; drawList(); drawSel(); } else if(v) toast('Cette adresse mail semble incomplète : vérifiez-la.'); });
  drawSel();
  return {get:()=>{ const v=$r('q').value.trim(); if(MAIL.test(v)){ add(v); $r('q').value=''; drawSel(); } return sel.slice(); }, add:a=>{ add(a); drawSel(); }};
}
/* Fenêtre d'envoi commune (document seul, plusieurs documents) */
function sendDialog(title,intro,nFiles,go){
  openModal(`<h3 id="modal-title">${esc(title)}</h3>${intro||''}
    <div class="field"><span>À</span>${recipHTML('rc')}</div>
    ${senderHTML()}
    ${mailHelp(nFiles,false)}
    <div class="btns"><button class="primary" id="sd-go">${ICON.mail}Préparer le mail</button><button class="secondary" data-close>Fermer</button></div>`,'send');
  const R=bindRecip($('#modal-box').querySelector('#rc'),[]);
  $('#sd-go').onclick=async()=>{ const to=R.get(); if(!to.length){ toast('Choisissez au moins un destinataire.'); return; } await go(to); };
}

/* ---------- Page Annuaire ----------
   Fiches de structures partenaires, avec leurs contacts professionnels.
   Import : CSV d'Outlook (classique, nouveau, web), de Gmail ou de Thunderbird,
   vCard (.vcf), Excel (.xlsx). Export : tableur, carnet d'adresses (Outlook/Gmail), vCard.
   Détection des doublons à l'import, à la saisie et dans l'outil « Doublons ».
   Aucune donnée d'usager : l'annuaire ne contient que des coordonnées professionnelles. */
let aq='', atype='', aOnlyMail=false;
const anPers=p=>(p.personnes=Array.isArray(p.personnes)?p.personnes:[]);
const anMails=a=>{ const s=new Set(), o=[]; a.forEach(m=>{ m=String(m||'').trim(); const k=m.toLowerCase(); if(m&&MAIL.test(m)&&!s.has(k)){ s.add(k); o.push(m); } }); return o; };
const anDig=s=>String(s||'').replace(/\D/g,'').replace(/^33/,'0').slice(-9);
const AN_STOP=new Set(['le','la','les','l','de','du','des','d','et','a','au','aux','en','the','of']);
const anKey=s=>norm(s).replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w&&!AN_STOP.has(w)).join(' ');
function anLev(a,b){ if(a===b) return 0; const m=a.length,n=b.length; if(!m||!n) return m||n; let p=Array.from({length:n+1},(_,j)=>j);
  for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[n]; }
function anSim(a,b){ const A=anKey(a),B=anKey(b); if(!A||!B) return 0; if(A===B) return 1;
  const ta=new Set(A.split(' ')),tb=new Set(B.split(' ')), inter=[...ta].filter(x=>tb.has(x)).length, jac=inter/new Set([...ta,...tb]).size;
  const lr=1-anLev(A,B)/Math.max(A.length,B.length); return Math.max(jac,lr); }
/* Ressemblance entre deux fiches : renvoie la raison la plus forte, ou null. */
function anDupWhy(a,b){
  const ma=new Set(a.emails.map(m=>m.toLowerCase())), mail=b.emails.find(m=>ma.has(m.toLowerCase()));
  if(mail) return {fort:true,txt:`même adresse mail (${mail})`};
  const s=anSim(a.nom,b.nom), sameVille=!a.ville||!b.ville||norm(a.ville)===norm(b.ville);
  if(s===1&&sameVille) return {fort:true,txt:'même nom'};
  const ta=anDig(a.tel), tb=anDig(b.tel); if(ta.length===9&&ta===tb) return {fort:false,txt:`même téléphone (${a.tel})`};
  if(s>=.82&&sameVille&&anKey(a.nom).length>=5) return {fort:false,txt:'nom très proche'};
  return null;
}
function anFindDup(c,list,skip){ let best=null;
  for(const p of list){ if(p===skip||p===c) continue; const r=anDupWhy(c,p); if(r&&(!best||r.fort&&!best.r.fort)){ best={p,r}; if(r.fort) break; } }
  return best; }
/* Ajoute à « t » ce que « s » apporte en plus (rien n'est effacé). */
function anMerge(t,s){
  t.emails=anMails([...t.emails,...s.emails]);
  ['tel','adresse','cp','ville','type'].forEach(k=>{ if(!String(t[k]||'').trim()&&String(s[k]||'').trim()) t[k]=s[k]; });
  const P=anPers(t); anPers(s).forEach(x=>{ const k=norm(x.nom), m=String(x.mail||'').toLowerCase();
    const y=P.find(z=>(k&&norm(z.nom)===k)||(m&&String(z.mail||'').toLowerCase()===m));
    if(y){ ['fonction','mail','tel'].forEach(f=>{ if(!y[f]&&x[f]) y[f]=x[f]; }); } else P.push({...x}); });
  if(s.notes&&!String(t.notes||'').includes(s.notes.trim())) t.notes=[t.notes,s.notes.trim()].filter(Boolean).join('\n');
  return t;
}
function wouldChange(t,s){ const c=JSON.parse(JSON.stringify(t)); anMerge(c,s); return JSON.stringify(c)!==JSON.stringify(t); }

/* ---------- Lecture des fichiers ---------- */
function anDecode(buf){ try{ return new TextDecoder('utf-8',{fatal:true}).decode(buf).replace(/^\uFEFF/,''); }catch(e){ return new TextDecoder('windows-1252').decode(buf); } }
function anCSV(text){
  const first=text.split(/\r?\n/,1)[0]||''; const cnt=c=>first.split(c).length;
  const d=[';',',','\t'].sort((a,b)=>cnt(b)-cnt(a))[0];
  const rows=[]; let row=[], f='', q=false;
  for(let i=0;i<text.length;i++){ const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; continue; }
    if(c==='"') q=true; else if(c===d){ row.push(f); f=''; } else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; } else f+=c; }
  if(f||row.length){ row.push(f); rows.push(row); }
  const h=(rows.shift()||[]).map(x=>x.trim());
  return rows.filter(r=>r.some(x=>String(x).trim())).map(r=>{ const o={}; h.forEach((k,i)=>{ if(k) o[k]=(o[k]?o[k]+' ':'')+String(r[i]??'').trim(); }); return o; });
}
async function anXLSX(buf){
  await needLib('jszip'); const zip=await JSZip.loadAsync(buf), X=s=>new DOMParser().parseFromString(s,'application/xml');
  const ssF=zip.file('xl/sharedStrings.xml'), ss=ssF?[...X(await ssF.async('string')).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const sh=zip.file(/xl\/worksheets\/sheet\d+\.xml$/).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))[0]; if(!sh) return [];
  const col=r=>{ let n=0; for(const ch of r.replace(/\d+/g,'')) n=n*26+ch.charCodeAt(0)-64; return n-1; };
  const grid=[...X(await sh.async('string')).getElementsByTagName('row')].map(rw=>{ const a=[]; [...rw.getElementsByTagName('c')].forEach(c=>{ const t=c.getAttribute('t'), v=c.getElementsByTagName('v')[0], is=c.getElementsByTagName('is')[0];
    a[col(c.getAttribute('r')||'A')]=t==='s'?ss[+(v&&v.textContent)]||'':t==='inlineStr'?(is?is.textContent:''):(v?v.textContent:''); }); return a; });
  const h=(grid.shift()||[]).map(x=>String(x||'').trim());
  return grid.filter(r=>r.some(x=>String(x??'').trim())).map(r=>{ const o={}; h.forEach((k,i)=>{ if(k) o[k]=String(r[i]??'').trim(); }); return o; });
}
function anVCF(text){
  const qp=s=>{ try{ return decodeURIComponent(s.replace(/=\r?\n/g,'').replace(/%/g,'%25').replace(/=([0-9A-F]{2})/gi,'%$1')); }catch(e){ return s; } };
  const un=s=>s.replace(/\\n/gi,'\n').replace(/\\([,;\\])/g,'$1');
  const lines=text.replace(/\r\n/g,'\n').replace(/=\n/g,'=\u0000').replace(/\n[ \t]/g,'').replace(/=\u0000/g,'=\n').split('\n');
  const out=[]; let c=null;
  for(const L of lines){ const i=L.indexOf(':'); if(i<0) continue; const head=L.slice(0,i), val0=L.slice(i+1), parts=head.split(';'), key=parts[0].replace(/^item\d+\./i,'').toUpperCase(), params=parts.slice(1).join(';').toUpperCase();
    const val=/QUOTED-PRINTABLE/.test(params)?qp(val0):val0;
    if(key==='BEGIN'){ c={emails:[],tels:[]}; continue; } if(!c) continue;
    if(key==='END'){ out.push(c); c=null; continue; }
    if(key==='FN') c.fn=un(val); else if(key==='N'){ const n=val.split(';').map(un); c.nom=n[0]; c.prenom=n[1]; }
    else if(key==='ORG') c.org=un(val.split(';')[0]); else if(key==='TITLE') c.fonction=un(val);
    else if(key==='EMAIL') c.emails.push(val.trim()); else if(key==='TEL'){ if(!/FAX/.test(params)) c.tels.push({v:val.trim(),home:/HOME/.test(params),cell:/CELL/.test(params)}); }
    else if(key==='ADR'&&!/HOME/.test(params)&&!c.adr){ const a=val.split(';').map(un); c.adr={rue:a[2],ville:a[3],cp:a[5]}; }
    else if(key==='NOTE') c.notes=un(val); else if(key==='CATEGORIES') c.cat=un(val).split(',')[0]; }
  return out.map(v=>{ const tel=(v.tels.find(t=>!t.home&&!t.cell)||v.tels.find(t=>!t.home)||{}).v||'';
    const person=v.fn||[v.prenom,v.nom].filter(Boolean).join(' ');
    return anFiche({org:v.org,person:v.org?person:'',nom:v.org||person,fonction:v.fonction,emails:v.emails,tel,adresse:v.adr&&v.adr.rue,cp:v.adr&&v.adr.cp,ville:v.adr&&v.adr.ville,type:v.cat,notes:v.notes}); });
}
/* Lignes de tableur (Outlook, Gmail, Thunderbird, Excel, export Librejo) → fiches */
function rowsToFiches(rows){
  if(!rows.length) return [];
  const H=Object.keys(rows[0]).map(k=>({k,n:norm(k).replace(/[^a-z0-9]+/g,' ').trim()}));
  const pick=(...tests)=>{ for(const t of tests){ const h=H.find(x=>t(x.n)); if(h) return h.k; } return null; };
  const has=(n,...w)=>w.some(x=>n.includes(x)), notHome=n=>!has(n,'domicile','home','perso','autre adresse','other','fax','pager');
  const prenomK=pick(n=>n==='prenom'||n==='first name'||n==='given name');
  const lastK=prenomK?pick(n=>n==='nom'||n==='last name'||n==='family name'||n==='nom de famille'):null;
  const fullK=pick(n=>n==='name'||n==='nom complet'||n==='display name'||n==='nom affiche'||n==='full name'||n==='nom a afficher');
  const orgK=pick(n=>['societe','company','organization name','organization 1 name','organisation','entreprise','structure','etablissement','partenaire'].includes(n), n=>!prenomK&&n==='nom');
  const fonctionK=pick(n=>['fonction','job title','organization title','organization 1 title','poste'].includes(n));
  const mailKs=H.filter(x=>has(x.n,'mail','messagerie','courriel')&&!has(x.n,'type','nom complet','display','affich')).map(x=>x.k);
  const telKs=H.filter(x=>has(x.n,'tel','phone','portable','mobile')&&notHome(x.n)&&!has(x.n,'type','label'))
    .sort((a,b)=>(has(a.n,'mobile','portable','cell')?1:0)-(has(b.n,'mobile','portable','cell')?1:0)).map(x=>x.k);
  const adrK=pick(n=>has(n,'rue','street','adresse postale')&&notHome(n)&&!has(n,' 2',' 3'), n=>n==='adresse'||n==='address');
  const cpK=pick(n=>has(n,'code postal','postal code','zip')&&notHome(n), n=>n==='cp');
  const villeK=pick(n=>(n==='ville'||n==='city'||has(n,'ville (bureau','ville bureau','business city','address 1 city','work city'))&&notHome(n), n=>has(n,'ville','city')&&notHome(n));
  const typeK=pick(n=>n==='type'||n==='type de structure', n=>n==='categories'||n==='labels'||n==='group membership');
  const notesK=pick(n=>n==='notes'||n==='remarques'||n==='commentaires');
  const contactsK=pick(n=>n==='contacts');
  return rows.map(r=>{ const g=k=>k?String(r[k]||'').trim():'';
    const person=[g(prenomK),g(lastK)].filter(Boolean).join(' ')||(orgK?g(fullK):'');
    const org=g(orgK), nom=org||person||g(fullK);
    let type=g(typeK).replace(/\*\s*mycontacts/ig,'').split(/:::|;|,/).map(s=>s.trim()).filter(Boolean)[0]||'';
    const emails=anMails(mailKs.flatMap(k=>g(k).split(/[\s,;]+/)));
    const tel=telKs.map(g).find(Boolean)||'';
    const f=anFiche({org,person:org?person:'',nom,fonction:g(fonctionK),emails,tel,adresse:g(adrK),cp:g(cpK),ville:g(villeK),type,notes:g(notesK)});
    if(contactsK) g(contactsK).split('|').map(s=>s.split('/').map(x=>x.trim())).forEach(([n,fo,m,t])=>{ if(n||m) anPers(f).push({nom:n||'',fonction:fo||'',mail:MAIL.test(m||'')?m:'',tel:t||''}); });
    return f; }).filter(f=>f.nom||f.emails.length);
}
function anFiche({org,person,nom,fonction,emails,tel,adresse,cp,ville,type,notes}){
  const f={id:'p'+rid(),nom:String(nom||'').trim()||String((emails||[])[0]||'').trim(),type:String(type||'').trim(),emails:anMails(emails||[]),tel:String(tel||'').trim(),adresse:String(adresse||'').trim(),cp:String(cp||'').trim(),ville:String(ville||'').trim(),notes:String(notes||'').trim(),personnes:[],source:'import'};
  if(org&&person&&anKey(person)!==anKey(org)) f.personnes.push({nom:person,fonction:String(fonction||'').trim(),mail:(emails||[])[0]||'',tel:String(tel||'').trim()});
  return f;
}
/* Plusieurs contacts d'une même structure → une seule fiche */
function groupFiches(list){ const by=new Map(), out=[];
  list.forEach(f=>{ const k=anKey(f.nom)+'|'+norm(f.ville), t=by.get(k); if(t) anMerge(t,f); else { by.set(k,f); out.push(f); } });
  return out; }
async function readContactsFile(file){
  const buf=await file.arrayBuffer(), name=file.name.toLowerCase();
  if(/\.xlsx$/.test(name)) return groupFiches(rowsToFiches(await anXLSX(buf)));
  if(/\.xls$/.test(name)) throw new Error('Ancien format Excel (.xls) : enregistrez le fichier en .xlsx ou en CSV, puis réessayez.');
  const text=anDecode(buf);
  if(/\.vcf$|\.vcard$/.test(name)||/^\s*BEGIN:VCARD/i.test(text)) return groupFiches(anVCF(text));
  return groupFiches(rowsToFiches(anCSV(text)));
}
const PERSO_DOM=/@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|orange|wanadoo|free|sfr|neuf|laposte|bbox|aol|gmx|proton|protonmail)\./i;

/* ---------- Export ---------- */
function anCell(v){ v=String(v??''); return /[";\n,]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
function exportAnnu(kind,list){
  const d=today(), base=`Annuaire-${fileSafe(structure.nom||'Librejo')}_${d}`;
  if(kind==='xls'){
    const H=['Nom','Type','Mails','Téléphone','Adresse','Code postal','Ville','Contacts','Notes'];
    const L=list.map(p=>[p.nom,p.type,p.emails.join(' ; '),p.tel,p.adresse,p.cp,p.ville,anPers(p).map(x=>[x.nom,x.fonction,x.mail,x.tel].join(' / ')).join(' | '),p.notes].map(anCell).join(';'));
    downloadBlob(new Blob(['\uFEFF'+[H.join(';'),...L].join('\r\n')],{type:'text/csv;charset=utf-8'}),base+'.csv'); return; }
  if(kind==='outlook'){
    const H=['First Name','Last Name','Company','Job Title','E-mail Address','E-mail 2 Address','E-mail 3 Address','Business Phone','Business Street','Business City','Business Postal Code','Categories','Notes'];
    const L=[]; list.forEach(p=>{ const P=anPers(p), rest=p.emails.filter(m=>!P.some(x=>String(x.mail).toLowerCase()===m.toLowerCase()));
      if(rest.length||!P.length) L.push(['', p.nom, p.nom, '', rest[0]||'', rest[1]||'', rest[2]||'', p.tel, p.adresse, p.ville, p.cp, p.type, p.notes]);
      P.forEach(x=>{ const w=String(x.nom).split(' '); L.push([w.length>1?w.slice(0,-1).join(' '):'', w.slice(-1)[0]||'', p.nom, x.fonction, x.mail, '', '', x.tel||p.tel, p.adresse, p.ville, p.cp, p.type, '']); }); });
    downloadBlob(new Blob(['\uFEFF'+[H,...L].map(r=>r.map(anCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),base+'_carnet-adresses.csv'); return; }
  const e=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/([,;])/g,'\\$1');
  const card=(fn,org,title,mails,tel,p)=>['BEGIN:VCARD','VERSION:3.0',`FN:${e(fn)}`,`N:${e(fn)};;;;`,`ORG:${e(org)}`,title?`TITLE:${e(title)}`:'',...mails.map(m=>`EMAIL;TYPE=INTERNET,WORK:${m}`),tel?`TEL;TYPE=WORK:${e(tel)}`:'',
    (p.adresse||p.ville)?`ADR;TYPE=WORK:;;${e(p.adresse)};${e(p.ville)};;${e(p.cp)};`:'',p.type?`CATEGORIES:${e(p.type)}`:'','END:VCARD'].filter(Boolean).join('\r\n');
  const C=[]; list.forEach(p=>{ const pm=new Set(anPers(p).map(x=>String(x.mail||'').toLowerCase())); C.push(card(p.nom,p.nom,'',p.emails.filter(m=>!pm.has(m.toLowerCase())),p.tel,p)); anPers(p).forEach(x=>C.push(card(x.nom,p.nom,x.fonction,x.mail?[x.mail]:[],x.tel,p))); });
  downloadBlob(new Blob([C.join('\r\n')+'\r\n'],{type:'text/vcard'}),base+'.vcf');
}

/* ---------- Doublons dans l'annuaire ---------- */
const anPair=(a,b)=>[a.id,b.id].sort().join('~');
function annuDups(){
  const ign=new Set(ANNU.nonDoublons||[]), L=ANNU.partenaires, out=[], seen=new Set();
  const idx=new Map(); const put=(k,p)=>{ if(!k) return; if(!idx.has(k)) idx.set(k,[]); idx.get(k).push(p); };
  L.forEach(p=>{ p.emails.forEach(m=>put('m:'+m.toLowerCase(),p)); const d=anDig(p.tel); if(d.length===9) put('t:'+d,p); const n=anKey(p.nom); put('n:'+n.slice(0,4),p); });
  idx.forEach(g=>{ for(let i=0;i<g.length;i++) for(let j=i+1;j<g.length;j++){ const a=g[i],b=g[j]; if(a===b) continue; const k=anPair(a,b); if(seen.has(k)||ign.has(k)) continue; seen.add(k); const r=anDupWhy(a,b); if(r) out.push({a,b,r}); } });
  return out.sort((x,y)=>(y.r.fort?1:0)-(x.r.fort?1:0));
}
function showDups(){
  const D=annuDups();
  if(!D.length){ toast('Aucun doublon trouvé'); renderAnnu(); return; }
  const card=p=>`<div class="dp-card"><b>${esc(p.nom)}</b><small>${esc(p.type||'sans type')}${p.ville?' · '+esc(p.ville):''}</small>${p.emails.slice(0,3).map(m=>`<span>${esc(m)}</span>`).join('')}${p.tel?`<span>${esc(p.tel)}</span>`:''}${anPers(p).length?`<span>${anPers(p).length} contact${anPers(p).length>1?'s':''}</span>`:''}</div>`;
  openModal(`<h3 id="modal-title">Doublons possibles (${D.length})</h3>
    <p class="hint">Fusionner garde le nom de gauche et y ajoute ce que la fiche de droite contient en plus : rien n’est perdu.</p>
    <div class="dp-list" id="dp-list">${D.slice(0,60).map((d,i)=>`<div class="dp-row" data-i="${i}"><div class="dp-why ${d.r.fort?'fort':''}">${esc(d.r.txt)}</div>
      <div class="dp-pair">${card(d.a)}<button class="iconbtn" data-dswap title="Inverser" aria-label="Inverser">⇄</button>${card(d.b)}</div>
      <div class="row end"><button class="ghost" data-dno>Ce ne sont pas des doublons</button><button class="primary sm" data-dmerge>Fusionner</button></div></div>`).join('')}</div>
    <div class="btns"><button class="secondary" data-close>Fermer</button></div>`,'wide');
  $('#dp-list').onclick=async e=>{ const row=e.target.closest('.dp-row'); if(!row) return; const d=D[+row.dataset.i];
    if(e.target.closest('[data-dswap]')){ [d.a,d.b]=[d.b,d.a]; const c=row.querySelectorAll('.dp-card'); c[0].outerHTML=card(d.a); row.querySelectorAll('.dp-card')[1].outerHTML=card(d.b); return; }
    if(e.target.closest('[data-dno]')){ ANNU.nonDoublons=[...(ANNU.nonDoublons||[]),anPair(d.a,d.b)]; if(await run(saveAnnu)) { row.remove(); toast('Noté : ces deux fiches restent séparées'); } return; }
    if(e.target.closest('[data-dmerge]')){ const keep=JSON.parse(JSON.stringify(d.a)), old=ANNU.partenaires; anMerge(d.a,d.b); ANNU.partenaires=old.filter(x=>x!==d.b);
      if(await run(saveAnnu,'Fiches fusionnées')){ closeModal(); showDups(); } else { Object.assign(d.a,keep); ANNU.partenaires=old; } } };
}

/* ---------- Import ---------- */
function importAnnu(){
  let F=[], file='';
  const help=`<details class="im-help"><summary>Comment récupérer ses contacts ?</summary>
    <ul><li><b>Outlook (classique)</b> : Fichier › Ouvrir et exporter › Importer/Exporter › Exporter vers un fichier › Valeurs séparées par une virgule › dossier Contacts.</li>
    <li><b>Nouvel Outlook ou Outlook sur le web</b> : Contacts › Gérer les contacts › Exporter les contacts (fichier .csv).</li>
    <li><b>Gmail</b> : contacts.google.com › Exporter › CSV Google, CSV Outlook ou vCard.</li>
    <li><b>Thunderbird</b> : Carnet d’adresses › Outils › Exporter (CSV ou vCard).</li>
    <li><b>Un tableau Excel</b> : une ligne par structure, avec en en-tête Nom, Type, Mails, Téléphone, Adresse, Code postal, Ville. Le bouton Exporter › Tableur donne un modèle.</li></ul></details>`;
  const draw=()=>{
    if(!F.length){ $('#im-body').innerHTML=`<label class="dropzone" id="im-drop">${ICON.up}<b>Déposez le fichier de contacts ici</b><span>ou cliquez pour le choisir : .csv, .vcf ou .xlsx</span><input type="file" id="im-file" accept=".csv,.txt,.vcf,.vcard,.xlsx,.xls" hidden></label>${help}`;
      const dz=$('#im-drop'), fi=$('#im-file'); fi.onchange=()=>fi.files[0]&&load(fi.files[0]);
      dz.ondragover=e=>{ e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave=()=>dz.classList.remove('over');
      dz.ondrop=e=>{ e.preventDefault(); dz.classList.remove('over'); const f=e.dataTransfer.files[0]; f&&load(f); }; $('#im-ok').hidden=true; return; }
    const nNew=F.filter(f=>f.on&&!f.dup).length, nUp=F.filter(f=>f.on&&f.dup&&f.chg).length;
    $('#im-body').innerHTML=`<p class="hint m-0"><b>${esc(file)}</b> : ${F.length} fiche${F.length>1?'s':''} lue${F.length>1?'s':''}. Décochez ce qui ne doit pas entrer dans l’annuaire.</p>
      <div class="im-tools"><label class="field"><span>Type pour les nouvelles fiches sans type</span><input class="in" id="im-type" list="im-types" value="${esc(F.deftype||'')}" placeholder="ex. Partenaire, Santé, Hébergement…"><datalist id="im-types">${annuTypes().map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label>
        <div class="row"><button class="ghost sm" data-imall="1">Tout cocher</button><button class="ghost sm" data-imall="0">Tout décocher</button></div></div>
      <div class="im-list">${F.map((f,i)=>`<label class="im-row ${f.on?'':'off'}"><input type="checkbox" data-imi="${i}" ${f.on?'checked':''}>
        <span class="im-main"><b>${esc(f.nom)}</b><small>${esc([f.type,f.ville].filter(Boolean).join(' · '))}${anPers(f).length?` · ${anPers(f).map(x=>esc(x.nom)).slice(0,3).join(', ')}${anPers(f).length>3?'…':''}`:''}</small></span>
        <span class="im-mail">${esc(f.emails.slice(0,2).join(', '))}${f.emails.length>2?` +${f.emails.length-2}`:''}${!f.emails.length&&f.tel?esc(f.tel):''}</span>
        <span class="im-st ${f.dup?(f.chg?'up':'same'):f.perso?'warn':'new'}">${f.dup?(f.chg?`Complète « ${esc(f.dup.p.nom)} »`:`Déjà dans l’annuaire`):f.perso?'Adresse personnelle ?':'Nouvelle fiche'}</span></label>`).join('')}</div>`;
    $('#im-ok').hidden=false; $('#im-ok').disabled=!(nNew+nUp);
    $('#im-ok').textContent=nNew+nUp?`Importer : ${[nNew?`${nNew} nouvelle${nNew>1?'s':''}`:'',nUp?`${nUp} complétée${nUp>1?'s':''}`:''].filter(Boolean).join(', ')}`:'Rien à importer';
  };
  const load=async f=>{ try{ const list=await readContactsFile(f); file=f.name;
      if(!list.length){ toast('Aucun contact trouvé dans ce fichier.'); return; }
      F=list.map(x=>{ const d=anFindDup(x,ANNU.partenaires); const fort=d&&d.r.fort; const chg=fort&&wouldChange(d.p,x);
        const perso=!anPers(x).length&&x.emails.length&&x.emails.every(m=>PERSO_DOM.test(m));
        return Object.assign(x,{dup:fort?d:null,chg,proche:!fort&&d?d:null,perso,on:fort?chg:!perso&&!!(x.emails.length||x.tel)}); });
      draw(); }catch(e){ toast(e.message||'Fichier illisible.'); } };
  openModal(`<h3 id="modal-title">Importer des contacts</h3>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>L’annuaire est partagé par toute l’équipe : seulement des structures et des contacts professionnels. Jamais d’usagers ni de contacts personnels.</span></div>
    <div id="im-wrap"><div id="im-body"></div>
    <div class="ad-foot"><button class="ghost" data-close>Annuler</button><button class="primary" id="im-ok" hidden>Importer</button></div></div>`,'wide');
  draw();
  const W=$('#im-wrap');
  W.addEventListener('change',e=>{ const i=e.target.dataset.imi; if(i!=null){ F[+i].on=e.target.checked; draw(); } if(e.target.id==='im-type') F.deftype=e.target.value.trim(); });
  W.addEventListener('input',e=>{ if(e.target.id==='im-type') F.deftype=e.target.value.trim(); });
  W.addEventListener('click',e=>{ const a=e.target.closest('[data-imall]'); if(a){ e.preventDefault(); F.forEach(f=>{ f.on=a.dataset.imall==='1'&&(!f.dup||f.chg); }); draw(); } });
  $('#im-ok').onclick=async()=>{
    const snap=JSON.stringify(ANNU.partenaires), deft=F.deftype||'Partenaire'; let n=0,u=0;
    F.filter(f=>f.on).forEach(f=>{ const {dup,chg,proche,perso,on,...x}=f; if(dup){ anMerge(dup.p,x); u++; } else { x.type=x.type||deft; x.source='import '+today(); ANNU.partenaires.push(x); n++; } });
    if(await run(saveAnnu,`${n} fiche${n>1?'s':''} ajoutée${n>1?'s':''}${u?`, ${u} complétée${u>1?'s':''}`:''}`)){ closeModal(); renderAnnu(); }
    else ANNU.partenaires=JSON.parse(snap);
  };
}

/* ---------- Page ---------- */
function annuMatch(x,words){ const hay=norm([x.nom,x.type,x.emails.join(' '),x.adresse,x.ville,x.cp,x.notes,anPers(x).map(p=>p.nom+' '+p.fonction+' '+p.mail).join(' ')].join(' ')), tel=anDig(x.tel)+' '+anPers(x).map(p=>anDig(p.tel)).join(' ');
  return words.every(w=>hay.includes(w)||(/^\d{3,}$/.test(w)&&tel.includes(w.replace(/^0/,'')))); }
function renderAnnu(){
  const p=$('#p-annu'); if(!p) return;
  const words=norm(aq.trim()).split(/\s+/).filter(Boolean);
  let list=ANNU.partenaires.filter(x=>(!atype||x.type===atype)&&(!aOnlyMail||x.emails.length)&&(!words.length||annuMatch(x,words)));
  list.sort((a,b)=>a.nom.localeCompare(b.nom,'fr'));
  const mails=[...new Set(list.flatMap(x=>x.emails))], shown=list.slice(0,300), nd=isAdmin?annuDups().length:0;
  const who=(x,m)=>{ const c=anPers(x).find(y=>String(y.mail).toLowerCase()===m.toLowerCase()); return c?` <small>${esc(c.nom)}</small>`:''; };
  p.innerHTML=`<div class="listhead"><h2 class="sec">Annuaire</h2>
      <div class="row">${!isAdmin?`<button class="secondary" data-an="import" title="Demande le mot de passe admin">${ICON.up}Importer des contacts</button>`:''}${isAdmin?`<button class="primary" data-an="new">${ICON.plus}Ajouter</button><button class="secondary" data-an="import">${ICON.up}Importer</button>${nd?`<button class="secondary warnbtn" data-an="dups">Doublons (${nd})</button>`:''}`:''}
      <details class="ab-more an-exp"><summary class="secondary">${ICON.dl}Exporter</summary><div class="ab-menu">
        <button data-ex="xls"><b>Tableur (Excel)</b><small>pour le relire ou le corriger</small></button>
        <button data-ex="outlook"><b>Carnet d’adresses</b><small>à importer dans Outlook ou Gmail</small></button>
        <button data-ex="vcf"><b>vCard (.vcf)</b><small>téléphone, Thunderbird, Apple</small></button>
        <p class="hint">${list.length===ANNU.partenaires.length?'Tout l’annuaire':`Les ${list.length} fiches affichées`}.</p></div></details></div></div>
    <p class="hint">Structures partenaires et leurs contacts, utilisés pour préparer les mails et remplir les courriers. ${ANNU.partenaires.length} fiches${ANNU.maj?' · mis à jour le '+esc(frDate(ANNU.maj))+(String(ANNU.maj).length>10?' à '+esc(String(ANNU.maj).slice(11,16).replace(':',' h ')):''):''}.${isAdmin?'':' Une erreur ou un contact manquant ? Signalez-le à un admin.'}</p>
    <div class="annu-tools">
      <div class="bigsearch">${ICON.search}<input class="in" id="an-q" type="search" placeholder="Chercher : nom, contact, ville, mail, téléphone…" value="${esc(aq)}" autocomplete="off" aria-label="Chercher dans l'annuaire"></div>
      <select class="in" id="an-type" aria-label="Type de partenaire"><option value="">Tous les types</option>${annuTypes().map(t=>`<option value="${esc(t)}" ${t===atype?'selected':''}>${esc(t)} (${ANNU.partenaires.filter(x=>x.type===t).length})</option>`).join('')}</select>
      <label class="check nowrap"><input type="checkbox" id="an-mail" ${aOnlyMail?'checked':''}> Avec un mail</label>
    </div>
    ${(atype||words.length)&&mails.length?`<div class="annu-bar"><span><b>${list.length}</b> fiche${list.length>1?'s':''} · <b>${mails.length}</b> adresse${mails.length>1?'s':''} mail</span>
      <button class="primary" data-an="mailall">${ICON.mail}Écrire à tous</button><button class="secondary" data-an="copyall">${ICON_COPY}Copier les adresses</button>
      ${isAdmin&&atype?`<button class="ghost" data-an="renametype">Renommer ce type</button>`:''}</div>`:''}
    <div class="tablebox">${shown.length?`<table class="docs annu"><thead><tr><th scope="col">Structure</th><th scope="col">Mail</th><th scope="col">Téléphone</th><th scope="col">Adresse</th>${isAdmin?'<th scope="col"><span class="sr">Modifier</span></th>':''}</tr></thead><tbody>
      ${shown.map(x=>`<tr><td class="t"><b>${esc(x.nom)}</b><small>${esc(x.type)}</small>${anPers(x).length?`<div class="an-pers">${anPers(x).map(c=>`<span>${esc(c.nom)}${c.fonction?` <i>${esc(c.fonction)}</i>`:''}</span>`).join('')}</div>`:''}${x.notes?`<div class="an-note">${esc(x.notes)}</div>`:''}</td>
        <td>${x.emails.length?x.emails.map(m=>`<div class="mailline"><button class="linkbtn" data-write="${esc(m)}" title="Préparer un mail">${esc(m)}</button>${who(x,m)}<button class="iconbtn small" data-copy="${esc(m)}" title="Copier l'adresse" aria-label="Copier ${esc(m)}">${ICON_COPY}</button></div>`).join(''):''}</td>
        <td class="tel">${esc(x.tel||'')}${anPers(x).filter(c=>c.tel&&c.tel!==x.tel).map(c=>`<div><small>${esc(c.nom)} :</small> ${esc(c.tel)}</div>`).join('')}</td><td>${esc(partAddr(x))}</td>
        ${isAdmin?`<td><button class="iconbtn" data-pedit="${esc(x.id)}" title="Modifier" aria-label="Modifier ${esc(x.nom)}">${ICON.pen}</button></td>`:''}</tr>`).join('')}
      </tbody></table>${list.length>shown.length?`<p class="hint pad">${list.length-shown.length} autres : précisez la recherche.</p>`:''}`
      :`<div class="empty">${ANNU.partenaires.length?'Aucune fiche ne correspond.':isAdmin?'L’annuaire est vide : ajoutez une fiche, ou importez vos contacts depuis Outlook, Gmail ou un tableau Excel.':'L’annuaire est vide pour l’instant.'}</div>`}</div>`;
  const qi=$('#an-q'); qi.oninput=()=>{ aq=qi.value; const pos=qi.selectionStart; renderAnnu(); const n=$('#an-q'); n.focus(); try{ n.setSelectionRange(pos,pos); }catch(_){} };
  $('#an-type').onchange=e=>{ atype=e.target.value; renderAnnu(); };
  $('#an-mail').onchange=e=>{ aOnlyMail=e.target.checked; renderAnnu(); };
  p.onclick=async e=>{
    const w=e.target.closest('[data-write]'); if(w){ mailCompose({to:[w.dataset.write],subject:'',body:'Bonjour,\n\n\n\nCordialement,\n'+structure.signataire,files:[]}); return; }
    const c=e.target.closest('[data-copy]'); if(c){ toast(await copyText(c.dataset.copy)?'Adresse copiée':'Copie impossible'); return; }
    const ed=e.target.closest('[data-pedit]'); if(ed){ editPartner(ANNU.partenaires.find(x=>x.id===ed.dataset.pedit)); return; }
    const ex=e.target.closest('[data-ex]'); if(ex){ e.target.closest('details').open=false; exportAnnu(ex.dataset.ex,list); return; }
    const a=e.target.closest('[data-an]'); if(!a) return;
    if(a.dataset.an==='new') return editPartner(null);
    if(a.dataset.an==='import'){ if(!isAdmin){ toast('Importer des contacts se fait en mode admin : entrez le mot de passe.'); $('#adminbtn').click(); return; } return importAnnu(); }
    if(a.dataset.an==='dups') return showDups();
    if(a.dataset.an==='mailall') return mailCompose({to:mails,subject:'',body:'Bonjour,\n\n\n\nCordialement,\n'+structure.signataire,files:[]});
    if(a.dataset.an==='copyall'){ toast(await copyText(mails.join('; '))?`${mails.length} adresses copiées`:'Copie impossible'); return; }
    if(a.dataset.an==='renametype') askText('Renommer le type','Nouveau nom',atype,async nom=>{ const old=atype; ANNU.partenaires.forEach(x=>{ if(x.type===old) x.type=nom; }); ANNU.types=ANNU.types.filter(t=>t!==old);
      if(await run(saveAnnu,'Type renommé')) atype=nom; else ANNU.partenaires.forEach(x=>{ if(x.type===nom) x.type=old; }); renderAnnu(); });
  };
}
function editPartner(x){
  const n=x?JSON.parse(JSON.stringify(x)):{id:'p'+rid(),nom:'',type:atype||'',emails:[],tel:'',adresse:'',cp:'',ville:'',notes:'',personnes:[],source:'Librejo'};
  const P=anPers(n), pm=new Set(P.map(c=>String(c.mail||'').toLowerCase()).filter(Boolean));
  const gen=n.emails.filter(m=>!pm.has(m.toLowerCase()));
  const prow=(c,i)=>`<div class="pp-row" data-pi="${i}"><input class="in" data-pk="nom" value="${esc(c.nom||'')}" placeholder="Nom" aria-label="Nom du contact"><input class="in" data-pk="fonction" value="${esc(c.fonction||'')}" placeholder="Fonction" aria-label="Fonction">
    <input class="in" data-pk="mail" value="${esc(c.mail||'')}" placeholder="Mail" spellcheck="false" aria-label="Mail du contact"><input class="in" data-pk="tel" value="${esc(c.tel||'')}" placeholder="Téléphone" aria-label="Téléphone du contact"><button type="button" class="iconbtn" data-pdel title="Retirer ce contact" aria-label="Retirer ce contact">×</button></div>`;
  openModal(`<h3 id="modal-title">${x?'Modifier la fiche':'Nouvelle fiche'}</h3><div id="pa-wrap">
    <div id="pa-dup" class="pa-dup" hidden></div>
    <div class="fieldgrid">
      <label class="field wide"><span>Nom de la structure</span><input class="in" id="pa-nom" value="${esc(n.nom)}" data-autofocus></label>
      <label class="field"><span>Type <small>(ex. CSAPA, CHRS, MDPH…)</small></span><input class="in" id="pa-type" list="pa-types" value="${esc(n.type)}" autocomplete="off"><datalist id="pa-types">${annuTypes().map(t=>`<option value="${esc(t)}">`).join('')}</datalist></label>
      <label class="field"><span>Téléphone (standard)</span><input class="in" id="pa-tel" value="${esc(n.tel)}"></label>
      <label class="field wide"><span>Mails de la structure <small>(une par ligne : accueil, secrétariat…)</small></span><textarea class="in" id="pa-mails" rows="2" spellcheck="false">${esc(gen.join('\n'))}</textarea></label>
      <div class="field wide"><span>Contacts <small>(facultatif : les personnes à qui vous écrivez)</small></span><div id="pa-pers">${P.map(prow).join('')}</div><button type="button" class="ghost sm" id="pa-padd">${ICON.plus}Ajouter un contact</button></div>
      <label class="field wide"><span>Adresse</span><input class="in" id="pa-adr" value="${esc(n.adresse)}"></label>
      <label class="field"><span>Code postal</span><input class="in" id="pa-cp" value="${esc(n.cp)}"></label>
      <label class="field"><span>Ville</span><input class="in" id="pa-ville" value="${esc(n.ville)}"></label>
      <label class="field wide"><span>Notes <small>(facultatif : horaires, conditions d’accueil… jamais de nom d’usager)</small></span><textarea class="in" id="pa-notes" rows="2">${esc(n.notes||'')}</textarea></label>
    </div>
    <div class="row between"><div class="row"><button class="primary" id="pa-ok">Enregistrer</button><button class="secondary" data-close>Annuler</button></div>${x?`<button class="ghost danger" id="pa-del">${ICON.trash}Supprimer</button>`:''}</div></div>`,'wide');
  const box=$('#pa-wrap');
  const readPers=()=>[...box.querySelectorAll('.pp-row')].map(r=>{ const g=k=>r.querySelector(`[data-pk=${k}]`).value.trim(); return {nom:g('nom'),fonction:g('fonction'),mail:g('mail'),tel:g('tel')}; }).filter(c=>c.nom||c.mail||c.tel);
  const readForm=()=>({nom:$('#pa-nom').value.trim(),type:$('#pa-type').value.trim(),tel:$('#pa-tel').value.trim(),adresse:$('#pa-adr').value.trim(),cp:$('#pa-cp').value.trim(),ville:$('#pa-ville').value.trim(),notes:$('#pa-notes').value.trim(),
    personnes:readPers(), gen:$('#pa-mails').value.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean)});
  let dupT=0;
  const checkDup=()=>{ clearTimeout(dupT); dupT=setTimeout(()=>{ if(!document.getElementById('pa-nom')) return; const f=readForm(), c={...f,emails:anMails([...f.gen,...f.personnes.map(p=>p.mail)])}; const d=c.nom||c.emails.length?anFindDup(c,ANNU.partenaires,x):null; const el=$('#pa-dup'); if(!el) return;
    el.hidden=!d; if(d) el.innerHTML=`<span>Ressemble à <b>${esc(d.p.nom)}</b> (${esc(d.r.txt)}), déjà dans l’annuaire.</span><button type="button" class="secondary sm" data-open="${esc(d.p.id)}">Ouvrir cette fiche</button>`; },300); };
  box.addEventListener('input',checkDup);
  box.addEventListener('click',e=>{ if(e.target.closest('#pa-padd')){ const w=$('#pa-pers'); w.insertAdjacentHTML('beforeend',prow({},w.children.length)); w.lastElementChild.querySelector('input').focus(); return; }
    const d=e.target.closest('[data-pdel]'); if(d){ d.closest('.pp-row').remove(); checkDup(); return; }
    const o=e.target.closest('[data-open]'); if(o){ const t=ANNU.partenaires.find(y=>y.id===o.dataset.open); closeModal(); setTimeout(()=>editPartner(t),50); } });
  if(!x) checkDup();
  $('#pa-ok').onclick=async()=>{
    const f=readForm(); if(!f.nom){ toast('Le nom de la structure est obligatoire.'); return; }
    const all=[...f.gen,...f.personnes.map(c=>c.mail).filter(Boolean)], bad=all.filter(m=>!MAIL.test(m)); if(bad.length){ toast('Adresse incorrecte : '+bad[0]); return; }
    const before=x?JSON.parse(JSON.stringify(x)):null, t=x||n;
    Object.assign(t,{nom:f.nom,type:f.type||'Partenaire',tel:f.tel,adresse:f.adresse,cp:f.cp,ville:f.ville,notes:f.notes,personnes:f.personnes,emails:anMails(all)});
    if(!x) ANNU.partenaires.push(t);
    if(await run(saveAnnu,'Fiche enregistrée')){ closeModal(); renderAnnu(); }
    else{ if(x) Object.keys(x).forEach(k=>delete x[k]), Object.assign(x,before); else ANNU.partenaires.pop(); }
  };
  if(x) $('#pa-del').onclick=()=>askConfirm('Supprimer cette fiche ?',`« ${esc(x.nom)} » sera retirée de l'annuaire de Librejo.`,'Supprimer',async()=>{
    const keep=ANNU.partenaires; ANNU.partenaires=keep.filter(y=>y!==x); if(!await run(saveAnnu,'Fiche supprimée')) ANNU.partenaires=keep; renderAnnu(); });
}

/* ======================================================================
   8. PRÉPARATION SEMAINE : listes de documents à imprimer avec quantités
   Quantités par défaut fixées par l'admin ; chacun peut les ajuster sur son poste.
   ====================================================================== */
DATA.semaine=DATA.semaine||{listes:[]};
DATA.semaine.listes=DATA.semaine.listes||[];
if(!DATA.semaine.listes.length) DATA.semaine.listes.push({id:'s-semaine',titre:'Semaine',items:[]});
const SEM_KEY='docubus-semaine';
let semAdj={}; try{ semAdj=JSON.parse(localStorage.getItem(SEM_KEY)||'{}')||{}; }catch(e){ semAdj={}; }
const saveAdj=()=>{ try{ localStorage.setItem(SEM_KEY,JSON.stringify(semAdj)); }catch(e){} };
const qteOf=(l,it)=>{ const a=semAdj[l.id]; return a&&a[it.doc]!=null?a[it.doc]:(+it.qte||0); };
const semDocs=l=>l.items.map(it=>({it,d:docById(it.doc)})).filter(x=>x.d);
const PRINTABLE_MERGE=['pdf','png','jpg','jpeg'];
/* Impression rapide : une seule liste de documents choisis par l'admin.
   L'équipe indique le nombre d'exemplaires de chacun, puis un clic sur « Imprimer ».
   Les quantités ne sont pas enregistrées (elles repartent de 0 à l'ouverture). */
let qpQte={};
function quickList(){
  DATA.semaine=DATA.semaine||{listes:[]}; const Ls=DATA.semaine.listes;
  if(!Ls.length) Ls.push({id:'s'+rid(),titre:'Impression rapide',items:[]});
  // anciennes « Préparation semaine » à plusieurs listes : réunies en une seule
  if(Ls.length>1){ const l=Ls[0]; Ls.slice(1).forEach(o=>(o.items||[]).forEach(it=>{ if(!l.items.some(i=>i.doc===it.doc)) l.items.push({doc:it.doc}); })); DATA.semaine.listes=[l]; }
  return DATA.semaine.listes[0];
}
function renderSemaine(){
  const p=$('#p-semaine'); if(!p) return;
  const l=quickList(), rows=semDocs(l), total=rows.reduce((s,{d})=>s+(qpQte[d.id]||0),0);
  p.innerHTML=`<div class="listhead"><h2 class="sec">Impression rapide</h2>${isAdmin?`<button class="secondary" data-sw="edit">${ICON.pen}Choisir les documents</button>`:''}</div>
    <p class="hint">Indiquez combien d'exemplaires de chaque document, puis cliquez sur « Imprimer » : tout part en une seule impression.</p>
    ${rows.length?`<div class="card qp"><ul class="qplist">${rows.map(({d})=>{ const q=qpQte[d.id]||0;
        return `<li class="${q?'on':''}"><span class="qthumb" aria-hidden="true">${thumbHtml(d,'')}</span>
          <span class="qn"><b>${esc(d.titre)}</b><small>${esc(catName(d.categorie))}${PRINT_EXT.includes(d.ext)?'':' · à imprimer depuis son logiciel'}</small></span>
          <div class="stepper"><button type="button" data-qm="${esc(d.id)}" aria-label="Un de moins : ${esc(d.titre)}">−</button><input class="in" type="number" min="0" max="500" value="${q}" data-q="${esc(d.id)}" aria-label="Exemplaires de ${esc(d.titre)}"><button type="button" data-qp="${esc(d.id)}" aria-label="Un de plus : ${esc(d.titre)}">+</button></div></li>`; }).join('')}</ul>
      <div class="qpfoot"><span><b>${total}</b> exemplaire${total>1?'s':''}</span><span class="grow"></span>${total?`<button class="ghost" data-sw="zero">Tout remettre à 0</button>`:''}<button class="primary big" data-sw="print"${total?'':' disabled'}>${ICON.print}Imprimer</button></div></div>`
    :`<div class="empty">Aucun document pour l'instant.${isAdmin?' Cliquez sur « Choisir les documents ».':' Un admin peut choisir les documents proposés ici.'}</div>`}`;
}
function setQ(id,v){ v=Math.max(0,Math.min(500,Math.round(+v||0))); if(v) qpQte[id]=v; else delete qpQte[id]; }
function bindSemaine(){
  const p=$('#p-semaine'); if(!p) return;
  p.addEventListener('click',e=>{
    const m=e.target.closest('[data-qm]'), pl=e.target.closest('[data-qp]');
    if(m||pl){ const id=(m||pl).dataset[m?'qm':'qp']; setQ(id,(qpQte[id]||0)+(m?-1:1)); renderSemaine(); const b=$(`#p-semaine [data-${m?'qm':'qp'}="${CSS.escape(id)}"]`); b&&b.focus(); return; }
    const a=e.target.closest('[data-sw]'); if(!a) return;
    if(a.dataset.sw==='zero'){ qpQte={}; renderSemaine(); }
    if(a.dataset.sw==='print') semPrint(quickList());
    if(a.dataset.sw==='edit') editSemList(quickList());
  });
  p.addEventListener('change',e=>{ const q=e.target.closest('[data-q]'); if(!q) return; setQ(q.dataset.q,q.value); renderSemaine(); });
}
async function semPrint(l){
  const rows=semDocs(l).map(({d})=>({d,n:qpQte[d.id]||0})).filter(x=>x.n>0);
  if(!rows.length){ toast('Choisissez au moins un exemplaire.'); return; }
  rows.forEach(x=>stBump('d:'+x.d.id,'q',x.n));
  const pr=rows.filter(x=>PRINT_EXT.includes(x.d.ext)), other=rows.filter(x=>!pr.includes(x));
  const othersModal=none=>openModal(`<h3 id="modal-title">${none?'Documents à imprimer depuis leur logiciel':'À imprimer aussi'}</h3>
    <p>Ces documents (Excel, PowerPoint…) ne peuvent pas être imprimés depuis Librejo : ouvrez-les, puis Ctrl+P en indiquant le nombre de copies.</p>
    <div class="vlist">${other.map(x=>`<a href="${hrefOf(x.d.chemin)}" target="_blank" rel="noopener">${esc(x.d.titre)} (${esc(x.d.ext.toUpperCase())}) — <b>${x.n} exemplaire${x.n>1?'s':''}</b></a>`).join('')}</div>
    <button class="secondary" data-close>OK</button>`);
  if(!pr.length){ othersModal(true); return; }
  try{
    toast('Préparation de l’impression…');
    const parts=[]; for(const {d,n} of pr) parts.push({file:await readRel(d.chemin),ext:d.ext,n,titre:d.titre});
    await printPack(parts);
    if(other.length) setTimeout(()=>othersModal(false),1500);
  }catch(e){ if(e instanceof Cancel) return; console.error(e); const m=fsErr(e); m&&toast(m); }
}
/* Admin : choisir et ordonner les documents proposés */
function editSemList(l){
  const items=l.items.map(i=>({doc:i.doc}));
  const opts=()=>cats().map(c=>{ const ds=docs().filter(d=>d.categorie===c.id&&!isLink(d)&&!items.some(i=>i.doc===d.id)); return ds.length?`<optgroup label="${esc(c.nom)}">${ds.map(d=>`<option value="${esc(d.id)}">${esc(d.titre)}</option>`).join('')}</optgroup>`:''; }).join('');
  const draw=()=>{ $('#sl-items').innerHTML=items.length?items.map((it,i)=>{ const d=docById(it.doc); return d?`<div class="slrow" data-i="${i}"><span class="grow">${esc(d.titre)}</span>
      <button class="iconbtn" data-up="${i}" ${i?'':'disabled'} aria-label="Monter ${esc(d.titre)}">↑</button><button class="iconbtn" data-down="${i}" ${i<items.length-1?'':'disabled'} aria-label="Descendre ${esc(d.titre)}">↓</button><button class="iconbtn" data-rm="${i}" aria-label="Retirer ${esc(d.titre)}">${ICON.trash}</button></div>`:''; }).join(''):'<p class="hint">Aucun document : ajoutez-en avec la liste ci-dessous.</p>';
    $('#sl-add').innerHTML=`<option value="">Ajouter un document…</option>${opts()}`; };
  openModal(`<h3 id="modal-title">Documents de l’impression rapide</h3>
    <div id="sl-items" class="stack s"></div>
    <select class="in" id="sl-add"></select>
    <p class="hint">PDF, images et documents Word s'impriment en un clic. Les fichiers Excel ou PowerPoint restent à imprimer depuis leur logiciel.</p>
    <div class="btns"><button class="primary" id="sl-ok">Enregistrer</button><button class="secondary" data-close>Annuler</button></div>`,'wide');
  draw();
  $('#sl-add').onchange=e=>{ if(e.target.value){ items.push({doc:e.target.value}); draw(); } };
  $('#sl-items').addEventListener('click',e=>{ const b=e.target.closest('[data-rm],[data-up],[data-down]'); if(!b) return;
    if(b.dataset.rm!=null) items.splice(+b.dataset.rm,1);
    else { const i=+(b.dataset.up??b.dataset.down), j=b.dataset.up!=null?i-1:i+1; [items[i],items[j]]=[items[j],items[i]]; }
    draw(); });
  $('#sl-ok').onclick=async()=>{ const before=l.items; l.items=items; l.titre='Impression rapide';
    if(await run(saveData,'Liste enregistrée')){ closeModal(); renderSemaine(); } else l.items=before; };
}

/* ======================================================================
   9. RECHERCHE : synonymes (modifiables par l'admin) et frappe directe
   ====================================================================== */
const DEFAULT_SYN=[
  ['TSO','traitement de substitution','méthadone','buprénorphine','bupré','subutex'],
  ['115','SIAO','hébergement d’urgence','mise à l’abri'],
  ['urgences','SAU','hôpital'],
  ['CSAPA','addictologie','centre de soins'],
  ['CAARUD','réduction des risques','RdR'],
  ['LHSS','lits halte soins santé'],
  ['ACT','appartement de coordination thérapeutique'],
  ['AME','aide médicale','C2S','CSS','sécurité sociale','droits'],
  ['cure','sevrage'],
  ['psy','psychiatrie','CMP','santé mentale'],
  ['naloxone','surdose','overdose','Prenoxad','Nyxoid'],
  ['VIH','dépistage','hépatite','VHC','IST'],
];
if(!Array.isArray(DATA.synonymes)) DATA.synonymes=DEFAULT_SYN;
function synGroups(){ return (DATA.synonymes||[]).map(g=>g.map(w=>norm(w).replace(/’/g,"'")).filter(Boolean)).filter(g=>g.length>1); }
/* Un mot cherché vaut aussi pour ses synonymes (mot identique, ou début de mot d'au moins 3 lettres) */
function expandTerm(t){
  const out=new Set([t]);
  for(const g of synGroups()) if(g.some(w=>w===t||(t.length>=3&&w.split(/[\s'-]+/).some(x=>x.startsWith(t))))) g.forEach(w=>out.add(w));
  return [...out];
}
function drawSyn(){
  $('#asub').innerHTML=`<div class="card top w-wide">
    <h3>Synonymes de recherche</h3>
    <p class="hint">Une ligne par groupe de mots équivalents, séparés par des virgules. Chercher l'un des mots trouve aussi les autres. Exemple : <code>CMU, C2S, complémentaire santé</code></p>
    <textarea class="in" id="syn-t" rows="14" spellcheck="false">${esc(DATA.synonymes.map(g=>g.join(', ')).join('\n'))}</textarea>
    <div class="row"><button class="primary" id="syn-ok">Enregistrer</button><button class="ghost" id="syn-def">Remettre la liste de départ</button></div></div>`;
  $('#syn-ok').onclick=async()=>{ const before=DATA.synonymes; DATA.synonymes=$('#syn-t').value.split('\n').map(l=>l.split(',').map(w=>w.trim()).filter(Boolean)).filter(g=>g.length>1);
    if(!await run(saveData,'Synonymes enregistrés')) DATA.synonymes=before; renderDocs(); };
  $('#syn-def').onclick=()=>{ $('#syn-t').value=DEFAULT_SYN.map(g=>g.join(', ')).join('\n'); };
}
/* Saisie libre : sur l'accueil, quand rien n'a le focus (ni bouton, ni lien, ni champ), taper une lettre
   l'écrit dans la recherche. Jamais depuis un bouton ou un lien : la lettre ne doit pas partir ailleurs que
   là où l'on tape (WCAG 2.1.4). Elle se coupe sur ce poste dans l'aide « ? » de l'accueil. */
const SAISIE_KEY='librejo-saisie-libre';
let saisieLibre=true; try{ saisieLibre=localStorage.getItem(SAISIE_KEY)!=='0'; }catch(e){}
function saisieSet(on){ saisieLibre=!!on; try{ localStorage.setItem(SAISIE_KEY,on?'1':'0'); }catch(e){} }
document.addEventListener('keydown',e=>{
  if(!saisieLibre||tab!=='docs'||e.defaultPrevented) return;
  if(e.ctrlKey||e.metaKey||e.altKey||e.key.length!==1||e.key===' '||e.key==='/') return;
  const a=document.activeElement; if(a&&a!==document.body&&a!==$('#contenu')) return;
  if(layerTop()||document.getElementById('menu')||aideOn) return;
  e.preventDefault(); query+=e.key; renderDocs(); const q=$('#q'); if(!q) return; q.focus(); try{ q.setSelectionRange(q.value.length,q.value.length); }catch(_){}
});
bindSemaine();


/* ======================================================================
   10. DEMANDE DE RELAIS : adresser un patient à un autre CSAPA ou à un médecin
   qui prendra le relais de la prescription du TSO.
   CONFIDENTIALITÉ : comme la délivrance, tout reste en mémoire ; rien n'est
   enregistré, le formulaire est vidé après l'envoi ou à la fermeture de la page.
   ====================================================================== */
const RELAIS_TRT=['Méthadone sirop','Méthadone gélules','Buprénorphine','Buprénorphine + naloxone','Buprénorphine injectable (mensuelle/hebdomadaire)'];
const RELAIS_RYTHME=['Quotidienne sur place','Plusieurs jours par semaine','Hebdomadaire','En pharmacie d’officine'];
let RL={}, rlErr=false, rlRecip=null;
function rlReset(){ RL={date:today(),civ:'',nom:'',prenom:'',ddn:'',tel:'',dest:'',attention:'',motif:'',trt:'',dose:'',debut:'',derniere:'',jusqua:'',rythme:'',pharmacie:'',atcd:'',allergies:'',autres:'',conso:'',ecg:'',suivi:'',comment:''}; rlErr=false; }
rlReset();
const rlIsMetha=()=>/methadone/.test(norm(RL.trt));
function rlValidate(){
  const e=[];
  if(!RL.dest.trim()) e.push(['dest','Structure ou médecin destinataire manquant.']);
  if(!RL.civ) e.push(['civ','Civilité manquante.']);
  if(!RL.nom.trim()) e.push(['nom','Nom du patient manquant.']);
  if(!RL.prenom.trim()) e.push(['prenom','Prénom du patient manquant.']);
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(RL.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!RL.trt) e.push(['trt','Traitement de substitution manquant.']);
  if(!(parseDose(RL.dose)>0)) e.push(['dose','Posologie (mg par jour) manquante ou incorrecte.']);
  if(!RL.atcd.trim()) e.push(['atcd','Antécédents à renseigner (écrire « aucun » si besoin).']);
  if(!RL.autres.trim()) e.push(['autres','Autres traitements à renseigner (écrire « aucun » si besoin).']);
  return e;
}
function renderRelais(){
  const p=$('#p-relais'); if(!p) return;
  const errs=rlErr?rlValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-r="${k}" value="${esc(RL[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const area=(k,ph,rows=3)=>`<textarea class="in${B(k)}" data-r="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(RL[k])}</textarea>`;
  const date=k=>`<input class="in${B(k)}" type="date" data-r="${k}" value="${esc(RL[k])}">`;
  const chips=(k,opts)=>`<div class="choice${B(k)}">${opts.map(o=>`<button type="button" class="chip" data-rc="${k}" data-v="${esc(o)}" aria-pressed="${RL[k]===o}">${esc(o)}</button>`).join('')}</div>`;
  const words=parseDose(RL.dose)>0?doseLettres(RL.dose):'';
  p.innerHTML=`<button class="backlink" data-rback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🔁</span>Demande de relais</h2>
    <p class="hint">Pour adresser un patient à un autre CSAPA ou à un médecin qui prendra le relais de la prescription du TSO.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface après l'envoi, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Destinataire</h3>
      <div class="fieldgrid">
        <label class="field wide partpick"><span>CSAPA ou médecin qui prend le relais <small>(choisir dans l'annuaire ou écrire)</small></span><input class="in${B('dest')}" data-r="dest" list="rl-parts" value="${esc(RL.dest)}" placeholder="ex. CSAPA Puget Corderie, Dr …" autocomplete="off">
          <datalist id="rl-parts">${ANNU.partenaires.filter(x=>/csapa|medecin|addicto|psy|caarud|hopital/.test(norm(x.type))).map(x=>`<option value="${esc(x.nom)}">${esc(x.type)}</option>`).join('')}</datalist></label>
        <label class="field"><span>À l'attention de <small>(facultatif)</small></span>${txt('attention','ex. Dr …')}</label>
        <label class="field"><span>Date du document</span>${date('date')}</label>
        ${medSelectHTML('rl-med')}
      </div></div>
    <div class="card top w-form"><h3>Patient</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg${B('civ')}">${['M.','Mme'].map(c=>`<button type="button" data-rc="civ" data-v="${c}" aria-pressed="${RL.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance</span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
        <label class="field"><span>Téléphone du patient <small>(facultatif)</small></span>${txt('tel','','inputmode="tel"')}</label>
        <label class="field wide"><span>Motif du relais <small>(facultatif)</small></span>${area('motif','ex. déménagement, rapprochement du domicile, fin de prise en charge chez nous…',2)}</label>
      </div></div>
    <div class="card top w-form"><h3>Traitement de substitution</h3>
      <div class="fieldgrid">
        <div class="field wide"><span>Molécule</span>${chips('trt',RELAIS_TRT)}</div>
        <label class="field"><span>Posologie actuelle (mg par jour)</span>${txt('dose','ex. 60','inputmode="decimal"')}${words?`<small class="dosew">${esc(words)} par jour</small>`:''}</label>
        <label class="field"><span>Début du traitement <small>(facultatif)</small></span>${date('debut')}</label>
        <label class="field"><span>Dernière délivrance <small>(facultatif)</small></span>${date('derniere')}</label>
        <label class="field"><span>Traitement délivré jusqu'au <small>(inclus, facultatif)</small></span>${date('jusqua')}</label>
        <div class="field wide"><span>Rythme de délivrance actuel <small>(facultatif)</small></span>${chips('rythme',RELAIS_RYTHME)}</div>
        <label class="field wide"><span>Pharmacie actuelle <small>(facultatif)</small></span>${txt('pharmacie','nom et ville de la pharmacie, si délivrance en officine')}</label>
        ${rlIsMetha()?`<label class="field wide"><span>Dernier ECG <small>(facultatif)</small></span>${txt('ecg','ex. 12/09/2026, QTc 420 ms')}</label>`:''}
      </div></div>
    <div class="card top w-form"><h3>Éléments médicaux</h3>
      <div class="fieldgrid">
        <label class="field wide"><span>Antécédents</span>${area('atcd','médicaux, psychiatriques, addictologiques (ex. VHC traité en 2024, trouble anxieux, sevrage alcool 2023…)',4)}</label>
        <label class="field wide"><span>Allergies <small>(facultatif)</small></span>${txt('allergies','ex. aucune connue')}</label>
        <label class="field wide"><span>Autres traitements associés</span>${area('autres','nom, dosage, posologie (ex. Diazépam 10 mg : 1-0-1)',4)}</label>
        <label class="field wide"><span>Consommations actuelles <small>(facultatif)</small></span>${area('conso','produits, fréquence, voie',2)}</label>
        <label class="field wide"><span>Suivis en cours <small>(facultatif)</small></span>${area('suivi','ex. psychiatre CMP, hépatologue, assistante sociale…',2)}</label>
        <label class="field wide"><span>Commentaire <small>(facultatif)</small></span>${area('comment','',2)}</label>
      </div></div>
    <div class="card top w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : vous pourrez aussi le saisir dans Outlook)</small></span>${recipHTML('rl-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="row w-form"><button class="primary big" data-rgo>${ICON.mail}Créer le PDF et préparer l'envoi</button></div>
    <div class="row w-form end"><button class="ghost danger" data-rclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=rlRecip?rlRecip.get():[];
  rlRecip=bindRecip(p.querySelector('#rl-rc'),prev);
}
function rlBind(){
  const p=$('#p-relais'); if(!p) return;
  p.addEventListener('input',e=>{ const k=e.target.dataset.r; if(!k) return;
    let v=e.target.value;
    if(k==='ddn'){ const d=v.replace(/\D/g,'').slice(0,8); v=d.length>4?`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`:d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d; if(v!==e.target.value) e.target.value=v; }
    RL[k]=v;
    if(k==='dose'){ const w=p.querySelector('.dosew'), t=parseDose(v)>0?doseLettres(v)+' par jour':''; if(w) w.textContent=t; else if(t){ const s=document.createElement('small'); s.className='dosew'; s.textContent=t; e.target.after(s); } }
    if(k==='dest'){ const x=ANNU.partenaires.find(z=>z.nom===v.trim()); if(x&&rlRecip) x.emails.forEach(m=>rlRecip.add(m)); }
    if(rlErr){ e.target.classList.remove('bad'); } });
  p.addEventListener('click',e=>{
    if(e.target.closest('[data-rback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=e.target.closest('[data-rc]'); if(c){ const k=c.dataset.rc; RL[k]=RL[k]===c.dataset.v?'':c.dataset.v; renderRelais(); return; }
    if(e.target.closest('[data-rclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ rlReset(); rlRecip=null; renderRelais(); }); return; }
    if(e.target.closest('[data-rgo]')) relaisPdf();
  });
}
function relaisPdf(){
  const errs=LIVE_DRY?[]:(rlErr=true,rlValidate());
  if(missingStop(errs,'#p-relais',renderRelais,relaisPdf,()=>RL)) return;
  if(!window.jspdf){ toast("Le module PDF n'est pas chargé."); return; }
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const st=structure;
  const NAVY=pdfRGB('--navy'),ORANGE=pdfRGB('--accent'),GREY=[93,103,121],INK=[20,32,58],SOFT=[238,241,246]; const {L,R,W,PL}=GEO();
  const fem=RL.civ==='Mme', who=`${RL.civ} ${RL.nom.trim().toUpperCase()} ${RL.prenom.trim()}`;
  doc.setProperties({title:'Demande de relais – traitement de substitution',author:st.nom,creator:'Librejo'});
  // en-tête resserré : la demande doit tenir sur une page
  pdfLogo(doc,PL+5,10,24,22.6);
  doc.setFontSize(8); doc.setTextColor(...INK);
  pdfEntete(doc,PL,37,3.6);
  doc.setTextColor(...GREY); doc.setFont(PF(),'bold'); doc.setFontSize(8); doc.text('CONFIDENTIEL – DONNÉES DE SANTÉ',R,13,{align:'right'});
  doc.setTextColor(...NAVY); doc.setFontSize(16); doc.text('Demande de relais',R,24,{align:'right'});
  doc.setDrawColor(...ORANGE); doc.setLineWidth(1.2); doc.line(R-62,27.5,R,27.5);
  doc.setFont(PF(),'normal'); doc.setFontSize(9.5); doc.setTextColor(...GREY); doc.text('Traitement de substitution aux opiacés',R,33,{align:'right'});
  let y=58;
  const footTop=297-12-((st.pied||[]).length-1)*4-6-3; // juste au-dessus du trait orange du pied de page
  const room=n=>{ if(y+n>footTop){ doc.addPage(); y=25; } };
  doc.setTextColor(...INK); doc.setFontSize(11); doc.setFont(PF(),'normal');
  doc.text(`${villeLe(st)}${frDate(RL.date||today())}`,R,y,{align:'right'});
  doc.setFont(PF(),'bold'); doc.text('À :',L,y); doc.setFont(PF(),'normal');
  const dl=doc.splitTextToSize(RL.dest.trim()+(RL.attention.trim()?' – à l’attention de '+RL.attention.trim():''),W-62); doc.text(dl,L+10,y); y+=5*dl.length+4;
  const intro=`Nous vous adressons ${who}, né${fem?'e':''} le ${RL.ddn}${RL.tel.trim()?' (tél. '+RL.tel.trim()+')':''}, suivi${fem?'e':''} dans notre structure, pour un relais de son traitement de substitution aux opiacés.`;
  doc.setFontSize(10.5); doc.splitTextToSize(intro,W).forEach(l=>{ room(6); doc.text(l,L,y); y+=5; }); y+=2;
  if(RL.motif.trim()){ doc.splitTextToSize('Motif : '+RL.motif.trim(),W).forEach(l=>{ room(6); doc.text(l,L,y); y+=5; }); y+=1; }
  const section=t=>{ room(16); y+=3; doc.setFillColor(...SOFT); doc.rect(L,y-4.6,W,6.6,'F'); doc.setFont(PF(),'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY); doc.text(t.toUpperCase(),L+2.5,y); y+=6.2; doc.setTextColor(...INK); doc.setFontSize(10); };
  const row=(label,val)=>{ val=String(val||'').trim(); if(!val) return; const lines=doc.splitTextToSize(val,W-52); room(4.8*lines.length+1);
    doc.setFont(PF(),'bold'); doc.setTextColor(...GREY); doc.text(label,L+2.5,y); doc.setFont(PF(),'normal'); doc.setTextColor(...INK);
    lines.forEach((l,i)=>doc.text(l,L+52,y+i*4.7)); y+=4.7*lines.length+1.2; };
  section('Traitement de substitution');
  row('Molécule',RL.trt);
  row('Posologie actuelle',doseTxt(RL.dose));
  row('Début du traitement',RL.debut?frDate(RL.debut):'');
  row('Dernière délivrance',RL.derniere?frDate(RL.derniere):'');
  row('Délivré jusqu’au',RL.jusqua?frDate(RL.jusqua)+' inclus':'');
  row('Rythme de délivrance',RL.rythme);
  row('Pharmacie',RL.pharmacie);
  if(rlIsMetha()) row('Dernier ECG',RL.ecg);
  section('Éléments médicaux');
  row('Antécédents',RL.atcd); row('Allergies',RL.allergies); row('Autres traitements',RL.autres);
  row('Consommations',RL.conso); row('Suivis en cours',RL.suivi);
  if(RL.comment.trim()){ section('Commentaire'); doc.setFont(PF(),'normal'); doc.splitTextToSize(RL.comment.trim(),W-5).forEach(l=>{ room(6); doc.text(l,L+2.5,y); y+=4.8; }); }
  y+=5; room(24);
  doc.setFont(PF(),'normal'); doc.setFontSize(11); doc.setTextColor(...INK);
  doc.text('Nous vous remercions de votre accueil et restons à votre disposition pour tout complément.',L,y); y+=9;
  doc.setFont(PF(),'bold'); doc.setTextColor(...NAVY);
  const md=medChoice();
  if(md){ doc.text(md.nom,R,y,{align:'right'}); y+=5; doc.text('N° RPPS : '+md.rpps,R,y,{align:'right'});
    doc.setFont(PF(),'normal'); doc.setFontSize(9); doc.setTextColor(...GREY);
    String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n').filter(Boolean).forEach(t=>{ y+=4.5; doc.text(t,R,y,{align:'right'}); }); }
  else doc.text(st.signataire,R,y,{align:'right'});
  const pied=st.pied||[]; const fy=297-12-(pied.length-1)*4;
  for(let pg=1;pg<=doc.getNumberOfPages();pg++){ doc.setPage(pg);
    pdfMarge(doc,pg,fy); pdfFilet(doc,PL,R,fy,ORANGE); doc.setFontSize(8); doc.setTextColor(...GREY);
    pdfPied(doc,pied,fy,PL);
    if(doc.getNumberOfPages()>1){ doc.setFontSize(8); doc.text(`${pg}/${doc.getNumberOfPages()}`,R,fy+(pied.length-1)*4,{align:'right'}); } }
  const file=new File([doc.output('blob')],`Demande-relais_${[RL.nom,RL.prenom].map(x=>x===BLANK?'':x.trim().slice(0,1).toUpperCase()).join('')}_${isoOr(RL.date)}.pdf`.replace('__','_'),{type:'application/pdf'});
  const to=rlRecip?rlRecip.get():[];
  const sign=md?md.nom:st.signataire;
  showSendGeneric({files:[file],to,subject:`${st.nom} – Demande de relais TSO – ${frDate(RL.date||today())}`,
    body:`Bonjour,\n\nVeuillez trouver ci-joint une demande de relais de traitement de substitution aux opiacés pour ${fem?'une patiente':'un patient'} suivi${fem?'e':''} dans notre structure.\n\nNous restons à votre disposition pour tout complément.\n\nCordialement,\n${sign}`,
    sensitive:true,onDone:()=>{ rlReset(); rlRecip=null; renderRelais(); }});
}
rlBind();


/* ======================================================================
   11. CERTIFICAT MÉDICAL INITIAL — personne majeure victime de violences.
   Structure inspirée du modèle du Conseil national de l'Ordre des médecins
   (2016) et des recommandations HAS (2011) : A. dires de la personne,
   B. doléances, C. examen clinique, D. état antérieur, E. ITT ; mentions de
   remise ; photographies datées et identifiées, jointes avec l'accord de la
   personne.
   CONFIDENTIALITÉ : tout reste en mémoire (photos comprises) ; rien n'est
   enregistré ; le formulaire et les photos sont effacés à la fin ou à la
   fermeture de la page.
   ====================================================================== */
const CMI_LESIONS=['Ecchymose','Hématome','Plaie','Dermabrasion','Griffure','Morsure','Brûlure','Œdème','Pétéchies','Douleur à la palpation','Autre'];
const CMI_PSY=['anxiété','pleurs','sidération','hypervigilance','symptômes dissociatifs','tristesse','idées suicidaires','calme apparent'];
let CM={}, cmErr=false, cmPhotos=[], cmSeq=0;
const nowHM=()=>{ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); };
function cmReset(){
  cmPhotos.forEach(p=>{ try{ URL.revokeObjectURL(p.url); }catch(e){} }); cmPhotos=[];
  CM={dateExam:today(),heureExam:nowHM(),lieu:'',ident:'piece',civ:'',nom:'',prenom:'',ddn:'',adresse:'',interprete:'',langue:'',lien:'',tiers:'',
      faitsDate:'',dires:'',doleances:'',lesions:[],physique:'',psy:'',gene:'',examens:'',complement:false,anterieur:'',
      ittMode:'',itt:'',consent:false,remise:'main',requerant:'',numeros:true};
  cmErr=false;
}
cmReset();
const cmFem=()=>CM.civ==='Mme';
const cmAge=()=>{ const t=parseDDN(CM.ddn.trim()); if(!t) return null; const n=new Date(); let a=n.getFullYear()-t.getFullYear(); if(n<new Date(n.getFullYear(),t.getMonth(),t.getDate())) a--; return a; };
const cmItt=()=>{ const n=parseInt(String(CM.itt).replace(/\D/g,''),10); return n>=0&&n<=999?n:null; };
function cmValidate(){
  const e=[];
  if(!medChoice()) e.push(['med',meds().length?'Choisissez le médecin qui signe le certificat.':'Aucun médecin enregistré : un admin doit les ajouter dans Administration › Réglages.']);
  if(!CM.dateExam) e.push(['dateExam',"Date de l'examen manquante."]);
  if(!/^\d{2}:\d{2}$/.test(CM.heureExam)) e.push(['heureExam',"Heure de l'examen manquante."]);
  if(!CM.lieu.trim()) e.push(['lieu',"Lieu de l'examen manquant."]);
  if(!CM.civ) e.push(['civ','Civilité manquante.']);
  if(!CM.nom.trim()) e.push(['nom','Nom manquant.']);
  if(!CM.prenom.trim()) e.push(['prenom','Prénom manquant.']);
  if(!parseDDN(CM.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!CM.dires.trim()) e.push(['dires','Dires de la personne manquants (rubrique A).']);
  if(!CM.lesions.length&&!CM.physique.trim()) e.push(['physique','Examen physique : décrivez au moins une lésion ou vos constatations (même négatives).']);
  CM.lesions.forEach((l,i)=>{ if(!l.type||!l.loc.trim()) e.push(['les'+i,`Lésion ${i+1} : type et localisation à préciser.`]); });
  if(CM.ittMode==='') e.push(['ittMode','ITT : indiquez si elle est fixée ou non.']);
  if(CM.ittMode==='fixee'&&cmItt()===null) e.push(['itt',"Durée de l'ITT en jours manquante."]);
  if(cmPhotos.length&&!CM.consent) e.push(['consent',"Photographies : cochez l'accord de la personne, ou retirez les photos."]);
  if(CM.remise==='requisition'&&!CM.requerant.trim()) e.push(['requerant','Réquisition : nom et fonction du requérant manquants.']);
  return e;
}

/* --- Photos : date de prise de vue (EXIF), empreinte SHA-256, rien n'est enregistré --- */
function exifDate(buf){
  try{
    const v=new DataView(buf); if(v.getUint16(0)!==0xFFD8) return null;
    let o=2;
    while(o+4<v.byteLength){
      const mk=v.getUint16(o), len=v.getUint16(o+2);
      if(mk===0xFFE1&&v.getUint32(o+4)===0x45786966){
        const t=o+10, le=v.getUint16(t)===0x4949, u16=p=>v.getUint16(p,le), u32=p=>v.getUint32(p,le);
        const str=(p,n)=>{ let s=''; for(let i=0;i<n;i++){ const c=v.getUint8(p+i); if(!c) break; s+=String.fromCharCode(c); } return s; };
        const ifd=(p,want)=>{ const n=u16(t+p), r={}; for(let i=0;i<n;i++){ const e=t+p+2+i*12, tag=u16(e); if(want.includes(tag)){ const cnt=u32(e+4); r[tag]=u16(e+2)===2?str(t+u32(e+8),cnt):u32(e+8); } } return r; };
        const i0=ifd(u32(t+4),[0x0132,0x8769]); let s='', src='exif';
        if(i0[0x8769]){ const ex=ifd(i0[0x8769],[0x9003]); s=ex[0x9003]||''; }
        if(!s){ s=i0[0x0132]||''; src='exif-modif'; }
        const m=/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(s); return m?{date:`${m[1]}-${m[2]}-${m[3]}`,heure:`${m[4]}:${m[5]}`,src}:null;
      }
      if((mk&0xFF00)!==0xFF00) break; o+=2+len;
    }
  }catch(e){}
  return null;
}
async function sha256(buf){ try{ if(!crypto.subtle) return ''; const h=await crypto.subtle.digest('SHA-256',buf); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join(''); }catch(e){ return ''; } }
async function cmAddPhotos(files){
  let bad=0;
  for(const f of [...files]){
    if(!/^image\/(jpeg|png|webp)$/.test(f.type)){ bad++; continue; }
    if(f.size>30*1048576){ toast(`${f.name} : photo trop lourde (30 Mo maximum)`); continue; }
    const buf=await f.arrayBuffer();
    const ex=f.type==='image/jpeg'?exifDate(buf):null, d=new Date(f.lastModified||Date.now());
    cmPhotos.push({id:++cmSeq,file:f,name:f.name,url:URL.createObjectURL(f),hash:await sha256(buf),legend:'',
      date:ex?ex.date:`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,heure:ex?ex.heure:pad(d.getHours())+':'+pad(d.getMinutes()),src:ex?ex.src:'fichier'});
  }
  if(bad) toast(bad>1?`${bad} fichiers refusés : seules les photos JPEG, PNG ou WebP sont lisibles (iPhone : réglage « Le plus compatible »)`:'Fichier refusé : seules les photos JPEG, PNG ou WebP sont lisibles (iPhone : réglage « Le plus compatible »)');
  renderCmi();
}
const cmSrcTxt=p=>p.src==='exif'?"date enregistrée par l'appareil photo":p.src==='exif-modif'?"date enregistrée dans le fichier (photo peut-être retouchée)":'date du fichier : non garantie par l’appareil';

function renderCmi(){
  const p=$('#p-cmi'); if(!p) return;
  const errs=cmErr?cmValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-c="${k}" value="${esc(CM[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const area=(k,ph,rows=3)=>`<textarea class="in${B(k)}" data-c="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(CM[k])}</textarea>`;
  const seg=(k,opts)=>`<div class="seg${B(k)}">${opts.map(([v,l])=>`<button type="button" data-cs="${k}" data-v="${v}" aria-pressed="${CM[k]===v}">${l}</button>`).join('')}</div>`;
  const age=cmAge(), itt=cmItt();
  const opts=CMI_LESIONS.map(t=>`<option${''}>${esc(t)}</option>`).join('');
  const photoOpts=sel=>`<option value="">—</option>`+cmPhotos.map((x,i)=>`<option value="${x.id}" ${String(sel)===String(x.id)?'selected':''}>Photo ${i+1}</option>`).join('');
  p.innerHTML=`<button class="backlink" data-cback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🩺</span>Certificat médical initial</h2>
    <p class="hint">Personne majeure victime de violences. Structure inspirée du modèle du Conseil national de l'Ordre des médecins : décrire sans interpréter, ne pas se prononcer sur la réalité des faits ni sur l'auteur.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré, photos comprises. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    ${age!==null&&age<18?`<div class="notice w-form" role="alert"><b>Personne mineure (${age} ans).</b> Ce certificat est prévu pour une personne majeure. Pour un mineur, utilisez la procédure de signalement (modèle de l'Ordre et cellule départementale, CRIP).</div>`:''}
    <div class="card top w-form"><h3>Examen</h3>
      <div class="fieldgrid">
        <div class="wide">${medSelectHTML('cm-med').replace('class="in"','class="in'+B('med')+'"')||`<span class="warn-text">Aucun médecin enregistré : un admin doit les ajouter dans Administration › Réglages.</span>`}</div>
        <label class="field"><span>Date de l'examen</span><input class="in${B('dateExam')}" type="date" data-c="dateExam" value="${esc(CM.dateExam)}"></label>
        <label class="field"><span>Heure de l'examen</span><input class="in${B('heureExam')}" type="time" data-c="heureExam" value="${esc(CM.heureExam)}"></label>
        <label class="field wide"><span>Lieu de l'examen</span>${txt('lieu','ex. accueil de jour, 1 rue …')}</label>
      </div></div>
    <div class="card top w-form"><h3>Personne examinée</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span>${seg('civ',[['M.','M.'],['Mme','Mme']])}</div>
        <label class="field"><span>Date de naissance</span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
        <div class="field wide"><span>Identité</span>${seg('ident',[['piece',"Pièce d'identité présentée"],['declaree','Identité déclarée seulement']])}</div>
        <label class="field wide"><span>Adresse <small>(facultatif)</small></span>${txt('adresse','à ne remplir que si la personne le souhaite')}</label>
        <label class="field"><span>Interprète <small>(facultatif)</small></span>${txt('interprete','nom et prénom')}</label>
        <label class="field"><span>Langue <small>(si interprète)</small></span>${txt('langue','ex. arabe')}</label>
        <label class="field wide"><span>Lien de l'interprète avec la personne <small>(si interprète)</small></span>${txt('lien','ex. aucun, professionnel ; ami ; membre de la famille')}</label>
        <label class="field wide"><span>Autre personne présente pendant l'examen <small>(facultatif)</small></span>${txt('tiers','ex. travailleuse sociale de l’équipe')}</label>
      </div></div>
    <div class="card top w-form"><h3>A. Dires de la personne</h3>
      <p class="hint muted m-0">Ses mots, sans tri ni interprétation : ils seront imprimés entre guillemets, précédés de « La personne déclare : ».</p>
      <div class="fieldgrid">
        <label class="field wide"><span>Date et lieu des faits déclarés <small>(facultatif)</small></span>${txt('faitsDate','ex. dans la nuit du 10 au 11 novembre 2026, à son domicile')}</label>
        <label class="field wide"><span>Ce que la personne déclare</span>${area('dires','contexte, nature des faits, auteur déclaré…',5)}</label>
      </div></div>
    <div class="card top w-form"><h3>B. Doléances</h3>
      <label class="field"><span>Ce dont la personne se plaint <small>(facultatif, entre guillemets)</small></span>${area('doleances','douleurs, sommeil, cauchemars, peur, alimentation…',3)}</label></div>
    <div class="card top w-form"><h3>C. Examen clinique</h3>
      <div class="field"><span>Lésions constatées</span>
        <div class="stack s">${CM.lesions.map((l,i)=>`<div class="lesion-row${B('les'+i)}" data-li="${i}">
          <b class="lnum">${i+1}</b>
          <label class="field"><span class="mini-lbl">Type</span><select class="in" data-l="type"><option value="">Choisir…</option>${opts.replace(`<option>${esc(l.type)}</option>`,`<option selected>${esc(l.type)}</option>`)}</select></label>
          <label class="field"><span class="mini-lbl">Localisation précise</span><input class="in" data-l="loc" value="${esc(l.loc)}" placeholder="ex. face externe du bras gauche, tiers moyen"></label>
          <label class="field"><span class="mini-lbl">Dimensions</span><input class="in" data-l="dim" value="${esc(l.dim)}" placeholder="ex. 4 × 2 cm"></label>
          <label class="field"><span class="mini-lbl">Aspect, couleur</span><input class="in" data-l="aspect" value="${esc(l.aspect)}" placeholder="ex. violacée, contours nets"></label>
          <label class="field"><span class="mini-lbl">Photo</span><select class="in" data-l="photo">${photoOpts(l.photo)}</select></label>
          <button class="iconbtn align-input" data-ldel="${i}" aria-label="Retirer la lésion ${i+1}">${ICON.trash}</button></div>`).join('')}
        <button class="secondary wide" type="button" data-ladd>${ICON.plus}Ajouter une lésion</button></div></div>
      <label class="field"><span>Autres constatations physiques <small>(dont signes négatifs utiles)</small></span>${area('physique','ex. pas de lésion visible du visage ni du cuir chevelu ; mobilité du poignet conservée…',3)}</label>
      <label class="field"><span>Examen psychique <small>(état et comportement pendant la consultation)</small></span>${area('psy','',3)}
        <div class="choice mt-s">${CMI_PSY.map(t=>`<button type="button" class="chip small" data-psy="${esc(t)}">+ ${esc(t)}</button>`).join('')}</div></label>
      <label class="field"><span>Gêne fonctionnelle dans les actes de la vie courante <small>(justifie l'ITT)</small></span>${area('gene','ex. ne peut pas porter de charge avec le bras gauche ; difficultés à s’habiller seule…',2)}</label>
      <label class="field"><span>Examens complémentaires, avis demandés <small>(facultatif)</small></span>${area('examens','ex. radiographie du poignet gauche demandée',2)}</label>
      <label class="check plain"><input type="checkbox" data-cb="complement" ${CM.complement?'checked':''}> Un certificat complémentaire sera établi au vu des résultats</label></div>
    <div class="card top w-form"><h3>D. État antérieur</h3>
      <label class="field"><span>Uniquement ce qui peut interférer avec les lésions <small>(facultatif)</small></span>${area('anterieur','ex. traitement anticoagulant ; constatations lors d’une consultation antérieure en lien avec les faits…',2)}</label></div>
    <div class="card top w-form"><h3>E. Incapacité totale de travail (ITT)</h3>
      <p class="hint muted m-0">Au sens pénal : durée de la gêne notable dans les actes de la vie courante, pas l'arrêt de travail. Facultative : elle peut être fixée plus tard par un médecin légiste.</p>
      ${seg('ittMode',[['fixee','ITT fixée'],['non','Non fixée à ce jour']])}
      ${CM.ittMode==='fixee'?`<label class="field"><span>Durée en jours</span><div class="row gap-s"><input class="in w-num${B('itt')}" data-c="itt" value="${esc(CM.itt)}" inputmode="numeric" maxlength="3"><span class="muted">${itt!==null?esc(lt1000(itt))+' jour'+(itt>1?'s':'')+', sous réserve de complications ultérieures':''}</span></div></label>`:''}</div>
    <div class="card top w-form"><h3>Photographies</h3>
      <p class="hint muted m-0">Jointes en annexe, datées et numérotées. La date de prise de vue est lue dans la photo ; une empreinte numérique permet de prouver plus tard que le fichier d'origine n'a pas été modifié. Évitez de laisser ces photos sur un téléphone personnel.</p>
      ${cmPhotos.length?`<div class="photos">${cmPhotos.map((x,i)=>`<div class="photo" data-pi="${x.id}">
        <img src="${x.url}" alt="Photo ${i+1}">
        <div class="stack xs"><b>Photo ${i+1}</b>
          <span class="${x.src==='exif'?'':'warn-text'}">${frDate(x.date)} à ${x.heure.replace(':',' h ')} · ${esc(cmSrcTxt(x))}</span>
          ${x.date!==CM.dateExam?`<span class="warn-text">Pas le jour de l'examen</span>`:''}
          <input class="in" data-pl="${x.id}" value="${esc(x.legend)}" placeholder="Légende : ex. bras gauche, face externe">
          <small class="muted">${esc(x.name)}</small></div>
        <button class="iconbtn" data-pdel="${x.id}" aria-label="Retirer la photo ${i+1}">${ICON.trash}</button></div>`).join('')}</div>`:''}
      <label class="dropzone" data-pdrop>${svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}<b>Ajouter des photos</b><span>Cliquez ou glissez les photos ici (JPEG, PNG)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden data-pfile></label>
      ${cmPhotos.length?`<label class="check${B('consent')?' warn-text':''}"><input type="checkbox" data-cb="consent" ${CM.consent?'checked':''}> La personne a donné son accord pour les photographies</label>`:''}</div>
    <div class="card top w-form"><h3>Remise</h3>
      ${seg('remise',[['main',"À la demande de l'intéressé·e, remis en main propre"],['requisition','Sur réquisition']])}
      ${CM.remise==='requisition'?`<label class="field"><span>Requérant <small>(nom et fonction)</small></span>${txt('requerant','ex. Capitaine X, commissariat du 3e arrondissement')}</label>`:''}
      <label class="check plain"><input type="checkbox" data-cb="numeros" ${CM.numeros?'checked':''}> Ajouter une page « Numéros utiles » pour la personne</label></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-cgo>${ICON.file}Créer le certificat (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-cclear>${ICON.trash}Tout effacer</button></div>`;
}
function cmBind(){
  const p=$('#p-cmi'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target;
    if(t.dataset.c){ let v=t.value;
      if(t.dataset.c==='ddn'){ const d=v.replace(/\D/g,'').slice(0,8); v=d.length>4?`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`:d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d; if(v!==t.value) t.value=v; }
      CM[t.dataset.c]=v; if(cmErr) t.classList.remove('bad');
      if(t.dataset.c==='itt'){ const s=t.nextElementSibling, n=cmItt(); if(s) s.textContent=n!==null&&t.value!==''?lt1000(n)+' jour'+(n>1?'s':'')+', sous réserve de complications ultérieures':''; }
      if(t.dataset.c==='ddn'&&/^\d{2}\/\d{2}\/\d{4}$/.test(v)) renderCmi();
      return; }
    if(t.dataset.l){ const i=+t.closest('[data-li]').dataset.li; CM.lesions[i][t.dataset.l]=t.value; return; }
    if(t.dataset.pl){ const x=cmPhotos.find(z=>z.id==t.dataset.pl); if(x) x.legend=t.value; }
  });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.cb){ CM[t.dataset.cb]=t.checked; if(t.dataset.cb==='consent'&&cmErr) renderCmi(); return; }
    if(t.dataset.l){ const i=+t.closest('[data-li]').dataset.li; CM.lesions[i][t.dataset.l]=t.value; return; }
    if(t.matches('[data-pfile]')){ cmAddPhotos(t.files); t.value=''; return; }
    if(t.dataset.c==='dateExam') renderCmi();
    if(t.matches('[data-med]')&&cmErr) setTimeout(renderCmi,0);
  });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-cback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const s=t.closest('[data-cs]'); if(s){ const k=s.dataset.cs; CM[k]=CM[k]===s.dataset.v&&k!=='ident'&&k!=='remise'?'':s.dataset.v; renderCmi(); return; }
    if(t.closest('[data-ladd]')){ CM.lesions.push({type:'',loc:'',dim:'',aspect:'',photo:''}); renderCmi(); const r=p.querySelectorAll('.lesion-row'); r.length&&r[r.length-1].querySelector('select').focus(); return; }
    const ld=t.closest('[data-ldel]'); if(ld){ CM.lesions.splice(+ld.dataset.ldel,1); renderCmi(); return; }
    const pd=t.closest('[data-pdel]'); if(pd){ const i=cmPhotos.findIndex(z=>z.id==pd.dataset.pdel); if(i>=0){ URL.revokeObjectURL(cmPhotos[i].url); CM.lesions.forEach(l=>{ if(l.photo==pd.dataset.pdel) l.photo=''; }); cmPhotos.splice(i,1); } renderCmi(); return; }
    const ps=t.closest('[data-psy]'); if(ps){ const v=CM.psy.trim(); CM.psy=v?(v.replace(/[.;,]\s*$/,'')+', '+ps.dataset.psy):ps.dataset.psy.charAt(0).toUpperCase()+ps.dataset.psy.slice(1); renderCmi(); const a=p.querySelector('[data-c=psy]'); a&&a.focus(); return; }
    if(t.closest('[data-cclear]')){ askConfirm('Tout effacer ?','Le formulaire et les photos seront effacés.','Tout effacer',()=>{ cmReset(); renderCmi(); }); return; }
    if(t.closest('[data-cgo]')) cmiPdf();
  });
  p.addEventListener('dragover',e=>{ const z=e.target.closest('[data-pdrop]'); if(!z) return; e.preventDefault(); e.stopPropagation(); z.classList.add('over'); });
  p.addEventListener('dragleave',e=>{ const z=e.target.closest('[data-pdrop]'); z&&z.classList.remove('over'); });
  p.addEventListener('drop',e=>{ const z=e.target.closest('[data-pdrop]'); if(!z) return; e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); cmAddPhotos(e.dataTransfer.files); });
}

/* Photo réduite pour le PDF, avec la date et le numéro incrustés en bas de l'image */
async function cmPhotoJpeg(x,n){
  const img=new Image(); img.src=x.url; await img.decode();
  const M=1800, k=Math.min(1,M/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.round(img.naturalWidth*k), h=Math.round(img.naturalHeight*k);
  const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d');
  g.drawImage(img,0,0,w,h);
  const fs=Math.max(14,Math.round(Math.min(w,h)*0.035)), bh=Math.round(fs*1.8);
  g.fillStyle='rgba(0,0,0,.62)'; g.fillRect(0,h-bh,w,bh);
  g.fillStyle='#fff'; g.font=`700 ${fs}px Arial, sans-serif`; g.textBaseline='middle';
  g.fillText(`Photo ${n} · ${frDate(x.date)} ${x.heure}`,Math.round(fs*.6),h-bh/2);
  return {data:c.toDataURL('image/jpeg',.85),w,h};
}

async function cmiPdf(){
  try{ await pdfReady(); }catch(e){ return; }
  const errs=LIVE_DRY?[]:(cmErr=true,cmValidate());
  if(missingStop(errs,'#p-cmi',renderCmi,cmiPdf,()=>CM)) return;
  if(!window.jspdf){ toast("Le module PDF n'est pas chargé."); return; }
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const st=structure;
  const NAVY=pdfRGB('--navy'),ORANGE=pdfRGB('--accent'),GREY=[93,103,121],INK=[20,32,58],SOFT=[238,241,246]; const {L,R,W,PL}=GEO();
  const md=medChoice(), fem=cmFem(), e_=fem?'e':'';
  const who=`${CM.civ} ${CM.nom.trim().toUpperCase()} ${CM.prenom.trim()}`;
  const redac=new Date(), redD=`${redac.getFullYear()}-${pad(redac.getMonth()+1)}-${pad(redac.getDate())}`, redH=pad(redac.getHours())+' h '+pad(redac.getMinutes());
  const idLine=`Certificat médical initial – ${who} – examen du ${frDate(CM.dateExam)}`;
  doc.setProperties({title:'Certificat médical initial',author:md.nom,creator:'Librejo'});
  pdfLogo(doc,PL+2,14,30,28.2);
  doc.setFontSize(8.5); doc.setTextColor(...INK);
  pdfEntete(doc,PL,47,4);
  doc.setTextColor(...GREY); doc.setFont(PF(),'bold'); doc.setFontSize(8); doc.text('DOCUMENT MÉDICAL CONFIDENTIEL',R,16,{align:'right'});
  doc.setTextColor(...NAVY); doc.setFontSize(16); doc.text('Certificat médical initial',R,30,{align:'right'});
  doc.setDrawColor(...ORANGE); doc.setLineWidth(1.2); doc.line(R-78,34,R,34);
  doc.setFont(PF(),'normal'); doc.setFontSize(9.5); doc.setTextColor(...GREY); doc.text('Personne majeure victime de violences',R,40,{align:'right'});
  let y=66;
  const pied=st.pied||[]; const footTop=297-14-pied.length*4-8;
  const room=n=>{ if(y+n>footTop){ doc.addPage(); y=25; } };
  const para=(t,opt={})=>{ doc.setFont(PF(),opt.bold?'bold':opt.italic?'italic':'normal'); doc.setFontSize(opt.size||10); doc.setTextColor(...(opt.color||INK));
    doc.splitTextToSize(t,W-(opt.indent||0)).forEach(l=>{ room(5.4); doc.text(l,L+(opt.indent||0),y); y+=4.8; }); y+=opt.after??1.8; };
  const section=t=>{ room(18); y+=2.5; doc.setFillColor(...SOFT); doc.rect(L,y-4.8,W,7,'F'); doc.setFont(PF(),'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY); doc.text(t.toUpperCase(),L+2.5,y); y+=7; };
  const q=s=>'« '+s.trim().replace(/\s*\n+\s*/g,' ')+' »';

  const medLine=String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n').filter(Boolean).join(', ');
  para(`Je soussigné(e) ${md.nom}, ${medLine}, n° RPPS ${md.rpps},`);
  para(`certifie avoir examiné le ${frDate(CM.dateExam)} à ${CM.heureExam.replace(':',' h ')}, ${CM.lieu.trim()},`);
  para(CM.ident==='declaree'
    ? `une personne qui me déclare se nommer ${who}, né${e_} le ${CM.ddn.trim()}${CM.adresse.trim()?', demeurant '+CM.adresse.trim():''} (identité déclarée, sans pièce d'identité).`
    : `${who}, né${e_} le ${CM.ddn.trim()}${CM.adresse.trim()?', demeurant '+CM.adresse.trim():''}.`,{after:3});
  if(CM.interprete.trim()) para(`L'examen a été réalisé avec l'aide de ${CM.interprete.trim()}, interprète${CM.langue.trim()?' en '+CM.langue.trim():''}${CM.lien.trim()?' (lien avec la personne : '+CM.lien.trim()+')':''}. Les propos de la personne ont été traduits.`);
  if(CM.tiers.trim()) para(`Personne présente pendant l'examen : ${CM.tiers.trim()}.`);

  section('A. Dires de la personne examinée');
  if(CM.faitsDate.trim()) para(`Faits déclarés : ${CM.faitsDate.trim()}.`);
  para('La personne déclare : '+q(CM.dires),{after:1});
  if(CM.doleances.trim()){ section('B. Doléances'); para('La personne se plaint de : '+q(CM.doleances)); }

  section(CM.doleances.trim()?'C. Examen clinique':'B. Examen clinique');
  if(CM.lesions.length){
    para('Sur le plan physique, je constate :',{bold:true,after:1});
    CM.lesions.forEach((l,i)=>{ const ph=cmPhotos.findIndex(z=>z.id==l.photo);
      const t=[l.type,l.loc.trim(),l.dim.trim()&&('dimensions '+l.dim.trim()),l.aspect.trim()].filter(Boolean).join(', ')+(ph>=0?` (photo ${ph+1})`:'')+'.';
      doc.setFont(PF(),'bold'); doc.setFontSize(10); doc.setTextColor(...INK); room(5.4); doc.text(`${i+1}.`,L+3,y);
      para(t,{indent:9,after:.5}); });
    y+=1.5;
  }
  if(CM.physique.trim()) para((CM.lesions.length?'':'Sur le plan physique : ')+CM.physique.trim());
  if(CM.psy.trim()) para('Sur le plan psychique : '+CM.psy.trim().replace(/\.?$/,'.'));
  if(CM.gene.trim()) para('Gêne fonctionnelle dans les actes de la vie courante : '+CM.gene.trim().replace(/\.?$/,'.'));
  if(CM.examens.trim()) para('Examens complémentaires et avis : '+CM.examens.trim().replace(/\.?$/,'.')+(CM.complement?' Un certificat complémentaire sera établi au vu des résultats.':''));
  else if(CM.complement) para('Un certificat complémentaire sera établi au vu des résultats.');
  if(cmPhotos.length) para(`${cmPhotos.length} photographie${cmPhotos.length>1?'s ont été réalisées':' a été réalisée'} avec l'accord de la personne ; ${cmPhotos.length>1?'elles sont jointes':'elle est jointe'} en annexe (planche photographique).`);
  if(CM.anterieur.trim()){ section((CM.doleances.trim()?'D':'C')+'. État antérieur'); para(CM.anterieur.trim()); }

  section('Conclusion');
  const n=cmItt();
  if(CM.ittMode==='fixee') para(`L'incapacité totale de travail (ITT), au sens pénal, est fixée à ${lt1000(n)} (${n}) jour${n>1?'s':''}, sous réserve de complications ultérieures.`,{bold:true});
  else para("L'incapacité totale de travail (ITT) n'est pas fixée à ce jour ; elle pourra être déterminée ultérieurement, notamment par un médecin légiste, au vu des éléments décrits.");
  y+=2; room(40);
  para(CM.remise==='requisition'
    ? `Certificat établi sur réquisition de ${CM.requerant.trim()}.`
    : `Certificat établi à la demande de l'intéressé${e_} et remis en main propre.`);
  room(30);
  doc.setFont(PF(),'normal'); doc.setFontSize(10.5); doc.setTextColor(...INK);
  doc.text(`Fait à ${st.ville||''},`,L,y+4); doc.text(`le ${frDate(redD)} à ${redH}.`,L,y+9.2);
  doc.setFont(PF(),'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY);
  doc.text(md.nom,R,y+4,{align:'right'}); doc.text('N° RPPS : '+md.rpps,R,y+9,{align:'right'});
  doc.setDrawColor(...GREY); doc.setLineWidth(.2); doc.setLineDashPattern([1.2,1.2],0); doc.rect(R-70,y+12,70,17); doc.setLineDashPattern([],0);
  doc.setFont(PF(),'normal'); doc.setFontSize(8); doc.setTextColor(...GREY); doc.text('Signature et cachet',R-35,y+27,{align:'center'});
  y+=30;

  /* Planche photographique */
  if(cmPhotos.length){
    const ph=[]; for(let i=0;i<cmPhotos.length;i++) ph.push(await cmPhotoJpeg(cmPhotos[i],i+1));
    const top=26, slotH=(footTop-top-4)/2;
    cmPhotos.forEach((x,i)=>{
      if(i%2===0){ doc.addPage(); doc.setFont(PF(),'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text('Planche photographique',L,18);
        doc.setFont(PF(),'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
        doc.text(`Annexe au certificat médical initial – ${who}, né${e_} le ${CM.ddn.trim()} – examen du ${frDate(CM.dateExam)}. Photographies réalisées avec l'accord de la personne.`,L,23,{maxWidth:W}); }
      const y0=top+(i%2)*slotH+4, capH=17, maxW=W, maxH=slotH-capH-4, im=ph[i];
      const k=Math.min(maxW/im.w,maxH/im.h), w=im.w*k, h=im.h*k, x0=L+(W-w)/2;
      doc.addImage(im.data,'JPEG',x0,y0,w,h); doc.setDrawColor(...SOFT); doc.setLineWidth(.3); doc.rect(x0,y0,w,h);
      let cy=y0+h+5; doc.setFont(PF(),'bold'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      doc.text(`Photo ${i+1}${x.legend.trim()?' – '+x.legend.trim():''}`,L,cy,{maxWidth:W});
      cy+=4.5; doc.setFont(PF(),'normal'); doc.setFontSize(8.5); doc.setTextColor(...GREY);
      doc.text(`Prise de vue : ${frDate(x.date)} à ${x.heure.replace(':',' h ')} (${cmSrcTxt(x)}). Fichier d'origine : ${x.name}`,L,cy,{maxWidth:W});
      if(x.hash){ cy+=4; doc.setFontSize(7); doc.text('Empreinte SHA-256 du fichier d’origine : '+x.hash,L,cy); }
    });
  }

  /* Numéros utiles (page à remettre à la personne) */
  if(CM.numeros){
    doc.addPage(); let yy=26;
    doc.setFont(PF(),'bold'); doc.setFontSize(15); doc.setTextColor(...NAVY); doc.text('Numéros utiles',L,yy); yy+=4;
    doc.setDrawColor(...ORANGE); doc.setLineWidth(1.2); doc.line(L,yy,L+40,yy); yy+=10;
    [['17 ou 112','Police, gendarmerie, urgences : en cas de danger immédiat.'],['114','Urgences par SMS, si vous ne pouvez pas parler.'],
     ['3919','Violences Femmes Info : écoute, informations et orientation. Gratuit, anonyme, 24 h/24 et 7 j/7.'],
     ['116 006','France Victimes : aide aux victimes, informations sur vos droits. Gratuit.'],
     ['arretonslesviolences.gouv.fr','Signaler des violences en ligne et échanger avec un policier ou un gendarme, 24 h/24.'],
     ['119','Allô Enfance en danger : si des enfants sont exposés aux violences.']].forEach(([a,b])=>{
      doc.setFont(PF(),'bold'); doc.setFontSize(13); doc.setTextColor(...INK); doc.text(a,L,yy);
      doc.setFont(PF(),'normal'); doc.setFontSize(10.5); doc.setTextColor(...GREY); doc.splitTextToSize(b,W).forEach((l,i)=>doc.text(l,L,yy+6+i*5)); yy+=20; });
    doc.setFontSize(10.5); doc.setTextColor(...INK);
    doc.splitTextToSize(`Ce certificat vous appartient : gardez-le en lieu sûr. Il peut être joint à une plainte, à une main courante ou à un dossier auprès d'un avocat. Notre équipe reste disponible : ${(st.entete||[]).slice(1).join(', ')}.`,W).forEach((l,i)=>doc.text(l,L,yy+i*5.4));
  }

  const N=doc.getNumberOfPages(), fy=297-12-(pied.length-1)*4;
  for(let pg=1;pg<=N;pg++){ doc.setPage(pg);
    pdfMarge(doc,pg,fy); pdfFilet(doc,PL,R,fy,ORANGE); doc.setFontSize(8); doc.setTextColor(...GREY);
    pdfPied(doc,pied,fy,PL);
    doc.setFont(PF(),'normal'); doc.setFontSize(7); doc.text(idLine,L,fy-9); doc.text(`${pg}/${N}`,R,fy-9,{align:'right'}); }
  const name=`Certificat-initial_${[CM.nom,CM.prenom].map(x=>x===BLANK?'':String(x).trim().slice(0,1).toUpperCase()).join('')}_${isoOr(CM.dateExam)}.pdf`.replace('__','_');
  const blob=doc.output('blob');
  openModal(`<h3 id="modal-title">Certificat prêt</h3>
    <p>${N} page${N>1?'s':''}${cmPhotos.length?`, dont ${Math.ceil(cmPhotos.length/2)} de photos`:''}. Rien n'a été enregistré.</p>
    <ol class="how compact"><li>Imprimez <b>deux exemplaires</b> et signez-les à la main.</li><li>Remettez l'original à la personne, en main propre.</li><li>Gardez le double dans le dossier médical (papier, ou le PDF téléchargé).</li></ol>
    <div class="btns"><button class="primary" id="cm-print">${ICON.print}Imprimer</button><button class="secondary" id="cm-dl">${ICON.dl}Télécharger le PDF</button>
    <button class="secondary" id="cm-done">Terminé : effacer le formulaire et les photos</button><button class="ghost" data-close>Revenir au formulaire</button></div>`,'send');
  $('#cm-print').onclick=()=>printBlob(blob,true);
  $('#cm-dl').onclick=()=>{ downloadBlob(blob,name); toast('PDF téléchargé'); };
  $('#cm-done').onclick=()=>{ closeModal(); cmReset(); renderCmi(); toast('C’est fait : formulaire et photos vidés'); };
}
cmBind();


/* ======================================================================
   12. OUTILS COMMUNS AUX COURRIERS PDF, ATTESTATION DE SUIVI,
       COURRIER AU MÉDECIN TRAITANT, MODE D'EMPLOI.
   Même règle que les autres formulaires : tout reste en mémoire, rien
   n'est enregistré, le formulaire s'efface à la fin.
   ====================================================================== */

/* --- Courrier PDF à l'en-tête BPM : renvoie le document et des outils d'écriture --- */
function letterPdf(title,subtitle){
  const {jsPDF}=window.jspdf; const doc=new jsPDF({unit:'mm',format:'a4'}); const st=structure;
  const C={NAVY:pdfRGB('--navy'),ORANGE:pdfRGB('--accent'),GREY:[93,103,121],INK:[20,32,58],SOFT:[238,241,246]}, {L,R,W,PL}=GEO();
  doc.setProperties({title:title||'Document',creator:'Librejo'});
  pdfLogo(doc,PL+2,14,30,28.2);
  doc.setFontSize(8.5); doc.setTextColor(...C.INK);
  pdfEntete(doc,PL,47,4);
  if(title){ doc.setTextColor(...C.NAVY); doc.setFont(PF(),'bold'); doc.setFontSize(16); doc.text(title,R,30,{align:'right'});
  doc.setDrawColor(...C.ORANGE); doc.setLineWidth(1.2); doc.line(R-78,34,R,34); }
  if(subtitle){ doc.setFont(PF(),'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.GREY); doc.text(subtitle,R,40,{align:'right'}); }
  const pied=st.pied||[], footTop=297-14-pied.length*4-8;
  const P={doc,C,L,R,W,y:72,
    room(n){ if(P.y+n>footTop){ doc.addPage(); P.y=25; } },
    para(t,o={}){ doc.setFont(PF(),o.bold?'bold':o.italic?'italic':'normal'); doc.setFontSize(o.size||10.5); doc.setTextColor(...(o.color||C.INK));
      doc.splitTextToSize(t,W-(o.indent||0)).forEach(l=>{ P.room(5.6); doc.text(l,L+(o.indent||0),P.y); P.y+=5.2; }); P.y+=o.after??2.5; },
    right(lines,o={}){ doc.setFont(PF(),o.bold?'bold':'normal'); doc.setFontSize(o.size||10.5); doc.setTextColor(...C.INK);
      lines.filter(Boolean).forEach(l=>{ doc.text(l,R,P.y,{align:'right'}); P.y+=5; }); P.y+=o.after??3; },
    /* « Fait à … » à gauche, signataire et cadre de signature à droite */
    sign(name,lines){ P.room(34); const y=P.y, d=new Date();
      doc.setFont(PF(),'normal'); doc.setFontSize(10.5); doc.setTextColor(...C.INK);
      doc.text(`Fait à ${st.ville||''},`,L,y+4); doc.text(`le ${frDate(today())}.`,L,y+9.2);
      doc.setFont(PF(),'bold'); doc.setFontSize(11); doc.setTextColor(...C.NAVY); doc.text(name,R,y+4,{align:'right'});
      let yy=y+4; doc.setFont(PF(),'normal'); doc.setFontSize(9); doc.setTextColor(...C.GREY);
      lines.filter(Boolean).forEach(t=>{ yy+=4.6; doc.text(t,R,yy,{align:'right'}); });
      doc.setDrawColor(...C.GREY); doc.setLineWidth(.2); doc.setLineDashPattern([1.2,1.2],0); doc.rect(R-70,yy+3,70,17); doc.setLineDashPattern([],0);
      doc.setFontSize(8); doc.text('Signature',R-35,yy+18,{align:'center'}); P.y=yy+24; },
    finish(name){ const N=doc.getNumberOfPages(), fy=297-12-(pied.length-1)*4;
      for(let pg=1;pg<=N;pg++){ doc.setPage(pg);
        pdfMarge(doc,pg,fy); pdfFilet(doc,PL,R,fy,C.ORANGE); doc.setFontSize(8); doc.setTextColor(...C.GREY);
        pdfPied(doc,pied,fy,PL);
        if(N>1){ doc.setFont(PF(),'normal'); doc.text(`${pg}/${N}`,R,fy-9,{align:'right'}); } }
      return new File([doc.output('blob')],name,{type:'application/pdf'}); }
  };
  return P;
}
const fmtCivNom=(civ,nom,prenom)=>`${civ} ${nom.trim().toUpperCase()} ${prenom.trim()}`;
const initiales=(nom,prenom)=>`${nom.trim().slice(0,1).toUpperCase()}${prenom.trim().slice(0,1).toUpperCase()}`;
/* Nom des PDF créés par les formulaires intégrés. Par défaut, rien sur la personne : le fichier peut rester
   dans Téléchargements ou dans les mails envoyés. Les initiales ne s'ajoutent que si l'admin les a choisies
   (Réglages › Nom des fichiers). */
const NOM_SORTIES=[['sans','Orientation-urgences_2026-11-25.pdf (par défaut : rien sur la personne)'],['initiales','Orientation-urgences_NT_2026-11-25.pdf : initiales de la personne']];
const outName=(type,nom,prenom,date)=>{ date=isoOr(date); if(nom===BLANK) nom=''; if(prenom===BLANK) prenom='';
  const ini=NOMMAGE().sortie==='initiales'&&String(nom||'').trim()?initiales(nom,prenom||'-'):''; return `${type}${ini?'_'+ini:''}_${date}.pdf`; };
const dateMask=v=>{ const d=v.replace(/\D/g,'').slice(0,8); return d.length>4?`${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`:d.length>2?`${d.slice(0,2)}/${d.slice(2)}`:d; };

/* --- Fenêtre « document prêt » : imprimer, télécharger ou envoyer par mail --- */
function readyModal({file,title,steps,mail,onDone}){
  deliver({files:[file],title,steps,mail,sensitive:true,onDone});
}

/* ======================================================================
   ATTESTATION DE SUIVI (obligation de soins, injonction thérapeutique…)
   Ne contient que la présence et la régularité du suivi : aucune
   information couverte par le secret médical.
   ====================================================================== */
const AS_CADRES=[['oblig','Obligation de soins'],['injonction','Injonction thérapeutique'],['judiciaire','Autre cadre judiciaire'],['simple','Suivi simple']];
const AS_CADRE_TXT={oblig:"dans le cadre d'une obligation de soins",injonction:"dans le cadre d'une injonction thérapeutique",judiciaire:'dans le cadre d’une mesure judiciaire'};
const AS_RYTHMES=['Hebdomadaire','Tous les 15 jours','Mensuel'];
let AS={}, asErr=false;
function asReset(){ AS={date:today(),signNom:'',signFonction:'',civ:'',nom:'',prenom:'',ddn:'',cadre:'',attention:'',reference:'',depuis:'',rdv:[],rdvNew:'',rythme:'',regulier:false,prochain:''}; asErr=false; }
asReset();
function asValidate(){
  const e=[];
  if(!medChoice()&&!(AS.signNom.trim()&&AS.signFonction.trim())) e.push(['sign','Signataire : choisissez un médecin, ou indiquez le nom et la fonction du professionnel qui signe.']);
  if(!AS.civ) e.push(['civ','Civilité manquante.']);
  if(!AS.nom.trim()) e.push(['nom','Nom manquant.']);
  if(!AS.prenom.trim()) e.push(['prenom','Prénom manquant.']);
  if(!parseDDN(AS.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!AS.cadre) e.push(['cadre','Cadre du suivi à choisir.']);
  if(!AS.depuis) e.push(['depuis','Date de début du suivi manquante.']);
  if(!AS.date) e.push(['date','Date de l’attestation manquante.']);
  if(AS.depuis&&AS.depuis>today()) e.push(['depuis','La date de début du suivi est dans le futur.']);
  return e;
}
function renderAtt(){
  const p=$('#p-att'); if(!p) return;
  const errs=asErr?asValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-a="${k}" value="${esc(AS[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const dt=k=>`<input class="in${B(k)}" type="date" data-a="${k}" value="${esc(AS[k])}">`;
  const md=medChoice();
  p.innerHTML=`<button class="backlink" data-aback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">📋</span>Attestation de suivi</h2>
    <p class="hint">Pour le SPIP, le juge, un employeur ou un hébergement. Elle n'atteste que la présence et la régularité du suivi : aucune information médicale.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Signataire</h3>
      <div class="fieldgrid">
        <div class="wide">${medSelectHTML('as-med')}</div>
        ${md?'':`${eqChips()}<label class="field"><span>Nom du signataire <small>(si ce n'est pas un médecin)</small></span>${txt('signNom','ex. Mme Dupont')}</label>
        <label class="field"><span>Fonction</span>${txt('signFonction','ex. éducatrice spécialisée')}</label>`}
        <label class="field"><span>Date de l'attestation</span>${dt('date')}</label>
      </div></div>
    <div class="card top w-form"><h3>Personne suivie</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg${B('civ')}">${['M.','Mme'].map(c=>`<button type="button" data-ac="civ" data-v="${c}" aria-pressed="${AS.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance</span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
      </div></div>
    <div class="card top w-form"><h3>Suivi</h3>
      <div class="field"><span>Cadre</span><div class="choice${B('cadre')}">${AS_CADRES.map(([v,l])=>`<button type="button" class="chip" data-ac="cadre" data-v="${v}" aria-pressed="${AS.cadre===v}">${l}</button>`).join('')}</div></div>
      <div class="fieldgrid">
        <label class="field"><span>Suivi depuis le</span>${dt('depuis')}</label>
        <label class="field"><span>Prochain rendez-vous <small>(facultatif)</small></span>${dt('prochain')}</label>
        <label class="field"><span>À l'attention de <small>(facultatif)</small></span>${txt('attention','ex. SPIP des Bouches-du-Rhône, M. …')}</label>
        <label class="field"><span>Référence du dossier <small>(facultatif)</small></span>${txt('reference','ex. n° de procédure')}</label>
      </div>
      <div class="field"><span>Rendez-vous honorés <small>(facultatif)</small></span>
        <div class="row gap-s"><input class="in date-add" type="date" data-a="rdvNew" value="${esc(AS.rdvNew)}" aria-label="Date d'un rendez-vous honoré"><button type="button" class="secondary" data-rdvadd>${ICON.plus}Ajouter</button></div>
        ${AS.rdv.length?`<div class="choice mt-s">${AS.rdv.map(d=>`<span class="rchip">${frDate(d)}<button type="button" data-rdvdel="${d}" aria-label="Retirer le ${frDate(d)}">×</button></span>`).join('')}</div>`:''}</div>
      <div class="field"><span>Rythme des rendez-vous <small>(facultatif)</small></span><div class="choice">${AS_RYTHMES.map(r=>`<button type="button" class="chip" data-ac="rythme" data-v="${r}" aria-pressed="${AS.rythme===r}">${r}</button>`).join('')}</div></div>
      <label class="check plain"><input type="checkbox" data-acb="regulier" ${AS.regulier?'checked':''}> Indiquer que le suivi est régulier</label></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-ago>${ICON.file}Créer l'attestation (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-aclear>${ICON.trash}Tout effacer</button></div>`;
}
function attBind(){
  const p=$('#p-att'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.a) return; let v=t.value;
    if(t.dataset.a==='ddn'){ v=dateMask(v); if(v!==t.value) t.value=v; }
    AS[t.dataset.a]=v; if(asErr) t.classList.remove('bad'); });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.acb){ AS[t.dataset.acb]=t.checked; return; }
    if(t.matches('[data-med]')) setTimeout(renderAtt,0); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-aback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-ac]'); if(c){ const k=c.dataset.ac; AS[k]=AS[k]===c.dataset.v&&k!=='civ'?'':c.dataset.v; renderAtt(); return; }
    if(t.closest('[data-rdvadd]')){ const d=AS.rdvNew; if(!d){ toast('Choisissez d’abord une date'); return; } if(!AS.rdv.includes(d)) AS.rdv.push(d); AS.rdv.sort(); AS.rdvNew=''; renderAtt(); return; }
    const rd=t.closest('[data-rdvdel]'); if(rd){ AS.rdv=AS.rdv.filter(d=>d!==rd.dataset.rdvdel); renderAtt(); return; }
    if(t.closest('[data-aclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ asReset(); renderAtt(); }); return; }
    if(t.closest('[data-ago]')) attPdf();
  });
}
function attPdf(){
  const errs=LIVE_DRY?[]:(asErr=true,asValidate());
  if(missingStop(errs,'#p-att',renderAtt,attPdf,()=>AS)) return;
  const st=structure, md=medChoice(), fem=AS.civ==='Mme', e_=fem?'e':'';
  const who=fmtCivNom(AS.civ,AS.nom,AS.prenom);
  const P=letterPdf('Attestation de suivi','');
  if(AS.attention.trim()||AS.reference.trim()){ P.right([AS.attention.trim()&&'À l’attention de : '+AS.attention.trim(),AS.reference.trim()&&'Réf. : '+AS.reference.trim()]); P.y+=2; }
  const signName=md?md.nom:AS.signNom.trim(), signFn=md?'médecin':AS.signFonction.trim();
  P.para(`Je soussigné(e) ${signName}, ${signFn} ${st.nom?'au sein de '+st.nom:''}, atteste que ${who}, né${e_} le ${AS.ddn.trim()}, est suivi${e_} dans notre structure depuis le ${frDate(AS.depuis)}${AS_CADRE_TXT[AS.cadre]?', '+AS_CADRE_TXT[AS.cadre]:''}.`);
  if(AS.rdv.length) P.para(`${fem?'Elle':'Il'} s'est présenté${e_} ${AS.rdv.length>1?'aux rendez-vous des':'au rendez-vous du'} ${AS.rdv.map(frDate).join(', ').replace(/, ([^,]*)$/,' et $1')}.`);
  if(AS.rythme) P.para(`Rythme des rendez-vous : ${AS.rythme.toLowerCase()}.`);
  if(AS.regulier) P.para('Le suivi est régulier.');
  if(AS.prochain) P.para(`Prochain rendez-vous prévu le ${frDate(AS.prochain)}.`);
  P.y+=2;
  P.para("Cette attestation ne comporte aucune information couverte par le secret médical.",{italic:true,color:P.C.GREY,size:9.5});
  P.para(`Attestation établie à la demande de l'intéressé${e_} et remise en main propre pour faire valoir ce que de droit.`,{after:6});
  P.sign(signName,md?['N° RPPS : '+md.rpps,...String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n')]:[AS.signFonction.trim(),st.nom]);
  const file=P.finish(outName('Attestation-suivi',AS.nom,AS.prenom,AS.date||today()));
  readyModal({file,title:'Attestation prête',steps:['Imprimez-la et signez-la.','Remettez-la à la personne, ou envoyez-la avec son accord.'],
    mail:{to:[],subject:`${st.nom} – Attestation de suivi – ${frDate(AS.date||today())}`,body:`Bonjour,\n\nVeuillez trouver ci-jointe une attestation de suivi, transmise avec l'accord de la personne concernée.\n\nCordialement,\n${signName}`},
    onDone:()=>{ asReset(); renderAtt(); }});
}

/* ======================================================================
   COURRIER AU MÉDECIN TRAITANT
   ====================================================================== */
const MT_OBJETS=['Information de suivi','Compte rendu de consultation',"Demande d'avis",'Fin de suivi'];
let MT={}, mtErr=false, mtRecip=null;
function mtReset(){ MT={date:today(),dest:'',adresse:'',objet:'',civ:'',nom:'',prenom:'',ddn:'',trt:'',dose:'',autres:'',texte:'',demande:'',consent:false}; mtErr=false; }
mtReset();
function mtValidate(){
  const e=[];
  if(!medChoice()) e.push(['med',meds().length?'Choisissez le médecin qui signe le courrier.':'Aucun médecin enregistré : un admin doit les ajouter dans Administration › Réglages.']);
  if(!MT.dest.trim()) e.push(['dest','Médecin destinataire manquant.']);
  if(!MT.date) e.push(['date','Date du courrier manquante.']);
  if(!MT.objet) e.push(['objet','Objet du courrier à choisir.']);
  if(!MT.civ) e.push(['civ','Civilité manquante.']);
  if(!MT.nom.trim()) e.push(['nom','Nom manquant.']);
  if(!MT.prenom.trim()) e.push(['prenom','Prénom manquant.']);
  if(!parseDDN(MT.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(tsoOn()&&MT.trt&&MT.trt!=='Aucun'&&!(parseDose(MT.dose)>0)) e.push(['dose','Posologie du traitement de substitution (mg par jour) manquante.']);
  if(!MT.texte.trim()) e.push(['texte','Texte du courrier manquant.']);
  if(!MT.consent) e.push(['consent',"Cochez que le patient est informé de ce courrier et ne s'y oppose pas."]);
  return e;
}
function renderMt(){
  const p=$('#p-mt'); if(!p) return;
  const errs=mtErr?mtValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-m="${k}" value="${esc(MT[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const area=(k,ph,rows=3)=>`<textarea class="in${B(k)}" data-m="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(MT[k])}</textarea>`;
  const words=parseDose(MT.dose)>0?doseLettres(MT.dose)+' par jour':'';
  p.innerHTML=`<button class="backlink" data-mback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">✉️</span>Courrier au médecin traitant</h2>
    <p class="hint">Information de suivi, compte rendu, demande d'avis ou fin de suivi, avec l'accord du patient.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Destinataire</h3>
      <div class="fieldgrid">
        <label class="field wide partpick"><span>Médecin destinataire <small>(choisir dans l'annuaire ou écrire)</small></span><input class="in${B('dest')}" data-m="dest" list="mt-parts" value="${esc(MT.dest)}" placeholder="ex. Dr Martin" autocomplete="off">
          <datalist id="mt-parts">${ANNU.partenaires.filter(x=>/medecin|generaliste|sante/.test(norm(x.type))).map(x=>`<option value="${esc(x.nom)}">${esc(x.type)}</option>`).join('')}</datalist></label>
        <label class="field wide"><span>Adresse <small>(facultatif, pour un envoi postal)</small></span>${area('adresse','ex. 12 rue …\n13000 Ville',2)}</label>
        <label class="field"><span>Date du courrier</span><input class="in${B('date')}" type="date" data-m="date" value="${esc(MT.date)}"></label>
        <div>${medSelectHTML('mt-med').replace('class="in"','class="in'+B('med')+'"')}</div>
      </div>
      <div class="field"><span>Objet</span><div class="choice${B('objet')}">${MT_OBJETS.map(o=>`<button type="button" class="chip" data-mc="objet" data-v="${esc(o)}" aria-pressed="${MT.objet===o}">${esc(o)}</button>`).join('')}</div></div></div>
    <div class="card top w-form"><h3>Patient</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg${B('civ')}">${['M.','Mme'].map(c=>`<button type="button" data-mc="civ" data-v="${c}" aria-pressed="${MT.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance</span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
      </div></div>
    <div class="card top w-form"><h3>Courrier</h3>
      ${tsoOn()?`<div class="field"><span>Traitement de substitution en cours <small>(facultatif)</small></span><div class="choice">${['Aucun',...RELAIS_TRT].map(t=>`<button type="button" class="chip" data-mc="trt" data-v="${esc(t)}" aria-pressed="${MT.trt===t}">${esc(t)}</button>`).join('')}</div></div>`:''}
      ${tsoOn()&&MT.trt&&MT.trt!=='Aucun'?`<label class="field"><span>Posologie</span><div class="dose dose-sm"><input class="in${B('dose')}" data-m="dose" value="${esc(MT.dose)}" inputmode="decimal"><em>mg/j</em></div><small class="dosew">${esc(words)}</small></label>`:''}
      <label class="field"><span>Autres traitements <small>(facultatif)</small></span>${area('autres','',2)}</label>
      <label class="field"><span>Texte du courrier</span>${area('texte','Situation, suivi, éléments utiles au confrère…',7)}</label>
      <label class="field"><span>Demande ou conclusion <small>(facultatif)</small></span>${area('demande',"ex. Pourriez-vous prendre le relais de la prescription à partir du … ?",2)}</label>
      <label class="check${B('consent')?' warn-text':''}"><input type="checkbox" data-mcb="consent" ${MT.consent?'checked':''}> Le patient est informé de ce courrier et ne s'y oppose pas</label></div>
    <div class="card top blue w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : vous pourrez aussi imprimer le courrier)</small></span>${recipHTML('mt-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-mgo>${ICON.file}Créer le courrier (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-mclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=mtRecip?mtRecip.get():[]; mtRecip=bindRecip(p.querySelector('#mt-rc'),prev);
}
function mtBind(){
  const p=$('#p-mt'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.m) return; let v=t.value;
    if(t.dataset.m==='ddn'){ v=dateMask(v); if(v!==t.value) t.value=v; }
    MT[t.dataset.m]=v; if(mtErr) t.classList.remove('bad');
    if(t.dataset.m==='dose'){ const w=p.querySelector('.dosew'); if(w) w.textContent=parseDose(v)>0?doseLettres(v)+' par jour':''; } });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.mcb){ MT[t.dataset.mcb]=t.checked; if(mtErr) renderMt(); return; }
    if(t.dataset.m==='dest'){ const x=ANNU.partenaires.find(z=>z.nom===t.value.trim()); if(x){ if(mtRecip) x.emails.forEach(m=>mtRecip.add(m)); if(!MT.adresse.trim()&&x.adresse){ MT.adresse=partAddr(x); } renderMt(); } }
    if(t.matches('[data-med]')&&mtErr) setTimeout(renderMt,0); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-mback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-mc]'); if(c){ const k=c.dataset.mc; MT[k]=MT[k]===c.dataset.v&&k!=='civ'?'':c.dataset.v; renderMt(); return; }
    if(t.closest('[data-mclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ mtReset(); mtRecip=null; renderMt(); }); return; }
    if(t.closest('[data-mgo]')) mtPdf();
  });
}
function mtPdf(){
  const errs=LIVE_DRY?[]:(mtErr=true,mtValidate());
  if(missingStop(errs,'#p-mt',renderMt,mtPdf,()=>MT)) return;
  const st=structure, md=medChoice(), fem=MT.civ==='Mme', e_=fem?'e':'';
  const who=fmtCivNom(MT.civ,MT.nom,MT.prenom);
  const P=letterPdf('Courrier médical','Confidentiel – secret médical');
  P.y=64; P.right([MT.dest.trim(),...MT.adresse.split('\n').map(s=>s.trim())],{after:6});
  P.right([`${villeLe(st)}${frDate(MT.date||today())}`],{after:5});
  P.para(`Objet : ${MT.objet} – ${who}, né${e_} le ${MT.ddn.trim()}`,{bold:true,after:5});
  P.para('Chère consœur, cher confrère,',{after:4});
  MT.texte.trim().split(/\n\s*\n/).forEach(par=>P.para(par.replace(/\s*\n\s*/g,' ')));
  if(!tsoOn()) MT.trt='';
  if(MT.trt&&MT.trt!=='Aucun') P.para(`Traitement de substitution en cours : ${MT.trt}, ${doseTxt(MT.dose)}.`);
  else if(MT.trt==='Aucun') P.para('Pas de traitement de substitution en cours.');
  if(MT.autres.trim()) P.para('Autres traitements : '+MT.autres.trim().replace(/\s*\n\s*/g,' ; ').replace(/\.?$/,'.'));
  if(MT.demande.trim()) P.para(MT.demande.trim());
  P.para(`${fem?'La patiente':'Le patient'} est informé${e_} de ce courrier.`,{italic:true,color:P.C.GREY,size:9.5});
  P.para('Je reste à votre disposition et vous prie de croire, chère consœur, cher confrère, à l’assurance de mes sentiments confraternels.',{after:6});
  P.sign(md.nom,['N° RPPS : '+md.rpps,...String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n')]);
  const file=P.finish(outName('Courrier-medecin',MT.nom,MT.prenom,MT.date||today()));
  readyModal({file,title:'Courrier prêt',steps:['Imprimez-le et signez-le pour un envoi postal, ou envoyez-le par mail.'],
    mail:{to:mtRecip?mtRecip.get():[],subject:`${st.nom} – ${MT.objet} – courrier médical`,
      body:`Chère consœur, cher confrère,\n\nVeuillez trouver ci-joint un courrier concernant ${fem?'une patiente':'un patient'} que nous suivons en commun.\n\nBien confraternellement,\n${md.nom}`},
    onDone:()=>{ mtReset(); mtRecip=null; renderMt(); }});
}

/* ======================================================================
   MODE D'EMPLOI : 3 écrans, montré une fois par poste, rouvrable depuis le menu
   ====================================================================== */
/* Le texte suit les réglages de la structure : formulaires proposés, mail, adresses d'envoi */
function guideSteps(){
  const short=t=>{ const x=String(t).replace(/^cerfa\s*[\d*]+\s*:\s*/i,'').replace(/^(trame|dlu)\s*:\s*/i,'').replace(/\s*[(:–].*$/,'').trim(); return /^[A-ZÀ-Ý][a-zà-ÿ’']/.test(x)?x.charAt(0).toLowerCase()+x.slice(1):x; };
  const ex=[...new Set([...docs().filter(d=>!isLink(d)).slice(0,2),...docs().filter(isLink).slice(0,1),...formItems().slice(0,1)].map(x=>short(x.titre)).filter(Boolean))].slice(0,3).map(t=>`« ${esc(t)} »`);
  const F=formItems().filter(f=>!String(f.id).startsWith('cerfa:')), nF=F.length, C=cerfaDocs().length;
  const fl=F.slice(0,4).map(f=>esc(f.titre)).join(', ')+(nF>4?`, et ${nF-4} autre${nF-4>1?'s':''}`:'');
  const env=(PAR.envoi||[]).filter(Boolean), web=PAR.mail==='web';
  const mail=PAR.sansMail?'Imprimez le PDF ou téléchargez-le.'
    :web?'Pour l’envoyer, le PDF est téléchargé et votre messagerie s’ouvre : joignez-y le fichier.'
    :'Le mail s’ouvre en brouillon dans Outlook, avec le PDF joint.';
  const exp=PAR.sansMail||!env.length?'':env.length===1?` L’adresse d’envoi de l’équipe est <b>${esc(env[0])}</b>.`:` Choisissez l’expéditeur parmi ${env.slice(0,-1).map(m=>`<b>${esc(m)}</b>`).join(', ')} et <b>${esc(env[env.length-1])}</b>.`;
  return [
  {ico:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',t:'Trouver un document',
   p:[`Tapez ce que vous cherchez, même sans cliquer dans la barre${ex.length?' : '+ex.join(', ')+'…':'.'}`,'À gauche, les catégories. Cliquez sur le titre d’un document pour l’ouvrir ; dessous : <b>Imprimer</b>, <b>Envoyer</b> par mail, ou <b>Remplir</b> pour les modèles Word.']},
  {ico:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h4"/>',t:'Remplir un formulaire',
   p:[nF?`Page <b>Formulaires</b> : ${fl}.${C?` Et ${C>1?C+' Cerfa':'un Cerfa'} déjà rempli${C>1?'s':''} avec les infos de la structure.`:''}`:'Page <b>Formulaires</b> : l’admin y ajoute les formulaires de la structure.',
     `Librejo crée le PDF sur ce poste, puis efface le formulaire : <b>rien n’est enregistré</b>. ${mail}${exp}`]},
  {ico:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',t:'Et aussi',
   p:['<b>Impression rapide</b> : les documents choisis par l’admin, le nombre d’exemplaires de chacun, puis un clic sur « Imprimer ».','<b>Annuaire</b> : les partenaires, pour écrire par exemple à tous les partenaires d’un même type d’un coup.',
     'En bas à gauche, <b>Dossier connecté</b> indique que Librejo lit bien le dossier de la structure (sinon, cliquez dessus pour l’autoriser). L’<b>accès admin</b> sert à ajouter ou remplacer des documents.']},
  ]; }
function openGuide(i=0){
  const GUIDE=guideSteps(), g=GUIDE[i], last=i===GUIDE.length-1;
  openModal(`<div class="guide">
    <div class="guide-ico">${svg(g.ico)}</div>
    <p class="guide-step">${i+1} / ${GUIDE.length}</p>
    <h3 id="modal-title">${g.t}</h3>
    ${g.p.map(x=>`<p>${x}</p>`).join('')}
    ${last?`<p class="guide-about">Librejo, ${esc((($('#gen-ver')||{}).textContent||'').replace(/^V/,'v'))}${DATA.maj?' · liste des documents mise à jour le '+esc(frDate(DATA.maj)):''}</p>`:''}
    <div class="guide-dots" aria-hidden="true">${GUIDE.map((_,k)=>`<span${k===i?' class="on"':''}></span>`).join('')}</div>
    <div class="row between">${i?`<button class="secondary" data-gprev>Précédent</button>`:`<button class="ghost" data-gskip>Passer</button>`}
      <button class="primary" data-gnext>${last?'C’est parti':'Suivant'}</button></div></div>`);
  const box=$('#modal-box'), done=()=>{ try{ localStorage.setItem('docubus-guide','vu'); }catch(e){} closeModal(); };
  box.querySelector('[data-gnext]').onclick=()=>last?done():openGuide(i+1);
  const pr=box.querySelector('[data-gprev]'); if(pr) pr.onclick=()=>openGuide(i-1);
  const sk=box.querySelector('[data-gskip]'); if(sk) sk.onclick=done;
  box.querySelector('[data-gnext]').focus();
}
const guideSeen=()=>{ try{ return !!localStorage.getItem('docubus-guide'); }catch(e){ return true; } };
function guideInit(){
  const b=$('#guidebtn'); if(b) b.onclick=()=>openGuide(0);
  // jamais par-dessus l'assistant de première installation : il est montré après « C’est parti »
  if(!guideSeen()&&!SANS) setTimeout(()=>{ const wz=document.getElementById('wiz'); if($('#modal').hidden&&!wizNeeded()&&!(wz&&!wz.hidden)) openGuide(0); },700);
}
attBind(); mtBind(); guideInit();


/* ======================================================================
   13. CERTIFICAT LIBRE et ORDONNANCE
   Même règle : tout reste en mémoire, rien n'est enregistré sur le patient.
   La liste des médicaments de l'ordonnance est modifiable par l'admin
   (enregistrée dans app/donnees.js : DATA.ordonnance).
   ====================================================================== */

/* --------------------------- Certificat libre --------------------------- */
let CL={}, clErr=false;
function clReset(){ CL={date:today(),civ:'',nom:'',prenom:'',ddn:'',examine:false,texte:'',remise:true}; clErr=false; }
clReset();
function clValidate(){
  const e=[];
  if(!medChoice()) e.push(['med',meds().length?'Choisissez le médecin qui signe.':'Aucun médecin enregistré : un admin doit les ajouter dans Administration › Réglages.']);
  if(!CL.date) e.push(['date','Date manquante.']);
  if(CL.examine&&!(CL.civ&&CL.nom.trim()&&CL.prenom.trim())) e.push(['nom','« Avoir examiné ce jour » : civilité, nom et prénom du patient nécessaires.']);
  if(CL.ddn.trim()&&!parseDDN(CL.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!CL.texte.trim()) e.push(['texte','Texte du certificat manquant.']);
  return e;
}
function clStart(){
  const md=medChoice(), e_=CL.civ==='Mme'?'e':'';
  const who=CL.civ&&CL.nom.trim()?fmtCivNom(CL.civ,CL.nom,CL.prenom)+(parseDDN(CL.ddn.trim())?`, né${e_} le ${CL.ddn.trim()},`:''):'';
  return `Je soussigné(e), ${md?md.nom:'Dr …'}, certifie ${CL.examine&&who?`avoir examiné ce jour ${who} et `:''}que`;
}
function renderCl(){
  const p=$('#p-cl'); if(!p) return;
  const errs=clErr?clValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-cl="${k}" value="${esc(CL[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  p.innerHTML=`<button class="backlink" data-clback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🖊️</span>Certificat libre</h2>
    <p class="hint">« Je soussigné(e), Dr X, certifie que… » : choisissez le médecin et la date, écrivez la suite.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Médecin et date</h3>
      <div class="fieldgrid">
        <div>${medSelectHTML('cl-med').replace('class="in"','class="in'+B('med')+'"')}</div>
        <label class="field"><span>Date</span><input class="in${B('date')}" type="date" data-cl="date" value="${esc(CL.date)}"></label>
      </div></div>
    <div class="card top w-form"><h3>Patient <small class="muted">(facultatif)</small></h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg">${['M.','Mme'].map(c=>`<button type="button" data-clc="civ" data-v="${c}" aria-pressed="${CL.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance</span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
      </div>
      <label class="check plain"><input type="checkbox" data-clb="examine" ${CL.examine?'checked':''}> Commencer par « certifie avoir examiné ce jour [patient] et que… »</label></div>
    <div class="card top w-form"><h3>Texte</h3>
      <p class="cl-start" id="cl-start">${esc(clStart())}</p>
      <label class="field"><span>Suite du texte</span><textarea class="in${B('texte')}" data-cl="texte" rows="7" placeholder="ex. son état de santé ne contre-indique pas la pratique du sport.">${esc(CL.texte)}</textarea></label>
      <label class="check plain"><input type="checkbox" data-clb="remise" ${CL.remise?'checked':''}> Ajouter « Certificat établi à la demande de l'intéressé(e) et remis en main propre pour faire valoir ce que de droit. »</label></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-clgo>${ICON.file}Créer le certificat (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-clclear>${ICON.trash}Tout effacer</button></div>`;
}
function clBind(){
  const p=$('#p-cl'); if(!p) return;
  const upd=()=>{ const s=$('#cl-start'); if(s) s.textContent=clStart(); };
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.cl) return; let v=t.value;
    if(t.dataset.cl==='ddn'){ v=dateMask(v); if(v!==t.value) t.value=v; }
    CL[t.dataset.cl]=v; if(clErr) t.classList.remove('bad'); upd(); });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.clb){ CL[t.dataset.clb]=t.checked; upd(); return; }
    if(t.matches('[data-med]')) setTimeout(upd,0); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-clback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-clc]'); if(c){ CL.civ=c.dataset.v; renderCl(); return; }
    if(t.closest('[data-clclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ clReset(); renderCl(); }); return; }
    if(t.closest('[data-clgo]')) clPdf();
  });
}
function clPdf(){
  const errs=LIVE_DRY?[]:(clErr=true,clValidate());
  if(missingStop(errs,'#p-cl',renderCl,clPdf,()=>CL)) return;
  const md=medChoice(), e_=CL.civ==='Mme'?'e':'';
  const P=letterPdf('Certificat médical','');
  P.y=80;
  const body=clStart()+' '+CL.texte.trim().replace(/^que\s+/i,'');
  body.split(/\n\s*\n/).forEach(par=>P.para(par.replace(/\s*\n\s*/g,' '),{size:11,after:4}));
  if(CL.remise){ P.y+=2; P.para(`Certificat établi à la demande de l'intéressé${CL.civ?e_:'(e)'} et remis en main propre pour faire valoir ce que de droit.`,{after:8}); }
  else P.y+=6;
  P.sign(md.nom,['N° RPPS : '+md.rpps,...String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n')]);
  const file=P.finish(outName('Certificat',CL.nom,CL.prenom,CL.date));
  readyModal({file,title:'Certificat prêt',steps:['Imprimez-le, signez-le et tamponnez-le.'],onDone:()=>{ clReset(); renderCl(); }});
}

clBind();

/* ======================================================================
   13. LIENS WEB (documents qui sont une adresse internet),
       catégories Hébergement / Précarité et Cure,
       formulaire « Orientation aux urgences ».
   ====================================================================== */
const isLink=d=>!!d&&d.ext==='lien';
function linkHost(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } }
const ICON_LINK=svg('<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/>');
const DOTS=svg('<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>');
const linkById=id=>DATA.documents.find(d=>isLink(d)&&d.id===id);
/* Vignette d'un lien sans miniature : une petite « page » dessinée avec le titre et le site, sans rien demander à Internet */
function linkVignette(d){
  const host=linkHost(d.url), off=/(^|\.)(gouv\.fr|service-public\.(gouv\.)?fr|ameli\.fr|caf\.fr|has-sante\.fr|legifrance\.gouv\.fr)$/.test(host);
  return `<span class="lvig${off?' off':''}"><span class="lvig-top">${off?'🏛️':ICON_LINK}<small>${esc(host)}</small></span><b>${esc(excerpt(d.titre,90))}</b>${d.description?`<span class="lvig-desc">${esc(excerpt(d.description,120))}</span>`:''}<span class="lvig-foot">${off?'Site officiel':'Page web'} · s’ouvre en ligne</span></span>`;
}
/* Miniature choisie par l'admin : image collée (capture d'écran) ou fichier */
function linkThumb(d){
  openModal(`<h3 id="modal-title">Miniature du lien</h3>
    <p>Faites une capture de la page (<b>Windows + Maj + S</b>), puis <b>collez-la ici avec Ctrl + V</b>. Vous pouvez aussi choisir une image.</p>
    <div id="lt-zone" class="lt-zone" tabindex="0">${thumbSrc(d)?`<img src="${thumbSrc(d)}" alt="Miniature actuelle">`:'<span class="hint">Collez une image ici</span>'}</div>
    <div class="btns"><label class="secondary">${ICON.up}Choisir une image<input type="file" id="lt-file" accept="image/*" hidden></label>
      ${d.miniature?'<button class="ghost danger" id="lt-del">Revenir à la vignette automatique</button>':''}<button class="secondary" data-close>Fermer</button></div>`);
  const z=$('#lt-zone'); setTimeout(()=>z.focus(),50);
  const save=async blob=>{ try{ const im=await createImageBitmap(blob), W=480, H=Math.round(480*4/3), c=document.createElement('canvas'); c.width=W; c.height=H;
      const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,W,H); const k=W/im.width; g.drawImage(im,0,0,W,im.height*k);
      const jpg=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));
      const ok=await run(async()=>{ await writeRel(`${THUMB_DIR}/${d.id}.jpg`,jpg); d.miniature=Date.now().toString(36); await saveData(); },'Miniature enregistrée');
      if(ok){ closeModal(); renderDocs(); } }catch(e){ toast('Cette image ne s’ouvre pas : essayez un PNG ou un JPEG.'); } };
  const onPaste=e=>{ const it=[...(e.clipboardData||{}).items||[]].find(x=>x.type.startsWith('image/')); if(it){ e.preventDefault(); save(it.getAsFile()); } };
  document.addEventListener('paste',onPaste); const stop=()=>document.removeEventListener('paste',onPaste);
  $('#modal').addEventListener('click',function f(ev){ if(ev.target.closest('[data-close]')||ev.target.id==='modal'){ stop(); $('#modal').removeEventListener('click',f); } });
  $('#lt-file').onchange=e=>{ const f=e.target.files[0]; if(f){ stop(); save(f); } };
  const del=$('#lt-del'); if(del) del.onclick=async()=>{ const old=d.miniature; delete d.miniature; if(await run(saveData,'Vignette automatique rétablie')){ stop(); closeModal(); renderDocs(); } else d.miniature=old; };
}

function linkRow(d,ts,showCat){
  const u=esc(safeHref(d.url)||'#');
  return `<tr><td class="col-icon"><span class="ico lien" aria-hidden="true">${ICON_LINK}</span></td>
    <td class="t"><a href="${u}" target="_blank" rel="noopener">${hl(d.titre,ts)}</a><span class="badge">Lien web</span>${isAdmin&&d.epingle?' <span title="Épinglé en accueil">★</span>':''}
      <small>${showCat?esc(destName(destOf(d)))+' · ':(d.sous&&!filter.includes('/')?esc(d.sous)+' · ':'')}${esc(linkHost(d.url))}</small>
      ${d.description?`<span class="desc">${hl(excerpt(d.description,ts),ts)}</span>`:''}
      ${(d.motscles||[]).length?`<div>${d.motscles.map(m=>`<span class="badge">${hl(m,ts)}</span>`).join('')}</div>`:''}</td>
    <td class="num"></td><td class="num">${docDate(d.date)}</td>
    <td><div class="act">
      <a class="iconbtn" href="${u}" target="_blank" rel="noopener" title="Ouvrir le lien" aria-label="Ouvrir ${esc(d.titre)}">${ICON.open}</a>
      <button class="lbtn" data-lsend="${esc(d.id)}" aria-label="Envoyer le lien ${esc(d.titre)} par mail">${ICON.mail}Envoyer</button>
      <button class="lbtn more" data-lmore="${esc(d.id)}" title="${isAdmin?'Modifier, archiver…':'Plus d’actions'}" aria-label="${isAdmin?'Gérer':'Plus d’actions pour'} ${esc(d.titre)}" aria-haspopup="menu">${DOTS}${isAdmin?'Gérer':'Plus'}</button>
    </div></td></tr>`;
}
function linkCard(d,ts,showCat){
  const u=esc(safeHref(d.url)||'#');
  return `<div class="gcard">
    <a class="gthumb lien${thumbSrc(d)?'':' auto'}" href="${u}" target="_blank" rel="noopener" ${thumbSrc(d)?`aria-label="Ouvrir ${esc(d.titre)}"`:'tabindex="-1" aria-hidden="true"'}>${thumbSrc(d)?`<img src="${thumbSrc(d)}" alt="" loading="lazy" data-err="remove">`:linkVignette(d)}</a>
    <div class="gbody"><b><a class="gtitle" href="${u}" target="_blank" rel="noopener">${hl(d.titre,ts)}</a></b><span class="badge m-0 self-start">Lien web</span><small>${showCat?esc(catName(d.categorie))+' · ':''}${docDate(d.date)}</small></div>
    <div class="gact">
      <a class="iconbtn" href="${u}" target="_blank" rel="noopener" title="Ouvrir le lien" aria-label="Ouvrir ${esc(d.titre)}">${ICON.open}</a>
      <button class="lbtn" data-lsend="${esc(d.id)}" aria-label="Envoyer le lien ${esc(d.titre)} par mail">${ICON.mail}Envoyer</button>
      <button class="iconbtn" data-lmore="${esc(d.id)}" title="Plus d'actions" aria-label="Plus d'actions pour ${esc(d.titre)}" aria-haspopup="menu">${DOTS}</button>
    </div></div>`;
}

/* Envoyer un lien : pas de pièce jointe, juste l'adresse dans le mail */
function sendLink(d){
  sendDialog(`Envoyer le lien « ${d.titre} »`,'',0,async to=>{
    await mailCompose({to,subject:`Librejo – ${d.titre}`,body:`Bonjour,\n\nVoici le lien vers : ${d.titre}\n${d.url}\n\nCordialement`});
  });
}
function linkMenu(btn,d){
  if(document.getElementById('menu')){ closeMenu(); return; }
  const items=[['Copier le lien',ICON.copy,()=>copyText(d.url).then(ok=>toast(ok?'Lien copié':'Copie impossible'))]];
  if(isAdmin){ items.push(['Modifier le lien',ICON.pen,()=>editLink(d)]); items.push(['Changer la miniature',ICON.file,()=>linkThumb(d)]); items.push(['Retirer ce lien de Librejo',ICON.trash,()=>delLink(d)]); }
  const m=document.createElement('div'); m.id='menu'; m.className='menu'; m.setAttribute('role','menu');
  m.innerHTML=items.map((it,i)=>`<button role="menuitem" data-i="${i}">${it[1]}<span>${esc(it[0])}</span></button>`).join('');
  document.body.appendChild(m);
  const r=btn.getBoundingClientRect(), w=m.offsetWidth;
  m.style.top=(window.scrollY+r.bottom+6)+'px'; m.style.left=Math.max(8,window.scrollX+r.right-w)+'px';
  m.addEventListener('click',e=>{ const b=e.target.closest('[data-i]'); if(!b) return; closeMenu(); btn.focus(); items[+b.dataset.i][2](); });
  menuWire(m,btn);
  m.querySelector('button').focus();
  setTimeout(()=>document.addEventListener('mousedown',linkMenuOutside,true),0);
}
function linkMenuOutside(e){ if(!e.target.closest('#menu')&&!e.target.closest('[data-lmore]')){ closeMenu(); document.removeEventListener('mousedown',linkMenuOutside,true); } }
document.addEventListener('click',e=>{
  const s=e.target.closest('[data-lsend]'); if(s){ const d=linkById(s.dataset.lsend); d&&sendLink(d); return; }
  const m=e.target.closest('[data-lmore]'); if(m){ const d=linkById(m.dataset.lmore); d&&linkMenu(m,d); return; }
  if(e.target.closest('[data-a="addlink"]')) editLink(null);
});

/* Ajouter ou modifier un lien (admin) */
function editLink(d){
  const cur=d?destOf(d):(filter&&filter!=='recent'&&filter!=='kits'?filter:(cats()[0]||{}).id||'');
  openModal(`<h3 id="modal-title">${d?'Modifier le lien':'Ajouter un lien web'}</h3>
    <p class="hint">Pour un formulaire ou une page qui change souvent : Librejo ouvre toujours la version en ligne.</p>
    <div class="fieldgrid">
      <label class="field wide"><span>Adresse du lien</span><input class="in" id="l-url" type="url" value="${esc(d?d.url:'')}" placeholder="https://…"></label>
      <label class="field"><span>Titre</span><input class="in" id="l-titre" value="${esc(d?d.titre:'')}"></label>
      <label class="field"><span>Rangé dans</span><select class="in" id="l-cat">${destOptions(cur)}</select></label>
      <label class="field wide"><span>Description <small>(utilisée par la recherche)</small></span><textarea class="in" id="l-desc" rows="3">${esc(d?d.description||'':'')}</textarea></label>
      <label class="field wide"><span>Mots-clés <small>(séparés par des virgules)</small></span><input class="in" id="l-kw" value="${esc(d?(d.motscles||[]).join(', '):'')}"></label>
      <label class="check"><input type="checkbox" id="l-pin" ${d&&d.epingle?'checked':''}> Épingler dans « Les plus utilisés »</label>
    </div>
    <div class="btns"><button class="primary" id="l-ok">Enregistrer</button><button class="ghost" data-close>Annuler</button></div>`);
  $('#l-url').focus();
  $('#l-ok').onclick=async()=>{
    let url=$('#l-url').value.trim(); if(url&&!/^https?:\/\//i.test(url)) url='https://'+url;
    if(!linkHost(url)){ toast('Adresse du lien incorrecte'); $('#l-url').focus(); return; }
    const titre=$('#l-titre').value.trim()||linkHost(url), [cat,sous]=splitDest($('#l-cat').value);
    const v={url,titre,categorie:cat,sous:sous||'',description:$('#l-desc').value.trim(),motscles:$('#l-kw').value.split(',').map(s=>s.trim()).filter(Boolean),epingle:$('#l-pin').checked};
    const before=JSON.stringify(DATA.documents);
    let x=d; if(!x){ x={id:'l'+rid(),ext:'lien',date:month(),ajoute:today(),historique:[]}; DATA.documents.push(x); }
    Object.assign(x,v,{chemin:'lien:'+x.id,fichier:linkHost(url),modifie:today()});
    const ok=await run(()=>saveData(),d?'Lien mis à jour':'Lien ajouté');
    if(!ok){ DATA.documents=JSON.parse(before); return; }
    closeModal(); renderDocs();
  };
}
function delLink(d){
  askConfirm('Retirer ce lien ?',`« ${esc(d.titre)} » ne sera plus proposé dans Librejo. La page internet n'est pas touchée.`,'Retirer',async()=>{
    const before=DATA.documents.slice();
    DATA.documents=DATA.documents.filter(x=>x!==d);
    if(!await run(()=>saveData(),'Lien retiré')) DATA.documents=before;
    renderDocs();
  });
}

/* ======================================================================
   Mises à jour du contenu : ajoutées une seule fois aux données du dossier,
   sans rien effacer de ce que l'équipe a changé.
   - en mémoire dès l'ouverture (tout le monde voit les nouveautés) ;
   - enregistrées dans le dossier à la prochaine entrée en mode admin
     (fichiers rangés dans leur dossier, ancien modèle archivé).
   ====================================================================== */
const MIG_HEBERG=[
  {sous:'',titre:"Dispositifs d'hébergement santé : LHSS, ACT et autres",fichier:'HebergementSanteListe.pdf',ext:'pdf',
   description:"Tableau de tous les dispositifs d'hébergement santé à Marseille : adresse, téléphone, comment faire la demande (dossier commun ou spécifique, adresse mail), remarques et nombre de places. LHSS (La Minoterie, Fontainieu, Forbin, Jane Pannier, périnatalité, hors les murs), ACT (ACT 13, HAS Le Marabout, Sousto, MAAVAR, Un chez soi d'abord, hors les murs) et autres (BAITA, appartements thérapeutiques Point Marseille, Petit Paris, LAM Fontainieu).",
   motscles:['LHSS','ACT','LAM','hébergement','appartement thérapeutique','lits halte soins santé','Un chez soi d\'abord','BAITA','précarité','sans abri','admission']},
  {sous:'',titre:"Dispositifs d'hébergement santé (PowerPoint à modifier)",fichier:'HebergementSanteListe.pptx',ext:'pptx',
   description:"Version modifiable du tableau des dispositifs d'hébergement santé. Après modification, enregistrez-la aussi en PDF à la place de l'ancien (Fichier › Exporter) pour que l'équipe imprime la version à jour.",
   motscles:['LHSS','ACT','hébergement','PowerPoint']},
  {sous:'ACT',titre:"Dossier unique d'admission en ACT 13 et 84",url:'https://www.has.asso.fr/details-dossier+unique+de+demande+d+admission+en+act+13+et+84-317.html',
   description:"Dossier commun « fédération habitat » (ACT HAS, Le Marabout, et autres ACT des Bouches-du-Rhône et du Vaucluse). À envoyer à act.admission@has.asso.fr. Commissions mensuelles.",motscles:['ACT','appartement de coordination thérapeutique','HAS','Habitat Alternatif Social','Marabout','admission','dossier']},
  {sous:'ACT',titre:"Dossier social d'admission ACT Sousto",url:'https://ars13.org/wp-content/uploads/2021/07/dossier-social-sousto-act.pdf',
   description:"ARS (Association Régionale de Sauvegarde), 18-30 ans. Partie sociale du dossier ; la partie médicale s'envoie à part, sous pli confidentiel (adresses dans le tableau des dispositifs).",motscles:['ACT','Sousto','ARS','jeunes','admission','dossier']},
  {sous:'Autres dispositifs',titre:"Dossier d'admission LAM Fontainieu",url:'https://www.groupe-sos.org/wp-content/uploads/2020/12/Dossier-dAdmission-LAM-Fontainieu-2024.pdf',
   description:"Lits d'accueil médicalisés, Groupe SOS, 20 chemin de Fontainieu 13014. Dossier spécifique à envoyer à service-admission.fontainieu@groupe-sos.org. Pathologie grave au pronostic sombre, long délai d'attente.",motscles:['LAM','lits d\'accueil médicalisés','Fontainieu','Groupe SOS','admission','dossier']},
];
const MIG_CURE=[{sous:'',titre:'Annuaire MAP : trouver une cure et son dossier',url:'https://mapannuaire.github.io/map/',
  description:"Annuaire Marseille Addictologie Psychiatrie : cures, sevrages, soins résidentiels et dossiers d'admission. Les dossiers changent souvent : le lien ouvre toujours la version à jour.",
  motscles:['cure','sevrage','post-cure','soins résidentiels','SSR','SMR','addictologie','dossier','admission','annuaire']}];
const MIG_CURES=[{"sous": "CH d'Allauch", "titre": "Admission : Demande d'admission, service d'addictologie (avril 2023)", "url": "https://www.ch-allauch.fr/media/bloc_file/Demande_admission_Addictologie_Allauch_V3_04_2023.pdf", "description": "CH d'Allauch (Allauch). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026). À faire remplir et signer par le médecin, puis à envoyer à addictologie@ch-allauch.fr.", "motscles": ["cure", "sevrage", "addictologie", "CH d'Allauch", "Allauch", "admission", "dossier"]}, {"sous": "CH d'Allauch", "titre": "Info : Plaquette hospitalisation temps plein (2020)", "url": "https://www.ch-allauch.fr/media/bloc_file/Plaquette_pr%C3%A9sentation_ADDICTO_HTP_V09_2020.pdf", "description": "CH d'Allauch (Allauch). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH d'Allauch", "Allauch", "plaquette", "livret"]}, {"sous": "CH d'Allauch", "titre": "Info : Flyer de présentation", "url": "https://www.ch-allauch.fr/media/bloc_file//Flyer_de_pr%C3%A9sentation_ADDICTO.pdf", "description": "CH d'Allauch (Allauch). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH d'Allauch", "Allauch", "plaquette", "livret"]}, {"sous": "Clinique Saint-Barnabé", "titre": "Admission : Dossier de pré-admission hospitalisation (oct. 2026)", "url": "https://clinique-saint-barnabe.ramsaysante.fr/sites/default/files/biblio/domaines/clinique_saint_barnabe/2026%2010%20Dossier%20pr%C3%A9-admission%20hospitalisation.pdf", "description": "Clinique Saint-Barnabé (Marseille 14e). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Saint-Barnabé", "Marseille 14e", "admission", "dossier"]}, {"sous": "Clinique Saint-Barnabé", "titre": "Admission : Page admission (pièces à fournir)", "url": "https://clinique-saint-barnabe.ramsaysante.fr/vous-%C3%AAtes-patient/votre-admission-%C3%A0-la-clinique-saint-barnab%C3%A9", "description": "Clinique Saint-Barnabé (Marseille 14e). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Saint-Barnabé", "Marseille 14e", "admission", "dossier"]}, {"sous": "CH Montperrin", "titre": "Info : Plaquette hospitalisation temps plein", "url": "https://www.ch-montperrin.fr/PublishingImages/Pages/Page%20de%20contenu%20publique/POLE-TRANSVERSAL/flyerTP.pdf", "description": "CH Montperrin (Aix-en-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026). Pas de dossier d'admission en ligne.", "motscles": ["cure", "sevrage", "addictologie", "CH Montperrin", "Aix-en-Provence", "plaquette", "livret"]}, {"sous": "CH Montperrin", "titre": "Info : Plaquette structure de jour (HDJ / CATTP)", "url": "https://www.ch-montperrin.fr/PublishingImages/Pages/Page%20de%20contenu%20publique/POLE-TRANSVERSAL/flyer%20SDJ.pdf", "description": "CH Montperrin (Aix-en-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH Montperrin", "Aix-en-Provence", "plaquette", "livret"]}, {"sous": "CH Montperrin", "titre": "Info : Groupe « Choisir mon projet de soins »", "url": "https://www.ch-montperrin.fr/PublishingImages/Pages/Page%20de%20contenu%20publique/POLE-TRANSVERSAL/flyer%20CPS.pdf", "description": "CH Montperrin (Aix-en-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH Montperrin", "Aix-en-Provence", "plaquette", "livret"]}, {"sous": "CH Montperrin", "titre": "Info : Livret d'accueil (mai 2024)", "url": "https://www.ch-montperrin.fr/PublishingImages/Pages/Page%20de%20contenu%20publique/Livret-d-accueil/Livret%20d'Accueil.pdf", "description": "CH Montperrin (Aix-en-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH Montperrin", "Aix-en-Provence", "plaquette", "livret"]}, {"sous": "Clinique La Lauranne", "titre": "Info : Page du pôle L'Étoile", "url": "https://www.clinique-la-lauranne.fr/pole-de-l-etoile", "description": "Clinique La Lauranne (Bouc-Bel-Air). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026). Pas de PDF en ligne.", "motscles": ["cure", "sevrage", "addictologie", "Clinique La Lauranne", "Bouc-Bel-Air", "plaquette", "livret"]}, {"sous": "CH du Pays salonais", "titre": "Info : Livret d'accueil patient (mars 2022)", "url": "https://www.ch-salon.fr/wp-content/uploads/2022/03/Livret-Accueil-V14-WEB.pdf", "description": "CH du Pays salonais (Salon-de-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026). Alcoologie et ELSA.", "motscles": ["cure", "sevrage", "addictologie", "CH du Pays salonais", "Salon-de-Provence", "plaquette", "livret"]}, {"sous": "CH du Pays salonais", "titre": "Info : Page du service (hépato-gastro-entérologie, alcoologie)", "url": "https://www.ch-salon.fr/hepato-gastro-enterologie-alcoologie/", "description": "CH du Pays salonais (Salon-de-Provence). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "CH du Pays salonais", "Salon-de-Provence", "plaquette", "livret"]}, {"sous": "Clinique Les Collines du Revest", "titre": "Admission : Formulaire d'admission (juin 2026)", "url": "https://www.emeis.fr/system/files/medias/documents/mefformulaireadmissioncliniquecollinesdurevestjuin2026-1.pdf", "description": "Clinique Les Collines du Revest (Le Revest-les-Eaux, Var). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Les Collines du Revest", "Le Revest-les-Eaux", "admission", "dossier"]}, {"sous": "Clinique Les Collines du Revest", "titre": "Admission : Check-list des documents à fournir (janvier 2026)", "url": "https://www.emeis.fr/system/files/medias/documents/emeis-clinique-collines-revest-check-list-admission.pdf", "description": "Clinique Les Collines du Revest (Le Revest-les-Eaux, Var). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Les Collines du Revest", "Le Revest-les-Eaux", "admission", "dossier"]}, {"sous": "Centre d'addictologie d'Arzeliers", "titre": "Admission : Dossier d'admission addictologie 2026", "url": "https://www.chbd-laragne.fr/sites/default/files/chbd_laragne_fr/files/2026/2026-01/144.004_dossier-admission-addictologie-_-2026.pdf", "description": "Centre d'addictologie d'Arzeliers (Laragne-Montéglin, Hautes-Alpes). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Centre d'addictologie d'Arzeliers", "Laragne-Montéglin", "admission", "dossier"]}, {"sous": "Centre d'addictologie d'Arzeliers", "titre": "Info : Plaquette de présentation 2025", "url": "https://www.chbd-laragne.fr/sites/default/files/chbd_laragne_fr/files/2025/2025-01/plaquette-2025_addictologie.pdf", "description": "Centre d'addictologie d'Arzeliers (Laragne-Montéglin, Hautes-Alpes). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Centre d'addictologie d'Arzeliers", "Laragne-Montéglin", "plaquette", "livret"]}, {"sous": "Clinique Le CALME", "titre": "Admission : Dossier de pré-admission, hospitalisation complète (avril 2026)", "url": "https://www.calme.fr/medias/dossiers/dossier-cabris-hospitalisation-complete.pdf", "description": "Clinique Le CALME (Cabris, Alpes-Maritimes). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Le CALME", "Cabris", "admission", "dossier"]}, {"sous": "Clinique Le CALME", "titre": "Admission : Dossier de pré-admission, hôpital de jour (avril 2026)", "url": "https://www.calme.fr/medias/dossiers/dossier-cabris-hospitalisation-jour.pdf", "description": "Clinique Le CALME (Cabris, Alpes-Maritimes). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Le CALME", "Cabris", "admission", "dossier"]}, {"sous": "Clinique Le CALME", "titre": "Info : Livret d'accueil, hospitalisation complète (février 2026)", "url": "https://www.calme.fr/medias/dossiers/livret-accueil-cabris.pdf", "description": "Clinique Le CALME (Cabris, Alpes-Maritimes). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Le CALME", "Cabris", "plaquette", "livret"]}, {"sous": "Clinique Le CALME", "titre": "Info : Livret d'accueil, hôpital de jour (février 2026)", "url": "https://www.calme.fr/medias/dossiers/livret-accueil-cabris-hdj.pdf", "description": "Clinique Le CALME (Cabris, Alpes-Maritimes). Plaquette, livret ou page d’information : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Le CALME", "Cabris", "plaquette", "livret"]}, {"sous": "Clinique Belle Rive", "titre": "Admission : Dossier de pré-admission (mai 2025)", "url": "https://www.clinique-bellerive.fr/wp-content/uploads/2026/03/DOC.PEC_.ADM_.52-Dossier-Pre-admission-clinique-mai-25.pdf", "description": "Clinique Belle Rive (Villeneuve-lès-Avignon, Gard). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Belle Rive", "Villeneuve-lès-Avignon", "admission", "dossier"]}, {"sous": "Clinique Belle Rive", "titre": "Admission : Dossier de demande d'admission (mars 2025)", "url": "https://www.clinique-bellerive.fr/wp-content/uploads/2025/06/DOC-PEC-ADM-51_Dossier-Demande-admission-MARS-25.pdf", "description": "Clinique Belle Rive (Villeneuve-lès-Avignon, Gard). Dossier ou formulaire à remplir : lien vers la version en ligne (relevé de l'annuaire MAP, 19/11/2026).", "motscles": ["cure", "sevrage", "addictologie", "Clinique Belle Rive", "Villeneuve-lès-Avignon", "admission", "dossier"]}];
const MIG_NEW_DIR='app/nouveaux';

function migCat(match,nom,folder){
  let c=DATA.categories.find(x=>match.test(norm(x.nom)));
  if(c) return c;
  const ordre=Math.max(0,...DATA.categories.map(x=>x.ordre||0))+1;
  c={id:`${pad(ordre)} ${folder}`,nom,ordre,sous:[]}; DATA.categories.push(c); return c;
}
function migAdd(c,it){
  if(it.sous&&!(c.sous||[]).includes(it.sous)) (c.sous=c.sous||[]).push(it.sous);
  if(it.url){
    if(DATA.documents.some(d=>isLink(d)&&d.url===it.url)) return;
    const id='l'+rid(); DATA.documents.push({id,chemin:'lien:'+id,fichier:linkHost(it.url),ext:'lien',url:it.url,titre:it.titre,description:it.description,motscles:it.motscles,categorie:c.id,sous:it.sous,date:month(),ajoute:today(),historique:[]});
  }else{
    if(DATA.documents.some(d=>d.fichier===it.fichier)) return;
    // le fichier attend dans app/nouveaux : il sera rangé dans son dossier au passage en mode admin
    DATA.documents.push({id:'d'+rid(),chemin:`${MIG_NEW_DIR}/${it.fichier}`,fichier:it.fichier,ext:it.ext,titre:it.titre,description:it.description,motscles:it.motscles,categorie:c.id,sous:it.sous,version:it.version===undefined?'1':it.version,date:month(),ajoute:today(),historique:[],ranger:true});
  }
}
const MIG_OLD_LINKS=['https://groupe-sos.org/wp-content/uploads/2020/12/Demande-dAdmission-LHSS-Fontainieu-2024.pdf','https://groupe-sos.org/wp-content/uploads/2020/12/Demande-dAdmission-LHSS-HLM-2024.pdf'];
const P_=(sous,titre,fichier,description,motscles,version)=>({sous,titre,fichier,ext:'pdf',description,motscles,version});
const MIG_DOSSIERS=[
  P_('LHSS','LHSS : dossier commun (Minoterie, Fontainieu, Forbin, Jane Pannier)','LHSS-dossier-commun_v6.pdf',"Dossier commun de demande d'admission en LHSS (version 6) pour La Minoterie, Fontainieu, Forbin et Jane Pannier (femmes uniquement). Adresses d'envoi de chaque LHSS en première page. Commissions mensuelles.",['LHSS','lits halte soins santé','dossier commun','Minoterie','Fontainieu','Forbin','Jane Pannier','admission','dossier'],'6'),
  P_('LHSS','LHSS Hors les murs : dossier d’admission 2025','LHSS-Hors-les-murs_dossier-admission_2025.pdf',"Centre Fontainieu, équipe mobile LHSS Hors les murs. Dossier spécifique à envoyer à la direction et au médecin des LHSS HLM (adresse mail en première page). Personnes sans abri de plus de 18 ans, quelle que soit la situation administrative. Dans tout Marseille, si possibilité de trouver facilement la personne. Pas le week-end.",['LHSS','hors les murs','HLM','équipe mobile','Fontainieu','Groupe SOS','admission','dossier'],''),
  P_('ACT','ACT 13 : dossier social','ACT13_dossier-social.pdf',"ACT 13 (Groupe SOS Solidarités). Partie sociale de la demande d'admission, à remplir par le travailleur social. À adresser au 187 rue Paradis 13006 ou par mail à sosact13@groupe-sos.org. Voir aussi la liste des pièces à joindre.",['ACT','ACT 13','appartement de coordination thérapeutique','Groupe SOS','dossier social','admission'],''),
  P_('ACT','ACT 13 : dossier médical','ACT13_dossier-medical.pdf',"ACT 13 (Groupe SOS Solidarités). Partie médicale de la demande d'admission, sous pli confidentiel à l'attention du médecin coordinateur (adresse en première page).",['ACT','ACT 13','dossier médical','Groupe SOS','admission','confidentiel'],''),
  P_('ACT','ACT 13 : pièces à joindre','ACT13_pieces-a-joindre.pdf',"Liste des documents impératifs à joindre au dossier social ACT 13 : rapport médical sous pli confidentiel, demande signée, lettre de motivation, attestation CPAM, ressources, pièce d'identité, rapport social.",['ACT','ACT 13','pièces','liste','documents'],''),
  P_('ACT','ACT Hors les murs : dossier médical','ACT-Hors-les-murs_dossier-medical.pdf',"ACT Hors les murs (Groupe SOS). Dossier médical d'admission, sous pli confidentiel à l'attention du médecin coordinateur ou par mail (adresses en première page). À joindre : la demande d'accompagnement signée par la personne.",['ACT','hors les murs','HLM','dossier médical','Groupe SOS','admission'],''),
  P_('ACT','ACT Hors les murs : demande d’accompagnement (à signer)','ACT-Hors-les-murs_demande-accompagnement.pdf',"Une page à faire signer par la personne : accord pour un entretien d'évaluation avec une infirmière coordinatrice et une travailleuse sociale des ACT Hors les murs.",['ACT','hors les murs','demande','accompagnement','signature'],''),
  P_('ACT','ACT Hors les murs : présentation','ACT-Hors-les-murs_presentation.pdf',"Présentation du dispositif ACT Hors les murs : missions, équipe, public. Dans tout Marseille, si possibilité de trouver facilement la personne.",['ACT','hors les murs','présentation'],''),
  P_('Autres dispositifs','CSAPA Point Marseille (logements thérapeutiques) : dossier d’admission 2026','Point-Marseille_dossier-admission_2026.pdf',"Dossier de demande d'admission (administratif et médical) des logements thérapeutiques individualisés du CSAPA Point Marseille, 24 A rue Fort Notre-Dame 13007. À envoyer avec une lettre de motivation (adresses en première page). Appartements, hôtels meublés, chambres de transition.",['Point Marseille','CSAPA','appartement thérapeutique','logement thérapeutique','Petit Paris','chambre de transition','admission','dossier'],''),
  P_('Autres dispositifs','CSAPA Point Marseille : livret d’accueil 2026','Point-Marseille_livret-accueil_2026.pdf',"Livret d'accueil du CSAPA Point Marseille (logements thérapeutiques individualisés) : équipe, fonctionnement, accompagnement proposé. À remettre à la personne.",['Point Marseille','CSAPA','livret d\'accueil','logement thérapeutique'],''),
  P_('Autres dispositifs','CSAPA Point Marseille : présentation','Point-Marseille_presentation.pdf',"Présentation en une page du CSAPA Point Marseille : pour qui, dispositifs d'hébergement (appartements thérapeutiques, hôtels meublés, chambres de transition), approche, contact. L'abstinence n'est pas une condition d'admission.",['Point Marseille','CSAPA','présentation','appartement thérapeutique','hébergement'],''),
];
const MIG_DOSSIERS2=[
  P_('ACT','MAAVAR ACT : dossier médical','MAAVAR-ACT_dossier-medical.pdf',"MAAVAR ACT (diffus, centre-ville). Dossier médical type de demande d'admission en ACT, sous pli confidentiel à l'attention du médecin coordinateur. Personne isolée, chiens non autorisés ; RdR et TSO possibles, accueil inconditionnel.",['ACT','MAAVAR','dossier médical','admission','confidentiel'],''),
  P_('ACT','MAAVAR ACT : dossier social','MAAVAR-ACT_dossier-social.pdf',"MAAVAR ACT. Dossier social type de demande d'admission en ACT, à remplir par le travailleur social (ne pas joindre de copies de documents administratifs). À envoyer à maavar.marseille@gmail.com.",['ACT','MAAVAR','dossier social','admission'],''),
  P_('Autres dispositifs','BAITA : présentation (appartements thérapeutiques)','BAITA_presentation.pdf',"Appartements thérapeutiques BAITA (Addiction Méditerranée), Marseille et Aix : hébergement en appartement individuel, soutien éducatif, orientation vers les soins et l'insertion. Pas de dossier : présentation par mail rédigée par l'usager (situation sociale, parcours addiction, soins en cours, projets, attentes) à baita@ad-med.fr. Conditions de ressources, chiens non autorisés, plusieurs mois d'attente.",['BAITA','Addiction Méditerranée','appartement thérapeutique','hébergement','présentation'],''),
];
/* Un modèle Word remplacé par un formulaire intégré : retiré de la liste, archivé dans le dossier au passage en mode admin */
function migArchiveWord(re,formId){
  DATA.documents.filter(d=>d.ext==='docx'&&re.test(norm(d.titre))).forEach(d=>{
    (DATA.aArchiver=DATA.aArchiver||[]).push({chemin:d.chemin,fichier:d.fichier,categorie:d.categorie,ext:d.ext});
    if(d.epingle&&formId){ DATA.formsEpingles=DATA.formsEpingles||[]; if(!DATA.formsEpingles.includes(formId)) DATA.formsEpingles.push(formId); }
    DATA.documents=DATA.documents.filter(x=>x!==d); DATA.kits.forEach(k=>k.docs=(k.docs||[]).filter(id=>id!==d.id));
    if(DATA.semaine) (DATA.semaine.listes||[]).forEach(l=>l.items=(l.items||[]).filter(i=>i.doc!==d.id));
  });
}
const MIGRATIONS=[]; // Librejo : les mises à jour de contenu propres à BPM sont retirées
let migPending=false;
(function applyMigrations(){
  DATA.migrations=DATA.migrations||[];
  MIGRATIONS.forEach(m=>{ if(DATA.migrations.includes(m.id)) return; try{ m.run(); DATA.migrations.push(m.id); migPending=true; }catch(e){ console.warn('mise à jour',m.id,e); } });
  if(DATA.documents.some(d=>d.ranger)||(DATA.aArchiver||[]).length) migPending=true;
})();
/* Au passage en mode admin : range les nouveaux fichiers, archive l'ancien modèle, enregistre */
let migBusy=false;
async function persistMigrations(){
  if(!migPending||migBusy||!isAdmin) return; migBusy=true;
  try{
    await getDir('readwrite');
    for(const c of DATA.categories){ await dirAt(['Documents',c.id],'readwrite',true); for(const s of c.sous||[]) await dirAt(['Documents',c.id,s],'readwrite',true); }
    for(const d of DATA.documents.filter(x=>x.ranger)){
      try{ const f=await readRel(d.chemin);
        const dir=`Documents/${d.categorie}${d.sous?'/'+d.sous:''}`;
        const rel=await existsRel(`${dir}/${d.fichier}`)?`${dir}/${d.fichier}`:await uniqueRel(dir,d.fichier.replace(/\.[^.]+$/,''),d.ext);
        if(!await existsRel(rel)) await writeRel(rel,f);
        Object.assign(d,{chemin:rel,fichier:rel.split('/').pop(),taille:f.size}); delete d.ranger;
      }catch(e){ console.warn('rangement',d.fichier,e); }
    }
    for(const a of (DATA.aArchiver||[]).slice()){
      try{ if(await existsRel(a.chemin)){ const arch=await uniqueRel(`Documents/${a.categorie}/${ARCH}`,a.fichier.replace(/\.[^.]+$/,''),a.ext); await moveRel(a.chemin,arch); } }
      catch(e){ console.warn('archive',a.chemin,e); continue; }
      DATA.aArchiver=DATA.aArchiver.filter(x=>x!==a);
    }
    if(!DATA.aArchiver.length) delete DATA.aArchiver;
    if(parPending){ await saveParams(); parPending=false; }
    await saveData(); migPending=DATA.documents.some(d=>d.ranger)||!!(DATA.aArchiver||[]).length;
    toast('Mise à jour enregistrée dans le dossier','ok');
    renderDocs(); renderForms();
  }catch(e){ if(!(e instanceof Cancel)){ const m=fsErr(e); m&&toast(m); } }
  finally{ migBusy=false; }
}

/* ======================================================================
   ORIENTATION AUX URGENCES : courrier d'adressage pour l'équipe des urgences
   ====================================================================== */
let UR={}, urErr=false, urRecip=null;
const urTel=()=>{ const m=/Tél\.?\s*:\s*([\d .]+\d)/.exec((structure.pied||[]).join(' ')); return m?m[1].trim():''; };
function urReset(){ UR={hopital:'',service:'Service des urgences',date:today(),heure:nowHM(),civ:'',nom:'',prenom:'',ddn:'',motif:'',ta:'',fc:'',temp:'',spo2:'',glyc:'',atcd:'',trt:'',dose:'',derniere:'',autres:'',allergies:'',conso:'',infos:'',contact:'',tel:urTel(),signe:'med',signNom:'',signFonction:''}; if(!meds().length) UR.signe='equipe'; urErr=false; }
urReset();
function urValidate(){
  const e=[];
  if(!UR.hopital.trim()) e.push(['hopital','Hôpital manquant.']);
  if(!UR.date) e.push(['date','Date manquante.']);
  if(!UR.civ) e.push(['civ','Civilité manquante.']);
  if(!UR.nom.trim()) e.push(['nom','Nom manquant.']);
  if(!UR.prenom.trim()) e.push(['prenom','Prénom manquant.']);
  if(UR.ddn.trim()&&!parseDDN(UR.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!UR.motif.trim()) e.push(['motif',"Motif de l'orientation manquant."]);
  if(tsoOn()&&UR.trt&&UR.trt!=='Aucun'&&!(parseDose(UR.dose)>0)) e.push(['dose','Posologie du traitement de substitution (mg par jour) manquante.']);
  if(UR.signe==='med'&&!medChoice()) e.push(['med',meds().length?'Choisissez le médecin qui signe le courrier.':'Aucun médecin enregistré : choisissez « Autre membre de l’équipe ».']);
  if(UR.signe==='equipe'&&!UR.signNom.trim()) e.push(['signNom','Nom de la personne qui signe manquant.']);
  if(!UR.contact.trim()) e.push(['contact','Personne à contacter dans la structure manquante.']);
  return e;
}
function renderUrg(){
  const p=$('#p-urg'); if(!p) return;
  const errs=urErr?urValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-u="${k}" value="${esc(UR[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const area=(k,ph,rows=2)=>`<textarea class="in${B(k)}" data-u="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(UR[k])}</textarea>`;
  const words=parseDose(UR.dose)>0?doseLettres(UR.dose)+' par jour':'';
  const hop=ANNU.partenaires.filter(x=>/urgence|hopital/.test(norm(x.type))&&!/addicto/.test(norm(x.type)));
  p.innerHTML=`<button class="backlink" data-uback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🚑</span>Orientation aux urgences</h2>
    <p class="hint">Courrier remis à la personne (ou envoyé) pour l'équipe des urgences : motif, traitements, éléments utiles et contact dans la structure. Seul le motif est obligatoire, le reste si vous l'avez.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Hôpital</h3>
      <div class="fieldgrid">
        <label class="field partpick"><span>Hôpital <small>(choisir dans l'annuaire ou écrire)</small></span><input class="in${B('hopital')}" data-u="hopital" list="ur-hop" value="${esc(UR.hopital)}" placeholder="ex. Hôpital Nord" autocomplete="off">
          <datalist id="ur-hop">${hop.map(x=>`<option value="${esc(x.nom)}">${esc(x.type)}</option>`).join('')}</datalist></label>
        <label class="field"><span>Service</span>${txt('service')}</label>
        <label class="field"><span>Date</span><input class="in${B('date')}" type="date" data-u="date" value="${esc(UR.date)}"></label>
        <label class="field"><span>Heure</span><input class="in" type="time" data-u="heure" value="${esc(UR.heure)}"></label>
      </div></div>
    <div class="card top w-form"><h3>Personne orientée</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg${B('civ')}">${['M.','Mme'].map(c=>`<button type="button" data-uc="civ" data-v="${c}" aria-pressed="${UR.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance <small>(si connue)</small></span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
      </div></div>
    <div class="card top w-form"><h3>Motif et éléments médicaux</h3>
      <label class="field"><span>Motif de l'orientation</span>${area('motif','ex. Plaie infectée de l’avant-bras, fièvre depuis 2 jours',3)}</label>
      <div class="field"><span>Constantes <small>(facultatif)</small></span><div class="ur-const">
        <label><small>TA</small>${txt('ta','120/80')}</label><label><small>FC</small>${txt('fc','/min','inputmode="numeric"')}</label>
        <label><small>T°</small>${txt('temp','°C','inputmode="decimal"')}</label><label><small>SpO₂</small>${txt('spo2','%','inputmode="numeric"')}</label>
        <label><small>Glycémie</small>${txt('glyc','g/L','inputmode="decimal"')}</label></div></div>
      <label class="field"><span>Antécédents <small>(facultatif)</small></span>${area('atcd','ex. VHC, épilepsie, diabète…')}</label>
      ${tsoOn()?`<div class="field"><span>Traitement de substitution <small>(facultatif)</small></span><div class="choice">${['Aucun',...RELAIS_TRT].map(t=>`<button type="button" class="chip" data-uc="trt" data-v="${esc(t)}" aria-pressed="${UR.trt===t}">${esc(t)}</button>`).join('')}</div></div>`:''}
      ${tsoOn()&&UR.trt&&UR.trt!=='Aucun'?`<div class="fieldgrid"><label class="field"><span>Posologie</span><div class="dose dose-sm"><input class="in${B('dose')}" data-u="dose" value="${esc(UR.dose)}" inputmode="decimal"><em>mg/j</em></div><small class="dosew">${esc(words)}</small></label>
        <label class="field"><span>Dernière prise <small>(facultatif)</small></span>${txt('derniere','ex. ce matin 9 h, à l’accueil')}</label></div>`:''}
      <label class="field"><span>Autres traitements <small>(facultatif)</small></span>${area('autres','')}</label>
      <label class="field"><span>Allergies <small>(facultatif)</small></span>${txt('allergies','ex. pénicilline, aucune connue')}</label>
      <label class="field"><span>Consommations récentes <small>(facultatif : produits, dernière prise)</small></span>${area('conso','ex. alcool hier soir, cocaïne fumée il y a 6 h')}</label>
      <label class="field"><span>Autres éléments utiles <small>(facultatif)</small></span>${area('infos','ex. sans domicile, accompagné par…, ne parle pas français (langue : …)',3)}</label>
    </div>
    <div class="card top w-form"><h3>Contact et signature</h3>
      <div class="fieldgrid">
        <label class="field"><span>Personne à contacter dans la structure</span>${txt('contact','ex. Julie, infirmière')}</label>
        <label class="field"><span>Téléphone</span>${txt('tel','','inputmode="tel"')}</label>
      </div>
      ${meds().length?'':(UR.signe='equipe','')}<div class="field"${meds().length?'':' hidden'}><span>Signataire</span><div class="seg">${[['med','Médecin'],['equipe','Autre membre de l’équipe']].map(([k,l])=>`<button type="button" data-uc="signe" data-v="${k}" aria-pressed="${UR.signe===k}">${l}</button>`).join('')}</div></div>
      ${UR.signe==='med'?`<div>${medSelectHTML('ur-med').replace('class="in"','class="in'+B('med')+'"')}</div>`
        :`<div class="fieldgrid">${eqChips()}<label class="field"><span>Nom</span>${txt('signNom','Prénom Nom')}</label><label class="field"><span>Fonction</span>${txt('signFonction','ex. Infirmière')}</label></div>`}
    </div>
    <div class="card top blue w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : le plus souvent, le courrier est imprimé et remis à la personne)</small></span>${recipHTML('ur-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-ugo>${ICON.file}Créer le courrier (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-uclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=urRecip?urRecip.get():[]; urRecip=bindRecip(p.querySelector('#ur-rc'),prev);
}
function urBind(){
  const p=$('#p-urg'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.u) return; let v=t.value;
    if(t.dataset.u==='ddn'){ v=dateMask(v); if(v!==t.value) t.value=v; }
    UR[t.dataset.u]=v; if(urErr) t.classList.remove('bad');
    if(t.dataset.u==='dose'){ const w=p.querySelector('.dosew'); if(w) w.textContent=parseDose(v)>0?doseLettres(v)+' par jour':''; } });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.u==='hopital'){ const x=ANNU.partenaires.find(z=>z.nom===t.value.trim()); if(x&&urRecip) x.emails.forEach(m=>urRecip.add(m)); }
    if(t.matches('[data-med]')&&urErr) setTimeout(renderUrg,0); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-uback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-uc]'); if(c){ const k=c.dataset.uc; UR[k]=UR[k]===c.dataset.v&&k==='trt'?'':c.dataset.v; renderUrg(); return; }
    if(t.closest('[data-uclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ urReset(); urRecip=null; renderUrg(); }); return; }
    if(t.closest('[data-ugo]')) urPdf();
  });
}
function urPdf(){
  const errs=LIVE_DRY?[]:(urErr=true,urValidate());
  if(missingStop(errs,'#p-urg',renderUrg,urPdf,()=>UR)) return;
  const st=structure, fem=UR.civ==='Mme', e_=fem?'e':'', who=fmtCivNom(UR.civ,UR.nom,UR.prenom);
  const P=letterPdf('Orientation aux urgences','Confidentiel – données de santé');
  P.y=64; P.right([UR.hopital.trim(),UR.service.trim()],{bold:true,after:2});
  P.right([`${villeLe(st)}${frDate(UR.date||today())}${UR.heure?' à '+UR.heure.replace(':',' h '):''}`],{after:5});
  P.para('À l’attention de l’équipe des urgences',{bold:true,after:4});
  P.para('Madame, Monsieur,',{after:3});
  P.para(`Nous vous adressons ${who}${UR.ddn.trim()?`, né${e_} le ${UR.ddn.trim()}`:''}, que notre équipe a rencontré${e_} ce jour.`);
  const sec=(t,v)=>{ if(!v) return; P.room(14); P.para(t,{bold:true,after:.5,color:P.C.NAVY}); v.split(/\n\s*\n/).forEach(x=>P.para(x.replace(/\s*\n\s*/g,' ; '),{after:1.5})); P.y+=1.5; };
  sec('Motif de l’orientation',UR.motif.trim());
  const cst=[['TA',UR.ta,'mmHg'],['FC',UR.fc,'/min'],['T°',UR.temp,'°C'],['SpO2',UR.spo2,'%'],['Glycémie capillaire',UR.glyc,'g/L']].filter(x=>x[1].trim()).map(([l,v,u])=>`${l} ${v.trim().replace(/(\d)\.(\d)/,'$1,$2')}${/[a-z%°/]/i.test(v)?'':' '+u}`);
  sec(`Constantes${UR.heure?' (vers '+UR.heure.replace(':',' h ')+')':''}`,cst.join(' – '));
  sec('Antécédents',UR.atcd.trim());
  const tr=[];
  if(!tsoOn()) UR.trt='';
  if(UR.trt&&UR.trt!=='Aucun') tr.push(`Traitement de substitution : ${UR.trt}, ${doseTxt(UR.dose)}${UR.derniere.trim()?', dernière prise : '+UR.derniere.trim():''}.`);
  else if(UR.trt==='Aucun') tr.push('Pas de traitement de substitution.');
  if(UR.autres.trim()) tr.push('Autres traitements : '+UR.autres.trim().replace(/\s*\n\s*/g,' ; ').replace(/\.?$/,'.'));
  sec('Traitements en cours',tr.join('\n\n'));
  sec('Allergies',UR.allergies.trim());
  sec('Consommations récentes',UR.conso.trim());
  sec('Autres éléments utiles',UR.infos.trim());
  P.room(20);
  P.para(`Vous pouvez joindre notre équipe${UR.tel.trim()?` au ${UR.tel.trim()}`:''} pour tout renseignement. Interlocuteur : ${UR.contact.trim()}.`);
  P.para('Nous vous remercions de votre accueil.',{after:6});
  if(UR.signe==='med'){ const md=medChoice(); P.sign(md.nom,['N° RPPS : '+md.rpps,...String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n')]); }
  else P.sign(UR.signNom.trim(),[UR.signFonction.trim(),st.nom]);
  const file=P.finish(outName('Orientation-urgences',UR.nom,UR.prenom,UR.date||today()));
  readyModal({file,title:'Courrier prêt',steps:['Imprimez-le, signez-le et remettez-le à la personne pour l’accueil des urgences.','Ou envoyez-le par mail au service si une adresse est connue.'],
    mail:{to:urRecip?urRecip.get():[],subject:`${st.nom} – Orientation aux urgences`,
      body:`Madame, Monsieur,\n\nVeuillez trouver ci-joint le courrier d'orientation d'${fem?'une patiente':'un patient'} adressé${e_} ce jour à vos urgences.\n\nCordialement`},
    onDone:()=>{ urReset(); urRecip=null; renderUrg(); }});
}
urBind();

/* ======================================================================
   14. COURRIER À UN PARTENAIRE : lettre à l'en-tête de l'association
   (structure, service, administration). Rien n'est enregistré.
   ====================================================================== */
const CP_APPELS=['Madame, Monsieur,','Madame,','Monsieur,','Chère consœur, cher confrère,','Chers collègues,'];
const cpPolitesse=a=>/consœur|confrère/.test(a)?'Je vous prie de croire, chère consœur, cher confrère, à l’assurance de mes sentiments confraternels.'
  :/collègues/.test(a)?'Bien cordialement.':`Veuillez agréer, ${a.replace(/,$/,'')}, l’expression de nos salutations distinguées.`;
let CP={}, cpErr=false, cpRecip=null;
function cpReset(){ CP={dest:'',attention:'',adresse:'',date:today(),objet:'',appel:CP_APPELS[0],message:'',signe:'equipe',signNom:'',signFonction:''}; cpErr=false; }
cpReset();
function cpValidate(){
  const e=[];
  if(!CP.dest.trim()) e.push(['dest','Destinataire manquant.']);
  if(!CP.date) e.push(['date','Date du courrier manquante.']);
  if(!CP.objet.trim()) e.push(['objet','Objet du courrier manquant.']);
  if(!CP.message.trim()) e.push(['message','Texte du courrier manquant.']);
  if(CP.signe==='med'&&!medChoice()) e.push(['med',meds().length?'Choisissez le médecin qui signe le courrier.':'Aucun médecin enregistré : choisissez « Autre membre de l’équipe ».']);
  if(CP.signe==='equipe'&&!CP.signNom.trim()) e.push(['signNom','Nom de la personne qui signe manquant.']);
  return e;
}
function renderCp(){
  const p=$('#p-cp'); if(!p) return;
  const errs=cpErr?cpValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-c="${k}" value="${esc(CP[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const area=(k,ph,rows=2)=>`<textarea class="in${B(k)}" data-c="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(CP[k])}</textarea>`;
  p.innerHTML=`<button class="backlink" data-cback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">📨</span>Courrier à un partenaire</h2>
    <p class="hint">Lettre à l'en-tête de la structure pour un partenaire, un service ou une administration. Pour un médecin au sujet d'un patient, utilisez plutôt « Courrier au médecin traitant ».</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Destinataire</h3>
      <div class="fieldgrid">
        <label class="field wide partpick"><span>Destinataire <small>(choisir dans l'annuaire ou écrire)</small></span><input class="in${B('dest')}" data-c="dest" list="cp-parts" value="${esc(CP.dest)}" placeholder="ex. CHRS Forbin" autocomplete="off">
          <datalist id="cp-parts">${ANNU.partenaires.map(x=>`<option value="${esc(x.nom)}">${esc(x.type)}</option>`).join('')}</datalist></label>
        <label class="field"><span>À l'attention de <small>(facultatif)</small></span>${txt('attention','ex. Mme Martin, cheffe de service')}</label>
        <label class="field"><span>Date du courrier</span><input class="in${B('date')}" type="date" data-c="date" value="${esc(CP.date)}"></label>
        <label class="field wide"><span>Adresse <small>(facultatif, pour un envoi postal)</small></span>${area('adresse','ex. 12 rue …\n13003 Marseille')}</label>
      </div></div>
    <div class="card top w-form"><h3>Courrier</h3>
      <label class="field"><span>Objet</span>${txt('objet','ex. Demande de partenariat, présentation de nos permanences…')}</label>
      <div class="field"><span>Formule d'appel</span><div class="choice">${CP_APPELS.map(a=>`<button type="button" class="chip" data-cc="appel" data-v="${esc(a)}" aria-pressed="${CP.appel===a}">${esc(a)}</button>`).join('')}</div></div>
      <label class="field"><span>Texte du courrier <small>(laissez une ligne vide entre deux paragraphes)</small></span>${area('message','',9)}</label>
      <p class="hint">Formule de politesse ajoutée à la fin : « ${esc(cpPolitesse(CP.appel))} »</p></div>
    <div class="card top w-form"><h3>Signature</h3>
      <div class="field"><span>Signataire</span><div class="seg">${[['equipe','Membre de l’équipe'],['med','Médecin']].map(([k,l])=>`<button type="button" data-cc="signe" data-v="${k}" aria-pressed="${CP.signe===k}">${l}</button>`).join('')}</div></div>
      ${CP.signe==='med'?`<div>${medSelectHTML('cp-med').replace('class="in"','class="in'+B('med')+'"')}</div>`
        :`<div class="fieldgrid">${eqChips()}<label class="field"><span>Nom</span>${txt('signNom','Prénom Nom')}</label><label class="field"><span>Fonction</span>${txt('signFonction','ex. Travailleuse sociale')}</label></div>`}
    </div>
    <div class="card top blue w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : vous pourrez aussi imprimer le courrier)</small></span>${recipHTML('cp-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-cgo>${ICON.file}Créer le courrier (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-cclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=cpRecip?cpRecip.get():[]; cpRecip=bindRecip(p.querySelector('#cp-rc'),prev);
}
function cpBind(){
  const p=$('#p-cp'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.c) return; CP[t.dataset.c]=t.value; if(cpErr) t.classList.remove('bad'); });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.c==='dest'){ const x=ANNU.partenaires.find(z=>z.nom===t.value.trim()); if(x){ if(cpRecip) x.emails.forEach(m=>cpRecip.add(m)); if(!CP.adresse.trim()&&x.adresse) CP.adresse=partAddr(x); renderCp(); } }
    if(t.matches('[data-med]')&&cpErr) setTimeout(renderCp,0); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-cback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-cc]'); if(c){ CP[c.dataset.cc]=c.dataset.v; renderCp(); return; }
    if(t.closest('[data-cclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ cpReset(); cpRecip=null; renderCp(); }); return; }
    if(t.closest('[data-cgo]')) cpPdf();
  });
}
function cpPdf(){
  const errs=LIVE_DRY?[]:(cpErr=true,cpValidate());
  if(missingStop(errs,'#p-cp',renderCp,cpPdf,()=>CP)) return;
  const st=structure;
  const P=letterPdf('Courrier','');
  P.y=64; P.right([CP.dest.trim(),CP.attention.trim()?'À l’attention de '+CP.attention.trim():'',...CP.adresse.split('\n').map(s=>s.trim())],{after:6});
  P.right([`${villeLe(st)}${frDate(CP.date||today())}`],{after:5});
  P.para(`Objet : ${CP.objet.trim()}`,{bold:true,after:5});
  P.para(CP.appel,{after:4});
  CP.message.trim().split(/\n\s*\n/).forEach(par=>P.para(par.replace(/\s*\n\s*/g,' '),{after:3}));
  P.para(cpPolitesse(CP.appel),{after:6});
  if(CP.signe==='med'){ const md=medChoice(); P.sign(md.nom,['N° RPPS : '+md.rpps,...String(PAR.medecinLigne||DEFAULT_MED_LINE).split('\n')]); }
  else P.sign(CP.signNom.trim(),[CP.signFonction.trim(),st.nom]);
  const file=P.finish(`Courrier_${fileSafe(CP.dest.trim()).slice(0,40)}_${isoOr(CP.date)}.pdf`);
  readyModal({file,title:'Courrier prêt',steps:['Imprimez-le et signez-le pour un envoi postal, ou envoyez-le par mail.'],
    mail:{to:cpRecip?cpRecip.get():[],subject:`${st.nom} – ${CP.objet.trim()}`,body:`${CP.appel}\n\nVeuillez trouver ci-joint notre courrier : ${CP.objet.trim()}.\n\nCordialement,\n${CP.signe==='med'?medChoice().nom:CP.signNom.trim()}`},
    onDone:()=>{ cpReset(); cpRecip=null; renderCp(); }});
}
cpBind();

/* ======================================================================
   15. ACCUEIL ÉPURÉ : date du jour, recherche, accès direct aux
   formulaires et à chaque catégorie, « Les plus utilisés ».
   ====================================================================== */
const CAT_EMOJI=[[/info/,'ℹ️'],[/orient/,'🧭'],[/inclusion/,'🗂️'],[/delivr/,'💊'],[/classeur/,'📒'],[/medic/,'🩺'],[/permanence/,'🚐'],
  [/heberg|precar/,'🏠'],[/cure|sevrage/,'🌿'],[/protocole/,'📋'],[/social|droit/,'🤝'],[/rdr|reduction|prevention/,'🧪'],[/admin|rh|equipe/,'🗄️'],[/formation/,'🎓']];
const catEmoji=c=>c.emoji||(CAT_EMOJI.find(([re])=>re.test(norm(c.nom)))||[0,'📁'])[1];
function todayLong(){ const s=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1); }
DATA.formsEpingles=DATA.formsEpingles||[];
/* Accueil : chaque bloc se déroule sur place en liste courte (formulaires, puis une ligne par catégorie) */
const homeOpen=new Set();
document.addEventListener('toggle',e=>{ const d=e.target; if(d&&d.matches&&d.matches('details[data-home]')) d.open?homeOpen.add(d.dataset.home):homeOpen.delete(d.dataset.home); },true);
const HOME_MAX=25; // au-delà : « Voir les N documents »
const HICO={forms:'📝',docs:'🗂️',kits:'🧰'}; // sections de l'accueil : emojis (les boutons d'action gardent leurs icônes dessinées)
/* Accueil : les formulaires les plus utiles, visibles sans rien déplier (hors « Les plus utilisés ») */
function quickForms(){
  const all=formItems(); if(!all.length) return '';
  const already=new Set(pinnedAndUsed().fs.map(f=>f.id));
  const used=useTop().filter(k=>k.startsWith('f:')).map(k=>k.slice(2));
  const rank=f=>DATA.formsEpingles.includes(f.id)?0:used.includes(f.id)?1+used.indexOf(f.id):100;
  const list=all.filter(f=>!already.has(f.id)).sort((a,b)=>rank(a)-rank(b)).slice(0,6);
  if(!list.length) return '';
  return `<h2 class="lab">Remplir un formulaire</h2><div class="qforms">${list.map(f=>`<button type="button" class="qform" data-fill="${esc(f.id)}"><span class="qe" aria-hidden="true">${esc(formEmoji(f))}</span><span class="qt"><b>${esc(f.titre)}</b>${f.description?`<small>${esc(excerpt(f.description,[]))}</small>`:''}</span><span class="qgo" aria-hidden="true">›</span></button>`).join('')}</div>`;
}
function homeSec(key,emo,titre,sous,body,cls=''){
  return `<details class="hsec${cls}" data-home="${esc(key)}"${homeOpen.has(key)?' open':''}>
    <summary><span class="he" aria-hidden="true">${emo}</span><span class="ht"><b>${esc(titre)}</b><small>${esc(sous)}</small></span><span class="chev" aria-hidden="true"></span></summary>
    <ul class="hlist">${body}</ul></details>`;
}
function homeFormRow(f){
  const d=(f.description||'').replace(/\s+/g,' '), s=d.length>90?d.slice(0,88).replace(/\s\S*$/,'')+'…':d;
  return `<li><button type="button" class="hrow" data-fill="${esc(f.id)}"><span class="hi" aria-hidden="true">${esc(formEmoji(f))}</span><span class="hn"><b>${esc(f.titre)}</b>${s?`<small>${esc(s)}</small>`:''}</span><span class="hgo">Remplir</span></button></li>`;
}
function homeDocRow(d){
  if(isLink(d)) return `<li><div class="hrow"><span class="hi lien" aria-hidden="true">🔗</span><a class="hn" href="${esc(safeHref(d.url)||'#')}" target="_blank" rel="noopener"><b>${esc(d.titre)}</b><small>${esc('Lien web · '+linkHost(d.url))}</small></a>
    <span class="ha">${favBtn('d:'+d.id)}<button class="iconbtn" data-lsend="${esc(d.id)}" title="Envoyer le lien" aria-label="Envoyer le lien ${esc(d.titre)}">${ICON.mail}</button></span></div></li>`;
  return `<li><div class="hrow"><span class="hi thumb" aria-hidden="true">${thumbHtml(d,'')}</span><a class="hn" href="${hrefOf(d.chemin)}" target="_blank" rel="noopener"><b>${esc(d.titre)}</b><small>${esc(String(d.ext||'').toUpperCase())}</small></a>
    <span class="ha">${favBtn('d:'+d.id)}${d.modele?`<button class="lbtn" data-fillword="${esc(d.id)}">${ICON.pen}Remplir</button>`:''}${printable(d)?`<button class="iconbtn" data-print="${esc(d.chemin)}" title="Imprimer" aria-label="Imprimer ${esc(d.titre)}">${ICON.print}</button>`:''}<button class="iconbtn" data-send="${esc(d.chemin)}" title="Envoyer" aria-label="Envoyer ${esc(d.titre)}">${ICON.mail}</button></span></div></li>`;
}
function renderHome(){
  const fs=formItems();
  const cs=cats().map(c=>{ const ff=fs.filter(f=>f.categorie===c.id), ds=docs().filter(d=>d.categorie===c.id).sort((a,b)=>(b.epingle?1:0)-(a.epingle?1:0)||(a.sous?1:0)-(b.sous?1:0)||(a.sous||'').localeCompare(b.sous||'','fr')||a.titre.localeCompare(b.titre,'fr'));
    return {c,ff,ds,n:ff.length+ds.length}; }).filter(x=>x.n||isAdmin);
  const forms=homeSec('forms',HICO.forms,'Tous les formulaires',`${fs.length} formulaires à remplir`,FORM_GROUPS.map(([g,nom,emo])=>{ const l=fs.filter(f=>formGroup(f)===g); return l.length?`<li class="hsub">${emo} ${esc(nom)}</li>`+l.map(homeFormRow).join(''):''; }).join(''),' main');
  const catsHtml=cs.map(({c,ff,ds,n})=>{
    // documents de la catégorie d'abord, puis un intertitre par sous-dossier
    const rows=[...ff.map(homeFormRow)]; let cur=null, shown=0;
    ds.forEach(d=>{ if(shown>=HOME_MAX) return; const s=d.epingle?'':(d.sous||''); if(s&&s!==cur) rows.push(`<li class="hsub">${esc(s)}</li>`); cur=s; rows.push(homeDocRow(d)); shown++; });
    const more=ff.length+ds.length>shown+ff.length||ff.length>HOME_MAX;
    const body=(rows.join('')||'<li class="hempty">Aucun document pour l’instant.</li>')
      +`<li class="hmore"><button type="button" class="ghost sm" data-filter="${esc(c.id)}">${more?`Tout voir (${n})`:'Ouvrir la catégorie'} ›</button></li>`;
    return homeSec('c:'+c.id,catEmoji(c),c.nom,n?[ds.length?`${ds.length} document${ds.length>1?'s':''}`:'',ff.length?`${ff.length} formulaire${ff.length>1?'s':''}`:''].filter(Boolean).join(' · '):'vide',body);
  }).join('');
  const kits=DATA.kits.length?homeSec('kits',HICO.kits,'Kits de documents',`${DATA.kits.length} kit${DATA.kits.length>1?'s':''}`,
    DATA.kits.map(k=>`<li><div class="hrow"><span class="hi" aria-hidden="true">${HICO.kits}</span><span class="hn"><b>${esc(k.titre)}</b><small>${kitDocs(k).length} documents</small></span>
      <span class="ha"><button class="iconbtn" data-kprint="${esc(k.id)}" title="Imprimer tout" aria-label="Imprimer le kit ${esc(k.titre)}">${ICON.print}</button><button class="iconbtn" data-ksend="${esc(k.id)}" title="Envoyer tout" aria-label="Envoyer le kit ${esc(k.titre)}">${ICON.mail}</button></span></div></li>`).join('')):'';
  // « Documents » se replie comme « Formulaires » ; dedans, une ligne dépliable par catégorie
  const nd=docs().length;
  const docsSec=`<details class="hsec main hdocsec" data-home="docs"${homeOpen.has('docs')?' open':''}>
    <summary><span class="he" aria-hidden="true">${HICO.docs}</span><span class="ht"><b>Documents</b><small>${cs.length} catégorie${cs.length>1?'s':''} · ${nd} document${nd>1?'s':''}</small></span><span class="chev" aria-hidden="true"></span></summary>
    <div class="hcats">${catsHtml}${kits}</div></details>`;
  return `${quickForms()}<div class="homecol">${forms}${docsSec}</div>`;
}
document.addEventListener('click',e=>{
  if(e.target.closest('[data-goforms]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
  const pf=e.target.closest('[data-pinform]'); if(pf){ const id=pf.dataset.pinform, on=DATA.formsEpingles.includes(id), before=DATA.formsEpingles.slice();
    DATA.formsEpingles=on?DATA.formsEpingles.filter(x=>x!==id):DATA.formsEpingles.concat(id);
    run(()=>saveData(),on?'Retiré de l’accueil':'Épinglé à l’accueil').then(ok=>{ if(!ok) DATA.formsEpingles=before; drawFormAdmin(tab); }); }
});
/* Mode admin bien visible : bandeau orange en haut de l'écran et badge en haut à droite */
function showAdminFlag(){
  document.body.classList.toggle('is-admin',isAdmin);
  let f=document.getElementById('adminflag');
  if(!isAdmin){ if(f) f.remove(); return; }
  if(f) return;
  f=document.createElement('div'); f.id='adminflag'; f.setAttribute('role','status');
  f.innerHTML=`${svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>')}<b>Vous modifiez</b><button type="button">Quitter le mode admin</button>`;
  f.querySelector('button').onclick=()=>$('#adminbtn').click();
  document.body.appendChild(f);
}
showAdminFlag();

/* ======================================================================
   16. AMBIANCE : saison discrète, messages des fêtes et journées
   à côté de la date ; emoji de chaque catégorie choisi par l'admin.
   ====================================================================== */
function paques(y){ // dimanche de Pâques (calendrier grégorien)
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,
    i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da);
}
function saison(d=new Date()){ const n=(d.getMonth()+1)*100+d.getDate();
  return n>=1221||n<320?['hiver','❄️']:n<621?['printemps','🌸']:n<922?['ete','☀️']:['automne','🍂']; }
function fete(d=new Date()){
  const m=d.getMonth()+1, j=d.getDate(), y=d.getFullYear(), p=paques(y), jour=new Date(y,m-1,j);
  const dp=Math.round((jour-p)/864e5);
  const L=[ // [mois, du, au, texte] : le premier qui correspond l'emporte
    [1,1,7,`🥂 Bonne année ${y} !`],[2,2,2,'🥞 Bonne Chandeleur'],[3,8,8,'✊ Journée internationale des droits des femmes'],
    [5,1,1,'🌿 Bon 1er mai'],[6,21,21,'🎶 Fête de la musique'],[6,26,26,'🤝 Journée « Support. Don’t Punish »'],
    [7,14,14,'🎆 Bon 14 juillet'],[8,31,31,'💜 Journée internationale de sensibilisation aux overdoses'],[10,31,31,'🎃 Joyeux Halloween'],
    [12,1,1,'🎗️ Journée mondiale de lutte contre le sida'],[12,24,25,'🎄 Joyeux Noël'],[12,20,31,'✨ Bonnes fêtes de fin d’année'],
    [1,8,31,'🥤 Janvier sobre (Dry January)'],[11,1,30,'🚭 Mois sans tabac']];
  if(dp===0||dp===1) return '🐣 Joyeuses Pâques';
  const x=L.find(([mm,a,b])=>mm===m&&j>=a&&j<=b); return x?x[3]:'';
}
function applySaison(){ const [s]=saison(); ['hiver','printemps','ete','automne'].forEach(k=>document.body.classList.toggle('saison-'+k,k===s)); }
applySaison();
const ILLU={
  shelf:`<svg viewBox="0 0 160 110" aria-hidden="true"><rect x="14" y="94" width="132" height="8" rx="4" fill="#d8cfbd"/><rect x="34" y="34" width="20" height="58" rx="5" fill="#cfe1de"/><rect x="58" y="46" width="20" height="46" rx="5" fill="#bcd6d2"/><rect x="82" y="40" width="20" height="52" rx="5" fill="#cfe1de"/><rect x="112" y="34" width="20" height="58" rx="5" fill="#f2cf93" transform="rotate(-10 112 92)"/></svg>`,
  search:`<svg viewBox="0 0 160 110" aria-hidden="true"><path d="M20 30q30-10 58 4v62q-28-14-58-4z" fill="#cfe1de"/><path d="M140 30q-30-10-58 4v62q28-14 58-4z" fill="#e4efed"/><circle cx="112" cy="62" r="17" fill="none" stroke="#e0a64a" stroke-width="6"/><path d="M124 74l14 14" stroke="#e0a64a" stroke-width="7" stroke-linecap="round"/></svg>`};
const illu=(k,t,s)=>`<div class="empty illu">${ILLU[k]}<b>${t}</b>${s?`<span>${s}</span>`:''}</div>`;
function homeHead(){
  const [,emo]=saison(), f=fete(), hr=new Date().getHours();
  const hello=hr>=5&&hr<12?'Bonjour':hr>=12&&hr<18?'Bon après-midi':'Bonsoir';
  const nom=(structure&&structure.nom)||'';
  return `<div class="todayrow"><div><h1 class="hello">${hello}</h1><p class="today"><span class="saison" aria-hidden="true">${emo}</span>${todayLong()}${nom?` <span class="who">· ${esc(nom)}</span>`:''}</p></div>${f?`<span class="fete">${esc(f)}</span>`:''}</div>`;
}

/* Emoji d'une catégorie (admin) */
const EMOJI_CHOIX=['📁','ℹ️','🧭','🗂️','💊','📒','🩺','🚐','🏠','🌿','📋','🤝','🧪','🗄️','🎓','🧾','✉️','📞','⚖️','🧠','❤️','🦷','👁️','💉','🩹','🧴','🍽️','🛏️','🚿','👕','🐕','👶','👩','🌍','🗣️','💶','🏛️','🚌','📅','⭐'];
function emojiCat(){
  const c=DATA.categories.find(x=>x.id===filter); if(!c) return;
  let cur=catEmoji(c);
  openModal(`<h3 id="modal-title">Emoji de « ${esc(c.nom)} »</h3>
    <p class="hint">Il s'affiche sur le bouton de la catégorie, en page d'accueil.</p>
    <div class="emojigrid">${EMOJI_CHOIX.map(e=>`<button type="button" data-emo="${e}" aria-pressed="${e===cur}">${e}</button>`).join('')}</div>
    <label class="field"><span>Ou un autre emoji <small>(Windows : touche Windows + point)</small></span><input class="in" id="emo-libre" maxlength="8" value="${EMOJI_CHOIX.includes(cur)?'':esc(cur)}"></label>
    <div class="btns"><button class="primary" id="emo-ok">Enregistrer</button>${c.emoji?'<button class="secondary" id="emo-auto">Revenir à l’emoji automatique</button>':''}<button class="ghost" data-close>Annuler</button></div>`);
  const box=$('#modal-box');
  box.querySelector('.emojigrid').onclick=e=>{ const b=e.target.closest('[data-emo]'); if(!b) return; cur=b.dataset.emo; $('#emo-libre').value='';
    box.querySelectorAll('[data-emo]').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); };
  const save=async v=>{ const before=c.emoji; if(v) c.emoji=v; else delete c.emoji;
    if(await run(()=>saveData(),'Emoji enregistré')){ closeModal(); renderDocs(); } else { if(before) c.emoji=before; else delete c.emoji; } };
  $('#emo-ok').onclick=()=>save(($('#emo-libre').value.trim())||cur);
  const au=$('#emo-auto'); if(au) au.onclick=()=>save('');
}

/* ======================================================================
   17. APERÇU DES PDF CRÉÉS : dans la page, pas dans un nouvel onglet.
   Librejo est ouvert depuis le dossier (file://) : Chrome affiche une page
   blanche quand on ouvre un document « blob:null/… » dans un autre onglet.
   ====================================================================== */
function previewUrl(u,name){
  closePreview();
  const o=document.createElement('div'); o.id='pdfprev'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label','Aperçu du document');
  o.innerHTML=`<div class="pv-bar"><b>${esc(name||'Aperçu')}</b><span class="grow"></span>
      <button type="button" class="primary sm" data-pvprint>${ICON.print}Imprimer</button>
      <button type="button" class="secondary sm" data-pvclose aria-describedby="pv-kbd">Fermer l’aperçu</button>
      <small class="pv-kbd" id="pv-kbd">Clavier : <kbd>Échap</kbd> ferme l’aperçu. Dans le document, <kbd>Maj</kbd>+<kbd>Tab</kbd> revient ici.</small></div>
    <iframe src="${u}" title="Aperçu du document (Maj+Tab pour revenir au bouton Fermer)"></iframe>`;
  const opener=document.activeElement; document.body.appendChild(o); layersSync(); pvOpener=opener;
  o.querySelector('[data-pvclose]').onclick=closePreview;
  o.querySelector('[data-pvprint]').onclick=()=>{ const fr=o.querySelector('iframe'); try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast('Ctrl+P pour imprimer'); } };
  o.querySelector('[data-pvclose]').focus();
}
let pvOpener=null;
function closePreview(){ const o=document.getElementById('pdfprev'); if(o){ o.remove(); layersSync();
  const f=pvOpener; pvOpener=null; if(f&&f.isConnected&&f!==document.body&&!f.closest('[inert]')) f.focus(); } }
// Menus déroulants « Outils », « Exporter » : Échap les replie et rend le focus à leur bouton
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; const d=e.target.closest&&e.target.closest('details.ab-more[open]'); if(!d) return;
  e.preventDefault(); e.stopImmediatePropagation(); d.open=false; const s=d.querySelector('summary'); s&&s.focus(); },true);
// Échap ferme d'abord l'aperçu, sans fermer la fenêtre qui est dessous
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.getElementById('pdfprev')){ e.stopImmediatePropagation(); e.preventDefault(); closePreview(); } },true);
// Tous les liens « Aperçu » vers un document créé dans Librejo
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="blob:"]'); if(!a||a.hasAttribute('download')) return;
  e.preventDefault(); e.stopPropagation();
  const n=a.querySelector('span'); previewUrl(a.href,n?n.textContent:'Aperçu');
},true);

/* ======================================================================
   18. EN-TÊTE LIBRE : papier à en-tête de l'association, tout est libre
   sauf la date. Rien n'est enregistré.
   ====================================================================== */
let EL={}, elErr=false, elRecip=null;
function elReset(){ EL={date:today(),titre:'',dest:'',objet:'',texte:'',signature:''}; elErr=false; }
elReset();
function elValidate(){ const e=[]; if(!EL.date) e.push(['date','Date manquante.']); if(!EL.texte.trim()&&!EL.titre.trim()) e.push(['texte','Le document est vide : écrivez au moins un titre ou un texte.']); return e; }
function renderEl(){
  const p=$('#p-el'); if(!p) return;
  const errs=elErr?elValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const area=(k,ph,rows)=>`<textarea class="in${B(k)}" data-e="${k}" rows="${rows}" placeholder="${esc(ph)}">${esc(EL[k])}</textarea>`;
  p.innerHTML=`<button class="backlink" data-eback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">📄</span>En-tête libre</h2>
    <p class="hint">Une page blanche à l'en-tête de la structure : écrivez ce que vous voulez. Seule la date est ajoutée d'office. Laissez vide ce qui ne sert pas.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form">
      <div class="fieldgrid">
        <label class="field"><span>Date</span><input class="in${B('date')}" type="date" data-e="date" value="${esc(EL.date)}"></label>
        <label class="field"><span>Titre en haut à droite <small>(facultatif)</small></span><input class="in" data-e="titre" value="${esc(EL.titre)}" placeholder="ex. Attestation, Note, Information…" autocomplete="off"></label>
        <label class="field wide"><span>Destinataire <small>(facultatif, en haut à droite)</small></span>${area('dest','ex. CHRS Forbin\nÀ l’attention de …',3)}</label>
        <label class="field wide"><span>Objet <small>(facultatif)</small></span><input class="in" data-e="objet" value="${esc(EL.objet)}" autocomplete="off"></label>
      </div>
      <label class="field"><span>Texte <small>(laissez une ligne vide entre deux paragraphes)</small></span>${area('texte','',14)}</label>
      <label class="field"><span>Signature <small>(facultatif : nom, fonction… une info par ligne)</small></span>${area('signature','ex. Julie Exemple\nTravailleuse sociale',3)}</label>
    </div>
    <div class="card top blue w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : vous pourrez aussi imprimer)</small></span>${recipHTML('el-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-ego>${ICON.file}Créer le document (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-eclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=elRecip?elRecip.get():[]; elRecip=bindRecip(p.querySelector('#el-rc'),prev);
}
function elBind(){
  const p=$('#p-el'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.e) return; EL[t.dataset.e]=t.value; if(elErr) t.classList.remove('bad'); });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-eback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    if(t.closest('[data-eclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ elReset(); elRecip=null; renderEl(); }); return; }
    if(t.closest('[data-ego]')) elPdf();
  });
}
function elPdf(){
  const errs=LIVE_DRY?[]:(elErr=true,elValidate());
  if(missingStop(errs,'#p-el',renderEl,elPdf,()=>EL)) return;
  const st=structure, P=letterPdf(EL.titre.trim(),'');
  P.y=64; P.right(EL.dest.split('\n').map(s=>s.trim()),{after:5});
  P.right([`${villeLe(st)}${frDate(EL.date)}`],{after:6});
  if(EL.objet.trim()) P.para(`Objet : ${EL.objet.trim()}`,{bold:true,after:5});
  EL.texte.trim().split(/\n\s*\n/).filter(Boolean).forEach(par=>P.para(par.replace(/[ \t]*\n[ \t]*/g,' '),{after:3}));
  const sig=EL.signature.split('\n').map(s=>s.trim()).filter(Boolean);
  if(sig.length){ P.room(14+sig.length*5); P.y+=6; const d=P.doc;
    sig.forEach((s,i)=>{ d.setFont(PF(),i===0?'bold':'normal'); d.setFontSize(i===0?11:9.5); d.setTextColor(...(i===0?P.C.NAVY:P.C.GREY)); d.text(s,P.R,P.y,{align:'right'}); P.y+=5; }); }
  const base=(EL.titre.trim()||EL.objet.trim()||'Document').slice(0,40);
  const file=P.finish(`${fileSafe(base)}_${isoOr(EL.date)}.pdf`);
  readyModal({file,title:'Document prêt',steps:['Vérifiez-le avec « Aperçu », puis imprimez-le ou envoyez-le par mail.'],
    mail:{to:elRecip?elRecip.get():[],subject:`${st.nom}${EL.objet.trim()?' – '+EL.objet.trim():EL.titre.trim()?' – '+EL.titre.trim():''}`,body:`Bonjour,\n\nVeuillez trouver ci-joint notre document.\n\nCordialement`},
    onDone:()=>{ elReset(); elRecip=null; renderEl(); }});
}
elBind();


/* ======================================================================
   MINIATURE EN DIRECT : pendant qu'on remplit un formulaire, la première
   page du document se dessine à côté. Tout reste en mémoire : rien n'est
   enregistré, rien n'est envoyé. Le document est fabriqué par la même
   fonction que le bouton « Créer », sans la vérification des champs.
   ====================================================================== */
const LIVE={timer:0,idle:0,seq:0,tp:undefined,url:null,off:false,peek:false};
/* Fenêtre étroite (moins de 1000 px de large, ou zoom fort : 200 % sur 1366 px) : l'aperçu est replié derrière
   son bouton et le formulaire garde toute la largeur ; ouvert à la demande, il passe par-dessus et se referme
   sans changer le choix enregistré sur ce poste. */
const LIVE_NARROW=matchMedia('(max-width:1000px)');
LIVE_NARROW.addEventListener('change',()=>{ LIVE.peek=false; liveSoon(0); });
try{ LIVE.off=localStorage.getItem('librejo-miniature')==='0'; }catch(e){}
const LIVE_FN={__el:()=>elPdf(),__ccas:()=>ccPdf(),__cp:()=>cpPdf(),__urg:()=>urPdf(),__cl:()=>clPdf(),__att:()=>attPdf(),__mt:()=>mtPdf(),__relais:()=>relaisPdf()};
const LIVE_TAB={__el:'el',__ccas:'ccas',__cp:'cp',__urg:'urg',__cl:'cl',__att:'att',__mt:'mt',__relais:'relais'};
function liveActive(){
  const m=document.getElementById('modal'); if(!formView||(m&&!m.hidden)) return false;
  if(LIVE_FN[formView]) return tab===LIVE_TAB[formView];
  return tab==='forms'&&!String(formView).startsWith('__')&&DATA.formulaires.some(x=>x.id===formView);
}
function liveBuild(){
  if(!LJ_PDF_OK){ pdfReady().catch(()=>{}); return null; }   // l'aperçu se redessine dès que les bibliothèques sont là
  if(LIVE_FN[formView]){
    LIVE_DRY=true; LIVE_OUT=null;
    try{ LIVE_FN[formView](); }catch(e){ LIVE_OUT=null; } finally{ LIVE_DRY=false; }
    return LIVE_OUT&&LIVE_OUT[0]||null;
  }
  const f=DATA.formulaires.find(x=>x.id===formView); if(!f) return null;
  try{ return formBlob(f,LIVE.tp||null); }catch(e){ return null; }
}
function liveBox(){
  let b=document.getElementById('livepv'); if(b) return b;
  b=document.createElement('aside'); b.id='livepv'; b.setAttribute('aria-label','Aperçu du document en cours');
  b.innerHTML=`<div class="lp-head"><b>Aperçu</b><span class="lp-pg"></span><button type="button" class="lp-big" data-lpbig aria-pressed="false">Agrandir</button><button type="button" class="lp-x" data-lpoff title="Masquer l’aperçu" aria-label="Masquer l’aperçu">×</button></div>
    <button type="button" class="lp-page" data-lpzoom title="Ouvrir le PDF en grand" aria-label="Ouvrir le PDF de l’aperçu en grand"><canvas role="img" aria-label="Première page du document (son texte est sous l’image)"></canvas><span class="lp-wait">L’aperçu apparaît ici.</span></button>
    <details class="lp-txt"><summary>Lire le texte de la page</summary><div class="lp-tx" aria-live="off"></div></details>
    <p class="lp-note">Se met à jour pendant la saisie. Rien n’est enregistré.</p>`;
  try{ if(localStorage.getItem('librejo-apercu-grand')==='1'){ b.classList.add('big'); b.querySelector('[data-lpbig]').setAttribute('aria-pressed','true'); b.querySelector('[data-lpbig]').textContent='Réduire'; } }catch(e){}
  document.body.appendChild(b);
  b.addEventListener('click',e=>{
    if(e.target.closest('[data-lpoff]')){ if(LIVE_NARROW.matches){ LIVE.peek=false; liveSoon(0); setTimeout(()=>{ const t=document.getElementById('livepv-tab'); t&&!t.hidden&&t.focus(); },20); } else liveSet(true); return; }
    const bg=e.target.closest('[data-lpbig]'); if(bg){ const on=b.classList.toggle('big'); bg.setAttribute('aria-pressed',String(on)); bg.textContent=on?'Réduire':'Agrandir'; try{ localStorage.setItem('librejo-apercu-grand',on?'1':'0'); }catch(err){} return; }
    if(e.target.closest('[data-lpzoom]')){ const file=liveBuild(); if(!file) return; if(LIVE.url) URL.revokeObjectURL(LIVE.url); LIVE.url=URL.createObjectURL(file); previewUrl(LIVE.url,'Aperçu (document non terminé)'); }
  });
  return b;
}
function liveTab(){
  let t=document.getElementById('livepv-tab'); if(t) return t;
  t=document.createElement('button'); t.id='livepv-tab'; t.type='button'; t.innerHTML=`${ICON.file}Afficher l’aperçu`; t.onclick=()=>{ if(LIVE_NARROW.matches){ LIVE.peek=true; liveSoon(0); setTimeout(()=>{ const x=document.querySelector('#livepv [data-lpoff]'); x&&x.focus(); },20); } else liveSet(false); };
  document.body.appendChild(t); return t;
}
function liveSet(off){ LIVE.off=off; try{ localStorage.setItem('librejo-miniature',off?'0':'1'); }catch(e){} liveSoon(0); }
/* Mise à jour espacée : pendant la frappe, l'aperçu attend une pause (LIVE_TYPE_MS) au lieu de se refaire à chaque
   mot, puis il est dessiné quand le navigateur est libre (requestIdleCallback, 500 ms au plus) : la saisie reste fluide
   sur un PC ancien. Un clic sur un choix (pastille, case) le met à jour plus vite. */
const LIVE_TYPE_MS=700;
function liveSoon(ms){ clearTimeout(LIVE.timer); if(LIVE.idle&&window.cancelIdleCallback) cancelIdleCallback(LIVE.idle); LIVE.idle=0;
  LIVE.timer=setTimeout(()=>{ if(window.requestIdleCallback) LIVE.idle=requestIdleCallback(()=>{ LIVE.idle=0; liveRefresh(); },{timeout:500}); else liveRefresh(); },ms==null?LIVE_TYPE_MS:ms); }
async function liveRefresh(){
  const on=liveActive(), box=document.getElementById('livepv'), tb=document.getElementById('livepv-tab');
  const narrow=LIVE_NARROW.matches, off=narrow?!LIVE.peek:LIVE.off;
  document.documentElement.classList.toggle('live-on',on&&!off&&!narrow);
  if(!on){ if(box) box.hidden=true; if(tb) tb.hidden=true; return; }
  if(off){ if(box) box.hidden=true; const t=liveTab(); t.hidden=false;
    /* fenêtre étroite : le bouton prend place dans la page, sous le titre du formulaire, au lieu de flotter sur le bouton « Créer » */
    const pn=narrow&&document.querySelector('main>section.panel:not([hidden])'), at=pn&&(pn.querySelector(':scope>.privacy')||pn.querySelector(':scope>h2.sec'));
    if(at){ if(t.previousElementSibling!==at){ const f=document.activeElement===t; at.after(t); f&&t.focus(); } t.classList.add('inflow'); }
    else { if(t.parentNode!==document.body) document.body.appendChild(t); t.classList.remove('inflow'); }
    return; }
  if(tb) tb.hidden=true;
  const b=liveBox(); b.hidden=false;
  const seq=++LIVE.seq;
  if(LIVE.tp===undefined){ try{ LIVE.tp=await loadTampon(); }catch(e){ LIVE.tp=null; } if(seq!==LIVE.seq) return; }
  const file=liveBuild(), cv=b.querySelector('canvas'), wait=b.querySelector('.lp-wait');
  if(file){ await new Promise(r=>setTimeout(r)); if(seq!==LIVE.seq) return; }   // rend la main entre la fabrication du PDF et son dessin
  if(!file){ wait.hidden=false; wait.textContent='L’aperçu apparaîtra dès que le formulaire sera commencé.'; cv.hidden=true; b.querySelector('.lp-pg').textContent=''; return; }
  try{
    const lib=await getPdfjs(); if(seq!==LIVE.seq) return;
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise; if(seq!==LIVE.seq){ pdf.destroy(); return; }
    const page=await pdf.getPage(1), v0=page.getViewport({scale:1}), vp=page.getViewport({scale:620/v0.width});
    const off=document.createElement('canvas'); off.width=Math.round(vp.width); off.height=Math.round(vp.height);
    await page.render({canvasContext:off.getContext('2d'),viewport:vp}).promise; const n=pdf.numPages;
    // alternative texte : les lignes de la page, dans l'ordre de lecture
    let lines=[]; try{ const tc=await page.getTextContent(), rows={}; tc.items.forEach(it=>{ if(!it.str.trim()) return; const y=Math.round(it.transform[5]/3); (rows[y]=rows[y]||[]).push(it); });
      lines=Object.keys(rows).map(Number).sort((a,c)=>c-a).map(y=>rows[y].sort((a,c)=>a.transform[4]-c.transform[4]).map(x=>x.str).join(' ').replace(/\s+/g,' ').replace(/[\uFB50-\uFDFF\uFE70-\uFEFC]/g,c=>c.normalize('NFKC')).trim()).filter(Boolean); }catch(e){}   // lam-alif : lettres de base
    pdf.destroy();
    const tx=b.querySelector('.lp-tx'); if(tx&&seq===LIVE.seq) tx.innerHTML=lines.length?lines.map(l=>`<p>${esc(l)}</p>`).join(''):'<p class="hint">Pas de texte lisible.</p>';
    if(seq!==LIVE.seq) return;
    cv.width=off.width; cv.height=off.height; cv.getContext('2d').drawImage(off,0,0); cv.hidden=false; wait.hidden=true;
    b.querySelector('.lp-pg').textContent=n>1?`page 1 sur ${n}`:'';
  }catch(e){ wait.hidden=false; wait.textContent='Aperçu indisponible.'; cv.hidden=true; }
}
document.addEventListener('input',e=>{ if(formView&&e.target.closest('main')) liveSoon(); },true);
/* un clic dans le formulaire ne change le document que s'il porte sur un choix ; ailleurs (fenêtre qui se ferme, menu) l'aperçu revient */
document.addEventListener('click',e=>{ const t=e.target; if(formView&&t.closest&&t.closest('main')&&!t.closest('button,[role=button],label,input[type=checkbox],input[type=radio],select')) return; liveSoon(200); },true);
document.addEventListener('change',e=>{ if(formView&&e.target.closest('main')) liveSoon(150); },true);


/* ======================================================================
   CERFA PRÉ-REMPLIS
   Un Cerfa = le PDF officiel, rangé une fois dans Documents par l'admin,
   + une fiche : quels champs reçoivent les infos de la structure, les pièces
   à joindre, où l'envoyer, la date de la dernière vérification de version.
   L'équipe ouvre le Cerfa déjà rempli pour la partie « structure » et complète
   la partie de la personne dans le document. Rien n'est enregistré ; Librejo
   ne va pas sur internet : l'admin vérifie la version lui-même (rappel à 3 mois).
   ====================================================================== */
const CZ_SRC=[['','— L’équipe remplit —'],['nom','Nom de la structure'],['adresse','Adresse de la structure'],['cp','Code postal'],['ville','Ville'],['tel','Téléphone'],['mail','Mail'],
  ['siret','SIRET'],['finess','FINESS'],['agrement','N° d’agrément'],['responsable','Nom du responsable'],['signataire','Signataire habituel'],['date','Date du jour'],['fixe','Texte fixe…']];
const CZ_INFO=[['adresse','Adresse'],['cp','Code postal'],['ville','Ville'],['tel','Téléphone'],['mail','Mail'],['siret','SIRET'],['finess','FINESS'],['agrement','N° d’agrément'],['responsable','Nom du responsable']];
const CZ_DAYS=90;
function czGuess(){ // retrouve l'adresse, le téléphone… dans l'en-tête et le bas de page déjà réglés
  const L=[...(structure.entete||[]),...(structure.pied||[])].flatMap(s=>String(s).split(/\s+[–-]\s+/)), g={};
  L.forEach(s=>{ const cp=s.match(/\b(\d{5})\s+([A-Za-zÀ-ÿ' -]{2,})$/); if(cp&&!g.cp){ g.cp=cp[1]; g.ville=cp[2].trim(); }
    if(!g.adresse&&/^\d+[\s,]/.test(s.trim())&&/(rue|bd|boulevard|avenue|av\.|place|chemin|all[ée]e|impasse|quai|cours|route|traverse)/i.test(s)) g.adresse=s.trim().replace(/,\s*\d{5}.*$/,'');
    const t=s.match(/t[ée]l[ée]?(?:phone)?\.?\s*:?\s*((?:\+33\s?|0)[\d .]{8,})/i); if(t&&!g.tel) g.tel=t[1].trim();
    const m=s.match(/[^\s@:]+@[^\s@]+\.[a-z]{2,}/i); if(m&&!g.mail) g.mail=m[0]; });
  return g; }
function czInfo(){ return {...czGuess(),...Object.fromEntries(Object.entries(PAR.fiche||{}).filter(([,v])=>String(v||'').trim()))}; }
function czVal(src,fixe){ const I=czInfo();
  if(src==='nom') return structure.nom||''; if(src==='ville') return I.ville||structure.ville||''; if(src==='signataire') return structure.signataire||'';
  if(src==='date') return frDate(today()); if(src==='fixe') return fixe||''; return I[src]||''; }
/* Ce que chaque source devient vraiment : les cases sans valeur sont annoncées, pas comptées */
const CZ_WHERE={nom:'Réglages › Mes courriers',signataire:'Réglages › Mes courriers',fixe:'le réglage du pré-remplissage'};
const czWhere=src=>CZ_WHERE[src]||'Réglages › Structure';
const czLow=s=>/^[A-Z]{2,}/.test(s)?s:s.charAt(0).toLowerCase()+s.slice(1);
function czPlan(champs){ const filled=[], empty=[];
  Object.values(champs||{}).forEach(c=>{ if(!c||!c.src) return; if(c.src==='coche'){ filled.push(c); return; }
    const v=String(czVal(c.src,c.fixe)||'').trim(); if(v) filled.push(c); else if(!empty.some(e=>e.src===c.src)) empty.push({src:c.src,label:(CZ_SRC.find(x=>x[0]===c.src)||[,c.src])[1]}); });
  const at=src=>CZ_SRC.findIndex(x=>x[0]===src); empty.sort((a,b)=>at(a.src)-at(b.src));
  return {n:filled.length,empty}; }
/* « 3 cases resteront vides (SIRET, n° d’agrément, nom du responsable) » ; la phrase dit où les compléter */
function czEmptyTxt(e){ if(!e.length) return ''; const n=e.length, l=e.map(x=>czLow(x.label));
  const where=[...new Set(e.map(x=>czWhere(x.src)))];
  return `${n} case${n>1?'s':''} ${n>1?'resteront vides':'restera vide'} (${l.join(', ')}) : à compléter dans ${where.join(' et ')}`; }
/* Libellé lisible d'une case du PDF (« Nom de l organisme » → « Nom de l’organisme ») */
const CZ_MOTS={numero:'numéro',telephone:'téléphone',prenom:'prénom',premiere:'première',agrement:'agrément',etablissement:'établissement',departement:'département',
  delivre:'délivré',delivree:'délivrée',demandee:'demandée',interesse:'intéressé',beneficiaire:'bénéficiaire',electronique:'électronique',ne:'né',nee:'née',sejour:'séjour',a:'à',
  cp:'code postal',tel:'téléphone',mel:'mél',siret:'SIRET',finess:'FINESS',rpps:'RPPS'};
function czLabel(f){ let t=String((f&&(f.alt||f.name))||'').replace(/\[\d+\]$|#\d+$/g,'').replace(/[_.]+/g,' ').replace(/([a-zà-ÿ])([A-Z])/g,'$1 $2').replace(/\s+/g,' ').trim();
  t=t.replace(/\b([dlDL]|qu|Qu|jusqu|Jusqu)[ ']\s*(?=[aeiouyhàâéèêîôûAEIOUYHÉ])/g,'$1’');
  t=t.split(' ').map((w,i)=>{ const k=w.toLowerCase(), r=CZ_MOTS[k]; if(!r||(k==='a'&&!/^fait$/i.test(t.split(' ')[i-1]||''))) return w; return /^[A-Z]{2,}$/.test(r)?r:(w[0]===w[0].toUpperCase()&&w[0]!==w[0].toLowerCase()?r.charAt(0).toUpperCase()+r.slice(1):r); }).join(' ');
  return t.charAt(0).toUpperCase()+t.slice(1); }
/* Le Cerfa est rempli en Helvetica (WinAnsi) : un caractère hors de cette table serait perdu sans le dire */
const CZ_WIN=new Set([...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ']);
const czWinOk=ch=>{ const c=ch.codePointAt(0); return ch.length===1&&(c===9||c===10||c===13||(c>=32&&c<127)||(c>=160&&c<=255)||CZ_WIN.has(ch)); };
const czClean=v=>String(v).normalize('NFC').replace(/[\u202F\u2007]/g,'\u00A0').replace(/[\u2009\u200A\u2002\u2003]/g,' ').replace(/[\u2010\u2011]/g,'-').replace(/\u2212/g,'-');
function czCharsOk(d,champs){ const bad=[];
  Object.entries(champs||{}).forEach(([name,c])=>{ if(!c||!c.src||c.src==='coche') return; const v=czClean(czVal(c.src,c.fixe)||'');
    let gs; try{ gs=[...new Intl.Segmenter('fr',{granularity:'grapheme'}).segment(v)].map(x=>x.segment); }catch(e){ gs=[...v]; }
    const miss=[...new Set(gs.filter(g=>![...g].every(czWinOk)))];
    if(miss.length) bad.push({miss,label:(CZ_SRC.find(x=>x[0]===c.src)||[,c.src])[1],where:czWhere(c.src),src:c.src}); });
  if(!bad.length) return true;
  const one=b=>`${b.miss.length>1?'Les caractères':'Le caractère'} <b class="badch">${esc(b.miss.join(' '))}</b> de « ${esc(b.label)} » (${esc(b.where)}) ${b.miss.length>1?'ne peuvent':'ne peut'} pas être écrit${b.miss.length>1?'s':''} dans ce Cerfa.`;
  openModal(`<h3 id="modal-title">${bad.length>1||bad[0].miss.length>1?'Des caractères ne peuvent pas être écrits':'Un caractère ne peut pas être écrit'} dans le Cerfa</h3>
    ${bad.length>1?`<ul class="errors">${bad.map(b=>`<li>${one(b)}</li>`).join('')}</ul>`:`<p class="dv-sub">${one(bad[0])}</p>`}
    <p>Le formulaire officiel n’accepte que l’alphabet latin d’Europe de l’Ouest (accents français compris) : l’arabe, le géorgien ou le vietnamien, qui s’impriment dans les autres documents de Librejo, ne peuvent pas y être écrits. ${(()=>{ const pl=bad.length>1||bad[0].miss.length>1; return isAdmin?`Remplacez-${pl?'les':'le'} dans le réglage indiqué, puis recommencez.`:`Prévenez l’admin : il ${pl?'les':'le'} remplacera dans le réglage indiqué. En attendant, écrivez ${pl?'ces cases':'cette case'} à la main.`; })()}</p>
    <div class="btns">${isAdmin&&bad[0].where==='Réglages › Structure'?`<button class="primary" id="czb-go" data-autofocus>Ouvrir Réglages › Structure</button>`:''}<button class="secondary" data-close ${isAdmin&&bad[0].where==='Réglages › Structure'?'':'data-autofocus'}>OK</button></div>`);
  const go=$('#czb-go'); if(go) go.onclick=()=>{ closeModal(); gotoSetting('structure'); };
  return false; }
function czGuessField(f){ const s=norm(f.alt+' '+f.name).replace(/[^a-z0-9]+/g,' ');
  if(f.check) return ''; if(/\bsiret\b/.test(s)) return 'siret'; if(/\bfiness\b/.test(s)) return 'finess'; if(/agrement/.test(s)) return 'agrement';
  const org=/organisme|structure|association|etablissement|domiciliataire|service instructeur|centre/.test(s);
  if(org){ if(/courriel|mail/.test(s)) return 'mail'; if(/telephone|\btel\b/.test(s)) return 'tel'; if(/code postal/.test(s)) return 'cp';
    if(/commune|ville|localite/.test(s)) return 'ville'; if(/adresse|voie|\brue\b/.test(s)) return 'adresse'; if(/responsable|directeur|directrice|president|representant/.test(s)) return 'responsable';
    if(/\bnom\b|denomination|raison sociale|organisme|structure|association/.test(s)) return 'nom'; }
  if(/fait a|lieu de signature/.test(s)) return 'ville'; if(/date (de (la )?)?signature|fait le/.test(s)) return 'date';
  return ''; }
const czAge=d=>d&&d.cerfa&&d.cerfa.verifie?Math.floor((Date.now()-new Date(d.cerfa.verifie).getTime())/864e5):999;
const cerfaDocs=()=>DATA.documents.filter(d=>d.cerfa&&!d.cerfa.off&&d.ext==='pdf');
/* Les champs du PDF, avec leur page et leur position (pour les montrer à l'admin) */
async function czFields(buf){
  const lib=await getPdfjs(), pdf=await lib.getDocument({data:new Uint8Array(buf.slice(0)),isEvalSupported:false}).promise, out=[], seen=new Set();
  const TU={}; try{ await needLib('pdflib'); const doc=await PDFLib.PDFDocument.load(buf.slice(0),{ignoreEncryption:true}); doc.getForm().getFields().forEach(f=>{ const t=f.acroField.dict.lookup(PDFLib.PDFName.of('TU')); if(t&&t.decodeText) TU[f.getName()]=t.decodeText().trim(); }); }catch(e){}
  for(let i=1;i<=pdf.numPages;i++){ const pg=await pdf.getPage(i), anns=await pg.getAnnotations(); let txt=null;
    for(const a of anns){ if(a.subtype!=='Widget'||!a.fieldName||seen.has(a.fieldName)||a.readOnly) continue;
      if(a.fieldType!=='Tx'&&!(a.fieldType==='Btn'&&a.checkBox)) continue; seen.add(a.fieldName);
      let alt=TU[a.fieldName]||a.alternativeText||'';
      if(!alt){ if(!txt) txt=(await pg.getTextContent()).items.filter(t=>t.str.trim()); const [x1,y1,x2,y2]=a.rect, cy=(y1+y2)/2;
        const near=txt.filter(t=>Math.abs(t.transform[5]+(t.height||8)/2-cy)<9&&t.transform[4]<x1+2).sort((p,q)=>(q.transform[4]+q.width)-(p.transform[4]+p.width))[0]
          ||(a.fieldType==='Btn'?txt.filter(t=>Math.abs(t.transform[5]+(t.height||8)/2-cy)<9&&t.transform[4]>=x2-2).sort((p,q)=>p.transform[4]-q.transform[4])[0]:null);
        if(near) alt=near.str.trim(); }
      out.push({name:a.fieldName,alt,page:i,rect:a.rect,check:a.fieldType==='Btn'}); } }
  return {pdf,fields:out};
}
async function czFill(d){
  const buf=await (await readRel(d.chemin)).arrayBuffer();
  await needLib('pdflib'); const doc=await PDFLib.PDFDocument.load(buf,{ignoreEncryption:true}); const form=doc.getForm(); try{ form.deleteXFA(); }catch(e){}
  let n=0; Object.entries(d.cerfa.champs||{}).forEach(([name,c])=>{ if(!c||!c.src) return; try{ const f=form.getField(name);
    if(c.src==='coche'){ f.check(); n++; return; } const v=czClean(czVal(c.src,c.fixe)||''); if(v.trim()){ f.setText(v); n++; } }catch(e){ console.warn('Cerfa : case',name,e); } });
  try{ form.acroForm.dict.set(PDFLib.PDFName.of('NeedAppearances'),PDFLib.PDFBool.True); }catch(e){}
  return {blob:new Blob([await doc.save()],{type:'application/pdf'}),n,crypte:doc.isEncrypted};
}

/* ---------- Page de l'équipe ---------- */
function renderCerfa(){
  const d=DATA.documents.find(x=>'cerfa:'+x.id===formView); if(!d||!d.cerfa){ formView=null; return renderForms(); }
  const C=d.cerfa, p=$('#p-forms'), part=C.partenaire?annuPart(C.partenaire):null, age=czAge(d);
  const lines=s=>String(s||'').split('\n').map(x=>x.replace(/^[-•*]\s*/,'').trim()).filter(Boolean);
  const pieces=lines(C.pieces), plan=czPlan(C.champs), nAuto=plan.n;
  p.innerHTML=`<button class="backlink" data-back>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🧾</span>${esc(d.titre)}</h2>
    <p class="hint">${C.numero?`Cerfa n° ${esc(C.numero)} · `:''}${C.verifie?`version vérifiée le ${esc(frDate(C.verifie))}`:'version pas encore vérifiée'}</p>
    ${isAdmin&&age>CZ_DAYS?`<div class="cz-warn">${C.verifie?'Vérifiée il y a plus de 3 mois':'Version jamais vérifiée'} : regardez sur service-public.fr si une nouvelle version existe. <button class="secondary sm" data-czcheck>Vérifier les Cerfa</button></div>`:''}
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>${nAuto?`Le Cerfa s’ouvre avec les infos de la structure déjà remplies (${nAuto} case${nAuto>1?'s':''}).`:'Le Cerfa s’ouvre vierge : aucune info de la structure n’est encore réglée.'} Complétez la partie de la personne dans le document, puis imprimez. Rien n’est enregistré.</span></div>
    ${plan.empty.length?`<div class="cz-warn cz-empty"><span>${esc(isAdmin?czEmptyTxt(plan.empty)+'.':plan.empty.length+' case'+(plan.empty.length>1?'s':'')+' de la structure '+(plan.empty.length>1?'resteront vides':'restera vide')+' ('+plan.empty.map(x=>czLow(x.label)).join(', ')+') : remplissez-'+(plan.empty.length>1?'les':'la')+' à la main, ou demandez à l’admin de '+(plan.empty.length>1?'les':'la')+' compléter dans '+[...new Set(plan.empty.map(x=>czWhere(x.src)))].join(' et ')+'.')}</span>${isAdmin&&plan.empty.some(x=>czWhere(x.src)==='Réglages › Structure')?`<button class="secondary sm" data-czreg>Compléter dans Réglages › Structure</button>`:''}</div>`:''}
    <div class="cz-grid">
      ${pieces.length?`<div class="card top"><h3>Pièces à joindre</h3><ul class="cz-list">${pieces.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}
      ${part||C.envoi?`<div class="card top blue"><h3>Où l’envoyer</h3>${part?`<p class="m-0"><b>${esc(part.nom)}</b>${partAddr(part)?`<br>${esc(partAddr(part))}`:''}${part.tel?`<br>${esc(part.tel)}`:''}</p>${part.emails.length?`<div class="row">${part.emails.slice(0,3).map(m=>`<button class="linkbtn" data-czmail="${esc(m)}">${esc(m)}</button>`).join('')}</div>`:''}`:''}${C.envoi?`<p class="cz-note">${esc(C.envoi)}</p>`:''}</div>`:''}
    </div>
    <div class="stickyfoot w-form"><button class="primary big" data-czopen>${ICON.file}Ouvrir le Cerfa pré-rempli</button></div>
    ${isAdmin?`<div class="row end w-form"><button class="ghost" data-czedit>${ICON.pen}Modifier le pré-remplissage</button></div>`:''}`;
  p.querySelectorAll('[data-czreg]').forEach(b=>b.onclick=()=>gotoSetting('structure'));
  p.querySelector('[data-czopen]').onclick=async()=>{ if(!czCharsOk(d,C.champs)) return; try{ const r=await czFill(d); const u=URL.createObjectURL(r.blob); previewUrl(u,d.titre+' — à compléter');
      if(r.crypte) toast('Ce PDF est protégé : vérifiez que les cases remplies apparaissent bien.'); }catch(e){ console.error(e); toast('Impossible de préparer ce Cerfa : '+(e.message||e)); } };
  p.querySelectorAll('[data-czedit]').forEach(b=>b.onclick=()=>cerfaSetup(d));
  p.querySelectorAll('[data-czcheck]').forEach(b=>b.onclick=()=>cerfaCheck());
  p.querySelectorAll('[data-czmail]').forEach(b=>b.onclick=()=>mailCompose({to:[b.dataset.czmail],subject:d.titre,body:'Bonjour,\n\n\n\nCordialement,\n'+structure.signataire,files:[]}));
}

/* ---------- Réglage par l'admin ---------- */
async function cerfaSetup(d){
  let F=null; try{ F=await czFields(await (await readRel(d.chemin)).arrayBuffer()); }catch(e){ toast('PDF illisible.'); return; }
  const C=JSON.parse(JSON.stringify(d.cerfa||{})); C.champs=C.champs||{}; const first=!d.cerfa;
  if(first) F.fields.forEach(f=>{ const g=czGuessField(f); if(g) C.champs[f.name]={src:g}; });
  const info={...czInfo(),...(PAR.fiche||{})};
  const num=C.numero||((d.titre+' '+d.fichier).match(/\b(\d{5})\s*[*_-]?\s*(\d{2})?\b/)||[]).slice(1).filter(Boolean).join('*');
  const opt=(f,c)=>f.check?`<option value="">— L’équipe coche —</option><option value="coche" ${c.src==='coche'?'selected':''}>Toujours cochée</option>`
    :CZ_SRC.map(([k,l])=>`<option value="${k}" ${c.src===k?'selected':''}>${esc(l)}</option>`).join('');
  const label=f=>esc(czLabel(f));
  openModal(`<h3 id="modal-title">Pré-remplir : ${esc(d.titre)}</h3><div id="cz-wrap">
    ${F.fields.length?'':`<div class="cz-warn">Ce PDF n’a pas de cases à remplir : il ne peut pas être pré-rempli. Il reste imprimable tel quel depuis Documents.</div>`}
    <div class="fieldgrid">
      <label class="field"><span>Numéro du Cerfa</span><input class="in" id="cz-num" value="${esc(num)}" placeholder="ex. 16029*01"></label>
      <label class="field"><span>Rubrique</span><select class="in" id="cz-rub">${FORM_GROUPS.map(([g,n])=>`<option value="${g}" ${(C.rubrique||'social')===g?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
      <div class="field wide"><span>Version</span><div class="row"><label class="check"><input type="checkbox" id="cz-ver" ${first||czAge(d)>CZ_DAYS?'':'checked'}> J’ai vérifié aujourd’hui que c’est la dernière version</label>
        <a class="linkbtn" href="https://www.service-public.gouv.fr/particuliers/recherche?keyword=${encodeURIComponent('cerfa '+(num||d.titre))}" target="_blank" rel="noopener">Chercher sur service-public.fr ›</a></div>
        <small class="hint">${C.verifie?`Dernière vérification : ${esc(frDate(C.verifie))}.`:'Jamais vérifiée.'} Librejo vous le rappellera dans 3 mois. Pour une nouvelle version : Documents › Modifier › Nouvelle version.</small></div>
    </div>
    ${F.fields.length?`<h4 class="cz-h">Cases remplies par Librejo</h4><p class="hint m-0">Choisissez ce que Librejo écrit dans chaque case. Survolez une case pour la voir sur la page. Ne remplissez jamais une case qui concerne la personne.</p>
    <div class="cz-map"><div class="cz-fields">${F.fields.map((f,i)=>{ const c=C.champs[f.name]||{}; return `<div class="cz-f${c.src?' on':''}" data-fi="${i}"><span class="cz-l" title="${esc(f.name)}">${label(f)}<small>p. ${f.page}${f.check?' · case à cocher':''}</small></span>
      <select class="in" data-fs aria-label="Contenu de la case ${label(f)}">${opt(f,c)}</select><input class="in" data-fx value="${esc(c.fixe||'')}" placeholder="Texte fixe" ${c.src==='fixe'?'':'hidden'}></div>`; }).join('')}</div>
      <div class="cz-page"><canvas id="cz-cv"></canvas><small class="hint" id="cz-pg"></small></div></div>`:''}
    <details class="cz-info" ${first?'open':''}><summary>Infos de la structure <small>(servent à tous les Cerfa ; complétées d’après votre en-tête)</small></summary>
      <div class="fieldgrid">${CZ_INFO.map(([k,l])=>`<label class="field"><span>${esc(l)}</span><input class="in" data-ci="${k}" value="${esc(info[k]||'')}"></label>`).join('')}</div></details>
    <h4 class="cz-h">Mode d’emploi pour l’équipe</h4>
    <div class="fieldgrid">
      <label class="field wide"><span>Pièces à joindre <small>(une par ligne)</small></span><textarea class="in" id="cz-pieces" rows="4">${esc(C.pieces||'')}</textarea></label>
      <label class="field"><span>Où l’envoyer <small>(fiche de l’annuaire)</small></span><input class="in" id="cz-part" list="cz-parts" value="${esc((annuPart(C.partenaire)||{}).nom||'')}" placeholder="chercher dans l’annuaire"><datalist id="cz-parts">${ANNU.partenaires.map(x=>`<option value="${esc(x.nom)}">`).join('')}</datalist></label>
      <label class="field"><span>Précisions <small>(facultatif)</small></span><textarea class="in" id="cz-envoi" rows="2">${esc(C.envoi||'')}</textarea></label>
    </div>
    <div class="cz-warn cz-empty" id="cz-empty" role="status" hidden></div>
    <div class="row between"><div class="row"><button class="primary" id="cz-ok">${first?'Proposer ce Cerfa à l’équipe':'Enregistrer'}</button><button class="secondary" id="cz-test">Essayer</button><button class="secondary" data-close>Annuler</button></div>
      ${first?'':`<button class="ghost danger" id="cz-off">Ne plus le proposer</button>`}</div></div>`,'wide czdlg');
  const W=$('#cz-wrap'), cv=$('#cz-cv'); let shown=0, pageImg=null;
  const draw=async i=>{ if(!cv) return; const f=F.fields[i]; if(!f) return;
    if(shown!==f.page){ shown=f.page; const pg=await F.pdf.getPage(f.page), v0=pg.getViewport({scale:1}), vp=pg.getViewport({scale:460/v0.width}); const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
      await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; pageImg={c,vp}; }
    if(!pageImg) return; cv.width=pageImg.c.width; cv.height=pageImg.c.height; const g=cv.getContext('2d'); g.drawImage(pageImg.c,0,0);
    const [x1,y1,x2,y2]=pageImg.vp.convertToViewportRectangle(f.rect); g.lineWidth=3; g.strokeStyle='#E9A23B'; g.fillStyle='rgba(233,162,59,.22)';
    const rx=Math.min(x1,x2)-3, ry=Math.min(y1,y2)-3, rw=Math.abs(x2-x1)+6, rh=Math.abs(y2-y1)+6; g.fillRect(rx,ry,rw,rh); g.strokeRect(rx,ry,rw,rh);
    $('#cz-pg').textContent=`Page ${f.page} · ${czLabel(f)}`; };
  if(F.fields.length) draw(0);
  W.addEventListener('mouseover',e=>{ const r=e.target.closest('.cz-f'); if(r) draw(+r.dataset.fi); });
  W.addEventListener('focusin',e=>{ const r=e.target.closest('.cz-f'); if(r) draw(+r.dataset.fi); });
  W.addEventListener('change',e=>{ const s=e.target.closest('[data-fs]'); if(!s) return; const r=s.closest('.cz-f'); r.classList.toggle('on',!!s.value); r.querySelector('[data-fx]').hidden=s.value!=='fixe'; });
  const read=()=>{ const champs={}; W.querySelectorAll('.cz-f').forEach(r=>{ const f=F.fields[+r.dataset.fi], v=r.querySelector('[data-fs]').value; if(v) champs[f.name]={src:v,alt:f.alt,...(v==='fixe'?{fixe:r.querySelector('[data-fx]').value.trim()}:{})}; });
    const fiche={}; W.querySelectorAll('[data-ci]').forEach(i=>{ if(i.value.trim()) fiche[i.dataset.ci]=i.value.trim(); });
    const pn=$('#cz-part').value.trim(), part=ANNU.partenaires.find(x=>x.nom===pn);
    return {cerfa:{numero:$('#cz-num').value.trim(),rubrique:$('#cz-rub').value,champs,pieces:$('#cz-pieces').value.trim(),partenaire:part?part.id:'',envoi:$('#cz-envoi').value.trim(),verifie:$('#cz-ver').checked?today():(C.verifie||'')},fiche}; };
  const emptyNow=()=>{ const {cerfa,fiche}=read(), oldF=PAR.fiche; PAR.fiche=fiche; try{ return czPlan(cerfa.champs).empty; } finally{ PAR.fiche=oldF; } };
  const showEmpty=()=>{ const e=emptyNow(), box=$('#cz-empty'); if(!box) return; box.hidden=!e.length;
    box.innerHTML=e.length?`<span>${esc(czEmptyTxt(e).replace('Réglages › Structure','« Infos de la structure » ci-dessus (ou plus tard dans Réglages › Structure)'))}.</span>`:''; };
  W.addEventListener('input',e=>{ if(e.target.closest('[data-ci],[data-fx]')) showEmpty(); }); W.addEventListener('change',showEmpty); showEmpty();
  $('#cz-test').onclick=async()=>{ const {cerfa,fiche}=read(), oldF=PAR.fiche; PAR.fiche=fiche; if(!czCharsOk(d,cerfa.champs)){ PAR.fiche=oldF; return; } try{ const r=await czFill({...d,cerfa}); previewUrl(URL.createObjectURL(r.blob),'Essai — '+d.titre); }catch(e){ toast('Essai impossible : '+(e.message||e)); } finally{ PAR.fiche=oldF; } };
  $('#cz-ok').onclick=async()=>{ const {cerfa,fiche}=read(); const before=d.cerfa, bf=PAR.fiche;
    d.cerfa=cerfa; PAR.fiche=fiche;
    if(await run(async()=>{ await saveData(); await saveParams(); },first?'Le Cerfa est proposé dans Formulaires':'Cerfa enregistré')){ closeModal(); renderForms(); if(typeof renderDocs==='function') renderDocs();
      const e=czPlan(cerfa.champs).empty; if(e.length) czEmptyModal(d,e,first); }
    else{ d.cerfa=before; PAR.fiche=bf; } };
  const off=$('#cz-off'); if(off) off.onclick=()=>askConfirm('Ne plus proposer ce Cerfa ?','Il reste dans Documents, sans pré-remplissage.','Retirer',async()=>{ const b=d.cerfa; delete d.cerfa; if(!await run(saveData,'Cerfa retiré des formulaires')) d.cerfa=b; renderForms(); });
}


/* Après « Proposer ce Cerfa » : l'admin sait quelles cases l'équipe trouvera vides, et où les compléter */
function czEmptyModal(d,e,first){
  const reg=e.some(x=>czWhere(x.src)==='Réglages › Structure');
  openModal(`<h3 id="modal-title">${first?'Cerfa proposé à l’équipe':'Cerfa enregistré'}, avec des cases vides</h3>
    <p class="dv-sub">${esc(czEmptyTxt(e))}.</p>
    <p>En attendant, l’équipe devra ${e.length>1?'les':'la'} remplir à la main sur « ${esc(d.titre)} ».</p>
    <div class="btns">${reg?`<button class="primary" id="cze-go" data-autofocus>Ouvrir Réglages › Structure</button>`:`<button class="primary" id="cze-edit" data-autofocus>Revoir le pré-remplissage</button>`}<button class="secondary" data-close>Plus tard</button></div>`);
  const g=$('#cze-go'); if(g) g.onclick=()=>{ closeModal(); gotoSetting('structure'); };
  const ed=$('#cze-edit'); if(ed) ed.onclick=()=>{ closeModal(); cerfaSetup(d); };
}

/* ---------- Vérifier les Cerfa (bouton admin) et préparer une nouvelle version ----------
   Librejo lit une liste publique (cerfa.json, tenue à jour chaque mois par un robot à partir des
   données ouvertes de Service-Public). Il ne fait que lire, sur clic de l'admin : rien n'est envoyé.
   Une nouvelle version n'est jamais installée seule : l'admin compare et valide. */
const czNum=n=>{ const m=String(n||'').match(/(\d{5})\s*\*?\s*(\d{2})?/); return m?{base:m[1],v:m[2]?+m[2]:0}:null; };
const CZ_LIST_DEFAULT='https://raw.githubusercontent.com/librejoapp/librejo/main/cerfa/cerfa.json';
const CZ_LIST_OLD='https://raw.githubusercontent.com/julienaron/librejo/main/cerfa/cerfa.json'; // ancienne adresse (dépôt personnel) : remplacée
/* Liens de la liste : https vers un site public officiel seulement (service-public, gouv.fr) */
const czSafe=u=>{ try{ const x=new URL(String(u||'')); return x.protocol==='https:'&&/(^|\.)(service-public\.(gouv\.)?fr|gouv\.fr)$/.test(x.hostname)?x.href:''; }catch(e){ return ''; } };
async function cerfaCheck(){
  const docs=cerfaDocs();
  openModal(`<h3 id="modal-title">Vérifier les Cerfa</h3><div id="cc-wrap">
    <p class="m-0">Librejo lit la liste publique des Cerfa en vigueur et ${docs.length>1?`la compare aux ${docs.length} Cerfa proposés à l’équipe`:docs.length?'la compare au Cerfa proposé à l’équipe':'la compare aux Cerfa proposés à l’équipe (aucun pour l’instant)'}. <b>Il ne fait que lire : rien n’est envoyé.</b> Aucune nouvelle version n’est installée sans votre accord.</p>
    <label class="field"><span>Adresse de la liste <small>(fournie avec Librejo ; à changer seulement si on vous le demande)</small></span><input class="in" id="cc-url" value="${esc(PAR.cerfaListe&&PAR.cerfaListe!==CZ_LIST_OLD?PAR.cerfaListe:CZ_LIST_DEFAULT)}" placeholder="https://…/cerfa.json" spellcheck="false"></label>
    <div id="cc-res"></div>
    <div class="btns"><button class="primary" id="cc-go">Vérifier maintenant</button><button class="secondary" data-close>Fermer</button></div></div>`,'wide');
  $('#cc-go').onclick=async()=>{
    const url=$('#cc-url').value.trim(), res=$('#cc-res'); if(!/^(https:\/\/|http:\/\/localhost[:/])/.test(url)){ toast('Indiquez l’adresse de la liste (https://…).'); return; }
    res.innerHTML='<p class="hint">Lecture de la liste…</p>'; let L;
    try{ const r=await fetch(url,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'}); if(!r.ok) throw new Error('réponse '+r.status); L=await r.json(); if(!L||!L.cerfa||typeof L.cerfa!=='object') throw new Error('liste illisible');
      Object.values(L.cerfa).forEach(c=>{ if(c&&typeof c==='object'){ c.page=czSafe(c.page); c.url=czSafe(c.url); c.numero=String(c.numero||''); c.titre=String(c.titre||''); } }); }
    catch(e){ res.innerHTML=`<div class="cz-warn"><span>La liste n’a pas pu être lue (${esc(e.message||'réseau')}). Le réseau ou le pare-feu de la structure bloque peut-être cette adresse : parlez-en au service informatique, ou vérifiez à la main sur service-public.fr.</span></div>`; return; }
    const rows=[], okDocs=[];
    docs.forEach(d=>{ const loc=czNum(d.cerfa.numero), rem=loc&&L.cerfa[loc.base], rv=rem&&czNum(rem.numero);
      if(!loc) rows.push({d,cls:'warn',txt:'Numéro du Cerfa non renseigné : ajoutez-le dans le réglage du pré-remplissage.'});
      else if(!rem) rows.push({d,cls:'warn',txt:`${loc.base} absent de la liste officielle (formulaire supprimé, ou propre à un organisme) : à vérifier à la main.`});
      else if(rv.v>loc.v) rows.push({d,cls:'new',rem,txt:`Nouvelle version : ${esc(rem.numero)} (vous avez ${esc(d.cerfa.numero)}).`});
      else { rows.push({d,cls:'ok',txt:`À jour (${esc(rem.numero)}).`}); okDocs.push(d); } });
    const before=okDocs.map(d=>d.cerfa.verifie); okDocs.forEach(d=>d.cerfa.verifie=today()); const urlBefore=PAR.cerfaListe; PAR.cerfaListe=url;
    if(!await run(async()=>{ await saveData(); await saveParams(); })){ okDocs.forEach((d,i)=>d.cerfa.verifie=before[i]); PAR.cerfaListe=urlBefore; }
    res.innerHTML=`<p class="hint">Liste du ${esc(L.maj?frDate(L.maj):'?')} · ${L.n||Object.keys(L.cerfa).length} Cerfa connus.</p>
      ${rows.length?`<div class="cc-list">${rows.map((r,i)=>`<div class="cc-row ${r.cls}"><span><b>${esc(r.d.titre)}</b><small>${r.txt}</small></span>
        ${r.rem?`<span class="row">${r.rem.page?`<a class="linkbtn" href="${esc(r.rem.page)}" target="_blank" rel="noopener">Page officielle ›</a>`:''}<button class="primary sm" data-ccup="${i}">Préparer la mise à jour</button></span>`:''}</div>`).join('')}</div>`
      :'<p>Aucun Cerfa n’est encore proposé à l’équipe.</p>'}
      ${okDocs.length?`<p class="hint">${okDocs.length>1?'Les Cerfa à jour sont notés « vérifiés aujourd’hui »':'Le Cerfa à jour est noté « vérifié aujourd’hui »'} : le rappel des 3 mois repart de zéro.</p>`:''}`;
    res.onclick=e=>{ const b=e.target.closest('[data-ccup]'); if(b){ const r=rows[+b.dataset.ccup]; cerfaUpdate(r.d,r.rem); } };
  };
  $('#cc-go').click();
}
async function cerfaUpdate(d,rem){
  let newBuf=null, newName='';
  openModal(`<h3 id="modal-title">Nouvelle version : ${esc(d.titre)}</h3><div id="cu-wrap">
    <p class="m-0">Version actuelle : <b>${esc(d.cerfa.numero||'?')}</b> · nouvelle version : <b>${esc(rem.numero)}</b>${rem.titre?` · ${esc(rem.titre)}`:''}</p>
    <div id="cu-get">
      <div class="row">${rem.url&&/\.pdf(\?|$)/i.test(rem.url)?`<button class="primary" id="cu-dl">${ICON.dl}Télécharger depuis le site officiel</button>`:''}${rem.page?`<a class="secondary" href="${esc(rem.page)}" target="_blank" rel="noopener">Ouvrir la page officielle</a>`:''}</div>
      <label class="dropzone" id="cu-drop">${ICON.up}<b>Ou déposez ici le nouveau PDF</b><span>téléchargé depuis service-public.fr</span><input type="file" id="cu-file" accept=".pdf,application/pdf" hidden></label>
    </div>
    <div id="cu-cmp"></div>
    <div class="btns"><button class="primary" id="cu-ok" hidden>Valider la nouvelle version</button><button class="secondary" data-close>Annuler</button></div></div>`,'wide czdlg');
  const show=async(buf,name)=>{
    if(new TextDecoder().decode(new Uint8Array(buf.slice(0,5)))!=='%PDF-'){ toast('Ce fichier n’est pas un PDF.'); return; }
    let NF; try{ NF=await czFields(buf); }catch(e){ toast('PDF illisible.'); return; }
    const OF=await czFields(await (await readRel(d.chemin)).arrayBuffer());
    const altOld=Object.fromEntries(OF.fields.map(f=>[f.name,f.alt]));
    const champs={}, repris=[], perdus=[], devines=[];
    Object.entries(d.cerfa.champs||{}).forEach(([name,c])=>{ if(!c||!c.src) return; const alt=c.alt||altOld[name]||'';
      let nf=NF.fields.find(f=>f.name===name); if(nf&&alt&&nf.alt&&anKey(nf.alt)!==anKey(alt)) nf=null; // même nom mais autre case : on ne reprend pas
      if(!nf&&alt) nf=NF.fields.find(f=>!champs[f.name]&&f.alt&&anKey(f.alt)===anKey(alt));
      if(nf){ champs[nf.name]={...c,alt:nf.alt}; repris.push(czLabel(nf)); } else perdus.push(czLabel({alt,name})); });
    NF.fields.forEach(f=>{ if(champs[f.name]) return; const g=czGuessField(f); if(g&&!Object.values(champs).some(c=>c.src===g&&!['ville','date'].includes(g))){ champs[f.name]={src:g,alt:f.alt}; devines.push(czLabel(f)); } });
    newBuf=buf; newName=name; d._cuChamps=champs;
    $('#cu-get').hidden=true;
    $('#cu-cmp').innerHTML=`<div class="cu-sum"><span class="im-st up">${repris.length} case${repris.length>1?'s':''} reprise${repris.length>1?'s':''}</span>
        ${perdus.length?`<span class="im-st warn">${perdus.length} à revoir : ${esc(perdus.slice(0,4).join(', '))}${perdus.length>4?'…':''}</span>`:''}
        ${devines.length?`<span class="im-st new">${devines.length} nouvelle${devines.length>1?'s':''} case${devines.length>1?'s':''} devinée${devines.length>1?'s':''}</span>`:''}</div>
      <div class="cu-pair"><figure><figcaption>Version actuelle</figcaption><canvas id="cu-old"></canvas></figure><figure><figcaption>Nouvelle version</figcaption><canvas id="cu-new"></canvas></figure></div>
      <p class="hint">Comparez les deux premières pages. Après validation, ${perdus.length||devines.length?'le réglage des cases s’ouvre pour vérifier ce qui a changé':'vous pourrez faire un essai'}. L’ancienne version reste archivée.</p>`;
    const paint=async(pdf,id)=>{ const pg=await pdf.getPage(1), v0=pg.getViewport({scale:1}), vp=pg.getViewport({scale:420/v0.width}), c=$('#'+id); if(!c) return; c.width=vp.width; c.height=vp.height; await pg.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; };
    paint(OF.pdf,'cu-old'); paint(NF.pdf,'cu-new');
    $('#cu-ok').hidden=false; $('#cu-ok').dataset.review=perdus.length||devines.length?'1':'';
  };
  const dl=$('#cu-dl'); if(dl) dl.onclick=async()=>{ dl.disabled=true; dl.textContent='Téléchargement…';
    try{ const r=await fetch(rem.url,{credentials:'omit',referrerPolicy:'no-referrer'}); if(!r.ok) throw 0; await show(await r.arrayBuffer(),rem.url.split('/').pop().split('?')[0]||'cerfa.pdf'); }
    catch(e){ dl.hidden=true; toast('Le site officiel ne laisse pas Librejo télécharger ce fichier : téléchargez-le vous-même puis déposez-le ici.'); } };
  const drop=$('#cu-drop'), fi=$('#cu-file'); const take=async f=>{ if(f) await show(await f.arrayBuffer(),f.name); };
  fi.onchange=()=>take(fi.files[0]); drop.ondragover=e=>{ e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave=()=>drop.classList.remove('over');
  drop.ondrop=e=>{ e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); };
  $('#cu-ok').onclick=async()=>{ if(!newBuf) return; const review=$('#cu-ok').dataset.review, before=JSON.parse(JSON.stringify(d.cerfa));
    d.cerfa={...d.cerfa,champs:d._cuChamps,numero:rem.numero,verifie:today()}; delete d._cuChamps;
    const file=new File([newBuf],newName.endsWith('.pdf')?newName:newName+'.pdf',{type:'application/pdf'});
    if(await newVersion(d,file)){ closeModal(); renderForms(); if(review) cerfaSetup(d); else toast('Nouvelle version en place pour l’équipe'); }
    else d.cerfa=before; };
}


/* ======================================================================
   ASSISTANT AU PREMIER LANCEMENT
   8 étapes : bienvenue, structure (avec aperçu de l'en-tête), équipe, catégories,
   modèles, mail, mot de passe, récapitulatif. On peut s'arrêter et reprendre :
   le brouillon est gardé sur ce poste (il ne contient aucune donnée d'usager,
   ni le mot de passe). À la fin, les fichiers de réglages sont écrits dans le dossier.
   ====================================================================== */
const WZ_KEY='librejo-assistant';
const WZ_TYPES=[['csapa','CSAPA'],['caarud','CAARUD'],['chrs','CHRS / hébergement'],['mecs','MECS / protection de l’enfance'],['ehpad','EHPAD / personnes âgées'],
  ['handicap','Handicap (SAVS, SAMSAH, IME, ESAT…)'],['asile','Asile (CADA, HUDA…)'],['accueil','Accueil de jour'],['autre','Autre']];
const WZ_CATS={csapa:['Accueil','Soins','Réduction des risques','Social','Partenaires'],caarud:['Accueil','Réduction des risques','Santé','Social','Partenaires'],
  chrs:['Admission','Hébergement','Santé','Démarches','Règlement'],mecs:['Admission','Vie quotidienne','Scolarité','Santé','Droits des familles'],
  ehpad:['Admission','Soins','Vie sociale','Familles','Qualité'],handicap:['Admission','Projet personnalisé','Santé','Droits','Partenaires'],
  asile:['Admission','Procédure','Santé','Hébergement','Démarches'],accueil:['Accueil','Démarches','Santé','Partenaires'],autre:['Accueil','Démarches','Santé','Partenaires']};
const WZ_PACKS={csapa:['droits','qualite','social','addicto','liaison'],caarud:['droits','social','addicto','liaison'],chrs:['droits','qualite','social','asile','liaison'],
  mecs:['droits','qualite','enfance'],ehpad:['droits','qualite','agees','liaison'],handicap:['droits','qualite','handicap','liaison'],asile:['droits','social','asile','liaison'],
  accueil:['droits','social','liaison'],autre:['droits','qualite']};
const WZ_STEPS=['Bienvenue','Votre structure','Votre équipe','Catégories et noms','Vos modèles','Le mail','Le mot de passe','C’est parti'];
let WZ=null;
function wizNeeded(){ return PAR.assistant==='a-faire'||(!PAR.assistant&&!((PAR.attestation||{}).nom)); }
function wizDraft(){ let d=null; try{ d=JSON.parse(localStorage.getItem(WZ_KEY)||'null'); }catch(e){}
  const a=PAR.attestation||{}, F=PAR.fiche||{};
  return d||{step:0,nom:a.nom||'',type:PAR.typeStructure||'',adresse:F.adresse||'',cp:F.cp||'',ville:F.ville||a.ville||'',tel:F.tel||'',mail:F.mail||'',siret:F.siret||'',finess:F.finess||'',
    logo:(PAR.apparence||{}).logo||null,signataire:a.signataire||'',medecins:(PAR.medecins||[]).length?'oui':'',meds:(PAR.medecins||[]).map(m=>({nom:m.nom,rpps:m.rpps})),
    cats:null,packs:null,mailmode:PAR.mail||'',envoi:(PAR.envoi||[]).join('\n'),webmail:PAR.webmail||'https://outlook.office.com/mail/deeplink/compose'}; }
function wizSave(){ if(!WZ) return; try{ const {pw,pw2,...d}=WZ; localStorage.setItem(WZ_KEY,JSON.stringify(d)); }catch(e){} }
function wizOpen(){
  WZ=wizDraft(); WZ.pw=''; WZ.pw2='';
  let o=document.getElementById('wiz'); if(!o){ o=document.createElement('div'); o.id='wiz'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-labelledby','wz-h'); document.body.appendChild(o); }
  o.hidden=false; document.documentElement.classList.add('wiz-on'); wizDraw();
}
function wizClose(){ const o=document.getElementById('wiz'); if(o) o.hidden=true; document.documentElement.classList.remove('wiz-on'); }
const wzOpt=(v,cur,txt)=>`<option value="${esc(v)}" ${v===cur?'selected':''}>${esc(txt)}</option>`;
function wizEntete(){ const W=WZ, typ=(WZ_TYPES.find(t=>t[0]===W.type)||[])[1]||'';
  return {nom:W.nom.trim(),signataire:W.signataire.trim()||('L’équipe '+(W.nom.trim()||'')),ville:W.ville.trim(),
    entete:[W.nom.trim(),typ&&W.type!=='autre'?typ.replace(/ \(.*\)| \/.*$/,''):'',W.adresse.trim(),[W.cp.trim(),W.ville.trim().toUpperCase()].filter(Boolean).join(' ')].filter(Boolean),
    pied:[W.nom.trim(),[W.adresse.trim(),[W.cp.trim(),W.ville.trim()].filter(Boolean).join(' ')].filter(Boolean).join(' – '),[W.tel.trim()&&'Tél. : '+W.tel.trim(),W.mail.trim()].filter(Boolean).join(' – '),
      [W.siret.trim()&&'SIRET '+W.siret.trim(),W.finess.trim()&&'FINESS '+W.finess.trim()].filter(Boolean).join(' – ')].filter(Boolean)}; }
function wizNomPrev(ret){ const W=WZ, n={fichier:W.nomFichier||NOM_DEF.fichier,sep:W.nomSep||'-',dossier:W.nomDossier||NOM_DEF.dossier}, c=(W.cats||[]).find(x=>x.trim())||'Accueil';
  const t=`Exemple : <code>${esc(applyNom(n.fichier,{titre:'Protocole douleur',v:1,date:month()},n.sep))}.pdf</code> rangé dans 📁 <code>${esc(String(n.dossier).replace('{NN}','01').replace('{Nom}',c).replace('{NOM}',c.toUpperCase()).replace('{nom}',c.toLowerCase()))}</code>`;
  if(ret) return t; const el=document.getElementById('wz-nmprev'); if(el) el.innerHTML=t; }
function wizBody(){ const W=WZ, s=W.step;
  if(s===0) return `<h2 id="wz-h">Bienvenue dans Librejo</h2>
    <p class="wz-lead">En quelques minutes, Librejo prépare les documents et les formulaires de votre structure.</p>
    <ul class="wz-points"><li><b>On peut s’arrêter à tout moment</b> et reprendre plus tard là où on en était.</li><li><b>Le facultatif est indiqué</b> : rien ne bloque si vous n’avez pas un numéro sous la main.</li>
      <li><b>Tout se modifie ensuite</b> dans le mode admin (Réglages).</li><li>Aucune donnée de personne accompagnée n’est demandée ici.</li></ul>
    <section class="wz-checks" aria-labelledby="wz-ckh"><h3 id="wz-ckh">Vérifications</h3><div id="wz-ck"></div></section>`;
  if(s===1) return `<h2 id="wz-h">Votre structure</h2><p class="wz-lead">Ces informations forment l’en-tête et le bas de page de tous vos documents.</p>
    <div class="wz-split"><div class="fieldgrid">
      <label class="field wide"><span>Nom de la structure</span><input class="in" data-w="nom" value="${esc(W.nom)}" data-autofocus></label>
      <label class="field wide"><span>Type de structure</span><select class="in" data-w="type"><option value="">Choisir…</option>${WZ_TYPES.map(([k,n])=>wzOpt(k,W.type,n)).join('')}</select></label>
      <label class="field wide"><span>Adresse</span><input class="in" data-w="adresse" value="${esc(W.adresse)}"></label>
      <label class="field"><span>Code postal</span><input class="in" data-w="cp" value="${esc(W.cp)}" inputmode="numeric"></label>
      <label class="field"><span>Ville</span><input class="in" data-w="ville" value="${esc(W.ville)}"></label>
      <label class="field"><span>Téléphone</span><input class="in" data-w="tel" value="${esc(W.tel)}"></label>
      <label class="field"><span>Mail de la structure</span><input class="in" data-w="mail" value="${esc(W.mail)}" spellcheck="false"></label>
      <label class="field"><span>SIRET <small>(facultatif)</small></span><input class="in" data-w="siret" value="${esc(W.siret)}"></label>
      <label class="field"><span>FINESS <small>(facultatif)</small></span><input class="in" data-w="finess" value="${esc(W.finess)}"></label>
      <div class="field wide"><span>Logo <small>(facultatif : PNG ou JPEG)</small></span><div class="row">${W.logo?`<img class="wz-logo" src="${W.logo}" alt="Logo choisi">`:''}<label class="secondary">${ICON.up}${W.logo?'Changer':'Choisir une image'}<input type="file" id="wz-logo" accept="image/png,image/jpeg" hidden></label>${W.logo?'<button type="button" class="ghost" id="wz-logodel">Retirer</button>':''}</div></div>
    </div><figure class="wz-prev"><canvas id="wz-cv"></canvas><figcaption class="hint">Aperçu d’un courrier. Police, couleurs, marge : dans Réglages › Papier à en-tête, plus tard.</figcaption></figure></div>`;
  if(s===2) return `<h2 id="wz-h">Votre équipe</h2>
    <div class="fieldgrid"><label class="field wide"><span>Signature habituelle des courriers</span><input class="in" data-w="signataire" value="${esc(W.signataire)}" placeholder="ex. L’équipe de ${esc(W.nom||'la structure')}" data-autofocus></label></div>
    <div class="field"><span>Des médecins prescrivent-ils dans votre structure ?</span><div class="choice">${[['oui','Oui'],['non','Non']].map(([v,t])=>`<button type="button" class="chip" data-wset="medecins" data-v="${v}" aria-pressed="${W.medecins===v}">${t}</button>`).join('')}</div></div>
    ${W.medecins==='oui'?`<p class="hint">Leur nom et leur numéro RPPS apparaissent sur les certificats et les en-têtes d’ordonnance. Librejo ne fait pas de prescription : l’ordonnance reste un papier signé à la main.</p>
      <div id="wz-meds">${(W.meds.length?W.meds:[{nom:'',rpps:''}]).map((m,i)=>`<div class="wz-med"><input class="in" data-med="${i}" data-k="nom" value="${esc(m.nom)}" placeholder="Dr Prénom NOM" aria-label="Nom du médecin"><input class="in" data-med="${i}" data-k="rpps" value="${esc(m.rpps)}" placeholder="RPPS (11 chiffres)" inputmode="numeric" aria-label="RPPS"><button type="button" class="iconbtn" data-meddel="${i}" aria-label="Retirer ${m.nom?esc(m.nom):'ce médecin'}">×</button></div>`).join('')}</div>
      <button type="button" class="ghost sm" id="wz-medadd">${ICON.plus}Ajouter un médecin</button>`:W.medecins==='non'?'<p class="hint">Les formulaires médicaux (certificats, ordonnance, relais de traitement) ne seront pas proposés. Vous pourrez les activer plus tard.</p>':''}`;
  if(s===3){ if(!W.cats) W.cats=(WZ_CATS[W.type]||WZ_CATS.autre).slice();
    return `<h2 id="wz-h">Vos catégories</h2><p class="wz-lead">Les rubriques où ranger vos documents. ${W.type?'Voici une proposition pour votre type de structure : ':''}renommez, supprimez ou ajoutez. Les dossiers seront créés tout seuls.</p>
    <div id="wz-cats">${W.cats.map((c,i)=>`<div class="wz-cat"><span class="wz-n">${i+1}</span><input class="in" data-cat="${i}" value="${esc(c)}" aria-label="Catégorie ${i+1}"><button type="button" class="iconbtn" data-catdel="${i}" aria-label="Retirer ${esc(c)}">×</button></div>`).join('')}</div>
    <button type="button" class="ghost sm" id="wz-catadd">${ICON.plus}Ajouter une catégorie</button>
    <div class="wz-nom"><h3>📛 Nom des fichiers et des dossiers</h3><p class="hint">La règle que Librejo suivra pour nommer chaque fichier rangé et chaque dossier de catégorie. Modifiable plus tard dans les Réglages.</p>
      <div class="fieldgrid"><label class="field wide"><span>Nom des fichiers</span><select class="in" data-w="nomFichier">${NOM_PRESETS.map(([v,l])=>`<option value="${esc(v)}" ${(W.nomFichier||NOM_DEF.fichier)===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="field"><span>Entre les mots du titre</span><select class="in" data-w="nomSep">${[['-','tiret'],['_','tiret bas'],[' ','espace']].map(([v,l])=>`<option value="${v}" ${(W.nomSep||'-')===v?'selected':''}>${l}</option>`).join('')}</select></label>
        <label class="field"><span>Nom des dossiers</span><select class="in" data-w="nomDossier">${[['{NN} {Nom}','01 Accueil'],['{NN}_{Nom}','01_Accueil'],['{Nom}','Accueil'],['{NN} - {NOM}','01 - ACCUEIL']].map(([v,l])=>`<option value="${esc(v)}" ${(W.nomDossier||NOM_DEF.dossier)===v?'selected':''}>${l}</option>`).join('')}</select></label></div>
      <p class="nm-prev" id="wz-nmprev">${wizNomPrev(true)}</p><p class="hint">Une règle plus précise (avec la catégorie, le jour…) se règle ensuite dans Réglages › Documents.</p></div>`; }
  if(s===4){ if(!W.packs) W.packs=(WZ_PACKS[W.type]||WZ_PACKS.autre).slice();
    return `<h2 id="wz-h">Vos modèles</h2><p class="wz-lead">Des formulaires et des liens prêts à l’emploi, cochés selon votre type de structure. Chaque modèle reste modifiable. <b>À faire relire par votre direction avant usage.</b></p>
    <div class="wz-packs">${MODELE_PACKS.map(([k,nom,txt])=>{ const n=MODELES.filter(m=>m.pack===k).length; return `<label class="wz-pack"><input type="checkbox" data-pack="${k}" ${W.packs.includes(k)?'checked':''}><span><b>${esc(nom)}</b> <small>${n} modèle${n>1?'s':''}</small><small class="d">${esc(txt)}</small></span></label>`; }).join('')}</div>`; }
  if(s===5) return `<h2 id="wz-h">Le mail</h2><p class="wz-lead">Comment envoyez-vous vos mails ?</p>
    <div class="wz-mailopts">${[['outlook','Outlook est installé sur les postes','Librejo prépare un brouillon Outlook avec le document joint.'],['web','Une messagerie web (Gmail, Outlook web…)','Le document est téléchargé et la messagerie s’ouvre, prête à écrire.'],['aucun','Pas de mail','Librejo propose seulement d’imprimer ou de télécharger.']].map(([v,t,d])=>`<button type="button" class="wz-mo" data-wset="mailmode" data-v="${v}" aria-pressed="${W.mailmode===v}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
    ${W.mailmode==='web'?`<label class="field"><span>Votre messagerie web</span><select class="in" data-w="webmail">${wzOpt('https://outlook.office.com/mail/deeplink/compose',W.webmail,'Outlook web (Microsoft 365)')}${wzOpt('https://mail.google.com/mail/?view=cm&fs=1',W.webmail,'Gmail')}</select></label>`:''}
    ${W.mailmode&&W.mailmode!=='aucun'?`<label class="field"><span>Adresse(s) d’envoi de l’équipe <small>(une par ligne : reçoivent une copie)</small></span><textarea class="in" data-w="envoi" rows="2" spellcheck="false">${esc(W.envoi)}</textarea></label>
      <div class="row"><button type="button" class="secondary" id="wz-test">${ICON.mail}Tester</button><small class="hint">Prépare un mail d’essai, sans rien envoyer.</small></div>`:''}`;
  if(s===6) return `<h2 id="wz-h">Le mot de passe admin</h2><p class="wz-lead">Il protège le mode admin, qui permet d’ajouter et de modifier les documents.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Ce mot de passe évite les erreurs de manipulation. Librejo n’en garde qu’une empreinte : personne ne peut le relire dans le dossier. Ce sont les droits d’accès au dossier, gérés par votre service informatique, qui protègent les documents.</span></div>
    <div class="fieldgrid"><label class="field"><span>Mot de passe <small>(6 caractères au moins)</small></span><input class="in" type="password" id="wz-pw" value="${esc(W.pw)}" autocomplete="new-password" data-autofocus></label>
      <label class="field"><span>À nouveau</span><input class="in" type="password" id="wz-pw2" value="${esc(W.pw2)}" autocomplete="new-password"></label></div>`;
  const nf=MODELES.filter(m=>W.packs&&W.packs.includes(m.pack)).length, typ=(WZ_TYPES.find(t=>t[0]===W.type)||[])[1]||'—';
  return `<h2 id="wz-h">C’est parti</h2><p class="wz-lead">Vérifiez, puis lancez : Librejo écrit les réglages dans le dossier de la structure.</p>
    <dl class="wz-recap"><dt>Structure</dt><dd>${esc(W.nom||'—')} · ${esc(typ)}${W.ville?' · '+esc(W.ville):''}</dd>
      <dt>Équipe</dt><dd>${esc(W.signataire||'—')}${W.medecins==='oui'?` · ${W.meds.filter(m=>m.nom).length} médecin(s)`:' · pas de formulaires médicaux'}</dd>
      <dt>Catégories</dt><dd>${(W.cats||[]).filter(Boolean).map(esc).join(', ')||'—'}</dd>
      <dt>Noms</dt><dd><code>${esc(applyNom(W.nomFichier||NOM_DEF.fichier,{titre:'Protocole douleur',v:1,date:month()},W.nomSep||'-'))}.pdf</code></dd>
      <dt>Modèles</dt><dd>${nf} modèles (${(W.packs||[]).map(k=>esc((MODELE_PACKS.find(p=>p[0]===k)||[])[1]||k)).join(', ')||'aucun'})</dd>
      <dt>Mail</dt><dd>${W.mailmode==='outlook'?'Outlook':W.mailmode==='web'?'Messagerie web':W.mailmode==='aucun'?'Pas de mail':'—'}</dd>
      <dt>Mot de passe</dt><dd>${W.pw?'choisi':'<b class="danger">à choisir (étape 7)</b>'}</dd></dl>`;
}
/* Mot de passe trop proche du nom de la structure (« mimosa » pour « Les Mimosas ») */
/* Mot de passe admin : seule une empreinte est enregistrée dans parametres.js (PBKDF2-SHA-256, sel aléatoire),
   jamais le mot de passe lui-même : l'équipe qui lit le dossier ne le voit pas, même s'il sert ailleurs.
   Cela reste un verrou contre les erreurs, pas une protection : le mode admin se décide dans le navigateur.
   Anciens réglages (mot de passe en clair) : acceptés, et convertis en empreinte au premier enregistrement. */
const PW_ITER=210000, hexOf=b=>[...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join(''), bytesOf=h=>new Uint8Array((h.match(/../g)||[]).map(x=>parseInt(x,16)));
async function pwHash(pw,sel,iter=PW_ITER){
  if(!(window.crypto&&crypto.subtle)) return pw; // navigateur sans Web Crypto (page non sécurisée) : on garde l'ancien format
  const salt=sel?bytesOf(sel):crypto.getRandomValues(new Uint8Array(16));
  const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(pw)),'PBKDF2',false,['deriveBits']);
  const b=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},k,256);
  return {algo:'pbkdf2-sha256',iter,sel:hexOf(salt),empreinte:hexOf(b)};
}
async function pwCheck(pw){ const m=PAR.motdepasse||'docubus';
  if(typeof m==='string') return pw===m;
  if(!m||m.algo!=='pbkdf2-sha256'||!(window.crypto&&crypto.subtle)) return false;
  const h=await pwHash(pw,m.sel,m.iter||PW_ITER); let d=0; for(let i=0;i<Math.max(h.empreinte.length,m.empreinte.length);i++) d|=(h.empreinte.charCodeAt(i)||0)^(m.empreinte.charCodeAt(i)||0); return d===0; }
const pwPlain=()=>typeof (PAR.motdepasse||'docubus')==='string';
function pwLikeName(pw,nom){ const k=x=>norm(x).replace(/[^a-z0-9]/g,''), p=k(pw); if(!p) return false;
  const stop=new Set(['les','des','une','aux','association','centre','foyer','maison','residence','service','structure']);
  const words=norm(nom).split(/[^a-z0-9]+/).filter(w=>w.length>=4&&!stop.has(w)).map(w=>w.replace(/(es|s|x)$/,'')).filter(w=>w.length>=4);
  const all=k(nom); return words.some(w=>p.includes(w)||(p.length>=4&&w.includes(p)))||(all.length>=4&&(p.includes(all)||all.includes(p)&&p.length>=4)); }
function wizCheck(s){ const W=WZ;
  if(s===1){ if(!W.nom.trim()) return 'Indiquez le nom de la structure.'; if(!W.type) return 'Choisissez le type de structure.'; if(W.mail.trim()&&!MAIL.test(W.mail.trim())) return 'L’adresse mail de la structure semble incorrecte.'; }
  if(s===2){ if(!W.medecins) return 'Répondez à la question sur les médecins.'; if(W.medecins==='oui'){ const bad=W.meds.find(m=>m.nom.trim()&&m.rpps.trim()&&!/^\d{11}$/.test(m.rpps.replace(/\s/g,''))); if(bad) return `Le RPPS de ${bad.nom} doit avoir 11 chiffres.`; if(!W.meds.some(m=>m.nom.trim())) return 'Indiquez au moins un médecin, ou répondez « Non ».'; } }
  if(s===3&&!(W.cats||[]).some(c=>c.trim())) return 'Gardez au moins une catégorie.';
  if(s===5){ if(!W.mailmode) return 'Choisissez comment vous envoyez vos mails.'; const bad=W.envoi.split(/[\s,;]+/).filter(Boolean).find(m=>!MAIL.test(m)); if(bad) return 'Adresse incorrecte : '+bad; }
  if(s===6){ if(W.pw.length<6) return 'Le mot de passe doit avoir au moins 6 caractères.'; if(W.pw!==W.pw2) return 'Les deux mots de passe ne sont pas identiques.'; if(/^(docubus|librejo|motdepasse|123456)$/i.test(W.pw)) return 'Choisissez un mot de passe moins évident.';
    if(pwLikeName(W.pw,W.nom)) return `Ce mot de passe ressemble trop au nom de la structure (« ${W.nom.trim()} ») : quelqu’un qui connaît la structure le devinerait. Choisissez autre chose, par exemple trois mots sans rapport entre eux.`; }
  return ''; }
function wizDraw(){
  const o=document.getElementById('wiz'), W=WZ, s=W.step, last=s===WZ_STEPS.length-1;
  o.innerHTML=`<div class="wz-card"><nav class="wz-steps" aria-label="Étapes">${WZ_STEPS.map((t,i)=>`<button type="button" class="wz-st ${i===s?'cur':i<s?'done':''}" data-go="${i}" ${i>s?'disabled':''} ${i===s?'aria-current="step"':''}><span>${i<s?'✓':i+1}</span>${esc(t)}</button>`).join('')}</nav>
    <div class="wz-main"><div class="wz-body">${wizBody()}</div><p class="wz-err" id="wz-err" role="alert"></p>
    <div class="wz-foot"><button type="button" class="ghost" id="wz-later">Continuer plus tard</button><span class="sp"></span>${s?'<button type="button" class="secondary" id="wz-prev">Précédent</button>':''}<button type="button" class="primary" id="wz-next">${last?'C’est parti':s?'Suivant':'Commencer'}</button></div></div></div>`;
  const af=o.querySelector('[data-autofocus]'); (af||o.querySelector('#wz-next')).focus();
  if(s===1) wizPrev();
  if(s===0) checksInto(document.getElementById('wz-ck')).catch(e=>console.warn('vérifications',e));
}
let wzT=0;
async function wizPrev(){ clearTimeout(wzT); wzT=setTimeout(async()=>{ if(!document.getElementById('wz-cv')) return; try{ await pdfReady(); }catch(e){ return; } const cv=document.getElementById('wz-cv'); if(!cv) return;
  const old=structure, oldL=window.DOCUBUS_LOGO_ASSO;
  try{ structure={...DEFAULT_STRUCT,...wizEntete()}; window.DOCUBUS_LOGO_ASSO=WZ.logo?await logoForPdf(WZ.logo):null;
    const blob=makeLetter({titre:'Courrier',date:today(),paras:['Madame, Monsieur,','Voici à quoi ressembleront vos documents : votre logo, votre en-tête, puis votre bas de page.','Cordialement,'],signataire:structure.signataire,tp:null});
    const lib=await getPdfjs(), pdf=await lib.getDocument({data:new Uint8Array(await blob.arrayBuffer()),isEvalSupported:false}).promise, pg=await pdf.getPage(1), v0=pg.getViewport({scale:1}), vp=pg.getViewport({scale:520/v0.width});
    cv.width=vp.width; cv.height=vp.height; await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise; pdf.destroy();
  }catch(e){ console.warn(e); } finally{ structure=old; window.DOCUBUS_LOGO_ASSO=oldL; } },250); }
document.addEventListener('input',e=>{ if(!WZ||!e.target.closest('#wiz')) return; const t=e.target;
  if(t.dataset.w){ WZ[t.dataset.w]=t.value; if(t.dataset.w==='type'){ WZ.cats=null; WZ.packs=null; } if(WZ.step===1) wizPrev(); if(WZ.step===3){ wizSave(); wizNomPrev(); } }
  if(t.dataset.med!=null){ while(WZ.meds.length<=+t.dataset.med) WZ.meds.push({nom:'',rpps:''}); WZ.meds[+t.dataset.med][t.dataset.k]=t.value; }
  if(t.dataset.cat!=null) WZ.cats[+t.dataset.cat]=t.value;
  if(t.id==='wz-pw') WZ.pw=t.value; if(t.id==='wz-pw2') WZ.pw2=t.value;
  wizSave(); });
document.addEventListener('change',e=>{ if(!WZ||!e.target.closest('#wiz')) return; const t=e.target;
  if(t.dataset.w==='type'||t.dataset.w==='webmail'){ WZ[t.dataset.w]=t.value; if(t.dataset.w==='type'){ WZ.cats=null; WZ.packs=null; } wizSave(); if(WZ.step===1) wizPrev(); }
  if(t.dataset.pack){ WZ.packs=t.checked?[...new Set([...WZ.packs,t.dataset.pack])]:WZ.packs.filter(k=>k!==t.dataset.pack); wizSave(); }
  if(t.id==='wz-logo'){ const f=t.files[0]; if(!f) return; if(f.size>2097152){ toast('Image trop lourde (2 Mo max).'); return; }
    const fr=new FileReader(); fr.onload=async()=>{ try{ WZ.logo=await logoForMenu(fr.result); wizSave(); wizDraw(); }catch(err){ toast('Cette image ne s’ouvre pas : essayez un PNG ou un JPEG.'); } }; fr.readAsDataURL(f); } });
document.addEventListener('click',async e=>{ if(!WZ||!e.target.closest('#wiz')) return; const t=e.target.closest('button'); if(!t) return; const W=WZ, err=document.getElementById('wz-err');
  if(t.dataset.wset){ W[t.dataset.wset]=t.dataset.v; wizSave(); wizDraw(); return; }
  if(t.id==='wz-logodel'){ W.logo=null; wizSave(); wizDraw(); return; }
  if(t.id==='wz-medadd'){ W.meds.push({nom:'',rpps:''}); wizDraw(); return; }
  if(t.dataset.meddel!=null){ W.meds.splice(+t.dataset.meddel,1); wizSave(); wizDraw(); return; }
  if(t.id==='wz-catadd'){ W.cats.push(''); wizDraw(); const l=[...document.querySelectorAll('[data-cat]')].pop(); l&&l.focus(); return; }
  if(t.dataset.catdel!=null){ W.cats.splice(+t.dataset.catdel,1); wizSave(); wizDraw(); return; }
  if(t.id==='wz-test'){ const to=W.envoi.split(/[\s,;]+/).filter(m=>MAIL.test(m)); const o1=PAR.mail, o2=webmail; PAR.mail=W.mailmode==='web'?'web':'outlook'; webmail=W.webmail;
    try{ await pdfReady(); const f=new File([makeLetter({titre:'Essai',date:today(),paras:['Ceci est un mail d’essai préparé par Librejo. Il ne contient aucune donnée.'],signataire:W.signataire||W.nom,tp:null})],'Essai-Librejo.pdf',{type:'application/pdf'});
      await mailCompose({to:to.length?to:[W.mail||'adresse@exemple.org'],subject:'Essai Librejo',body:'Bonjour,\n\nCeci est un essai : le document joint ne contient aucune donnée.\n\n'+(W.signataire||W.nom),files:[f]}); }
    finally{ PAR.mail=o1; webmail=o2; } return; }
  if(t.id==='wz-later'){ wizSave(); wizClose(); toast('L’assistant reprendra au prochain lancement, là où vous en étiez. Ou : Documents › Outils › Assistant de démarrage.'); return; }
  if(t.id==='wz-prev'){ W.step--; wizSave(); wizDraw(); return; }
  if(t.dataset.go!=null){ W.step=+t.dataset.go; wizSave(); wizDraw(); return; }
  if(t.id==='wz-next'){ const m=wizCheck(W.step); if(m){ err.textContent=m; return; }
    if(W.step<WZ_STEPS.length-1){ W.step++; wizSave(); wizDraw(); return; }
    for(let i=1;i<WZ_STEPS.length-1;i++){ const m2=wizCheck(i); if(m2){ W.step=i; wizDraw(); document.getElementById('wz-err').textContent=m2; return; } }
    t.disabled=true; t.textContent='Préparation…';
    if(await run(wizFinish)){ try{ localStorage.removeItem(WZ_KEY); }catch(_){} wizClose(); WZ=null; setTab('docs'); toast('Librejo est prêt. Suivez la liste de démarrage sur l’accueil.'); if(!guideSeen()) setTimeout(()=>{ if($('#modal').hidden) openGuide(0); },900); }
    else{ t.disabled=false; t.textContent='C’est parti'; } } });
async function wizFinish(){
  const W=WZ; await getDir('readwrite');
  const ent=wizEntete(), meds=W.medecins==='oui'?W.meds.filter(m=>m.nom.trim()).map(m=>({nom:m.nom.trim(),rpps:m.rpps.replace(/\s/g,'')})):[];
  // catégories et dossiers
  PAR.nommage={fichier:W.nomFichier||NOM_DEF.fichier,sep:W.nomSep||'-',dossier:W.nomDossier||NOM_DEF.dossier,sortie:(PAR.nommage||{}).sortie};
  const cats=W.cats.map(c=>c.trim()).filter(Boolean); let ordre=Math.max(0,...DATA.categories.map(c=>c.ordre||0));
  for(const nom of cats){ if(DATA.categories.some(c=>norm(c.nom)===norm(nom))) continue; ordre++; const id=folderName(nom,ordre);
    await dirAt(['Documents',id],'readwrite',true); DATA.categories.push({id,nom,ordre}); }
  const cat0=(DATA.categories[0]||{}).id||'';
  const WZ_PACKCAT={droits:['droit','reglement','admission','accueil'],qualite:['qualite','reglement','admission','accueil'],social:['social','demarche','procedure'],liaison:['partenaire','liaison','demarche','sante','soin'],
    handicap:['projet','droit','demarche'],enfance:['droits des familles','famille','droit','admission'],agees:['admission','famille','soin'],asile:['procedure','demarche','admission'],addicto:['soin','reduction','sante']};
  const catFor=pk=>{ for(const w of (WZ_PACKCAT[pk]||[])){ const c=DATA.categories.find(c=>norm(c.nom).includes(w)); if(c) return c.id; } return cat0; };
  // modèles
  MODELES.filter(m=>W.packs.includes(m.pack)&&(meds.length||!m.formulaire||m.formulaire.groupe!=='med')).forEach(m=>{ const cat=catFor(m.pack); if(DATA.formulaires.some(f=>f.modele_src===m.id)||DATA.documents.some(d=>d.modele_src===m.id)) return;
    if(m.lien){ const x={id:'l'+rid(),ext:'lien',date:month(),ajoute:today(),historique:[],url:m.lien,titre:m.titre,categorie:cat,sous:'',description:m.description,motscles:m.motscles||[],epingle:false,modele_src:m.id};
      Object.assign(x,{chemin:'lien:'+x.id,fichier:linkHost(m.lien),modifie:today()}); DATA.documents.push(x); return; }
    const f=JSON.parse(JSON.stringify(m.formulaire)); f.id='f'+rid(); f.categorie=cat; f.modele_src=m.id; f.champs.forEach(c=>c.id='c'+rid()); if(m.has) f.has=[...m.has]; DATA.formulaires.push(f); });
  const off=new Set(formsOffBase()); // médicaux et substitution : masqués d'office selon les médecins et le type (formsAuto)
  PAR={...PAR,attestation:{...(PAR.attestation||{}),...ent},fiche:{...(PAR.fiche||{}),adresse:W.adresse.trim(),cp:W.cp.trim(),ville:W.ville.trim(),tel:W.tel.trim(),mail:W.mail.trim(),siret:W.siret.trim(),finess:W.finess.trim()},
    typeStructure:W.type,medecins:meds,mail:W.mailmode==='aucun'?'outlook':W.mailmode,sansMail:W.mailmode==='aucun',envoi:W.envoi.split(/[\s,;]+/).filter(m=>MAIL.test(m)),webmail:W.webmail,
    motdepasse:await pwHash(W.pw),formsOff:[...off],assistant:'fait',demarrage:{debut:today(),faits:[],masque:false},
    apparence:{...THEME_DEF,...(PAR.apparence||{}),...(W.logo?{logo:W.logo,menuLogo:'both'}:{})}};
  await saveData(); await saveParams();
  if(W.logo){ const j=await logoForPdf(W.logo); await guardedWrite('app/logo-association.js','// Librejo : logo de la structure pour l\'en-tête des PDF (écrit par l\'assistant).\nwindow.DOCUBUS_LOGO_ASSO = '+JSON.stringify(j)+';\n'); window.DOCUBUS_LOGO_ASSO=j; }
  try{ await readRel('app/annuaire.js'); }catch(e){ await saveAnnu(); }
  applyParams(); applyTheme(PAR.apparence); setAdmin(true); renderDocs(); renderForms();
}
/* ---------- Liste de démarrage (accueil, admin) ---------- */
function startItems(){ const D=PAR.demarrage||{}, F=new Set(D.faits||[]);
  return [['docs','Ajouter vos 5 premiers documents',DATA.documents.filter(d=>d.ext!=='lien').length>=5,'adddocs'],
    ['annu','Importer votre annuaire (Outlook, Gmail, Excel)',((window.DOCUBUS_ANNUAIRE||{}).partenaires||[]).length>0,'annu'],
    ['pin','Épingler les documents les plus utilisés',DATA.documents.some(d=>d.epingle),'docs'],
    ['papier','Régler le papier à en-tête (police, couleurs, marge)',F.has('papier'),'papier'],
    ['postes','Installer Librejo sur les autres postes',F.has('postes'),'postes']]; }
function startHTML(){ const D=PAR.demarrage; if(!isAdmin||!D||D.masque) return ''; const I=startItems(), n=I.filter(i=>i[2]).length; if(n===I.length) return '';
  return `<section class="startlist" aria-label="Liste de démarrage"><div class="sl-head"><h2 class="sec m-0">Pour bien démarrer</h2><span class="hint">${n} sur ${I.length}</span><button type="button" class="ghost sm" data-sl="hide">Masquer</button></div>
    <div class="sl-bar"><span style="width:${Math.round(n/I.length*100)}%"></span></div>
    <ul>${I.map(([k,t,ok,act])=>`<li class="${ok?'ok':''}"><span class="sl-dot" aria-hidden="true">${ok?'✓':''}</span><span class="sl-t">${esc(t)}</span>${ok?'<span class="sr">fait</span>':`<button type="button" class="secondary sm" data-sl="${act}" data-k="${k}">${k==='postes'?'Comment faire':'Y aller'}</button>`}</li>`).join('')}</ul></section>`; }
document.addEventListener('click',async e=>{ const b=e.target.closest('[data-sl]'); if(!b) return; const a=b.dataset.sl, D=PAR.demarrage||(PAR.demarrage={});
  const mark=async k=>{ D.faits=[...new Set([...(D.faits||[]),k])]; await run(saveParams); renderDocs(); };
  if(a==='hide'){ D.masque=true; await run(saveParams,'Liste masquée'); renderDocs(); return; }
  if(a==='adddocs'){ addDocs(); return; } if(a==='annu'){ setTab('annu'); return; } if(a==='docs'){ setTab('docs'); toast('Dans la liste, utilisez l’épingle à côté d’un document.'); return; }
  if(a==='papier'){ await mark('papier'); setTab('admin'); asub='reg'; rsec='courriers'; renderAdmin&&renderAdmin(); setTimeout(()=>{ const x=document.querySelector('.pp-sec'); x&&x.scrollIntoView({block:'start'}); },300); return; }
  if(a==='postes') openModal(`<h3 id="modal-title">Installer Librejo sur les autres postes</h3>
    <ol class="wz-howto"><li>Sur chaque poste, ouvrez Librejo dans <b>Microsoft Edge</b> ou <b>Google Chrome</b> (le même fichier ou la même adresse).</li><li>Choisissez le <b>même dossier</b> de la structure (lecteur réseau, NAS ou dossier synchronisé) : les réglages sont déjà dedans.</li>
      <li>Quand le navigateur le propose, choisissez <b>« Autoriser à chaque visite »</b>.</li><li>Pour une icône sur le bureau : menu du navigateur › <b>Installer Librejo</b>.</li></ol>
    <p class="hint">Le mode admin n’est utile que sur les postes de ceux qui ajoutent des documents.</p>
    <div class="btns"><button class="primary" id="sl-postes">C’est fait</button><button class="secondary" data-close>Plus tard</button></div>`);
  const p=document.getElementById('sl-postes'); if(p) p.onclick=async()=>{ closeModal(); await mark('postes'); }; });
setTimeout(()=>{ if(wizNeeded()&&!DEMO) wizOpen(); },400); // en démo, l'assistant reste dans Outils


/* ---------- Comparer deux documents (admin) : côte à côte, différences encadrées ---------- */
const CMP_TXT=['txt','md','csv','html','htm','rtf'];
async function cmpLines(file){
  const ext=(extOf(file.name)||'').toLowerCase(), L=[];
  const push=(t,p,r)=>{ t=String(t||'').replace(/\s+/g,' ').trim(); if(t) L.push({t,p,r}); };
  if(ext==='pdf'){
    const lib=await getPdfjs();
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
    try{ const sizes=[]; for(let n=1;n<=pdf.numPages;n++){
      const pg=await pdf.getPage(n), vp=pg.getViewport({scale:1}), W=vp.width, H=vp.height, tc=await pg.getTextContent(), rows=[]; sizes.push({w:W,h:H});
      tc.items.forEach(it=>{ if(!it.str||!it.str.trim()) return; const [, , c,d,e,f]=it.transform, fh=Math.hypot(c,d)||10;
        const q=vp.convertToViewportRectangle([e,f-fh*.25,e+(it.width||fh*it.str.length*.5),f+fh*.85]);
        const box={x:Math.min(q[0],q[2]),y:Math.min(q[1],q[3]),X:Math.max(q[0],q[2]),Y:Math.max(q[1],q[3])};
        let r=rows.find(r=>Math.abs(r.f-f)<3); if(!r){ r={f,it:[],b:{...box}}; rows.push(r); }
        r.it.push({x:e,s:it.str}); r.b.x=Math.min(r.b.x,box.x); r.b.y=Math.min(r.b.y,box.y); r.b.X=Math.max(r.b.X,box.X); r.b.Y=Math.max(r.b.Y,box.Y); });
      rows.sort((a,b)=>b.f-a.f).forEach(r=>push(r.it.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' '),n,{x:r.b.x/W,y:r.b.y/H,w:(r.b.X-r.b.x)/W,h:(r.b.Y-r.b.y)/H}));
    } return {lines:L,pages:pdf.numPages,sizes,pdf:true}; }finally{ pdf.destroy(); }
  }
  if(ext==='docx'||ext==='odt'){
    await needLib('jszip'); const zip=await JSZip.loadAsync(file);
    if(ext==='docx'){ for(const n of await docxParts(zip)){
      const x=new DOMParser().parseFromString(await zip.file(n).async('string'),'application/xml');
      for(const p of x.getElementsByTagNameNS(WNS,'p')) push([...p.getElementsByTagNameNS(WNS,'t')].map(t=>t.textContent).join(''),0); } }
    else { const f=zip.file('content.xml'); if(f){ const x=new DOMParser().parseFromString(await f.async('string'),'application/xml');
      for(const p of x.querySelectorAll('*')) if(p.localName==='p'||p.localName==='h') push(p.textContent,0); } }
    return {lines:L};
  }
  if(CMP_TXT.includes(ext)){ let t=await file.text(); if(ext==='html'||ext==='htm') t=new DOMParser().parseFromString(t,'text/html').body.innerText||''; t.split(/\r?\n/).forEach(l=>push(l,0)); return {lines:L}; }
  return null;
}
/* Plus longue sous-suite commune ; renvoie des opérations same/del/add */
function cmpOps(a,b,eq){
  let s=0; while(s<a.length&&s<b.length&&eq(a[s],b[s])) s++;
  let e=0; while(e<a.length-s&&e<b.length-s&&eq(a[a.length-1-e],b[b.length-1-e])) e++;
  const A=a.slice(s,a.length-e), B=b.slice(s,b.length-e), n=A.length, m=B.length, ops=[];
  for(let i=0;i<s;i++) ops.push(['same',a[i],b[i]]);
  if(n*m>30e6){ A.forEach(x=>ops.push(['del',x])); B.forEach(y=>ops.push(['add',null,y])); }
  else{
    const W=m+1, T=new Uint32Array((n+1)*W);
    for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) T[i*W+j]=eq(A[i],B[j])?T[(i+1)*W+j+1]+1:Math.max(T[(i+1)*W+j],T[i*W+j+1]);
    let i=0,j=0;
    while(i<n&&j<m){ if(eq(A[i],B[j])){ ops.push(['same',A[i],B[j]]); i++; j++; } else if(T[(i+1)*W+j]>=T[i*W+j+1]) ops.push(['del',A[i++]]); else ops.push(['add',null,B[j++]]); }
    while(i<n) ops.push(['del',A[i++]]); while(j<m) ops.push(['add',null,B[j++]]);
  }
  for(let i=e;i>0;i--) ops.push(['same',a[a.length-i],b[b.length-i]]);
  return ops;
}
/* Regroupe : une suite de suppressions suivie d'ajouts devient des lignes « modifiées » face à face */
function cmpRows(ops){
  const R=[]; let k=0;
  while(k<ops.length){
    if(ops[k][0]==='same'){ R.push({k:'same',a:ops[k][1],b:ops[k][2]}); k++; continue; }
    const D=[],A=[]; while(k<ops.length&&ops[k][0]!=='same'){ if(ops[k][0]==='del') D.push(ops[k][1]); else A.push(ops[k][2]); k++; }
    for(let i=0;i<Math.max(D.length,A.length);i++) R.push({k:D[i]&&A[i]?'chg':D[i]?'del':'add',a:D[i]||null,b:A[i]||null});
  }
  return R;
}
function cmpWords(a,b){
  const tok=s=>s.split(/(\s+|[.,;:!?()«»"’'])/).filter(x=>x!==''), ta=tok(a), tb=tok(b), ops=cmpOps(ta,tb,(x,y)=>x===y);
  let ha='',hb='';
  ops.forEach(([k,x,y])=>{ if(k==='same'){ ha+=esc(x); hb+=esc(y); } else if(k==='del') ha+=/^\s+$/.test(x)?esc(x):`<mark class="cmp-out">${esc(x)}</mark>`; else hb+=/^\s+$/.test(y)?esc(y):`<mark class="cmp-in">${esc(y)}</mark>`; });
  const j=(s,c)=>s.replace(new RegExp(`</mark>(\\s*)<mark class="${c}">`,'g'),'$1');
  return [j(ha,'cmp-out'),j(hb,'cmp-in')];
}
async function cmpHash(f){ try{ return [...new Uint8Array(await crypto.subtle.digest('SHA-256',await f.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join(''); }catch(e){ return null; } }
/* Miniatures des pages d'un PDF (images en mémoire, rien n'est enregistré) */
const CMP_MAXP=40;
async function cmpThumbs(file,w){
  const lib=await getPdfjs(), pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise, out=[];
  try{ for(let n=1;n<=Math.min(pdf.numPages,CMP_MAXP);n++){ const pg=await pdf.getPage(n), v1=pg.getViewport({scale:1}), vp=pg.getViewport({scale:w/v1.width});
    const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height); const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp}).promise; out.push({src:c.toDataURL('image/jpeg',.82),w:v1.width,h:v1.height}); c.width=c.height=0; } }
  finally{ pdf.destroy(); }
  return out;
}
/* OCR (PDF scannés seulement) : Tesseract.js, en français, entièrement sur le poste */
async function ocrPdf(file,prog){
  if(location.protocol==='file:') throw new Error('La lecture des scans n’est possible que dans l’application installée (pas en ouvrant le fichier depuis le dossier).');
  if(!window.Tesseract) await loadScript('app/lib/ocr/tesseract.min.js');
  const lib=await getPdfjs(), pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
  const worker=await Tesseract.createWorker('fra',1,{workerPath:'app/lib/ocr/worker.min.js',corePath:'app/lib/ocr/tesseract-core-simd-lstm.wasm.js',langPath:'app/lib/ocr',workerBlobURL:false,cacheMethod:'none',
    logger:m=>{ if(prog&&m&&m.status==='recognizing text') prog(m.progress); }});
  const L=[], sizes=[], N=Math.min(pdf.numPages,20);
  try{ for(let n=1;n<=N;n++){ prog&&prog(0,n,N);
    const pg=await pdf.getPage(n), v1=pg.getViewport({scale:1}), vp=pg.getViewport({scale:2}); sizes.push({w:v1.width,h:v1.height});
    const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height); const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
    await pg.render({canvasContext:x,viewport:vp}).promise;
    const {data}=await worker.recognize(c);
    (data.lines||[]).forEach(l=>{ const t=String(l.text||'').replace(/\s+/g,' ').trim(); if(t.length<2||(l.confidence!=null&&l.confidence<35)) return;
      const b=l.bbox; L.push({t,p:n,r:{x:b.x0/c.width,y:b.y0/c.height,w:(b.x1-b.x0)/c.width,h:(b.y1-b.y0)/c.height}}); });
    c.width=c.height=0; } }
  finally{ await worker.terminate(); pdf.destroy(); }
  return {lines:L,pages:pdf.numPages,sizes,pdf:true,ocr:true,partial:pdf.numPages>N};
}
/* Différences regroupées en blocs numérotés */
function cmpBlocks(rows){
  const B=[], mark=new Map(); let cur=null, lastA=null, lastB=null;
  rows.forEach((r,i)=>{
    if(r.k==='same'){ if(cur){ if(!cur.a.length) cur.anchorA={l:r.a,pos:'top'}; if(!cur.b.length) cur.anchorB={l:r.b,pos:'top'}; cur=null; } lastA=r.a; lastB=r.b; return; }
    if(!cur){ cur={n:B.length+1,rows:[],a:[],b:[],kinds:new Set(),prevA:lastA,prevB:lastB}; B.push(cur); }
    cur.rows.push(r); cur.kinds.add(r.k);
    if(r.a){ cur.a.push(r.a); mark.set(r.a,{n:cur.n,k:r.k}); } if(r.b){ cur.b.push(r.b); mark.set(r.b,{n:cur.n,k:r.k}); } });
  B.forEach(b=>{ if(!b.a.length&&!b.anchorA) b.anchorA=b.prevA?{l:b.prevA,pos:'bottom'}:null; if(!b.b.length&&!b.anchorB) b.anchorB=b.prevB?{l:b.prevB,pos:'bottom'}:null;
    b.kind=b.kinds.size===1&&b.kinds.has('add')?'add':b.kinds.size===1&&b.kinds.has('del')?'del':'chg'; });
  return {B,mark};
}
/* Une colonne : vraies pages (PDF) ou feuilles de texte, avec les différences surlignées et numérotées */
function cmpColumn(side,t,thumbs,mk,B){
  const anchors=new Map(); B.forEach(b=>{ const a=side==='A'?b.anchorA:b.anchorB, has=side==='A'?b.a.length:b.b.length; if(!has&&a&&a.l){ (anchors.get(a.l)||anchors.set(a.l,[]).get(a.l)).push({n:b.n,pos:a.pos}); } });
  const lead=new Map(); B.forEach(b=>{ const L=side==='A'?b.a:b.b; if(L.length) lead.set(L[0],b.n); });
  const badge=n=>`<span class="cmpv-n">${n}</span>`;
  if(thumbs){
    return thumbs.map((pg,i)=>{ const n=i+1, ls=t.lines.filter(l=>l.p===n&&l.r);
      const hl=ls.map(l=>{ const m=mk.get(l), r=l.r, st=`left:${(r.x*100).toFixed(2)}%;top:${(r.y*100).toFixed(2)}%;width:${(r.w*100).toFixed(2)}%;height:${(r.h*100).toFixed(2)}%`;
        let s=''; if(m) s+=`<div class="cmpv-hl k-${m.k}" data-blk="${m.n}" style="${st}">${lead.get(l)===m.n?badge(m.n):''}</div>`;
        (anchors.get(l)||[]).forEach(a=>{ s+=`<div class="cmpv-ins" data-blk="${a.n}" style="left:${(r.x*100).toFixed(2)}%;top:calc(${((a.pos==='top'?r.y:r.y+r.h)*100).toFixed(2)}% ${a.pos==='top'?'- 5px':'+ 3px'});width:${Math.max(20,r.w*100).toFixed(2)}%">${badge(a.n)}</div>`; });
        return s; }).join('');
      return `<div class="cmpv-pg" style="aspect-ratio:${pg.w}/${pg.h}"><img src="${pg.src}" alt="Page ${n}">${hl}<span class="cmpv-pno">${n}</span></div>`; }).join('')
      +(t.pages>thumbs.length?`<p class="hint">Pages ${thumbs.length+1} à ${t.pages} non affichées.</p>`:'');
  }
  const PER=38, pages=[]; let cur=[];
  t.lines.forEach((l,i)=>{ const m=mk.get(l);
    (anchors.get(l)||[]).filter(a=>a.pos==='top').forEach(a=>cur.push(`<div class="cmpv-insl" data-blk="${a.n}">${badge(a.n)}</div>`));
    cur.push(`<div class="cmpv-ln${m?' k-'+m.k:''}"${m?` data-blk="${m.n}"`:''}>${m&&lead.get(l)===m.n?badge(m.n):''}${esc(l.t)}</div>`);
    (anchors.get(l)||[]).filter(a=>a.pos==='bottom').forEach(a=>cur.push(`<div class="cmpv-insl" data-blk="${a.n}">${badge(a.n)}</div>`));
    if(cur.length>=PER&&i<t.lines.length-1){ pages.push(cur); cur=[]; } });
  if(cur.length) pages.push(cur);
  return pages.map((c,i)=>`<div class="cmpv-paper">${c.join('')}<span class="cmpv-pno">${i+1}</span></div>`).join('');
}
function cmpGridHTML(rows){
  const lastP={A:0,B:0}, cell=(l,h,s)=>{ if(!l) return '<div class="cmp-c cmp-empty"></div>'; const pg=l.p&&l.p!==lastP[s]?`<span class="cmp-p">page ${l.p}</span>`:''; if(l.p) lastP[s]=l.p; return `<div class="cmp-c">${pg}${h}</div>`; };
  const line=r=>{ if(r.k==='chg'){ const [x,y]=cmpWords(r.a.t,r.b.t); return `<div class="cmp-r chg">${cell(r.a,x,'A')}${cell(r.b,y,'B')}</div>`; }
    if(r.k==='del') return `<div class="cmp-r del">${cell(r.a,`<mark class="cmp-out">${esc(r.a.t)}</mark>`,'A')}${cell(null)}</div>`;
    if(r.k==='add') return `<div class="cmp-r add">${cell(null)}${cell(r.b,`<mark class="cmp-in">${esc(r.b.t)}</mark>`,'B')}</div>`;
    return `<div class="cmp-r">${cell(r.a,esc(r.a.t),'A')}${cell(r.b,esc(r.b.t),'B')}</div>`; };
  let i=0; const H=[];
  while(i<rows.length){ if(rows[i].k!=='same'){ H.push(line(rows[i++])); continue; }
    let j=i; while(j<rows.length&&rows[j].k==='same') j++;
    const run=rows.slice(i,j), keep=2;
    if(run.length>keep*2+1){ const top=i===0?[]:run.slice(0,keep), bot=j===rows.length?[]:run.slice(-keep), hid=run.length-top.length-bot.length;
      H.push(...top.map(line),`<div class="cmp-gap">⋯ ${hid} ligne${hid>1?'s':''} identique${hid>1?'s':''}</div>`,...bot.map(line)); }
    else H.push(...run.map(line));
    i=j; }
  return `<div class="cmp-grid">${H.join('')}</div>`;
}
function cmpSummaryItem(b){
  const pg=L=>{ if(!L.length) return 'absent'; const ps=[...new Set(L.map(l=>l.p).filter(Boolean))]; return ps.length?'page '+ps.join(', '):'présent'; };
  const lab={chg:'✏️ Modifié',add:'➕ Ajouté dans B',del:'➖ Retiré dans B'}[b.kind];
  const ex=b.rows.slice(0,3).map(r=>{ if(r.k==='chg'){ const [x,y]=cmpWords(r.a.t,r.b.t); return `<div class="cmpv-ex"><span>${x}</span><span class="cmpv-arrow">→</span><span>${y}</span></div>`; }
    if(r.k==='del') return `<div class="cmpv-ex"><span><mark class="cmp-out">${esc(r.a.t)}</mark></span></div>`;
    return `<div class="cmpv-ex"><span><mark class="cmp-in">${esc(r.b.t)}</mark></span></div>`; }).join('');
  const more=b.rows.length>3?`<small>… et ${b.rows.length-3} ligne${b.rows.length-3>1?'s':''} de plus</small>`:'';
  return `<li><button type="button" class="cmpv-item k-${b.kind}" data-goto="${b.n}"><span class="cmpv-n">${b.n}</span><span class="cmpv-it"><b>${lab}</b><small>A : ${pg(b.a)} · B : ${pg(b.b)}</small>${ex}${more}</span></button></li>`;
}
function comparer(init,opt){
  opt=opt||{}; const S={A:null,B:null}; let busy=false; const MD=opt.modif;
  const docs=DATA.documents.filter(d=>d.ext!=='lien').sort((a,b)=>a.titre.localeCompare(b.titre,'fr'));
  const slot=k=>`<div class="cmp-slot" data-slot="${k}">
      <label class="dropzone cmp-drop">${svg('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>')}<b>Version ${k}</b><span data-name>Glissez un fichier ici ou cliquez</span><input type="file" hidden data-file></label>
      ${docs.length?`<select class="in" data-pick aria-label="Ou choisir un document déjà dans Librejo (version ${k})"><option value="">ou un document déjà dans Librejo…</option>${docs.map(d=>`<option value="${esc(d.chemin)}">${esc(d.titre)} (v${esc(d.version||'1')})</option>`).join('')}</select>`:''}
    </div>`;
  openModal(MD?`<h3 id="modal-title">✏️ Vos modifications : « ${esc(MD.titre)} »</h3>
    <p class="hint">À gauche la version actuelle (v${esc(MD.version||'1')}), à droite votre fichier modifié. Vérifiez, puis enregistrez.</p>
    <div class="cmp-slots" hidden>${slot('A')}${slot('B')}</div>
    <div id="cmp-out" aria-live="polite"></div>
    <div class="row end mt"><button type="button" class="ghost" data-close>Annuler</button></div>`:`<h3 id="modal-title">🔍 Comparer deux documents</h3>
    <p class="hint">Deux versions trouvées dans le dossier ? Déposez-les : les pages s’affichent côte à côte, les différences surlignées et numérotées, avec un résumé en dessous. Ensuite, choisissez ce que vous gardez. Rien n’est modifié tant que vous n’avez pas choisi.</p>
    <div class="cmp-slots">${slot('A')}${slot('B')}</div>
    <div id="cmp-out" aria-live="polite"></div>
    <div class="row end mt"><button type="button" class="ghost" data-close>Fermer</button></div>`,'cmpdlg');
  const box=$('#modal-box');
  const name=k=>{ const s=S[k]; return s?(s.doc?s.doc.titre:s.file.name):''; };
  const set=async(k,file,doc)=>{
    const o=S[k==='A'?'B':'A']; if(doc&&o&&o.doc===doc){ toast('C’est le même document : choisissez-en un autre'); const p=box.querySelector(`[data-slot="${k}"] [data-pick]`); if(p) p.value=''; return; }
    S[k]={file,doc,thumbs:null,ocr:null}; const el=box.querySelector(`[data-slot="${k}"]`);
    el.querySelector('[data-name]').textContent=(doc?'📚 '+doc.titre+' (dans Librejo)':'📄 '+file.name)+' · '+sizeTxt(file.size);
    el.classList.add('filled'); if(S.A&&S.B){ box.querySelector('.cmp-slots').classList.add('done'); run_(); }
  };
  box.querySelectorAll('.cmp-slot').forEach(el=>{
    const k=el.dataset.slot, z=el.querySelector('.cmp-drop');
    el.querySelector('[data-file]').onchange=e=>{ const f=e.target.files[0]; if(f){ const p=el.querySelector('[data-pick]'); if(p) p.value=''; set(k,f,null); } };
    const p=el.querySelector('[data-pick]'); if(p) p.onchange=async()=>{ const d=docs.find(x=>x.chemin===p.value); if(!d) return;
      try{ set(k,await readRel(d.chemin),d); }catch(e){ if(e instanceof Cancel) return; const m=fsErr(e); m&&toast(m); } };
    z.addEventListener('dragover',e=>{ e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave',()=>z.classList.remove('over'));
    z.addEventListener('drop',e=>{ e.preventDefault(); z.classList.remove('over'); const fs=[...e.dataTransfer.files]; if(!fs.length) return;
      if(fs.length>1&&k==='A'&&!S.B){ set('B',fs[1],null); } set(k,fs[0],null); });
  });
  if(init){ if(init.A) set('A',init.A.file,init.A.doc||null); if(init.B) set('B',init.B.file,init.B.doc||null); }
  async function run_(){
    if(busy) return; busy=true; const out=$('#cmp-out'); if(!out){ busy=false; return; }
    out.innerHTML='<p class="hint">Lecture des deux documents…</p>';
    try{
      const [ha,hb]=await Promise.all([cmpHash(S.A.file),cmpHash(S.B.file)]);
      const [ta,tb]=await Promise.all([cmpLines(S.A.file).catch(()=>null),cmpLines(S.B.file).catch(()=>null)]);
      if(!$('#cmp-out')) return;
      const meta=k=>{ const s=S[k], t=s.ocr||(k==='A'?ta:tb), f=s.file;
        return `<div class="cmp-meta"><b>${k} · ${esc(name(k))}</b><small>${esc((extOf(f.name)||'').toUpperCase())} · ${sizeTxt(f.size)}${f.lastModified?' · modifié le '+frDate(new Date(f.lastModified).toISOString()):''}${t&&t.pages?' · '+t.pages+' page'+(t.pages>1?'s':''):''}${s.doc?' · v'+esc(s.doc.version||'1')+' dans Librejo':''}</small></div>`; };
      const isPdf=k=>(extOf(S[k].file.name)||'').toLowerCase()==='pdf';
      let TA=S.A.ocr||ta, TB=S.B.ocr||tb, body='', resume='', chips='';
      const scanA=isPdf('A')&&TA&&!TA.lines.length, scanB=isPdf('B')&&TB&&!TB.lines.length;
      const [thA,thB]=await Promise.all(['A','B'].map(k=>isPdf(k)?(S[k].thumbs||(S[k].thumbs=cmpThumbs(S[k].file,460))):null));
      if(!$('#cmp-out')) return;
      const view=(rows,mk,B)=>`<div class="cmpv">
          <div class="cmpv-col"><div class="cmpv-scroll" data-side="A">${cmpColumn('A',TA,thA,mk,B)}</div></div>
          <div class="cmpv-col"><div class="cmpv-scroll" data-side="B">${cmpColumn('B',TB,thB,mk,B)}</div></div></div>
        <div class="cmpv-tools"><label class="check"><input type="checkbox" id="cmpv-link" checked> Faire défiler les deux côtés ensemble</label>
          <div class="cmpv-zoom choice" role="group" aria-label="Taille des pages"><span>Taille :</span>${[['52%','Petite'],['72%','Moyenne'],['100%','Grande']].map(([v,l])=>`<button type="button" class="chip" data-zoom="${v}" aria-pressed="${v==='72%'}">${l}</button>`).join('')}</div></div>`;
      if(ha&&ha===hb){ resume='✅ Les deux fichiers sont <b>strictement identiques</b>. Vous pouvez n’en garder qu’un.';
        if(TA&&TA.lines.length) body=view([],new Map(),[]); }
      else if(!TA||!TB){ resume='ℹ️ Le contenu de ce type de fichier ne peut pas être comparé ici (seulement PDF, Word, LibreOffice et texte). Comparez la taille et la date, ou ouvrez-les.'; }
      else if(scanA||scanB){ const which=scanA&&scanB?'Les deux PDF sont des scans':`Le PDF ${scanA?'A':'B'} est un scan`;
        resume=`📷 ${which} : ils ne contiennent que des images, sans texte à comparer.`;
        body=`<div class="cmpv-ocr"><button type="button" class="primary" id="cmp-ocr">🔎 Lire le texte des scans (OCR)</button><span class="hint">Sur ce poste, rien n’est envoyé. Compter quelques secondes par page ; la lecture peut contenir des erreurs.</span><div class="ocr-bar" hidden><i></i></div><span class="hint" id="cmp-ocrst"></span></div>`
          +view([],new Map(),[]); }
      else{
        const rows=cmpRows(cmpOps(TA.lines,TB.lines,(x,y)=>x.t===y.t)), {B,mark}=cmpBlocks(rows);
        const n=k=>rows.filter(r=>r.k===k).length, nc=n('chg'), na=n('add'), nl=n('del');
        resume=B.length?`<b>${B.length} différence${B.length>1?'s':''}</b> entre A et B${TA.ocr||TB.ocr?' <small>(texte lu par OCR : vérifiez à l’œil)</small>':''}`
          :'✅ Le texte est <b>identique</b>. Seuls la mise en forme, les images ou les propriétés du fichier changent.';
        chips=B.length?`<div class="cmpv-chips"><span class="cmpv-chip k-chg">✏️ ${nc} ligne${nc>1?'s':''} modifiée${nc>1?'s':''}</span><span class="cmpv-chip k-add">➕ ${na} ajoutée${na>1?'s':''}</span><span class="cmpv-chip k-del">➖ ${nl} retirée${nl>1?'s':''}</span></div>`:'';
        body=view(rows,mark,B)+(B.length?`<div class="cmpv-sum"><h4>📋 Résumé des différences</h4><ol class="cmpv-list">${B.map(cmpSummaryItem).join('')}</ol>
          <details class="cmpv-detail"><summary>Voir tout le texte, ligne à ligne</summary>${cmpGridHTML(rows)}</details></div>`:'');
      }
      const headH=`<div class="cmp-head">${meta('A')}${meta('B')}</div><div class="cmpv-top"><p class="cmp-sum">${resume}</p>${chips}</div>`;
      const wire=()=>{ const o=$('#cmp-out'); if(!o) return;
        const cols=[...o.querySelectorAll('.cmpv-scroll')]; let lock=false;
        cols.forEach((c,i)=>c.addEventListener('scroll',()=>{ if(lock||!$('#cmpv-link')||!$('#cmpv-link').checked) return; const d=cols[1-i]; lock=true;
          d.scrollTop=c.scrollTop/(Math.max(1,c.scrollHeight-c.clientHeight))*(d.scrollHeight-d.clientHeight); requestAnimationFrame(()=>lock=false); }));
        const go=(n,fromSum)=>{ lock=true; cols.forEach(c=>{ const el=c.querySelector(`[data-blk="${n}"]`); if(!el) return;
            c.scrollTop+=el.getBoundingClientRect().top-c.getBoundingClientRect().top-c.clientHeight/3; });
          o.querySelectorAll('.flash').forEach(x=>x.classList.remove('flash'));
          o.querySelectorAll(`[data-blk="${n}"],[data-goto="${n}"]`).forEach(x=>{ void x.offsetWidth; x.classList.add('flash'); clearTimeout(x._fl); x._fl=setTimeout(()=>x.classList.remove('flash'),3000); });
          if(!fromSum){ const it=o.querySelector(`[data-goto="${n}"]`); it&&it.scrollIntoView({block:'nearest',behavior:smooth()}); }
          setTimeout(()=>lock=false,120); };
        o.addEventListener('click',e=>{ const z=e.target.closest('[data-zoom]'); if(z){ cols.forEach(c=>c.style.setProperty('--pgw',z.dataset.zoom)); o.querySelectorAll('[data-zoom]').forEach(x=>x.setAttribute('aria-pressed',String(x===z))); return; }
          const g=e.target.closest('[data-goto]'); if(g){ go(g.dataset.goto,true); return; } const b=e.target.closest('[data-blk]'); if(b) go(b.dataset.blk,false); });
        const oc=$('#cmp-ocr'); if(oc) oc.onclick=async()=>{ oc.disabled=true; const bar=o.querySelector('.ocr-bar'), st=$('#cmp-ocrst'); bar.hidden=false;
          try{ for(const k of ['A','B']){ if(!(k==='A'?scanA:scanB)) continue;
              S[k].ocr=await ocrPdf(S[k].file,(p,n,N)=>{ if(n) st.textContent=`Lecture de ${k} : page ${n} sur ${N}…`; bar.firstElementChild.style.width=Math.round((p||0)*100)+'%'; }); }
            run_(); }
          catch(err){ st.textContent='Lecture impossible : '+(err.message||err); oc.disabled=false; bar.hidden=true; } };
      };
      if(MD){ const v=(+MD.version||1)+1;
        out.innerHTML=`${headH}${body}
        <div class="cmp-keep"><b>Enregistrer ces modifications ?</b>
          <div class="row gap-s wrap"><button type="button" class="primary" data-md="ver">Enregistrer comme version ${v}</button><button type="button" class="secondary" data-md="fix">Petite correction (rester en v${esc(MD.version||'1')})</button></div>
          <p class="hint">Version ${v} : pour un vrai changement (nouveau contenu, nouvelle règle). Petite correction : faute de frappe, date, coquille. Dans les deux cas, l’ancien fichier est archivé, rien n’est supprimé.</p></div>`;
        out.querySelectorAll('[data-md]').forEach(b=>b.onclick=async()=>{ const f=S.B.file; b.disabled=true;
          const ok=b.dataset.md==='ver'?await newVersion(MD,f):await minorFix(MD,f); if(ok){ closeModal(); renderDocs(); } else b.disabled=false; });
        wire(); return; }
      out.innerHTML=`${headH}${body}
        <div class="cmp-keep"><b>Que garder dans Librejo ?</b>
          <div class="row gap-s wrap"><button type="button" class="primary" data-keep="A">Garder A</button><button type="button" class="primary" data-keep="B">Garder B</button>
          <button type="button" class="secondary" data-keep="AB">Garder les deux</button><button type="button" class="secondary" data-keep="">Aucun</button></div>
          <p class="hint" id="cmp-what"></p></div>`;
      const what=$('#cmp-what');
      out.querySelectorAll('[data-keep]').forEach(b=>{ const h=()=>{ what.textContent=keepTxt(b.dataset.keep); }; b.onmouseenter=h; b.onfocus=h; b.onclick=()=>keep(b.dataset.keep); });
      wire();
    }catch(e){ const o=$('#cmp-out'); if(o) o.innerHTML=`<p class="hint">Comparaison impossible : ${esc(e.message||e)}</p>`; }
    finally{ busy=false; }
  }
  const other=k=>k==='A'?'B':'A';
  function keepTxt(c){
    if(c==='A'||c==='B'){ const s=S[c], o=S[other(c)];
      if(s.doc&&o.doc) return `${c} reste en place ; ${other(c)} sera archivé (rien n’est supprimé).`;
      if(s.doc) return `${c} est déjà dans Librejo : rien ne change. Le fichier ${other(c)} reste où il est.`;
      if(o.doc) return `${c} devient la nouvelle version de « ${o.doc.titre} » ; l’ancienne est archivée.`;
      return `${c} sera ajouté à Librejo : vous remplissez ensuite son titre, sa catégorie et ses mots-clés.`; }
    if(c==='AB') return 'Les fichiers qui ne sont pas encore dans Librejo y seront ajoutés ; vous remplissez leurs infos.';
    return 'Aucun n’est ajouté. Ceux déjà dans Librejo seront archivés (rien n’est supprimé).';
  }
  function keep(c){
    const K=c.split('').filter(Boolean), drop=['A','B'].filter(k=>!K.includes(k));
    const add=K.filter(k=>!S[k].doc).map(k=>S[k].file), arch=drop.map(k=>S[k].doc).filter(Boolean);
    if(K.length===1&&!S[K[0]].doc&&S[other(K[0])].doc){ const d=S[other(K[0])].doc, f=S[K[0]].file; closeModal();
      askConfirm('Remplacer par cette version ?',`« ${esc(f.name)} » devient la nouvelle version de « ${esc(d.titre)} » (v${esc(d.version||'1')}) ; l’ancienne est archivée, pas écrasée.`,'Nouvelle version',async()=>{ if(await newVersion(d,f)) renderDocs(); });
      return; }
    if(arch.length){ closeModal();
      askConfirm(arch.length>1?'Archiver ces deux documents ?':'Archiver ce document ?',`${arch.map(d=>'« '+esc(d.titre)+' »').join(' et ')} ${arch.length>1?'seront retirés':'sera retiré'} de Librejo et ${arch.length>1?'rangés':'rangé'} dans le dossier ${ARCH}. Rien n’est supprimé.`,'Archiver',async()=>{
        for(const d of arch) await archiveQuiet(d); renderDocs(); if(add.length) addDocs(add); });
      return; }
    closeModal();
    if(add.length) addDocs(add); else toast(K.length?'Rien à changer : déjà dans Librejo':'Rien n’a été ajouté. Les fichiers restent où ils sont.');
  }
}
/* ---------- Journal des modifications (admin) : qui a fait quoi et quand, sans aucune donnée d'usager ---------- */
const JR_REL='app/journal.json', JR_WHO='librejo-admin-nom', JR_MAX=5000;
const jrWho=()=>{ try{ return localStorage.getItem(JR_WHO)||''; }catch(e){ return ''; } };
let jrQ=Promise.resolve();
async function jrRead(){ try{ const t=await (await readRel(JR_REL)).text(); const j=JSON.parse(t); return Array.isArray(j)?j:[]; }catch(e){ return []; } }
function jlog(action,objet,detail){
  if(!FSA||!isAdmin) return;
  const e={quand:new Date().toISOString(),qui:jrWho()||'Admin',poste:stPoste(),action,objet:objet||'',detail:detail||''};
  jrQ=jrQ.then(async()=>{ const J=await jrRead(); J.push(e); while(J.length>JR_MAX) J.shift();
    await writeRel(JR_REL,new Blob([JSON.stringify(J,null,0)],{type:'application/json'})); }).catch(err=>console.warn('journal',err));
  return jrQ;
}
const JR_ICON={Ajout:'➕','Nouvelle version':'🆕',Correction:'✏️',Marquage:'🏷️',Archivage:'🗄️',Restauration:'♻️','Infos modifiées':'📝','Formulaire créé':'🧩','Formulaire modifié':'🧩','Formulaire supprimé':'🧩','Formulaire ajouté':'🧩','Catégorie créée':'📁','Catégorie renommée':'📁','Catégorie supprimée':'📁','Réglages enregistrés':'⚙️','Actualisation':'🔄','Recherche dans le texte':'🔎'};
async function journal(){
  openModal(`<h3 id="modal-title">📜 Journal des modifications</h3><p class="hint">Ce que les admins ont ajouté, modifié ou archivé dans Librejo. Aucune donnée de personne accompagnée n’y figure.</p><div id="jr-b"><p class="hint">Lecture…</p></div>`,'wide jrdlg');
  const J=(await jrRead()).reverse(); const b=$('#jr-b'); if(!b) return;
  const acts=[...new Set(J.map(e=>e.action))].sort((a,b)=>a.localeCompare(b,'fr')), whos=[...new Set(J.map(e=>e.qui))].sort();
  const fdt=s=>{ const d=new Date(s); return d.toLocaleDateString('fr-FR')+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); };
  b.innerHTML=J.length?`<div class="jr-tools"><input class="in" id="jr-q" type="search" placeholder="Chercher (document, action, personne…)">
      <select class="in" id="jr-a"><option value="">Toutes les actions</option>${acts.map(a=>`<option>${esc(a)}</option>`).join('')}</select>
      ${whos.length>1?`<select class="in" id="jr-w"><option value="">Tout le monde</option>${whos.map(a=>`<option>${esc(a)}</option>`).join('')}</select>`:''}
      <button type="button" class="secondary" id="jr-csv">${ICON.down||''}Exporter (tableur)</button></div>
    <p class="hint" id="jr-n"></p><div class="jr-list" id="jr-list"></div>
    ${jrWho()?'':`<p class="hint">💡 Les actions de ce poste sont notées « Admin ». <button type="button" class="linkbtn" id="jr-me">Indiquer votre prénom</button></p>`}`
    :`<div class="empty"><p>Le journal est vide pour l’instant. Il se remplit à chaque ajout, modification ou archivage.</p></div>`;
  if(!J.length) return;
  let rows=J;
  const draw=()=>{ const q=terms($('#jr-q').value), a=$('#jr-a').value, w=$('#jr-w')?$('#jr-w').value:'';
    rows=J.filter(e=>(!a||e.action===a)&&(!w||e.qui===w)&&(!q.length||q.every(t=>norm(`${e.action} ${e.objet} ${e.detail} ${e.qui}`).includes(t))));
    $('#jr-n').textContent=`${rows.length} action${rows.length>1?'s':''}`;
    let last=''; $('#jr-list').innerHTML=rows.slice(0,400).map(e=>{ const day=new Date(e.quand).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
      const h=day!==last?`<div class="jr-day">${esc(day)}</div>`:''; last=day;
      return h+`<div class="jr-row"><span class="jr-ic" aria-hidden="true">${JR_ICON[e.action]||'•'}</span><span class="jr-t"><b>${esc(e.action)}</b>${e.objet?' · '+esc(e.objet):''}${e.detail?`<small>${esc(e.detail)}</small>`:''}</span><span class="jr-m">${esc(new Date(e.quand).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))}<small>${esc(e.qui)}</small></span></div>`; }).join('')
      +(rows.length>400?`<p class="hint">… ${rows.length-400} actions plus anciennes : utilisez l’export.</p>`:''); };
  ['jr-q','jr-a','jr-w'].forEach(id=>{ const el=$('#'+id); if(el) el.addEventListener('input',draw); });
  $('#jr-csv').onclick=()=>{ const c=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const L=[['Date','Heure','Qui','Action','Document ou élément','Détail'].map(c).join(';'),...rows.map(e=>{ const d=new Date(e.quand); return [d.toLocaleDateString('fr-FR'),d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),e.qui,e.action,e.objet,e.detail].map(c).join(';'); })];
    downloadBlob(new Blob(['﻿'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}),`Journal-Librejo_${fileSafe(structure.nom||'structure')}_${today()}.csv`); toast('Journal téléchargé'); };
  const me=$('#jr-me'); if(me) me.onclick=()=>askText('Votre prénom','Prénom ou initiales, noté dans le journal pour les actions faites sur ce poste','',v=>{ try{ localStorage.setItem(JR_WHO,v.trim()); }catch(e){} toast('C’est noté'); journal(); });
  draw();
}

/* ---------- Archives (admin) : anciennes versions et documents archivés, triés par date, nom ou catégorie ---------- */
async function archList(){
  const root=await getDir('read'), dd=await root.getDirectoryHandle('Documents'), out=[];
  const hist=new Map(); DATA.documents.forEach(d=>(d.historique||[]).forEach(h=>h.chemin&&hist.set(h.chemin,{doc:d,h})));
  const histA=new Map(); (DATA.archives||[]).forEach(m=>(m.historique||[]).forEach(h=>h.chemin&&histA.set(h.chemin,{m,h})));
  const meta=new Map((DATA.archives||[]).map(a=>[a.archChemin,a]));
  for await (const [cat,ch] of dd.entries()){ if(ch.kind!=='directory') continue;
    let ah=null; try{ ah=await ch.getDirectoryHandle(ARCH); }catch(e){ continue; }
    const walk=async(dir,pre)=>{ for await (const [n,x] of dir.entries()){ if(n.startsWith('.')||n.startsWith('~$')) continue;
      if(x.kind==='directory'){ await walk(x,pre+n+'/'); continue; }
      const rel=`Documents/${cat}/${ARCH}/${pre}${n}`, f=await x.getFile(), hv=hist.get(rel), m=meta.get(rel), ha=histA.get(rel);
      out.push({rel,fichier:n,cat,taille:f.size,quand:m&&m.archiveLe?m.archiveLe:new Date(f.lastModified).toISOString(),
        type:hv?'version':m?'doc':ha?'oldarch':'fichier',titre:hv?hv.doc.titre:m?m.titre:ha?ha.m.titre:parseName(n.replace(/\.[^.]+$/,'')).titre,
        version:hv?hv.h.version:m?m.version:ha?ha.h.version:'',doc:hv?hv.doc:null,meta:m||null,ext:(extOf(n)||'').toLowerCase()}); } };
    await walk(ah,''); }
  return out;
}
let archSort='date';
async function archives(){
  openModal(`<h3 id="modal-title">🗄️ Archives</h3><p class="hint">Les anciennes versions et les documents retirés de Librejo. Rien n’est jamais supprimé : on peut les consulter, les comparer ou les restaurer.</p><div id="ar-b"><p class="hint">Lecture du dossier…</p></div>`,'wide ardlg');
  let A; try{ A=await archList(); }catch(e){ const m=fsErr(e); const b=$('#ar-b'); if(b) b.innerHTML=`<p class="hint">${esc(m||'Lecture impossible')}</p>`; return; }
  const b=$('#ar-b'); if(!b) return;
  if(!A.length){ b.innerHTML='<div class="empty"><p>Aucune archive pour l’instant.</p></div>'; return; }
  const n=t=>A.filter(a=>a.type===t||(t==='version'&&a.type==='oldarch')).length;
  b.innerHTML=`<div class="ar-tools"><input class="in" id="ar-q" type="search" placeholder="Chercher dans les archives">
      <div class="choice" role="group" aria-label="Trier par">${[['date','📅 Date'],['nom','🔤 Nom'],['cat','📁 Catégorie']].map(([k,l])=>`<button type="button" class="chip" data-arsort="${k}" aria-pressed="${archSort===k}">${l}</button>`).join('')}</div></div>
    <p class="hint">${n('version')} ancienne${n('version')>1?'s':''} version${n('version')>1?'s':''} · ${n('doc')} document${n('doc')>1?'s':''} archivé${n('doc')>1?'s':''}${n('fichier')?` · ${n('fichier')} autre${n('fichier')>1?'s':''} fichier${n('fichier')>1?'s':''}`:''}</p>
    <div id="ar-list" class="ar-list"></div>`;
  const icon=e=>e==='pdf'?'📕':['doc','docx','odt','rtf'].includes(e)?'📘':['xls','xlsx','ods','csv'].includes(e)?'📗':['png','jpg','jpeg','webp','gif'].includes(e)?'🖼️':'📄';
  const lab=a=>a.type==='version'?`Ancienne version${a.version?' v'+esc(a.version):''} de « ${esc(a.doc.titre)} »`:a.type==='doc'?`Document archivé${a.version?' (v'+esc(a.version)+')':''}`:a.type==='oldarch'?`Ancienne version${a.version?' v'+esc(a.version):''} d’un document archivé`:'Fichier déposé dans les archives';
  const draw=()=>{ const q=terms($('#ar-q').value); let L=A.filter(a=>!q.length||q.every(t=>norm(`${a.titre} ${a.fichier} ${catName(a.cat)}`).includes(t)));
    const key=a=>archSort==='date'?new Date(a.quand).toLocaleDateString('fr-FR',{month:'long',year:'numeric'}):archSort==='nom'?(norm(a.titre)[0]||'#').toUpperCase():catName(a.cat)||a.cat;
    L.sort((x,y)=>archSort==='date'?y.quand.localeCompare(x.quand):archSort==='nom'?x.titre.localeCompare(y.titre,'fr')||y.quand.localeCompare(x.quand):(catName(x.cat)||'').localeCompare(catName(y.cat)||'','fr')||y.quand.localeCompare(x.quand));
    let last=''; $('#ar-list').innerHTML=L.length?L.map(a=>{ const k=key(a), h=k!==last?`<div class="jr-day">${esc(k.charAt(0).toUpperCase()+k.slice(1))}</div>`:''; last=k;
      return h+`<div class="ar-row" data-ar="${esc(a.rel)}"><span class="ar-ic" aria-hidden="true">${icon(a.ext)}</span>
        <span class="ar-t"><b>${esc(a.titre)}</b><small>${lab(a)} · ${esc(catName(a.cat)||a.cat)} · archivé le ${frDate(a.quand)} · ${sizeTxt(a.taille)}</small><small class="ar-f">${esc(a.fichier)}</small></span>
        <span class="ar-act"><a class="secondary sm" href="${hrefOf(a.rel)}" target="_blank" rel="noopener" data-arview>Ouvrir</a>${a.doc&&['pdf','docx','odt','txt'].includes(a.ext)?`<button type="button" class="secondary sm" data-arcmp>Comparer</button>`:''}<button type="button" class="primary sm" data-arrest>♻️ Restaurer</button></span></div>`; }).join('')
      :'<p class="hint">Rien ne correspond.</p>'; };
  $('#ar-q').addEventListener('input',draw);
  b.addEventListener('click',async e=>{
    const s=e.target.closest('[data-arsort]'); if(s){ archSort=s.dataset.arsort; b.querySelectorAll('[data-arsort]').forEach(x=>x.setAttribute('aria-pressed',String(x===s))); draw(); return; }
    const row=e.target.closest('[data-ar]'); if(!row) return; const a=A.find(x=>x.rel===row.dataset.ar);
    if(e.target.closest('[data-arview]')&&FSA){ e.preventDefault(); try{ const f=await readRel(a.rel); openSafe(f,a.rel.split('/').pop()); }catch(err){ const m=fsErr(err); m&&toast(m); } return; }
    if(e.target.closest('[data-arcmp]')){ try{ const [cur,old]=await Promise.all([readRel(a.doc.chemin),readRel(a.rel)]); comparer({A:{file:old},B:{file:cur,doc:a.doc}}); }catch(err){ const m=fsErr(err); m&&toast(m); } return; }
    if(e.target.closest('[data-arrest]')) restoreArch(a);
  });
  draw();
}
async function restoreArch(a){
  let f; try{ f=await readRel(a.rel); }catch(e){ const m=fsErr(e); m&&toast(m); return; }
  if(a.type==='version'&&DATA.documents.includes(a.doc)){ const d=a.doc;
    askConfirm('Restaurer cette ancienne version ?',`La v${esc(a.version||'?')} de « ${esc(d.titre)} » redevient le document en place, sous le numéro v${(+d.version||1)+1}. La version actuelle (v${esc(d.version||'1')}) est archivée à son tour : rien n’est perdu.`,'Restaurer',async()=>{
      if(await newVersion(d,new File([f],a.fichier,{type:f.type}))){ jlog('Restauration',d.titre,`ancienne v${a.version||'?'} remise en place (v${d.version})`); renderDocs(); } });
    return; }
  if(a.type==='doc'&&a.meta){ const m=a.meta, cat=DATA.categories.some(c=>c.id===m.categorie)?m.categorie:(cats()[0]||{}).id;
    if(!cat){ toast('Créez d’abord une catégorie.'); return; }
    askConfirm('Remettre ce document dans Librejo ?',`« ${esc(m.titre)} » revient dans « ${esc(catName(cat))} »${m.sous?' › '+esc(m.sous):''}, avec sa description et ses mots-clés.`,'Restaurer',async()=>{
      const ok=await run(async()=>{ const dest=`Documents/${cat}${m.sous&&cat===m.categorie?'/'+m.sous:''}`;
        const rel=await uniqueRel(dest,a.fichier.replace(/\.[^.]+$/,''),a.ext); await moveRel(a.rel,rel);
        const d={...m,chemin:rel,fichier:rel.split('/').pop(),categorie:cat,modifie:today()}; delete d.archChemin; delete d.archiveLe; if(cat!==m.categorie) d.sous='';
        DATA.documents.push(d); DATA.archives=(DATA.archives||[]).filter(x=>x!==m); await saveData(); },'Document restauré');
      if(ok){ jlog('Restauration',m.titre,'document remis dans Librejo'); closeModal(); renderDocs(); } });
    return; }
  closeModal(); addDocs([new File([f],a.fichier,{type:f.type,lastModified:f.lastModified})],a.cat);
  toast('Remplissez ses infos : une copie sera ajoutée, l’archive reste en place');
}

/* ---------- Recherche dans le texte des documents (case à cocher, index préparé par l'admin) ---------- */
const TX_REL='app/recherche-texte.json';
let TXT=null, TXT_ON=false, txLoading=null;
const txSig=d=>[d.chemin,d.taille||'',d.version||'',d.modifie||''].join('|');
async function txLoad(){ if(TXT) return TXT; if(!txLoading) txLoading=(async()=>{ try{ TXT=JSON.parse(await (await readRel(TX_REL)).text())||{}; }catch(e){ TXT={}; } return TXT; })(); return txLoading; }
const TXN=new Map(); const txRaw=d=>TXT&&TXT[d.id]?TXT[d.id].t||'':''; const txOf=d=>{ if(!TXT||!TXT[d.id]) return ''; const k=d.id+'|'+TXT[d.id].s; if(!TXN.has(k)) TXN.set(k,norm(TXT[d.id].t||'')); return TXN.get(k); };
async function txExtract(file){
  const t=await cmpLines(file).catch(()=>null); if(!t) return '';
  return t.lines.map(l=>l.t).join(' ').slice(0,60000);
}
async function txIndex(list,prog){
  await txLoad(); let n=0, changed=false;
  for(const d of list){ n++; prog&&prog(n,list.length,d);
    if(isLink(d)||!d.chemin) continue; const cur=TXT[d.id]; if(cur&&cur.s===txSig(d)) continue;
    try{ const f=await readRel(d.chemin); const t=await txExtract(f); TXT[d.id]={s:txSig(d),t,scan:!t&&d.ext==='pdf'}; changed=true; }catch(e){ console.warn('index',d.chemin,e); } }
  const ids=new Set(DATA.documents.map(d=>d.id)); Object.keys(TXT).forEach(k=>{ if(!ids.has(k)){ delete TXT[k]; changed=true; } });
  if(changed) await writeRel(TX_REL,new Blob([JSON.stringify(TXT)],{type:'application/json'}));
  return changed;
}
/* Après un ajout ou une nouvelle version : on met l'index à jour sans faire attendre, s'il existe déjà */
function txRefresh(docs){ if(!isAdmin||!FSA) return; existsRel(TX_REL).then(ex=>{ if(ex) txIndex(docs).catch(e=>console.warn(e)); }).catch(()=>{}); }
async function txSetup(){
  const list=DATA.documents.filter(d=>!isLink(d));
  openModal(`<h3 id="modal-title">🔎 Recherche dans le texte des documents</h3>
    <p>Librejo lit une fois le texte de chaque document (PDF, Word, LibreOffice, texte) et le garde dans le dossier. Ensuite, l’équipe peut cocher « Chercher aussi dans le texte » sous la barre de recherche.</p>
    <p class="hint">Les PDF scannés n’ont pas de texte : on peut les lire avec l’OCR au moment de les ajouter. Les nouveaux documents sont ajoutés à l’index tout seuls.</p>
    <div class="ocr-bar" id="tx-bar" hidden><i></i></div><p class="hint" id="tx-st"></p>
    <div class="row end mt"><button type="button" class="ghost" data-close>Fermer</button><button type="button" class="primary" id="tx-go">Préparer (${list.length} document${list.length>1?'s':''})</button></div>`);
  $('#tx-go').onclick=async()=>{ const bt=$('#tx-go'); bt.disabled=true; $('#tx-bar').hidden=false;
    const ok=await run(()=>txIndex(list,(i,N,d)=>{ const st=$('#tx-st'), bar=$('#tx-bar'); if(st) st.textContent=`${i} / ${N} : ${d.titre}`; if(bar) bar.firstElementChild.style.width=Math.round(i/N*100)+'%'; }));
    const st=$('#tx-st'); if(!st) return;
    const sc=Object.values(TXT||{}).filter(x=>x.scan).length;
    st.textContent=ok?`✅ C’est prêt : ${Object.keys(TXT).length} documents lus${sc?`, dont ${sc} PDF scanné${sc>1?'s':''} sans texte`:''}.`:'La préparation n’a pas pu se terminer.';
    if(ok){ bt.textContent='Refaire'; bt.disabled=false; jlog('Recherche dans le texte','',`${Object.keys(TXT).length} documents indexés`); } };
}
/* ---------- Statistiques d'utilisation : par poste, par mois ; seulement des identifiants de documents et des nombres ---------- */
const ST_KEY='librejo-stats', ST_POSTE='librejo-poste';
function stPoste(){ try{ let p=localStorage.getItem(ST_POSTE); if(!p){ p='p'+rid(); localStorage.setItem(ST_POSTE,p); } return p; }catch(e){ return 'p-inconnu'; } }
function stRead(){ try{ return JSON.parse(localStorage.getItem(ST_KEY)||'{}')||{}; }catch(e){ return {}; } }
let stTimer=null, stLastForm=null;
function stBump(k,what,n){ if(!k) return; const S=stRead(), m=new Date().toISOString().slice(0,7); S[m]=S[m]||{}; const u=S[m][k]=S[m][k]||{};
  u[what]=(u[what]||0)+(n||1); Object.keys(S).sort().slice(0,-14).forEach(x=>delete S[x]);
  try{ localStorage.setItem(ST_KEY,JSON.stringify(S)); }catch(e){}
  clearTimeout(stTimer); stTimer=setTimeout(stFlush,20000); }
/* Partage dans le dossier si ce poste a déjà le droit d'écrire (jamais de demande d'autorisation pour ça) */
async function stFlush(force){
  try{ const h=await idb.get('dossier'); if(!h) return false; if(!force&&h.queryPermission&&await h.queryPermission({mode:'readwrite'})!=='granted') return false;
    await writeRel(`app/statistiques/${stPoste()}.json`,new Blob([JSON.stringify({poste:stPoste(),qui:jrWho()||'',maj:new Date().toISOString(),mois:stRead()})],{type:'application/json'})); return true; }
  catch(e){ return false; }
}
document.addEventListener('click',e=>{ const t=e.target; if(!t||!t.closest) return; let el;
  if((el=t.closest('[data-fill]'))){ stLastForm={k:'f:'+el.dataset.fill,t:Date.now()}; return stBump('f:'+el.dataset.fill,'o'); }
  if((el=t.closest('[data-fillword]'))){ stLastForm={k:'d:'+el.dataset.fillword,t:Date.now()}; return stBump('d:'+el.dataset.fillword,'o'); }
  if((el=t.closest('[data-kprint]'))) return stBump('k:'+el.dataset.kprint,'p');
  if((el=t.closest('[data-ksend]'))) return stBump('k:'+el.dataset.ksend,'e');
  if((el=t.closest('[data-print],[data-send]'))){ const c=el.dataset.print||el.dataset.send, d=DATA.documents.find(x=>x.chemin===c); if(d) stBump('d:'+d.id,el.dataset.print?'p':'e'); return; }
  if((el=t.closest('[data-lsend]'))) return stBump('d:'+el.dataset.lsend,'e');
  if((el=t.closest('a[href]'))&&!t.closest('#modal')){ const h=el.getAttribute('href'); const d=DATA.documents.find(x=>isLink(x)?x.url===h:hrefOf(x.chemin)===h); if(d) stBump('d:'+d.id,'o'); }
},true);
window.addEventListener('pagehide',()=>{ stFlush(); });
async function stAll(){
  const P=[]; const own={poste:stPoste(),qui:jrWho(),maj:new Date().toISOString(),mois:stRead(),moi:true}; P.push(own);
  try{ const dir=await dirAt(['app','statistiques'],'read',false);
    for await (const [n,h] of dir.entries()){ if(h.kind!=='file'||!n.endsWith('.json')||n===stPoste()+'.json') continue;
      try{ P.push(JSON.parse(await (await h.getFile()).text())); }catch(e){} } }catch(e){}
  return P;
}
function stSum(P,months){ const T={}; P.forEach(p=>Object.entries(p.mois||{}).forEach(([m,o])=>{ if(months&&!months.includes(m)) return;
  Object.entries(o).forEach(([k,u])=>{ const t=T[k]=T[k]||{o:0,p:0,e:0,q:0,g:0}; Object.keys(u).forEach(x=>t[x]=(t[x]||0)+u[x]); }); })); return T; }
const monthsBack=n=>{ const r=[], d=new Date(); d.setDate(1); for(let i=0;i<n;i++){ r.push(d.toISOString().slice(0,7)); d.setMonth(d.getMonth()-1); } return r; };

/* ---------- Tableau de bord (admin) ---------- */
let dbPer=3;
async function dashboard(){
  openModal(`<h3 id="modal-title">📊 Tableau de bord</h3><div id="db-b"><p class="hint">Calcul…</p></div>`,'wide dbdlg');
  await stFlush(); const [P]=await Promise.all([stAll(),txLoad().catch(()=>null)]); const b=$('#db-b'); if(!b) return;
  const D=DATA.documents.filter(d=>!isLink(d)), F=formItems?formItems():[], now=Date.now(), age=s=>s?(now-new Date(s).getTime())/864e5:9999;
  const months=dbPer?monthsBack(dbPer):null, T=stSum(P,months);
  const nm=k=>{ const [t,id]=k.split(':'); if(t==='d'){ const d=docById(id)||DATA.documents.find(x=>x.id===id); return d?{t:d.titre,ic:isLink(d)?'🔗':'📄',it:d}:null; }
    if(t==='f'){ const f=F.find(x=>x.id===id)||DATA.formulaires.find(x=>x.id===id); return f?{t:f.titre,ic:'🧩',it:f}:null; }
    if(t==='k'){ const k=(DATA.kits||[]).find(x=>x.id===id); return k?{t:k.titre,ic:'🧰'}:null; } return null; };
  const tot=u=>(u.o||0)+(u.p||0)+(u.e||0)+(u.q||0)+(u.g||0);
  const top=(fn,filt,n=8)=>Object.entries(T).filter(([k,u])=>filt(k)&&fn(u)>0&&nm(k)).sort((a,b)=>fn(b[1])-fn(a[1])).slice(0,n).map(([k,u])=>({k,v:fn(u),...nm(k)}));
  const bars=(L,unit)=>L.length?`<ol class="db-bars">${L.map(x=>`<li><span class="db-bl">${x.ic} ${esc(x.t)}</span><span class="db-bw"><i style="width:${Math.max(4,x.v/L[0].v*100)}%"></i></span><b>${x.v}</b></li>`).join('')}</ol>`:`<p class="hint">Pas encore de chiffres sur la période.</p>`;
  const isD=k=>k.startsWith('d:'), isF=k=>k.startsWith('f:');
  const used=k=>T[k]&&tot(T[k])>0;
  const unusedD=D.filter(d=>!used('d:'+d.id)&&age(d.ajoute)>30).sort((a,b)=>(a.ajoute||'').localeCompare(b.ajoute||'')), unusedF=F.filter(f=>!used('f:'+f.id));
  // à faire
  const noDesc=D.filter(d=>!d.description&&!(d.motscles||[]).length);
  const dupKey=d=>norm(d.titre).replace(/[^a-z0-9]/g,''), dups=[]; const seen=new Map(); D.forEach(d=>{ const k=dupKey(d); if(seen.has(k)) dups.push([seen.get(k),d]); else seen.set(k,d); });
  const sameSize=[]; const ss=new Map(); D.forEach(d=>{ if(!d.taille) return; const k=d.ext+'|'+d.taille; if(ss.has(k)) sameSize.push([ss.get(k),d]); else ss.set(k,d); });
  const old=D.filter(d=>{ const dt=d.modifie||d.ajoute||(d.date&&d.date.length===7?d.date+'-01':d.date); return age(dt)>365; });
  const popOld=old.filter(d=>T['d:'+d.id]&&tot(T['d:'+d.id])>=3).sort((a,b)=>tot(T['d:'+b.id])-tot(T['d:'+a.id]));
  const cz=D.filter(d=>d.cerfa&&age(d.cerfa.verifie)>92);
  const txN=TXT?D.filter(d=>!TXT[d.id]||TXT[d.id].s!==txSig(d)).length:null;
  const bk=DATA.sauvegarde?age(DATA.sauvegarde):null;
  const card=(ic,n,lab,sub,act,level)=>`<div class="db-card ${level||''}"><span class="db-ic">${ic}</span><b>${n}</b><span>${lab}</span>${sub?`<small>${sub}</small>`:''}${act||''}</div>`;
  const rl=D.filter(d=>relState(d)==='late'), rs=D.filter(d=>relState(d)==='soon'), hOk=HAS_CRIT.filter(c=>hasStatus(c)==='ok').length, hImp=HAS_CRIT.filter(c=>c.imp), hImpOk=hImp.filter(c=>hasStatus(c)==='ok').length;
  const todo=[
    card('⏰',rl.length,'documents à relire',rs.length?`et ${rs.length} dans le mois`:'',rl.length+rs.length?`<button type="button" class="linkbtn" data-dbshow="relire">Voir</button>`:'',rl.length?'warn':'ok'),
    card('⏳',D.filter(d=>d.statut==='avalider').length,'documents à valider',`${D.filter(d=>d.statut==='brouillon').length} brouillon(s)`,D.some(d=>!isPub(d))?`<button type="button" class="linkbtn" data-dbshow="aval">Voir</button>`:'',D.some(d=>d.statut==='avalider')?'warn':'ok'),
    card('🏅',`${hImpOk}/${hImp.length}`,'critères HAS impératifs prouvés',`${hOk}/${HAS_CRIT.length} critères au total`,`<button type="button" class="linkbtn" data-dbgo="has">Préparer</button>`,hImpOk<hImp.length?'warn':'ok'),
    card('💾',bk==null?'Jamais':Math.round(bk)+' j','depuis la dernière sauvegarde',bk==null||bk>30?'Faites une sauvegarde complète':'',`<button type="button" class="linkbtn" data-dbgo="backup">Sauvegarder</button>`,bk==null||bk>30?'warn':'ok'),
    card('🔁',popOld.length,'documents très utilisés mais vieux de plus d’un an','À relire en priorité',popOld.length?`<button type="button" class="linkbtn" data-dbshow="popold">Voir</button>`:'',popOld.length?'warn':'ok'),
    card('👯',dups.length+sameSize.length,'doublons possibles','Même titre ou même fichier',dups.length+sameSize.length?`<button type="button" class="linkbtn" data-dbshow="dups">Voir</button>`:'',dups.length+sameSize.length?'warn':'ok'),
    card('🏷️',noDesc.length,'documents sans description ni mots-clés','La recherche les trouve mal',noDesc.length?`<button type="button" class="linkbtn" data-dbshow="nodesc">Voir</button>`:'',noDesc.length>5?'warn':''),
    card('🏛️',cz.length,'Cerfa non vérifiés depuis 3 mois','',cz.length?`<button type="button" class="linkbtn" data-dbgo="cerfa">Vérifier</button>`:'',cz.length?'warn':'ok'),
    card('🔎',txN==null||!Object.keys(TXT||{}).length?'—':txN,txN==null||!Object.keys(TXT||{}).length?'recherche dans le texte non préparée':'documents à ajouter à la recherche dans le texte','',`<button type="button" class="linkbtn" data-dbgo="tx">Préparer</button>`,txN?'':'ok'),
  ].join('');
  const lists={
    aval:['⏳ À valider et brouillons',D.filter(d=>!isPub(d)).map(d=>`${esc(d.titre)} <small>${ST_LAB[d.statut]} · ${esc(destName(destOf(d)))}</small>`)],
    relire:['⏰ À relire',[...rl,...rs].map(d=>`${esc(d.titre)} <small>${relState(d)==='late'?'en retard depuis le':'avant le'} ${frDate(d.relire)} · ${esc(destName(destOf(d)))}</small>`)],
    popold:['🔁 Très utilisés, vieux de plus d’un an',popOld.map(d=>`${esc(d.titre)} <small>${tot(T['d:'+d.id])} utilisations · ${docDate(d.date)}</small>`)],
    dups:['👯 Doublons possibles',[...dups.map(([a,c])=>`${esc(a.titre)} <small>${esc(destName(destOf(a)))} et ${esc(destName(destOf(c)))} : même titre</small>`),...sameSize.map(([a,c])=>`${esc(a.titre)} ↔ ${esc(c.titre)} <small>même type et même taille</small>`)]],
    nodesc:['🏷️ Sans description ni mots-clés',noDesc.map(d=>`${esc(d.titre)} <small>${esc(destName(destOf(d)))}</small>`)],
    unusedD:['💤 Documents jamais utilisés sur la période',unusedD.map(d=>`${esc(d.titre)} <small>${esc(destName(destOf(d)))} · ajouté ${d.ajoute?'le '+frDate(d.ajoute):'il y a longtemps'}</small>`)],
    unusedF:['💤 Formulaires jamais utilisés sur la période',unusedF.map(f=>`${esc(f.titre)}`)]};
  // usage par catégorie et par mois
  const byCat={}; Object.entries(T).forEach(([k,u])=>{ if(!isD(k)) return; const d=DATA.documents.find(x=>x.id===k.slice(2)); if(!d) return; const c=catName(d.categorie)||'?'; byCat[c]=(byCat[c]||0)+tot(u); });
  const catL=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([t,v])=>({t,v,ic:'📁'}));
  const ms=monthsBack(12).reverse(), perM=ms.map(m=>P.reduce((s,p)=>s+Object.values((p.mois||{})[m]||{}).reduce((a,u)=>a+tot(u),0),0)), mx=Math.max(1,...perM);
  const totAll=Object.values(T).reduce((s,u)=>s+tot(u),0), totP=Object.values(T).reduce((s,u)=>s+(u.p||0)+(u.q||0),0), totG=Object.values(T).reduce((s,u)=>s+(u.g||0),0);
  const postes=P.length, perLab={1:'ce mois-ci',3:'3 derniers mois',12:'12 derniers mois',0:'depuis le début'};
  b.innerHTML=`<h4 class="db-h">À surveiller</h4><div class="db-cards">${todo}</div>
    <div class="db-sh"><h4 class="db-h">📈 Statistiques d’utilisation</h4><div class="choice" role="group" aria-label="Période">${[1,3,12,0].map(n=>`<button type="button" class="chip" data-dbper="${n}" aria-pressed="${dbPer===n}">${perLab[n]}</button>`).join('')}</div></div>
    <div class="db-kpis"><div><b>${totAll}</b><span>utilisations</span></div><div><b>${totP}</b><span>impressions</span></div><div><b>${totG}</b><span>documents produits par les formulaires</span></div><div><b>${postes}</b><span>poste${postes>1?'s':''} compté${postes>1?'s':''}</span></div></div>
    <div class="db-trend" aria-label="Utilisations par mois">${ms.map((m,i)=>`<span title="${m} : ${perM[i]}"><i style="height:${Math.round(perM[i]/mx*100)}%"></i><small>${['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'][+m.slice(5)-1]}</small></span>`).join('')}</div>
    <div class="db-grid">
      <section><h5>📄 Documents les plus ouverts</h5>${bars(top(u=>u.o||0,isD),'')}</section>
      <section><h5>🖨️ Les plus imprimés <small>(impression rapide comprise, en exemplaires)</small></h5>${bars(top(u=>(u.p||0)+(u.q||0),k=>isD(k)||k.startsWith('k:')),'')}</section>
      <section><h5>✉️ Les plus envoyés par mail</h5>${bars(top(u=>u.e||0,k=>isD(k)||k.startsWith('k:')),'')}</section>
      <section><h5>🧩 Formulaires les plus remplis</h5>${bars(top(u=>(u.g||0)||(u.o||0),isF),'')}</section>
      <section><h5>📁 Utilisation par catégorie</h5>${bars(catL.slice(0,8),'')}</section>
      <section><h5>💤 Les moins utilisés</h5><p><button type="button" class="linkbtn" data-dbshow="unusedD"><b>${unusedD.length}</b> document${unusedD.length>1?'s':''} jamais ouvert${unusedD.length>1?'s':''} ni imprimé${unusedD.length>1?'s':''}</button><br><button type="button" class="linkbtn" data-dbshow="unusedF"><b>${unusedF.length}</b> formulaire${unusedF.length>1?'s':''} jamais utilisé${unusedF.length>1?'s':''}</button></p><p class="hint">Candidats à l’archivage, ou à mieux faire connaître à l’équipe.</p></section>
    </div>
    <div id="db-list"></div>
    <details class="hint db-how"><summary>D’où viennent ces chiffres ?</summary>Chaque poste compte ses ouvertures, impressions, envois et formulaires remplis : seulement l’identifiant du document et un nombre, jamais de nom de personne ni de contenu. Un poste partage ses chiffres dans le dossier (app/statistiques) dès qu’il a le droit d’y écrire, c’est-à-dire après un passage en mode admin sur ce poste. Les recherches tapées ne sont pas enregistrées : elles pourraient contenir un nom.</details>
    <div class="row end mt"><button type="button" class="secondary" id="db-csv">Exporter les statistiques (tableur)</button><button type="button" class="ghost" data-close>Fermer</button></div>`;
  b.onclick=e=>{ const pe=e.target.closest('[data-dbper]'); if(pe){ dbPer=+pe.dataset.dbper; dashboard(); return; }
    const sh=e.target.closest('[data-dbshow]'); if(sh){ const [t,L]=lists[sh.dataset.dbshow]; $('#db-list').innerHTML=`<div class="db-listbox"><h5>${t} (${L.length})</h5><ul>${L.slice(0,200).map(x=>`<li>${x}</li>`).join('')}</ul></div>`; $('#db-list').scrollIntoView({block:'nearest',behavior:smooth()}); return; }
    const go=e.target.closest('[data-dbgo]'); if(go){ const k=go.dataset.dbgo; closeModal(); if(k==='backup') backup(); else if(k==='has') hasPrep(); else if(k==='tx') txSetup(); else if(k==='cerfa'){ const f=window.cerfaCheck||(typeof cerfaCheck==='function'?cerfaCheck:null); f?f():setTab('forms'); } } };
  $('#db-csv').onclick=()=>{ const c=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const rows=[...D.map(d=>['Document',d.titre,catName(d.categorie),T['d:'+d.id]||{}]),...F.map(f=>['Formulaire',f.titre,'',T['f:'+f.id]||{}])];
    const L=[['Type','Titre','Catégorie','Ouvertures','Impressions','Exemplaires (impression rapide)','Envois par mail','Documents produits'].map(c).join(';'),...rows.map(([ty,t,ca,u])=>[ty,t,ca,u.o||0,u.p||0,u.q||0,u.e||0,u.g||0].map(c).join(';'))];
    downloadBlob(new Blob(['﻿'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}),`Statistiques-Librejo_${perLab[dbPer].replace(/\s/g,'-')}_${today()}.csv`); toast('Statistiques téléchargées'); };
}

/* ---------- Sauvegarde complète et restauration (admin) ---------- */
async function backupZip(withDocs,prog){
  await needLib('jszip'); const zip=new JSZip(), root=await getDir('read'); let n=0, size=0;
  const walk=async(dir,pre,filter)=>{ for await (const [nm,h] of dir.entries()){ const rel=pre+nm;
    if(h.kind==='directory'){ if(rel==='app/lib'||rel==='app/miniatures'||rel.startsWith('app/_sauvegardes')) continue; await walk(h,rel+'/',filter); continue; }
    if(!filter(rel)) continue; const f=await h.getFile(); zip.file(rel,f,{date:new Date(f.lastModified)}); n++; size+=f.size; prog&&prog(n,rel); } };
  try{ await walk(await root.getDirectoryHandle('app'),'app/',()=>true); }catch(e){}
  if(withDocs){ try{ await walk(await root.getDirectoryHandle('Documents'),'Documents/',()=>true); }catch(e){} }
  zip.file('LIBREJO-SAUVEGARDE.txt',`Sauvegarde Librejo de ${structure.nom||'la structure'}\nFaite le ${new Date().toLocaleString('fr-FR')}${jrWho()?' par '+jrWho():''}\nContenu : réglages, liste des documents, formulaires, annuaire, journal${withDocs?', et tous les documents':''}.\nPour restaurer : Librejo › Documents › Outils › Sauvegarde › Restaurer.\n`);
  return {blob:await zip.generateAsync({type:'blob',compression:'DEFLATE'}),n,size};
}
async function dossierSize(){ let s=0,n=0; try{ const root=await getDir('read'); const walk=async d=>{ for await (const [,h] of d.entries()){ if(h.kind==='directory') await walk(h); else { s+=(await h.getFile()).size; n++; } } }; await walk(await root.getDirectoryHandle('Documents')); }catch(e){} return {s,n}; }
async function backup(){
  openModal(`<h3 id="modal-title">💾 Sauvegarde</h3>
    <p>Un fichier .zip à garder <b>ailleurs que dans le dossier Librejo</b> (clé USB, autre disque, espace sécurisé de la structure).</p>
    <div class="db-cards bk-cards">
      <label class="db-card bk-opt"><input type="radio" name="bk" value="0" checked><b>⚙️ Réglages seulement</b><span>Liste des documents, catégories, formulaires, annuaire, réglages, logo, journal.</span><small>Petit fichier. À faire souvent.</small></label>
      <label class="db-card bk-opt"><input type="radio" name="bk" value="1"><b>📦 Tout, documents compris</b><span id="bk-size">Calcul de la taille…</span><small>Si le NAS n’est pas déjà sauvegardé.</small></label></div>
    ${DATA.sauvegarde?`<p class="hint">Dernière sauvegarde : le ${frDate(DATA.sauvegarde)}.</p>`:'<p class="hint">Aucune sauvegarde faite depuis Librejo pour l’instant.</p>'}
    <div class="ocr-bar" id="bk-bar" hidden><i></i></div><p class="hint" id="bk-st"></p>
    <div class="row between mt"><button type="button" class="secondary" id="bk-rest">♻️ Restaurer une sauvegarde…<input type="file" accept=".zip" id="bk-file" hidden></button><span class="row gap-s"><button type="button" class="ghost" data-close>Fermer</button><button type="button" class="primary" id="bk-go">Télécharger la sauvegarde</button></span></div>`);
  dossierSize().then(({s,n})=>{ const el=$('#bk-size'); if(el) el.textContent=`Les mêmes, plus ${n} fichier${n>1?'s':''} de documents (${sizeTxt(s)||'0 Ko'}).`; });
  $('#bk-go').onclick=async()=>{ const all=$('input[name=bk]:checked').value==='1', bt=$('#bk-go'); bt.disabled=true; $('#bk-bar').hidden=false;
    try{ const {blob,n}=await backupZip(all,(i,rel)=>{ const st=$('#bk-st'); if(st) st.textContent=`${i} fichiers… ${rel}`; });
      downloadBlob(blob,`Sauvegarde-Librejo_${fileSafe(structure.nom||'structure')}_${today()}${all?'_complete':''}.zip`);
      DATA.sauvegarde=today(); await run(saveData); jlog('Sauvegarde','',`${all?'complète':'réglages'} · ${n} fichiers · ${sizeTxt(blob.size)}`);
      const st=$('#bk-st'); if(st) st.textContent=`✅ Sauvegarde prête (${n} fichiers, ${sizeTxt(blob.size)}) : rangez-la en lieu sûr.`; }
    catch(e){ const st=$('#bk-st'); if(st) st.textContent='Sauvegarde impossible : '+(fsErr(e)||e.message); }
    bt.disabled=false; const bar=$('#bk-bar'); if(bar) bar.hidden=true; };
  $('#bk-rest').onclick=e=>{ if(e.target.id!=='bk-file') $('#bk-file').click(); };
  $('#bk-file').onchange=e=>{ const f=e.target.files[0]; if(f) restoreBackup(f); };
}
async function restoreBackup(file){
  let zip; try{ await needLib('jszip'); zip=await JSZip.loadAsync(file); }catch(e){ toast('Ce fichier n’est pas une sauvegarde lisible.'); return; }
  const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir&&/^(app|Documents)\//.test(n)&&!n.split('/').includes('..'));
  if(!names.includes('app/donnees.js')&&!names.includes('app/parametres.js')){ toast('Ce zip ne ressemble pas à une sauvegarde Librejo.'); return; }
  const info=zip.file('LIBREJO-SAUVEGARDE.txt')?await zip.file('LIBREJO-SAUVEGARDE.txt').async('string'):'';
  const nd=names.filter(n=>n.startsWith('Documents/')).length;
  askConfirm('Restaurer cette sauvegarde ?',`${esc(info.split('\n').slice(0,2).join(' · ')||file.name)}<br><br>Les réglages, la liste des documents, les formulaires et l’annuaire actuels seront remplacés${nd?`, et ${nd} documents remis en place`:''}.<br><br>🔒 Avant cela, Librejo copie l’état actuel dans <code>app/_sauvegardes</code> : on peut revenir en arrière.`,'Restaurer',async()=>{
    const ok=await run(async()=>{ const stamp=new Date().toISOString().slice(0,16).replace(/[:T]/g,'-');
      const root=await getDir('readwrite'); const app=await root.getDirectoryHandle('app');
      for await (const [n,h] of app.entries()){ if(h.kind==='file') await writeRel(`app/_sauvegardes/avant-restauration-${stamp}/${n}`,await h.getFile()); }
      for(const n of names){ if(n.startsWith('app/lib/')) continue; await writeRel(n,await zip.file(n).async('blob')); } },'Sauvegarde restaurée : Librejo va se recharger');
    if(ok){ await jlog('Restauration','sauvegarde',file.name); setTimeout(()=>location.reload(),1200); } });
}
/* ---------- Préparer l'évaluation HAS : chaque document relié aux critères qu'il prouve ---------- */
/* Intitulés : texte exact pour les critères impératifs, résumé pour les autres (référentiel HAS 2022, manuel mis à jour en juillet 2025). */
const HAS_URL='https://www.has-sante.fr/jcms/p_3323069/fr/mettre-en-oeuvre-l-evaluation-des-essms';
const HAS_CH={1:'Chapitre 1 · La personne',2:'Chapitre 2 · Les professionnels',3:'Chapitre 3 · L’établissement ou le service'};
const HAS_CRIT=[
 ['1.2.1','Les rôles des professionnels sont présentés à la personne (résumé)',0,'Livret d’accueil, organigramme ou trombinoscope'],
 ['1.2.2','La personne est informée de ses droits et devoirs dans la vie collective (résumé)',0,'Règlement de fonctionnement'],
 ['1.2.3','La personne est systématiquement informée de la possibilité de désigner une personne de confiance (résumé)',0,'Notice et formulaire de désignation de la personne de confiance'],
 ['1.2.4','La personne a accès aux informations sur son accompagnement (résumé)',0,'Procédure d’accès au dossier'],
 ['1.2.6','Les professionnels informent la personne de ses droits (résumé)',0,'Livret d’accueil, charte des droits et libertés'],
 ['1.3.1','Les règles de vie sont expliquées, avec des outils pour les comprendre (résumé)',0,'Règlement de fonctionnement, version FALC ou illustrée'],
 ['1.7.4','Le consentement de la personne est recherché et tracé (résumé)',0,'Formulaire d’accord, de consentement ou de partage d’informations'],
 ['1.10.2','Le projet personnalisé est co-construit avec la personne (résumé)',0,'Trame de projet personnalisé ou DIPC'],
 ['1.10.6','Le projet personnalisé est tracé et réévalué (résumé)',0,'Trame de projet personnalisé, procédure de réévaluation'],
 ['2.2.1','Les professionnels soutiennent la liberté d’aller et venir de la personne accompagnée.',1,'Annexe au contrat de séjour (établissements)'],
 ['2.2.2','Les professionnels respectent la dignité et l’intégrité de la personne accompagnée.',1,'Charte des droits et libertés, charte de bientraitance'],
 ['2.2.3','Les professionnels respectent la vie privée et l’intimité de la personne accompagnée.',1,'Règlement de fonctionnement, procédures d’hygiène et de soins'],
 ['2.2.4','Les professionnels respectent la liberté d’opinion, les croyances et la vie spirituelle de la personne accompagnée.',1,'Charte des droits et libertés, règlement de fonctionnement'],
 ['2.2.5','Les professionnels respectent le droit à l’image de la personne accompagnée.',1,'Autorisation de droit à l’image propre à la structure'],
 ['2.2.6','L’ESSMS favorise l’exercice des droits et libertés de la personne accompagnée.',1,'Livret d’accueil, information sur les droits civiques'],
 ['2.2.7','L’ESSMS garantit la confidentialité et la protection des informations et données relatives à la personne accompagnée.',1,'Politique de confidentialité, registre RGPD, charte informatique'],
 ['2.9.1','Coordination avec les partenaires du territoire (résumé)',0,'Conventions de partenariat, annuaire des partenaires'],
 ['2.10.1','Les professionnels partagent les informations nécessaires à l’accompagnement (résumé)',0,'Procédure de transmissions, fiche de liaison'],
 ['2.10.2','Règles de sécurité des données, des dossiers et des accès (résumé)',0,'Charte informatique, procédure d’accès aux dossiers'],
 ['3.1.2','Outils au service de la stratégie de bientraitance (résumé)',0,'Charte ou projet de bientraitance'],
 ['3.6.2','Les professionnels respectent la sécurisation du circuit du médicament.',1,'Procédure du circuit du médicament (médico-social)'],
 ['3.8.2','Accueil et intégration des nouveaux professionnels (résumé)',0,'Livret d’accueil du salarié, kit du nouvel arrivant'],
 ['3.8.6','Les professionnels sont formés aux bonnes pratiques et aux procédures (résumé)',0,'Classeur des procédures, plan de formation'],
 ['3.10.1','Politique qualité et gestion des risques (résumé)',0,'Politique qualité, plan d’amélioration continue'],
 ['3.11.1','L’ESSMS définit, avec les professionnels, un plan de prévention et de gestion des risques de maltraitance et de violence.',1,'Plan de prévention de la maltraitance'],
 ['3.11.2','L’ESSMS traite les signalements de faits de maltraitance et de violence, et met en place des actions correctives.',1,'Procédure et fiche de signalement'],
 ['3.11.3','Les professionnels sont formés au repérage de la maltraitance (résumé)',0,'Plan de formation, supports de sensibilisation'],
 ['3.12.1','L’ESSMS organise le recueil et le traitement des plaintes et des réclamations.',1,'Procédure plaintes et réclamations, formulaire de réclamation'],
 ['3.12.2','L’ESSMS communique sur le traitement des plaintes et des réclamations aux parties prenantes.',1,'Bilan annuel des réclamations, compte rendu du CVS'],
 ['3.12.3','Les professionnels analysent en équipe les plaintes et les réclamations et mettent en place des actions correctives.',1,'Comptes rendus d’analyse, plan d’actions'],
 ['3.13.1','L’ESSMS organise le recueil et le traitement des évènements indésirables.',1,'Procédure et fiche d’événement indésirable'],
 ['3.13.2','L’ESSMS communique sur le traitement des évènements indésirables auprès des parties prenantes.',1,'Bilan des événements indésirables'],
 ['3.13.3','Les professionnels déclarent et analysent en équipe les évènements indésirables et mettent en place des actions correctives.',1,'Comptes rendus d’analyse (CREX), plan d’actions'],
 ['3.14.1','L’ESSMS définit, avec les professionnels, un plan de gestion de crise et de continuité de l’activité, régulièrement actualisé.',1,'Plan de gestion de crise et de continuité'],
 ['3.14.2','L’ESSMS communique son plan de gestion de crise en interne et en externe.',1,'Mail ou note de diffusion du plan, liste des destinataires'],
].map(([id,txt,imp,att])=>({id,txt,imp:!!imp,att,ch:+id[0]}));
const hasOf=it=>Array.isArray(it.has)?it.has:[];
/* Relecture : date de prochaine relecture d'un document */
const addMonths=(iso,m)=>{ const d=new Date((iso||today())+'T12:00:00'); d.setMonth(d.getMonth()+(+m||0)); return d.toISOString().slice(0,10); };
function relState(d){ if(!d||!d.relire) return null; const n=(new Date(d.relire+'T12:00:00')-Date.now())/864e5; return n<0?'late':n<=30?'soon':'ok'; }
function relBadge(d){ const s=relState(d); if(!s||s==='ok') return ''; return `<span class="badge ${s==='late'?'rel-late':'rel-soon'}" title="Prochaine relecture : ${frDate(d.relire)}">⏰ ${s==='late'?'À relire':'À relire bientôt'}</span>`; }
const REL_OPTS=[[0,'Pas de rappel'],[6,'Tous les 6 mois'],[12,'Tous les ans'],[24,'Tous les 2 ans'],[36,'Tous les 3 ans'],[60,'Tous les 5 ans']];
function relAfterChange(d){ if(+d.relireMois){ d.relu=today(); d.relire=addMonths(today(),d.relireMois); } }
let hasFilt='tous';
function hasProofs(c){ return [...DATA.documents.filter(d=>hasOf(d).includes(c.id)).map(d=>({k:'d',it:d})),...DATA.formulaires.filter(f=>hasOf(f).includes(c.id)).map(f=>({k:'f',it:f}))]; }
function hasStatus(c){ const P=hasProofs(c); if(!P.length) return 'none'; if(P.some(p=>p.k==='d'&&relState(p.it)==='late')) return 'late'; return 'ok'; }
async function hasPrep(){
  const all=HAS_CRIT, st=Object.fromEntries(all.map(c=>[c.id,hasStatus(c)]));
  const ok=all.filter(c=>st[c.id]==='ok').length, imp=all.filter(c=>c.imp), impOk=imp.filter(c=>st[c.id]==='ok').length;
  const L=all.filter(c=>hasFilt==='tous'||(hasFilt==='imp'&&c.imp)||(hasFilt==='none'&&st[c.id]==='none')||(hasFilt==='late'&&st[c.id]==='late'));
  const pick=[...DATA.documents.filter(d=>!isLink(d)||true).map(d=>[`d:${d.id}`,`📄 ${d.titre}`]),...DATA.formulaires.map(f=>[`f:${f.id}`,`🧩 ${f.titre}`])].sort((a,b)=>a[1].localeCompare(b[1],'fr'));
  const tpl=c=>MODELES.filter(m=>[...(m.has||[]),...(m.hasTpl||[])].includes(c.id)&&!modeleAdded(m));
  const pill={ok:'<span class="hp ok">✅ Preuve à jour</span>',late:'<span class="hp late">⏰ Preuve à relire</span>',none:'<span class="hp none">❌ Aucune preuve</span>'};
  let lastCh=0;
  const body=L.map(c=>{ const P=hasProofs(c), h=c.ch!==lastCh?`<h4 class="hs-ch">${HAS_CH[c.ch]}</h4>`:''; lastCh=c.ch;
    return h+`<div class="hs-c ${st[c.id]}" data-crit="${c.id}"><div class="hs-top"><b class="hs-n">${c.id}</b>${c.imp?'<span class="hp imp">Impératif</span>':''}${pill[st[c.id]]}</div>
      <p class="hs-t">${esc(c.txt)}</p><p class="hint">Preuves habituelles : ${esc(c.att)}</p>
      ${P.length?`<ul class="hs-p">${P.map(p=>`<li>${p.k==='d'?'📄':'🧩'} ${esc(p.it.titre)}${p.k==='d'?` <small>v${esc(p.it.version||'1')}${p.it.relire?' · à relire le '+frDate(p.it.relire):' · pas de date de relecture'}</small>${relBadge(p.it)}`:' <small>formulaire</small>'}<button type="button" class="ghost sm" data-hunl="${p.k}:${esc(p.it.id)}" aria-label="Retirer cette preuve">×</button></li>`).join('')}</ul>`:''}
      <div class="hs-act"><select class="in sm" data-hlink aria-label="Relier un document au critère ${c.id}"><option value="">＋ Relier un document ou un formulaire…</option>${pick.filter(([k])=>!P.some(p=>`${p.k}:${p.it.id}`===k)).map(([k,t])=>`<option value="${esc(k)}">${esc(t)}</option>`).join('')}</select>
        ${tpl(c).map(m=>`<button type="button" class="secondary sm" data-htpl="${esc(m.id)}">${esc(m.emoji||'🧩')} Créer depuis le modèle « ${esc(m.titre.replace(/^Trame : /,''))} »</button>`).join('')}</div></div>`; }).join('');
  openModal(`<h3 id="modal-title">🏅 Préparer l’évaluation HAS</h3>
    <p class="hint">Reliez chaque document aux critères du référentiel qu’il prouve. Librejo montre ce qui existe, ce qui est à relire et ce qui manque. Les critères applicables dépendent de votre catégorie FINESS ; les intitulés des critères non impératifs sont résumés : <a href="${HAS_URL}" target="_blank" rel="noopener">référentiel et manuel sur le site de la HAS</a>.</p>
    <div class="hs-kpi"><div><b>${ok}/${all.length}</b><span>critères avec une preuve à jour</span><i style="width:${Math.round(ok/all.length*100)}%"></i></div><div class="imp"><b>${impOk}/${imp.length}</b><span>critères impératifs prouvés</span><i style="width:${Math.round(impOk/imp.length*100)}%"></i></div></div>
    <div class="hs-bar"><div class="choice" role="group" aria-label="Afficher">${[['tous','Tous'],['imp','Impératifs'],['none','❌ Sans preuve'],['late','⏰ À relire']].map(([k,l])=>`<button type="button" class="chip" data-hf="${k}" aria-pressed="${hasFilt===k}">${l}</button>`).join('')}</div>
      <span class="row gap-s"><button type="button" class="secondary" id="hs-csv">Dossier de preuves (tableur)</button><button type="button" class="secondary" id="hs-zip">Documents de preuve (zip)</button></span></div>
    <div id="hs-root"><div class="hs-list">${body||'<p class="hint">Rien à afficher avec ce filtre.</p>'}</div>
    </div><div class="row end mt"><button type="button" class="ghost" data-close>Fermer</button></div>`,'wide hsdlg');
  const box=$('#modal-box'), keepScroll=()=>{ const y=box.scrollTop; return ()=>{ const b=$('#modal-box'); if(b) b.scrollTop=y; }; };
  const save=async(it,ids,msg,crit)=>{ const before=it.has; it.has=ids; if(await run(saveData)){ jlog('Preuve HAS',it.titre,msg+' '+crit); const back=keepScroll(); await hasPrep(); back(); } else it.has=before; };
  const root=box; root.onchange=null;
  box.querySelector('.hs-list').addEventListener('change',async e=>{ const s=e.target.closest('[data-hlink]'); if(!s||!s.value) return; const crit=s.closest('[data-crit]').dataset.crit, [k,id]=s.value.split(':');
    const it=k==='d'?docById(id):DATA.formulaires.find(f=>f.id===id); if(it) save(it,[...new Set([...hasOf(it),crit])],'reliée au critère',crit); });
  box.querySelector('.hs-bar').addEventListener('click',e=>{ const f=e.target.closest('[data-hf]'); if(f){ hasFilt=f.dataset.hf; hasPrep(); } });
  box.querySelector('.hs-list').addEventListener('click',async e=>{
    const f=null; if(f){ hasFilt=f.dataset.hf; hasPrep(); return; }
    const u=e.target.closest('[data-hunl]'); if(u){ const crit=u.closest('[data-crit]').dataset.crit, [k,id]=u.dataset.hunl.split(':'); const it=k==='d'?docById(id):DATA.formulaires.find(x=>x.id===id); if(it) save(it,hasOf(it).filter(x=>x!==crit),'retirée du critère',crit); return; }
    const t=e.target.closest('[data-htpl]'); if(t){ const back=keepScroll(); await addModele(t.dataset.htpl); await hasPrep(); back(); const m=MODELES.find(x=>x.id===t.dataset.htpl); toast(m&&m.has?'Modèle ajouté et relié au critère':'Trame ajoutée aux formulaires : remplissez-la, puis reliez ici le document obtenu'); return; }
  });
  $('#hs-csv').onclick=()=>{ const c=v=>`"${String(v??'').replace(/"/g,'""')}"`, L=[['Critère','Impératif','Intitulé','État','Preuve','Type','Version','Date du document','Prochaine relecture','Emplacement'].map(c).join(';')];
    HAS_CRIT.forEach(cr=>{ const P=hasProofs(cr), s={ok:'Preuve à jour',late:'À relire',none:'Aucune preuve'}[hasStatus(cr)];
      if(!P.length) L.push([cr.id,cr.imp?'oui':'',cr.txt,s,'','','','','',''].map(c).join(';'));
      P.forEach(p=>L.push([cr.id,cr.imp?'oui':'',cr.txt,s,p.it.titre,p.k==='d'?'Document':'Formulaire',p.k==='d'?p.it.version||'1':'',p.k==='d'?docDate(p.it.date):'',p.it.relire?frDate(p.it.relire):'',p.k==='d'?(p.it.chemin||p.it.url||''):'Librejo › Formulaires'].map(c).join(';'))); });
    downloadBlob(new Blob(['﻿'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}),`Dossier-de-preuves-HAS_${fileSafe(structure.nom||'structure')}_${today()}.csv`); toast('Dossier de preuves téléchargé'); jlog('Preuve HAS','','dossier de preuves exporté'); };
  $('#hs-zip').onclick=async()=>{ const D=DATA.documents.filter(d=>!isLink(d)&&hasOf(d).length); if(!D.length){ toast('Aucun document relié pour l’instant.'); return; }
    await needLib('jszip'); const z=new JSZip(); for(const d of D){ try{ const f=await readRel(d.chemin); hasOf(d).forEach(cr=>z.file(`${cr} - ${(HAS_CRIT.find(x=>x.id===cr)||{}).imp?'imperatif - ':''}${fileSafe(d.titre)}/${d.fichier}`,f)); }catch(e){} }
    downloadBlob(await z.generateAsync({type:'blob'}),`Preuves-HAS_${fileSafe(structure.nom||'structure')}_${today()}.zip`); toast('Documents de preuve téléchargés'); };
}

/* Réglage du nommage : aperçu en direct et enregistrement */
function nmRead(){ return {fichier:($('#nm-file')||{}).value||NOM_DEF.fichier,sep:($('#nm-sep')||{}).value||'-',dossier:($('#nm-dir')||{}).value||NOM_DEF.dossier,sortie:($('#nm-out')||{}).value||'sans'}; }
function nmPreview(){ const el=$('#nm-prev'); if(!el) return; const n=nmRead(), c=(cats()[0]||{});
  const ex=[['Livret d’accueil',2,c.id],['Protocole douleur',1,c.id]];
  el.innerHTML=`<b>Aperçu</b><ul>${ex.map(([t,v,cat])=>`<li><code>${esc(applyNom(n.fichier,{titre:t,v,date:month(),cat},n.sep))}.pdf</code></li>`).join('')}<li>📁 <code>${esc(String(n.dossier).replace('{NN}','03').replace('{Nom}','Santé et soins').replace('{NOM}','SANTÉ ET SOINS').replace('{nom}','santé et soins'))}</code></li></ul>`
    +(/\{(Titre|titre|TITRE)\}/.test(n.fichier)?'':'<p class="pickmsg">⚠️ La règle doit contenir le titre ({Titre}, {titre} ou {TITRE}).</p>')
    +(/\{version\}/.test(n.fichier)?'':'<p class="hint">Sans {version}, deux versions d’un même document se distinguent seulement par -2, -3…</p>'); }
document.addEventListener('input',e=>{ if(e.target.closest&&e.target.closest('#nm-file,#nm-sep,#nm-dir')){ if(e.target.id==='nm-file'){ const s=$('#nm-preset'); if(s) s.value=NOM_PRESETS.some(([v])=>v===e.target.value)?e.target.value:'__perso'; } nmPreview(); } });
document.addEventListener('change',e=>{ if(e.target.id==='nm-preset'&&e.target.value!=='__perso'){ $('#nm-file').value=e.target.value; nmPreview(); } });
document.addEventListener('change',e=>{ if(e.target.id==='nm-out'){ const w=$('#nm-out-warn'); if(w) w.hidden=e.target.value!=='initiales'; } });
new MutationObserver(()=>{ const el=$('#nm-prev'); if(el&&!el.dataset.on){ el.dataset.on='1'; nmPreview(); } }).observe(document.body,{childList:true,subtree:true});

/* Renommer les fichiers déjà rangés selon la règle enregistrée (aperçu, puis confirmation) */
function renPlan(){ return DATA.documents.filter(d=>!isLink(d)&&d.chemin&&d.fichier).map(d=>{ const ext=(extOf(d.fichier)||d.ext||'').toLowerCase(), nouveau=`${fileCode(d.titre,d.version||1,String(d.date||month()).slice(0,7),d.categorie)}.${ext}`; return {d,ancien:d.fichier,nouveau}; }).filter(x=>x.ancien!==x.nouveau); }
document.addEventListener('click',async e=>{ if(!e.target.closest||!e.target.closest('#nm-ren')) return;
  const n=nmRead(), cur=NOMMAGE(); if(n.fichier!==cur.fichier||n.sep!==cur.sep){ toast('Enregistrez d’abord les réglages : le renommage suit la règle enregistrée.'); return; }
  const L=renPlan(); if(!L.length){ toast('Tous les fichiers suivent déjà la règle.'); return; }
  openModal(`<h3 id="modal-title">Renommer ${L.length} fichier${L.length>1?'s':''}</h3>
    <p>Les fichiers restent à leur place, seul leur nom change. Les anciennes versions archivées gardent leur nom. Pensez à prévenir l’équipe si des raccourcis ou des liens pointent vers ces fichiers.</p>
    <div class="ren-list">${L.map(x=>`<div><code class="old">${esc(x.ancien)}</code><span aria-hidden="true">→</span><code>${esc(x.nouveau)}</code></div>`).join('')}</div>
    <div class="ocr-bar" id="ren-bar" hidden><i></i></div>
    <div class="btns"><button class="primary" id="ren-go">Renommer</button><button class="secondary" data-close>Annuler</button></div>`,'wide');
  $('#ren-go').onclick=async()=>{ const b=$('#ren-go'); b.disabled=true; $('#ren-bar').hidden=false; let k=0;
    const ok=await run(async()=>{ for(const x of L){ const dir=x.d.chemin.split('/').slice(0,-1).join('/'), base=x.nouveau.replace(/\.[^.]+$/,''), ext=extOf(x.nouveau);
        const rel=await uniqueRel(dir,base,ext); await moveRel(x.d.chemin,rel); x.d.chemin=rel; x.d.fichier=rel.split('/').pop(); k++;
        const bar=$('#ren-bar'); if(bar) bar.firstElementChild.style.width=Math.round(k/L.length*100)+'%'; await saveData(); } },`${L.length} fichier${L.length>1?'s':''} renommé${L.length>1?'s':''}`);
    if(k) jlog('Renommage','',`${k} fichier(s) renommé(s) selon la règle ${NOMMAGE().fichier}`); if(ok){ closeModal(); renderDocs(); } else { b.disabled=false; } };
});

/* ---------- Favoris personnels : propres à chaque poste (navigateur), aucun enregistrement dans le dossier ---------- */
const FAV_KEY='librejo-favoris';
function favRead(){ try{ const a=JSON.parse(localStorage.getItem(FAV_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
const isFav=k=>favRead().includes(k);
function favBtn(k){ const on=isFav(k); return `<button type="button" class="favbtn${on?' on':''}" data-fav="${esc(k)}" aria-pressed="${on}" aria-label="${on?'Retirer de mes favoris':'Ajouter à mes favoris'}" title="${on?'Retirer de mes favoris':'Ajouter à mes favoris'}">${on?'★':'☆'}</button>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-fav]'); if(!b) return; e.preventDefault(); e.stopPropagation();
  const k=b.dataset.fav, a=favRead(), i=a.indexOf(k); if(i>=0) a.splice(i,1); else a.unshift(k);
  try{ localStorage.setItem(FAV_KEY,JSON.stringify(a.slice(0,60))); }catch(_){ }
  toast(i>=0?'Retiré de vos favoris':'Ajouté à vos favoris (sur ce poste)'); renderDocs(); },true);
function renderFavs(){
  const F=formItems(), L=favRead().map(k=>{ const [t,id]=[k.slice(0,1),k.slice(2)]; const it=t==='d'?docs().find(d=>d.id===id):F.find(f=>f.id===id); return it?{k,t,it}:null; }).filter(Boolean);
  if(!L.length) return '';
  return `<h2 class="lab">⭐ Mes favoris <small class="hint">(sur ce poste)</small></h2><div class="cards narrow">${L.map(({k,t,it})=>t==='f'
    ?`<div class="fcard tile"><span class="tile-emoji" aria-hidden="true">${esc(formEmoji(it))}</span><b>${esc(it.titre)}${favBtn(k)}</b><span>Formulaire</span><div class="row gap-s push"><button class="lbtn" data-fill="${esc(it.id)}">${ICON.pen}Remplir</button></div></div>`
    :`<div class="fcard tile"><b><a href="${isLink(it)?esc(it.url):hrefOf(it.chemin)}" target="_blank" rel="noopener">${esc(it.titre)}</a>${favBtn(k)}</b><span>${esc(catName(it.categorie))}</span><div class="row gap-s push">${!isLink(it)&&printable(it)?`<button class="lbtn" data-print="${esc(it.chemin)}">${ICON.print}Imprimer</button>`:''}${!isLink(it)?`<button class="lbtn" data-send="${esc(it.chemin)}">${ICON.mail}Envoyer</button>`:''}</div></div>`).join('')}</div>`;
}
/* ---------- Inventaire (admin) : tous les documents, liens et formulaires, avec version et dates ---------- */
function invRows(){
  const fd=d=>d?(/^\d{4}-\d{2}-\d{2}$/.test(d)?frDate(d):/^\d{4}-\d{2}$/.test(d)?d.slice(5)+'/'+d.slice(0,4):d):'';
  const ko=n=>n?(n>1048576?(n/1048576).toFixed(1).replace('.',',')+' Mo':Math.max(1,Math.round(n/1024))+' Ko'):'';
  const R=[], off=new Set(formsOff());
  DATA.documents.forEach(d=>{ const lien=d.ext==='lien';
    R.push({type:lien?'Lien':d.cerfa?'Cerfa (PDF à cases)':'Document',titre:d.titre||d.fichier,categorie:catName(d.categorie),sous:d.sous||'',version:lien?'':(d.version||''),
      date:fd(d.date),ajoute:fd(d.ajoute),modifie:fd(d.modifie),format:lien?'lien':(d.ext||'').toUpperCase(),taille:lien?'':ko(d.taille),
      emplacement:lien?(d.url||''):(d.chemin||''),archives:(d.historique||[]).length||'',epingle:d.epingle?'oui':'',equipe:'oui',
      cerfa:d.cerfa?(d.cerfa.numero||'?'):'',cerfaVerif:d.cerfa&&d.cerfa.verifie?fd(d.cerfa.verifie):'',modele:d.modele_src||'',motscles:(d.motscles||[]).join(', ')}); });
  DATA.formulaires.forEach(f=>R.push({type:'Formulaire',titre:f.titre,categorie:catName(f.categorie),sous:'',version:f.version||'',date:'',ajoute:fd(f.ajoute||''),modifie:fd(f.maj||f.modifie||''),
    format:'formulaire',taille:'',emplacement:`${(f.champs||[]).length} champ(s)`,archives:'',epingle:'',equipe:'oui',cerfa:'',cerfaVerif:'',modele:f.modele_src||'',motscles:(f.motscles||[]).join(', ')}));
  BUILTIN_FORMS.forEach(f=>R.push({type:'Formulaire intégré',titre:f.titre,categorie:'',sous:'',version:'',date:'',ajoute:'',modifie:'',format:'formulaire',taille:'',emplacement:'intégré à Librejo',
    archives:'',epingle:'',equipe:off.has(f.id)?'masqué':'oui',cerfa:'',cerfaVerif:'',modele:'',motscles:''}));
  const ord={'Document':0,'Cerfa (PDF à cases)':1,'Lien':2,'Formulaire':3,'Formulaire intégré':4};
  return R.sort((a,b)=>(ord[a.type]-ord[b.type])||a.categorie.localeCompare(b.categorie,'fr')||a.titre.localeCompare(b.titre,'fr'));
}
const INV_COLS=[['type','Type'],['titre','Titre'],['categorie','Catégorie'],['sous','Sous-dossier'],['version','Version'],['date','Date du document'],['ajoute','Ajouté le'],['modifie','Modifié le'],
  ['format','Format'],['taille','Taille'],['emplacement','Fichier, lien ou contenu'],['archives','Versions archivées'],['epingle','Épinglé'],['equipe','Proposé à l’équipe'],['cerfa','N° Cerfa'],['cerfaVerif','Cerfa vérifié le'],['modele','Modèle d’origine'],['motscles','Mots-clés']];
function inventaire(){
  const R=invRows(), c=t=>R.filter(r=>r.type===t).length, pl=(k,a,b)=>`${k} ${k>1?b:a}`, nm=R.filter(r=>r.equipe==='masqué').length;
  openModal(`<h3 id="modal-title">Inventaire de votre Librejo</h3>
    <p class="m-0">${pl(c('Document'),'document','documents')}, ${c('Cerfa (PDF à cases)')} Cerfa, ${pl(c('Lien'),'lien','liens')}, ${pl(c('Formulaire'),'formulaire créé','formulaires créés')}, ${pl(c('Formulaire intégré'),'formulaire intégré','formulaires intégrés')}${nm?` (dont ${pl(nm,'masqué','masqués')})`:''}.</p>
    <p class="hint">Avec, pour chacun : catégorie, version, dates, format, taille, emplacement, versions archivées, n° et date de vérification des Cerfa. Utile pour un audit, une évaluation, ou pour faire relire les documents par la direction.</p>
    <div class="inv-choix"><button class="dv-act" id="inv-xls">${ICON.dl}Tableur (Excel)<small>Toutes les colonnes, à trier et filtrer</small></button>
      <button class="dv-act" id="inv-pdf">${ICON.file}PDF à imprimer<small>Liste lisible, par type et catégorie</small></button></div>
    <div class="btns"><button class="secondary" data-close>Fermer</button></div>`);
  const base=`Inventaire-Librejo_${fileSafe(structure.nom||'structure')}_${today()}`;
  $('#inv-xls').onclick=()=>{ const H=INV_COLS.map(c=>c[1]).join(';'), L=R.map(r=>INV_COLS.map(([k])=>anCell(r[k])).join(';'));
    downloadBlob(new Blob(['﻿'+[H,...L].join('\r\n')],{type:'text/csv;charset=utf-8'}),base+'.csv'); toast('Inventaire téléchargé'); };
  $('#inv-pdf').onclick=async()=>{ try{ await pdfReady(); }catch(e){ return; } downloadBlob(invPdf(R),base+'.pdf'); toast('Inventaire téléchargé'); };
}
function invPdf(R){
  const {jsPDF}=window.jspdf, doc=new jsPDF({unit:'mm',format:'a4',orientation:'landscape'}), F=PF(), NAVY=pdfRGB('--navy'), INK=[30,36,48], MUTED=[93,103,121];
  const cols=[['titre','Titre',86],['categorie','Catégorie',40],['version','Version',16],['date','Date',22],['ajoute','Ajouté le',22],['modifie','Modifié le',22],['format','Format',20],['extra','Précisions',39]];
  let y=0, page=0;
  const head=()=>{ page++; doc.setFont(F,'bold'); doc.setFontSize(14); doc.setTextColor(...NAVY); doc.text('Inventaire des documents et formulaires',14,16);
    doc.setFont(F,'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(`${structure.nom||''} · ${frDate(today())}`,14,22); doc.text(`page ${page}`,283,22,{align:'right'}); y=30; };
  const th=()=>{ let x=14; doc.setFont(F,'bold'); doc.setFontSize(8); doc.setTextColor(...MUTED); cols.forEach(([,t,w])=>{ doc.text(t,x,y); x+=w; }); doc.setDrawColor(200,205,214); doc.setLineWidth(.3); doc.line(14,y+1.5,283,y+1.5); y+=6; };
  head(); let cur='';
  R.forEach(r=>{ const extra=[r.cerfa&&`Cerfa ${r.cerfa}${r.cerfaVerif?' (vérifié le '+r.cerfaVerif+')':''}`,r.archives&&`${r.archives} version(s) archivée(s)`,r.epingle&&'épinglé',r.equipe==='masqué'&&'masqué pour l’équipe',r.taille].filter(Boolean).join(' · ');
    const cells=cols.map(([k,,w])=>{ doc.setFont(F,k==='titre'?'bold':'normal'); doc.setFontSize(8.5); return doc.splitTextToSize(String(k==='extra'?extra:r[k]||''),w-3); });
    const h=Math.max(...cells.map(c=>c.length))*3.8+2.2;
    if(r.type!==cur||y+h>196){ if(y+h+12>196){ doc.addPage(); head(); } if(r.type!==cur){ cur=r.type; doc.setFont(F,'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text(({'Document':'Documents','Cerfa (PDF à cases)':'Cerfa pré-remplis','Lien':'Liens','Formulaire':'Formulaires créés','Formulaire intégré':'Formulaires intégrés'})[cur]||cur,14,y+2); y+=7; } th(); }
    let x=14; cols.forEach(([k,,w],i)=>{ doc.setFont(F,k==='titre'?'bold':'normal'); doc.setFontSize(8.5); doc.setTextColor(...(k==='titre'?INK:MUTED)); doc.text(cells[i],x,y); x+=w; });
    y+=h; doc.setDrawColor(232,235,240); doc.setLineWidth(.2); doc.line(14,y-2.6,283,y-2.6); });
  return new File([doc.output('blob')],'inventaire.pdf',{type:'application/pdf'});
}


/* ======================================================================
   ÉQUIPE : liste de professionnels gérée par l'admin (Réglages › Équipe).
   Les formulaires peuvent proposer de choisir une ou plusieurs personnes et ce qui
   apparaît sur le document (fonction, téléphone, mail, n° professionnel).
   ====================================================================== */
const equipe=()=>(PAR.equipe||[]).filter(p=>p&&p.nom);
const EQ_INFOS=[['fonction','Fonction'],['tel','Téléphone'],['mail','Mail'],['numero','N° professionnel']];
function eqText(st){ return (st.ids||[]).map(id=>equipe().find(p=>p.id===id)).filter(Boolean).map(p=>[p.nom,st.infos.includes('fonction')&&p.fonction,st.infos.includes('tel')&&p.tel&&('tél. '+p.tel),st.infos.includes('mail')&&p.mail,st.infos.includes('numero')&&p.numero].filter(Boolean).join(', ')).join(' ; '); }
function eqField(c,B){ const L=equipe(), k='_eq'+c.id; const st=FV[k]||(FV[k]={ids:[],infos:(c.infos||['fonction','tel']).slice()});
  if(!L.length) return `<input class="in${B}" data-f="${c.id}" value="${esc(FV[c.id]||'')}" placeholder="Nom, fonction"><small class="hint">L’admin peut enregistrer l’équipe dans Réglages › Équipe : on la choisira ici d’un clic.</small>`;
  return `<div class="eqpick${B}"><div class="choice" role="group" aria-label="${esc(c.label)}">${L.map(p=>`<button type="button" class="chip" data-eqc="${c.id}" data-id="${esc(p.id)}" aria-pressed="${st.ids.includes(p.id)}">${esc(p.nom)}${p.fonction?` <small>${esc(p.fonction)}</small>`:''}</button>`).join('')}</div>
    <div class="eqinfos"><span class="hint">Faire apparaître :</span>${EQ_INFOS.map(([i,l])=>`<label class="check"><input type="checkbox" data-eqi="${c.id}" data-k="${i}" ${st.infos.includes(i)?'checked':''}> ${l}</label>`).join('')}</div>
    ${FV[c.id]?`<p class="eqout">Sur le document : <b>${esc(FV[c.id])}</b></p>`:''}</div>`; }
/* Signataire des formulaires intégrés : choisir dans l'équipe remplit le nom et la fonction */
function eqChips(forKey,telKey){ const L=equipe(); if(!L.length) return '';
  return `<div class="eqquick wide"><span class="hint">Choisir dans l’équipe${forKey?' (personne à contacter)':''} :</span>${L.map(p=>`<button type="button" class="chip" data-eqsign="${esc(p.id)}"${forKey?` data-eqfor="${forKey}" data-eqtel="${telKey||''}"`:''}>${esc(p.nom)}</button>`).join('')}</div>`; }
document.addEventListener('click',e=>{ const b=e.target.closest('[data-eqsign]'); if(!b) return; const p=equipe().find(x=>x.id===b.dataset.eqsign), panel=b.closest('section.panel,.card,main'); if(!p||!panel) return;
  const put=(key,v)=>{ const el=[...panel.querySelectorAll('input,textarea')].find(i=>Object.values(i.dataset).includes(key)); if(el){ el.value=v; el.dispatchEvent(new Event('input',{bubbles:true})); } };
  if(b.dataset.eqfor){ put(b.dataset.eqfor,[p.nom,p.fonction].filter(Boolean).join(', ')); if(b.dataset.eqtel&&p.tel) put(b.dataset.eqtel,p.tel); return; }
  put('signNom',p.nom); put('signFonction',p.fonction||''); });

/* ======================================================================
   19. FORMULAIRES RANGÉS EN TROIS RUBRIQUES : médical, social, mixte.
   Les formulaires créés par l'admin choisissent leur rubrique dans l'éditeur.
   ====================================================================== */
const FORM_GROUPS=[['mixte','Médico-social','🧩'],['med','Médical','🩺'],['social','Social','🤝']];
const BUILTIN_CARDS=[ // [id, rubrique, titre de la carte, sous-titre]
  ['__cl','med','Certificat libre','« Je soussigné(e), Dr X, certifie que… »'],
  ['__cmi','med','Certificat médical initial','Personne majeure victime de violences, avec photos datées'],
  ['__att','med','Attestation de suivi','Obligation de soins, injonction thérapeutique, SPIP, employeur'],
  ['__urg','med','Orientation aux urgences','Courrier pour l’équipe des urgences : motif, constantes, traitements, contact dans la structure'],
  ['__mt','med','Courrier au médecin traitant','Information de suivi, compte rendu, demande d’avis, fin de suivi'],
  ['__relais','med','Demande de relais','Adresser un patient à un CSAPA ou un médecin pour le relais du TSO'],
  ['__deliv','med','Délivrance exceptionnelle','Attestation de délivrance de TSO pour le CSAPA de suivi'],
  ['__ccas','social','Bon d’orientation CCAS','Domiciliation, aide alimentaire ou financière, droits, accompagnement, hébergement'],
  ['__el','mixte','En-tête libre','Page à l’en-tête de la structure, texte entièrement libre (seule la date est fixe)'],
  ['__cp','mixte','Courrier à un partenaire','Lettre à l’en-tête de la structure : partenaire, service, administration'],
];
const formGroup=f=>{ const b=BUILTIN_CARDS.find(x=>x[0]===f.id); if(b&&f.id==='__urg'&&!meds().length) return 'mixte'; // sans médecin : rangés avec le médico-social
  return b?b[1]:(FORM_GROUPS.some(g=>g[0]===f.groupe)?f.groupe:'mixte'); };
function formsByGroupHTML(){ // une liste déroulante par rubrique (même présentation que l'accueil)
  return `<div class="homecol">${FORM_GROUPS.map(([g,nom,emo])=>{
    const l=formItems().filter(f=>formGroup(f)===g&&!f.sd);
    if(g==='med'&&!l.length&&!meds().length&&!isAdmin) return '';
    if(g==='med'&&!l.length&&!meds().length) return homeSec('fg:'+g,emo,nom,'masqués : aucun médecin enregistré',`<li class="hempty">Les formulaires médicaux ne sont proposés que si des médecins sont enregistrés (Réglages › Équipe), ou si vous les activez un par un dans Administration › Formulaires et modèles.</li>`);
    const body=l.length?l.map(homeFormRow).join(''):`<li class="hempty">Aucun formulaire pour l’instant.${isAdmin?' Créez-en un avec « Créer un formulaire » et choisissez la rubrique « '+esc(nom)+' ».':''}</li>`;
    return homeSec('fg:'+g,emo,nom,l.length?`${l.length} formulaire${l.length>1?'s':''}`:'aucun formulaire pour l’instant',body,g==='mixte'?' main':'');
  }).join('')}</div>`;
}

/* ======================================================================
   20. IMPRIMER AUSSI LES DOCUMENTS WORD, ET TOUT EN UNE SEULE IMPRESSION
   Les PDF sont dessinés page par page (pdf.js), les documents Word sont mis
   en page par docx-preview (app/lib, licence Apache 2.0) : tout part dans une
   seule fenêtre d'impression, pages à l'italienne comprises.
   ====================================================================== */
let docxLibReady=null;
function getDocxLib(){ if(!docxLibReady) docxLibReady=needLib('jszip').then(()=>loadScript('app/lib/docx-preview.min.js')).then(()=>window.docx) /* docx-preview a besoin de JSZip */.catch(e=>{ docxLibReady=null; throw e; }); return docxLibReady; }
const PRINT_EXT=['pdf','png','jpg','jpeg','webp','docx'];
const PACK_CSS=`@page{size:A4 portrait;margin:0}@page land{size:A4 landscape;margin:0}
html,body{margin:0;padding:0;background:#fff}
.pg{width:210mm;height:296mm;display:flex;align-items:center;justify-content:center;overflow:hidden;break-after:page;page-break-after:always}
.pg.land{page:land;width:297mm;height:209mm}
.pg img{max-width:100%;max-height:100%;display:block}
section.docx{margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always;box-sizing:border-box!important;height:auto!important;min-height:0!important;max-width:100%}
section.docx.land{page:land}
.docx-wrapper{background:#fff!important;padding:0!important;display:block!important}
section.docx table{break-inside:avoid;page-break-inside:avoid}section.docx tr{break-inside:avoid;page-break-inside:avoid}
@media screen{body{background:#888}.pg,section.docx{background:#fff;margin:8px auto!important}}`;
/* Pages d'un PDF ou d'une image, en images de bonne définition (environ 150 points par pouce) */
async function pagesOf(file,ext){
  if(ext==='pdf'){
    const lib=await getPdfjs();
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
    const out=[];
    try{ for(let i=1;i<=pdf.numPages;i++){ const page=await pdf.getPage(i), vp=page.getViewport({scale:150/72});
      const c=document.createElement('canvas'); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
      const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height);
      await page.render({canvasContext:x,viewport:vp}).promise;
      out.push({src:c.toDataURL('image/jpeg',0.92),land:c.width>c.height}); c.width=c.height=0; } }
    finally{ pdf.destroy(); }
    return out;
  }
  const bmp=await createImageBitmap(file), c=document.createElement('canvas'); c.width=bmp.width; c.height=bmp.height; c.getContext('2d').drawImage(bmp,0,0);
  return [{src:c.toDataURL('image/jpeg',0.92),land:bmp.width>bmp.height}];
}
/* Prépare le document d'impression (iframe cachée) ; renvoie l'iframe prête */
async function buildPack(parts){
  const old=document.getElementById('print-pack'); old&&old.remove();
  const fr=document.createElement('iframe'); fr.id='print-pack'; fr.setAttribute('aria-hidden','true'); fr.tabIndex=-1;
  fr.style.cssText='position:fixed;left:-12000px;top:0;width:1200px;height:900px;border:0';
  document.body.appendChild(fr);
  const d=fr.contentDocument; d.open(); d.write(`<!doctype html><html><head><meta charset="utf-8"><title>Impression Librejo</title><style>${PACK_CSS}</style></head><body></body></html>`); d.close();
  for(const {file,ext,n,titre} of parts){
    if(!n) continue;
    if(ext==='docx'){
      const lib=await getDocxLib(), holder=d.createElement('div'), st=d.createElement('div');
      try{ await lib.renderAsync(file,holder,st,{className:'docx',inWrapper:false,breakPages:true,ignoreLastRenderedPageBreak:false,renderHeaders:true,renderFooters:true,useBase64URL:true}); }
      catch(e){ throw new Error(`« ${titre} » : mise en page Word impossible (${e.message||e})`); }
      [...st.childNodes].forEach(x=>d.head.appendChild(x));
      const secs=[...holder.querySelectorAll('section.docx')];
      secs.forEach(sc=>{ const w=parseFloat(sc.style.width)||0, h=parseFloat(sc.style.minHeight||sc.style.height)||0; if(w>h&&h) sc.classList.add('land'); });
      // une feuille Word prévue pour une page peut déborder un peu une fois mise en page par le navigateur
      // (polices, hauteurs de ligne) : on la réduit légèrement pour qu'elle tienne sur sa page
      secs.forEach(sc=>d.body.appendChild(sc));
      const PX=96/25.4;
      secs.forEach(sc=>{ const land=sc.classList.contains('land'), pw=(land?297:210)*PX, ph=(land?209:296)*PX;
        const w=sc.scrollWidth, h=sc.scrollHeight, r=Math.min(pw/w,ph/h);
        if(r<1&&r>=0.6){ sc.style.zoom=String(Math.floor(r*1000)/1000); sc.style.height=(ph/r)+'px'; sc.style.overflow='hidden'; } });
      for(let k=1;k<n;k++) secs.forEach(sc=>d.body.appendChild(sc.cloneNode(true)));
    }else{
      const pages=await pagesOf(file,ext);
      for(let k=0;k<n;k++) pages.forEach(pg=>{ const div=d.createElement('div'); div.className='pg'+(pg.land?' land':''); const im=d.createElement('img'); im.src=pg.src; div.appendChild(im); d.body.appendChild(div); });
    }
  }
  await Promise.all([...d.images].map(im=>im.complete?0:new Promise(r=>{ im.onload=im.onerror=r; })));
  try{ await d.fonts.ready; }catch(e){}
  return fr;
}
async function printPack(parts){
  toast('Préparation de l’impression…');
  const fr=await buildPack(parts);
  setTimeout(()=>{ try{ fr.contentWindow.focus(); fr.contentWindow.print(); }catch(e){ toast('Impression impossible : '+(e.message||e)); } },300);
}
/* Un seul document (bouton Imprimer d'une ligne) : les documents Word passent aussi */
async function printDocAny(d){
  let file;
  try{ file=await readRel(d.chemin); }
  catch(e){ if(e instanceof Cancel) return; if(e&&e.message==='nofsa'){ window.open(hrefOf(d.chemin),'_blank'); toast('Document ouvert : Ctrl+P pour imprimer'); return; } const m=fsErr(e); m&&toast(m); return; }
  if(d.ext==='docx'){ try{ await printPack([{file,ext:'docx',n:1,titre:d.titre}]); }catch(e){ console.error(e); toast(e.message||'Impression impossible'); } return; }
  printBlob(new Blob([file],{type:MIME[d.ext]||file.type}),d.ext==='pdf');
}

/* ======================================================================
   21. BON D'ORIENTATION CCAS (volet social). Rien n'est enregistré.
   ====================================================================== */
const CCAS_MOTIFS=['Domiciliation (élection de domicile)','Aide alimentaire','Aide financière, secours','Ouverture ou renouvellement de droits (CSS, AME, RSA…)','Accompagnement social','Hébergement, mise à l’abri','Démarches administratives (papiers, identité)'];
const CCAS_SITU=['Sans domicile','Hébergé(e) chez un tiers','Hébergement d’urgence','Logement personnel'];
const CCAS_PIECES=['Pièce d’identité','Titre de séjour ou récépissé','Attestation de domiciliation','Attestation de droits (CPAM)','Justificatif de ressources'];
let CC={}, ccErr=false, ccRecip=null;
function ccReset(){ CC={dest:'CCAS de Marseille',attention:'',date:today(),civ:'',nom:'',prenom:'',ddn:'',tel:'',situ:'',domic:'',motifs:[],autre:'',precisions:'',pieces:[],contact:'',ctel:urTel(),signNom:'',signFonction:''}; ccErr=false; }
ccReset();
function ccValidate(){
  const e=[];
  if(!CC.dest.trim()) e.push(['dest','Service destinataire manquant.']);
  if(!CC.date) e.push(['date','Date manquante.']);
  if(!CC.civ) e.push(['civ','Civilité manquante.']);
  if(!CC.nom.trim()) e.push(['nom','Nom manquant.']);
  if(!CC.prenom.trim()) e.push(['prenom','Prénom manquant.']);
  if(CC.ddn.trim()&&!parseDDN(CC.ddn.trim())) e.push(['ddn','Date de naissance au format JJ/MM/AAAA.']);
  if(!CC.motifs.length&&!CC.autre.trim()) e.push(['motifs','Cochez au moins un motif d’orientation (ou écrivez-le dans « Autre »).']);
  if(!CC.contact.trim()) e.push(['contact','Personne à contacter dans la structure manquante.']);
  if(!CC.signNom.trim()) e.push(['signNom','Nom de la personne qui signe manquant.']);
  return e;
}
function renderCcas(){
  const p=$('#p-ccas'); if(!p) return;
  const errs=ccErr?ccValidate():[], bad=new Set(errs.map(x=>x[0])), B=k=>bad.has(k)?` bad" data-errk="${esc(k)}`:'';
  const txt=(k,ph='',extra='')=>`<input class="in${B(k)}" data-ck="${k}" value="${esc(CC[k])}" placeholder="${esc(ph)}" autocomplete="off" ${extra}>`;
  const chips=(k,list,multi)=>`<div class="choice${B(k)}">${list.map(v=>`<button type="button" class="chip" data-ckc="${k}" data-v="${esc(v)}" aria-pressed="${multi?CC[k].includes(v):CC[k]===v}">${esc(v)}</button>`).join('')}</div>`;
  const ccas=ANNU.partenaires.filter(x=>/ccas|action sociale/.test(norm(x.nom+' '+x.type)));
  p.innerHTML=`<button class="backlink" data-ckback>${svg('<path d="m15 6-6 6 6 6"/>')}Tous les formulaires</button>
    <h2 class="sec"><span class="temoji" aria-hidden="true">🏛️</span>Bon d’orientation CCAS</h2>
    <p class="hint">Bon remis à la personne (ou envoyé) pour son accueil au CCAS : qui elle est, pourquoi on l’oriente, et qui contacter dans la structure. Ne demandez que ce qui sert à la démarche.</p>
    <div class="privacy"><span class="pemo" aria-hidden="true">🔒</span><span>Rien n'est enregistré. Le formulaire s'efface à la fin, ou si vous fermez la page.</span></div>
    <div class="card top w-form"><h3>Destinataire</h3>
      <div class="fieldgrid">
        <label class="field partpick"><span>CCAS ou antenne <small>(choisir dans l'annuaire ou écrire)</small></span><input class="in${B('dest')}" data-ck="dest" list="cc-list" value="${esc(CC.dest)}" autocomplete="off">
          <datalist id="cc-list">${ccas.map(x=>`<option value="${esc(x.nom)}">${esc(x.type)}</option>`).join('')}</datalist></label>
        <label class="field"><span>À l'attention de <small>(facultatif)</small></span>${txt('attention','ex. service domiciliation')}</label>
        <label class="field"><span>Date</span><input class="in${B('date')}" type="date" data-ck="date" value="${esc(CC.date)}"></label>
      </div></div>
    <div class="card top w-form"><h3>Personne orientée</h3>
      <div class="fieldgrid">
        <div class="field"><span>Civilité</span><div class="seg${B('civ')}">${['M.','Mme'].map(c=>`<button type="button" data-ckc="civ" data-v="${c}" aria-pressed="${CC.civ===c}">${c}</button>`).join('')}</div></div>
        <label class="field"><span>Date de naissance <small>(facultatif)</small></span>${txt('ddn','JJ/MM/AAAA','inputmode="numeric" maxlength="10"')}</label>
        <label class="field"><span>Nom</span>${txt('nom')}</label>
        <label class="field"><span>Prénom</span>${txt('prenom')}</label>
        <label class="field"><span>Téléphone de la personne <small>(facultatif)</small></span>${txt('tel','','inputmode="tel"')}</label>
      </div>
      <div class="field"><span>Situation de logement <small>(facultatif)</small></span>${chips('situ',CCAS_SITU,false)}</div>
      <label class="field"><span>Domiciliation actuelle <small>(facultatif : où, ou « aucune »)</small></span>${txt('domic','ex. aucune, ou CCAS de Marseille')}</label>
    </div>
    <div class="card top w-form"><h3>Motif de l’orientation</h3>
      <div class="field"><span>Pour quoi l’orientez-vous ? <small>(plusieurs choix possibles)</small></span>${chips('motifs',CCAS_MOTIFS,true)}</div>
      <label class="field"><span>Autre motif <small>(facultatif)</small></span>${txt('autre')}</label>
      <label class="field"><span>Précisions utiles <small>(facultatif)</small></span><textarea class="in" data-ck="precisions" rows="3" placeholder="ex. sortie d’hospitalisation récente, ne parle pas français (langue : …), accompagnée par…">${esc(CC.precisions)}</textarea></label>
      <div class="field"><span>Pièces dont dispose la personne <small>(facultatif)</small></span>${chips('pieces',CCAS_PIECES,true)}</div>
    </div>
    <div class="card top w-form"><h3>Contact et signature</h3>
      <div class="fieldgrid">
        ${eqChips('contact','ctel')}
        <label class="field"><span>Personne à contacter dans la structure</span>${txt('contact','ex. Julie, travailleuse sociale')}</label>
        <label class="field"><span>Téléphone</span>${txt('ctel','','inputmode="tel"')}</label>
        ${eqChips()}
        <label class="field"><span>Signé par</span>${txt('signNom','Prénom Nom')}</label>
        <label class="field"><span>Fonction</span>${txt('signFonction','ex. Travailleuse sociale')}</label>
      </div></div>
    <div class="card top blue w-form"><h3>Envoi</h3>
      <div class="field"><span>Envoyer à <small>(facultatif : le plus souvent, le bon est imprimé et remis à la personne)</small></span>${recipHTML('cc-rc')}${senderHTML()}</div></div>
    ${errs.length?`<ul class="errors w-form">${errs.map(x=>`<li data-errk="${esc(x[0])}">${esc(x[1])}</li>`).join('')}</ul>`:''}
    <div class="stickyfoot w-form"><button class="primary big" data-ckgo>${ICON.file}Créer le bon (PDF)</button></div>
    <div class="row end w-form"><button class="ghost danger" data-ckclear>${ICON.trash}Tout effacer</button></div>`;
  const prev=ccRecip?ccRecip.get():[]; ccRecip=bindRecip(p.querySelector('#cc-rc'),prev);
}
function ccBind(){
  const p=$('#p-ccas'); if(!p) return;
  p.addEventListener('input',e=>{ const t=e.target; if(!t.dataset.ck) return; let v=t.value;
    if(t.dataset.ck==='ddn'){ v=dateMask(v); if(v!==t.value) t.value=v; }
    CC[t.dataset.ck]=v; if(ccErr) t.classList.remove('bad'); });
  p.addEventListener('change',e=>{ const t=e.target;
    if(t.dataset.ck==='dest'){ const x=ANNU.partenaires.find(z=>z.nom===t.value.trim()); if(x&&ccRecip) x.emails.forEach(m=>ccRecip.add(m)); } });
  p.addEventListener('click',e=>{ const t=e.target;
    if(t.closest('[data-ckback]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); return; }
    const c=t.closest('[data-ckc]'); if(c){ const k=c.dataset.ckc, v=c.dataset.v;
      if(Array.isArray(CC[k])) CC[k]=CC[k].includes(v)?CC[k].filter(x=>x!==v):CC[k].concat(v);
      else CC[k]=(k==='situ'&&CC[k]===v)?'':v;
      renderCcas(); return; }
    if(t.closest('[data-ckclear]')){ askConfirm('Tout effacer ?','Le formulaire sera vidé.','Tout effacer',()=>{ ccReset(); ccRecip=null; renderCcas(); }); return; }
    if(t.closest('[data-ckgo]')) ccPdf();
  });
}
function ccPdf(){
  const errs=LIVE_DRY?[]:(ccErr=true,ccValidate());
  if(missingStop(errs,'#p-ccas',renderCcas,ccPdf,()=>CC)) return;
  const st=structure, fem=CC.civ==='Mme', e_=fem?'e':'', who=fmtCivNom(CC.civ,CC.nom,CC.prenom);
  const P=letterPdf('Bon d’orientation','Centre communal d’action sociale');
  P.y=64; P.right([CC.dest.trim(),CC.attention.trim()?'À l’attention de '+CC.attention.trim():''],{bold:true,after:2});
  P.right([`${villeLe(st)}${frDate(CC.date||today())}`],{after:5});
  P.para('Madame, Monsieur,',{after:3});
  P.para(`Nous orientons vers vos services ${who}${CC.ddn.trim()?`, né${e_} le ${CC.ddn.trim()}`:''}, rencontré${e_} par notre équipe${CC.tel.trim()?` (téléphone : ${CC.tel.trim()})`:''}.`);
  const sec=(t,lines)=>{ lines=lines.filter(Boolean); if(!lines.length) return; P.room(12+lines.length*5); P.para(t,{bold:true,after:.5,color:P.C.NAVY}); lines.forEach(l=>P.para(l,{after:1})); P.y+=2; };
  sec('Motif de l’orientation',[...CC.motifs,CC.autre.trim()].filter(Boolean).map(m=>'– '+m));
  sec('Situation',[CC.situ?'Logement : '+CC.situ.toLowerCase():'',CC.domic.trim()?'Domiciliation : '+CC.domic.trim():'']);
  sec('Précisions',[CC.precisions.trim().replace(/\s*\n\s*/g,' ; ')]);
  sec('Pièces en sa possession',[CC.pieces.join(', ')]);
  P.room(20);
  P.para(`Pour tout renseignement, vous pouvez joindre ${CC.contact.trim()}${CC.ctel.trim()?`, au ${CC.ctel.trim()}`:''}.`);
  P.para('Nous vous remercions de l’accueil que vous lui réserverez.',{after:6});
  P.sign(CC.signNom.trim(),[CC.signFonction.trim(),st.nom]);
  const file=P.finish(outName('Bon-orientation-CCAS',CC.nom,CC.prenom,CC.date||today()));
  readyModal({file,title:'Bon d’orientation prêt',steps:['Imprimez-le, signez-le et remettez-le à la personne pour son passage au CCAS.','Ou envoyez-le par mail au service.'],
    mail:{to:ccRecip?ccRecip.get():[],subject:`${st.nom} – Bon d’orientation`,body:`Madame, Monsieur,\n\nVeuillez trouver ci-joint un bon d’orientation vers vos services.\n\nCordialement,\n${CC.signNom.trim()}`},
    onDone:()=>{ ccReset(); ccRecip=null; renderCcas(); }});
}
ccBind();

/* ======================================================================
   22. « LES PLUS UTILISÉS » SE MET À JOUR TOUT SEUL, DÉLIVRANCE SANS
   BLOCAGE (alerte de ce qui manque), DR VERMERSCH DANS LES DESTINATAIRES.
   ====================================================================== */
/* Compteur d'utilisation, propre à chaque poste (navigateur) : seulement l'identifiant du
   document ou du formulaire et le nombre d'ouvertures. Aucune donnée de patient. */
const USE_KEY='docubus-usage', USE_MAX=8;
function useRead(){ try{ const o=JSON.parse(localStorage.getItem(USE_KEY)||'{}'); return o&&typeof o==='object'?o:{}; }catch(e){ return {}; } }
function useBump(k){
  if(!k) return; const o=useRead(), u=o[k]||{n:0,t:0}; u.n++; u.t=Date.now(); o[k]=u;
  const ks=Object.keys(o); if(ks.length>150) ks.sort((a,b)=>o[a].t-o[b].t).slice(0,ks.length-150).forEach(x=>delete o[x]);
  try{ localStorage.setItem(USE_KEY,JSON.stringify(o)); }catch(e){}
}
/* Classement : nombre d'utilisations, qui compte moitié moins après un mois sans servir */
function useRank(){ const o=useRead(), now=Date.now(); return Object.keys(o).map(k=>({k,s:(o[k].n||0)*Math.pow(.5,(now-(o[k].t||0))/(30*864e5))})).sort((a,b)=>b.s-a.s).map(x=>x.k); }
/* L'ordre est figé pour la journée : un usage ne fait pas sauter les vignettes sous la main.
   Ce qui sert pour la première fois aujourd'hui se range à la suite. */
const USE_ORDER='docubus-usage-ordre';
function useTop(){ let st=null; try{ st=JSON.parse(localStorage.getItem(USE_ORDER)||'null'); }catch(e){}
  const rank=useRank();
  if(!st||st.jour!==today()||!Array.isArray(st.ordre)){ st={jour:today(),ordre:rank}; try{ localStorage.setItem(USE_ORDER,JSON.stringify(st)); }catch(e){} return rank; }
  const known=new Set(st.ordre), fresh=rank.filter(k=>!known.has(k));
  if(fresh.length){ st.ordre=st.ordre.concat(fresh); try{ localStorage.setItem(USE_ORDER,JSON.stringify(st)); }catch(e){} } // gardent ensuite leur place
  return st.ordre.filter(k=>rank.includes(k)); }
document.addEventListener('click',e=>{
  const t=e.target; if(!t||!t.closest) return; let el;
  if((el=t.closest('[data-fill]'))) return useBump('f:'+el.dataset.fill);
  if((el=t.closest('[data-fillword]'))) return useBump('d:'+el.dataset.fillword);
  if((el=t.closest('[data-lsend]'))) return useBump('d:'+el.dataset.lsend);
  if((el=t.closest('[data-kprint],[data-ksend]'))) return useBump('k:'+(el.dataset.kprint||el.dataset.ksend));
  if((el=t.closest('[data-print],[data-send]'))){ const c=el.dataset.print||el.dataset.send, d=DATA.documents.find(x=>x.chemin===c); if(d) useBump('d:'+d.id); return; }
  if((el=t.closest('a[href]'))){ const h=el.getAttribute('href'); const d=DATA.documents.find(x=>isLink(x)?x.url===h:hrefOf(x.chemin)===h); if(d) useBump('d:'+d.id); }
},true);
/* Épinglés par l'admin d'abord, puis complétés par ce qui sert le plus sur ce poste */
function pinnedAndUsed(){
  const all=formItems(), fs=all.filter(f=>DATA.formsEpingles.includes(f.id)), ks=DATA.kits.filter(k=>k.epingle), ds=docs().filter(d=>d.epingle);
  // d'abord les épinglés, toujours à la même place ; puis ce qui sert le plus sur ce poste
  const order=[...fs.map(x=>['f',x]),...ks.map(x=>['k',x]),...ds.map(x=>['d',x])];
  const room=Math.max(4,USE_MAX-order.length); let n=0;
  for(const k of useTop()){
    if(n>=room) break; const i=k.indexOf(':'), ty=k.slice(0,i), id=k.slice(i+1);
    const [list,src]=ty==='f'?[fs,all]:ty==='k'?[ks,DATA.kits]:ty==='d'?[ds,docs()]:[null,[]];
    const x=src.find(y=>y.id===id); if(list&&x&&!list.includes(x)){ list.push(x); order.push([ty,x]); n++; }
  }
  return {fs,ks,ds,order};
}

/* Délivrance : ce qui manque n'empêche plus de créer les PDF. Une fenêtre le liste :
   on revient compléter, ou on continue (les cases vides sont laissées en pointillés, à remplir à la main). */
function delivMissing(errs,go,keys){
  /* chaque message est un bouton qui ferme la fenêtre et mène au champ, comme la liste « À corriger » des autres formulaires */
  openModal(`<h3 id="modal-title">Il manque des informations</h3>
    <ul class="errors dm-list" aria-label="À corriger">${errs.map((x,i)=>`<li>${keys&&keys[i]?`<button type="button" class="errgo" data-dmgo="${esc(keys[i])}">${esc(x)}</button>`:esc(x)}</li>`).join('')}</ul>
    <p class="hint">Si vous continuez, les cases vides sont laissées en pointillés sur le PDF, à compléter à la main.</p>
    <div class="btns"><button class="primary" id="dm-back" data-autofocus>Revenir compléter</button><button class="secondary" id="dm-go">Continuer quand même</button></div>`);
  $('#dm-back').onclick=()=>{ closeModal(); const el=$('#p-deliv .bad'); if(el){ el.scrollIntoView({behavior:smooth(),block:'center'}); const f=el.matches('input,textarea,select')?el:el.querySelector('input,button'); f&&f.focus({preventScroll:true}); } };
  $('#dm-go').onclick=()=>{ closeModal(); go(); };
  $('#modal-box').querySelectorAll('[data-dmgo]').forEach(b=>b.onclick=()=>{ const k=b.dataset.dmgo; closeModal();
    const el=$('#p-deliv').querySelector(`[data-errk="${CSS.escape(k)}"]:not(li)`); if(!el) return;
    const f=el.matches('input,select,textarea')?el:el.querySelector('input:not([type=hidden]),select,textarea,button:not(:disabled)')||el;
    f.scrollIntoView({block:'center'}); f.focus({preventScroll:true}); });
}

/* Aucune case n'est bloquante (tous les formulaires) : ce qui manque est listé, on revient compléter
   ou on continue. Les cases texte vides passent en pointillés le temps de fabriquer le PDF, puis sont rendues vides. */
function missingStop(errs,sel,render,again,state){
  if(!errs.length) return false;
  if(MISS_OK) return false;
  render(); errsShow(sel);
  const L=errs.map(x=>Array.isArray(x)?{k:x[0],m:x[1]}:typeof x==='string'?{k:'',m:x}:{k:x.k,m:x.m});
  openModal(`<h3 id="modal-title">Il manque des informations</h3>
    <ul class="errors dm-list" aria-label="À corriger">${L.map(x=>`<li>${x.k?`<button type="button" class="errgo" data-msgo="${esc(x.k)}">${esc(x.m)}</button>`:esc(x.m)}</li>`).join('')}</ul>
    <p class="hint">Si vous continuez, les cases vides sont laissées en pointillés sur le PDF, à compléter à la main.</p>
    <div class="btns"><button class="primary" id="ms-back" data-autofocus>Revenir compléter</button><button class="secondary" id="ms-go">Continuer quand même</button></div>`);
  const focusK=k=>{ const panel=$(sel); const el=panel&&(k?panel.querySelector(`[data-errk="${CSS.escape(k)}"]:not(li)`):panel.querySelector('.bad')); if(!el) return;
    const f=(el.matches('input,select,textarea')?el:el.querySelector('input:not([type=hidden]),select,textarea,button:not(:disabled)'))||el;
    f.scrollIntoView({block:'center'}); f.focus({preventScroll:true}); };
  $('#ms-back').onclick=()=>{ closeModal(); focusK(L[0]&&L[0].k); };
  $('#modal-box').querySelectorAll('[data-msgo]').forEach(b=>b.onclick=()=>{ const k=b.dataset.msgo; closeModal(); focusK(k); });
  $('#ms-go').onclick=async()=>{ closeModal();
    const o=state&&state(), filled=[];
    if(o) L.forEach(x=>{ if(x.k&&typeof o[x.k]==='string'&&!o[x.k].trim()){ o[x.k]=BLANK; filled.push(x.k); } });
    MISS_OK=true;
    try{ await again(); }
    finally{ MISS_OK=false; filled.forEach(k=>{ if(o[k]===BLANK) o[k]=''; }); }
  };
  return true;
}

/* Dr Vermersch (cabinet du 24 bd Clemenceau) ajouté aux destinataires de la délivrance,
   relié à sa fiche de l'annuaire. Enregistré dans les réglages au prochain passage en mode admin. */
let parPending=false;
(function(){
  return; // Librejo : ajout propre à BPM désactivé
  const ID='vermersch-2026-11'; DATA.migrations=DATA.migrations||[]; if(DATA.migrations.includes(ID)) return;
  PAR.destinataires=PAR.destinataires||[];
  if(!PAR.destinataires.some(d=>d.partenaire==='dr-vermersch'||/vermersch/i.test(`${d.nom||''} ${d.structure||''}`))){
    PAR.destinataires.push({nom:'Dr Vermersch',structure:'Dr Vermersch (cabinet Clemenceau)',attention:'',adresses:['cabinet24clemenceau@outlook.fr'],partenaire:'dr-vermersch',exclues:[]});
    parPending=true; applyParams();
  }
  DATA.migrations.push(ID); migPending=true;
})();

$('#p-deliv').addEventListener('click',e=>{ if(e.target.closest('[data-back]')){ formView=null; setTab('forms'); window.scrollTo({top:0}); } });

/* Liste « ce qui manque » : juste au-dessus du bouton qui la déclenche, et mise à jour dès qu'un champ
   est corrigé (le formulaire est redessiné sans perdre le champ en cours ni la position). */
const ERR_FORMS={'p-relais':[()=>rlErr,rlValidate,()=>renderRelais()],'p-cmi':[()=>cmErr,cmValidate,()=>renderCmi()],'p-att':[()=>asErr,asValidate,()=>renderAtt()],
  'p-mt':[()=>mtErr,mtValidate,()=>renderMt()],'p-cl':[()=>clErr,clValidate,()=>renderCl()],'p-urg':[()=>urErr,urValidate,()=>renderUrg()],
  'p-cp':[()=>cpErr,cpValidate,()=>renderCp()],'p-el':[()=>elErr,elValidate,()=>renderEl()],'p-ccas':[()=>ccErr,ccValidate,()=>renderCcas()],
  'p-forms':[()=>fShowErr&&!!DATA.formulaires.find(x=>x.id===formView),()=>validateFill(DATA.formulaires.find(x=>x.id===formView)).map(x=>[x.k,x.m]),()=>renderFill()]};
function errsNearButton(){ document.querySelectorAll('main>section.panel ul.errors.w-form').forEach(u=>{ const sf=u.nextElementSibling; if(sf&&sf.classList.contains('stickyfoot')){ u.classList.remove('w-form'); sf.prepend(u); } }); }
/* Erreurs accessibles (pas seulement en couleur) : chaque champ fautif (marqué data-errk avec la classe .bad)
   reçoit aria-invalid et aria-describedby vers son message ; chaque message de la liste devient un bouton
   qui mène au champ. Le formulaire est redessiné à chaque correction : les attributs suivent tout seuls. */
const errCtrl=el=>el.matches('input,select,textarea')?el:null;
function errsA11y(panel){
  const ul=panel.querySelector('ul.errors');
  if(ul){ if(!ul.id) ul.id=panel.id+'-errs'; ul.tabIndex=-1; if(!ul.hasAttribute('aria-label')) ul.setAttribute('aria-label','À corriger');
    [...ul.children].forEach((li,i)=>{ if(!li.id) li.id=`${panel.id}-err-${i}`; }); }
  panel.querySelectorAll('[data-errk]:not(li)').forEach(el=>{
    const k=el.dataset.errk, lis=ul?[...ul.querySelectorAll(`:scope>li[data-errk="${CSS.escape(k)}"]`)]:[];
    if(!errCtrl(el)){ // groupe de boutons (civilité, motifs…) ou ligne de champs : nommé par l'intitulé du champ
      if(!el.hasAttribute('role')) el.setAttribute('role','group');
      const sp=!el.hasAttribute('aria-label')&&!el.hasAttribute('aria-labelledby')&&el.closest('.field')&&el.closest('.field').querySelector(':scope>span');
      if(sp){ if(!sp.id) sp.id=`${panel.id}-lbl-${k}`; el.setAttribute('aria-labelledby',sp.id); } }
    el.setAttribute('aria-invalid','true');
    if(lis.length){ const ids=lis.map(li=>li.id), cur=(el.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&!/-err-\d+$/.test(x));
      el.setAttribute('aria-describedby',[...cur,...ids].join(' ')); }
  });
  if(ul) ul.querySelectorAll(':scope>li[data-errk]').forEach(li=>{ if(li.querySelector('.errgo')||!panel.querySelector(`[data-errk="${CSS.escape(li.dataset.errk)}"]:not(li)`)) return;
    const b=document.createElement('button'); b.type='button'; b.className='errgo'; b.dataset.errgo=li.dataset.errk; b.append(...li.childNodes); li.append(b); });
}
function errsA11yAll(){ document.querySelectorAll('main>section.panel:not([hidden])').forEach(e=>{ errsA11y(e); reqA11y(e); }); }
/* Champs obligatoires annoncés avant l'envoi (WCAG 3.3.2) : une phrase en tête du formulaire, et aria-required
   sur chaque champ que la validation exige. Pour les formulaires intégrés, Librejo le déduit de leur propre
   validation : un champ est obligatoire si le vider, les autres réponses restant les mêmes, crée une erreur
   (« Dose » ne l'est qu'une fois le traitement choisi). Pour les formulaires de la structure : la case
   « Obligatoire » de l'éditeur. */
const REQ_FORMS={'p-relais':['data-r',()=>RL,v=>{RL=v;},rlValidate],'p-cmi':['data-c',()=>CM,v=>{CM=v;},cmValidate,()=>['med']],
  'p-att':['data-a',()=>AS,v=>{AS=v;},asValidate,()=>medChoice()?[]:['signNom','signFonction']],
  'p-mt':['data-m',()=>MT,v=>{MT=v;},mtValidate,()=>['med']],'p-cl':['data-cl',()=>CL,v=>{CL=v;},clValidate,()=>['med']],
  'p-urg':['data-u',()=>UR,v=>{UR=v;},urValidate,()=>UR.signe==='med'?['med']:[]],'p-cp':['data-c',()=>CP,v=>{CP=v;},cpValidate,()=>CP.signe==='med'?['med']:[]],
  'p-el':['data-e',()=>EL,v=>{EL=v;},elValidate],'p-ccas':['data-ck',()=>CC,v=>{CC=v;},ccValidate]};
const REQ_NOTE='Tous les champs sont obligatoires, sauf ceux marqués « facultatif ».';
const blankOf=v=>typeof v==='string'?'':Array.isArray(v)?[]:typeof v==='boolean'?false:v;
function reqKeys(get,set,val){
  const S=get(), out=new Set();
  for(const k of Object.keys(S)){ if(!(typeof S[k]==='string'||typeof S[k]==='boolean'||Array.isArray(S[k]))) continue;
    set({...S,[k]:blankOf(S[k])}); try{ if(val().some(x=>x[0]===k)) out.add(k); }catch(e){} }
  set(S); return out;
}
function reqA11y(panel){
  let attr=null, keys=null;
  const R=REQ_FORMS[panel.id];
  if(R){ attr=R[0]; keys=reqKeys(R[1],R[2],R[3]); if(R[4]) R[4]().forEach(k=>keys.add(k)); }
  else if(panel.id==='p-deliv'){ attr='data-k'; keys=new Set(['libreNom','libreMail','date','ini','ddn','d','mg']); }
  else if(panel.id==='p-forms'){ const f=formView&&DATA.formulaires.find(x=>x.id===formView); if(f){ attr='data-f'; keys=new Set((f.champs||[]).filter(c=>c.requis).map(c=>c.id)); } }
  if(!attr) return;
  const isReq=el=>el.hasAttribute('data-med')?keys.has('med'):keys.has(el.getAttribute(attr));
  panel.querySelectorAll(`[${attr}],select[data-med]`).forEach(el=>{ if(!el.matches('input,select,textarea')) return;
    const on=isReq(el); if(on!==(el.getAttribute('aria-required')==='true')) on?el.setAttribute('aria-required','true'):el.removeAttribute('aria-required'); });
  /* Un champ que la validation n'exige pas (ou plus, selon les autres réponses) le dit : « (facultatif) » */
  panel.querySelectorAll('.field').forEach(f=>{ const c=[...f.querySelectorAll(`[${attr}],select[data-med]`)].filter(el=>el.matches('input,select,textarea'));
    const sp=f.querySelector(':scope>span'); if(!c.length||!sp||c.some(isReq)) return;
    const sm=sp.querySelector('small:not(.wd)'); if(/facultati/i.test(sp.textContent)||sp.querySelector('.reqopt')) return;
    if(sm&&/^\(/.test(sm.textContent.trim())){ sm.textContent=sm.textContent.trim().replace(/^\(/,'(facultatif, '); sm.classList.add('reqopt'); }
    else{ const n=document.createElement('small'); n.className='reqopt'; n.textContent='(facultatif)'; sp.append(' ',n); } });
  if(!panel.querySelector('.reqnote')){ const pv=panel.querySelector(':scope>.privacy'); if(pv){ const n=document.createElement('p'); n.className='reqnote'; n.textContent=REQ_NOTE; pv.after(n); } }
}
/* Après « Créer » : le focus va sur la liste (lue par le lecteur d'écran), Tab mène au premier champ à corriger */
function errsShow(sel){ const panel=$(sel); if(!panel) return; errsNearButton(); errsA11y(panel);
  const ul=panel.querySelector('ul.errors'); if(!ul) return; ul.scrollIntoView({block:'center'}); ul.focus({preventScroll:true}); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('.errgo'); if(!b) return;
  const panel=b.closest('main>section.panel'), el=panel&&panel.querySelector(`[data-errk="${CSS.escape(b.dataset.errgo)}"]:not(li)`); if(!el) return;
  const f=errCtrl(el)||el.querySelector('input:not([type=hidden]),select,textarea,button:not(:disabled)')||el;
  f.scrollIntoView({block:'center'}); f.focus({preventScroll:true}); });
/* Champ corrigé sans que le formulaire soit redessiné (la classe .bad est retirée à la saisie) : attributs retirés aussi */
document.addEventListener('input',e=>{ const t=e.target; if(!t||!t.dataset||t.dataset.errk===undefined||t.classList.contains('bad')) return;
  t.removeAttribute('aria-invalid'); const d=(t.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&!/-err-\d+$/.test(x));
  d.length?t.setAttribute('aria-describedby',d.join(' ')):t.removeAttribute('aria-describedby'); delete t.dataset.errk; });
new MutationObserver(()=>{ errsNearButton(); errsA11yAll(); }).observe(document.querySelector('main'),{childList:true,subtree:true});
function keepFocus(panel,draw){ const a=document.activeElement; let sel=null, s0=null, s1=null;
  if(a&&panel.contains(a)&&a!==panel){ sel=a.tagName.toLowerCase()+(a.id?'#'+CSS.escape(a.id):'')+Object.entries(a.dataset).filter(([k])=>k!=='errk'&&k!=='errgo').map(([k,v])=>`[data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${CSS.escape(v)}"]`).join('');
    try{ s0=a.selectionStart; s1=a.selectionEnd; }catch(e){} }
  const y=window.scrollY; draw(); window.scrollTo(0,y);
  if(sel){ const b=panel.querySelector(sel); if(b){ b.focus({preventScroll:true}); try{ if(s0!=null) b.setSelectionRange(s0,s1); }catch(e){} } } }
let errT=0;
function errsRefresh(e){ const panel=e.target&&e.target.closest&&e.target.closest('main>section.panel'); if(!panel) return; const F=ERR_FORMS[panel.id]; if(!F||!F[0]()) return;
  clearTimeout(errT); errT=setTimeout(()=>{ const ul=panel.querySelector('ul.errors'); const now=F[1]().map(x=>x[1]).join('|'), shown=ul?[...ul.children].map(li=>li.textContent).join('|'):'';
    if(now!==shown) keepFocus(panel,F[2]); },300); }
document.addEventListener('input',errsRefresh); document.addEventListener('change',errsRefresh);

/* ======================================================================
   FORMULAIRES SEULEMENT (sans dossier)
   Les formulaires intégrés et les modèles de la bibliothèque marchent sans dossier : PDF, impression,
   téléchargement, mail .eml, avec tous les garde-fous habituels. Pas de documents, d'annuaire, de
   réglages ni de mode admin. L'en-tête est saisi ici et gardé dans le navigateur de ce poste.
   ====================================================================== */
const SD_RAISON={api:'Ce navigateur ne sait pas ouvrir le dossier de la structure : il faut Microsoft Edge ou Google Chrome sur ordinateur.',
  refus:'L’accès au dossier de la structure a été refusé sur ce poste (par le navigateur ou par le service informatique).',
  introuvable:'Le dossier de la structure est introuvable depuis ce poste.',
  choix:'Vous travaillez sans le dossier de la structure.'};
const SD_PACK_EMO={droits:'🤝',qualite:'🏅',social:'🧺',liaison:'🔗',handicap:'♿',enfance:'🧸',agees:'🌿',asile:'🏠',addicto:'🩺'};
const SD_KIT='https://github.com/librejoapp/librejo#si-lacc%C3%A8s-aux-dossiers-est-bloqu%C3%A9';
function sdStart(){
  // modèles de la bibliothèque (pas les liens, pas les modèles médicaux : il faudrait les médecins de la structure)
  DATA.formulaires=MODELES.filter(m=>m.formulaire&&m.formulaire.groupe!=='med').map(m=>{ const f=JSON.parse(JSON.stringify(m.formulaire));
    f.id='m-'+m.id; f.categorie=''; f.modele_src=m.id; f.sd=m.pack; f.champs.forEach((c,i)=>{ c.id='c'+i; }); return f; });
  document.body.classList.add('sans-dossier');
  ['docs','semaine','annu','admin'].forEach(t=>{ const b=document.querySelector(`nav.top [data-tab=${t}]`); if(b) b.hidden=true; });
  ['#sidecats','#conn','#adminbtn'].forEach(s=>{ const el=$(s); if(el) el.hidden=true; });
  const nav=document.querySelector('nav.top'), off=document.createElement('div'); off.className='sd-off';
  off.innerHTML=`<p class="sd-off-t">Avec le dossier de la structure</p><ul><li>Accueil et documents</li><li>Impression rapide</li><li>Annuaire</li><li>Accès admin</li></ul>`;
  nav.after(off);
  const bar=document.createElement('div'); bar.id='sdbar'; bar.setAttribute('role','region'); bar.setAttribute('aria-label','Formulaires seulement');
  bar.innerHTML=`${svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>')}<p><b>Formulaires seulement.</b> ${esc(SD_RAISON[SANS.raison]||SD_RAISON.choix)} Les documents, l’annuaire et les réglages de la structure ne sont pas disponibles.</p>
    <div class="sd-acts"><button type="button" class="linkbtn" id="sd-why">Pourquoi ?</button>${SANS.api?'<button type="button" class="secondary sm" id="sd-pick">Choisir le dossier</button>':''}</div>`;
  $('.content').prepend(bar);
  $('#sd-why').onclick=sdWhy;
  const pk=$('#sd-pick'); if(pk) pk.onclick=()=>window.LJ_CHOISIR_DOSSIER&&window.LJ_CHOISIR_DOSSIER();
  const r=document.querySelector('footer .reassure'); if(r) r.lastChild.textContent='Rien n’est enregistré : le formulaire ne va que dans le PDF ou le mail';
  tab='forms';
}
function sdWhy(){
  openModal(`<h3 id="modal-title">Pourquoi « formulaires seulement » ?</h3>
    <p>${esc(SD_RAISON[SANS.raison]||SD_RAISON.choix)}</p>
    <p>Librejo n’a pas de serveur : les documents, l’annuaire et les réglages de la structure sont rangés dans un dossier partagé (NAS, lecteur réseau, OneDrive, Google Drive…), que le navigateur ouvre avec votre accord. Sans ce dossier, seuls les formulaires marchent : PDF, impression, téléchargement et mail, comme d’habitude.</p>
    <p class="hint">${SANS.raison==='api'?'Ouvrez Librejo dans <b>Microsoft Edge</b> ou <b>Google Chrome</b> sur un ordinateur pour retrouver tout le reste.':'Si votre service informatique bloque l’accès aux dossiers dans le navigateur, il peut l’autoriser pour Librejo seulement : aucune donnée n’est envoyée sur Internet.'}</p>
    <p><a href="${SD_KIT}" target="_blank" rel="noopener">Ce qu’il faut demander à l’informatique</a></p>
    <h4 class="mt-s m-0">Vérifications de ce poste</h4><div id="ck-box"></div>
    <div class="btns">${SANS.api?'<button class="primary" id="sdw-pick">Choisir le dossier</button>':''}<button class="secondary" data-close>Fermer</button></div>`,'wide');
  const b=$('#sdw-pick'); if(b) b.onclick=()=>window.LJ_CHOISIR_DOSSIER&&window.LJ_CHOISIR_DOSSIER();
  checksInto($('#ck-box')).catch(e=>console.warn('vérifications',e));
}
function sdEnteteHTML(){ const E=sdEnt(), n=String(E.nom||'').trim();
  return n?`<div class="sd-ent"><span><b>En-tête des documents :</b> ${esc(n)}${E.ville?' · '+esc(E.ville):''} <small>(gardé dans ce navigateur)</small></span><button type="button" class="secondary sm" data-sdent>Modifier</button></div>`
    :`<div class="sd-ent todo"><span><b>Votre structure n’apparaît pas encore sur les documents.</b> Saisissez son nom et son adresse pour l’en-tête des PDF.</span><button type="button" class="primary sm" data-sdent>Saisir l’en-tête</button></div>`; }
function sdPacksHTML(){
  const l=formItems().filter(f=>f.sd); if(!l.length) return '';
  return `<div class="sd-modh"><h3 class="sec">Modèles de la bibliothèque</h3><p class="hint">Des trames prêtes à remplir, à faire relire par votre direction avant usage.</p></div>
    <div class="homecol">${MODELE_PACKS.map(([k,nom])=>{ const ff=l.filter(f=>f.sd===k); return ff.length?homeSec('sd:'+k,SD_PACK_EMO[k]||'📝',nom,`${ff.length} modèle${ff.length>1?'s':''}`,ff.map(homeFormRow).join('')):''; }).join('')}</div>`; }
function sdEntete(){
  const E=sdEnt(), f=(k,l,o='')=>`<label class="field${o.includes('wide')?' wide':''}"><span>${l}</span><input class="in" id="sde-${k}" value="${esc(E[k]||'')}" ${o.replace('wide','')}></label>`;
  openModal(`<h3 id="modal-title">En-tête des documents</h3>
    <p class="hint">Le nom et l’adresse de la structure, en haut et en bas des PDF.</p>
    <div class="fieldgrid">${f('nom','Nom de la structure','wide data-autofocus')}${f('adresse','Adresse','wide')}${f('cp','Code postal','inputmode="numeric"')}${f('ville','Ville')}${f('tel','Téléphone')}${f('mail','Mail de la structure','spellcheck="false"')}</div>
    <div class="privacy"><span class="pemo" aria-hidden="true">💻</span><span>Gardé dans le navigateur de ce poste seulement, puisqu’il n’y a pas de dossier : c’est un réglage de la structure, pas une donnée de personne. N’y mettez rien sur une personne accompagnée.</span></div>
    <div class="btns"><button class="primary" id="sde-ok">Enregistrer sur ce poste</button><button class="secondary" data-close>Annuler</button></div>`);
  $('#sde-ok').onclick=()=>{ const N={}; ['nom','adresse','cp','ville','tel','mail'].forEach(k=>{ N[k]=$('#sde-'+k).value.trim(); });
    if(N.mail&&!MAIL.test(N.mail)){ toast('L’adresse mail de la structure semble incorrecte.'); $('#sde-mail').focus(); return; }
    try{ localStorage.setItem(SD_ENT,JSON.stringify(N)); }catch(e){ toast('Ce navigateur n’a pas pu garder l’en-tête : il servira jusqu’à la fermeture de la page.'); }
    PAR={...PAR,attestation:sdAtt(N)}; applyParams(); applyTheme(PAR.apparence); closeModal(); renderForms(); liveSoon(0); toast('En-tête enregistré sur ce poste'); };
  ['nom','adresse','cp','ville','tel','mail'].forEach(k=>$('#sde-'+k).addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); $('#sde-ok').click(); } }));
}
document.addEventListener('click',e=>{ if(SANS&&e.target.closest('[data-sdent]')) sdEntete(); });

/* Démo en ligne : bandeau permanent en haut de la page (au-dessus du contenu, à côté du menu), avec le mot de passe
   admin, « Remettre à zéro » et « Quitter la démo ». Il fait partie de la page : une fenêtre ouverte le rend inerte. */
function demoStart(){
  document.body.classList.add('demo');
  const bar=document.createElement('div'); bar.id='demobar'; bar.setAttribute('role','region'); bar.setAttribute('aria-label','Démo de Librejo');
  bar.innerHTML=`${svg('<path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3"/><path d="M7.5 15h9"/>')}
    <div class="demo-in"><p class="demo-t"><b>Démo :</b> structure fictive « Association des Tilleuls ». N’y mettez aucune donnée réelle. Tout reste dans ce navigateur.</p>
    <div class="demo-acts"><p class="demo-pw">Mot de passe admin : <kbd>test</kbd></p><button type="button" class="secondary" id="demo-reset">Remettre à zéro</button><button type="button" class="secondary" id="demo-quit">Quitter la démo</button><a class="linkbtn" href="${esc(DEMO.installer)}">Installer Librejo pour votre structure</a></div></div>`;
  $('.app').prepend(bar);
  $('#demo-reset').onclick=()=>askConfirm('Remettre la démo à zéro ?','Vos essais dans la démo (documents ajoutés, réglages, formulaires créés, préférences) sont effacés de ce navigateur, et la démo recommence avec la structure fictive d’origine. Librejo sur ce poste n’est pas touché.','Remettre à zéro',()=>{ if(isAdmin&&regDirty()) regReset(); toast('Remise à zéro de la démo…'); DEMO.reset(); });
  $('#demo-quit').onclick=()=>{ const out=()=>DEMO.quit(); if(isAdmin&&regDirty()) regAsk(()=>{ regReset(); out(); }); else out(); };
  const r=document.querySelector('footer .reassure'); if(r) r.lastChild.textContent='Démo : tout reste dans ce navigateur';
}

/* ======================================================================
   VÉRIFICATIONS DU POSTE
   Navigateur, application installée, autorisation (lecture et écriture, avec un fichier d'essai créé
   puis supprimé), dossier synchronisé dans le cloud, chemin réseau (version fichier). Chaque ligne dit
   ce qui a été vu et quoi faire. Le résultat se copie pour l'informatique, sans aucune donnée de personne.
   Lancées après le choix d'un dossier, dans l'assistant (Bienvenue) et depuis Documents › Outils.
   ====================================================================== */
/* Copies en conflit laissées par les services de synchronisation (OneDrive, Google Drive, Dropbox, Nextcloud…) :
   « parametres-PC-ACCUEIL.js », « parametres (1).js », « donnees (conflicted copy 2026-11-26).js »,
   « annuaire_conflict-20261126-101010.js », « Copie de parametres.js »… */
const CONF_BASES=['parametres','donnees','annuaire','journal','logo-association','recherche-texte'];
function conflictOf(name){ const l=String(name||'').toLowerCase().normalize('NFC');
  const pre=l.replace(/^(copie de |copy of )/,''), prefixed=pre!==l;
  for(const b of CONF_BASES){ if(!pre.startsWith(b)) continue; const m=/^(.*)\.(js|json)$/.exec(pre.slice(b.length)); if(!m) continue;
    const mid=m[1], ext=m[2]; if(!mid&&!prefixed) continue;
    if(prefixed||/^(\s*\(\d+\)|\s*\(.*(conflict|conflit|copie|copy).*\)|\s*\[conflict\].*|-[^.]+|_conflict.*|\s*-\s*(copie|copy).*|\s+(copie|copy).*)$/i.test(mid)) return b+'.'+(b==='journal'||b==='recherche-texte'?'json':ext==='json'?'json':'js'); }
  return null; }
async function conflictsIn(dir){ const out=[]; try{ for await (const [n,e] of dir.entries()){ if(e.kind!=='file') continue; const of=conflictOf(n); if(of) out.push({nom:n,de:of,h:e}); } }catch(e){} return out; }
const CK_CLOUD=/onedrive|sharepoint|teams|google ?drive|mon drive|my drive|drive partag|shared drives?|dropbox|nextcloud|owncloud|icloud|pcloud|sync/i;
const CK_MARK=[/^\.dropbox(\.attr|\.cache)?$/i,/^\.tmp\.drive(down|up)load$/i,/^\.?_?sync_.*\.db$/i,/^\.(owncloud|nextcloud)sync\.log$/i,/^\.sync$/i];
function ckBrowser(){ const ua=navigator.userAgent||'', uad=navigator.userAgentData;
  const mobile=(uad&&uad.mobile)||/Android|iPhone|iPad|Mobile/i.test(ua);
  let nom='', v='';
  const m=(re)=>{ const x=re.exec(ua); return x?x[1]:''; };
  if(/Edg\//.test(ua)){ nom='Microsoft Edge'; v=m(/Edg\/(\d+)/); }
  else if(/OPR\//.test(ua)){ nom='Opera'; v=m(/OPR\/(\d+)/); }
  else if(/Firefox\//.test(ua)){ nom='Firefox'; v=m(/Firefox\/(\d+)/); }
  else if(/Chrome\//.test(ua)){ nom=uad&&uad.brands&&uad.brands.some(b=>/Brave/.test(b.brand))?'Brave':'Google Chrome'; v=m(/Chrome\/(\d+)/); }
  else if(/Safari\//.test(ua)){ nom='Safari'; v=m(/Version\/(\d+)/); }
  const os=(uad&&uad.platform)||(/Windows/.test(ua)?'Windows':/Mac OS/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'')||'';
  return {nom:nom||'Navigateur inconnu',v,os,mobile,api:typeof window.showDirectoryPicker==='function'}; }
const ckInstalled=()=>{ try{ return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true; }catch(e){ return false; } };
/* Fichier d'essai : créé, relu, puis supprimé. Rien ne reste dans le dossier. */
async function ckWrite(h){ const N='.librejo-test'; let made=false;
  try{ const fh=await h.getFileHandle(N,{create:true}); made=true; const w=await fh.createWritable(); await w.write('Librejo : essai d’écriture, supprimé tout de suite.'); await w.close();
    const t=await (await fh.getFile()).text(); if(!/essai/.test(t)) throw new Error('relecture'); }
  catch(e){ let left=false; if(made){ try{ await h.removeEntry(N); }catch(_){ left=true; } } return {ok:false,err:e,left}; }
  try{ await h.removeEntry(N); }catch(e){ return {ok:true,left:true}; }
  return {ok:true}; }
async function ljChecks(opt={}){
  const L=[], add=(id,etat,titre,vu,faire,copie)=>L.push({id,etat,titre,vu,faire:faire||'',copie:copie||vu});
  const B=ckBrowser(), web=location.protocol!=='file:', usual=/Edge|Chrome/.test(B.nom);
  // 1. navigateur
  if(DEMO&&!B.api&&!B.mobile) add('nav','info','Navigateur',`${B.nom}${B.v?' '+B.v:''}${B.os?' sur '+B.os:''} : la démo y marche, son dossier étant dans le navigateur.`,`Pour votre structure, il faudra Microsoft Edge ou Google Chrome sur ordinateur : eux seuls savent ouvrir le dossier partagé.`);
  else if(B.mobile) add('nav','err','Navigateur',`${B.nom}${B.v?' '+B.v:''} sur téléphone ou tablette.`,`Librejo est prévu pour un ordinateur, avec Microsoft Edge ou Google Chrome. Sur cet appareil, seuls les formulaires marchent (mode « formulaires seulement »).`);
  else if(!B.api) add('nav','err','Navigateur',`${B.nom}${B.v?' '+B.v:''}${B.os?' sur '+B.os:''} ne sait pas ouvrir de dossier.`,`Ouvrez Librejo dans Microsoft Edge ou Google Chrome sur ordinateur. En attendant, le mode « formulaires seulement » permet de remplir les formulaires.`);
  else if(!usual) add('nav','warn','Navigateur',`${B.nom}${B.v?' '+B.v:''}${B.os?' sur '+B.os:''} : il sait ouvrir les dossiers, mais Librejo n’y est pas testé.`,`Préférez Microsoft Edge (installé sur tous les Windows) ou Google Chrome.`);
  else add('nav','ok','Navigateur',`${B.nom}${B.v?' '+B.v:''}${B.os?' sur '+B.os:''}, sur ordinateur.`);
  // 2. application installée ou onglet
  if(!web) add('app','info','Application','Version fichier, ouverte depuis le dossier (file://).','Mettez Librejo.html en favori du navigateur pour le retrouver.');
  else if(ckInstalled()) add('app','ok','Application','Librejo est installé : il s’ouvre dans sa propre fenêtre.');
  else add('app','info','Application','Ouvert dans un onglet du navigateur.','Installez Librejo (menu du navigateur › Installer Librejo, ou l’icône dans la barre d’adresse). L’autorisation du dossier tient mieux et Librejo a son icône sur le bureau. Si l’installation est interdite, un favori suffit.');
  // 3. autorisation du dossier
  const h=SANS?null:(dirH||await idb.get('dossier'));
  if(DEMO){ add('read','ok','Dossier de démo','Dans le stockage privé de ce navigateur : rien n’est envoyé, rien n’est partagé avec d’autres visiteurs.','Pour votre structure, le dossier sera un dossier partagé (NAS, lecteur réseau, OneDrive…) que tous les postes voient, choisi dans Librejo.');
    const r=await ckWrite(h); add('write',r.ok?'ok':'err','Écriture dans le dossier',r.ok?'Vérifiée : un petit fichier d’essai a été créé, relu puis supprimé.':`Impossible d’écrire dans le stockage du navigateur (${(r.err&&r.err.name)||'erreur'}).`,r.ok?'':'Libérez de la place, ou « Remettre à zéro » la démo.'); }
  else if(SANS||!h){ add('read','err','Accès au dossier',SANS?(SD_RAISON[SANS.raison]||SD_RAISON.choix):'Aucun dossier n’est encore choisi sur ce poste.',
      SANS&&SANS.raison==='api'?'Il faut Microsoft Edge ou Google Chrome sur ordinateur.':'Choisissez le dossier de la structure. Si le navigateur ou une stratégie de l’informatique le bloque, l’informatique peut l’autoriser pour Librejo seulement (voir « Si l’accès aux dossiers est bloqué »).'); }
  else{
    const rd=await permState(h,'read');
    const each='Si le navigateur propose « Autoriser à chaque visite », choisissez-le : vous n’aurez plus à redonner votre accord.';
    if(rd==='granted') add('read','ok','Lecture du dossier','Autorisée sur ce poste.',each);
    else if(rd==='denied') add('read','err','Lecture du dossier','Refusée par le navigateur.','Dans le navigateur, icône à gauche de l’adresse › Paramètres du site › Fichiers : autorisez Librejo. Si une stratégie de l’informatique l’interdit, demandez-lui de l’autoriser pour Librejo seulement.');
    else add('read','warn','Lecture du dossier','L’autorisation sera redemandée au prochain clic.',each);
    let wr=await permState(h,'readwrite');
    if(wr!=='granted'&&opt.askWrite){ try{ wr=await h.requestPermission({mode:'readwrite'}); }catch(e){} }
    if(wr==='granted'){ const r=await ckWrite(h);
      if(r.ok&&!r.left) add('write','ok','Écriture dans le dossier','Vérifiée : un petit fichier d’essai a été créé, relu puis supprimé.');
      else if(r.ok) add('write','warn','Écriture dans le dossier','L’écriture marche, mais le fichier d’essai « .librejo-test » n’a pas pu être supprimé.','Supprimez-le à la main dans le dossier Librejo (il ne contient rien).');
      else{ const n=(r.err&&r.err.name)||'Erreur';
        add('write','err','Écriture dans le dossier',`Impossible d’écrire (${n}).${r.left?' Le fichier d’essai « .librejo-test » est peut-être resté : supprimez-le à la main.':''}`,
          n==='NoModificationAllowedError'?'Le dossier est en lecture seule, ou un fichier est ouvert ailleurs. Les admins ont besoin du droit de modification sur le dossier Librejo : demandez-le à l’informatique.'
          :n==='QuotaExceededError'?'Le disque ou l’espace en ligne est plein : faites de la place, puis relancez.'
          :'Le navigateur ou les droits du dossier refusent l’écriture. Les admins ont besoin du droit de modification sur le dossier Librejo (droits du partage, ou stratégie du navigateur) : demandez-le à l’informatique. L’équipe, elle, n’a besoin que de la lecture.'); } }
    else add('write','info','Écriture dans le dossier','Pas encore autorisée sur ce poste : c’est normal pour l’équipe, qui n’a besoin que de la lecture.','Elle est demandée à l’entrée en mode admin. Pour la vérifier maintenant : « Tester l’écriture ».');
    // 4. dossier synchronisé dans le cloud
    // ce qui est montré à l'écran (noms compris) et ce qui est copié pour l'informatique (sans aucun nom de fichier ni de dossier)
    const seen=[], seenC=[]; if(CK_CLOUD.test(h.name||'')){ const w=`le nom du dossier contient « ${(CK_CLOUD.exec(h.name)||[''])[0]} »`; seen.push(w); seenC.push(w); }
    try{ for await (const [n] of h.entries()){ if(CK_MARK.some(re=>re.test(n))) { seen.push(`fichier de synchronisation « ${n} »`); seenC.push(`fichier de synchronisation « ${n} »`); break; } } }catch(e){}
    let conf=[]; try{ conf=await conflictsIn(await h.getDirectoryHandle('app')); }catch(e){}
    if(conf.length){ const k=`${conf.length} copie${conf.length>1?'s':''} en conflit dans app`; seen.push(`${k} (${conf.map(c=>c.nom).slice(0,3).join(', ')}${conf.length>3?'…':''})`); seenC.push(k); }
    const cloudDo='Sur chaque poste, ce même dossier doit être synchronisé (application OneDrive, Google Drive pour ordinateur ou Dropbox) : Teams ou SharePoint ouvert seulement dans le navigateur ne suffit pas. Avec OneDrive : clic droit sur le dossier Librejo › « Toujours conserver sur cet appareil », sinon les fichiers « à la demande » peuvent manquer ou arriver en retard. Évitez que deux admins modifient en même temps.';
    if(seen.length) add('cloud','warn','Dossier synchronisé',`Dossier « ${h.name} » : ${seen.join(' ; ')}.`,
      (conf.length?'Copies en conflit : comparez-les avec l’original (en mode admin, Librejo montre les différences), gardez la bonne, supprimez l’autre. Librejo ne les supprime jamais lui-même. ':'')+cloudDo,
      `Signes de synchronisation dans le cloud : ${seenC.join(' ; ')}.`);
    else add('cloud','ok','Dossier synchronisé',`Aucun signe de OneDrive, SharePoint, Google Drive ou Dropbox dans le dossier « ${h.name} » (le navigateur ne donne pas son chemin complet).`,
      'S’il est quand même synchronisé dans le cloud : même dossier synchronisé sur tous les postes, et avec OneDrive « Toujours conserver sur cet appareil ».','Aucun signe de synchronisation dans le cloud (le navigateur ne donne pas le chemin complet).');
  }
  // 5. chemin réseau : seulement pour la version fichier (en version web, le dossier se choisit dans une fenêtre)
  if(!web){ const path=decodeURIComponent(location.pathname);
    if(UNC_OPEN) add('unc','err','Chemin réseau',`Librejo est ouvert par un chemin réseau (\\\\${UNC_SHARE}\\…) : Chrome et Edge refusent souvent d’autoriser un dossier ouvert ainsi.`,`Connectez un lecteur réseau : dans l’Explorateur, clic droit sur ${UNC_SHARE} › Connecter un lecteur réseau › lettre Z: › « Se reconnecter à la connexion ». Puis ouvrez Z:\\${UNC_REST||'Librejo'}\\Librejo.html et mettez-le en favori.`);
    else if(/\\temp\\|\/temp\/|appdata\/local\/temp|\.zip\//i.test(path)) add('unc','err','Chemin du fichier','Librejo semble ouvert depuis un zip non extrait (dossier temporaire).','Faites clic droit sur le zip › Extraire tout, puis ouvrez Librejo.html dans le dossier extrait.');
    else add('unc','ok','Chemin du fichier','Ouvert par une lettre de lecteur ou un disque du poste.'); }
  // 6. hors ligne
  if(web&&'serviceWorker' in navigator) add('off',navigator.serviceWorker.controller?'ok':'info','Hors ligne',navigator.serviceWorker.controller?'Librejo est gardé sur ce poste : il s’ouvre même sans Internet.':'Pas encore gardé sur ce poste.','Il le sera au prochain lancement.');
  return L; }
const CK_ICO={ok:svg('<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.6 2.6L16 9.5"/>'),info:svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  warn:svg('<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4M12 17h.01"/>'),err:svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>')};
const CK_MOT={ok:'Bon',info:'Conseil',warn:'À vérifier',err:'Problème'};
function checksHTML(L){ return `<ul class="ck-list">${L.map(x=>`<li class="ck ck-${x.etat}"><span class="ck-i">${CK_ICO[x.etat]}<span class="sr">${CK_MOT[x.etat]} :</span></span><div><b>${esc(x.titre)}</b> <span>${esc(x.vu)}</span>${x.faire?`<p class="ck-do">${esc(x.faire)}</p>`:''}${x.id==='write'&&x.etat==='info'?`<p class="ck-do"><button type="button" class="secondary sm" data-ckwrite>Tester l’écriture</button></p>`:''}</div></li>`).join('')}</ul>`; }
function checksText(L){ const d=new Date(), B=ckBrowser(), sym={ok:'[OK]',info:'[conseil]',warn:'[à vérifier]',err:'[problème]'};
  return [`Librejo : vérifications du poste, le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}`,
    `Version de Librejo : ${DOCUBUS_VERSION}`,`Adresse : ${location.protocol==='file:'?'version fichier (file://)':location.origin+location.pathname}`,
    `Navigateur : ${B.nom} ${B.v} (${B.os||'système inconnu'})${B.mobile?', téléphone ou tablette':''}`,`Accès aux dossiers (File System Access) : ${B.api?'disponible':'absent'}`,'',
    ...L.map(x=>`${sym[x.etat]} ${x.titre} : ${x.copie}${x.faire&&x.etat!=='ok'?'\n    → '+x.faire:''}`),'',
    'Aucune donnée de personne n’est incluse. Librejo n’envoie rien sur Internet : le site ne sert que le code.',
    'Si l’accès aux dossiers est bloqué : '+SD_KIT].join('\n'); }
/* Encadré de vérifications (dans une fenêtre ou dans l'assistant), avec « Relancer » et « Copier pour l'informatique » */
async function checksInto(box,opt={}){ if(!box) return null; box.innerHTML=`<p class="hint">Vérification en cours…</p>`;
  const L=await ljChecks(opt); if(!box.isConnected) return L;
  box.innerHTML=checksHTML(L)+`<div class="row ck-acts"><button type="button" class="secondary sm" data-ckcopy>${ICON.copy}Copier pour l’informatique</button><button type="button" class="secondary sm" data-ckreport>${ICON.mail}Signaler un problème</button><button type="button" class="ghost sm" data-cknas>Lecteur réseau…</button><button type="button" class="ghost sm" data-ckagain>Relancer</button></div>`;
  box.querySelector('[data-ckcopy]').onclick=async()=>{ const ok=await copyText(checksText(L)); toast(ok?'Copié : collez-le dans un mail à l’informatique':'Copie impossible : faites une capture d’écran'); };
  box.querySelector('[data-ckagain]').onclick=()=>checksInto(box,opt);
  box.querySelector('[data-ckreport]').onclick=()=>reportProblem(L);
  box.querySelector('[data-cknas]').onclick=()=>openNas();
  const w=box.querySelector('[data-ckwrite]'); if(w) w.onclick=()=>checksInto(box,{...opt,askWrite:true});
  return L; }
const LJ_SUPPORT='librejo@proton.me'; // l'équipe Librejo : destinataire par défaut de « Signaler un problème »
/* « Signaler un problème » : un brouillon de mail avec le rapport du poste (version, navigateur, adresse, vérifications).
   Rien sur les personnes ; rien n'est envoyé par Librejo : la personne relit, décrit le problème et envoie elle-même. */
function reportProblem(L){
  const to=String(PAR.support||LJ_SUPPORT).split(/[\s,;]+/).filter(a=>MAIL.test(a));
  const subject=`Librejo : un problème sur un poste${structure&&structure.nom?' – '+structure.nom:''}`;
  const body=`Bonjour,\n\nCe qui ne marche pas (ce que vous faisiez, ce qui s’est affiché) :\n\n\n\n---- Rapport préparé par Librejo ----\n${checksText(L)}\n`;
  if((PAR.mail||'outlook')==='web') window.open(composeUrl(to,subject,body),'_blank','noopener');
  else openMailto(mailtoUrl({to,subject,body}));
  toast('Mail préparé : décrivez le problème, puis envoyez');
}
/* Lecteur réseau qui disparaît au démarrage : le programme de réparation (préparé par boot.js, window.LJ_NAS) */
function openNas(){
  const N=window.LJ_NAS; if(!N){ toast('Outil indisponible dans cette version.'); return; }
  const o=N.get();
  openModal(`<h3 id="modal-title">Lecteur réseau qui disparaît au démarrage</h3>
    <p>Si vos documents sont sur un NAS ou un serveur (lecteur Z:, X:…), Windows peut oublier de reconnecter le lecteur après le démarrage : Librejo affiche alors « Le dossier ne répond pas ». Librejo peut préparer pour <b>ce poste</b> un petit programme Windows qui :</p>
    <ul class="nas-ul"><li>mémorise l’identifiant du NAS (le mot de passe est demandé par Windows, jamais écrit dans le fichier) ;</li><li>connecte le lecteur, puis le reconnecte à chaque démarrage, en attendant que le réseau soit prêt ;</li><li>propose de couper le «&nbsp;démarrage rapide&nbsp;» de Windows, qui empêche souvent la reconnexion.</li></ul>
    <div class="row nas-row"><label class="field nas-l"><span>Lettre du lecteur</span><input class="in" id="nas-l" maxlength="2" autocomplete="off" value="${esc((o.lettre||'Z:').charAt(0))}"></label>
      <label class="field nas-c"><span>Chemin réseau du dossier partagé</span><input class="in" id="nas-c" autocomplete="off" spellcheck="false" placeholder="\\\\192.168.1.10\\Partage" value="${esc(o.chemin||'')}" aria-describedby="nas-h"></label></div>
    <p class="hint" id="nas-h">Il se lit dans l’Explorateur de fichiers : clic droit sur le lecteur › Propriétés, ou dans la barre d’adresse. Chaque poste peut avoir sa propre lettre.</p>
    <p class="err" id="nas-err" role="alert" hidden></p>
    <p class="hint">Ouvrez ensuite le fichier téléchargé. Si Windows affiche «&nbsp;Windows a protégé votre ordinateur&nbsp;», cliquez sur «&nbsp;Informations complémentaires&nbsp;» puis «&nbsp;Exécuter quand même&nbsp;». Pour couper le démarrage rapide, lancez-le par clic droit › «&nbsp;Exécuter en tant qu’administrateur&nbsp;». <b>Pas encore essayé sur un vrai poste Windows</b> : signalez-nous ce qui ne marche pas.</p>
    <div class="btns"><button class="primary" id="nas-dl">${ICON.dl}Télécharger le programme</button><button class="secondary" data-close>Fermer</button></div>`,'wide');
  $('#nas-dl').onclick=()=>{ const r=N.check($('#nas-l').value,$('#nas-c').value), er=$('#nas-err');
    ['#nas-l','#nas-c'].forEach(q=>$(q).removeAttribute('aria-invalid'));
    if(r.err){ er.textContent=r.err; er.hidden=false; const f=$(r.k==='lettre'?'#nas-l':'#nas-c'); f.setAttribute('aria-invalid','true'); f.focus(); return; }
    er.hidden=true; N.download(r); toast(`Programme téléchargé : « Librejo - lecteur ${r.lettre.charAt(0)}.cmd »`); };
}
function openChecks(lead){
  openModal(`<h3 id="modal-title">Vérifications de ce poste</h3><p class="hint">${lead?esc(lead):'Librejo vérifie le navigateur, l’autorisation du dossier et le type de dossier, puis dit quoi faire. Le résultat peut être copié pour l’informatique : il ne contient aucune donnée de personne.'}</p><div id="ck-box"></div>
    <div class="btns"><button class="secondary" data-close>Fermer</button></div>`,'wide');
  return checksInto($('#ck-box')); }
/* Après le choix d'un dossier sur ce poste : vérifications ; la fenêtre ne s'ouvre que s'il y a quelque chose à faire */
async function checksAfterPick(){ const L=await ljChecks();
  if(L.some(x=>x.etat==='warn'||x.etat==='err')){ if(!$('#modal').hidden) return; openChecks('Librejo a vérifié ce poste après le choix du dossier. Un point au moins mérite votre attention.'); }
  else toast('Vérifications : tout est en ordre sur ce poste'); }

/* ======================================================================
   MODIFICATIONS SIMULTANÉES (deux admins, ou un dossier synchronisé dans le cloud)
   Avant d'écrire un fichier de réglages, Librejo relit le fichier et le compare à ce qu'il a lu au
   démarrage (ou à son dernier enregistrement). S'il a changé entre-temps, il ne l'écrase pas en silence :
   « Recharger ses modifications », « Enregistrer quand même » (chacun après confirmation), « Voir les
   différences » (sections changées de chaque côté). Pas de fusion automatique.
   Au chargement et à l'entrée en mode admin : copies en conflit dans app (jamais supprimées par Librejo),
   modifications récentes d'un autre poste (journal) et fichiers changés depuis l'ouverture.
   ====================================================================== */
const LJ_LUS=window.LJ_LUS||(window.LJ_LUS={});
const CF_FILES={'app/parametres.js':['parametres','DOCUBUS_PARAMETRES','les réglages','Le fichier des réglages'],'app/donnees.js':['donnees','DOCUBUS_DONNEES','la liste des documents et des formulaires','Le fichier des documents et des formulaires'],
  'app/annuaire.js':['annuaire','DOCUBUS_ANNUAIRE','l’annuaire','Le fichier de l’annuaire'],'app/logo-association.js':['logo','DOCUBUS_LOGO_ASSO','le logo de la structure','Le fichier du logo de la structure']};
const CF_LAB={parametres:{attestation:'En-tête et bas de page',fiche:'Infos de la structure (Cerfa)',typeStructure:'Type de structure',equipe:'Équipe',medecins:'Médecins',medecinLigne:'Ligne des médecins',
    destinataires:'Destinataires de la délivrance',envoi:'Adresses d’envoi',mail:'Messagerie',webmail:'Messagerie',sansMail:'Messagerie',motdepasse:'Mot de passe admin',tampon:'Tampon',
    apparence:'Apparence (couleurs, logo)',mise:'Papier à en-tête',formsOff:'Formulaires proposés',formsOn:'Formulaires proposés',nommage:'Nom des fichiers et des dossiers',demarrage:'Liste de démarrage',assistant:'Assistant de démarrage'},
  donnees:{categories:'Catégories',documents:'Documents',formulaires:'Formulaires',kits:'Kits',semaine:'Impression rapide',formsEpingles:'Formulaires épinglés',archives:'Archives',synonymes:'Mots de la recherche',ordoListes:'Listes de l’ordonnance',sauvegarde:'Sauvegarde',aArchiver:'Documents à archiver'},
  annuaire:{partenaires:'Fiches de l’annuaire',types:'Types de partenaires',origine:'Import de l’annuaire'}};
const CF_SKIP=new Set(['maj','migrations']);
const CF_NAME={documents:d=>d.titre,formulaires:f=>f.titre,categories:c=>c.nom,kits:k=>k.titre,partenaires:p=>p.nom||p.structure,equipe:p=>p.nom,medecins:m=>m.nom,destinataires:d=>d.nom};
let CF_COPIES=[];
const cfEmpty=v=>v==null||v===''||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Array.isArray(v)&&!Object.keys(v).length);
const cfSame=(a,b)=>(cfEmpty(a)&&cfEmpty(b))||JSON.stringify(a)===JSON.stringify(b);
function cfParse(rel,txt){ const F=CF_FILES[rel]; if(!F||txt==null) return null; const m=String(txt).match(new RegExp('window\\.'+F[1]+'\\s*=\\s*([\\s\\S]*?);?\\s*$')); try{ return m?JSON.parse(m[1]):null; }catch(e){ return null; } }
async function cfRead(rel){ try{ const f=await readRel(rel); return {t:f.lastModified,txt:await f.text()}; }catch(e){ if(e&&e.name==='NotFoundError') return null; throw e; } }
/* Version fichier (les réglages sont chargés par des balises <script>) : la référence est la version présente au premier accès au dossier */
let cfBaseP=null;
function cfBaseline(){ if(!cfBaseP) cfBaseP=(async()=>{ for(const rel of Object.keys(CF_FILES)) if(!LJ_LUS[rel]){ try{ const c=await cfRead(rel); if(c) LJ_LUS[rel]=c; }catch(e){} } })(); return cfBaseP; }
/* Une écriture à la fois par fichier ; avant chaque écriture, comparaison avec la référence */
const cfQ={};
function guardedWrite(rel,text){
  const go=async()=>{
    const base=LJ_LUS[rel];
    if(base){ const cur=await cfRead(rel);
      if(cur&&cur.txt!==base.txt){ const ch=await cfAsk(rel,base,cur,text);
        if(ch==='reload'){ location.reload(); throw new Cancel(); }
        if(ch!=='force') throw new Cancel();
        jlog('Enregistré malgré une modification ailleurs',CF_FILES[rel]?CF_FILES[rel][2]:rel); } }
    await writeRel(rel,new Blob([text],{type:'text/javascript'}));
    let t=Date.now(); try{ t=(await readRel(rel)).lastModified; }catch(e){}
    LJ_LUS[rel]={t,txt:text};
  };
  const p=(cfQ[rel]||Promise.resolve()).catch(()=>{}).then(go); cfQ[rel]=p; return p; }
function cfSections(kind,A,B){ const L=CF_LAB[kind]||{}, out=[];
  const q=l=>l.slice(0,4).map(t=>`« ${t||'sans titre'} »`).join(', ')+(l.length>4?` et ${l.length-4} autre${l.length>5?'s':''}`:'');
  for(const k of [...new Set([...Object.keys(A||{}),...Object.keys(B||{})])]){ if(CF_SKIP.has(k)) continue; const a=(A||{})[k], b=(B||{})[k]; if(cfSame(a,b)) continue;
    const det=[], nm=CF_NAME[k];
    if(nm&&(Array.isArray(a)||Array.isArray(b))){ const key=x=>x&&(x.id||x.chemin||nm(x)); const ma=new Map((a||[]).map(x=>[key(x),x])), mb=new Map((b||[]).map(x=>[key(x),x]));
      const add=[...mb.keys()].filter(x=>!ma.has(x)).map(x=>nm(mb.get(x))), del=[...ma.keys()].filter(x=>!mb.has(x)).map(x=>nm(ma.get(x))), mod=[...mb.keys()].filter(x=>ma.has(x)&&!cfSame(ma.get(x),mb.get(x))).map(x=>nm(mb.get(x)));
      if(add.length) det.push('ajouté : '+q(add)); if(mod.length) det.push('modifié : '+q(mod)); if(del.length) det.push('retiré : '+q(del)); if(!det.length) det.push('ordre changé'); }
    const lab=L[k]||k, ex=out.find(o=>o.label===lab); if(ex) ex.det.push(...det); else out.push({label:lab,det}); }
  return out; }
const cfListHTML=(S,empty)=>S.length?`<ul class="cf-l">${S.map(x=>`<li><b>${esc(x.label)}</b>${x.det.length?` <span>${esc(x.det.join(' · '))}</span>`:''}</li>`).join('')}</ul>`:`<p class="hint">${esc(empty)}</p>`;
function cfDiffHTML(rel,base,cur,mine){ const F=CF_FILES[rel];
  if(!F||F[0]==='logo') return `<p>Le logo de la structure a été changé sur l’autre poste.</p>`;
  const B=cfParse(rel,base.txt), C=cfParse(rel,cur.txt), M=cfParse(rel,mine);
  if(!B||!C||!M) return `<p>Les différences ne peuvent pas être détaillées : le fichier de l’autre poste est illisible ou incomplet (synchronisation en cours ?).</p>`;
  const other=cfSections(F[0],B,C), me=cfSections(F[0],B,M), both=other.filter(o=>me.some(m=>m.label===o.label)).map(o=>o.label);
  return `<div class="cf-cols"><div><h4>Changé sur l’autre poste</h4>${cfListHTML(other,'Rien de lisible : seule la mise en forme du fichier a changé.')}</div>
    <div><h4>Changé par vous, pas encore enregistré</h4>${cfListHTML(me,'Rien d’autre que l’enregistrement en cours.')}</div></div>
    ${both.length?`<p class="cf-both"><b>Changé des deux côtés :</b> ${esc(both.join(', '))}. Si vous rechargez, refaites vos changements sur ces points ; si vous enregistrez quand même, ceux de l’autre poste sont perdus.</p>`:''}`; }
const cfAgo=t=>{ const m=Math.max(0,Math.round((Date.now()-t)/60000)); return m<1?'il y a moins d’une minute':m<60?`il y a ${m} minute${m>1?'s':''}`:`le ${new Date(t).toLocaleDateString('fr-FR')} à ${new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}).replace(':',' h ')}`; };
/* Fenêtre au-dessus de tout (y compris d'une fenêtre ouverte) : « Recharger ses modifications », « Enregistrer quand même », « Voir les différences » */
function cfAsk(rel,base,cur,mine){ return new Promise(resolve=>{
  const F=CF_FILES[rel]||[rel,'',rel,'Le fichier '+rel], prev=document.activeElement;
  const o=document.createElement('div'); o.className='overlay cf-ov'; o.id='cfdlg';
  o.innerHTML=`<div class="dialog wide" role="alertdialog" aria-modal="true" aria-labelledby="cf-t" aria-describedby="cf-d">
    <h3 id="cf-t">Ce fichier a été modifié sur un autre poste depuis que vous l’avez ouvert</h3>
    <p id="cf-d"><b>${esc(F[3])}</b> (${esc(rel)}) ${cur.t?'a changé '+cfAgo(cur.t):'a changé'}. Si vous enregistrez maintenant, ces modifications seront remplacées par les vôtres. Librejo n’a rien écrit.</p>
    <details class="cf-diff"><summary>Voir les différences</summary><div class="cf-diffin">${cfDiffHTML(rel,base,cur,mine)}</div></details>
    <div class="cf-confirm" id="cf-c" hidden></div>
    <div class="btns" id="cf-b"><button type="button" class="primary" id="cf-reload">Recharger ses modifications</button><button type="button" class="secondary" id="cf-force">Enregistrer quand même</button><button type="button" class="ghost" id="cf-no">Ne rien enregistrer pour l’instant</button></div></div>`;
  document.body.appendChild(o);
  const end=v=>{ o.remove(); layersSync(); document.removeEventListener('keydown',key,true); if(prev&&prev.isConnected&&prev.focus) prev.focus(); resolve(v); };
  const key=e=>{ if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); const c=o.querySelector('#cf-c'); if(!c.hidden){ c.hidden=true; o.querySelector('#cf-b').hidden=false; o.querySelector('#cf-reload').focus(); } else end('cancel'); } };
  document.addEventListener('keydown',key,true);
  const ask=(txt,yes,danger,v)=>{ const c=o.querySelector('#cf-c'), b=o.querySelector('#cf-b'); b.hidden=true; c.hidden=false;
    c.innerHTML=`<p><b>${txt}</b></p><div class="btns"><button type="button" class="primary${danger?' danger':''}" id="cf-yes">${esc(yes)}</button><button type="button" class="secondary" id="cf-back">Retour</button></div>`;
    c.querySelector('#cf-yes').onclick=()=>end(v); c.querySelector('#cf-back').onclick=()=>{ c.hidden=true; b.hidden=false; o.querySelector('#cf-reload').focus(); }; c.querySelector('#cf-back').focus(); };
  o.querySelector('#cf-reload').onclick=()=>ask('Librejo va se recharger avec la version de l’autre poste. Vos modifications pas encore enregistrées seront perdues.','Recharger',false,'reload');
  o.querySelector('#cf-force').onclick=()=>ask('Les modifications faites sur l’autre poste seront remplacées par les vôtres, sans retour possible.','Remplacer par mes modifications',true,'force');
  o.querySelector('#cf-no').onclick=()=>end('cancel');
  o.querySelector('#cf-reload').focus(); }); }
/* Ce qui a bougé ailleurs : copies en conflit, fichiers changés depuis l'ouverture, modification récente d'un autre poste */
async function cfScan(){ const R={copies:[],changed:[],recent:null};
  try{ const app=await dirAt(['app'],'read',false); R.copies=await conflictsIn(app);
    for(const c of R.copies){ try{ c.t=(await c.h.getFile()).lastModified; }catch(e){} } }catch(e){}
  CF_COPIES=R.copies;
  for(const rel of Object.keys(CF_FILES)){ const b=LJ_LUS[rel]; if(!b) continue; try{ const c=await cfRead(rel); if(c&&c.txt!==b.txt) R.changed.push({rel,t:c.t}); }catch(e){} }
  const now=Date.now(), me=stPoste(), J=await jrRead();
  for(let i=J.length-1;i>=0;i--){ const e=J[i], t=Date.parse(e.quand); if(!(now-t<10*60000)) break; if(e.poste&&e.poste!==me){ R.recent=e; break; } }
  if(!R.recent){ const c=R.changed.filter(x=>now-x.t<10*60000).sort((a,b)=>b.t-a.t)[0]; if(c) R.recent={quand:new Date(c.t).toISOString(),rel:c.rel}; }
  return R; }
function cfWhat(e){ if(e.rel) return (CF_FILES[e.rel]||[])[2]||'les réglages'; const a=String(e.action||'');
  return /^Réglages/.test(a)?'les réglages':/Formulaire/.test(a)?'les formulaires':/Catégorie/.test(a)?'les catégories':/annuaire/i.test(a)?'l’annuaire':'les documents'; }
function cfNoticeHTML(){ const n=CF_COPIES.length;
  return `<div class="notice cf-note" role="status"><span><b>${n} copie${n>1?'s':''} en conflit dans le dossier app</b> (${esc(CF_COPIES.slice(0,3).map(c=>c.nom).join(', '))}${n>3?'…':''}) : deux postes ont enregistré en même temps. Librejo ne les supprime pas lui-même.</span><button type="button" class="secondary sm" data-cfcopies>Que faire ?</button></div>`; }
/* Entrée en mode admin (ou admin déjà ouvert au chargement) : prévenir avant de modifier. Renvoie false s'il vaut mieux recharger d'abord. */
async function cfAdminCheck(quiet){ const R=await cfScan(); renderDocs();
  if(!R.changed.length&&!R.recent&&(quiet||!R.copies.length)) return true;
  const parts=[];
  if(R.recent){ const qui=R.recent.qui&&R.recent.qui!=='Admin'?`Quelqu’un (${R.recent.qui})`:'Quelqu’un';
    parts.push(`<div class="cf-item"><p><b>${esc(qui)} a modifié ${esc(cfWhat(R.recent))} ${esc(cfAgo(Date.parse(R.recent.quand)))}</b>${R.recent.action?` (${esc(R.recent.action)}${R.recent.objet?' · '+esc(R.recent.objet):''})`:''}, sur un autre poste.</p><p class="hint">S’il ou elle est encore en train de modifier, mettez-vous d’accord avant de faire vos changements. Librejo vous préviendra avant d’écraser quoi que ce soit.</p></div>`); }
  if(R.changed.length) parts.push(`<div class="cf-item"><p><b>${R.changed.length>1?'Ces fichiers ont':'Ce fichier a'} changé depuis l’ouverture de Librejo sur ce poste :</b> ${esc(R.changed.map(c=>CF_FILES[c.rel][2]).join(', '))}.</p><p class="hint">Rechargez pour partir de la dernière version avant de modifier.</p></div>`);
  if(R.copies.length&&!quiet) parts.push(`<div class="cf-item"><p><b>${R.copies.length} copie${R.copies.length>1?'s':''} en conflit</b> dans le dossier app (créée${R.copies.length>1?'s':''} par le service de synchronisation quand deux postes enregistrent en même temps).</p>${cfCopiesHTML(R.copies)}</div>`);
  return new Promise(res=>{
    openModal(`<h3 id="modal-title">Avant de modifier</h3>${parts.join('')}
      <div class="btns">${R.changed.length?'<button class="primary" id="cf-rl">Recharger maintenant</button>':''}<button class="${R.changed.length?'secondary':'primary'}" data-close id="cf-go">Continuer</button></div>`,'wide');
    cfCopiesBind($('#modal-box'));
    const rl=$('#cf-rl'); if(rl) rl.onclick=()=>location.reload();
    $('#cf-go').addEventListener('click',()=>res(!R.changed.length));
    const ob=new MutationObserver(()=>{ if($('#modal').hidden){ ob.disconnect(); res(!R.changed.length); } }); ob.observe($('#modal'),{attributes:true,attributeFilter:['hidden']});
  }); }
function cfCopiesHTML(C){
  return `<ol class="cf-steps"><li>Ouvrez le dossier <b>app</b> de Librejo dans l’Explorateur de fichiers.</li><li>Comparez chaque copie avec le fichier en place : « Voir les différences » ci-dessous, et la date de modification.</li>
    <li>Si le fichier en place est le bon : supprimez la copie. Si c’est la copie : renommez d’abord le fichier en place (par exemple en <code>parametres-ancien.txt</code>), puis renommez la copie avec le nom d’origine, et rechargez Librejo.</li>
    <li>Pour que cela ne revienne pas : un seul admin à la fois, et laissez la synchronisation finir avant de modifier.</li></ol>
    <ul class="cf-copies">${C.map((c,i)=>`<li><div class="cf-row"><span><code>${esc(c.nom)}</code> <small>copie de ${esc(c.de)}${c.t?' · modifiée '+esc(cfAgo(c.t)):''}</small></span>${CF_FILES['app/'+c.de]&&c.de!=='logo-association.js'?`<button type="button" class="ghost sm" data-cfdiff="${i}">Voir les différences</button>`:''}</div><div class="cf-diffin" data-cfout="${i}" hidden></div></li>`).join('')}</ul>
    <p class="hint">Librejo ne supprime jamais ces copies lui-même.</p>`; }
function cfCopiesBind(box){ if(!box) return; box.querySelectorAll('[data-cfdiff]').forEach(b=>b.onclick=async()=>{ const i=+b.dataset.cfdiff, c=CF_COPIES[i], out=box.querySelector(`[data-cfout="${i}"]`); if(!c||!out) return;
  if(!out.hidden){ out.hidden=true; return; }
  try{ const rel='app/'+c.de, A=cfParse(rel,(await cfRead(rel)||{}).txt), B=cfParse(rel,await (await c.h.getFile()).text());
    out.innerHTML=!A||!B?'<p class="hint">L’un des deux fichiers est illisible : ouvrez-les dans un éditeur de texte pour comparer.</p>'
      :`<p class="hint">Ce que la copie a de différent par rapport au fichier en place${' '}:</p>${cfListHTML(cfSections(CF_FILES[rel][0],A,B),'Aucune différence de contenu : la copie peut être supprimée.')}`; }
  catch(e){ out.innerHTML=`<p class="hint">${esc(fsErr(e)||'Lecture impossible.')}</p>`; }
  out.hidden=false; }); }
function cfCopiesModal(){ openModal(`<h3 id="modal-title">Copies en conflit dans le dossier app</h3><p>Deux postes ont enregistré en même temps : le service de synchronisation (OneDrive, Google Drive, Dropbox, Nextcloud…) a gardé les deux versions.</p>${cfCopiesHTML(CF_COPIES)}<div class="btns"><button class="secondary" data-close>Fermer</button></div>`,'wide'); cfCopiesBind($('#modal-box')); }
document.addEventListener('click',e=>{ if(e.target.closest('[data-cfcopies]')) cfScan().then(()=>{ renderDocs(); CF_COPIES.length?cfCopiesModal():toast('Plus de copie en conflit : tout est réglé'); }); });
/* Au chargement : copies en conflit (pour l'avis de l'accueil) ; admin déjà ouvert : la même vérification qu'à l'entrée */
async function cfStartup(){ if(!FSA) return; const h=dirH||await idb.get('dossier'); if(!h||await permState(h,'read')!=='granted') return; dirH=h; await cfBaseline();
  if(isAdmin&&await permState(h,'readwrite')==='granted'){ if($('#modal').hidden) await cfAdminCheck(true); else { await cfScan(); renderDocs(); } }
  else{ await cfScan(); if(isAdmin) renderDocs(); } }

/* ======================================================================
   AIDE DE LA PAGE : bouton « ? » en haut à droite (ou touche F1)
   Un panneau à droite explique l'écran réellement affiché : à quoi il sert,
   comment faire pas à pas, et en mode admin ce qui s'y règle.

   LES TEXTES sont dans les tables ci-dessous, un objet par écran :
     titre  : nom de l'écran (sinon pris dans la page)
     but    : à quoi sert la page, en une ou deux phrases
     etapes : 3 à 5 gestes, avec les libellés exacts des boutons (<b>…</b>)
     admin  : ce que l'admin peut régler sur cette page, et où (montré en mode admin seulement)
   Ton : vouvoiement, phrases courtes ; espace fine insécable (U+202F) avant : ; ? !
   - Nouveau formulaire intégré : ajoutez une entrée dans AIDE_FORMS, avec l'id
     de BUILTIN_FORMS (ex. '__ccas'). Ce qui le règle (barre « Mode admin ») est ajouté tout seul.
   - Formulaires ajoutés par l'admin (bibliothèque ou création) : rien à faire,
     ils prennent AIDE.modele avec leur titre et leur description.
   - Écran sans entrée : aide générique AIDE.defaut.
   ====================================================================== */
const AIDE_FIN='Dans la fenêtre qui s’ouvre : <b>Imprimer</b>, <b>Envoyer par mail</b> ou <b>Télécharger</b>, puis <b>Terminé : effacer</b>.';
const AIDE={
  accueil:{titre:'Accueil',
    but:'La page de départ : la recherche, les formulaires et les documents les plus utilisés, puis tout le reste rangé par rubrique.',
    etapes:['Tapez ce que vous cherchez dans la barre de recherche. <kbd>/</kbd> ou <kbd>Ctrl</kbd>+<kbd>K</kbd> y mène depuis n’importe quelle page ; ici, quand rien n’est sélectionné, il suffit de taper.',
      'Pour un formulaire, cliquez sur son nom ou sur <b>Remplir</b>.',
      'Pour un document, cliquez sur son titre pour l’ouvrir, ou sur <b>Imprimer</b> ou <b>Envoyer</b>.',
      'Dépliez <b>Tous les formulaires</b> ou <b>Documents</b> pour voir le reste, rubrique par rubrique.',
      'L’étoile, à côté d’un titre, l’ajoute à <b>Mes favoris</b> (sur ce poste).'],
    admin:['<b>Ajouter un document</b>, <b>Ajouter un lien</b>, <b>Nouvelle catégorie</b> : en haut de la page. Vous pouvez aussi glisser des fichiers sur la page.',
      'Le menu <b>Outils</b> : évaluation HAS, tableau de bord, sauvegarde, journal, archives, assistant de démarrage, vérifications du poste.',
      '<b>Les plus utilisés</b> : épinglez un document (<b>Gérer</b>, sur sa ligne) ou un formulaire (<b>Épingler à l’accueil</b>, en haut du formulaire).',
      'La liste de démarrage reste affichée ici tant qu’elle n’est pas terminée.']},
  recherche:{titre:'Résultats de la recherche',
    but:'Les documents, liens, formulaires et kits qui correspondent à vos mots, les plus proches en premier.',
    etapes:['Tapez un ou plusieurs mots : tous doivent être trouvés. Les accents ne comptent pas.',
      'Cochez <b>Chercher aussi dans le texte des documents</b> pour chercher dans leur contenu (plus lent).',
      'Cliquez sur un titre pour l’ouvrir, ou sur <b>Imprimer</b>, <b>Envoyer</b> ou <b>Remplir</b>.',
      'Videz la barre de recherche, ou cliquez sur <b>Accueil</b>, pour revenir à l’accueil.'],
    admin:['Administration › <b>Mots de la recherche</b> : des mots équivalents, pour que « CMU » trouve aussi « C2S ».',
      'Outils › <b>Recherche dans le texte</b> : préparer la recherche dans le contenu des documents.',
      'La description et les mots-clés d’un document : <b>Gérer</b>, sur sa ligne.']},
  categorie:{
    but:'Les documents rangés dans cette catégorie, et ses formulaires s’il y en a. Ils sont lus dans le dossier de la structure : c’est toujours la version en place.',
    etapes:['Choisissez l’affichage : <b>Liste</b> ou <b>Vignettes</b>. En liste, cliquez sur un titre de colonne pour trier.',
      'Cliquez sur le titre d’un document pour l’ouvrir.',
      '<b>Imprimer</b> l’imprime en un clic ; <b>Envoyer</b> prépare un mail avec le document joint.',
      '<b>Plus</b> : modifier une copie (l’original reste intact) ou copier l’emplacement du fichier.',
      'Les sous-dossiers de la catégorie s’affichent dessous, dans le menu à gauche.'],
    admin:['<b>Ajouter un document</b>, ou glissez le fichier sur la page. Déposé sur la ligne d’un document, un fichier en devient la nouvelle version.',
      '<b>Gérer</b>, sur chaque ligne : description, mots-clés, version, épinglage, archive.',
      'Sous le titre : <b>Nouveau sous-dossier</b>, <b>Renommer la catégorie</b>, <b>Changer l’emoji</b>, <b>Supprimer la catégorie</b>.']},
  kits:{titre:'Kits de documents',
    but:'Des lots de documents à imprimer ou à envoyer ensemble, en une fois.',
    etapes:['Repérez le kit voulu : la liste de ses documents est affichée.',
      'L’imprimante imprime tout le kit ; l’enveloppe joint tous ses documents au même mail.',
      'La flèche vers le bas télécharge tous les documents du kit.'],
    admin:['<b>+ Nouveau kit</b> : un nom et les documents qui le composent.',
      'Le crayon, sur un kit, le modifie.']},
  formulaires:{titre:'Formulaires',
    but:'Tous les formulaires de la structure, rangés par rubrique. Vous remplissez, Librejo crée le PDF à l’en-tête de la structure, puis prépare le mail.',
    etapes:['Dépliez une rubrique, puis cliquez sur le formulaire voulu.',
      'Remplissez les champs. Ceux marqués « (facultatif) » peuvent rester vides.',
      'Cliquez sur le grand bouton en bas du formulaire (par exemple <b>Créer le PDF</b>).',
      AIDE_FIN],
    admin:['<b>Créer un formulaire</b>, en bas de cette page.',
      'Administration › <b>Formulaires et modèles</b> : ajouter des modèles de la bibliothèque, modifier vos formulaires, masquer ou proposer les formulaires intégrés.',
      '<b>Vérifier les Cerfa</b> (s’il y en a) : chercher une nouvelle version sur service-public.fr.']},
  sans:{titre:'Formulaires seulement',
    but:'Librejo marche ici sans le dossier de la structure : seuls les formulaires sont disponibles. Les documents, l’annuaire, les réglages et l’accès admin ne le sont pas.',
    etapes:['Si ce n’est pas fait, cliquez sur <b>Saisir l’en-tête</b> : le nom et l’adresse de la structure, gardés sur ce poste.',
      'Choisissez un formulaire, ou un modèle de la bibliothèque plus bas.',
      'Remplissez, puis cliquez sur le grand bouton en bas du formulaire.',
      AIDE_FIN,
      '<b>Pourquoi ?</b>, dans le bandeau en haut, dit ce qui bloque l’accès au dossier et quoi demander à l’informatique.']},
  modele:{
    but:'Un formulaire de la structure : vous remplissez les champs, Librejo en fait un PDF à l’en-tête de la structure, puis prépare le mail.',
    etapes:['Remplissez les champs. Ceux marqués « (facultatif) » peuvent rester vides.',
      'Vérifiez <b>Envoyer à</b> (adresses séparées par des virgules) et la <b>Date du document</b>.',
      'Cliquez sur <b>Créer le PDF et préparer l’envoi</b>.',
      AIDE_FIN,
      '<b>Tout effacer</b> vide le formulaire à tout moment.'],
    admin:['Administration › Formulaires et modèles › <b>Modifier</b> : titre, description, champs à remplir, texte du document, destinataires par défaut.']},
  cerfa:{
    but:'Le formulaire officiel (Cerfa), ouvert avec les informations de la structure déjà remplies. La partie de la personne se complète dans le document.',
    etapes:['Regardez les <b>Pièces à joindre</b> et <b>Où l’envoyer</b>, s’ils sont indiqués.',
      'Cliquez sur <b>Ouvrir le Cerfa pré-rempli</b>.',
      'Complétez les cases de la personne dans le document, puis imprimez.',
      'Une case de la structure reste vide ? Remplissez-la à la main, ou signalez-le à un admin.'],
    admin:['<b>Modifier le pré-remplissage</b> : quelle case reçoit quelle information.',
      'Réglages › <b>Structure</b> : les informations reprises dans les Cerfa.',
      '<b>Vérifier les Cerfa</b> : chercher une nouvelle version sur service-public.fr.']},
  pret:{
    but:'Le document est prêt, créé sur ce poste. Il reste à l’imprimer, l’envoyer ou le télécharger, puis à effacer le formulaire.',
    etapes:['<b>Aperçu</b>, à côté du nom du fichier, pour le relire. <b>Fermer l’aperçu</b> ou <kbd>Échap</kbd> pour en sortir ; si le clavier est resté dans le document, <kbd>Maj</kbd>+<kbd>Tab</kbd> (plusieurs fois si besoin) ramène à ce bouton.',
      '<b>Imprimer</b> ouvre la fenêtre d’impression.',
      '<b>Envoyer par mail</b> prépare le mail avec le document joint : vous le relisez et l’envoyez vous-même.',
      '<b>Télécharger</b> l’enregistre dans Téléchargements : supprimez-le après usage.',
      '<b>Terminé : effacer</b> vide le formulaire ; <b>Revenir sans effacer</b> pour corriger.']},
  semaine:{titre:'Impression rapide',
    but:'Les documents que l’on imprime souvent, choisis par l’admin. Vous indiquez le nombre d’exemplaires, et tout part en une seule impression.',
    etapes:['Pour chaque document, réglez le nombre d’exemplaires avec <b>−</b> et <b>+</b>, ou tapez-le.',
      'Le total s’affiche en bas de la liste.',
      'Cliquez sur <b>Imprimer</b> : une seule fenêtre d’impression pour tout.',
      '<b>Tout remettre à 0</b> pour recommencer. Les quantités ne sont pas gardées.'],
    admin:['<b>Choisir les documents</b>, en haut à droite : les documents proposés ici.',
      'Préférez des PDF : un document Word s’imprime depuis son logiciel.']},
  annuaire:{titre:'Annuaire',
    but:'Les structures partenaires et leurs contacts. Ils servent à préparer les mails et à remplir les courriers.',
    etapes:['Cherchez par nom, contact, ville, mail ou téléphone.',
      'Filtrez par type (<b>Tous les types</b>) ou cochez <b>Avec un mail</b>.',
      'Cliquez sur une adresse pour préparer un mail ; l’icône à côté la copie.',
      'Après une recherche ou un filtre : <b>Écrire à tous</b> ou <b>Copier les adresses</b>.',
      '<b>Exporter</b> : en tableur, en carnet d’adresses ou en vCard.'],
    admin:['<b>Ajouter</b> une fiche, ou <b>Importer</b> des contacts (Outlook, Gmail, tableur).',
      'Le crayon, au bout de chaque ligne, modifie ou supprime la fiche.',
      '<b>Doublons</b> (s’il y en a) : réunir les fiches en double.',
      'Après un filtre par type : <b>Renommer ce type</b>.']},
  adminForms:{titre:'Formulaires et modèles',
    but:'L’admin choisit ici les formulaires proposés à l’équipe : modèles prêts à l’emploi, formulaires intégrés et formulaires de la structure.',
    etapes:['<b>Bibliothèque de modèles</b> : <b>Ajouter</b> en fait une copie, que vous pouvez modifier. Faites relire le texte avant usage.',
      '<b>Formulaires intégrés</b> : <b>Masquer</b> les retire de la liste de l’équipe, <b>Proposer</b> les remet. Les boutons à côté mènent à leurs réglages.',
      '<b>Formulaires</b> : <b>Modifier</b>, <b>Dupliquer</b> ou supprimer ceux de la structure.',
      '<b>Créer un formulaire</b> : des champs à remplir et un texte modèle.'],
    admin:['Ce qui est enregistré ici vaut pour tous les postes.',
      'Les autres onglets de l’administration : <b>Mots de la recherche</b> et <b>Réglages</b>.']},
  editeur:{titre:'Créer ou modifier un formulaire',
    but:'Un formulaire, ce sont des champs que l’équipe remplit et un texte modèle où ces champs viennent se placer. Librejo en fait un PDF à l’en-tête de la structure.',
    etapes:['Donnez un <b>Titre</b> (imprimé en haut du PDF), une <b>Description</b> et la <b>Rubrique des formulaires</b>.',
      '<b>Champs à remplir</b> : un nom et un type pour chacun (texte, date, nombre, choix, professionnel de l’équipe). Ne demandez que le nécessaire.',
      '<b>Texte du document</b> : écrivez le texte et placez les champs entre accolades, par exemple <code>{Initiales}</code>.',
      'Vérifiez l’aperçu à droite : <b>Ce que remplit l’équipe</b> ou <b>Le PDF</b>.',
      'Cliquez sur <b>Enregistrer le formulaire</b>.'],
    admin:['Le formulaire enregistré apparaît dans la page <b>Formulaires</b>, pour tous les postes.']},
  syn:{titre:'Mots de la recherche',
    but:'Des groupes de mots équivalents : chercher l’un des mots trouve aussi les autres.',
    etapes:['Écrivez un groupe par ligne, mots séparés par des virgules (par exemple <code>CMU, C2S, complémentaire santé</code>).',
      'Cliquez sur <b>Enregistrer</b>.',
      '<b>Remettre la liste de départ</b> si vous voulez repartir de zéro.'],
    admin:['La liste vaut pour la recherche de tous les postes.']},
  checks:{titre:'Vérifications du poste',
    but:'Librejo vérifie le navigateur, l’autorisation d’accès au dossier et le type de dossier, puis dit quoi faire.',
    etapes:['Lisez chaque ligne : coche verte, tout va bien ; orange ou rouge, un point à régler.',
      'Sous chaque point, la marche à suivre.',
      '<b>Copier pour l’informatique</b> : le résultat, à coller dans un mail. Il ne contient aucune donnée de personne.',
      '<b>Signaler un problème</b> : prépare un mail avec ce résultat, la version et le navigateur. Décrivez ce qui ne marche pas, puis envoyez.',
      '<b>Lecteur réseau…</b> : si le lecteur du NAS (Z:, X:…) disparaît au démarrage, Librejo prépare un programme de réparation pour ce poste.',
      '<b>Relancer</b> après une correction, puis <b>Fermer</b>.']},
  defaut:{
    but:'Chaque bouton indique ce qu’il fait. Librejo n’enregistre rien sur les personnes accompagnées.',
    etapes:['Le menu à gauche mène aux grandes parties : <b>Accueil</b>, <b>Formulaires</b>, <b>Impression rapide</b>, <b>Annuaire</b>.',
      'Les champs marqués « (facultatif) » peuvent rester vides.',
      'Perdu ? Cliquez sur <b>Accueil</b>.',
      'Le <b>Mode d’emploi</b>, en bas du menu, présente Librejo en trois écrans.']}
};
/* Formulaires intégrés : un objet par formulaire (clé = id de BUILTIN_FORMS) */
const AIDE_FORMS={
  __ccas:{
    but:'Un bon remis à la personne (ou envoyé) pour son accueil au CCAS : qui elle est, pourquoi on l’oriente, qui contacter dans la structure.',
    etapes:['<b>Destinataire</b> : choisissez le CCAS dans l’annuaire, ou écrivez son nom.',
      '<b>Personne orientée</b> : civilité, nom, prénom. Le reste seulement si c’est utile à la démarche.',
      '<b>Motif de l’orientation</b> : cliquez sur un ou plusieurs motifs, ajoutez des précisions si besoin.',
      '<b>Contact et signature</b> : la personne à joindre dans la structure, et qui signe.',
      'Cliquez sur <b>Créer le bon (PDF)</b>, puis <b>Imprimer</b> pour le remettre à la personne, ou <b>Envoyer par mail</b>.'],
    admin:['Les CCAS proposés sont les fiches de l’annuaire dont le nom ou le type contient « CCAS » ou « action sociale ».']},
  __urg:{
    but:'Un courrier pour l’équipe des urgences, remis à la personne ou envoyé : motif, traitements, éléments utiles et contact dans la structure.',
    etapes:['<b>Hôpital</b> : l’hôpital, le service, la date et l’heure.',
      '<b>Personne orientée</b> : civilité, nom, prénom.',
      '<b>Motif de l’orientation</b> : à remplir. Le reste (constantes, antécédents, traitements, allergies, consommations) si vous l’avez.',
      '<b>Contact et signature</b> : qui joindre dans la structure, et qui signe.',
      'Cliquez sur <b>Créer le courrier (PDF)</b>, puis <b>Imprimer</b> ou <b>Envoyer par mail</b>.']},
  __el:{
    but:'Une page blanche à l’en-tête de la structure : vous écrivez ce que vous voulez. Seule la date est ajoutée d’office.',
    etapes:['Vérifiez la <b>Date</b>.',
      'Remplissez ce qui sert : <b>Titre en haut à droite</b>, <b>Destinataire</b>, <b>Objet</b>, <b>Texte</b>, <b>Signature</b>. Laissez vide le reste.',
      'Il faut au moins un titre ou un texte.',
      'Cliquez sur <b>Créer le document (PDF)</b>.',
      AIDE_FIN]},
  __cp:{
    but:'Une lettre à l’en-tête de la structure pour un partenaire, un service ou une administration. Pour un médecin, au sujet d’un patient : « Courrier au médecin traitant ».',
    etapes:['<b>Destinataire</b> : choisissez-le dans l’annuaire, ou écrivez son nom et son adresse.',
      '<b>Objet</b> et <b>Formule d’appel</b>, puis le <b>Texte du courrier</b>. La formule de politesse est ajoutée à la fin.',
      '<b>Signature</b> : le signataire, son nom et sa fonction.',
      'Cliquez sur <b>Créer le courrier (PDF)</b>.',
      AIDE_FIN]},
  __att:{
    but:'Atteste qu’une personne est suivie, pour le SPIP, le juge, un employeur ou un hébergement. Elle n’atteste que la présence et la régularité du suivi : aucune information médicale.',
    etapes:['<b>Signataire</b> : un médecin, ou le nom et la fonction du professionnel qui signe.',
      '<b>Personne suivie</b> : civilité, nom, prénom, date de naissance.',
      '<b>Suivi</b> : le cadre et la date de début ; les rendez-vous honorés et leur rythme si c’est utile.',
      'Cliquez sur <b>Créer l’attestation (PDF)</b>.',
      AIDE_FIN]},
  __mt:{
    but:'Un courrier médical au médecin traitant, avec l’accord du patient : information de suivi, compte rendu, demande d’avis ou fin de suivi.',
    etapes:['<b>Destinataire</b> : le médecin, son adresse, la date et l’<b>Objet</b>.',
      '<b>Patient</b> : civilité, nom, prénom, date de naissance.',
      '<b>Courrier</b> : le <b>Texte du courrier</b>, les traitements, et la <b>Demande ou conclusion</b>.',
      'Cliquez sur <b>Créer le courrier (PDF)</b>.',
      'Imprimez-le et signez-le pour un envoi postal, ou envoyez-le. Pour des données de santé, préférez une messagerie MSSanté.']},
  __cl:{
    but:'Un certificat « Je soussigné(e), Dr X, certifie que… » : vous choisissez le médecin et la date, et vous écrivez la suite.',
    etapes:['<b>Médecin et date</b> : choisissez le médecin qui signe.',
      '<b>Patient</b> : facultatif, sauf si vous cochez « certifie avoir examiné ce jour ».',
      '<b>Texte</b> : écrivez la <b>Suite du texte</b>. Le début de la phrase est affiché au-dessus.',
      'Cliquez sur <b>Créer le certificat (PDF)</b>, imprimez-le et signez-le.']},
  __cmi:{
    but:'Le certificat médical initial d’une personne majeure victime de violences, inspiré du modèle de l’Ordre des médecins : décrire sans interpréter.',
    etapes:['<b>Examen</b> : date, heure et lieu.',
      '<b>Personne examinée</b> : identité, et l’interprète s’il y en a un.',
      'Les parties <b>A</b> à <b>E</b> : dires de la personne, doléances, examen clinique, état antérieur, ITT en jours.',
      '<b>Photographies</b> : ajoutez les photos ; elles vont en annexe du PDF.',
      '<b>Remise</b> : à qui le certificat est remis. Puis <b>Créer le certificat (PDF)</b>.']},
  __relais:{
    but:'Adresser un patient à un autre CSAPA, ou à un médecin qui prendra le relais de la prescription du traitement de substitution (TSO).',
    etapes:['<b>Destinataire</b> : le CSAPA ou le médecin qui prend le relais.',
      '<b>Patient</b> : identité et <b>Motif du relais</b>.',
      '<b>Traitement de substitution</b> : molécule, posologie, dernière délivrance, pharmacie, dernier ECG.',
      '<b>Éléments médicaux</b> : antécédents, allergies, autres traitements, consommations.',
      'Cliquez sur <b>Créer le PDF et préparer l’envoi</b>.']},
  __deliv:{
    but:'L’attestation envoyée au CSAPA de suivi quand un patient est venu chercher son traitement (méthadone, buprénorphine) chez vous. Seulement ce qui est utile au CSAPA : pas de nom.',
    etapes:['<b>Pour qui ?</b> : choisissez le CSAPA de suivi, ou <b>Autre…</b>.',
      'Pour chaque patient : civilité, initiales, date de naissance, traitement, dose par jour et dates de délivrance.',
      '<b>Ajouter un patient</b> si plusieurs patients sont suivis par le même CSAPA.',
      'Cliquez sur <b>Préparer l’envoi</b> : un PDF par patient, joints au même mail.']},
};
/* Réglages : une entrée par section (clé = section des réglages) */
const AIDE_REGLAGES={
  structure:{titre:'Réglages : Structure',
    but:'Les informations administratives de la structure (adresse, SIRET, agrément, responsable…). Elles ne servent qu’à pré-remplir les Cerfa.',
    etapes:['Remplissez ce que vous avez. Une case laissée vide restera vide sur le Cerfa.',
      'En gris : ce que Librejo a déjà trouvé, à confirmer.',
      'Cliquez sur <b>Enregistrer les réglages</b>.']},
  courriers:{titre:'Réglages : Mes courriers',
    but:'L’allure de tous les PDF produits : papier à en-tête, signature, tampon.',
    etapes:['<b>Texte sous le logo</b> et <b>Bas de page</b> : une ligne par ligne.',
      'Choisissez la place du logo, sa taille, l’alignement, la police et les couleurs : l’aperçu se met à jour.',
      '<b>Ouvrir en grand</b> pour vérifier une page entière.',
      '<b>Tampon de la structure</b> : une image PNG, imprimée sous la signature.',
      'Cliquez sur <b>Enregistrer les réglages</b>.']},
  fichiers:{titre:'Réglages : Mes fichiers',
    but:'La règle que Librejo suit pour nommer les fichiers qu’il range et les dossiers de catégorie. Les fichiers déjà rangés gardent leur nom.',
    etapes:['Choisissez le <b>Modèle de nom de fichier</b> et le séparateur <b>Entre les mots du titre</b>.',
      'Choisissez le <b>Nom des nouveaux dossiers de catégorie</b>, et vérifiez l’exemple.',
      'Cliquez sur <b>Enregistrer les réglages</b>.',
      'Ensuite seulement, <b>Renommer les fichiers déjà rangés…</b> applique la règle aux fichiers existants. Ils restent à leur place.']},
  apparence:{titre:'Réglages : Apparence',
    but:'Les couleurs et le logo de l’application, pour tous les postes.',
    etapes:['Choisissez le <b>Style du menu</b>, la <b>Couleur du menu et des titres</b> et la <b>Couleur des boutons et des repères</b>. L’aperçu est immédiat, sur ce poste.',
      'Une couleur trop pâle est corrigée pour rester lisible ; Librejo affiche celle qui est appliquée.',
      '<b>Logo de la structure</b> : PNG ou JPEG, 2 Mo au plus ; choisissez ce qui s’affiche <b>Dans le menu</b>.',
      'Cliquez sur <b>Enregistrer les réglages</b> : les couleurs passent alors sur tous les postes.']},
  mail:{titre:'Réglages : Mail',
    but:'La façon dont Librejo prépare les mails, et les adresses qu’il propose.',
    etapes:['<b>Envoi des mails</b> : l’application Outlook du poste, ou Outlook dans le navigateur.',
      '<b>Adresses proposées pour les documents</b> : une par ligne.',
      '<b>Destinataires de la délivrance</b> (si ce formulaire est proposé) : les CSAPA et leurs adresses.',
      '<b>Adresse pour « Signaler un problème »</b> (facultatif) : par défaut, l’équipe Librejo (librejo@proton.me). Mettez une autre adresse si quelqu’un s’en occupe dans votre structure. Le mail préparé contient la version, le navigateur et les vérifications du poste, jamais de données sur les personnes.',
      'Cliquez sur <b>Enregistrer les réglages</b>.',
      '<b>Signature Outlook au-dessus du texte</b> : c’est Outlook qui l’ajoute en ouvrant le mail préparé, Librejo ne peut pas l’empêcher. Dans Outlook : Fichier › Options › Courrier › Signatures, et pour <b>Nouveaux messages</b>, choisissez <b>(aucune)</b>. À faire sur chaque poste.']},
  equipe:{titre:'Réglages : Équipe',
    but:'Les professionnels proposés dans les formulaires, et les médecins qui signent.',
    etapes:['<b>Professionnels de l’équipe</b> : nom, fonction et coordonnées professionnelles. L’équipe les choisit dans les formulaires.',
      '<b>Médecins (signature et RPPS)</b> : le nom et le RPPS de chaque médecin. À mettre à jour à chaque arrivée ou départ.',
      '<b>Lignes imprimées sous le nom et le RPPS</b> : par exemple le nom de la structure.',
      'Cliquez sur <b>Enregistrer les réglages</b>.']},
  securite:{titre:'Réglages : Accès',
    but:'Le mot de passe du mode admin, et l’assistant de démarrage.',
    etapes:['<b>Nouveau mot de passe admin</b> : laissez vide pour garder l’actuel. Librejo n’en garde qu’une empreinte, il ne peut donc pas être affiché ; en cas d’oubli, un admin encore connecté en choisit un nouveau. Il évite les fausses manipulations ; ce sont les droits d’accès au dossier qui protègent réellement les documents.',
      '<b>Relancer l’assistant</b> pour revoir d’un coup la structure, l’équipe, les catégories, les modèles et le mail.',
      'Cliquez sur <b>Enregistrer les réglages</b>.']}
};
const AIDE_REG_ADMIN=['Les réglages valent pour tous les postes une fois enregistrés.',
  'Vous changez de section ou de page sans enregistrer ? Librejo vous le demande. <b>Annuler les modifications</b> revient en arrière.'];
/* Assistant de démarrage : une entrée par étape (dans l'ordre de WZ_STEPS) */
const AIDE_WIZ=[
  {but:'L’assistant prépare Librejo pour votre structure en quelques minutes : en-tête des documents, équipe, catégories, modèles, mail, mot de passe.',
    etapes:['Lisez les <b>Vérifications</b> : elles disent si ce poste est prêt.',
      'Cliquez sur <b>Commencer</b>.',
      'À tout moment, <b>Continuer plus tard</b> : l’assistant reprendra là où vous en étiez.']},
  {but:'Ces informations forment l’en-tête et le bas de page de tous vos documents.',
    etapes:['Indiquez le <b>Nom de la structure</b> et le <b>Type de structure</b> : ils sont demandés.',
      'Ajoutez l’adresse, le téléphone et le mail. SIRET et FINESS sont facultatifs.',
      '<b>Logo</b> : une image PNG ou JPEG, si vous l’avez.',
      'Regardez l’aperçu du courrier, puis cliquez sur <b>Suivant</b>.']},
  {but:'La signature habituelle des courriers, et les médecins qui signent certificats et en-têtes d’ordonnance.',
    etapes:['Écrivez la <b>Signature habituelle des courriers</b>.',
      'Répondez : des médecins prescrivent-ils dans votre structure ?',
      'Si oui : le nom et le RPPS (11 chiffres) de chacun, avec <b>Ajouter un médecin</b>.',
      'Si non, les formulaires médicaux ne seront pas proposés. Vous pourrez les activer plus tard.']},
  {but:'Les catégories où ranger vos documents, et la façon de nommer les fichiers.',
    etapes:['Renommez, retirez (×) ou ajoutez des catégories avec <b>Ajouter une catégorie</b>.',
      'Choisissez le <b>Nom des fichiers</b>, le séparateur et le <b>Nom des dossiers</b> : l’exemple se met à jour.',
      'Cliquez sur <b>Suivant</b>. Les dossiers seront créés tout seuls.']},
  {but:'Des formulaires et des liens prêts à l’emploi, cochés selon votre type de structure.',
    etapes:['Cochez ou décochez les rubriques de modèles.',
      'Chaque modèle reste modifiable ensuite.',
      'Faites relire les modèles par votre direction avant de les utiliser.']},
  {but:'La façon dont Librejo prépare vos mails. Librejo n’envoie jamais rien lui-même.',
    etapes:['Choisissez : Outlook installé sur les postes, une messagerie web, ou pas de mail.',
      'Indiquez les <b>Adresse(s) d’envoi de l’équipe</b>, une par ligne.',
      '<b>Tester</b> prépare un mail d’essai, sans rien envoyer.']},
  {but:'Le mot de passe du mode admin, qui permet d’ajouter et de modifier les documents.',
    etapes:['Choisissez un mot de passe de 6 caractères au moins, sans rapport avec le nom de la structure.',
      'Saisissez-le une deuxième fois dans <b>À nouveau</b>.',
      'Ce mot de passe évite les fausses manipulations. Librejo n’en garde qu’une empreinte : personne ne peut le relire dans le dossier.']},
  {but:'Le récapitulatif, avant que Librejo écrive les réglages dans le dossier de la structure.',
    etapes:['Relisez chaque ligne. Cliquez sur une étape, à gauche, pour y revenir.',
      'Cliquez sur <b>C’est parti</b>.',
      'Ensuite, suivez la liste de démarrage sur l’accueil.']}
];
/* ---------- Aide : quel écran est affiché ? ---------- */
const aideR=(k,extra)=>({k,...AIDE[k],...(extra||{})});
function aideForm(bf){
  const t=AIDE_FORMS[bf.id]||AIDE.modele;
  const admin=[`La barre <b>Mode admin</b>, en haut du formulaire, mène à ce qui le règle : ${bf.sets.map(k=>'<b>'+esc(SETTINGS[k].l)+'</b>').join(', ')}.`,
    '<b>Épingler à l’accueil</b>, dans la même barre, le met dans « Les plus utilisés ».',
    'Administration › Formulaires et modèles › <b>Masquer</b> le retire de la liste de l’équipe.',...(t.admin||[])];
  return {k:'form:'+bf.id,titre:bf.titre,but:t.but,etapes:t.etapes,admin};
}
function aideModele(f){
  const lib=!!f.modele_src, d=String(f.description||'').trim();
  return {k:'modele:'+f.id,titre:f.titre||'Formulaire',
    but:(d?esc(d):AIDE.modele.but)+(lib?' Ce formulaire vient de la bibliothèque de modèles de Librejo : relisez le document avant de le remettre.':''),
    etapes:AIDE.modele.etapes,
    admin:[...AIDE.modele.admin,...(lib?['C’est une trame de la bibliothèque : faites relire son texte (direction, juriste ou médecin) avant usage.']:[])]};
}
function aideCtx(){
  const wz=document.getElementById('wiz');
  if(wz&&!wz.hidden&&WZ){ const s=Math.min(Math.max(+WZ.step||0,0),WZ_STEPS.length-1);
    return {k:'wiz:'+s,titre:'Assistant de démarrage : '+WZ_STEPS[s],sous:`Étape ${s+1} sur ${WZ_STEPS.length}`,...AIDE_WIZ[s],fenetre:true}; }
  const md=$('#modal'), box=$('#modal-box');
  if(!md.hidden&&box){
    if(box.classList.contains('deliver')){ const t=box.querySelector('#modal-title'); return aideR('pret',{titre:(t&&t.textContent.trim())||'Document prêt',fenetre:true}); }
    if(box.querySelector('#ck-box')) return SANS?aideR('sans',{k:'sans-pourquoi',fenetre:true}):aideR('checks',{fenetre:true});
  }
  return aidePage();
}
/* L'écran affiché, sans les fenêtres : sert à l'aide et au titre du document */
function aidePage(){
  if(tab==='docs'){
    if(String(query||'').trim()) return aideR('recherche',{saisie:true});
    if(filter==='recent') return aideR('accueil',{saisie:true});
    if(filter==='kits') return aideR('kits');
    const [fc,fs]=splitDest(filter); return aideR('categorie',{k:'cat:'+filter,titre:(catName(fc)||'Catégorie')+(fs?' › '+fs:'')});
  }
  if(tab==='forms'){
    if(formView&&String(formView).startsWith('cerfa:')){ const d=DATA.documents.find(x=>'cerfa:'+x.id===formView); return aideR('cerfa',{k:'cerfa:'+formView,titre:(d&&d.titre)||'Cerfa pré-rempli'}); }
    const f=formView&&DATA.formulaires.find(x=>x.id===formView); if(f) return aideModele(f);
    return aideR(SANS?'sans':'formulaires');
  }
  const bf=BUILTIN_FORMS.find(x=>x.tab===tab); if(bf) return aideForm(bf);
  if(tab==='semaine') return aideR('semaine');
  if(tab==='annu') return aideR('annuaire');
  if(tab==='admin'){
    if(asub==='forms') return aideR(fdraft?'editeur':'adminForms');
    if(asub==='syn') return aideR('syn');
    const r=AIDE_REGLAGES[rsec]; if(r) return {k:'reg:'+rsec,...r,admin:AIDE_REG_ADMIN};
  }
  const h=document.querySelector('main>section.panel:not([hidden]) h2.sec');
  return aideR('defaut',{k:'defaut:'+tab,titre:(h&&h.textContent.trim())||($('#pagetitle')||{}).textContent||'Librejo'});
}
/* ---------- Aide : bouton, panneau, clavier ---------- */
const AIDE_ICO=svg('<path d="M9 9.2a3 3 0 0 1 5.8 1c0 2-3 2.6-3 4.6"/><path d="M12 18.4h.01"/>');
let aideBtn=null, aidePan=null, aideOn=false, aideKey='', aideOpener=null, aideT=0, aideEscOverlay=false;
function aideHTML(c){
  const adm=isAdmin&&!SANS&&c.admin&&c.admin.length, guide=!c.fenetre&&$('#modal').hidden;
  return `<div class="aide-h"><div><h2 id="aide-t" tabindex="-1">${esc(c.titre||'Librejo')}</h2>${c.sous?`<p class="aide-sous">${esc(c.sous)}</p>`:''}</div>
      <button type="button" class="secondary sm" id="aide-x">Fermer</button></div>
    <div class="aide-b" tabindex="0" role="region" aria-label="Explications de l’aide">
      <h3>À quoi sert cette page</h3><p>${c.but}</p>
      <h3>Comment faire</h3><ol class="aide-steps">${(c.etapes||[]).map(x=>`<li><span>${x}</span></li>`).join('')}</ol>
      ${c.saisie?`<h3>Sur ce poste</h3><label class="check plain aide-pref"><input type="checkbox" id="aide-saisie"${saisieLibre?' checked':''}> <span>Taper une lettre sur l’accueil, sans avoir cliqué nulle part, l’écrit dans la recherche</span></label>`:''}
      ${DEMO?`<section class="aide-adm aide-demo" aria-labelledby="aide-demo-t"><h3 id="aide-demo-t">Démo</h3><p>Vous essayez Librejo avec une structure fictive, l’Association des Tilleuls. Le bandeau en haut de l’écran le rappelle.</p><ul>
        <li>Tout marche comme en vrai : formulaires et PDF, impression, mail (le fichier .eml est téléchargé, rien n’est envoyé), annuaire, réglages, mode admin.</li>
        <li><b>Mot de passe admin : test.</b></li>
        <li>Tout reste dans ce navigateur : rien n’est envoyé, rien n’est partagé avec d’autres visiteurs. N’y mettez aucune donnée réelle.</li>
        <li><b>Remettre à zéro</b> efface vos essais et recharge la démo neuve. <b>Quitter la démo</b> revient à Librejo sur ce poste, tel qu’il était.</li>
        <li>Pour votre structure : <a href="${esc(DEMO.installer)}">Installer Librejo</a>.</li></ul></section>`:''}
      ${adm?`<section class="aide-adm" aria-labelledby="aide-adm-t"><h3 id="aide-adm-t">En mode admin</h3><p>Ce que vous pouvez régler ici :</p><ul>${c.admin.map(x=>`<li>${x}</li>`).join('')}</ul></section>`:''}
    </div>
    <div class="aide-f">${guide?'<button type="button" class="linkbtn" id="aide-guide">Ouvrir le mode d’emploi complet</button>':''}<button type="button" class="linkbtn" id="aide-report">Signaler un problème</button><small>Touche <kbd>F1</kbd> : ouvrir ou fermer l’aide · <kbd>Échap</kbd> : fermer l’aide, puis la fenêtre</small></div>`;
}
/* L'aide suit la fenêtre ouverte (assistant, fenêtre de dialogue) : elle y est rattachée pour rester atteignable au clavier */
function aideHost(){
  if(!aideBtn) return;
  const wz=document.getElementById('wiz'), md=$('#modal');
  const host=wz&&!wz.hidden?wz:!md.hidden?md:document.body;
  if(aideBtn.parentNode===host&&aidePan.parentNode===host) return;
  const a=document.activeElement, onBtn=a===aideBtn, inPan=aidePan.contains(a);
  host.appendChild(aideBtn); host.appendChild(aidePan);
  if(onBtn) aideBtn.focus(); else if(inPan){ const t=$('#aide-t'); t&&t.focus(); }
}
function aideDraw(c){ aideKey=c.k+(isAdmin?'|admin':''); aidePan.innerHTML=aideHTML(c); }
function aideShow(){
  aideOpener=document.activeElement; aideOn=true; aideDraw(aideCtx());
  aidePan.hidden=false; aideBtn.setAttribute('aria-expanded','true'); document.body.classList.add('aide-on');
  aideHost(); const t=$('#aide-t'); t&&t.focus();
}
function aideHide(){
  if(!aideOn) return;
  aideOn=false; aidePan.hidden=true; aidePan.innerHTML=''; aideBtn.setAttribute('aria-expanded','false'); document.body.classList.remove('aide-on');
  /* le focus revient au bouton « ? » ; ouverte par F1 depuis un champ, l'aide rend la main à ce champ */
  const o=aideOpener; aideOpener=null;
  (o&&o!==document.body&&o.isConnected&&!aidePan.contains(o)&&o.offsetParent!==null?o:aideBtn).focus();
}
function aideToggle(viaKey){ if(aideOn){ aideHide(); return; } aideShow(); if(!viaKey) aideOpener=aideBtn; }
/* Changement d'écran (onglet, formulaire, section des réglages, étape de l'assistant…) : l'aide se met à jour */
/* Titre de l'onglet du navigateur : l'écran affiché (« Bon d'orientation CCAS – Librejo »,
   « Réglages › Apparence – Librejo »), pour le lecteur d'écran, l'historique et la barre des tâches (WCAG 2.4.2) */
function titleSync(){
  let t;
  const wz=document.getElementById('wiz');
  if(wz&&!wz.hidden) t='Assistant de démarrage';
  else { const c=aidePage(); t=String(c.titre||'').trim()||'Accueil';
    if(/^Réglages\s*:/.test(t)) t=t.replace(/^Réglages\s*:\s*/,'Réglages › ');
    else if(tab==='admin') t='Administration › '+t;
    else if(c.k==='recherche') t='Recherche « '+String(query||'').trim()+' »';
    else if(String(c.k).startsWith('cat:')) t='Documents › '+t;
    if(SANS&&c.k!=='sans') t+=' (formulaires seulement)'; }
  if(DEMO) t+=' (démo)';
  t+=' – Librejo';
  if(document.title!==t) document.title=t;
}
function aideRefresh(){
  titleSync();
  aideHost();
  if(!aideOn) return;
  const c=aideCtx(), k=c.k+(isAdmin?'|admin':''); if(k===aideKey) return;
  const inPan=aidePan.contains(document.activeElement);
  aideDraw(c); if(inPan){ const t=$('#aide-t'); t&&t.focus(); }
}
function aideInit(){
  aideBtn=document.createElement('button'); aideBtn.type='button'; aideBtn.id='aidebtn';
  aideBtn.setAttribute('aria-label','Aide sur cette page'); aideBtn.title='Aide sur cette page (F1)';
  aideBtn.setAttribute('aria-keyshortcuts','F1'); aideBtn.setAttribute('aria-expanded','false'); aideBtn.setAttribute('aria-controls','aide');
  aideBtn.innerHTML=AIDE_ICO;
  aidePan=document.createElement('aside'); aidePan.id='aide'; aidePan.hidden=true; aidePan.setAttribute('aria-label','Aide sur cette page');
  document.body.append(aideBtn,aidePan); document.body.classList.add('has-aide');
  aideBtn.addEventListener('click',()=>aideToggle(false));
  aidePan.addEventListener('click',e=>{
    if(e.target.closest('#aide-x')){ aideHide(); return; }
    if(e.target.closest('#aide-guide')){ aideOpener=null; aideHide(); openGuide(0); }
    if(e.target.closest('#aide-report')){ aideHide(); ljChecks({}).then(reportProblem,()=>reportProblem([])); }
  });
  aidePan.addEventListener('change',e=>{ if(e.target.id==='aide-saisie'){ saisieSet(e.target.checked); toast(e.target.checked?'Saisie libre activée sur ce poste':'Saisie libre coupée sur ce poste : cliquez dans la recherche, ou appuyez sur /'); } });
  /* taper une lettre dans le panneau ne doit pas lancer la recherche de la page */
  aidePan.addEventListener('keydown',e=>{ if(e.key.length===1&&e.key!=='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey) e.stopPropagation(); });
  /* F1 (au lieu de l'aide du navigateur) et Échap : avant les autres raccourcis */
  document.addEventListener('keydown',e=>{
    if(e.key==='F1'){ e.preventDefault(); e.stopImmediatePropagation(); if(document.getElementById('pdfprev')||document.getElementById('cfdlg')) return; aideToggle(true); return; }
    if(e.key!=='Escape'||!aideOn) return;
    if(aidePan.contains(e.target)||e.target===aideBtn){ e.preventDefault(); e.stopImmediatePropagation(); aideHide(); return; }
    /* Échap ferme une couche à la fois, celle du dessus d'abord : un menu ou une liste ouverts, l'aperçu d'un PDF,
       la fenêtre de conflit ou une confirmation passent avant l'aide ; l'aide passe avant la page et les fenêtres
       (« Document prêt », assistant…), qu'un second Échap ferme ensuite. */
    aideEscOverlay=!!document.getElementById('menu')||!!document.getElementById('pdfprev')||!!document.getElementById('cfdlg')||!!document.getElementById('mguard')||!!(e.target.closest&&e.target.closest('details.ab-more[open]'));
    if(!aideEscOverlay){ e.preventDefault(); e.stopImmediatePropagation(); aideHide(); }
  },true);
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&aideOn&&!aideEscOverlay&&!e.defaultPrevented) aideHide(); aideEscOverlay=false; });
  new MutationObserver(ms=>{
    if(ms.every(m=>aidePan.contains(m.target)||m.target===aideBtn)) return;
    aideHost(); // une fenêtre s'ouvre ou se ferme : l'aide la suit tout de suite (avant que le focus y revienne)
    clearTimeout(aideT); aideT=setTimeout(aideRefresh,60);
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-selected','aria-pressed','aria-current']});
}

/* ---------- Démarrage ---------- */
$('#gen-ver').textContent='Version du '+frDate(DOCUBUS_VERSION.slice(0,10));
$('#gen-info').textContent=DATA.maj?`Liste des documents mise à jour le ${frDate(DATA.maj)}${String(DATA.maj).length>10?' à '+String(DATA.maj).slice(11).replace(':',' h '):''}`:'';
if(!FSA&&!SANS){ $('#gen-info').textContent='Pour imprimer en un clic et administrer, ouvrez Librejo avec Microsoft Edge ou Google Chrome.'; $('#gen-info').hidden=false; }
if(SANS) sdStart();
if(DEMO) demoStart();
setAdmin(isAdmin);
setTab(tab);
renderDocs();
renderDeliv();
updateConn();
aideInit();
titleSync();
if(window.LJ_CHOIX==='dossier'&&!wizNeeded()) setTimeout(()=>checksAfterPick().catch(e=>console.warn('vérifications',e)),700);
else setTimeout(()=>cfStartup().catch(e=>console.warn('modifications simultanées',e)),900);
})();
