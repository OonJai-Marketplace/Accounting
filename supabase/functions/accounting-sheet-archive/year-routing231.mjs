// Accounting dates, never the preparation date, select an annual destination.
import {key,canonical} from './core.mjs';
export function localDay231(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Vientiane',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function preparationYears231(now=new Date(),manual=false){const day=localDay231(now),year=Number(day.slice(0,4));return manual||day.slice(5)>='12-30'?[year,year+1]:[year];}
export function dateYear231(value){const s=String(value??'');return /^(19|20|21)\d{2}(?:-(?:0[1-9]|1[0-2])(?:-\d{2})?)?$/.test(s.slice(0,10))?Number(s.slice(0,4)):null;}
export const masters231=new Set(['accounts','sub_accounts','currencies','account_groups143180','accounting_id_settings','business_settings','budget_settings14313','budget_templates14313','employees','payroll_employees','payroll_tax_settings','profiles','user_permissions','user_fund_assignments','user_print_preferences1434','print_settings','presentation_settings113','voucher_settings14299','transaction_templates','transaction_template_lines','report_types14253','hr_calendar_settings14306','entry_prefix_reservations','staff_entry_sequences','opening_state14234','backup_registry113','review_routes14229','upcoming_reminders14229']);
const parents231={journal_lines:['journal_entry_id','journal_entries'],journal_sources14253:['journal_line_id','journal_lines'],payroll_lines:['payroll_run_id','payroll_runs'],fund_adjustment_lines:['request_id','fund_adjustment_requests'],voucher_versions14299:['voucher_id','vouchers14299'],cashier_shift_closes:['staff_journal_id','staff_journals'],cashier_shift_tenders:['shift_close_id','cashier_shift_closes'],cashier_currency_counts:['shift_close_id','cashier_shift_closes'],approved_reports1443:['journal_id','staff_journals'],book_sessions136:['period_id','accounting_periods'],period_findings:['accounting_period_id','accounting_periods'],audit_reviews136:['period_id','accounting_periods']};
export function router231(tables,events=[]){
 const index=new Map();for(const [table,rows]of Object.entries(tables))for(const row of rows)index.set(table+':'+key(row,table),row);
 for(const q of events)if(!index.has(q.table_name+':'+key(q.record,q.table_name)))index.set(q.table_name+':'+key(q.record,q.table_name),q.record);
 function years(table,row,depth=0){
  if(depth>8)throw Error('Circular accounting date reference in '+table);
  if(masters231.has(table))return null;
  if(row.accounting_year231)return [Number(row.accounting_year231)];
  const d=row.data||{},explicit=table==='journal_entries'||table==='staff_journal_lines'||table==='entry_submissions'?row.transaction_date:table==='vouchers14299'?row.voucher_date:row.period_month||row.period_start||row.occurrence_date||row.transaction_date||d.month||d.date||d.from||row.date||row.year||row.year_no;
  const y=dateYear231(explicit);if(y)return [y];
  const parent=parents231[table];if(parent&&row[parent[0]]){const p=index.get(parent[1]+':'+row[parent[0]]);if(!p)throw Error('Cannot determine accounting year for '+table+' '+key(row,table)+': its dated parent is missing.');return years(parent[1],p,depth+1);}
  if(table==='scanner_documents208'){const matches=[...(row.journal_ids||[]).map(id=>['journal_entries',id]),...(row.staff_line_ids||[]).map(id=>['staff_journal_lines',id])].flatMap(([t,id])=>index.has(t+':'+id)?years(t,index.get(t+':'+id),depth+1)||[]:[]);if(matches.length)return [...new Set(matches)];}
  const stamp=dateYear231(row.created_at||row.captured_at||row.submitted_at||row.updated_at||d.createdAt||d.updatedAt);return stamp?[stamp]:null;
 }
 return {years,select(year){const out={};for(const [table,rows]of Object.entries(tables))out[table]=rows.filter(row=>{const a=years(table,row);return a===null||a.includes(year);}).sort((a,b)=>key(a,table).localeCompare(key(b,table)));return out;},allYears(){return [...new Set(Object.entries(tables).flatMap(([t,rows])=>rows.flatMap(r=>years(t,r)||[])))].sort();}};
}
// Keep saved employee records lossless in Raw Data; limit their embedded report histories by year.
export function reportTables231(tables,year){const out={...tables,payroll_employees:(tables.payroll_employees||[]).map(e=>{const data=structuredClone(e.data||{});data.historicalPayroll200=(data.historicalPayroll200||[]).filter(h=>dateYear231(h.month)===year);const h=data.leaveHistory200;if(h)for(const field of ['records','snapshots','closedPeriods'])h[field]=(h[field]||[]).filter(r=>dateYear231(r.from||r.sourceMonth||r.sourcePeriodDate||r.start)===year);return {...e,data};})};return out;}
export function mergeAnnualTables231(packs){const out={},maps={};for(const pack of packs)for(const [table,rows]of Object.entries(pack)){maps[table]??=new Map();for(const r of rows)maps[table].set(key(r,table),r);}for(const [t,m]of Object.entries(maps))out[t]=[...m.values()];return out;}
