// ==============================================================================
// APPLICATION BOOTSTRAPPER
// Transactions and Accounts are part of the main backbone; no HTML fetch needed.
// Runs as soon as the DOM is ready so Journal headers/data are visible on first open.
// ==============================================================================
function initializeAccountingApp() {
  if (typeof initializeBusinessSettings === 'function') initializeBusinessSettings();
  if (typeof initializeApplicationSettings === 'function') initializeApplicationSettings();
  if (typeof renderLegalDocuments === 'function') renderLegalDocuments();
  if (typeof initCoaCurrencyFilter === 'function') initCoaCurrencyFilter();
  if (typeof CurrencyStore !== 'undefined' && typeof CurrencyStore.render === 'function') CurrencyStore.render();
  if (typeof renderChartOfAccountsTable === 'function') renderChartOfAccountsTable();
  if (typeof renderSubAccountsTable === 'function') renderSubAccountsTable();
  if (typeof setTransactionDateToToday === 'function') setTransactionDateToToday(true);
  if (typeof setupJournalColumns === 'function') setupJournalColumns();
  if (typeof updateNextEntryIdDisplay === 'function') updateNextEntryIdDisplay();
  if (typeof refreshAllTables === 'function') refreshAllTables();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccountingApp, { once: true });
} else {
  initializeAccountingApp();
}
