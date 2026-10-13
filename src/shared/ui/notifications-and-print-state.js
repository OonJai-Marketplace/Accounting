// ==============================================================================


// ==============================================================================\n// MODULE REGISTRY — stable IDs for the nine main application areas\n// ==============================================================================\nconst APP_MODULES = Object.freeze({\n  dashboard: { navId: 'nav-module-dashboard', defaultView: 'dashboard' },\n  transactions: { navId: 'nav-module-transactions', containerId: 'transactions-module', defaultView: 'journal' },\n  accounts: { navId: 'nav-module-accounts', containerId: 'accounts-modular-container', defaultView: 'sec-chart-accounts' },\n  payroll: { navId: 'nav-module-payroll', defaultView: 'payroll-overview' },\n  reports: { navId: 'nav-module-reports', defaultView: 'report-pl' },\n  'tax-sso': { navId: 'nav-module-tax-sso', defaultView: 'tax-overview' },\n  inventory: { navId: 'nav-module-inventory', defaultView: 'inv-overview' },\n  menu: { navId: 'nav-module-menu', defaultView: 'menu-ingredients' },\n  settings: { navId: 'nav-module-settings', defaultView: 'settings-business' }\n});\n\nfunction getAppModule(moduleId) {\n  return APP_MODULES[moduleId] || null;\n}\n// ==============================================================================\n\n\n// ==============================================================================\n// TRANSACTIONS MODULE ENGINE — merged into main backbone\n// ==============================================================================\n// ==============================================================================
// JS 1: DYNAMIC STYLES, THEMED NOTIFICATIONS & PRINT INTERCEPTS
// Injects custom CSS for full grids, tight spacing, A4 print, and alert modals.
// ==============================================================================

function showAppNotification(title, message, isError = false) {
  document.getElementById('activeAppAlert')?.remove();if(showAppNotification.keyHandler)document.removeEventListener('keydown',showAppNotification.keyHandler,true);
  const overlay = document.createElement('div');overlay.id='activeAppAlert';
  overlay.className = 'custom-alert-overlay';
  const color = isError ? '#dc2626' : '#059669';
  overlay.innerHTML = `
    <div class="custom-alert-box" style="border-color: ${color};">
      <h3 style="color: ${isError ? '#991b1b' : '#064e3b'}; margin-top: 0; font-size: 16px;">${title}</h3>
      <p style="color: #475569; font-size: 13.5px; margin: 10px 0;">${message}</p>
      <button class="custom-alert-btn" style="background: ${color};">Acknowledge</button>
    </div>
  `;
  const close=()=>{overlay.remove();document.removeEventListener('keydown',onKey,true);showAppNotification.keyHandler=null};
  const onKey=event=>{if((event.key==='Enter'||event.key==='Escape')&&document.body.contains(overlay)){event.preventDefault();event.stopImmediatePropagation();close()}};
  overlay.querySelector('.custom-alert-btn').onclick=close;document.body.appendChild(overlay);showAppNotification.keyHandler=onKey;document.addEventListener('keydown',onKey,true);
}

let isPrintMode = false;
window.addEventListener('beforeprint', () => { isPrintMode = true; refreshAllTables(); });
window.addEventListener('afterprint', () => { isPrintMode = false; refreshAllTables(); });

function refreshAllTables() {
  renderJournalHistoryTable();
  renderNewTransactionsTable();
  renderAllTransactionsTable();
  renderVoidedTransactionsTable();
}
