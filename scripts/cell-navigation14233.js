/* Spreadsheet navigation commits existing cell editors; posting stays explicit. */
(()=>{'use strict';
const roots='table,[role="grid"],#simpleRows1430,#staffSingleLines,#staffDoubleLines,.audit-line-list14233,form,.tab-content,.screen,[role="dialog"],.modal-dialog,.audit-editor,dialog,#upcomingEditor92,.currency-add-bar',fields='input,select,textarea,[contenteditable="true"],[contenteditable="plaintext-only"]';let sequence=0;
function usable(n){return !n.disabled&&(!n.readOnly||n.getAttribute('role')==='combobox')&&!['hidden','button','submit','reset','file','password','radio'].includes(n.type)&&!n.closest('[hidden],[inert]')&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden'}
function matrix(root){if(!root)return [];const rowSelector=root.matches('table,[role="grid"]')?'tr,[role="row"]':root.id==='simpleRows1430'?'.simple-row1430':root.id==='staffSingleLines'?'[data-staff-single]':root.id==='staffDoubleLines'?'[data-staff-double]':root.matches('.audit-line-list14233')?'.audit-line':null;if(rowSelector)return [...root.querySelectorAll(rowSelector)].filter(r=>r.closest(roots)===root).map(r=>[...r.querySelectorAll(fields)].filter(n=>usable(n)&&n.closest(roots)===root)).filter(r=>r.length);const list=[...root.querySelectorAll(fields)].filter(n=>usable(n)&&n.closest(roots)===root),rows=[];for(const n of list){const y=n.getBoundingClientRect().top,last=rows.at(-1);if(last&&Math.abs(last[0].getBoundingClientRect().top-y)<10)last.push(n);else rows.push([n])}return rows}
function saveButton(root){const context=root.closest('form,[role="dialog"],dialog,#upcomingEditor92,.currency-add-bar');if(!context||context.closest('#loginGate,#settings-recovery113,#operationalReset142,#journalEntry98')||/journal|staff|reset|recovery/i.test(context.id))return null;return [...context.querySelectorAll('button,input[type="submit"]')].find(b=>!b.disabled&&b.getClientRects().length&&!b.closest('[hidden]')&&/^(save|apply|update|create|add currency)\b/i.test((b.textContent.trim()||b.value||'').replace(/^\+\s*/,''))&&!/post|resubmit|delete|reset|archive|restore/i.test(b.textContent)&&!b.matches('.danger,.danger108,.je-btn-danger'))}

function locate(root){const anchor=root.closest('.tab-content[id],main[id],form[id],[role="dialog"][id]')||document.body,id=anchor.id,index=[...anchor.querySelectorAll(roots)].indexOf(root);return ()=>root.isConnected?root:root.id?document.getElementById(root.id):(id?document.getElementById(id):document.body)?.querySelectorAll(roots)[index]}
async function move(n,key,alreadyCommitted=false){const root=n.closest(roots);if(!root)return;const rows=matrix(root),ri=rows.findIndex(r=>r.includes(n));if(ri<0)return;const ci=rows[ri].indexOf(n),flat=rows.flat();let target;
 if(key==='ArrowUp'||key==='ArrowDown'){const next=rows[ri+(key==='ArrowDown'?1:-1)];if(next){const x=n.getBoundingClientRect().left;target=next.reduce((a,b)=>Math.abs(b.getBoundingClientRect().left-x)<Math.abs(a.getBoundingClientRect().left-x)?b:a)}}else target=flat[flat.indexOf(n)+(key==='ArrowLeft'||key==='Previous'?-1:1)];
 if(key==='Enter'&&!target){const outer=root.parentElement?.closest('form,[role="dialog"],dialog');if(outer){const all=[...outer.querySelectorAll(fields)].filter(usable);target=all[all.indexOf(n)+1]}}
 const resolve=locate(root),tr=target?rows.findIndex(r=>r.includes(target)):ri,tc=target&&tr>=0?rows[tr].indexOf(target):ci,id=target?.id;const token=++sequence;
 if(n.checkValidity&&!n.checkValidity()){n.reportValidity();return}
 if(n.type==='checkbox'&&key==='Enter')n.checked=!n.checked;
 let emitted=false;const changed=e=>{emitted=true;if(alreadyCommitted)e.stopImmediatePropagation()};n.addEventListener('change',changed,true);n.blur();if(!emitted&&!alreadyCommitted)n.dispatchEvent(new Event('change',{bubbles:true}));n.removeEventListener('change',changed,true);
 if(n.isConnected&&n.checkValidity&&!n.checkValidity()){n.focus();n.reportValidity();return}
 window.drafts1427?.flush?.();
 if(key==='Enter'&&n.dataset.inlineUser117)await window.workspaceCellCommit14233?.(n.dataset.inlineUser117,n.dataset.inlineRow117);
 if(token!==sequence)return;
 if(key==='Enter'&&!target){const save=saveButton(root);if(save){if(save.form&&save.type==='submit')save.form.requestSubmit(save);else save.click();return}}
 requestAnimationFrame(()=>{if(token!==sequence)return;const host=resolve(),grid=host&&matrix(host),next=(target?.isConnected&&usable(target)?target:null)||(id&&document.getElementById(id))||grid?.[tr]?.[tc];if(next&&usable(next)){if(window.JournalCells143116?.navigate(next)){next.scrollIntoView({block:'nearest',inline:'nearest'});return}next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});if(next.tagName==='INPUT'&&!next.readOnly&&next.type!=='number'&&next.inputMode!=='decimal'&&next.inputMode!=='numeric'&&typeof next.select==='function')try{next.select()}catch{}}});
}
document.addEventListener('pointerdown',()=>sequence++,true);
document.addEventListener('keydown',e=>{if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key))return;const n=e.target;if(!n.matches?.(fields)||!usable(n)||!n.closest(roots)||n.closest('#loginGate,#settings-recovery113,#operationalReset142,.scope-picker14233,#document-editor105'))return;if(n.matches('textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')&&e.shiftKey&&e.key==='Enter')return;
 const expanded=n.getAttribute('role')==='combobox'&&n.getAttribute('aria-expanded')==='true';if(expanded){if(e.key==='Enter'){const root=n.closest(roots),resolve=locate(root),row=matrix(root),r=row.findIndex(x=>x.includes(n)),c=row[r]?.indexOf(n);setTimeout(()=>{if(n.getAttribute('aria-expanded')==='false'){const current=n.isConnected?n:matrix(resolve()||root)[r]?.[c];if(current)move(current,'Enter',true)}})}return}
 e.preventDefault();e.stopImmediatePropagation();move(n,e.shiftKey&&e.key==='Enter'?'Previous':e.key);
},true);
window.cellNavigation14233={matrix,move};
})();
/* Journal spreadsheet cell editing */
/* Double-entry cells: select once for clipboard operations, edit on double click.
   Only the unsaved entry form participates; posting and saved records are untouched. */
