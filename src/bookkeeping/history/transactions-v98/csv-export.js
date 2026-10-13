  window.exportJournalCSV=function(){
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const rows=[['Date','Entry ID','Account','Memo','Currency','DR','CR'],...[...JournalModule.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(e=>[e.date,e.id,e.account,e.memo,e.currency,e.debit,e.credit])];
    const url=URL.createObjectURL(new Blob([rows.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download='journal_transactions.csv';(window.exportCenter14337?exportCenter14337.fromLink(link):link.click());setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
