const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await login();
  const report=await page.evaluate(async()=>{
   const panels=['journal','period-review','transactions-all','dashboard','payroll-overview','payroll-employees','hr-leave','report-gl','report-pl','transactions-budget14313'];
   const prepared=workspaceViews14364.state().prepared;
   const rows=id=>document.querySelector('#'+id+' tbody tr')||document.getElementById(id).firstElementChild;
   const reused=[];
   for(const id of panels){
    switchTab(id);await new Promise(r=>setTimeout(r,80));
    const first=rows(id);
    switchTab('settings-business');switchTab(id);
    if(first&&first===rows(id))reused.push(id);
   }
   let full=0;const before=startup14257.revalidate;
   startup14257.revalidate=(...args)=>{full++;return before(...args)};
   window.dispatchEvent(new Event('online'));
   window.dispatchEvent(new Event('session-online14333'));
   await new Promise(r=>setTimeout(r,80));
   switchTab('transactions-closing14325');
   return {panels,prepared,reused,full,dataCheck:!!document.querySelector('.tab-content.active [data-sync-groups]')};
  });
  for(const id of report.panels)assert(report.prepared.includes(id),'login preparation: '+id);
  assert.deepEqual(report.reused,report.panels);assert.equal(report.full,0);assert(report.dataCheck);assert.deepEqual(errors,[]);
  console.log('PASS authenticated screen preparation, row reuse across ten workspaces, reconnect without full sync and group controls in Data Check');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
