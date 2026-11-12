const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page, login} = await fixture.open();
  await login();
  await page.waitForFunction(() => startup14257.interactive);
  await page.evaluate(() => {
   switchTab('transactions-closing14325');
   document.getElementById('maintenanceMonth14324').value = '2026-11';
   const journals = [384,385,386].map(n => ({
    id: 'test-journal-' + n, entries: [{date:'2026-11-01',memo:'Supplies'}],
    receipt: [{entry_no:'OJM260'+n}], changes: [], status:'saved'
   }));
   journalDurable14385.pending = () => journals;
   journalDurable14385.findings = () => journals.map(job => ({
    id:job.id,kind:'journal',periods:['2026-11'],status:job.status,job
   }));
   let reports = ['November 2026 budget request','November 2026 utilization'].map((title,i) => ({
    id: 'r'+i,kind:'cleanup',periods:[],title,job:{kind:'reports',status:'synced',row:{id:'row'+i}}
   }));
   localFirst14333.findings = () => reports;
   localFirst14333.verifyCleanup = async () => { reports = []; };
   syncAssessment14332.render();
  });
  const station = page.locator('#maintenanceSync14332');
  const confirmed = station.locator('.sync-confirmed');
  assert.equal(await station.getByRole('heading',{name:'Sync Station'}).count(),1);
  for(const selector of ['#transactions-closing14325 .maintenance-card14324 .maintenance-actions14324','#maintenanceSync14332 .maintenance-actions14324']){
   assert.equal(await page.locator(selector).first().evaluate(n=>getComputedStyle(n).justifyContent),'flex-end');
  }
  assert.equal(await confirmed.count(),1);
  assert.equal(await confirmed.locator('li').count(),3);
  assert.match(await confirmed.textContent(),/Journal OJM260386/);
  assert.doesNotMatch(await confirmed.textContent(),/Journal · Journal|Download/);
  await confirmed.getByRole('button',{name:'Dismiss'}).click();
  await page.evaluate(()=>syncAssessment14332.render());
  assert.equal(await confirmed.count(),0);
  assert.equal(await page.evaluate(()=>syncAssessment14332.findings().filter(f=>f.confirmation).length),3);
  assert.equal(await station.getByRole('button',{name:'Verify device copy'}).count(),2);
  await station.getByRole('button',{name:'Verify device copy'}).first().click();
  await page.waitForFunction(()=>document.querySelector('#maintenanceSync14332 [role=status]').textContent==='2 verified device copies cleared.');
  assert.equal(await station.getByRole('button',{name:'Verify device copy'}).count(),0);
  console.log('PASS grouped journal receipts, dismissal without queue mutation, related copy counts and right-aligned controls');
 } finally { await fixture.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
