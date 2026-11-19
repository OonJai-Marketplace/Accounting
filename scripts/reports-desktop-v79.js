/* Dated account book values for reports. Monetary fields are integer cents. */
const reportingAmounts = (() => {
 const fields=['opening','debit','credit','closing'];
 const amount=n=>n==null?'Review':money69(n);
 const add=(a,b)=>a==null||b==null?null:a+b;
 const subtract=(a,b)=>add(a,b==null?null:-b);
 const total=(rows,field)=>rows.reduce((n,r)=>add(n,r[field]),0);
 const label=a=>[a.code,a.name].filter(Boolean).join(' · ');
 const groupLabel=a=>a.currency==='LAK'?label(a).replace(/\s+[–—-]\s*LAK$/i,''):label(a);
 const type=a=>String(a.baseType||a.type||'').toUpperCase();
 function links(){
  const accounts=new Map(AccountingStore.accounts.map(a=>[a.id,a])),targets=new Map();
  for(const sub of AccountingStore.subAccounts||[]){
   if(!sub.postingAccountId14285||!sub.reportLakId)continue;
   const source=accounts.get(sub.postingAccountId14285),target=accounts.get(sub.reportLakId);
   if(!source)continue;
   const previous=targets.get(source.id);
   const valid=target&&target.currency==='LAK'&&type(source)===type(target)&&(!targets.has(source.id)||previous===target);
   targets.set(source.id,valid?target:null);
  }
  return targets;
 }
 function rateFor(row){
  if(row.currency!==row.account.currency)return {issue:'Conflicting account currency'};
  if(row.currency==='LAK')return {rate:1};
  if(row.reviewEntry)return {issue:'Posted rate needs review · '+row.reviewEntry};
  if(row.missingRates)return {issue:'Missing posted LAK valuation'};
  const quantity=row.closing,value=row.baseClosing;
  if(!quantity)return {issue:value?'LAK value remains at zero foreign balance':'No closing foreign balance',residual:!!value};
  if(quantity<0&&type(row.account)==='ASSET'&&!row.account.isTechnical&&(row.account.purpose||'regular')==='regular')return {issue:'Negative foreign asset balance'};
  if(value/quantity<=0)return {issue:'Conflicting quantity and LAK carrying value'};
  return {rate:value/quantity,quantity,value};
 }
 function convert(native,rate){
  if(!native)return 0;
  if(!rate.rate)return null;
  if(rate.rate===1)return native;
  // Round the exact quotient once. A displayed average can have fewer decimals.
  const num=BigInt(Math.abs(native))*BigInt(Math.abs(rate.value)),den=BigInt(Math.abs(rate.quantity));
  return Math.sign(native)*Number((2n*num+den)/(2n*den));
 }
 function evidence(line){
  if(line.currency==='LAK')return 'LAK';
  const code={actual:'ER',equivalent:'VR',valuation:'VR',reference:'VR',book:'BR'}[line.fxRateKind288]||'Recorded rate';
  const rates=[];
  if(Number(line.fx_rate_lak)>0)rates.push(code+' '+line.fx_rate_lak);
  if(Number(line.book_rate_lak)>0&&(code!=='BR'||Number(line.book_rate_lak)!==Number(line.fx_rate_lak)))rates.push('BR '+line.book_rate_lak);
  return rates.length?rates.join(' / ')+' LAK/'+line.currency:'No recorded rate';
 }
 function bookRows(from,to){
  const snap=window.reportWindow143195?.snapshot(from,to);
  const entries=snap?.rows||JournalModule.entries;
  return markReviewedRates(accountDataForPeriod69(entries,to.slice(0,4)+'-01-01',to,false),entries,to);
 }
 function markReviewedRates(rows,entries,to){
  const start=to.slice(0,4)+'-01-01',indexed=new Map(rows.map(r=>[r.key,r]));
  for(const line of entries){
   if(line.fxRateKind288!=='review'||line.date<start||line.date>to||line.voided_at||line.pendingSync||line.local14333||line.status&&line.status!=='posted')continue;
   const account=accountForLine69(line),row=account&&indexed.get(accountKey69(account,line.currency));
   if(row)row.reviewEntry=line.id;
  }
  return rows;
 }
 function parts(rows,rates,targets){
  const byKey=new Map(rates.map(row=>[row.key,rateFor(row)]));
  return rows.map(row=>{
   const invalid=targets.has(row.account.id)&&!targets.get(row.account.id);
   const target=targets.get(row.account.id)||row.account;
   const rate=invalid?{issue:'Conflicting reporting link'}:byKey.get(row.key)||{issue:'No closing foreign balance'};
   const values=Object.fromEntries(fields.map(f=>[f,convert(row[f],rate)]));
   if(rate.residual||rate.issue==='Missing posted LAK valuation'){
    if(!row.closing)values.closing=null;
   }
   return {row,target,rate,...values};
  });
 }
 function parentGroups(items,selected){
  const parents=ForeignFunds14386.parentIndex(),grouped=new Map();
  for(const part of items){
   for(const parent of parents(part.row.account)){
    if(selected&&!selected.has(accountKey69(parent)))continue;
    if(!grouped.has(parent.code))grouped.set(parent.code,{account:parent,parts:[]});
    grouped.get(parent.code).parts.push(part);
   }
  }
  return [...grouped.values()].map(g=>({...g,...Object.fromEntries(fields.map(f=>[f,total(g.parts,f)]))})).sort(compareReportAccounts143153);
 }
 function groups(parts){
  const grouped=new Map();
  for(const p of parts){
   const key=p.target.id||p.row.key;
   if(!grouped.has(key))grouped.set(key,{account:p.target,parts:[]});
   grouped.get(key).parts.push(p);
  }
  return [...grouped.values()].map(g=>({...g,...Object.fromEntries(fields.map(f=>[f,total(g.parts,f)]))})).sort(compareReportAccounts143153);
 }
 const visible=r=>r.opening||r.debit||r.credit||r.baseOpening||r.baseDebit||r.baseCredit||r.missingRates;
 function selected(row,kind,targets,ledgerKeys){
  if(Reports79.currency&&row.currency!==Reports79.currency)return false;
  if(!['tb','gl','activity'].includes(kind)&&row.account.isTechnical)return false;
  if(['pl','bs','expense'].includes(kind)){
   const types=kind==='expense'?['EXPENSE']:kind==='pl'?['REVENUE','EXPENSE']:['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'];
   if(!types.includes(type(row.account)))return false;
  }
  if(kind==='cf'||kind==='payroll')return Reports79[kind==='cf'?'cash':'payroll'].includes(row.key);
  if(!['gl','activity'].includes(kind)||!Reports79.account)return true;
  if(Reports79.account.startsWith('report:'))return 'report:'+(targets.get(row.account.id)||row.account).id===Reports79.account;
  return ledgerKeys.has(row.key);
 }
 function model(kind){
  const {from,to}=Reports79,targets=links(),crossYear=kind==='tb'&&from.slice(0,4)!==to.slice(0,4);
  const source=crossYear?trialRangeRows79(from,to):reportAccountRows79(from,to);
  const ledgerKeys=new Set((window.ForeignFunds14386?ForeignFunds14386.select(source,Reports79.account):source.filter(r=>r.key===Reports79.account)).map(r=>r.key));
  const items=parts(source.filter(row=>visible(row)&&selected(row,kind,targets,ledgerKeys)),bookRows(from,to),targets);
  const grouped=groups(items),performance=['pl','expense'].includes(kind);
  const side=(acct,n)=>n==null?null:(kind==='bs'&&type(acct)!=='ASSET'||performance&&type(acct)==='REVENUE'?-n:n);
  const net=(acct,r)=>side(acct,performance?subtract(r.debit,r.credit):r.closing);
  const balanceAccounts=grouped.filter(g=>!['REVENUE','EXPENSE'].includes(type(g.account)));
  const earnings=grouped.filter(g=>['REVENUE','EXPENSE'].includes(type(g.account)));
  const currency='Reporting Amount · LAK',metrics=[];
  const displayRows=kind==='bs'?balanceAccounts:grouped;
  const yearOpening=crossYear&&displayRows.some(g=>fields.every(f=>g[f]!=null)&&g.closing!==g.opening+g.debit-g.credit);
  const adjustment=g=>subtract(subtract(g.closing,g.opening),subtract(g.debit,g.credit));
  const summary=displayRows.map(g=>[groupLabel(g.account),type(g.account),...(kind==='bs'?[]:performance?[amount(g.debit),amount(g.credit)]:[amount(g.opening),amount(g.debit),amount(g.credit)]),...(yearOpening?[amount(adjustment(g))]:[]),amount(net(g.account,g))]);
  const metric=(title,n)=>{if(n!=null)metrics.push([title,n]);else withheld.push(title)};
  const withheld=[];
  if(kind==='bs'){
   const assets=total(grouped.filter(g=>type(g.account)==='ASSET'),'closing');
   const other=subtract(0,total(grouped.filter(g=>type(g.account)!=='ASSET'),'closing'));
   summary.push(['Unclosed accumulated result','EQUITY',amount(subtract(0,total(earnings,'closing')))]);
   metric('Assets',assets);metric('Liabilities + equity + result',other);metric('Difference',subtract(assets,other));
  }else if(performance){
   const income=grouped.filter(g=>type(g.account)==='REVENUE'),expense=grouped.filter(g=>type(g.account)==='EXPENSE');
   const rev=subtract(total(income,'credit'),total(income,'debit')),cost=subtract(total(expense,'debit'),total(expense,'credit'));
   if(kind==='pl')metric('Revenue',rev);metric('Expenses',cost);if(kind==='pl')metric('Net profit / (loss)',subtract(rev,cost));
  }else if(kind==='tb'){
   const closing=grouped.map(g=>g.closing);
   metric('Closing debit',closing.includes(null)?null:closing.reduce((n,v)=>n+Math.max(0,v),0));
   metric('Closing credit',closing.includes(null)?null:closing.reduce((n,v)=>n+Math.max(0,-v),0));
   metric('Difference',total(grouped,'closing'));
  }else for(const f of fields)metric(f[0].toUpperCase()+f.slice(1),total(grouped,f));
  const note='Average book rates as of '+formatAppDate(to)+'. Each source account uses its posted year-to-date LAK carrying value divided by its original balance. '+(withheld.length?'Totals requiring review: '+withheld.join(', ')+'. ':'')+'Review affected amounts in the currency contributions below.';
  const result=[{currency,rowAccounts:kind==='tb'?displayRows.map(g=>g.account):undefined,headers:['Reporting account','Classification',...(kind==='bs'?[]:performance?['Period debit','Period credit']:['Opening balance','Period debit','Period credit']),...(yearOpening?['Year-opening change']:[]),performance?'Net amount':'Closing balance'],values:summary,metrics,note}];
  result.push({currency:'Currency contributions · LAK',headers:['Reporting account','Source account','Currency','Original '+(performance?'net':'balance'),'Average book rate','Rate date','LAK contribution'],values:grouped.flatMap(g=>g.parts.map(p=>[groupLabel(g.account),label(p.row.account),p.row.currency,amount(net(p.row.account,p.row)),p.rate.rate?p.rate.rate.toLocaleString(appNumberLocale(),{maximumFractionDigits:10})+' LAK/'+p.row.currency:p.rate.issue,to,amount(net(p.row.account,p))])),metrics:[],note:'These rows explain the reporting-account totals above. Each source is counted once.'});
  if(kind==='gl'||kind==='activity')result.push(ledger(items,to));
  const parents=parentGroups(items).filter(g=>kind!=='bs'||!['REVENUE','EXPENSE'].includes(type(g.account)));
  if(parents.length)result.push({currency:'Parent subtotals · LAK',headers:['Parent account','Opening balance','Period debit','Period credit','Closing balance'],values:parents.map(g=>[label(g.account),...fields.map(f=>amount(g[f]))]),metrics:[],note:'Each parent includes all selected posting accounts below it. Grand totals count each posting account once.'});
  return result;
 }
 function ledger(items,to){
  const lines=[],query=Reports79.query.trim().toLowerCase();
  for(const p of items){
   let native=p.row.opening;
   for(const l of p.row.lines){
    native+=l.dr-l.cr;
    const accountName=label(p.row.account),accountCode=p.row.account.code,memo=journalMemoValue143187(l);
    if(query&&![l.date,l.id,accountName,memo].join(' ').toLowerCase().includes(query))continue;
    lines.push({...l,accountName,accountCode,values:[l.date,l.id,accountName,memo,p.row.currency,amount(l.dr),amount(l.cr),evidence(l),amount(convert(l.dr,p.rate)),amount(convert(l.cr,p.rate)),amount(convert(native,p.rate))]});
   }
  }
  lines.sort((a,b)=>compareReportLines143153(a,b,Reports79.kind));
  return {currency:'Journal detail · original and reporting amounts',headers:['Date','Entry ID','Source account','Description / Reference','Currency','Original debit','Original credit','Posted rate evidence','LAK debit','LAK credit','Running LAK'],values:lines.map(l=>l.values),metrics:[],note:'Reporting amounts use the account average on '+formatAppDate(to)+'. The entry ID opens the posted journal. Line amounts and account totals are rounded independently to two decimal places.'};
 }
 function open(labelText,group){
  const acct=AccountingStore.accounts.find(a=>(group?groupLabel(a):label(a))===labelText);
  if(!acct)return;
  reportBooks.carryToActivity();Reports79.account=group?'report:'+acct.id:accountKey69(acct);Reports79.query='';switchTab('report-activity');
 }
 function comparison(entries,months,options){
  const groupedRows=new Map(),contributions=new Map(),parentRows=new Map(),monthlyTotals=[],parents=ForeignFunds14386.parentIndex();
  const choices=options.accounts&&new Set(options.accounts),targets=links();
  const subheads=options.columns==='balance'?['Balance']:['Debit','Credit','Balance'];
  const blank=()=>Array(subheads.length).fill('—');
  const cells=r=>(options.columns==='balance'?[r.closing]:[r.debit,r.credit,r.closing]).map(amount);
  const ends=months.map((m,i)=>i===months.length-1&&options.to?options.to:summaryPeriod14331.end(m));
  months.forEach((month,i)=>{
   const start=i===0&&options.from?options.from:month+'-01',end=ends[i];
   const rows=accountDataForPeriod69(entries,start,end,false).filter(row=>(!options.currency||options.currency===row.currency)&&(!choices||choices.has(row.key)||parents(row.account).some(p=>choices.has(accountKey69(p)))));
   const selectedParts=parts(rows.filter(visible),markReviewedRates(rows,entries,end),targets),grouped=groups(selectedParts);
   for(const g of parentGroups(selectedParts,choices)){
    if(!parentRows.has(g.account.code))parentRows.set(g.account.code,{account:g.account,months:[]});
    parentRows.get(g.account.code).months[i]=cells(g);
   }
   for(const g of grouped){
    const key=g.account.id||g.account.code;
    if(!groupedRows.has(key))groupedRows.set(key,{account:g.account,months:[]});
    groupedRows.get(key).months[i]=cells(g);
    for(const p of g.parts){
     if(!contributions.has(p.row.key))contributions.set(p.row.key,{account:p.row.account,target:g.account,months:[]});
     const rate=p.rate.rate?p.rate.rate.toLocaleString(appNumberLocale(),{maximumFractionDigits:10})+' LAK/'+p.row.currency:p.rate.issue;
     const values=cells(p);values[values.length-1]+=' · '+amount(p.row.closing)+' '+p.row.currency+' · '+rate;
     contributions.get(p.row.key).months[i]=values;
    }
   }
   monthlyTotals.push(cells(Object.fromEntries(fields.map(f=>[f,total(grouped,f)]))));
  });
  const order=(a,b)=>(options.direction==='desc'?-1:1)*String(a.account.code).localeCompare(String(b.account.code),undefined,{numeric:true});
  const cellsByMonth=r=>months.flatMap((_,i)=>r.months[i]||blank());
  const values=[...groupedRows.values()].sort(order).map(r=>[groupLabel(r.account),...cellsByMonth(r)]);
  const parentValues=[...parentRows.values()].sort(order).map(r=>[label(r.account)+' · Subtotal · LAK',...cellsByMonth(r)]);
  const detail=[...contributions.values()].sort(order).map(r=>[groupLabel(r.target)+' / '+label(r.account),...cellsByMonth(r)]);
  return {monthlyTrial:true,months,subheads,rowCurrencies:Array(values.length+parentValues.length+detail.length).fill('LAK'),rowAccounts:[...[...groupedRows.values()].sort(order),...[...parentRows.values()].sort(order),...[...contributions.values()].sort(order)].map(r=>r.account),headers:['Accounts',...ends.flatMap(end=>subheads.map(h=>end+' '+h))],values:[...values,...parentValues,...detail,[options.accounts?'Selected total · LAK':'Total · LAK',...monthlyTotals.flat()]],totalCount:1,currency:'Reporting Amount · LAK',metrics:[],rateDates:ends,note:'Each column uses the book rate at its closing date. Currency contributions are included in the reporting-account totals.'};
 }
 return {model,comparison,links,evidence,open};
})();
;
/* Desktop reports: derived from posted journal lines; no duplicate ledger or mobile changes. */
const Reports79={kind:'pl',trialView:'standard',mode:'monthly',month:Accounts69.month,year:Accounts69.year,quarter:Accounts69.quarter,from:Accounts69.from,to:Accounts69.to,currency:'',basis:'LAK',account:'',query:'',notes:{},cash:[],payroll:[]};
const reportNames79={pl:'Profit and Loss',bs:'Balance Sheet',cf:'Cash Flow',tb:'Trial Balance',gl:'General Ledger',activity:'Account Activity',expense:'Expense',payroll:'Payroll'};
const re79=v=>escapeHtml(String(v??''));
// A monthly comparison displays the individual months of one quarter or one year.
function trialComparisonPeriod(s){
 const anchor=/^\d{4}-\d{2}/.test(s.from||'')?s.from.slice(0,7):summaryPeriod14331.current();
 const year=Number(anchor.slice(0,4)),q=Math.floor((Number(anchor.slice(5))-1)/3);
 const all=summaryPeriod14331.yearMonths(year),annual=s.from===all[0]+'-01'&&s.to===summaryPeriod14331.end(all[11]);
 const list=annual?all:all.slice(q*3,q*3+3);
 if(s.mode===(annual?'yearly':'quarterly')&&s.from===list[0]+'-01'&&s.to===summaryPeriod14331.end(list.at(-1))&&!s.allMonths14331&&!s.selectedMonths14331?.length)return;
 periodFilters14331.setPeriod(s,list,{mode:annual?'yearly':'quarterly'});
}
const reportBooks=(()=>{
 const monthOf=value=>String(value||'').slice(0,7);
 const closed=value=>['closed','locked'].includes(PeriodReview.periods[monthOf(value)]?.status);
 const closedMonths=()=>Object.keys(PeriodReview.periods).filter(closed).sort();
 function workingMonth(){
  const today=appLocalDate().slice(0,7);
  return Object.keys(PeriodReview.periods).filter(m=>m<=today&&PeriodReview.periods[m].status==='open').sort()[0]||(!closed(today)?today:'');
 }
 function closedRange(from,to){
  const first=monthOf(from),last=monthOf(to);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(first)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(last)||first>last)return false;
  const ordinal=m=>Number(m.slice(0,4))*12+Number(m.slice(5));
  return closedMonths().filter(m=>m>=first&&m<=last).length===ordinal(last)-ordinal(first)+1;
 }
 function scope(){
  const id=document.querySelector('.tab-content.active')?.id||'';
  if(Reports79.trialView==='comparative'&&['report-tb','report-open-tb'].includes(id))return 'comparison';
  return id.startsWith('report-open-')?'live':id==='report-activity'?'activity':id.startsWith('report-')?'history':'';
 }
 const keys=['mode','month','quarter','year','from','to','selectedMonths14331','allMonths14331'];
 const periods=new Map();let previous='';
 const filters=new Map();
 function reset(){periods.clear();filters.clear();previous=''}
 function carryToActivity(){periods.set('activity',Object.fromEntries(keys.map(k=>[k,Reports79[k]])))}
 function selected(id){
  const month=filters.get(id);if(closed(month))return month;
  const months=closedMonths();
  return months.length&&!closedRange(months[0],months.at(-1))?months.at(-1):'';
 }
 function includes(id,from,to=from){
  const m=selected(id);
  return closedRange(from,to)&&(!m||(monthOf(from)<=m&&monthOf(to)>=m));
 }
 function monthOptions(value,all=true){
  const months=closedMonths();
  return (all&&months.length&&closedRange(months[0],months.at(-1))?'<option value="">All closed months</option>':'')+months.reverse().map(m=>'<option value="'+m+'" '+(value===m?'selected':'')+'>'+summaryPeriod14331.monthLabel(m)+'</option>').join('');
 }
 function filterButton(){return '<button type="button" class="je-btn je-btn-secondary" data-book-filter aria-haspopup="dialog">Filter</button>'}
 function bind(id,title,render){
  const button=document.querySelector('#'+id+' [data-book-filter]');if(!button)return;
  button.onclick=()=>{
   const dialog=openReportDialog299(button,title+' filters','<label>Period<select name="book" data-plain14285>'+monthOptions(selected(id))+'</select></label>',()=>{
    filters.set(id,dialog.querySelector('[name=book]').value);render();
   });
  };
 }
 function sync(){
  const next=scope(),s=Reports79;
  if(!next)return true;
  if(previous!==next){
   if(previous)periods.set(previous,Object.fromEntries(keys.map(k=>[k,s[k]])));
   if(periods.has(next))Object.assign(s,periods.get(next));
   previous=next;
  }
  if(next==='comparison'){trialComparisonPeriod(s);return true}
  if(next==='activity')return true;
  if(next==='history'&&!s.allMonths14331&&closedRange(s.from,s.to))return true;
  const month=next==='live'?workingMonth():closedMonths().at(-1);
  if(!month)return false;
  periodFilters14331.setPeriod(s,[month],{mode:'monthly'});return true;
 }
 function applyFilters(next){
  const oldScope=scope(),before=Object.fromEntries(keys.map(k=>[k,Reports79[k]]));
  Object.assign(Reports79,next);
  if(scope()!==oldScope){
   if(next.trialView==='standard'&&periods.has(scope())&&keys.every(k=>before[k]===Reports79[k]))Object.assign(Reports79,periods.get(scope()));
   periods.set(oldScope,before);previous=scope();
  }
 }
 let warming=false;
 function prepareOtherTrial(render){
  if(warming||!window.workspaceViews14364?.preparing||!window.reportWindow143195?.cachedLedger())return;
  const previousScope=previous,s={...Reports79},remembered=new Map(periods);
  warming=true;
  try{
   const other=s.trialView==='comparative'?'standard':'comparative';
   applyFilters({trialView:other});
   render();
  }finally{
   Object.assign(Reports79,s);periods.clear();for(const [key,value] of remembered)periods.set(key,value);previous=previousScope;
   try{render()}finally{warming=false}
  }
 }
 return {comparisonPeriod:()=>periods.get('comparison'),prepareOtherTrial,get warming(){return warming},applyFilters,closed,closedMonths,closedRange,workingMonth,scope,sync,reset,includes,selected,monthOptions,filterButton,bind,carryToActivity};
})();
function reportRange79(){const r=Reports79;if(r.mode==='custom')return;let y=+r.year,m=1,n=12;if(r.mode==='monthly'){[y,m]=r.month.split('-').map(Number);n=1}if(r.mode==='quarterly'){m=(+r.quarter-1)*3+1;n=3}r.from=date71(y,m,1);const end=new Date(y,m-1+n,0);r.to=date71(end.getFullYear(),end.getMonth()+1,end.getDate())}
let reportRenderCache14336=null;
// Accounting years have independent saved openings. Combine movement across years
// while retaining the first opening and the last book's recorded closing.
function accountingYears79(from,to){
 const first=Number(from.slice(0,4)),last=Number(to.slice(0,4)),periods=[];
 for(let year=first;year<=last;year++){
  periods.push({from:year===first?from:year+'-01-01',to:year===last?to:year+'-12-31'});
 }
 return periods;
}
function comparisonMonths79(kind,s){
 if(!s.selectedMonths14331?.length)return null;
 const months=summaryPeriod14331.requireRange(s.selectedMonths14331);
 return kind==='tb'?null:months;
}
function trialPeriodLabel79(s){return formatAppDate(s.from)+' – '+formatAppDate(s.to)}
function reportAccountRows79(from,to){
 const historical=reportBooks.scope()==='history',old={...Accounts69},originalEntries=JournalModule.entries;
 const snapshot=window.reportWindow143195?.snapshot(from,to);
 try{
  if(snapshot)reportWindow143195.calculating=true;
  JournalModule.entries=(snapshot?.rows||originalEntries).filter(r=>!r.pendingSync&&!r.local14333&&(!r.status||r.status==='posted')&&(!historical||reportBooks.closed(r.date)));
  if(['pl','expense'].includes(Reports79.kind))JournalModule.entries=JournalModule.entries.filter(r=>!String(r.generalMemo||'').startsWith('Year-end closing '));
  Object.assign(Accounts69,{from,to});
  const rows=accountData69(to,Reports79.kind!=='tb');
  return snapshot?reportWindow143195.addOpening(rows,snapshot):rows;
 }finally{
  Object.assign(Accounts69,old);JournalModule.entries=originalEntries;
  if(snapshot)reportWindow143195.calculating=false;
 }
}
function trialRangeRows79(from,to){
 const years=accountingYears79(from,to),combined=new Map();
 for(const [index,period] of years.entries()){
  for(const row of reportAccountRows79(period.from,period.to)){
   let total=combined.get(row.key);
   if(!total){
    total={...row,opening:index===0?row.opening:0,baseOpening:index===0?row.baseOpening:0,closing:0,baseClosing:0,debit:0,credit:0,baseDebit:0,baseCredit:0,missingRates:0};
    combined.set(row.key,total);
   }
   for(const key of ['debit','credit','baseDebit','baseCredit','missingRates'])total[key]+=row[key];
   if(index===years.length-1){total.closing=row.closing;total.baseClosing=row.baseClosing}
  }
 }
 return [...combined.values()];
}
function reportData79(){
 const {kind,from,to,currency,account,basis}=Reports79;
 const cacheKey=JSON.stringify([kind,from,to,currency,account,basis]);if(reportRenderCache14336?.has(cacheKey))return reportRenderCache14336.get(cacheKey);
 const accountRows=kind==='tb'&&from.slice(0,4)!==to.slice(0,4)?trialRangeRows79(from,to):reportAccountRows79(from,to);
 let rows=accountRows.filter(r=>(['tb','gl','activity'].includes(kind)||!r.account.isTechnical)&&(!currency||r.currency===currency));
 if(basis==='LAK')rows=rows.map(r=>({...r,sourceCurrency:r.currency,original:{opening:r.opening,debit:r.debit,credit:r.credit,closing:r.closing},currency:'LAK',opening:r.baseOpening,debit:r.baseDebit,credit:r.baseCredit,closing:r.baseClosing,lines:r.lines.map(l=>({...l,originalDebit:l.dr,originalCredit:l.cr,originalCurrency:l.currency,dr:cents69(window.JournalFX14383?.base(l,'debit')),cr:cents69(window.JournalFX14383?.base(l,'credit'))}))}));
 reportRenderCache14336?.set(cacheKey,rows);return rows;
}
function reportSet79(k,v){const old={...Reports79};Reports79[k]=v;try{reportRange79()}catch{Object.assign(Reports79,old);showCenterStatus('Choose a valid reporting period.',true);renderReports79();return}if(!Reports79.from||!Reports79.to||Reports79.from>Reports79.to||!/^\d{4}-\d{2}-\d{2}$/.test(Reports79.from)||(+Reports79.year<1900||+Reports79.year>9999)){Object.assign(Reports79,old);showCenterStatus('Choose a valid reporting period.',true)}renderReports79()}
const reportSorts143153=new Map();
function reportSort143153(kind=Reports79.kind){return reportSorts143153.get(kind)||{by:['gl','activity'].includes(kind)?'date':'account',direction:['gl','activity'].includes(kind)?'desc':'asc'}}
function openReportDialog299(button,title,body,onOK){
 const dialog=document.createElement('dialog'),page=button.closest('.tab-content');
 const actor=typeof liveProfile==='undefined'?null:liveProfile?.id,workspace=window.workspaceRequest138?.target,db=typeof ojmDb==='undefined'?null:ojmDb;
 dialog.className='report-dialog299 no-print';
 dialog.setAttribute('aria-label',title);
 dialog.innerHTML='<form><header><h3>'+re79(title)+'</h3></header><div class="report-fields299">'+body+'</div><footer><button type="button" class="je-btn je-btn-secondary" data-cancel>Cancel</button><button type="submit" class="je-btn je-btn-emerald">OK</button></footer></form>';
 const current=()=>page?.classList.contains('active')&&actor===(typeof liveProfile==='undefined'?null:liveProfile?.id)&&workspace===window.workspaceRequest138?.target&&db===(typeof ojmDb==='undefined'?null:ojmDb);
 const check=()=>{if(!current())dialog.close()};
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();dialog.close();if(current())onOK()};
 dialog.addEventListener('close',()=>{window.removeEventListener('page113',check);window.summaryPeriod14331?.close();dialog.remove();if(current()&&button.isConnected)button.focus({preventScroll:true})},{once:true});
 document.body.append(dialog);dialog.showModal();window.addEventListener('page113',check);
 return dialog;
}
function toggleReportFilters143153(button){
 const s=Reports79,kind=s.kind,ledger=['gl','activity'].includes(kind),sort={...reportSort143153(kind)};
 const period={};for(const key of ['mode','month','year','quarter','from','to','selectedMonths14331','allMonths14331'])period[key]=s[key];
 const listKey=kind==='cf'?'cash':'payroll',chosen=new Set(s[listKey]);
 const accounts=new Map((AccountingStore.accounts||[]).map(a=>[accountKey69(a),{key:accountKey69(a),account:a,currency:a.currency}]));
 for(const row of reportFilterAccounts299.get(button.closest('.r79'))||[])accounts.set(row.key,row);
 const rows=[...accounts.values()].sort((a,b)=>String(a.account.code).localeCompare(String(b.account.code),undefined,{numeric:true}));
 const currencies=[...new Set([...(CurrencyStore.currencies||[]).map(c=>c.code),...rows.map(r=>r.currency)])].filter(Boolean);
 const options=(pairs,value)=>pairs.map(([v,n])=>`<option value="${re79(v)}" ${v===value?'selected':''}>${re79(n)}</option>`).join('');
 const field=(label,key,items,value)=>`<label>${label}<select ${key==='account'?'':'data-plain14285'} name="${key}">${options(items,value)}</select></label>`;
 const orders=by=>[['asc',by==='date'?'Oldest to newest':'Lowest to highest'],['desc',by==='date'?'Newest to oldest':'Highest to lowest']];
 const periodCaption=()=>kind==='tb'&&period.selectedMonths14331?.length?trialPeriodLabel79(period):periodFilters14331.caption(period);
 const periodControl='<label>Period<button type="button" class="oj-date-button104" data-period '+(reportBooks.scope()==='live'?'disabled':'aria-haspopup="dialog"')+'>'+re79(periodCaption())+'</button></label>';
 const accountField=ledger?field('Account','account',[],''):'';
 const checks=kind==='cf'?'<fieldset><legend>Cash and bank accounts</legend><details><summary data-cash-summary>Choose accounts</summary><div data-choices></div></details></fieldset>':kind==='payroll'?'<fieldset><legend>Payroll accounts</legend><div data-choices></div></fieldset>':'';
 const trial=kind==='tb',openBook=button.closest('.tab-content')?.id==='report-open-tb';
 const prefs=trial?monthlyTrialPreferences('report'):null;
 const trialFields=trial?field('Report type','trialView',[['standard','Standard Trial Balance'],['comparative','Monthly comparative']],s.trialView||'standard')+
  '<label class="trial-filter-options" data-trial-options>Columns'+monthlyTrialColumnControl(prefs.columns,true)+'</label>':'';
 const body=trialFields+periodControl+field('Report basis','basis',[['LAK','LAK equivalent · posted values'],['original','Original Amount · by currency'],['reporting','Reporting Amount · dated book rate']],s.basis)+field('Currency','currency',[['','All original currencies'],...currencies.map(c=>[c,c])],s.currency)+accountField+field('Sort by','by',[...(ledger?[['date','Date']]:[]),['account','Account code']],sort.by)+field('Order','direction',orders(sort.by),sort.direction)+checks;
 const dialog=openReportDialog299(button,reportNames79[kind]+' filters',body,()=>{
  const next={...period,basis:form.basis.value,currency:form.currency.value};
  if(ledger)next.account=form.account.value;
  if(checks)next[listKey]=[...chosen];
  if(trial){next.trialView=form.trialView.value;if(next.trialView==='comparative')saveMonthlyTrialPreferences({columns:form.trialColumns.value},'report')}
  reportBooks.applyFilters(next);reportSorts143153.set(kind,{by:form.by.value,direction:form.direction.value});renderReports79();
 });
 const form=dialog.querySelector('form').elements,periodButton=dialog.querySelector('[data-period]');
 const comparing=()=>trial&&form.trialView.value==='comparative';
 if(trial){
  const controls=dialog.querySelector('[data-trial-options]');
  const standardPeriod={...period};let wasComparison=false;
  const syncType=()=>{if(comparing()){if(!wasComparison&&s.trialView!=='comparative')Object.assign(period,reportBooks.comparisonPeriod());trialComparisonPeriod(period);}else if(wasComparison){Object.assign(period,standardPeriod);}
   wasComparison=comparing();periodButton.textContent=periodCaption();controls.hidden=!comparing();periodButton.disabled=openBook&&!comparing();periodButton.setAttribute('aria-haspopup','dialog')};
  form.trialView.onchange=syncType;syncType();
 }
 const historical=()=>!comparing()&&button.closest('.tab-content')?.id!=='report-open-tb'&&(kind==='tb'||reportBooks.scope()==='history');
 periodButton.onclick=()=>summaryPeriod14331.open(periodButton,periodFilters14331.selection(period),(values,meta)=>{
  periodFilters14331.setPeriod(period,values,meta);periodButton.textContent=periodCaption();
 },{mode:comparing()?period.mode:period.allMonths14331||period.selectedMonths14331?.length?'monthly':period.mode,from:period.from,to:period.to,custom:!comparing(),comparison:comparing(),closedBooks:historical()});
 form.by.onchange=()=>{form.direction.innerHTML=options(orders(form.by.value),form.direction.value)};
 form.basis.onchange=()=>accountChoices(ledger?form.account.value:'');
 function accountChoices(selected){
  const visible=rows.filter(r=>!form.currency.value||r.currency===form.currency.value);
  const label=r=>r.account.code+' — '+r.account.name+' · '+r.currency;
  if(ledger){
   const linked=form.basis.value==='reporting'?[...new Set([...reportingAmounts.links().values()].filter(Boolean))].map(a=>['report:'+a.id,a.code+' — '+a.name+' · all linked currencies']):[];
   form.account.innerHTML=options([['','All accounts'],...linked,...visible.map(r=>[r.key,label(r)])],selected);
  }
  if(!checks)return;
  const eligible=visible.filter(r=>kind!=='cf'||r.account.type==='ASSET'),box=dialog.querySelector('[data-choices]');
  const choice=r=>`<label><input type="checkbox" value="${re79(r.key)}" ${chosen.has(r.key)?'checked':''}> ${re79(label(r))}</label>`;
  box.innerHTML=kind==='cf'?'<label><input type="checkbox" data-all> Select all</label>'+[...new Set(eligible.map(r=>r.currency))].map(c=>`<div role="group" aria-label="${re79(c)} accounts"><strong>${re79(c)}</strong>${eligible.filter(r=>r.currency===c).map(choice).join('')}</div>`).join(''):eligible.map(choice).join('');
  const all=box.querySelector('[data-all]');
  function sync(){if(!all)return;const count=eligible.filter(r=>chosen.has(r.key)).length;all.checked=!!count&&count===eligible.length;all.indeterminate=!!count&&count<eligible.length;all.disabled=!eligible.length;dialog.querySelector('[data-cash-summary]').textContent=count?(all.checked?'All accounts ('+count+')':count+' selected'):'Choose accounts'}
  box.onchange=e=>{const input=e.target,keys=input===all?eligible.map(r=>r.key):[input.value];for(const key of keys){if(input.checked)chosen.add(key);else chosen.delete(key)}if(input===all)for(const item of box.querySelectorAll('input'))item.checked=input.checked;sync()};sync();
 }
 accountChoices(s.account);form.currency.onchange=()=>accountChoices(form.account?.value);
}
const reportFilterAccounts299=new WeakMap();
function compareReportAccounts143153(a,b){const direction=reportSort143153().direction==='desc'?-1:1;return direction*String(a.account.code||'').localeCompare(String(b.account.code||''),undefined,{numeric:true})}
function compareReportLines143153(a,b,kind){const sort=reportSort143153(kind),direction=sort.direction==='desc'?-1:1,date=String(a.date).localeCompare(String(b.date)),account=String(a.accountCode||'').localeCompare(String(b.accountCode||''),undefined,{numeric:true});return direction*(sort.by==='account'?(account||date):(date||account))||String(a.id).localeCompare(String(b.id),undefined,{numeric:true})||(a.originalIndex||0)-(b.originalIndex||0)}
// The model and export paths retain every row. The scrolling ledger mounts
// only nearby row groups so browser layout work stays bounded on tab changes.
function reportTable79(headers,rows,currency,print=false){
 const ledger=headers.includes('Entry ID'),trial=headers.includes('Period debit')&&headers.includes('Closing balance'),column=h=>({'Date':'date','Entry ID':'id','Account':'account','Description / Reference':'description','LAK rate':'rate','Classification':'classification','Original currency / net':'original'}[h]||'amount');
 const attr=h=>ledger?'data-ledger-column143108="'+column(h)+'"':trial?'data-trial-column143116="'+column(h)+'"':'';

 const accountIndex=headers.findIndex(h=>h==='Account'||h==='Account / parent');
 const labels=new Map();
 const renderRow=row=>{
  const raw=row[accountIndex];
  if(accountIndex>=0&&!labels.has(raw))labels.set(raw,window.ForeignFunds14386?.presentation(raw)||{text:String(raw).trim(),name:String(raw).trim(),subtotal:false});
  const account=labels.get(raw);
  return `<tr${account?.subtotal?' class="report-subtotal143185"':''}>${row.map((v,i)=>{
   const isAccount=i===accountIndex,value=isAccount?account.text:v;
   const reportGroup=headers[i]==='Reporting account',reportSource=headers[i]==='Source account';
   let content=!print&&(reportGroup||reportSource)&&value!=='Unclosed accumulated result'?`<button class="r79-link" data-account="${re79(value)}" onclick="reportingAmounts.open(this.dataset.account,${reportGroup})">${re79(value)}</button>`:!print&&headers[i]==='Account'?`<button class="r79-link" data-account="${re79(account.name)}" data-currency="${re79(currency)}" onclick="reportAccount79(this.dataset.account,this.dataset.currency)">${re79(value)}</button>`:!print&&headers[i]==='Entry ID'?`<button class="r79-link" data-entry="${re79(v)}" onclick="reportWindow143195.source(encodeURIComponent(this.dataset.entry))">${re79(v)}</button>`:headers[i]==='Description / Reference'?journalMemoHtml143187(value):re79(['Date','Rate date'].includes(headers[i])?formatAppDate(v):value);
   if(trial&&headers[i]==='Classification'){
    const [side,...type]=String(v).split(' · ');
    content='<span class="balance-badge118" title="Closing balance side">'+re79(side)+'</span>'+re79(type.join(' · '));
   }
   if(isAccount&&window.ForeignFunds14386)content=ForeignFunds14386.label(v,content,account);
   return `<td ${attr(headers[i])}>${account?.subtotal?'<strong>'+content+'</strong>':content}</td>`;
  }).join('')}</tr>`;
 };
 const body='<tbody>'+(rows.map(renderRow).join('')||`<tr><td colspan="${headers.length}">No posted activity matches this selection.</td></tr>`)+'</tbody>';
 return `<div class="r79-table"><table ${ledger?'class="ledger-columns143108" data-own-pager14383="1"':trial?'class="trial-columns143116"':headers.includes('Average carrying rate')?'class="valuation-columns"':''}><thead><tr>${headers.map(h=>`<th ${attr(h)}>${re79(h)}</th>`).join('')}</tr></thead>${body}</table></div>`}

