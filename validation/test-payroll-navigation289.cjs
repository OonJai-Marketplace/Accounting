const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const { page, login } = await fixture.open();
    await login();
    await page.waitForFunction(() => startup14257.interactive);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const data = {
        reference: 'TEST-PAY-2026-10', month: '2026-10', status: 'finalized',
        rows: [], results: [], rates: { LAK: 1 },
        journalLink1429: { status: 'posted', journalId: 'test-entry', journalReference: 'TEST-001' }
      };
      const record = { id: 'test-run', version: 1, data };
      Object.assign(Work82, { runs: [record], run: structuredClone(data), runRecord: record, loaded: true, owner: liveProfile.id });
      historyMonth14341.setMonth('payroll-history', data.month);
    });
    const tabs = ['payroll-overview', 'payroll-deductions', 'payroll-entries', 'payroll-history'];
    const firstRequest = fixture.requests.length;
    for (let pass = 0; pass < 2; pass++) {
      for (const tab of tabs) {
        await page.evaluate(id => switchTab(id), tab);
        const panel = page.locator('#' + tab);
        const toolbar = panel.locator('.work82>header');
        await toolbar.waitFor();
        if (tab === 'payroll-history') {
          assert.equal(await panel.locator('[data-history-month14341]').count(), 1);
          assert.equal(await toolbar.locator('[data-history-month14341]').count(), 1);
          assert.equal(await panel.locator('input[type=search]').count(), 0);
          assert.equal(await panel.locator(':scope>.history-header14342').count(), 0);
          assert.deepEqual(await panel.locator('.salary-history-record button').allTextContents(), ['View Journal', 'Edit payroll', 'Export / Print']);
          assert.equal(await panel.getByRole('button', { name: /^(Open|Delete|Reload|Manage Employees)/ }).count(), 0);
        }
        if (tab === 'payroll-deductions') {
          assert.deepEqual(await toolbar.locator('button:visible').allTextContents(), ['Manage Employees / Leave']);
        }
        if (tab === 'payroll-overview') assert.equal(await toolbar.getByRole('button', { name: /Reload/ }).count(), 0);
      }
    }
    const payrollReads = fixture.requests.slice(firstRequest).filter(request => /payroll_window|payroll_runs|\/employees\?|\/employee_leave/.test(request));
    assert.deepEqual(payrollReads, []);
    console.log('PASS cached Payroll tab navigation, Salary History month and record controls, Deductions toolbar, and Overview actions.');
  } finally {
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
