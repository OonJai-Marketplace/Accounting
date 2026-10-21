/* One visible month; records remain intact for calculations, exports and review. */
(()=>{'use strict';let owner='',selected={};const valid=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m||'');
function choose(key,months){const id=typeof liveProfile==='undefined'?'':liveProfile?.id;if(owner!==id){owner=id;selected={};searches.clear()}if(selected[key])return selected[key];const now=typeof today82==='function'?today82().slice(0,7):appLocalDate().slice(0,7),all=months.filter(valid).sort();return all.includes(now)?now:all.at(-1)||now}
function control(key,month){return '<label class="history-month14341 no-print"><input type="month" data-history-month14341="'+key+'" aria-label="History month" value="'+month+'"></label>'}
const searches=new Map(),loads=new Map();
const actor=()=>typeof liveProfile==='undefined'?'':liveProfile?.id;
function position(host,input){
 const label=input.closest('.history-month14341');if(!label||input.closest('.payroll-report-filters143153'))return;
 const key=input.dataset.historyMonth14341;
 const titles={journal:'Journal History',submitted:'Submission History',budget:'Budget Request History',audit:'Audit Logs',reports:'Report History',payroll:'Payroll History'};
 const container=host.closest('.settings-section-card,.je-card,.work82');
 let header=container?.querySelector(':scope>.settings-section-header,:scope>.je-card-header')||host.querySelector(':scope>.work82>header,:scope>header:has(h2)');
 if(!header?.querySelector('h2,h3,h4'))header=host.querySelector('.history-header14342');
 if(!header){header=document.createElement('header');host.prepend(header)}header.classList.add('history-header14342');
 let title=header.querySelector('h2,h3,h4');if(!title){title=host.querySelector(':scope>h3')||document.createElement('h3');header.prepend(title)}
 if(titles[key])title.textContent=titles[key];else if(!title.textContent||/^\w+ \d{4}$/.test(title.textContent))title.textContent=key.startsWith('employee-history:')?'Submission History':'History';
 for(const old of header.querySelectorAll('[data-history-month14341]'))if(old!==input&&old.dataset.historyMonth14341===key)old.closest('.history-month14341')?.remove();
 const inner=host.querySelector('.history-header14342');if(inner&&inner!==header){for(const button of inner.querySelectorAll('button'))if(!button.closest('.history-month14341'))header.append(button);inner.remove()}
 let actions=header.querySelector('.archive-month-actions,.actions82,.page-header-actions14301');if(!actions){actions=document.createElement('div');actions.className='archive-month-actions';header.append(actions)}actions.classList.add('archive-month-actions');if(key==='audit')actions.classList.add('page-header-actions14301');
 if(!actions.contains(label))actions.append(label);
 for(const button of header.querySelectorAll(':scope>button,.page-header-actions14301>button'))if(!actions.contains(button))actions.append(button);
 // The budget table repeats the module title; one heading is sufficient.
 if(key==='budget')host.querySelector('.block82>header')?.remove();
 const print=actions.querySelector('[data-export-menu14337],button[onclick*=print],button[onclick*=Print],.export-trigger14337')||[...actions.querySelectorAll('button')].find(b=>/Print|Preview/.test(b.textContent));if(print)print.before(label);
 if(host.dataset.historySearch==='off')return;
 const existing=header.querySelector('input[type=search]')||host.querySelector('input[type=search]')||host.closest('.je-card,.work82')?.querySelector('input[type=search],#historySearch80');if(existing&&!actions.contains(existing)){const oldLabel=existing.closest('label');actions.prepend(existing);if(oldLabel&&!oldLabel.querySelector('input,select,button'))oldLabel.remove()}if(existing){existing.classList.add('history-search14359');existing.placeholder='Search this month';existing.setAttribute('aria-label','Search selected month')}
 if(!header.querySelector('input[type=search]')){
  const search=document.createElement('input');search.type='search';search.className='je-input history-search14359';search.placeholder='Search this month';search.setAttribute('aria-label','Search selected month');search.value=searches.get(input.dataset.historyMonth14341)||'';actions.prepend(search);
  const filter=()=>{searches.set(input.dataset.historyMonth14341,search.value);const q=search.value.trim().toLowerCase();host.querySelectorAll('.final-record-card,.report-history-row1443,.pay-group95,tbody>tr:not(.audit-detail-row)').forEach(row=>{row.hidden=!!q&&!row.textContent.toLowerCase().includes(q)})};search.oninput=filter;filter();
 }
}
function bind(host,key,render,payroll=false){const input=host?.querySelector('[data-history-month14341="'+key+'"]');if(!input)return;position(host,input);input.onchange=async()=>{const month=input.value,who=actor(),token=(loads.get(key)||0)+1;loads.set(key,token);const current=()=>actor()===who&&loads.get(key)===token;if(!valid(month))return;input.disabled=true;const end=window.actionFeedback14296?.begin(input,'Loading selected month…');await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)));const prior=selected[key]||input.defaultValue;try{if(!current())return;if(payroll===true)await window.payrollWindow14334?.ensure(month);else if(payroll!=='local')await window.yearWindow14333?.ensure(month+'-01',month+'-01');if(!current())return;selected[key]=month;render();window.dispatchEvent(new CustomEvent('history-month143103',{detail:{key,month}}))}catch(e){if(!current())return;selected[key]=prior;input.value=prior;showCenterStatus(e.message,true)}finally{input.disabled=false;end?.()}}}
function expand(host){for(const detail of [...host?.querySelectorAll('details')||[]]){const section=document.createElement('section');section.className=detail.className;section.id=detail.id;detail.querySelectorAll('button[onclick*=v56ToggleRecord]').forEach(b=>b.remove());while(detail.firstChild)section.append(detail.firstChild);const summary=section.querySelector(':scope>summary');if(summary){const header=document.createElement('header');header.append(...summary.childNodes);summary.replaceWith(header)}detail.replaceWith(section)}}
window.addEventListener('page113',()=>{if(!document.querySelector('#journal.active,#dashboard.active'))return;const year=new Date().getFullYear(),who=actor();window.yearWindow14333?.ensure(year+'-01-01',year+'-12-31').catch(e=>{if(actor()===who)showCenterStatus(e.message,true)})});
function summary(metrics){const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<div class="period-summary-grid history-summary14359">'+metrics.map(([label,value])=>'<div class="period-summary-card"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>').join('')+'</div>'}
window.historyMonth14341={choose,control,bind,expand,summary};
})();
