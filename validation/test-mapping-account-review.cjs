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
  console.log('PASS on-demand mapping review, evidence, signed balances, filtering, errors, retry and close.');
 }finally{await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
