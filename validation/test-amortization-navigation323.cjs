const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const {page, login} = await fixture.open('desktop', 'admin');
    let reads = 0;
    await page.route('**/rest/v1/rpc/list_journal_plans280', route => {
      reads++;
      const lines = fixture.fixture.accounts.filter(account => account.currency === 'LAK').map((account, i) => ({
        account_id: account.id, description: 'Fixture line', currency_code: 'LAK',
        debit: i ? 0 : 250, credit: i ? 250 : 0, book_rate_lak: 1, fx_rate_lak: 1
      }));
      return route.fulfill({json: ['Restaurant rent', 'Wi-Fi', 'House rent'].map((title, i) => ({
        id: 'fixture-' + i, kind: 'amortization', title, memo: title, status: 'active',
        definition: {}, version: 1, occurrences: [{occurrence_no: 1, due_date: '2026-11-01', status: 'pending', lines}]
      }))});
    });
    await login();
    await page.evaluate(async () => {
      switchTab('transactions-recurring');
      await UpcomingPlans280.load();
      workspace14337.showSection('amortization');
    });
    const plans = page.locator('#amortizationPlans280 > details[data-plan]');
    assert.equal(await plans.count(), 3);
    for (const width of [1366, 768]) {
      await page.setViewportSize({width, height: 900});
      for (const header of await plans.locator(':scope > summary').all()) {
        assert.equal(await header.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(236, 253, 245)');
        assert.equal(await header.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
        assert.equal(await header.evaluate(el => getComputedStyle(el.parentElement).borderTopColor), 'rgb(5, 150, 105)');
        if (await header.evaluate(el => el.parentElement.open)) await header.click();
        await header.click();
        assert.equal(await header.evaluate(el => el.parentElement.open), true);
        await header.focus();
        await page.keyboard.press('Enter');
        assert.equal(await header.evaluate(el => el.parentElement.open), false);
      }
    }
    const rent = plans.filter({hasText: 'Restaurant rent'});
    await rent.locator('summary').first().click();
    const before = reads;
    await rent.getByRole('button', {name: 'Open prepared journal'}).click();
    await page.waitForSelector('#journal.active #preparedPlan280');
    assert.equal(await page.locator('#jeGeneralMemo').inputValue(), 'Restaurant rent');
    assert.equal(await page.locator('#jeLinesBody tr').count(), 2);
    assert.equal(reads, before, 'Opening the reviewed plan must not reload every plan');
    console.log('PASS three amortization headers, keyboard/touch-width layouts, prepared journal fields, no duplicate plan read');
  } finally { await fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
