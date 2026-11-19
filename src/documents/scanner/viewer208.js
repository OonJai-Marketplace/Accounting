/* The journal and the own-account phone workspace share one paged receipt dialog. */
(()=>{'use strict';
let current;

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
  window.PhoneWorkspace14242?.ready(),document.documentElement.dataset.device132]);
}
function previewURL(value){
 const url=new URL(value);
 if(url.origin!==new URL(window.OJM_SUPABASE_URL).origin||!url.pathname.startsWith('/storage/v1/object/sign/scan-documents208/'))
  throw Error('This receipt preview is unavailable.');
 return url.href;
}
function guard477(){if(current&&current.scope!==accessScope())current.close();}

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
 const scope=accessScope(),views=new Map();
 let groups=[],total=0,position=0,revision=0,image,zoomed=false,pdfDialog,imageTimer;
 const handle={scope,close};
 function close(){
  revision++;
  clearTimeout(imageTimer);
  resize.disconnect();
  pdfDialog?.close();
  if(dialog.open)dialog.close();
  dialog.remove();
  views.clear();
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
 function fullPDF(details){
  pdfDialog=document.createElement('dialog');pdfDialog.className='rv-pdf-dialog';
  pdfDialog.setAttribute('aria-label','Full receipt PDF');
  const closePDF=document.createElement('button');closePDF.type='button';closePDF.textContent='Close PDF';
  closePDF.onclick=()=>pdfDialog.close();
  pdfDialog.append(closePDF,details);document.body.append(pdfDialog);
  const opened=pdfDialog;
  opened.addEventListener('close',()=>{opened.remove();if(pdfDialog===opened)pdfDialog=null;},{once:true});
  ReceiptLinks208.dismissOnBackdrop(opened);opened.showModal();details.open=true;
 }
 const api=ReceiptLinks208.create({url:window.OJM_SUPABASE_URL,key:window.OJM_SUPABASE_ANON_KEY,session});
 async function view(id){
  let cached=views.get(id);
  if(!cached||cached.until<=Date.now()){
   cached={until:Infinity,promise:api.api('view',{id})};views.set(id,cached);
   try{
    const result=await cached.promise;
    cached.until=Math.min(Number(result.expires)||0,Date.now()+180000);
   }catch(error){if(views.get(id)===cached)views.delete(id);throw error;}
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
  setZoom(false);image=null;zoom.disabled=true;
  prev.disabled=index===0;next.disabled=index===total-1;
  count.textContent='Page '+(index+1)+' of '+total;
  select.value=group.id;
  caption.textContent=select.hidden?group.title:'';
  pdf.hidden=true;pdf.onclick=null;
  message('Loading receipt…');
  const retry=()=>show(index,true);
  try{
   if(refresh)views.delete(group.id);
   const doc=await view(group.id);
   if(!valid())return;
   const page=doc.pages?.[offset];
   if(!page)throw Error('The linked pages have changed. Close and reopen this entry.');
   const label=page.label||doc.label||title.textContent;
   const detail=[select.hidden?group.title:'',label!==title.textContent?label:'',page.page?'PDF page '+page.page:''].filter(Boolean).join(' · ');
   caption.textContent=detail;caption.title=detail;
   if(doc.pdf){
    const details=ReceiptLinks208.pdfPreview(doc.pdf,doc.title);
    pdf.hidden=false;pdf.onclick=()=>{if(active())fullPDF(details);};
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
   const url=previewURL(page.url);
   imageTimer=setTimeout(unavailable,30000);img.src=url;
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
   const result=await api.api('list',request);
   if(!active())return;
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
 dialog.addEventListener('cancel',event=>{if(zoomed){event.preventDefault();setZoom(false);}});
 dialog.addEventListener('close',()=>{if(current===handle)close();});
 ReceiptLinks208.dismissOnBackdrop(dialog);
 current=handle;document.body.append(dialog);dialog.showModal();
 await list();
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
let timer;const observer=new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('.scan-viewer208')))return;clearTimeout(timer);timer=setTimeout(decorate,150);});
function start(){
 observer.observe(document.body,{childList:true,subtree:true});decorate();
 for(const event of ['account-access477','page113','pageshow','focus','tabletviewport132'])window.addEventListener(event,guard477);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)guard477();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.ScanViewer208={open,decorate};
})();
