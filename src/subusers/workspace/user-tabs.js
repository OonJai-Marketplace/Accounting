let openSubUserTabs=[],activeSubUserId='';
function availableSubUsers(){
  const source=[...((liveProfiles?.length?liveProfiles:DemoAccess.users)||[])];
  return source.filter(user=>user.id!==liveProfile?.id&&user.id!==DemoAccess.currentUser?.id);
}
function subUserName(user){return user.full_name||user.name||user.email||'Unnamed user'}
function subUserAccountTitle14229(user){const name=String(subUserName(user)).trim();return name+(/s$/i.test(name)?'’':'’s')+' Account'}
function subUserPermission(user){return user&&String(user.id)===String(liveProfile?.id)?livePermission||user.user_permissions||{}:user?.user_permissions||{}}
function filterSubUserSearch(query=''){renderSubUserSearchResults(query)}
function renderSubUserSearchResults(query=''){
  const host=document.getElementById('subUserSearchResults');if(!host)return;
  const term=String(query).trim().toLowerCase(),users=availableSubUsers().filter(user=>[subUserName(user),user.email,user.role,subUserPermission(user).job_title].some(value=>String(value||'').toLowerCase().includes(term)));
  host.innerHTML=users.length?users.map(user=>`<button type="button" class="sub-user-search-result" onclick="openSubUserWorkspace(${escapeHtml(JSON.stringify(user.id))})"><div><strong>${escapeHtml(subUserName(user))}</strong><span>${escapeHtml(user.email||'No email')} • ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</span></div><span>Open</span></button>`).join(''):'<div class="sub-user-empty-state">No matching sub-users.</div>';
  host.hidden=false;
}
function openSubUserWorkspace(id){
  if(!openSubUserTabs.includes(id))openSubUserTabs.push(id);activeSubUserId=id;
  const input=document.getElementById('subUserUniversalSearch'),results=document.getElementById('subUserSearchResults');if(input)input.value='';if(results)results.hidden=true;
  renderSubUserWorkspace();
}
function closeSubUserWorkspace(event,id){
  event.stopPropagation();const index=openSubUserTabs.indexOf(id);openSubUserTabs=openSubUserTabs.filter(item=>item!==id);
  if(activeSubUserId===id)activeSubUserId=openSubUserTabs[Math.min(index,openSubUserTabs.length-1)]||'';
  renderSubUserWorkspace();
}
function renderSubUserWorkspace(){
  const tabs=document.getElementById('subUserWorkspaceTabs'),panel=document.getElementById('subUserWorkspacePanel');if(!tabs||!panel)return;
  tabs.innerHTML=openSubUserTabs.map(id=>{const user=availableSubUsers().find(item=>item.id===id);if(!user)return'';return`<button type="button" class="sub-user-browser-tab ${id===activeSubUserId?'active':''}" onclick="activeSubUserId=${escapeHtml(JSON.stringify(id))};renderSubUserWorkspace()"><span>${escapeHtml(subUserName(user))}</span><span class="sub-user-tab-close" role="button" aria-label="Close ${escapeHtml(subUserName(user))}" onclick="closeSubUserWorkspace(event,${escapeHtml(JSON.stringify(id))})">&times;</span></button>`}).join('');
  const user=availableSubUsers().find(item=>item.id===activeSubUserId);if(!user){panel.innerHTML='<div class="sub-user-empty-state">Select a sub-user to open their administrative workspace.</div>';return}
  const permission=subUserPermission(user),journals=(reviewStaffJournals||[]).filter(item=>item.owner_id===user.id),submitted=journals.filter(item=>item.status==='submitted').length;
  panel.innerHTML=`<div class="sub-user-profile-grid"><div class="sub-user-profile-item"><span>Name</span><strong>${escapeHtml(subUserName(user))}</strong></div><div class="sub-user-profile-item"><span>Email</span><strong>${escapeHtml(user.email||'—')}</strong></div><div class="sub-user-profile-item"><span>Role / Position</span><strong>${escapeHtml(permission.job_title||user.role||'Sub-user')}</strong></div><div class="sub-user-profile-item"><span>Status</span><strong>${escapeHtml(user.status||((user.active===false)?'Inactive':'Active'))}</strong></div></div><div class="sub-user-workspace-actions"><button type="button" class="je-btn je-btn-emerald" onclick="openUserAccessEditor(${escapeHtml(JSON.stringify(user.id))})">Edit Permissions</button><button type="button" class="je-btn je-btn-secondary" onclick="sendSubUserPasswordReset(${escapeHtml(JSON.stringify(user.id))})">Send Password Reset</button><button type="button" class="je-btn je-btn-secondary" onclick="openUserSubmissionReview(${escapeHtml(JSON.stringify(user.id))})">Review Submissions (${submitted})</button></div><div class="settings-section-header"><h4>Entry Submission Activity</h4></div><div class="table-container"><table class="je-table"><thead><tr><th>Period</th><th>Status</th><th>Entries</th><th>Total</th></tr></thead><tbody>${journals.length?journals.map(j=>`<tr><td>${escapeHtml(String(j.period_start||'').slice(0,7)||'—')}</td><td><span class="submission-status ${escapeHtml(j.status)}">${escapeHtml(String(j.status||'draft').toUpperCase())}</span></td><td>${j.lines?.length||0}</td><td class="num">${[...(j.lines||[]).reduce((totals,line)=>{const currency=line.currency_code||'LAK';totals.set(currency,(totals.get(currency)||0)+Number(line.amount||0));return totals},new Map())].map(([currency,total])=>escapeHtml(currency)+' '+formatAppNumber(total)).join('<br>')}</td></tr>`).join(''):'<tr><td colspan="4" class="period-empty">No saved journal activity for this user.</td></tr>'}</tbody></table></div>`;
}
function openUserSubmissionReview(id){switchTab('user-entry-review');const select=document.getElementById('userReviewUser');if(select){select.value=id;renderUserEntryReview()}}
async function sendSubUserPasswordReset(id){
  const user=availableSubUsers().find(item=>item.id===id);if(!user?.email||!ojmDb){showCenterStatus('A valid user email is required.',true);return}
  const owner=liveProfile?.id,db=ojmDb;
  const {error}=await db.auth.resetPasswordForEmail(user.email,{redirectTo:passwordRecoveryRedirectUrl()});
  if(liveProfile?.id!==owner||ojmDb!==db)return;
  showCenterStatus(error?error.message:`Password-reset link sent to ${user.email}.`,Boolean(error));
}

