// Load the one-time reconstruction only when an administrator opens this action.
window.openForeignAccountReview2026 = async function (postingResult = '') {
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
  const retirement = data.retirement || [];
  const activeMappings = retirement.filter(a => a.active);
  const approvedMonths = data.months.filter(m => m.status === 'closed' &&
    m.month >= '2026-01-01' && m.month <= '2026-09-01' &&
    m.journals.every(j => j.result === 'In correction'));
  const approvedCount = approvedMonths.reduce((count, m) => count + m.journals.length, 0);
  const october = data.months.find(m => m.month === '2026-10-01');
  const november = data.months.find(m => m.month === '2026-11-01');
  const linkedRent = november?.journals.find(j => j.number === 'AMO26-000004');
  const octoberGroup = october && linkedRent ? [...october.journals, linkedRent] : [];
  const postOctober = data.octoberRestored && octoberGroup.length === 8 &&
    octoberGroup.some(j => j.result !== 'Applied');
  const retirementRows = retirement.map(a => '<tr><td>' + esc(a.code) + '</td><td>' +
    esc(a.replacement) + '</td><td>' + (a.active ? 'Active' : 'Inactive') + '</td></tr>').join('');
  const chartRows = data.chart.map(a => '<tr><td>' + esc(a.code) + '</td><td>' + esc(a.name) +
    '</td><td>' + esc(a.deferred ? 'Deferred' : a.created ? 'Created' : 'Prepared') + '</td></tr>').join('');
  const months = data.months.map(m => {
    const ready = m.journals.filter(j => j.result === 'Prepared').length;
    const staged = m.journals.some(j => j.result === 'In correction');
    const detail = m.journals.map(j => '<tr><td>' + esc(j.number) + '</td><td>' + esc(j.old) +
      ' → ' + esc(j.new) + '</td><td>' + esc(j.result) + '</td></tr>').join('');
    const grouped = postOctober && (m === october || m === november);
    const action = ready && !grouped ? '<button type="button" class="je-btn je-btn-emerald" data-prepare="' + esc(m.month) + '">' +
      (m.status === 'open' ? 'Apply open journals' : 'Stage corrections') + '</button>' : '';
    const review = staged && !grouped ? '<button type="button" class="je-btn je-btn-secondary" data-finish="' +
      esc(m.month) + '">Review and close</button>' : '';
    return '<details><summary>' + esc(m.month.slice(0, 7)) + ' · ' + esc(m.status) + ' · ' +
      m.journals.length + ' journals</summary><table><thead><tr><th>Journal</th><th>Lines</th><th>Status</th></tr></thead><tbody>' +
      detail + '</tbody></table>' + action + review + '</details>';
  }).join('');
  const content = '<div class="group-manager143180"><details><summary>Chart of accounts</summary>' +
    '<table><thead><tr><th>Code</th><th>Regular account</th><th>Status</th></tr></thead><tbody>' + chartRows +
    '</tbody></table></details>' + (next.length ? '<button class="je-btn je-btn-emerald" type="button" data-chart>Create ' +
      next.length + ' regular accounts</button>' : '') + (retirementRows ?
      '<details><summary>Unused mapping accounts · ' + (retirement.length - activeMappings.length) + ' of ' +
      retirement.length + ' inactive</summary><table><thead><tr><th>Mapping account</th><th>Replacement</th>' +
      '<th>Status</th></tr></thead><tbody>' + retirementRows + '</tbody></table></details>' : '') +
    (!next.length && activeMappings.length ? '<button class="je-btn je-btn-secondary" type="button" data-retire>Deactivate ' +
      activeMappings.length + ' unused mapping accounts</button>' : '') +
    (approvedCount ? '<button class="je-btn je-btn-emerald" type="button" data-post-reviewed>Post ' +
      approvedCount + ' approved journals</button>' : '') +
    (data.canRestoreOctober ? '<button class="je-btn je-btn-primary" type="button" data-restore-october>Restore October to Closed</button>' : '') +
    (postOctober ? '<button class="je-btn je-btn-emerald" type="button" data-post-october>Post 8 approved October and November journals</button>' : '') +
    months + '<p role="status">' +
      (typeof postingResult === 'string' ? esc(postingResult) : '') + '</p></div>';
  const closed = ui108.modal('Foreign-currency reclassification', content, [{label:'Close',value:false}]);
  const overlay = document.querySelector('.ui-overlay108:last-child');
  let busy = false;
  overlay.addEventListener('click', async event => {
    const button = event.target.closest('[data-chart],[data-retire],[data-prepare],[data-finish],[data-post-reviewed],[data-restore-october],[data-post-october]');
    if (!button || busy || !valid()) return;
    busy = true;
    button.disabled = true;
    const status = overlay.querySelector('[role="status"]');
    async function reloadReview(message) {
      if (!valid() || !overlay.isConnected) return;
      window.yearWindow14333?.invalidateMemory();
      await window.workflow136.reload();
      if (!valid() || !overlay.isConnected) return;
      overlay.resolve108(false);
      await window.openForeignAccountReview2026(message);
    }
    status.textContent = 'Checking the current ledger…';
    try {
      const month = button.dataset.prepare || button.dataset.finish;
      if (button.hasAttribute('data-restore-october')) {
        const result = await call('restore_october_monthly_close_2026');
        if (result?.status !== 'closed') throw Error('Reopen the chart to verify the October close.');
        await reloadReview('October is closed. The eight saved reconciliations were verified.');
        return;
      } else if (button.hasAttribute('data-post-october')) {
        const result = await call('post_approved_october_and_november_2026');
        if (result?.journals?.length !== octoberGroup.length ||
            !octoberGroup.every(j => result.journals.includes(j.number))) {
          throw Error('Reopen the chart to verify the posting result.');
        }
        await reloadReview('All 8 approved journals posted on their original IDs. October is closed.');
        return;
      } else if (button.hasAttribute('data-post-reviewed')) {
        const failures = [];
        let posted = 0;
        for (const item of approvedMonths) {
          if (!valid() || !overlay.isConnected) return;
          const label = item.month.slice(0, 7);
          status.textContent = posted + ' posted. Checking ' + label + '…';
          try {
            const result = await call('post_reviewed_foreign_month_2026', {p_month:item.month});
            if (!Array.isArray(result?.journals) || result.journals.length !== item.journals.length ||
                !item.journals.every(j => result.journals.includes(j.number)) ||
                !(result.posted === item.journals.length || result.alreadyPosted === true)) {
              throw Error('Reopen the review to verify the posting result.');
            }
            posted += result.journals.length;
          } catch (error) {
            failures.push(label + ' — ' + (error.message || 'Posting could not be confirmed.'));
          }
        }
        await reloadReview([posted + ' approved journals posted.', ...failures].join(' '));
        return;
      } else if (button.hasAttribute('data-chart')) {
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
