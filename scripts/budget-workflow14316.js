/* Funding commitments and expense amounts belong to the utilization draft. */
window.BudgetSpendingWorksheet=(()=>{
 function mount(host,draft,openPayment){
  const report=BudgetReport290,request=host.querySelector('[data-request-summary]'),payments=host.querySelector('[data-disbursements]');
  const decisions=[...request.querySelectorAll('[data-decision]')].map((select,i)=>({
   select,input:request.querySelector('[data-adjusted="'+i+'"]'),display:request.querySelector('[data-funded="'+i+'"]'),line:draft.lines[i]
  }));
  const rows=[...payments.tBodies[0].rows].map(row=>({
   inputs:[...row.querySelectorAll('[data-paid-in]')],ref:row.querySelector('[data-payment-reference]'),button:row.querySelector('[data-pay-detail]')
  }));
  for(const row of rows)row.button.onclick=()=>openPayment(row.button,row.inputs);
  const dirty=()=>decisions.some(({select,input,line},i)=>{
   const prior=report.lineFunding(draft,line,i);
   return prior.status!==select.value||(select.value==='deduction'&&prior.amount!==input.valueAsNumber);
  })||rows.some(({inputs,ref})=>ref.value.trim()!==(draft.movements[Number(ref.dataset.payment)]?.reference||'')||
   inputs.some(input=>{const m=draft.movements[Number(input.dataset.payment)];return input.validity.badInput||(m?input.valueAsNumber!==report.expenseAmount(m):!!input.value);}));
  function read(commit=false){
   const movements=draft.movements.slice(),funding={...draft.fundingByItem},funded=new Map();
   function invalid(field,message){if(commit)field.focus();throw Error(message);}
   for(const [i,{select,input,display,line}] of decisions.entries()){
    const status=select.value,adjusted=status==='deduction';
    input.hidden=!adjusted;display.hidden=adjusted;
    const amount=adjusted?input.valueAsNumber:status==='approved'?Number(line.amount):status==='declined'?0:null;
    if(adjusted&&(!Number.isFinite(amount)||!input.validity.valid))invalid(input,'Enter the adjusted funding for '+line.description+' between zero and the requested amount.');
    display.innerHTML=amount==null?'Unconfirmed':report.amountHtml(line.currency,amount);
    funding[report.fundingKey(line,i)]=adjusted?{status,received:amount}:{status};
    funded.set(line.currency,amount==null||funded.get(line.currency)===null?null:(funded.get(line.currency)||0)+amount);
   }
   request.querySelector('[data-funded-total]').innerHTML=report.fundedTotal(funded);
   const assignments=[];
   for(const {inputs,ref,button} of rows){
    const reference=ref.value.trim();
    for(const input of inputs){
     const index=Number(input.dataset.payment),prior=draft.movements[index],lineIndex=Number(input.dataset.line);
     const amount=input.valueAsNumber,currency=input.dataset.paidIn;
     if(prior&&amount===report.expenseAmount(prior)&&reference===(prior.reference||''))continue;
     if(!input.value&&!input.validity.badInput&&!prior)continue;
     if(!Number.isFinite(amount)||!Number.isSafeInteger(Math.round(amount*100))||!input.validity.valid||(amount===0&&prior))
      invalid(input,'Enter a valid expense amount in '+currency+'. Use Details to remove an existing payment.');
     if(!prior&&amount===0)continue;
     if(prior){
      if(!reference&&prior.reference&&!prior.worksheetSpend)invalid(ref,'Enter the payment reference.');
      if(reference===prior.reference&&amount===report.expenseAmount(prior))continue;
      const next={...prior,reference};
      if(amount!==report.expenseAmount(prior)){
       next.outflow=amount;delete next.ownerAmount;delete next.ownerCurrency;delete next.budgetAmount290;
      }
      movements[index]=next;
     }else{
      const line=draft.lines[lineIndex];
      const next={type290:'spend',worksheetSpend:true,account:'',reference,date290:draft.date,currency,inflow:0,outflow:amount,budgetKey117:line?.key117||''};
      if(!next.budgetKey117)next.worksheetLine=lineIndex;
      if(commit)next.id290=crypto.randomUUID();
      assignments.push({input,button,ref,index:movements.length});
      movements.push(next);
     }
    }
    if(reference&&inputs.every(input=>Number(input.dataset.payment)<0&&!input.valueAsNumber))invalid(ref,'Enter the disbursement amount for this reference.');
   }
   const preview={...draft,movements,fundingByItem:funding};
   if(commit){
    Object.assign(draft,{movements,fundingByItem:funding});
    for(const {input,button,ref,index} of assignments){input.dataset.payment=String(index);if(button.dataset.payment==='-1')button.dataset.payment=ref.dataset.payment=String(index);}
   }
   return preview;
  }
  return {read,dirty};
 }
 return {mount};
})();
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
   return `<tr data-budget-key14316="${key}"><td>${esc(category)}</td><td>${esc(itemName(l))}</td><td style="text-align:right">${money(l.amount)}</td><td>${esc(l.currency)}</td>${actions}</tr>`;
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
 function expenseAmount(m){return Number(m.outflow)||0;}
 function itemName(line){
  const name=String(line?.description||'');
  if(/personal.*tax|income.*tax|^pit(?:\s|$)/i.test(name))return 'PIT — employer 50%';
  if(/social security|^sso(?:\s|$)/i.test(name))return 'SSO — employer 6%';
  return name;
 }
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
  // Preserve the actual currency of every expense. An exchange moves funding
  // between currencies; it never converts the same LAK spending back to USD.
  for(const [c,t] of sums){
   t.approved=0;
   for(const [i,line] of d.lines.entries())if(line.currency===c){
    const amount=lineFunding(d,line,i).amount;
    t.approved=amount==null||t.approved===null?null:t.approved+Number(amount);
   }
   if(t.approved!==null)t.approved=round(t.approved);
   t.allocated=round(t.spend);
   t.fundAvailable=round(t.receipt+t.coverage+t.borrow-t.repay+t.convertedIn-t.convertedOut);
   t.fundRemaining=round(t.fundAvailable-t.allocated);
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
 function fundingAmountLines(codes,value){
  return orderedUnits(codes).map(c=>value(c)===null?esc(c)+' unconfirmed':amountHtml(c,value(c))).join('<br>');
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
  const left=i=>i===0||['Category','Item','Reference','Action','Status'].includes(headers[i]);
  const heading=headers.map((h,i)=>'<th scope="col" style="text-align:'+(left(i)?'left':'right')+'">'+esc(h)+'</th>').join('');
  const tr=(cells,total)=>'<tr'+(total?' data-budget-summary290="total"':'')+'>'+cells.map((cell,i)=>'<td style="vertical-align:top;text-align:'+(left(i)?'left':'right')+';padding:3px 6px;'+(total?fill:'')+'">'+cell+'</td>').join('')+'</tr>';
  return '<div class="data-table82"><table '+marker+(headers[0]==='Category'?' data-budget-table14316="utilization-items"':'')+' style="width:100%;border-collapse:collapse"><thead><tr>'+heading+'</tr></thead><tbody>'+
   rows.map(r=>tr(r,false)).join('')+'</tbody>'+(totals.length?'<tfoot>'+totals.map(r=>tr(r,true)).join('')+'</tfoot>':'')+'</table></div>';
 }
 function cashSummary(d){
  const totals=balances(d),codes=cashCodes(d),rows=[];
  const cols=(label,value)=>[label,...codes.map(c=>value(c)==null?'—':amountHtml(c,value(c)))];
  const key=(label,k)=>cols(label,c=>totals.get(c)?.[k]||0);
  const ref=s=>s?'<br><small>'+esc(s)+'</small>':'';
  const receipts=(d.movements||[]).filter(m=>kind(m)==='receipt');
  for(const m of receipts)rows.push(cols(esc(m.account||'Receipt')+ref(m.reference),c=>c===m.currency?Number(m.inflow):null));
  if(receipts.length>1)rows.push(key('Total received','receipt'));
  for(const f of d.conversions||[]){
   const received=conversionAmount(f),rate=received/Number(f.amount);
   rows.push(cols('Exchange · '+esc(f.currency)+' → '+esc(f.target)+ref(formatAppRate(rate)+' '+f.target+' / '+f.currency)+ref(f.evidence||f.reference),
    c=>c===f.currency?-Number(f.amount):c===f.target?received:null));
  }
  for(const m of d.movements||[]){
   const type=kind(m);
   if(['borrow','repay','coverage'].includes(type))rows.push(cols(esc(labels[type])+ref(m.reference),c=>c===m.currency?Number(m.inflow||0)-Number(m.outflow||0):null));
  }
  rows.push(key('Available after exchange','fundAvailable'));
  rows.push(key('Total used','allocated'));
  return summaryTable(['Funding source / activity',...codes],rows,[key('Remaining funding','fundRemaining')],'data-cash-summary');
 }
 function requestSummary(d,editable=false){
  const sum=new Map(),funded=new Map();
  const rows=d.lines.map((l,i)=>{
   const {status,amount}=lineFunding(d,l,i);
   sum.set(l.currency,(sum.get(l.currency)||0)+Number(l.amount));
   funded.set(l.currency,amount==null||funded.get(l.currency)===null?null:(funded.get(l.currency)||0)+Number(amount));
   const decision=editable?'<select data-plain14285 data-decision="'+i+'" aria-label="Funding status for '+esc(l.description)+'">'+Object.entries(fundingLabels).map(([k,v])=>'<option value="'+k+'"'+(k===status?' selected':'')+'>'+v+'</option>').join('')+'</select>':esc(fundingLabels[status]);
   const adjustment=editable?'<input data-adjusted="'+i+'" data-currency="'+esc(l.currency)+'" aria-label="Adjusted funding for '+esc(l.description)+'" type="number" min="0" max="'+Number(l.amount)+'" step="0.01" value="'+(status==='deduction'?Number(amount):'')+'"'+(status==='deduction'?'':' hidden')+'>':'';
   return [esc(l.category),esc(itemName(l)),amountHtml(l.currency,l.amount),decision,
    '<span data-funded="'+i+'"'+(editable&&status==='deduction'?' hidden':'')+'>'+(amount==null?'Unconfirmed':amountHtml(l.currency,amount))+'</span>'+adjustment];
  });
  return summaryTable(['Category','Item','Requested','Status','Funded / adjusted'],rows,[['Total requested','',amountLines(sum.keys(),c=>sum.get(c)),'Total funded','<span data-funded-total>'+fundedTotal(funded)+'</span>']],'data-request-summary');
 }
 function fundedTotal(sums){return orderedUnits(sums.keys()).map(c=>sums.get(c)==null?esc(c)+' unconfirmed':amountHtml(c,sums.get(c))).join('<br>');}
 function disbursements(d,editable=false){
  const codes=cashCodes(d),rows=[],sums=balances(d);
  for(const {line,index,movements} of spendingRows(d)){
   for(const m of movements.length?movements:[null]){
    const i=m?d.movements.indexOf(m):-1,item=(line?itemName(line):'')||m?.item290||m?.destination290||m?.description290||'Additional spending';
    const category=line?.category||m?.category290||'Additional spending';
    const identity=' data-payment="'+i+'" data-line="'+(index??-1)+'"';
    const reference=editable?'<input data-payment-reference'+identity+' aria-label="Reference for '+esc(item)+'" placeholder="Reference" value="'+esc(m?.reference||'')+'">':esc(m?.reference||'—');
    const itemCell='<strong>'+esc(item)+'</strong>'+(line?'':' <small>Outside request</small>');
    const amounts=codes.map(c=>{
     if(m&&m.currency!==c)return '—';
     const n=m?expenseAmount(m):null;
     return editable?'<input type="number" min="0" step="0.01" data-paid-in="'+esc(c)+'" data-currency="'+esc(c)+'"'+identity+' aria-label="'+esc(c)+' expense for '+esc(item)+'" value="'+(n==null?'':Number(n))+'" placeholder="0.00">':
      n==null?(c===line.currency?amountHtml(c,0):'—'):amountHtml(c,n);
    });
    rows.push([esc(category),itemCell,...amounts,reference,...(editable?['<button type="button" data-pay-detail'+identity+'>Details</button>']:[])]);
   }
  }
  const total=['Total expense','',...codes.map(c=>amountHtml(c,sums.get(c)?.spend||0)),'',...(editable?['']:[])];
  return summaryTable(['Category','Item',...codes,'Reference',...(editable?['Action']:[])],rows,[total],'data-disbursements');
 }
 function summary(d){
  return section82('Funding summary',cashSummary(d))+section82('Budget request summary',requestSummary(d))+section82('Disbursement breakdown',disbursements(d));
 }
 function movementRows(d){
  return d.movements.map(m=>{
   const loan=kind(m)==='repay'?d.movements.find(l=>l.id290===m.loanId290&&kind(l)==='borrow'):null;
   const ref=loan?m.reference+' · Advance '+loan.reference+' · '+currencyAmount(loan.currency,m.loanAmount290||m.outflow)+' settled':m.reference;
   return [esc(m.date290?formatAppDate(m.date290):'—'),esc(labels[kind(m)]),esc(m.account),esc(m.destination290||loan?.account||'—'),esc(d.lines.find((l,i)=>forLine(m,l,i))?.description||(kind(m)==='spend'?m.destination290:'')||'—')+(m.description290?'<br>'+esc(m.description290):''),amountHtml(m.currency,Number(m.inflow)||Number(m.outflow))+(m.cashDistributed!=null?'<br><small>'+(m.cashUnconfirmed?'Cash payment details pending':'Cash distributed: '+amountHtml(m.currency,m.cashDistributed))+'</small>':''),esc(ref)];
  });
 }
 const movementHeaders=['Date','Activity','Source / lender','Paid to / destination','Budget item','Amount','Reference'];
 function report(d,journalReference='',print=false){
  if(d.mode!=='utilization'&&d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Reference: '+esc(d.receiptReference290):'',journalReference?'Utilization journal: '+esc(journalReference):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">'+title+'</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>'+esc(period(d))+' · '+esc(formatAppDate(d.date))+
   (d.status==='finalized'?' · <span data-final-status>Finalized</span>':'')+(refs?'<br>'+refs:'')+'</p>'+summary(d)+(String(d.printNotes290||'').trim()?'<p data-budget-additional-information><strong>Additional information</strong><br>'+esc(d.printNotes290.trim()).replace(/\r?\n/g,'<br>')+'</p>':'')+signature(d);
 }
 return {title,compare,cashPaid,fundingAmountLines,expenseAmount,itemName,equivalentField,reportRate,requestCurrency,valueIn,amountText,currencyAmount,amountHtml,amountLines,orderedUnits,items,period,layout,recalculate,signature,report,kind,labels,summary,cashSummary,requestSummary,disbursements,fundedTotal,balances,conversionAmount,outstanding,movementRows,movementHeaders,forLine,fundingLabels,fundingKey,lineFunding};
})();
/* Prepare owner support in its actual currencies; the journal editor owns posting. */
window.BudgetSupportEquity=(()=>{
 'use strict';
 const cents=n=>Math.round(Number(n||0)*100),money=n=>cents(n)/100;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const refs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const codes={remaining:{LAK:'3023',USD:'3028',THB:'3020-02'},used:{LAK:'3024',USD:'3029',THB:'3020-03'},original:{LAK:'3027',USD:'3026',THB:'3020-01'}};
 const bridges=new Set(['9010','9011','9012','9021','9022']);
 const regular=(a,type,c)=>a?.currency===c&&a.isActive!==false&&a.is_active!==false&&a.isPosting!==false&&!a.isTechnical&&a.type===type&&(!a.purpose||a.purpose==='regular');
 function equity(role,c){
  const found=AccountingStore.accounts.filter(a=>regular(a,'EQUITY',c)&&a.code===codes[role]?.[c]);
  if(found.length!==1)throw Error('Refresh the Chart of Accounts: Owner Support '+role+' — '+c+' is required.');
  return found[0];
 }
 function groups(d){
  const list=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt'&&m.ownerSource!=='other'&&Number(m.inflow)>0),out=new Map();
  for(const m of list){
   const references=refs(m.reference),header=refs(d.receiptReference290);
   if(!references.length&&header.length&&list.length>1)throw Error('Identify the posted journal on each receipt before preparing this report.');
   if(!references.length&&list.length===1)references.push(...header);
   const key=JSON.stringify([references.slice().sort(),m.currency,references.length?'':m.destination290||'']);
   if(!out.has(key))out.set(key,{references,currency:m.currency,destination:m.destination290||'',amount:0});
   out.get(key).amount=money(out.get(key).amount+Number(m.inflow));
  }
  return [...out.values()];
 }
 async function evidence(record){
  const client=ojmDb,owner=liveProfile?.id;
  const {data,error}=await client.rpc('budget_utilization_evidence478',{p_report:record.id,p_version:record.version});
  if(client!==ojmDb||owner!==liveProfile?.id)throw Error('The account changed. Reopen the report.');
  if(error||!Array.isArray(data?.journals)||!/^[a-f0-9]{32}$/.test(data?.fingerprint||''))throw Error('Could not verify the saved report and its journals. '+(error?.message||'Refresh and try again.'));
  return data;
 }
 const code=l=>l.accounts?.code;
 const sameRate=(a,b)=>Number(a.fx_rate_lak||0)===Number(b.fx_rate_lak||0)&&Number(a.book_rate_lak||0)===Number(b.book_rate_lak||0);
 const rateOf=l=>({rate:Number(l.fx_rate_lak)||null,bookRate:Number(l.book_rate_lak||l.fx_rate_lak)||null});
 const flowKey=(a,c,r)=>JSON.stringify([a,c,r.rate,r.bookRate]);
 function flows(j){
  const out={received:new Map(),used:new Map(),exchanges:[],paired:new Set()},ls=j.journal_lines||[];
  const add=(map,k,n)=>map.set(k,(map.get(k)||0)+cents(n));
  for(const l of ls){
   const c=l.currency_code;
   if(code(l)===codes.used[c])add(out.used,c,Number(l.credit)-Number(l.debit));
   if(code(l)!==codes.remaining[c])continue;
   const other=ls.find(b=>b!==l&&!out.paired.has(b)&&b.currency_code===c&&
    (bridges.has(code(b))||code(b)===codes.used[c])&&sameRate(l,b)&&b.line_date===l.line_date&&
    cents(l.debit)===cents(b.credit)&&cents(l.credit)===cents(b.debit));
   if(other){
    out.paired.add(l);out.paired.add(other);
    if(bridges.has(code(other)))out.exchanges.push({code:code(other),currency:c,amount:Number(l.debit||l.credit),out:!!Number(l.debit),...rateOf(l)});
   }else if(Number(l.credit))add(out.received,c,l.credit);
   else if(Number(l.debit))throw Error('Review the unmatched Remaining debit in '+j.entry_no+' before preparing another allocation.');
  }
  if(ls.some(l=>code(l)===codes.used[l.currency_code]&&(Number(l.debit)||Number(l.credit))&&!out.paired.has(l)))throw Error('Review the unmatched Used allocation in '+j.entry_no+' before preparing another journal.');
  return out;
 }
 function receivingAccount(destination,c){
  const matched=typeof getSelectedAccountInfo==='function'?getSelectedAccountInfo(destination):null;
  if(matched&&regular(matched,'ASSET',c))return matched;
  const text=norm(destination);
  const found=AccountingStore.accounts.filter(a=>regular(a,'ASSET',c)&&text&&
   (norm(a.name)===text||norm(a.name).replace(new RegExp(' '+c.toLowerCase()+'$'),'')===text||a.code===destination));
  return found.length===1?found[0]:null;
 }
 function plan(d,receiptGroups=groups(d),evidence=[]){
  const journals=Array.isArray(evidence)?evidence:evidence.journals;
  const posted=new Map(journals.filter(j=>j.status==='posted').map(j=>[j.entry_no,j]));
  const summaries=new Map([...posted].map(([ref,j])=>[ref,flows(j)]));
  const pairs=[],notes=[],totals=new Map(),claimed=new Set(),basis=new Map();
  const get=c=>{if(!totals.has(c))totals.set(c,{received:0,used:0,exchangedIn:0,exchangedOut:0});return totals.get(c);};
  const pair=(label,c,amount,debit,credit,roles,r={},fixed=false)=>{
   if(cents(amount)<=0)return;
   pairs.push({label,currency:c,amount:money(amount),debitCode:debit?.code||'',creditCode:credit?.code||'',debitId:debit?.id||'',creditId:credit?.id||'',roles,rate:c==='LAK'?1:r.rate||null,bookRate:c==='LAK'?1:r.bookRate||r.rate||null,fixed});
  };
  const carrying=(c,amount,l)=>{const r=Number(l.book_rate_lak||l.fx_rate_lak);if(r>0){const b=basis.get(c)||{amount:0,value:0};b.amount+=amount;b.value+=amount*r;basis.set(c,b);}};
  for(const g of receiptGroups){
   const c=g.currency,remaining=equity('remaining',c);get(c).received+=cents(g.amount);
   if(!g.references.length){pair('Funding received',c,g.amount,receivingAccount(g.destination,c),remaining,['asset','remaining']);continue;}
   let received=0;
   for(const ref of g.references){
    const j=posted.get(ref),key=ref+':'+c;
    if(!j||claimed.has(key))throw Error('Check the receipt reference '+ref+': it must identify one posted receipt, counted once.');
    claimed.add(key);
    const current=summaries.get(ref).received.get(c)||0;
    const old=j.journal_lines.filter(l=>l.currency_code===c&&code(l)===codes.original[c]&&Number(l.credit)>0);
    received+=current+old.reduce((n,l)=>n+cents(l.credit),0);
    for(const l of j.journal_lines.filter(l=>l.currency_code===c&&code(l)===remaining.code&&!summaries.get(ref).paired.has(l)&&Number(l.credit)>0))carrying(c,Number(l.credit),l);
    for(const l of old){carrying(c,Number(l.credit),l);pair('Reclassify posted support · '+ref,c,l.credit,equity('original',c),remaining,['original','remaining'],rateOf(l),true);}
    notes.push('Receipt already posted in '+ref+'.');
   }
   if(received!==cents(g.amount))throw Error('The '+c+' receipt in '+g.references.join(' / ')+' does not match this saved report.');
  }
  const spends=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='spend');
  const explicit=spends.some(m=>m.ownerAmount!=null&&m.ownerAmount!=='');
  if(explicit&&spends.some(m=>m.ownerAmount==null||m.ownerAmount===''))throw Error('Complete the owner-funded share on each spending row, including zero for other funding.');
  if(!explicit&&(d.movements||[]).some(m=>BudgetReport290.kind(m)==='receipt'&&m.ownerSource==='other'))throw Error('Enter the owner-funded share for spending paid from mixed funding sources.');
  for(const m of spends){
   if(explicit)BudgetOwnerBalance.validateShare(m);
   const c=explicit?m.ownerCurrency:m.currency,n=explicit?Number(m.ownerAmount):BudgetReport290.expenseAmount(m);
   get(c).used+=cents(n);
  }
  if(!explicit)for(const m of d.movements||[])if(BudgetReport290.kind(m)==='coverage')get(m.currency).used-=cents(m.inflow);
  // Group split slips from the same posted conversion before matching the bridge.
  const fxGroups=new Map();
  for(const f of d.conversions||[]){
   const references=refs(f.evidence);
   if(references.length!==1)throw Error('Link each currency exchange to its posted journal before preparing owner support.');
   if(f.currency===f.target)throw Error('Choose two different exchange currencies.');
   const key=JSON.stringify([references[0],f.currency,f.target]);
   if(!fxGroups.has(key))fxGroups.set(key,{ref:references[0],from:f.currency,to:f.target,out:0,in:0});
   const g=fxGroups.get(key);g.out+=cents(f.amount);g.in+=cents(BudgetReport290.conversionAmount(f));
  }
  const expected=new Map(),already=new Map();
  const addFlow=(map,x)=>{const k=flowKey(x.code,x.currency,x)+':'+x.out;const v=map.get(k)||{...x,amount:0,refs:[]};v.amount+=cents(x.amount);if(x.ref)v.refs.push(x.ref);map.set(k,v);};
  for(const [ref,s] of summaries)for(const x of s.exchanges)addFlow(already,{...x,ref});
  function bankBridge(j,c,n,side){
   const s=summaries.get(j.entry_no),ls=j.journal_lines.filter(l=>l.currency_code===c&&bridges.has(code(l))&&!s.paired.has(l));
   const candidates=ls.filter(l=>cents(l[side])===n&&!/valuation|technical|carrying|book.rate|historical|exchange gain|exchange loss|rounding/i.test(l.description||''));
   const unique=new Map(candidates.map(l=>[flowKey(code(l),c,rateOf(l)),l]));
   if(unique.size!==1)throw Error('Check the '+c+' exchange amount and original bridge in '+j.entry_no+'. No second bank movement will be prepared.');
   const l=[...unique.values()][0];return {...rateOf(l),code:code(l),currency:c};
  }
  for(const g of fxGroups.values()){
   const j=posted.get(g.ref);if(!j||g.out<=0||g.in<=0)throw Error('Verify the posted currency exchange '+g.ref+'.');
   const source=bankBridge(j,g.from,g.out,'debit'),target=bankBridge(j,g.to,g.in,'credit');
   addFlow(expected,{...source,amount:g.out/100,out:true,ref:g.ref});
   addFlow(expected,{...target,amount:g.in/100,out:false,ref:g.ref});
   get(g.from).exchangedOut+=g.out;get(g.to).exchangedIn+=g.in;
   carrying(g.to,g.in/100,{book_rate_lak:target.bookRate});
  }
  for(const [k,v] of already)if(v.amount>(expected.get(k)?.amount||0))throw Error('The referenced journals contain an exchange allocation not matched by this report. Review its saved exchange references.');
  for(const [k,x] of expected){
   const n=(x.amount-(already.get(k)?.amount||0))/100;
   const bridge=AccountingStore.accounts.find(a=>a.code===x.code&&a.currency===x.currency&&a.isPosting!==false);
   if(!bridge)throw Error('Refresh the chart to load the original FX bridge '+x.code+'.');
   const remaining=equity('remaining',x.currency),label='Currency transfer '+(x.out?'out':'in')+' · '+[...new Set(x.refs)].join(' / ');
   pair(label,x.currency,n,x.out?remaining:bridge,x.out?bridge:remaining,x.out?['remaining','bridge']:['bridge','remaining'],x,true);
  }
  for(const [c,t] of totals){
   if(t.used<0)throw Error('Company coverage exceeds '+c+' spending. Review the owner-funded share.');
   const used=[...summaries.values()].reduce((n,s)=>n+(s.used.get(c)||0),0),left=t.used-used;
   if(left<0)throw Error('The referenced journals already allocate more '+c+' as Used than this report. Correct the existing allocation before posting another.');
   const b=basis.get(c),r=b?.amount?b.value/b.amount:null;
   pair('Fund used',c,left/100,equity('remaining',c),equity('used',c),['remaining','used'],{rate:r,bookRate:r});
  }
  if(!pairs.length)throw Error('The referenced journals already record this report’s full owner-support allocation.');
  const summary=[...totals].map(([c,t])=>c+' '+formatAppNumber(t.received/100)+' received · '+formatAppNumber(t.used/100)+' used · '+formatAppNumber((t.received+t.exchangedIn-t.exchangedOut-t.used)/100)+' remaining');
  return {pairs,notice:[...summary,...notes].join(' '),fingerprint:evidence.fingerprint||null};
 }
 function validate(pair,lines){
  if(lines.length!==2||lines.some(l=>l.currency_code!==pair.currency))return false;
  if(!(Number(lines[0].debit)>0)||Number(lines[0].credit)||!(Number(lines[1].credit)>0)||Number(lines[1].debit)||cents(lines[0].debit)!==cents(lines[1].credit))return false;
  if(pair.fixed&&(cents(lines[0].debit)!==cents(pair.amount)||lines.some(l=>pair.rate&&Number(l.fx_rate_lak)!==pair.rate||pair.bookRate&&Number(l.book_rate_lak||l.fx_rate_lak)!==pair.bookRate)))return false;
  return pair.roles.every((role,i)=>{
   const a=AccountingStore.accounts.find(a=>a.id===lines[i].account_id);
   if(role==='asset')return regular(a,'ASSET',pair.currency);
   if(role==='bridge'||role==='original')return a?.id===(i?pair.creditId:pair.debitId);
   return a?.id===equity(role,pair.currency).id;
  });
 }
 return {groups,evidence,plan,validate};
})();
// Follow posted support in each native currency. A verified exchange moves
// Remaining between currencies; cash handovers are not a second use.
const BudgetOwnerBalance=(()=>{
 const cents=n=>Math.round(Number(n)*100);
 const refs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const receipts=d=>(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt');
 const allocationRefs=d=>new Set([
  ...(d.conversions||[]).flatMap(fx=>refs(fx.evidence)),
  ...(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='spend').flatMap(m=>refs(m.reference))
 ]);
 function receiptRefs(m,d,list){
  const own=refs(m.reference);
  return own.length||list.length!==1?own:refs(d.receiptReference290);
 }
 let client,owner,cache=new Map();
 async function load(records,{fresh=false}={}){
  if(client!==ojmDb||owner!==liveProfile?.id){client=ojmDb;owner=liveProfile?.id;cache=new Map();}
  const session=cache,now=Date.now();
  const ids=[...new Set(records.map(r=>r.id).filter(Boolean))].sort();
  const numbers=[...new Set(records.flatMap(r=>{const list=receipts(r.data);return [...list.flatMap(m=>receiptRefs(m,r.data,list)),...allocationRefs(r.data)];}))].sort();
  if(!ids.length&&!numbers.length)return {amounts:[],links:{}};
  const key=JSON.stringify([ids,numbers]);
  const previous=session.get(key);
  if(previous&&(!previous.done||!fresh&&now-previous.time<30000))return previous.promise;
  for(const [k,v] of session)if(v.done&&now-v.time>=30000)session.delete(k);
  const slot={time:now,done:false};
  slot.promise=(async()=>{
   try{
    const {data,error}=await client.rpc('budget_owner_equity_evidence',{p_refs:numbers,p_reports:ids});
    if(error||!Array.isArray(data?.amounts)||!data.links)throw Error('Owner support journals unavailable.');
    return data;
   }catch{return null;}
   finally{slot.done=true;}
  })();
  session.set(key,slot);return slot.promise;
 }
 function calculate(d,id,evidence){
  const rows=new Map(),groups=new Map(),eligible=new Set(),eligibleEntries=new Set(),allocations=allocationRefs(d),problems=new Set(),uncertain=new Set();
  const get=c=>{
   if(!rows.has(c))rows.set(c,{currency:c,received:0,used:0,postedReceived:0,postedUsed:0,exchangedIn:0,exchangedOut:0,refs:new Set(),posted:false});
   return rows.get(c);
  };
  const list=receipts(d);
  for(const m of list){
   const references=receiptRefs(m,d,list).sort();
   if(m.ownerSource==='other')continue;
   const key=JSON.stringify([references,m.currency]);
   if(!groups.has(key))groups.set(key,{references,currency:m.currency,amount:0,explicit:0});
   const g=groups.get(key);g.amount+=cents(m.inflow);
   if(m.ownerSource==='owner')g.explicit+=cents(m.inflow);
  }
  const posted=evidence?.amounts||[],linked=evidence?.links?.[id];
  for(const {references,currency,amount,explicit} of groups.values()){
   const matches=references.map(ref=>posted.find(l=>l.entry_no===ref&&l.currency===currency&&Number(l.received)>0));
   const verified=references.length>0&&matches.every(Boolean)&&matches.reduce((sum,l)=>sum+cents(l.received),0)===amount&&
    references.every(ref=>!eligible.has(JSON.stringify([ref,currency])));
   if(verified){
    const r=get(currency);r.received+=amount;r.postedReceived+=amount;r.posted=true;
    for(const ref of references){r.refs.add(ref);eligible.add(JSON.stringify([ref,currency]));eligibleEntries.add(ref);}
   }else{
    if(explicit)get(currency).received+=explicit;
    if(matches.some(Boolean))problems.add(currency);
    if(explicit<amount)uncertain.add(currency);
   }
  }
  for(const l of posted){
   const key=JSON.stringify([l.entry_no,l.currency]);
   if(!eligible.has(key)&&!eligibleEntries.has(l.entry_no)&&!allocations.has(l.entry_no)&&l.entry_no!==linked)continue;
   const r=get(l.currency);r.refs.add(l.entry_no);r.posted=true;
   // A utilization journal may itself record the receipt for the first time.
   if(l.entry_no===linked&&!eligible.has(key)&&Number(l.received)){
    r.postedReceived+=cents(l.received);
    if(!r.received)r.received=cents(l.received);
   }
   r.exchangedIn+=cents(l.exchanged_in||0);r.exchangedOut+=cents(l.exchanged_out||0);
   if(cents(l.debited)!==cents(l.used)+cents(l.exchanged_out||0))problems.add(l.currency);
   else r.postedUsed+=cents(l.used);
  }
  const spends=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='spend');
  const complete=spends.every(m=>m.ownerAmount!=null&&m.ownerAmount!==''&&Number.isFinite(Number(m.ownerAmount)));
  for(const m of spends)if(Number(m.ownerAmount)>0)get(m.ownerCurrency||m.currency).used+=cents(m.ownerAmount);
  for(const r of rows.values()){
   const conflict=problems.has(r.currency)||r.postedUsed>0&&!r.received&&!r.exchangedIn,reviewed=complete&&(spends.length>0||!r.postedUsed)&&!uncertain.has(r.currency);
   r.basis=conflict?'Check journal match':reviewed?'Report entries':r.posted?'Posted equity':'Spending match open';
   const used=conflict?null:reviewed?r.used:r.posted?r.postedUsed:null;
   r.balance=used==null?null:r.received+r.exchangedIn-r.exchangedOut-used;
   r.used=used;
   r.difference=reviewed&&r.posted&&(r.used!==r.postedUsed||r.received!==r.postedReceived);
   if(r.posted&&!reviewed&&r.balance>0&&!conflict){
    const relinquished=(d.movements||[]).filter(m=>BudgetReport290.kind(m)==='refund'&&m.currency===r.currency).reduce((sum,m)=>sum+cents(m.outflow),0);
    if(relinquished!==r.balance)r.basis+=' · use still to match';
   }
   if(!evidence&&reviewed)r.basis+=' · equity unavailable';
   if(r.posted&&!reviewed&&r.received!==r.postedReceived){r.basis='Receipts partly matched';r.balance=null;}
  }
  return {rows,uncertain,evidence};
 }
 function render(result,compact=false){
  const {rows,evidence,uncertain}=result,report=BudgetReport290,esc=s=>escapeHtml(String(s));
  const amount=(currency,n)=>n==null?'—':report.amountHtml(currency,n/100);
  const codes=report.orderedUnits(rows.keys());
  if(compact)return codes.length?codes.map(c=>amount(c,rows.get(c).balance)).join('<br>'):'—';
  const body=codes.map(c=>{
   const r=rows.get(c);
   const note=[r.basis,...r.refs].map(esc).join(' · ');
   const ledger=r.difference?'<br>Posted equity remaining '+amount(c,r.postedReceived+r.exchangedIn-r.exchangedOut-r.postedUsed):'';
   const exchanged='In '+amount(c,r.exchangedIn)+'<br>Out '+amount(c,r.exchangedOut);
   return [esc(c),'<strong>'+amount(c,r.balance)+'</strong>',amount(c,r.received),exchanged,amount(c,r.used),note+ledger];
  });
  const notice=!codes.length?(evidence?'No owner receipt has been identified for this report.':'Posted owner support could not be verified.'):
   uncertain.size?'Receipts without a verified owner source are excluded.':'';
  return section82('Owner support remaining', (body.length?table82(['Currency','Remaining','Received','Exchanged','Used','Basis / journal'],body):'')+
   (notice?'<p>'+esc(notice)+'</p>':''));
 }
 function closing(result){
  const report=BudgetReport290,codes=report.orderedUnits(result.rows.keys());
  const cells=codes.map(c=>{
   const r=result.rows.get(c);
   return r.balance==null?escapeHtml(c)+' —':report.amountHtml(c,r.balance/100);
  });
  return '<p class="owner-support-closing"><strong>Closing owner support remaining</strong> &nbsp; '+(cells.join(' · ')||'Awaiting verification')+'</p>';
 }
 function validateShare(m){
  const n=Number(m.ownerAmount);
  if(!m.ownerCurrency||!Number.isFinite(n)||n<0||!Number.isSafeInteger(cents(n))||Math.abs(n*100-cents(n))>0.00001)
   throw Error('Enter the owner-funded amount to two decimal places. Enter zero for another funding source, or leave it blank for review.');
  if(m.ownerCurrency===m.currency&&cents(n)>cents(m.outflow))throw Error('The owner-funded amount exceeds the spending in this currency.');
 }
 return {load,calculate,render,closing,validateShare};
})();
// Wording revisions apply to a single saved snapshot. All numeric fields come from that snapshot.
const BudgetReportWording=(()=>{
 const oldProtocol='Gross payroll includes employee deductions. Only the employer portion of PIT and social security adds to fund used. Cash balances use board disbursements in the original currencies.';
 const select='*,budget_report_wording(report_version,revision,notes,descriptions)';
 function data(record){
  const source=record.data,wording=record.budget_report_wording;
  if(!wording||wording.report_version!==record.version)return source;
  const d=structuredClone(source);
  if(source.mode==='utilization')d.printNotes290=wording.notes.trim()===oldProtocol?'':wording.notes;
  else d.notes=wording.notes;
  (d.movements||[]).forEach((m,i)=>{
   if(Object.hasOwn(wording.descriptions,i)){
    // Earlier reports used the original source and description to identify coverage.
    m.type290=BudgetReport290.kind(m);
    m.description290=wording.descriptions[i];
   }
  });
  if(d.document14316?.html){
   const template=document.createElement('template');
   template.innerHTML=documentWorkspace105.sanitize(d.document14316.html);
   const field=template.content.querySelector('[data-budget-field14316="notes"]');
   if(field){field.textContent=d.notes;d.document14316.html=template.innerHTML;}
  }
  return d;
 }
 function edit(record,dialog,check,onSave){
  const d=data(record),esc=s=>escapeHtml(String(s??''));
  const descriptions=(d.movements||[]).map((m,i)=>
   '<label>'+esc([BudgetReport290.labels[BudgetReport290.kind(m)],m.reference,m.destination290||m.account].filter(Boolean).join(' · '))+
   '<textarea rows="2" data-description="'+i+'">'+esc(m.description290)+'</textarea></label>').join('');
  const utilization=d.mode==='utilization';
  const {root}=dialog(utilization?'Additional information':'Edit report wording','<form><label>'+
   (utilization?'Additional information (optional, printed)':'Report notes')+'<textarea rows="4" name="notes">'+esc(utilization?d.printNotes290||'':d.notes)+'</textarea></label>'+
   (descriptions?'<details><summary>Movement descriptions</summary>'+descriptions+'</details>':'')+
   '<div role="status"></div><button type="submit">Save wording</button></form>');
  const form=root.querySelector('form'),status=form.querySelector('[role=status]');
  form.onsubmit=async e=>{
   e.preventDefault();const save=form.querySelector('button[type=submit]');if(save.disabled)return;
   save.disabled=true;status.textContent='Saving…';
   try{
    check();
    const changes={};
    for(const input of form.querySelectorAll('[data-description]')){
     const i=input.dataset.description;
     if(input.value!==(record.data.movements[i].description290||''))changes[i]=input.value;
    }
    const notes=form.elements.notes.value;
    const {data:revision,error}=await ojmDb.rpc('save_budget_report_wording',{
     p_report:record.id,p_version:record.version,p_revision:record.budget_report_wording?.revision||0,p_notes:notes,p_descriptions:changes
    });
    check();if(error)throw Error(error.message);if(!Number.isInteger(revision))throw Error('Wording save was not confirmed. Reopen the report.');
    const saved={...record,budget_report_wording:{report_version:record.version,revision,notes,descriptions:changes}};
    root.resolve108(true);onSave(saved);
   }catch(err){status.textContent=err.message;}finally{save.disabled=false;}
  };
 }
 return {select,data,edit};
})();
/* The normal Post Transaction form and durable journal queue own posting and numbering. */
window.BudgetUtilizationJournal=(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 let prepared=null;
 function snapshot(){return prepared?.owner===liveProfile?.id?structuredClone(prepared):null;}
 function restore(value){
  prepared=value?.owner===liveProfile?.id?value:null;
  $('budgetJournalNotice')?.remove();
  // Keep the prepared journal association without an instructional banner.
 }
 async function lookup(id){
  const {data,error}=await ojmDb.rpc('budget_utilization_journal',{p_report:id});
  if(error)throw Error('The utilization journal reference could not be checked. '+error.message);
  return data?.entry_no?data:null;
 }
 function localJob(id){return window.journalDurable14385?.pending().find(j=>j.id.startsWith('budget-use:'+id+':'));}
 function reference(link){return link?link.entry_no+(link.status==='posted'?'':' ('+link.status+')'):'';}
 async function view(id){
  const actor=liveProfile?.id,db=ojmDb;
  const check=()=>{if(!actor||liveProfile?.id!==actor||ojmDb!==db||!access113.can('journal','view')||window.workspaceRequest138?.target||window.personalJournal1437?.active)throw Error('Open your company journal with View permission.');};
  check();const link=await lookup(id);check();
  if(!link)throw Error('This report has no recorded utilization journal.');
  const {data:e,error}=await db.from('journal_entries').select('id,entry_no,transaction_date,memo,cash_slip_ref,status,journal_lines(line_no,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak,accounts(id,name,code))').eq('entry_no',link.entry_no).maybeSingle();
  check();if(error)throw error;if(!e?.journal_lines?.length)throw Error('The linked journal could not be loaded.');
  const lines=[...e.journal_lines].sort((a,b)=>a.line_no-b.line_no).map(l=>({id:e.entry_no,dbEntryId:e.id,date:l.line_date||e.transaction_date,account:[l.accounts?.code,l.accounts?.name].filter(Boolean).join(' — '),currency:l.currency_code,memo:l.description||'',generalMemo:e.memo,cashSlipRef:e.cash_slip_ref,fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak,debit:Number(l.debit),credit:Number(l.credit),archived:(PeriodReview.periods[e.transaction_date.slice(0,7)]?.status||'open')!=='open'}));
  showJournalSource69(encodeURIComponent(e.entry_no),lines);
  document.getElementById('source69').style.zIndex='16000';
  if(e.status!=='posted')document.querySelector('#source69 h3').textContent='Journal Entry '+e.entry_no+' · '+e.status;
 }
 function amounts(data){
  const totals=[...BudgetReport290.balances(data)];
  if(totals.some(([,t])=>t.allocated===null))throw Error('Enter the missing funding equivalent before preparing the utilization journal.');
  return totals.map(([c,t])=>[c,Math.round((t.allocated||0)*100)/100]).filter(([,n])=>n>0);
 }
 function open(record,groups=BudgetSupportEquity.groups(record.data),journals=[]){
  if(!access113.can('journal','post')||window.workspaceRequest138?.target)throw Error('Open your company journal with Post permission.');
  const d=record.data;
  const support=BudgetSupportEquity.plan(d,groups,journals);
  const pairs=support.pairs;
  if(!pairs.length)throw Error('Record funding received or actual spending and save the report first.');
  const same=snapshot();
  if(same?.id===record.id&&same.version===record.version){switchTab('journal');showJournalEntry98(true,false);return;}
  const busy=JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment||
   window.personalJournal1437?.active||window.payrollJournal1429?.snapshot()||$('jeGeneralMemo')?.value.trim()||$('journalDocumentRef')?.value.trim()||
   [...document.querySelectorAll('#jeLinesBody input:not(.je-line-date):not([data-line-rate291])')].some(n=>n.value.trim())||
   (window.entry1430?.mode==='single'&&entry1430.read().some(r=>r.source||r.affected||r.amount||r.memo));
  if(busy)throw Error('Save or reset the unfinished Post Transaction entry first.');
  const period=BudgetReport290.period(d);
  const receipts=[...new Set([d.receiptReference290,...d.movements.filter(m=>BudgetReport290.kind(m)==='receipt').map(m=>m.reference)].filter(Boolean))];
  switchTab('journal');showJournalEntry98(true,false);window.entry1430?.setMode('double');setJournalDateMode(false);
  $('jeTransDate').value=d.date;window.datePicker104?.refresh($('jeTransDate'));
  $('jeGeneralMemo').value=['Budget utilization · '+period,d.purpose,'Owner support',receipts.join(' / ')].filter(Boolean).join(' · ');
  const body=$('jeLinesBody');body.replaceChildren();
  const rates={};
  for(const {label,currency,amount:n,debitCode,creditCode,rate,bookRate} of pairs){
   const amount=String(n),description=label+' · '+period+' · '+currency+' '+formatAppNumber(n);
   const fx=rate;
   if(currency!=='LAK'&&fx)rates[currency]=fx;
   for(const [i,code] of [debitCode,creditCode].entries()){
    addJournalLineRow(code||'',description,i===0?amount:'',i===1?{[currency]:amount}:{});
    if(rate){
     body.lastElementChild.dataset.fxRate14383=rate;
     body.lastElementChild.dataset.bookRate14383=bookRate||rate;
    }
   }
  }
  window.JournalFX14383?.restore(rates);calculateJournalBalance();
  restore({owner:liveProfile.id,id:record.id,version:record.version,period,pairs,fingerprint:support.fingerprint,templateVersion:2,notice:support.notice});
  $('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.drafts1427?.flush();
 }
 function postingKey(entries){
  const source=snapshot();if(!source)return null;
  if(entries.length!==1)throw Error('Post the utilization summary as one transaction.');
  const lines=entries[0].p_lines;
  // Existing saved drafts have only the spending pairs from the previous release.
  const expected=source.pairs||source.used.map(([currency,amount])=>({currency,amount}));
  const valid=lines.length===2*expected.length&&expected.every((pair,i)=>{
   const entered=lines.slice(2*i,2*i+2);
   if(pair.roles)return BudgetSupportEquity.validate(pair,entered);
   return entered.every(l=>l.currency_code===pair.currency)&&entered[0].account_id!==entered[1].account_id&&
    entered.some(l=>l.debit===pair.amount&&!l.credit)&&entered.some(l=>l.credit===pair.amount&&!l.debit);
  });
  if(!valid)throw Error('Keep the prepared currency pairs balanced and use their corresponding equity accounts. Posted receipt reclassifications and verified exchange amounts/rates must stay unchanged.');
  if(source.templateVersion===2&&!/^[a-f0-9]{32}$/.test(source.fingerprint||''))throw Error('Reopen the saved report to verify its source journals before posting.');
  return 'budget-use:'+source.id+':'+source.version+(source.fingerprint?':'+source.fingerprint:'');
 }
 return {open,view,amounts,lookup,localJob,reference,snapshot,restore,postingKey};
})();
/* Requests and received-fund finalization share the operational-report lifecycle. */
(()=>{'use strict';
function validDate14317(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
const esc=v=>escapeHtml(String(v??'')),clone=x=>structuredClone(x),num=x=>Number(x)||0;
let finalTab='submitted',historyTab='journal',allocation=null,allocationRecord=null,fundPopup=null,actor='',busy=false,editMove=null,editFx=null,actorClient=null,allocationRequest14370=0;
const report=BudgetReport290,journal=BudgetUtilizationJournal;
let activityPopup=null;
const confirmedFinals=new Map();
let checkedOnVisit=new Set();
let budgetListMonth='',budgetListOwner='';
function budgetMonth(record){
 const month=String(record.data?.budgetMonth290||record.data?.date||'').slice(0,7);
 return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'';
}
function budgetRows(){
 return Work82.reports.filter(r=>r.data?.kind==='finance').map(r=>confirmedFinals.get(r.id)||r)
  .sort((a,b)=>budgetMonth(b).localeCompare(budgetMonth(a))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(a.id).localeCompare(String(b.id)));
}
function budgetMonthRows(rows,month){return month?rows.filter(r=>budgetMonth(r)===month):rows;}

const isFinal=r=>!r?._pending14333&&r?.data?.mode==='utilization'&&r.data.status==='finalized';
function rememberFinal(record){
 if(!isFinal(record))return;
 confirmedFinals.set(record.id,record);
 const i=Work82.reports.findIndex(r=>r.id===record.id);
 if(i<0)Work82.reports.push(record);
 else if(!Work82.reports[i]._pending14333)Work82.reports[i]=record;
}
function checkListedDrafts(rows,notice){
 if(window.offline14239?.offline()||!document.querySelector('#transactions-budget14313.active'))return;
 const visit=checkedOnVisit,check=context(),client=ojmDb;
 const ids=rows.filter(r=>r.data.mode==='utilization'&&!r._pending14333&&!isFinal(r)&&!visit.has(r.id)).map(r=>r.id);
 for(let i=0;i<ids.length;i+=60){
  const batch=ids.slice(i,i+60);batch.forEach(id=>visit.add(id));
  (async()=>{
   const {data,error}=await client.from('operational_reports').select(BudgetReportWording.select).in('id',batch)
    .eq('data->>kind','finance').eq('data->>mode','utilization').eq('data->>status','finalized').setHeader('x-ojm-database-only','1');
   check();if(visit!==checkedOnVisit||error||!Array.isArray(data))return;
   const finals=data.filter(r=>batch.includes(r.id)&&isFinal(r));
   finals.forEach(rememberFinal);
   if(finals.length&&document.querySelector('#transactions-budget14313.active'))renderRequest(notice);
  })().catch(()=>{/* Opening a record retries its status check directly. */});
 }
}
let selectedParent='',requestEditor=null;
const requests=()=>budgetRows().filter(r=>r.data.mode!=='utilization'&&!r.data.requestId14316);
function guard(){if(!liveProfile?.id||liveProfile.role!=='admin'||!access113.can('transactions-budget14313'))throw Error('Administrator access is required.');if(actor!==liveProfile.id||actorClient!==ojmDb){if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}confirmedFinals.clear();checkedOnVisit=new Set();selectedParent='';actor=liveProfile.id;actorClient=ojmDb;allocation=null;allocationRecord=null;clearFundPopup();editMove=null;editFx=null;allocationRequest14370++}return actor}
function context(){const owner=guard(),client=ojmDb;return()=>{if(owner!==liveProfile?.id||client!==ojmDb)throw Error('Your sign-in changed. Reopen the budget record.');guard();}}
const button=(label,fn)=>`<button type="button" onclick="${esc('budgetWorkflow14316.'+fn)}">${label}</button>`;
function captureFund(){
 const form=fundPopup?.querySelector('#fundHeader290');
 if(form&&allocation&&form.dataset.parent===(allocation.requestId14316||'')&&form.dataset.record===(allocationRecord?.id||''))Object.assign(allocation,Object.fromEntries(new FormData(form)));return allocation;
}
function clearFundPopup(){
 closeActivity();const root=fundPopup;fundPopup=null;root?.resolve108(false);
 allocation=null;allocationRecord=null;
}
function canLeaveFund(){
 const host=fundPopup?.querySelector('#budgetFunds290');
 if(!host||!allocation)return true;
 captureFund();
 if(editorData(allocation)===host.savedValues&&!host.worksheetChanged())return true;
 if(!host.discardPrompt)host.discardPrompt=ui108.modal('Unsaved changes','<p>Discard the changes to this fund utilization report?</p>',
  [{label:'Keep editing',value:false,primary:true},{label:'Discard changes',value:true}]).finally(()=>{host.discardPrompt=null;});
 return host.discardPrompt;
}
async function closeFundEditor(){
 const root=fundPopup,documentBeingEdited=allocation;
 if(!root||busy||!await canLeaveFund()||root!==fundPopup||documentBeingEdited!==allocation||busy)return;
 allocationRequest14370++;clearFundPopup();
}
function newUtilization(){
 const today=today82();
 return {kind:'finance',mode:'utilization',status:'draft',budgetMonth290:today.slice(0,7),
  date:today,purpose:'',recipient:'',lines:[],movements:[],conversions:[],notes:'',printNotes290:''};
}
function showFunds(open=true){
 guard();if(busy)return;
 if(!open)return closeFundEditor();
 if(fundPopup?.isConnected)return;
 if(selectedParent)return startAllocation(selectedParent);
 if(!allocation){
  const saved=requests();
  if(saved.length===1)return startAllocation(saved[0].id);
  if(saved.length>1)return chooseRequest();
  allocation=newUtilization();
 }
 presentFundEditor();
}
function pinReportToolbar(root,toolbar){
 const header=root.querySelector('.ui-dialog108>header');
 root.classList.add('fund-report-layout');
 header.querySelector('.fund-report-toolbar')?.remove();
 header.insertBefore(toolbar,header.querySelector('[data-dismiss]'));
}
function reportToolbar(root,actions,activities=''){
 const toolbar=document.createElement('div');toolbar.className='fund-report-toolbar';
 toolbar.innerHTML='<div role="group" aria-label="Report actions">'+actions+'</div>'+
  (activities?'<div role="group" aria-label="Spending and funding actions">'+activities+'</div>':'');
 pinReportToolbar(root,toolbar);
 return toolbar;
}
function presentFundEditor(){
 if(fundPopup?.isConnected){closeActivity();renderAllocation();return;}
 const {root}=budgetDialog(report.title,'<div id="budgetFunds290"></div>');
 root.classList.add('fund-popup326');fundPopup=root;
 root.querySelector('[data-dismiss]').onclick=closeFundEditor;
 renderAllocation();
}
function requestData(){return requestEditor?.data||null}
function refreshCategories(){
 const list=requestEditor?.root.querySelector('#budgetCategories14321');
 if(list)list.innerHTML=budget14313.categoryOptions(requestEditor.data.lines).map(([v])=>'<option value="'+esc(v)+'"></option>').join('');
 const names=requestEditor?.root.querySelector('[data-categories]');
 if(names)names.textContent=(budget14313.config().categories||[]).join(' · ');
}
function totals327(d,asLines=false){
 const sums=new Map();
 for(const line of d.lines||[])sums.set(line.currency,(sums.get(line.currency)||0)+Math.round(Number(line.amount)*100));
 const codes=report.orderedUnits(sums.keys()),value=c=>sums.get(c)/100;
 return (asLines?report.amountLines(codes,value):codes.map(c=>report.currencyAmount(c,value(c))).join(' · '))||'—';
}
function utilizationHeaderTotals(reports){
 const totals=new Map(),keys=['requested','approved','receipt','convertedOut','convertedIn','allocated','fundRemaining'];
 for(const {balances} of reports)for(const [currency,values] of balances){
  if(!totals.has(currency))totals.set(currency,Object.fromEntries(keys.map(key=>[key,0])));
  for(const key of keys)totals.get(currency)[key]=totals.get(currency)[key]===null||values[key]===null?null:totals.get(currency)[key]+Math.round(num(values[key])*100);
 }
 return new Map([...totals].map(([currency,values])=>[currency,Object.fromEntries(keys.map(key=>[key,values[key]===null?null:values[key]/100]))]));
}
function utilizationRegister(reports,rows){
 const totals=utilizationHeaderTotals(reports),codes=report.orderedUnits(totals.keys());
 const columns=[['Month'],['Purpose'],['Status'],['Requested','requested'],['Approved','approved'],['Received','receipt'],['Exchanged out','convertedOut'],['Exchanged in','convertedIn'],['Used','allocated'],['Remaining','fundRemaining'],['Action']];
 let table=table82(columns.map(([label])=>label),rows).replace('<table>','<table id="savedFundReports" class="budget-saved-table">');
 for(const [label,key] of columns){
  const summary=key?(report.fundingAmountLines(codes,c=>totals.get(c)[key])||'—'):label==='Purpose'?'Total · '+reports.length+' '+(reports.length===1?'report':'reports'):'';
  table=table.replace('<th>'+label+'</th>','<th data-resize-label="'+label+'"><span class="fund-register-label">'+label+'</span><div class="fund-register-total"'+(key?' aria-label="Total '+label.toLowerCase()+'"':'')+'>'+summary+'</div></th>');
 }
 return table;
}
function renderRequest(notice=''){
 guard();
 const allRows=budgetRows();
 if(budgetListOwner!==liveProfile.id){budgetListOwner=liveProfile.id;budgetListMonth='';}
 const months=[...new Set(allRows.map(budgetMonth).filter(Boolean))];
 if(budgetListMonth&&!months.includes(budgetListMonth))budgetListMonth='';
 const rows=budgetMonthRows(allRows,budgetListMonth);
 checkListedDrafts(rows,notice);
 const monthFilter='<label><select id="budgetListMonth" aria-label="Month filter"><option value="">Month filter</option>'+months.map(month=>'<option value="'+month+'"'+(month===budgetListMonth?' selected':'')+'>'+esc(report.period({budgetMonth290:month}))+'</option>').join('')+'</select></label>';

 const requestRows=rows.filter(r=>r.data.mode!=='utilization').map(r=>[esc(report.period(r.data)),esc(r.data.recipient),esc(r.data.purpose),totals327(r.data,true),'<div class="budget-row-actions">'+button('Open',`editRequest(${JSON.stringify(r.id)})`)+button('Utilization',`startAllocation(${JSON.stringify(r.id)})`)+'</div>']);
 const reports=rows.filter(r=>r.data.mode==='utilization').map(record=>({record,balances:report.balances({...record.data,lines:record.data.lines||[]})}));
 const utilization=reports.map(({record:r,balances})=>{
  const codes=report.orderedUnits(balances.keys());
  const amounts=key=>report.fundingAmountLines(codes,c=>balances.get(c)[key]);
  const remaining=amounts('fundRemaining');
  const save=window.localFirst14333?.budgetSave(r.id);
  return [esc(report.period(r.data)),'<span class="fund-register-purpose" title="'+esc(r.data.purpose)+'">'+esc(r.data.purpose)+'</span>',esc(r._pending14333?(save?.status||'Waiting for confirmation'):r.data.status||'Draft'),amounts('requested'),amounts('approved'),amounts('receipt'),amounts('convertedOut'),amounts('convertedIn'),amounts('allocated'),remaining,
   button(r._pending14333?'Save status':isFinal(r)?'View':'Edit',`openAllocation(${JSON.stringify(r.id)})`)];
 });
 const content=section82('Saved budget requests',table82(['Month','Recipient','Purpose','Requested','Action'],requestRows).replace('<table>','<table id="savedBudgetRequests" class="budget-saved-table">'))+
  section82('Fund utilization reports',utilizationRegister(reports,utilization));
 mount82('transactions-budget14313','Budget Requests','',notice+content+historyImportButton(),monthFilter+button('Fund utilization','showFunds()')+button('New Report','newRequest()')+button('Print / PDF','printPicker()')+(access113.can('transactions-all')?'<button type="button" data-book-history="budget">History</button>':''));
 document.getElementById('budgetListMonth').onchange=e=>{budgetListMonth=e.target.value;renderRequest();};
}
function printPicker(){
 guard();const rows=budgetRows();
 const {root}=budgetDialog('Print / PDF',rows.length?table82(['Month','Report','Purpose',''],rows.map(r=>[esc(report.period(r.data)),r.data.mode==='utilization'?'Fund utilization':'Budget request',esc(r.data.purpose),'<button type="button" data-print-record="'+esc(r.id)+'">Print / PDF</button>'])):'<p>Save a budget request or utilization report to print it here.</p>');
 root.querySelectorAll('[data-print-record]').forEach(b=>b.onclick=()=>{root.resolve108(false);void printRecord(b.dataset.printRecord)});
}
function newRequest(){
 guard();selectedParent='';openRequestForm({mode:'request',budgetMonth290:today82().slice(0,7),date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]},null);
}
async function editRequest(id){
 try{const check=context(),record=await editableRecord(id);check();if(record.data.mode==='utilization')return openAllocation(id);selectedParent=id;openRequestForm(clone(BudgetReportWording.data(record)),record)}catch(e){showCenterStatus(e.message,true)}
}
function templateApplied(){
 const e=requestEditor;if(!e)return;
 for(const k of ['purpose','recipient','notes'])e.details.elements[k].value=e.data[k]||'';
 e.items.reset();delete e.items.dataset.editKey;updateItems(e);
}
function updateItems(e){
 e.root.querySelector('[data-item-list]').innerHTML=report.items(e.data.lines,true);
 e.items.querySelector('[type=submit]').textContent=e.items.dataset.editKey?'Update item':'Add item';
 e.items.querySelector('[data-cancel-item]').hidden=!e.items.dataset.editKey;
 refreshCategories();
}
function openRequestForm(data,record){
 if(requestEditor)return;
 const check=context();
 const {root,pending}=budgetDialog(record?'Budget request':'New Report',`
 <div class="request-tabs327" role="group" aria-label="Request sections">
 <button type="button" data-section="details">Request details</button><button type="button" data-section="items">Budget items</button><button type="button" data-section="messages">Messages</button></div>
 <form data-pane="details" class="fields82 request-fields327">${field82('Budget month','budgetMonth290',data.budgetMonth290||String(data.date).slice(0,7),'month','required')}${field82('Recipient','recipient',data.recipient,'text','required')}${field82('Purpose','purpose',data.purpose,'text','required')}<label>Notes<textarea name="notes" rows="3">${esc(data.notes)}</textarea></label></form>
 <section data-pane="items" hidden><div class="request-tools327">${budget14313.tools()}<button type="button" data-manage>Categories</button></div>
 <form data-category-form hidden><label>New category<input name="newCategory" required maxlength="100"></label><button type="submit">Save category</button><p data-categories></p></form>
 <form data-item-form class="request-fields327">${budget14313.categoryField()}${field82('Item','description','','text','required')}${field82('Amount','amount','','number','min="0.01" step="0.01" required')}${select82('Currency','currency',budget14313.config().currency,budget14313.currencyOptions(data.lines))}<div><button type="submit">Add item</button> <button type="button" data-cancel-item hidden>Cancel edit</button></div></form>
 <div data-item-list class="data-table82"></div></section><section data-pane="messages" hidden></section>
 <div class="request-footer327"><span role="status" aria-live="polite"></span><button type="button" data-save-request>Save request</button></div>`);
 root.classList.add('budget-request327');
 const e={root,data,record,draftId:record?.id||crypto.randomUUID(),base:JSON.stringify(data),details:root.querySelector('[data-pane=details]'),items:root.querySelector('[data-item-form]'),saving:false};requestEditor=e;
 const status=root.querySelector('[role=status]'),panes=root.querySelectorAll('[data-pane]'),saveButton=root.querySelector('[data-save-request]');
 if(record&&(record.budget_report_wording||budgetRows().some(r=>r.data.requestId14316===record.id))){
  const edit=document.createElement('button');edit.type='button';edit.textContent='Edit report wording';e.details.append(edit);
  edit.onclick=()=>BudgetReportWording.edit(e.record,budgetDialog,check,saved=>{
   cacheWording(saved);e.record=saved;data.notes=BudgetReportWording.data(saved).notes;e.details.elements.notes.value=data.notes;
   status.textContent='Wording saved.';
  });
  e.details.elements.notes.readOnly=true;
 }
 const linePending=()=>!!(e.items.dataset.editKey||e.items.elements.category.value.trim()||e.items.elements.description.value.trim()||e.items.elements.amount.value.trim());
 const captureDetails=()=>Object.assign(data,Object.fromEntries(new FormData(e.details)));
 function select(name){
  captureDetails();
  if(name==='messages'&&linePending()){select('items');status.textContent='Add or finish editing the item to include it in the messages.';return}
  for(const pane of panes)pane.hidden=pane.dataset.pane!==name;
  saveButton.hidden=name!=='items';
  root.querySelectorAll('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===name)));
  if(name==='messages')budgetMessages14314.render(root.querySelector('[data-pane=messages]'),data);
 }
 e.details.oninput=captureDetails;e.details.onchange=captureDetails;e.details.onsubmit=event=>{event.preventDefault();select('items')};
 root.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>select(b.dataset.section));
 const categories=root.querySelector('[data-category-form]');root.querySelector('[data-manage]').onclick=()=>{categories.hidden=!categories.hidden;if(!categories.hidden)categories.elements.newCategory.focus()};
 categories.onsubmit=async event=>{event.preventDefault();const b=categories.querySelector('button');b.disabled=true;try{check();const name=categories.elements.newCategory.value.trim();await budget14313.addCategory(name);check();if(requestEditor!==e)return;categories.reset();status.textContent='Category saved.'}catch(err){status.textContent=err.message}finally{b.disabled=false}};
 function resetItem(){e.items.reset();delete e.items.dataset.editKey;updateItems(e)}
 e.items.querySelector('[data-cancel-item]').onclick=resetItem;
 function applyItem(){
  check();const f=e.items.elements,amount=movementAmount(f.amount),values={category:f.category.value.trim(),description:f.description.value.trim(),currency:f.currency.value,amount};
  if(!e.items.reportValidity()||!values.category||!values.description||!(amount>0)||!Number.isSafeInteger(Math.round(amount*100))){status.textContent='Enter a category, an item and a positive amount.';return false}
  const line=data.lines.find(l=>l.key117===e.items.dataset.editKey);if(line)Object.assign(line,values);else data.lines.push({...values,key117:crypto.randomUUID()});
  resetItem();status.textContent='';return true;
 }
 e.items.onsubmit=event=>{event.preventDefault();applyItem()};
 for(const l of data.lines)l.key117||=crypto.randomUUID();
 root.querySelector('[data-item-list]').onclick=async event=>{
  const b=event.target.closest('[data-budget-edit290],[data-budget-delete290]');if(!b)return;
  const l=data.lines.find(l=>l.key117===(b.dataset.budgetEdit290||b.dataset.budgetDelete290));if(!l)return;
  if(b.dataset.budgetDelete290){if(!await ui117.confirm('Remove this budget item?'))return;check();if(requestEditor!==e)return;data.lines=data.lines.filter(row=>row!==l);resetItem();return}
  e.items.dataset.editKey=l.key117;for(const k of ['category','description','currency','amount'])e.items.elements[k].value=k==='amount'&&e.items.elements.amount.type!=='number'?formatAppNumber(l.amount):l[k];
  e.items.elements.currency.dispatchEvent(new Event('change',{bubbles:true}));updateItems(e);e.items.elements.description.focus();
 };
 saveButton.onclick=async()=>{
  if(e.saving)return;captureDetails();
  if(linePending()&&!applyItem())return;
  if(!data.lines.length){status.textContent='Add a budget item before saving.';return}
  if(!e.details.checkValidity()||!data.recipient.trim()||!data.purpose.trim()){select('details');e.details.reportValidity();status.textContent='Complete the request details.';return}
  if(e.record&&e.base===JSON.stringify(data)){root.resolve108(true);return;}
  const content=root.querySelector('.ui-body108');e.saving=true;content.inert=true;status.textContent='Saving request…';
  try{check();const saved=await saveDocument({title:'Budget Request — '+data.purpose,html:requestHTML(data),settings:clone(e.record?.data.document14316?.settings||{}),budget14316:{id:e.record?.id||null,version:e.record?.version,draftId14317:e.draftId,data}});
   check();if(requestEditor!==e)return;
   selectedParent=saved.id;renderRequest();
   root.resolve108(true);
  }catch(err){status.textContent=err.message}finally{content.inert=false;e.saving=false}
 };
 root.addEventListener('click',async event=>{if(!event.target.closest('[data-dismiss]'))return;event.stopImmediatePropagation();event.preventDefault();if(e.saving)return;captureDetails();if((e.base!==JSON.stringify(data)||linePending())&&!await ui117.confirm('Close without saving your request changes?'))return;root.resolve108(false)},true);
 pending.then(()=>{if(requestEditor===e)requestEditor=null});
 updateItems(e);select('details');e.base=JSON.stringify(data);
 budget14313.load(true).then(()=>{if(requestEditor===e){refreshCategories();if(!linePending())e.items.elements.currency.value=budget14313.config().currency}}).catch(err=>{if(requestEditor===e)status.textContent=err.message});
}
function requestHTML(d){const cell=(name,value)=>`<span data-budget-field14316="${name}">${esc(value)}</span>`;return `<h1 style="text-align:center">Budget Request</h1><p>Budget month: ${cell('budgetMonth290',report.period(d))}</p><p>Recipient: ${cell('recipient',d.recipient)}</p><p>Purpose: ${cell('purpose',d.purpose)}</p>${report.items(d.lines)}<p>Notes: ${cell('notes',d.notes)}</p>${report.signature(d)}`;}
const recalculate=report.recalculate;
function parseDocument(model){const template=document.createElement('template');template.innerHTML=model.html;const root=template.content;const tables=[...root.querySelectorAll('table[data-budget-table14316="items"]')];if(!tables.length)throw Error('Keep the budget items table in the document.');const d=clone(model.budget14316.data),keys=new Set();d.lines=tables.flatMap(t=>[...t.querySelectorAll('tbody>tr:not([data-budget-summary290])')]).map(row=>{const cells=[...row.cells].map(c=>c.textContent.trim());if(cells.length!==4)throw Error('Each budget row needs Category, Item, Amount and Currency.');const amount=parseAppNumber(cells[2]);if(!cells[0]||!cells[1]||!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(Math.round(amount*100))||!CurrencyStore.currencies.some(c=>c.code===cells[3]))throw Error('Enter a category, item, positive amount and configured currency in every budget row.');const key=row.dataset.budgetKey14316||crypto.randomUUID();if(keys.has(key))throw Error('Duplicate budget item. Remove the copied row ID or add the item in Budget Requests.');keys.add(key);row.dataset.budgetKey14316=key;return {key117:key,category:cells[0],description:cells[1],amount,currency:cells[3]}});if(!d.lines.length)throw Error('Add at least one budget item.');
 // Older saved editor documents have a date field. New requests carry the date in their record.
 const legacyDate=root.querySelector('[data-budget-field14316="date"]');
 if(legacyDate)d.date=legacyDate.textContent.trim();
 for(const name of ['recipient','purpose','notes']){const field=root.querySelector(`[data-budget-field14316="${name}"]`);if(!field)throw Error('Keep the '+name+' field in the document.');d[name]=field.textContent.trim()}if(!validDate14317(d.date)||!d.recipient||!d.purpose)throw Error('Enter a valid calendar date, recipient and purpose.');const monthText=root.querySelector('[data-budget-field14316="budgetMonth290"]')?.textContent.trim();
 if(monthText!==undefined){
  const named=monthText.match(/^([a-z]+)\s+(\d{4})$/i),months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const ix=named?months.findIndex(m=>m.toLowerCase()===named[1].toLowerCase()):-1;
  const month=ix>=0?named[2]+'-'+String(ix+1).padStart(2,'0'):monthText;
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Enter the budget month as October 2026 or 2026-10.');
  d.budgetMonth290=month;
 }else if(!d.budgetMonth290)d.budgetMonth290=d.date.slice(0,7);
 d.preparedBy=liveProfile.full_name||liveProfile.email;d.kind='finance';d.mode='request';d.movements=[];d.conversions=[];delete d.reviewer;delete d.document14316;delete d.sharedSnapshot14313;delete d.requestId14316;return {data:d,html:documentWorkspace105.sanitize(template.innerHTML)}}
async function editableRecord(id){
 const check=context(),row=Work82.owner===liveProfile?.id&&Work82.reports.find(item=>item.id===id);
 if(window.offline14239?.offline()&&(confirmedFinals.has(id)||row?.data?.kind==='finance'))return confirmedFinals.get(id)||row;
 if(row?._pending14333){
  if(row.data?.mode==='utilization'){
   const {data,error}=await ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('id',id).eq('data->>status','finalized').maybeSingle().setHeader('x-ojm-database-only','1');
   check();if(error)throw error;if(isFinal(data))return data;
  }
  return row;
 }
 return live(id);
}
async function live(id,version){
 const check=context(),q=ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('id',id).single();
 if(!window.offline14239?.offline())q.setHeader('x-ojm-database-only','1');
 const r=await q;check();if(r.error)throw Error(r.error.message||'The saved budget record could not be checked.');
 if(!r.data||r.data.data.kind!=='finance')throw Error('This transaction was deleted, reset or is unavailable. Open a current record from History.');
 if(version!==undefined&&r.data.version!==version)throw Error('This transaction changed elsewhere. Reopen its current saved version.');
 // A newer database draft supersedes a finalized copy retained by this tab.
 const final=confirmedFinals.get(id);
 if(isFinal(r.data))rememberFinal(r.data);
 else if(final&&r.data.version>final.version)confirmedFinals.delete(id);
 const index=Work82.reports.findIndex(item=>item.id===id);
 if(index>=0&&!Work82.reports[index]._pending14333)Work82.reports[index]=r.data;
 return r.data;
}
async function saveDocument(model){
 if(busy)throw Error('A budget save is already in progress.');
 busy=true;try{return await persistDocument(model)}finally{busy=false}
}
function appendedItems(oldData,data){
 for(const key of ['date','budgetMonth290','recipient','purpose','notes']){
  if((oldData[key]||'')!==(data[key]||''))throw Error('Save new items separately from changes to the request details.');
 }
 const remaining=[...data.lines];
 const same=(a,b)=>a.description===b.description&&a.category===b.category&&a.currency===b.currency&&Number(a.amount)===Number(b.amount);
 for(const line of oldData.lines){
  const index=remaining.findIndex(candidate=>(!line.key117||line.key117===candidate.key117)&&same(line,candidate));
  if(index<0)throw Error('Existing requested items are linked to spending. Add a new item to this draft.');
  remaining.splice(index,1);
 }
 if(!remaining.length)throw Error('Add a new requested item before saving.');
 return remaining;
}
async function appendLinkedItems(record,data,document,check,child){
 if(isFinal(child))throw Error('The linked utilization is finalized. Its request and amounts are read-only.');
 const items=appendedItems(BudgetReportWording.data(record),data);
 const active=allocation?.requestId14316===record.id?allocation:null;
 if(active)applySpending();
 const {data:result,error}=await ojmDb.rpc('append_budget_request_items',{p_request:record.id,p_version:record.version,p_items:items,p_document:document});
 check();if(error)throw Error(error.message);
 const saved=result.request,drafts=result.drafts;
 const updates=[saved,...drafts],ids=new Set(updates.map(r=>r.id));
 Work82.reports=[...updates,...Work82.reports.filter(r=>!ids.has(r.id))];
 if(active&&active===allocation){
  const latest=drafts.find(r=>r.id===allocationRecord?.id);
  if(latest&&allocationRecord.version===latest.version-1){
   allocation.lines=clone(latest.data.lines);allocation.requestVersion14316=saved.version;allocationRecord=latest;
   renderAllocation();
   const host=fundPopup?.querySelector('#budgetFunds290');
   if(host)host.savedValues=editorData(latest.data);
  }
 }
 return saved;
}
async function persistDocument(model){
 const check=context(),parsed=parseDocument(model),meta=model.budget14316;
 guard();const id=meta.id||meta.draftId14317;
 if(!id)throw Error('Keep the budget device draft before saving.');
 const record=Work82.reports.find(row=>row.id===id)||(meta.id?await editableRecord(id):null);
 if(record&&(record.data.kind!=='finance'||record.data.mode!=='request'))throw Error('Open the original budget request.');
 const document={html:parsed.html,title:model.title,settings:clone(model.settings)};
 const payload={...parsed.data,document14316:document};
 let saved=record;
 if(!record||localFirst14333.canonical(record.data)!==localFirst14333.canonical(payload)){
  if(meta.id&&record&&meta.version!==record.version)throw Error('This request changed. Reopen its current saved version.');
  const linked=record&&(budgetRows().find(row=>row.data.requestId14316===id)||(!window.offline14239?.offline()&&await linkedUtilization(id)));
  check();
  if(linked)saved=await appendLinkedItems(record,parsed.data,document,check,linked);
  else {
   const base=meta.id?{id,version:meta.version}:null;
   saved=await localFirst14333.saveWork('reports',payload,base,{data:payload,version:base?base.version+1:1},{createId:id});
  }
 }
 check();Work82.reportRecord=saved;Work82.report=clone(saved.data);Object.assign(Finance82,clone(saved.data));
 showCenterStatus(saved._pending14333?'Budget request saved on this device. It will sync automatically.':'Budget request saved to company records.');
 return {id:saved.id,version:saved.version,data:{...clone(parsed.data),lines:clone(saved.data.lines)},_pending14333:!!saved._pending14333};
}
async function requireSaved(){const model=documentWorkspace105.model,meta=model?.budget14316;guard();if(!meta?.id)throw Error('Save the budget request before sending Email or using WhatsApp.');const r=await live(meta.id,meta.version),d=BudgetReportWording.data(r),doc=d.document14316;if(!doc||model.html!==doc.html||model.title!==doc.title||JSON.stringify(model.settings)!==JSON.stringify(doc.settings))throw Error('The document has changed. Save it before sharing.');return {...r,data:d}}
function decorateEditor(){
 const root=document.getElementById('document-editor105'),toolbar=root?.querySelector('.doc-quick1426');if(!toolbar)return;
 root.querySelector('.budget-editor-actions14316')?.remove();const model=documentWorkspace105?.model;if(!model?.budget14316)return;
 const group=document.createElement('div');group.className='budget-editor-actions14316';
 function add(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;group.append(b)}
 add('Save Budget Request',()=>documentWorkspace105.save());
 add('Copy messages',()=>{try{guard();const data=parseDocument(model).data;const {root:dialog}=budgetDialog('Budget messages','<div class="budget-copy327"></div>');budgetMessages14314.render(dialog.querySelector('.budget-copy327'),data)}catch(e){showCenterStatus(e.message,true)}});
 if(model.budget14316.id)add('Fund utilization',async()=>{try{const r=await requireSaved();await startAllocation(r.id)}catch(e){showCenterStatus(e.message,true)}});
 toolbar.append(group);
}
async function openRequest(id){try{guard();const r=await editableRecord(id);if(r.data.mode==='utilization')return view(id);const d=BudgetReportWording.data(r);await openDocumentEditor105({...(d.document14316||{title:'Budget Request',html:requestHTML(d)}),source:'transactions-budget14313',category:'Reports',budget14316:{id:r.id,version:r.version,data:clone(d)}})}catch(e){showCenterStatus(e.message,true)}}
async function linkedUtilization(id){
 if(window.offline14239?.offline()){
  return budgetRows().filter(r=>r.data.requestId14316===id)
   .sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||'')))[0];
 }
 const {data,error}=await ojmDb.from('operational_reports').select(BudgetReportWording.select).eq('data->>requestId14316',id)
  .eq('data->>mode','utilization').order('updated_at',{ascending:false}).order('id',{ascending:false}).limit(1).setHeader('x-ojm-database-only','1');
 if(error)throw error;return data?.[0]||budgetRows().find(r=>r._pending14333&&r.data.requestId14316===id);
}
async function startAllocation(id){
 try{
  const check=context();if(busy)throw Error('Wait for the budget save to finish.');
  const request=++allocationRequest14370,sameParent=allocation?.requestId14316===id;
  check();if(request!==allocationRequest14370)return;
  const r=await editableRecord(id);check();if(request!==allocationRequest14370)return;
  if(r.data.mode==='utilization')throw Error('Choose an original budget request.');
  const child=await linkedUtilization(id);check();if(request!==allocationRequest14370)return;
  if(child?._pending14333)return window.budgetSaveStatus472.open(child.id);
  if(isFinal(child)){showFinal(child);return;}
  if(sameParent&&(!child||child.id===allocationRecord?.id&&child.version===allocationRecord?.version)){
   selectedParent=id;if(!fundPopup?.isConnected)presentFundEditor();return;
  }
  if(!await canLeaveFund())return;
  check();if(request!==allocationRequest14370)return;
  if(child){
   if(child.data.requestId14316!==id||child.data.requestVersion14316!==r.version)throw Error('Reopen the current saved request before continuing.');
   selectedParent=id;allocation=clone(child.data);allocation.requestDate290||=r.data.date;allocation.budgetMonth290||=r.data.budgetMonth290||String(r.data.date).slice(0,7);allocation.conversions||=[];allocationRecord=child;
  }else{
   selectedParent=id;allocation={...clone(r.data),mode:'utilization',requestDate290:r.data.date,budgetMonth290:r.data.budgetMonth290||String(r.data.date).slice(0,7),requestId14316:r.id,requestVersion14316:r.version,status:'draft',date:today82(),movements:[],conversions:[]};delete allocation.document14316;allocationRecord=null;
  }
  presentFundEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
async function openAllocation(id){
 try{
  const check=context();if(busy)throw Error('Wait for the budget save to finish.');
  if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
  const request=++allocationRequest14370,r=await editableRecord(id);check();if(request!==allocationRequest14370)return;
  if(isFinal(r))return showFinal(r);
  if(r.data.mode!=='utilization')return view(id);
  if(allocationRecord?.id===id&&allocationRecord.version===r.version){if(!fundPopup?.isConnected)presentFundEditor();return;}
  check();if(request!==allocationRequest14370)return;
  const parent=r.data.requestId14316?await editableRecord(r.data.requestId14316):null;
  if(parent&&parent.version!==r.data.requestVersion14316)throw Error('The original budget changed. Reopen its current version.');
  check();if(request!==allocationRequest14370||!await canLeaveFund())return;
  check();if(request!==allocationRequest14370)return;
  selectedParent=r.data.requestId14316||'';allocation=clone(r.data);allocation.requestDate290||=parent?.data.date||r.data.date;
  allocation.budgetMonth290||=parent?.data.budgetMonth290||String(allocation.requestDate290).slice(0,7);
  allocation.conversions||=[];allocationRecord=r;presentFundEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function supplements(record){
 if(!record?.data.requestId14316||isFinal(record))return [];
 const rows=budgetRows(),parent=record.data.requestId14316;
 return rows.filter(r=>r.id!==parent&&r.data.mode==='request'&&r.data.budgetMonth290===record.data.budgetMonth290&&
  !r._pending14333&&!rows.some(child=>child.data.requestId14316===r.id));
}
async function combineRequests(){
 try{
  const check=context(),saved=allocationRecord;
  captureFund();applySpending();
  if(editorData(allocation)!==editorData(saved.data))throw Error('Save your draft changes before combining requests.');
  const base=await live(saved.data.requestId14316,saved.data.requestVersion14316);check();
  const candidates=supplements(saved);
  if(!candidates.length)throw Error('No additional request is available for this budget month.');
  const option=(id,name)=>'<option value="'+esc(id)+'">'+esc(name)+'</option>';
  const {root}=budgetDialog('Combine budget requests','<form><label>Additional request<select data-plain14285 name="extra">'+
   candidates.map(r=>option(r.id,r.data.purpose+' · '+totals327(r.data))).join('')+'</select></label><div data-items></div>'+
   '<p>This saves one combined request and keeps the existing utilization draft and receipts. The two source requests are kept in deletion history.</p>'+
   '<p role="status"></p><button type="submit">Save combined request</button></form>');
  const form=root.querySelector('form'),content=form.querySelector('[data-items]'),status=form.querySelector('[role=status]');
  const select=form.elements.extra,baseData=BudgetReportWording.data(base);
  const unassigned=saved.data.movements.filter(m=>report.kind(m)==='spend'&&m.id290&&!m.budgetKey117&&m.worksheetLine==null);
  const pick=()=>candidates.find(r=>r.id===select.value);
  function list(){
   content.innerHTML=pick().data.lines.map((l,i)=>{
    const current=baseData.lines.filter((b,j)=>b.currency===l.currency&&report.lineFunding(saved.data,b,j).status==='approved');
    return '<fieldset><legend>'+esc(l.description)+' · '+esc(l.currency)+' '+esc(formatAppNumber(l.amount))+'</legend>'+
     '<label>Budget item<select data-plain14285 name="line'+i+'">'+option('','Add as a new item')+current.map(b=>option(b.key117,b.description)).join('')+'</select></label>'+
     (unassigned.length?'<label>Link existing spending<select data-plain14285 name="move'+i+'">'+option('','None')+
       unassigned.map(m=>option(m.id290,(m.destination290||m.description290)+' · '+report.currencyAmount(m.currency,m.outflow))).join('')+'</select></label>':'')+'</fieldset>';
   }).join('');
  }
  select.onchange=list;list();
  form.onsubmit=async event=>{
   event.preventDefault();const submit=form.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;
   try{
    check();const extra=pick(),merged=clone(baseData),links={},assignments={};
    merged.notes=[baseData.notes,BudgetReportWording.data(extra).notes].filter(Boolean).join('\n\n');
    for(const [i,l] of extra.data.lines.entries()){
     const target=form.elements['line'+i].value,move=form.elements['move'+i]?.value;
     if(target){
      links[l.key117]=target;const line=merged.lines.find(b=>b.key117===target);
      line.amount=Math.round((Number(line.amount)+Number(l.amount))*100)/100;
     }else merged.lines.push(clone(l));
     if(move){if(assignments[move])throw Error('Choose an existing expense only once.');assignments[move]=target||l.key117;}
    }
    const layout=document.createElement('template');layout.innerHTML=documentWorkspace105.sanitize(baseData.document14316?.html||requestHTML(baseData));
    const table=layout.content.querySelector('[data-budget-table14316="items"]'),notes=layout.content.querySelector('[data-budget-field14316="notes"]');
    if(table&&notes){table.outerHTML=report.items(merged.lines);notes.textContent=merged.notes;}else layout.innerHTML=requestHTML(merged);
    const result=await ojmDb.rpc('combine_draft_budget_requests',{p_report:saved.id,p_version:saved.version,p_parent_version:base.version,
     p_extra:extra.id,p_extra_version:extra.version,p_links:links,p_assignments:assignments,p_lines:merged.lines,p_notes:merged.notes,p_html:layout.innerHTML});
    check();if(result.error)throw Error(result.error.message);
    const {request,draft}=result.data;
    Work82.reports=[request,draft,...Work82.reports.filter(r=>![base.id,extra.id,draft.id].includes(r.id))];
    selectedParent=request.id;allocation=clone(draft.data);allocationRecord=draft;
    root.resolve108(true);renderRequest();renderAllocation();
   }catch(err){status.textContent=err.message;submit.disabled=false;}
  };
 }catch(err){showCenterStatus(err.message,true);}
}

function renderAllocation(){
 const host=fundPopup?.querySelector('#budgetFunds290');if(!host||!allocation)return;
 const d=allocation;
 if(host.editingAllocation!==d){host.editingAllocation=d;host.savedValues=editorData(d);}
 const actions=button('Reports','chooseRequest()')+button('Print','previewAllocation()')+
  button('Save','saveAllocation(false)')+button('Finalize','saveAllocation(true)');
 reportToolbar(fundPopup,actions).querySelector('[onclick*="saveAllocation(false)"]').classList.add('fund-save-draft');
 const cashActions='<button type="button" data-edit-funding>Edit funding</button><button type="button" data-add-funding>Add row</button>';
 const rowHeader=d.requestId14316?[report.period(d),d.recipient].filter(Boolean).map(esc).join(' · '):'';
 const header='<form id="fundHeader290" data-parent="'+esc(d.requestId14316||'')+'" data-record="'+esc(allocationRecord?.id||'')+'"><div class="fund-report-fields">'+
  field82('Report date','date',d.date,'date','required')+field82('Reference','receiptReference290',d.receiptReference290||'')+
  field82('Recipient','recipient',d.recipient,'text','required')+field82('Purpose','purpose',d.purpose,'text','required')+
  (d.requestId14316?'':field82('Budget month','budgetMonth290',d.budgetMonth290||String(d.date).slice(0,7),'month','required'))+
  '<label style="grid-column:1/-1">Additional information (optional, printed)<textarea name="printNotes290" rows="2">'+esc(d.printNotes290||'')+'</textarea></label>'+
  '<label>Record notes (not printed)<textarea name="notes" rows="3">'+esc(d.notes)+'</textarea></label></div></form>';
 host.innerHTML='<header class="worksheet-header"><h3>'+esc(d.purpose||'Unlinked utilization report')+'</h3><span>'+rowHeader+'</span></header>'+
  section82('Funding summary','<div data-fund-summary></div>',cashActions)+
  section82('Budget request summary',report.requestSummary(d,true))+
  section82('Disbursement breakdown',report.disbursements(d,true),'<button type="button" data-activity="spend">Add row</button>')+
  '<details class="worksheet-details" '+(d.requestId14316?'':'open')+'><summary>Report details</summary>'+header+'<div data-journal-ref></div>'+postControl(allocationRecord)+
  (supplements(allocationRecord).length?button('Combine requests','combineRequests()'):'')+'</details>';
 showJournalReference(host,allocationRecord);
 host.querySelector('#fundHeader290').oninput=captureFund;
 const sheet=BudgetSpendingWorksheet.mount(host,d,(button,inputs)=>{
  try{
   const line=Number(button.dataset.line);
   applySpending();
   const index=Number(button.dataset.payment);
   if(index>=0)editMovement(index);
   else openActivity('spend',null,{line,currency:d.lines[line]?.currency||inputs[0]?.dataset.paidIn});
  }catch(error){showCenterStatus(error.message,true);}
 });
 host.applySpending=()=>sheet.read(true);host.worksheetChanged=sheet.dirty;
 host.querySelectorAll('[data-activity]').forEach(b=>b.onclick=()=>openActivity(b.dataset.activity));
 host.querySelector('[data-edit-funding]').onclick=()=>openFundingEditor();
 host.querySelector('[data-add-funding]').onclick=()=>openFundingEditor('new:receipt');
 const summary=host.querySelector('[data-fund-summary]');
 function refresh(){
  try{
   const current=sheet.read(),balances=report.balances(current);
   summary.innerHTML=report.cashSummary(current);
   const totals=host.querySelector('[data-disbursements] tfoot tr');
   for(const [i,th] of [...host.querySelector('[data-disbursements] thead tr').cells].entries()){
    const c=th.textContent;if(i&&CurrencyStore.currencies.some(unit=>unit.code===c))totals.cells[i].innerHTML=report.amountHtml(c,balances.get(c)?.spend||0);
   }
  }catch(error){summary.textContent=error.message;}
 }
 host.oninput=host.onchange=e=>{if(e.target.closest('[data-request-summary],[data-disbursements]'))refresh();};
 refresh();
}
function applySpending(){
 guard();captureFund();
 fundPopup?.querySelector('#budgetFunds290')?.applySpending?.();
}
function closeActivity(){
 if(fundPopup)fundPopup.querySelector('.ui-dialog108').inert=false;
 if(activityPopup){activityPopup.resolve108(false);activityPopup=null;}
}
function openFundingEditor(value){
 try{
  const check=context(),d=allocation;if(!d||busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  let movements=clone(d.movements),conversions=clone(d.conversions||[]),dirty=false;
  const currencies=budget14313.currencyOptions(d.lines);
  const field=(key,label,type='text',options=null)=>({key,label,type,options});
  const receiptFields=[field('date290','Date','date'),field('account','Funding from'),field('destination290','Received into'),field('currency','Currency','select',currencies),field('amount','Amount','number'),field('reference','Reference'),field('description290','Description'),field('ownerSource','Funding source','select',[['','Match to journal'],['owner','Owner support'],['other','Other source']])];
  const fxFields=[field('date','Date','date'),field('source','From account'),field('currency','Currency','select',currencies),field('amount','Exchanged','number'),field('destination290','Received into'),field('target','Currency','select',currencies),field('targetAmount290','Received','number'),field('rate','Rate','rate'),field('evidence','Reference')];
  const otherFields=[field('type290','Activity','select',Object.entries(report.labels).filter(([k])=>!['receipt','spend'].includes(k))),...receiptFields.slice(0,7),field('loanId290','Advance','loan'),field('loanAmount290','Debt settled','number')];
  const required=new Set(['date290','date','account','source','currency','target','amount','reference','evidence','targetAmount290','rate']);
  const input=(f,m,group,i)=>{
   const val=f.key==='amount'&&group!=='conversion'?m.inflow||m.outflow||'':f.key==='targetAmount290'?report.conversionAmount(m)||'':f.key==='evidence'?m.evidence||m.reference||'':m[f.key]??'';
   const label=f.label+' · '+(group==='conversion'?'exchange':group==='receipt'?'receipt':'movement')+' '+(i+1);
   const attrs=' data-funding-field="'+f.key+'" name="'+f.key+'" aria-label="'+esc(label)+'"'+(required.has(f.key)?' required':'');
   let options=f.options;
   if(f.type==='loan')options=[['','Choose advance'],...movements.filter(m=>m&&report.kind(m)==='borrow').map(m=>[m.id290,m.account+' · '+m.reference])];
   const control=options?'<select data-plain14285'+attrs+'>'+options.map(([v,label])=>'<option value="'+esc(v)+'"'+(String(val)===String(v)?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>':
    '<input'+attrs+' type="'+(f.type==='rate'?'number':f.type)+'" value="'+esc(val)+'"'+(['number','rate'].includes(f.type)?' min="'+(f.type==='rate'?'0.00000001':'0.01')+'" step="'+(f.type==='rate'?'any':'0.01')+'" data-currency="'+esc(f.key==='targetAmount290'?m.target:m.currency||'')+'"':'')+'>';
   return '<td data-funding-cell="'+f.key+'">'+control+'</td>';
  };
  const table=(group,fields,rows)=>'<div class="funding-grid-scroll"><table class="funding-edit-grid" data-funding-grid="'+group+'"><thead><tr>'+fields.map(f=>'<th scope="col" data-funding-cell="'+f.key+'">'+esc(f.label)+'</th>').join('')+'<th scope="col">Action</th></tr></thead><tbody>'+rows.map(([m,i])=>'<tr data-funding-group="'+group+'" data-funding-index="'+i+'">'+fields.map(f=>input(f,m,group,i)).join('')+'<td><button type="button" data-remove-funding aria-label="Remove '+(group==='conversion'?'exchange':'funding row')+' '+(i+1)+'">Remove</button></td></tr>').join('')+'</tbody></table></div>';
  const {root,pending}=budgetDialog('Edit funding','<form data-inline-funding><div data-funding-tables></div><p role="status" data-funding-status></p><div class="fund-form-actions"><button type="button" data-cancel-funding>Cancel</button><button type="submit">Apply changes</button></div></form>');
  activityPopup=root;root.classList.add('fund-activity','funding-inline');fundPopup.querySelector('.ui-dialog108').inert=true;
  const form=root.querySelector('form'),tables=root.querySelector('[data-funding-tables]'),status=root.querySelector('[data-funding-status]');
  function capture(){
   for(const row of tables.querySelectorAll('tbody tr')){
    const group=row.dataset.fundingGroup,i=Number(row.dataset.fundingIndex),m=(group==='conversion'?conversions:movements)[i];
    for(const input of row.querySelectorAll('[data-funding-field]')){
     const key=input.dataset.fundingField;
     const value=['amount','targetAmount290','rate','loanAmount290'].includes(key)?(input.value===''?'':movementAmount(input)):input.value.trim();
     if(key==='amount'&&group!=='conversion'){const incoming=['receipt','coverage','borrow'].includes(row.querySelector('[name=type290]')?.value||report.kind(m));m.inflow=incoming?value:0;m.outflow=incoming?0:value;}
     else m[key]=value;
    }
    if(group!=='conversion'&&report.kind(m)!=='repay'){delete m.loanId290;delete m.loanAmount290;}
    if(group==='receipt'&&!m.ownerSource)delete m.ownerSource;
   }
  }
  function repayments(){
   for(const row of tables.querySelectorAll('[data-funding-group=other]')){
    const repay=row.querySelector('[name=type290]').value==='repay';
    for(const key of ['loanId290','loanAmount290']){const input=row.querySelector('[name='+key+']');input.hidden=!repay;input.required=repay;}
   }
  }
  function render(){
   const rows=kind=>movements.flatMap((m,i)=>m&&(kind==='receipt'?report.kind(m)==='receipt':!['receipt','spend'].includes(report.kind(m)))?[[m,i]]:[]);
   tables.innerHTML=section82('Amounts received',table('receipt',receiptFields,rows('receipt')),'<button type="button" data-add-funding-row="receipt">Add row</button>')+
    section82('Exchanges',table('conversion',fxFields,conversions.flatMap((f,i)=>f?[[f,i]]:[])),'<button type="button" data-add-funding-row="conversion">Add row</button>')+
    section82('Other movements',table('other',otherFields,rows('other')),'<button type="button" data-add-funding-row="other">Add row</button>');
   repayments();window.financialNumbers14231?.scan(form);
  }
  function add(group){
   capture();dirty=true;
   const currency=d.lines[0]?.currency||currencies[0]?.[0]||'USD';
   if(group==='conversion')conversions.push({date:d.date,source:'',destination290:'',currency:'USD',target:'LAK',amount:'',targetAmount290:'',rate:'',evidence:''});
   else movements.push({id290:crypto.randomUUID(),type290:group==='receipt'?'receipt':'coverage',date290:d.date,account:'',destination290:'',currency,inflow:'',outflow:0,reference:'',description290:''});
   render();const row=tables.querySelector('[data-funding-grid="'+group+'"] tbody tr:last-child');
   row?.querySelector('[name=account],[name=source]')?.focus();
  }
  tables.onclick=e=>{
   const addButton=e.target.closest('[data-add-funding-row]');if(addButton){add(addButton.dataset.addFundingRow);return;}
   const remove=e.target.closest('[data-remove-funding]');if(!remove)return;
   capture();const row=remove.closest('tr'),i=Number(row.dataset.fundingIndex);
   (row.dataset.fundingGroup==='conversion'?conversions:movements)[i]=null;dirty=true;render();
  };
  form.oninput=form.onchange=e=>{
   dirty=true;status.textContent='';repayments();
   const row=e.target.closest('[data-funding-group=conversion]');if(!row)return;
   const field=name=>row.querySelector('[name='+name+']'),a=movementAmount(field('amount'));
   if(e.target===field('rate')&&a>0&&movementAmount(field('rate'))>0)field('targetAmount290').value=Math.round(a*movementAmount(field('rate'))*100)/100;
   else if(['amount','targetAmount290'].includes(e.target.name)){const b=movementAmount(field('targetAmount290'));field('rate').value=a>0&&b>0?b/a:'';}
  };
  const cancel=async()=>{if(dirty&&!await ui117.confirm('Discard the changes in this funding table?'))return;if(activityPopup===root)closeActivity();};
  root.querySelector('[data-dismiss]').onclick=cancel;root.querySelector('[data-cancel-funding]').onclick=cancel;
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();void cancel();}},true);
  root.addEventListener('pointerdown',e=>{if(e.target===root){e.preventDefault();e.stopImmediatePropagation();void cancel();}},true);
  form.onsubmit=e=>{
   e.preventDefault();try{
    check();if(allocation!==d||activityPopup!==root)throw Error('Reopen the current funding report.');
    if(!form.reportValidity())return;capture();
    const next={...d,movements:movements.filter(Boolean),conversions:conversions.filter(Boolean)};validateAllocation(next,false);
    d.movements=next.movements;d.conversions=next.conversions;dirty=false;closeActivity();renderAllocation();
   }catch(error){status.textContent=error.message;}
  };
  pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-edit-funding]')?.focus();}}});
  render();if(value?.startsWith('new:'))add(value.slice(4));
 }catch(e){showCenterStatus(e.message,true)}
}
function openActivity(group,index=null,preset={}){
 try{
  if(busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  const d=allocation;
  if(preset.line!=null){
   const line=d.lines[preset.line];
   const existing=d.movements.findIndex(m=>report.kind(m)==='spend'&&report.forLine(m,line,preset.line));
   if(existing>=0)index=existing;
  }
  const cs=budget14313.currencyOptions(d.lines),loans=d.movements.filter(m=>report.kind(m)==='borrow');
  const isFx=group==='conversion',types=Object.entries(report.labels).filter(([k])=>group==='other'?!['receipt','spend'].includes(k):k===group);
  const type=isFx?'':index!==null?report.kind(d.movements[index]):types[0][0];
  const options=rows=>rows.map(([v,name])=>`<option value="${esc(v)}">${esc(name)}</option>`).join('');
  const amountInput=(label,name)=>field82(label,name,'','number','min="0.01" step="0.01" required');
  const actions=(kind,i)=>button('Edit',`edit${kind}(${i})`)+button('Delete',`remove${kind}(${i})`);
  const title=preset.funding?(group==='receipt'?(index===null?'Add amount received':'Edit amount received'):group==='conversion'?'Edit exchange':'Edit funding movement'):{receipt:'Amount received',coverage:'Restaurant coverage',conversion:'Currency conversion',spend:index===null?'Add spending row':'Spending row',other:'Other fund movements'}[group];
 const movement=`<form id="financeMove82" class="finance-controls117">${types.length>1?select82('Activity','type290',type,types):'<input type="hidden" name="type290" value="'+esc(type)+'">'}${field82('Date','date290',d.date,'date','required')}
  <label data-loan-field hidden>Advance to repay<select name="loanId290"><option value="">Choose an advance</option>${options(loans.map(l=>[l.id290,l.account+' · '+l.reference+' · '+report.currencyAmount(l.currency,report.outstanding(d,l))+' outstanding']))}</select>${loans.length?'':'<small>Record the original advance with its borrowing date first.</small>'}</label>
  <label><span data-source-label>Funding from</span><input name="account" required></label><label><span data-dest-label>Received into</span><input name="destination290"></label>
  <label data-item-field hidden>Budget item<select name="budgetKey117"><option value="">Unassigned</option>${options(d.lines.map((l,i)=>[l.key117||'worksheet:'+i,l.category+' · '+l.description+' · '+l.currency]))}</select></label>
  ${group==='spend'?'<label data-extra-item>Item<input name="item290" placeholder="Item name"></label><label data-extra-item>Category<input name="category290" list="spendCategories290"></label><datalist id="spendCategories290">'+[...new Set(d.lines.map(l=>l.category).filter(Boolean))].map(c=>'<option value="'+esc(c)+'"></option>').join('')+'</datalist>':''}
  ${select82('Currency','currency',d.lines[0]?.currency||'LAK',cs)}${amountInput('Amount','amount')}
  <label data-cash-field hidden>Cash distributed<input placeholder="Same as expense amount" name="cashDistributed" type="number" min="0" step="0.01"></label>
  <label data-equivalent-field hidden><span></span><input name="equivalent" type="number" min="0.01" step="0.01"></label>
  ${group==='receipt'?select82('Funding source','ownerSource','',[['','Match to journal'],['owner','Owner support'],['other','Other source']]):''}
  ${group==='spend'?'<label>Owner amount<input name="ownerAmount" type="number" min="0" step="0.01" placeholder="Unconfirmed"></label>'+select82('Owner currency','ownerCurrency',d.lines[0]?.currency||'LAK',cs):''}
  ${field82('Description','description290','','text')}${field82('Reference','reference','','text','required')}<button type="submit">Add movement</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fx=`<form id="financeFx117" class="finance-controls117">${field82('Date','date',d.date,'date','required')}${field82('From account','source','','text','required')}${select82('From currency','currency','USD',cs)}${amountInput('Amount exchanged','amount')}
  ${field82('Received into','destination290','','text','required')}${select82('To currency','target','LAK',cs)}${amountInput('Amount received','targetAmount290')}${field82('Reference','evidence','','text','required')}${field82('Rate','rate','','number','min="0.00000001" step="any" required')}<output aria-live="polite"></output><button type="submit">Add conversion</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fxTable=table82(['Date','From account','Amount exchanged','Received into','Amount received','Rate','Reference','Action'],d.conversions.map((f,i)=>[esc(formatAppDate(f.date)),esc(f.source),report.amountHtml(f.currency,f.amount),esc(f.destination290||'—'),report.amountHtml(f.target,report.conversionAmount(f)),esc(formatAppRate(f.rate)),esc(f.evidence||f.reference),actions('Conversion',i)]));
 const movementRows=report.movementRows(d).flatMap((row,i)=>types.some(([k])=>k===report.kind(d.movements[i]))?[[...row,actions('Movement',i)]]:[]);
 const listing=group==='spend'?(index===null?'':button('Delete row',`removeMovement(${index})`)):table82([...report.movementHeaders,'Action'],movementRows);
 const selection=preset.funding?'<div class="funding-entry-toolbar"><button type="button" data-back-funding>Back to funding</button></div>':'';
 const remove=preset.funding&&index!==null?button('Delete entry',`remove${isFx?'Conversion':'Movement'}(${index})`):'';
 const {root,pending}=budgetDialog(title,selection+(isFx?fx:movement)+(preset.funding?'<div class="funding-delete">'+remove+'</div>':isFx?fxTable:listing));
 activityPopup=root;root.classList.add('fund-activity');fundPopup.querySelector('.ui-dialog108').inert=true;
 pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-activity="'+group+'"]')?.focus()}}});
 const f=root.querySelector('form');
 if(preset.funding){f.dataset.funding='true';root.dataset.funding='true';}
 if(isFx){
  editFx=index;const prior=d.conversions[index];
  if(prior)for(const [k,v] of Object.entries({...prior,targetAmount290:report.conversionAmount(prior),evidence:prior.evidence||prior.reference||''}))if(f.elements[k])f.elements[k].value=v;
  f.oninput=f.onchange=e=>{const a=movementAmount(f.elements.amount);if(e?.target===f.elements.rate&&a>0&&movementAmount(f.elements.rate)>0)f.elements.targetAmount290.value=Math.round(a*movementAmount(f.elements.rate)*100)/100;const b=movementAmount(f.elements.targetAmount290);if(e?.target!==f.elements.rate)f.elements.rate.value=a>0&&b>0?b/a:'';f.querySelector('output').textContent=a>0&&b>0?'Rate: '+formatAppRate(b/a)+' '+f.elements.target.value+' / '+f.elements.currency.value:'';f.elements.targetAmount290.dataset.currency=f.elements.target.value;window.financialNumbers14231?.scan(f)};
  f.oninput();f.onsubmit=e=>{e.preventDefault();saveConversion(f)};
 }else{
  editMove=index;const prior=d.movements[index];
  if(prior)for(const [k,v] of Object.entries({...prior,type290:report.kind(prior),date290:prior.date290||d.date,amount:prior.inflow||prior.outflow,equivalent:prior.loanAmount290||prior.budgetAmount290||''}))if(f.elements[k])f.elements[k].value=v;
  if(prior?.worksheetLine!=null&&!prior.budgetKey117)f.elements.budgetKey117.value='worksheet:'+prior.worksheetLine;
  if(group==='spend'){
   if(!prior){
    f.elements.account.value='Budget funds';
    if(preset.line!=null)f.elements.budgetKey117.value=d.lines[preset.line].key117||'worksheet:'+preset.line;
    f.elements.currency.value=preset.currency||d.lines[preset.line]?.currency||d.lines[0]?.currency||cs[0][0];
   }else if(!prior.budgetKey117&&prior.worksheetLine==null){
    f.elements.item290.value=prior.item290||prior.destination290||prior.description290||'Additional spending';
   }
  }
  if(group==='spend'&&!prior?.ownerCurrency){
   const funds=[...new Set((d.movements||[]).filter(m=>report.kind(m)==='receipt'&&m.ownerSource!=='other').map(m=>m.currency))];
   f.elements.ownerCurrency.value=funds.length===1?funds[0]:f.elements.currency.value;
  }
  if(group==='spend'&&(!prior||prior.worksheetSpend)){f.elements.account.required=false;f.elements.reference.required=false;}
  if(group==='spend'){
   const more=document.createElement('details');more.className='spend-more';more.innerHTML='<summary>More details</summary><div></div>';
   for(const key of ['account','destination290','cashDistributed','equivalent','ownerAmount','ownerCurrency']){
    more.lastElementChild.append(f.elements[key].closest('label'));
   }
   f.querySelector('[type=submit]').before(more);
   if(prior?.cashDistributed!=null||prior?.ownerAmount!=null)more.open=true;
   if(prior?.cashUnconfirmed){
    const confirm=document.createElement('label');
    confirm.innerHTML='<input type="checkbox" name="cashConfirmed"> Cash payment amount confirmed';
    f.elements.cashDistributed.closest('label').after(confirm);
   }
   f.addEventListener('invalid',e=>{if(more.contains(e.target))more.open=true;},true);
   let currency=f.elements.currency.value;
   f.elements.currency.onchange=()=>{
    if(currency===f.elements.currency.value)return;
    currency=f.elements.currency.value;
    for(const key of ['amount','cashDistributed','equivalent','ownerAmount'])f.elements[key].value='';
    f.elements.amount.focus();
   };
   if(prior&&preset.currency&&prior.currency!==preset.currency){f.elements.currency.value=preset.currency;f.elements.currency.onchange();}
  }
  f.onchange=()=>movementFields(f);movementFields(f);
  f.onsubmit=e=>{e.preventDefault();saveMovement(f)};
 }
 // Keep concise, related fields together, independent of optional detail visibility.
 for(const label of f.querySelectorAll('label')){
  const field=label.querySelector('input,select,textarea');if(field)label.dataset.field=field.name;
 }
 const row=(className,names)=>{
  const labels=names.map(name=>f.elements[name]?.closest('label')).filter(Boolean);
  if(!labels.length)return;
  const wrap=document.createElement('div');wrap.className='fund-field-row '+className;
  labels[0].before(wrap);for(const label of labels)wrap.append(label);
 };
 if(isFx){
  row('fund-source-row',['date','source','destination290']);
  row('fund-exchange-row',['currency','amount','target','targetAmount290']);
  row('fund-rate-row',['rate','evidence']);
 }else{
  row('fund-date-row',['date290',group==='spend'?'budgetKey117':'ownerSource']);
  row('fund-source-pair',['account','destination290']);
  row('fund-item-row',['item290','category290']);
  row('fund-payment-row',['currency','amount','reference']);
  row('fund-description-row',['description290']);
  row('fund-owner-row',['ownerCurrency','ownerAmount','cashDistributed','equivalent']);
 }
 const submit=f.querySelector('[type=submit]');
 const footer=document.createElement('div');footer.className='fund-form-actions';submit.before(footer);footer.append(submit);
 if(preset.funding){
  const initial=JSON.stringify([...new FormData(f)]);
  root.querySelector('[data-back-funding]').onclick=async()=>{
   if(JSON.stringify([...new FormData(f)])!==initial&&!await ui117.confirm('Discard the unsaved changes to this funding entry?'))return;
   openFundingEditor();
  };
 }
 f.querySelector('[type=submit]').textContent=index!==null?'Update':isFx?'Add conversion':group==='receipt'?'Add receipt':group==='coverage'?'Add coverage':group==='spend'?'Add spending':'Add movement';
 f.querySelector('[data-cancel]').remove();
 f.querySelector('input:not([type=hidden]),select')?.focus();
 }catch(e){showCenterStatus(e.message,true)}
}
function movementAmount(field){
 return field.type==='number'||field.dataset.numeric88?field.valueAsNumber:parseAppNumber(field.value);
}
function movementFields(f){
 const type=f.elements.type290.value,spend=type==='spend',repay=type==='repay',transfer=type==='transfer';
 const loan=allocation.movements.find(m=>m.id290===f.elements.loanId290.value&&report.kind(m)==='borrow');
 const item=allocation.lines.find((l,i)=>(l.key117||'worksheet:'+i)===f.elements.budgetKey117.value);
 f.querySelector('[data-loan-field]').hidden=!repay;f.elements.loanId290.required=repay;
 f.querySelector('[data-item-field]').hidden=!spend;f.querySelector('[data-cash-field]').hidden=!spend;
 f.querySelectorAll('[data-extra-item]').forEach(label=>{label.hidden=!!item;});
 if(f.elements.item290)f.elements.item290.required=spend&&!item;
 const labels={receipt:['Funding from','Received into'],coverage:['Covered by','Applied to'],borrow:['Lender / company fund','Received into'],repay:['Paid from','Repaid to'],spend:['Paid from','Paid to'],refund:['Returned from','Returned to'],transfer:['Transferred from','Transferred to']};
 f.querySelector('[data-source-label]').textContent=labels[type][0];f.querySelector('[data-dest-label]').textContent=labels[type][1];
 f.elements.destination290.required=transfer;
 const target=repay?loan:spend?item:null,cross=target&&target.currency!==f.elements.currency.value;
 const field=f.querySelector('[data-equivalent-field]');field.hidden=!cross;f.elements.equivalent.required=!!cross&&repay;
 if(cross){field.querySelector('span').textContent=repay?'Debt settled in '+target.currency:'Budget equivalent ('+target.currency+')';}
}
function editMovement(i,currency){
 const m=allocation?.movements[i];if(!m)return;
 const type=report.kind(m);openActivity(['receipt','spend','coverage'].includes(type)?type:'other',i,{currency});
}
function saveMovement(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),type=fields.type290,amount=movementAmount(f.elements.amount),incoming=['receipt','coverage','borrow'].includes(type);
  const prior=editMove===null?null:allocation.movements[editMove];
  const next={id290:prior?.id290||crypto.randomUUID(),type290:type,date290:fields.date290,account:fields.account.trim(),destination290:fields.destination290.trim(),reference:fields.reference.trim(),description290:fields.description290.trim(),currency:fields.currency,budgetKey117:type==='spend'?fields.budgetKey117:'',inflow:incoming?amount:0,outflow:incoming?0:amount};
  if(type==='receipt'&&fields.ownerSource)next.ownerSource=fields.ownerSource;
  if(type==='spend'&&fields.ownerAmount!==''){
   next.ownerAmount=movementAmount(f.elements.ownerAmount);
   next.ownerCurrency=fields.ownerCurrency;
   BudgetOwnerBalance.validateShare(next);
  }
  if(type==='spend'&&fields.cashDistributed!=='')next.cashDistributed=movementAmount(f.elements.cashDistributed);
  if(type==='spend'&&prior?.cashUnconfirmed&&!fields.cashConfirmed)next.cashUnconfirmed=true;
  if(type==='spend'){
   if(!prior||prior.worksheetSpend)next.worksheetSpend=true;
   if(!next.budgetKey117){
    next.item290=fields.item290.trim();
    next.category290=fields.category290.trim();
   }
  }
  if(type==='spend'&&next.budgetKey117.startsWith('worksheet:')&&!allocation.lines.some(l=>l.key117===next.budgetKey117)){
   next.worksheetLine=allocation.lines.findIndex((l,i)=>!l.key117&&'worksheet:'+i===next.budgetKey117);
   next.budgetKey117='';
  }
  if(type==='spend' && next.cashDistributed!=null && prior?.cashBudgetAmount!=null && prior.currency===next.currency &&
     prior.budgetKey117===next.budgetKey117 && prior.worksheetLine===next.worksheetLine && next.cashDistributed===prior.cashDistributed)next.cashBudgetAmount=prior.cashBudgetAmount;
  if(type==='repay'){next.loanId290=fields.loanId290;const loan=allocation.movements.find(m=>m.id290===next.loanId290);next.loanAmount290=loan?.currency===next.currency?amount:movementAmount(f.elements.equivalent);}
  if(type==='spend'&&!f.querySelector('[data-equivalent-field]').hidden&&fields.equivalent)next.budgetAmount290=movementAmount(f.elements.equivalent);
  const rows=[...allocation.movements];if(prior)rows[editMove]=next;else rows.push(next);
  validateAllocation({...allocation,movements:rows},false);allocation.movements=rows;const funding=f.dataset.funding==='true';closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
async function removeMovement(i){
 try{const check=context(),rows=allocation.movements,m=rows[i];if(!m)return;
  if(m.id290&&rows.some(r=>r.loanId290===m.id290))throw Error('Remove or reassign repayments before deleting their advance.');
  if(!await ui117.confirm('Delete this movement?'))return;check();if(rows!==allocation.movements||rows[i]!==m)return;captureFund();const funding=activityPopup?.dataset.funding==='true';rows.splice(i,1);closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function editConversion(i){if(allocation?.conversions[i])openActivity('conversion',i);}
function saveConversion(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),amount=movementAmount(f.elements.amount),target=movementAmount(f.elements.targetAmount290);
  const next={...(editFx===null?{}:allocation.conversions[editFx]),...fields,amount,targetAmount290:target,rate:target/amount,source:fields.source.trim(),destination290:fields.destination290.trim(),evidence:fields.evidence.trim()};
  const rows=[...allocation.conversions];if(editFx===null)rows.push(next);else rows[editFx]=next;
  validateAllocation({...allocation,conversions:rows},false);allocation.conversions=rows;const funding=f.dataset.funding==='true';closeActivity();renderAllocation();if(funding)openFundingEditor();
 }catch(e){showCenterStatus(e.message,true)}
}
function postControl(record){
 return record&&!record._pending14333&&access113.can('journal','post')?'<button type="button" data-prepare-budget title="Prepare an editable journal; posting remains a separate action">Post Transaction</button>':'';
}
function editorData(d){
 return JSON.stringify([d.date,d.budgetMonth290,d.receiptReference290||'',d.recipient||'',d.purpose||'',d.notes||'',d.printNotes290||'',d.movements||[],d.conversions||[],d.lines.map((l,i)=>report.lineFunding(d,l,i))]);
}
function showJournalReference(host,record){
 const field=host.querySelector('[data-journal-ref]'),post=field.closest('[role=dialog]').querySelector('[data-prepare-budget]');
 if(!record||record._pending14333)return;
 if(post)post.onclick=()=>prepareSummary(record,host,post);
 const check=context();
 journal.lookup(record.id).then(link=>{
  check();if(!field.isConnected)return;
  const label=journal.reference(link);
  if(label){field.textContent='Utilization journal · '+label+' · report version '+link.report_version;if(post){post.textContent='View journal';post.title='Review the recorded journal';post.onclick=async()=>{if(post.disabled)return;post.disabled=true;try{check();await journal.view(record.id);}catch(e){showCenterStatus(e.message,true)}finally{post.disabled=false}};}}
  else{
   const job=journal.localJob(record.id);
   if(job){field.textContent='Utilization journal · '+(job.message||'Awaiting posting confirmation');if(post)post.hidden=true;}
  }
 }).catch(()=>{if(field.isConnected)field.textContent='Utilization journal reference unavailable.';});
}
async function prepareSummary(record,host,post){
 const check=context();if(busy||post.disabled)return;
 post.disabled=true;
 try{
  const worksheet=!!host.querySelector('#fundHeader290');
  function saved(){
   if(worksheet){applySpending();if(editorData(allocation)!==editorData(record.data))throw Error('Save the report before opening the updated summary in Post Transaction.');}
  }
  saved();
  const current=await live(record.id,record.version);check();
  const link=await journal.lookup(record.id);check();if(!host.isConnected)return;
  if(link){await journal.view(record.id);return;}
  if(journal.localJob(record.id))throw Error('The utilization posting is waiting for confirmation. Open Data Check to review it.');
  const groups=BudgetSupportEquity.groups(current.data);
  const evidence=await BudgetSupportEquity.evidence(current);
  check();if(!host.isConnected)return;
  saved();journal.open(current,groups,evidence);
  if(worksheet)clearFundPopup();else host.resolve108(false);
 }catch(e){showCenterStatus(e.message,true)}finally{post.disabled=false}
}
async function printUtilization(d,record,dialog){
 const check=context(),origin=fundPopup;
 let reference='';
 if(record){
  try{reference=journal.reference(await journal.lookup(record.id));}
  catch{reference='Reference unavailable';}
  check();
 }
 const content=document.createElement('div');content.innerHTML=report.report(d,reference,true);content.querySelector('h1')?.remove();
 if(await print82(report.title,content.innerHTML,'')){
  if(dialog?.isConnected)dialog.resolve108(false);
  if(!dialog&&origin&&origin===fundPopup)await closeFundEditor();
 }
}
function headerValid(){const form=fundPopup?.querySelector('#fundHeader290');if(form&&!form.checkValidity())form.closest('details').open=true;return form?.reportValidity();}
async function previewAllocation(){try{if(!headerValid())return;applySpending();const d=clone(captureFund());validateAllocation(d,false);d.preparedBy=liveProfile.full_name||liveProfile.email;await printUtilization(d,allocationRecord)}catch(e){showCenterStatus(e.message,true)}}
// The verified source file stays in private Bookkeeping. Save the complete linked batch in one database request.
function historyImportButton(){
 const months=new Set(Work82.reports.filter(r=>r.data?.mode==='utilization').map(r=>r.data.budgetMonth290));
 return ['2026-01','2026-02'].every(m=>months.has(m))?'':button('Record verified history','importHistory()');
}
function importHistory(){
 const check=context(),client=ojmDb;
 const {root}=budgetDialog('Record verified budget history','<label>January and February history file <input type="file" accept=".json" data-history-file></label><p role="status"></p><button type="button" disabled data-save-history>Save both months</button>');
 const file=root.querySelector('[data-history-file]'),save=root.querySelector('[data-save-history]'),status=root.querySelector('[role=status]');
 let rows;
 file.onchange=async()=>{
  const selected=file.files[0];rows=null;save.disabled=true;
  try{
   if(!selected||selected.size>200000)throw Error('Choose the verified January and February file.');
   const bytes=await selected.arrayBuffer();
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
   if(digest!=='8aa566452771e68f0e36e844797700cc941848df6480448982a1a6b4e360701a')throw Error('The selected file does not match the verified history.');
   const prepared=JSON.parse(new TextDecoder().decode(bytes));check();
   for(const row of prepared){
    if(row.data.mode==='utilization')validateAllocation(row.data,false);
    else row.data.document14316={title:'Budget Request — '+row.data.purpose,html:requestHTML(row.data),settings:{}};
   }
   if(file.files[0]!==selected)return;
   rows=prepared;save.disabled=false;
   status.textContent='Ready: '+rows.filter(r=>r.data.mode==='request').map(r=>report.period(r.data)+' · '+totals327(r.data)).join(' / ');
  }catch(e){status.textContent=e.message;}
 };
 save.onclick=async()=>{
  if(busy||!rows)return;busy=true;save.disabled=true;file.disabled=true;
  try{
   check();await ensureLifecycle();check();
   const months=rows.filter(r=>r.data.mode==='request').map(r=>r.data.budgetMonth290);
   const existing=await client.from('operational_reports').select(BudgetReportWording.select).eq('data->>kind','finance').in('data->>budgetMonth290',months);
   check();if(existing.error)throw existing.error;
   let saved=existing.data||[];
   const complete=list=>list.length===rows.length&&rows.every(row=>list.some(r=>r.id===row.id&&r.data.mode===row.data.mode&&r.data.budgetMonth290===row.data.budgetMonth290&&r.data.requestId14316===row.data.requestId14316));
   if(saved.length&&!complete(saved))throw Error('These months already contain budget records. Review the existing requests before importing.');
   if(!saved.length){
    const result=await client.from('operational_reports').insert(rows).select('*');
    check();if(result.error)throw result.error;saved=result.data||[];
   }
   if(!complete(saved))throw Error('The database response was incomplete. Reopen the import to verify the saved records.');
   const ids=new Set(saved.map(r=>r.id));
   Work82.reports=[...saved,...Work82.reports.filter(r=>!ids.has(r.id))];
   if(document.querySelector('#transactions-budget14313.active'))renderRequest();
   root.resolve108(false);busy=false;chooseRequest(true);
  }catch(e){status.textContent=e.message;file.disabled=false;save.disabled=false;}finally{busy=false;}
 };
}
function canLinkRequest(record){
 const d=allocation;
 return !!(fundPopup?.isConnected&&allocationRecord&&d?.status==='draft'&&!d.requestId14316&&!d.lines.length&&
  record.data.mode==='request'&&record.data.budgetMonth290===d.budgetMonth290&&record.data.purpose===d.purpose&&record.data.recipient===d.recipient);
}
async function linkRequest(id){
 try{
  const check=context(),draft=allocation,record=allocationRecord;
  if(busy||!record)return;
  const parent=await editableRecord(id);check();
  if(draft!==allocation||record!==allocationRecord||!canLinkRequest(parent))return;
  const child=await linkedUtilization(id);check();
  if(child)throw Error('This budget request already has a utilization report.');
  if(draft!==allocation||record!==allocationRecord||busy)return;
  applySpending();
  if(draft.movements.some(m=>m.budgetKey117||m.worksheetLine!=null))throw Error('Review existing item links before attaching this budget request.');
  draft.lines=clone(parent.data.lines);
  draft.fundingByItem=Object.fromEntries(draft.lines.map((line,i)=>[report.fundingKey(line,i),{status:'unconfirmed'}]));
  draft.requestId14316=id;draft.requestVersion14316=parent.version;draft.requestDate290=parent.data.date;
  selectedParent=id;renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function chooseRequest(offerNewRequest=false){
 guard();if(busy)return;
 const saved=budgetRows().filter(r=>r.data.mode==='utilization');
 const entries=requests().map(r=>[esc(report.period(r.data)),esc(r.data.purpose),canLinkRequest(r)?
  button('Link to this draft',`linkRequest(${JSON.stringify(r.id)})`):button('Use request',`startAllocation(${JSON.stringify(r.id)})`)]);
 const reports=saved.map(r=>[esc(report.period(r.data)),esc(r.data.purpose),esc(r._pending14333?(window.localFirst14333?.budgetSave(r.id)?.status||'Waiting for confirmation'):r.data.status||'Draft'),button(r._pending14333?'Save status':isFinal(r)?'View':'Edit',`openAllocation(${JSON.stringify(r.id)})`)]);
 const {root}=budgetDialog('Requests and saved reports',

  section82('Budget requests',table82(['Month','Purpose','Action'],entries))+
  section82('Utilization reports',table82(['Month','Purpose','Status','Action'],reports))+
  (offerNewRequest?button('New Report','newRequest()'):button('New utilization','newUnlinked()'))+historyImportButton());
 root.querySelector('.ui-body108').addEventListener('click',e=>{if(e.target.closest('button[onclick^="budgetWorkflow14316."]'))root.resolve108(false)},true);
}
async function newUnlinked(){
 const check=context();if(busy||!await canLeaveFund())return;
 check();selectedParent='';allocationRequest14370++;allocationRecord=null;allocation=newUtilization();presentFundEditor();
}
async function removeConversion(i){try{const check=context();captureFund();const rows=allocation.conversions,item=rows[i];if(!item)return;if(await ui117.confirm('Delete this conversion?')){check();if(allocation.conversions!==rows)return;const index=rows.indexOf(item);if(index<0)return;const funding=activityPopup?.dataset.funding==='true';rows.splice(index,1);closeActivity();renderAllocation();if(funding)openFundingEditor()}}catch(e){showCenterStatus(e.message,true)}}
function validateAllocation(d,finalize){
 if(!validDate14317(d.date))throw Error('Enter a valid report date.');
 const currencies=new Set(CurrencyStore.currencies.map(c=>c.code));
 const positive=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number.isSafeInteger(Math.round(Number(n)*100));
 if(!d.movements.length&&!d.conversions.length&&!(d.lines.length&&d.fundingByItem))throw Error('Record a funding decision, receipt, movement or conversion first.');
 const loans=new Map(d.movements.filter(m=>report.kind(m)==='borrow').map(m=>[m.id290,m]));
 for(const m of d.movements){
  if(m.ownerAmount!=null){BudgetOwnerBalance.validateShare(m);if(!currencies.has(m.ownerCurrency))throw Error('Choose the original owner funding currency.');}
  const type=report.kind(m),incoming=['receipt','coverage','borrow'].includes(type);
  if(!Object.hasOwn(report.labels,type)||!currencies.has(m.currency)||(!(type==='spend'&&m.worksheetSpend)&&(!m.account||!m.reference))||m.date290&&!validDate14317(m.date290)||!positive(incoming?m.inflow:m.outflow)||Number((incoming?m.outflow:m.inflow)||0)!==0)throw Error('Each movement needs a source, reference, configured currency and one positive amount.');
  if(m.cashDistributed!=null&&(type!=='spend'||!Number.isFinite(m.cashDistributed)||m.cashDistributed<0||!Number.isSafeInteger(Math.round(m.cashDistributed*100))||Math.abs(m.cashDistributed*100-Math.round(m.cashDistributed*100))>0.00001))throw Error('Enter a nonnegative cash distribution with up to two decimal places.');
  if(type==='transfer'&&(!m.destination290||m.destination290===m.account))throw Error('Choose different source and destination accounts for a transfer.');
  const line=d.lines.find(l=>l.key117===m.budgetKey117);
  if(m.budgetKey117&&!line)throw Error('Select a budget item from this request.');
  if(m.cashBudgetAmount!=null&&(m.cashDistributed==null||!positive(m.cashBudgetAmount)))throw Error('Enter a positive cash equivalent, or leave it blank.');
  if(m.budgetAmount290!=null&&!positive(m.budgetAmount290))throw Error('Enter a positive budget equivalent, or leave it blank.');
  if(type==='borrow'&&(!m.id290||report.outstanding(d,m)<0))throw Error('Repayments exceed the amount borrowed. Review the linked advance.');
  if(type==='repay'&&(!loans.has(m.loanId290)||!positive(m.loanAmount290)||m.date290<loans.get(m.loanId290).date290))throw Error('Choose an advance, its settlement amount, and a repayment date on or after the advance.');
 }
 for(const f of d.conversions)if(!currencies.has(f.currency)||!currencies.has(f.target)||f.currency===f.target||!validDate14317(f.date)||!f.source||!(f.evidence||f.reference)||!positive(f.amount)||!Number.isFinite(Number(f.rate))||Number(f.rate)<=0||!positive(report.conversionAmount(f)))throw Error('Enter both currencies, amounts, date, source and evidence for the exchange.');
 const totals=[...report.balances(d).values()];
 if(totals.some(t=>Object.values(t).some(n=>n!==null&&(!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100))))))throw Error('Funding totals exceed the supported amount range.');
}
function negativeAllocationBalances(d){
 return [...report.balances(d)].filter(([c,t])=>Math.round(t.fundRemaining*100)<0)
  .map(([currency,t])=>currency+' ('+Math.abs(t.fundRemaining).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+')').join(', ');
}
async function confirmAllocationFinalization(d){
 const negative=negativeAllocationBalances(d);
 if(!negative)return ui117.confirm('Finalize the received funding and allocations? This saved version becomes read-only in History.');
 return ui108.modal('Negative remaining balance',
  '<p><strong>'+esc(negative)+'</strong></p><p>You can finalize with this negative remaining funding, including when payments use funds from previous months. USD and LAK balances remain separate.</p><p>This saved report becomes read-only in History. Journal posting is a separate step.</p>',
  [{label:'Cancel',value:false},{label:'Finalize anyway',value:true,primary:true}]);
}
async function saveAllocation(finalize){
 const check=context(),record=allocationRecord,selection=allocationRequest14370,controls=[];
 if(busy)return;busy=true;
 try{
  if(confirmedFinals.has(record?.id)||record?.data.status==='finalized')throw Error('This report is finalized or awaiting finalization. Open its notification to review the save.');
  if(!headerValid())return;
  applySpending();const d=clone(allocation);validateAllocation(d,finalize);
  for(const node of fundPopup?.querySelectorAll('input,select,textarea,button:not([data-dismiss])')||[]){controls.push([node,node.disabled]);node.disabled=true;}
  if(finalize&&!await confirmAllocationFinalization(d))return;
  check();if(selection!==allocationRequest14370)return;
  delete d.document14316;d.kind='finance';d.mode='utilization';d.status=finalize?'finalized':'draft';
  d.preparedBy=liveProfile.full_name||liveProfile.email;d.preparedRole290=liveProfile.job_title||livePermission?.job_title||'Prepared by';
  d.finalizedAt14316=finalize?new Date().toISOString():null;
  // The atomic server save validates linked versions; delivery retains the new-report duplicate check.
  // Retain the local identity before releasing the editor; never wait for a network preflight here.
  const r=await saveWork82('reports',d,record);check();
  if(selection!==allocationRequest14370)return;
  const confirmed=Work82.reports.find(row=>row.id===r.id&&row.version===r.version&&!row._pending14333);
  const saved=confirmed||r;
  checkedOnVisit.add(saved.id);
  Work82.reports=[saved,...Work82.reports.filter(old=>old.id!==saved.id)];allocationRecord=saved;allocation=clone(saved.data);
  if(finalize){if(!saved._pending14333)rememberFinal(saved);clearFundPopup();}else renderAllocation();
  if(document.querySelector('#transactions-budget14313.active'))renderRequest();
  const negative=negativeAllocationBalances(d);
  showCenterStatus((saved._pending14333?(finalize?'Finalization queued.':'Save queued.')+' Your copy is saved on this device; follow progress or retry from Notifications.':finalize?'Fund allocation finalized.':'Fund allocation saved.')+(negative&&!finalize?' Warning: negative remaining balance — '+negative+'.':''));
 }catch(e){showCenterStatus(e.message,true);}
 finally{for(const [node,disabled]of controls)node.disabled=disabled;busy=false;}
}
function budgetDialog(title,html,save=false){const pending=ui108.modal(title,html,save?[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]:[{label:'Close',value:false}]);const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');return {pending,root}}
function renderFinalization(){if(liveProfile?.role!=='admin')return;if(finalTab==='funds')finalTab='submitted';const panel=document.getElementById('user-entry-review');if(!panel)return;let bar=panel.querySelector('#finalizationSwitch14316');if(!bar){bar=document.createElement('div');bar.id='finalizationSwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Submitted Entries',"finalization('submitted')")+button('Reconciliation',"finalization('reconciliation')");panel.prepend(bar)}let fund=panel.querySelector('#fundAllocation14316');if(!fund){fund=document.createElement('section');fund.id='fundAllocation14316';panel.append(fund)}window.workspace14337?.mountReconciliation(panel);for(const child of panel.children)if(!child.matches('#finalizationSwitch14316,#fundAllocation14316,#reconciliationWork14337,.area-banner113,.module-header,#categoryTabShell'))child.hidden=finalTab!=='submitted';const rec=panel.querySelector('#reconciliationWork14337');if(rec)rec.hidden=finalTab!=='reconciliation';fund.hidden=finalTab!=='funds';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['submitted','reconciliation'][i]===finalTab)));panel.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove());if(bar.children[1])bar.children[1].hidden=!access113.can('report-reconciliation');if(finalTab==='funds')fund.innerHTML=button('Open budget utilization','showFunds()');if(finalTab==='reconciliation')void renderReconciliationList71()}
function finalization(tab){if(tab==='reconciliation'&&!access113.can('report-reconciliation'))return showCenterStatus('Reconciliation access is required.',true);if(tab==='funds'&&(liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')))return showCenterStatus('Budget Request access is required for Fund Allocation.',true);if(tab==='funds')tab='submitted';finalTab=tab;window.workspace14337?.closeReconciliationHistory();renderFinalization()}
function renderHistory(){const budgetAllowed=liveProfile?.role==='admin'&&!!access113.can('transactions-budget14313')&&Work82.owner===liveProfile.id;const submissionAllowed=!!access113.can('user-entry-review');if(historyTab==='budget'&&!(liveProfile?.role==='admin'&&access113.can('transactions-budget14313'))||historyTab==='submitted'&&!submissionAllowed)historyTab='journal';const panel=document.getElementById('transactions-all');if(!panel)return;let bar=panel.querySelector('#historySwitch14316');if(!bar){const journal=document.createElement('div');journal.id='journalHistory14316';for(const child of [...panel.children])if(!child.matches('.area-banner113,.module-header,#categoryTabShell'))journal.append(child);panel.append(journal);bar=document.createElement('div');bar.id='historySwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Journal',"history('journal')")+button('Submitted Entries',"history('submitted')")+button('Budget Requests',"history('budget')");journal.before(bar);const budget=document.createElement('section');budget.id='budgetHistory14316';panel.append(budget)}bar.querySelectorAll('button').forEach((b,i)=>b.hidden=i===1&&!submissionAllowed||i===2&&!budgetAllowed);const submission=document.getElementById('userEntryHistoryPanel');if(submission&&submission.parentElement!==panel){panel.append(submission);submission.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove())}document.getElementById('journalHistory14316').hidden=historyTab!=='journal';if(submission)submission.hidden=historyTab!=='submitted';const budget=document.getElementById('budgetHistory14316');budget.hidden=historyTab!=='budget';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['journal','submitted','budget'][i]===historyTab)));const historyRecords=budgetAllowed?budgetRows():[];const month=historyMonth14341.choose('budget',historyRecords.map(budgetMonth));if(historyTab!=='budget')return;budget.innerHTML=historyMonth14341.control('budget',month)+historyMonth14341.summary([['Budget Records',budgetMonthRows(historyRecords,month).length]])+section82('Budget Request History',table82(['Date','Purpose','Record','Status','Action'],budgetMonthRows(historyRecords,month).map(r=>[esc(formatAppDate(r.data.date)),esc(r.data.purpose),r.data.mode==='utilization'?'Fund allocation':'Budget request',esc(r._pending14333?(window.localFirst14333?.budgetSave(r.id)?.status||'Waiting for confirmation'):r.data.status||'Saved'),button('View',`view(${JSON.stringify(r.id)})`)+(r.data.mode!=='utilization'?button('Editor',`openRequest(${JSON.stringify(r.id)})`):r.data.status!=='finalized'?button('Continue',`openAllocation(${JSON.stringify(r.id)})`):'')+button('Delete',`remove(${JSON.stringify(r.id)})`)])));historyMonth14341.bind(budget,'budget',renderHistory,true)}
function history(tab){historyTab=tab;renderHistory();if(tab==='submitted')window.renderUserEntryReview?.();if(tab==='budget')(window.startup14257?.isPrepared('payroll')?Promise.resolve():loadWork82()).then(renderHistory)}
async function showFinal(record){
 rememberFinal(record);
 if(allocation&&(allocationRecord?.id===record.id||record.data.requestId14316&&allocation.requestId14316===record.data.requestId14316)){
  const current=allocation;
  if(!await canLeaveFund()||allocation!==current)return;
  clearFundPopup();
 }
 selectedParent=record.data.requestId14316||'';
 if(document.querySelector('#transactions-budget14313.active'))renderRequest();
 return showReport(record);
}
async function view(id){
 if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
 try{const r=await editableRecord(id);if(isFinal(r))await showFinal(r);else await showReport(r);}catch(e){showCenterStatus(e.message,true)}
}
function cacheWording(record){
 const index=Work82.reports.findIndex(r=>r.id===record.id);
 if(index>=0)Work82.reports[index]=record;
 rememberFinal(record);
}
async function showReport(r){
  const d=BudgetReportWording.data(r),utilization=d.mode==='utilization',id=r.id;
  const check=context();
  const html=documentWorkspace105.sanitize(utilization?report.report(d):d.document14316?.html||financeHtml82(d));
  const {root}=budgetDialog(utilization?report.title:'Budget request',html+'<div data-journal-ref></div>');
  root.classList.add('fund-popup326','budget-report-preview');
  const canEditWording=isFinal(r)||(!utilization&&(r.budget_report_wording||budgetRows().some(x=>x.data.requestId14316===id)));
  reportToolbar(root,(canEditWording?'<button type="button" data-edit-wording>'+(utilization?'Additional information':'Wording')+'</button>':'')+'<button type="button" data-print-record>Print</button>'+(utilization?postControl(r):''));
  root.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  const wording=root.querySelector('[data-edit-wording]');
  if(wording)wording.onclick=()=>BudgetReportWording.edit(r,budgetDialog,context(),saved=>{
   cacheWording(saved);if(root.isConnected){root.resolve108(true);showReport(saved);}
  });
  root.querySelector('[data-print-record]').onclick=()=>printRecord(id,root);
  if(utilization){
   showJournalReference(root,r);
   if(d.notes){const details=document.createElement('details');details.className='worksheet-details';
    details.innerHTML='<summary>Record notes (not printed)</summary><p>'+esc(d.notes)+'</p>';root.querySelector('[data-journal-ref]').before(details);}
  }
}

