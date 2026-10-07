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
  accounting: { baseCurrency:'LAK', fiscalYearStart:'01', journalPrefix:'JRN', subUserPrefix:'SJR', journalDigits:'4', subUserDigits:'4', defaultCashAccount:'Cash on Hand', defaultBankAccount:'BCEL Bank', exchangeRatePolicy:'manual', decimalPlaces:'2', lockClosedPeriods:true },
  payroll: { payFrequency:'monthly', payCurrency:'LAK', payCurrencyLAK:true, payCurrencyUSD:true, payCurrencyTHB:true, weeklyHours:'40', workDaysMonth:'26', hoursPerDay:'8', payrollCutoff:'25', paymentDay:'30', overtimeRate:'1.5', lateGraceMinutes:'5', employeeSsoRate:'5.5', employerSsoRate:'6', pitSharing:'equal' },
  tax: { pit1From:'0', pit1To:'2500000', pit1Rate:'0', pit2From:'2500000', pit2To:'5000000', pit2Rate:'5', pit3From:'5000000', pit3To:'15000000', pit3Rate:'10', pit4From:'15000000', pit4To:'25000000', pit4Rate:'15', pit5From:'25000000', pit5To:'65000000', pit5Rate:'20', pit6From:'65000000', pit6To:'', pit6Rate:'25', ssoEmployeeRate:'5.5', ssoEmployerRate:'6', ssoMaxBase:'', vatRate:'10', filingPeriod:'monthly', pitDeadline:'20', ssoDeadline:'20', vatDeadline:'20', vatAccount:'VAT Payable', pitAccount:'PIT Payable', ssoAccount:'SSO Payable', pitReminderDays:'5', ssoReminderDays:'5', vatReminderDays:'5' },
  printing: { paperSize:'A4', orientation:'portrait', marginSize:'normal', headerPlacement:'first', footerPlacement:'last', pageNumberFormat:'page-total', fileNamePattern:'report-date', showBusinessName:true, showPageNumbers:true },
  system: { dateFormat:'DD/MM/YYYY', numberFormat:'1,234.56', sessionTimeout:'30', sessionWarning:'1', defaultLandingPage:'dashboard', retentionYears:'5', archiveFrequency:'annual', confirmHighRisk:true }
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

/* Universal accounting-number policy. Every module reads the same saved locale
   style and decimal precision instead of carrying its own hard-coded format. */
function appNumberLocale() {
  const style = ApplicationSettings.system?.numberFormat;
  return style === '1.234,56' ? 'de-DE' : style === '1 234,56' ? 'fr-FR' : 'en-US';
}
function appDecimalPlaces() {
  return Math.max(0, Math.min(6, Number(ApplicationSettings.accounting?.decimalPlaces ?? 2)));
}
function formatAppNumber(value) {
  const places = appDecimalPlaces();
  return Number(value || 0).toLocaleString(appNumberLocale(), { minimumFractionDigits: places, maximumFractionDigits: places });
}
function parseAppNumber(value) {
  let text = String(value ?? '').replace(/[\s\u00a0\u202f]/g, '');
  const style = ApplicationSettings.system?.numberFormat;
  if (style === '1.234,56') text = text.replace(/\./g, '').replace(',', '.');
  else if (style === '1 234,56') text = text.replace(',', '.');
  else text = text.replace(/,/g, '');
  const number = Number(text);
  return text !== '' && Number.isFinite(number) ? number : NaN;
}
function formatAppNumberEditing(input) {
  if (!input) return;
  const style = ApplicationSettings.system?.numberFormat || '1,234.56';
  const group = style === '1.234,56' ? '.' : style === '1 234,56' ? ' ' : ',';
  const decimal = style === '1,234.56' ? '.' : ',';
  const places = appDecimalPlaces();
  const escapedDecimal = decimal === '.' ? '\\.' : decimal;
  const clean = String(input.value ?? '').replace(new RegExp(`[^0-9${escapedDecimal}]`, 'g'), '');
  const parts = clean.split(decimal);
  const whole = (parts.shift() || '0').replace(/^0+(?=\d)/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
  input.value = grouped + (clean.includes(decimal) && places ? decimal + parts.join('').slice(0, places) : '');
}
function finishAppNumberEditing(input) {
  if (!input) return;
  const value = parseAppNumber(input.value);
  input.value = Number.isFinite(value) ? formatAppNumber(value) : '';
}

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
  if(group==='system'){refreshAllTables();startSessionTimeoutManager();}
  if(group==='accounting'){syncEntrySequence();updateNextEntryIdDisplay();updateAccountingIdPreviews();saveAccountingIdSettingsToDatabase();}
}

function resetSettingsGroup(group) {
  ApplicationSettings[group] = JSON.parse(JSON.stringify(APP_SETTINGS_DEFAULTS[group]));
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(ApplicationSettings));
  setSettingsFormValues(group);
  const badge = document.querySelector(`[data-settings-badge="${group}"]`);
  if (badge) { badge.textContent = 'Default'; badge.classList.add('is-saved'); }
  if(group==='system'){refreshAllTables();startSessionTimeoutManager();}
  showAppNotification('Settings Reset', `${group[0].toUpperCase()}${group.slice(1)} settings were restored to defaults.`, false);
}

