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
 function kind(m){
  const type=m.type290||(Number(m.inflow)>0?'receipt':'spend');
  // Earlier imports recorded a restaurant-covered shortage as a receipt, with its source and purpose intact.
  if(type==='receipt'&&/^restaurant funds$/i.test((m.account||'').trim())&&/^restaurant covered\b.*\b(shortage|shortfall)\b/i.test(m.description290||''))return 'coverage';
  return type;
 }
 const labels={receipt:'Funding received',spend:'Expense paid',borrow:'Temporary advance received',repay:'Advance repaid',refund:'Cash handover / return',transfer:'Transfer between accounts',coverage:'Shortfall covered by restaurant'};
 function cashPaid(m){return Number(m.cashDistributed??m.outflow);}
 function equivalentField(m){return m?.cashDistributed!=null?'cashBudgetAmount':'budgetAmount290';}
 function balances(d) {
  const sums=new Map();
  const currency=c=>{if(!sums.has(c))sums.set(c,{requested:0,receipt:0,coverage:0,spend:0,cashSpent:0,borrow:0,repay:0,refund:0,transfer:0,convertedIn:0,convertedOut:0,remaining:0});return sums.get(c);};
  for(const l of d.lines)currency(l.currency).requested+=Number(l.amount);
  for(const m of d.movements||[]){
   const t=currency(m.currency),type=kind(m);
   t[type]+=Number(m.inflow||m.outflow||0);
   if(type==='spend')t.cashSpent+=cashPaid(m);
  }
  for(const fx of d.conversions||[]){currency(fx.currency).convertedOut+=Number(fx.amount);currency(fx.target).convertedIn+=conversionAmount(fx);}
  for(const t of sums.values()){
   const available=t.receipt+t.coverage+t.borrow+t.convertedIn-t.cashSpent-t.repay-t.convertedOut;
   t.beforeReturn=round(available);
   t.remaining=round(available-t.refund);
  }
  return sums;
 }
 function conversionAmount(fx){return fx.targetAmount290==null?round(Number(fx.amount)*Number(fx.rate)):Number(fx.targetAmount290);}
 function outstanding(d,loan){
  return round(Number(loan.inflow)-(d.movements||[]).filter(m=>kind(m)==='repay'&&m.loanId290===loan.id290).reduce((sum,m)=>sum+Number(m.loanAmount290||m.outflow),0));
 }
 function forLine(m,line,index){return m.budgetKey117?m.budgetKey117===line.key117:!line.key117&&m.worksheetLine===index;}
 const fundingLabels={approved:'Approved',declined:'Declined',deduction:'Deduction',unconfirmed:'Unconfirmed'};
 // A utilization owns its decisions. Its linked request lines are an immutable snapshot.
 const fundingKey=(line,index)=>line.key117?'item:'+line.key117:'row:'+index;
 function lineFunding(d,line,index){
  const saved=d.fundingByItem?.[fundingKey(line,index)];
  const status=saved?.status||'approved';
  const amount=status==='approved'?Number(line.amount):status==='declined'?0:status==='unconfirmed'?null:saved.received;
  return {status,amount};
 }
 const title='Budget Request Utilization Report';
 // Use amounts actually exchanged, including the exact proceeds of a reverse exchange.
 // Weight multiple sales by the quantity sold. A saved item equivalent always takes precedence.
 function reportRate(d,from,to){
  if(from===to)return 1;
  const base=[from,to].includes('USD')?'USD':from,quote=base===from?to:from;
  const matches=(a,b)=>(d.conversions||[]).filter(f=>f.currency===a&&f.target===b&&Number(f.amount)>0&&conversionAmount(f)>0);
  let fx=matches(base,quote);
  if(!fx.length)fx=matches(quote,base);
  if(!fx.length)return null;
  let original=0,proceeds=0;
  for(const f of fx){
   original+=f.currency===from?Number(f.amount):conversionAmount(f);
   proceeds+=f.currency===from?conversionAmount(f):Number(f.amount);
  }
  return proceeds/original;
 }
 function valueIn(d,amount,currency,to,line,movement,field="budgetAmount290"){
  if(amount==null)return null;
  if(!Number(amount))return 0;
  if(currency===to)return Number(amount);
  if(movement&&line&&line.currency===to&&Number(movement[field])>0)return Number(movement[field]);
  const rate=reportRate(d,currency,to);
  return rate?Number(amount)*rate:null;
 }
 function totalValues(components){
  return components.some(v=>v==null)?null:components.reduce((sum,v)=>sum+v,0);
 }
 function requestCurrency(d){
  const currencies=new Set(d.lines.map(line=>line.currency));
  return currencies.size===1?currencies.values().next().value:null;
 }
 function rowCurrencies(line,movements,base){
  const paid=movements.filter(m=>Number(m.outflow)>0).map(m=>m.currency);
  return [...new Set([line?.currency||base,...paid].filter(Boolean))];
 }
 function amountText(value){
  return value==null?'Rate needed':money(round(value));
 }
 function orderedUnits(codes){
  const native=new Set(codes);
  return [...new Set(['USD','LAK',...native])].filter(c=>native.has(c));
 }
 function currencyAmount(code,value){
  const n=value==null?null:round(Number(value));
  const text=currencySymbolV6(code)+' '+amountText(n==null?null:Math.abs(n));
  return n<0?'('+text+')':text;
 }
 function amountHtml(code,value){
  return '<span class="fund-amount" style="white-space:nowrap;font-variant-numeric:tabular-nums" title="'+esc(code)+'">'+esc(currencyAmount(code,value))+'</span>';
 }
 function amountLines(codes,value){
  return orderedUnits(codes).map(c=>amountHtml(c,value(c))).join('<br>');
 }
 function spendingRows(d){
  const spent=(d.movements||[]).filter(m=>kind(m)==='spend');
  const rows=d.lines.map((line,index)=>({line,index,movements:spent.filter(m=>forLine(m,line,index))}));
  const linked=new Set(rows.flatMap(row=>row.movements));
  for(const movement of spent)if(!linked.has(movement))rows.push({movements:[movement]});
  return rows;
 }
 function compare(d,basis="cost"){
  const rows=spendingRows(d);
  const base=requestCurrency(d);
  for(const row of rows)row.currencies=rowCurrencies(row.line,row.movements,base);
  const currencies=orderedUnits(rows.flatMap(row=>row.currencies));
  function values(row,c){
   const {line,movements}=row;
   const requested=line?valueIn(d,line.amount,line.currency,c):0;
   const funded=line?valueIn(d,lineFunding(d,line,row.index).amount,line.currency,c):0;
   const used=totalValues(movements.map(m=>basis==="cost"?valueIn(d,m.outflow,m.currency,c,line,m):valueIn(d,cashPaid(m),m.currency,c,line,m,equivalentField(m))));
   const remaining=funded==null||used==null?null:funded-used;
   return {requested,funded,used,remaining};
  }
  for(const row of rows)row.values=Object.fromEntries(currencies.map(c=>[c,values(row,c)]));
  const totals=Object.fromEntries(currencies.map(c=>[c,Object.fromEntries(['requested','funded','used','remaining'].map(k=>[k,totalValues(rows.map(r=>r.values[c][k]))]))]));
  return {rows,currencies,totals};
 }
 function comparisonTable(d){
  const rows=spendingRows(d);
  const balancesByCurrency=balances(d), codes=orderedUnits([...balancesByCurrency.keys()]);
  if(!codes.length)return section82('Budget compared with actual spending','<p>No budget items or spending recorded.</p>');
  const approved=new Map();
  const amountsCell=(values,style='')=>'<td style="text-align:right;vertical-align:top;padding:4px 3px;'+style+'">'+
   (values.size?amountLines([...values.keys()],c=>values.get(c)):'—')+'</td>';
  const rowHTML=(label,columns,style='')=>'<tr><td style="text-align:left;padding:4px 5px;'+style+'">'+label+'</td>'+columns.map(v=>amountsCell(v,style)).join('')+'</tr>';
  const body=rows.map(({line,index,movements})=>{
   const requested=new Map(),funded=new Map(),spent=new Map(),left=new Map();
   if(line){
    const amount=lineFunding(d,line,index).amount;
    requested.set(line.currency,line.amount);
    if(amount!=null){funded.set(line.currency,amount);approved.set(line.currency,(approved.get(line.currency)||0)+Number(amount));}
   }
   if(line&&!movements.length)spent.set(line.currency,0);
   for(const m of movements)spent.set(m.currency,(spent.get(m.currency)||0)+Number(m.outflow));
   // Exchanges are recorded for the fund, and are not allocated to an individual item.
   if(!line||funded.size&&[...spent.keys()].every(c=>c===line.currency)){
    for(const c of new Set([...funded.keys(),...spent.keys()]))left.set(c,(funded.get(c)||0)-(spent.get(c)||0));
   }
   const extra=movements[0],item=line?.description||extra?.destination290||extra?.description290||'Additional spending';
   const detail=line?[line.category,fundingLabels[lineFunding(d,line,index).status]].filter(Boolean).join(' · '):'Additional spending';
   return rowHTML(esc(item)+'<br><small>'+esc(detail)+'</small>',[requested,funded,spent,left]);
  }).join('');
  const values=get=>new Map(codes.map(c=>[c,round(get(balancesByCurrency.get(c),c))]).filter(([,v])=>v!==0));
  function adjustment(label,get){
   const net=values(get);
   return net.size?rowHTML(label,[new Map(),net,new Map(),net]):'';
  }
  const changes=adjustment('Receipts above or below item funding',(t,c)=>t.receipt-(approved.get(c)||0))+
   adjustment('Currency exchanged',t=>t.convertedIn-t.convertedOut)+
   adjustment('Shortfall covered by restaurant',t=>t.coverage)+adjustment('Temporary advances, less repayments',t=>t.borrow-t.repay);
  const available=t=>t.receipt+t.coverage+t.convertedIn-t.convertedOut+t.borrow-t.repay;
  const totals=codes.map(c=>{
   const t=balancesByCurrency.get(c),funds=available(t);
   const cells=[t.requested,funds,t.spend,funds-t.spend].map(n=>'<td style="text-align:right;'+fill+'">'+amountHtml(c,n)+'</td>');
   return '<tr data-budget-summary290="total"><th scope="row" style="text-align:left;'+fill+'">Total · '+esc(c)+'</th>'+cells.join('')+'</tr>';
  }).join('');
  const table='<div class="data-table82"><table style="width:100%;table-layout:fixed;border-collapse:collapse"><colgroup><col style="width:32%"><col style="width:17%"><col style="width:17%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr>'+
   ['Item / category','Requested','Funds available','Actual spending','Budget remaining'].map((h,i)=>'<th style="background:#e4eee8;padding:4px;text-align:'+(i?'right':'left')+'">'+h+'</th>').join('')+
   '</tr></thead><tbody>'+body+changes+totals+'</tbody></table></div>';
  return section82('Budget compared with actual spending',table);

 }
 function sizedTable(headers,rows,widths){
  const cols='<colgroup>'+widths.map(w=>'<col style="width:'+w+'%">').join('')+'</colgroup>';
  return table82(headers,rows).replace('<table>','<table style="width:100%;table-layout:fixed;border-collapse:collapse">'+cols);
 }
 function summary(d){
  const totals=balances(d),columns=orderedUnits(totals.keys());
  const hasHandover=columns.some(c=>totals.get(c).refund);
  const fields=[['requested','Requested'],['receipt','Funding received'],['coverage','Shortfall covered by restaurant'],['convertedOut','Amount exchanged'],['convertedIn','Received from exchanges'],['borrow','Temporary advances received'],['repay','Advances repaid'],['cashSpent','Cash distributed'],['beforeReturn',hasHandover?'Cash before handover':'Cash remaining']];
  if(hasHandover){
   fields.push(['refund','Cash handed over or returned'],['remaining','Cash held after handover']);
  }
  const cash=document.createElement('div');
  cash.innerHTML=table82(['Activity',...columns],fields.filter(([key])=>['receipt','cashSpent','beforeReturn','remaining','requested'].includes(key)||columns.some(c=>totals.get(c)[key])).map(([key,label])=>[esc(label),...columns.map(c=>amountHtml(c,totals.get(c)[key]))]));
  for(const row of cash.querySelectorAll('tr'))for(const cell of [...row.cells].slice(1))cell.style.textAlign='right';
  const requestedRow=cash.querySelector('tbody tr');
  if(requestedRow){requestedRow.dataset.budgetSummary290='requested';for(const cell of requestedRow.cells)cell.style.cssText+=fill;}
  const loans=d.movements.filter(m=>kind(m)==='borrow');
  const debt=loans.length?section82('Temporary advances',table82(['Lender / source','Reference','Currency','Borrowed','Outstanding'],loans.map(l=>[esc(l.account),esc(l.reference),esc(l.currency),amountHtml(l.currency,l.inflow),amountHtml(l.currency,outstanding(d,l))]))):'';
  return section82('Funding by currency',cash.innerHTML)+debt+comparisonTable(d);
 }
 function movementRows(d){
  return d.movements.map(m=>{
   const loan=kind(m)==='repay'?d.movements.find(l=>l.id290===m.loanId290&&kind(l)==='borrow'):null;
   const ref=loan?m.reference+' · Advance '+loan.reference+' · '+currencyAmount(loan.currency,m.loanAmount290||m.outflow)+' settled':m.reference;
   return [esc(m.date290?formatAppDate(m.date290):'—'),esc(labels[kind(m)]),esc(m.account),esc(m.destination290||loan?.account||'—'),esc(d.lines.find((l,i)=>forLine(m,l,i))?.description||(kind(m)==='spend'?m.destination290:'')||'—')+(m.description290?'<br>'+esc(m.description290):''),amountHtml(m.currency,Number(m.inflow)||Number(m.outflow))+(m.cashDistributed!=null?'<br><small>Cash distributed: '+amountHtml(m.currency,m.cashDistributed)+'</small>':''),esc(ref)];
  });
 }
 const movementHeaders=['Date','Activity','Source / lender','Paid to / destination','Budget item','Amount','Reference'];
 function report(d,journalReference='',ownerBalance){
  if(d.mode!=='utilization'&&d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const owner=ownerBalance||BudgetOwnerBalance.calculate(d,null,null);
  const route=(source,to)=>esc(source)+(to?' → '+esc(to):'');
  const movements=movementRows(d).map(([date,activity,source,to,item,amount,reference])=>[date+'<br>'+activity,source+(to==='—'?'':' → '+to),item,amount,reference]);
  const exchanges=(d.conversions||[]).map(f=>[esc(formatAppDate(f.date))+'<br>'+esc(f.evidence||f.reference),route(f.source,f.destination290),amountHtml(f.currency,f.amount),amountHtml(f.target,conversionAmount(f)),esc(formatAppRate(f.rate)+' '+f.target+'/'+f.currency)]);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Reference: '+esc(d.receiptReference290):'',journalReference?'Utilization journal: '+esc(journalReference):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">'+title+'</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>Budget month: '+esc(period(d))+' · Report date: '+esc(formatAppDate(d.date))+(refs?'<br>'+refs:'')+'</p>'+BudgetOwnerBalance.render(owner)+summary(d)+section82('Receipts, spending and repayments',sizedTable(['Date / activity','Source and destination','Budget item','Amount','Reference'],movements,[15,18,36,16,15]))+section82('Currency conversions',table82(['Date / reference','Source and destination','Exchanged','Received','Rate'],exchanges))+(d.notes?'<p>'+esc(d.notes)+'</p>':'')+BudgetOwnerBalance.closing(owner)+signature(d);
 }
 return {title,compare,cashPaid,equivalentField,reportRate,requestCurrency,valueIn,amountText,currencyAmount,amountHtml,amountLines,orderedUnits,items,period,layout,recalculate,signature,report,kind,labels,summary,balances,conversionAmount,outstanding,movementRows,movementHeaders,forLine,fundingLabels,fundingKey,lineFunding};
})();
