// Load the one-time reconstruction only when an administrator opens this action.
window.openForeignAccountReview2026 = async function () {
  const db = ojmDb, actor = liveProfile?.id;
  const valid = () => db === ojmDb && actor === liveProfile?.id &&
    window.AccountGroups143180?.canEdit() && !window.workspaceRequest138?.target;
  if (!valid()) return;
  async function call(name, args = {}) {
    if (!valid()) throw Error('The accounting session changed. Reopen the chart.');
    if (!navigator.onLine) throw Error('Connect to review these posted journals.');
    const response = await db.rpc(name, args);
    if (!valid()) throw Error('The accounting session changed. Reopen the chart.');
    if (response.error) throw response.error;
    return response.data;
  }
  const data = await call('foreign_account_review_2026');
  if (!data.chart?.length) throw Error('There is no prepared chart reclassification.');
  const esc = value => escapeHtml(String(value ?? ''));
  const next = data.chart.filter(a => !a.deferred && !a.created);
  const unusedThb = ['9212', '9234', '9242'];
  const canRetire = !next.length && AccountingStore.accounts.some(a => unusedThb.includes(a.code) && a.active !== false);
  const chartRows = data.chart.map(a => '<tr><td>' + esc(a.code) + '</td><td>' + esc(a.name) +
    '</td><td>' + esc(a.deferred ? 'Deferred' : a.created ? 'Created' : 'Prepared') + '</td></tr>').join('');
  const months = data.months.map(m => {
    const ready = m.journals.filter(j => j.result === 'Prepared').length;
    const staged = m.journals.some(j => j.result === 'In correction');
    const detail = m.journals.map(j => '<tr><td>' + esc(j.number) + '</td><td>' + esc(j.old) +
      ' → ' + esc(j.new) + '</td><td>' + esc(j.result) + '</td></tr>').join('');
    const action = ready ? '<button type="button" class="je-btn je-btn-emerald" data-prepare="' + esc(m.month) + '">' +
      (m.status === 'open' ? 'Apply open journals' : 'Stage corrections') + '</button>' : '';
    const review = staged ? '<button type="button" class="je-btn je-btn-secondary" data-finish="' +
      esc(m.month) + '">Review and close</button>' : '';
    return '<details><summary>' + esc(m.month.slice(0, 7)) + ' · ' + esc(m.status) + ' · ' +
      m.journals.length + ' journals</summary><table><thead><tr><th>Journal</th><th>Lines</th><th>Status</th></tr></thead><tbody>' +
      detail + '</tbody></table>' + action + review + '</details>';
  }).join('');
  const content = '<div class="group-manager143180"><details><summary>Chart of accounts</summary>' +
    '<table><thead><tr><th>Code</th><th>Regular account</th><th>Status</th></tr></thead><tbody>' + chartRows +
    '</tbody></table></details>' + (next.length ? '<button class="je-btn je-btn-emerald" type="button" data-chart>Create ' +
      next.length + ' regular accounts</button>' : '') + (canRetire ?
      '<button class="je-btn je-btn-secondary" type="button" data-retire>Retire unused THB mappings</button>' : '') +
    months + '<p role="status"></p></div>';
  const closed = ui108.modal('Foreign-currency reclassification', content, [{label:'Close',value:false}]);
  const overlay = document.querySelector('.ui-overlay108:last-child');
  let busy = false;
  overlay.addEventListener('click', async event => {
    const button = event.target.closest('[data-chart],[data-retire],[data-prepare],[data-finish]');
    if (!button || busy || !valid()) return;
    busy = true;
    button.disabled = true;
    const status = overlay.querySelector('[role="status"]');
    status.textContent = 'Checking the current ledger…';
    try {
      const month = button.dataset.prepare || button.dataset.finish;
      if (button.hasAttribute('data-chart')) {
        await call('prepare_foreign_chart_2026');
      } else if (button.hasAttribute('data-retire')) {
        await call('retire_unused_foreign_mappings_2026');
      } else if (button.hasAttribute('data-prepare')) {
        await call('prepare_foreign_journal_month_2026', {p_month:month});
      }
      if (!valid()) return;
      if (button.hasAttribute('data-chart') || button.hasAttribute('data-retire')) {
        window.AccountSheet143191?.changed({owner:actor, db});
      }
      await loadReferenceDataFromSupabase({databaseOnly:true});
      if (!valid()) return;
      await window.AccountGroups143180.load(true);
      if (!valid()) return;
      if (month) {
        window.yearWindow14333?.invalidateMemory();
        await window.workflow136.reload();
      }
      if (!valid() || !overlay.isConnected) return;
      overlay.resolve108(false);
      if (button.hasAttribute('data-finish')) {
        await window.workflow136.finishSession(month.slice(0,7),false);
      } else {
        await window.openForeignAccountReview2026();
      }
    } catch (error) {
      if (valid()) status.textContent = error.message || 'Reopen the review to check the saved result.';
    } finally {
      busy = false;
      button.disabled = false;
    }
  });
  await closed;
};
