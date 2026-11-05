const assert=require('node:assert/strict'),fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open();page.setDefaultTimeout(55000);await login();
  await page.route('**/rest/v1/rpc/account_exchange_rates143186',r=>r.fulfill({json:{as_of:r.request().postDataJSON().p_as_of,accounts:[{account_id:'fx294',average_rate:22229.2109265,rate_status:'available'}]}}));
  await page.evaluate(()=>{
   switchTab('journal');clearJournalEntry();entry1430.restore('double',[]);
   AccountingStore.accounts=[{id:'fx294',name:'BCEL USD',code:'1041',currency:'USD',type:'ASSET',isPosting:true},{id:'kip294',name:'Cash LAK',code:'1010',currency:'LAK',isPosting:true,type:'ASSET'}];
   document.querySelector('#jeLinesBody').replaceChildren();
   addJournalLineRow('1041 — BCEL USD','Bank',2,{});addJournalLineRow('1041 — BCEL USD','Offset','',{USD:2});addJournalLineRow('1010 — Cash LAK','',1,{});
   AccountRates143186.refresh();
  });
  const rows=page.locator('#jeLinesBody tr'),fx=i=>rows.nth(i).getByRole('textbox',{name:'Exchange rate',exact:true});
  await page.waitForFunction(()=>document.querySelector('#jeLinesBody [aria-label="Book rate"]')?.value==='22,229.21');
  assert.ok(await page.locator('#journalRates14383').isHidden());assert.equal(await fx(0).inputValue(),'');
  await rows.nth(0).getByRole('button',{name:'Use book'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#jeLinesBody [aria-label="Exchange rate"]')[1].value==='22,229.21');
  let stored=await page.evaluate(()=>[...document.querySelectorAll('#jeLinesBody tr')].slice(0,2).map(r=>JournalFX14383.lineRate(r,'USD')));
  assert.deepEqual(stored,[22229.2109265,22229.2109265]);
  await fx(0).fill('22287');await fx(0).press('Tab');
  await page.waitForFunction(()=>document.querySelectorAll('#jeLinesBody [aria-label="Exchange rate"]')[1].value==='22,287');
  assert.equal(await rows.nth(0).getByRole('textbox',{name:'Book rate',exact:true}).inputValue(),'22,229.21');
  await fx(1).fill('22300');await fx(1).press('Tab');assert.equal(await fx(0).inputValue(),'22,287');
  assert.equal(await rows.nth(2).getByRole('textbox',{name:'Book rate',exact:true}).count(),0);
  await page.evaluate(()=>{document.querySelector('#jeLinesBody').replaceChildren();addJournalLineRow('1010 — Cash LAK','Local',1,{});AccountRates143186.refresh();});
  await page.waitForFunction(()=>!document.querySelector('#journalEntry98').classList.contains('foreign-lines291'));
  console.log('PASS inline account average, full-precision adoption, same-entry propagation, independent row overrides, LAK-only layout and hidden header');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
