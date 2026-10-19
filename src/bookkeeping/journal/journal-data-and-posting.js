async function loadJournalFromSupabase() {
  const actor=liveProfile?.id,db=ojmDb,workspace=window.workspaceRequest138?.target||'';
  const check=()=>{if(liveProfile?.id!==actor||ojmDb!==db||(window.workspaceRequest138?.target||'')!==workspace)throw Error('Workspace changed while loading the journal.')};
  const cacheRevision=window.offline14239?.cacheRevision;
  const windowRows=await window.yearWindow14333?.read();if(windowRows){check();if(!window.offline14239?.offline()&&cacheRevision===window.offline14239?.cacheRevision)await window.journalDurable14385?.reconcile(windowRows);check();JournalModule.confirmedSnapshot14385=structuredClone(windowRows);JournalModule.entries=windowRows;syncEntrySequence();updateNextEntryIdDisplay();refreshAllTables();return;}
  const entries=[];
  for(let offset=0;;offset+=500){
    check();const {data,error}=await db.from('journal_entries').select('id,entry_no,created_at,transaction_date,memo,status,source,journal_lines(fx_rate_lak,book_rate_lak,base_debit,base_credit,line_no,description,currency_code,debit,credit,line_date,accounts(id,name,code))').eq('status','posted').order('transaction_date',{ascending:false}).order('id').range(offset,offset+499);
    check();if(error)throw new Error(error.message);
    (data||[]).forEach(entry=>(entry.journal_lines||[]).filter(Boolean).sort((a,b)=>a.line_no-b.line_no).forEach(line=>entries.push({created_at:entry.created_at,source:entry.source,scheduleId:String(entry.source||'').startsWith('scheduled:')?String(entry.source).slice(10):null,dbEntryId:entry.id,id:entry.entry_no||entry.id,date:line.line_date||entry.transaction_date,account:line.accounts?.name||'Unknown Account',accountId:line.accounts?.id,accountCode:line.accounts?.code,currency:line.currency_code,memo:line.description||entry.memo||'',generalMemo:entry.memo||'',debit:Number(line.debit),credit:Number(line.credit),fx_rate_lak:line.fx_rate_lak,book_rate_lak:line.book_rate_lak,base_debit:line.base_debit,base_credit:line.base_credit,editReason:'',archived:false})));
    if(!data||data.length<500)break;
  }
  check();if(!window.offline14239?.offline()&&cacheRevision===window.offline14239?.cacheRevision)await window.journalDurable14385?.reconcile(entries);check();JournalModule.confirmedSnapshot14385=structuredClone(entries);JournalModule.entries=entries;syncEntrySequence();updateNextEntryIdDisplay();refreshAllTables();
}

function collectLiveJournalGroups() {
  if(document.getElementById('jeMultipleDates')?.checked)return getMultiDateJournalState();
  const date=document.getElementById('jeTransDate').value,memo=document.getElementById('jeGeneralMemo').value.trim(),grouped=Object.create(null),errors=[];
  if(!date||!memo)errors.push('Enter a date and general memo.'); grouped[date]={totals:Object.create(null),lines:[]};
  document.querySelectorAll('#jeLinesBody tr').forEach((row,index)=>{
    const acc=getSelectedAccountInfo(row.querySelector('.je-line-acc')?.value||''),debit=parseCleanNumber(row.querySelector('.je-line-dr')?.value||''),credits=[...row.querySelectorAll('.je-line-cr')].map(i=>({currency:i.dataset.currency,value:parseCleanNumber(i.value)})).filter(x=>x.value>0);
    const amounts=[row.querySelector('.je-line-dr'),...row.querySelectorAll('.je-line-cr')].filter(Boolean);
    if(amounts.some(input=>{const value=input.value.trim()?parseAppNumber(input.value):0;return !Number.isFinite(value)||value<0})){errors.push(`Row ${index+1}: enter nonnegative finite amounts.`);return}
    if(debit>0&&credits.length){errors.push(`Row ${index+1}: use either Debit or Credit, not both.`);return}
    if(!acc&&(debit||credits.length)){errors.push(`Row ${index+1}: select a valid account.`);return} if(!acc)return;
    const description=row.querySelector('.je-line-memo')?.value.trim()||memo; grouped[date].totals[acc.currency]||={debit:0,credit:0};
    if(debit){grouped[date].totals[acc.currency].debit+=debit;grouped[date].lines.push({account:acc,currency:acc.currency,memo:description,debit,credit:0})}
    credits.forEach(c=>{if(c.currency!==acc.currency)errors.push(`Row ${index+1}: account currency must be ${acc.currency}.`);grouped[date].totals[c.currency]||={debit:0,credit:0};grouped[date].totals[c.currency].credit+=c.value;grouped[date].lines.push({account:acc,currency:c.currency,memo:description,debit:0,credit:c.value})});
  });
  const differences=[];Object.entries(grouped).forEach(([d,g])=>Object.entries(g.totals).forEach(([currency,t])=>{if(Math.abs(t.debit-t.credit)>=.001)differences.push({date:d,currency,...t})}));
  return{grouped,errors,differences};
}

