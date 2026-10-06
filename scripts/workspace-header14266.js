/* Show the active workspace beside the navigation control; retain the original tab actions. */
(()=>{'use strict';
 let host,trigger,menu,tabs,scheduled=false;
 function close(){if(!menu)return;menu.hidden=true;trigger.setAttribute('aria-expanded','false')}
 function refresh(){scheduled=false;
  tabs=document.getElementById('subUserWorkspaceTabs');
  if(!tabs||!host)return;
  const names=[...tabs.querySelectorAll('.sub-user-browser-tab')],current=names.find(n=>n.classList.contains('active'))||names[0];
  trigger.querySelector('span').textContent=current?.querySelector('span')?.textContent?.trim()||'Workspace';
  menu.replaceChildren();
  names.forEach((tab,i)=>{
   const item=document.createElement('div');item.className='workspace-choice14266';
   const select=document.createElement('button');select.type='button';select.textContent=tab.querySelector('span')?.textContent?.trim()||`Workspace ${i+1}`;
   select.setAttribute('role','menuitem');if(tab===current)select.setAttribute('aria-current','page');
   select.onclick=()=>{close();tab.click()};item.append(select);
   const oldClose=tab.querySelector('.sub-user-tab-close');
   if(oldClose){const remove=document.createElement('button');remove.type='button';remove.className='workspace-close14266';remove.textContent='×';remove.setAttribute('aria-label','Close '+select.textContent);remove.onclick=()=>{close();oldClose.click()};item.append(remove)}
   menu.append(item);
  });
 }
 function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(refresh)}}
 function ready(){const header=document.querySelector('.module-header .header-left-tools');tabs=document.getElementById('subUserWorkspaceTabs');if(!header||!tabs)return;
  host=document.createElement('div');host.className='workspace-header14266';
  trigger=document.createElement('button');trigger.type='button';trigger.className='workspace-trigger14266';trigger.setAttribute('aria-haspopup','menu');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-label','Choose user workspace');trigger.innerHTML='<span>Workspace</span><i aria-hidden="true">⌄</i>';
  menu=document.createElement('div');menu.className='workspace-menu14266';menu.id='workspaceMenu14266';menu.setAttribute('role','menu');menu.hidden=true;trigger.setAttribute('aria-controls',menu.id);
  trigger.onclick=()=>{menu.hidden=!menu.hidden;trigger.setAttribute('aria-expanded',String(!menu.hidden))};host.append(trigger,menu);header.append(host);
  new MutationObserver(schedule).observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('pointerdown',e=>{if(!host.contains(e.target))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('page113',()=>{close();schedule()});refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
