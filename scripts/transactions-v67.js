function journalPostedHistory143195(row){return !row.pendingSync&&!row.local14333&&!row.voided_at&&(!row.status||row.status==='posted')}
function journalIsHistory14342(row){const period=PeriodReview.periods[String(row.date).slice(0,7)];return period?period.status!=='open':!!row.archived;}
/* TRANSACTIONS 67: active books, archived months and correction context. */
function setJournalDateMode(multiple, fromUser = false) {
  document.getElementById('jeMultipleDates').checked=multiple;
  document.getElementById('jeSingleDate').checked=!multiple;
  toggleMultipleDates(true, fromUser);
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
  const totals=Object.create(null);rows.forEach(r=>{const t=totals[r.currency]||(totals[r.currency]={dr:0,cr:0});t.dr+=Number(r.debit||0);t.cr+=Number(r.credit||0)});
  return Object.entries(totals).map(([c,t])=>`${c}: Debit ${formatAppNumber(t.dr)} · Credit ${formatAppNumber(t.cr)}`).join(' | ');
}
function renderReopened67(){
  const host=document.getElementById('reopenedBooks');if(!host)return;
  const months=Object.keys(PeriodReview.periods).filter(isReopened67).sort().reverse();host.hidden=!months.length;
  host.innerHTML=months.map((m,i)=>{const p=PeriodReview.periods[m];return `<section class="je-card reopened-book" id="reopened-${m}"><header class="je-card-header"><div><h3>Reopened Book — ${escapeHtml(monthLabel(m))}</h3><p>${escapeHtml(p.reopenReason||'Reopened for correction')} · ${escapeHtml(p.reopenedByName||p.updatedBy||'Recorded user')} · ${escapeHtml(formatAppDate(p.reopenedAt,true))}</p><p>Review and edit this book separately. Close it again from Accounts when finished.</p></div></header><div class="table-container"><table class="clustered-journal-table"><thead><tr id="reopenHead${i}"></tr></thead><tbody id="reopenBody${i}"></tbody></table></div></section>`}).join('');
  months.forEach((m,i)=>{setTransactionTableHeaders(`reopenHead${i}`,true);renderTransactionReviewTable(document.getElementById(`reopenBody${i}`),periodEntries(m),'edit')});
}
renderJournalHistoryTable=function(records=JournalModule.entries){
  setTransactionTableHeaders('thJournalHistoryRow',true);
  renderTransactionReviewTable(document.getElementById('tblJournalHistoryBody'),records.filter(r=>!journalIsHistory14342(r)&&!isReopened67(String(r.date).slice(0,7))),'edit');renderReopened67();
};
renderNewTransactionsTable=function(){renderReopened67()};
function archiveFindings67(month){return PeriodReview.findings.filter(f=>f.month===month).map(f=>`<div class="archive-finding"><strong>${escapeHtml(f.number)}</strong> — ${escapeHtml(f.description)}<br><small>${escapeHtml(f.createdByName||f.createdBy||'Reviewer not recorded')} · ${escapeHtml(formatAppDate(f.createdAt||'',true))} · ${escapeHtml(f.status)}${f.adjustmentEntryId?' · Adjustment '+escapeHtml(f.adjustmentEntryId):''}</small></div>`).join('')}
renderAllTransactionsTable=function(){
 const card=document.querySelector('#transactions-all > .je-card,#journalHistory14316 > .je-card');if(!card)return;
 let host=document.getElementById('archiveMonths67');if(!host){card.querySelector('.table-container')?.remove();host=document.createElement('div');host.id='archiveMonths67';card.append(host)}
 const rows=JournalModule.entries.filter(journalPostedHistory143195),month=historyMonth14341.choose('journal',rows.map(r=>String(r.date).slice(0,7))),group=rows.filter(r=>String(r.date).startsWith(month));
 const currencies=[...new Set(group.map(r=>r.currency))];
 const total=side=>currencies.map(c=>escapeHtml(c)+' '+escapeHtml(formatAppNumber(group.filter(r=>r.currency===c).reduce((sum,r)=>sum+Number(r[side]||0),0)))).join('<br>')||'—';
 const status=PeriodReview.periods[month]?.status||(group.length?'open':'No records');
 host.innerHTML=`<section class="archive-month period-review-shell"><header class="history-header14342 period-review-toolbar"><h3 class="je-title">${escapeHtml(monthLabel(month))}</h3><div class="archive-month-actions">${historyMonth14341.control('journal',month)}<button class="je-btn je-btn-secondary" onclick="switchTab('period-review');selectReviewPeriod('${month}')">Review Month</button><button class="je-btn je-btn-secondary" onclick="exportArchiveMonth67('${month}')">Export Month</button></div></header><div class="period-summary-grid history-summary14343"><div class="period-summary-card"><span>Status</span><strong>${escapeHtml(status.toUpperCase())}</strong></div><div class="period-summary-card"><span>Journal Entries</span><strong>${new Set(group.map(r=>r.id)).size}</strong></div><div class="period-summary-card"><span>Total Debits</span><strong>${total('debit')}</strong></div><div class="period-summary-card"><span>Total Credits</span><strong>${total('credit')}</strong></div></div><section class="je-card history-table14343"><div class="je-card-header"><h3 class="je-title">Transaction History</h3></div><div class="table-container"><table class="clustered-journal-table"><thead><tr id="archiveHead0"></tr></thead><tbody id="archiveBody0"></tbody></table></div>${archiveFindings67(month)}</section></section>`;
 card.classList.add('history-shell14343');
 const oldHeader=card.querySelector(':scope>.je-card-header');if(oldHeader){oldHeader.querySelector('.je-subtitle')?.remove();oldHeader.querySelector('h3')?.remove();oldHeader.classList.add('history-search14343');}

 setTransactionTableHeaders('archiveHead0',false);renderTransactionReviewTable(document.getElementById('archiveBody0'),group,'none');
 historyMonth14341.bind(host,'journal',renderAllTransactionsTable);
 if(oldHeader&&!oldHeader.querySelector('input,select,textarea,button'))oldHeader.remove();
};

