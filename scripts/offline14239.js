/* Account-scoped, complete response snapshots and explicit-only entry synchronization. */
(()=>{'use strict';
const nativeFetch=window.fetch.bind(window),readRPC=new Set(['current_access14228','accounting_workspace_allowed123','is_admin','branch_home14229','review_directory14229','review_inbox14229','fund_balances136','team_funds113','staff_report1434','report_history14229','approved_report1443','book_sessions_list136','reminder_load14229','opening_status14234','workspace_context138','workspace_live_activity_v49','audit_month1434','employee_photo113']);
const actor=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'',scope=()=>String(window.OJM_SUPABASE_URL||location.origin),prefix=id=>'ojm-offline14239:'+scope()+':'+id+':';
let reachable=navigator.onLine,syncing=false,lastRead=null,storageError='',cacheDB,dialog,shellReady=false,visibleActor='';
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const memory=new Map();
function db(){return cacheDB??=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Device storage timed out')),1500),r=indexedDB.open('ojm-offline14239',1);r.onupgradeneeded=()=>r.result.createObjectStore('snapshots');r.onsuccess=()=>{clearTimeout(timer);resolve(r.result)};r.onerror=r.onblocked=()=>{clearTimeout(timer);reject(r.error||Error('Device storage blocked'))}})}
async function stored(mode,key,value){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('snapshots',mode),s=tx.objectStore('snapshots'),r=mode==='readonly'?s.get(key):s.put(value,key),timer=setTimeout(()=>{reject(Error('Device storage timed out'));try{tx.abort()}catch{}},1500);tx.oncomplete=()=>{clearTimeout(timer);resolve(r.result)};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(tx.error||Error('Device storage interrupted'))}})}
function remember(key,row){memory.delete(key);memory.set(key,row);if(memory.size>100)memory.delete(memory.keys().next().value);void stored('readwrite',key,row).catch(e=>{storageError='Offline copy unavailable: '+e.message;changed()})}
function changed(){window.dispatchEvent(new Event('connection14239'));}
function offline(){return navigator.onLine===false||!reachable}
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
 async function cached(){if(!key)return null;try{const row=memory.get(key)||await stored('readonly',key);if(row){lastRead=row.at;changed();return new Response(row.body,{status:row.status,headers:{...row.headers,'X-OJM-Cached':row.at}})}}catch(e){storageError=e.message;changed()}return null}
 if(read&&navigator.onLine===false)return await cached()||errorResponse('This record has not been downloaded to this device. Reconnect to load it.');
 const controller=new AbortController(),abort=()=>controller.abort(req.signal.reason);if(req.signal.aborted)abort();else req.signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(),read?8000:15000);
 try{
  const response=await nativeFetch(new Request(req,{signal:controller.signal}));
  reachable=true;
  if(response.ok&&read&&key){const copy=response.clone();void copy.text().then(text=>{JSON.parse(text);remember(key,{body:text,status:response.status,headers:Object.fromEntries(response.headers),at:new Date().toISOString()})}).catch(e=>{storageError='Offline copy unavailable: '+e.message;changed()})}
  changed();return response;
 }catch(e){if(req.signal.aborted)throw e;reachable=false;changed();if(read){const previous=await cached();if(previous)return previous}throw e}
 finally{clearTimeout(timer);req.signal.removeEventListener('abort',abort)}
};
function queue(id=actor()){if(!id)return [];const list=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith(prefix(id)+'entry:'))continue;try{const j=JSON.parse(localStorage.getItem(k));if(j.actor===id){if(j.status==='syncing'&&!syncing){j.status='attention';j.message='Previous sync was interrupted. Retry keeps the same reference.'}list.push(j)}}catch{storageError='A saved device entry could not be read. Keep this browser data and recover the entry before continuing.'}}return list.sort((a,b)=>a.created.localeCompare(b.created))}
function persist(job){localStorage.setItem(prefix(job.actor)+'entry:'+job.payload.p_key,JSON.stringify(job));changed()}
function enqueue(payload){const id=actor();if(!id)throw Error('Sign in before saving an offline entry.');if(payload.p_edit_ids?.length)throw Error('This is an edit to a saved record. Your draft is kept; reconnect and review the current record before saving to prevent overwriting another change.');
 if(!payload.p_key||!payload.p_owner||!Array.isArray(payload.p_items)||!payload.p_items.length||canonical(payload.p_items)!==canonical(payload.p_snapshot?.components1437))throw Error('The complete entry and its snapshot must match before it can be saved on this device.');
 const existing=queue(id).find(j=>j.payload.p_key===payload.p_key);if(existing){if(canonical(existing.payload)!==canonical(payload))throw Error('This reference already belongs to a different entry. Review the pending entry.');return existing}
 const job={actor:id,payload:structuredClone(payload),status:'pending',created:new Date().toISOString()};persist(job);return job;
}
async function sync(){if(syncing)return;const id=actor();if(!id)throw Error('Sign in to sync your entries.');if(navigator.onLine===false)throw Error('You are offline. Reconnect, then tap Sync now.');syncing=true;changed();
 try{
  // Authorization is freshly checked by every atomic server save; never replace its payload/reference.
  reachable=true;
  for(const job of queue(id).filter(j=>j.status!=='synced')){
   if(actor()!==id)break;if(!window.access113?.can('sub-users-workspace','edit'))throw Error('Entry editing access is required to sync.');if(job.payload.p_edit_ids?.length){job.status='attention';job.message='This saved-record edit requires review; it will not be uploaded automatically.';persist(job);continue}
   job.status='syncing';persist(job);
   try{const r=await ojmDb.rpc('save_staff_editor1437',job.payload);if(r.error)throw r.error;
    if(!Array.isArray(r.data?.line_ids)||r.data.line_ids.length!==job.payload.p_items.length||r.data.line_ids.some(x=>!x)||new Set(r.data.line_ids).size!==r.data.line_ids.length)throw Error('The complete database receipt was not confirmed. Retry keeps the same reference.');
    job.status='synced';job.receipt=r.data;job.syncedAt=new Date().toISOString();delete job.message;persist(job);localStorage.setItem(prefix(id)+'lastSync',job.syncedAt);
   }catch(e){job.status='attention';job.message=e.message||'Connection interrupted; database result unconfirmed.';persist(job);if(offline())break}
  }
  if(actor()===id&&!offline())for(const j of window.saveNotices14234?.entries?.()||[]){if(actor()!==id)break;try{await j.retry()}catch(e){storageError='A previous save still needs attention: '+e.message}}
  if(actor()===id&&!offline()){try{await loadStaffJournalsForReview();window.funds113?.refresh();await window.PhoneApp132?.refresh?.()}catch(e){storageError='Entries may be synced; refreshing the view failed. '+e.message}}
 }finally{syncing=false;changed()}
}
async function snapshot(name,loader){const id=actor(),k=prefix(id)+'snapshot:'+name;if(!id)return loader();try{if(offline())throw Error('Offline');const value=await loader();if(actor()!==id)throw Error('Account changed while loading');remember(k,{value,at:new Date().toISOString()});return value}catch(e){if(actor()!==id||!offline())throw e;const row=memory.get(k)||await stored('readonly',k);if(!row)throw Error('This complete dataset has not been downloaded yet. Reconnect to load it.');lastRead=row.at;changed();return row.value}}
function state(){const jobs=queue(),legacy=window.saveNotices14234?.entries?.()||[];return {online:!offline(),syncing,attention:!!storageError||legacy.length>0||jobs.some(j=>j.status==='attention'),pending:jobs.filter(j=>j.status!=='synced').length+legacy.length,lastSync:actor()?localStorage.getItem(prefix(actor())+'lastSync'):null,lastRead,storageError,jobs,legacy,shellReady}}
function open(){dialog?.remove();const box=document.createElement('dialog');box.className='connection-dialog14239';dialog=box;document.body.append(box);renderDialog();box.showModal();box.addEventListener('close',()=>{box.remove();if(dialog===box)dialog=null})}
function renderDialog(){if(!dialog)return;const s=state();dialog.replaceChildren();const add=(tag,text,parent=dialog)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n};add('h2','Connection & sync');add('p',s.online?'Online — pending entries upload only when you tap Sync now.':'Offline — work with downloaded records and save new personal entries on this device.');add('p',s.shellReady?'App files downloaded for offline reopening.':'App files are still downloading. Keep this tab open while offline.');add('p','Last database sync: '+(s.lastSync?new Date(s.lastSync).toLocaleString():'No queued entries synced yet'));if(s.lastRead)add('p','Using downloaded data from '+new Date(s.lastRead).toLocaleString()+'. Unseen records require connection.');if(s.storageError)add('p',s.storageError);add('p','Approvals, final posting, changes to saved records and period closing require connection. Device entries are excluded from database totals.');
 for(const j of s.jobs){const a=add('article','');add('strong',j.payload.p_items[0].date+' · '+(j.payload.p_snapshot.memo||j.payload.p_items[0].memo),a);add('p',j.status==='synced'?'Synced to database':j.status==='syncing'?'Syncing':j.status==='attention'?'Needs attention — '+j.message:'Saved on this device',a);add('small','Reference: '+j.payload.p_key,a)}
 for(const j of s.legacy){const a=add('article','');add('strong',j.title,a);add('p','Needs confirmation — '+j.message,a);add('small','Reference: '+j.id,a)}
 const b=add('button',s.syncing?'Syncing…':'Sync now');b.type='button';b.disabled=s.syncing||navigator.onLine===false||!s.pending;b.onclick=()=>sync().catch(e=>{storageError=e.message;changed()});const close=add('button','Close');close.type='button';close.onclick=()=>dialog.close();}
