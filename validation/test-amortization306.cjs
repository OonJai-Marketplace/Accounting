const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
const dom=new JSDOM('<section id="transactions-recurring"></section><table><thead></thead><tbody id="tblJournalHistoryBody"></tbody></table>',{url:'https://fixture.invalid',runScripts:'outside-only'});
const w=dom.window;
Object.assign(w,{escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;'),formatAppDate:s=>s,formatAppNumber:n=>String(n),parseAppNumber:Number,liveProfile:{id:'owner',role:'admin',status:'active'},AccountingStore:{accounts:[]},JournalModule:{entries:[]},access113:{can:()=>true},setTimeout:()=>{},getCleanAccountDisplay:()=>({name:'Fixture',currency:'LAK'}),currencySymbolV6:()=>'',journalMemoHtml143187:s=>s,JournalFX14383:{lineRates:()=>[]}});
w.eval(read('src/bookkeeping/finalization/transaction-review-and-audit.js').split('function setTransactionTableHeaders')[0]);
const lines=[
 {id:'AMO26-000001',date:'2026-10-01',postingDate:'2026-10-01',created_at:'2026-11-06T12:00:00Z'},
 {id:'OJM260375',date:'2026-10-30',postingDate:'2026-10-30',created_at:'2026-11-05T12:00:00Z'},
 {id:'OJM260300',date:'2026-10-01',postingDate:'2026-10-01',created_at:'2026-10-02T12:00:00Z'},
 {id:'OJM260374',date:'2026-10-02',postingDate:'2026-10-29',created_at:'2026-11-04T12:00:00Z'}
].map(x=>({...x,account:'Fixture',memo:'Fixture',debit:1,credit:0}));
const body=w.document.getElementById('tblJournalHistoryBody');
w.renderTransactionReviewTable(body,lines);
assert.deepEqual([...body.rows].map(r=>r.dataset.entryId),['OJM260375','OJM260374','OJM260300','AMO26-000001']);
assert.equal(body.closest('table').dataset.journalPostingOrder306,'1');
// The shared table observer must not replace this pre-pagination order.
assert.match(read('src/subusers/review/review-mobile-v78.js'),/table.dataset.journalPostingOrder306==='1'/);
const plans=['Restaurant rent','Wi-Fi','Company house rent'].map((title,i)=>({id:'plan-'+i,kind:'amortization',title,memo:title,status:'active',auto_post:true,definition:{posting_day:'first',replaces_schedules:i===1?['SCH-old']:[]},occurrences:[{occurrence_no:1,due_date:'2026-11-01',status:'pending',lines:[]}]}));
w.ojmDb={rpc:async()=>({data:plans})};
w.eval(read('src/bookkeeping/recurring/upcoming-plans280.js'));
(async()=>{
 await w.UpcomingPlans280.load(true);
 const group=w.document.getElementById('amortizationPlans280');
 assert.equal(group.querySelectorAll(':scope > details[data-plan]').length,3);
 assert.equal(group.querySelectorAll('details[data-plan] details[data-plan]').length,0);
 assert.equal(group.querySelectorAll(':scope > details[open]').length,0);
 assert.match(group.textContent,/3 plans · First day of each month/);
 assert(w.UpcomingPlans280.replacesSchedule('SCH-old'));
 assert(!w.UpcomingPlans280.replacesSchedule('unrelated'));
 assert(!read('src/bookkeeping/recurring/upcoming-plans280.js').includes('<option value="last">'));
 console.log('PASS: three sibling amortization plans, first-day controls, replaced-schedule lookup, posting-date journal order and same-day amortization at bottom.');
 dom.window.close();
})().catch(e=>{console.error(e);process.exitCode=1});
