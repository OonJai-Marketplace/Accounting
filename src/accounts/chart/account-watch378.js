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
