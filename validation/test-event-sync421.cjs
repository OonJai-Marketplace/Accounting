const assert = require('node:assert/strict');
const create = require('./phase0-browser-fixture.cjs');
(async () => {
 const f = await create();
 try {
  const {page, login} = await f.open();
  await login();
  await page.waitForFunction(() => startup14257.interactive);
  await page.evaluate(() => switchTab('journal'));
  await page.evaluate(() => startup14257.checkBooks());
  const receipts = new Map(), calls = [];
  let release, abandon = false;
  const held = new Promise(done => { release = done; });
  const submit = memo => page.evaluate(async memo => {
   const accounts = AccountingStore.accounts.filter(a => a.currency === 'LAK').slice(0, 2);
   clearJournalEntry();entry1430.restore('double', []);
   document.getElementById('jeTransDate').value = appLocalDate();
   document.getElementById('jeGeneralMemo').value = memo;
   document.getElementById('jeLinesBody').replaceChildren();
   addJournalLineRow(accounts[0].code+' — '+accounts[0].name, 'Office receipt', 100, {});
   addJournalLineRow(accounts[1].code+' — '+accounts[1].name, 'Cash', '', {LAK:100});
   await submitJournalEntry();
  }, memo);
  await page.route(/\/rpc\/post_(?:device_journal335|.*journal.*14228)$/, async route => {
   const p=route.request().postDataJSON(), key=p.p_request_key, entry=(p.p_entries||[p])[0];
   calls.push(key);
   if(!receipts.has(key)){
    const receipt={entry_id:crypto.randomUUID(),entry_no:p.p_numbers?.[0]||'TEST-'+receipts.size};
    receipts.set(key,receipt);
    f.fixture.journal ||= [];
    f.fixture.journal.push(...entry.p_lines.map(line=>({id:receipt.entry_no,dbEntryId:receipt.entry_id,date:entry.p_transaction_date,postingDate:entry.p_transaction_date,accountId:line.account_id,currency:'LAK',account:'Fixture account',debit:line.debit,credit:line.credit,memo:line.description,generalMemo:entry.p_memo,fx_rate_lak:1})));
    f.fixture.journalRevision='receipt-'+receipts.size;
   }
   if(calls.length===1)await held;
   if(abandon){abandon=false;return route.abort('failed');}
   return route.fulfill({json:[receipts.get(key)]});
  });
  const before=f.requests.length;
  await submit('Slow reply');
  await page.waitForFunction(()=>[...document.querySelectorAll('#tblJournalHistoryBody .journal-sync-note')].some(n=>n.textContent==='Syncing…'));
  assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'');
  await submit('Second entry while waiting');
  await page.getByRole('textbox',{name:'General description',exact:true}).fill('Next unsaved description');
  assert.equal(calls.length,1);
  release();
  await page.waitForFunction(()=>journalDurable14385.pending().filter(j=>j.status==='saved').length===2);
  assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Next unsaved description');
  await page.waitForFunction(()=>!document.querySelector('#tblJournalHistoryBody .journal-sync-note'));
  assert.equal(f.requests.slice(before).filter(r=>r.includes('/rpc/journal_window14333')).length,0);
  console.log('PASS two posts release the editor before acknowledgment; both labels clear and neither post reloads journal history');
  abandon=true;await submit('Lost reply');
  await page.waitForFunction(()=>journalDurable14385.pending().some(j=>j.status==='uncertain'));
  const original=calls.at(-1);
  await page.reload();
  await page.waitForFunction(()=>window.startup14257?.interactive);
  await page.waitForFunction(()=>JournalModule.entries.some(l=>l.generalMemo==='Lost reply'&&!l.pendingSync));
  assert.equal(calls.filter(k=>k===original).length,2);
  assert.equal(receipts.size,3);
  await page.evaluate(()=>startup14257.checkBooks());
  assert.equal(await page.evaluate(()=>reportWindow143195.cachedLedger().filter(l=>l.generalMemo==='Lost reply').length),2);
  console.log('PASS reopening retries the same request after a lost reply and the confirmed transaction reaches the report');
  f.fixture.journalRevision='other-user';
  f.fixture.journal.push({...f.fixture.journal[0],id:'OTHER',dbEntryId:crypto.randomUUID(),generalMemo:'Other user journal'});
  await page.evaluate(()=>startup14257.checkBooks());
  assert(await page.evaluate(()=>JournalModule.entries.some(l=>l.generalMemo==='Other user journal')));
  assert(await page.evaluate(()=>reportWindow143195.cachedLedger().some(l=>l.generalMemo==='Other user journal')));
  console.log('PASS changed server revision reaches both Active Journal and financial reports');
 } finally {await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
