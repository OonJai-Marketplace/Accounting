  function receiptHeading(group) {
    const first=group.lines[0], saved=first.editor_snapshot1437;
    const general=String(saved?.memo || '').trim();
    if (saved?.mode==='double' && !saved.receiptEditor341 && rules().entryMode!=='cashbook' && general) return general;
    const memos=new Set();
    for(const line of group.lines){
      const memo=String(line.memo || '').trim();
      if(memo && memo!==general)memos.add(memo);
    }
    return [...memos].join(' · ') || general || cleanName(first.account_id);
  }
  function receiptDetails(group) {
    const first=group.lines[0],saved=first.editor_snapshot1437;
    if(saved?.receiptEditor341&&saved.mode==='double'&&saved.rows?.length&&saved.components1437?.length===group.lines.length){
      const seen=new Set();
      return saved.rows.map(row=>{
        const credit=Object.entries(row.credits||{}).find(([,amount])=>Number(amount)>0);
        const side=credit?'Credit':'Debit',currencyCode=credit?.[0]||Object.keys(row.credits||{})[0];
        const firstPart=row.splitGroup && !seen.has(row.splitGroup);
        if(row.splitGroup)seen.add(row.splitGroup);
        const ref=row.reference??saved.reference;
        const groupHeader=firstPart?'<strong>Split receipt'+(ref?' · '+esc(ref):'')+'</strong>':'';
        return groupHeader+'<p'+(row.splitGroup?' class="split-receipt-part"':'')+'><strong>'+(row.splitGroup?esc(row.splitLabel)+' · ':'')+side+' · '+esc(money(credit?credit[1]:row.dr,currencyCode))+'</strong><br>'+
          esc(row.account)+(saved.allocatedReceipt&&row.date?'<br>'+esc(dateLabel(row.date)):'')+(row.enteredAmount?'<br>Original line amount · '+esc(money(row.enteredAmount,currencyCode)):'')+(row.memo?'<br>'+esc(row.memo):'')+(!row.splitGroup&&row.reference?'<br>Reference · '+esc(row.reference):'')+'</p>';
      }).join('')+(first.reference&&!saved.splitByLine&&!saved.rows.some(r=>r.reference!=null)?'<p>Reference · '+esc(first.reference)+'</p>':'');
    }
    return group.lines.map(l=>`<p><strong>${(rules().entryMode==='cashbook'&&S.page==='entries'&&l.fund_account_id!==S.cashbookFund240?l.direction!=='in':l.direction==='in')?'Money In':'Money Out'} · ${esc(money(l.amount,l.currency_code||currency(l.fund_account_id)))}</strong><br>${accountTitle(l.fund_account_id)}<br>${l.direction==='out'?accountTitle(l.account_id)+'<br>':''}${saved?.receiptEditor341&&l.memo===saved.memo?'':esc(l.memo)}${l.reference?'<br>Reference: '+esc(l.reference):''}</p>`).join('');
  }
  window.PhoneCashbook240=id=>{if(rules().fundIds.includes(id)){S.cashbookFund240=id;render();}};
  function entries(){
    const groups=groupEntries(),pending=S.page==='history'?[]:queue();
    const visibleGroups=groups.map((group,index)=>({group,index,line:group.lines[0]}));
    const incomplete=pending.filter(q=>!groups.some(g=>g.lines.some(l=>l.editor_group1437?.startsWith(q.key+':'))));
    const timeline=visibleGroups.filter(({group})=>!incomplete.some(q=>group.lines.some(l=>q.params?.p_edit_ids?.includes(l.id))));
    for(const q of incomplete){
      const items=q.params?.p_items||[],cashbook=rules().entryMode==='cashbook';
      const relevant=cashbook?items.filter(l=>l.fund===S.cashbookFund240||l.account===S.cashbookFund240):items;
      if(cashbook&&items.length&&!relevant.length)continue;
      const date=relevant.map(l=>l.date).filter(Boolean).sort().at(-1)||q.draft.date;
      timeline.push({q,line:{transaction_date:date,created_at:q.createdAt?new Date(q.createdAt).toISOString():'',id:q.key}});
    }
    timeline.sort((a,b)=>StaffJournalView.newestLine(a.line,b.line));
    return '<h1>'+ (rules().entryMode==='cashbook'&&S.page==='entries'?'Active Cashbook':'Entries')+'</h1>'+ (rules().entryMode==='cashbook'&&S.page==='entries'?'<label>Account<select data-cashbook-fund240 onchange="PhoneCashbook240(this.value)">'+rules().fundIds.map(id=>'<option value="'+esc(id)+'" '+(id===S.cashbookFund240?'selected':'')+'>'+esc(cleanName(id))+'</option>').join('')+'</select></label>':'')+'<nav class=entry-tabs212 aria-label="Entry views"><button type=button data-page=entries aria-current="'+(S.page==='entries'?'page':'false')+'">Current</button><button type=button data-page=history aria-current="'+(S.page==='history'?'page':'false')+'">History</button></nav>'+returnedReview14348()+(S.page==='history'?monthControl()+'<input id=historySearch14359 type=search placeholder="Search this month" aria-label="Search selected month"><p class=history-summary14359>'+groups.length+' entries · '+new Set(groups.map(g=>g.batch.id)).size+' reports</p>':'')+timeline.slice(0,S.limit).map(({q,group:g,index:i,line})=>{if(q)return `<section class="card queue-item"><div class="row"><strong>Saved on this device</strong><span class="status">${q.status==='uncertain'?'Needs confirmation':q.status==='blocked'?'Needs attention':'Pending sync'}</span></div><p>${esc(dateLabel(line.transaction_date))} · ${esc(q.draft.memo)}</p><p class="muted">${esc(q.message||'Saved entries sync automatically when connected. Submission is available after all entries are confirmed.')}</p></section>`;const first=g.lines[0],canEdit=S.page==='entries'&&editable14348(g.batch)&&permission('sub-users-workspace','edit'),amounts=new Map();for(const l of g.lines){const c=l.currency_code||currency(l.fund_account_id);amounts.set(c,(amounts.get(c)||0)+Number(l.amount));}return `<details class="entry" data-group="${esc(first.id)}" data-batch-description="${esc(first.editor_snapshot1437?.memo||'')}"><summary class="entry-heading"><span class="entry-copy"><small>${first.editor_snapshot1437?.splitByLine?'Split receipt · ':''}${esc(first.transaction_date)}${S.page==='history'&&first.workspace_entry_no?' · '+esc(window.submissionHistoryIds.entry(first)):rules().entryMode==='cashbook'&&S.page==='entries'?' · '+esc(first.workspace_entry_no||''):''}</small><b>${esc(receiptHeading(g))}</b></span><span class="entry-value"><span class="amount">${[...amounts].map(([c,n])=>esc(money(n,c))).join(' · ')}</span><span class="status ${esc(g.batch.status)}">${esc(g.batch.status)}</span></span><span class="entry-chevron" aria-hidden="true">⌄</span></summary><div class="entry-body">${receiptDetails(g)}<button type="button" class="scan-support-link208" data-scan-line208="${esc(first.id)}">Documents</button>${S.page==='history'?submissionReconciliation14345.summary(g.batch):''}${g.batch.return_note?'<p>Review note: '+esc(g.batch.return_note)+'</p>':''}${canEdit?`<div class="actions no-print">${action('edit','Edit',`data-index="${i}"`)}${permission('sub-users-workspace','void')?action('void','Void',`data-index="${i}"`):''}</div>`:''}</div></details>`;}).join('')+(timeline.length>S.limit?action('more','Show more'):'')+(!timeline.length?empty(S.data.months?.[S.month]?'No saved entries in this period.':'This period has not downloaded yet.'):'')+commonActions();}
  function render(force=true) {
    paintConnection();if(!S.owner)return;
    if(S.area!=='users')return;
    if(!permission('sub-users-workspace')){$('workspace').innerHTML=empty(S.error||'Checking your account access…')+action('refresh','Retry loading','',true)+action('signout','Sign out');return;}
    if(!force && S.page==='post')return;
    const previousLedger=$('workspace').querySelector('[data-phone-ledger]');
    const content={home,accounts:()=>'<h1>My accounts</h1><section class="card" data-standing379></section>'+otherAssignedFunds()+'<details class="card" data-phone-ledger><summary>Posted company ledger</summary><label>Ledger account<select aria-label="Ledger account"></select></label><label>Period<input type="month" aria-label="Ledger month"></label><button type="button" class="btn">Refresh ledger</button><div data-ledger-result role="status"></div></details>',post,entries,history:entries};
    $('workspace').innerHTML=content[S.page]();phoneStanding();mountPhoneLedger(previousLedger);
    const m=$('month');if(m)m.onchange=()=>{if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.value))return;S.month=m.value;S.limit=30;rememberLocation();void persist(S.owner,{month:S.month});render();void loadMonth();};
    const search=$('historySearch14359');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();$('workspace').querySelectorAll('details.entry').forEach(row=>row.hidden=!!q&&!row.textContent.toLowerCase().includes(q)&&!row.dataset.batchDescription.toLowerCase().includes(q))};
    const form=$('postForm');if(form){form.addEventListener('beforeinput',skipGroupingComma);form.addEventListener('compositionend',captureDraft);form.addEventListener('input',captureDraft);form.addEventListener('change',captureDraft);form.onsubmit=e=>{e.preventDefault();void saveEntry();};updateValidation();}
  }
