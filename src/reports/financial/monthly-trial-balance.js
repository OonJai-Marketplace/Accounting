// The rail and report filter share display preferences within the signed-in company account.
function monthlyTrialPreferenceKey(){
 return 'monthly-trial:'+JSON.stringify([window.OJM_SUPABASE_URL||location.origin,liveProfile.id,window.workspaceRequest138?.target||'']);
}
function monthlyTrialPreferences(){
 let saved;
 try{saved=JSON.parse(localStorage.getItem(monthlyTrialPreferenceKey()))}catch{}
 return {basis:saved?.basis==='reporting'?'reporting':'original',columns:saved?.columns==='balance'?'balance':'full',accounts:Array.isArray(saved?.accounts)?saved.accounts:null};
}
function saveMonthlyTrialPreferences(prefs){
 try{localStorage.setItem(monthlyTrialPreferenceKey(),JSON.stringify(prefs))}catch{showCenterStatus('Could not save the comparison settings on this device.',true)}
}
function monthlyTrialColumnControl(value,compact=false){
 return (compact?'':'<label>Columns')+'<select aria-label="Columns" data-plain14285 name="trialColumns"><option value="full">Debit, Credit, Balance</option><option value="balance"'+(value==='balance'?' selected':'')+'>Balance only</option></select>'+(compact?'':'</label>');
}
function monthlyTrialParent(account,currency){
 return currency===account.currency&&(account.isPosting===false||account.is_posting===false||/^(NA|N\/A|PARENT|__PARENT__)$/i.test(currency));
}
function monthlyTrialLabel(account,unit){
 const namedUnit=String(account.name||'').trim().split(/[\s·–—()\/-]+/).filter(Boolean).at(-1);
 return [account.code,account.name,namedUnit?.toUpperCase()===unit?null:unit].filter(Boolean).join(' · ');
}
// Presentation only: stored account names, currencies and financial rows stay unchanged.
function monthlyTrialReadableName(name){
 const acronyms=new Set(['LAK','USD','THB','BHT','BCEL','SSO','PIT','VAT','FX','OJM','ATM','POS','HR','IT','UNICEF','NGO']);
 return String(name||'').replace(/\b[A-Z][A-Z']*\b/g,word=>acronyms.has(word)?word:word[0]+word.slice(1).toLowerCase());
}
function monthlyTrialPopupLabel(account){
 return [account.code,monthlyTrialReadableName(account.name)].filter(Boolean).join(' · ');
}
function monthlyTrialCurrencyCompare(a,b){
 const order=unit=>['LAK','USD','THB'].includes(unit)?['LAK','USD','THB'].indexOf(unit):unit?3:-1;
 return order(a)-order(b)||String(a).localeCompare(String(b));
}
function monthlyTrialPopupGroups(model){
 const categories=[['ASSET','Assets'],['LIABILITY','Liabilities'],['EQUITY','Equity'],['INCOME','Income'],['EXPENSE','Expenses'],['DRAWING','Drawings'],['OTHER','Other accounts'],['SYSTEM','System']],groups=new Map(),parents=ForeignFunds14386.parentIndex();
 const compare=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true});
 model.values.slice(0,model.values.length-model.totalCount).forEach((row,i)=>{
  const account=model.rowAccounts?.[i],raw=String(window.AccountGroups14253?.type(account)||(account?.isTechnical||account?.is_technical||account?.purpose&&account.purpose!=='regular'||account?.account_purpose&&account.account_purpose!=='regular'?'SYSTEM':account?.type||account?.baseType||account?.account_type||'OTHER')).toUpperCase();
  const type=raw==='REVENUE'?'INCOME':categories.some(([key])=>key===raw)?raw:'OTHER';
  const ancestors=account?parents(account).slice().reverse():[];
  const parent=account&&monthlyTrialParent(account,account.currency),unit=model.rowCurrencies?.[i]??(parent?'':account?.currency||'');
  const name=model.rateDates?monthlyTrialReadableName(row[0]).replace(/ · Subtotal · LAK$/,' · Subtotal'):account?monthlyTrialPopupLabel(account)+(parent&&row.slice(1).some(Boolean)?' · Subtotal':''):monthlyTrialReadableName(row[0]);
  const item={row,account,unit,name,parent,depth:ancestors.length,path:[...ancestors,account].filter(Boolean).map(a=>a.code)};
  if(!groups.has(type))groups.set(type,new Map());
  const units=groups.get(type);if(!units.has(unit))units.set(unit,[]);units.get(unit).push(item);
 });
 return categories.filter(([key])=>groups.has(key)).map(([key,label])=>({label,units:[...groups.get(key)].sort(([a],[b])=>monthlyTrialCurrencyCompare(a,b)).map(([unit,items])=>({unit,items:items.sort((a,b)=>{
  for(let i=0;i<Math.min(a.path.length,b.path.length);i++){const difference=compare(a.path[i],b.path[i]);if(difference)return difference}
  return a.path.length-b.path.length;
 })}))}));
}
function monthlyTrialChoices(entries){
 const choices=new Map(),byId=new Map(),byCode=new Map(),byName=new Map();
 function add(a,currency){
  const key=accountKey69(a,currency);
  if(!choices.has(key))choices.set(key,{key,account:a,currency});
 }
 for(const a of AccountingStore.accounts){
  byId.set(String(a.id),a);byCode.set(String(a.code),a);byName.set(a.name+'|'+a.currency,a);
  add(a,a.currency);
 }
 for(const l of entries){
  const a=byId.get(String(l.accountId))||byCode.get(String(l.accountCode))||byName.get(l.account+'|'+l.currency)||{name:l.account,code:l.accountCode||'Unmapped',currency:l.currency};
  add(a,l.currency);
 }
 return [...choices.values()].sort((a,b)=>String(a.account.code).localeCompare(String(b.account.code),undefined,{numeric:true}));
}
// A null selection tracks the entire chart, including accounts added later.
function monthlyTrialAccountPicker(host,choices,selected,onChange,compact=false){
 const picked=new Set(selected||choices.map(r=>r.key));
 const labels=choices.map(({account,currency,key})=>{
  const unit=monthlyTrialParent(account,currency)?'Parent account':currency;
  return '<label><input type="checkbox" value="'+re79(key)+'" '+(picked.has(key)?'checked':'')+'> '+re79(compact?monthlyTrialPopupLabel(account)+(monthlyTrialParent(account,currency)?' · Parent account':''):monthlyTrialLabel(account,unit))+'</label>';
 });
 host.innerHTML='<details class="trial-account-picker"><summary>Edit accounts</summary><div><input type="search" aria-label="Find accounts" placeholder="Code, name, type or currency"><label><input type="checkbox" data-all-accounts> All accounts</label><div class="trial-account-list">'+labels.join('')+'</div></div></details>';
 const all=host.querySelector('[data-all-accounts]'),items=[...host.querySelectorAll('.trial-account-list input')];
 const searchText=choices.map(({account,currency},i)=>[items[i].parentElement.textContent,account.type,account.baseType,account.desc,currency].join(' ').toLowerCase());
 const read=()=>items.every(b=>b.checked)?null:items.filter(b=>b.checked).map(b=>b.value);
 function sync(){const count=items.filter(b=>b.checked).length;all.checked=count===items.length;all.indeterminate=count>0&&!all.checked}
 host.onchange=e=>{if(e.target===all)for(const b of items)b.checked=all.checked;sync();onChange?.(read())};
 host.querySelector('[type=search]').oninput=e=>{
  const terms=e.target.value.trim().toLowerCase().split(/\s+/);
  items.forEach((b,i)=>{b.parentElement.hidden=!terms.every(term=>searchText[i].includes(term))});
 };
 sync();return read;
}

