/* The assigned ledger RPC calculates balances in posting order. Reverse only the finished rows. */
window.StaffJournalView=(()=>{
  const descending=(a,b)=>String(b||'').localeCompare(String(a||''));
  function newestLine(a,b){
    return descending(a.transaction_date,b.transaction_date)||descending(a.created_at,b.created_at)||
      Number(b.line_no||0)-Number(a.line_no||0)||descending(a.id,b.id);
  }
  const ids=new Intl.Collator('en',{numeric:true});
  function compareEntry(a,b){
    const left=a.workspace_entry_no||'',right=b.workspace_entry_no||'';
    return ids.compare(left,right)||Number(a.line_no||0)-Number(b.line_no||0)||ids.compare(a.id||'',b.id||'');
  }
  function groupReceipts(rows,legacyKey){
    const parents=new Set(rows.map(l=>l.receipt_parent_id).filter(Boolean));
    const groups=new Map();
    for(const line of rows){
      const root=line.receipt_parent_id || (parents.has(line.id)?line.id:null);
      const key=JSON.stringify([line.staff_journal_id,root||legacyKey(line)]);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(line);
    }
    for(const lines of groups.values()){
      if(parents.has(lines[0].id)||lines[0].receipt_parent_id){
        lines.sort((a,b)=>Number(!!a.receipt_parent_id)-Number(!!b.receipt_parent_id)||compareEntry(a,b));
      }
    }
    return [...groups.values()];
  }
  function activeGroups(rows,ascending=false){
    const entries=groupReceipts(rows,line=>{
      // Older double-entry receipts share an editor group. Ordinary cashbook slips
      // entered in bulk can share an editor group while owning separate numbers.
      const saved=line.editor_snapshot1437;
      const receipt=saved?.mode==='double'||saved?.receiptEditor341||saved?.splitByLine||saved?.groupedReceipt;
      return (receipt&&line.editor_group1437)||line.workspace_entry_no||line.id;
    });
    for(const lines of entries)if(!lines.some(l=>l.receipt_parent_id))lines.sort(compareEntry);
    return entries.sort((a,b)=>ascending?compareEntry(a[0],b[0]):compareEntry(b[0],a[0]));
  }
  function validSnapshot(group){
   const d=group[0]?.editor_snapshot1437;if(!Array.isArray(d?.components1437))return null;
   const dates=new Set(group.map(l=>l.transaction_date));
   const normalize=rows=>rows.map(r=>JSON.stringify([r.date,r.direction,r.fund,r.account,Number(r.amount),r.memo,r.reference||'',r.kind||'',r.fx_rate_lak||null])).sort().join('|');
   const actual=group.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo,reference:l.reference,kind:l.entry_kind,fx_rate_lak:l.fx_rate_lak}));
   return normalize(actual)===normalize(d.components1437.filter(r=>dates.has(r.date)))?d:null;
  }
  function newestReport(a,b){
    const date=r=>r.approved_at||r.reviewed_at||r.submitted_at||r.updated_at||r.created_at||r.period_start;
    return descending(date(a),date(b))||descending(a.id||a.journal_id,b.id||b.journal_id);
  }
  function balance(value,format){
    return Number(value)<0?'('+format(Math.abs(value))+')':format(Number(value)||0);
  }
  async function ledgerPeriod(read,owner,account,period){
    let rows=[],data;
    do{
      data=await read({p_owner:owner,p_account:account,p_from:period.from,p_to:period.to,p_offset:rows.length});
      if(!data?.accounts?.some(a=>a.id===account))throw Error('This ledger account is no longer assigned.');
      if(!Array.isArray(data.rows))throw Error('The ledger rows were incomplete.');
      rows.push(...data.rows);
    }while(data.rows.length===500);
    if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('The ledger changed while loading. Refresh the ledger.');
    return {...period,rows:rows.reverse(),opening:data.opening,closing:data.closing};
  }
  return {groupReceipts,activeGroups,validSnapshot,newestLine,newestReport,balance,ledgerPeriod};
})();

