function journalPostedHistory143195(row){return !row.pendingSync&&!row.local14333&&!row.voided_at&&(!row.status||row.status==='posted')}
function journalIsHistory14342(row){const period=PeriodReview.periods[String(row.date).slice(0,7)];return period?period.status!=='open':!!row.archived;}
/* TRANSACTIONS 67: active books, archived months and correction context. */
function setJournalDateMode(multiple, fromUser = false) {
  document.getElementById('jeMultipleDates').checked=multiple;
  document.getElementById('jeSingleDate').checked=!multiple;
  toggleMultipleDates(true, fromUser);
}
function journalContext67(text='') {
  let banner=document.getElementById('journalContext67');
  if(!banner){banner=document.createElement('div');banner.id='journalContext67';banner.setAttribute('role','status');document.querySelector('#journal .je-card-header').after(banner)}
  banner.textContent=text;banner.hidden=!text;
  document.getElementById('jeGeneralMemo').classList.toggle('adjustment-description',!!text);
}
function clearJournalEntry() {
  JournalModule.editingEntryId=null;JournalModule.pendingLines=null;PeriodReview.pendingAdjustment=null;
  pendingWorkspacePostOwnerId=null;pendingWorkspacePostJournalId=null;pendingWorkspacePostIsLocal=false;
  document.getElementById('jeGeneralMemo').value='';
  document.getElementById('txtEditReason').value='';
  document.getElementById('btnPostJournal').textContent='Post Entry';
  setTransactionDateToToday(true);setJournalDateMode(false);resetJournalLinesForm();
  updateNextEntryIdDisplay();journalContext67();
}
const editBefore67=loadEntryForEdit;
loadEntryForEdit=function(id){
  const lines=JournalModule.entries.filter(r=>r.id===id);
  if(!lines.length||lines.some(r=>r.archived)){return editBefore67(id)}
  clearJournalEntry();editBefore67(id);
  const inputs=document.querySelectorAll('#jeLinesBody .je-line-acc');inputs.forEach(updateJournalAccountBadge);
  const month=String(lines[0].date).slice(0,7);
  journalContext67(`Editing ${id}${PeriodReview.periods[month]?.reopenedAt?' · Reopened Book — '+monthLabel(month):''}`);
  calculateJournalBalance();
};
