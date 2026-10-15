/* Group the current Settings navigation; keep every existing form and permission. */
(()=>{'use strict';
const groups=[
 {label:'Company',targets:['settings-business','settings-users','settings-organization14229']},
 {label:'Accounting',targets:['settings-accounting']},
 {label:'People & Statutory',targets:['settings-payroll','settings-tax']},
 {label:'System & Tools',targets:['settings-system','settings-data14231','settings-maintenance14324']}
];
const labels={'settings-business':'Business','settings-users':'Users & Permissions','settings-organization14229':'Organization & Reporting','settings-accounting':'Ledger & Numbering','settings-payroll':'Payroll','settings-tax':'Mandatory','settings-system':'System & Printing','settings-data14231':'Archive & Recovery','settings-maintenance14324':'Maintenance & Audit'};
const permitted=id=>!!document.getElementById(id)&&(!window.access113||window.access113.can(id));
const active=()=>document.querySelector('.tab-content.active')?.id||'';
function available(){return groups.map(g=>({...g,targets:g.targets.filter(permitted)})).filter(g=>g.targets.length)}
let accountingSection='accounting';
const accountingSections=[['accounting','Accounting'],['vouchers','Vouchers'],['currency','Currency Manager']];
function accountingChoice(key){accountingSection=key;accountingPanel();render('settings-accounting');}
function accountingPanel(){const root=document.getElementById('settings-accounting');if(!root)return;const voucher=root.querySelector('.voucher-config14299'),currency=[...root.querySelectorAll('.settings-module94')].find(n=>n.querySelector('h4')?.textContent==='Currency Manager');for(const node of [root.querySelector('[data-settings-group=accounting]'),root.querySelector('#prefixRegistry89')])if(node&&!node.closest('.voucher-config14299'))node.hidden=accountingSection!=='accounting';if(voucher)voucher.hidden=accountingSection!=='vouchers';if(currency)currency.hidden=accountingSection!=='currency';}
function sectionChoices(){if(active()==='settings-accounting')return accountingSections.map(([id,label])=>({id,label,button:{click:()=>accountingChoice(id)}}));const group=available().find(g=>g.targets.includes(active()));return (group?.targets||[]).map(id=>({id,label:labels[id],button:{click:()=>window.switchTab(id)}}))}
function render(target=active()){
 if(window.groupedNavigation14378?.render(target))return true;
 const host=document.getElementById('categoryTabs'),shell=document.getElementById('categoryTabShell');if(!host||!shell)return false;
 let sub=document.getElementById('settingsSections14335');
 const options=available(),current=options.find(g=>g.targets.includes(target));
 if(!current){if(sub)sub.hidden=true;return false}
 const markup=options.map(g=>'<button type="button" class="category-tab'+(g.label===current.label?' active':'')+'" data-settings-group14332="'+g.label+'" role="tab" aria-selected="'+(g===current)+'">'+g.label+'</button>').join('');
 // Compare our own signature as other components decorate button labels and icons.
 if(host.dataset.settingsRender14335!==markup||!host.querySelector('[data-settings-group14332]')){host.innerHTML=markup;host.dataset.settingsRender14335=markup;host.querySelectorAll('[data-settings-group14332]').forEach(b=>b.onclick=()=>{const g=available().find(g=>g.label===b.dataset.settingsGroup14332);if(g&&!g.targets.includes(active()))window.switchTab(g.targets[0])})}
 shell.hidden=false;
 if(!sub){sub=document.createElement('nav');sub.id='settingsSections14335';sub.className='settings-subtabs14332';sub.setAttribute('aria-label','Settings sections');shell.after(sub)}
 const accounting=target==='settings-accounting';
 const sections=accounting?accountingSections.map(([key,label])=>'<button type="button" class="settings-subtab14332'+(key===accountingSection?' active':'')+'" data-accounting-section14337="'+key+'" aria-current="'+(key===accountingSection?'page':'false')+'">'+label+'</button>').join(''):current.targets.map(id=>'<button type="button" class="settings-subtab14332'+(id===target?' active':'')+'" data-settings-section14335="'+id+'" aria-current="'+(id===target?'page':'false')+'">'+labels[id]+'</button>').join('');
 if(sub.dataset.render14335!==sections){sub.innerHTML=sections;sub.dataset.render14335=sections;sub.querySelectorAll('button').forEach(b=>b.onclick=()=>b.dataset.accountingSection14337?accountingChoice(b.dataset.accountingSection14337):window.switchTab(b.dataset.settingsSection14335))}
 sub.hidden=!accounting&&current.targets.length<2;if(accounting)accountingPanel();return true;
}
function sync(){render()}
window.settingsGroups14332={groups,available,sectionChoices,render,chooseAccounting:accountingChoice,get accountingSection(){return accountingSection}};
function install(){document.getElementById('settingsTabShell')?.remove();sync();window.addEventListener('page113',sync);window.addEventListener('resize',sync);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();

/* Desktop grouped navigation reuses the existing panel controllers and permissions. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const item=(label,target,kind='',value='',permission=target)=>({label,target,kind,value,permission});
const books=[
 {label:'Journal',icon:'▤',items:[item('Journal','journal'),item('Submitted Entries','user-entry-review','final','submitted'),item('Schedule','transactions-recurring','upcoming','scheduled')]},
 {label:'Finalization',icon:'✓',items:[item('Fund Allocation','user-entry-review','final','funds','transactions-budget14313'),item('Reconciliation','user-entry-review','final','reconciliation','report-reconciliation'),item('Data Check','transactions-closing14325'),item('Period Closing','period-review')]},
 {label:'Upcoming',icon:'◷',items:[item('Recurring','transactions-recurring','upcoming','recurring'),item('To-dos','transactions-recurring','upcoming','todos'),item('Calendar','transactions-recurring','upcoming','calendar')]},
 {label:'Document',icon:'▧',items:[item('Vouchers','transactions-vouchers14299'),item('Budget Request','transactions-budget14313')]},
 {label:'History',icon:'↶',items:[item('Journal','transactions-all','history','journal'),item('User Entries','transactions-all','history','submitted','user-entry-review'),item('Budget Request','transactions-all','history','budget','transactions-budget14313'),item('Audit Logs','transactions-voided')]}
];
const settings=[
 {label:'Company',icon:'▦',items:[item('Business','settings-business'),item('Users & Permissions','settings-users'),item('Organization & Reporting','settings-organization14229')]},
 {label:'Accounting',icon:'▤',items:['Accounting','Vouchers','Currency Manager'].map((n,i)=>item(n,'settings-accounting','accounting',['accounting','vouchers','currency'][i]))},
 {label:'People & Statutory',icon:'♙',items:[item('Payroll','settings-payroll'),item('Mandatory','settings-tax')]},
 {label:'System & Tools',icon:'⚙',items:[item('System & Printing','settings-system'),item('Archive & Recovery','settings-data14231'),item('Maintenance & Audit','settings-maintenance14324')]}
];
let selected=null;
const enabled=()=>innerWidth>640&&document.documentElement.dataset.device132!=='phone';
const allowed=i=>!!$(i.target)&&(!window.access113||access113.can(i.target)&&access113.can(i.permission));
function choose(i){if(!allowed(i))return;selected=i;window.switchTab(i.target);if(!$(i.target)?.classList.contains('active'))return;
 if(i.kind==='final')budgetWorkflow14316.finalization(i.value);
 if(i.kind==='history')budgetWorkflow14316.history(i.value);
 if(i.kind==='upcoming')workspace14337.showSection(i.value);
 if(i.kind==='accounting')settingsGroups14332.chooseAccounting(i.value);
 render(i.target);window.workspaceConsistency14343?.layout();
}
let groupMenu14388=null,groupAnchor14388=null;
function closeGroupMenu14388(focus=false){groupMenu14388?.remove();groupMenu14388=null;groupAnchor14388?.setAttribute('aria-expanded','false');if(focus&&groupAnchor14388?.isConnected)groupAnchor14388.focus();groupAnchor14388=null;}
function openMenu14388(module,anchor){if(!enabled())return;const groups=module==='settings'?settings:books;if(groupMenu14388&&groupAnchor14388===anchor){closeGroupMenu14388(true);return}closeGroupMenu14388();groupAnchor14388=anchor;anchor.setAttribute('aria-expanded','true');const menu=document.createElement('nav');menu.id='groupMenu14388';menu.className='group-menu14388';menu.setAttribute('aria-label',module==='settings'?'Settings sections':'Bookkeeping sections');const title=document.createElement('strong');title.textContent=module==='settings'?'Settings':'Bookkeeping';menu.append(title);for(const g of groups.filter(g=>g.items.some(allowed))){const button=document.createElement('button');button.type='button';button.dataset.group14388=g.label;button.innerHTML='<span aria-hidden="true">'+g.icon+'</span><span>'+g.label+'</span>';button.onclick=()=>{closeGroupMenu14388();choose(g.items.find(allowed));};menu.append(button)}groupMenu14388=menu;document.body.append(menu);const r=anchor.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(r.right,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(r.bottom+4,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button')?.focus();}
document.addEventListener('click',e=>{if(groupMenu14388&&!groupMenu14388.contains(e.target)&&!groupAnchor14388?.contains(e.target))closeGroupMenu14388();});
document.addEventListener('keydown',e=>{if(!groupMenu14388)return;if(e.key==='Escape'){e.preventDefault();closeGroupMenu14388(true);return}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){const bs=[...groupMenu14388.querySelectorAll('button')],i=bs.indexOf(document.activeElement);e.preventDefault();bs[e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length]?.focus();}});
window.addEventListener('resize',()=>closeGroupMenu14388());window.addEventListener('page113',()=>closeGroupMenu14388());
function sidebar(module,groups,current){const root=$('nav-module-'+module);if(!root)return;root.classList.add('grouped-nav14378');let nav=root.querySelector('.grouped-children14378');if(!nav){nav=document.createElement('nav');nav.className='grouped-children14378';nav.setAttribute('aria-label',module==='settings'?'Settings sections':'Bookkeeping sections');root.append(nav);const header=root.querySelector('.nav-header');header.addEventListener('click',e=>{if(!enabled())return;e.preventDefault();e.stopImmediatePropagation();const drawer=$('appSidebar').classList.contains('mobile-open');if(document.documentElement.dataset.device132==='tablet'&&!drawer||$('appSidebar').getBoundingClientRect().width<100){openMenu14388(module,header);return}if(drawer){const open=!root.classList.contains('groups-open14378');root.classList.toggle('groups-open14378',open);header.setAttribute('aria-expanded',String(open));return}const first=groups.flatMap(g=>g.items).find(allowed);if(first)choose(first)},true);header.setAttribute('aria-expanded','false')}
 root.classList.toggle('groups-open14378',!!current);root.classList.toggle('open',!!current);root.querySelector('.nav-header')?.setAttribute('aria-expanded',String(!!current));
 const available=groups.filter(g=>g.items.some(allowed));const signature=available.map(g=>g.label).join('|');if(nav.dataset.signature!==signature){nav.dataset.signature=signature;nav.replaceChildren(...available.map(g=>{const b=document.createElement('button');b.type='button';b.dataset.group14378=g.label;b.innerHTML='<span aria-hidden="true">'+g.icon+'</span><span>'+g.label+'</span>';b.onclick=()=>choose(g.items.find(allowed));return b}))}
 for(const b of nav.children){const on=b.dataset.group14378===current?.label;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false')}
}
function render(target=document.querySelector('.tab-content.active')?.id){if(!enabled()||window.workspaceViews14364?.rendering)return false;
 const all=[...books,...settings];
 const section=target==='user-entry-review'?window.budgetWorkflow14316?.finalTab:target==='transactions-all'?window.budgetWorkflow14316?.historyTab:target==='transactions-recurring'?window.workspace14337?.section:target==='settings-accounting'?window.settingsGroups14332?.accountingSection:'';
 selected=all.flatMap(g=>g.items).find(i=>i.target===target&&(!section||i.value===section)&&allowed(i));
 const current=all.find(g=>g.items.includes(selected));sidebar('transactions',books,books.includes(current)?current:null);sidebar('settings',settings,settings.includes(current)?current:null);
 if(!current||!selected||selected.target!==target)return false;
 const root=$(target),host=$('categoryTabs'),shell=$('categoryTabShell');if(!host||!shell)return false;
 const items=current.items.filter(allowed),signature=current.label+'|'+items.map(i=>i.label).join('|');
 if(host.dataset.grouped14378!==signature||!host.querySelector('[data-section14378]')){host.dataset.grouped14378=signature;host.replaceChildren(...items.map(i=>{const b=document.createElement('button');b.type='button';b.className='category-tab';b.dataset.section14378=i.label;b.setAttribute('role','tab');b.textContent=i.label;b.onclick=()=>choose(i);return b}))}
 for(const b of host.children){const on=b.dataset.section14378===selected.label;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.removeAttribute('aria-haspopup');b.removeAttribute('aria-controls');b.removeAttribute('aria-expanded')}
 shell.hidden=false;
 for(const row of root.querySelectorAll(':scope>.workflow-switch14316,:scope>.workspace-tabs14337,:scope>#settingsSections14335'))row.classList.add('grouped-source14378');
 $('settingsSections14335')?.classList.add('grouped-source14378');
 return true;
}
window.groupedNavigation14378={render,choose,books,settings,openMenu:openMenu14388,owns:panel=>enabled()&&[...books,...settings].some(g=>g.items.some(i=>i.target===panel?.id))};
window.addEventListener('page113',()=>render());
window.addEventListener('DOMContentLoaded',()=>render(),{once:true});
})();
