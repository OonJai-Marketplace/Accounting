/* Shared workspace order and dismissal use each component's existing lifecycle. */
(()=>{'use strict';
const visible=n=>n?.isConnected&&n.getClientRects().length&&!n.closest('[hidden]')&&getComputedStyle(n).visibility!=='hidden';
const rowSelector=':scope>.team-tabs14230,:scope>.workflow-switch14316,:scope>.workspace-tabs14337,:scope>.personal-tabs1437';
let sharedHeader,sharedTabs,scrollArea,mainArea,rows=[],observed=new Set();
const rowHeights=new WeakMap();const sizes=new ResizeObserver(entries=>{for(const entry of entries)rowHeights.set(entry.target,entry.borderBoxSize?.[0]?.blockSize??entry.target.getBoundingClientRect().height);measure()});
function measure(){let top=0;const positions=rows.map(row=>{const offset=top;if(!row.hidden&&!row.closest('[hidden]'))top+=rowHeights.get(row)??row.getBoundingClientRect().height;return [row,offset+'px']});for(const [row,value] of positions)if(row.style.getPropertyValue('--tab-top14344')!==value)row.style.setProperty('--tab-top14344',value);if(scrollArea&&scrollArea.style.getPropertyValue('--navigation-height14344')!==top+'px')scrollArea.style.setProperty('--navigation-height14344',top+'px')}

function place(panel,node,anchor){if(!node)return anchor;if(anchor){if(anchor.nextElementSibling!==node)anchor.after(node)}else if(panel.firstElementChild!==node)panel.prepend(node);return node}
function layout(){
 decorateEmptyStates14355(document.querySelector('.tab-content.active'));
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
  // Main tabs lead the page, followed directly by the shared banner.
  for(const node of [sharedHeader,sharedTabs,panel.dataset.module==='settings'?document.getElementById('settingsSections14335'):null,panel.id==='sub-users-workspace'?document.querySelector('.sub-user-tabs-shell'):null,...panel.querySelectorAll(rowSelector)]){
   if(!node)continue;anchor=place(panel,node,anchor);next.push(node);if(node===sharedTabs)anchor=place(panel,banner,anchor);
  }
 }
 if(panel.id==='sub-users-home14229'||panel.id==='sub-users-workspace'){const users=panel.querySelector(':scope>.team-tabs14230');sharedTabs.hidden=true;if(users){place(panel,users,null);place(panel,banner,users)}next=next.filter(n=>n!==sharedTabs)}
 for(const row of rows)if(!next.includes(row)){row.classList.remove('sticky-tabs14344');row.style.removeProperty('--tab-top14344')}
 syncSectionMenus(panel);
 rows=next.filter(row=>!row.classList.contains('section-menu-source14355'));for(const row of rows){if(!row.classList.contains('sticky-tabs14344'))row.classList.add('sticky-tabs14344');if(!observed.has(row)){sizes.observe(row);observed.add(row)}}
 for(const row of observed)if(!row.isConnected){sizes.unobserve(row);observed.delete(row)}
 if(!document.body.classList.contains('scroll-navigation14344'))document.body.classList.add('scroll-navigation14344');measure();

}
// Decorate existing no-data messages without altering their text or table semantics.
function decorateEmptyStates14355(panel){
 if(!panel)return;
 const selector='.period-empty,.legal-doc-empty,.empty82,.empty-archive-state,.dash-empty112,.hr-empty14306,.sub-user-empty-state,.submission-empty,.th-empty,.audit-empty-detail,div.empty,p,td[colspan]';
 for(const node of panel.querySelectorAll(selector)){
  if(node.parentElement.closest('.app-empty14355')||node.closest('[contenteditable="true"],#document-editor105,.doc-preview,.print-only')||node.querySelector('input,select,textarea,table'))continue;
  const text=node.textContent.trim();
  const empty=/^(no\b|nothing\b|there (?:are|is) no\b)/i.test(text)&&text.length<350&&!/\b(error|failed|unable|loading|checking|permission|denied|unavailable)\b|could not|not (?:yet )?loaded/i.test(text);
  node.classList.toggle('app-empty14355',empty);
 }
}
// Secondary workspace choices use a menu anchored to their main horizontal tab.
const sectionRows14355=':scope>.workflow-switch14316,:scope>.workspace-tabs14337,:scope>.personal-tabs1437,:scope>#settingsSections14335';
let sectionMenu14355=null,sectionTrigger14355=null,pendingSection14355='';
const tabKey14355=b=>b?.dataset.teamUser14230||b?.dataset.target||b?.dataset.settingsGroup14332||b?.getAttribute('onclick')||'';
const mainTab14355=()=>document.querySelector('.tab-content.active .team-tabs14230 [aria-current="page"][data-team-user14230]')||document.querySelector('#categoryTabs .category-tab.active,#categoryTabs [aria-selected="true"]');
function sectionRowsFor14355(panel){return [...panel.querySelectorAll(sectionRows14355)].filter(row=>!row.hidden)}
function sectionChoices14355(panel){return sectionRowsFor14355(panel).flatMap(row=>[...row.querySelectorAll('button')]).filter(b=>!b.hidden&&!b.closest('[hidden]')&&getComputedStyle(b).display!=='none')}
function closeSectionMenu14355(focus=false){const trigger=sectionTrigger14355;sectionMenu14355?.remove();sectionMenu14355=null;sectionTrigger14355=null;trigger?.setAttribute('aria-expanded','false');if(focus&&trigger?.isConnected)trigger.focus()}
function showSectionMenu14355(trigger,panel){
 const choices=sectionChoices14355(panel);if(!trigger||!choices.length)return;
 closeSectionMenu14355();sectionTrigger14355=trigger;
 const menu=document.createElement('div');menu.id='sectionMenu14355';menu.className='section-menu14355';menu.setAttribute('role','menu');menu.setAttribute('aria-label',trigger.textContent.trim());
 for(const source of choices){const button=document.createElement('button');button.type='button';button.textContent=source.textContent.trim();button.disabled=source.disabled;button.setAttribute('role','menuitemradio');button.setAttribute('aria-checked',String(source.classList.contains('active')||source.getAttribute('aria-pressed')==='true'||source.getAttribute('aria-selected')==='true'||source.getAttribute('aria-current')==='page'));button.onclick=()=>{source.click();closeSectionMenu14355();requestAnimationFrame(()=>mainTab14355()?.focus())};menu.append(button)}
 document.body.append(menu);sectionMenu14355=menu;trigger.setAttribute('aria-expanded','true');
 const rect=trigger.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(rect.left,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=(rect.bottom+4)+'px';menu.style.maxHeight=Math.max(100,innerHeight-rect.bottom-12)+'px';
 menu.addEventListener('keydown',e=>{const buttons=[...menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);if(e.key==='Escape'){e.preventDefault();closeSectionMenu14355(true)}else if(e.key==='Tab')closeSectionMenu14355();else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length]?.focus()}});
 menu.querySelector('[aria-checked="true"]:not(:disabled),button:not(:disabled)')?.focus();
}
function syncSectionMenus(panel){
 if(innerWidth<=640||document.documentElement.dataset.device132==='phone'){closeSectionMenu14355();return}
 const trigger=mainTab14355(),canAnchor=trigger&&visible(trigger);
 for(const row of panel.querySelectorAll(sectionRows14355))row.classList.toggle('section-menu-source14355',!!canAnchor);
 const choices=canAnchor?sectionChoices14355(panel):[];
 if(trigger&&choices.length){trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-controls','sectionMenu14355');if(!trigger.hasAttribute('aria-expanded'))trigger.setAttribute('aria-expanded','false')}
 if(pendingSection14355&&tabKey14355(trigger)===pendingSection14355&&choices.length){pendingSection14355='';showSectionMenu14355(trigger,panel)}
}
document.addEventListener('click',e=>{
 const trigger=e.target.closest?.('#categoryTabs .category-tab,.team-tabs14230 [data-team-user14230]');if(!trigger||innerWidth<=640||document.documentElement.dataset.device132==='phone')return;
 const panel=document.querySelector('.tab-content.active'),key=tabKey14355(trigger);
 if(trigger===mainTab14355()&&panel&&sectionChoices14355(panel).length){e.preventDefault();e.stopImmediatePropagation();pendingSection14355='';if(sectionTrigger14355===trigger)closeSectionMenu14355();else showSectionMenu14355(trigger,panel)}else{closeSectionMenu14355();pendingSection14355=key;schedule()}
},true);
document.addEventListener('keydown',e=>{const trigger=e.target.closest?.('#categoryTabs .category-tab,.team-tabs14230 [data-team-user14230]');if(trigger&&e.key==='ArrowDown'&&trigger.getAttribute('aria-haspopup')==='menu'){e.preventDefault();showSectionMenu14355(trigger,document.querySelector('.tab-content.active'))}});
document.addEventListener('pointerdown',e=>{if(sectionMenu14355&&!sectionMenu14355.contains(e.target)&&!sectionTrigger14355?.contains(e.target))closeSectionMenu14355()},true);
window.addEventListener('resize',()=>closeSectionMenu14355());
document.addEventListener('scroll',e=>{if(sectionMenu14355&&!sectionMenu14355.contains(e.target))closeSectionMenu14355()},true);
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
function ready(){layout();document.querySelectorAll('[data-reminder-unit14343]').forEach(b=>b.onclick=()=>reminders(b.dataset.reminderUnit14343));const reset=window.resetRecurringForm;window.resetRecurringForm=function(...args){const result=reset.apply(this,args);reminders('none');return result};new MutationObserver(schedule).observe(document.querySelector('.workspace-scroll')||document.body,{childList:true,subtree:true});window.addEventListener('page113',layout);window.addEventListener('resize',schedule);document.addEventListener('fullscreenchange',()=>{document.body.classList.toggle('browser-full14344',!!document.fullscreenElement);schedule()});new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']})}
const switch14362=window.switchTab;window.switchTab=function(...args){const result=switch14362.apply(this,args);layout();return result};
window.workspaceConsistency14343={layout,dismiss};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
