const fs=require('node:fs'),path=require('node:path'),base=require('./payroll-actions-fixture276.cjs');
const read=p=>fs.readFileSync(p,'utf8');
function setup(){
 const w=window,clone=v=>JSON.parse(JSON.stringify(v)),qa=w.qa276;
 qa.entries=[];qa.ledger=[];qa.calls=[];qa.periodClosed=false;qa.prints=[];
 w.ApplicationSettings.payroll={nonWorkDays99:[]};w.ApplicationSettings.accounting={journalPrefix:'TEST',journalDigits:6};
 Object.assign(w.Work82,{loaded:true,loading:false,error:'',leaves:[],employees:[],busy:false});
 Object.assign(w,{desktop80:{matches:true},ui:{owner:'test-owner',search:'',drafts:qa.cache.drafts,open:{}},mountSettings:()=>{},bindGroups:()=>{},bindRun:()=>{},storageNotice82:()=>'',today82:()=> '2026-11-04',appLocalDate:()=> '2026-11-04',currencies82:()=>['LAK','USD'],ratesNeeded:()=>['USD'],legends:()=>[],usedLegendLeave:()=>0,businessInitials:()=> 'TEST',payrollTaxSettings:{verify:async()=>7},hrCalendar14306:{snapshot:()=>({settings:{},events:[]})}});
 w.payrollConfig82=()=>({workDays:22,payFrequency:'monthly',brackets:[]});
 w.results=r=>{if(r.status==='finalized')return r.results;const out=clone(r.results);const extra=Number(r.rows[0].input.allowance||0);out[0].gross=22294000+extra;out[0].adjusted=22294000+extra;return out;};w.payroll95.results=w.results;
 w.esc=w.escapeHtml;w.money=n=>w.formatAppNumber(n);w.sum=(rs,k)=>rs.reduce((n,r)=>n+Number(r[k]||0),0);w.totals=()=> 'Synthetic employee payroll';
 w.action82=(label,js)=>'<button type="button" onclick="'+w.esc(js)+'">'+w.esc(label)+'</button>';
 w.group=(key,title,detail,body)=>'<details open class="pay-group95"><summary><strong>'+w.esc(title)+'</strong><span>'+w.esc(detail)+'</span></summary>'+body+'</details>';
 w.groupedTables=(run,editable)=>'<table><thead><tr><th>Employee</th><th>Gross LAK</th><th>Adjusted LAK</th></tr></thead><tbody>'+w.results(run).map(x=>'<tr><td>Test Employee</td><td>'+w.money(x.gross)+'</td><td>'+w.money(x.adjusted)+'</td></tr>').join('')+'</tbody></table>'+(editable?'<label>Test allowance adjustment (LAK) <input id="qa-allowance" type="number" value="'+Number(run.rows[0].input.allowance||0)+'" oninput="Work82.run.rows[0].input.allowance=Number(this.value)"></label>':'');
 w.metadata=run=>'<form id="runMeta95"><label>Payroll month <input type="month" value="'+run.month+'" readonly></label><label>Reference <input value="'+run.reference+'" required readonly></label></form>';
 w.mount82=(id,title,description,body,actions)=>{document.getElementById(id).innerHTML='<div class="desktop82"><section class="work82"><header><div><h2>'+title+'</h2><p>'+description+'</p></div><div class="actions82">'+actions+'</div></header>'+body+'</section></div>';};
 w.renderWork82=()=>{};w.loadWork82=async()=>w.renderWork82();w.printPayroll82=v=>{qa.prints.push(v?'voucher':'payroll');w.showCenterStatus((v?'Salary voucher':'Payroll print')+' route retained — synthetic check only');};w.printHistory95=()=>w.printPayroll82(false);
 w.runAction82=async fn=>{if(w.Work82.busy)return;w.Work82.busy=true;try{await fn();}catch(e){w.showCenterStatus(e.message,true);}finally{w.Work82.busy=false;}};
 w.switchTab=id=>{document.querySelectorAll('.tab-content').forEach(n=>{n.classList.toggle('active',n.id===id);n.hidden=n.id!==id;});document.getElementById('qa-tab').textContent=id;document.getElementById('journalEntry98').hidden=id!=='journal';w.renderWork82();};
 w.openRun82=id=>{const record=w.Work82.runs.find(r=>r.id===id);if(!record)return;w.Work82.runRecord=clone(record);w.Work82.run=clone(record.data);w.switchTab('payroll-entries');};
 w.PeriodReview={periods:{},status:month=>qa.periodClosed&&month==='2026-10'?'closed':'open',pendingAdjustment:null};
 w.pendingWorkspacePostJournalId=null;w.pendingWorkspacePostOwnerId=null;
 w.snapshotJournal69=()=>[...document.querySelectorAll('#jeLinesBody input')].map(n=>n.value);
 w.getMultiDateJournalState=()=>({errors:[]});w.collectLiveJournalGroups=()=>({errors:[],differences:[],grouped:{[document.getElementById('jeTransDate').value]:{lines:[...document.querySelectorAll('#jeLinesBody tr')].map(tr=>{const account=w.AccountingStore.accounts.find(a=>tr.querySelector('.je-line-acc').value.startsWith(a.code+' —'));return {account,memo:tr.querySelector('.je-line-memo').value,currency:account.currency,debit:Number(tr.querySelector('.je-line-dr').value||0),credit:Number(tr.querySelector('.je-line-cr').value||0),fx_rate_lak:Number(tr.dataset.fxRate14383)||1,book_rate_lak:Number(tr.dataset.bookRate14383)||null};})}}});
 w.loadJournalFromSupabase=async()=>{w.JournalModule.entries=qa.entries.map(e=>({dbEntryId:e.id,id:e.entry_no,generalMemo:e.memo,date:e.transaction_date,status:'posted'}));};
 const remember=record=>{qa.record=clone(record);w.Work82.runs=[clone(record)];return {data:clone(record),error:null};};
 const context=()=>({record:clone(qa.record),period_open:!qa.periodClosed,needs_report:false,correction_id:qa.record.data.correction277?.pending?qa.record.data.correction277.id:null,mode:qa.record.data.correction277?.pending?(qa.periodClosed?'adjustment':qa.entries.length?'replace':'initial'):'initial',ledger:clone(qa.ledger),ledger_hash:'synthetic-ledger-v1'});
 w.ojmDb={from:table=>{const filters=[];const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},ilike:()=>q,then:(resolve,reject)=>Promise.resolve({data:table==='payroll_runs'?[clone(qa.record)]:qa.entries.filter(e=>filters.every(([k,v])=>e[k]===v)),error:null}).then(resolve,reject)};return q;},rpc:async(name,args)=>{
  qa.calls.push({name,args:clone(args)});if(name==='payroll_journal_context277')return {data:context(),error:null};
  if(args.p_expected_version!==qa.record.version)return {error:{message:'Payroll changed after preparation. Prepare its journal again.'}};
  if(name==='reopen_payroll277'){if(qa.periodClosed&&!args.p_reason?.trim())return {error:{message:'Closed-month correction needs a report'}};return remember({...qa.record,version:qa.record.version+1,data:{...qa.record.data,status:'draft',correction277:{id:'test-correction-'+qa.record.version,pending:true,reason:args.p_reason||''}}});}
  if(name==='document_payroll_correction277')return remember({...qa.record,version:qa.record.version+1,data:{...qa.record.data,correction277:{...qa.record.data.correction277,reason:args.p_reason}}});
  if(name==='post_payroll_journal277'){
   qa.postCalls++;const replace=args.p_expected_mode==='replace',entry={id:replace?qa.entries[0].id:'test-journal-'+(qa.entries.length+1),entry_no:replace?qa.entries[0].entry_no:'TEST-'+(qa.entries.length+1),status:'posted',memo:args.p_memo,transaction_date:args.p_transaction_date};
   qa.entries=replace?[entry]:[...qa.entries,entry];const item={...entry,lines:clone(args.p_lines)};qa.ledger=replace?[item]:[...qa.ledger,item];
   const record={...qa.record,version:qa.record.version+1,data:{...qa.record.data}};
   if(args.p_expected_mode==='initial')record.data.journalLink1429={status:'posted',journalId:entry.id,journalReference:entry.entry_no};
   if(args.p_correction_id)record.data.correction277={...record.data.correction277,pending:false,journalId:entry.id,journalReference:entry.entry_no,mode:args.p_expected_mode};
   remember(record);return {data:{record,entry_id:entry.id,entry_no:entry.entry_no,mode:args.p_expected_mode},error:null};
  }
  return {error:{message:'Unexpected synthetic RPC '+name}};
 }};
 w.addEventListener('DOMContentLoaded',()=>{document.getElementById('qa-history').onclick=()=>w.switchTab('payroll-history');document.getElementById('qa-entries').onclick=()=>w.switchTab('payroll-entries');document.getElementById('qa-close-month').onclick=()=>{qa.periodClosed=true;document.getElementById('qa-period').textContent='October accounting month: Closed (simulation)';w.renderWork82();};document.getElementById('btnPostJournal').onclick=()=>w.submitJournalEntry();w.renderWork82();});
}
function scripts(){
 const install=read('src/bridges/hr-payroll/attendance-v96/install-and-scope-close.js');
 const save=read('src/payroll/workspace/groups-v96/drafts-and-finalization.js');
 return [...base.scripts(),read('src/bookkeeping/history/history-month14341.js'),read('src/payroll/reports/history-v96.js').split('window.exportPayroll95=')[0],install.slice(0,install.indexOf('// Keep auto-prepared')),save.slice(save.indexOf('window.saveRun82='))];
}
const html=base.html.replace('Saves use an in-memory test store. Posting is blocked.','Saves and journal posting are simulated in memory. No live financial data is used.').replace('<h1>Payroll action checks</h1>','<h1>Payroll lifecycle checks — synthetic data</h1>').replace('<button id="qa-open">','<button id="qa-entries">Payroll Entries</button><button id="qa-history">Salary History</button><button id="qa-close-month">Simulate closed accounting month</button><p id="qa-period">October accounting month: Open (simulation)</p><section id="payroll-entries" class="tab-content active"></section><section id="payroll-history" class="tab-content" hidden></section><section id="journal" class="tab-content" hidden></section><button id="qa-open">');
module.exports={scripts,setup,html,baseSetup:base.setup};
if(require.main===module){const out=process.argv[2];fs.mkdirSync(out,{recursive:true});const styles=['styles/shared-v108.css','styles/workspaces1432.css','styles/controls14305.css'];fs.writeFileSync(path.join(out,'index.html'),html.replace('</head>','<style>'+styles.map(read).join('\n')+'\nbody{font:14px system-ui;padding:20px}header .actions82{display:flex;gap:8px;flex-wrap:wrap}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.pay-group95{margin:12px 0;padding:12px;border:1px solid #d4e3dc}.pay-group95 summary{display:flex;gap:16px}#payTemplateError1429[data-error276="true"]{color:#9b3d25}</style></head>').replace('</body>','<script>('+base.setup.toString()+')();('+setup.toString()+')();</script>'+scripts().map(s=>'<script>'+s+'</script>').join('')+'</body>'));console.log('Built isolated payroll lifecycle fixture: '+out);}
