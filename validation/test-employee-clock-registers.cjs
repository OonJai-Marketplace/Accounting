// Exercise the Accounting HR screen using synthetic clock-register responses.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({timezoneId:'America/Los_Angeles'});
    await page.setContent('<section id="hr-attendance" class="tab-content active"></section>');
    await page.evaluate(() => {
      window.escapeHtml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
      window.esc82 = window.escapeHtml;
      window.admin82 = () => window.liveProfile?.role === 'admin';
      window.liveProfile = {id:'fixture-admin',role:'admin'};
      window.Work82 = {run:{month:'2026-11',status:'draft'}};
      window.syncPayrollRoster99 = () => {};
      window.renderAttendance99 = () => '<p>Existing manual attendance</p>';
      window.action82 = () => '';
      window.formatAppDate = String;
      window.calls = [];
      window.ojmDb = {rpc:(action,data) => {
        window.calls.push({action,data});
        return new Promise(resolve => { window.resolveResult = resolve; });
      }};
    });
    await page.addScriptTag({content:fs.readFileSync('src/shared/ui/workforce-forms-v82.js','utf8')});
    await page.addScriptTag({path:'src/hr/employees/hr-v99.js'});
    await page.evaluate(() => window.renderHr99());
    assert.equal(await page.getByText('Existing manual attendance').count(),1);
    assert.equal(await page.evaluate(() => calls.length),0);
    const open = page.getByRole('button',{name:'View clock records'});
    await open.click();
    assert.deepEqual(await page.evaluate(() => calls),[{action:'hr_clock_registers',data:{p_month:'2026-11-01'}}]);
    assert(await open.isDisabled());
    const row = {employeeId:'fixture-employee',name:'A <img onerror=alert(1)>',date:'2026-11-26',
      clockIn:'2026-11-26T02:30:00Z',clockOut:'2026-11-26T10:36:41Z',durationSeconds:29201,status:'Clocked out'};
    await page.evaluate(record => resolveResult({data:[record],error:null}),row);
    assert.deepEqual(await page.locator('tbody tr td').allTextContents(),[row.name,'2026-11-26','09:30:00','17:36:41','8h 06m 41s','Clocked out']);
    assert.equal(await page.locator('img').count(),0);
    await page.getByRole('button',{name:'Refresh clock records'}).click();
    await page.evaluate(() => resolveResult({error:{code:'42501'}}));
    assert.match(await page.locator('[role=status]').innerText(),/administrator/);
    await page.getByRole('button',{name:'Retry clock records'}).click();
    await page.evaluate(() => {Work82.run.month='2026-12';renderHr99();resolveResult({data:[{name:'Stale employee'}]});});
    assert.equal(await page.getByText('Stale employee').count(),0);
    await page.getByRole('button',{name:'View clock records'}).click();
    await page.evaluate(() => resolveResult({data:[],error:null}));
    assert.match(await page.locator('[role=status]').innerText(),/No clock records/);
    await page.evaluate(() => {liveProfile.role='employee';renderHr99();});
    assert.equal(await page.locator('#hr-attendance').innerText(),'');
    console.log('PASS Accounting clock records, request scope, elapsed time, retry and access checks. Chromium '+browser.version());
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
