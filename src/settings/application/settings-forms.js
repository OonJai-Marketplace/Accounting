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

