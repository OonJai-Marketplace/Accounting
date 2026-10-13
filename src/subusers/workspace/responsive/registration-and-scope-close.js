  const previousReviewRender = window.renderUserEntryReview;
  window.renderUserEntryReview=function(){const host=document.getElementById('userEntryReviewCards');if(!host)return;const journals=(reviewStaffJournals||[]).filter(row=>row.status==='submitted'&&(!window.Organization14229||Organization14229.pending(row)));host.innerHTML=[...adjustmentRequests.filter(row=>row.status==='submitted').map(adjustmentCard),...journals.map(transactionReviewCard)].join('')||'<div class="period-empty">Nothing is waiting for review.</div>';const history=document.getElementById('userEntryHistoryCards');if(history){const prior=adjustmentRequests.filter(row=>row.status!=='submitted'),closed=(reviewStaffJournals||[]).filter(row=>row.status!=='submitted'||window.Organization14229&&!Organization14229.pending(row)),date=r=>String(r.period_start||r.date||r.submitted_at||r.created_at||'').slice(0,7),month=historyMonth14341.choose('submitted',[...prior,...closed,...(DemoAccess.submissions||[])].map(date));history.innerHTML=historyMonth14341.control('submitted',month)+[...prior.filter(r=>date(r)===month).map(adjustmentCard),...closed.filter(r=>date(r)===month).map(transactionReviewCard)].join('');historyMonth14341.bind(history,'submitted',window.renderUserEntryReview,'local');} const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length} item(s) waiting`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length;};
  const previousLoad = window.loadStaffJournalsForReview;
  window.loadStaffJournalsForReview=async function(){await previousLoad();if(!ojmDb||!liveProfile)return;const request=await ojmDb.from('fund_adjustment_requests').select('*,lines:fund_adjustment_lines(*)').order('submitted_at',{ascending:false});if(!request.error)adjustmentRequests=request.data||[];window.renderUserEntryReview();window.renderSubUserWorkspace();};

  if(typeof APP_PERMISSION_TREE !== 'undefined' && Array.isArray(APP_PERMISSION_TREE)){
    const transactions=APP_PERMISSION_TREE.find(row=>row.id==='transactions'),subusers=APP_PERMISSION_TREE.find(row=>row.id==='sub-users');
    if(transactions&&!transactions.children.some(([id])=>id==='user-entry-review'))transactions.children.splice(4,0,['user-entry-review','Entry Submission Review']);
    if(subusers)subusers.children=subusers.children.filter(([id])=>id!=='user-entry-review');
  }
  const oldToast=window.showCenterStatus;
  window.showCenterStatus=function(message,isError=false){oldToast(message,isError);clearTimeout(showCenterStatus.timer);showCenterStatus.timer=setTimeout(()=>document.getElementById('centerStatusToast')?.classList.remove('is-visible'),5200)};
  // Both layouts are already rendered. CSS switches them without clearing a Post draft on rotation.
})();

