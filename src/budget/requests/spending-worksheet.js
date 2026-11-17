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
   const currencyChoice = !movement && currencies.length>1 ? '<select data-plain14285 data-spending-currency aria-label="Spending currency">'+currencies.map(([c]) =>
    '<option value="'+esc(c)+'"'+(c===currency?' selected':'')+'>'+esc(currencySymbolV6(c))+'</option>').join('')+'</select>' : '';
   const unit=currencyChoice||'<span class="worksheet-unit">'+esc(currencySymbolV6(currency))+'</span>';
   const native='<div class="worksheet-amount" data-native>'+unit+'<input type="number" step="0.01" min="0" name="actualAmount" data-currency="'+esc(currency)+'" aria-label="Actual spending'+(item?' for '+esc(item):'')+'" value="'+esc(movement?report.cashPaid(movement):'')+'" placeholder="0.00"></div>';
   const equivalent=linked?'<span class="worksheet-unit">'+esc(currencySymbolV6(line.currency))+'</span><input type="number" step="0.01" min="0.01" name="equivalentAmount" data-currency="'+esc(line.currency)+'" aria-label="Spending equivalent in '+esc(line.currency)+' for '+esc(item)+'" title="Enter the recorded equivalent, or leave blank to use the report exchange rate." value="'+esc(movement?.[report.equivalentField(movement)]??'')+'">':'';
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
    const raw = amount.value, value = movement && !state.amountEdited ? report.cashPaid(movement) : amount.valueAsNumber;
    if (!movement && !detail && !state.equivalent?.value && !amount.validity.badInput && (!raw || value === 0)) continue;
    if (!Number.isFinite(value) || value < 0 || (value===0 && (!raw || movement?.cashDistributed==null)) || !Number.isSafeInteger(Math.round(value*100)) || (state.amountEdited && Math.abs(value*100-Math.round(value*100))>0.00001)) {
     invalid(amount, movement ? 'Enter a positive spending amount. Use Details to remove the expense.' : 'Enter a positive spending amount with up to two decimal places.');
    }
    if (!line && !detail && (!movement || movement.worksheetSpend)) invalid(description,'Enter a description for the additional spending.');
    const explicit=state.equivalentEdited && line && line.currency!==(choice?.value||currency);
    const equivalent=explicit && state.equivalent.value!==''?state.equivalent.valueAsNumber:null;
    if(explicit && equivalent!==null && (!Number.isFinite(equivalent)||equivalent<=0||!Number.isSafeInteger(Math.round(equivalent*100))||Math.abs(equivalent*100-Math.round(equivalent*100))>0.00001))
     invalid(state.equivalent,'Enter a positive spending equivalent with up to two decimal places, or leave it blank to use the report exchange rate.');
    if (!explicit && movement && report.cashPaid(movement) === value && (!description || detail === (movement.description290 || ''))) continue;
    const next = movement ? {...movement} : {id290:crypto.randomUUID(),type290:'spend',worksheetSpend:true,date290:draft.date,
     account:'',reference:'',currency:choice?.value || currency,budgetKey117:line?.key117 || '',inflow:0};
    if (!movement && line && !line.key117) next.worksheetLine = draft.lines.indexOf(line);
    if(explicit){
     const field=report.equivalentField(movement);
     if(equivalent===null)delete next[field];
     else next[field]=equivalent;
    }
    if(movement?.cashDistributed!=null)next.cashDistributed=value;
    else next.outflow=value;
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
