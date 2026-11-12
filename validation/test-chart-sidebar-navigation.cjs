const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const { page, login } = await fixture.open();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const accounts = fixture.fixture.tables.accounts;
  for (let i = 0; i < 220; i++) {
   accounts.push({ ...accounts[0], id: 'a0000000-0000-4000-8000-' + String(i).padStart(12, '0'),
    code: 'A' + i, name: 'Sample account ' + i, description: i === 219 ? 'Long description '.repeat(40) : '' });
  }
  fixture.fixture.tables.account_groups143180 = Array.from({length:12}, (_,i) => ({
   id: 'g' + i, name: 'Group ' + i, kind: 'branch',
   account_ids: accounts.filter((a, j) => j % 12 === i).map(a => a.id)
  }));
  await login();
  const groupReads = () => fixture.requests.filter(url => url.includes('/account_groups143180')).length;
  assert.equal(groupReads(), 1, 'authorized groups are already prepared at sign-in');
  const open = target => page.locator('#nav-module-' + target + ' .nav-header').evaluate(button => button.click());
  await open('accounts');
  await page.waitForFunction(() => !document.querySelector('#sec-chart-accounts').hidden && document.querySelector('#chartGroupNav143180').textContent.includes('Group 11'));
  const table = page.locator('#tblChartOfAccounts');
  const rows = table.locator('tbody tr');
  assert.equal(await rows.count(), accounts.length);
  await page.evaluate(() => { window.savedChartRow = document.querySelector('#coaTableBody tr'); });
  await open('settings');
  await open('accounts');
  const viewport=page.viewportSize();
  await page.setViewportSize({width:viewport.width-40,height:viewport.height-40});
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  assert(await rows.first().evaluate(row => row === window.savedChartRow), 'return and same-layout resize retain the rows');
  assert.equal(groupReads(), 1);
  const layout = await table.evaluate(table => {
   const first = table.tBodies[0].rows[0];
   const edges = row => Array.from(row.cells, cell => cell.getBoundingClientRect().left);
   return {headers:edges(table.tHead.rows[0]), cells:edges(first), rowDisplay:getComputedStyle(first).display,
    skip:getComputedStyle(first).contentVisibility};
  });
  assert.equal(layout.skip, 'auto', JSON.stringify(layout));
  layout.headers.forEach((x,i) => assert(Math.abs(x-layout.cells[i])<2, JSON.stringify(layout)));
  await rows.last().scrollIntoViewIfNeeded();
  await rows.last().focus();
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#chartActionMenu143181').innerText(), /Sample account 219/);
  await page.keyboard.press('Escape');
  await page.locator('#searchCoa1439').click();
  await page.locator('#searchCoa1439').fill('Sample account 219');
  assert.equal(await rows.count(), 1);
  assert.match(await rows.first().innerText(), /Long description/);
  await page.locator('#searchCoa1439').fill('');
  await page.locator('#chartGroupNav143180 [data-filter="g2"]').click();
  assert.equal(await rows.count(), accounts.filter((a,i) => i%12===2).length);
  await page.locator('#chartGroupNav143180 [data-filter="all"]').click();
  await page.emulateMedia({media:'print'});
  assert.equal(await rows.last().evaluate(row => getComputedStyle(row).display), 'table-row');
  await page.emulateMedia({media:'screen'});
  const handle = table.locator('th .column-resize143117').first();
  await handle.focus();
  await page.keyboard.press('ArrowRight');
  assert(await table.evaluate(node => node.classList.contains('table-resized143117')), 'custom column widths apply');
  assert.equal(await rows.first().evaluate(row => getComputedStyle(row).display), 'table-row');
  assert.deepEqual(errors, []);
  console.log('PASS chart groups at sign-in, sidebar return, retained rows, column alignment, offscreen rows, keyboard actions, search, filters, and native print layout');
 } finally { await fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
