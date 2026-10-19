// Payroll and tax settings share a versioned database record; other groups retain their existing stores.
const APP_SETTINGS_KEY = 'ojm_application_settings_v1';
const APP_SETTINGS_DEFAULTS = Object.freeze({
  accounting: { baseCurrency:'LAK', fiscalYearStart:'01', journalPrefix:'JRN', subUserPrefix:'S', journalDigits:'4', subUserDigits:'4', defaultCashAccount:'Cash on Hand', defaultBankAccount:'BCEL Bank', exchangeRatePolicy:'manual', decimalPlaces:'2', lockClosedPeriods:true },
  payroll: { payFrequency:'monthly', payCurrency:'LAK', payCurrencyLAK:true, payCurrencyUSD:true, payCurrencyTHB:true, weeklyHours:'40', workDaysMonth:'26', hoursPerDay:'8', payrollCutoff:'25', paymentDay:'30', overtimeRate:'1.5', lateGraceMinutes:'5', employeeSsoRate:'5.5', employerSsoRate:'6', pitSharing:'equal' },
  tax: { pit1From:'0', pit1To:'2500000', pit1Rate:'0', pit2From:'2500000', pit2To:'5000000', pit2Rate:'5', pit3From:'5000000', pit3To:'15000000', pit3Rate:'10', pit4From:'15000000', pit4To:'25000000', pit4Rate:'15', pit5From:'25000000', pit5To:'65000000', pit5Rate:'20', pit6From:'65000000', pit6To:'', pit6Rate:'25', ssoEmployeeRate:'5.5', ssoEmployerRate:'6', ssoMaxBase:'', vatRate:'10', filingPeriod:'monthly', pitDeadline:'20', ssoDeadline:'20', vatDeadline:'20', vatAccount:'VAT Payable', pitAccount:'PIT Payable', ssoAccount:'SSO Payable', pitReminderDays:'5', ssoReminderDays:'5', vatReminderDays:'5' },
  printing: { paperSize:'A4', orientation:'portrait', marginSize:'normal', headerPlacement:'first', footerPlacement:'last', pageNumberFormat:'page-total', fileNamePattern:'report-date', showBusinessName:true, showPageNumbers:true },
  system: { fontSize:'small', dateFormat:'DD/MM/YYYY', numberFormat:'1,234.56', defaultLandingPage:'dashboard', archiveFrequency:'annual' }
});

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(APP_SETTINGS_DEFAULTS));
}

function loadApplicationSettings() {
  const defaults = cloneDefaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}',(key,value)=>['__proto__','constructor','prototype'].includes(key)?undefined:value);
    Object.keys(defaults).forEach(group => Object.assign(defaults[group], saved?.[group]&&typeof saved[group]==='object'&&!Array.isArray(saved[group])?saved[group]:{}));
  } catch (_) {}
  return defaults;
}

let ApplicationSettings = loadApplicationSettings();


// One atomic configuration for payroll calculations and statutory reporting.
const payrollTaxSettings = (() => {
  let owner = '', client = null, row = null, loaded = false, saving = false;
  const fingerprint = value => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(k => [k,item[k]])) : item);
  const key = () => 'ojm_payroll_tax_settings:' + window.OJM_SUPABASE_URL + ':' + liveProfile.id;
  const context = () => {
    if (!ojmDb || liveProfile?.role !== 'admin') throw Error('Sign in as an administrator to manage payroll and tax settings.');
    if (owner !== liveProfile.id || client !== ojmDb) { owner = liveProfile.id; client = ojmDb; row = null; loaded = false; }
    const actor = owner, db = client;
    return { db, actor, check() { if (liveProfile?.id !== actor || ojmDb !== db) throw Error('Account changed. Reopen payroll settings.'); } };
  };
  function apply(record) {
    const changed = fingerprint({payroll:ApplicationSettings.payroll,tax:ApplicationSettings.tax}) !== fingerprint(record.data);
    ApplicationSettings.payroll = structuredClone(record.data.payroll);
    ApplicationSettings.tax = structuredClone(record.data.tax);
    row = record; loaded = true;
    try { localStorage.setItem(key(), JSON.stringify(record)); localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(ApplicationSettings)); } catch (_) {}
    if (changed && typeof Work82 !== 'undefined' && Work82.run?.status === 'draft') Work82.run.reviewed = false;
    setSettingsFormValues('payroll'); setSettingsFormValues('tax');
    window.linkSsoFields82?.();
    if (changed) window.workspaceViews14364?.invalidate('payroll');
  }
  async function load() {
    const c = context();
    if (saving) throw Error('Wait for payroll and tax settings to finish saving.');
    const result = await c.db.from('payroll_tax_settings').select('*').eq('id', true).maybeSingle();
    c.check();
    if (result.error) {
      // Only a previously server-confirmed cache for this database and user is reusable.
      if (!loaded) { try { const cached = JSON.parse(localStorage.getItem(key()) || 'null'); if (cached?.data?.payroll && cached?.data?.tax) apply(cached); } catch (_) {} }
      throw Error('Shared payroll and tax settings could not be refreshed. ' + result.error.message);
    }
    loaded = true; row = result.data;
    if (row) apply(row);
    return row;
  }
  async function save(group, values) {
    const c = context();
    if (saving) throw Error('A settings save is already in progress.');
    if (!['payroll','tax'].includes(group)) throw Error('Invalid payroll settings group.');
    // Load the server revision before the first save, without discarding the submitted form values.
    if (!loaded) await load();
    c.check();
    if (saving) throw Error('A settings save is already in progress.');
    saving = true;
    try {
      const data = {payroll:structuredClone(ApplicationSettings.payroll),tax:structuredClone(ApplicationSettings.tax)};
      data[group] = {...data[group], ...structuredClone(values)};
      payrollConfig82(data);
      const payload = {id:true,data,version:(row?.version || 0)+1,updated_by:c.actor,updated_at:new Date().toISOString()};
      const request = row ? c.db.from('payroll_tax_settings').update(payload).eq('id',true).eq('version',row.version) : c.db.from('payroll_tax_settings').insert(payload);
      const result = await request.select('*'); c.check();
      if (result.error) throw Error('Settings were not saved. ' + result.error.message);
      if (result.data?.length !== 1) throw Error('Settings changed on another device. Reload before saving again; your changes were not applied.');
      apply(result.data[0]);
      return true;
    } finally { saving = false; }
  }
  async function verify() {
    const before = fingerprint({payroll:ApplicationSettings.payroll,tax:ApplicationSettings.tax});
    const record = await load();
    if (!record) throw Error('Review and save Payroll and Tax settings once to establish the shared configuration before finalizing payroll.');
    if (before !== fingerprint(record.data)) throw Error('Payroll or tax settings changed on another device. Review the refreshed payroll before finalizing.');
    return record.version;
  }
  return {load,save,verify};
})();
