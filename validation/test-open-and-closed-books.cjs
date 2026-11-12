const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page, login} = await fixture.open();
  fixture.fixture.tables.accounting_periods = [
   {period_month:'2026-08-01',status:'locked'},
   {period_month:'2026-09-01',status:'closed'},
   {period_month:'2026-10-01',status:'open'}
  ];
  const account = fixture.fixture.tables.accounts[0];
  fixture.fixture.journal = [8,9,10,11].map((m,i)=>({
   id:'BOOK-'+m,date:'2026-'+String(m).padStart(2,'0')+'-04',accountId:account.id,
   account:account.name,accountCode:account.code,currency:'LAK',debit:[20,80,30,1000][i],credit:0,status:'posted'
  }));
  await page.clock.setFixedTime(new Date('2026-11-12T09:00:00Z'));
  await login();
  await page.waitForFunction(()=>startup14257.interactive);
  async function navigate(id){
   await page.evaluate(id=>switchTab(id),id);
   await page.waitForFunction(id=>document.querySelector('.tab-content.active')?.id===id,id);
  }
  async function balances(id,month,expected){
   await navigate(id);
   await page.waitForFunction(id=>document.querySelector('#'+id+' .r79-content'),id);
   const result=await page.evaluate(accountId=>{
    const row=reportData79().find(r=>r.account.id===accountId);
    return [Reports79.from,row.opening,row.debit,row.closing];
   },account.id);
   assert.deepEqual(result,[month+'-01',...expected]);
  }
  await balances('report-open-tb','2026-10',[10000,3000,13000]);
  await balances('report-open-gl','2026-10',[10000,3000,13000]);
  const tabs=()=>page.locator('#categoryTabs button:visible').allTextContents();
  assert.deepEqual((await tabs()).map(t=>t.trim()).slice(0,5),['Accounts','Sub-accounts','Account Activity','General Ledger','Trial Balance']);
  await balances('report-tb','2026-09',[2000,8000,10000]);
  assert.deepEqual((await tabs()).map(t=>t.trim()),['General Ledger','Trial Balance','Income Statement','Balance Sheet','Cash Flow','Reconciliation','Expense','Payroll','User','Funding']);
  for(const id of ['report-gl','report-tb','report-pl','report-bs','report-cf','report-expense','report-payroll','report-reconciliation','report-subusers82','report-financing82','report-activity','report-open-gl','report-open-tb']){
   await navigate(id);
   const panel=page.locator('#'+id);
   const button=panel.getByRole('button',{name:'Filter',exact:true}).first();
   await button.click({timeout:6500});
   const dialog=page.locator('dialog.report-dialog299[open]');
   assert.ok(await dialog.isVisible(),id);
   assert.ok(await dialog.evaluate(d=>d.scrollWidth<=d.clientWidth+1),id);
   if(id==='report-gl'){
    await dialog.locator('[data-period]').click();
    assert.equal(await dialog.locator('[data-month="2026-10"]').isDisabled(),true);
    assert.equal(await dialog.locator('[data-month="2026-08"]').isDisabled(),false);
    await dialog.locator('[data-apply]').click();
   }
   if(id.startsWith('report-open-'))assert.equal(await dialog.locator('[data-period]').isDisabled(),true);
   await dialog.getByText('Cancel',{exact:true}).click();
   if(id==='report-activity'){
    const positions=await panel.locator('.r79-actions').evaluate(n=>['input','button'].map(s=>n.querySelector(s).getBoundingClientRect()).map(r=>r.y+r.height/2));
    assert.ok(Math.abs(positions[1]-positions[0])<6,'Account Activity search and actions share a row');
   }
  }
  await page.evaluate(()=>{PeriodReview.periods['2026-09'].status='open'});
  await balances('report-gl','2026-08',[0,2000,2000]);
  await balances('report-open-gl','2026-09',[2000,8000,10000]);
  await page.evaluate(()=>{PeriodReview.periods['2026-10'].status='closed';PeriodReview.periods['2026-08'].status='open'});
  await balances('report-gl','2026-10',[0,3000,3000]);
  await page.evaluate(()=>{PeriodReview.periods={};switchTab('report-gl')});
  assert.match(await page.locator('#report-gl .r79').innerText(),/No closed books/);
  console.log('Passed open and closed balances, navigation, report filters, and reopened books.');
 } finally { await fixture.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
