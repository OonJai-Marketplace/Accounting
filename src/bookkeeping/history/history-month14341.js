/* One visible month; records remain intact for calculations, exports and review. */
(()=>{'use strict';let owner='',selected={};const valid=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m||'');
function choose(key,months){const id=typeof liveProfile==='undefined'?'':liveProfile?.id;if(owner!==id){owner=id;selected={};searches.clear()}if(selected[key])return selected[key];const now=typeof today82==='function'?today82().slice(0,7):new Date().toISOString().slice(0,7),all=months.filter(valid).sort();return all.includes(now)?now:all.at(-1)||now}
function control(key,month){return '<label class="history-month14341 no-print"><input type="month" data-history-month14341="'+key+'" aria-label="History month" value="'+month+'"></label>'}
const searches=new Map();
function position(host,input){
 const label=input.closest('.history-month14341');if(!label)return;
 let header=host.querySelector('.history-header14342');
 if(!header){header=document.createElement('header');header.className='history-header14342';host.prepend(header)}
 let title=header.querySelector('[data-history-title14359]')||header.querySelector('h3');
 if(!title){title=document.createElement('h3');title.dataset.historyTitle14359='';header.prepend(title)}
 title.textContent=new Date(input.value+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'});
 let actions=header.querySelector('.archive-month-actions,.actions82');if(!actions){actions=document.createElement('div');actions.className='archive-month-actions';header.append(actions)}
 if(!actions.contains(label))actions.append(label);
 const existing=host.querySelector('input[type=search]')||host.closest('.je-card,.work82')?.querySelector('input[type=search],#historySearch80,#auditSearch69');if(existing&&!actions.contains(existing)){const oldLabel=existing.closest('label');actions.prepend(existing);if(oldLabel&&!oldLabel.querySelector('input,select,button'))oldLabel.remove()}if(existing){existing.classList.add('history-search14359');existing.placeholder='Search this month';existing.setAttribute('aria-label','Search selected month')}
 if(!host.querySelector('input[type=search]')&&!host.closest('.work82')?.querySelector('input[type=search]')){
  const search=document.createElement('input');search.type='search';search.className='je-input history-search14359';search.placeholder='Search this month';search.setAttribute('aria-label','Search selected month');search.value=searches.get(input.dataset.historyMonth14341)||'';actions.prepend(search);
  const filter=()=>{searches.set(input.dataset.historyMonth14341,search.value);const q=search.value.trim().toLowerCase();host.querySelectorAll('.final-record-card,.report-history-row1443,.pay-group95,tbody>tr:not(.audit-detail-row)').forEach(row=>{row.hidden=!!q&&!row.textContent.toLowerCase().includes(q)})};search.oninput=filter;filter();
 }
}
function bind(host,key,render,payroll=false){const input=host?.querySelector('[data-history-month14341="'+key+'"]');if(!input)return;position(host,input);input.onchange=async()=>{const month=input.value;if(!valid(month))return;input.disabled=true;const end=window.actionFeedback14296?.begin(input,'Loading selected month…');await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));const prior=selected[key]||input.defaultValue;try{if(payroll===true)await window.payrollWindow14334?.ensure(month);else if(payroll!=='local')await window.yearWindow14333?.ensure(month+'-01',month+'-01');selected[key]=month;render()}catch(e){selected[key]=prior;input.value=prior;showCenterStatus(e.message,true)}finally{input.disabled=false;end?.()}}}
function expand(host){for(const detail of [...host?.querySelectorAll('details')||[]]){const section=document.createElement('section');section.className=detail.className;section.id=detail.id;detail.querySelectorAll('button[onclick*=v56ToggleRecord]').forEach(b=>b.remove());while(detail.firstChild)section.append(detail.firstChild);const summary=section.querySelector(':scope>summary');if(summary){const header=document.createElement('header');header.append(...summary.childNodes);summary.replaceWith(header)}detail.replaceWith(section)}}
window.addEventListener('page113',()=>{if(!document.querySelector('#journal.active,#dashboard.active'))return;const year=new Date().getFullYear();window.yearWindow14333?.ensure(year+'-01-01',year+'-12-31').catch(e=>showCenterStatus(e.message,true))});
function summary(metrics){const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<div class="period-summary-grid history-summary14359">'+metrics.map(([label,value])=>'<div class="period-summary-card"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('')+'</div>'}
window.historyMonth14341={choose,control,bind,expand,summary};
})();
