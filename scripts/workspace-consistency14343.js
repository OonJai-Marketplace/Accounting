/* Shared workspace order and dismissal use each component's existing lifecycle. */
(()=>{'use strict';
const visible=n=>n?.isConnected&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';
function layout(){
 if(innerWidth<=640)return;
 for(const panel of document.querySelectorAll('.tab-content')){
  const banner=panel.querySelector(':scope>.area-banner113');if(!banner)continue;
  const rows=[...panel.querySelectorAll(':scope>.workflow-switch14316,:scope>.workspace-tabs14337,:scope>.team-tabs14230,:scope>.personal-tabs1437')];let anchor=banner;for(const tabs of rows.reverse()){if(tabs.nextElementSibling!==anchor)panel.insertBefore(tabs,anchor);anchor=tabs;}
 }
 const card=document.querySelector('.history-shell14343'),search=card?.querySelector(':scope>.history-search14343'),head=card?.querySelector('.history-table14343>.je-card-header');
 if(search&&head){const controls=search.querySelector('.history-controls80');if(controls)head.append(controls);search.hidden=true;}
}
function dismiss(root){
 if(root.tagName==='DIALOG'){root.close();return;}
 if(root.resolve108){root.resolve108(false);return;}
 const buttons=[...root.querySelectorAll('button')].filter(visible);
 const close=buttons.find(b=>/^(close|cancel|×|✕)$/i.test((b.getAttribute('aria-label')||b.textContent).trim()))||root.querySelector('[data-dismiss],.modal-close-x,[data-cancel-year136],[data-close14234]');
 if(close){close.click();return;}
 if(root.classList.contains('modal-backdrop')&&root.id)window.closeModal?.(root.id);
}
let down;
document.addEventListener('pointerdown',e=>{down=e.target},true);
document.addEventListener('click',e=>{
 const target=e.target;if(!(target instanceof Element)||down&&down!==target)return;
 // Native backdrops target the dialog: padding within its rectangle is not outside.
 if(target.matches('dialog[open]')){const r=target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){e.preventDefault();dismiss(target)}return;}
 if(target.matches('.modal-backdrop,[class*="overlay"],[class*="Overlay"]')&&visible(target))dismiss(target);
},true);
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;layout()})}
function reminders(unit){
 const fields=document.getElementById('reminderFields14343');if(!fields)return;
 document.querySelectorAll('[data-reminder-unit14343]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reminderUnit14343===unit)));
 fields.hidden=unit==='none';if(unit==='none'){RecurringStore.pendingReminders=[];renderPendingReminders()}else{document.getElementById('reminderUnit').value=unit;document.getElementById('reminderCountLabel14343').textContent=unit[0].toUpperCase()+unit.slice(1)+' before';document.getElementById('reminderCount').focus()}
}
function ready(){layout();document.querySelectorAll('[data-reminder-unit14343]').forEach(b=>b.onclick=()=>reminders(b.dataset.reminderUnit14343));const reset=window.resetRecurringForm;window.resetRecurringForm=function(...args){const result=reset.apply(this,args);reminders('none');return result};new MutationObserver(schedule).observe(document.querySelector('.workspace-scroll')||document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule)}
window.workspaceConsistency14343={layout,dismiss};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
