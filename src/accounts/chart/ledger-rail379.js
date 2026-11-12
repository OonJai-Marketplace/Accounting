/* Desktop accounting shortcuts. Queries start only after the user chooses a tool. */
window.RailTools379=(()=>{
 'use strict';
 const esc=v=>escapeHtml(String(v??''));
 const amt=n=>Math.abs(n/100).toLocaleString(appNumberLocale(),{minimumFractionDigits:2,maximumFractionDigits:2});
 const signed=n=>n<0?'('+amt(n)+')':amt(n);
 const standing=n=>signed(n)+(n>0?' DR':n<0?' CR':'');
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
  panel.innerHTML='<label>Find account <input type="search" aria-label="Find ledger account" placeholder="Account name or code"></label><div class="ledger-matches379"></div><section class="ledger-detail379" aria-live="polite"></section>';
  const input=panel.querySelector('input'),matches=panel.querySelector('.ledger-matches379'),detail=panel.querySelector('section');
  const accounts=AccountingStore.accounts.filter(a=>a.id&&a.isPosting!==false&&a.is_posting!==false).sort((a,b)=>String(a.code).localeCompare(String(b.code),undefined,{numeric:true}));
  let selected,month=appLocalDate().slice(0,7),lines=[],page=0,source='',coverage=null;
  function search(){
   const term=input.value.toLowerCase().trim();matches.replaceChildren();
   if(!term){matches.hidden=true;return;}
   const found=accounts.filter(a=>(a.code+' '+a.name+' '+a.currency).toLowerCase().includes(term));matches.hidden=false;
   for(const a of found.slice(0,15)){
    const b=document.createElement('button');b.type='button';b.textContent=a.code+' · '+a.name+' ('+a.currency+')';b.onclick=()=>{selected=a;input.value='';matches.hidden=true;month=appLocalDate().slice(0,7);void read();};matches.append(b);
   }
   if(!found.length)matches.textContent='No matching accounts.';
  }
  input.oninput=search;input.onkeydown=e=>{if(e.key==='Enter'&&input.value.trim())matches.querySelector('button')?.click();};input.focus();
  async function read(){
   const a=selected;if(!a)return;const request=scope.begin();detail.textContent='Loading ledger…';
   try{
    coverage=null;let rows;const offline=window.offline14239?.offline();
    if(offline){
     const all=window.reportWindow143195?.cachedLedger?.();
     const local=localRows(a);
     rows=[...(all||[]).filter(l=>l.accountId===a.id&&(l.date<local.win.from||l.date>local.win.to)),...local.rows];
     if(!all){coverage=local.win;month=month>=coverage.from.slice(0,7)&&month<=coverage.to.slice(0,7)?month:coverage.to.slice(0,7);}
     source=all?'Offline · downloaded history':'Downloaded period only · '+formatAppDate(local.win.from)+' – '+formatAppDate(local.win.to);
    }else{
     rows=await scope.rpc('account_ledger379',{p_account:a.id},request);if(!scope.current(request))return;
     if(!Array.isArray(rows))throw Error('Incomplete ledger response.');
     source='Posted journal';
     const pending=window.journalDurable14385?.pending().some(j=>(j.status!=='saved'||j.changes?.some(op=>op.status!=='saved'))&&[...(j.entries||[]),...(j.changes||[]).flatMap(op=>[op.expected,op.value].filter(Boolean))].some(e=>e.lines?.some(l=>l.account_id===a.id)));
     if(pending){const local=localRows(a);rows=[...rows.filter(l=>l.date<local.win.from||l.date>local.win.to),...local.rows];source='Includes active journal changes saved on this device';}
    }
    if(!scope.current(request))return;
    if(rows.some(l=>l.currency!==a.currency))throw Error('Review mismatched currencies for this account.');
    lines=rows;page=0;draw();
   }catch(e){if(scope.current(request)){detail.textContent=e.message||'Could not load the ledger.';retry(detail,read);}}
  }
  function draw(){
   const dates=lines.map(l=>l.date.slice(0,7)),today=appLocalDate().slice(0,7);
   const bounds=coverage?[coverage.from.slice(0,7),coverage.to.slice(0,7)]:[today.slice(0,4)+'-01',today,...dates].sort();
   const months=[];
   for(let m=bounds.at(-1);m>=bounds[0];){
    months.push(m);
    const [year,number]=m.split('-').map(Number);
    m=number===1?(year-1)+'-12':year+'-'+String(number-1).padStart(2,'0');
   }
   const r=journalRows(lines,month),data=r.detail.slice(page*100,page*100+100);
   detail.innerHTML='<div class="watch-toolbar"><h3>'+esc(selected.code+' · '+selected.name+' ('+selected.currency+')')+'</h3><select aria-label="Ledger month">'+option('',coverage?'All downloaded months':'All months')+months.map(m=>option(m,summaryPeriod14331.monthLabel(m))).join('')+'</select><button type="button" data-refresh>Refresh</button></div><div class="ledger-stats379">'+[['Opening',standing(r.start)],['Total debit',amt(r.dr)],['Total credit',amt(r.cr)],['Closing balance',standing(r.balance)]].map(([k,v])=>'<div><small>'+k+'</small><strong>'+esc(v)+'</strong></div>').join('')+'</div><p>'+esc(source)+(month?'':' · Annual opening entries establish each year’s balance and are excluded from turnover.')+'</p><div class="watch-scroll"><table class="ledger-lines379"><thead><tr><th>Date</th><th>Entry ID</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>'+data.map(({l,debit,credit,balance})=>'<tr>'+[formatAppDate(l.date),l.id,l.memo||l.generalMemo,amt(debit),amt(credit),standing(balance)].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('')+(data.length?'':'<tr><td colspan="6">No activity in this period.</td></tr>')+'</tbody></table></div>'+(r.detail.length>100?'<footer><button data-prev>Previous</button><span>'+String(page*100+1)+'–'+Math.min((page+1)*100,r.detail.length)+' of '+r.detail.length+'</span><button data-next>Next</button></footer>':'');
   const sel=detail.querySelector('select');sel.value=month;sel.onchange=()=>{month=sel.value;page=0;draw();};
   detail.querySelector('[data-refresh]').onclick=read;
   for(const [selector,step] of [['[data-prev]',-1],['[data-next]',1]]){const b=detail.querySelector(selector);if(b){b.disabled=page+step<0||(page+step)*100>=r.detail.length;b.onclick=()=>{page+=step;draw();};}}
  }
 }
 function retry(node,fn){const b=document.createElement('button');b.type='button';b.textContent='Retry';b.onclick=fn;node.append(' ',b);}
 function differences(panel,scope){
  let month=null;
  async function read(){
   const request=scope.begin();panel.textContent='Checking reconciliation differences…';
   try{
    const work=await scope.rpc('reconciliation_differences379',{p_month:month?month+'-01':null},request);
    if(!scope.current(request))return;
    if(!Array.isArray(work?.rows)||!Array.isArray(work.months))throw Error('Incomplete reconciliation response.');
    month=work.month;
    panel.innerHTML='<div class="watch-toolbar"><label>Open book <select>'+work.months.map(m=>option(m.month,summaryPeriod14331.monthLabel(m.month))).join('')+'</select></label><button type="button">Refresh</button></div>'+(work.rows.length?'<div class="watch-scroll"><table><thead><tr><th>Account</th><th>Book balance</th><th>Statement / count</th><th>Outstanding</th><th>Difference</th></tr></thead><tbody>'+work.rows.map(r=>'<tr><th scope="row">'+esc(r.name)+'<small>'+esc(r.code+' · '+r.currency)+(r.changed?' · Review updated ledger':'')+'</small></th><td>'+esc(signed(r.book))+'</td><td>'+esc(r.actual==null?({cash:'Awaiting count',bank:'Awaiting statement',balance:'Awaiting balance'}[r.method]||'Awaiting balance'):signed(r.actual))+'</td><td>'+esc(r.actual==null?'—':signed(r.outstanding))+'</td><td>'+esc(r.difference==null?'—':signed(r.difference))+'</td></tr>').join('')+'</tbody></table></div>':'<p>'+(month?'No outstanding reconciliation differences for this book.':'No open book.')+'</p>');
    const sel=panel.querySelector('select');sel.value=month||'';sel.onchange=()=>{month=sel.value;read();};panel.querySelector('button').onclick=read;
   }catch(e){if(scope.current(request)){panel.textContent=e.message||'Could not load reconciliations.';retry(panel,read);}}
  }
  read();
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
