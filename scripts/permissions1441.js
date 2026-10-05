/* Client permission boundaries. Database RLS/RPC authorization is still required. */
(()=>{'use strict';
const can=(target,action='view')=>window.access113?.can(target,action)===true;
const deny=()=>{showCenterStatus('This action is not included in your permissions.',true);return false};
const modalTargets={modalAccount:'sec-chart-accounts',modalSubAccount:'sec-sub-accounts',modalUserAccess:'settings-users',modalAccessPicker:'settings-users'};
function ready(){
 const bindings={openAddAccountModal:['sec-chart-accounts','edit'],openEditAccountModal:['sec-chart-accounts','edit'],handleAccountFormSubmit:['sec-chart-accounts','edit'],openAddSubAccountModal:['sec-sub-accounts','edit'],openEditSubAccountModal:['sec-sub-accounts','edit'],handleSubAccountFormSubmit:['sec-sub-accounts','edit'],openUserAccessEditor:['settings-users','edit'],saveUserAccess:['settings-users','edit'],exportJournalCSV:['journal','export']};
 for(const [name,[target,action]] of Object.entries(bindings)){const previous=window[name];if(typeof previous!=='function')continue;window[name]=function(...args){if(!can(target,action)){args[0]?.preventDefault?.();return deny()}return previous.apply(this,args)}}
 const saveAccess=window.saveUserAccess;let savingAccess=false;window.saveUserAccess=async function(event){event?.preventDefault?.();if(savingAccess||!can('settings-users','edit'))return false;savingAccess=true;const owner=liveProfile.id,button=document.querySelector('#userAccessForm [type=submit]');if(button)button.disabled=true;try{return await saveAccess.apply(this,arguments)}catch(error){if(liveProfile?.id===owner){const status=document.getElementById('userAccessStatus');if(status)status.textContent='The access operation or refresh was interrupted. Reload Users to confirm the saved settings before retrying. '+(error.message||'');showCenterStatus('User access result needs confirmation. Reload Users before retrying.',true)}}finally{savingAccess=false;if(button)button.disabled=false}};
 const open=window.openModal;window.openModal=function(id,...args){const target=modalTargets[id];if(target&&!can(target,'edit'))return deny();return open.call(this,id,...args)};
 document.addEventListener('submit',e=>{const target=modalTargets[e.target.closest('.modal-backdrop')?.id];if(target&&!can(target,'edit')){e.preventDefault();e.stopImmediatePropagation();deny()}},true);
 const switchBefore=window.switchTab;window.switchTab=function(target,...args){if(!window.canAccessAppTarget(target)){deny();return false}return switchBefore.call(this,target,...args)};
 // Close editors and clear the visible protected panel when permission is revoked.
 let signature='';function refresh(){if(window.permissions1441?.reconnecting)return;const next=JSON.stringify([window.permissions1441?.verified,typeof liveProfile==='undefined'?null:liveProfile,typeof livePermission==='undefined'?null:livePermission]);if(next===signature)return;signature=next;
  for(const [id,target] of Object.entries(modalTargets)){const node=document.getElementById(id);if(node&&!can(target,'edit'))window.closeModal(id)}
  const active=document.querySelector('.tab-content.active'),target=window.access113.currentTarget();
  if(active&&!can(target)){active.classList.remove('active');const fallback=typeof firstPermittedAppTarget==='function'?firstPermittedAppTarget():'';if(fallback){if(fallback.startsWith('sec-'))scrollToAccountModule(fallback);else window.switchTab(fallback)}}
  window.applyGranularPermissionAccess?.();window.access113.enforce();
 }
 window.addEventListener('page113',refresh);let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}).observe(document.body,{childList:true,subtree:true});
 let verification=null,retryTimer=null;
 function reconnect(show,message='The connection was interrupted. Rechecking your access…'){
  window.permissions1441.reconnecting=show;let box=document.getElementById('sessionReconnect14233');
  if(show&&!box){box=document.createElement('section');box.id='sessionReconnect14233';box.className='session-reconnect14233';box.setAttribute('role','alertdialog');box.setAttribute('aria-modal','true');box.innerHTML='<div><h2>Reconnecting</h2><p></p><button type="button" data-retry>Retry now</button><button type="button" data-signout>Sign out</button></div>';document.body.append(box);box.querySelector('[data-retry]').onclick=()=>verify();box.querySelector('[data-signout]').onclick=()=>logoutDemoUser();}
  if(box){box.hidden=!show;box.querySelector('p').textContent=message;}
  const layout=document.querySelector('.app-layout');if(layout){if(show){if(!layout.inert)layout.dataset.reconnectInert14233='1';layout.inert=true}else if(layout.dataset.reconnectInert14233){layout.inert=false;delete layout.dataset.reconnectInert14233}}
 }
 const logoutBefore=window.logoutDemoUser;window.logoutDemoUser=function(...args){clearTimeout(retryTimer);reconnect(false);return logoutBefore.apply(this,args)};

 async function verify(){
  const id=typeof liveProfile==='undefined'?null:liveProfile?.id,epoch=typeof sessionEpoch1430==='undefined'?0:sessionEpoch1430;if(!id||!ojmDb||window.workspaceRequest138?.busy){if(!id)reconnect(false);return;}const current=()=>liveProfile?.id===id&&(typeof sessionEpoch1430==='undefined'||epoch===sessionEpoch1430);
  if(verification)return verification;
  verification=(async()=>{try{
   let timeout;const r=await Promise.race([ojmDb.rpc('current_access14228'),new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Connection timed out.')),12000))]).finally(()=>clearTimeout(timeout));if(r.error)throw Object.assign(new Error(r.error.message),r.error,{status:r.status||r.error.status});
   if(!current())return;
   if(r.data?.profile?.id!==id||r.data.profile.status!=='active')throw Object.assign(Error('This account is inactive or no longer permitted.'),{code:'ACCESS_REVOKED'});
   const changed14229=JSON.stringify([liveProfile,livePermission])!==JSON.stringify([r.data.profile,r.data.permissions]);liveProfile=r.data.profile;livePermission=r.data.permissions;if(changed14229){window.Organization14229?.invalidate();window.PrivateReminders14229?.invalidate();}
   const self=liveProfiles.find(u=>u.id===id);if(self)Object.assign(self,liveProfile,{user_permissions:livePermission});
   window.permissions1441.verified=true;clearTimeout(retryTimer);reconnect(false);
   refresh();
   await window.Organization14229?.revalidate();
   if(!can('document-editor105','view')||!can('document-editor105','export')){
    document.getElementById('reportHistory1443')?.replaceChildren();
    // A loaded saved report must be cleared when its current source/module access is removed.
    if(!can('sub-users-workspace','view')&&!can('user-entry-review','view')){
     window.documentWorkspace105?.revokeAccess14228?.();
    }
   }
  }catch(e){if(!current())return;
   window.permissions1441.verified=false;
   const denied=['42501','ACCESS_REVOKED','PGRST301','PGRST302'].includes(e.code)||[401,403].includes(Number(e.status));
   if(denied){reconnect(false);document.getElementById('loginGate')?.classList.remove('is-authenticated');await logoutDemoUser();const error=document.getElementById('loginError');if(error)error.textContent='Please sign in again. '+(e.message||'Access is no longer available.');}
   else{reconnect(true,'Your sign-in is being kept while the connection is checked. Protected actions are paused. '+(e.message||''));clearTimeout(retryTimer);retryTimer=setTimeout(verify,5000);}
  }finally{verification=null}})();return verification;
 }
 window.permissions1441={refresh,verify,verified:true,reconnecting:false};refresh();
 window.addEventListener('online',verify);window.addEventListener('focus',verify);document.addEventListener('visibilitychange',()=>{if(!document.hidden)verify()});
 setInterval(()=>{if(!document.hidden)verify()},30000);verify();
}
document.addEventListener('DOMContentLoaded',ready,{once:true});
})();
