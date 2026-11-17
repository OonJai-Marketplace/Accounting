/* The assigned ledger RPC calculates balances in posting order. Reverse only the finished rows. */
window.StaffJournalView=(()=>{
  const descending=(a,b)=>String(b||'').localeCompare(String(a||''));
  function newestLine(a,b){
    return descending(a.transaction_date,b.transaction_date)||descending(a.created_at,b.created_at)||
      Number(b.line_no||0)-Number(a.line_no||0)||descending(a.id,b.id);
  }
  const ids=new Intl.Collator('en',{numeric:true});
  function compareEntry(a,b){
    const left=a.workspace_entry_no||'',right=b.workspace_entry_no||'';
    return ids.compare(left,right)||Number(a.line_no||0)-Number(b.line_no||0)||ids.compare(a.id||'',b.id||'');
  }
  function activeGroups(rows,ascending=false){
    const groups=new Map();
    for(const line of rows){
      const saved=line.editor_snapshot1437;
      // Older double-entry receipts have a saved editor group but no split labels.
      // An ordinary bulk cashbook save can also share a group across independent slips.
      const receipt=saved?.mode==='double'||saved?.receiptEditor341||saved?.splitByLine||saved?.groupedReceipt;
      const group=receipt && line.editor_group1437;
      const key=JSON.stringify([line.staff_journal_id,group || line.workspace_entry_no || line.id]);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(line);
    }
    const entries=[...groups.values()];
    for(const lines of entries)lines.sort(compareEntry);
    return entries.sort((a,b)=>ascending?compareEntry(a[0],b[0]):compareEntry(b[0],a[0]));
  }
  function validSnapshot(group){
   const d=group[0]?.editor_snapshot1437;if(!Array.isArray(d?.components1437))return null;
   const dates=new Set(group.map(l=>l.transaction_date));
   const normalize=rows=>rows.map(r=>JSON.stringify([r.date,r.direction,r.fund,r.account,Number(r.amount),r.memo,r.reference||'',r.kind||'',r.fx_rate_lak||null])).sort().join('|');
   const actual=group.map(l=>({date:l.transaction_date,direction:l.direction,fund:l.fund_account_id,account:l.account_id,amount:l.amount,memo:l.memo,reference:l.reference,kind:l.entry_kind,fx_rate_lak:l.fx_rate_lak}));
   return normalize(actual)===normalize(d.components1437.filter(r=>dates.has(r.date)))?d:null;
  }
  function newestReport(a,b){
    const date=r=>r.approved_at||r.reviewed_at||r.submitted_at||r.updated_at||r.created_at||r.period_start;
    return descending(date(a),date(b))||descending(a.id||a.journal_id,b.id||b.journal_id);
  }
  function balance(value,format){
    return Number(value)<0?'('+format(Math.abs(value))+')':format(Number(value)||0);
  }
  async function ledgerPeriod(read,owner,account,period){
    let rows=[],data;
    do{
      data=await read({p_owner:owner,p_account:account,p_from:period.from,p_to:period.to,p_offset:rows.length});
      if(!data?.accounts?.some(a=>a.id===account))throw Error('This ledger account is no longer assigned.');
      if(!Array.isArray(data.rows))throw Error('The ledger rows were incomplete.');
      rows.push(...data.rows);
    }while(data.rows.length===500);
    if(new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('The ledger changed while loading. Refresh the ledger.');
    return {...period,rows:rows.reverse(),opening:data.opening,closing:data.closing};
  }
  return {activeGroups,validSnapshot,newestLine,newestReport,balance,ledgerPeriod};
})();