(()=>{'use strict';
const fields='.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr';
let selected=null,editor=null;
const eligible=n=>!!n?.matches?.(fields)&&!!n.closest('#jeLinesBody')&&!n.disabled&&!n.readOnly&&document.documentElement.dataset.device132!=='phone'&&matchMedia('(min-width:641px)').matches;
const inputAt=target=>target.closest?.('#jeLinesBody td')?.querySelector(fields);
function clear(){selected?.closest('td')?.classList.remove('cell-selected143116','cell-editing143116');selected=null;editor=null;}
function select(input){if(!eligible(input))return false;clear();window.dropdown1434?.close();selected=input;const cell=input.closest('td');cell.classList.add('cell-selected143116');cell.tabIndex=-1;cell.focus({preventScroll:true});return true;}
function edit(input,replaceAccount=false){if(!eligible(input))return;clear();selected=editor=input;input.closest('td').classList.add('cell-selected143116','cell-editing143116');input.focus({preventScroll:true});if(replaceAccount&&input.matches('.je-line-acc'))window.dropdown1434?.edit(input);else if(input.setSelectionRange){const end=input.value.length;try{input.setSelectionRange(end,end)}catch{}}}
function changed(input){input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));window.JournalUndo143103?.record();}
function replace(input,text){window.JournalUndo143103?.checkpoint();input.value=text;changed(input);}
function move(input,key){const rows=[...document.querySelectorAll('#jeLinesBody tr')].map(row=>[...row.querySelectorAll(fields)].filter(eligible)),r=rows.findIndex(row=>row.includes(input));if(r<0)return;const col=rows[r].indexOf(input),flat=rows.flat();const target=key==='ArrowUp'||key==='ArrowDown'?rows[r+(key==='ArrowDown'?1:-1)]?.[col]:flat[flat.indexOf(input)+(key==='ArrowLeft'||key==='Previous'?-1:1)];if(target){if(!target.value)edit(target);else select(target);target.scrollIntoView({block:'nearest',inline:'nearest'});}}
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.ctrlKey||e.metaKey||e.target.closest?.('.calc-pick14391,.account-list1428'))return;
 const input=inputAt(e.target);if(!eligible(input)){if(selected&&!e.target.closest?.('.account-list1428'))clear();return;}
 if(input===editor)return;
 e.preventDefault();
 if(!input.value){edit(input);return;}
 e.stopPropagation();select(input);
},true);
document.addEventListener('focusin',e=>{if(eligible(e.target)&&e.target!==editor)select(e.target);},true);
document.addEventListener('click',e=>{const input=inputAt(e.target);if(input===selected&&input!==editor&&!e.ctrlKey&&!e.metaKey&&!e.target.closest('.calc-pick14391')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('dblclick',e=>{const input=inputAt(e.target);if(!eligible(input)||e.ctrlKey||e.metaKey||e.target.closest('.calc-pick14391'))return;e.preventDefault();e.stopImmediatePropagation();edit(input,input.matches('.je-line-acc'));},true);
// When editing, native text selection/copy/paste remains available. A selected
// cell copies only the input value, never its separate currency badge or checkmark.
for(const type of ['copy','cut'])document.addEventListener(type,e=>{if(!selected?.isConnected||!eligible(selected)||editor||e.target!==selected.closest('td')||!e.clipboardData)return;e.clipboardData.setData('text/plain',selected.value);e.preventDefault();if(type==='cut')replace(selected,'');},true);
document.addEventListener('paste',e=>{if(!selected?.isConnected||!eligible(selected)||editor||e.target!==selected.closest('td')||!e.clipboardData)return;const text=e.clipboardData.getData('text/plain');if(/[\t\r\n]/.test(text.trim()))return;e.preventDefault();if(selected.matches('.je-line-dr,.je-line-cr')){const value=parseAppNumber(text.trim());if(!Number.isFinite(value)||value<0)return;replace(selected,formatAppNumber(value));}else replace(selected,text);},true);
document.addEventListener('keydown',e=>{
 if(!selected?.isConnected||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
 if(editor){if(e.key==='Tab'){e.preventDefault();window.dropdown1434?.close();move(editor,e.shiftKey?'Previous':'Next');return;}if(e.key==='Escape'&&editor.getAttribute('aria-expanded')!=='true'){e.preventDefault();select(editor);}return;}
 if(e.target!==selected.closest('td'))return;
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter'].includes(e.key)){e.preventDefault();move(selected,e.key==='Tab'||e.key==='Enter'?(e.shiftKey?'Previous':'Next'):e.key);}
 else if(e.key==='F2'){e.preventDefault();edit(selected,selected.matches('.je-line-acc'));}
 else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();replace(selected,'');}
 else if(e.key.length===1){e.preventDefault();const input=selected;edit(input,input.matches('.je-line-acc'));replace(input,e.key);}
},true);
window.addEventListener('page113',clear);
window.JournalCells143116={select,navigate(input){if(!eligible(input))return false;if(!input.value)edit(input);else select(input);return true;},editing:input=>input===editor,chosen:input=>eligible(input)?select(input):false};
})();
;
/* Header column resizing */
/* Header-only column resizing. No body-cell listeners or drag-time row scans. */
(()=>{'use strict';
const states=new WeakMap(),pending=new Set();let queued=false,drag=null,suppressClick=false;
const storageKey=()=> 'ojm-table-widths143117:'+String(typeof liveProfile==='undefined'?'device':liveProfile?.id||'device');
function saved(){try{return JSON.parse(localStorage.getItem(storageKey())||'{}')}catch{return {}}}
function headerRows(table){if(table.tHead)return [...table.tHead.rows];const rows=[];for(const row of table.rows){if(!row.cells.length||![...row.cells].every(c=>c.tagName==='TH'))break;rows.push(row);}return rows;}
function headers(table){return headerRows(table).flatMap(row=>[...row.cells]).filter(c=>c.closest('table')===table);}
function identity(table,heads){const section=table.closest('[id]');return [table.id||section?.id||location.pathname,...heads.map(h=>h.textContent.trim())].join('|');}
function grid(table){const rows=headerRows(table),occupied=[],cells=[];let count=0;rows.forEach((row,r)=>{occupied[r]||=[];let col=0;for(const h of row.cells){while(occupied[r][col])col++;const span=h.colSpan||1;cells.push({h,start:col,end:col+span});for(let y=r;y<r+(h.rowSpan||1);y++){occupied[y]||=[];for(let x=col;x<col+span;x++)occupied[y][x]=true;}col+=span;count=Math.max(count,col);}});return {cells,count};}
function apply(s,widths){const {table}=s;if(!s.initialized){s.original=table.getAttribute('style');s.headerStyles=s.cells.map(c=>[c.h,c.h.getAttribute('style')]);s.oldGroups=[...table.children].filter(n=>n.tagName==='COLGROUP');s.oldGroups.forEach(g=>g.remove());s.cols=document.createElement('colgroup');s.cols.dataset.resize143117='1';for(let i=0;i<s.count;i++)s.cols.append(document.createElement('col'));table.prepend(s.cols);s.initialized=true;}
 s.widths=widths;table.style.setProperty('table-layout','fixed','important');table.style.setProperty('width',widths.reduce((a,b)=>a+b,0)+'px','important');table.style.setProperty('min-width','0','important');table.style.setProperty('max-width','none','important');
 [...s.cols.children].forEach((col,i)=>col.style.setProperty('width',widths[i]+'px','important'));
 for(const {h,start,end} of s.cells){h.style.setProperty('width',widths.slice(start,end).reduce((a,b)=>a+b,0)+'px','important');h.style.setProperty('min-width','0','important');h.style.setProperty('max-width','none','important');}
 table.classList.add('table-resized143117');
}
function restoreLayout(s){const {table}=s;if(s.initialized){s.cols.remove();s.oldGroups.forEach(g=>table.prepend(g));s.original===null?table.removeAttribute('style'):table.setAttribute('style',s.original);s.headerStyles.forEach(([h,style])=>style===null?h.removeAttribute('style'):h.setAttribute('style',style));table.classList.remove('table-resized143117');s.original=null;s.initialized=false;}}
function reset(table){const s=states.get(table);if(!s)return;restoreLayout(s);const all=saved();delete all[s.key];try{localStorage.setItem(storageKey(),JSON.stringify(all))}catch{}s.widths=null;}
function install(table){if(!table?.isConnected)return;const heads=headers(table);if(!heads.length)return;let s=states.get(table);if(s&&s.owner===storageKey()&&heads.every((h,i)=>h===s.heads[i])&&heads.length===s.heads.length)return;if(s)restoreLayout(s);const layout=grid(table);s={table,heads,...layout,owner:storageKey(),key:identity(table,heads)};states.set(table,s);
 for(const c of s.cells){if(c.h.querySelector(':scope > .column-resize143117'))continue;const handle=document.createElement('span');handle.className='column-resize143117 no-print';handle.tabIndex=0;handle.setAttribute('role','separator');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label','Resize '+c.h.textContent.trim()+' column');handle.title='Drag to resize. Double-click to reset table widths.';handle.dataset.end143117=c.end-1;c.h.classList.add('column-header143117');c.h.append(handle);}
 const widths=saved()[s.key];if(Array.isArray(widths)&&widths.length===s.count&&widths.every(w=>Number.isFinite(w)&&w>=40&&w<=2400))apply(s,widths);
}
function measure(s){if(s.widths)return [...s.widths];const left=s.table.getBoundingClientRect().left,edges=Array(s.count+1).fill(null);edges[0]=0;edges[s.count]=s.table.getBoundingClientRect().width;for(const c of s.cells){const r=c.h.getBoundingClientRect();if(!r.width)continue;edges[c.start]=r.left-left;edges[c.end]=r.right-left;}for(let i=1;i<edges.length;i++)if(edges[i]===null){let end=i+1;while(edges[end]===null)end++;const start=i-1,step=(edges[end]-edges[start])/(end-start);for(;i<end;i++)edges[i]=edges[start]+step*(i-start);i--;}
 return edges.slice(1).map((v,i)=>Math.max(40,v-edges[i]));}
function persist(s){const all=saved();all[s.key]=s.widths;try{localStorage.setItem(storageKey(),JSON.stringify(all))}catch{}}
function paint(){if(!drag)return;drag.frame=0;const widths=[...drag.widths];widths[drag.index]=Math.max(40,Math.min(2400,drag.widths[drag.index]+drag.x-drag.start));apply(drag.s,widths);}
function finish(e){if(!drag||e.pointerId!==drag.pointer)return;if(drag.frame)cancelAnimationFrame(drag.frame);paint();persist(drag.s);drag=null;document.documentElement.classList.remove('resizing-column143117');document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',finish,true);document.removeEventListener('pointercancel',finish,true);setTimeout(()=>suppressClick=false,0);}
function move(e){if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();drag.x=e.clientX;if(!drag.frame)drag.frame=requestAnimationFrame(paint);}
document.addEventListener('pointerdown',e=>{const h=e.target.closest?.('.column-resize143117');if(!h||e.button!==0)return;const s=states.get(h.closest('table'));if(!s)return;e.preventDefault();e.stopImmediatePropagation();suppressClick=true;drag={s,pointer:e.pointerId,index:Number(h.dataset.end143117),widths:measure(s),start:e.clientX,x:e.clientX};document.documentElement.classList.add('resizing-column143117');document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',finish,true);},true);
document.addEventListener('click',e=>{if(suppressClick||e.target.closest?.('.column-resize143117')){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('dblclick',e=>{if(e.target.closest?.('.column-resize143117')){e.preventDefault();e.stopImmediatePropagation();reset(e.target.closest('table'));}},true);
document.addEventListener('keydown',e=>{const h=e.target.closest?.('.column-resize143117');if(!h||!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();const table=h.closest('table'),s=states.get(table);if(e.key==='Home')return reset(table);const widths=measure(s),i=Number(h.dataset.end143117);widths[i]=Math.max(40,Math.min(2400,widths[i]+(e.key==='ArrowLeft'?-10:10)));apply(s,widths);persist(s);},true);
function queue(table){if(table)pending.add(table);if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;for(const t of pending)install(t);pending.clear();});}}
function discover(node){if(node.nodeType!==1||node.closest('tbody,tfoot,.column-resize143117'))return;if(node.matches('table'))queue(node);else if(node.closest('thead'))queue(node.closest('table'));else node.querySelectorAll('table').forEach(queue);}
function ready(){const style=document.createElement('style');style.textContent='@media screen{.column-header143117{position:relative}.column-resize143117{position:absolute;right:-1px;top:0;bottom:0;width:9px;cursor:col-resize;touch-action:none;z-index:6}.column-resize143117:hover,.column-resize143117:focus-visible{background:#05966966;outline:1px solid #059669}.resizing-column143117,.resizing-column143117 *{cursor:col-resize!important;user-select:none!important}}@media print{.column-resize143117{display:none!important}}';document.head.append(style);document.querySelectorAll('table').forEach(queue);new MutationObserver(records=>{for(const r of records){if(r.target.closest?.('tbody,tfoot,.column-resize143117'))continue;for(const n of r.addedNodes)discover(n);}}).observe(document.body,{subtree:true,childList:true});}
const printing=[];window.addEventListener('beforeprint',()=>{for(const table of document.querySelectorAll('.table-resized143117')){const s=states.get(table);if(s){printing.push(s);restoreLayout(s);}}});window.addEventListener('afterprint',()=>{for(const s of printing.splice(0))if(s.table.isConnected)apply(s,s.widths);});
window.addEventListener('page113',()=>document.querySelectorAll('table').forEach(queue));
window.tableResize143117={reset,install};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
;
