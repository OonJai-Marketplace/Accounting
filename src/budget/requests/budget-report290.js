/* Budget items keep their request identity and their original currency throughout reporting. */
window.BudgetReport290 = (() => {
 'use strict';
 const esc = value => escapeHtml(String(value ?? ''));
 const money = value => formatAppNumber(Number(value));
 const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
 function groups(lines) {
  const map = new Map();
  for (const line of lines) {
   if (!map.has(line.category)) map.set(line.category, []);
   map.get(line.category).push(line);
  }
  return map;
 }
 function amounts(lines) {
  const sums = new Map();
  for (const line of lines) sums.set(line.currency, round((sums.get(line.currency) || 0) + Number(line.amount)));
  return sums;
 }
 const amountList = sums => [...sums].map(([c,n]) => c + ' ' + money(n)).join(' · ');
 const fill = 'background-color:#dceee3;color:#173f30;font-weight:700;padding:5px 7px;';
 function subtotal(category, lines, span) {
  return `<tr data-budget-summary290="subtotal"><th colspan="2" style="text-align:left;${fill}">Subtotal · ${esc(category)}</th><td colspan="${span}" style="text-align:right;${fill}">${esc(amountList(amounts(lines)))}</td></tr>`;
 }
 function grand(lines, actions=false) {
  return [...amounts(lines)].map(([c,n]) => `<tr><th colspan="2" style="text-align:left;${fill}">Total requested</th><td data-budget-total14316="${esc(c)}" style="text-align:right;${fill}">${money(n)}</td><td colspan="${actions?2:1}" style="${fill}">${esc(c)}</td></tr>`).join('');
 }
 function items(lines, editing=false) {
  const body = [...groups(lines)].map(([category,items]) => items.map(l => {
   const key = esc(l.key117 || '');
   const actions = editing ? `<td><button type="button" data-budget-edit290="${key}">Edit</button><button type="button" data-budget-delete290="${key}">Delete</button></td>` : '';
   return `<tr data-budget-key14316="${key}"><td>${esc(category)}</td><td>${esc(l.description)}</td><td style="text-align:right">${money(l.amount)}</td><td>${esc(l.currency)}</td>${actions}</tr>`;
  }).join('')+subtotal(category,items,editing?3:2)).join('');
  return `<table ${editing?'class="budget-items290"':'data-budget-table14316="items"'} style="width:100%;border-collapse:collapse"><thead><tr><th>Category</th><th>Item</th><th>Amount</th><th>Currency</th>${editing?'<th>Action</th>':''}</tr></thead><tbody>${body||'<tr><td colspan="5">No budget items yet.</td></tr>'}</tbody><tfoot>${grand(lines,editing)}</tfoot></table>`;
 }
 function readRows(root) {
  const selector=root.matches?.('table')?'tbody>tr:not([data-budget-summary290])':'table[data-budget-table14316="items"] tbody>tr:not([data-budget-summary290])';
  return [...root.querySelectorAll(selector)].map(row => ({
   row, category:row.cells[0]?.textContent.trim(), amount:parseAppNumber(row.cells[2]?.textContent || ''), currency:row.cells[3]?.textContent.trim()
  }));
 }
 function recalculate(root) {
  if (!root?.querySelector('[data-budget-table14316]')) return;
  const lines=readRows(root), totals=amounts(lines), categories=groups(lines);
  for (const tr of root.querySelectorAll('[data-budget-summary290="subtotal"]')) {
   const group=categories.get(tr.cells[0].textContent.replace(/^Subtotal · /,''));
   if(group){const value=amountList(amounts(group));if(tr.cells[1].textContent!==value)tr.cells[1].textContent=value;}
   tr.contentEditable='false';
  }
  for (const cell of root.querySelectorAll('[data-budget-total14316]')) {
   const value=money(totals.get(cell.dataset.budgetTotal14316)||0);
   if(cell.textContent!==value)cell.textContent=value;
   cell.parentElement.contentEditable='false';
  }
 }
 function signature(d) {
  const name=d.preparedBy||'';
  const role=d.preparedRole290 || (name===liveProfile?.full_name ? (liveProfile?.job_title||liveProfile?.user_permissions?.job_title||(typeof livePermission!=='undefined'&&livePermission?.job_title)) : '') || 'Prepared by';
  return ReportSignatories275.signatureHtml277([{name,role}]);
 }
 // Operate on the rejoined document before pagination/save. Retain the author's item cells and other content.
 function layout(root, d) {
  for (const t of root.querySelectorAll('table[data-budget-table14316="items"]')) {
   const rows=readRows(t),body=t.tBodies[0];
   if(!body||!rows.length)continue;
   for(const tr of t.querySelectorAll('tbody>[data-budget-summary290]'))tr.remove();
   for(const [category,lines] of groups(rows)){
    for(const line of lines)body.append(line.row);
    body.insertAdjacentHTML('beforeend',subtotal(category,lines,2));
   }
   (t.tFoot||t.createTFoot()).innerHTML=grand(rows);
  }
  if(!root.querySelector('[data-print-signatures]')){
   const legacy=[...root.querySelectorAll('p')].find(p=>p.textContent.trim()==='Prepared by '+(d.preparedBy||''));
   if(legacy){legacy.insertAdjacentHTML('afterend',signature(d));legacy.remove();}
  }
  recalculate(root);
 }
 function period(d){
  const month=d.budgetMonth290 || String(d.date||'').slice(0,7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)?new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z')):'';
 }
 const kind=m=>m.type290 || (Number(m.inflow)>0?'receipt':'spend');
 const labels={receipt:'Funding received',spend:'Expense paid',borrow:'Temporary advance received',repay:'Advance repaid',refund:'Unused funding returned',transfer:'Transfer between accounts'};
 function balances(d) {
  const sums=new Map();
  const currency=c=>{if(!sums.has(c))sums.set(c,{requested:0,receipt:0,spend:0,borrow:0,repay:0,refund:0,transfer:0,convertedIn:0,convertedOut:0,remaining:0});return sums.get(c);};
  for(const l of d.lines)currency(l.currency).requested+=Number(l.amount);
  for(const m of d.movements||[])currency(m.currency)[kind(m)]+=Number(m.inflow||m.outflow||0);
  for(const fx of d.conversions||[]){currency(fx.currency).convertedOut+=Number(fx.amount);currency(fx.target).convertedIn+=conversionAmount(fx);}
  for(const t of sums.values())t.remaining=round(t.receipt+t.borrow+t.convertedIn-t.spend-t.repay-t.refund-t.convertedOut);
  return sums;
 }
 function conversionAmount(fx){return fx.targetAmount290==null?round(Number(fx.amount)*Number(fx.rate)):Number(fx.targetAmount290);}
 function outstanding(d,loan){
  return round(Number(loan.inflow)-(d.movements||[]).filter(m=>kind(m)==='repay'&&m.loanId290===loan.id290).reduce((sum,m)=>sum+Number(m.loanAmount290||m.outflow),0));
 }
 function summary(d){
  const totals=[...balances(d)],columns=totals.map(([c])=>c);
  const fields=[['requested','Requested'],['receipt','Funding received'],['convertedOut','Amount exchanged'],['convertedIn','Received from exchanges'],['spend','Expenses paid'],['borrow','Temporary advances received'],['repay','Advances repaid'],['refund','Unused funding returned'],['remaining','Cash remaining']];
  const cash=table82(['Activity',...columns],fields.filter(([key])=>['receipt','spend','remaining','requested'].includes(key)||totals.some(([,t])=>t[key])).map(([key,label])=>[esc(label),...totals.map(([,t])=>money(t[key]))]));
  const loans=d.movements.filter(m=>kind(m)==='borrow');
  const debt=loans.length?section82('Temporary advances',table82(['Lender / source','Reference','Currency','Borrowed','Outstanding'],loans.map(l=>[esc(l.account),esc(l.reference),esc(l.currency),money(l.inflow),money(outstanding(d,l))]))):'';
  const uses=[...groups(d.lines).values()].flat().map(l=>{
   const used=d.movements.filter(m=>kind(m)==='spend'&&m.budgetKey117===l.key117);
   const spent=amountList(amounts(used.map(m=>({amount:m.outflow,currency:m.currency}))));
   const complete=used.every(m=>m.currency===l.currency||Number(m.budgetAmount290)>0);
   const equivalent=used.reduce((n,m)=>n+Number(m.currency===l.currency?m.outflow:m.budgetAmount290||0),0);
   return [esc(l.category),esc(l.description),esc(l.currency+' '+money(l.amount)),esc(spent||'—'),complete?esc(l.currency+' '+money(l.amount-equivalent)):'Equivalent pending'];
  });
  const unassigned=d.movements.filter(m=>kind(m)==='spend'&&!m.budgetKey117);
  if(unassigned.length)uses.push(['Unassigned','—','—',esc(amountList(amounts(unassigned.map(m=>({currency:m.currency,amount:m.outflow}))))),'—']);
  return section82('Funding by currency',cash)+debt+section82('Spending by budget item',table82(['Category','Item','Requested','Actual spending','Budget remaining'],uses));
 }
 function movementRows(d){
  return d.movements.map(m=>{
   const loan=kind(m)==='repay'?d.movements.find(l=>l.id290===m.loanId290&&kind(l)==='borrow'):null;
   const ref=loan?m.reference+' · Advance '+loan.reference+' · '+loan.currency+' '+money(m.loanAmount290||m.outflow)+' settled':m.reference;
   return [esc(m.date290?formatAppDate(m.date290):'—'),esc(labels[kind(m)]),esc(m.account),esc(m.destination290||loan?.account||'—'),esc(d.lines.find(l=>l.key117===m.budgetKey117)?.description||'—'),esc(m.currency+' '+money(Number(m.inflow)||Number(m.outflow))),esc(ref)];
  });
 }
 const movementHeaders=['Date','Activity','Source / lender','Paid to / destination','Budget item','Amount','Reference'];
 function report(d){
  if(d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const route=(source,to)=>esc(source)+(to?' → '+esc(to):'');
  const movements=movementRows(d).map(([date,activity,source,to,item,amount,reference])=>[date+'<br>'+activity,source+(to==='—'?'':' → '+to),item,amount,reference]);
  const exchanges=(d.conversions||[]).map(f=>[esc(formatAppDate(f.date))+'<br>'+esc(f.evidence||f.reference),route(f.source,f.destination290),esc(f.currency+' '+money(f.amount)),esc(f.target+' '+money(conversionAmount(f))),esc(formatAppRate(f.rate)+' '+f.target+'/'+f.currency)]);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Receipt / journal reference: '+esc(d.receiptReference290):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">Internal Fund Utilization Report</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>Budget month: '+esc(period(d))+' · Report date: '+esc(formatAppDate(d.date))+(refs?'<br>'+refs:'')+'</p>'+summary(d)+section82('Receipts, spending and repayments',table82(['Date / activity','Source and destination','Budget item','Amount','Reference'],movements))+section82('Currency conversions',table82(['Date / reference','Source and destination','Exchanged','Received','Rate'],exchanges))+(d.notes?'<p>'+esc(d.notes)+'</p>':'')+signature(d);
 }
 return {items,period,layout,recalculate,signature,report,kind,labels,summary,balances,conversionAmount,outstanding,movementRows,movementHeaders};
})();
