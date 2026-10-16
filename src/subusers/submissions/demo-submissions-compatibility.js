/* Submission writes and approvals are provided by the Supabase bridge. */
var saveEntrySubmission, reviewEntrySubmission;
function getDemoUserName(id) { const user=liveProfiles.find(user=>user.id===id)||(liveProfile?.id===id?liveProfile:null);return user?.full_name||user?.email||'Unknown User'; }
function renderEntrySubmissions() {
  const host = document.getElementById('entrySubmissionsBody'); if (!host || !DemoAccess.currentUser) return;
  const rows = DemoAccess.currentUser.role === 'admin' ? DemoAccess.submissions : DemoAccess.submissions.filter(item => item.submittedBy === DemoAccess.currentUser.id);
  host.innerHTML = rows.length ? rows.map(item => `<tr>
    <td>${escapeHtml(formatAppDate(item.date))}</td><td>${escapeHtml(getDemoUserName(item.submittedBy))}</td>
    <td><strong>${escapeHtml(item.memo)}</strong><div class="je-subtitle">${escapeHtml(item.reference || 'No reference')}</div></td>
    <td>${escapeHtml(item.debitAccount)}<div class="je-subtitle">CR: ${escapeHtml(item.creditAccount)}</div></td>
    <td class="num">${escapeHtml(currencySymbolV6(item.currency))} ${formatAppNumber(item.amount)}</td>
    <td><span class="submission-status ${escapeHtml(item.status)}">${escapeHtml(String(item.status).toUpperCase())}</span>${item.journalEntryId ? `<div class="je-subtitle">${escapeHtml(item.journalEntryId)}</div>` : ''}${item.rejectionReason ? `<div class="submission-reason">${escapeHtml(item.rejectionReason)}</div>` : ''}</td>
    ${DemoAccess.currentUser.role === 'admin' ? `<td>${item.status === 'pending' ? `<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewEntrySubmission(${escapeHtml(JSON.stringify(item.id))},'approved')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewEntrySubmission(${escapeHtml(JSON.stringify(item.id))},'rejected')">Reject</button></div>` : 'Reviewed'}</td>` : ''}
  </tr>`).join('') : `<tr><td colspan="7" class="submission-empty">No submissions yet.</td></tr>`;
}
function updateSubmissionCount() {
  const count = DemoAccess.submissions.filter(item => item.status === 'pending').length;
  const badge = document.getElementById('navSubmissionCount'); if (badge) badge.textContent = count;
}
function setSubmissionDateToday() { const input = document.getElementById('submissionDate'); if (input && !input.value) input.value = appLocalDate(); }
const switchTabV11 = switchTab;
switchTab = function(tabId,...args) {
  const result=switchTabV11.call(this,tabId,...args);
  if (tabId === 'entry-submissions' && document.getElementById(tabId)?.classList.contains('active')) {
    const title = document.getElementById('mainHeaderTitle'); if (title) title.textContent = 'Entry Submissions';
    renderEntrySubmissions();
  }
  if (tabId === 'settings-users') renderDemoUsers();
  return result;
};
