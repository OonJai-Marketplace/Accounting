/* Reuse the existing user tabs in the header; their original actions and styling stay intact. */
(()=>{'use strict';
 function ready(){
  const header=document.querySelector('.module-header .header-left-tools');
  const tabs=document.getElementById('subUserWorkspaceTabs');
  if(!header||!tabs)return;
  const holder=document.createElement('div');holder.className='workspace-header14266';
  holder.append(tabs);header.append(holder);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
