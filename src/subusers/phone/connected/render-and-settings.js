function snapshot(){if(S.module==='subusers')return JSON.stringify([A.session(),A.workspaceUsers(),S.user?A.workspaceState(S.user):null,S.user?A.funds(S.user):null,A.reports(S.user),S.module,S.page,S.user,S.search,S.month,S.entryMonth14237]);return JSON.stringify([A.profile()?.id,A.workspaceUsers(),A.settingsUsers(),A.accounts(),A.journals(),A.reports(S.user),A.reminders(),S.user?A.funds(S.user):null,A.dashboard().state.mappings,A.dashboard().state.month,A.dashboard().state.currency,S.module,S.page,S.search,S.review,S.month])}
function refresh(force=false){
 if(!A.ready()){
  // Hide and discard any previous identity immediately, including an open picker.
  document.documentElement.dataset.phoneReady14288='false';
  if(!A.profile()||draftOwner1427!==A.profile().id||phoneSession14225!==A.session()){
   workspaceOpen14238++;navigationPending14285=false;draftOwner1427='';last='';renderedLocation14250=null;
   window.PhoneAccountPicker14227?.close(false,false);closeAccount1424();
   document.querySelectorAll('main.screen').forEach(n=>n.replaceChildren());$('phoneUserTabs14236')?.replaceChildren();
  }
  return;
 }
 if(!phoneLayoutReady14285)return;
 if(draftOwner1427!==A.profile().id||phoneSession14225!==A.session()){workspaceOpen14238++;navigationPending14285=false;ensurePhoneOwner1427();navigate(S.module,S.page,false,true);return}
 if(navigationPending14285)return;
 const visible=document.querySelector('main.screen:not(.hidden)');
 if(!visible?.childElementCount){initializePhone1425();return}
 if(document.documentElement.dataset.phoneReady14288!=='true'){if(render())phoneLoading14285(false);return}
 if(S.module==='subusers'&&S.page==='ledger')return;
 if(document.getElementById('phoneAccountPicker14227')||busy||(!force&&S.page==='post'&&document.querySelector('#post .staff-editor14225'))||(!force&&S.journalForm))return;
 const signature=snapshot();if(force||signature!==last)render()
}
window.phoneRefresh132=()=>{try{refresh()}catch(error){reportRenderError14250(error)}};window.phoneSelection14237=()=>({module:S.module,user:S.user,page:S.page});
function pageAllowed1441(){if(!['subusers','settings'].includes(S.module))return false;const pages={settings:['home','users','access','profile'],dashboard:['home','finance','people','operation','compliance','documents'],subusers:['home','accounts','post','entries','history','ledger'],accounts:['ledger','trial','balances','chart'],transactions:['journal','history','review','upcoming','closing','audit']};if(!pages[S.module]?.includes(S.page))return false;if(S.module==='settings')return S.page==='profile'||A.profile()?.role==='admin'&&A.allowed('settings-users');if(S.module==='dashboard')return A.allowed('dashboard');if(S.module==='subusers')return S.user?A.allowed('sub-users-workspace')&&A.users().some(u=>String(u.id)===String(S.user)):A.teamHomeAllowed();const target=S.module==='accounts'?({ledger:'sec-general-ledger',trial:'trial-balance',balances:'account-balances',chart:'sec-chart-accounts'}[S.page]):S.module==='transactions'?({journal:'journal',audit:'transactions-voided',history:'transactions-all',upcoming:'transactions-recurring',review:'user-entry-review',closing:'period-review'}[S.page]):null;return !!target&&A.allowed(target)}
let renderedLocation14250=null,renderError14250='';
function reportRenderError14250(error){const message=error?.message||String(error);console.error('Phone workspace render failed',error);if(renderError14250!==message){renderError14250=message;parent.showCenterStatus('This view could not update. Please try opening the tab again.',true);}}
function render(){
 if(!A.profile()||!ensurePhoneOwner1427())return false;
 const previousActions=actions,identity=A.session();let committed=false;
 const id=S.module==='settings'?'settings-'+S.page:S.module==='dashboard'?'dash-'+S.page:S.module==='transactions'?'tx-'+S.page:S.module==='accounts'?'acc-'+S.page:!S.user?'workspace-home':S.page,root=$(id);
 if(!root)return false;
 try{
  rememberPhonePosition14285();
  const open=[...document.querySelectorAll('details[open][data-key]')].map(n=>n.dataset.key);
  actions=[];
  const html=!pageAllowed1441()?empty('This area is not included in your permissions.'):S.module==='settings'?settings():S.module==='dashboard'?dashboard():S.module==='accounts'?accounts():S.module==='transactions'?transactions():subusers();
  const signature=snapshot();
  // Keep the existing DOM and its callbacks together until replacement content is ready.
  const keepTeam=S.module==='subusers'&&!S.user&&root.querySelector('#phoneTeam14227')?._team14227;
  if(!keepTeam)root.innerHTML=html;committed=true;
  document.querySelectorAll('main.screen').forEach(n=>n.classList.toggle('hidden',n!==root));
  renderedLocation14250={session:identity,module:S.module,page:S.page,user:S.user};nav();
  root.querySelectorAll('[data-key]').forEach(n=>{if(open.includes(n.dataset.key))n.open=true});
  if(S.module==='subusers'&&A.teamHomeAllowed()&&!S.user){if(!keepTeam){parent.TeamHome14227?.mount(root.querySelector('#phoneTeam14227'),{phone:true,onUser:id=>chooseWorkspace(id),onReview:id=>{if(id)A.compare(id)},onAccess:()=>navigate('settings','users')});const team=root.querySelector('#phoneTeam14227')?._team14227;if(team&&phoneDrafts1427.ui.team)Object.assign(team.state,phoneDrafts1427.ui.team);}parent.TeamHome14227?.notify();}
  if(S.module==='subusers'&&S.page==='ledger'&&S.user){parent.AssignedLedger14281?.mount(root.querySelector('#assignedPhoneLedger14281'),S.user);const title=root.querySelector('.assigned-ledger14281 h3');if(title)title.textContent='Assigned Account Ledger';}
  bindInputs();restorePhonePosition14285(root);last=signature;persistPhoneDraft1427();paintSaveErrors14234();renderError14250='';document.documentElement.dataset.phoneReady14288='true';return true;
 }catch(error){
  if(!committed){actions=previousActions;if(renderedLocation14250?.session===identity){const {module,page,user}=renderedLocation14250;Object.assign(S,{module,page,user});}}
  reportRenderError14250(error);
  return false;
 }
}

