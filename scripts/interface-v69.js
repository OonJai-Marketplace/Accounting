/* INTERFACE 69 — session continuity, header controls, currencies and compact tables. */
const Location69={hydrating:false,ready:false,view:'dashboard',lastWrite:0,userNavigated:false};
function locationKey69(id=liveProfile?.id){return `ojm_location_69_${id||'local'}`}
function readLocation69(id){try{return JSON.parse(localStorage.getItem(locationKey69(id))||'null')}catch{return null}}
function sessionDuration88(){return Math.max(5,Math.min(480,Number(ApplicationSettings.system?.sessionTimeout)||30))*60000}
function saveLocation69(){if(!Location69.ready||!liveProfile)return;try{localStorage.setItem(locationKey69(),JSON.stringify({view:Location69.view,scroll:appWorkspaceScroller()?.scrollTop||0,lastActivity:SessionTimeoutManager.lastActivity,openTabs:openSubUserTabs,activeSubUserId}));}catch{}}
function recentLocation69(record,now=Date.now()){return !!record&&now-record.lastActivity>=0&&now-record.lastActivity<sessionDuration88()}
const hydrateBefore69=hydrateSupabaseSession;
let hydration69=null,hydratedUser69='',startup88=null;
function restoreStartup88(){
 if(!startup88||Location69.userNavigated)return;
 const personal=liveProfile?.role!=='admin'&&canAccessAppTarget('sub-users-workspace');
 const saved=startup88.saved,restore=startup88.restore&&!(startup88.fresh&&personal);
 if(restore&&Array.isArray(saved.openTabs)){openSubUserTabs=saved.openTabs;activeSubUserId=saved.activeSubUserId;}
 window.phoneLanding14225={id:liveProfile?.id,fresh:!!startup88.fresh};
 const target=restore&&document.getElementById(saved.view)&&canAccessAppTarget(saved.view)?saved.view:(personal?'sub-users-workspace':canAccessAppTarget('dashboard')?'dashboard':firstPermittedAppTarget());
 if(personal&&!restore){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:!livePermission?.can_approve}];activeSubUserId='self';window.v49SetView?.(liveProfile.id,'home');}
 if(target?.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target||'dashboard');Location69.view=target;
 if(personal&&!restore)window.personalJournal1437?.show(String(liveProfile.id),'home');
 Location69.ready=true;
 requestAnimationFrame(()=>{if(!Location69.userNavigated&&restore&&appWorkspaceScroller())appWorkspaceScroller().scrollTop=saved.scroll||0});
}
hydrateSupabaseSession=async function(session){
 if(hydration69)return hydration69;
 if(hydratedUser69===session?.user?.id&&document.getElementById('loginGate')?.classList.contains('is-authenticated'))return;
 ApplicationSettings=loadApplicationSettings();
 if(window.loadSessionPolicy1443)await loadSessionPolicy1443(session?.user?.id);
 const saved=readLocation69(session?.user?.id),fresh=freshLoginRequested;
 if(!fresh&&saved&&!recentLocation69(saved)){await logoutDemoUser();showLoginForm('Session expired. Please sign in again.');return;}
 startup88={saved,fresh,restore:!!saved&&recentLocation69(saved)};Location69.hydrating=true;Location69.userNavigated=false;
 SessionTimeoutManager.lastActivity=!fresh&&startup88.restore?saved.lastActivity:Date.now();
 hydration69=(async()=>{try{await hydrateBefore69(session);if(!liveProfile||liveProfile.id!==session?.user?.id||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))return;hydratedUser69=liveProfile.id;Location69.ready=true;saveLocation69();
 requestAnimationFrame(()=>requestAnimationFrame(()=>showRecurringWarningsOnLogin()));
 }finally{Location69.hydrating=false;startup88=null;hydration69=null;SessionTimeoutManager.arm()}})();return hydration69;
};
const logoutBefore69=logoutDemoUser;
logoutDemoUser=async function(){const id=liveProfile?.id;hydratedUser69='';Location69.ready=false;Location69.hydrating=false;startup88=null;clearTimeout(SessionTimeoutManager.logoutTimer);clearTimeout(SessionTimeoutManager.warningTimer);if(id)localStorage.removeItem(locationKey69(id));return logoutBefore69()};
SessionTimeoutManager.arm=function(){clearTimeout(this.logoutTimer);clearTimeout(this.warningTimer);if(!liveProfile)return;const remaining=sessionDuration88()-(Date.now()-this.lastActivity);if(remaining<=0){this.logout();return}const warning=Math.min(Number(ApplicationSettings.system?.sessionWarning)||1,sessionDuration88()/60000-1);this.warningTimer=setTimeout(()=>this.warn(warning),Math.max(0,remaining-warning*60000));this.logoutTimer=setTimeout(()=>this.logout(),remaining)};
SessionTimeoutManager.reset=function(){if(Date.now()-this.lastActivity>=sessionDuration88()){this.logout();return}this.lastActivity=Date.now();this.hideWarning();saveLocation69();this.arm()};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&liveProfile)SessionTimeoutManager.arm()});
function snapshotJournal69(){return {rows:[...document.querySelectorAll('#jeLinesBody tr')].map(r=>({account:r.querySelector('.je-line-acc')?.value||'',memo:r.querySelector('.je-line-memo')?.value||'',dr:r.querySelector('.je-line-dr')?.value||'',date:r.querySelector('.je-line-date')?.value||'',credits:Object.fromEntries([...r.querySelectorAll('.je-line-cr')].map(n=>[n.dataset.currency,n.value]))})),owner:pendingWorkspacePostOwnerId,journal:pendingWorkspacePostJournalId,local:pendingWorkspacePostIsLocal};}
function restoreJournal69(s){const body=document.getElementById('jeLinesBody');if(!body||!s.rows.length)return;body.innerHTML='';s.rows.forEach(r=>{addJournalLineRow(r.account,r.memo,r.dr,r.credits);const date=body.lastElementChild.querySelector('.je-line-date');if(date)date.value=r.date});pendingWorkspacePostOwnerId=s.owner;pendingWorkspacePostJournalId=s.journal;pendingWorkspacePostIsLocal=s.local;calculateJournalBalance()}
function applyCurrencyOrder69(){const order=ApplicationSettings.accounting.currencyOrder||[];CurrencyStore.currencies.sort((a,b)=>(order.includes(a.code)?order.indexOf(a.code):999)-(order.includes(b.code)?order.indexOf(b.code):999))}
const renderCurrencyBefore69=CurrencyStore.render;
CurrencyStore.render=function(){applyCurrencyOrder69();renderCurrencyBefore69.call(this);const host=document.getElementById('currencyTableBody');if(!host)return;[...host.rows].forEach((row,i)=>{row.draggable=true;row.dataset.currency=this.currencies[i].code;const handle=document.createElement('span');handle.className='currency-handle69';handle.textContent='⠿ ';handle.title='Drag to reorder';row.cells[0].prepend(handle);const up=document.createElement('button');up.type='button';up.className='currency-move69';up.textContent='↑';up.title='Move currency earlier';up.disabled=i===0;up.onclick=()=>moveCurrency69(row.dataset.currency,i-1);row.cells[0].append(up);const down=up.cloneNode(true);down.textContent='↓';down.title='Move currency later';down.disabled=i===this.currencies.length-1;down.onclick=()=>moveCurrency69(row.dataset.currency,i+1);row.cells[0].append(down);row.ondragstart=e=>e.dataTransfer.setData('text/plain',row.dataset.currency);row.ondragover=e=>e.preventDefault();row.ondrop=e=>{e.preventDefault();moveCurrency69(e.dataTransfer.getData('text/plain'),i)}})};
function moveCurrency69(code,index){const list=CurrencyStore.currencies,from=list.findIndex(c=>c.code===code);if(from<0||index<0||index>=list.length)return;const snapshot=snapshotJournal69();list.splice(index,0,list.splice(from,1)[0]);ApplicationSettings.accounting.currencyOrder=list.map(c=>c.code);localStorage.setItem(APP_SETTINGS_KEY,JSON.stringify(ApplicationSettings));CurrencyStore.render();setupJournalColumns();restoreJournal69(snapshot);sizeCurrencyTables69();const active=document.querySelector('.tab-content.active')?.id;if(active==='transactions-all')renderAllTransactionsTable();else if(active==='transactions-new')renderNewTransactionsTable();else if(active==='transactions-voided')renderVoidedTransactionsTable()}
function sizeCurrencyTables69(){
 document.querySelectorAll('table').forEach(table=>{
 if(table.querySelector('#jeHeaderRow'))return; // Journal-entry widths are fixed by the v97 desktop specification.
 const row=table.tHead?.rows[0];if(!row)return;
 [...row.cells].forEach((th,i)=>{const m=th.textContent.trim().match(/^(?:CR|DR)[\s-]+([A-Z]{3})$/);if(!m)return;const code=m[1],values=[...table.querySelectorAll('tbody tr')].map(tr=>tr.cells.length===row.cells.length?(tr.cells[i]?.textContent||tr.cells[i]?.querySelector('input')?.value||'').trim():'');const length=Math.max(code==='LAK'?16:12,...values.map(v=>v.length));const width=Math.min(240,Math.max(180,length*8+24));th.style.setProperty('width',width+'px','important');th.style.setProperty('min-width',width+'px','important');th.dataset.currency=code;});
 });
}
function editHighlight69(){const editing=!!JournalModule.editingEntryId;document.querySelector('#journal > .je-card')?.classList.toggle('editing69',editing);if(editing){const banner=document.getElementById('journalContext67');if(banner)banner.hidden=true}}
const editHighlightBefore69=loadEntryForEdit;loadEntryForEdit=function(...args){editHighlightBefore69(...args);editHighlight69()};
const clearHighlightBefore69=clearJournalEntry;clearJournalEntry=function(...args){clearHighlightBefore69(...args);editHighlight69()};
const finalHighlightBefore69=finalizePostSuccess;finalizePostSuccess=function(...args){finalHighlightBefore69(...args);editHighlight69()};
function inlineControl69(node,header){if(node&&header&&!header.contains(node)){node.classList.add('inline-control69');header.append(node)}}
function polish69(){
 const search=document.getElementById('jeSearchInput'),card=search?.closest('.je-card');inlineControl69(search?.closest('.je-field-group'),card?.querySelector('.je-card-header'));card?.querySelector('.je-filter-toolbar')?.remove();
 const year=document.querySelector('.archive-year');inlineControl69(year,document.querySelector('#transactions-all .je-card-header'));year?.querySelector('select')?.classList.add('je-select');
 document.querySelectorAll('#reminderUnit, #recurringReminderRows select, .recurring-reminder-row select, .reminder-row select').forEach(n=>{n.style.width=`${Math.max(12,(n.selectedOptions[0]?.textContent.length||10)+4)}ch`});
 document.querySelectorAll('.v49-adjust-body input[id^="v49Adj-"]').forEach(n=>{n.classList.add('adjustment-input69');n.placeholder='Enter corrected amount';n.setAttribute('aria-label','New actual amount');});
 document.querySelectorAll('.v56-balance-formula>strong').forEach(n=>{if(!n.dataset.labeled){n.textContent='Tracked balance: '+n.textContent.replace(/^=\s*/,'');n.dataset.labeled='1'}});
 // Table alignment belongs to each view; do not overwrite attendance or numeric columns.
 sizeCurrencyTables69();editHighlight69();
}
function setupHeaders69(){
 const audit=document.querySelector('#transactions-voided .je-card-header');if(audit&&!document.getElementById('auditSearch69')){const label=document.createElement('label');label.className='inline-control69';label.innerHTML='Search Audit Logs <input class="je-input" id="auditSearch69" type="search" placeholder="Description, date, ID or reason" oninput="filterAudit69()">';audit.append(label)}
 const period=document.getElementById('periodReviewMonthSelect');const controls=period?.closest('.period-selector')||period?.parentElement?.parentElement;if(controls)controls.classList.add('inline-period69');
 const currency=document.getElementById('currencyTableBody')?.closest('.table-container');if(currency&&!document.getElementById('currencyHelp69')){const note=document.createElement('p');note.id='currencyHelp69';note.className='settings-compact-note';note.textContent='Drag currencies or use the arrows. The first currency appears nearest Debit. This display order is saved in this browser.';currency.before(note)}
}
const auditBefore69=renderVoidedTransactionsTable;renderVoidedTransactionsTable=function(...args){auditBefore69(...args);filterAudit69()};
function filterAudit69(){const q=(document.getElementById('auditSearch69')?.value||'').trim().toLowerCase();document.querySelectorAll('.audit-summary-row').forEach(row=>{const detail=row.nextElementSibling;row.hidden=!!q&&!`${row.textContent} ${detail?.textContent} ${row.dataset.auditSearch||''}`.toLowerCase().includes(q);if(row.hidden&&detail){detail.hidden=true;row.setAttribute('aria-expanded','false');const icon=row.querySelector('.audit-expand-cell');if(icon)icon.textContent='▶'}})}
const toggleAuditBefore69=toggleAuditDetails;toggleAuditDetails=function(id,row){document.querySelectorAll('.audit-detail-row').forEach(detail=>{if(detail.id!==id){detail.hidden=true;detail.previousElementSibling?.setAttribute('aria-expanded','false');const icon=detail.previousElementSibling?.querySelector('.audit-expand-cell');if(icon)icon.textContent='▶'}});toggleAuditBefore69(id,row)};
document.addEventListener('toggle',e=>{const detail=e.target;if(detail.tagName!=='DETAILS'||!detail.open)return;detail.parentElement.querySelectorAll(':scope > details[open]').forEach(other=>{if(other!==detail)other.open=false})},true);
document.addEventListener('DOMContentLoaded',()=>{
 const previousSwitch=window.switchTab;window.switchTab=function(target){saveLocation69();const result=previousSwitch(target);if(document.getElementById(target)?.classList.contains('active')){Location69.view=target;saveLocation69()}polish69();return result};
 const previousAccount=window.scrollToAccountModule;window.scrollToAccountModule=function(target){saveLocation69();const result=previousAccount(target);if(document.getElementById(target)&&!document.getElementById(target).hidden){Location69.view=target;requestAnimationFrame(()=>{const scroller=appWorkspaceScroller();if(scroller)scroller.scrollTop=0;saveLocation69()})}return result};
 setupHeaders69();CurrencyStore.render();polish69();
 let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;polish69()})}).observe(document.body,{childList:true,subtree:true});
 for(const name of ['pointerdown','keydown','scroll'])document.addEventListener(name,()=>{if(Date.now()-Location69.lastWrite<1000)return;Location69.lastWrite=Date.now();saveLocation69()},true);
 document.addEventListener('change',polish69);window.addEventListener('pagehide',saveLocation69);
});

// A navigation choice made while sign-in data is loading wins over the saved route.
document.addEventListener('click',event=>{if(Location69.hydrating&&event.isTrusted&&event.target.closest('.category-tab,.tab-btn,.nav-category,.nav-subitem,.nav-item,.sub-user-browser-tab,[onclick*="switchTab"],[onclick*="scrollToAccountModule"]'))Location69.userNavigated=true},true);
const switchBeforeLoadingGuard86=window.switchTab;
window.switchTab=function(...args){if(Location69.hydrating&&window.event?.isTrusted&&/^(click|touchend|pointerup|keydown)$/.test(window.event.type))Location69.userNavigated=true;return switchBeforeLoadingGuard86(...args)};
