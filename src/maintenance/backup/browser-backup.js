async function downloadJsonFile(data, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  link.download = filename;
  try{const delivered=await (window.exportCenter14337?exportCenter14337.fromLink(link):link.click());if(delivered===false)throw Error('Settings export was not prepared.');}finally{setTimeout(() => URL.revokeObjectURL(link.href), 3000);}
}

async function exportApplicationBackup() {
 try{await downloadJsonFile({
    version:1,
    exportedAt:new Date().toISOString(),
    business:BusinessSettings.current,
    settings:ApplicationSettings
  }, `accounting-settings-backup-${new Date().toISOString().slice(0,10)}.json`);
  const status = document.getElementById('backupSettingsStatus');
  if (status) status.textContent = 'Settings backup downloaded.';
  if(typeof showCenterStatus==='function')showCenterStatus('Settings backup downloaded.');
 }catch(error){if(typeof showCenterStatus==='function')showCenterStatus(error.message,true)}
}

async function importApplicationBackup(event) {
  const owner=liveProfile?.id,client=ojmDb;
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.getElementById('backupSettingsStatus');
  try {
    if(file.size>5*1024*1024)throw Error('Choose a settings backup under 5 MB.');
    const backup = JSON.parse(await file.text(),(key,value)=>['__proto__','constructor','prototype'].includes(key)?undefined:value);
    if(liveProfile?.id!==owner||client!==ojmDb)throw Error('Account changed. Reopen the settings import.');
    if (!backup?.settings || typeof backup.settings !== 'object'||Array.isArray(backup.settings)) throw new Error('Invalid settings backup.');
    const defaults = cloneDefaultSettings();
    Object.keys(defaults).forEach(group => Object.assign(defaults[group], backup.settings[group]&&typeof backup.settings[group]==='object'&&!Array.isArray(backup.settings[group])?backup.settings[group]:{}));
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(defaults));
    ApplicationSettings = defaults;
    if (backup.business && typeof backup.business === 'object'&&!Array.isArray(backup.business)) BusinessSettings.save(backup.business);
    initializeApplicationSettings();
    reloadBusinessSettings();
    if (status) status.textContent = 'Settings backup restored.';
    if(typeof showCenterStatus==='function')showCenterStatus('Settings backup restored successfully.');
  } catch (error) {
    if (status) status.textContent = error.message || 'The backup could not be restored.';
    if(typeof showCenterStatus==='function')showCenterStatus(error.message||'The backup could not be restored.',true);
  } finally { event.target.value = ''; }
}