// Group lines once. Prior activity establishes the first month's opening. A new book uses its own saved opening.
function monthlyTrialModel(entries,months,options){
 if(options.basis==='reporting')return reportingAmounts.comparison(entries,months,options);
 const {basis,currency,accounts,columns,from,to,direction}=options,selected=accounts&&new Set(accounts);
 const first=months[0],last=months.at(-1),yearStart=first.slice(0,4)+'-01',buckets=new Map(),records=new Map();
 for(const line of entries){
  const month=String(line.date||'').slice(0,7);
  if(month<yearStart||month>last)continue;
  const key=month<first?first:month;
  if(!buckets.has(key))buckets.set(key,[]);
  buckets.get(key).push(line);
 }
 const carry=new Map(),incomplete=new Set(),base=basis==='LAK',parents=ForeignFunds14386.parentIndex();
 for(const [index,month] of months.entries()){
  if(month.endsWith('-01')){carry.clear();incomplete.clear()}
  const start=index===0&&from?from:month+'-01',end=month===last&&to?to:summaryPeriod14331.end(month);
  for(const row of accountDataForPeriod69(buckets.get(month)||[],start,end,false)){
   const {account,key}=row;
   if(currency&&currency!==row.currency&&!monthlyTrialParent(account,row.currency))continue;
   if(selected&&!selected.has(key)&&!parents(account).some(p=>selected.has(accountKey69(p))))continue;
   if(!records.has(key))records.set(key,{account,currency:row.currency,months:[],headingOnly:monthlyTrialParent(account,row.currency)});
   const record=records.get(key);
   if(row.opening||row.debit||row.credit||row.baseOpening||row.baseDebit||row.baseCredit||row.missingRates)record.headingOnly=false;
   carry.set(key,(carry.get(key)||0)+(base?row.baseClosing:row.closing));
   if(base&&row.missingRates)incomplete.add(key);
   record.months[index]={debit:base?row.baseDebit:row.debit,credit:base?row.baseCredit:row.credit,
    balance:carry.get(key),missingTurnover:base&&row.missingRates>0,missingBalance:incomplete.has(key)};
  }
  for(const [key,record] of records){
   if(!record.months[index])record.months[index]={debit:0,credit:0,balance:carry.get(key)||0,missingBalance:incomplete.has(key)};
  }
 }
 const ordered=[...records.values()].sort((a,b)=>(direction==='desc'?-1:1)*String(a.account.code||'').localeCompare(String(b.account.code||''),undefined,{numeric:true}));
 const subheads=columns==='balance'?['Balance']:['Debit','Credit','Balance'],totals=new Map();
 function cells(t){
  const balance=t.missingBalance?'Rate missing':money69(t.balance);
  return columns==='balance'?[balance]:[t.missingTurnover?'Rate missing':money69(t.debit),t.missingTurnover?'Rate missing':money69(t.credit),balance];
 }
 const empty=()=>({debit:0,credit:0,balance:0});
 const byParent=new Map();
 for(const row of ordered.filter(r=>!r.headingOnly&&r.account.isPosting!==false)){
  for(const parent of parents(row.account)){
   if(!byParent.has(parent.code))byParent.set(parent.code,new Map());
   const units=byParent.get(parent.code),unit=base?'LAK':row.currency;
   if(!units.has(unit))units.set(unit,months.map(empty));
   row.months.forEach((m,i)=>{
    const t=units.get(unit)[i];
    t.debit+=m.debit;t.credit+=m.credit;t.balance+=m.balance;
    t.missingTurnover||=m.missingTurnover;t.missingBalance||=m.missingBalance;
   });
  }
 }
 const rowAccounts=[],rowCurrencies=[];
 const values=ordered.flatMap(row=>{
  if(row.headingOnly){
   const units=byParent.get(row.account.code);
   if(!units?.size){rowAccounts.push(row.account);rowCurrencies.push('');return [[monthlyTrialLabel(row.account,'Parent account'),...Array(months.length*subheads.length).fill('')]];}
   return [...units].sort(([a],[b])=>a.localeCompare(b)).map(([unit,series])=>{rowAccounts.push(row.account);rowCurrencies.push(unit);return [monthlyTrialLabel(row.account,'Subtotal · '+unit),...series.flatMap(cells)]});
  }
  const unit=base?'LAK':row.currency;
  if(!totals.has(unit))totals.set(unit,months.map(empty));
  const amounts=months.flatMap((_,i)=>{
   const t=row.months[i]||empty(),sum=totals.get(unit)[i];
   sum.debit+=t.debit;sum.credit+=t.credit;sum.balance+=t.balance;
   sum.missingTurnover||=t.missingTurnover;sum.missingBalance||=t.missingBalance;
   return cells(t);
  });
  rowAccounts.push(row.account);rowCurrencies.push(unit);
  return [[monthlyTrialLabel(row.account,row.currency),...amounts]];
 });
 const totalRows=[...totals].map(([unit,list])=>[(selected?'Selected total':'Total')+' · '+unit,...list.flatMap(cells)]);
 return {monthlyTrial:true,months,subheads,headers:['Accounts',...months.flatMap(m=>subheads.map(h=>summaryPeriod14331.monthLabel(m)+' '+h))],
  rowAccounts,rowCurrencies,values:values.concat(totalRows),totalCount:totalRows.length,currency:base?'LAK equivalent':'Original currencies',metrics:[],note:''};
}

