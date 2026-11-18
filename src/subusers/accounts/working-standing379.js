/* Only the visible workspace listens for changes. The revision contains no amounts. */
window.WorkingStanding379=(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cents=n=>Math.round(Number(n||0)*100);
 let active=null;
 function projected(data,requests){
  const rows=new Map(data.accounts.map(a=>[a.id,{...a,available:cents(a.opening)+cents(a.received),out:cents(a.used),pending:[]}]));
  const seen=new Set(),replaced=new Set(),stages={draft:'Unsubmitted',returned:'Returned',submitted:'Submitted',approved:'Approved'};
  for(const line of data.lines){
   const row=rows.get(line.account);
   if(row&&stages[line.status]&&line.counted!==false&&cents(line.amount)){
    row.pending.push({...line,transaction_date:line.date,delta:cents(line.amount),label:stages[line.status]});
   }
  }
  for(const p of requests){
   if(!p?.p_key||seen.has(p.p_key))continue;
   seen.add(p.p_key);
   if(data.lines.some(l=>l.group?.startsWith(p.p_key+':')))continue;
   for(const l of data.lines){
    if(!p.p_edit_ids?.includes(l.id)||replaced.has(l.id+'/'+l.account)||l.counted===false)continue;
    replaced.add(l.id+'/'+l.account);
    const a=rows.get(l.account);
    if(a){
     a.available-=Math.max(cents(l.amount),0);a.out-=Math.max(-cents(l.amount),0);
     a.pending=a.pending.filter(item=>item.id!==l.id);
    }
   }
   for(const [index,l] of (p.p_items||[]).entries()){
    if(l.fund===l.account)continue;
    const n=cents(l.amount)*(l.direction==='in'?1:-1);
    for(const [id,delta] of [[l.fund,n],[l.account,-n]]){
     const a=rows.get(id);
     if(!a||!delta||l.date>data.asOf||(a.start?l.date<=a.start:l.date<data.asOf.slice(0,4)+'-01-01'))continue;
     a.available+=Math.max(delta,0);a.out+=Math.max(-delta,0);
     a.pending.push({id:p.p_key+':'+index,transaction_date:l.date,line_no:index+1,created_at:p.savedAt||'',
      memo:l.memo,delta,label:['attention','blocked'].includes(p.deviceStatus)?'Device save · Needs attention':'Saved on device'});
    }
   }
  }
  return [...rows.values()];
 }
 function breakdown(a,amount,date){
  const net=a.available-a.out;
  let unsubmitted=0,submitted=0;
  for(const item of a.pending){
   if(item.label==='Submitted'||item.label==='Approved')submitted+=item.delta;
   else unsubmitted+=item.delta;
  }
  const base=net-unsubmitted-submitted;
  let html='<dl class="fund-breakdown"><dt>Before pending entries</dt><dd>'+amount(base)+'</dd>'+
   '<dt>Submitted, awaiting posting</dt><dd>'+amount(submitted)+'</dd><dt>Unsubmitted, including device saves</dt><dd>'+amount(unsubmitted)+'</dd></dl>';
  if(!a.pending.length)return html;
  let running=net;
  const details=a.pending.sort(StaffJournalView.newestLine).map(item=>{
   const after=running;running-=item.delta;
   return '<li><div><b>'+escape(item.memo||item.label)+'</b><small>'+escape(date(item.transaction_date))+' · '+escape(item.label)+'</small></div>'+
    '<div><b>'+amount(item.delta)+'</b><small>Remaining '+amount(after)+'</small></div></li>';
  }).join('');
  return html+'<details data-fund-detail="'+escape(a.id)+'"><summary>Pending journal lines ('+a.pending.length+')</summary><ul class="fund-pending">'+details+'</ul></details>';
 }
 function panel(s){
  const host=s.host();if(!host||!s.current())return;
  const title=s.cashier?'Cash remaining to surrender':'Remaining funds';
  let html='<h3>'+title+'</h3>';
  if(s.data){
   const rows=projected(s.data,s.queue());
   html+='<div class="personal-metrics1437">'+rows.map(a=>{
    const amount=n=>escape(StaffJournalView.balance(n,x=>s.money(x/100,a.currency)));
    return '<article class="card currency-coded14231" data-currency-code="'+escape(a.currency)+'"><small>'+escape(a.name)+'</small><strong>'+amount(a.available-a.out)+'</strong><p>Opening and receipts '+amount(a.available)+' · Paid or handed over '+amount(a.out)+'</p>'+
      (s.data.detailVersion?breakdown(a,amount,s.date):'')+
      (a.settledThrough&&a.settled?'<p>Carried forward '+amount(cents(a.opening))+' · Handed over by '+escape(s.date(a.settledThrough))+' '+amount(cents(a.settled))+'</p>':'')+'</article>';
   }).join('')+'</div>';
   if(!rows.length)html+='<p>No tracked accounts are assigned.</p>';
  }else html+='<p role="status">'+(s.failed?'Balance unavailable.':'Loading balances…')+'</p>';
  if(s.failed&&s.data)html+='<small>Showing the last downloaded balance.</small>';
  if(s.failed)html+='<button type="button" class="je-btn je-btn-secondary" data-standing-retry>Refresh balance</button>';
  if(host._standingHtml!==html){const open=new Set([...(s.lastHost||host).querySelectorAll('[data-fund-detail][open]')].map(el=>el.dataset.fundDetail));host.innerHTML=html;host._standingHtml=html;s.lastHost=host;for(const el of host.querySelectorAll('[data-fund-detail]'))el.open=open.has(el.dataset.fundDetail);const retry=host.querySelector('[data-standing-retry]');if(retry)retry.onclick=()=>refresh(s)}
 }
 async function refresh(s){
  if(active!==s)return;
  if(!s.current()){close();return}
  if(s.openingTimer){clearTimeout(s.openingTimer);s.openingTimer=null;s.openingRead=true;}
  if(s.loading){s.again=true;return}
  s.loading=true;
  try{
   const data=await s.read();
   if(active!==s||!s.current())return;
   if(!Array.isArray(data?.accounts)||!Array.isArray(data?.lines))throw Error('Incomplete balance response');
   s.data=data;s.failed=false;await s.remember?.(data);
  }catch(error){if(active===s){s.failed=true;if(['42501','PGRST301','PGRST302'].includes(error.code))s.data=null}}
  finally{s.loading=false;if(active===s){panel(s);if(s.again){s.again=false;void refresh(s)}}}
 }
 function close(){const s=active;active=null;if(s?.openingTimer)clearTimeout(s.openingTimer);if(s?.channel)s.client.removeChannel(s.channel)}
 function open(options){
  if(active?.owner===options.owner&&active.actor===options.actor&&active.client===options.client&&active.current()){
   Object.assign(active,options);panel(active);return;
  }
  close();const s=active={...options,data:options.cached||null};panel(s);
  if(s.client.channel){
   // Establish the event boundary before taking the first snapshot. This avoids
   // two opening reads without losing a save in the subscribe/read gap.
   // One bounded fallback keeps cached/REST balances usable if the live socket
   // is slow. A later successful subscription then needs its own catch-up read.
   s.openingTimer=setTimeout(()=>{s.openingTimer=null;if(active===s){s.openingRead=true;void refresh(s)}},400);
   s.channel=s.client.channel('working-funds-'+s.owner)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspace_fund_revision379',filter:'owner_id=eq.'+s.owner},()=>{if(s.subscribed)void refresh(s)})
    .subscribe(status=>{if(active!==s)return;if(status==='SUBSCRIBED'){if(s.subscribed)return;s.subscribed=true;clearTimeout(s.openingTimer);s.openingTimer=null;s.openingRead=true;void refresh(s);}else if(['CLOSED','TIMED_OUT','CHANNEL_ERROR'].includes(status)){s.subscribed=false;clearTimeout(s.openingTimer);s.openingTimer=null;s.failed=true;panel(s);if(!s.openingRead){s.openingRead=true;void refresh(s)}}});
  }else void refresh(s);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){close()}else window.dispatchEvent(new Event('standing-visible379'))});
 window.addEventListener('online',()=>{if(active)void refresh(active)});
 return {open,close,projected,refresh:()=>active&&refresh(active),paint:()=>active&&panel(active)};
})();
