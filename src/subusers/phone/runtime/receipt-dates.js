  function chooseReceiptDates(initialDate) {
    const start = /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(initialDate) ? initialDate : today();
    const month = new Date(start.slice(0, 7) + '-01T12:00:00Z');
    const selected = new Set();
    return phoneDialog14370(() => {
      const body = $('dialogBody');
      body.innerHTML = '<h2>Choose receipt dates</h2><div class="receipt-calendar"><header><button type="button" aria-label="Previous month">‹</button><strong aria-live="polite"></strong><button type="button" aria-label="Next month">›</button></header><div class="receipt-days"></div></div>';
      $('dialogButtons').innerHTML = '<button class="btn" value="cancel">Cancel</button><button class="btn primary" value="yes" disabled>Add dates</button>';
      const grid = body.querySelector('.receipt-days'), add = $('dialogButtons').querySelector('[value=yes]');
      const draw = () => {
        body.querySelector('header strong').textContent = month.toLocaleDateString('en-GB', {month:'long',year:'numeric',timeZone:'UTC'});
        const prefix = month.toISOString().slice(0,7);
        const end = new Date(month);
        end.setUTCMonth(end.getUTCMonth()+1,0);
        grid.innerHTML = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(day=>'<small>'+day+'</small>').join('') + '<span></span>'.repeat(month.getUTCDay());
        for (let day=1; day<=end.getUTCDate(); day++) {
          const date=prefix+'-'+String(day).padStart(2,'0'), button=document.createElement('button');
          button.type='button'; button.textContent=String(day); button.dataset.receiptDate=date;
          button.setAttribute('aria-label',typeof window.formatAppDate==='function'?window.formatAppDate(date):new Date(date+'T12:00:00Z').toLocaleDateString(undefined,{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'})); button.setAttribute('aria-pressed',String(selected.has(date)));
          grid.append(button);
        }
      };
      const [previous,next] = body.querySelectorAll('header button');
      previous.onclick = () => {if(month.getUTCFullYear()>1||month.getUTCMonth()>0){month.setUTCMonth(month.getUTCMonth()-1);draw();}};
      next.onclick = () => {if(month.getUTCFullYear()<9999||month.getUTCMonth()<11){month.setUTCMonth(month.getUTCMonth()+1);draw();}};
      grid.onclick = event => {
        const button=event.target.closest('[data-receipt-date]');
        if (!button) return;
        const date=button.dataset.receiptDate;
        if (selected.has(date)) selected.delete(date); else selected.add(date);
        button.setAttribute('aria-pressed',String(selected.has(date)));
        add.disabled=!selected.size; add.textContent=selected.size?'Add dates ('+selected.size+')':'Add dates';
      };
      draw();
    }, () => [...selected].sort());
  }

  function appendReceiptDates(draft, dates) {
    const single=draft.mode==='single', rows=single?draft.single:draft.lines;
    const kind=single?'single':'lines', defaults=blankDraft()[kind];
    const empty=single ? rows.length===1 && !rows[0].affected && !rows[0].amount && !rows[0].memo && !rows[0].reference && !rows[0].description :
      rows.length===2 && rows.every(row=>!row.debit&&!row.credit&&!row.memo) &&
      (rows.every(row=>!row.account) || rows.filter(row=>row.account).length===1 && rows.some(row=>rules().fundIds.includes(row.account)));
    const replace=empty && !draft.editIds?.length && rows.every(row=>!row.date);
    const template=replace?rows:defaults;
    if(single&&!replace)defaults[0].direction=rows[0]?.direction||defaults[0].direction;
    const dated=dates.flatMap(date=>template.map(row=>({...row,date})));
    draft[kind]=replace?dated:rows.concat(dated);
  }
