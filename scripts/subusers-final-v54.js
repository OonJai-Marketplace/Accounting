/* V54 continuity and final workbench interaction fixes. */
(function(){
  'use strict';
  const key='ojm_workspace_location_v54';
  let restoring=false;
  const read=()=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const save=(extra={})=>{
    if(!window.liveProfile&&!document.getElementById('loginGate')?.classList.contains('is-authenticated'))return;
    const old=read()||{};
    localStorage.setItem(key,JSON.stringify({...old,...extra,openTabs:Array.isArray(openSubUserTabs)?openSubUserTabs:[],activeSubUserId,updatedAt:new Date().toISOString()}));
  };
  const activeModule=()=>document.querySelector('.tab-content.active')?.id||localStorage.getItem('ojm_last_active_view_v1')||'dashboard';
  const syncShell=target=>document.body.classList.toggle('subusers-workspace-active',(target||activeModule())==='sub-users-workspace');

  const beforeSwitch=window.switchTab;
  window.switchTab=function(target){const result=beforeSwitch(target);syncShell(target);save({module:target});return result};

  const beforeActivate=window.activateSubUserTab;
  window.activateSubUserTab=function(tabKey){const result=beforeActivate(tabKey);save({module:'sub-users-workspace'});return result};
  const beforeOpen=window.openWorkspaceUser;
  window.openWorkspaceUser=function(userId){const result=beforeOpen(String(userId));save({module:'sub-users-workspace'});return result};
  const beforeClose=window.closeSubUserWorkspace;
  window.closeSubUserWorkspace=function(event,tabKey){const result=beforeClose(event,tabKey);save({module:'sub-users-workspace'});return result};
  const beforeAdd=window.addSubUserTab;
  window.addSubUserTab=function(){const result=beforeAdd();save({module:'sub-users-workspace'});return result};
  const beforeView=window.v49SetView;
  window.v49SetView=function(userId,view){const result=beforeView(userId,view);const state=read()||{},views=state.views||{};views[String(userId)]=view;save({module:'sub-users-workspace',views});return result};

  function restore(){
    const state=read();
    if(!state||restoring)return;
    if(Array.isArray(state.openTabs)&&state.openTabs.length){openSubUserTabs=state.openTabs;activeSubUserId=state.activeSubUserId||state.openTabs[0]?.key||'default'}
    if(state.module==='sub-users-workspace'){
      restoring=true;
      window.switchTab('sub-users-workspace');
      window.renderSubUserWorkspace();
      const tab=typeof activeSubUserTab==='function'?activeSubUserTab():null,view=tab?.userId&&state.views?.[String(tab.userId)];
      if(view)beforeView(tab.userId,view);
      restoring=false;
    }
    syncShell(state.module);
  }

  const beforeHydrate=window.hydrateSupabaseSession;
  window.hydrateSupabaseSession=async function(session){await beforeHydrate(session)};
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
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save({module:activeModule()})});
  window.addEventListener('pagehide',()=>save({module:activeModule()}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>syncShell(),{once:true});else syncShell();
})();
