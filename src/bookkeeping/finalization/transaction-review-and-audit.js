// TRANSACTION FINALIZATION — posted items are reviewed, adjusted, or voided; they are never silently deleted.
function transactionCurrencies(){return (CurrencyStore.currencies||[]).filter(c=>c.is_active!==false);}
function canVoidTransactions(){return liveProfile?.role==='admin'||Boolean(livePermission?.can_void);}
function isAdjustedTransaction(lines){return (lines||[]).some(row=>row.adjusted===true||/^\s*adjustment\b/i.test(String(row.memo||'')));}
// Limit each page to 100 lines; repeat shared entry cells for continued transactions.
function transactionPage14340(tbody,groups,ids){
  const limit=100;const pages=[[]];let lines=0;
  ids.forEach(id=>{for(let start=0;start<groups[id].length;){if(lines===limit){pages.push([]);lines=0}const count=Math.min(limit-lines,groups[id].length-start);pages.at(-1).push({id,start,end:start+count});start+=count;lines+=count}});
  const table=tbody.closest('table'),container=table?.closest('.table-container');
  if(!container)return ids.map(id=>({id,start:0,end:groups[id].length}));
  table.dataset.ownPager14383='1';
  let bar=container.nextElementSibling;
  if(!bar?.classList.contains('transaction-pages14340')){bar=document.createElement('div');bar.className='transaction-pages14340 module-actions71 no-print';container.after(bar)}
  if(typeof isPrintMode!=='undefined'&&isPrintMode){bar.hidden=true;return ids.map(id=>({id,start:0,end:groups[id].length}))}
  const max=pages.length,selected=Math.min(Number(tbody.dataset.page14340)||0,max-1);tbody.dataset.page14340=String(selected);
  bar.hidden=false;bar.replaceChildren();
  const previous=document.createElement('button'),next=document.createElement('button'),label=document.createElement('span');
  previous.type=next.type='button';previous.className=next.className='je-btn je-btn-secondary';previous.textContent='Previous';next.textContent='Next';previous.disabled=selected===0;next.disabled=selected===max-1;
  label.textContent=`${selected+1} of ${max}`;
  const go=step=>{tbody.dataset.page14340=String(selected+step);renderTransactionReviewTable(tbody,Object.values(groups).flat(),'page14340:'+tbody.dataset.action14340)};
  previous.onclick=()=>go(-1);next.onclick=()=>go(1);bar.append(previous,label,next);
  return pages[selected];
}
function renderTransactionReviewTable(tbody, records, actionMode='none'){
  if(!tbody)return;const groups=Object.create(null);records.forEach(r=>(groups[r.id]||(groups[r.id]=[])).push(r));
  if(actionMode.startsWith('page14340:'))actionMode=actionMode.slice(10);else tbody.dataset.page14340='0';tbody.dataset.action14340=actionMode;
  const ids=Object.keys(groups).sort((a,b)=>Number(groups[b][0].pendingSync||false)-Number(groups[a][0].pendingSync||false)||String(groups[b][0].date).localeCompare(String(groups[a][0].date))||String(groups[b][0].created_at||'').localeCompare(String(groups[a][0].created_at||''))||String(b).localeCompare(String(a)));
  tbody.closest('table')?.classList.add('journal-no-actions14388');const visible=transactionPage14340(tbody,groups,ids);
  if(!ids.length){tbody.innerHTML=`<tr><td colspan="7" class="period-empty">No transactions found.</td></tr>`;return;}
  tbody.innerHTML=visible.map(({id,start,end})=>{const lines=groups[id].slice(start,end),first=lines[0],dbId=first.dbEntryId||'',pending=lines.some(line=>line.pendingSync),adjusted=isAdjustedTransaction(lines);return lines.map((line,index)=>{const account=getCleanAccountDisplay(line.account,line.currency),rowClass=lines.length===1?'cluster-row-start cluster-row-end':index===0?'cluster-row-start':index===lines.length-1?'cluster-row-cont cluster-row-end':'cluster-row-cont',actions=pending&&!first.localJournal14385?`<button class="je-btn je-btn-secondary" disabled aria-label="Edit after saving completes">Edit</button>${canVoidTransactions()?'<button class="je-btn je-btn-danger" disabled aria-label="Void after saving completes">Void</button>':''}`:actionMode==='edit'?`<button class="je-btn je-btn-secondary" onclick="loadEntryForEdit(${escapeHtml(JSON.stringify(id))})">Edit</button>${canVoidTransactions()&&(dbId||first.localJournal14385)?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry(${escapeHtml(JSON.stringify(dbId))},${escapeHtml(JSON.stringify(id))})">Void</button>`:''}`:actionMode==='review'?`<button class="je-btn je-btn-secondary" onclick="openTransactionReview(${escapeHtml(JSON.stringify(id))})">Review</button>${canVoidTransactions()&&(dbId||first.localJournal14385)?`<button class="je-btn je-btn-danger" onclick="voidLiveJournalEntry(${escapeHtml(JSON.stringify(dbId))},${escapeHtml(JSON.stringify(id))})">Void</button>`:''}`:'';return`<tr class="${rowClass}" data-created-at="${escapeHtml(first.created_at||first.createdAt||first.date||'')}" data-entry-id="${escapeHtml(id)}" data-line-index="${index+start}">${index===0?`<td rowspan="${lines.length}" class="entry-shared-cell">${formatAppDate(first.date)}</td><td rowspan="${lines.length}" class="entry-shared-cell"><div class="entry-id-stack"><span style="font-family:monospace;color:#065f46">${escapeHtml(first.localJournal14385&&!dbId?'Awaiting entry number':id)}${pending?'<small>Saved on device · pending sync</small>':''}</span>${adjusted?`<button type="button" class="adjusted-entry-badge adjusted-entry-button" onclick="event.stopPropagation();openAdjustedDetails(${escapeHtml(JSON.stringify(id))})">Adjusted</button>`:''}<div class="transaction-review-actions" hidden>${actions}</div></div></td>`:''}<td><div class="transaction-account-display"><span class="currency-symbol-badge">${escapeHtml(currencySymbolV6(account.currency))}</span><span class="account-clean-name ${AccountingStore.accounts.some(a=>(a.id===line.accountId||a.name===line.account)&&(a.isTechnical||a.type==='SYSTEM'))?'system-account-name14399':''}">${escapeHtml(account.name)}</span></div></td><td>${escapeHtml(line.memo||line.generalMemo||'')}</td><td class="rate-col14387">${escapeHtml(window.JournalFX14383?.compact(line.book_rate_lak||line.fx_rate_lak||(line.currency==='LAK'?1:null),line.currency)||'—')}</td><td class="num">${line.debit>0?formatAppNumber(line.debit):'-'}</td><td class="num">${line.credit>0?formatAppNumber(line.credit):'-'}</td></tr>`}).join('')}).join('');
}
function setTransactionTableHeaders(id,withActions){const header=document.getElementById(id);if(!header)return;header.innerHTML=`<th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th class="rate-col14387">Rate</th><th class="num">Debit</th><th class="num">Credit</th>`}
renderJournalHistoryTable=function(records=JournalModule.entries){const current=getCurrentMonthPrefix();setTransactionTableHeaders('thJournalHistoryRow',true);renderTransactionReviewTable(document.getElementById('tblJournalHistoryBody'),records.filter(r=>String(r.date).slice(0,7)===current&&!r.archived),'edit')};
renderAllTransactionsTable=function(){setTransactionTableHeaders('thAllTransRow',false);renderTransactionReviewTable(document.getElementById('allTransactionsBody'),JournalModule.entries.filter(r=>r.archived),'none')};
renderNewTransactionsTable=function(){const host=document.getElementById('newTransactionsGroupedContainer');if(!host)return;const rows=JournalModule.entries.filter(r=>!r.archived),months=[...new Set(rows.map(r=>String(r.date).slice(0,7)))].sort().reverse(),current=getCurrentMonthPrefix();if(!months.length){host.innerHTML='<div class="empty-archive-state">No open transactions. All monthly batches have been submitted for review.</div>';return}host.innerHTML=months.map((month,index)=>`<section class="monthly-unarchived-cluster ${month===current?'current-month-cluster':'overdue-month-cluster'}"><div class="monthly-cluster-header"><div><h4>${month===current?'Current Period':'Open Period'} — ${monthLabel(month)}</h4><span class="archive-status ${month===current?'current':'overdue'}">${month===current?'OPEN':'UNARCHIVED'}</span></div><button type="button" class="je-btn je-btn-emerald no-print" onclick="archiveTransactionMonth('${month}')">Archive &amp; Submit</button></div><div class="table-container"><table class="clustered-journal-table"><thead><tr id="openPeriodHeader${index}"></tr></thead><tbody id="openPeriodBody${index}"></tbody></table></div></section>`).join('');months.forEach((month,index)=>{setTransactionTableHeaders(`openPeriodHeader${index}`,true);renderTransactionReviewTable(document.getElementById(`openPeriodBody${index}`),rows.filter(r=>String(r.date).slice(0,7)===month),'edit')})};
async function openTransactionReview(entryNo){
  const actor=liveProfile?.id,client=ojmDb,lines=JournalModule.entries.filter(row=>row.id===entryNo);if(!lines.length)return;const month=String(lines[0].date).slice(0,7),dbId=lines[0].dbEntryId;
  if(dbId&&ojmDb){const result=await client.rpc('mark_journal_entry_under_review',{p_entry_id:dbId,p_note:'Opened from transaction review'});if(liveProfile?.id!==actor||ojmDb!==client)return;if(result.error)showAppNotification('Review Status',result.error.message,true)}
  switchTab('period-review');selectReviewPeriod(month);openPeriodFindingForm();const select=document.getElementById('findingTransactionId'),description=document.getElementById('findingDescription');if(select)select.value=entryNo;if(description)description.value=`Review requested for ${entryNo}: `;description?.focus();
}
let pendingVoidTransaction=null;
function voidLiveJournalEntry(dbId,entryNo){pendingVoidTransaction={dbId,entryNo,actor:liveProfile?.id,client:ojmDb};const caption=document.getElementById('voidTransactionCaption'),reason=document.getElementById('voidTransactionReason'),error=document.getElementById('voidTransactionError');if(caption)caption.textContent=`${entryNo} will remain in the audit trail.`;if(reason)reason.value='';if(error)error.textContent='';openModal('modalVoidTransaction');setTimeout(()=>reason?.focus(),80)}
function closeVoidTransactionModal(){pendingVoidTransaction=null;closeModal('modalVoidTransaction')}
async function confirmVoidTransaction(){
 const reason=document.getElementById('voidTransactionReason')?.value.trim(),errorBox=document.getElementById('voidTransactionError'),pending=pendingVoidTransaction;
 if(!pending||pending.busy)return;
 if(pending.actor!==liveProfile?.id||pending.client!==ojmDb){closeVoidTransactionModal();return}
 if(!reason){if(errorBox)errorBox.textContent='Please provide the reason for voiding this transaction.';return}
 pending.busy=true;const current=()=>pending.actor===liveProfile?.id&&pending.client===ojmDb;
 try{
  const {error}=await pending.client.rpc('void_journal_entry',{p_entry_id:pending.dbId,p_reason:reason});if(!current())return;if(error)throw error;
  // Apply the confirmed result immediately; audit and journal downloads are independent.
  for(const job of window.pendingPosts99?.values()||[])if(job.receipt?.some(row=>row.entry_id===pending.dbId)){
   job.voidedEntryIds=[...new Set([...(job.voidedEntryIds||[]),pending.dbId])];
   try{
    if(job.receipt.every(row=>job.voidedEntryIds.includes(row.entry_id))){window.localFirst14333?.mainFinish(pending.actor,job.id);window.pendingPosts99.delete(job.id)}
    else window.localFirst14333?.mainSave(job,pending.actor);
   }catch(error){window.localFirst14333?.storageError('The void is confirmed, but its device recovery record could not update: '+error.message)}
  }
  JournalModule.entries=JournalModule.entries.filter(row=>row.dbEntryId!==pending.dbId);
  refreshAllTables();
  if(pendingVoidTransaction===pending)closeVoidTransactionModal();
  showAppNotification('Transaction Voided',`${pending.entryNo} remains in the audit trail with its void reason.`,false);
  const results=await Promise.allSettled([loadTransactionAudit(),loadJournalFromSupabase()]);
  if(current()&&results.some(result=>result.status==='rejected'))showAppNotification('Transaction Voided','The void is confirmed. Some history could not refresh; retry the history refresh.',true);
 }catch(error){if(current()&&pendingVoidTransaction===pending&&errorBox)errorBox.textContent=error.message||'The server response could not be confirmed. Refresh before retrying.'}
 finally{pending.busy=false}
}


let LiveTransactionAudit=[];
async function loadTransactionAudit(){
  if(!ojmDb||!liveProfile)return;const actor=liveProfile.id,client=ojmDb;const {data,error}=await client.from('audit_log').select('id,record_id,action,reason,old_data,new_data,actor_id,created_at').in('table_name',['journal_entries','accounting_periods','period_findings','scheduled_journals']).order('created_at',{ascending:false}).limit(250);
  if(liveProfile?.id!==actor||ojmDb!==client)return;if(error)throw error;if(!error){LiveTransactionAudit=data||[];renderVoidedTransactionsTable();}
}
function auditRecordId(item){
 const safe=item||{},old=(Array.isArray(safe.old_data)?safe.old_data[0]:safe.old_data)||{},next=(Array.isArray(safe.new_data)?safe.new_data[0]:safe.new_data)||{},uuid=v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(v||''));
 const known=old.schedule_no||next.schedule_no||old.entry_no||next.entry_no;if(known)return known;
 for(const id of [old.journal_entry_id,next.journal_entry_id,old.id,next.id,safe.record_id]){const row=JournalModule.entries.find(r=>r.dbEntryId===id);if(row?.id&&!uuid(row.id))return row.id;}
 return [old.id,next.id,safe.record_id].find(id=>id&&!uuid(id))||'Record number not recorded';
}
function auditLines(data){if(Array.isArray(data))return data.filter(row=>row&&typeof row==='object');if(Array.isArray(data?.lines)){const header={...data};delete header.lines;return data.lines.filter(row=>row&&typeof row==='object').map(line=>({...header,...line}))}if(data&&typeof data==='object'&&Object.keys(data).length)return[data];return[]}
function auditField(row,key){const aliases={date:['date','transaction_date','line_date'],entry:['entry_no','id'],account:['account','account_name'],memo:['memo','description','reference'],debit:['debit'],credit:['credit'],currency:['currency','currency_code'],status:['status','correction_status']};for(const name of aliases[key])if(row?.[name]!==undefined&&row?.[name]!==null&&row?.[name]!=='')return row[name];return''}
function auditComparisonHtml(oldData,newData,action){const oldLines=auditLines(oldData),newLines=auditLines(newData),fields=[['date','Date'],['entry','Entry ID'],['account','Account'],['memo','Memo / Reference'],['debit','Debit'],['credit','Credit'],['currency','Currency'],['status','Status']],count=Math.max(oldLines.length,newLines.length,1),rows=[];for(let i=0;i<count;i++){for(const[field,label]of fields){const before=auditField(oldLines[i],field),after=auditField(newLines[i],field);if(before===''&&after==='')continue;const changed=String(before)!==String(after),removed=before!==''&&after==='',beforeText=field==='date'&&before?formatAppDate(before):before,afterText=field==='date'&&after?formatAppDate(after):after;rows.push(`<tr><td class="audit-field">${count>1?`Line ${i+1} — `:''}${label}</td><td class="${changed?'audit-original-changed':''}">${escapeHtml(String(beforeText===''?'—':beforeText))}${removed?'<span class="audit-removed-mark">Removed</span>':''}</td><td>${escapeHtml(String(afterText===''?'—':afterText))}</td></tr>`)}}if(!rows.length)return'<div class="audit-empty-detail">No journal-field changes were recorded for this audit action.</div>';return`<table class="audit-compare-table"><thead><tr><th>Journal field</th><th>Original / Removed</th><th>Revised / Result</th></tr></thead><tbody>${rows.join('')}</tbody></table>`}
function openAdjustedDetails(entryId){const local=(JournalModule.voidedEntries||[]).map((item,index)=>({id:item.id||`local-${index}`,record_id:item.id,action:'ADJUSTMENT',reason:item.explanation,old_data:item.oldData,new_data:item.newData,created_at:item.timestamp,actor_id:null})),audits=[...LiveTransactionAudit,...local],item=audits.find(record=>auditRecordId(record)===entryId||auditLines(record.old_data).some(row=>row.id===entryId||row.entry_no===entryId)||auditLines(record.new_data).some(row=>row.id===entryId||row.entry_no===entryId));let modal=document.getElementById('modalAdjustmentQuickView');if(!modal){modal=document.createElement('div');modal.id='modalAdjustmentQuickView';modal.className='modal-backdrop';modal.innerHTML='<div class="modal-dialog modal-center adjustment-quick-dialog"><div class="modal-header"><h4>Adjustment Details</h4><button type="button" class="modal-close-x" onclick="closeModal(\'modalAdjustmentQuickView\')">&times;</button></div><div class="modal-body" id="adjustmentQuickViewBody"></div><div class="modal-footer"><button type="button" class="je-btn je-btn-secondary" onclick="closeModal(\'modalAdjustmentQuickView\')">Close</button></div></div>';document.body.appendChild(modal)}const body=document.getElementById('adjustmentQuickViewBody');body.innerHTML=item?`<div class="je-subtitle" style="margin-bottom:7px"><strong>${escapeHtml(String(item.action||'ADJUSTMENT').replaceAll('_',' '))}</strong> • ${escapeHtml(item.reason||'No reason recorded')}</div>${auditComparisonHtml(item.old_data,item.new_data,item.action)}`:'<div class="empty-archive-state">No linked audit details are available for this adjusted entry.</div>';openModal('modalAdjustmentQuickView')}
const loadJournalFromSupabaseBeforeAudit=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforeAudit();if(document.querySelector('.tab-content.active')?.id==='transactions-voided')await loadTransactionAudit();};
const switchTabBeforeTransactionAudit=switchTab;
switchTab=function(tabId){const result=switchTabBeforeTransactionAudit(tabId);if(tabId==='transactions-voided'&&!window.startup14257)loadTransactionAudit();if(tabId==='transactions-all')renderAllTransactionsTable();if(tabId==='transactions-new')renderNewTransactionsTable();return result;};

async function loadAccountingPeriodStatuses(){
  if(!ojmDb||!liveProfile)return;const actor=liveProfile.id,client=ojmDb;const {data,error}=await client.from('accounting_periods').select('period_month,status,updated_at,updated_by');if(error)throw Error(error.message);if(liveProfile?.id!==actor||ojmDb!==client)throw Error('Sign-in changed while loading period statuses.');PeriodReview.periods=Object.create(null);
  (data||[]).forEach(item=>{const key=String(item.period_month).slice(0,7);PeriodReview.periods[key]={...(PeriodReview.periods[key]||{}),status:item.status,updatedAt:item.updated_at,updatedBy:item.updated_by};});
  JournalModule.entries.forEach(row=>{const state=PeriodReview.status(String(row.date).slice(0,7));row.archived=state!=='open';});
  refreshAllTables();
}
function showPeriodToast(message,isError=false){let toast=document.getElementById('periodStatusToast');if(!toast){toast=document.createElement('div');toast.id='periodStatusToast';toast.className='period-status-toast';document.body.appendChild(toast)}clearTimeout(showPeriodToast.timer);toast.textContent=message;toast.classList.toggle('is-error',isError);toast.classList.add('is-visible');showPeriodToast.timer=setTimeout(()=>toast.classList.remove('is-visible'),2600)}
const loadJournalFromSupabaseBeforePeriods=loadJournalFromSupabase;
loadJournalFromSupabase=async function(){await loadJournalFromSupabaseBeforePeriods();await loadAccountingPeriodStatuses();};
const changePeriodStatusLocal=changePeriodStatus;
let periodUpdatePending98=false;
changePeriodStatus=async function(nextStatus){
  const actor=liveProfile?.id,client=ojmDb,month=PeriodReview.selectedMonth,current=PeriodReview.status(month),openFindings=PeriodReview.findings.filter(item=>item.month===month&&!['corrected','closed'].includes(item.status)).length;
  if(periodUpdatePending98){showAppNotification('Period Update In Progress','Wait for the current period update to finish.',true);return false}
  if(nextStatus==='closed'&&openFindings){showAppNotification('Open Findings',`Resolve or close ${openFindings} finding(s) before closing this period.`,true);return false}
  if(nextStatus==='locked'&&current!=='closed'){showAppNotification('Close Period First','A period must be closed before locking it.',true);return false}
  periodUpdatePending98=true;
  const controls=[...document.querySelectorAll('#finishPeriod69,#reopenedBooks button,.period-closing-bar button')];
  const disabled=controls.map(n=>n.disabled);controls.forEach(n=>n.disabled=true);
  try {
    if(!ojmDb)throw new Error('The database connection is unavailable. Sign in again and retry.');
    showPeriodToast('Updating period…');
    const {error}=await window.periodClosing14317.setStatus(month,nextStatus);
    if(liveProfile?.id!==actor||ojmDb!==client)return false;if(error)throw error;
    // The server closing RPC already updated local state. Never replay the legacy lock validator.
    if(!['closed','locked'].includes(nextStatus)){PeriodReview.periods[month]={...(PeriodReview.periods[month]||{}),status:nextStatus};PeriodReview.save();JournalModule.entries.filter(r=>String(r.date).startsWith(month)).forEach(r=>r.archived=nextStatus!=='open');refreshAllTables();renderPeriodReview();}
    showPeriodToast(`Period ${nextStatus==='open'?'reopened':nextStatus}.`);
    // Audit refresh is independent of a confirmed period update.
    Promise.resolve(loadTransactionAudit()).catch(()=>{});
    return true;
  }catch(error){
    if(liveProfile?.id!==actor||ojmDb!==client)return false;const detail=/fetch|network|load failed/i.test(error.message||'')?'Could not confirm the period update with the server. Your current journal remains available. Check your connection, reload the period status, and retry.':error.message||'Please retry.';
    showAppNotification('Period Update Failed',detail,true);return false;
  }finally{periodUpdatePending98=false;if(liveProfile?.id===actor&&ojmDb===client){controls.forEach((n,i)=>n.disabled=disabled[i]);renderPeriodReview()}}
};

