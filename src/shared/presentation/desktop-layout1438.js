/* Banner collapse is scoped to the desktop sub-user workspace. */
(()=>{'use strict';let expanded=false;
 function paint(){const active=document.getElementById('sub-users-workspace')?.classList.contains('active'),desktop=innerWidth>=1025&&document.documentElement.dataset.device132!=='phone';
  document.body.classList.toggle('subuser-expanded1438',!!(active&&desktop&&expanded));
  if(!desktop)return;
  const header=document.querySelector('#subUserWorkspacePanel .v49-desktop-user-actions');if(!header)return;
  let b=header.querySelector('.workspace-expand1438');if(!b){b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary workspace-expand1438';header.append(b);b.onclick=()=>{expanded=!expanded;paint();document.querySelector('.v49-desktop-user-heading')?.scrollIntoView({block:'start',behavior:'smooth'})};}
  const text=expanded?'↙ Restore banner':'↗ Expand dashboard';if(b.textContent!==text)b.textContent=text;b.setAttribute('aria-pressed',String(expanded));b.title=expanded?'Show the upper banner':'Hide the upper banner and use this account heading';
 }
 function ready(){let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint()})}).observe(document.getElementById('subUserWorkspacePanel'),{childList:true,subtree:true});window.addEventListener('page113',paint);window.addEventListener('resize',paint);paint();}
 if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
