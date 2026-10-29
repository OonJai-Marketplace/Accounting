/* Reports fetch only requested periods. Earlier activity is a compact opening summary;
 * these read-only snapshots never replace the editable/offline journal. */
(()=>{'use strict';
const cache=new Map(),pending=new Map(),failures=new Map();
const fields=['mode','month','year','quarter','from','to','currency','basis','account','query','selectedMonths14331','allMonths14331','cash','payroll'];
let scope='',client=null,entries=null,generation=0;
const identity=()=>[typeof liveProfile==='undefined'?'':liveProfile?.id||'',window.workspaceRequest138?.target||'',typeof ojmDb==='undefined'?'':ojmDb?.supabaseUrl||''].join(':');
function reset(){generation++;cache.clear();pending.clear();failures.clear()}
function restoreFilters(){const next=identity(),db=typeof ojmDb==='undefined'?null:ojmDb;if(scope!==next||client!==db){scope=next;client=db;entries=JournalModule.confirmedSnapshot14385||JournalModule.entries;reset();try{const saved=JSON.parse(localStorage.getItem('ojm-report-filters143195:'+scope)||'null');if(saved&&/^\d{4}-\d{2}-\d{2}$/.test(saved.from)&&/^\d{4}-\d{2}-\d{2}$/.test(saved.to)&&saved.from<=saved.to){for(const key of fields)if(Object.hasOwn(saved,key))Reports79[key]=saved[key]}else{const latest=JournalModule.entries.filter(r=>!r.pendingSync&&!r.local14333&&!r.voided_at&&(!r.status||r.status==='posted')).map(r=>String(r.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)).sort().at(-1);if(latest){Object.assign(Reports79,{mode:'monthly',month:latest,year:Number(latest.slice(0,4)),quarter:Math.ceil(Number(latest.slice(5))/3),from:latest+'-01',to:summaryPeriod14331.end(latest),selectedMonths14331:null,allMonths14331:false})}}}catch{}}else if(entries!==(JournalModule.confirmedSnapshot14385||JournalModule.entries)){entries=JournalModule.confirmedSnapshot14385||JournalModule.entries;reset()}}
function save(){try{localStorage.setItem('ojm-report-filters143195:'+scope,JSON.stringify(Object.fromEntries(fields.map(k=>[k,Reports79[k]]))))}catch{}}
const range=(from,to)=>({from:from<to.slice(0,4)+'-01-01'?to.slice(0,4)+'-01-01':from,to});
const key=p=>p.from+'|'+p.to;
function periods(){const s=Reports79;let list;if(s.allMonths14331)return [{from:'1900-01-01',to:'9999-12-31'}];
 if(s.kind==='bs'&&window.reportPeriods118)list=reportPeriods118();
 else if(s.selectedMonths14331?.length)list=s.selectedMonths14331.map(m=>({from:m+'-01',to:summaryPeriod14331.end(m)}));
 else{list=[];for(let y=Number(s.from.slice(0,4));y<=Number(s.to.slice(0,4));y++)list.push({from:y===Number(s.from.slice(0,4))?s.from:y+'-01-01',to:y===Number(s.to.slice(0,4))?s.to:y+'-12-31'})}
 return [...new Map(list.map(p=>{const r=range(p.from,p.to);return [key(r),r]})).values()];
}
async function read(p){const k=key(p);if(cache.has(k))return cache.get(k);if(pending.has(k))return pending.get(k);
 const who=scope,db=client,epoch=generation,current=()=>scope===who&&identity()===who&&client===db&&ojmDb===db&&generation===epoch;
 const task=(async()=>{let rows=[],opening=[],revision;
  for(let offset=0;;offset+=500){const response=await db.rpc('journal_window14333',{p_from:p.from,p_to:p.to,p_offset:offset});if(!current())throw Error('The account or journal changed while loading this report.');if(response.error)throw response.error;
   const data=response.data;if(!Array.isArray(data?.rows)||offset===0&&!Array.isArray(data.opening))throw Error('The selected period is incomplete.');
   if(!offset){opening=data.opening;if(opening.some(b=>!b.accountId||!b.currency||!Number.isFinite(Number(b.balance))||b.base_balance!=null&&!Number.isFinite(Number(b.base_balance))))throw Error('The opening balances are incomplete.');revision=data.revision}else if(revision!==data.revision)throw Error('The journal changed during download. Refresh this report.');
   if(data.rows.some(l=>!l.id||!l.date||l.date<p.from||l.date>p.to||!Number.isFinite(Number(l.debit))||!Number.isFinite(Number(l.credit))))throw Error('The selected period contains an invalid record.');
   rows.push(...data.rows);if(data.rows.length<500)break;
  }
  const result={...p,rows,opening,revision};cache.set(k,result);failures.delete(k);return result;
 })().catch(error=>{if(current())failures.set(k,error.message||String(error));throw error}).finally(()=>{if(current())pending.delete(k)});
 pending.set(k,task);return task;
}
async function ensure(){restoreFilters();const list=periods(),all=Reports79.allMonths14331;if(!client?.rpc)throw Error('Connect to the company journal to load this period.');await Promise.all(list.map(read));if(all&&Reports79.allMonths14331){const dates=cache.get('1900-01-01|9999-12-31').rows.map(l=>l.date).sort();if(dates.length){Reports79.from=dates[0];Reports79.to=dates.at(-1)}}save()}
function snapshot(from,to){if(Reports79.allMonths14331)return cache.get('1900-01-01|9999-12-31')||null;
 // The top-level account picker needs the latest selected snapshot. Each report
 // column is subsequently calculated with its own exact period and opening.
 if(Reports79.selectedMonths14331?.length>1&&from===Reports79.selectedMonths14331[0]+'-01'&&to===summaryPeriod14331.end(Reports79.selectedMonths14331.at(-1))){from=Reports79.selectedMonths14331.at(-1)+'-01'}
 return cache.get(key(range(from,to)))||cache.get('1900-01-01|9999-12-31')||null;
}
function addOpening(rows,snapshot){for(const b of snapshot.opening){let row=rows.find(r=>String(r.account.id)===String(b.accountId)&&r.currency===b.currency);if(!row){const account=AccountingStore.accounts.find(a=>String(a.id)===String(b.accountId))||{id:b.accountId,name:'Unmapped',code:'Unmapped',type:'Unmapped',currency:b.currency};row={account,key:accountKey69(account,b.currency),currency:b.currency,opening:0,debit:0,credit:0,closing:0,baseOpening:0,baseDebit:0,baseCredit:0,baseClosing:0,missingRates:0,lines:[]};rows.push(row)}const amount=cents69(b.balance);row.opening+=amount;row.closing+=amount;if(b.currency!=='LAK'&&b.base_balance==null)row.missingRates++;else{const base=cents69(b.currency==='LAK'?b.balance:b.base_balance);row.baseOpening+=base;row.baseClosing+=base}}return rows}
function prepare(host){restoreFilters();save();const list=periods();if(list.length&&list.every(p=>cache.has(key(p))))return true;
 const error=list.map(p=>failures.get(key(p))).find(Boolean),selection=list.map(key).join(',');
 host.innerHTML='<div class="r79-header"><h3>'+escapeHtml(reportNames79[Reports79.kind])+'</h3><button class="je-btn je-btn-secondary" onclick="reportWindow143195.refresh()">Retry / Refresh</button></div><div class="r79-filters">'+(window.periodFilters14331?.markup()||'')+'</div><p role="status">'+escapeHtml(error||'Loading selected period…')+'</p>';
 if(!error){const who=scope;void ensure().then(()=>{if(identity()===who&&periods().map(key).join(',')===selection)renderReports79()}).catch(()=>{if(identity()===who&&periods().map(key).join(',')===selection)renderReports79()})}return false;
}
async function refresh(){restoreFilters();reset();renderReports79();try{await ensure();renderReports79()}catch(e){renderReports79();showCenterStatus(e.message,true)}}
async function source(encoded){restoreFilters();const who=scope,db=client,id=decodeURIComponent(encoded),line=[...cache.values()].flatMap(p=>p.rows).find(l=>l.id===id);if(!line?.dbEntryId)return showCenterStatus('Refresh the selected period before opening this entry.',true);
 try{const response=await db.from('journal_entries').select('id,entry_no,transaction_date,memo,status,journal_lines(line_no,line_date,description,currency_code,debit,credit,accounts(id,name,code))').eq('id',line.dbEntryId).eq('status','posted').maybeSingle();if(identity()!==who||ojmDb!==db)return;if(response.error)throw response.error;if(!response.data)throw Error('This entry is no longer posted. Refresh the report.');const e=response.data,lines=(e.journal_lines||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>({id:e.entry_no,dbEntryId:e.id,date:l.line_date||e.transaction_date,account:l.accounts?.name||'Unknown Account',currency:l.currency_code,memo:l.description||e.memo||'',generalMemo:e.memo,debit:Number(l.debit),credit:Number(l.credit),archived:(PeriodReview.periods[e.transaction_date.slice(0,7)]?.status||'open')!=='open'}));showJournalSource69(encoded,lines)}catch(e){if(identity()===who)showCenterStatus(e.message,true)}}
window.reportWindow143195={restoreFilters,ensure,snapshot,addOpening,prepare,refresh,reset,source,calculating:false};
})();
