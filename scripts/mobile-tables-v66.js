/* Phone/tablet presentation only. Existing record IDs, input nodes and save handlers remain authoritative. */
(function(){
'use strict';
const media=matchMedia('(max-width:1024px)');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.v66ReviewMetadata=item=>{
 const fields=[['Status',String(item.status||'').replaceAll('_',' ')],['Submitted',item.submitted_at],['Reviewed',item.reviewed_at],['Approved',item.approved_at],['Posted',item.posted_at],['Reviewer',item.reviewed_by||item.approved_by],['Review comments',item.review_note||item.review_notes||item.return_note||item.rejection_reason]];
 return '<dl class="v66-review-meta">'+fields.filter(([,v])=>v).map(([k,v])=>{if(k==='Reviewer'&&typeof getLiveUserName==='function')v=getLiveUserName(v)||v;return `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`}).join('')+'</dl>';
};
const states=new Map();let scheduled=false;
function pair(label,node){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;while(node.firstChild)dd.append(node.firstChild);row.append(dt,dd);return row;}
function adjustmentDetails(table){
 const headers=[...table.querySelectorAll('thead th')].map(n=>n.textContent.trim());const group=document.createElement('div');group.className='v66-adjustment-details';
 for(const row of table.querySelectorAll('tbody tr')){const cells=[...row.children];const card=document.createElement('section');card.className='v64-entry-body';const title=document.createElement('strong');title.textContent=cells[0]?.textContent.replaceAll('_',' ')||'Adjustment';const dl=document.createElement('dl');cells.slice(1).forEach((cell,i)=>dl.append(pair(headers[i+1]||'Value',cell)));card.append(title,dl);group.append(card);}
 table.replaceWith(group);
}
function adjustmentForm(table){
 const form=document.createElement('div');form.className='v66-adjustment-fields';
 for(const row of table.querySelectorAll('tbody tr')){const cells=[...row.children],section=document.createElement('section');section.className='v49-form';const title=document.createElement('strong');title.className='full';title.textContent=cells[0].textContent;section.append(title);
 cells.slice(1).forEach((cell,i)=>{const label=document.createElement('label'),span=document.createElement('span');span.textContent=['Original','New value','Difference'][i];label.append(span);if(cell.querySelector('input')){while(cell.firstChild)label.append(cell.firstChild);}else{const output=document.createElement('output');output.id=cell.id;output.textContent=cell.textContent;label.append(output);}section.append(label);});form.append(section);}
 table.replaceWith(form);
}
function history(){
 document.querySelectorAll('.v49-phone-workspace .v49-records').forEach(section=>{
 const button=section.querySelector('header button[onclick*="v49OpenReview"]');if(button)button.hidden=true;
 const subtitle=section.querySelector('header p');if(subtitle&&subtitle.textContent!=='Submissions, reviews and adjustments, newest first.')subtitle.textContent='Submissions, reviews and adjustments, newest first.';
 const list=section.querySelector('.v49-record-list');if(!list)return;
 let search=section.querySelector('.v66-history-search');if(!search){search=document.createElement('input');search.type='search';search.className='v66-history-search';search.placeholder='Search date, ID, account, description, reviewer or status';search.setAttribute('aria-label','Search history');list.before(search);search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();[...list.children].forEach(card=>{card.hidden=!!q&&!card.textContent.toLowerCase().includes(q);});});}
 });
}
function sync(state){const {box,x,y}=state;const sw=box.scrollWidth,sh=box.scrollHeight,cw=box.clientWidth,ch=box.clientHeight;x.hidden=sw<=cw+1;y.hidden=sh<=ch+1;x.style.width=`${Math.max(12,cw/sw*100)}%`;x.style.left=`${sw>cw?(box.scrollLeft/(sw-cw))*(100-Math.max(12,cw/sw*100)):0}%`;y.style.height=`${Math.max(12,ch/sh*100)}%`;y.style.top=`${sh>ch?(box.scrollTop/(sh-ch))*(100-Math.max(12,ch/sh*100)):0}%`;}
function enhanceTable(table){
 if(table.closest('#payroll-employees,#hr-attendance,#hr-leave,#hr-assessments,#hr-contracts,#hr-calendar'))return;
 if(window.mobileTransactionTable72?.(table))return;
 if(states.has(table)||table.closest('.v66-table-shell')||table.closest('.v49-adjust-body'))return;
 const shell=document.createElement('div'),box=document.createElement('div'),x=document.createElement('i'),y=document.createElement('i');shell.className='v66-table-shell';box.className='v66-table-viewport';box.tabIndex=0;box.setAttribute('role','region');box.setAttribute('aria-label','Scrollable table. Pinch to zoom.');x.className='v66-scroll-x';y.className='v66-scroll-y';x.setAttribute('aria-hidden','true');y.setAttribute('aria-hidden','true');
 table.before(shell);shell.append(box,x,y);box.append(table);
 const state={table,shell,box,x,y,scale:1,originalZoom:table.style.zoom};states.set(table,state);
 let parent=shell.parentElement;while(parent&&parent!==document.body){if(parent.matches('.final-scroll-table,.final-scroll-shell,.v49-table-scroll,.v56-correction-table')||([...parent.children].filter(n=>n.tagName!=='I').length===1&&/auto|scroll/.test(getComputedStyle(parent).overflowX))){parent.classList.add('v66-outer-scroll');}else break;parent=parent.parentElement;}
 box.addEventListener('scroll',()=>sync(state),{passive:true});
 let pinch=null;const distance=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);
 box.addEventListener('touchstart',event=>{if(event.touches.length!==2)return;event.preventDefault();const rect=box.getBoundingClientRect(),cx=(event.touches[0].clientX+event.touches[1].clientX)/2-rect.left,cy=(event.touches[0].clientY+event.touches[1].clientY)/2-rect.top;pinch={distance:distance(event.touches),scale:state.scale,cx,cy,ax:(box.scrollLeft+cx)/state.scale,ay:(box.scrollTop+cy)/state.scale};},{passive:false});
 box.addEventListener('touchmove',event=>{if(event.touches.length!==2||!pinch)return;event.preventDefault();state.scale=Math.max(.65,Math.min(3,pinch.scale*distance(event.touches)/Math.max(1,pinch.distance)));table.style.zoom=String(state.scale);box.scrollLeft=pinch.ax*state.scale-pinch.cx;box.scrollTop=pinch.ay*state.scale-pinch.cy;sync(state);},{passive:false});
 box.addEventListener('touchend',()=>{pinch=null;},{passive:true});box.addEventListener('touchcancel',()=>{pinch=null;},{passive:true});
 state.observer=new ResizeObserver(()=>sync(state));state.observer.observe(box);state.observer.observe(table);sync(state);
}
function fitTotals(){
 document.querySelectorAll('.v49-phone-workspace .v49-totals table').forEach(table=>{
 const width=table.closest('.v66-table-viewport')?.clientWidth||table.parentElement.clientWidth;if(!width)return;
 const probe=document.createElement('canvas').getContext('2d');probe.font='10px Arial';const samples=['-999,999,999',...[...table.querySelectorAll('tbody td:not(:first-child)')].map(n=>n.textContent)];const longest=Math.max(...samples.map(s=>probe.measureText(s).width));const size=Math.min(11,Math.max(7.5,((width*.27-4)/longest)*10));table.style.setProperty('--v66-number-size',`${size}px`);
 });
}
function update(){scheduled=false;if(!media.matches)return;
 if(document.body.classList.contains('subusers-workspace-active')){
 history(); /* Adjustment request keeps its compact editable table. */
 document.querySelectorAll('.v49-adjustment-record table,.final-adjustment-record table,.v49-adjustment-review table').forEach(adjustmentDetails);
 document.querySelectorAll('.v49-phone-workspace .v49-records details,.v49-review-scroll>details,.final-record-list>details').forEach(card=>card.classList.add('v64-entry'));
 }
 for(const [table,state] of states)if(!table.isConnected){state.observer.disconnect();states.delete(table);}
 document.querySelectorAll('table').forEach(enhanceTable);fitTotals();
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
document.addEventListener('toggle',event=>{if(!media.matches||!document.body.classList.contains('subusers-workspace-active')||!event.target.open)return;const card=event.target;if(!card.matches('details'))return;const list=card.closest('.v49-record-list,.final-record-list,.v49-review-scroll');if(list){[...list.querySelectorAll('details[open]')].forEach(other=>{if(other!==card&&!other.contains(card)&&!card.contains(other))other.open=false;});}schedule();},true);
media.addEventListener('change',()=>{if(!media.matches){for(const [table,state] of states){state.observer.disconnect();table.style.zoom=state.originalZoom;state.shell.replaceWith(table);}states.clear();document.querySelectorAll('.v66-outer-scroll').forEach(n=>n.classList.remove('v66-outer-scroll'));}schedule();});
window.addEventListener('resize',schedule);const start=()=>{new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});schedule();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
