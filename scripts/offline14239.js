/* Account-scoped, complete response snapshots and explicit-only entry synchronization. */
(()=>{'use strict';
const nativeFetch=window.fetch.bind(window),readRPC=new Set(['workflow_capabilities14253','current_access14228','accounting_workspace_allowed123','is_admin','branch_home14229','review_directory14229','review_inbox14229','fund_balances136','team_funds113','staff_report1434','report_history14229','approved_report1443','book_sessions_list136','reminder_load14229','opening_status14234','workspace_context138','workspace_live_activity_v49','audit_month1434','employee_photo113']);
const actor=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'',scope=()=>String(window.OJM_SUPABASE_URL||location.origin),prefix=id=>'ojm-offline14239:'+scope()+':'+id+':';
let reachable=navigator.onLine,syncing=false,lastRead=null,storageError='',cacheDB,dialog,shellReady=false,visibleActor='',connectionError='',notificationPending=false,queueRevision=0,lastNotification='';
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const memory=new Map();
function db(){return cacheDB??=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Device storage timed out')),1500),r=indexedDB.open('ojm-offline14239',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>{clearTimeout(timer);resolve(r.result)};r.onerror=r.onblocked=()=>{clearTimeout(timer);reject(r.error||Error('Device storage blocked'))}})}
async function stored(mode,key,value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots',mode),s=tx.objectStore('snapshots'),r=mode==='readonly'?s.get(key):s.put(value,key),timer=setTimeout(()=>{reject(Error('Device storage timed out'));try{tx.abort()}catch{}},1500);tx.oncomplete=()=>{clearTimeout(timer);resolve(r.result)};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(tx.error||Error('Device storage interrupted'))}})}
function remember(key,row){memory.delete(key);memory.set(key,row);if(memory.size>100)memory.delete(memory.keys().next().value);void stored('readwrite',key,row).catch(e=>{storageError='Offline copy unavailable: '+e.message;changed()})}
function changed(){if(notificationPending)return;notificationPending=true;requestAnimationFrame(()=>{notificationPending=false;const signature=JSON.stringify([actor(),navigator.onLine,reachable,syncing,lastRead,storageError,connectionError,queueRevision,shellReady,window.saveNotices14234?.entries?.().map(j=>[j.id,j.message])]);if(signature===lastNotification)return;lastNotification=signature;window.dispatchEvent(new Event('connection14239'));})}
function connectionIssue(message){reachable=false;connectionError=message||'Connection interrupted';changed()}
async function readCopy(key){if(!key)return null;try{if(memory.has(key))return memory.get(key);const row=await stored('readonly',key);if(row){memory.set(key,row);if(memory.size>100)memory.delete(memory.keys().next().value)}return row}catch(e){storageError=e.message;changed();return null}}
function fromCopy(row){lastRead=row.at;changed();return new Response(row.body,{status:row.status,headers:{...row.headers,'X-OJM-Cached':row.at}})}
function offline(){return navigator.onLine===false||!reachable}
function request(promise){let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>{const error=Object.assign(Error('The complete response was not confirmed. Your draft is kept; retry with the same reference.'),{code:'NETWORK_TIMEOUT14241'});connectionIssue(error.message);reject(error)},20000))]).finally(()=>clearTimeout(timer))}
function identity(headers){try{const t=(headers.get('authorization')||'').replace(/^Bearer /i,'').split('.')[1];const p=JSON.parse(atob(t.replace(/-/g,'+').replace(/_/g,'/')));return p.sub&&p.exp*1000>Date.now()?p.sub:''}catch{return ''}}
function errorResponse(message,code='OFFLINE14239'){return new Response(JSON.stringify({message,code}),{status:503,headers:{'Content-Type':'application/json'}})}
window.fetch=async function(input,options={}){
 const req=new Request(input,options),url=new URL(req.url);
 if(!window.OJM_SUPABASE_URL||url.origin!==new URL(window.OJM_SUPABASE_URL).origin||!url.pathname.startsWith('/rest/v1/'))return nativeFetch(input,options);
 const rpc=url.pathname.split('/rpc/')[1],read=req.method==='GET'||req.method==='HEAD'||readRPC.has(rpc),id=identity(req.headers);
 const ranged=req.headers.has('range')||url.searchParams.has('offset')||url.searchParams.has('limit');
 const body=read&&req.method==='POST'?await req.clone().text():'';
 const key=id&&!ranged&&req.method!=='HEAD'?prefix(id)+'read:'+req.method+':'+url.href+':'+body+':'+(req.headers.get('accept')||'')+':workspace:'+(req.headers.get('x-ojm-workspace')||''):'';
 if(!read&&offline())return errorResponse('Connection required. Your draft is retained; reconnect before approval, final posting or changing saved records.');
 const previous=read&&key?readCopy(key):Promise.resolve(null);
 if(read&&navigator.onLine===false){const row=await previous;return row?fromCopy(row):errorResponse('This record has not been downloaded to this device. Reconnect to load it.')}
 const controller=new AbortController(),abort=()=>controller.abort(req.signal.reason);if(req.signal.aborted)abort();else req.signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(Error('Connection timed out before the complete response arrived')),read?8000:15000);
 // A loaded copy keeps browsing responsive when the next read is too slow.
 const slow=read?setTimeout(async()=>{if(await previous)controller.abort(Error('Showing downloaded data while the connection is slow'))},1800):null;
 let status=0;
 try{
  const response=await nativeFetch(new Request(req,{signal:controller.signal}));status=response.status;
  const text=req.method==='HEAD'||[204,205,304].includes(response.status)?null:await response.text();
  if(read&&response.ok&&text!==null)JSON.parse(text);
  if(response.status>=500){connectionIssue('The database service is temporarily unavailable');const row=read?await previous:null;if(row)return fromCopy(row)}
  else{reachable=true;connectionError=''}
  if(response.ok&&read&&key&&text!==null)remember(key,{body:text,status:response.status,headers:Object.fromEntries(response.headers),at:new Date().toISOString()});
  changed();return new Response(text,{status:response.status,statusText:response.statusText,headers:response.headers});
 }catch(e){if(req.signal.aborted)throw e;if(status===401||status===403){reachable=true;connectionError='';changed();return new Response(JSON.stringify({message:'The server denied access. Please sign in again.',code:status===403?'42501':'PGRST301'}),{status,headers:{'Content-Type':'application/json'}})}connectionIssue(e.message);if(read){const row=await previous;if(row)return fromCopy(row)}throw e}
 finally{clearTimeout(timer);clearTimeout(slow);req.signal.removeEventListener('abort',abort)}
};
function queue(id=actor()){if(!id)return [];const list=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith(prefix(id)+'entry:'))continue;try{const j=JSON.parse(localStorage.getItem(k));if(j.actor===id){if(j.status==='syncing'&&!syncing){j.status='attention';j.message='Previous sync was interrupted. Retry keeps the same reference.'}list.push(j)}}catch{storageError='A saved device entry could not be read. Keep this browser data and recover the entry before continuing.'}}return list.sort((a,b)=>a.created.localeCompare(b.created))}
function persist(job){queueRevision++;localStorage.setItem(prefix(job.actor)+'entry:'+job.payload.p_key,JSON.stringify(job));changed()}
function enqueue(payload){const id=actor();if(!id)throw Error('Sign in before saving an offline entry.');if(payload.p_edit_ids?.length)throw Error('This is an edit to a saved record. Your draft is kept; reconnect and review the current record before saving to prevent overwriting another change.');
 if(!payload.p_key||!payload.p_owner||!Array.isArray(payload.p_items)||!payload.p_items.length||canonical(payload.p_items)!==canonical(payload.p_snapshot?.components1437))throw Error('The complete entry and its snapshot must match before it can be saved on this device.');
 const existing=queue(id).find(j=>j.payload.p_key===payload.p_key);if(existing){if(canonical(existing.payload)!==canonical(payload))throw Error('This reference already belongs to a different entry. Review the pending entry.');return existing}
 const job={actor:id,payload:structuredClone(payload),status:'pending',created:new Date().toISOString()};persist(job);return job;
}
async function sync(){if(syncing)return;const id=actor();if(!id)throw Error('Sign in to sync your entries.');if(navigator.onLine===false)throw Error('You are offline. Saved entries will sync automatically after reconnecting.');syncing=true;changed();
 try{
  // Authorization is freshly checked by every atomic server save; never replace its payload/reference.
  reachable=true;connectionError='';
  for(const job of queue(id).filter(j=>j.status!=='synced')){
   if(actor()!==id)break;if(!window.access113?.can('sub-users-workspace','edit'))throw Error('Entry editing access is required to sync.');if(job.payload.p_edit_ids?.length){job.status='attention';job.message='This saved-record edit requires review; it will not be uploaded automatically.';persist(job);continue}
   job.status='syncing';persist(job);
   try{const r=await request(ojmDb.rpc('save_staff_editor1437',job.payload));if(r.error)throw r.error;
    if(!Array.isArray(r.data?.line_ids)||r.data.line_ids.length!==job.payload.p_items.length||r.data.line_ids.some(x=>!x)||new Set(r.data.line_ids).size!==r.data.line_ids.length)throw Error('The complete database receipt was not confirmed. Retry keeps the same reference.');
    job.status='synced';job.receipt=r.data;job.syncedAt=new Date().toISOString();delete job.message;persist(job);localStorage.setItem(prefix(id)+'lastSync',job.syncedAt);
   }catch(e){job.status='attention';job.message=e.message||'Connection interrupted; database result unconfirmed.';persist(job);if(offline())break}
  }
  if(actor()===id&&!offline())for(const j of window.saveNotices14234?.entries?.()||[]){if(actor()!==id)break;try{await j.retry()}catch(e){storageError='A previous save still needs attention: '+e.message}}
  if(actor()===id&&!offline()){try{await request(loadStaffJournalsForReview());window.funds113?.refresh();await request(window.PhoneApp132?.refresh?.())}catch(e){storageError='Entries may be synced; refreshing the view failed. '+e.message}}
 }finally{syncing=false;changed()}
}
async function snapshot(name,loader){const id=actor(),k=prefix(id)+'snapshot:'+name;if(!id)return loader();try{if(offline())throw Error('Offline');const value=await loader();if(actor()!==id)throw Error('Account changed while loading');remember(k,{value,at:new Date().toISOString()});return value}catch(e){if(actor()!==id||!offline())throw e;const row=memory.get(k)||await stored('readonly',k);if(!row)throw Error('This complete dataset has not been downloaded yet. Reconnect to load it.');lastRead=row.at;changed();return structuredClone(row.value)}}
function state(){const jobs=queue(),legacy=window.saveNotices14234?.entries?.()||[];return {online:!offline(),syncing,attention:!!storageError||legacy.length>0||jobs.some(j=>j.status==='attention'),pending:jobs.filter(j=>j.status!=='synced').length+legacy.length,lastSync:actor()?localStorage.getItem(prefix(actor())+'lastSync'):null,lastRead,storageError,connectionError,jobs,legacy,shellReady}}
function open(){dialog?.remove();const box=document.createElement('dialog');box.className='connection-dialog14239';dialog=box;document.body.append(box);renderDialog();box.showModal();box.addEventListener('close',()=>{box.remove();if(dialog===box)dialog=null})}
function renderDialog(){
 if(!dialog)return;const s=state();dialog.replaceChildren();dialog.setAttribute('aria-labelledby','connectionTitle14246');
 const add=(tag,text,parent=dialog,className='')=>{const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;parent.append(n);return n};
 const header=add('header','');const title=add('h2','Connection & sync',header);title.id='connectionTitle14246';add('p','Connection status and entries saved on this device.',header);
 const section=(title,tone='')=>{const box=add('section','',dialog,'sync-section14246 '+tone);add('h3',title,box);return box};
 const summary=section('Connection');add('p',s.online?'Online — ready to connect to the database.':navigator.onLine===false?'Offline — downloaded records remain available.':'Limited connection — downloaded records remain available.',summary);
 const files=section('Website files');add('p',s.shellReady?'Downloaded for reopening without connection.':'Still preparing. Keep this tab open to finish downloading.',files);
 const latest=section('Last update');add('p','Last database sync: '+(s.lastSync?new Date(s.lastSync).toLocaleString():'No device entries synced yet'),latest);if(s.lastRead)add('p','Downloaded records: '+new Date(s.lastRead).toLocaleString(),latest);
 if(s.storageError||s.connectionError){const alerts=section('Needs attention','sync-warning14246');for(const message of [s.storageError,s.connectionError].filter(Boolean))add('p',message,alerts);}
 const owner=document.getElementById('personalWorkspace1437')?.dataset.owner||window.activeSubUserTab?.()?.userId||actor();
 const current=s.jobs.filter(j=>j.payload.p_owner===owner),waiting=current.filter(j=>j.status!=='synced');
 const workspace=section('Current workspace');
 add('p',s.syncing?'Uploading saved entries…':waiting.length?waiting.length+' saved entries awaiting database confirmation.':current.length?'All queued entries for this workspace are confirmed in the database.':'No queued entries for this workspace.',workspace);
 const draft=document.getElementById('jeGeneralMemo')?.value?.trim()||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-memo,#simpleRows1430 [data-simple=amount]')].some(n=>n.value?.trim());
 if(draft)add('p','The open editor contains a draft. It is not uploaded until you save or post it.',workspace);
 const pending=section('Device entries · '+s.pending);add('p',window.autoSync14256?'Saved device entries sync automatically when a connection is available. Device entries are excluded from database totals until confirmed.':'Automatic sync is preparing. Device entries are excluded from database totals until confirmed.',pending);
 const groups=[['Waiting to sync',s.jobs.filter(j=>!['attention','synced'].includes(j.status))],['Needs confirmation',s.jobs.filter(j=>j.status==='attention')],['Synced',s.jobs.filter(j=>j.status==='synced')]];
 for(const [label,jobs]of groups){if(!jobs.length)continue;add('h4',label,pending);for(const j of jobs){const a=add('article','',pending,'sync-entry14246');add('strong',j.payload.p_items[0].date+' · '+(j.payload.p_snapshot.memo||j.payload.p_items[0].memo),a);add('p',j.status==='synced'?'Confirmed in the database':j.status==='syncing'?'Syncing…':j.status==='attention'?j.message:'Saved on this device',a);add('small','Reference: '+j.payload.p_key,a);}}
 if(s.legacy.length){add('h4','Other saves needing confirmation',pending);for(const j of s.legacy){const a=add('article','',pending,'sync-entry14246');add('strong',j.title,a);add('p',j.message,a);add('small','Reference: '+j.id,a);}}
 if(!s.pending&&!s.jobs.length)add('p','No device entries waiting to sync.',pending);
 const rules=section('Actions that require connection');add('p','Approvals, final posting, changes to database records and period closing require a connection.',rules);
 const footer=add('footer','');const close=add('button','Close',footer);close.type='button';close.onclick=()=>dialog.close();
}
function paint(doc=document,phone=false){if(visibleActor!==actor()){visibleActor=actor();dialog?.close();lastRead=null}const s=state(),label=s.online?'Online':navigator.onLine===false?'Offline':'Limited connection';const hosts=phone?[doc.querySelector('.top')]:[...doc.querySelectorAll('.area-banner113,.dash-hero112')];for(const host of hosts.filter(Boolean)){let b=host.querySelector('.connection14239');if(!b){b=doc.createElement('button');b.type='button';b.className='connection14239';b.onclick=open;if(phone)host.insertBefore(b,host.querySelector('.profile'));else host.append(b)}const text=label;if(b.textContent!==text)b.textContent=text;const state=s.online?'online':navigator.onLine===false?'offline':'limited',aria=text+(window.autoSync14256?'. Connection and automatic sync':'. Connection and saved-entry status');if(b.dataset.state!==state)b.dataset.state=state;if(b.getAttribute('aria-label')!==aria)b.setAttribute('aria-label',aria);}}
const SHELL_VERSION='142.99.1';let shellRegistration=null,waitingForLoad=false,shellFailures=0,shellRetry=null;
async function checkShell(worker){if(!worker)return;const channel=new MessageChannel();let timer;try{const data=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Offline files are still preparing')),1500);channel.port1.onmessage=e=>resolve(e.data);worker.postMessage({type:'ojm-shell-status'},[channel.port2])});shellReady=data.ready===true&&data.version===SHELL_VERSION;if(shellReady&&/^(Offline files|Offline reopening)/.test(storageError))storageError='';changed()}catch{shellReady=false}finally{clearTimeout(timer);channel.port1.close()}}
function registerShell(){
 if(window.startup14257&&!window.startup14257.interactive&&typeof liveProfile!=='undefined'&&liveProfile){clearTimeout(shellRetry);shellRetry=setTimeout(registerShell,3000);return}
 if(!('serviceWorker'in navigator))return;
 if(navigator.onLine===false){navigator.serviceWorker.getRegistration().then(reg=>checkShell(reg?.active)).catch(()=>{});return}
 if(document.readyState!=='complete'){if(!waitingForLoad){waitingForLoad=true;window.addEventListener('load',registerShell,{once:true})}return}
 if(shellRegistration){shellRegistration.then(reg=>{if(reg&&!reg.installing&&!reg.waiting&&!shellReady)reg.update().catch(()=>{shellRegistration=null;registerShell()})});return}
 shellRegistration=navigator.serviceWorker.register('desktop-sw14242.js?v='+SHELL_VERSION,{updateViaCache:'none'}).then(reg=>{
  const watch=()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='activated')checkShell(reg.active);if(worker.state==='redundant'){shellReady=false;storageError='Offline files could not finish downloading. Continue working online and retry when connected.';shellRegistration=null;if(navigator.onLine&&++shellFailures<=3){clearTimeout(shellRetry);shellRetry=setTimeout(registerShell,1500)}changed()}})};
  reg.addEventListener('updatefound',watch);watch();checkShell(reg.active);return reg;
 }).catch(e=>{shellRegistration=null;storageError='Offline reopening is unavailable: '+e.message;changed()});
}
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='ojm-shell-ready'&&e.data.version===SHELL_VERSION){shellReady=true;shellFailures=0;changed()}});
function ready(){
 // Keep the original journal implementation unchanged; snapshot only complete loads.
 const loadJournal=window.loadJournalFromSupabase;
 if(typeof loadJournal==='function')window.loadJournalFromSupabase=async function(...args){
  let loaded=false;const rows=await snapshot('complete-journal',async()=>{await loadJournal.apply(this,args);loaded=true;return structuredClone(JournalModule.entries)});
  if(!loaded){JournalModule.entries=rows;syncEntrySequence();updateNextEntryIdDisplay();refreshAllTables();}
 };
 paint();let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;paint()})};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('connection14239',()=>{paint();renderDialog();try{const f=document.getElementById('connectedPhone132');if(f?.contentDocument)paint(f.contentDocument,true)}catch{}});window.addEventListener('page113',schedule);registerShell();}
function pendingOwner(id){return queue().some(j=>j.payload.p_owner===id&&j.status!=='synced')||!!window.saveNotices14234?.staffPending?.(id).length}
window.offline14239={offline,state,pendingOwner,enqueue,queue,sync,open,paint,snapshot,canonical,changed,connectionIssue,request};
window.addEventListener('online',()=>{reachable=true;connectionError='';shellFailures=0;clearTimeout(shellRetry);registerShell();changed()});window.addEventListener('offline',()=>{reachable=false;changed()});window.addEventListener('storage',()=>{queueRevision++;changed()});window.addEventListener('save-state14234',changed);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();

