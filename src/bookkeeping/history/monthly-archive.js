function monthKeyFromDate(date) { return String(date || '').slice(0, 7); }
function monthLabel(monthKey) {
  const [y,m] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

async function archiveTransactionMonth(monthKey) {
  const owner=liveProfile?.id;
  const ids = new Set(JournalModule.entries.filter(e => monthKeyFromDate(e.date) === monthKey && !e.archived).map(e => e.id));
  if (!ids.size) return;
  if (!await ui117.confirm(`Archive all unarchived transactions for ${monthLabel(monthKey)}? This closes that monthly batch and moves it to All Transactions.`)) return;
  if(liveProfile?.id!==owner)return;
  const stamp = new Date().toISOString();
  JournalModule.entries.forEach(e => {
    if (ids.has(e.id)) { e.archived = true; e.archivedAt = stamp; }
  });
  refreshAllTables();
  showAppNotification('Month Archived', `${monthLabel(monthKey)} was submitted to the historical archive.`, false);
}

function renderNewTransactionsTable() {
  const container = document.getElementById('newTransactionsGroupedContainer');
  if (!container) return;
  container.innerHTML = '';
  const records = JournalModule.entries.filter(e => !e.archived);
  const months = [...new Set(records.map(e => monthKeyFromDate(e.date)))].sort().reverse();
  const currentMonth = getCurrentMonthPrefix();
  if (!months.length) {
    container.innerHTML = '<div class="empty-archive-state">No unarchived transactions. All posted monthly batches have been submitted to the archive.</div>';
    return;
  }
  months.forEach(month => {
    const card = document.createElement('section');
    card.className = `monthly-unarchived-cluster ${month === currentMonth ? 'current-month-cluster' : 'overdue-month-cluster'}`;
    const status = month === currentMonth ? '<span class="archive-status current">CURRENT MONTH</span>' : '<span class="archive-status overdue">UNARCHIVED</span>';
    card.innerHTML = `
      <div class="monthly-cluster-header">
        <div><h4>New Transactions — ${monthLabel(month)}</h4>${status}</div>
        <button type="button" class="je-btn je-btn-emerald no-print" onclick="archiveTransactionMonth('${month}')">Submit for Archiving</button>
      </div>
      <div class="table-container"><table class="clustered-journal-table"><thead><tr class="general-master-header"></tr></thead><tbody></tbody></table></div>`;
    container.appendChild(card);
    const header = card.querySelector('thead tr');
    const currencies = CurrencyStore.currencies || [];
    header.innerHTML = `<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="num">Debit</th>${currencies.map(c=>`<th class="num">Credit-${c.code}</th>`).join('')}`;
    renderTransactionRowsToTbody(card.querySelector('tbody'), records.filter(e => monthKeyFromDate(e.date) === month), false);
  });
}

function renderJournalHistoryTable(records = JournalModule.entries) {
  const tbody = document.getElementById('tblJournalHistoryBody');
  const currentMonth = getCurrentMonthPrefix();
  renderTransactionRowsToTbody(tbody, records.filter(e => monthKeyFromDate(e.date) === currentMonth), true);
}

function renderAllTransactionsTable() {
  const tbody = document.getElementById('allTransactionsBody');
  const archived = JournalModule.entries.filter(e => e.archived);
  renderTransactionRowsToTbody(tbody, archived, false);
}

// Preserve archive status when editing an existing entry.
const originalFinalizeEditReasonV3 = typeof finalizeEditReason === 'function' ? finalizeEditReason : null;
if (originalFinalizeEditReasonV3) {
  finalizeEditReason = function() {
    const editingId = JournalModule.editingEntryId;
    const archived = JournalModule.entries.find(e => e.id === editingId)?.archived || false;
    const archivedAt = JournalModule.entries.find(e => e.id === editingId)?.archivedAt || '';
    originalFinalizeEditReasonV3();
    JournalModule.entries.filter(e => e.id === editingId).forEach(e => { e.archived = archived; e.archivedAt = archivedAt; });
  };
}

