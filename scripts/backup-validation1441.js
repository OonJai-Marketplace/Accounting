/* Validate archive structure before inspection or workbook generation. No database writes. */
(()=>{'use strict';
function validate(pack){
 if(pack?.format!=='oonjai-data-113'||!pack.tables||Array.isArray(pack.tables)||typeof pack.tables!=='object')throw Error('Choose an Oon Jai application backup.');
 for(const name of ['accounts','journal_entries','journal_lines'])if(!Array.isArray(pack.tables[name]))throw Error('Backup is missing '+name+'.');
 for(const [name,rows] of Object.entries(pack.tables)){if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('Invalid records in '+name+'.');const ids=rows.map(r=>r.id).filter(x=>x!=null).map(String);if(new Set(ids).size!==ids.length)throw Error('Duplicate record IDs in '+name+'.');}
 for(const [name,rows] of Object.entries(pack.auditTrail||{}))if(!Array.isArray(rows))throw Error('Invalid audit records in '+name+'.');
 const references=[['journal_lines','journal_entry_id','journal_entries'],['journal_lines','account_id','accounts'],['staff_journal_lines','staff_journal_id','staff_journals']];
 for(const [source,key,parent] of references){const ids=new Set((pack.tables[parent]||[]).map(r=>String(r.id)));if((pack.tables[source]||[]).some(r=>r[key]!=null&&!ids.has(String(r[key]))))throw Error('Backup contains '+source+' with missing '+parent+'. Prepare a complete backup before relying on its totals.');}
 for(const r of pack.tables.journal_lines)for(const k of ['debit','credit'])if(r[k]!=null&&(r[k]===''||!Number.isFinite(Number(r[k]))))throw Error('Backup contains an invalid journal amount.');
 return pack;
}
window.backupValidation1441={validate};
})();
