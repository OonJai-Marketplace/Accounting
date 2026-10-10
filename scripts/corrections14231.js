/* Requested presentation corrections. Database permissions remain authoritative. */
(()=>{'use strict';
const aliases={'settings-appearance113':'settings-system','settings-backup113':'settings-data14231','settings-recovery113':'settings-data14231'};
function removeLink(id){document.querySelectorAll('#nav-module-settings button').forEach(b=>{if((b.getAttribute('onclick')||'').includes("'"+id+"'"))b.remove()})}
function embed(node,parent){if(!node||!parent)return;node.classList.remove('tab-content','active');node.classList.add('embedded-settings14231');parent.append(node)}
function orange(){
 document.querySelectorAll('#settings-accounting .settings-module94').forEach(n=>{if(n.querySelector('header h4')?.textContent.trim()==='Currency Manager')n.classList.add('currency-manager14232')});
 const selector='.tab-content :is(div,section,article,form,details,fieldset,header,summary,h3,h4),.tab-content,.modal-dialog,.ui-dialog108,.rec-dialog71,.rec-section71,.pay-dialog95,.v49-review-dialog,.v49-adjust-dialog,.source-dialog69,.scheduled-dialog91,.final-records-dialog';
 const candidates=[...document.querySelectorAll(selector)].filter(n=>!n.closest('.area-banner113,.dash-hero112,.scope-options14233,.scope-picker14233,table')&&(n.classList.contains('orange-module14231')||parseFloat(getComputedStyle(n).borderTopWidth)>=2));
 for(const n of candidates)n.classList.add('orange-module14231');
 for(const n of candidates){const inner=!!n.parentElement.closest('.orange-module14231');n.dataset.moduleDepth14232=inner?'inner':'outer';n.style.removeProperty('border-top-color');n.style.removeProperty('border-top-style');n.style.removeProperty('border-top-width');}
}

function ready(){const system=document.getElementById('settings-system'),banner=document.getElementById('settings-appearance113');embed(banner,system);removeLink('settings-appearance113');shell113.addSettings('settings-data14231','Archive & Recovery');const combined=document.getElementById('settings-data14231');embed(document.getElementById('settings-backup113'),combined);embed(document.getElementById('settings-recovery113'),combined);removeLink('settings-backup113');removeLink('settings-recovery113');const before=window.switchTab;window.switchTab=function(id,...args){const actual=aliases[id]||id,result=before.call(this,actual,...args);if(actual!==id&&document.getElementById(actual)?.classList.contains('active'))requestAnimationFrame(()=>{const target=document.getElementById(id),scroll=document.querySelector('.workspace-scroll');if(target&&scroll)scroll.scrollTo({top:scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top,behavior:'instant'})});return result};orange();let queued=false;new MutationObserver(records=>{if(queued||!records.some(r=>r.addedNodes.length))return;queued=true;requestAnimationFrame(()=>{queued=false;orange()})}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',()=>requestAnimationFrame(()=>orange()));window.addEventListener('resize',()=>orange());}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
