/* V54 continuity and final workbench interaction fixes. */
(function(){
  'use strict';
  const activeModule=()=>document.querySelector('.tab-content.active')?.id||localStorage.getItem('ojm_last_active_view_v1')||'dashboard';
  const syncShell=target=>document.body.classList.toggle('subusers-workspace-active',(target||activeModule())==='sub-users-workspace');

  const beforeSwitch=window.switchTab;
  window.switchTab=function(target,...args){const result=beforeSwitch.call(this,target,...args);syncShell();return result};

  // The legacy location writer had no restore caller; remove its synchronous writes and no-op wrappers.
  const beforeLogout=window.logoutDemoUser;
  window.logoutDemoUser=async function(){document.body.classList.remove('subusers-workspace-active');return beforeLogout()};

  document.addEventListener('keydown',event=>{
    const row=event.target.closest?.('[data-open-workspace-user]');
    if(row&&(event.key==='Enter'||event.key===' ')){event.preventDefault();window.openWorkspaceUser(row.dataset.openWorkspaceUser)}
  });
  document.addEventListener('pointerdown',event=>{
    if(event.target.closest?.('.sub-user-search-wrap'))return;
    const results=document.getElementById('subUserSearchResults');if(results)results.hidden=true;
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncShell(),{once:true});else syncShell();
})();
