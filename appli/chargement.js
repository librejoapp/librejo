/* Écran de chargement (#lj-load). Lu avant tout le reste : il reprend tout de suite les couleurs de la structure
   gardées sur ce poste à la dernière ouverture, pour que l'application n'apparaisse pas d'abord aux couleurs par défaut.
   L'application le retire quand elle est prête (LJ_LOADED), l'écran d'ouverture aussi ; sinon il s'efface seul après 15 s. */
(function(){
  var KEY='librejo-theme-poste', el=document.getElementById('lj-load'), t0=Date.now();
  try { var c=JSON.parse(localStorage.getItem(KEY)||'null');
    if (c && c.vars){ var st=document.documentElement.style; for (var k in c.vars) if (/^--[a-z0-9-]+$/.test(k) && /^#[0-9a-f]{3,8}$/i.test(c.vars[k])) st.setProperty(k,c.vars[k]);
      if (c.clair) document.documentElement.classList.add('menu-clair');
      if (el){ el.style.setProperty('--ll-a', c.vars['--navy']||'#1F6F6B'); el.style.setProperty('--ll-b', c.vars['--accent']||'#E9A23B'); } } } catch(e){}
  var gone=false;
  window.LJ_LOADED=function(){ if (gone || !el) return; gone=true; var wait=Math.max(0,1000-(Date.now()-t0));
    setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ el.remove(); },450); }, wait); };
  window.LJ_THEME_KEEP=function(vars,clair){ try { localStorage.setItem(KEY, JSON.stringify({vars:vars,clair:!!clair})); } catch(e){} };
  setTimeout(window.LJ_LOADED, 15000);
})();
