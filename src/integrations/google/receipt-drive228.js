/* Desktop administration of the saved company Drive destination. */
(()=>{'use strict';
function details(folder,email){
 email=String(email||'').trim().toLowerCase();folder=String(folder||'').trim();
 if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid Google account email.');
 if(!folder)return {folderURL:'',email};
 let id=folder;if(folder.includes('://')){let u;try{u=new URL(folder);}catch{throw Error('Enter a Google Drive folder link.');}const match=/^\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)\/?$/.exec(u.pathname);if(u.protocol!=='https:'||u.hostname!=='drive.google.com'||u.username||u.password||u.port||!match)throw Error('Use a Google Drive folder link, not a file or spreadsheet link.');id=match[1];}
 if(!/^[\w-]{10,160}$/.test(id))throw Error('Enter a Google Drive folder link or folder ID.');
 return {folderURL:'https://drive.google.com/drive/folders/'+id,email};
}
function merge(latest,value,mode){
 const next={...latest,receiptDrive228:{...latest.receiptDrive228}};
 if(mode==='details'){
  next.accountEmail228=value.accountEmail228;
  next.receiptDrive228.folderURL=value.receiptDrive228.folderURL;
  if(latest.accountEmail228!==value.accountEmail228||latest.receiptDrive228?.folderURL!==value.receiptDrive228.folderURL)delete next.receiptDrive228.verified230;
 }else if(mode==='activate'){
  if(latest.receiptDrive228?.active?.annual231)throw Error('Automatic yearly storage is active. Use its company storage controls.');
  const destination=value.receiptDrive228?.active;
  if(!destination||latest.accountEmail228!==destination.email||latest.receiptDrive228?.folderURL!==destination.folderURL)throw Error('The saved account or folder changed. Save your details and connect that account before activating.');
  const previous=latest.receiptDrive228?.active?.folderURL;
  next.links=(latest.links||[]).map(link=>link[0]==='Journal receipts'||previous&&link[1]===previous?[link[0],destination.folderURL,link[2]||'Company receipt PDFs.']:link);
  next.receiptDrive228.active=destination;
 }else throw Error('Unknown receipt settings operation.');
 return next;
}
function mount(host,options){
 const {canEdit,request,editing,finish,load}=options;let cfg=options.cfg;
 const section=document.createElement('section');section.className='receipt-drive228 je-card';
 section.innerHTML='<h3 class="je-title">Receipts and documentation</h3><p data-active228></p><div class="je-actions-bar"><button class="je-btn" data-check-receipt>Check connection</button><button class="je-btn" data-change-receipt>Change account or folder</button></div><div class="settings-grid"><label>Google account for folder setup<input class="je-input" type="email" data-receipt-email228 autocomplete="off"></label><label>Receipt folder link or ID<input class="je-input" data-receipt-folder228></label></div><div class="je-actions-bar"><button class="je-btn" data-save228>Save details</button><button class="je-btn" data-connect228>Connect Google account</button><button class="je-btn" data-activate228>Verify and activate folder</button><button class="je-btn" data-cancel228>Cancel edits</button></div><p data-result228 role="status"></p>';
 host.prepend(section);
 const $=selector=>section.querySelector(selector),email=$('[data-receipt-email228]'),folder=$('[data-receipt-folder228]'),result=$('[data-result228]'),active=$('[data-active228]');
 email.value=cfg.accountEmail228||'';folder.value=cfg.receiptDrive228?.folderURL||'';
 result.setAttribute('aria-live','polite');result.tabIndex=-1;
 const authorize=document.createElement('a');authorize.className='je-btn je-btn-secondary';authorize.textContent='Open Google authorization';authorize.target='_blank';authorize.rel='noopener noreferrer';authorize.hidden=true;result.after(authorize);
 let dirty=false,busy=false,popup=null,generation=0,lastError='',changing=false,needsReconnect=false;
 const expected=()=>({email:cfg.accountEmail228||'',folder:cfg.receiptDrive228?.folderURL||'',key:cfg.receiptDrive228?.active?.connectionKey||''});
 function controls(){
  const protectedFolder=!!cfg.receiptDrive228?.active,editable=!protectedFolder||changing;
  email.readOnly=folder.readOnly=!editable;
  $('[data-change-receipt]').hidden=!protectedFolder||changing;
  $('[data-check-receipt]').hidden=!protectedFolder||changing;
  $('[data-save228]').hidden=$('[data-activate228]').hidden=$('[data-cancel228]').hidden=!editable;
  $('[data-connect228]').hidden=!editable&&!needsReconnect;
 }
 const current=()=>section.isConnected&&canEdit();
 function status(text,error=false){result.textContent=text;result.style.color=error?'#9b2727':'';result.style.fontWeight='600';lastError=error?text:'';}
 function showActive(){
  const dest=cfg.receiptDrive228?.active;
  controls();active.textContent=dest?'Protected receipt destination: '+dest.email+' · '+dest.name:'Choose a company folder for receipt uploads.';
  if(dest&&/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]+$/.test(dest.folderURL)){
   const link=document.createElement('a');link.href=dest.folderURL;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open folder';active.append(' · ',link);
  }
 }
 function showNext(){status('');}
 $('[data-change-receipt]').onclick=()=>{changing=true;editing(true);generation++;controls();email.focus();};
 $('[data-check-receipt]').onclick=()=>run('Checking access to the protected receipt folder…',async()=>{
  try{const r=await request('check-receipt-access');if(current()){needsReconnect=false;controls();status(r.email+' can save scans to '+r.name+'.');}}
  catch(e){if(current()){needsReconnect=/reconnect|administrator attention|connect google/i.test(e.message);controls();}throw e;}
 });
 showActive();showNext();
 const lock=()=>{for(const n of section.querySelectorAll('input,button'))n.disabled=busy||!canEdit();};lock();
 for(const input of [email,folder])input.oninput=()=>{dirty=true;editing(true);authorize.hidden=true;status('Unsaved details. Click Save details.');};
 async function run(label,task){if(busy||!current())return;generation++;busy=true;lock();section.setAttribute('aria-busy','true');status(label);try{await task();}catch(e){if(current()){status(e.message||'The action could not finish.',true);result.focus({preventScroll:true});}}finally{busy=false;section.removeAttribute('aria-busy');if(section.isConnected)lock();}}
 function saved(){if(dirty)throw Error(lastError||'Your changes are not saved yet. Click Save details before continuing.');}
 $('[data-save228]').onclick=()=>run('Saving receipt folder…',async()=>{
  const value=details(folder.value,email.value);
  cfg=(await request('save-receipt-details',{expected:expected(),email:value.email,folderURL:value.folderURL})).settings;
  if(!current())return;
  email.value=value.email;folder.value=value.folderURL;dirty=false;editing(changing);showActive();status('Details saved. Verify and activate the folder to change where phones upload.');
 });
 $('[data-cancel228]').onclick=()=>{dirty=false;editing(false);finish();};
 $('[data-activate228]').onclick=()=>{try{saved();}catch(e){status(e.message,true);return;}void run('Checking Google access and activating the receipt folder…',async()=>{const previous=cfg.receiptDrive228?.active;
 if(previous&&(previous.email!==cfg.accountEmail228||previous.folderURL!==cfg.receiptDrive228.folderURL)&&!window.confirm('Change the receipt destination for every phone?\n\nCurrent: '+previous.email+' · '+previous.folderURL+'\nNew: '+cfg.accountEmail228+' · '+cfg.receiptDrive228.folderURL)){status('The protected destination is still active.');return;}
 const verified=await request('verify-destination228',{activate:true,expected:expected()});if(!current())return;cfg=verified.settings;changing=false;needsReconnect=false;editing(false);if(current()){showActive();status('Folder access verified. '+verified.destination.email+' is now active for every phone scanner. Save one receipt and open it from its journal entry to test the complete upload.');}});};
 $('[data-connect228]').onclick=()=>{if(busy||!current())return;try{saved();}catch(e){status(e.message,true);return;}popup=window.open('about:blank','oonjai-drive-authorization228','width=540,height=720');void run('Opening Google authorization…',async()=>{try{const r=await request('connect',{desktop228:true,returnToApp:true}),url=new URL(r.authorization_url);if(url.origin!=='https://accounts.google.com')throw Error('Unexpected Google authorization destination.');if(!current()){popup?.close();return;}authorize.href=url.href;authorize.hidden=false;if(popup&&!popup.closed){popup.location.replace(url.href);status('Complete Google authorization in the opened window. If it did not appear, click Open Google authorization below.');}else status('The Google window did not open. Click Open Google authorization below to continue.',true);}catch(e){popup?.close();throw e;}});};
 const receive=event=>{if(!section.isConnected){window.removeEventListener('message',receive);return;}if(event.origin!==location.origin||!popup||event.source!==popup||event.data?.type!=='receipt-drive228')return;if(current()){authorize.hidden=true;const code=event.data.result;if(code==='active'){needsReconnect=false;controls();}const message=code==='active'?'The protected company folder is connected for every phone.':code==='authorized'?'Google access is saved. Verify and activate the receipt folder.':code==='wrong-account'?'Choose the Google account saved in Accounting Settings.':code==='folder-check'?'Google access is saved. Check permission to add files to the receipt folder.':code==='cancelled'?'Google authorization cancelled.':'Google authorization could not finish. Try again.';status(message,!event.data.ok);if(event.data.ok)popup.close();}};
 window.addEventListener('message',receive);
 // Another device may have changed the receipt settings. Always display a fresh destination.
 if(load){const started=generation;active.textContent='Checking the saved upload destination…';void load().then(latest=>{if(!current()||generation!==started)return;cfg=latest;if(!dirty&&!changing){email.value=cfg.accountEmail228||'';folder.value=cfg.receiptDrive228?.folderURL||'';showNext();}showActive();}).catch(e=>{if(current()&&generation===started){active.textContent='The active upload destination could not be checked.';status(e.message||'Could not load saved company Drive settings. Reopen Settings to retry.',true);}});}
}
window.ReceiptDriveSettings228={details,merge,mount};
})();
