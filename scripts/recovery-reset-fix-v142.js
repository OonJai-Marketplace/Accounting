/* Version 142 focused repair: permanent, protected operational-data reset. */
(function(){'use strict';
 const byId=id=>document.getElementById(id);
 const esc=value=>typeof escapeHtml==='function'?escapeHtml(String(value??'')):String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const setStatus=(node,message,bad=false)=>{if(node){node.textContent=message;node.classList.toggle('error',bad)}if(message&&typeof showCenterStatus==='function')showCenterStatus(message,bad)};
 const digest=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(x=>x.toString(16).padStart(2,'0')).join('');
 async function rpc(name,args){const result=await ojmDb.rpc(name,args);if(result.error)throw result.error;return result.data;}
 async function verifyAdminPassword(password){
  if(!password)throw Error('Enter your current administrator password.');
  if(!window.supabase||!window.OJM_SUPABASE_URL||!window.OJM_SUPABASE_ANON_KEY||!liveProfile?.email)throw Error('Administrator verification is unavailable. Sign in again.');
  const verifier=window.supabase.createClient(window.OJM_SUPABASE_URL,window.OJM_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(...args)=>window.fetch(...args)}});
  const result=await verifier.auth.signInWithPassword({email:liveProfile.email,password});
  if(result.error||result.data.user?.id!==liveProfile.id)throw Error('Administrator password was not accepted. Nothing was deleted.');
  await verifier.auth.signOut({scope:'local'}).catch(()=>{});
 }
 function render(){
  const host=byId('settings-backup113');if(!host||!window.shell113?.admin())return;
  byId('practiceReset130')?.remove();
  if(byId('operationalReset142'))return;
  const section=document.createElement('section');section.id='operationalReset142';section.className='panel113';
  section.innerHTML=`<header><h2>Reset Operational Data</h2></header>
   <p class="reset-warning142"><strong>Permanent administrator tool.</strong> Use this after mock testing or only when a complete operational restart is intentional. It clears live working records and restarts their generated counters. It never deletes the Chart of Accounts or saved Settings.</p>
   <div class="reset-preserve142"><span>Chart of Accounts</span><span>Sub-accounts and system accounts</span><span>Saved Settings and ID formats</span><span>Users, roles and permissions</span><span>Administrator access</span><span>Database structure and security rules</span></div>
   <p>Cleared scope: journals and transaction history, opening/closing records, recurring items, payroll and HR records, tax/SSO records, sub-user fund activity and submissions, reports and documents, audit logs, working notifications, and other operational records registered in Version 142.</p>
   <div class="reset-actions142"><button type="button" id="operationalPrepare142" class="primary113">1. Prepare accounting backup</button></div>
   <div id="operationalVerify142" hidden><pre id="operationalCounts142" class="backup-preview113"></pre><p>Save the downloaded JSON, then select that exact file. The database will refuse the reset if any record changed after the backup.</p>
    <label>Downloaded backup file <input type="file" id="operationalFile142" accept="application/json,.json"></label>
    <div class="reset-confirm142"><label>Current administrator password<input type="password" id="operationalPassword142" autocomplete="current-password"></label><label>Type RESET OPERATIONAL DATA<input id="operationalPhrase142" autocomplete="off" spellcheck="false"></label></div>
    <div class="reset-actions142"><button type="button" id="operationalApply142" class="primary113" disabled>2. Reset operational data</button></div>
   </div><p id="operationalStatus142" class="status113" role="status"></p>`;
  host.append(section);
  const prepare=byId('operationalPrepare142'),panel=byId('operationalVerify142'),file=byId('operationalFile142'),password=byId('operationalPassword142'),phrase=byId('operationalPhrase142'),apply=byId('operationalApply142'),out=byId('operationalStatus142');
  let pack=null,hash='',preview=null,verified=false;
  const check=()=>{apply.disabled=!(pack&&preview&&verified&&password.value&&phrase.value==='RESET OPERATIONAL DATA'&&window.shell113?.admin())};
  const invalidate=()=>{verified=false;apply.disabled=true};file.onchange=async()=>{invalidate();if(!pack||!file.files[0])return;try{const chosen=file.files[0],actual=await digest(chosen);if(actual!==hash)throw Error('The selected file is not the exact backup just prepared.');const parsed=JSON.parse(await chosen.text());if(parsed.project!==window.OJM_SUPABASE_URL||parsed.format!=='oonjai-data-113'||parsed.from!==null||parsed.to!==null)throw Error('Choose the all-time backup for this connected project.');verified=true;setStatus(out,'Backup file verified. Enter your password and the confirmation phrase.');check()}catch(error){setStatus(out,error.message,true)}};
  password.oninput=check;phrase.oninput=check;
  prepare.onclick=async()=>{if(!window.shell113?.admin())return;prepare.disabled=true;pack=null;preview=null;verified=false;panel.hidden=true;file.value='';password.value='';phrase.value='';try{
   setStatus(out,'Preparing an all-time accounting backup…');pack=await rpc('operational_data_backup142',{});pack.project=window.OJM_SUPABASE_URL;
   if(pack.from!==null||pack.to!==null||pack.format!=='oonjai-data-113')throw Error('The server did not return a full all-time backup.');
   const blob=new Blob([JSON.stringify(pack)],{type:'application/json'});hash=await digest(blob);preview=await rpc('operational_data_reset142',{p_pack:pack,p_apply:false,p_confirmation:null});
   if(preview.mode!=='preview')throw Error('The reset preview did not complete.');
   byId('operationalCounts142').textContent=JSON.stringify({recordsToClear:preview.total,tables:preview.counts,preserved:preview.preserved,nextGeneratedNumber:1,backupBytes:blob.size,sha256:hash},null,2);
   panel.hidden=false;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`oonjai-before-operational-reset-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);setStatus(out,'Backup download started. Select the downloaded file to verify it. Nothing has been deleted.');
  }catch(error){pack=null;preview=null;panel.hidden=true;setStatus(out,'Reset preparation failed: '+error.message,true)}finally{prepare.disabled=false}};
  apply.onclick=async()=>{if(apply.disabled||!pack||!verified||!preview)return;apply.disabled=true;try{
   setStatus(out,'Verifying administrator password…');await verifyAdminPassword(password.value);password.value='';
   const current=await rpc('operational_data_reset142',{p_pack:pack,p_apply:false,p_confirmation:null});if(JSON.stringify(current.counts)!==JSON.stringify(preview.counts)||current.preservedFingerprint!==preview.preservedFingerprint)throw Error('Data changed after the backup. Prepare a new backup.');
   const approved=await ui108.modal('Reset all operational data',`<p><strong>This cannot be undone from the website.</strong></p><p>${esc(preview.total)} operational records will be cleared and generated counters will restart. The Chart of Accounts, sub-accounts, system accounts, Settings, users, roles and permissions will remain.</p><p>Continue only after keeping the downloaded backup.</p>`,[{label:'Cancel',value:false},{label:'Reset operational data',value:true,danger:true}]);if(!approved){setStatus(out,'Reset cancelled. Nothing was deleted.');return}
   const result=await rpc('operational_data_reset142',{p_pack:pack,p_apply:true,p_confirmation:'RESET OPERATIONAL DATA'});if(result.mode!=='cleared')throw Error('The database did not confirm the reset.');
   localStorage.removeItem('ojm_period_review_v1');JournalModule.voidedEntries=[];PeriodReview.findings=[];
   for(const key of Object.keys(sessionStorage))if(key.startsWith('ojm_pending_posts99_'))sessionStorage.removeItem(key);
   setStatus(out,`Reset complete: ${result.total} operational records cleared. Chart of Accounts and Settings were preserved. Reloading…`);setTimeout(()=>location.reload(),1800);
  }catch(error){setStatus(out,'Reset not completed: '+error.message,true)}finally{apply.disabled=false;check()}};
 }
 function repairRecoveryMessage(){
  const host=byId('settings-recovery113');if(!host||byId('recoveryServiceNote142'))return;const note=document.createElement('p');note.id='recoveryServiceNote142';note.className='reset-warning142';note.innerHTML='<strong>Recovery service:</strong> this secure page requires the bundled <code>recovery-vault113</code> Supabase Edge Function to be deployed for this website origin. If it is unavailable, use Accounting Archive for operational reset; your password is never treated as rejected after a connection error.';host.prepend(note);
 }
 function install(){render();repairRecoveryMessage();window.addEventListener('page113',()=>queueMicrotask(()=>{render();repairRecoveryMessage()}));}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
