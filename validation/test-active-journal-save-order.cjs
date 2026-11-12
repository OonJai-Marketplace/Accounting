const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture = await createFixture();
  try {
    const {page, login} = await fixture.open();
    await login();
    await page.waitForFunction(() => startup14257.interactive);
    const entries = await page.evaluate(async () => {
      switchTab('journal');
      const accounts = AccountingStore.accounts.filter(account => account.currency === 'LAK').slice(0, 2);
      const lines = accounts.map((account, i) => ({
        account_id: account.id, currency_code: 'LAK', debit: i ? 0 : 100, credit: i ? 100 : 0, fx_rate_lak: 1
      }));
      const entries = [];
      for (const [index, memo] of ['First save', 'Second save', 'Third save'].entries()) {
        const id = crypto.randomUUID();
        await journalDurable14385.create({p_request_key: id, p_transaction_date: index === 2 ? '2026-11-04' : '2026-11-05',
          p_memo: memo, p_prefix: 'OJM', p_digits: 4, p_lines: lines});
        const job = journalDurable14385.pending().find(job => job.id === id);
        entries.push({id, memo, number: job.localNumbers335[0], dbId: crypto.randomUUID()});
      }
      journalDurable14385.project();
      refreshAllTables();
      return entries;
    });

    const expected = entries.toReversed().map(entry => [entry.number, entry.memo]);
    const visible = () => page.locator('#tblJournalHistoryBody').evaluate(body =>
      [...body.querySelectorAll('.entry-id-stack')].map(stack => {
        const id = stack.closest('tr').dataset.entryId;
        const header = [...body.querySelectorAll('.journal-description14281')].find(row => row.dataset.entryId === id);
        return [stack.querySelector(':scope > span').textContent, header?.textContent];
      }));
    assert.deepEqual(await visible(), expected);
    let blockFirst = true;
    await page.route('**/rpc/post_device_journal335', route => {
      const {p_request_key, p_numbers} = route.request().postDataJSON();
      const entry = entries.find(item => item.id === p_request_key);
      assert.deepEqual(p_numbers, [entry.number]);
      if (blockFirst && entry === entries[0])
        return route.fulfill({status: 409, json: {code: 'P0001', message: 'Fixture first entry needs attention'}});
      return route.fulfill({json: [{entry_id: entry.dbId, entry_no: entry.number}]});
    });
    const syncEntry = id => page.evaluate(id => journalDurable14385.sync({targetId: id}), id);
    for (const entry of entries) {
      await syncEntry(entry.id);
      assert.deepEqual(await visible(), expected);
    }
    assert.deepEqual(await page.evaluate(() => journalDurable14385.pending().map(job => job.status)), ['blocked', 'saved', 'saved']);
    blockFirst = false;
    await syncEntry(entries[0].id);

    // Server timestamps reflect confirmation order. A later download must use the original save order.
    await page.evaluate(async entries => {
      const downloaded = JournalModule.entries.map(line => {
        const i = entries.findIndex(entry => entry.dbId === line.dbEntryId);
        const remote = {...line, created_at: '2026-11-12T10:00:0' + [3, 1, 2][i] + 'Z'};
        for (const key of ['local14333','localJournal14385','pendingSync','entryNumber','journalJob14385','journalIndex14385']) delete remote[key];
        return remote;
      });
      await journalDurable14385.reconcile(downloaded, journalDurable14385.retirementCheckpoint());
      JournalModule.entries = downloaded;
      refreshAllTables();
    }, entries);
    assert.deepEqual(await visible(), expected);
    console.log('PASS original journal numbers, descriptions and newest-save-first order across a failed first entry, partial sync and confirmed download.');

    const memo = await page.evaluate(async () => {
      showJournalEntry98();
      addJournalLineRow();
      const field = document.querySelector('#jeLinesBody tr:last-child .je-line-memo');
      await Promise.resolve(); // First DOM observer pass, before any timer or paint.
      const editor = field.nextElementSibling;
      if (!editor?.matches('.memo-link-text143187')) return {enhanced: false};
      field.value = 'Memo';
      const original = editor.firstChild;
      field.value = 'Memo';
      const sameTextNode = original === editor.firstChild;
      field.value = '';
      refreshAllTables();
      return {enhanced: true, sameTextNode, sameEditor: editor === field.nextElementSibling,
        placeholder: getComputedStyle(editor, '::before').content};
    });
    assert.equal(memo.enhanced, true);
    assert.equal(memo.sameEditor, true);
    assert.equal(memo.sameTextNode, true);
    assert.match(memo.placeholder, /Line note/);
    console.log('PASS new journal memo is enhanced before first paint and uses one placeholder across refreshes.');
  } finally {
    await fixture.close();
  }
})().catch(error => {console.error(error);process.exitCode = 1;});
