const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await createFixture();
 try {
  const {page, login} = await fixture.open();
  await login();
  await page.evaluate(() => switchTab('report-gl'));
  await page.waitForFunction(() => startup14257.isPrepared('journal'));
  const entries = await page.evaluate(() => ['expense', 'bank'].map((name, i) => ({
   id: 'SIGN-TEST', date: Accounts69.from, accountId: 'sign-' + name, account: name, currency: 'LAK',
   debit: i ? 0 : 1234.5, credit: i ? 1234.5 : 0, status: 'posted'
  })));
  fixture.fixture.journal = entries;
  const reports = await page.evaluate(async entries => {
   for (const [i, entry] of entries.entries()) {
    AccountingStore.accounts.push({id: entry.accountId, code: String(1100 + i), name: entry.account,
     currency: 'LAK', type: i ? 'ASSET' : 'EXPENSE', isPosting: true, active: true});
   }
   JournalModule.entries.push(...entries);
   Object.assign(Reports79, {from: entries[0].date, to: entries[0].date, mode: 'custom',
    currency: 'LAK', basis: 'original', account: '', selectedMonths14331: null, allMonths14331: false});
   await reportWindow143195.refresh();
   const text = html => {
    const root = document.createElement('div');
    root.innerHTML = html;
    return root.textContent;
   };
   const result = {};
   for (const kind of ['gl', 'activity', 'tb', 'bs']) {
    Reports79.kind = kind;
    result[kind] = {screen: text(reportContent79(kind)), print: text(reportFormats14282.financial(kind))};
   }
   const bank = accountData69().filter(r => r.account.id === 'sign-bank');
   result.ledger = text(ledgerHtml69(bank));
   const trial = document.createElement('div');
   trial.innerHTML = trialHtml69(bank);
   const table = trial.querySelector('table');
   const creditColumn = [...table.tHead.rows[0].cells].findIndex(c => c.textContent === 'Closing CR');
   result.creditClosing = table.tBodies[0].rows[0].cells[creditColumn].textContent;
   result.formats = ['1,234.56','1.234,56','1 234,56'].map(style => {
    ApplicationSettings.system.numberFormat = style;
    return [parseReportAmount69(money69(-123450)), parseReportAmount69(balanceText69(-123450))];
   });
   return result;
  }, entries);
  for (const kind of ['gl', 'activity', 'tb', 'bs']) {
   for (const [view, content] of Object.entries(reports[kind])) {
    assert(content.includes('(1,234.50)'), kind + ' ' + view + ' loses the negative sign');
   }
  }
  assert(reports.gl.screen.includes('(1,234.50) CR'));
  assert(reports.tb.screen.includes('CR'));
  assert(reports.gl.screen.includes('1,234.50 DR'));
  assert(reports.ledger.includes('(1,234.50)'));
  assert.equal(reports.creditClosing, '(1,234.50)');
  assert.deepEqual(reports.formats, Array(3).fill([-1234.5,-1234.5]));
  console.log('PASS signed negative balances on account ledgers, report screens, print views and locale-specific report totals');
 } finally { await fixture.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
