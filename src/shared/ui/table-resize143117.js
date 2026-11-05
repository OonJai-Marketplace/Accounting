/* Header-only column resizing. No body-cell listeners or drag-time row scans. */
(()=>{'use strict';
const states=new WeakMap(),pending=new Set();let queued=false,drag=null,suppressClick=false;
const storageKey=()=> 'ojm-table-widths143296:'+String(typeof liveProfile==='undefined'?'device':liveProfile?.id||'device');
function saved(key=storageKey()){try{return JSON.parse(localStorage.getItem(key)||'{}')}catch{return {}}}
function headerRows(table){if(table.tHead)return [...table.tHead.rows];const rows=[];for(const row of table.rows){if(!row.cells.length||![...row.cells].every(c=>c.tagName==='TH'))break;rows.push(row);}return rows;}
function headers(table){return headerRows(table).flatMap(row=>[...row.cells]).filter(c=>c.closest('table')===table);}
function identity(table,heads){const section=table.closest('[id]');return [table.id||section?.id||location.pathname,...heads.map(h=>h.dataset.resizeLabel||h.textContent.trim())].join('|');}
// Reuse the normal table layout while it fits. Only overflowing workspace tables
// get proportional columns; manual widths and document/print layouts take priority.
const fitBoxes=new WeakMap();
const fitObserver=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{
 for(const {target} of entries){const tables=fitBoxes.get(target);if(!tables)continue;
  for(const table of tables){if(table.parentElement===target)queue(table);else tables.delete(table);}
 }
}):null;
function fit(s){
 const {table}=s,box=table.parentElement;
 if(!box||!table.closest('.tab-content,dialog')||table.closest('.attendance-grid99,.print-page,[contenteditable=true],.voucher-paper,.salary-paper')||s.widths)return;
 if(fitObserver&&!fitBoxes.get(box)?.has(table)){
  if(!fitBoxes.has(box)){fitBoxes.set(box,new Set());fitObserver.observe(box);}
  fitBoxes.get(box).add(table);
 }
 if(!table.offsetWidth)return;
 const style=getComputedStyle(box);
 const available=box.clientWidth-parseFloat(style.paddingLeft||0)-parseFloat(style.paddingRight||0);
 if(available<=0)return;
 if(table.classList.contains('workspace-fit296')){
  if(available<s.naturalWidth)return;
  table.classList.remove('workspace-fit296');for(const h of s.heads)h.style.removeProperty('--fitted-column296');
 }
 const natural=table.offsetWidth;if(natural<=available+1)return;
 const measured=measure(s),sum=measured.reduce((a,b)=>a+b,0);
 for(const {h,start,end} of s.cells){
  const width=100*measured.slice(start,end).reduce((a,b)=>a+b,0)/sum;
  h.style.setProperty('--fitted-column296',width+'%');
 }
 s.naturalWidth=natural;table.classList.add('workspace-fit296');
}
function grid(table){const rows=headerRows(table),occupied=[],cells=[];let count=0;rows.forEach((row,r)=>{occupied[r]||=[];let col=0;for(const h of row.cells){if(getComputedStyle(h).display==='none')continue;while(occupied[r][col])col++;const span=h.colSpan||1;cells.push({h,start:col,end:col+span});for(let y=r;y<r+(h.rowSpan||1);y++){occupied[y]||=[];for(let x=col;x<col+span;x++)occupied[y][x]=true;}col+=span;count=Math.max(count,col);}});return {cells,count};}
function apply(s,widths){const {table}=s;if(!s.initialized){s.original=table.getAttribute('style');s.headerStyles=s.cells.map(c=>[c.h,c.h.getAttribute('style')]);s.oldGroups=[...table.children].filter(n=>n.tagName==='COLGROUP');s.oldGroups.forEach(g=>g.remove());// Single header rows use their own widths. A separate compressed COLGROUP
// can assign widths to the wrong native table column when Date is hidden.
s.cols=null;if(document.documentElement.dataset.device132!=='tablet'||headerRows(table).length>1){s.cols=document.createElement('colgroup');s.cols.dataset.resize143117='1';for(let i=0;i<s.count;i++)s.cols.append(document.createElement('col'));table.prepend(s.cols);}s.initialized=true;}
 s.widths=widths;table.style.setProperty('table-layout','fixed','important');table.style.setProperty('width',widths.reduce((a,b)=>a+b,0)+'px','important');table.style.setProperty('min-width','0','important');table.style.setProperty('max-width','none','important');
 [...(s.cols?.children||[])].forEach((col,i)=>col.style.setProperty('width',widths[i]+'px','important'));
 for(const {h,start,end} of s.cells){h.style.setProperty('box-sizing','border-box','important');h.style.setProperty('width',widths.slice(start,end).reduce((a,b)=>a+b,0)+'px','important');h.style.setProperty('min-width','0','important');h.style.setProperty('max-width','none','important');}
 table.classList.add('table-resized143117');
}
function restoreLayout(s){const {table}=s;if(s.initialized){s.cols?.remove();s.oldGroups.forEach(g=>table.prepend(g));s.original===null?table.removeAttribute('style'):table.setAttribute('style',s.original);s.headerStyles.forEach(([h,style])=>style===null?h.removeAttribute('style'):h.setAttribute('style',style));table.classList.remove('table-resized143117');s.original=null;s.initialized=false;}}
function reset(table){const s=states.get(table);if(!s)return;restoreLayout(s);const all=saved();all[s.key]=null;try{localStorage.setItem(storageKey(),JSON.stringify(all))}catch{}s.widths=null;queue(table);}
function install(table){if(!table?.isConnected)return;if(table.matches('.attendance-grid99')){reset(table);table.querySelectorAll('.column-resize143117').forEach(h=>h.remove());table.querySelectorAll('.column-header143117').forEach(h=>h.classList.remove('column-header143117'));states.delete(table);return;}const layout=grid(table),heads=layout.cells.map(c=>c.h);if(!heads.length)return;for(const h of heads){h.classList.add('column-header143117');h.style.setProperty('position','relative','important');}let s=states.get(table);if(s&&s.owner===storageKey()&&heads.every((h,i)=>h===s.heads[i]&&layout.cells[i].start===s.cells[i].start&&layout.cells[i].end===s.cells[i].end)&&heads.length===s.heads.length){fit(s);return;}if(s)restoreLayout(s);table.classList.remove('workspace-fit296');for(const h of headers(table))if(!heads.includes(h))h.querySelector(':scope > .column-resize143117')?.remove();s={table,heads,...layout,owner:storageKey(),key:identity(table,heads)};states.set(table,s);
 for(const c of s.cells){const existing=c.h.querySelector(':scope > .column-resize143117');if(existing){existing.dataset.end143117=c.end-1;continue;}const handle=document.createElement('span');handle.className='column-resize143117 no-print';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+c.h.textContent.trim()+' column');handle.title='Drag to resize. Double-click to reset table widths.';handle.dataset.end143117=c.end-1;c.h.classList.add('column-header143117');c.h.style.setProperty('position','relative','important');c.h.append(handle);}
 const prefs=saved();let widths=prefs[s.key];
 // Keep older manual widths only where the saved table still fits this screen.
 if(widths===undefined&&table.offsetWidth){
  const previous=saved(storageKey().replace('143296','143117'))[s.key];
  if(Array.isArray(previous)&&previous.reduce((sum,w)=>sum+w,0)<=table.parentElement.clientWidth)widths=previous;
 }
 if(Array.isArray(widths)&&widths.length===s.count&&widths.every(w=>Number.isFinite(w)&&w>=40&&w<=2400))apply(s,widths);else fit(s);
}
function measure(s){if(s.widths)return [...s.widths];const left=s.table.getBoundingClientRect().left,edges=Array(s.count+1).fill(null);edges[0]=0;edges[s.count]=s.table.getBoundingClientRect().width;for(const c of s.cells){const r=c.h.getBoundingClientRect();if(!r.width)continue;edges[c.start]=r.left-left;edges[c.end]=r.right-left;}for(let i=1;i<edges.length;i++)if(edges[i]===null){let end=i+1;while(edges[end]===null)end++;const start=i-1,step=(edges[end]-edges[start])/(end-start);for(;i<end;i++)edges[i]=edges[start]+step*(i-start);i--;}
 return edges.slice(1).map((v,i)=>Math.max(40,v-edges[i]));}
