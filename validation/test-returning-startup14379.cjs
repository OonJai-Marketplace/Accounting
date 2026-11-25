const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  let releaseRevision;
  try {
    const { page, login } = await fixture.open();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await login();
    const full = await page.evaluate(() => ({
      restoring: startup14257.restoring,
      ready: ['journal', 'reports', 'payroll', 'documents'].every(name => startup14257.isPrepared(name)),
      screens: workspaceViews14364.state().prepared
    }));
    assert.equal(full.restoring, false);
    assert(full.ready && full.screens.includes('payroll-overview'));

    await page.evaluate(() => switchTab('journal'));
    await page.locator('#jeSearchInput').pressSequentially('Saved journal filter');
    // Expire the access token while retaining the device's unlock and refresh token.
    await page.evaluate(() => {
      const key = 'sb-' + new URL(window.OJM_SUPABASE_URL).hostname.split('.')[0] + '-auth-token';
      const token = JSON.parse(localStorage.getItem(key));
      assertSession(token);
      token.expires_at = Math.floor(Date.now() / 1000) - 60;
      localStorage.setItem(key, JSON.stringify(token));
      function assertSession(value) { if (!value?.refresh_token) throw Error('Fixture session unavailable'); }
    });

    let revisionStarted;
    const revisionRequest = new Promise(resolve => { revisionStarted = resolve; });
    const pending = new Promise(resolve => { releaseRevision = resolve; });
    await page.route('**/rest/v1/rpc/journal_window14333', async route => {
      if (route.request().postDataJSON().p_offset === 1) {
        revisionStarted();
        await pending;
      }
      await route.continue();
    });
    fixture.requests.length = 0;
    await page.reload();
    await page.waitForFunction(() => startup14257.interactive && startup14257.prepared);
    const returned = await page.evaluate(() => ({
      view: Location69.view,
      authenticated: document.getElementById('loginGate').classList.contains('is-authenticated'),
      restoring: startup14257.restoring,
      journal: startup14257.isPrepared('journal'),
      unrelated: ['reports', 'payroll', 'documents'].some(name => startup14257.isPrepared(name)),
      screens: workspaceViews14364.state().prepared,
      query: document.getElementById('jeSearchInput').value
    }));
    assert.deepEqual(returned, {
      view: 'journal', authenticated: true, restoring: true, journal: true,
      unrelated: false, screens: ['journal'], query: 'Saved journal filter'
    });
    assert(fixture.requests.some(url => url.includes('grant_type=refresh_token')));
    assert(!fixture.requests.some(url => url.includes('grant_type=password')));
    assert(!fixture.requests.some(url => /payroll_window14334|company_documents105/.test(url)));
    await Promise.race([revisionRequest, page.waitForTimeout(5000).then(() => { throw Error('Journal revision check did not start'); })]);

    await page.evaluate(() => switchTab('payroll-overview'));
    await page.waitForFunction(() => Location69.view === 'payroll-overview' && startup14257.interactive &&
      startup14257.isPrepared('payroll') && !document.body.classList.contains('startup-pending1443'));
    releaseRevision();
    assert.equal(await page.evaluate(() => Location69.view), 'payroll-overview');

    await page.evaluate(() => switchTab('journal'));
    await page.waitForFunction(() => Location69.view === 'journal' && startup14257.interactive);
    assert.equal(await page.locator('#jeSearchInput').inputValue(), 'Saved journal filter');
    assert.deepEqual(errors, []);
    console.log('PASS fresh sign-in, token renewal, saved Journal, and on-demand navigation during a pending check');
  } finally {
    releaseRevision?.();
    await fixture.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
