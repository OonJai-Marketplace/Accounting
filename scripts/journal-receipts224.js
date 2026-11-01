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
 if(!enabled())return;host();if(dialog.open)dialog.close();clear();const ticket=epoch;entry=String(id||'');const next=identity();if(context!==next)views.clear();context=next;
 dialog.innerHTML='<header><div><h2 id="jr-title224">Receipts · '+esc(entry)+'</h2><p>Scroll through this entry’s receipts. Select an image to enlarge it.</p></div><button type="button" data-jr-close>Close</button></header><div class="jr-scroll224">'+loading('Opening receipts…')+'</div>';
 dialog.querySelector('[data-jr-close]').onclick=()=>dialog.close();dialog.showModal();
 try{const s=await session();if(ticket!==epoch||!dialog.open||context!==identity())return;if(actor!==s.user.id){views.clear();actor=s.user.id;}if(!active(ticket))throw Error('Your account changed. Sign in again.');
  const result=await client().api('list',{entry});if(!active(ticket))return;const body=dialog.querySelector('.jr-scroll224');body.replaceChildren();const documents=result.documents||[];
  if(!documents.length){const p=document.createElement('p');p.textContent='No receipts are linked to this entry yet.';body.append(p);}
  else{const count=documents.reduce((n,d)=>n+Number(d.pages||0),0);const summary=document.createElement('p');summary.className='jr-summary224';summary.textContent=count+' receipt page'+(count===1?'':'s')+' · '+documents.length+' group'+(documents.length===1?'':'s');body.append(summary);
   for(const doc of documents){const node=document.createElement('section');node.className='jr-section224';node.innerHTML='<h3>'+esc(doc.label||entry)+'</h3><p class="jr-document-title224">'+esc(doc.title)+' · '+esc(doc.pages)+' pages</p><div class="jr-section-body224">'+loading('Receipt group loads as you scroll')+'</div>';body.append(node);observe(node,()=>section(node,doc,ticket));}
  }
  if(window.access113?.can('journal','edit')){const a=document.createElement('a');a.className='jr-add224';a.href='scan.html?entry='+encodeURIComponent(entry);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Add supporting documents';dialog.querySelector('header>div').append(a);}
 }catch(e){if(ticket===epoch&&dialog.open)retryBox(dialog.querySelector('.jr-scroll224'),e.message,()=>open(id));}
}
function button(id){const b=document.createElement('button');b.type='button';b.className='je-btn je-btn-secondary';b.textContent='Receipts';b.dataset.journalReceipts224=id;b.onclick=()=>void open(id);return b;}
setInterval(()=>{if(actor&&locked()){views.clear();actor='';if(dialog?.open)dialog.close();else clear();}},1000);
window.JournalReceipts224={enabled,open,button};
})();
