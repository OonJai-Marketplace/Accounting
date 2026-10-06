/* Desktop corrections only; existing financial and user actions stay authoritative. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const admin=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin';
let openingBusy=false,dateHome=null;
async function openBalances(){
 if(!admin()||openingBusy)return;
 openingBusy=true;const who=liveProfile.id;
 try{
  const r=await ojmDb.rpc('opening_status14234');
  if(!admin()||liveProfile.id!==who)return;
  if(r.error){const missing=['PGRST202','42883'].includes(r.error.code);showCenterStatus(missing?'Install setup/INSTALL-OPENING-BALANCES-v142.34.sql, then reopen Chart of Accounts.':'Unable to check opening balances: '+(r.error.message||'Reconnect and try again.'),true);return;}
  if(typeof r.data?.available!=='boolean'){showCenterStatus('Opening balance status could not be confirmed. Reconnect and try again.',true);return;}
  let job;try{job=JSON.parse(localStorage.getItem('ojm_opening14234:'+String(OJM_SUPABASE_URL)+':'+who)||'null')}catch{}
  if(r.data.available||(job&&job.generation===r.data.generation)){await window.openingBalances14234.open();return;}
  showCenterStatus('Opening balance setup is closed. It is available only before the first journal entry and before any period closing or carry-forward. Installing the SQL does not reopen an existing ledger.',true);
 }catch(e){showCenterStatus('Unable to check opening balances: '+e.message,true)}finally{openingBusy=false;decorate()}
}
function decorate(){
 const card=$('journalEntry98'),date=card?.querySelector('.transaction-date-field'),meta=card?.querySelector('.je-meta-grid');
 const singleDesktop=matchMedia('(min-width:768px)').matches&&card?.classList.contains('single-entry1430');
 if(singleDesktop&&date&&meta&&date.parentElement!==meta){dateHome=date.parentElement;meta.prepend(date)}
 else if(!singleDesktop&&dateHome?.isConnected&&date&&date.parentElement===meta){dateHome.append(date);dateHome=null}

 const button=$('openingBalances14234');if(button){const hidden=!admin();if(button.hidden!==hidden)button.hidden=hidden;if(button.onclick!==openBalances)button.onclick=openBalances;}
 if(matchMedia('(min-width:768px)').matches)for(const row of document.querySelectorAll('#demoUsersList .demo-user-row')){
  const actions=row.querySelector('.user-actions14253'),reset=row.querySelector(':scope > [data-user-reset]');if(actions&&reset)actions.append(reset);
  const badge=row.querySelector('.user-status-badge');if(badge&&!badge.dataset.status14256){const status=badge.textContent.trim();badge.dataset.status14256=status;badge.textContent='';badge.title=status==='active'?'Active':'Inactive ('+status+')';badge.setAttribute('role','img');badge.setAttribute('aria-label',badge.title);}
 }
 for(const b of document.querySelectorAll('.connection14239')){
  const s=window.offline14239?.state();if(!s)continue;
  const connection=s.online?'Online':navigator.onLine===false?'Offline':'Limited connection';
  let indicator=b.parentElement.querySelector('.internet14256');
  if(!indicator){indicator=document.createElement('span');indicator.className='internet14256';indicator.setAttribute('role','status');b.after(indicator)}
  if(indicator.textContent!==connection)indicator.textContent=connection;
  indicator.dataset.online=String(s.online);

 }
}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
function ready(){decorate();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('connection14239',schedule);window.addEventListener('page113',schedule);window.addEventListener('resize',schedule)}
window.layout14256={decorate,openBalances};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
