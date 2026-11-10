const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>switchTab('transactions-budget14313'));
  const panel=page.locator('#transactions-budget14313'),popup=page.getByRole('dialog',{name:'Fund utilization',exact:true});
  await panel.getByRole('button',{name:'Fund utilization',exact:true}).click();
  const form=popup.locator('#financeMove82'),header=popup.locator('#fundHeader290');
  assert(await form.locator('[name=amount]').isVisible());assert(await form.locator('[name=date290]').isVisible());
  assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'transactions-budget14313');
  assert.equal(await popup.evaluate(n=>n.scrollWidth<=n.clientWidth+2),true);
  const saved=new Map();const parent='00000000-0000-4000-8000-000000000326';
  await page.route('**/rest/v1/operational_reports*',async r=>{
   const req=r.request(),id=new URL(req.url()).searchParams.get('id')?.slice(3);
   if(req.method()==='POST'){const row=req.postDataJSON();saved.set(row.id,row);return r.fulfill({json:[row]})}
   return r.fulfill({json:id?saved.get(id)||null:[]});
  });
  await page.route('**/rest/v1/rpc/budget_capabilities14316',r=>r.fulfill({json:{version:14316}}));
  await page.exposeFunction('storeFund326',d=>{const row={id:parent,version:1,data:d};saved.set(parent,row);return row});
  await page.evaluate(()=>{window.saveWork82=(kind,d)=>window.storeFund326(d)});
  await popup.getByRole('button',{name:'Borrow from a fund'}).click();
  await form.locator('[name=account]').fill('Previous month petty cash');await form.locator('[name=amount]').fill('100000');
  await popup.getByRole('button',{name:'Close',exact:true}).click();await panel.getByRole('button',{name:'Fund utilization',exact:true}).click();
  assert.equal(await form.locator('[name=amount]').evaluate(n=>parseAppNumber(n.value)),100000);
  await form.locator('[name=currency]').selectOption('LAK');
  await form.locator('[name=reference]').fill('A1');await form.locator('button[type=submit]').click();
  await popup.getByRole('button',{name:'Repay an advance'}).click();
  const loans=form.locator('[name=loanId290]');const loan=await loans.locator('option').last().getAttribute('value');
  assert(loan);await loans.selectOption(loan);await form.locator('[name=account]').fill('Cash box');
  await form.locator('[name=currency]').selectOption('LAK');await form.locator('[name=amount]').fill('40000');
  await form.locator('[name=reference]').fill('P1');await form.locator('button[type=submit]').click();
  await header.locator('[name=purpose]').fill('Kitchen supplies');await header.locator('[name=recipient]').fill('Kitchen');
  await popup.getByRole('button',{name:'Save report',exact:true}).click();
  await page.waitForFunction(()=>Work82.reports.some(r=>r.data.mode==='utilization'&&r.data.purpose==='Kitchen supplies'));
  assert.equal(saved.size,1);const d=saved.get(parent).data;
  assert(!d.requestId14316);assert.equal(d.movements[1].loanId290,d.movements[0].id290);
  assert.equal(await page.evaluate(d=>BudgetReport290.outstanding(d,d.movements[0]),d),60000);
  await popup.getByRole('button',{name:'Requests and saved reports'}).click();
  await page.evaluate(()=>{ui117.confirm=async()=>true});
  await page.getByRole('dialog',{name:'Requests and saved reports'}).getByRole('button',{name:'Continue',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#fundHeader290')?.dataset.record==='00000000-0000-4000-8000-000000000326');
  assert.equal(await header.locator('[name=purpose]').inputValue(),'Kitchen supplies');
  assert.deepEqual(errors,[]);console.log('PASS empty workspace, editable popup, retained input, partial reimbursement, save and reopen without creating a budget request');
 }finally{await fixture.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
