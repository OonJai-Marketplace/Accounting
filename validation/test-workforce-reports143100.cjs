/* Current real-SDK fixture; all financial records below are synthetic and in memory. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();await page.waitForFunction(()=>!idleSync14341.running);
 const payroll=await page.evaluate(()=>{
  const config={workDays:20,hours:8,grace:0,overtime:1.5,employeeSso:5,employerSso:6,ssoCap:null,sharing:'equal',brackets:[{from:0,to:null,rate:10}]};
  const employee={name:'Audit employee',currency:'USD',salary:1000,sso:true,pit:true};
  const input={absentDays:1,attendance:[{date:'2026-10-01',overtime:2}],advance:100000,reimbursement:50000};
  const result=calcPay82(employee,input,config,20000);
  const rejected=[];for(const [label,run]of [['zero rate',()=>calcPay82(employee,input,config,0)],['negative salary',()=>calcPay82({...employee,salary:-1},input,config,20000)],['duplicate date',()=>calcPay82(employee,{attendance:[{date:'2026-10-01'},{date:'2026-10-01'}]},config,20000)]]){try{run()}catch{rejected.push(label)}}
  const finalized={status:'finalized',results:[{employeeId:'audit',employee,net:123,adjusted:120,currency:'USD'}]},before=JSON.stringify(finalized);
  const saved=runResults82(finalized);return{result,rejected,saved: saved[0].net,unchanged:JSON.stringify(finalized)===before};
 });
 assert.equal(payroll.result.gross,19375000);assert.equal(payroll.result.employeeSso,968750);assert.equal(payroll.result.pit,1840625);assert.equal(payroll.result.adjusted,17435937.5);assert.equal(payroll.result.paidAmount,871.8);assert.equal(payroll.rejected.length,3);assert.equal(payroll.saved,123);assert(payroll.unchanged);
 console.log('PASS payroll FX, overtime, absence, statutory-input calculations, invalid inputs and finalized snapshots');
 const leave=await page.evaluate(()=>{
  Work82.employees=[{id:'audit-employee',data:{name:'Audit employee',active:true}}];
  Object.assign(hrCalendar14306.state,{ready:true,owner:liveProfile.id,settings:{data:HRCalendarModel14306.scheduleDefaults({nonWorkDays99:[0,6]})},rows:[{id:'audit-holiday',data:{title:'Audit holiday',type:'holiday',start:'2026-10-15',end:'2026-10-15',effect:'off',status:'scheduled'}}]});
  const record={data:{employeeId:'audit-employee',status:'pending',from:'2026-10-12',to:'2026-10-16',days:5,paid:'yes'}};
  const approved=hrWorkspace14306.leaveApprovalData(record);Work82.employees[0].data.active=false;let blocked=false;try{hrWorkspace14306.leaveApprovalData(record)}catch{blocked=true}
  return{days:approved.days,original:approved.requestedDays14307,recordDays:record.data.days,blocked};
 });
 assert.deepEqual(leave,{days:4,original:5,recordDays:5,blocked:true});console.log('PASS leave approval recalculates working days, retains original request and rejects inactive staff');
 const journal=await page.evaluate(()=>{
  const cash=AccountingStore.accounts.find(a=>a.type==='ASSET'),expense=AccountingStore.accounts.find(a=>a.type==='EXPENSE');
  JournalModule.entries=[];for(let i=0;i<55;i++)JournalModule.entries.push({id:'AUDIT-2026-'+String(i).padStart(4,'0'),date:'2026-09-15',accountId:expense.id,account:expense.name,currency:'LAK',debit:123456789123.45,credit:0,memo:'Supporting details for the accounting report',status:'posted'},{id:'AUDIT-2026-'+String(i).padStart(4,'0'),date:'2026-09-15',accountId:cash.id,account:cash.name,currency:'LAK',debit:0,credit:123456789123.45,memo:'Bank payment',status:'posted'});
  Object.assign(Reports79,{from:'2026-09-01',to:'2026-09-30',month:'2026-09',kind:'pl',cash:[cash.id+'|LAK'],selectedMonths14331:[],allMonths14331:false});
  const modal=ui108.modal;ui108.modal=function(title,...args){return title==='Open in Document Editor'?Promise.resolve('new'):modal.call(this,title,...args)};
  return structuredClone(JournalModule.entries);
 });
 // Background refresh must read the same posted fixture as the report model.
 f.fixture.journal=journal;f.fixture.journalRevision='workforce-reports143100';
 for(const kind of ['pl','bs','cf','tb','gl','activity','expense']){
  await page.evaluate(async kind=>{await openDocumentEditor105({title:reportNames79[kind],html:reportFormats14282.financial(kind),printPreview:true,approvedLayout14254:true,settings:reports14254.settings()})},kind);
  const frame=page.frames().find(f=>f.url()==='about:srcdoc');assert(frame,kind+' preview');
  await frame.waitForSelector('.page');
  const report=await frame.evaluate(()=>({pages:document.querySelectorAll('.page').length,overflow:[...document.querySelectorAll('.page-content')].some(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2),text:document.body.textContent,headers:[...document.querySelectorAll('table')].every(t=>!!t.tHead)}));
  assert(!report.overflow,kind+' overflow');assert(report.headers,kind+' headers');if(['gl','activity'].includes(kind)){assert(report.pages>1);assert(report.text.includes('AUDIT-2026-0054'));assert(report.text.includes('123,456,789,123.45'))}
  console.log('PASS '+kind+' report A4 pages, repeated headings and complete values');
 }
 assert.deepEqual(errors,[]);assert.equal(f.fixture.deviceWrites||0,0);console.log('PASS workforce/report checks without uncaught errors or backend writes');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
