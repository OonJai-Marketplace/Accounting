/* Desktop reports: derived from posted journal lines; no duplicate ledger or mobile changes. */
const Reports79={kind:'pl',mode:'monthly',month:Accounts69.month,year:Accounts69.year,quarter:Accounts69.quarter,from:Accounts69.from,to:Accounts69.to,currency:'',basis:'LAK',account:'',query:'',notes:{},cash:[],payroll:[]};
const reportNames79={pl:'Profit and Loss',bs:'Balance Sheet',cf:'Cash Flow',tb:'Trial Balance',gl:'General Ledger',activity:'Account Activity',expense:'Expense Report',payroll:'Payroll Report'};
const re79=v=>escapeHtml(String(v??''));
function reportRange79(){const r=Reports79;if(r.mode==='custom')return;let y=+r.year,m=1,n=12;if(r.mode==='monthly'){[y,m]=r.month.split('-').map(Number);n=1}if(r.mode==='quarterly'){m=(+r.quarter-1)*3+1;n=3}r.from=date71(y,m,1);const end=new Date(y,m-1+n,0);r.to=date71(end.getFullYear(),end.getMonth()+1,end.getDate())}
let reportRenderCache14336=null;
function reportData79(){
 const cacheKey=JSON.stringify([Reports79.kind,Reports79.from,Reports79.to,Reports79.currency,Reports79.account,Reports79.basis]);if(reportRenderCache14336?.has(cacheKey))return reportRenderCache14336.get(cacheKey);
 const old={...Accounts69},originalEntries=JournalModule.entries,reportSnapshot=window.reportWindow143195?.snapshot(Reports79.from,Reports79.to);try{if(reportSnapshot)window.reportWindow143195.calculating=true;JournalModule.entries=(reportSnapshot?.rows||originalEntries).filter(r=>!r.pendingSync&&!r.local14333&&(!r.status||r.status==='posted'));if(['pl','expense'].includes(Reports79.kind))JournalModule.entries=JournalModule.entries.filter(r=>!String(r.generalMemo||'').startsWith('Year-end closing '));Object.assign(Accounts69,{from:Reports79.from,to:Reports79.to});let accountRows=accountData69(Accounts69.to,Reports79.kind!=='tb');if(reportSnapshot)accountRows=reportWindow143195.addOpening(accountRows,reportSnapshot);let rows=accountRows.filter(r=>(['tb','gl','activity'].includes(Reports79.kind)||!r.account.isTechnical)&&(!Reports79.currency||r.currency===Reports79.currency));if(Reports79.basis==='LAK')rows=rows.map(r=>({...r,sourceCurrency:r.currency,original:{opening:r.opening,debit:r.debit,credit:r.credit,closing:r.closing},currency:'LAK',opening:r.baseOpening,debit:r.baseDebit,credit:r.baseCredit,closing:r.baseClosing,lines:r.lines.map(l=>({...l,originalDebit:l.dr,originalCredit:l.cr,originalCurrency:l.currency,dr:cents69(window.JournalFX14383?.base(l,'debit')),cr:cents69(window.JournalFX14383?.base(l,'credit'))}))}));reportRenderCache14336?.set(cacheKey,rows);return rows}finally{Object.assign(Accounts69,old);JournalModule.entries=originalEntries;if(reportSnapshot)window.reportWindow143195.calculating=false}
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
 const periodControl='<label>Period<button type="button" class="oj-date-button104" data-period aria-haspopup="dialog">'+re79(periodFilters14331.caption(period))+'</button></label>';
 const accountField=ledger?field('Account','account',[],''):'';
 const checks=kind==='cf'?'<fieldset><legend>Cash and bank accounts</legend><details><summary data-cash-summary>Choose accounts</summary><div data-choices></div></details></fieldset>':kind==='payroll'?'<fieldset><legend>Payroll accounts</legend><div data-choices></div></fieldset>':'';
 const body=periodControl+field('Report basis','basis',[['LAK','LAK — reporting currency'],['original','Original currencies']],s.basis)+field('Currency','currency',[['','All original currencies'],...currencies.map(c=>[c,c])],s.currency)+accountField+field('Sort by','by',[...(ledger?[['date','Date']]:[]),['account','Account code']],sort.by)+field('Order','direction',orders(sort.by),sort.direction)+checks;
 const dialog=openReportDialog299(button,reportNames79[kind]+' filters',body,()=>{
  const next={...period,basis:form.basis.value,currency:form.currency.value};
  if(ledger)next.account=form.account.value;
  if(checks)next[listKey]=[...chosen];
  Object.assign(s,next);reportSorts143153.set(kind,{by:form.by.value,direction:form.direction.value});renderReports79();
 });
 const form=dialog.querySelector('form').elements,periodButton=dialog.querySelector('[data-period]');
 periodButton.onclick=()=>summaryPeriod14331.open(periodButton,periodFilters14331.selection(period),(values,meta)=>{
  periodFilters14331.setPeriod(period,values,meta);periodButton.textContent=periodFilters14331.caption(period);
 },{mode:period.allMonths14331||period.selectedMonths14331?.length?'monthly':period.mode,from:period.from,to:period.to,custom:true});
 form.by.onchange=()=>{form.direction.innerHTML=options(orders(form.by.value),form.direction.value)};
 function accountChoices(selected){
  const visible=rows.filter(r=>!form.currency.value||r.currency===form.currency.value);
  const label=r=>r.account.code+' — '+r.account.name+' · '+r.currency;
  if(ledger)form.account.innerHTML=options([['','All accounts'],...visible.map(r=>[r.key,label(r)])],selected);
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
let ledgerRenderBlocks300=null;
const ledgerScreens300=new WeakMap();
function ledgerSpacer300(columns,height){
 return `<tr aria-hidden="true"><td colspan="${columns}" style="padding:0!important;border:0!important"><span style="display:block;height:${height}px!important"></span></td></tr>`;
}
function bindLedgerBlocks300(host,blocks){
 ledgerScreens300.get(host)?.disconnect();
 ledgerScreens300.delete(host);
 if(!blocks.length)return;
 const bodies=[...host.querySelectorAll('tbody[data-ledger-block300]')];
 function show(body){
  const block=blocks[Number(body.dataset.ledgerBlock300)];
  if(!block.mounted){body.innerHTML=block.html;block.mounted=true}
 }
 const observer=new IntersectionObserver(records=>{
  if(!host.isConnected||!host.closest('.tab-content.active'))return;
  for(const record of records){
   const body=record.target,block=blocks[Number(body.dataset.ledgerBlock300)];
   if(record.isIntersecting){show(body);continue}
   if(!block.mounted||body.contains(document.activeElement)||!record.boundingClientRect.height)continue;
   body.innerHTML=ledgerSpacer300(block.columns,record.boundingClientRect.height);block.mounted=false;
  }
 },{rootMargin:'400px 0px'});
 bodies.forEach(body=>observer.observe(body));
 ledgerScreens300.set(host,{disconnect:()=>observer.disconnect(),expand:()=>{observer.disconnect();bodies.forEach(show)},resume:()=>bodies.forEach(body=>observer.observe(body))});
}
function activeLedger300(){return ledgerScreens300.get(document.querySelector(':is(#report-gl,#report-tb).active .r79'))}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='f')activeLedger300()?.expand()},true);
if(typeof window.addEventListener==='function'){
 window.addEventListener('beforeprint',()=>activeLedger300()?.expand());
 window.addEventListener('afterprint',()=>activeLedger300()?.resume());
 window.addEventListener('page113',()=>{for(const host of document.querySelectorAll(':is(#report-gl,#report-tb):not(.active) .r79'))ledgerScreens300.get(host)?.resume()});
}