/* Only the visible workspace listens for changes. The revision contains no amounts. */
window.WorkingStanding379=(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cents=n=>Math.round(Number(n||0)*100);
 let active=null;
 function projected(data,requests){
  const rows=new Map(data.accounts.map(a=>[a.id,{...a,available:cents(a.opening)+cents(a.received),out:cents(a.used),pending:[]}]));
  const seen=new Set(),replaced=new Set(),stages={draft:'Unsubmitted',returned:'Returned',submitted:'Submitted',approved:'Approved'};
  for(const line of data.lines){
   const row=rows.get(line.account);
   if(row&&stages[line.status]&&line.counted!==false&&cents(line.amount)){
    row.pending.push({...line,transaction_date:line.date,delta:cents(line.amount),label:stages[line.status]});
   }
  }
  for(const p of requests){
   if(!p?.p_key||seen.has(p.p_key))continue;
   seen.add(p.p_key);
   if(data.lines.some(l=>l.group?.startsWith(p.p_key+':')))continue;
   for(const l of data.lines){
    if(!p.p_edit_ids?.includes(l.id)||replaced.has(l.id+'/'+l.account)||l.counted===false)continue;
    replaced.add(l.id+'/'+l.account);
    const a=rows.get(l.account);
    if(a){
     a.available-=Math.max(cents(l.amount),0);a.out-=Math.max(-cents(l.amount),0);
     a.pending=a.pending.filter(item=>item.id!==l.id);
    }
   }
   for(const [index,l] of (p.p_items||[]).entries()){
    if(l.fund===l.account)continue;
    const n=cents(l.amount)*(l.direction==='in'?1:-1);
    for(const [id,delta] of [[l.fund,n],[l.account,-n]]){
     const a=rows.get(id);
     if(!a||!delta||l.date>data.asOf||(a.start?l.date<=a.start:l.date<data.asOf.slice(0,4)+'-01-01'))continue;
     a.available+=Math.max(delta,0);a.out+=Math.max(-delta,0);
     a.pending.push({id:p.p_key+':'+index,transaction_date:l.date,line_no:index+1,created_at:p.savedAt||'',
      memo:l.memo,delta,label:['attention','blocked'].includes(p.deviceStatus)?'Device save · Needs attention':'Saved on device'});
    }
   }
  }
  return [...rows.values()];
 }
 function breakdown(a,amount,date){
  const net=a.available-a.out;
  let unsubmitted=0,submitted=0;
  for(const item of a.pending){
   if(item.label==='Submitted'||item.label==='Approved')submitted+=item.delta;
   else unsubmitted+=item.delta;
  }
  const base=net-unsubmitted-submitted;
  let html='<dl class="fund-breakdown"><dt>Before pending entries</dt><dd>'+amount(base)+'</dd>'+
   '<dt>Submitted, awaiting posting</dt><dd>'+amount(submitted)+'</dd><dt>Unsubmitted, including device saves</dt><dd>'+amount(unsubmitted)+'</dd></dl>';
  if(!a.pending.length)return html;
  let running=net;
  const details=a.pending.sort(StaffJournalView.newestLine).map(item=>{
   const after=running;running-=item.delta;
   return '<li><div><b>'+escape(item.memo||item.label)+'</b><small>'+escape(date(item.transaction_date))+' · '+escape(item.label)+'</small></div>'+
    '<div><b>'+amount(item.delta)+'</b><small>Remaining '+amount(after)+'</small></div></li>';
  }).join('');
  return html+'<details data-fund-detail="'+escape(a.id)+'"><summary>Pending journal lines ('+a.pending.length+')</summary><ul class="fund-pending">'+details+'</ul></details>';
 }
 function panel(s){
  const host=s.host();if(!host||!s.current())return;
  const title=s.cashier?'Cash remaining to surrender':'Remaining funds';
  let html='<h3>'+title+'</h3>';
  if(s.data){
   const rows=projected(s.data,s.queue());
   html+='<div class="personal-metrics1437">'+rows.map(a=>{
    const amount=n=>escape(StaffJournalView.balance(n,x=>s.money(x/100,a.currency)));
    return '<article class="card currency-coded14231" data-currency-code="'+escape(a.currency)+'"><small>'+escape(a.name)+'</small><strong>'+amount(a.available-a.out)+'</strong><p>Opening and receipts '+amount(a.available)+' · Paid or handed over '+amount(a.out)+'</p>'+
      (s.data.detailVersion?breakdown(a,amount,s.date):'')+
      (a.settledThrough&&a.settled?'<p>Carried forward '+amount(cents(a.opening))+' · Handed over by '+escape(s.date(a.settledThrough))+' '+amount(cents(a.settled))+'</p>':'')+'</article>';
   }).join('')+'</div>';
   if(!rows.length)html+='<p>No tracked accounts are assigned.</p>';
  }else html+='<p role="status">'+(s.failed?'Balance unavailable.':'Loading balances…')+'</p>';
  if(s.failed&&s.data)html+='<small>Showing the last downloaded balance.</small>';
  if(s.failed)html+='<button type="button" class="je-btn je-btn-secondary" data-standing-retry>Refresh balance</button>';
  if(host._standingHtml!==html){const open=new Set([...(s.lastHost||host).querySelectorAll('[data-fund-detail][open]')].map(el=>el.dataset.fundDetail));host.innerHTML=html;host._standingHtml=html;s.lastHost=host;for(const el of host.querySelectorAll('[data-fund-detail]'))el.open=open.has(el.dataset.fundDetail);const retry=host.querySelector('[data-standing-retry]');if(retry)retry.onclick=()=>refresh(s)}
 }
 async function refresh(s){
  if(active!==s)return;
  if(!s.current()){close();return}
  if(s.openingTimer){clearTimeout(s.openingTimer);s.openingTimer=null;s.openingRead=true;}
  if(s.loading){s.again=true;return}
  s.loading=true;
  try{
   const data=await s.read();
   if(active!==s||!s.current())return;
   if(!Array.isArray(data?.accounts)||!Array.isArray(data?.lines))throw Error('Incomplete balance response');
   s.data=data;s.failed=false;await s.remember?.(data);
  }catch(error){if(active===s){s.failed=true;if(['42501','PGRST301','PGRST302'].includes(error.code))s.data=null}}
  finally{s.loading=false;if(active===s){panel(s);if(s.again){s.again=false;void refresh(s)}}}
 }
 function close(){const s=active;active=null;if(s?.openingTimer)clearTimeout(s.openingTimer);if(s?.channel)s.client.removeChannel(s.channel)}
 function open(options){
  if(active?.owner===options.owner&&active.actor===options.actor&&active.client===options.client&&active.current()){
   Object.assign(active,options);panel(active);return;
  }
  close();const s=active={...options,data:options.cached||null};panel(s);
  if(s.client.channel){
   // Establish the event boundary before taking the first snapshot. This avoids
   // two opening reads without losing a save in the subscribe/read gap.
   // One bounded fallback keeps cached/REST balances usable if the live socket
   // is slow. A later successful subscription then needs its own catch-up read.
   s.openingTimer=setTimeout(()=>{s.openingTimer=null;if(active===s){s.openingRead=true;void refresh(s)}},400);
   s.channel=s.client.channel('working-funds-'+s.owner)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspace_fund_revision379',filter:'owner_id=eq.'+s.owner},()=>{if(s.subscribed)void refresh(s)})
    .subscribe(status=>{if(active!==s)return;if(status==='SUBSCRIBED'){if(s.subscribed)return;s.subscribed=true;clearTimeout(s.openingTimer);s.openingTimer=null;s.openingRead=true;void refresh(s);}else if(['CLOSED','TIMED_OUT','CHANNEL_ERROR'].includes(status)){s.subscribed=false;clearTimeout(s.openingTimer);s.openingTimer=null;s.failed=true;panel(s);if(!s.openingRead){s.openingRead=true;void refresh(s)}}});
  }else void refresh(s);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){close()}else window.dispatchEvent(new Event('standing-visible379'))});
 window.addEventListener('online',()=>{if(active)void refresh(active)});
 return {open,close,projected,refresh:()=>active&&refresh(active),paint:()=>active&&panel(active)};
})();

