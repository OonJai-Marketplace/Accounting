/* Read-only export selection. No database writes; dates and currencies stay explicit. */
(()=>{'use strict';
const groups={ledger:['journal_entries','journal_lines','journal_sources14253'],payroll:['payroll_runs','payroll_lines','payroll_employees'],staff:['staff_journals','staff_journal_lines','approved_reports1443'],vouchers:['vouchers14299','voucher_versions14299'],reference:['accounts','sub_accounts','currencies'],audit:['audit_log','record_deletions108','audit_reviews136','period_findings']};
const parents={journal_lines:['journal_entry_id','journal_entries'],journal_sources14253:['journal_line_id','journal_lines'],payroll_lines:['payroll_run_id','payroll_runs'],staff_journal_lines:['staff_journal_id','staff_journals'],approved_reports1443:['journal_id','staff_journals'],voucher_versions14299:['voucher_id','vouchers14299'],audit_reviews136:['period_id','accounting_periods'],period_findings:['accounting_period_id','accounting_periods']};
function select(pack,{month,scope,groups:selected}){
 maintenanceEngine14324.cutoff(month);
 if(!['month','all'].includes(scope)||!selected.length||selected.some(g=>g!=='complete'&&!groups[g]))throw Error('Choose valid export datasets and dates.');
 if(selected.includes('complete'))return {...pack,exportSelection:{scope:'all',groups:['complete'],comparisonMonth:month}};
 const source={...pack.tables,...pack.auditTrail},tables={},wanted=new Set(selected.flatMap(g=>groups[g]));
 // Identifiers and chart references are retained to make the selected records interpretable.
 if(selected.some(g=>['ledger','staff','vouchers'].includes(g)))groups.reference.forEach(t=>wanted.add(t));
 function get(t){if(tables[t])return tables[t];const list=Array.isArray(source[t])?source[t]:[];
  if(scope==='all'||['accounts','sub_accounts','currencies','payroll_employees'].includes(t))return tables[t]=list;
  const parent=parents[t];if(parent){const ids=new Set(get(parent[1]).map(r=>r.id));return tables[t]=list.filter(r=>ids.has(r[parent[0]]));}
  return tables[t]=list.filter(r=>String(r.transaction_date||r.voucher_date||r.period_start||r.period_month||r.created_at||r.changed_at||r.deleted_at||'').slice(0,7)===month);
 }
 wanted.forEach(get);
 return {format:pack.format,maintenanceVersion:pack.maintenanceVersion,copiedAt14324:pack.copiedAt14324,exportSelection:{scope,month,groups:selected,referenceRows:'Chart and employee references are not date-filtered.'},tables};
}
function issueGroup(i){return /^(draft|deferred|pending|finding|review|submission|payroll|report):/.test(i.id)?'pending':/^(control|clearing|memo):/.test(i.id)?'control':'ledger'}
window.maintenanceSelection14325={groups,select,issueGroup};
})();
