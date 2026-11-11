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
  const snapshot={next:9000,retained:['OJM260378','AMO26-009999','REC26-009999'],available:[],reserved:['OJM260377'],issued:[{id,number:378,source:'manual'}],reviews:[{id,from:'OJM260378',to:'OJM260377',voucher:'OJM26-A1102'}]};
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
  await page.waitForFunction(()=>offline14239.state().shellReady);
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
  const labels=()=>page.locator('#tblJournalHistoryBody .entry-id-stack > span').evaluateAll(nodes=>nodes.map(n=>[n.firstChild.textContent,n.querySelector('small')?.textContent||'']));
  const pending='Saved on device · pending sync';
  await page.evaluate(()=>refreshAllTables());
  assert.ok((await labels()).some(([id,note])=>id==='OJM260379'&&note===pending));
  assert.ok((await labels()).some(([id,note])=>id==='OJM260380'&&note===pending));
  const syncLabels=await page.evaluate(()=>syncRecords284.pending().filter(j=>j.kind==='journal').flatMap(j=>j.items));
  assert.ok(syncLabels.some(i=>i.label.includes('OJM260379')&&!i.officialId));

  // Use the actual post handler and retain its request across an offline restart.
  await page.evaluate(async ({accounts,date})=>{
   clearJournalEntry();entry1430.restore('double',[]);document.getElementById('jeTransDate').value=date;
   document.getElementById('jeGeneralMemo').value='Offline office supplies';
   document.getElementById('jeLinesBody').replaceChildren();
   addJournalLineRow(accounts[0].code+' — '+accounts[0].name,'Supplies',100,{});
   addJournalLineRow(accounts[1].code+' — '+accounts[1].name,'Payment','',{LAK:100});
   await submitJournalEntry();
  },{accounts,date});
  assert.ok((await labels()).some(([id,note])=>id==='OJM260381'&&note===pending));
  const legacyId=await page.evaluate(async()=>{
   const past=structuredClone(journalDurable14385.pending()[0]);
   past.id=past.payload.p_request_key=crypto.randomUUID();delete past.localNumbers335;
   await localFirst14333.edit(liveProfile.id,'journal-outbox14385',list=>[...list,past]);
   return past.id;
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof liveProfile!=='undefined'&&liveProfile&&window.startup14257?.interactive);
  await page.evaluate(async()=>{await journalDurable14385.initialize();switchTab('journal');refreshAllTables();});
  const expected=['OJM260379','OJM260380','OJM260381','OJM260382','OJM260383'];
  const restarted=await labels();
  assert.deepEqual(restarted.filter(([,note])=>note===pending).map(([id])=>id).sort(),expected);
  assert.deepEqual(await page.evaluate(id=>journalDurable14385.pending().find(j=>j.id===id).localNumbers335,legacyId),expected.slice(-2));
  console.log('PASS visible IDs in Active Journal, real offline save, offline reopen and older pending batch');
  const sent=new Map();
  await page.route('**/rpc/post_device_journal335',route=>{
   const {p_request_key:key,p_numbers:numbers}=route.request().postDataJSON();
   sent.set(key,numbers);
   if(key===legacyId)return route.fulfill({status:409,json:{code:'P0335',message:'Device ID already taken. Review this entry.'}});
   return route.fulfill({json:numbers.map(number=>({entry_no:number,entry_id:'00000000-0000-4000-8000-'+number.slice(-4).padStart(12,'0')}))});
  });
  await page.context().setOffline(false);
  // An offline-unlocked workspace must restore its signed-in session before sending.
  await page.waitForFunction(()=>navigator.onLine);
  await page.waitForFunction(id=>journalDurable14385.pending().some(j=>j.id===id&&j.numberConflict335),legacyId);
  assert.deepEqual([...sent.values()].flat().sort(),expected);
  assert.ok((await labels()).some(([id,note])=>id==='OJM260379'&&!note));
  assert.ok((await labels()).some(([id,note])=>id==='OJM260382'&&note.includes('ID conflict')));
  const collision=await page.evaluate(async id=>{
   const number='OJM260382',remote=JournalModule.entries.filter(l=>l.id==='OJM260378');
   JournalModule.entries.push(...remote.map(l=>({...l,id:number,dbEntryId:'00000000-0000-4000-8000-000000000999'})));
   refreshAllTables();
   const local=JournalModule.entries.find(l=>l.journalJob14385===id&&l.entryNumber===number);
   await loadEntryForEdit(local.id);entryNumber14257.paint();
   const result={key:local.id,shown:document.getElementById('jeNextIdDisplay').textContent};
   clearJournalEntry();return result;
  },legacyId);
  assert.match(collision.key,/^Device-/);assert.equal(collision.shown,'Editing: OJM260382');
  const manual=await page.evaluate(async()=>{
   const sample=journalDurable14385.pending()[0].payload.p_entries[0];
   const id=crypto.randomUUID();await journalDurable14385.create({...sample,p_request_key:id});
   const number=journalDurable14385.pending().find(j=>j.id===id).localNumbers335[0];
   await syncRecords284.retry(id);
   return {id,number,receipt:journalDurable14385.pending().find(j=>j.id===id)?.receipt?.[0]?.entry_no};
  });
  assert.deepEqual(sent.get(manual.id),['OJM260384']);assert.equal(manual.number,manual.receipt);
  console.log('PASS reconnect retries original IDs, confirmed entries drop pending status, conflict keeps its ID');
  console.log('PASS correction through Post Entry, receipt display, prefilled reason, immediate offline numbering, batch and projection');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