function monthlyTrialReportModel(){
 const s=Reports79,months=summaryPeriod14331.monthRange([s.from.slice(0,7),s.to.slice(0,7)]);
 const entries=reportWindow143195.cachedLedger();
 if(!entries)throw Error('The posted journal for this comparison has not finished loading.');
 return monthlyTrialModel(entries,months,{...monthlyTrialPreferences(),from:s.from,to:s.to,currency:s.currency,basis:s.basis,direction:reportSort143153('tb').direction});
}
function monthlyTrialTable(model,print=false,groupCategories=false){
 const {months,subheads,values,totalCount}=model,width=subheads.length,span=print?(width===1?5:2):months.length,tables=[];
 if(!values.length)return '<p class="r79-note">No accounts match this selection.</p>';
 for(let first=0;first<months.length;first+=span){
  const part=months.slice(first,first+span),labels=part.map((m,i)=>'<th colspan="'+width+'" scope="colgroup"'+(model.rateDates?' data-as-of="'+re79(model.rateDates[first+i])+'"':'')+'><span>'+re79(model.rateDates?formatAppDate(model.rateDates[first+i]):summaryPeriod14331.monthLabel(m))+'</span></th>').join('');
  const columnClass=j=>[j%width===0?'month-start':'',groupCategories&&width>1&&subheads[j%width]==='Balance'?'trial-balance-column':''].filter(Boolean).join(' ');
  const headers=part.map(()=>subheads.map((h,j)=>'<th scope="col" class="'+columnClass(j)+'">'+h+'</th>').join('')).join('');
  const rowHTML=(row,item)=>{
   const name=item?.name||row[0],label=item?'<span class="trial-account-label" style="padding-inline-start:'+item.depth*16+'px">'+re79(name)+'</span>':re79(name);
   return '<tr'+(item?.parent?' class="trial-parent"':'')+'><th scope="row" title="'+re79(name)+'">'+label+'</th>'+row.slice(1+first*width,1+(first+part.length)*width).map((value,j)=>'<td class="'+columnClass(j)+'">'+re79(value)+'</td>').join('')+'</tr>';
  };
  const split=values.length-totalCount;
  let body;
  if(groupCategories){
   const separator=(label,kind)=>'<tr class="trial-'+kind+'"><th colspan="'+(1+part.length*width)+'"><span>'+re79(label)+'</span></th></tr>';
   body=monthlyTrialPopupGroups(model).map(group=>separator(group.label,'category')+group.units.map(({unit,items})=>(unit?separator(unit,'currency'):'')+items.map(item=>rowHTML(item.row,item)).join('')).join('')).join('');
  }else body=values.slice(0,split).map(row=>rowHTML(row)).join('');
  const footer=values.slice(split);if(groupCategories)footer.sort((a,b)=>monthlyTrialCurrencyCompare(a[0].split(' · ').at(-1),b[0].split(' · ').at(-1)));
  tables.push('<table class="monthly-trial-table" aria-label="Monthly comparative trial balance" data-own-pager14383="1"><thead><tr><th scope="col" rowspan="2">Accounts</th>'+labels+'</tr><tr>'+headers+'</tr></thead><tbody>'+body+'</tbody><tfoot>'+footer.map(row=>rowHTML(row)).join('')+'</tfoot></table>');
 }
 return print?tables.join(''):'<div class="monthly-trial-scroll">'+tables.join('')+'</div>';
}

