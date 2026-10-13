/* TeamHome owns the single header navigation; retain legacy tabs only as internal state. */
(()=>{'use strict';
 function ready(){const tabs=document.getElementById('subUserWorkspaceTabs');if(tabs){tabs.hidden=true;tabs.setAttribute('aria-hidden','true')}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
