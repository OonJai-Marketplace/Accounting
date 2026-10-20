/* Double-entry cells: select once for clipboard operations, edit on double click.
   Only the unsaved entry form participates; posting and saved records are untouched. */
(()=>{'use strict';
const fields='.je-line-acc,.je-line-memo,.je-line-dr,.je-line-cr';
// Explicit form ownership keeps transaction fields separate from credential forms.
window.markJournalInput143127=function(input){if(!input.closest?.('#journalEntry98'))return;let form=document.getElementById('journalDataForm143127');if(!form){form=document.createElement('form');form.id='journalDataForm143127';form.hidden=true;form.autocomplete='off';form.addEventListener('submit',e=>e.preventDefault());document.body.append(form);}input.setAttribute('form',form.id);input.setAttribute('autocomplete','off');input.setAttribute('data-form-type','other');input.setAttribute('data-1p-ignore','true');input.setAttribute('data-lpignore','true');};
let selected=null,editor=null;
const eligible=n=>!!n?.matches?.(fields)&&!!n.closest('#jeLinesBody')&&!n.disabled&&!n.readOnly&&document.documentElement.dataset.device132!=='phone'&&matchMedia('(min-width:641px)').matches;
const inputAt=target=>target.closest?.('#jeLinesBody td')?.querySelector(fields);
function clear(){selected?.closest('td')?.classList.remove('cell-selected143116','cell-editing143116');selected=null;editor=null;}
function select(input){if(!eligible(input))return false;clear();window.dropdown1434?.close();selected=input;const cell=input.closest('td');cell.classList.add('cell-selected143116');cell.tabIndex=-1;cell.focus({preventScroll:true});return true;}
function edit(input,replaceAccount=false){if(!eligible(input))return;clear();selected=editor=input;input.closest('td').classList.add('cell-selected143116','cell-editing143116');input.focus({preventScroll:true});if(replaceAccount&&input.matches('.je-line-acc'))window.dropdown1434?.edit(input);else if(input.setSelectionRange){const end=input.value.length;try{input.setSelectionRange(end,end)}catch{}}}
function finish(input){if(!eligible(input))return false;if(input.checkValidity&&!input.checkValidity()){input.reportValidity();return true;}let emitted=false;const mark=()=>{emitted=true};input.addEventListener('change',mark);input.blur();input.removeEventListener('change',mark);if(!emitted)input.dispatchEvent(new Event('change',{bubbles:true}));window.drafts1427?.flush?.();window.JournalUndo143103?.record();return select(input);}
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
document.addEventListener('dblclick',e=>{const input=inputAt(e.target);if(!eligible(input)||e.ctrlKey||e.metaKey||e.target.closest('.calc-pick14391'))return;if(input===editor)return;e.preventDefault();e.stopImmediatePropagation();edit(input);input.select?.();},true);
// When editing, native text selection/copy/paste remains available. A selected
// cell copies only the input value, never its separate currency badge or checkmark.
for(const type of ['copy','cut'])document.addEventListener(type,e=>{if(!selected?.isConnected||!eligible(selected)||editor||e.target!==selected.closest('td')||!e.clipboardData)return;e.clipboardData.setData('text/plain',selected.value);e.preventDefault();if(type==='cut')replace(selected,'');},true);
document.addEventListener('paste',e=>{if(!selected?.isConnected||!eligible(selected)||editor||e.target!==selected.closest('td')||!e.clipboardData)return;const text=e.clipboardData.getData('text/plain');if(/[\t\r\n]/.test(text.trim()))return;e.preventDefault();if(selected.matches('.je-line-dr,.je-line-cr')){const value=parseAppNumber(text.trim());if(!Number.isFinite(value)||value<0)return;replace(selected,formatAppNumber(value));}else replace(selected,text);},true);
document.addEventListener('keydown',e=>{
 if(!selected?.isConnected||e.isComposing||e.ctrlKey||e.metaKey||e.altKey)return;
 if(editor){if(e.key==='Enter'&&editor.getAttribute('aria-expanded')!=='true'){e.preventDefault();e.stopImmediatePropagation();finish(editor);return;}if(e.key==='Tab'){e.preventDefault();window.dropdown1434?.close();move(editor,e.shiftKey?'Previous':'Next');return;}if(e.key==='Escape'&&editor.getAttribute('aria-expanded')!=='true'){e.preventDefault();select(editor);}return;}
 if(e.target!==selected.closest('td'))return;
 if(e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();return;}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab'].includes(e.key)){e.preventDefault();move(selected,e.key==='Tab'||e.key==='Enter'?(e.shiftKey?'Previous':'Next'):e.key);}
 else if(e.key==='F2'){e.preventDefault();edit(selected,selected.matches('.je-line-acc'));}
 else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();replace(selected,'');}
 else if(e.key.length===1){e.preventDefault();const input=selected;edit(input,input.matches('.je-line-acc'));replace(input,e.key);}
},true);
window.addEventListener('page113',clear);
window.JournalCells143116={select,finish,handles:eligible,navigate(input){if(!eligible(input))return false;if(!input.value)edit(input);else select(input);return true;},editing:input=>input===editor,chosen:input=>eligible(input)?select(input):false};
})();
