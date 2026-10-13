function downloadJsonFile(data, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  link.download = filename;
  (window.exportCenter14337?exportCenter14337.fromLink(link):link.click());
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

