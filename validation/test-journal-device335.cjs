const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login}=await f.open();await login();await page.waitForFunction(()=>startup14257.interactive);
  const id='00000000-0000-4000-8000-000000000377',date='2026-11-04';
  const accounts=await page.evaluate(()=>AccountingStore.accounts.filter(a=>a.currency==='LAK').slice(0,2));
  assert.equal(accounts.length,2);
  const rows=accounts.map((a,i)=>({id:'OJM260378',dbEntryId:id,date,postingDate:date,created_at:date+'T01:00:00Z',generalMemo:'Fixture event',memo:'Fixture utility',debit:i?0:200000,credit:i?200000:0,currency:'LAK',accountId:a.id,account:a.name,accountCode:a.code,fx_rate_lak:1,book_rate_lak:null}));
  f.fixture.journal=rows;f.fixture.journalRevision='335-correction';
  let reads=0;
  const snapshot={next:9000,retained:['OJM260378'],available:[],reserved:['OJM260377'],issued:[{id,number:378,source:'manual'}],reviews:[{id,from:'OJM260378',to:'OJM260377',voucher:'OJM26-A1102'}]};
  await page.route('**/rpc/journal_number_records335',route=>{reads++;return route.fulfill({json:snapshot});});
  await page.evaluate(async()=>{
   switchTab('journal');ApplicationSettings.accounting.journalPrefix='OJM';ApplicationSettings.accounting.journalDigits=4;
   clearJournalEntry();document.getElementById('jeTransDate').value='2026-11-04';
   await loadJournalFromSupabase({cacheFirst:false});await entryNumber14257.refresh(true);
  });
  await page.waitForFunction(()=>document.getElementById('journalIdAction335'));
  const earlier=reads;
  await page.evaluate(async()=>{const d=document.getElementById('jeTransDate');d.value='2026-11-05';d.dispatchEvent(new Event('change',{bubbles:true}));await entryNumber14257.refresh();});
  assert.equal(reads,earlier,'changing the date or repainting makes no numbering request');
  assert.equal(await page.locator('#jeNextIdDisplay').textContent(),'OJM260379');
  await page.locator('#journalIdAction335').evaluate(n=>n.click());
  await page.waitForFunction(()=>JournalModule.editingEntryId==='OJM260378');
  assert.match(await page.locator('#jeNextIdDisplay').textContent(),/OJM260377.*A1102/);
  assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Fixture event');
  await page.evaluate(()=>submitJournalEntry());
  assert.equal(await page.locator('#txtEditReason').inputValue(),'Correct journal ID to OJM260377');
  await page.evaluate(()=>{closeModal('modalEditReason');clearJournalEntry();});
  await page.context().setOffline(true);
  const values=await page.evaluate(async({date,accounts})=>{
   const mk=(p,day=date)=>({p_transaction_date:day,p_memo:'Isolated offline journal',p_prefix:p,p_digits:4,p_lines:accounts.map((a,i)=>({account_id:a.id,currency_code:'LAK',debit:i?0:100,credit:i?100:0}))});
   const id=crypto.randomUUID();
   await journalDurable14385.create({p_request_key:id,p_entries:[mk('OJM'),mk('OJM','2026-11-05')]});
   journalDurable14385.project();
   const get=()=>journalDurable14385.pending().find(j=>j.id===id);
   const items=get().localNumbers335;
   return {items,projected:[...new Set(JournalModule.entries.filter(l=>l.journalJob14385===id).map(l=>l.id))],next:offlineAudit143174.provisional(date,'OJM',4)};
  },{date,accounts});
  assert.deepEqual(values,{items:['OJM260379','OJM260380'],projected:['OJM260379','OJM260380'],next:381});
  console.log('PASS correction through Post Entry, receipt display, prefilled reason, immediate offline numbering, batch and projection');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