// Remember measured pixel widths per account label and month/field on this device.
// Reusing a view applies its saved widths without measuring or reading cell styles.
function monthlyTrialSavedWidths(){
 let saved;try{saved=JSON.parse(localStorage.getItem(monthlyTrialPreferenceKey()+':widths'))}catch{}
 const valid=n=>Number.isFinite(n)&&n>0&&n<10000;
 const clean=object=>Object.fromEntries(Object.entries(object||{}).filter(([,value])=>valid(value)));
 return {labels:clean(saved?.labels),columns:clean(saved?.columns),limit:valid(saved?.limit)?saved.limit:null};
}
function fitMonthlyTrialColumns(panel,months,basis,saved){
 const table=panel.querySelector('.monthly-trial-table');if(!table)return;
 const headers=[...table.tHead.rows[1].cells],fields=headers.length/months.length;
 const keys=headers.map((cell,i)=>[basis,months[Math.floor(i/fields)],cell.textContent.trim()].join('|'));
 const missing=keys.map((key,i)=>saved.columns[key]?null:i).filter(i=>i!==null);
 const rows=[...table.querySelectorAll('tbody tr,tfoot tr')].filter(row=>row.querySelector('th[scope="row"]'));
 let context,changed=false;
 function measure(cell){
  if(!context)context=document.createElement('canvas').getContext('2d');
  if(!context)return 100;
  const style=getComputedStyle(cell);context.font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' ');
  let text=cell.textContent.trim();if(style.textTransform==='uppercase')text=text.toUpperCase();else if(style.textTransform==='lowercase')text=text.toLowerCase();
  return Math.ceil(context.measureText(text).width+(parseFloat(style.letterSpacing)||0)*Math.max(0,text.length-1)+parseFloat(style.paddingLeft)+parseFloat(style.paddingRight)+parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth)+2);
 }
 function labelWidth(cell,parent=false){
  const key=(parent?'parent|':'regular|')+cell.textContent.trim();
  if(!saved.labels[key]){const label=cell.querySelector('.trial-account-label'),indent=label?parseFloat(label.style.paddingInlineStart)||0:0;saved.labels[key]=measure(cell)+indent;changed=true;}
  return saved.labels[key];
 }
 let accountWidth=labelWidth(table.tHead.rows[0].cells[0]);
 for(const row of rows)accountWidth=Math.max(accountWidth,labelWidth(row.cells[0],row.classList.contains('trial-parent')));
 for(const i of missing){saved.columns[keys[i]]=Math.max(measure(headers[i]),...rows.map(row=>measure(row.cells[i+1])));changed=true;}
 if(!saved.limit){if(!context)context=document.createElement('canvas').getContext('2d');if(context)context.font='12px Arial';saved.limit=Math.max(160,Math.min((context?context.measureText('0').width:6.67)*46,document.documentElement.clientWidth*.38));changed=true;}
 accountWidth=Math.ceil(Math.min(accountWidth,saved.limit));
 const columns=[accountWidth,...keys.map(key=>saved.columns[key])],group=document.createElement('colgroup');
 group.innerHTML=columns.map(width=>'<col style="width:'+width+'px">').join('');table.prepend(group);
 const tableWidth=columns.reduce((sum,width)=>sum+width,0);
 table.style.setProperty('--trial-table-width',tableWidth+'px');table.classList.add('trial-fitted');
 panel.closest('dialog')?.style.setProperty('--trial-dialog-width',Math.max(390,tableWidth+2)+'px');
 if(changed)try{localStorage.setItem(monthlyTrialPreferenceKey()+':widths',JSON.stringify(saved))}catch{}
}

