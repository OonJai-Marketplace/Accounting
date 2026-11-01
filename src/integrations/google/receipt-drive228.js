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
// Receipt edits must not replace newer Sheets settings or the active upload connection.
function merge(latest,value,mode){
 const next={...latest,receiptDrive228:{...latest.receiptDrive228},archiveDrive230:{...latest.archiveDrive230}};
 if(mode==='details'){
  next.accountEmail228=value.accountEmail228;
  next.receiptDrive228.folderURL=value.receiptDrive228.folderURL;
  if(value.archiveDrive230&&Object.hasOwn(value.archiveDrive230,'folderURL'))next.archiveDrive230.folderURL=value.archiveDrive230.folderURL;
  next.archiveDrive230.layout='yearly';
  for(const key of ['receiptDrive228','archiveDrive230'])if(latest.accountEmail228!==next.accountEmail228||latest[key]?.folderURL!==next[key].folderURL)delete next[key].verified230;
 }else if(mode==='verify-folders'){
  for(const key of ['receiptDrive228','archiveDrive230']){
   const verified=value[key]?.verified230;
   if(!verified)continue;
   if(latest.accountEmail228!==verified.email||latest[key]?.folderURL!==verified.folderURL)throw Error('The saved account or folder changed. Save the current details and check access again.');
   next[key].verified230=verified;
  }
 }else if(mode==='activate'){
  const destination=value.receiptDrive228?.active;
  if(!destination||latest.accountEmail228!==destination.email||latest.receiptDrive228?.folderURL!==destination.folderURL)throw Error('The saved account or folder changed. Save your details and connect that account before activating.');
  const previous=latest.receiptDrive228?.active?.folderURL;
  next.links=(latest.links||[]).map(link=>link[0]==='Journal receipts'||previous&&link[1]===previous?[link[0],destination.folderURL,link[2]||'Company receipt PDFs.']:link);
  next.receiptDrive228.active=destination;
 }else throw Error('Unknown receipt settings operation.');
 return next;
}
function mount(host,options){
 const {canEdit,save,request,editing,finish,load}=options;let cfg=options.cfg,archiveStatus=null;
 const section=document.createElement('section');section.className='receipt-drive228 je-card';
 section.innerHTML='<h3 class="je-title">Receipt Google Drive</h3><p>Save the company account and both folder links now. Authorize the company account, check the folder links, then activate the receipt destination for phone scanners.</p><div class="settings-grid"><label>Company Google account email<input class="je-input" type="email" data-receipt-email228 placeholder="name@company.com" autocomplete="off"></label><label>Receipt folder link or ID<input class="je-input" data-receipt-folder228 placeholder="https://drive.google.com/drive/folders/…" autocomplete="off"></label></div><div class="je-actions-bar"><button class="je-btn" type="button" data-save228>Save details</button><button class="je-btn" type="button" data-connect228>Connect / change Google account</button><button class="je-btn" type="button" data-activate228>Check access &amp; activate for everyone</button><button class="je-btn" type="button" data-cancel228>Cancel edits</button></div><p data-active228></p><p data-result228 role="status"></p><p><a href="https://accounts.google.com/signup" target="_blank" rel="noopener noreferrer">Create a Google account</a></p><details><summary>Google setup and company authorization</summary><p>Changing the email or folder does not create a Google account or grant access. Sign in to the chosen account and approve Accounting, then check saved folder access. Activate receipt uploads separately.</p><p><a href="https://console.cloud.google.com/apis/library/drive.googleapis.com?project=128865919484" target="_blank" rel="noopener noreferrer">Google Drive API console</a> · <a href="https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=128865919484" target="_blank" rel="noopener noreferrer">Google Sheets API console</a> · <a href="https://console.cloud.google.com/auth/audience?project=128865919484" target="_blank" rel="noopener noreferrer">OAuth audience and test users</a> · <a href="https://admin.google.com/ac/owl" target="_blank" rel="noopener noreferrer">Google Workspace app access</a></p><p>The console links open the current Accounting project. Your Google account needs project access to change it. A different Cloud project also needs new server credentials; an email change alone does not replace those credentials.</p><p>Accounting currently requests Drive file management and Sheets access. It does not request Gmail access. A company administrator may need to approve these permissions. If the OAuth app is in Testing, Google authorization normally expires after seven days.</p><p>Receipt uploads use the activated receipts folder. The approved-data folder is saved for separate yearly workbooks; its export is not active yet. The current archive continues until a verified migration is ready. The AI journal and HR workspace has its own connection below.</p></details>';
 section.querySelector('h3').textContent='Company Google Drive — storage folders';
 section.querySelector('p').textContent='Save both folder links together. Receipts and approved accounting data have separate destinations. The AI workspace is configured separately below.';
 const grid=section.querySelector('.settings-grid'),receiptLabel=grid.querySelector('[data-receipt-folder228]').parentElement;
 receiptLabel.firstChild.textContent='Receipts and supporting documents — folder link or ID';
 const receiptHelp=document.createElement('small');receiptHelp.textContent='Phone scans and supporting PDFs are uploaded to the activated receipt folder.';receiptLabel.append(receiptHelp);
 const archiveLabel=document.createElement('label');archiveLabel.textContent='Approved accounting data — archive folder link or ID';
 const archiveInput=document.createElement('input');archiveInput.className='je-input';archiveInput.dataset.archiveFolder230='';archiveInput.placeholder='https://drive.google.com/drive/folders/…';archiveLabel.append(archiveInput);
 const archiveHelp=document.createElement('small');archiveHelp.textContent='Save the parent folder for separate yearly accounting workbooks, including approved records, reports and summaries. Saving this link does not switch the current export.';archiveLabel.append(archiveHelp);grid.append(archiveLabel);
 section.querySelector('[data-save228]').textContent='Save both destinations';section.querySelector('[data-connect228]').textContent='Connect company Google account';section.querySelector('[data-activate228]').textContent='Activate receipt folder for everyone';
 const checkFolders=document.createElement('button');checkFolders.type='button';checkFolders.className='je-btn';checkFolders.textContent='Check saved folder access';checkFolders.dataset.checkFolders230='';section.querySelector('[data-activate228]').before(checkFolders);
 const archiveState=document.createElement('p');archiveState.dataset.archiveState230='';archiveState.setAttribute('role','status');section.querySelector('[data-active228]').after(archiveState);
 const existingArchive=document.createElement('a');existingArchive.textContent='Open current archive workbook';existingArchive.target='_blank';existingArchive.rel='noopener noreferrer';existingArchive.hidden=true;archiveState.after(existingArchive);
 host.prepend(section);
 const $=selector=>section.querySelector(selector),email=$('[data-receipt-email228]'),folder=$('[data-receipt-folder228]'),result=$('[data-result228]'),active=$('[data-active228]');
 email.value=cfg.accountEmail228||'';folder.value=cfg.receiptDrive228?.folderURL||'';
 archiveInput.value=cfg.archiveDrive230?.folderURL||'';
 result.setAttribute('aria-live','polite');result.tabIndex=-1;
 const authorize=document.createElement('a');authorize.className='je-btn je-btn-secondary';authorize.textContent='Open Google authorization';authorize.target='_blank';authorize.rel='noopener noreferrer';authorize.hidden=true;result.after(authorize);
 let dirty=false,busy=false,popup=null,generation=0,lastError='';
 const current=()=>section.isConnected&&canEdit();
 function status(text,error=false){result.textContent=text;result.style.color=error?'#9b2727':'';result.style.fontWeight='600';lastError=error?text:'';}
 function showActive(){const destination=cfg.receiptDrive228?.active;active.textContent=destination?'Active receipt uploads: '+destination.email+' · '+destination.name:'Receipt uploads use existing device destinations until a company folder is activated.';const verified=cfg.archiveDrive230?.verified230;archiveState.textContent=(cfg.archiveDrive230?.folderURL?'Approved-data folder saved'+(verified?' · Access checked for '+verified.email:' · Access not checked')+'. Yearly exports are not active in this folder yet. ':'Approved-data archive folder has not been saved. ')+(archiveStatus?.email?'Current exports still use '+archiveStatus.email+' and the existing archive workbook.':archiveStatus?'The current archive connection is unavailable; check Backup & Recovery.':'Checking the current archive destination…');if(archiveStatus?.sheet&&/^[\w-]{20,160}$/.test(archiveStatus.sheet)){existingArchive.href='https://docs.google.com/spreadsheets/d/'+archiveStatus.sheet+'/edit';existingArchive.hidden=false;}}
 function showNext(){const destination=cfg.receiptDrive228?.active;status(destination&&destination.folderURL===folder.value&&destination.email===email.value?'Receipt folder active. The approved-data archive has its own status above.':folder.value||archiveInput.value?'Destinations saved. Next: Connect company Google account, then check folder access.':'Enter the company email and folder links, then click Save both destinations.');}
 showActive();showNext();
 const lock=()=>{for(const n of section.querySelectorAll('input,button'))n.disabled=busy||!canEdit();};lock();
 for(const input of [email,folder,archiveInput])input.oninput=()=>{dirty=true;editing(true);authorize.hidden=true;status('Unsaved details. Click Save both destinations.');};
 async function run(label,task){if(busy||!current())return;generation++;busy=true;lock();section.setAttribute('aria-busy','true');status(label);try{await task();}catch(e){if(current()){status(e.message||'The action could not finish.',true);result.focus({preventScroll:true});}}finally{busy=false;section.removeAttribute('aria-busy');if(section.isConnected)lock();}}
 function saved(){if(dirty)throw Error(lastError||'Your changes are not saved yet. Click Save both destinations before continuing.');}
 $('[data-save228]').onclick=()=>run('Saving both company Drive destinations…',async()=>{const value=details(folder.value,email.value),archive=details(archiveInput.value,email.value);cfg=await save({...cfg,accountEmail228:value.email,receiptDrive228:{...cfg.receiptDrive228,folderURL:value.folderURL},archiveDrive230:{...cfg.archiveDrive230,folderURL:archive.folderURL,layout:'yearly'}},'details');if(!current())return;email.value=value.email;folder.value=value.folderURL;archiveInput.value=archive.folderURL;dirty=false;editing(false);showActive();status('Both destination details saved. Next: Connect company Google account, then check saved folder access. Receipt uploads and approved-data exports keep their current active destinations until separately activated.');});
 checkFolders.onclick=()=>{try{saved();}catch(e){status(e.message,true);return;}void run('Checking access to the saved receipt and approved-data folders…',async()=>{const checked=await request('verify-folders230');if(!current())return;cfg=await save({...cfg,receiptDrive228:{...cfg.receiptDrive228,verified230:checked.receipts},archiveDrive230:{...cfg.archiveDrive230,verified230:checked.archive}},'verify-folders');if(current()){showActive();status('Saved folder access checked. You can activate the receipt folder now. The approved-data folder is saved for the yearly archive setup; this check does not move existing records.');}});};
 $('[data-cancel228]').onclick=()=>{dirty=false;editing(false);finish();};
 $('[data-activate228]').onclick=()=>{try{saved();}catch(e){status(e.message,true);return;}void run('Checking Google access and activating the receipt folder…',async()=>{const verified=await request('verify-destination228');if(!current())return;cfg=await save({...cfg,receiptDrive228:{...cfg.receiptDrive228,active:verified.destination}},'activate');if(current()){showActive();status('Folder access verified. '+verified.destination.email+' is now active for every phone scanner. Save one receipt and open it from its journal entry to test the complete upload.');}});};
 $('[data-connect228]').onclick=()=>{if(busy||!current())return;try{saved();}catch(e){status(e.message,true);return;}popup=window.open('about:blank','oonjai-drive-authorization228','width=540,height=720');void run('Opening Google authorization…',async()=>{try{const r=await request('connect',{desktop228:true}),url=new URL(r.authorization_url);if(url.origin!=='https://accounts.google.com')throw Error('Unexpected Google authorization destination.');if(!current()){popup?.close();return;}authorize.href=url.href;authorize.hidden=false;if(popup&&!popup.closed){popup.location.replace(url.href);status('Complete Google authorization in the opened window. If it did not appear, click Open Google authorization below.');}else status('The Google window did not open. Click Open Google authorization below to continue.',true);}catch(e){popup?.close();throw e;}});};
 const receive=event=>{if(!section.isConnected){window.removeEventListener('message',receive);return;}if(event.origin!==new URL(window.OJM_SUPABASE_URL).origin||event.source!==popup||event.data?.type!=='receipt-drive228')return;if(current()){authorize.hidden=true;status(event.data.ok?'Google authorization completed. Next: Check saved folder access, then Activate receipt folder for everyone.':'Google authorization was not completed. Your saved details and current destination are kept.',!event.data.ok);}};
 window.addEventListener('message',receive);
 // AI inbox recovery can contain an old settings snapshot. Always display a fresh destination.
 if(load){const started=generation;active.textContent='Checking the saved upload destination…';void load().then(latest=>{if(!current()||generation!==started)return;cfg=latest;if(!dirty){email.value=cfg.accountEmail228||'';folder.value=cfg.receiptDrive228?.folderURL||'';archiveInput.value=cfg.archiveDrive230?.folderURL||'';showNext();}showActive();}).catch(e=>{if(current()&&generation===started){active.textContent='The active upload destination could not be checked.';status(e.message||'Could not load saved company Drive settings. Reopen Settings to retry.',true);}});}
 if(request)void request('storage-status230').then(value=>{if(current()){archiveStatus=value.archive;showActive();}}).catch(()=>{if(current())archiveState.textContent='The approved-data folder is a saved destination, not an active yearly export. Current archive status could not be checked; use Backup & Recovery to check it.';});
}
window.ReceiptDriveSettings228={details,merge,mount};
})();
