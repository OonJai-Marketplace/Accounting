/* Main-journal receipts: private group previews, loaded as the reader scrolls.
 * Loaded only by the desktop/tablet shell. The phone viewer is independent. */
(()=>{'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const views=new Map(),pendingImages=new Set();let dialog,zoom,observer,epoch=0,actor='',context='',entry='';
const enabled=()=>document.documentElement.dataset.device132!=='phone'&&!window.PhoneWorkspace14242;
const identity=()=>[typeof liveProfile==='undefined'?'':liveProfile?.id||'',window.OJM_SUPABASE_URL||'',window.workspaceRequest138?.target||''].join(':');
function clear(){epoch++;observer?.disconnect();observer=null;for(const cancel of pendingImages)cancel();pendingImages.clear();if(zoom?.open)zoom.close();zoom?.replaceChildren();dialog?.replaceChildren();}
function locked(){return !enabled()||identity()!==context||!actor||window.deviceVault14334&&(!deviceVault14334.unlocked||deviceVault14334.actor!==actor);}
function active(ticket){return ticket===epoch&&dialog?.open&&!locked();}
async function session(){
 if(window.deviceVault14334&&!deviceVault14334.unlocked)throw Error('Sign in to open receipts.');
 if(typeof ojmDb==='undefined'||!ojmDb)throw Error('Sign in to Accounting.');
 const r=await ojmDb.auth.getSession();if(r.error||!r.data.session)throw Error('Sign in to Accounting.');return r.data.session;
}
const client=()=>ReceiptLinks208.create({url:window.OJM_SUPABASE_URL,key:window.OJM_SUPABASE_ANON_KEY,session});
function privateURL(value){const u=new URL(value);if(u.origin!==new URL(window.OJM_SUPABASE_URL).origin||!u.pathname.startsWith('/storage/v1/object/sign/scan-documents208/'))throw Error('This receipt preview is unavailable.');return u.href;}
function pdfURL(value){if(!value)return '';const u=new URL(value);if(u.protocol==='https:'&&u.hostname==='drive.google.com'&&/^\/file\/d\/[\w-]+\/view$/.test(u.pathname))return u.href;return privateURL(value);}
function loading(text){return '<p class="jr-status224" role="status"><span class="jr-spinner224" aria-hidden="true"></span>'+esc(text)+'</p>';}
function host(){if(dialog)return dialog;dialog=document.createElement('dialog');dialog.className='journal-receipts224';dialog.setAttribute('aria-labelledby','jr-title224');dialog.addEventListener('close',()=>{if(!dialog.open)clear();});document.body.append(dialog);return dialog;}
function retryBox(node,message,retry){node.replaceChildren();const p=document.createElement('p');p.setAttribute('role','alert');p.textContent=message;const b=document.createElement('button');b.type='button';b.textContent='Retry';b.onclick=retry;node.append(p,b);}
function observe(node,callback){if(!observer){observer=new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){observer.unobserve(item.target);item.target._receiptLoad224?.();}},{root:dialog.querySelector('.jr-scroll224'),rootMargin:'300px 0px'});}node._receiptLoad224=callback;observer.observe(node);}
function enlarge(img,caption){
 if(locked()||!dialog?.open||!img.complete||!img.naturalWidth)return;
 if(!zoom){zoom=document.createElement('dialog');zoom.className='journal-receipt-zoom224';document.body.append(zoom);zoom.addEventListener('close',()=>{if(!zoom.open)zoom.replaceChildren();});}
 zoom.innerHTML='<header><h2>Receipt</h2><button type="button" data-jr-close>Close enlargement</button></header><p class="jr-zoom-caption224"></p><div class="jr-zoom-scroll224"><img alt=""></div><footer><button type="button" data-jr-zoom>Zoom in</button></footer>';
 zoom.querySelector('p').textContent=caption;const copy=zoom.querySelector('img');copy.src=img.src;copy.alt=img.alt;copy.referrerPolicy='no-referrer';zoom.querySelector('[data-jr-close]').onclick=()=>zoom.close();
 zoom.querySelector('[data-jr-zoom]').onclick=e=>{const full=zoom.classList.toggle('jr-fullsize224');e.currentTarget.textContent=full?'Fit width':'Zoom in';};zoom.showModal();
}
async function view(id,ticket,retry=false){
 if(retry)views.delete(id);let result=views.get(id);if(!result||result.expires<=Date.now()){result=await client().api('view',{id});if(!active(ticket))return null;
  if(!Array.isArray(result.pages)||!result.pages.length)throw Error('No receipt pages are available.');
  result={...result,pages:result.pages.map(p=>({...p,url:privateURL(p.url)})),pdf:pdfURL(result.pdf),expires:Math.min(Number(result.expires)||Date.now(),Date.now()+180000)};
  views.set(id,result);while(views.size>24)views.delete(views.keys().next().value);
 }return result;
}
function picture(figure,doc,index,ticket){
 let working=false;
 async function load(retry=false){
  if(working||!active(ticket)||!figure.isConnected)return;working=true;const box=figure.querySelector('.jr-picture224');box.innerHTML=loading('Loading receipt…');
  try{const result=await view(doc.id,ticket,retry);if(!result||!active(ticket)||!figure.isConnected)return;const page=result.pages[index];if(!page)throw Error('This receipt changed. Close and reopen the entry.');
   const img=document.createElement('img');img.alt=page.label||doc.label;img.decoding='async';img.referrerPolicy='no-referrer';
   await new Promise((resolve,reject)=>{const done=fn=>{clearTimeout(timer);pendingImages.delete(cancel);img.onload=img.onerror=null;fn();},cancel=()=>done(()=>{img.removeAttribute('src');reject(Error('Receipt viewer closed.'));}),timer=setTimeout(()=>done(()=>reject(Error('The image is taking too long. Check your connection and retry.'))),30000);pendingImages.add(cancel);img.onload=()=>done(resolve);img.onerror=()=>done(()=>reject(Error('The image could not load. Check your connection and retry.')));img.src=page.url;});
   if(!active(ticket)||!figure.isConnected)return;const button=document.createElement('button');button.type='button';button.className='jr-enlarge224';button.setAttribute('aria-label','Enlarge '+(page.label||doc.label));button.append(img);button.onclick=()=>enlarge(img,figure.querySelector('figcaption').textContent);box.replaceChildren(button);box.style.aspectRatio='auto';
  }catch(e){if(active(ticket)&&figure.isConnected)retryBox(box,e.message,()=>load(true));}finally{working=false;}
 }
 observe(figure,()=>load());
}
async function section(node,doc,ticket,retry=false){
 if(!active(ticket)||!node.isConnected||node.dataset.loading)return;node.dataset.loading='true';const body=node.querySelector('.jr-section-body224');body.innerHTML=loading('Loading this receipt group…');
 try{const result=await view(doc.id,ticket,retry);if(!result||!active(ticket)||!node.isConnected)return;body.replaceChildren();
  result.pages.forEach((p,index)=>{const figure=document.createElement('figure');figure.className='jr-page224';figure.innerHTML='<div class="jr-picture224">'+loading('Receipt loads as you scroll')+'</div><figcaption><strong>'+esc(p.label||result.label)+'</strong><span>Receipt '+(index+1)+' of '+result.pages.length+' · PDF page '+esc(p.page)+'</span>'+(result.label!==entry?'<span>Source entry: '+esc(result.label)+'</span>':'')+'</figcaption>';body.append(figure);picture(figure,doc,index,ticket);});
  if(result.pdf){const a=document.createElement('a');a.href=result.pdf;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';a.className='jr-original224';a.textContent='Open full PDF';body.append(a);}
 }catch(e){if(active(ticket)&&node.isConnected)retryBox(body,e.message,()=>section(node,doc,ticket,true));}finally{delete node.dataset.loading;}
}
async function open(id){
 if(!enabled())return;const request=typeof id==='object'&&id?.staffLine?{staffLine:String(id.staffLine)}:{entry:String(id||'')};host();if(dialog.open)dialog.close();clear();const ticket=epoch;entry=request.staffLine?String(id.label||'Entry'):request.entry;const next=identity();if(context!==next)views.clear();context=next;
 dialog.innerHTML='<header><div><h2 id="jr-title224">Receipts · '+esc(entry)+'</h2><p>Scroll through this entry’s receipts. Select an image to enlarge it.</p></div><button type="button" data-jr-close>Close</button></header><div class="jr-scroll224">'+loading('Opening receipts…')+'</div>';
 dialog.querySelector('[data-jr-close]').onclick=()=>dialog.close();dialog.showModal();
 try{const s=await session();if(ticket!==epoch||!dialog.open||context!==identity())return;if(actor!==s.user.id){views.clear();actor=s.user.id;}if(!active(ticket))throw Error('Your account changed. Sign in again.');
  const result=await client().api('list',request);if(!active(ticket))return;scopeChanged226();remember226(id,result.resolved===false?null:(result.documents||[]).length>0);if(request.staffLine&&result.entry){entry=result.entry;dialog.querySelector('h2').textContent='Receipts · '+entry;}const body=dialog.querySelector('.jr-scroll224');body.replaceChildren();const documents=result.documents||[];
  if(!documents.length){const p=document.createElement('p');p.textContent='No receipts are linked to this entry yet.';body.append(p);}
  else{const count=documents.reduce((n,d)=>n+Number(d.pages||0),0);const summary=document.createElement('p');summary.className='jr-summary224';summary.textContent=count+' receipt page'+(count===1?'':'s')+' · '+documents.length+' group'+(documents.length===1?'':'s');body.append(summary);
   for(const doc of documents){const node=document.createElement('section');node.className='jr-section224';node.innerHTML='<h3>'+esc(doc.label||entry)+'</h3><p class="jr-document-title224">'+esc(doc.title)+' · '+esc(doc.pages)+' pages</p><div class="jr-section-body224">'+loading('Receipt group loads as you scroll')+'</div>';body.append(node);observe(node,()=>section(node,doc,ticket));}
  }
  if(window.access113?.can(request.staffLine?'sub-users-workspace':'journal','edit')){const a=document.createElement('a');a.className='jr-add224';a.href='scan.html?entry='+encodeURIComponent(entry);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Add supporting documents';dialog.querySelector('header>div').append(a);}
 }catch(e){if(ticket===epoch&&dialog.open)retryBox(dialog.querySelector('.jr-scroll224'),e.message,()=>open(id));}
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
  if(label.closest('.jr-id226,.journal-receipts224,.journal-receipt-zoom224'))continue;
  const row=label.closest('tr[data-entry-id]'),id=label.dataset.entry||row?.dataset.entryId;
  if(!id)continue;
  const target=row?.closest('#personalWorkspace1437')?{staffLine:id,label:label.textContent.trim()}:id;
  const wrap=document.createElement('span'),b=document.createElement('button');wrap.className='jr-id226';if(label.matches('.r79-link[data-entry]'))wrap.dataset.ledgerReceipt299='';b.className='jr-link226 no-print';b.type='button';b._receiptTarget226=target;b.dataset.receiptKey226=key226(target);
  b.onclick=e=>{e.preventDefault();e.stopPropagation();void open(target);};b.ondblclick=e=>e.stopPropagation();
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
   if(record.target.closest?.('.jr-id226,.journal-receipts224,.journal-receipt-zoom224'))continue;
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
 setInterval(()=>{if(scopeChanged226())schedule226();},1000);
 window.addEventListener('storage',e=>{if(e.key==='ojm-receipts-changed240')receiptChanged240(e.newValue);});
 window.addEventListener('receipt-links-changed240',e=>receiptChanged240(e.detail));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start226,{once:true});else start226();
setInterval(()=>{if(actor&&locked()){views.clear();actor='';if(dialog?.open)dialog.close();else clear();}},1000);
window.JournalReceipts224={enabled,open,button,refresh:refresh226};
})();
