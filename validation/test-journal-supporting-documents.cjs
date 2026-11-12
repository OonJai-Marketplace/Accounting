const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login,context}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>switchTab('journal'));
  const input=page.getByLabel('Supporting document',{exact:true}),preview=page.locator('#journalSlipPreview');
  const prefix=await page.evaluate(()=>'S'+MonthlyCashSlip277.currentMonth().slice(2).replace('-','')+'-');
  for(const row of [1,2,3,41,100]){
   await input.fill('s'+row);const id=prefix+String(row).padStart(2,'0');
   assert.equal(await preview.textContent(),id);await input.press('Tab');assert.equal(await input.inputValue(),id);
  }
  await input.fill('s2610-09');await input.press('Enter');assert.equal(await input.inputValue(),'S2610-09');
  await input.fill('S0');assert.equal(await input.evaluate(e=>e.validity.valid),false);
  await page.evaluate(()=>{vouchers14299.setDocument();const id='00000000-0000-4000-8000-000000000032',entry='00000000-0000-4000-8000-000000000036';Object.assign(vouchers14299.state,{actor:liveProfile.id,client:ojmDb,ready:true,rows:[{id,number:'OJM26-A1102',status:'issued',data:{documentType:'receipt',html:'<h2>PAYMENT RECEIPT</h2><p>Sample supporting receipt</p>'},kind:'E',version:1}]});vouchers14299.picker();window.testRow={id:'OJM260377',dbEntryId:entry,date:'2026-11-03',postingDate:'2026-11-03',generalMemo:'Bank transfer',memo:'Payment',currency:'LAK',account:'Cash',debit:100,credit:0};});
  await input.fill('OJM26-A1102');await input.press('Tab');assert.equal(await page.locator('#jeVoucher14299').inputValue(),'00000000-0000-4000-8000-000000000032');
  await page.evaluate(()=>{JournalModule.entries=[testRow];refreshAllTables();vouchers14299.acceptLinked({...vouchers14299.state.rows[0],journal_entry_id:testRow.dbEntryId,status:'linked',version:2});});
  const header=page.locator('#tblJournalHistoryBody .general-description14281').filter({hasText:'Bank transfer'});const link=header.getByRole('button',{name:'Receipt OJM26-A1102'});await link.waitFor();await link.click();
  assert.match(await page.frameLocator('dialog.journal-document-preview iframe').locator('body').innerText(),/Sample supporting receipt/);await page.getByRole('dialog',{name:'Receipt OJM26-A1102'}).getByRole('button',{name:'Close'}).click();
  await context.setOffline(true);
  await page.evaluate(()=>{clearJournalEntry();switchTab('journal');entry1430.restore('double',[]);AccountingStore.accounts=[{id:'00000000-0000-4000-8000-000000000103',code:'103',name:'Test cash',currency:'LAK',type:'ASSET',isPosting:true},{id:'00000000-0000-4000-8000-000000000104',code:'104',name:'Test expense',currency:'LAK',type:'EXPENSE',isPosting:true}];document.querySelector('#jeTransDate').value='2026-11-12';document.querySelector('#jeGeneralMemo').value='Paper slip test';document.querySelector('#jeLinesBody').replaceChildren();addJournalLineRow('103 — Test cash','Paper',100,{});addJournalLineRow('104 — Test expense','Offset','',{LAK:100});});
  await input.fill('S2');await page.evaluate(()=>submitJournalEntry());
  const job=await page.evaluate(()=>journalDurable14385.pending().find(j=>j.entries[0]?.memo==='Paper slip test'));
  assert.equal(job?.entries[0]?.cashSlipRef,prefix+'02',JSON.stringify(await page.evaluate(()=>({draft:journalDurable14385.findings(),text:document.body.innerText.slice(-600)}))));assert.equal(job.payload.p_cash_slip_ref,prefix+'02');assert.equal(await input.inputValue(),'');
  const slip=page.locator('#tblJournalHistoryBody .general-description14281').filter({hasText:'Paper slip test'}).getByRole('button',{name:'Monthly slip '+prefix+'02'});await slip.click();await page.getByText('Printed row 2',{exact:false}).waitFor();await page.locator('.ui-overlay108 footer').getByRole('button',{name:'Close'}).click();
  const editing=await page.evaluate(()=>JournalModule.entries.find(row=>row.cashSlipRef)?.id);await page.evaluate(id=>loadEntryForEdit(id),editing);assert.equal(await input.inputValue(),prefix+'02');
  assert.deepEqual(errors,[]);console.log('PASS slip shortcuts, linked receipt preview in general description, offline posting and edit restore');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
