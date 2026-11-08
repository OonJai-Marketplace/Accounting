const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const createFixture = require('./phase0-browser-fixture.cjs');

async function checkReader(page, context) {
  const frame = page.frameLocator('iframe[title="Accounting protocols"]');
  await frame.locator('#area').selectOption({label: 'Payroll'});
  assert.equal(await frame.locator('.topic-list:visible li').count(), 11);
  await frame.getByRole('link', {name: 'Read Remit PIT and SSO in whole kip here'}).click();
  const article = frame.locator('article:visible');
  assert.equal(await article.getAttribute('id'), 'P10');
  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    article.getByRole('link', {name: /in a new tab/}).click()
  ]);
  await tab.locator('#P10:visible').waitFor();
  assert.match(tab.url(), /protocols\/index\.html#P10$/);
  await tab.close();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    article.getByRole('link', {name: /Download .* PDF/}).click()
  ]);
  assert.equal(file.suggestedFilename(), 'P10.pdf');
  assert.equal((await fs.readFile(await file.path())).subarray(0,5).toString(), '%PDF-');
  await article.getByRole('link', {name: 'All protocols'}).click();
  const [book] = await Promise.all([
    page.waitForEvent('download'),
    frame.getByRole('link', {name: 'Download complete PDF'}).click()
  ]);
  assert.equal(book.suggestedFilename(), 'Oon-Jai-Accounting-Protocols.pdf');
}
async function run() {
  const fixture = await createFixture();
  try {
    const desktop = await fixture.open('desktop');
    await desktop.login();
    await desktop.page.evaluate(() => switchTab('settings-system'));
    await desktop.page.getByRole('button', {name: 'Protocols', exact: true}).click();
    await checkReader(desktop.page, desktop.context);
    await desktop.context.close();
    const mobile = await fixture.open('phone');
    await mobile.login();
    await mobile.page.locator('#avatar').click();
    await mobile.page.locator('#accountMenu [data-action="protocols"]').click();
    await checkReader(mobile.page, mobile.context);
    await mobile.page.getByRole('button', {name: 'Close protocols'}).click();
    await mobile.page.locator('#adminNav [data-area="settings"]').click();
    await mobile.page.locator('#workspace [data-action="protocols"]').click();
    await mobile.page.frameLocator('iframe[title="Accounting protocols"]').locator('#area').waitFor();
    console.log('PASS desktop Settings, phone menu and Settings, eleven payroll rows, in-app reading, browser tabs and both PDF downloads.');
  } finally {
    await fixture.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
