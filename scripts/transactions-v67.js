/* TRANSACTIONS 67: active books, archived months and correction context. */
function setJournalDateMode(multiple) {
  document.getElementById('jeMultipleDates').checked=multiple;
  document.getElementById('jeSingleDate').checked=!multiple;
  toggleMultipleDates();
}
function journalContext67(text='') {
  let banner=document.getElementById('journalContext67');
  if(!banner){banner=document.createElement('div');banner.id='journalContext67';banner.setAttribute('role','status');document.querySelector('#journal .je-card-header').after(banner)}
  banner.textContent=text;banner.hidden=!text;
  document.getElementById('jeGeneralMemo').classList.toggle('adjustment-description',!!text);
}
function clearJournalEntry() {
  JournalModule.editingEntryId=null;JournalModule.pendingLines=null;PeriodReview.pendingAdjustment=null;
  pendingWorkspacePostOwnerId=null;pendingWorkspacePostJournalId=null;pendingWorkspacePostIsLocal=false;
  document.getElementById('jeGeneralMemo').value='';
  document.getElementById('txtEditReason').value='';
  document.getElementById('btnPostJournal').textContent='Post Entry';
  setTransactionDateToToday(true);setJournalDateMode(false);resetJournalLinesForm();
  updateNextEntryIdDisplay();journalContext67();
}
const editBefore67=loadEntryForEdit;
loadEntryForEdit=function(id){
  const lines=JournalModule.entries.filter(r=>r.id===id);
  if(!lines.length||lines.some(r=>r.archived)){return editBefore67(id)}
  clearJournalEntry();editBefore67(id);
  const inputs=document.querySelectorAll('#jeLinesBody .je-line-acc');inputs.forEach(updateJournalAccountBadge);
  const month=String(lines[0].date).slice(0,7);
  journalContext67(`Editing ${id}${PeriodReview.periods[month]?.reopenedAt?' · Reopened Book — '+monthLabel(month):''}`);
  calculateJournalBalance();
};
function isReopened67(month){return PeriodReview.status(month)==='open'&&!!PeriodReview.periods[month]?.reopenedAt}
function monthTotals67(rows){
  const totals={};rows.forEach(r=>{const t=totals[r.currency]||(totals[r.currency]={dr:0,cr:0});t.dr+=Number(r.debit||0);t.cr+=Number(r.credit||0)});
  return Object.entries(totals).map(([c,t])=>`${c}: Debit ${formatAppNumber(t.dr)} · Credit ${formatAppNumber(t.cr)}`).join(' | ');
}
function renderReopened67(){
  const host=document.getElementById('reopenedBooks');if(!host)return;
  const months=Object.keys(PeriodReview.periods).filter(isReopened67).sort().reverse();host.hidden=!months.length;
  host.innerHTML=months.map((m,i)=>{const p=PeriodReview.periods[m];return `<section class="je-card reopened-book" id="reopened-${m}"><header class="je-card-header"><div><h3>Reopened Book — ${escapeHtml(monthLabel(m))}</h3><p>${escapeHtml(p.reopenReason||'Reopened for correction')} · ${escapeHtml(p.reopenedByName||p.updatedBy||'Recorded user')} · ${escapeHtml(p.reopenedAt)}</p><p>Review and edit this book separately. Close it again from Accounts when finished.</p></div></header><div class="table-container"><table class="clustered-journal-table"><thead><tr id="reopenHead${i}"></tr></thead><tbody id="reopenBody${i}"></tbody></table></div></section>`}).join('');
  months.forEach((m,i)=>{setTransactionTableHeaders(`reopenHead${i}`,true);renderTransactionReviewTable(document.getElementById(`reopenBody${i}`),periodEntries(m),'edit')});
}
renderJournalHistoryTable=function(records=JournalModule.entries){
  setTransactionTableHeaders('thJournalHistoryRow',true);
  renderTransactionReviewTable(document.getElementById('tblJournalHistoryBody'),records.filter(r=>!r.archived&&!isReopened67(String(r.date).slice(0,7))),'edit');renderReopened67();
};
renderNewTransactionsTable=function(){renderReopened67()};
function archiveFindings67(month){return PeriodReview.findings.filter(f=>f.month===month).map(f=>`<div class="archive-finding"><strong>${escapeHtml(f.number)}</strong> — ${escapeHtml(f.description)}<br><small>${escapeHtml(f.createdByName||f.createdBy||'Reviewer not recorded')} · ${escapeHtml(f.createdAt||'')} · ${escapeHtml(f.status)}${f.adjustmentEntryId?' · Adjustment '+escapeHtml(f.adjustmentEntryId):''}</small></div>`).join('')}
renderAllTransactionsTable=function(){
  const card=document.querySelector('#transactions-all > .je-card');if(!card)return;
  let host=document.getElementById('archiveMonths67');if(!host){card.querySelector('.table-container')?.remove();host=document.createElement('div');host.id='archiveMonths67';card.append(host)}
  const rows=JournalModule.entries.filter(r=>r.archived),months=[...new Set(rows.map(r=>String(r.date).slice(0,7)))].sort().reverse(),years=[...new Set(months.map(m=>m.slice(0,4)))];
  const selected=document.getElementById('archiveYear67')?.value||'';
  host.innerHTML='<label class="archive-year">Year <select id="archiveYear67" onchange="renderAllTransactionsTable()"><option value="">All years</option>'+years.map(y=>`<option ${selected===y?'selected':''}>${y}</option>`).join('')+'</select></label>';
  const visible=months.filter(m=>!selected||m.startsWith(selected));
  host.insertAdjacentHTML('beforeend',visible.map((m,i)=>{const group=rows.filter(r=>r.date.startsWith(m));return `<details class="archive-month"><summary><strong>${escapeHtml(monthLabel(m))} — ${PeriodReview.status(m)==='review'?'Under Review':'Closed'}</strong><span>${new Set(group.map(r=>r.id)).size} transactions · ${escapeHtml(monthTotals67(group))}</span><small>Updated: ${escapeHtml(PeriodReview.periods[m]?.updatedAt||group[0]?.archivedAt||'Not recorded')}</small></summary><div class="archive-month-actions"><button class="je-btn je-btn-secondary" onclick="switchTab('period-review');selectReviewPeriod('${m}')">Review Month</button><button class="je-btn je-btn-secondary" onclick="exportArchiveMonth67('${m}')">Export Month</button></div><div class="table-container"><table class="clustered-journal-table"><thead><tr id="archiveHead${i}"></tr></thead><tbody id="archiveBody${i}"></tbody></table></div>${archiveFindings67(m)}</details>`}).join('')||'<p>No archived months.</p>');
  visible.forEach((m,i)=>{setTransactionTableHeaders(`archiveHead${i}`,false);renderTransactionReviewTable(document.getElementById(`archiveBody${i}`),rows.filter(r=>r.date.startsWith(m)),'none')});
};
const statusBefore67=changePeriodStatus;
changePeriodStatus=async function(next){
  const m=PeriodReview.selectedMonth;let reason='';
  if(next==='open'){
    if(PeriodReview.status(m)==='open')return;
    if(liveProfile&&liveProfile.role!=='admin'){showAppNotification('Administrator Required','An administrator must reopen this book.',true);return}
    reason=(await ui117.prompt('Reason for reopening this book:'))?.trim();if(!reason)return;
  }
  const saved=await statusBefore67(next);
  if(saved===false)return false;
  if(PeriodReview.status(m)!==next)return;
  if(next==='open'){
    Object.assign(PeriodReview.periods[m],{reopenedAt:new Date().toISOString(),reopenReason:reason,reopenedByName:liveProfile?.full_name||liveProfile?.email||'Local administrator'});
    PeriodReview.save();refreshAllTables();switchTab('journal');renderReopened67();
    document.getElementById(`reopened-${m}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }else{renderReopened67();renderAllTransactionsTable()}
};
async function closeMonthFromAccounts(targetMonth){
  const month=targetMonth||document.getElementById('closeMonth67')?.value;if(!month)return;
  const rows=periodEntries(month);if(!rows.length){showAppNotification('No Entries','There are no posted entries in this month.',true);return}
  const currencies=[...new Set(rows.map(r=>r.currency))];
  if(currencies.some(c=>Math.abs(rows.filter(r=>r.currency===c).reduce((n,r)=>n+Number(r.debit)-Number(r.credit),0))>0.005)){showAppNotification('Unbalanced Month','Resolve the currency balances before closing.',true);return}
  showAppConfirm('Close & Archive Month',`Close ${monthLabel(month)} after reviewing the General Ledger and Trial Balance?`,'Close Month',async()=>{PeriodReview.selectedMonth=month;await changePeriodStatus('closed');refreshAllTables()});
}
archiveTransactionMonth=function(month){document.getElementById('closeMonth67').value=month;scrollToAccountModule('sec-general-ledger')};
startFindingAdjustment=function(id){
  const f=PeriodReview.findings.find(x=>x.id===id);if(!f||f.status!=='open')return;
  clearJournalEntry();PeriodReview.pendingAdjustment={findingId:id,knownIds:[...new Set(JournalModule.entries.map(r=>r.id))],oldData:JournalModule.entries.filter(r=>r.id===f.transactionId).map(r=>({...r}))};
  switchTab('journal');document.getElementById('jeGeneralMemo').value=`Adjustment ${f.number}: ${f.description}`;
  journalContext67(`Adjustment for ${f.number} · ${monthLabel(f.month)} — ${f.description}. Choose a posting date in an open period.`);
  document.querySelector('#journal .je-card').scrollIntoView({behavior:'smooth',block:'start'});
};
const finalBefore67=finalizePostSuccess;
finalizePostSuccess=function(...args){const entry=JournalModule.entries.find(r=>r.id===JournalModule.editingEntryId),month=entry?.date?.slice(0,7);finalBefore67(...args);journalContext67();renderReopened67();if(month&&isReopened67(month))document.getElementById(`reopened-${month}`)?.scrollIntoView({behavior:'smooth',block:'start'})};
const reviewBefore67=renderPeriodReview;
renderPeriodReview=function(){reviewBefore67();const findings=PeriodReview.findings.filter(f=>f.month===PeriodReview.selectedMonth);document.querySelectorAll('#periodFindingsList .period-finding-main').forEach((node,i)=>{const f=findings[i];if(!f)return;const note=document.createElement('small');note.textContent=`${f.createdByName||f.createdBy||'Reviewer not recorded'} · ${f.createdAt||''}`;node.append(note)})};
const switchBefore67=switchTab;
switchTab=function(id){return switchBefore67(id==='transactions-new'?'journal':id)};
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('closeMonth67').value=getCurrentMonthPrefix();renderReopened67()});
function exportArchiveMonth67(month){
  const rows=periodEntries(month),columns=['Entry ID','Date','Account','Currency','Memo','Debit','Credit'];
  const csv=[columns,...rows.map(r=>[r.id,r.date,r.account,r.currency,r.memo,r.debit,r.credit])].map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`journal-${month}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
