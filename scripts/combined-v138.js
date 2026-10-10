/* Final combined corrections, including restricted administrator-assisted sub-user sessions. */
(function(){'use strict';
const $=id=>document.getElementById(id),ctx=window.workspaceRequest138;let saved=null,switching=false;
const esc=v=>shell113.esc(v);
function badge(){let node=$('restrictedWorkspace138');if(!ctx.target){node?.remove();return;}if(!node){node=document.createElement('aside');node.id='restrictedWorkspace138';node.setAttribute('role','status');document.querySelector('.workspace-scroll').before(node);}
 const text='Using '+(liveProfile?.full_name||'sub-user')+'’s account · their configured limits apply · Administrator: '+(saved?.profile.full_name||'');
 if(node.dataset.label===text)return;node.dataset.label=text;node.innerHTML='<span>'+esc(text)+'</span><button type="button">Return to Administrator</button>';node.querySelector('button').onclick=restore;
}
function clean(){document.querySelectorAll('.modal-backdrop.active,.submission-compare-overlay,.ui-overlay108').forEach(n=>{if(n.classList.contains('modal-backdrop'))n.classList.remove('active');else n.remove();});const notices=$('headerNotices104');if(notices)notices.hidden=true;$('switchWorkspace136')?.remove();$('workspaceActor136')?.remove();
 workflow136.state.sessions=[];workflow136.state.reviews=[];workflow136.state.todos=[];JournalModule.entries=[];reviewStaffJournals=[];liveLegalDocuments=[];openSubUserTabs=[];activeSubUserId='';
 window.funds113?.cache.clear();window.funds113?.confirmed.clear();$('subUserWorkspacePanel')?.replaceChildren();DemoAccess.submissions=[];
 document.querySelectorAll('.tab-content.active').forEach(n=>n.classList.remove('active'));$('categoryTabs')?.replaceChildren();
 if(typeof Work82!=='undefined')Object.assign(Work82,{owner:null,loaded:false,loading:false,error:'',employees:[],leaves:[],runs:[],reports:[],run:null,runRecord:null,employee:null,report:null,reportRecord:null});
}
function apply(){document.querySelectorAll('.tab-content').forEach(n=>{if(ctx.target&&!canAccessAppTarget(n.id))n.dataset.restrictedHidden138='';else delete n.dataset.restrictedHidden138;});applyLiveRoleAccess();applyPermissionAccess();access113.enforce();workflow136.decorate();badge();updateHeaderProfile104?.();}
function transition(name){const old=$('workspaceSwitchBusy141');old?.remove();if(!name)return;const box=document.createElement('div');box.id='workspaceSwitchBusy141';box.setAttribute('role','status');box.innerHTML=loading1444.markup();box.setAttribute('aria-label','Opening '+name+'’s account');document.body.append(box);}
function reportSwitchError(message){showCenterStatus(message,true);const panel=$('switchWorkspace136');if(panel){let error=panel.querySelector('[data-switch-error141]');if(!error){error=document.createElement('p');error.dataset.switchError141='';error.setAttribute('role','alert');panel.append(error)}error.textContent=message}}
async function enter(id){
 if(switching)return;const actor=saved?.profile||liveProfile;if(actor?.role!=='admin')return;
 const user=(saved?.users||liveProfiles).find(u=>u.id===id&&u.role!=='admin'&&u.status==='active');if(!user)return reportSwitchError('Choose an active sub-user.');
 const previousTarget=ctx.target,previousActor=ctx.actor;let activated=false;
 switching=true;ctx.busy=true;transition(user.full_name||user.email);
 try{
  if(workflow136.state.sessions.some(s=>s.status==='editing')||document.querySelector('.inline-cell117:focus'))throw Error('Finish or cancel your current editing session before switching accounts.');
  const candidate=saved||{profile:structuredClone(liveProfile),permission:structuredClone(livePermission||{modules:[]}),users:structuredClone(liveProfiles),demo:structuredClone(DemoAccess.currentUser)};
  ctx.target=id;ctx.actor=actor.id;
  const verified=await ojmDb.rpc('workspace_context138');
  if(verified.error||verified.data?.effective_user!==id||verified.data?.actor!==actor.id)throw Error('Account switching could not be verified. Read setup/SETUP-GUIDE-v142.20.txt before trying again. '+(verified.error?.message||''));
  const profileResult=await ojmDb.from('profiles').select('id,email,full_name,role,status').eq('id',id).single();
  if(profileResult.error||profileResult.data?.id!==id||profileResult.data.status!=='active'||profileResult.data.role==='admin')throw Error(profileResult.error?.message||'This sub-user is no longer active.');
  const permissionResult=await ojmDb.from('user_permissions').select('*').eq('user_id',id).maybeSingle();
  if(permissionResult.error)throw Error('Could not load the selected account’s Settings: '+permissionResult.error.message);
  const permission={modules:[],can_approve:false,can_post_directly:false,can_void:false,can_export:false,...(permissionResult.data||{})};
  saved=candidate;clean();activated=true;liveProfile=profileResult.data;livePermission=permission;
  DemoAccess.currentUser={id,email:liveProfile.email,name:liveProfile.full_name,role:liveProfile.role,active:true};
  liveProfiles=[{...liveProfile,user_permissions:livePermission}];
  openSubUserTabs=[{key:'user-'+id,userId:id,permanent:false}];activeSubUserId='user-'+id;
  apply();await loadReferenceDataFromSupabase();await loadJournalFromSupabase();await loadStaffJournalsForReview();
  openSubUserTabs=[{key:'user-'+id,userId:id,permanent:false}];activeSubUserId='user-'+id;
  apply();const target=canAccessAppTarget('sub-users-workspace')?'sub-users-workspace':firstPermittedAppTarget();
  if(!target){showCenterStatus('No modules are enabled for this account. Return to Administrator to update Settings.',true);}
  else if(target.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target);
  if(target==='sub-users-workspace')renderSubUserWorkspace();badge();
  if(target)showCenterStatus('You are now using '+liveProfile.full_name+'’s account.');
 }catch(error){
  if(activated){try{await restore()}catch(restoreError){reportSwitchError('Administrator view restored, but data could not reload: '+restoreError.message)}}
  else{ctx.target=previousTarget;ctx.actor=previousActor}
  reportSwitchError(error.message);
 }finally{switching=false;ctx.busy=false;transition(null)}
}
async function restore(){if(!saved){ctx.target=null;ctx.actor=null;return;}const original=saved;ctx.target=null;ctx.actor=null;saved=null;clean();liveProfile=original.profile;livePermission=original.permission;liveProfiles=original.users;DemoAccess.currentUser=original.demo;apply();await loadReferenceDataFromSupabase();await loadJournalFromSupabase();await loadStaffJournalsForReview();switchTab('sub-users-workspace');renderSubUserWorkspace();badge();}
function menu(){if(liveProfile?.role!=='admin'&&!saved)return switchAccount();let panel=$('switchWorkspace136');if(panel){panel.remove();return;}panel=document.createElement('section');panel.id='switchWorkspace136';panel.className='dock-popover136';panel.innerHTML='<header><strong>Switch Account</strong><button aria-label="Close">×</button></header><input type="search" placeholder="Search sub-users" aria-label="Search sub-users">'+(saved?'<button data-return138>Return to Administrator</button>':'')+'<div></div>';document.body.append(panel);
 const box=(window.desktopScale14320?.rect($('switchAccount110'))||$('switchAccount110').getBoundingClientRect());panel.style.position='fixed';panel.style.right=Math.max(12,(window.desktopScale14320?.width||innerWidth)-box.left+10)+'px';panel.style.bottom=Math.max(12,(window.desktopScale14320?.height||innerHeight)-box.bottom)+'px';panel.style.maxHeight='70vh';panel.querySelector('header button').onclick=()=>panel.remove();panel.querySelector('[data-return138]')?.addEventListener('click',restore);
 if(saved){panel.querySelector('input').hidden=true;panel.querySelector('div').textContent='Return to Administrator to choose another account.';return;}
 const users=liveProfiles.filter(u=>u.role!=='admin'&&u.status==='active');const draw=()=>{const q=panel.querySelector('input').value.toLowerCase();panel.querySelector('div').innerHTML=users.filter(u=>(u.full_name+' '+u.email).toLowerCase().includes(q)).map(u=>'<button data-select138="'+esc(u.id)+'">'+esc(u.full_name||u.email)+'</button>').join('')||'<p>No active sub-users.</p>';panel.querySelectorAll('[data-select138]').forEach(b=>b.onclick=()=>enter(b.dataset.select138));};panel.querySelector('input').oninput=draw;draw();panel.querySelector('input').focus();}
async function assistedAudit(){const host=$('transactions-voided');if(!host||liveProfile?.role!=='admin'||document.querySelector('.tab-content.active')?.id!==host.id)return;let panel=$('assistedAudit138');if(!panel){panel=document.createElement('section');panel.id='assistedAudit138';panel.className='je-card';host.append(panel);}const actor=liveProfile.id;const result=await ojmDb.from('workspace_actor_audit138').select('*').order('created_at',{ascending:false}).limit(100);if(liveProfile?.id!==actor||!panel.isConnected)return;const name=id=>liveProfiles.find(u=>u.id===id)?.full_name||id;panel.innerHTML='<h3>Administrator-assisted account activity</h3>'+ (result.error?'<p>Install the v138 SQL update to see assisted-account audit records.</p>':'<div class="table-container"><table><thead><tr><th>Date</th><th>Administrator</th><th>Acting for</th><th>Action</th><th>Record</th></tr></thead><tbody>'+((result.data||[]).map(r=>'<tr><td>'+esc(new Date(r.created_at).toLocaleString())+'</td><td>'+esc(name(r.actor_id))+'</td><td>'+esc(name(r.effective_user_id))+'</td><td>'+esc(r.operation)+'</td><td>'+esc([r.table_name,r.row_id].filter(Boolean).join(' · '))+'</td></tr>').join('')||'<tr><td colspan="5">No assisted-account activity yet.</td></tr>')+'</tbody></table></div>');}
function ready(){window.addEventListener('page113',()=>{badge();assistedAudit();});const before=loadLiveProfile;loadLiveProfile=async function(user){if(ctx.target)user={...user,id:ctx.target};return before(user);};
 const oldLogout=logoutDemoUser;logoutDemoUser=async function(...args){ctx.target=null;ctx.actor=null;saved=null;badge();return oldLogout(...args);};
 document.addEventListener('click',e=>{if(ctx.target&&e.target.closest('[onclick*="logoutDemoUser"],[onclick*="switchAccount"]')){e.preventDefault();e.stopImmediatePropagation();menu();}},true);
 workflow136.decorate();}
window.workspace138={menu,enter,restore,badge,get active(){return !!ctx.target;}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
