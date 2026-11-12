const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');

(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open(),calls=[],saved=[];
  await page.route('**/rpc/account_ledger379',route=>{
   calls.push(route.request().postDataJSON());
   return route.fulfill({json:[
    {id:'OPEN',date:'2025-01-01',memo:'Opening Balances',debit:100,credit:0,annualOpening:true},
    {id:'FIRST',date:'2025-03-12',memo:'Initial payment',debit:0,credit:40.01},
    {id:'SECOND',date:'2025-05-10',memo:'Final payment',debit:0,credit:60}
   ].map(l=>({...l,currency:'USD'}))});
  });
  await page.route('**/rpc/reconciliation_differences379',route=>{
   calls.push(route.request().postDataJSON());
   return route.fulfill({json:{month:'2026-11',months:[{month:'2026-11'}],rows:[{code:'TEST',name:'Bank',currency:'LAK',method:'bank',book:12000,actual:null,outstanding:0,difference:null}]}});
  });
  await page.route('**/rest/v1/hr_calendar_events14306*',route=>{
   if(route.request().method()!=='POST')return route.fallback();
   const row={...route.request().postDataJSON(),id:'fixture-'+saved.length};
   saved.push(row);return route.fulfill({json:[row]});
  });
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   AccountingStore.accounts.push({id:'fixture-clearing',name:'Fixture clearing',code:'TEST',currency:'USD',isPosting:true});
   window.dispatchEvent(new Event('focus'));
  });
  const dock=page.locator('#desktopStatusDock'),dialog=dock.locator('.watch-dialog');
  const tool=name=>dock.getByRole('button',{name,exact:true});
  const dismiss=async box=>{await page.mouse.click(3,3);await box.waitFor({state:'hidden',timeout:4000});};
  await tool('Account ledger').waitFor();
  assert.equal(calls.length,0);
  await tool('Account ledger').click();
  await dialog.getByRole('searchbox').fill('clear');
  assert.equal(calls.length,0);
  await dialog.getByRole('button',{name:/TEST · Fixture/}).click();
  const period=dialog.getByLabel('Ledger month'),stats=dialog.locator('.ledger-stats379 strong');
  await period.selectOption('2025-04');
  assert.deepEqual(await stats.allTextContents(),['59.99 DR','0.00','0.00','59.99 DR']);
  await period.selectOption('2025-05');
  assert.deepEqual(await stats.allTextContents(),['59.99 DR','0.00','60.00','(0.01) CR']);
  await dialog.getByText('Final payment',{exact:true}).waitFor();
  await period.selectOption('');
  assert.deepEqual(await stats.allTextContents(),['100.00 DR','0.00','100.01','(0.01) CR']);
  assert.deepEqual(calls,[{p_account:'fixture-clearing'}]);
  await dismiss(dialog);
  await tool('Reconciliation differences').click();await dialog.getByText('Awaiting statement').waitFor();await dismiss(dialog);
  for(const name of ['Account balances','Foreign account rates']){await tool(name).click();await dismiss(dialog);}
  await tool('Company calendar').click();
  const calendar=page.getByRole('dialog',{name:'Company calendar',exact:true}),form=page.locator('dialog.hr-dialog14306[open]');
  for(const [selector,type] of [['[data-cal-add]','occasion'],['[data-cal-holiday]','holiday']]){
   await calendar.locator(selector).click();await form.locator('[name=title]').fill('Fixture '+type);
   await form.getByRole('button',{name:'Save',exact:true}).click();await form.waitFor({state:'hidden'});
   assert.equal(saved.at(-1).data.type,type);
  }
  await calendar.locator('[data-cal-add]').click();await dismiss(form);await calendar.waitFor();
  await dismiss(calendar);
  const bell=page.locator('#upcomingBell101');
  await bell.click();const notice=page.locator('#headerNotices104');
  await notice.waitFor();await dismiss(notice);
  await page.evaluate(()=>offline14239.open());await dismiss(page.locator('#syncSummary143162'));
  await page.setViewportSize({width:1024,height:768});
  const last=await tool('Account ledger').boundingBox(),task=await dock.locator('.tasks').boundingBox();
  assert.ok(last.y+last.height<=task.y,'Five shortcuts must fit above the task controls');
  assert.equal(await page.evaluate(()=>hrCalendar14306.state.rows.filter(r=>r.id.startsWith('fixture-')).length),2);
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('local-work14333'));});
  assert.equal(calls.length,2);
  console.log('PASS single-account search, monthly and all-month balances, quiet months, on-demand reads, calendar saves, and outside dismissal');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