function refreshSettingsCurrencyOptions() {
  // Searchable dropdowns also have a text proxy; only update native selects.
  document.querySelectorAll('select.settings-currency-select').forEach(select => {
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
  if(typeof showCenterStatus==='function')showCenterStatus('Settings backup downloaded.');
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
    if(typeof showCenterStatus==='function')showCenterStatus('Settings backup restored successfully.');
  } catch (error) {
    if (status) status.textContent = error.message || 'The backup could not be restored.';
    if(typeof showCenterStatus==='function')showCenterStatus(error.message||'The backup could not be restored.',true);
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
  if (!await ui117.confirm('Delete this legal document from this browser?')) return;
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
      showAppNotification('Notice',"Please provide both Currency Code and Name.");
      return;
    }
    if (this.currencies.some(c => c.code === cleanCode)) {
      showAppNotification('Notice',`Currency ${cleanCode} already exists.`);
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

  async edit(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    const newName = await ui117.prompt(`Edit name for currency ${cur.code}:`, cur.name);
    if (newName && newName.trim()) {
      cur.name = newName.trim();
      this.render();
      if (typeof setupJournalColumns === 'function') setupJournalColumns();
    }
  },

  async remove(code) {
    const cur = this.currencies.find(c => c.code === code);
    if (!cur) return;
    if (cur.isBase) {
      showAppNotification('Notice',"Cannot remove the base currency (USD).");
      return;
    }
    if (await ui117.confirm(`Remove currency ${cur.code} (${cur.name})? All transaction columns will adapt automatically.`)) {
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
        <td><span class="currency-tag" data-currency-code="${escapeHtml(c.code)}" title="${escapeHtml(c.code)}">${escapeHtml(c.symbol)}</span></td>
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

async function handleAddCurrency() {
  const code = document.getElementById('newCurrencyCode').value;
  const name = document.getElementById('newCurrencyName').value;
  const symbol = document.getElementById('newCurrencySymbol').value;
  const saved = await CurrencyStore.add(code, name, symbol);
  if (!saved) return;
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
  if (document.body.classList.contains('tablet117') || window.matchMedia('(max-width: 1024px)').matches || (document.body.classList.contains('subusers-workspace-active') && window.matchMedia('(hover:none) and (pointer:coarse)').matches)) closeMobileNavigation();
}

function switchTab(tabId) {
  if (!document.getElementById(tabId)) tabId = 'dashboard';
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
    const scroller=appWorkspaceScroller(); if(scroller)scroller.scrollTop=0;
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
  if (modal) {modal.classList.add('active');if(['modalAccount','modalSubAccount','modalUserAccess','modalAccessPicker'].includes(id))window.dialogs1440?.attach(modal,{close:()=>id==='modalAccessPicker'?closeAccessPicker():closeModal(id)});}
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {modal.classList.remove('active');window.dialogs1440?.detach(modal);}
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
    modalSelect.insertAdjacentHTML('beforeend','<option value="__PARENT__">N/A — Parent account (non-posting)</option>');
  }
}

function syncCoaDatalist() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.filter(acc=>acc.isPosting!==false).forEach(acc => {
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

  const terms=(document.getElementById('searchCoa1439')?.value||'').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const visibleAccounts = AccountingStore.accounts.filter(acc => {
    const text=[acc.code,acc.name,acc.currency,currencySymbolV6(acc.currency),acc.type,acc.desc].join(' ').toLocaleLowerCase();
    return (filterCurr === 'ALL' || acc.currency === filterCurr)&&terms.every(term=>text.includes(term));
  });

  if (visibleAccounts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No accounts match your search.</td></tr>`;
    return;
  }

  visibleAccounts.forEach(acc => {
    const badgeClass = `badge-${acc.type.toLowerCase()}`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${acc.code}</td>
      <td><strong>${escapeHtml(acc.name)}</strong></td>
      <td><span class="currency-tag" data-currency-code="${escapeHtml(acc.currency)}" title="${escapeHtml(acc.isPosting===false?'Grouping account':acc.currency)}">${acc.isPosting===false?'N/A':escapeHtml(currencySymbolV6(acc.currency)+' '+acc.currency)}</span></td>
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

function configureAccountPurpose87(systemOnly=false){
 const select=document.getElementById('accPurpose71');
 select.innerHTML=(systemOnly?'<option value="" disabled selected>Select account purpose</option>':'<option value="regular">Regular</option>')+'<option value="clearing">Clearing</option><option value="suspense">Suspense</option><option value="settlement">Payment Settlement</option><option value="payroll">Payroll Control</option><option value="opening">Opening Balance Offset</option>';
 select.dataset.systemOnly=String(systemOnly);
}
function openAddAccountModal(systemOnly=false) {
  configureAccountPurpose87(systemOnly);
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = systemOnly?'Add System Account':'Add New Account';
  document.getElementById('accountOrigCode').value = '';
  document.getElementById('formAccount').reset();
  document.getElementById('accPurpose71').value=systemOnly?'':'regular';
  openModal('modalAccount');
  document.getElementById('accCode').focus();
}

function openEditAccountModal(code) {
  configureAccountPurpose87(false);
  const acc = AccountingStore.accounts.find(a => a.code === code);
  if (!acc) return;
  initCoaCurrencyFilter();
  document.getElementById('modalAccountTitle').innerText = 'Edit Account';
  document.getElementById('accountOrigCode').value = acc.code;
  document.getElementById('accCode').value = acc.code;
  document.getElementById('accName').value = acc.name;
  document.getElementById('accCurrency').value = acc.isPosting===false?'__PARENT__':acc.currency;
  document.getElementById('accType').value = acc.type;
  document.getElementById('accDesc').value = acc.desc || '';
  document.getElementById('accPurpose71').value=acc.purpose||'regular';
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
        showAppNotification('Notice','Account Code already in use.');
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
      showAppNotification('Notice','Account Code already exists.');
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
  select.add(new Option('Choose parent account…',''));
  AccountingStore.accounts.filter(acc=>acc.isPosting===false&&!acc.isTechnical).sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})).forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.code;
    opt.textContent = `${acc.code} — ${acc.name}`;
    select.appendChild(opt);
  });
}

function renderSubAccountsTable() {
  const tbody = document.getElementById('subAccountTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  AccountingStore.subAccounts.forEach(sub => {
    const parent = AccountingStore.accounts.find(a => a.code === sub.parentCode);
    const parentLabel = parent ? `${parent.code} — ${parent.name}` : sub.parentCode;
    const currency = sub.currency || parent?.currency || '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="parent-account-label">${escapeHtml(parentLabel)}</span></td>
      <td style="font-family: monospace; font-weight: 700; color: #064e3b;">${sub.code}</td>
      <td><span class="currency-symbol-badge" data-currency-code="${escapeHtml(currency)}" title="${escapeHtml(currency)}">${escapeHtml(currencySymbolV6(currency))}</span> <strong>${escapeHtml(sub.name)}</strong></td>
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

function syncSubAccountCurrencyDropdown(selected = '') {
  const select = document.getElementById('subCurrency');
  if (!select) return;
  select.replaceChildren(new Option('Choose currency…', ''));
  for (const currency of CurrencyStore.currencies.filter(c => c.active !== false)) {
    select.add(new Option(`${currency.code}${currency.name ? ' — ' + currency.name : ''}`, currency.code));
  }
  if (selected && !Array.from(select.options).some(o => o.value === selected)) {
    const unavailable = new Option(`${selected} — inactive; choose a currency`, selected);
    unavailable.disabled = true;
    select.add(unavailable);
  }
  select.value = selected;
  window.dropdown1434?.enhance(document.getElementById('formSubAccount'));
}

function openAddSubAccountModal() {
  syncSubAccountParentDropdown();
  document.getElementById('modalSubAccountTitle').innerText = 'Add Sub-Account';
  document.getElementById('subAccountOrigCode').value = '';
  document.getElementById('formSubAccount').reset();
  syncSubAccountCurrencyDropdown();
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
  syncSubAccountCurrencyDropdown(sub.currency || AccountingStore.accounts.find(a => a.code === sub.parentCode)?.currency || '');
  openModal('modalSubAccount');
}

function handleSubAccountFormSubmit(event) {
  event.preventDefault();
  const origCode = document.getElementById('subAccountOrigCode').value;
  const parentCode = document.getElementById('subParentCode').value;
  const code = document.getElementById('subCode').value.trim();
  const name = document.getElementById('subName').value.trim();
  const desc = document.getElementById('subDesc').value.trim();
  const currency = document.getElementById('subCurrency').value;

  if (origCode) {
    const sub = AccountingStore.subAccounts.find(s => s.code === origCode);
    if (sub) {
      if (origCode !== code && AccountingStore.subAccounts.some(s => s.code === code)) {
        showAppNotification('Notice','Sub-Account code already exists.');
        return;
      }
      sub.parentCode = parentCode;
      sub.code = code;
      sub.name = name;
      sub.desc = desc;
      sub.currency = currency;
    }
  } else {
    if (AccountingStore.subAccounts.some(s => s.code === code)) {
      showAppNotification('Notice','Sub-Account code already exists.');
      return;
    }
    AccountingStore.subAccounts.push({ parentCode, code, name, desc, currency });
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
  if(typeof Chart==='undefined')return;
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
  voidedEntries: [], // Live audit only; no built-in sample.
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
  const prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'JRN').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN';
  const digits=Math.max(3,Math.min(6,Number(ApplicationSettings.accounting?.journalDigits)||4));
  return `${prefix}-${String(JournalModule.sequence).padStart(digits,'0')}`;
}
function syncEntrySequence(){const prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'JRN').trim().toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8)||'JRN',digits=Math.max(3,Math.min(6,Number(ApplicationSettings.accounting?.journalDigits)||4)),pattern=new RegExp(`^${prefix}-(\\d{${digits}})$`),max=JournalModule.entries.reduce((value,row)=>{const match=String(row.id||'').match(pattern);return match?Math.max(value,Number(match[1])):value},0);JournalModule.sequence=Math.max(1,max+1)}

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
  syncCoaDatalist(); updateNextEntryIdDisplay();
  const header=document.getElementById('jeHeaderRow');
  if(header) header.innerHTML='<th>Account</th><th>Line Memo / Reference</th><th class="num">Debit</th><th class="num">Credit</th><th class="action-col no-print">Action</th>';
  // Currency settings must never erase an in-progress journal draft.
  const body=document.getElementById('jeLinesBody');
  if(body && !body.querySelector('.je-line-acc')) resetJournalLinesForm();
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
      <input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${escapeHtml(String(memoVal))}" />
    </td>
    <td>
      <input type="text" class="num je-line-dr" placeholder="0.00" value="${drVal}"
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
  document.getElementById('jeGeneralMemo').value = lines[0].generalMemo ?? lines[0].memo;

  const btnPost = document.getElementById('btnPostJournal');
  if (btnPost) btnPost.textContent = "Update Entry";

  const tbody = document.getElementById('jeLinesBody');
  tbody.innerHTML = '';

  lines.forEach(line => {
    const matches = AccountingStore.accounts.filter(a => a.name === line.account && a.currency === line.currency);
    const matched = AccountingStore.accounts.find(a => (line.accountId && a.id === line.accountId) || (line.accountCode && a.code === line.accountCode)) || (matches.length === 1 ? matches[0] : getSelectedAccountInfo(line.account));
    const accStr = matched && matched.currency === line.currency ? `${matched.code} — ${matched.name}` : `${line.account} (${line.currency})`;
    const drStr = line.debit > 0 ? formatAppNumber(line.debit) : '';
    const crMap = {};
    if (line.credit > 0) crMap[line.currency] = formatAppNumber(line.credit);

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
    if (error) { showAppNotification('Update Failed', error.code==='PGRST202' ? 'The journal revision function is missing or outdated. Read setup/SETUP-GUIDE-v142.20.txt for the required existing database setup. Your original entry has not been changed.' : error.message, true); return; }
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
            ${isMatch ? formatAppNumber(line.credit) : '-'}
          </td>
        `;
      });

      // Layout: Date | Entry ID | Account | Memo | DR | CRs | Action
      tr.innerHTML = `
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; color: #1e293b;">${firstLine.date}</td>` : ''}
        ${isStart ? `<td rowspan="${totalLines}" style="vertical-align: top; font-family: monospace; color: #065f46;">${entryId}</td>` : ''}
        
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(cleanAcc.currency || '')}" title="${escapeHtml(cleanAcc.currency || '')}">${currencySymbolV6(cleanAcc.currency)}</span><span class="account-clean-name">${escapeHtml(cleanAcc.name)}</span></div></td>

        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        
        <td class="num" style="color: ${line.debit > 0 ? '#0f172a' : '#94a3b8'};">
          ${line.debit > 0 ? formatAppNumber(line.debit) : '-'}
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

async function deleteTransactionCluster(id) {
  if (await ui117.confirm(`Are you sure you want to delete transaction cluster ${id}?`)) {
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
        crCols += `<td class="num" style="color: #991b1b;">${isMatch ? formatAppNumber(line.credit) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #991b1b;">
          <span class="badge-void-old">VOIDED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(line.currency)}" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #991b1b;">${line.debit > 0 ? formatAppNumber(line.debit) : '-'}</td>
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
        crCols += `<td class="num" style="color: #065f46;">${isMatch ? formatAppNumber(line.credit) : '-'}</td>`;
      });

      tr.innerHTML = `
        <td>${line.date}</td>
        <td style="font-family: monospace; color: #065f46;">
          <span class="badge-void-new">REVISED</span> ${item.id}
        </td>
        <td><div class="transaction-account-display"><span class="currency-symbol-badge" data-currency-code="${escapeHtml(line.currency)}" title="${escapeHtml(line.currency)}">${currencySymbolV6(line.currency)}</span><span>${escapeHtml(cleanAcc.name)}</span></div></td>
        <td style="color: var(--text-muted);">${escapeHtml(line.memo)}</td>
        <td class="num" style="color: #065f46;">${line.debit > 0 ? formatAppNumber(line.debit) : '-'}</td>
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
  if(typeof showCenterStatus==='function')showCenterStatus('CSV export downloaded successfully.');
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
  const accounts = (AccountingStore.accounts || []).filter(a=>a.isPosting!==false);
  const normalized = raw.replace(/\s+/g, ' ').trim();
  const legacy = normalized.match(/^(.*)\s+\(([A-Z]{3})\)$/);
  if (legacy) { const matches = accounts.filter(a => a.name === legacy[1].trim() && a.currency === legacy[2]); return matches.length === 1 ? matches[0] : null; }
  const exactCode = accounts.find(account => String(account.code || '').trim() === normalized);
  if (exactCode) return exactCode;

  /* The Chart of Accounts code is the authoritative identity.  Datalist values
     use "CODE — Name", so resolve that code before considering a name. */
  const codePrefix = normalized.split(/\s+[—–-]\s+|\s+/)[0];
  const prefixedAccount = accounts.find(account => String(account.code || '').trim() === codePrefix);
  if (prefixedAccount) return prefixedAccount;

  const exactDisplay = accounts.find(account =>
    normalized === `${String(account.code || '').trim()} — ${String(account.name || '').trim()}`
  );
  if (exactDisplay) return exactDisplay;

  /* A name is accepted only when it identifies exactly one account.  This
     prevents equally named LAK/USD accounts from borrowing the wrong symbol. */
  const exactNameMatches = accounts.filter(account => String(account.name || '').trim() === normalized);
  return exactNameMatches.length === 1 ? exactNameMatches[0] : null;
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
    badge.textContent = state.differences.map(([c,t]) => `${currencySymbolV6(c)} ${c}: DR ${formatCompactAmount(t.debit)} / CR ${formatCompactAmount(t.credit)}`).join(' • ');
    if (postBtn) postBtn.disabled = true;
  }
}

function formatCompactAmount(value) {
  return formatAppNumber(value);
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

async function archiveTransactionMonth(monthKey) {
  const ids = new Set(JournalModule.entries.filter(e => monthKeyFromDate(e.date) === monthKey && !e.archived).map(e => e.id));
  if (!ids.size) return;
  if (!await ui117.confirm(`Archive all unarchived transactions for ${monthLabel(monthKey)}? This closes that monthly batch and moves it to All Transactions.`)) return;
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
    header.innerHTML = `<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="num">Debit</th>${currencies.map(c=>`<th class="num">Credit-${c.code}</th>`).join('')}`;
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
async function deleteTransactionTemplate(id){
  const t=TemplateStore.templates.find(x=>x.id===id); if(!t)return;
  if(!await ui117.confirm(`Remove template "${t.name}"?`))return;
  TemplateStore.templates=TemplateStore.templates.filter(x=>x.id!==id); TemplateStore.save(); renderTemplateManager();
}

// ------------------------- Recurring Obligations -------------------------------
const RecurringStore = {
  key:'ojm_recurring_transactions_v1',
  items:[],
  pendingReminders:[],
  load(){if(!window.PrivateReminders14229){this.items=[];return}return PrivateReminders14229.load().catch(()=>{})},
  save(){if(!window.PrivateReminders14229)return Promise.reject(Error('Sign in before saving reminders.'));return PrivateReminders14229.save()}
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
async function saveRecurringTransaction(){
  const memo=document.getElementById('recurringMemo').value.trim();
  const nextDate=document.getElementById('recurringNextDate').value;
  if(!memo||!nextDate){showAppNotification('Missing Recurring Details','Description / Memo and Next Due Date are required.',true);return}
  if(!RecurringStore.pendingReminders.length){showAppNotification('Reminder Required','Add at least one warning schedule.',true);return}
  const saved=await PrivateReminders14229.mutate(()=>RecurringStore.items.push({
    id:'rec-'+crypto.randomUUID(),createdAt:new Date().toISOString(),type:document.getElementById('recurringType')?.value||'recurring',memo,frequency:document.getElementById('recurringType')?.value==='one-time'?'One-Time':document.getElementById('recurringFrequency').value,nextDate,
    amount:parseAppNumber(document.getElementById('recurringAmount').value||0),currency:document.getElementById('recurringCurrency').value,
    reference:document.getElementById('recurringReference').value.trim(),reminders:RecurringStore.pendingReminders.map(x=>({...x})),paused:false
  }), 'add:'+JSON.stringify([memo,nextDate,document.getElementById('recurringType')?.value,document.getElementById('recurringFrequency').value,document.getElementById('recurringAmount').value,document.getElementById('recurringCurrency').value,document.getElementById('recurringReference').value,RecurringStore.pendingReminders]));
  if(!saved)return false; resetRecurringForm(); renderRecurringTransactions(); showAppNotification('Upcoming Transaction Saved','The transaction and its warning schedule have been saved.',false);return true;
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
  const items=orderedRecords78(window.PrivateReminders14229?.ready()?RecurringStore.items:[]);
  body.innerHTML=items.map(item=>{
    const status=recurringStatus(item), cls=status==='OVERDUE'?'due-overdue':status==='DUE SOON'?'due-soon':'';
    return `<tr data-recurring-id="${escapeHtml(item.id)}">
      <td class="${cls}">${formatAppDate(item.nextDate)}</td><td>${escapeHtml(item.type==='one-time'?'One-Time':item.frequency)}</td><td>${escapeHtml(item.memo)}${item.reference?`<div class="je-subtitle">${escapeHtml(item.reference)}</div>`:''}</td>
      <td class="num">${formatAppNumber(item.amount)} ${escapeHtml(item.currency)}</td>
      <td>${escapeHtml(reminderText(item))}</td><td class="${cls}">${status}</td>
      <td class="action-col upcoming-action-col no-print"><div class="recurring-inline-actions"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid('${item.id}')">Mark reminder paid</button><button class="je-btn je-btn-secondary" onclick="toggleRecurringPause('${item.id}')">${item.paused?'Resume':'Pause'}</button><button class="je-btn je-btn-danger recurring-remove-x" onclick="removeRecurring('${item.id}')" title="Remove upcoming transaction" aria-label="Remove upcoming transaction">&times;</button></div></td>
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
async function markRecurringPaid(id){const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;const saved=await PrivateReminders14229.mutate(()=>{const current=RecurringStore.items.find(x=>x.id===id);if(!current)throw Error('Reminder changed. Reload first.');current.lastPaidDate=new Date().toISOString().slice(0,10);delete current.preparedUntil;if(current.type==='one-time'||current.frequency==='One-Time')RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id);else advanceRecurringDate(current)},'paid:'+id);if(saved)showAppNotification('Marked Paid',`${item.memo} was marked paid. No journal payment was posted.`,false);return saved;}
async function toggleRecurringPause(id){return PrivateReminders14229.mutate(()=>{const item=RecurringStore.items.find(x=>x.id===id);if(!item)throw Error('Reminder changed. Reload first.');item.paused=!item.paused},'pause:'+id)}
async function removeRecurring(id){const item=RecurringStore.items.find(x=>x.id===id);if(!item)return;if(!await ui117.confirm(`Remove recurring item "${item.memo}"?`))return;return PrivateReminders14229.mutate(()=>{RecurringStore.items=RecurringStore.items.filter(x=>x.id!==id)},'remove:'+id)}

function getActiveRecurringWarnings(){
  if(!window.PrivateReminders14229?.ready())return [];
  return RecurringStore.items.filter(x=>!x.paused && ['OVERDUE','DUE SOON'].includes(recurringStatus(x))).sort((a,b)=>{
    const sa=recurringStatus(a),sb=recurringStatus(b); if(sa!==sb)return sa==='OVERDUE'?-1:1; return a.nextDate.localeCompare(b.nextDate);
  });
}
function renderRecurringWarnings(){
  const host=document.getElementById('recurringWarningList');if(!host)return;
  const items=getActiveRecurringWarnings();
  host.innerHTML=items.length?items.map(item=>`<div class="recurring-warning-item ${recurringStatus(item)==='OVERDUE'?'overdue':''}">
    <h5>${recurringStatus(item)==='OVERDUE'?'OVERDUE':'UPCOMING'} — ${escapeHtml(item.memo)}</h5>
    <div>Due: <strong>${item.nextDate}</strong> • ${formatAppNumber(item.amount)} ${escapeHtml(item.currency)}</div>
    <div class="je-subtitle">Reminder: ${escapeHtml(reminderText(item))}</div>
    <div style="margin-top:7px"><button class="je-btn je-btn-emerald" onclick="markRecurringPaid('${item.id}')">Mark reminder paid</button></div>
  </div>`).join(''):'<div class="empty-archive-state">No recurring warnings are currently due.</div>';
}
async function showRecurringWarningsOnLogin(){
  if(liveProfile?.role!=='admin'||!window.access113?.can('transactions-recurring'))return;try{await PrivateReminders14229.load()}catch{return}renderRecurringWarnings();
  if(!liveProfile)return;
  const owner=liveProfile.id;const show=()=>{if(liveProfile?.id!==owner)return;if(document.querySelector('.modal-backdrop.active,.submission-compare-overlay')){setTimeout(show,500);return}if(getActiveRecurringWarnings().length)openModal('modalRecurringWarnings')};setTimeout(show,250);
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
  if(liveProfile?.role==='admin')RecurringStore.load();
  renderRecurringTransactions();
  renderPendingReminders();
  // Login coordinator displays reminders after authenticated loading finishes.
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeV4Enhancements, { once: true });
else initializeV4Enhancements();
// ==============================================================================

// ==============================================================================
// JS V6: UNIFIED DIALOGS, MULTI-DATE BATCH ENTRY & CURRENCY SYMBOL BADGES
// ==============================================================================
function currencySymbolV6(code) {
  const normalized = String(code || '').toUpperCase();
  const configured = typeof CurrencyStore !== 'undefined'
    ? (CurrencyStore.currencies || []).find(item => String(item.code || '').toUpperCase() === normalized)
    : null;
  if (configured?.symbol) return configured.symbol;
  const fallback = { LAK: '₭', USD: '$', THB: '฿', EUR: '€', GBP: '£', JPY: '¥', CNY: '¥' };
  return fallback[normalized] || normalized.slice(0, 3);
}

// Keep account choices short and currency-aware. The selected row shows a compact badge.
function accountDisplayName1439(account){
 const currency=String(account.currency||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return String(account.name||'').replace(new RegExp('\\s*\\('+currency+'\\)\\s*$','i'),'').replace(new RegExp('(?:\\s*[-—–·]\\s*|\\s+)'+currency+'$','i'),'').trim();
}
syncCoaDatalist = function() {
  const dl = document.getElementById('coaList');
  if (!dl) return;
  dl.innerHTML = '';
  AccountingStore.accounts.filter(acc=>acc.isPosting!==false).forEach(acc => {
    const opt = document.createElement('option');
    /* Include the account code in the selected value so identically named
       accounts in different currencies cannot resolve to the wrong badge. */
    opt.value = `${acc.code} — ${accountDisplayName1439(acc)}`;
    opt.textContent = `${currencySymbolV6(acc.currency)}  ${acc.currency} — ${acc.type}`;
    dl.appendChild(opt);
  });
};

function updateJournalAccountBadge(input) {
  if (!input) return;
  const account = getSelectedAccountInfo(input.value);
  const credit = input.closest('tr')?.querySelector('.je-line-cr');
  if (credit) credit.dataset.currency = account?.currency || '';
  const badge = input.closest('.account-input-wrap')?.querySelector('.currency-symbol-badge');
  input.dataset.accountCode = account?.code || '';
  input.dataset.accountCurrency = account?.currency || '';
  if (!badge) return;
  badge.dataset.currencyCode = account?.currency || '';
  badge.textContent = account ? currencySymbolV6(account.currency) : '¤';
  badge.title = account ? `${account.currency} — ${account.code}` : 'Select an account';
}

const addJournalLineRowV5 = addJournalLineRow;
addJournalLineRow = function(accountVal = '', memoVal = '', drVal = '', crMap = {}) {
  const tbody = document.getElementById('jeLinesBody');
  if (!tbody) return;
  const mainDate = document.getElementById('jeTransDate')?.value || '';
  const currencies = CurrencyStore.currencies || [];
  const account = getSelectedAccountInfo(accountVal);
  const cleanAccount = account
    ? `${account.code} — ${accountDisplayName1439(account)}`
    : String(accountVal || '').replace(/\s*\([A-Z]{3}\)$/, '').trim();
  const creditCurrency = account?.currency || Object.keys(crMap)[0] || '';
  const creditValue = crMap[creditCurrency] || '';
  const crInputs = `<td><input type="text" class="num je-line-cr" data-currency="${escapeHtml(creditCurrency)}" placeholder="0.00" value="${escapeHtml(String(creditValue))}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>`;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="je-date-col"><input type="date" class="je-line-date" value="${mainDate}" onclick="if(this.showPicker) this.showPicker();" onchange="calculateJournalBalance()"></td>
    <td><div class="account-input-wrap"><span class="currency-symbol-badge" data-currency-code="${account?.currency || ''}" title="${account?.currency || 'Select an account'}">${account ? currencySymbolV6(account.currency) : '¤'}</span><input type="text" class="je-line-acc" placeholder="Search account..." list="coaList" value="${escapeHtml(cleanAccount)}" oninput="updateJournalAccountBadge(this);calculateJournalBalance()" onchange="updateJournalAccountBadge(this);calculateJournalBalance()" /></div></td>
    <td><input type="text" class="je-line-memo" placeholder="Line note / reference..." value="${escapeHtml(String(memoVal))}" /></td>
    <td><input type="text" class="num je-line-dr" placeholder="0.00" value="${drVal}" onfocus="unformatNumber(this)" onblur="formatNumber(this)" oninput="calculateJournalBalance()" /></td>
    ${crInputs}
    <td class="action-col no-print" style="text-align:center"><button type="button" class="je-btn-del" style="width:22px;height:22px;font-size:11px" data-permission-action1440="edit" onclick="removeJournalLineRow(this)">✕</button></td>`;
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
    const date = (document.getElementById('jeMultipleDates')?.checked ? row.querySelector('.je-line-date')?.value : '') || document.getElementById('jeTransDate')?.value || '';
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
      grouped[date].lines.push({account,currency:account.currency,memo,debit,credit:0});
    }
    credits.forEach(c => {
      grouped[date].totals[c.currency] ||= {debit:0,credit:0};
      grouped[date].totals[c.currency].credit += c.value;
      grouped[date].lines.push({account,currency:c.currency,memo,debit:0,credit:c.value});
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
    const d=state.differences[0]; badge.className='je-status-badge unbalanced'; badge.textContent=`${d.date} ${currencySymbolV6(d.currency)} ${d.currency}: DR ${formatCompactAmount(d.debit)} / CR ${formatCompactAmount(d.credit)}`; if(postBtn)postBtn.disabled=true; return;
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
  overlay.querySelector('[data-cancel]').onclick=cancel;overlay.querySelector('[data-confirm]').onclick=confirm;overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)cancel()});
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
  switchTab(user.role==='admin'?'dashboard':'sub-users-workspace');
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
let passwordRecoveryMode = false;

function passwordRecoveryRedirectUrl(){
  const configured=String(window.OJM_PUBLIC_APP_URL||localStorage.getItem('ojm_public_app_url105')||'').trim();
  const url=new URL(configured||window.location.href);
  if(url.protocol!=='https:'||/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)||/\.(?:local|localhost)$/i.test(url.hostname)||/(?:stackblitz|webcontainer|codesandbox)/i.test(url.hostname)){
    throw new Error('Open the published HTTPS app to request a password reset, or set OJM_PUBLIC_APP_URL to its published address. Preview and local links cannot be used in email.');
  }
  url.username='';url.password='';url.hash='';url.search='';url.searchParams.set('password-recovery','1');return url.toString();
}
function showPasswordRecoveryForm(message='Choose a new password for this account.'){
  passwordRecoveryMode=true;document.getElementById('loginGate')?.classList.remove('is-authenticated');const login=document.getElementById('loginForm'),form=document.getElementById('passwordRecoveryForm'),status=document.getElementById('recoveryPasswordStatus');if(login)login.hidden=true;if(form)form.hidden=false;if(status){status.textContent=message;status.classList.remove('recovery-success')}requestAnimationFrame(()=>document.getElementById('recoveryPassword')?.focus())
}
function showLoginForm(message=''){
  passwordRecoveryMode=false;const login=document.getElementById('loginForm'),form=document.getElementById('passwordRecoveryForm'),error=document.getElementById('loginError'),password=document.getElementById('recoveryPassword'),confirmPassword=document.getElementById('recoveryPasswordConfirm');if(login)login.hidden=false;if(form)form.hidden=true;if(error)error.textContent=message;if(password)password.value='';if(confirmPassword)confirmPassword.value='';requestAnimationFrame(()=>document.getElementById('loginEmail')?.focus())
}
async function requestPasswordReset(){
 const emailInput=document.getElementById('loginEmail'),email=emailInput?.value.trim(),error=document.getElementById('loginError');if(!email||!emailInput.checkValidity()){error.textContent='Enter a valid email address first.';emailInput.focus();return}if(!ojmDb){error.textContent='Authentication is still loading. Try again in a moment.';return}const button=document.querySelector('[onclick="requestPasswordReset()"]');if(button.disabled)return;button.disabled=true;
 try{let options={};try{options.redirectTo=passwordRecoveryRedirectUrl()}catch(e){if(location.protocol!=='file:')throw e}error.textContent='Requesting password recovery…';const result=await ojmDb.auth.resetPasswordForEmail(email,options);if(result.error)throw result.error;error.textContent='If this account exists, check its recovery email. Open the recovery link on the published app, or enter the email’s recovery code below.';window.showRecoveryCode109?.(email)}catch(e){error.textContent=e.message||'Recovery could not be requested. Try again.'}finally{button.disabled=false}
}
async function saveRecoveredPassword(event){
 event.preventDefault();const form=document.getElementById('passwordRecoveryForm'),button=form.querySelector('[type=submit]'),status=document.getElementById('recoveryPasswordStatus');
 const password=document.getElementById('recoveryPassword').value,confirmation=document.getElementById('recoveryPasswordConfirm').value;
 if(password.length<8){status.textContent='Use at least 8 characters.';return}if(password!==confirmation){status.textContent='The two passwords do not match.';return}if(button.disabled)return;
 button.disabled=true;status.textContent='Updating password…';
 try{
  if(!ojmDb)throw Error('Authentication is unavailable. Reload this recovery link.');
  const sessionResult=await ojmDb.auth.getSession();if(sessionResult.error)throw sessionResult.error;
  if(!sessionResult.data?.session)throw Error('This link has expired or has already been used. Return to Sign In and request a new password-reset email.');
  const {error}=await ojmDb.auth.updateUser({password});if(error)throw error;
  // Erase credentials immediately and finish at Sign In only after the update succeeds.
  form.reset();history.replaceState({},document.title,location.pathname);
  const signedOut=await ojmDb.auth.signOut({scope:'local'});if(signedOut?.error){status.textContent='Password updated. Close this page and sign in again with your new password.';return}
  showLoginForm('Password updated. Sign in with your new password.');
 }catch(error){status.textContent=error.message||'Connection interrupted. Please retry; your password change has not been confirmed.'}finally{button.disabled=false}
}
async function cancelPasswordRecovery(){if(ojmDb)await ojmDb.auth.signOut();history.replaceState({},document.title,location.pathname);showLoginForm()}

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
  AccountingStore.accounts=(accounts||[]).map(a=>({id:a.id,code:a.code,name:a.name,currency:a.currency_code,displayCurrency:a.currency_label||a.currency_code,baseType:a.account_type,type:a.is_technical?'SYSTEM':a.account_type,purpose:a.account_purpose||'regular',desc:a.description||'',parentCode:a.parent_code||'',isPosting:a.is_posting!==false,isTechnical:a.is_technical===true}));
  AccountingStore.subAccounts=(subs||[]).map(s=>({id:s.id,parentId:s.parent_account_id,parentCode:AccountingStore.accounts.find(a=>a.id===s.parent_account_id)?.code||'',currency:s.currency_code||AccountingStore.accounts.find(a=>a.id===s.parent_account_id)?.currency||'',code:s.code,name:s.name,desc:s.description||''}));
  CurrencyStore.render(); refreshSettingsCurrencyOptions(); renderChartOfAccountsTable(); renderSubAccountsTable(); setupJournalColumns();
}

CurrencyStore.add = async function(code,name,symbol){
  const clean=String(code||'').toUpperCase().replace(/[^A-Z]/g,'').trim();
  const cleanName=String(name||'').trim(),cleanSymbol=String(symbol||'').trim();
  if(!/^[A-Z]{3}$/.test(clean)){
    showAppNotification('Currency Code Required','Use exactly three letters, such as LAK, USD, THB, EUR, or CNY.',true);
    document.getElementById('newCurrencyCode')?.focus();return false
  }
  if(!cleanName){showAppNotification('Currency Name Required','Enter the full currency name before saving.',true);document.getElementById('newCurrencyName')?.focus();return false}
  if((CurrencyStore.currencies||[]).some(item=>String(item.code).toUpperCase()===clean)){
    showAppNotification('Currency Already Exists',`${clean} is already available in Currency Manager.`,true);return false
  }
  const{error}=await ojmDb.from('currencies').insert({code:clean,name:cleanName,symbol:cleanSymbol||clean,is_base:false});
  if(error){
    const constraint=String(error.message||'').includes('currencies_code_check');
    showAppNotification('Currency Save Failed',constraint?'The currency code must contain exactly three letters.':error.message,true);return false
  }
  await loadReferenceDataFromSupabase();showAppNotification('Currency Saved',`${clean} is now available to accounts and transactions.`,false);return true
};
CurrencyStore.edit = async function(code){const current=this.currencies.find(c=>c.code===code);if(!current)return;const name=await ui117.prompt(`Currency name for ${code}:`,current.name);if(name===null)return;const symbol=await ui117.prompt(`Symbol for ${code}:`,current.symbol);if(symbol===null)return;const{error}=await ojmDb.from('currencies').update({name:name.trim(),symbol:symbol.trim()}).eq('code',code);if(error){showAppNotification('Currency Update Failed',error.message,true);return}await loadReferenceDataFromSupabase()};
CurrencyStore.remove = async function(code){if(!await ui117.confirm(`Remove currency ${code}?`))return;const{error}=await ojmDb.from('currencies').delete().eq('code',code);if(error){showAppNotification('Currency Delete Failed','The currency may still be linked to accounts or transactions.',true);return}await loadReferenceDataFromSupabase()};

handleAccountFormSubmit = async function(event){event.preventDefault();const purpose=document.getElementById('accPurpose71');if(!purpose.value||(purpose.dataset.systemOnly==='true'&&purpose.value==='regular')){purpose.reportValidity();return}const original=document.getElementById('accountOrigCode').value;const payload={code:document.getElementById('accCode').value.trim(),name:document.getElementById('accName').value.trim(),currency_code:document.getElementById('accCurrency').value,account_type:document.getElementById('accType').value,description:document.getElementById('accDesc').value.trim(),account_purpose:document.getElementById('accPurpose71').value,created_by:liveProfile.id};const existing=AccountingStore.accounts.find(a=>a.code===original);const parent=payload.currency_code==='__PARENT__';payload.is_posting=!parent;payload.currency_label=parent?'—':payload.currency_code;if(parent){payload.currency_code=existing?.currency||CurrencyStore.currencies[0]?.code;if(!payload.currency_code){showAppNotification('Currency Required','Add at least one currency in Settings before creating an account.',true);return}if(existing?.id){const used=await ojmDb.from('journal_lines').select('id').eq('account_id',existing.id).limit(1);if(used.error){showAppNotification('Account Check Failed',used.error.message,true);return}if(used.data?.length){showAppNotification('Account Has Transactions','Keep this account as a posting account. Create a separate parent account for grouping.',true);return}}}if(existing?.isTechnical)payload.account_type=existing.baseType||'EQUITY';const query=existing?ojmDb.from('accounts').update(payload).eq('id',existing.id):ojmDb.from('accounts').insert(payload);const{error}=await query;if(error){showAppNotification('Account Save Failed',String(error.message).includes('account_purpose')?'Read setup/SETUP-GUIDE-v142.20.txt for the required existing database setup.':error.message,true);return}closeModal('modalAccount');await loadReferenceDataFromSupabase()};
promptDeleteAccount = function(code){const acc=AccountingStore.accounts.find(a=>a.code===code);if(!acc)return;document.getElementById('confirmDeletePrompt').innerText=`Delete account “${acc.code} — ${acc.name}”? Linked sub-accounts will also be deleted.`;openModal('modalConfirmDelete');document.getElementById('btnDeleteConfirmAction').onclick=async()=>{const{error}=await ojmDb.from('accounts').delete().eq('id',acc.id);if(error){showAppNotification('Account Delete Failed','Posted journal lines may protect this account from deletion. Deactivate it instead.',true);return}closeModal('modalConfirmDelete');await loadReferenceDataFromSupabase()}};
handleSubAccountFormSubmit = async function(event){
  event.preventDefault();
  const form=document.getElementById('formSubAccount');
  const original=document.getElementById('subAccountOrigCode').value;
  const parent=AccountingStore.accounts.find(a=>a.code===document.getElementById('subParentCode').value);
  if(!parent||parent.isPosting!==false){showCenterStatus('Choose a parent grouping account from the Chart of Accounts.',true);return}
  const currency=document.getElementById('subCurrency').value;
  if(!CurrencyStore.currencies.some(c=>c.code===currency&&c.active!==false)){
    showCenterStatus('Choose an active currency from Currency Settings.',true);return;
  }
  const payload={parent_account_id:parent.id,currency_code:currency,code:document.getElementById('subCode').value.trim(),name:document.getElementById('subName').value.trim(),description:document.getElementById('subDesc').value.trim()};
  if(!payload.code||!payload.name){showCenterStatus('Enter a sub-account code and name.',true);return}
  const existing=AccountingStore.subAccounts.find(s=>s.code===original);
  const button=form.querySelector('[type=submit]');
  if(button.disabled)return;
  button.disabled=true;
  try{
    const query=existing?ojmDb.from('sub_accounts').update(payload).eq('id',existing.id):ojmDb.from('sub_accounts').insert(payload);
    const {error}=await query;
    if(error)throw error;
    closeModal('modalSubAccount');
    await loadReferenceDataFromSupabase();
  }catch(error){
    const message=/currency_code/i.test(error.message||'')&&['PGRST204','42703'].includes(error.code)
      ?'Run setup/INSTALL-SUBACCOUNT-CURRENCY-v142.16.sql once in Supabase, then save again.'
      :error.message||'The sub-account could not be saved.';
    showAppNotification('Sub-Account Save Failed',message,true);
  }finally{button.disabled=false}
};
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
  const {error}=await ojmDb.from('business_settings').upsert(payload); if(error){showAppNotification('Save Failed',error.message,true);return false}
  BusinessSettings.current=v;AccountingStore.companyName=v.companyName;renderBusinessIdentity(v,true);syncEntrySequence();updateNextEntryIdDisplay();
  const status=document.getElementById('businessSettingsStatus');if(status){status.textContent=`Saved ${new Date().toLocaleString()} to Supabase.`;status.classList.add('is-save-confirmation')}
  return true;
};

async function loadJournalFromSupabase() {
  const entries=[];
  for(let offset=0;;offset+=500){
    const {data,error}=await ojmDb.from('journal_entries').select('id,entry_no,created_at,transaction_date,memo,status,source,journal_lines(line_no,description,currency_code,debit,credit,line_date,accounts(id,name,code))').eq('status','posted').order('transaction_date',{ascending:false}).order('id').range(offset,offset+499);
    if(error)throw new Error(error.message);
    (data||[]).forEach(entry=>(entry.journal_lines||[]).filter(Boolean).sort((a,b)=>a.line_no-b.line_no).forEach(line=>entries.push({created_at:entry.created_at,source:entry.source,scheduleId:String(entry.source||'').startsWith('scheduled:')?String(entry.source).slice(10):null,dbEntryId:entry.id,id:entry.entry_no||entry.id,date:line.line_date||entry.transaction_date,account:line.accounts?.name||'Unknown Account',accountId:line.accounts?.id,accountCode:line.accounts?.code,currency:line.currency_code,memo:line.description||entry.memo||'',generalMemo:entry.memo||'',debit:Number(line.debit),credit:Number(line.credit),editReason:'',archived:false})));
    if(!data||data.length<500)break;
  }
  JournalModule.entries=entries;syncEntrySequence();updateNextEntryIdDisplay();refreshAllTables();
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
  if(groups.length>1||window.journalBatch1440?.hasPending())return window.journalBatch1440.post(groups);
  for(const [date,g] of groups){
    const memo=document.getElementById('jeGeneralMemo').value.trim(),prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6));
    const lines=g.lines.map(line=>({account_id:line.account?.id||null,description:line.memo,currency_code:line.currency,debit:Number(line.debit||0),credit:Number(line.credit||0)}));
    if(lines.some(line=>!line.account_id)){showAppNotification('Posting Failed','One or more journal lines has no database account ID. Reselect the account and try again.',true);return}
    const editor=document.getElementById('journalEntry98');editor._postingRequest14228||=crypto.randomUUID();const {error}=await ojmDb.rpc('post_manual_journal14228',{p_request_key:editor._postingRequest14228,p_transaction_date:date,p_memo:memo,p_lines:lines,p_prefix:prefix,p_digits:digits});
    if(error){showAppNotification('Posting Failed',error.message,true);return}
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
  if(decision==='rejected'){const reason=await ui117.prompt('Reason for rejection:');if(!reason)return;const{error}=await ojmDb.rpc('reject_entry_submission',{p_submission_id:id,p_reason:reason});if(error){showAppNotification('Reject Failed',error.message,true);return}}
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
deleteLegalDocument = async function(id){if(!await ui117.confirm('Delete this legal document permanently?'))return;const doc=liveLegalDocuments.find(d=>d.id===id);if(!doc)return;await ojmDb.storage.from('legal-documents').remove([doc.storage_path]);const{error}=await ojmDb.from('legal_documents').delete().eq('id',id);if(error){showAppNotification('Delete Failed',error.message,true);return}await loadLegalDocumentsFromSupabase()};

async function hydrateSupabaseSession(session) {
  const epoch=sessionEpoch1430;
  const checkSession=()=>{if(epoch!==sessionEpoch1430)throw new Error('Session changed while loading.');};
  try {
    await loadLiveProfile(session.user);checkSession();
    await loadCurrentPermissions();checkSession();
    document.body.classList.add('startup-pending1443');
    applyLiveRoleAccess();window.releaseLogin1443?.();
    // Paint the permitted shell before restoring the destination and loading its data.
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));checkSession();
    if(typeof restoreStartup88==='function')restoreStartup88();
    checkSession();
    if(window.startupData1443)await startupData1443(checkSession);
    else {const referenceReady=loadReferenceDataFromSupabase();await Promise.all([referenceReady.then(()=>loadJournalFromSupabase()),loadBusinessSettingsFromSupabase(),loadSubmissionsFromSupabase(),loadProfilesFromSupabase(),loadLegalDocumentsFromSupabase()]);}
    checkSession();
    // Session location is restored once by interface-v69.js.
    freshLoginRequested=false;
  } catch(error) { if(epoch!==sessionEpoch1430)return;liveProfile=null;livePermission=null;DemoAccess.currentUser=null;document.getElementById('loginGate')?.classList.remove('is-authenticated');const box=document.getElementById('loginError');if(box&&epoch===sessionEpoch1430)box.textContent=error.message; }
}

// One complete hydration per authenticated identity, including extension wrappers.
let sessionLoad1430=null, sessionReady1430='', sessionEpoch1430=0;
function resetSessionLoad1430(){sessionEpoch1430++;sessionReady1430='';}
function startSessionLoad1430(session){
 const id=session?.user?.id;if(!id||passwordRecoveryMode)return Promise.resolve();
 if(sessionLoad1430){
  if(sessionLoad1430.id===id)return sessionLoad1430.promise;
  return sessionLoad1430.promise.then(()=>startSessionLoad1430(session));
 }
 if(sessionReady1430===id&&document.getElementById('loginGate')?.classList.contains('is-authenticated'))return Promise.resolve();
 const epoch=sessionEpoch1430,job={id,promise:null};
 sessionLoad1430=job;
 job.promise=Promise.resolve().then(()=>hydrateSupabaseSession(session)).then(()=>{
  if(epoch===sessionEpoch1430&&liveProfile?.id===id&&document.getElementById('loginGate')?.classList.contains('is-authenticated'))sessionReady1430=id;
 }).catch(error=>{
  if(epoch===sessionEpoch1430){document.getElementById('loginGate')?.classList.remove('is-authenticated');const box=document.getElementById('loginError');if(box)box.textContent=error.message||'Unable to load your account. Please sign in again.';}
 }).finally(()=>{if(sessionLoad1430===job)sessionLoad1430=null;});
 return job.promise;
}

async function initializeSupabaseApp() {
  const errorBox=document.getElementById('loginError');
  if(!window.supabase||!window.OJM_SUPABASE_URL||!window.OJM_SUPABASE_ANON_KEY){if(errorBox)errorBox.textContent='Supabase configuration could not be loaded.';document.documentElement.classList.remove('session-checking1444');return}
  ojmDb=window.supabase.createClient(window.OJM_SUPABASE_URL,window.OJM_SUPABASE_ANON_KEY,{global:{fetch:(...args)=>window.fetch(...args)}});
  const query105=new URLSearchParams(location.search),hash105=new URLSearchParams(location.hash.slice(1));
  const recoveryHint=query105.has('password-recovery')||query105.get('type')==='recovery'||hash105.get('type')==='recovery'||query105.has('error_description')||hash105.has('error_description');passwordRecoveryMode=recoveryHint;
  const recoveryError105=query105.get('error_description')||hash105.get('error_description');
  if(recoveryHint)showPasswordRecoveryForm('Opening the secure recovery session…');
  ojmDb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){showPasswordRecoveryForm();const button=document.querySelector('#passwordRecoveryForm [type=submit]');if(button)button.disabled=false;return}
    if(event==='SIGNED_IN'&&session&&!passwordRecoveryMode)setTimeout(()=>startSessionLoad1430(session),0);
    if(event==='SIGNED_OUT'){window.invalidateRequests1430?.();resetSessionLoad1430();liveProfile=null;DemoAccess.currentUser=null;const error=document.getElementById('loginError');if(error&&!passwordRecoveryMode)error.textContent='';document.getElementById('loginGate')?.classList.remove('is-authenticated')}
  });
  // Handle custom recovery templates with token_hash as well as SDK-managed implicit/PKCE links.
  try{
   if(recoveryError105)throw Error(recoveryError105+'. Request a new password-reset email from Sign In.');
   if(query105.get('type')==='recovery'&&query105.has('token_hash')){
    const result=await ojmDb.auth.verifyOtp({token_hash:query105.get('token_hash'),type:'recovery'});if(result.error)throw result.error;
    history.replaceState({},document.title,location.pathname+'?password-recovery=1');
   }
   const {data:{session},error}=await ojmDb.auth.getSession();if(error)throw error;
   if(recoveryHint||passwordRecoveryMode){
    showPasswordRecoveryForm(session?'Choose a new password for this account.':'This recovery link is invalid, expired, or already used. Return to Sign In and request a new email.');
    const button=document.querySelector('#passwordRecoveryForm [type=submit]');if(button)button.disabled=!session;return;
   }
   if(session)await startSessionLoad1430(session);
  }catch(error){
   if(recoveryHint||passwordRecoveryMode){showPasswordRecoveryForm(error.message||'The recovery link could not be verified. Request a new email.');const button=document.querySelector('#passwordRecoveryForm [type=submit]');if(button)button.disabled=true}
   else if(errorBox)errorBox.textContent=error.message||'Unable to connect. Please reload.';
  }finally{document.documentElement.classList.remove('session-checking1444')}
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
function setupPeriodSelector(month=PeriodReview.selectedMonth){const input=document.getElementById('periodReviewMonth105');if(input&&input.value!==month){input.value=month;input.dispatchEvent(new Event('input',{bubbles:true}))}}
function renderPeriodReview(){
  const month=PeriodReview.selectedMonth,rows=periodEntries(month),ids=[...new Set(rows.map(row=>row.id))],findings=PeriodReview.findings.filter(item=>item.month===month),status=PeriodReview.status(month);
  const setText=(id,value)=>{const node=document.getElementById(id);if(node)node.textContent=value};
  setupPeriodSelector(month);
  setText('periodReviewStatus',status.toUpperCase());setText('periodReviewEntries',ids.length);
  setText('periodReviewDebits',formatAppNumber(rows.reduce((sum,row)=>sum+Number(row.debit||0),0)));
  setText('periodReviewCredits',formatAppNumber(rows.reduce((sum,row)=>sum+Number(row.credit||0),0)));
  setText('periodReviewOpenFindings',findings.filter(item=>!['corrected','closed'].includes(item.status)).length);
  setText('periodClosingMessage',status==='open'?'Open periods accept normal postings.':status==='review'?'The period is under review.':status==='closed'?'Normal postings are blocked. Approved adjustments remain available.':'This period is locked and final. Add a review; post corrections in an open period.');
  const statusNode=document.getElementById('periodReviewStatus');if(statusNode)statusNode.dataset.status=status;
  const reviewRoot=document.getElementById('period-review'),unavailable=document.getElementById('periodReviewUnavailable');
  if(reviewRoot)reviewRoot.classList.toggle('period-review-open',status==='open');
  if(unavailable)unavailable.hidden=status!=='open';
  
  const transactionSelect=document.getElementById('findingTransactionId');if(transactionSelect)transactionSelect.innerHTML='<option value="">General period finding</option>'+ids.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(id)}</option>`).join('');
  const tbody=document.getElementById('periodTransactionsBody');
  if(tbody){
    const grouped=rows.reduce((all,row)=>{(all[row.id]||(all[row.id]=[])).push(row);return all},{});
    tbody.innerHTML=ids.length?ids.map(id=>{
      const lines=grouped[id],first=lines[0],adjusted=isAdjustedTransaction(lines),dbId=first.dbEntryId||'',linked=findings.filter(item=>item.transactionId===id);
      let transactionRows=lines.map((row,index)=>{
        const account=getCleanAccountDisplay(row.account,row.currency);
        const rowClass=lines.length===1?'cluster-row-start cluster-row-end':index===0?'cluster-row-start':index===lines.length-1?'cluster-row-cont cluster-row-end':'cluster-row-cont';
        return `<tr class="${rowClass}" data-created-at="${escapeHtml(first.created_at||first.createdAt||first.date||'')}" data-entry-id="${escapeHtml(id)}" data-line-index="${index}">${index===0?`<td rowspan="${lines.length}" class="entry-shared-cell">${formatAppDate(first.date)}</td><td rowspan="${lines.length}" class="entry-shared-cell"><div class="entry-id-stack"><span style="font-family:monospace;color:#065f46">${escapeHtml(id)}</span>${adjusted?`<button type="button" class="adjusted-entry-badge adjusted-entry-button" onclick="event.stopPropagation();openAdjustedDetails('${escapeHtml(id)}')">Adjusted</button>`:''}</div></td>`:''}<td><div class="transaction-account-display"><span class="currency-symbol-badge">${currencySymbolV6(account.currency)}</span><span class="account-clean-name">${escapeHtml(account.name)}</span></div></td><td>${escapeHtml(row.memo||'')}</td><td class="num">${formatAppNumber(row.debit)}</td><td class="num">${formatAppNumber(row.credit)}</td>${index===0?`<td rowspan="${lines.length}" class="action-col entry-shared-cell"><div class="transaction-review-actions"><button class="je-btn je-btn-secondary" onclick="reviewPeriodTransaction('${escapeHtml(id)}')">Review</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}</div></td>`:''}</tr>`;
      }).join('');
      if(linked.length)transactionRows=transactionRows.replaceAll('cluster-row-end','');
      const findingRows=linked.map((item,i)=>`<tr class="period-linked-finding ${i===linked.length-1?'cluster-row-end':''}"><td colspan="7"><span class="finding-status ${item.status}">${escapeHtml(item.status==='corrected'?'ADJUSTED':item.status.toUpperCase())}</span><strong>${escapeHtml(item.number)}</strong> — ${escapeHtml(item.description)}<small>${escapeHtml(item.createdByName||item.createdBy||'Reviewer')} · ${escapeHtml(item.createdAt||'')}</small>${findingActions69(item)}</td></tr>`).join('');return transactionRows+findingRows;
    }).join(''):'<tr><td colspan="7" class="period-empty">No transactions in this period.</td></tr>';
  }
  const host=document.getElementById('periodFindingsList');if(host){host.classList.toggle('is-empty',!findings.length);host.innerHTML=findings.length?findings.map(item=>`<article class="period-finding-row"><div class="period-finding-main"><div class="period-finding-heading"><strong class="period-finding-number">${escapeHtml(item.number)}</strong><span class="finding-status ${item.status}">${escapeHtml(item.status.toUpperCase())}</span><small><span class="finding-classification">${escapeHtml(item.type.replaceAll('-',' '))}</span>${item.transactionId?` • ${escapeHtml(item.transactionId)}`:''}</small></div><p>${escapeHtml(item.description)}</p></div><div class="period-finding-actions">${item.status==='open'?`<button class="je-btn je-btn-emerald" onclick="startFindingAdjustment('${item.id}')">Create Adjustment</button><button class="je-btn je-btn-secondary" onclick="closeFinding('${item.id}')">Close Without Adjustment</button>`:item.adjustmentEntryId?`<span class="finding-adjustment-link">${escapeHtml(item.adjustmentEntryId)}</span>`:''}</div></article>`).join(''):'<span class="period-empty">No findings recorded for this period.</span>';}
}
function openPeriodFindingForm(){const form=document.getElementById('periodFindingForm');if(form)form.hidden=false}
function reviewPeriodTransaction(entryId){openPeriodFindingForm();const select=document.getElementById('findingTransactionId'),description=document.getElementById('findingDescription');if(select)select.value=entryId;if(description){description.value='';description.focus()}document.getElementById('periodFindingForm')?.scrollIntoView({behavior:'smooth',block:'center'})}
function closePeriodFindingForm(){const form=document.getElementById('periodFindingForm');if(form){form.reset();form.hidden=false}}
function savePeriodFinding(event){event.preventDefault();const month=PeriodReview.selectedMonth,count=PeriodReview.findings.filter(item=>item.month===month).length+1;PeriodReview.findings.push({id:`finding-${Date.now()}`,number:`F-${month.replace('-','')}-${String(count).padStart(3,'0')}`,month,transactionId:document.getElementById('findingTransactionId').value,type:document.getElementById('findingType').value,description:document.getElementById('findingDescription').value.trim(),status:'open',createdAt:new Date().toISOString(),createdBy:liveProfile?.id||DemoAccess.currentUser?.id||'local',createdByName:liveProfile?.full_name||liveProfile?.email||DemoAccess.currentUser?.name||'Local user',adjustmentEntryId:''});PeriodReview.save();closePeriodFindingForm();renderPeriodReview()}
function closeFinding(id){const finding=PeriodReview.findings.find(item=>item.id===id);if(!finding)return;finding.status='closed';finding.closedAt=new Date().toISOString();PeriodReview.save();renderPeriodReview()}
function startFindingAdjustment(id){const finding=PeriodReview.findings.find(item=>item.id===id);if(!finding)return;if(PeriodReview.status(finding.month)==='locked'){showAppNotification('Period Locked','Reopen the period before preparing an adjustment.',true);return}JournalModule.editingEntryId=null;JournalModule.pendingLines=null;resetJournalLinesForm();document.getElementById('jeGeneralMemo').value='';PeriodReview.pendingAdjustment={findingId:id,knownIds:[...new Set(JournalModule.entries.map(row=>row.id))],oldData:finding.transactionId?JournalModule.entries.filter(row=>row.id===finding.transactionId).map(row=>({...row})):[]};switchTab('journal');const date=document.getElementById('jeTransDate');if(date)date.value=`${finding.month}-01`;const memo=document.getElementById('jeGeneralMemo');if(memo)memo.value=`Adjustment ${finding.number}: ${finding.description}`;updateNextEntryIdDisplay();showAppNotification('Adjustment Prepared','The unfinished journal form was cleared. Complete and post the balanced adjustment.',false)}
function changePeriodStatus(nextStatus, targetMonth=PeriodReview.selectedMonth){const month=targetMonth,current=PeriodReview.status(month),openFindings=PeriodReview.findings.filter(item=>item.month===month&&!['corrected','closed'].includes(item.status)).length;if(nextStatus==='closed'&&openFindings){showAppNotification('Open Findings',`Resolve or close ${openFindings} finding(s) before closing this period.`,true);return}if(nextStatus==='locked'&&current!=='closed'){showAppNotification('Close Period First','A period must be closed before it can be locked.',true);return}PeriodReview.periods[month]={...(PeriodReview.periods[month]||{}),status:nextStatus,updatedAt:new Date().toISOString(),updatedBy:liveProfile?.id||DemoAccess.currentUser?.id||'local'};JournalModule.entries.forEach(row=>{if(String(row.date).slice(0,7)!==month)return;if(nextStatus==='open'){row.archived=false;delete row.archivedAt}else if(['closed','locked'].includes(nextStatus)){row.archived=true;row.archivedAt=new Date().toISOString().slice(0,10)}});PeriodReview.save();refreshAllTables();renderPeriodReview()}
function postingPeriodKeys(){if(document.getElementById('jeMultipleDates')?.checked)return[...new Set([...document.querySelectorAll('.je-line-date')].map(input=>input.value.slice(0,7)).filter(Boolean))];const date=document.getElementById('jeTransDate')?.value||'';return date?[date.slice(0,7)]:[]}
const submitJournalEntryBeforePeriodRules=submitJournalEntry;
submitJournalEntry=async function(...args){for(const month of postingPeriodKeys()){const status=PeriodReview.status(month),adjustment=PeriodReview.pendingAdjustment&&PeriodReview.findings.find(item=>item.id===PeriodReview.pendingAdjustment.findingId)?.month===month;if(status!=='open'){showAppNotification('Period Protected',status==='locked'?'This accounting period is locked.':'This month has been submitted for review. Use an approved finding to post an adjustment.',true);return}}return submitJournalEntryBeforePeriodRules.apply(this,args)};
const finalizePostSuccessBeforePeriodReview=finalizePostSuccess;
finalizePostSuccess=function(...args){finalizePostSuccessBeforePeriodReview.apply(this,args);const pending=PeriodReview.pendingAdjustment;if(!pending)return;const finding=PeriodReview.findings.find(item=>item.id===pending.findingId);if(!finding)return;const newIds=[...new Set(JournalModule.entries.map(row=>row.id))].filter(id=>!pending.knownIds.includes(id)),adjustmentId=newIds[0]||'Posted adjustment';finding.status='corrected';finding.adjustmentEntryId=adjustmentId;finding.correctedAt=new Date().toISOString();finding.auditRecord={periodFindingId:finding.id,id:adjustmentId,timestamp:new Date().toLocaleString(),explanation:`${finding.number}: ${finding.description}`,oldData:pending.oldData,newData:JournalModule.entries.filter(row=>newIds.includes(row.id)).map(row=>({...row}))};JournalModule.voidedEntries.unshift(finding.auditRecord);PeriodReview.pendingAdjustment=null;PeriodReview.save();renderPeriodReview();renderVoidedTransactionsTable()};
const switchTabBeforePeriodReview= switchTab;
switchTab=function(tabId){switchTabBeforePeriodReview(tabId);if(tabId==='period-review')renderPeriodReview()};
PeriodReview.load();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPeriodReview,{once:true});else renderPeriodReview();

// USER HIERARCHY, MODULE PERMISSIONS, AND ADMIN REVIEW
const PERMISSION_MODULES=[['dashboard','Dashboard'],['submissions','Entry Submissions'],['transactions','Transactions'],['sub-users','Sub-Users & Entry Review'],['accounts','Accounts'],['payroll','Payroll'],['reports','Reports'],['tax-sso','Tax and SSO'],['settings','Settings']];
let livePermission=null;
async function loadCurrentPermissions(){
  if(!liveProfile)return;
  if(liveProfile.role==='admin'){livePermission={user_type:'admin',modules:PERMISSION_MODULES.map(item=>item[0]),can_approve:true,can_post_directly:true,can_void:true,can_export:true};return}
  const{data,error}=await ojmDb.from('user_permissions').select('*').eq('user_id',liveProfile.id).maybeSingle();
  if(error)throw new Error('Could not load this account’s permissions: '+error.message);
  livePermission=data||{user_type:'sub_user',modules:['submissions'],can_approve:false,can_post_directly:false,can_void:false,can_export:false};
}
function applyPermissionAccess(){
  if(!livePermission)return;
  document.querySelectorAll('.nav-category').forEach(category=>{const module=category.dataset.module;category.hidden=!livePermission.modules.includes(module)});
  const subUsersNav=document.getElementById('nav-module-sub-users');if(subUsersNav)subUsersNav.hidden=!livePermission.modules.includes('sub-users')&&!livePermission.can_approve;
  const post=document.getElementById('btnPostJournal');if(post)post.hidden=!livePermission.can_post_directly;
}
function renderPermissionGrid(selected=[]){const host=document.getElementById('userPermissionGrid');if(host)host.innerHTML=PERMISSION_MODULES.map(([id,label])=>`<label class="permission-option"><input type="checkbox" value="${id}" ${selected.includes(id)?'checked':''}><span>${label}</span></label>`).join('')}
function populateUserManagerOptions(selected=''){const select=document.getElementById('userAccessManager');if(!select)return;select.innerHTML='<option value="">Primary administrator</option>'+liveProfiles.filter(user=>user.role==='admin'||user.user_permissions?.user_type==='manager').map(user=>`<option value="${user.id}">${escapeHtml(user.full_name||user.email)}</option>`).join('');select.value=selected||''}
function openUserAccessEditor(id=''){
  const user=liveProfiles.find(item=>item.id===id),permission=user?.user_permissions||null;
  document.getElementById('userAccessModalTitle').textContent=user?'Edit User Access':'Add Sub-user';document.getElementById('userAccessId').value=user?.id||'';document.getElementById('userAccessName').value=user?.full_name||'';document.getElementById('userAccessEmail').value=user?.email||'';document.getElementById('userAccessEmail').disabled=Boolean(user);document.getElementById('userAccessPassword').value='';document.getElementById('userAccessPassword').required=!user;document.getElementById('userAccessType').value=permission?.user_type||(user?.role==='admin'?'admin':'sub_user');document.getElementById('userAccessJob').value=permission?.job_title||'';populateUserManagerOptions(permission?.manager_id||'');renderPermissionGrid(permission?.modules||(user?.role==='admin'?PERMISSION_MODULES.map(item=>item[0]):['sub-users']));document.getElementById('permissionApprove').checked=Boolean(permission?.can_approve||user?.role==='admin');document.getElementById('permissionDirectPost').checked=Boolean(permission?.can_post_directly||user?.role==='admin');document.getElementById('permissionVoid').checked=Boolean(permission?.can_void||user?.role==='admin');document.getElementById('permissionExport').checked=Boolean(permission?.can_export||user?.role==='admin');document.getElementById('permissionManageData').checked=Boolean(permission?.can_manage_data||user?.role==='admin');document.getElementById('userAccessStatus').textContent='';openModal('modalUserAccess')
}
async function saveUserAccess(event){
  event.preventDefault();const id=document.getElementById('userAccessId').value,status=document.getElementById('userAccessStatus'),payload={full_name:document.getElementById('userAccessName').value.trim(),email:document.getElementById('userAccessEmail').value.trim(),password:document.getElementById('userAccessPassword').value,user_type:document.getElementById('userAccessType').value,manager_id:document.getElementById('userAccessManager').value||null,job_title:document.getElementById('userAccessJob').value.trim(),modules:window.access113?access113.editorModules():[...document.querySelectorAll('#userPermissionGrid input:checked')].map(input=>input.value),can_approve:document.getElementById('permissionApprove').checked,can_post_directly:document.getElementById('permissionDirectPost').checked,can_void:document.getElementById('permissionVoid').checked,can_export:document.getElementById('permissionExport').checked,can_manage_data:document.getElementById('permissionManageData').checked};
  if(!id){const{data,error}=await ojmDb.functions.invoke('admin-create-user',{body:payload});if(error){status.textContent=`User creation requires the supplied admin-create-user Edge Function: ${error.message}`;return}payload.user_id=data.user_id}else payload.user_id=id;
  const role=payload.user_type==='admin'?'admin':'submitter';await ojmDb.from('profiles').update({full_name:payload.full_name,role}).eq('id',payload.user_id);const{error}=await ojmDb.from('user_permissions').upsert({user_id:payload.user_id,user_type:payload.user_type,manager_id:payload.manager_id,job_title:payload.job_title,modules:payload.modules,can_approve:payload.can_approve,can_post_directly:payload.can_post_directly,can_void:payload.can_void,can_export:payload.can_export,can_manage_data:payload.can_manage_data,updated_by:liveProfile.id,updated_at:new Date().toISOString()});if(error){status.textContent=error.message;return}closeModal('modalUserAccess');await loadProfilesFromSupabase();showAppNotification('User Saved','Login access, account assignments, and permissions were updated.',false)
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
renderDemoUsers=function(){const host=document.getElementById('demoUsersList');if(!host)return;host.innerHTML=liveProfiles.length?liveProfiles.map(user=>{const permission=user.user_permissions;return`<div class="demo-user-row"><div class="demo-user-avatar">${escapeHtml((user.full_name||user.email).slice(0,2).toUpperCase())}</div><div class="demo-user-details"><strong>${escapeHtml(user.full_name||'Unnamed User')}</strong><span>${escapeHtml(user.email)}${permission?.job_title?` • ${escapeHtml(permission.job_title)}`:''}</span></div><span class="user-role-badge ${user.role}">${permission?.user_type==='manager'?'Manager':user.role==='admin'?'Administrator':'Sub-user'}</span><span class="user-status-badge ${user.status}">${user.status}</span><div class="user-row-actions"><button type="button" class="je-btn je-btn-secondary" onclick="openUserAccessEditor('${user.id}')">Edit</button><button type="button" class="je-btn je-btn-secondary" onclick="sendSubUserPasswordReset('${user.id}')">Reset Password</button></div></div>`}).join(''):'<div class="legal-doc-empty">No users found. Refresh the page after creating a user.</div>'};
function getLiveUserName(id){return liveProfiles.find(user=>user.id===id)?.full_name||getDemoUserName(id)}
function populateUserReviewOptions(){const select=document.getElementById('userReviewUser');if(!select)return;const current=select.value;select.innerHTML='<option value="all">All users</option>'+liveProfiles.filter(user=>user.role!=='admin').map(user=>`<option value="${user.id}">${escapeHtml(user.full_name||user.email)}</option>`).join('');select.value=[...select.options].some(option=>option.value===current)?current:'all';renderUserEntryReview()}
function renderUserEntryReview(){const tbody=document.getElementById('userEntryReviewBody');if(!tbody)return;const user=document.getElementById('userReviewUser')?.value||'all',status=document.getElementById('userReviewStatus')?.value||'pending';const rows=DemoAccess.submissions.filter(item=>(user==='all'||item.submittedBy===user)&&(status==='all'||item.status===status));tbody.innerHTML=rows.length?rows.map(item=>`<tr><td>${escapeHtml(item.date)}</td><td>${escapeHtml(getLiveUserName(item.submittedBy))}</td><td>${escapeHtml(item.memo)}${item.reference?`<div class="je-subtitle">${escapeHtml(item.reference)}</div>`:''}</td><td>${escapeHtml(item.debitAccount)}<div class="je-subtitle">CR: ${escapeHtml(item.creditAccount)}</div></td><td class="num">${currencySymbolV6(item.currency)} ${formatAppNumber(item.amount)}</td><td><span class="submission-status ${item.status}">${item.status.toUpperCase()}</span></td><td>${item.status==='pending'?`<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewEntrySubmission('${item.id}','approved')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewEntrySubmission('${item.id}','rejected')">Reject</button></div>`:'Reviewed'}</td></tr>`).join(''):'<tr><td colspan="7" class="period-empty">No matching submissions.</td></tr>';const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} entr${rows.length===1?'y':'ies'} shown`;const pending=DemoAccess.submissions.filter(item=>item.status==='pending').length;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=pending}
const applyLiveRoleAccessBeforePermissions=applyLiveRoleAccess;
applyLiveRoleAccess=function(){applyLiveRoleAccessBeforePermissions();if(livePermission)applyPermissionAccess()};
const hydrateSupabaseSessionBeforePermissions=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforePermissions(session);if(liveProfile){applyPermissionAccess();renderUserEntryReview()}};

// STAFF JOURNALS — simple ledger input that is converted to double-entry only on approval.
let activeStaffJournal=null;
let activeStaffJournalLines=[];
let reviewStaffJournals=[];
function allowedStaffAccounts(){const p=livePermission||{},all=AccountingStore.accounts||[],permitted=new Set((p.destination_account_ids?.length?p.destination_account_ids:(p.allowed_account_ids||[])).map(String));return(p.allow_any_account||liveProfile?.role==='admin'?all:all.filter(a=>permitted.has(accountKey(a)))).filter(a=>a.active!==false&&a.is_active!==false&&a.isPosting!==false)}
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
function syncStaffJournalLines(){activeStaffJournalLines=[...document.querySelectorAll('#staffJournalLinesBody tr')].map((row,index)=>({...activeStaffJournalLines[index],transaction_date:row.querySelector('.staff-line-date').value,direction:row.querySelector('.staff-line-direction').value,account_id:row.querySelector('.staff-line-account').value,memo:row.querySelector('.staff-line-memo').value.trim(),amount:parseAppNumber(row.querySelector('.staff-line-amount').value||0)}));renderStaffJournalSummary()}
function addStaffJournalLine(){syncStaffJournalLines();activeStaffJournalLines.push({transaction_date:`${staffJournalMonth()}-01`,direction:'out',account_id:'',memo:'',reference:'',amount:''});renderStaffJournal()}
function removeStaffJournalLine(index){activeStaffJournalLines.splice(index,1);if(!activeStaffJournalLines.length)addStaffJournalLine();else renderStaffJournal()}
function renderStaffJournalSummary(){const host=document.getElementById('staffJournalSummary');if(!host)return;const totals={};activeStaffJournalLines.filter(line=>line.account_id&&Number(line.amount)>0).forEach(line=>{const key=`${line.direction}:${line.account_id}`;totals[key]=(totals[key]||0)+Number(line.amount)});host.innerHTML=Object.keys(totals).length?Object.entries(totals).map(([key,value])=>{const[direction,id]=key.split(':');return`<div><span>${direction==='out'?'Money Out':'Money In'} • ${escapeHtml(accountNameById(id)||'Account')}</span><strong>${formatAppNumber(value)}</strong></div>`}).join(''):'<span>No valid lines yet.</span>'}
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
async function reviewStaffJournal(id,action){if(action==='return'){const note=await ui117.prompt('Reason for returning this journal:');if(!note)return;const{error}=await ojmDb.from('staff_journals').update({status:'returned',return_note:note,reviewed_by:liveProfile.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(error){showAppNotification('Return Failed',error.message,true);return}}else{const{error}=await ojmDb.rpc('approve_report1443',{p_journal:id,p_expected:reviewStaffJournals.find(j=>j.id===id)?.lines||[]});if(error){showAppNotification('Posting Failed',error.message,true);return}}await Promise.all([loadStaffJournalsForReview(),loadJournalFromSupabase()])}
function renderUserEntryReview(){const tbody=document.getElementById('userEntryReviewBody');if(!tbody)return;const user=document.getElementById('userReviewUser')?.value||'all',status=document.getElementById('userReviewStatus')?.value||'pending';const rows=reviewStaffJournals.filter(j=>(user==='all'||j.owner_id===user)&&(status==='all'||j.status===status||status==='pending'&&j.status==='submitted'));tbody.innerHTML=rows.length?rows.map(j=>`<tr><td>${escapeHtml(j.period_start.slice(0,7))}</td><td>${escapeHtml(getLiveUserName(j.owner_id))}</td><td>${j.lines.length}</td><td class="num">${formatAppNumber(j.lines.reduce((sum,line)=>sum+Number(line.amount),0))}</td><td><span class="submission-status ${j.status}">${escapeHtml(j.status.toUpperCase())}</span></td><td>${j.status==='submitted'?`<div class="submission-review-actions"><button class="je-btn je-btn-emerald" onclick="reviewStaffJournal('${j.id}','approve')">Approve & Post</button><button class="je-btn je-btn-danger" onclick="reviewStaffJournal('${j.id}','return')">Return</button></div>`:'Reviewed'}</td></tr>`).join(''):'<tr><td colspan="6" class="period-empty">No staff journals match this filter.</td></tr>';const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} journal${rows.length===1?'':'s'} shown`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=reviewStaffJournals.filter(j=>j.status==='submitted').length}
function accountKey(a){return a?String(a.id||a.code||a.name||''):''}
function renderAccountAccessEditor(selected=[],fundSelected=[]){
  const accounts=(AccountingStore.accounts||[]).filter(a=>a.active!==false&&a.is_active!==false),host=document.getElementById('userAccountAccessGrid'),fundHost=document.getElementById('userFundAccountGrid');
  if(host)host.innerHTML=accounts.filter(a=>['EXPENSE','ASSET','REVENUE'].includes(String(a.type||'').toUpperCase())).map(a=>`<label class="permission-option"><input type="checkbox" value="${escapeHtml(accountKey(a))}" ${selected.includes(accountKey(a))?'checked':''}><span>${escapeHtml(a.code)} — ${escapeHtml(a.name)}</span></label>`).join('');
  if(fundHost)fundHost.innerHTML=accounts.filter(a=>String(a.type||'').toUpperCase()==='ASSET').map(a=>`<label class="permission-option fund-option"><input type="checkbox" value="${escapeHtml(accountKey(a))}" ${fundSelected.includes(accountKey(a))?'checked':''}><span>${escapeHtml(a.code)} — ${escapeHtml(a.name)}</span><input class="je-input fund-allocation-input" type="number" min="0" step="0.01" data-fund-id="${escapeHtml(accountKey(a))}" placeholder="Assigned amount" aria-label="Assigned amount for ${escapeHtml(a.name)}"></label>`).join('')
}
function fillDefaultMappingAccounts(permission={}){const fundIds=permission.assigned_fund_account_ids||[],accounts=(AccountingStore.accounts||[]).filter(a=>!fundIds.length||fundIds.includes(accountKey(a))),options='<option value="">Choose an assigned fund</option>'+accounts.map(a=>`<option value="${escapeHtml(accountKey(a))}">${escapeHtml(a.code)} — ${escapeHtml(a.name)}</option>`).join('');const out=document.getElementById('defaultOutCreditAccount'),incoming=document.getElementById('defaultInDebitAccount');if(out){out.innerHTML=options;out.value=permission.default_out_credit_account_id||''}if(incoming){incoming.innerHTML=options;incoming.value=permission.default_in_debit_account_id||''}}
function toggleAllowedAccountEditor(){const host=document.getElementById('userAccountAccessGrid');if(host)host.hidden=document.getElementById('permissionAllowAnyAccount').checked}
const openUserAccessEditorBeforeStaffConfig=openUserAccessEditor;
openUserAccessEditor=function(id=''){openUserAccessEditorBeforeStaffConfig(id);const user=liveProfiles.find(item=>item.id===id),base=user?.user_permissions||{},sample=/ryan/i.test(subUserName(user||{}))?userWorkspaceConfig(user):null,permission={...base,assigned_fund_account_ids:base.assigned_fund_account_ids?.length?base.assigned_fund_account_ids:(sample?.fundIds||[]),destination_account_ids:base.destination_account_ids?.length?base.destination_account_ids:(base.allowed_account_ids?.length?base.allowed_account_ids:(sample?.destinationIds||[])),fund_allocations:base.fund_allocations?.length?base.fund_allocations:(sample?.allocations||[]),default_out_credit_account_id:base.default_out_credit_account_id||sample?.defaultFund||null},funds=permission.assigned_fund_account_ids||[];document.getElementById('permissionAllowAnyAccount').checked=Boolean(permission.allow_any_account);renderAccountAccessEditor(permission.destination_account_ids||[],funds);(permission.fund_allocations||[]).forEach(item=>{const input=document.querySelector(`.fund-allocation-input[data-fund-id="${CSS.escape(String(item.account_id))}"]`);if(input)input.value=item.amount||''});fillDefaultMappingAccounts(permission);document.getElementById('permissionAllowOut').checked=!permission.allowed_directions||permission.allowed_directions.includes('out');document.getElementById('permissionAllowIn').checked=Boolean(permission.allowed_directions?.includes('in'));toggleAllowedAccountEditor()};
const saveUserAccessBeforeStaffConfig=saveUserAccess;
saveUserAccess=async function(event){
  event.preventDefault();const id=document.getElementById('userAccessId').value,status=document.getElementById('userAccessStatus'),funds=[...document.querySelectorAll('#userFundAccountGrid input[type="checkbox"]:checked')].map(input=>input.value),destinations=[...document.querySelectorAll('#userAccountAccessGrid input:checked')].map(input=>input.value);const extra={allow_any_account:document.getElementById('permissionAllowAnyAccount').checked,allowed_account_ids:destinations,destination_account_ids:destinations,assigned_fund_account_ids:funds,fund_allocations:funds.map(account_id=>({account_id,amount:parseAppNumber(document.querySelector(`.fund-allocation-input[data-fund-id="${CSS.escape(account_id)}"]`)?.value||0)})),default_out_credit_account_id:document.getElementById('defaultOutCreditAccount').value||funds[0]||null,default_in_debit_account_id:document.getElementById('defaultInDebitAccount').value||funds[0]||null,allowed_directions:[document.getElementById('permissionAllowOut').checked?'out':null,document.getElementById('permissionAllowIn').checked?'in':null].filter(Boolean)};
  if(!extra.allowed_directions.length||!funds.length||(!extra.allow_any_account&&!destinations.length)){status.textContent='Assign at least one fund account, one spending account, and an allowed transaction direction.';return}
  const originalUpsert=ojmDb.from;let captured=null;ojmDb.from=function(table){const api=originalUpsert.call(ojmDb,table);if(table==='user_permissions'){const original=api.upsert.bind(api);api.upsert=(payload,...rest)=>original({...payload,...extra},...rest)}return api};try{await saveUserAccessBeforeStaffConfig(event)}finally{ojmDb.from=originalUpsert}
};
const hydrateBeforeStaffJournal=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateBeforeStaffJournal(session);if(liveProfile&&document.getElementById('loginGate')?.classList.contains('is-authenticated')){const month=new Date().toISOString().slice(0,7);const picker=document.getElementById('staffJournalPeriod');if(picker)picker.value=month;await Promise.all([...(liveProfile.role==='admin'?[]:[openStaffJournalPeriod(month)]),loadStaffJournalsForReview()]);freshLoginRequested=false}};
const switchTabBeforeStaffJournal=switchTab;
switchTab=function(tabId){switchTabBeforeStaffJournal(tabId);if(tabId==='entry-submissions')openStaffJournalPeriod(staffJournalMonth());if(tabId==='user-entry-review')loadStaffJournalsForReview()};

// SETTINGS HELP — red asterisks explain only settings that need accounting or system context.
const SETTING_HELP = {
  'company-identity': {title:'Company Identity', body:'<p><strong>Use the legal name</strong> exactly as it appears on registrations, tax records, and licenses. The trading name is the customer-facing name that may appear on reports and printouts.</p>'},
  'legal-documents': {title:'Current Legal Documents', body:'<p>Keep copies of registrations, licenses, tax certificates, annual filing records, and other company documents here. These are for reference and download; they do not automatically submit anything to a government office.</p>'},
  'users-permissions': {title:'Users and Permissions', body:'<p>Create a login for each staff member. You choose the modules they can see, the accounts they may use, and whether they may submit, approve, post, void, or export.</p><p>Use <strong>Allow any active account</strong> only for trusted users or temporary emergency access.</p>'},
  'accounting-settings': {title:'Accounting Settings', body:'<p>Set the fiscal year, journal numbering, default cash and bank accounts, exchange-rate method, and amount precision. Protecting closed periods helps prevent accidental edits. The currency manager controls which currencies are available; adding one does not convert existing transactions.</p>'},
  'payroll-settings': {title:'Payroll Settings', body:'<p>Set the normal pay cycle, working schedule, cutoff and payment dates, overtime multiplier, grace period, and standard SSO/PIT sharing defaults. Employee-specific rules can override these later.</p>'},
  'tax-settings': {title:'Statutory Settings', body:'<p>Maintain editable PIT salary brackets, SSO contribution settings, VAT defaults, and separate filing reminders. Confirm all rates, thresholds, ceilings, and due dates against current Lao requirements before payroll or filing.</p>'},
  'printing-settings': {title:'Printing Settings', body:'<p>Control paper size, margins, branding placement, page numbers, and downloaded file names. Header and footer images are visual only; they do not change accounting data.</p>'},
  'backup-export': {title:'Backup and Export', body:'<p>Download a backup before major changes. A settings backup preserves browser-held configuration; transaction exports are for checking or keeping a separate copy. Restoring a backup replaces the matching saved settings in this browser.</p>'},
  'system-settings': {title:'System Settings', body:'<p>Choose display formats, inactivity protection, the preferred opening page, and record-policy reminders. Retention and archive choices are reminders only: the application will never delete records automatically.</p>'},
  'session-timeout': {title:'Inactivity Timeout', body:'<p>The system automatically signs out a user after the selected number of minutes without activity. Clicking, typing, scrolling, or navigating resets the timer.</p>'},
  'timeout-warning': {title:'Timeout Warning', body:'<p>Choose how many minutes before automatic sign-out the user should receive a warning so they can remain signed in.</p>'},
  'record-retention': {title:'Record Retention', body:'<p>This is a policy reminder only. Accounting records are never deleted automatically by this setting.</p>'}
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
function renderStaffEntryHeaders(){const currencies=staffCurrencyCodes();const h=document.getElementById('staffEntryHeader'),s=document.getElementById('staffSummaryHeader');const cells=`<th style="width:120px">Date</th><th style="width:28%">Account</th><th style="width:32%">Particulars / Memo / Reference</th><th class="num">Debit</th>${currencies.map(c=>`<th class="num">Credit-${escapeHtml(c)}</th>`).join('')}<th class="action-col"></th>`;if(h)h.innerHTML=cells;if(s)s.innerHTML=cells;}
function renderStaffJournal(){
  const period=staffJournalMonth(),editable=!activeStaffJournal||['draft','returned'].includes(activeStaffJournal.status),currencies=staffCurrencyCodes();renderStaffEntryHeaders();
  const badge=document.getElementById('staffJournalStatusBadge');if(badge){badge.textContent=(activeStaffJournal?.status||'draft').toUpperCase();badge.classList.toggle('is-saved',!editable)}
  const body=document.getElementById('staffJournalEntryBody'); if(!body)return;
  const row=staffEntryDraft.transaction_date?staffEntryDraft:{transaction_date:`${period}-01`,account_id:'',memo:'',debit:'',credits:{}};staffEntryDraft=row;
  body.innerHTML=`<tr><td><input class="je-input staff-entry-date" type="date" value="${escapeHtml(row.transaction_date)}" ${editable?'':'disabled'}></td><td><select class="je-select staff-entry-account" ${editable?'':'disabled'}><option value="">Choose account</option>${accountOptionHtml(row.account_id)}</select></td><td><input class="je-input staff-entry-memo" value="${escapeHtml(row.memo||'')}" placeholder="Particulars, receipt or reference" ${editable?'':'disabled'}></td><td><input class="je-input staff-entry-debit num" type="number" min="0" step="0.01" value="${row.debit||''}" ${editable?'':'disabled'}></td>${currencies.map(c=>`<td><input class="je-input staff-entry-credit num" data-currency="${escapeHtml(c)}" type="number" min="0" step="0.01" value="${row.credits?.[c]||''}" ${editable?'':'disabled'}></td>`).join('')}<td></td></tr>`;
  document.getElementById('staffSubmitSummaryButton').disabled=!editable;renderStaffJournalSummary();
}
function readStaffEntry(){const row=document.querySelector('#staffJournalEntryBody tr');if(!row)return null;const credits={};row.querySelectorAll('.staff-entry-credit').forEach(i=>credits[i.dataset.currency]=parseAppNumber(i.value||0));return{transaction_date:row.querySelector('.staff-entry-date').value,account_id:row.querySelector('.staff-entry-account').value,memo:row.querySelector('.staff-entry-memo').value.trim(),debit:parseAppNumber(row.querySelector('.staff-entry-debit').value||0),credits};}
function postStaffEntry(){
  const item=readStaffEntry();if(!item?.transaction_date||!item.account_id||!item.memo){showAppNotification('Complete Entry','Enter Date, Account, and Particulars before posting the entry.',true);return}
  const creditItems=Object.entries(item.credits).filter(([,v])=>v>0);if((item.debit>0&&creditItems.length)||(!item.debit&&!creditItems.length)||creditItems.length>1){showAppNotification('Choose One Amount','Enter either one DR amount or one CR amount.',true);return}
  const direction=item.debit>0?'out':'in',amount=item.debit||creditItems[0][1],currency_code=item.debit?(AccountingStore.accounts||[]).find(a=>a.id===item.account_id)?.currency||'LAK':creditItems[0][0];
  activeStaffJournalLines.push({transaction_date:item.transaction_date,account_id:item.account_id,memo:item.memo,reference:'',direction,amount,currency_code});staffEntryDraft={transaction_date:item.transaction_date,account_id:'',memo:'',debit:'',credits:{}};const status=document.getElementById('staffJournalSaveStatus');if(status)status.textContent='Entry added to Journal Summary.';renderStaffJournal();
}
function renderStaffJournalSummary(){
  const host=document.getElementById('staffJournalSummary');if(!host)return;const currencies=staffCurrencyCodes();
  host.innerHTML=activeStaffJournalLines.length?activeStaffJournalLines.map((line,index)=>`<tr><td>${escapeHtml(line.transaction_date)}</td><td>${escapeHtml(accountNameById(line.account_id)||'Account')}</td><td>${escapeHtml(line.memo)}</td><td class="num">${line.direction==='out'?formatAppNumber(line.amount):''}</td>${currencies.map(c=>`<td class="num">${line.direction==='in'&&line.currency_code===c?formatAppNumber(line.amount):''}</td>`).join('')}<td><button class="btn-action-delete" onclick="removeStaffSummaryLine(${index})" title="Remove entry">✕</button></td></tr>`).join(''):`<tr><td colspan="${5+currencies.length}" class="period-empty staff-summary-empty">No entries posted for this period.</td></tr>`;
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
  const hasActions=actionMode!=='none',ids=Object.keys(groups); if(!ids.length){tbody.innerHTML=`<tr><td colspan="${6+(hasActions?1:0)}" class="period-empty">No transactions found.</td></tr>`;return;}
  tbody.innerHTML=ids.sort((a,b)=>String(groups[b][0].date).localeCompare(String(groups[a][0].date))||String(b).localeCompare(String(a))).map(id=>{const lines=groups[id],first=lines[0],dbId=first.dbEntryId||'',adjusted=isAdjustedTransaction(lines);return lines.map((line,index)=>{const account=getCleanAccountDisplay(line.account,line.currency),rowClass=lines.length===1?'cluster-row-start cluster-row-end':index===0?'cluster-row-start':index===lines.length-1?'cluster-row-cont cluster-row-end':'cluster-row-cont',actions=actionMode==='edit'?`<button class="je-btn je-btn-secondary" onclick="loadEntryForEdit('${escapeHtml(id)}')">Edit</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}`:actionMode==='review'?`<button class="je-btn je-btn-secondary" onclick="openTransactionReview('${escapeHtml(id)}')">Review</button>${canVoidTransactions()&&dbId?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry('${dbId}','${escapeHtml(id)}')">Void</button>`:''}`:'';return`<tr class="${rowClass}" data-created-at="${escapeHtml(first.created_at||first.createdAt||first.date||'')}" data-entry-id="${escapeHtml(id)}" data-line-index="${index}">${index===0?`<td rowspan="${lines.length}" class="entry-shared-cell">${formatAppDate(first.date)}</td><td rowspan="${lines.length}" class="entry-shared-cell"><div class="entry-id-stack"><span style="font-family:monospace;color:#065f46">${escapeHtml(id)}</span>${adjusted?`<button type="button" class="adjusted-entry-badge adjusted-entry-button" onclick="event.stopPropagation();openAdjustedDetails('${escapeHtml(id)}')">Adjusted</button>`:''}</div></td>`:''}<td><div class="transaction-account-display"><span class="currency-symbol-badge">${currencySymbolV6(account.currency)}</span><span class="account-clean-name">${escapeHtml(account.name)}</span></div></td><td>${escapeHtml(line.memo||'')}</td><td class="num">${line.debit>0?formatAppNumber(line.debit):'-'}</td><td class="num">${line.credit>0?formatAppNumber(line.credit):'-'}</td>${hasActions&&index===0?`<td rowspan="${lines.length}" class="action-col entry-shared-cell"><div class="transaction-review-actions">${actions}</div></td>`:''}</tr>`}).join('')}).join('');
}
function setTransactionTableHeaders(id,withActions){const header=document.getElementById(id);if(!header)return;const currencies=transactionCurrencies();header.innerHTML=`<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="num">Debit</th><th class="num">Credit</th>${withActions?'<th class="action-col">Action</th>':''}`}
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
  if(!ojmDb||!liveProfile)return;const {data,error}=await ojmDb.from('audit_log').select('id,record_id,action,reason,old_data,new_data,actor_id,created_at').in('table_name',['journal_entries','accounting_periods','period_findings','scheduled_journals']).order('created_at',{ascending:false}).limit(250);
  if(!error){LiveTransactionAudit=data||[];renderVoidedTransactionsTable();}
}
renderVoidedTransactionsTable=function(){
  const header=document.getElementById('thVoidedTransRow'),body=document.getElementById('voidedTransactionsBody');if(!body)return;
  if(header)header.innerHTML='<th class="audit-expand-cell"></th><th>Date & Time</th><th>Record</th><th>Audit Action</th><th>Reason / Note</th><th>Recorded By</th>';
  const live=LiveTransactionAudit.filter(item=>['VOID','UPDATE','MODIFY','MARK_UNDER_REVIEW','APPROVE_AND_POST','PERIOD_STATUS','DELETE_SCHEDULE','UPDATE_SCHEDULE','CREATE_SCHEDULE','SCHEDULE_POST_ADVANCE','AUTO_POST'].includes(item.action)||/DELETE|REMOVE|PURGE/.test(String(item.action).toUpperCase()));
  const local=(JournalModule.voidedEntries||[]).map((item,index)=>({id:item.id||`local-${index}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp,actor_id:null}));
  const audits=[...live,...local].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  body.innerHTML=audits.length?audits.map((item,index)=>{const key=`audit-detail-${index}`,record=auditRecordId(item);return`<tr class="audit-summary-row" data-audit-search="${escapeHtml(JSON.stringify(item))}" onclick="selectAuditLogRow(this);toggleAuditDetails('${key}',this)" aria-expanded="false"><td class="audit-expand-cell">▶</td><td>${formatAppDate(item.created_at,true)}</td><td style="font-family:monospace">${escapeHtml(record)}</td><td><span class="submission-status ${item.action==='VOID'?'returned':'posted'}">${escapeHtml(String(item.action||'CHANGE').replaceAll('_',' '))}</span></td><td>${escapeHtml(item.reason||item.new_data?.status||'—')}</td><td>${escapeHtml(getLiveUserName(item.actor_id)||'System')}</td></tr><tr id="${key}" class="audit-detail-row" hidden><td colspan="6"><div class="audit-detail-panel">${auditComparisonHtml(item.old_data,item.new_data,item.action)}</div></td></tr>`}).join(''):'<tr><td colspan="6" class="period-empty">No void, correction, or period-review audit records yet.</td></tr>';
};
function selectAuditLogRow(row){document.querySelectorAll('#tblVoidedTransactions .audit-row-selected').forEach(node=>node.classList.remove('audit-row-selected'));row?.classList.add('audit-row-selected')}
function auditRecordId(item){const safe=item||{},old=(Array.isArray(safe.old_data)?safe.old_data[0]:safe.old_data)||{},next=(Array.isArray(safe.new_data)?safe.new_data[0]:safe.new_data)||{};return old.schedule_no||next.schedule_no||old.entry_no||old.id||next.entry_no||next.id||safe.record_id||safe.id||'Audit record'}
function auditLines(data){if(Array.isArray(data))return data.filter(row=>row&&typeof row==='object');if(Array.isArray(data?.lines)){const header={...data};delete header.lines;return data.lines.filter(row=>row&&typeof row==='object').map(line=>({...header,...line}))}if(data&&typeof data==='object'&&Object.keys(data).length)return[data];return[]}
function auditField(row,key){const aliases={date:['date','transaction_date','line_date'],entry:['entry_no','id'],account:['account','account_name'],memo:['memo','description','reference'],debit:['debit'],credit:['credit'],currency:['currency','currency_code'],status:['status','correction_status']};for(const name of aliases[key])if(row?.[name]!==undefined&&row?.[name]!==null&&row?.[name]!=='')return row[name];return''}
function auditComparisonHtml(oldData,newData,action){const oldLines=auditLines(oldData),newLines=auditLines(newData),fields=[['date','Date'],['entry','Entry ID'],['account','Account'],['memo','Memo / Reference'],['debit','Debit'],['credit','Credit'],['currency','Currency'],['status','Status']],count=Math.max(oldLines.length,newLines.length,1),rows=[];for(let i=0;i<count;i++){for(const[field,label]of fields){const before=auditField(oldLines[i],field),after=auditField(newLines[i],field);if(before===''&&after==='')continue;const changed=String(before)!==String(after),removed=before!==''&&after==='',beforeText=field==='date'&&before?formatAppDate(before):before,afterText=field==='date'&&after?formatAppDate(after):after;rows.push(`<tr><td class="audit-field">${count>1?`Line ${i+1} — `:''}${label}</td><td class="${changed?'audit-original-changed':''}">${escapeHtml(String(beforeText||'—'))}${removed?'<span class="audit-removed-mark">Removed</span>':''}</td><td>${escapeHtml(String(afterText||'—'))}</td></tr>`)}}if(!rows.length)return'<div class="audit-empty-detail">No journal-field changes were recorded for this audit action.</div>';return`<table class="audit-compare-table"><thead><tr><th>Journal field</th><th>Original / Removed</th><th>Revised / Result</th></tr></thead><tbody>${rows.join('')}</tbody></table>`}
function toggleAuditDetails(id,row){const detail=document.getElementById(id);if(!detail)return;const opening=detail.hidden;detail.hidden=!opening;row.setAttribute('aria-expanded',String(opening));const icon=row.querySelector('.audit-expand-cell');if(icon)icon.textContent=opening?'▼':'▶'}
function openAdjustedDetails(entryId){const local=(JournalModule.voidedEntries||[]).map((item,index)=>({id:item.id||`local-${index}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp,actor_id:null})),audits=[...LiveTransactionAudit,...local],item=audits.find(record=>auditRecordId(record)===entryId||auditLines(record.old_data).some(row=>row.id===entryId||row.entry_no===entryId)||auditLines(record.new_data).some(row=>row.id===entryId||row.entry_no===entryId));let modal=document.getElementById('modalAdjustmentQuickView');if(!modal){modal=document.createElement('div');modal.id='modalAdjustmentQuickView';modal.className='modal-backdrop';modal.innerHTML='<div class="modal-dialog modal-center adjustment-quick-dialog"><div class="modal-header"><h4>Adjustment Details</h4><button type="button" class="modal-close-x" onclick="closeModal(\'modalAdjustmentQuickView\')">&times;</button></div><div class="modal-body" id="adjustmentQuickViewBody"></div><div class="modal-footer"><button type="button" class="je-btn je-btn-secondary" onclick="closeModal(\'modalAdjustmentQuickView\')">Close</button></div></div>';document.body.appendChild(modal)}const body=document.getElementById('adjustmentQuickViewBody');body.innerHTML=item?`<div class="je-subtitle" style="margin-bottom:7px"><strong>${escapeHtml(String(item.action||'ADJUSTMENT').replaceAll('_',' '))}</strong> • ${escapeHtml(item.reason||'No reason recorded')}</div>${auditComparisonHtml(item.old_data,item.new_data,item.action)}`:'<div class="empty-archive-state">No linked audit details are available for this adjusted entry.</div>';openModal('modalAdjustmentQuickView')}
const loadJournalFromSupabaseBeforeAudit=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforeAudit();if(document.querySelector('.tab-content.active')?.id==='transactions-voided')await loadTransactionAudit();};
const switchTabBeforeTransactionAudit=switchTab;
switchTab=function(tabId){switchTabBeforeTransactionAudit(tabId);if(tabId==='transactions-voided')loadTransactionAudit();if(tabId==='transactions-all')renderAllTransactionsTable();if(tabId==='transactions-new')renderNewTransactionsTable();};

async function loadAccountingPeriodStatuses(){
  if(!ojmDb||!liveProfile)return;const {data,error}=await ojmDb.from('accounting_periods').select('period_month,status,updated_at,updated_by');if(error)return;
  (data||[]).forEach(item=>{const key=String(item.period_month).slice(0,7);PeriodReview.periods[key]={...(PeriodReview.periods[key]||{}),status:item.status,updatedAt:item.updated_at,updatedBy:item.updated_by};});
  JournalModule.entries.forEach(row=>{const state=PeriodReview.status(String(row.date).slice(0,7));row.archived=state!=='open';});
  refreshAllTables();
}
function showPeriodToast(message,isError=false){let toast=document.getElementById('periodStatusToast');if(!toast){toast=document.createElement('div');toast.id='periodStatusToast';toast.className='period-status-toast';document.body.appendChild(toast)}clearTimeout(showPeriodToast.timer);toast.textContent=message;toast.classList.toggle('is-error',isError);toast.classList.add('is-visible');showPeriodToast.timer=setTimeout(()=>toast.classList.remove('is-visible'),2600)}
const loadJournalFromSupabaseBeforePeriods=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforePeriods();await loadAccountingPeriodStatuses();};
const changePeriodStatusLocal=changePeriodStatus;
let periodUpdatePending98=false;
changePeriodStatus=async function(nextStatus){
  const month=PeriodReview.selectedMonth,current=PeriodReview.status(month),openFindings=PeriodReview.findings.filter(item=>item.month===month&&!['corrected','closed'].includes(item.status)).length;
  if(periodUpdatePending98){showAppNotification('Period Update In Progress','Wait for the current period update to finish.',true);return false}
  if(nextStatus==='closed'&&openFindings){showAppNotification('Open Findings',`Resolve or close ${openFindings} finding(s) before closing this period.`,true);return false}
  if(nextStatus==='locked'&&current!=='closed'){showAppNotification('Close Period First','A period must be closed before locking it.',true);return false}
  periodUpdatePending98=true;
  const controls=[...document.querySelectorAll('#finishPeriod69,#reopenedBooks button,.period-closing-bar button')];
  const disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try {
    if(!ojmDb)throw new Error('The database connection is unavailable. Sign in again and retry.');
    showPeriodToast('Updating period…');
    const {error}=await ojmDb.rpc('set_accounting_period_status',{p_month:`${month}-01`,p_status:nextStatus});
    if(error)throw error;
    changePeriodStatusLocal(nextStatus,month);
    showPeriodToast(`Period ${nextStatus==='open'?'reopened':nextStatus}.`);
    // Audit refresh is independent of a confirmed period update.
    Promise.resolve(loadTransactionAudit()).catch(()=>{});
    return true;
  }catch(error){
    const detail=/fetch|network|load failed/i.test(error.message||'')?'Could not confirm the period update with the server. Your current journal remains available. Check your connection, reload the period status, and retry.':error.message||'Please retry.';
    showAppNotification('Period Update Failed',detail,true);return false;
  }finally{periodUpdatePending98=false;controls.forEach((n,i)=>n.disabled=disabled[i])}
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
function transactionSelectionRows107(row){const body=row.closest('tbody');return [...body.rows].filter(r=>r.dataset.entryId===row.dataset.entryId)}
document.addEventListener('mouseover',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row||row.contains(event.relatedTarget))return;row.classList.add('entry-hover-line');transactionRowOwner(row)?.classList.add('entry-hover-owner')});
document.addEventListener('mouseout',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row||row.contains(event.relatedTarget))return;row.classList.remove('entry-hover-line');transactionRowOwner(row)?.classList.remove('entry-hover-owner')});
document.addEventListener('click',event=>{const row=event.target.closest('.clustered-journal-table tbody tr[data-entry-id]');if(!row||event.target.closest('button,a,input,select,textarea,label,summary'))return;document.querySelectorAll('.entry-selected-line,.entry-selected-owner').forEach(node=>node.classList.remove('entry-selected-line','entry-selected-owner'));const rows=document.body.classList.contains('audit-on101')?[row]:transactionSelectionRows107(row);rows.forEach(r=>r.classList.add('entry-selected-line'));transactionRowOwner(row)?.classList.add('entry-selected-owner')});

// SETTINGS / SUB-USERS FOUNDATION — horizontal settings navigation, scoped
// export tools, secure reset links, saved-state tracking, and inactivity logout.
const SETTINGS_VIEW_TITLES={
  'settings-business':'Business Information Settings','settings-users':'Users & Permissions Settings',
  'settings-accounting':'Accounting Settings',
  'settings-payroll':'Payroll Settings','settings-tax':'Statutory Settings',
  'settings-print':'Printing Settings','settings-system':'System Settings'
};

function showCenterStatus(message,isError=false){
  let toast=document.getElementById('centerStatusToast');
  if(!toast){toast=document.createElement('div');toast.id='centerStatusToast';toast.className='center-status-toast';toast.setAttribute('role','status');document.body.appendChild(toast)}
  clearTimeout(showCenterStatus.timer);toast.textContent=message;toast.classList.toggle('is-error',isError);toast.classList.add('is-visible');
  showCenterStatus.timer=setTimeout(()=>toast.classList.remove('is-visible'),2200);
}

function updateGlobalExportTools(tabId){
  const settingsView=tabId.startsWith('settings-');
  const reviewView=tabId==='user-entry-review';
  const visible=!settingsView&&!reviewView;
  const csv=document.getElementById('global-csv-btn'),print=document.getElementById('global-print-btn');
  if(csv)csv.hidden=!visible;if(print)print.hidden=!visible;
}

function updateSettingsBrowser(tabId){
  const shell=document.getElementById('settingsTabShell'),isSettings=Object.prototype.hasOwnProperty.call(SETTINGS_VIEW_TITLES,tabId);
  if(shell)shell.hidden=!isSettings;
  document.querySelectorAll('.settings-browser-tab').forEach(tab=>{const active=tab.dataset.settingsTarget===tabId;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active))});
  if(isSettings){const title=document.getElementById('mainHeaderTitle');if(title)title.textContent=SETTINGS_VIEW_TITLES[tabId]}
}

