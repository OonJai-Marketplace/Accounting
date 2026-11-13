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
 function journalRows(lines,month){
  const isOpening=l=>l.annualOpening||/^Annual opening balances |^Opening Balances$/.test(l.generalMemo||'');
  const chronological=[...lines].sort((a,b)=>a.date.localeCompare(b.date)||Number(!!isOpening(b))-Number(!!isOpening(a)));
  let balance=0,start=0,dr=0,cr=0,lastOpeningYear='';
  const detail=[];
  for(const l of chronological){
   const year=l.date.slice(0,4),period=l.date.slice(0,7);
   if(month&&period>month)break;
   const debit=cents69(l.debit),credit=cents69(l.credit),opening=isOpening(l);
   if(opening&&lastOpeningYear!==year){balance=0;lastOpeningYear=year;}
   balance+=debit-credit;
   if(month&&period<month){start=balance;continue;}
   if(opening){
    if(month||year===chronological[0].date.slice(0,4))start=balance-dr+cr;
    if(month)continue;
   }else{dr+=debit;cr+=credit;}
   detail.push({l,debit,credit,balance});
  }
  return {detail,start,dr,cr,balance};
 }
 function ledger(panel,scope){
  const header=panel.previousElementSibling,close=header.querySelector('.close');
  close.insertAdjacentHTML('beforebegin','<div class="ledger-search379"><span role="searchbox" contenteditable="plaintext-only" aria-label="Search accounts" aria-placeholder="Search accounts" spellcheck="false" data-placeholder="Search accounts"></span><div class="ledger-matches379" hidden></div></div><select aria-label="Ledger month"></select><button type="button" data-refresh>Refresh</button>');
  panel.innerHTML='<div class="ledger-tabs379" role="group" aria-label="Open ledgers"></div><section class="ledger-detail379" aria-live="polite"></section>';
  const input=header.querySelector('[role=searchbox]'),matches=header.querySelector('.ledger-matches379'),picker=header.querySelector('select'),refresh=header.querySelector('[data-refresh]');
  const tabs=panel.querySelector('.ledger-tabs379'),detail=panel.querySelector('section');
  const accounts=AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.is_posting!==false).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  const key='ledger-tabs381:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+liveProfile.id;
  const views=[],request=scope.begin(),today=appLocalDate().slice(0,7);
  let active;
  function newView(account,month=today){return {account,month,page:0,selectedRow:null,lines:null,revision:0};}
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
  function draw(){
   picker.disabled=!active||!active.lines||active.busy;refresh.disabled=!views.length;
   if(!active||active.busy||active.error||!active.lines){
    picker.innerHTML=option(active?.month||'',active?.month?summaryPeriod14331.monthLabel(active.month):'All months');
    detail.textContent=active?(active.error||'Loading ledger…'):'';
    if(active?.error)retry(detail,()=>read(active));return;
   }
   const {account:selected,month,lines,page,coverage,source}=active;
   const dates=lines.map(l=>l.date.slice(0,7));
   const bounds=coverage?[coverage.from.slice(0,7),coverage.to.slice(0,7)]:[today.slice(0,4)+'-01',today,...dates].sort();
   const months=[];
   for(let m=bounds.at(-1);m>=bounds[0];){
    months.push(m);
    const [year,number]=m.split('-').map(Number);
    m=number===1?(year-1)+'-12':year+'-'+String(number-1).padStart(2,'0');
   }
   const r=journalRows(lines,month),data=r.detail.slice(page*100,page*100+100);
   picker.innerHTML=option('',coverage?'All downloaded months':'All months')+months.map(m=>option(m,summaryPeriod14331.monthLabel(m))).join('');picker.value=month;
   detail.innerHTML='<h3>'+esc(selected.code+' · '+selected.name+' ('+selected.currency+')')+'</h3><div class="ledger-stats379">'+[['Opening',signed(r.start)],['Total debit',amt(r.dr)],['Total credit',amt(r.cr)],['Closing balance',signed(r.balance)]].map(([k,v])=>'<div><small>'+k+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div><p>'+esc(source)+(month?'':' · Annual opening entries establish each year’s balance and are excluded from turnover.')+'</p><div class="watch-scroll"><table class="ledger-lines379"><thead><tr><th>Date</th><th>Entry ID</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>'+data.map(({l,debit,credit,balance},i)=>'<tr tabindex="0" data-line="'+(page*100+i)+'" class="'+(active.selectedRow===page*100+i?'selected':'')+'">'+[formatAppDate(l.date),l.id,l.memo||l.generalMemo,amt(debit),amt(credit),signed(balance)].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+(data.length?'':'<tr><td colspan="6">No activity in this period.</td></tr>')+'</tbody></table></div>'+(r.detail.length>100?'<footer><button data-prev>Previous</button><span>'+String(page*100+1)+'–'+Math.min((page+1)*100,r.detail.length)+' of '+r.detail.length+'</span><button data-next>Next</button></footer>':'');
   const highlight=e=>{const row=e.target.closest('[data-line]');if(!row)return;
    detail.querySelector('tr.selected')?.classList.remove('selected');row.classList.add('selected');active.selectedRow=Number(row.dataset.line);};
   detail.onclick=highlight;detail.onkeydown=e=>{if(e.target.matches('[data-line]')&&['Enter',' '].includes(e.key)){e.preventDefault();highlight(e);}};
   for(const [selector,step] of [['[data-prev]',-1],['[data-next]',1]]){const b=detail.querySelector(selector);if(b){b.disabled=page+step<0||(page+step)*100>=r.detail.length;b.onclick=()=>{active.page+=step;draw();};}}
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
   if(!canAccessAppTarget(kind==='ledger'?'report-open-gl':'report-reconciliation'))return showCenterStatus('Access to this report is required.',true);
   const box=document.createElement('dialog'),name=button.getAttribute('aria-label'),state={dialog:box};active=state;
   box.className='watch-dialog';box.setAttribute('aria-label',name);box.innerHTML='<header><h2>'+esc(name)+'</h2><button class="close" aria-label="Close" type="button">×</button></header><div class="watch-body"></div>';
   root.append(box);box.showModal();box.querySelector('.close').onclick=()=>box.close();outside(box,()=>box.close());
   box.addEventListener('close',()=>{state.request?.abort();box.remove();if(active===state){active=null;button.focus();}},{once:true});
   const scope={begin(){state.request?.abort();return state.request=new AbortController();},current(q){return active===state&&q===state.request&&box.open&&id===session()&&client===ojmDb&&!window.workspaceRequest138?.target;},
    async rpc(name,args,q){const result=await client.schema('public').rpc(name,args).abortSignal(q.signal);if(result.error)throw result.error;return result.data;}};
   (kind==='ledger'?ledger:differences)(box.querySelector('.watch-body'),scope);
  };
  return close;
 }
 return {install,outside};
})();

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
  function close(){if(active){active.controller?.abort();if(active.dialog.open)active.dialog.close();active.dialog.remove();active=null;}}
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
    .rail{display:grid;width:38px;gap:5px}
    .rail button,.tasks{appearance:none;margin:0;border:0;border-radius:8px;background:var(--pine);color:#fffaf1}
    .tasks{height:clamp(200px,34vh,330px);display:flex;align-items:stretch;justify-content:center;padding:6px 2px}
    .rail .lane{position:relative;min-width:0;flex:1;display:grid;justify-items:center;padding:6px 0}
    .line{position:relative;background:#547565;border-radius:1px;width:6px}
    .line i,.meter i{position:absolute;bottom:0;inset-inline:0;border-radius:inherit;height:var(--level);background:var(--tint)}
    .line::before{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;
      background:repeating-linear-gradient(to top,transparent 0 calc(var(--step-size,102%) - 1px),var(--pine) calc(var(--step-size,102%) - 1px) var(--step-size,102%))}
    .level-thumb{position:absolute;z-index:2;left:50%;bottom:var(--level);transform:translate(-50%,50%);
      width:14px;height:5px;border-radius:1px;background:var(--tint);box-shadow:0 1px 0 #103728,0 -1px 0 #103728}
    .empty{width:100%;padding:0}
    .db{height:38px;width:38px;padding:0;display:grid;place-items:center}
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
    @media(max-height:600px){.tasks{height:clamp(86px,32vh,190px)}.summary{padding:8px 16px}.checklists{padding:10px 16px}}
    .watch-tools{position:fixed;top:12px;right:inherit;display:grid;gap:5px}
    .watch-tools button{width:38px;height:38px;border:0;border-radius:7px;background:var(--pine);color:white;font-weight:bold;font-size:12px}
    .watch-tools svg{width:21px;height:21px;vertical-align:middle;fill:none;stroke:currentColor;stroke-width:1.7}
    dialog.watch-dialog{inset:12px 58px auto auto;width:min(740px,calc(100vw - 84px));max-height:calc(100dvh - 24px);padding:16px;gap:12px}
    .watch-dialog header,.watch-toolbar,.watch-dialog footer{display:flex;align-items:center;gap:8px}
    .watch-dialog header{justify-content:space-between}.watch-toolbar{justify-content:flex-end;flex-wrap:wrap}.watch-toolbar label{margin-right:auto}
    .watch-toolbar button,.watch-dialog footer button,.watch-dialog select,.watch-dialog input[type=search]{border:1px solid #aec1b3;border-radius:5px;padding:5px 9px;min-height:32px;background:#fff}
    .watch-dialog [hidden]{display:none!important}.watch-body{min-height:0;overflow:auto}.watch-body p{font-size:12px;color:#52665b}
    .watch-scroll{overflow:auto}.watch-body table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
    .watch-body :is(th,td){padding:8px 6px;border-bottom:1px solid #d6dfd8;text-align:right}.watch-body th:first-child{text-align:left;width:35%}.watch-body thead{background:#edf5ee}.watch-body small{display:block;font-weight:normal;color:#53685a}
    .watch-options{max-height:47vh;overflow:auto;margin:8px 0}.watch-options label{display:flex;gap:8px;align-items:center;padding:6px;border-bottom:1px solid #dde5de}.watch-dialog input[type=search]{width:100%;margin-top:8px}.watch-dialog footer{justify-content:flex-end}
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
    .ledger-detail379>h3{margin:0 0 8px}
    .ledger-lines379 tr[data-line]{cursor:pointer}
    .ledger-lines379 tr[data-line]:hover{background:#edf5ee}
    .ledger-lines379 tr.selected>td{background:#d3e7dc}
    .ledger-lines379 tr.selected>td:first-child{box-shadow:inset 3px 0 #176449}
    @media(max-height:735px){.watch-tools{position:static;display:flex;flex-direction:column}.tasks{height:clamp(70px,17vh,115px)}}
  </style>
  <div class="watch-tools"><button type="button" data-watch="balances" aria-haspopup="dialog" aria-label="Account balances" title="Account balances"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h16M11 9v11m3-7h3m-3 4h3"/></svg></button><button type="button" data-watch="rates" aria-haspopup="dialog" aria-label="Foreign account rates" title="Foreign account rates">FX</button><button type="button" data-rail-tool="calendar" aria-haspopup="dialog" aria-label="Company calendar" title="Company calendar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v15H4zM4 10h16M8 3v5m8-5v5m-9 6h3m2 0h3"/></svg></button><button type="button" data-rail-tool="differences" aria-haspopup="dialog" aria-label="Reconciliation differences" title="Reconciliation differences"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h15l-3-3m6 13H6l3 3M6 11h5m3 2h4"/></svg></button><button type="button" data-rail-tool="ledger" aria-haspopup="dialog" aria-label="Account ledger" title="Account ledger"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6Q8 3 3 5v14q5-2 9 1 4-3 9-1V5q-5-2-9 1v14"/></svg></button></div>
  <div class="rail">
    <div class="tasks" role="group" aria-label="Pinned sequential checklists"></div>
    <button class="db" type="button" aria-haspopup="dialog"><strong>—</strong></button>
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
