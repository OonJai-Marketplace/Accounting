/* Desktop corrections only; existing financial and user actions stay authoritative. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const admin=()=>typeof liveProfile!=='undefined'&&liveProfile?.role==='admin';
let dateHome=null;
function decorate(){
 const card=$('journalEntry98'),date=card?.querySelector('.transaction-date-field'),meta=card?.querySelector('.je-meta-grid');
 const singleDesktop=matchMedia('(min-width:641px)').matches;
 if(singleDesktop&&date&&meta&&date.parentElement!==meta){dateHome=date.parentElement;meta.prepend(date)}
 else if(!singleDesktop&&dateHome?.isConnected&&date&&date.parentElement===meta){dateHome.append(date);dateHome=null}

 if(matchMedia('(min-width:768px)').matches)for(const row of document.querySelectorAll('#demoUsersList .demo-user-row')){
  const actions=row.querySelector('.user-actions14253'),reset=row.querySelector(':scope > [data-user-reset]');if(actions&&reset)actions.append(reset);
  const badge=row.querySelector('.user-status-badge');if(badge&&!badge.dataset.status14256){const status=badge.textContent.trim();badge.dataset.status14256=status;badge.textContent='';badge.title=status==='active'?'Active':'Inactive ('+status+')';badge.setAttribute('role','img');badge.setAttribute('aria-label',badge.title);}
 }

}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate()})}
function ready(){decorate();new MutationObserver(records=>{const selector='#journalEntry98,#demoUsersList';if(records.some(r=>r.target.closest?.(selector)||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches(selector)||n.querySelector(selector)))))schedule()}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});window.addEventListener('connection14239',schedule);window.addEventListener('page113',schedule);window.addEventListener('resize',schedule)}
window.layout14256={decorate};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
