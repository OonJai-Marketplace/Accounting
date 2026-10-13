function exportArchiveMonth67(month){
  const rows=periodEntries(month),columns=['Entry ID','Date','Account','Currency','Memo','Debit','Credit'];
  const csv=[columns,...rows.map(r=>[r.id,r.date,r.account,r.currency,r.memo,r.debit,r.credit])].map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`journal-${month}.csv`;(window.exportCenter14337?exportCenter14337.fromLink(a):a.click());setTimeout(()=>URL.revokeObjectURL(url),1000);
}