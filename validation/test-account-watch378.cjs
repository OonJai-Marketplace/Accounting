const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open(),calls=[];
  await page.route('**/rpc/account_watch_lines378',route=>{
   const p=route.request().postDataJSON();calls.push(p);
   const d=p.p_as_of,year=d.slice(0,4),month=d.slice(0,7);
   const line=(accountId,date,debit,credit,extra={})=>({accountId,date,debit,credit,currency:'USD',...extra});
   const rows=p.p_rates?[
    line('clear',(Number(year)-1)+'-12-01',0,0,{fxRateKind288:'valuation',fx_rate_lak:21500}),
    line('clear',year+'-01-01',10,0,{base_debit:200000,base_credit:0,annualOpening:true}),
    line('clear',month+'-01',10,0,{base_debit:220000,base_credit:0}),
    line('clear',d,0,5,{base_debit:0,base_credit:105000,fxRateKind288:'actual',fx_rate_lak:22900}),
   ]:[line('clear',year+'-01-01',1,0,{annualOpening:true}),line('clear',d,100.01,101)];
   return route.fulfill({json:rows.filter(l=>p.p_accounts.includes(l.accountId))});
  });
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   AccountingStore.accounts.push({id:'clear',name:'Sample clearing',code:'TEST1',isPosting:true,currency:'USD',type:'ASSET'},
    {id:'pay',name:'Sample payable',code:'TEST2',isPosting:true,currency:'LAK',type:'LIABILITY'});
   window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('page113'));
  });
  const dock=page.locator('#desktopStatusDock'),balances=dock.locator('[data-rail-tool=trial-months]'),rates=dock.locator('[data-watch=rates]'),pop=dock.locator('.watch-dialog');
  await balances.waitFor();assert.equal(calls.length,0);
  const top=await balances.boundingBox(),bottom=await dock.locator('.tasks').boundingBox();
  assert.ok(top.y<bottom.y&&Math.abs(top.x-bottom.x)<8,'upper right rail aligned');
  const comparison=page.locator('dialog.monthly-trial-dialog'),row=pop.getByRole('row').filter({hasText:'Sample clearing'});
  await balances.click();await comparison.getByRole('table').waitFor();
  await comparison.getByText('Edit accounts',{exact:true}).click();
  await comparison.getByLabel('All accounts',{exact:true}).uncheck();
  await comparison.getByLabel(/Sample clearing/).check();await comparison.getByLabel(/Sample payable/).check();
  assert.equal(await comparison.locator('tbody tr').count(),2);assert.equal(calls.length,0);
  await comparison.getByRole('button',{name:'Close',exact:true}).click();
  await rates.click();await pop.getByRole('button',{name:'Edit accounts'}).click();
  await pop.getByLabel(/Sample clearing/).check();
  assert.equal(await pop.getByLabel(/Sample payable/).count(),0);
  await pop.getByRole('button',{name:'Save selection'}).click();
  await row.getByText('21,000 LAK / USD',{exact:true}).waitFor();
  assert.equal(await row.locator('td').nth(2).innerText(),'21,500');
  const dates=await page.evaluate(()=>{const d=appLocalDate();return [formatAppDate(d.slice(0,7)+'-01'),formatAppDate((Number(d.slice(0,4))-1)+'-12-01')];});
  assert.equal(await row.locator('td').nth(1).innerText(),dates[0]);assert.equal(await row.locator('td').nth(3).innerText(),dates[1]);
  await pop.getByRole('button',{name:'Refresh'}).click();await row.waitFor();
  const n=calls.length;
  await page.keyboard.press('Escape');await pop.waitFor({state:'detached'});
  await page.evaluate(()=>{window.dispatchEvent(new Event('online'));window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('page113'));window.dispatchEvent(new Event('local-work14333'));});
  assert.equal(calls.length,n);
  // A local, unsynchronized edit is already projected into the journal exactly once.
  await page.evaluate(()=>{
   const d=appLocalDate();journalDurable14385.pending=()=>[{status:'pending'}];
   yearWindow14333.state=()=>({from:d.slice(0,4)+'-01-01',to:d.slice(0,4)+'-12-31',revision14341:'test'});
   JournalModule.entries=[{accountId:'clear',currency:'USD',date:d,debit:20,credit:0,local14333:true,pendingSync:true},{accountId:'clear',currency:'USD',date:d,debit:0,credit:20.01}];
  });
  await balances.click();await comparison.getByText('(0.01)',{exact:true}).first().waitFor();assert.equal(calls.length,n);
  await comparison.getByRole('row').filter({hasText:'Sample payable'}).waitFor();
  console.log('PASS tap-only reads, rail placement, selections, residual cents, active device edits, separate book/valuation dates');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
