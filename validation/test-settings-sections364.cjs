const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function verify() {
  const fixture = await createFixture();
  try {
    const {page, login} = await fixture.open();
    await login();
    await page.waitForFunction(() => startup14257.interactive);
    await page.evaluate(() => switchTab('settings-system'));

    async function open(key) {
      const section = page.locator('#settingsSection143176-' + key);
      await page.evaluate(key => settingsStack143176.open(key), key);
      await section.waitFor({state:'visible'});
      await page.evaluate(() => window.status118?.clear());
      const overflow = await section.evaluate(n => n.scrollWidth - n.clientWidth);
      assert(overflow <= 2, key + ' overflow ' + overflow);
      return section;
    }
    async function boxes(locator) {
      return locator.evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
    }
    function aligned(row) {
      assert(Math.max(...row.map(r => r.top)) - Math.min(...row.map(r => r.top)) < 2, JSON.stringify(row));
    }

    const preferences = await open('preferences');
    const fields = preferences.locator('.settings-compact-grid>.settings-field');
    const fieldBoxes = await boxes(fields);
    assert.equal(fieldBoxes.length, 6);
    aligned(fieldBoxes.slice(0, 3));
    aligned(fieldBoxes.slice(3));
    assert(fieldBoxes[3].top > fieldBoxes[0].bottom);
    assert.deepEqual(await fields.evaluateAll(ns => ns.map(n => n.querySelector('select')?.name || n.id)),
      ['dateFormat','numberFormat','defaultLandingPage','archiveFrequency','fontSize','companyLogoSettings101']);
    const picker = page.waitForEvent('filechooser');
    await preferences.getByRole('button',{name:'Choose logo'}).click();
    assert.equal(await (await picker).element().getAttribute('id'), 'companyLogoUpload101');

    const print = await open('printing');
    assert(await print.getByRole('button',{name:'Choose header image'}).isVisible());
    assert(await print.getByRole('button',{name:'Choose footer image'}).isVisible());
    assert(await print.getByRole('button',{name:'Save Printing Settings'}).isVisible());
    assert(await print.locator('button[aria-label="Explain Printing Settings"]').isVisible());
    const banner = await open('appearance');
    assert(await banner.getByRole('button',{name:'Save banner'}).isVisible());

    const install = await open('installation');
    const installButton = install.getByRole('button',{name:'Install Accounting',exact:true});
    assert.equal(await install.locator('.installation-setting-row:last-child button').getAttribute('data-accounting-install'), '');
    await installButton.click();
    const dialog = page.locator('#accountingInstallDialog205');
    await dialog.waitFor({state:'visible'});
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    assert.equal(await page.locator('[data-jump143176]').filter({hasText:/^(Protocols|Accounting app)$/i}).count(), 0);

    const accounting = await open('accounting');
    await accounting.locator('.settings-stack-prefix143176>summary').click();
    assert(await accounting.locator('#numberPolicy89').isVisible());
    const currency = await open('currency');
    assert(await currency.getByRole('button',{name:/Add Currency/}).isVisible());
    const drive = await open('google');
    assert.equal(await drive.locator('[data-sheet]').count(), 0);
    assert.equal(await drive.locator('.receipt-drive228').evaluate(n => !!n.closest('details')), false);
    const buttons = await boxes(drive.locator('.receipt-drive228 .je-actions-bar button:visible'));
    assert.equal(buttons.length, 4);
    for (let i=1; i<buttons.length; i++) {
      if (Math.abs(buttons[i].top - buttons[i-1].top) < 2) {
        const gap = buttons[i].left - buttons[i-1].right;
        assert(gap >= 3 && gap <= 12, 'Receipt action gap ' + gap);
      }
    }

    const payroll = await open('payroll');
    const actions = payroll.locator('#legendSettings95 .attendance-setting-actions button');
    assert.equal(await actions.count(), 2);
    await payroll.getByRole('button',{name:'Legend Settings'}).click();
    await page.locator('#legend95').waitFor({state:'visible'});
    await page.locator('#legend95 header button[aria-label="Close"]').click();
    await payroll.locator('[data-calendar99]').click();
    const schedule = page.locator('dialog').filter({hasText:'Company work schedule'});
    await schedule.waitFor({state:'visible'});
    assert(await schedule.getByRole('checkbox',{name:'Sunday working'}).isVisible());
    await schedule.getByRole('button',{name:'Close',exact:true}).click();
    const tax = await open('mandatory');
    aligned(await boxes(tax.locator('.settings-vat-grid>.settings-field')));
    const table = await tax.locator('.statutory-bracket-table').boundingBox();
    assert(table.width <= 581);
    assert.equal(await tax.getByRole('button',{name:/Open Profit Tax/}).count(), 0);
    await open('vouchers');
    await open('recovery');
    await open('preferences');
    console.log('PASS Settings sections, file chooser, installation dialog, layout and navigation at device width', await page.evaluate(() => innerWidth));
  } finally {
    await fixture.close();
  }
}

verify().catch(error => {console.error(error);process.exitCode=1;});
