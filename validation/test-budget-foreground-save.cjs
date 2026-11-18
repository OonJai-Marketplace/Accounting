/* Real durable queue with isolated IndexedDB and an atomic remote-save fixture. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const setup=fs.readFileSync('validation/performance/save-path283.cjs','utf8').split('const run={')[0];
const fixture=Function('require',setup+'\nreturn fixture;')(require);
const data=status=>({kind:'finance',mode:'utilization',status,budgetMonth290:'2026-06',lines:[],movements:[],conversions:[]});
function budgetFixture(){
 const f=fixture();f.rpcCalls=[];f.commits=0;f.remote=new Map();f.hold=null;f.lost=false;
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
(async()=>{
 for(const status of ['draft','finalized']){
  const f=budgetFixture();let release,finished=false;f.hold=new Promise(r=>release=r);
  const work=f.save('reports',data(status)).then(r=>{finished=true;return r;});
  for(let i=0;i<100&&!f.rpcCalls.length;i++)await tick();
  assert.equal(f.rpcCalls.length,1);assert.equal(finished,false,'Budget save must await its own server receipt');
  release();const saved=await work;
  assert(!saved._pending14333);assert.equal(f.calls.length,0,'No separate capability, record, parent or global refresh requests');
  assert.equal(f.rpcCalls[0].name,'save_budget_utilization');assert(f.jobs()[0].deviceVerified143464);
  assert.equal(f.api.syncing,false,'Nothing continues sending after the save returns');
 }
 console.log('PASS draft and final saves wait for one atomic request and verified durable receipt.');
 const isolated=budgetFixture();await isolated.seed('documents','unrelated');await isolated.save('reports',data('draft'));
 assert.equal(isolated.rpcCalls.length,1);assert.equal(isolated.calls.length,0);assert.equal(isolated.jobs()[0].status,'pending');
 console.log('PASS saving a report leaves unrelated queued work alone.');
 const lost=budgetFixture();lost.lost=true;const uncertain=await lost.save('reports',data('finalized'));
 assert(uncertain._pending14333);assert.equal(lost.jobs()[0].status,'uncertain');
 await lost.api.retry(lost.jobs()[0].id);
 assert.equal(lost.commits,1);assert.equal(lost.rpcCalls.length,2);assert(lost.jobs()[0].deviceVerified143464);
 assert.equal(lost.rpcCalls[0].args.p_report,lost.rpcCalls[1].args.p_report);
 console.log('PASS lost acknowledgments retry the same ID, version and data without another write.');
 const conflict=budgetFixture();conflict.remote.set('report',{id:'report',version:3,data:data('draft')});
 await conflict.save('reports',data('finalized'),{id:'report',version:1});
 assert.equal(conflict.jobs()[0].status,'conflict');assert.equal(conflict.commits,0);
 console.log('PASS concurrent edits remain conflicts without overwriting the newer record.');
 const offline=budgetFixture();offline.c.navigator.onLine=false;
 const local=await offline.save('reports',data('draft'));assert(local._pending14333);assert.equal(offline.rpcCalls.length,0);
 offline.c.navigator.onLine=true;await offline.api.resumeDrafts();assert.equal(offline.rpcCalls.length,0,'No automatic delivery of budget saves');
 await offline.api.retry(offline.jobs()[0].id);assert.equal(offline.rpcCalls.length,1);assert(offline.jobs()[0].deviceVerified143464);
 console.log('PASS offline drafts persist locally and send on an explicit retry.');
 const actor=budgetFixture();let release;actor.hold=new Promise(r=>release=r);
 const changing=actor.save('reports',data('draft'));for(let i=0;i<100&&!actor.rpcCalls.length;i++)await tick();
 actor.c.liveProfile.id='other';release();await assert.rejects(changing,/Account changed/);
 console.log('PASS actor changes cannot expose another account’s confirmed receipt.');
 const source=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8');
 const before={id:'june',version:9,data:data('finalized')},after={id:'june',version:10,data:data('draft')};
 const q={select(){return q},eq(){return q},single(){return q},setHeader(){return q},then:resolve=>Promise.resolve({data:after}).then(resolve)};
 const c=vm.createContext({context:()=>()=>{},window:{},BudgetReportWording:{select:'*'},ojmDb:{from:()=>q},confirmedFinals:new Map([['june',before]]),Work82:{reports:[before]},isFinal:r=>r.data.status==='finalized',rememberFinal:()=>{}});
 vm.runInContext(source.slice(source.indexOf('async function live('),source.indexOf('async function saveDocument(')),c);
 await c.live('june');assert(!c.confirmedFinals.has('june'));assert.equal(c.Work82.reports[0].data.status,'draft');
 console.log('PASS reopening June/August clears stale finalized state after the current database draft is read.');
})().catch(e=>{console.error(e);process.exitCode=1});
