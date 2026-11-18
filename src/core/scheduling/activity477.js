/* One timer for actual deadlines. No interval, idle polling or network work. */
(()=>{'use strict';
 const jobs=new Map();let timer=null,running=false;
 function arm(){
  if(timer!==null)clearTimeout(timer);timer=null;
  if(running||document.hidden||!jobs.size)return;
  const next=Math.min(...[...jobs.values()].map(job=>job.at));
  timer=setTimeout(flush,Math.max(0,Math.min(next-Date.now(),2147483647)));
 }
 function flush(){
  if(running)return;if(document.hidden){arm();return;}
  running=true;const now=Date.now();
  try{for(const [key,job] of [...jobs]){
   if(job.at>now||jobs.get(key)!==job)continue;
   jobs.delete(key);
   try{job.run();}catch(error){console.error('Scheduled application action failed',error);}
  }}finally{running=false;arm();}
 }
 function at(key,time,run){const value=Number(time);if(!Number.isFinite(value)){cancel(key);return;}jobs.set(key,{at:value,run});arm();}
 function cancel(key){jobs.delete(key);arm();}
 const accessChanged=()=>window.dispatchEvent(new Event('account-access477'));
 const changed=group=>window.dispatchEvent(new CustomEvent('workspace-data477',{detail:{group}}));
 window.activity477={at,cancel,accessChanged,changed};
 // The existing gate owns session visibility. Observe its class only, not the app DOM.
 function ready(){const gate=document.getElementById('loginGate');if(!gate)return;let previous=gate.className;
  new MutationObserver(()=>{if(previous===gate.className)return;previous=gate.className;accessChanged();}).observe(gate,{attributes:true,attributeFilter:['class']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 document.addEventListener('visibilitychange',()=>document.hidden?arm():flush());
 window.addEventListener('pageshow',flush);window.addEventListener('focus',flush);
 window.addEventListener('pagehide',()=>{if(timer!==null)clearTimeout(timer);timer=null;});
})();
