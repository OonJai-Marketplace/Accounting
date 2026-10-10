/* Counts reflect actionable records, not clicks or the current table filter. */
(()=>{'use strict';
let queued=false;
const allowed=id=>!!document.getElementById(id)&&!!window.access113?.can(id);
function counts(){const tabs={};if(typeof liveProfile==='undefined'||!liveProfile||liveProfile.status!=='active')return tabs;
 const add=(id,n=1)=>{if(allowed(id)&&n>0)tabs[id]=(tabs[id]||0)+n};
 for(const n of window.getNotices14311?.()||[]){let count=Number(n.count)||1;if(n.target==='local-events')count=window.hrCalendarNews14309?.pending().filter(p=>p.start).length||0;if(n.target==='transactions-vouchers14299')count=window.vouchers14299?.state?.rows?.filter(r=>r.kind==='E'&&!r.journal_entry_id&&r.status!=='void').length??0;add(n.target,count)}
 if(liveProfile.role==='admin'){
  const findings=typeof PeriodReview!=='undefined'?PeriodReview.findings.filter(r=>!['corrected','closed'].includes(r.status)):[];
  const w=window.workflow136?.state;add('period-review',findings.length+(w?.owner===liveProfile.id?w.reviews.filter(r=>r.status==='open').length+w.sessions.length:0));
  add('hr-leave',typeof Work82!=='undefined'?Work82.leaves.filter(r=>r.data.status==='pending').length:0);
  // The Sub-Users workspace also leads to the reports awaiting administrator review.
  add('sub-users-home14229',tabs['user-entry-review']||0);
 }else if(typeof reviewStaffJournals!=='undefined'){add('sub-users-workspace',reviewStaffJournals.filter(r=>r.owner_id===liveProfile.id&&r.status==='returned').length)}
 return tabs;
}
function badge(node,count){if(!node)return;let b=node.querySelector(':scope > .nav-count14311');if(!count){b?.remove();if(node.classList.contains('has-count14311'))node.classList.remove('has-count14311');return}if(!b){b=document.createElement('span');b.className='nav-count14311';b.style.setProperty('color','#fff','important');node.append(b)}const label=count>99?'99+':String(count);if(b.textContent!==label)b.textContent=label;const description=count+' pending notifications';if(b.getAttribute('aria-label')!==description)b.setAttribute('aria-label',description);if(b.title!==description)b.title=description;if(!node.classList.contains('has-count14311'))node.classList.add('has-count14311')}
function target(button){return button.dataset.target||button.getAttribute('onclick')?.match(/switchTab\(['"]([^'"]+)/)?.[1]||''}
function render(){const tabs=counts(),modules={};for(const [id,n]of Object.entries(tabs)){const module=document.getElementById(id)?.dataset.module||window.moduleForTab?.(id);if(module)modules[module]=(modules[module]||0)+n}
 document.querySelectorAll('#appSidebar .nav-category').forEach(cat=>badge(cat.querySelector('.nav-header'),modules[cat.dataset.module]||0));
 document.querySelectorAll('#categoryTabs .category-tab,#appSidebar .nav-links .tab-btn').forEach(b=>{let id=target(b);if(b.closest('#nav-module-sub-users'))id=liveProfile?.role==='admin'?'sub-users-home14229':'sub-users-workspace';badge(b,tabs[id]||0)});
 const reports=typeof reviewStaffJournals==='undefined'?[]:reviewStaffJournals;const needs=(id,status)=>reports.filter(r=>String(r.owner_id)===String(id)&&r.status===status).length;
 document.querySelectorAll('[data-team-user14230]').forEach(b=>badge(b,allowed('sub-users-workspace')?needs(b.dataset.teamUser14230,liveProfile?.role==='admin'?'submitted':'returned'):0));
 const personal=document.getElementById('personalWorkspace1437');if(personal){badge(personal.querySelector('[data-personal-tab=journal]'),allowed('sub-users-workspace')?needs(personal.dataset.owner,'returned'):0);badge(personal.querySelector('[data-personal-tab=home]'),allowed('sub-users-workspace')&&liveProfile?.role==='admin'?needs(personal.dataset.owner,'submitted'):0)}

}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render()})}
window.navigationBadges14311={render,counts};window.addEventListener('page113',schedule);window.addEventListener('presentation-ready113',schedule);
window.addEventListener('DOMContentLoaded',()=>{for(const id of ['categoryTabs','appSidebar','sub-users-workspace']){const n=document.getElementById(id);if(n)new MutationObserver(records=>{if(records.some(r=>![r.target,...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.classList?.contains('nav-count14311'))))schedule()}).observe(n,{childList:true,subtree:true})}const header=document.querySelector('.module-header .header-left-tools');if(header)new MutationObserver(rs=>{if(rs.some(r=>![r.target,...r.addedNodes,...r.removedNodes].some(n=>n.classList?.contains('nav-count14311'))))schedule()}).observe(header,{childList:true,subtree:true});schedule()},{once:true});
})();
