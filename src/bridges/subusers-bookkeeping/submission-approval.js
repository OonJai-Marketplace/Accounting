async function loadSubmissionsFromSupabase() {
  const owner=liveProfile?.id,db=ojmDb;if(!owner)return;const query=db.from('entry_submissions').select('*').order('submitted_at',{ascending:false}); const {data,error}=await query;if(liveProfile?.id!==owner||ojmDb!==db)return;if(error)throw new Error(error.message);
  DemoAccess.submissions=(data||[]).map(s=>({id:s.id,date:s.transaction_date,memo:s.memo,reference:s.reference||'',debitAccount:AccountingStore.accounts.find(a=>a.id===s.debit_account_id)?.name||'Unknown',creditAccount:AccountingStore.accounts.find(a=>a.id===s.credit_account_id)?.name||'Unknown',amount:Number(s.amount),currency:s.currency_code,submittedBy:s.submitted_by,submittedAt:s.submitted_at,status:s.status,reviewedBy:s.reviewed_by,reviewedAt:s.reviewed_at,rejectionReason:s.rejection_reason||'',journalEntryId:s.journal_entry_id||''}));
  renderEntrySubmissions();updateSubmissionCount();
}

saveEntrySubmission = async function(event) {
  event.preventDefault();const owner=liveProfile?.id,db=ojmDb;if(!owner)return;const debit=getSelectedAccountInfo(document.getElementById('submissionDebit').value),credit=getSelectedAccountInfo(document.getElementById('submissionCredit').value),currency=document.getElementById('submissionCurrency').value;
  if(!debit||!credit){showAppNotification('Account Required','Choose valid debit and credit accounts.',true);return}if(debit.currency!==currency||credit.currency!==currency){showAppNotification('Currency Mismatch',`Both accounts must use ${currency}.`,true);return}
  const {error}=await db.from('entry_submissions').insert({transaction_date:document.getElementById('submissionDate').value,memo:document.getElementById('submissionMemo').value.trim(),reference:document.getElementById('submissionReference').value.trim(),debit_account_id:debit.id,credit_account_id:credit.id,currency_code:currency,amount:Number(document.getElementById('submissionAmount').value),submitted_by:owner});
  if(liveProfile?.id!==owner||ojmDb!==db)return;if(error){showAppNotification('Submission Failed',error.message,true);return}event.target.reset();setSubmissionDateToday();await loadSubmissionsFromSupabase();
};

reviewEntrySubmission = async function(id,decision) {
  const owner=liveProfile?.id,db=ojmDb;if(!owner)return;
  if(liveProfile?.role!=='admin'&&!livePermission?.can_approve)return;
  if(decision==='rejected'){const reason=await ui117.prompt('Reason for rejection:');if(!reason||liveProfile?.id!==owner||ojmDb!==db)return;const{error}=await db.rpc('reject_entry_submission',{p_submission_id:id,p_reason:reason});if(liveProfile?.id!==owner||ojmDb!==db)return;if(error){showAppNotification('Reject Failed',error.message,true);return}}
  else{const{error}=await db.rpc('approve_entry_submission',{p_submission_id:id});if(liveProfile?.id!==owner||ojmDb!==db)return;if(error){showAppNotification('Approval Failed',error.message,true);return}}
  await Promise.all([loadSubmissionsFromSupabase(),loadJournalFromSupabase()]);
};

