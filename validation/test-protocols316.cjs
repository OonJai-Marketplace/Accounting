const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const createFixture = require('./phase0-browser-fixture.cjs');

async function checkReader(page, context, frame) {
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
  const target = new URL(tab.url());
  assert.match(target.pathname, /protocols\/index\.html$/);
  assert.equal(target.hash, '#P10');
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
    await desktop.page.waitForFunction(() => startup14257.interactive);
    await desktop.page.evaluate(() => { switchTab('journal'); showJournalEntry98(); });
    await desktop.page.locator('#generateJournal258').evaluate(button => button.click());
    const generator = desktop.page.locator('#journalGenerator258');
    for (const [label, code] of [['Journal protocol', 'J05'], ['Account codes', 'J06']]) {
      const [guide] = await Promise.all([
        desktop.context.waitForEvent('page'),
        generator.getByRole('link', {name: label, exact: true}).click()
      ]);
      const topic = guide.locator('article:visible');
      await guide.locator('#' + code + ':visible').waitFor();
      if (code === 'J05') {
        await topic.getByRole('link', {name: 'J06', exact: true}).click();
        await guide.locator('#J06:visible').waitFor();
      }
      assert.equal(await guide.locator('#J06 tbody tr').count(), 13);
      const [pdf] = await Promise.all([
        guide.waitForEvent('download'),
        guide.locator('#J06').getByRole('link', {name: /Download .* PDF/}).click()
      ]);
      assert.equal(pdf.suggestedFilename(), 'J06.pdf');
      assert.equal((await fs.readFile(await pdf.path())).subarray(0,5).toString(), '%PDF-');
      if (code === 'J05') {
        await guide.locator('#J06').getByRole('link', {name: 'All protocols'}).click();
        await checkReader(guide, desktop.context, guide);
      }
      await guide.close();
      assert(await generator.isVisible());
    }
    await desktop.context.close();
    const mobile = await fixture.open('phone');
    await mobile.login();
    await mobile.page.locator('#avatar').click();
    await mobile.page.locator('#accountMenu [data-action="protocols"]').click();
    await checkReader(mobile.page, mobile.context, mobile.page.frameLocator('iframe[title="Accounting protocols"]'));
    await mobile.page.getByRole('button', {name: 'Close protocols'}).click();
    await mobile.page.locator('#adminNav [data-area="settings"]').click();
    await mobile.page.locator('#workspace [data-action="protocols"]').click();
    await mobile.page.frameLocator('iframe[title="Accounting protocols"]').locator('#area').waitFor();
    console.log('PASS desktop generator, phone menu and Settings, eleven payroll rows, Generate Journal guide and account cross-links, draft retained, browser tabs and PDF downloads.');
  } finally {
    await fixture.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
