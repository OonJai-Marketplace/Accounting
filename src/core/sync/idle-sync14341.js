/* Desktop and tablet outbox synchronization requires a user action. */
(()=>{'use strict';
let manual=false,preparation='',problem='',retry,flight,session,summaryOwner='',dirty=true;
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const scope=()=>String(window.OJM_SUPABASE_URL||location.origin);
const storageKey=()=> 'ojm-sync14351:'+scope()+':'+actor();
const allowed=()=>false;
const bytes=n=>n<1000?n+' bytes':n<1000000?(n/1000).toFixed(2)+' KB':(n/1000000).toFixed(2)+' MB';
function pending(){return window.syncRecords284?.pending()||[];}
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
 return {requests:rows,problem,session:session?structuredClone(session):null,groups:[...groups.values()],synced:session?.confirmedRecords||0,pending:waiting.reduce((n,j)=>n+j.records,0),pendingBytes:waiting.reduce((n,j)=>n+(j.payloadBytes||0),0),unmeasured:waiting.some(j=>j.payloadBytes==null),checking:rows.filter(j=>j.status==='server-confirmed').length};
}
function outcome(remaining){if(remaining)return 'Partial synchronization';const findings=window.syncAssessment14332?.findings()||[...(window.localFirst14333?.findings()||[]),...(window.syncRecovery14351?.findings()||[])];if(findings.some(f=>f.kind!=='recovery'&&(f.critical||f.kind==='setup')))return 'Synchronization needs attention';return findings.some(f=>['cleanup','recovery'].includes(f.kind)||f.status==='Synced — Cleanup Pending')?'Uploads confirmed — recovery cleanup pending':'Synchronization complete';}
function stage(text,current=session){if(current){current.stage=text;if(current.actor===actor()){paint();show();}}}
async function run(automatic=false,{trigger='manual'}={}){if(automatic||!['manual','pull-refresh'].includes(trigger))return;if(flight)return flight;if(!actor()||!window.offline14239||window.startup14257?.preparing||window.workspaceRequest138?.target||automatic&&!allowed())return;
 const id=actor();const execute=async()=>{if(actor()!==id||automatic&&!allowed())return;restore();manual=!automatic;problem='';const before=pending();
 const current={id:crypto.randomUUID(),actor:id,started:new Date().toISOString(),running:true,automatic:false,trigger,updatedAreas:[],refreshAreas:{},acknowledged:trigger!=='manual',total:before.length,initial:before.map(j=>j.id),initialRecords:before.map(j=>({id:j.id,records:j.records,source:j.source})),totalRecords:before.reduce((n,j)=>n+j.records,0),confirmed:0,remaining:before.length,failed:0,uploaded:0,downloaded:0,stage:'Checking saved operations',unresolved:before};session=current;persist();show();paint();
 const proceed=()=>actor()===id&&(!automatic||allowed());
 try{if(navigator.onLine===false)throw Error('Offline — saved operations remain on this device.');
  if(proceed()){stage('Uploading saved records',current);await window.localFirst14333?.sync({automatic,coordinated:true});}
  if(proceed()){stage('Confirming journal entries',current);await window.offline14239?.sync({automatic,coordinated:true});}
  if(proceed()){stage('Refreshing workspace data',current);const refreshed=await window.startup14257?.revalidate?.(!automatic,{includeInboxes:trigger==='manual'&&!automatic});if(refreshed===false&&proceed())current.refreshProblem=window.startup14257?.refreshError||'Some records could not refresh. Open details to review.';}
  if(proceed()){await window.entryNumber14257?.refresh(true);stage('Refreshing assigned ledgers',current);await window.AssignedLedger14281?.refresh?.(automatic);}
  if(proceed()){stage('Checking saved copies',current);const cleanup=await window.syncRecovery14351?.cleanup({automatic:true});if(cleanup)current.cleanup=cleanup.message;}
  if(current.refreshProblem)throw Error(current.refreshProblem);
  const after=pending(),waiting=after.filter(j=>j.status!=='server-confirmed'),remaining=new Set(waiting.map(j=>j.id));current.confirmed=before.filter(j=>!remaining.has(j.id)).length;current.remaining=waiting.length;current.unresolved=waiting;current.failed=after.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;
  countRecords(after,current);current.stage=proceed()?'Finished checking eligible operations':'Paused after the current operation; remaining work retained';current.result=outcome(current.remaining);dirty=!proceed();
 }catch(e){problem=e.message;current.stage=e.message;current.result='Synchronization needs attention';current.unresolved=pending().filter(j=>j.status!=='server-confirmed');current.remaining=current.unresolved.length;current.failed=current.unresolved.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;countRecords(current.unresolved,current);dirty=true;
 }finally{current.running=false;current.finished=new Date().toISOString();manual=false;if(actor()===id){persist();paint();show();window.dispatchEvent(new Event('sync-assessment14332'));}}
 };
 flight=Promise.resolve().then(()=>navigator.locks?navigator.locks.request('ojm-sync14351:'+scope()+':'+id,{ifAvailable:true},lock=>{if(lock)return execute();problem='Another tab is synchronizing this account. No duplicate session was started.';paint();}):execute()).finally(()=>{flight=null;paint();});return flight;
}
function countRecords(rows,session){if(!session)return;const pendingIds=new Set(rows.filter(j=>j.status!=='server-confirmed').map(j=>j.id));session.confirmedRecords=(session.initialRecords||[]).filter(j=>!pendingIds.has(j.id)).reduce((n,j)=>n+j.records,0);session.remainingRecords=rows.filter(j=>j.status!=='server-confirmed').reduce((n,j)=>n+j.records,0);session.failedRecords=rows.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).reduce((n,j)=>n+j.records,0);}
function syncNow(){show(true);return run(false)}
function request(){dirty=true;}
function feedback(){
 restore();const state=window.offline14239?.state()||{},busy=!!(manual||session?.running||state.syncing||window.localFirst14333?.syncing||window.startup14257?.preparing);
 const completed=!!session?.finished&&!needsAttention(session)&&session.result==='Synchronization complete'&&!problem&&!state.pending&&!state.attention;
 const synced=completed&&!busy&&!dirty,when=completed?formatAppDate(session.finished,true):'';
 const message=preparation||problem||(busy?'Syncing…':!state.online?'Offline · saved on this device':state.attention?'Saved work needs attention':state.pending?state.pending+' waiting for database confirmation':synced?'Synced · '+when:completed?'Last synced · '+when:'Ready to sync');
 return {busy,synced,completed,message,label:retry?'Retry download':busy?'Syncing…':synced?'Synced':completed?'Sync again':'Sync now',disabled:!!busy&&!retry||!window.offline14239?.canRefresh()||synced};
}
function paint(){
 const status=feedback(),{message}=status;
 document.getElementById('syncStatus14341')?.remove();
 for(const node of document.querySelectorAll('[data-sync-status14343]'))if(node.textContent!==message)node.textContent=message;
 for(const button of document.querySelectorAll('[data-sync-now14343]')){if(button.textContent!==status.label)button.textContent=status.label;button.disabled=status.disabled;button.onclick=retry||syncNow;}
}

