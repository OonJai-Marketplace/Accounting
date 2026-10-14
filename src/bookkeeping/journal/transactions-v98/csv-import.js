  function parseCSV(text) {
    const rows=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
      else if(c===','&&!quoted){row.push(cell);cell=''}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell=''}
      else cell+=c;
    }
    if(quoted)throw new Error('The CSV contains an unclosed quotation mark.');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);return rows;
  }
  window.importJournalDraft98 = async function (file) {
    if(!file)return;const owner=liveProfile?.id;if(!owner)return;
    try {
      const rows=parseCSV((await file.text()).replace(/^\uFEFF/,''));
      if(liveProfile?.id!==owner)return;
      const head=(rows.shift()||[]).map(s=>s.trim().toLowerCase());
      const column=(...names)=>head.findIndex(h=>names.includes(h));
      const ai=column('account'),di=column('dr','debit'),ci=column('cr','credit'),mi=column('memo','memo / reference','description'),datei=column('date'),currencyi=column('currency');
      if(ai<0||di<0||ci<0)throw new Error('Use CSV columns Account, DR, CR, with optional Date and Memo.');
      const entries=rows.map((r,i)=>{
        const account=getSelectedAccountInfo(r[ai]||'');
        if(!account)throw new Error(`Row ${i+2}: choose an existing account (${r[ai]||'blank'}).`);
        const number=value=>{const raw=String(value||'').trim();if(!raw||raw==='-')return 0;const n=Number(raw.replaceAll(',',''));if(!Number.isFinite(n)||n<0)throw new Error(`Row ${i+2}: enter a positive amount.`);return n};
        const dr=number(r[di]),cr=number(r[ci]);if((dr>0)===(cr>0))throw new Error(`Row ${i+2}: enter either DR or CR.`);
        if(currencyi>=0&&r[currencyi]&&r[currencyi].trim().toUpperCase()!==account.currency)throw new Error(`Row ${i+2}: currency must match ${account.currency}.`);
        const date=(datei>=0?r[datei]:'')||byId('jeTransDate').value;
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw new Error(`Row ${i+2}: use a date in YYYY-MM-DD format.`);
        return {account,dr,cr,date,memo:mi>=0?r[mi]:''};
      });
      if(!entries.length)throw new Error('No journal lines were found.');
      const apply=()=>{
        if(liveProfile?.id!==owner)return;
        clearJournalEntry();byId('jeLinesBody').replaceChildren();
        byId('jeTransDate').value=entries[0].date;
        setJournalDateMode(new Set(entries.map(e=>e.date)).size>1);
        byId('jeGeneralMemo').value=`Imported draft: ${file.name}`;
        entries.forEach(e=>{addJournalLineRow(`${e.account.code} — ${e.account.name}`,e.memo,String(e.dr||''),{[e.account.currency]:String(e.cr||'')});byId('jeLinesBody').lastElementChild.querySelector('.je-line-date').value=e.date});
        calculateJournalBalance();showJournalEntry98();showCenterStatus('Imported as a draft. Review before posting.');
      };
      showAppConfirm('Import Journal Draft',`Load ${entries.length} lines from ${escapeHtml(file.name)}? This replaces the current entry form. Nothing is posted until you press Post Entry.`,'Load Draft',apply,false);
    }catch(error){if(liveProfile?.id!==owner)return;showAppNotification('Import Could Not Load',error.message,true)}
  };
