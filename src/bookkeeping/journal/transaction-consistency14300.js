/* Transaction navigation, configured date presentation and audit stability. */
(()=>{'use strict';
const pad=n=>String(n).padStart(2,'0');
window.formatAppDate=function(value,withTime=false){
 if(!value)return '—';
 const raw=String(value),date=new Date(raw.length===10?raw+'T00:00:00':raw);
 if(Number.isNaN(date.getTime()))return raw;
 const y=String(date.getFullYear()),yy=y.slice(-2),m=pad(date.getMonth()+1),d=pad(date.getDate());
 const short=date.toLocaleString('en',{month:'short'}),long=date.toLocaleString('en',{month:'long'});
 const format=ApplicationSettings.system?.dateFormat||'DD/MM/YYYY';
 const values={
  'DD/MM/YYYY':`${d}/${m}/${y}`,'MM/DD/YYYY':`${m}/${d}/${y}`,'YYYY-MM-DD':`${y}-${m}-${d}`,
  'DD MMM YYYY':`${d} ${short} ${y}`,'MMM DD, YYYY':`${short} ${d}, ${y}`,
  'DD MMMM YYYY':`${d} ${long} ${y}`,'MMMM DD, YYYY':`${long} ${d}, ${y}`,
  'DD MMM YY':`${d} ${short} ${yy}`,'MMM DD, YY':`${short} ${d}, ${yy}`
 };
 const base=values[format]||values['DD/MM/YYYY'];
 return withTime?`${base} ${date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:base;
};
function syncTab(){
 const active=document.querySelector('.tab-content.active');if(!active)return;
 const buttons=[...document.querySelectorAll('#appSidebar .tab-btn')];
 const button=buttons.find(b=>b.dataset.tabTarget===active.id||(b.getAttribute('onclick')||'').includes("'"+active.id+"'"));
 if(button){buttons.forEach(b=>b.classList.toggle('active',b===button));const title=document.getElementById('mainHeaderTitle');if(title&&title.textContent!==button.textContent.trim())title.textContent=button.textContent.trim()}
}
function historyDetails(root){
 if(root.matches('.personal-history-list1437'))return [...root.querySelectorAll(':scope>div>details')];
 if(root.id==='archiveMonths67')return [...root.querySelectorAll(':scope>details.archive-year')];
 return [...root.querySelectorAll(':scope>details')];
}
function initializeHistories(){
 const roots=document.querySelectorAll('#auditMonths98,#archiveMonths67,#historyRecords95,#userEntryHistoryCards,#finalRecordList,.workspace-review-scroll,.personal-history-list1437,.staff-submitted-history');
 for(const root of roots){let details=historyDetails(root),fresh=details.filter(d=>!d.dataset.latestDefault14300);if(!fresh.length)continue;if(details.length>1&&details.every(d=>/\b20\d{2}(?:-\d{2}(?:-\d{2})?)?\b/.test(d.textContent))){details.sort((a,b)=>(b.textContent.match(/\b20\d{2}(?:-\d{2}(?:-\d{2})?)?\b/)?.[0]||'').localeCompare(a.textContent.match(/\b20\d{2}(?:-\d{2}(?:-\d{2})?)?\b/)?.[0]||''));details.forEach(d=>root.append(d))}details.forEach((d,index)=>{d.open=index===0;d.dataset.latestDefault14300='1'});if(root.id==='archiveMonths67'){const months=details[0]?.querySelectorAll(':scope>div>details.archive-month,:scope>details.archive-month')||[];months.forEach((d,index)=>{d.open=index===0;d.dataset.latestDefault14300='1'})}}
}
function standardizeReportActions(){
 for(const button of document.querySelectorAll('button,[role="button"]')){
  const label=(button.getAttribute('aria-label')||button.textContent||'').trim();
  if(/^(?:print|preview|review|open\s*\/\s*print|print\s*\/\s*pdf|review\s*&\s*print)\b/i.test(label))button.classList.add('report-action14300');
 }
}
function standardizeVisibleDates(){
 for(const cell of document.querySelectorAll('#voucherRows14299 tr>td:nth-child(3),.th-activity time')){
  const raw=(cell.dataset.rawDate14300||cell.textContent||'').trim();if(!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(raw))continue;
  cell.dataset.rawDate14300=raw;const formatted=formatAppDate(raw);if(cell.textContent!==formatted)cell.textContent=formatted;
 }
}
function hidePrivateDraftActivity(){for(const row of document.querySelectorAll('.th-activity'))if(/saved a draft/i.test(row.textContent||''))row.remove()}
let queued=false;
function polish(){queued=false;hidePrivateDraftActivity();initializeHistories();standardizeReportActions();standardizeVisibleDates();syncTab()}
function schedule(){if(!queued){queued=true;requestAnimationFrame(polish)}}
const switchBefore=window.switchTab;
window.switchTab=function(...args){const result=switchBefore.apply(this,args);syncTab();return result};
window.polishAudit14300=function(){
 const root=document.getElementById('auditMonths98');if(!root)return;
 for(const card of root.querySelectorAll('.audit-month98')){
  const summary=card.querySelector(':scope>summary');if(!summary)continue;
  if(!card.dataset.aligned99){const title=summary.querySelector('.audit-month-title98'),counts={edit:0,void:0,destructive:0,info:0};summary.querySelectorAll('.audit-count98').forEach(n=>{const key=Object.keys(counts).find(k=>n.classList.contains(k));if(key)counts[key]+=Number(n.querySelector('b')?.textContent||0)});if(title){summary.replaceChildren(title);for(const [key,label] of [['edit','Updated'],['void','Voided'],['destructive','Deleted'],['info','Other actions']]){if(!counts[key])continue;const span=document.createElement('span');span.className='audit-stat99 '+key;span.innerHTML='<small>'+label+'</small><b>'+counts[key]+'</b>';summary.append(span)}}card.dataset.aligned99='true'}
  if(typeof window.deleteAuditMonth1434==='function'&&liveProfile?.role==='admin'&&!summary.querySelector('[data-delete-audit1434]')&&/^\d{4}-\d{2}$/.test(card.dataset.month98||'')){
   const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-danger no-print';b.dataset.deleteAudit1434=card.dataset.month98;b.textContent='Delete entire month';b.onclick=e=>{e.preventDefault();e.stopPropagation();deleteAuditMonth1434(b.dataset.deleteAudit1434)};summary.append(b);
  }
 }
};
const auditBefore=window.renderVoidedTransactionsTable;
if(typeof auditBefore==='function')window.renderVoidedTransactionsTable=function(...args){const result=auditBefore.apply(this,args);window.polishAudit14300();return result};
document.addEventListener('DOMContentLoaded',()=>{polish();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true})},{once:true});
})();
