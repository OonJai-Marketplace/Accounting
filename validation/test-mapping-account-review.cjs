const assert=require('node:assert/strict');
const setup=require('./phase0-browser-fixture.cjs');

(async()=>{
 const f=await setup();
 try{
  const {page,login}=await f.open();
  let calls=0,fail=false;
  const rows=[
   {code:'9211',name:'Kitchen Supplies — USD Mapping',currency:'USD',active:true,recommendation:'Retirement candidate',replacement:'5121',posting_count:0,balance:0,reasons:[],journals:[]},
   {code:'9290',name:'Expense Mapping',currency:'LAK',active:true,recommendation:'Keep posted history',replacement:null,posting_count:1,balance:-1234.56,reasons:['Recorded plan history'],journals:['TEST001']},
   {code:'9351',name:'Inactive account',currency:'USD',active:false,recommendation:'Already inactive',replacement:null,posting_count:0,balance:0,reasons:[],journals:[]}
  ];
  await page.route('**/rpc/review_mapping_accounts',route=>{
   calls++;
   return route.fulfill({status:fail?403:200,contentType:'application/json',body:JSON.stringify(fail?{message:'Account review access denied'}:rows)});
  });
  await login();
  await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{switchTab('accounts-modular-container');scrollToAccountModule('sec-chart-accounts');});
  const open=page.locator('#mappingReviewOpen'),dialog=page.locator('#mappingReview');
  await open.waitFor({state:'visible'});
  assert.equal(calls,0);
  await open.click();
  await dialog.locator('tbody tr').nth(2).waitFor();
  assert.match(await dialog.innerText(),/1,234.56 LAK CR/);
  assert.match(await dialog.innerText(),/TEST001/);
  await dialog.locator('select').selectOption('Retirement candidate');
  assert.equal(await dialog.locator('tbody tr').count(),1);
  assert.match(await dialog.locator('tbody').innerText(),/5121/);
  assert.equal(calls,1);
  fail=true;
  await dialog.getByRole('button',{name:'Refresh'}).click();
  await dialog.getByText('Account review access denied').waitFor();
  assert.equal(await dialog.locator('tbody tr').count(),0);
  fail=false;
  await dialog.getByRole('button',{name:'Refresh'}).click();
  await dialog.locator('tbody tr').waitFor();
  assert.equal(await dialog.locator('select').inputValue(),'Retirement candidate');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state:'hidden'});
  assert.equal(await dialog.locator('tbody tr').count(),0);
  await open.click();
  await dialog.locator('tbody tr').nth(2).waitFor();
  await dialog.getByRole('button',{name:'Close'}).click();
  await dialog.waitFor({state:'hidden'});
  // The posting action appears only on the reviewed November journal and requires a click.
  const correction=dialog.getByRole('button',{name:'Correct November restaurant rent'});
  let postings=0;
  rows.push({code:'9222',name:'Restaurant rent',currency:'THB',active:true,recommendation:'Keep posted history',replacement:'5123',posting_count:1,balance:20000,reasons:[],journals:['AMO26-000006']});
  rows[1].journals=['AMO26-000006'];
  await page.route('**/rpc/apply_reviewed_restaurant_rent_2026',route=>{
   postings++;
   for(const row of [rows[1],rows[3]]){row.posting_count=0;row.balance=0;row.journals=[];}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify('AMO26-000006')});
  });
  await open.click();
  await correction.waitFor({state:'visible'});
  assert.equal(postings,0);
  await correction.click();
  await dialog.getByText('4 of 4 mapping accounts',{exact:false}).waitFor();
  await correction.waitFor({state:'hidden'});
  assert.equal(postings,1);
  console.log('PASS on-demand review, filter, refresh, retry, close and explicitly posted rent correction.');
 }finally{await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
