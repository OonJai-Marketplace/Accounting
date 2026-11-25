/* Restore the selected workspace first. Explicit sign-in prepares all permitted areas. */
(()=>{'use strict';let job,retryTimer14338;
function requirements(view){
 if(view==='dashboard')return ['reference','journal','business','profiles','payroll','review','home','schedules','workflow'];
 if(view==='report-payroll'||view==='report-financing82'||view==='report-subusers82'||view==='transactions-budget14313')return ['reference','business','payroll'];
 if(view.startsWith('report-'))return ['reference','journal','reports','business'];
 if(view==='settings-users'||view==='users-permissions')return ['reference','profiles'];
 if(view==='sub-users-home14229')return ['reference','profiles','home'];
 if(view==='transactions-recurring')return ['reference','schedules','workflow'];
 if(view==='transactions-voided')return ['reference','audit'];
 if(['journal','period-review','transactions-all'].includes(view))return ['reference','journal','business','workflow'];
 if(['entry-submissions','submissions','user-entry-review'].includes(view))return ['reference','business','profiles','submissions','review'];
 if(view==='document-editor105')return ['business','documents'];
 if(/^(payroll|hr|tax)-/.test(view))return ['reference','business','payroll'];
 if(view==='settings-legal')return ['business','legal'];
 if(view==='sub-users-workspace')return ['reference','profiles','business','review'];
 if(/chart|sub-account|currency/.test(view))return ['reference'];
 if(view.startsWith('settings-'))return ['business'];
 return ['reference','journal','business'];
}
async function prepareSchedules(force){
 if(liveProfile.role!=='admin'||!access113.can('transactions-recurring'))return;
 if(await window.loadSchedules91(force)===false)throw Error('Schedules could not be loaded');
 if(!window.UpcomingPlans280||await window.UpcomingPlans280.load(force))return;
 // Devices upgraded offline can lack their first plan list. Upcoming displays
 // the download error locally and can retry without locking unrelated screens.
 if(!force&&window.offline14239?.offline())return;
 throw Error('Prepared journal plans could not be loaded');
}
function pending(show,message='Loading this area…',retry){document.body.classList.toggle('startup-pending1443',show);let box=document.getElementById('startup1443');if(!box){box=document.createElement('section');box.id='startup1443';box.setAttribute('role','status');box.innerHTML=(window.loading1444?.markup()||'')+'<p></p><button type="button" class="je-btn" hidden>Retry loading</button>';document.body.append(box)}window.idleSync14341?.preparation(show?message:'',retry);box.hidden=!show;box.setAttribute('aria-label',message);const copy=box.querySelector('p');copy.textContent=message;copy.hidden=false;const motion=box.querySelector('.loading-orbit1444');if(motion)motion.hidden=!!retry;const b=box.querySelector('button');b.hidden=!retry;b.onclick=retry||null;budgetShortcut(box,retry)}
// Offer the existing budget dialogs only after this account's own budget data is ready.
function budgetAvailable(){
 const id=typeof liveProfile==='undefined'?null:liveProfile?.id;
 return !!id && liveProfile.role==='admin' && Work82.loaded && !Work82.error && !Work82.loading &&
  Work82.owner===id && !window.workspaceRequest138?.target &&
  window.access113?.can('transactions-budget14313') &&
  ['reference','business','profiles','payroll'].every(name=>window.startup14257?.isPrepared(name));
}
function budgetShortcut(box,retry){
 let button=box.querySelector('[data-open-budget]');
 if(!retry||!budgetAvailable()){button?.remove();return;}
 if(!button){button=document.createElement('button');button.type='button';button.className='je-btn';
  button.dataset.openBudget='';button.textContent='Open Budget Requests';box.append(button);}
 const owner=liveProfile.id,client=ojmDb;
 button.onclick=()=>{
  if(owner===liveProfile?.id&&client===ojmDb&&budgetAvailable())window.budgetWorkflow14316.chooseRequest(true);
 };
}
function ready(){window.startupData1443=async function(check){clearTimeout(retryTimer14338);const actor=liveProfile.id,fresh=typeof freshLoginRequested!=='undefined'&&freshLoginRequested;const current={actor,loaded:new Map(),done:new Set(),generation:0,refreshNeeded:fresh};job=current;document.querySelectorAll('[data-area-loading]').forEach(n=>{n.removeAttribute('data-area-loading');n.querySelector(':scope > .area-loading-status')?.remove()});window.startup14257.dataReady=false;window.startup14257.interactive=false;window.startup14257.restoring=!fresh;
 const valid=()=>{check();if(job!==current||liveProfile?.id!==actor)throw Error('Session changed')};
 const tasks={opening:()=>window.openingBalances14234?.check(true),reference:async force=>{
  await Promise.all([loadReferenceDataFromSupabase(),window.AccountGroups143180?.prepare(force)]);
  valid();await window.TemplateCloud275?.sync();
 },journal:(force,options)=>loadJournalFromSupabase({cacheFirst:!force,...options}),reports:force=>window.reportWindow143195?.preload(force),business:()=>loadBusinessSettingsFromSupabase(),profiles:()=>loadProfilesFromSupabase(),legal:()=>loadLegalDocumentsFromSupabase(),submissions:()=>loadSubmissionsFromSupabase(),review:()=>loadStaffJournalsForReview(),home:async force=>{const result=await window.Organization14229.loadHome(force);valid();window.TeamHome14227?.usePrepared(result)},audit:async force=>{await loadTransactionAudit(force);await window.workspace138?.prepareAudit(force)},workflow:async force=>{if(force)await window.workflow136?.reload({skipJournal:true});else if(window.workflowReady1443)await window.workflowReady1443;else await window.workflow136?.reload({skipJournal:true});if(window.workflow136?.state.todoError)throw Error(workflow136.state.todoError)},schedules:prepareSchedules,payroll:async force=>{if(liveProfile.role!=='admin')return;await loadWork82(force);if(Work82.error)throw Error(Work82.error);if(!force)try{await payrollTaxSettings.load()}catch(e){valid();showAppNotification('Payroll Settings',e.message,true)}},documents:async force=>{if(!access113.can('document-editor105'))return;await window.documentWorkspace105?.prepare();const r=await window.localFirst14333.loadDocuments(force);if(r.error)throw r.error}};
 const run=(name,force=false,options)=>{if(force)current.loaded.delete(name);if(!current.loaded.has(name)){const promise=Promise.resolve().then(()=>{valid();if(name==='journal'||name==='payroll'||name==='reports')return run('reference')}).then(async()=>{if(force)window.idleSync14341?.areaStatus(name,'refreshing');const before=window.offline14239?.cacheRevision,load=()=>tasks[name](force,options);const result=force&&window.offline14239?.freshReads?await offline14239.freshReads(load):await load();if(force&&before!==window.offline14239?.cacheRevision)throw Error('Showing downloaded '+name+' records; the latest server copy is still pending.');return result}).then(v=>{valid();current.done.add(name);if(force)window.idleSync14341?.areaUpdated(name);return v}).catch(e=>{current.loaded.delete(name);if(force)window.idleSync14341?.areaStatus(name,'failed');throw e});current.loaded.set(name,promise)}return current.loaded.get(name)};
 const daily=()=>['reference','business','profiles','workflow',...(liveProfile.role==='admin'?['opening']:[]),...(access113.can('settings-legal')&&liveProfile.role==='admin'?['legal']:[]),...(access113.can('transactions-recurring')&&liveProfile.role==='admin'?['schedules']:[]),...(access113.can('transactions-voided')?['audit']:[]),...(access113.can('user-entry-review')?['submissions']:[]),...(access113.can('user-entry-review')||access113.can('sub-users-workspace')?['review']:[]),...(access113.can('sub-users-home14229')?['home']:[]),...(access113.can('journal')||access113.can('sec-general-ledger')?['journal']:[]),...(Object.keys(reportNames79).some(kind=>access113.can('report-'+kind))?['reports']:[]),...(liveProfile.role==='admin'?['payroll']:[]),...(access113.can('document-editor105')?['documents']:[])];
 async function prepare(force,manual=false){
  const failures=[],names=force?daily():[...new Set([...daily(),...requirements(Location69.view),'workflow'])];
  const stages=[['reference','business','profiles'],['opening','workflow','legal','schedules'],['audit','submissions','review','home'],['journal','reports'],['payroll'],['documents']];
  const labels=['Accounts, currencies & settings','Approvals & schedules','Audit & submissions','Journal, ledger & reports','HR & payroll','Documents'];
  if(force)window.idleSync14341?.planAreas(names);
  for(let i=0;i<stages.length;i++){
   const selected=stages[i].filter(name=>names.includes(name));if(!force&&!selected.length)continue;
   const message=(force?'Refreshing ':'Preparing ')+labels[i]+' · '+(i+1)+' / 6…';
   if(force)window.idleSync14341?.progress(message);else pending(true,message);
   for(const name of selected){
    valid();if(force&&!manual&&window.idleSync14341&&!idleSync14341.allowed())return false;
    if(force&&current.refreshDone?.has(name))continue;
    if(navigator.onLine===false&&force)throw Error('Connection lost. Downloaded records and pending work remain on this device.');
    try{await run(name,force);if(force)current.refreshDone.add(name)}catch(e){valid();failures.push(name+': '+e.message)}
    await new Promise(resolve=>setTimeout(resolve,0));
   }
  }
  if(failures.length)throw Error(failures.join(' · '));return true;
 }
 const loadArea=view=>{
  const load=()=>Promise.all(requirements(view).map(name=>run(name)));
  return window.offline14239?.cachedReads?offline14239.cachedReads(load):load();
 };
 let loadingPanel=null;
 function areaStatus(panel,message,retry){
  loadingPanel?.removeAttribute('data-area-loading');loadingPanel?.querySelector(':scope > .area-loading-status')?.remove();
  loadingPanel=null;if(!panel)return;
  loadingPanel=panel;panel.setAttribute('data-area-loading','');
  const status=document.createElement('div');status.className='area-loading-status';status.setAttribute('role','status');
  status.textContent=message;
  if(retry){const button=document.createElement('button');button.type='button';button.className='je-btn';button.textContent='Retry';button.onclick=retry;status.append(' ',button);}
  panel.append(status);
 }
 current.activate=async()=>{
  if(current.initializing||window.startup14257.preparing||job!==current||liveProfile?.id!==actor)return;
  const view=Location69.view,revision=++current.generation,needed=requirements(view),panel=document.querySelector('.tab-content.active');
  if(needed.every(n=>current.done.has(n))){areaStatus(null);pending(false);window.startup14257.interactive=true;current.visit?.(view);return;}
  window.startup14257.interactive=false;
  const desktop=panel&&innerWidth>640;
  if(desktop)areaStatus(panel,'Opening your saved workspace…');else pending(true,'Opening your saved workspace…');
  try{
   await loadArea(view);valid();
   if(current.generation!==revision)return;
   await window.workspaceViews14364?.build(true,false);valid();
   if(current.generation===revision){areaStatus(null);pending(false);window.startup14257.interactive=true;current.visit?.(view);}
  }catch(e){if(job===current&&current.generation===revision){const message='This area could not load: '+e.message;
   if(desktop)areaStatus(panel,message,()=>current.activate());else pending(true,message,()=>current.activate());}}
 };
 window.releaseLogin1443?.();
 current.refreshDone=new Set();
 current.initializing=true;
 const initial=async()=>{
  const before=window.offline14239?.cacheRevision;
  window.startup14257.preparing=true;
  window.startup14257.prepared=false;
  pending(true,fresh?'Preparing your saved workspace…':'Opening your saved workspace…');
  try{
   await window.localFirst14333?.initialize();valid();
   if(fresh){
    await (window.offline14239?.cachedReads?offline14239.cachedReads(()=>prepare(false)):prepare(false));
    await window.workflowReady1443;
   }else await loadArea(Location69.view);
   valid();
   if(fresh)pending(true,'Building your saved screens…');
   if(!window.workspaceViews14364)await window.preparedViews14340?.build();
   valid();
   current.initializing=false;
   window.startup14257.dataReady=true;
   window.startup14257.interactive=!window.workspaceViews14364;
   window.startup14257.prepared=!window.workspaceViews14364;
   current.refreshNeeded=fresh&&(daily().some(name=>!current.done.has(name))||before!==window.offline14239?.cacheRevision);
   if(!window.workspaceViews14364)pending(false);
  }catch(e){
   if(job===current)pending(true,'Preparation paused: '+e.message,async()=>{await initial();if(window.startup14257.dataReady)await window.workspaceViews14364?.finish()});
  }finally{if(job===current){window.startup14257.preparing=false;window.offline14239?.changed()}}
 };
 await initial();
 let backgroundJob;const background=(manual=false)=>{if(!manual&&!current.refreshNeeded)return Promise.resolve();if(current.initializing||!manual&&window.idleSync14341&&!idleSync14341.allowed())return Promise.resolve();if(job!==current||liveProfile?.id!==actor||navigator.onLine===false)return Promise.resolve();if(backgroundJob)return backgroundJob;if(manual)current.refreshDone.clear();clearTimeout(retryTimer14338);window.startup14257.preparing=true;window.startup14257.background=!manual;window.startup14257.refreshError='';window.offline14239?.changed();backgroundJob=(async()=>{try{const complete=await prepare(true,manual);valid();if(!complete)return;current.refreshDone.clear();window.startup14257.prepared=true;current.refreshedAt=Date.now();current.refreshNeeded=false;window.sessionCache14333?.remember();window.localFirst14333?.setNotice('');return true}catch(e){if(job===current&&liveProfile?.id===actor){window.startup14257.refreshError=e.message;window.localFirst14333?.setNotice('Refreshing saved records is waiting: '+e.message);window.idleSync14341?.request?.()}return false}finally{if(job===current){window.startup14257.preparing=false;window.startup14257.background=false;window.offline14239?.changed()}backgroundJob=null}})();return backgroundJob};
 window.idleSync14341?.request?.();
 window.startup14257.retryArea=async name=>{
  valid();
  if(!daily().includes(name))throw Error('This area is unavailable with your current access.');
  await run(name,true);valid();current.refreshDone.add(name);
 };
 // Check only the visible area's revision. Pending saves keep their existing reconnect path.
 const client=ojmDb;
 const available=()=>job===current&&liveProfile?.id===actor&&ojmDb===client&&!window.workspaceRequest138?.target&&window.offline14239?.canRefresh();
 const guard=()=>{valid();if(!available())throw Error('Workspace or connection changed.');};
 let checkFlight,sessionFlight,lastCheck=0,lastView='',opened=false,disconnected=false;
 const unsafeToRedraw=()=>document.activeElement?.matches('input,select,textarea,[contenteditable]:not([contenteditable="false"])')||
  !!document.querySelector('dialog[open],.modal-backdrop.active,.submission-compare-overlay');
 let editRevision=0;
 current.noteEdit=()=>{editRevision++;};
 const checkArea=(view,{booksOnly=false,force=false}={})=>{
  if(!available()||!window.startup14257.interactive||window.startup14257.preparing||document.hidden)return;
  if(checkFlight)return checkFlight;
  if(!force&&lastView===view&&Date.now()-lastCheck<60000)return;
  const needed=requirements(view),editing=editRevision;
  const canPresent=()=>available()&&Location69.view===view&&!document.hidden&&!unsafeToRedraw()&&editRevision===editing;
  if(!canPresent())return;
  checkFlight=(async()=>{
   const period=yearWindow14333.state(),checked=new Map();
   async function revision(to){
    if(!checked.has(to)){
     const r=await client.rpc('journal_window14333',{p_from:to,p_to:to,p_offset:1}).setHeader('x-ojm-database-only','1');
     guard();if(r.error)throw r.error;if(!r.data?.revision)throw Error('Missing journal revision.');
     checked.set(to,r.data.revision);
    }
    return checked.get(to);
   }
   const report=view.startsWith('report-')&&needed.includes('reports');
   if(!report&&needed.includes('journal')&&current.done.has('journal')&&await revision(period.to)!==period.revision14341&&canPresent()){
    const selected=yearWindow14333.state();
    if(selected.from===period.from&&selected.to===period.to)await run('journal',true,{canPresent});
   }
   if(report&&current.done.has('reports')&&canPresent()&&await revision('9999-12-31')!==reportWindow143195.savedRevision()&&canPresent()){
    await run('reports',true);guard();
    if(canPresent())window.renderReports79?.();
   }
   if(booksOnly||!canPresent())return;
   if(needed.includes('payroll')&&current.done.has('payroll'))await offline14239.freshReads(()=>localFirst14333.refreshWork(canPresent));
   if(view==='document-editor105'&&canPresent())await localFirst14333.loadDocuments(true);
   if(needed.length===1&&needed[0]==='reference'&&canPresent())await loadReferenceDataFromSupabase({databaseOnly:true,onlyIfChanged:true,canPresent});
   if(view==='settings-business'&&canPresent())await offline14239.freshReads(()=>loadBusinessSettingsFromSupabase({onlyIfChanged:true,canPresent}));
  })().then(()=>{if(canPresent()){lastView=view;lastCheck=Date.now();}}).catch(()=>{
   if(available())window.idleSync14341?.areaStatus('journal','failed');
  }).finally(()=>{checkFlight=null;});
  return checkFlight;
 };
 current.resume=()=>{
  if(!available()||!window.startup14257.interactive||sessionFlight)return sessionFlight;
  sessionFlight=(async()=>{
   await offline14239.confirmConnection();guard();
   await journalDurable14385.initialize();guard();
   if(journalDurable14385.pending().some(j=>['pending','saving','uncertain'].includes(j.status)))await journalDurable14385.sync({reconnected:true});
   guard();await offline14239.resumeStaff();guard();await localFirst14333.resumeDrafts();
  })().catch(()=>{}).finally(()=>{sessionFlight=null;});
  return sessionFlight;
 };
 current.visit=(view,force=false)=>{
  if(!opened)return;
  requestAnimationFrame(()=>setTimeout(()=>{
   if(Location69.view!==view)return;
   if(checkFlight&&lastView!==view)void checkFlight.then(()=>{if(Location69.view===view)void checkArea(view,{force:false});});
   else void checkArea(view,{force});
  },0));
 };
 let retryTimer=null,retrying=false;
 // One delayed retry covers a dropped acknowledgment while Wi-Fi still appears online.
 // A persistent failure waits for the next save, reconnect, or sign-in.
 window.startup14257.retryDelivery=()=>{
  if(retryTimer||retrying||!available())return;
  retryTimer=setTimeout(async()=>{
   retryTimer=null;if(!available())return;retrying=true;
   try{
    await offline14239.confirmConnection();guard();
    if(journalDurable14385.pending().some(j=>j.status==='uncertain'))await journalDurable14385.sync({reconnected:true});
    guard();await offline14239.resumeStaff();guard();await localFirst14333.resumeDrafts();
   }catch(e){notice('journal',e);}finally{retrying=false;}
  },8000+Math.random()*2000);
 };
 current.connected=()=>{
  if(!window.startup14257.interactive)return;
  if(!available()||offline14239.offline()){disconnected=true;return;}
  if(opened&&!disconnected)return;
  if(sessionFlight)return;
  opened=true;disconnected=false;current.visit(Location69.view,true);
  void current.resume();
 };
 window.startup14257.checkBooks=()=>checkArea(Location69.view,{booksOnly:true,force:true})||Promise.resolve();
 current.revalidate=background;window.startup14257.revalidate=background;return current.done.size>0;
 };
 const change=window.switchTab;window.switchTab=function(...args){const r=change.apply(this,args);void job?.activate?.();return r};const accountChange=window.scrollToAccountModule;window.scrollToAccountModule=function(...args){const r=accountChange.apply(this,args);void job?.activate?.();return r};
 for(const event of ['workspace-opened421','online','offline','connection14239','session-online14333'])window.addEventListener(event,()=>job?.connected?.());
 window.addEventListener('idle-sync14341',()=>{if(job)job.refreshNeeded=true;});
 window.addEventListener('online',()=>{if(job)job.refreshNeeded=true;window.idleSync14341?.request?.()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)job?.visit?.(Location69.view)});
 for(const type of ['input','change'])document.addEventListener(type,event=>{if(event.isTrusted)job?.noteEdit?.()},true);
}
window.startup14257={requirements,isPrepared:name=>!!job&&job.actor===liveProfile?.id&&job.done.has(name),needsRefresh:()=>!!job?.refreshNeeded};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
