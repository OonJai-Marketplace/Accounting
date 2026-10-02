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
 let signature='';function refresh(){const next=JSON.stringify([typeof liveProfile==='undefined'?null:liveProfile,typeof livePermission==='undefined'?null:livePermission]);if(next===signature)return;signature=next;
  for(const [id,target] of Object.entries(modalTargets)){const node=document.getElementById(id);if(node&&!can(target,'edit'))window.closeModal(id)}
  const active=document.querySelector('.tab-content.active'),target=window.access113.currentTarget();
  if(active&&!can(target)){active.classList.remove('active');const fallback=typeof firstPermittedAppTarget==='function'?firstPermittedAppTarget():'';if(fallback){if(fallback.startsWith('sec-'))scrollToAccountModule(fallback);else window.switchTab(fallback)}}
  window.applyGranularPermissionAccess?.();window.access113.enforce();
 }
 window.addEventListener('page113',refresh);let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}).observe(document.body,{childList:true,subtree:true});
 window.permissions1441={refresh};refresh();
}
document.addEventListener('DOMContentLoaded',ready,{once:true});
})();
