const assert = require('node:assert/strict');
const fs = require('node:fs');
const create = require('./phase0-browser-fixture.cjs');

(async () => {
  const f = await create();
  try {
    const {page, login} = await f.open();
    const detailDates = Array.from({length:47}, (_, i) => i === 46 ? '2026-10-30' : '2026-10-' + String(1 + Math.floor(i / 2)).padStart(2, '0'));
    const make = (id, date, dates, created) => dates.map((detail, i) => ({
      id, dbEntryId:'entry-' + id, postingDate:date, date:detail, created_at:created,
      account:'Test expense', accountId:'test-account', currency:'LAK', memo:'Detail ' + i,
      generalMemo:'October test journal', debit:i === dates.length - 1 ? 0 : 100,
      credit:i === dates.length - 1 ? (dates.length - 1) * 100 : 0, archived:false
    }));
    const rows = process.env.JOURNAL_ORDER_FIXTURE
      ? JSON.parse(fs.readFileSync(process.env.JOURNAL_ORDER_FIXTURE, 'utf8'))
      : [...make('OJM260364', '2026-10-30', detailDates, '2026-11-03T14:23:07Z'),
         ...make('OJM260363', '2026-10-28', Array(106).fill('2026-10-28'), '2026-11-03T06:33:22Z'),
         ...make('OJM260362', '2026-10-30', ['2026-10-30', '2026-10-30'], '2026-11-02T06:00:00Z')];
    const original = JSON.stringify(rows);
    f.fixture.journal = rows;
    f.fixture.journalRevision = 'posting-order266';
    f.fixture.tables.accounting_periods = [{period_month:'2026-10-01', status:'open'}];
    await login();
    await page.waitForFunction(() => !window.idleSync14341?.running);
    await page.evaluate(() => { switchTab('journal'); refreshAllTables(); });
    const body = page.locator('#tblJournalHistoryBody');
    const first = await body.locator('tr[data-entry-id]').first().getAttribute('data-entry-id');
    assert.equal(first, 'OJM260364', 'new multi-date journal belongs first by its main posting date, not its first detail date');
    assert.equal(await body.locator('tr[data-entry-id="OJM260364"]:not(.journal-description14281)').count(), 47);
    const loaded = await page.evaluate(() => JournalModule.entries.filter(r => r.id === 'OJM260364').map(r => ({date:r.date, postingDate:r.postingDate, debit:r.debit, credit:r.credit, memo:r.memo})));
    assert.deepEqual(loaded, rows.filter(r => r.id === 'OJM260364').map(r => ({date:r.date, postingDate:r.postingDate, debit:r.debit, credit:r.credit, memo:r.memo})));
    const pager = page.locator('#tblJournalHistoryBody').locator('xpath=ancestor::div[contains(@class,"table-container")]/following-sibling::div[contains(@class,"transaction-pages14340")]').first();
    const seen = new Set();
    for (;;) {
      const keys = await body.locator('tr[data-entry-id]:not(.journal-description14281)').evaluateAll(nodes => nodes.map(n => n.dataset.entryId + ':' + n.dataset.lineIndex));
      for (const key of keys) { assert(!seen.has(key), 'pagination repeats journal line ' + key); seen.add(key); }
      if (await pager.getByRole('button', {name:'Next', exact:true}).isDisabled()) break;
      await pager.getByRole('button', {name:'Next', exact:true}).click();
    }
    assert.equal(seen.size, rows.length, 'every detail remains reachable across pages');
    await page.locator('#jeSearchInput').click();
    await page.locator('#jeSearchInput').fill('0364');
    assert.equal(await body.locator('tr[data-entry-id="OJM260364"]:not(.journal-description14281)').count(), 47);
    await page.evaluate(() => { document.getElementById('jeSearchInput').value=''; filterJournalHistory(); });
    assert.equal(await body.locator('tr[data-entry-id]').first().getAttribute('data-entry-id'), 'OJM260364');
    if (process.env.JOURNAL_ORDER_SCREENSHOT) await page.screenshot({path:process.env.JOURNAL_ORDER_SCREENSHOT});
    assert.equal(JSON.stringify(rows), original, 'display must not rewrite source records');
    // Old cached rows without a postingDate continue to use their saved date.
    const fallback = await page.evaluate(() => {
      const records = ['2026-10-01','2026-10-28'].map((date, i) => ({...JournalModule.entries[0], id:'OLD'+i, date, postingDate:undefined}));
      renderTransactionReviewTable(document.getElementById('tblJournalHistoryBody'), records, 'edit');
      return document.querySelector('#tblJournalHistoryBody tr[data-entry-id]').dataset.entryId;
    });
    assert.equal(fallback, 'OLD1');
    console.log('PASS main-date journal order, 47 preserved detail lines, complete pagination, ID search, and old-cache fallback');
  } finally { await f.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
