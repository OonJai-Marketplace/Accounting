/* Local editor history only. Never reverses a saved posting or a server mutation. */
(()=>{'use strict';
const $=id=>document.getElementById(id),limit=100;
let owner='',client=null,undo=[],redo=[],last=null,restoring=false,queued=false,lastGroup='',lastTime=0,actionDepth=0;
const card=()=>$('journalEntry98');
const context=()=>JSON.stringify([typeof liveProfile==='undefined'?'':liveProfile?.id,card()?.dataset.personalOwner1437||'',typeof JournalModule==='undefined'?'':JournalModule.editingEntryId||'',typeof pendingWorkspacePostJournalId==='undefined'?'':pendingWorkspacePostJournalId||'',JSON.stringify(card()?._editIds1437||[])]);
function capture(){const root=card();if(!root||typeof snapshotJournal69!=='function')return null;
 const fields={};for(const n of root.querySelectorAll('input[id],select[id],textarea[id]'))if(!n.closest('#jeLinesBody,#simpleRows1430')&&!n.classList.contains('account-search1428'))fields[n.id]=['checkbox','radio'].includes(n.type)?n.checked:n.value;
 const drafts=[...root.querySelectorAll('#simpleRows1430 .simple-row1430')].map(row=>[...row.querySelectorAll('input.account-search1428')].map(n=>({draft:n.dataset.pickerDraft1444==='true',value:n.value})));
 return JSON.parse(JSON.stringify({journal:snapshotJournal69(),rowData:[...root.querySelectorAll('#jeLinesBody tr')].map(r=>({...r.dataset})),fields,mode:window.entry1430?.mode,single:window.entry1430?.read(),retained:window.entry1430?.retained,drafts}));
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function reset(){owner=context();client=typeof ojmDb==='undefined'?null:ojmDb;undo=[];redo=[];last=capture();lastGroup='';}
function readyContext(){if(owner!==context()||client!==(typeof ojmDb==='undefined'?null:ojmDb)||!last)reset();return last;}
function checkpoint(group=''){if(restoring||actionDepth||!readyContext())return;const next=capture();if(same(next,last))return;const now=performance.now();if(!group||group!==lastGroup||now-lastTime>700){undo.push(last);if(undo.length>limit)undo.shift()}redo=[];last=next;lastGroup=group;lastTime=now;}
function schedule(group=''){if(queued||restoring)return;queued=true;queueMicrotask(()=>{queued=false;checkpoint(group)})}
function focusKey(n){n=window.JournalMemoLinks143187?.field(n)||n;const root=card(),row=n?.closest('#jeLinesBody tr,#simpleRows1430 .simple-row1430');return {id:n?.id||'',row:row?[...row.parentElement.children].indexOf(row):-1,simple:!!row?.classList.contains('simple-row1430'),field:row?[...row.querySelectorAll('input,select,textarea')].indexOf(n):-1,start:n?.selectionStart,end:n?.selectionEnd};}
function restore(s,focus){restoring=true;try{
 window.dropdown1434?.close();window.JournalCalculation14391?.clear();window.entry1430?.restore('double',[]);
 for(const [id,value] of Object.entries(s.fields)){const n=$(id);if(n){if(['checkbox','radio'].includes(n.type))n.checked=value;else n.value=value}}
 document.body.classList.toggle('je-multi-date',!!$('jeMultipleDates')?.checked);
 restoreJournal69(s.journal);window.entry1430?.restore(s.mode,s.single,s.retained);
 [...card().querySelectorAll('#jeLinesBody tr')].forEach((r,i)=>Object.assign(r.dataset,s.rowData[i]||{}));
 window.JournalFX14383?.restore(s.journal.fxRates||{});window.dropdown1434?.enhance(card());
 [...card().querySelectorAll('#simpleRows1430 .simple-row1430')].forEach((row,i)=>{[...row.querySelectorAll('input.account-search1428')].forEach((n,j)=>{const saved=s.drafts[i]?.[j];if(saved?.draft){n.dataset.pickerDraft1444='true';n.value=saved.value;const source=window.dropdown1434?.source(n);if(source)source.selectedIndex=-1;n.setCustomValidity(n.value.trim()?'Choose a matching option from the list.':'')}})});
 calculateJournalBalance();$('jeGeneralMemo')?.dispatchEvent(new Event('input',{bubbles:true}));window.drafts1427?.flush();
 window.JournalMemoLinks143187?.scan(card());
 const row=focus.row>=0?card().querySelectorAll(focus.simple?'#simpleRows1430 .simple-row1430':'#jeLinesBody tr')[focus.row]:null;
 const target=focus.id?$(focus.id):row?.querySelectorAll('input,select,textarea')[focus.field];if(target&&!target.disabled){target.focus({preventScroll:true});if(typeof focus.start==='number'&&typeof target.setSelectionRange==='function')try{target.setSelectionRange(focus.start,focus.end)}catch{}}
 last=capture();lastGroup='';
 }finally{restoring=false}}
function travel(forward,target){readyContext();checkpoint();const from=forward?redo:undo,to=forward?undo:redo,s=from.pop();if(!s)return false;to.push(last);restore(s,focusKey(target||document.activeElement));return true;}
function inEditor(n){return n?.closest?.('#journalEntry98')&&!n.disabled&&!n.readOnly;}
function ready(){
 const root=card();if(!root)return;
 document.addEventListener('keydown',e=>{if(!inEditor(e.target)||e.isComposing||!(e.ctrlKey||e.metaKey)||!['z','y'].includes(e.key.toLowerCase()))return;e.preventDefault();e.stopImmediatePropagation();travel(e.key.toLowerCase()==='y'||e.shiftKey,e.target)},true);
 document.addEventListener('beforeinput',e=>{if(!inEditor(e.target))return;if(['historyUndo','historyRedo'].includes(e.inputType)){e.preventDefault();e.stopImmediatePropagation();travel(e.inputType==='historyRedo',e.target)}else{checkpoint();if(e.target.selectionStart!==e.target.selectionEnd||e.inputType==='insertReplacementText')lastGroup=''}},true);
 root.addEventListener('pointerdown',()=>checkpoint(),true);
 root.addEventListener('click',()=>{checkpoint();schedule()},true);
 for(const type of ['input','change'])root.addEventListener(type,e=>schedule(type==='input'&&e.isTrusted?(e.target.id||e.target.className)+':'+focusKey(e.target).row:''));
 // Include programmatic Add/Remove/Clear actions, including their inline handlers.
 for(const name of ['addJournalLineRow','removeJournalLineRow','clearJournalEntry']){const fn=window[name];if(typeof fn!=='function')continue;window[name]=function(...args){if(name==='addJournalLineRow'&&window.entry1430?.mode==='single')return fn.apply(this,args);checkpoint();actionDepth++;try{return fn.apply(this,args)}finally{actionDepth--;if(!actionDepth)schedule()}}}
 const opened=window.loadEntryForEdit;if(typeof opened==='function')window.loadEntryForEdit=function(...args){const result=opened.apply(this,args);if(result?.then)return result.then(value=>{reset();return value});reset();return result};
 const finalized=window.finalizePostSuccess;if(typeof finalized==='function')window.finalizePostSuccess=function(...args){const result=finalized.apply(this,args);reset();queueMicrotask(reset);return result};
 window.addEventListener('page113',()=>{if(owner!==context()||client!==(typeof ojmDb==='undefined'?null:ojmDb))reset()});
 reset();
}
window.JournalUndo143103={checkpoint,record:()=>checkpoint(),reset,undo:()=>travel(false),redo:()=>travel(true)};
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
