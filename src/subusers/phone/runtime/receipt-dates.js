  // A receipt owns its lines. Dates can repeat, and changing a date never merges cards.
  function receiptCards(draft) {
    if (draft.mode === 'single') return draft.single.map((row, index) => [index]);
    // Unmarked drafts predate receipt cards. Recognize an explicit shared fund line
    // before assigning those drafts separate receipt IDs by day.
    if (draft.lines.every(line => line.receipt == null) && sharedReceiptPayment(draft, draft.lines)) {
      return [draft.lines.map((_, index) => index)];
    }
    const groups = new Map();
    draft.lines.forEach((line, index) => {
      // Drafts from the previous editor balanced double-entry lines by day.
      const key = line.receipt ?? (draft.multiple ? 'day-' + (line.date ?? draft.date) : 'first');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(index);
    });
    return [...groups.values()];
  }
  function identifyReceipts(draft) {
    const cards = receiptCards(draft);
    if (draft.mode === 'double') for (const indices of cards) {
      const id = draft.lines[indices[0]].receipt || crypto.randomUUID();
      for (const i of indices) draft.lines[i].receipt = id;
    }
    return cards;
  }
  function cardDate(draft, row) { return draft.multiple ? row.date ?? draft.date : draft.date; }
  function dateLabel(value) {
    if (!value) return 'Choose date';
    return typeof window.formatAppDate === 'function' ? window.formatAppDate(value) :
      new Date(value + 'T12:00:00Z').toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  }
  function chooseReceiptDate(initialDate, multiple) {
    let value=initialDate||today();
    const month=new Date(value.slice(0,7)+'-01T12:00:00Z');
    return phoneDialog14370(() => {
      const body=$('dialogBody');
      body.innerHTML='<div class="receipt-picker-heading"><h2>Choose date</h2><label><input type="checkbox" data-multiple-dates> Multiple dates</label></div><div class="receipt-calendar"><header><button type="button" aria-label="Previous month">‹</button><strong aria-live="polite"></strong><button type="button" aria-label="Next month">›</button></header><div class="receipt-days"></div></div>';
      $('dialogButtons').innerHTML='<button class="btn" value="cancel">Cancel</button>';
      const checkbox=body.querySelector('[data-multiple-dates]');
      checkbox.checked=multiple;
      checkbox.onchange=()=>{multiple=checkbox.checked;$('dialog').close('yes');};
      const calendar=body.querySelector('.receipt-calendar'),grid=calendar.querySelector('.receipt-days');
      function draw() {
        calendar.querySelector('strong').textContent=month.toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'});
        const end = new Date(month); end.setUTCMonth(end.getUTCMonth()+1,0);
        grid.innerHTML = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(day=>'<small>'+day+'</small>').join('')+'<span></span>'.repeat(month.getUTCDay());
        for(let day=1;day<=end.getUTCDate();day++){
          const date=month.toISOString().slice(0,7)+'-'+String(day).padStart(2,'0'), b=document.createElement('button');
          b.type='button'; b.textContent=day; b.dataset.receiptDate=date;
          b.setAttribute('aria-label',dateLabel(date)); b.setAttribute('aria-pressed',String(date===value)); grid.append(b);
        }
      }
      const [prev,next]=calendar.querySelectorAll('header button');
      prev.onclick=()=>{if(month.getUTCFullYear()>1||month.getUTCMonth()>0){month.setUTCMonth(month.getUTCMonth()-1);draw();}};
      next.onclick=()=>{if(month.getUTCFullYear()<9999||month.getUTCMonth()<11){month.setUTCMonth(month.getUTCMonth()+1);draw();}};
      grid.onclick=e=>{const b=e.target.closest('[data-receipt-date]');if(b){value=b.dataset.receiptDate;$('dialog').close('yes');}};
      draw();
    },()=>({multiple,date:value}));
  }

  function sharedReceiptPayment(draft, lines) {
    if (!draft.multiple || draft.mode !== 'double' || new Set(lines.map(row => row.date ?? draft.date)).size < 2) return null;
    try { return StaffEntry14225.sharedPayment(draft, lines, accounts(), rules()); }
    catch { return null; } // Invalid or partially typed amounts use normal line validation.
  }

  // Offer to combine separate cards only when exactly one assigned payment
  // covers all their expenses. The user confirms by selecting the action.
  function combinedPayment(draft, cards) {
    if (draft.mode !== 'double' || cards.length < 2) return null;
    const rows = [];
    for (const indices of cards) {
      const entered = indices.map(i => draft.lines[i]).filter(row =>
        row.account || row.debit || row.credit || row.memo || row.reference);
      if (!entered.length) return null;
      const dates = new Set(entered.map(row => cardDate(draft,row)));
      if (indices.some(i => !dates.has(cardDate(draft,draft.lines[i])))) return null;
      rows.push(...entered);
    }
    try {
      const plan = StaffEntry14225.sharedPayment(draft, rows, accounts(), rules());
      return plan && Number.isSafeInteger(plan.totalCents) &&
        plan.totalCents === Math.round(Number(String(plan.fundLine.credit).replaceAll(',', '')) * 100) ? {rows,plan} : null;
    } catch { return null; }
  }
  function preparePhoneEntry(draft) {
    draft={...draft,receiptEditor341:true};
    const list=draft.mode==='double'?'lines':'single', parts=[];
    const cards=receiptCards(draft);
    // The personal journal posts balanced movements for each date and currency.
    // Keep separate receipts distinct even when they share a date.
    cards.forEach((indices,i)=>{
      const shared = sharedReceiptPayment(draft, indices.map(index => draft[list][index]));
      if (shared) {
        try { parts.push(...StaffEntry14225.datedPaymentParts(draft, shared, accounts(), rules())); }
        catch (error) { throw Error((cards.length > 1 ? 'Receipt ' + (i+1) + ' · ' : '') + error.message); }
        return;
      }
      const days=new Map();
      for(const index of indices){
        const row=draft[list][index],date=cardDate(draft,row);
        if(!days.has(date))days.set(date,[]);
        days.get(date).push(row);
      }
      for(const [date,rows] of days){
        try{parts.push(StaffEntry14225.prepare({...draft,date,[list]:rows},accounts(),rules()));}
        catch(error){throw Error((cards.length>1?'Receipt '+(i+1)+' · ':'')+error.message);}
      }
    });
    if(parts.length===1)return parts[0];
    if(!parts.length)return StaffEntry14225.prepare(draft,accounts(),rules());
    const items=parts.flatMap(p=>p.items);
    return {items,snapshot:{mode:draft.mode,date:draft.date,memo:draft.memo.trim(),reference:draft.reference||'',
      multiple:!!draft.multiple,components1437:items,receiptCards341:parts.map(p=>p.snapshot)}};
  }
