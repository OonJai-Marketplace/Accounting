const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function untilReleased() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

async function testPayroll() {
  const source = fs.readFileSync('src/payroll/workspace/groups-v96/drafts-and-finalization.js','utf8');
  const run = {month:'2026-11', status:'draft', rows:[{employeeId:'e',employee:{currency:'LAK'},input:{}}]};
  const panel = {inert:false}, disabledPanel = {inert:true};
  const ctx = {
    structuredClone, Work82:{run, runs:[], leaves:[]}, liveProfile:{id:'test'}, ojmDb:{},
    document:{querySelectorAll:()=>[panel,disabledPanel],getElementById:()=>({reportValidity:()=>true})},
    runAction82:action=>action(), updateRun82:()=>{}, results:()=>[], currencies82:()=>['LAK'], ratesNeeded:()=>[],
    payrollTaxSettings:{verify:async()=>1}, payrollConfig82:()=>({payFrequency:'monthly'}),
    ApplicationSettings:{payroll:{}}, legends:()=>[], ui:{drafts:{}}, renderWork82:()=>{}, showCenterStatus:()=>{}
  };
  ctx.window=ctx;
  const start=source.indexOf('window.saveRun82='),end=source.indexOf('\n', source.indexOf('panel.inert=false;',start));
  assert(start>=0 && end>start);
  vm.runInNewContext(source.slice(start,end),ctx);
  const atConfirm=untilReleased(), answer=untilReleased();
  ctx.ui117={confirm:()=>{atConfirm.resolve();return answer.promise;}};
  let writes=0;
  ctx.saveWork82=async()=>{writes++;};
  const close=ctx.saveRun82(true);
  await atConfirm.promise;
  assert.equal(panel.inert,true);
  run.notes='edit from another open input';
  answer.resolve(true);
  await assert.rejects(close,/inputs changed/);
  assert.equal(writes,0);assert.equal(panel.inert,false);assert.equal(disabledPanel.inert,true);
  const saving=untilReleased(), receipt=untilReleased();
  ctx.saveWork82=async(kind,data)=>{saving.resolve(data);return receipt.promise;};
  const draft=ctx.saveRun82(false), earlier=await saving.promise;
  assert.equal(panel.inert,false);
  run.notes='newer draft';
  receipt.resolve({id:'r',version:2,data:earlier});
  await draft;
  assert.equal(ctx.Work82.run.notes,'newer draft');assert.equal(ctx.Work82.runs[0].data.notes,'edit from another open input');
  assert.equal(ctx.ui.drafts[run.month].record.version,2);
}

async function testPhone(networkFailure) {
  const make=(key,editIds=[])=>({key,owner:'u',status:'pending',draft:{memo:key},params:{p_owner:'u',p_items:[{}],p_edit_ids:editIds,p_snapshot:{}}});
  let stored={queue:[make('first',['a']),make('related',['a']),make('independent')]};
  const sent=[], notices=[];
  const ctx={S:{owner:'u',epoch:1,page:'post',data:{}},navigator:{onLine:true},current:()=>true,
    record:async(owner,change)=>{if(change)stored=change(stored);return stored;},
    queue:()=>stored.queue,access:()=>{},permission:()=>true,paintConnection:()=>{},accounts:()=>[],rules:()=>({}),
    denied:()=>false,ambiguous:e=>!e.status||e.status>=500,clearLegacy:()=>{},refresh:()=>{},notice:m=>notices.push(m),
    StaffEntry14225:{prepare:()=>{}},
    rpc:async(name,params)=>{const item=stored.queue.find(q=>q.params===params);sent.push(item.key);
      if(item.key==='first')throw Object.assign(new Error('save declined'),{status:networkFailure?503:400});
      return {line_ids:[item.key]};}};
  ctx.window=ctx;
  vm.runInNewContext(fs.readFileSync('src/subusers/phone/runtime/durable-sync.js','utf8'),ctx);
  await ctx.sync();
  assert.deepEqual(sent,networkFailure?['first']:['first','independent']);
  assert.deepEqual(Array.from(stored.queue,q=>q.status),networkFailure?['uncertain','pending','pending']:['blocked','pending','confirmed']);
  assert.equal(ctx.S.online,!networkFailure);
  assert(notices.some(m=>m.includes(networkFailure?'original save references':'first')));
}
(async()=>{await testPayroll();await testPhone(false);await testPhone(true);console.log('PASS payroll finalization and draft edit races, phone receipt rejection, dependent edits and uncertain retries');})().catch(e=>{console.error(e);process.exitCode=1;});
