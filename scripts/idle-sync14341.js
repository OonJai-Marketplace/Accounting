/* One idle/manual lifecycle. Module workers retain their server validation. */
(()=>{'use strict';
const delay=120000;let last=Date.now(),timer,wasIdle=false,manual=false,preparation='',problem='',retry,channel,flight,session,summaryOwner='',entryTimer,dirty=true;
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const scope=()=>String(window.OJM_SUPABASE_URL||location.origin);
const storageKey=()=> 'ojm-sync14351:'+scope()+':'+actor();
const allowed=()=>Date.now()-last>=delay;
const bytes=n=>n<1000?n+' bytes':n<1000000?(n/1000).toFixed(2)+' KB':(n/1000000).toFixed(2)+' MB';
function announce(){const idle=allowed();if(idle&&!wasIdle){wasIdle=true;window.dispatchEvent(new Event('idle-sync14341'));void run(true);}paint();}
function arm(){clearTimeout(timer);timer=setTimeout(announce,Math.max(20,delay-(Date.now()-last)));}
let broadcastAt=0;
function activity(remote=false){const now=Date.now();last=now;if(wasIdle){wasIdle=false;paint();}arm();if(!remote&&now-broadcastAt>1000){broadcastAt=now;channel?.postMessage({type:'activity',actor:actor()});}}
try{channel=new BroadcastChannel('ojm-idle14341');channel.onmessage=e=>{if(e.data?.type==='activity'&&e.data.actor===actor())activity(true)}}catch{}
for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart','scroll'])document.addEventListener(type,()=>activity(),{capture:true,passive:true});
window.addEventListener('focus',()=>activity());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)activity()});
const size=value=>value===undefined?null:new TextEncoder().encode(JSON.stringify(value)).length;
function pending(){const rows=new Map();
 for(const j of window.journalDurable14385?.pending()||[])rows.set(j.id,{id:j.id,status:j.status,source:'Journal',records:j.entries.length,payloadBytes:size(j.entries)});
 for(const j of window.localFirst14333?.state().jobs||[])if(!['synced','resolved'].includes(j.status))rows.set(j.id,{id:j.id,status:j.status,source:j.kind,records:1,payloadBytes:size(j.row)});
 for(const j of window.offline14239?.queue()||[])if(j.status!=='synced')rows.set(j.payload.p_key,{id:j.payload.p_key,status:j.status,source:'Sub-users',records:j.payload.p_items.length,payloadBytes:size(j.payload)});
 for(const j of window.pendingPosts99?.values()||[])rows.set(j.id,{id:j.id,status:j.receipt?'server-confirmed':j.status,source:'Journal',records:j.payload.p_entries?.length||1,payloadBytes:size(j.payload)});
 for(const j of window.saveNotices14234?.staffPending()||[])if(!rows.has(j.payload.p_key))rows.set(j.payload.p_key,{id:j.payload.p_key,status:'attention',source:'Sub-users',records:j.payload.p_items.length,payloadBytes:size(j.payload)});
 const batch=window.journalBatch1440?.getJob();if(batch&&!batch.completed&&!rows.has(batch.id))rows.set(batch.id,{id:batch.id,status:batch.dates.every(d=>d.status==='saved')?'server-confirmed':batch.dates.some(d=>d.status==='uncertain')?'uncertain':'pending',source:'Journal batch',records:batch.dates.length});
 for(const j of window.saveNotices14234?.entries()||[])if(!rows.has(j.id))rows.set(j.id,{id:j.id,status:'attention',source:'Saved request',records:1});
 return [...rows.values()];
}
function needsAttention(value){return !!value&&!value.running&&(value.remaining>0||value.failed>0||value.unresolved?.length>0||/needs attention|needs review|Partial synchronization/i.test(value.result||''));}
function persist(){if(!session||session.actor!==actor())return;try{const old=JSON.parse(localStorage.getItem(storageKey())||'{"history":[]}');const history=session.running?(old.history||[]).filter(needsAttention):needsAttention(session)?[{...session}]:[];const latest=session;if(!latest&&!history.length)localStorage.removeItem(storageKey());else localStorage.setItem(storageKey(),JSON.stringify({latest,history}));}catch(e){problem='Sync result could not be saved: '+e.message;}}
function restore(){if(summaryOwner===actor())return;summaryOwner=actor();session=null;if(!summaryOwner)return;try{const saved=JSON.parse(localStorage.getItem(storageKey())||'null');session=saved?.latest;if(session?.running){session.running=false;session.stage='Previous session has no saved completion result. Requests are retained; another tab may still be working.';session.result='Synchronization status needs review';session.acknowledged=false;}if(session?.automatic&&!session.total&&!needsAttention(session))session.acknowledged=true;if(session)persist();else if(saved)localStorage.removeItem(storageKey());}catch{problem='Saved sync history could not be read.';}}
// Progress, completion and history share the connection dialog. Background work
// never opens it, and closing it never cancels saved work or creates another notice.
function show(force=false){restore();if(force)window.offline14239?.open();else window.offline14239?.refreshDialog?.();}
function acknowledge(){if(session&&!session.running){session.acknowledged=true;persist();}}
const areaNames={employees:'Employees',leaves:'Leave',runs:'Payroll',reports:'Reports',documents:'Documents',reference:'Accounts & currencies',business:'Company settings',profiles:'People & permissions',opening:'Opening balances',workflow:'Approvals & reminders',legal:'Legal documents',schedules:'Schedules',audit:'Audit history',submissions:'Submissions',review:'Sub-user journals',home:'Team overview',journal:'Journal',payroll:'Payroll',document:'Documents'};
function overview(){restore();const rows=pending(),waiting=rows.filter(j=>j.status!=='server-confirmed'),ids=new Set(waiting.map(j=>j.id)),groups=new Map();
 const group=source=>{const name=areaNames[source]||source||'Saved work';if(!groups.has(name))groups.set(name,{name,synced:0,pending:0,updated:false});return groups.get(name)};
 for(const j of session?.initialRecords||[])if(!ids.has(j.id))group(j.source).synced+=j.records;
 for(const j of waiting)group(j.source).pending+=j.records;
 for(const name of session?.updatedAreas||[])group(name).updated=true;
 for(const [name,status] of Object.entries(session?.refreshAreas||{}))group(name).refresh=status;
 return {problem,session:session?structuredClone(session):null,groups:[...groups.values()],synced:session?.confirmedRecords||0,pending:waiting.reduce((n,j)=>n+j.records,0),pendingBytes:waiting.reduce((n,j)=>n+(j.payloadBytes||0),0),unmeasured:waiting.some(j=>j.payloadBytes==null),checking:rows.filter(j=>j.status==='server-confirmed').length};
}
function onEntry(trigger='login'){clearTimeout(entryTimer);const id=actor();if(!id)return;let attempts=0;const start=()=>{if(actor()!==id||navigator.onLine===false)return;if(!window.startup14257?.prepared||window.startup14257?.preparing){if(++attempts<60)entryTimer=setTimeout(start,1000);return;}void run(false,{trigger}).catch(e=>{problem=e.message;paint()})};entryTimer=setTimeout(start,0);}
function outcome(remaining){if(remaining)return 'Partial synchronization';const findings=window.syncAssessment14332?.findings()||[...(window.localFirst14333?.findings()||[]),...(window.syncRecovery14351?.findings()||[])];if(findings.some(f=>f.kind!=='recovery'&&(f.critical||f.kind==='setup')))return 'Synchronization needs attention';return findings.some(f=>['cleanup','recovery'].includes(f.kind)||f.status==='Synced — Cleanup Pending')?'Uploads confirmed — recovery cleanup pending':'Synchronization complete';}
function stage(text,current=session){if(current){current.stage=text;if(current.actor===actor()){paint();show();}}}
async function run(automatic=false,{trigger='manual'}={}){if(flight)return flight;if(!actor()||!window.offline14239||window.startup14257?.preparing||window.workspaceRequest138?.target||automatic&&!allowed())return;
 const id=actor();const execute=async()=>{if(actor()!==id||automatic&&!allowed())return;restore();manual=!automatic;problem='';const before=pending();
 // Empty idle checks refresh and measure downloads without reopening the summary.
 const refreshOnly=automatic&&!before.length;
 const current={id:crypto.randomUUID(),actor:id,started:new Date().toISOString(),running:true,automatic:automatic||trigger!=='manual',trigger,updatedAreas:[],refreshAreas:{},acknowledged:automatic||trigger!=='manual',total:before.length,initial:before.map(j=>j.id),initialRecords:before.map(j=>({id:j.id,records:j.records,source:j.source})),totalRecords:before.reduce((n,j)=>n+j.records,0),confirmed:0,remaining:before.length,failed:0,uploaded:0,downloaded:0,stage:'Checking saved operations',unresolved:before};session=current;persist();show();paint();
 const proceed=()=>actor()===id&&(!automatic||allowed());
 try{if(navigator.onLine===false)throw Error('Offline — saved operations remain on this device.');
  if(proceed()&&!refreshOnly){stage('Uploading saved records',current);await window.localFirst14333?.sync({automatic,coordinated:true});}
  if(proceed()&&!refreshOnly){stage('Confirming journal entries',current);await window.offline14239?.sync({automatic,coordinated:true});}
  if(proceed()){stage('Refreshing workspace data',current);const refreshed=await window.startup14257?.revalidate?.(!automatic);if(refreshed===false&&proceed())throw Error('Some records could not refresh. Open details to review.');}
  if(proceed()){await window.entryNumber14257?.refresh(true);stage('Refreshing assigned ledgers',current);await window.AssignedLedger14281?.refresh?.(automatic);}
  if(proceed()){stage('Checking saved copies',current);const cleanup=await window.syncRecovery14351?.cleanup({automatic:true});if(cleanup)current.cleanup=cleanup.message;}
  const after=pending(),remaining=new Set(after.map(j=>j.id));current.confirmed=before.filter(j=>!remaining.has(j.id)).length;current.remaining=after.length;current.unresolved=after;current.failed=after.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;
  countRecords(after,current);current.stage=proceed()?'Finished checking eligible operations':'Paused after the current operation; remaining work retained';current.result=outcome(current.remaining);dirty=!proceed();
 }catch(e){problem=e.message;current.stage=e.message;current.result='Synchronization needs attention';current.unresolved=pending();current.remaining=current.unresolved.length;current.failed=current.unresolved.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;countRecords(current.unresolved,current);dirty=true;
 }finally{current.running=false;current.finished=new Date().toISOString();manual=false;if(actor()===id){persist();paint();show();window.dispatchEvent(new Event('sync-assessment14332'));}}
 };
 flight=Promise.resolve().then(()=>navigator.locks?navigator.locks.request('ojm-sync14351:'+scope()+':'+id,{ifAvailable:true},lock=>{if(lock)return execute();problem='Another tab is synchronizing this account. No duplicate session was started.';paint();}):execute()).finally(()=>{flight=null;paint();});return flight;
}
function countRecords(rows,session){if(!session)return;const pendingIds=new Set(rows.filter(j=>j.status!=='server-confirmed').map(j=>j.id));session.confirmedRecords=(session.initialRecords||[]).filter(j=>!pendingIds.has(j.id)).reduce((n,j)=>n+j.records,0);session.remainingRecords=rows.filter(j=>j.status!=='server-confirmed').reduce((n,j)=>n+j.records,0);session.failedRecords=rows.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).reduce((n,j)=>n+j.records,0);}
function syncNow(){show(true);return run(false)}
function request(){dirty=true;/* The single idle transition runs the work; no independent polling. */if(allowed()&&!flight){wasIdle=false;arm();}}
function paint(){
 restore();const state=window.offline14239?.state()||{},busy=manual||session?.running||state.syncing||window.localFirst14333?.syncing||window.startup14257?.preparing;
 const message=preparation||problem||(busy?(allowed()||manual?'Syncing…':'Pausing after the current operation…'):!state.online?'Offline · saved on this device':state.attention?'Saved work needs attention':state.pending?state.pending+' saved · waiting to sync':'No known pending uploads');
 const footer=document.querySelector('#appSidebar #topHeaderProfile104,#sidebar .sidebar-user-footer,.sidebar .sidebar-user-footer,#sidebar #topHeaderProfile104,.sidebar #topHeaderProfile104')||document.querySelector('.sidebar-user-footer');
 let box=document.getElementById('syncStatus14341');if(footer&&actor()){if(!box){box=document.createElement('section');box.id='syncStatus14341';box.className='no-print';box.innerHTML='<span class="action-spin14296" aria-hidden="true"></span><p role="status" aria-live="polite"></p>';footer.before(box)}box.hidden=!busy||!!session?.running;const copy=box.querySelector('p');if(copy.textContent!==message)copy.textContent=message;}
 for(const status of document.querySelectorAll('[data-sync-status14343]'))if(status.textContent!==message)status.textContent=message;
 for(const button of document.querySelectorAll('[data-sync-now14343]')){const label=retry?'Retry download':busy?'Syncing…':'Sync now';if(button.textContent!==label)button.textContent=label;button.disabled=!!busy&&!retry||navigator.onLine===false;button.onclick=retry||syncNow;}
}
function updateRecovery(){if(!session||session.actor!==actor()||session.running)return;const rows=window.syncRecovery14351?.findings()||[];session.cleanup=rows.length?rows.length+' recovery backup(s) require verification or manual cleanup.':'Managed recovery cleanup verified; no known downloaded backups awaiting cleanup.';if(!session.remaining&&/Synchronization complete|Uploads confirmed/.test(session.result||''))session.result=outcome(0);persist();show();}
window.idleSync14341={overview,onEntry,acknowledge,planAreas(names){if(session?.running&&session.actor===actor()){for(const name of names)session.refreshAreas[name]||='waiting';show();}},areaStatus(name,status){if(session?.running&&session.actor===actor()){session.refreshAreas[name]=status;show();}},areaUpdated(name){if(session?.running&&session.actor===actor()&&!session.updatedAreas.includes(name)){session.updatedAreas.push(name);session.refreshAreas[name]='updated';show();}},updateRecovery,allowed,remaining:()=>Math.max(0,delay-(Date.now()-last)),syncNow,run,request,paint,show,bytes,pending,history:()=>{restore();try{return JSON.parse(localStorage.getItem(storageKey())||'null')?.history?.filter(needsAttention)||[]}catch{return[]}},measure(uploaded,downloaded){if(session?.running&&session.actor===actor()){session.uploaded+=uploaded;session.downloaded+=downloaded;show();}},preparation(message,again){preparation=message;retry=again;paint()},get automatic(){return !manual},get running(){return !!flight},get session(){return session&&session.actor===actor()?structuredClone(session):null}};
for(const name of ['connection14239','local-work14333','save-state14234','page113'])window.addEventListener(name,()=>{paint();if(session?.running){const rows=pending(),ids=new Set(rows.map(j=>j.id));session.confirmed=(session.initial||[]).filter(id=>!ids.has(id)).length;session.remaining=rows.length;session.unresolved=rows;session.failed=rows.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;countRecords(rows,session);}show();});
window.addEventListener('online',()=>onEntry('reconnect'));window.addEventListener('session-online14333',()=>onEntry('reconnect'));arm();
})();
