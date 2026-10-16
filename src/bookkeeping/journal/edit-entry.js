// ------------------------------------------------------------------------------
// EDIT IN-PLACE: LOAD EXISTING DATA INTO POST FORM
// ------------------------------------------------------------------------------
function loadEntryForEdit(entryId) {
  const lines = JournalModule.entries.filter(t => t.id === entryId);
  if (!lines || lines.length === 0) return;
  if (lines.some(line => line.archived)) {
    showAppNotification('Archived Period', 'Archived transactions cannot be edited directly. Use Review to create an adjustment.', true);
    return;
  }

  switchTab('journal');

  JournalModule.editingEntryId = entryId;
  updateNextEntryIdDisplay();

  const postCard = document.querySelector('.je-card');
  if (postCard) postCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('jeTransDate').value = lines[0].date;
  document.getElementById('jeGeneralMemo').value = lines[0].generalMemo ?? lines[0].memo;

  const btnPost = document.getElementById('btnPostJournal');
  if (btnPost) btnPost.textContent = "Update Entry";

  const tbody = document.getElementById('jeLinesBody');
  tbody.innerHTML = '';

  lines.forEach(line => {
    const matches = AccountingStore.accounts.filter(a => a.name === line.account && a.currency === line.currency);
    const matched = AccountingStore.accounts.find(a => (line.accountId && a.id === line.accountId) || (line.accountCode && a.code === line.accountCode)) || (matches.length === 1 ? matches[0] : getSelectedAccountInfo(line.account));
    const accStr = matched && matched.currency === line.currency ? `${matched.code} — ${matched.name}` : `${line.account} (${line.currency})`;
    const drStr = line.debit > 0 ? formatAppNumber(line.debit) : '';
    const crMap = {};
    if (line.credit > 0) crMap[line.currency] = formatAppNumber(line.credit);

    addJournalLineRow(accStr, line.memo, drStr, crMap);

    tbody.lastElementChild.dataset.bookRate14383=line.book_rate_lak||'';
    tbody.lastElementChild.dataset.fxRate14383=line.fx_rate_lak||'';
  });


  window.JournalFX14383?.restore(Object.fromEntries(lines.map(l=>[l.currency,l.fx_rate_lak])));
  calculateJournalBalance();
}

