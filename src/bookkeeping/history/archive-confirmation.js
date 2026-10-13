// Archive uses a true warning/confirmation instead of a small transient notification.
archiveTransactionMonth = function(monthKey) {
  const ids=new Set(JournalModule.entries.filter(e=>monthKeyFromDate(e.date)===monthKey&&!e.archived).map(e=>e.id));
  if(!ids.size)return;
  showAppConfirm('Submit Month for Review',`You are about to archive every open transaction for ${monthLabel(monthKey)}. Direct editing will stop and future corrections must use Period Review.`,'Submit & Archive',async()=>{
    if(ojmDb){const {error}=await ojmDb.rpc('set_accounting_period_status',{p_month:`${monthKey}-01`,p_status:'review'});if(error){showAppNotification('Archive Failed',error.message,true);return}}
    const stamp=new Date().toISOString();
    JournalModule.entries.forEach(e=>{if(ids.has(e.id)){e.archived=true;e.archivedAt=stamp;}});
    PeriodReview.periods[monthKey]={...(PeriodReview.periods[monthKey]||{}),status:'review',updatedAt:stamp,updatedBy:liveProfile?.id||'local'};PeriodReview.save();
    refreshAllTables();showAppNotification('Month Submitted',`${monthLabel(monthKey)} was archived and moved to All Transactions for review.`,false);
  },true);
};