const switchTabBeforeFoundationControls=switchTab;
switchTab=function(tabId){switchTabBeforeFoundationControls(tabId);updateSettingsBrowser(tabId);updateGlobalExportTools(tabId);if(tabId==='sub-users-workspace'){renderSubUserSearchResults('');renderSubUserWorkspace()}};
const scrollToAccountBeforeFoundationControls=scrollToAccountModule;
scrollToAccountModule=function(moduleId){const result=scrollToAccountBeforeFoundationControls(moduleId);updateSettingsBrowser('');updateGlobalExportTools(moduleId);return result};

let businessSettingsBaseline='';
function businessSettingsSnapshot(){return JSON.stringify(collectBusinessSettings())}
function setBusinessSettingsBaseline(){businessSettingsBaseline=businessSettingsSnapshot();const badge=document.getElementById('businessSavedBadge');if(badge){badge.textContent='Saved';badge.classList.add('is-saved')}}
function reconcileBusinessDirtyState(){
  if(!businessSettingsBaseline)return;
  const dirty=businessSettingsSnapshot()!==businessSettingsBaseline,badge=document.getElementById('businessSavedBadge'),status=document.getElementById('businessSettingsStatus');
  if(badge){badge.textContent=dirty?'Unsaved changes':'Saved';badge.classList.toggle('is-saved',!dirty)}
  if(status&&!dirty){status.textContent='All business information changes are saved.';status.classList.remove('is-save-confirmation')}
}
const reloadBusinessSettingsBeforeFoundation=reloadBusinessSettings;
reloadBusinessSettings=function(notifyUser=false){
  const value=BusinessSettings.current||BusinessSettings.load();
  Object.entries(BUSINESS_FIELD_MAP).forEach(([key,id])=>{const field=document.getElementById(id);if(field)field.type==='checkbox'?field.checked=Boolean(value[key]):field.value=value[key]||''});
  renderBusinessIdentity(value,true);setBusinessSettingsBaseline();
  const status=document.getElementById('businessSettingsStatus');if(status){status.textContent='Saved business profile restored.';status.classList.remove('is-save-confirmation')}
  if(notifyUser)showCenterStatus('Unsaved changes were undone.');
};
const loadBusinessSettingsBeforeFoundation=loadBusinessSettingsFromSupabase;
loadBusinessSettingsFromSupabase=async function(){await loadBusinessSettingsBeforeFoundation();setBusinessSettingsBaseline()};
const saveBusinessSettingsBeforeFoundation=saveBusinessSettings;
saveBusinessSettings=async function(event){
  const saved=await saveBusinessSettingsBeforeFoundation(event);
  if(saved===false)return;
  const form=document.getElementById('businessSettingsForm');if(!form?.checkValidity())return;
  setBusinessSettingsBaseline();
  const status=document.getElementById('businessSettingsStatus');if(status){status.textContent='All business information changes are saved.';status.classList.remove('is-save-confirmation')}
  showCenterStatus('Business information saved.');
};

