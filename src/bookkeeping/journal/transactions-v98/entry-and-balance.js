  window.showJournalEntry98 = function (show = true, scroll = true) {
    const form = byId('journalEntry98');
    if (!form) return;
    form.hidden = false;
    const button = byId('addEntry98');
    button?.setAttribute('aria-expanded', String(show));
    if (button && button.textContent !== '+ Add Entry') button.textContent = '+ Add Entry';
    if (show && scroll) requestAnimationFrame(() => form.scrollIntoView({behavior:'smooth', block:'start'}));
  };
  function syncTitle() {
    const active = document.querySelector('.tab-content.active');
    const transaction = !!active?.closest('#transactions-module') || ['user-entry-review','period-review'].includes(active?.id);
    if (byId('transactionsHeading98')) byId('transactionsHeading98').hidden = !transaction;
  }
  const switchBefore = window.switchTab;
  window.switchTab = function (...args) { const result = switchBefore.apply(this,args); syncTitle(); return result; };

  // Editing and prepared submissions must reveal the form even when Add Entry is collapsed.
  for (const name of ['loadEntryForEdit','startFindingAdjustment','prepareComparedForm69','applyTemplate']) {
    const before = window[name];
    if (typeof before !== 'function') continue;
    window[name] = function (...args) {
      const result = before.apply(this,args);
      if (name !== 'loadEntryForEdit' || JournalModule.editingEntryId) showJournalEntry98();
      return result;
    };
  }
  const addBefore = window.addJournalLineRow;
  window.addJournalLineRow = function (...args) {
    const result = addBefore.apply(this,args);
    if (args[0]) showJournalEntry98(true,false);
    return result;
  };
  window.calculateJournalBalance = function () {
    const badge = byId('jeBalanceIndicator'), post = byId('btnPostJournal');
    if (!badge || !byId('jeLinesBody')) return;
    document.querySelectorAll('#jeLinesBody .je-line-acc').forEach(updateJournalAccountBadge);
    const state = getMultiDateJournalState();
    const lines = Object.values(state.grouped).flatMap(g => g.lines);
    const empty = !lines.some(l => l.debit || l.credit);
    badge.hidden = empty;
    const difference = state.differences[0];
    let label = '✓ Balanced', description = 'Debits equal credits in each currency.';
    if (state.errors.length) { label = 'Check entry'; description = state.errors.join('\n'); }
    else if (empty) { label = 'No amounts entered'; description = 'Enter a debit and a credit.'; }
    else if (difference) {
      label = `Difference: ${difference.currency} ${formatAppNumber(Math.abs(difference.debit-difference.credit))}`;
      description = state.differences.map(d => `${d.date} · ${d.currency}: ${formatAppNumber(Math.abs(d.debit-d.credit))}`).join('\n');
    }
    const invalid = empty || !!difference || !!state.errors.length;
    if (badge.textContent !== label) badge.textContent = label;
    badge.title = description;
    badge.setAttribute('aria-label', `${label}. ${description}`);
    badge.className = 'je-status-badge ' + (invalid ? 'unbalanced' : 'balanced');
    if (post) post.disabled = invalid;
  };

