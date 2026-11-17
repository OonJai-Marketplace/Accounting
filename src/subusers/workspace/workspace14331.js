/* Keep one audit row selected per table. Editing and action controls keep their normal events. */
(() => {
 'use strict';
 const selected=new WeakMap();
 function select(event){
  const row=event.target.closest?.('tr');
  if(!row || row.parentElement?.tagName==='THEAD' ||
     row.closest('#document-editor105,#journalEntry98,.attendance-scroll99,.attendance-scroll95,.attendance-calendar102') ||
     row.matches('.audit-detail-row,.period-linked-finding'))return;
  const table=row.closest('table');
  if(!table || !row.cells.length)return;
  const journal=table.classList.contains('clustered-journal-table');
  if(journal && !row.dataset.entryId)return;
  const mark=journal?'entry-selected-line':'table-selected107';
  const previous=selected.get(table);
  if(previous!==row){
   previous?.classList.remove(mark);
   selected.set(table,row);
  }
  row.classList.add(mark);
 }
 document.addEventListener('pointerdown',select,true);
 document.addEventListener('focusin',select,true);
 document.addEventListener('click',select,true);
})();