let openSubUserTabs=[],activeSubUserId='';
function availableSubUsers(){
  const source=[...((liveProfiles?.length?liveProfiles:DemoAccess.users)||[])];
  return source.filter(user=>user.id!==liveProfile?.id&&user.id!==DemoAccess.currentUser?.id);
}
function subUserName(user){return user.full_name||user.name||user.email||'Unnamed user'}
function subUserAccountTitle14229(user){const name=String(subUserName(user)).trim();return name+(/s$/i.test(name)?'’':'’s')+' Account'}
function subUserPermission(user){return user&&String(user.id)===String(liveProfile?.id)?livePermission||user.user_permissions||{}:user?.user_permissions||{}}
function filterSubUserSearch(query=''){renderSubUserSearchResults(query)}
function renderSubUserSearchResults(query=''){
  const host=document.getElementById('subUserSearchResults');if(!host)return;
  const term=String(query).trim().toLowerCase(),users=availableSubUsers().filter(user=>[subUserName(user),user.email,user.role,subUserPermission(user).job_title].some(value=>String(value||'').toLowerCase().includes(term)));
  host.innerHTML=users.length?users.map(user=>`<button type="button" class="sub-user-search-result" onclick="openSubUserWorkspace('${user.id}')"><div><strong>${escapeHtml(subUserName(user))}</strong><span>${escapeHtml(user.email||'No email')} • ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</span></div><span>Open</span></button>`).join(''):'<div class="sub-user-empty-state">No matching sub-users.</div>';
  host.hidden=false;
}
function openSubUserWorkspace(id){
  if(!openSubUserTabs.includes(id))openSubUserTabs.push(id);activeSubUserId=id;
  const input=document.getElementById('subUserUniversalSearch'),results=document.getElementById('subUserSearchResults');if(input)input.value='';if(results)results.hidden=true;
  renderSubUserWorkspace();
}
function closeSubUserWorkspace(event,id){
  event.stopPropagation();const index=openSubUserTabs.indexOf(id);openSubUserTabs=openSubUserTabs.filter(item=>item!==id);
  if(activeSubUserId===id)activeSubUserId=openSubUserTabs[Math.min(index,openSubUserTabs.length-1)]||'';
  renderSubUserWorkspace();
}
function renderSubUserWorkspace(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;
  tabs.innerHTML=openSubUserTabs.map(id=>{const user=availableSubUsers().find(item=>item.id===id);if(!user)return'';return`<button type="button" class="sub-user-browser-tab ${id===activeSubUserId?'active':''}" onclick="activeSubUserId='${id}';renderSubUserWorkspace()"><span>${escapeHtml(subUserName(user))}</span><span class="sub-user-tab-close" role="button" aria-label="Close ${escapeHtml(subUserName(user))}" onclick="closeSubUserWorkspace(event,'${id}')">&times;</span></button>`}).join('');
  const user=availableSubUsers().find(item=>item.id===activeSubUserId);if(!user){panel.innerHTML='<div class="sub-user-empty-state">Select a sub-user to open their administrative workspace.</div>';return}
  const permission=subUserPermission(user),journals=(reviewStaffJournals||[]).filter(item=>item.owner_id===user.id),submitted=journals.filter(item=>item.status==='submitted').length;
  panel.innerHTML=`<div class="sub-user-profile-grid"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Role / Position</span><strong>${escapeHtml(permission.job_title||user.role||'Sub-user')}</strong></div><div class="sub-user-profile-item"><span>Status</span><strong>${escapeHtml(user.status||((user.active===false)?'Inactive':'Active'))}</strong></div></div><div class="sub-user-workspace-actions"><button type="button" class="je-btn je-btn-emerald" onclick="openUserAccessEditor('${user.id}')">Edit Permissions</button><button type="button" class="je-btn je-btn-secondary" onclick="sendSubUserPasswordReset('${user.id}')">Send Password Reset</button><button type="button" class="je-btn je-btn-secondary" onclick="openUserSubmissionReview('${user.id}')">Review Submissions (${submitted})</button></div><div class="settings-section-header"><h4>Entry Submission Activity</h4></div><div class="table-container"><table class="je-table"><thead><tr><th>Period</th><th>Status</th><th>Entries</th><th>Total</th></tr></thead><tbody>${journals.length?journals.map(j=>`<tr><td>${escapeHtml(String(j.period_start||'').slice(0,7)||'—')}</td><td><span class="submission-status ${escapeHtml(j.status)}">${escapeHtml(String(j.status||'draft').toUpperCase())}</span></td><td>${j.lines?.length||0}</td><td class="num">${(j.lines||[]).reduce((sum,line)=>sum+Number(line.amount||0),0).toLocaleString(appNumberLocale(),{minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()})}</td></tr>`).join(''):'<tr><td colspan="4" class="period-empty">No saved journal activity for this user.</td></tr>'}</tbody></table></div>`;
}
function openUserSubmissionReview(id){switchTab('user-entry-review');const select=document.getElementById('userReviewUser');if(select){select.value=id;renderUserEntryReview()}}
async function sendSubUserPasswordReset(id){
  const user=availableSubUsers().find(item=>item.id===id);if(!user?.email||!ojmDb){showCenterStatus('A valid user email is required.',true);return}
  const {error}=await ojmDb.auth.resetPasswordForEmail(user.email,{redirectTo:location.href.split('#')[0]});
  showCenterStatus(error?error.message:`Password-reset link sent to ${user.email}.`,Boolean(error));
}

const SessionTimeoutManager={logoutTimer:null,warningTimer:null,lastActivity:Date.now(),lastArmed:0,events:['pointerdown','pointermove','keydown','scroll','wheel','touchstart'],minutes(){return Math.max(5,Math.min(480,Number(ApplicationSettings.system?.sessionTimeout)||30))},reset(){this.lastActivity=Date.now();this.hideWarning();if(Date.now()-this.lastArmed>1000)this.arm()},arm(){clearTimeout(this.logoutTimer);clearTimeout(this.warningTimer);if(!liveProfile)return;this.lastArmed=Date.now();const minutes=this.minutes(),warningMinutes=Math.max(1,Math.min(30,Number(ApplicationSettings.system?.sessionWarning)||1)),duration=minutes*60000,warningAt=Math.max(1000,duration-Math.min(warningMinutes,minutes-1)*60000);this.warningTimer=setTimeout(()=>this.warn(warningMinutes),warningAt);this.logoutTimer=setTimeout(()=>this.logout(),duration)},warn(){this.hideWarning()},hideWarning(){const box=document.getElementById('sessionTimeoutWarning');if(box)box.hidden=true},async logout(){if(!liveProfile)return;if(Date.now()-this.lastActivity<this.minutes()*60000){this.arm();return}this.hideWarning();await logoutDemoUser()}};
function startSessionTimeoutManager(){SessionTimeoutManager.arm()}

function initializeFoundationControls(){
  const form=document.getElementById('businessSettingsForm');form?.addEventListener('input',reconcileBusinessDirtyState);
  setBusinessSettingsBaseline();
  SessionTimeoutManager.events.forEach(name=>document.addEventListener(name,()=>{if(liveProfile)SessionTimeoutManager.reset()},{passive:true}));
  window.addEventListener('focus',()=>{if(liveProfile)SessionTimeoutManager.check1434?.()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&liveProfile)SessionTimeoutManager.check1434?.()});
  document.addEventListener('click',event=>{if(!event.target.closest('.sub-user-search-wrap')){const results=document.getElementById('subUserSearchResults');if(results)results.hidden=true}});
  const active=document.querySelector('.tab-content.active')?.id||'dashboard';updateSettingsBrowser(active);updateGlobalExportTools(active);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeFoundationControls,{once:true});else initializeFoundationControls();

const hydrateSupabaseSessionBeforeFoundationControls=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforeFoundationControls(session);setBusinessSettingsBaseline();renderSubUserWorkspace();startSessionTimeoutManager()};

// FOUNDATION V2 — final header, user-tab and expandable review behavior.
const switchTabBeforeFoundationV2=switchTab;
switchTab=function(tabId){return switchTabBeforeFoundationV2(tabId)};
function userInitials(name='OJ'){return String(name).trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()||'OJ'}
function toggleHeaderAccountMenu(){const menu=document.getElementById('headerAccountDropdown'),trigger=document.getElementById('headerAccountTrigger');if(!menu)return;menu.hidden=!menu.hidden;trigger?.setAttribute('aria-expanded',String(!menu.hidden))}
function closeHeaderAccountMenu(){const menu=document.getElementById('headerAccountDropdown'),trigger=document.getElementById('headerAccountTrigger');if(menu)menu.hidden=true;trigger?.setAttribute('aria-expanded','false')}
function confirmSignOut(){closeHeaderAccountMenu();showAppConfirm('Sign Out','End the current secure session?','Sign Out',async()=>{await logoutDemoUser();showCenterStatus('Signed out successfully.')},false)}
function switchAccount(){closeHeaderAccountMenu();showAppConfirm('Switch Account','The current account will be signed out. The next user must enter their own email and password.','Continue',async()=>{await logoutDemoUser();const email=document.getElementById('loginEmail');if(email){email.value='';email.focus()}showCenterStatus('Enter the other account credentials.')},false)}
document.addEventListener('click',event=>{if(!event.target.closest('.header-account-menu'))closeHeaderAccountMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeHeaderAccountMenu()});

const applyLiveRoleAccessBeforeHeaderMenu=applyLiveRoleAccess;
applyLiveRoleAccess=function(){applyLiveRoleAccessBeforeHeaderMenu();const name=DemoAccess.currentUser?.name||liveProfile?.full_name||'OJ';const initials=document.getElementById('headerAccountInitials');if(initials)initials.textContent=userInitials(name)};

updateGlobalExportTools=function(tabId){
  const excluded=tabId.startsWith('settings-')||tabId==='user-entry-review',visible=!excluded;
  const csv=document.getElementById('global-csv-btn'),print=document.getElementById('global-print-btn'),divider=document.querySelector('.module-export-divider');
  if(csv)csv.hidden=!visible;if(print)print.hidden=!visible;if(divider)divider.hidden=!visible;
};
const openPrintDialogBeforeSettingsGuard=openPrintDialog;
openPrintDialog=function(){const active=document.querySelector('.tab-content.active')?.id||'';if(active.startsWith('settings-')||active==='user-entry-review'){showCenterStatus('Printing is not available in this module.',true);return}openPrintDialogBeforeSettingsGuard()};

showAppNotification=function(title,message,isError=false){showCenterStatus(`${title}: ${message}`,isError)};


openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default';
function activeSubUserTab(){return openSubUserTabs.find(tab=>tab.key===activeSubUserId)||openSubUserTabs[0]}
function addSubUserTab(){const key=`user-tab-${Date.now()}`;openSubUserTabs.push({key,userId:null,permanent:false});activeSubUserId=key;renderSubUserWorkspace();requestAnimationFrame(()=>document.getElementById('subUserTabSearch')?.focus())}
function activateSubUserTab(key){activeSubUserId=key;renderSubUserWorkspace()}
function closeSubUserWorkspace(event,key){event?.stopPropagation();const tab=openSubUserTabs.find(item=>item.key===key);if(!tab||tab.permanent)return;const index=openSubUserTabs.indexOf(tab);openSubUserTabs=openSubUserTabs.filter(item=>item.key!==key);if(activeSubUserId===key)activeSubUserId=openSubUserTabs[Math.max(0,index-1)]?.key||'default';renderSubUserWorkspace()}
function renderSubUserTabSearch(query=''){
  const hosts=[...document.querySelectorAll('#subUserSearchResults')],host=hosts.find(item=>item.offsetParent!==null)||hosts[0];if(!host)return;const term=String(query).trim().toLowerCase();
  const users=availableSubUsers().filter(user=>[subUserName(user),user.email,user.role,subUserPermission(user).job_title].some(value=>String(value||'').toLowerCase().includes(term)));
  host.innerHTML=users.length?users.map(user=>`<button type="button" class="sub-user-search-result" onclick="selectSubUserForActiveTab('${user.id}')"><div><strong>${escapeHtml(subUserName(user))}</strong><span>${escapeHtml(user.email||'No email')} • ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</span></div><span>Open</span></button>`).join(''):'<div class="sub-user-empty-state">No matching sub-users.</div>';host.hidden=false;
}
function selectSubUserForActiveTab(userId){
  const already=openSubUserTabs.find(tab=>tab.userId===userId);if(already){activeSubUserId=already.key;renderSubUserWorkspace();return}
  const tab=activeSubUserTab();if(!tab)return;if(tab.permanent){openWorkspaceUser(userId);return}tab.userId=userId;const results=document.getElementById('subUserSearchResults');if(results)results.hidden=true;renderSubUserWorkspace();
}
function subUserJournalRows(userId){return(reviewStaffJournals||[]).filter(j=>j.owner_id===userId)}
function lineAccountName(line){return workspaceAccount(line.account_id||line.selected_account_id)?.name||line.account_name||'Unassigned account'}
function renderSubUserWorkspace(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;
  if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}
  tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(item=>item.id===tab.userId),label=user?subUserName(user):'Default';return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" aria-label="Close ${escapeHtml(label)}" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');
  const tab=activeSubUserTab(),user=availableSubUsers().find(item=>item.id===tab?.userId);
  if(!user){panel.innerHTML=`<div class="sub-user-tab-search"><h4>Open a Sub-User Workspace</h4><p>Type a name, email, role, or position. Select a result to use this tab.</p><div class="sub-user-search-wrap"><input id="subUserTabSearch" class="je-input" type="search" autocomplete="off" placeholder="Search sub-users" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div>`;return}
  const permission=subUserPermission(user),journals=subUserJournalRows(user.id),editable=journals.find(j=>['draft','returned'].includes(j.status)&&!j.isSample),sample=journals.some(j=>j.isSample);
  panel.innerHTML=`<div class="sub-user-profile-grid"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(permission.job_title||user.role||'Sub-user')}</strong></div><div class="sub-user-profile-item"><span>Status</span><strong>${escapeHtml(user.status||'Active')}</strong></div></div><div class="sub-user-submit-row"><button type="button" class="je-btn je-btn-emerald" ${editable?'':'disabled'} onclick="submitSubUserJournalForReview('${user.id}')">Submit for Review</button></div>${sample?'<div class="settings-compact-note">Sample preview data only — excluded from accounting records and reports.</div>':''}<div class="settings-section-header"><h4>Entry Submission Activity</h4></div><div class="table-container"><table class="je-table"><thead><tr><th>Period</th><th>Status</th><th>Entries</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${journals.length?journals.map(j=>{const debit=(j.lines||[]).filter(l=>l.direction==='out').reduce((s,l)=>s+Number(l.amount||0),0),credit=(j.lines||[]).filter(l=>l.direction==='in').reduce((s,l)=>s+Number(l.amount||0),0);return`<tr><td>${escapeHtml(String(j.period_start||'').slice(0,7)||'—')}${j.isSample?'<span class="sample-data-pill">SAMPLE</span>':''}</td><td><span class="submission-status ${escapeHtml(j.status)}">${escapeHtml(String(j.status).toUpperCase())}</span></td><td>${j.lines?.length||0}</td><td class="num">${formatAppNumber(debit)}</td><td class="num">${formatAppNumber(credit)}</td></tr>`}).join(''):'<tr><td colspan="5" class="period-empty">No saved journal activity for this user.</td></tr>'}</tbody></table></div>`;
}
function submitSubUserJournalForReview(userId){
  const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status));if(!journal){showCenterStatus('No draft or returned journal is ready for submission.',true);return}
  const name=getLiveUserName(userId);showAppConfirm('Submit for Review',`Submit ${escapeHtml(name)}’s ${String(journal.period_start).slice(0,7)} journal for review? This administrative action will be recorded.`,'Submit',async()=>{const now=new Date().toISOString();const result=await ojmDb.from('staff_journals').update({status:'submitted',submitted_at:now,return_note:null,updated_at:now}).eq('id',journal.id);if(result.error){showCenterStatus(`Submission failed: ${result.error.message}`,true);return}await ojmDb.from('audit_log').insert({table_name:'staff_journals',record_id:String(journal.id),action:'ADMIN_SUBMIT',reason:`Submitted for ${name} by administrator`,actor_id:liveProfile.id,new_data:{owner_id:userId,period_start:journal.period_start}});await loadStaffJournalsForReview();renderSubUserWorkspace();showCenterStatus('Journal submitted for review.')},false)
}

