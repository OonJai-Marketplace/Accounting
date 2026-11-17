  function monthControl(){return `<header class="phone-history-header14359"><strong>${esc(new Date(S.month+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}))}</strong><label class="no-print"><input id="month" aria-label="History month" type="month" value="${esc(S.month)}"></label></header>`;}
  function commonActions(){return `<div class="actions no-print">${action('submit',S.submitting?'Submitting…':'Submit',S.submitting?'disabled':'',true)}${action('refresh',S.loading?'Updating…':'Refresh',S.loading?'disabled':'')}</div>`;}
  const visualIcon = type => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+({wallet:'M3 6h18v14H3z M3 6V3h14v3 M16 12h5',plus:'M12 4v16 M4 12h16',book:'M4 3h16v18H4z M8 7h8 M8 11h8 M8 15h5',chart:'M4 20V10 M10 20V4 M16 20v-9 M22 20H2'}[type]||'M3 10l9-7 9 7v11h-6v-6H9v6H3z')+'"/></svg>';
  const progress = (remaining,total) => total>0?Math.max(0,Math.min(100,remaining/total*100)):0;
  function fundCards(list=funds()){return list.map(f=>{const total=Number(f.opening||0)+Number(f.received||0),remaining=balance(f);return `<section class="card fund-card1425"><div class="row"><h2>${accountTitle(f.account_id)}</h2></div><small>Remaining Funds</small><strong class="fund-amount132 ${remaining<0?'negative':''}">${money(remaining,f.currency)}</strong><div class="bar"><i style="width:${progress(remaining,total)}%"></i></div><div class="row"><small>${money(remaining,f.currency)} remaining</small><small>${money(total,f.currency)} total</small></div><div class="grid fund-detail1425"><div><small>Funds received</small><b>${money(f.received,f.currency)}</b></div><div><small>Used / handed over</small><b>${money(Number(f.used||0)+Number(f.handover||0),f.currency)}</b></div></div><p class="muted">Available balance includes saved entries awaiting review. ${queue().length?'Includes device entries awaiting sync.':''}</p></section>`;}).join('')||empty(S.data.savedAt?'No fund accounts are assigned to you.':'Your assigned funds have not downloaded yet.');}
  function home(){
    return `<section class="card" data-standing379></section><div class="grid quick-tiles1425">${[['Post','Record an expense','post','plus'],['Accounts','View accounts','accounts','wallet'],['Entries','Unsubmitted entries','entries','book'],['History','Submitted reports','history','chart']].map(([t,d,page,k])=>`<button type="button" class="tile" data-go="${page}"><b>${t}</b><small>${d}</small><span class="tile-arrow" aria-hidden="true">›</span></button>`).join('')}</div>${monthControl()}<p class="muted">${lines().length} entries this period · ${monthHeaders().filter(j=>j.status==='submitted').length} waiting for review · ${queue().length} waiting to sync</p>${commonActions()}${S.data.pendingSubmit?'<p class="submit-note">The last submission needs confirmation. Refresh records before retrying.</p>':''}<div class="muted">${funds().map(f=>accountTitle(f.account_id)).join(' · ')}</div>`;
  }

  function phoneStanding(){
    const owner=S.owner,epoch=S.epoch;
    const visible=()=>current(owner,epoch)&&S.area==='users'&&['home','accounts'].includes(S.page)&&permission('sub-users-workspace');
    if(!visible()||document.hidden){WorkingStanding379.close();return}
    WorkingStanding379.open({owner,actor:S.actor,client:db,current:visible,host:()=>$('workspace').querySelector('[data-standing379]'),
      cashier:String(S.data.access?.permissions?.job_title||'').trim().toLowerCase()==='cashier',money,date:d=>typeof formatAppDate==='function'?formatAppDate(d):d,
      cached:S.data.workingStanding,queue:()=>queue().map(q=>({...q.params,deviceStatus:q.status,savedAt:q.createdAt?new Date(q.createdAt).toISOString():''})),read:()=>rpc('workspace_standing379',{p_owner:owner}),
      remember:async data=>{if(visible()){S.data.workingStanding=data;await persist(owner,{workingStanding:data})}}
    });
  }
  window.addEventListener('standing-visible379',()=>{if(S.owner)phoneStanding()});

  function otherAssignedFunds(){
    const isCashier=String(S.data.access?.permissions?.job_title||'').trim().toLowerCase()==='cashier';
    if(!isCashier)return '';
    const cash=new Set(accounts().filter(a=>['1016','1017','1018'].includes(a.code)).map(a=>a.id));
    const others=funds().filter(f=>!cash.has(f.account_id));
    return others.length?'<h2>Other assigned accounts</h2>'+fundCards(others):'';
  }

  function mountPhoneLedger(previous){
    const host=$('workspace').querySelector('[data-phone-ledger]');
    if(!host)return;
    const owner=S.owner,epoch=S.epoch;
    if(previous?.dataset.ledgerOwner===owner&&previous.dataset.epoch===String(epoch)){host.replaceWith(previous);return;}
    host.dataset.ledgerOwner=owner;host.dataset.epoch=String(epoch);
    let request=0;
    const live=()=>host.isConnected&&current(owner,epoch)&&S.area==='users'&&S.page==='accounts'&&permission('sub-users-workspace');
    const select=host.querySelector('select'),month=host.querySelector('[type=month]'),result=host.querySelector('[data-ledger-result]');
    month.value=S.month;
    async function load(){
      if(!live()||!host.open)return;
      const stamp=++request,period=month.value;
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)){result.textContent='Choose a month.';return;}
      const read=async args=>{
        if(!live()||stamp!==request)throw Error('Ledger view changed.');
        return rpc('assigned_ledger14281',args);
      };
      result.textContent='Loading posted ledger…';
      try{
        const dates={from:period+'-01',to:new Date(Date.UTC(Number(period.slice(0,4)),Number(period.slice(5)),0)).toISOString().slice(0,10)};
        const grants=await read({p_owner:owner,p_account:null,p_from:dates.from,p_to:dates.to,p_offset:0});
        if(!live()||stamp!==request)return;
        if(!Array.isArray(grants?.accounts))throw Error('Ledger access could not be checked.');
        const selected=select.value;
        select.innerHTML=grants.accounts.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.code+' — '+a.name)+'</option>').join('');
        const account=grants.accounts.find(a=>a.id===selected)||grants.accounts[0];
        select.disabled=!account;
        if(!account){result.textContent='No company ledger accounts have been assigned.';return;}
        select.value=account.id;
        const data=await StaffJournalView.ledgerPeriod(read,owner,account.id,dates);
        if(!live()||stamp!==request)return;
        const amount=n=>esc(money(n,account.currency)),balance=n=>StaffJournalView.balance(n,amount);
        result.innerHTML='<p>Opening <b>'+balance(data.opening)+'</b> · Closing <b>'+balance(data.closing)+'</b></p>'+
          (data.rows.map(r=>'<article class="acc-ledger-line"><small>'+esc(dateLabel(r.date))+' · '+esc(r.reference)+'</small><b>'+esc(r.description)+'</b>'+
            '<div class="row"><span>'+ (Number(r.debit)?'Debit '+amount(r.debit):'Credit '+amount(r.credit))+'</span><span>Running balance <b>'+balance(r.balance)+'</b></span></div></article>').join('')||'<p>No posted transactions this month.</p>');
      }catch(error){if(live()&&stamp===request){result.textContent=error.message;}}
    }
    host.ontoggle=()=>{if(host.open)void load();else{request++;result.replaceChildren();}};
    select.onchange=month.onchange=host.querySelector('button').onclick=load;
  }
