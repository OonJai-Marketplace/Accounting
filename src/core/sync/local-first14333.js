/* Durable device work. Server permissions, version checks and posting receipts remain authoritative. */
(()=>{'use strict';
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
function assertActor(id){if(actor()!==id)throw Error('Account changed while completing device work. Reopen the workspace.')}
const scope=()=>String(window.OJM_SUPABASE_URL||location.origin);
const key=(id,name)=>scope()+((name.startsWith('snapshot:')||name==='journal-outbox14385')?(window.accountingReset143108?.suffix()||''):'')+':'+id+':'+name;
const canonical=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
let database,owner='',jobs=[],error='',errorKind='',notice='',running=false,refreshTimer,readyJob,workWindow='',syncChain=null;
const tableNames={employees:'payroll_employees',leaves:'payroll_leave_records',runs:'payroll_runs',reports:'operational_reports',documents:'company_documents105'};
function db(){return database??=new Promise((resolve,reject)=>{let done=false;const r=indexedDB.open('ojm-local14333',1),fail=e=>{if(done)return;done=true;clearTimeout(timer);reject(e)},timer=setTimeout(()=>fail(Error('Device storage could not open within 8 seconds.')),8000);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('state'))r.result.createObjectStore('state')};r.onsuccess=()=>{if(done){r.result.close();return}done=true;clearTimeout(timer);r.result.onversionchange=()=>{r.result.close();database=null};resolve(r.result)};r.onerror=r.onblocked=()=>fail(r.error||Error('Device storage blocked.'))}).catch(e=>{database=null;throw e})}
async function edit(id,name,update){
 const storageKey=key(id,name),d=await db();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction('state',update?'readwrite':'readonly'),store=tx.objectStore('state'),request=store.get(storageKey);
  const notify=update&&(name==='outbox'||name==='journal-outbox14385');
  let value,didChange=false;
  const timer=setTimeout(()=>{try{tx.abort()}catch{}reject(Error('Device storage did not finish. Your editor is retained.'))},10000);
  request.onsuccess=()=>{
   try{
    const label='ojm-local14333:'+storageKey;
    value=window.deviceVault14334?deviceVault14334.unpack(request.result,label):request.result;
    if(name==='outbox'&&Array.isArray(value))value=value.filter(j=>window.accountingReset143108?.keepJob(j)!==false);
    if(!update)return;
    const before=notify?JSON.stringify(value):null;
    value=update(value);
    didChange=notify&&JSON.stringify(value)!==before;
    store.put(window.deviceVault14334?deviceVault14334.pack(value,label):value,storageKey);
   }catch(e){tx.abort();reject(e)}
  };
  tx.oncomplete=()=>{
   clearTimeout(timer);
   if(didChange&&actor()===id){
    // Other tabs reread committed device work. Never put journal data in the signal.
    try{localStorage.setItem(storageKey+':changed',crypto.randomUUID())}catch{}
   }
   resolve(value);
  };
  tx.onabort=tx.onerror=()=>{clearTimeout(timer);reject(tx.error||Error('Device storage could not save.'))};
 });
}
const mainPrefix=id=>'ojm-main14333:'+scope()+(window.accountingReset143108?.suffix()||'')+':'+id+':';
function mainSave(job,id=actor()){const k=mainPrefix(id)+job.id,prior=JSON.parse(localStorage.getItem(k)||'null');if(prior?.done14333)return prior;if(prior?.payload&&canonical(prior.payload)!==canonical(job.payload))throw Error('This posting reference already belongs to different data.');const saved={...job,...(prior?.receipt&&!job.receipt?{receipt:prior.receipt}: {})};localStorage.setItem(k,JSON.stringify(saved));return saved}
function mainFinish(id,ref){const k=mainPrefix(id)+ref,prior=JSON.parse(localStorage.getItem(k)||'null');if(prior)localStorage.setItem(k,JSON.stringify({...prior,done14333:true}));}
function mainLoad(id=actor()){const legacy='ojm_pending_posts99_'+id;const old=window.accountingReset143108?.enabled()?[]:JSON.parse(localStorage.getItem(legacy)||'[]');for(const j of old)mainSave(j,id);if(old.length)localStorage.removeItem(legacy);const list=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k.startsWith(mainPrefix(id)))continue;const row=JSON.parse(localStorage.getItem(k));if(!row.done14333)list.push(row)}return list}
function changed(){window.dispatchEvent(new Event('local-work14333'));window.offline14239?.changed();window.refreshNotices1443?.()}
async function initialize(){const id=actor();if(!id)return;if(owner===id&&readyJob)return readyJob;if(owner!==id){error='';errorKind='';}owner=id;jobs=[];readyJob=edit(id,'outbox').then(rows=>{if(rows&&!Array.isArray(rows))throw Error('The device save queue is unreadable. Keep the browser data for recovery.');if(actor()===id){jobs=rows||[];changed()}}).catch(e=>{if(actor()===id){readyJob=null;error=e.message;errorKind='read';changed();}throw e});return readyJob}
async function updateJob(id,op,patch){const list=await edit(id,'outbox',rows=>(rows||[]).map(j=>j.id===op?{...j,...patch}:j));if(actor()===id){jobs=list;changed()}return list}
const unresolved=()=>jobs.filter(j=>!['synced','resolved'].includes(j.status));
function latestRows(kind,rows){const map=new Map((rows||[]).map(r=>[r.id,r]));for(const j of jobs.filter(j=>j.kind===kind&&j.status!=='resolved'&&!j.retired14333)){const existing=map.get(j.row.id);if(j.status==='synced'){if(!existing||Number(existing.version)<j.row.version||existing._pending14333&&Number(existing.version)===j.row.version)map.set(j.row.id,j.receipt||j.row)}else map.set(j.row.id,{...j.row,_pending14333:true})}return [...map.values()]}
function applyWork(){if(typeof Work82==='undefined'||Work82.owner!==actor())return;for(const kind of Object.keys(tableNames))Work82[kind]=latestRows(kind,Work82[kind]);if(Work82.runRecord){const row=Work82.runs.find(r=>r.id===Work82.runRecord.id);if(row&&row.version===Work82.runRecord.version)Work82.runRecord=row}}
function backgroundRecord(kind,data){
 if(kind==='runs')return data.status==='draft';
 if(kind==='leaves')return !['approved','cancelled','rejected'].includes(data.status);
 if(kind==='reports')return !data.sharedSnapshot14313&&!['finalized','approved','submitted'].includes(data.status);
 return kind==='employees'||kind==='documents';
}
async function saveWork(kind,data,record,payload,{createId}={}){const id=actor(),client=ojmDb;const current=()=>{assertActor(id);if(ojmDb!==client)throw Error('Connection changed while saving. Reopen the workspace.')};await initialize();current();if(!id||liveProfile.role!=='admin'||window.workspaceRequest138?.target)throw Error('Return to your own administrator workspace before saving.');const rowId=record?.id||createId||crypto.randomUUID(),at=new Date().toISOString();
 let job={id:crypto.randomUUID(),actor:id,kind,table:tableNames[kind],row:{...(record||{}),...structuredClone(payload),id:rowId,created_at:record?.created_at||at,updated_at:at,updated_by:id},baseVersion:record?Number(record.version):null,status:'pending',created:at};
 if(!job.table||!Number.isInteger(job.row.version)||job.row.version<1)throw Error('The record version is invalid. Reload before saving.');
 let saved;
 try{const list=await edit(id,'outbox',rows=>{rows||=[];
  // A retry of unconfirmed identical intent must keep its original UUID/version.
  const retry=[...rows].reverse().find(j=>j.kind===kind&&!['synced','resolved'].includes(j.status)&&j.baseVersion===job.baseVersion&&(record||createId?j.row.id===rowId:kind==='runs'&&payload.status==='finalized')&&Object.keys(payload).every(k=>canonical(j.row[k])===canonical(payload[k])));
  if(retry){job=retry;return rows;}
  if(!record&&kind==='runs'&&payload.status==='finalized'&&rows.some(j=>j.kind==='runs'&&j.baseVersion===null&&j.row.data?.month===data.month&&!['synced','resolved'].includes(j.status)))throw Error('This payroll has an earlier unconfirmed save. Confirm or resolve it in Data Checking before saving changed figures. Your editor is retained.');
  const previous=[...rows].reverse().find(j=>j.row.id===rowId&&!['synced','resolved'].includes(j.status));if(previous&&previous.row.version!==job.baseVersion)throw Error('Another tab changed this device record. Reload before saving.');return [...rows,job]});current();jobs=list;saved={...structuredClone(job.row),_pending14333:true};Work82[kind]=[saved,...(Work82[kind]||[]).filter(r=>r.id!==job.row.id)];error='';errorKind='';changed();schedule();
 }catch(e){if(actor()===id){error=e.message;errorKind='write';changed()}throw e}
 // Explicit saves attempt their own upload now; offline recovery keeps the existing contract.
 if(navigator.onLine!==false&&!window.offline14239?.offline()){const upload=sync({targetId:job.id,draftsOnly:backgroundRecord(kind,data)});if(backgroundRecord(kind,data)){void upload.catch(()=>{});return saved;}await upload;current();const confirmed=jobs.find(j=>j.id===job.id);if(confirmed?.status==='synced'&&confirmed.receipt)return confirmed.receipt;}
 return saved;
}
function transient(e){return !e.code||/^(NETWORK|TIMEOUT|OFFLINE|DATABASE_REQUIRED)/.test(e.code)||/fetch|network|timeout|connection/i.test(e.message||'')||Number(e.status)>=500}
function depends283(earlier,later){return earlier.row.id===later.row.id||later.kind==='reports'&&later.row.data.requestId14316===earlier.row.id||later.kind==='runs'&&['employees','leaves'].includes(earlier.kind)}
function selected283(rows,targetId){if(!targetId)return new Set(rows.map(j=>j.id));const selected=new Set([targetId]);for(let i=rows.length-1;i>=0;i--){if(!selected.has(rows[i].id))continue;for(let k=0;k<i;k++)if(!['synced','resolved'].includes(rows[k].status)&&depends283(rows[k],rows[i]))selected.add(rows[k].id)}return selected}
function sync(options={}){const id=actor(),client=ojmDb;if(options.automatic&&syncChain)return syncChain;const next=(syncChain||Promise.resolve()).catch(()=>{}).then(()=>{assertActor(id);if(ojmDb!==client)throw Error('Connection changed before synchronization.');return syncOnce283(options)});syncChain=next;next.finally(()=>{if(syncChain===next)syncChain=null}).catch(()=>{});return next}
async function syncOnce283({automatic=false,targetId=null,draftsOnly=false}={}){const id=actor(),client=ojmDb,current=()=>{assertActor(id);if(ojmDb!==client)throw Error('Connection changed during synchronization.')};await initialize();current();if(!id||navigator.onLine===false||window.workspaceRequest138?.target)return;if(automatic&&!jobs.some(j=>['pending','uncertain'].includes(j.status)))return;const execute=async()=>{current();running=true;changed();try{const rows=await edit(id,'outbox');current();jobs=rows||[];
 const selected=selected283(jobs,targetId);
 for(const j of jobs.filter(j=>selected.has(j.id)&&(!draftsOnly||backgroundRecord(j.kind,j.row.data))&&['pending','uncertain'].includes(j.status))){if(actor()!==id||ojmDb!==client||window.workspaceRequest138?.target||navigator.onLine===false||automatic&&window.idleSync14341&&!idleSync14341.allowed())break;
 // Saved queue order is authoritative: timestamps can tie or move backwards.
 // A failed parent or earlier employee/leave must be reviewed before dependent payroll.
 const position=jobs.findIndex(p=>p.id===j.id);
 if(jobs.slice(0,position).some(p=>!['synced','resolved'].includes(p.status)&&depends283(p,j)))continue;
 try{
 if(j.kind==='reports'&&j.row.data.kind==='finance'&&j.row.data.mode==='utilization'){
  const result=await client.rpc('budget_capabilities14316');current();
  if(result.error)throw result.error;
  if(result.data?.version!==14316)throw Object.assign(Error('The budget allocation database setup requires review.'),{code:'BUDGET_SETUP'});
 }
 const read=client.from(j.table).select('*').eq('id',j.row.id);
 const lookup=await (read.setHeader?read.setHeader('x-ojm-database-only','1'):read).maybeSingle();current();if(lookup.error)throw lookup.error;const remote=lookup.data;
 const same=r=>r&&Number(r.version)===Number(j.row.version)&&canonical(r.data)===canonical(j.row.data)&&(j.kind!=='runs'||['period_start','period_end','status'].every(k=>r[k]===j.row[k]));
 let saved=remote;
 if(!same(remote)){
  if(j.baseVersion===null&&remote||j.baseVersion!==null&&(!remote||Number(remote.version)!==j.baseVersion))throw Object.assign(Error('This record changed in another session. Both versions are retained; review before retrying.'),{code:'LOCAL_CONFLICT'});
  const payload={data:j.row.data,version:j.row.version};if(j.kind==='runs')Object.assign(payload,{period_start:j.row.period_start,period_end:j.row.period_end,status:j.row.status});
  const req=j.baseVersion===null?client.from(j.table).insert({...payload,id:j.row.id}):client.from(j.table).update(payload).eq('id',j.row.id).eq('version',j.baseVersion);
  const response=await req.select('*');current();if(response.error)throw response.error;saved=response.data?.[0];if(!same(saved))throw Object.assign(Error('The save receipt was not confirmed. The original reference is retained.'),{code:'NETWORK_RECEIPT'});
 }
 await updateJob(id,j.id,{status:'synced',receipt:saved,syncedAt:new Date().toISOString()});if(actor()!==id)break;
 window.dispatchEvent(Object.assign(new Event('record-confirmed421'),{detail:{actor:id,kind:j.kind,id:saved.id,version:saved.version}}));
 const currentRecord=Work82[j.kind]?.find(r=>r.id===saved.id);if(currentRecord&&currentRecord.version===saved.version){Work82[j.kind]=Work82[j.kind].map(r=>r.id===saved.id?saved:r);for(const name of ['runRecord','reportRecord','employee'])if(Work82[name]?.id===saved.id&&Work82[name].version===saved.version)Work82[name]=saved;}
 }catch(e){current();await updateJob(id,j.id,{status:e.code==='LOCAL_CONFLICT'?'conflict':transient(e)?'uncertain':'blocked',message:e.message||'Save was interrupted.'});if(draftsOnly&&transient(e))window.startup14257?.retryDelivery?.();}
 }
 }finally{running=false;changed()}};
 if(navigator.locks)await navigator.locks.request('ojm-local-sync:'+key(id,''),automatic?{ifAvailable:true}:{},lock=>lock?execute():undefined);else await execute();
}
function schedule(){window.idleSync14341?.request?.();}
async function confirmJournalReceipts(){if(window.offline14239?.offline()||!actor())return;const id=actor();for(const j of window.pendingPosts99?.values()||[]){if(!j.payload||j.receipt)continue;const r=await ojmDb.rpc('journal_receipt14228',{p_request_key:j.id});if(r.error)continue;if(actor()!==id)return;const {p_request_key,...single}=j.payload,expected=j.payload.p_entries||[single];if(r.data&&canonical(r.data.payload)===canonical(expected)&&Array.isArray(r.data.result)&&r.data.result.length===expected.length){j.receipt=r.data.result;mainSave(j,id)}}projectJournal();}
function projectJournal(){if(typeof JournalModule==='undefined'||!actor())return;const base=JournalModule.entries.filter(r=>!r.local14333),ids=new Set(base.map(r=>r.dbEntryId));for(const j of window.pendingPosts99?.values()||[]){if(!j.payload||!['saving','uncertain','failed','saved'].includes(j.status))continue;const entries=j.payload.p_entries||[j.payload];entries.forEach((p,index)=>{const receipt=j.receipt?.[index];if(receipt?.entry_id&&(ids.has(receipt.entry_id)||j.voidedEntryIds?.includes(receipt.entry_id)))return;for(const line of p.p_lines){const a=AccountingStore.accounts.find(a=>a.id===line.account_id);base.push({local14333:true,pendingSync:!receipt?.entry_id,requestKey:j.id,id:receipt?.entry_no||'Device-'+j.id+(entries.length>1?'-'+(index+1):''),dbEntryId:receipt?.entry_id||null,date:p.p_transaction_date,created_at:j.created||'',source:'device-pending',account:a?.name||'Unknown Account',accountId:line.account_id,accountCode:a?.code,currency:line.currency_code,memo:line.description||p.p_memo,generalMemo:p.p_memo,debit:Number(line.debit||0),credit:Number(line.credit||0),fx_rate_lak:line.fx_rate_lak,book_rate_lak:line.book_rate_lak,archived:false})}})}if(base.length!==JournalModule.entries.length||base.some((row,index)=>row!==JournalModule.entries[index]))JournalModule.entries=base;window.journalDurable14385?.project();
}
function staffFunds(id,rows){if(!rows)return rows;const known=(typeof reviewStaffJournals==='undefined'?[]:reviewStaffJournals).filter(j=>j.owner_id===id).flatMap(j=>j.lines||[]);const queued=(window.offline14239?.queue?.()||[]).filter(j=>j.payload.p_owner===id&&j.status!=='synced'&&!known.some(l=>String(l.editor_group1437||'').startsWith(j.payload.p_key+':')));return rows.map(f=>({...f,closing:Number(f.closing||0)+queued.flatMap(j=>j.payload.p_items||[]).filter(l=>String(l.fund)===String(f.account_id||f.id)).reduce((n,l)=>n+(l.direction==='in'?1:-1)*Number(l.amount||0),0),pendingSync14333:queued.length>0}))}
function findings(){const list=unresolved().map(j=>({id:j.id,kind:'record',periods:[j.row.data?.month||j.row.data?.from?.slice(0,7)||j.row.period_start?.slice(0,7)].filter(Boolean),critical:['conflict','blocked','uncertain'].includes(j.status),title:(j.kind==='runs'?'Payroll':j.kind==='employees'?'Employee':j.kind==='leaves'?'Leave':j.kind==='documents'?'Document':'Report')+' · '+(j.row.data?.reference||j.row.data?.name||j.row.data?.month||j.row.id),detail:j.message||'Saved on this device. Database confirmation is pending.',status:j.status,job:j}));for(const j of jobs.filter(j=>j.status==='synced'&&!j.retired14333))list.push({id:j.id,kind:'cleanup',periods:[],critical:false,title:({reports:'Report',documents:'Document',runs:'Payroll',employees:'Employee',leaves:'Leave'}[j.kind]||'Record')+' · '+(j.row.data?.reference||j.row.data?.purpose||j.row.data?.title||j.row.data?.name||j.row.id),status:'Saved · device check pending',detail:'The server confirmed this save. Verify the device copy to finish cleanup.',job:j});if(notice)list.push({id:'year-loading14333',kind:'setup',periods:[],critical:false,title:'Loading preparation',detail:notice});if(error)list.push({id:'local-storage14333',kind:'storage',periods:[],critical:true,title:'Saved work on this device needs attention',detail:error+(errorKind==='write'?' The editor was retained. Retry Save after checking device storage.':' Use Check device storage in Connection & sync to recheck the saved queue.'),status:'attention'});return list}
async function retireConfirmed(id,name,started,value){
 if(!started)return;
 const documents=name==='documents'||name==='documents-index143198';
 if(!documents&&!name.startsWith('payroll:'))return;
 const versions=new Map();
 for(const kind of documents?['documents']:['employees','leaves','runs','reports']){
  const records=documents?value:value?.[kind];
  if(Array.isArray(records))versions.set(kind,new Map(records.map(row=>[row.id,Number(row.version)])));
 }
 const rows=await edit(id,'outbox',items=>(items||[]).map(j=>
  !j.retired14333&&j.status==='synced'&&j.syncedAt<=started&&versions.get(j.kind)?.get(j.row.id)>=j.row.version
   ?{...j,retired14333:true}:j));
 if(actor()===id)jobs=rows;
}
async function verifyCleanup(jobId){
 const who=actor(),client=ojmDb;
 await initialize();assertActor(who);
 const job=jobs.find(j=>j.id===jobId&&j.status==='synced'&&!j.retired14333);
 if(!job)return;
 if(window.offline14239?.offline())throw Error('Reconnect to verify the device copy.');
 const refresh=()=>job.kind==='documents'?loadDocuments(true):window.loadWork82(true);
 if(window.offline14239?.freshReads)await window.offline14239.freshReads(refresh);else await refresh();
 assertActor(who);if(client!==ojmDb)throw Error('Connection changed. Reopen Data Check.');
 changed();
 if(jobs.some(j=>j.id===jobId&&!j.retired14333))throw Error('The refreshed records did not confirm this version. Your saved copy is still on this device.');
}
async function snapshot(name,loader,{force=false}={}){const id=actor();await initialize();assertActor(id);if(!id)return loader();const cached=await edit(id,'snapshot:'+name);assertActor(id);if(cached&&name.startsWith('payroll:'))window.payrollWindow14334?.restore?.(cached.value);if(cached&&!force){await retireConfirmed(id,name,cached.started,cached.value);assertActor(id);return structuredClone(cached.value)}try{const started=new Date().toISOString(),cacheRevision=window.offline14239?.cacheRevision,value=await loader();const verifiedStarted=(!window.offline14239?.offline()&&cacheRevision===window.offline14239?.cacheRevision)?started:null;if(actor()!==id)throw Error('Account changed while loading.');await edit(id,'snapshot:'+name,()=>({value,started:verifiedStarted,at:new Date().toISOString()}));await retireConfirmed(id,name,verifiedStarted,value);assertActor(id);return value}catch(e){assertActor(id);if(cached&&(window.offline14239?.offline()||/fetch|network|timeout|connection|temporarily unavailable/i.test(e.message||'')))return structuredClone(cached.value);throw e}}
// Compare compact IDs and versions, including deletions. Fetch bodies only for changed records.
async function refreshWork(){
 const id=actor(),client=ojmDb,period=window.yearWindow14333?.state();
 if(!id||liveProfile.role!=='admin'||Work82.owner!==id||!period)return;
 const name='payroll:'+period.from+':'+period.to;
 const check=()=>{assertActor(id);if(client!==ojmDb||window.workspaceRequest138?.target||yearWindow14333.state().from!==period.from||yearWindow14333.state().to!==period.to)throw Error('Workspace or selected year changed.');};
 const prior=await edit(id,'snapshot:'+name);check();if(!prior?.value)return;
 const value={...prior.value},started=new Date().toISOString();let modified=false;
 for(const kind of ['employees','leaves','reports']){
  const table=tableNames[kind],known=new Map((value[kind]||[]).map(row=>[row.id,row])),index=[];
  for(let offset=0;;offset+=500){
   const r=await client.from(table).select('id,version').order('id').range(offset,offset+499).setHeader('x-ojm-database-only','1');
   check();if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Incomplete record index.');
   index.push(...r.data);if(r.data.length<500)break;
  }
  const missing=index.filter(row=>known.get(row.id)?.version!==row.version).map(row=>row.id);
  if(!missing.length&&known.size===index.length)continue;
  for(let i=0;i<missing.length;i+=40){
   const ids=missing.slice(i,i+40),r=await client.from(table).select('*').in('id',ids).setHeader('x-ojm-database-only','1');
   check();if(r.error)throw r.error;for(const row of r.data||[])known.set(row.id,row);
  }
  if(index.some(row=>!known.get(row.id)?.data||known.get(row.id).version!==row.version))throw Error('Records changed during download. The previous copy is retained.');
  value[kind]=index.map(row=>known.get(row.id)).sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
  modified=true;
 }
 // Payroll revisions also cover historical leave carry and the payroll index.
 const runs=await window.payrollWindow14334.read(period.from,period.to);check();
 if(runs&&window.payrollWindow14334.checkpoint()?.revision!==value.payrollRevision14351?.revision){
  Object.assign(value,{runs,payrollRevision14351:window.payrollWindow14334.checkpoint(),leaveCarry14334:structuredClone(Work82.leaveCarry14334),payrollIndex14334:structuredClone(Work82.payrollIndex14334)});modified=true;
 }
 if(!modified)return;
 const committed=await edit(id,'snapshot:'+name,current=>{check();return current?.at===prior.at?{value,started,at:started}:current});
 check();if(committed?.at!==started)return;
 await retireConfirmed(id,name,started,value);check();
 for(const kind of ['employees','leaves','reports','runs'])Work82[kind]=latestRows(kind,value[kind]);
 window.workspaceViews14364?.invalidate('payroll',false);
}
async function loadDocuments(force=false){const who=actor(),client=ojmDb;const rows=await snapshot('documents-index143198',async()=>{const all=[];for(let offset=0;;offset+=200){const r=await client.from('company_documents105').select('id,version,updated_at,created_at,title:data->>title,kind:data->>documentKind14297,employee:data->>employeeId').order('updated_at',{ascending:false}).order('id').range(offset,offset+199);if(r.error)throw r.error;if(actor()!==who||ojmDb!==client)throw Error('Account changed while loading documents.');all.push(...(r.data||[]).map(x=>({...x,summary143198:true,data:{title:x.title,documentKind14297:x.kind,employeeId:x.employee}})));if((r.data||[]).length<200)return all;}},{force});return {data:latestRows('documents',rows),error:null};}
async function loadDocument(row){if(!row?.summary143198)return row;const who=actor(),client=ojmDb;const full=await snapshot('document143198:'+row.id+':'+row.version,async()=>{const r=await client.from('company_documents105').select('*').eq('id',row.id).single();if(r.error)throw r.error;if(!r.data?.data)throw Error('Saved document is no longer available. Refresh the document list.');return r.data;});if(actor()!==who||ojmDb!==client)throw Error('Account changed while opening document.');return full;}

