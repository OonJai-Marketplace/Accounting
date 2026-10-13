// FOUNDATION V2 — final header, user-tab and expandable review behavior.
const switchTabBeforeFoundationV2=switchTab;
switchTab=function(tabId){return switchTabBeforeFoundationV2(tabId)};
function userInitials(name='OJ'){return String(name).trim().split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()||'OJ'}
function toggleHeaderAccountMenu(){const menu=document.getElementById('headerAccountDropdown'),trigger=document.getElementById('headerAccountTrigger');if(!menu)return;menu.hidden=!menu.hidden;trigger?.setAttribute('aria-expanded',String(!menu.hidden))}
function closeHeaderAccountMenu(){const menu=document.getElementById('headerAccountDropdown'),trigger=document.getElementById('headerAccountTrigger');if(menu)menu.hidden=true;trigger?.setAttribute('aria-expanded','false')}
function confirmSignOut(){closeHeaderAccountMenu();showAppConfirm('Sign Out','End the current secure session?','Sign Out',async()=>{await logoutDemoUser()},false)}
function switchAccount(){closeHeaderAccountMenu();showAppConfirm('Switch Account','The current account will be signed out. The next user must enter their own email and password.','Continue',async()=>{await logoutDemoUser();const email=document.getElementById('loginEmail');if(email){email.value='';email.focus()}},false)}
document.addEventListener('click',event=>{if(!event.target.closest('.header-account-menu'))closeHeaderAccountMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeHeaderAccountMenu()});

const applyLiveRoleAccessBeforeHeaderMenu=applyLiveRoleAccess;
applyLiveRoleAccess=function(){applyLiveRoleAccessBeforeHeaderMenu();const name=DemoAccess.currentUser?.name||liveProfile?.full_name||'OJ';const initials=document.getElementById('headerAccountInitials');if(initials)initials.textContent=userInitials(name)};

updateGlobalExportTools=function(tabId){
  const excluded=tabId.startsWith('settings-')||tabId==='user-entry-review',visible=!excluded;
  const csv=document.getElementById('global-csv-btn'),print=document.getElementById('global-print-btn'),divider=document.querySelector('.module-export-divider');
  if(csv)csv.hidden=!visible;if(print)print.hidden=!visible;if(divider)divider.hidden=!visible;
};
const openPrintDialogBeforeSettingsGuard=openPrintDialog;
openPrintDialog=function(){const active=document.querySelector('.tab-content.active')?.id||'';if(active.startsWith('settings-')||active==='user-entry-review'){showCenterStatus('Printing is not available in this module.',true);return}openPrintDialogBeforeSettingsGuard()};

showAppNotification=function(title,message,isError=false){showCenterStatus(`${title}: ${message}`,isError)};


openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default';
function activeSubUserTab(){return openSubUserTabs.find(tab=>tab.key===activeSubUserId)||openSubUserTabs[0]}
function addSubUserTab(){const key=`user-tab-${Date.now()}`;openSubUserTabs.push({key,userId:null,permanent:false});activeSubUserId=key;renderSubUserWorkspace();requestAnimationFrame(()=>document.getElementById('subUserTabSearch')?.focus())}
function activateSubUserTab(key){activeSubUserId=key;renderSubUserWorkspace()}
function closeSubUserWorkspace(event,key){event?.stopPropagation();const tab=openSubUserTabs.find(item=>item.key===key);if(!tab||tab.permanent)return;const index=openSubUserTabs.indexOf(tab);openSubUserTabs=openSubUserTabs.filter(item=>item.key!==key);if(activeSubUserId===key)activeSubUserId=openSubUserTabs[Math.max(0,index-1)]?.key||'default';renderSubUserWorkspace()}
function renderSubUserTabSearch(query=''){
  const hosts=[...document.querySelectorAll('#subUserSearchResults')],host=hosts.find(item=>item.offsetParent!==null)||hosts[0];if(!host)return;const term=String(query).trim().toLowerCase();
  const users=availableSubUsers().filter(user=>[subUserName(user),user.email,user.role,subUserPermission(user).job_title].some(value=>String(value||'').toLowerCase().includes(term)));
  host.innerHTML=users.length?users.map(user=>`<button type="button" class="sub-user-search-result" onclick="selectSubUserForActiveTab('${user.id}')"><div><strong>${escapeHtml(subUserName(user))}</strong><span>${escapeHtml(user.email||'No email')} • ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</span></div><span>Open</span></button>`).join(''):'<div class="sub-user-empty-state">No matching sub-users.</div>';host.hidden=false;
}
function selectSubUserForActiveTab(userId){
  const already=openSubUserTabs.find(tab=>tab.userId===userId);if(already){activeSubUserId=already.key;renderSubUserWorkspace();return}
  const tab=activeSubUserTab();if(!tab)return;if(tab.permanent){openWorkspaceUser(userId);return}tab.userId=userId;const results=document.getElementById('subUserSearchResults');if(results)results.hidden=true;renderSubUserWorkspace();
}
function subUserJournalRows(userId){return(reviewStaffJournals||[]).filter(j=>j.owner_id===userId)}
function lineAccountName(line){return workspaceAccount(line.account_id||line.selected_account_id)?.name||line.account_name||'Unassigned account'}
function renderSubUserWorkspace(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;
  if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}
  tabs.innerHTML=openSubUserTabs.map(tab=>{const user=availableSubUsers().find(item=>item.id===tab.userId),label=user?subUserName(user):'Default';return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span>${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" role="button" aria-label="Close ${escapeHtml(label)}" onclick="closeSubUserWorkspace(event,'${tab.key}')">&times;</span>`}</button>`}).join('');
  const tab=activeSubUserTab(),user=availableSubUsers().find(item=>item.id===tab?.userId);
  if(!user){panel.innerHTML=`<div class="sub-user-tab-search"><h4>Open a Sub-User Workspace</h4><p>Type a name, email, role, or position. Select a result to use this tab.</p><div class="sub-user-search-wrap"><input id="subUserTabSearch" class="je-input" type="search" autocomplete="off" placeholder="Search sub-users" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div>`;return}
  const permission=subUserPermission(user),journals=subUserJournalRows(user.id),editable=journals.find(j=>['draft','returned'].includes(j.status)&&!j.isSample),sample=journals.some(j=>j.isSample);
  panel.innerHTML=`<div class="sub-user-profile-grid"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Position</span><strong>${escapeHtml(permission.job_title||user.role||'Sub-user')}</strong></div><div class="sub-user-profile-item"><span>Status</span><strong>${escapeHtml(user.status||'Active')}</strong></div></div><div class="sub-user-submit-row"><button type="button" class="je-btn je-btn-emerald" ${editable?'':'disabled'} onclick="submitSubUserJournalForReview('${user.id}')">Submit for Review</button></div>${sample?'<div class="settings-compact-note">Sample preview data only — excluded from accounting records and reports.</div>':''}<div class="settings-section-header"><h4>Entry Submission Activity</h4></div><div class="table-container"><table class="je-table"><thead><tr><th>Period</th><th>Status</th><th>Entries</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>${journals.length?journals.map(j=>{const debit=(j.lines||[]).filter(l=>l.direction==='out').reduce((s,l)=>s+Number(l.amount||0),0),credit=(j.lines||[]).filter(l=>l.direction==='in').reduce((s,l)=>s+Number(l.amount||0),0);return`<tr><td>${escapeHtml(String(j.period_start||'').slice(0,7)||'—')}${j.isSample?'<span class="sample-data-pill">SAMPLE</span>':''}</td><td><span class="submission-status ${escapeHtml(j.status)}">${escapeHtml(String(j.status).toUpperCase())}</span></td><td>${j.lines?.length||0}</td><td class="num">${formatAppNumber(debit)}</td><td class="num">${formatAppNumber(credit)}</td></tr>`}).join(''):'<tr><td colspan="5" class="period-empty">No saved journal activity for this user.</td></tr>'}</tbody></table></div>`;
}
function submitSubUserJournalForReview(userId){
  const journal=(reviewStaffJournals||[]).find(j=>j.owner_id===userId&&['draft','returned'].includes(j.status));if(!journal){showCenterStatus('No draft or returned journal is ready for submission.',true);return}
  const name=getLiveUserName(userId);showAppConfirm('Submit for Review',`Submit ${escapeHtml(name)}’s ${String(journal.period_start).slice(0,7)} journal for review? This administrative action will be recorded.`,'Submit',async()=>{const now=new Date().toISOString();const result=await ojmDb.from('staff_journals').update({status:'submitted',submitted_at:now,return_note:null,updated_at:now}).eq('id',journal.id);if(result.error){showCenterStatus(`Submission failed: ${result.error.message}`,true);return}await ojmDb.from('audit_log').insert({table_name:'staff_journals',record_id:String(journal.id),action:'ADMIN_SUBMIT',reason:`Submitted for ${name} by administrator`,actor_id:liveProfile.id,new_data:{owner_id:userId,period_start:journal.period_start}});await loadStaffJournalsForReview();renderSubUserWorkspace();showCenterStatus('Journal submitted for review.')},false)
}

