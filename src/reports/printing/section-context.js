// ==============================================================================
// V5: PRINT CONTEXT, TRANSACTION TEMPLATES & RECURRING OBLIGATIONS
// ==============================================================================

const PRINT_SECTIONS = {
  Transactions: [
    ['journal','Journal Transaction History'],
    
    ['transactions-all','All Transactions — Historical Archive'],
    ['transactions-recurring','Upcoming Transactions'],['transactions-budget14313','Budget Requests'],
    ['transactions-voided','Transaction Audit Log']
  ],
  Accounts: [
    ['sec-chart-accounts','Chart of Accounts'],
    ['sec-sub-accounts','Sub-Accounts'],
    ['sec-ledger','Ledger'],
    ['trial-balance','Trial Balance'],
    ['account-balances','Account Balances']
  ],
  Payroll: [
    ['payroll-overview','Payroll Overview'],['payroll-employees','Employees'],['payroll-entries','Payroll Entries'],
    ['payroll-history','Salary History'],['payroll-deductions','Payroll Deductions']
  ],
  Reports: [['report-pl','Profit & Loss'],['report-bs','Balance Sheet'],['report-cf','Cash Flow']],
  'Tax & SSO': [['tax-overview','Tax Overview'],['tax-vat','VAT'],['tax-pit','PIT'],['tax-sso','SSO']],
  Dashboard: [['dashboard','Dashboard']]
};

function detectCurrentPrintContext() {
  const active = document.querySelector('.tab-content.active');
  const id = active?.id || 'journal';
  for (const [module, items] of Object.entries(PRINT_SECTIONS)) {
    const found = items.find(x => x[0] === id);
    if (found) return { module, id, label: found[1] };
  }
  // Accounts uses a continuous modular container, so infer the active sidebar button when possible.
  const activeBtn = document.querySelector('.tab-btn.active');
  const label = activeBtn?.textContent?.trim() || 'Current Section';
  if (document.getElementById('accounts-modular-container')?.classList.contains('active')) {
    const match = PRINT_SECTIONS.Accounts.find(x => activeBtn?.getAttribute('onclick')?.includes(x[0]));
    return { module:'Accounts', id:match?.[0] || 'sec-chart-accounts', label:match?.[1] || label };
  }
  return { module:'Transactions', id:'journal', label:'Journal Transaction History' };
}

function populatePrintSubcategories() {
  const ctx = detectCurrentPrintContext();
  const moduleInput = document.getElementById('printDetectedModule');
  const select = document.getElementById('printSubcategory');
  if (moduleInput) moduleInput.value = ctx.module;
  if (!select) return;
  select.innerHTML = (PRINT_SECTIONS[ctx.module] || [[ctx.id,ctx.label]])
    .map(([id,label]) => `<option value="${id}" ${id===ctx.id?'selected':''}>${label}</option>`).join('');
}

const originalOpenPrintDialogV5 = openPrintDialog;
openPrintDialog = function() {
  populatePrintSubcategories();
  syncPrintDatePreset();
  if (typeof openModal === 'function') openModal('modalPrintOptions');
};

let printOriginalActiveIds = [];
function prepareSelectedPrintSection() {
  const selected = document.getElementById('printSubcategory')?.value;
  if (!selected) return;
  printOriginalActiveIds = Array.from(document.querySelectorAll('.tab-content.active')).map(x => x.id);
  document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('print-selected-section'));
  const target = document.getElementById(selected);
  if (target) target.classList.add('print-selected-section');
}
function clearSelectedPrintSection() {
  document.querySelectorAll('.print-selected-section').forEach(x => x.classList.remove('print-selected-section'));
  printOriginalActiveIds = [];
}

const originalExecuteConfiguredPrintV5 = executeConfiguredPrint;
executeConfiguredPrint = function() {
  prepareSelectedPrintSection();
  originalExecuteConfiguredPrintV5();
};

