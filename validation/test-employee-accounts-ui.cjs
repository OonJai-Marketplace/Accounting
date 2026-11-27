const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const createFixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await createFixture();
 try {
  const {page,login}=await fixture.open();
  const rows=[{id:randomUUID(),name:'QA Employee',code:'QA-01',position:'Cook',employment:'probationary',revision:0},
    {id:randomUUID(),name:'QA Archived',code:'QA-02',position:'Cook',employment:'inactive',revision:0}];
  let calls=0;const secret='abcdefgh';
  await page.route('**/functions/v1/employee-hr',async route=>{
    calls++;const b=route.request().postDataJSON();assert.ok(route.request().headers().authorization.startsWith('Bearer '));
    if(b.action==='save'){assert.equal(b.password,secret);Object.assign(rows[0],{email:b.email,access:b.access,revision:1});}
    await route.fulfill({json:b.action==='list'?rows:{saved:true}});
  });
  await login();assert.equal(calls,0);
  await page.evaluate(()=>switchTab('employee-accounts'));
  const panel=page.locator('#employee-accounts');await panel.getByText('QA Employee',{exact:true}).waitFor();
  assert.equal(calls,1);
  await panel.getByRole('combobox',{name:'Employment status',exact:true}).selectOption('inactive');
  assert.equal(await panel.getByText('QA Employee',{exact:true}).count(),0);
  await panel.getByRole('combobox',{name:'Employment status',exact:true}).selectOption('');
  await panel.getByRole('searchbox').fill('QA-01');assert.equal(await panel.getByText('QA Archived').count(),0);
  await panel.getByRole('button',{name:'Create account'}).click();
  const box=page.getByRole('dialog',{name:'Create employee account'});assert.equal(await box.getByLabel('Employee',{exact:true}).inputValue(),'QA Employee');
  await box.getByLabel('Email address').fill('qa@example.test');
  const password=box.getByLabel('Password',{exact:true});await password.fill(secret.slice(1));
  assert.equal(await password.evaluate(el=>el.validity.tooShort),true);
  await password.fill(secret);assert.equal(await password.evaluate(el=>el.checkValidity()),true);
  await box.getByLabel('Confirm password').fill(secret+'x');await box.getByRole('button',{name:'Save'}).click();
  await box.getByText('The passwords do not match.').waitFor();await box.getByLabel('Confirm password').fill(secret);
  await box.getByLabel('Show passwords').check();assert.equal(await box.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
  const stored=()=>page.evaluate(s=>[localStorage,sessionStorage].some(store=>Object.values(store).some(v=>String(v).includes(s))),secret);
  assert.equal(await stored(),false);await box.getByRole('button',{name:'Save'}).click();
  await panel.getByText('Password Configured').waitFor();assert.equal(await stored(),false);assert.equal(calls,3);
  await page.evaluate(()=>switchTab('payroll-employees'));await page.waitForFunction(()=>!document.querySelector('#employee-accounts')?.childElementCount);
  console.log('PASS Employee Accounts navigation, lazy loading, search, filter, dialog, confirmation, show/hide, save and private form cleanup');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