function persist(s){const all=saved();all[s.key]=s.widths;try{localStorage.setItem(storageKey(),JSON.stringify(all))}catch{}}
function paint(){if(!drag)return;drag.frame=0;const widths=[...drag.widths];widths[drag.index]=Math.max(40,Math.min(2400,drag.widths[drag.index]+drag.x-drag.start));apply(drag.s,widths);}
function finish(e){if(!drag||e.pointerId!==drag.pointer)return;if(drag.frame)cancelAnimationFrame(drag.frame);paint();persist(drag.s);drag=null;document.documentElement.classList.remove('resizing-column143117');document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',finish,true);document.removeEventListener('pointercancel',finish,true);setTimeout(()=>suppressClick=false,0);}
function move(e){if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();drag.x=e.clientX;if(!drag.frame)drag.frame=requestAnimationFrame(paint);}
document.addEventListener('pointerdown',e=>{const h=e.target.closest?.('.column-resize143117');if(!h||e.button!==0)return;install(h.closest('table'));const s=states.get(h.closest('table'));if(!s||!h.isConnected)return;e.preventDefault();e.stopImmediatePropagation();const column=s.cells.find(c=>c.h===h.parentElement);if(!column)return;suppressClick=true;h.setPointerCapture?.(e.pointerId);drag={s,pointer:e.pointerId,index:column.end-1,widths:measure(s),start:e.clientX,x:e.clientX};document.documentElement.classList.add('resizing-column143117');document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',finish,true);},true);
document.addEventListener('click',e=>{if(suppressClick||e.target.closest?.('.column-resize143117')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('dblclick',e=>{if(e.target.closest?.('.column-resize143117')){e.preventDefault();e.stopImmediatePropagation();reset(e.target.closest('table'));}},true);
document.addEventListener('keydown',e=>{const h=e.target.closest?.('.column-resize143117');if(!h||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const table=h.closest('table');install(table);const s=states.get(table);if(!s||!h.isConnected)return;if(e.key==='Home')return reset(table);const column=s.cells.find(c=>c.h===h.parentElement);if(!column)return;const widths=measure(s),i=column.end-1;widths[i]=Math.max(40,Math.min(2400,widths[i]+(e.key==='ArrowLeft'?-10:10)));apply(s,widths);persist(s);},true);
function queue(table){if(table)pending.add(table);if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;for(const t of pending)install(t);pending.clear();});}}
function discover(node){if(node.nodeType!==1||node.closest('tbody,tfoot,.column-resize143117'))return;if(node.matches('table'))queue(node);else if(node.closest('thead'))queue(node.closest('table'));else node.querySelectorAll('table').forEach(queue);}
function ready(){const style=document.createElement('style');style.textContent='@media screen{.column-header143117{position:relative}.column-resize143117{position:absolute;right:-1px;top:0;bottom:0;width:9px;cursor:col-resize;touch-action:none;z-index:6}.column-resize143117:hover,.column-resize143117:focus-visible{background:#05966966;outline:1px solid #059669}.resizing-column143117,.resizing-column143117 *{cursor:col-resize!important;user-select:none!important;-webkit-user-select:none!important}html[data-device132=tablet] .column-header143117,html[data-device132=tablet] .column-header143117 *{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none}html[data-device132=tablet] .column-resize143117{width:44px;right:0;top:-8px;bottom:-8px;touch-action:none!important}html[data-device132=tablet] .column-resize143117:after{content:\'\';position:absolute;right:0;top:20%;bottom:20%;width:3px;background:#648a73;border-radius:2px}}@media print{.column-resize143117{display:none!important}}';document.head.append(style);document.querySelectorAll('table').forEach(queue);new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'){if(r.target===document.body||r.target===document.documentElement)document.querySelectorAll('table').forEach(queue);else if(r.target.closest?.('thead'))queue(r.target.closest('table'));continue;}if(r.target.closest?.('tbody,tfoot,.column-resize143117'))continue;for(const n of r.addedNodes)discover(n);}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','colspan','rowspan']});}
const printing=[];window.addEventListener('beforeprint',()=>{for(const table of document.querySelectorAll('.table-resized143117')){const s=states.get(table);if(s){printing.push(s);restoreLayout(s);}}});window.addEventListener('afterprint',()=>{for(const s of printing.splice(0))if(s.table.isConnected)apply(s,s.widths);});
window.addEventListener('page113',()=>document.querySelectorAll('table').forEach(queue));
window.tableResize143117={reset,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
