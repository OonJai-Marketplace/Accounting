/* Entry headings and saved line memos stay in their respective locations. */
(()=>{'use strict';
function plan(records,general=records[0]?.generalMemo||''){
 const heading=records[0]?.fxEvidenceMemo288||general;
 return {shared:String(heading??'').trim(),lines:records.map(r=>{
  const memo=String(r.memo===general&&heading!==general?'':(r.memo??r.description??''));
  const detail=({equivalent:'Rate calculated from the recorded LAK equivalent.',reference:'Reference valuation.',review:'Posted rate; source needs review.',recorded:'Rate stated in the original journal.'})[r.fxRateKind288];
  return detail?[memo,detail].filter(Boolean).join('\n'):memo;
 })};
}
window.JournalDescription225={plan};
function addDescription(body,records){if(!body)return;
 const refs=window.vouchers14299?.journalReferences?.(true);
 const recordsById=new Map(),linesById=new Map();for(const record of records){const id=String(record.id);if(!recordsById.has(id))recordsById.set(id,[]);recordsById.get(id).push(record);}for(const line of body.querySelectorAll('tr[data-entry-id]')){const id=line.dataset.entryId;if(!linesById.has(id))linesById.set(id,[]);linesById.get(id).push(line);}
 for(const [id,lines] of linesById){const row=lines[0],group=recordsById.get(id)||[],entry=group[0],memo=plan(group).shared;
  const hasDocument=entry?.cashSlipRef||entry?.supportingDocument||refs?.has(entry?.dbEntryId||entry?.journalJob14385);
  if((!memo&&!hasDocument)||lines.some(line=>line.classList.contains('journal-description14281')))continue;
  const header=document.createElement('tr');header.className='journal-description14281 cluster-row-start';header.dataset.entryId=id;header.dataset.createdAt=row.dataset.createdAt||'';header.dataset.lineIndex=row.dataset.lineIndex;
  for(const line of lines)line.dataset.lineIndex=String(Number(line.dataset.lineIndex)+1);row.classList.remove('cluster-row-start');row.classList.add('cluster-row-cont');
  const cell=document.createElement('td');cell.colSpan=7;cell.className='general-description14281';cell.innerHTML=journalMemoHtml143187(memo);window.vouchers14299?.appendJournalDocuments?.(cell,entry,refs);if(recordsById.get(id)?.[0]?.fxCorrection288){
   const action=document.createElement('button');action.type='button';action.className='je-btn je-btn-secondary no-print';action.textContent='Apply reviewed correction';
   const entryId=recordsById.get(id)[0].dbEntryId;action.onclick=async()=>{
    if(action.disabled)return;action.disabled=true;const client=ojmDb,actor=liveProfile?.id;
    try{const result=await client.rpc('apply_journal_fx_evidence288',{p_entry_id:entryId});
     if(result.error)throw result.error;if(client!==ojmDb||actor!==liveProfile?.id)return;
     window.yearWindow14333?.invalidateMemory();await loadJournalFromSupabase({cacheFirst:false});showCenterStatus('Reviewed journal correction saved.');
    }catch(error){if(client===ojmDb&&actor===liveProfile?.id)showCenterStatus(error.message||'Refresh the journal and check the correction status.',true);}
    finally{if(action.isConnected)action.disabled=false;}
   };cell.append(' ',action);
  }header.append(cell);row.before(header);
 }
}
const base=window.renderTransactionReviewTable;window.renderTransactionReviewTable=function(body,records,...args){const result=base.call(this,body,records,...args);addDescription(body,records);return result};
const period=window.renderPeriodReview;window.renderPeriodReview=function(...args){const result=period.apply(this,args);addDescription(document.getElementById('periodTransactionsBody'),periodEntries());return result};
})();