function reportHierarchy14383(rows){
 return window.ForeignFunds14386?ForeignFunds14386.hierarchy(rows,compareReportAccounts143153):[...rows].sort(compareReportAccounts143153);
}
function balanceExplanation143154(currency,assets,liabilities,equity,result){
 const difference=assets-liabilities-equity-result,original=Reports79.basis!=='LAK',saved={...Reports79};let full;
 try{Object.assign(Reports79,{kind:'tb',basis:'original',currency:''});full=reportData79()}finally{Object.assign(Reports79,saved)}
 const recognized=r=>['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].includes(String(r.account.baseType||r.account.type).toUpperCase());
 const selected=full.filter(r=>!original||r.currency===currency),excluded=selected.filter(r=>r.account.isTechnical||!recognized(r)),net=r=>original?r.closing:r.baseClosing;
 const omitted=excluded.reduce((n,r)=>n+net(r),0),residual=difference+omitted;
 let note=`Assets ${money69(assets)} − liabilities ${money69(liabilities)} − equity ${money69(equity)} − result ${money69(result)} = ${money69(difference)} ${currency}. `;
 note+='Result is accumulated income less expenses that has not yet been transferred to equity; it is included once in this balance. ';
 note+=difference>0?'Positive means assets exceed liabilities plus equity and result. ':difference<0?'Negative means assets are below liabilities plus equity and result. ':'This view balances. ';
 if(original){note+='Original currencies are separate views: related reporting entries can be in LAK, while technical mapping accounts are excluded here. ';
 const parts=excluded.filter(r=>net(r)).map(r=>`${r.account.code} ${r.account.name}: ${money69(-net(r))} ${currency}`);
 if(parts.length)note+='Contribution from excluded accounts (opposite of their debit-minus-credit balances): '+parts.join('; ')+`. Total ${money69(-omitted)} ${currency}. `;
 note+=residual?`Remaining difference after including those accounts: ${money69(residual)} ${currency}; review cross-currency entries and the trial balance. `:'Including those accounts reconciles this currency to zero. ';
 }
 const visible=full.filter(r=>!r.account.isTechnical&&recognized(r)),lak=visible.reduce((n,r)=>n+r.baseClosing,0);
 note+=full.some(r=>r.missingRates)?'LAK validation is incomplete: exchange rates are missing. ':lak?`Combined LAK balance-sheet difference: ${money69(lak)} LAK — review required; do not treat this as only a currency-display difference.`:'Combined LAK balance-sheet difference: 0.00 LAK. ';
 return note;
}
function reportModel79(kind,oldest=false){
 if(kind==='tb'&&reportBooks.scope()==='comparison')return [monthlyTrialReportModel()];
 if(Reports79.basis==='reporting')return reportingAmounts.model(kind);
 if(Reports79.basis==='LAK'){const missing=reportData79().filter(r=>r.missingRates);if(missing.length)return [{currency:'LAK — incomplete',headers:['Account','Original currency','Missing rate records'],values:missing.map(r=>[r.account.name,r.sourceCurrency,r.missingRates]),metrics:[],note:'LAK totals are withheld until missing exchange rates are supplied. Original-currency records remain available. No exchange rate has been guessed.'}];}
 const data=reportData79(),groups=[];const sum=(rows,f)=>rows.reduce((s,r)=>s+f(r),0),type=(rows,t)=>rows.filter(r=>String(r.account.baseType||r.account.type).toUpperCase()===t),active=r=>r.opening||r.debit||r.credit||(kind==='tb'&&r.closing);
 for(const currency of [...new Set(data.map(r=>r.currency))].sort()){
 const all=data.filter(r=>r.currency===currency),rows=all.filter(active);let rowAccounts,headers=[],values=[],metrics=[],note='';
 if(kind==='pl'||kind==='expense'){
 const rev=type(rows,'REVENUE'),exp=type(rows,'EXPENSE'),income=sum(rev,r=>r.credit-r.debit),cost=sum(exp,r=>r.debit-r.credit);
 headers=['Classification','Account','Debit','Credit','Net amount'];values=reportHierarchy14383(kind==='expense'?exp:[...rev,...exp]).map(r=>[r.account.type,r.account.name,money69(r.debit),money69(r.credit),money69(r.account.type==='REVENUE'?r.credit-r.debit:r.debit-r.credit)]);
 metrics=kind==='expense'?[['Net expenses',cost]]:[['Revenue',income],['Expenses',cost],['Net profit / (loss)',income-cost]];
 note='Period activity only. Revenue uses credit less debit; expenses use debit less credit. System year-end closing transfers are excluded from this performance report.';
 }else if(kind==='bs'){
 const assets=sum(type(rows,'ASSET'),r=>r.closing),liabilities=-sum(type(rows,'LIABILITY'),r=>r.closing),equity=-sum(type(rows,'EQUITY'),r=>r.closing),earnings=-sum([...type(rows,'REVENUE'),...type(rows,'EXPENSE')],r=>r.closing);
 headers=['Classification','Account','Closing amount'];values=['ASSET','LIABILITY','EQUITY'].flatMap(t=>reportHierarchy14383(type(rows,t)).map(r=>[t,r.account.name,money69(t==='ASSET'?r.closing:-r.closing)]));values.push(['EQUITY','Unclosed accumulated result',money69(earnings)]);metrics=[['Assets',assets],['Liabilities + equity + result',liabilities+equity+earnings],['Difference',assets-liabilities-equity-earnings]];
 note=balanceExplanation143154(currency,assets,liabilities,equity,earnings);
 }else if(kind==='tb'){
 const ordered=reportHierarchy14383(rows);rowAccounts=ordered.map(r=>r.account);headers=['Account','Classification','Opening balance','Period debit','Period credit','Closing balance'];values=ordered.map(r=>[r.account.name,(r.closing>0?'DR · ':r.closing<0?'CR · ':'— · ')+r.account.type,balanceText69(r.opening),money69(r.debit),money69(r.credit),money69(r.closing)]);const dr=sum(rows,r=>Math.max(r.closing,0)),cr=sum(rows,r=>Math.max(-r.closing,0));metrics=[['Closing debit',dr],['Closing credit',cr],['Difference',dr-cr]];note='Equal totals check arithmetic; they do not confirm that every entry is complete or correctly classified.';
 if(Reports79.from.slice(0,4)!==Reports79.to.slice(0,4)){
  note+=' Opening and closing balances come from the first and last books. Period debits and credits exclude annual opening entries.';
  const carryChange=r=>r.closing-r.opening-r.debit+r.credit;
  if(rows.some(carryChange)){
   headers.splice(-1,0,'Year-opening change');
   ordered.forEach((row,i)=>values[i].splice(-1,0,money69(carryChange(row))));
   note+=' Year-opening change shows the difference between a closing balance and the next book’s recorded opening.';
  }
 }
 }else if(kind==='cf'||kind==='payroll'){
 const selected=all.filter(r=>Reports79[kind==='cf'?'cash':'payroll'].includes(r.key));
 headers=['Account','Opening (DR − CR)','Period debit','Period credit','Closing DR / CR'];values=reportHierarchy14383(selected).map(r=>[r.account.name,balanceText69(r.opening),money69(r.debit),money69(r.credit),balanceText69(r.closing)]);
 if(kind==='cf'){const opening=sum(selected,r=>r.opening),closing=sum(selected,r=>r.closing);metrics=[['Opening cash / bank',opening],['Net movement',closing-opening],['Closing cash / bank',closing]];note='Cash and bank movement for the accounts selected above. Transfers between selected accounts cancel in net movement but appear in account debits and credits. Operating, investing and financing classifications are not configured; this is not a classified cash-flow statement.'}
 else{note='Posted activity for the payroll accounts selected above. Payroll processing is not yet configured, so this report does not claim employee-level gross pay, deductions or net pay.'}
 if(!selected.length){metrics=[];note='Choose the accounts above to generate this report. '+note;}
 }else{
 const selected=window.ForeignFunds14386?ForeignFunds14386.select(all,Reports79.account).filter(active):rows.filter(r=>!Reports79.account||r.key===Reports79.account);headers=['Date','Entry ID','Account','Description / Reference','Debit','Credit','Running DR / CR'];let lines=[];
 selected.forEach(r=>{let running=r.opening;r.lines.forEach(l=>{running+=l.dr-l.cr;lines.push({...l,accountName:r.account.name,accountCode:r.account.code,running})})});const q=Reports79.query.trim().toLowerCase();lines=lines.filter(l=>!q||`${l.id} ${l.date} ${l.accountName} ${l.memo} ${l.generalMemo||''}`.toLowerCase().includes(q)).sort((a,b)=>compareReportLines143153(a,b,kind));
 if(Reports79.basis==='LAK')headers.splice(4,0,'LAK rate');values=lines.map(l=>[l.date,l.id,l.accountName,journalMemoValue143187(l),...(Reports79.basis==='LAK'?[(window.JournalFX14383?.lineRates(l)||[]).join(' / ')||(l.originalCurrency==='LAK'?'1':'—')]:[]),money69(l.dr),money69(l.cr),balanceText69(l.running)]);metrics=[['Opening (DR less CR)',sum(selected,r=>r.opening)],['Period debit',sum(selected,r=>r.debit)],['Period credit',sum(selected,r=>r.credit)],['Closing (DR less CR)',sum(selected,r=>r.closing)]];note='Running balances are calculated chronologically for each account. The selected display order applies to the screen, print and export; running balances retain their chronological values. Search filters the detail rows only; totals cover the selected accounts for the full period.';
 if(Reports79.basis==='original'&&currency!=='LAK'){headers.push('Posted rate evidence');values.forEach((v,i)=>v.push(reportingAmounts.evidence(lines[i])))}
 }

 const unknown=all.filter(r=>active(r)&&!['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','SYSTEM'].includes(String(r.account.type).toUpperCase()));if(unknown.length)note+=` Attention: ${unknown.length} account(s) have no recognized classification. Review the Trial Balance before relying on statements.`;
 if(Reports79.basis==='LAK'){note+=' LAK amounts use saved transaction/carrying rates. Original currencies are retained; mapping accounts are excluded from operating results.';if(!['gl','activity','bs','tb'].includes(kind)){const index=headers.indexOf('Account');if(index>=0){headers.splice(index+1,0,'Original currency / net');values=values.map(v=>{const row=rows.find(r=>r.account.name===String(v[index]).trim());return [...v.slice(0,index+1),row?row.sourceCurrency+' '+balanceText69(['pl','expense'].includes(kind)?row.original.debit-row.original.credit:row.original.closing):'Subtotal in LAK',...v.slice(index+1)]})}}}
 groups.push({currency,headers,values,metrics,note,rowAccounts});
 }
 if(window.ForeignFunds14386){const detail=ForeignFunds14386.reportDetails(data,kind);if(detail)groups.push(detail)}
 return groups;
}
function reportContent79(kind,oldest=false){const groups=reportModel79(kind,oldest);if(groups[0]?.monthlyTrial)return '<section class="r79-group"><h4>'+re79(groups[0].currency)+'</h4>'+monthlyTrialTable(groups[0],oldest,true)+'</section>';return groups.map(g=>`<section class="r79-group"><h4>${re79(g.currency)}${g.periodLabel?' · '+re79(g.periodLabel):''}</h4><div class="r79-metrics">${g.metrics.map(([label,value])=>`<div><small>${re79(label)}</small><strong class="${value<0?'r79-negative':''}">${money69(value)}</strong></div>`).join('')}</div>${kind==='tb'&&g.rowAccounts&&typeof standardTrialTable==='function'&&window.ForeignFunds14386?standardTrialTable(g,oldest):reportTable79(g.headers,g.values,g.currency,oldest)}<p class="r79-note">${re79(g.note)}</p></section>`).join('')||'<p class="r79-note">No chart accounts or posted journal data are available yet.</p>'}
function reportHeader79(kind,pending=false){
 const s=Reports79,title=kind==='tb'&&s.trialView==='comparative'?'Monthly Comparative Trial Balance':reportNames79[kind];
 return `<header class="r79-header"><div><span class="r79-eyebrow">${reportBooks.scope()==='live'?'ACCOUNTS · OPEN BOOK':reportBooks.scope()==='history'?'REPORTS · CLOSED BOOKS':reportBooks.scope()==='comparison'?'POSTED JOURNAL':'ACCOUNTS · POSTED JOURNAL'}</span><h3>${title}</h3><p>${kind==='tb'?trialPeriodLabel79(s):s.selectedMonths14331?.length?'Selected months: '+s.selectedMonths14331.map(m=>summaryPeriod14331.monthLabel(m)).join(', '):s.allMonths14331?'All months':kind==='bs'?'Position as of '+formatAppDate(s.to):formatAppDate(s.from)+' – '+formatAppDate(s.to)} · ${reportBooks.scope()==='live'?'Prior balances carried forward':reportBooks.scope()==='history'?'Closed-book history':'Posted entries'}</p></div><div class="r79-actions">${['gl','activity'].includes(kind)?`<div class="r79-search143153 no-print"><label>Search<input type="search" placeholder="Date, ID, account or description" value="${re79(s.query)}" onchange="reportSet79('query',this.value)"></label></div>`:''}<button type="button" class="je-btn je-btn-secondary" aria-haspopup="dialog" onclick="toggleReportFilters143153(this)">Filter</button><button class="je-btn je-btn-secondary" onclick="reportWindow143195.refresh()">Refresh</button><button ${pending?'disabled ':''}class="je-btn je-btn-secondary" onclick="exportReport79('${kind}')" title="Export CSV">Export</button><button ${pending?'disabled ':''}class="je-btn je-btn-emerald" onclick="printDesktopReport79('${kind}')" title="Print or save PDF">Print</button></div></header>`;
}
function renderReports79(){
 if(!matchMedia('(min-width:768px)').matches)return;
 const previousCache=reportRenderCache14336;reportRenderCache14336=new Map();try{
 for(const kind of Object.keys(reportNames79)){
 const panel=document.querySelector('#report-'+kind+'.active,#report-open-'+kind+'.active');if(!panel)continue;let host=panel.querySelector('.r79');if(!host){if(!panel.querySelector('.r79-original')){const original=document.createElement('div');original.className='r79-original';for(const child of [...panel.childNodes])if(!child.matches?.('.area-banner113,#categoryTabShell,.module-header'))original.append(child);panel.append(original)}host=document.createElement('section');host.className='r79';panel.append(host)}
 Reports79.kind=kind;if(window.reportWindow143195?.reuse(host))continue;if(window.reportWindow143195&&!reportWindow143195.prepare(host))continue;const s=Reports79,isLedger=['gl','activity'].includes(kind);
 if(isLedger||kind==='cf'||kind==='payroll')reportFilterAccounts299.set(host,reportData79().map(r=>({key:r.key,account:r.account,currency:r.sourceCurrency||r.currency})));
 const content=reportContent79(kind);
 host.innerHTML=`${reportHeader79(kind)}<div class="r79-content">${content}</div>${kind==='tb'?'':`<div class="r79-notes"><label>Report notes / findings <span>Optional · included when printing or exporting; kept for this session only</span><textarea rows="3" placeholder="Add context, supporting references or matters to review…" oninput="Reports79.notes['${kind}']=this.value">${re79(s.notes[kind]||'')}</textarea></label></div>`}`;
 window.tableResize143117?.prepare?.(host);
 window.reportWindow143195?.rendered(host);
 if(kind==='tb')reportBooks.prepareOtherTrial(renderReports79);
 }
 }finally{reportRenderCache14336=previousCache}
}
function accountDataCurrencies79(){return [...(AccountingStore.accounts||[]).map(a=>a.currency),...JournalModule.entries.map(l=>l.currency)]}
function reportAccount79(name,currency){const parent=AccountingStore.accounts.find(a=>a.isPosting===false&&a.name===name.trim());
 const row=parent?null:reportData79().find(r=>r.account.name===name.trim()&&r.currency===currency);
 if(!parent&&!row)return;reportBooks.carryToActivity();if(parent&&Reports79.basis==='original')Reports79.currency=currency;
 Reports79.account=parent?accountKey69(parent):row.key;Reports79.query='';switchTab('report-activity')}
async function exportReport79(kind){
 const rows=[[reportNames79[kind]],[Reports79.from,Reports79.to],['Source','Posted journal; active and archived']];reportModel79(kind,true).forEach(g=>{rows.push([],['Currency',g.currency],...(g.periodLabel?[['Period',g.periodLabel]]:[]),...g.metrics.map(([k,v])=>[k,v/100]),g.headers,...g.values,['Report basis',g.note])});if(Reports79.notes[kind])rows.push([],['Notes',Reports79.notes[kind]]);
 const safe=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@]/.test(s)||(/^\-/.test(s)&&!/^-[\d,.]+$/.test(s)))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};const csv=rows.map(r=>r.map(safe).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`${kind}-${Reports79.from}-${Reports79.to}.csv`;await (window.exportCenter14337?exportCenter14337.fromLink(a):a.click());setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function printDesktopReport79(kind){
 return print82(reportNames79[kind],reportContent79(kind,true)+(Reports79.notes[kind]?`<h3>Notes / findings</h3><p>${re79(Reports79.notes[kind])}</p>`:''),formatAppDate(Reports79.from)+' – '+formatAppDate(Reports79.to));
}
const switchBefore79=switchTab;switchTab=function(id,...args){const result=switchBefore79(id,...args);if(id?.startsWith('report-'))renderReports79();return result};
const refreshBefore79=refreshAllTables;refreshAllTables=function(...args){const result=refreshBefore79(...args);renderReports79();return result};
matchMedia('(min-width:768px)').addEventListener('change',e=>{if(e.matches)renderReports79()});
document.addEventListener('DOMContentLoaded',renderReports79);

const logoutBefore79=logoutDemoUser;logoutDemoUser=async function(){reportSorts143153.clear();document.querySelectorAll('dialog.report-dialog299[open]').forEach(d=>d.close());Reports79.notes={};Reports79.cash=[];Reports79.payroll=[];Reports79.account='';Reports79.query='';Reports79.currency='';document.querySelectorAll('.r79,.r79-print-frame').forEach(n=>n.remove());return logoutBefore79()};
;
