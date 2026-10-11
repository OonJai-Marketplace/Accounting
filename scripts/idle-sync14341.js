/* Pause automatic work between complete records; explicit saves retain their server checks. */
(()=>{'use strict';
const delay=120000;let last=Date.now(),timer,wasIdle=false,manual=false,preparation='',problem='',retry,channel;
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const allowed=()=>Date.now()-last>=delay;
function announce(){const idle=allowed();if(idle&&!wasIdle)window.dispatchEvent(new Event('idle-sync14341'));wasIdle=idle;paint();}
function arm(){clearTimeout(timer);timer=setTimeout(announce,Math.max(20,delay-(Date.now()-last)));}
let broadcastAt=0;
function activity(remote=false){last=Date.now();if(wasIdle){wasIdle=false;paint();}arm();if(!remote&&last-broadcastAt>1000){broadcastAt=last;channel?.postMessage({type:'activity',actor:actor()});}}
try{channel=new BroadcastChannel('ojm-idle14341');channel.onmessage=e=>{if(e.data?.type==='activity'&&e.data.actor===actor())activity(true)}}catch{}
for(const type of ['pointerdown','pointermove','keydown','wheel','touchstart','scroll'])document.addEventListener(type,()=>activity(),{capture:true,passive:true});
window.addEventListener('focus',()=>activity());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)activity()});
async function syncNow(){if(manual)return;manual=true;problem='';paint();try{await window.localFirst14333?.sync();await window.offline14239?.sync();await window.startup14257?.revalidate?.(true)}catch(e){problem=e.message}finally{manual=false;paint()}}
function paint(){const footer=document.querySelector('#appSidebar #topHeaderProfile104,#sidebar .sidebar-user-footer,.sidebar .sidebar-user-footer,#sidebar #topHeaderProfile104,.sidebar #topHeaderProfile104')||document.querySelector('.sidebar-user-footer');if(!footer||!actor())return;let box=document.getElementById('syncStatus14341');if(!box){box=document.createElement('section');box.id='syncStatus14341';box.className='no-print';box.innerHTML='<p role="status" aria-live="polite"></p><button type="button" class="je-btn je-btn-secondary">Sync now</button>';footer.before(box)}const state=window.offline14239?.state()||{},busy=manual||state.syncing||window.localFirst14333?.syncing||window.startup14257?.preparing;
const message=preparation||problem||(busy?(allowed()||manual?'Syncing…':'Pausing after the current batch…'):!state.online?'Offline · saved work stays on this device':state.attention?'Saved work needs attention':state.pending?'Saved on device · waiting for 2 minutes idle':window.startup14257?.prepared?(state.shellReady?'Ready · automatic sync after 2 minutes idle':'Records ready · website files still preparing'):'Saved workspace · awaiting verification');const p=box.querySelector('p');if(p.textContent!==message)p.textContent=message;const b=box.querySelector('button');b.textContent=retry?'Retry download':'Sync now';b.disabled=busy&&!retry;b.onclick=retry||syncNow;
}
window.idleSync14341={allowed,remaining:()=>Math.max(0,delay-(Date.now()-last)),syncNow,paint,preparation(message,again){preparation=message;retry=again;paint()},get automatic(){return !manual}};
for(const name of ['connection14239','local-work14333','page113'])window.addEventListener(name,paint);
setInterval(()=>{if(allowed()){window.dispatchEvent(new Event('idle-sync14341'));paint()}},60000);arm();
})();
