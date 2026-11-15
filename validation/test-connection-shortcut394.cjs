const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page,context,login} = await fixture.open();
  await login();
  await page.waitForFunction(() => startup14257.interactive);
  const icon = page.locator('#workspaceTools108 #connectionFloat14301');
  const dialog = page.locator('#syncSummary143162[open]');
  async function openAndClose(activation='pointer') {
   if (process.env.PHASE0_DEVICE === 'tablet') {
    // The tablet's tools are reached from its navigation drawer.
    const search=page.getByRole('searchbox',{name:'Search entire system'});
    if (!await search.isVisible()) await page.getByRole('button',{name:'Expand navigation',exact:true}).tap();
    await search.tap();await search.fill('sync');
    await page.locator('.universal-search108 button').filter({hasText:'Sync / Connection details'}).tap();
   } else if (activation === 'keyboard') { await icon.focus(); await icon.press('Enter'); }
   else await icon.click();
   await dialog.waitFor({timeout:3000});
   assert.equal(await dialog.count(),1);
   await dialog.getByRole('button',{name:'Device tools'}).click();
   await dialog.getByText('Website version',{exact:true}).waitFor();
   await dialog.getByRole('button',{name:'Close',exact:true}).click();
   await dialog.waitFor({state:'detached'});
   const collapse=page.getByRole('button',{name:'Collapse navigation',exact:true});
   if (process.env.PHASE0_DEVICE==='tablet'&&await collapse.isVisible()) await collapse.tap();
  }
  for (const tab of ['Home','Overview','Graphs','Finance']) {
   await page.locator('#dashboard [data-tab112="'+tab+'"]').click();
   await openAndClose();
  }
  await page.evaluate(() => switchTab('journal'));
  await openAndClose('keyboard');
  await page.locator('#nav-module-dashboard .nav-header').click();
  await context.setOffline(true);
  await page.waitForFunction(() => document.querySelector('#connectionFloat14301').dataset.state === 'offline');
  await openAndClose();
  console.log('PASS connection shortcut opens from dashboard tabs, journal, keyboard and offline');
 } finally { await fixture.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
