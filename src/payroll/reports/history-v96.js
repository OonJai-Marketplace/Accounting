function historyView(id){
 const salaryHistory=id==='payroll-history', report=!salaryHistory;
 const closed=r=>(r.data.status==='finalized'||r.data.correction277)&&!r.data.isSample;
 const historyRuns=salaryHistory?Work82.runs.filter(closed):Work82.runs;
 const selected=historyMonth14341.choose(id,historyRuns.map(r=>r.data.month));
 const monthRuns=historyRuns.filter(r=>r.data.month===selected);
 const query=report&&ui.search.trim().toLowerCase();
 const list=query?monthRuns.filter(r=>JSON.stringify(r.data).toLowerCase().includes(query)):monthRuns;
 const finalRows=monthRuns.filter(closed).flatMap(r=>r.data.results||[]);
 const monthControl=historyMonth14341.control(id,selected);
 const records=list.map(record=>{
  const r=record.data,display=r.status==='draft'&&r.correction277?{...r,status:'finalized'}:r;
  let rows=[];try{rows=results(display)}catch(_){}
  const journal=window.payrollJournalReference1429?.(record), posted=window.payrollPosted1429?.(record);
  const title=r.reference+' · '+r.month+(journal?' · Journal '+journal:'');
  const status=(r.isSample?'Sample · ':'')+(r.status==='finalized'?'Closed · '+(posted?'Journaled':r.correction277?.pending?'Correction journal pending':'Not journaled'):r.correction277?'Correction in progress · last closed figures':r.status);
  const summary=status+' · '+r.rows.length+' employees · '+(rows.length?totals(rows)+' · '+money(sum(rows,'adjusted'))+' LAK equivalent':'Rates / inputs needed');
  const key='history-'+record.id;
  const actions=(report?action82('Open',`openRun82('${record.id}')`):'')+
   (r.status==='finalized'&&!r.isSample?action82(posted?'View Journal':'Payroll journal',`payrollJournal1429.openSaved('${record.id}')`):'')+
   (window.payrollJournal1429?.canEdit(record)?action82('Edit payroll',`payrollJournal1429.editPayroll('${record.id}')`):'')+
   action82('Export / Print',`printHistory95('${record.id}')`);
  const tables=groupedTables(display,false,key,'all',rows.length?rows:null);
  if(report)return group(key,title,summary,'<div class="history-actions95">'+actions+'</div>'+tables);
  return `<section class="pay-group95"><header class="salary-history-record"><div><strong>${esc(title)}</strong><div>${esc(summary)}</div></div><div class="actions82 no-print">${actions}</div></header><div class="pay-group-body95">${tables}</div></section>`;
 }).join('')||'<p class="empty82">No matching saved payroll.</p>';
 const filters=report?'<div hidden class="payroll-report-filters143153">'+monthControl+'</div>':'';
 const actions=salaryHistory?monthControl:`<input id="payHistorySearch95" class="je-input" type="search" aria-label="Search payroll history" placeholder="Search payroll history" value="${esc(ui.search)}"><button type="button" class="je-btn je-btn-secondary" data-payroll-filter143153 aria-haspopup="dialog">Filter</button>`+action82('Reload Records','loadWork82(true)');
 mount82(id,'Salary History',report?'Search references, employees, payroll codes, months, amounts and saved notes.':'',storageNotice82()+filters+historyMonth14341.summary([['Payroll records',monthRuns.length],['Adjusted total (LAK)',money(sum(finalRows,'adjusted'))]])+'<div id="historyRecords95">'+records+'</div>',actions);
 const panel=document.getElementById(id);
 historyMonth14341.bind(panel,id,()=>historyView(id),true);
 historyMonth14341.expand(panel.querySelector('#historyRecords95'));
 if(salaryHistory)return;
 panel.querySelector('[data-payroll-filter143153]').onclick=event=>{
  const input=panel.querySelector('[data-history-month14341]');
  const dialog=openReportDialog299(event.currentTarget,'Payroll report filters','<label>Month<input name="month" type="month" required></label>',()=>{
   if(input.isConnected&&input.value!==month.value){input.value=month.value;void input.onchange()}
  });
  const month=dialog.querySelector('[name=month]');month.value=input.value;

 };
 const input=panel.querySelector('#payHistorySearch95');
 input.oninput=()=>{const pos=input.selectionStart;ui.search=input.value;historyView(id);const next=panel.querySelector('#payHistorySearch95');next.focus();next.setSelectionRange(pos,pos);bindGroups()};
}
window.exportPayroll95=function(id=''){if(!id)updateRun82();const run=id?Work82.runs.find(r=>r.id===id)?.data:Work82.run;if(!run)return;try{const rows=results(run),quote=v=>'"'+(typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'":'')+String(v??'').replaceAll('"','""')+'"',headers=['Period','Payroll code','Employee','Currency','Contract','Gross LAK','Internal deductions LAK','Employee PIT LAK','Employer PIT LAK','Total PIT payable LAK','Employee SSO LAK','Employer SSO LAK','Reimbursement LAK','Advance LAK','Loan LAK','Final amount','LAK equivalent'];const csv=[headers,...rows.map(x=>[run.month,x.employee.code,x.employee.name,x.currency,x.contract,x.gross,x.late+x.absence+x.penalty+x.other,x.employeePit,x.employerPit,x.pitPayable309??x.pit??(x.employeePit+x.employerPit),x.employeeSso,x.employerSso,x.reimbursement,x.cashAdvance??x.advance,x.loanRecovery||0,x.paidAmount,x.adjusted])].map(row=>row.map(quote).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download='Payroll-'+run.month+'.csv';(window.exportCenter14337?exportCenter14337.fromLink(a):a.click());setTimeout(()=>URL.revokeObjectURL(a.href),1000)}catch(e){showCenterStatus(e.message,true)}};
function printBody(run){if(window.printPayrollBody99)return printPayrollBody99(run);return '<style>.pay-group95{margin:12px 0}.pay-group95 summary{list-style:none;border-top:3px solid #07855c;padding:8px;background:#edf6f0}.pay-group95 summary span+span{margin-left:12px}.attendance-table95{width:100%!important;table-layout:fixed;font-size:8px}.attendance-table95 th,.attendance-table95 td{padding:2px;text-align:center}.calculated95{color:#b91c1c}.legend-strip95 span{display:inline-block;margin:4px 8px}.pay-group95 table{font-size:8px}</style><p>'+esc(run.reference)+'</p><p data-report-notice270>'+esc(run.status)+'</p><p>Rate source: '+esc(run.rateSource||'LAK only')+' · '+esc(run.rateDate?formatAppDate(run.rateDate):'')+'</p>'+groupedTables(run,false,'print').replace(/<details([^>]*)>/g,'<details$1 open>')+section82('Attendance Record',attendanceGrid(run,true))}
window.printHistory95=function(id){const run=Work82.runs.find(r=>r.id===id)?.data;if(run)print82('Payroll Register',printBody(run),run.month)};
const printPayroll=printPayroll82;window.printPayroll82=function(vouchers=false){if(vouchers)return printPayroll(vouchers);updateRun82();if(Work82.run)print82('Payroll Register',printBody(Work82.run),Work82.run.month)};
