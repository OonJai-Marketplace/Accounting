/* Event-driven selection and header actions; no continuous page scans. */
(function(){
'use strict';
function openEntry(month){
 showJournalEntry98(true);
 if(month&&!JournalModule.editingEntryId&&![...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-memo,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr')].some(n=>n.value&&n.value!=='0')){const input=document.getElementById('jeTransDate');if(input){input.value=month+'-01';input.dispatchEvent(new Event('change',{bubbles:true}))}}
}
function reopenedActions(){document.querySelectorAll('#reopenedBooks .reopened-book').forEach(card=>{const header=card.querySelector('header');if(!header||header.querySelector('.journal-header-actions107'))return;const group=document.createElement('div');group.className='journal-header-actions107';const add=document.createElement('button');add.type='button';add.className='je-btn je-btn-emerald';add.textContent='+ Add Entry';add.setAttribute('aria-controls','journalEntry98');add.onclick=()=>openEntry(card.id.replace('reopened-',''));const finish=[...header.querySelectorAll('button')].find(b=>b.textContent==='Finish Editing');if(finish)group.append(finish);header.append(group)})}
function ready(){
 const add=document.getElementById('addEntry98'),header=document.getElementById('tblJournalHistory')?.closest('.je-card')?.querySelector('.je-card-header');
 if(add&&header){const group=document.createElement('div');group.className='journal-header-actions107';group.append(add);header.append(group);add.onclick=()=>openEntry();document.querySelector('#journal>.journal-toolbar98')?.remove()}
 const render=window.renderReopened67;window.renderReopened67=function(...args){const result=render.apply(this,args);reopenedActions();return result};reopenedActions();
 document.addEventListener('pointerover',event=>{const cell=event.target.closest('.tab-content table :is(td,th)');if(cell&&!cell.title&&cell.scrollWidth>cell.clientWidth)cell.title=cell.textContent.trim()});
 document.addEventListener('click',event=>{if(event.target.closest('button,a,input,select,textarea,label,summary,[contenteditable=true]'))return;const row=event.target.closest('.tab-content table tbody tr');if(!row||row.closest('.clustered-journal-table')||row.matches('.audit-detail-row,.period-linked-finding')||row.querySelector('td[colspan]'))return;row.closest('table').querySelectorAll('.table-selected107').forEach(n=>n.classList.remove('table-selected107'));row.classList.add('table-selected107')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
