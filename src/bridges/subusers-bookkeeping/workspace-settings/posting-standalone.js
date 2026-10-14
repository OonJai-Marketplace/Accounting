const resetJournalBefore47=resetJournalLinesForm;
resetJournalLinesForm=function(...args){pendingWorkspacePostJournalId='';pendingWorkspacePostOwnerId='';pendingWorkspacePostIsLocal=false;return resetJournalBefore47(...args)};
const submitJournalBefore47=submitJournalEntry;
let wsPosting=false;
submitJournalEntry=async function(){
  if(!pendingWorkspacePostJournalId)return submitJournalBefore47();if(wsPosting)return;
  const state=collectLiveJournalGroups();if(state.errors.length||state.differences.length){showCenterStatus(state.errors[0]||'Each date and currency must balance.',true);return}
  const groups=Object.entries(state.grouped).map(([date,g])=>({date,lines:g.lines.map(l=>({account_id:l.account?.id,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0)}))}));
  if(!groups.length||groups.some(g=>g.lines.length<2||g.lines.some(l=>!l.account_id))){showCenterStatus('Select valid accounts and at least two balanced lines per date.',true);return}
  const owner=liveProfile?.id;wsPosting=true;const button=document.getElementById('btnPostJournal');if(button)button.disabled=true;
  try{const result=await ojmDb.rpc('post_workspace_review_v3',{p_journal_id:pendingWorkspacePostJournalId,p_groups:groups,p_prefix:ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM',p_digits:Number(ApplicationSettings.accounting?.journalDigits||6),p_memo:document.getElementById('jeGeneralMemo').value.trim()});if(result.error)throw result.error;if(liveProfile?.id!==owner)return;
    pendingWorkspacePostJournalId='';pendingWorkspacePostOwnerId='';pendingWorkspacePostIsLocal=false;finalizePostSuccess();await Promise.all([loadJournalFromSupabase(),loadStaffJournalsForReview()]);showCenterStatus('Submission posted. The original report and journal are available in History.');
  }catch(error){if(liveProfile?.id===owner)showCenterStatus('Posting failed: '+error.message+'. The submission remains in review unless the server already confirmed posting; refresh before retrying.',true)}finally{wsPosting=false;if(button&&liveProfile?.id===owner)button.disabled=false}
};
submissionSummaryHtml=function(journal){return workspaceAccountSummary(journal.lines||[])};
