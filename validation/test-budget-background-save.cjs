/* Real durable queue with isolated IndexedDB and an atomic remote-save fixture. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const setup=fs.readFileSync('validation/performance/save-path283.cjs','utf8').split('const run={')[0];
const fixture=Function('require',setup+'\nreturn fixture;')(require);
const data=status=>({kind:'finance',mode:'utilization',status,budgetMonth290:'2026-06',lines:[],movements:[],conversions:[]});
function budgetFixture(shared={}){
 const f=fixture(shared);f.c.AbortController=AbortController;f.rpcCalls=[];f.commits=0;f.remote=new Map();f.hold=null;f.lost=false;
 f.c.ojmDb.rpc=async(name,args)=>{
  f.rpcCalls.push({name,args:structuredClone(args)});
  await f.hold;
  const old=f.remote.get(args.p_report),version=(args.p_base_version||0)+1;
  if(old&&old.version===version&&JSON.stringify(old.data)===JSON.stringify(args.p_data))return {data:structuredClone(old)};
  if(old?args.p_base_version===null||old.version!==args.p_base_version:args.p_base_version!==null)return {error:{code:'40001',message:'Version changed'}};
  const row={id:args.p_report,version,data:structuredClone(args.p_data)};
  f.remote.set(row.id,row);f.commits++;
  if(f.lost){f.lost=false;return {error:{code:'NETWORK_TIMEOUT',message:'Lost receipt'}};}
  return {data:structuredClone(row)};
 };
 return f;
}
const tick=()=>new Promise(r=>setTimeout(r,5));
async function until(predicate){for(let i=0;i<300&&!predicate();i++)await tick();assert(predicate(),'Expected save state did not arrive');}
(async()=>{
 for(const status of ['draft','finalized']){
  const f=budgetFixture();let release;f.hold=new Promise(r=>release=r);
  const saved=await f.save('reports',data(status));
  assert(saved._pending14333,'Save returns after durable local storage');
  await until(()=>f.rpcCalls.length===1);
  assert.equal(f.remote.size,0);assert.equal(f.api.budgetSave(saved.id).confirmed,false);
  assert.equal(f.api.budgetNotices().length,1);assert.equal(f.api.budgetNotices()[0].persistent,true);
  assert.match(f.api.budgetNotices()[0].title,status==='finalized'?/Finalizing/:/Saving/);
  release();await until(()=>f.jobs()[0].deviceVerified143464&&!f.api.budgetSave(saved.id).sending);
  assert.equal(f.calls.length,0,'No separate preflight or global refresh requests');
  assert.equal(f.api.budgetSave(saved.id).confirmed,true);
  assert.equal(f.api.budgetNotices()[0].persistent,false);
  assert.equal(f.api.budgetNotices()[0].title.includes(status==='finalized'?'Finalized':'Saved'),true);
  assert(!f.c.Work82.reports[0]._pending14333);
 }
 console.log('PASS slow draft/final delivery releases the UI after durable save and confirms only the exact receipt.');
 const isolated=budgetFixture();await isolated.seed('documents','unrelated');const isolatedSave=await isolated.save('reports',data('draft'));
 await until(()=>isolated.api.budgetSave(isolatedSave.id).confirmed);
 assert.equal(isolated.rpcCalls.length,1);assert.equal(isolated.calls.length,0);assert.equal(isolated.jobs()[0].status,'pending');
 console.log('PASS a report upload leaves unrelated queued work alone.');
 const lost=budgetFixture();lost.lost=true;const uncertain=await lost.save('reports',data('finalized'));
 await until(()=>lost.api.budgetSave(uncertain.id).failed&&!lost.api.budgetSave(uncertain.id).sending);
 const originalNotice=lost.api.budgetNotices()[0];assert(originalNotice.critical&&originalNotice.persistent);
 assert.equal(originalNotice.actionLabel,'Open report / Retry');assert.equal(originalNotice.budgetReportId,uncertain.id);
 await lost.api.retryBudget(uncertain.id);await until(()=>lost.api.budgetSave(uncertain.id).confirmed);
 assert.equal(lost.commits,1);assert.equal(lost.rpcCalls.length,2);
 assert.equal(lost.api.budgetNotices().length,1);assert.equal(lost.api.budgetNotices()[0].noticeId,originalNotice.noticeId);
 assert.deepEqual(lost.rpcCalls[0].args,lost.rpcCalls[1].args);
 console.log('PASS a lost receipt produces one actionable notice; retry keeps identity/content without duplicate writes.');
 const conflict=budgetFixture();conflict.remote.set('report',{id:'report',version:3,data:data('draft')});
 await conflict.save('reports',data('finalized'),{id:'report',version:1});
 await until(()=>conflict.jobs()[0].status==='conflict'&&!conflict.api.budgetSave('report').sending);
 assert.equal(conflict.commits,0);assert(conflict.api.budgetNotices()[0].critical);
 await conflict.api.retryBudget('report');await until(()=>conflict.rpcCalls.length===2&&!conflict.api.budgetSave('report').sending);
 assert.equal(conflict.remote.get('report').version,3);assert.equal(conflict.commits,0);
 console.log('PASS conflicts retain the pending copy and cannot overwrite newer database edits.');
 const offline=budgetFixture();offline.c.navigator.onLine=false;
 const local=await offline.save('reports',data('draft'));assert(local._pending14333);assert.equal(offline.rpcCalls.length,0);
 const reloaded=budgetFixture({indexedDB:offline.c.indexedDB});await reloaded.api.initialize();
 assert.equal(reloaded.api.budgetNotices()[0].budgetReportId,local.id,'Notification survives reload');
 offline.c.navigator.onLine=true;await offline.api.resumeDrafts();assert.equal(offline.rpcCalls.length,0,'No automatic budget retry loop');
 await offline.api.retryBudget(local.id);await until(()=>offline.api.budgetSave(local.id).confirmed);
 console.log('PASS offline drafts and notifications survive reload and require explicit retry.');
 const queued=budgetFixture();let release;queued.hold=new Promise(r=>release=r);
 const first=await queued.save('reports',data('draft'));
 const last=await queued.save('reports',data('finalized'),first);
 await until(()=>queued.rpcCalls.length===1);
 assert.equal(queued.api.budgetNotices().length,1);assert.equal(queued.api.budgetSave(last.id).confirmed,false);
 await assert.rejects(queued.save('reports',data('draft'),last),/awaiting confirmation/);
 release();await until(()=>queued.api.budgetSave(last.id).confirmed);
 assert.deepEqual(queued.rpcCalls.map(r=>r.args.p_base_version),[null,1]);assert.equal(queued.commits,2);
 console.log('PASS pending draft then Finalize serialize with stable identity; a pending final cannot accept later edits.');
 const retryClicks=budgetFixture();retryClicks.c.navigator.onLine=false;const held=await retryClicks.save('reports',data('finalized'));
 retryClicks.c.navigator.onLine=true;let unblock;retryClicks.hold=new Promise(r=>unblock=r);
 await Promise.all([retryClicks.api.retryBudget(held.id),retryClicks.api.retryBudget(held.id)]);
 await until(()=>retryClicks.rpcCalls.length===1);unblock();await until(()=>retryClicks.api.budgetSave(held.id).confirmed);
 assert.equal(retryClicks.rpcCalls.length,1);
 console.log('PASS repeated Retry clicks issue one delivery.');
 const timeout=budgetFixture();let finishLate;timeout.hold=new Promise(r=>finishLate=r);
 timeout.c.setTimeout=(fn,ms,...args)=>setTimeout(fn,ms===30000?20:ms,...args);
 const timed=await timeout.save('reports',data('finalized'));
 await until(()=>timeout.api.budgetSave(timed.id).failed&&!timeout.api.budgetSave(timed.id).sending);
 assert.match(timeout.api.budgetSave(timed.id).detail,/timed out/);finishLate();await until(()=>timeout.commits===1);
 assert.equal(timeout.api.budgetSave(timed.id).confirmed,false,'Late response cannot falsely complete a timed-out attempt');
 await timeout.api.retryBudget(timed.id);await until(()=>timeout.api.budgetSave(timed.id).confirmed);assert.equal(timeout.commits,1);
 console.log('PASS hung requests time out; a later server commit is recovered safely by the same retry.');
 const actor=budgetFixture();let actorRelease;actor.hold=new Promise(r=>actorRelease=r);
 const changing=await actor.save('reports',data('draft'));await until(()=>actor.rpcCalls.length===1);
 actor.c.liveProfile.id='other';actorRelease();await actor.api.initialize();await tick();
 assert.equal(actor.api.budgetNotices().length,0);assert.equal(actor.api.budgetSave(changing.id),null);
 console.log('PASS changing accounts cannot expose the prior account’s saved requests or notifications.');
 const storage=budgetFixture();storage.c.deviceVault14334={unpack:x=>x,pack(){throw Error('Storage full')}};
 await assert.rejects(storage.save('reports',data('draft')),/Storage full|Device storage/);assert.equal(storage.rpcCalls.length,0);
 console.log('PASS failed device persistence retains the editor and prevents remote delivery.');
 for(const duplicate of [false,true]){
  const linked=budgetFixture();let releaseLookup;
  const heldLookup=new Promise(r=>releaseLookup=r);
  const q={select(){return q},eq(){return q},neq(){return q},limit(){return q},setHeader(){return q},abortSignal(){return q},then:(ok,fail)=>heldLookup.then(ok,fail)};
  linked.c.ojmDb.from=()=>q;
  const row=await linked.save('reports',{...data('draft'),requestId14316:'parent',requestVersion14316:1});
  assert(row._pending14333);assert.equal(linked.rpcCalls.length,0,'New-report lookup does not hold the editor');
  releaseLookup({data:duplicate?[{id:'other-report'}]:[]});
  await until(()=>!linked.api.budgetSave(row.id).sending);
  assert.equal(linked.commits,duplicate?0:1);
  if(duplicate)assert.equal(linked.jobs()[0].status,'conflict');
 }
 console.log('PASS duplicate linked-report checking remains in delivery without blocking the editor.');
 const source=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8');
 const before={id:'june',version:9,data:data('finalized')},after={id:'june',version:10,data:data('draft')};
 const q={select(){return q},eq(){return q},single(){return q},setHeader(){return q},then:resolve=>Promise.resolve({data:after}).then(resolve)};
 const c=vm.createContext({context:()=>()=>{},window:{},BudgetReportWording:{select:'*'},ojmDb:{from:()=>q},confirmedFinals:new Map([['june',before]]),Work82:{reports:[before]},isFinal:r=>r.data.status==='finalized',rememberFinal:()=>{}});
 vm.runInContext(source.slice(source.indexOf('async function live('),source.indexOf('async function saveDocument(')),c);
 await c.live('june');assert(!c.confirmedFinals.has('june'));assert.equal(c.Work82.reports[0].data.status,'draft');
 console.log('PASS reopening June/August clears stale finalized state after the current database draft is read.');
})().catch(e=>{console.error(e);process.exitCode=1});
