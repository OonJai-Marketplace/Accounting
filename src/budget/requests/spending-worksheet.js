/* The request snapshot stays intact. Each worksheet amount belongs to one expense. */
window.BudgetSpendingWorksheet = (() => {
 const esc = value => escapeHtml(String(value ?? ''));
 function mount(host, draft, edit) {
  const body = host.querySelector('[data-spending-rows]');
  const currencies = budget14313.currencyOptions(draft.lines);
  const rows = [];
  function append(line, movement, first = true) {
   const row = body.insertRow();
   const currency = movement?.currency || line?.currency || currencies[0]?.[0];
   const linked = !!line;
   const cell = html => { row.insertCell().innerHTML = html; };
   const item = line?.description || movement?.description290 || '';
   cell(linked ? esc(first ? line.category : '') : 'Additional');
   cell(linked ? esc(item) + (movement?.description290 ? '<small>' + esc(movement.description290) + '</small>' : '') :
    '<input name="description" aria-label="Additional spending detail" placeholder="Spending detail" value="' + esc(item) + '">');
   cell(linked && first ? esc(line.currency + ' ' + formatAppNumber(line.amount)) : '—');
   cell(linked || movement ? esc(currency) : '<select data-plain14285 aria-label="Spending currency">' + currencies.map(([c]) => '<option' + (c === currency ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select>');
   const cross = linked && currency !== line.currency;
   cell('<input type="number" step="0.01" min="0" name="actualAmount" data-currency="' + esc(currency) + '" aria-label="Actual spending' + (item ? ' for ' + esc(item) : '') + '" value="' + esc(movement?.outflow ?? '') + '" placeholder="0.00"' + (cross ? ' readonly' : '') + '>');
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
     rows.splice(rows.indexOf(state), 1); row.remove();
    };
    action.append(remove);
   }
   const amount = row.querySelector('[name=actualAmount]'), choice = row.querySelector('select');
   if (choice) choice.onchange = () => { amount.dataset.currency = choice.value; window.financialNumbers14231?.scan(row); };
   const state = {line, movement, row, amount, choice, currency, amountEdited:false, detailEdited:false};
   amount.addEventListener('input', () => { state.amountEdited=true; });
   row.querySelector('[name=description]')?.addEventListener('input', () => { state.detailEdited=true; });
   rows.push(state);
   return row;
  }
  const spent = draft.movements.filter(m => BudgetReport290.kind(m) === 'spend');
  for (const [index,line] of draft.lines.entries()) {
   const matches = spent.filter(m => BudgetReport290.forLine(m, line, index));
   if (matches.length) matches.forEach((m,i) => append(line,m,i===0));
   else append(line,null);
  }
  for (const m of spent.filter(m => !draft.lines.some((line,i) => BudgetReport290.forLine(m,line,i)))) append(null,m);
  host.querySelector('[data-add-spending]').onclick = () => {
   const row = append(null,null); row.querySelector('[name=description]').focus();
  };
  function invalid(input,message) {
   input.focus(); throw Error(message);
  }
  return function apply() {
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
   for (const {state,next} of changes) {
    if (state.movement) draft.movements[draft.movements.indexOf(state.movement)] = next;
    else draft.movements.push(next);
    state.movement = next; state.amountEdited=false; state.detailEdited=false;
    if (state.choice) state.choice.disabled = true;
    const action = state.row.cells[5];
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
