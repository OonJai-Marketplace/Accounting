/* Only the visible workspace listens for changes. The revision contains no amounts. */
window.WorkingStanding379=(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cents=n=>Math.round(Number(n||0)*100);
 let active=null;
 function projected(data,requests){
  const rows=new Map(data.accounts.map(a=>[a.id,{...a,available:cents(a.opening)+cents(a.received),out:cents(a.used)}]));
  const seen=new Set(),replaced=new Set();
  function apply(id,change){const a=rows.get(id);if(a){a.available+=Math.max(change,0);a.out+=Math.max(-change,0)}}
  for(const p of requests){
   if(!p?.p_key||seen.has(p.p_key))continue;
   seen.add(p.p_key);
   if(data.lines.some(l=>l.group?.startsWith(p.p_key+':')))continue;
   for(const l of data.lines){
    if(!p.p_edit_ids?.includes(l.id)||replaced.has(l.id+'/'+l.account))continue;
    replaced.add(l.id+'/'+l.account);
    const a=rows.get(l.account);if(a){a.available-=Math.max(cents(l.amount),0);a.out-=Math.max(-cents(l.amount),0)}
   }
   for(const l of p.p_items||[]){
    const n=cents(l.amount)*(l.direction==='in'?1:-1);
    for(const [id,delta] of [[l.fund,n],[l.account,-n]]){
     const a=rows.get(id);if(a&&l.date<=data.asOf&&(!a.start||l.date>a.start))apply(id,delta);
    }
   }
  }
  return [...rows.values()];
 }
 function panel(s){
  const host=s.host();if(!host||!s.current())return;
  const title=s.cashier?'Cash remaining to surrender':'Remaining funds';
  let html='<h3>'+title+'</h3>';
  if(s.data){
   const rows=projected(s.data,s.queue());
   html+='<div class="personal-metrics1437">'+rows.map(a=>{
    const amount=n=>escape(s.money(n/100,a.currency));
    return '<article class="card currency-coded14231" data-currency-code="'+escape(a.currency)+'"><small>'+escape(a.name)+'</small><strong>'+amount(a.available-a.out)+'</strong><p>Available '+amount(a.available)+' · Paid or handed over '+amount(a.out)+'</p>'+
      (a.settledThrough&&a.settled?'<p>Carried forward '+amount(cents(a.opening))+' · Handed over by '+escape(s.date(a.settledThrough))+' '+amount(cents(a.settled))+'</p>':'')+'</article>';
   }).join('')+'</div>';
   if(!rows.length)html+='<p>No tracked accounts are assigned.</p>';
  }else html+='<p role="status">'+(s.failed?'Balance unavailable.':'Loading balances…')+'</p>';
  if(s.failed&&s.data)html+='<small>Showing the last downloaded balance.</small>';
  if(s.failed)html+='<button type="button" class="je-btn je-btn-secondary" data-standing-retry>Refresh balance</button>';
  if(host._standingHtml!==html){host.innerHTML=html;host._standingHtml=html;const retry=host.querySelector('[data-standing-retry]');if(retry)retry.onclick=()=>refresh(s)}
 }
 async function refresh(s){
  if(active!==s)return;
  if(!s.current()){close();return}
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
 function close(){const s=active;active=null;if(s?.channel)s.client.removeChannel(s.channel)}
 function open(options){
  if(active?.owner===options.owner&&active.actor===options.actor&&active.client===options.client&&active.current()){
   Object.assign(active,options);panel(active);return;
  }
  close();const s=active={...options,data:options.cached||null};panel(s);void refresh(s);
  if(s.client.channel){
   s.channel=s.client.channel('working-funds-'+s.owner)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspace_fund_revision379',filter:'owner_id=eq.'+s.owner},()=>refresh(s))
    .subscribe(status=>{if(active!==s)return;if(status==='SUBSCRIBED')void refresh(s);else if(['CLOSED','TIMED_OUT','CHANNEL_ERROR'].includes(status)){s.failed=true;panel(s)}});
  }
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
    if (totalCents !== Math.round(credit * 100)) throw Error(balanceMessage(currency, totalCents / 100, credit));
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
  function prepare(data, accounts, rules) {
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
    const items = [], rows = [], single = [];
    const add = (direction, fund, affected, value, description, date = data.date, reference = data.reference || '') => {
      if (!rules.directions.includes(direction)) throw Error(direction === 'in' ? 'Money In is not enabled for this user.' : 'Money Out is not enabled for this user.');
      if (!rules.fundIds.includes(fund)) throw Error('Choose an assigned fund account.');
      if (!rules.entryIds.includes(affected)) throw Error('Choose a category account enabled in Settings.');
      if (fund === affected) throw Error('The fund and affected account must be different.');
      if (account(fund).currency !== account(affected).currency) throw Error('Currency mismatch: the fund and affected account must use the same currency.');
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
        const date = receiptDate(line), key = date + '/' + a.currency;
        if (!groups.has(key)) groups.set(key, {date, currency:a.currency, dr:[], cr:[]});
        groups.get(key)[debit ? 'dr' : 'cr'].push({account: a, left: debit || credit, memo: line.memo || '', reference: line.reference});
        rows.push({account: a.code + ' — ' + a.name, memo: line.memo || '', ...(line.reference==null?{}:{reference:line.reference}), dr: debit || '', credits: {[a.currency]: credit || ''}, date});
      }
      for (const g of groups.values()) {
        const debit = g.dr.reduce((n,l) => n + l.left, 0), credit = g.cr.reduce((n,l) => n + l.left, 0);
        if (Math.abs(debit-credit) > epsilon) throw Error((data.multiple ? g.date + ' · ' : '') + 'Entry is unbalanced · ' + balanceMessage(g.currency, debit, credit));
        // Match fund payments and collections exactly as the desktop personal journal does.
        for (const d of g.dr) for (const c of g.cr) {
          if (d.left < epsilon || c.left < epsilon) continue;
          const outgoing = rules.fundIds.includes(c.account.id) && rules.entryIds.includes(d.account.id) && rules.directions.includes('out');
          const incoming = rules.fundIds.includes(d.account.id) && rules.entryIds.includes(c.account.id) && rules.directions.includes('in');
          if (!outgoing && !incoming) continue;
          const value = Math.min(d.left, c.left);
          add(outgoing ? 'out' : 'in', outgoing ? c.account.id : d.account.id, outgoing ? d.account.id : c.account.id, value, [...new Set([d.memo, c.memo].filter(Boolean))].join(' · ') || memo, g.date, (outgoing?d.reference??c.reference:c.reference??d.reference)??data.reference??'');
          d.left -= value; c.left -= value;
        }
        if ([...g.dr, ...g.cr].some(l => l.left > epsilon)) throw Error(assignmentMessage(rules, accounts));
      }
    } else {
      for (const l of data.single || []) {
        const amount = number(l.amount);
        if (!l.source && !l.affected && !amount && !l.memo) {
          if (data.multiple && l.date) throw Error('Complete or remove the empty receipt for ' + receiptDate(l) + '.');
          continue;
        }
        if (!(amount > 0)) throw Error('Enter a positive amount on each entry line.');
        const date=receiptDate(l), description=l.description===undefined?memo:String(l.description).trim();
        if (!description) throw Error('Add the General Description for each entry.');
        add(l.direction, l.source, l.affected, amount, data.receiptEditor341 ? String(l.memo||'').trim() || description : [description,l.memo].filter(Boolean).join(' — '),date,l.reference??data.reference??'');
        single.push({...l, amount: String(amount), date, description});
      }
    }
    if (!items.length) throw Error('Enter at least one complete transaction.');
    return {items, snapshot: {...(data.receiptEditor341?{receiptEditor341:true}:{}), mode: data.mode === 'double' ? 'double' : 'single', date: data.date, memo, reference: data.reference || '', multiple: !!data.multiple || items.some(item=>item.date!==data.date), rows, single, owner: '', journal: '', local: false, editIds: data.editIds || [], requestKey: data.requestKey, components1437: items}};
  }
  const api = {prepare, sharedPayment, datedPaymentParts, balanceMessage, assignmentMessage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StaffEntry14225 = api;
})(typeof window === 'undefined' ? globalThis : window);
