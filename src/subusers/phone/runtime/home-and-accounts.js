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
      cached:S.data.workingStanding,queue:()=>queue().map(q=>q.params),read:()=>rpc('workspace_standing379',{p_owner:owner}),
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
