/* Display-only pagination. Source rows stay available for exports. */
(()=>{'use strict';const states=new WeakMap(),tables=new Set();let queued=false;
function restoreSpans(table){for(const cell of table.querySelectorAll('[data-page-cell14383]'))cell.remove();for(const cell of table.querySelectorAll('[data-page-span14383]')){cell.rowSpan=Number(cell.dataset.pageSpan14383);delete cell.dataset.pageSpan14383}}
// Use one floating control among the paginated tables in the active work area.
const pagerSelector='.transaction-pages14340,.table-pages14383,.audit-pager377';
let activeBar=null,candidates=[],dockFrame=0;
function placeDock(){
 dockFrame=0;let selected=null,best=Infinity;
 const workspace=document.getElementById('printableDocArea');
 const viewport=workspace?.getBoundingClientRect(),center=viewport?(viewport.top+viewport.bottom)/2:innerHeight/2;
 for(const bar of candidates){
  if(!bar.isConnected||bar.closest('[hidden]')||!bar.closest('.tab-content.active'))continue;
  const table=bar.previousElementSibling?.matches('table')?bar.previousElementSibling:bar.previousElementSibling?.querySelector('table');
  if(!table?.getClientRects().length)continue;
  const box=table.getBoundingClientRect(),distance=Math.max(0,center-box.bottom,box.top-center);
  if(distance<best){best=distance;selected=bar;}
 }
 if(activeBar!==selected){activeBar?.removeAttribute('data-current-pager');selected?.setAttribute('data-current-pager','');activeBar=selected;}
 if(selected&&viewport)selected.style.setProperty('--pager-center',((viewport.left+viewport.right)/2)+'px');
}
function updateDock(){
 candidates=[...document.querySelectorAll('.tab-content.active :is('+pagerSelector+')')];
 placeDock();
}
function scheduleDock(){if(!dockFrame)dockFrame=requestAnimationFrame(placeDock);}
document.addEventListener('scroll',()=>{if(candidates.length>1)scheduleDock();},true);
window.addEventListener('resize',scheduleDock);
const wholeView='#gptDrafts143129,#personalWorkspace1437,.assigned-ledger14281,#transactions-recurring,#userEntryHistoryPanel,#userEntryReviewCards,#finalRecordsOverlay,#budgetHistory14316,#transactions-voided,#auditDetails14361';
function install(table){if(table.dataset.ownPager14383||table.closest(wholeView)||!table.closest('#transactions-journal,#transactions-all')||[...table.tBodies].reduce((n,b)=>n+b.rows.length,0)<=100){const prior=states.get(table);prior?.bar.remove();restoreSpans(table);table.querySelectorAll('[data-page-hidden14383]').forEach(row=>row.removeAttribute('data-page-hidden14383'));states.delete(table);tables.delete(table);return}if(table.closest('#document-editor105,[contenteditable=true],#journalEntry98,.phone-app132,form,.r79-original'))return;const bodies=[...table.tBodies];if(!bodies.length)return;let s=states.get(table);const rows=bodies.flatMap(b=>[...b.rows]);
 if(!s){const bar=document.createElement('div');bar.className='table-pages14383 no-print';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','Table pagination');const prev=document.createElement('button'),label=document.createElement('span'),next=document.createElement('button');prev.type=next.type='button';prev.className=next.className='je-btn je-btn-secondary';prev.textContent='Previous';next.textContent='Next';bar.append(prev,label,next);s={page:0,table,bar,prev,label,next,rows:[]};states.set(table,s);tables.add(table);prev.onclick=()=>turn(s,-1);next.onclick=()=>turn(s,1)}
 if(rows.length!==s.rows.length||rows.some((r,i)=>r!==s.rows[i])){if(!table.dataset.preservePage14397)s.page=0;s.ranges=entryPageRanges14340(rows,r=>r.dataset.entryId,()=>1,r=>[...r.cells].reduce((max,c)=>Math.max(max,c.rowSpan||1),1))}s.rows=rows;const container=table.closest('.table-container,.r79-table,.data-table82')||table;if(container.nextElementSibling!==s.bar)container.after(s.bar);paint(s)}
function turn(s,delta){s.page+=delta;paint(s);s.table.scrollIntoView({block:'start',inline:'nearest',behavior:'instant'})}
function reset(table){const s=states.get(table);if(s)s.page=0}
function refresh(table){install(table)}
function paint(s){const count=s.ranges.length;s.page=Math.max(0,Math.min(s.page,count-1));for(const [i,row] of s.rows.entries()){const [start,end]=s.ranges[s.page],hide=i<start||i>=end;if(row.hasAttribute('data-page-hidden14383')!==hide)row.toggleAttribute('data-page-hidden14383',hide)}const value=`${s.page+1} of ${count}`;if(s.label.textContent!==value)s.label.textContent=value;s.prev.disabled=s.page===0;s.next.disabled=s.page===count-1;s.bar.hidden=count===1;}
function scan(){queued=false;for(const table of tables)if(!table.isConnected){states.get(table)?.bar.remove();tables.delete(table)}document.querySelectorAll('.tab-content.active table,.modal-overlay.active table,.ui-dialog108 table').forEach(install);updateDock()}
function schedule(){if(!queued){queued=true;requestAnimationFrame(scan)}}
function ready(){
 new MutationObserver(records=>{
  for(const r of records){
   if(r.target.closest?.(pagerSelector))continue;
   if(r.target.closest?.('table')||[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&(n.matches('table,'+pagerSelector)||n.querySelector('table,'+pagerSelector)))){
    schedule();break;
   }
  }
 }).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('page113',schedule);scan();
}
window.tablePagination14383={scan,restoreSpans,reset,refresh};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
