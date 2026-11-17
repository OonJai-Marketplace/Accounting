/* The assigned ledger RPC calculates balances in posting order. Reverse only the finished rows. */
window.StaffJournalView=(()=>{
  const descending=(a,b)=>String(b||'').localeCompare(String(a||''));
  function newestLine(a,b){
    return descending(a.transaction_date,b.transaction_date)||descending(a.created_at,b.created_at)||
      Number(b.line_no||0)-Number(a.line_no||0)||descending(a.id,b.id);
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
  return {newestLine,newestReport,balance,ledgerPeriod};
})();
