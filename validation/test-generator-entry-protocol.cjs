const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open();await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   switchTab('journal');showJournalEntry98();
   function add(code,name,currency,type){AccountingStore.accounts.push({id:code,code,name,currency,type,baseType:type,isTechnical:type==='SYSTEM',active:true,isPosting:true});}
   add('1041','Test USD bank','USD','ASSET');add('1220','Test staff USD','USD','ASSET');
   add('9311','Test support mapping','USD','SYSTEM');add('3023','Test remaining support','LAK','EQUITY');
   add('9390','Test equity mapping','LAK','SYSTEM');add('5414','Test fee','LAK','EXPENSE');
   add('1210','Test staff LAK','LAK','ASSET');
   document.querySelector('#jeLinesBody').replaceChildren();
   addJournalLineRow('1220 — Test staff USD','Bank advice', '75',{});
   document.querySelector('#jeGeneralMemo').value='Received financial support through staff with a bank fee';
   document.querySelector('#jeLinesBody tr').dataset.sourceIds14253='reference-test';
   JournalModule.entries=[{id:'TEST-REF',date:'2026-11-02',postingDate:'2026-11-02',currency:'USD',accountCode:'1041',account:'Test USD bank',generalMemo:'Prior support receipt',debit:10,credit:0,fx_rate_lak:21000}];
  });
  const notice=page.getByRole('button',{name:'Close notification'});
  while(await notice.isVisible())await notice.click();
  await page.click('#generateJournal258');
  const d=page.locator('#journalGenerator258');
  assert.match(await d.locator('[data-memo]').inputValue(),/financial support/);
  await d.locator('[data-template]').selectOption('gen268-support-deposit-fee-USD',{force:true});
  assert.equal(await d.locator('.generator-table258 tbody tr').count(),8);
  await d.locator('details summary').click();await d.locator('[data-history-query]').click();await d.locator('[data-history-query]').fill('TEST-REF');
  await d.locator('[data-history-list] button').click();assert.match(await d.locator('[data-history-entry]').innerText(),/21,000|21000/);
  await d.locator('details summary').click();
  await d.locator('[data-row="2"] .account-search1428').click();
  await d.locator('.account-list1428 [role=option]').filter({hasText:'Test USD bank'}).click();
  await d.locator('[data-row="3"] select').selectOption('1220',{force:true});
  await d.locator('[data-row="6"] [data-field=debit]').fill('2000');
  await d.locator('[data-row="7"] select').selectOption('1210',{force:true});
  await d.locator('[data-rates] input').fill('22000');
  await d.locator('[data-generate]').click();
  await page.waitForTimeout(180);
  assert.equal(await d.locator('[data-use]').isDisabled(),false,await d.locator('[data-status]').innerText());
  await d.locator('[data-use]').click();
  await d.waitFor({state:'detached',timeout:4000}).catch(async e=>{throw Error(await d.locator('[data-status]').innerText()+' '+e.message);});
  const rows=await page.evaluate(()=>snapshotJournal69().rows);
  assert.equal(rows.length,8);assert.equal(rows[0].sourceIds,'reference-test');assert.equal(rows[0].memo,'Bank advice');
  assert.equal(rows.filter(l=>l.account.includes('Test remaining support')).length,1);
  console.log('PASS Post Entry import, complete eight-line support template, saved reference comparison and copying once with source details preserved.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
