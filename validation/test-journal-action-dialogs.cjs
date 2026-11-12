const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function checkPlacement(dialog) {
  const position = await dialog.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const view = window.visualViewport;
    return {
      deviation: Math.abs(rect.x + rect.width / 2 - view.offsetLeft - view.width / 2),
      top: rect.top - view.offsetTop,
      bottom: rect.bottom - view.offsetTop,
      height: view.height
    };
  });
  assert.ok(position.deviation < 3, JSON.stringify(position));
  assert.ok(position.top >= 0 && position.top < 55, JSON.stringify(position));
  assert.ok(position.bottom <= position.height, JSON.stringify(position));
}

async function checkDevice(fixture, device) {
  const {page, context, login} = await fixture.open(device);
  try {
    await login();
    await page.evaluate(() => {
      switchTab('journal');
      clearJournalEntry();
      entry1430.restore('double', []);
      const usd = AccountingStore.accounts.find(account => account.currency === 'USD' && account.isPosting !== false);
      addJournalLineRow(usd.code + ' — ' + usd.name, '', 1, {});
      showJournalEntry98();
      status118.clear();
    });

    const link = page.locator('#memoLinkDialog143187');
    await page.locator('#jeGeneralMemo').locator('..').getByRole('button', {name: 'Insert or edit link'}).click();
    await checkPlacement(link);
    assert.equal(await link.locator('[name=label]').inputValue(), 'BCEL EFT rate');
    assert.equal(await link.locator('[name=url]').inputValue(), '');
    await link.locator('[name=label]').fill('My rate source');
    await link.locator('[name=url]').fill('https://example.com/payday');
    await link.getByRole('button', {name: 'Save link'}).click();
    assert.match(await page.locator('#jeGeneralMemo').inputValue(), /\[My rate source\]/);

    const openSaveAs = async () => {
      await page.locator('#jeOptions14389').click();
      await page.getByRole('menuitem', {name: 'Save as', exact: true}).click();
    };
    const choices = page.getByRole('dialog', {name: 'Save as', exact: true});
    for (const kind of ['Recurring transaction', 'Amortization']) {
      await openSaveAs();
      await checkPlacement(choices);
      await choices.getByRole('button', {name: kind}).click();
      const form = page.getByRole('dialog', {name: 'Save as ' + kind.toLowerCase(), exact: true});
      await checkPlacement(form);
      await form.getByRole('button', {name: 'Close'}).click();
    }
    await openSaveAs();
    await choices.getByRole('button', {name: 'Template', exact: true}).click();
    const template = page.locator('#modalTemplateName .modal-dialog');
    await checkPlacement(template);
    await template.locator('#templateNameInput').fill('Salary test');
    await template.getByRole('button', {name: 'Save Template', exact: true}).click();
    const toast = page.locator('#status118');
    await page.waitForFunction(() => document.querySelector('#status118:not([hidden]) .status-copy118')?.textContent === 'Saved');
    assert.ok((await toast.boundingBox()).width < 160);
    await toast.waitFor({state: 'hidden', timeout: 4500});

    await page.clock.install();
    for (const kind of ['info', 'warning', 'error']) {
      await page.evaluate(kind => status118[kind]('Check the selected record and try again. '.repeat(5)), kind);
      assert.ok((await toast.boundingBox()).width <= 435);
      await page.clock.fastForward(22000);
      assert.equal(await toast.isVisible(), false);
    }
    console.log('PASS Link, Save as choices, both plan forms, saved template, and notification timers on ' + device);
  } finally {
    await context.close();
  }
}

(async () => {
  const fixture = await createFixture();
  try {
    for (const device of ['desktop', 'tablet']) await checkDevice(fixture, device);
  } finally {
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
