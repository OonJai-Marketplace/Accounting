// ==============================================================================


// ==============================================================================
// JS 4: JOURNAL ENTRY FORM CONTROLLER & LIVE BALANCING
// ==============================================================================
function setTransactionDateToToday(force = false) {
  const dateInput = document.getElementById('jeTransDate');
  if (!dateInput) return;
  if (force || !dateInput.value) {
    const now = new Date();
    const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    dateInput.value = localDate;
  }
}

function resetJournalLinesForm() {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  setTransactionDateToToday();
  addJournalLineRow();
  addJournalLineRow();
  calculateJournalBalance();
}

function addJournalLineRow(accountVal = '', memoVal = '', drVal = '', crMap = {}) {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;

  const currencies = CurrencyStore.currencies || [];
  let crInputs = '';
  currencies.forEach(c => {
    const val = crMap[c.code] || '';
    crInputs += `
      <td>
        <input type="text" class="num je-line-cr" data-currency="${escapeHtml(c.code)}" placeholder="0.00" value="${escapeHtml(val)}"
          onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
      </td>
    `;
  });

  const tr = document.createElement('tr');
  // Account first, then Memo
  tr.innerHTML = `
    <td>
      <input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" value="${escapeHtml(accountVal)}" />
    </td>
    <td>
      <input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${escapeHtml(String(memoVal))}" />
    </td>
    <td>
      <input type="text" class="num je-line-dr" placeholder="0.00" value="${escapeHtml(drVal)}"
        onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
    </td>
    ${crInputs}
    <td class="action-col no-print" style="text-align: center;">
      <button type="button" class="je-btn-del" style="width: 22px; height: 22px; font-size: 11px;" data-permission-action1440="edit" onclick="removeJournalLineRow(this)">✕</button>
    </td>
  `;
  tbody.appendChild(tr);
  calculateJournalBalance();
}

function removeJournalLineRow(btn) {
  const tbody = document.getElementById('jeLinesBody');
  if (tbody.querySelectorAll('tr').length <= 2) {
    showAppNotification("Action Blocked", "A double-entry transaction requires at least 2 lines.", true);
    return;
  }
  btn.closest('tr').remove();
  calculateJournalBalance();
}

function formatNumber(input) {
  const val = parseCleanNumber(input.value);
  input.value = val > 0 ? formatAppNumber(val) : '';
}

function unformatNumber(input) {
  // Keep grouping visible when returning to edit; the shared input formatter owns it.
  if(input&&input.value)window.formatAppNumberEditing?.(input);
}

function parseCleanNumber(val) {
  if (!val) return 0;
  const num = parseAppNumber(val);
  return Number.isFinite(num) ? num : 0;
}

function calculateJournalBalance() {
  let totalDebit = 0;
  let totalCredit = 0;

  document.querySelectorAll('.je-line-dr').forEach(inp => totalDebit += parseCleanNumber(inp.value));
  document.querySelectorAll('.je-line-cr').forEach(inp => totalCredit += parseCleanNumber(inp.value));

  const diff = Math.abs(totalDebit - totalCredit);
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');

  if (totalDebit > 0 && diff < 0.001) {
    badge.className = "je-status-badge balanced";
    badge.textContent = `Balanced ($${formatAppNumber(totalDebit)})`;
    if (postBtn) postBtn.disabled = false;
  } else if (totalDebit === 0 && totalCredit === 0) {
    badge.className = "je-status-badge balanced";
    badge.textContent = "Balanced";
    if (postBtn) postBtn.disabled = false;
  } else {
    badge.className = "je-status-badge unbalanced";
    badge.textContent = `Out of Balance: $${formatAppNumber(diff)}`;
    if (postBtn) postBtn.disabled = true;
  }
}

