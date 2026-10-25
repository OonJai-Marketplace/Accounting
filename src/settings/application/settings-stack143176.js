/* Layout B: secondary navigation shows one live Settings section at a time. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const groups=[
 {key:'company',title:'Company Settings',label:'Company',description:'Business information, people and reporting structure.',targets:['settings-business','settings-users','settings-organization14229']},
 {key:'accounting',title:'Accounting Settings',label:'Accounting',description:'Defaults, currencies, vouchers, payroll and mandatory settings.',targets:['settings-accounting','settings-payroll','settings-tax']},
 {key:'system',title:'System & Tools',label:'System & Tools',description:'Website, printing, archive, recovery and maintenance.',targets:['settings-system','settings-data14231','settings-maintenance14324']}
];
const records=new Map(),mounts=new Map(),sections=new Map(),selectedKeys=new Map();
let installed=false,layout=false,queued=false,lastTarget='',owner='',sequence=0;
const desktop=()=>innerWidth>640&&document.documentElement.dataset.device132!=='phone';
const enabled=()=>installed&&layout&&desktop();
const permitted=id=>!!$(id)&&(!window.access113||window.access113.can(id));
const active=()=>document.querySelector('.tab-content.active')?.id||'';
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
const button=(text,fn,cls='settings-stack-action143176')=>{const b=node('button',cls,text);b.type='button';b.onclick=fn;return b;};
function setText(el,value){const text=String(value??'—');if(el.textContent!==text)el.textContent=text;}
function wrap(root,nodes,key,title,description='',open=false){
 nodes=nodes.filter(n=>n&&n.isConnected);nodes=nodes.filter(n=>!nodes.some(parent=>parent!==n&&parent.contains(n)));if(!nodes.length)return null;
 const old=sections.get(key);if(old?.details.isConnected)return old;
 const details=node('section','settings-stack-section143176');details.dataset.settingsSection143176=key;details.id='settingsSection143176-'+key;details.hidden=true;
 const summary=node('header','settings-stack-heading143176');summary.id=details.id+'-heading';details.setAttribute('aria-labelledby',summary.id);summary.append(node('span','settings-stack-symbol143176','▤'),node('strong','',title));
 if(description)summary.append(node('span','settings-stack-description143176',description));
 const body=node('div','settings-stack-body143176');details.append(summary,body);
 const homes=nodes.map(n=>{const marker=document.createComment('Settings layout position');n.before(marker);return {n,marker};});
 homes[0].marker.after(details);body.append(...nodes);
 const record={root,key,title,description,details,summary,body,homes,headingControls:[]};sections.set(key,record);
 const pageHeading=body.querySelector(':scope>.settings-page-heading');
 if(pageHeading){const actions=node('div','settings-stack-heading-actions143181');for(const control of pageHeading.querySelectorAll('button')){const marker=document.createComment('Settings heading control');control.before(marker);record.headingControls.push({control,marker});actions.append(control);}if(actions.childNodes.length)summary.append(actions);pageHeading.classList.add('settings-stack-redundant143181');record.pageHeading=pageHeading;}
 return record;
}
function rootNodes(root){return [...root.children].filter(n=>!n.matches('.area-banner113,.settings-stack-section143176,.module-header,#categoryTabShell,#settingsSections14335,.sub-user-tabs-shell'));}
function whole(root,key,title,description,open=false){return wrap(root,rootNodes(root),key,title,description,open);}
function revealAccounting(){const root=$('settings-accounting');if(!root)return;for(const n of root.querySelectorAll(':scope>.je-card,[data-settings-group=accounting],#prefixRegistry89,.voucher-config14299,#googleSheets143129,.settings-module94')){if(n.hidden)n.hidden=false;if(n.id==='googleSheets143129')n.style.removeProperty('display');}}
function prepare(root){
 const id=root.id;
 if(id==='settings-accounting'){
  revealAccounting();
  const f=root.querySelector('[data-settings-group=accounting]'),prefix=root.querySelector('#prefixRegistry89');
  const currency=[...root.querySelectorAll('.settings-module94')].find(n=>n.querySelector('h4')?.textContent.trim()==='Currency Manager');
  const r=wrap(root,[f,prefix].filter(n=>n&&!n.closest('.voucher-config14299')), 'accounting','Accounting · Defaults & journal numbering','Currency, accounts and entry IDs',true);
  if(r&&prefix&&r.body.contains(prefix)&&!prefix.closest('.settings-stack-prefix143176')){const d=node('details','settings-stack-prefix143176');const s=node('summary','','Entry IDs & prefix registry');prefix.before(d);d.append(s,prefix);r.prefix=d;}
  const currencies=wrap(root,[currency],'currency','Currency Manager','Available currencies',true);
  const vouchers=wrap(root,[root.querySelector('.voucher-config14299')],'vouchers','Vouchers','Prefix, classification and numbering');
  if(currencies&&vouchers&&currencies.details.parentElement===vouchers.details.parentElement&&currencies.details.nextElementSibling!==vouchers.details)vouchers.details.before(currencies.details);
  wrap(root,[$('googleSheets143129')],'google','Google Sheets','Submission inbox and connections');
 }else if(id==='settings-business')whole(root,'business','Business information','Identity, contact details and company accounts',true);
 else if(id==='settings-users')whole(root,'users','Users & Permissions','Accounts, access and permissions');
 else if(id==='settings-organization14229')whole(root,'organization','Organization & Reporting','Departments and reporting lines');
 else if(id==='settings-payroll')whole(root,'payroll','Payroll','Schedule, currencies, working time and allowances');
 else if(id==='settings-tax')whole(root,'mandatory','Mandatory','PIT, SSO, VAT and reminders');
 else if(id==='settings-system'){
  wrap(root,[root.querySelector('[data-settings-group=system]')],'preferences','General preferences','Dates, numbers, text size and opening page',true);
  wrap(root,[root.querySelector('.system-printing-panel')],'printing','Printing','Paper, images, page numbers and file names');
  wrap(root,[$('settings-appearance113')],'appearance','Logo & banner','Company branding and banner placement');
  const backup=[...root.querySelectorAll(':scope>.settings-section-card')].find(n=>n.querySelector('#settingsBackupInput'));
  wrap(root,[backup],'settings-backup','Settings backup','Download or restore application preferences');
  wrap(root,[$('installationSettings14320')],'installation','Installation & Handover','Company deployment and administrator handover');
  // Every extension remains visible, even if it was added after this layout shipped.
  for(const n of rootNodes(root))if(!n.matches('.settings-page-heading'))wrap(root,[n],'system-extra-'+(++sequence),n.querySelector('h2,h3,h4')?.textContent.trim()||'Additional system settings');
 }else if(id==='settings-data14231'){
  for(const embedded of root.querySelectorAll(':scope>.embedded-settings14231')){
   if(embedded.id==='settings-recovery113')wrap(root,[embedded],'recovery','Recovery vault','Protected recovery contacts and encrypted copies');
   else for(const n of [...embedded.children])if(!n.matches('.settings-stack-section143176')){
    const title=n.querySelector('h2,h3,h4')?.textContent.trim()||'Archive tools';
    const key=n.querySelector('#operationalReset142')||n.id==='operationalReset142'?'operational-reset':n.querySelector('#auditFiles14233')||n.id==='auditFiles14233'?'audit-files':n.querySelector('#archiveExport129')||n.id==='archiveExport129'?'archive-export':'archive-'+(++sequence);
    wrap(root,[n],key,title,'',false);
   }
  }
  for(const n of rootNodes(root))if(!n.matches('.embedded-settings14231,.settings-page-heading'))wrap(root,[n],'archive-extra-'+(++sequence),n.querySelector('h2,h3,h4')?.textContent.trim()||'Archive & Recovery');
 }else if(id==='settings-maintenance14324'){
  whole(root,'maintenance','Maintenance & Audit','Investigation, comparison and diagnostics');
 }
}
function mount(group){
 if(mounts.has(group.key))return mounts.get(group.key);
 const host=node('section','settings-stack-workspace143176');host.dataset.settingsWorkspace143176=group.key;host.hidden=true;
 const heading=node('header','settings-stack-hero143176');heading.append(node('p','settings-stack-eyebrow143176','Settings / '+group.label),node('h1','',group.title),node('p','',group.description));
 const grid=node('div','settings-stack-grid143176'),main=node('div','settings-stack-main143176'),aside=node('aside','settings-stack-aside143176');
 const list=node('div','settings-stack-list143176');main.append(list);main.setAttribute('aria-label',group.label+' settings content');main.tabIndex=0;
 const jump=node('nav','settings-stack-jump143176');jump.setAttribute('aria-label',group.label+' sections');
 const jumpCard=node('section','settings-stack-sidecard143176');jumpCard.append(node('h2','','Sections'),jump);
 const summary=node('section','settings-stack-sidecard143176');summary.append(node('h2','','Current setup'));const facts=node('dl','settings-stack-facts143176');summary.append(facts,node('p','settings-stack-save-note143176','Each section keeps its own Save action.'));
 aside.append(jumpCard,summary);grid.append(main,aside);host.append(heading,grid);
 const first=group.targets.map($).find(Boolean);if(!first)return null;first.before(host);
 const m={group,host,heading,main,list,jump,facts};mounts.set(group.key,m);return m;
}
function installLayout(){
 if(layout)return;layout=true;document.documentElement.classList.add('settings-stack-enabled143176');
 for(const group of groups){const m=mount(group);if(!m)continue;for(const id of group.targets){const root=$(id);if(!root)continue;const marker=document.createComment('Settings panel position');root.before(marker);records.set(id,{root,marker,padding:[root.style.getPropertyValue('padding'),root.style.getPropertyPriority('padding')]});root.style.setProperty('padding','0','important');root.dataset.settingsStackPanel143176='';m.list.append(root);prepare(root);}}
}
function restore(){
 if(!layout)return;layout=false;
 const main=document.querySelector('.main-content-area'),scroll=document.querySelector('.workspace-scroll');
 for(const n of [document.querySelector('.module-header'),$('categoryTabShell')])if(n?.closest('.settings-stack-workspace143176')&&main&&scroll)main.insertBefore(n,scroll);
 // Restore original nodes rather than cloning them; event listeners and unsaved inputs survive.
 for(const record of [...sections.values()].reverse()){
  if(record.prefix?.isConnected){record.prefix.before(...[...record.prefix.children].filter(n=>n.tagName!=='SUMMARY'));record.prefix.remove();}
  for(const {control,marker} of record.headingControls||[])if(marker.isConnected)marker.replaceWith(control);
  record.pageHeading?.classList.remove('settings-stack-redundant143181');
  for(const {n,marker} of record.homes){if(marker.isConnected&&n.isConnected)marker.replaceWith(n);else marker.remove();}
  record.details.remove();
 }
 sections.clear();
 for(const {root,marker,padding} of records.values()){if(marker.isConnected)marker.replaceWith(root);delete root.dataset.settingsStackPanel143176;root.hidden=false;if(padding[0])root.style.setProperty('padding',...padding);else root.style.removeProperty('padding');}
 records.clear();for(const m of mounts.values())m.host.remove();mounts.clear();selectedKeys.clear();lastTarget='';document.documentElement.classList.remove('settings-stack-enabled143176');
 window.settingsGroups14332?.render();
}
function groupFor(id){return groups.find(g=>g.targets.includes(id));}
function listFor(group){return [...sections.values()].filter(r=>r.details.isConnected&&group.targets.includes(r.root.id)&&permitted(r.root.id)).sort((a,b)=>a.details.compareDocumentPosition(b.details)&4?-1:1);}
// Only the content pane scrolls. Section navigation never moves the app shell.
function select(record){
 if(!enabled()||!permitted(record.root.id))return;
 const group=groupFor(record.root.id),previous=selectedKeys.get(group.key);
 selectedKeys.set(group.key,record.key);
 if(active()!==record.root.id)window.switchTab(record.root.id);
 if(active()!==record.root.id){selectedKeys.set(group.key,previous);return;}
 sync();
 if(previous!==record.key)mounts.get(group.key).main.scrollTop=0;
}
function openDefault(){
 if(!enabled())return;
 const target=groups.flatMap(g=>g.targets).find(permitted);
 const record=listFor(groupFor(target)||groups[0]).find(r=>r.root.id===target);
 if(record){select(record);mounts.get(groupFor(target).key).main.scrollTop=0;}
}
function activateForInteraction(event){
 if(!enabled())return;
 if(event.target.closest?.('.settings-stack-heading143176'))return;
 const root=event.target.closest?.('[data-settings-stack-panel143176]');if(!root)return;
 if(!permitted(root.id)){event.preventDefault();event.stopImmediatePropagation();return;}
 // The legacy permission handlers use the active panel. Activate it before their
 // document-capture handlers run, including keyboard and programmatic submits.
 if(active()!==root.id){const scroll=document.querySelector('.workspace-scroll'),top=scroll?.scrollTop;window.switchTab(root.id);if(scroll)scroll.scrollTop=top;}
 if(active()!==root.id){event.preventDefault();event.stopImmediatePropagation();}
}
function refreshJump(){
 if(!enabled())return;
 for(const m of mounts.values()){
  const items=listFor(m.group),signature=items.map(r=>r.key+'|'+r.title).join('~');
  if(m.jump.dataset.signature!==signature){m.jump.dataset.signature=signature;const children=[];let last='';for(const r of items){if(m.group.key==='system'&&last!==r.root.id&&r.key!=='maintenance'){last=r.root.id;children.push(node('h3','settings-stack-jump-group143176',{'settings-system':'System & Printing','settings-data14231':'Archive & Recovery','settings-maintenance14324':'Maintenance & Audit'}[last]));}const b=button(r.title,()=>select(r),'settings-stack-jump-link143176');b.dataset.jump143176=r.key;b.setAttribute('aria-controls',r.details.id);children.push(b);}m.jump.replaceChildren(...children);}
  for(const b of m.jump.querySelectorAll('[data-jump143176]')){const r=sections.get(b.dataset.jump143176);const on=r?.key===selectedKeys.get(m.group.key);b.setAttribute('aria-current',on?'page':'false');b.classList.toggle('is-open',on);}
 }
}
function summarize(){
 const app=typeof ApplicationSettings==='undefined'?{}:ApplicationSettings;
 for(const m of mounts.values()){
  const facts=[];
  if(m.group.key==='company'){
   if(permitted('settings-business')){const b=typeof BusinessSettings==='undefined'?{}:BusinessSettings.current||{};facts.push(['Company',b.companyName||b.display_name||b.legalName||'—'],['Time zone',b.timezone||b.timeZone||'—']);}
   if(permitted('settings-users')&&typeof liveProfiles!=='undefined')facts.push(['Active users',liveProfiles.filter(u=>u.status==='active').length]);
  }else if(m.group.key==='accounting'){
   if(permitted('settings-accounting')){const a=app.accounting||{};const f=$('settings-accounting')?.querySelector('[name=fiscalYearStart]');const month=[...(f?.options||[])].find(o=>o.value===String(a.fiscalYearStart))?.textContent||a.fiscalYearStart;facts.push(['Base currency',a.baseCurrency],['Fiscal year',month],['Journal prefix',a.journalPrefix]);if(typeof CurrencyStore!=='undefined')facts.push(['Currencies',(CurrencyStore.currencies||[]).filter(c=>c.active!==false&&c.is_active!==false).map(c=>c.code).join(' · ')]);}
   if(permitted('settings-payroll'))facts.push(['Pay frequency',app.payroll?.payFrequency]);
  }else if(permitted('settings-system')){facts.push(['Date format',app.system?.dateFormat],['Paper size',app.printing?.paperSize],['Orientation',app.printing?.orientation]);}
  const signature=JSON.stringify(facts);if(m.facts.dataset.signature===signature)continue;m.facts.dataset.signature=signature;m.facts.replaceChildren(...facts.map(([k,v])=>{const row=node('div');row.append(node('dt','',k),node('dd','',String(v??'—')));return row;}));
 }
}
function sync(){
 queued=false;if(!installed)return;
 if(!desktop()){restore();return;}
 installLayout();
 const current=active(),group=groupFor(current);
 if(owner!==actor()){owner=actor();selectedKeys.clear();lastTarget='';}
 for(const {root} of records.values())if(permitted(root.id))prepare(root);
 for(const m of mounts.values()){
  m.host.hidden=m.group!==group||!permitted(current);
  const items=listFor(m.group),previous=selectedKeys.get(m.group.key);
  let selected=items.find(r=>r.key===previous);
  if(m.group===group&&selected?.root.id!==current)selected=items.find(r=>r.root.id===current);
  selected||=items[0];
  selectedKeys.set(m.group.key,selected?.key);
  for(const r of items)r.details.hidden=r!==selected;
  for(const id of m.group.targets){const root=$(id);if(root)root.hidden=!permitted(id)||id!==selected?.root.id;}
  if(previous!==selected?.key)m.main.scrollTop=0;
  if(!m.host.hidden)window.shell113?.paintBanner(m.heading,'settings',current);
 }
 lastTarget=current;refreshJump();summarize();if(group)window.groupedNavigation14378?.render(current);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync);}
function renderNavigation(current,target){
 if(!enabled())return false;const g=groupFor(target),host=$('categoryTabs'),shell=$('categoryTabShell');if(!g||!host||!shell)return false;
 const visible=groups.filter(x=>x.targets.some(permitted)),sig=visible.map(x=>x.key).join('|');
 if(host.dataset.settingsStack143176!==sig||!host.querySelector('[data-settings-group176]')){
  host.dataset.settingsStack143176=sig;host.replaceChildren(...visible.map(x=>{const b=button(x.label,()=>{const target=x.targets.find(permitted);if(target)window.switchTab(target);},'category-tab');b.dataset.settingsGroup176=x.key;b.setAttribute('role','tab');return b;}));
 }
 for(const b of host.children){const on=b.dataset.settingsGroup176===g.key;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}
 shell.hidden=false;$('settingsSections14335')?.classList.add('grouped-source14378');return true;
}
window.settingsStack143176={enabled,sync,revealAccounting,renderNavigation,openDefault,chooseAccounting:key=>{if(enabled()){const r=sections.get(key);if(r)select(r);}},open:key=>{const r=sections.get(key);if(r)select(r);}};
function ready(){installed=true;sync();window.addEventListener('page113',sync);window.addEventListener('presentation-ready113',schedule);window.addEventListener('resize',schedule);window.addEventListener('companysettings14320',schedule);window.addEventListener('storage',schedule);document.addEventListener('change',e=>{if(e.target.closest?.('[data-module=settings]'))schedule();});document.addEventListener('submit',e=>{if(e.target.closest?.('[data-module=settings]'))setTimeout(schedule,0);});
 for(const type of ['click','submit','focusin'])window.addEventListener(type,activateForInteraction,true);
 setInterval(()=>{if(enabled()&&groupFor(active())&&document.visibilityState==='visible')summarize();},2000);
 new MutationObserver(rs=>{if(rs.some(r=>r.type==='attributes'?r.target.matches?.('.tab-content'):r.target.matches?.('[data-settings-stack-panel143176]')||[...r.addedNodes].some(n=>n.nodeType===1&&(n.id==='googleSheets143129'||n.id==='prefixRegistry89'))))schedule();}).observe($('printableDocArea')||document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['data-device132']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
