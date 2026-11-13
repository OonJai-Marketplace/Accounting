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
  await page.route('**/rpc/reconciliation_records305',route=>route.fulfill({json:[{account:{id:'fixture-clearing',name:'Fixture bank',code:'TEST'},currency:'USD',from:'2025-04-01',to:'2025-04-30',closing:10000,statement:'80',findings:[],status:'reconciled'}]}));
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   AccountingStore.accounts.push({id:'fixture-clearing',name:'Fixture clearing',code:'TEST',currency:'USD',isPosting:true});
   for(let i=1;i<=10;i++)AccountingStore.accounts.push({id:'extra-'+i,code:'T'+i,name:'Extra '+i,currency:'USD',isPosting:true});
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
  assert.deepEqual(await stats.allTextContents(),['59.99','0.00','0.00','59.99']);
  await period.selectOption('2025-05');
  assert.deepEqual(await stats.allTextContents(),['59.99','0.00','60.00','(0.01)']);
  await dialog.getByText('Final payment',{exact:true}).waitFor();
  await period.selectOption('');
  assert.deepEqual(await stats.allTextContents(),['100.00','0.00','100.01','(0.01)']);
  assert.deepEqual(calls,[{p_account:'fixture-clearing'}]);
  const search=dialog.getByRole('searchbox');
  assert.equal(await search.evaluate(n=>n.tagName),'SPAN');
  await dialog.locator('[data-line]').first().click();assert.equal(await dialog.locator('tr.selected').count(),1);
  for(let i=1;i<=9;i++){await search.fill('Extra '+i);await dialog.getByRole('button',{name:'T'+i+' · Extra '+i+' (USD)',exact:true}).click();}
  await search.fill('Extra 10');await dialog.getByRole('button',{name:'T10 · Extra 10 (USD)',exact:true}).click();
  await dialog.getByText('Close a ledger tab to open another account.').waitFor();await search.fill('');
  const tab=code=>dialog.getByRole('button',{name:code,exact:true});
  await tab('TEST').click();assert.equal(await period.inputValue(),'');assert.equal(await dialog.locator('tr.selected').count(),1);
  const before=calls.length;await dialog.getByRole('button',{name:'Refresh',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#desktopStatusDock').shadowRoot.querySelector('.watch-dialog select').disabled);
  await dialog.getByText('Final payment',{exact:true}).waitFor();
  for(let i=0;i<20&&calls.length<before+10;i++)await page.waitForTimeout(50);
  assert.equal(calls.length,before+10);
  await dialog.getByRole('button',{name:'Close ledger T9',exact:true}).click();
  await dismiss(dialog);await tool('Account ledger').click();assert.equal(await dialog.locator('.ledger-tabs379 span').count(),9);await dismiss(dialog);
  await tool('Reconciliation differences').click();await dialog.getByText('Awaiting statement').waitFor();
  const recMonth=dialog.getByLabel('Reconciliation month');await recMonth.selectOption('2025-04');
  await dialog.getByText('Fixture bank').waitFor();await dialog.getByText('20.00',{exact:true}).waitFor();
  await recMonth.selectOption('2026-11');await dialog.getByText('Awaiting statement').waitFor();await dismiss(dialog);
  for(const name of ['Account balances','Foreign account rates']){await tool(name).click();assert.equal(await dialog.locator('header [data-edit],header [data-refresh],header .close').count(),3);await dismiss(dialog);}
  await tool('Company calendar').click();
  const calendar=page.getByRole('dialog',{name:'Company calendar',exact:true}),form=page.locator('dialog.hr-dialog14306[open]');
  await calendar.locator('[data-cal-add] + button').waitFor();
  assert.equal(await calendar.locator('[data-cal-add] + button').textContent(),'Close');
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
  assert(calls.length>=before+10);
  console.log('PASS ledger search, ten persistent tabs, signed balances, row highlighting, refresh all, historical reconciliation, header controls and calendar dismissal');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
