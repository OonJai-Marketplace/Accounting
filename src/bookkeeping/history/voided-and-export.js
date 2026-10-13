// ------------------------------------------------------------------------------
// RENDER: VOIDED & MODIFIED TRANSACTIONS AUDIT
// ------------------------------------------------------------------------------
function renderVoidedTransactionsTable() {
  const tbody = document.getElementById('voidedTransactionsBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const currencies = CurrencyStore.currencies || [];
  const totalCols = 5 + currencies.length;

  const displayRecords = isPrintMode ? [...JournalModule.voidedEntries].reverse() : JournalModule.voidedEntries;

  if (displayRecords.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalCols}" style="text-align: center; color: var(--text-muted); padding: 24px;">No voided or modified transactions recorded.</td></tr>`;
    return;
  }

  displayRecords.forEach(item => {
    // 1. Render Old Original Lines
    item.oldData.forEach(line => {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = "#fff8f8";
      const cleanAcc = getCleanAccountDisplay(line.account, line.currency);

      let crCols = '';
      currencies.forEach(c => {
        const isMatch = line.currency === c.code && line.credit > 0;
        crCols += `<td class="num" style="color: #991b1b;">${isMatch ? formatAppNumber(line.credit) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #991b1b;">
          <span class="badge-void-old">VOIDED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(line.currency)}" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #991b1b;">${line.debit > 0 ? formatAppNumber(line.debit) : '-'}</td>
        ${crCols}
      `;
      tbody.appendChild(tr);
    });

    // 2. Render New Replacement Lines
    item.newData.forEach(line => {
      const tr = document.createElement('tr');
      tr.style.backgroundColor = "#f0fdf4";
      const cleanAcc = getCleanAccountDisplay(line.account, line.currency);

      let crCols = '';
      currencies.forEach(c => {
        const isMatch = line.currency === c.code && line.credit > 0;
        crCols += `<td class="num" style="color: #065f46;">${isMatch ? formatAppNumber(line.credit) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #065f46;">
          <span class="badge-void-new">REVISED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(line.currency)}" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #065f46;">${line.debit > 0 ? formatAppNumber(line.debit) : '-'}</td>
        ${crCols}
      `;
      tbody.appendChild(tr);
    });

    const expTr = document.createElement('tr');
    expTr.className = 'cluster-explanation-row';
    expTr.innerHTML = `
      <td colspan="${totalCols}">
        <strong style="color: #991b1b; font-weight: 600;">Audit Reason:</strong> ${escapeHtml(item.explanation)}
        <span style="float: right; color: var(--text-muted); font-size: 11.5px;">Logged on: ${item.timestamp}</span>
      </td>
    `;
    tbody.appendChild(expTr);
  });
}

function getCurrentMonthPrefix() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function renderNewTransactionsTable() {
  const tbody = document.getElementById('newTransactionsBody');
  const currentMonth = getCurrentMonthPrefix();
  const newRecords = JournalModule.entries.filter(t => t.date.startsWith(currentMonth));
  renderTransactionRowsToTbody(tbody, newRecords, false);
}

function renderAllTransactionsTable() {
  const tbody = document.getElementById('allTransactionsBody');
  const currentMonth = getCurrentMonthPrefix();
  const archiveRecords = JournalModule.entries.filter(t => !t.date.startsWith(currentMonth));
  renderTransactionRowsToTbody(tbody, archiveRecords, false);
}

function exportJournalCSV() {
  const currencies = CurrencyStore.currencies || [];
  let crHeaders = currencies.map(c => `CR-${c.code}`).join(',');
  let csv = `Date,Entry ID,Account,Memo,Currency,DR,${crHeaders}\n`;

  // Download/export is chronological: oldest transaction first.
  const exportEntries = [...JournalModule.entries].sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    return dateCmp !== 0 ? dateCmp : String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
  });
  exportEntries.forEach(e => {
    let crValues = currencies.map(c => (e.currency === c.code && e.credit > 0) ? e.credit : 0).join(',');
    csv += `"${e.date}","${e.id}","${e.account}","${e.memo.replace(/"/g, '""')}","${e.currency}",${e.debit},${crValues}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `journal_transactions_${new Date().toISOString().split('T')[0]}.csv`;
  (window.exportCenter14337?exportCenter14337.fromLink(link):link.click());
  if(typeof showCenterStatus==='function')showCenterStatus('CSV export prepared for the Document Editor.');
}
