const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='integrations/google-sheets/annual-archive/';
const html=fs.readFileSync(root+'Importer.html','utf8'),src=html.split('<script>')[1].split('function csvValue')[0];
const ctx={};vm.createContext(ctx);vm.runInContext(src,ctx);
const base={format:'oonjai-data-113',tables:{accounts:[{id:'c',code:'1040',name:'Bank',account_type:'ASSET'}],journal_entries:[{id:'j',status:'posted',entry_no:'J1',transaction_date:'2026-03-01'}],journal_lines:[{id:'l',journal_entry_id:'j',account_id:'c',currency_code:'LAK',debit:2,credit:0}]}};
assert.equal(ctx.inspectBackup(base).filter(r=>r[0]==='J').length,1);
assert.throws(()=>ctx.inspectBackup({...base,tables:{...base.tables,journal_lines:[...base.tables.journal_lines,...base.tables.journal_lines]}}),/duplicate/);
assert.throws(()=>ctx.inspectBackup({...base,from:'2026-01-01',to:'2026-12-31'}),/opening/);
const extra={...base,annualEvidence:{scanner_documents208:[{id:'doc',entry_label:'J1',title:'receipt',pdf_provider:'drive',pdf_path:'file'}],reconciliation_reports:[{id:'count',closing:2}]}};
assert.equal(ctx.inspectBackup(extra).filter(r=>r[0]==='R').length,1);
assert(ctx.inspectBackup(extra).some(r=>r[0]==='RAW'&&r[1]==='annualEvidence'&&r[2]==='reconciliation_reports'));
const app=fs.readFileSync('src/maintenance/backup/data-tools14232.js','utf8');
const body=app.slice(app.indexOf('async function downloadAnnualReview'),app.indexOf('async function downloadPreviousAudit'));
async function test(){
 let saved=null,msg='',queries=0;const result={list_journal_plans280:[{id:'p',occurrences:[{due_date:'2026-08-01'}]},{id:'future',occurrences:[{due_date:'2027-01-01'}]}],reconciliation_records305:[{id:'r',from:'2026-10-01',to:'2026-10-31'}]};
 const client={from(table){return {select(){return this},order(){return this},async range(){queries++;return {data:table==='scanner_documents208'?[{id:'d',accounting_year231:2026},{id:'other',accounting_year231:2027}]:[]};}};}};
 const c={prepared:{...base,from:'2026-01-01',to:'2026-12-31',scope14232:['journal']},preparedOwner:'admin',liveProfile:{id:'admin'},ojmDb:client,generation:1,$:()=>({disabled:false}),admin:()=>true,S:{scopes:[{id:'journal'}]},status:(id,s)=>{msg=s;},download:async(n,p)=>{saved=p;},rpc:async(name)=>result[name]};
 vm.createContext(c);vm.runInContext(body,c);await c.downloadAnnualReview();
 assert.equal(saved.annualEvidence.journal_plans.length,1);assert.equal(saved.annualEvidence.scanner_documents208.length,1);assert.equal(saved.annualEvidence.reconciliation_reports.length,1);assert(!c.prepared.annualEvidence);assert(queries>0);
 saved=null;c.prepared.scope14232=[];await c.downloadAnnualReview();assert.equal(saved,null);assert.match(msg,/Everything/);
 c.prepared.scope14232=['journal'];result.list_journal_plans280=null;await c.downloadAnnualReview();assert.equal(saved,null);
 console.log('PASS read-only annual export, year scope, validation, staged failure, receipt references and raw supplemental data.');
}
test().catch(e=>{console.error(e);process.exitCode=1});
