/* Desktop personal workspaces share the live journal editor and its calculator.
   The existing staff review pipeline remains the only route to ledger posting. */
(()=>{'use strict';
const $=id=>document.getElementById(id),esc=v=>escapeHtml(String(v??'')),desktop=()=>matchMedia('(min-width:1025px)').matches&&document.documentElement.dataset.device132!=='phone';
const completed=j=>['posted','reviewed','approved','approved_applied','approved_posted'].includes(j.status);
const editable=j=>['draft','returned'].includes(j.status);
const states=new Map(),drafts=new Map(),historyExtra=new Map();
let card,anchor,scope='',scopeActor='',mainSnapshot=null,restoring=false,busy=false,rendering=false;
const user=id=>availableSubUsers().find(u=>String(u.id)===String(id))||(liveProfile?.id===id?liveProfile:null);
const key=id=>String(liveProfile?.id||'')+':'+id;
const tabs=['home','journal','summary','history','reports','ledger'];
const tabKey=id=>'ojm-personal-tab1437:'+key(id);
const state=id=>{const k=key(id);if(!states.has(k)){let tab='home';try{const saved=localStorage.getItem(tabKey(id));if(tabs.includes(saved))tab=saved}catch{}states.set(k,{tab,month:wsPeriod[id]||new Date().toISOString().slice(0,7),year:String(new Date().getFullYear()),historyMonth:'',search:'',page:0})}return states.get(k)};
const journals=id=>(reviewStaffJournals||[]).filter(j=>String(j.owner_id)===String(id));
function allowed(a,id=scope){const u=user(id);if(!a||!u||a.isPosting===false)return false;const r=workspaceRules(u);return [...r.fundIds,...r.entryIds,r.counterpart].includes(String(a.id));}
function readDraft(id){
 const k=key(id);if(drafts.has(k))return drafts.get(k);
 try{const d=JSON.parse(localStorage.getItem('ojm-personal-journal1437:'+k));if(d){drafts.set(k,d);return d}}catch{}
 const edits=Object.values(workspaceRowEdits[id]||{}),pending=workspacePendingRows[id]||[],old=[...edits,...pending];
 if(!old.length)return null;
 const rules=workspaceRules(user(id));
 const d={mode:'single',multiple:true,date:old[0].transaction_date,memo:old[0].memo||'',rows:[],single:old.map(r=>({date:r.transaction_date,direction:r.direction||'out',source:r.fund_account_id||rules.fundIds[0]||'',affected:r.direction==='in'&&r.account_id===r.fund_account_id?rules.counterpart:(r.selected_account_id||r.account_id||''),amount:String(r.amount||''),memo:r.memo||''})),editIds:edits.map(r=>r.id||r.key),requestKey:'pj-'+crypto.randomUUID()};
 try{localStorage.setItem('ojm-personal-journal1437:'+k,JSON.stringify(d));drafts.set(k,d);workspacePendingRows[id]=[];workspaceRowEdits[id]={};window.drafts1427?.flush()}catch{showCenterStatus('Your earlier unfinished rows could not be migrated to the device draft. Free some storage before continuing.',true)}
 return d;
}
function remember(){if(!scope||restoring)return;const d=capture(),draftKey=scopeActor+':'+scope;drafts.set(draftKey,d);try{localStorage.setItem('ojm-personal-journal1437:'+draftKey,JSON.stringify(d))}catch{showCenterStatus('The device draft could not be stored. Save your entry before leaving.',true)}}
function capture(){return {...snapshotJournal69(),memo:$('jeGeneralMemo').value,date:$('jeTransDate').value,multiple:$('jeMultipleDates').checked,mode:entry1430.mode,single:entry1430.read(),retained14232:entry1430.retained,editing:JournalModule.editingEntryId,pendingLines:JournalModule.pendingLines,editIds:card._editIds1437||[],requestKey:card._requestKey1437||'pj-'+crypto.randomUUID()}}
function restore(d){restoring=true;try{
 const today=new Date().toISOString().slice(0,10);
 entry1430.restore('double',[]);$('jeLinesBody').replaceChildren();
 $('jeGeneralMemo').value=d?.memo||'';$('jeTransDate').value=d?.date||today;$('jeMultipleDates').checked=!!d?.multiple;
 document.body.classList.toggle('je-multi-date',!!d?.multiple);
 restoreJournal69(d?.rows?.length?d:{rows:[{},{}],owner:'',journal:'',local:false});
 JournalModule.editingEntryId=d?.editing||null;JournalModule.pendingLines=d?.pendingLines||[];
 card._editIds1437=d?.editIds||[];card._requestKey1437=d?.requestKey||'pj-'+crypto.randomUUID();
 entry1430.restore(d?.mode||'single',d?.single||[],d?.retained14232);calculateJournalBalance();
 window.dropdown1434?.enhance(card);
}finally{restoring=false;if(busy)card.querySelectorAll('input,select,textarea,button').forEach(n=>{if(!n.disabled){n.dataset.pendingSaveDisabled1437='1';n.disabled=true}})}}
function detach(){if(!scope)return;remember();const sameActor=scopeActor===liveProfile?.id;scope='';scopeActor='';card.removeAttribute('data-personal-owner1437');anchor.after(card);card.querySelectorAll('[data-personal-disabled1437]').forEach(n=>{n.disabled=false;delete n.dataset.personalDisabled1437});restore(sameActor?mainSnapshot:null);mainSnapshot=null;label();}
function mount(id){const host=$('personalEditor1437');if(!host)return;if(scope===id){if(card.parentElement!==host)host.append(card);return}
 detach();mainSnapshot=capture();scope=id;scopeActor=liveProfile?.id||'';card.dataset.personalOwner1437=id;host.append(card);restore(readDraft(id));card.hidden=false;card.querySelectorAll('input,select,textarea').forEach(n=>{if(!access113.can('sub-users-workspace','edit')&&!n.disabled){n.dataset.personalDisabled1437='1';n.disabled=true}});label();}
function label(){if(!card)return;const button=$('btnPostJournal'),sub=card.querySelector('.je-subtitle');
 if(scope){button.textContent=card._editIds1437?.length?'Save Changes':'Post Entry';sub.textContent='Save to this personal journal, then submit for review.';$('jeNextIdDisplay').textContent='Entry ID: '+localWorkspaceEntryPreview(user(scope));}
 else{sub.textContent='Currency follows the selected account.';button.textContent=JournalModule.editingEntryId?'Update Entry':'Post Entry';updateNextEntryIdDisplay()}
}
function rowsFor(id){const s=state(id);return journals(id).filter(j=>editable(j)&&(!s.month||String(j.period_start).startsWith(s.month))).flatMap(j=>(j.lines||[]).filter(l=>!l.voided_at&&l.status!=='voided').map(l=>({...l,batch_status:j.status})));}
function groupsFor(id){const groups=new Map();for(const l of rowsFor(id)){const k=l.editor_group1437||l.id;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(l)}return [...groups.values()].sort((a,b)=>String(b[0].transaction_date).localeCompare(String(a[0].transaction_date))||String(b[0].created_at||'').localeCompare(String(a[0].created_at||'')));}
function amount(v){return formatAppNumber(Number(v)||0)}
function validSnapshot(group){
 const d=group[0]?.editor_snapshot1437;if(!d?.components1437)return null;
 const dates=new Set(group.map(l=>l.transaction_date));
 const normalize=rows=>rows.map(r=>JSON.stringify([r.date,r.direction,r.fund,r.account,Number(r.amount),r.memo])).sort().join('|');
 const actual=group.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo}));
 return normalize(actual)===normalize(d.components1437.filter(r=>dates.has(r.date)))?d:null;
}
function journalDisplay(group){
 const first=group[0],snapshot=validSnapshot(group);
 if(snapshot&&!group.some(wsIsCollection)){
  const rows=snapshot.rows.filter(r=>!snapshot.multiple||r.date===first.transaction_date);
  return rows.filter(r=>r.account).map(r=>{const a=getSelectedAccountInfo(r.account),dr=parseAppNumber(r.dr||'0'),cr=parseAppNumber(Object.values(r.credits||{}).find(v=>parseAppNumber(v)>0)||'0');return {displayAccount:a?.name||r.account,currency_code:a?.currency,amount:dr||cr,side:dr?'debit':'credit',memo:r.memo||snapshot.memo}});
 }
 return [...doubleEntryLines({lines:group}),...group.filter(wsIsCollection).map(l=>({...l,side:'collection',displayAccount:workspaceAccountName(l.fund_account_id)}))];
}
function activeHtml(id){const groups=groupsFor(id),can=access113.can('sub-users-workspace','edit');
 return `<section class="personal-active1437 je-card"><header><h3>Active Journal</h3><label>Period <input type="month" data-personal-month value="${esc(state(id).month)}"></label></header><div class="table-container"><table class="je-table clustered-journal-table"><thead><tr><th>Date</th><th>Entry ID</th><th>Account</th><th>Line memo</th><th>Debit</th><th>Credit</th><th>Action</th></tr></thead><tbody>${groups.map(group=>{
 const first=group[0],display=journalDisplay(group),general=String(first.editor_snapshot1437?.memo||'').trim(),span=display.length+(general?1:0);
 return display.map((l,i)=>`<tr class="${i===0&&general?'journal-description14281':''}">${i===0?`<td rowspan="${span}">${esc(formatAppDate(first.transaction_date))}</td><td rowspan="${span}">${esc(first.workspace_entry_no||'Entry')}</td>`:''}${i===0&&general?`<td colspan="4" class="general-description14281"><strong>General description</strong> ${esc(general)}</td><td rowspan="${span}"><button class="je-btn je-btn-secondary" data-edit-personal="${esc(first.id)}" ${can?'':'disabled'}>Edit</button><button class="je-btn je-btn-danger" data-void-personal="${esc(first.id)}" ${can?'':'disabled'}>Void</button></td></tr><tr>`:''}<td><span class="currency-symbol-badge" title="${esc(l.currency_code)}">${esc(currencySymbolV6(l.currency_code))}</span> ${esc(l.displayAccount)}</td><td>${esc(l.memo||first.memo)}${l.side==='collection'?'<small>Reported collection: '+esc(amount(l.amount))+'</small>':''}</td><td class="num">${l.side==='debit'?esc(amount(l.amount)):'—'}</td><td class="num">${l.side==='credit'?esc(amount(l.amount)):'—'}</td>${i===0&&!general?`<td rowspan="${span}"><button class="je-btn je-btn-secondary" data-edit-personal="${esc(first.id)}" ${can?'':'disabled'}>Edit</button><button class="je-btn je-btn-danger" data-void-personal="${esc(first.id)}" ${can?'':'disabled'}>Void</button></td>`:''}</tr>`).join('');
 }).join('')||'<tr><td colspan="7" class="period-empty">No editable entries for this period.</td></tr>'}</tbody></table></div></section>`;
}
function homeHtml(id){const data=window.funds113?.confirmed.get(id)||[],currencies=new Map();for(const r of data){if(!currencies.has(r.currency))currencies.set(r.currency,{available:0,used:0,remaining:0});const v=currencies.get(r.currency);v.available+=Number(r.opening||0)+Number(r.received||0);v.used+=Number(r.used||0)+Number(r.handover||0);v.remaining+=Number(r.closing||0)}
 return `<section class="personal-home1437"><h3>Remaining Funds</h3><div class="personal-metrics1437">${[...currencies].map(([c,v])=>`<article class="currency-coded14231" data-currency-code="${esc(c)}"><small>${esc(c)}</small><strong>${esc(amount(v.remaining))}</strong><p>Available ${esc(amount(v.available))} · Used ${esc(amount(v.used))}</p><progress max="100" value="${v.available>0?Math.max(0,Math.min(100,v.remaining/v.available*100)):0}"></progress></article>`).join('')||'<p>Assigned fund balances will appear after loading.</p>'}</div><div class="personal-shortcuts1437">${[['journal','Post Entry','Record a transaction'],['summary','Summary','Funds and account totals'],['history','History','Completed reports']].map(([t,n,d])=>`<button data-personal-tab="${t}"><b>${n}</b><span>${d}</span></button>`).join('')}</div><h3>Recent entries</h3>${journals(id).flatMap(j=>(j.lines||[]).map(l=>({...l,status:j.status}))).sort((a,b)=>String(b.transaction_date).localeCompare(String(a.transaction_date))).slice(0,5).map(l=>`<div class="personal-recent1437"><span>${esc(formatAppDate(l.transaction_date))} · ${esc(l.memo)}<small>${esc(l.status)}</small></span><b>${esc(amount(l.amount))} ${esc(l.currency_code)}</b></div>`).join('')||'<p>No saved entries yet.</p>'}</section>`;
}
function historyCard(j){
 if(Object.hasOwn(j,'request_no'))return window.workspaceRecords1437.card(j);
 const rows=j.lines||[];
 return `<details class="final-record-card" name="personal-history1437"><summary><span><strong>${esc(j.seed_key||'REPORT-'+String(j.id).slice(-8))}</strong><small>${esc(String(j.period_start).slice(0,7))} · ${esc(j.status)}</small></span><span class="final-record-count"><b>${rows.length}</b> entries</span><button class="je-btn je-btn-secondary" onclick="v56ToggleRecord(event)">View Book</button></summary><div class="final-record-content"><div class="table-container"><table class="je-table"><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description</th><th>Currency</th><th>Amount</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${esc(l.workspace_entry_no||'—')}</td><td>${esc(formatAppDate(l.transaction_date))}</td><td>${esc(lineAccountName(l))}</td><td>${esc(l.memo)}</td><td>${esc(l.currency_code)}</td><td class="num">${esc(amount(l.amount))}</td></tr>`).join('')}</tbody></table></div>${workspaceAccountSummary(rows)}${window.v66ReviewMetadata?window.v66ReviewMetadata(j):''}</div></details>`;
}
function historyHtml(id){const s=state(id),all=[...journals(id).filter(completed),...(historyExtra.get(id)||[]).filter(j=>!['submitted','returned','draft'].includes(j.status))];
 const date=j=>String(j.period_start||j.submitted_at||j.created_at||'');const years=[...new Set([String(new Date().getFullYear()),...all.map(j=>date(j).slice(0,4))])].filter(Boolean).sort().reverse();
 const filtered=all.filter(j=>(!s.year||date(j).startsWith(s.year))&&(!s.historyMonth||date(j).slice(5,7)===s.historyMonth)&&(!s.search||JSON.stringify(j).toLowerCase().includes(s.search.toLowerCase()))).sort((a,b)=>date(b).localeCompare(date(a)));
 s.page=Math.max(0,Math.min(s.page,Math.ceil(filtered.length/12)-1));const visible=filtered.slice(s.page*12,s.page*12+12);
 return `<section class="personal-history1437"><header><h3>History</h3><span>${filtered.length} completed records</span></header><div class="personal-history-filters1437"><label>Year<select data-history-year><option value="">All years</option>${years.map(y=>`<option ${s.year===y?'selected':''}>${esc(y)}</option>`).join('')}</select></label><label>Month<select data-history-month><option value="">All months</option>${Array.from({length:12},(_,i)=>{const n=String(i+1).padStart(2,'0');return `<option value="${n}" ${s.historyMonth===n?'selected':''}>${new Date(2026,i,1).toLocaleString('en',{month:'long'})}</option>`}).join('')}</select></label><label>Search<input type="search" data-history-search placeholder="Description, reference or status" value="${esc(s.search)}"></label></div><div class="personal-history-list1437">${visible.map(j=>`<div data-history-record="${esc(j.id)}">${historyCard(j)}${!Object.hasOwn(j,'request_no')&&access113.can('document-editor105','export')?`<button class="je-btn je-btn-secondary" data-print-personal="${esc(j.id)}">Print report</button>`:''}</div>`).join('')||'<p class="period-empty">No completed records match these filters.</p>'}</div><footer><button class="je-btn je-btn-secondary" data-history-page="-1" ${s.page?'':'disabled'}>Previous</button><span>Page ${s.page+1} of ${Math.max(1,Math.ceil(filtered.length/12))}</span><button class="je-btn je-btn-secondary" data-history-page="1" ${(s.page+1)*12<filtered.length?'':'disabled'}>Next</button></footer></section>`;
}
// Compare source markup, not decorated DOM: icons must survive unrelated updates.
function paintPanel1437(panel,markup){if(!panel||panel._personalMarkup1437===markup)return;panel._personalMarkup1437=markup;panel.innerHTML=markup;window.headerIcons112?.decorate();}
function updatePanels(id){const root=$('personalWorkspace1437');if(!root||root.dataset.owner!==id)return;paintPanel1437(root.querySelector('[data-personal-panel=home]'),homeHtml(id));paintPanel1437(root.querySelector('#personalActive1437'),activeHtml(id));paintPanel1437(root.querySelector('#personalTotals1437'),workspaceAccountSummary(rowsFor(id)));paintPanel1437(root.querySelector('[data-personal-panel=history]'),historyHtml(id));window.dropdown1434?.enhance(root);}
function show(id,tab){const root=$('personalWorkspace1437');if(!root||root.dataset.owner!==id||!tabs.includes(tab))return;state(id).tab=tab;try{localStorage.setItem(tabKey(id),tab)}catch{}
 root.closest('.v49-desktop-workspace')?.classList.toggle('ledger-view14281',tab==='ledger');
 if(tab==='journal')mount(id);else detach();
 root.querySelectorAll('[data-personal-panel]').forEach(n=>n.hidden=n.dataset.personalPanel!==tab);
 root.querySelectorAll('.personal-tabs1437 [data-personal-tab]').forEach(b=>{const selected=b.dataset.personalTab===tab;b.classList.toggle('active',selected);b.setAttribute('aria-selected',String(selected))});
 if(tab==='ledger')window.AssignedLedger14281?.mount(root.querySelector('[data-personal-panel=ledger]'),id);
 if(tab==='reports')window.reportHistory1443?.render(id,root.querySelector('[data-personal-panel=reports]'));
 if(tab==='history')window.workspaceRecords1437.getAdjustments(id).then(rows=>{historyExtra.set(id,rows);if($('personalWorkspace1437')?.dataset.owner===id)paintPanel1437(root.querySelector('[data-personal-panel=history]'),historyHtml(id))}).catch(e=>showCenterStatus('History could not load: '+e.message,true));
}
function installDesktop(){if(!desktop()||!$('sub-users-workspace')?.classList.contains('active'))return;const id=String(activeSubUserTab()?.userId||''),u=user(id),shell=$('subUserWorkspacePanel')?.querySelector('.v49-desktop-workspace');if(!id||!u||!shell)return;
 if(shell.querySelector('#personalWorkspace1437')){updatePanels(id);return}
 const main=shell.querySelector('main');if(!main)return;
 shell.querySelectorAll('[onclick*="openWorkspaceReview"]').forEach(b=>{if(b.getAttribute('onclick').includes("'history'"))b.remove()});
 const accounts=main.querySelector('.v49-desktop-accounts'),funds=main.querySelector('.fund-summary113');
 main.innerHTML=`<div id="personalWorkspace1437" data-owner="${esc(id)}"><nav class="personal-tabs1437" role="tablist" aria-label="Personal account sections">${[['home','Home'],['journal','Journal'],['summary','Summary'],['history','History'],['reports','Report History'],['ledger','Ledger']].map(([t,n])=>`<button type="button" role="tab" data-personal-tab="${t}">${n}</button>`).join('')}</nav><section data-personal-panel="home"></section><section data-personal-panel="journal" hidden><div id="personalEditor1437"></div><div id="personalActive1437"></div></section><section data-personal-panel="summary" hidden><div id="personalFunds1437"></div><section class="personal-totals1437"><header><h3>Account Totals</h3><label>Period <input type="month" data-personal-month value="${esc(state(id).month)}"></label></header><div id="personalTotals1437"></div></section></section><section data-personal-panel="history" hidden></section><section data-personal-panel="reports" hidden></section><section data-personal-panel="ledger" hidden></section></div>`;
 const fundHost=$('personalFunds1437');if(funds)fundHost.append(funds);if(accounts)fundHost.append(accounts);
 updatePanels(id);show(id,state(id).tab);
 const root=$('personalWorkspace1437');root.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.personalTab)show(id,b.dataset.personalTab);if(b.dataset.editPersonal)edit(id,b.dataset.editPersonal);if(b.dataset.voidPersonal)voidGroup(id,b.dataset.voidPersonal);if(b.dataset.printPersonal)savedReports1434.print(b.dataset.printPersonal);if(b.dataset.historyPage){state(id).page+=Number(b.dataset.historyPage);paintPanel1437(root.querySelector('[data-personal-panel=history]'),historyHtml(id))}});
 root.addEventListener('change',e=>{const n=e.target;if(n.matches('[data-personal-month]')){state(id).month=n.value;wsPeriod[id]=n.value;updatePanels(id)}if(n.matches('[data-history-year],[data-history-month]')){const s=state(id);if(n.matches('[data-history-year]'))s.year=n.value;else s.historyMonth=n.value;s.page=0;paintPanel1437(root.querySelector('[data-personal-panel=history]'),historyHtml(id))}});
 root.addEventListener('input',e=>{if(!e.target.matches('[data-history-search]'))return;const s=state(id),pos=e.target.selectionStart;s.search=e.target.value;s.page=0;paintPanel1437(root.querySelector('[data-personal-panel=history]'),historyHtml(id));const n=root.querySelector('[data-history-search]');n.focus();n.setSelectionRange(pos,pos)});
 window.funds113?.refresh();
}
function findGroup(id,lineId){return groupsFor(id).find(g=>g.some(l=>l.id===lineId))}
async function edit(id,lineId){if(!access113.can('sub-users-workspace','edit'))return;const group=findGroup(id,lineId);if(!group)return;const unfinished=scope===id?capture():readDraft(id);if(unfinished?.memo?.trim()&&!await ui117.confirm('Replace the unfinished entry with this saved entry for editing?'))return;show(id,'journal');const first=group[0];let d=validSnapshot(group);
 if(!d){const single=group.map(l=>({direction:l.direction||'out',source:l.fund_account_id,affected:l.direction==='in'&&l.account_id===l.fund_account_id?workspaceRules(user(id)).counterpart:l.account_id,amount:String(l.amount),memo:l.memo,date:l.transaction_date}));d={mode:'single',memo:first.memo,date:first.transaction_date,single,rows:[]};}
 if(d.multiple)d={...d,rows:(d.rows||[]).filter(r=>r.date===first.transaction_date),single:(d.single||[]).filter(r=>r.date===first.transaction_date)};
 restore({...d,owner:'',journal:'',local:false,editing:null,editIds:group.map(l=>l.id),requestKey:'pj-'+crypto.randomUUID()});label();remember();card.scrollIntoView({block:'start',behavior:'smooth'});
}
async function voidGroup(id,lineId){const group=findGroup(id,lineId);if(!group||!access113.can('sub-users-workspace','edit')||!access113.can('sub-users-workspace','void'))return;const reason=await ui117.prompt('Reason for voiding this personal journal entry:');if(!reason?.trim())return;const r=await ojmDb.rpc('void_staff_editor1437',{p_owner:id,p_ids:group.map(l=>l.id),p_reason:reason.trim()});if(r.error)return showCenterStatus(r.error.message,true);await loadStaffJournalsForReview();showCenterStatus('Personal journal entry voided.')}
function prepareItems(id){if(entry1430.retained)throw Error('Switch to Double Entry to review and post these retained journal lines.');const u=user(id),rules=workspaceRules(u),memo=$('jeGeneralMemo').value.trim();if(!memo)throw Error('Add the General Description / Memo.');
 const current=collectLiveJournalGroups();if(current.errors.length||current.differences.length)throw Error(current.errors[0]||'Each date and currency must balance.');
 const items=[];const add=(direction,fund,account,value,date,description)=>{
  if(!rules.directions.includes(direction))throw Error(direction==='in'?'Money In is not enabled for this user.':'Money Out is not enabled for this user.');
  if(!rules.fundIds.includes(fund))throw Error('Choose one of this user’s assigned fund accounts.');
  if(!rules.entryIds.includes(account)||fund===account)throw Error('Choose a different category account assigned to this user.');
  items.push({direction,fund,account,amount:value,date,memo:description||memo,reference:'',kind:direction==='in'?'collection':'payment'});
 };
 if(entry1430.mode==='single'){
  for(const r of entry1430.read()){if(!r.affected&&!r.amount&&!r.memo)continue;const n=parseAppNumber(r.amount);if(!(n>0))throw Error('Enter a positive amount.');add(r.direction,r.source,r.affected,n,$('jeMultipleDates').checked?r.date:$('jeTransDate').value,r.memo||memo)}
 }else{
  for(const [date,g] of Object.entries(current.grouped)){
   for(const currency of [...new Set(g.lines.map(l=>l.currency))]){
    const dr=g.lines.filter(l=>l.currency===currency&&Number(l.debit)>0).map(l=>({...l,left:Number(l.debit)}));
    const cr=g.lines.filter(l=>l.currency===currency&&Number(l.credit)>0).map(l=>({...l,left:Number(l.credit)}));
    // Match assigned fund payments and receipts to their selected categories.
    for(const d of dr)for(const c of cr){if(d.left<0.00000001||c.left<0.00000001)continue;
     const outgoing=rules.fundIds.includes(c.account.id)&&rules.entryIds.includes(d.account.id)&&rules.directions.includes('out');
     const incoming=rules.fundIds.includes(d.account.id)&&rules.entryIds.includes(c.account.id)&&rules.directions.includes('in');
     if(!outgoing&&!incoming)continue;const value=Math.min(d.left,c.left);
     add(outgoing?'out':'in',outgoing?c.account.id:d.account.id,outgoing?d.account.id:c.account.id,value,date,[d.memo,c.memo].filter((x,i,a)=>x&&a.indexOf(x)===i).join(' · ')||memo);d.left-=value;c.left-=value;
    }
    if(dr.some(l=>l.left>0.00000001)||cr.some(l=>l.left>0.00000001))throw Error('These lines use accounts or directions outside this user’s assigned funds and entry permissions.');
   }
  }
 }
 if(!items.length)throw Error('Enter at least one complete transaction.');return items;
}
async function save(){const invalid=card?.querySelector('.account-search1428:invalid');if(invalid){invalid.focus();invalid.reportValidity();return;}if(!scope||busy)return;const id=scope,actor=liveProfile?.id,draftKey=key(id);let frozen=[],confirmed=false;if(!access113.can('sub-users-workspace','edit'))return showCenterStatus('Editing is not enabled for this workspace.',true);
 try{if(entry1430.mode==='single')entry1430.sync();const items=prepareItems(id);remember();const snapshot={...capture(),components1437:items},requestKey=card._requestKey1437;busy=true;frozen=[...card.querySelectorAll('input,select,textarea,button')].map(n=>[n,n.disabled]);frozen.forEach(([n])=>n.disabled=true);
 const r=await window.staffSave14228({p_owner:id,p_key:requestKey,p_items:items,p_snapshot:snapshot,p_edit_ids:card._editIds1437||[]});if(r.error)throw Error(r.error.message+(r.error.code==='PGRST202'?' — run setup/INSTALL-DESKTOP-JOURNAL-v142.17.sql once.':''));
 confirmed=r.queued?'device':true;const cleared={mode:snapshot.mode,date:snapshot.date,multiple:snapshot.multiple,rows:[],single:[],memo:'',editIds:[],requestKey:'pj-'+crypto.randomUUID()};drafts.set(draftKey,cleared);localStorage.setItem('ojm-personal-journal1437:'+draftKey,JSON.stringify(cleared));if(scope===id&&actor===liveProfile?.id)restore(cleared);if(actor!==liveProfile?.id)return;state(id).month=items[0].date.slice(0,7);wsPeriod[id]=state(id).month;
 if(r.queued)showCenterStatus('Saved on this device. Tap the connection indicator, then Sync now when connected.');else void loadStaffJournalsForReview().catch(e=>{if(actor===liveProfile?.id)showCenterStatus('Entry saved. Refresh History to load the updated records. '+e.message,true)});
 }catch(e){showCenterStatus((confirmed==='device'?'Entry saved on this device; open Connection & sync to review it. ':confirmed?'Entry saved, but the local update or History refresh failed. Do not create it again. Refresh History. ': 'Saving was not confirmed. Your draft is kept; check History before retrying. ')+e.message,true)}finally{frozen.forEach(([n,disabled])=>{if(n.isConnected)n.disabled=disabled});busy=false;card.querySelectorAll('[data-pending-save-disabled1437]').forEach(n=>{n.disabled=false;delete n.dataset.pendingSaveDisabled1437});if(scope){calculateJournalBalance();label()}}
}
function ready(){card=$('journalEntry98');if(!card||!window.entry1430)return;anchor=document.createComment('Main journal editor position');card.before(anchor);
 const render=window.renderSubUserWorkspace;window.renderSubUserWorkspace=function(...args){if(rendering)return;rendering=true;try{if(scope)detach();const out=render.apply(this,args);installDesktop();return out}finally{rendering=false}};
 const switchPage=window.switchTab;window.switchTab=function(...args){if(scope)detach();const out=switchPage.apply(this,args);if(args[0]==='sub-users-workspace')installDesktop();return out};
 const post=window.submitJournalEntry;window.submitJournalEntry=function(...args){return scope?save():post.apply(this,args)};
 const clear=window.clearJournalEntry;window.clearJournalEntry=function(...args){if(!scope)return clear.apply(this,args);restore({mode:entry1430.mode,date:$('jeTransDate').value,rows:[],single:[],memo:''});remember();label()};
 const openReview=window.openWorkspaceReview;window.openWorkspaceReview=function(id,mode,...args){if(desktop()&&mode==='history'&&$('personalWorkspace1437')?.dataset.owner===String(id))return show(String(id),'history');return openReview.call(this,id,mode,...args)};
 const submit=window.submitWorkspaceForReview;window.submitWorkspaceForReview=function(id,...args){if(window.offline14239?.pendingOwner(id))return showCenterStatus('Sync all pending entries for this user before submitting for review.',true);const d=scope===id?capture():readDraft(id);if(d&&(d.memo?.trim()||d.rows?.some(r=>r.account||r.dr||Object.values(r.credits||{}).some(Boolean))))return showCenterStatus('Post or reset your unfinished personal entry before submitting.',true);return submit.call(this,id,...args)};
 const logout=window.logoutDemoUser;window.logoutDemoUser=function(...args){detach();return logout.apply(this,args)};
 for(const type of ['input','change'])card.addEventListener(type,()=>{if(scope&&!restoring){card._requestKey1437='pj-'+crypto.randomUUID();remember();label()}});
 window.addEventListener('staff-retried14234',e=>{const d=e.detail;if(d.actor!==liveProfile?.id)return;const k=key(d.owner),saved=drafts.get(k);if(saved?.requestKey===d.key){drafts.delete(k);if(scope===d.owner&&card._requestKey1437===d.key){restore(null);remember();label()}}});
 window.addEventListener('pagehide',remember);window.addEventListener('resize',()=>{if(!desktop())detach();else if($('sub-users-workspace')?.classList.contains('active'))installDesktop()});
 let queued=false;new MutationObserver(records=>{if(queued||!records.some(r=>r.target.closest?.('.fund-result113')))return;queued=true;requestAnimationFrame(()=>{queued=false;const root=$('personalWorkspace1437');if(root)paintPanel1437(root.querySelector('[data-personal-panel=home]'),homeHtml(root.dataset.owner))})}).observe(document.body,{subtree:true,childList:true});
 installDesktop();
}
window.personalJournal1437={get active(){return !!scope},get owner(){return scope},get rules(){return scope?workspaceRules(user(scope)):null},allowed,show,save,prepareItems,detach};
if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
