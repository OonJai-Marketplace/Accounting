const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const {page, login, me} = await fixture.open('phone', 'submitter');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await login();
    await page.locator('[data-page=post]').click();

    const {assigned_fund_account_ids: funds, destination_account_ids: categories} = me.user_permissions;
    const selectAccount = async (line, account) => {
      const picker = page.getByRole('combobox', {name: 'Account for line ' + line, exact: true});
      const actual = await picker.locator('option').evaluateAll(nodes => nodes.map(node => node.value).filter(Boolean));
      assert.deepEqual(actual.sort(), [...funds, ...categories].sort());
      await picker.tap({timeout: 3000});
      await picker.selectOption(account);
      assert.equal(await picker.inputValue(), account);
    };
    const switchMode = async name => {
      const toggle=page.locator('.receipt-heading [data-action=switch-method]');
      await toggle.tap();
      assert.match(await toggle.innerText(),new RegExp(name));
    };

    await selectAccount(1, categories[0]);
    await selectAccount(2, funds[0]);
    await page.locator('[data-field=debit]').first().fill('100');
    await page.locator('[data-field=credit]').nth(1).fill('100');
    await switchMode('Cashbook');
    assert.equal(await page.locator('[data-field=source]').inputValue(), funds[0]);
    assert.equal(await page.locator('[data-field=affected]').inputValue(), categories[0]);
    await page.locator('[data-field=amount]').fill('2500');
    await page.locator('[data-field=memo][data-index]').fill('Phone retained');

    await switchMode('Double Entry');
    await selectAccount(1, categories[0]);
    await selectAccount(2, funds[0]);
    assert.equal(await page.locator('[data-field=debit]').first().inputValue(), '2500');
    assert.equal(await page.locator('[data-field=credit]').nth(1).inputValue(), '2500');
    await switchMode('Cashbook');
    assert.equal(await page.locator('[data-field=amount]').inputValue(), '2500');
    assert.equal(await page.locator('[data-field=memo][data-index]').inputValue(), 'Phone retained');
    assert.deepEqual(errors, []);
    console.log('PASS phone Double Entry account taps, assigned accounts, and Cashbook draft conversion');
  } finally {
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
