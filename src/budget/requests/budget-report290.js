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
 // The board report keeps all receipts, exchanges and disbursements in their native currencies.
 function cashCodes(d){
  return orderedUnits(['USD','LAK',...balances(d).keys()]);
 }
 function summaryTable(headers,rows,totals=[],marker=''){
  const heading=headers.map((h,i)=>'<th scope="col" style="text-align:'+(i?'right':'left')+'">'+esc(h)+'</th>').join('');
  const tr=(cells,total)=>'<tr'+(total?' data-budget-summary290="total"':'')+'>'+cells.map((cell,i)=>'<td style="vertical-align:top;text-align:'+(i?'right':'left')+';padding:4px 6px;'+(total?fill:'')+'">'+cell+'</td>').join('')+'</tr>';
  return '<div class="data-table82"><table '+marker+' style="width:100%;border-collapse:collapse"><thead><tr>'+heading+'</tr></thead><tbody>'+
   rows.map(r=>tr(r,false)).join('')+'</tbody>'+(totals.length?'<tfoot>'+totals.map(r=>tr(r,true)).join('')+'</tfoot>':'')+'</table></div>';
 }
 function cashSummary(d){
  const totals=balances(d),codes=cashCodes(d),rows=[];
  const cols=(name,value)=>[name,...codes.map(c=>value(c)==null?'—':amountHtml(c,value(c)))];
  const key=(name,k)=>cols(name,c=>totals.get(c)?.[k]||0);
  const ref=s=>s?'<br><small>'+esc(s)+'</small>':'';
  for(const [i,m] of d.movements.entries()){
   if(kind(m)!=='receipt')continue;
   rows.push(cols(esc(m.account||'Receipt')+ref(m.reference),c=>c===m.currency?Number(m.inflow):null));
  }
  rows.push(key('Total received','receipt'));
  for(const [i,f] of (d.conversions||[]).entries()){
   const received=conversionAmount(f);
   const base=f.target==='USD'?f.target:f.currency;
   const quote=base===f.currency?f.target:f.currency;
   const rate=base===f.currency?received/f.amount:f.amount/received;
   rows.push(cols('Exchange'+ref(formatAppRate(rate)+' '+quote+' / '+base+(f.evidence||f.reference?' · '+(f.evidence||f.reference):'')),
    c=>c===f.currency?-Number(f.amount):c===f.target?received:null));
  }
  for(const [i,m] of d.movements.entries()){
   const type=kind(m);
   if(['borrow','repay','coverage'].includes(type))rows.push(cols(esc(labels[type])+ref(m.reference),c=>c===m.currency?Number(m.inflow||0)-Number(m.outflow||0):null));
  }
  rows.push(cols('Available to distribute',c=>{const t=totals.get(c);return t?t.receipt+t.coverage+t.borrow-t.repay+t.convertedIn-t.convertedOut:0;}));
  rows.push(key('Total distributed','cashSpent'));
  const closing=[key('Remaining','beforeReturn')];
  return summaryTable(['Source / activity',...codes],rows,closing,'data-cash-summary');
 }
 function requestSummary(d,editable=false){
  const sum=new Map(),funded=new Map();
  const rows=d.lines.map((l,i)=>{
   const {status,amount}=lineFunding(d,l,i);
   sum.set(l.currency,(sum.get(l.currency)||0)+Number(l.amount));
   funded.set(l.currency,amount==null||funded.get(l.currency)===null?null:(funded.get(l.currency)||0)+Number(amount));
   const decision=editable?'<select data-plain14285 data-decision="'+i+'" aria-label="Funding status for '+esc(l.description)+'">'+Object.entries(fundingLabels).map(([k,v])=>'<option value="'+k+'"'+(k===status?' selected':'')+'>'+v+'</option>').join('')+'</select>':esc(fundingLabels[status]);
   const adjustment=editable?'<input data-adjusted="'+i+'" data-currency="'+esc(l.currency)+'" aria-label="Adjusted funding for '+esc(l.description)+'" type="number" min="0" max="'+Number(l.amount)+'" step="0.01" value="'+(status==='deduction'?Number(amount):'')+'"'+(status==='deduction'?'':' hidden')+'>':'';
   return [esc(l.description)+'<br><small>'+esc(l.category)+'</small>',amountHtml(l.currency,l.amount),decision,
    '<span data-funded="'+i+'"'+(editable&&status==='deduction'?' hidden':'')+'>'+(amount==null?'Unconfirmed':amountHtml(l.currency,amount))+'</span>'+adjustment];
  });
  return summaryTable(['Item / category','Requested','Status','Funded / adjusted'],rows,[['Total requested',amountLines(sum.keys(),c=>sum.get(c)),'Total funded','<span data-funded-total>'+fundedTotal(funded)+'</span>']],'data-request-summary');
 }
 function fundedTotal(sums){return orderedUnits(sums.keys()).map(c=>sums.get(c)==null?esc(c)+' unconfirmed':amountHtml(c,sums.get(c))).join('<br>');}
 function disbursements(d,editable=false){
  const codes=cashCodes(d),rows=[],sums=balances(d);
  for(const {line,index,movements} of spendingRows(d)){
   for(const m of movements.length?movements:[null]){
    const i=m?d.movements.indexOf(m):-1,item=line?.description||m?.item290||m?.destination290||m?.description290||'Additional spending';
    const category=line?.category||m?.category290||'Additional spending';
    const identity=' data-payment="'+i+'" data-line="'+(index??-1)+'"';
    const reference=editable?'<input data-payment-reference'+identity+' aria-label="Reference for '+esc(item)+'" placeholder="Reference" value="'+esc(m?.reference||'')+'">':esc(m?.reference||'—');
    const itemCell='<strong>'+esc(item)+'</strong> · '+esc(category)+(line?'':' · Outside request');
    const amounts=codes.map(c=>{
     if(m&&m.currency!==c)return '—';
     const n=m?cashPaid(m):null;
     return editable?'<input type="number" min="0" step="0.01" data-paid-in="'+esc(c)+'" data-currency="'+esc(c)+'"'+identity+' aria-label="'+esc(c)+' paid for '+esc(item)+'" value="'+(n==null?'':Number(n))+'" placeholder="0.00">':
      n==null?(c===line.currency?amountHtml(c,0):'—'):amountHtml(c,n);
    });
    rows.push([itemCell,...amounts,reference,...(editable?['<button type="button" data-pay-detail'+identity+'>Details</button>']:[])]);
   }
  }
  const total=['Total distributed',...codes.map(c=>amountHtml(c,sums.get(c)?.cashSpent||0)),'',...(editable?['']:[])];
  return summaryTable(['Item / category',...codes,'Reference',...(editable?['Action']:[])],rows,[total],'data-disbursements');
 }
 function summary(d){
  return section82('Funding summary',cashSummary(d))+section82('Budget request summary',requestSummary(d))+section82('Disbursement breakdown',disbursements(d));
 }
 function movementRows(d){
  return d.movements.map(m=>{
   const loan=kind(m)==='repay'?d.movements.find(l=>l.id290===m.loanId290&&kind(l)==='borrow'):null;
   const ref=loan?m.reference+' · Advance '+loan.reference+' · '+currencyAmount(loan.currency,m.loanAmount290||m.outflow)+' settled':m.reference;
   return [esc(m.date290?formatAppDate(m.date290):'—'),esc(labels[kind(m)]),esc(m.account),esc(m.destination290||loan?.account||'—'),esc(d.lines.find((l,i)=>forLine(m,l,i))?.description||(kind(m)==='spend'?m.destination290:'')||'—')+(m.description290?'<br>'+esc(m.description290):''),amountHtml(m.currency,Number(m.inflow)||Number(m.outflow))+(m.cashDistributed!=null?'<br><small>Cash distributed: '+amountHtml(m.currency,m.cashDistributed)+'</small>':''),esc(ref)];
  });
 }
 const movementHeaders=['Date','Activity','Source / lender','Paid to / destination','Budget item','Amount','Reference'];
 function report(d,journalReference='',print=false){
  if(d.mode!=='utilization'&&d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Reference: '+esc(d.receiptReference290):'',journalReference?'Utilization journal: '+esc(journalReference):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">'+title+'</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>'+esc(period(d))+' · '+esc(formatAppDate(d.date))+
   (d.status==='finalized'?' · <span data-final-status>Finalized</span>':'')+(refs?'<br>'+refs:'')+'</p>'+summary(d)+(d.notes&&print?'<p>'+esc(d.notes)+'</p>':'')+signature(d);
 }
 return {title,compare,cashPaid,equivalentField,reportRate,requestCurrency,valueIn,amountText,currencyAmount,amountHtml,amountLines,orderedUnits,items,period,layout,recalculate,signature,report,kind,labels,summary,cashSummary,requestSummary,disbursements,fundedTotal,balances,conversionAmount,outstanding,movementRows,movementHeaders,forLine,fundingLabels,fundingKey,lineFunding};
})();
