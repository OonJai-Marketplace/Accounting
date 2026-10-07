/* Device-local appearance only. Financial data and printed document styles stay intact. */
(()=>{'use strict';
 const key='ojm-appearance14287',root=document.documentElement;
 let mode='dark';try{mode=localStorage.getItem(key)==='light'?'light':'dark'}catch{}
 function apply(value,persist=false){
  mode=value==='light'?'light':'dark';root.dataset.appearance14287=mode;
  if(persist)try{localStorage.setItem(key,mode)}catch{}
  document.querySelectorAll('[data-theme-toggle14287]').forEach(b=>{
   const label=mode==='dark'?'Light mode':'Dark mode';
   b.title='Switch to '+label.toLowerCase();b.setAttribute('aria-label',b.title);
   b.setAttribute('aria-pressed',String(mode==='dark'));
   const text=b.querySelector('span');if(text&&text.textContent!==label)text.textContent=label;
  });
  paintDocument();
 }
 function paintDocument(){
  const frame=document.getElementById('docFrame105');if(!frame)return;
  if(!frame.dataset.appearanceBound14287){frame.dataset.appearanceBound14287='1';frame.addEventListener('load',paintDocument)}
  try{const doc=frame.contentDocument;if(!doc?.head)return;let style=doc.getElementById('appearanceFrame14287');
   if(!style){style=doc.createElement('style');style.id='appearanceFrame14287';doc.head.append(style)}
   const css='@media screen{body{background:'+(mode==='dark'?'#0e281f':'#e7e0d1')+'!important}}';
   if(style.textContent!==css)style.textContent=css;
  }catch{/* Document frames are optional; appearance never blocks editing. */}
 }
 apply(mode);
 const icon='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>';
 function button(id,compact=false){const b=document.createElement('button');b.id=id;b.type='button';b.dataset.themeToggle14287='';b.className='theme-toggle14287 no-print'+(compact?' theme-icon14287':'');b.innerHTML=icon+'<span></span>';b.onclick=()=>apply(mode==='dark'?'light':'dark',true);return b}
 function mount(){
  const dock=document.getElementById('workspaceTools108');if(dock&&!document.getElementById('themeDock14287'))dock.prepend(button('themeDock14287',true));
  const profile=document.querySelector('#appSidebar #topHeaderProfile104,#appSidebar .sidebar-user-footer');
  if(profile&&!document.getElementById('themeSidebar14287'))profile.before(button('themeSidebar14287'));
  const menu=document.querySelector('#phoneAccount1424,#accountMenu');
  if(menu&&!menu.querySelector('[data-theme-toggle14287]')){
   const signout=[...menu.querySelectorAll('button')].find(b=>/sign\s*out/i.test(b.textContent));
   const b=button('themePhone14287');signout?signout.before(b):menu.append(b);
  }
  apply(mode);
 }
 window.OjmAppearance14287={set:value=>apply(value,true),get:()=>mode};
 addEventListener('storage',e=>{if(e.key===key)apply(e.newValue)});
 function start(){mount();let queued=false;new MutationObserver(records=>{
   if(!records.some(r=>r.addedNodes.length))return;
   if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;mount()})}
  }).observe(document.body,{childList:true,subtree:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
