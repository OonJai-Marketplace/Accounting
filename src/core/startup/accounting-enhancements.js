// Reinitialize V4 additions after the base bootstrap.
function initializeV4Enhancements() {
  renderPrintSettingPreviews();
  setTransactionDateToToday(true);
  updateNextEntryIdDisplay();
  resetJournalLinesForm();
  refreshAllTables();
  TemplateStore.load();
  if(liveProfile?.role==='admin')RecurringStore.load();
  renderRecurringTransactions();
  renderPendingReminders();
  // Login coordinator displays reminders after authenticated loading finishes.
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeV4Enhancements, { once: true });
else initializeV4Enhancements();
