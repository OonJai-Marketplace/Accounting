function saveEntrySubmission(event) {
  event.preventDefault();
  const debit = getSelectedAccountInfo(document.getElementById('submissionDebit').value);
  const credit = getSelectedAccountInfo(document.getElementById('submissionCredit').value);
  const currency = document.getElementById('submissionCurrency').value;
  if (!debit || !credit) { showAppNotification('Account Required','Choose valid debit and credit accounts from the Chart of Accounts.',true); return; }
  if (debit.currency !== currency || credit.currency !== currency) { showAppNotification('Currency Mismatch',`Both accounts must use ${currency}.`,true); return; }
  DemoAccess.submissions.unshift({
    id:`SUB-${Date.now()}`, date:document.getElementById('submissionDate').value,
    memo:document.getElementById('submissionMemo').value.trim(), debitAccount:debit.name, creditAccount:credit.name,
    amount:Number(document.getElementById('submissionAmount').value), currency,
    reference:document.getElementById('submissionReference').value.trim(), submittedBy:DemoAccess.currentUser.id,
    submittedAt:new Date().toISOString(), status:'pending', reviewedBy:null, reviewedAt:null, rejectionReason:'', journalEntryId:null
  });
  DemoAccess.saveSubmissions(); event.target.reset(); setSubmissionDateToday(); renderEntrySubmissions(); updateSubmissionCount();
  const status = document.getElementById('submissionFormStatus'); if (status) status.textContent = 'Submitted successfully for administrative review.';
}

async function reviewEntrySubmission(id, decision) {
  if (DemoAccess.currentUser?.role !== 'admin') return;
  const item = DemoAccess.submissions.find(row => row.id === id); if (!item || item.status !== 'pending') return;
  if (decision === 'rejected') {
    const reason = await ui117.prompt('Reason for rejection:'); if (!reason) return;
    item.status = 'rejected'; item.rejectionReason = reason;
  } else {
    const entryId = generateEntryId(); JournalModule.sequence += 1;
    const auditMemo = `${item.memo}${item.reference ? ` • Ref: ${item.reference}` : ''} • Submitted by ${getDemoUserName(item.submittedBy)}`;
    JournalModule.entries.push(
      {id:entryId,date:item.date,account:item.debitAccount,currency:item.currency,memo:auditMemo,debit:item.amount,credit:0,editReason:'Approved staff submission',archived:false},
      {id:entryId,date:item.date,account:item.creditAccount,currency:item.currency,memo:auditMemo,debit:0,credit:item.amount,editReason:'Approved staff submission',archived:false}
    );
    item.status = 'approved'; item.journalEntryId = entryId;
    refreshAllTables(); updateNextEntryIdDisplay();
  }
  item.reviewedBy = DemoAccess.currentUser.id; item.reviewedAt = new Date().toISOString();
  DemoAccess.saveSubmissions(); renderEntrySubmissions(); updateSubmissionCount();
}

function getDemoUserName(id) { return DemoAccess.users.find(user => user.id === id)?.name || 'Unknown User'; }
function renderEntrySubmissions() {
  const host = document.getElementById('entrySubmissionsBody'); if (!host || !DemoAccess.currentUser) return;
  const rows = DemoAccess.currentUser.role === 'admin' ? DemoAccess.submissions : DemoAccess.submissions.filter(item => item.submittedBy === DemoAccess.currentUser.id);
  host.innerHTML = rows.length ? rows.map(item => `<tr>
    <td>${escapeHtml(item.date)}</td><td>${escapeHtml(getDemoUserName(item.submittedBy))}</td>
    <td><strong>${escapeHtml(item.memo)}</strong><div class="je-subtitle">${escapeHtml(item.reference || 'No reference')}</div></td>
    <td>${escapeHtml(item.debitAccount)}<div class="je-subtitle">CR: ${escapeHtml(item.creditAccount)}</div></td>
    <td class="num">${currencySymbolV6(item.currency)} ${formatAppNumber(item.amount)}</td>
    <td><span class="submission-status ${item.status}">${item.status.toUpperCase()}</span>${item.journalEntryId ? `<div class="je-subtitle">${item.journalEntryId}</div>` : ''}${item.rejectionReason ? `<div class="submission-reason">${escapeHtml(item.rejectionReason)}</div>` : ''}</td>
    ${DemoAccess.currentUser.role === 'admin' ? `<td>${item.status === 'pending' ? `<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewEntrySubmission('${item.id}','approved')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewEntrySubmission('${item.id}','rejected')">Reject</button></div>` : 'Reviewed'}</td>` : ''}
  </tr>`).join('') : `<tr><td colspan="7" class="submission-empty">No submissions yet.</td></tr>`;
}
function updateSubmissionCount() {
  const count = DemoAccess.submissions.filter(item => item.status === 'pending').length;
  const badge = document.getElementById('navSubmissionCount'); if (badge) badge.textContent = count;
}
function setSubmissionDateToday() { const input = document.getElementById('submissionDate'); if (input && !input.value) input.value = new Date().toISOString().slice(0,10); }
const switchTabV11 = switchTab;
switchTab = function(tabId) {
  switchTabV11(tabId);
  if (tabId === 'entry-submissions' && document.getElementById(tabId)?.classList.contains('active')) {
    const title = document.getElementById('mainHeaderTitle'); if (title) title.textContent = 'Entry Submissions';
    renderEntrySubmissions();
  }
  if (tabId === 'settings-users') renderDemoUsers();
};
