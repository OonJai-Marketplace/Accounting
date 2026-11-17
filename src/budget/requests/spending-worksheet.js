/* The request snapshot stays intact. Each worksheet amount belongs to one expense. */
window.BudgetSpendingWorksheet = (() => {
 const esc = value => escapeHtml(String(value ?? ''));
 function mount(host, draft, edit) {
  const body = host.querySelector('[data-spending-rows]');
  const currencies = budget14313.currencyOptions(draft.lines);
  const rows = [];
  const decisions = [];
  const base=BudgetReport290.requestCurrency(draft);
  const table=body.closest('table');
  const fundingInputs=new Map();
  function moneyText(currency,value,headingCurrency) {
   const text=BudgetReport290.amountText(value);
   return currency===headingCurrency?text:currency+' '+text;
  }
  const headings=table.tHead.rows[0].cells;
  if(base){
   headings[1].textContent='Requested ('+base+')';
   headings[4].textContent='Funded ('+base+')';
  }
  function refreshValuations() {
   const active=[];
   for(const state of rows){
    const paid=state.choice?.value||state.currency,requested=state.line?.currency||base;
    for(const cell of [state.requestEquivalent,state.fundedEquivalent,state.spendEquivalent])cell.textContent='';
    if(requested && paid!==requested && state.amount.valueAsNumber>0)active.push({state,paid,requested});
   }
   const paidUnits=new Set(active.filter(r=>r.state.line).map(r=>r.paid));
   const requestUnits=new Set(active.map(r=>r.requested));
   const paidUnit=paidUnits.size===1?[...paidUnits][0]:null;
   const requestUnit=requestUnits.size===1?[...requestUnits][0]:null;
   headings[2].textContent=paidUnit?'In '+paidUnit:'Request equiv.';
   headings[5].textContent=paidUnit?'In '+paidUnit:'Funded equiv.';
   headings[7].textContent=requestUnit?'In '+requestUnit:'Spend equiv.';
   const seen=new Map();
   let adjusted=false;
   for(const {state,paid,requested} of active){
    const {line,amount,movement}=state;
    const n=amount.valueAsNumber,original=n===Number(movement?.outflow)?movement:null;
    state.spendEquivalent.textContent=moneyText(requested,BudgetReport290.valueIn(draft,n,paid,requested,line,original),requestUnit);
    if(!line)continue;
    if(!seen.has(line))seen.set(line,new Set());
    if(seen.get(line).has(paid))continue;
    seen.get(line).add(paid);
    state.requestEquivalent.textContent=moneyText(paid,BudgetReport290.valueIn(draft,line.amount,requested,paid),paidUnit);
    const {select,received}=fundingInputs.get(line);
    if(select.value!=='approved')adjusted=true;
    const funded=select.value==='approved'?Number(line.amount):select.value==='declined'?0:received.valueAsNumber;
    if(Number.isFinite(funded))state.fundedEquivalent.textContent=moneyText(paid,BudgetReport290.valueIn(draft,funded,requested,paid),paidUnit);
   }
   table.toggleAttribute('data-show-fx',active.length>0);
   table.toggleAttribute('data-request-fx',paidUnits.size>0);
   table.toggleAttribute('data-funded-fx',adjusted);
  }
  function fundingCells(row,line,index) {
   const {status,amount} = BudgetReport290.lineFunding(draft,line,index);
   const name = esc(line.description);
   const statusCell = row.insertCell(), fundedCell = row.insertCell();
   statusCell.innerHTML = '<select data-plain14285 aria-label="Funding status for '+name+'">'+
    Object.entries(BudgetReport290.fundingLabels).map(([value,label]) =>
     '<option value="'+value+'">'+label+'</option>').join('')+'</select>';
   fundedCell.innerHTML = '<span data-funded-value></span><div data-deduction><input type="number" name="receivedAmount" step="0.01" min="0" data-currency="'+esc(line.currency)+'" aria-label="Amount received for '+name+'" placeholder="Received"></div>';
   const select = statusCell.querySelector('select'), deduction = fundedCell.querySelector('[data-deduction]');
   const received = deduction.querySelector('input'), display = fundedCell.querySelector('[data-funded-value]');
   select.value = status;
   if (status === 'deduction') received.value = amount;
   function update() {
    const partial = select.value === 'deduction';
    deduction.hidden = !partial; display.hidden = partial;
    if (!partial) display.textContent = moneyText(line.currency,select.value === 'declined' ? 0 : line.amount,base);
   }
   select.onchange = () => {update();refreshValuations();};
   received.addEventListener('input',refreshValuations);
   fundingInputs.set(line,{select,received});
   update();
   decisions.push({line,index,select,received});
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
   cell(linked && first ? esc(moneyText(line.currency,line.amount,base)) : '');
   const requestEquivalent=row.insertCell();requestEquivalent.setAttribute('data-request-equiv','');
   if (linked && first) fundingCells(row,line,index);
   else { row.insertCell(); row.insertCell(); }
   const fundedEquivalent=row.insertCell();fundedEquivalent.setAttribute('data-funded-equiv','');
   const currencyChoice = !linked && !movement ? '<select data-plain14285 data-spending-currency aria-label="Spending currency">'+currencies.map(([c]) =>
    '<option'+(c===currency?' selected':'')+'>'+esc(c)+'</option>').join('')+'</select>' : '';
   const cross = linked && currency !== line.currency;
   const unit=currencyChoice||'<span class="worksheet-unit">'+esc(currency)+'</span>';
   cell((cross?'<span class="worksheet-paid">'+esc(moneyText(currency,movement.outflow))+'</span>':'')+'<div class="worksheet-amount"'+(cross?' hidden':'')+'>'+unit+'<input type="number" step="0.01" min="0" name="actualAmount" data-currency="'+esc(currency)+'" aria-label="Actual spending'+(item?' for '+esc(item):'')+'" value="'+esc(movement?.outflow??'')+'" placeholder="0.00"'+(cross?' readonly':'')+'></div>');
   const spendEquivalent=row.insertCell();spendEquivalent.setAttribute('data-spend-equiv','');
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
   if (choice) choice.onchange = () => { amount.dataset.currency = choice.value; window.financialNumbers14231?.scan(row);refreshValuations(); };
   const state = {line, movement, row, amount, choice, currency,requestEquivalent,fundedEquivalent,spendEquivalent, amountEdited:false, detailEdited:false};
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
   const row = append(null,null); row.querySelector('[name=description]').focus();
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
    if (movement && !state.amountEdited && !state.detailEdited) continue;
    const description = row.querySelector('[name=description]');
    const detail = description?.value.trim() || '';
    const raw = amount.value, value = movement && !state.amountEdited ? Number(movement.outflow) : amount.valueAsNumber;
    if (!movement && !detail && !amount.validity.badInput && (!raw || value === 0)) continue;
    if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value*100)) || (state.amountEdited && Math.abs(value*100-Math.round(value*100))>0.00001)) {
     invalid(amount, movement ? 'Enter a positive spending amount. Use Details to remove the expense.' : 'Enter a positive spending amount with up to two decimal places.');
    }
    if (!line && !detail && (!movement || movement.worksheetSpend)) invalid(description,'Enter a description for the additional spending.');
    if (movement && Number(movement.outflow) === value && (!description || detail === (movement.description290 || ''))) continue;
    const next = movement ? {...movement} : {id290:crypto.randomUUID(),type290:'spend',worksheetSpend:true,date290:draft.date,
     account:'',reference:'',currency:choice?.value || currency,budgetKey117:line?.key117 || '',inflow:0};
    if (!movement && line && !line.key117) next.worksheetLine = draft.lines.indexOf(line);
    next.outflow = value;
    if (description) next.description290 = detail;
    changes.push({state,next});
   }
   if (decisions.length) draft.fundingByItem = funding;
   for (const {state,next} of changes) {
    if (state.movement) draft.movements[draft.movements.indexOf(state.movement)] = next;
    else draft.movements.push(next);
    state.movement = next; state.amountEdited=false; state.detailEdited=false;
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
