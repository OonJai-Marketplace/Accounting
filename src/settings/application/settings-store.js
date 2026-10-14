// General settings remain browser-backed until the matching Supabase tables are enabled.
const APP_SETTINGS_KEY = 'ojm_application_settings_v1';
const APP_SETTINGS_DEFAULTS = Object.freeze({
  accounting: { baseCurrency:'LAK', fiscalYearStart:'01', journalPrefix:'JRN', subUserPrefix:'SJR', journalDigits:'4', subUserDigits:'4', defaultCashAccount:'Cash on Hand', defaultBankAccount:'BCEL Bank', exchangeRatePolicy:'manual', decimalPlaces:'2', lockClosedPeriods:true },
  payroll: { payFrequency:'monthly', payCurrency:'LAK', payCurrencyLAK:true, payCurrencyUSD:true, payCurrencyTHB:true, weeklyHours:'40', workDaysMonth:'26', hoursPerDay:'8', payrollCutoff:'25', paymentDay:'30', overtimeRate:'1.5', lateGraceMinutes:'5', employeeSsoRate:'5.5', employerSsoRate:'6', pitSharing:'equal' },
  tax: { pit1From:'0', pit1To:'2500000', pit1Rate:'0', pit2From:'2500000', pit2To:'5000000', pit2Rate:'5', pit3From:'5000000', pit3To:'15000000', pit3Rate:'10', pit4From:'15000000', pit4To:'25000000', pit4Rate:'15', pit5From:'25000000', pit5To:'65000000', pit5Rate:'20', pit6From:'65000000', pit6To:'', pit6Rate:'25', ssoEmployeeRate:'5.5', ssoEmployerRate:'6', ssoMaxBase:'', vatRate:'10', filingPeriod:'monthly', pitDeadline:'20', ssoDeadline:'20', vatDeadline:'20', vatAccount:'VAT Payable', pitAccount:'PIT Payable', ssoAccount:'SSO Payable', pitReminderDays:'5', ssoReminderDays:'5', vatReminderDays:'5' },
  printing: { paperSize:'A4', orientation:'portrait', marginSize:'normal', headerPlacement:'first', footerPlacement:'last', pageNumberFormat:'page-total', fileNamePattern:'report-date', showBusinessName:true, showPageNumbers:true },
  system: { dateFormat:'DD/MM/YYYY', numberFormat:'1,234.56', defaultLandingPage:'dashboard', archiveFrequency:'annual' }
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

