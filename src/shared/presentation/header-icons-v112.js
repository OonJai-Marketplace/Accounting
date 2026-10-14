/* Navigation owns icon identity. Banners reuse its icon; section icons are retired. */
(()=>{'use strict';
function decorate(){
 const panel=document.querySelector('.tab-content.active');if(!panel)return;
 const module=window.shell113?.area(panel)||panel.dataset.module;
 const icon=window.shell113?.svg(module)||'';
 for(const heading of panel.querySelectorAll('.area-banner113 h1,.area-banner113 h2,.dash-hero112 h1,.dash-hero112 h2')){
  let mark=heading.querySelector('.banner-icon113');if(!mark){mark=document.createElement('span');mark.className='banner-icon113';mark.setAttribute('aria-hidden','true');heading.prepend(mark)}
  if(mark.innerHTML!==icon)mark.innerHTML=icon;
 }
}
window.headerIcons112={decorate};
window.addEventListener('presentation-ready113',decorate);window.addEventListener('page113',decorate);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',decorate,{once:true});else decorate();
})();
