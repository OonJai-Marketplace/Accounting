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
   addJournalLineRow('1220 — Test staff USD','Bank advice', '1250',{});
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
  await d.locator('[data-row="6"] [data-field=debit]').fill('3500');
  await d.locator('[data-row="7"] select').selectOption('1210',{force:true});
  await d.locator('[data-rates] input').fill('23000');
  await d.locator('[data-generate]').click();
  await page.waitForTimeout(180);
  assert.equal(await d.locator('[data-use]').isDisabled(),false,await d.locator('[data-status]').innerText());
  await d.locator('[data-use]').click();
  await d.waitFor({state:'detached',timeout:3500}).catch(async e=>{throw Error(await d.locator('[data-status]').innerText()+' '+e.message);});
  const rows=await page.evaluate(()=>snapshotJournal69().rows);
  assert.equal(rows.length,8);assert.equal(rows[0].sourceIds,'reference-test');assert.equal(rows[0].memo,'Bank advice');
  assert.equal(rows.filter(l=>l.account.includes('Test remaining support')).length,1);
  assert.equal(Number(rows.find(l=>l.account.startsWith('9390')).dr.replaceAll(',','')),28750000);
  // Bring the receipt back through Post Entry with the historical account rates
  // that reproduce the extra settlement lines. Older saved entries have no average-rate flag.
  await page.evaluate(()=>{
   const body=document.querySelector('#jeLinesBody');
   body.rows[1].dataset.bookRate14383=String(28700123.45/1250);
   body.rows[2].dataset.bookRate14383=String((28750000-24567.89)/1250);
  });
  await page.click('#generateJournal258');
  await d.locator('[data-generate]').click();
  await page.waitForFunction(()=>!document.querySelector('#journalGenerator258 [data-use]').disabled);
  assert.equal(await d.locator('[data-entry-lines] tr').count(),8);
  await d.locator('[data-use]').click();await d.waitFor({state:'detached'});
  const corrected=await page.evaluate(()=>snapshotJournal69().rows);
  assert.equal(corrected.length,8);
  for(const l of corrected.slice(0,4))assert.equal(Number(l.bookRate),23000);
  assert.equal(Number(corrected.find(l=>l.account.startsWith('9390')).dr.replaceAll(',','')),28750000);
  for(const code of ['5419','9010','9011'])assert(!corrected.some(l=>l.account.startsWith(code)));
  await page.evaluate(()=>{
   for(const [code,name,type] of [['1511','Test accumulated depreciation','ASSET'],['5417','Test depreciation','EXPENSE'],['1040','Test LAK bank','ASSET']]){
    AccountingStore.accounts.push({id:code,code,name,currency:'LAK',baseType:type,type,active:true,isPosting:true});
   }
   const body=document.querySelector('#jeLinesBody');body.replaceChildren();
   addJournalLineRow('5417 — Test depreciation','Monthly depreciation','100',{});
   addJournalLineRow('1040 — Test LAK bank','Paying fund','',{LAK:'100'});
   for(const row of body.rows)row.dataset.generatorTemplate='gen268-local-5417';
   Object.assign(body.rows[1].dataset,{templateSide274:'credit',generatorRole:'fund',generatorCurrency:'LAK'});
   document.querySelector('#jeGeneralMemo').value='Monthly equipment depreciation';
  });
  await page.click('#generateJournal258');
  assert(await d.locator('[data-repair-layout]').isVisible());
  await d.locator('[data-generate]').click();
  assert(await d.locator('[data-use]').isDisabled());
  await d.locator('[data-repair-layout]').click();
  assert.equal(await d.locator('[data-row="1"] select').inputValue(),'1511');
  await d.locator('[data-row="0"] [data-field=debit]').fill('100');
  await d.locator('[data-generate]').click();
  assert.equal(await d.locator('[data-use]').isDisabled(),false,await d.locator('[data-status]').innerText());
  console.log('PASS corrected depreciation layout and Post Entry import, complete eight-line support template, saved reference comparison and copying once with source details preserved.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
