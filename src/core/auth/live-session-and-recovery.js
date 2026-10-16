// ==============================================================================
// JS V12: LIVE SUPABASE AUTHENTICATION & DATA ADAPTER
// ==============================================================================
let ojmDb = null;
let liveProfile = null;
let liveProfiles = [];
let liveLegalDocuments = [];
let freshLoginRequested = false;
let passwordRecoveryMode = false;

function passwordRecoveryRedirectUrl(){
  const configured=String(window.OJM_PUBLIC_APP_URL||localStorage.getItem('ojm_public_app_url105')||'').trim();
  const url=new URL(configured||window.location.href);
  if(url.protocol!=='https:'||/^(?:localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(url.hostname)||/\.(?:local|localhost)$/i.test(url.hostname)||/(?:stackblitz|webcontainer|codesandbox)/i.test(url.hostname)){
    throw new Error('Open the published HTTPS app to request a password reset, or set OJM_PUBLIC_APP_URL to its published address. Preview and local links cannot be used in email.');
  }
  url.username='';url.password='';url.hash='';url.search='';url.searchParams.set('password-recovery','1');return url.toString();
}
function showPasswordRecoveryForm(message='Choose a new password for this account.'){
  passwordRecoveryMode=true;document.getElementById('loginGate')?.classList.remove('is-authenticated');const login=document.getElementById('loginForm'),form=document.getElementById('passwordRecoveryForm'),status=document.getElementById('recoveryPasswordStatus');if(login)login.hidden=true;if(form)form.hidden=false;if(status){status.textContent=message;status.classList.remove('recovery-success')}requestAnimationFrame(()=>document.getElementById('recoveryPassword')?.focus())
}
function showLoginForm(message=''){
  passwordRecoveryMode=false;const login=document.getElementById('loginForm'),form=document.getElementById('passwordRecoveryForm'),error=loginMessageTarget14293(),password=document.getElementById('recoveryPassword'),confirmPassword=document.getElementById('recoveryPasswordConfirm');if(login)login.hidden=false;if(form)form.hidden=true;if(error)error.textContent=message;if(password)password.value='';if(confirmPassword)confirmPassword.value='';requestAnimationFrame(()=>document.getElementById('loginEmail')?.focus())
}
async function requestPasswordReset(){
 const emailInput=document.getElementById('loginEmail'),email=emailInput?.value.trim(),error=loginMessageTarget14293();if(!email||!emailInput.checkValidity()){error.textContent='Enter a valid email address first.';emailInput.focus();return}if(!ojmDb){error.textContent='Authentication is still loading. Try again in a moment.';return}const button=document.querySelector('[onclick="requestPasswordReset()"]');if(button.disabled)return;button.disabled=true;
 try{let options={};try{options.redirectTo=passwordRecoveryRedirectUrl()}catch(e){if(location.protocol!=='file:')throw e}error.textContent='Requesting password recovery…';const result=await ojmDb.auth.resetPasswordForEmail(email,options);if(result.error)throw result.error;error.textContent='If this account exists, check its recovery email. Open the recovery link on the published app, or enter the email’s recovery code below.';window.showRecoveryCode109?.(email)}catch(e){error.textContent=e.message||'Recovery could not be requested. Try again.'}finally{button.disabled=false}
}
async function saveRecoveredPassword(event){
 event.preventDefault();const form=document.getElementById('passwordRecoveryForm'),button=form.querySelector('[type=submit]'),status=document.getElementById('recoveryPasswordStatus');
 const password=document.getElementById('recoveryPassword').value,confirmation=document.getElementById('recoveryPasswordConfirm').value;
 if(password.length<8){status.textContent='Use at least 8 characters.';return}if(password!==confirmation){status.textContent='The two passwords do not match.';return}if(button.disabled)return;
 button.disabled=true;status.textContent='Updating password…';
 try{
  if(!ojmDb)throw Error('Authentication is unavailable. Reload this recovery link.');
  const sessionResult=await ojmDb.auth.getSession();if(sessionResult.error)throw sessionResult.error;
  if(!sessionResult.data?.session)throw Error('This link has expired or has already been used. Return to Sign In and request a new password-reset email.');
  const {error}=await ojmDb.auth.updateUser({password});if(error)throw error;
  // Erase credentials immediately and finish at Sign In only after the update succeeds.
  form.reset();history.replaceState({},document.title,location.pathname);
  const signedOut=await ojmDb.auth.signOut({scope:'local'});if(signedOut?.error){status.textContent='Password updated. Close this page and sign in again with your new password.';return}
  showLoginForm('Password updated. Sign in with your new password.');
 }catch(error){status.textContent=error.message||'Connection interrupted. Please retry; your password change has not been confirmed.'}finally{button.disabled=false}
}
async function cancelPasswordRecovery(){if(ojmDb)await ojmDb.auth.signOut();history.replaceState({},document.title,location.pathname);showLoginForm()}

handleDemoLogin = async function(event) {
  event.preventDefault();
  freshLoginRequested = true;
  const errorBox = loginMessageTarget14293();
  if (errorBox) errorBox.textContent = '';
  const { error } = await ojmDb.auth.signInWithPassword({
    email:document.getElementById('loginEmail').value.trim(), password:document.getElementById('loginPassword').value
  });
  if (error && errorBox) errorBox.textContent = error.message;
};

logoutDemoUser = async function() { const error=loginMessageTarget14293();if(error)error.textContent='';localStorage.removeItem('ojm_last_active_view_v1');freshLoginRequested=false;if (ojmDb) await ojmDb.auth.signOut({scope:'local'}); };

let profileRequest143100=0;
async function loadLiveProfile(user) {
  const db=ojmDb,epoch=sessionEpoch1430,request=++profileRequest143100;
  const { data, error } = await db.from('profiles').select('id,email,full_name,role,status').eq('id',user.id).single();
  if(db!==ojmDb||epoch!==sessionEpoch1430||request!==profileRequest143100)throw Object.assign(new Error('Session changed while loading the profile.'),{code:'STALE_PROFILE143100'});
  if (error) throw new Error(`Profile unavailable: ${error.message}. Run the supplied SQL before signing in.`);
  if (!data || data.id!==user.id) throw new Error('The signed-in profile could not be verified.');
  if (data.status !== 'active') throw new Error('This user account is inactive.');
  liveProfile = data;
  DemoAccess.currentUser = {id:data.id,email:data.email,name:data.full_name || data.email,role:data.role,active:true};
}

function applyLiveRoleAccess() {
  const user = DemoAccess.currentUser;
  document.getElementById('loginGate')?.classList.add('is-authenticated');
  document.body.dataset.userRole = user.role;
  const chip=document.getElementById('currentUserChip'); if(chip)chip.textContent=`${user.name} • ${user.role==='admin'?'Admin':'Staff'}`;
  document.querySelectorAll('.nav-category').forEach(category=>category.hidden=user.role!=='admin'&&category.dataset.module!=='submissions');
  document.querySelectorAll('.submission-admin-column').forEach(el=>el.hidden=user.role!=='admin');
  const roleBadge=document.getElementById('submissionRoleBadge'); if(roleBadge)roleBadge.textContent=user.role==='admin'?'Administrator Review':'Staff Workspace';
  const title=document.getElementById('submissionTableTitle'); if(title)title.textContent=user.role==='admin'?'Submission Review Queue':'My Submissions';
}

