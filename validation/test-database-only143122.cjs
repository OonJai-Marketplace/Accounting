const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function context(){const listeners={};const c={console,Request,Response,Headers,URL,AbortSignal,AbortController,crypto,structuredClone,atob,btoa,Event,Date,Map,Set,Promise,Number,JSON,setTimeout,clearTimeout,setInterval:()=>0,requestAnimationFrame:()=>0,navigator:{onLine:true},location:{origin:'https://db.example'},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},document:{readyState:'loading',addEventListener(){},getElementById:()=>null},addEventListener:(n,f)=>{listeners[n]=f},dispatchEvent(){},OJM_SUPABASE_URL:'https://db.example',liveProfile:{id:'actor'}};c.window=c;vm.createContext(c);return c;}
(async()=>{
const c=context();let calls=0,fail=false,storage=0;c.fetch=async req=>{calls++;assert.equal(req.cache,'no-store');assert.equal(req.headers.get('x-ojm-database-only'),null);if(fail)throw Error('network down');return Response.json([{id:calls}])};c.indexedDB={open(){storage++;throw Error('Cache must not be used')}};
vm.runInContext(fs.readFileSync(root+'/src/core/sync/offline14239.js','utf8'),c);
const paths=['audit_log','record_deletions108','rpc/preview_journal_number143114','rpc/journal_number_records335','rpc/delete_one_audit1437','rpc/void_journal_entry','rpc/audit_month1434','rpc/offline_journal_state143174','rpc/delete_audit_offline143174','rpc/audit_delete_receipt143174'];
for(const p of paths){const res=await c.offline14239.cachedReads(()=>c.fetch('https://db.example/rest/v1/'+p,{method:p.includes('rpc/')?'POST':'GET',body:p.includes('rpc/')?'{}':undefined}));assert.equal(res.status,200)}
assert.equal(calls,paths.length);assert.equal(storage,0);
fail=true;assert.equal((await c.fetch('https://db.example/rest/v1/audit_log')).status,503);assert.equal(storage,0);c.navigator.onLine=false;const before=calls;assert.equal((await c.fetch('https://db.example/rest/v1/rpc/void_journal_entry',{method:'POST',body:'{}'})).status,503);assert.equal(calls,before);
console.log('PASS database-only reads/writes bypass snapshots, failures never use cache, offline actions rejected');
const d=context();
let saved=[],writes=0,denied=false;
const voidRequests=[];
d.localFirst14333={canonical:JSON.stringify,mainLoad:()=>[],edit:async(actor,key,fn)=>{if(fn){saved=fn(saved);writes++}return saved}};
d.canVoidTransactions=()=>true;
d.offline14239={request:x=>x,offline:()=>!d.navigator.onLine,confirmConnection:async()=>{}};
d.offlineAudit143174={initialize:async()=>{},pending:()=>[],sync:async()=>{}};
d.entryNumber14257={prepareLocalHistory:async()=>{}};
d.access113={can:()=>true};
d.refreshAllTables=()=>{};
d.loadJournalFromSupabase=async()=>{};
d.loadTransactionAudit=async()=>{};
d.JournalModule={entries:[]};
d.ojmDb={rpc:async(name,p)=>{
  voidRequests.push({name,args:structuredClone(p)});
  return denied?{error:{code:'40001',message:'conflict'}}:{data:{entry_id:p.p_entry_id,request_key:p.p_request_key,kind:p.p_kind}};
}};
vm.runInContext(fs.readFileSync(root+'/src/bookkeeping/journal/durable-journal14385.js','utf8'),d);
const lines=[{id:'OJM260005',dbEntryId:'db-five',date:'2026-01-01',memo:'test',accountId:'cash',currency:'LAK',debit:10,credit:0},{id:'OJM260005',dbEntryId:'db-five',date:'2026-01-01',memo:'test',accountId:'equity',currency:'LAK',debit:0,credit:10}];
d.navigator.onLine=false;
const requestKey=await d.journalDurable14385.change(lines,'void',null,'test');
assert.equal(writes,1);
assert.equal(voidRequests.length,0);
assert.equal(saved[0].changes[0].status,'pending');
d.JournalModule.entries=lines;
d.journalDurable14385.project();
assert.equal(d.JournalModule.entries.length,0);

d.navigator.onLine=true;
await d.journalDurable14385.sync({reconnected:true});
assert.equal(voidRequests.length,0,'Reconnecting leaves an offline void for explicit sync');
assert.equal(saved[0].changes[0].status,'pending');
denied=true;
await d.journalDurable14385.sync({explicit:true});
assert.equal(saved[0].status,'conflict');
assert.equal(saved[0].changes[0].status,'pending');
assert.equal(voidRequests.length,1);
assert.equal(voidRequests[0].name,'change_journal14385');
assert.equal(voidRequests[0].args.p_request_key,requestKey);
assert.equal(voidRequests[0].args.p_entry_id,'db-five');
denied=false;
await d.journalDurable14385.sync({explicit:true});
assert.equal(voidRequests.length,2);
assert.deepEqual(voidRequests[1],voidRequests[0],'Retry uses the original request and entry');
assert.equal(saved.length,1);
assert.equal(saved[0].changes.length,1);
assert.equal(saved[0].changes[0].status,'saved');
assert.equal(saved[0].status,'saved');
console.log('PASS offline void waits for explicit sync, retains a conflict, and retries the original change');

})().catch(e=>{console.error(e);process.exitCode=1});
