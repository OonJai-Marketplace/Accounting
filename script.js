// ==============================================================================
// JS 1: CENTRAL STATE STORE & RESTAURANT CHART OF ACCOUNTS (BACKBONE)
// Primary general ledger accounts, parent-linked sub-accounts, and settings.
// ==============================================================================
const AccountingStore = {
  companyName: "",

  // ----------------------------------------------------------------------------
  // PRIMARY CHART OF ACCOUNTS (EACH WITH ASSIGNED CURRENCY)
  // ----------------------------------------------------------------------------
  accounts: [
    /* ASSETS */
    { code: "1000", name: "Cash on Hand", currency: "USD", type: "ASSET", desc: "Front counter registers, bar cash floats, and manager petty cash." },
    { code: "1010", name: "Operating Bank Account", currency: "LAK", type: "ASSET", desc: "Primary checking account used for vendor payouts and operational drafts." },
    { code: "1100", name: "Credit Card Receivables", currency: "USD", type: "ASSET", desc: "Settlements receivable from credit card processors and delivery platforms." },
    { code: "1200", name: "Food & Beverage Inventory", currency: "USD", type: "ASSET", desc: "Value of raw kitchen ingredients, dry pantry stock, and cellar bottles." },
    { code: "1500", name: "Commercial Kitchen Equipment", currency: "USD", type: "ASSET", desc: "Fixed investment in ranges, refrigeration, walk-in chillers, and POS units." },

    /* LIABILITIES */
    { code: "2000", name: "Accounts Payable", currency: "USD", type: "LIABILITY", desc: "Trade vendor balances due for food, produce, and beverage supply shipments." },
    { code: "2100", name: "Restaurant Sales & VAT Payable", currency: "LAK", type: "LIABILITY", desc: "Sales tax collected on guest receipts pending statutory government remittance." },
    { code: "2200", name: "Payroll Tax Withholdings", currency: "LAK", type: "LIABILITY", desc: "Employee income tax and social welfare withholdings payable." },
    { code: "2500", name: "Equipment Financing Loan", currency: "USD", type: "LIABILITY", desc: "Commercial financing note for kitchen build-out and appliances." },

    /* EQUITY */
    { code: "3000", name: "Owner's Capital", currency: "USD", type: "EQUITY", desc: "Initial startup funds and partner equity contributed into the restaurant." },
    { code: "3100", name: "Retained Earnings", currency: "USD", type: "EQUITY", desc: "Cumulative business profits reinvested into operations and reserves." },
    { code: "3200", name: "Owner's Drawings", currency: "USD", type: "EQUITY", desc: "Partner distributions and personal drawings taken during the period." },

    /* REVENUE */
    { code: "4000", name: "Food Sales — Dine-in", currency: "USD", type: "REVENUE", desc: "Gross dining room food revenues from seated table service." },
    { code: "4010", name: "Beverage & Coffee Sales", currency: "USD", type: "REVENUE", desc: "Revenues from specialty coffees, alcoholic drinks, and table beverages." },
    { code: "4020", name: "Takeout & Delivery Orders", currency: "USD", type: "REVENUE", desc: "Revenues from off-premise pickups and third-party delivery dispatch." },
    { code: "4100", name: "Catering & Private Dining", currency: "USD", type: "REVENUE", desc: "Revenues from contracted private party buyouts and buffet events." },

    /* EXPENSES */
    { code: "5000", name: "Cost of Goods Sold — Food", currency: "LAK", type: "EXPENSE", desc: "Wholesale purchasing of fresh meats, seafood, dry sauces, and produce." },
    { code: "5010", name: "Cost of Goods Sold — Beverage", currency: "USD", type: "EXPENSE", desc: "Wholesale purchasing of liquors, craft beers, dairy, and coffee beans." },
    { code: "5100", name: "Kitchen & Floor Staff Payroll", currency: "LAK", type: "EXPENSE", desc: "Bi-weekly wages and incentives for chefs, dishwashers, and waitstaff." },
    { code: "5200", name: "Facility Rent & Common Fees", currency: "USD", type: "EXPENSE", desc: "Monthly commercial building lease payments and CAM charges." },
    { code: "5300", name: "Utilities (Power, Gas, Water)", currency: "LAK", type: "EXPENSE", desc: "High-voltage cold storage electric, kitchen stove gas, and water service." }
  ],

  // ----------------------------------------------------------------------------
  // SUB-ACCOUNTS LINKED TO PARENT CODES
  // ----------------------------------------------------------------------------
  subAccounts: [
    { parentCode: "1000", code: "1000-01", name: "Main Dining Register Drawer", desc: "Primary POS register float and daily cash intake." },
    { parentCode: "1000", code: "1000-02", name: "Bar Register Cash Drawer", desc: "Counter float dedicated to cocktail and espresso station." },
    { parentCode: "1000", code: "1000-03", name: "Manager Petty Cash Box", desc: "Emergency cash for local grocery runs and direct store needs." },
    { parentCode: "1010", code: "1010-01", name: "Commercial Checking", desc: "Primary daily checking account for payroll and wire payouts." },
    { parentCode: "1010", code: "1010-02", name: "Tax Reserve Savings", desc: "Dedicated escrow savings for quarterly VAT payments." },
    { parentCode: "1200", code: "1200-01", name: "Proteins & Fresh Seafood", desc: "Refrigerated chicken, beef cuts, pork, and seafood stock." },
    { parentCode: "1200", code: "1200-02", name: "Dry Pantry & Spices", desc: "Rices, dry noodles, imported sauces, and bulk condiments." },
    { parentCode: "1200", code: "1200-03", name: "Beer & Liquor Stock", desc: "Bar bottle reserves and keg cold storage inventory." },
    { parentCode: "4000", code: "4000-01", name: "Lunch Table Service", desc: "Daytime meal sales receipts (11:00 AM – 3:00 PM)." },
    { parentCode: "4000", code: "4000-02", name: "Dinner Table Service", desc: "Evening dining revenue (5:00 PM – 10:30 PM)." },
    { parentCode: "5000", code: "5000-01", name: "Fresh Local Produce", desc: "Daily morning local greens, herbs, and market fruit." },
    { parentCode: "5000", code: "5000-02", name: "Wholesale Meat Supply", desc: "Commercial deliveries from certified butchery distributors." }
  ]
};

// ==============================================================================
// BUSINESS INFORMATION SETTINGS — master identity shared by future modules
// ==============================================================================
const BUSINESS_SETTINGS_KEY = 'ojm_business_settings_v2';
const BUSINESS_SETTINGS_DEFAULTS = Object.freeze({
  legalName: '',
  companyName: '',
  enterpriseNo: '', taxId: '', businessLicense: '',
  industry: '',
  phone: '', email: '', website: '', address1: '',
  city: '', postalCode: '', country: 'Laos',
  timezone: 'Asia/Vientiane'
});

const BusinessSettings = {
  current: { ...BUSINESS_SETTINGS_DEFAULTS },
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(BUSINESS_SETTINGS_KEY) || 'null');
      this.current = { ...BUSINESS_SETTINGS_DEFAULTS, ...(saved || {}) };
    } catch (_) {
      this.current = { ...BUSINESS_SETTINGS_DEFAULTS };
    }
    AccountingStore.companyName = this.current.companyName;
    return this.current;
  },
  save(value) {
    this.current = { ...BUSINESS_SETTINGS_DEFAULTS, ...value };
    localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(this.current));
    AccountingStore.companyName = this.current.companyName;
  }
};

const BUSINESS_FIELD_MAP = {
  legalName: 'settingLegalName', companyName: 'settingCompanyName', enterpriseNo: 'settingEnterpriseNo',
  taxId: 'settingTaxId', businessLicense: 'settingBusinessLicense', industry: 'settingIndustry',
  phone: 'settingPhone', email: 'settingEmail', website: 'settingWebsite', address1: 'settingAddress1',
  city: 'settingCity', postalCode: 'settingPostalCode', country: 'settingCountry', timezone: 'settingTimezone'
};

function collectBusinessSettings() {
  const value = {};
  Object.entries(BUSINESS_FIELD_MAP).forEach(([key, id]) => {
    const field = document.getElementById(id);
    if (field) value[key] = field.type === 'checkbox' ? field.checked : field.value.trim();
  });
  return value;
}

function businessInitials(name=AccountingStore.companyName||BusinessSettings.current.companyName||'Oon Jai Marketplace') {
  const words=String(name).trim().split(/\s+/).filter(Boolean);
  return words.map(word=>(word.match(/[A-Za-z0-9]/)?.[0]||'')).join('').toUpperCase()||'OJM';
}

function renderBusinessIdentity(value, saved = false) {
  const name = value.companyName || 'Business Name';
  const initials = value.companyName ? businessInitials(name) : '--';
  const previewName = document.getElementById('businessPreviewName');
  const previewInitials = document.getElementById('businessPreviewInitials');
  const previewDetails = document.getElementById('businessPreviewDetails');
  if (previewName) previewName.textContent = name;
  if (previewInitials) previewInitials.textContent = initials;
  if (previewDetails) previewDetails.textContent = [value.legalName, value.city, value.country].filter(Boolean).join(' • ') || 'Business profile';
  const brand = document.querySelector('.sidebar-brand h2');
  if (brand && saved && value.companyName) brand.innerHTML = `${escapeHtml(name)}<br><span>Accounting Core</span>`;
}

function reloadBusinessSettings() {
  const value = BusinessSettings.load();
  Object.entries(BUSINESS_FIELD_MAP).forEach(([key, id]) => {
    const field = document.getElementById(id);
    if (field) field.type === 'checkbox' ? field.checked = Boolean(value[key]) : field.value = value[key] || '';
  });
  renderBusinessIdentity(value, true);
  const stored = Boolean(localStorage.getItem(BUSINESS_SETTINGS_KEY));
  const badge = document.getElementById('businessSavedBadge');
  const status = document.getElementById('businessSettingsStatus');
  if (badge) { badge.textContent = stored ? 'Saved' : 'Using defaults'; badge.classList.toggle('is-saved', stored); }
  if (status) { status.textContent = stored ? 'Saved business profile loaded.' : 'Default profile loaded. Review the fields before saving.'; status.classList.remove('is-save-confirmation'); }
}

function saveBusinessSettings(event) {
  event?.preventDefault();
  const form = document.getElementById('businessSettingsForm');
  if (!form?.checkValidity()) { form?.reportValidity(); return; }
  const value = collectBusinessSettings();
  BusinessSettings.save(value);
  renderBusinessIdentity(value, true);
  if(typeof syncEntrySequence==='function')syncEntrySequence();updateNextEntryIdDisplay();
  const badge = document.getElementById('businessSavedBadge');
  const status = document.getElementById('businessSettingsStatus');
  if (badge) { badge.textContent = 'Saved'; badge.classList.add('is-saved'); }
  if (status) {
    status.textContent = `Saved ${new Date().toLocaleString()}. The profile is ready for connected modules.`;
    status.classList.add('is-save-confirmation');
  }
}

function initializeBusinessSettings() {
  reloadBusinessSettings();
  const form = document.getElementById('businessSettingsForm');
  form?.addEventListener('input', () => {
    renderBusinessIdentity(collectBusinessSettings(), false);
    const badge = document.getElementById('businessSavedBadge');
    const status = document.getElementById('businessSettingsStatus');
    if (badge) { badge.textContent = 'Unsaved changes'; badge.classList.remove('is-saved'); }
    if (status) { status.textContent = 'You have unsaved business information changes.'; status.classList.remove('is-save-confirmation'); }
  });
}

// General settings remain browser-backed until the matching Supabase tables are enabled.
const APP_SETTINGS_KEY = 'ojm_application_settings_v1';
const APP_SETTINGS_DEFAULTS = Object.freeze({
  payroll: { payFrequency:'monthly', payCurrency:'LAK', weeklyHours:'40', overtimeRate:'1.5' },
  tax: { vatRegistered:false, vatRate:'0', filingPeriod:'monthly', taxNumber:'' },
  pos: { reportingCurrency:'LAK', shiftCloseFrequency:'per_shift', salesAccountLabel:'Sales Revenue', clearingAccountLabel:'Cashier Clearing', cashLabel:'Cash', bankLabel:'BCEL', usdLabel:'USD', thbLabel:'THB' },
  printing: { paperSize:'A4', orientation:'portrait', showBusinessName:true, showPageNumbers:true },
  system: { dateFormat:'DD/MM/YYYY', numberFormat:'1,234.56', language:'en', sessionTimeout:'60' }
});

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(APP_SETTINGS_DEFAULTS));
}

function loadApplicationSettings() {
  const defaults = cloneDefaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}');
    Object.keys(defaults).forEach(group => Object.assign(defaults[group], saved[group] || {}));
  } catch (_) {}
  return defaults;
}

let ApplicationSettings = loadApplicationSettings();

function setSettingsFormValues(group) {
  const form = document.querySelector(`.app-settings-form[data-settings-group="${group}"]`);
  if (!form) return;
  const values = ApplicationSettings[group] || APP_SETTINGS_DEFAULTS[group];
  Object.entries(values).forEach(([name,value]) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else field.value = value;
  });
  let saved = false;
  try { saved = Boolean(JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}')[group]); } catch (_) {}
  const badge = document.querySelector(`[data-settings-badge="${group}"]`);
  if (badge) { badge.textContent = saved ? 'Saved' : 'Using defaults'; badge.classList.toggle('is-saved', saved); }
}

function collectSettingsForm(form) {
  const result = {};
  [...form.elements].forEach(field => {
    if (!field.name) return;
    result[field.name] = field.type === 'checkbox' ? field.checked : field.value;
  });
  return result;
}

function saveSettingsGroup(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const group = form.dataset.settingsGroup;
  ApplicationSettings[group] = collectSettingsForm(form);
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(ApplicationSettings));
  const badge = document.querySelector(`[data-settings-badge="${group}"]`);
  if (badge) { badge.textContent = 'Saved'; badge.classList.add('is-saved'); }
  showAppNotification('Settings Saved', `${group[0].toUpperCase()}${group.slice(1)} settings were saved.`, false);
  if(group==='system')refreshAllTables();
}

function resetSettingsGroup(group) {
  ApplicationSettings[group] = JSON.parse(JSON.stringify(APP_SETTINGS_DEFAULTS[group]));
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(ApplicationSettings));
  setSettingsFormValues(group);
  const badge = document.querySelector(`[data-settings-badge="${group}"]`);
  if (badge) { badge.textContent = 'Default'; badge.classList.add('is-saved'); }
  if(group==='system')refreshAllTables();
}

function refreshSettingsCurrencyOptions() {
  document.querySelectorAll('.settings-currency-select').forEach(select => {
    const selected = select.value || 'LAK';
    const currencies = (CurrencyStore.currencies || []).filter(item => item.active !== false);
    if (currencies.length) select.innerHTML = currencies.map(item => `<option value="${escapeHtml(item.code)}">${escapeHtml(item.code)}</option>`).join('');
    select.value = [...select.options].some(option => option.value === selected) ? selected : (select.options[0]?.value || 'LAK');
  });
}

function initializeApplicationSettings() {
  ApplicationSettings = loadApplicationSettings();
  document.querySelectorAll('.app-settings-form').forEach(form => {
    form.onsubmit = saveSettingsGroup;
    setSettingsFormValues(form.dataset.settingsGroup);
  });
  refreshSettingsCurrencyOptions();
}

function downloadJsonFile(data, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportApplicationBackup() {
  downloadJsonFile({
    version:1,
    exportedAt:new Date().toISOString(),
    business:BusinessSettings.current,
    settings:ApplicationSettings
  }, `accounting-settings-backup-${new Date().toISOString().slice(0,10)}.json`);
  const status = document.getElementById('backupSettingsStatus');
  if (status) status.textContent = 'Settings backup downloaded.';
}

async function importApplicationBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.getElementById('backupSettingsStatus');
  try {
    const backup = JSON.parse(await file.text());
    if (!backup.settings || typeof backup.settings !== 'object') throw new Error('Invalid settings backup.');
    const defaults = cloneDefaultSettings();
    Object.keys(defaults).forEach(group => Object.assign(defaults[group], backup.settings[group] || {}));
    ApplicationSettings = defaults;
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(ApplicationSettings));
    if (backup.business && typeof backup.business === 'object') BusinessSettings.save(backup.business);
    initializeApplicationSettings();
    reloadBusinessSettings();
    if (status) status.textContent = 'Settings backup restored.';
  } catch (error) {
    if (status) status.textContent = error.message || 'The backup could not be restored.';
  } finally { event.target.value = ''; }
}

// Legal documents use IndexedDB because localStorage is not suitable for file bytes.
const LEGAL_DOC_DB = 'ojm_legal_documents_v1';
const LEGAL_DOC_STORE = 'documents';
function openLegalDocumentsDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LEGAL_DOC_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(LEGAL_DOC_STORE, { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function legalDocTransaction(mode, action) {
  return openLegalDocumentsDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(LEGAL_DOC_STORE, mode);
    const store = tx.objectStore(LEGAL_DOC_STORE);
    action(store, resolve, reject);
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => db.close();
  }));
}
function formatLegalDocSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
async function uploadLegalDocuments(event) {
  const files = [...(event.target.files || [])];
  const rejected = files.filter(file => file.size > 10 * 1024 * 1024);
  const accepted = files.filter(file => file.size <= 10 * 1024 * 1024);
  for (const file of accepted) {
    await legalDocTransaction('readwrite', (store, resolve, reject) => {
      const req = store.add({ name:file.name, type:file.type || 'application/octet-stream', size:file.size, uploadedAt:new Date().toISOString(), blob:file });
      req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
    });
  }
  event.target.value = '';
  await renderLegalDocuments();
  const status = document.getElementById('legalDocumentsStatus');
  if (status) {
    status.textContent = rejected.length ? `${accepted.length} document(s) uploaded. ${rejected.length} exceeded the 10 MB limit.` : `${accepted.length} legal document(s) uploaded successfully.`;
    status.classList.toggle('is-save-confirmation', accepted.length > 0);
  }
}
async function getLegalDocuments() {
  return legalDocTransaction('readonly', (store, resolve, reject) => {
    const req = store.getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
  });
}
async function renderLegalDocuments() {
  const host = document.getElementById('legalDocumentsList');
  if (!host || !window.indexedDB) return;
  const docs = await getLegalDocuments();
  host.innerHTML = docs.length ? docs.sort((a,b) => b.id-a.id).map(doc => `
    <div class="legal-doc-row">
      <div class="legal-doc-icon">${/pdf/i.test(doc.type) ? 'PDF' : 'FILE'}</div>
      <div class="legal-doc-meta"><strong>${escapeHtml(doc.name)}</strong><span>${formatLegalDocSize(doc.size)} • Uploaded ${new Date(doc.uploadedAt).toLocaleString()}</span></div>
      <div class="legal-doc-actions"><button type="button" class="je-btn je-btn-secondary" onclick="downloadLegalDocument(${doc.id})">Download</button><button type="button" class="btn-action-delete" onclick="deleteLegalDocument(${doc.id})" title="Delete document">✕</button></div>
    </div>`).join('') : '<div class="legal-doc-empty">No legal documents uploaded yet.</div>';
}
async function downloadLegalDocument(id) {
  const doc = await legalDocTransaction('readonly', (store, resolve, reject) => {
    const req = store.get(id); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  if (!doc) return;
  const url = URL.createObjectURL(doc.blob);
  const link = document.createElement('a'); link.href = url; link.download = doc.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function deleteLegalDocument(id) {
  if (!confirm('Delete this legal document from this browser?')) return;
  await legalDocTransaction('readwrite', (store, resolve, reject) => {
    const req = store.delete(id); req.onsuccess = () => resolve(); req.onerror = () => reject(req.error);
  });
  renderLegalDocuments();
}
// ==============================================================================


// ==============================================================================
// JS 2: MULTI-CURRENCY SETTINGS STORE (STARTING DR, CR-LAK, CR-USD, CR-THB)
// Dynamic manager: Adding a currency creates a new CR column across all tables.
// ==============================================================================
const CurrencyStore = {
  currencies: [
    { code: "LAK", name: "Lao Kip", symbol: "₭", isBase: false },
    { code: "USD", name: "US Dollar", symbol: "$", isBase: true },
    { code: "THB", name: "Thai Baht", symbol: "฿", isBase: false }
  ],

  add(code, name, symbol) {
    const cleanCode = code.toUpperCase().trim();
    if (!cleanCode || !name.trim()) {
      alert("Please provide both Currency Code and Name.");
      return;
    }
    if (this.currencies.some(c => c.code === cleanCode)) {
      alert(`Currency ${cleanCode} already exists.`);
      return;
    }
    this.currencies.push({
      code: cleanCode,
      name: name.trim(),
      symbol: symbol.trim() || cleanCode,
      isBase: false
    });
    this.render();
    if (typeof setupJournalColumns === 'function') setupJournalColumns();
    initCoaCurrencyFilter();
  },

  edit(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    const newName = prompt(`Edit name for currency ${cur.code}:`, cur.name);
    if (newName && newName.trim()) {
      cur.name = newName.trim();
      this.render();
      if (typeof setupJournalColumns === 'function') setupJournalColumns();
    }
  },

  remove(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    if (cur.isBase) {
      alert("Cannot remove the base currency (USD).");
      return;
    }
    if (confirm(`Remove currency ${cur.code} (${cur.name})? All transaction columns will adapt automatically.`)) {
      this.currencies = this.currencies.filter(c => c.code !== code);
      this.render();
      if (typeof setupJournalColumns === 'function') setupJournalColumns();
      initCoaCurrencyFilter();
    }
  },

  render() {
    const tbody = document.getElementById('currencyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    this.currencies.forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="font-family: monospace; color: #064e3b;">${c.code}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td><span class="currency-tag">${escapeHtml(c.symbol)}</span></td>
        <td>
          ${c.isBase ? '<span style="color: #059669; font-weight: 700; font-size: 11.5px;">★ Base Currency</span>' : '<span style="color: #64748b; font-size: 11.5px;">Operating</span>'}
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-icon-edit" style="margin-right: 4px;" onclick="CurrencyStore.edit('${c.code}')" title="Edit Currency">✏️</button>
          ${!c.isBase ? `<button type="button" class="btn-action-delete" style="width:24px;height:24px;" onclick="CurrencyStore.remove('${c.code}')" title="Remove Currency">✕</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
};

function handleAddCurrency() {
  const code = document.getElementById('newCurrencyCode').value;
  const name = document.getElementById('newCurrencyName').value;
  const symbol = document.getElementById('newCurrencySymbol').value;
  CurrencyStore.add(code, name, symbol);
  document.getElementById('newCurrencyCode').value = '';
  document.getElementById('newCurrencyName').value = '';
  document.getElementById('newCurrencySymbol').value = '';
}
// ==============================================================================


// ==============================================================================
// JS 3: NAVIGATION, ACCORDION & TAB SWITCHER (BACKBONE)
// ==============================================================================
function activateCategory(element, defaultTabId) {
  document.querySelectorAll('.nav-category').forEach(cat => {
    if (cat !== element.parentElement) cat.classList.remove('open');
  });
  element.parentElement.classList.toggle('open');
  if (defaultTabId.startsWith('sec-')) {
    scrollToAccountModule(defaultTabId);
  } else {
    switchTab(defaultTabId);
  }
}

function setMobileNavigation(open) {
  const sidebar = document.getElementById('appSidebar');
  const toggle = document.getElementById('mobileMenuToggle');
  if (!sidebar) return;
  sidebar.classList.toggle('mobile-open', open);
  document.body.classList.toggle('nav-drawer-open', open);
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
}

function toggleMobileNavigation() {
  const sidebar = document.getElementById('appSidebar');
  setMobileNavigation(!sidebar?.classList.contains('mobile-open'));
}

function closeMobileNavigation() {
  setMobileNavigation(false);
}

function closeNavigationAfterSelection() {
  if (window.matchMedia('(max-width: 767px)').matches) closeMobileNavigation();
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
  if (btn) {
    btn.classList.add('active');
    document.getElementById('mainHeaderTitle').textContent = btn.textContent.trim();
  }

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (targetTab) localStorage.setItem('ojm_last_active_view_v1', tabId);

  if (tabId === 'journal' && typeof renderJournalHistoryTable === 'function') renderJournalHistoryTable();
  if (tabId === 'transactions-new' && typeof renderNewTransactionsTable === 'function') renderNewTransactionsTable();
  if (tabId === 'transactions-all' && typeof renderAllTransactionsTable === 'function') renderAllTransactionsTable();
  if (tabId === 'dashboard') initSummaryChart();
  closeNavigationAfterSelection();
}

function scrollToAccountModule(moduleId) {
  localStorage.setItem('ojm_last_active_view_v1', moduleId);
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  const accContainer = document.getElementById('accounts-modular-container');
  if (accContainer) accContainer.classList.add('active');

  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick')?.includes(moduleId));
  if (btn) {
    btn.classList.add('active');
    document.getElementById('mainHeaderTitle').textContent = "Accounts — " + btn.textContent.trim();
  }

  const moduleTarget = document.getElementById(moduleId);
  if (moduleTarget) {
    moduleTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  closeNavigationAfterSelection();
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768) closeMobileNavigation();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMobileNavigation();
});

function handleTableSearch(term) {
  const query = term.toLowerCase().trim();
  document.querySelectorAll('#coaTableBody tr, #subAccountTableBody tr').forEach(row => {
    row.style.display = row.innerText.toLowerCase().includes(query) ? '' : 'none';
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ==============================================================================


// ==============================================================================
// JS 4: MODULE 1 — CHART OF ACCOUNTS CONTROLLER (CURRENCY COLUMN & FILTER)
// ==============================================================================
function initCoaCurrencyFilter() {
  const filterSelect = document.getElementById('filterCoaCurrency');
  const modalSelect = document.getElementById('accCurrency');

  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="ALL">All Currencies</option>';
    CurrencyStore.currencies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} (${c.name})`;
      filterSelect.appendChild(opt);
    });
    filterSelect.value = currentVal || 'ALL';
  }

  if (modalSelect) {
    modalSelect.innerHTML = '';
    CurrencyStore.currencies.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = `${c.code} — ${c.name}`;
      modalSelect.appendChild(opt);
    });
  }
}

function syncCoaDatalist() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = `${acc.name} (${acc.currency})`;
    opt.textContent = `${acc.code} — ${acc.type}`;
    dl.appendChild(opt);
  });
}

