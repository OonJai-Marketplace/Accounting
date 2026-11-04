// Exercise the real workforce save path, with synthetic durable queue receipts.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={console,structuredClone,liveProfile:{id:'owner'},ojmDb:{},tables82:{runs:'payroll_runs'},admin82:()=>true,date71:(y,m,d)=>[y,String(m).padStart(2,'0'),String(d).padStart(2,'0')].join('-'),Work82:{runs:[]}};ctx.window=ctx;
let jobs=[],savedCount=0,syncCount=0,fullSyncCount=0,confirm=true;
ctx.offline14239={offline:()=>false};ctx.idleSync14341={syncNow:async()=>{fullSyncCount++;throw Error('Payroll must not open full sync');}};
ctx.localFirst14333={saveWork:async(kind,data,record,payload)=>{savedCount++;const row={...payload,id:record?.id||'test-run'};syncCount++;jobs.push({row,status:confirm?'synced':'pending',...(confirm?{receipt:structuredClone(row)}:{})});return confirm?row:{...row,_pending14333:true};},sync:async()=>{throw Error('Unexpected unrelated queue drain')},state:()=>({jobs})};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/shared/data/workforce-storage-v82.js','utf8'),ctx);
(async()=>{
 const data={month:'2026-10',status:'finalized',reference:'TEST'};const saved=await ctx.saveWork82('runs',data);assert.equal(saved._pending14333,undefined);assert.equal(saved.data.status,'finalized');assert.equal(syncCount,1);assert.equal(fullSyncCount,0);
 const template=await ctx.saveWork82('runs',{...data,payrollTemplate1429:{lines:[]}},saved);assert.equal(template.version,2);assert.equal(syncCount,2);assert.equal(fullSyncCount,0);
 confirm=false;await assert.rejects(()=>ctx.saveWork82('runs',data,template),/not server-confirmed/);assert.equal(jobs.at(-1).status,'pending');
 const count=savedCount;ctx.offline14239.offline=()=>true;await assert.rejects(()=>ctx.saveWork82('runs',data,template),/requires server confirmation/);assert.equal(savedCount,count);
 ctx.offline14239.offline=()=>false;const previous=ctx.localFirst14333.saveWork;ctx.localFirst14333.saveWork=async(...args)=>{const saved=await previous(...args);ctx.liveProfile.id='other';return saved};await assert.rejects(()=>ctx.saveWork82('runs',data,template),/Account changed/);
 assert.equal(fullSyncCount,0);console.log('PASS real payroll finalization/template save use queue confirmation without global Sync now; unconfirmed, offline and account-change saves cannot finalize.');
})().catch(e=>{console.error(e);process.exitCode=1});
