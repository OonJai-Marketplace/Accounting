// FOUNDATION V4 — secure shared sub-user workspace and compact permission pickers.
let activeAccessPicker={panel:null,placeholder:null,trigger:null};
function openAccessPicker(title,panelId,trigger){const panel=document.getElementById(panelId),content=document.getElementById('accessPickerContent');if(!panel||!content||activeAccessPicker.panel)return;const snapshot=[...panel.querySelectorAll('input,select,textarea')].map(n=>({node:n,value:n.value,checked:n.checked,indeterminate:n.indeterminate,type:n.type,name:n.getAttribute('name')})),matrix=panelId==='userModuleAccessPanel'?structuredClone(window.access113?.editorValue()||{}):null;const placeholder=document.createComment(`restore-${panelId}`);panel.parentNode.insertBefore(placeholder,panel);panel.hidden=false;content.appendChild(panel);activeAccessPicker={panel,placeholder,trigger,snapshot,matrix};document.getElementById('accessPickerTitle').textContent=title;const search=document.getElementById('accessPickerSearch');if(search)search.value='';trigger?.classList.add('is-open');openModal('modalAccessPicker');requestAnimationFrame(()=>search?.focus())}
function closeAccessPicker(accept=false){const{panel,placeholder,trigger,snapshot,matrix}=activeAccessPicker;if(panel&&!accept){for(const s of snapshot||[]){const n=s.node;if(n.tagName==='INPUT')n.type=s.type;if(s.name===null)n.removeAttribute('name');else n.setAttribute('name',s.name);n.value=s.value;n.checked=s.checked;n.indeterminate=s.indeterminate;}if(matrix)window.access113?.restoreEditor(matrix);}if(panel&&placeholder?.parentNode){placeholder.parentNode.insertBefore(panel,placeholder);placeholder.remove();panel.hidden=true}trigger?.classList.remove('is-open');activeAccessPicker={panel:null,placeholder:null,trigger:null};closeModal('modalAccessPicker');updateUserAccessSummaries();if(panel&&accept)panel.dispatchEvent(new Event('change',{bubbles:true}));}
function completeAccessPicker265(){closeAccessPicker(true)}
function filterAccessPicker(query=''){const term=String(query).trim().toLowerCase(),content=document.getElementById('accessPickerContent');content?.querySelectorAll('label.permission-option,label.settings-toggle').forEach(label=>label.hidden=Boolean(term&&!label.textContent.toLowerCase().includes(term)))}
function selectedAccessLabels(selector){return[...document.querySelectorAll(selector)].filter(input=>input.checked).map(input=>input.closest('label')?.querySelector('strong,span')?.textContent.trim()||input.value)}
function accessSummaryHtml(items,empty){if(!items.length)return escapeHtml(empty);const visible=items.slice(0,9),extra=items.length-visible.length;return`<ul>${visible.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}${extra?`<li>+${extra} more</li>`:''}</ul>`}
function updateUserAccessSummaries(){
  const modules=selectedAccessLabels('#userPermissionGrid input'),actions=selectedAccessLabels('#userSecurityAccessPanel input'),funds=[...document.querySelectorAll('#userFundAccountGrid input[type="checkbox"]:checked')],entries=[...document.querySelectorAll('#userAccountAccessGrid input:checked')];
  const moduleSummary=document.getElementById('userModuleAccessSummary'),securitySummary=document.getElementById('userSecurityAccessSummary'),accountSummary=document.getElementById('userAccountAssignmentSummary');
  if(moduleSummary)moduleSummary.innerHTML=accessSummaryHtml(modules,'Workspace only');
  if(securitySummary)securitySummary.innerHTML=accessSummaryHtml(actions,'No special actions selected');
  if(accountSummary){const names=[...funds,...entries].map(input=>input.closest('label')?.querySelector('span')?.textContent.trim()).filter(Boolean);accountSummary.innerHTML=accessSummaryHtml(names,`${funds.length} main account${funds.length===1?'':'s'} • ${document.getElementById('permissionAllowAnyAccount')?.checked?'All':entries.length} entry account${entries.length===1?'':'s'}`)}
}
document.addEventListener('change',event=>{if(event.target.closest('#modalUserAccess'))updateUserAccessSummaries()});
const openUserAccessEditorBeforeCompactPickers=openUserAccessEditor;
openUserAccessEditor=function(id=''){openUserAccessEditorBeforeCompactPickers(id);['userModuleAccessPanel','userSecurityAccessPanel','userAccountAssignmentPanel'].forEach(panelId=>{const panel=document.getElementById(panelId);if(panel)panel.hidden=true});updateUserAccessSummaries()};

availableSubUsers=function(){
  if(liveProfile&&liveProfile.role!=='admin'&&!(window.access113?.can('user-entry-review')))return[{...liveProfile,user_permissions:livePermission||{}}];
  return[...((liveProfiles?.length?liveProfiles:DemoAccess.users)||[])].filter(user=>user.id!==liveProfile?.id&&user.id!==DemoAccess.currentUser?.id&&user.role!=='admin')
};
loadStaffJournalsForReview=async function(){
  if(!ojmDb||!liveProfile)return;const reviewer=liveProfile.role==='admin'||Boolean(livePermission?.can_approve);let query=ojmDb.from('staff_journals').select('*').order('submitted_at',{ascending:false});if(!reviewer)query=query.eq('owner_id',liveProfile.id);
  const journals=await query;if(journals.error){showCenterStatus(`Workspace unavailable: ${journals.error.message}`,true);return}const ids=(journals.data||[]).map(j=>j.id),lines=ids.length?await ojmDb.from('staff_journal_lines').select('*').in('staff_journal_id',ids):{data:[]};reviewStaffJournals=(journals.data||[]).map(j=>({...j,lines:(lines.data||[]).filter(line=>line.staff_journal_id===j.id)}));renderUserEntryReview();renderSubUserWorkspace()
};

const applyPermissionAccessBeforeWorkspaceSecurity=applyPermissionAccess;
applyPermissionAccess=function(){
  applyPermissionAccessBeforeWorkspaceSecurity();if(!liveProfile)return;applyGranularPermissionAccess()
};
const switchTabBeforeWorkspaceSecurity=switchTab;
switchTab=function(tabId){
  if(liveProfile&&!canAccessAppTarget(tabId)){const parent=permissionTreeNodeForTarget(tabId),fallback=parent?.children.find(([target])=>canAccessAppTarget(target))?.[0]||firstPermittedAppTarget();showCenterStatus('This module is not included in your access permissions.',true);if(!fallback)return;if(fallback.startsWith('sec-'))return scrollToAccountModule(fallback);tabId=fallback}return switchTabBeforeWorkspaceSecurity(tabId)
};

