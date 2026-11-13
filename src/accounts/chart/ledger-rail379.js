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