let expandedReviewJournalId='';
function toggleSubmissionReviewCard(id){expandedReviewJournalId=expandedReviewJournalId===id?'':id;renderUserEntryReview()}
function submissionSummaryHtml(journal){
  const grouped={};let debit=0,credit=0;(journal.lines||[]).forEach(line=>{const name=lineAccountName(line);grouped[name]??={debit:0,credit:0};if(line.direction==='out'){grouped[name].debit+=Number(line.amount||0);debit+=Number(line.amount||0)}else{grouped[name].credit+=Number(line.amount||0);credit+=Number(line.amount||0)}});
  return`<div class="submission-review-summary-grid"><div class="submission-account-summary"><div class="submission-summary-heading">Account Totals</div>${Object.entries(grouped).map(([name,total])=>`<div class="submission-account-row"><span>${escapeHtml(name)}</span><span>DR ${formatAppNumber(total.debit)}</span><span>CR ${formatAppNumber(total.credit)}</span></div>`).join('')}</div><div class="submission-grand-totals"><div class="submission-summary-heading">Journal Summary</div><div class="submission-total-row"><span>Total Debit</span><strong>${formatAppNumber(debit)}</strong></div><div class="submission-total-row"><span>Total Credit</span><strong>${formatAppNumber(credit)}</strong></div><div class="submission-total-row overall"><span>Overall Activity</span><strong>${formatAppNumber(debit+credit)}</strong></div></div></div>`;
}
function reviewCardHtml(journal){
  const expanded=expandedReviewJournalId===journal.id,user=journal.sample_owner_name||getLiveUserName(journal.owner_id),sample=journal.isSample,lines=journal.lines||[],total=lines.reduce((sum,line)=>sum+Number(line.amount||0),0);
  return`<section class="submission-review-card ${expanded?'expanded':''} ${sample?'sample':''}"><div class="submission-review-header" onclick="toggleSubmissionReviewCard('${journal.id}')"><div class="submission-review-primary"><span class="submission-user-mark"></span><span class="submission-expand-icon">${expanded?'▼':'▶'}</span><div class="submission-review-title"><strong>${escapeHtml(String(journal.period_start||'').slice(0,7)||'Journal Submission')}${sample?'<span class="sample-data-pill">SAMPLE</span>':''}</strong><span>${lines.length} entries • ${formatAppNumber(total)} • ${escapeHtml(String(journal.status||'submitted').toUpperCase())}</span></div></div><div class="submission-review-side"><span class="submission-review-user">${escapeHtml(user)}</span><div class="submission-review-actions" onclick="event.stopPropagation()">${sample?'<button class="je-btn je-btn-secondary" disabled>Preview Only</button>':journal.status==='submitted'?`<button class="je-btn je-btn-emerald" onclick="approveReviewJournal('${journal.id}')">Approve &amp; Post</button><button class="je-btn je-btn-danger" onclick="returnReviewJournal('${journal.id}')">Return for Correction</button>`:'<span class="submission-status '+escapeHtml(journal.status)+'">'+escapeHtml(String(journal.status).toUpperCase())+'</span>'}</div></div></div>${expanded?`<div class="submission-review-body"><div class="table-container"><table class="je-table"><thead><tr><th>Date</th><th>Account</th><th>Description / Reference</th><th>Type</th><th class="num">Debit</th><th class="num">Credit</th><th>Currency</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${escapeHtml(formatAppDate(line.transaction_date||journal.period_start))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo||'—')}${line.reference?`<div class="je-subtitle">${escapeHtml(line.reference)}</div>`:''}</td><td>${line.direction==='out'?'Expense / Debit':'Income / Credit'}</td><td class="num">${line.direction==='out'?formatAppNumber(line.amount):'—'}</td><td class="num">${line.direction==='in'?formatAppNumber(line.amount):'—'}</td><td>${escapeHtml(line.currency_code||'LAK')}</td></tr>`).join('')}</tbody></table></div>${submissionSummaryHtml(journal)}</div>`:''}</section>`;
}
renderUserEntryReview=function(){
  const host=document.getElementById('userEntryReviewCards');if(!host)return;let rows=(reviewStaffJournals||[]).filter(j=>['submitted','returned','posted'].includes(j.status));
  host.innerHTML=rows.map(reviewCardHtml).join('');const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} submission${rows.length===1?'':'s'} available for review`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=rows.filter(j=>j.status==='submitted'&&!j.isSample).length;
};
function approveReviewJournal(id){showAppConfirm('Approve & Post','Approve this complete journal and post its entries to the accounting records?','Approve & Post',async()=>{await reviewStaffJournal(id,'approve');showCenterStatus('Journal approved and posted.')},false)}
async function returnReviewJournal(id){const explanation=await ui117.prompt('Explain what must be corrected before this journal is resubmitted:');if(!explanation?.trim()){showCenterStatus('A return explanation is required.',true);return}showAppConfirm('Return for Correction','Return this journal to the sub-user with the explanation provided?','Return Journal',async()=>{const{error}=await ojmDb.from('staff_journals').update({status:'returned',return_note:explanation.trim(),reviewed_by:liveProfile.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(error){showCenterStatus(`Return failed: ${error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Journal returned for correction.')},true)}

const initializeFoundationControlsBeforeV2=initializeFoundationControls;
initializeFoundationControls=function(){initializeFoundationControlsBeforeV2();renderSubUserWorkspace();renderUserEntryReview()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{renderSubUserWorkspace();renderUserEntryReview()},{once:true});else{renderSubUserWorkspace();renderUserEntryReview()}

// FOUNDATION V3 — assigned funds, spending categories, workspace overview, and journal preparation.
const SUB_USER_WORKSPACE_KEY='ojm_sub_user_workspace_v3';
function loadSubUserWorkspaceData(){try{return JSON.parse(localStorage.getItem(SUB_USER_WORKSPACE_KEY)||'{}')}catch{return{}}}
function saveSubUserWorkspaceData(data){localStorage.setItem(SUB_USER_WORKSPACE_KEY,JSON.stringify(data))}
function workspaceAccount(idOrName){return(AccountingStore.accounts||[]).find(a=>accountKey(a)===String(idOrName)||a.name===idOrName||a.code===String(idOrName))}
function workspaceAccountName(idOrName,fallback='Unassigned account'){return workspaceAccount(idOrName)?.name||fallback}
function userWorkspaceConfig(user){
  const p=subUserPermission(user),fundIds=(p.assigned_fund_account_ids||[]).filter(Boolean),destinationIds=(p.destination_account_ids?.length?p.destination_account_ids:(p.allowed_account_ids||[])).filter(Boolean);
  const allocations=p.fund_allocations||[];
  return{fundIds,destinationIds,allocations,defaultFund:p.default_out_credit_account_id||fundIds[0]||''}
}
function workspaceEntries(userId){
  const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&j.lines?.length);if(journal)return journal.lines.map(line=>({...line,date:line.transaction_date,status:journal.status,fund_account_id:line.fund_account_id||subUserPermission(availableSubUsers().find(u=>u.id===userId)||{}).default_out_credit_account_id}));
  const data=loadSubUserWorkspaceData();return data[userId]?.entries||[];
}
function persistWorkspaceEntries(userId,entries,status='draft'){
  const data=loadSubUserWorkspaceData();data[userId]={...(data[userId]||{}),entries,status,updated_at:new Date().toISOString()};saveSubUserWorkspaceData(data)
}
function workspaceStatus(userId,entries){const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&j.lines?.length),saved=loadSubUserWorkspaceData()[userId];return journal?.status||saved?.status||(entries.length?'draft':'clear')}
function workspaceStatusLabel(status,count){return status==='submitted'?(count?`${count} In Review`:'In Review'):status==='returned'?(count?`${count} Returned`:'Returned'):status==='approved_pending_post'?'Approved — Journal Ready':status==='posted'?'Posted':count?`${count} Draft${count===1?'':'s'}`:'No Activity'}
function workspaceStatusClass(status){return status==='submitted'?'review':status==='returned'?'returned':status==='approved_pending_post'||status==='posted'?'approved':status==='draft'?'draft':'clear'}
function assignedFundTableHtml(user,entries){const cfg=userWorkspaceConfig(user),activity=entries.length?entries:((reviewStaffJournals||[]).find(j=>j.owner_id===user.id&&String(j.period_start).slice(0,7)===new Date().toISOString().slice(0,7))?.lines||[]);return`<div class="assigned-fund-table"><div class="settings-section-header"><div><h4>Assigned Fund Accounts</h4><p>Workspace activity changes the projected amount only. Official balances change after final journal posting.</p></div></div><div class="table-container"><table class="je-table"><thead><tr><th>Fund Account</th><th class="num">Assigned</th><th class="num">Used</th><th class="num">Remaining</th></tr></thead><tbody>${cfg.fundIds.map(id=>{const assigned=Number(cfg.allocations.find(x=>String(x.account_id)===String(id))?.amount||0),used=activity.filter(e=>String(e.fund_account_id)===String(id)).reduce((s,e)=>s+Number(e.amount||0),0),remaining=assigned-used;return`<tr><td>${escapeHtml(workspaceAccountName(id))}</td><td class="num">${formatAppNumber(assigned)}</td><td class="num">${formatAppNumber(used)}</td><td class="num ${remaining<0?'negative-amount':''}">${formatAppNumber(remaining)}</td></tr>`}).join('')||'<tr><td colspan="4" class="period-empty">Assign a fund account in Settings → Users & Permissions.</td></tr>'}</tbody></table></div></div>`}
function renderWorkspaceHome(){
  const users=availableSubUsers();return`<div class="sub-user-home-search"><h4>Sub-users Workspace</h4><p>Search for a user or review everyone’s assigned funds and submission status below.</p><div class="sub-user-search-wrap"><input id="subUserTabSearch" class="je-input" type="search" autocomplete="off" placeholder="Search sub-users" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div><div class="settings-section-header"><div><h4>User Fund Overview</h4><p>Draft and review figures are provisional and do not affect the official ledger.</p></div></div><div class="table-container"><table class="je-table workspace-home-table"><thead><tr><th>User</th><th class="num">Assigned</th><th class="num">Used</th><th class="num">Remaining</th><th>Status</th></tr></thead><tbody>${users.map(user=>{const entries=workspaceEntries(user.id),cfg=userWorkspaceConfig(user),assigned=cfg.allocations.reduce((s,x)=>s+Number(x.amount||0),0),used=entries.reduce((s,x)=>s+Number(x.amount||0),0),remaining=assigned-used,status=workspaceStatus(user.id,entries);return`<tr class="workspace-user-row" onclick="openWorkspaceUser('${user.id}')"><td><strong>${escapeHtml(subUserName(user))}</strong><small>${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</small></td><td class="num">${formatAppNumber(assigned)}</td><td class="num">${formatAppNumber(used)}</td><td class="num ${remaining<0?'negative-amount':''}">${formatAppNumber(remaining)}</td><td><span class="workspace-status-badge ${workspaceStatusClass(status)}">${escapeHtml(workspaceStatusLabel(status,entries.length))}</span></td></tr>`}).join('')||'<tr><td colspan="5" class="period-empty">No sub-users available.</td></tr>'}</tbody></table></div>`
}
function openWorkspaceUser(userId){let tab=openSubUserTabs.find(t=>String(t.userId)===String(userId));if(!tab){tab={key:`user-${userId}`,userId:String(userId),permanent:false};openSubUserTabs.push(tab)}activeSubUserId=tab.key;renderSubUserWorkspace()}
function workspaceEntryFormHtml(user){const cfg=userWorkspaceConfig(user),fundOptions=cfg.fundIds.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(workspaceAccountName(id))}</option>`).join(''),destinationOptions=cfg.destinationIds.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(workspaceAccountName(id))}</option>`).join('');return`<section class="workspace-entry-card"><div class="settings-section-header"><div><h4>Record Fund Usage</h4><p>Save each purchase here. It remains outside the official journal until reviewed and posted.</p></div></div><div class="workspace-entry-grid"><div class="settings-field"><label>Date</label><input id="workspaceEntryDate" class="je-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="settings-field"><label>Assigned Fund (Credit)</label><select id="workspaceEntryFund" class="je-select">${fundOptions}</select></div><div class="settings-field"><label>Spending Account (Debit)</label><select id="workspaceEntryDestination" class="je-select">${destinationOptions}</select></div><div class="settings-field"><label>Amount</label><input id="workspaceEntryAmount" class="je-input" type="number" min="0.01" step="0.01" placeholder="0.00"></div><div class="settings-field span-2"><label>Description</label><input id="workspaceEntryMemo" class="je-input" placeholder="What was purchased?"></div><div class="settings-field"><label>Receipt / Reference</label><input id="workspaceEntryReference" class="je-input" placeholder="Optional"></div></div><div class="settings-form-actions compact-actions"><button type="button" class="je-btn je-btn-emerald" onclick="saveWorkspaceEntry('${user.id}')">Save Entry</button></div></section>`}
function workspaceEntryTableHtml(user,entries){return`<section class="workspace-entry-card"><div class="settings-section-header"><div><h4>Entries Waiting for Submission</h4><p>${entries.length} saved entr${entries.length===1?'y':'ies'} in this workspace.</p></div></div><div class="table-container"><table class="je-table"><thead><tr><th>Date</th><th>Assigned Fund (CR)</th><th>Spending Account (DR)</th><th>Description / Reference</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>${entries.map(e=>`<tr><td>${escapeHtml(formatAppDate(e.date))}</td><td>${escapeHtml(workspaceAccountName(e.fund_account_id))}</td><td>${escapeHtml(workspaceAccountName(e.account_id))}</td><td>${escapeHtml(e.memo)}${e.reference?`<small>${escapeHtml(e.reference)}</small>`:''}</td><td class="num">${formatAppNumber(e.amount)}</td><td><span class="submission-status ${escapeHtml(e.status||'draft')}">${escapeHtml(String(e.status||'draft').toUpperCase())}</span></td></tr>`).join('')||'<tr><td colspan="6" class="period-empty">No entries saved.</td></tr>'}</tbody></table></div></section>`}
function saveWorkspaceEntry(userId){const date=document.getElementById('workspaceEntryDate')?.value,fund=document.getElementById('workspaceEntryFund')?.value,account=document.getElementById('workspaceEntryDestination')?.value,amount=parseAppNumber(document.getElementById('workspaceEntryAmount')?.value||0),memo=document.getElementById('workspaceEntryMemo')?.value.trim(),reference=document.getElementById('workspaceEntryReference')?.value.trim();if(!date||!fund||!account||!amount||!memo){showCenterStatus('Complete the date, assigned fund, spending account, description, and amount.',true);return}const entries=workspaceEntries(userId);entries.push({id:`workspace-${Date.now()}`,date,fund_account_id:fund,account_id:account,amount,memo,reference,currency_code:workspaceAccount(fund)?.currency||'LAK',status:'draft'});persistWorkspaceEntries(userId,entries,'draft');renderSubUserWorkspace();showCenterStatus('Entry saved to the user workspace.')}
function submitWorkspaceForReview(userId){const entries=workspaceEntries(userId);if(!entries.length){showCenterStatus('There are no saved entries to submit.',true);return}showAppConfirm('Submit for Review',`Submit ${entries.length} saved entr${entries.length===1?'y':'ies'}? The batch will be locked while under review.`,'Submit',()=>{entries.forEach(e=>e.status='submitted');persistWorkspaceEntries(userId,entries,'submitted');renderSubUserWorkspace();renderUserEntryReview();showCenterStatus('Submission sent for review.')},false)}
renderSubUserWorkspace=function(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;if(!openSubUserTabs.length)openSubUserTabs=[{key:'default',userId:null,permanent:true}];
  tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(u=>u.id===tab.userId),label=tab.permanent?'Home':user?subUserName(user):'New Tab';return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');
  const tab=activeSubUserTab();if(tab?.permanent){panel.innerHTML=renderWorkspaceHome();return}const user=availableSubUsers().find(u=>String(u.id)===String(tab?.userId));if(!user){panel.innerHTML='<div class="sub-user-empty-state">This user workspace could not be loaded. Close this tab and select the user again.</div>';return}
  const entries=workspaceEntries(user.id),status=workspaceStatus(user.id,entries),locked=status==='submitted',p=subUserPermission(user);
  panel.innerHTML=`<section class="workspace-main-card"><div class="sub-user-profile-grid"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(p.job_title||user.role||'Sub-user')}</strong></div><div class="sub-user-profile-item"><span>Account Status</span><strong>${escapeHtml(user.status||'Active')}</strong></div></div><div class="workspace-status-row"><button type="button" class="workspace-status-badge ${workspaceStatusClass(status)}" onclick="openUserSubmissionReview('${user.id}')">${escapeHtml(workspaceStatusLabel(status,entries.length))}</button><button type="button" class="je-btn je-btn-emerald" ${!entries.length||locked?'disabled':''} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div>${assignedFundTableHtml(user,entries)}</section>${locked?'<div class="settings-compact-note">This batch is under review and is locked. Open its status badge to inspect it or request a reasoned adjustment.</div>':workspaceEntryFormHtml(user)}${workspaceEntryTableHtml(user,entries)}`
};
function workspaceReviewJournals(){return availableSubUsers().map(user=>{if((reviewStaffJournals||[]).some(j=>j.owner_id===user.id&&j.lines?.length))return null;const entries=workspaceEntries(user.id),status=workspaceStatus(user.id,entries);if(!entries.length||!['submitted','returned','approved_pending_post'].includes(status))return null;return{id:`workspace-review-${user.id}`,owner_id:user.id,period_start:(entries[0]?.date||new Date().toISOString()).slice(0,7)+'-01',status,isWorkspace:true,lines:entries.map(e=>({...e,transaction_date:e.date,direction:'out',account_name:workspaceAccountName(e.account_id),fund_account_name:workspaceAccountName(e.fund_account_id)}))}}).filter(Boolean)}
function allReviewJournals(){const real=(reviewStaffJournals||[]).filter(j=>j.lines?.length),workspace=workspaceReviewJournals();return[...workspace,...real.filter(realJournal=>!workspace.some(workspaceJournal=>workspaceJournal.owner_id===realJournal.owner_id&&workspaceJournal.period_start===realJournal.period_start))]}
function doubleEntryLines(journal){return(journal.lines||[]).flatMap(line=>line.direction==='in'?[{...line,side:'debit',displayAccount:line.fund_account_name||workspaceAccountName(line.fund_account_id,'Assigned receipt fund')},{...line,side:'credit',displayAccount:lineAccountName(line)}]:[{...line,side:'debit',displayAccount:lineAccountName(line)},{...line,side:'credit',displayAccount:line.fund_account_name||workspaceAccountName(line.fund_account_id,'Assigned fund account')}])}
function submissionSummaryHtml(journal){const grouped={};doubleEntryLines(journal).forEach(line=>{grouped[line.displayAccount]??={debit:0,credit:0};grouped[line.displayAccount][line.side]+=Number(line.amount||0)});const debit=Object.values(grouped).reduce((s,x)=>s+x.debit,0),credit=Object.values(grouped).reduce((s,x)=>s+x.credit,0);return`<div class="submission-review-summary-grid"><div class="submission-account-summary"><div class="submission-summary-heading">Account Totals</div>${Object.entries(grouped).map(([name,t])=>`<div class="submission-account-row"><span>${escapeHtml(name)}</span><span>DR ${formatAppNumber(t.debit)}</span><span>CR ${formatAppNumber(t.credit)}</span></div>`).join('')}</div><div class="submission-grand-totals"><div class="submission-summary-heading">Balanced Journal</div><div class="submission-total-row"><span>Total Debit</span><strong>${formatAppNumber(debit)}</strong></div><div class="submission-total-row"><span>Total Credit</span><strong>${formatAppNumber(credit)}</strong></div></div></div>`}
function reviewCardHtml(journal){const expanded=expandedReviewJournalId===journal.id,user=getLiveUserName(journal.owner_id),lines=doubleEntryLines(journal),total=(journal.lines||[]).reduce((s,l)=>s+Number(l.amount||0),0);return`<section class="submission-review-card ${expanded?'expanded':''}"><div class="submission-review-header" onclick="toggleSubmissionReviewCard('${journal.id}')"><div class="submission-review-primary"><span class="submission-user-mark"></span><span class="submission-expand-icon">${expanded?'▼':'▶'}</span><div class="submission-review-title"><strong>${escapeHtml(String(journal.period_start||'').slice(0,7)||'Submission')}</strong><span>${journal.lines.length} transactions • ${formatAppNumber(total)} • ${escapeHtml(workspaceStatusLabel(journal.status,journal.lines.length))}</span></div></div><div class="submission-review-side"><span class="submission-review-user">${escapeHtml(user)}</span><div class="submission-review-actions" onclick="event.stopPropagation()"><button class="je-btn je-btn-secondary" onclick="openSubmissionComparison('${journal.id}')">Compare</button>${journal.status==='submitted'?`<button class="je-btn je-btn-emerald" onclick="prepareReviewJournal('${journal.id}')">Approve &amp; Prepare Journal</button><button class="je-btn je-btn-danger" onclick="returnReviewJournal('${journal.id}')">Return for Correction</button>`:`<span class="submission-status ${escapeHtml(journal.status)}">${escapeHtml(workspaceStatusLabel(journal.status,journal.lines.length))}</span>`}</div></div></div>${expanded?`<div class="submission-review-body"><div class="table-container"><table class="je-table"><thead><tr><th>Date</th><th>Account</th><th>Description / Reference</th><th class="num">Debit</th><th class="num">Credit</th><th>Currency</th></tr></thead><tbody>${lines.map(l=>`<tr><td>${escapeHtml(formatAppDate(l.transaction_date))}</td><td>${escapeHtml(l.displayAccount)}</td><td>${escapeHtml(l.memo||'—')}${l.reference?`<small>${escapeHtml(l.reference)}</small>`:''}</td><td class="num">${l.side==='debit'?formatAppNumber(l.amount):'—'}</td><td class="num">${l.side==='credit'?formatAppNumber(l.amount):'—'}</td><td>${escapeHtml(l.currency_code||'LAK')}</td></tr>`).join('')}</tbody></table></div>${submissionSummaryHtml(journal)}</div>`:''}</section>`}
renderUserEntryReview=function(){const host=document.getElementById('userEntryReviewCards');if(!host)return;const rows=allReviewJournals().filter(j=>j.status==='submitted'||j.status==='returned');host.innerHTML=rows.length?rows.map(reviewCardHtml).join(''):'<div class="legal-doc-empty">No submissions are waiting for review.</div>';const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${rows.length} submission${rows.length===1?'':'s'} needs attention`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=rows.filter(j=>j.status==='submitted').length};
let pendingWorkspacePostOwnerId='',pendingWorkspacePostJournalId='',pendingWorkspacePostIsLocal=false;
function prepareReviewJournal(id){const journal=allReviewJournals().find(j=>j.id===id);if(!journal)return;showAppConfirm('Approve & Prepare Journal','Approve this submission and copy its balanced debit and credit lines into Post Double Entry for final checking? Nothing will be posted until you press Post Entry there.','Prepare Journal',()=>{switchTab('journal');const multi=document.getElementById('jeMultipleDates');if(multi)multi.checked=true;document.body.classList.add('je-multi-date');const body=document.getElementById('jeLinesBody');if(body)body.innerHTML='';document.getElementById('jeGeneralMemo').value=`Sub-user submission — ${getLiveUserName(journal.owner_id)} — ${String(journal.period_start).slice(0,7)}`;(journal.lines||[]).forEach(line=>{const memo=[line.memo,line.reference].filter(Boolean).join(' • '),currency=line.currency_code||'LAK',debitName=lineAccountName(line),creditName=line.fund_account_name||workspaceAccountName(line.fund_account_id,'Head Cook Petty Cash');addJournalLineRow(debitName,memo,String(line.amount),{});const debitRow=body.lastElementChild;if(debitRow?.querySelector('.je-line-date'))debitRow.querySelector('.je-line-date').value=line.transaction_date;addJournalLineRow(creditName,memo,'',{[currency]:String(line.amount)});const creditRow=body.lastElementChild;if(creditRow?.querySelector('.je-line-date'))creditRow.querySelector('.je-line-date').value=line.transaction_date});calculateJournalBalance();pendingWorkspacePostOwnerId=journal.owner_id;pendingWorkspacePostJournalId=journal.id;pendingWorkspacePostIsLocal=Boolean(journal.isWorkspace);showCenterStatus('Submission approved and copied to Post Double Entry. Check it, then press Post Entry when ready.')},false)}
returnReviewJournal=async function(id){const journal=allReviewJournals().find(j=>j.id===id);if(!journal)return;const explanation=await ui117.prompt('Explain what must be corrected before this submission is resubmitted:');if(!explanation?.trim()){showCenterStatus('A return explanation is required.',true);return}showAppConfirm('Return for Correction','Return this submission with the explanation provided?','Return Submission',async()=>{if(journal.isWorkspace){const data=loadSubUserWorkspaceData();data[journal.owner_id]={...(data[journal.owner_id]||{}),status:'returned',return_note:explanation.trim(),adjusted:true,updated_at:new Date().toISOString()};(data[journal.owner_id].entries||[]).forEach(e=>e.status='returned');saveSubUserWorkspaceData(data);renderUserEntryReview();renderSubUserWorkspace();showCenterStatus('Submission returned with a recorded explanation.');return}const{error}=await ojmDb.from('staff_journals').update({status:'returned',return_note:explanation.trim(),reviewed_by:liveProfile.id,reviewed_at:new Date().toISOString()}).eq('id',id);if(error){showCenterStatus(`Return failed: ${error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Journal returned for correction.')},true)};
approveReviewJournal=prepareReviewJournal;
renderPermissionGrid=function(selected=[]){const host=document.getElementById('userPermissionGrid');if(host)host.innerHTML=PERMISSION_MODULES.filter(([id])=>id!=='submissions').map(([id,label])=>`<label class="permission-option"><input type="checkbox" value="${id}" ${selected.includes(id)?'checked':''}><span>${label}</span></label>`).join('')};
const submitJournalEntryBeforeWorkspacePost=submitJournalEntry;
submitJournalEntry=async function(){const ownerId=pendingWorkspacePostOwnerId,journalId=pendingWorkspacePostJournalId,isLocal=pendingWorkspacePostIsLocal,before=JournalModule.entries.length,result=await submitJournalEntryBeforeWorkspacePost();if(ownerId&&JournalModule.entries.length>before){if(isLocal){const data=loadSubUserWorkspaceData();if(data[ownerId]){data[ownerId].status='posted';data[ownerId].posted_at=new Date().toISOString();saveSubUserWorkspaceData(data)}}else if(journalId){await ojmDb.from('staff_journals').update({status:'posted',reviewed_by:liveProfile.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',journalId);await loadStaffJournalsForReview()}pendingWorkspacePostOwnerId='';pendingWorkspacePostJournalId='';pendingWorkspacePostIsLocal=false}return result};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{renderSubUserWorkspace();renderUserEntryReview()},{once:true});else{renderSubUserWorkspace();renderUserEntryReview()}

// Fresh authentication already enters through Dashboard in hydrateSupabaseSession.
// Do not force Dashboard again when Supabase refreshes an existing session: doing
// so loses the user's current module whenever the browser tab regains focus.

function toggleSubmissionHistory(force){
  const panel=document.getElementById('userEntryHistoryPanel');if(!panel)return;
  panel.hidden=typeof force==='boolean'?!force:!panel.hidden;
  const trigger=document.querySelector('#user-entry-review .settings-page-heading button');
  trigger?.setAttribute('aria-expanded',String(!panel.hidden));
  if(!panel.hidden){renderUserEntryReview();panel.scrollIntoView({behavior:'smooth',block:'start'})}
}
function openSubmissionComparison(id){const journal=allReviewJournals().find(j=>j.id===id);if(!journal)return;document.getElementById('submissionComparisonOverlay')?.remove();const doubleLines=doubleEntryLines(journal),overlay=document.createElement('div');overlay.id='submissionComparisonOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<div class="submission-compare-window"><div class="submission-compare-header"><div><strong>Single Entry ↔ Double Entry Comparison</strong><span>${escapeHtml(getLiveUserName(journal.owner_id))} • ${escapeHtml(String(journal.period_start).slice(0,7))}</span></div><button type="button" class="modal-close-x" onclick="document.getElementById('submissionComparisonOverlay').remove()">&times;</button></div><div class="submission-compare-grid"><section><h4>Converted Double Entry</h4><div class="table-container"><table class="je-table"><thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${doubleLines.map((l,i)=>`<tr data-compare-index="${Math.floor(i/2)}"><td>${escapeHtml(l.displayAccount)}</td><td class="num">${l.side==='debit'?formatAppNumber(l.amount):''}</td><td class="num">${l.side==='credit'?formatAppNumber(l.amount):''}</td></tr>`).join('')}</tbody></table></div></section><section><h4>Original Single Entry</h4><div class="table-container"><table class="je-table"><thead><tr><th>Date</th><th>Fund → Spending</th><th>Description</th><th class="num">Amount</th></tr></thead><tbody>${(journal.lines||[]).map((l,i)=>`<tr data-compare-index="${i}"><td>${escapeHtml(formatAppDate(l.transaction_date))}</td><td>${escapeHtml((l.fund_account_name||workspaceAccountName(l.fund_account_id,'Assigned Fund'))+' → '+lineAccountName(l))}</td><td>${escapeHtml(l.memo||'')}${l.reference?`<small>${escapeHtml(l.reference)}</small>`:''}</td><td class="num">${formatAppNumber(l.amount)}</td></tr>`).join('')}</tbody></table></div></section></div></div>`;document.body.appendChild(overlay);overlay.querySelectorAll('tr[data-compare-index]').forEach(row=>{const highlight=()=>{overlay.querySelectorAll('tr.is-compare-linked').forEach(n=>n.classList.remove('is-compare-linked'));overlay.querySelectorAll(`tr[data-compare-index="${row.dataset.compareIndex}"]`).forEach(n=>n.classList.add('is-compare-linked'))};row.addEventListener('mouseenter',highlight);row.addEventListener('click',highlight)})}

// FOUNDATION V4 — secure shared sub-user workspace and compact permission pickers.
let activeAccessPicker={panel:null,placeholder:null,trigger:null};
function openAccessPicker(title,panelId,trigger){const panel=document.getElementById(panelId),content=document.getElementById('accessPickerContent');if(!panel||!content)return;const placeholder=document.createComment(`restore-${panelId}`);panel.parentNode.insertBefore(placeholder,panel);panel.hidden=false;content.appendChild(panel);activeAccessPicker={panel,placeholder,trigger};document.getElementById('accessPickerTitle').textContent=title;const search=document.getElementById('accessPickerSearch');if(search)search.value='';trigger?.classList.add('is-open');openModal('modalAccessPicker');requestAnimationFrame(()=>search?.focus())}
function closeAccessPicker(){const{panel,placeholder,trigger}=activeAccessPicker;if(panel&&placeholder?.parentNode){placeholder.parentNode.insertBefore(panel,placeholder);placeholder.remove();panel.hidden=true}trigger?.classList.remove('is-open');activeAccessPicker={panel:null,placeholder:null,trigger:null};closeModal('modalAccessPicker');updateUserAccessSummaries()}
function filterAccessPicker(query=''){const term=String(query).trim().toLowerCase(),content=document.getElementById('accessPickerContent');content?.querySelectorAll('label.permission-option,label.settings-toggle').forEach(label=>label.hidden=Boolean(term&&!label.textContent.toLowerCase().includes(term)))}
function selectedAccessLabels(selector){return[...document.querySelectorAll(selector)].filter(input=>input.checked).map(input=>input.closest('label')?.querySelector('strong,span')?.textContent.trim()||input.value)}
function accessSummaryHtml(items,empty){if(!items.length)return escapeHtml(empty);const visible=items.slice(0,9),extra=items.length-visible.length;return`<ul>${visible.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}${extra?`<li>+${extra} more</li>`:''}</ul>`}
function updateUserAccessSummaries(){
  const modules=selectedAccessLabels('#userPermissionGrid input'),actions=selectedAccessLabels('#userSecurityAccessPanel input'),funds=[...document.querySelectorAll('#userFundAccountGrid input[type="checkbox"]:checked')],entries=[...document.querySelectorAll('#userAccountAccessGrid input:checked')];
  const moduleSummary=document.getElementById('userModuleAccessSummary'),securitySummary=document.getElementById('userSecurityAccessSummary'),accountSummary=document.getElementById('userAccountAssignmentSummary');
  if(moduleSummary)moduleSummary.innerHTML=accessSummaryHtml(modules,'Workspace only');
  if(securitySummary)securitySummary.innerHTML=accessSummaryHtml(actions,'No special actions selected');
  if(accountSummary){const names=[...funds,...entries].map(input=>input.closest('label')?.querySelector('span')?.textContent.trim()).filter(Boolean);accountSummary.innerHTML=accessSummaryHtml(names,`${funds.length} main account${funds.length===1?'':'s'} • ${document.getElementById('permissionAllowAnyAccount')?.checked?'All':entries.length} entry account${entries.length===1?'':'s'}`)}
}
document.addEventListener('change',event=>{if(event.target.closest('#modalUserAccess'))updateUserAccessSummaries()});
const openUserAccessEditorBeforeCompactPickers=openUserAccessEditor;
openUserAccessEditor=function(id=''){openUserAccessEditorBeforeCompactPickers(id);['userModuleAccessPanel','userSecurityAccessPanel','userAccountAssignmentPanel'].forEach(panelId=>{const panel=document.getElementById(panelId);if(panel)panel.hidden=true});updateUserAccessSummaries()};

availableSubUsers=function(){
  if(liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review')))return[{...liveProfile,user_permissions:livePermission||{}}];
  return[...((liveProfiles?.length?liveProfiles:DemoAccess.users)||[])].filter(user=>user.id!==liveProfile?.id&&user.id!==DemoAccess.currentUser?.id&&user.role!=='admin')
};
loadStaffJournalsForReview=async function(){
  if(!ojmDb||!liveProfile)return;const reviewer=liveProfile.role==='admin'||Boolean(livePermission?.can_approve);let query=ojmDb.from('staff_journals').select('*').order('submitted_at',{ascending:false});if(!reviewer)query=query.eq('owner_id',liveProfile.id);
  const journals=await query;if(journals.error){showCenterStatus(`Workspace unavailable: ${journals.error.message}`,true);return}const ids=(journals.data||[]).map(j=>j.id),lines=ids.length?await ojmDb.from('staff_journal_lines').select('*').in('staff_journal_id',ids):{data:[]};reviewStaffJournals=(journals.data||[]).map(j=>({...j,lines:(lines.data||[]).filter(line=>line.staff_journal_id===j.id)}));renderUserEntryReview();renderSubUserWorkspace()
};

const applyPermissionAccessBeforeWorkspaceSecurity=applyPermissionAccess;
applyPermissionAccess=function(){
  applyPermissionAccessBeforeWorkspaceSecurity();if(!liveProfile)return;applyGranularPermissionAccess()
};
const switchTabBeforeWorkspaceSecurity=switchTab;
switchTab=function(tabId){
  if(liveProfile&&!canAccessAppTarget(tabId)){const parent=permissionTreeNodeForTarget(tabId),fallback=parent?.children.find(([target])=>canAccessAppTarget(target))?.[0]||firstPermittedAppTarget();showCenterStatus('This module is not included in your access permissions.',true);if(!fallback)return;if(fallback.startsWith('sec-'))return scrollToAccountModule(fallback);tabId=fallback}return switchTabBeforeWorkspaceSecurity(tabId)
};

let workspaceEditingLineId='';
function workspaceJournalForDate(userId,date){const month=String(date).slice(0,7);return(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&String(j.period_start).slice(0,7)===month)}
saveWorkspaceEntry=async function(userId){
  if(!ojmDb||!liveProfile)return;const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only save entries in your own workspace.',true);return}
  const date=document.getElementById('workspaceEntryDate')?.value,fund=document.getElementById('workspaceEntryFund')?.value,account=document.getElementById('workspaceEntryDestination')?.value,amount=parseAppNumber(document.getElementById('workspaceEntryAmount')?.value||0),memo=document.getElementById('workspaceEntryMemo')?.value.trim(),reference=document.getElementById('workspaceEntryReference')?.value.trim();if(!date||!fund||!account||!amount||!memo){showCenterStatus('Complete the date, main account, entry account, description, and amount.',true);return}
  let journal=workspaceJournalForDate(userId,date);if(journal&&!['draft','returned'].includes(journal.status)){showCenterStatus('That month is locked because it has already been submitted.',true);return}
  if(!journal){const month=date.slice(0,7),payload={owner_id:userId,period_start:`${month}-01`,period_end:new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).toISOString().slice(0,10),status:'draft',updated_at:new Date().toISOString()};const created=await ojmDb.from('staff_journals').upsert(payload,{onConflict:'owner_id,period_start'}).select().single();if(created.error){showCenterStatus(`Entry save failed: ${created.error.message}`,true);return}journal={...created.data,lines:[]}}
  const linePayload={transaction_date:date,direction:'out',fund_account_id:fund,account_id:account,memo,reference:reference||'',amount,currency_code:workspaceAccount(fund)?.currency||'LAK'};if(workspaceEditingLineId){const updated=await ojmDb.from('staff_journal_lines').update(linePayload).eq('id',workspaceEditingLineId).eq('staff_journal_id',journal.id);if(updated.error){showCenterStatus(`Entry update failed: ${updated.error.message}`,true);return}workspaceEditingLineId='';await loadStaffJournalsForReview();showCenterStatus('Workspace entry updated.');return}
  const nextLine=Math.max(0,...(journal.lines||[]).map(line=>Number(line.line_no)||0))+1,inserted=await ojmDb.from('staff_journal_lines').insert({staff_journal_id:journal.id,line_no:nextLine,...linePayload});if(inserted.error){showCenterStatus(`Entry save failed: ${inserted.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Entry saved to the user workspace.')
};
submitWorkspaceForReview=async function(userId){
  const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status)&&j.lines?.length);if(!journal){showCenterStatus('There are no saved entries ready to submit.',true);return}const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only submit your own workspace.',true);return}
  showAppConfirm('Submit for Review',`Submit ${journal.lines.length} saved entr${journal.lines.length===1?'y':'ies'}? This batch will be locked during review.`,'Submit',async()=>{let result;if(staff)result=await ojmDb.rpc('submit_staff_journal',{p_journal_id:journal.id});else result=await ojmDb.from('staff_journals').update({status:'submitted',submitted_at:new Date().toISOString(),return_note:null,updated_at:new Date().toISOString()}).eq('id',journal.id);if(result.error){showCenterStatus(`Submission failed: ${result.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Submission sent for review.')},false)
};

workspaceEntryTableHtml=function(user,entries){const editable=entries.every(entry=>['draft','returned'].includes(entry.status||'draft'));return`<section class="workspace-entry-card"><div class="settings-section-header"><div><h4>Entries Waiting for Submission</h4><p>${entries.length} saved entr${entries.length===1?'y':'ies'} in this workspace.</p></div></div><div class="table-container"><table class="je-table"><thead><tr><th>Date</th><th>Main Account (CR)</th><th>Entry Account (DR)</th><th>Description / Reference</th><th class="num">Amount</th>${editable?'<th>Action</th>':''}</tr></thead><tbody>${entries.map(entry=>`<tr><td>${escapeHtml(formatAppDate(entry.date||entry.transaction_date))}</td><td>${escapeHtml(workspaceAccountName(entry.fund_account_id))}</td><td>${escapeHtml(workspaceAccountName(entry.account_id))}</td><td>${escapeHtml(entry.memo||'')}${entry.reference?`<small>${escapeHtml(entry.reference)}</small>`:''}</td><td class="num">${formatAppNumber(entry.amount||0)}</td>${editable?`<td><div class="transaction-review-actions"><button type="button" class="je-btn je-btn-secondary" onclick="editWorkspaceEntry('${user.id}','${entry.id}')">Edit</button><button type="button" class="je-btn je-btn-danger" onclick="deleteWorkspaceEntry('${user.id}','${entry.id}')">Delete</button></div></td>`:''}</tr>`).join('')||`<tr><td colspan="${editable?6:5}" class="period-empty">No entries saved.</td></tr>`}</tbody></table></div></section>`};
function editWorkspaceEntry(userId,lineId){const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status)&&j.lines?.some(line=>line.id===lineId)),line=journal?.lines.find(item=>item.id===lineId);if(!line){showCenterStatus('Only draft or returned entries can be edited.',true);return}workspaceEditingLineId=lineId;document.getElementById('workspaceEntryDate').value=line.transaction_date;document.getElementById('workspaceEntryFund').value=line.fund_account_id||'';document.getElementById('workspaceEntryDestination').value=line.account_id||'';document.getElementById('workspaceEntryAmount').value=line.amount||'';document.getElementById('workspaceEntryMemo').value=line.memo||'';document.getElementById('workspaceEntryReference').value=line.reference||'';document.getElementById('workspaceEntryMemo').focus();showCenterStatus('Entry opened for editing. Save Entry will update this record.')}
function deleteWorkspaceEntry(userId,lineId){const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status)&&j.lines?.some(line=>line.id===lineId));if(!journal){showCenterStatus('Only draft or returned entries can be deleted.',true);return}showAppConfirm('Delete Workspace Entry','Delete this unsubmitted entry? This cannot be undone.','Delete',async()=>{const result=await ojmDb.from('staff_journal_lines').delete().eq('id',lineId).eq('staff_journal_id',journal.id);if(result.error){showCenterStatus(`Delete failed: ${result.error.message}`,true);return}if(workspaceEditingLineId===lineId)workspaceEditingLineId='';await loadStaffJournalsForReview();showCenterStatus('Workspace entry deleted.')},true)}
async function reopenWorkspaceSubmission(journalId){const journal=(reviewStaffJournals||[]).find(j=>j.id===journalId&&j.owner_id===liveProfile?.id&&j.status==='submitted');if(!journal){showCenterStatus('Only your own in-review submission can be reopened.',true);return}const reason=await ui117.prompt('Explain why this submission must be reopened:');if(!reason?.trim()){showCenterStatus('A reason is required to reopen a submitted batch.',true);return}const result=await ojmDb.rpc('reopen_staff_journal',{p_journal_id:journal.id,p_reason:reason.trim()});if(result.error){showCenterStatus(`Reopen failed: ${result.error.message}`,true);return}document.getElementById('workspaceReviewOverlay')?.remove();await loadStaffJournalsForReview();showCenterStatus('Submission reopened for correction. The adjustment reason was recorded.')}

function workspaceReviewSingleTable(journal){return`<div class="table-container"><table class="je-table"><thead><tr><th>Entry ID</th><th>Date</th><th>Main Account</th><th>Entry Account</th><th>Description / Reference</th><th class="num">Amount</th></tr></thead><tbody>${(journal.lines||[]).map(line=>`<tr><td><strong class="workspace-entry-number">${escapeHtml(line.workspace_entry_no||'Legacy Entry')}</strong></td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(line.fund_account_name||workspaceAccountName(line.fund_account_id,'Assigned Fund'))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo||'—')}${line.reference?`<small>${escapeHtml(line.reference)}</small>`:''}</td><td class="num">${formatAppNumber(line.amount||0)}</td></tr>`).join('')}</tbody></table></div>`}
function openWorkspaceReview(userId){
  const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only review your own submissions.',true);return}const user=availableSubUsers().find(u=>u.id===userId)||liveProfile,journals=(reviewStaffJournals||[]).filter(j=>j.owner_id===userId&&j.lines?.length);document.getElementById('workspaceReviewOverlay')?.remove();const overlay=document.createElement('div');overlay.id='workspaceReviewOverlay';overlay.className='submission-compare-overlay workspace-review-overlay';overlay.innerHTML=`<div class="submission-compare-window"><div class="submission-compare-header"><div><strong>${staff?'My Submission Review':'Employee Submission Review'}</strong><span>${escapeHtml(subUserName(user||{}))} • ${journals.length} submission${journals.length===1?'':'s'}</span></div><button type="button" class="modal-close-x" onclick="document.getElementById('workspaceReviewOverlay').remove()">&times;</button></div><div class="workspace-review-scroll">${journals.length?journals.map((journal,index)=>`<details class="workspace-review-record" ${index===0?'open':''}><summary><span><strong>${escapeHtml(String(journal.period_start).slice(0,7))}</strong><small>${journal.lines.length} entries • ${journal.lines.reduce((sum,line)=>sum+Number(line.amount||0),0).toLocaleString(appNumberLocale(),{minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()})}</small></span><span class="submission-status ${escapeHtml(journal.status)}">${escapeHtml(String(journal.status).replaceAll('_',' ').toUpperCase())}</span></summary>${workspaceReviewSingleTable(journal)}${journal.return_note?`<div class="submission-reason">Correction note: ${escapeHtml(journal.return_note)}</div>`:''}${staff&&journal.status==='submitted'?`<div class="workspace-review-record-actions"><button type="button" class="je-btn je-btn-danger" onclick="reopenWorkspaceSubmission('${journal.id}')">Reopen for Correction</button></div>`:''}</details>`).join(''):'<div class="legal-doc-empty">No saved or submitted entries yet.</div>'}</div></div>`;document.body.appendChild(overlay)
}
renderSubUserWorkspace=function(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;const staff=liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));
  if(staff){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:true}];activeSubUserId='self'}else if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}
  tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(u=>u.id===tab.userId),label=staff?subUserName(user||liveProfile):(tab.permanent?'Home':user?subUserName(user):'New Tab');return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');const add=document.querySelector('.sub-user-add-tab');if(add)add.hidden=Boolean(staff);
  const tab=activeSubUserTab();if(tab?.permanent&&!staff){panel.innerHTML=renderWorkspaceHome();return}const user=availableSubUsers().find(u=>String(u.id)===String(tab?.userId));if(!user){panel.innerHTML='<div class="sub-user-empty-state">This user workspace could not be loaded.</div>';return}
  const entries=workspaceEntries(user.id),status=workspaceStatus(user.id,entries),locked=['submitted','approved_pending_post','posted'].includes(status),p=subUserPermission(user),inReview=(reviewStaffJournals||[]).filter(j=>j.owner_id===user.id&&j.status==='submitted').length;
  panel.innerHTML=`<section class="workspace-main-card"><div class="sub-user-profile-grid workspace-profile-actions"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(p.job_title||user.role||'Sub-user')}</strong></div><div class="workspace-inline-actions"><button type="button" class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}')">Review &amp; History</button><button type="button" class="workspace-status-badge ${workspaceStatusClass(status)}" onclick="openWorkspaceReview('${user.id}')">${escapeHtml(workspaceStatusLabel(status,entries.length))}${inReview?` (${inReview})`:''}</button><button type="button" class="je-btn je-btn-emerald" ${!entries.length||locked?'disabled':''} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div></div>${assignedFundTableHtml(user,entries)}</section>${locked?'<div class="settings-compact-note">This batch is locked while under review or after posting. Use Review & History to inspect it.</div>':workspaceEntryFormHtml(user)}${workspaceEntryTableHtml(user,entries)}`
};

const hydrateSupabaseSessionBeforeSecureWorkspace=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforeSecureWorkspace(session);if(!liveProfile)return;applyPermissionAccess();/* Initial destination is chosen once by the session navigation coordinator. */};

const updateGlobalExportToolsBeforeWorkspacePrint=updateGlobalExportTools;
updateGlobalExportTools=function(tabId){updateGlobalExportToolsBeforeWorkspacePrint(tabId);const csv=document.getElementById('global-csv-btn'),print=document.getElementById('global-print-btn'),staff=liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(csv&&staff)csv.hidden=!livePermission?.can_export;if(print&&staff)print.hidden=tabId!=='sub-users-workspace'};

// FOUNDATION V5 — shared ID settings and main-journal-style employee entry workspace.
function updateAccountingIdPreviews(){}
async function saveAccountingIdSettingsToDatabase(){if(!ojmDb||!liveProfile||liveProfile.role!=='admin')return;const a=ApplicationSettings.accounting||{},result=await ojmDb.from('accounting_id_settings').upsert({id:true,journal_prefix:String(a.journalPrefix||'JRN').toUpperCase(),sub_user_prefix:String(a.subUserPrefix||'SJR').toUpperCase(),journal_digits:Number(a.journalDigits||4),sub_user_digits:Number(a.subUserDigits||4),updated_by:liveProfile.id,updated_at:new Date().toISOString()});if(result.error)showCenterStatus(`ID settings were saved locally but database sync failed: ${result.error.message}`,true)}
async function loadAccountingIdSettingsFromDatabase(){if(!ojmDb||!liveProfile)return;const{data,error}=await ojmDb.from('accounting_id_settings').select('*').eq('id',true).maybeSingle();if(error||!data)return;ApplicationSettings.accounting={...ApplicationSettings.accounting,journalPrefix:data.journal_prefix,subUserPrefix:data.sub_user_prefix||'SJR',journalDigits:String(data.journal_digits),subUserDigits:String(data.sub_user_digits)};localStorage.setItem(APP_SETTINGS_KEY,JSON.stringify(ApplicationSettings));setSettingsFormValues('accounting');syncEntrySequence();updateNextEntryIdDisplay()}
function workspaceUserInitials(user){const parts=String(subUserName(user)).trim().split(/\s+/).filter(Boolean);return((parts[0]?.[0]||'U')+(parts.length>1?parts.at(-1)[0]:'')).toUpperCase()}
function localWorkspaceEntryPreview(user){const digits=Number(ApplicationSettings.accounting?.subUserDigits||4),numbers=(reviewStaffJournals||[]).filter(j=>String(j.owner_id)===String(user.id)).flatMap(j=>j.lines||[]).map(line=>Number(String(line.workspace_entry_no||'').split('-').at(-1))||0);return`${workspaceUserInitials(user)}-${String(Math.max(0,...numbers)+1).padStart(digits,'0')}`}
async function refreshWorkspaceEntryId(userId){const host=document.getElementById('workspaceNextEntryId'),user=availableSubUsers().find(u=>u.id===userId)||liveProfile;if(!host||!user)return;host.textContent=localWorkspaceEntryPreview(user);if(!ojmDb)return;const{data,error}=await ojmDb.rpc('preview_staff_workspace_entry_no',{p_user_id:userId});if(!error&&data)host.textContent=data}
function currentWorkspaceJournal(userId){const month=new Date().toISOString().slice(0,7);return(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&String(j.period_start).slice(0,7)===month)}
function currentWorkspaceDraftEntries(userId){const journal=currentWorkspaceJournal(userId);return journal&&['draft','returned'].includes(journal.status)?(journal.lines||[]).map(line=>({...line,date:line.transaction_date,status:journal.status})):[]}
function workspaceJournalEntryFormHtml(user){const cfg=userWorkspaceConfig(user),fundOptions=cfg.fundIds.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(workspaceAccountName(id))}</option>`).join(''),entryOptions=cfg.destinationIds.map(id=>`<option value="${escapeHtml(id)}">${escapeHtml(workspaceAccountName(id))}</option>`).join('');return`<section class="je-card workspace-journal-entry-card"><div class="je-card-header"><div><h3 class="je-title">Post Double Entry</h3><p class="je-subtitle">Employee workspace entry — saved here for review before it reaches the official journal.</p></div><div class="je-entry-id-box"><span>Next Entry ID</span><strong id="workspaceNextEntryId">${escapeHtml(localWorkspaceEntryPreview(user))}</strong></div></div><div class="je-meta-grid"><div class="je-field-group transaction-date-field"><label for="workspaceEntryDate">Date:</label><input id="workspaceEntryDate" class="je-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="je-field-group" style="flex:1"><label for="workspaceEntryMemo">General Description / Memo *:</label><input id="workspaceEntryMemo" class="je-input" placeholder="e.g., Food supplies purchased for kitchen operations"></div></div><div class="table-container"><table class="je-table workspace-journal-table"><thead><tr><th style="width:28%">Account</th><th style="width:32%">Line Memo / Reference</th><th class="num">Debit (Debit)</th><th class="num">Credit (Credit)</th></tr></thead><tbody><tr><td><select id="workspaceEntryDestination" class="je-select"><option value="">Choose entry account</option>${entryOptions}</select></td><td><input id="workspaceEntryReference" class="je-input" placeholder="Receipt or reference"></td><td><input id="workspaceEntryAmount" class="je-input num" type="number" min="0.01" step="0.01" placeholder="0.00" oninput="syncWorkspaceCredit()"></td><td class="num muted-cell">—</td></tr><tr><td><select id="workspaceEntryFund" class="je-select"><option value="">Choose main account</option>${fundOptions}</select></td><td><span class="workspace-auto-memo">Uses the general description above</span></td><td class="num muted-cell">—</td><td><input id="workspaceEntryCredit" class="je-input num" type="number" tabindex="-1" readonly placeholder="0.00"></td></tr></tbody></table></div><div class="je-actions-bar"><div><button type="button" class="je-btn je-btn-secondary" onclick="resetWorkspaceEntryForm('${user.id}')">↺ Reset</button></div><div class="je-actions-right"><span id="workspaceBalanceIndicator" class="je-status-badge balanced">Balanced</span><button type="button" class="je-btn je-btn-emerald" onclick="saveWorkspaceEntry('${user.id}')">Save Entry</button></div></div></section>`}
function syncWorkspaceCredit(){const amount=document.getElementById('workspaceEntryAmount')?.value||'',credit=document.getElementById('workspaceEntryCredit');if(credit)credit.value=amount;const numeric=parseAppNumber(amount);const badge=document.getElementById('workspaceBalanceIndicator');if(badge){badge.textContent=numeric>0?'Balanced':'Enter Amount';badge.classList.toggle('balanced',numeric>0)}}
function resetWorkspaceEntryForm(userId){workspaceEditingLineId='';const user=availableSubUsers().find(u=>u.id===userId)||liveProfile,form=document.querySelector('.workspace-journal-entry-card');form?.querySelectorAll('input').forEach(input=>{if(input.type==='date')input.value=new Date().toISOString().slice(0,10);else input.value=''});form?.querySelectorAll('select').forEach(select=>select.selectedIndex=0);syncWorkspaceCredit();refreshWorkspaceEntryId(userId);showCenterStatus('Employee journal form reset.')}
workspaceEntryTableHtml=function(user,entries){return`<section class="workspace-entry-card current-draft-card"><div class="settings-section-header"><div><h4>Current Month — Ready for Submission</h4><p>Only unsubmitted entries for ${new Date().toISOString().slice(0,7)} are shown here.</p></div></div><div class="table-container"><table class="je-table"><thead><tr><th>Entry ID</th><th>Date</th><th>Main Account (CR)</th><th>Entry Account (DR)</th><th>Description / Reference</th><th class="num">Amount</th><th>Action</th></tr></thead><tbody>${entries.map(entry=>`<tr><td><strong class="workspace-entry-number">${escapeHtml(entry.workspace_entry_no||'Pending ID')}</strong></td><td>${escapeHtml(formatAppDate(entry.date||entry.transaction_date))}</td><td>${escapeHtml(workspaceAccountName(entry.fund_account_id))}</td><td>${escapeHtml(workspaceAccountName(entry.account_id))}</td><td>${escapeHtml(entry.memo||'')}${entry.reference?`<small>${escapeHtml(entry.reference)}</small>`:''}</td><td class="num">${formatAppNumber(entry.amount||0)}</td><td><div class="transaction-review-actions"><button type="button" class="je-btn je-btn-secondary" onclick="editWorkspaceEntry('${user.id}','${entry.id}')">Edit</button><button type="button" class="je-btn je-btn-danger" onclick="deleteWorkspaceEntry('${user.id}','${entry.id}')">Delete</button></div></td></tr>`).join('')||'<tr><td colspan="7" class="period-empty">No unsubmitted entries for the current month.</td></tr>'}</tbody></table></div></section>`};
saveWorkspaceEntry=async function(userId){if(!ojmDb||!liveProfile)return;const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only save entries in your own workspace.',true);return}const date=document.getElementById('workspaceEntryDate')?.value,fund=document.getElementById('workspaceEntryFund')?.value,account=document.getElementById('workspaceEntryDestination')?.value,amount=parseAppNumber(document.getElementById('workspaceEntryAmount')?.value||0),memo=document.getElementById('workspaceEntryMemo')?.value.trim(),reference=document.getElementById('workspaceEntryReference')?.value.trim();if(!date||!fund||!account||!amount||!memo){showCenterStatus('Complete the date, main account, entry account, description, and amount.',true);return}let journal=workspaceJournalForDate(userId,date);if(journal&&!['draft','returned'].includes(journal.status)){showCenterStatus('That month is under review or posted. Reopen it from Review & History before editing.',true);return}if(!journal){const month=date.slice(0,7),created=await ojmDb.from('staff_journals').upsert({owner_id:userId,period_start:`${month}-01`,period_end:new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).toISOString().slice(0,10),status:'draft',updated_at:new Date().toISOString()},{onConflict:'owner_id,period_start'}).select().single();if(created.error){showCenterStatus(`Entry save failed: ${created.error.message}`,true);return}journal={...created.data,lines:[]}}const payload={transaction_date:date,direction:'out',fund_account_id:fund,account_id:account,memo,reference:reference||'',amount,currency_code:workspaceAccount(fund)?.currency||'LAK'};if(workspaceEditingLineId){const updated=await ojmDb.from('staff_journal_lines').update(payload).eq('id',workspaceEditingLineId).eq('staff_journal_id',journal.id);if(updated.error){showCenterStatus(`Entry update failed: ${updated.error.message}`,true);return}workspaceEditingLineId='';await loadStaffJournalsForReview();showCenterStatus('Employee journal entry updated.');return}const inserted=await ojmDb.rpc('save_staff_workspace_entry_v3',{p_owner_id:userId,p_line_id:null,p_client_key:journalEntry98Key14228(userId,payload),p_transaction_date:date,p_direction:'out',p_fund_account_id:fund,p_account_id:account,p_memo:memo,p_reference:reference||'',p_amount:amount,p_entry_kind:'payment'});if(inserted.error){showCenterStatus(`Entry save failed: ${inserted.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus(`Entry ${inserted.data?.[0]?.workspace_entry_no||''} saved for review.`)};
editWorkspaceEntry=function(userId,lineId){const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status)&&j.lines?.some(line=>line.id===lineId)),line=journal?.lines.find(item=>item.id===lineId);if(!line){showCenterStatus('Open the submitted batch from Review & History before editing.',true);return}workspaceEditingLineId=lineId;document.getElementById('workspaceEntryDate').value=line.transaction_date;document.getElementById('workspaceEntryFund').value=line.fund_account_id||'';document.getElementById('workspaceEntryDestination').value=line.account_id||'';document.getElementById('workspaceEntryAmount').value=line.amount||'';document.getElementById('workspaceEntryMemo').value=line.memo||'';document.getElementById('workspaceEntryReference').value=line.reference||'';syncWorkspaceCredit();document.querySelector('.workspace-journal-entry-card')?.scrollIntoView({behavior:'smooth',block:'start'});showCenterStatus(`Editing ${line.workspace_entry_no||'workspace entry'}.`)};

function filterWorkspaceReview(query=''){const term=String(query).trim().toLowerCase();document.querySelectorAll('#workspaceReviewOverlay .workspace-review-record').forEach(card=>card.hidden=Boolean(term&&!card.dataset.search.includes(term)))}
async function editWorkspaceReviewBatch(journalId){const journal=(reviewStaffJournals||[]).find(j=>j.id===journalId);if(!journal||journal.status==='posted')return;if(journal.status==='submitted'){await reopenWorkspaceSubmission(journalId);return}document.getElementById('workspaceReviewOverlay')?.remove();renderSubUserWorkspace();requestAnimationFrame(()=>document.querySelector('.workspace-journal-entry-card')?.scrollIntoView({behavior:'smooth',block:'start'}))}
openWorkspaceReview=function(userId){const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only review your own submissions.',true);return}const user=availableSubUsers().find(u=>u.id===userId)||liveProfile,journals=(reviewStaffJournals||[]).filter(j=>j.owner_id===userId&&j.lines?.length).sort((a,b)=>String(b.period_start).localeCompare(String(a.period_start)));document.getElementById('workspaceReviewOverlay')?.remove();const overlay=document.createElement('div');overlay.id='workspaceReviewOverlay';overlay.className='submission-compare-overlay workspace-review-overlay';overlay.innerHTML=`<div class="submission-compare-window"><div class="submission-compare-header"><div><strong>${staff?'My Submission Review':'Employee Submission Review'}</strong><span>${escapeHtml(subUserName(user||{}))} • ${journals.length} monthly record${journals.length===1?'':'s'}</span></div><button type="button" class="modal-close-x" onclick="document.getElementById('workspaceReviewOverlay').remove()">&times;</button></div><div class="workspace-review-toolbar"><input class="je-input" type="search" placeholder="Search period, for example 2026-09, status, account, description, or reference" oninput="filterWorkspaceReview(this.value)"></div><div class="workspace-review-scroll">${journals.length?journals.map(journal=>{const search=[journal.period_start,journal.status,...journal.lines.flatMap(line=>[line.workspace_entry_no,line.memo,line.reference,workspaceAccountName(line.fund_account_id),lineAccountName(line)])].join(' ').toLowerCase();return`<details class="workspace-review-record" data-search="${escapeHtml(search)}"><summary><span><strong>${escapeHtml(String(journal.period_start).slice(0,7))}</strong><small>${journal.lines.length} entries • ${journal.lines.reduce((sum,line)=>sum+Number(line.amount||0),0).toLocaleString(appNumberLocale(),{minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()})}</small></span><span class="workspace-review-header-actions"><span class="submission-status ${escapeHtml(journal.status)}">${escapeHtml(String(journal.status).replaceAll('_',' ').toUpperCase())}</span>${staff&&journal.status!=='posted'?`<button type="button" class="btn-action-edit" title="Edit this submission" onclick="event.preventDefault();event.stopPropagation();editWorkspaceReviewBatch('${journal.id}')">✎</button>`:''}</span></summary>${workspaceReviewSingleTable(journal)}${journal.return_note?`<div class="submission-reason">Correction note: ${escapeHtml(journal.return_note)}</div>`:''}</details>`}).join(''):'<div class="legal-doc-empty">No saved or submitted entries yet.</div>'}</div></div>`;document.body.appendChild(overlay)};

renderSubUserWorkspace=function(){const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;const staff=liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:true}];activeSubUserId='self'}else if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(u=>u.id===tab.userId),label=staff?subUserName(user||liveProfile):(tab.permanent?'Home':user?subUserName(user):'New Tab');return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');const add=document.querySelector('.sub-user-add-tab');if(add)add.hidden=Boolean(staff);const tab=activeSubUserTab();if(tab?.permanent&&!staff){panel.innerHTML=renderWorkspaceHome();return}const user=availableSubUsers().find(u=>String(u.id)===String(tab?.userId));if(!user){panel.innerHTML='<div class="sub-user-empty-state">This user workspace could not be loaded.</div>';return}const journal=currentWorkspaceJournal(user.id),entries=currentWorkspaceDraftEntries(user.id),status=journal?.status||'clear',locked=['submitted','approved_pending_post','posted'].includes(status),p=subUserPermission(user),inReview=(reviewStaffJournals||[]).filter(j=>j.owner_id===user.id&&j.status==='submitted').length;panel.innerHTML=`<section class="workspace-main-card"><div class="sub-user-profile-grid workspace-profile-actions"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(p.job_title||user.role||'Sub-user')}</strong></div><div class="workspace-inline-actions"><button type="button" class="workspace-status-badge ${workspaceStatusClass(status)}" onclick="openWorkspaceReview('${user.id}')">${escapeHtml(workspaceStatusLabel(status,entries.length))}${inReview?` (${inReview})`:''}</button><button type="button" class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}')">Review &amp; History</button><button type="button" class="je-btn je-btn-emerald" ${!entries.length||locked?'disabled':''} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div></div>${assignedFundTableHtml(user,entries)}</section>${locked?'<div class="settings-compact-note">The current month is under review or posted. The journal form remains visible; reopen the month from Review & History before saving changes.</div>':''}${workspaceJournalEntryFormHtml(user)}${workspaceEntryTableHtml(user,entries)}`;refreshWorkspaceEntryId(user.id)};

submitWorkspaceForReview=async function(userId){const journal=currentWorkspaceJournal(userId);if(!journal||!['draft','returned'].includes(journal.status)||!journal.lines?.length){showCenterStatus('There are no current-month entries ready to submit.',true);return}const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&userId!==liveProfile.id){showCenterStatus('You can only submit your own workspace.',true);return}showAppConfirm('Submit for Review',`Submit ${journal.lines.length} current-month entr${journal.lines.length===1?'y':'ies'}? The batch will be locked during review.`,'Submit',async()=>{let result;if(staff)result=await ojmDb.rpc('submit_staff_journal',{p_journal_id:journal.id});else result=await ojmDb.from('staff_journals').update({status:'submitted',submitted_at:new Date().toISOString(),return_note:null,updated_at:new Date().toISOString()}).eq('id',journal.id);if(result.error){showCenterStatus(`Submission failed: ${result.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Current-month entries submitted for review.')},false)};

const hydrateSupabaseSessionBeforeSharedIds=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforeSharedIds(session);if(liveProfile)await loadAccountingIdSettingsFromDatabase()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateAccountingIdPreviews,{once:true});else updateAccountingIdPreviews();

// FOUNDATION V6 — compact permission assignment and settings-driven single-entry workspace.
function activeChartAccounts(){return(AccountingStore.accounts||[]).filter(account=>account.active!==false&&account.is_active!==false&&account.isPosting!==false)}
function accountLabelOnly(id){return workspaceAccount(id)?.name||'Unassigned account'}
function renderAccountAccessEditor(selected=[],fundSelected=[]){
  const accounts=activeChartAccounts(),entryHost=document.getElementById('userAccountAccessGrid'),fundHost=document.getElementById('userFundAccountGrid');
  const rows=(chosen=[])=>accounts.map(account=>`<label class="permission-option"><input type="checkbox" value="${escapeHtml(accountKey(account))}" ${chosen.includes(accountKey(account))?'checked':''}><span title="${escapeHtml(account.name)}">${escapeHtml(account.name)}</span></label>`).join('');
  if(fundHost)fundHost.innerHTML=rows(fundSelected);if(entryHost)entryHost.innerHTML=rows(selected)
}
function selectedAccountNames(selector){return[...document.querySelectorAll(`${selector} input[type="checkbox"]:checked`)].map(input=>input.closest('label')?.querySelector('span')?.textContent.trim()).filter(Boolean)}
function selectionBulletHtml(names){return names.length?`<ul>${names.map(name=>`<li>${escapeHtml(name)}</li>`).join('')}</ul>`:'None selected'}
function showAccountAssignmentPane(kind='main'){
  const main=document.getElementById('accountAssignmentMainPane'),entry=document.getElementById('accountAssignmentEntryPane');if(main)main.hidden=kind!=='main';if(entry)entry.hidden=kind!=='entry';document.querySelectorAll('.account-assignment-tab').forEach(button=>button.classList.toggle('active',button.dataset.accountPane===kind))
}
function updateAccountAssignmentBullets(){
  const funds=selectedAccountNames('#userFundAccountGrid'),entries=selectedAccountNames('#userAccountAccessGrid'),fundHost=document.getElementById('userFundSelectionBullets'),entryHost=document.getElementById('userEntrySelectionBullets');if(fundHost)fundHost.textContent=`${funds.length} selected`;if(entryHost)entryHost.textContent=`${entries.length} selected`
}
function syncTransactionActivitySelection(){const mode=document.getElementById('userTransactionActivity')?.value||'out',allowOut=document.getElementById('permissionAllowOut'),allowIn=document.getElementById('permissionAllowIn');if(allowOut)allowOut.checked=mode==='out'||mode==='both';if(allowIn)allowIn.checked=mode==='in'||mode==='both';updateUserAccessSummaries()}
function syncTransactionActivityFromPermissions(){const allowOut=document.getElementById('permissionAllowOut')?.checked,allowIn=document.getElementById('permissionAllowIn')?.checked,select=document.getElementById('userTransactionActivity');if(select)select.value=allowOut&&allowIn?'both':allowIn?'in':'out'}
updateUserAccessSummaries=function(){
  const modules=selectedAccessLabels('#userPermissionGrid input'),actions=selectedAccessLabels('#userSecurityAccessPanel input'),funds=selectedAccountNames('#userFundAccountGrid'),entries=selectedAccountNames('#userAccountAccessGrid');
  const moduleSummary=document.getElementById('userModuleAccessSummary'),securitySummary=document.getElementById('userSecurityAccessSummary'),accountSummary=document.getElementById('userAccountAssignmentSummary');
  if(moduleSummary)moduleSummary.innerHTML=accessSummaryHtml(modules,'Workspace only');if(securitySummary)securitySummary.innerHTML=accessSummaryHtml(actions,'No special actions selected');if(accountSummary)accountSummary.innerHTML=accessSummaryHtml([...funds,...entries],`${funds.length} main • ${entries.length} entry`);updateAccountAssignmentBullets();const counterpart=document.getElementById('moneyInCounterpartField');if(counterpart)counterpart.hidden=!document.getElementById('permissionAllowIn')?.checked
};
openUserAccessEditor=function(id=''){
  const user=liveProfiles.find(item=>item.id===id),permission=user?.user_permissions||{};
  document.getElementById('userAccessModalTitle').textContent=user?'Edit User Access':'Add Sub-user';document.getElementById('userAccessId').value=user?.id||'';document.getElementById('userAccessName').value=user?.full_name||'';document.getElementById('userAccessEmail').value=user?.email||'';document.getElementById('userAccessEmail').disabled=Boolean(user);document.getElementById('userAccessPassword').value='';document.getElementById('userAccessPassword').required=!user;document.getElementById('userAccessType').value=permission.user_type||(user?.role==='admin'?'admin':'sub_user');document.getElementById('userAccessJob').value=permission.job_title||'';populateUserManagerOptions(permission.manager_id||'');renderPermissionGrid(permission.modules||(user?.role==='admin'?PERMISSION_MODULES.map(item=>item[0]):['sub-users']));
  document.getElementById('permissionApprove').checked=Boolean(permission.can_approve||user?.role==='admin');document.getElementById('permissionDirectPost').checked=Boolean(permission.can_post_directly||user?.role==='admin');document.getElementById('permissionVoid').checked=Boolean(permission.can_void||user?.role==='admin');document.getElementById('permissionExport').checked=Boolean(permission.can_export||user?.role==='admin');document.getElementById('permissionManageData').checked=Boolean(permission.can_manage_data||user?.role==='admin');
  const funds=permission.assigned_fund_account_ids||[],entries=permission.destination_account_ids?.length?permission.destination_account_ids:(permission.allowed_account_ids||[]);renderAccountAccessEditor(entries,funds);document.getElementById('permissionAllowOut').checked=!permission.allowed_directions||permission.allowed_directions.includes('out');document.getElementById('permissionAllowIn').checked=Boolean(permission.allowed_directions?.includes('in'));document.getElementById('permissionMultipleFunds').checked=Boolean(permission.allow_multiple_funds);
  syncTransactionActivityFromPermissions();const counterpart=document.getElementById('moneyInCounterpartAccount');if(counterpart){counterpart.innerHTML='<option value="">Choose the automatic credit account</option>'+activeChartAccounts().map(account=>`<option value="${escapeHtml(accountKey(account))}">${escapeHtml(account.name)}</option>`).join('');counterpart.value=permission.money_in_counterpart_account_id||''}
  ['userModuleAccessPanel','userSecurityAccessPanel','userAccountAssignmentPanel'].forEach(panelId=>{const panel=document.getElementById(panelId);if(panel)panel.hidden=true});showAccountAssignmentPane('main');document.getElementById('userAccessStatus').textContent='';updateUserAccessSummaries();openModal('modalUserAccess')
};
saveUserAccess=async function(event){
  event.preventDefault();const status=document.getElementById('userAccessStatus'),id=document.getElementById('userAccessId').value,funds=[...document.querySelectorAll('#userFundAccountGrid input:checked')].map(input=>input.value),entries=[...document.querySelectorAll('#userAccountAccessGrid input:checked')].map(input=>input.value),directions=[document.getElementById('permissionAllowOut').checked?'out':null,document.getElementById('permissionAllowIn').checked?'in':null].filter(Boolean),counterpart=document.getElementById('moneyInCounterpartAccount').value||null;
  const payload={full_name:document.getElementById('userAccessName').value.trim(),email:document.getElementById('userAccessEmail').value.trim(),password:document.getElementById('userAccessPassword').value,user_type:document.getElementById('userAccessType').value,manager_id:document.getElementById('userAccessManager').value||null,job_title:document.getElementById('userAccessJob').value.trim(),modules:window.access113?access113.editorModules():[...document.querySelectorAll('#userPermissionGrid input:checked')].map(input=>input.value),can_approve:document.getElementById('permissionApprove').checked,can_post_directly:document.getElementById('permissionDirectPost').checked,can_void:document.getElementById('permissionVoid').checked,can_export:document.getElementById('permissionExport').checked,can_manage_data:document.getElementById('permissionManageData').checked};
  if(window.access113?.editorCan('sub-users-workspace','edit')&&!funds.length){status.textContent='Select at least one Main Account for workspace editing.';return}if(!directions.length){status.textContent='Allow Money Out, Money In, or both.';return}if((!window.access113||access113.editorCan('sub-users-workspace','edit'))&&directions.includes('out')&&!entries.length){status.textContent='Select at least one Entry / Spending Account for Money Out.';return}if((!window.access113||access113.editorCan('sub-users-workspace','edit'))&&directions.includes('in')&&!counterpart){status.textContent='Choose the automatic counterpart account for Money In.';return}
  if(!id){const{data,error}=await ojmDb.functions.invoke('admin-create-user',{body:payload});if(error){status.textContent=`User creation requires the supplied admin-create-user Edge Function: ${error.message}`;return}payload.user_id=data.user_id}else payload.user_id=id;
  const role=payload.user_type==='admin'?'admin':'submitter',profileResult=await ojmDb.from('profiles').update({full_name:payload.full_name,role}).eq('id',payload.user_id);if(profileResult.error){status.textContent=profileResult.error.message;return}
  const permissionResult=await ojmDb.from('user_permissions').upsert({user_id:payload.user_id,user_type:payload.user_type,manager_id:payload.manager_id,job_title:payload.job_title,modules:payload.modules,can_approve:payload.can_approve,can_post_directly:payload.can_post_directly,can_void:payload.can_void,can_export:payload.can_export,can_manage_data:payload.can_manage_data,module_actions113:window.access113?.editorValue()||null,allow_any_account:false,allowed_account_ids:entries,destination_account_ids:entries,assigned_fund_account_ids:funds,fund_allocations:liveProfiles.find(u=>u.id===payload.user_id)?.user_permissions?.fund_allocations||[],default_out_credit_account_id:funds[0]||null,default_in_debit_account_id:funds[0]||null,allowed_directions:directions,allow_multiple_funds:document.getElementById('permissionMultipleFunds').checked,money_in_counterpart_account_id:counterpart,updated_by:liveProfile.id,updated_at:new Date().toISOString()});
  if(permissionResult.error){status.textContent=`Access settings were not saved: ${permissionResult.error.message}`;return}closeModal('modalUserAccess');await loadProfilesFromSupabase();showCenterStatus('User access and account assignments saved.')
};
document.addEventListener('change',event=>{if(event.target.closest('#modalUserAccess'))updateUserAccessSummaries()});

const workspacePendingRows={};
const workspaceRowEdits={};
function workspaceRules(user){const permission=subUserPermission(user),directions=(permission.allowed_directions?.length?permission.allowed_directions:['out']).filter(value=>value==='in'||value==='out');return{permission,directions,fundIds:(permission.assigned_fund_account_ids||[]).filter(Boolean),entryIds:(permission.destination_account_ids?.length?permission.destination_account_ids:(permission.allowed_account_ids||[])).filter(Boolean),multiple:Boolean(permission.allow_multiple_funds),counterpart:permission.money_in_counterpart_account_id||''}}
function pendingRowsFor(userId){return workspacePendingRows[userId]||(workspacePendingRows[userId]=[])}
function workspaceEditableRows(user){const pending=pendingRowsFor(user.id),edits=workspaceRowEdits[user.id]||{},saved=currentWorkspaceDraftEntries(user.id).slice().sort((a,b)=>Number(b.line_no||0)-Number(a.line_no||0)).map(line=>edits[line.id]||({...line,key:String(line.id),isNew:false,selected_account_id:line.direction==='in'?line.fund_account_id:line.account_id}));return[...pending,...saved]}
function addWorkspaceEntryRow(userId){
  const user=availableSubUsers().find(item=>String(item.id)===String(userId))||liveProfile,rules=workspaceRules(user),date=document.getElementById('workspaceEntryDate')?.value||new Date().toISOString().slice(0,10),memo=document.getElementById('workspaceEntryMemo')?.value.trim()||'';if(!rules.directions.length||!rules.fundIds.length){showCenterStatus('Complete this user’s account and direction settings first.',true);return}const direction=rules.directions[0],key=`new-${Date.now()}`;pendingRowsFor(userId).unshift({key,isNew:true,transaction_date:date,direction,selected_account_id:'',fund_account_id:(!rules.multiple||rules.fundIds.length===1)?rules.fundIds[0]:'',memo,reference:'',amount:0,workspace_entry_no:localWorkspaceEntryPreview(user)});renderSubUserWorkspace();requestAnimationFrame(()=>window.focusWorkspaceInline117?.(userId,key,'account'))
}
function workspaceRowByKey(userId,key){const user=availableSubUsers().find(item=>String(item.id)===String(userId))||liveProfile;return workspaceEditableRows(user).find(row=>String(row.key)===String(key))}
function workspaceCellValue(row,field,rules){if(field==='account')return accountLabelOnly(row.direction==='in'?(row.fund_account_id||row.selected_account_id):(row.account_id||row.selected_account_id));if(field==='fund')return row.direction==='in'?'Same as Account':accountLabelOnly(row.fund_account_id);if(field==='direction')return row.direction==='in'?'Money In':'Money Out';if(field==='amount')return Number(row.amount||0)>0?formatAppNumber(row.amount):'';if(field==='date')return formatAppDate(row.transaction_date);if(field==='memo')return row.memo||'';if(field==='reference')return row.reference||'';return''}
function workspaceCellButton(userId,row,field,rules,editable=true){const value=workspaceCellValue(row,field,rules),display=value||({account:'Choose account',fund:'Choose fund',memo:'Add description',reference:'Add memo / reference',amount:'Enter amount'}[field]||'Set value'),directionClass=field==='direction'?` workspace-direction-pill ${row.direction}`:'';return`<button type="button" class="workspace-cell-button ${value?'':'is-empty'} ${field==='amount'?'num':''}" ${editable?`onclick="openWorkspaceCellEditor('${userId}','${row.key}','${field}')"`:'disabled'}>${field==='direction'?`<span class="${directionClass.trim()}">${escapeHtml(display)}</span>`:escapeHtml(display)}</button>`}
function workspaceSingleEntryHtml(user,locked=false){
  const rules=workspaceRules(user),rows=workspaceEditableRows(user),showDirection=rules.directions.length>1,showFund=rules.multiple&&rules.fundIds.length>1&&rules.directions.includes('out'),editable=true,head=`<th>Entry ID</th><th>Date</th>${showDirection?'<th>Direction</th>':''}<th>Account</th>${showFund?'<th>Main / Fund Account</th>':''}<th>General Description</th><th>Line Memo / Reference</th><th class="num">Amount</th><th>Action</th>`;
  const body=rows.map(row=>`<tr class="${row.isNew?'workspace-row-new':''}"><td><strong class="workspace-entry-number">${escapeHtml(row.workspace_entry_no||'Pending ID')}</strong></td><td>${workspaceCellButton(user.id,row,'date',rules,editable)}</td>${showDirection?`<td>${workspaceCellButton(user.id,row,'direction',rules,editable)}</td>`:''}<td>${workspaceCellButton(user.id,row,'account',rules,editable)}</td>${showFund?`<td>${workspaceCellButton(user.id,row,'fund',rules,editable&&row.direction==='out')}</td>`:''}<td>${workspaceCellButton(user.id,row,'memo',rules,editable)}</td><td>${workspaceCellButton(user.id,row,'reference',rules,editable)}</td><td>${workspaceCellButton(user.id,row,'amount',rules,editable)}</td><td><div class="workspace-row-actions"><button type="button" class="btn-action-edit" title="Edit row" onclick="editWorkspaceSingleRow('${user.id}','${row.key}')">✎</button><button type="button" class="btn-action-delete" title="Void row" onclick="voidWorkspaceSingleRow('${user.id}','${row.key}')">✕</button></div></td></tr>`).join('');
  return`<section class="je-card workspace-single-entry-card"><div class="je-card-header"><div><h3 class="je-title">Post Single Entry</h3><p class="je-subtitle">The accounting side is created automatically from this user’s Settings permissions.</p></div><div class="je-entry-id-box"><span>Entry ID</span><strong id="workspaceNextEntryId">${escapeHtml(localWorkspaceEntryPreview(user))}</strong></div></div><div class="workspace-single-meta"><div class="settings-field"><label for="workspaceEntryDate">Date</label><input id="workspaceEntryDate" class="je-input" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="settings-field"><label for="workspaceEntryMemo">General Description / Memo</label><input id="workspaceEntryMemo" class="je-input" placeholder="Description applied to the new row"></div><button type="button" class="je-btn je-btn-emerald" onclick="addWorkspaceEntryRow('${user.id}')">＋ Add Row</button></div><div class="table-container"><table class="je-table workspace-single-table"><thead><tr>${head}</tr></thead><tbody>${body||`<tr><td colspan="${6+(showDirection?1:0)+(showFund?1:0)}" class="period-empty">No unsubmitted entries. Use Add Row to begin.</td></tr>`}</tbody></table></div></section>`
}
function editWorkspaceSingleRow(userId,key){const row=workspaceRowByKey(userId,key);if(!row)return;openWorkspaceCellEditor(userId,key,'account');showCenterStatus(`Editing ${row.workspace_entry_no||'new entry'}. Select any cell to change its value.`)}
function workspaceRowHasVoidableData(row,userId){
  const user=availableSubUsers().find(item=>String(item.id)===String(userId))||liveProfile,rules=workspaceRules(user);
  const explicitlyChosenFund=Boolean(row?.fund_account_id&&rules.multiple&&rules.fundIds.length>1);
  return Boolean(row?.account_id||row?.selected_account_id||explicitlyChosenFund||Number(row?.amount)>0||String(row?.memo||row?.reference||'').trim());
}
function requestWorkspaceVoidReason(onSubmit){
  document.getElementById('workspaceVoidReasonOverlay')?.remove();
  const overlay=document.createElement('div');
  overlay.id='workspaceVoidReasonOverlay';overlay.className='custom-alert-overlay workspace-void-overlay';
  overlay.innerHTML=`<section class="workspace-void-dialog" role="dialog" aria-modal="true" aria-labelledby="workspaceVoidTitle"><header><div><span>ENTRY CHANGE</span><h2 id="workspaceVoidTitle">Explain why this entry is being removed</h2><p>This reason will be retained with the entry history.</p></div><button type="button" aria-label="Close" data-void-cancel>×</button></header><label><span>Reason *</span><textarea rows="4" placeholder="Enter the reason for removing this entry"></textarea><small hidden>Please enter a reason.</small></label><footer><button type="button" class="je-btn je-btn-secondary" data-void-cancel>Cancel</button><button type="button" class="je-btn je-btn-emerald" data-void-submit>Remove Entry</button></footer></section>`;
  const close=()=>overlay.remove();
  overlay.querySelectorAll('[data-void-cancel]').forEach(button=>button.addEventListener('click',close));
  overlay.addEventListener('click',event=>{if(event.target===overlay)close()});
  overlay.querySelector('[data-void-submit]').addEventListener('click',async()=>{const input=overlay.querySelector('textarea'),reason=input.value.trim(),error=overlay.querySelector('small');if(!reason){error.hidden=false;input.focus();return}overlay.querySelector('[data-void-submit]').disabled=true;await onSubmit(reason);close()});
  document.body.appendChild(overlay);requestAnimationFrame(()=>overlay.querySelector('textarea')?.focus());
}
async function voidWorkspaceSingleRow(userId,key){
  const row=workspaceRowByKey(userId,key);if(!row)return;
  const removePending=()=>{workspacePendingRows[userId]=pendingRowsFor(userId).filter(item=>String(item.key)!==String(key));renderSubUserWorkspace();showCenterStatus('Unsaved row removed.')};
  if(row.isNew&&!workspaceRowHasVoidableData(row,userId)){removePending();return}
  if(row.isNew){requestWorkspaceVoidReason(async()=>removePending());return}
  const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status)&&j.lines?.some(line=>String(line.id)===String(row.id)));
  if(!journal){showCenterStatus('Only draft or returned entries can be voided.',true);return}
  requestWorkspaceVoidReason(async reason=>{const result=await ojmDb.rpc('void_staff_workspace_entry',{p_line_id:row.id,p_reason:reason});if(result.error){showCenterStatus(`Void failed: ${result.error.message}. Install SQL 12 if it has not been applied yet.`,true);return}await loadStaffJournalsForReview();showCenterStatus('Workspace entry voided and the reason was recorded.')});
}
function openWorkspaceCellEditor(userId,key,field){
  const user=availableSubUsers().find(item=>String(item.id)===String(userId))||liveProfile,row=workspaceRowByKey(userId,key),rules=workspaceRules(user);if(!row)return;document.getElementById('workspaceCellOverlay')?.remove();let control='';const current=field==='account'?(row.direction==='in'?(row.fund_account_id||row.selected_account_id):(row.account_id||row.selected_account_id)):row[field];
  if(field==='direction')control=`<select id="workspaceCellInput" class="je-select">${rules.directions.map(value=>`<option value="${value}" ${row.direction===value?'selected':''}>${value==='in'?'Money In':'Money Out'}</option>`).join('')}</select>`;
  else if(field==='account'){const ids=row.direction==='in'?rules.fundIds:rules.entryIds;control=`<select id="workspaceCellInput" class="je-select"><option value="">Choose account</option>${ids.map(id=>`<option value="${escapeHtml(id)}" ${String(current)===String(id)?'selected':''}>${escapeHtml(accountLabelOnly(id))}</option>`).join('')}</select>`}
  else if(field==='fund')control=`<select id="workspaceCellInput" class="je-select"><option value="">Choose fund</option>${rules.fundIds.map(id=>`<option value="${escapeHtml(id)}" ${String(row.fund_account_id)===String(id)?'selected':''}>${escapeHtml(accountLabelOnly(id))}</option>`).join('')}</select>`;
  else if(field==='date')control=`<input id="workspaceCellInput" class="je-input" type="date" value="${escapeHtml(row.transaction_date||'')}">`;
  else if(field==='amount')control=`<input id="workspaceCellInput" class="je-input" inputmode="decimal" value="${Number(row.amount||0)>0?formatAppNumber(row.amount):''}" placeholder="${formatAppNumber(0)}" onfocus="this.select()" oninput="formatAppNumberEditing(this)" onblur="finishAppNumberEditing(this)">`;
  else control=`<input id="workspaceCellInput" class="je-input" value="${escapeHtml(row[field]||'')}" placeholder="${field==='memo'?'General description':'Line memo or receipt reference'}">`;
  const labels={date:'Date',direction:'Direction',account:'Account',fund:'Main / Fund Account',memo:'General Description',reference:'Line Memo / Reference',amount:'Amount'},overlay=document.createElement('div');overlay.id='workspaceCellOverlay';overlay.className='workspace-cell-overlay';overlay.innerHTML=`<div class="workspace-cell-dialog"><div class="modal-header"><h4>Edit ${labels[field]}</h4><button type="button" class="modal-close-x" onclick="document.getElementById('workspaceCellOverlay').remove()">&times;</button></div><div class="modal-body"><div class="settings-field"><label>${labels[field]}</label>${control}</div></div><div class="modal-footer"><button type="button" class="je-btn je-btn-secondary" onclick="document.getElementById('workspaceCellOverlay').remove()">Cancel</button><button type="button" class="je-btn je-btn-emerald" onclick="saveWorkspaceCell('${userId}','${key}','${field}')">Save</button></div></div>`;document.body.appendChild(overlay);requestAnimationFrame(()=>document.getElementById('workspaceCellInput')?.focus())
}
async function saveWorkspaceCell(userId,key,field){const user=availableSubUsers().find(item=>String(item.id)===String(userId))||liveProfile,row=workspaceRowByKey(userId,key),rules=workspaceRules(user),input=document.getElementById('workspaceCellInput');if(!row||!input)return;let value=input.value;if(field==='amount')value=parseAppNumber(value);if(field==='direction'){row.direction=value;row.selected_account_id='';row.account_id='';row.fund_account_id=(!rules.multiple||rules.fundIds.length===1)?rules.fundIds[0]:''}else if(field==='account'){row.selected_account_id=value;if(row.direction==='in')row.fund_account_id=value;else row.account_id=value}else row[field]=value;if(!row.isNew){workspaceRowEdits[userId]??={};workspaceRowEdits[userId][row.id]=row}document.getElementById('workspaceCellOverlay')?.remove();const complete=row.transaction_date&&row.direction&&row.selected_account_id&&row.memo&&Number(row.amount)>0&&Boolean(row.fund_account_id);if(complete)await persistWorkspaceSingleRow(user,row,rules);else{renderSubUserWorkspace();if(field==='direction')requestAnimationFrame(()=>openWorkspaceCellEditor(userId,key,'account'))}}
async function persistWorkspaceSingleRow(user,row,rules){
  if(!ojmDb||!liveProfile)return;const staff=liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff&&user.id!==liveProfile.id){showCenterStatus('You can only edit your own workspace.',true);return}let journal=workspaceJournalForDate(user.id,row.transaction_date);if(journal&&!['draft','returned'].includes(journal.status)){showCenterStatus('This month is locked while under review or after posting.',true);return}if(!journal){const month=row.transaction_date.slice(0,7),created=await ojmDb.from('staff_journals').upsert({owner_id:user.id,period_start:`${month}-01`,period_end:new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).toISOString().slice(0,10),status:'draft',updated_at:new Date().toISOString()},{onConflict:'owner_id,period_start'}).select().single();if(created.error){showCenterStatus(`Entry save failed: ${created.error.message}`,true);return}journal={...created.data,lines:[]}}
  const fundId=row.direction==='in'?row.selected_account_id:(row.fund_account_id||rules.fundIds[0]),accountId=row.direction==='in'?rules.counterpart:row.selected_account_id,result=await ojmDb.rpc('save_staff_workspace_entry_v3',{p_owner_id:user.id,p_line_id:row.isNew?null:row.id,p_client_key:row.isNew?(row.key||=crypto.randomUUID()):null,p_transaction_date:row.transaction_date,p_direction:row.direction,p_fund_account_id:fundId,p_account_id:row.direction==='in'?fundId:accountId,p_memo:row.memo,p_reference:row.reference||'',p_amount:Number(row.amount),p_entry_kind:row.direction==='in'?'collection':'payment'});if(result.error){showCenterStatus(`Entry save failed: ${result.error.message}. Install SQL 11 if it has not been applied yet.`,true);renderSubUserWorkspace();return}if(row.isNew)workspacePendingRows[user.id]=pendingRowsFor(user.id).filter(item=>item.key!==row.key);else if(workspaceRowEdits[user.id])delete workspaceRowEdits[user.id][row.id];await loadStaffJournalsForReview();showCenterStatus(`${result.data?.[0]?.workspace_entry_no||'Entry'} saved.`)
}
function removeWorkspaceSingleRow(userId,key){const pending=pendingRowsFor(userId).find(row=>row.key===key);if(pending){workspacePendingRows[userId]=pendingRowsFor(userId).filter(row=>row.key!==key);renderSubUserWorkspace();return}deleteWorkspaceEntry(userId,key)}

renderSubUserWorkspace=function(){const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;const staff=liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review'));if(staff){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:true}];activeSubUserId='self'}else if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(u=>u.id===tab.userId),label=staff?subUserName(user||liveProfile):(tab.permanent?'Home':user?subUserName(user):'New Tab');return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');const add=document.querySelector('.sub-user-add-tab');if(add)add.hidden=Boolean(staff);const tab=activeSubUserTab();if(tab?.permanent&&!staff){panel.innerHTML=renderWorkspaceHome();return}const user=availableSubUsers().find(u=>String(u.id)===String(tab?.userId));if(!user){panel.innerHTML='<div class="sub-user-empty-state">This user workspace could not be loaded.</div>';return}const journal=currentWorkspaceJournal(user.id),entries=currentWorkspaceDraftEntries(user.id),status=journal?.status||'clear',locked=['submitted','approved_pending_post','posted'].includes(status),permission=subUserPermission(user),inReview=(reviewStaffJournals||[]).filter(j=>j.owner_id===user.id&&j.status==='submitted').length;panel.innerHTML=`<section class="workspace-main-card"><div class="sub-user-profile-grid workspace-profile-actions"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(permission.job_title||user.role||'Sub-user')}</strong></div><div class="workspace-inline-actions"><button type="button" class="workspace-status-badge ${workspaceStatusClass(status)}" onclick="openWorkspaceReview('${user.id}')">${escapeHtml(workspaceStatusLabel(status,entries.length))}${inReview?` (${inReview})`:''}</button><button type="button" class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}')">Review &amp; History</button><button type="button" class="je-btn je-btn-emerald" ${!entries.length||locked?'disabled':''} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div></div>${assignedFundTableHtml(user,entries)}</section>${locked?'<div class="settings-compact-note">The current month is locked for submission, but you can still enter a different date or review its history.</div>':''}${workspaceSingleEntryHtml(user,false)}`;refreshWorkspaceEntryId(user.id)};

assignedFundTableHtml=function(user,entries){const rules=workspaceRules(user),activity=entries.length?entries:((reviewStaffJournals||[]).find(j=>j.owner_id===user.id&&String(j.period_start).slice(0,7)===new Date().toISOString().slice(0,7))?.lines||[]);return`<div class="assigned-fund-table"><div class="settings-section-header"><div><h4>Assigned Main Accounts</h4><p>Money In increases the projected activity; Money Out reduces it. Official balances change only after final journal posting.</p></div></div><div class="table-container"><table class="je-table"><thead><tr><th>Main Account</th><th class="num">Money In</th><th class="num">Money Out</th><th class="num">Net Activity</th></tr></thead><tbody>${rules.fundIds.map(id=>{const incoming=activity.filter(line=>line.direction==='in'&&String(line.fund_account_id)===String(id)).reduce((sum,line)=>sum+Number(line.amount||0),0),outgoing=activity.filter(line=>line.direction!=='in'&&String(line.fund_account_id)===String(id)).reduce((sum,line)=>sum+Number(line.amount||0),0),net=incoming-outgoing;return`<tr><td>${escapeHtml(accountLabelOnly(id))}</td><td class="num">${formatAppNumber(incoming)}</td><td class="num">${formatAppNumber(outgoing)}</td><td class="num ${net<0?'negative-amount':''}">${formatAppNumber(net)}</td></tr>`}).join('')||'<tr><td colspan="4" class="period-empty">Assign at least one Main Account in Settings → Users & Permissions.</td></tr>'}</tbody></table></div></div>`};

prepareReviewJournal=function(id){const journal=allReviewJournals().find(item=>item.id===id);if(!journal)return;showAppConfirm('Approve & Prepare Journal','Approve this submission and copy its balanced debit and credit lines into Post Double Entry for final checking? Nothing will be posted until you press Post Entry there.','Prepare Journal',()=>{switchTab('journal');const multi=document.getElementById('jeMultipleDates');if(multi)multi.checked=true;document.body.classList.add('je-multi-date');const body=document.getElementById('jeLinesBody');if(body)body.innerHTML='';document.getElementById('jeGeneralMemo').value=`Sub-user submission — ${getLiveUserName(journal.owner_id)} — ${String(journal.period_start).slice(0,7)}`;(journal.lines||[]).forEach(line=>{const memo=[line.memo,line.reference].filter(Boolean).join(' • '),currency=line.currency_code||'LAK',fundName=line.fund_account_name||workspaceAccountName(line.fund_account_id,'Assigned Main Account'),otherName=lineAccountName(line),debitName=line.direction==='in'?fundName:otherName,creditName=line.direction==='in'?otherName:fundName;addJournalLineRow(debitName,memo,String(line.amount),{});const debitRow=body.lastElementChild;if(debitRow?.querySelector('.je-line-date'))debitRow.querySelector('.je-line-date').value=line.transaction_date;addJournalLineRow(creditName,memo,'',{[currency]:String(line.amount)});const creditRow=body.lastElementChild;if(creditRow?.querySelector('.je-line-date'))creditRow.querySelector('.je-line-date').value=line.transaction_date});calculateJournalBalance();pendingWorkspacePostOwnerId=journal.owner_id;pendingWorkspacePostJournalId=journal.id;pendingWorkspacePostIsLocal=Boolean(journal.isWorkspace);showCenterStatus('Submission approved and copied to Post Double Entry. Check it, then press Post Entry when ready.')},false)};

submitWorkspaceForReview=async function(userId){if(pendingRowsFor(userId).length||Object.keys(workspaceRowEdits[userId]||{}).length||(typeof wsSaving!=='undefined'&&wsSaving.size)){showCenterStatus('Complete or remove unsaved rows before submitting.',true);return}const journal=currentWorkspaceJournal(userId);if(!journal||!['draft','returned'].includes(journal.status)||!journal.lines?.length)return;try{if(!await window.Reports14253.submit([journal]))return;await loadStaffJournalsForReview();showCenterStatus('Submitted for review.')}catch(e){showCenterStatus(e.message,true)}};

// FOUNDATION V7 — password recovery, durable workspace tabs, and granular navigation permissions.
const APP_PERMISSION_TREE=[
  {id:'dashboard',label:'Dashboard',children:[['dashboard','Dashboard']]},
  {id:'transactions',label:'Transactions',children:[['journal','Journal'],['transactions-all','All Transactions'],['transactions-recurring','Upcoming Transactions'],['user-entry-review','Entry Submission Review'],['period-review','Period Review & Closing'],['transactions-voided','Transaction Audit Log']]},
  {id:'sub-users',label:'Sub-Users',children:[['sub-users-workspace','User Workspace']]},
  {id:'accounts',label:'Accounts',children:[['sec-chart-accounts','Chart of Accounts'],['sec-sub-accounts','Sub-Accounts'],['sec-other-accounts','Other Account Sections']]},
  {id:'hr',label:'Human Resources',children:[['payroll-employees','Employees'],['hr-contracts','Contracts & Documents'],['hr-attendance','Attendance'],['hr-leave','Leave'],['hr-assessments','Assessments']]},
  {id:'payroll',label:'Payroll',children:[['payroll-overview','Payroll Overview'],['payroll-employees','Employees'],['payroll-entries','Payroll Entries'],['payroll-history','Salary History'],['payroll-deductions','Payroll Deductions']]},
  {id:'documents',label:'Documents',children:[['document-editor105','Document Editor / Print Preparation']]},
  {id:'reports',label:'Reports',children:[['report-pl','Profit and Loss'],['report-bs','Balance Sheet'],['report-cf','Cash Flow'],['report-tb','Trial Balance'],['report-gl','General Ledger'],['report-activity','Account Activity'],['report-expense','Expense Report'],['report-payroll','Payroll Report'],['report-reconciliation','Reconciliation Reports']]},
  {id:'tax-sso',label:'Tax and SSO',children:[['tax-overview','Tax Overview'],['tax-vat','VAT'],['tax-pit','Personal Income Tax'],['tax-social','Social Security'],['tax-payment','Tax and Social Payment'],['tax-sso-payment','SSO Payment'],['tax-records','Tax and SSO Records']]},
  {id:'settings',label:'Settings',children:[['settings-business','Business Information'],['settings-users','Users & Permissions'],['settings-accounting','Accounting'],['settings-payroll','Payroll'],['settings-tax','Statutory'],['settings-print','Printing'],['settings-system','System']]}
];
function permissionToken(parent,target){return`${parent}:${target}`}
function permissionTreeNodeForTarget(target){return APP_PERMISSION_TREE.find(parent=>parent.children.some(([id])=>id===target))}
renderPermissionGrid=function(selected=[]){
  const host=document.getElementById('userPermissionGrid');if(!host)return;const chosen=new Set(selected||[]);host.className='permission-tree';host.innerHTML=APP_PERMISSION_TREE.map(parent=>{const explicitAll=chosen.has(`all:${parent.id}`),legacyAll=chosen.has(parent.id)&&parent.id!=='sub-users',legacyWorkspaceOnly=parent.id==='sub-users'&&chosen.has('sub-users'),children=parent.children.map(([id,label])=>{const checked=explicitAll||legacyAll||chosen.has(permissionToken(parent.id,id))||(legacyWorkspaceOnly&&id==='sub-users-workspace');return`<label class="permission-child"><input class="permission-sub-check" type="checkbox" data-parent="${parent.id}" value="${permissionToken(parent.id,id)}" ${checked?'checked':''} onchange="syncPermissionParent('${parent.id}')"><span>${escapeHtml(label)}</span></label>`}).join(''),isOpen=explicitAll||chosen.has(parent.id)||parent.children.some(([id])=>chosen.has(permissionToken(parent.id,id)));return`<details class="permission-parent" data-permission-parent="${parent.id}" ${isOpen?'open':''}><summary><input class="permission-parent-check" type="checkbox" value="all:${parent.id}" onclick="event.stopPropagation()" onchange="togglePermissionParent('${parent.id}',this.checked)"><span class="permission-parent-title"><strong>${escapeHtml(parent.label)}</strong><small>${parent.children.length} subcategor${parent.children.length===1?'y':'ies'}</small></span></summary><div class="permission-children">${children}</div></details>`}).join('');APP_PERMISSION_TREE.forEach(parent=>syncPermissionParent(parent.id))
}
function togglePermissionParent(parentId,checked){document.querySelectorAll(`#userPermissionGrid .permission-sub-check[data-parent="${CSS.escape(parentId)}"]`).forEach(input=>input.checked=checked);syncPermissionParent(parentId);updateUserAccessSummaries()}
function syncPermissionParent(parentId){const children=[...document.querySelectorAll(`#userPermissionGrid .permission-sub-check[data-parent="${CSS.escape(parentId)}"]`)],parent=document.querySelector(`#userPermissionGrid [data-permission-parent="${CSS.escape(parentId)}"] .permission-parent-check`);if(!parent||!children.length)return;const count=children.filter(input=>input.checked).length;parent.checked=count===children.length;parent.indeterminate=count>0&&count<children.length}
function selectedPermissionLabels(){return[...document.querySelectorAll('#userPermissionGrid .permission-sub-check:checked')].map(input=>input.closest('label')?.textContent.trim()).filter(Boolean)}
updateUserAccessSummaries=function(){const modules=selectedPermissionLabels(),actions=selectedAccessLabels('#userSecurityAccessPanel input'),funds=selectedAccountNames('#userFundAccountGrid'),entries=selectedAccountNames('#userAccountAccessGrid'),moduleSummary=document.getElementById('userModuleAccessSummary'),securitySummary=document.getElementById('userSecurityAccessSummary'),accountSummary=document.getElementById('userAccountAssignmentSummary');if(moduleSummary)moduleSummary.textContent=`${modules.length} module${modules.length===1?'':'s'} selected`;if(securitySummary)securitySummary.textContent=`${actions.length} action${actions.length===1?'':'s'} selected`;if(accountSummary)accountSummary.textContent=`${funds.length} main • ${entries.length} entry`;updateAccountAssignmentBullets();const counterpart=document.getElementById('moneyInCounterpartField');if(counterpart)counterpart.hidden=!document.getElementById('permissionAllowIn')?.checked};
function modulePermissionList(){return liveProfile?.role==='admin'?APP_PERMISSION_TREE.map(parent=>parent.id):(livePermission?.modules||[])}
function canAccessAppTarget(target){if(!liveProfile||liveProfile.role==='admin')return true;const parent=permissionTreeNodeForTarget(target);if(!parent)return false;const modules=modulePermissionList(),legacyParent=modules.includes(parent.id)&&(parent.id!=='sub-users'||target==='sub-users-workspace');return modules.includes(`all:${parent.id}`)||legacyParent||modules.includes(permissionToken(parent.id,target))||(target==='user-entry-review'&&modules.includes('user-review'))}
function firstPermittedAppTarget(){for(const parent of APP_PERMISSION_TREE)for(const[target]of parent.children)if(canAccessAppTarget(target))return target;return''}
function navButtonTarget(button){const code=button.getAttribute('onclick')||'';if(code.includes('openDocumentEditor105'))return 'document-editor105';const match=code.match(/(?:switchTab|scrollToAccountModule)\('([^']+)'\)/);return match?.[1]||''}
function applyGranularPermissionAccess(){
  document.querySelectorAll('.nav-category[data-module]').forEach(category=>{const parent=APP_PERMISSION_TREE.find(item=>item.id===category.dataset.module);if(!parent){category.hidden=true;return}const buttons=[...category.querySelectorAll('.nav-links .tab-btn')];buttons.forEach(button=>{const target=navButtonTarget(button);button.hidden=!canAccessAppTarget(target)});category.hidden=!parent.children.some(([target])=>canAccessAppTarget(target))});
  document.querySelectorAll('.settings-browser-tab[data-settings-target]').forEach(button=>button.hidden=!canAccessAppTarget(button.dataset.settingsTarget));
  const accountView14231=document.getElementById('accounts-modular-container')?.dataset.accountView14231||'sec-chart-accounts';
  document.querySelectorAll('#accounts-modular-container [id^="sec-"]').forEach(section=>section.hidden=section.id!==accountView14231||!canAccessAppTarget(section.id));
}
const scrollToAccountModuleBeforeGranularAccess=scrollToAccountModule;
scrollToAccountModule=function(moduleId){if(liveProfile&&!canAccessAppTarget(moduleId)){const fallback=firstPermittedAppTarget();showCenterStatus('This account section is not included in your access permissions.',true);if(!fallback)return;if(fallback.startsWith('sec-'))moduleId=fallback;else return switchTab(fallback)}return scrollToAccountModuleBeforeGranularAccess(moduleId)};
sendSubUserPasswordReset=async function(id){const user=availableSubUsers().find(item=>item.id===id);if(!user?.email||!ojmDb){showCenterStatus('A valid user email is required.',true);return}try{const redirectTo=passwordRecoveryRedirectUrl();const{error}=await ojmDb.auth.resetPasswordForEmail(user.email,{redirectTo});showCenterStatus(error?error.message:`Password-reset link sent to ${user.email}.`,Boolean(error))}catch(failure){showCenterStatus(failure.message,true)}};
/* Oon Jai Accounting v49
 * Responsive sub-user workspace + transaction-owned review queue.
 * This layer deliberately reuses the existing Supabase/RPC journal backbone.
 */
(function () {
  'use strict';

  const mobile = window.matchMedia('(max-width: 767px)');
  const views = Object.create(null);
  let editing = null;
  let adjustmentRequests = [];

  const icon = name => {
    const paths={
      home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',accounts:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 9h10M7 13h6"/>',post:'<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',entries:'<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',records:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',fund:'<path d="M4 7h16v12H4z"/><path d="M7 7V5h10v2M8 11h8M8 15h5"/>',ready:'<path d="M5 4h14v16H5zM8 9l2 2 5-5M8 15h8"/>',review:'<path d="M4 5h10v14H4zM7 9h4M7 13h4"/><circle cx="17" cy="15" r="4"/><path d="m20 18 2 2"/>',alert:'<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg>`;
  };
  const number = value => formatAppNumber(value);
  const money = value => `${number(value)} LAK`;
  const monthLabel = value => {
    const date = new Date(`${String(value || '').slice(0, 7)}-01T00:00:00`);
    return Number.isNaN(date.valueOf()) ? 'Current period' : date.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  };
  const currentUser = id => availableSubUsers().find(user => String(user.id) === String(id)) || (String(liveProfile?.id) === String(id) ? liveProfile : null);
  const isStaff = () => Boolean(liveProfile && liveProfile.role !== 'admin' && !livePermission?.can_approve);
  const journalRows = userId => (reviewStaffJournals || []).filter(row => String(row.owner_id) === String(userId));
  const draftJournal = userId => journalRows(userId).find(row => ['draft','returned'].includes(row.status) && row.lines?.length) || journalRows(userId).find(row => ['draft','returned'].includes(row.status));
  const draftLines = userId => draftJournal(userId)?.lines || [];
  const getView = userId => views[userId] || 'home';

  function allocation(user, fundId) {
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    return Number(posted?.opening||0);
  }
  function activity(user, fundId) {
    const lines = journalRows(user.id).filter(journal=>['draft','returned','submitted'].includes(journal.status)).flatMap(journal => journal.lines || []).filter(line => !line.journal_entry_id && !wsIsCollection(line) && String(line.fund_account_id) === String(fundId));
    const adjustments = adjustmentRequests.filter(row => row.owner_id === user.id && row.fund_account_id === fundId && row.status === 'approved_applied').flatMap(row => row.lines || []);
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    const base = {received:Number(posted?.received||0), used:Number(posted?.used||0), handover:Number(posted?.handover||0)};
    lines.forEach(line => {
      if (line.entry_kind === 'collection' || line.direction === 'in') base.received += Number(line.amount || 0);
      else if (line.entry_kind === 'handover') base.handover += Number(line.amount || 0);
      else base.used += Number(line.amount || 0);
    });
    // Requests cannot change posted ledger balances; a linked journal is required.
    return base;
  }
  function remaining(user, fundId) {
    const row = activity(user, fundId);
    return allocation(user, fundId) + row.received - row.used - row.handover;
  }
  window.v49FundActivity = function(userId, fundId) {
    const user = currentUser(userId);
    if (!user) return null;
    const row = activity(user, fundId);
    const opening = allocation(user, fundId);
    return {opening, ...row, balance: opening + row.received - row.used - row.handover};
  };
  function accountTotals(user, lines) {
    const totals = new Map();
    const add = (id, side, amount) => {
      if (!id) return;
      const name = accountLabelOnly(id) || workspaceAccountName(id, 'Unassigned account');
      if (!totals.has(name)) totals.set(name, {dr:0, cr:0});
      totals.get(name)[side] += Number(amount || 0);
    };
    lines.forEach(line => {
      const fund = line.fund_account_id;
      const other = line.account_id;
      if (line.direction === 'in') { add(fund, 'dr', line.amount); add(other, 'cr', line.amount); }
      else { add(other, 'dr', line.amount); add(fund, 'cr', line.amount); }
    });
    return [...totals.entries()].filter(([, row]) => row.dr || row.cr);
  }
  function totalsTable(user, lines, className='') {
    const phone = className.includes('v49-home-totals') || className.includes('v62-phone-totals');
    const number = value => phone ? Number(value || 0).toLocaleString(appNumberLocale(), {minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()}) : formatAppNumber(value);
    const rows = accountTotals(user, lines);
    const dr = rows.reduce((sum, [, row]) => sum + row.dr, 0);
    const cr = rows.reduce((sum, [, row]) => sum + row.cr, 0);
    return `<section class="v49-card v49-totals ${className}"><header><div><h3>Account Totals</h3><p>${phone?'Double-entry counterpart preview for the current unsubmitted entries.':'Debit and Credit are positive; Balance is Debit minus Credit.'}</p></div><b>${rows.length} accounts</b></header><div class="v49-table-scroll"><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows.length ? rows.map(([name,row]) => `<tr><td>${escapeHtml(name)}</td><td>${row.dr ? number(row.dr) : (phone?'':'—')}</td><td>${row.cr ? number(row.cr) : (phone?'':'—')}</td><td class="${row.dr-row.cr<0?'negative-amount':''}">${number(row.dr-row.cr)}</td></tr>`).join('') + `<tr class="v49-overall"><td>Overall total</td><td>${number(dr)}</td><td>${number(cr)}</td><td>${number(dr-cr)}</td></tr>` : '<tr><td colspan="4" class="period-empty">No account activity yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function workspaceHeader(user) {
    return `<header class="v49-user-header"><div><h2>${escapeHtml(subUserAccountTitle14229(user))}</h2><p>Sub-user Account / ${escapeHtml(monthLabel(new Date().toISOString().slice(0,7)))}</p></div></header>`;
  }
  function dashboard(user) {
    const money = value => `${Number(value || 0).toLocaleString(appNumberLocale(), {minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()})} LAK`;
    const rules = workspaceRules(user);
    const lines = draftLines(user.id);
    const tracked = rules.fundIds.reduce((sum,id) => sum + remaining(user,id), 0);
    const reviews = journalRows(user.id).filter(row => row.status === 'submitted').length;
    const alerts = rules.fundIds.filter(id => remaining(user,id) < 0).length + adjustmentRequests.filter(row => row.owner_id === user.id && row.status === 'approved_applied').length;
    return `<section class="v49-dashboard v49-card"><div class="v49-hero"><span>Tracked remaining</span><strong>${money(tracked)}</strong><small>Across ${rules.fundIds.length} assigned account${rules.fundIds.length===1?'':'s'}</small></div><div class="v49-stat-grid"><button onclick="v49SetView('${user.id}','accounts')"><i>${icon('fund')}</i><strong>${rules.fundIds.length} <span>Assigned Funds</span></strong></button><button onclick="v49SetView('${user.id}','entries')"><i>${icon('ready')}</i><strong>${lines.length} <span>Ready Entries</span></strong></button><button onclick="v49OpenReview('${user.id}')"><i>${icon('review')}</i><strong class="red">${reviews} <span>Under Review</span></strong></button><button onclick="v49SetView('${user.id}','accounts')" class="${alerts?'attention':''}"><i>${icon('alert')}</i><strong>${alerts} <span>Alerts</span></strong></button></div></section>${totalsTable(user, lines, 'v49-home-totals')}`;
  }
  function accountsView(user) {
    const rules = workspaceRules(user);
    return `<section class="v49-card"><header><div><h3>Assigned Main Accounts</h3><p>Received, used, handed over, and remaining.</p></div></header><div class="v49-funds">${rules.fundIds.map(id => { const a=activity(user,id), balance=remaining(user,id), notices=adjustmentRequests.filter(row=>row.owner_id===user.id&&row.fund_account_id===id&&row.status==='approved_applied'); return `<article class="${balance<0?'attention':''}"><div class="v49-fund-name"><span>Main account</span><strong>${escapeHtml(accountLabelOnly(id))}</strong><div class="v49-fund-buttons">${notices.length?`<button class="notice" onclick="v49OpenNotices('${user.id}','${id}')">✓ ${notices.length}</button>`:''}<button onclick="v49OpenAdjustment('${user.id}','${id}')">Adjust</button></div></div><div><span>Funds received</span><b>${number(a.received)}</b></div><div><span>Funds used</span><b>${number(a.used)}</b></div><div><span>Handed over</span><b>${number(a.handover)}</b></div><div><span>Tracked remaining</span><b class="${balance<0?'negative-amount':''}">${money(balance)}</b></div></article>`; }).join('') || '<div class="period-empty">No main account is assigned.</div>'}</div></section>`;
  }
  function options(ids, selected, placeholder) {
    return `<option value="">${placeholder}</option>${ids.map(id => `<option value="${escapeHtml(id)}" ${String(id)===String(selected)?'selected':''}>${escapeHtml(accountLabelOnly(id))}</option>`).join('')}`;
  }
  function postView(user) {
    const rules = workspaceRules(user);
    const row = editing?.userId === user.id ? editing.draft : {};
    const nextId = row.workspace_entry_no || localWorkspaceEntryPreview(user);
    const direction = row.entry_kind === 'handover' ? 'handover' : (row.direction || '');
    return `<section class="v49-card v49-post"><header><div><h3>Post Single Entry</h3><p>Each saved entry keeps its own unique sub-user Entry ID.</p></div><div class="v49-post-tools"><b>Entry ID: ${escapeHtml(nextId)}</b><button onclick="v49OpenProtocol()">Protocol</button></div></header><div class="v49-form"><label><span>Date</span><input id="v49Date" type="date" value="${escapeHtml(row.transaction_date || new Date().toISOString().slice(0,10))}" oninput="v49ValidatePost()"></label><label><span>Direction</span><select id="v49Direction" onchange="v49DirectionChanged('${user.id}')"><option value="">Select</option>${rules.directions.includes('in')?`<option value="in" ${direction==='in'?'selected':''}>Money In</option>`:''}${rules.directions.includes('out')?`<option value="out" ${direction==='out'?'selected':''}>Money Out</option><option value="handover" ${direction==='handover'?'selected':''}>Handover</option>`:''}</select></label><label><span>Amount</span><input id="v49Amount" inputmode="decimal" value="${row.amount?number(row.amount):''}" placeholder="0" onfocus="this.select()" oninput="v49FormatAmount(this);v49ValidatePost()" onblur="finishAppNumberEditing(this);v49ValidatePost()"></label><label><span>Main / Fund</span><select id="v49Fund" onchange="v49FundChanged()">${options(rules.fundIds,row.fund_account_id,'Select fund')}</select></label><label><span>Account</span><select id="v49Account" onchange="v49ValidatePost()">${options(direction==='in'?rules.fundIds:rules.entryIds,row.account_id||row.selected_account_id,'Select account')}</select></label><label class="full"><span>Description / Reference</span><textarea id="v49Description" rows="3" placeholder="Transaction details, receipt number, or reference" oninput="v49ValidatePost()">${escapeHtml([row.memo,row.reference].filter(Boolean).join(' — '))}</textarea></label></div><div class="v49-post-actions"><button class="je-btn je-btn-secondary" onclick="v49ClearPost('${user.id}')">Clear</button><button id="v49Save" class="je-btn je-btn-emerald" disabled onclick="v49SavePost('${user.id}')">Save Entry</button></div></section>`;
  }
  function entriesView(user) {
    const journal = draftJournal(user.id), lines = orderedRecords78(journal?.lines || []);
    const canSubmit = lines.length > 0 && ['draft','returned'].includes(journal?.status);
    const cards = lines.map(line => {
      const direction = line.entry_kind==='handover'?'Handover':line.direction==='in'?'Money In':'Money Out';
      return `<details class="v64-entry" name="phone-current-entries"><summary><span><strong>${escapeHtml(line.workspace_entry_no || 'Legacy entry')}</strong><small>${escapeHtml(formatAppDate(line.transaction_date))}</small></span><b>${Number(line.amount||0).toLocaleString('en-US',{maximumFractionDigits:2})} ${escapeHtml(line.currency_code||'LAK')}</b></summary><div class="v64-entry-body"><dl><div><dt>Direction</dt><dd>${direction}</dd></div><div><dt>Main / Fund</dt><dd>${escapeHtml(accountLabelOnly(line.fund_account_id)||'—')}</dd></div><div><dt>Description / Reference</dt><dd>${escapeHtml([line.memo,line.reference].filter(Boolean).join(' · ')||'—')}</dd></div></dl><div class="v64-entry-actions"><button type="button" class="je-btn je-btn-secondary" onclick="v49EditEntry('${user.id}','${line.id}')">Edit</button><button type="button" class="je-btn je-btn-danger" onclick="voidWorkspaceSingleRow('${user.id}','${line.id}')">Delete</button></div></div></details>`;
    }).join('');
    return `<section class="v49-card"><header><div><h3>Current Entries</h3><p>${lines.length} ${lines.length===1?'entry':'entries'} ready</p></div><button class="je-btn je-btn-emerald" ${canSubmit?'':'disabled'} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></header><div class="v49-entry-list">${cards || '<div class="period-empty">No saved entries. Use Post to add one.</div>'}</div></section>`;
  }
  function recordCard(user, journal) {
    const lines = journal.lines || [];
    return `<details class="v49-record"><summary><span><strong>${escapeHtml(journal.seed_key || `SUB-${String(journal.id).slice(0,8).toUpperCase()}`)}</strong><small>${escapeHtml(monthLabel(journal.period_start))} · ${escapeHtml(String(journal.status).replaceAll('_',' '))}</small></span><b>${lines.length} entr${lines.length===1?'y':'ies'}</b></summary><div class="v49-record-body"><div class="v49-table-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description</th><th>Amount</th></tr></thead><tbody>${lines.map(line => `<tr><td>${escapeHtml(line.workspace_entry_no||'—')}</td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo)}</td><td>${number(line.amount)}</td></tr>`).join('')}</tbody></table></div>${totalsTable(user, lines)}</div></details>`;
  }
  function recordsView(user) {
    const history = journalRows(user.id).filter(row => ['posted','reviewed','approved','approved_applied'].includes(row.status)).sort((a,b) => String(b.updated_at||b.period_start).localeCompare(String(a.updated_at||a.period_start)));
    const count = journalRows(user.id).filter(row => row.status==='submitted').length;
    const adjustments=adjustmentRequests.filter(row=>row.owner_id===user.id&&!['submitted','returned'].includes(row.status)).sort((a,b)=>String(b.updated_at||b.submitted_at).localeCompare(String(a.updated_at||a.submitted_at)));
    return `<section class="v49-card v49-records"><header><div><h3>History</h3><p>Approved and posted records, newest first.</p></div><button class="je-btn je-btn-secondary" onclick="v49OpenReview('${user.id}')">Review <b class="red">+${count}</b></button></header><div class="v49-record-list">${adjustments.map(adjustmentRecordCard).join('')}${history.map(row => recordCard(user,row)).join('') || (!adjustments.length?'<div class="period-empty">No history yet.</div>':'')}</div></section>`;
  }
  function bottomNav(user) {
    const current = getView(user.id);
    return `<nav class="v49-bottom-nav">${[['home','Home'],['accounts','Accounts'],['post','Post'],['entries','Entries'],['records','Records']].map(([key,label]) => `<button class="${current===key?'active':''}" onclick="v49SetView('${user.id}','${key}')"><i>${icon(key)}</i><span>${label}</span>${key==='entries'&&draftLines(user.id).length?`<b class="v65-entry-badge">+${draftLines(user.id).length}</b>`:''}</button>`).join('')}</nav>`;
  }
  function desktopHeader(user) {
    const rules=workspaceRules(user),rows=workspaceEditableRows(user),complete=row=>Boolean(row.transaction_date&&row.direction&&(row.account_id||row.selected_account_id)&&row.fund_account_id&&(row.memo||row.reference)&&Number(row.amount)>0),hasIncomplete=rows.some(row=>!complete(row)),ready=draftLines(user.id).length>0&&!hasIncomplete,reviews=journalRows(user.id).filter(row=>row.status==='submitted').length+adjustmentRequests.filter(row=>String(row.owner_id)===String(user.id)&&row.status==='submitted').length,permission=subUserPermission(user);
    return `<header class="v49-desktop-user-heading"><div><h2>${escapeHtml(subUserAccountTitle14229(user))}</h2><p>${escapeHtml(monthLabel(new Date().toISOString().slice(0,7)))} · ${escapeHtml(permission.job_title||user.role||'Sub-user')}${user.email?` · ${escapeHtml(user.email)}`:''}</p></div><div class="v49-desktop-user-actions"><button class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}','review')">Review${reviews?` <b>${reviews}</b>`:''}</button><button class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}','history')">History</button><button class="je-btn je-btn-emerald" ${ready?'':'disabled'} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div></header>`;
  }
  function desktopAccounts(user) {
    const rules=workspaceRules(user),negative=[];
    const cards=rules.fundIds.map(id=>{const a=activity(user,id),balance=remaining(user,id),notices=adjustmentRequests.filter(row=>String(row.owner_id)===String(user.id)&&String(row.fund_account_id)===String(id)&&row.status==='approved_applied');if(balance<0)negative.push([id,balance]);return `<article class="v49-desktop-fund-row ${balance<0?'attention':''}"><div><span>Main account</span><strong>${escapeHtml(accountLabelOnly(id))}</strong></div><div><span>Funds received</span><b>${number(a.received)}</b></div><div><span>Funds used</span><b>${number(a.used)}</b></div><div><span>Handed over</span><b>${number(a.handover)}</b></div><div class="remaining"><span>Tracked fund remaining</span><b class="${balance<0?'negative-amount':''}">${money(balance)}</b></div><div class="action">${notices.length?`<button class="v49-approved-adjustment" onclick="v49OpenNotices('${user.id}','${id}')">✓ ${notices.length}</button>`:''}<button onclick="v49OpenAdjustment('${user.id}','${id}')">Adjust</button></div></article>`}).join('');
    return `<section class="v49-card v49-desktop-accounts"><header><div><h3>Assigned Main Accounts</h3><p>Received, used, handed over, and remaining funds are kept together in one module.</p></div></header><div class="v49-desktop-funds">${cards||'<div class="period-empty">No main account is assigned.</div>'}</div></section>${negative.length?`<div class="v49-desktop-negative"><div><strong>Fund balance needs attention</strong><span>${negative.map(([id,balance])=>`${escapeHtml(accountLabelOnly(id))} is ${money(Math.abs(balance))} below zero`).join(' · ')}</span></div><button type="button" onclick="v49OpenAdjustment('${user.id}','${negative[0][0]}')">Review possible reasons →</button></div>`:''}`;
  }
  function desktopEntryCell(user,row,field,label) {
    if(window.workspaceInlineCell117)return workspaceInlineCell117(user,row,field,label);
    const rules=workspaceRules(user),value=field==='date'?formatAppDate(row.transaction_date):field==='direction'?(row.entry_kind==='handover'?'Handover':row.direction==='in'?'Money In':'Money Out'):field==='account'?lineAccountName(row):field==='fund'?accountLabelOnly(row.fund_account_id):field==='description'?[row.memo,row.reference].filter(Boolean).join(' · '):field==='amount'?(Number(row.amount)>0?number(row.amount):''):'';
    const editor=field==='date'?'date':field==='description'?'memo':field;
    return `<td data-label="${label}"><button type="button" class="v49-desktop-cell ${value?'':'empty'} ${field==='amount'?'num':''}" onclick="openWorkspaceCellEditor('${user.id}','${row.key}','${editor}')">${escapeHtml(value||({date:'mm/dd/yyyy',direction:'Select',account:'Select account',fund:'Select fund',description:'Add description / reference',amount:'0'}[field]))}</button></td>`;
  }
  function desktopPost(user) {
    const rows=workspaceEditableRows(user),complete=row=>Boolean(row.transaction_date&&row.direction&&(row.account_id||row.selected_account_id)&&row.fund_account_id&&(row.memo||row.reference)&&Number(row.amount)>0);
    return `<section class="v49-card v49-desktop-post"><header><div><h3>Post Single Entry</h3><p>Each source entry keeps its own unique sub-user Entry ID.</p></div><div class="v49-desktop-post-tools"><button class="v49-desktop-protocol" onclick="v49OpenProtocol()">Protocol</button><button class="je-btn je-btn-emerald" onclick="addWorkspaceEntryRow('${user.id}')">+ Add Row</button></div></header><div class="v49-desktop-entry-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Direction</th><th>Account</th><th>Main / Fund</th><th>Description / Reference</th><th>Amount</th><th>Action</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr class="${complete(row)?'':'incomplete'}"><td><strong>${escapeHtml(row.workspace_entry_no||localWorkspaceEntryPreview(user))}</strong></td>${desktopEntryCell(user,row,'date','Date')}${desktopEntryCell(user,row,'direction','Direction')}${desktopEntryCell(user,row,'account','Account')}${desktopEntryCell(user,row,'fund','Main / Fund')}${desktopEntryCell(user,row,'description','Description / Reference')}${desktopEntryCell(user,row,'amount','Amount')}<td class="action"><button class="delete-row" onclick="voidWorkspaceSingleRow('${user.id}','${row.key}')" aria-label="Remove entry row">×</button></td></tr>`).join(''):'<tr><td colspan="8" class="period-empty">No current entries. Select Add Row to begin.</td></tr>'}</tbody></table></div></section>`;
  }
  function desktopAdminHome() {
    const users=availableSubUsers(),assigned=users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.length,0),reviews=(reviewStaffJournals||[]).filter(row=>row.status==='submitted').length,negative=users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.filter(id=>remaining(user,id)<0).length,0);
    const rows=users.flatMap(user=>workspaceRules(user).fundIds.map(id=>{const a=activity(user,id),balance=remaining(user,id),pending=journalRows(user.id).some(row=>row.status==='submitted');return `<tr role="button" tabindex="0" data-open-workspace-user="${user.id}" onclick="openWorkspaceUser('${user.id}')"><td><strong>${escapeHtml(subUserName(user))}</strong><small>${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</small></td><td>${escapeHtml(accountLabelOnly(id))}</td><td>${number(a.received)}</td><td>${number(a.used)}</td><td>${number(a.handover)}</td><td class="${balance<0?'negative-amount':''}">${money(balance)}</td><td><em class="${balance<0?'bad':pending?'review':'good'}">${balance<0?'ATTENTION':pending?'FOR REVIEW':'CURRENT'}</em></td></tr>`}));
    return `<section class="v49-desktop-admin"><div class="v49-desktop-home-title"><h2>Sub-users Workspace</h2><p>Search for a user or review everyone’s current fund activity.</p><div class="sub-user-search-wrap"><span class="v49-search-icon">⌕</span><input id="subUserTabSearch" class="je-input" type="search" autocomplete="off" placeholder="Search by name, email, or position" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div><div class="v49-desktop-stats"><div><i>${icon('home')}</i><strong>${users.length} <span>Sub-users</span></strong></div><div><i>${icon('fund')}</i><strong>${assigned} <span>Assigned Funds</span></strong></div><div><i>${icon('review')}</i><strong>${reviews} <span>Reviews</span></strong></div><div class="attention"><i>${icon('alert')}</i><strong>${negative} <span>Negative Funds</span></strong></div></div><section class="v49-card"><header><div><h3>User Fund Overview</h3><p>Current activity for every assigned main account.</p></div><b>${users.length} users</b></header><div class="v49-desktop-home-table"><table><thead><tr><th>User</th><th>Main account</th><th>Funds received</th><th>Funds used</th><th>Handover</th><th>Tracked remaining</th><th>Status</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="7" class="period-empty">No sub-users are available.</td></tr>'}</tbody></table></div></section></section>`;
  }
  function renderUser(user) {
    const view = getView(user.id);
    let content = view==='accounts'?accountsView(user):view==='post'?postView(user):view==='entries'?entriesView(user):view==='records'?recordsView(user):dashboard(user);
    if(view==='home') {
      const warnings=workspaceRules(user).fundIds.some(id=>remaining(user,id)<0), ready=draftLines(user.id).length;
      const next=warnings?'accounts':ready?'entries':'post';
      const message=warnings?'Review the warning on your assigned account.':ready?'Check your saved entries before submitting.':'Record your next transaction.';
      content+=`<div class="v62-next-action"><span>Next action</span><strong>${message}</strong><button class="je-btn je-btn-emerald" onclick="v49SetView('${user.id}','${next}')">Open</button></div>`;
    }
    return `<div class="v49-phone-workspace">${workspaceHeader(user)}<main>${content}</main>${bottomNav(user)}</div><div class="v49-desktop-workspace">${desktopHeader(user)}<main>${desktopAccounts(user)}${desktopPost(user)}${totalsTable(user,draftLines(user.id))}</main></div>`;
  }

  function adminHome() {
    const users = availableSubUsers();
    const assigned = users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.length,0);
    const reviews = (reviewStaffJournals||[]).filter(row=>row.status==='submitted').length;
    const negatives = users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.filter(id=>remaining(user,id)<0).length,0);
    return `<section class="v49-admin-home"><div class="v49-home-title"><h2>Sub-users Workspace</h2><p>Search for a user or review everyone’s current fund activity.</p><div class="sub-user-search-wrap"><input id="subUserTabSearch" class="je-input" type="search" placeholder="Search by name, email, or position" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div><div class="v49-stat-grid admin"><div><i>${icon('home')}</i><strong>${users.length} <span>Sub-users</span></strong></div><div><i>${icon('fund')}</i><strong>${assigned} <span>Assigned Funds</span></strong></div><div><i>${icon('review')}</i><strong>${reviews} <span>Reviews</span></strong></div><div class="attention"><i>${icon('alert')}</i><strong>${negatives} <span>Negative Funds</span></strong></div></div><section class="v49-card"><header><div><h3>User Fund Overview</h3><p>Current activity for every assigned main account.</p></div><b>${users.length} users</b></header><div class="v49-user-overview">${users.map(user=>{const rules=workspaceRules(user),total=rules.fundIds.reduce((sum,id)=>sum+remaining(user,id),0),attention=rules.fundIds.some(id=>remaining(user,id)<0);return`<button onclick="openWorkspaceUser('${user.id}')"><span><strong>${escapeHtml(subUserName(user))}</strong><small>${rules.fundIds.length} fund${rules.fundIds.length===1?'':'s'} · ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</small></span><span><b>${money(total)}</b><em class="${attention?'bad':'good'}">${attention?'ATTENTION':'CURRENT'}</em></span></button>`}).join('')}</div></section></section>`;
  }

  const originalRender = window.renderSubUserWorkspace;
  window.renderSubUserWorkspace = function () {
    const tabs=document.getElementById('subUserWorkspaceTabs'), panel=document.getElementById('subUserWorkspacePanel');
    if(!tabs||!panel) return;
    const staff=isStaff();
    if(staff){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:true}];activeSubUserId='self'}
    else if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}
    tabs.innerHTML='<button type="button" class="sub-user-mobile-menu" aria-label="Open main navigation" aria-controls="appSidebar" onclick="toggleMobileNavigation()"><span></span><span></span><span></span></button>' + openSubUserTabs.map(tab=>{const user=currentUser(tab.userId),label=tab.permanent?'Home':user?subUserName(user):'New';return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span class="v62-tab-label" data-phone-label="${escapeHtml(label.trim().split(/\s+/)[0])}">${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" onclick="closeSubUserWorkspace(event,'${tab.key}')">×</span>`}</button>`}).join('') + (!staff?'<button type="button" class="sub-user-add-tab" onclick="addSubUserTab()">＋</button>':'');
    const tab=activeSubUserTab();
    if(tab?.permanent&&!staff){
      panel.replaceChildren();
      if(document.getElementById('sub-users-workspace')?.classList.contains('active'))
        queueMicrotask(()=>window.TeamHome14227?.home());
      return;
    }
    const user=currentUser(tab?.userId);
    panel.innerHTML=user?renderUser(user):'<div class="sub-user-empty-state">Choose a sub-user from Home.</div>';
    if(getView(user?.id)==='post') requestAnimationFrame(()=>v49ValidatePost());
  };

  window.v49SetView=function(userId,view){views[userId]=view;window.renderSubUserWorkspace();};
  window.v49OpenProtocol=function(){document.getElementById('v49ProtocolOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49ProtocolOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>ENTRY PROTOCOL</span><h2>Single-entry recording rules</h2><p>Keep every saved row complete and supported.</p></div><button onclick="document.getElementById('v49ProtocolOverlay').remove()">×</button></header><div class="v49-review-scroll"><h3>Money Out</h3><p>Select the assigned main fund that paid the transaction and the permitted expense or asset account. Keep the receipt reference in the combined description.</p><h3>Money In</h3><p>Select the assigned fund and configured counterpart. Collections remain traceable and are not posted twice.</p><h3>Handover</h3><p>Use this when unused company money is returned. Select the receiving cash or bank account and the fund being reduced.</p><h3>Before submission</h3><p>Every saved entry needs a date, direction, main fund, account, description/reference, and positive amount.</p></div></section>`;document.body.appendChild(overlay);};
  window.v49FormatAmount=function(input){formatAppNumberEditing(input)};
  window.v49ValidatePost=function(){const ids=['v49Date','v49Direction','v49Fund','v49Account','v49Amount','v49Description'];const valid=ids.every(id=>document.getElementById(id)?.value.trim())&&parseAppNumber(document.getElementById('v49Amount')?.value)>0;const button=document.getElementById('v49Save');const disabled=!valid||Boolean(button?.dataset.saving);if(button&&button.disabled!==disabled)button.disabled=disabled;return valid;};
  window.v49DirectionChanged=function(userId){const user=currentUser(userId),rules=workspaceRules(user),direction=document.getElementById('v49Direction').value,account=document.getElementById('v49Account'),fund=document.getElementById('v49Fund');if(account)account.innerHTML=options(direction==='in'?rules.fundIds:rules.entryIds,direction==='in'?fund?.value:'','Select account');v49ValidatePost();};
  window.v49FundChanged=function(){const direction=document.getElementById('v49Direction')?.value,fund=document.getElementById('v49Fund'),account=document.getElementById('v49Account');if(direction==='in'&&fund&&account)account.value=fund.value;v49ValidatePost()};
  window.v49ClearPost=function(userId){const finish=()=>{editing=null;views[userId]=editing?'entries':'post';renderSubUserWorkspace();showCenterStatus('Entry form cleared.');};if(editing){showAppConfirm('Discard Edits','Discard this temporary edit? The saved original will remain unchanged in Current Entries.','Discard Edits',()=>{editing=null;views[userId]='entries';renderSubUserWorkspace();showCenterStatus('Edits discarded; the saved entry was not changed.')},true)}else finish();};
  window.v49EditEntry=function(userId,lineId){const line=journalRows(userId).flatMap(row=>row.lines||[]).find(row=>String(row.id)===String(lineId));if(!line)return;editing={userId,originalId:line.id,draft:{...line}};views[userId]='post';renderSubUserWorkspace();showCenterStatus(`${line.workspace_entry_no||'Entry'} opened for editing. The saved original remains in Current Entries.`);};
  window.v49SavePost=async function(userId){
    if(!v49ValidatePost())return;const user=currentUser(userId),rules=workspaceRules(user),directionValue=document.getElementById('v49Direction').value,direction=directionValue==='in'?'in':'out',kind=directionValue==='in'?'collection':directionValue==='handover'?'handover':'payment',date=document.getElementById('v49Date').value,fund=document.getElementById('v49Fund').value,account=direction==='in'?fund:document.getElementById('v49Account').value,description=document.getElementById('v49Description').value.trim(),amount=parseAppNumber(document.getElementById('v49Amount').value);
    const execute=async()=>{const button=document.getElementById('v49Save');if(button?.dataset.saving)return;if(button){button.dataset.saving='true';button.disabled=true;button.textContent='Saving…'}try{const result=await ojmDb.rpc('save_staff_workspace_entry_v3',{p_owner_id:userId,p_line_id:editing?.originalId||null,p_client_key:editing?null:journalEntry98Key14228(userId,{date,direction,fund,account,description,amount,kind}),p_transaction_date:date,p_direction:direction,p_fund_account_id:fund,p_account_id:account,p_memo:description,p_reference:'',p_amount:amount,p_entry_kind:kind});if(result.error){showCenterStatus(`Entry save failed: ${result.error.message}. Run SQL 14 first.`,true);return}editing=null;views[userId]='entries';await loadStaffJournalsForReview();showCenterStatus(`${result.data?.[0]?.workspace_entry_no||'Entry'} saved successfully.`)}catch(error){showCenterStatus(`Entry save failed: ${error.message}`,true)}finally{if(button?.isConnected){delete button.dataset.saving;button.textContent='Save Entry';v49ValidatePost()}}};
    if(editing)showAppConfirm('Replace Saved Entry','Save these changes and replace the former saved values in Current Entries?','Replace Entry',execute,false);else execute();
  };

  window.v49OpenReview=function(userId){
    const user=currentUser(userId),rows=journalRows(userId).filter(row=>row.status==='submitted').sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at)));
    document.getElementById('v49ReviewOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49ReviewOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>SUBMISSIONS</span><h2>Review</h2><p>${escapeHtml(subUserName(user))} · under-review records.</p></div><button onclick="document.getElementById('v49ReviewOverlay').remove()">×</button></header><div class="v49-review-scroll">${rows.map(row=>recordCard(user,row)).join('')||'<div class="period-empty">Nothing is waiting for review.</div>'}</div></section>`;document.body.appendChild(overlay);
  };
  window.v49OpenAdjustment=function(userId,fundId){
    const user=currentUser(userId),a=activity(user,fundId);document.getElementById('v49AdjustmentOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49AdjustmentOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-adjust-dialog"><header><div><span>FUND ADJUSTMENT REQUEST</span><h2>${escapeHtml(accountLabelOnly(fundId))}</h2><p>${escapeHtml(subUserName(user))}</p></div><button onclick="document.getElementById('v49AdjustmentOverlay').remove()">×</button></header><div class="v49-adjust-body"><p class="settings-compact-note">The approved difference is applied to the live value at approval time; the old total is never overwritten.</p><table><thead><tr><th>Activity</th><th>Original</th><th>New value</th><th>Difference</th></tr></thead><tbody>${[['received','Funds received'],['used','Funds used'],['handover','Handed over']].map(([key,label])=>`<tr><th>${label}</th><td>${number(a[key])}</td><td><input id="v49Adj-${key}" inputmode="decimal" data-original="${a[key]}" value="${number(a[key])}" onfocus="this.select()" oninput="formatAppNumberEditing(this);v49UpdateAdjustment('${key}')" onblur="finishAppNumberEditing(this);v49UpdateAdjustment('${key}')"></td><td id="v49Diff-${key}">${number(0)}</td></tr>`).join('')}</tbody></table><label>Explanation *<textarea id="v49AdjReason" rows="3"></textarea></label><label>Supporting report reference<input id="v49AdjReport" placeholder="Example: Incident Report IR-2026-014"></label></div><footer><button class="je-btn je-btn-secondary" onclick="document.getElementById('v49AdjustmentOverlay').remove()">Cancel</button><button class="je-btn je-btn-emerald" onclick="v49SubmitAdjustment('${userId}','${fundId}')">Submit for Review</button></footer></section>`;document.body.appendChild(overlay);
  };
  window.v49UpdateAdjustment=function(key){const input=document.getElementById(`v49Adj-${key}`),target=document.getElementById(`v49Diff-${key}`);if(!input||!target)return;const value=parseAppNumber(input.value),difference=(Number.isFinite(value)?value:0)-Number(input.dataset.original||0);target.textContent=`${difference>0?'+':''}${formatAppNumber(difference)}`;target.classList.toggle('negative-amount',difference<0)};
  window.v49OpenNotices=function(userId,fundId){const rows=adjustmentRequests.filter(row=>row.owner_id===userId&&row.fund_account_id===fundId&&row.status==='approved_applied');document.getElementById('v49NoticeOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49NoticeOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>APPROVED ADJUSTMENTS</span><h2>${escapeHtml(accountLabelOnly(fundId))}</h2><p>Submitted comparison and approval-time application.</p></div><button onclick="document.getElementById('v49NoticeOverlay').remove()">×</button></header><div class="v49-review-scroll">${rows.map(adjustmentRecordCard).join('')}</div></section>`;document.body.appendChild(overlay)};
  window.v49SubmitAdjustment=async function(userId,fundId){const original=activity(currentUser(userId),fundId),requested={received:parseAppNumber(document.getElementById('v49Adj-received').value),used:parseAppNumber(document.getElementById('v49Adj-used').value),handover:parseAppNumber(document.getElementById('v49Adj-handover').value)},reason=document.getElementById('v49AdjReason').value.trim(),report=document.getElementById('v49AdjReport').value.trim();if(!reason){showCenterStatus('An explanation is required.',true);return}const result=await ojmDb.rpc('submit_fund_adjustment_v49',{p_owner_id:userId,p_fund_account_id:fundId,p_original:original,p_requested:requested,p_explanation:reason,p_report_reference:report});if(result.error){showCenterStatus(`Adjustment request failed: ${result.error.message}. Run SQL 14 first.`,true);return}document.getElementById('v49AdjustmentOverlay')?.remove();await loadStaffJournalsForReview();showCenterStatus('Fund adjustment submitted as a separate review item.')};

  function adjustmentCard(row){return `<section class="submission-review-card v49-adjustment-review"><div class="submission-review-header"><div class="submission-review-title"><strong>${escapeHtml(row.request_no)}</strong><span>${escapeHtml(getLiveUserName(row.owner_id))} · ${escapeHtml(accountLabelOnly(row.fund_account_id))}</span></div><div class="submission-review-actions">${row.status==='submitted'?`<button class="je-btn je-btn-emerald" onclick="v49ApproveAdjustment('${row.id}')">Approve & Apply Difference</button>`:`<span class="submission-status ${row.status}">${escapeHtml(row.status.replaceAll('_',' ').toUpperCase())}</span>`}</div></div><div class="v49-table-scroll"><table><thead><tr><th>Activity</th><th>Original</th><th>Requested</th><th>Difference</th></tr></thead><tbody>${(row.lines||[]).map(line=>`<tr><td>${escapeHtml(line.activity_key)}</td><td>${number(line.original_value)}</td><td>${number(line.requested_value)}</td><td>${number(line.difference)}</td></tr>`).join('')}</tbody></table></div>${row.status==='approved_applied'?`<div class="v49-table-scroll"><table><thead><tr><th>Activity</th><th>Current before</th><th>Difference applied</th><th>Current after</th></tr></thead><tbody>${(row.lines||[]).map(line=>`<tr><td>${escapeHtml(line.activity_key)}</td><td>${number(line.current_before)}</td><td>${number(line.difference_applied)}</td><td>${number(line.current_after)}</td></tr>`).join('')}</tbody></table></div>`:''}<p>${escapeHtml(row.explanation)} · ${escapeHtml(row.report_reference||'No online report reference')}</p></section>`}
  function adjustmentRecordCard(row){return `<details class="v49-record v49-adjustment-record"><summary><span><strong>${escapeHtml(row.request_no)}</strong><small>Fund adjustment · ${escapeHtml(row.status.replaceAll('_',' '))}</small></span><b>${row.lines?.length||0} changes</b></summary><div class="v49-record-body">${adjustmentCard(row)}</div></details>`}
  function transactionReviewCard(journal){const user=currentUser(journal.owner_id)||{},lines=journal.lines||[];return `<section class="submission-review-card"><div class="submission-review-header"><div class="submission-review-title"><strong>${escapeHtml(journal.seed_key||`SUB-${String(journal.id).slice(0,8).toUpperCase()}`)}</strong><span>${escapeHtml(getLiveUserName(journal.owner_id))} · ${lines.length} entries · ${escapeHtml(monthLabel(journal.period_start))}</span></div><div class="submission-review-actions">${journal.status==='submitted'&&(!window.Organization14229||Organization14229.info(journal).current)?`<button class="je-btn je-btn-emerald" data-permission-action1440="approve" onclick="prepareReviewJournal('${journal.id}')">${window.Organization14229&&Organization14229.info(journal).forward?'Review & Forward':'Final Approve'}</button>${!journal.review_route14229?.steps?.length?`<button class="je-btn je-btn-danger" onclick="returnReviewJournal('${journal.id}')">Return</button>`:''}`:`<span class="submission-status ${journal.status}">${escapeHtml(journal.status.toUpperCase())}</span>`}</div></div><div class="v49-table-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description</th><th>Amount</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${escapeHtml(line.workspace_entry_no||'—')}</td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo)}</td><td>${number(line.amount)}</td></tr>`).join('')}</tbody></table></div>${totalsTable(user,lines)}</section>`}
  window.v49ApproveAdjustment=async function(id){showAppConfirm('Approve Fund Adjustment','Apply only the submitted difference to the current live activity? This is idempotent and cannot apply twice.','Approve & Apply',async()=>{const result=await ojmDb.rpc('approve_fund_adjustment_v49',{p_request_id:id});if(result.error){showCenterStatus(`Approval failed: ${result.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Adjustment approved and the difference was applied once.')},false)};

  const previousReviewRender = window.renderUserEntryReview;
  window.renderUserEntryReview=function(){const host=document.getElementById('userEntryReviewCards');if(!host)return;const journals=(reviewStaffJournals||[]).filter(row=>row.status==='submitted'&&(!window.Organization14229||Organization14229.pending(row)));host.innerHTML=[...adjustmentRequests.filter(row=>row.status==='submitted').map(adjustmentCard),...journals.map(transactionReviewCard)].join('')||'<div class="period-empty">Nothing is waiting for review.</div>';const history=document.getElementById('userEntryHistoryCards');if(history)history.innerHTML=[...adjustmentRequests.filter(row=>row.status!=='submitted').map(adjustmentCard),...(reviewStaffJournals||[]).filter(row=>row.status!=='submitted'||window.Organization14229&&!Organization14229.pending(row)).map(transactionReviewCard)].join('');const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length} item(s) waiting`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length;};
  const previousLoad = window.loadStaffJournalsForReview;
  window.loadStaffJournalsForReview=async function(){await previousLoad();if(!ojmDb||!liveProfile)return;const request=await ojmDb.from('fund_adjustment_requests').select('*,lines:fund_adjustment_lines(*)').order('submitted_at',{ascending:false});if(!request.error)adjustmentRequests=request.data||[];window.renderUserEntryReview();window.renderSubUserWorkspace();};

  if(typeof APP_PERMISSION_TREE !== 'undefined' && Array.isArray(APP_PERMISSION_TREE)){
    const transactions=APP_PERMISSION_TREE.find(row=>row.id==='transactions'),subusers=APP_PERMISSION_TREE.find(row=>row.id==='sub-users');
    if(transactions&&!transactions.children.some(([id])=>id==='user-entry-review'))transactions.children.splice(4,0,['user-entry-review','Entry Submission Review']);
    if(subusers)subusers.children=subusers.children.filter(([id])=>id!=='user-entry-review');
  }
  const oldToast=window.showCenterStatus;
  window.showCenterStatus=function(message,isError=false){oldToast(message,isError);clearTimeout(showCenterStatus.timer);showCenterStatus.timer=setTimeout(()=>document.getElementById('centerStatusToast')?.classList.remove('is-visible'),5200)};
  // Both layouts are already rendered. CSS switches them without clearing a Post draft on rotation.
})();

// Shared request references for retained legacy entry handlers; no visual changes.
const legacySaveReferences14228=new Map();
function journalEntry98Key14228(owner,payload){const fingerprint=JSON.stringify(payload),last=legacySaveReferences14228.get(owner);if(last?.fingerprint===fingerprint)return last.key;const key='web-'+crypto.randomUUID();legacySaveReferences14228.set(owner,{fingerprint,key});return key;}
document.addEventListener('input',e=>{if(e.isTrusted){const card=e.target.closest('#journalEntry98');if(card)delete card._postingRequest14228;legacySaveReferences14228.clear()}},true);
