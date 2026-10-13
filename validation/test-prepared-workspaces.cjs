/* Trusted navigation against the real runtime and a local database fixture. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,context,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));f.fixture.tables.audit_log=[{id:'audit-fixture',record_id:'entry-fixture',action:'VOID',created_at:'2026-10-13T00:00:00Z',actor_id:f.fixture.profiles[0].id,old_data:{},new_data:{}}];await login();await page.waitForFunction(()=>offline14239.state().shellReady);await page.waitForTimeout(500);
 const stages=['legal','schedules','audit','submissions','review','home'];assert.deepEqual(await page.evaluate(names=>names.filter(n=>!startup14257.isPrepared(n)),stages),[]);
 const before=f.requests.length;
 for(const offline of [false,true]){await context.setOffline(offline);for(let pass=0;pass<2;pass++){
  await page.locator('#nav-module-transactions .nav-header').click();
  for(const id of ['transactions-recurring','transactions-voided','user-entry-review']){await page.locator(`button[data-target="${id}"]:visible`).click();await page.waitForFunction(id=>document.getElementById(id)?.classList.contains('active'),id)}
  await page.locator('#nav-module-sub-users .nav-header').click();
  await page.locator('#nav-module-settings .nav-header').click();

 }}
 await page.waitForTimeout(300);
 const reads=f.requests.slice(before).filter(r=>/\/rest\//.test(r));const starter=reads.filter(r=>/prepare_todo_starters14335|workspace_todos136/.test(r));assert.equal(starter.filter(r=>r.includes('prepare_todo_starters14335')).length,1,'retain one-time checklist initialization');assert.equal(starter.filter(r=>r.includes('workspace_todos136')).length,1,'reload only after creating the default checklists');assert.deepEqual(reads.filter(r=>!starter.includes(r)),[],'prepared navigation must not query Supabase');
 console.log('PASS prepared legal/schedules/audit/review/home: trusted navigation makes no redundant REST requests online/offline; one-time checklist setup retained');
 await context.setOffline(false);
 f.fixture.tables.legal_documents=[{id:'legal-new',name:'Fresh legal document',file_name:'Fresh legal document',uploaded_at:'2026-10-13'}];
 await page.evaluate(()=>idleSync14341.syncNow());
 assert.equal(await page.evaluate(()=>liveLegalDocuments.some(d=>d.id==='legal-new')),true,'manual sync refreshes prepared data while active');
 const count=f.requests.filter(r=>r.includes('/legal_documents')).length;
 await page.locator('#nav-module-settings .nav-header').click();
 assert.equal(f.requests.filter(r=>r.includes('/legal_documents')).length,count);
 assert.deepEqual(errors,[]);console.log('PASS explicit Sync refreshes prepared data; next navigation reuses it');
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>startup14257.prepared);assert.equal(await page.evaluate(()=>LiveTransactionAudit.some(r=>r.id==='audit-fixture')),true,'complete audit snapshot survives offline reload');console.log('PASS populated audit snapshot survives offline reload');
 await context.close();
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
