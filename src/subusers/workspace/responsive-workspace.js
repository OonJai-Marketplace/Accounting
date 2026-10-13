/* Oon Jai Accounting v49
 * Responsive sub-user workspace + transaction-owned review queue.
 * This layer deliberately reuses the existing Supabase/RPC journal backbone.
 */
(function () {
  'use strict';

  const mobile = window.matchMedia('(max-width: 767px)');
  const views = Object.create(null);
  let editing = null;
  let adjustmentRequests = [];

  const icon = name => {
    const paths={
      home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',accounts:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 9h10M7 13h6"/>',post:'<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9"/>',entries:'<path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"/>',records:'<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',fund:'<path d="M4 7h16v12H4z"/><path d="M7 7V5h10v2M8 11h8M8 15h5"/>',ready:'<path d="M5 4h14v16H5zM8 9l2 2 5-5M8 15h8"/>',review:'<path d="M4 5h10v14H4zM7 9h4M7 13h4"/><circle cx="17" cy="15" r="4"/><path d="m20 18 2 2"/>',alert:'<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.home}</svg>`;
  };
  const number = value => formatAppNumber(value);
  const money = value => `${number(value)} LAK`;
  const monthLabel = value => {
    const date = new Date(`${String(value || '').slice(0, 7)}-01T00:00:00`);
    return Number.isNaN(date.valueOf()) ? 'Current period' : date.toLocaleDateString('en-US', {month:'long', year:'numeric'});
  };
  const currentUser = id => availableSubUsers().find(user => String(user.id) === String(id)) || (String(liveProfile?.id) === String(id) ? liveProfile : null);
  const isStaff = () => Boolean(liveProfile && liveProfile.role !== 'admin' && !livePermission?.can_approve);
  const journalRows = userId => (reviewStaffJournals || []).filter(row => String(row.owner_id) === String(userId));
  const draftJournal = userId => journalRows(userId).find(row => ['draft','returned'].includes(row.status) && row.lines?.length) || journalRows(userId).find(row => ['draft','returned'].includes(row.status));
  const draftLines = userId => draftJournal(userId)?.lines || [];
  const getView = userId => views[userId] || 'home';

  function allocation(user, fundId) {
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    return Number(posted?.opening||0);
  }
  function activity(user, fundId) {
    const lines = journalRows(user.id).filter(journal=>['draft','returned','submitted'].includes(journal.status)).flatMap(journal => journal.lines || []).filter(line => !line.journal_entry_id && !wsIsCollection(line) && String(line.fund_account_id) === String(fundId));
    const adjustments = adjustmentRequests.filter(row => row.owner_id === user.id && row.fund_account_id === fundId && row.status === 'approved_applied').flatMap(row => row.lines || []);
    const posted=(window.funds113?.confirmed?.get(user.id)||[]).find(r=>String(r.account_id||r.id)===String(fundId));
    const base = {received:Number(posted?.received||0), used:Number(posted?.used||0), handover:Number(posted?.handover||0)};
    lines.forEach(line => {
      if (line.entry_kind === 'collection' || line.direction === 'in') base.received += Number(line.amount || 0);
      else if (line.entry_kind === 'handover') base.handover += Number(line.amount || 0);
      else base.used += Number(line.amount || 0);
    });
    // Requests cannot change posted ledger balances; a linked journal is required.
    return base;
  }
  function remaining(user, fundId) {
    const row = activity(user, fundId);
    return allocation(user, fundId) + row.received - row.used - row.handover;
  }
  window.v49FundActivity = function(userId, fundId) {
    const user = currentUser(userId);
    if (!user) return null;
    const row = activity(user, fundId);
    const opening = allocation(user, fundId);
    return {opening, ...row, balance: opening + row.received - row.used - row.handover};
  };
  function accountTotals(user, lines) {
    const totals = new Map();
    const add = (id, side, amount) => {
      if (!id) return;
      const name = accountLabelOnly(id) || workspaceAccountName(id, 'Unassigned account');
      if (!totals.has(name)) totals.set(name, {dr:0, cr:0});
      totals.get(name)[side] += Number(amount || 0);
    };
    lines.forEach(line => {
      const fund = line.fund_account_id;
      const other = line.account_id;
      if (line.direction === 'in') { add(fund, 'dr', line.amount); add(other, 'cr', line.amount); }
      else { add(other, 'dr', line.amount); add(fund, 'cr', line.amount); }
    });
    return [...totals.entries()].filter(([, row]) => row.dr || row.cr);
  }
  function totalsTable(user, lines, className='') {
    const phone = className.includes('v49-home-totals') || className.includes('v62-phone-totals');
    const number = value => phone ? Number(value || 0).toLocaleString(appNumberLocale(), {minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()}) : formatAppNumber(value);
    const rows = accountTotals(user, lines);
    const dr = rows.reduce((sum, [, row]) => sum + row.dr, 0);
    const cr = rows.reduce((sum, [, row]) => sum + row.cr, 0);
    return `<section class="v49-card v49-totals ${className}"><header><div><h3>Account Totals</h3><p>${phone?'Double-entry counterpart preview for the current unsubmitted entries.':'Debit and Credit are positive; Balance is Debit minus Credit.'}</p></div><b>${rows.length} accounts</b></header><div class="v49-table-scroll"><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows.length ? rows.map(([name,row]) => `<tr><td>${escapeHtml(name)}</td><td>${row.dr ? number(row.dr) : (phone?'':'—')}</td><td>${row.cr ? number(row.cr) : (phone?'':'—')}</td><td class="${row.dr-row.cr<0?'negative-amount':''}">${number(row.dr-row.cr)}</td></tr>`).join('') + `<tr class="v49-overall"><td>Overall total</td><td>${number(dr)}</td><td>${number(cr)}</td><td>${number(dr-cr)}</td></tr>` : '<tr><td colspan="4" class="period-empty">No account activity yet.</td></tr>'}</tbody></table></div></section>`;
  }
  function workspaceHeader(user) {
    return `<header class="v49-user-header"><div><h2>${escapeHtml(subUserAccountTitle14229(user))}</h2><p>Sub-user Account / ${escapeHtml(monthLabel(new Date().toISOString().slice(0,7)))}</p></div></header>`;
  }
  function dashboard(user) {
    const money = value => `${Number(value || 0).toLocaleString(appNumberLocale(), {minimumFractionDigits:appDecimalPlaces(),maximumFractionDigits:appDecimalPlaces()})} LAK`;
    const rules = workspaceRules(user);
    const lines = draftLines(user.id);
    const tracked = rules.fundIds.reduce((sum,id) => sum + remaining(user,id), 0);
    const reviews = journalRows(user.id).filter(row => row.status === 'submitted').length;
    const alerts = rules.fundIds.filter(id => remaining(user,id) < 0).length + adjustmentRequests.filter(row => row.owner_id === user.id && row.status === 'approved_applied').length;
    return `<section class="v49-dashboard v49-card"><div class="v49-hero"><span>Tracked remaining</span><strong>${money(tracked)}</strong><small>Across ${rules.fundIds.length} assigned account${rules.fundIds.length===1?'':'s'}</small></div><div class="v49-stat-grid"><button onclick="v49SetView('${user.id}','accounts')"><i>${icon('fund')}</i><strong>${rules.fundIds.length} <span>Assigned Funds</span></strong></button><button onclick="v49SetView('${user.id}','entries')"><i>${icon('ready')}</i><strong>${lines.length} <span>Ready Entries</span></strong></button><button onclick="v49OpenReview('${user.id}')"><i>${icon('review')}</i><strong class="red">${reviews} <span>Under Review</span></strong></button><button onclick="v49SetView('${user.id}','accounts')" class="${alerts?'attention':''}"><i>${icon('alert')}</i><strong>${alerts} <span>Alerts</span></strong></button></div></section>${totalsTable(user, lines, 'v49-home-totals')}`;
  }
  function accountsView(user) {
    const rules = workspaceRules(user);
    return `<section class="v49-card"><header><div><h3>Assigned Main Accounts</h3><p>Received, used, handed over, and remaining.</p></div></header><div class="v49-funds">${rules.fundIds.map(id => { const a=activity(user,id), balance=remaining(user,id), notices=adjustmentRequests.filter(row=>row.owner_id===user.id&&row.fund_account_id===id&&row.status==='approved_applied'); return `<article class="${balance<0?'attention':''}"><div class="v49-fund-name"><span>Main account</span><strong>${escapeHtml(accountLabelOnly(id))}</strong><div class="v49-fund-buttons">${notices.length?`<button class="notice" onclick="v49OpenNotices('${user.id}','${id}')">✓ ${notices.length}</button>`:''}<button onclick="v49OpenAdjustment('${user.id}','${id}')">Adjust</button></div></div><div><span>Funds received</span><b>${number(a.received)}</b></div><div><span>Funds used</span><b>${number(a.used)}</b></div><div><span>Handed over</span><b>${number(a.handover)}</b></div><div><span>Tracked remaining</span><b class="${balance<0?'negative-amount':''}">${money(balance)}</b></div></article>`; }).join('') || '<div class="period-empty">No main account is assigned.</div>'}</div></section>`;
  }
  function options(ids, selected, placeholder) {
    return `<option value="">${placeholder}</option>${ids.map(id => `<option value="${escapeHtml(id)}" ${String(id)===String(selected)?'selected':''}>${escapeHtml(accountLabelOnly(id))}</option>`).join('')}`;
  }
  function postView(user) {
    const rules = workspaceRules(user);
    const row = editing?.userId === user.id ? editing.draft : {};
    const nextId = row.workspace_entry_no || localWorkspaceEntryPreview(user);
    const direction = row.entry_kind === 'handover' ? 'handover' : (row.direction || '');
    return `<section class="v49-card v49-post"><header><div><h3>Post Single Entry</h3><p>Each saved entry keeps its own unique sub-user Entry ID.</p></div><div class="v49-post-tools"><b>Entry ID: ${escapeHtml(nextId)}</b><button onclick="v49OpenProtocol()">Protocol</button></div></header><div class="v49-form"><label><span>Date</span><input id="v49Date" type="date" value="${escapeHtml(row.transaction_date || new Date().toISOString().slice(0,10))}" oninput="v49ValidatePost()"></label><label><span>Direction</span><select id="v49Direction" onchange="v49DirectionChanged('${user.id}')"><option value="">Select</option>${rules.directions.includes('in')?`<option value="in" ${direction==='in'?'selected':''}>Money In</option>`:''}${rules.directions.includes('out')?`<option value="out" ${direction==='out'?'selected':''}>Money Out</option><option value="handover" ${direction==='handover'?'selected':''}>Handover</option>`:''}</select></label><label><span>Amount</span><input id="v49Amount" inputmode="decimal" value="${row.amount?number(row.amount):''}" placeholder="0" onfocus="this.select()" oninput="v49FormatAmount(this);v49ValidatePost()" onblur="finishAppNumberEditing(this);v49ValidatePost()"></label><label><span>Main / Fund</span><select id="v49Fund" onchange="v49FundChanged()">${options(rules.fundIds,row.fund_account_id,'Select fund')}</select></label><label><span>Account</span><select id="v49Account" onchange="v49ValidatePost()">${options(direction==='in'?rules.fundIds:rules.entryIds,row.account_id||row.selected_account_id,'Select account')}</select></label><label class="full"><span>Description / Reference</span><textarea id="v49Description" rows="3" placeholder="Transaction details, receipt number, or reference" oninput="v49ValidatePost()">${escapeHtml([row.memo,row.reference].filter(Boolean).join(' — '))}</textarea></label></div><div class="v49-post-actions"><button class="je-btn je-btn-secondary" onclick="v49ClearPost('${user.id}')">Clear</button><button id="v49Save" class="je-btn je-btn-emerald" disabled onclick="v49SavePost('${user.id}')">Save Entry</button></div></section>`;
  }
  function entriesView(user) {
    const journal = draftJournal(user.id), lines = orderedRecords78(journal?.lines || []);
    const canSubmit = lines.length > 0 && ['draft','returned'].includes(journal?.status);
    const cards = lines.map(line => {
      const direction = line.entry_kind==='handover'?'Handover':line.direction==='in'?'Money In':'Money Out';
      return `<details class="v64-entry" name="phone-current-entries"><summary><span><strong>${escapeHtml(line.workspace_entry_no || 'Legacy entry')}</strong><small>${escapeHtml(formatAppDate(line.transaction_date))}</small></span><b>${Number(line.amount||0).toLocaleString('en-US',{maximumFractionDigits:2})} ${escapeHtml(line.currency_code||'LAK')}</b></summary><div class="v64-entry-body"><dl><div><dt>Direction</dt><dd>${direction}</dd></div><div><dt>Main / Fund</dt><dd>${escapeHtml(accountLabelOnly(line.fund_account_id)||'—')}</dd></div><div><dt>Description / Reference</dt><dd>${escapeHtml([line.memo,line.reference].filter(Boolean).join(' · ')||'—')}</dd></div></dl><div class="v64-entry-actions"><button type="button" class="je-btn je-btn-secondary" onclick="v49EditEntry('${user.id}','${line.id}')">Edit</button><button type="button" class="je-btn je-btn-danger" onclick="voidWorkspaceSingleRow('${user.id}','${line.id}')">Delete</button></div></div></details>`;
    }).join('');
    return `<section class="v49-card"><header><div><h3>Current Entries</h3><p>${lines.length} ${lines.length===1?'entry':'entries'} ready</p></div><button class="je-btn je-btn-emerald" ${canSubmit?'':'disabled'} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></header><div class="v49-entry-list">${cards || '<div class="period-empty">No saved entries. Use Post to add one.</div>'}</div></section>`;
  }
  function recordCard(user, journal) {
    const lines = journal.lines || [];
    return `<details class="v49-record"><summary><span><strong>${escapeHtml(journal.seed_key || `SUB-${String(journal.id).slice(0,8).toUpperCase()}`)}</strong><small>${escapeHtml(monthLabel(journal.period_start))} · ${escapeHtml(String(journal.status).replaceAll('_',' '))}</small></span><b>${lines.length} entr${lines.length===1?'y':'ies'}</b></summary><div class="v49-record-body"><div class="v49-table-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description</th><th>Amount</th></tr></thead><tbody>${lines.map(line => `<tr><td>${escapeHtml(line.workspace_entry_no||'—')}</td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo)}</td><td>${number(line.amount)}</td></tr>`).join('')}</tbody></table></div>${totalsTable(user, lines)}</div></details>`;
  }
  function recordsView(user) {
    const history = journalRows(user.id).filter(row => ['posted','reviewed','approved','approved_applied'].includes(row.status)).sort((a,b) => String(b.updated_at||b.period_start).localeCompare(String(a.updated_at||a.period_start)));
    const count = journalRows(user.id).filter(row => row.status==='submitted').length;
    const adjustments=adjustmentRequests.filter(row=>row.owner_id===user.id&&!['submitted','returned'].includes(row.status)).sort((a,b)=>String(b.updated_at||b.submitted_at).localeCompare(String(a.updated_at||a.submitted_at)));
    return `<section class="v49-card v49-records"><header><div><h3>History</h3><p>Approved and posted records, newest first.</p></div><button class="je-btn je-btn-secondary" onclick="v49OpenReview('${user.id}')">Review <b class="red">+${count}</b></button></header><div class="v49-record-list">${adjustments.map(adjustmentRecordCard).join('')}${history.map(row => recordCard(user,row)).join('') || (!adjustments.length?'<div class="period-empty">No history yet.</div>':'')}</div></section>`;
  }
  function bottomNav(user) {
    const current = getView(user.id);
    return `<nav class="v49-bottom-nav">${[['home','Home'],['accounts','Accounts'],['post','Post'],['entries','Entries'],['records','Records']].map(([key,label]) => `<button class="${current===key?'active':''}" onclick="v49SetView('${user.id}','${key}')"><i>${icon(key)}</i><span>${label}</span>${key==='entries'&&draftLines(user.id).length?`<b class="v65-entry-badge">+${draftLines(user.id).length}</b>`:''}</button>`).join('')}</nav>`;
  }
  function desktopHeader(user) {
    const rules=workspaceRules(user),rows=workspaceEditableRows(user),complete=row=>Boolean(row.transaction_date&&row.direction&&(row.account_id||row.selected_account_id)&&row.fund_account_id&&(row.memo||row.reference)&&Number(row.amount)>0),hasIncomplete=rows.some(row=>!complete(row)),ready=draftLines(user.id).length>0&&!hasIncomplete,reviews=journalRows(user.id).filter(row=>row.status==='submitted').length+adjustmentRequests.filter(row=>String(row.owner_id)===String(user.id)&&row.status==='submitted').length,permission=subUserPermission(user);
    return `<header class="v49-desktop-user-heading"><div><h2>${escapeHtml(subUserAccountTitle14229(user))}</h2><p>${escapeHtml(monthLabel(new Date().toISOString().slice(0,7)))} · ${escapeHtml(permission.job_title||user.role||'Sub-user')}${user.email?` · ${escapeHtml(user.email)}`:''}</p></div><div class="v49-desktop-user-actions"><button class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}','review')">Review${reviews?` <b>${reviews}</b>`:''}</button><button class="je-btn je-btn-secondary" onclick="openWorkspaceReview('${user.id}','history')">History</button><button class="je-btn je-btn-emerald" ${ready?'':'disabled'} onclick="submitWorkspaceForReview('${user.id}')">Submit for Review</button></div></header>`;
  }
  function desktopAccounts(user) {
    const rules=workspaceRules(user),negative=[];
    const cards=rules.fundIds.map(id=>{const a=activity(user,id),balance=remaining(user,id),notices=adjustmentRequests.filter(row=>String(row.owner_id)===String(user.id)&&String(row.fund_account_id)===String(id)&&row.status==='approved_applied');if(balance<0)negative.push([id,balance]);return `<article class="v49-desktop-fund-row ${balance<0?'attention':''}"><div><span>Main account</span><strong>${escapeHtml(accountLabelOnly(id))}</strong></div><div><span>Funds received</span><b>${number(a.received)}</b></div><div><span>Funds used</span><b>${number(a.used)}</b></div><div><span>Handed over</span><b>${number(a.handover)}</b></div><div class="remaining"><span>Tracked fund remaining</span><b class="${balance<0?'negative-amount':''}">${money(balance)}</b></div><div class="action">${notices.length?`<button class="v49-approved-adjustment" onclick="v49OpenNotices('${user.id}','${id}')">✓ ${notices.length}</button>`:''}<button onclick="v49OpenAdjustment('${user.id}','${id}')">Adjust</button></div></article>`}).join('');
    return `<section class="v49-card v49-desktop-accounts"><header><div><h3>Assigned Main Accounts</h3><p>Received, used, handed over, and remaining funds are kept together in one module.</p></div></header><div class="v49-desktop-funds">${cards||'<div class="period-empty">No main account is assigned.</div>'}</div></section>${negative.length?`<div class="v49-desktop-negative"><div><strong>Fund balance needs attention</strong><span>${negative.map(([id,balance])=>`${escapeHtml(accountLabelOnly(id))} is ${money(Math.abs(balance))} below zero`).join(' · ')}</span></div><button type="button" onclick="v49OpenAdjustment('${user.id}','${negative[0][0]}')">Review possible reasons →</button></div>`:''}`;
  }
  function desktopEntryCell(user,row,field,label) {
    if(window.workspaceInlineCell117)return workspaceInlineCell117(user,row,field,label);
    const rules=workspaceRules(user),value=field==='date'?formatAppDate(row.transaction_date):field==='direction'?(row.entry_kind==='handover'?'Handover':row.direction==='in'?'Money In':'Money Out'):field==='account'?lineAccountName(row):field==='fund'?accountLabelOnly(row.fund_account_id):field==='description'?[row.memo,row.reference].filter(Boolean).join(' · '):field==='amount'?(Number(row.amount)>0?number(row.amount):''):'';
    const editor=field==='date'?'date':field==='description'?'memo':field;
    return `<td data-label="${label}"><button type="button" class="v49-desktop-cell ${value?'':'empty'} ${field==='amount'?'num':''}" onclick="openWorkspaceCellEditor('${user.id}','${row.key}','${editor}')">${escapeHtml(value||({date:'mm/dd/yyyy',direction:'Select',account:'Select account',fund:'Select fund',description:'Add description / reference',amount:'0'}[field]))}</button></td>`;
  }
  function desktopPost(user) {
    const rows=workspaceEditableRows(user),complete=row=>Boolean(row.transaction_date&&row.direction&&(row.account_id||row.selected_account_id)&&row.fund_account_id&&(row.memo||row.reference)&&Number(row.amount)>0);
    return `<section class="v49-card v49-desktop-post"><header><div><h3>Post Single Entry</h3><p>Each source entry keeps its own unique sub-user Entry ID.</p></div><div class="v49-desktop-post-tools"><button class="v49-desktop-protocol" onclick="v49OpenProtocol()">Protocol</button><button class="je-btn je-btn-emerald" onclick="addWorkspaceEntryRow('${user.id}')">+ Add Row</button></div></header><div class="v49-desktop-entry-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Direction</th><th>Account</th><th>Main / Fund</th><th>Description / Reference</th><th>Amount</th><th>Action</th></tr></thead><tbody>${rows.length?rows.map(row=>`<tr class="${complete(row)?'':'incomplete'}"><td><strong>${escapeHtml(row.workspace_entry_no||localWorkspaceEntryPreview(user))}</strong></td>${desktopEntryCell(user,row,'date','Date')}${desktopEntryCell(user,row,'direction','Direction')}${desktopEntryCell(user,row,'account','Account')}${desktopEntryCell(user,row,'fund','Main / Fund')}${desktopEntryCell(user,row,'description','Description / Reference')}${desktopEntryCell(user,row,'amount','Amount')}<td class="action"><button class="delete-row" onclick="voidWorkspaceSingleRow('${user.id}','${row.key}')" aria-label="Remove entry row">×</button></td></tr>`).join(''):'<tr><td colspan="8" class="period-empty">No current entries. Select Add Row to begin.</td></tr>'}</tbody></table></div></section>`;
  }
  function desktopAdminHome() {
    const users=availableSubUsers(),assigned=users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.length,0),reviews=(reviewStaffJournals||[]).filter(row=>row.status==='submitted').length,negative=users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.filter(id=>remaining(user,id)<0).length,0);
    const rows=users.flatMap(user=>workspaceRules(user).fundIds.map(id=>{const a=activity(user,id),balance=remaining(user,id),pending=journalRows(user.id).some(row=>row.status==='submitted');return `<tr role="button" tabindex="0" data-open-workspace-user="${user.id}" onclick="openWorkspaceUser('${user.id}')"><td><strong>${escapeHtml(subUserName(user))}</strong><small>${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</small></td><td>${escapeHtml(accountLabelOnly(id))}</td><td>${number(a.received)}</td><td>${number(a.used)}</td><td>${number(a.handover)}</td><td class="${balance<0?'negative-amount':''}">${money(balance)}</td><td><em class="${balance<0?'bad':pending?'review':'good'}">${balance<0?'ATTENTION':pending?'FOR REVIEW':'CURRENT'}</em></td></tr>`}));
    return `<section class="v49-desktop-admin"><div class="v49-desktop-home-title"><h2>Sub-users Workspace</h2><p>Search for a user or review everyone’s current fund activity.</p><div class="sub-user-search-wrap"><span class="v49-search-icon">⌕</span><input id="subUserTabSearch" class="je-input" type="search" autocomplete="off" placeholder="Search by name, email, or position" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div><div class="v49-desktop-stats"><div><i>${icon('home')}</i><strong>${users.length} <span>Sub-users</span></strong></div><div><i>${icon('fund')}</i><strong>${assigned} <span>Assigned Funds</span></strong></div><div><i>${icon('review')}</i><strong>${reviews} <span>Reviews</span></strong></div><div class="attention"><i>${icon('alert')}</i><strong>${negative} <span>Negative Funds</span></strong></div></div><section class="v49-card"><header><div><h3>User Fund Overview</h3><p>Current activity for every assigned main account.</p></div><b>${users.length} users</b></header><div class="v49-desktop-home-table"><table><thead><tr><th>User</th><th>Main account</th><th>Funds received</th><th>Funds used</th><th>Handover</th><th>Tracked remaining</th><th>Status</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="7" class="period-empty">No sub-users are available.</td></tr>'}</tbody></table></div></section></section>`;
  }
  function renderUser(user) {
    const view = getView(user.id);
    let content = view==='accounts'?accountsView(user):view==='post'?postView(user):view==='entries'?entriesView(user):view==='records'?recordsView(user):dashboard(user);
    if(view==='home') {
      const warnings=workspaceRules(user).fundIds.some(id=>remaining(user,id)<0), ready=draftLines(user.id).length;
      const next=warnings?'accounts':ready?'entries':'post';
      const message=warnings?'Review the warning on your assigned account.':ready?'Check your saved entries before submitting.':'Record your next transaction.';
      content+=`<div class="v62-next-action"><span>Next action</span><strong>${message}</strong><button class="je-btn je-btn-emerald" onclick="v49SetView('${user.id}','${next}')">Open</button></div>`;
    }
    return `<div class="v49-phone-workspace">${workspaceHeader(user)}<main>${content}</main>${bottomNav(user)}</div><div class="v49-desktop-workspace">${desktopHeader(user)}<main>${desktopAccounts(user)}${desktopPost(user)}${totalsTable(user,draftLines(user.id))}</main></div>`;
  }

  function adminHome() {
    const users = availableSubUsers();
    const assigned = users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.length,0);
    const reviews = (reviewStaffJournals||[]).filter(row=>row.status==='submitted').length;
    const negatives = users.reduce((sum,user)=>sum+workspaceRules(user).fundIds.filter(id=>remaining(user,id)<0).length,0);
    return `<section class="v49-admin-home"><div class="v49-home-title"><h2>Sub-users Workspace</h2><p>Search for a user or review everyone’s current fund activity.</p><div class="sub-user-search-wrap"><input id="subUserTabSearch" class="je-input" type="search" placeholder="Search by name, email, or position" oninput="renderSubUserTabSearch(this.value)" onfocus="renderSubUserTabSearch(this.value)"><div id="subUserSearchResults" class="sub-user-search-results" hidden></div></div></div><div class="v49-stat-grid admin"><div><i>${icon('home')}</i><strong>${users.length} <span>Sub-users</span></strong></div><div><i>${icon('fund')}</i><strong>${assigned} <span>Assigned Funds</span></strong></div><div><i>${icon('review')}</i><strong>${reviews} <span>Reviews</span></strong></div><div class="attention"><i>${icon('alert')}</i><strong>${negatives} <span>Negative Funds</span></strong></div></div><section class="v49-card"><header><div><h3>User Fund Overview</h3><p>Current activity for every assigned main account.</p></div><b>${users.length} users</b></header><div class="v49-user-overview">${users.map(user=>{const rules=workspaceRules(user),total=rules.fundIds.reduce((sum,id)=>sum+remaining(user,id),0),attention=rules.fundIds.some(id=>remaining(user,id)<0);return`<button onclick="openWorkspaceUser('${user.id}')"><span><strong>${escapeHtml(subUserName(user))}</strong><small>${rules.fundIds.length} fund${rules.fundIds.length===1?'':'s'} · ${escapeHtml(subUserPermission(user).job_title||user.role||'Sub-user')}</small></span><span><b>${money(total)}</b><em class="${attention?'bad':'good'}">${attention?'ATTENTION':'CURRENT'}</em></span></button>`}).join('')}</div></section></section>`;
  }

  const originalRender = window.renderSubUserWorkspace;
  window.renderSubUserWorkspace = function () {
    const tabs=document.getElementById('subUserWorkspaceTabs'), panel=document.getElementById('subUserWorkspacePanel');
    if(!tabs||!panel) return;
    const staff=isStaff();
    if(staff){openSubUserTabs=[{key:'self',userId:liveProfile.id,permanent:true}];activeSubUserId='self'}
    else if(!openSubUserTabs.length){openSubUserTabs=[{key:'default',userId:null,permanent:true}];activeSubUserId='default'}
    tabs.innerHTML='<button type="button" class="sub-user-mobile-menu" aria-label="Open main navigation" aria-controls="appSidebar" onclick="toggleMobileNavigation()"><span></span><span></span><span></span></button>' + openSubUserTabs.map(tab=>{const user=currentUser(tab.userId),label=tab.permanent?'Home':user?subUserName(user):'New';return`<button type="button" class="sub-user-browser-tab ${tab.key===activeSubUserId?'active':''}" onclick="activateSubUserTab('${tab.key}')"><span class="v62-tab-label" data-phone-label="${escapeHtml(label.trim().split(/\s+/)[0])}">${escapeHtml(label)}</span>${tab.permanent?'':`<span class="sub-user-tab-close" onclick="closeSubUserWorkspace(event,'${tab.key}')">×</span>`}</button>`}).join('') + (!staff?'<button type="button" class="sub-user-add-tab" onclick="addSubUserTab()">＋</button>':'');
    const tab=activeSubUserTab();
    if(tab?.permanent&&!staff){
      panel.replaceChildren();
      if(document.getElementById('sub-users-workspace')?.classList.contains('active'))
        queueMicrotask(()=>window.TeamHome14227?.home());
      return;
    }
    const user=currentUser(tab?.userId);
    panel.innerHTML=user?renderUser(user):'<div class="sub-user-empty-state">Choose a sub-user from Home.</div>';
    if(getView(user?.id)==='post') requestAnimationFrame(()=>v49ValidatePost());
  };

  window.v49SetView=function(userId,view){views[userId]=view;window.renderSubUserWorkspace();};
  window.v49OpenProtocol=function(){document.getElementById('v49ProtocolOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49ProtocolOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>ENTRY PROTOCOL</span><h2>Single-entry recording rules</h2><p>Keep every saved row complete and supported.</p></div><button onclick="document.getElementById('v49ProtocolOverlay').remove()">×</button></header><div class="v49-review-scroll"><h3>Money Out</h3><p>Select the assigned main fund that paid the transaction and the permitted expense or asset account. Keep the receipt reference in the combined description.</p><h3>Money In</h3><p>Select the assigned fund and configured counterpart. Collections remain traceable and are not posted twice.</p><h3>Handover</h3><p>Use this when unused company money is returned. Select the receiving cash or bank account and the fund being reduced.</p><h3>Before submission</h3><p>Every saved entry needs a date, direction, main fund, account, description/reference, and positive amount.</p></div></section>`;document.body.appendChild(overlay);};
  window.v49FormatAmount=function(input){formatAppNumberEditing(input)};
  window.v49ValidatePost=function(){const ids=['v49Date','v49Direction','v49Fund','v49Account','v49Amount','v49Description'];const valid=ids.every(id=>document.getElementById(id)?.value.trim())&&parseAppNumber(document.getElementById('v49Amount')?.value)>0;const button=document.getElementById('v49Save');const disabled=!valid||Boolean(button?.dataset.saving);if(button&&button.disabled!==disabled)button.disabled=disabled;return valid;};
  window.v49DirectionChanged=function(userId){const user=currentUser(userId),rules=workspaceRules(user),direction=document.getElementById('v49Direction').value,account=document.getElementById('v49Account'),fund=document.getElementById('v49Fund');if(account)account.innerHTML=options(direction==='in'?rules.fundIds:rules.entryIds,direction==='in'?fund?.value:'','Select account');v49ValidatePost();};
  window.v49FundChanged=function(){const direction=document.getElementById('v49Direction')?.value,fund=document.getElementById('v49Fund'),account=document.getElementById('v49Account');if(direction==='in'&&fund&&account)account.value=fund.value;v49ValidatePost()};
  window.v49ClearPost=function(userId){const finish=()=>{editing=null;views[userId]=editing?'entries':'post';renderSubUserWorkspace();showCenterStatus('Entry form cleared.');};if(editing){showAppConfirm('Discard Edits','Discard this temporary edit? The saved original will remain unchanged in Current Entries.','Discard Edits',()=>{editing=null;views[userId]='entries';renderSubUserWorkspace();showCenterStatus('Edits discarded; the saved entry was not changed.')},true)}else finish();};
  window.v49EditEntry=function(userId,lineId){const line=journalRows(userId).flatMap(row=>row.lines||[]).find(row=>String(row.id)===String(lineId));if(!line)return;editing={userId,originalId:line.id,draft:{...line}};views[userId]='post';renderSubUserWorkspace();showCenterStatus(`${line.workspace_entry_no||'Entry'} opened for editing. The saved original remains in Current Entries.`);};
  window.v49SavePost=async function(userId){
    if(!v49ValidatePost())return;const user=currentUser(userId),rules=workspaceRules(user),directionValue=document.getElementById('v49Direction').value,direction=directionValue==='in'?'in':'out',kind=directionValue==='in'?'collection':directionValue==='handover'?'handover':'payment',date=document.getElementById('v49Date').value,fund=document.getElementById('v49Fund').value,account=direction==='in'?fund:document.getElementById('v49Account').value,description=document.getElementById('v49Description').value.trim(),amount=parseAppNumber(document.getElementById('v49Amount').value);
    const execute=async()=>{const button=document.getElementById('v49Save');if(button?.dataset.saving)return;if(button){button.dataset.saving='true';button.disabled=true;button.textContent='Saving…'}try{const result=await ojmDb.rpc('save_staff_workspace_entry_v3',{p_owner_id:userId,p_line_id:editing?.originalId||null,p_client_key:editing?null:journalEntry98Key14228(userId,{date,direction,fund,account,description,amount,kind}),p_transaction_date:date,p_direction:direction,p_fund_account_id:fund,p_account_id:account,p_memo:description,p_reference:'',p_amount:amount,p_entry_kind:kind});if(result.error){showCenterStatus(`Entry save failed: ${result.error.message}. Run SQL 14 first.`,true);return}editing=null;views[userId]='entries';await loadStaffJournalsForReview();showCenterStatus(`${result.data?.[0]?.workspace_entry_no||'Entry'} saved successfully.`)}catch(error){showCenterStatus(`Entry save failed: ${error.message}`,true)}finally{if(button?.isConnected){delete button.dataset.saving;button.textContent='Save Entry';v49ValidatePost()}}};
    if(editing)showAppConfirm('Replace Saved Entry','Save these changes and replace the former saved values in Current Entries?','Replace Entry',execute,false);else execute();
  };

  window.v49OpenReview=function(userId){
    const user=currentUser(userId),rows=journalRows(userId).filter(row=>row.status==='submitted').sort((a,b)=>String(b.submitted_at).localeCompare(String(a.submitted_at)));
    document.getElementById('v49ReviewOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49ReviewOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>SUBMISSIONS</span><h2>Review</h2><p>${escapeHtml(subUserName(user))} · under-review records.</p></div><button onclick="document.getElementById('v49ReviewOverlay').remove()">×</button></header><div class="v49-review-scroll">${rows.map(row=>recordCard(user,row)).join('')||'<div class="period-empty">Nothing is waiting for review.</div>'}</div></section>`;document.body.appendChild(overlay);
  };
  window.v49OpenAdjustment=function(userId,fundId){
    const user=currentUser(userId),a=activity(user,fundId);document.getElementById('v49AdjustmentOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49AdjustmentOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-adjust-dialog"><header><div><span>FUND ADJUSTMENT REQUEST</span><h2>${escapeHtml(accountLabelOnly(fundId))}</h2><p>${escapeHtml(subUserName(user))}</p></div><button onclick="document.getElementById('v49AdjustmentOverlay').remove()">×</button></header><div class="v49-adjust-body"><p class="settings-compact-note">The approved difference is applied to the live value at approval time; the old total is never overwritten.</p><table><thead><tr><th>Activity</th><th>Original</th><th>New value</th><th>Difference</th></tr></thead><tbody>${[['received','Funds received'],['used','Funds used'],['handover','Handed over']].map(([key,label])=>`<tr><th>${label}</th><td>${number(a[key])}</td><td><input id="v49Adj-${key}" inputmode="decimal" data-original="${a[key]}" value="${number(a[key])}" onfocus="this.select()" oninput="formatAppNumberEditing(this);v49UpdateAdjustment('${key}')" onblur="finishAppNumberEditing(this);v49UpdateAdjustment('${key}')"></td><td id="v49Diff-${key}">${number(0)}</td></tr>`).join('')}</tbody></table><label>Explanation *<textarea id="v49AdjReason" rows="3"></textarea></label><label>Supporting report reference<input id="v49AdjReport" placeholder="Example: Incident Report IR-2026-014"></label></div><footer><button class="je-btn je-btn-secondary" onclick="document.getElementById('v49AdjustmentOverlay').remove()">Cancel</button><button class="je-btn je-btn-emerald" onclick="v49SubmitAdjustment('${userId}','${fundId}')">Submit for Review</button></footer></section>`;document.body.appendChild(overlay);
  };
  window.v49UpdateAdjustment=function(key){const input=document.getElementById(`v49Adj-${key}`),target=document.getElementById(`v49Diff-${key}`);if(!input||!target)return;const value=parseAppNumber(input.value),difference=(Number.isFinite(value)?value:0)-Number(input.dataset.original||0);target.textContent=`${difference>0?'+':''}${formatAppNumber(difference)}`;target.classList.toggle('negative-amount',difference<0)};
  window.v49OpenNotices=function(userId,fundId){const rows=adjustmentRequests.filter(row=>row.owner_id===userId&&row.fund_account_id===fundId&&row.status==='approved_applied');document.getElementById('v49NoticeOverlay')?.remove();const overlay=document.createElement('div');overlay.id='v49NoticeOverlay';overlay.className='submission-compare-overlay';overlay.innerHTML=`<section class="v49-review-dialog"><header><div><span>APPROVED ADJUSTMENTS</span><h2>${escapeHtml(accountLabelOnly(fundId))}</h2><p>Submitted comparison and approval-time application.</p></div><button onclick="document.getElementById('v49NoticeOverlay').remove()">×</button></header><div class="v49-review-scroll">${rows.map(adjustmentRecordCard).join('')}</div></section>`;document.body.appendChild(overlay)};
  window.v49SubmitAdjustment=async function(userId,fundId){const original=activity(currentUser(userId),fundId),requested={received:parseAppNumber(document.getElementById('v49Adj-received').value),used:parseAppNumber(document.getElementById('v49Adj-used').value),handover:parseAppNumber(document.getElementById('v49Adj-handover').value)},reason=document.getElementById('v49AdjReason').value.trim(),report=document.getElementById('v49AdjReport').value.trim();if(!reason){showCenterStatus('An explanation is required.',true);return}const result=await ojmDb.rpc('submit_fund_adjustment_v49',{p_owner_id:userId,p_fund_account_id:fundId,p_original:original,p_requested:requested,p_explanation:reason,p_report_reference:report});if(result.error){showCenterStatus(`Adjustment request failed: ${result.error.message}. Run SQL 14 first.`,true);return}document.getElementById('v49AdjustmentOverlay')?.remove();await loadStaffJournalsForReview();showCenterStatus('Fund adjustment submitted as a separate review item.')};

  function adjustmentCard(row){return `<section class="submission-review-card v49-adjustment-review"><div class="submission-review-header"><div class="submission-review-title"><strong>${escapeHtml(row.request_no)}</strong><span>${escapeHtml(getLiveUserName(row.owner_id))} · ${escapeHtml(accountLabelOnly(row.fund_account_id))}</span></div><div class="submission-review-actions">${row.status==='submitted'?`<button class="je-btn je-btn-emerald" onclick="v49ApproveAdjustment('${row.id}')">Approve & Apply Difference</button>`:`<span class="submission-status ${row.status}">${escapeHtml(row.status.replaceAll('_',' ').toUpperCase())}</span>`}</div></div><div class="v49-table-scroll"><table><thead><tr><th>Activity</th><th>Original</th><th>Requested</th><th>Difference</th></tr></thead><tbody>${(row.lines||[]).map(line=>`<tr><td>${escapeHtml(line.activity_key)}</td><td>${number(line.original_value)}</td><td>${number(line.requested_value)}</td><td>${number(line.difference)}</td></tr>`).join('')}</tbody></table></div>${row.status==='approved_applied'?`<div class="v49-table-scroll"><table><thead><tr><th>Activity</th><th>Current before</th><th>Difference applied</th><th>Current after</th></tr></thead><tbody>${(row.lines||[]).map(line=>`<tr><td>${escapeHtml(line.activity_key)}</td><td>${number(line.current_before)}</td><td>${number(line.difference_applied)}</td><td>${number(line.current_after)}</td></tr>`).join('')}</tbody></table></div>`:''}<p>${escapeHtml(row.explanation)} · ${escapeHtml(row.report_reference||'No online report reference')}</p></section>`}
  function adjustmentRecordCard(row){return `<details class="v49-record v49-adjustment-record"><summary><span><strong>${escapeHtml(row.request_no)}</strong><small>Fund adjustment · ${escapeHtml(row.status.replaceAll('_',' '))}</small></span><b>${row.lines?.length||0} changes</b></summary><div class="v49-record-body">${adjustmentCard(row)}</div></details>`}
  function transactionReviewCard(journal){const user=currentUser(journal.owner_id)||{},lines=journal.lines||[];return `<section class="submission-review-card"><div class="submission-review-header"><div class="submission-review-title"><strong>${escapeHtml(journal.seed_key||`SUB-${String(journal.id).slice(0,8).toUpperCase()}`)}</strong><span>${escapeHtml(getLiveUserName(journal.owner_id))} · ${lines.length} entries · ${escapeHtml(monthLabel(journal.period_start))}</span></div><div class="submission-review-actions">${journal.status==='submitted'&&(!window.Organization14229||Organization14229.info(journal).current)?`<button class="je-btn je-btn-emerald" data-permission-action1440="approve" onclick="prepareReviewJournal('${journal.id}')">${window.Organization14229&&Organization14229.info(journal).forward?'Review & Forward':'Final Approve'}</button>${!journal.review_route14229?.steps?.length?`<button class="je-btn je-btn-danger" onclick="returnReviewJournal('${journal.id}')">Return</button>`:''}`:`<span class="submission-status ${journal.status}">${escapeHtml(journal.status.toUpperCase())}</span>`}</div></div><div class="v49-table-scroll"><table><thead><tr><th>Entry ID</th><th>Date</th><th>Account</th><th>Description</th><th>Amount</th></tr></thead><tbody>${lines.map(line=>`<tr><td>${escapeHtml(line.workspace_entry_no||'—')}</td><td>${escapeHtml(formatAppDate(line.transaction_date))}</td><td>${escapeHtml(lineAccountName(line))}</td><td>${escapeHtml(line.memo)}</td><td>${number(line.amount)}</td></tr>`).join('')}</tbody></table></div>${totalsTable(user,lines)}</section>`}
  window.v49ApproveAdjustment=async function(id){showAppConfirm('Approve Fund Adjustment','Apply only the submitted difference to the current live activity? This is idempotent and cannot apply twice.','Approve & Apply',async()=>{const result=await ojmDb.rpc('approve_fund_adjustment_v49',{p_request_id:id});if(result.error){showCenterStatus(`Approval failed: ${result.error.message}`,true);return}await loadStaffJournalsForReview();showCenterStatus('Adjustment approved and the difference was applied once.')},false)};

  const previousReviewRender = window.renderUserEntryReview;
  window.renderUserEntryReview=function(){const host=document.getElementById('userEntryReviewCards');if(!host)return;const journals=(reviewStaffJournals||[]).filter(row=>row.status==='submitted'&&(!window.Organization14229||Organization14229.pending(row)));host.innerHTML=[...adjustmentRequests.filter(row=>row.status==='submitted').map(adjustmentCard),...journals.map(transactionReviewCard)].join('')||'<div class="period-empty">Nothing is waiting for review.</div>';const history=document.getElementById('userEntryHistoryCards');if(history){const prior=adjustmentRequests.filter(row=>row.status!=='submitted'),closed=(reviewStaffJournals||[]).filter(row=>row.status!=='submitted'||window.Organization14229&&!Organization14229.pending(row)),date=r=>String(r.period_start||r.date||r.submitted_at||r.created_at||'').slice(0,7),month=historyMonth14341.choose('submitted',[...prior,...closed,...(DemoAccess.submissions||[])].map(date));history.innerHTML=historyMonth14341.control('submitted',month)+[...prior.filter(r=>date(r)===month).map(adjustmentCard),...closed.filter(r=>date(r)===month).map(transactionReviewCard)].join('');historyMonth14341.bind(history,'submitted',window.renderUserEntryReview,'local');} const summary=document.getElementById('userEntryReviewSummary');if(summary)summary.textContent=`${journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length} item(s) waiting`;const badge=document.getElementById('navUserReviewCount');if(badge)badge.textContent=journals.length+adjustmentRequests.filter(row=>row.status==='submitted').length;};
  const previousLoad = window.loadStaffJournalsForReview;
  window.loadStaffJournalsForReview=async function(){await previousLoad();if(!ojmDb||!liveProfile)return;const request=await ojmDb.from('fund_adjustment_requests').select('*,lines:fund_adjustment_lines(*)').order('submitted_at',{ascending:false});if(!request.error)adjustmentRequests=request.data||[];window.renderUserEntryReview();window.renderSubUserWorkspace();};

  if(typeof APP_PERMISSION_TREE !== 'undefined' && Array.isArray(APP_PERMISSION_TREE)){
    const transactions=APP_PERMISSION_TREE.find(row=>row.id==='transactions'),subusers=APP_PERMISSION_TREE.find(row=>row.id==='sub-users');
    if(transactions&&!transactions.children.some(([id])=>id==='user-entry-review'))transactions.children.splice(4,0,['user-entry-review','Entry Submission Review']);
    if(subusers)subusers.children=subusers.children.filter(([id])=>id!=='user-entry-review');
  }
  const oldToast=window.showCenterStatus;
  window.showCenterStatus=function(message,isError=false){oldToast(message,isError);clearTimeout(showCenterStatus.timer);showCenterStatus.timer=setTimeout(()=>document.getElementById('centerStatusToast')?.classList.remove('is-visible'),5200)};
  // Both layouts are already rendered. CSS switches them without clearing a Post draft on rotation.
})();

