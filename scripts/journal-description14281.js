/* General descriptions are entry headers; line descriptions remain per line. */
(()=>{'use strict';
function addDescription(body,records){if(!body)return;
for(const row of [...body.querySelectorAll('tr[data-line-index="0"]')]){const first=records.find(r=>String(r.id)===row.dataset.entryId),memo=String(first?.generalMemo||'').trim();if(!memo)continue;
 const header=document.createElement('tr');header.className='journal-description14281 cluster-row-start';
 header.dataset.entryId=row.dataset.entryId;header.dataset.createdAt=row.dataset.createdAt||'';header.dataset.lineIndex='0';
 const shared=[...row.children].filter(c=>c.hasAttribute('rowspan'));if(shared.length<2)continue;
 for(const line of body.querySelectorAll('tr[data-entry-id]'))if(line.dataset.entryId===row.dataset.entryId)line.dataset.lineIndex=String(Number(line.dataset.lineIndex)+1);
 row.classList.remove('cluster-row-start');row.classList.add('cluster-row-cont');
 for(const c of shared)c.rowSpan+=1;
 header.append(shared[0],shared[1]);const cell=document.createElement('td');cell.colSpan=4;cell.className='general-description14281';const label=document.createElement('strong');label.textContent='General description';cell.append(label,document.createTextNode(' '+memo));header.append(cell);if(shared[2])header.append(shared[2]);row.before(header);
}}
const base=window.renderTransactionReviewTable;window.renderTransactionReviewTable=function(body,records,...args){const result=base.call(this,body,records,...args);addDescription(body,records);return result};
const period=window.renderPeriodReview;window.renderPeriodReview=function(...args){const result=period.apply(this,args);addDescription(document.getElementById('periodTransactionsBody'),periodEntries());return result};
})();
