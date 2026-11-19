/* The journal and the own-account phone workspace share one paged receipt dialog. */
(()=>{'use strict';
let current, cacheScope='';
const savedViews=new Map(),savedEntries=new Map(),savedImages=new Map(),deviceEntries=new Map();
let loginRun=null,cacheEpoch=0,imageBytes=0;
const maxBytes=4*1024*1024;
function rememberImage(key,blob){
 if(blob.size>maxBytes)return;
 imageBytes-=savedImages.get(key)?.size||0;savedImages.delete(key);savedImages.set(key,blob);imageBytes+=blob.size;
 while(imageBytes>maxBytes){const oldest=savedImages.keys().next().value;imageBytes-=savedImages.get(oldest).size;savedImages.delete(oldest);}
}
function rememberEntry(entry,result){
 if(!result.documents?.length || !result.firstPage)return;
 const until=result.local?Date.now()+180000:Math.min(result.firstPage.expires||0,Date.now()+180000);
 savedEntries.set(entry,{result,until});
 const first=result.documents.find(d=>d.pages>0);
 if(first)savedViews.set(first.id+':0',{until,promise:Promise.resolve(result.firstPage)});
 if(savedEntries.size>32)savedEntries.delete(savedEntries.keys().next().value);
 if(savedViews.size>32)savedViews.delete(savedViews.keys().next().value);
}
function clearViews(){cacheEpoch++;savedViews.clear();savedEntries.clear();deviceEntries.clear();savedImages.clear();imageBytes=0;cacheScope='';}
function syncScope(scope){
 if(cacheScope!==scope){clearViews();cacheScope=scope;}
}

async function session(){
 if(window.deviceVault14334&&!deviceVault14334.unlocked)throw Error('Sign in to open receipts.');
 if(window.PhoneWorkspace14242?.documentSession)return PhoneWorkspace14242.documentSession();
 if(typeof ojmDb==='undefined'||!ojmDb)throw Error('Sign in to Accounting.');
 const {data,error}=await ojmDb.auth.getSession();
 if(error||!data.session)throw Error('Sign in to Accounting.');
 return data.session;
}
function accessScope(){
 return JSON.stringify([window.OJM_SUPABASE_URL,typeof liveProfile==='undefined'?null:liveProfile?.id,
  window.deviceVault14334?.actor,window.deviceVault14334?.unlocked,window.workspaceRequest138?.target,
  window.PhoneWorkspace14242?.ready(),document.documentElement.dataset.device132,typeof liveProfile==='undefined'?null:liveProfile?.role,window.access113?.can('journal','view')]);
}
function previewURL(value){
 const url=new URL(value);
 if(url.origin!==new URL(window.OJM_SUPABASE_URL).origin||!url.pathname.startsWith('/storage/v1/object/sign/scan-documents208/'))
  throw Error('This receipt preview is unavailable.');
 return url.href;
}
function guard477(){const scope=accessScope();if(loginRun && loginRun.scope!==scope)loginRun=null;syncScope(scope);if(current&&current.scope!==scope)current.close();}

async function open(request,options={}){
 current?.close();
 const dialog=document.createElement('dialog');
 dialog.className='scan-viewer208'+(options.journal?' journal-receipts224':'');
 dialog.setAttribute('aria-labelledby','receipt-entry208');
 dialog.innerHTML=`
  <header class="rv-header"><div><small>Receipts</small><h2 id="receipt-entry208"></h2></div>
   <button type="button" class="rv-zoom" aria-pressed="false" disabled>Enlarge</button>
   <button type="button" class="rv-close" autofocus>Close</button></header>
  <div class="rv-stage"></div>
  <div class="rv-details"><div class="rv-description"><select aria-label="Receipt document" hidden></select><span class="rv-caption"></span></div>
   <button type="button" class="rv-pdf" hidden>Full PDF</button><a class="rv-add" hidden>Add documents</a></div>
  <footer class="rv-nav"><button type="button" class="rv-prev" disabled>Previous</button>
   <span class="rv-count" aria-live="polite" aria-atomic="true">Page —</span>
   <button type="button" class="rv-next" disabled>Next</button></footer>`;
 const part=selector=>dialog.querySelector(selector);
 const title=part('h2'),stage=part('.rv-stage'),caption=part('.rv-caption'),select=part('select'),
  zoom=part('.rv-zoom'),pdf=part('.rv-pdf'),add=part('.rv-add'),prev=part('.rv-prev'),next=part('.rv-next'),count=part('.rv-count');
 const scope=accessScope();syncScope(scope);
 let groups=[],total=0,position=0,revision=0,image,zoomed=false,pdfDialog,imageTimer,objectURL;
 const handle={scope,close};
 function close(){
  revision++;
  if(objectURL)URL.revokeObjectURL(objectURL);
  clearTimeout(imageTimer);
  resize.disconnect();
  pdfDialog?.close();
  if(dialog.open)dialog.close();
  dialog.remove();
  if(current===handle)current=null;
 }
 function active(){
  if(current!==handle||!dialog.open)return false;
  if(scope!==accessScope()){close();return false;}
  return true;
 }
 function message(text,role='status',retry){
  const box=document.createElement('div'),p=document.createElement('p');
  box.className='rv-message';p.setAttribute('role',role);p.textContent=text;box.append(p);
  if(retry){
   const button=document.createElement('button');button.type='button';button.textContent='Retry';
   button.onclick=retry;box.append(button);
  }
  stage.replaceChildren(box);
 }
 function sizeImage(){
  if(!image||!zoomed)return;
  const fit=Math.min(stage.clientWidth/image.naturalWidth,stage.clientHeight/image.naturalHeight);
  image.style.width=Math.ceil(Math.max(stage.clientWidth,2*fit*image.naturalWidth))+'px';
 }
 function setZoom(value){
  zoomed=value;
  stage.classList.toggle('rv-enlarged',value);
  zoom.textContent=value?'Fit page':'Enlarge';
  zoom.setAttribute('aria-pressed',String(value));
  if(value)sizeImage();else if(image)image.style.removeProperty('width');
  stage.scrollTo(0,0);
 }
 const resize=new ResizeObserver(sizeImage);
 resize.observe(stage);
 function fullPDF(urls,title){
  const opened=document.createElement('dialog');
  opened.className='rv-pdf-dialog';
  opened.setAttribute('aria-label','Full receipt PDF');
  const toolbar=document.createElement('div');
  toolbar.className='rv-pdf-toolbar';
  const original=document.createElement('a');
  original.href=urls.original;original.target='_blank';original.rel='noopener noreferrer';
  original.textContent='Open original PDF';
  const closePDF=document.createElement('button');
  closePDF.type='button';closePDF.autofocus=true;closePDF.textContent='Close PDF';
  closePDF.onclick=()=>opened.close();
  toolbar.append(original,closePDF);
  const frame=document.createElement('iframe');
  frame.title=title||'Receipt PDF';frame.referrerPolicy='no-referrer';frame.src=urls.preview;
  opened.append(toolbar,frame);
  opened.addEventListener('close',()=>{opened.remove();if(pdfDialog===opened)pdfDialog=null;},{once:true});
  pdfDialog=opened;document.body.append(opened);opened.showModal();
 }
 const api=ReceiptLinks208.create({url:window.OJM_SUPABASE_URL,key:window.OJM_SUPABASE_ANON_KEY,session});
 async function view(id,offset){
  const key=id+':'+offset;
  let cached=savedViews.get(key);
  if(!cached||cached.until<=Date.now()){
   cached={until:Infinity,promise:api.api('view',{id,pageIndex:offset})};savedViews.set(key,cached);
   if(savedViews.size>32)savedViews.delete(savedViews.keys().next().value);
   try{
    const result=await cached.promise;
    cached.until=Math.min(Number(result.expires)||0,Date.now()+180000);
   }catch(error){if(savedViews.get(key)===cached)savedViews.delete(key);throw error;}
  }
  return cached.promise;
 }
 async function show(index,refresh=false){
  if(!active()||index<0||index>=total)return;
  position=index;
  const stamp=++revision,valid=()=>active()&&revision===stamp;
  const group=groups.find(g=>index<g.start+g.pages);
  const offset=index-group.start;
  clearTimeout(imageTimer);
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL=null;}
  setZoom(false);image=null;zoom.disabled=true;
  prev.disabled=index===0;next.disabled=index===total-1;
  count.textContent='Page '+(index+1)+' of '+total;
  select.value=group.id;
  caption.textContent=select.hidden?group.title:'';
  pdf.hidden=true;pdf.onclick=null;
  message('Loading receipt…');
  const retry=()=>show(index,true);
  try{
   if(refresh)savedViews.delete(group.id+':'+offset);
   const doc=await view(group.id,offset);
   if(!valid())return;
   const page=doc.pages?.[doc.selectedPage===offset?0:offset];
   if(!page)throw Error('The linked pages have changed. Close and reopen this entry.');
   const label=page.label||doc.label||title.textContent;
   const detail=[select.hidden?group.title:'',label!==title.textContent?label:'',page.page?'PDF page '+page.page:''].filter(Boolean).join(' · ');
   caption.textContent=detail;caption.title=detail;
   if(doc.pdf || doc.storedPDF){
    pdf.hidden=false;pdf.onclick=async()=>{
     try{const href=doc.pdf || (await api.api('view',{id:group.id,pageIndex:offset})).pdf;
      if(valid())fullPDF(ReceiptLinks208.pdfURLs(href),doc.title);
     }catch(e){if(valid())message(e.message,'alert',retry);}
    };
   }
   const img=new Image();img.alt=label;img.decoding='async';img.referrerPolicy='no-referrer';
   const unavailable=()=>{
    if(!valid())return;
    clearTimeout(imageTimer);img.onload=img.onerror=null;
    message('This receipt image could not load. Check your connection and try again.','alert',retry);
   };
   img.onerror=unavailable;
   img.onload=()=>{
    if(!valid())return;
    clearTimeout(imageTimer);img.onload=img.onerror=null;
    image=img;zoom.disabled=false;
    const paper=document.createElement('div');paper.className='rv-paper';paper.append(img);
    img.onclick=()=>{if(active())setZoom(!zoomed);};stage.replaceChildren(paper);
   };
   const key=group.id+':'+offset,persistent=options.journal && request.entry && !request.staffLine && window.ReceiptPageCache;
   let blob=savedImages.get(key);
   if(!blob && persistent && !refresh)blob=await persistent.getImage(key).catch(()=>null);
   if(!valid())return;
   if(!blob && persistent){
    const remote=page.url?page:(await api.api('view',{id:group.id,pageIndex:offset})).pages[0];
    if(!valid())return;
    const response=await fetch(previewURL(remote.url),{referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('The receipt image could not load. Try again.');
    blob=await response.blob();if(!valid())return;
    rememberImage(key,blob);
    void persistent.putImage(key,blob).catch(()=>{});
   }
   if(!valid())return;
   imageTimer=setTimeout(unavailable,30000);img.src=blob?(objectURL=URL.createObjectURL(blob)):previewURL(page.url);
  }catch(error){if(valid())message(error.message,'alert',retry);}
 }
 function linkScanner(entry,empty){
  if(options.journal?!options.canAdd?.():!empty)return;
  add.href='scan.html'+(entry?'?entry='+encodeURIComponent(entry):'');
  add.hidden=false;
  if(options.journal){add.target='_blank';add.rel='noopener noreferrer';add.setAttribute('aria-label','Add supporting documents');}
  else add.textContent='Open receipt scanner';
 }
 async function list(){
  if(!active())return;
  message('Opening receipts…');
  try{
   const signed=await session();
   if(!active())return;
   if(!signed?.user?.id||window.deviceVault14334&&deviceVault14334.actor!==signed.user.id||
      typeof liveProfile!=='undefined'&&liveProfile?.id!==signed.user.id)throw Error('Your account changed. Sign in again.');
   let cached=options.journal && request.entry && savedEntries.get(request.entry);
   const stored=options.journal && deviceEntries.get(request.entry);
   if(!cached && stored?.until>Date.now()){
    const value=await window.ReceiptPageCache?.read('entry:'+request.entry+':'+stored.stamp).catch(()=>null);
    if(!active())return;
    if(value?.result)cached={result:value.result,until:stored.until};
   }
   const result=cached && cached.until>Date.now()?cached.result:await api.api('list',options.journal?{...request,includeFirst:true}:request);
   if(!active())return;
   if(options.journal && request.entry)rememberEntry(request.entry,result);
   options.onList?.(result);
   const entry=result.entry||options.label||request.entry||'';
   title.textContent=entry||'Supporting documents';title.title=title.textContent;
   total=0;
   // Keep the group and page order supplied by the existing links.
   groups=result.documents.filter(g=>Number.isSafeInteger(g.pages)&&g.pages>0).map(g=>{
    const start=total;total+=g.pages;return {...g,start};
   });
   linkScanner(entry,!groups.length);
   if(!groups.length){count.textContent='0 pages';message('No receipts are linked to this entry yet.');return;}
   if(groups.length>1){
    for(const g of groups){const option=document.createElement('option');option.value=g.id;option.textContent=g.title||g.label;select.append(option);}
    select.hidden=false;
   }
   await show(0);
  }catch(error){if(active())message(error.message,'alert',list);}
 }
 title.textContent=options.label||request.entry||'Supporting documents';
 prev.onclick=()=>show(position-1);next.onclick=()=>show(position+1);
 select.onchange=()=>show(groups[select.selectedIndex].start);
 zoom.onclick=()=>{if(active()&&image)setZoom(!zoomed);};
 part('.rv-close').onclick=close;
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&zoomed){event.preventDefault();event.stopPropagation();setZoom(false);}});
 dialog.addEventListener('cancel',event=>{if(zoomed){event.preventDefault();setZoom(false);}});
 dialog.addEventListener('close',()=>{if(current===handle)close();});
 ReceiptLinks208.dismissOnBackdrop(dialog);
 current=handle;document.body.append(dialog);dialog.showModal();
 await list();
}

