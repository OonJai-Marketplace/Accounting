/* Read-only selection feedback for current data tables, including editable cells. */
(()=>{'use strict';
function select(event){if(innerWidth<=640)return;const row=event.target.closest?.('.tab-content:not(#document-editor105) table tbody tr');if(!row||row.closest('#journalEntry98,.attendance-scroll99,.attendance-scroll95,.attendance-calendar102')||row.matches('.audit-detail-row,.period-linked-finding,.report-total69'))return;
 const table=row.closest('table');if(table.classList.contains('clustered-journal-table')){if(!row.dataset.entryId)return;table.querySelectorAll('.entry-selected-line,.entry-selected-owner').forEach(n=>n.classList.remove('entry-selected-line','entry-selected-owner'));const group=document.body.classList.contains('audit-on101')?[row]:[...row.parentElement.rows].filter(n=>n.dataset.entryId===row.dataset.entryId);group.forEach(n=>n.classList.add('entry-selected-line'));return}
 if(row.querySelector('td[colspan]'))return;table.querySelectorAll('.table-selected107').forEach(n=>n.classList.remove('table-selected107'));row.classList.add('table-selected107');
}
document.addEventListener('pointerdown',select,true);document.addEventListener('focusin',select,true);
})();
