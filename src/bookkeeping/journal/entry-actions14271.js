/* One selected-row toolbar for the shared transaction and sub-user editor. */
(()=>{'use strict';
let selected=null;
const card=()=>document.getElementById('journalEntry98');
const single=()=>card()?.classList.contains('single-entry1430');
const body=()=>document.getElementById(single()?'simpleRows1430':'jeLinesBody');
const rows=()=>[...body()?.children||[]].filter(n=>n.matches(single()?'.simple-row1430':'tr'));
const allowed=()=>{const root=card(),target=root?.dataset.personalOwner1437?'sub-users-workspace':'journal';return !window.access113||window.access113.can(target,'edit')||window.access113.can(target,'post')};
function choose(row){
 const root=card();root?.querySelectorAll('.selected-entry-row14271').forEach(n=>{n.classList.remove('selected-entry-row14271');n.removeAttribute('aria-selected')});
 selected=row&&rows().includes(row)?row:null;
 if(selected){selected.classList.add('selected-entry-row14271');selected.setAttribute('aria-selected','true')}
 const remove=document.getElementById('deleteEntryRow14271');if(remove)remove.disabled=!selected||!allowed();
}
function active(){return selected&&rows().includes(selected)?selected:null}
function changed(){card()?.dispatchEvent(new Event('input',{bubbles:true}))}
function add(){
 if(!allowed())return;
 const list=rows(),index=active()?list.indexOf(selected):list.length-1;
 if(single()){
  if(window.entry1430?.retained)return showCenterStatus('Switch to Double Entry to edit the retained journal lines.',true);
  const row=window.entry1430?.insertAfter(index);if(row){choose(row);row.querySelector('[data-simple=source]')?.focus({preventScroll:true})}return;
 }
 addJournalLineRow();const row=body()?.lastElementChild;if(!row)return;
 const anchor=list[index];if(anchor&&anchor!==row)anchor.after(row);
 calculateJournalBalance();choose(row);changed();row.querySelector('.je-line-acc')?.focus({preventScroll:true});
}
function remove(){
 const row=active();if(!row||!allowed())return;
 const list=rows(),index=list.indexOf(row);
 if(single()){
  if(window.entry1430?.retained)return showCenterStatus('Switch to Double Entry to edit the retained journal lines.',true);
  choose(window.entry1430?.deleteAt(index));return;
 }
 const next=row.nextElementSibling||row.previousElementSibling;
 row.remove();if(!body()?.querySelector('tr'))addJournalLineRow();
 calculateJournalBalance();choose(next?.isConnected?next:body()?.querySelector('tr'));changed();
}
function ready(){
 const root=card();if(!root)return;
 const simple=root.querySelector?.('#simpleEntry1430');
 if(simple&&!simple.querySelector('.simple-head14272')){
  const head=document.createElement('div');head.className='simple-head14272';head.setAttribute('aria-hidden','true');
  head.innerHTML='<span class="simple-head-date14272">Date</span><span>Direction</span><span>Source / payment account</span><span>Affected / category account</span><span>Amount</span><span>Line memo / reference</span>';
  simple.prepend(head);
 }
 root.addEventListener('click',e=>{
  if(e.target.closest('#jeEntryMode1430,[onclick="clearJournalEntry()"]')){queueMicrotask(()=>choose(null));return}
  const row=e.target.closest('.simple-row1430,#jeLinesBody tr');if(row&&root.contains(row))choose(row);
 });
 root.addEventListener('focusin',e=>{const row=e.target.closest('.simple-row1430,#jeLinesBody tr');if(row&&root.contains(row))choose(row)});
 choose(null);
}
window.entryActions14271={add,remove};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
