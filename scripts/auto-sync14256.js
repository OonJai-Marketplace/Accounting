/* Retry complete, account-scoped saves through the existing idempotent sync path. */
(()=>{'use strict';
let timer,due=0,busy=false,delay=5000,owner='';
const actor=()=>typeof liveProfile!=='undefined'?liveProfile?.id||'':'';
function schedule(ms=1000){const next=Date.now()+ms;if(timer&&due<=next)return;clearTimeout(timer);due=next;timer=setTimeout(run,ms)}
async function run(){
 clearTimeout(timer);timer=null;const id=actor(),api=window.offline14239;
 if(id!==owner){owner=id;delay=5000}
 if(!id||!api||navigator.onLine===false){schedule(15000);return}
 const s=api.state();if(busy||s.syncing){schedule(5000);return}
 if(!s.pending){delay=5000;schedule(15000);return}
 busy=true;
 try{await api.sync();if(actor()===id)delay=api.state().pending?Math.min(delay*2,300000):5000}
 catch{delay=Math.min(delay*2,300000)}
 finally{busy=false;schedule(delay)}
}
window.addEventListener('online',()=>{delay=5000;schedule(250)});
window.addEventListener('connection14239',()=>{if(!busy)schedule(delay)});
window.addEventListener('storage',()=>{if(!busy)schedule(1000)});
window.addEventListener('page113',()=>{if(actor()!==owner)schedule(500)});
window.addEventListener('offline',()=>{clearTimeout(timer);timer=null});
window.autoSync14256={run};schedule(1000);
})();
