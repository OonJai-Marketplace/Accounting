async function hydrateSupabaseSession(session) {
  const epoch=sessionEpoch1430,client=ojmDb;
  const checkSession=()=>{if(epoch!==sessionEpoch1430||client!==ojmDb)throw new Error('Session changed while loading.');};
  try {
    await loadLiveProfile(session.user);checkSession();
    await loadCurrentPermissions();checkSession();window.sessionCache14333?.remember();
    document.body.classList.add('startup-pending1443');
    // Resolve the authorized destination before releasing the sign-in screen.
    // Never paint the default dashboard or a previous account during this transition.
    applyLiveRoleAccess();checkSession();
    if(typeof restoreStartup88==='function')restoreStartup88();
    checkSession();window.releaseLogin1443?.();
    if(window.startupData1443)await startupData1443(checkSession);
    else {const referenceReady=loadReferenceDataFromSupabase();await Promise.all([referenceReady.then(()=>loadJournalFromSupabase()),loadBusinessSettingsFromSupabase(),loadSubmissionsFromSupabase(),loadProfilesFromSupabase(),loadLegalDocumentsFromSupabase()]);}
    checkSession();
    if(liveProfile.role==='admin'){try{await payrollTaxSettings.load();if(/^payroll-/.test(document.querySelector('.tab-content.active')?.id||''))renderWork82();}catch(error){showAppNotification('Payroll Settings',error.message,true);}checkSession();}
    // Session location is restored once by interface-v69.js.
    freshLoginRequested=false;
  } catch(error) { if(epoch!==sessionEpoch1430||client!==ojmDb||error.code==='STALE_PROFILE143100')return;liveProfile=null;livePermission=null;DemoAccess.currentUser=null;document.getElementById('loginGate')?.classList.remove('is-authenticated');const box=loginMessageTarget14293();if(box&&epoch===sessionEpoch1430)box.textContent=error.message; }
}

// One complete hydration per authenticated identity, including extension wrappers.
let sessionLoad1430=null, sessionReady1430='', sessionEpoch1430=0;
function resetSessionLoad1430(){sessionEpoch1430++;sessionReady1430='';}
function startSessionLoad1430(session){
 const id=session?.user?.id;if(window.deviceVault14334?.pending)return Promise.resolve();if(!id||passwordRecoveryMode)return Promise.resolve();
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
  if(epoch===sessionEpoch1430){document.getElementById('loginGate')?.classList.remove('is-authenticated');const box=loginMessageTarget14293();if(box)box.textContent=error.message||'Unable to load your account. Please sign in again.';}
 }).finally(()=>{if(sessionLoad1430===job)sessionLoad1430=null;});
 return job.promise;
}

async function initializeSupabaseApp() {
  // Let all authentication, storage and startup hooks install before session hydration.
  await new Promise(resolve=>setTimeout(resolve,0));
  const errorBox=loginMessageTarget14293();
  if(!window.supabase||!window.OJM_SUPABASE_URL||!window.OJM_SUPABASE_ANON_KEY){if(errorBox)errorBox.textContent='Supabase configuration could not be loaded.';document.documentElement.classList.remove('session-checking1444');return}
  ojmDb=window.supabase.createClient(window.OJM_SUPABASE_URL,window.OJM_SUPABASE_ANON_KEY,{global:{fetch:(...args)=>window.fetch(...args)}});
  window.sessionCache14333?.attach(ojmDb);
  await window.deviceVault14334?.attach(ojmDb);
  if(window.deviceVault14334?.consumeFresh())freshLoginRequested=true;
  const query105=new URLSearchParams(location.search),hash105=new URLSearchParams(location.hash.slice(1));
  const recoveryHint=query105.has('password-recovery')||query105.get('type')==='recovery'||hash105.get('type')==='recovery'||query105.has('error_description')||hash105.has('error_description');passwordRecoveryMode=recoveryHint;
  const recoveryError105=query105.get('error_description')||hash105.get('error_description');
  if(recoveryHint)showPasswordRecoveryForm('Opening the secure recovery session…');
  ojmDb.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){showPasswordRecoveryForm();const button=document.querySelector('#passwordRecoveryForm [type=submit]');if(button)button.disabled=false;return}
    if(event==='SIGNED_IN'&&session&&!passwordRecoveryMode)setTimeout(()=>startSessionLoad1430(session),0);
    if(event==='SIGNED_OUT'){window.invalidateRequests1430?.();resetSessionLoad1430();liveProfile=null;DemoAccess.currentUser=null;const error=loginMessageTarget14293();if(error&&!passwordRecoveryMode)error.textContent='';document.getElementById('loginGate')?.classList.remove('is-authenticated')}
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
