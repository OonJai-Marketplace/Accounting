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
function monthlyTrialColumnControl(value){
 return '<label>Columns<select data-plain14285 name="trialColumns"><option value="full">Debit, Credit, Balance</option><option value="balance"'+(value==='balance'?' selected':'')+'>Balance only</option></select></label>';
}
function monthlyTrialParent(account,currency){
 return currency===account.currency&&(account.isPosting===false||account.is_posting===false||/^(NA|N\/A|PARENT|__PARENT__)$/i.test(currency));
}
function monthlyTrialLabel(account,unit){
 return [account.code,account.name,unit].filter(Boolean).join(' · ');
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
function monthlyTrialAccountPicker(host,choices,selected,onChange){
 const picked=new Set(selected||choices.map(r=>r.key));
 const labels=choices.map(({account,currency,key})=>{
  const unit=monthlyTrialParent(account,currency)?'Parent account':currency;
  return '<label><input type="checkbox" value="'+re79(key)+'" '+(picked.has(key)?'checked':'')+'> '+re79(monthlyTrialLabel(account,unit))+'</label>';
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
 const values=ordered.flatMap(row=>{
  if(row.headingOnly){
   const units=byParent.get(row.account.code);
   if(!units?.size)return [[monthlyTrialLabel(row.account,'Parent account'),...Array(months.length*subheads.length).fill('')]];
   return [...units].sort(([a],[b])=>a.localeCompare(b)).map(([unit,series])=>[monthlyTrialLabel(row.account,'Subtotal · '+unit),...series.flatMap(cells)]);
  }
  const unit=base?'LAK':row.currency;
  if(!totals.has(unit))totals.set(unit,months.map(empty));
  const amounts=months.flatMap((_,i)=>{
   const t=row.months[i]||empty(),sum=totals.get(unit)[i];
   sum.debit+=t.debit;sum.credit+=t.credit;sum.balance+=t.balance;
   sum.missingTurnover||=t.missingTurnover;sum.missingBalance||=t.missingBalance;
   return cells(t);
  });
  return [[monthlyTrialLabel(row.account,row.currency),...amounts]];
 });
 const totalRows=[...totals].map(([unit,list])=>[(selected?'Selected total':'Total')+' · '+unit,...list.flatMap(cells)]);
 return {monthlyTrial:true,months,subheads,headers:['Accounts',...months.flatMap(m=>subheads.map(h=>summaryPeriod14331.monthLabel(m)+' '+h))],
  values:values.concat(totalRows),totalCount:totalRows.length,currency:base?'LAK equivalent':'Original currencies',metrics:[],note:''};
}

function monthlyTrialReportModel(){
 const s=Reports79,months=summaryPeriod14331.monthRange([s.from.slice(0,7),s.to.slice(0,7)]);
 const entries=reportWindow143195.cachedLedger();
 if(!entries)throw Error('The posted journal for this comparison has not finished loading.');
 return monthlyTrialModel(entries,months,{...monthlyTrialPreferences(),from:s.from,to:s.to,currency:s.currency,basis:s.basis,direction:reportSort143153('tb').direction});
}
function monthlyTrialTable(model,print=false){
 const {months,subheads,values,totalCount}=model,width=subheads.length,span=print?(width===1?5:2):months.length,tables=[];
 if(!values.length)return '<p class="r79-note">No accounts match this selection.</p>';
 for(let first=0;first<months.length;first+=span){
  const part=months.slice(first,first+span),labels=part.map((m,i)=>'<th colspan="'+width+'" scope="colgroup"'+(model.rateDates?' data-as-of="'+re79(model.rateDates[first+i])+'"':'')+'><span>'+re79(model.rateDates?formatAppDate(model.rateDates[first+i]):summaryPeriod14331.monthLabel(m))+'</span></th>').join('');
  const headers=part.map(()=>subheads.map((h,j)=>'<th scope="col"'+(j===0?' class="month-start"':'')+'>'+h+'</th>').join('')).join('');
  const rowHTML=row=>'<tr><th scope="row" title="'+re79(row[0])+'">'+re79(row[0])+'</th>'+row.slice(1+first*width,1+(first+part.length)*width).map((value,j)=>'<td'+(j%width===0?' class="month-start"':'')+'>'+re79(value)+'</td>').join('')+'</tr>';
  const split=values.length-totalCount;
  tables.push('<table class="monthly-trial-table" aria-label="Monthly comparative trial balance" data-own-pager14383="1"><thead><tr><th scope="col" rowspan="2">Accounts</th>'+labels+'</tr><tr>'+headers+'</tr></thead><tbody>'+values.slice(0,split).map(rowHTML).join('')+'</tbody><tfoot>'+values.slice(split).map(rowHTML).join('')+'</tfoot></table>');
 }
 return print?tables.join(''):'<div class="monthly-trial-scroll">'+tables.join('')+'</div>';
}

function openMonthlyTrialBalance(panel,scope){
 const dialog=panel.closest('dialog'),header=dialog.querySelector('header'),close=header.querySelector('.close');
 close.classList.add('je-btn','je-btn-secondary');close.textContent='Close';
 const prefs=monthlyTrialPreferences(),calendar=summaryPeriod14331;
 const basisControl='<label>Currency view<select data-plain14285 name="trialBasis"><option value="original">Original currencies</option><option value="reporting">Reporting · LAK</option></select></label>';
 close.insertAdjacentHTML('beforebegin','<button type="button" class="je-btn je-btn-secondary" data-period aria-haspopup="dialog">Period</button>'+basisControl+monthlyTrialColumnControl(prefs.columns)+'<div data-accounts></div><button type="button" class="je-btn je-btn-secondary" data-refresh>Refresh</button>');
 const period=header.querySelector('[data-period]'),columns=header.querySelector('[name=trialColumns]'),accountPicker=header.querySelector('[data-accounts]');
 const basis=header.querySelector('[name=trialBasis]');basis.value=prefs.basis;
 const status=document.createElement('small');header.querySelector('h2').append(status);
 let entries,months,allMonths;
 function draw(){
  period.textContent=calendar.label(months);period.setAttribute('aria-label','Period · '+period.textContent);
  panel.innerHTML=monthlyTrialTable(monthlyTrialModel(entries,months,prefs));
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
   });
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

/* Desktop accounting shortcuts. Queries start only after the user chooses a tool. */
window.RailTools379=(()=>{
 'use strict';
 const esc=v=>escapeHtml(String(v??''));
 const amt=n=>Math.abs(n/100).toLocaleString(appNumberLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});
 const signed=n=>n<0?'('+amt(n)+')':amt(n);
 const option=(v,label)=>'<option value="'+esc(v)+'">'+esc(label)+'</option>';
 function outside(box,close){
  const beyond=e=>{const r=box.getBoundingClientRect();return e.target===box&&(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom);};
  let started=false;
  box.addEventListener('pointerdown',e=>{started=beyond(e);});
  box.addEventListener('click',e=>{if(started&&beyond(e))close();started=false;});
 }
 function localRows(a){
  const win=yearWindow14333.state();
  if(!win.revision14341||yearWindow14333.loading)throw Error('The device journal is incomplete. Reconnect to read this ledger.');
  return {win,rows:JournalModule.entries.filter(l=>l.accountId===a.id&&!l.voided_at&&(!l.status||l.status==='posted'))};
 }
 function journalRows(lines,month,initial=0){
  const opening=l=>l.annualOpening||/^Annual opening balances |^Opening Balances$/.test(l.generalMemo||'');
  const chronological=[...lines].sort((a,b)=>a.date.localeCompare(b.date)||Number(!!opening(b))-Number(!!opening(a)));
  let balance=initial,start=initial,dr=0,cr=0,year='';
  const detail=[],firstYear=month?.slice(0,4)||chronological[0]?.date.slice(0,4);
  for(const l of chronological){
   const book=l.date.slice(0,4),period=l.date.slice(0,7);
   if(month&&period>month)break;
   if(month&&book!==firstYear)continue;
   if(year&&book!==year)balance=0;
   year=book;
   const debit=cents69(l.debit),credit=cents69(l.credit),isOpening=opening(l);
   balance+=debit-credit;
   if(month&&period<month){start=balance;continue}
   if(isOpening){if(book===firstYear)start+=debit-credit}
   else{dr+=debit;cr+=credit}
   detail.push({l,debit,credit,balance,isOpening});
  }
  return {detail,start,dr,cr,balance};
 }
 const ledgerHeadings=['Date','Entry ID','Description','Debit','Credit','Running balance'];
 function ledgerCells({l,debit,credit,balance,isOpening}){
  const memo=l.memo||l.generalMemo||(isOpening?'Opening balance':'');
  return [formatAppDate(l.date),l.id,memo,amt(debit),amt(credit),signed(balance)];
 }
 function ledgerSummary(r){
  return [['Opening balance',signed(r.start)],['Total debit',amt(r.dr)],['Total credit',amt(r.cr)],['Closing balance',signed(r.balance)]];
 }
 function ledger(panel,scope){
  const header=panel.previousElementSibling,close=header.querySelector('.close');
  close.insertAdjacentHTML('beforebegin','<div class="ledger-search379"><span role="searchbox" contenteditable="plaintext-only" aria-label="Search accounts" aria-placeholder="Search accounts" spellcheck="false" data-placeholder="Search accounts"></span><div class="ledger-matches379" hidden></div></div><select aria-label="Ledger month"></select><button type="button" data-refresh>Refresh</button><button type="button" data-editor>Open in editor</button>');
  panel.innerHTML='<div class="ledger-tabs379" role="group" aria-label="Open ledgers"></div><section class="ledger-detail379" aria-live="polite"></section>';
  const input=header.querySelector('[role=searchbox]'),matches=header.querySelector('.ledger-matches379'),picker=header.querySelector('select'),refresh=header.querySelector('[data-refresh]');
  const editor=header.querySelector('[data-editor]');
  const tabs=panel.querySelector('.ledger-tabs379'),detail=panel.querySelector('section');
  const accounts=AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.is_posting!==false).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  const key='ledger-tabs381:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+liveProfile.id;
  const views=[],request=scope.begin(),today=appLocalDate().slice(0,7);
  let active;
  function newView(account,month=''){return {account,month,page:0,selectedRow:null,lines:null,revision:0};}
  try{
   const saved=JSON.parse(localStorage.getItem(key)||'{}');
   for(const item of (Array.isArray(saved.tabs)?saved.tabs:[]).slice(0,10)){
    const account=accounts.find(a=>a.id===item?.id);
    if(account&&!views.some(v=>v.account===account))views.push(newView(account,item.month===''||/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month)?item.month:today));
   }
   active=views.find(v=>v.account.id===saved.active)||views[0];
  }catch{}
  function remember(){try{localStorage.setItem(key,JSON.stringify({active:active?.account.id,tabs:views.map(v=>({id:v.account.id,month:v.month}))}));}catch{}}
  function drawTabs(){
   tabs.replaceChildren();
   for(const view of views){
    const tab=document.createElement('span'),choose=document.createElement('button'),remove=document.createElement('button');
    choose.type=remove.type='button';choose.textContent=view.account.code;choose.title=view.account.name;
    choose.setAttribute('aria-pressed',String(view===active));choose.onclick=()=>activate(view);
    remove.textContent='×';remove.setAttribute('aria-label','Close ledger '+view.account.code);
    remove.onclick=()=>{const i=views.indexOf(view);views.splice(i,1);if(active===view)activate(views[i]||views[i-1]);else{remember();drawTabs();}};
    tab.append(choose,remove);tabs.append(tab);
   }
  }
  function activate(view){
   active=view;remember();drawTabs();draw();
   if(view&&!view.lines&&!view.busy)void read(view);
  }
  function search(){
   const term=input.textContent.toLowerCase().trim();matches.replaceChildren();matches.hidden=!term;
   if(!term)return;
   const found=accounts.filter(a=>(a.code+' '+a.name+' '+a.currency).toLowerCase().includes(term));
   for(const a of found.slice(0,15)){
    const b=document.createElement('button');b.type='button';b.textContent=a.code+' · '+a.name+' ('+a.currency+')';
    b.onclick=()=>{
     let view=views.find(v=>v.account.id===a.id);
     if(!view&&views.length===10){matches.textContent='Close a ledger tab to open another account.';return;}
     if(!view){view=newView(a);views.push(view);}
     input.textContent='';matches.hidden=true;activate(view);
    };matches.append(b);
   }
   if(!found.length)matches.textContent='No matching accounts.';
  }
  input.oninput=search;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();matches.querySelector('button')?.click();}else if(e.key==='Escape'&&!matches.hidden){e.preventDefault();matches.hidden=true;}else if(e.key==='ArrowDown'){e.preventDefault();matches.querySelector('button')?.focus();}};
  input.onfocus=search;
  header.querySelector('.ledger-search379').onfocusout=e=>{if(!e.currentTarget.contains(e.relatedTarget))matches.hidden=true;};
  picker.onchange=()=>{active.month=picker.value;active.page=0;active.selectedRow=null;remember();draw();};
  refresh.onclick=()=>{for(const view of views)void read(view);};
  async function read(view){
   const a=view.account,revision=++view.revision;view.busy=true;view.error='';if(active===view)draw();
   const current=()=>scope.current(request)&&views.includes(view)&&revision===view.revision;
   try{
    let coverage=null,rows,source;const offline=window.offline14239?.offline();
    if(offline){
     const all=window.reportWindow143195?.cachedLedger?.();
     const local=localRows(a);
     rows=[...(all||[]).filter(l=>l.accountId===a.id&&(l.date<local.win.from||l.date>local.win.to)),...local.rows];
     if(!all)coverage=local.win;
     source=all?'Offline · downloaded history':'Downloaded period only · '+formatAppDate(local.win.from)+' – '+formatAppDate(local.win.to);
    }else{
     rows=await scope.rpc('account_ledger379',{p_account:a.id},request);if(!scope.current(request))return;
     if(!Array.isArray(rows))throw Error('Incomplete ledger response.');
     source='Posted journal';
     const pending=window.journalDurable14385?.pending().some(j=>(j.status!=='saved'||j.changes?.some(op=>op.status!=='saved'))&&[...(j.entries||[]),...(j.changes||[]).flatMap(op=>[op.expected,op.value].filter(Boolean))].some(e=>e.lines?.some(l=>l.account_id===a.id)));
     if(pending){const local=localRows(a);rows=[...rows.filter(l=>l.date<local.win.from||l.date>local.win.to),...local.rows];source='Includes active journal changes saved on this device';}
    }
    if(!current())return;
    if(rows.some(l=>l.currency!==a.currency))throw Error('Review mismatched currencies for this account.');
    if(coverage&&view.month&&(view.month<coverage.from.slice(0,7)||view.month>coverage.to.slice(0,7)))view.month=coverage.to.slice(0,7);
    Object.assign(view,{lines:rows,source,coverage,page:0,selectedRow:null});
   }catch(e){if(current())view.error=e.message||'Could not load the ledger.';}
   finally{if(current()){view.busy=false;if(active===view)draw();}}
  }
  function amounts(view){
   const opening=view.coverage?.opening?.find(b=>String(b.accountId)===String(view.account.id)&&b.currency===view.account.currency);
   const useOpening=opening&&(!view.month||view.month.slice(0,4)===view.coverage.from.slice(0,4));
   return journalRows(view.lines,view.month,useOpening?cents69(opening.balance):0);
  }
  function periodLabel(view){
   if(view.month)return summaryPeriod14331.monthLabel(view.month);
   if(view.coverage)return formatAppDate(view.coverage.from)+' – '+formatAppDate(view.coverage.to);
   if(!view.lines.length)return 'All months';
   const days=view.lines.map(l=>l.date).sort();
   return formatAppDate(days[0])+' – '+formatAppDate(days.at(-1));
  }
  editor.onclick=async()=>{
   if(!scope.current(request)||!active?.lines||active.busy||active.error)return;
   if(!access113.can('report-gl','export')||!access113.can('report-gl','view'))return showCenterStatus('Ledger view and export access are required.',true);
   const view=active,r=amounts(view),summary=ledgerSummary(r);
   const name=view.account.code+' · '+view.account.name+' ('+view.account.currency+')',period=periodLabel(view);
   const title='Account ledger · '+name+' · '+period;
   const html='<h1>Account ledger</h1><h2>'+esc(name)+'</h2><p>'+esc(period+' · '+view.source)+'</p>'+
    reports14254.table(summary.map(pair=>pair[0]),[summary.map(pair=>pair[1])],[25,25,25,25],{numeric:[0,1,2,3]})+
    reports14254.table(ledgerHeadings,r.detail.map(ledgerCells),[13,16,29,13,13,16],{numeric:[3,4,5]})+
    (r.detail.length?'':'<p>No postings in this period.</p>')+
    (r.detail.some(row=>row.isOpening)?'<p>Annual opening entries establish the opening balance and are excluded from debit and credit turnover.</p>':'')+
    printSignatures1424({enabled:true,prepared:liveProfile.full_name||liveProfile.email,receiver:'',approver:''});
   const actor=liveProfile.id,client=ojmDb;
   panel.closest('dialog').close();
   try{
    await openDocumentEditor105({title,category:'Reports',source:'report-gl',printPreview:true,approvedLayout14254:true,settings:reports14254.settings(),html});
   }catch(e){if(liveProfile?.id===actor&&ojmDb===client)showCenterStatus(e.message||'The ledger could not open in the editor.',true)}
  };
  function draw(){
   editor.disabled=!active?.lines||active.busy||!!active.error||!access113.can('report-gl','export');
   picker.disabled=!active||!active.lines||active.busy;refresh.disabled=!views.length;
   if(!active||active.busy||active.error||!active.lines){
    picker.innerHTML=option(active?.month||'',active?.month?summaryPeriod14331.monthLabel(active.month):'All months');
    detail.textContent=active?(active.error||'Loading ledger…'):'';
    if(active?.error)retry(detail,()=>read(active));return;
   }
   const {account:selected,month,lines,coverage,source}=active;
   const dates=lines.map(l=>l.date.slice(0,7));
   const bounds=coverage?[coverage.from.slice(0,7),coverage.to.slice(0,7)]:[today.slice(0,4)+'-01',today,...dates].sort();
   const months=[];
   for(let m=bounds.at(-1);m>=bounds[0];){
    months.push(m);
    const [year,number]=m.split('-').map(Number);
    m=number===1?(year-1)+'-12':year+'-'+String(number-1).padStart(2,'0');
   }
   const r=amounts(active),pages=entryPageRanges14340(r.detail,row=>row.l.dbEntryId||row.l.id);
   const page=active.page=Math.min(active.page,pages.length-1),[start,end]=pages[page],data=r.detail.slice(start,end);
   picker.innerHTML=option('',coverage?'All downloaded months':'All months')+months.map(m=>option(m,summaryPeriod14331.monthLabel(m))).join('');picker.value=month;
   const summary='<div class="ledger-stats379">'+ledgerSummary(r).map(([k,v])=>'<div><small>'+esc(k)+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div>';
   const rows=data.map((row,i)=>'<tr tabindex="0" data-line="'+(start+i)+'" class="'+(active.selectedRow===start+i?'selected':'')+'">'+ledgerCells(row).map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
   const paging=pages.length>1?'<footer class="ledger-page-controls" aria-label="Ledger pagination"><button data-prev>Previous</button><span>'+String(start+1)+'–'+end+' of '+r.detail.length+'</span><button data-next>Next</button></footer>':'';
   detail.innerHTML='<h3>'+esc(selected.code+' · '+selected.name+' ('+selected.currency+')')+'</h3>'+
    '<div class="watch-scroll"><table class="ledger-lines379"><thead><tr>'+ledgerHeadings.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+(rows||'<tr><td colspan="6">No postings in this period.</td></tr>')+'</tbody></table></div>'+
    paging+summary+'<p>'+esc(source)+(r.detail.some(row=>row.isOpening)?' · Annual opening entries are excluded from turnover.':'')+'</p>';
   const highlight=e=>{const row=e.target.closest('[data-line]');if(!row)return;
    detail.querySelector('tr.selected')?.classList.remove('selected');row.classList.add('selected');active.selectedRow=Number(row.dataset.line);};
   detail.onclick=highlight;detail.onkeydown=e=>{if(e.target.matches('[data-line]')&&['Enter',' '].includes(e.key)){e.preventDefault();highlight(e);}};
   for(const [selector,step] of [['[data-prev]',-1],['[data-next]',1]]){const b=detail.querySelector(selector);if(b){b.disabled=page+step<0||page+step>=pages.length;b.onclick=()=>{active.page+=step;draw();};}}
  }
  activate(active);
 }
 function retry(node,fn){const b=document.createElement('button');b.type='button';b.textContent='Retry';b.onclick=fn;node.append(' ',b);}
 function differences(panel,scope){
  const header=panel.previousElementSibling;
  header.querySelector('.close').insertAdjacentHTML('beforebegin','<select aria-label="Reconciliation month"></select><button type="button" data-refresh>Refresh</button>');
  const picker=header.querySelector('select'),refresh=header.querySelector('[data-refresh]');
  let month='',openMonths=[],saved=[],initial;
  async function read(reload=false){
   const request=scope.begin();panel.textContent='Checking reconciliation differences…';
   try{
    let work;
    if(reload||!initial){
     const [live,history,local]=await Promise.all([
      scope.rpc('reconciliation_differences379',{p_month:null},request),
      scope.rpc('reconciliation_records305',{},request),
      reportStore71('readonly',store=>store.getAll()).catch(()=>[])
     ]);
     if(!scope.current(request))return;
     if(!Array.isArray(live?.months)||!Array.isArray(history))throw Error('Incomplete reconciliation response.');
     initial=live;openMonths=live.months.map(m=>m.month);
     const records=new Map(local.filter(r=>r?.owner===reportOwner71()).map(r=>[reconciliationKey71(r),r]));
     for(const r of history)records.set(reconciliationKey71(r),r);
     saved=latestReconciliations306([...records.values()].filter(r=>r.from&&r.account&&reconciliationRecorded71(r)));
    }
    const months=[...new Set([...openMonths,...saved.map(r=>r.from.slice(0,7))])].sort().reverse();
    if(!months.includes(month))month=initial.month||months[0]||'';
    picker.innerHTML=months.map(m=>option(m,summaryPeriod14331.monthLabel(m))).join('');picker.value=month;picker.disabled=!months.length;
    const history=!openMonths.includes(month);
    if(history){
     work={rows:saved.filter(r=>r.from.slice(0,7)===month).map(r=>{
      const c=reportCalculation71(r);return {...r.account,currency:r.currency,method:r.method,book:r.closing,actual:c.statement,outstanding:c.outstanding,difference:c.difference};
     })};
    }else work=month===initial.month&&reload?initial:await scope.rpc('reconciliation_differences379',{p_month:month+'-01'},request);
    if(!scope.current(request))return;
    if(!Array.isArray(work?.rows))throw Error('Incomplete reconciliation response.');
    panel.innerHTML=(history&&month?'<h3>Saved reconciliations</h3>':'')+(work.rows.length?'<div class="watch-scroll"><table><thead><tr><th>Account</th><th>Book balance</th><th>Statement / count</th><th>Outstanding</th><th>Difference</th></tr></thead><tbody>'+work.rows.map(r=>'<tr><th scope="row">'+esc(r.name)+'<small>'+esc(r.code+' · '+r.currency)+(r.changed?' · Review updated ledger':'')+'</small></th><td>'+esc(signed(r.book))+'</td><td>'+esc(r.actual==null?({cash:'Awaiting count',bank:'Awaiting statement',balance:'Awaiting balance'}[r.method]||'Awaiting balance'):signed(r.actual))+'</td><td>'+esc(r.actual==null?'—':signed(r.outstanding))+'</td><td>'+esc(r.difference==null?'—':signed(r.difference))+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+(month?'No outstanding reconciliation differences for this book.':'No reconciliation periods available.')+'</p>');
   }catch(e){if(scope.current(request)){panel.textContent=e.message||'Could not load reconciliations.';retry(panel,()=>read(true));}}
  }
  picker.onchange=()=>{month=picker.value;void read();};
  refresh.onclick=()=>read(true);void read(true);
 }
 function install(root,session){
  let active;
  function close(){if(active){active.request?.abort();active.dialog.close();active.dialog.remove();active=null;}window.hrCalendar14306?.closeRail?.();}
  for(const button of root.querySelectorAll('[data-rail-tool]'))button.onclick=()=>{
   const id=session(),client=ojmDb,kind=button.dataset.railTool;
   if(!id||window.workspaceRequest138?.target)return;
   close();
   if(kind==='calendar'){void hrCalendar14306.openRail();return;}
   const target={ledger:'report-open-gl','trial-months':'report-tb',differences:'report-reconciliation'}[kind];
   if(!target||!canAccessAppTarget(target))return showCenterStatus('Access to this report is required.',true);
   const box=document.createElement('dialog'),name=button.getAttribute('aria-label'),state={dialog:box};active=state;
   box.className='watch-dialog';box.setAttribute('aria-label',name);box.innerHTML='<header><h2>'+esc(name)+'</h2><button class="close" aria-label="Close" type="button">×</button></header><div class="watch-body"></div>';
   if(kind==='trial-months'){
    box.className='monthly-trial-dialog';
    document.body.append(box);
   }else root.append(box);
   box.showModal();box.querySelector('.close').onclick=()=>box.close();outside(box,()=>box.close());
   box.addEventListener('close',()=>{state.request?.abort();box.remove();if(active===state){active=null;button.focus();}},{once:true});
   const scope={begin(){state.request?.abort();return state.request=new AbortController();},current(q){return active===state&&q===state.request&&box.open&&id===session()&&client===ojmDb&&!window.workspaceRequest138?.target;},
    async rpc(name,args,q){const result=await client.schema('public').rpc(name,args).abortSignal(q.signal);if(result.error)throw result.error;return result.data;}};
   const show={ledger,differences,'trial-months':openMonthlyTrialBalance}[kind];
   show(box.querySelector('.watch-body'),scope);
  };
  return close;
 }
 return {install,outside};
})();

// Created only when the bank tab is opened. The lookup does not read or write the books.
function createBcelRatePanel(dialog, preferenceKey, valid) {
 const defaults = 'https://www.bcel.com.la/bcel/exchange-rate.html?lang=en';
 const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Vientiane'}).format(new Date());
 const panel = dialog.querySelector('#fx-bank-panel');
 const settingsKey = preferenceKey + ':bcel-source', cacheKey = preferenceKey + ':bcel-quotes';
 function saved(key) { try { return localStorage.getItem(key); } catch { return null; } }
 function sourceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['www.bcel.com.la','bcel.com.la'].includes(url.hostname) || url.port || url.username || url.password || url.pathname.replace(/\/{2,}/g,'/') !== '/bcel/exchange-rate.html') throw Error('Use BCEL’s official HTTPS exchange-rate page.');
  const source = new URL(defaults);
  if (url.searchParams.get('lang') === 'la') source.searchParams.set('lang','la');
  const d = url.searchParams.get('exDate'), r = url.searchParams.get('round');
  if (d) {
   const time = Date.parse(d + 'T00:00:00Z');
   if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== d || d > today) throw Error('Use a BCEL link with a valid rate date.');
   source.searchParams.set('exDate',d);
  }
  if (r) {
   if (!/^[1-9]\d{0,3}$/.test(r)) throw Error('Use a valid BCEL round number.');
   source.searchParams.set('round',r);
  }
  return source;
 }
 let source;
 try { source = sourceUrl(saved(settingsKey) || defaults); } catch { source = new URL(defaults); }
 let cache;
 try { cache = JSON.parse(saved(cacheKey)); } catch {}
 if (!Array.isArray(cache)) cache = [];
 let request = null;
 panel.innerHTML = `<form class="fx-source" hidden><label>BCEL source link<input name="source" type="url" required></label><div class="watch-toolbar"><button type="button" data-cancel>Cancel</button><button type="submit">Save source</button></div><small role="status"></small></form>
 <div class="fx-filters"><label>Rate date<input type="date" name="date" required></label><label>Round<select name="round"></select></label><a data-source-link target="_blank" rel="noopener noreferrer">View BCEL source ↗</a></div>
 <p data-bank-status role="status"></p><div class="watch-scroll" data-quotes></div>`;
 const form = panel.querySelector('form'), day = panel.querySelector('[name=date]'), round = panel.querySelector('[name=round]');
 const sourceLink = panel.querySelector('[data-source-link]'), status = panel.querySelector('[data-bank-status]'), result = panel.querySelector('[data-quotes]');
 const settingsButton = dialog.querySelector('[data-bank-settings]');
 day.max = today;
 function rounds(available, selected) {
  round.replaceChildren(new Option('Latest',''), ...available.map(n => new Option(n,n)));
  round.value = selected;
 }
 function resetDate() {
  day.value = source.searchParams.get('exDate') || today;
  const initial = source.searchParams.get('round') || '';
  rounds(initial ? [initial] : [], initial);
 }
 function updateLink(effectiveRound) {
  const link = new URL(source);
  if (day.value) link.searchParams.set('exDate',day.value); else link.searchParams.delete('exDate');
  if (effectiveRound) link.searchParams.set('round',effectiveRound); else link.searchParams.delete('round');
  sourceLink.href = link.href;
 }
 function render(data, fromCache) {
  rounds(data.rounds, round.value);
  updateLink(data.round);
  const checked = new Date(data.checkedAt);
  const checkedDate = checked.toLocaleDateString('sv-SE',{timeZone:'Asia/Vientiane'});
  const checkedTime = checked.toLocaleTimeString('en-GB',{timeZone:'Asia/Vientiane',hour:'2-digit',minute:'2-digit'});
  status.textContent = `${formatAppDate(data.date)} · Round ${data.round} · LAK per foreign unit · ${fromCache ? 'Saved copy, checked' : 'Checked'} ${formatAppDate(checkedDate)} ${checkedTime} (Laos)`;
  const esc = v => escapeHtml(String(v ?? '—'));
  const rows = data.quotes.map(q => `<tr><th scope="row">${esc(q.code)}<small>${esc(q.name)}</small></th>${[q.note,q.bill,q.eft,q.sell].map(v => '<td>'+esc(v)+'</td>').join('')}</tr>`);
  result.innerHTML = '<table aria-label="BCEL exchange rates in Lao kip"><thead><tr><th scope="col">Currency</th><th scope="col">Buy · Note</th><th scope="col">Buy · Bill</th><th scope="col">Buy · EFT</th><th scope="col">Sell</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
 }
 function cancel() { request?.abort(); request = null; }
 async function load(refresh = false) {
  cancel(); if (!valid() || panel.hidden) return;
  const date = day.value, choice = round.value;
  const cacheId = date + '/' + choice;
  const cached = cache.find(item => item?.key === cacheId && item.data?.date === date && Array.isArray(item.data.quotes) && Array.isArray(item.data.rounds));
  result.replaceChildren(); updateLink(choice);
  if (!day.validity.valid) { status.textContent = 'Choose a rate date through today.'; return; }
  if (cached && !refresh) { render(cached.data, true); return; }
  if (!navigator.onLine) {
   if (cached) render(cached.data, true);
   status.textContent = cached ? status.textContent+' · Offline' : 'Offline. No saved BCEL rate for this date and round.';
   return;
  }
  const controller = new AbortController(); request = controller;
  const timeout = setTimeout(() => controller.abort(), 25000);
  const current = () => request === controller && valid() && !panel.hidden;
  status.textContent = 'Checking BCEL…';
  try {
   const endpoint = new URL(window.OJM_SUPABASE_URL + '/functions/v1/bcel-rates');
   endpoint.searchParams.set('date', date);
   if (choice) endpoint.searchParams.set('round', choice);
   // Only the public project key is used for public bank data.
   const key = window.OJM_SUPABASE_ANON_KEY;
   const response = await fetch(endpoint, {signal:controller.signal, cache:'no-store', headers:{apikey:key, Authorization:'Bearer '+key}});
   if (!response.ok) throw Error('The lookup is unavailable.');
   const data = await response.json();
   if (!current()) return;
   if (data.status === 'unavailable' && data.date === date) {
    cache = cache.filter(item => item?.key !== cacheId);
    try { localStorage.setItem(cacheKey,JSON.stringify(cache)); } catch {}
    status.textContent = 'No confirmed BCEL rate for '+formatAppDate(date)+(choice ? ', round '+choice : '')+'.'; return;
   }
   if (data.status !== 'published' || data.date !== date || (choice && data.round !== choice) || !data.quotes?.length || !data.rounds?.includes(data.round)) throw Error('Unconfirmed result.');
   render(data, false);
   cache = [{key:cacheId,data}, ...cache.filter(item => item?.key !== cacheId)].slice(0,16);
   try { localStorage.setItem(cacheKey,JSON.stringify(cache)); } catch { /* The online result is still available. */ }
  } catch {
   if (!current()) return;
   if (cached) render(cached.data, true);
   status.textContent = (cached ? status.textContent+' · ' : '')+'Could not reach or verify BCEL. Try Refresh or View BCEL source.';
  } finally { clearTimeout(timeout); if (request === controller) request = null; }
 }
 function toggleSettings(open) {
  form.hidden = !open; settingsButton.setAttribute('aria-expanded',String(open));
  if (open) { form.elements.source.value = source.href; form.querySelector('small').textContent = ''; form.elements.source.focus(); }
  else settingsButton.focus();
 }
 settingsButton.onclick = () => toggleSettings(form.hidden);
 form.querySelector('[data-cancel]').onclick = () => toggleSettings(false);
 form.onsubmit = event => {
  event.preventDefault(); if (!valid()) return;
  let next;
  try { next = sourceUrl(form.elements.source.value.trim()); }
  catch (e) { form.querySelector('small').textContent = e.message || 'Use BCEL’s official exchange-rate link.'; return; }
  try { localStorage.setItem(settingsKey,next.href); } catch { form.querySelector('small').textContent = 'This device could not save the source.'; return; }
  source = next; resetDate(); toggleSettings(false); load();
 };
 day.onchange = () => { rounds([], ''); load(); };
 round.onchange = () => load();
 dialog.querySelector('[data-bank-refresh]').onclick = () => load(true);
 resetDate();
 return {load, cancel};
}

