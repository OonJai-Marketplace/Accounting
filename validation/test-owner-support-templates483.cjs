// Synthetic fixtures only. No live posting or report changes.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('../src/bookkeeping/journal/completion-core258.js');
require('../src/bookkeeping/templates/generation-catalog268.js');
const chart=[];
function add(code,currency,type){chart.push({id:code,code,currency,type,name:code,isPosting:true,active:true});}
for(const [c,remaining,used,bank,staff] of [['LAK','3023','3024','1040','1210'],['USD','3028','3029','1041','1220'],['THB','3020-02','3020-03','1042','1224']]){
 add(remaining,c,'EQUITY');add(used,c,'EQUITY');add(bank,c,'ASSET');add(staff,c,'ASSET');
}
const G=JournalCompletion258,templates=JournalTemplateCatalog268.templates(chart);
for(const [c,r,u,id] of [['LAK','3023','3024','gen268-local-3024'],['USD','3028','3029','gen268-mapping-9321-USD'],['THB','3020-02','3020-03','gen268-mapping-9322-THB']]){
 const t=templates.find(t=>t.id===id);assert.deepEqual(t.lines.map(l=>l.code),[r,u]);
 const rows=[{account_id:r,debit:50,credit:0,book_rate_lak:21000},{account_id:u,debit:0,credit:50,book_rate_lak:21000}];
 const result=G.complete({chart,rows,rates:{[c]:22000}});assert.deepEqual(result.errors,[]);assert.equal(result.rows.length,2);
 assert.deepEqual(G.complete({chart,rows:result.rows,rates:{[c]:22000}}).rows,result.rows);
 if(c!=='LAK'){
  assert(result.rows.every(l=>l.fx_rate_lak===21000&&l.book_rate_lak===21000));
  assert(G.complete({chart,rows:rows.map(l=>({...l,book_rate_lak:undefined})),rates:{[c]:22000}}).errors.some(e=>e.needsBook));
  assert(G.complete({chart,rows:[rows[0],{...rows[1],book_rate_lak:22000}],rates:{[c]:22000}}).errors.some(e=>/same original/.test(e.message)));
  const receipt=templates.find(t=>t.id==='gen268-mapping-'+(c==='USD'?'9311':'9312')+'-'+c);
  assert.deepEqual(receipt.lines.map(l=>l.code||l.role),['fund',r]);
 }
}
assert(!templates.flatMap(t=>t.lines).some(l=>/^93|^3026$/.test(l.code||'')));
assert(!templates.some(t=>t.id.startsWith('gen268-support-exchange-')),'Native support exchange uses the evidenced utilization workflow, not the bank-only legacy combination');
const entry={id:'original-uuid',entry_no:'OJM990001',transaction_date:'2027-01-10',status:'posted',memo:'Saved journal',journal_lines:[
 {line_no:2,currency_code:'USD',accounts:{code:'3028',name:'Remaining'},debit:0,credit:100},
 {line_no:1,currency_code:'USD',accounts:{code:'1041',name:'Bank'},debit:100,credit:0}
]};
let shown,reads=0,permission=true,changeActor=false;
const overlay={style:{}},ctx={console,structuredClone,liveProfile:{id:'owner'},access113:{can:()=>permission},PeriodReview:{periods:{'2027-01':{status:'closed'}}},document:{getElementById:()=>overlay},showJournalSource69:(id,lines)=>shown={id,lines}};
ctx.window=ctx;
const query={select(){return this},eq(field,id){assert.equal(field,'entry_no');assert.equal(id,'OJM990001');return this},async maybeSingle(){reads++;if(changeActor)ctx.liveProfile={id:'other'};return {data:entry}}};
ctx.ojmDb={rpc:async()=>({data:{entry_no:'OJM990001',status:'posted',report_version:3}}),from:name=>{assert.equal(name,'journal_entries');return query}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/budget/requests/utilization-journal.js','utf8'),ctx);
(async()=>{
 await ctx.BudgetUtilizationJournal.view('report');assert.equal(reads,1);assert.equal(shown.id,'OJM990001');assert.equal(shown.lines[0].debit,100);assert(shown.lines.every(l=>l.dbEntryId==='original-uuid'&&l.archived));assert.equal(overlay.style.zIndex,'16000');assert.equal(ctx.BudgetUtilizationJournal.snapshot(),null);
 permission=false;await assert.rejects(ctx.BudgetUtilizationJournal.view('report'),/View permission/);assert.equal(reads,1);
 permission=true;changeActor=true;shown=null;await assert.rejects(ctx.BudgetUtilizationJournal.view('report'),/View permission/);assert.equal(shown,null);
 const workflow=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8');
 const post={hidden:false},field={isConnected:true,closest:()=>({querySelector:()=>post})},host={querySelector:()=>field};
 let reviewed=null;
 const ui={context:()=>()=>{},prepareSummary:()=>{throw Error('Must not create a new draft')},showCenterStatus:message=>{throw Error(message)},journal:{lookup:async()=>({entry_no:'OJM990001',report_version:3}),reference:l=>l.entry_no,view:async id=>{reviewed=id}}};
 vm.createContext(ui);vm.runInContext(workflow.slice(workflow.indexOf('function showJournalReference('),workflow.indexOf('async function prepareSummary(')),ui);
 ui.showJournalReference(host,{id:'report'});await Promise.resolve();assert.equal(post.hidden,false);assert.equal(post.textContent,'View journal');await post.onclick();assert.equal(reviewed,'report');assert.equal(post.disabled,false);
 console.log('PASS native support templates after mapping retirement, stable template IDs, original-rate guards and read-only linked-journal review with account isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
