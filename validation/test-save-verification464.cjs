/* Production save queue and IndexedDB; isolated remote only, no browser or live data. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {IDBFactory}=require('fake-indexeddb');
const setup=fs.readFileSync('validation/performance/save-path283.cjs','utf8').split('const run={')[0];
const fixture=Function('require',setup+'\nreturn fixture;')(require);
async function settled(f,predicate){
 for(let i=0;i<200;i++){if(predicate()&&!f.api.syncing)return;await new Promise(r=>setTimeout(r,5));}
 throw Error('Background save did not settle: '+JSON.stringify(f.jobs()));
}
async function saved(f,kind,data,record){
 const result=await f.save(kind,data,record);
 await settled(f,()=>f.jobs().some(j=>j.row.id===result.id&&j.row.version===result.version&&j.status==='synced'&&j.deviceVerified143464));
 return f.jobs().find(j=>j.row.id===result.id&&j.row.version===result.version).receipt;
}
(async()=>{
 const f=fixture();const notices=[];f.c.addEventListener('local-work14333',()=>notices.push(...f.api.findings().filter(x=>x.kind==='cleanup')));
 const first=await saved(f,'reports',{purpose:'April utilization',status:'draft'});
 assert.equal(f.writes().length,1);assert.equal(f.calls.length,2,'One lookup and one save, no full sync or extra server check');
 assert.equal(f.api.findings().length,0);assert.equal(notices.length,0,'No transient Verify device copy prompt');
 assert.equal(f.jobs()[0].retired14333,undefined,'Confirmed offline copy must remain until snapshots catch up');
 const persisted=await f.api.edit('admin','outbox');assert.equal(persisted[0].deviceVerified143464,true);assert.deepEqual(persisted[0].receipt,first);
 const second=await saved(f,'reports',{purpose:'Edited April',status:'draft'},first);
 assert.equal(second.version,2);assert.equal(f.writes().length,2);assert.equal(f.api.findings().length,0);
 console.log('PASS explicit saves upload in background, verify durable matching receipts, and avoid Verify device copy notifications or full refresh.');
 const offline=fixture();offline.c.navigator.onLine=false;
 const local=await offline.save('documents',{title:'Offline document'});assert(local._pending14333);assert.equal(offline.writes().length,0);assert.equal(offline.api.findings()[0].kind,'record');
 offline.c.navigator.onLine=true;await offline.api.resumeDrafts();assert(offline.jobs()[0].deviceVerified143464);assert.equal(offline.api.findings().length,0);
 console.log('PASS offline save stays pending and reconnect delivery verifies automatically.');
 const lost=fixture();lost.writeHook=q=>{lost.maps.get(q.table).set(q.payload.id,structuredClone(q.payload));return {data:[],error:null}};
 await lost.save('employees',{name:'Lost acknowledgment'});await settled(lost,()=>lost.jobs()[0]?.status==='uncertain');assert.equal(lost.api.findings()[0].kind,'record');
 lost.writeHook=null;await lost.api.resumeDrafts();assert.equal(lost.writes().length,1);assert(lost.jobs()[0].deviceVerified143464);assert.equal(lost.api.findings().length,0);
 console.log('PASS lost acknowledgment keeps original ID and verifies without duplicate writes.');
 const conflict=fixture();conflict.maps.set('company_documents105',new Map([['doc',{id:'doc',version:3,data:{title:'Other device'}}]]));
 await conflict.save('documents',{title:'My edit'},{id:'doc',version:1});await settled(conflict,()=>conflict.jobs()[0]?.status==='conflict');
 assert.equal(conflict.writes().length,0);assert.equal(conflict.api.findings()[0].critical,true);assert(!conflict.jobs()[0].deviceVerified143464);
 console.log('PASS conflicts remain visible and are never overwritten or falsely verified.');
 const shared={indexedDB:new IDBFactory()},old=fixture(shared);
 await old.seed('documents','legacy',{status:'synced',data:{title:'Confirmed before update'}});
 await old.api.edit('admin','outbox',rows=>rows.map(j=>({...j,receipt:structuredClone(j.row),syncedAt:'2026-01-01'})));
 const reopen=fixture(shared);reopen.c.navigator.onLine=false;await reopen.api.initialize();
 assert(reopen.jobs()[0].deviceVerified143464);assert.equal(reopen.calls.length,0);assert.equal(reopen.api.findings().length,0);
 assert.equal(reopen.api.documents([])[0].data.title,'Confirmed before update','Reopening offline retains the latest confirmed overlay');
 await reopen.api.snapshot('documents-index143198',async()=>[],{force:true});assert(!reopen.jobs()[0].retired14333,'Empty/offline snapshot cannot retire confirmed work');
 reopen.c.navigator.onLine=true;await reopen.api.snapshot('documents-index143198',async()=>[reopen.jobs()[0].receipt],{force:true});assert(reopen.jobs()[0].retired14333);
 console.log('PASS prior confirmed copies verify at initialization, survive offline reopening and retire only after matching fresh snapshots.');
 for(const mutate of [r=>r.id='wrong',r=>r.version++,r=>r.data.title='wrong',r=>delete r.data]){
  const shared={indexedDB:new IDBFactory()},a=fixture(shared);await a.seed('documents','invalid',{status:'synced',data:{title:'Expected'}});
  await a.api.edit('admin','outbox',rows=>rows.map(j=>{const receipt=structuredClone(j.row);mutate(receipt);return {...j,receipt};}));
  const b=fixture(shared);await b.api.initialize();assert(!b.jobs()[0].deviceVerified143464);assert.equal(b.api.findings()[0].kind,'cleanup');
 }
 console.log('PASS mismatched record ID, version, content or missing data cannot pass receipt verification.');
 const disk=fixture();let failVerify=true;
 disk.c.deviceVault14334={unpack:x=>x,pack:x=>{if(failVerify&&Array.isArray(x)&&x.some(j=>j.deviceVerified143464))throw Error('Simulated device verification write failure');return x;}};
 await disk.save('employees',{name:'Confirmed on server'});await settled(disk,()=>disk.jobs()[0]?.status==='synced');
 assert.equal(disk.writes().length,1);assert(!disk.jobs()[0].deviceVerified143464);assert(disk.api.findings().some(f=>f.kind==='storage'));
 failVerify=false;await disk.api.verifyCleanup(disk.jobs()[0].id);
 assert(disk.jobs()[0].deviceVerified143464);assert.equal(disk.api.findings().length,0);assert.equal(disk.writes().length,1);
 console.log('PASS local verification failure preserves the confirmed receipt and retries without resubmitting the save.');
 const payroll=fixture();await saved(payroll,'runs',{month:'2026-04',status:'finalized',rows:[{amount:100}]});
 assert(payroll.jobs()[0].deviceVerified143464);assert.equal(payroll.api.findings().length,0);
 console.log('PASS finalized payroll confirms its status and period fields as well as data.');
 const actor=fixture();actor.c.navigator.onLine=false;await actor.save('documents',{title:'Private'});actor.c.navigator.onLine=true;
 actor.readHook=()=>{actor.c.liveProfile.id='other';return {data:null,error:null}};
 await assert.rejects(actor.api.resumeDrafts(),/Account changed/);assert.equal(actor.writes().length,0);
 console.log('PASS account changes stop delivery before any write.');
})().catch(e=>{console.error(e);process.exitCode=1});
