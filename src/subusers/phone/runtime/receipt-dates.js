  const maxReceiptParts = 10;

  // Count the top-level line once. Its category allocations occupy A, B, C...
  function numberedReceiptLines(rows) {
    const reserved=new Set(rows.filter(row=>row.splitGroup && row.splitNumber).map(row=>row.splitNumber));
    const groups = new Map();
    let number = 0;
    function nextNumber(){do {number++;} while(reserved.has(number));return number;}
    return rows.map(row => {
      if (!row.splitGroup) return {number:nextNumber()};
      if (!groups.has(row.splitGroup)) {
        const value=row.splitNumber || nextNumber();
        groups.set(row.splitGroup,{number:value,count:0});
        number=Math.max(value,number);
      }
      const group=groups.get(row.splitGroup);
      return {number:group.number, suffix:String.fromCharCode(65 + group.count++)};
    });
  }

  function addReceiptPart(draft, index) {
    const single = draft.mode === 'single', rows = single ? draft.single : draft.lines;
    const parent = rows[index];
    if (!parent || parent.journalLines) return;
    const group = parent.splitGroup || crypto.randomUUID();
    const parts = parent.splitGroup ? rows.filter(l => l.splitGroup === group) : [parent];
    if (parts.length >= maxReceiptParts) return;
    parent.splitNumber=numberedReceiptLines(rows)[index].number;
    parent.splitGroup = group;
    parent.receipt ||= crypto.randomUUID();
    const newLine = single ? {direction:parent.direction, source:parent.source, affected:'', amount:'', memo:''}
                           : {account:'', debit:'', credit:'', memo:''};
    if (single) newLine.split = parent.split ||= parent.direction === 'in' ? 'credit' : 'debit';
    rows.splice(rows.indexOf(parts.at(-1))+1, 0, {...newLine, receipt:parent.receipt, splitGroup:group, splitNumber:parent.splitNumber,
      ...(parent.reference == null ? {} : {reference:parent.reference}),
      ...(draft.multiple ? {date:cardDate(draft,parent)} : {})});
  }

  function removeReceiptPart(draft, index) {
    const rows = draft.mode === 'single' ? draft.single : draft.lines;
    const group = rows[index]?.splitGroup;
    if (!group) return;
    rows.splice(index,1);
    const remaining = rows.filter(row => row.splitGroup === group);
    if (remaining.length === 1) {
      delete remaining[0].splitGroup;
      delete remaining[0].splitNumber;
      delete remaining[0].splitLabel;
      if (draft.mode === 'single' && rows.filter(l=>l.receipt === remaining[0].receipt).length === 1) delete remaining[0].split;
    }
  }

  // A receipt owns its lines. Dates can repeat, and changing a date never merges cards.
  function receiptCards(draft) {
    if (draft.mode === 'single') {
      const groups = new Map();
      draft.single.forEach((row, i) => {
        const key = row.split ? row.receipt : i;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(i);
      });
      return [...groups.values()];
    }
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
    if (!draft.multiple || draft.mode !== 'double') return null;
    lines = lines.filter(journalLineEntered);
    if (new Set(lines.map(row => row.date ?? draft.date)).size < 2) return null;
    try { return StaffEntry14225.sharedPayment(draft, lines, accounts(), rules()); }
    catch { return null; } // Invalid or partially typed amounts use normal line validation.
  }

  // Offer to combine separate cards only when exactly one assigned payment
  // covers all their expenses. The user confirms by selecting the action.
  function combinedPayment(draft, cards) {
    if (draft.mode !== 'double' || cards.length < 2) return null;
    const rows = [];
    for (const indices of cards) {
      const entered = indices.map(i => draft.lines[i]).filter(journalLineEntered);
      rows.push(...entered);
    }
    try {
      const plan = StaffEntry14225.sharedPayment(draft, rows, accounts(), rules());
      return plan && Number.isSafeInteger(plan.totalCents) &&
        plan.totalCents === Math.round(Number(String(plan.fundLine.credit).replaceAll(',', '')) * 100) ? {rows,plan} : null;
    } catch { return null; }
  }
  function cashbookLineEntered(row, funds) {
    return row.journalLines?.some(journalLineEntered) || row.splitGroup || row.affected || row.amount ||
      row.memo?.trim() || row.description?.trim() || row.reference?.trim() ||
      row.fundMemo?.trim() || row.fundReference?.trim() ||
      row.source && !(funds.length === 1 && row.source === funds[0]);
  }

  function preparePhoneEntry(draft, keepLabels=false) {
    draft={...draft,receiptEditor341:true};
    const list=draft.mode==='double'?'lines':'single', parts=[];
    const labels=numberedReceiptLines(draft[list]);
    draft[list]=draft[list].map((row,i)=>row.splitGroup ? {...row,splitLabel:keepLabels && row.splitLabel || labels[i].number+labels[i].suffix} : row);
    if (draft[list].some(l=>l.splitGroup && !(draft.mode==='double' ? l.debit || l.credit : l.amount)))
      throw Error('Enter an amount for each split line, or remove the unused line.');
    const cards=receiptCards(draft), funds=rules().fundIds, unmatched=[];
    // The personal journal posts balanced movements for each date and currency.
    // Keep separate receipts distinct even when they share a date.
    function prepareCard(indices){
      const active = indices.map(index => draft[list][index]).filter(row => draft.mode === 'double' ?
        journalLineEntered(row) : cashbookLineEntered(row, funds));
      if (!active.length) return;
      if (draft.mode === 'double' && active.some(line=>!line.account))
        throw Error('Choose an account for each journal line you have started.');
      if (draft.mode === 'single' && active.some(line=>!line.journalLines && !line.amount))
        throw Error('Enter an amount for each receipt you have started.');
      const row = draft.mode === 'single' && active[0];
      const pairDetails = row && (row.fundMemo != null || row.fundReference != null || row.fundDate != null);
      const retained = row && (row.journalLines || (row.split ? splitJournalLines(draft, active) :
        pairDetails && journalPair(draft, row, draft.lines.filter(l=>l.receipt===row.receipt))));
      if (retained) {
        const prepared = preparePhoneEntry({...draft, mode:'double', lines:retained},!!row.split);
        const snapshots = prepared.snapshot.receiptCards341;
        if (snapshots) parts.push(...snapshots.map(snapshot => ({items:snapshot.components1437, snapshot})));
        else parts.push(prepared);
        return;
      }
      const shared = sharedReceiptPayment(draft, active);
      if (shared) {
        parts.push(...StaffEntry14225.datedPaymentParts(draft, shared, accounts(), rules()));
        return;
      }
      const days=new Map();
      for(const row of active){
        const date=cardDate(draft,row);
        if(!days.has(date))days.set(date,[]);
        days.get(date).push(row);
      }
      for(const [date,rows] of days){
        const r = rules();
        // Two transfer accounts can both be funds and categories. Preserve
        // the Cashbook fund when its debit and counterpart credit still match.
        const prior = draft.mode === 'double' && rows.length === 2 &&
          draft.single?.find(l => l.receipt && l.receipt === rows[0].receipt && l.direction === 'in');
        const incoming = prior && r.directions.includes('in') && r.fundIds.includes(prior.source) && r.entryIds.includes(prior.affected) &&
          rows.some(l => l.account === prior.source && l.debit && !l.credit) &&
          rows.some(l => l.account === prior.affected && l.credit && !l.debit);
        parts.push(StaffEntry14225.prepare({...draft,date,[list]:rows},accounts(),incoming ? {...r,directions:['in']} : r));
      }
    }
    let originalError;
    const order=new Map();
    cards.forEach((indices,i)=>{
      const start=parts.length;
      try { prepareCard(indices); parts.slice(start).forEach(part=>order.set(part,i)); }
      catch(error) {
        const message=(cards.length>1?'Receipt '+(i+1)+' · ':'')+error.message;
        if(draft.mode!=='double' || error.code!=='STAFF_JOURNAL_MATCH')throw Error(message);
        originalError ||= Error(message);
        parts.length=start;
        unmatched.push(...indices.map(index=>draft.lines[index]).filter(journalLineEntered));
      }
    });
    if(unmatched.length){
      try {
        const cardOrder=new Map(cards.map((indices,i)=>[draft.lines[indices[0]].receipt,i]));
        for(const part of allocatePhoneReceipts(draft,unmatched)){
          order.set(part,cardOrder.get(part.snapshot.receipt));
          parts.push(part);
        }
        parts.sort((a,b)=>order.get(a)-order.get(b));
      }
      catch(error){if(cards.length===1 && error.code==='STAFF_JOURNAL_MATCH')throw originalError;throw error;}
    }
    if(parts.length===1)return parts[0];
    if(!parts.length)return StaffEntry14225.prepare({...draft,[list]:[]},accounts(),rules());
    const items=parts.flatMap(p=>p.items);
    return {items,snapshot:{mode:draft.mode,date:draft.date,memo:draft.memo.trim(),reference:draft.reference||'',
      multiple:!!draft.multiple,components1437:items,receiptCards341:parts.map(p=>p.snapshot)}};
  }

  // Keep already balanced receipt cards independent. For the remaining lines,
  // allocate each fund against its category once and keep both entered dates.
  function allocatePhoneReceipts(draft,lines) {
    const allocations=[];
    const prepared=StaffEntry14225.prepare({...draft,lines},accounts(),rules(),(debit,credit,category,amount)=>{
      allocations.push({debit,credit,category,amount});
    });
    const groups=new Map(), positions=new Map(lines.map((l,i)=>[l,i]));
    allocations.forEach(({debit,credit,category,amount},i)=>{
      const item=prepared.items[i], key=JSON.stringify([category.receipt,item.date]);
      if(!groups.has(key))groups.set(key,{date:item.date,receipt:category.receipt,items:[],amounts:new Map(),splitParts:{}});
      const g=groups.get(key);
      const split=prepared.snapshot.splitParts?.[i];
      if(split)g.splitParts[g.items.length]=split;
      g.items.push(item);
      for(const l of [debit,credit])g.amounts.set(l,(g.amounts.get(l)||0)+Math.round(amount*100));
    });
    return [...groups.values()].map(({date,receipt,items,amounts,splitParts})=>{
      const rows=[...amounts.keys()].sort((a,b)=>positions.get(a)-positions.get(b)).map(line=>{
        const original=prepared.snapshot.rows[positions.get(line)], value=amounts.get(line)/100;
        const currency=Object.keys(original.credits)[0];
        return {...original, dr:original.dr?value:'', credits:{[currency]:original.dr?'':value},
          ...(original.dr===value || original.credits[currency]===value ? {} : {enteredAmount:original.dr || original.credits[currency]})};
      });
      const {splitParts:unused,...base}=prepared.snapshot;
      return {items,snapshot:{...base,date,receipt,rows,components1437:items,...(Object.keys(splitParts).length?{splitParts}:{}),allocatedReceipt:true}};
    });
  }