function settings(){const me=A.profile(),admin=A.allowed('settings-users','edit'),users=parent.UserAdmin14253?parent.UserAdmin14253.visible(A.settingsUsers()):A.settingsUsers();
const edit=(id,section)=>A.editUser(id,section);
if(S.page==='profile')return head('My Profile','Account and security')+`<div class="card"><div class="row"><span class="round">${icon('people')}</span><div><h2>${esc(me.full_name||'My account')}</h2><small>${esc(me.email||'')}</small></div></div><p>${esc(me.role==='admin'?'Administrator':me.role||'User')}</p></div><div class="card"><h2>Password & sign-in</h2><p>Send a recovery link to your account email.</p>${button('Send password reset',()=>{if(confirm('Send a password-reset email to your account?'))return A.resetOwnPassword()},true)}</div>${button('Sign out',()=>{if(confirm('Sign out of Oon Jai?'))return A.logout()})}`;
if(!admin)return head('Settings')+row('My Profile','Account and password','',()=>settingsGo('profile'),'people')+empty('User permissions and account assignments are managed by your administrator.');
if(S.page==='home')return head('Settings','Manage access and account assignments')+`<div class="card hero"><small>Access management</small><strong>${users.length} ${users.length===1?'user':'users'}</strong><small>Administrator</small></div>`+row('Users','Details, permissions and assigned accounts','',()=>settingsGo('users'),'people')+row('My Profile','Account and password','',()=>settingsGo('profile'),'people')+`<p class="settings-note133">Full accounting, backup and recovery settings are available on your laptop or tablet.</p>`;
return head('Users','Manage details, permissions and assigned accounts')+button('Add sub-user',()=>edit(''),true)+button('Report Types',()=>parent.Reports14253.manage())+button(parent.UserAdmin14253?.inactive?'Show active users':'Show inactive users',()=>{parent.UserAdmin14253.toggle();render()})+`<div class="search"><input id="liveSearch" aria-label="Search users" placeholder="Search name or email…" value="${esc(S.search)}"></div>`+users.filter(u=>(u.full_name+' '+u.email).toLowerCase().includes(S.search.toLowerCase())).map(u=>{const p=u.user_permissions||{};return `<div class="card settings-user133"><div class="row"><span class="round">${icon('people')}</span><div class="desc"><h2>${esc(u.full_name||'Unnamed user')}</h2><small>${esc(u.email||'')}</small></div><span class="badge">${esc(u.role==='admin'?'Administrator':p.user_type==='manager'?'Manager':'Sub-user')}</span></div><p>${esc(p.job_title||'')}${p.job_title?' · ':''}${esc(u.status||'')}</p><div class="actions">${button('✎ Edit',()=>edit(u.id),true)}${A.profile().role==='admin'?button(u.status==='active'?'Deactivate':'↻ Reactivate',()=>parent.UserAdmin14253.change(u.id,u.status==='active'?'deactivate':'reactivate'),false,u.id===A.profile().id)+button('Delete',()=>parent.UserAdmin14253.change(u.id,'delete'),false,u.status==='active'||u.id===A.profile().id):''}</div></div>`}).join('')||empty('No users match your search.')}