function renderChartOfAccountsTable() {
  const tbody = document.getElementById('coaTableBody');
  if (!tbody) return;

  const filterCurr = document.getElementById('filterCoaCurrency')?.value || 'ALL';
  tbody.innerHTML = '';

  const visibleAccounts = AccountingStore.accounts.filter(acc => {
    return filterCurr === 'ALL' || acc.currency === filterCurr;
  });

  if (visibleAccounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No accounts found for currency: ${filterCurr}</td></tr>`;
    return;
  }

  visibleAccounts.forEach(acc => {
    const badgeClass = `badge-${acc.type.toLowerCase()}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${acc.code}</td>
      <td><strong>${escapeHtml(acc.name)}</strong></td>
      <td><span class="badge-currency">${acc.currency}</span></td>
      <td><span class="badge-type ${badgeClass}">${acc.type}</span></td>
      <td style="color: var(--text-muted);">${escapeHtml(acc.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Account" onclick="openEditAccountModal('${acc.code}')">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Account" onclick="promptDeleteAccount('${acc.code}')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  syncSubAccountParentDropdown();
  syncCoaDatalist();
}

function openAddAccountModal() {
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Add New Account';
  document.getElementById('accountOrigCode').value = '';
  document.getElementById('formAccount').reset();
  openModal('modalAccount');
  document.getElementById('accCode').focus();
}

function openEditAccountModal(code) {
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Edit Account';
  document.getElementById('accountOrigCode').value = acc.code;
  document.getElementById('accCode').value = acc.code;
  document.getElementById('accName').value = acc.name;
  document.getElementById('accCurrency').value = acc.currency;
  document.getElementById('accType').value = acc.type;
  document.getElementById('accDesc').value = acc.desc || '';
  openModal('modalAccount');
}

function handleAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('accountOrigCode').value;
  const code = document.getElementById('accCode').value.trim();
  const name = document.getElementById('accName').value.trim();
  const currency = document.getElementById('accCurrency').value;
  const type = document.getElementById('accType').value;
  const desc = document.getElementById('accDesc').value.trim();

  if (origCode) {
    const acc = AccountingStore.accounts.find(a => a.code === origCode);
    if (acc) {
      if (origCode !== code && AccountingStore.accounts.some(a => a.code === code)) {
        alert('Account Code already in use.');
        return;
      }
      if (origCode !== code) {
        AccountingStore.subAccounts.forEach(sub => {
          if (sub.parentCode === origCode) sub.parentCode = code;
        });
      }
      acc.code = code;
      acc.name = name;
      acc.currency = currency;
      acc.type = type;
      acc.desc = desc;
    }
  } else {
    if (AccountingStore.accounts.some(a => a.code === code)) {
      alert('Account Code already exists.');
      return;
    }
    AccountingStore.accounts.push({ code, name, currency, type, desc });
  }

  closeModal('modalAccount');
  renderChartOfAccountsTable();
  renderSubAccountsTable();
}

function promptDeleteAccount(code) {
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  const count = AccountingStore.subAccounts.filter(s => s.parentCode === code).length;
  let text = `Delete account "${acc.code} — ${acc.name}"?`;
  if (count > 0) text += ` Note: ${count} linked sub-account(s) will also be removed.`;

  document.getElementById('confirmDeletePrompt').innerText = text;
  openModal('modalConfirmDelete');

  document.getElementById('btnDeleteConfirmAction').onclick = function() {
    AccountingStore.subAccounts = AccountingStore.subAccounts.filter(s => s.parentCode !== code);
    AccountingStore.accounts = AccountingStore.accounts.filter(a => a.code !== code);
    closeModal('modalConfirmDelete');
    renderChartOfAccountsTable();
    renderSubAccountsTable();
  };
}
// ==============================================================================


// ==============================================================================
// JS 5: MODULE 2 — SUB-ACCOUNTS CONTROLLER
// ==============================================================================
function syncSubAccountParentDropdown() {
  const select = document.getElementById('subParentCode');
  if (!select) return;
  select.innerHTML = '';
  AccountingStore.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.code;
    opt.textContent = `${acc.code} — ${acc.name} (${acc.currency})`;
    select.appendChild(opt);
  });
}

