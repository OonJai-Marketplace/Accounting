const finalBefore67=finalizePostSuccess;
finalizePostSuccess=function(...args){const entry=JournalModule.entries.find(r=>r.id===JournalModule.editingEntryId),month=entry?.date?.slice(0,7);finalBefore67(...args);journalContext67();renderReopened67();if(month&&isReopened67(month))document.getElementById(`reopened-${month}`)?.scrollIntoView({behavior:'smooth',block:'start'})};
const reviewBefore67=renderPeriodReview;
renderPeriodReview=function(){reviewBefore67();const findings=PeriodReview.findings.filter(f=>f.month===PeriodReview.selectedMonth);document.querySelectorAll('#periodFindingsList .period-finding-main').forEach((node,i)=>{const f=findings[i];if(!f)return;const note=document.createElement('small');note.textContent=`${f.createdByName||f.createdBy||'Reviewer not recorded'} · ${f.createdAt?formatAppDate(f.createdAt,true):''}`;node.append(note)})};
const switchBefore67=switchTab;
switchTab=function(id){return switchBefore67(id==='transactions-new'?'journal':id)};
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('closeMonth67').value=getCurrentMonthPrefix();renderReopened67()});
