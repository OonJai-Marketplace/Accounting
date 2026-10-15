// ------------------------------------------------------------------------------
// SUBMIT ENTRY & OVERRIDE WORKFLOW
// ------------------------------------------------------------------------------
function submitJournalEntry() {
  const transDate = document.getElementById('jeTransDate').value;
  const generalMemo = document.getElementById('jeGeneralMemo').value.trim();
  const rows = document.querySelectorAll('#jeLinesBody tr');

  if (!transDate || !generalMemo) {
    showAppNotification("Missing Data", "Please provide both a transaction date and a general memo.", true);
    return;
  }

  let totalDebit = 0;
  let totalCredit = 0;
  const linesToPost = [];

  rows.forEach(row => {
    const rawAcc = row.querySelector('.je-line-acc').value.trim();
    const memo = row.querySelector('.je-line-memo').value.trim() || generalMemo;
    const debit = parseCleanNumber(row.querySelector('.je-line-dr').value);
    const accInfo = getCleanAccountDisplay(rawAcc);

    if (rawAcc && debit > 0) {
      totalDebit += debit;
      linesToPost.push({ account: accInfo.name, currency: accInfo.currency || "USD", memo, debit, credit: 0 });
    }

    row.querySelectorAll('.je-line-cr').forEach(crInput => {
      const crVal = parseCleanNumber(crInput.value);
      const crCurr = crInput.getAttribute('data-currency');
      if (rawAcc && crVal > 0) {
        totalCredit += crVal;
        linesToPost.push({ account: accInfo.name, currency: crCurr, memo, debit: 0, credit: crVal });
      }
    });
  });

  if (linesToPost.length < 2) {
    showAppNotification("Incomplete", "Please enter at least 2 valid transaction lines.", true);
    return;
  }

  if (Math.abs(totalDebit - totalCredit) >= 0.001) {
    showAppNotification("Unbalanced Entry", `Debits ($${totalDebit.toFixed(2)}) must equal Credits ($${totalCredit.toFixed(2)}).`, true);
    return;
  }

  if (JournalModule.editingEntryId) {
    JournalModule.pendingLines = linesToPost.map(l => ({ ...l, date: transDate }));
    document.getElementById('txtEditReason').value = '';
    if (typeof openModal === 'function') openModal('modalEditReason');
    return;
  }

  const entryId = generateEntryId();
  linesToPost.forEach(item => {
    JournalModule.entries.unshift({ id: entryId, date: transDate, ...item, editReason: "" });
  });

  JournalModule.sequence++;
  showAppNotification("Success", `Journal Voucher ${entryId} has been posted to the ledger.`, false);
  finalizePostSuccess();
}

async function confirmEntryOverride() {
  const reason = document.getElementById('txtEditReason').value.trim();
  if (!reason) {
    showAppNotification("Missing Explanation", "Please enter a reason for modifying this transaction.", true);
    return;
  }

  const owner=liveProfile?.id,db=ojmDb;
  const targetId = JournalModule.editingEntryId;
  const pending=JournalModule.pendingLines;
  if(!targetId||!Array.isArray(pending)||!pending.length)return;
  const current=()=>liveProfile?.id===owner&&ojmDb===db&&JournalModule.editingEntryId===targetId&&JournalModule.pendingLines===pending;
  const oldLines = JournalModule.entries.filter(t => t.id === targetId);
  if (oldLines.some(line => line.archived)) {
    showAppNotification('Archived Period', 'This transaction is archived and cannot be directly overwritten.', true);
    return;
  }
  const dbEntryId = oldLines[0]?.dbEntryId;
  if (dbEntryId && ojmDb) {
    const payload = (JournalModule.pendingLines || []).map((line, index) => ({
      line_no: index + 1,
      account_id: line.accountId || line.account?.id,
      line_date: line.date,
      description: line.memo,
      currency_code: line.currency,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      fx_rate_lak:line.fx_rate_lak,book_rate_lak:line.book_rate_lak
    }));
    const { error } = await db.rpc('revise_open_journal_entry', {
      p_entry_id: dbEntryId,
      p_reason: reason,
      p_transaction_date: payload[0]?.line_date,
      p_memo: document.getElementById('jeGeneralMemo').value.trim(),
      p_lines: payload
    });
    if (!current()) return;
    if (error) { showAppNotification('Update Failed', error.code==='PGRST202' ? 'The journal revision function is missing or outdated. Read setup/SETUP-GUIDE-v142.20.txt for the required existing database setup. Your original entry has not been changed.' : error.message, true); return; }
    closeModal('modalEditReason');
    await loadJournalFromSupabase();
    if (!current()) return;
    showAppNotification('Update Successful', `Entry ${targetId} was revised and the original values were retained in the audit trail.`, false);
    finalizePostSuccess();
    return;
  }
  const newLines = JournalModule.pendingLines.map(l => ({ ...l, account:typeof l.account==='object'?l.account.name:l.account, id: targetId, editReason: reason }));

  JournalModule.voidedEntries.unshift({
    id: targetId,
    timestamp: new Date().toLocaleString(),
    explanation: reason,
    oldData: JSON.parse(JSON.stringify(oldLines)),
    newData: JSON.parse(JSON.stringify(newLines))
  });

  JournalModule.entries = JournalModule.entries.filter(t => t.id !== targetId);
  newLines.forEach(nl => JournalModule.entries.unshift(nl));

  if (typeof closeModal === 'function') closeModal('modalEditReason');
  showAppNotification("Update Successful", `Entry ${targetId} has been revised. The original data was saved in the Transaction Audit Log.`, false);
  finalizePostSuccess();
}

function finalizePostSuccess() {
  window.JournalFX14383?.restore({});
  JournalModule.editingEntryId = null;
  JournalModule.pendingLines = null;
  updateNextEntryIdDisplay();

  const btnPost = document.getElementById('btnPostJournal');
  if (btnPost) btnPost.textContent = "Post Entry";

  document.getElementById('jeGeneralMemo').value = '';
  resetJournalLinesForm();
  refreshAllTables();
}