// The rail registers click handlers at startup. Only an open dialog reads accounts or journal lines.
window.AccountWatch378=(()=>{
 'use strict';
 const groups=['Clearing','Assets','Liabilities'];
 const escape=v=>escapeHtml(String(v??''));
 const currency=a=>a.currency||a.currency_code;
 function choices(rates){
  return AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.is_posting!==false&&a.active!==false&&a.is_active!==false&&
    (rates?ForeignFunds14386.tracked(a):!['NA','__PARENT__'].includes(currency(a)))).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
 }
 function suggested(a,group){
  if(group==='Clearing')return /clear(ing)?|settlement/i.test(a.name);
  if(group==='Rates')return ['ASSET','LIABILITY'].includes(a.baseType||a.type)&&!a.isTechnical;
  return (a.baseType||a.type)===(group==='Assets'?'ASSET':'LIABILITY');
 }
 function figures(accounts,lines,through,rates){
  const year=through.slice(0,4),month=through.slice(0,7),map=new Map(accounts.map(account=>[account.id,{account,currency:currency(account),debit:0,credit:0,closing:0,baseClosing:0,missingRates:0,days:new Map()}]));
  for(const l of lines){
   const r=map.get(l.accountId),day=l.date;
   if(!r||!day||day>through||l.voided_at||(l.status&&l.status!=='posted'))continue;
   if(rates&&l.currency===r.currency&&['reference','equivalent','valuation'].includes(l.fxRateKind288)&&Number(l.fx_rate_lak)>0&&(!r.vrDate||day>=r.vrDate)){
    r.vrDate=day;r.vr=Number(l.fx_rate_lak);
   }
   if(day.slice(0,4)!==year)continue;
   if(l.currency!==r.currency){r.currencyMismatch=true;continue;}
   const dr=cents69(l.debit),cr=cents69(l.credit);
   if(day.startsWith(month)&&!l.annualOpening&&!/^Annual opening balances |^Opening Balances$/.test(l.generalMemo||'')){r.debit+=dr;r.credit+=cr;}
   r.closing+=dr-cr;
   if(!rates)continue;
   const bd=JournalFX14383.base(l,'debit'),bc=JournalFX14383.base(l,'credit');
   const d=r.days.get(day)||{qty:0,value:0,missing:0};d.qty+=dr-cr;
   if(l.valuationMissing||bd==null||bc==null||l.currency!==r.currency)d.missing++;
   else d.value+=cents69(bd)-cents69(bc);
   r.days.set(day,d);
  }
  if(rates)for(const r of map.values()){
   let quantity=0,previous=null;
   for(const day of [...r.days.keys()].sort()){
    const d=r.days.get(day);quantity+=d.qty;r.baseClosing+=d.value;r.missingRates+=d.missing;
    const rate=!r.missingRates&&quantity&&r.baseClosing/quantity>0?r.baseClosing/quantity:null;
    if(rate!==previous){r.bookDate=rate?day:null;previous=rate;}
   }
  }
  return [...map.values()];
 }
 function deviceLines(through){
  const w=window.yearWindow14333?.state();
  if(!w||window.yearWindow14333.loading||!w.revision14341||w.from>through.slice(0,4)+'-01-01'||w.to<through)
   throw Error('A complete journal for this year is unavailable on this device.');
  return [...JournalModule.entries].sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.dbEntryId||a.id).localeCompare(String(b.dbEntryId||b.id)));
 }
 function install(root,session){
  let active=null;
  function close(){if(active){active.controller?.abort();active.bank?.cancel();if(active.dialog.open)active.dialog.close();active.dialog.remove();active=null;}}
  function open(rates,trigger){
   close();const owner=session(),db=ojmDb;
   if(!owner||window.workspaceRequest138?.target)return;
   const dialog=document.createElement('dialog'),state={dialog,controller:null};active=state;
   const valid=()=>active===state&&dialog.open&&owner===session()&&db===ojmDb&&!window.workspaceRequest138?.target;
   const name=rates?'Foreign account rates':'Account balances',key='account-watch378:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+owner;
   let group=rates?'Rates':'Clearing',list=choices(rates);
   const prefs=()=>{try{return JSON.parse(localStorage.getItem(key))||{};}catch{return {};}};
   if(!rates&&groups.includes(prefs().lastGroup))group=prefs().lastGroup;
   const selected=()=>{const saved=prefs()[group];return Array.isArray(saved)?list.filter(a=>saved.includes(a.id)):list.filter(a=>suggested(a,group)).slice(0,8);};
   dialog.className='watch-dialog';dialog.setAttribute('aria-label',name);
   dialog.innerHTML='<header><h2>'+name+'</h2><div class="watch-toolbar">'+(rates?'':'<label>Group <select>'+groups.map(g=>'<option>'+g+'</option>').join('')+'</select></label>')+'<button data-edit type="button">Edit accounts</button><button data-refresh type="button">Refresh</button></div><button class="close" aria-label="Close" type="button">×</button></header><div class="watch-body"></div>';
   const body=dialog.querySelector('.watch-body'),toolbar=dialog.querySelector('.watch-toolbar');
   if(rates){
    dialog.classList.add('fx-dialog');dialog.setAttribute('aria-label','Exchange rates');
    dialog.querySelector('h2').textContent='Exchange rates';
    toolbar.classList.add('account-tools');
    toolbar.insertAdjacentHTML('afterend','<div class="watch-toolbar" data-bank-tools hidden><button type="button" data-bank-settings aria-expanded="false">Source settings</button><button type="button" data-bank-refresh>Refresh</button></div>');
    body.insertAdjacentHTML('beforebegin','<div class="fx-tabs" role="tablist" aria-label="Exchange rates"><button type="button" role="tab" id="fx-account-tab" aria-controls="fx-account-panel" aria-selected="true">Foreign account rates</button><button type="button" role="tab" id="fx-bank-tab" aria-controls="fx-bank-panel" aria-selected="false" tabindex="-1">BCEL bank rates</button></div>');
    body.id='fx-account-panel';body.setAttribute('role','tabpanel');body.setAttribute('aria-labelledby','fx-account-tab');
    body.insertAdjacentHTML('afterend','<div class="watch-body" id="fx-bank-panel" role="tabpanel" aria-labelledby="fx-bank-tab" hidden></div>');
    const bankPanel=dialog.querySelector('#fx-bank-panel'),bankTools=dialog.querySelector('[data-bank-tools]');
    const tabs=[...dialog.querySelectorAll('[role=tab]')];
    function selectTab(tab){
     if(!valid()||tab.getAttribute('aria-selected')==='true')return;
     const bank=tab.id==='fx-bank-tab';body.hidden=bank;bankPanel.hidden=!bank;bankTools.hidden=!bank;
     dialog.classList.toggle('bank-open',bank);
     for(const t of tabs){t.tabIndex=t===tab?0:-1;t.setAttribute('aria-selected',String(t===tab));}
     if(bank){state.bank??=createBcelRatePanel(dialog,key,valid);state.bank.load();}else state.bank?.cancel();
    }
    for(const tab of tabs){
     tab.onclick=()=>selectTab(tab);
     tab.onkeydown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs[1]:tabs.find(t=>t!==tab);
      next.focus();selectTab(next);
     };
    }
   }
   const date=d=>d?formatAppDate(d):'—';
   function persist(updates){try{localStorage.setItem(key,JSON.stringify({...prefs(),...updates}));return true;}catch{body.textContent='This device could not save your account selection.';return false;}}
   function cancelRead(){state.controller?.abort();state.controller=null;}
   async function show(){
    if(!valid())return;cancelRead();toolbar.hidden=false;
    const picks=selected(),today=appLocalDate();
    if(!picks.length){body.textContent='Choose Edit accounts to add accounts to this list.';return;}
    const controller=new AbortController();state.controller=controller;
    const current=()=>valid()&&state.controller===controller;
    body.textContent='Loading '+name.toLowerCase()+'…';
    try{
     let lines,source;
     const pending=window.journalDurable14385?.pending().some(j=>j.status!=='saved'||j.changes?.some(op=>op.status!=='saved'));
     if(pending||window.offline14239?.offline()){
      lines=deviceLines(today);
      source=pending?'Device journal · includes locally saved changes':'Offline · downloaded journal';
     }else{
      const r=await db.schema('public').rpc('account_watch_lines378',{p_accounts:picks.map(a=>a.id),p_as_of:today,p_rates:rates}).abortSignal(controller.signal);
      if(!current())return;
      if(r.error)throw r.error;if(!Array.isArray(r.data))throw Error('Incomplete journal response.');
      lines=r.data;source='Posted journal';
     }
     if(!current())return;
     const totals=figures(picks,lines,today,rates),money=n=>(Math.abs(n)/100).toLocaleString(appNumberLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});
     const heading=rates?['Account','Book rate','BR changed','Valuation rate','Valuation date']:['Account','Total debit','Total credit','Balance'];
     const rows=totals.map(r=>{
      const account='<th scope="row">'+escape(r.account.name)+'<small>'+escape(r.account.code+' · '+r.currency)+'</small></th>';
      if(r.currencyMismatch)return '<tr>'+account+'<td colspan="'+(rates?4:3)+'">Review mismatched journal currencies</td></tr>';
      const br=rates?ForeignFunds14386.average(r):null;
      const balance=r.closing<0?'('+money(r.closing)+') CR':money(r.closing)+(r.closing>0?' DR':'');
      const values=rates?[br,date(typeof br==='string'&&br.includes(' LAK / ')?r.bookDate:null),formatAppRate(r.vr),date(r.vrDate)]:[money(r.debit),money(r.credit),balance];
      return '<tr>'+account+values.map(v=>'<td>'+escape(v)+'</td>').join('')+'</tr>';
     }).join('');
     body.innerHTML='<p>'+escape(source+' · Through '+date(today))+'</p><div class="watch-scroll"><table><thead><tr>'+heading.map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p>'+escape(rates?'Rates are LAK per foreign unit. BR changed is the last effective date the closing book rate changed in this book year. Valuation shows the latest journal rate identified as a valuation.'+(source==='Posted journal'?'':' Valuation history is limited to the downloaded journal.'):'Debit and credit are this month’s activity. Balance includes opening balances and earlier postings.')+'</p>';
    }catch(e){if(current())body.textContent=e.message||'Could not read the journal. Tap Refresh to try again.';}
   }
   function edit(){
    if(!valid())return;cancelRead();toolbar.hidden=true;list=choices(rates);
    const previous=document.createDocumentFragment();
    if(body.textContent.startsWith('Loading '))body.textContent='Tap Refresh to load the selected accounts.';
    previous.append(...body.childNodes);
    const ids=new Set(selected().map(a=>a.id));
    body.innerHTML='<h3>'+escape('Choose accounts · '+group)+'</h3><input type="search" placeholder="Find account by name or code" aria-label="Find account"><div class="watch-options">'+list.map(a=>'<label><input type="checkbox" value="'+escape(a.id)+'" '+(ids.has(a.id)?'checked':'')+'><span>'+escape(a.code+' · '+a.name+' ('+currency(a)+')')+'</span></label>').join('')+'</div><footer><button data-cancel type="button">Cancel</button><button data-save type="button">Save selection</button></footer>';
    const search=body.querySelector('[type=search]');search.oninput=()=>{const term=search.value.toLowerCase();for(const el of body.querySelectorAll('label'))el.hidden=!el.textContent.toLowerCase().includes(term);};
    body.querySelector('[data-save]').onclick=()=>{if(valid()&&persist({[group]:[...body.querySelectorAll(':checked')].map(n=>n.value)}))show();};
    body.querySelector('[data-cancel]').onclick=()=>{toolbar.hidden=false;body.replaceChildren(previous);};search.focus();
   }
   root.append(dialog);dialog.showModal();RailTools379.outside(dialog,close);
   dialog.onclose=()=>{if(active===state)close();if(trigger.isConnected)trigger.focus();};
   dialog.querySelector('.close').onclick=close;
   dialog.querySelector('[data-refresh]').onclick=show;dialog.querySelector('[data-edit]').onclick=edit;
   const select=toolbar.querySelector('select');if(select){select.value=group;select.onchange=()=>{if(valid()){group=select.value;persist({lastGroup:group});show();}};}
   show();
  }
  for(const button of root.querySelectorAll('[data-watch]'))button.onclick=()=>open(button.dataset.watch==='rates',button);
  return close;
 }
 return {install};
})();

