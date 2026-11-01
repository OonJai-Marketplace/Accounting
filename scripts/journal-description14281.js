/* Shared descriptions are displayed once; stored journal text is never changed. */
(()=>{'use strict';
function plan(records,general=records[0]?.generalMemo||''){
 const clean=value=>String(value??'').trim(),key=value=>clean(value).replace(/\s+/g,' '),header=clean(general),raw=records.map(r=>clean(r.memo??r.description??''));
 const common=raw.length>1&&key(raw[0])&&raw.every(m=>key(m)===key(raw[0]))?raw[0]:'';
 const shared=[header,common&&key(common)!==key(header)?common:''].filter(Boolean).join('\n');
 return {shared,lines:raw.map(m=>key(m)===key(header)||common?'':m)};
}
window.JournalDescription225={plan};
function addDescription(body,records){if(!body)return;
 const recordsById=new Map(),linesById=new Map();for(const record of records){const id=String(record.id);if(!recordsById.has(id))recordsById.set(id,[]);recordsById.get(id).push(record);}for(const line of body.querySelectorAll('tr[data-entry-id]')){const id=line.dataset.entryId;if(!linesById.has(id))linesById.set(id,[]);linesById.get(id).push(line);}
 for(const [id,lines] of linesById){const row=lines[0],memo=plan(recordsById.get(id)||[]).shared;if(!memo||lines.some(line=>line.classList.contains('journal-description14281')))continue;
  const header=document.createElement('tr');header.className='journal-description14281 cluster-row-start';header.dataset.entryId=id;header.dataset.createdAt=row.dataset.createdAt||'';header.dataset.lineIndex=row.dataset.lineIndex;
  for(const line of lines)line.dataset.lineIndex=String(Number(line.dataset.lineIndex)+1);row.classList.remove('cluster-row-start');row.classList.add('cluster-row-cont');
  const cell=document.createElement('td');cell.colSpan=7;cell.className='general-description14281';cell.innerHTML=journalMemoHtml143187(memo);header.append(cell);row.before(header);
 }
}
const base=window.renderTransactionReviewTable;window.renderTransactionReviewTable=function(body,records,...args){const result=base.call(this,body,records,...args);addDescription(body,records);return result};
const period=window.renderPeriodReview;window.renderPeriodReview=function(...args){const result=period.apply(this,args);addDescription(document.getElementById('periodTransactionsBody'),periodEntries());return result};
})();
