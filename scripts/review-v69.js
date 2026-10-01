/* REVIEW 69 — comparison, findings, re-closing, and fund adjustment presentation. */
function findingActions69(item){return item.status==='open'?`<div class="finding-actions69"><button class="je-btn je-btn-secondary" onclick="startFindingAdjustment('${item.id}')">Create Adjustment</button><button class="je-btn je-btn-secondary" onclick="closeFinding('${item.id}')">Close Finding</button></div>`:item.adjustmentEntryId?`<span>Adjustment: ${escapeHtml(item.adjustmentEntryId)}</span>`:''}
const periodRenderBefore69=renderPeriodReview;
renderPeriodReview=function(){
 periodRenderBefore69();
 const sums={};
 periodEntries().forEach(row=>{
  const currency=row.currency||'LAK';
  const totals=sums[currency]||(sums[currency]={debit:0,credit:0});
  totals.debit+=Number(row.debit||0);
  totals.credit+=Number(row.credit||0);
 });
 for(const [id,side] of [['periodReviewDebits','debit'],['periodReviewCredits','credit']]){
  const summary=document.getElementById(id);
  if(summary)summary.textContent=Object.entries(sums).map(([currency,totals])=>currency+' '+formatAppNumber(totals[side])).join(' / ')||'0.00';
 }
 const form=document.getElementById('periodFindingForm');if(form)form.hidden=false;
 const bar=document.querySelector('.period-closing-bar>div'),month=PeriodReview.selectedMonth,state=PeriodReview.status(month);
 if(bar){let finish=document.getElementById('finishPeriod69');if(!finish){finish=document.createElement('button');finish.id='finishPeriod69';finish.className='je-btn je-btn-emerald';finish.textContent='Finish Editing';bar.prepend(finish)}finish.hidden=state!=='open';finish.onclick=()=>finishEditing69(month);const lock=bar.querySelector('[onclick*="locked"]');if(lock){lock.disabled=state!=='closed';lock.title=state==='closed'?'Lock this closed period':'Finish editing and close this period before locking'}}
 const tbody=document.getElementById('periodTransactionsBody');if(tbody){tbody.querySelectorAll('.period-linked-finding').forEach(note=>{const id=note.previousElementSibling?.dataset.entryId;if(id)tbody.querySelectorAll('tr[data-entry-id]').forEach(r=>{if(r.dataset.entryId===id)r.classList.add('finding-group69')})});const general=PeriodReview.findings.filter(f=>f.month===month&&!f.transactionId);if(general.length)tbody.insertAdjacentHTML('beforeend',general.map(f=>`<tr class="period-linked-finding"><td colspan="7"><strong>Period finding ${escapeHtml(f.number)}</strong> — ${escapeHtml(f.description)}${findingActions69(f)}</td></tr>`).join(''))}
};
const reopenedBefore69=renderReopened67;renderReopened67=function(){reopenedBefore69();document.querySelectorAll('#reopenedBooks .reopened-book').forEach(card=>{const m=card.id.replace('reopened-','');const b=document.createElement('button');b.className='je-btn je-btn-danger';b.textContent='Finish Editing';b.onclick=()=>finishEditing69(m);card.querySelector('header').append(b)})};
function finishEditing69(month){
 if(JournalModule.editingEntryId&&JournalModule.entries.some(r=>r.id===JournalModule.editingEntryId&&r.date.startsWith(month))){showCenterStatus('Save or reset the entry being edited before finishing this book.',true);return}
 return closeMonthFromAccounts(month);
}
const approvedComparisons69=new Map();
function journalFingerprint69(j){return JSON.stringify({status:j.status,lines:j.lines||[]})}
const comparisonBefore69=openSubmissionComparison;
openSubmissionComparison=async function(id){
 await comparisonBefore69(id);const overlay=document.getElementById('submissionComparisonOverlay'),j=allReviewJournals().find(x=>x.id===id);if(!overlay||!j)return;
 const grid=overlay.querySelector('.submission-compare-grid');if(grid&&grid.children.length===2)grid.prepend(grid.lastElementChild);
 const canApprove=liveProfile?.role==='admin'||livePermission?.can_approve;
 const approved=approvedComparisons69.get(id)===journalFingerprint69(j);
 const footer=document.createElement('footer');footer.className='compare-footer69';
 if(j.status==='submitted'&&canApprove){footer.innerHTML=`<span>${approved?'Approved for this comparison. Check both sides before posting.':'Inspection only — approve after reviewing the source and receipts.'}</span><button class="je-btn je-btn-danger" onclick="returnComparison69('${id}')">Return</button>${approved?`<button id="postCompare69" class="je-btn je-btn-emerald" onclick="postCompared69('${id}')">${(j.lines||[]).some(l=>!wsIsCollection(l)&&!l.journal_entry_id)?'Post':'Finish Review'}</button>`:`<button class="je-btn je-btn-emerald" onclick="prepareReviewJournal('${id}')">Approve</button>`}`}
 overlay.querySelector('.submission-compare-window').append(footer);
 // Click and keyboard selection stay highlighted; hovering does not change the selection.
 overlay.querySelectorAll('[data-links]').forEach(old=>{const row=old.cloneNode(true);old.replaceWith(row);row.tabIndex=0;const highlight=()=>{const ids=row.dataset.links.split(' ').filter(Boolean);overlay.querySelectorAll('[data-links]').forEach(other=>other.classList.toggle('is-compare-linked',ids.some(id=>other.dataset.links.split(' ').includes(id))));const opposite=[...overlay.querySelectorAll('.is-compare-linked')].find(n=>n.closest('section')!==row.closest('section'));if(opposite){const bounds=opposite.getBoundingClientRect();if(bounds.top<0||bounds.bottom>innerHeight)opposite.scrollIntoView({block:'nearest',behavior:'smooth'})}};row.onclick=highlight;row.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();highlight()}}});
};
prepareReviewJournal=function(id){const j=allReviewJournals().find(x=>x.id===id);if(!j||j.status!=='submitted')return;if(liveProfile?.role!=='admin'&&!livePermission?.can_approve){showCenterStatus('Approval permission is required.',true);return}approvedComparisons69.set(id,journalFingerprint69(j));openSubmissionComparison(id)};
approveReviewJournal=prepareReviewJournal;
function returnComparison69(id){approvedComparisons69.delete(id);returnReviewJournal(id)}
function eligibleSource69(j){return(j.lines||[]).filter(l=>!wsIsCollection(l)&&!l.journal_entry_id)}
function prepareComparedForm69(j){
 clearJournalEntry();setJournalDateMode(true);document.getElementById('jeLinesBody').innerHTML='';document.getElementById('jeGeneralMemo').value=`Sub-user submission — ${getLiveUserName(j.owner_id)} — ${String(j.period_start).slice(0,7)}`;
 eligibleSource69(j).forEach(source=>{doubleEntryLines({lines:[source]}).forEach(l=>{
  const incoming=source.direction==='in',accountId=l.side==='debit'?(incoming?source.fund_account_id:source.account_id):(incoming?source.account_id:source.fund_account_id),account=AccountingStore.accounts.find(a=>a.id===accountId);
  const display=account?`${account.code} — ${account.name}`:l.displayAccount;
  addJournalLineRow(display,[source.memo,source.reference].filter(Boolean).join(' • '),l.side==='debit'?String(l.amount):'',l.side==='credit'?{[l.currency_code||account?.currency||'LAK']:String(l.amount)}:{});
  const row=document.getElementById('jeLinesBody').lastElementChild;row.querySelector('.je-line-date').value=l.transaction_date;row.dataset.sourceId=source.id;
 })});
 pendingWorkspacePostOwnerId=j.owner_id;pendingWorkspacePostJournalId=j.id;pendingWorkspacePostIsLocal=false;calculateJournalBalance();
}
let comparePosting69=false;
async function postCompared69(id){
 if(comparePosting69)return;const j=allReviewJournals().find(x=>x.id===id);if(!j||j.status!=='submitted'||approvedComparisons69.get(id)!==journalFingerprint69(j)){showCenterStatus('The submission changed. Review and approve it again.',true);return}
 if(liveProfile?.role!=='admin'&&!livePermission?.can_approve){showCenterStatus('Approval permission is required.',true);return}
 const oldFingerprint=journalFingerprint69(j);comparePosting69=true;const button=document.getElementById('postCompare69');if(button)button.disabled=true;
 try{
  await loadStaffJournalsForReview();const fresh=allReviewJournals().find(x=>x.id===id);if(!fresh||journalFingerprint69(fresh)!==oldFingerprint){approvedComparisons69.delete(id);showCenterStatus('The submission changed on the server. Compare and approve it again.',true);return}
  const eligible=eligibleSource69(fresh);
  if(!eligible.length){const r=await ojmDb.rpc('review_collection_report',{p_journal_id:id});if(r.error)throw r.error;await loadStaffJournalsForReview();document.getElementById('submissionComparisonOverlay')?.remove();showCenterStatus('Report reviewed; no duplicate journal entries were posted.');return}
  if(eligible.some(l=>PeriodReview.status(String(l.transaction_date).slice(0,7))!=='open')){showCenterStatus('A source date belongs to a closed period. Reopen it before posting.',true);return}
  prepareComparedForm69(fresh);await submitJournalEntry();if(!pendingWorkspacePostJournalId){approvedComparisons69.delete(id);document.getElementById('submissionComparisonOverlay')?.remove()}
 }catch(e){showCenterStatus(e.message||'Posting failed.',true)}finally{comparePosting69=false;if(button)button.disabled=false}
}
function adjustmentDetails69(item,applied=false,live={}){
 return `<section class="adjustment-section69"><h3>${applied?(item.status==='approved_applied'?'Applied Adjustment':'Approval Calculation'):'Requested Adjustment'}</h3>${(item.lines||[]).map(l=>{const before=Number(live[l.activity_key]??l.current_before??0),after=before+Number(l.difference);return `<article><h4>${escapeHtml(String(l.activity_key).replaceAll('_',' '))}</h4><dl>${(applied?[[item.status==='approved_applied'?'Balance before approval':'Current amount',before],['Difference applied',Number(l.difference_applied??l.difference)],['Resulting amount',Number(l.current_after??after)]]:[['Recorded at submission',Number(l.original_value)],['Requested amount',Number(l.requested_value)],['Requested difference',Number(l.difference)]]).map(([label,value])=>`<div><dt>${label}</dt><dd>${formatAppNumber(value)}</dd></div>`).join('')}</dl></article>`}).join('')}</section>`;
}
// Shared helper used by both report renderers, without altering stored requests.
window.adjustmentReport69=item=>adjustmentDetails69(item)+(item.status==='approved_applied'?adjustmentDetails69(item,true):'')+`<p class="final-record-note"><strong>Explanation:</strong> ${escapeHtml(item.explanation||'')}<br><strong>Supporting report:</strong> ${escapeHtml(item.report_reference||'—')}<br><strong>Submitted:</strong> ${escapeHtml(item.submitted_at||'')}${item.reviewed_at?`<br><strong>Approved:</strong> ${escapeHtml(item.reviewed_at)} · ${escapeHtml(getLiveUserName(item.reviewed_by))}`:''}</p>`;
v49ApproveAdjustment=async function(id){
 try{const r=await ojmDb.from('fund_adjustment_requests').select('*,lines:fund_adjustment_lines(*)').eq('id',id).single();if(r.error)throw r.error;const item=r.data;if(item.status!=='submitted'){showCenterStatus('This request is no longer waiting for approval.',true);return}
 const live={};for(const l of item.lines){const result=await ojmDb.rpc('workspace_live_activity_v49',{p_owner_id:item.owner_id,p_fund_account_id:item.fund_account_id,p_activity_key:l.activity_key});if(result.error)throw result.error;live[l.activity_key]=Number(result.data)}
 document.getElementById('approveAdjustment69')?.remove();const overlay=document.createElement('div');overlay.id='approveAdjustment69';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="source-dialog69"><header><h3>Fund Adjustment ${escapeHtml(item.request_no)}</h3><button class="je-btn je-btn-secondary" onclick="document.getElementById('approveAdjustment69').remove()">Close</button></header>${adjustmentDetails69(item)}${adjustmentDetails69(item,true,live)}<p>${escapeHtml(item.explanation)}</p><p>The server recalculates the current amount and applies only the requested difference when approval is saved.</p><button class="je-btn je-btn-emerald" id="applyAdjustment69">Approve &amp; Apply Difference</button></section>`;document.body.append(overlay);overlay.querySelector('#applyAdjustment69').onclick=async function(){this.disabled=true;try{const result=await ojmDb.rpc('approve_fund_adjustment_v49',{p_request_id:id});if(result.error)throw result.error;overlay.remove();await loadStaffJournalsForReview();showCenterStatus('Adjustment applied to the live amount.')}catch(e){showCenterStatus(e.message,true);this.disabled=false}};
 }catch(e){showCenterStatus('Cannot prepare adjustment approval: '+e.message,true)}
};
// Do not turn absent amounts into deliberate zero corrections.
const adjustmentSubmitBefore69=v49SubmitAdjustment;v49SubmitAdjustment=function(...args){if(['received','used','handover'].some(k=>!document.getElementById('v49Adj-'+k)?.value.trim())){showCenterStatus('Enter every new actual amount, including zero where appropriate.',true);return}return adjustmentSubmitBefore69(...args)};
const archiveRenderBefore69=renderAllTransactionsTable;renderAllTransactionsTable=function(...args){const previous=document.querySelector('.archive-year');archiveRenderBefore69(...args);if(previous&&!document.getElementById('archiveMonths67')?.contains(previous))previous.remove();if(typeof polish69==='function')polish69()};