submitJournalEntry = async function() {
  const actor=liveProfile?.id,db=ojmDb,current=()=>liveProfile?.id===actor&&ojmDb===db;if(!actor)return;
  if(liveProfile?.role!=='admin'&&!livePermission?.can_post_directly){showAppNotification('Access Denied','Direct journal posting is not enabled for this user.',true);return}
  const state=collectLiveJournalGroups();if(state.errors.length){showAppNotification('Check Entry',state.errors[0],true);return}if(state.differences.length){showAppNotification('Unbalanced Entry','Each currency must balance before posting.',true);return}
  const groups=Object.entries(state.grouped).filter(([,g])=>g.lines.length>=2);if(!groups.length){showAppNotification('Incomplete','Enter at least two balanced lines.',true);return}
  if(JournalModule.editingEntryId){
    if(groups.length!==1){showAppNotification('One Date Required','An edited entry must remain a single balanced transaction date.',true);return}
    const [date,g]=groups[0],oldLines=JournalModule.entries.filter(row=>row.id===JournalModule.editingEntryId);
    if(oldLines.some(row=>row.archived)||PeriodReview.status(String(oldLines[0]?.date||date).slice(0,7))!=='open'){showAppNotification('Archived Period','Only open-period transactions can be edited directly.',true);return}
    JournalModule.pendingLines=g.lines.map(line=>({date:line.line_date||date,account:line.account,accountId:line.account.id,currency:line.currency,memo:line.memo,debit:line.debit,credit:line.credit,fx_rate_lak:line.fx_rate_lak,book_rate_lak:line.book_rate_lak}));
    document.getElementById('txtEditReason').value='';openModal('modalEditReason');return;
  }
  if(groups.length>1||window.journalBatch1440?.hasPending())return window.journalBatch1440.post(groups);
  for(const [date,g] of groups){
    const memo=document.getElementById('jeGeneralMemo').value.trim(),prefix=String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),digits=Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6));
    const lines=g.lines.map(line=>({line_date:line.line_date||date,account_id:line.account?.id||null,description:line.memo,currency_code:line.currency,debit:Number(line.debit||0),credit:Number(line.credit||0),fx_rate_lak:line.fx_rate_lak,book_rate_lak:line.book_rate_lak}));
    if(lines.some(line=>!line.account_id)){showAppNotification('Posting Failed','One or more journal lines has no database account ID. Reselect the account and try again.',true);return}
    const editor=document.getElementById('journalEntry98');editor._postingRequest14228||=crypto.randomUUID();const {error}=await db.rpc('post_manual_journal14228',{p_request_key:editor._postingRequest14228,p_transaction_date:date,p_memo:memo,p_lines:lines,p_prefix:prefix,p_digits:digits});
    if(!current())return;if(error){showAppNotification('Posting Failed',error.message,true);return}
  }
  await loadJournalFromSupabase();if(!current())return;showAppNotification('Posted','The balanced journal entry was saved to Supabase.',false);finalizePostSuccess();
};

