/* Shared inactivity policy. Activity remains per signed-in account and browser. */
(()=>{'use strict';
const key=id=>'ojm-session-policy1443:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+id;
function apply(row,id){ApplicationSettings.system={...ApplicationSettings.system,sessionTimeout:String(row.timeout_minutes),sessionWarning:String(row.warning_minutes)};try{localStorage.setItem(APP_SETTINGS_KEY,JSON.stringify(ApplicationSettings));localStorage.setItem(key(id),JSON.stringify(row))}catch{}if(typeof setSettingsFormValues==='function')setSettingsFormValues('system');}
function valid(row){return row&&Number.isInteger(row.timeout_minutes)&&row.timeout_minutes>=5&&row.timeout_minutes<=480&&Number.isInteger(row.warning_minutes)&&row.warning_minutes>=1&&row.warning_minutes<=30;}
function transient(e){return e?.message==='Connection timed out'||e?.code==='PGRST000'||e?.code==='PGRST001'||e?.code==='PGRST002'||e?.code==='PGRST003'||/failed to fetch|networkerror|network request failed|fetch failed/i.test(e?.message||'');}
window.loadSessionPolicy1443=async function(id){
 let timer;const db=ojmDb,epoch=typeof sessionEpoch1430==='undefined'?null:sessionEpoch1430,workspace=window.workspaceRequest138?.target||null;
 const authOwner=workspace===id?(window.workspaceRequest138?.actor||id):id;
 const unchanged=()=>{if(ojmDb!==db||(typeof sessionEpoch1430!=='undefined'&&epoch!==sessionEpoch1430)||(window.workspaceRequest138?.target||null)!==workspace)throw Error('Account changed while loading session settings.');};
 const current=async()=>{unchanged();const result=await db.auth.getSession();unchanged();if(result.error)throw result.error;if(!authOwner||result.data?.session?.user?.id!==authOwner)throw Error('Account changed while loading session settings.');};
 try{
  await current();
  const response=await Promise.race([db.from('session_policy1443').select('timeout_minutes,warning_minutes').eq('id',true).maybeSingle(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Connection timed out')),10000))]);
  await current();if(response.error)throw response.error;
  if(!response.data)throw Error('The shared session-settings record is missing or hidden by its read permission. Administrator: run setup/FIX-SESSION-POLICY-v142.63.sql once, then sign in again.');
  if(!valid(response.data))throw Error('The shared session settings are invalid. Ask an administrator to check the saved timeout and warning values.');
  apply(response.data,id);return response.data;
 }catch(e){
  await current();let cached;try{cached=JSON.parse(localStorage.getItem(key(id))||'null')}catch{}
  if(transient(e)&&valid(cached)){apply(cached,id);return cached}
  if(e.code==='PT403'&&/PASSWORD_CHANGE_REQUIRED/.test(e.message||''))throw Error('Choose a different new password to complete the required password change before signing in.');
  if(e.code==='PGRST116')throw Error('The session-settings query returned more than one record. Ask an administrator to check the session_policy1443 table.');
  if(['42P01','PGRST205'].includes(e.code))throw Error('The shared session-settings table is not installed. Administrator: run setup/FIX-SESSION-POLICY-v142.63.sql once.');
  throw Error(e.message||'Session settings could not load. Reconnect and sign in again.');
 }finally{clearTimeout(timer)}
};
async function persist(values){if(liveProfile?.role!=='admin')throw Error('Administrator access required');const timeout=Number(values.sessionTimeout),warning=Number(values.sessionWarning);if(!Number.isInteger(timeout)||timeout<5||timeout>480||!Number.isInteger(warning)||warning<1||warning>30)throw Error('Use a timeout of 5–480 minutes and warning of 1–30 minutes');const actor=liveProfile.id;const row={id:true,timeout_minutes:timeout,warning_minutes:warning,updated_at:new Date().toISOString()};const result=await db.from('session_policy1443').upsert(row).select('timeout_minutes,warning_minutes');if(result.error)throw result.error;if(liveProfile?.id!==actor)throw Error('Account changed while saving');if(!result.data?.length)throw Error('Session settings save was not confirmed');ApplicationSettings.system={...ApplicationSettings.system,...values};apply(result.data[0],actor);return true}
function ready(){const save=saveSettingsGroup,reset=resetSettingsGroup;window.saveSettingsGroup=async function(event){if(event.currentTarget?.dataset.settingsGroup!=='system')return save(event);event.preventDefault();const form=event.currentTarget,values=collectSettingsForm(form),button=form.querySelector('[type=submit]');if(button?.disabled)return;if(button)button.disabled=true;try{await persist(values);return save({preventDefault(){},currentTarget:form})}catch(e){showCenterStatus('Session settings were not confirmed: '+e.message,true)}finally{if(button)button.disabled=false}};document.querySelectorAll('[data-settings-group=system]').forEach(f=>f.onsubmit=window.saveSettingsGroup);window.resetSettingsGroup=async function(group){if(group!=='system')return reset(group);try{await persist(APP_SETTINGS_DEFAULTS.system);return reset(group)}catch(e){showCenterStatus('Session settings were not reset: '+e.message,true)}};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();