async function invalidateConfirmed(){workWindow='';const id=actor(),d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('state','readwrite'),r=tx.objectStore('state').openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith(key(id,'snapshot:')))c.delete();c.continue()};tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('Cached records need a reload.'))});const remaining=await edit(id,'outbox',items=>(items||[]).filter(j=>!['synced','resolved'].includes(j.status)));assertActor(id);jobs=remaining;window.yearWindow14333?.reset();window.payrollWindow14334?.reset();changed();}

async function pruneYears14341(from,to){const id=actor();if(!id)return;const current=new Date().getFullYear(),prefix=key(id,'snapshot:payroll:');const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('state','readwrite'),r=tx.objectStore('state').openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(String(c.key).startsWith(prefix)){const period=String(c.key).slice(prefix.length);if(period!==from+':'+to&&period!==current+'-01-01:'+current+'-12-31')c.delete()}c.continue()};tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('Temporary payroll cache could not be released.'))});}
async function retry(id){const who=actor(),client=ojmDb;await initialize();assertActor(who);if(ojmDb!==client)throw Error('Connection changed. Reopen Synchronization.');const j=jobs.find(j=>j.id===id);if(!j)throw Error('Saved entry not found.');if(['synced','resolved'].includes(j.status))return;if(!['pending','uncertain'].includes(j.status))await updateJob(who,id,{status:'pending',message:''});assertActor(who);if(ojmDb!==client)throw Error('Connection changed. Reopen Synchronization.');return sync({targetId:id})}
async function assess(id){const j=jobs.find(j=>j.id===id);if(!j)return;const r=await ojmDb.from(j.table).select('*').eq('id',j.row.id).maybeSingle();if(r.error)throw r.error;return {device:j,server:r.data}}
async function checkStorage(){const id=actor();if(!id)return;try{const rows=await edit(id,'outbox');if(rows&&!Array.isArray(rows))throw Error('The device save queue is unreadable. Keep browser data for recovery.');mainLoad(id);const probe=mainPrefix(id)+'check14335',value=crypto.randomUUID();localStorage.setItem(probe,value);if(localStorage.getItem(probe)!==value)throw Error('Device write verification did not match.');localStorage.removeItem(probe);if(actor()!==id)return;jobs=rows||[];if(errorKind!=='write'){error='';errorKind='';}readyJob=Promise.resolve();owner=id;applyWork();changed();if(error)throw Error(error+' Retry Save in the retained editor.');}catch(e){if(actor()===id){error=e.message;changed();}throw e}}
function ready(){
 const refresh=window.refreshAllTables;window.refreshAllTables=function(...args){projectJournal();return refresh.apply(this,args)};
 const loadWork=window.loadWork82;let workJob,workOwner;window.loadWork82=function(force=false){const id=actor();if(workJob){if(workOwner===id)return workJob;return workJob.then(()=>actor()===id?window.loadWork82(force):undefined)}workOwner=id;const period=window.yearWindow14333?.state(),from=period?.from||new Date().getFullYear()+'-01-01',to=period?.to||new Date().getFullYear()+'-12-31',memoryKey=id+':'+from+':'+to;if(!force&&id&&Work82.owner===id&&Work82.loaded&&!Work82.error&&workWindow===memoryKey)return Promise.resolve();return workJob=(async()=>{await initialize();assertActor(id);Work82.queryFrom14333=from;Work82.queryTo14333=to;const saved=await snapshot('payroll:'+Work82.queryFrom14333+':'+Work82.queryTo14333,async()=>{await loadWork(true);if(Work82.error)throw Error(Work82.error);return {...Object.fromEntries(Object.keys(tableNames).map(k=>[k,structuredClone(Work82[k])])),payrollRevision14351:window.payrollWindow14334?.checkpoint?.(),leaveCarry14334:structuredClone(Work82.leaveCarry14334||[]),payrollIndex14334:structuredClone(Work82.payrollIndex14334||[])}},{force});if(actor()!==id)return;Object.assign(Work82,{leaveCarry14334:[],payrollIndex14334:[]},saved,{owner:id,loaded:true,loading:false,error:''});applyWork();await window.hrCalendar14306?.load();assertActor(id);workWindow=memoryKey;if(!window.startup14257?.background||!window.idleSync14341||idleSync14341.allowed())renderWork82();else window.addEventListener('idle-sync14341',()=>{if(actor()===id)renderWork82()},{once:true})})().catch(e=>{if(actor()===id){Work82.error=e.message;Work82.loading=false;renderWork82();changed()}}).finally(()=>workJob=null)};
 const before=window.openDocumentEditor105;window.openDocumentEditor105=function(options={}){if(options.printPreview&&window.yearWindow14333?.loading){showCenterStatus('Wait for the requested reporting period to finish loading.',true);return;}const count=(window.offline14239?.state().pending||0);if(options.html&&options.printPreview&&count)options={...options,reportNotices270:[...(options.reportNotices270||[]),'Device copy — '+count+' save(s) awaiting database confirmation.']};return before.call(this,options)};
 const profile=window.loadLiveProfile;window.loadLiveProfile=async function(...args){const r=await profile.apply(this,args);await initialize();return r};
 window.addEventListener('storage',event=>{
  const id=actor(),k=event.key;
  if(!id)return;
  if(window.pendingPosts99&&(k===null||k.startsWith(mainPrefix(id))||k==='ojm_pending_posts99_'+id)){
   try{const entries=mainLoad(id);pendingPosts99.clear();entries.forEach(j=>pendingPosts99.set(j.id,j));projectJournal();refreshAllTables()}catch(e){error=e.message;changed()}
  }
  if(k===null||k===key(id,'outbox')+':changed')edit(id,'outbox').then(rows=>{
   if(actor()!==id)return;
   jobs=rows||[];applyWork();changed();
  }).catch(()=>{});
 });
 window.addEventListener('save-state14234',()=>{projectJournal()});
}
window.localFirst14333={refreshWork,resumeDrafts:()=>sync({draftsOnly:true}),queueSignal:name=>key(actor(),name)+':changed',verifyCleanup,async storageBytes(){const id=actor(),normal=key(id,''),reset=key(id,'snapshot:').slice(0,-9);if(!id)throw Error('Sign in to measure saved data');return window.offline14239.measureStore(await db(),'state',k=>k.startsWith(normal)||k.startsWith(reset));},pruneYears:pruneYears14341,checkStorage,storageError(message){error=message;errorKind='write';changed()},mainLoad,mainSave,mainFinish,signature:()=>[error,notice,jobs.map(j=>[j.id,j.status,j.message])],get syncing(){return running},documents:rows=>latestRows('documents',rows),saveDocument:async(data,record)=>({data:[await saveWork('documents',data,record,{data,version:record?record.version+1:1})],error:null}),setNotice(value){notice=value;changed()},initialize,invalidateConfirmed,loadDocuments,loadDocument,saveWork,sync:(options={})=>!options.coordinated&&window.idleSync14341?.run?idleSync14341.run(!!options.automatic):sync(options),snapshot,staffFunds,confirmJournalReceipts,projectJournal,findings,retry,assess,state:()=>({jobs:structuredClone(jobs),error,running}),edit,canonical};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
