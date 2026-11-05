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
const coverage=new WeakMap();
function normalizeAll(){
 if(!Reports79.allMonths14331)return;
 const snapshot=cache.get(allKey);if(!snapshot?.rows.length)return;
 if(!coverage.has(snapshot)){
  let from=snapshot.rows[0].date,to=from;
  for(const row of snapshot.rows){if(row.date<from)from=row.date;if(row.date>to)to=row.date}
  coverage.set(snapshot,{from,to});
 }
 Object.assign(Reports79,coverage.get(snapshot));
}
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
function signature(){
 const s=Reports79,kind=s.kind,settings=typeof ApplicationSettings==='undefined'?{}:ApplicationSettings;
 const selection=['gl','activity'].includes(kind)?[s.account,s.query]:kind==='cf'?s.cash:kind==='payroll'?s.payroll:null;
 return JSON.stringify([scope,generation,kind,s.mode,s.month,s.year,s.quarter,s.from,s.to,s.allMonths14331,s.selectedMonths14331,s.basis,s.currency,
  selection,window.reportSort143153?.(kind),settings.system?.dateFormat,settings.system?.numberFormat,settings.accounting?.decimalPlaces,
  AccountingStore.accounts,CurrencyStore.currencies,...periods().map(p=>available(p)?.revision)]);
}
function reuse(host){restoreFilters();normalizeAll();return complete()&&renderedViews.get(host)===signature()}
function rendered(host){host.removeAttribute('aria-busy');renderedViews.set(host,signature());window.workspaceViews14364?.remember?.(active())}
function prioritize(){const view=active(),wanted=new Set(periods().map(key));if(foreground&&(foreground.view!==view||foreground.selection!==[...wanted].join(',')))cancelForeground();for(const [k,task]of pending)if(!task.keep&&(!view.startsWith('report-')||!wanted.has(k))){task.controller.abort();pending.delete(k)}}
function prepare(host){restoreFilters();normalizeAll();save();prioritize();if(complete()){host.removeAttribute('aria-busy');return true}
 const list=periods(),error=list.map(p=>failures.get(key(p))).find(Boolean),selection=list.map(key).join(','),view=active();
 renderedViews.delete(host);host.setAttribute('aria-busy',String(!error));host.innerHTML='<div class="r79-header"><h3>'+escapeHtml(reportNames79[Reports79.kind])+'</h3><button class="je-btn je-btn-secondary" aria-haspopup="dialog" onclick="toggleReportFilters143153(this)">Filter</button><button class="je-btn je-btn-secondary" onclick="reportWindow143195.refresh()">Retry / Refresh</button></div><p role="status">'+escapeHtml(error||'Preparing the selected report…')+'</p>';
 if(!error&&!(foreground?.view===view&&foreground?.selection===selection)){
  cancelForeground();const token=sequence,who=scope,db=client,end=window.actionFeedback14296?.begin(host,'Processing report…');foreground={view,selection,end};
  const current=()=>token===sequence&&identity()===who&&client===db&&active()===view&&periods().map(key).join(',')===selection;
  void ensure().then(()=>{if(current())renderReports79()}).catch(e=>{if(current()&&e.name!=='AbortError')renderReports79()}).finally(()=>{end?.();if(token===sequence)foreground=null});
 }return false;
}
async function refresh(){restoreFilters();reset();const view=active(),who=scope;renderReports79();try{await ensure()}catch(e){if(identity()===who&&active()===view&&e.name!=='AbortError')showCenterStatus(e.message,true)}}
async function source(encoded){restoreFilters();const who=scope,db=client,id=decodeURIComponent(encoded),line=[...cache.values()].flatMap(p=>p.rows).find(l=>l.id===id);if(!line?.dbEntryId)return showCenterStatus('Refresh the selected period before opening this entry.',true);
 try{const response=await db.from('journal_entries').select('id,entry_no,transaction_date,memo,updated_at,status,journal_fx_evidence288(entry_updated_at,display_memo,line_kinds),journal_lines(line_no,line_date,description,currency_code,debit,credit,fx_rate_lak,book_rate_lak,accounts(id,name,code))').eq('id',line.dbEntryId).eq('status','posted').maybeSingle();if(identity()!==who||ojmDb!==db)return;if(response.error)throw response.error;if(!response.data)throw Error('This entry is no longer posted. Refresh the report.');const e=response.data,review=e.journal_fx_evidence288,valid=review&&review.entry_updated_at===e.updated_at,lines=(e.journal_lines||[]).sort((a,b)=>a.line_no-b.line_no).map(l=>({id:e.entry_no,dbEntryId:e.id,date:l.line_date||e.transaction_date,account:l.accounts?.name||'Unknown Account',currency:l.currency_code,memo:l.description||e.memo||'',generalMemo:e.memo,fxEvidenceMemo288:valid?review.display_memo:null,fxRateKind288:valid?review.line_kinds?.[l.line_no]:null,fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak,debit:Number(l.debit),credit:Number(l.credit),archived:(PeriodReview.periods[e.transaction_date.slice(0,7)]?.status||'open')!=='open'}));showJournalSource69(encoded,lines)}catch(e){if(identity()===who)showCenterStatus(e.message,true)}}
