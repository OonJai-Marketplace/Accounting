/* v136: shared accounting workflows and compact workspace tools. */
(function(){'use strict';
const $=id=>document.getElementById(id),esc=value=>escapeHtml(String(value??''));
const state={sessions:[],reviews:[],todos:[],owner:null,loading:false,rawRpc:null,client:null};
const admin=()=>liveProfile?.role==='admin';
const session=month=>state.sessions.find(s=>String(s.month).slice(0,7)===month);
// Legacy release acknowledgements are reports, not new income postings.
wsIsCollection=function(row){const counterpart=AccountingStore.accounts.find(a=>a.id===row.account_id);return row.direction==='in'&&String(counterpart?.type||'').toUpperCase()==='ASSET';};
async function rpc(name,args={}){installRpc();const r=await state.rawRpc(name,args);if(r.error)throw Error(r.error.message);return r.data;}
function rowMonth(args){if(args.p_entry_id)return JournalModule.entries.find(r=>r.dbEntryId===args.p_entry_id)?.date?.slice(0,7);return args.p_transaction_date?.slice(0,7);}
function installRpc(){if(!ojmDb||state.client===ojmDb)return;state.client=ojmDb;state.rawRpc=ojmDb.rpc.bind(ojmDb);
 ojmDb.rpc=async function(name,args={}){
  if(name==='post_manual_journal'&&state.postingReview){const review=state.postingReview;const r=await state.rawRpc('post_review_adjustment136',{p_review:review,p_payload:args});if(!r.error){state.adjustmentReview=null;state.postingReview=null;}return r;}
  const kinds={post_manual_journal:'post',revise_open_journal_entry:'revise',void_journal_entry:'void'},s=session(rowMonth(args));
  if(kinds[name]&&s){try{const next=await rpc('stage_book_operation136',{p_session:s.id,p_kind:kinds[name],p_payload:args});state.sessions=state.sessions.map(x=>x.id===s.id?next:x);return {data:null,error:null};}catch(e){return {data:null,error:{message:e.message}};}}
  return state.rawRpc(name,args);
 };
}
async function reload(){if(!liveProfile||!ojmDb)return;installRpc();state.owner=liveProfile.id;
 if(admin()){
  state.sessions=await rpc('book_sessions_list136');
  const result=await ojmDb.from('audit_reviews136').select('*,accounting_periods(period_month)').order('created_at');if(result.error)throw Error(result.error.message);state.reviews=result.data||[];
 }
 await loadJournalFromSupabase();await loadTodos();decorate();
}
function previewSessions(){
 for(const book of state.sessions){const month=String(book.month).slice(0,7);PeriodReview.periods[month]={...(PeriodReview.periods[month]||{}),status:'open',reopenedAt:book.created_at,reopenReason:book.reason,reopenedByName:liveProfile?.full_name};JournalModule.entries.filter(r=>r.date.startsWith(month)).forEach(r=>r.archived=false);}
}
function stagedBookRows(){let rows=JournalModule.entries.map(r=>({...r}));
 for(const book of state.sessions)for(const op of book.operations||[]){const p=op.payload;
  if(op.kind==='void')rows=rows.filter(r=>r.dbEntryId!==p.p_entry_id);
  else{const old=rows.find(r=>r.dbEntryId===p.p_entry_id),id=op.kind==='revise'?old?.id||p.p_entry_id:'DRAFT-'+op.id.slice(0,8);
   if(op.kind==='revise')rows=rows.filter(r=>r.dbEntryId!==p.p_entry_id);
   rows.push(...(p.p_lines||[]).map(l=>{const account=AccountingStore.accounts.find(x=>x.id===l.account_id);return {id,dbEntryId:op.kind==='revise'?p.p_entry_id:null,date:l.line_date||p.p_transaction_date,accountId:l.account_id,account:account?.name||'Account',accountCode:account?.code,currency:l.currency_code,debit:Number(l.debit||0),credit:Number(l.credit||0),memo:l.description||'',generalMemo:p.p_memo,archived:false,staged136:true};}));
  }
 }
 return rows;
}
const loadPeriodsBefore=loadAccountingPeriodStatuses;
loadAccountingPeriodStatuses=async function(){
 // Database state replaces cached old books; stale reset-era reopen flags disappear.
 const saved=PeriodReview.periods;PeriodReview.periods={};await loadPeriodsBefore();
 for(const [m,p] of Object.entries(PeriodReview.periods))if(saved[m]?.reopenedAt&&p.status==='open'&&periodEntries(m).length)Object.assign(p,{reopenedAt:saved[m].reopenedAt,reopenReason:saved[m].reopenReason,reopenedByName:saved[m].reopenedByName});
 previewSessions();refreshAllTables();
};
const changeBefore=changePeriodStatus;
changePeriodStatus=async function(status){const month=PeriodReview.selectedMonth,s=session(month);
 if(status==='open'){
  if(PeriodReview.status(month)==='locked'){showCenterStatus('Locked books are final. Add an audit review; corrections belong in an open period.',true);return false;}
  if(!admin()){showCenterStatus('Administrator access is required.',true);return false;}
  const reason=(await ui117.prompt('Reason for reopening this closed book:'))?.trim();if(!reason)return false;
  try{const book=await rpc('begin_book_session136',{p_month:month+'-01',p_reason:reason});state.sessions=state.sessions.filter(x=>x.id!==book.id).concat(book);await loadJournalFromSupabase();switchTab('journal');decorate();return true;}catch(e){showCenterStatus(e.message,true);return false;}
 }
 if(s&&status==='closed')return finishSession(month,false);
 if(s&&status==='locked'){showCenterStatus('Finish or cancel the correction session before locking.',true);return false;}
 return changeBefore(status);
};
async function finishSession(month,cancel){const s=session(month);if(!s)return;
 const ok=await ui117.confirm(cancel?'Discard every staged change and restore the original closed book?':'Commit all staged changes and close this book?');if(!ok)return false;
 try{await rpc('finish_book_session136',{p_session:s.id,p_cancel:cancel});state.sessions=state.sessions.filter(x=>x.id!==s.id);clearJournalEntry();await loadJournalFromSupabase();switchTab('period-review');selectReviewPeriod(month);decorate();showCenterStatus(cancel?'Reopening cancelled. Original transactions are unchanged.':'Changes committed. Book closed.');return true;}catch(e){showCenterStatus(e.message,true);return false;}
}
const finishBefore=finishEditing69;finishEditing69=function(month){if(session(month))return finishSession(month,false);return finishBefore(month);};
const clearBefore136=clearJournalEntry;clearJournalEntry=function(...args){state.adjustmentReview=null;return clearBefore136(...args);};
const postBefore136=submitJournalEntry;submitJournalEntry=async function(...args){state.postingReview=state.adjustmentReview;try{return await postBefore136(...args);}finally{state.postingReview=null;}};
const reopenedBefore=renderReopened67;renderReopened67=function(){const official=JournalModule.entries;try{JournalModule.entries=stagedBookRows();reopenedBefore();}finally{JournalModule.entries=official;}
 document.querySelectorAll('#reopenedBooks .reopened-book').forEach(card=>{const month=card.id.replace('reopened-',''),s=session(month);
  if(!s&&!periodEntries(month).length){card.remove();return;}
  if(s){const p=card.querySelector('header p');if(p)p.textContent='Correction session · '+(s.operations||[]).length+' staged change(s). Official ledger stays unchanged until Finish Editing & Close.';
   if(!card.querySelector('[data-cancel-book136]')){const b=document.createElement('button');b.className='je-btn je-btn-secondary';b.dataset.cancelBook136='';b.textContent='Cancel Reopening';b.onclick=()=>finishSession(month,true);card.querySelector('header').append(b);}
  }
 });const host=$('reopenedBooks');if(host)host.hidden=!host.children.length;
};
const editBefore=loadEntryForEdit;loadEntryForEdit=async function(id){const r=JournalModule.entries.find(x=>x.id===id);if(!r)return;
 if(r.staged136){showCenterStatus('Cancel and reopen the correction session to replace staged changes before committing.',true);return;}
 const month=r.date.slice(0,7),status=PeriodReview.status(month);
 if(status==='locked')return auditEntry(id);
 if(status==='closed'){PeriodReview.selectedMonth=month;if(!await changePeriodStatus('open'))return;}
 return editBefore(id);
};
const voidBefore=voidLiveJournalEntry;voidLiveJournalEntry=async function(dbId,id){const r=JournalModule.entries.find(x=>x.dbEntryId===dbId),month=r?.date?.slice(0,7);if(!month)return;
 if(PeriodReview.status(month)==='locked'){showCenterStatus('Locked transactions cannot be voided. Add a review instead.',true);return;}
 if(PeriodReview.status(month)==='closed'){PeriodReview.selectedMonth=month;if(!await changePeriodStatus('open'))return;}
 return voidBefore(dbId,id);
};
async function auditEntry(id){const row=JournalModule.entries.find(x=>x.id===id);if(row){switchTab('period-review');selectReviewPeriod(row.date.slice(0,7));reviewPeriodTransaction(id);}}
openTransactionReview=auditEntry;
const saveFindingBefore=savePeriodFinding;savePeriodFinding=async function(event){event.preventDefault();const month=PeriodReview.selectedMonth;
 if(PeriodReview.status(month)!=='locked'){showCenterStatus('Review findings are for locked books. Reopen this unlocked book to edit it.',true);return;}
 const value=$('findingDescription').value.trim(),id=$('findingTransactionId').value,row=JournalModule.entries.find(x=>x.id===id);if(!value)return;
 try{await rpc('save_audit_review136',{p_month:month+'-01',p_entry:row?.dbEntryId||null,p_description:value});$('findingDescription').value='';await reload();showCenterStatus('Audit review saved without altering the original transaction.');}catch(e){showCenterStatus(e.message,true);}
};
function reviewPanel(){const month=PeriodReview.selectedMonth,locked=PeriodReview.status(month)==='locked',form=$('periodFindingForm');
 if(form)form.hidden=!locked;
 const reopen=document.querySelector('.period-closing-bar [onclick*="open"]');if(reopen)reopen.hidden=locked||!!session(month);
 const rows=state.reviews.filter(x=>String(x.accounting_periods?.period_month).startsWith(month));if($('periodReviewOpenFindings'))$('periodReviewOpenFindings').textContent=String(rows.filter(r=>r.status==='open').length+PeriodReview.findings.filter(r=>r.month===month&&!['closed','corrected'].includes(r.status)).length);
 let host=$('auditReviews136');if(!host){host=document.createElement('section');host.id='auditReviews136';host.className='je-card';$('periodFindingsList')?.after(host);}
 if(host){host.hidden=!locked;host.innerHTML='<h3>Audit Reviews</h3>'+ (rows.length?rows.map(r=>`<article><strong>${esc(r.status)}</strong><p>${esc(r.description)}</p><small>${esc(getLiveUserName(r.actor))} · ${esc(r.created_at)}</small>${r.status==='open'?`<button class="je-btn je-btn-secondary" data-adjust-review136="${r.id}">Prepare linked adjustment</button><button class="je-btn je-btn-secondary" data-resolve-review136="${r.id}">Resolve without adjustment</button>`:`<small>${r.adjustment_id?'Linked adjustment recorded':'Resolved without adjustment'}</small>`}</article>`).join(''):'<p>No audit reviews.</p>');
  host.querySelectorAll('[data-resolve-review136]').forEach(b=>b.onclick=async()=>{try{await rpc('resolve_audit_review136',{p_review:b.dataset.resolveReview136,p_adjustment:null});await reload();}catch(e){showCenterStatus(e.message,true);}});
  host.querySelectorAll('[data-adjust-review136]').forEach(b=>b.onclick=()=>{const review=rows.find(r=>r.id===b.dataset.adjustReview136);clearJournalEntry();switchTab('journal');$('jeGeneralMemo').value='Audit adjustment '+review.id+': '+review.description;$('journalEntry98').hidden=false;state.adjustmentReview=review.id;journalContext67('Post this correction in an open period. The locked original stays unchanged.');});
 }
 if(locked)document.querySelectorAll('#periodTransactionsBody [onclick*="loadEntryForEdit"],#periodTransactionsBody [onclick*="voidLiveJournalEntry"]').forEach(b=>b.remove());
 else document.querySelectorAll('#periodTransactionsBody [onclick*="reviewPeriodTransaction"],#periodTransactionsBody [onclick*="openTransactionReview"]').forEach(b=>{const id=(b.getAttribute('onclick')||'').match(/\('([^']+)'\)/)?.[1];if(id){b.textContent='Edit';b.onclick=()=>loadEntryForEdit(id);const row=JournalModule.entries.find(x=>x.id===id);if(row?.dbEntryId&&!b.parentElement.querySelector('[data-void136]')){const v=document.createElement('button');v.dataset.void136='';v.textContent='Void';v.className='je-btn je-btn-danger';v.onclick=()=>voidLiveJournalEntry(row.dbEntryId,id);b.after(v);}}});
}
const renderReviewBefore=renderPeriodReview;renderPeriodReview=function(...args){const r=renderReviewBefore(...args);reviewPanel();return r;};
async function yearClose(){if(!admin())return showCenterStatus('Administrator access is required to close a year.',true);let year=Number(PeriodReview.selectedMonth.slice(0,4));const entered=await ui117.prompt('Year to close and carry forward:',String(year));if(!entered)return;year=Number(entered);if(!Number.isInteger(year)||year<1900||year>2198)return showCenterStatus('Enter a valid year.',true);
 try{const check=await rpc('year_preflight136',{p_year:year});const record=check.completed?check.record:null,balances=record?.balances||check.balances||[];
  const root=document.createElement('div');root.className='submission-compare-overlay';root.id='yearEnd136';root.innerHTML=`<section class="source-dialog69"><header><h2>Close ${year} & Carry Forward to ${year+1}</h2></header><div class="year-warning136"><strong>Check everything before finalizing this year</strong><p>Income and expenses will close into retained earnings for each currency. All months will be locked. Original transactions stay available in History. Corrections afterward must be posted in an open period.</p><p>Opening balances are carried from the preserved ledger and recorded as a checkpoint. No duplicate opening journal is posted.</p>${(check.blockers||[]).map(x=>`<p>Blocked: ${esc(x)}</p>`).join('')}${(check.warnings||[]).map(x=>`<p>Check: ${esc(x)}</p>`).join('')}</div>${record?'<p>This year is already finalized. Saved opening checkpoint:</p>':''}<div class="table-container"><table><thead><tr><th>Account</th><th>Currency</th><th>Balance DR / CR</th></tr></thead><tbody>${balances.map(b=>`<tr><td>${esc(b.code+' · '+b.name)}</td><td>${esc(b.currency)}</td><td>${formatAppNumber(Math.abs(b.balance))} ${b.balance>=0?'DR':'CR'}</td></tr>`).join('')}</tbody></table></div>${record?'':`<label><input type="checkbox" id="yearVerified136"> I checked all balances, source documents, pending entries and warnings.</label><label>Type CLOSE YEAR ${year}<input id="yearPhrase136" autocomplete="off"></label>`}<footer><button class="je-btn je-btn-secondary" data-cancel-year136>${record?'Close':'Cancel'}</button>${record?'':`<button class="je-btn je-btn-danger" id="confirmYear136" disabled>Close Year & Carry Forward</button>`}</footer></section>`;document.body.append(root);root.querySelector('[data-cancel-year136]').onclick=()=>root.remove();
  const button=$('confirmYear136');if(button){const validate=()=>button.disabled=!!check.blockers?.length||!$('yearVerified136').checked||$('yearPhrase136').value!=='CLOSE YEAR '+year;root.addEventListener('input',validate);button.onclick=async()=>{button.disabled=true;try{await rpc('close_year136',{p_year:year,p_confirmation:$('yearPhrase136').value,p_fingerprint:check.fingerprint});root.remove();await reload();showCenterStatus(year+' finalized. Check '+(year+1)+' opening balances in General Ledger.');}catch(e){showCenterStatus(e.message,true);validate();}};}
 }catch(e){showCenterStatus('Year-end checks unavailable: '+e.message+'. Install SQL 03 from this update.',true);}
}
function positionPopover(panel,button){const box=button.getBoundingClientRect();panel.style.setProperty('position','fixed','important');panel.style.setProperty('inset','auto','important');panel.style.setProperty('right',Math.max(12,innerWidth-box.left+10)+'px','important');panel.style.setProperty('bottom',Math.max(12,innerHeight-box.bottom)+'px','important');panel.style.setProperty('max-height',Math.max(160,box.bottom-20)+'px','important');panel.style.setProperty('transform','none','important');}
function switchWorkspace(){const b=$('switchAccount110');if(!admin())return switchAccount();let panel=$('switchWorkspace136');if(panel){panel.remove();return;}
 panel=document.createElement('section');panel.id='switchWorkspace136';panel.className='dock-popover136';panel.innerHTML='<header><strong>Switch Workspace</strong><button data-close-workspace136 aria-label="Close">×</button></header><input type="search" placeholder="Search sub-users" aria-label="Search sub-users"><button data-my-workspace136>Return to My Workspace</button><div></div>';document.body.append(panel);positionPopover(panel,b);const users=availableSubUsers();const draw=()=>{const query=panel.querySelector('input').value.toLowerCase(),list=panel.querySelector('div');list.innerHTML=users.filter(u=>(u.full_name||u.email||'').toLowerCase().includes(query)).map(u=>`<button data-workspace136="${esc(u.id)}">${esc(u.full_name||u.email)}</button>`).join('')||'<p>No matching sub-users.</p>';list.querySelectorAll('button').forEach(x=>x.onclick=()=>{switchTab('sub-users-workspace');openWorkspaceUser(x.dataset.workspace136);panel.remove();decorate();});};panel.querySelector('input').oninput=draw;panel.querySelector('[data-close-workspace136]').onclick=()=>panel.remove();panel.querySelector('[data-my-workspace136]').onclick=()=>{panel.remove();switchTab('dashboard');};draw();panel.querySelector('input').focus();
}
async function loadTodos(){if(!ojmDb||!liveProfile)return;const owner=liveProfile.id,r=await ojmDb.from('workspace_todos136').select('*').eq('owner_id',owner).order('due_date',{ascending:true,nullsFirst:false});if(r.error){state.todoError=r.error.message;return;}if(liveProfile.id!==owner)return;state.todos=r.data||[];state.todoError='';renderTodos();}
function renderTodos(){const root=$('transactions-recurring');if(!root)return;let host=$('todos136');if(!host){host=document.createElement('section');host.id='todos136';host.className='je-card';root.append(host);}host.innerHTML='<div class="je-card-header"><h3>To-do Lists & Workflows</h3><button class="je-btn je-btn-emerald" data-new-todo136>Add To-do</button></div><p>Keep reminders and ordered steps for payroll, payments and closing.</p>'+ (state.todoError?'<p>Install SQL 03 to enable saved to-do lists.</p>':state.todos.map(t=>`<details class="todo136"><summary><strong>${esc(t.title)}</strong><span>${esc(t.due_date||'No due date')} · ${(t.steps||[]).filter(s=>s.done).length}/${(t.steps||[]).length} done${t.sequential?' · Sequential':''}</span></summary><ol>${(t.steps||[]).map((s,i)=>`<li><label><input type="checkbox" data-todo136="${t.id}" data-step136="${i}" ${s.done?'checked':''} ${t.sequential&&!s.done&&t.steps.slice(0,i).some(x=>!x.done)?'disabled':''}>${esc(s.text)}</label></li>`).join('')}</ol><button class="je-btn je-btn-secondary" data-edit-todo136="${t.id}">Edit</button><button class="je-btn je-btn-danger" data-delete-todo136="${t.id}">Delete</button></details>`).join('')||'<p>No to-do lists yet.</p>');host.querySelector('[data-new-todo136]').onclick=()=>editTodo();host.querySelectorAll('[data-edit-todo136]').forEach(b=>b.onclick=()=>editTodo(b.dataset.editTodo136));host.querySelectorAll('[data-delete-todo136]').forEach(b=>b.onclick=async()=>{if(!await ui117.confirm('Delete this to-do list?'))return;const r=await ojmDb.from('workspace_todos136').delete().eq('id',b.dataset.deleteTodo136).eq('owner_id',liveProfile.id);if(r.error)return showCenterStatus(r.error.message,true);await loadTodos();});host.querySelectorAll('[data-todo136]').forEach(input=>input.onchange=async()=>{const t=state.todos.find(t=>t.id===input.dataset.todo136),steps=structuredClone(t.steps),index=Number(input.dataset.step136);steps[index].done=input.checked;if(t.sequential&&!input.checked)steps.slice(index+1).forEach(s=>s.done=false);const r=await ojmDb.from('workspace_todos136').update({steps,updated_at:new Date().toISOString()}).eq('id',t.id).eq('owner_id',liveProfile.id);if(r.error)showCenterStatus(r.error.message,true);await loadTodos();});}
function editTodo(id){const t=state.todos.find(x=>x.id===id)||{},root=document.createElement('div');root.className='submission-compare-overlay';root.innerHTML=`<form class="source-dialog69"><h2>${id?'Edit':'Add'} To-do List</h2><label>Title<input name="title" required maxlength="160" value="${esc(t.title||'')}"></label><label>Due date<input name="due" type="date" value="${esc(t.due_date||'')}"></label><label><input name="sequential" type="checkbox" ${t.sequential?'checked':''}> Complete steps in order</label><label>Steps — one per line, first step at the top<textarea name="steps" required rows="7">${esc((t.steps||[]).map(x=>x.text).join('\n'))}</textarea></label><footer><button type="button">Cancel</button><button class="je-btn je-btn-emerald">Save</button></footer></form>`;document.body.append(root);root.querySelector('[type=button]').onclick=()=>root.remove();root.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.target,texts=f.elements.steps.value.split('\n').map(x=>x.trim()).filter(Boolean),available=[...(t.steps||[])];const steps=texts.map(text=>{const i=available.findIndex(x=>x.text===text);return i>=0?available.splice(i,1)[0]:{text,done:false};});if(f.elements.sequential.checked){let incomplete=false;steps.forEach(s=>{if(incomplete)s.done=false;if(!s.done)incomplete=true;});}const data={owner_id:liveProfile.id,title:f.elements.title.value.trim(),due_date:f.elements.due.value||null,sequential:f.elements.sequential.checked,steps,updated_at:new Date().toISOString()};const result=id?await ojmDb.from('workspace_todos136').update(data).eq('id',id).eq('owner_id',liveProfile.id):await ojmDb.from('workspace_todos136').insert(data);if(result.error)return showCenterStatus(result.error.message,true);root.remove();await loadTodos();};}
window.getTodoNotices136=()=>state.todos.filter(t=>(t.steps||[]).some(s=>!s.done)).map(t=>({type:'To-do',title:t.title,detail:t.due_date||'No due date',target:'transactions-recurring'}));
function quotationLibrary(){const f=$('appearanceForm113');if(!f||f.parentElement.querySelector('.quotation-library138'))return;
 const section=document.createElement('details');section.className='quotation-library138';
 section.innerHTML='<summary>Quotations for all 10 main areas</summary><p>Edit each area’s quotation here. Save all ten together. Banner artwork and lettering controls are below.</p><div class="quote-slots136">'+Object.entries(shell113.areas).map(([key,value],i)=>`<details class="quote-slot1422"><summary>${i+1}. ${esc(value[0])}</summary><label>Quotation<textarea data-area-quote138="${key}" maxlength="220" rows="2">${esc(shell113.state.rows[key]?.quote??value[1])}</textarea></label><button type="button" data-style-area1422="${key}">Edit color, outline &amp; shadow</button></details>`).join('')+'</div><button type="button" class="je-btn je-btn-emerald" data-save-quotes138>Save all 10 quotations</button><p role="status"></p>';
 section.addEventListener('click',event=>{const target=event.target.closest('[data-style-area1422]');if(!target)return;f.elements.area.value=target.dataset.styleArea1422;f.elements.area.dispatchEvent(new Event('change',{bubbles:true}));f.querySelector('.quote-controls117')?.scrollIntoView({block:'center',behavior:'smooth'});});f.before(section);const paint=()=>{for(const input of section.querySelectorAll('textarea'))if(input!==document.activeElement&&!input.dataset.dirty138)input.value=shell113.state.rows[input.dataset.areaQuote138]?.quote??shell113.areas[input.dataset.areaQuote138][1];};section.addEventListener('input',e=>{if(e.target.matches('textarea'))e.target.dataset.dirty138='1';});window.addEventListener('presentation-ready113',paint);
 section.querySelector('[data-save-quotes138]').onclick=async e=>{e.target.disabled=true;try{const rows={};for(const input of section.querySelectorAll('textarea')){const area=input.dataset.areaQuote138;rows[area]={...(shell113.state.rows[area]||{}),quote:input.value.trim()};for(const [key,data] of Object.entries(shell113.state.rows))if(key.startsWith(area+':'))rows[key]={...data,quote:input.value.trim()};}await shell113.saveMany(rows);section.querySelectorAll('textarea').forEach(n=>delete n.dataset.dirty138);section.querySelector('[role=status]').textContent='All ten area quotations saved.';f.elements.area.dispatchEvent(new Event('change',{bubbles:true}));}catch(error){showCenterStatus(error.message,true);}finally{e.target.disabled=false;}};
}
function syncSidebar137(){
 const root=document.querySelector('.tab-content.active'),area=window.shell113?.area?.(root)||document.body.dataset.area113;
 const selected=$('nav-module-'+area);
 document.querySelectorAll('#appSidebar .nav-category').forEach(n=>{
  const current=n===selected;
  n.classList.toggle('current-module136',current);n.classList.toggle('active-category',current);n.classList.remove('is-active');
  const h=n.querySelector('.nav-header');if(h){h.classList.remove('nav-selected109','active');if(current)h.setAttribute('aria-current','page');else h.removeAttribute('aria-current');}
  n.querySelectorAll('.nav-selected109').forEach(x=>{if(!current)x.classList.remove('nav-selected109');});
 });
}
function decorate(){installRpc();const yearButton=$('yearClose136');if(yearButton)yearButton.hidden=!admin();syncSidebar137();
 const switcher=$('switchAccount110');if(switcher){switcher.onclick=()=>window.workspace138?.menu();switcher.title='Switch Account';}
 const panel=$('headerNotices104'),bell=$('upcomingBell101');if(panel&&bell){panel.classList.add('dock-popover136');if(!panel.hidden)positionPopover(panel,bell);if(!bell.dataset.anchored136){bell.dataset.anchored136='';const old=bell.onclick;bell.onclick=e=>{old?.(e);if(!panel.hidden)positionPopover(panel,bell);};}}
 const tab=typeof activeSubUserTab==='function'?activeSubUserTab():null,owner=tab?.userId,workspace=$('subUserWorkspacePanel');let badge=$('workspaceActor136');if(admin()&&owner&&workspace){if(!badge){badge=document.createElement('p');badge.id='workspaceActor136';badge.className='workspace-actor136';workspace.prepend(badge);}const text='Viewing '+getLiveUserName(owner)+'’s workspace as Administrator. Changes are recorded under your identity.';if(badge.textContent!==text)badge.textContent=text;}else badge?.remove();
 document.querySelectorAll('#subUserWorkspacePanel th').forEach(th=>{if(th.textContent.trim().toLowerCase()==='action')th.dataset.action136='';});
 quotationLibrary();reviewPanel();renderReopened67();
}
document.addEventListener('pointerdown',e=>{const panel=$('switchWorkspace136');if(panel&&!panel.contains(e.target)&&!$('switchAccount110')?.contains(e.target))panel.remove();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('switchWorkspace136')?.remove();const p=$('headerNotices104');if(p)p.hidden=true;}});
window.addEventListener('resize',()=>{const p=$('headerNotices104');if(p&&!p.hidden)positionPopover(p,$('upcomingBell101'));});
function updateBalances(owner,rows){const tab=typeof activeSubUserTab==='function'?activeSubUserTab():null;if(tab?.userId!==owner&&liveProfile?.id!==owner)return;const totals={};for(const row of rows){const currency=row.currency||'LAK';totals[currency]=(totals[currency]||0)+Number(row.closing||0)+Number(row.draft_in||0)-Number(row.draft_out||0);}const hero=document.querySelector('#subUserWorkspacePanel .v49-hero strong');if(hero){const text=Object.entries(totals).map(([c,v])=>formatAppNumber(v)+' '+c).join(' · ');if(hero.textContent!==text)hero.textContent=text||'No assigned funds';}}
window.workflow136={state,reload,yearClose,finishSession,loadTodos,decorate,updateBalances};
function ready(){const scrollBefore=window.scrollToAccountModule;if(typeof scrollBefore==='function')window.scrollToAccountModule=function(...args){const r=scrollBefore.apply(this,args);decorate();requestAnimationFrame(decorate);return r;};window.addEventListener('page113',()=>{decorate();if(liveProfile&&state.owner!==liveProfile.id)reload().catch(e=>showCenterStatus('Install SQL 03 to enable the new workflows: '+e.message,true));if(document.querySelector('.tab-content.active')?.id==='transactions-recurring')loadTodos();});const profileBefore=loadLiveProfile;loadLiveProfile=async function(...args){const r=await profileBefore(...args);state.sessions=[];state.todos=[];decorate();reload().catch(e=>showCenterStatus('New workflows need SQL 03: '+e.message,true));return r;};decorate();window.addEventListener('focus',()=>{if(liveProfile)reload().catch(()=>{});});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
