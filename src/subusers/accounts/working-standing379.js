/* Only the visible workspace listens for changes. The revision contains no amounts. */
window.WorkingStanding379=(()=>{
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cents=n=>Math.round(Number(n||0)*100);
 let active=null;
 function projected(data,requests){
  const rows=new Map(data.accounts.map(a=>[a.id,{...a,available:cents(a.opening)+cents(a.received),out:cents(a.used)}]));
  const seen=new Set(),replaced=new Set();
  function apply(id,change){const a=rows.get(id);if(a){a.available+=Math.max(change,0);a.out+=Math.max(-change,0)}}
  for(const p of requests){
   if(!p?.p_key||seen.has(p.p_key))continue;
   seen.add(p.p_key);
   if(data.lines.some(l=>l.group?.startsWith(p.p_key+':')))continue;
   for(const l of data.lines){
    if(!p.p_edit_ids?.includes(l.id)||replaced.has(l.id+'/'+l.account))continue;
    replaced.add(l.id+'/'+l.account);
    const a=rows.get(l.account);if(a){a.available-=Math.max(cents(l.amount),0);a.out-=Math.max(-cents(l.amount),0)}
   }
   for(const l of p.p_items||[]){
    const n=cents(l.amount)*(l.direction==='in'?1:-1);
    for(const [id,delta] of [[l.fund,n],[l.account,-n]]){
     const a=rows.get(id);if(a&&l.date<=data.asOf&&(!a.start||l.date>a.start))apply(id,delta);
    }
   }
  }
  return [...rows.values()];
 }
 function panel(s){
  const host=s.host();if(!host||!s.current())return;
  const title=s.cashier?'Cash remaining to surrender':'Remaining funds';
  let html='<h3>'+title+'</h3>';
  if(s.data){
   const rows=projected(s.data,s.queue());
   html+='<div class="personal-metrics1437">'+rows.map(a=>{
    const amount=n=>escape(s.money(n/100,a.currency));
    return '<article class="card currency-coded14231" data-currency-code="'+escape(a.currency)+'"><small>'+escape(a.name)+'</small><strong>'+amount(a.available-a.out)+'</strong><p>Available '+amount(a.available)+' · Paid or handed over '+amount(a.out)+'</p>'+
      (a.settledThrough&&a.settled?'<p>Carried forward '+amount(cents(a.opening))+' · Handed over by '+escape(s.date(a.settledThrough))+' '+amount(cents(a.settled))+'</p>':'')+'</article>';
   }).join('')+'</div>';
   if(!rows.length)html+='<p>No tracked accounts are assigned.</p>';
  }else html+='<p role="status">'+(s.failed?'Balance unavailable.':'Loading balances…')+'</p>';
  if(s.failed&&s.data)html+='<small>Showing the last downloaded balance.</small>';
  if(s.failed)html+='<button type="button" class="je-btn je-btn-secondary" data-standing-retry>Refresh balance</button>';
  if(host._standingHtml!==html){host.innerHTML=html;host._standingHtml=html;const retry=host.querySelector('[data-standing-retry]');if(retry)retry.onclick=()=>refresh(s)}
 }
 async function refresh(s){
  if(active!==s)return;
  if(!s.current()){close();return}
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
 function close(){const s=active;active=null;if(s?.channel)s.client.removeChannel(s.channel)}
 function open(options){
  if(active?.owner===options.owner&&active.actor===options.actor&&active.client===options.client&&active.current()){
   Object.assign(active,options);panel(active);return;
  }
  close();const s=active={...options,data:options.cached||null};panel(s);void refresh(s);
  if(s.client.channel){
   s.channel=s.client.channel('working-funds-'+s.owner)
    .on('postgres_changes',{event:'*',schema:'public',table:'workspace_fund_revision379',filter:'owner_id=eq.'+s.owner},()=>refresh(s))
    .subscribe(status=>{if(active!==s)return;if(status==='SUBSCRIBED')void refresh(s);else if(['CLOSED','TIMED_OUT','CHANNEL_ERROR'].includes(status)){s.failed=true;panel(s)}});
  }
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden){close()}else window.dispatchEvent(new Event('standing-visible379'))});
 window.addEventListener('online',()=>{if(active)void refresh(active)});
 return {open,close,projected,refresh:()=>active&&refresh(active),paint:()=>active&&panel(active)};
})();
