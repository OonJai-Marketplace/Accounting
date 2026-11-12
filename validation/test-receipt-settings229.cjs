/* Exercise the receipt controls through Accounting Settings with a simulated protected destination. */
const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');
(async () => {
  const fixture = await createFixture();
  try {
    const {page, login} = await fixture.open();
    const active = {email:'old@example.test', name:'Existing receipts', folderURL:'https://drive.google.com/drive/folders/folder123456', connectionKey:'existing'};
    let settings = {accountEmail228:active.email, receiptDrive228:{folderURL:active.folderURL, active}};
    await page.route('**/rest/v1/budget_settings14313*', route => route.fulfill({json:{id:true,version:4,data:{googleSheets143129:settings}}}));
    let rejectSave = true;
    await page.route('**/functions/v1/accounting-documents', async route => {
      const body = route.request().postDataJSON();
      if (body.action === 'save-receipt-details') {
        assert.equal(body.expected.key, active.connectionKey);
        if (rejectSave) return route.fulfill({status:409,json:{error:'Settings changed on another device.'}});
        settings = {...settings, accountEmail228:body.email, receiptDrive228:{...settings.receiptDrive228,folderURL:body.folderURL}};
        return route.fulfill({json:{settings}});
      }
      if (body.action === 'check-receipt-access') return route.fulfill({json:active});
      throw Error('Unexpected receipt action ' + body.action);
    });
    await login();
    await page.waitForFunction(() => startup14257.interactive);
    // The fixture restores a cached session on localhost. Enable its simulated online transport.
    await page.evaluate(() => {
      window.offline14239.offline = () => false;
      Object.defineProperty(window, 'sessionCache14333', {value:{...window.sessionCache14333,localMode:false},configurable:true});
      switchTab('settings-accounting');
      settingsStack143176.open('google');
    });
    const host = page.locator('#googleSheets143129');
    await host.locator('[data-check-receipt]').click();
    await host.getByText('old@example.test can save scans to Existing receipts.').waitFor();
    assert.equal(await host.locator('[data-sheet]').count(),0);
    await host.locator('[data-change-receipt]').click();
    await host.locator('[data-receipt-email228]').fill('new@example.test');
    await host.locator('[data-save228]').click();
    await host.getByText('Settings changed on another device.').waitFor();
    assert.equal(await host.locator('[data-receipt-email228]').inputValue(),'new@example.test');
    rejectSave = false;
    await host.locator('[data-save228]').click();
    await host.getByText(/Details saved/).waitFor();
    assert.equal(settings.accountEmail228,'new@example.test');
    assert.deepEqual(settings.receiptDrive228.active,active);
    console.log('PASS protected receipt settings, account conflict, retained edit and targeted save');
  } finally { await fixture.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
