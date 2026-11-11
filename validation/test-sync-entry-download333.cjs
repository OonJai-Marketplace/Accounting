const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   switchTab('accounting-maintenance14324');
   const host=document.querySelector('#maintenanceSync14332');
   if(!host.closest('.tab-content.active'))switchTab(host.closest('.tab-content').id);
   const original=window.offline14239.state;
   window.offline14239.state=()=>({...original(),jobs:[{status:'pending',payload:{p_key:'pending-db-id',p_owner:liveProfile.id,p_items:[{date:'2026-10-01',amount:4500}]}}],legacy:[]});
   document.getElementById('maintenanceMonth14324').value='2026-10';window.syncAssessment14332.render();
  });
  const row=page.locator('[data-sync-finding14351="pending-db-id"]');
  const button=row.getByRole('button',{name:'Download entry details'});
  const waiting=page.waitForEvent('download',{timeout:10000});await button.evaluate(b=>b.click());
  const file=await waiting;
  assert.equal(file.suggestedFilename(),'sync-review-pending-db-id.json');
  const record=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  assert.equal(record.status,'pending');assert.equal(record.entry.p_key,'pending-db-id');assert.equal(record.entry.p_items[0].amount,4500);
  assert.equal(await page.locator('#reportSignatories275').count(),0);
  assert.equal(await page.evaluate(()=>syncAssessment14332.findings().find(r=>r.id==='pending-db-id').status),'pending');
  console.log('PASS pending entry JSON download, original request, no signatories or status change');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
