/* Saved negative-fund events only. No balance polling, timers or workspace reload. */
(()=>{'use strict';
let session=null;
const allowed=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin'&&
 window.access113?.can('sub-users-home14229')===true;
const current=s=>session===s&&allowed()&&liveProfile.id===s.actor&&ojmDb===s.client;
const money=(n,c)=>({LAK:'₭',USD:'$',THB:'฿'}[c]||c+' ')+Number(n).toLocaleString('en-US',{minimumFractionDigits:c==='LAK'?0:2,maximumFractionDigits:2});
function stop(clear=true){
 const s=session;if(!s)return;
 if(s.channel){const channel=s.channel;s.channel=null;void s.client.removeChannel(channel);}
 if(clear){session=null;window.refreshNotices1443?.();}
}
function accept(s,row){
 if(!current(s)||!row?.owner_id||!Array.isArray(row.deficits))return false;
 const old=s.rows.get(row.owner_id);
 if(old&&Number(old.revision)>Number(row.revision))return false;
 if(old&&JSON.stringify(old)===JSON.stringify(row))return false;
 s.rows.set(row.owner_id,row);return true;
}
async function load(s){
 if(!current(s)||s.loading)return;
 s.loading=true;
 try{
  const read=()=>s.client.from('negative_fund_notices475').select('owner_id,owner_name,deficits,revision');
  const r=await (window.offline14239?.freshReads?offline14239.freshReads(read):read());
  if(!current(s))return;
  if(r.error)throw r.error;
  let changed=false;for(const row of r.data||[])changed=accept(s,row)||changed;
  if(changed)window.refreshNotices1443?.();
 }catch(e){if(current(s)&&['42501','PGRST301','PGRST302'].includes(e.code))stop();}
 finally{s.loading=false;}
}
function start(refresh=false){
 if(!allowed()){stop();return;}
 if(session&&(session.actor!==liveProfile.id||session.client!==ojmDb))stop();
 const s=session||(session={actor:liveProfile.id,client:ojmDb,rows:new Map(),channel:null,loading:false});
 if(document.hidden||navigator.onLine===false){stop(false);return;}
 if(s.channel){if(refresh)void load(s);return;}
 if(!s.client.channel){if(refresh)void load(s);return;}
 const channel=s.client.channel('negative-fund-notices475:'+s.actor);s.channel=channel;
 channel.on('postgres_changes',{event:'*',schema:'public',table:'negative_fund_notices475'},event=>{
   if(s.channel===channel&&accept(s,event.new))window.refreshNotices1443?.();
  }).subscribe(status=>{
   if(!current(s)||s.channel!==channel)return;
   if(status==='SUBSCRIBED')void load(s); // One catch-up read of saved notices, never a balance scan.
   else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))stop(false);
  });
}
function notices(){
 const s=session;if(!s||!current(s))return [];
 return [...s.rows.values()].filter(r=>r.deficits.some(d=>Number(d.remaining)<0)).map(r=>({
  noticeId:'negative-fund:'+r.owner_id,groupKey:'negative-fund:'+r.owner_id,
  type:'Budget needed',title:r.owner_name||'User',
  detail:r.deficits.filter(d=>Number(d.remaining)<0).map(d=>d.name+' · Shortfall '+money(-Number(d.remaining),d.currency)).join(' · '),
  target:'sub-users-workspace',fundOwner475:r.owner_id,critical:true,persistent:true,priority:5,actionLabel:'Open user funds'
 }));
}
function open(owner){
 if(!allowed()||!window.Organization14229?.mayOpen(owner))return false;
 window.openWorkspaceUser(owner);
 if(document.getElementById('personalWorkspace1437')?.dataset.owner!==String(owner))return false;
 window.personalJournal1437.show(owner,'home');
 return document.getElementById('sub-users-workspace')?.classList.contains('active')===true;
}
window.negativeFunds475={start,stop,notices,open};
document.addEventListener('visibilitychange',()=>document.hidden?stop(false):start());
window.addEventListener('offline',()=>stop(false));window.addEventListener('online',()=>start());
window.addEventListener('pagehide',()=>stop(false));
window.addEventListener('page113',()=>{if(!allowed())stop();});
})();