// One finite preparation pass per administrator login. The app is already interactive.
function stopLogin(){loginRun=null;clearViews();}
async function startLogin(){
 if(document.documentElement.dataset.device132==='phone'||window.PhoneWorkspace14242||typeof liveProfile==='undefined'||liveProfile?.role!=='admin'||
    !window.access113?.can('journal','view')||!navigator.onLine||window.deviceVault14334?.unlocked===false)return;
 const scope=accessScope();syncScope(scope);
 if(loginRun?.scope===scope)return;
 const run=loginRun={scope},actor=liveProfile.id;
 const active=()=>loginRun===run && scope===accessScope() && navigator.onLine;
 const api=ReceiptLinks208.create({url:window.OJM_SUPABASE_URL,key:window.OJM_SUPABASE_ANON_KEY,session});
 const disk=window.ReceiptPageCache;
 async function warm(){
  const index=()=>ojmDb.rpc('receipt_login_index');
  const [{data,error},keys]=await Promise.all([window.offline14239?.freshReads?offline14239.freshReads(index):index(),disk?.entryKeys().catch(()=>new Set())]);
  if(error || !Array.isArray(data) || !active())return;
  const until=Date.now()+180000;
  deviceEntries.clear();
  const missing=[];
  for(const row of data){
   if(keys?.has(row.entry+':'+row.stamp))deviceEntries.set(row.entry,{stamp:row.stamp,until});
   else if(missing.length<8)missing.push(row);
  }
  for(const {entry,stamp} of missing){
   if(!active() || imageBytes>=maxBytes)break;
   if(savedEntries.has(entry))continue;
   const epoch=cacheEpoch;
   try{
    const result=await api.api('list',{entry,includeFirst:true});
    if(!active()||epoch!==cacheEpoch)return;
    rememberEntry(entry,result);
    const first=result.documents?.find(d=>d.pages>0),page=result.firstPage?.pages?.[0];
    if(!first||!page)continue;

    const key=first.id+':0';
    const recorded=savedImages.has(key) || await disk?.hasImage(key).catch(()=>false);
    if(!recorded){
     const res=await fetch(previewURL(page.url),{referrerPolicy:'no-referrer',priority:'low',signal:AbortSignal.timeout(20000)});
     if(!res.ok||!/^image\//i.test(res.headers.get('content-type')||''))continue;
     if(Number(res.headers.get('content-length'))>maxBytes-imageBytes){await res.body?.cancel();continue;}
     const blob=await res.blob();
     if(!active()||epoch!==cacheEpoch)return;
     if(blob.size>maxBytes-imageBytes)break;
     rememberImage(key,blob);
     await disk?.putImage(key,blob).catch(()=>{});
    }
    if(stamp && active() && epoch===cacheEpoch && disk && await disk.hasImage(key)){
     const doc=result.firstPage;
     const localResult={entry,documents:result.documents,resolved:result.resolved,local:true,
      firstPage:{title:doc.title,label:doc.label,selectedPage:0,
       pdf:doc.pdf?.startsWith('https://drive.google.com/file/d/')?doc.pdf:null,storedPDF:!!doc.pdf,
       pages:[{page:page.page,label:page.label}]}};
     await disk.save('entry:'+entry+':'+stamp,{stamp,key,result:localResult}).catch(()=>{});
    }
   }catch{/* A later click can retry this page. */}
  }
 }
 async function drive(action){
  const s=await session();
  if(s.user.id!==actor || !active())return;
  const res=await fetch(window.OJM_SUPABASE_URL+'/functions/v1/receipt-drive-preview',{method:'POST',headers:{
   Authorization:'Bearer '+s.access_token,apikey:window.OJM_SUPABASE_ANON_KEY,'Content-Type':'application/json'
  },body:JSON.stringify({action}),signal:AbortSignal.timeout(95000)});
  if(res.ok)return res.json();
 }
 async function discover(){
  if(!window.access113?.can('settings-accounting','edit'))return;
  let status=await drive('login'),updated=!!(status?.inspected||status?.checking||status?.linking);
  const deadline=Date.now()+90000;
  for(let delay=1000;active() && status && !status.state?.last_error && (status.checking||status.linking) && Date.now()<deadline;delay=Math.min(delay*2,8000)){
   await new Promise(resolve=>setTimeout(resolve,delay));if(!active())return;
   status=await drive('progress');
  }
  return updated;
 }
 const [,discovery]=await Promise.allSettled([warm(),discover()]);
 if(active() && discovery.status==='fulfilled' && discovery.value){savedEntries.clear();window.JournalReceipts224?.refresh();await warm();}
}
function requestFor(button){
 return button.dataset.scanLine208?{staffLine:button.dataset.scanLine208}:{entry:button.dataset.scanEntry208};
}
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-scan-entry208],[data-scan-line208]');
 if(!button)return;
 event.preventDefault();event.stopPropagation();void open(requestFor(button));
});
function button(value,staff=false){const b=document.createElement('button');b.type='button';b.className='scan-support-link208 no-print';b.dataset[staff?'scanLine208':'scanEntry208']=value;b.textContent='Documents';b.setAttribute('aria-label','Supporting documents for '+value);return b;}
function decorate(root=document){
 // Desktop/tablet uses the dedicated receipt icon and group viewer.
 if(document.documentElement.dataset.device132!=='phone'&&!window.PhoneWorkspace14242){root.querySelectorAll('.entry-id-stack .scan-support-link208,.r79-link[data-entry] + .scan-support-link208').forEach(b=>b.remove());return;}
 for(const row of root.querySelectorAll('tr[data-entry-id]')){const host=row.querySelector('.entry-id-stack');if(!host||host.querySelector('.scan-support-link208'))continue;const id=row.dataset.entryId;if(id)host.append(button(id,/^[0-9a-f-]{36}$/i.test(id)));}
 for(const link of root.querySelectorAll('.r79-link[data-entry]')){if(!link.parentElement.querySelector('.scan-support-link208'))link.after(button(link.dataset.entry));}
}
function start(){
 decorate();
 const observer=new MutationObserver(records=>{
  for(const record of records)for(const node of record.addedNodes){
   if(node.nodeType!==1 || node.closest('.scan-viewer208,.jr-id226'))continue;
   if(node.matches('tr[data-entry-id],.r79-link[data-entry]'))decorate(node.parentElement);
   else if(node.querySelector('tr[data-entry-id],.r79-link[data-entry]'))decorate(node);
  }
 });
 observer.observe(document.body,{childList:true,subtree:true});
 window.addEventListener('receipt-links-changed240',clearViews);
 window.addEventListener('storage',e=>{if(e.key==='ojm-receipts-changed240')clearViews();});
 for(const event of ['account-access477','page113','pageshow','focus','tabletviewport132'])window.addEventListener(event,guard477);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)guard477();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ScanViewer208={open,decorate,startLogin,stopLogin,refreshEntries:()=>{savedEntries.clear();deviceEntries.clear();}};
})();
