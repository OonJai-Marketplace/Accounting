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
  const result=[{currency,headers:['Reporting account','Classification',...(kind==='bs'?[]:performance?['Period debit','Period credit']:['Opening balance','Period debit','Period credit']),...(yearOpening?['Year-opening change']:[]),performance?'Net amount':'Closing balance'],values:summary,metrics,note}];
  result.push({currency:'Currency contributions · LAK',headers:['Reporting account','Source account','Currency','Original '+(performance?'net':'balance'),'Average book rate','Rate date','LAK contribution'],values:grouped.flatMap(g=>g.parts.map(p=>[groupLabel(g.account),label(p.row.account),p.row.currency,amount(net(p.row.account,p.row)),p.rate.rate?p.rate.rate.toLocaleString(appNumberLocale(),{maximumFractionDigits:10})+' LAK/'+p.row.currency:p.rate.issue,to,amount(net(p.row.account,p))])),metrics:[],note:'These rows explain the reporting-account totals above. Each source is counted once.'});
  if(kind==='gl'||kind==='activity')result.push(ledger(items,to));
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
  const groupedRows=new Map(),contributions=new Map(),monthlyTotals=[];
  const choices=options.accounts&&new Set(options.accounts),targets=links();
  const subheads=options.columns==='balance'?['Balance']:['Debit','Credit','Balance'];
  const blank=()=>Array(subheads.length).fill('—');
  const cells=r=>(options.columns==='balance'?[r.closing]:[r.debit,r.credit,r.closing]).map(amount);
  const ends=months.map((m,i)=>i===months.length-1&&options.to?options.to:summaryPeriod14331.end(m));
  months.forEach((month,i)=>{
   const start=i===0&&options.from?options.from:month+'-01',end=ends[i];
   const rows=accountDataForPeriod69(entries,start,end,false).filter(row=>(!options.currency||options.currency===row.currency)&&(!choices||choices.has(row.key)));
   const selectedParts=parts(rows.filter(visible),markReviewedRates(rows,entries,end),targets),grouped=groups(selectedParts);
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
  const detail=[...contributions.values()].sort(order).map(r=>[groupLabel(r.target)+' / '+label(r.account),...cellsByMonth(r)]);
  return {monthlyTrial:true,months,subheads,headers:['Accounts',...ends.flatMap(end=>subheads.map(h=>end+' '+h))],values:[...values,...detail,[options.accounts?'Selected total · LAK':'Total · LAK',...monthlyTotals.flat()]],totalCount:1,currency:'Reporting Amount · LAK',metrics:[],rateDates:ends,note:'Each column uses the book rate at its closing date. Currency contributions are included in the reporting-account totals.'};
 }
 return {model,comparison,links,evidence,open};
})();
