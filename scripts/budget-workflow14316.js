/* The request snapshot stays intact. Each worksheet amount belongs to one expense. */
window.BudgetSpendingWorksheet = (() => {
 const esc = value => escapeHtml(String(value ?? ''));
 function mount(host, draft, edit) {
  const body = host.querySelector('[data-spending-rows]');
  const currencies = budget14313.currencyOptions(draft.lines);
  const rows = [];
  const decisions = [];
  const base=BudgetReport290.requestCurrency(draft);
  const report=BudgetReport290;
  const toggle=host.querySelector('[data-item-equivalents]');
  if(toggle)toggle.onchange=refreshValuations;
  function refreshValuations() {
   const paidByLine=new Map();
   for(const state of rows){
    const {line,choice,amount,equivalent,stack,secondary}=state;
    const paid=choice?.value||state.currency, requested=line?.currency||base;
    const cross=requested && paid!==requested && (!toggle||toggle.checked);
    const n=amount.valueAsNumber;
    secondary.hidden=!cross;
    if(!cross)continue;
    const value=Number.isFinite(n)&&n>0?report.valueIn(draft,n,paid,requested):null;
    if(equivalent)equivalent.placeholder=n>0?report.amountText(value):'0.00';
    else secondary.innerHTML=n>0?report.amountLines([requested],()=>value):'';
    const first=report.orderedUnits([paid,requested])[0]===requested?secondary:state.native;
    if(stack.firstElementChild!==first)stack.prepend(first);
    if(line && n>0){
     if(!paidByLine.has(line))paidByLine.set(line,new Set());
     paidByLine.get(line).add(paid);
    }
   }
   for(const {line,requestCell,select,received,display,deduction} of decisions){
    const codes=[line.currency,...(paidByLine.get(line)||[])];
    requestCell.innerHTML=report.amountLines(codes,c=>report.valueIn(draft,line.amount,line.currency,c));
    const partial=select.value==='deduction';
    deduction.hidden=!partial;
    if(select.value==='unconfirmed'){display.textContent='—';continue;}
    if(!partial){
     const funded=select.value==='declined'?0:line.amount;
     display.innerHTML=report.amountLines(select.value==='approved'?[line.currency]:codes,c=>report.valueIn(draft,funded,line.currency,c));
    }else{
     const others=codes.filter(c=>c!==line.currency);
     display.innerHTML=report.amountLines(others,c=>Number.isFinite(received.valueAsNumber)?report.valueIn(draft,received.valueAsNumber,line.currency,c):null);
     const first=report.orderedUnits(codes)[0]===line.currency?deduction:display;
     if(first.parentElement.firstElementChild!==first)first.parentElement.prepend(first);
    }
   }
  }
  function fundingCells(row,line,index,requestCell) {
   const {status,amount} = report.lineFunding(draft,line,index);
   const name = esc(line.description);
   const statusCell = row.insertCell(), fundedCell = row.insertCell();
   statusCell.innerHTML = '<select data-plain14285 aria-label="Funding status for '+name+'">'+
    Object.entries(report.fundingLabels).map(([value,label]) =>
     '<option value="'+value+'">'+label+'</option>').join('')+'</select>';
   fundedCell.innerHTML = '<div data-funded-value></div><div data-deduction><input type="number" name="receivedAmount" step="0.01" min="0" data-currency="'+esc(line.currency)+'" aria-label="Amount received for '+name+'" placeholder="Received"></div>';
   const select = statusCell.querySelector('select'), deduction = fundedCell.querySelector('[data-deduction]');
   const received = deduction.querySelector('input'), display = fundedCell.querySelector('[data-funded-value]');
   select.value = status;
   if (status === 'deduction') received.value = amount;
   select.onchange = refreshValuations;
   received.addEventListener('input',refreshValuations);
   decisions.push({line,index,requestCell,select,received,display,deduction});
  }
  function append(line, movement, first = true, index = -1) {
   const row = body.insertRow();
   const currency = movement?.currency || line?.currency || currencies[0]?.[0];
   const linked = !!line;
   const cell = html => { row.insertCell().innerHTML = html; };
   const item = line?.description || movement?.description290 || '';
   cell(linked ? '<strong>'+esc(item)+'</strong>'+(first?'<small>'+esc(line.category)+'</small>':'')+
    (movement?.description290?'<small>'+esc(movement.description290)+'</small>':'') :
    '<small>'+esc(movement?.destination290||'Additional spending')+'</small><input name="description" aria-label="Additional spending detail" placeholder="Spending detail" value="'+esc(item)+'">');
   const requestCell=row.insertCell();
   if (linked && first) fundingCells(row,line,index,requestCell);
   else { row.insertCell(); row.insertCell(); }
   const currencyChoice = !movement && currencies.length>1 ? '<select data-plain14285 data-spending-currency aria-label="Spending currency" title="Spending currency">'+currencies.map(([c]) =>
    '<option value="'+esc(c)+'"'+(c===currency?' selected':'')+'>'+esc(currencySymbolV6(c))+'</option>').join('')+'</select>' : '';
   const moneyField=(code,input,picker='')=>'<span class="money-field14231"><span class="money-symbol14231" title="'+esc(code)+'">'+esc(currencySymbolV6(code))+'</span>'+picker+input+'</span>';
   const native='<div class="worksheet-amount" data-native>'+moneyField(currency,'<input type="number" step="0.01" min="0" name="actualAmount" data-currency="'+esc(currency)+'" aria-label="Actual spending'+(item?' for '+esc(item):'')+'" value="'+esc(movement?.outflow??'')+'" placeholder="0.00">',currencyChoice)+'</div>';
   const equivalent=linked?moneyField(line.currency,'<input type="number" step="0.01" min="0.01" name="equivalentAmount" data-currency="'+esc(line.currency)+'" aria-label="Spending equivalent in '+esc(line.currency)+' for '+esc(item)+'" title="Enter the recorded equivalent, or leave blank to use the report exchange rate." value="'+esc(movement?.budgetAmount290??'')+'">'):'';
   cell('<div class="worksheet-stack">'+native+'<div class="worksheet-amount" data-equivalent hidden>'+equivalent+'</div></div>');
   const action = row.insertCell();
   if (movement) {
    const details = document.createElement('button');
    details.type = 'button'; details.textContent = 'Details';
    details.onclick = () => edit(draft.movements.indexOf(state.movement)); action.append(details);
   } else if (!linked) {
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Remove';
    remove.onclick = () => {
     if (state.movement) { edit(draft.movements.indexOf(state.movement)); return; }
     rows.splice(rows.indexOf(state), 1); row.remove();refreshValuations();
    };
    action.append(remove);
   }
   const amount = row.querySelector('[name=actualAmount]'), choice = row.querySelector('[data-spending-currency]');
   const stack=row.querySelector('.worksheet-stack'), secondary=stack.querySelector('[data-equivalent]');
   const state = {line,movement,row,amount,choice,currency,stack,native:stack.querySelector('[data-native]'),secondary,
    equivalent:secondary.querySelector('input'),amountEdited:false,equivalentEdited:false,detailEdited:false};
   if (choice) choice.onchange = () => {
    amount.dataset.currency = choice.value;
    if(state.equivalent){state.equivalent.value='';state.equivalentEdited=false;}
    window.financialNumbers14231?.scan(row); refreshValuations();
   };
   state.equivalent?.addEventListener('input',()=>{state.equivalentEdited=true;});
   amount.addEventListener('input', () => { state.amountEdited=true;refreshValuations(); });
   row.querySelector('[name=description]')?.addEventListener('input', () => { state.detailEdited=true; });
   for (const td of row.cells) td.dataset.label = body.parentElement.tHead.rows[0].cells[td.cellIndex].textContent;
   rows.push(state);
   return row;
  }
  const spent = draft.movements.filter(m => BudgetReport290.kind(m) === 'spend');
  for (const [index,line] of draft.lines.entries()) {
   const matches = spent.filter(m => BudgetReport290.forLine(m, line, index));
   if (matches.length) matches.forEach((m,i) => append(line,m,i===0,index));
   else append(line,null,true,index);
  }
  for (const m of spent.filter(m => !draft.lines.some((line,i) => BudgetReport290.forLine(m,line,i)))) append(null,m);
  refreshValuations();
  host.querySelector('[data-add-spending]').onclick = () => {
   const row = append(null,null); refreshValuations(); row.querySelector('[name=description]').focus();
  };
  function invalid(input,message) {
   input.focus(); throw Error(message);
  }
  return function apply() {
   const funding = {};
   for (const {line,index,select,received} of decisions) {
    const decision = {status:select.value};
    if (decision.status === 'deduction') {
     const n = received.valueAsNumber;
     if (!Number.isFinite(n) || n < 0 || n > Number(line.amount) || !Number.isSafeInteger(Math.round(n*100)) || Math.abs(n*100-Math.round(n*100))>0.00001)
      invalid(received,'Enter the amount received for '+line.description+' between 0 and '+line.currency+' '+formatAppNumber(line.amount)+', with up to two decimal places.');
     decision.received = n;
    }
    funding[BudgetReport290.fundingKey(line,index)] = decision;
   }
   const changes = [];
   for (const state of rows) {
    const {line,movement,row,amount,choice,currency} = state;
    if (movement && !state.amountEdited && !state.equivalentEdited && !state.detailEdited) continue;
    const description = row.querySelector('[name=description]');
    const detail = description?.value.trim() || '';
    const raw = amount.value, value = movement && !state.amountEdited ? Number(movement.outflow) : amount.valueAsNumber;
    if (!movement && !detail && !state.equivalent?.value && !amount.validity.badInput && (!raw || value === 0)) continue;
    if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value*100)) || (state.amountEdited && Math.abs(value*100-Math.round(value*100))>0.00001)) {
     invalid(amount, movement ? 'Enter a positive spending amount. Use Details to remove the expense.' : 'Enter a positive spending amount with up to two decimal places.');
    }
    if (!line && !detail && (!movement || movement.worksheetSpend)) invalid(description,'Enter a description for the additional spending.');
    const explicit=state.equivalentEdited && line && line.currency!==(choice?.value||currency);
    const equivalent=explicit && state.equivalent.value!==''?state.equivalent.valueAsNumber:null;
    if(explicit && equivalent!==null && (!Number.isFinite(equivalent)||equivalent<=0||!Number.isSafeInteger(Math.round(equivalent*100))||Math.abs(equivalent*100-Math.round(equivalent*100))>0.00001))
     invalid(state.equivalent,'Enter a positive spending equivalent with up to two decimal places, or leave it blank to use the report exchange rate.');
    if (!explicit && movement && Number(movement.outflow) === value && (!description || detail === (movement.description290 || ''))) continue;
    const next = movement ? {...movement} : {id290:crypto.randomUUID(),type290:'spend',worksheetSpend:true,date290:draft.date,
     account:'',reference:'',currency:choice?.value || currency,budgetKey117:line?.key117 || '',inflow:0};
    if (!movement && line && !line.key117) next.worksheetLine = draft.lines.indexOf(line);
    if(explicit){
     if(equivalent===null)delete next.budgetAmount290;
     else next.budgetAmount290=equivalent;
    }
    next.outflow=value;
    if (description) next.description290 = detail;
    changes.push({state,next});
   }
   if (decisions.length) draft.fundingByItem = funding;
   for (const {state,next} of changes) {
    if (state.movement) draft.movements[draft.movements.indexOf(state.movement)] = next;
    else draft.movements.push(next);
    state.movement = next; state.amountEdited=false; state.equivalentEdited=false; state.detailEdited=false;
    if (state.choice) state.choice.disabled = true;
    const action = state.row.lastElementChild;
    if (!action.querySelector('button') || action.textContent === 'Remove') {
     const details = document.createElement('button');
     details.type = 'button'; details.textContent = 'Details';
     details.onclick = () => edit(draft.movements.indexOf(state.movement));
     action.replaceChildren(details);
    }
   }
  };
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
 const labels={receipt:'Funding received',spend:'Expense paid',borrow:'Temporary advance received',repay:'Advance repaid',refund:'Unused funding returned',transfer:'Transfer between accounts',coverage:'Shortfall covered by restaurant'};
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
  const fields=[['requested','Requested'],['receipt','Funding received'],['coverage','Shortfall covered by restaurant'],['convertedOut','Amount exchanged'],['convertedIn','Received from exchanges'],['borrow','Temporary advances received'],['repay','Advances repaid'],['cashSpent','Cash distributed'],['beforeReturn','Cash remaining']];
  const cash=document.createElement('div');
  cash.innerHTML=table82(['Activity',...columns],fields.filter(([key])=>['receipt','cashSpent','beforeReturn','requested'].includes(key)||columns.some(c=>totals.get(c)[key])).map(([key,label])=>[esc(label),...columns.map(c=>amountHtml(c,totals.get(c)[key]))]));
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
 function report(d,journalReference=''){
  if(d.mode!=='utilization'&&d.document14316?.html)return documentWorkspace105.sanitize(d.document14316.html);
  if(d.mode!=='utilization')return window.budgetWorkflow14316.requestHTML(d);
  const route=(source,to)=>esc(source)+(to?' → '+esc(to):'');
  const movements=movementRows(d).map(([date,activity,source,to,item,amount,reference])=>[date+'<br>'+activity,source+(to==='—'?'':' → '+to),item,amount,reference]);
  const exchanges=(d.conversions||[]).map(f=>[esc(formatAppDate(f.date))+'<br>'+esc(f.evidence||f.reference),route(f.source,f.destination290),amountHtml(f.currency,f.amount),amountHtml(f.target,conversionAmount(f)),esc(formatAppRate(f.rate)+' '+f.target+'/'+f.currency)]);
  const refs=[d.requestDate290?'Request date: '+esc(formatAppDate(d.requestDate290)):'',d.receiptReference290?'Reference: '+esc(d.receiptReference290):'',journalReference?'Utilization journal: '+esc(journalReference):''].filter(Boolean).join(' · ');
  return '<h1 style="text-align:center">'+title+'</h1><p><strong>'+esc(d.purpose)+'</strong></p><p>Budget month: '+esc(period(d))+' · Report date: '+esc(formatAppDate(d.date))+(refs?'<br>'+refs:'')+'</p>'+summary(d)+section82('Receipts, spending and repayments',sizedTable(['Date / activity','Source and destination','Budget item','Amount','Reference'],movements,[15,18,36,16,15]))+section82('Currency conversions',table82(['Date / reference','Source and destination','Exchanged','Received','Rate'],exchanges))+(d.notes?'<p>'+esc(d.notes)+'</p>':'')+signature(d);
 }
 return {title,compare,cashPaid,equivalentField,reportRate,requestCurrency,valueIn,amountText,currencyAmount,amountHtml,amountLines,orderedUnits,items,period,layout,recalculate,signature,report,kind,labels,summary,balances,conversionAmount,outstanding,movementRows,movementHeaders,forLine,fundingLabels,fundingKey,lineFunding};
})();
/* USD owner support is accounted for in regular equity, in its original currency. */
window.BudgetSupportEquity=(()=>{
 'use strict';
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const journalRefs=s=>[...new Set(String(s||'').toUpperCase().match(/\bOJM\d{6}(?:-\d+)?\b/g)||[])];
 const roleName={remaining:'Owner Financial Support — Remaining — USD',used:'Owner Financial Support — Used — USD'};
 const regular=(a,type)=>a?.currency==='USD'&&a.isPosting!==false&&!a.isTechnical&&a.type===type&&(!a.purpose||a.purpose==='regular');
 function equity(role){
  const matches=AccountingStore.accounts.filter(a=>regular(a,'EQUITY')&&norm(a.name).replace(/\busd\b/g,'').trim()===norm(roleName[role]).replace(/ usd$/,''));
  return matches.length===1?matches[0]:null;
 }
 function receipts(d){return (d.movements||[]).filter(m=>BudgetReport290.kind(m)==='receipt'&&m.currency==='USD'&&Number(m.inflow)>0);}
 function groups(d){
  const list=receipts(d),header=journalRefs(d.receiptReference290),groups=new Map();
  for(const m of list){
   let refs=journalRefs(m.reference);
   if(!refs.length&&header.length){
    if(list.length!==1)throw Error('Identify the posted journal on each USD receipt before preparing this report.');
    refs=header;
   }
   if(refs.length>1)throw Error('Identify one funding journal per USD receipt.');
   const reference=refs[0]||'',destination=m.destination290||'',key=reference||'new:'+destination;
   if(!groups.has(key))groups.set(key,{reference,destination,amount:0});
   groups.get(key).amount+=Number(m.inflow);
  }
  return [...groups.values()];
 }
 async function evidence(groups){
  const numbers=groups.map(g=>g.reference).filter(Boolean);
  if(!numbers.length)return [];
  const {data,error}=await ojmDb.from('journal_entries').select('entry_no,status,journal_lines(currency_code,debit,credit,fx_rate_lak,book_rate_lak,accounts(id,code,name))').in('entry_no',numbers).setHeader('x-ojm-database-only','1');
  if(error)throw Error('Could not verify the funding journal. '+error.message);
  return data||[];
 }
 function usage(d,received){
  const balances=BudgetReport290.balances(d),usd=balances.get('USD');
  let used=0;
  const fxRows=d.conversions||[];
  for(const [currency,b] of balances){
   if(currency==='USD')continue;
   const sales=fxRows.filter(f=>f.currency==='USD'&&f.target===currency);
   const proceeds=sales.reduce((n,f)=>n+BudgetReport290.conversionAmount(f),0);
   const sold=sales.reduce((n,f)=>n+Number(f.amount),0);
   const boughtBack=fxRows.filter(f=>f.currency===currency&&f.target==='USD').reduce((n,f)=>n+Number(f.amount),0);
   if((sales.length||b.cashSpent)&&fxRows.some(f=>f.currency!=='USD'&&f.target!=='USD'&&(f.currency===currency||f.target===currency)))
    throw Error('Review the cross-currency conversion before allocating USD support to '+currency+' spending.');
   // Local top-ups cover shortfalls. Other funds, returns and unspent proceeds are not owner spending.
   const available=Math.max(0,proceeds-boughtBack);
   if(round(b.cashSpent+b.repay+b.refund+boughtBack-proceeds-b.receipt-b.coverage-b.borrow)>0)
    throw Error('Record the exchange or separate funding that covered the '+currency+' payments before preparing USD support.');
   const ownerPaid=Math.max(0,b.cashSpent-b.coverage);
   if(available>0&&ownerPaid>0)used+=Math.min(available,ownerPaid)*sold/proceeds;
  }
  const otherUsd=Math.max(0,usd.receipt-received)+usd.borrow+usd.coverage;
  if(round(usd.cashSpent+usd.convertedOut+usd.refund+usd.repay-usd.convertedIn-received-otherUsd)>0)
   throw Error('The USD payments exceed the recorded cash available. Review receipts and exchanges.');
  if(otherUsd>0&&usd.convertedOut>0&&usd.convertedOut>received)
   throw Error('Separate the USD exchange funded by other sources before preparing owner support.');
  used=round(used+Math.max(0,usd.cashSpent-usd.coverage));
  if(used>received&&otherUsd<=0)throw Error('USD used exceeds owner funding. Review payments, receipts and conversions.');
  return Math.min(used,received);
 }
 function receivingAccount(destination){
  const accounts=AccountingStore.accounts.filter(a=>regular(a,'ASSET'));
  const match=getSelectedAccountInfo(destination);
  if(match)return regular(match,'ASSET')?match:null;
  const text=norm(destination);
  if(text&&!['budget funds','budget funds usd','bcel','bcel usd'].includes(text)){
   const matches=accounts.filter(a=>norm(a.name)===text||norm(a.name).replace(/ usd$/,'')===text);
   return matches.length===1?matches[0]:null;
  }
  return accounts.find(a=>a.code==='1041'&&/\bbcel\b/i.test(a.name));
 }
 function plan(d,groups,journals){
  const remaining=equity('remaining'),usedAccount=equity('used');
  const received=round(groups.reduce((s,g)=>s+g.amount,0)),used=usage(d,received);
  const pairs=[],notes=[];let classified=0,carryingValue=0,valuedAmount=0;
  function pair(label,amount,debit,credit,roles,rate){
   pairs.push({label,amount:round(amount),currency:'USD',debitCode:debit?.code||'',creditCode:credit?.code||'',debitId:debit?.id||'',creditId:credit?.id||'',roles,rate});
  }
  for(const g of groups){
   if(!g.reference){
    pair('Funding received',g.amount,receivingAccount(g.destination),remaining,['asset','remaining']);
    continue;
   }
   const entry=journals.find(j=>j.entry_no===g.reference&&j.status==='posted');
   if(!entry)throw Error('Check receipt reference '+g.reference+'. A posted journal must be verified before preparing its funding.');
   const lines=entry.journal_lines.filter(l=>l.currency_code==='USD');
   const credits=lines.filter(l=>Number(l.credit)>0&&((remaining&&l.accounts?.id===remaining.id)||l.accounts?.code==='3026'));
   if(!credits.length||round(credits.reduce((s,l)=>s+Number(l.credit),0))!==round(g.amount))
    throw Error('The USD support credit in '+g.reference+' does not match this receipt. Review the funding reference and amount.');
   for(const l of credits){
    const amount=Number(l.credit),rate=Number(l.book_rate_lak||l.fx_rate_lak)||null;
    if(rate){carryingValue+=amount*rate;valuedAmount+=amount;}
    if(l.accounts.code==='3026'){
     const prior=AccountingStore.accounts.find(a=>a.id===l.accounts.id&&regular(a,'EQUITY'));
     if(!prior)throw Error('Refresh the chart to load the original support account from '+g.reference+'.');
     pair('Funding received · reclassify '+g.reference,amount,prior,remaining,['original','remaining'],rate);
    }
   }
   const usedCredit=lines.filter(l=>usedAccount&&l.accounts?.id===usedAccount.id).reduce((s,l)=>s+Number(l.credit),0);
   const remainingDebit=lines.filter(l=>remaining&&l.accounts?.id===remaining.id).reduce((s,l)=>s+Number(l.debit),0);
   if(round(usedCredit)!==round(remainingDebit))throw Error('Review the existing support allocation in '+g.reference+'.');
   classified+=usedCredit;
   notes.push('Receipt already posted in '+g.reference+'.');
  }
  const toClassify=round(used-classified);
  if(toClassify<0)throw Error('The referenced journals already classify more USD as used than this report shows.');
  if(toClassify>0)pair('Fund used',toClassify,remaining,usedAccount,['remaining','used'],round(valuedAmount)===received?carryingValue/valuedAmount:null);
  if(!pairs.length)throw Error('The referenced journal already records the full support allocation for this report.');
  const missing=['remaining','used'].filter(role=>pairs.some(p=>p.roles.includes(role))&&!equity(role)).map(role=>roleName[role]);
  const notice=['USD support · $'+formatAppNumber(received)+' received · $'+formatAppNumber(used)+' used · $'+formatAppNumber(round(received-used))+' remaining.',...notes];
  if(missing.length)notice.push('Required in the Chart of Accounts: '+missing.join(' and ')+'.');
  return {pairs,notice:notice.join(' ')};
 }
 function validate(pair,lines){
  return pair.roles.every((role,i)=>{
   const id=lines[i].account_id;
   if(role==='asset')return regular(AccountingStore.accounts.find(a=>a.id===id),'ASSET');
   if(role==='original')return id===pair.debitId;
   return id===equity(role)?.id;
  });
 }
 return {groups,evidence,plan,validate};
})();
// Wording revisions apply to a single saved snapshot. All numeric fields come from that snapshot.
const BudgetReportWording=(()=>{
 const select='*,budget_report_wording(report_version,revision,notes,descriptions)';
 function data(record){
  const source=record.data,wording=record.budget_report_wording;
  if(!wording||wording.report_version!==record.version)return source;
  const d=structuredClone(source);
  d.notes=wording.notes;
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
  const {root}=dialog('Edit report wording','<form><label>Report notes<textarea rows="4" name="notes">'+esc(d.notes)+'</textarea></label>'+
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
  if(!prepared)return;
  const notice=document.createElement('p');notice.id='budgetJournalNotice';
  notice.textContent=prepared.notice||'Budget utilization · '+prepared.period+'. Choose the debit and credit accounts for each summary pair. For funding already posted, use the budget tracking accounts.';
  $('journalEntry98')?.prepend(notice);
 }
 async function lookup(id){
  const {data,error}=await ojmDb.rpc('budget_utilization_journal',{p_report:id});
  if(error)throw Error('The utilization journal reference could not be checked. '+error.message);
  return data?.entry_no?data:null;
 }
 function localJob(id){return window.journalDurable14385?.pending().find(j=>j.id.startsWith('budget-use:'+id+':'));}
 function reference(link){return link?link.entry_no+(link.status==='posted'?'':' ('+link.status+')'):'';}
 function amounts(data){
  const comparison=BudgetReport290.compare(data,"cost");
  const requested=[...new Set(data.lines.map(l=>l.currency))],currency=requested[0];
  if(requested.length===1&&comparison.totals[currency]?.used!=null)
   return [[currency,Math.round(comparison.totals[currency].used*100)/100]].filter(([,n])=>n>0);
  return [...BudgetReport290.balances(data)].map(([c,t])=>[c,Math.round(t.spend*100)/100]).filter(([,n])=>n>0);
 }
 function open(record,groups=BudgetSupportEquity.groups(record.data),journals=[]){
  if(!access113.can('journal','post')||window.workspaceRequest138?.target)throw Error('Open your company journal with Post permission.');
  const d=record.data;
  const received=[...BudgetReport290.balances(d)].map(([currency,v])=>[currency,Math.round(v.receipt*100)/100]).filter(([,n])=>n>0);
  const support=groups.length?BudgetSupportEquity.plan(d,groups,journals):null;
  const pairs=support?.pairs||[
   ...received.map(([currency,amount])=>({label:'Funding received',currency,amount})),
   ...amounts(d).map(([currency,amount])=>({label:'Fund used',currency,amount}))
  ];
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
  $('jeGeneralMemo').value=['Budget utilization · '+period,d.purpose,support?'USD owner support':received.length?'Funding received · '+received.map(([c,n])=>c+' '+formatAppNumber(n)).join(' + '):'',receipts.join(' / ')].filter(Boolean).join(' · ');
  const body=$('jeLinesBody');body.replaceChildren();
  const rates={};
  for(const {label,currency,amount:n,debitCode,creditCode,roles,rate} of pairs){
   const amount=String(n),description=label+' · '+period+' · '+currency+' '+formatAppNumber(n);
   const fx=rate||BudgetReport290.reportRate(d,currency,'LAK');
   if(currency!=='LAK'&&fx)rates[currency]=fx;
   const names={asset:'Receiving account',remaining:'Support Remaining',used:'Support Used',original:'Support Received'};
   for(const [i,code] of [debitCode,creditCode].entries()){
    addJournalLineRow(code||'',roles?description+' · '+names[roles[i]]:description,i===0?amount:'',i===1?{[currency]:amount}:{});
    if(rate){
     body.lastElementChild.dataset.fxRate14383=rate;
     body.lastElementChild.dataset.bookRate14383=rate;
    }
   }
  }
  window.JournalFX14383?.restore(rates);calculateJournalBalance();
  restore({owner:liveProfile.id,id:record.id,version:record.version,period,pairs,notice:support?.notice});
  $('jeGeneralMemo').dispatchEvent(new Event('input',{bubbles:true}));window.drafts1427?.flush();
 }
 function postingKey(entries){
  const source=snapshot();if(!source)return null;
  if(entries.length!==1)throw Error('Post the utilization summary as one transaction.');
  const lines=entries[0].p_lines;
  // Existing saved drafts have only the spending pairs from the previous release.
  const expected=source.pairs||source.used.map(([currency,amount])=>({currency,amount}));
  const valid=lines.length===2*expected.length&&expected.every(({currency,amount},i)=>{
   const pair=lines.slice(2*i,2*i+2);
   if(expected[i].roles)return pair.every(l=>l.currency_code===currency)&&
    pair[0].debit===amount&&!pair[0].credit&&pair[1].credit===amount&&!pair[1].debit&&
    BudgetSupportEquity.validate(expected[i],pair);
   return pair.every(l=>l.currency_code===currency)&&pair[0].account_id!==pair[1].account_id&&
    pair.some(l=>l.debit===amount&&!l.credit)&&pair.some(l=>l.credit===amount&&!l.debit);
  });
  if(!valid&&source.pairs?.some(p=>p.roles))throw Error('Use the receiving USD asset or original receipt account and the regular USD Remaining and Used equity accounts in the prepared order.');
  if(!valid)throw Error('Keep each saved summary pair together and choose two different accounts in its currency.');
  return 'budget-use:'+source.id+':'+source.version;
 }
 return {open,amounts,lookup,localJob,reference,snapshot,restore,postingKey};
})();
/* Requests and received-fund finalization share the operational-report lifecycle. */
(()=>{'use strict';
function validDate14317(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value}
const esc=v=>escapeHtml(String(v??'')),clone=x=>structuredClone(x),num=x=>Number(x)||0;
let finalTab='submitted',historyTab='journal',allocation=null,allocationRecord=null,fundPopup=null,actor='',busy=false,editMove=null,editFx=null,actorClient=null,allocationRequest14370=0;
const report=BudgetReport290,journal=BudgetUtilizationJournal;
let activityPopup=null;
const equivalentViews=new WeakSet();
const confirmedFinals=new Map();
let checkedOnVisit=new Set();
function budgetRows(){return Work82.reports.filter(r=>r.data?.kind==='finance').map(r=>confirmedFinals.get(r.id)||r);}
const isFinal=r=>r?.data?.mode==='utilization'&&r.data.status==='finalized';
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
 const ids=rows.filter(r=>r.data.mode==='utilization'&&!isFinal(r)&&!visit.has(r.id)).map(r=>r.id);
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
const requests=()=>Work82.reports.filter(r=>r.data.kind==='finance'&&r.data.mode!=='utilization'&&!r.data.requestId14316);
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
  date:today,purpose:'',recipient:'',lines:[],movements:[],conversions:[],notes:''};
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
function renderRequest(notice=''){
 guard();
 const rows=budgetRows();
 checkListedDrafts(rows,notice);
 const requestRows=rows.filter(r=>r.data.mode!=='utilization').map(r=>[esc(report.period(r.data)),esc(r.data.recipient),esc(r.data.purpose),totals327(r.data,true),button('Open request',`editRequest(${JSON.stringify(r.id)})`)+button('Fund utilization',`startAllocation(${JSON.stringify(r.id)})`)]);
 const reports=rows.filter(r=>r.data.mode==='utilization').map(record=>({record,balances:report.balances({...record.data,lines:record.data.lines||[]})}));
 const units=report.orderedUnits(reports.flatMap(({balances})=>[...balances.keys()]));
 const headings=units.length?units.map(c=>'Cash remaining ('+c+')'):['Cash remaining'];
 const utilization=reports.map(({record:r,balances})=>{
  const remaining=units.length?units.map(c=>balances.has(c)?report.amountHtml(c,balances.get(c).beforeReturn):'—'):['—'];
  return [esc(report.period(r.data)),esc(r.data.purpose),esc(r.data.status||'Draft'),...remaining,
   button(isFinal(r)?'View report':'Continue',`openAllocation(${JSON.stringify(r.id)})`)];
 });
 const content=section82('Saved budget requests',table82(['Budget month','Recipient','Purpose','Requested',''],requestRows))+section82('Fund utilization reports',table82(['Budget month','Purpose','Status',...headings,''],utilization));
 mount82('transactions-budget14313','Budget Requests','',notice+content+historyImportButton(),button('Fund utilization','showFunds()')+button('New Report','newRequest()')+button('Print / PDF','printPicker()')+(access113.can('transactions-all')?'<button type="button" data-book-history="budget">History</button>':''));
}
function printPicker(){
 guard();const rows=Work82.reports.filter(r=>r.data.kind==='finance');
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
 return r.data;
}
async function saveDocument(model){
 if(busy)throw Error('A budget save is already in progress.');
 busy=true;try{return await persistDocument(model)}finally{busy=false}
}
async function persistDocument(model){
 const check=context(),parsed=parseDocument(model),meta=model.budget14316;
 guard();const id=meta.id||meta.draftId14317;
 if(!id)throw Error('Keep the budget device draft before saving.');
 const record=Work82.reports.find(row=>row.id===id);
 if(record&&(record.data.kind!=='finance'||record.data.mode!=='request'))throw Error('Open the original budget request.');
 const document={html:parsed.html,title:model.title,settings:clone(model.settings)};
 const payload={...parsed.data,document14316:document};
 let saved=record;
 if(!record||localFirst14333.canonical(record.data)!==localFirst14333.canonical(payload)){
  if(meta.id&&record&&meta.version!==record.version)throw Error('This request changed. Reopen its current saved version.');
  if(Work82.reports.some(row=>row.data.requestId14316===id))throw Error('This request has fund allocations. Start a new request for changes.');
  const base=meta.id?{id,version:meta.version}:null;
  saved=await localFirst14333.saveWork('reports',payload,base,{data:payload,version:base?base.version+1:1},{createId:id});
 }
 check();Work82.reportRecord=saved;Work82.report=clone(saved.data);Object.assign(Finance82,clone(saved.data));
 showCenterStatus(saved._pending14333?'Budget request saved on this device. It will sync automatically.':'Budget request saved to company records.');
 return {id:saved.id,version:saved.version,data:clone(parsed.data),_pending14333:!!saved._pending14333};
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
 const actions=button('Open reports','chooseRequest()')+button('Print / PDF','previewAllocation()')+
  (supplements(allocationRecord).length?button('Combine requests','combineRequests()'):'')+button('Save draft','saveAllocation(false)')+button('Finalize','saveAllocation(true)')+postControl(allocationRecord);
 const activities='<button type="button" data-add-spending>Add row</button><button type="button" data-activity="spend">Spending details</button>'+
  '<button type="button" data-activity="receipt">Amount received</button><button type="button" data-activity="coverage">Restaurant coverage</button><button type="button" data-activity="conversion">Currency conversion</button><button type="button" data-activity="other">Other fund movements</button>';
 const toolbar=reportToolbar(fundPopup,actions,activities);
 toolbar.querySelector('[onclick*="chooseRequest"]').title='Browse budget requests and saved utilization reports';
 toolbar.querySelector('[onclick*="saveAllocation(true)"]').title='Save as read-only in History';
 const save=toolbar.querySelector('[onclick*="saveAllocation(false)"]');
 save.title='Save an editable draft';save.classList.add('fund-save-draft');
 const table='<label><input type="checkbox" data-item-equivalents> Show item equivalents</label><div class="data-table82"><table class="spending-worksheet"><thead><tr><th>Item / category</th><th>Requested</th><th>Status</th><th>Funded</th><th>Actual spending</th><th aria-label="Actions"></th></tr></thead><tbody data-spending-rows></tbody></table></div>';
 const rowHeader=d.requestId14316?[report.period(d),d.recipient].filter(Boolean).map(esc).join(' · '):'';
 const header='<form id="fundHeader290" data-parent="'+esc(d.requestId14316||'')+'" data-record="'+esc(allocationRecord?.id||'')+'"><div class="fund-report-fields">'+
  field82('Report date','date',d.date,'date','required')+field82('Reference','receiptReference290',d.receiptReference290||'')+
  field82('Recipient','recipient',d.recipient,'text','required')+field82('Purpose','purpose',d.purpose,'text','required')+
  (d.requestId14316?'':field82('Budget month','budgetMonth290',d.budgetMonth290||String(d.date).slice(0,7),'month','required'))+
  '<label>Report notes<textarea name="notes" rows="3">'+esc(d.notes)+'</textarea></label></div></form>';
 host.innerHTML='<header class="worksheet-header"><h3>'+esc(d.purpose||'Unlinked utilization report')+'</h3><span>'+rowHeader+'</span></header>'+
  '<div data-journal-ref aria-live="polite"></div>'+section82('Budget and actual spending',table)+
  '<details class="worksheet-details" '+(d.requestId14316?'':'open')+'><summary>Report details</summary>'+header+'</details>'+
  '<details class="worksheet-details" data-summary><summary>Funding and spending summary <span data-budget-balance></span></summary><div></div></details>'+
  (!allocationRecord&&access113.can('journal','post')?'<small>Save a draft to open its summary in Post Transaction.</small>':'');
 showJournalReference(host,allocationRecord);
 host.querySelector('#fundHeader290').oninput=captureFund;
 function refreshWorksheet(){
  host.querySelector('[data-spending-rows]').replaceChildren();
  const toggle=host.querySelector('[data-item-equivalents]');
  toggle.checked=equivalentViews.has(d);
  toggle.oninput=()=>{if(toggle.checked)equivalentViews.add(d);else equivalentViews.delete(d);};
  host.applySpending=BudgetSpendingWorksheet.mount(fundPopup,d,editMovement);
  const body=host.querySelector('[data-spending-rows]');
  const fields=['select:not([data-spending-currency])','[name=receivedAmount]','[name=description]','[data-spending-currency]','[name=actualAmount]','[name=equivalentAmount]'];
  const values=()=>JSON.stringify([...body.rows].map(row=>fields.map(selector=>{
   const n=row.querySelector(selector);
   return n?(Number.isFinite(n.valueAsNumber)?n.valueAsNumber:n.value):null;
  })));
  const initial=values();
  host.worksheetChanged=()=>values()!==initial;
 }
 refreshWorksheet();
 toolbar.querySelectorAll('[data-activity]').forEach(b=>b.onclick=()=>openActivity(b.dataset.activity));
 const summary=host.querySelector('[data-summary]'),balance=summary.querySelector('[data-budget-balance]');
 function showBalance(){
  const cash=report.balances(d);
  balance.innerHTML=cash.size?'<span>Cash remaining</span><span>'+report.amountLines(cash.keys(),c=>cash.get(c).beforeReturn)+'</span>':'';
 }
 showBalance();
 host.oninput=e=>{if(!e.target.matches('[data-item-equivalents]')){summary.open=false;balance.textContent='';}};
 summary.ontoggle=()=>{if(summary.open){try{captureFund();host.applySpending();refreshWorksheet();showBalance();summary.lastElementChild.innerHTML=report.summary(d)}catch(err){summary.open=false;showCenterStatus(err.message,true)}}};
}
function applySpending(){
 guard();captureFund();
 fundPopup?.querySelector('#budgetFunds290')?.applySpending?.();
}
function closeActivity(){
 if(fundPopup)fundPopup.querySelector('.ui-dialog108').inert=false;
 if(activityPopup){activityPopup.resolve108(false);activityPopup=null;}
}
function openActivity(group,index=null){
 try{
  if(busy||!fundPopup?.isConnected)return;
  applySpending();closeActivity();renderAllocation();
  const d=allocation,cs=budget14313.currencyOptions(d.lines),loans=d.movements.filter(m=>report.kind(m)==='borrow');
  const isFx=group==='conversion',types=Object.entries(report.labels).filter(([k])=>group==='other'?!['receipt','spend','coverage'].includes(k):k===group);
  const type=isFx?'':index!==null?report.kind(d.movements[index]):types[0][0];
  const options=rows=>rows.map(([v,name])=>`<option value="${esc(v)}">${esc(name)}</option>`).join('');
  const amountInput=(label,name)=>field82(label,name,'','number','min="0.01" step="0.01" required');
  const actions=(kind,i)=>button('Edit',`edit${kind}(${i})`)+button('Delete',`remove${kind}(${i})`);
  const title={receipt:'Amount received',coverage:'Restaurant coverage',conversion:'Currency conversion',spend:'Spending details',other:'Other fund movements'}[group];
 const movement=`<form id="financeMove82" class="finance-controls117">${types.length>1?select82('Activity','type290',type,types):'<input type="hidden" name="type290" value="'+esc(type)+'">'}${field82('Date','date290',d.date,'date','required')}
  <label data-loan-field hidden>Advance to repay<select name="loanId290"><option value="">Choose an advance</option>${options(loans.map(l=>[l.id290,l.account+' · '+l.reference+' · '+report.currencyAmount(l.currency,report.outstanding(d,l))+' outstanding']))}</select>${loans.length?'':'<small>Record the original advance with its borrowing date first.</small>'}</label>
  <label><span data-source-label>Funding from</span><input name="account" required></label><label><span data-dest-label>Received into</span><input name="destination290"></label>
  <label data-item-field hidden>Budget item<select name="budgetKey117"><option value="">Unassigned</option>${options(d.lines.map((l,i)=>[l.key117||'worksheet:'+i,l.category+' · '+l.description+' · '+l.currency]))}</select></label>
  ${select82('Currency','currency',d.lines[0]?.currency||'LAK',cs)}${amountInput('Amount','amount')}
  <label data-cash-field hidden>Cash distributed<input placeholder="Same as expense amount" name="cashDistributed" type="number" min="0" step="0.01"></label>
  <label data-equivalent-field hidden><span></span><input name="equivalent" type="number" min="0.01" step="0.01"></label>
  ${field82('Description / use of money','description290','','text')}${field82('Reference','reference','','text','required')}<button type="submit">Add movement</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fx=`<form id="financeFx117" class="finance-controls117">${field82('Date','date',d.date,'date','required')}${field82('From account','source','','text','required')}${select82('From currency','currency','USD',cs)}${amountInput('Amount exchanged','amount')}
  ${field82('Received into','destination290','','text','required')}${select82('To currency','target','LAK',cs)}${amountInput('Amount received','targetAmount290')}${field82('Evidence / reference','evidence','','text','required')}<output aria-live="polite"></output><button type="submit">Add conversion</button><button type="button" data-cancel hidden>Cancel edit</button></form>`;
 const fxTable=table82(['Date','From account','Amount exchanged','Received into','Amount received','Rate','Reference','Action'],d.conversions.map((f,i)=>[esc(formatAppDate(f.date)),esc(f.source),report.amountHtml(f.currency,f.amount),esc(f.destination290||'—'),report.amountHtml(f.target,report.conversionAmount(f)),esc(formatAppRate(f.rate)),esc(f.evidence||f.reference),actions('Conversion',i)]));
 const movementRows=report.movementRows(d).flatMap((row,i)=>types.some(([k])=>k===report.kind(d.movements[i]))?[[...row,actions('Movement',i)]]:[]);
 const {root,pending}=budgetDialog(title,isFx?fx+fxTable:movement+table82([...report.movementHeaders,'Action'],movementRows));
 activityPopup=root;root.classList.add('fund-activity');fundPopup.querySelector('.ui-dialog108').inert=true;
 pending.then(()=>{if(activityPopup===root){activityPopup=null;if(fundPopup){fundPopup.querySelector('.ui-dialog108').inert=false;fundPopup.querySelector('[data-activity="'+group+'"]')?.focus()}}});
 const f=root.querySelector('form');
 if(isFx){
  editFx=index;const prior=d.conversions[index];
  if(prior)for(const [k,v] of Object.entries({...prior,targetAmount290:report.conversionAmount(prior),evidence:prior.evidence||prior.reference||''}))if(f.elements[k])f.elements[k].value=v;
  f.oninput=f.onchange=()=>{const a=movementAmount(f.elements.amount),b=movementAmount(f.elements.targetAmount290);f.querySelector('output').textContent=a>0&&b>0?'Rate: '+formatAppRate(b/a)+' '+f.elements.target.value+' / '+f.elements.currency.value:'';f.elements.targetAmount290.dataset.currency=f.elements.target.value;window.financialNumbers14231?.scan(f)};
  f.oninput();f.onsubmit=e=>{e.preventDefault();saveConversion(f)};
 }else{
  editMove=index;const prior=d.movements[index];
  if(prior)for(const [k,v] of Object.entries({...prior,type290:report.kind(prior),date290:prior.date290||d.date,amount:prior.inflow||prior.outflow,equivalent:prior.loanAmount290||prior.budgetAmount290||''}))if(f.elements[k])f.elements[k].value=v;
  if(prior?.worksheetLine!=null&&!prior.budgetKey117)f.elements.budgetKey117.value='worksheet:'+prior.worksheetLine;
  if(prior?.worksheetSpend){f.elements.account.required=false;f.elements.reference.required=false;}
  f.onchange=()=>movementFields(f);movementFields(f);
  f.onsubmit=e=>{e.preventDefault();saveMovement(f)};
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
 const labels={receipt:['Funding from','Received into'],coverage:['Covered by','Applied to'],borrow:['Lender / company fund','Received into'],repay:['Paid from','Repaid to'],spend:['Paid from','Paid to / destination'],refund:['Returned from','Returned to'],transfer:['Transferred from','Transferred to']};
 f.querySelector('[data-source-label]').textContent=labels[type][0];f.querySelector('[data-dest-label]').textContent=labels[type][1];
 f.elements.destination290.required=transfer;
 const target=repay?loan:spend?item:null,cross=target&&target.currency!==f.elements.currency.value;
 const field=f.querySelector('[data-equivalent-field]');field.hidden=!cross;f.elements.equivalent.required=!!cross&&repay;
 if(cross){field.querySelector('span').textContent=repay?'Debt settled in '+target.currency:'Budget equivalent in '+target.currency+' (optional)';}
}
function editMovement(i){
 const m=allocation?.movements[i];if(!m)return;
 const type=report.kind(m);openActivity(['receipt','spend','coverage'].includes(type)?type:'other',i);
}
function saveMovement(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),type=fields.type290,amount=movementAmount(f.elements.amount),incoming=['receipt','coverage','borrow'].includes(type);
  const prior=editMove===null?null:allocation.movements[editMove];
  const next={id290:prior?.id290||crypto.randomUUID(),type290:type,date290:fields.date290,account:fields.account.trim(),destination290:fields.destination290.trim(),reference:fields.reference.trim(),description290:fields.description290.trim(),currency:fields.currency,budgetKey117:type==='spend'?fields.budgetKey117:'',inflow:incoming?amount:0,outflow:incoming?0:amount};
  if(type==='spend'&&fields.cashDistributed!=='')next.cashDistributed=movementAmount(f.elements.cashDistributed);
  if(prior?.worksheetSpend&&type==='spend')next.worksheetSpend=true;
  if(type==='spend'&&next.budgetKey117.startsWith('worksheet:')&&!allocation.lines.some(l=>l.key117===next.budgetKey117)){
   next.worksheetLine=allocation.lines.findIndex((l,i)=>!l.key117&&'worksheet:'+i===next.budgetKey117);
   next.budgetKey117='';
  }
  if(type==='spend' && next.cashDistributed!=null && prior?.cashBudgetAmount!=null && prior.currency===next.currency &&
     prior.budgetKey117===next.budgetKey117 && prior.worksheetLine===next.worksheetLine && next.cashDistributed===prior.cashDistributed)next.cashBudgetAmount=prior.cashBudgetAmount;
  if(type==='repay'){next.loanId290=fields.loanId290;const loan=allocation.movements.find(m=>m.id290===next.loanId290);next.loanAmount290=loan?.currency===next.currency?amount:movementAmount(f.elements.equivalent);}
  if(type==='spend'&&!f.querySelector('[data-equivalent-field]').hidden&&fields.equivalent)next.budgetAmount290=movementAmount(f.elements.equivalent);
  const rows=[...allocation.movements];if(prior)rows[editMove]=next;else rows.push(next);
  validateAllocation({...allocation,movements:rows},false);allocation.movements=rows;closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
async function removeMovement(i){
 try{const check=context(),rows=allocation.movements,m=rows[i];if(!m)return;
  if(m.id290&&rows.some(r=>r.loanId290===m.id290))throw Error('Remove or reassign repayments before deleting their advance.');
  if(!await ui117.confirm('Delete this movement?'))return;check();if(rows!==allocation.movements||rows[i]!==m)return;captureFund();rows.splice(i,1);closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function editConversion(i){if(allocation?.conversions[i])openActivity('conversion',i);}
function saveConversion(f){
 try{guard();if(!activityPopup?.contains(f)||!f.reportValidity())return;captureFund();
  const fields=Object.fromEntries(new FormData(f)),amount=movementAmount(f.elements.amount),target=movementAmount(f.elements.targetAmount290);
  const next={...fields,amount,targetAmount290:target,rate:target/amount,source:fields.source.trim(),destination290:fields.destination290.trim(),evidence:fields.evidence.trim()};
  const rows=[...allocation.conversions];if(editFx===null)rows.push(next);else rows[editFx]=next;
  validateAllocation({...allocation,conversions:rows},false);allocation.conversions=rows;closeActivity();renderAllocation();
 }catch(e){showCenterStatus(e.message,true)}
}
function postControl(record){
 return record&&access113.can('journal','post')?'<button type="button" data-prepare-budget>Open in Post Transaction</button>':'';
}
function editorData(d){
 return JSON.stringify([d.date,d.budgetMonth290,d.receiptReference290||'',d.recipient||'',d.purpose||'',d.notes||'',d.movements||[],d.conversions||[],d.lines.map((l,i)=>report.lineFunding(d,l,i))]);
}
function showJournalReference(host,record){
 const field=host.querySelector('[data-journal-ref]'),post=field.closest('[role=dialog]').querySelector('[data-prepare-budget]');
 if(!record)return;
 if(post)post.onclick=()=>prepareSummary(record,host,post);
 const check=context();
 journal.lookup(record.id).then(link=>{
  check();if(!field.isConnected)return;
  const label=journal.reference(link);
  if(label){field.textContent='Utilization journal · '+label+' · report version '+link.report_version;if(post)post.hidden=true;}
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
  if(link)throw Error('This report is already linked to journal '+journal.reference(link)+'.');
  if(journal.localJob(record.id))throw Error('The utilization posting is waiting for confirmation. Open Data Check to review it.');
  const groups=BudgetSupportEquity.groups(current.data);
  const evidence=await BudgetSupportEquity.evidence(groups);
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
 const content=document.createElement('div');content.innerHTML=report.report(d,reference);content.querySelector('h1')?.remove();
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
 const reports=saved.map(r=>[esc(report.period(r.data)),esc(r.data.purpose),esc(r.data.status||'Draft'),button(r.data.status==='finalized'?'View':'Continue',`openAllocation(${JSON.stringify(r.id)})`)]);
 const {root}=budgetDialog('Requests and saved reports',

  section82('Budget requests',table82(['Month','Purpose','Action'],entries))+
  section82('Utilization reports',table82(['Month','Purpose','Status','Action'],reports))+
  (offerNewRequest?button('New Report','newRequest()'):button('New unlinked utilization report','newUnlinked()'))+historyImportButton());
 root.querySelector('.ui-body108').addEventListener('click',e=>{if(e.target.closest('button[onclick^="budgetWorkflow14316."]'))root.resolve108(false)},true);
}
async function newUnlinked(){
 const check=context();if(busy||!await canLeaveFund())return;
 check();selectedParent='';allocationRequest14370++;allocationRecord=null;allocation=newUtilization();presentFundEditor();
}
async function removeConversion(i){try{const check=context();captureFund();const rows=allocation.conversions,item=rows[i];if(!item)return;if(await ui117.confirm('Delete this conversion?')){check();if(allocation.conversions!==rows)return;const index=rows.indexOf(item);if(index<0)return;rows.splice(index,1);closeActivity();renderAllocation()}}catch(e){showCenterStatus(e.message,true)}}
function validateAllocation(d,finalize){
 if(!validDate14317(d.date))throw Error('Enter a valid report date.');
 const currencies=new Set(CurrencyStore.currencies.map(c=>c.code));
 const positive=n=>Number.isFinite(Number(n))&&Number(n)>0&&Number.isSafeInteger(Math.round(Number(n)*100));
 if(!d.movements.length&&!d.conversions.length&&!(d.lines.length&&d.fundingByItem))throw Error('Record a funding decision, receipt, movement or conversion first.');
 const loans=new Map(d.movements.filter(m=>report.kind(m)==='borrow').map(m=>[m.id290,m]));
 for(const m of d.movements){
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
 if(totals.some(t=>Object.values(t).some(n=>!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n*100)))))throw Error('Funding totals exceed the supported amount range.');
 if(finalize&&totals.some(t=>t.remaining<0))throw Error('Review the receipts and conversions before finalizing a negative cash balance.');
}
async function ensureLifecycle(){const check=context(),r=await ojmDb.rpc('budget_capabilities14316');if(r.error||r.data?.version!==14316)throw Error('Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql in Supabase before saving fund allocations. Your draft is kept.');check()}
async function saveAllocation(finalize){const check=context(),record=allocationRecord,selection=allocationRequest14370,controls=[];if(busy)return;busy=true;try{if(confirmedFinals.has(record?.id))throw Error('This utilization report has already been finalized. Open View report to review it.');if(!record?.data.requestId14316&&allocation?.requestId14316){
 const saved=await linkedUtilization(allocation.requestId14316);check();if(selection!==allocationRequest14370)return;
 if(saved){rememberFinal(saved);if(document.querySelector('#transactions-budget14313.active'))renderRequest();
  throw Error(isFinal(saved)?'This request already has a finalized utilization report. Open View report to review it.':'This request already has a saved utilization draft. Open it with Continue.');}
 }if(!headerValid())return;applySpending();const d=clone(allocation);validateAllocation(d,finalize);for(const node of fundPopup?.querySelectorAll('input,select,textarea,button:not([data-dismiss])')||[]){controls.push([node,node.disabled]);node.disabled=true}if(finalize&&!await ui117.confirm('Finalize the received funding and allocations? This saved version becomes read-only in History.'))return;check();if(finalize){await ensureLifecycle();check();if(d.requestId14316)await live(d.requestId14316,d.requestVersion14316);check();if(record)await live(record.id,record.version);check();}if(selection!==allocationRequest14370)return;delete d.document14316;d.kind='finance';d.mode='utilization';d.status=finalize?'finalized':'draft';d.preparedBy=liveProfile.full_name||liveProfile.email;d.preparedRole290=liveProfile.job_title||livePermission?.job_title||'Prepared by';d.finalizedAt14316=finalize?new Date().toISOString():null;const r=await saveWork82('reports',d,record);check();if(finalize&&r._pending14333)throw Error('Finalization is waiting for database confirmation. Review the saved request in Data Check.');if(selection!==allocationRequest14370)return;Work82.reports=[r,...Work82.reports.filter(old=>old.id!==r.id)];allocationRecord=r;allocation=clone(r.data);if(finalize){allocation=null;allocationRecord=null;clearFundPopup()}else{renderAllocation();}if(document.querySelector('#transactions-budget14313.active'))renderRequest();showCenterStatus(r._pending14333?'Fund allocation: Saved on this device; waiting for automatic sync.':finalize?'Fund allocation finalized.':'Fund allocation saved.')}catch(e){showCenterStatus(e.message,true)}finally{for(const [node,disabled]of controls)node.disabled=disabled;busy=false}}
function budgetDialog(title,html,save=false){const pending=ui108.modal(title,html,save?[{label:'Cancel',value:false},{label:'Save',value:true,primary:true}]:[{label:'Close',value:false}]);const root=document.querySelector('.ui-overlay108:last-child');root.querySelector('.ui-dialog108').classList.add('budget-dialog14313');return {pending,root}}
function renderFinalization(){if(liveProfile?.role!=='admin')return;if(finalTab==='funds')finalTab='submitted';const panel=document.getElementById('user-entry-review');if(!panel)return;let bar=panel.querySelector('#finalizationSwitch14316');if(!bar){bar=document.createElement('div');bar.id='finalizationSwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Submitted Entries',"finalization('submitted')")+button('Reconciliation',"finalization('reconciliation')");panel.prepend(bar)}let fund=panel.querySelector('#fundAllocation14316');if(!fund){fund=document.createElement('section');fund.id='fundAllocation14316';panel.append(fund)}window.workspace14337?.mountReconciliation(panel);for(const child of panel.children)if(!child.matches('#finalizationSwitch14316,#fundAllocation14316,#reconciliationWork14337,.area-banner113,.module-header,#categoryTabShell'))child.hidden=finalTab!=='submitted';const rec=panel.querySelector('#reconciliationWork14337');if(rec)rec.hidden=finalTab!=='reconciliation';fund.hidden=finalTab!=='funds';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['submitted','reconciliation'][i]===finalTab)));panel.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove());if(bar.children[1])bar.children[1].hidden=!access113.can('report-reconciliation');if(finalTab==='funds')fund.innerHTML=button('Open budget utilization','showFunds()');if(finalTab==='reconciliation')void renderReconciliationList71()}
function finalization(tab){if(tab==='reconciliation'&&!access113.can('report-reconciliation'))return showCenterStatus('Reconciliation access is required.',true);if(tab==='funds'&&(liveProfile?.role!=='admin'||!access113.can('transactions-budget14313')))return showCenterStatus('Budget Request access is required for Fund Allocation.',true);if(tab==='funds')tab='submitted';finalTab=tab;window.workspace14337?.closeReconciliationHistory();renderFinalization()}
function renderHistory(){const budgetAllowed=liveProfile?.role==='admin'&&!!access113.can('transactions-budget14313')&&Work82.owner===liveProfile.id;const submissionAllowed=!!access113.can('user-entry-review');if(historyTab==='budget'&&!(liveProfile?.role==='admin'&&access113.can('transactions-budget14313'))||historyTab==='submitted'&&!submissionAllowed)historyTab='journal';const panel=document.getElementById('transactions-all');if(!panel)return;let bar=panel.querySelector('#historySwitch14316');if(!bar){const journal=document.createElement('div');journal.id='journalHistory14316';for(const child of [...panel.children])if(!child.matches('.area-banner113,.module-header,#categoryTabShell'))journal.append(child);panel.append(journal);bar=document.createElement('div');bar.id='historySwitch14316';bar.className='workflow-switch14316';bar.innerHTML=button('Journal',"history('journal')")+button('Submitted Entries',"history('submitted')")+button('Budget Requests',"history('budget')");journal.before(bar);const budget=document.createElement('section');budget.id='budgetHistory14316';panel.append(budget)}bar.querySelectorAll('button').forEach((b,i)=>b.hidden=i===1&&!submissionAllowed||i===2&&!budgetAllowed);const submission=document.getElementById('userEntryHistoryPanel');if(submission&&submission.parentElement!==panel){panel.append(submission);submission.querySelectorAll('[onclick*=toggleSubmissionHistory]').forEach(b=>b.remove())}document.getElementById('journalHistory14316').hidden=historyTab!=='journal';if(submission)submission.hidden=historyTab!=='submitted';const budget=document.getElementById('budgetHistory14316');budget.hidden=historyTab!=='budget';bar.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(['journal','submitted','budget'][i]===historyTab)));const historyRecords=budgetAllowed?budgetRows():[];const month=historyMonth14341.choose('budget',historyRecords.map(r=>String(r.data.date).slice(0,7)));if(historyTab!=='budget')return;budget.innerHTML=historyMonth14341.control('budget',month)+historyMonth14341.summary([['Budget Records',historyRecords.filter(r=>String(r.data.date).startsWith(month)).length]])+section82('Budget Request History',table82(['Date','Purpose','Record','Status','Action'],historyRecords.filter(r=>String(r.data.date).startsWith(month)).map(r=>[esc(formatAppDate(r.data.date)),esc(r.data.purpose),r.data.mode==='utilization'?'Fund allocation':'Budget request',esc(r.data.status||'Saved'),button('View',`view(${JSON.stringify(r.id)})`)+(r.data.mode!=='utilization'?button('Editor',`openRequest(${JSON.stringify(r.id)})`):r.data.status!=='finalized'?button('Continue',`openAllocation(${JSON.stringify(r.id)})`):'')+button('Delete',`remove(${JSON.stringify(r.id)})`)])));historyMonth14341.bind(budget,'budget',renderHistory,true)}
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
 showReport(record);
}
async function view(id){
 try{const r=await editableRecord(id);if(isFinal(r))showFinal(r);else showReport(r);}catch(e){showCenterStatus(e.message,true)}
}
function cacheWording(record){
 const index=Work82.reports.findIndex(r=>r.id===record.id);
 if(index>=0)Work82.reports[index]=record;
 rememberFinal(record);
}
function showReport(r){
  const d=BudgetReportWording.data(r),utilization=d.mode==='utilization',id=r.id;
  const html=documentWorkspace105.sanitize(utilization?report.report(d):d.document14316?.html||financeHtml82(d));
  const {root}=budgetDialog(utilization?report.title:'Budget request',html+'<div data-journal-ref></div>');
  root.classList.add('fund-popup326','budget-report-preview');
  const canEditWording=isFinal(r)||(!utilization&&(r.budget_report_wording||budgetRows().some(x=>x.data.requestId14316===id)));
  reportToolbar(root,(canEditWording?'<button type="button" data-edit-wording>Edit report wording</button>':'')+(isFinal(r)?'<strong data-final-status>Finalized</strong>':'')+'<button type="button" data-print-record>Print / PDF</button>'+(utilization?postControl(r):''));
  root.querySelectorAll('[contenteditable]').forEach(n=>n.removeAttribute('contenteditable'));
  const wording=root.querySelector('[data-edit-wording]');
  if(wording)wording.onclick=()=>BudgetReportWording.edit(r,budgetDialog,context(),saved=>{
   cacheWording(saved);if(root.isConnected){root.resolve108(true);showReport(saved);}
  });
  root.querySelector('[data-print-record]').onclick=()=>printRecord(id,root);
  if(utilization)showJournalReference(root,r);
}

async function printRecord(id,dialog){
 try{
  const r=await live(id);
  const d=BudgetReportWording.data(r);
  if(d.mode==='utilization')return await printUtilization(d,r,dialog);
  return await print82('Budget Request',documentWorkspace105.sanitize(d.document14316?.html||financeHtml82(d)),d.date);
 }catch(e){showCenterStatus(e.message,true)}
}
async function remove(id){try{const check=context(),client=ojmDb;const r=await live(id);const children=Work82.reports.filter(x=>x.data.requestId14316===id);if(!await ui117.confirm('Delete this '+(r.data.mode==='utilization'?'allocation':'request and all linked allocations')+'? The saved document and shared link will also be removed.'))return;check();const out=await client.rpc('delete_budget14316',{p_id:id,p_version:r.version});check();if(out.error)throw Error(out.error.code==='PGRST202'?'Install INSTALL-BUDGET-LIFECYCLE-v143.16.sql before deleting a linked budget record.':out.error.message);const removed=new Set(out.data?.deletedIds||[id,...children.map(x=>x.id)]);Work82.reports=Work82.reports.filter(x=>!removed.has(x.id));if(removed.has(allocationRecord?.id)||removed.has(allocation?.requestId14316)){allocation=null;allocationRecord=null}if(removed.has(Work82.reportRecord?.id)){Work82.reportRecord=null;Work82.report=null}renderHistory();showCenterStatus('Budget transaction deleted.')}catch(e){showCenterStatus(e.message,true)}}
const switchBefore=window.switchTab;window.switchTab=function(id,...args){if(id==='transactions-budget14313')checkedOnVisit=new Set();captureFund();return switchBefore.call(this,id,...args)};
const renderBefore=window.renderWork82;window.renderWork82=function(...args){const out=renderBefore.apply(this,args);if(document.querySelector('#user-entry-review.active'))renderFinalization();if(document.querySelector('#transactions-all.active'))renderHistory();return out};
const deleteBefore=window.deleteWork108;window.deleteWork108=function(kind,id){return kind==='reports'&&Work82.reports.find(r=>r.id===id)?.data.kind==='finance'?remove(id):deleteBefore(kind,id)};
const openBefore=window.openOperational82;window.openOperational82=function(id){const r=Work82.reports.find(r=>r.id===id);return r?.data.kind==='finance'?(r.data.mode==='utilization'?openAllocation(id):openRequest(id)):openBefore(id)};
window.budgetWorkflow14316={get finalTab(){return finalTab},get historyTab(){return historyTab},prepareHistory:renderHistory,prepareFinalization:renderFinalization,renderRequest,newRequest,editRequest,requestData,refreshCategories,templateApplied,printPicker,requestHTML,showFunds,combineRequests,saveDocument,requireSaved,decorateEditor,openRequest,startAllocation,openAllocation,chooseRequest,linkRequest,importHistory,saveAllocation,previewAllocation,newUnlinked,removeMovement,removeConversion,finalization,history,view,printRecord,remove,parseDocument,recalculate,validDate14317,editMovement,editConversion};
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
