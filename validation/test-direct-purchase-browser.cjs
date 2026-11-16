const assert=require('node:assert/strict');
const setup=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await setup();
 try{
  const {page,login}=await fixture.open();
  await login();
  await page.waitForFunction(()=>startup14257.interactive);
  await page.route('**/rpc/account_exchange_rates143186',route=>route.fulfill({json:{
   as_of:route.request().postDataJSON().p_as_of,
   accounts:[{account_id:'1041',foreign_balance:100,lak_carrying_value:2200000,average_rate:22000,rate_status:'available'}]
  }}));
  await page.evaluate(()=>{
   switchTab('journal');showJournalEntry98();clearJournalEntry();
   const accounts=[['1041','BCEL USD','USD','ASSET'],['5121','Kitchen Supplies USD','USD','EXPENSE'],['5111','Kitchen Supplies','LAK','EXPENSE']];
   AccountingStore.accounts=AccountingStore.accounts.filter(a=>!accounts.some(([code])=>a.code===code));
   for(const [code,name,currency,baseType] of accounts)AccountingStore.accounts.push({id:code,code,name,currency,baseType,type:baseType,active:true,isPosting:true});
   document.querySelector('#jeTransDate').value='2026-11-08';
   JournalModule.entries=[{id:'fixture-opening',accountId:'1041',date:'2026-11-07',currency:'USD',
    debit:100,credit:0,base_debit:2200000,base_credit:0}];
  });
  await page.locator('#generateJournal258').evaluate(b=>b.click());
  const dialog=page.locator('#journalGenerator258');
  await dialog.locator('[data-template-query]').fill('kitchen');
  await dialog.locator('[data-template-options] button').filter({hasText:'Buy kitchen supplies · USD'}).click();
  await dialog.locator('[data-memo]').fill('Kitchen supplies purchased in USD');
  await dialog.locator('[data-row="1"] select').selectOption('1041');
  await dialog.locator('[data-rates] input').fill('22000');
  await dialog.locator('[data-row="0"] [data-field=debit]').fill('10');
  await dialog.locator('[data-row="1"] [data-field=credit]').fill('10');
  await dialog.locator('[data-generate]').click();
  await page.waitForFunction(()=>!document.querySelector('#journalGenerator258 [data-use]').disabled,null,{timeout:8000})
   .catch(async()=>{throw Error(await dialog.locator('[data-status]').innerText());});
  assert.deepEqual(await dialog.locator('[data-row] select').evaluateAll(items=>items.map(n=>n.value)),['5121','1041']);
  await dialog.locator('[data-use]').click();
  await dialog.waitFor({state:'detached',timeout:4000})
   .catch(async()=>{throw Error(await dialog.locator('[data-status]').innerText());});
  const form=page.locator('#jeLinesBody tr');
  assert.equal(await form.count(),2);
  assert.equal(Number(await form.nth(0).locator('.je-line-dr').inputValue()),10);
  assert.equal(Number(await form.nth(1).locator('.je-line-cr').inputValue()),10);
  await page.evaluate(()=>{
   clearJournalEntry();
   const accounts=[['1220','USD','ASSET'],['3026','USD','EQUITY'],['9311','USD','SYSTEM'],['9321','USD','SYSTEM'],
    ['9390','LAK','SYSTEM'],['3023','LAK','EQUITY'],['3024','LAK','EQUITY']];
   AccountingStore.accounts=AccountingStore.accounts.filter(a=>!accounts.some(([code])=>a.code===code));
   for(const [code,currency,type] of accounts)AccountingStore.accounts.push({id:code,code,name:'Fixture '+code,currency,type,baseType:type,isTechnical:type==='SYSTEM',active:true,isPosting:true});
  });
  await page.locator('#generateJournal258').click();
  await dialog.locator('[data-template-query]').fill('allocate earlier support');
  await dialog.locator('[data-template-options] button').filter({hasText:'allocate earlier support'}).click();
  await dialog.locator('[data-memo]').fill('New funds through staff and an earlier allocation');
  const field=(row,k)=>dialog.locator('[data-row="'+row+'"] [data-field="'+k+'"]');
  for(const [row,account] of [[0,'1220'],[2,'1041'],[3,'1220']])await dialog.locator('[data-row="'+row+'"] select').selectOption(account);
  await dialog.locator('[data-rates] input').fill('22000');
  await field(0,'debit').fill('50');
  await field(4,'debit').fill('70');
  for(const row of [4,5])await field(row,'book_rate_lak').fill('21000');
  await dialog.locator('[data-generate]').click();
  await page.waitForFunction(()=>!document.querySelector('#journalGenerator258 [data-use]').disabled,null,{timeout:8000})
   .catch(async()=>{throw Error(await dialog.locator('[data-status]').innerText());});
  assert.deepEqual(await dialog.locator('[data-row] select').evaluateAll(items=>items.map(n=>n.value)),['1220','3026','1041','1220','9311','9321','3023','3024']);
  await dialog.locator('[data-use]').click();
  await dialog.waitFor({state:'detached',timeout:4000})
   .catch(async()=>{throw Error(await dialog.locator('[data-status]').innerText());});
  assert.equal(await form.count(),8);
  assert.equal(await form.nth(1).getAttribute('data-fx-rate14383'),'22000');
  assert.equal(await form.nth(4).getAttribute('data-book-rate14383'),'21000');
  console.log('PASS new receipt and prior-rate owner allocation through Generate Journal and Post Entry preview.');
  console.log('PASS direct USD expense and bank payment through Generate Journal and Post Entry preview.');
 }finally{await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