/* Phone drafts use the existing atomic personal-journal RPC and snapshot format. */
(function (root) {
  'use strict';
  const epsilon = 0.00000001;
  const number = value => {
    const n = Number(String(value ?? '').replaceAll(',', ''));
    if (!Number.isFinite(n) || !Number.isSafeInteger(Math.round(n * 100)) || n < 0 || Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) throw Error('Enter a valid, non-negative amount.');
    return n;
  };
  function assignmentMessage(rules, accounts) {
    if (rules.directions.length === 1 && rules.directions[0] === 'out') {
      const funds = accounts.filter(a => rules.fundIds.includes(a.id)).map(a => a.code + ' ' + a.name).join(' / ');
      if (funds) return 'DR and CR balance. This account allows Money Out: debit an assigned expense or category and credit ' + funds + '.';
    }
    return 'DR and CR balance. Check the assigned funds, category accounts and permitted payment directions.';
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
    const day = new Date(value + 'T00:00:00Z');
    return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value;
  }
  function balanceMessage(currency, debit, credit) {
    const format = n => n.toLocaleString('en-US', {maximumFractionDigits: 2});
    const gap = Math.round((debit - credit) * 100) / 100;
    return 'DR ' + format(debit) + ' / CR ' + format(credit) + ' ' + currency +
      (gap ? ' · Add ' + (gap > 0 ? 'CR ' : 'DR ') + format(Math.abs(gap)) + ' ' + currency : ' · Balanced');
  }

  // A single assigned fund payment can cover several dated expense debits.
  // Separate receipts with their own funding lines still balance independently.
  function sharedPayment(draft, lines, accounts, rules) {
    if (draft.mode !== 'double' || !rules.directions.includes('out')) return null;
    let fundLine, currency, totalCents = 0;
    const expenses = [];
    for (const line of lines) {
      const account = accounts.find(a => a.id === line.account);
      if (!account || !validDate(line.date ?? draft.date) || (currency && account.currency !== currency)) return null;
      currency = account.currency;
      const debit = number(line.debit), credit = number(line.credit);
      if (debit && !credit && rules.entryIds.includes(account.id)) {
        expenses.push(line);
        totalCents += Math.round(debit * 100);
      } else if (credit && !debit && !fundLine && rules.fundIds.includes(account.id)) {
        fundLine = line;
      } else return null;
    }
    if (!fundLine || expenses.length < 2 || expenses.some(line => line.account === fundLine.account)) return null;
    return {fundLine, expenses, totalCents, currency};
  }
  function datedPaymentParts(draft, plan, accounts, rules) {
    const {fundLine, expenses, totalCents, currency} = plan;
    const credit = number(fundLine.credit);
    if (!Number.isSafeInteger(totalCents)) throw Error('Expense total exceeds the supported range.');
    if (totalCents !== Math.round(credit * 100)) throw journalMismatch(balanceMessage(currency, totalCents / 100, credit));
    const days = new Map();
    for (const row of expenses) {
      const date = row.date ?? draft.date;
      if (!days.has(date)) days.set(date, []);
      days.get(date).push(row);
    }
    return [...days].map(([date, rows]) => {
      const slice = rows.reduce((cents, row) => cents + Math.round(number(row.debit) * 100), 0) / 100;
      const part = prepare({...draft, date, lines:[...rows, {...fundLine, date, credit:slice}]}, accounts, rules);
      part.snapshot.sharedFundCredit = {...fundLine, date:fundLine.date ?? draft.date};
      return part;
    });
  }
  function journalMismatch(message) {
    return Object.assign(Error(message), {code:'STAFF_JOURNAL_MATCH'});
  }

  // Use integer cents and a bipartite flow for compound journals. A transfer
  // account may be both a fund and a category. An earlier tentative match can
  // then need to move to leave a valid counterpart for a later line.
  function matchJournal(dr, cr, rules, accounts, record) {
    const end=dr.length+cr.length+1, graph=Array.from({length:end+1},()=>[]);
    function edge(from,to,capacity) {
      const forward={to,capacity}, back={to:from,capacity:0};
      forward.back=back;back.back=forward;
      graph[from].push(forward);graph[to].push(back);
      return forward;
    }
    dr.forEach((d,i)=>edge(0,i+1,Math.round(d.left*100)));
    cr.forEach((c,j)=>edge(dr.length+j+1,end,Math.round(c.left*100)));
    const matches=[];
    dr.forEach((d,i)=>cr.forEach((c,j)=>{
      if(d.account.id===c.account.id)return;
      const out=rules.directions.includes('out') && rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id);
      const incoming=rules.directions.includes('in') && rules.fundIds.includes(d.account.id) && rules.entryIds.includes(c.account.id);
      if(out || incoming)matches.push({d,c,out,link:edge(i+1,dr.length+j+1,Math.round(Math.min(d.left,c.left)*100))});
    }));
    for (;;) {
      const via=new Map([[0,null]]), queue=[0];
      for(let i=0;i<queue.length && !via.has(end);i++) {
        for(const e of graph[queue[i]]) if(e.capacity && !via.has(e.to)){via.set(e.to,e);queue.push(e.to);}
      }
      if(!via.has(end))break;
      let amount=Infinity;
      for(let node=end;node;node=via.get(node).back.to)amount=Math.min(amount,via.get(node).capacity);
      for(let node=end;node;node=via.get(node).back.to){const e=via.get(node);e.capacity-=amount;e.back.capacity+=amount;}
    }
    if(graph[0].some(e=>e.capacity))throw journalMismatch(assignmentMessage(rules,accounts));
    for(const {d,c,out,link} of matches) if(link.back.capacity)record(d,c,out,link.back.capacity/100);
  }

  function prepare(data, accounts, rules, onAllocation) {
    const memo = String(data.memo || '').trim();
    if (!memo) throw Error('Add the General Description / Memo.');
    if (!validDate(data.date)) throw Error('Choose a transaction date.');
    const receiptDate = line => {
      // Earlier cashbook callers supplied row dates without a Multiple dates flag.
      const useRow = data.multiple || (data.multiple == null && data.mode !== 'double');
      const date = useRow ? (line.date ?? data.date) : data.date;
      if (!validDate(date)) throw Error('Choose a valid date for each receipt.');
      return date;
    };
    const permitted = new Set([...rules.fundIds, ...rules.entryIds, rules.counterpart].map(String));
    const account = id => {
      const a = accounts.find(a => String(a.id || a.code) === String(id));
      if (!a || a.isPosting === false || a.is_posting === false || a.active === false || a.isActive === false || a.is_active === false || a.currency === 'NA' || !permitted.has(String(a.id))) throw Error('Choose an account assigned to this user in Settings.');
      return a;
    };
    const items = [], rows = [], single = [], splitParts = {};
    const add = (direction, fund, affected, value, description, date = data.date, reference = data.reference || '', split) => {
      if (!rules.directions.includes(direction)) throw Error(direction === 'in' ? 'Money In is not enabled for this user.' : 'Money Out is not enabled for this user.');
      if (!rules.fundIds.includes(fund)) throw Error('Choose an assigned fund account.');
      if (!rules.entryIds.includes(affected)) throw Error('Choose a category account enabled in Settings.');
      if (fund === affected) throw Error('The fund and affected account must be different.');
      if (account(fund).currency !== account(affected).currency) throw Error('Currency mismatch: the fund and affected account must use the same currency.');
      if (data.receiptEditor341 && split?.splitGroup) splitParts[items.length] = {group:split.splitGroup, label:split.splitLabel, reference:split.reference ?? data.reference ?? ''};
      items.push({direction, fund, account: affected, amount: value, date, memo: description || memo, reference, kind: direction === 'in' ? 'collection' : 'payment'});
    };
    if (data.mode === 'double') {
      const groups = new Map();
      for (const line of data.lines || []) {
        const debit = number(line.debit), credit = number(line.credit);
        if (!line.account && !debit && !credit && !line.memo) {
          if (data.multiple && line.date) throw Error('Complete or remove the empty journal line for ' + receiptDate(line) + '.');
          continue;
        }
        const a = account(line.account);
        if ((debit > 0) === (credit > 0)) throw Error('Enter either Debit or Credit on each line, with a positive amount.');
        const date = receiptDate(line), key = onAllocation ? a.currency : date + '/' + a.currency;
        if (!groups.has(key)) groups.set(key, {date, currency:a.currency, dr:[], cr:[]});
        groups.get(key)[debit ? 'dr' : 'cr'].push({line,account: a, left: debit || credit, memo: line.memo || '', reference: line.reference, split:line.splitGroup ? line : null});
        rows.push({...(line.splitGroup ? {splitGroup:line.splitGroup,splitNumber:line.splitNumber,splitLabel:line.splitLabel} : {}), account: a.code + ' — ' + a.name, memo: line.memo || '', ...(line.reference==null?{}:{reference:line.reference}), dr: debit || '', credits: {[a.currency]: credit || ''}, date});
      }
      for (const g of groups.values()) {
        const debit = g.dr.reduce((n,l) => n + l.left, 0), credit = g.cr.reduce((n,l) => n + l.left, 0);
        if (Math.abs(debit-credit) > epsilon) throw journalMismatch((data.multiple && !onAllocation ? g.date + ' · ' : '') + 'Entry is unbalanced · ' + balanceMessage(g.currency, debit, credit));
        if(onAllocation) {
          matchJournal(g.dr,g.cr,rules,accounts,(d,c,out,value)=>{
            const category=out?d:c, fund=out?c:d;
            add(out?'out':'in',fund.account.id,category.account.id,value,[...new Set([d.memo,c.memo].filter(Boolean))].join(' · ') || memo,
              receiptDate(category.line), category.reference ?? fund.reference ?? data.reference ?? '',category.split || fund.split);
            onAllocation(d.line,c.line,category.line,value);
          });
          continue;
        }
        // Match fund payments and collections exactly as the desktop personal journal does.
        for (const d of g.dr) for (const c of g.cr) {
          if (d.left < epsilon || c.left < epsilon) continue;
          const outgoing = rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id) && rules.directions.includes('out');
          const incoming = rules.fundIds.includes(d.account.id) && rules.entryIds.includes(c.account.id) && rules.directions.includes('in');
          if (d.account.id===c.account.id || (!outgoing && !incoming)) continue;
          const value = Math.min(d.left, c.left);
          add(outgoing ? 'out' : 'in', outgoing ? c.account.id : d.account.id, outgoing ? d.account.id : c.account.id, value, [...new Set([d.memo, c.memo].filter(Boolean))].join(' · ') || memo, g.date, (outgoing?d.reference??c.reference:c.reference??d.reference)??data.reference??'', outgoing ? d.split || c.split : c.split || d.split);
          d.left = Math.round((d.left-value)*100)/100; c.left = Math.round((c.left-value)*100)/100;
        }
        if ([...g.dr, ...g.cr].some(l => l.left > epsilon)) throw journalMismatch(assignmentMessage(rules, accounts));
      }
    } else {
      for (const l of data.single || []) {
        const amount = number(l.amount);
        if (!l.source && !l.affected && !amount && !l.memo) {
          if (data.multiple && l.date) throw Error('Complete or remove the empty receipt for ' + receiptDate(l) + '.');
          continue;
        }
        if (!(amount > 0)) throw Error('Enter a positive amount on each entry line.');
        const date=receiptDate(l), description=data.receiptEditor341 ? String(l.description || '').trim() || memo : l.description===undefined?memo:String(l.description).trim();
        if (!description) throw Error('Add the General Description for each entry.');
        add(l.direction, l.source, l.affected, amount, data.receiptEditor341 ? String(l.memo||'').trim() || description : [description,l.memo].filter(Boolean).join(' — '),date,l.reference??data.reference??'', l);
        single.push({...l, amount: String(amount), date, description});
      }
    }
    if (!items.length) throw Error('Enter at least one complete transaction.');
    return {items, snapshot: {...(Object.keys(splitParts).length ? {splitParts} : {}), ...(data.receiptEditor341?{receiptEditor341:true}:{}), mode: data.mode === 'double' ? 'double' : 'single', date: data.date, memo, reference: data.reference || '', multiple: !!data.multiple || items.some(item=>item.date!==data.date), rows, single, owner: '', journal: '', local: false, editIds: data.editIds || [], requestKey: data.requestKey, components1437: items}};
  }
  const api = {prepare, sharedPayment, datedPaymentParts, balanceMessage, assignmentMessage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StaffEntry14225 = api;
})(typeof window === 'undefined' ? globalThis : window);