function renderSubAccountsTable() {
  const tbody = document.getElementById('subAccountTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  AccountingStore.subAccounts.forEach(sub => {
    const parent = AccountingStore.accounts.find(a => a.code === sub.parentCode);
    const parentLabel = parent ? `${parent.code} — ${parent.name} (${parent.currency})` : sub.parentCode;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="parent-account-label">${escapeHtml(parentLabel)}</span></td>
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${sub.code}</td>
      <td><strong>${escapeHtml(sub.name)}</strong></td>
      <td style="color: var(--text-muted);">${escapeHtml(sub.desc || '—')}</td>
      <td style="text-align: right;">
        <div style="display: inline-flex; gap: 6px;">
          <button type="button" class="btn-action-edit" title="Edit Sub-Account" onclick="openEditSubAccountModal('${sub.code}')">✏️</button>
          <button type="button" class="btn-action-delete" title="Delete Sub-Account" onclick="promptDeleteSubAccount('${sub.code}')">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddSubAccountModal() {
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Add Sub-Account';
  document.getElementById('subAccountOrigCode').value = '';
  document.getElementById('formSubAccount').reset();
  openModal('modalSubAccount');
  document.getElementById('subCode').focus();
}

function openEditSubAccountModal(code) {
  const sub = AccountingStore.subAccounts.find(s => s.code === code);
  if (!sub) return;
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Edit Sub-Account';
  document.getElementById('subAccountOrigCode').value = sub.code;
  document.getElementById('subParentCode').value = sub.parentCode;
  document.getElementById('subCode').value = sub.code;
  document.getElementById('subName').value = sub.name;
  document.getElementById('subDesc').value = sub.desc || '';
  openModal('modalSubAccount');
}

function handleSubAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('subAccountOrigCode').value;
  const parentCode = document.getElementById('subParentCode').value;
  const code = document.getElementById('subCode').value.trim();
  const name = document.getElementById('subName').value.trim();
  const desc = document.getElementById('subDesc').value.trim();

  if (origCode) {
    const sub = AccountingStore.subAccounts.find(s => s.code === origCode);
    if (sub) {
      if (origCode !== code && AccountingStore.subAccounts.some(s => s.code === code)) {
        alert('Sub-Account code already exists.');
        return;
      }
      sub.parentCode = parentCode;
      sub.code = code;
      sub.name = name;
      sub.desc = desc;
    }
  } else {
    if (AccountingStore.subAccounts.some(s => s.code === code)) {
      alert('Sub-Account code already exists.');
      return;
    }
    AccountingStore.subAccounts.push({ parentCode, code, name, desc });
  }

  closeModal('modalSubAccount');
  renderSubAccountsTable();
}

function promptDeleteSubAccount(code) {
  const sub = AccountingStore.subAccounts.find(s => s.code === code);
  if (!sub) return;
  document.getElementById('confirmDeletePrompt').innerText = `Delete sub-account "${sub.code} — ${sub.name}"?`;
  openModal('modalConfirmDelete');

  document.getElementById('btnDeleteConfirmAction').onclick = function() {
    AccountingStore.subAccounts = AccountingStore.subAccounts.filter(s => s.code !== code);
    closeModal('modalConfirmDelete');
    renderSubAccountsTable();
  };
}
// ==============================================================================


// ==============================================================================
// JS 6: DASHBOARD CHART CONTROLLER
// ==============================================================================
let chartInstance = null;
function initSummaryChart() {
  const canvas = document.getElementById('summaryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [{ label: 'Revenue', data: [2000, 2500, 3200, 4100, 4800], borderColor: '#059669', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function updateChart() {
  if (chartInstance) chartInstance.update();
}
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
// ==============================================================================


// ==============================================================================
// JS 2: TRANSACTIONS STATE & INITIAL DATA CLUSTERS
// Master record ledger for Journal Entry, New Transactions, and Archives.
// ==============================================================================
const JournalModule = {
  entries: [
    { id: "OJM-0001", date: "2026-09-18", account: "Cash on Hand", currency: "USD", memo: "Daily register cash closeout", debit: 1000.00, credit: 0, editReason: "", archived: false },
    { id: "OJM-0001", date: "2026-09-18", account: "Food Sales — Dine-in", currency: "USD", memo: "Dine-in USD allocation", debit: 0, credit: 1000.00, editReason: "", archived: false },
    { id: "OJM-0002", date: "2026-09-18", account: "Cost of Goods Sold — Food", currency: "LAK", memo: "Morning fresh vegetable procurement", debit: 8500000.00, credit: 0, editReason: "", archived: false },
    { id: "OJM-0002", date: "2026-09-18", account: "Operating Bank Account", currency: "LAK", memo: "Direct commercial wire for market goods", debit: 0, credit: 8500000.00, editReason: "", archived: false },
    { id: "OJM-0003", date: "2026-08-28", account: "Utilities (Power, Gas, Water)", currency: "LAK", memo: "Archived August utilities sample", debit: 505000.00, credit: 0, editReason: "", archived: true, archivedAt: "2026-09-01" },
    { id: "OJM-0003", date: "2026-08-28", account: "Operating Bank Account", currency: "LAK", memo: "Archived August utilities sample", debit: 0, credit: 505000.00, editReason: "", archived: true, archivedAt: "2026-09-01" }
  ],
  voidedEntries: [
    {
      id: "OJM-0000",
      timestamp: "2026-09-17 15:30",
      explanation: "Sample audit record — corrected the account allocation.",
      oldData: [
        { id: "OJM-0000", date: "2026-09-17", account: "Utilities (Power, Gas, Water)", currency: "LAK", memo: "Sample utility payment", debit: 505000, credit: 0 },
        { id: "OJM-0000", date: "2026-09-17", account: "Cash on Hand", currency: "LAK", memo: "Sample utility payment", debit: 0, credit: 505000 }
      ],
      newData: [
        { id: "OJM-0000", date: "2026-09-17", account: "Utilities (Power, Gas, Water)", currency: "LAK", memo: "Sample Wi-Fi payment — corrected", debit: 505000, credit: 0 },
        { id: "OJM-0000", date: "2026-09-17", account: "Operating Bank Account", currency: "LAK", memo: "Sample Wi-Fi payment — corrected", debit: 0, credit: 505000 }
      ]
    }
  ],      // Audit archive storing [Old Data] + [New Data] + Explanation
  sequence: 4,
  editingEntryId: null,   // Tracks active transaction loaded into the post form for editing
  pendingLines: null      // Temporarily holds lines awaiting reason modal submission
};
// ==============================================================================


// ==============================================================================
// JS 3: DYNAMIC GENERAL HEADERS & CURRENCY CREDIT COLUMNS ENGINE
// Dynamically constructs columns across all logs.
// ==============================================================================
function generateEntryId() {
  const initials = businessInitials();
  const counterStr = String(JournalModule.sequence).padStart(4, '0');
  return `${initials}-${counterStr}`;
}
function syncEntrySequence(){const prefix=businessInitials(),pattern=new RegExp(`^${prefix}-(\\d{4})$`),max=JournalModule.entries.reduce((value,row)=>{const match=String(row.id||'').match(pattern);return match?Math.max(value,Number(match[1])):value},0);JournalModule.sequence=Math.max(1,max+1)}

function formatAppDate(value,withTime=false){
  if(!value)return'—';const raw=String(value),date=new Date(raw.length===10?`${raw}T00:00:00`:raw);if(Number.isNaN(date.getTime()))return raw;
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0'),format=ApplicationSettings.system?.dateFormat||'DD/MM/YYYY';
  const base=format==='MM/DD/YYYY'?`${m}/${d}/${y}`:format==='YYYY-MM-DD'?`${y}-${m}-${d}`:`${d}/${m}/${y}`;
  return withTime?`${base} ${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:base;
}

function updateNextEntryIdDisplay() {
  const display = document.getElementById('jeNextIdDisplay');
  if (display) {
    display.textContent = JournalModule.editingEntryId 
      ? `Editing: ${JournalModule.editingEntryId}` 
      : `Entry ID: ${generateEntryId()}`;
  }
}

function getCleanAccountDisplay(accountStr, explicitCurrency = null) {
  if (!accountStr) return { name: "Unassigned Account", currency: "" };

  let cleanName = accountStr;
  let detectedCurrency = explicitCurrency || "";

  const matched = AccountingStore.accounts.find(a => 
    a.code === accountStr || 
    a.name.toLowerCase() === accountStr.toLowerCase() ||
    accountStr.includes(a.name) ||
    accountStr.startsWith(a.code)
  );

  if (matched) {
    cleanName = matched.name;
    detectedCurrency = explicitCurrency || matched.currency;
  } else {
    cleanName = cleanName.replace(/^\d+\s*[-—–]\s*/, '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  }

  return { name: cleanName, currency: detectedCurrency };
}

function setupJournalColumns() {
  if (typeof syncCoaDatalist === 'function') syncCoaDatalist();
  updateNextEntryIdDisplay();

  const currencies = CurrencyStore.currencies || [];

  // Remove extranous buttons based on user request
  document.querySelectorAll('.je-toolbar-buttons').forEach(el => el.style.display = 'none');

  // Relocate CSV button to main top header (Far Right)
  const headerRight = document.querySelector('.header-right-tools');
  if (headerRight && !document.getElementById('global-csv-btn')) {
    const csvBtn = document.createElement('button');
    csvBtn.id = 'global-csv-btn';
    csvBtn.className = 'btn btn-print no-print';
    csvBtn.innerHTML = '📦 CSV';
    headerRight.appendChild(csvBtn);
  }

  // 1. Post Form Table Header (Account -> Memo)
  const jeHeader = document.getElementById('jeHeaderRow');
  if (jeHeader) {
    let crHeaders = '';
    currencies.forEach(c => {
      crHeaders += `<th class="num" style="width: 120px;">CR-${c.code}</th>`;
    });
    jeHeader.innerHTML = `
      <th style="width: 28%;">Account</th>
      <th style="width: 32%;">Line Memo / Reference</th>
      <th class="num" style="width: 120px;">DR (Debit)</th>
      ${crHeaders}
      <th class="action-col no-print" style="width: 40px; text-align: center;">Actions</th>
    `;
  }

  // 2. Clustered History, New, Archive, and Voided Master Headers (Account -> Memo)
  let dynamicCrHeaders = '';
  currencies.forEach(c => {
    dynamicCrHeaders += `<th class="num" style="width: 110px;">CR-${c.code}</th>`;
  });

  const baseHeaderHtml = `
    <th style="width: 100px;">Date</th>
    <th style="width: 130px;">Entry ID</th>
    <th style="width: 200px;">Account</th>
    <th style="width: 260px;">Memo / Reference</th>
    <th class="num" style="width: 110px;">DR</th>
    ${dynamicCrHeaders}
  `;

  const historyHeader = document.getElementById('thJournalHistoryRow');
  const newHeader = document.getElementById('thNewTransRow');
  const allHeader = document.getElementById('thAllTransRow');
  const voidHeader = document.getElementById('thVoidedTransRow');

  if (historyHeader) historyHeader.innerHTML = `${baseHeaderHtml}<th class="action-col no-print" style="width: 40px; text-align: center;">Actions</th>`;
  if (newHeader) newHeader.innerHTML = baseHeaderHtml;
  if (allHeader) allHeader.innerHTML = baseHeaderHtml;
  if (voidHeader) voidHeader.innerHTML = baseHeaderHtml;

  if (!JournalModule.editingEntryId) resetJournalLinesForm();
  refreshAllTables();
}
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
        <input type="text" class="num je-line-cr" data-currency="${c.code}" placeholder="0.00" value="${val}"
          onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
      </td>
    `;
  });

  const tr = document.createElement('tr');
  // Account first, then Memo
  tr.innerHTML = `
    <td>
      <input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" value="${accountVal}" />
    </td>
    <td>
      <input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${memoVal}" />
    </td>
    <td>
      <input type="text" class="num je-line-dr" placeholder="0.00" value="${drVal}"
        onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" />
    </td>
    ${crInputs}
    <td class="action-col no-print" style="text-align: center;">
      <button type="button" class="je-btn-del" style="width: 22px; height: 22px; font-size: 11px;" onclick="removeJournalLineRow(this)">✕</button>
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
  input.value = val > 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
}

function unformatNumber(input) {
  const val = parseCleanNumber(input.value);
  input.value = val > 0 ? val : '';
}

function parseCleanNumber(val) {
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/,/g, '').trim());
  return isNaN(num) ? 0 : num;
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
    badge.textContent = `Balanced ($${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
    if (postBtn) postBtn.disabled = false;
  } else if (totalDebit === 0 && totalCredit === 0) {
    badge.className = "je-status-badge balanced";
    badge.textContent = "Balanced";
    if (postBtn) postBtn.disabled = false;
  } else {
    badge.className = "je-status-badge unbalanced";
    badge.textContent = `Out of Balance: $${diff.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (postBtn) postBtn.disabled = true;
  }
}

// ------------------------------------------------------------------------------
// EDIT IN-PLACE: LOAD EXISTING DATA INTO POST FORM
// ------------------------------------------------------------------------------
function loadEntryForEdit(entryId) {
  const lines = JournalModule.entries.filter(t => t.id === entryId);
  if (!lines || lines.length === 0) return;
  if (lines.some(line => line.archived)) {
    showAppNotification('Archived Period', 'Archived transactions cannot be edited directly. Use Review to create an adjustment.', true);
    return;
  }

  switchTab('journal');

  JournalModule.editingEntryId = entryId;
  updateNextEntryIdDisplay();

  const postCard = document.querySelector('.je-card');
  if (postCard) postCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('jeTransDate').value = lines[0].date;
  document.getElementById('jeGeneralMemo').value = lines[0].memo;

  const btnPost = document.getElementById('btnPostJournal');
  if (btnPost) btnPost.textContent = "Update Entry";

  const tbody = document.getElementById('jeLinesBody');
  tbody.innerHTML = '';

  lines.forEach(line => {
    const accStr = `${line.account} (${line.currency})`;
    const drStr = line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '';
    const crMap = {};
    if (line.credit > 0) crMap[line.currency] = line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 });

    addJournalLineRow(accStr, line.memo, drStr, crMap);
  });

  calculateJournalBalance();
}

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

  const targetId = JournalModule.editingEntryId;
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
      credit: Number(line.credit || 0)
    }));
    const { error } = await ojmDb.rpc('revise_open_journal_entry', {
      p_entry_id: dbEntryId,
      p_reason: reason,
      p_transaction_date: payload[0]?.line_date,
      p_memo: document.getElementById('jeGeneralMemo').value.trim(),
      p_lines: payload
    });
    if (error) { showAppNotification('Update Failed', error.message, true); return; }
    closeModal('modalEditReason');
    await loadJournalFromSupabase();
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
  JournalModule.editingEntryId = null;
  JournalModule.pendingLines = null;
  updateNextEntryIdDisplay();

  const btnPost = document.getElementById('btnPostJournal');
  if (btnPost) btnPost.textContent = "Post Entry";

  document.getElementById('jeGeneralMemo').value = '';
  resetJournalLinesForm();
  refreshAllTables();
}
// ==============================================================================


// ==============================================================================
// JS 5: CLUSTERED TABLE RENDERERS (HISTORY, NEW, ARCHIVE, VOIDED & EXPORT)
// Note: Renders newest on top (UI) but oldest on top when printing (isPrintMode).
// ==============================================================================
function renderTransactionRowsToTbody(tbody, records, showAction = false) {
  if (!tbody) return;
  tbody.innerHTML = '';

  const currencies = CurrencyStore.currencies || [];
  const totalColumns = 5 + currencies.length + (showAction ? 1 : 0);

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${totalColumns}" style="text-align: center; color: var(--text-muted); padding: 24px;">No matching transactions found.</td></tr>`;
    return;
  }

  // Screen: newest transaction first. Print: oldest transaction first.
  // Sort by transaction date, then Entry ID, while keeping all lines of one Entry ID together.
  const displayRecords = [...records].sort((a, b) => {
    const dateCmp = String(a.date).localeCompare(String(b.date));
    const idCmp = String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    const cmp = dateCmp !== 0 ? dateCmp : idCmp;
    return isPrintMode ? cmp : -cmp;
  });

  const clusters = {};
  displayRecords.forEach(r => {
    if (!clusters[r.id]) clusters[r.id] = [];
    clusters[r.id].push(r);
  });

  Object.keys(clusters).forEach(entryId => {
    const lines = clusters[entryId];
    const totalLines = lines.length;
    const firstLine = lines[0];

    lines.forEach((line, idx) => {
      const tr = document.createElement('tr');
      const isStart = idx === 0;
      tr.className = isStart ? 'cluster-row-start' : 'cluster-row-cont';

      const cleanAcc = getCleanAccountDisplay(line.account, line.currency);

      let crColumnsHtml = '';
      currencies.forEach(c => {
        const isMatch = line.currency === c.code && line.credit > 0;
        crColumnsHtml += `
          <td class="num" style="color: ${isMatch ? '#0f172a' : '#94a3b8'};">
            ${isMatch ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
          </td>
        `;
      });

      // Layout: Date | Entry ID | Account | Memo | DR | CRs | Action
      tr.innerHTML = `
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; color: #1e293b;">${firstLine.date}</td>` : ''}
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; font-family: monospace; color: #065f46;">${entryId}</td>` : ''}
        
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" title="${escapeHtml(cleanAcc.currency || '')}">${currencySymbolV6(cleanAcc.currency)}</span><span class="account-clean-name">${escapeHtml(cleanAcc.name)}</span></div></td>

        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        
        <td class="num" style="color: ${line.debit > 0 ? '#0f172a' : '#94a3b8'};">
          ${line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
        </td>
        
        ${crColumnsHtml}
        
        ${showAction && isStart ? `
          <td rowspan="${totalLines}" class="action-col no-print" style="vertical-align: middle; width: 40px;">
            <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
              <button type="button" class="btn-action-edit" style="width: 24px; height: 24px;" onclick="loadEntryForEdit('${entryId}')" title="Edit Entry">✏️</button>
              <button type="button" class="btn-action-delete" style="width: 24px; height: 24px;" onclick="deleteTransactionCluster('${entryId}')" title="Delete Cluster">✕</button>
            </div>
          </td>` : ''}
      `;
      tbody.appendChild(tr);
    });

    if (firstLine.editReason) {
      const expTr = document.createElement('tr');
      expTr.className = 'cluster-explanation-row';
      expTr.innerHTML = `
        <td colspan="${totalColumns}">
          <strong style="color: #064e3b; font-weight: 600;">Modification Note:</strong> ${escapeHtml(firstLine.editReason)}
        </td>
      `;
      tbody.appendChild(expTr);
    }
  });
}

function renderJournalHistoryTable(records = JournalModule.entries) {
  const tbody = document.getElementById('tblJournalHistoryBody');
  renderTransactionRowsToTbody(tbody, records, true);
}

function deleteTransactionCluster(id) {
  if (confirm(`Are you sure you want to delete transaction cluster ${id}?`)) {
    JournalModule.entries = JournalModule.entries.filter(t => t.id !== id);
    refreshAllTables();
  }
}

function filterJournalHistory() {
  const query = (document.getElementById('jeSearchInput')?.value || '').toLowerCase().trim();
  const filtered = JournalModule.entries.filter(entry => {
    return entry.account.toLowerCase().includes(query) ||
           entry.memo.toLowerCase().includes(query) ||
           entry.id.toLowerCase().includes(query);
  });
  renderJournalHistoryTable(filtered);
}

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
        crCols += `<td class="num" style="color: #991b1b;">${isMatch ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #991b1b;">
          <span class="badge-void-old">VOIDED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #991b1b;">${line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
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
        crCols += `<td class="num" style="color: #065f46;">${isMatch ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #065f46;">
          <span class="badge-void-new">REVISED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #065f46;">${line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}</td>
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
  link.click();
}
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
// ==============================================================================

// ==============================================================================
// JS V4: CURRENCY-AWARE BALANCING, MONTHLY ARCHIVING & PRINT CONTROLS
// ==============================================================================
function getSelectedAccountInfo(rawValue) {
  const raw = (rawValue || '').trim();
  if (!raw) return null;
  return AccountingStore.accounts.find(a =>
    raw === a.code || raw === a.name || raw.startsWith(a.code + ' ') || raw.includes(a.name)
  ) || null;
}

function getJournalCurrencyState() {
  const currencies = (CurrencyStore.currencies || []).map(c => c.code);
  const totals = Object.fromEntries(currencies.map(c => [c, { debit: 0, credit: 0 }]));
  const errors = [];
  let validLines = 0;

  document.querySelectorAll('#jeLinesBody tr').forEach((row, index) => {
    const accountInput = row.querySelector('.je-line-acc');
    if (!accountInput) return;
    const rawAccount = accountInput.value.trim();
    const account = getSelectedAccountInfo(rawAccount);
    const debit = parseCleanNumber(row.querySelector('.je-line-dr')?.value || '');
    const creditInputs = [...row.querySelectorAll('.je-line-cr')];
    const enteredCredits = creditInputs
      .map(inp => ({ currency: inp.dataset.currency, value: parseCleanNumber(inp.value) }))
      .filter(x => x.value > 0);

    if (!rawAccount && (debit > 0 || enteredCredits.length)) {
      errors.push(`Row ${index + 1}: choose an account first.`);
      return;
    }
    if (!rawAccount) return;
    if (!account) {
      errors.push(`Row ${index + 1}: select a valid Chart of Accounts account.`);
      return;
    }
    if (!totals[account.currency]) totals[account.currency] = { debit: 0, credit: 0 };

    if (debit > 0 && enteredCredits.length) errors.push(`Row ${index + 1}: use either Debit or Credit, not both.`);
    if (enteredCredits.length > 1) errors.push(`Row ${index + 1}: only one credit currency may be used for one account.`);
    enteredCredits.forEach(cr => {
      if (cr.currency !== account.currency) {
        errors.push(`Row ${index + 1}: ${account.name} is a ${account.currency} account, so its credit must be entered under CR-${account.currency}.`);
      }
    });

    if (debit > 0) {
      totals[account.currency].debit += debit;
      validLines++;
    }
    enteredCredits.forEach(cr => {
      if (!totals[cr.currency]) totals[cr.currency] = { debit: 0, credit: 0 };
      totals[cr.currency].credit += cr.value;
      validLines++;
    });
  });

  const differences = Object.entries(totals).filter(([, t]) => Math.abs(t.debit - t.credit) >= 0.001);
  return { totals, errors, differences, validLines };
}

function calculateJournalBalance() {
  const state = getJournalCurrencyState();
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');
  if (!badge) return;

  const hasAmount = Object.values(state.totals).some(t => t.debit > 0 || t.credit > 0);
  if (state.errors.length) {
    badge.className = 'je-status-badge unbalanced';
    badge.textContent = state.errors[0];
    if (postBtn) postBtn.disabled = true;
    return;
  }
  if (!hasAmount) {
    badge.className = 'je-status-badge balanced';
    badge.textContent = 'Ready — balance checked per currency';
    if (postBtn) postBtn.disabled = false;
    return;
  }
  if (!state.differences.length) {
    badge.className = 'je-status-badge balanced';
    badge.textContent = 'Balanced by currency';
    if (postBtn) postBtn.disabled = false;
  } else {
    badge.className = 'je-status-badge unbalanced';
    badge.textContent = state.differences.map(([c,t]) => `${c}: DR ${formatCompactAmount(t.debit)} / CR ${formatCompactAmount(t.credit)}`).join(' • ');
    if (postBtn) postBtn.disabled = true;
  }
}

function formatCompactAmount(value) {
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Currency validation also runs when an account is selected/typed.
document.addEventListener('input', (event) => {
  if (event.target.matches('.je-line-acc')) calculateJournalBalance();
});
document.addEventListener('change', (event) => {
  if (event.target.matches('.je-line-acc')) calculateJournalBalance();
});

const originalSubmitJournalEntryV3 = submitJournalEntry;
submitJournalEntry = function() {
  const state = getJournalCurrencyState();
  if (state.errors.length) {
    showAppNotification('Currency Mismatch', state.errors.join(' '), true);
    return;
  }
  if (state.differences.length) {
    const detail = state.differences.map(([c,t]) => `${c}: Debit ${formatCompactAmount(t.debit)} vs Credit ${formatCompactAmount(t.credit)}`).join(' | ');
    showAppNotification('Unbalanced by Currency', `Every currency must balance independently. ${detail}`, true);
    return;
  }
  originalSubmitJournalEntryV3();
};

function monthKeyFromDate(date) { return String(date || '').slice(0, 7); }
function monthLabel(monthKey) {
  const [y,m] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

function archiveTransactionMonth(monthKey) {
  const ids = new Set(JournalModule.entries.filter(e => monthKeyFromDate(e.date) === monthKey && !e.archived).map(e => e.id));
  if (!ids.size) return;
  if (!confirm(`Archive all unarchived transactions for ${monthLabel(monthKey)}? This closes that monthly batch and moves it to All Transactions.`)) return;
  const stamp = new Date().toISOString();
  JournalModule.entries.forEach(e => {
    if (ids.has(e.id)) { e.archived = true; e.archivedAt = stamp; }
  });
  refreshAllTables();
  showAppNotification('Month Archived', `${monthLabel(monthKey)} was submitted to the historical archive.`, false);
}

function renderNewTransactionsTable() {
  const container = document.getElementById('newTransactionsGroupedContainer');
  if (!container) return;
  container.innerHTML = '';
  const records = JournalModule.entries.filter(e => !e.archived);
  const months = [...new Set(records.map(e => monthKeyFromDate(e.date)))].sort().reverse();
  const currentMonth = getCurrentMonthPrefix();
  if (!months.length) {
    container.innerHTML = '<div class="empty-archive-state">No unarchived transactions. All posted monthly batches have been submitted to the archive.</div>';
    return;
  }
  months.forEach(month => {
    const card = document.createElement('section');
    card.className = `monthly-unarchived-cluster ${month === currentMonth ? 'current-month-cluster' : 'overdue-month-cluster'}`;
    const status = month === currentMonth ? '<span class="archive-status current">CURRENT MONTH</span>' : '<span class="archive-status overdue">UNARCHIVED</span>';
    card.innerHTML = `
      <div class="monthly-cluster-header">
        <div><h4>New Transactions — ${monthLabel(month)}</h4>${status}</div>
        <button type="button" class="je-btn je-btn-emerald no-print" onclick="archiveTransactionMonth('${month}')">Submit for Archiving</button>
      </div>
      <div class="table-container"><table class="clustered-journal-table"><thead><tr class="general-master-header"></tr></thead><tbody></tbody></table></div>`;
    container.appendChild(card);
    const header = card.querySelector('thead tr');
    const currencies = CurrencyStore.currencies || [];
    header.innerHTML = `<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="num">DR</th>${currencies.map(c=>`<th class="num">CR-${c.code}</th>`).join('')}`;
    renderTransactionRowsToTbody(card.querySelector('tbody'), records.filter(e => monthKeyFromDate(e.date) === month), false);
  });
}

function renderJournalHistoryTable(records = JournalModule.entries) {
  const tbody = document.getElementById('tblJournalHistoryBody');
  const currentMonth = getCurrentMonthPrefix();
  renderTransactionRowsToTbody(tbody, records.filter(e => monthKeyFromDate(e.date) === currentMonth), true);
}

function renderAllTransactionsTable() {
  const tbody = document.getElementById('allTransactionsBody');
  const archived = JournalModule.entries.filter(e => e.archived);
  renderTransactionRowsToTbody(tbody, archived, false);
}

// Preserve archive status when editing an existing entry.
const originalFinalizeEditReasonV3 = typeof finalizeEditReason === 'function' ? finalizeEditReason : null;
if (originalFinalizeEditReasonV3) {
  finalizeEditReason = function() {
    const editingId = JournalModule.editingEntryId;
    const archived = JournalModule.entries.find(e => e.id === editingId)?.archived || false;
    const archivedAt = JournalModule.entries.find(e => e.id === editingId)?.archivedAt || '';
    originalFinalizeEditReasonV3();
    JournalModule.entries.filter(e => e.id === editingId).forEach(e => { e.archived = archived; e.archivedAt = archivedAt; });
  };
}

// ----- Print settings and multi-page print flow -----
const PrintSettings = {
  headerImage: localStorage.getItem('ojm_print_header') || '',
  footerImage: localStorage.getItem('ojm_print_footer') || ''
};

function handlePrintImageUpload(event, type) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    PrintSettings[type + 'Image'] = reader.result;
    localStorage.setItem(type === 'header' ? 'ojm_print_header' : 'ojm_print_footer', reader.result);
    renderPrintSettingPreviews();
  };
  reader.readAsDataURL(file);
}
function clearPrintImage(type) {
  PrintSettings[type + 'Image'] = '';
  localStorage.removeItem(type === 'header' ? 'ojm_print_header' : 'ojm_print_footer');
  renderPrintSettingPreviews();
}
function renderPrintSettingPreviews() {
  const h = document.getElementById('printHeaderPreview');
  const f = document.getElementById('printFooterPreview');
  if (h) h.innerHTML = PrintSettings.headerImage ? `<img src="${PrintSettings.headerImage}" alt="Print header preview">` : 'No header image selected.';
  if (f) f.innerHTML = PrintSettings.footerImage ? `<img src="${PrintSettings.footerImage}" alt="Print footer preview">` : 'No footer image selected.';
}
function openPrintDialog() {
  syncPrintDatePreset();
  if (typeof openModal === 'function') openModal('modalPrintOptions');
}
function syncPrintDatePreset() {
  const preset = document.getElementById('printDatePreset')?.value || 'all';
  const from = document.getElementById('printDateFrom');
  const to = document.getElementById('printDateTo');
  if (!from || !to) return;
  const now = new Date();
  const local = d => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  if (preset === 'all' || preset === 'custom') { if (preset === 'all') { from.value=''; to.value=''; } return; }
  let start, end;
  if (preset === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth()+1, 0); }
  if (preset === 'quarter') { const q=Math.floor(now.getMonth()/3)*3; start=new Date(now.getFullYear(),q,1); end=new Date(now.getFullYear(),q+3,0); }
  if (preset === 'year') { start=new Date(now.getFullYear(),0,1); end=new Date(now.getFullYear(),11,31); }
  from.value=local(start); to.value=local(end);
}
let printTemporarilyHiddenRows = [];
function applyPrintDateFilter() {
  printTemporarilyHiddenRows.forEach(({row, display}) => row.style.display = display);
  printTemporarilyHiddenRows = [];
  const from = document.getElementById('printDateFrom')?.value || '';
  const to = document.getElementById('printDateTo')?.value || '';
  if (!from && !to) return;
  document.querySelectorAll('.tab-content.active tbody tr').forEach(row => {
    const first = row.cells?.[0]?.textContent?.trim() || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return;
    if ((from && first < from) || (to && first > to)) {
      printTemporarilyHiddenRows.push({ row, display: row.style.display });
      row.style.display = 'none';
    }
  });
}
function restorePrintDateFilter() {
  printTemporarilyHiddenRows.forEach(({row, display}) => row.style.display = display);
  printTemporarilyHiddenRows = [];
}
function executeConfiguredPrint() {
  const useHeader = document.getElementById('printUseHeader')?.checked;
  const useFooter = document.getElementById('printUseFooter')?.checked;
  const h = document.getElementById('printHeaderOutput');
  const f = document.getElementById('printFooterOutput');
  if (h) h.innerHTML = useHeader && PrintSettings.headerImage ? `<img src="${PrintSettings.headerImage}" alt="">` : '';
  if (f) f.innerHTML = useFooter && PrintSettings.footerImage ? `<img src="${PrintSettings.footerImage}" alt="">` : '';
  applyPrintDateFilter();
  document.body.classList.add('configured-print');
  if (typeof closeModal === 'function') closeModal('modalPrintOptions');
  setTimeout(() => window.print(), 80);
}
window.addEventListener('afterprint', () => { document.body.classList.remove('configured-print'); restorePrintDateFilter(); clearSelectedPrintSection(); });


// ==============================================================================
// V5: PRINT CONTEXT, TRANSACTION TEMPLATES & RECURRING OBLIGATIONS
// ==============================================================================

const PRINT_SECTIONS = {
  Transactions: [
    ['journal','Journal Transaction History'],
    ['transactions-new','New Transactions'],
    ['transactions-all','All Transactions — Historical Archive'],
    ['transactions-recurring','Upcoming Transactions'],
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
  Inventory: [['inv-overview','Inventory Overview']],
  Menu: [['menu-ingredients','Menu / Ingredients']],
  Settings: [['settings-business','Business Information'],['settings-accounting','Accounting Settings'],['settings-print','Printing Settings']],
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

// ------------------------- Transaction Templates -------------------------------
const TemplateStore = {
  key: 'ojm_transaction_templates_v1',
  templates: [],
  load() {
    try { this.templates = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { this.templates = []; }
    if (!this.templates.length) {
      this.templates = [{
        id:'tpl-payroll-sample', name:'Monthly Payroll — Sample',
        generalMemo:'Monthly payroll posting',
        lines:[
          {account:'Salaries & Wages (USD)', memo:'Employee salary / payroll reference'},
          {account:'Payroll Tax Payable (LAK)', memo:'PIT payable'},
          {account:'SSO Payable (LAK)', memo:'SSO payable'}
        ]
      }];
      this.save();
    }
  },
  save(){ localStorage.setItem(this.key, JSON.stringify(this.templates)); }
};

let pendingTemplateLines = null;
let editingTemplateId = null;

function captureTemplateStructure() {
  const lines = [];
  document.querySelectorAll('#jeLinesBody tr').forEach(row => {
    const account = row.querySelector('.je-line-acc')?.value?.trim() || '';
    const memo = row.querySelector('.je-line-memo')?.value?.trim() || '';
    if (account || memo) lines.push({account, memo});
  });
  return { generalMemo: document.getElementById('jeGeneralMemo')?.value?.trim() || '', lines };
}
function createTemplateFromCurrent() {
  const structure = captureTemplateStructure();
  if (!structure.lines.length) {
    showAppNotification('Template Needs Accounts', 'Enter the account names and line descriptions you want to save, then create the template.', true);
    return;
  }
  pendingTemplateLines = structure;
  editingTemplateId = null;
  document.getElementById('templateNameInput').value = '';
  openModal('modalTemplateName');
}
function confirmSaveTemplate() {
  const name = document.getElementById('templateNameInput').value.trim();
  if (!name || !pendingTemplateLines) {
    showAppNotification('Missing Template Name', 'Please enter a name for this template.', true); return;
  }
  if (editingTemplateId) {
    const t = TemplateStore.templates.find(x => x.id === editingTemplateId);
    if (t) Object.assign(t, {name, ...pendingTemplateLines});
  } else {
    TemplateStore.templates.push({id:'tpl-'+Date.now(), name, ...pendingTemplateLines});
  }
  TemplateStore.save(); closeModal('modalTemplateName'); renderTemplateManager();
  showAppNotification('Template Saved', `${name} is permanently saved in this browser until edited or removed.`, false);
}
function openTemplateManager(){ renderTemplateManager(); openModal('modalTemplateManager'); }
function renderTemplateManager(){
  const host=document.getElementById('templateManagerList'); if(!host)return;
  host.innerHTML = TemplateStore.templates.length ? TemplateStore.templates.map(t=>`
    <div class="template-item">
      <div><strong>${escapeHtml(t.name)}</strong><div class="je-subtitle">${t.lines.length} saved line${t.lines.length===1?'':'s'} • amounts always load as zero</div></div>
      <div class="template-item-actions">
        <button class="je-btn je-btn-emerald" onclick="applyTransactionTemplate('${t.id}')">Use</button>
        <button class="je-btn je-btn-secondary" onclick="editTransactionTemplate('${t.id}')">Edit</button>
        <button class="je-btn je-btn-danger" onclick="deleteTransactionTemplate('${t.id}')">Remove</button>
      </div>
    </div>`).join('') : '<div class="empty-archive-state">No templates saved.</div>';
}
function applyTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  resetJournalLinesForm();
  const body=document.getElementById('jeLinesBody'); body.innerHTML='';
  document.getElementById('jeGeneralMemo').value=t.generalMemo || '';
  t.lines.forEach(line=>addJournalLineRow(line.account,line.memo,'',{}));
  while(body.querySelectorAll('tr').length<2)addJournalLineRow();
  setTransactionDateToToday(true); updateNextEntryIdDisplay(); calculateJournalBalance();
  closeModal('modalTemplateManager');
}
function editTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  pendingTemplateLines={generalMemo:t.generalMemo||'',lines:t.lines.map(x=>({...x}))};
  editingTemplateId=id; document.getElementById('templateNameInput').value=t.name;
  closeModal('modalTemplateManager'); openModal('modalTemplateName');
}
function deleteTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  if(!confirm(`Remove template "${t.name}"?`))return;
  TemplateStore.templates=TemplateStore.templates.filter(x=>x.id!==id); TemplateStore.save(); renderTemplateManager();
}

// ------------------------- Recurring Obligations -------------------------------
const RecurringStore = {
  key:'ojm_recurring_transactions_v1',
  items:[],
  pendingReminders:[],
  load(){
    try{this.items=JSON.parse(localStorage.getItem(this.key)||'[]')}catch{this.items=[]}
    if(!this.items.length){
      this.items=[
        {id:'rec-rent',memo:'Monthly facility rent',frequency:'Monthly',nextDate:'2026-10-01',amount:20000,currency:'THB',debitAccount:'Facility Rent & Common Fees',creditAccount:'Operating Bank Account',reference:'Facility rent',reminders:[{count:2,unit:'weeks'},{count:3,unit:'days'}],paused:false},
        {id:'rec-wifi',memo:'Monthly Wi-Fi service',frequency:'Monthly',nextDate:'2026-10-05',amount:505000,currency:'LAK',debitAccount:'Utilities (Power, Gas, Water)',creditAccount:'Operating Bank Account',reference:'Wi-Fi',reminders:[{count:1,unit:'months'}],paused:false}
      ]; this.save();
    }
  },
  save(){localStorage.setItem(this.key,JSON.stringify(this.items))}
};
function resetRecurringForm(){
  ['recurringMemo','recurringAmount','recurringReference'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  const d=document.getElementById('recurringNextDate'); if(d)d.value='';
  const f=document.getElementById('recurringFrequency');if(f)f.value='Monthly';
  const t=document.getElementById('recurringType');if(t)t.value='recurring';updateUpcomingTypeFields();
  RecurringStore.pendingReminders=[]; renderPendingReminders();
}
function updateUpcomingTypeFields(){const oneTime=document.getElementById('recurringType')?.value==='one-time',group=document.getElementById('recurringFrequencyGroup');if(group)group.hidden=oneTime}
function addPendingReminder(){
  const count=Math.max(1,parseInt(document.getElementById('reminderCount').value||'1',10));
  const unit=document.getElementById('reminderUnit').value;
  if(!RecurringStore.pendingReminders.some(r=>r.count===count&&r.unit===unit)) RecurringStore.pendingReminders.push({count,unit});
  renderPendingReminders();
}
function renderPendingReminders(){
  const host=document.getElementById('pendingReminderList');if(!host)return;
  host.innerHTML=RecurringStore.pendingReminders.map((r,i)=>`<span class="reminder-chip">${r.count} ${r.unit} before <button type="button" onclick="RecurringStore.pendingReminders.splice(${i},1);renderPendingReminders()">×</button></span>`).join('');
}
function saveRecurringTransaction(){
  const memo=document.getElementById('recurringMemo').value.trim();
  const nextDate=document.getElementById('recurringNextDate').value;
  if(!memo||!nextDate){showAppNotification('Missing Recurring Details','Description / Memo and Next Due Date are required.',true);return}
  if(!RecurringStore.pendingReminders.length){showAppNotification('Reminder Required','Add at least one warning schedule.',true);return}
  RecurringStore.items.push({
    id:'rec-'+Date.now(),type:document.getElementById('recurringType')?.value||'recurring',memo,frequency:document.getElementById('recurringType')?.value==='one-time'?'One-Time':document.getElementById('recurringFrequency').value,nextDate,
    amount:Number(document.getElementById('recurringAmount').value||0),currency:document.getElementById('recurringCurrency').value,
    reference:document.getElementById('recurringReference').value.trim(),reminders:RecurringStore.pendingReminders.map(x=>({...x})),paused:false
  });
  RecurringStore.save(); resetRecurringForm(); renderRecurringTransactions(); showAppNotification('Upcoming Transaction Saved','The transaction and its warning schedule have been saved.',false);
}
function reminderThresholdDate(item){
  const due=new Date(item.nextDate+'T00:00:00');
  let earliest=new Date(due);
  (item.reminders||[]).forEach(r=>{
    const d=new Date(due);
    if(r.unit==='days')d.setDate(d.getDate()-r.count);
    if(r.unit==='weeks')d.setDate(d.getDate()-(r.count*7));
    if(r.unit==='months')d.setMonth(d.getMonth()-r.count);
    if(d<earliest)earliest=d;
  });
  return earliest;
}
function recurringStatus(item){
  if(item.paused)return 'PAUSED';
  const today=new Date(); today.setHours(0,0,0,0);
  const due=new Date(item.nextDate+'T00:00:00');
  if(due<today)return 'OVERDUE';
  if(today>=reminderThresholdDate(item))return 'DUE SOON';
  return 'UPCOMING';
}
function reminderText(item){return (item.reminders||[]).map(r=>`${r.count} ${r.unit}`).join(' + ')||'—'}
function renderRecurringTransactions(){
  const body=document.getElementById('tblRecurringTransactionsBody');if(!body)return;
  const items=[...RecurringStore.items].sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
  body.innerHTML=items.map(item=>{
    const status=recurringStatus(item), cls=status==='OVERDUE'?'due-overdue':status==='DUE SOON'?'due-soon':'';
    return `<tr>
      <td class="${cls}">${formatAppDate(item.nextDate)}</td><td>${escapeHtml(item.type==='one-time'?'One-Time':item.frequency)}</td><td>${escapeHtml(item.memo)}${item.reference?`<div class="je-subtitle">${escapeHtml(item.reference)}</div>`:''}</td>
      <td class="num">${Number(item.amount||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${escapeHtml(item.currency)}</td>
      <td>${escapeHtml(reminderText(item))}</td><td class="${cls}">${status}</td>
      <td class="action-col upcoming-action-col no-print"><div class="recurring-inline-actions"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid('${item.id}')">Paid</button><button class="je-btn je-btn-secondary" onclick="toggleRecurringPause('${item.id}')">${item.paused?'Resume':'Pause'}</button><button class="je-btn je-btn-danger recurring-remove-x" onclick="removeRecurring('${item.id}')" title="Remove upcoming transaction" aria-label="Remove upcoming transaction">&times;</button></div></td>
    </tr>`;
  }).join('');
}
function advanceRecurringDate(item){
  const d=new Date(item.nextDate+'T00:00:00');
  if(item.frequency==='Weekly')d.setDate(d.getDate()+7);
  else if(item.frequency==='Monthly')d.setMonth(d.getMonth()+1);
  else if(item.frequency==='Quarterly')d.setMonth(d.getMonth()+3);
  else if(item.frequency==='Yearly')d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  item.nextDate=d.toISOString().slice(0,10);
}
function markRecurringPaid(id){
  const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;
  item.lastPaidDate=new Date().toISOString().slice(0,10);if(item.type==='one-time'||item.frequency==='One-Time'){RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id);RecurringStore.save();renderRecurringTransactions();renderRecurringWarnings();showAppNotification('Marked Paid',`${item.memo} was completed and removed from upcoming transactions.`,false);return}advanceRecurringDate(item); RecurringStore.save(); renderRecurringTransactions(); renderRecurringWarnings();
  showAppNotification('Marked Paid',`${item.memo} is marked paid for the current occurrence. Next due: ${formatAppDate(item.nextDate)}.`,false);
}
function toggleRecurringPause(id){const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;item.paused=!item.paused;RecurringStore.save();renderRecurringTransactions();renderRecurringWarnings()}
function removeRecurring(id){const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;if(!confirm(`Remove recurring item "${item.memo}"?`))return;RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id);RecurringStore.save();renderRecurringTransactions();renderRecurringWarnings()}
function getActiveRecurringWarnings(){
  return RecurringStore.items.filter(x=>!x.paused && ['OVERDUE','DUE SOON'].includes(recurringStatus(x))).sort((a,b)=>{
    const sa=recurringStatus(a),sb=recurringStatus(b); if(sa!==sb)return sa==='OVERDUE'?-1:1; return a.nextDate.localeCompare(b.nextDate);
  });
}
function renderRecurringWarnings(){
  const host=document.getElementById('recurringWarningList');if(!host)return;
  const items=getActiveRecurringWarnings();
  host.innerHTML=items.length?items.map(item=>`<div class="recurring-warning-item ${recurringStatus(item)==='OVERDUE'?'overdue':''}">
    <h5>${recurringStatus(item)==='OVERDUE'?'OVERDUE':'UPCOMING'} — ${escapeHtml(item.memo)}</h5>
    <div>Due: <strong>${item.nextDate}</strong> • ${Number(item.amount||0).toLocaleString('en-US')} ${escapeHtml(item.currency)}</div>
    <div class="je-subtitle">Reminder: ${escapeHtml(reminderText(item))}</div>
    <div style="margin-top:7px"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid('${item.id}')">Mark Paid</button></div>
  </div>`).join(''):'<div class="empty-archive-state">No recurring warnings are currently due.</div>';
}
function showRecurringWarningsOnLogin(){
  renderRecurringWarnings();
  if(getActiveRecurringWarnings().length) setTimeout(()=>openModal('modalRecurringWarnings'),250);
}

// Extend tab behavior for recurring table.
const originalSwitchTabV5 = switchTab;
switchTab = function(tabId){
  originalSwitchTabV5(tabId);
  if(tabId==='transactions-recurring') renderRecurringTransactions();
};


// Reinitialize V4 additions after the base bootstrap.
function initializeV4Enhancements() {
  renderPrintSettingPreviews();
  setTransactionDateToToday(true);
  updateNextEntryIdDisplay();
  resetJournalLinesForm();
  refreshAllTables();
  TemplateStore.load();
  RecurringStore.load();
  renderRecurringTransactions();
  renderPendingReminders();
  showRecurringWarningsOnLogin();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeV4Enhancements, { once: true });
else initializeV4Enhancements();
// ==============================================================================

// ==============================================================================
// JS V6: UNIFIED DIALOGS, MULTI-DATE BATCH ENTRY & CURRENCY SYMBOL BADGES
// ==============================================================================
function currencySymbolV6(code) {
  const map = { LAK: '₭', USD: '$', THB: '฿', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥' };
  return map[String(code || '').toUpperCase()] || String(code || '').slice(0, 3);
}

// Keep account choices short and currency-aware. The selected row shows a compact badge.
syncCoaDatalist = function() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.name;
    opt.textContent = `${currencySymbolV6(acc.currency)}  ${acc.code} — ${acc.type}`;
    dl.appendChild(opt);
  });
};

function updateJournalAccountBadge(input) {
  if (!input) return;
  const account = getSelectedAccountInfo(input.value);
  const badge = input.closest('.account-input-wrap')?.querySelector('.currency-symbol-badge');
  if (!badge) return;
  badge.textContent = account ? currencySymbolV6(account.currency) : '¤';
  badge.title = account ? account.currency : 'Select an account';
}

const addJournalLineRowV5 = addJournalLineRow;
addJournalLineRow = function(accountVal = '', memoVal = '', drVal = '', crMap = {}) {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;
  const mainDate = document.getElementById('jeTransDate')?.value || '';
  const currencies = CurrencyStore.currencies || [];
  const account = getSelectedAccountInfo(accountVal);
  const cleanAccount = account ? account.name : String(accountVal || '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  let crInputs = '';
  currencies.forEach(c => {
    const val = crMap[c.code] || '';
    crInputs += `<td><input type="text" class="num je-line-cr" data-currency="${c.code}" placeholder="0.00" value="${val}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>`;
  });
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="je-date-col"><input type="date" class="je-line-date" value="${mainDate}" onclick="if(this.showPicker) this.showPicker();" onchange="calculateJournalBalance()"></td>
    <td><div class="account-input-wrap"><span class="currency-symbol-badge" title="${account?.currency || 'Select an account'}">${account ? currencySymbolV6(account.currency) : '¤'}</span><input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" value="${cleanAccount}" oninput="updateJournalAccountBadge(this);calculateJournalBalance()" onchange="updateJournalAccountBadge(this);calculateJournalBalance()" /></div></td>
    <td><input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${memoVal}" /></td>
    <td><input type="text" class="num je-line-dr" placeholder="0.00" value="${drVal}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>
    ${crInputs}
    <td class="action-col no-print" style="text-align:center"><button type="button" class="je-btn-del" style="width:22px;height:22px;font-size:11px" onclick="removeJournalLineRow(this)">✕</button></td>`;
  tbody.appendChild(tr);
  calculateJournalBalance();
};

const setupJournalColumnsV5 = setupJournalColumns;
setupJournalColumns = function() {
  setupJournalColumnsV5();
  syncCoaDatalist();
  const jeHeader = document.getElementById('jeHeaderRow');
  if (jeHeader && !jeHeader.querySelector('.je-date-col')) {
    const th = document.createElement('th');
    th.className = 'je-date-col';
    th.style.width = '138px';
    th.textContent = 'Date';
    jeHeader.insertBefore(th, jeHeader.firstChild);
  }
  document.querySelectorAll('.je-line-acc').forEach(updateJournalAccountBadge);
  toggleMultipleDates(false);
};

function toggleMultipleDates(syncRows = true) {
  const enabled = !!document.getElementById('jeMultipleDates')?.checked;
  document.body.classList.toggle('je-multi-date', enabled);
  if (enabled && syncRows) {
    const mainDate = document.getElementById('jeTransDate')?.value || '';
    document.querySelectorAll('.je-line-date').forEach(inp => { if (!inp.value) inp.value = mainDate; });
  }
  calculateJournalBalance();
}

document.addEventListener('change', event => {
  if (event.target?.id === 'jeTransDate' && document.getElementById('jeMultipleDates')?.checked) {
    document.querySelectorAll('.je-line-date').forEach(inp => { if (!inp.dataset.manualDate) inp.value = event.target.value; });
  }
  if (event.target?.matches('.je-line-date')) event.target.dataset.manualDate = '1';
});

function getMultiDateJournalState() {
  const grouped = {};
  const errors = [];
  document.querySelectorAll('#jeLinesBody tr').forEach((row, index) => {
    const date = row.querySelector('.je-line-date')?.value || document.getElementById('jeTransDate')?.value || '';
    const raw = row.querySelector('.je-line-acc')?.value.trim() || '';
    const account = getSelectedAccountInfo(raw);
    const debit = parseCleanNumber(row.querySelector('.je-line-dr')?.value || '');
    const credits = [...row.querySelectorAll('.je-line-cr')].map(i => ({currency:i.dataset.currency,value:parseCleanNumber(i.value)})).filter(x => x.value > 0);
    if (!raw && !debit && !credits.length) return;
    if (!date) { errors.push(`Row ${index + 1}: choose a transaction date.`); return; }
    if (!account) { errors.push(`Row ${index + 1}: select a valid Chart of Accounts account.`); return; }
    if (debit > 0 && credits.length) errors.push(`Row ${index + 1}: use either Debit or Credit, not both.`);
    if (credits.length > 1) errors.push(`Row ${index + 1}: only one credit currency may be used.`);
    credits.forEach(c => { if (c.currency !== account.currency) errors.push(`Row ${index + 1}: ${account.name} must use CR-${account.currency}.`); });
    grouped[date] ||= { totals:{}, lines:[] };
    grouped[date].totals[account.currency] ||= {debit:0,credit:0};
    const memo = row.querySelector('.je-line-memo')?.value.trim() || document.getElementById('jeGeneralMemo')?.value.trim() || '';
    if (debit > 0) {
      grouped[date].totals[account.currency].debit += debit;
      grouped[date].lines.push({account:account.name,currency:account.currency,memo,debit,credit:0});
    }
    credits.forEach(c => {
      grouped[date].totals[c.currency] ||= {debit:0,credit:0};
      grouped[date].totals[c.currency].credit += c.value;
      grouped[date].lines.push({account:account.name,currency:c.currency,memo,debit:0,credit:c.value});
    });
  });
  const differences = [];
  Object.entries(grouped).forEach(([date,g]) => {
    if (g.lines.length < 2) errors.push(`${date}: at least two posting lines are required.`);
    Object.entries(g.totals).forEach(([currency,t]) => {
      if (Math.abs(t.debit - t.credit) >= .001) differences.push({date,currency,...t});
    });
  });
  return {grouped,errors,differences};
}

const calculateJournalBalanceV5 = calculateJournalBalance;
calculateJournalBalance = function() {
  if (!document.getElementById('jeMultipleDates')?.checked) return calculateJournalBalanceV5();
  const state = getMultiDateJournalState();
  const badge = document.getElementById('jeBalanceIndicator');
  const postBtn = document.getElementById('btnPostJournal');
  if (!badge) return;
  if (state.errors.length) {
    badge.className='je-status-badge unbalanced'; badge.textContent=state.errors[0]; if(postBtn)postBtn.disabled=true; return;
  }
  if (!Object.keys(state.grouped).length) {
    badge.className='je-status-badge balanced'; badge.textContent='Ready — each date balances separately'; if(postBtn)postBtn.disabled=false; return;
  }
  if (state.differences.length) {
    const d=state.differences[0]; badge.className='je-status-badge unbalanced'; badge.textContent=`${d.date} ${d.currency}: DR ${formatCompactAmount(d.debit)} / CR ${formatCompactAmount(d.credit)}`; if(postBtn)postBtn.disabled=true; return;
  }
  badge.className='je-status-badge balanced'; badge.textContent=`Balanced — ${Object.keys(state.grouped).length} date${Object.keys(state.grouped).length===1?'':'s'}`; if(postBtn)postBtn.disabled=false;
};

const submitJournalEntryV5 = submitJournalEntry;
submitJournalEntry = function() {
  if (!document.getElementById('jeMultipleDates')?.checked) return submitJournalEntryV5();
  if (JournalModule.editingEntryId) {
    showAppNotification('Multiple Dates Unavailable While Editing','Edit an existing journal voucher using its original single transaction date.',true); return;
  }
  const generalMemo=document.getElementById('jeGeneralMemo')?.value.trim();
  if(!generalMemo){showAppNotification('Missing Data','Please provide the General Description / Memo before posting.',true);return;}
  const state=getMultiDateJournalState();
  if(state.errors.length){showAppNotification('Check Journal Entry',state.errors.join(' '),true);return;}
  if(state.differences.length){const d=state.differences[0];showAppNotification('Unbalanced Batch',`${d.date} does not balance in ${d.currency}. Debit ${formatCompactAmount(d.debit)} vs Credit ${formatCompactAmount(d.credit)}. Each date and currency must balance independently.`,true);return;}
  const groups=Object.entries(state.grouped);
  if(!groups.length){showAppNotification('Incomplete','Enter at least one balanced transaction.',true);return;}
  const postedIds=[];
  groups.forEach(([date,g])=>{
    const entryId=generateEntryId(); postedIds.push(entryId);
    g.lines.forEach(item=>JournalModule.entries.unshift({id:entryId,date,...item,editReason:'',archived:false}));
    JournalModule.sequence++;
  });
  showAppNotification('Batch Posted',`${postedIds.length} journal ${postedIds.length===1?'entry':'entries'} posted successfully: ${postedIds.join(', ')}.`,false);
  const check=document.getElementById('jeMultipleDates'); if(check)check.checked=false; document.body.classList.remove('je-multi-date');
  finalizePostSuccess();
};

// Unified centered confirmation dialog, visually consistent with accounting warnings.
function showAppConfirm(title, message, confirmText, onConfirm, danger = true) {
  document.getElementById('activeAppConfirm')?.remove();if(showAppConfirm.keyHandler)document.removeEventListener('keydown',showAppConfirm.keyHandler,true);
  const overlay=document.createElement('div');overlay.id='activeAppConfirm';overlay.className='custom-alert-overlay';
  overlay.innerHTML=`<div class="custom-alert-box" style="border-top-color:${danger?'#dc2626':'#059669'}!important"><h3 style="margin:0 0 8px;color:${danger?'#991b1b':'#065f46'};font-size:16px">${title}</h3><p style="color:#475569;font-size:13px;line-height:1.5;margin:0 0 16px">${message}</p><div style="display:flex;justify-content:flex-end;gap:8px"><button class="je-btn je-btn-secondary" data-cancel>Cancel</button><button class="je-btn ${danger?'je-btn-danger':'je-btn-emerald'}" data-confirm>${confirmText}</button></div></div>`;
  let handled=false;const close=()=>{overlay.remove();document.removeEventListener('keydown',keyHandler,true);showAppConfirm.keyHandler=null};const confirm=()=>{if(handled)return;handled=true;close();onConfirm()};const cancel=()=>{if(handled)return;handled=true;close()};const keyHandler=event=>{if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();confirm()}else if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel()}};
  overlay.querySelector('[data-cancel]').onclick=cancel;overlay.querySelector('[data-confirm]').onclick=confirm;
  document.body.appendChild(overlay);showAppConfirm.keyHandler=keyHandler;document.addEventListener('keydown',keyHandler,true);
}

// Archive uses a true warning/confirmation instead of a small transient notification.
archiveTransactionMonth = function(monthKey) {
  const ids=new Set(JournalModule.entries.filter(e=>monthKeyFromDate(e.date)===monthKey&&!e.archived).map(e=>e.id));
  if(!ids.size)return;
  showAppConfirm('Submit Month for Review',`You are about to archive every open transaction for ${monthLabel(monthKey)}. Direct editing will stop and future corrections must use Period Review.`,'Submit & Archive',async()=>{
    if(ojmDb){const {error}=await ojmDb.rpc('set_accounting_period_status',{p_month:`${monthKey}-01`,p_status:'review'});if(error){showAppNotification('Archive Failed',error.message,true);return}}
    const stamp=new Date().toISOString();
    JournalModule.entries.forEach(e=>{if(ids.has(e.id)){e.archived=true;e.archivedAt=stamp;}});
    PeriodReview.periods[monthKey]={...(PeriodReview.periods[monthKey]||{}),status:'review',updatedAt:stamp,updatedBy:liveProfile?.id||'local'};PeriodReview.save();
    refreshAllTables();showAppNotification('Month Submitted',`${monthLabel(monthKey)} was archived and moved to All Transactions for review.`,false);
  },true);
};

// V6 initialization hooks.
function initializeV6Enhancements(){
  syncCoaDatalist();
  setupJournalColumns();
  document.querySelectorAll('.je-line-acc').forEach(updateJournalAccountBadge);
  toggleMultipleDates(false);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeV6Enhancements,{once:true});else initializeV6Enhancements();

// ==============================================================================
// JS V11: DEMO EMAIL LOGIN, USERS & STAFF ENTRY APPROVAL WORKFLOW
// Replace this local demo layer with Supabase Auth and database policies.
// ==============================================================================
const DEMO_USERS_KEY = 'ojm_demo_users_v1';
const ENTRY_SUBMISSIONS_KEY = 'ojm_entry_submissions_v1';
const DEMO_SESSION_KEY = 'ojm_demo_session_v1';
const DEFAULT_DEMO_USERS = [
  { id:'usr-admin-1', name:'Demo Administrator', email:'admin@oonjai.demo', password:'Admin123!', role:'admin', active:true },
  { id:'usr-staff-1', name:'Head Cook', email:'headcook@oonjai.demo', password:'Staff123!', role:'submitter', active:true }
];

const DemoAccess = {
  users: [], submissions: [], currentUser: null,
  load() {
    try { this.users = JSON.parse(localStorage.getItem(DEMO_USERS_KEY) || 'null') || [...DEFAULT_DEMO_USERS]; } catch (_) { this.users = [...DEFAULT_DEMO_USERS]; }
    try { this.submissions = JSON.parse(localStorage.getItem(ENTRY_SUBMISSIONS_KEY) || '[]'); } catch (_) { this.submissions = []; }
    try {
      const id = sessionStorage.getItem(DEMO_SESSION_KEY);
      this.currentUser = this.users.find(user => user.id === id && user.active) || null;
    } catch (_) { this.currentUser = null; }
    this.saveUsers();
  },
  saveUsers() { localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(this.users)); },
  saveSubmissions() { localStorage.setItem(ENTRY_SUBMISSIONS_KEY, JSON.stringify(this.submissions)); }
};

function handleDemoLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const user = DemoAccess.users.find(item => item.active && item.email.toLowerCase() === email && item.password === password);
  const error = document.getElementById('loginError');
  if (!user) { if (error) error.textContent = 'The email or password is incorrect.'; return; }
  DemoAccess.currentUser = user;
  sessionStorage.setItem(DEMO_SESSION_KEY, user.id);
  if (error) error.textContent = '';
  applyDemoAccess();
}

function logoutDemoUser() {
  sessionStorage.removeItem(DEMO_SESSION_KEY);
  DemoAccess.currentUser = null;
  document.getElementById('loginGate')?.classList.remove('is-authenticated');
  const password = document.getElementById('loginPassword'); if (password) password.value = '';
}

function applyDemoAccess() {
  const user = DemoAccess.currentUser;
  document.getElementById('loginGate')?.classList.toggle('is-authenticated', Boolean(user));
  if (!user) return;
  document.body.dataset.userRole = user.role;
  const chip = document.getElementById('currentUserChip');
  if (chip) chip.textContent = `${user.name} • ${user.role === 'admin' ? 'Admin' : 'Staff'}`;
  document.querySelectorAll('.nav-category').forEach(category => {
    category.hidden = user.role !== 'admin' && category.dataset.module !== 'submissions';
  });
  document.querySelectorAll('.submission-admin-column').forEach(element => element.hidden = user.role !== 'admin');
  const roleBadge = document.getElementById('submissionRoleBadge');
  if (roleBadge) roleBadge.textContent = user.role === 'admin' ? 'Administrator Review' : 'Staff Workspace';
  const tableTitle = document.getElementById('submissionTableTitle');
  if (tableTitle) tableTitle.textContent = user.role === 'admin' ? 'Submission Review Queue' : 'My Submissions';
  renderDemoUsers(); renderEntrySubmissions(); updateSubmissionCount();
  if (user.role !== 'admin') switchTab('entry-submissions');
}

function addDemoUser(event) {
  event.preventDefault();
  if (DemoAccess.currentUser?.role !== 'admin') return;
  const email = document.getElementById('demoUserEmail').value.trim().toLowerCase();
  if (DemoAccess.users.some(user => user.email.toLowerCase() === email)) { showAppNotification('Duplicate Email','A user with this email already exists.',true); return; }
  DemoAccess.users.push({
    id:`usr-${Date.now()}`, name:document.getElementById('demoUserName').value.trim(), email,
    password:document.getElementById('demoUserPassword').value, role:document.getElementById('demoUserRole').value, active:true
  });
  DemoAccess.saveUsers(); event.target.reset(); renderDemoUsers();
  showAppNotification('Demo User Added','The new local demo account is ready for testing.',false);
}

function toggleDemoUser(id) {
  if (DemoAccess.currentUser?.role !== 'admin' || id === DemoAccess.currentUser.id) return;
  const user = DemoAccess.users.find(item => item.id === id); if (!user) return;
  user.active = !user.active; DemoAccess.saveUsers(); renderDemoUsers();
}

function renderDemoUsers() {
  const host = document.getElementById('demoUsersList'); if (!host) return;
  host.innerHTML = DemoAccess.users.map(user => `<div class="demo-user-row">
    <div class="demo-user-avatar">${escapeHtml(user.name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div>
    <div class="demo-user-details"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span></div>
    <span class="user-role-badge ${user.role}">${user.role === 'admin' ? 'Administrator' : 'Staff Submitter'}</span>
    <span class="user-status-badge ${user.active ? 'active' : 'inactive'}">${user.active ? 'Active' : 'Inactive'}</span>
    <button type="button" class="je-btn je-btn-secondary" ${user.id === DemoAccess.currentUser?.id ? 'disabled' : ''} onclick="toggleDemoUser('${user.id}')">${user.active ? 'Deactivate' : 'Activate'}</button>
  </div>`).join('');
}

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

function reviewEntrySubmission(id, decision) {
  if (DemoAccess.currentUser?.role !== 'admin') return;
  const item = DemoAccess.submissions.find(row => row.id === id); if (!item || item.status !== 'pending') return;
  if (decision === 'rejected') {
    const reason = prompt('Reason for rejection:'); if (!reason) return;
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
    <td class="num">${currencySymbolV6(item.currency)} ${Number(item.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td>
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
  if (tabId === 'entry-submissions') {
    const title = document.getElementById('mainHeaderTitle'); if (title) title.textContent = 'Entry Submissions';
    renderEntrySubmissions();
  }
  if (tabId === 'settings-users') renderDemoUsers();
};
// ==============================================================================
// JS V12: LIVE SUPABASE AUTHENTICATION & DATA ADAPTER
// ==============================================================================
let ojmDb = null;
let liveProfile = null;
let liveProfiles = [];
let liveLegalDocuments = [];
let freshLoginRequested = false;

handleDemoLogin = async function(event) {
  event.preventDefault();
  freshLoginRequested = true;
  const errorBox = document.getElementById('loginError');
  if (errorBox) errorBox.textContent = 'Signing in…';
  const { error } = await ojmDb.auth.signInWithPassword({
    email:document.getElementById('loginEmail').value.trim(), password:document.getElementById('loginPassword').value
  });
  if (error && errorBox) errorBox.textContent = error.message;
};

logoutDemoUser = async function() { const error=document.getElementById('loginError');if(error)error.textContent='';localStorage.removeItem('ojm_last_active_view_v1');freshLoginRequested=false;if (ojmDb) await ojmDb.auth.signOut(); };

async function loadLiveProfile(user) {
  const { data, error } = await ojmDb.from('profiles').select('id,email,full_name,role,status').eq('id',user.id).single();
  if (error) throw new Error(`Profile unavailable: ${error.message}. Run the supplied SQL before signing in.`);
  if (data.status !== 'active') throw new Error('This user account is inactive.');
  liveProfile = data;
  DemoAccess.currentUser = {id:data.id,email:data.email,name:data.full_name || data.email,role:data.role,active:true};
}

function applyLiveRoleAccess() {
  const user = DemoAccess.currentUser;
  document.getElementById('loginGate')?.classList.add('is-authenticated');
  document.body.dataset.userRole = user.role;
  const chip=document.getElementById('currentUserChip'); if(chip)chip.textContent=`${user.name} • ${user.role==='admin'?'Admin':'Staff'}`;
  document.querySelectorAll('.nav-category').forEach(category=>category.hidden=user.role!=='admin'&&category.dataset.module!=='submissions');
  document.querySelectorAll('.submission-admin-column').forEach(el=>el.hidden=user.role!=='admin');
  const roleBadge=document.getElementById('submissionRoleBadge'); if(roleBadge)roleBadge.textContent=user.role==='admin'?'Administrator Review':'Staff Workspace';
  const title=document.getElementById('submissionTableTitle'); if(title)title.textContent=user.role==='admin'?'Submission Review Queue':'My Submissions';
}

async function loadReferenceDataFromSupabase() {
  const [{data:currencies,error:currencyError},{data:accounts,error:accountError},{data:subs,error:subError}] = await Promise.all([
    ojmDb.from('currencies').select('*').eq('is_active',true).order('code'),
    ojmDb.from('accounts').select('*').eq('is_active',true).order('code'),
    ojmDb.from('sub_accounts').select('*').eq('is_active',true).order('code')
  ]);
  if(currencyError||accountError||subError) throw new Error((currencyError||accountError||subError).message);
  CurrencyStore.currencies=(currencies||[]).map(c=>({code:c.code,name:c.name,symbol:c.symbol,isBase:c.is_base}));
  AccountingStore.accounts=(accounts||[]).map(a=>({id:a.id,code:a.code,name:a.name,currency:a.currency_code,type:a.account_type,desc:a.description||''}));
  AccountingStore.subAccounts=(subs||[]).map(s=>({id:s.id,parentId:s.parent_account_id,parentCode:AccountingStore.accounts.find(a=>a.id===s.parent_account_id)?.code||'',code:s.code,name:s.name,desc:s.description||''}));
  CurrencyStore.render(); refreshSettingsCurrencyOptions(); renderChartOfAccountsTable(); renderSubAccountsTable(); setupJournalColumns();
}

CurrencyStore.add = async function(code,name,symbol){const clean=code.toUpperCase().trim();const{error}=await ojmDb.from('currencies').insert({code:clean,name:name.trim(),symbol:symbol.trim()||clean,is_base:false});if(error){showAppNotification('Currency Save Failed',error.message,true);return}await loadReferenceDataFromSupabase()};
CurrencyStore.edit = async function(code){const current=this.currencies.find(c=>c.code===code);if(!current)return;const name=prompt(`Currency name for ${code}:`,current.name);if(name===null)return;const symbol=prompt(`Symbol for ${code}:`,current.symbol);if(symbol===null)return;const{error}=await ojmDb.from('currencies').update({name:name.trim(),symbol:symbol.trim()}).eq('code',code);if(error){showAppNotification('Currency Update Failed',error.message,true);return}await loadReferenceDataFromSupabase()};
CurrencyStore.remove = async function(code){if(!confirm(`Remove currency ${code}?`))return;const{error}=await ojmDb.from('currencies').delete().eq('code',code);if(error){showAppNotification('Currency Delete Failed','The currency may still be linked to accounts or transactions.',true);return}await loadReferenceDataFromSupabase()};

handleAccountFormSubmit = async function(event){event.preventDefault();const original=document.getElementById('accountOrigCode').value;const payload={code:document.getElementById('accCode').value.trim(),name:document.getElementById('accName').value.trim(),currency_code:document.getElementById('accCurrency').value,account_type:document.getElementById('accType').value,description:document.getElementById('accDesc').value.trim(),created_by:liveProfile.id};const existing=AccountingStore.accounts.find(a=>a.code===original);const query=existing?ojmDb.from('accounts').update(payload).eq('id',existing.id):ojmDb.from('accounts').insert(payload);const{error}=await query;if(error){showAppNotification('Account Save Failed',error.message,true);return}closeModal('modalAccount');await loadReferenceDataFromSupabase()};
promptDeleteAccount = function(code){const acc=AccountingStore.accounts.find(a=>a.code===code);if(!acc)return;document.getElementById('confirmDeletePrompt').innerText=`Delete account “${acc.code} — ${acc.name}”? Linked sub-accounts will also be deleted.`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{const{error}=await ojmDb.from('accounts').delete().eq('id',acc.id);if(error){showAppNotification('Account Delete Failed','Posted journal lines may protect this account from deletion. Deactivate it instead.',true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};
handleSubAccountFormSubmit = async function(event){event.preventDefault();const original=document.getElementById('subAccountOrigCode').value,parent=AccountingStore.accounts.find(a=>a.code===document.getElementById('subParentCode').value);const payload={parent_account_id:parent.id,code:document.getElementById('subCode').value.trim(),name:document.getElementById('subName').value.trim(),description:document.getElementById('subDesc').value.trim()};const existing=AccountingStore.subAccounts.find(s=>s.code===original);const query=existing?ojmDb.from('sub_accounts').update(payload).eq('id',existing.id):ojmDb.from('sub_accounts').insert(payload);const{error}=await query;if(error){showAppNotification('Sub-Account Save Failed',error.message,true);return}closeModal('modalSubAccount');await loadReferenceDataFromSupabase()};
promptDeleteSubAccount = function(code){const sub=AccountingStore.subAccounts.find(s=>s.code===code);if(!sub)return;document.getElementById('confirmDeletePrompt').innerText=`Delete sub-account “${sub.code} — ${sub.name}”?`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{const{error}=await ojmDb.from('sub_accounts').delete().eq('id',sub.id);if(error){showAppNotification('Delete Failed',error.message,true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};

async function loadBusinessSettingsFromSupabase() {
  const {data,error}=await ojmDb.from('business_settings').select('*').eq('id',true).single(); if(error)return;
  const value={legalName:data.legal_name||'',companyName:data.display_name||'',enterpriseNo:data.enterprise_no||'',taxId:data.tax_id||'',businessLicense:data.business_license||'',industry:data.industry||'',phone:data.phone||'',email:data.email||'',website:data.website||'',address1:data.address_line||'',city:data.city||'',postalCode:data.postal_code||'',country:data.country||'Laos',timezone:data.timezone||'Asia/Vientiane'};
  BusinessSettings.current=value; AccountingStore.companyName=value.companyName;
  Object.entries(BUSINESS_FIELD_MAP).forEach(([key,id])=>{const field=document.getElementById(id);if(field)field.value=value[key]||''});
  renderBusinessIdentity(value,true);
  syncEntrySequence();updateNextEntryIdDisplay();
  const badge=document.getElementById('businessSavedBadge');if(badge){badge.textContent='Synced';badge.classList.add('is-saved')}
  const status=document.getElementById('businessSettingsStatus');if(status)status.textContent='Business profile loaded from Supabase.';
}

saveBusinessSettings = async function(event) {
  event?.preventDefault(); const form=document.getElementById('businessSettingsForm'); if(!form?.checkValidity()){form?.reportValidity();return}
  const v=collectBusinessSettings();
  const payload={id:true,legal_name:v.legalName,display_name:v.companyName,enterprise_no:v.enterpriseNo,tax_id:v.taxId,business_license:v.businessLicense,industry:v.industry,phone:v.phone,email:v.email,website:v.website,address_line:v.address1,city:v.city,postal_code:v.postalCode,country:v.country,timezone:v.timezone,updated_by:liveProfile.id,updated_at:new Date().toISOString()};
  const {error}=await ojmDb.from('business_settings').upsert(payload); if(error){showAppNotification('Save Failed',error.message,true);return}
  BusinessSettings.current=v;AccountingStore.companyName=v.companyName;renderBusinessIdentity(v,true);syncEntrySequence();updateNextEntryIdDisplay();
  const status=document.getElementById('businessSettingsStatus');if(status){status.textContent=`Saved ${new Date().toLocaleString()} to Supabase.`;status.classList.add('is-save-confirmation')}
};

async function loadJournalFromSupabase() {
  const {data,error}=await ojmDb.from('journal_entries').select('id,entry_no,transaction_date,memo,status,source,journal_lines(line_no,description,currency_code,debit,credit,line_date,accounts(id,name,code))').order('transaction_date',{ascending:false});
  if(error)throw new Error(error.message);
  JournalModule.entries=[];
  (data||[]).filter(e=>e?.status==='posted').forEach(entry=>(entry?.journal_lines||[]).filter(Boolean).forEach(line=>JournalModule.entries.push({dbEntryId:entry.id,id:entry.entry_no||entry.id||'Unnumbered entry',date:line.line_date||entry.transaction_date,account:line.accounts?.name||'Unknown Account',currency:line.currency_code,memo:line.description||entry.memo||'',debit:Number(line.debit),credit:Number(line.credit),editReason:'',archived:false})));
  syncEntrySequence();updateNextEntryIdDisplay();
  refreshAllTables();
}

function collectLiveJournalGroups() {
  if(document.getElementById('jeMultipleDates')?.checked)return getMultiDateJournalState();
  const date=document.getElementById('jeTransDate').value,memo=document.getElementById('jeGeneralMemo').value.trim(),grouped={},errors=[];
  if(!date||!memo)errors.push('Enter a date and general memo.'); grouped[date]={totals:{},lines:[]};
  document.querySelectorAll('#jeLinesBody tr').forEach((row,index)=>{
    const acc=getSelectedAccountInfo(row.querySelector('.je-line-acc')?.value||''),debit=parseCleanNumber(row.querySelector('.je-line-dr')?.value||''),credits=[...row.querySelectorAll('.je-line-cr')].map(i=>({currency:i.dataset.currency,value:parseCleanNumber(i.value)})).filter(x=>x.value>0);
    if(!acc&&(debit||credits.length)){errors.push(`Row ${index+1}: select a valid account.`);return} if(!acc)return;
    const description=row.querySelector('.je-line-memo')?.value.trim()||memo; grouped[date].totals[acc.currency]||={debit:0,credit:0};
    if(debit){grouped[date].totals[acc.currency].debit+=debit;grouped[date].lines.push({account:acc,currency:acc.currency,memo:description,debit,credit:0})}
    credits.forEach(c=>{if(c.currency!==acc.currency)errors.push(`Row ${index+1}: account currency must be ${acc.currency}.`);grouped[date].totals[c.currency]||={debit:0,credit:0};grouped[date].totals[c.currency].credit+=c.value;grouped[date].lines.push({account:acc,currency:c.currency,memo:description,debit:0,credit:c.value})});
  });
  const differences=[];Object.entries(grouped).forEach(([d,g])=>Object.entries(g.totals).forEach(([currency,t])=>{if(Math.abs(t.debit-t.credit)>=.001)differences.push({date:d,currency,...t})}));
  return{grouped,errors,differences};
}

submitJournalEntry = async function() {
  if(liveProfile?.role!=='admin'&&!livePermission?.can_post_directly){showAppNotification('Access Denied','Direct journal posting is not enabled for this user.',true);return}
  const state=collectLiveJournalGroups();if(state.errors.length){showAppNotification('Check Entry',state.errors[0],true);return}if(state.differences.length){showAppNotification('Unbalanced Entry','Each currency must balance before posting.',true);return}
  const groups=Object.entries(state.grouped).filter(([,g])=>g.lines.length>=2);if(!groups.length){showAppNotification('Incomplete','Enter at least two balanced lines.',true);return}
  if(JournalModule.editingEntryId){
    if(groups.length!==1){showAppNotification('One Date Required','An edited entry must remain a single balanced transaction date.',true);return}
    const [date,g]=groups[0],oldLines=JournalModule.entries.filter(row=>row.id===JournalModule.editingEntryId);
    if(oldLines.some(row=>row.archived)||PeriodReview.status(String(oldLines[0]?.date||date).slice(0,7))!=='open'){showAppNotification('Archived Period','Only open-period transactions can be edited directly.',true);return}
    JournalModule.pendingLines=g.lines.map(line=>({date,account:line.account,accountId:line.account.id,currency:line.currency,memo:line.memo,debit:line.debit,credit:line.credit}));
    document.getElementById('txtEditReason').value='';openModal('modalEditReason');return;
  }
  for(const [date,g] of groups){
    const entryNo=generateEntryId();JournalModule.sequence++; const memo=document.getElementById('jeGeneralMemo').value.trim();
    const {data:entry,error}=await ojmDb.from('journal_entries').insert({entry_no:entryNo,transaction_date:date,memo,status:'posted',source:'manual',posted_by:liveProfile.id,posted_at:new Date().toISOString()}).select('id').single();
    if(error){showAppNotification('Posting Failed',error.message,true);return}
    const lines=g.lines.map((line,i)=>({journal_entry_id:entry.id,line_no:i+1,account_id:line.account.id,description:line.memo,currency_code:line.currency,debit:line.debit,credit:line.credit,line_date:date}));
    const {error:lineError}=await ojmDb.from('journal_lines').insert(lines);if(lineError){showAppNotification('Line Posting Failed',lineError.message,true);return}
  }
  await loadJournalFromSupabase();showAppNotification('Posted','The balanced journal entry was saved to Supabase.',false);finalizePostSuccess();
};

async function loadSubmissionsFromSupabase() {
  const query=ojmDb.from('entry_submissions').select('*').order('submitted_at',{ascending:false}); const {data,error}=await query;if(error)throw new Error(error.message);
  DemoAccess.submissions=(data||[]).map(s=>({id:s.id,date:s.transaction_date,memo:s.memo,reference:s.reference||'',debitAccount:AccountingStore.accounts.find(a=>a.id===s.debit_account_id)?.name||'Unknown',creditAccount:AccountingStore.accounts.find(a=>a.id===s.credit_account_id)?.name||'Unknown',amount:Number(s.amount),currency:s.currency_code,submittedBy:s.submitted_by,submittedAt:s.submitted_at,status:s.status,reviewedBy:s.reviewed_by,reviewedAt:s.reviewed_at,rejectionReason:s.rejection_reason||'',journalEntryId:s.journal_entry_id||''}));
  renderEntrySubmissions();updateSubmissionCount();
}

saveEntrySubmission = async function(event) {
  event.preventDefault();const debit=getSelectedAccountInfo(document.getElementById('submissionDebit').value),credit=getSelectedAccountInfo(document.getElementById('submissionCredit').value),currency=document.getElementById('submissionCurrency').value;
  if(!debit||!credit){showAppNotification('Account Required','Choose valid debit and credit accounts.',true);return}if(debit.currency!==currency||credit.currency!==currency){showAppNotification('Currency Mismatch',`Both accounts must use ${currency}.`,true);return}
  const {error}=await ojmDb.from('entry_submissions').insert({transaction_date:document.getElementById('submissionDate').value,memo:document.getElementById('submissionMemo').value.trim(),reference:document.getElementById('submissionReference').value.trim(),debit_account_id:debit.id,credit_account_id:credit.id,currency_code:currency,amount:Number(document.getElementById('submissionAmount').value),submitted_by:liveProfile.id});
  if(error){showAppNotification('Submission Failed',error.message,true);return}event.target.reset();setSubmissionDateToday();await loadSubmissionsFromSupabase();
};

reviewEntrySubmission = async function(id,decision) {
  if(liveProfile?.role!=='admin'&&!livePermission?.can_approve)return;
  if(decision==='rejected'){const reason=prompt('Reason for rejection:');if(!reason)return;const{error}=await ojmDb.rpc('reject_entry_submission',{p_submission_id:id,p_reason:reason});if(error){showAppNotification('Reject Failed',error.message,true);return}}
  else{const{error}=await ojmDb.rpc('approve_entry_submission',{p_submission_id:id});if(error){showAppNotification('Approval Failed',error.message,true);return}}
  await Promise.all([loadSubmissionsFromSupabase(),loadJournalFromSupabase()]);
};

async function loadProfilesFromSupabase() { if(liveProfile?.role!=='admin')return;const{data,error}=await ojmDb.from('profiles').select('*').order('created_at');if(!error){liveProfiles=data||[];renderDemoUsers()}}
renderDemoUsers = function(){const host=document.getElementById('demoUsersList');if(!host)return;host.innerHTML=liveProfiles.map(u=>`<div class="demo-user-row"><div class="demo-user-avatar">${escapeHtml((u.full_name||u.email).slice(0,2).toUpperCase())}</div><div class="demo-user-details"><strong>${escapeHtml(u.full_name||'Unnamed User')}</strong><span>${escapeHtml(u.email)}</span></div><span class="user-role-badge ${u.role}">${u.role==='admin'?'Administrator':'Staff Submitter'}</span><span class="user-status-badge ${u.status}">${u.status}</span><span class="je-subtitle">Managed through Supabase Auth</span></div>`).join('')};
addDemoUser = function(event){event.preventDefault();showAppNotification('Secure User Creation','Create or invite the user in Supabase Authentication. A protected Edge Function will later bring this action into the app without exposing an administrator secret.',false)};

async function loadLegalDocumentsFromSupabase(){if(liveProfile?.role!=='admin')return;const{data,error}=await ojmDb.from('legal_documents').select('*').order('uploaded_at',{ascending:false});if(!error){liveLegalDocuments=data||[];renderLegalDocuments()}}
renderLegalDocuments = async function(){const host=document.getElementById('legalDocumentsList');if(!host)return;host.innerHTML=liveLegalDocuments.length?liveLegalDocuments.map(d=>`<div class="legal-doc-row"><div class="legal-doc-icon">${/pdf/i.test(d.mime_type||'')?'PDF':'FILE'}</div><div class="legal-doc-meta"><strong>${escapeHtml(d.file_name)}</strong><span>${formatLegalDocSize(Number(d.size_bytes||0))} • ${new Date(d.uploaded_at).toLocaleString()}</span></div><div class="legal-doc-actions"><button type="button" class="je-btn je-btn-secondary" onclick="downloadLegalDocument('${d.id}')">Download</button><button type="button" class="btn-action-delete" onclick="deleteLegalDocument('${d.id}')">✕</button></div></div>`).join(''):'<div class="legal-doc-empty">No legal documents uploaded yet.</div>'};
uploadLegalDocuments = async function(event){for(const file of [...event.target.files]){if(file.size>10485760){showAppNotification('File Too Large',`${file.name} exceeds 10 MB.`,true);continue}const path=`${liveProfile.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;const{error:uploadError}=await ojmDb.storage.from('legal-documents').upload(path,file);if(uploadError){showAppNotification('Upload Failed',uploadError.message,true);continue}await ojmDb.from('legal_documents').insert({file_name:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,uploaded_by:liveProfile.id})}event.target.value='';await loadLegalDocumentsFromSupabase()};
downloadLegalDocument = async function(id){const doc=liveLegalDocuments.find(d=>d.id===id);if(!doc)return;const{data,error}=await ojmDb.storage.from('legal-documents').createSignedUrl(doc.storage_path,60);if(error){showAppNotification('Download Failed',error.message,true);return}window.open(data.signedUrl,'_blank')};
deleteLegalDocument = async function(id){if(!confirm('Delete this legal document permanently?'))return;const doc=liveLegalDocuments.find(d=>d.id===id);if(!doc)return;await ojmDb.storage.from('legal-documents').remove([doc.storage_path]);const{error}=await ojmDb.from('legal_documents').delete().eq('id',id);if(error){showAppNotification('Delete Failed',error.message,true);return}await loadLegalDocumentsFromSupabase()};

async function hydrateSupabaseSession(session) {
  try {
    await loadLiveProfile(session.user);applyLiveRoleAccess();
    await loadReferenceDataFromSupabase();
    await Promise.all([loadBusinessSettingsFromSupabase(),loadJournalFromSupabase(),loadSubmissionsFromSupabase(),loadProfilesFromSupabase(),loadLegalDocumentsFromSupabase()]);
    const savedView=localStorage.getItem('ojm_last_active_view_v1');
    const nextView=freshLoginRequested?'dashboard':(document.getElementById(savedView)?savedView:'dashboard');
    if(nextView.startsWith('sec-'))scrollToAccountModule(nextView);else switchTab(nextView);
    freshLoginRequested=false;
  } catch(error) { document.getElementById('loginGate')?.classList.remove('is-authenticated');const box=document.getElementById('loginError');if(box)box.textContent=error.message; }
}

async function initializeSupabaseApp() {
  const errorBox=document.getElementById('loginError');
  if(!window.supabase||!window.OJM_SUPABASE_URL||!window.OJM_SUPABASE_ANON_KEY){if(errorBox)errorBox.textContent='Supabase configuration could not be loaded.';return}
  ojmDb=window.supabase.createClient(window.OJM_SUPABASE_URL,window.OJM_SUPABASE_ANON_KEY);
  // Restore a valid session and its last view. Only an explicit new sign-in starts on Dashboard.
  const {data:{session}}=await ojmDb.auth.getSession();
  if(session)await hydrateSupabaseSession(session);
  ojmDb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session)setTimeout(()=>hydrateSupabaseSession(session),0);if(event==='SIGNED_OUT'){liveProfile=null;DemoAccess.currentUser=null;const error=document.getElementById('loginError');if(error)error.textContent='';document.getElementById('loginGate')?.classList.remove('is-authenticated')}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeSupabaseApp,{once:true});else initializeSupabaseApp();
// ==============================================================================

// PERIOD REVIEW & CLOSING
const PERIOD_REVIEW_KEY='ojm_period_review_v1';
const PeriodReview={selectedMonth:new Date().toISOString().slice(0,7),periods:{},findings:[],pendingAdjustment:null,
  load(){try{const saved=JSON.parse(localStorage.getItem(PERIOD_REVIEW_KEY)||'{}');this.periods=saved.periods||{};this.findings=saved.findings||{};if(!Array.isArray(this.findings))this.findings=[];this.findings.map(item=>item.auditRecord).filter(Boolean).forEach(record=>{if(!JournalModule.voidedEntries.some(existing=>existing.periodFindingId===record.periodFindingId))JournalModule.voidedEntries.unshift(record)})}catch(_){this.periods={};this.findings=[]}},
  save(){localStorage.setItem(PERIOD_REVIEW_KEY,JSON.stringify({periods:this.periods,findings:this.findings}))},
  status(month=this.selectedMonth){return this.periods[month]?.status||'open'}
};
function periodEntries(month=PeriodReview.selectedMonth){return JournalModule.entries.filter(entry=>String(entry.date).slice(0,7)===month)}
function selectReviewPeriod(month){if(month)PeriodReview.selectedMonth=month;renderPeriodReview()}
function setupPeriodSelector(month=PeriodReview.selectedMonth){const [year,monthNo]=month.split('-'),select=document.getElementById('periodReviewMonthSelect'),yearInput=document.getElementById('periodReviewYear');if(select&&!select.options.length)select.innerHTML=Array.from({length:12},(_,i)=>`<option value="${String(i+1).padStart(2,'0')}">${new Intl.DateTimeFormat('en-US',{month:'long'}).format(new Date(2020,i,1))}</option>`).join('');if(select)select.value=monthNo;if(yearInput)yearInput.value=year}
function selectReviewPeriodFromControls(){const month=document.getElementById('periodReviewMonthSelect')?.value,year=document.getElementById('periodReviewYear')?.value;if(month&&year)selectReviewPeriod(`${year}-${month}`)}
function stepReviewYear(change){const input=document.getElementById('periodReviewYear');if(!input)return;input.value=Math.min(2100,Math.max(2000,Number(input.value||new Date().getFullYear())+change));selectReviewPeriodFromControls()}
function renderPeriodReview(){
  const month=PeriodReview.selectedMonth,rows=periodEntries(month),ids=[...new Set(rows.map(row=>row.id))],findings=PeriodReview.findings.filter(item=>item.month===month),status=PeriodReview.status(month);
  const setText=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
  setupPeriodSelector(month);
  setText('periodReviewStatus',status.toUpperCase());setText('periodReviewEntries',ids.length);
  setText('periodReviewDebits',rows.reduce((sum,row)=>sum+Number(row.debit||0),0).toLocaleString('en-US',{minimumFractionDigits:2}));
  setText('periodReviewOpenFindings',findings.filter(item=>!['corrected','closed'].includes(item.status)).length);
  setText('periodClosingMessage',status==='open'?'Open periods accept normal postings.':status==='review'?'The period is under review.':status==='closed'?'Normal postings are blocked. Approved adjustments remain available.':'This period is locked. Reopen it before making changes.');
  const statusNode=document.getElementById('periodReviewStatus');if(statusNode)statusNode.dataset.status=status;
  const reviewRoot=document.getElementById('period-review'),unavailable=document.getElementById('periodReviewUnavailable');
  if(reviewRoot)reviewRoot.classList.toggle('period-review-open',status==='open');
  if(unavailable)unavailable.hidden=status!=='open';
  if(status==='open')return;
  const transactionSelect=document.getElementById('findingTransactionId');if(transactionSelect)transactionSelect.innerHTML='<option value="">General period finding</option>'+ids.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');
  const tbody=document.getElementById('periodTransactionsBody');
  if(tbody){
    const grouped=rows.reduce((all,row)=>{(all[row.id]||(all[row.id]=[])).push(row);return all},{});
    tbody.innerHTML=ids.length?ids.map(id=>{
      const lines=grouped[id],first=lines[0],adjusted=isAdjustedTransaction(lines),dbId=first.dbEntryId||'',linked=findings.filter(item=>item.transactionId===id);
      const transactionRows=lines.map((row,index)=>{
        const account=getCleanAccountDisplay(row.account,row.currency);
        const rowClass=lines.length===1?'cluster-row-start cluster-row-end':index===0?'cluster-row-start':index===lines.length-1?'cluster-row-cont cluster-row-end':'cluster-row-cont';
        return `<tr class="${rowClass}" data-entry-id="${escapeHtml(id)}" data-line-index="${index}">${index===0?`<td rowspan="${lines.length}" class="entry-shared-cell">${formatAppDate(first.date)}</td><td rowspan="${lines.length}" class="entry-shared-cell"><div class="entry-id-stack"><span style="font-family:monospace;color:#065f46">${escapeHtml(id)}</span>${adjusted?`<button type="button" class="adjusted-entry-badge adjusted-entry-button" onclick="event.stopPropagation();openAdjustedDetails('${escapeHtml(id)}')">Adjusted</button>`:''}</div></td>`:''}<td><div class="transaction-account-display"><span class="currency-symbol-badge">${currencySymbolV6(account.currency)}</span><span class="account-clean-name">${escapeHtml(account.name)}</span></div></td><td>${escapeHtml(row.memo||'')}</td><td class="num">${Number(row.debit||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td class="num">${Number(row.credit||0).toLocaleString('en-US',{minimumFractionDigits:2})}</td>${index===0?`<td rowspan="${lines.length}" class="action-col entry-shared-cell"><div class="transaction-review-actions"><button class="je-btn je-btn-secondary" onclick="reviewPeriodTransaction('${escapeHtml(id)}')">Review</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}</div></td>`:''}</tr>`;
      }).join('');
      const findingRows=linked.map(item=>`<tr class="period-linked-finding"><td colspan="7"><span class="finding-status ${item.status}">${escapeHtml(item.status==='corrected'?'ADJUSTED':item.status.toUpperCase())}</span><strong>${escapeHtml(item.number)}</strong> — ${escapeHtml(item.description)}</td></tr>`).join('');return transactionRows+findingRows;
    }).join(''):'<tr><td colspan="7" class="period-empty">No transactions in this period.</td></tr>';
  }
  const host=document.getElementById('periodFindingsList');if(host){host.classList.toggle('is-empty',!findings.length);host.innerHTML=findings.length?findings.map(item=>`<article class="period-finding-row"><div class="period-finding-main"><div class="period-finding-heading"><strong class="period-finding-number">${escapeHtml(item.number)}</strong><span class="finding-status ${item.status}">${escapeHtml(item.status.toUpperCase())}</span><small><span class="finding-classification">${escapeHtml(item.type.replaceAll('-',' '))}</span>${item.transactionId?` • ${escapeHtml(item.transactionId)}`:''}</small></div><p>${escapeHtml(item.description)}</p></div><div class="period-finding-actions">${item.status==='open'?`<button class="je-btn je-btn-emerald" onclick="startFindingAdjustment('${item.id}')">Create Adjustment</button><button class="je-btn je-btn-secondary" onclick="closeFinding('${item.id}')">Close Without Adjustment</button>`:item.adjustmentEntryId?`<span class="finding-adjustment-link">${escapeHtml(item.adjustmentEntryId)}</span>`:''}</div></article>`).join(''):'<span class="period-empty">No findings recorded for this period.</span>';}
}
function openPeriodFindingForm(){const form=document.getElementById('periodFindingForm');if(form)form.hidden=false}
function reviewPeriodTransaction(entryId){openPeriodFindingForm();const select=document.getElementById('findingTransactionId'),description=document.getElementById('findingDescription');if(select)select.value=entryId;if(description){description.value='';description.focus()}document.getElementById('periodFindingForm')?.scrollIntoView({behavior:'smooth',block:'center'})}
function closePeriodFindingForm(){const form=document.getElementById('periodFindingForm');if(form){form.reset();form.hidden=true}}
function savePeriodFinding(event){event.preventDefault();const month=PeriodReview.selectedMonth,count=PeriodReview.findings.filter(item=>item.month===month).length+1;PeriodReview.findings.push({id:`finding-${Date.now()}`,number:`F-${month.replace('-','')}-${String(count).padStart(3,'0')}`,month,transactionId:document.getElementById('findingTransactionId').value,type:document.getElementById('findingType').value,description:document.getElementById('findingDescription').value.trim(),status:'open',createdAt:new Date().toISOString(),adjustmentEntryId:''});PeriodReview.save();closePeriodFindingForm();renderPeriodReview()}
function closeFinding(id){const finding=PeriodReview.findings.find(item=>item.id===id);if(!finding)return;finding.status='closed';finding.closedAt=new Date().toISOString();PeriodReview.save();renderPeriodReview()}
function startFindingAdjustment(id){const finding=PeriodReview.findings.find(item=>item.id===id);if(!finding)return;if(PeriodReview.status(finding.month)==='locked'){showAppNotification('Period Locked','Reopen the period before preparing an adjustment.',true);return}JournalModule.editingEntryId=null;JournalModule.pendingLines=null;resetJournalLinesForm();document.getElementById('jeGeneralMemo').value='';PeriodReview.pendingAdjustment={findingId:id,knownIds:[...new Set(JournalModule.entries.map(row=>row.id))],oldData:finding.transactionId?JournalModule.entries.filter(row=>row.id===finding.transactionId).map(row=>({...row})):[]};switchTab('journal');const date=document.getElementById('jeTransDate');if(date)date.value=`${finding.month}-01`;const memo=document.getElementById('jeGeneralMemo');if(memo)memo.value=`Adjustment ${finding.number}: ${finding.description}`;updateNextEntryIdDisplay();showAppNotification('Adjustment Prepared','The unfinished journal form was cleared. Complete and post the balanced adjustment.',false)}
function changePeriodStatus(nextStatus){const month=PeriodReview.selectedMonth,current=PeriodReview.status(month),openFindings=PeriodReview.findings.filter(item=>item.month===month&&!['corrected','closed'].includes(item.status)).length;if(nextStatus==='closed'&&openFindings){showAppNotification('Open Findings',`Resolve or close ${openFindings} finding(s) before closing this period.`,true);return}if(nextStatus==='locked'&&current!=='closed'){showAppNotification('Close Period First','A period must be closed before it can be locked.',true);return}PeriodReview.periods[month]={...(PeriodReview.periods[month]||{}),status:nextStatus,updatedAt:new Date().toISOString(),updatedBy:liveProfile?.id||DemoAccess.currentUser?.id||'local'};JournalModule.entries.forEach(row=>{if(String(row.date).slice(0,7)!==month)return;if(nextStatus==='open'){row.archived=false;delete row.archivedAt}else if(['closed','locked'].includes(nextStatus)){row.archived=true;row.archivedAt=new Date().toISOString().slice(0,10)}});PeriodReview.save();refreshAllTables();renderPeriodReview()}
function postingPeriodKeys(){if(document.getElementById('jeMultipleDates')?.checked)return[...new Set([...document.querySelectorAll('.je-line-date')].map(input=>input.value.slice(0,7)).filter(Boolean))];const date=document.getElementById('jeTransDate')?.value||'';return date?[date.slice(0,7)]:[]}
const submitJournalEntryBeforePeriodRules=submitJournalEntry;
submitJournalEntry=async function(...args){for(const month of postingPeriodKeys()){const status=PeriodReview.status(month),adjustment=PeriodReview.pendingAdjustment&&PeriodReview.findings.find(item=>item.id===PeriodReview.pendingAdjustment.findingId)?.month===month;if(status==='locked'||(status!=='open'&&!adjustment)){showAppNotification('Period Protected',status==='locked'?'This accounting period is locked.':'This month has been submitted for review. Use an approved finding to post an adjustment.',true);return}}return submitJournalEntryBeforePeriodRules.apply(this,args)};
const finalizePostSuccessBeforePeriodReview=finalizePostSuccess;
finalizePostSuccess=function(...args){finalizePostSuccessBeforePeriodReview.apply(this,args);const pending=PeriodReview.pendingAdjustment;if(!pending)return;const finding=PeriodReview.findings.find(item=>item.id===pending.findingId);if(!finding)return;const newIds=[...new Set(JournalModule.entries.map(row=>row.id))].filter(id=>!pending.knownIds.includes(id)),adjustmentId=newIds[0]||'Posted adjustment';finding.status='corrected';finding.adjustmentEntryId=adjustmentId;finding.correctedAt=new Date().toISOString();finding.auditRecord={periodFindingId:finding.id,id:adjustmentId,timestamp:new Date().toLocaleString(),explanation:`${finding.number}: ${finding.description}`,oldData:pending.oldData,newData:JournalModule.entries.filter(row=>newIds.includes(row.id)).map(row=>({...row}))};JournalModule.voidedEntries.unshift(finding.auditRecord);PeriodReview.pendingAdjustment=null;PeriodReview.save();renderPeriodReview();renderVoidedTransactionsTable()};
const switchTabBeforePeriodReview= switchTab;
switchTab=function(tabId){switchTabBeforePeriodReview(tabId);if(tabId==='period-review')renderPeriodReview()};
PeriodReview.load();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPeriodReview,{once:true});else renderPeriodReview();

// USER HIERARCHY, MODULE PERMISSIONS, AND ADMIN REVIEW
const PERMISSION_MODULES=[['dashboard','Dashboard'],['submissions','Entry Submissions'],['transactions','Transactions'],['user-review','User Entry Review'],['accounts','Accounts'],['payroll','Payroll'],['reports','Reports'],['tax-sso','Tax and SSO'],['inventory','Inventory'],['menu','Menu'],['settings','Settings']];
let livePermission=null;
async function loadCurrentPermissions(){
  if(!liveProfile)return;
  if(liveProfile.role==='admin'){livePermission={user_type:'admin',modules:PERMISSION_MODULES.map(item=>item[0]),can_approve:true,can_post_directly:true,can_void:true,can_export:true};return}
  const{data}=await ojmDb.from('user_permissions').select('*').eq('user_id',liveProfile.id).maybeSingle();
  livePermission=data||{user_type:'sub_user',modules:['submissions'],can_approve:false,can_post_directly:false,can_void:false,can_export:false};
}
function applyPermissionAccess(){
  if(!livePermission)return;
  document.querySelectorAll('.nav-category').forEach(category=>{const module=category.dataset.module;category.hidden=!livePermission.modules.includes(module)});
  document.getElementById('nav-module-user-review').hidden=!livePermission.can_approve;
  const post=document.getElementById('btnPostJournal');if(post)post.hidden=!livePermission.can_post_directly;
}
function renderPermissionGrid(selected=[]){const host=document.getElementById('userPermissionGrid');if(host)host.innerHTML=PERMISSION_MODULES.map(([id,label])=>`<label class="permission-option"><input type="checkbox" value="${id}" ${selected.includes(id)?'checked':''}><span>${label}</span></label>`).join('')}
function populateUserManagerOptions(selected=''){const select=document.getElementById('userAccessManager');if(!select)return;select.innerHTML='<option value="">Primary administrator</option>'+liveProfiles.filter(user=>user.role==='admin'||user.user_permissions?.user_type==='manager').map(user=>`<option value="${user.id}">${escapeHtml(user.full_name||user.email)}</option>`).join('');select.value=selected||''}
function openUserAccessEditor(id=''){
  const user=liveProfiles.find(item=>item.id===id),permission=user?.user_permissions||null;
  document.getElementById('userAccessModalTitle').textContent=user?'Edit User Access':'Add Sub-user';document.getElementById('userAccessId').value=user?.id||'';document.getElementById('userAccessName').value=user?.full_name||'';document.getElementById('userAccessEmail').value=user?.email||'';document.getElementById('userAccessEmail').disabled=Boolean(user);document.getElementById('userAccessPassword').value='';document.getElementById('userAccessPassword').required=!user;document.getElementById('userAccessType').value=permission?.user_type||(user?.role==='admin'?'admin':'sub_user');document.getElementById('userAccessJob').value=permission?.job_title||'';populateUserManagerOptions(permission?.manager_id||'');renderPermissionGrid(permission?.modules||(user?.role==='admin'?PERMISSION_MODULES.map(item=>item[0]):['submissions']));document.getElementById('permissionApprove').checked=Boolean(permission?.can_approve||user?.role==='admin');document.getElementById('permissionDirectPost').checked=Boolean(permission?.can_post_directly||user?.role==='admin');document.getElementById('permissionVoid').checked=Boolean(permission?.can_void||user?.role==='admin');document.getElementById('permissionExport').checked=Boolean(permission?.can_export||user?.role==='admin');document.getElementById('userAccessStatus').textContent='';openModal('modalUserAccess')
}
async function saveUserAccess(event){
  event.preventDefault();const id=document.getElementById('userAccessId').value,status=document.getElementById('userAccessStatus'),payload={full_name:document.getElementById('userAccessName').value.trim(),email:document.getElementById('userAccessEmail').value.trim(),password:document.getElementById('userAccessPassword').value,user_type:document.getElementById('userAccessType').value,manager_id:document.getElementById('userAccessManager').value||null,job_title:document.getElementById('userAccessJob').value.trim(),modules:[...document.querySelectorAll('#userPermissionGrid input:checked')].map(input=>input.value),can_approve:document.getElementById('permissionApprove').checked,can_post_directly:document.getElementById('permissionDirectPost').checked,can_void:document.getElementById('permissionVoid').checked,can_export:document.getElementById('permissionExport').checked};
  if(!id){const{data,error}=await ojmDb.functions.invoke('admin-create-user',{body:payload});if(error){status.textContent=`User creation requires the supplied admin-create-user Edge Function: ${error.message}`;return}payload.user_id=data.user_id}else payload.user_id=id;
  const role=payload.user_type==='admin'?'admin':'submitter';await ojmDb.from('profiles').update({full_name:payload.full_name,role}).eq('id',payload.user_id);const{error}=await ojmDb.from('user_permissions').upsert({user_id:payload.user_id,user_type:payload.user_type,manager_id:payload.manager_id,job_title:payload.job_title,modules:payload.modules,can_approve:payload.can_approve,can_post_directly:payload.can_post_directly,can_void:payload.can_void,can_export:payload.can_export,updated_by:liveProfile.id,updated_at:new Date().toISOString()});if(error){status.textContent=error.message;return}closeModal('modalUserAccess');await loadProfilesFromSupabase();showAppNotification('User Saved','Login access and module permissions were updated.',false)
}
async function loadProfilesWithPermissions(){
  if(liveProfile?.role!=='admin'&&!livePermission?.can_approve)return;
  const [profilesResult,permissionsResult]=await Promise.all([
    ojmDb.from('profiles').select('*').order('created_at'),
    ojmDb.from('user_permissions').select('*')
  ]);
  if(profilesResult.error||permissionsResult.error){
    showAppNotification('User List Unavailable',profilesResult.error?.message||permissionsResult.error?.message||'Unable to load users.',true);
    return;
  }
  const permissionsByUser=new Map((permissionsResult.data||[]).map(permission=>[permission.user_id,permission]));
  liveProfiles=(profilesResult.data||[]).map(user=>({...user,user_permissions:permissionsByUser.get(user.id)||null}));
  renderDemoUsers();populateUserReviewOptions();
}
loadProfilesFromSupabase=loadProfilesWithPermissions;
renderDemoUsers=function(){const host=document.getElementById('demoUsersList');if(!host)return;host.innerHTML=liveProfiles.length?liveProfiles.map(user=>{const permission=user.user_permissions;return`<div class="demo-user-row"><div class="demo-user-avatar">${escapeHtml((user.full_name||user.email).slice(0,2).toUpperCase())}</div><div class="demo-user-details"><strong>${escapeHtml(user.full_name||'Unnamed User')}</strong><span>${escapeHtml(user.email)}${permission?.job_title?` • ${escapeHtml(permission.job_title)}`:''}</span></div><span class="user-role-badge ${user.role}">${permission?.user_type==='manager'?'Manager':user.role==='admin'?'Administrator':'Sub-user'}</span><span class="user-status-badge ${user.status}">${user.status}</span><button type="button" class="je-btn je-btn-secondary" onclick="openUserAccessEditor('${user.id}')">Edit Access</button></div>`}).join(''):'<div class="legal-doc-empty">No users found. Refresh the page after creating a user.</div>'};
function getLiveUserName(id){return liveProfiles.find(user=>user.id===id)?.full_name||getDemoUserName(id)}
function populateUserReviewOptions(){const select=document.getElementById('userReviewUser');if(!select)return;const current=select.value;select.innerHTML='<option value="all">All users</option>'+liveProfiles.filter(user=>user.role!=='admin').map(user=>`<option value="${user.id}">${escapeHtml(user.full_name||user.email)}</option>`).join('');select.value=[...select.options].some(option=>option.value===current)?current:'all';renderUserEntryReview()}
function renderUserEntryReview(){const tbody=document.getElementById('userEntryReviewBody');if(!tbody)return;const user=document.getElementById('userReviewUser')?.value||'all',status=document.getElementById('userReviewStatus')?.value||'pending';const rows=DemoAccess.submissions.filter(item=>(user==='all'||item.submittedBy===user)&&(status==='all'||item.status===status));tbody.innerHTML=rows.length?rows.map(item=>`<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(getLiveUserName(item.submittedBy))}</td><td>${escapeHtml(item.memo)}${item.reference?`<div class="je-subtitle">${escapeHtml(item.reference)}</div>`:''}</td><td>${escapeHtml(item.debitAccount)}<div class="je-subtitle">CR: ${escapeHtml(item.creditAccount)}</div></td><td class="num">${currencySymbolV6(item.currency)} ${Number(item.amount).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td><span class="submission-status ${item.status}">${item.status.toUpperCase()}</span></td><td>${item.status==='pending'?`<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewEntrySubmission('${item.id}','approved')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewEntrySubmission('${item.id}','rejected')">Reject</button></div>`:'Reviewed'}</td></tr>`).join(''):'<tr><td colspan="7" class="period-empty">No matching submissions.</td></tr>';const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} entr${rows.length===1?'y':'ies'} shown`;const pending=DemoAccess.submissions.filter(item=>item.status==='pending').length;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=pending}
const applyLiveRoleAccessBeforePermissions=applyLiveRoleAccess;
applyLiveRoleAccess=function(){applyLiveRoleAccessBeforePermissions();if(livePermission)applyPermissionAccess()};
const hydrateSupabaseSessionBeforePermissions=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforePermissions(session);if(liveProfile){await loadCurrentPermissions();applyPermissionAccess();await loadProfilesWithPermissions();renderUserEntryReview()}};

// STAFF JOURNALS — simple ledger input that is converted to double-entry only on approval.
let activeStaffJournal=null;
let activeStaffJournalLines=[];
let reviewStaffJournals=[];
function allowedStaffAccounts(){const p=livePermission||{};const all=AccountingStore.accounts||[];return p.allow_any_account||liveProfile?.role==='admin'?all.filter(a=>a.active!==false&&a.is_active!==false):all.filter(a=>(p.allowed_account_ids||[]).includes(a.id))}
function staffJournalMonth(){return document.getElementById('staffJournalPeriod')?.value||new Date().toISOString().slice(0,7)}
function accountOptionHtml(selected=''){return allowedStaffAccounts().map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('')}
async function openStaffJournalPeriod(month){
  if(!liveProfile)return;const periodStart=`${month}-01`;
  const {data,error}=await ojmDb.from('staff_journals').select('*').eq('owner_id',liveProfile.id).eq('period_start',periodStart).maybeSingle();
  if(error){showAppNotification('Staff Journal Unavailable',error.message,true);return}
  activeStaffJournal=data||null;activeStaffJournalLines=[];
  if(data){const result=await ojmDb.from('staff_journal_lines').select('*').eq('staff_journal_id',data.id).order('line_no');if(result.error){showAppNotification('Journal Lines Unavailable',result.error.message,true);return}activeStaffJournalLines=result.data||[]}
  if(!activeStaffJournalLines.length)activeStaffJournalLines=[{transaction_date:`${month}-01`,direction:'out',account_id:'',memo:'',reference:'',amount:''}];renderStaffJournal();
}
function renderStaffJournal(){
  const period=staffJournalMonth(),editable=!activeStaffJournal||['draft','returned'].includes(activeStaffJournal.status),body=document.getElementById('staffJournalLinesBody');
  const badge=document.getElementById('staffJournalStatusBadge');if(badge){badge.textContent=(activeStaffJournal?.status||'draft').toUpperCase();badge.classList.toggle('is-saved',!editable)}
  const guidance=document.getElementById('staffJournalGuidance');if(guidance){const p=livePermission||{};guidance.textContent=`Money Out is posted from your selected account to ${accountNameById(p.default_out_credit_account_id)||'your assigned payment account'}. Money In is posted from ${accountNameById(p.default_in_debit_account_id)||'your assigned receipt account'} to your selected account.`}
  if(body)body.innerHTML=activeStaffJournalLines.map((line,index)=>`<tr data-index="${index}"><td><input class="je-input staff-line-date" type="date" value="${escapeHtml(line.transaction_date||`${period}-01`)}" ${editable?'':'disabled'}></td><td><select class="je-select staff-line-direction" ${editable?'':'disabled'}><option value="out" ${line.direction==='out'?'selected':''} ${livePermission?.allowed_directions?.includes('out')===false?'disabled':''}>Money Out / Expense</option><option value="in" ${line.direction==='in'?'selected':''} ${livePermission?.allowed_directions?.includes('in')===false?'disabled':''}>Money In / Collection</option></select></td><td><select class="je-select staff-line-account" ${editable?'':'disabled'}><option value="">Choose category</option>${accountOptionHtml(line.account_id)}</select></td><td><input class="je-input staff-line-memo" value="${escapeHtml(line.memo||'')}" placeholder="What happened? Receipt no. optional" ${editable?'':'disabled'}></td><td><input class="je-input staff-line-amount" type="number" min="0.01" step="0.01" value="${line.amount||''}" ${editable?'':'disabled'}></td><td>${editable?`<button type="button" class="btn-action-delete" onclick="removeStaffJournalLine(${index})">✕</button>`:''}</td></tr>`).join('');
  document.querySelectorAll('#staffJournalLinesBody input,#staffJournalLinesBody select').forEach(node=>node.addEventListener('input',syncStaffJournalLines));renderStaffJournalSummary();
  document.querySelectorAll('.staff-journal-actions .je-btn').forEach(button=>{if(button.textContent.includes('Add')||button.textContent.includes('Save')||button.textContent.includes('Submit'))button.disabled=!editable});
}
function syncStaffJournalLines(){activeStaffJournalLines=[...document.querySelectorAll('#staffJournalLinesBody tr')].map((row,index)=>({...activeStaffJournalLines[index],transaction_date:row.querySelector('.staff-line-date').value,direction:row.querySelector('.staff-line-direction').value,account_id:row.querySelector('.staff-line-account').value,memo:row.querySelector('.staff-line-memo').value.trim(),amount:Number(row.querySelector('.staff-line-amount').value||0)}));renderStaffJournalSummary()}
function addStaffJournalLine(){syncStaffJournalLines();activeStaffJournalLines.push({transaction_date:`${staffJournalMonth()}-01`,direction:'out',account_id:'',memo:'',reference:'',amount:''});renderStaffJournal()}
function removeStaffJournalLine(index){activeStaffJournalLines.splice(index,1);if(!activeStaffJournalLines.length)addStaffJournalLine();else renderStaffJournal()}
function renderStaffJournalSummary(){const host=document.getElementById('staffJournalSummary');if(!host)return;const totals={};activeStaffJournalLines.filter(line=>line.account_id&&Number(line.amount)>0).forEach(line=>{const key=`${line.direction}:${line.account_id}`;totals[key]=(totals[key]||0)+Number(line.amount)});host.innerHTML=Object.keys(totals).length?Object.entries(totals).map(([key,value])=>{const[direction,id]=key.split(':');return`<div><span>${direction==='out'?'Money Out':'Money In'} • ${escapeHtml(accountNameById(id)||'Account')}</span><strong>${Number(value).toLocaleString('en-US',{minimumFractionDigits:2})}</strong></div>`}).join(''):'<span>No valid lines yet.</span>'}
function accountNameById(id){const account=(AccountingStore.accounts||[]).find(item=>item.id===id);return account?`${account.code} — ${account.name}`:''}
async function saveStaffJournalDraft(){
  syncStaffJournalLines();const month=staffJournalMonth(),valid=activeStaffJournalLines.filter(line=>line.transaction_date&&line.account_id&&line.memo&&Number(line.amount)>0);if(!valid.length){showAppNotification('Add a Line','Enter at least one dated item with a category, description, and amount.',true);return}
  const payload={owner_id:liveProfile.id,period_start:`${month}-01`,period_end:new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).toISOString().slice(0,10),status:'draft',updated_at:new Date().toISOString()};
  const {data,error}=await ojmDb.from('staff_journals').upsert(payload,{onConflict:'owner_id,period_start'}).select().single();if(error){showAppNotification('Draft Save Failed',error.message,true);return}activeStaffJournal=data;
  const del=await ojmDb.from('staff_journal_lines').delete().eq('staff_journal_id',data.id);if(del.error){showAppNotification('Draft Save Failed',del.error.message,true);return}
  const lines=valid.map((line,index)=>({staff_journal_id:data.id,line_no:index+1,transaction_date:line.transaction_date,direction:line.direction,account_id:line.account_id,memo:line.memo,reference:line.reference||'',amount:Number(line.amount),currency_code:(AccountingStore.accounts||[]).find(a=>a.id===line.account_id)?.currency||'LAK'}));
  const saved=await ojmDb.from('staff_journal_lines').insert(lines).select();if(saved.error){showAppNotification('Draft Save Failed',saved.error.message,true);return}activeStaffJournalLines=saved.data||[];const status=document.getElementById('staffJournalSaveStatus');if(status)status.textContent='Draft saved.';renderStaffJournal();
}
async function submitStaffJournal(){await saveStaffJournalDraft();if(!activeStaffJournal?.id)return;const{error}=await ojmDb.rpc('submit_staff_journal',{p_journal_id:activeStaffJournal.id});if(error){showAppNotification('Journal Submission Failed',error.message,true);return}showAppNotification('Journal Submitted','Your complete journal is ready for review.',false);await openStaffJournalPeriod(staffJournalMonth())}
async function loadStaffJournalsForReview(){if(!livePermission?.can_approve&&liveProfile?.role!=='admin')return;const journals=await ojmDb.from('staff_journals').select('*').order('submitted_at',{ascending:false});if(journals.error)return;const ids=(journals.data||[]).map(j=>j.id);const lines=ids.length?await ojmDb.from('staff_journal_lines').select('*').in('staff_journal_id',ids):{data:[]};reviewStaffJournals=(journals.data||[]).map(j=>({...j,lines:(lines.data||[]).filter(line=>line.staff_journal_id===j.id)}));renderUserEntryReview()}
async function reviewStaffJournal(id,action){if(action==='return'){const note=prompt('Reason for returning this journal:');if(!note)return;const{error}=await ojmDb.from('staff_journals').update({status:'returned',return_note:note,reviewed_by:liveProfile.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(error){showAppNotification('Return Failed',error.message,true);return}}else{const{error}=await ojmDb.rpc('approve_staff_journal',{p_journal_id:id});if(error){showAppNotification('Posting Failed',error.message,true);return}}await Promise.all([loadStaffJournalsForReview(),loadJournalFromSupabase()])}
function renderUserEntryReview(){const tbody=document.getElementById('userEntryReviewBody');if(!tbody)return;const user=document.getElementById('userReviewUser')?.value||'all',status=document.getElementById('userReviewStatus')?.value||'pending';const rows=reviewStaffJournals.filter(j=>(user==='all'||j.owner_id===user)&&(status==='all'||j.status===status||status==='pending'&&j.status==='submitted'));tbody.innerHTML=rows.length?rows.map(j=>`<tr><td>${escapeHtml(j.period_start.slice(0,7))}</td><td>${escapeHtml(getLiveUserName(j.owner_id))}</td><td>${j.lines.length}</td><td class="num">${j.lines.reduce((sum,line)=>sum+Number(line.amount),0).toLocaleString('en-US',{minimumFractionDigits:2})}</td><td><span class="submission-status ${j.status}">${escapeHtml(j.status.toUpperCase())}</span></td><td>${j.status==='submitted'?`<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewStaffJournal('${j.id}','approve')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewStaffJournal('${j.id}','return')">Return</button></div>`:'Reviewed'}</td></tr>`).join(''):'<tr><td colspan="6" class="period-empty">No staff journals match this filter.</td></tr>';const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} journal${rows.length===1?'':'s'} shown`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=reviewStaffJournals.filter(j=>j.status==='submitted').length}
function renderAccountAccessEditor(selected=[]){const host=document.getElementById('userAccountAccessGrid');if(!host)return;host.innerHTML=(AccountingStore.accounts||[]).filter(a=>a.active!==false&&a.is_active!==false).map(a=>`<label class="permission-option"><input type="checkbox" value="${a.id}" ${selected.includes(a.id)?'checked':''}><span>${escapeHtml(a.code)} — ${escapeHtml(a.name)}</span></label>`).join('')}
function fillDefaultMappingAccounts(permission={}){const options='<option value="">Choose an account</option>'+(AccountingStore.accounts||[]).map(a=>`<option value="${a.id}">${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('');const out=document.getElementById('defaultOutCreditAccount'),incoming=document.getElementById('defaultInDebitAccount');if(out){out.innerHTML=options;out.value=permission.default_out_credit_account_id||''}if(incoming){incoming.innerHTML=options;incoming.value=permission.default_in_debit_account_id||''}}
function toggleAllowedAccountEditor(){const host=document.getElementById('userAccountAccessGrid');if(host)host.hidden=document.getElementById('permissionAllowAnyAccount').checked}
const openUserAccessEditorBeforeStaffConfig=openUserAccessEditor;
openUserAccessEditor=function(id=''){openUserAccessEditorBeforeStaffConfig(id);const permission=liveProfiles.find(user=>user.id===id)?.user_permissions||{};document.getElementById('permissionAllowAnyAccount').checked=Boolean(permission.allow_any_account);renderAccountAccessEditor(permission.allowed_account_ids||[]);fillDefaultMappingAccounts(permission);document.getElementById('permissionAllowOut').checked=!permission.allowed_directions||permission.allowed_directions.includes('out');document.getElementById('permissionAllowIn').checked=Boolean(permission.allowed_directions?.includes('in'));toggleAllowedAccountEditor()};
const saveUserAccessBeforeStaffConfig=saveUserAccess;
saveUserAccess=async function(event){
  event.preventDefault();const id=document.getElementById('userAccessId').value,status=document.getElementById('userAccessStatus');const extra={allow_any_account:document.getElementById('permissionAllowAnyAccount').checked,allowed_account_ids:[...document.querySelectorAll('#userAccountAccessGrid input:checked')].map(input=>input.value),default_out_credit_account_id:document.getElementById('defaultOutCreditAccount').value||null,default_in_debit_account_id:document.getElementById('defaultInDebitAccount').value||null,allowed_directions:[document.getElementById('permissionAllowOut').checked?'out':null,document.getElementById('permissionAllowIn').checked?'in':null].filter(Boolean)};
  if(!extra.allowed_directions.length||!extra.default_out_credit_account_id||!extra.default_in_debit_account_id||(!extra.allow_any_account&&!extra.allowed_account_ids.length)){status.textContent='Choose allowed accounts, at least one transaction direction, and both automatic accounts.';return}
  const originalUpsert=ojmDb.from;let captured=null;ojmDb.from=function(table){const api=originalUpsert.call(ojmDb,table);if(table==='user_permissions'){const original=api.upsert.bind(api);api.upsert=(payload,...rest)=>original({...payload,...extra},...rest)}return api};try{await saveUserAccessBeforeStaffConfig(event)}finally{ojmDb.from=originalUpsert}
};
const hydrateBeforeStaffJournal=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateBeforeStaffJournal(session);if(liveProfile){const month=new Date().toISOString().slice(0,7);const picker=document.getElementById('staffJournalPeriod');if(picker)picker.value=month;await openStaffJournalPeriod(month);await loadStaffJournalsForReview();const savedView=localStorage.getItem('ojm_last_active_view_v1'),nextView=freshLoginRequested?'dashboard':(document.getElementById(savedView)?savedView:'dashboard');if(nextView.startsWith('sec-'))scrollToAccountModule(nextView);else switchTab(nextView);freshLoginRequested=false}};
const switchTabBeforeStaffJournal=switchTab;
switchTab=function(tabId){switchTabBeforeStaffJournal(tabId);if(tabId==='entry-submissions')openStaffJournalPeriod(staffJournalMonth());if(tabId==='user-entry-review')loadStaffJournalsForReview()};

// SETTINGS HELP — red asterisks explain only settings that need accounting or system context.
const SETTING_HELP = {
  'company-identity': {title:'Company Identity', body:'<p><strong>Use the legal name</strong> exactly as it appears on registrations, tax records, and licenses. The trading name is the customer-facing name that may appear on reports and printouts.</p>'},
  'legal-documents': {title:'Current Legal Documents', body:'<p>Keep copies of registrations, licenses, tax certificates, annual filing records, and other company documents here. These are for reference and download; they do not automatically submit anything to a government office.</p>'},
  'users-permissions': {title:'Users and Permissions', body:'<p>Create a login for each staff member. You choose the modules they can see, the accounts they may use, and whether they may submit, approve, post, void, or export.</p><p>Use <strong>Allow any active account</strong> only for trusted users or temporary emergency access.</p>'},
  'accounting-settings': {title:'Accounting Settings', body:'<p>Maintain the currencies the accounting system can use. The code and symbol appear in account and transaction displays. Adding a currency does not convert existing transactions.</p>'},
  'pos-shift-close': {title:'POS & Shift-Close Setup', body:'<p>This is the permanent configuration area for your POS workflow. If you change POS provider later, update the reporting currency, labels, and account names here instead of changing program code.</p><p>The cashier will use these rules when preparing a shift-close report for review.</p>'},
  'pos-report-rules': {title:'POS Report Rules', body:'<p><strong>Reporting currency</strong> is the currency used by the POS total—currently LAK. The sales account records the POS sales total, while the cashier clearing account temporarily holds that total until the physical cash, foreign currency, and bank/QR collections are reconciled.</p>'},
  'pos-payment-labels': {title:'POS Payment Labels', body:'<p>These are editable labels from the POS report. For your current POS, USD and THB may still show an amount already converted to LAK. The cashier will separately enter the actual foreign currency counted and the exchange rate used.</p>'},
  'payroll-settings': {title:'Payroll Settings', body:'<p>These are default values used when payroll tools are completed. Review them whenever policy, working hours, currency, or overtime rules change.</p>'},
  'tax-settings': {title:'Tax Settings', body:'<p>These defaults help prepare records but do not replace advice from your licensed accountant or official filing requirements. Confirm VAT registration, rates, and filing periods before relying on reports.</p>'},
  'printing-settings': {title:'Printing Settings', body:'<p>Controls the paper layout and optional business identity shown on downloaded or printed reports. Header and footer images are visual only; they do not change the accounting data.</p>'},
  'backup-export': {title:'Backup and Export', body:'<p>Download a backup before major changes. A settings backup preserves browser-held configuration; transaction exports are for checking or keeping a separate copy. Restoring a backup replaces the matching saved settings in this browser.</p>'},
  'system-settings': {title:'System Settings', body:'<p>These choices affect how dates, numbers, language, and session behavior appear in the application. They do not change original transaction values.</p>'}
};
function openSettingHelp(key){
  const item=SETTING_HELP[key]||{title:'Settings help',body:'<p>This setting changes how the application is configured. Save your changes when you are ready.</p>'};
  const title=document.getElementById('settingHelpTitle'),content=document.getElementById('settingHelpContent');
  if(title)title.textContent=item.title;if(content)content.innerHTML=item.body;
  openModal('modalSettingHelp');
}

async function loadMySubmittedStaffJournals(){
  const host=document.getElementById('staffSubmittedHistory');
  if(!host||!liveProfile||!ojmDb)return;
  const {data,error}=await ojmDb.from('staff_journals').select('period_start,status,submitted_at,reviewed_at,return_note').eq('owner_id',liveProfile.id).neq('status','draft').order('period_start',{ascending:false});
  if(error){host.innerHTML='<div class="legal-doc-empty">Submitted journal history will appear after the staff workflow SQL is installed.</div>';return}
  host.innerHTML=(data||[]).length?(data||[]).map(j=>`<div class="staff-history-row"><div><strong>${escapeHtml(j.period_start.slice(0,7))}</strong><span>${j.submitted_at?`Submitted ${new Date(j.submitted_at).toLocaleString()}`:'Prepared for review'}${j.return_note?` • Return note: ${escapeHtml(j.return_note)}`:''}</span></div><span class="submission-status ${j.status}">${escapeHtml(j.status.toUpperCase())}</span></div>`).join(''):'<div class="legal-doc-empty">No submitted journals yet.</div>';
}
const openStaffJournalPeriodWithHistory=openStaffJournalPeriod;
openStaffJournalPeriod=async function(month){await openStaffJournalPeriodWithHistory(month);await loadMySubmittedStaffJournals()};

// FINAL POLISH: Dashboard opens with navigation collapsed; clicking a calendar field opens its picker anywhere in the field.
const switchTabAfterAllFeatures=switchTab;
switchTab=function(tabId){
  switchTabAfterAllFeatures(tabId);
  if(tabId==='dashboard') document.querySelectorAll('.nav-category.open').forEach(category=>category.classList.remove('open'));
};
document.addEventListener('click',event=>{
  const picker=event.target.closest('.period-review-picker');
  if(picker && !event.target.matches('input')){const input=picker.querySelector('input[type="month"],input[type="date"]');if(input?.showPicker)input.showPicker();else input?.focus();}
});

// STAFF JOURNAL V20 — line entry mirrors the main journal; the monthly summary is submitted as one batch.
let staffEntryDraft={};
function staffCurrencyCodes(){return (CurrencyStore.currencies||[]).filter(c=>c.is_active!==false).map(c=>c.code)||['LAK'];}
function renderStaffEntryHeaders(){const currencies=staffCurrencyCodes();const h=document.getElementById('staffEntryHeader'),s=document.getElementById('staffSummaryHeader');const cells=`<th style="width:120px">Date</th><th style="width:28%">Account</th><th style="width:32%">Particulars / Memo / Reference</th><th class="num">DR</th>${currencies.map(c=>`<th class="num">CR-${escapeHtml(c)}</th>`).join('')}<th class="action-col"></th>`;if(h)h.innerHTML=cells;if(s)s.innerHTML=cells;}
function renderStaffJournal(){
  const period=staffJournalMonth(),editable=!activeStaffJournal||['draft','returned'].includes(activeStaffJournal.status),currencies=staffCurrencyCodes();renderStaffEntryHeaders();
  const badge=document.getElementById('staffJournalStatusBadge');if(badge){badge.textContent=(activeStaffJournal?.status||'draft').toUpperCase();badge.classList.toggle('is-saved',!editable)}
  const body=document.getElementById('staffJournalEntryBody'); if(!body)return;
  const row=staffEntryDraft.transaction_date?staffEntryDraft:{transaction_date:`${period}-01`,account_id:'',memo:'',debit:'',credits:{}};staffEntryDraft=row;
  body.innerHTML=`<tr><td><input class="je-input staff-entry-date" type="date" value="${escapeHtml(row.transaction_date)}" ${editable?'':'disabled'}></td><td><select class="je-select staff-entry-account" ${editable?'':'disabled'}><option value="">Choose account</option>${accountOptionHtml(row.account_id)}</select></td><td><input class="je-input staff-entry-memo" value="${escapeHtml(row.memo||'')}" placeholder="Particulars, receipt or reference" ${editable?'':'disabled'}></td><td><input class="je-input staff-entry-debit num" type="number" min="0" step="0.01" value="${row.debit||''}" ${editable?'':'disabled'}></td>${currencies.map(c=>`<td><input class="je-input staff-entry-credit num" data-currency="${escapeHtml(c)}" type="number" min="0" step="0.01" value="${row.credits?.[c]||''}" ${editable?'':'disabled'}></td>`).join('')}<td></td></tr>`;
  document.getElementById('staffSubmitSummaryButton').disabled=!editable;renderStaffJournalSummary();
}
function readStaffEntry(){const row=document.querySelector('#staffJournalEntryBody tr');if(!row)return null;const credits={};row.querySelectorAll('.staff-entry-credit').forEach(i=>credits[i.dataset.currency]=Number(i.value||0));return{transaction_date:row.querySelector('.staff-entry-date').value,account_id:row.querySelector('.staff-entry-account').value,memo:row.querySelector('.staff-entry-memo').value.trim(),debit:Number(row.querySelector('.staff-entry-debit').value||0),credits};}
function postStaffEntry(){
  const item=readStaffEntry();if(!item?.transaction_date||!item.account_id||!item.memo){showAppNotification('Complete Entry','Enter Date, Account, and Particulars before posting the entry.',true);return}
  const creditItems=Object.entries(item.credits).filter(([,v])=>v>0);if((item.debit>0&&creditItems.length)||(!item.debit&&!creditItems.length)||creditItems.length>1){showAppNotification('Choose One Amount','Enter either one DR amount or one CR amount.',true);return}
  const direction=item.debit>0?'out':'in',amount=item.debit||creditItems[0][1],currency_code=item.debit?(AccountingStore.accounts||[]).find(a=>a.id===item.account_id)?.currency||'LAK':creditItems[0][0];
  activeStaffJournalLines.push({transaction_date:item.transaction_date,account_id:item.account_id,memo:item.memo,reference:'',direction,amount,currency_code});staffEntryDraft={transaction_date:item.transaction_date,account_id:'',memo:'',debit:'',credits:{}};const status=document.getElementById('staffJournalSaveStatus');if(status)status.textContent='Entry added to Journal Summary.';renderStaffJournal();
}
function renderStaffJournalSummary(){
  const host=document.getElementById('staffJournalSummary');if(!host)return;const currencies=staffCurrencyCodes();
  host.innerHTML=activeStaffJournalLines.length?activeStaffJournalLines.map((line,index)=>`<tr><td>${escapeHtml(line.transaction_date)}</td><td>${escapeHtml(accountNameById(line.account_id)||'Account')}</td><td>${escapeHtml(line.memo)}</td><td class="num">${line.direction==='out'?Number(line.amount).toLocaleString('en-US',{minimumFractionDigits:2}):''}</td>${currencies.map(c=>`<td class="num">${line.direction==='in'&&line.currency_code===c?Number(line.amount).toLocaleString('en-US',{minimumFractionDigits:2}):''}</td>`).join('')}<td><button class="btn-action-delete" onclick="removeStaffSummaryLine(${index})" title="Remove entry">✕</button></td></tr>`).join(''):`<tr><td colspan="${5+currencies.length}" class="period-empty staff-summary-empty">No entries posted for this period.</td></tr>`;
}
function removeStaffSummaryLine(index){activeStaffJournalLines.splice(index,1);renderStaffJournalSummary();}
saveStaffJournalDraft=async function(){
  const month=staffJournalMonth(),valid=activeStaffJournalLines.filter(line=>line.transaction_date&&line.account_id&&line.memo&&Number(line.amount)>0);if(!valid.length){showAppNotification('No Journal Entries','Post at least one entry to the Journal Summary.',true);return false}
  const payload={owner_id:liveProfile.id,period_start:`${month}-01`,period_end:new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).toISOString().slice(0,10),status:'draft',updated_at:new Date().toISOString()};
  const {data,error}=await ojmDb.from('staff_journals').upsert(payload,{onConflict:'owner_id,period_start'}).select().single();if(error){showAppNotification('Journal Save Failed',error.message,true);return false}activeStaffJournal=data;
  const del=await ojmDb.from('staff_journal_lines').delete().eq('staff_journal_id',data.id);if(del.error){showAppNotification('Journal Save Failed',del.error.message,true);return false}
  const lines=valid.map((line,index)=>({staff_journal_id:data.id,line_no:index+1,transaction_date:line.transaction_date,direction:line.direction,account_id:line.account_id,memo:line.memo,reference:line.reference||'',amount:Number(line.amount),currency_code:line.currency_code||'LAK'}));const saved=await ojmDb.from('staff_journal_lines').insert(lines).select();if(saved.error){showAppNotification('Journal Save Failed',saved.error.message,true);return false}activeStaffJournalLines=saved.data||[];return true;
};
submitStaffJournal=async function(){const saved=await saveStaffJournalDraft();if(!saved||!activeStaffJournal?.id)return;const{error}=await ojmDb.rpc('submit_staff_journal',{p_journal_id:activeStaffJournal.id});if(error){showAppNotification('Submission Failed',error.message,true);return}showAppNotification('Submitted for Review','The complete journal summary is ready for review.',false);await openStaffJournalPeriod(staffJournalMonth())};

// TRANSACTION FINALIZATION — posted items are reviewed, adjusted, or voided; they are never silently deleted.
function transactionCurrencies(){return (CurrencyStore.currencies||[]).filter(c=>c.is_active!==false);}
function canVoidTransactions(){return liveProfile?.role==='admin'||Boolean(livePermission?.can_void);}
function isAdjustedTransaction(lines){return (lines||[]).some(row=>row.adjusted===true||/^\s*adjustment\b/i.test(String(row.memo||'')));}
function renderTransactionReviewTable(tbody, records, actionMode='none'){
  if(!tbody)return;const currencies=transactionCurrencies(),groups={};records.forEach(r=>(groups[r.id]||(groups[r.id]=[])).push(r));
  const hasActions=actionMode!=='none',ids=Object.keys(groups); if(!ids.length){tbody.innerHTML=`<tr><td colspan="${5+currencies.length+(hasActions?1:0)}" class="period-empty">No transactions found.</td></tr>`;return;}
  tbody.innerHTML=ids.sort((a,b)=>String(groups[b][0].date).localeCompare(String(groups[a][0].date))||String(b).localeCompare(String(a))).map(id=>{const lines=groups[id],first=lines[0],dbId=first.dbEntryId||'',adjusted=isAdjustedTransaction(lines);return lines.map((line,index)=>{const account=getCleanAccountDisplay(line.account,line.currency),rowClass=lines.length===1?'cluster-row-start cluster-row-end':index===0?'cluster-row-start':index===lines.length-1?'cluster-row-cont cluster-row-end':'cluster-row-cont',actions=actionMode==='edit'?`<button class="je-btn je-btn-secondary" onclick="loadEntryForEdit('${escapeHtml(id)}')">Edit</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}`:actionMode==='review'?`<button class="je-btn je-btn-secondary" onclick="openTransactionReview('${escapeHtml(id)}')">Review</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}`:'';return`<tr class="${rowClass}" data-entry-id="${escapeHtml(id)}" data-line-index="${index}">${index===0?`<td rowspan="${lines.length}" class="entry-shared-cell">${formatAppDate(first.date)}</td><td rowspan="${lines.length}" class="entry-shared-cell"><div class="entry-id-stack"><span style="font-family:monospace;color:#065f46">${escapeHtml(id)}</span>${adjusted?`<button type="button" class="adjusted-entry-badge adjusted-entry-button" onclick="event.stopPropagation();openAdjustedDetails('${escapeHtml(id)}')">Adjusted</button>`:''}</div></td>`:''}<td><div class="transaction-account-display"><span class="currency-symbol-badge">${currencySymbolV6(account.currency)}</span><span class="account-clean-name">${escapeHtml(account.name)}</span></div></td><td>${escapeHtml(line.memo||'')}</td><td class="num">${line.debit>0?Number(line.debit).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</td>${currencies.map(c=>`<td class="num">${line.credit>0&&line.currency===c.code?Number(line.credit).toLocaleString('en-US',{minimumFractionDigits:2}):'-'}</td>`).join('')}${hasActions&&index===0?`<td rowspan="${lines.length}" class="action-col entry-shared-cell"><div class="transaction-review-actions">${actions}</div></td>`:''}</tr>`}).join('')}).join('');
}
function setTransactionTableHeaders(id,withActions){const header=document.getElementById(id);if(!header)return;const currencies=transactionCurrencies();header.innerHTML=`<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="num">DR</th>${currencies.map(c=>`<th class="num">CR-${escapeHtml(c.code)}</th>`).join('')}${withActions?'<th class="action-col">Action</th>':''}`}
renderJournalHistoryTable=function(records=JournalModule.entries){const current=getCurrentMonthPrefix();setTransactionTableHeaders('thJournalHistoryRow',true);renderTransactionReviewTable(document.getElementById('tblJournalHistoryBody'),records.filter(r=>String(r.date).slice(0,7)===current&&!r.archived),'edit')};
renderAllTransactionsTable=function(){setTransactionTableHeaders('thAllTransRow',false);renderTransactionReviewTable(document.getElementById('allTransactionsBody'),JournalModule.entries.filter(r=>r.archived),'none')};
renderNewTransactionsTable=function(){const host=document.getElementById('newTransactionsGroupedContainer');if(!host)return;const rows=JournalModule.entries.filter(r=>!r.archived),months=[...new Set(rows.map(r=>String(r.date).slice(0,7)))].sort().reverse(),current=getCurrentMonthPrefix();if(!months.length){host.innerHTML='<div class="empty-archive-state">No open transactions. All monthly batches have been submitted for review.</div>';return}host.innerHTML=months.map((month,index)=>`<section class="monthly-unarchived-cluster ${month===current?'current-month-cluster':'overdue-month-cluster'}"><div class="monthly-cluster-header"><div><h4>${month===current?'Current Period':'Open Period'} — ${monthLabel(month)}</h4><span class="archive-status ${month===current?'current':'overdue'}">${month===current?'OPEN':'UNARCHIVED'}</span></div><button type="button" class="je-btn je-btn-emerald no-print" onclick="archiveTransactionMonth('${month}')">Archive &amp; Submit</button></div><div class="table-container"><table class="clustered-journal-table"><thead><tr id="openPeriodHeader${index}"></tr></thead><tbody id="openPeriodBody${index}"></tbody></table></div></section>`).join('');months.forEach((month,index)=>{setTransactionTableHeaders(`openPeriodHeader${index}`,true);renderTransactionReviewTable(document.getElementById(`openPeriodBody${index}`),rows.filter(r=>String(r.date).slice(0,7)===month),'edit')})};
async function openTransactionReview(entryNo){
  const lines=JournalModule.entries.filter(row=>row.id===entryNo);if(!lines.length)return;const month=String(lines[0].date).slice(0,7),dbId=lines[0].dbEntryId;
  if(dbId&&ojmDb){const result=await ojmDb.rpc('mark_journal_entry_under_review',{p_entry_id:dbId,p_note:'Opened from transaction review'});if(result.error)showAppNotification('Review Status',result.error.message,true)}
  switchTab('period-review');selectReviewPeriod(month);openPeriodFindingForm();const select=document.getElementById('findingTransactionId'),description=document.getElementById('findingDescription');if(select)select.value=entryNo;if(description)description.value=`Review requested for ${entryNo}: `;description?.focus();
}
let pendingVoidTransaction=null;
function voidLiveJournalEntry(dbId,entryNo){pendingVoidTransaction={dbId,entryNo};const caption=document.getElementById('voidTransactionCaption'),reason=document.getElementById('voidTransactionReason'),error=document.getElementById('voidTransactionError');if(caption)caption.textContent=`${entryNo} will remain in the audit trail.`;if(reason)reason.value='';if(error)error.textContent='';openModal('modalVoidTransaction');setTimeout(()=>reason?.focus(),80)}
function closeVoidTransactionModal(){pendingVoidTransaction=null;closeModal('modalVoidTransaction')}
async function confirmVoidTransaction(){const reason=document.getElementById('voidTransactionReason')?.value.trim(),errorBox=document.getElementById('voidTransactionError');if(!pendingVoidTransaction)return;if(!reason){if(errorBox)errorBox.textContent='Please provide the reason for voiding this transaction.';return}const {dbId,entryNo}=pendingVoidTransaction;const {error}=await ojmDb.rpc('void_journal_entry',{p_entry_id:dbId,p_reason:reason});if(error){if(errorBox)errorBox.textContent=error.message;return}closeVoidTransactionModal();showAppNotification('Transaction Voided',`${entryNo} remains in the audit trail with its void reason.`,false);await loadJournalFromSupabase();renderVoidedTransactionsTable()}

let LiveTransactionAudit=[];
async function loadTransactionAudit(){
  if(!ojmDb||!liveProfile)return;const {data,error}=await ojmDb.from('audit_log').select('id,record_id,action,reason,old_data,new_data,actor_id,created_at').in('table_name',['journal_entries','accounting_periods','period_findings']).order('created_at',{ascending:false}).limit(250);
  if(!error){LiveTransactionAudit=data||[];renderVoidedTransactionsTable();}
}
renderVoidedTransactionsTable=function(){
  const header=document.getElementById('thVoidedTransRow'),body=document.getElementById('voidedTransactionsBody');if(!body)return;
  if(header)header.innerHTML='<th class="audit-expand-cell"></th><th>Date & Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th>';
  const live=LiveTransactionAudit.filter(item=>['VOID','UPDATE','MODIFY','MARK_UNDER_REVIEW','APPROVE_AND_POST','PERIOD_STATUS'].includes(item.action));
  const local=(JournalModule.voidedEntries||[]).map((item,index)=>({id:item.id||`local-${index}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp,actor_id:null}));
  const audits=[...live,...local].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  body.innerHTML=audits.length?audits.map((item,index)=>{const key=`audit-detail-${index}`,record=auditRecordId(item);return`<tr class="audit-summary-row" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" aria-expanded="false"><td class="audit-expand-cell">▶</td><td>${formatAppDate(item.created_at,true)}</td><td style="font-family:monospace">${escapeHtml(record)}</td><td><span class="submission-status ${item.action==='VOID'?'returned':'posted'}">${escapeHtml(String(item.action||'CHANGE').replaceAll('_',' '))}</span></td><td>${escapeHtml(item.reason||item.new_data?.status||'—')}</td><td>${escapeHtml(getLiveUserName(item.actor_id)||'System')}</td></tr><tr id="${key}" class="audit-detail-row" hidden><td colspan="6"><div class="audit-detail-panel">${auditComparisonHtml(item.old_data,item.new_data,item.action)}</div></td></tr>`}).join(''):'<tr><td colspan="6" class="period-empty">No void, correction, or period-review audit records yet.</td></tr>';
};
function selectAuditLogRow(row){document.querySelectorAll('#tblVoidedTransactions .audit-row-selected').forEach(node=>node.classList.remove('audit-row-selected'));row?.classList.add('audit-row-selected')}
function auditRecordId(item){const safe=item||{},old=(Array.isArray(safe.old_data)?safe.old_data[0]:safe.old_data)||{},next=(Array.isArray(safe.new_data)?safe.new_data[0]:safe.new_data)||{};return old.entry_no||old.id||next.entry_no||next.id||safe.record_id||safe.id||'Audit record'}
function auditLines(data){if(Array.isArray(data))return data.filter(row=>row&&typeof row==='object');if(Array.isArray(data?.lines)){const header={...data};delete header.lines;return data.lines.filter(row=>row&&typeof row==='object').map(line=>({...header,...line}))}if(data&&typeof data==='object'&&Object.keys(data).length)return[data];return[]}
function auditField(row,key){const aliases={date:['date','transaction_date','line_date'],entry:['entry_no','id'],account:['account','account_name'],memo:['memo','description','reference'],debit:['debit'],credit:['credit'],currency:['currency','currency_code'],status:['status','correction_status']};for(const name of aliases[key])if(row?.[name]!==undefined&&row?.[name]!==null&&row?.[name]!=='')return row[name];return''}
function auditComparisonHtml(oldData,newData,action){const oldLines=auditLines(oldData),newLines=auditLines(newData),fields=[['date','Date'],['entry','Entry ID'],['account','Account'],['memo','Memo / Reference'],['debit','Debit'],['credit','Credit'],['currency','Currency'],['status','Status']],count=Math.max(oldLines.length,newLines.length,1),rows=[];for(let i=0;i<count;i++){for(const[field,label]of fields){const before=auditField(oldLines[i],field),after=auditField(newLines[i],field);if(before===''&&after==='')continue;const changed=String(before)!==String(after),removed=before!==''&&after==='',beforeText=field==='date'&&before?formatAppDate(before):before,afterText=field==='date'&&after?formatAppDate(after):after;rows.push(`<tr><td class="audit-field">${count>1?`Line ${i+1} — `:''}${label}</td><td class="${changed?'audit-original-changed':''}">${escapeHtml(String(beforeText||'—'))}${removed?'<span class="audit-removed-mark">Removed</span>':''}</td><td>${escapeHtml(String(afterText||'—'))}</td></tr>`)}}if(!rows.length)return'<div class="audit-empty-detail">No journal-field changes were recorded for this audit action.</div>';return`<table class="audit-compare-table"><thead><tr><th>Journal field</th><th>Original / Removed</th><th>Revised / Result</th></tr></thead><tbody>${rows.join('')}</tbody></table>`}
function toggleAuditDetails(id,row){const detail=document.getElementById(id);if(!detail)return;const opening=detail.hidden;detail.hidden=!opening;row.setAttribute('aria-expanded',String(opening));const icon=row.querySelector('.audit-expand-cell');if(icon)icon.textContent=opening?'▼':'▶'}
function openAdjustedDetails(entryId){const local=(JournalModule.voidedEntries||[]).map((item,index)=>({id:item.id||`local-${index}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp,actor_id:null})),audits=[...LiveTransactionAudit,...local],item=audits.find(record=>auditRecordId(record)===entryId||auditLines(record.old_data).some(row=>row.id===entryId||row.entry_no===entryId)||auditLines(record.new_data).some(row=>row.id===entryId||row.entry_no===entryId));let modal=document.getElementById('modalAdjustmentQuickView');if(!modal){modal=document.createElement('div');modal.id='modalAdjustmentQuickView';modal.className='modal-backdrop';modal.innerHTML='<div class="modal-dialog modal-center adjustment-quick-dialog"><div class="modal-header"><h4>Adjustment Details</h4><button type="button" class="modal-close-x" onclick="closeModal(\'modalAdjustmentQuickView\')">&times;</button></div><div class="modal-body" id="adjustmentQuickViewBody"></div><div class="modal-footer"><button type="button" class="je-btn je-btn-secondary" onclick="closeModal(\'modalAdjustmentQuickView\')">Close</button></div></div>';document.body.appendChild(modal)}const body=document.getElementById('adjustmentQuickViewBody');body.innerHTML=item?`<div class="je-subtitle" style="margin-bottom:7px"><strong>${escapeHtml(String(item.action||'ADJUSTMENT').replaceAll('_',' '))}</strong> • ${escapeHtml(item.reason||'No reason recorded')}</div>${auditComparisonHtml(item.old_data,item.new_data,item.action)}`:'<div class="empty-archive-state">No linked audit details are available for this adjusted entry.</div>';openModal('modalAdjustmentQuickView')}
const loadJournalFromSupabaseBeforeAudit=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforeAudit();await loadTransactionAudit();};
const switchTabBeforeTransactionAudit=switchTab;
switchTab=function(tabId){switchTabBeforeTransactionAudit(tabId);if(tabId==='transactions-voided')loadTransactionAudit();if(tabId==='transactions-all')renderAllTransactionsTable();if(tabId==='transactions-new')renderNewTransactionsTable();};

async function loadAccountingPeriodStatuses(){
  if(!ojmDb||!liveProfile)return;const {data,error}=await ojmDb.from('accounting_periods').select('period_month,status,updated_at,updated_by');if(error)return;
  (data||[]).forEach(item=>{const key=String(item.period_month).slice(0,7);PeriodReview.periods[key]={status:item.status,updatedAt:item.updated_at,updatedBy:item.updated_by};});
  JournalModule.entries.forEach(row=>{const state=PeriodReview.status(String(row.date).slice(0,7));row.archived=state!=='open';});
  refreshAllTables();
}
function showPeriodToast(message,isError=false){let toast=document.getElementById('periodStatusToast');if(!toast){toast=document.createElement('div');toast.id='periodStatusToast';toast.className='period-status-toast';document.body.appendChild(toast)}clearTimeout(showPeriodToast.timer);toast.textContent=message;toast.classList.toggle('is-error',isError);toast.classList.add('is-visible');showPeriodToast.timer=setTimeout(()=>toast.classList.remove('is-visible'),2600)}
const loadJournalFromSupabaseBeforePeriods=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforePeriods();await loadAccountingPeriodStatuses();};
const changePeriodStatusLocal=changePeriodStatus;
changePeriodStatus=async function(nextStatus){
  const month=PeriodReview.selectedMonth,current=PeriodReview.status(month),openFindings=PeriodReview.findings.filter(item=>item.month===month&&!['corrected','closed'].includes(item.status)).length;
  if(nextStatus==='closed'&&openFindings){showAppNotification('Open Findings',`Resolve or close ${openFindings} finding(s) before closing this period.`,true);return}
  if(nextStatus==='locked'&&current!=='closed'){showAppNotification('Close Period First','A period must be closed before locking it.',true);return}
  if(ojmDb){const {error}=await ojmDb.rpc('set_accounting_period_status',{p_month:`${month}-01`,p_status:nextStatus});if(error){showAppNotification('Period Update Failed',error.message,true);return}}
  changePeriodStatusLocal(nextStatus);await loadTransactionAudit();showPeriodToast(`Period ${nextStatus==='review'?'is under review':nextStatus==='open'?'reopened':nextStatus}.`);
};

// TRANSACTION SCROLL MEMORY — remember subsection positions only while the user
// remains inside Transactions. Leaving the module clears the saved positions.
const TransactionScrollMemory={positions:{},activeTab:'',activeModule:''};
function appWorkspaceScroller(){return document.getElementById('printableDocArea')||document.querySelector('.workspace-scroll')}
function moduleForTab(tabId){const target=document.getElementById(tabId);if(target?.dataset.module)return target.dataset.module;if(target?.closest('[data-module]')?.dataset.module)return target.closest('[data-module]').dataset.module;if(['journal','transactions-new','transactions-all','transactions-voided','transactions-recurring','period-review'].includes(tabId))return'transactions';return tabId.startsWith('sec-')?'accounts':''}
const switchTabBeforeScrollMemory=switchTab;
switchTab=function(tabId){
  const scroller=appWorkspaceScroller(),nextModule=moduleForTab(tabId),previousModule=TransactionScrollMemory.activeModule;
  if(previousModule==='transactions'&&TransactionScrollMemory.activeTab&&scroller)TransactionScrollMemory.positions[TransactionScrollMemory.activeTab]=scroller.scrollTop;
  if(previousModule==='transactions'&&nextModule!=='transactions')TransactionScrollMemory.positions={};
  switchTabBeforeScrollMemory(tabId);
  const stayingInsideTransactions=previousModule==='transactions'&&nextModule==='transactions';
  TransactionScrollMemory.activeTab=tabId;TransactionScrollMemory.activeModule=nextModule;
  requestAnimationFrame(()=>{const liveScroller=appWorkspaceScroller();if(liveScroller)liveScroller.scrollTop=stayingInsideTransactions?(TransactionScrollMemory.positions[tabId]||0):0});
};
const scrollToAccountModuleBeforeScrollMemory=scrollToAccountModule;
scrollToAccountModule=function(moduleId){
  if(TransactionScrollMemory.activeModule==='transactions')TransactionScrollMemory.positions={};
  TransactionScrollMemory.activeModule='accounts';TransactionScrollMemory.activeTab=moduleId;
  const scroller=appWorkspaceScroller();if(scroller)scroller.scrollTop=0;
  return scrollToAccountModuleBeforeScrollMemory(moduleId);
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const active=document.querySelector('.tab-content.active');TransactionScrollMemory.activeTab=active?.id||'';TransactionScrollMemory.activeModule=moduleForTab(TransactionScrollMemory.activeTab)},{once:true});

// TABLE AUDIT TRACKER — light hover, one persistent selected journal line.
function transactionRowOwner(row){const id=row?.dataset.entryId;if(!id)return null;return[...row.closest('tbody').querySelectorAll('tr[data-entry-id]')].find(candidate=>candidate.dataset.entryId===id&&candidate.dataset.lineIndex==='0')||null}
document.addEventListener('mouseover',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row)return;const table=row.closest('table');table.querySelectorAll('.entry-hover-line,.entry-hover-owner').forEach(node=>node.classList.remove('entry-hover-line','entry-hover-owner'));row.classList.add('entry-hover-line');transactionRowOwner(row)?.classList.add('entry-hover-owner')});
document.addEventListener('mouseout',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row||row.contains(event.relatedTarget))return;const table=row.closest('table');table.querySelectorAll('.entry-hover-line,.entry-hover-owner').forEach(node=>node.classList.remove('entry-hover-line','entry-hover-owner'))});
document.addEventListener('click',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row||event.target.closest('button,a,input,select,textarea,label'))return;document.querySelectorAll('.entry-selected-line,.entry-selected-owner').forEach(node=>node.classList.remove('entry-selected-line','entry-selected-owner'));row.classList.add('entry-selected-line');transactionRowOwner(row)?.classList.add('entry-selected-owner')});
