  // A receipt owns its lines. Dates can repeat, and changing a date never merges cards.
  function receiptCards(draft) {
    if (draft.mode === 'single') return draft.single.map((row, index) => [index]);
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
  function chooseReceiptDate(draft) {
    let multiple = !!draft.multiple, value = draft.date || today();
    const month = new Date(value.slice(0,7) + '-01T12:00:00Z');
    return phoneDialog14370(() => {
      const body = $('dialogBody');
      body.innerHTML = '<h2>Date</h2><div class="receipt-segments" role="group" aria-label="Date mode"><button type="button" data-date-mode="one">One date</button><button type="button" data-date-mode="multiple">Multiple dates</button></div><div class="receipt-calendar"><header><button type="button" aria-label="Previous month">‹</button><strong aria-live="polite"></strong><button type="button" aria-label="Next month">›</button></header><div class="receipt-days"></div></div><p class="receipt-date-help"></p>';
      $('dialogButtons').innerHTML = '<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes">Apply</button>';
      const calendar=body.querySelector('.receipt-calendar'), grid=body.querySelector('.receipt-days'), help=body.querySelector('.receipt-date-help');
      function draw() {
        for (const b of body.querySelectorAll('[data-date-mode]')) b.setAttribute('aria-pressed',String((b.dataset.dateMode==='multiple')===multiple));
        calendar.hidden=multiple;
        help.textContent=multiple?'Choose the date on each receipt. Several receipts can use the same date.':'';
        help.hidden=!multiple;
        if (multiple) return;
        calendar.querySelector('strong').textContent=month.toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'});
        const end = new Date(month); end.setUTCMonth(end.getUTCMonth()+1,0);
        grid.innerHTML = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(day=>'<small>'+day+'</small>').join('')+'<span></span>'.repeat(month.getUTCDay());
        for(let day=1;day<=end.getUTCDate();day++){
          const date=month.toISOString().slice(0,7)+'-'+String(day).padStart(2,'0'), b=document.createElement('button');
          b.type='button'; b.textContent=day; b.dataset.receiptDate=date;
          b.setAttribute('aria-label',dateLabel(date)); b.setAttribute('aria-pressed',String(date===value)); grid.append(b);
        }
      }
      for(const b of body.querySelectorAll('[data-date-mode]')) b.onclick=()=>{multiple=b.dataset.dateMode==='multiple';draw();};
      const [prev,next]=calendar.querySelectorAll('header button');
      prev.onclick=()=>{if(month.getUTCFullYear()>1||month.getUTCMonth()>0){month.setUTCMonth(month.getUTCMonth()-1);draw();}};
      next.onclick=()=>{if(month.getUTCFullYear()<9999||month.getUTCMonth()<11){month.setUTCMonth(month.getUTCMonth()+1);draw();}};
      grid.onclick=e=>{const b=e.target.closest('[data-receipt-date]');if(b){value=b.dataset.receiptDate;draw();}};
      draw();
    },()=>({multiple,date:value}));
  }

  function preparePhoneEntry(draft) {
    draft={...draft,receiptEditor341:true};
    const cards=receiptCards(draft), list=draft.mode==='double'?'lines':'single';
    if(cards.length===1) draft.date=cardDate(draft,draft[list][cards[0][0]]);
    if(cards.length<2) return StaffEntry14225.prepare(draft,accounts(),rules());
    const parts=cards.map((indices,i)=>{
      const rows=indices.map(index=>draft[list][index]);
      try {
        return StaffEntry14225.prepare({...draft,date:cardDate(draft,rows[0]),[list]:rows},accounts(),rules());
      } catch(error){throw Error('Receipt '+(i+1)+' · '+error.message);}
    });
    const items=parts.flatMap(p=>p.items);
    return {items,snapshot:{mode:draft.mode,date:draft.date,memo:draft.memo.trim(),reference:draft.reference||'',
      multiple:!!draft.multiple,components1437:items,receiptCards341:parts.map(p=>p.snapshot)}};
  }
