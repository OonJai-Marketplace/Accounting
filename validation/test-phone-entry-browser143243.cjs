const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const {page, context, login, me} = await fixture.open('phone', 'submitter');
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
    for(const field of [page.locator('[data-field=debit]').first(),page.locator('[data-field=credit]').nth(1)]){
      await field.pressSequentially('333');
      await field.press('0');
      assert.equal(await field.inputValue(),'3,330');
      await field.pressSequentially('00');
      assert.equal(await field.inputValue(),'333,000');
    }
    assert.match(await page.locator('#liveReceiptBalance').innerText(),/333,000.*333,000.*Balanced/);
    await switchMode('Cashbook');
    assert.equal(await page.locator('[data-field=source]').inputValue(), funds[0]);
    assert.equal(await page.locator('[data-field=affected]').inputValue(), categories[0]);
    const amount=page.locator('[data-field=amount]');
    await amount.fill('');
    for(const [digit,expected] of [['3','3'],['3','33'],['1','331'],['0','3,310'],['0','33,100'],['0','331,000'],['0','3,310,000']]){
      await amount.press(digit);
      assert.equal(await amount.inputValue(),expected);
      assert(await amount.evaluate(n=>n===document.activeElement));
    }
    await amount.fill('');
    const ime=await context.newCDPSession(page),preview=amount.locator('..').locator('.phone-amount-display');
    for(const [digits,formatted] of [['3310','3,310'],['33100','33,100'],['331000','331,000']]){
      await ime.send('Input.imeSetComposition',{text:digits,selectionStart:digits.length,selectionEnd:digits.length});
      assert(await preview.isVisible());
      assert.equal(await preview.innerText(),formatted);
      assert.equal(await amount.inputValue(),digits,'keyboard can still replace its composing range');
    }
    assert.equal(await amount.evaluate(n=>getComputedStyle(n).webkitTextFillColor),'rgba(0, 0, 0, 0)');
    await ime.send('Input.insertText',{text:'331000'});
    assert(!(await preview.isVisible()));
    assert.equal(await amount.inputValue(),'331,000');
    await amount.fill('');
    await ime.send('Input.imeSetComposition',{text:'24000',selectionStart:5,selectionEnd:5});
    await ime.send('Input.imeSetComposition',{text:'',selectionStart:0,selectionEnd:0});
    assert.equal(await amount.inputValue(),'');
    assert(!(await preview.isVisible()));
    await amount.fill('1234567');
    await amount.evaluate(n=>n.setSelectionRange(3,3));
    await amount.press('9');
    assert.equal(await amount.inputValue(),'12,934,567');
    assert.equal(await amount.evaluate(n=>n.selectionStart),4);
    await amount.evaluate(n=>n.setSelectionRange(3,3));
    await amount.press('Backspace');
    assert.equal(await amount.inputValue(),'1,934,567');
    await amount.evaluate(n=>n.setSelectionRange(1,1));
    await amount.press('Delete');
    assert.equal(await amount.inputValue(),'134,567');
    await amount.fill('12345.75');
    assert.equal(await amount.inputValue(),'12,345.75');
    await amount.fill('2500');
    await page.locator('[data-field=memo][data-index]').fill('Phone retained');

    await switchMode('Double Entry');
    await selectAccount(1, categories[0]);
    await selectAccount(2, funds[0]);
    assert.equal(await page.locator('[data-field=debit]').first().inputValue(), '2,500');
    assert.equal(await page.locator('[data-field=credit]').nth(1).inputValue(), '2,500');
    await switchMode('Cashbook');
    assert.equal(await page.locator('[data-field=amount]').inputValue(), '2,500');
    assert.equal(await page.locator('[data-field=memo][data-index]').inputValue(), 'Phone retained');
    assert.deepEqual(errors, []);
    console.log('PASS phone Double Entry account taps, assigned accounts, and Cashbook draft conversion');
  } finally {
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
