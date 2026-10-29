import {createHash} from 'node:crypto';
import {buildData} from './reports.mjs';
export const canonical=value=>JSON.stringify(normal(value));
function normal(v){if(Array.isArray(v))return v.map(normal);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,normal(v[k])]));return v;}
const compoundKeys={accounting_feature_samples:['sample_key'],backup_registry113:['table_name'],currencies:['code'],drive_draft_dispositions143160:['sheet','draft'],entry_prefix_reservations:['stem'],hope_reads183:['message_id','app','actor'],hr_inbox143168:['sheet','request_id'],journal_sources14253:['journal_line_id','source_line_id'],operation_receipts14228:['actor_id','request_key'],presentation_settings113:['area'],staff_entry_sequences:['user_id'],todo_starter_installs14335:['owner_id'],upcoming_reminders14229:['owner_id'],user_permissions:['user_id'],user_print_preferences1434:['owner_id'],voucher_sequences14299:['year_no','kind']};
export const key=(r,table)=>String(r.id??r.journal_id??r.year??(compoundKeys[table]?canonical(compoundKeys[table].map(k=>r[k])):('sha256:'+createHash('sha256').update(canonical(r)).digest('hex'))));
export function parts(text){const out=[];for(let i=0;i<text.length;){let end=Math.min(i+28000,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;out.push(text.slice(i,end));i=end;}return out;}
export function records(tables){return Object.entries(tables).sort(([a],[b])=>a.localeCompare(b)).flatMap(([table,rows])=>[...rows].sort((a,b)=>key(a,table).localeCompare(key(b,table))).flatMap(r=>parts(canonical(r)).map((p,i)=>[table,key(r,table),i+1,p])));}
export function unpack(rows){const groups=new Map(),tables={};for(const r of rows){if(!r[0])continue;const k=canonical(r.slice(0,2));if(!groups.has(k))groups.set(k,[]);const a=groups.get(k),part=Number(r[2]);if(!Number.isInteger(part)||part<1||a[part-1]!==undefined)throw Error('Duplicate or invalid history record part');a[part-1]=String(r[3]??'');}
 for(const [k,a]of groups){if(a.filter(x=>x!==undefined).length!==a.length)throw Error('Missing history record part');const [t,id]=JSON.parse(k),r=JSON.parse(a.join(''));if(key(r,t)!==id)throw Error('History record ID does not match its data');(tables[t]??=[]).push(r);}return tables;}
export function compare(expected,actual,{bidirectional=true}={}){
 const differences=[],counts=[];for(const table of new Set([...Object.keys(expected),...(bidirectional?Object.keys(actual):[])])){
  const db=expected[table]||[],sheet=actual[table]||[],d=new Map(db.map(r=>[key(r,table),r])),s=new Map();
  for(const r of sheet){const k=key(r,table);if(s.has(k))differences.push({table,id:k,field:'',database:'one record',sheet:'duplicate',kind:'duplicate'});s.set(k,r);}
  for(const [id,r]of d){const found=s.get(id);if(!found){differences.push({table,id,field:'',database:r,sheet:null,kind:'missing_in_sheet'});continue;}
   for(const field of new Set([...Object.keys(r),...Object.keys(found)]))if(canonical(r[field])!==canonical(found[field]))differences.push({table,id,field,database:r[field]??null,sheet:found[field]??null,kind:'different'});
  }
  if(bidirectional)for(const [id,r]of s)if(!d.has(id))differences.push({table,id,field:'',database:null,sheet:r,kind:'missing_in_database'});
  counts.push({table,database:db.length,sheet:sheet.length});
 }return {match:!differences.length,counts,differences};
}
export function journal(tables,years=null){const byID=new Map((tables.journal_entries||[]).map(e=>[e.id,e])),accounts=new Map((tables.accounts||[]).map(a=>[a.id,a]));
 const head=['Year','Posting date','Entry ID','Status','General description','Account code','Account','Type','Currency','Debit','Credit','Debit LAK','Credit LAK','Transaction FX rate','Book FX rate','Line memo','Line date','Line UUID','Entry UUID','Account UUID','Reference','Technical account'];
 const rows=(tables.journal_lines||[]).flatMap(l=>{const e=byID.get(l.journal_entry_id);if(!e)throw Error('Journal line has no parent entry');const year=Number(e.transaction_date.slice(0,4));if(years&&!years.has(year))return [];const a=accounts.get(l.account_id);if(!a)throw Error('Journal account is missing');return [[year,e.transaction_date,e.entry_no,e.status,e.memo||'',a.code,a.name,a.account_type,l.currency_code,l.debit,l.credit,l.currency_code==='LAK'?l.debit:l.base_debit,l.currency_code==='LAK'?l.credit:l.base_credit,l.fx_rate_lak,l.book_rate_lak,l.description||'',l.line_date||'',l.id,e.id,a.id,e.reference||'',!!a.is_technical||a.account_purpose!=='regular']];}).sort((a,b)=>String(a[1]).localeCompare(String(b[1]))||String(a[2]).localeCompare(String(b[2]))||String(a[17]).localeCompare(String(b[17])));
 return [head,...rows];
}
export function reports(tables,years=null){const j=journal(tables,years),groups=new Map();
 for(const r of j.slice(1)){if(r[3]!=='posted')continue;const k=[r[0],r[19],r[8]].join('|');if(!groups.has(k))groups.set(k,[r[0],r[5],r[6],r[7],r[8],0,0,0,0,0,0,r[21],false]);const g=groups.get(k);g[5]+=Number(r[9]);g[6]+=Number(r[10]);if(r[11]==null||r[12]==null)g[12]=true;else{g[9]+=Number(r[11]);g[10]+=Number(r[12]);}}
 const tb=[['Year','Code','Account','Type','Currency','Debits','Credits','Debit balance','Credit balance','Debit LAK','Credit LAK','Technical account','LAK valuation incomplete'],...[...groups.values()].sort((a,b)=>a[0]-b[0]||String(a[1]).localeCompare(String(b[1]))).map(g=>{g[7]=Math.max(0,g[5]-g[6]);g[8]=Math.max(0,g[6]-g[5]);if(g[12])g[9]=g[10]=null;return g;})];
 const pl=[['Year','Code','Account','Type','Currency','Original currency result','LAK result','Valuation status']];
 for(const g of tb.slice(1))if(!g[11]&&['REVENUE','EXPENSE'].includes(g[3]))pl.push([g[0],g[1],g[2],g[3],g[4],g[3]==='REVENUE'?g[6]-g[5]:g[5]-g[6],g[12]?null:g[3]==='REVENUE'?g[10]-g[9]:g[9]-g[10],g[12]?'Missing saved LAK valuation':'Saved LAK valuation']);
 const bs=[tb[0],...tb.slice(1).filter(g=>!g[11]&&['ASSET','LIABILITY','EQUITY'].includes(g[3]))];
 const monthly=new Map();for(const r of j.slice(1)){if(r[3]!=='posted'||r[21]||!['REVENUE','EXPENSE'].includes(r[7]))continue;const k=r[1].slice(0,7)+'|'+r[8];if(!monthly.has(k))monthly.set(k,[r[1].slice(0,7),r[8],0,0,0,0,false]);const m=monthly.get(k),rev=r[7]==='REVENUE';m[rev?2:3]+=rev?r[10]-r[9]:r[9]-r[10];if(r[11]==null||r[12]==null)m[6]=true;else m[rev?4:5]+=rev?r[12]-r[11]:r[11]-r[12];}
 return {'Journal':j,'General Ledger':[j[0],...j.slice(1).sort((a,b)=>String(a[5]).localeCompare(String(b[5]))||String(a[1]).localeCompare(String(b[1])))],'Trial Balance':tb,'Income Statement':pl,'Balance Sheet':bs,'Monthly Results':[['Month','Currency','Revenue','Expenses','Revenue LAK','Expenses LAK','Valuation incomplete'],...[...monthly.values()].map(m=>m[6]?[...m.slice(0,4),null,null,true]:m)]};
}
export function currentViews(tables,sealed,currentYear){const openYears=new Set((tables.journal_entries||[]).map(e=>Number(e.transaction_date.slice(0,4))).filter(y=>!sealed.has(y))),out=reports(tables,openYears);
 out['Current Year Journal']=journal(tables,sealed.has(currentYear)?new Set():new Set([currentYear]));out['Open Years Journal']=journal(tables,openYears);out['All Journals']=out.Journal;
 const pack={tables,createdAt:new Date().toISOString(),from:currentYear+'-01-01',to:currentYear+'-12-31',auditTrail:{audit_log:tables.audit_log||[]},storage:[]};
 const mapping={'Sub-user Summary':'Fund Summary','Chart of Accounts':'Accounts','HR Staff':'Staff','HR Leave':'Leave','Payroll Detail':'Payroll'};
 for(const s of buildData(pack)){const name=mapping[s.name]||s.name;if(['Overview','Journal','Trial Balance','Reports','Source Records'].includes(s.name))continue;out[name]=[s.headers,...s.rows.map(row=>row.map((v,i)=>v&&typeof v==='object'&&v.formula?v.cache:s.dateCols?.includes(i)&&typeof v==='number'?new Date((v-25569)*86400000).toISOString().slice(0,10):v??''))];}
 for(const [name,t]of [['Submissions','entry_submissions'],['Budget Requests','operational_reports'],['Attendance','hr_calendar_events14306'],['AI HR','hr_inbox143168']])out[name]=[['Record ID','Saved record'],...(tables[t]||[]).map(r=>[key(r,t),canonical(r)])];
 out['Payroll Check']=[['Check','Value'],['Payroll runs',(tables.payroll_runs||[]).length],['Payroll rows',out.Payroll.length-1],['Missing saved net',out.Payroll.slice(1).filter(r=>r[8]===''||r[8]==null).length],['Missing payment conversion',out.Payroll.slice(1).filter(r=>r[13]===''||r[13]==null).length]];
 out['Raw Data']=[['Table','Record ID','Part','Original JSON'],...records(tables)];
 out['Checks']=[['Check','Value'],['Posted entries',(tables.journal_entries||[]).filter(e=>e.status==='posted').length],['Journal lines',(tables.journal_lines||[]).length],['Missing saved LAK valuations',out.Journal.slice(1).filter(r=>r[3]==='posted'&&(r[11]==null||r[12]==null)).length]];
 for(const [name,source]of [['Print Journal','Journal'],['Print Ledger','General Ledger'],['Print Trial Balance','Trial Balance'],['Print Profit and Loss','Income Statement'],['Print Balance Sheet','Balance Sheet'],['Print Payroll','Payroll'],['Print Tax and SSO','Tax and SSO']])out[name]=out[source];
 return out;
}
