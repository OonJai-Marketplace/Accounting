/* Shared workspace order and dismissal use each component's existing lifecycle. */
(()=>{'use strict';
const visible=n=>n?.isConnected&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';
const rowSelector=':scope>.team-tabs14230,:scope>.workflow-switch14316,:scope>.workspace-tabs14337,:scope>.personal-tabs1437';
let sharedHeader,sharedTabs,scrollArea,mainArea,rows=[],observed=new Set();
const sizes=new ResizeObserver(()=>measure());
function measure(){let top=0;for(const row of rows){if(row.style.getPropertyValue('--tab-top14344')!==top+'px')row.style.setProperty('--tab-top14344',top+'px');if(visible(row))top+=row.getBoundingClientRect().height}if(scrollArea&&scrollArea.style.getPropertyValue('--navigation-height14344')!==top+'px')scrollArea.style.setProperty('--navigation-height14344',top+'px')}
function place(panel,node,anchor){if(!node)return anchor;if(anchor){if(anchor.nextElementSibling!==node)anchor.after(node)}else if(panel.firstElementChild!==node)panel.prepend(node);return node}
function layout(){
 if(innerWidth<=640||document.documentElement.dataset.device132==='phone')return;
 scrollArea=document.querySelector('.workspace-scroll');mainArea=document.querySelector('.main-content-area');
 const panel=document.querySelector('.tab-content.active');if(!panel||!scrollArea)return;const settings=document.getElementById('settingsSections14335');if(settings&&panel.dataset.module!=='settings'&&panel.contains(settings))document.getElementById('settings-system')?.prepend(settings);
 sharedHeader||=document.querySelector('.module-header');sharedTabs||=document.getElementById('categoryTabShell');
 const personal=panel.querySelector('#personalWorkspace1437'),personalTabs=personal?.querySelector('.personal-tabs1437');
 for(const old of panel.querySelectorAll(':scope>.personal-tabs1437'))if(old._personalHost14344!==personal)old.remove();
 if(personalTabs){personalTabs._personalHost14344=personal;personalTabs.addEventListener('click',e=>{const b=e.target.closest('[data-personal-tab]');if(b)window.personalJournal1437?.show(personal.dataset.owner,b.dataset.personalTab)});panel.append(personalTabs)}
 const banner=panel.querySelector(':scope>.area-banner113');let anchor=null,next=[];
 if(panel.id==='dashboard'){
  // Dashboard rebuilds its own HTML, so keep the shared controls outside that host.
  for(const node of [sharedHeader,sharedTabs])if(node&&node.parentElement!==mainArea)mainArea.insertBefore(node,scrollArea);
  const shell=panel.querySelector('.dash-shell112'),hero=panel.querySelector('.dash-hero112'),tabs=panel.querySelector('.dash-tabs112');
  if(shell&&hero&&shell.firstElementChild!==hero)shell.prepend(hero);
  if(hero&&tabs){place(shell,tabs,hero);next.push(tabs)}
 }else{
  // Page titles and decorative banners are omitted; navigation is the first row.
  for(const node of [sharedHeader,sharedTabs,panel.dataset.module==='settings'?document.getElementById('settingsSections14335'):null,panel.id==='sub-users-workspace'?document.querySelector('.sub-user-tabs-shell'):null,...panel.querySelectorAll(rowSelector)]){
   if(!node)continue;anchor=place(panel,node,anchor);next.push(node);
  }
 }
 for(const row of rows)if(!next.includes(row)){row.classList.remove('sticky-tabs14344');row.style.removeProperty('--tab-top14344')}
 rows=next;for(const row of rows){if(!row.classList.contains('sticky-tabs14344'))row.classList.add('sticky-tabs14344');if(!observed.has(row)){sizes.observe(row);observed.add(row)}}
 for(const row of observed)if(!row.isConnected){sizes.unobserve(row);observed.delete(row)}
 if(!document.body.classList.contains('scroll-navigation14344'))document.body.classList.add('scroll-navigation14344');measure();
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
function ready(){layout();document.querySelectorAll('[data-reminder-unit14343]').forEach(b=>b.onclick=()=>reminders(b.dataset.reminderUnit14343));const reset=window.resetRecurringForm;window.resetRecurringForm=function(...args){const result=reset.apply(this,args);reminders('none');return result};new MutationObserver(schedule).observe(document.querySelector('.workspace-scroll')||document.body,{childList:true,subtree:true});window.addEventListener('page113',schedule);window.addEventListener('resize',schedule);document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('browser-full14344',!!document.fullscreenElement);schedule()});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']})}
window.workspaceConsistency14343={layout,dismiss};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
