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
    const next = { ...BUSINESS_SETTINGS_DEFAULTS, ...this.current, ...value };
    localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(next));
    this.current = next;
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
  let stored = false;
  try { stored = Boolean(localStorage.getItem(BUSINESS_SETTINGS_KEY)); } catch (_) {}
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
  try { BusinessSettings.save(value); } catch (error) { showAppNotification('Save Failed', error.message, true); return; }
  renderBusinessIdentity(value, true);
  if(typeof syncEntrySequence==='function')syncEntrySequence();updateNextEntryIdDisplay();
  const badge = document.getElementById('businessSavedBadge');
  const status = document.getElementById('businessSettingsStatus');
  if (badge) { badge.textContent = 'Saved'; badge.classList.add('is-saved'); }
  if (status) {
    status.textContent = `Saved ${formatAppDate(new Date().toISOString(),true)}. The profile is ready for connected modules.`;
    status.classList.add('is-save-confirmation');
  }
}

function initializeBusinessSettings() {
  reloadBusinessSettings();
  const form = document.getElementById('businessSettingsForm');
  if (!form || form.dataset.businessBound) return;
  form.dataset.businessBound = '1';
  form.addEventListener('input', () => {
    renderBusinessIdentity(collectBusinessSettings(), false);
    const badge = document.getElementById('businessSavedBadge');
    const status = document.getElementById('businessSettingsStatus');
    if (badge) { badge.textContent = 'Unsaved changes'; badge.classList.remove('is-saved'); }
    if (status) { status.textContent = 'You have unsaved business information changes.'; status.classList.remove('is-save-confirmation'); }
  });
}

