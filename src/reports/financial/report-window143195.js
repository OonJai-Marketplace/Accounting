/* Complete, account-scoped report data is prepared before the workspace opens.
 * Periods and report screens share it; it never replaces the editable journal. */
(()=>{'use strict';
const cache=new Map(),pending=new Map(),failures=new Map(),renderedViews=new WeakMap();
const fields=['mode','month','year','quarter','from','to','currency','basis','account','query','selectedMonths14331','allMonths14331','cash','payroll'];
const allPeriod={from:'1900-01-01',to:'9999-12-31'},key=p=>p.from+'|'+p.to,allKey=key(allPeriod);
let scope='',client=null,entries=null,entryContent='',generation=0,foreground=null,sequence=0;
const identity=()=>[typeof liveProfile==='undefined'?'':liveProfile?.id||'',window.workspaceRequest138?.target||'',typeof ojmDb==='undefined'?'':ojmDb?.supabaseUrl||''].join(':');
const active=()=>document.querySelector('.tab-content.active')?.id||'';
const cancelled=()=>Object.assign(Error('Report loading was superseded.'),{name:'AbortError'});
function cancelForeground(){sequence++;foreground?.end?.();foreground=null;}
function reset(){generation++;cancelForeground();for(const task of pending.values())task.controller.abort();cache.clear();pending.clear();failures.clear()}
function restoreFilters(){
 const next=identity(),db=typeof ojmDb==='undefined'?null:ojmDb,rows=JournalModule.confirmedSnapshot14385||JournalModule.entries;
 if(scope!==next||client!==db){scope=next;client=db;entries=rows;entryContent=JSON.stringify(rows);reset();
  try{const saved=JSON.parse(localStorage.getItem('ojm-report-filters143195:'+scope)||'null');
   if(saved&&/^\d{4}-\d{2}-\d{2}$/.test(saved.from)&&/^\d{4}-\d{2}-\d{2}$/.test(saved.to)&&saved.from<=saved.to){for(const field of fields)if(Object.hasOwn(saved,field))Reports79[field]=saved[field]}
   else{const latest=rows.filter(r=>!r.pendingSync&&!r.local14333&&!r.voided_at&&(!r.status||r.status==='posted')).map(r=>String(r.date||'').slice(0,7)).filter(m=>/^\d{4}-\d{2}$/.test(m)).sort().at(-1);if(latest)Object.assign(Reports79,{mode:'monthly',month:latest,year:Number(latest.slice(0,4)),quarter:Math.ceil(Number(latest.slice(5))/3),from:latest+'-01',to:summaryPeriod14331.end(latest),selectedMonths14331:null,allMonths14331:false})}
  }catch{}
 }else if(entries!==rows){entries=rows;const content=JSON.stringify(rows);if(content!==entryContent){entryContent=content;reset()}}
}
function save(){try{localStorage.setItem('ojm-report-filters143195:'+scope,JSON.stringify(Object.fromEntries(fields.map(k=>[k,Reports79[k]]))))}catch{}}
const range=(from,to)=>({from:from<to.slice(0,4)+'-01-01'?to.slice(0,4)+'-01-01':from,to});
function periods(){const s=Reports79;let list;if(s.allMonths14331)return [allPeriod];
 if(s.kind==='bs'&&window.reportPeriods118)list=reportPeriods118();
 else if(s.selectedMonths14331?.length)list=s.selectedMonths14331.map(m=>({from:m+'-01',to:summaryPeriod14331.end(m)}));
 else{list=[];for(let y=Number(s.from.slice(0,4));y<=Number(s.to.slice(0,4));y++)list.push({from:y===Number(s.from.slice(0,4))?s.from:y+'-01-01',to:y===Number(s.to.slice(0,4))?s.to:y+'-12-31'})}
 return [...new Map(list.map(p=>{const r=range(p.from,p.to);return [key(r),r]})).values()];
}
const available=p=>cache.get(allKey)||cache.get(key(p));
function complete(){return periods().every(available)}
function normalizeAll(){if(!Reports79.allMonths14331)return;const rows=cache.get(allKey)?.rows;if(rows?.length){let first=rows[0].date,last=first;for(const row of rows){if(row.date<first)first=row.date;if(row.date>last)last=row.date}Reports79.from=first;Reports79.to=last}}
function read(p,{refresh=false,persist=false,cacheFirst=false}={}){
 const k=key(p);if(!refresh&&available(p))return Promise.resolve(available(p));if(pending.has(k))return pending.get(k).promise;
 const who=scope,db=client,epoch=generation,controller=new AbortController(),task={controller,keep:persist};
 const current=()=>scope===who&&identity()===who&&client===db&&ojmDb===db&&generation===epoch;
 const check=()=>{if(!current())throw Error('The account or journal changed while loading this report.');if(controller.signal.aborted)throw cancelled()};
 let previous=cache.get(k);const accounts=JSON.stringify(AccountingStore.accounts);
 const download=async()=>{let rows=[],opening=[],revision;
  for(let offset=0;;offset+=500){check();let request=db.rpc('journal_window14333',{p_from:p.from,p_to:p.to,p_offset:offset});if(request.abortSignal)request=request.abortSignal(controller.signal);const response=await request;check();if(response.error)throw response.error;
   const data=response.data;if(!Array.isArray(data?.rows)||offset===0&&!Array.isArray(data.opening))throw Error('The selected period is incomplete.');
   if(!offset){opening=data.opening;if(opening.some(b=>!b.accountId||!b.currency||!Number.isFinite(Number(b.balance))||b.base_balance!=null&&!Number.isFinite(Number(b.base_balance))))throw Error('The opening balances are incomplete.');revision=data.revision;
    if(revision&&previous?.revision===revision&&previous.accounts===accounts&&Array.isArray(previous.rows))return previous;
   }else if(revision!==data.revision)throw Error('The journal changed during download. Refresh this report.');
   if(data.rows.some(l=>!l.id||!l.date||l.date<p.from||l.date>p.to||!Number.isFinite(Number(l.debit))||!Number.isFinite(Number(l.credit))))throw Error('The selected period contains an invalid record.');
   rows.push(...data.rows);if(persist)window.idleSync14341?.progress('Preparing reports · '+rows.length.toLocaleString()+' journal lines downloaded…');if(data.rows.length<500)break;
  }
  return {...p,rows,opening,revision,accounts};
 };
 task.promise=Promise.resolve().then(()=>persist&&window.offline14239?.snapshot?offline14239.snapshot('report-journal-complete143267',download,{cacheFirst,prepareCached:value=>{previous=value}}):download()).then(result=>{check();if(!Array.isArray(result?.rows)||!Array.isArray(result?.opening)||result.from!==p.from||result.to!==p.to)throw Error('The downloaded report copy is incomplete.');cache.set(k,result);failures.delete(k);return result}).catch(error=>{if(current()&&!controller.signal.aborted&&error.name!=='AbortError')failures.set(k,error.message||String(error));throw error}).finally(()=>{if(pending.get(k)===task)pending.delete(k)});
 pending.set(k,task);return task.promise;
}
async function preload(force=false){restoreFilters();if(!client?.rpc)throw Error('Connect to the company journal to load reports.');await read(allPeriod,{refresh:force,persist:true,cacheFirst:!force});normalizeAll();save()}
async function ensure(){restoreFilters();if(!client?.rpc)throw Error('Connect to the company journal to load this period.');await Promise.all(periods().map(p=>read(p)));normalizeAll();save()}
function snapshot(from,to){if(Reports79.allMonths14331)return cache.get(allKey)||null;
 if(Reports79.selectedMonths14331?.length>1&&from===Reports79.selectedMonths14331[0]+'-01'&&to===summaryPeriod14331.end(Reports79.selectedMonths14331.at(-1)))from=Reports79.selectedMonths14331.at(-1)+'-01';
 return available(range(from,to))||null;
}
function addOpening(rows,snapshot){for(const b of snapshot.opening){let row=rows.find(r=>String(r.account.id)===String(b.accountId)&&r.currency===b.currency);if(!row){const account=AccountingStore.accounts.find(a=>String(a.id)===String(b.accountId))||{id:b.accountId,name:'Unmapped',code:'Unmapped',type:'Unmapped',currency:b.currency};row={account,key:accountKey69(account,b.currency),currency:b.currency,opening:0,debit:0,credit:0,closing:0,baseOpening:0,baseDebit:0,baseCredit:0,baseClosing:0,missingRates:0,lines:[]};rows.push(row)}const amount=cents69(b.balance);row.opening+=amount;row.closing+=amount;if(b.currency!=='LAK'&&b.base_balance==null)row.missingRates++;else{const base=cents69(b.currency==='LAK'?b.balance:b.base_balance);row.baseOpening+=base;row.baseClosing+=base}}return rows}
function signature(){return JSON.stringify([scope,generation,Reports79,window.reportSort143153?.(Reports79.kind),AccountingStore.accounts,CurrencyStore.currencies,...periods().map(p=>available(p)?.revision)])}
function reuse(host){restoreFilters();normalizeAll();save();return complete()&&renderedViews.get(host)===signature()}
function rendered(host){host.removeAttribute('aria-busy');renderedViews.set(host,signature());window.workspaceViews14364?.remember?.(active())}
function prioritize(){const view=active(),wanted=new Set(periods().map(key));if(foreground&&(foreground.view!==view||foreground.selection!==[...wanted].join(',')))cancelForeground();for(const [k,task]of pending)if(!task.keep&&(!view.startsWith('report-')||!wanted.has(k))){task.controller.abort();pending.delete(k)}}
function prepare(host){restoreFilters();normalizeAll();save();prioritize();if(complete()){host.removeAttribute('aria-busy');return true}
 const list=periods(),error=list.map(p=>failures.get(key(p))).find(Boolean),selection=list.map(key).join(','),view=active();
 host.setAttribute('aria-busy',String(!error));host.innerHTML='<div class="r79-header"><h3>'+escapeHtml(reportNames79[Reports79.kind])+'</h3><button class="je-btn je-btn-secondary" onclick="reportWindow143195.refresh()">Retry / Refresh</button></div><div class="r79-filters">'+(window.periodFilters14331?.markup()||'')+'</div><p role="status">'+escapeHtml(error||'Preparing the selected report…')+'</p>';
 if(!error&&!(foreground?.view===view&&foreground?.selection===selection)){
  cancelForeground();const token=sequence,who=scope,db=client,end=window.actionFeedback14296?.begin(host,'Processing report…');foreground={view,selection,end};
  const current=()=>token===sequence&&identity()===who&&client===db&&active()===view&&periods().map(key).join(',')===selection;
  void ensure().then(()=>{if(current())renderReports79()}).catch(e=>{if(current()&&e.name!=='AbortError')renderReports79()}).finally(()=>{end?.();if(token===sequence)foreground=null});
 }return false;
}
async function refresh(){restoreFilters();reset();const view=active(),who=scope;renderReports79();try{await ensure()}catch(e){if(identity()===who&&active()===view&&e.name!=='AbortError')showCenterStatus(e.message,true)}}
async function source(encoded){restoreFilters();const who=scope,db=client,id=decodeURIComponent(encoded),line=[...cache.values()].flatMap(p=>p.rows).find(l=>l.id===id);if(!line?.dbEntryId)return showCenterStatus('Refresh the selected period before opening this entry.',true);
 try{const response=await db.from('journal_entries').select('id,entry_no,transaction_date,memo,status,journal_lines(line_no,line_date,description,currency_code,debit,credit,accounts(id,name,code))').eq('id',line.dbEntryId).eq('status','posted').maybeSingle();if(identity()!==who||ojmDb!==db)return;if(response.error)throw response.error;if(!response.data)throw Error('This entry is no longer posted. Refresh the report.');const e=response.data,lines=(e.journal_lines||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>({id:e.entry_no,dbEntryId:e.id,date:l.line_date||e.transaction_date,account:l.accounts?.name||'Unknown Account',currency:l.currency_code,memo:l.description||e.memo||'',generalMemo:e.memo,debit:Number(l.debit),credit:Number(l.credit),archived:(PeriodReview.periods[e.transaction_date.slice(0,7)]?.status||'open')!=='open'}));showJournalSource69(encoded,lines)}catch(e){if(identity()===who)showCenterStatus(e.message,true)}}
window.reportWindow143195={restoreFilters,ensure,preload,snapshot,addOpening,prepare,reuse,rendered,refresh,reset,source,prioritize,revision:()=>generation+':'+(cache.get(allKey)?.revision||''),calculating:false};
window.addEventListener('page113',prioritize);
})();
