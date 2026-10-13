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