function updateRecovery(){if(!session||session.actor!==actor()||session.running)return;const rows=window.syncRecovery14351?.findings()||[];session.cleanup=rows.length?rows.length+' recovery backup(s) require verification or manual cleanup.':'Managed recovery cleanup verified; no known downloaded backups awaiting cleanup.';if(!session.remaining&&/Synchronization complete|Uploads confirmed/.test(session.result||''))session.result=outcome(0);persist();show();}
function refreshFindings(){
 restore();return Object.entries(session?.refreshAreas||{}).filter(([,status])=>status==='failed').map(([area])=>({id:'refresh:'+area,area,kind:'refresh',periods:[],critical:true,status:'Refresh needed',title:(areaNames[area]||area)+' · downloaded records',detail:'The last download did not finish. Refresh this area to get the latest records.'}));
}
async function retryArea(area){
 const owner=actor(),original=session;
 await window.startup14257.retryArea(area);
 if(actor()!==owner||session!==original)return;
 session.refreshAreas[area]='updated';
 if(!refreshFindings().length&&session.refreshProblem){if(problem===session.refreshProblem)problem='';delete session.refreshProblem;window.localFirst14333?.setNotice('');}
}
function afterRepair(){
 restore();if(!session||session.running)return;
 const rows=pending(),waiting=rows.filter(r=>r.status!=='server-confirmed');
 session.remaining=waiting.length;session.unresolved=waiting;session.failed=waiting.filter(r=>['conflict','blocked','failed','attention','uncertain'].includes(r.status)).length;
 countRecords(rows,session);
 if(!problem&&!session.refreshProblem){session.result=outcome(waiting.length);session.stage=session.result;}
 persist();paint();show();
}
window.idleSync14341={refreshFindings,retryArea,afterRepair,feedback,progress(message){stage(message);const box=document.getElementById('startup1443');if(box&&!box.hidden){const copy=box.querySelector('p');if(copy)copy.textContent=message;}},overview,acknowledge,planAreas(names){if(session?.running&&session.actor===actor()){for(const name of names)session.refreshAreas[name]||='waiting';show();}},areaStatus(name,status){if(session?.running&&session.actor===actor()){session.refreshAreas[name]=status;show();}},areaUpdated(name){if(session?.running&&session.actor===actor()&&!session.updatedAreas.includes(name)){session.updatedAreas.push(name);session.refreshAreas[name]='updated';show();}},updateRecovery,allowed,remaining:()=>0,syncNow,run,request,paint,show,bytes,pending,history:()=>{restore();try{return JSON.parse(localStorage.getItem(storageKey())||'null')?.history?.filter(needsAttention)||[]}catch{return[]}},measure(uploaded,downloaded){if(session?.running&&session.actor===actor()){session.uploaded+=uploaded;session.downloaded+=downloaded;show();}},preparation(message,again){preparation=message;retry=again;paint()},get automatic(){return !manual},get running(){return !!flight},get session(){return session&&session.actor===actor()?structuredClone(session):null}};
for(const name of ['connection14239','local-work14333','save-state14234','page113'])window.addEventListener(name,()=>{paint();if(session?.running){const rows=pending().filter(j=>j.status!=='server-confirmed'),ids=new Set(rows.map(j=>j.id));session.confirmed=(session.initial||[]).filter(id=>!ids.has(id)).length;session.remaining=rows.length;session.unresolved=rows;session.failed=rows.filter(j=>['conflict','blocked','failed','attention','uncertain'].includes(j.status)).length;countRecords(rows,session);}show();});
window.addEventListener('session-online14333',request);
})();
