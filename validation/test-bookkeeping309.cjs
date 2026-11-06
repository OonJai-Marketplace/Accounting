const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const dom=new JSDOM('<section id="transactions-recurring" class="tab-content"></section><section id="user-entry-review" class="tab-content active"></section>',{url:'https://fixture.invalid',runScripts:'outside-only'}),w=dom.window;
 try{
 let reads=0,navigations=0,refreshes=0,recRenders=0,payrollReads=0;
 Object.assign(w,{escapeHtml:String,formatAppDate:String,formatAppNumber:String,parseAppNumber:Number,liveProfile:{id:'owner',role:'admin',status:'active'},AccountingStore:{accounts:[]},JournalModule:{entries:[]},access113:{can:()=>true},setTimeout:()=>{},BudgetReport290:{},Work82:{reports:[]},renderWork82:()=>{},deleteWork108:()=>{},openOperational82:()=>{},loadWork82:async()=>{payrollReads++},renderReconciliationList71:async()=>{recRenders++},startup14257:{isPrepared:()=>true},showCenterStatus:()=>{},switchTab:id=>{navigations++;w.document.querySelectorAll('.tab-content').forEach(n=>n.classList.toggle('active',n.id===id));},refreshNotices1443:()=>{refreshes++}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 const plans=[{id:'p',kind:'amortization',title:'Wi-Fi',memo:'Wi-Fi release',status:'active',auto_post:false,version:2,blocking_reason:'Waiting for October 2026 to close. Then review and post this release.',definition:{reminder_days:3},occurrences:[{occurrence_no:1,due_date:'2020-11-01',status:'pending',lines:[]}]}];
 w.ojmDb={rpc:async()=>{reads++;return {data:plans}}};
 w.eval(read('src/bookkeeping/recurring/upcoming-plans280.js'));
 await Promise.all([w.UpcomingPlans280.load(),w.UpcomingPlans280.load()]);assert.equal(reads,1);
 const original=w.document.querySelector('[data-plan]'),count=refreshes;
 await w.UpcomingPlans280.load();assert.equal(w.document.querySelector('[data-plan]'),original);assert.equal(refreshes,count,'cached read must not rebuild all plans and notifications');
 assert.equal(await w.UpcomingPlans280.open('p'),true);assert.equal(navigations,1);assert.equal(reads,1);assert(original.open);
 const notices=w.UpcomingPlans280.notices();assert.match(notices[0].type,/awaiting posting/);assert.match(notices[0].detail,/October 2026/);assert.equal(notices[0].critical,false);
 w.eval(read('src/bridges/subusers-bookkeeping/budget-workflow14316.js'));
 w.switchTab('user-entry-review');w.budgetWorkflow14316.finalization('reconciliation');recRenders=0;
 w.dispatchEvent(new w.Event('page113'));await Promise.resolve();await Promise.resolve();assert.equal(recRenders,1,'one Reconcile render per navigation');assert.equal(payrollReads,0,'Reconcile does not fetch payroll');
 }finally{w.close()}
 // Concurrent report consumers share one request. Mismatched retained reports
 // are checked once per minute/data revision, never silently accepted or written.
 const source=read('src/reports/financial/reports-system-v71.js');let remote=0,snapshots=0,writes=0;
 const records=Array.from({length:5},(_,i)=>({id:String(i),owner:'owner',status:'saved',account:{id:String(i)},from:'2026-10-01',to:'2026-10-31',opening:0,debit:1,credit:0,closing:1,lines:[]}));
 const c={reportOwner71:()=> 'owner',ojmDb:{},JournalModule:{entries:[]},Date,Map,JSON,Promise,structuredClone,reportStore71:async()=>records,reconciliationCloud305:()=>true,reconciliationKey71:r=>r.id,reconciliationRecorded71:()=>true,validateReport71:()=>{},reconciliationRpc305:async name=>{if(name==='reconciliation_records305'){remote++;return [];}writes++;throw Error('Unexpected write')},reconciliationSnapshot305:async()=>{snapshots++;return {opening:0,debit:2,credit:0,closing:2,lines:[]}}};vm.createContext(c);
 vm.runInContext(source.slice(source.indexOf('let reconciliationRecordsFlight309'),source.indexOf('function reportMethod71')),c);
 await Promise.all([c.reconciliationRecords305(),c.reconciliationRecords305()]);assert.equal(remote,1);assert.equal(snapshots,5);assert.equal(writes,0);
 await c.reconciliationRecords305();assert.equal(remote,2);assert.equal(snapshots,5);
 c.JournalModule.entries=[];await c.reconciliationRecords305();assert.equal(snapshots,10,'a new journal revision requires new checks');
 console.log('PASS Bookkeeping: one navigation/render, no unrelated payroll fetch, stable cached plan DOM, one shared reconciliation read, bounded legacy checks and fresh checks after journal changes.');
})().catch(e=>{console.error(e);process.exitCode=1});
