/* Keep rendered workspaces for this authenticated session. Data and form changes invalidate only their dependants. */
(()=>{'use strict';
const prepared=new Map(),shelves=new Map(),versions={journal:0,payroll:0,reference:0,review:0,settings:0};
let preparingTarget='',owner='',ownerClient=null,navigation=0,rendering=false,building=false,pendingBuild=null,queued=false;
const current=()=>document.querySelector('.tab-content.active')?.id||'';
const client=()=>typeof ojmDb==='undefined'?null:ojmDb;
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const allowed=id=>!!actor()&&!!document.getElementById(id)&&(typeof canAccessAppTarget!=='function'||canAccessAppTarget(id));
function groups(id){if(id==='dashboard')return ['journal','payroll','review','reference','settings'];if(/^payroll-|^hr-|^tax-/.test(id))return ['payroll','reference','journal','settings'];if(/^report-|^transactions-|^journal$|^period-review$|^accounts-|^trial-balance$|^account-balances$/.test(id))return ['journal','reference','review','payroll','settings'];if(/sub-users|user-entry|entry-submissions/.test(id))return ['review','journal','reference','settings'];if(/chart|sub-account|currency/.test(id))return ['reference'];return ['settings','reference'];}
function signature(id){const keys=groups(id),out=[actor(),client(),window.workspaceRequest138?.target||'',...keys.map(k=>versions[k])];
 if(keys.includes('reference'))out.push(AccountingStore.accounts,AccountingStore.subAccounts,CurrencyStore.currencies);
 if(keys.includes('journal'))out.push(JournalModule.entries,PeriodReview.periods,window.preparedViews14340?.revision?.());
 if(keys.includes('payroll'))out.push(Work82.employees,Work82.leaves,Work82.runs,Work82.reports);
 if(['payroll-entries','payroll-deductions','hr-attendance'].includes(id))out.push(Work82.run,Work82.employee,Work82.runRecord?.id,Work82.run?.month,Work82.run?.status);
 if(keys.includes('review'))out.push(typeof reviewStaffJournals==='undefined'?null:reviewStaffJournals,typeof liveProfiles==='undefined'?null:liveProfiles,typeof activeSubUserId==='undefined'?'':activeSubUserId,DemoAccess.submissions);
 if(id==='transactions-voided')out.push(typeof LiveTransactionAudit==='undefined'?null:LiveTransactionAudit);
 if(/accounts-|trial-balance|account-balances/.test(id))out.push(JSON.stringify(Accounts69));
 if(id.startsWith('report-'))out.push(Reports79.from,Reports79.to,Reports79.mode,Reports79.currency,Reports79.account,Reports79.query,JSON.stringify(Reports79.selectedMonths14331||[]));
 return out;
}
const equal=(a,b)=>a?.length===b.length&&a.every((v,i)=>v===b[i]);
function valid(id){return owner===actor()&&ownerClient===client()&&prepared.has(id)&&equal(prepared.get(id),signature(id));}
function holdPayroll(except=''){for(const id of ['payroll-entries','payroll-deductions']){if(id===except)continue;const node=document.querySelector('#'+id+' .desktop82');if(node){node.remove();shelves.set(id,node)}}}
function restore(id){if(owner!==actor()||ownerClient!==client()){shelves.clear();return}if(!['payroll-entries','payroll-deductions'].includes(id))return;holdPayroll(id);const node=shelves.get(id);if(node&&!document.querySelector('#'+id+' .desktop82')){document.getElementById(id)?.append(node);shelves.delete(id)}}
function invalidate(group,prepare=true){if(group)versions[group]=(versions[group]||0)+1;else prepared.clear();if(prepare)schedule();}
function schedule(){if(queued||building||!window.startup14257?.prepared||!actor())return;queued=true;setTimeout(()=>{queued=false;if(!building)void build(false).catch(e=>window.localFirst14333?.setNotice('Screen preparation needs retry: '+e.message))},0)}
function renderer(id){
 if(id==='dashboard')return ()=>window.dashboardWarm112?.render();
 if(id==='entry-submissions')return ()=>window.renderEntrySubmissions?.();
 if(id==='transactions-vouchers14299')return ()=>window.vouchers14299?.open();
 if(id==='journal')return ()=>{renderJournalHistoryTable();renderReopened67()};
 if(id==='transactions-all')return ()=>{window.budgetWorkflow14316?.prepareHistory?.();renderAllTransactionsTable()};
 if(id==='transactions-voided')return ()=>renderVoidedTransactionsTable();
 if(id==='transactions-new')return ()=>renderNewTransactionsTable();
 if(id==='period-review')return ()=>renderPeriodReview();
 if(id==='user-entry-review')return ()=>{renderUserEntryReview();window.budgetWorkflow14316?.prepareFinalization?.()};
 if(id==='sub-users-workspace')return ()=>renderSubUserWorkspace();
 if(id==='sub-users-home14229')return ()=>window.TeamHome14227?.prepare?.();
 if(id==='accounts-modular-container'||id==='trial-balance'||id==='account-balances')return ()=>renderAccounts69();
 if(id==='chart-of-accounts')return ()=>renderChartOfAccountsTable();
 if(id==='sub-accounts')return ()=>renderSubAccountsTable();
 if(id==='transactions-recurring')return ()=>{window.renderSchedules14364?.();window.renderRecurringWarnings?.();window.hrCalendar14306?.renderUpcoming()};
 if(id.startsWith('tax-'))return ()=>window.taxReports102?.render();
 if(id==='hr-calendar')return ()=>window.hrCalendar14306?.render();
 if(id.startsWith('hr-'))return ()=>window.renderHr99?.();
 if(id.startsWith('payroll-')||['transactions-budget14313','report-subusers82','report-financing82','report-payroll'].includes(id))return ()=>window.renderWork82?.();
 if(id.startsWith('report-')&&typeof reportNames79!=='undefined'&&reportNames79[id.slice(7)])return ()=>renderReports79();
 if(id==='report-reconciliation')return ()=>window.renderReconciliationList71?.();
 if(id==='local-events'||id==='local-events-account')return ()=>window.localEvents14364?.render();
 return null;
}
async function build(initial=true){if(pendingBuild)return pendingBuild;const who=actor(),db=client();if(!who)return;if(owner!==who||ownerClient!==db){prepared.clear();shelves.clear();owner=who;ownerClient=db}
 pendingBuild=Promise.resolve().then(async()=>{building=true;const reportKind=typeof Reports79==='undefined'?null:Reports79.kind;
 try{
  if(initial&&liveProfile?.role==='admin'&&allowed('local-events'))await window.localEvents14364?.load();
  if(actor()!==who||client()!==db)throw Error('Account changed while preparing screens.');
  if(initial&&allowed('report-bs'))window.prepareReportDefaults14364?.();
  const targets=[...document.querySelectorAll('.tab-content[id]')].map(n=>n.id).filter(allowed);
  for(const id of targets){if(actor()!==who||client()!==db)throw Error('Account changed while preparing screens.');if(!initial&&(id===current()||valid(id)))continue;
   preparingTarget=id;const node=document.getElementById(id),prior=[...document.querySelectorAll('.tab-content.active')];prior.forEach(n=>n.classList.remove('active'));node.classList.add('active');restore(id);
   let result;try{rendering=true;const fn=renderer(id);result=window.preparedViews14340?.withPreparation?preparedViews14340.withPreparation(()=>fn?.()):fn?.();}
   finally{rendering=false;node.classList.remove('active');prior.forEach(n=>n.classList.add('active'));holdPayroll(current());}
   if(result?.then)await result;if(actor()!==who||client()!==db)throw Error('Account changed while preparing screens.');prepared.set(id,signature(id));
   await new Promise(resolve=>setTimeout(resolve,0));if(actor()!==who||client()!==db)throw Error('Account changed while preparing screens.');
  }
 }finally{if(reportKind!==null)Reports79.kind=reportKind;building=false;pendingBuild=null;preparingTarget='';restore(current());window.shell113?.sync();}
 });return pendingBuild;
}
async function finish(){window.startup14257.preparing=true;try{await build(true);window.startup14257.prepared=true;window.startup14257.interactive=true;document.body.classList.remove('startup-pending1443');const box=document.getElementById('startup1443');if(box)box.hidden=true;window.idleSync14341?.preparation('')}finally{window.startup14257.preparing=false}}
function ready(){
 const original=window.preparedViews14340;original.build=()=>build(true);
 const hydrate=window.hydrateSupabaseSession;window.hydrateSupabaseSession=async function(session,...args){const result=await hydrate.call(this,session,...args);if(actor()===session?.user?.id&&window.startup14257?.dataReady)await finish();return result};
 const names=['renderJournalHistoryTable','renderReopened67','renderNewTransactionsTable','renderAllTransactionsTable','renderVoidedTransactionsTable','renderAccounts69','renderReports79','renderWork82','renderHr99','renderChartOfAccountsTable','renderSubAccountsTable','renderUserEntryReview','renderSubUserWorkspace','renderPeriodReview','renderEntrySubmissions'];
 for(const name of names){const fn=window[name];if(typeof fn!=='function')continue;window[name]=function(...args){const id=current();if(navigation&&!building&&valid(id)){if(name==='renderReports79'&&reportNames79[id.slice(7)])Reports79.kind=id.slice(7);restore(id);return}const result=fn.apply(this,args);return result};}
 const switchTab=window.switchTab;window.switchTab=function(id,...args){navigation++;try{return switchTab.call(this,id,...args)}finally{navigation--;const actual=current();restore(actual);if(allowed(actual))prepared.set(actual,signature(actual));holdPayroll(actual)}};
 const scroll=window.scrollToAccountModule;window.scrollToAccountModule=function(...args){navigation++;try{return scroll.apply(this,args)}finally{navigation--;const id=current();if(allowed(id))prepared.set(id,signature(id))}};
 for(const [name,group]of Object.entries({loadJournalFromSupabase:'journal',loadReferenceDataFromSupabase:'reference',loadWork82:'payroll',loadStaffJournalsForReview:'review',loadSubmissionsFromSupabase:'review',loadBusinessSettingsFromSupabase:'settings',loadTransactionAudit:'journal'})){const fn=window[name];if(typeof fn!=='function')continue;window[name]=async function(...args){const before=signature(group==='payroll'?'payroll-overview':group==='reference'?'chart-of-accounts':group==='review'?'user-entry-review':'journal');const result=await fn.apply(this,args);const after=signature(group==='payroll'?'payroll-overview':group==='reference'?'chart-of-accounts':group==='review'?'user-entry-review':'journal');if(!equal(before,after))invalidate(group);return result};}
 document.addEventListener('input',e=>{if(!e.isTrusted)return;const id=e.target.closest('.tab-content')?.id;if(!id)return;if(['payroll-entries','payroll-deductions','hr-attendance'].includes(id))versions.payroll++;},true);
 document.addEventListener('change',e=>{if(!e.isTrusted)return;const id=e.target.closest('.tab-content')?.id;if(id?.startsWith('settings-'))invalidate('settings',false);else if(id)prepared.delete(id);},true);
 window.addEventListener('pagehide',()=>{prepared.clear();shelves.clear()});
}
window.workspaceViews14364={build,finish,invalidate,restore,retainPayroll:holdPayroll,reuseView:id=>navigation>0&&!building&&valid(id),get rendering(){return rendering},get preparing(){return building},get navigating(){return navigation>0},state:()=>({owner,preparingTarget,differences:Object.fromEntries([...prepared].filter(([id,s])=>!valid(id)).map(([id,s])=>[id,signature(id).map((v,i)=>v!==s[i]?i:null).filter(v=>v!==null)])),prepared:[...prepared.keys()],stale:[...prepared.keys()].filter(id=>!valid(id)),shelved:[...shelves.keys()]})};
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
