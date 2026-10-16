  function workspaceHeader(user) {
    return `<header class="v49-user-header"><div><h2>${escapeHtml(subUserAccountTitle14229(user))}</h2><p>Sub-user Account / ${escapeHtml(monthLabel(appLocalDate().slice(0,7)))}</p></div></header>`;
  }
  function dashboard(user) {
    const totals = new Map();
    const rules = workspaceRules(user);
    const lines = draftLines(user.id);
    for(const id of rules.fundIds){const currency=AccountingStore.accounts.find(a=>String(a.id)===String(id))?.currency||'Unknown currency';totals.set(currency,(totals.get(currency)||0)+remaining(user,id));}
    const tracked=[...totals].map(([currency,value])=>escapeHtml(number(value)+' '+currency)).join(' · ')||number(0);
    const reviews = journalRows(user.id).filter(row => row.status === 'submitted').length;
    const alerts = rules.fundIds.filter(id => remaining(user,id) < 0).length + adjustmentRequests.filter(row => row.owner_id === user.id && row.status === 'approved_applied').length;
    return `<section class="v49-dashboard v49-card"><div class="v49-hero"><span>Tracked remaining</span><strong>${tracked}</strong><small>Across ${rules.fundIds.length} assigned account${rules.fundIds.length===1?'':'s'}</small></div><div class="v49-stat-grid"><button onclick="v49SetView('${user.id}','accounts')"><i>${icon('fund')}</i><strong>${rules.fundIds.length} <span>Assigned Funds</span></strong></button><button onclick="v49SetView('${user.id}','entries')"><i>${icon('ready')}</i><strong>${lines.length} <span>Ready Entries</span></strong></button><button onclick="v49OpenReview('${user.id}')"><i>${icon('review')}</i><strong class="red">${reviews} <span>Under Review</span></strong></button><button onclick="v49SetView('${user.id}','accounts')" class="${alerts?'attention':''}"><i>${icon('alert')}</i><strong>${alerts} <span>Alerts</span></strong></button></div></section>${totalsTable(user, lines, 'v49-home-totals')}`;
  }
  function accountsView(user) {
    const rules = workspaceRules(user);
    return `<section class="v49-card"><header><div><h3>Assigned Main Accounts</h3><p>Received, used, handed over, and remaining.</p></div></header><div class="v49-funds">${rules.fundIds.map(id => { const a=activity(user,id), balance=remaining(user,id), notices=adjustmentRequests.filter(row=>row.owner_id===user.id&&row.fund_account_id===id&&row.status==='approved_applied'); return `<article class="${balance<0?'attention':''}"><div class="v49-fund-name"><span>Main account</span><strong>${escapeHtml(accountLabelOnly(id))}</strong><div class="v49-fund-buttons">${notices.length?`<button class="notice" onclick="v49OpenNotices('${user.id}','${id}')">✓ ${notices.length}</button>`:''}<button onclick="v49OpenAdjustment('${user.id}','${id}')">Adjust</button></div></div><div><span>Funds received</span><b>${number(a.received)}</b></div><div><span>Funds used</span><b>${number(a.used)}</b></div><div><span>Handed over</span><b>${number(a.handover)}</b></div><div><span>Tracked remaining</span><b class="${balance<0?'negative-amount':''}">${escapeHtml(number(balance)+' '+(AccountingStore.accounts.find(a=>String(a.id)===String(id))?.currency||'Unknown currency'))}</b></div></article>`; }).join('') || '<div class="period-empty">No main account is assigned.</div>'}</div></section>`;
  }
  function options(ids, selected, placeholder) {
    return `<option value="">${placeholder}</option>${ids.map(id => `<option value="${escapeHtml(id)}" ${String(id)===String(selected)?'selected':''}>${escapeHtml(accountLabelOnly(id))}</option>`).join('')}`;
  }
