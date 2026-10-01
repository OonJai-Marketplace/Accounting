/* One review/history renderer; preserve expanded records and expose the older queue. */
(function(){
  'use strict';
  let legacyState='loading',legacyError='',busy=false;
  const esc=value=>escapeHtml(String(value??''));
  const pending=row=>['pending','submitted'].includes(String(row.status));
  function legacyCard(row){
    const waiting=pending(row),key='entry:'+row.id;
    return `<details class="final-record-card legacy-review139" data-record-key="${esc(key)}"><summary><span><strong>${esc(row.reference||'Single-entry submission')}</strong><small>${esc(getLiveUserName(row.submittedBy))} · ${esc(formatAppDate(row.date))} · ${esc(row.status)}</small></span><span class="final-record-count"><small>Entries</small><b>1</b></span><i>⌄</i></summary><div class="final-record-content"><div class="final-scroll-table"><table><thead><tr><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th><th>Currency</th></tr></thead><tbody><tr><td>${esc(row.debitAccount)}</td><td>${esc(row.memo)}</td><td>${esc(formatAppNumber(row.amount))}</td><td>—</td><td>${esc(row.currency)}</td></tr><tr><td>${esc(row.creditAccount)}</td><td>${esc(row.memo)}</td><td>—</td><td>${esc(formatAppNumber(row.amount))}</td><td>${esc(row.currency)}</td></tr></tbody></table></div>${waiting?`<footer><button type="button" class="je-btn je-btn-danger" data-review-entry139="${esc(row.id)}" data-decision139="rejected">Reject</button><button type="button" class="je-btn je-btn-emerald" data-review-entry139="${esc(row.id)}" data-decision139="approved">Approve &amp; Post</button></footer>`:''}${row.rejectionReason?`<p class="final-record-note">${esc(row.rejectionReason)}</p>`:''}</div></details>`;
  }
  const originalRender=window.renderUserEntryReview;
  window.renderUserEntryReview=function(){
    const containers=['userEntryReviewCards','userEntryHistoryCards'];
    const opened=new Set(containers.flatMap(id=>[...(document.getElementById(id)?.querySelectorAll('details[open][data-record-key]')||[])].map(card=>card.dataset.recordKey)));
    originalRender();
    const host=document.getElementById(containers[0]),history=document.getElementById(containers[1]);if(!host||!history)return;
    const rows=legacyState==='ready'?(DemoAccess.submissions||[]):[];
    const waiting=rows.filter(pending),completed=rows.filter(row=>!pending(row)&&row.status!=='draft');
    if(waiting.length){host.querySelector('.period-empty')?.remove();host.insertAdjacentHTML('beforeend',waiting.map(legacyCard).join(''))}
    if(completed.length){history.querySelector('.period-empty')?.remove();history.insertAdjacentHTML('beforeend',completed.map(legacyCard).join(''))}
    const count=host.querySelectorAll('.final-record-card').length;
    const summary=document.getElementById('userEntryReviewSummary'),badge=document.getElementById('navUserReviewCount');
    if(summary)summary.textContent=legacyState==='error'?'Review queue could not be fully loaded':legacyState==='loading'?'Checking submitted entries…':count?`${count} item${count===1?'':'s'} waiting`:'No submissions awaiting approval';
    if(badge){badge.textContent=count;badge.hidden=!count}
    host.classList.toggle('review-empty139',!count);
    if(!count){host.querySelector('.period-empty')?.remove()}
    if(legacyState==='error')host.insertAdjacentHTML('beforeend',`<p class="review-load-error139" role="alert">Could not check single-entry submissions: ${esc(legacyError)}. Reload the review queue before closing the year.</p>`);
    for(const id of containers){document.getElementById(id)?.querySelectorAll('[data-record-key]').forEach(card=>{if(opened.has(card.dataset.recordKey))card.open=true})}
  };
  const loadLegacy=window.loadSubmissionsFromSupabase;
  window.loadSubmissionsFromSupabase=async function(...args){
    try{const result=await loadLegacy.apply(this,args);legacyState='ready';legacyError='';renderUserEntryReview();return result}
    catch(error){legacyState='error';legacyError=error.message;renderUserEntryReview();throw error}
  };
  const loadReview=window.loadStaffJournalsForReview;
  window.loadStaffJournalsForReview=async function(...args){
    await loadReview.apply(this,args);
    if(ojmDb&&liveProfile&&(liveProfile.role==='admin'||livePermission?.can_approve))await loadSubmissionsFromSupabase();
  };
  const changeTab=window.switchTab;
  window.switchTab=function(id,...args){const result=changeTab.call(this,id,...args);if(id==='user-entry-review'&&!busy){busy=true;loadStaffJournalsForReview().catch(error=>{legacyState='error';legacyError=error.message;renderUserEntryReview()}).finally(()=>busy=false)}return result};
  document.addEventListener('click',async event=>{
    const action=event.target.closest?.('[data-review-entry139]');if(!action)return;
    event.preventDefault();if(action.disabled)return;action.disabled=true;
    try{await reviewEntrySubmission(action.dataset.reviewEntry139,action.dataset.decision139);renderUserEntryReview()}
    finally{if(action.isConnected)action.disabled=false}
  });
  // Buttons embedded in headers must not invoke the native details toggle.
  document.addEventListener('click',event=>{if(event.target.closest?.('#user-entry-review summary button, #user-entry-review summary a, #user-entry-review summary input, #user-entry-review summary select'))event.preventDefault()},true);
  function ready(){
    const trigger=document.querySelector('#user-entry-review .settings-page-heading button');trigger?.setAttribute('aria-controls','userEntryHistoryPanel');trigger?.setAttribute('aria-expanded','false');
    // HR already has its renderer and records; register its existing navigation.
    if(!APP_PERMISSION_TREE.some(item=>item.id==='hr'))APP_PERMISSION_TREE.push({id:'hr',label:'HR',children:[['payroll-employees','Employees'],['hr-contracts','Contracts & Documents'],['hr-attendance','Attendance'],['hr-leave','Leave'],['hr-assessments','Assessments']]});
    window.applyPermissionAccess?.();renderUserEntryReview();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
