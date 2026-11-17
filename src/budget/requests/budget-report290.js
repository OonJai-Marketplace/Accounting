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
  const currency=c=>{if(!sums.has(c))sums.set(c,{requested:0,receipt:0,spend:0,cashSpent:0,borrow:0,repay:0,refund:0,transfer:0,convertedIn:0,convertedOut:0,remaining:0});return sums.get(c);};
  for(const l of d.lines)currency(l.currency).requested+=Number(l.amount);
  for(const m of d.movements||[]){
   const t=currency(m.currency),type=kind(m);
   t[type]+=Number(m.inflow||m.outflow||0);
   if(type==='spend')t.cashSpent+=Number(m.cashDistributed??m.outflow);
  }
  for(const fx of d.conversions||[]){currency(fx.currency).convertedOut+=Number(fx.amount);currency(fx.target).convertedIn+=conversionAmount(fx);}
  for(const t of sums.values())t.remaining=round(t.receipt+t.borrow+t.convertedIn-t.cashSpent-t.repay-t.refund-t.convertedOut);
  return sums;
 }
 function conversionAmount(fx){return fx.targetAmount290==null?round(Number(fx.amount)*Number(fx.rate)):Number(fx.targetAmount290);}
 function outstanding(d,loan){
  return round(Number(loan.inflow)-(d.movements||[]).filter(m=>kind(m)==='repay'&&m.loanId290===loan.id290).reduce((sum,m)=>sum+Number(m.loanAmount290||m.outflow),0));
 }
 function forLine(m,line,index){return m.budgetKey117?m.budgetKey117===line.key117:!line.key117&&m.worksheetLine===index;}
 const fundingLabels={approved:'Approved',declined:'Declined',deduction:'Deduction'};
 // A utilization owns its decisions. Its linked request lines are an immutable snapshot.
 const fundingKey=(line,index)=>line.key117?'item:'+line.key117:'row:'+index;
 function lineFunding(d,line,index){
  const saved=d.fundingByItem?.[fundingKey(line,index)];
  const status=saved?.status||'approved';
  const amount=status==='approved'?Number(line.amount):status==='declined'?0:saved.received;
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
 function valueIn(d,amount,currency,to,line,movement){
  if(!Number(amount))return 0;
  if(currency===to)return Number(amount);
  if(movement&&line&&line.currency===to&&Number(movement.budgetAmount290)>0)return Number(movement.budgetAmount290);
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
 function compare(d){
  const spent=(d.movements||[]).filter(m=>kind(m)==='spend');
  const rows=d.lines.map((line,index)=>({line,index,movements:spent.filter(m=>forLine(m,line,index))}));
  const linked=new Set(rows.flatMap(row=>row.movements));
  for(const movement of spent)if(!linked.has(movement))rows.push({movements:[movement]});
  const base=requestCurrency(d);
  for(const row of rows)row.currencies=rowCurrencies(row.line,row.movements,base);
  const native=new Set(rows.flatMap(row=>row.currencies));
  const currencies=[...new Set(['USD','LAK',...native])].filter(c=>native.has(c));
  function values(row,c){
   const {line,movements}=row;
   const requested=line?valueIn(d,line.amount,line.currency,c):0;
   const funded=line?valueIn(d,lineFunding(d,line,row.index).amount,line.currency,c):0;
   const used=totalValues(movements.map(m=>valueIn(d,m.outflow,m.currency,c,line,m)));
   const remaining=funded==null||used==null?null:funded-used;
   return {requested,funded,used,remaining};
  }
  for(const row of rows)row.values=Object.fromEntries(currencies.map(c=>[c,values(row,c)]));
  const totals=Object.fromEntries(currencies.map(c=>[c,Object.fromEntries(['requested','funded','used','remaining'].map(k=>[k,totalValues(rows.map(r=>r.values[c][k]))]))]));
  return {rows,currencies,totals};
 }
 function comparisonTable(d){
  const {rows,currencies,totals}=compare(d);
  const adjusted=rows.some(r=>r.line&&lineFunding(d,r.line,r.index).status!=='approved');
  const measures=[['requested','Requested'],...(adjusted?[['funded','Funded']]:[]),['used','Actual spending'],['remaining',d.fundingByItem?'Funding remaining':'Budget remaining']];
  function table(codes){
   const single=codes.length===1;
   const itemWidth=single?44:adjusted?26:34;
   const available=(100-itemWidth)/measures.length;
   const weights=codes.map(code=>code==='LAK'?1.5:1);
   const weightTotal=weights.reduce((sum,weight)=>sum+weight,0);
   const widths=weights.map(weight=>available*weight/weightTotal);
   const col=w=>'<col style="width:'+w+'%">';
   const cols=col(itemWidth)+measures.map(()=>widths.map(col).join('')).join('');
   const heading='background-color:#e4eee8;color:#193d30;padding:4px;text-align:right';
   const head='<tr><th rowspan="2" style="'+heading+';text-align:left">Item / category</th>'+
    measures.map(([,label])=>'<th colspan="'+codes.length+'" style="'+heading+'">'+label+'</th>').join('')+'</tr><tr>'+
    measures.map(()=>codes.map(c=>'<th style="'+heading+'">'+esc(c)+'</th>').join('')).join('')+'</tr>';
   function cells(values,visible,hasRequest,isTotal){
    return measures.map(([key])=>codes.map(c=>{
     const value=!visible.includes(c)?'':!hasRequest&&(key==='requested'||key==='funded')?'—':esc(amountText(values[c][key]));
     return '<td style="text-align:right;vertical-align:top;padding:4px 3px;'+(isTotal?fill:'')+'">'+value+'</td>';
    }).join('')).join('');
   }
   const body=rows.filter(row=>row.currencies.some(c=>codes.includes(c))).map(row=>{
    const {line,movements}=row,extra=movements[0];
    const item=line?.description||extra?.destination290||extra?.description290||'Additional spending';
    const detail=[line?.category||'Additional spending'];
    if(line&&d.fundingByItem)detail.push(fundingLabels[lineFunding(d,line,row.index).status]);
    return '<tr><td style="padding:4px 5px;vertical-align:top"><strong>'+esc(item)+'</strong><br><span style="color:#52665b">'+detail.map(esc).join(' · ')+'</span></td>'+
     cells(row.values,row.currencies,!!line,false)+'</tr>';
   }).join('');
   return '<div class="data-table82"><table style="width:100%;table-layout:fixed;border-collapse:collapse"><colgroup>'+cols+'</colgroup><thead>'+head+'</thead><tbody>'+body+
    '<tr><th style="text-align:left;'+fill+'">Report total</th>'+cells(totals,codes,true,true)+'</tr></tbody></table></div>';
  }
  const tables=currencies.length>2?currencies.map(c=>table([c])).join(''):currencies.length?table(currencies):'<p>No budget items or spending recorded.</p>';
  const rate=currencies.includes('USD')&&currencies.includes('LAK')&&reportRate(d,'USD','LAK');
  const note=currencies.length>1?'<p>Report totals include all items in each currency.'+(rate?' Report exchange rate · LAK '+esc(formatAppRate(rate))+' per USD. Recorded item equivalents take priority.':'')+'</p>':'';
  return section82('Budget compared with actual spending',tables+note);
 }
 function sizedTable(headers,rows,widths){
  const cols='<colgroup>'+widths.map(w=>'<col style="width:'+w+'%">').join('')+'</colgroup>';
  return table82(headers,rows).replace('<table>','<table style="width:100%;table-layout:fixed;border-collapse:collapse">'+cols);
 }
 function summary(d){
  const totals=[...balances(d)],columns=totals.map(([c])=>c);
  const fields=[['requested','Requested'],['receipt','Funding received'],['convertedOut','Amount exchanged'],['convertedIn','Received from exchanges'],...(d.movements.some(m=>m.cashDistributed!=null)?[['spend','Fund used (gross payroll and employer costs)'],['cashSpent','Cash distributed']]:[['spend','Expenses paid']]),['borrow','Temporary advances received'],['repay','Advances repaid'],['refund','Unused funding returned'],['remaining','Cash remaining']];
  const cash=table82(['Activity',...columns],fields.filter(([key])=>['receipt','spend','remaining','requested'].includes(key)||totals.some(([,t])=>t[key])).map(([key,label])=>[esc(label),...totals.map(([,t])=>money(t[key]))]));
  const loans=d.movements.filter(m=>kind(m)==='borrow');
  const debt=loans.length?section82('Temporary advances',table82(['Lender / source','Reference','Currency','Borrowed','Outstanding'],loans.map(l=>[esc(l.account),esc(l.reference),esc(l.currency),money(l.inflow),money(outstanding(d,l))]))):'';
  return section82('Funding by currency',cash)+debt+comparisonTable(d);
 }
 function movementRows(d){
  return d.movements.map(m=>{
   const loan=kind(m)==='repay'?d.movements.find(l=>l.id290===m.loanId290&&kind(l)==='borrow'):null;
   const ref=loan?m.reference+' · Advance '+loan.reference+' · '+loan.currency+' '+money(m.loanAmount290||m.outflow)+' settled':m.reference;
   return [esc(m.date290?formatAppDate(m.date290):'—'),esc(labels[kind(m)]),esc(m.account),esc(m.destination290||loan?.account||'—'),esc(d.lines.find((l,i)=>forLine(m,l,i))?.description||(kind(m)==='spend'?m.destination290:'')||'—')+(m.description290?'<br>'+esc(m.description290):''),esc(m.currency+' '+money(Number(m.inflow)||Number(m.outflow)))+(m.cashDistributed!=null?'<br><small>Cash distributed: '+esc(m.currency+' '+money(m.cashDistributed))+'</small>':''),esc(ref)];
  });
 }
 const movementHeaders=['Date','Activity','Source / lender','Paid to / destination','Budget item','Amount','Reference'];
 function report(d,journalReference=''){
  if(d.mode!=='utilization'&&d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const route=(source,to)=>esc(source)+(to?' → '+esc(to):'');
  const movements=movementRows(d).map(([date,activity,source,to,item,amount,reference])=>[date+'<br>'+activity,source+(to==='—'?'':' → '+to),item,amount,reference]);
  const exchanges=(d.conversions||[]).map(f=>[esc(formatAppDate(f.date))+'<br>'+esc(f.evidence||f.reference),route(f.source,f.destination290),esc(f.currency+' '+money(f.amount)),esc(f.target+' '+money(conversionAmount(f))),esc(formatAppRate(f.rate)+' '+f.target+'/'+f.currency)]);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Reference: '+esc(d.receiptReference290):'',journalReference?'Utilization journal: '+esc(journalReference):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">'+title+'</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>Budget month: '+esc(period(d))+' · Report date: '+esc(formatAppDate(d.date))+(refs?'<br>'+refs:'')+'</p>'+summary(d)+section82('Receipts, spending and repayments',sizedTable(['Date / activity','Source and destination','Budget item','Amount','Reference'],movements,[15,18,36,16,15]))+section82('Currency conversions',table82(['Date / reference','Source and destination','Exchanged','Received','Rate'],exchanges))+(d.notes?'<p>'+esc(d.notes)+'</p>':'')+signature(d);
 }
 return {title,compare,reportRate,requestCurrency,valueIn,amountText,items,period,layout,recalculate,signature,report,kind,labels,summary,balances,conversionAmount,outstanding,movementRows,movementHeaders,forLine,fundingLabels,fundingKey,lineFunding};
})();