function reportTable79(headers,rows,currency,print=false){
 const ledger=headers.includes('Entry ID'),trial=headers.includes('Period debit')&&headers.includes('Closing balance'),column=h=>({'Date':'date','Entry ID':'id','Account':'account','Description / Reference':'description','LAK rate':'rate','Classification':'classification','Original currency / net':'original'}[h]||'amount');
 // Measure all rows so column widths accommodate the complete report.
 const longest=(indices,min)=>rows.reduce((max,row)=>Math.max(max,...indices.map(i=>String(row[i]??'').length)),min);
 const idWidth=longest([headers.indexOf('Entry ID')],9)+2,amountWidth=longest(headers.flatMap((h,i)=>column(h)==='amount'?[i]:[]),12)+1;
 const widths=`--report-id-width143116:calc(${idWidth}ch + 16px);--report-amount-width143116:calc(${amountWidth}ch + 16px);--report-min-width143116:calc(${ledger?665+(headers.includes('LAK rate')?100:0):360+(headers.includes('Original currency / net')?170:0)}px + ${ledger?idWidth+3*amountWidth:5*amountWidth}ch + ${ledger?64:80}px)`;
 const attr=h=>ledger?'data-ledger-column143108="'+column(h)+'"':trial?'data-trial-column143116="'+column(h)+'"':'';

 const accountIndex=headers.findIndex(h=>h==='Account'||h==='Account / parent');
 const renderRow=row=>{
  const account=accountIndex>=0?(window.ForeignFunds14386?.presentation(row[accountIndex])||{text:String(row[accountIndex]).trim(),name:String(row[accountIndex]).trim(),subtotal:false}):null;
  return `<tr${account?.subtotal?' class="report-subtotal143185"':''}>${row.map((v,i)=>{
   const isAccount=i===accountIndex,value=isAccount?account.text:v;
   let content=!print&&headers[i]==='Account'?`<button class="r79-link" data-account="${re79(account.name)}" data-currency="${re79(currency)}" onclick="reportAccount79(this.dataset.account,this.dataset.currency)">${re79(value)}</button>`:!print&&headers[i]==='Entry ID'?`<button class="r79-link" data-entry="${re79(v)}" onclick="reportWindow143195.source(encodeURIComponent(this.dataset.entry))">${re79(v)}</button>`:headers[i]==='Description / Reference'?journalMemoHtml143187(value):re79(headers[i]==='Date'?formatAppDate(v):value);
   if(trial&&headers[i]==='Classification'){
    const [side,...type]=String(v).split(' · ');
    content='<span class="balance-badge118" title="Closing balance side">'+re79(side)+'</span>'+re79(type.join(' · '));
   }
   if(isAccount&&window.ForeignFunds14386)content=ForeignFunds14386.label(v,content);
   return `<td ${attr(headers[i])}>${account?.subtotal?'<strong>'+content+'</strong>':content}</td>`;
  }).join('')}</tr>`;
 };
 const windowed=ledgerRenderBlocks300&&!print&&(ledger||trial||headers.includes('Average carrying rate'))&&rows.length>64;
 let body;
 if(windowed){
  const groups=[];
  for(let first=0;first<rows.length;first+=32){
   const chunk=rows.slice(first,first+32),html=chunk.map(renderRow).join(''),mounted=first===0;
   const index=ledgerRenderBlocks300.push({html,mounted,columns:headers.length})-1;
   groups.push(`<tbody data-ledger-block300="${index}">${mounted?html:ledgerSpacer300(headers.length,chunk.length*29)}</tbody>`);
  }
  body=groups.join('');
 }else{
  body='<tbody>'+(rows.map(renderRow).join('')||`<tr><td colspan="${headers.length}">No posted activity matches this selection.</td></tr>`)+'</tbody>';
 }
 return `<div class="r79-table"><table ${ledger?'class="ledger-columns143108" data-own-pager14383="1"':trial?'class="trial-columns143116"':''} ${ledger||trial?'style="'+widths+'"':''}><thead><tr>${headers.map(h=>`<th ${attr(h)}>${re79(h)}</th>`).join('')}</tr></thead>${body}</table></div>`}

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
 if(Reports79.basis==='LAK'){const missing=reportData79().filter(r=>r.missingRates);if(missing.length)return [{currency:'LAK — incomplete',headers:['Account','Original currency','Missing rate records'],values:missing.map(r=>[r.account.name,r.sourceCurrency,r.missingRates]),metrics:[],note:'LAK totals are withheld until missing exchange rates are supplied. Original-currency records remain available. No exchange rate has been guessed.'}];}
 const data=reportData79(),groups=[];const sum=(rows,f)=>rows.reduce((s,r)=>s+f(r),0),type=(rows,t)=>rows.filter(r=>String(r.account.baseType||r.account.type).toUpperCase()===t),active=r=>r.opening||r.debit||r.credit;
 for(const currency of [...new Set(data.map(r=>r.currency))].sort()){
 const all=data.filter(r=>r.currency===currency),rows=all.filter(active);let headers=[],values=[],metrics=[],note='';
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
 headers=['Account','Classification','Opening balance','Period debit','Period credit','Closing balance'];values=reportHierarchy14383(rows).map(r=>[r.account.name,(r.closing>0?'DR · ':r.closing<0?'CR · ':'— · ')+r.account.type,balanceText69(r.opening),money69(r.debit),money69(r.credit),money69(Math.abs(r.closing))]);const dr=sum(rows,r=>Math.max(r.closing,0)),cr=sum(rows,r=>Math.max(-r.closing,0));metrics=[['Closing debit',dr],['Closing credit',cr],['Difference',dr-cr]];note='Equal totals check arithmetic; they do not confirm that every entry is complete or correctly classified.';
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
 }
 const unknown=all.filter(r=>active(r)&&!['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE','SYSTEM'].includes(String(r.account.type).toUpperCase()));if(unknown.length)note+=` Attention: ${unknown.length} account(s) have no recognized classification. Review the Trial Balance before relying on statements.`;
 if(Reports79.basis==='LAK'){note+=' LAK amounts use saved transaction/carrying rates. Original currencies are retained; mapping accounts are excluded from operating results.';if(!['gl','activity','bs','tb'].includes(kind)){const index=headers.indexOf('Account');if(index>=0){headers.splice(index+1,0,'Original currency / net');values=values.map(v=>{const row=rows.find(r=>r.account.name===String(v[index]).trim());return [...v.slice(0,index+1),row?row.sourceCurrency+' '+balanceText69(['pl','expense'].includes(kind)?row.original.debit-row.original.credit:row.original.closing):'Subtotal in LAK',...v.slice(index+1)]})}}}
 groups.push({currency,headers,values,metrics,note});
 }
 if(window.ForeignFunds14386){const detail=ForeignFunds14386.reportDetails(data,kind);if(detail)groups.push(detail)}
 return groups;
}
function reportContent79(kind,oldest=false){const groups=reportModel79(kind,oldest);return groups.map(g=>`<section class="r79-group"><h4>${re79(g.currency)}${g.periodLabel?' · '+re79(g.periodLabel):''}</h4><div class="r79-metrics">${g.metrics.map(([label,value])=>`<div><small>${re79(label)}</small><strong class="${value<0?'r79-negative':''}">${money69(value)}</strong></div>`).join('')}</div>${reportTable79(g.headers,g.values,g.currency,oldest)}<p class="r79-note">${re79(g.note)}</p></section>`).join('')||'<p class="r79-note">No chart accounts or posted journal data are available yet.</p>'}
function renderReports79(){
 if(!matchMedia('(min-width:768px)').matches)return;
 const previousCache=reportRenderCache14336;reportRenderCache14336=new Map();try{
 for(const [kind,title] of Object.entries(reportNames79)){
 const panel=document.getElementById('report-'+kind);if(!panel||!panel.classList.contains('active'))continue;let host=panel.querySelector('.r79');if(!host){if(!panel.querySelector('.r79-original')){const original=document.createElement('div');original.className='r79-original';for(const child of [...panel.childNodes])if(!child.classList?.contains('area-banner113'))original.append(child);panel.append(original)}host=document.createElement('section');host.className='r79';panel.append(host)}
 Reports79.kind=kind;if(window.reportWindow143195?.reuse(host))continue;if(window.reportWindow143195&&!reportWindow143195.prepare(host))continue;const s=Reports79,isLedger=['gl','activity'].includes(kind);
 if(isLedger||kind==='cf'||kind==='payroll')reportFilterAccounts299.set(host,reportData79().map(r=>({key:r.key,account:r.account,currency:r.sourceCurrency||r.currency})));
 const blocks=['gl','tb'].includes(kind)&&typeof IntersectionObserver==='function'?[]:null;
 let content;
 try{ledgerRenderBlocks300=blocks;content=reportContent79(kind)}finally{ledgerRenderBlocks300=null}
 host.innerHTML=`<header class="r79-header"><div><span class="r79-eyebrow">REPORTS · POSTED JOURNAL</span><h3>${title}</h3><p>${s.selectedMonths14331?.length?'Selected months: '+s.selectedMonths14331.map(m=>summaryPeriod14331.monthLabel(m)).join(', '):s.allMonths14331?'All months':kind==='bs'||kind==='tb'?'Position as of '+formatAppDate(s.to):formatAppDate(s.from)+' – '+formatAppDate(s.to)} · Active and archived posted entries</p></div><div class="r79-actions">${kind==='gl'?`<div class="r79-search143153 no-print"><label>Search<input type="search" placeholder="Date, ID, account or description" value="${re79(s.query)}" onchange="reportSet79('query',this.value)"></label></div>`:''}<button type="button" class="je-btn je-btn-secondary" aria-haspopup="dialog" onclick="toggleReportFilters143153(this)">Filter</button><button class="je-btn je-btn-secondary" onclick="reportWindow143195.refresh()">Refresh</button><button class="je-btn je-btn-secondary" onclick="exportReport79('${kind}')" title="Export CSV">Export</button><button class="je-btn je-btn-emerald" onclick="printDesktopReport79('${kind}')" title="Print or save PDF">Print</button></div></header>${isLedger&&kind!=='gl'?`<div class="r79-search143153 no-print"><label>Search<input type="search" placeholder="Date, ID, account or description" value="${re79(s.query)}" onchange="reportSet79('query',this.value)"></label></div>`:''}<div class="r79-content">${content}</div><div class="r79-notes"><label>Report notes / findings <span>Optional · included when printing or exporting; kept for this session only</span><textarea rows="3" placeholder="Add context, supporting references or matters to review…" oninput="Reports79.notes['${kind}']=this.value">${re79(s.notes[kind]||'')}</textarea></label></div>`;
 if(blocks)bindLedgerBlocks300(host,blocks);
 window.reportWindow143195?.rendered(host);
 }
 }finally{reportRenderCache14336=previousCache}
}
function accountDataCurrencies79(){return [...(AccountingStore.accounts||[]).map(a=>a.currency),...JournalModule.entries.map(l=>l.currency)]}
function reportAccount79(name,currency){const row=reportData79().find(r=>r.account.name===name.trim()&&r.currency===currency);if(!row)return;Reports79.account=row.key;Reports79.query='';switchTab('report-activity')}
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

const logoutBefore79=logoutDemoUser;logoutDemoUser=async function(){reportSorts143153.clear();document.querySelectorAll('dialog.report-dialog299[open]').forEach(d=>d.close());Reports79.notes={};Reports79.cash=[];Reports79.payroll=[];Reports79.account='';Reports79.query='';Reports79.currency='';document.querySelectorAll('.r79,.r79-print-frame').forEach(n=>{ledgerScreens300.get(n)?.disconnect();n.remove()});return logoutBefore79()};