window.reportWindow143195={restoreFilters,ensure,preload,snapshot,addOpening,prepare,reuse,rendered,refresh,reset,source,prioritize,revision:()=>generation+':'+(cache.get(allKey)?.revision||''),calculating:false};
window.addEventListener('page113',prioritize);
})();
;
/* One popup for read-only report periods. Posting and payroll-run dates stay single-valued. */
(()=>{'use strict';const P=window.summaryPeriod14331;
function selection(s){if(s.selectedMonths14331?.length)return P.clean(s.selectedMonths14331);if(s.allMonths14331)return [];if(s.mode==='monthly')return [s.month];if(s.mode==='quarterly')return P.yearMonths(Number(s.year)).slice((Number(s.quarter)-1)*3,Number(s.quarter)*3);if(s.mode==='yearly')return P.yearMonths(Number(s.year));return []}
function caption(s){return s.allMonths14331?'All months':s.selectedMonths14331?.length?P.label(s.selectedMonths14331):s.mode==='custom'?formatAppDate(s.from)+' – '+formatAppDate(s.to):P.label(selection(s))}
function markup(){return '<label class="filter-period81 shared-period14331">Period<button type="button" class="oj-date-button104" aria-haspopup="dialog" aria-expanded="false" onclick="periodFilters14331.open(this)"><span aria-hidden="true">▦</span><span>'+escapeHtml(caption(Reports79))+'</span></button></label>'}
let selectionEpoch=0;
function setPeriod(s,values,meta){const list=P.clean(values);s.selectedMonths14331=null;s.allMonths14331=false;
 if(meta.mode==='custom'){s.mode='custom';s.from=meta.from;s.to=meta.to;}
 else if(!list.length){const dates=(JournalModule.entries||[]).filter(l=>(!l.status||l.status==='posted')&&!l.voided_at).map(l=>String(l.date||'').slice(0,10)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();s.mode='custom';s.allMonths14331=true;s.from=dates[0]||P.current()+'-01';s.to=dates.at(-1)||P.end(P.current());}
 else{s.month=list[0];s.year=Number(list[0].slice(0,4));s.quarter=Math.ceil(Number(list[0].slice(5,7))/3);s.from=list[0]+'-01';s.to=P.end(list.at(-1));s.mode=meta.mode==='quarterly'?'quarterly':meta.mode==='yearly'?'yearly':list.length===1?'monthly':'custom';if(meta.mode==='monthly'&&list.length>1)s.selectedMonths14331=list;}
}
async function apply(values,meta){const epoch=++selectionEpoch,owner=liveProfile?.id,current=()=>epoch===selectionEpoch&&liveProfile?.id===owner,s=Reports79,previous={...s};
 setPeriod(s,values,meta);
 if(window.reportWindow143195){reportWindow143195.prioritize();renderReports79();return;}
 const end=window.actionFeedback14296?.begin(document.activeElement,'Loading selected period…');try{await window.yearWindow14333?.ensure(s.allMonths14331?'1900-01-01':s.from,s.to);if(current())renderReports79()}catch(e){if(current()){Object.assign(s,previous);renderReports79();showCenterStatus('The requested period could not load: '+e.message,true)}}finally{end?.()}
}
function open(button){const s=Reports79;P.open(button,selection(s),apply,{mode:s.selectedMonths14331?.length?'monthly':s.allMonths14331?'monthly':s.mode,from:s.from,to:s.to,custom:true})}
window.periodFilters14331={selection,caption,markup,apply,open,setPeriod};
// Compare selected months as complete independent periods. Never add balance snapshots.
const model=window.reportModel79;window.reportModel79=function(kind,...args){
 const selected=Reports79.selectedMonths14331,old={...Reports79};if(kind==='bs')return model.call(this,kind,...args);
 let periods;
 if(selected?.length)periods=selected.map(month=>({mode:'monthly',month,year:Number(month.slice(0,4)),from:month+'-01',to:P.end(month),label:P.monthLabel(month),prefix:'Selected month: '}));
 else{
  const first=Number(String(old.from||'').slice(0,4)),last=Number(String(old.to||'').slice(0,4));
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1900||last>9999||first>=last)return model.call(this,kind,...args);
  // The ledger resets at each accounting year's saved opening. Keep each year
  // separate so earlier activity is included without summing carryforwards twice.
  periods=Array.from({length:last-first+1},(_,i)=>{const year=first+i;return {mode:'custom',year,from:year===first?old.from:year+'-01-01',to:year===last?old.to:year+'-12-31',label:String(year),prefix:'Accounting year: '}});
  const sort=window.reportSort143153?.(kind);if(['gl','activity'].includes(kind)&&sort?.by==='date'&&sort.direction==='desc')periods.reverse();
 }
 try{return periods.flatMap(({label,prefix,...period})=>{Object.assign(Reports79,period,{selectedMonths14331:null,allMonths14331:false});return model.call(this,kind,...args).map(g=>({...g,periodLabel:label,note:prefix+label+'. '+g.note}))})}finally{Object.assign(Reports79,old)}
};
})();
