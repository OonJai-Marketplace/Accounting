const SessionTimeoutManager={logoutTimer:null,warningTimer:null,lastActivity:Date.now(),reset(){this.lastActivity=Date.now()},arm(){},check1434(){},hideWarning(){document.getElementById('sessionTimeoutWarning')?.remove()}};
function startSessionTimeoutManager(){}

function initializeFoundationControls(){
  const form=document.getElementById('businessSettingsForm');form?.addEventListener('input',reconcileBusinessDirtyState);
  setBusinessSettingsBaseline();
  document.addEventListener('click',event=>{if(!event.target.closest('.sub-user-search-wrap')){const results=document.getElementById('subUserSearchResults');if(results)results.hidden=true}});
  const active=document.querySelector('.tab-content.active')?.id||'dashboard';updateSettingsBrowser(active);updateGlobalExportTools(active);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeFoundationControls,{once:true});else initializeFoundationControls();

const hydrateSupabaseSessionBeforeFoundationControls=hydrateSupabaseSession;
hydrateSupabaseSession=async function(session){await hydrateSupabaseSessionBeforeFoundationControls(session);setBusinessSettingsBaseline();renderSubUserWorkspace();startSessionTimeoutManager()};

