function wsRowPayload(user,row,rules){return {p_owner_id:user.id,p_line_id:row._savedId||(row.isNew?null:row.id),p_client_key:row.key,p_transaction_date:row.transaction_date,p_direction:row.direction,p_fund_account_id:row.fund_account_id||rules.fundIds[0],p_account_id:row.selected_account_id,p_memo:row.memo,p_reference:row.reference||'',p_amount:Number(row.amount),p_entry_kind:row.entry_kind==='legacy'?(row.direction==='in'?'collection':'payment'):(row.entry_kind||'payment')}}
persistWorkspaceSingleRow=async function(user,row,rules){
  const key=row.key;if(wsSaving.has(key))return wsSaving.get(key);
  let saveAgain=false;const task=(async()=>{try{
    let snapshot,result;
    do{
      snapshot=JSON.stringify(wsRowPayload(user,row,rules));result=await ojmDb.rpc('save_staff_workspace_entry_v3',JSON.parse(snapshot));if(result.error)throw result.error;
      row._savedId=result.data[0].line_id;row.workspace_entry_no=result.data[0].workspace_entry_no;
      // A later edit may arrive while this request is running. Save it in order.
      const sent=JSON.parse(snapshot);sent.p_line_id=row._savedId;snapshot=JSON.stringify(sent);
    }while(wsReady(row,rules)&&snapshot!==JSON.stringify(wsRowPayload(user,row,rules)));
    await wsLoadJournalsQuietly();
    if(snapshot!==JSON.stringify(wsRowPayload(user,row,rules))){saveAgain=wsReady(row,rules);showCenterStatus('Finish the incomplete edit before submitting.',true);return}
    if(row.isNew)workspacePendingRows[user.id]=pendingRowsFor(user.id).filter(r=>r.key!==key);else delete workspaceRowEdits[user.id]?.[row.id];
    const tr=[...document.querySelectorAll('[data-workspace-row]')].find(el=>el.dataset.workspaceRow===key);
    if(tr){tr.dataset.workspaceRow=row._savedId;tr.querySelectorAll('[data-key]').forEach(el=>el.dataset.key=row._savedId);tr.querySelector('td strong').textContent=row.workspace_entry_no;tr.querySelector('.ws-draft-state')?.remove();const remove=tr.querySelector('.btn-action-delete');if(remove)remove.onclick=()=>voidWorkspaceSingleRow(user.id,row._savedId)}
    const summary=document.getElementById('wsAccountSummary');if(summary)summary.innerHTML=workspaceAccountSummary(workspaceEditableRows(user));
    const funds=document.querySelector('#subUserWorkspacePanel .ws-fund-cards');if(funds)funds.outerHTML=assignedFundTableHtml(user);
    const submit=document.querySelector('.ws-review-actions>.je-btn:last-child');if(submit)submit.disabled=false;
    refreshWorkspaceEntryId(user.id);renderUserEntryReview();showCenterStatus('Entry saved.');
  }catch(error){showCenterStatus('Saving was not confirmed. Reload Entries before retrying: '+error.message,true)}})();
  wsSaving.set(key,task);try{await task}finally{wsSaving.delete(key);if(saveAgain)queueMicrotask(()=>persistWorkspaceSingleRow(user,row,rules))}
};
async function wsLoadJournalsQuietly(){let query=ojmDb.from('staff_journals').select('*').order('submitted_at',{ascending:false});if(liveProfile.role!=='admin'&&!livePermission?.can_approve)query=query.eq('owner_id',liveProfile.id);const journals=await query;if(journals.error)throw journals.error;const ids=journals.data.map(j=>j.id),lines=ids.length?await ojmDb.from('staff_journal_lines').select('*').in('staff_journal_id',ids):{data:[]};if(lines.error)throw lines.error;reviewStaffJournals=journals.data.map(j=>({...j,lines:lines.data.filter(l=>l.staff_journal_id===j.id)}))}


// Earlier same-account collections remain report-only; assigned category receipts post normally.