function paint(doc=document,phone=false){if(visibleActor!==actor()){visibleActor=actor();dialog?.close();lastRead=null}const s=state(),label=s.syncing?'Syncing':s.attention?'Attention':s.online?'Online':'Offline';const hosts=phone?[doc.querySelector('.top')]:[...doc.querySelectorAll('.area-banner113,.dash-hero112')];for(const host of hosts.filter(Boolean)){let b=host.querySelector('.connection14239');if(!b){b=doc.createElement('button');b.type='button';b.className='connection14239';b.onclick=open;if(phone)host.insertBefore(b,host.querySelector('.profile'));else host.append(b)}const text=label+(s.pending?' · '+s.pending:'');if(b.textContent!==text)b.textContent=text;b.dataset.state=label.toLowerCase();b.setAttribute('aria-label',text+'. Connection and manual sync');}}
function registerShell(){if(!('serviceWorker'in navigator)||navigator.onLine===false)return;navigator.serviceWorker.register('sw14239.js').then(()=>navigator.serviceWorker.ready).then(()=>{shellReady=true;changed()}).catch(e=>{storageError='Offline reopening is unavailable: '+e.message;changed()})}
function ready(){
 // Keep the original journal implementation unchanged; snapshot only complete loads.
 const loadJournal=window.loadJournalFromSupabase;
 if(typeof loadJournal==='function')window.loadJournalFromSupabase=async function(...args){
  let loaded=false;const rows=await snapshot('complete-journal',async()=>{await loadJournal.apply(this,args);loaded=true;return structuredClone(JournalModule.entries)});
  if(!loaded){JournalModule.entries=rows;syncEntrySequence();updateNextEntryIdDisplay();refreshAllTables();}
 };
 paint();let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;paint()})};new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});window.addEventListener('connection14239',()=>{paint();renderDialog();try{const f=document.getElementById('connectedPhone132');if(f?.contentDocument)paint(f.contentDocument,true)}catch{}});window.addEventListener('page113',schedule);registerShell();}
function pendingOwner(id){return queue().some(j=>j.payload.p_owner===id&&j.status!=='synced')||!!window.saveNotices14234?.staffPending?.(id).length}
window.offline14239={offline,state,pendingOwner,enqueue,queue,sync,open,paint,snapshot,canonical,changed};
window.addEventListener('online',()=>{reachable=true;registerShell();changed()});window.addEventListener('offline',()=>{reachable=false;changed()});window.addEventListener('storage',changed);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