const statusBefore67=changePeriodStatus;
changePeriodStatus=async function(next){
  const m=PeriodReview.selectedMonth,actor=liveProfile?.id;const current=()=>liveProfile?.id===actor&&PeriodReview.selectedMonth===m;let reason='';
  if(next==='open'){
    if(PeriodReview.status(m)==='open')return;
    if(liveProfile&&liveProfile.role!=='admin'){showAppNotification('Administrator Required','An administrator must reopen this book.',true);return}
    reason=(await ui117.prompt('Reason for reopening this book:'))?.trim();if(!reason||!current())return;
  }
  const saved=await statusBefore67(next);
  if(!current())return false;
  if(saved===false)return false;
  if(PeriodReview.status(m)!==next)return;
  if(next==='open'){
    Object.assign(PeriodReview.periods[m],{reopenedAt:new Date().toISOString(),reopenReason:reason,reopenedByName:liveProfile?.full_name||liveProfile?.email||'Local administrator'});
    PeriodReview.save();refreshAllTables();switchTab('journal');renderReopened67();
    document.getElementById(`reopened-${m}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }else{renderReopened67();renderAllTransactionsTable()}
  return true;
};
async function closeMonthFromAccounts(targetMonth){
  const actor=liveProfile?.id;const month=targetMonth||document.getElementById('closeMonth67')?.value;if(!month)return;
  const rows=periodEntries(month);if(!rows.length){showAppNotification('No Entries','There are no posted entries in this month.',true);return}
  const currencies=[...new Set(rows.map(r=>r.currency))];
  if(currencies.some(c=>Math.abs(rows.filter(r=>r.currency===c).reduce((n,r)=>n+Number(r.debit)-Number(r.credit),0))>0.005)){showAppNotification('Unbalanced Month','Resolve the currency balances before closing.',true);return}
  showAppConfirm('Close & Archive Month',`Close ${monthLabel(month)} after reviewing the General Ledger and Trial Balance?`,'Close Month',async()=>{if(liveProfile?.id!==actor)return;PeriodReview.selectedMonth=month;await changePeriodStatus('closed');refreshAllTables()});
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
renderPeriodReview=function(){reviewBefore67();const findings=PeriodReview.findings.filter(f=>f.month===PeriodReview.selectedMonth);document.querySelectorAll('#periodFindingsList .period-finding-main').forEach((node,i)=>{const f=findings[i];if(!f)return;const note=document.createElement('small');note.textContent=`${f.createdByName||f.createdBy||'Reviewer not recorded'} · ${f.createdAt?formatAppDate(f.createdAt,true):''}`;node.append(note)})};
const switchBefore67=switchTab;
switchTab=function(id){return switchBefore67(id==='transactions-new'?'journal':id)};
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('closeMonth67').value=getCurrentMonthPrefix();renderReopened67()});
function exportArchiveMonth67(month){
  const rows=periodEntries(month),columns=['Entry ID','Date','Account','Currency','Memo','Debit','Credit'];
  const csv=[columns,...rows.map(r=>[r.id,r.date,r.account,r.currency,r.memo,r.debit,r.credit])].map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`journal-${month}.csv`;(window.exportCenter14337?exportCenter14337.fromLink(a):a.click());setTimeout(()=>URL.revokeObjectURL(url),1000);
}
