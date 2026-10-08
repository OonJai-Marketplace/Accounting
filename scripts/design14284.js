/* Presentation-only enhancements; handlers and financial values stay attached. */
(()=>{'use strict';
 function decorate(){
  const root=document.querySelector('.tab-content.active');if(!root)return;
  root.querySelectorAll('table').forEach(table=>{
   const headers=[...table.querySelectorAll('thead tr:first-child th')].map(n=>n.textContent.trim().toLowerCase());
   if(headers.length===6&&headers[0]==='payroll code'&&headers[1]==='name')table.classList.add('employee-table14284');
  });
  root.querySelectorAll('.settings-field input[type=number],.settings-field input[data-numeric88]').forEach(input=>{if(!input.closest('.money-field14231')&&!input.matches('[data-compact-number14284]'))input.setAttribute('data-compact-number14284','')});
  root.querySelectorAll('[data-print14282]').forEach(button=>{
   if(button.closest('.section-heading14284'))return;
   const scope=document.getElementById(button.dataset.print14282);if(!scope)return;
   if(scope.id==='sec-sub-accounts'){const header=scope.querySelector('.card-header-flex');if(header){let actions=header.querySelector('.subaccount-actions14294');if(!actions){actions=document.createElement('div');actions.className='subaccount-actions14294';header.append(actions)}const add=scope.querySelector('[onclick="openAddSubAccountModal()"]');if(add&&add.parentElement!==actions)actions.prepend(add);if(button.parentElement!==actions)actions.append(button);return}}
   const heading=[...scope.querySelectorAll('h2,h3,h4')].find(n=>!n.closest('.area-banner113,.modal-backdrop,form'));
   if(!heading)return;
   let header=heading.parentElement.matches('header,.je-card-header,.r79-header')?heading.parentElement:null;
   if(!header){const intro=heading.parentElement;header=document.createElement('div');heading.before(header);header.append(heading);if(intro.parentElement?.matches('header,.card-header-flex'))intro.classList.add('section-intro14284')}
   header.classList.add('section-heading14284');header.append(button);
  });
 }
 function ready(){let pending=false;const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;decorate()})};new MutationObserver(schedule).observe(document.querySelector('.workspace-scroll')||document.body,{subtree:true,childList:true});window.addEventListener('page113',schedule);decorate()}
 const logout=window.logoutDemoUser;window.logoutDemoUser=async function(...args){window.status118?.clear?.();try{return await logout.apply(this,args)}finally{window.status118?.clear?.();document.getElementById('workspaceContext14284')?.remove()}};
 window.endExpiredSession14284=async function(){window.clearLoginNotice14293?.();window.status118?.clear?.();SessionTimeoutManager.hideWarning();try{await logoutDemoUser()}finally{window.status118?.clear?.();showLoginForm('');document.getElementById('loginGate')?.classList.remove('is-authenticated');window.releaseLogin1443?.();}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
