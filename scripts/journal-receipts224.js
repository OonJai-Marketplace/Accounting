/* Journal and workspace entry points for the shared private receipt viewer. */
(()=>{'use strict';
const enabled=()=>document.documentElement.dataset.device132!=='phone'&&!window.PhoneWorkspace14242;
const identity=()=>[typeof liveProfile==='undefined'?'':liveProfile?.id||'',window.OJM_SUPABASE_URL||'',window.workspaceRequest138?.target||''].join(':');
async function session(){
 if(window.deviceVault14334&&!deviceVault14334.unlocked)throw Error('Sign in to open receipts.');
 if(typeof ojmDb==='undefined'||!ojmDb)throw Error('Sign in to Accounting.');
 const r=await ojmDb.auth.getSession();if(r.error||!r.data.session)throw Error('Sign in to Accounting.');return r.data.session;
}
const client=()=>ReceiptLinks208.create({url:window.OJM_SUPABASE_URL,key:window.OJM_SUPABASE_ANON_KEY,session});
function open(id){
 if(!enabled())return;
 const staff=typeof id==='object'&&id?.staffLine;
 const request=staff?{staffLine:String(id.staffLine)}:{entry:String(id||'')};
 return window.ScanViewer208.open(request,{
  journal:true,
  label:staff?id.label:request.entry,
  canAdd:()=>window.access113?.can(staff?'sub-users-workspace':'journal','edit'),
  onList:result=>{
   scopeChanged226();
   remember226(id,result.resolved===false?null:result.documents.length>0);
  }
 });
}
function button(id){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent='Receipts';b.dataset.journalReceipts224=typeof id==='object'?id.staffLine:id;b.onclick=()=>void open(id);return b;}
// Receipt presence is metadata only. Preview URLs are fetched only on opening.
const statusCache226=new Map();let statusScope226='',statusBusy226=false,statusTimer226=0,statusRevision240=0;
const key226=id=>typeof id==='object'?'staff:'+id.staffLine:'entry:'+id;
const scope226=()=>identity()+':'+(window.deviceVault14334?.actor||'')+':'+(window.deviceVault14334?.unlocked===false?'locked':'unlocked');
const svg226=body=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+body+'</svg>';
const chain226='<path d="m10 13 4-4M8 16l-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 10a4.2 4.2 0 0 0 6 0l4-4a4.2 4.2 0 0 0-6-6l-1 1"/>';
function paint226(b,state){
 const id=b._receiptTarget226,label=typeof id==='object'?id.label:id;
 const message='Supporting documents attached. Open receipts.';
 // Rechecking known links must not make them blink; account changes still clear them immediately.
 if(state==='loading'&&b.dataset.receiptState226==='linked')return;
 const hidden=state!=='linked';if(b.hidden!==hidden)b.hidden=hidden;
 if(b.dataset.receiptState226!==state){b.dataset.receiptState226=state;b.innerHTML=state==='linked'?svg226(chain226):'';}
 const title=label+': '+message;if(b.title!==title)b.title=title;if(b.getAttribute('aria-label')!==title)b.setAttribute('aria-label',title);
}
// Metadata checks never create a table notice or global notification.

function remember226(id,hasDocuments){
 if(statusScope226!==scope226())return;
 const state=hasDocuments===true?'linked':hasDocuments===false?'missing':'unknown',key=key226(id);
 statusCache226.set(key,{state});

 for(const b of document.querySelectorAll('.jr-link226'))if(b.dataset.receiptKey226===key)paint226(b,state);
}
function scopeChanged226(){
 const next=scope226();if(next===statusScope226)return false;
 statusScope226=next;statusCache226.clear();statusBusy226=false;
 for(const b of document.querySelectorAll('.jr-link226'))paint226(b,'unknown');
 return true;
}
// Observe ledger cells once. Revisiting or scrolling a long report should only
// measure receipt links near the viewport, even when every line is loaded.
const nearbyLedger226=new Set(),observedLedger226=new WeakSet();
const ledgerObserver226=typeof IntersectionObserver==='function'?new IntersectionObserver(records=>{
 for(const record of records){
  if(record.isIntersecting)nearbyLedger226.add(record.target);else nearbyLedger226.delete(record.target);
 }
 schedule226();
},{rootMargin:'300px 0px'}):null;
function observeLedger226(root,remove=false){
 if(!ledgerObserver226)return;
 const selector='.r79-link[data-entry]';
 const labels=root.matches?.(selector)?[root]:root.querySelectorAll(selector);
 for(const label of labels){
  if(remove){
   if(!label.isConnected){observedLedger226.delete(label);nearbyLedger226.delete(label);ledgerObserver226.unobserve(label)}
  }else if(!observedLedger226.has(label)){
   observedLedger226.add(label);ledgerObserver226.observe(label);
  }
 }
}
function decorate226(){
 if(!enabled())return;
 for(const label of [...document.querySelectorAll('[data-entry-menu14387]'),...(ledgerObserver226?nearbyLedger226:document.querySelectorAll('.r79-link[data-entry]'))]){
  if(!label.isConnected){nearbyLedger226.delete(label);continue}
  if(label.closest('.jr-id226,.scan-viewer208'))continue;
  const row=label.closest('tr[data-entry-id]'),id=label.dataset.entry||row?.dataset.entryId;
  if(!id)continue;
  const target=row?.closest('#personalWorkspace1437')?{staffLine:id,label:label.textContent.trim()}:id;
  const wrap=document.createElement('span'),b=document.createElement('button');wrap.className='jr-id226';if(label.matches('.r79-link[data-entry]'))wrap.dataset.ledgerReceipt299='';b.className='jr-link226 no-print';b.type='button';b._receiptTarget226=target;b.dataset.receiptKey226=key226(target);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();void open(target);};b.ondblclick=e=>e.stopPropagation();
  if(label.hasAttribute('data-entry-menu14387')){
   label.tabIndex=0;label.setAttribute('role','button');label.removeAttribute('aria-haspopup');
   label.setAttribute('aria-label','Open receipts for '+(target.label||target));label.title='Open receipts';
   label.onclick=b.onclick;
   label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();void open(target);}};
   label.ondblclick=e=>e.stopPropagation();
  }
  paint226(b,statusCache226.get(key226(target))?.state||'unknown');label.replaceWith(wrap);wrap.append(label,b);
 }
}
async function checkVisible226(){
 statusTimer226=0;if(!enabled()||document.hidden)return;
 scopeChanged226();decorate226();
 if(statusBusy226||typeof liveProfile==='undefined'||!liveProfile?.id||window.deviceVault14334&&(deviceVault14334.unlocked===false||deviceVault14334.actor!==liveProfile.id)||navigator.onLine===false)return;
 const targets=new Map();
 const journalLinks=document.querySelectorAll('.jr-id226:not([data-ledger-receipt299])>.jr-link226');
 const ledgerLinks=ledgerObserver226?[...nearbyLedger226].map(label=>label.nextElementSibling).filter(b=>b?.matches('.jr-link226')):document.querySelectorAll('[data-ledger-receipt299]>.jr-link226');
 for(const b of [...journalLinks,...ledgerLinks]){
  const box=b.parentElement.getBoundingClientRect();if(!box.width||!box.height||box.bottom<0||box.top>innerHeight+300)continue;
  const key=b.dataset.receiptKey226,cached=statusCache226.get(key);
  if(cached){paint226(b,cached.state);continue;}
  if(targets.size<100||targets.has(key)){targets.set(key,b._receiptTarget226);paint226(b,'loading');}
 }
 if(!targets.size)return;
 statusBusy226=true;const scope=statusScope226,revision=statusRevision240,entries=[],staffLines=[];

 for(const target of targets.values())if(typeof target==='object')staffLines.push(target.staffLine);else entries.push(target);
 try{
  const signed=await session();if(signed.user.id!==liveProfile?.id)throw Error('Account changed.');
  const response=await client().api('receipt-status',{entries,staffLines});
  if(scope!==scope226()||scope!==statusScope226||revision!==statusRevision240)return;
  for(const target of targets.values()){const row=typeof target==='object'?response.staffLines?.find(r=>r.staffLine===target.staffLine):response.entries?.find(r=>r.entry===target);remember226(target,row?.hasDocuments);}
 }catch{
  if(scope===scope226()&&scope===statusScope226&&revision===statusRevision240)for(const target of targets.values())remember226(target,null);
 }finally{if(scope===statusScope226){statusBusy226=false;schedule226();}}
}
function schedule226(){if(!statusTimer226)statusTimer226=setTimeout(()=>void checkVisible226(),120);}
function refresh226(){statusRevision240++;statusCache226.clear();schedule226();}
function receiptChanged240(value){let change;try{change=typeof value==='string'?JSON.parse(value):value;}catch{return;}if(!change||change.actor!==liveProfile?.id)return;statusRevision240++;const labels=new Set(change.labels||[]);for(const b of document.querySelectorAll('.jr-link226')){const t=b._receiptTarget226;if(labels.has(typeof t==='object'?t.label:t))statusCache226.delete(b.dataset.receiptKey226);}schedule226();}
function start226(){
 // Remove notices left by earlier cached releases without touching journal rows.
 document.querySelectorAll('.jr-check-note226').forEach(n=>n.remove());
 observeLedger226(document);
 const mutations=new MutationObserver(records=>{
  let changed=false;
  for(const record of records){
   if(record.target.closest?.('.jr-id226,.scan-viewer208'))continue;
   for(const node of record.removedNodes)if(node.nodeType===1&&!node.isConnected)observeLedger226(node,true);
   for(const node of record.addedNodes){
    if(node.nodeType!==1)continue;
    observeLedger226(node);
    if(!changed)changed=node.matches('[data-entry-menu14387],.r79-link[data-entry],.jr-link226')||!!node.querySelector('[data-entry-menu14387],.r79-link[data-entry],.jr-link226');
   }
  }
  if(changed)schedule226();
 });
 mutations.observe(document.body,{childList:true,subtree:true});schedule226();
 document.addEventListener('scroll',schedule226,true);window.addEventListener('page113',schedule226);window.addEventListener('focus',schedule226);window.addEventListener('online',schedule226);

 document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule226();});
 for(const event of ['account-access477','page113','pageshow','focus','tabletviewport132'])window.addEventListener(event,guard477);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)guard477();});
 window.addEventListener('storage',e=>{if(e.key==='ojm-receipts-changed240')receiptChanged240(e.newValue);});
 window.addEventListener('receipt-links-changed240',e=>receiptChanged240(e.detail));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start226,{once:true});else start226();
function guard477(){if(scopeChanged226())schedule226();}
window.JournalReceipts224={enabled,open,button,refresh:refresh226};
})();