async function printRecord(id,dialog){
 try{
  if(window.localFirst14333?.budgetSave(id)&&!window.localFirst14333.budgetSave(id).confirmed)return window.budgetSaveStatus472.open(id);
  const r=await live(id);
  const d=BudgetReportWording.data(r);
  if(d.mode==='utilization')return await printUtilization(d,r,dialog);
  return await print82('Budget Request',documentWorkspace105.sanitize(d.document14316?.html||financeHtml82(d)),d.date);
 }catch(e){showCenterStatus(e.message,true)}
}
async function remove(id){try{const check=context(),client=ojmDb;if(Work82.reports.some(r=>(r.id===id||r.data.requestId14316===id)&&r._pending14333))throw Error('A save for this report is awaiting confirmation. Open its notification before deleting.');const r=await live(id);const children=Work82.reports.filter(x=>x.data.requestId14316===id);if(!await ui117.confirm('Delete this '+(r.data.mode==='utilization'?'allocation':'request and all linked allocations')+'? The saved document and shared link will also be removed.'))return;check();const out=await client.rpc('delete_budget14316',{p_id:id,p_version:r.version});check();if(out.error)throw Error(out.error.code==='PGRST202'?'Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql before deleting a linked budget record.':out.error.message);const removed=new Set(out.data?.deletedIds||[id,...children.map(x=>x.id)]);Work82.reports=Work82.reports.filter(x=>!removed.has(x.id));if(removed.has(allocationRecord?.id)||removed.has(allocation?.requestId14316)){allocation=null;allocationRecord=null}if(removed.has(Work82.reportRecord?.id)){Work82.reportRecord=null;Work82.report=null}renderHistory();showCenterStatus('Budget transaction deleted.')}catch(e){showCenterStatus(e.message,true)}}
const switchBefore=window.switchTab;window.switchTab=function(id,...args){if(id==='transactions-budget14313')checkedOnVisit=new Set();captureFund();return switchBefore.call(this,id,...args)};
const renderBefore=window.renderWork82;window.renderWork82=function(...args){const out=renderBefore.apply(this,args);if(document.querySelector('#user-entry-review.active'))renderFinalization();if(document.querySelector('#transactions-all.active'))renderHistory();return out};
const deleteBefore=window.deleteWork108;window.deleteWork108=function(kind,id){return kind==='reports'&&Work82.reports.find(r=>r.id===id)?.data.kind==='finance'?remove(id):deleteBefore(kind,id)};
const openBefore=window.openOperational82;window.openOperational82=function(id){const r=Work82.reports.find(r=>r.id===id);return r?.data.kind==='finance'?(r.data.mode==='utilization'?openAllocation(id):openRequest(id)):openBefore(id)};
window.budgetWorkflow14316={refreshSaveStatus(){if(!busy&&actor===liveProfile?.id&&actorClient===ojmDb&&document.querySelector('#transactions-budget14313.active'))renderRequest();},get finalTab(){return finalTab},get historyTab(){return historyTab},prepareHistory:renderHistory,prepareFinalization:renderFinalization,renderRequest,newRequest,editRequest,requestData,refreshCategories,templateApplied,printPicker,requestHTML,showFunds,combineRequests,saveDocument,requireSaved,decorateEditor,openRequest,startAllocation,openAllocation,chooseRequest,linkRequest,importHistory,saveAllocation,previewAllocation,newUnlinked,removeMovement,removeConversion,finalization,history,view,printRecord,remove,parseDocument,recalculate,validDate14317,editMovement,editConversion,openFundingEditor};
window.addEventListener('transactions-reset14316',e=>{if(e.detail.scopes.includes('reports')){confirmedFinals.clear();checkedOnVisit=new Set();selectedParent='';if(requestEditor){requestEditor.root.resolve108(false);requestEditor=null;}allocation=null;allocationRecord=null;clearFundPopup();Work82.reports=[];Work82.report=null;Work82.reportRecord=null;Object.assign(Finance82,{mode:'request',date:today82(),recipient:'',purpose:'',notes:'',lines:[],movements:[],conversions:[]});renderHistory()}});
function checkPopupAccess(){
 if(requestEditor&&(liveProfile?.id!==actor||ojmDb!==actorClient||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){requestEditor.root.resolve108(false);requestEditor=null;}

 if(fundPopup&&(liveProfile?.id!==actor||actorClient!==ojmDb||liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')||!document.getElementById('loginGate')?.classList.contains('is-authenticated'))){
  clearFundPopup();allocation=null;allocationRecord=null;allocationRequest14370++;
 }
}
const loginGate=document.getElementById('loginGate');if(loginGate)new MutationObserver(checkPopupAccess).observe(loginGate,{attributes:true,attributeFilter:['class']});
window.addEventListener('page113',()=>{checkPopupAccess();if(window.workspaceViews14364?.reuseView(document.querySelector('.tab-content.active')?.id)){decorateEditor();return}if(document.querySelector('#user-entry-review.active')&&liveProfile?.role==='admin'){renderFinalization();if(finalTab==='submitted'&&!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#user-entry-review.active'))renderFinalization()}).catch(e=>showCenterStatus(e.message,true))}if(document.querySelector('#transactions-all.active')){renderHistory();if(!window.startup14257?.isPrepared('payroll'))void loadWork82().then(()=>{if(document.querySelector('#transactions-all.active'))renderHistory()}).catch(e=>showCenterStatus(e.message,true))}decorateEditor()});
})();

;
/* Report-specific delivery feedback. Reads the existing durable queue; no polling. */
(()=>{'use strict';
const esc=v=>escapeHtml(String(v??''));
let current=null;
function render(){
 const item=current;if(!item)return;
 if(liveProfile?.id!==item.owner||ojmDb!==item.client){item.root.resolve108(false);return;}
 const s=window.localFirst14333?.budgetSave(item.id);
 if(!s){item.root.resolve108(false);return;}
 item.root.querySelector('[data-budget-save-state]').textContent=s.status;
 item.root.querySelector('[data-budget-save-detail]').textContent=s.detail;
 const retry=item.root.querySelector('[data-budget-retry]');
 retry.hidden=s.confirmed;retry.disabled=s.sending||navigator.onLine===false;
 retry.textContent=s.sending?'Sending…':s.finalizing?'Retry finalization':'Retry save';
 item.root.querySelector('[data-budget-open]').hidden=!s.confirmed;
 item.root.querySelector('[data-budget-review]').hidden=!s.failed;
 const copyKey=s.job.id+':'+s.confirmed;
 if(item.copyKey!==copyKey){
  const copy=structuredClone(s.job.row.data);if(!s.confirmed)copy.status='draft';
  item.root.querySelector('[data-budget-copy]').innerHTML=BudgetReport290.report(copy);item.copyKey=copyKey;
 }
}
async function open(id){
 const owner=liveProfile?.id,client=ojmDb;
 if(!owner||liveProfile.role!=='admin'||!access113.can('transactions-budget14313')||window.workspaceRequest138?.target)throw Error('Return to your administrator Budget Requests workspace.');
 await localFirst14333.initialize();
 if(owner!==liveProfile?.id||client!==ojmDb)throw Error('Your sign-in changed. Reopen the notification.');
 const s=localFirst14333.budgetSave(id);if(!s)throw Error('The saved request is no longer available. Open Budget Requests.');
 if(current?.id===id&&current.owner===owner){render();return true;}
 current?.root.resolve108(false);
 switchTab('transactions-budget14313');
 if(!document.getElementById('transactions-budget14313')?.classList.contains('active'))return false;
 const d=s.job.row.data;
 const pending=ui108.modal('Fund utilization · Save status',
  '<p><strong>'+esc(BudgetReport290.period(d))+'</strong> · '+esc(d.purpose)+'</p>'+
  '<p role="status" aria-live="polite"><strong data-budget-save-state></strong></p><p data-budget-save-detail></p>'+
  '<div class="actions82"><button type="button" data-budget-retry>Retry save</button><button type="button" data-budget-open>Open report</button><button type="button" data-budget-review>Review in Data Check</button></div>'+
  '<p data-budget-save-error role="alert"></p><details><summary>View the copy saved on this device</summary><div data-budget-copy></div></details>',
  [{label:'Close',value:false}]);
 const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');
 const item={id,owner,client,root};current=item;
 const valid=()=>current===item&&liveProfile?.id===owner&&ojmDb===client;
 root.querySelector('[data-budget-retry]').onclick=async()=>{
  if(!valid())return;
  const error=root.querySelector('[data-budget-save-error]');error.textContent='';
  try{await localFirst14333.retryBudget(id);}catch(e){if(valid())error.textContent=e.message;}
  if(valid())render();
 };
 root.querySelector('[data-budget-open]').onclick=async()=>{
  if(!valid()||!localFirst14333.budgetSave(id)?.confirmed)return;
  root.resolve108(false);await window.budgetWorkflow14316.openAllocation(id);
 };
 root.querySelector('[data-budget-review]').onclick=()=>{
  if(!valid())return;
  const state=localFirst14333.budgetSave(id);root.resolve108(false);
  switchTab('transactions-closing14325');window.syncAssessment14332?.focus(state.job.id,d.budgetMonth290||String(d.date||'').slice(0,7));
 };
 pending.finally(()=>{if(current===item)current=null;});render();return true;
}
window.budgetSaveStatus472={open};
window.addEventListener('local-work14333',()=>{
 render();
 window.budgetWorkflow14316?.refreshSaveStatus?.();
});
window.addEventListener('online',render);window.addEventListener('offline',render);
})();