function openMonthlyTrialBalance(panel,scope){
 const dialog=panel.closest('dialog'),header=dialog.querySelector('header'),close=header.querySelector('.close');
 close.classList.add('je-btn','je-btn-secondary');close.textContent='Close';
 const prefs=monthlyTrialPreferences(),calendar=summaryPeriod14331,savedWidths=monthlyTrialSavedWidths();
 const basisControl='<select aria-label="Currency view" data-plain14285 name="trialBasis"><option value="original">Original currencies</option><option value="reporting">Reporting · LAK</option></select>';
 const toolbar=document.createElement('div');toolbar.className='monthly-trial-tools';
 toolbar.innerHTML='<details class="monthly-trial-filter"><summary class="je-btn je-btn-secondary">Filter</summary><div class="monthly-trial-filter-panel"><label>Period<button type="button" class="je-btn je-btn-secondary" data-period aria-haspopup="dialog">Period</button></label><label>Currency view'+basisControl+'</label><label>Columns'+monthlyTrialColumnControl(prefs.columns,true)+'</label><div data-accounts></div></div></details><button type="button" class="je-btn je-btn-secondary" data-refresh>Refresh</button>';
 toolbar.append(close);header.append(toolbar);
 const filter=toolbar.querySelector('.monthly-trial-filter');
 dialog.addEventListener('click',event=>{if(!filter.contains(event.target)&&!event.target.closest('.summary-period14331'))filter.open=false});
 const period=header.querySelector('[data-period]'),columns=header.querySelector('[name=trialColumns]'),accountPicker=header.querySelector('[data-accounts]');
 const basis=header.querySelector('[name=trialBasis]');basis.value=prefs.basis;
 const status=document.createElement('small');header.querySelector('h2').append(status);
 // Each opening starts with this month; an explicit range survives Refresh only.
 let entries,months=[calendar.current()],allMonths;
 function draw(){
  period.textContent=calendar.label(months);period.setAttribute('aria-label','Period · '+period.textContent);
  panel.innerHTML=monthlyTrialTable(monthlyTrialModel(entries,months,prefs),false,true);
  fitMonthlyTrialColumns(panel,months,prefs.basis,savedWidths);
 }
 async function load(refresh,check=true){
  const request=scope.begin();
  period.disabled=columns.disabled=basis.disabled=true;accountPicker.hidden=true;panel.textContent='Loading balances…';
  try{
   const offline=!!window.offline14239?.offline();
   const saved=await reportWindow143195.postedLedger(refresh&&!offline);
   if(!scope.current(request))return;
   entries=saved;status.textContent=offline?'Downloaded journal':'';
   const pending=window.journalDurable14385?.pending().some(j=>j.status!=='saved'||j.changes?.some(op=>op.status!=='saved'));
   if(pending){
    const w=yearWindow14333.state();
    if(!w.revision14341||yearWindow14333.loading)throw Error('The device journal is incomplete. Refresh when the journal is ready.');
    entries=saved.filter(l=>l.date<w.from||l.date>w.to).concat(JournalModule.entries.map(l=>({...l,pendingSync:false,local14333:false})));
    status.textContent='Includes changes saved on this device';
   }
   let first='',last='';
   for(const entry of entries){const m=entry.date.slice(0,7);if(!first||m<first)first=m;if(m>last)last=m}
   const previousAll=months===allMonths;
   allMonths=first?calendar.monthRange([first,last]):[calendar.current()];
   if(!months||previousAll)months=allMonths;
   monthlyTrialAccountPicker(accountPicker,monthlyTrialChoices(entries),prefs.accounts,accounts=>{
    if(!scope.current(request))return;prefs.accounts=accounts;saveMonthlyTrialPreferences(prefs);draw();
   },true);
   basis.onchange=()=>{if(scope.current(request)){prefs.basis=basis.value;saveMonthlyTrialPreferences(prefs);draw()}};
   columns.onchange=()=>{if(scope.current(request)){prefs.columns=columns.value;saveMonthlyTrialPreferences(prefs);draw()}};
   period.onclick=()=>calendar.open(period,months,selected=>{if(scope.current(request)){months=selected.length?selected:allMonths;draw()}});
   period.disabled=columns.disabled=basis.disabled=false;accountPicker.hidden=false;draw();
   if(check&&!refresh&&!offline&&window.startup14257?.checkBooks){
    const prior=reportWindow143195.savedRevision();
    void startup14257.checkBooks().then(()=>{
     if(scope.current(request)&&prior!==reportWindow143195.savedRevision())void load(false,false);
    }).catch(()=>{if(scope.current(request))status.textContent='Showing device copy · refresh pending';});
   }
  }catch(error){
   if(scope.current(request))panel.textContent=error.message||'Could not load the journal. Choose Refresh to retry.';
  }
 }
 header.querySelector('[data-refresh]').onclick=()=>load(true);
 dialog.addEventListener('close',()=>{if(dialog.querySelector('.summary-period14331'))calendar.close();if(reportBooks.scope()==='comparison')renderReports79()},{once:true});
 void load(false);
}
