/* v99 presentation and foreground-first journal posting. */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??''));
let scheduled=false;
function polish(){
 scheduled=false;
 document.querySelectorAll('.tab-content.active table').forEach(table=>{
 const heads=[...table.querySelectorAll('thead tr:last-child th')];if(!heads.length)return;
 heads.forEach((th,i)=>{const label=th.textContent.trim().toUpperCase();if(/^(DR|CR|DEBIT|CREDIT)(\s*\([^)]*\))?$/.test(label)){
 th.classList.add('amount-column99');for(const row of table.tBodies[0]?.rows||[])if(row.cells.length===heads.length)row.cells[i]?.classList.add('amount-column99');
 }if(label==='ACTION'||label==='ACTIONS'||th.classList.contains('action-col')){
 th.classList.add('actions-column99');for(const row of table.tBodies[0]?.rows||[])if(row.cells.length===heads.length){const cell=row.cells[i];cell.classList.add('actions-column99');menu(cell)}
 }});
 });
 document.querySelectorAll('#jeLinesBody tr').forEach(row=>{
 const cell=row.querySelector('.action-col')||row.lastElementChild;if(!cell)return;
 if(!cell.querySelector('[data-row-tools99]')){
 const box=document.createElement('span');box.dataset.rowTools99='';
 for(const [title,hint,fn] of [['↑','Move row up',()=>{const prev=row.previousElementSibling;if(prev)prev.before(row)}],['↓','Move row down',()=>{const next=row.nextElementSibling;if(next)next.after(row)}]]){const b=document.createElement('button');b.type='button';b.textContent=title;b.title=hint;b.setAttribute('aria-label',hint);b.onclick=fn;box.append(b)}
 (cell.querySelector('.row-menu-panel99')||cell).append(box);
 }menu(cell);
 });
 document.querySelectorAll('#jeHeaderRow .add-row81,#lineUp82,#lineDown82').forEach(n=>n.hidden=true);
 document.querySelectorAll('#auditMonths98 .audit-month98').forEach(card=>{
 if(card.dataset.aligned99)return;card.dataset.aligned99='true';const summary=card.querySelector('summary'),title=summary.querySelector('.audit-month-title98');if(!title)return;
 const counts={edit:0,void:0,destructive:0,info:0};summary.querySelectorAll('.audit-count98').forEach(n=>{const key=Object.keys(counts).find(k=>n.classList.contains(k));if(key)counts[key]+=Number(n.querySelector('b')?.textContent||0)});
 summary.replaceChildren(title);for(const [key,label] of [['edit','Updated'],['void','Voided'],['destructive','Deleted'],['info','Other actions']]){if(!counts[key])continue;const span=document.createElement('span');span.className='audit-stat99 '+key;span.innerHTML='<small>'+label+'</small><b>'+counts[key]+'</b>';summary.append(span)}
 card.style.setProperty('--archive-grid85','minmax(190px,1fr) repeat(4,minmax(80px,12%))');
 });
 document.querySelectorAll('[data-auto-close99]').forEach(armCollapse);
 updateHeading();
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(polish)}}
function menu(cell){
 if(!cell||cell.closest('.clustered-journal-table,.audit-table98')||cell.querySelector('.row-menu99'))return;
 if(!cell.querySelector('button,[onclick]'))return;
 const details=document.createElement('details');details.className='row-menu99';const summary=document.createElement('summary');summary.textContent='⋯';summary.setAttribute('aria-label','Row actions');const panel=document.createElement('div');panel.className='row-menu-panel99';
 while(cell.firstChild)panel.append(cell.firstChild);details.append(summary,panel);cell.append(details);
 details.addEventListener('toggle',()=>{if(!details.open)return;document.querySelectorAll('.row-menu99[open]').forEach(d=>{if(d!==details)d.open=false});requestAnimationFrame(()=>{if(!details.open)return;const r=summary.getBoundingClientRect(),width=Math.min(180,Math.max(74,panel.getBoundingClientRect().width)),height=Math.min(panel.scrollHeight,innerHeight-16);panel.style.left=Math.max(8,Math.min(innerWidth-width-8,r.right-width))+'px';panel.style.top=(r.bottom+height+5<=innerHeight-8?r.bottom+5:Math.max(8,r.top-height-5))+'px'})});
 panel.addEventListener('click',e=>{if(e.target.closest('button'))details.open=false});
}
function updateHeading(){
 const active=document.querySelector('.tab-content.active');if(!active)return;
 const button=[...document.querySelectorAll('#appSidebar .tab-btn')].find(b=>(b.getAttribute('onclick')||'').includes("'"+active.id+"'"));const category=button?.closest('.nav-category');const named=active.id==='document-editor105'?'Documents':active.id==='dashboard'?'Dashboard':active.id.startsWith('hr-')?'Human Resources':active.id.startsWith('sec-')||active.id==='accounts-modular-container'||active.closest('#accounts-module')?'Accounts':'';const label=named||[...(category?.querySelector('.nav-header')?.childNodes||[])].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent.trim()).find(Boolean)||active.id.replaceAll('-',' ');
 const heading=$('transactionsHeading98');if(heading){heading.hidden=false;const h=heading.querySelector('h1');if(h.textContent!==label)h.textContent=label}
}
const timers=new WeakMap(),dirty=new WeakSet();
function armCollapse(panel){
 if(panel.id==='journalEntry98'||panel.hidden||dirty.has(panel)||timers.has(panel))return;
 timers.set(panel,setTimeout(()=>{timers.delete(panel);if(dirty.has(panel)||panel.hidden)return;if(panel.id==='journalEntry98')showJournalEntry98(false,false);else if(panel.id==='periodFindingForm')closePeriodFindingForm();else panel.hidden=true},30000));
}
window.addEventListener('DOMContentLoaded',()=>{
 const panel=$('journalEntry98');if(panel)panel.dataset.autoClose99='';
 const previousShow=showJournalEntry98;window.showJournalEntry98=function(show=true,...args){const p=$('journalEntry98');clearTimeout(timers.get(p));timers.delete(p);const r=previousShow(show,...args);if(show)armCollapse(p);return r};
 document.addEventListener('input',e=>{const panel=e.target.closest('[data-auto-close99]');if(panel){dirty.add(panel);clearTimeout(timers.get(panel));timers.delete(panel)}},true);
 document.addEventListener('change',e=>{const panel=e.target.closest('[data-auto-close99]');if(panel){dirty.add(panel);clearTimeout(timers.get(panel));timers.delete(panel)}},true);
 const clearBefore=clearJournalEntry;window.clearJournalEntry=function(...args){const r=clearBefore.apply(this,args);if(panel){dirty.delete(panel);clearTimeout(timers.get(panel));timers.delete(panel);armCollapse(panel)}return r};
 document.addEventListener('click',e=>{document.querySelectorAll('.row-menu99[open]').forEach(d=>{if(!d.contains(e.target))d.open=false})});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.row-menu99[open]').forEach(d=>d.open=false)});
 document.addEventListener('scroll',()=>document.querySelectorAll('.row-menu99[open]').forEach(d=>d.open=false),true);
 const history=renderAllTransactionsTable;window.renderAllTransactionsTable=function(...args){const host=$('archiveMonths67');const open=[...(host?.querySelectorAll('details[open]')||[])].map(n=>n.querySelector('summary strong')?.textContent);const r=history.apply(this,args);$('archiveMonths67')?.querySelectorAll('details').forEach(d=>d.open=open.includes(d.querySelector('summary strong')?.textContent));return r};
 // Keep the login card visible, but never reveal the hidden recovery form.
 const login=handleDemoLogin;window.handleDemoLogin=async function(...args){if($('loginGate')?.classList.contains('busy99')){args[0]?.preventDefault();return}startLogin();try{await login.apply(this,args);if($('loginError')?.textContent&&!/Signing in|preparing your workspace/.test($('loginError').textContent))endLogin()}catch(e){endLogin();$('loginError').textContent=e.message||'Sign-in failed. Please try again.'}};
 const hydrate=hydrateSupabaseSession;window.hydrateSupabaseSession=async function(...args){startLogin();try{return await hydrate.apply(this,args)}finally{endLogin()}};
 const findingForm=document.getElementById('periodFindingForm');
 if(findingForm){findingForm.dataset.autoClose99='';const before=openPeriodFindingForm;window.openPeriodFindingForm=function(...args){const out=before.apply(this,args);clearTimeout(timers.get(findingForm));timers.delete(findingForm);armCollapse(findingForm);return out};}
 installTablet();polish();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 installPosting();
});
function startLogin(){const gate=$('loginGate');gate.classList.add('busy99');let p=$('loginProgress99');if(!p){p=document.createElement('div');p.id='loginProgress99';p.setAttribute('role','status');p.innerHTML=loading1444.markup()+'<span class="loading-status1444">Preparing your workspace…</span>';$('loginForm').append(p)}p.hidden=false;$('loginForm').setAttribute('aria-busy','true');$('loginForm').querySelector('button[type=submit]').disabled=true;}
window.releaseLogin1443=()=>endLogin();
function endLogin(){$('loginGate')?.classList.remove('busy99');if($('loginProgress99'))$('loginProgress99').hidden=true;$('loginForm')?.removeAttribute('aria-busy');const b=$('loginForm')?.querySelector('button[type=submit]');if(b)b.disabled=false;}
function installTablet(){
 const tablet=()=>/iPad/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1)||(/Android/.test(navigator.userAgent)&&!/Mobile/.test(navigator.userAgent))||(navigator.maxTouchPoints>0&&Math.min(screen.width||innerWidth,screen.height||innerHeight)>=600&&innerWidth>=600);
 const overlay=document.createElement('div');overlay.id='rotateTablet99';overlay.innerHTML='<div><strong>Please rotate your tablet</strong><p>Use landscape orientation for the accounting workspace. Your work is preserved.</p></div>';document.body.append(overlay);
 const toggle=document.createElement('button');toggle.id='tabletMenu99';toggle.type='button';toggle.textContent='☰';toggle.setAttribute('aria-label','Open navigation');toggle.setAttribute('aria-expanded','false');$('categoryTabShell')?.before(toggle);
 const scrim=document.createElement('button');scrim.id='tabletScrim99';scrim.setAttribute('aria-label','Close navigation');document.body.append(scrim);
 const close=()=>{document.body.classList.remove('tablet-nav-open99');toggle.setAttribute('aria-expanded','false')};toggle.onclick=()=>{const open=document.body.classList.toggle('tablet-nav-open99');toggle.setAttribute('aria-expanded',String(open))};scrim.onclick=close;
 $('appSidebar')?.addEventListener('click',e=>{if(e.target.closest('.tab-btn'))close()});
 function resize(){document.body.classList.toggle('tablet99',tablet());document.body.classList.toggle('portrait99',tablet()&&innerHeight>innerWidth);if(!tablet())close()}resize();window.addEventListener('resize',resize);
}
function installPosting(){
 const legacy=submitJournalEntry;
 const jobs=new Map();window.pendingPosts99=jobs;
 let jobOwner=null,restoredKey14228=null;
 function recover(){const owner=liveProfile?.id;if(owner===jobOwner)return;jobs.clear();jobOwner=owner;if(owner){try{const saved=JSON.parse(localStorage.getItem('ojm_pending_posts99_'+owner)||'[]');for(const job of saved){if(job.status==='saving')job.status='uncertain';if(job.status==='failed')job.restored=false;jobs.set(job.id,job)}}catch(_){}}draw();}
 const profileBefore=loadLiveProfile;window.loadLiveProfile=async function(...args){const r=await profileBefore.apply(this,args);recover();return r};
 const logoutBefore=logoutDemoUser;window.logoutDemoUser=async function(...args){const r=await logoutBefore.apply(this,args);jobs.clear();jobOwner=null;$('pendingPosts99')?.remove();return r};
 const formEmpty=()=>!$('jeGeneralMemo')?.value.trim()&&![...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr,#jeLinesBody .je-line-memo')].some(i=>i.value.trim()&&i.value!=='0'&&i.value!=='0.00');
 const snapshot=()=>({date:$('jeTransDate').value,memo:$('jeGeneralMemo').value,multi:$('jeMultipleDates')?.checked,rows:[...$('jeLinesBody').rows].map(r=>({account:r.querySelector('.je-line-acc')?.value||'',memo:r.querySelector('.je-line-memo')?.value||'',dr:r.querySelector('.je-line-dr')?.value||'',cr:r.querySelector('.je-line-cr')?.value||'',currency:r.querySelector('.je-line-cr')?.dataset.currency||'LAK',date:r.querySelector('.je-line-date')?.value||''}))});
 function saveDetached(job,owner){try{const key='ojm_pending_posts99_'+owner,list=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([job,...list.filter(j=>j.id!==job.id)]))}catch(_){}}
 function restore(job){if(!formEmpty()){showAppNotification('Entry preserved','Finish or reset the current entry before restoring the failed entry.',true);return}restoredKey14228=job.id;const s=job.snapshot;$('jeTransDate').value=s.date;$('jeGeneralMemo').value=s.memo;setJournalDateMode(s.multi);$('jeLinesBody').replaceChildren();s.rows.forEach(r=>{addJournalLineRow(r.account,r.memo,r.dr,{[r.currency]:r.cr});const date=$('jeLinesBody').lastElementChild.querySelector('.je-line-date');if(date)date.value=r.date});calculateJournalBalance();showJournalEntry98();dirty.add($('journalEntry98'));job.restored=true;draw();}
 function draw(){if(jobOwner){try{localStorage.setItem('ojm_pending_posts99_'+jobOwner,JSON.stringify([...jobs.values()]))}catch(_){}}let host=$('pendingPosts99');if(!host){host=document.createElement('section');host.id='pendingPosts99';host.className='pending-posts99';$('tblJournalHistoryBody')?.closest('.je-card')?.prepend(host);if(!host.isConnected)$('journalEntry98')?.after(host)}
 host.hidden=true;window.dispatchEvent(new Event('save-state14234'));
 host.innerHTML=[...jobs.values()].map(j=>`<div class="pending-post99 ${j.status}"><strong>${esc(j.snapshot.date)} · ${esc(j.snapshot.memo)}</strong><span>${esc(j.status==='saving'?'Saving…':j.status==='saved'?'Saved · refreshing journal':j.status==='uncertain'?'Connection interrupted — verify History before reposting':'Save failed')}</span>${j.message?'<small>'+esc(j.message)+'</small>':''}${j.status==='failed'&&!j.restored?`<button data-restore99="${j.id}">Restore entry</button>`:''}${['uncertain','saved'].includes(j.status)?`<button data-check99="${j.id}">Refresh History</button>`:''}<button data-copy99="${j.id}" type="button">Download entry copy</button></div>`).join('');
 host.querySelectorAll('[data-restore99]').forEach(b=>b.onclick=()=>restore(jobs.get(b.dataset.restore99)));
 host.querySelectorAll('[data-check99]').forEach(b=>b.onclick=async()=>{try{await loadJournalFromSupabase();const j=jobs.get(b.dataset.check99);if(j?.status==='saved'){jobs.delete(j.id);draw();return}if(!j?.payload?.p_request_key){showAppNotification('Check History','This older attempt has no server receipt. Verify History before starting another entry.',true);return}const r=await ojmDb.rpc('journal_receipt14228',{p_request_key:j.id});if(r.error)throw r.error;if(liveProfile?.id!==jobOwner)return;if(r.data){j.status='saved';jobs.delete(j.id);draw();showAppNotification('Confirmed','The original posting is saved.',false)}else{j.status='failed';j.message='No committed receipt. Restoring keeps the same posting reference.';if(formEmpty())restore(j);draw()}}catch(e){showAppNotification('Refresh failed',e.message,true)}});
 host.querySelectorAll('[data-copy99]').forEach(b=>b.onclick=()=>{const j=jobs.get(b.dataset.copy99),u=URL.createObjectURL(new Blob([JSON.stringify(j.snapshot,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='journal-recovery-'+j.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)});
 }
 window.mainRetry14234=async function(id){recover();const job=jobs.get(id),owner=liveProfile?.id;if(!job?.payload||!owner||!access113.can('journal','post'))throw Error('Sign in with posting access to retry.');
 if(job.status==='saving')return;job.status='saving';draw();try{const r=await ojmDb.rpc('post_manual_journal14228',job.payload);if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.length!==1||!r.data[0]?.entry_id)throw Error('Database posting receipt not confirmed. Retry the same reference.');job.status='saved';await loadJournalFromSupabase();if(liveProfile?.id===owner)jobs.delete(id);else saveDetached(job,owner);}catch(e){job.status=job.status==='saved'?'saved':'uncertain';job.message=e.message||'Connection interrupted';if(liveProfile?.id!==owner)saveDetached(job,owner);throw e}finally{if(liveProfile?.id===owner)draw()}};
 document.addEventListener('input',e=>{if(e.isTrusted&&e.target.closest('#journalEntry98'))restoredKey14228=null},true);
 window.submitJournalEntry=async function(){
 if(window.offline14239?.offline()){showCenterStatus('Final posting requires connection. Your entry stays in the editor.',true);return;}
 recover();
 
 // Existing correction and submission workflows retain their approval/audit handlers.
 if(JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment)return legacy();
 if(liveProfile?.role!=='admin'&&!livePermission?.can_post_directly)return legacy();
 const state=getMultiDateJournalState(),collected=collectLiveJournalGroups();if(state.errors.length||collected.errors.length||collected.differences.length)return legacy();
 const groups=Object.entries(collected.grouped).filter(([,g])=>g.lines.length);if(groups.length!==1||window.journalBatch1440?.hasPending())return legacy();
 const [date,group]=groups[0];if(group.lines.length<2||group.lines.some(l=>!l.account?.id)||PeriodReview.status(date.slice(0,7))!=='open')return legacy();
 const saved=snapshot(),id=restoredKey14228||crypto.randomUUID(),owner=liveProfile.id,job={id,snapshot:saved,status:'saving'};jobs.set(id,job);
 // Capture every RPC argument before clearing the editor. Pending entries are not ledger totals.
 const payload={p_request_key:id,p_transaction_date:date,p_memo:saved.memo.trim(),p_lines:group.lines.map(l=>({account_id:l.account.id,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0)})),p_prefix:String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),p_digits:Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6))};
 job.payload=payload;restoredKey14228=null;
 try{localStorage.setItem('ojm_pending_posts99_'+owner,JSON.stringify([...jobs.values()]))}catch(_){jobs.delete(id);showAppNotification('Entry not sent','Device recovery storage is unavailable. Your entry remains in the editor. Free storage or keep an external copy before posting.',true);return}
 clearJournalEntry();draw();
 try{const result=await ojmDb.rpc('post_manual_journal14228',payload);if(result.error)throw result.error;if(result.data?.staged14228){jobs.delete(id);draw();showCenterStatus('Entry saved in the correction session. Finish the session to commit the book.');return}if(!Array.isArray(result.data)||result.data.length!==1||!result.data[0]?.entry_id)throw Error('Database posting receipt not confirmed. Retry the same reference.');job.status='saved';if(liveProfile?.id!==owner){saveDetached(job,owner);return}draw();
 if(liveProfile?.id===owner){await loadJournalFromSupabase();jobs.delete(id);draw()}
 }catch(e){if(liveProfile?.id!==owner){job.status=job.status==='saved'?'saved':'uncertain';job.message=e.message||'Check posting status.';saveDetached(job,owner);return}if(job.status==='saved'){job.message='Saved successfully; the journal refresh failed. Refresh to see the confirmed entry.';draw();return}
 // Transport failures can happen after commit. Never automatically repeat an uncertain write.
 job.status=(!e.code||/fetch|network|timeout|connection/i.test(e.message||''))?'uncertain':'failed';job.message=e.message||'The server did not confirm saving.';draw();
 if(liveProfile?.id===owner){showAppNotification(job.status==='uncertain'?'Check Posting Status':'Posting Failed',job.message+(job.status==='uncertain'?' Verify History before reposting.':' Your entry has been preserved.'),true)}
 }
 };
}
})();
