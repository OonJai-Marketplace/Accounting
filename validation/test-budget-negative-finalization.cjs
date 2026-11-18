const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8');
function harness(data,answer=true){
 const calls={saved:[],dialogs:[],statuses:[],live:[],lifecycle:0};
 const control={disabled:false};
 const ctx=vm.createContext({window:{},structuredClone,console,Date,Intl,
  escapeHtml:s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'),
  formatAppNumber:n=>Number(n).toFixed(2),
  CurrencyStore:{currencies:[{code:'USD'},{code:'LAK'}]},
  BudgetOwnerBalance:{validateShare:()=>{}},
  context:()=>()=>{},checkedOnVisit:new Set(),confirmedFinals:new Map(),allocationRecord:{id:'report',version:4,data},
  allocationRequest14370:1,busy:false,allocation:structuredClone(data),
  clone:structuredClone,headerValid:()=>true,applySpending:()=>{},
  fundPopup:{querySelectorAll:()=>[control]},
  ui108:{modal:async(title,html,buttons)=>{calls.dialogs.push({title,html,buttons});return answer;}},
  ui117:{confirm:async text=>{calls.dialogs.push({text});return answer;}},
  ojmDb:{rpc:async()=>{calls.lifecycle++;return {data:{version:14316}};}},
  live:async(...args)=>calls.live.push(args),liveProfile:{full_name:'Test'},livePermission:{},
  saveWork82:async(table,d)=>{calls.saved.push(structuredClone(d));return {id:'report',version:5,data:d};},
  Work82:{reports:[]},rememberFinal:()=>{},clearFundPopup:()=>{},renderAllocation:()=>{},renderRequest:()=>{},
  document:{querySelector:()=>null},showCenterStatus:(message,error)=>calls.statuses.push({message,error})
 });
 vm.runInContext(fs.readFileSync('src/budget/requests/budget-report290.js','utf8'),ctx);
 ctx.report=ctx.window.BudgetReport290;ctx.esc=ctx.escapeHtml;
 vm.runInContext(source.slice(source.indexOf('function validDate14317'),source.indexOf('const esc='))+
  source.slice(source.indexOf('function validateAllocation('),source.indexOf('function budgetDialog(')),ctx);
 return {ctx,calls,control};
}
const movement=(type,currency,amount)=>({type290:type,currency,account:'Bank',reference:'TEST',inflow:type==='receipt'?amount:0,outflow:type==='spend'?amount:0});
const april={date:'2026-04-30',lines:[],movements:[movement('receipt','USD',100),movement('spend','USD',120),movement('receipt','LAK',2000000),movement('spend','LAK',100000)],conversions:[]};
(async()=>{
 let h=harness(april);await h.ctx.saveAllocation(true);
 assert.equal(h.calls.saved.length,1);assert.equal(h.calls.saved[0].status,'finalized');
 assert.equal(h.calls.statuses.length,1);assert.equal(h.calls.statuses[0].message,'Fund allocation finalized.');
 assert.deepEqual(h.calls.saved[0].movements,april.movements);
 assert.equal(h.ctx.report.balances(h.calls.saved[0]).get('USD').remaining,-20);
 assert.equal(h.ctx.report.balances(h.calls.saved[0]).get('LAK').remaining,1900000);
 assert.match(h.calls.dialogs[0].html,/USD \(20.00\)/);
 assert.equal(h.calls.dialogs[0].buttons[1].label,'Finalize anyway');
 assert.equal(h.calls.lifecycle,0);assert.deepEqual(h.calls.live,[]);assert.equal(h.control.disabled,false);
 h=harness(april,false);await h.ctx.saveAllocation(true);
 assert.equal(h.calls.saved.length,0);assert.equal(h.calls.lifecycle,0);assert.equal(h.control.disabled,false);
 h=harness(april);await h.ctx.saveAllocation(false);
 assert.equal(h.calls.saved[0].status,'draft');assert.equal(h.calls.dialogs.length,0);
 assert.match(h.calls.statuses[0].message,/saved.*Warning: negative remaining balance.*USD \(20.00\)/);
 const positive=structuredClone(april);positive.movements[0].inflow=200;
 h=harness(positive);await h.ctx.saveAllocation(true);
 assert.equal(h.calls.saved.length,1);assert.match(h.calls.dialogs[0].text,/Finalize the received funding/);
 for(const change of [d=>d.movements[0].reference='',d=>d.movements[0].currency='BAD',d=>d.movements[0].inflow=-5]){
  const invalid=structuredClone(april);change(invalid);h=harness(invalid);await h.ctx.saveAllocation(true);
  assert.equal(h.calls.saved.length,0);assert.equal(h.calls.dialogs.length,0);assert.equal(h.calls.statuses[0].error,true);
 }
 const both=structuredClone(april);both.movements[2].inflow=10;
 h=harness(both);await h.ctx.saveAllocation(true);assert.match(h.calls.dialogs[0].html,/USD \(20.00\), LAK \(99,990.00\)/);
 assert.equal(h.calls.saved.length,1);
 for(const finalize of [false,true]){
  h=harness(positive);let finalized=0,closed=0;
  h.ctx.rememberFinal=()=>finalized++;h.ctx.clearFundPopup=()=>closed++;
  h.ctx.saveWork82=async(table,d)=>({id:'report',version:5,data:d,_pending14333:true});
  await h.ctx.saveAllocation(finalize);
  assert.equal(finalized,0,'Pending finalization cannot enter confirmed finals');
  assert.equal(closed,finalize?1:0);assert(h.ctx.Work82.reports[0]._pending14333);
  assert.match(h.calls.statuses[0].message,/queued.*Notifications/);assert(!h.calls.statuses[0].error);
 }
 console.log('PASS pending Save and Finalize release controls without claiming database confirmation.');
 console.log('PASS: negative USD/positive LAK, both negative, confirm/cancel, draft warning, normal finalize, invalid-input guards and unchanged currency amounts.');
})().catch(e=>{console.error(e);process.exitCode=1;});
