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
 for(const [title,hint,fn] of [['↑','Move row up',()=>{const prev=row.previousElementSibling;if(prev){prev.before(row);row.dispatchEvent(new Event('input',{bubbles:true}))}}],['↓','Move row down',()=>{const next=row.nextElementSibling;if(next){next.after(row);row.dispatchEvent(new Event('input',{bubbles:true}))}}]]){const b=document.createElement('button');b.type='button';b.textContent=title;b.title=hint;b.setAttribute('aria-label',hint);b.onclick=fn;box.append(b)}
 (cell.querySelector('.row-menu-panel99')||cell).append(box);
 }menu(cell);
 });
 document.querySelectorAll('#jeHeaderRow .add-row81,#lineUp82,#lineDown82').forEach(n=>n.hidden=true);
 document.querySelectorAll('[data-auto-close99]').forEach(armCollapse);
 updateHeading();
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(polish)}}
function menu(cell){
 if(!cell||cell.closest('.clustered-journal-table,.audit-table98')||cell.querySelector('.row-menu99'))return;
 if(!cell.querySelector('button,[onclick]'))return;
 const details=document.createElement('details');details.className='row-menu99';const summary=document.createElement('summary');summary.textContent='⋯';summary.setAttribute('aria-label','Row actions');const panel=document.createElement('div');panel.className='row-menu-panel99';
 while(cell.firstChild)panel.append(cell.firstChild);details.append(summary,panel);cell.append(details);
 details.addEventListener('toggle',()=>{if(!details.open)return;document.querySelectorAll('.row-menu99[open]').forEach(d=>{if(d!==details)d.open=false});panel.style.visibility='hidden';if(!details.open)return;const r=(window.desktopScale14320?.rect(summary)||summary.getBoundingClientRect()),layoutWidth=window.desktopScale14320?.width||innerWidth,layoutHeight=window.desktopScale14320?.height||innerHeight,width=Math.min(180,Math.max(74,(window.desktopScale14320?.rect(panel)||panel.getBoundingClientRect()).width)),height=Math.min(panel.scrollHeight,layoutHeight-16);panel.style.left=Math.max(8,Math.min(layoutWidth-width-8,r.right-width))+'px';panel.style.top=(r.bottom+height+5<=layoutHeight-8?r.bottom+5:Math.max(8,r.top-height-5))+'px';panel.style.visibility='visible'});
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
 const login=handleDemoLogin;window.handleDemoLogin=async function(...args){if($('loginGate')?.classList.contains('busy99')){args[0]?.preventDefault();return}startLogin();try{await login.apply(this,args);if(loginMessageTarget14293()?.textContent)endLogin()}catch(e){endLogin();loginMessageTarget14293().textContent=e.message||'Sign-in failed. Please try again.'}};
 const hydrate=hydrateSupabaseSession;window.hydrateSupabaseSession=async function(...args){startLogin();try{return await hydrate.apply(this,args)}finally{endLogin()}};
 const findingForm=document.getElementById('periodFindingForm');
 if(findingForm){findingForm.dataset.autoClose99='';const before=openPeriodFindingForm;window.openPeriodFindingForm=function(...args){const out=before.apply(this,args);clearTimeout(timers.get(findingForm));timers.delete(findingForm);armCollapse(findingForm);return out};}
 installTablet();polish();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 installPosting();
});
function startLogin(){const gate=$('loginGate');gate.classList.add('busy99');let p=$('loginProgress99');if(!p){p=document.createElement('div');p.id='loginProgress99';p.setAttribute('role','status');p.innerHTML=loading1444.markup();$('loginForm').append(p)}p.hidden=false;$('loginForm').setAttribute('aria-busy','true');$('loginForm').querySelector('button[type=submit]').disabled=true;}
window.releaseLogin1443=()=>endLogin();
function endLogin(){$('loginGate')?.classList.remove('busy99');if($('loginProgress99'))$('loginProgress99').hidden=true;$('loginForm')?.removeAttribute('aria-busy');const b=$('loginForm')?.querySelector('button[type=submit]');if(b)b.disabled=false;}
function installTablet(){
 const tablet=()=>document.documentElement.dataset.device132==='tablet';
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
 function recover(){const owner=liveProfile?.id;if(owner===jobOwner)return;jobs.clear();restoredKey14228=null;jobOwner=owner;if(owner){try{const saved=window.localFirst14333?localFirst14333.mainLoad(owner):JSON.parse(localStorage.getItem('ojm_pending_posts99_'+owner)||'[]');for(const job of saved){if(job.status==='saving')job.status='uncertain';if(job.status==='failed')job.restored=false;jobs.set(job.id,job)}}catch(e){window.localFirst14333?.storageError('Journal recovery data could not be read: '+e.message)}}draw();}
 const profileBefore=loadLiveProfile;window.loadLiveProfile=async function(...args){const r=await profileBefore.apply(this,args);recover();return r};
 const logoutBefore=logoutDemoUser;window.logoutDemoUser=async function(...args){const r=await logoutBefore.apply(this,args);jobs.clear();jobOwner=null;$('pendingPosts99')?.remove();return r};
 const formEmpty=()=>!$('jeGeneralMemo')?.value.trim()&&![...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr,#jeLinesBody .je-line-memo')].some(i=>i.value.trim()&&i.value!=='0'&&i.value!=='0.00');
 const snapshot=()=>({date:$('jeTransDate').value,memo:$('jeGeneralMemo').value,multi:$('jeMultipleDates')?.checked,rows:[...$('jeLinesBody').rows].map(r=>({account:r.querySelector('.je-line-acc')?.value||'',memo:r.querySelector('.je-line-memo')?.value||'',dr:r.querySelector('.je-line-dr')?.value||'',cr:r.querySelector('.je-line-cr')?.value||'',currency:r.querySelector('.je-line-cr')?.dataset.currency||'LAK',credits:[...r.querySelectorAll('.je-line-cr')].map(n=>({currency:n.dataset.currency,value:n.value})),date:r.querySelector('.je-line-date')?.value||''}))});
 function saveDetached(job,owner){if(window.localFirst14333)return localFirst14333.mainSave(job,owner);try{const key='ojm_pending_posts99_'+owner,list=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([job,...list.filter(j=>j.id!==job.id)]))}catch(_){}}
 function restore(job){if(!formEmpty()){showAppNotification('Entry preserved','Finish or reset the current entry before restoring the failed entry.',true);return}restoredKey14228=job.id;const s=job.snapshot;$('jeTransDate').value=s.date;$('jeGeneralMemo').value=s.memo;setJournalDateMode(s.multi);$('jeLinesBody').replaceChildren();s.rows.forEach(r=>{addJournalLineRow(r.account,r.memo,r.dr,r.credits?Object.fromEntries(r.credits.map(c=>[c.currency,c.value])):{[r.currency]:r.cr});const date=$('jeLinesBody').lastElementChild.querySelector('.je-line-date');if(date)date.value=r.date});calculateJournalBalance();showJournalEntry98();dirty.add($('journalEntry98'));job.restored=true;draw();}
 function draw(){if(jobOwner){try{window.localFirst14333?[...jobs.values()].forEach(j=>{const r=localFirst14333.mainSave(j,jobOwner);if(r.done14333)jobs.delete(j.id)}):localStorage.setItem('ojm_pending_posts99_'+jobOwner,JSON.stringify([...jobs.values()]))}catch(e){window.localFirst14333?.storageError('Journal recovery data could not be saved: '+e.message)}}let host=$('pendingPosts99');if(!host){host=document.createElement('section');host.id='pendingPosts99';host.className='pending-posts99';$('tblJournalHistoryBody')?.closest('.je-card')?.prepend(host);if(!host.isConnected)$('journalEntry98')?.after(host)}
 host.hidden=true;window.dispatchEvent(new Event('save-state14234'));
 host.innerHTML=[...jobs.values()].map(j=>`<div class="pending-post99 ${esc(j.status)}"><strong>${esc(formatAppDate(j.snapshot.date))} · ${esc(j.snapshot.memo)}</strong><span>${esc(j.status==='saving'?'Saving…':j.status==='saved'?'Saved · refreshing journal':j.status==='uncertain'?'Connection interrupted — verify History before reposting':'Save failed')}</span>${j.message?'<small>'+esc(j.message)+'</small>':''}${j.status==='failed'&&!j.restored?`<button data-restore99="${esc(j.id)}">Restore entry</button>`:''}${['uncertain','saved'].includes(j.status)?`<button data-check99="${esc(j.id)}">Refresh History</button>`:''}<button data-copy99="${esc(j.id)}" type="button">Download entry copy</button></div>`).join('');
 host.querySelectorAll('[data-restore99]').forEach(b=>b.onclick=()=>restore(jobs.get(b.dataset.restore99)));
 host.querySelectorAll('[data-check99]').forEach(b=>b.onclick=async()=>{try{await window.mainRetry14234(b.dataset.check99)}catch(e){showAppNotification('Refresh failed',e.message,true)}});
 host.querySelectorAll('[data-copy99]').forEach(b=>b.onclick=async()=>{const j=jobs.get(b.dataset.copy99),u=URL.createObjectURL(new Blob([JSON.stringify(j.snapshot,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='journal-recovery-'+j.id+'.json';try{if(window.exportCenter14337)await exportCenter14337.fromLink(a);else a.click()}finally{setTimeout(()=>URL.revokeObjectURL(u),1000)}});
 }
 window.mainRetry14234=async function(id){recover();const job=jobs.get(id),owner=liveProfile?.id,client=ojmDb,current=()=>liveProfile?.id===owner&&ojmDb===client;if(!job?.payload||!owner||!access113.can('journal','post'))throw Error('Sign in with posting access to retry.');
 if(job.status==='saving')return;job.status='saving';draw();try{const r=await client.rpc(job.payload.p_entries?'post_journal_batch14228':'post_manual_journal14228',job.payload);if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.length!==(job.payload.p_entries?.length||1)||r.data.some(r=>!r.entry_id||!r.entry_no))throw Error('Database posting receipt not confirmed. Retry the same reference.');job.receipt=r.data;job.status='saved';if(!current()){saveDetached(job,owner);return}window.localFirst14333?.projectJournal();refreshAllTables();await loadJournalFromSupabase();if(current()){if(job.receipt.every(r=>JournalModule.entries.some(l=>!l.local14333&&l.dbEntryId===r.entry_id))){window.localFirst14333?.mainFinish(owner,id);jobs.delete(id)}else job.message='Confirmed in the database; waiting for the updated journal download.'}else saveDetached(job,owner);}catch(e){job.status=job.status==='saved'?'saved':'uncertain';job.message=e.message||'Connection interrupted';if(!current())saveDetached(job,owner);throw e}finally{if(current())draw()}};
 document.addEventListener('input',e=>{if(e.isTrusted&&e.target.closest('#journalEntry98'))restoredKey14228=null},true);
 window.submitJournalEntry=async function(){
  recover();
 
 // Existing correction and submission workflows retain their approval/audit handlers.
 if(JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment)return legacy();
 if(liveProfile?.role!=='admin'&&!livePermission?.can_post_directly)return legacy();
 const state=getMultiDateJournalState(),collected=collectLiveJournalGroups();if(state.errors.length||collected.errors.length||collected.differences.length)return legacy();
 const groups=Object.entries(collected.grouped).filter(([,g])=>g.lines.length);if(!groups.length||window.journalBatch1440?.hasPending())return legacy();
 const [date,group]=groups[0];if(window.offline14239?.offline()&&window.workflow136?.state.sessions.some(s=>groups.some(([d])=>String(s.month).slice(0,7)===d.slice(0,7)))){showCenterStatus('A reopened book requires connection. Your draft is retained.',true);return;}if(groups.some(([d,g])=>g.lines.length<2||g.lines.some(l=>!l.account?.id)||PeriodReview.status(d.slice(0,7))!=='open'))return legacy();
 const saved=snapshot(),id=restoredKey14228||crypto.randomUUID(),owner=liveProfile.id,client=ojmDb,current=()=>liveProfile?.id===owner&&ojmDb===client,job={id,snapshot:saved,status:'saving',created:new Date().toISOString()};jobs.set(id,job);
 // Persist the complete request before clearing; device projections share this reference.
 const payload={p_request_key:id,p_transaction_date:date,p_memo:saved.memo.trim(),p_lines:group.lines.map(l=>({account_id:l.account.id,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0)})),p_prefix:String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),p_digits:Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||6))};
 if(groups.length>1){const entries=groups.map(([d,g])=>({p_transaction_date:d,p_memo:payload.p_memo,p_lines:g.lines.map(l=>({account_id:l.account.id,description:l.memo,currency_code:l.currency,debit:Number(l.debit||0),credit:Number(l.credit||0)})),p_prefix:payload.p_prefix,p_digits:payload.p_digits}));for(const k of Object.keys(payload))if(k!=='p_request_key')delete payload[k];payload.p_entries=entries;}job.payload=payload;restoredKey14228=null;
 try{if(window.localFirst14333)localFirst14333.mainSave(job,owner);else localStorage.setItem('ojm_pending_posts99_'+owner,JSON.stringify([...jobs.values()]))}catch(_){jobs.delete(id);showAppNotification('Entry not sent','Device recovery storage is unavailable. Your entry remains in the editor. Free storage or keep an external copy before posting.',true);return}
 clearJournalEntry();job.status='uncertain';job.message='Saved on this device. Waiting for database confirmation.';draw();window.localFirst14333?.projectJournal();refreshAllTables();
 if(window.offline14239?.offline()){showCenterStatus('Saved on this device. Totals include this entry; it will sync when connected.');return;}
 try{const result=await client.rpc(payload.p_entries?'post_journal_batch14228':'post_manual_journal14228',payload);if(result.error)throw result.error;if(result.data?.staged14228){if(!current()){job.status='saved';job.message='Saved in the original correction session.';saveDetached(job,owner);return}window.localFirst14333?.mainFinish(owner,id);jobs.delete(id);draw();refreshAllTables();showCenterStatus('Entry saved in the correction session. Finish the session to commit the book.');return}if(!Array.isArray(result.data)||result.data.length!==(payload.p_entries?.length||1)||result.data.some(r=>!r.entry_id||!r.entry_no))throw Error('Database posting receipt not confirmed. Retry the same reference.');job.receipt=result.data;job.status='saved';if(!current()){saveDetached(job,owner);return}draw();window.localFirst14333?.projectJournal();refreshAllTables();
 if(current()){await loadJournalFromSupabase();if(!current()){saveDetached(job,owner);return}if(job.receipt.every(r=>JournalModule.entries.some(l=>!l.local14333&&l.dbEntryId===r.entry_id))){window.localFirst14333?.mainFinish(owner,id);jobs.delete(id)}else job.message='Confirmed in the database; waiting for the updated journal download.';draw()}
 }catch(e){if(!current()){job.status=job.status==='saved'?'saved':'uncertain';job.message=e.message||'Check posting status.';saveDetached(job,owner);return}if(job.status==='saved'){job.message='Saved successfully; the journal refresh failed. Refresh to see the confirmed entry.';draw();return}
 // Transport failures can happen after commit. Retries retain the server-idempotent reference.
 job.status=(!e.code||/fetch|network|timeout|connection/i.test(e.message||''))?'uncertain':'failed';job.message=e.message||'The server did not confirm saving.';draw();
 if(current()){showAppNotification(job.status==='uncertain'?'Check Posting Status':'Posting Failed',job.message+(job.status==='uncertain'?' Verify History before reposting.':' Your entry has been preserved.'),true)}
 }
 };
}
})();
