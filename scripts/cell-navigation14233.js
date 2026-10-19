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
 requestAnimationFrame(()=>{if(token!==sequence)return;const host=resolve(),grid=host&&matrix(host),next=(target?.isConnected&&usable(target)?target:null)||(id&&document.getElementById(id))||grid?.[tr]?.[tc];if(next&&usable(next)){if(window.JournalCells143116?.select(next)){next.scrollIntoView({block:'nearest',inline:'nearest'});return}next.focus({preventScroll:true});next.scrollIntoView({block:'nearest',inline:'nearest'});if(next.tagName==='INPUT'&&!next.readOnly&&next.type!=='number'&&next.inputMode!=='decimal'&&next.inputMode!=='numeric'&&typeof next.select==='function')try{next.select()}catch{}}});
}
document.addEventListener('pointerdown',()=>sequence++,true);
document.addEventListener('keydown',e=>{if(e.isComposing||e.ctrlKey||e.metaKey||e.altKey||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key))return;const n=e.target;if(window.JournalCells143116?.editing(n)&&e.key.startsWith('Arrow'))return;if(!n.matches?.(fields)||!usable(n)||!n.closest(roots)||n.closest('#loginGate,#settings-recovery113,#operationalReset142,.scope-picker14233,#document-editor105'))return;if(n.matches('textarea,[contenteditable="true"],[contenteditable="plaintext-only"]')&&e.shiftKey&&e.key==='Enter')return;
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
function move(input,key){const rows=[...document.querySelectorAll('#jeLinesBody tr')].map(row=>[...row.querySelectorAll(fields)].filter(eligible)),r=rows.findIndex(row=>row.includes(input));if(r<0)return;const col=rows[r].indexOf(input),flat=rows.flat();const target=key==='ArrowUp'||key==='ArrowDown'?rows[r+(key==='ArrowDown'?1:-1)]?.[col]:flat[flat.indexOf(input)+(key==='ArrowLeft'||key==='Previous'?-1:1)];if(target){select(target);target.scrollIntoView({block:'nearest',inline:'nearest'});}}
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
window.JournalCells143116={select,editing:input=>input===editor,chosen:input=>eligible(input)?select(input):false};
})();
;