// The desktop rail displays snapshots. Only an explicit Refresh all samples live data.
(() => {
  'use strict';
  const host = document.createElement('div');
  host.id = 'desktopStatusDock';
  host.style.cssText = 'order:-10000;flex:none';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `<style>
    :host{--pine:#194c38;--ink:#193e32;--mint:#9de9b7;--blue:#aed5dc;--sage:#c6d9ac;font:13px/1.35 Arial,sans-serif;color:var(--ink)}
    *,*::before,*::after{box-sizing:border-box}
    button{font:inherit;color:inherit;cursor:pointer}
    button:focus-visible{outline:2px solid #c49342;outline-offset:1px}
    button:disabled{cursor:default;opacity:.6}
    .shortcut-stack,.rail,.watch-tools{display:grid;gap:var(--rail-gap)}
    .rail{width:var(--rail-button)}
    .rail button,.tasks{appearance:none;margin:0;border:0;border-radius:8px;background:var(--pine);color:#fffaf1}
    .tasks{height:clamp(48px,min(34dvh,calc(100dvh - 10 * (var(--rail-button) + var(--rail-gap)) - 2 * var(--rail-clearance) - 8px)),330px);display:flex;align-items:stretch;justify-content:center;padding:6px 2px}
    .rail .lane{position:relative;min-width:0;flex:1;display:grid;justify-items:center;padding:6px 0}
    .line{position:relative;background:#547565;border-radius:1px;width:6px}
    .line i,.meter i{position:absolute;bottom:0;inset-inline:0;border-radius:inherit;height:var(--level);background:var(--tint)}
    .line::before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
      background:repeating-linear-gradient(to top,transparent 0 calc(var(--step-size,102%) - 1px),var(--pine) calc(var(--step-size,102%) - 1px) var(--step-size,102%))}
    .level-thumb{position:absolute;z-index:2;left:50%;bottom:var(--level);transform:translate(-50%,50%);
      width:14px;height:5px;border-radius:1px;background:var(--tint);box-shadow:0 1px 0 #103728,0 -1px 0 #103728}
    .empty{width:100%;padding:0}
    .db{height:var(--rail-button);width:var(--rail-button);padding:0;display:grid;place-items:center}
    .db strong{font:700 15px/1 Arial;font-variant-numeric:tabular-nums;letter-spacing:-.6px}
    .db[data-flag=orange] strong{color:#ffc078}.db[data-flag=red] strong{color:#ffabae}
    dialog{position:fixed;inset:max(8px,calc(100dvh - 648px)) 58px auto auto;margin:0;width:min(438px,calc(100vw - 76px));
      max-height:min(640px,calc(100dvh - 16px));overflow:hidden;border:1px solid #adbcae;border-radius:8px;padding:0;
      background:#fffdf7;color:var(--ink);box-shadow:0 6px 25px #102a222c;font:13px/1.35 Arial,sans-serif}
    dialog[open]{display:flex;flex-direction:column}
    .summary{flex:none;padding:12px 18px;border-bottom:1px solid #cdd8ce}
    .checklists{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:14px 18px;scroll-padding-block:12px}
    dialog::backdrop{background:transparent}
    .row,.heading,.checks,.cellhead{display:flex;align-items:center;justify-content:space-between;gap:8px}
    h2{margin:0;font:700 18px/1.25 Arial}h3{font:700 13px/1.3 Arial;margin:0}
    .quiet,.count,.flags,.times,.notice{font-size:11px;color:#5d6b61}
    .quiet{margin:2px 0 12px;font-size:12px}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:6px 12px}
    .card{position:relative;display:flex;align-items:flex-start;gap:8px;border-top:1px solid #d9dfd6;padding:7px 0 2px}
    .meter{display:block;flex:none;position:relative;overflow:hidden;border-radius:4px;background:#d4ddd7;width:4px;height:46px}
    .copy{flex:1;min-width:0}.name{overflow-wrap:anywhere;font-size:12px;margin:2px 0}
    .cellhead{gap:2px;align-items:flex-start}.choose{flex:1;text-align:left;overflow-wrap:anywhere;min-width:0;border:0;background:transparent;font-weight:700;padding:2px 0;color:#205c46}
    .choose::after{content:'';position:absolute;inset:0}.cellhead .icon{position:relative;z-index:1}
    .choose:hover{text-decoration:underline}.card.selected .choose{text-decoration:underline;text-underline-offset:3px}
    .steps{margin-top:10px;padding:11px 12px;background:#edf2eb;border-radius:6px}
    .steps[hidden]{display:none}.steps h3{margin-bottom:5px}.steps label{display:flex;gap:8px;align-items:flex-start;padding:5px 0;overflow-wrap:anywhere;line-height:1.35;cursor:pointer}
    .steps input{flex:none;width:16px;height:16px;margin:1px 0 0;accent-color:#176449}.steps label:has(:disabled){color:#647168}
    .step-note{font-size:11px;margin:3px 0 6px;color:#536459}.steps label span{min-width:0}
    .icon,.close{background:transparent;border:0;padding:2px;display:grid;place-content:center;color:#587465;border-radius:3px}
    .icon{min-height:23px;min-width:23px}.icon svg{width:14px;height:14px}
    .icon[aria-pressed=true] svg{fill:var(--pine)}.icon:hover,.close:hover{background:#e3ebe3}
    .close{font-size:22px;width:30px;height:30px}.row{font-size:12px;margin:5px 0}
    .checks{margin:4px 0 10px;padding-bottom:9px;border-bottom:1px solid #d3dcd3}
    .checklists>h2{font-size:16px}
    .flags{display:flex;flex-wrap:wrap;gap:10px;margin-top:8px}.flags span::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;background:#cf792e}.flags span+span::before{background:#b52b37}
    .times{line-height:1.55}.refresh{border:0;background:#176449;color:white;padding:7px 11px;border-radius:5px;font-weight:700;white-space:nowrap}
    .notice:not(:empty){margin-top:7px;color:#834520}
    @media(max-height:600px){.summary{padding:8px 16px}.checklists{padding:10px 16px}}
    .watch-tools button{width:var(--rail-button);height:var(--rail-button);padding:0;border:0;border-radius:7px;background:var(--pine);color:white;font-weight:bold;font-size:12px}
    .watch-tools svg{width:21px;height:21px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:1.7}
    dialog.watch-dialog{inset:12px 58px auto auto;width:min(740px,calc(100vw - 84px));max-height:calc(100dvh - 24px);padding:16px;gap:12px}
    .watch-dialog header,.watch-toolbar,.watch-dialog footer{display:flex;align-items:center;gap:8px}
    .watch-dialog header{justify-content:space-between}.watch-toolbar{justify-content:flex-end;flex-wrap:wrap}.watch-toolbar label{margin-right:auto}
    .watch-toolbar button,.watch-dialog footer button,.watch-dialog select,.watch-dialog input[type=search]{border:1px solid #aec1b3;border-radius:5px;padding:5px 9px;min-height:32px;background:#fff}
    .watch-dialog [hidden]{display:none!important}.watch-body{min-height:0;overflow:auto}.watch-body p{font-size:12px;color:#52665b}
    .watch-scroll{overflow:auto}.watch-body table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
    .watch-body :is(th,td){padding:8px 6px;border-bottom:1px solid #d6dfd8;text-align:right}.watch-body th:first-child{text-align:left;width:35%}.watch-body thead{background:#edf5ee}.watch-body small{display:block;font-weight:normal;color:#53685a}
    .watch-options{max-height:47vh;overflow:auto;margin:8px 0}.watch-options label{display:flex;gap:8px;align-items:center;padding:6px;border-bottom:1px solid #dde5de}.watch-dialog input[type=search]{width:100%;margin-top:8px}.watch-dialog footer{justify-content:flex-end}
    .fx-dialog.bank-open .account-tools{display:none}
    .fx-tabs{display:flex;gap:4px;border-bottom:1px solid #ccdace}
    .fx-tabs button{min-height:34px;padding:4px 12px;background:none;border:0;border-bottom:2px solid transparent;color:#52665b;font-weight:600}
    .fx-tabs [aria-selected=true]{color:#194c38;border-bottom-color:#20704c;background:#edf5ee;border-radius:5px 5px 0 0}
    .fx-filters,.fx-source{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 12px}
    .fx-dialog .fx-filters label,.fx-dialog .fx-source label{display:grid;gap:3px;font-size:12px;font-weight:bold}
    .fx-dialog .fx-filters :is(input,select),.fx-dialog .fx-source input{font:inherit;font-weight:normal;min-height:32px;padding:4px 8px;color:var(--ink);border:1px solid #aec1b3;border-radius:5px;background:white}
    .fx-source{margin:0 0 12px;padding:12px;border:1px solid #cbdacf;border-radius:7px;background:#f1f6f1}
    .fx-source label{flex:1 1 220px;min-width:0}.fx-source input{width:100%}.fx-source small:not(:empty){flex-basis:100%;color:#903823}
    .fx-source [type=submit]{color:white;background:var(--pine);border-color:var(--pine)}
    .fx-filters a{margin-left:auto;align-self:center;color:#176449;text-underline-offset:3px}
    .fx-dialog [data-quotes] :is(th,td):nth-child(4){background-color:#edf5ef;font-weight:600}
    .fx-dialog [data-quotes] td{white-space:nowrap}.fx-dialog [data-quotes] thead th{white-space:nowrap}
    .ledger-stats379{display:grid;grid-template-columns:repeat(auto-fit,minmax(115px,1fr));gap:8px}.ledger-stats379>div{padding:8px;background:#edf5ee;border-radius:5px}.ledger-stats379 strong{font-variant-numeric:tabular-nums}
    .ledger-matches379{display:grid;max-height:24vh;overflow:auto}.ledger-matches379 button{background:white;border:0;border-bottom:1px solid #d6dfd8;text-align:left;padding:7px}.ledger-detail379 .watch-toolbar h3{margin-right:auto}
    .watch-body .ledger-lines379 :is(th,td):nth-child(-n+3){text-align:left;width:auto}.ledger-lines379 td:nth-child(3){width:40%}.ledger-lines379 td:nth-child(n+4){white-space:nowrap}
    .watch-dialog header{flex:none;justify-content:flex-start;flex-wrap:wrap}
    .watch-dialog header>h2{margin-right:auto}
    .watch-dialog header>.close{flex:none}
    .watch-dialog header>button:not(.close),.ledger-tabs379 button{min-height:32px;padding:4px 9px;border:1px solid #aec1b3;border-radius:5px;background:#fff}
    .ledger-search379{position:relative;flex:1 1 125px;min-width:0}
    .ledger-search379 [role=searchbox]{display:block;width:100%;height:32px;padding:6px 9px;border:1px solid #aec1b3;border-radius:5px;background:white;white-space:nowrap;overflow:hidden}
    .ledger-search379 [role=searchbox]:empty::before{content:attr(data-placeholder);color:#587065;pointer-events:none}
    .ledger-search379 .ledger-matches379{position:absolute;z-index:2;top:100%;left:0;min-width:100%;width:max-content;max-width:min(310px,65vw);background:white;box-shadow:0 3px 8px #193e3226}
    .watch-dialog:has(.ledger-search379){min-height:min(300px,65dvh)}
    .ledger-tabs379{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:6px;margin-bottom:8px}
    .ledger-tabs379:empty{display:none}
    .ledger-tabs379>span{display:inline-flex;flex:none}
    .ledger-tabs379 button:first-child{border-radius:5px 0 0 5px;font-weight:bold}
    .ledger-tabs379 button:last-child{border-left:0;border-radius:0 5px 5px 0;padding:3px 6px}
    .ledger-tabs379 [aria-pressed=true]{color:white;background:#194c38}
    .watch-dialog .ledger-page-controls{position:sticky;bottom:0;z-index:1;justify-content:center;width:max-content;max-width:100%;margin:4px auto 0;padding:3px 8px;background:white;border:1px solid #aec1b3;border-radius:7px;box-shadow:0 2px 8px #193e3226}
    .ledger-detail379>h3{margin:0 0 8px}
    .ledger-lines379 tr[data-line]{cursor:pointer}
    .ledger-lines379 tr[data-line]:hover{background:#edf5ee}
    .ledger-lines379 tr.selected>td{background:#d3e7dc}
    .ledger-lines379 tr.selected>td:first-child{box-shadow:inset 3px 0 #176449}
  </style>
  <div class="shortcut-stack">
  <div class="watch-tools"><button type="button" data-rail-tool="trial-months" aria-haspopup="dialog" aria-label="Account balances" title="Account balances"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h16M11 9v11m3-7h3m-3 4h3"/></svg></button><button type="button" data-watch="rates" aria-haspopup="dialog" aria-label="Foreign account rates" title="Foreign account rates">FX</button><button type="button" data-rail-tool="calendar" aria-haspopup="dialog" aria-label="Company calendar" title="Company calendar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v15H4zM4 10h16M8 3v5m8-5v5m-9 6h3m2 0h3"/></svg></button><button type="button" data-rail-tool="differences" aria-haspopup="dialog" aria-label="Reconciliation differences" title="Reconciliation differences"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h15l-3-3m6 13H6l3 3M6 11h5m3 2h4"/></svg></button><button type="button" data-rail-tool="ledger" aria-haspopup="dialog" aria-label="Account ledger" title="Account ledger"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6Q8 3 3 5v14q5-2 9 1 4-3 9-1V5q-5-2-9 1v14"/></svg></button></div>
  <div class="rail">
    <div class="tasks" role="group" aria-label="Pinned sequential checklists"></div>
    <button class="db" type="button" aria-haspopup="dialog"><strong>—</strong></button>
  </div>
  </div>
  <dialog aria-labelledby="dockTitle taskTitle">
    <header class="summary">
      <div class="heading"><h2 id="dockTitle">Supabase storage</h2><button class="close" aria-label="Close status window" type="button">×</button></div>
      <div class="checks"><div class="times"><div class="taskTime"></div><div class="storageTime"></div></div>
        <button type="button" class="refresh">Refresh all</button></div>
      <div class="row">Database <strong class="dbAmount"></strong></div>
      <div class="row">File storage <span class="fileAmount"></span></div>
      <div class="flags"><span>60% · Start archiving</span><span>70% · Red flag</span></div>
      <div class="notice" role="status"></div>
    </header>
    <section class="checklists" aria-labelledby="taskTitle">
      <h2 id="taskTitle">Sequential tasks</h2><p class="quiet"></p><div class="grid"></div>
      <section class="steps" id="dockSteps" aria-labelledby="stepsTitle" hidden></section>
    </section>
  </dialog>`;
  const $ = s => root.querySelector(s);
  const dialog = $('dialog');
  const priority = [/^payroll/i,/^(journal.*period closing|month.*clos|period clos)/i,/^bank.*reconcil/i,/^payable/i,/^pit.*sso/i,/^trial\b/i];
  const colors = ['#b4efc4','#a6d8e6'];
  const panelColors = ['#12644d','#447787'];
  let selected = '', openedFrom = '';
  // Retain keyboard focus when rebuilding the checklist after a confirmed save.
  let stepFocus = null;
  const pinIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7.5 3h10L16 5l-1 6 3.5 3h-13L9 11l-.5-6zM12 14v7"/></svg>';
  let owner = '', client = null, snapshot = null, busy = false, slotRead = '', retryAt = 0, generation = 0, message = '';
  const percent = t => t.total ? Math.min(100,100*t.done/t.total) : 0;
  const key = () => 'ojm_desktop_status_'+owner;
  function session() {
    if (document.documentElement.dataset.device132 !== 'desktop' ||
        !document.querySelector('#loginGate.is-authenticated') ||
        typeof liveProfile === 'undefined' || liveProfile?.role !== 'admin' || liveProfile.status !== 'active' ||
        (window.deviceVault14334 && !window.deviceVault14334.unlocked)) return '';
    return liveProfile.id;
  }
  function slot() {
    // Two minutes of margin let cron commit before a foreground read at the boundary.
    const local = new Date(Date.now() + 7*3600000 - 120000);
    if (local.getUTCHours()<6) {local.setUTCDate(local.getUTCDate()-1);return local.toISOString().slice(0,10)+' PM';}
    return local.toISOString().slice(0,10)+(local.getUTCHours()<12?' AM':' PM');
  }
  function valid(value) {
    return value && Array.isArray(value.tasks) && value.tasks.every(t => typeof t.id==='string' && typeof t.title==='string' &&
      Number.isInteger(t.done) && Number.isInteger(t.total)) && (value.pins===null || Array.isArray(value.pins)) &&
      (!value.storage || (Number.isFinite(value.storage.db_bytes) && value.storage.db_limit>0 && value.storage.file_limit>0));
  }
  function checklists() {
    const tasks=(snapshot?.tasks || []).map(t=>{
      const rank=priority.findIndex(re=>re.test(t.title));
      return {...t,rank:rank<0?priority.length:rank};
    }).sort((a,b)=>a.rank-b.rank || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    const ids=snapshot?.pins ?? tasks.slice(0,2).map(t=>t.id);
    return {tasks,pins:ids.map(id=>tasks.find(t=>t.id===id)).filter(Boolean).slice(0,2)};
  }
  function node(tag,cls,value) {
    const el=document.createElement(tag);
    if (cls) el.className=cls;
    if (value!=null) el.textContent=value;
    return el;
  }
  function bar(t,cls,tint) {
    const el=node('span',cls);el.style.setProperty('--level',percent(t)+'%');el.style.setProperty('--tint',tint);
    el.append(node('i'));return el;
  }
  function storageText(bytes,limit) {
    return (bytes/1e6).toLocaleString(undefined,{maximumFractionDigits:2})+' / '+
      (limit/1e6).toLocaleString()+' MB · '+(100*bytes/limit).toFixed(2)+'%';
  }
  function actionIcon(label,action,id) {
    const el=node('button','icon');el.type='button';el.title=label;el.setAttribute('aria-label',label);
    el.dataset.action=action;el.dataset.id=id;return el;
  }
  function paintSteps(task) {
    const box=$('.steps');
    box.hidden=!task;
    if (!task) {box.replaceChildren();return;}
    const heading=node('h3','',task.title);heading.id='stepsTitle';
    if (!Array.isArray(task.steps) || !task.revision) {
      box.replaceChildren(heading,node('p','step-note','Refresh all when connected to load the steps.'));return;
    }
    const offline=!navigator.onLine || !!window.deviceVault14334?.offline;
    const note=node('p','step-note',offline?'Offline · Connect to update steps.':task.steps.length?'Complete steps in order. Reopening a step also reopens the steps after it.':'No steps in this checklist.');
    let pending=false;
    const rows=task.steps.map((step,index)=>{
      const label=node('label'),input=node('input');
      input.type='checkbox';input.checked=step.done===true;
      input.disabled=busy || pending || offline;
      input.dataset.step=String(index);input.dataset.id=task.id;
      if (!step.done) pending=true;
      label.append(input,node('span','',(index+1)+'. '+step.text));return label;
    });
    box.replaceChildren(heading,note,...rows);
  }
  function paint() {
    const {tasks,pins}=checklists();
    const lanes=pins.map((t,i)=>{
      const complete=t.total>0 && t.done===t.total, lane=node('button','lane');
      const label=t.title+' · '+t.done+' of '+t.total+' · '+(complete?'Complete':'Incomplete');
      lane.type='button';lane.style.setProperty('--tint',colors[i]);lane.dataset.id=t.id;
      lane.setAttribute('aria-haspopup','dialog');lane.setAttribute('aria-label',label);lane.title=label;
      const track=bar(t,'line',colors[i]);
      // Keep step divisions legible on long lists. The thumb always uses the exact fraction.
      if (t.total>1 && t.total<=24) track.style.setProperty('--step-size',(100/t.total)+'%');
      track.setAttribute('aria-hidden','true');
      track.append(node('span','level-thumb'));lane.append(track);return lane;
    });
    if (!lanes.length) {
      const open=node('button','empty','—');open.type='button';open.setAttribute('aria-label','Open sequential tasks');lanes.push(open);
    }
    $('.tasks').replaceChildren(...lanes);
    const s=snapshot?.storage, ratio=s?100*s.db_bytes/s.db_limit:null;
    const flag=ratio>=70?'Red flag':ratio>=60?'Start archiving':'';
    const dbLabel=s?'Database storage · '+ratio.toFixed(2)+'%'+(flag?' · '+flag:''):'Database storage · Awaiting snapshot';
    $('.db').title=dbLabel;$('.db').setAttribute('aria-label',dbLabel);
    // Keep the displayed whole number below a warning threshold until it is reached.
    const rounded=ratio==null?null:Math.round(ratio);
    $('.db strong').textContent=ratio==null?'—':((rounded===60||rounded===70)&&ratio<rounded?Math.floor(ratio):rounded)+'%';
    $('.db').dataset.flag=ratio>=70?'red':ratio>=60?'orange':'';
    if (!dialog.open) return;
    const focused=root.activeElement?.dataset;
    $('.quiet').textContent=snapshot?.tasks_at?tasks.length+' checklists · '+pins.length+' of 2 pinned':'Awaiting checklist snapshot';
    const cards=tasks.map(t=>{
      const at=pins.findIndex(p=>p.id===t.id), card=node('div','card'+(selected===t.id?' selected':'')), copy=node('div','copy'), head=node('div','cellhead');
      const choose=node('button','choose',t.title);choose.type='button';choose.dataset.action='choose';choose.dataset.id=t.id;
      choose.setAttribute('aria-controls','dockSteps');choose.setAttribute('aria-expanded',String(selected===t.id));head.append(choose);
      if (at>0) {const move=actionIcon('Move '+t.title+' earlier','earlier',t.id);move.textContent='←';move.disabled=busy;head.append(move);}
      const pin=actionIcon((at>=0?'Unpin ':'Pin ')+t.title,'pin',t.id);pin.innerHTML=pinIcon;
      pin.setAttribute('aria-pressed',String(at>=0));pin.disabled=busy||(at<0 && pins.length>=2);
      if (at<0 && pins.length>=2) pin.title='Unpin a checklist to make room';
      head.append(pin);copy.append(head,node('div','count',t.done+' of '+t.total+' · '+Math.round(percent(t))+'%'));
      card.append(bar(t,'meter',panelColors[at]||'#65816d'),copy);return card;
    });
    $('.grid').replaceChildren(...(cards.length?cards:[node('span','count',snapshot?.tasks_at?'No active sequential checklists.':'No checklist snapshot available.')]));
    paintSteps(tasks.find(t=>t.id===selected));
    const focusStep=stepFocus && selected===stepFocus.id && !busy;
    if (focusStep) {
      $('.steps input[data-step="'+stepFocus.index+'"]')?.focus({preventScroll:true});stepFocus=null;
    } else if (focused?.action) {
      [...root.querySelectorAll('.grid button')].find(b=>b.dataset.id===focused.id && b.dataset.action===focused.action)?.focus({preventScroll:true});
    }
    $('.dbAmount').textContent=s?storageText(s.db_bytes,s.db_limit):'—';
    $('.fileAmount').textContent=s?storageText(s.file_bytes,s.file_limit):'—';
    $('.taskTime').textContent='Tasks checked '+(snapshot?.tasks_at?formatAppDate(snapshot.tasks_at,true):'—');
    $('.storageTime').textContent='Storage checked '+(s?.checked_at?formatAppDate(s.checked_at,true):'—');
    $('.refresh').disabled=busy;$('.notice').textContent=message;
  }
  async function request(action,params) {
    if (busy || !owner || session()!==owner || !client) return;
    const active=generation, requestedSlot=slot();
    if (!navigator.onLine || window.deviceVault14334?.offline) {
      message='Offline · Showing the last saved status.';paint();return;
    }
    busy=true;message=action==='step'?'Saving step…':action==='refresh'?'Refreshing tasks and storage…':'';
    if (dialog.open && action==='step') {
      // Keep the native checkbox in place while the user's selection is saving.
      for (const control of dialog.querySelectorAll('.steps input,.grid .icon,.refresh')) control.disabled=true;
      $('.notice').textContent=message;
    } else if (dialog.open) paint();
    try {
      const {data,error}=action==='step'
        ? await client.rpc('set_desktop_dock_step',params)
        : await client.rpc('desktop_dock_status',{p_action:action,p_pins:params??null});
      if (active!==generation || session()!==owner || client!==ojmDb) return;
      if (error || !valid(data)) throw Error(error?.message||'Invalid status response');
      snapshot=data;slotRead=requestedSlot;retryAt=0;
      if (window.deviceVault14334?.unlocked && window.deviceVault14334.actor===owner) {
        try { localStorage.setItem(key(),JSON.stringify(data)); } catch { /* Current session can still display the result. */ }
      }
      if (action==='step') {
        const task=data.tasks.find(t=>t.id===params.p_task);
        const state=window.workflow136?.state;
        const row=state?.todoLoadedOwner14335===owner && state.todos.find(t=>t.id===params.p_task);
        if (task && row && row.updated_at===params.p_revision) {
          Object.assign(row,{steps:structuredClone(task.steps),updated_at:task.revision});
          window.todos1438?.render();window.refreshNotices1443?.();
        }
        message=data.outcome==='saved'?'Step saved.':data.outcome==='order'?'Complete the earlier steps first.':'This checklist changed. Review its latest steps before editing.';
      } else message=action==='refresh'?'Tasks and storage refreshed.':'';
    } catch {
      if (active!==generation) return;
      retryAt=Date.now()+60000;
      message=action==='step'?'Could not confirm this step. Refresh all to check its saved status.':action==='pins'?'Pins could not be saved. Try again.':'Status unavailable · Showing the last saved status.';
    } finally {
      if (active===generation) {busy=false;if(session()===owner)paint();}
    }
  }
  const closeWatch=AccountWatch378.install(root,session);
  const closeRailTools=RailTools379.install(root,session);
  function syncView() {
    const id=session(), db=id?ojmDb:null;
    if(window.workspaceRequest138?.target){closeWatch();closeRailTools();}
    if (id!==owner || client!==db) {
      closeWatch();closeRailTools();generation++;selected='';stepFocus=null;if(dialog.open)dialog.close();host.remove();owner=id;client=db;snapshot=null;busy=false;message='';slotRead='';retryAt=0;
      if (!id) return;
      try {
        const cached=JSON.parse(localStorage.getItem(key()));
        if (window.deviceVault14334?.actor===owner && valid(cached)) snapshot=cached;
      } catch { /* No saved snapshot yet. */ }
      paint();
    }
    if (!id) return;
    const dock=document.getElementById('workspaceTools108');
    if (!dock) return;
    if (host.parentNode!==dock) dock.prepend(host);
    if (!document.hidden && !busy && slotRead!==slot() && Date.now()>=retryAt && navigator.onLine && !window.deviceVault14334?.offline) request('read');
  }
  function revealSteps() {
    const list=$('.checklists'),steps=$('.steps');
    if (!selected || steps.hidden) {list.scrollTop=0;return;}
    const top=steps.getBoundingClientRect().top-list.getBoundingClientRect().top;
    if (top<0 || top+Math.min(100,steps.offsetHeight)>list.clientHeight) list.scrollTop+=top-10;
  }
  root.addEventListener('click',event=>{
    if (session()!==owner || !owner) {syncView();return;}
    const button=event.target.closest('button');
    if (button?.closest('.rail')) {
      selected=button.dataset.id || '';openedFrom=button.matches('.db')?'db':selected;stepFocus=null;
      if (!dialog.open) {dialog.showModal();paint();revealSteps();}return;
    }
    if (!dialog.open || !dialog.contains(event.target)) return;
    if (button?.matches('.close')) {dialog.close();return;}
    if (button?.matches('.refresh')) {request('refresh');return;}
    if (button?.dataset.action==='choose') {
      selected=selected===button.dataset.id?'':button.dataset.id;stepFocus=null;paint();if(selected)revealSteps();return;
    }
    if (busy || !button?.dataset.id) return;
    const ids=checklists().pins.map(t=>t.id),id=button.dataset.id,index=ids.indexOf(id);
    if (button.dataset.action==='earlier' && index>0) [ids[index-1],ids[index]]=[ids[index],ids[index-1]];
    if (button.dataset.action==='pin') {if(index>=0)ids.splice(index,1);else if(ids.length<2)ids.push(id);}
    request('pins',ids);
  });
  RailTools379.outside(dialog,()=>dialog.close());
  dialog.addEventListener('close',()=>{
    if (!host.isConnected || session()!==owner) return;
    const target=openedFrom==='db'?$('.db'):[...root.querySelectorAll('.lane')].find(lane=>lane.dataset.id===openedFrom);
    (target || $('.tasks button'))?.focus({preventScroll:true});
  });
  root.addEventListener('change',event=>{
    const input=event.target;
    if (!input.matches('.steps input[data-step]') || busy || session()!==owner) return;
    const task=snapshot?.tasks.find(t=>t.id===selected && t.id===input.dataset.id);
    if (!task?.revision) return;
    const index=Number(input.dataset.step);
    stepFocus={id:task.id,index};
    request('step',{p_task:task.id,p_revision:task.revision,p_index:index,p_done:input.checked});
  });
  function start() {
    const gate=document.getElementById('loginGate');
    if (gate) new MutationObserver(syncView).observe(gate,{attributes:true,attributeFilter:['class']});
    for (const name of ['page113','session-online14333','focus','tabletviewport132','online']) window.addEventListener(name,syncView);
    document.addEventListener('visibilitychange',syncView);
    // Catch a new slot during active work; no interval or refresh while idle.
    document.addEventListener('click',()=>{if (owner && slotRead!==slot() && !dialog.open) syncView();},{passive:true});
    syncView();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
