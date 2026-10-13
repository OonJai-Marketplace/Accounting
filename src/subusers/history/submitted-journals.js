async function loadMySubmittedStaffJournals(){
  const host=document.getElementById('staffSubmittedHistory');
  if(!host||!liveProfile||!ojmDb)return;
  const {data,error}=await ojmDb.from('staff_journals').select('period_start,status,submitted_at,reviewed_at,return_note').eq('owner_id',liveProfile.id).neq('status','draft').order('period_start',{ascending:false});
  if(error){host.innerHTML='<div class="legal-doc-empty">Submitted journal history will appear after the staff workflow SQL is installed.</div>';return}
  host.innerHTML=(data||[]).length?(data||[]).map(j=>`<div class="staff-history-row"><div><strong>${escapeHtml(j.period_start.slice(0,7))}</strong><span>${j.submitted_at?`Submitted ${formatAppDate(j.submitted_at,true)}`:'Prepared for review'}${j.return_note?` • Return note: ${escapeHtml(j.return_note)}`:''}</span></div><span class="submission-status ${j.status}">${escapeHtml(j.status.toUpperCase())}</span></div>`).join(''):'<div class="legal-doc-empty">No submitted journals yet.</div>';
}
const openStaffJournalPeriodWithHistory=openStaffJournalPeriod;
openStaffJournalPeriod=async function(month){await openStaffJournalPeriodWithHistory(month);await loadMySubmittedStaffJournals()};

