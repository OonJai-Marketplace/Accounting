/* Requested presentation corrections. Database permissions remain authoritative. */
(()=>{'use strict';
const aliases={'settings-appearance113':'settings-system','settings-backup113':'settings-data14231','settings-recovery113':'settings-data14231'};
function removeLink(id){document.querySelectorAll('#nav-module-settings button').forEach(b=>{if((b.getAttribute('onclick')||'').includes("'"+id+"'"))b.remove()})}
function embed(node,parent){if(!node||!parent)return;node.classList.remove('tab-content','active');node.classList.add('embedded-settings14231');parent.append(node)}
let borderChecks=new WeakMap();
function hasModuleBorder(n){if(n.classList.contains('orange-module14231'))return true;const signature=n.className+'|'+n.getAttribute('style'),old=borderChecks.get(n);if(old&&old.signature===signature&&old.parent===n.parentElement)return old.hasBorder;const hasBorder=parseFloat(getComputedStyle(n).borderTopWidth)>=2;borderChecks.set(n,{signature,parent:n.parentElement,hasBorder});return hasBorder}
// Retain decoration for unchanged surfaces. Table row changes cannot affect these panel borders.
const surfaces=new WeakMap();let decorationVersion=0;
const panels='div,section,article,form,details,fieldset,header,summary,h3,h4';
const dialogs='.modal-dialog,.ui-dialog108,.rec-dialog71,.rec-section71,.pay-dialog95,.v49-review-dialog,.v49-adjust-dialog,.source-dialog69,.scheduled-dialog91,.final-records-dialog';
function dirty(records){let changed=false;for(const r of records){if(r.target.nodeType!==1||r.target.closest('table'))continue;const nodes=[...r.addedNodes,...r.removedNodes].filter(n=>n.nodeType===1);if(!nodes.length)continue;const surface=r.target.closest('.tab-content,'+dialogs);if(surface){surfaces.delete(surface);changed=true}else if(nodes.some(n=>n.matches?.('.tab-content,'+dialogs)||n.querySelector?.('.tab-content,'+dialogs)))changed=true;}return changed}
function orange(all=false){if(all){borderChecks=new WeakMap();decorationVersion++;}
 document.querySelectorAll('#settings-accounting .settings-module94').forEach(n=>{if(n.querySelector('header h4')?.textContent.trim()==='Currency Manager')n.classList.add('currency-manager14232')});
 const roots=[...document.querySelectorAll((all?'.tab-content':'.tab-content.active')+','+dialogs)];
 for(const root of roots){if(surfaces.get(root)===decorationVersion)continue;
 const candidates=[root,...(root.matches('.tab-content')?root.querySelectorAll(panels):[])].filter(n=>!n.closest('.area-banner113,.dash-hero112,.scope-options14233,.scope-picker14233,table')&&hasModuleBorder(n));
 for(const n of candidates)if(!n.classList.contains('orange-module14231'))n.classList.add('orange-module14231');
 for(const n of candidates){const inner=!!n.parentElement.closest('.orange-module14231');const depth=inner?'inner':'outer';if(n.dataset.moduleDepth14232!==depth)n.dataset.moduleDepth14232=depth;n.style.removeProperty('border-top-color');n.style.removeProperty('border-top-style');n.style.removeProperty('border-top-width');}
 surfaces.set(root,decorationVersion);
 }
}

function ready(){const system=document.getElementById('settings-system'),banner=document.getElementById('settings-appearance113');embed(banner,system);removeLink('settings-appearance113');shell113.addSettings('settings-data14231','Archive & Recovery');const combined=document.getElementById('settings-data14231');embed(document.getElementById('settings-backup113'),combined);embed(document.getElementById('settings-recovery113'),combined);removeLink('settings-backup113');removeLink('settings-recovery113');const before=window.switchTab;window.switchTab=function(id,...args){const actual=aliases[id]||id,result=before.call(this,actual,...args);if(actual!==id&&document.getElementById(actual)?.classList.contains('active'))requestAnimationFrame(()=>{const target=document.getElementById(id),scroll=document.querySelector('.workspace-scroll');if(target&&scroll)scroll.scrollTo({top:scroll.scrollTop+target.getBoundingClientRect().top-scroll.getBoundingClientRect().top,behavior:'instant'})});return result};orange();let queued=false;const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;orange()})};new MutationObserver(records=>{if(dirty(records))schedule()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule);window.addEventListener('presentation-ready113',()=>{borderChecks=new WeakMap();decorationVersion++;schedule()});window.addEventListener('resize',()=>{borderChecks=new WeakMap();decorationVersion++;schedule()});window.addEventListener('beforeprint',()=>orange(true));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
