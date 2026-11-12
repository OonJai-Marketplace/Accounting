/* Phone-first scanner. Scans stay in encrypted device drafts; optional private previews link saved PDFs to Accounting. */
(async()=>{'use strict';
const C=ReceiptCore202,$=id=>document.getElementById(id),main=$('scanMain'),primaryDialog=$('scanDialog'),destinationDialog=$('destinationDialog204'),scope=window.OJM_SUPABASE_URL,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const requestedEntry208=new URL(location.href).searchParams.get('entry')||'';
const quickCapture209=new URL(location.href).searchParams.get('capture')!=='0';
let captureLoop209=false,retakeTarget211=null,viewingPage211=null,capturedSource212=null;
let movingSaved=false,dialog=primaryDialog,draftIndex=[];
let db,owner='',draft=null,database,busy=false,driveState={connected:false},pdfCache=null,pdfURL='',cameraQueue=[],editing=null,saveChain=Promise.resolve(),settings={folder:{id:'root',name:'My Drive'}},folders={parent:null,items:[],next:null},frozen=false;
const status=(s='',error=false)=>{$('scanStatus').textContent=s;$('scanStatus').classList.toggle('error',error);},btn=(name,text,cls='')=>`<button type="button" data-scan="${name}" class="scan-action ${cls}">${text}</button>`;
const paths211={close:'M6 6l12 12M18 6L6 18',back:'M15 5l-7 7 7 7',camera:'M3 7h4l2-3h6l2 3h4v14H3z M16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0',settings:'M4 6h16M4 12h16M4 18h16 M8 3v6M16 9v6M9 15v6',crop:'M7 3v14h14M3 7h14v14',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',retake:'M3 7h4l2-3h6l2 3h4v14H3z M15 13a3.5 3.5 0 1 0 0 4M15 10v3h-3',receipt:'M6 3h9l4 4v14H6zM14 3v5h5M2 9v12M9 13h7M12.5 9.5v7',entry:'M3 5h7l2 3h9v13H3zM8 14h8M12 10v8',check:'M4 12l5 5L20 6',gallery:'M3 3h18v18H3zM3 17l6-7 4 5 3-3 5 6M16 7h.01',rotate:'M5 9a8 8 0 1 1 0 7M5 3v6h6',auto:'M3 8V3h5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 12h8M12 8v8',full:'M3 3h18v18H3z',more:'M5 12h.01M12 12h.01M19 12h.01',folder:'M3 5h7l2 3h9v13H3z',save:'M5 3h14v18H5zM8 3v6h8V3M8 21v-8h8v8',color:'M12 3a9 9 0 1 0 0 18V3z',edit:'M4 16l12-12 4 4L8 20H4z',archive:'M3 4h18v4H3zM5 8v13h14V8M9 12h6'};
function icon211(action,label,icon,extra='',cls=''){if(nativeUI215())return `<button type="button" data-scan="${action}" class="scan-action ${cls}" ${extra}>${esc(label)}</button>`;return `<button type="button" data-scan="${action}" class="scan-icon211 ${cls}" aria-label="${esc(label)}" title="${esc(label)}" ${extra}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths211[icon]||paths211.more}"/></svg></button>`;}
function entryLabel211(){return draft?.groups.find(g=>g.id===(editing?.group||draft.active))?.label||'Receipts';}
function workflow211(title,content,footer,tools=''){
 dialog=primaryDialog;ReceiptCamera209.stop();primaryDialog.classList.add('scan-workflow211');
 primaryDialog.innerHTML=`<header class="scan-flow-head211">${icon211('close','Finish later','close')}<div><strong>${esc(title)}</strong><small>${esc(entryLabel211())}</small></div>${icon211('scanner-options211','Scanner settings','settings')}</header><div class="scan-flow-stage211">${content}</div>${tools?'<div class="scan-edit-tools211">'+tools+'</div>':''}<footer class="scan-flow-footer211">${footer}</footer><p class="scan-error" role="alert"></p>`;
 if(!primaryDialog.open)primaryDialog.showModal();
}
async function ensureDraft211(){if(draft)return;const month=C.monthNow();draft=C.create(month,requestedEntry208||'Receipts',requestedEntry208?'journal':'support');draft.pending=[];draft.folder=settings.folder||{id:'root',name:'My Drive'};await persist();render();}
async function scannerOptions211(){await ensureDraft211();await checkpointEditing();dialog=destinationDialog;open('Scanner settings',`<div class="scan-setting-list211">${btn('save-destination','Save destination')}${btn('batch','PDF title and month')}${draft?btn('entry-settings211','Entry IDs / current group'):''}${btn('drafts','Unsaved scans')}${btn('import','Import photos')}${btn('native-camera209','Use phone camera')}</div>`);}
function nextControls211(){return icon211('keep-next-receipt211','Keep and scan next receipt','receipt')+icon211('keep-next-entry211','Keep and start next entry','entry')+icon211('keep-save211','Keep and save PDF','check','','primary');}
function valid(){if(!owner||!deviceVault14334.unlocked||deviceVault14334.actor!==owner)throw Error('Sign in to Accounting again to unlock your scans.');}
function lockUI(){ReceiptCamera209.stop();if(frozen)return;frozen=true;document.querySelectorAll('.scan-receipt-choice218,.scan-compare-zoom222').forEach(d=>d.close());idCache221=[];idRequests221.clear();++idsRequest215;draft=null;pdfCache=null;cameraQueue=[];editing=null;if(pdfURL)URL.revokeObjectURL(pdfURL);for(const d of [primaryDialog,destinationDialog]){d.close();d.replaceChildren();}dialog=primaryDialog;draftIndex=[];main.innerHTML='<section class="scan-card"><h1>Sign in to continue</h1><p>Your encrypted scans remain on this device.</p><a class="scan-link" href="index.html?scan=1">Open Accounting sign-in</a></section>';}
async function store(key,value){valid();database ||= new Promise((resolve,reject)=>{const r=indexedDB.open('ojm-scans202',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close another old scanner tab and try again.'));});const conn=await database,label=scope+':'+owner+':'+key,encoded=value===undefined?null:deviceVault14334.pack(value,label);return new Promise((resolve,reject)=>{const t=conn.transaction('drafts',value===undefined?'readonly':'readwrite'),s=t.objectStore('drafts'),r=value===undefined?s.get(label):s.put(encoded,label);let out;r.onsuccess=()=>{try{valid();out=value===undefined?deviceVault14334.unpack(r.result,label):value;}catch(e){reject(e);}};t.oncomplete=()=>resolve(out);t.onerror=t.onabort=()=>reject(t.error||Error('Device storage could not save this scan.'));});}
async function remove(key){const conn=await database;valid();return new Promise((resolve,reject)=>{const t=conn.transaction('drafts','readwrite');t.objectStore('drafts').delete(scope+':'+owner+':'+key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
async function writeRecords(entries,deletes=[]){valid();await store('__ready204');const conn=await database,prefix=scope+':'+owner+':',encoded=await Promise.all(entries.map(async([key,value])=>[prefix+key,await (deviceVault14334.packAsync?deviceVault14334.packAsync(value,prefix+key):deviceVault14334.pack(value,prefix+key))]));valid();return new Promise((resolve,reject)=>{const t=conn.transaction('drafts','readwrite'),objects=t.objectStore('drafts');try{for(const [key,value] of encoded)objects.put(value,key);for(const key of deletes)objects.delete(prefix+key);}catch(e){t.abort();reject(e);return;}t.oncomplete=()=>{try{valid();resolve();}catch(e){reject(e);}};t.onerror=t.onabort=()=>reject(t.error||Error('Device storage could not protect this scan. Keep this window open and retry.'));});}
function draftSummary(d){return {id:d.id,title:d.title,family:d.entryFile?.family,entryLabel:d.entryFile?.label,pages:d.pages.length,pending:(d.pending||[]).length,backed:!(d.pending||[]).length&&(d.saved?.revision===d.revision||d.localExport?.verified&&d.localExport.revision===d.revision),linked:d.links208?.revision===d.revision&&d.links208.status==='linked'};}
function persist(change=true,extra=[],deletes=[]){valid();if(change){draft.revision++;pdfCache=null;if(draft.upload)draft.upload=null;}const value=structuredClone(draft);saveChain=saveChain.catch(()=>{}).then(async()=>{const next=[draftSummary(value),...draftIndex.filter(d=>d.id!==value.id)];await writeRecords([['current',value],['draft:'+value.id,value],['draft-list',next],...extra],deletes);draftIndex=next;});return saveChain;}
function draftsPanel(){const pending=draft?.pending?.length||0;return `<section class="scan-card" id="unsavedScans204"><h2>Unsaved scans</h2><p>${draft?draft.pages.length+' reviewed pages · '+pending+' photos awaiting review':draftIndex.length+' retained batches'}. Drafts are protected on this device after saving completes.</p><div class="scan-actions">${pending?btn('resume-pending','Resume review','primary'):''}${btn('drafts','Open unsaved scans')}${cameraQueue.length?btn('protect-imports','Retry protecting photos'):''}</div><small>Keep browser data to retain drafts. Export a PDF for a separate copy.</small></section>`;}
const deleteDraftButton220=d=>`<button class="scan-action danger" data-scan="discard-draft" data-draft="${d.id}">${d.backed?'Delete device copy':'Delete draft'}</button>`;
function showDrafts(){open('Unsaved scans',`<p>Unfinished batches stay here when you start another batch. Saved PDF drafts are also retained until you explicitly discard them.</p>${(draft?.pending||[]).map((p,i)=>`<div class="scan-card"><strong>Photo ${i+1} · Awaiting review</strong><div class="scan-actions"><button class="scan-action" data-scan="resume-photo" data-pending="${p.key}">Resume photo</button><button class="scan-action danger" data-scan="discard-photo" data-pending="${p.key}">Discard photo</button></div></div>`).join('')}${draftIndex.map(d=>`<div class="scan-card"><h3>${esc(d.title)}</h3><p>${d.pages} reviewed pages · ${d.pending} awaiting review<br>${d.backed?'PDF saved; device draft retained':'Not yet verified as a complete saved PDF'}${d.id===draft?.id?' · Current batch':''}</p><div class="scan-actions"><button class="scan-action" data-scan="resume-draft" data-draft="${d.id}">Resume batch</button>${deleteDraftButton220(d)}</div></div>`).join('')||'<p>No retained batches yet.</p>'}`);}
async function discardDraft220(id){
 await saveChain;const d=await store('draft:'+id);if(!d)throw Error('This device copy has already been deleted.');
 if(window.ReceiptNative214?.pending?.()?.draftID===id)throw Error('Finish recovering the returned camera pages before deleting this batch. Open the batch and tap Add receipts to resume.');
 const summary=draftSummary(d),warning=summary.backed?(summary.linked?'The PDF is saved and linked to Accounting.':'The PDF is saved, but Accounting links are unfinished. Deleting this copy removes the ability to retry those links from this batch.'):'This batch has unsaved scans or changes. They will be permanently lost.';
 if(!confirm(`Delete ${summary.backed?'the device copy of':'the draft'} “${d.title}” and its ${d.pages.length+(d.pending||[]).length} scan(s)?\n\n${warning}\n\nSaved PDFs in Google Drive, phone storage or SD card and existing Accounting attachments will remain.`))return;
 const next=draftIndex.filter(entry=>entry.id!==id),current=id===draft?.id;
 await writeRecords([['draft-list',next],...(current?[['current',null]]:[])],['draft:'+id,...d.pages.map(p=>'page:'+p.id),...(d.pending||[]).map(p=>'pending:'+p.key)]);
 draftIndex=next;if(current){ReceiptCamera209.stop();draft=null;editing=null;cameraQueue=[];pdfCache=null;captureLoop209=false;retakeTarget211=null;viewingPage211=null;capturedSource212=null;if(pdfURL){URL.revokeObjectURL(pdfURL);pdfURL='';}}
 render();await showDrafts();status('Device scan copy deleted. Saved PDFs and existing Accounting attachments are kept.');
}
async function checkpointEditing(){if(!editing||!draft)return;const pending=draft.pending?.find(p=>p.key===editing.pendingKey);if(!pending)return;Object.assign(pending,{rotate:editing.rotate,corners:structuredClone(editing.corners),gray:editing.gray??false,stage:editing.stage||'preview',manual211:editing.stage==='crop',nativeProcessed:!!editing.nativeProcessed});await persist(false);}
function closeDialog(){if(dialog===primaryDialog){ReceiptCamera209.stop();dialog.classList.remove("scan-camera-dialog209","scan-workflow211");}dialog.close();if(dialog===destinationDialog)dialog=primaryDialog;}
async function pauseReview(){captureLoop209=false;await checkpointEditing();editing=null;closeDialog();render();status('Unfinished scans are protected on this device. Resume them from Unsaved scans.');}
async function destinationShortcut(){if($('pdfName')){draft.outputName=pdfFilename();await persist(false);}await checkpointEditing();dialog=destinationDialog;destinationSettings();}
function destinationSettings(){return destinationPanel215();}
async function queueOriginal(original,id=null,group=draft.active,details={}){const pending={key:crypto.randomUUID(),id,group,rotate:0,stage:'preview',...details},previous=structuredClone(draft);draft.pending||=[];draft.pending.push(pending);try{await persist(false,[['pending:'+pending.key,{original}]]);}catch(e){draft=previous;throw e;}if(capturedSource212?.original===original)capturedSource212.pendingKey=pending.key;return pending;}
async function protectImports(){while(cameraQueue.length){const entry=cameraQueue[0];status('Protecting imported photos on this device · '+cameraQueue.length+' remaining…');try{const original=entry.original||await readFile(entry.file);if(entry.replace){const previous=structuredClone(draft),pending=draft.pending.find(p=>p.key===entry.replace);if(!pending)throw Error('The scan selected for retake is no longer available.');Object.assign(pending,{rotate:0,stage:'preview',corners:entry.corners,automatic:entry.automatic,nativeProcessed:!!entry.nativeProcessed,nativeKey:entry.nativeKey,gray:false});try{await persist(false,[['pending:'+pending.key,{original}]]);if(capturedSource212?.original===original)capturedSource212.pendingKey=pending.key;}catch(e){draft=previous;throw e;}}else{await queueOriginal(original,null,entry.group,{corners:entry.corners,automatic:entry.automatic,nativeProcessed:!!entry.nativeProcessed,nativeKey:entry.nativeKey});}cameraQueue.shift();retakeTarget211=null;}catch(e){render();throw Error('Some photos are not yet protected. Keep this window open and tap Retry protecting photos. '+e.message);}}void navigator.storage?.persist?.().catch(()=>{});render();}
async function resumePhoto(key){const pending=draft.pending?.find(p=>p.key===key);if(!pending)throw Error('This photo is no longer pending.');const raw=capturedSource212?.pendingKey===key?{original:capturedSource212.original}:await store('pending:'+key);if(!raw?.original)throw Error('This photo could not be read from device storage.');await editPage(raw.original,pending.id,pending);}
async function resumeDraft(id){if(cameraQueue.length)await protectImports();if(draft)await persist(false);const selected=await store('draft:'+id);if(!selected)throw Error('This draft is no longer available.');draft=selected;draft.pending||=[];pdfCache=null;await persist(false);closeDialog();render();if(draft.pending.length)await nextPhoto();}
async function api(action,args={}){valid();const session=await db.auth.getSession();if(session.error||session.data.session?.user?.id!==owner)throw Error('Sign in again to connect to Drive.');const r=await fetch(scope+'/functions/v1/accounting-documents',{method:'POST',headers:{Authorization:'Bearer '+session.data.session.access_token,apikey:OJM_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(35000)});const data=await r.json();valid();if(!r.ok||data.error){const disabled=/Google Drive API has not been used in project (\d+) before, or it is disabled/i.exec(data.error||'');throw Error(disabled?'Google Drive is authorized, but the Drive API is disabled for app project '+disabled[1]+'. Enable Google Drive API in Google Cloud, then retry.':data.error||'The connection did not complete.');}return data;}
async function connection(){
 const next=await api('status',{folderPicker:true}),company=next.companyDestination228;
 if(company&&next.companyManaged228){
  const selected=settings.email===next.email && settings.folder?.id!=='root' && settings.folder;
  const target=next.canChooseCompanyFolder && selected ? selected :
   {id:company.id,name:company.name,...(settings.folder?.id===company.id?{path:settings.folder.path}:{})};
  settings.folder=target;
  if(draft&&((!next.canChooseCompanyFolder || !draft.folder?.id || draft.folder.id==='root') && draft.folder?.id!==target.id || settings.email && settings.email!==next.email)){
   draft.folder=target;draft.file=null;draft.upload=null;await persist(false);
  }
  settings.companyManaged228=true;
 }else{
  settings.companyManaged228=false;
  if(next.connected&&settings.email&&settings.email!==next.email){settings.driveFolders215||={};settings.driveFolders215[settings.email]=settings.folder;settings.folder=settings.driveFolders215[next.email]||{id:'root',name:'My Drive'};if(draft){draft.folder=settings.folder;draft.file=null;draft.upload=null;await persist(false);}}
 }
 driveState=next;if(next.email)settings.email=next.email;await store('settings',settings);return next;
}

function open(title,html){if(dialog===primaryDialog){ReceiptCamera209.stop();dialog.classList.remove("scan-camera-dialog209","scan-workflow211");}dialog.innerHTML=`<header><h2>${esc(title)}</h2>${icon211('close','Close','close')}</header>${html}<p class="scan-error" role="alert"></p>`;if(!dialog.open)dialog.showModal();paintLoading217();}
function dialogError(e){const n=dialog.querySelector('[role=alert]');if(n)n.textContent=e.message||e;status(e.message||e,true);}
const storageMode=()=>['local','sd'].includes(settings.storage)?'local':'drive';
function storageChoice(id){return `<label>Save destination<select id="${id}"><option value="drive" ${storageMode()==='drive'?'selected':''}>Google Drive</option><option value="local" ${storageMode()==='local'?'selected':''}>Phone / local storage</option></select></label>`;}
const localHelp='Choose phone storage or an SD card if your device offers it. Otherwise download the PDF, then use your Files app to move it to the desired folder or SD card.';
async function setStorage(value){const next={...settings,storage:['local','sd'].includes(value)?value:'drive'};await store('settings',next);settings=next;}
function showStart(){if(nativeUI215()){main.innerHTML=`<section class="scan-card"><h1>Receipts and documents</h1><p>Choose the starting ID and destination before scanning.</p>${btn('setup215','Start scan','primary')}${btn('drafts','Saved drafts')}</section>`;return;}main.innerHTML=`<section class="scan-card scan-start"><h1>Scan a document batch</h1><p>Scan pages continuously, group them by entry, and save a separate PDF for each entry ID.</p>${storageChoice('startStorage')}<label>Document month<input id="startMonth" type="month" value="${C.monthNow()}"></label><label>First group<select id="startKind"><option value="journal">Journal entry</option><option value="hr">HR document ID</option><option value="support">Named supporting document</option></select></label><label id="startIDLabel">Confirm starting entry ID<input id="startID" value="${esc(requestedEntry208||'OJM'+C.monthNow().slice(2,4)+'-0001')}" maxlength="120"></label><small>This names scans only; it does not allocate or change journal entries.</small><div class="scan-actions">${btn('start','Confirm and start','primary')}</div></section>${draftsPanel()}`;$('startStorage').onchange=()=>run(()=>setStorage($('startStorage').value));$('startKind').onchange=()=>{$('startID').value=$('startKind').value==='support'?C.monthTitle($('startMonth').value)+' — Cash Slips':($('startKind').value==='hr'?'HR':'OJM')+$('startMonth').value.slice(2,4)+'-0001';};$('startMonth').onchange=()=>{$('startKind').onchange();};}
function render(){valid();if(!draft)return showStart();if(nativeUI215())return renderBatch215();const groups=C.plan(draft);main.innerHTML=`<section class="scan-batch-head211"><div><h1>${esc(draft.title)}</h1><small>${draft.pages.length} pages${draft.pending?.length?' · '+draft.pending.length+' awaiting review':''}</small></div>${icon211('batch','Rename batch','edit')}</section>${draft.pending?.length?'<button class="scan-resume211" data-scan="resume-pending">Resume unfinished scan</button>':''}${cameraQueue.length?btn('protect-imports','Retry protecting photos','primary'):''}${groups.map(g=>`<section class="scan-card scan-group ${g.id===draft.active?'active':''}"><div class="scan-group-title"><h2>${esc(g.label)}</h2>${icon211('group-options211','Entry options','more',`data-group="${g.id}"`)}</div><div class="scan-pages">${g.pages.map(p=>`<div class="scan-page"><button data-scan="page" data-page="${p.id}" aria-label="Review ${esc(p.label)}"><img src="${p.thumb}" alt="${esc(p.label)}" loading="lazy"></button><small>${esc(p.label)}</small></div>`).join('')}</div></section>`).join('')}${!draft.pages.length?'<div class="scan-empty211">Your scanned receipts will appear here.</div>':''}<div class="scan-capture scan-batch-footer211">${icon211('drafts','Unsaved scans','archive')}${icon211('camera','Scan receipt','camera','','primary')}${fileListButton()}${icon211('review','Save PDFs by entry ID','check')}</div>`;}
async function scannerSettings(){return destinationPanel215();}
async function chooseFolder(id='root',more=false){
 destination215=true;dialog=destinationDialog;
 if(!driveState.connected){await connection();if(!driveState.connected){settings.resumeFolder216=true;await store('settings',settings);return action('connect',null);}}
 const r=await api('folders',{parent:id,folderPicker:true,...(more?{pageToken:folders.next}:{})});
 folders={parent:r.parent,items:more?[...folders.items,...r.files]:r.files,next:r.nextPageToken};return driveFolder216(r);
}
function groupDialog(jump=false){const type=draft.groups.find(g=>g.id===draft.active)?.type==='hr'?'hr':'journal';open(jump?'Skip or jump to an entry':'Add document group',`<label>Group type<select id="newType"><option value="journal">Journal entry ID</option><option value="hr" ${type==='hr'?'selected':''}>HR document ID</option><option value="support">Named supporting document</option></select></label><label>Name or entry ID<input id="newLabel" value="${esc(draft.next[type])}" maxlength="120"></label><small>Supporting documents do not advance journal numbering.</small><div class="scan-actions">${btn('group-confirm','Use this group','primary')}</div>`);$('newType').onchange=()=>{$('newLabel').value=$('newType').value==='support'?draft.title+' — Cash Slips':draft.next[$('newType').value];};}
async function pageOptions211(id){const p=draft.pages.find(p=>p.id===id);if(!p)return;const data=await store('page:'+id);const label=C.plan(draft).flatMap(g=>g.pages).find(x=>x.id===id).label;open(label,`<img class="scan-preview" src="${data.data}" alt="Approved scan"><p>Pinch or open full image to inspect small text.</p><div class="scan-actions"><a class="scan-link" href="${data.data}" download="${esc(label)}.jpg">Download image</a><button class="scan-action" data-scan="recrop" data-page="${id}">Crop / straighten</button><button class="scan-action danger" data-scan="delete-page" data-page="${id}">Remove page</button></div><label>Move to group<select id="moveGroup">${draft.groups.map(g=>`<option value="${g.id}" ${g.id===p.group?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label><button class="scan-action" data-scan="move-page" data-page="${id}">Move page</button><details><summary>Start a new entry at this page</summary><label>Entry ID<input id="splitID" value="${esc(draft.next.journal)}"></label><button class="scan-action" data-scan="split" data-page="${id}">Split group here</button><p>This page and the following pages in its current group become the new entry.</p></details>`);}
async function openPage(id){if(nativeUI215()){closeDialog();render();return;}const meta=draft.pages.find(p=>p.id===id);if(!meta)return;const page=await store('page:'+id);if(draft.active!==meta.group){draft.active=meta.group;await persist(false);}viewingPage211=id;const label=C.plan(draft).flatMap(g=>g.pages).find(p=>p.id===id).label;workflow211(label,`<div class="scan-image-stage211"><img class="scan-preview" src="${page.data}" alt="Saved scan ${esc(label)}"></div>`,icon211('camera','Scan next receipt','receipt')+icon211('next','Start next entry','entry')+icon211('review','Save PDF','check','','primary'),icon211('retake-page211','Retake scan','retake',`data-page="${id}"`)+icon211('recrop','Adjust corners','crop',`data-page="${id}"`)+icon211('delete-page','Delete scan','trash',`data-page="${id}"`)+icon211('page-options211','Page options','more',`data-page="${id}"`));}
async function openCamera209(checked215=false){
 valid();if(!draft?.configured215&&!retakeTarget211)return openSetup215();await ensureDraft211();
 if(window.ReceiptNative214?.available&&await nativeScan214(true))return;
 if(draft.pending?.length&&!retakeTarget211){captureLoop209=true;return nextPhoto();}
 if(!checked215){const g=draft.groups.find(g=>g.id===(retakeTarget211?.group||draft.active));const rows=await validateIDs215([{type:g.type,label:g.label}]);draft.idChecks215={...draft.idChecks215,[g.label]:rows[0]};await persist(false);}
 captureLoop209=true;editing=null;viewingPage211=null;
 if(window.ReceiptNative214?.available)return nativeScan214();
 const count=draft.pages.length;
 workflow211('Scan',`<div class="camera-frame211"><video id="scanLive209" autoplay muted playsinline aria-label="Receipt camera preview"></video><svg id="liveEdges211" aria-hidden="true" preserveAspectRatio="xMidYMid meet"></svg><p id="cameraHint209" role="status">Opening camera…</p></div>`,icon211('import','Import photos','gallery')+icon211('capture-photo209','Take photo','camera','','scan-shutter211')+icon211('camera-review209','Review '+count+' saved pages','check',`data-count="${count}"`));
 const video=$('scanLive209'),capture=primaryDialog.querySelector('[data-scan="capture-photo209"]');capture.disabled=true;
 void ReceiptCamera209.start(video).then(ready=>{
  if(!ready||video!==$('scanLive209'))return;capture.disabled=false;
  ReceiptCamera209.watch((found,w,h)=>{if(video!==$('scanLive209'))return;const overlay=$('liveEdges211');overlay.setAttribute('viewBox',`0 0 ${w||1} ${h||1}`);overlay.innerHTML=found.automatic?`<polygon points="${found.corners.map(p=>p[0]*w+','+p[1]*h).join(' ')}"/>`:'';$('cameraHint209').textContent=found.automatic?'Ready to capture':found.status==='preparing'?'Preparing scanner…':found.status==='aligning'?'Hold steady':found.status==='unavailable'?'Take a photo · adjust edges if needed':'Fit the whole paper in view';});
 }).catch(e=>{if(video===$('scanLive209')){$('cameraHint209').textContent=e.message;primaryDialog.querySelector('.scan-flow-footer211').innerHTML=icon211('import','Import photos','gallery')+icon211('native-camera209','Open phone camera','camera','','primary');}});
}
async function importNativePage214(original,job,index){
 valid();if(job.owner!==owner)throw Error('The scan account changed.');
 const nativeKey=job.id+':'+index;
 if([...draft.pending,...draft.pages].some(p=>p.nativeKey===nativeKey))return;
 const picture=await C.image(original),width=picture.naturalWidth,height=picture.naturalHeight;
 const thumb=C.canvas(180,Math.max(1,Math.round(180*height/width)));thumb.getContext('2d').drawImage(picture,0,0,thumb.width,thumb.height);
 const replace=index===0&&job.replace?draft.pending.find(p=>p.key===job.replace):null;
 if(index===0&&job.replace&&!replace)throw Error('The original retake destination is missing. Your new scan is retained.');
 const old=replace?.id?draft.pages.find(p=>p.id===replace.id):null,id=crypto.randomUUID();
 const record={data:original,original,width,height,corners:[[0,0],[1,0],[1,1],[0,1]],rotate:0,gray:false,automatic:true,nativeProcessed:true};
 const meta={id,group:old?.group||job.group,width,height,thumb:thumb.toDataURL('image/jpeg',.82),nativeKey};
 const previous=structuredClone(draft);
 if(!draft.groups.some(g=>g.id===meta.group))throw Error('The original entry group is missing. Your scan is retained.');
 if(old)Object.assign(old,meta);else draft.pages.push(meta);
 if(replace)draft.pending=draft.pending.filter(p=>p.key!==replace.key);
 try{await persist(true,[['page:'+id,record]],[...(replace?['pending:'+replace.key]:[]),...(replace?.id?['page:'+replace.id]:[])]);}
 catch(e){draft=previous;throw e;}
}
async function nativeScan214(recoverOnly=false){
 const native=window.ReceiptNative214;
 if(!native?.available)return false;
 let job=await native.recover();
 if(!job&&recoverOnly)return false;
 workflow211('Scan',`<div class="scan-empty211">${native.platform==='android'?'Google document scanner':'iPhone document scanner'}</div>`,icon211('camera','Open scanner','camera','','primary')+icon211('camera-review209','Review saved scans','check'));
 if(!job)job=await native.scan({owner,draftID:draft.id,group:retakeTarget211?.group||draft.active,replace:retakeTarget211?.key||null});
 if(!job){const previous=retakeTarget211;retakeTarget211=null;if(previous){await resumePhoto(previous.key);status('Scan cancelled. Your previous scan is kept.');}else{closeDialog();render();status('Scan cancelled. Your previous scans are kept.');}return true;}
 valid();if(job.owner!==owner)throw Error('Sign in to the original account to recover these scans.');
 if(draft.id!==job.draftID){const saved=await store('draft:'+job.draftID);if(!saved)throw Error('Open the original scan batch to recover these pages.');draft=saved;draft.pending||=[];await persist(false);}
 for(let i=0;i<job.paths.length;i++){
  if(job.acknowledged.includes(i))continue;
  status('Protecting scanned pages · '+(i+1)+' / '+job.paths.length);
  if(!draft.pages.some(p=>p.nativeKey===job.id+':'+i))await importNativePage214(await native.readPage(job.paths[i]),job,i);
  await native.acknowledge(job,i);
 }
 await native.complete(job);retakeTarget211=null;await rememberIDs215();closeDialog();render();
 status(job.paths.length+' scans added to this entry.');
 if(draft.pages.length)await openPage(draft.pages.at(-1).id);
 return true;
}
async function capturePhoto209(){
 const source=ReceiptCamera209.frame();ReceiptCamera209.stop();
 workflow211('Review scan',`<div class="scan-image-stage211"><canvas id="capturedPhoto212" class="scan-preview" aria-label="Captured photo"></canvas></div><p class="scan-edge-note211" role="status">Straightening…</p>`,'');
 const frozen=$('capturedPhoto212'),scale=Math.min(1,960/Math.max(source.width,source.height));frozen.width=Math.round(source.width*scale);frozen.height=Math.round(source.height*scale);frozen.getContext('2d').drawImage(source,0,0,frozen.width,frozen.height);
 // Paint the captured frame immediately, before detection, encoding or protected storage.
 await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
 const shot=await ReceiptCamera209.captureScan(source);capturedSource212={original:shot.original,source};
 cameraQueue.push({original:shot.original,corners:shot.corners,automatic:shot.automatic,group:retakeTarget211?.group||draft.active,replace:retakeTarget211?.key});
 try{await protectImports();retakeTarget211=null;await nextPhoto();}catch(e){workflow211('Photo not saved yet',`<div class="scan-image-stage211"><img class="scan-preview" src="${shot.original}" alt="Photo awaiting storage"></div>`,icon211('protect-imports','Retry saving photo','save','','primary'));throw e;}
}
async function readFile(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
async function editPage(original,id=null,pending=null,adjust=false){valid();pending ||= await queueOriginal(original,id,draft.pages.find(p=>p.id===id)?.group||draft.active);if(pending.nativeProcessed&&!pending.rotate&&!adjust&&pending.stage!=='crop'){
 const photo=await C.image(original);editing={original,id,source:null,rotate:0,corners:pending.corners,automatic:true,pendingKey:pending.key,group:pending.group,gray:false,stage:'preview',nativeProcessed:true,result:{data:original,width:photo.naturalWidth,height:photo.naturalHeight}};
 return cropPreview();
 }const source=!pending.rotate&&capturedSource212?.original===original?capturedSource212.source:await C.sourceCanvas(original,pending.rotate||0),found=pending.corners?{corners:pending.corners,automatic:pending.automatic}:await C.detectDocument(source);capturedSource212=null;editing={original,id,source,rotate:pending.rotate||0,corners:pending.corners||found.corners,automatic:pending.automatic??found.automatic,pendingKey:pending.key,group:pending.group,gray:!!pending.gray,stage:'preview'};if(adjust||pending.stage==='crop'&&pending.manual211&&pending.corners)return manualCrop211();await cropPreview();}
async function manualCrop211(){if(!editing.source)editing.source=await C.sourceCanvas(editing.original,editing.rotate||0);editing.stage='crop';workflow211('Adjust corners',`<div class="crop-stage" style="--crop-ratio211:${editing.source.width/editing.source.height}"><canvas id="cropCanvas"></canvas><svg id="cropOverlay" preserveAspectRatio="none" aria-label="Drag the four document corners"></svg></div>`,icon211('back-preview211','Cancel adjustment','back')+icon211('crop-preview','Apply crop','check','','primary'),icon211('auto-crop','Detect corners again','auto')+icon211('full-crop','Keep whole photo','full')+icon211('rotate','Rotate photo','rotate')+icon211('toggle-gray211',editing.gray?'Use original colors':'Use grayscale','color'));drawCrop();return checkpointEditing();}
function drawCrop(){const c=$('cropCanvas'),x=c.getContext('2d'),scale=Math.min(1,900/editing.source.width);c.width=Math.round(editing.source.width*scale);c.height=Math.round(editing.source.height*scale);x.drawImage(editing.source,0,0,c.width,c.height);const svg=$('cropOverlay'),ratio=c.width/Math.max(1,c.getBoundingClientRect().width);svg.setAttribute('viewBox',`0 0 ${c.width} ${c.height}`);svg.innerHTML=`<polygon points="${editing.corners.map(p=>p[0]*c.width+','+p[1]*c.height).join(' ')}" fill="#31b58c20" stroke="#48f4bc" stroke-width="3"/>`+editing.corners.map((p,i)=>`<g data-corner="${i}" tabindex="0" role="button" aria-label="${['Top left','Top right','Bottom right','Bottom left'][i]} corner" transform="translate(${p[0]*c.width} ${p[1]*c.height})"><circle r="${22*ratio}" fill="transparent"/><circle r="${7*ratio}" fill="#fff" stroke="#07513e" stroke-width="${2*ratio}"/></g>`).join('');
 const move=(i,px,py)=>{editing.corners[i]=[Math.max(0,Math.min(1,px)),Math.max(0,Math.min(1,py))];svg.querySelector('polygon').setAttribute('points',editing.corners.map(p=>p[0]*c.width+','+p[1]*c.height).join(' '));svg.querySelector(`[data-corner="${i}"]`).setAttribute('transform',`translate(${editing.corners[i][0]*c.width} ${editing.corners[i][1]*c.height})`);};
 svg.onpointerdown=e=>{const handle=e.target.closest('[data-corner]');if(!handle)return;const i=Number(handle.dataset.corner);e.preventDefault();svg.setPointerCapture(e.pointerId);svg.onpointermove=event=>{const r=svg.getBoundingClientRect();move(i,(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);};svg.onpointerup=()=>{svg.onpointermove=null;void checkpointEditing().catch(dialogError);};svg.onpointercancel=svg.onpointerup;};
 svg.onkeydown=e=>{const handle=e.target.closest('[data-corner]'),delta={ArrowLeft:[-.005,0],ArrowRight:[.005,0],ArrowUp:[0,-.005],ArrowDown:[0,.005]}[e.key];if(!handle||!delta)return;e.preventDefault();const i=Number(handle.dataset.corner);move(i,editing.corners[i][0]+delta[0],editing.corners[i][1]+delta[1]);void checkpointEditing().catch(dialogError);};}
async function cropPreview(){const gray=editing.gray;if(!$('capturedPhoto212'))workflow211('Review scan',`<div class="scan-image-stage211"><img class="scan-preview" src="${editing.result?.data||editing.original}" alt="Captured photo"></div><p class="scan-edge-note211" role="status">Straightening…</p>`,'');const unchangedNative=editing.nativeProcessed&&editing.stage==='preview'&&!gray;const result=unchangedNative?editing.result:await C.warp(editing.source,editing.corners,gray);if(!unchangedNative)editing.nativeProcessed=false;valid();editing.result=result;editing.stage='preview';await checkpointEditing();workflow211('Review scan',`<div class="scan-image-stage211"><img id="finalScan" class="scan-preview" data-scan="zoom-scan" src="${result.data}" alt="Straightened scan preview"></div>${editing.automatic?'':'<p class="scan-edge-note211">Check the edges · adjust if needed</p>'}`,nextControls211(),icon211('retake-scan211','Retake photo','retake')+icon211('back-crop','Adjust corners','crop')+icon211('delete-current211','Delete photo','trash'));status('');}
async function acceptPage(mode='camera'){valid();const oldID=editing.id,pendingKey=editing.pendingKey,id=crypto.randomUUID(),record={...editing.result,original:editing.original,corners:editing.corners,rotate:editing.rotate,gray:editing.gray,automatic:editing.automatic,nativeProcessed:!!editing.nativeProcessed};const image=await C.image(record.data),thumb=C.canvas(180,Math.round(180*record.height/record.width));thumb.getContext('2d').drawImage(image,0,0,thumb.width,thumb.height);const old=draft.pages.find(p=>p.id===oldID),meta={id,group:old?.group||editing.group||draft.active,thumb:thumb.toDataURL('image/jpeg',.82),width:record.width,height:record.height,nativeKey:draft.pending.find(p=>p.key===pendingKey)?.nativeKey},previous=structuredClone(draft);if(old)Object.assign(old,meta);else draft.pages.push(meta);draft.pending=draft.pending.filter(p=>p.key!==pendingKey);try{await persist(true,[['page:'+id,record]],['pending:'+pendingKey,...(oldID?['page:'+oldID]:[])]);}catch(e){draft=previous;throw e;}editing=null;closeDialog();render();status('Receipt protected in your device draft. Save the PDF when ready.');if(mode==='next-entry')await advanceGroup211();if(draft.pending.length)return nextPhoto();if(mode==='save')return review();return openCamera209();}
async function advanceGroup211(){const active=draft.groups.find(g=>g.id===draft.active),previous=structuredClone(draft);let label;if(active.type==='support'){let n=draft.groups.filter(g=>g.type==='support').length+1;do{label='Receipts '+n++;}while(draft.groups.some(g=>g.label===label));}else{label=draft.next[active.type];while(draft.groups.some(g=>g.label===label))label=C.nextID(label);}C.addGroup(draft,active.type,label);try{await persist();}catch(e){draft=previous;throw e;}render();}
async function retake211(){await checkpointEditing();retakeTarget211=draft.pending.find(p=>p.key===editing.pendingKey);editing=null;return openCamera209();}
async function deleteCurrent211(){if(!confirm('Delete this scan?'))return;const previous=structuredClone(draft),key=editing.pendingKey,id=editing.id;draft.pending=draft.pending.filter(p=>p.key!==key);if(id)draft.pages=draft.pages.filter(p=>p.id!==id);try{await persist(true,[],['pending:'+key,...(id?['page:'+id]:[])]);}catch(e){draft=previous;throw e;}editing=null;retakeTarget211=null;return openCamera209();}
async function nextPhoto(){if(draft.pending?.length)await resumePhoto(draft.pending[0].key);}
async function prepareEntryFiles() {
 await saveChain;
 const source = draft;
 if (cameraQueue.length || window.ReceiptNative214?.pending?.()?.draftID === source.id)
  throw Error('Finish importing the camera pages before saving these PDFs.');
 const files = C.entryDocuments(source);
 if (files.length === 1 && files[0] === source) return files;
 const ids = new Set([source.id, ...files.map(file => file.id)]);
 const next = [...files.map(draftSummary), ...draftIndex.filter(item => !ids.has(item.id))];
 const active = files.find(file => file.active === source.active) || files[0];
 // Replace the batch and its index in one transaction. A failed write keeps the original batch intact.
 await writeRecords([['current',active], ['draft-list',next], ...files.map(file => ['draft:'+file.id,file])],
  files.some(file => file.id === source.id) ? [] : ['draft:'+source.id]);
 draft = active;
 draftIndex = next;
 pdfCache = null;
 return files;
}
function familyMembers() {
 if (!draft?.entryFile) return [];
 return draftIndex.filter(item => item.family === draft.entryFile.family).sort((a,b) => a.entryLabel.localeCompare(b.entryLabel, undefined, {numeric:true}));
}
function fileListButton() {
 return familyMembers().length > 1 ? btn('entry-files','PDFs by entry ID') : '';
}
function showEntryFiles() {
 dialog = primaryDialog;
 const members = familyMembers();
 const cards = members.map(item => `<section class="scan-card"><h3>${esc(item.entryLabel)}</h3><p>${item.pages} page(s) · ${item.linked ? 'Linked to Accounting' : item.backed ? 'Saved' : 'Ready to save'}</p><button type="button" class="scan-action" data-scan="review-entry-file" data-draft="${esc(item.id)}">${nativeUI215() ? 'View pages' : 'Review PDF'}</button>${nativeUI215() ? ` <button type="button" class="scan-action" data-scan="save-entry-file" data-draft="${esc(item.id)}">Save this ID</button>` : ''}</section>`);
 open('PDFs by entry ID', '<p>Save to <strong>'+esc(destinationName215())+'</strong></p>'+cards.join('') + (storageMode() === 'drive' || nativeUI215() ? btn('save-entry-files','Save all PDFs','primary') : ''));
}
async function selectEntryFile(id) {
 await saveChain;
 if (!familyMembers().some(item => item.id === id)) throw Error('Reopen the receipt batch.');
 if (draft.id !== id) {
  const selected = await store('draft:'+id);
  if (!selected || selected.entryFile?.family !== draft.entryFile.family) throw Error('This device draft is unavailable.');
  await store('current',selected);
  draft = selected;
  pdfCache = null;
 }
}
async function saveEntryFiles(files) {
 const selectedFolder = draft?.folder || settings.folder;
 const folder = selectedFolder?.id, account = driveState.email;
 let count = 0;
 for (const file of files) {
  await selectEntryFile(file.id);
  if(storageMode()==='drive' && folder && draft.folder?.id!==folder){
   draft.folder=selectedFolder;draft.upload=null;draft.file=null;await persist(false);
  }
  const savedHere = storageMode() === 'drive' ? draft.saved?.revision === draft.revision &&
   draft.folder?.id === folder && draft.file?.email === account : draft.localExport?.revision === draft.revision &&
   draft.localExport.verified && draft.localDestination === destinationName215();
  if (!(savedHere && draft.links208?.revision === draft.revision && draft.links208.status === 'linked')) {
   try {
    if (nativeUI215() || draft.workflow215) await saveOneEntry();
    else {
     if (storageMode() !== 'drive') throw Error('Choose Review PDF to save this file on your device.');
     await upload(false, true);
     if (draft.links208?.status !== 'linked') throw Error(draft.links208?.message || 'PDF saved. Its journal link is pending.');
    }
   } catch (e) {
    render();
    if (files.length > 1 && !primaryDialog.open && !nativeUI215()) showEntryFiles();
    throw Error(draft.entryFile.label + ': ' + e.message);
   }
  }
  count++;
 }
 render();
 if (files.length > 1 && !nativeUI215()) showEntryFiles();
 status(count === 1 ? 'PDF saved and linked to Accounting.' : count+' entry PDFs saved and linked to Accounting.');
}
async function pdf(){if(C.plan(draft).length!==1)throw Error('Choose one entry PDF to continue.');if(draft.pending?.length)throw Error('Review the photos in Unsaved scans before saving the complete PDF.');if(pdfCache?.revision===draft.revision)return pdfCache;const revision=draft.revision,result=await ReceiptPDF202.build(draft,id=>store('page:'+id),(n,total)=>status('Preparing PDF: '+n+' / '+total+' pages'));valid();if(revision!==draft.revision)throw Error('The batch changed. Prepare the PDF again.');const bytes=await result.blob.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');pdfCache={...result,sha,revision};return pdfCache;}
function pdfFilename(){const name=($('pdfName')?.value||draft.outputName||draft.file?.name||draft.title+'.pdf').trim();if(!name||name.length>180||/[\\/\x00-\x1f]/.test(name)||!name.toLowerCase().endsWith('.pdf'))throw Error('Use a PDF filename without slashes, up to 180 characters.');return name;}
function localFile(){if(pdfCache?.revision!==draft.revision)throw Error('Open Review / Save PDF to prepare the latest pages first.');return new File([pdfCache.blob],pdfFilename(),{type:'application/pdf',lastModified:Date.parse(draft.created)});}
function canSharePDF(){try{return !!navigator.share&&!!navigator.canShare?.({files:[localFile()]});}catch{return false;}}
async function review(one=false){const files=await prepareEntryFiles();if(!one&&(files.length>1||familyMembers().length>1))return showEntryFiles();if(!draft.pages.length)throw Error('Scan a receipt first.');const r=await pdf();if(pdfURL)URL.revokeObjectURL(pdfURL);pdfURL=URL.createObjectURL(r.blob);const local=storageMode()==='local';dialog=primaryDialog;open('Save PDF',`<div class="scan-save-summary211"><img src="${draft.pages[0].thumb}" alt="First scanned page"><div><p>${draft.pages.length} scans · ${(r.blob.size/1048576).toFixed(1)} MB</p><a class="scan-link" href="${pdfURL}" target="_blank" rel="noopener">Preview PDF</a></div></div><label>Filename<input id="pdfName" value="${esc(draft.outputName||draft.file?.name||draft.title+'.pdf')}" maxlength="180"></label>${driveState.annual231&&C.plan(draft).some(g=>g.type!=='journal')?`<label>Document date<input id="documentDate231" type="date" value="${esc(draft.documentDate231||draft.month+'-01')}"></label>`:''}<label>Save to</label><div class="scan-save-destination211"><span>${local?esc(localFolderPath(settings.storage)):esc(driveState.email||settings.email||'Google Drive')+'<br>'+esc(drivePath(draft.folder))}</span>${icon211('save-destination','Change save destination','folder')}</div>${local?btn('local-save',typeof window.showSaveFilePicker==='function'?'Choose location and save':'Save PDF','primary scan-save-button211'):btn('upload',draft.file?'Update saved PDF':'Save PDF','primary scan-save-button211')}<details><summary>More options</summary><div class="scan-actions">${local?`${typeof window.showSaveFilePicker==='function'?btn('local-download','Download instead'):''}<span id="localShareOption"></span>`:`${draft.file?btn('save-new','Save as new PDF'):''}${btn('local-review','Save to phone instead')}`}${btn('batch','PDF title and month')}${storageMode()==='local'?btn('link-local208','Upload a copy and link to Accounting'):draft.saved?btn('link-accounting208','Refresh document links'):''}</div></details>`);if(local&&canSharePDF())$('localShareOption').innerHTML=btn('local-share','Share PDF');status('');}
async function localExport(method='save'){
 const file=localFile(),revision=draft.revision,expected=pdfCache.sha;let verified=false,used=method;
 try{if(window.ReceiptNative214?.available){await ReceiptNative214.sharePDF(file);used='native-share';status('PDF handed to the selected destination. Your draft is kept.');}
 else if(method==='share'){if(!canSharePDF())throw Error('This browser cannot share PDF files. Use Download PDF instead.');await navigator.share({files:[file],title:file.name});valid();status('PDF handed to the selected app. Confirm it was saved there. Your draft is kept.');}
 else if(method==='save'&&typeof window.showSaveFilePicker==='function'){
  // Invoke the picker before any await so the original tap supplies user activation.
  const handle=await window.showSaveFilePicker({suggestedName:file.name,types:[{description:'PDF document',accept:{'application/pdf':['.pdf']}}]});valid();
  const writable=await handle.createWritable();try{await writable.write(file);valid();await writable.close();}catch(e){await writable.abort().catch(()=>{});throw e;}
  const saved=await handle.getFile(),bytes=await saved.arrayBuffer(),checksum=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');valid();if(saved.size!==file.size||checksum!==expected)throw Error('The local PDF could not be verified. Keep the draft and try saving again.');verified=true;used='picker';status('PDF saved and verified in your selected location. Your draft is kept.');
 }else{const u=URL.createObjectURL(file),a=document.createElement('a');a.href=u;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);used='download';status('Download requested. Check Downloads in your Files app; move the PDF to an SD card if needed. Your draft is kept.');}
 valid();draft.outputName=file.name;draft.localExport={name:file.name,revision,method:used,verified};await persist(false);
 }catch(e){if(e.name==='AbortError'){status('Save cancelled. Your draft is kept.');return;}throw e;}
}
function uploadHeaders(response){const range=response.headers.get('Range'),m=range?.match(/bytes=0-(\d+)/);return m?Number(m[1])+1:0;}
async function linkSaved208(result,local=false){valid();if(C.plan(draft).length!==1)return review();const r=result||await pdf(),session=async()=>{valid();const x=await db.auth.getSession();if(x.error||x.data.session?.user?.id!==owner)throw Error('Sign in again to link documents.');return x.data.session;},client=ReceiptLinks208.create({url:scope,key:OJM_SUPABASE_ANON_KEY,session});
 const provider=local?'supabase':'drive',path=local?owner+'/'+draft.id+'/'+draft.revision+'/document.pdf':draft.file?.id;if(!path||!local&&draft.saved?.revision!==draft.revision)throw Error('Save this PDF version to Drive first.');
 draft.links208={revision:draft.revision,status:'pending',provider};await persist(false);status('Preparing fast page previews and journal links…');
 if(local)await client.put(path,r.blob,'application/pdf');
 const manifest={workflow:draft.workflow215?218:undefined,id:draft.id,revision:draft.revision,title:draft.title,provider,bucket:ReceiptLinks208.BUCKET,pdf:{path,sha256:r.sha},groups:C.plan(draft).map(g=>({id:g.id,type:g.type,entryLabel:g.label,targets:draft.idChecks215?.[g.label],receiptChoice:draft.idChecks215?.[g.label]?.receiptChoice})),pages:r.index.map(p=>({...p,groupID:draft.pages.find(x=>x.id===p.id).group}))};
 await client.previews(manifest,async id=>ReceiptLinks208.preview((await store('page:'+id)).data));const response=await client.register(manifest);valid();try{localStorage.setItem('ojm-receipts-changed240',JSON.stringify({actor:owner,labels:manifest.groups.map(g=>g.entryLabel),at:Date.now()}));}catch{}draft.links208={revision:draft.revision,status:response.pending?'waiting':'linked',pending:response.pending,provider};await persist(false);render();status(response.pending?'PDF saved. '+response.pending+' section(s) are waiting for matching entry IDs. Refresh links after posting.':'Supporting documents linked. Open Documents beside the journal entry.');return response;
}
async function verifyUpload(info,r){const f=await api('file',{id:info.id,scan:draft.id});if(driveState.annual231&&(Number(f.appProperties?.ojmAccountingYear)!==info.year231||!f.parents?.includes(info.folder231)))throw Error('The saved PDF belongs to another year or an earlier destination. Choose Save as new PDF; the existing copy is kept.');if(f.trashed||Number(f.size)!==r.blob.size||f.sha256Checksum!==r.sha)throw Error('Drive has not yet confirmed the complete PDF checksum. Your draft is kept; tap Save again to verify.');draft.file={id:f.id,version:f.version,email:driveState.email,name:f.name};draft.saved={at:new Date().toISOString(),revision:draft.revision,url:f.webViewLink||'https://drive.google.com/file/d/'+f.id+'/view'};draft.upload=null;await persist(false);try{await linkSaved208(r);}catch(e){draft.links208={revision:draft.revision,status:'pending',message:e.message,provider:'drive'};await persist(false);}return f;}
async function upload(asNew=false,fromBatch=false){const name=((!fromBatch&&$('pdfName')?.value)||draft.outputName||draft.title+'.pdf').trim();if(!name||name.length>180||/[\\/\x00-\x1f]/.test(name)||!name.toLowerCase().endsWith('.pdf'))throw Error('Use a PDF filename without slashes.');const reviewedEmail=driveState.email,reviewedFolder=draft.folder.id;await connection();if(driveState.connected&&(reviewedEmail!==driveState.email||reviewedFolder!==draft.folder.id)){await review();throw Error('Google account changed. Review the new destination and press Save again.');}if(!driveState.connected){await scannerSettings();throw Error('Connect Google Drive, then return to Review / Save PDF.');}const r=await pdf();draft.outputName=name;if(asNew){draft.file=null;draft.upload=null;}if(draft.file&&draft.file.email!==driveState.email){draft.file=null;draft.upload=null;}if(draft.upload&&(draft.upload.sha!==r.sha||draft.upload.name!==name||draft.upload.parent!==draft.folder.id||draft.upload.email!==driveState.email))draft.upload=null;
 if(!draft.upload){const id=draft.file?.id||(await api('reserve-id')).ids?.[0];if(!id)throw Error('Drive did not reserve a file ID.');draft.upload={id,sha:r.sha,name,parent:draft.folder.id,email:driveState.email,version:draft.file?.version,offset:0};await persist(false);}
 const u=draft.upload;
 if(!fromBatch&&$('documentDate231')){draft.documentDate231=$('documentDate231').value;await persist(false);}
 if(driveState.annual231){const target=await api('receipt-year231',{groups:C.plan(draft).map(g=>({type:g.type,label:g.label})),documentDate:draft.documentDate231});if(u.year231!==target.year||u.folder231!==target.folder)u.session=null;u.year231=target.year;u.folder231=target.folder;await persist(false);}
 // A lost final response must verify the same ID, never create a duplicate file.
 try{const f=await api('file',{id:u.id,scan:draft.id});if(f.sha256Checksum===r.sha&&Number(f.size)===r.blob.size){await verifyUpload(u,r);closeDialog();render();status('Verified and saved to Google Drive.');return;}}catch(e){if(/another year|earlier destination/.test(e.message)||!/not found|404/.test(e.message)&&!draft.file&&/not this account/.test(e.message))throw e;}
 if(!u.session){if(!fromBatch&&$('documentDate231')){draft.documentDate231=$('documentDate231').value;await persist(false);}const start=await api('upload-start',{...u,scan:draft.id,month:draft.month,size:r.blob.size,groups:C.plan(draft).map(g=>({type:g.type,label:g.label})),documentDate:draft.documentDate231});u.session=start.session;u.year231=start.year;u.folder231=start.folder;await persist(false);}
 const session=new URL(u.session);if(session.origin!=='https://www.googleapis.com'||!/^\/upload\/drive\/v3\/files(?:\/[\w-]+)?$/.test(session.pathname)||!session.searchParams.has('upload_id'))throw Error('Invalid upload session.');
 let probe=await fetch(u.session,{method:'PUT',headers:{'Content-Range':'bytes */'+r.blob.size},body:new Uint8Array(),signal:AbortSignal.timeout(30000)});valid();if(probe.status===200||probe.status===201){await verifyUpload(u,r);}else{if(probe.status===404||probe.status===410){u.session=null;await persist(false);throw Error('The upload session expired. Tap Save to resume with a new upload session.');}if(probe.status!==308)throw Error('Drive could not resume the upload ('+probe.status+'). Your draft is kept.');u.offset=uploadHeaders(probe);await persist(false);while(u.offset<r.blob.size){valid();const end=Math.min(u.offset+4*1024*1024,r.blob.size);status('Uploading to '+driveState.email+(u.year231?' · '+u.year231:'')+' · '+Math.round(u.offset/r.blob.size*100)+'%');const response=await fetch(u.session,{method:'PUT',headers:{'Content-Type':'application/pdf','Content-Range':`bytes ${u.offset}-${end-1}/${r.blob.size}`},body:r.blob.slice(u.offset,end),signal:AbortSignal.timeout(60000)});valid();if(response.status===200||response.status===201){await verifyUpload(u,r);break;}if(response.status!==308)throw Error('Upload interrupted ('+response.status+'). Tap Save to resume.');const acknowledged=uploadHeaders(response);if(acknowledged<=u.offset||acknowledged>end)throw Error('Drive did not confirm the uploaded chunk. Retry to check its status.');u.offset=acknowledged;await persist(false);}}
 if(draft.upload)throw Error('Upload is awaiting final verification. Tap Save again.');closeDialog();render();status('Verified and saved to Google Drive.');}
async function download(){await setStorage('local');render();return review(true);}
let setup215=null,destination215=false,idsRequest215=0;
// Suggestions are encrypted, account-scoped hints, never permission or receipt decisions.
let idCache221=[];const idRequests221=new Map(),idCacheAge221=24*60*60*1000;
const idKey221=label=>String(label||'').trim().replace(/^OJM[\s-]*(\d{2})[\s-]*(\d{4})(-\d+)?$/i,(_,year,number,suffix)=>'OJM'+year+number+(suffix||'')).toUpperCase();
async function cacheIDs221(rows){
 valid();if(frozen)return;const entries=new Map(idCache221.map(r=>[r.type+':'+idKey221(r.label),r]));
 for(const r of rows){if(!r?.label||!['journal','hr','support'].includes(r.type))continue;const key=r.type+':'+idKey221(r.label);if(r.available)entries.set(key,{type:r.type,label:r.label,checkedAt:Date.now()});else entries.delete(key);}
 idCache221=[...entries.values()].sort((a,b)=>b.checkedAt-a.checkedAt).slice(0,500);
 // A full device must not turn an optional suggestion cache into a failed ID check.
 try{await store('id-suggestions221',idCache221);}catch{valid();}
}
function cachedIDs221(form,exclude){
 const seed=idKey221(form.label),match=seed.match(/^(.*?)(\d{4,})$/),prefix=match?match[1]+match[2].slice(0,-4):seed;
 return idCache221.filter(r=>r.type===form.type&&idKey221(r.label).startsWith(prefix)&&!exclude.has(idKey221(r.label))&&(!form.after||laterID219(r.label,form.after))&&idKey221(r.label).localeCompare(seed,undefined,{numeric:true})>=0).sort((a,b)=>idKey221(a.label).localeCompare(idKey221(b.label),undefined,{numeric:true})).slice(0,20);
}
const nativeUI215=()=>!!window.ReceiptNative214?.available;
const typeName215=type=>({journal:'Journal',hr:'HR',support:'Supporting document'}[type]||'Document');
function localFolderPath(mode){
 const selected=settings.localFolders215?.[mode], storage=mode==='sd'?'SD card':'Phone storage';
 if(!selected)return storage+' · Choose a folder';
 try{
  const uri=new URL(selected.id);
  if(uri.protocol==='content:' && uri.hostname==='com.android.externalstorage.documents'){
   const match=uri.pathname.match(/\/tree\/([^/]+)/);
   if(match){
    const document=decodeURIComponent(match[1]), split=document.indexOf(':');
    if(split>0)return [document.slice(0,split)==='primary'?'Phone storage':'SD card ('+document.slice(0,split)+')',...document.slice(split+1).split('/').filter(Boolean)].join(' › ');
   }
  }
 }catch{/* Browser and iOS pickers may expose only the selected folder name. */}
 return storage+' › '+selected.name;
}
function drivePath(folder){
 const path=folder?.path||folder?.name||'Choose a folder';
 return path+(driveState.annual231?' › [accounting year]':'');
}
const destinationName215=()=>storageMode()==='drive'?drivePath(draft?.folder||settings.folder):localFolderPath(settings.storage);
function nextLabel215(type,label){if(type!=='support')return C.nextID(label);try{return C.nextID(label);}catch{return label+' 2';}}
function suggested215(type){return settings.nextIDs215?.[type]||(type==='support'?'Supporting documents 1':(type==='hr'?'HR':'OJM')+C.monthNow().slice(2,4)+'0001');}
async function ids215(groups,scan=draft?.id){
 valid();const session=async()=>{valid();const r=await db.auth.getSession();if(r.error||r.data.session?.user?.id!==owner)throw Error('Sign in again to check the document IDs.');return r.data.session;};
 const client=ReceiptLinks208.create({url:scope,key:OJM_SUPABASE_ANON_KEY,session});
 const response=await client.api('ids',{groups,scan});valid();await cacheIDs221(response.ids);
 for(const entry of draftIndex.filter(d=>d.id!==scan&&!d.backed)){
  const other=await store('draft:'+entry.id);
  for(const row of response.ids)if(other?.groups.some(g=>g.label===row.label&&other.pages.some(p=>p.group===g.id))){row.available=false;row.reason='Already used by another saved device batch';}
 }
 return response.ids;
}
async function validateIDs215(groups,review222=false){
 const rows=await ids215(groups),bad=rows.findIndex(r=>!r.available);if(bad>=0){if(review222)await idProblem223(rows[bad],groups[bad]?.id);throw Error(rows[bad].label+': '+rows[bad].reason);}
 for(const [index,row] of rows.entries()){
  const expected=(row.receipts||[]).map(r=>r.id).sort(),previous=draft?.idChecks215?.[row.label]?.receiptChoice;
  row.receiptChoice=previous&&JSON.stringify(previous.expected)===JSON.stringify(expected)?previous:expected.length?(review222?await compareReceipts222(row,groups[index]?.id):await receiptChoice218(row)):{mode:'new',expected:[]};
 }
 return rows;
}
async function receiptChoice218(row){
 const popup=document.createElement('dialog');popup.className='scan-receipt-choice218';
 popup.innerHTML=`<h2>Receipts already saved</h2><p><strong>${esc(row.label)}</strong> has ${(row.receipts||[]).length} saved document section(s).</p><p>Add keeps the existing receipts. Replace makes your new scans the current receipts for this entry after the PDF is saved successfully. This choice will be remembered when saving. If the saved receipts change, you can compare them before deciding again.</p><div class="scan-setting-list211"><button class="scan-action primary" data-receipt-choice="add">Add supporting documents</button><button class="scan-action danger" data-receipt-choice="replace">Replace existing receipts</button><button class="scan-action" data-receipt-choice="cancel">Cancel</button></div>`;
 document.body.append(popup);popup.showModal();paintLoading217(true);
 try{return await new Promise((resolve,reject)=>{const choose=mode=>{if(mode==='cancel')reject(Error('Scan cancelled. Existing receipts are unchanged.'));else resolve({mode,expected:row.receipts.map(r=>r.id).sort()});};popup.onclick=e=>{const b=e.target.closest('[data-receipt-choice]');if(b)choose(b.dataset.receiptChoice);};popup.oncancel=e=>{e.preventDefault();choose('cancel');};popup.onclose=()=>choose('cancel');});}
 finally{popup.close();popup.remove();paintLoading217();}
}
async function compareReceipts222(row,groupID){
 const group=C.plan(draft).find(g=>g.id===groupID&&g.type===row.type&&idKey221(g.label)===idKey221(row.label));
 if(!group?.pages.length)throw Error('Review this entry’s new scans before saving.');
 const revision=draft.revision,batchID=draft.id,receipts=row.receipts,views=new Map(),ready={saved:false,incoming:false},images={},positions={saved:0,incoming:0},tickets={saved:0,incoming:0};let documentIndex=0,finished=false,zoom=null;
 const popup=document.createElement('dialog');popup.className='scan-receipt-choice218 scan-compare222';popup.setAttribute('aria-label','Compare saved and new receipts');
 const pane=(side,title)=>`<section class="scan-compare-pane222" data-compare-pane="${side}"><h3>${title}</h3><div class="scan-compare-caption222" data-compare-caption="${side}"></div><div class="scan-compare-image222" data-compare-image="${side}"></div><p class="scan-compare-status222" data-compare-status="${side}" role="status">Loading preview…</p><div class="scan-compare-nav222"><button type="button" class="scan-action" data-compare-prev="${side}" aria-label="Previous ${side} page">‹</button><span data-compare-page="${side}"></span><button type="button" class="scan-action" data-compare-next="${side}" aria-label="Next ${side} page">›</button></div><button type="button" class="scan-action" data-compare-zoom="${side}" disabled>Enlarge</button><button type="button" class="scan-action" data-compare-retry="${side}" hidden>Retry preview</button></section>`;
 const oldPages=receipts.reduce((n,r)=>n+Number(r.pages||0),0);
 popup.innerHTML=`<header><h2>Compare receipts</h2><button type="button" class="scan-action" data-receipt-choice="cancel">Back</button></header><div class="scan-compare-body222"><p class="scan-compare-entry222"><strong>${esc(row.label)}</strong></p><p class="scan-compare-summary222">Saved: ${receipts.length} document(s) · ${oldPages} page(s).<br>New: ${group.pages.length} page(s) for this entry.</p>${receipts.length>1?`<label>Saved document<select data-compare-document>${receipts.map((r,i)=>`<option value="${i}">${esc(r.title)} · ${r.pages} page(s)</option>`).join('')}</select></label>`:''}<div class="scan-compare-grid222">${pane('saved','Currently saved')}${pane('incoming','Your new scans')}</div><p class="scan-compare-warning222">Replace will use these ${group.pages.length} new page(s) in place of all ${oldPages} saved page(s) for ${esc(row.label)}. Add keeps both.</p></div><div class="scan-setting-list211"><button type="button" class="scan-action primary" data-receipt-choice="add" disabled>Add supporting documents</button><button type="button" class="scan-action danger" data-receipt-choice="replace" disabled>Replace saved receipts</button><button type="button" class="scan-action" data-receipt-choice="edit">Edit ID first</button></div>`;
 const node=(kind,side)=>popup.querySelector(`[data-compare-${kind}="${side}"]`);
 const active=()=>{valid();return !finished&&popup.open&&!frozen&&draft?.id===batchID&&draft.revision===revision;};
 const buttons=()=>{for(const mode of ['add','replace'])popup.querySelector(`[data-receipt-choice="${mode}"]`).disabled=!(ready.saved&&ready.incoming);};
 const session=async()=>{valid();const r=await db.auth.getSession();if(r.error||r.data.session?.user?.id!==owner)throw Error('Sign in again to open saved receipts.');return r.data.session;},client=ReceiptLinks208.create({url:scope,key:OJM_SUPABASE_ANON_KEY,session});
 async function load(side,retry=false){
  const ticket=++tickets[side];ready[side]=false;images[side]=null;buttons();node('zoom',side).disabled=true;node('retry',side).hidden=true;node('image',side).replaceChildren();node('status',side).textContent='Loading preview…';node('status',side).classList.remove('error');node('prev',side).disabled=node('next',side).disabled=true;
  try{
   let pages,title,label,src;
   if(side==='saved'){
    const id=receipts[documentIndex].id;let view=views.get(id);if(retry||!view||view.expires<=Date.now()){view=await client.api('view',{id});if(!active()||ticket!==tickets[side])return;if(idKey221(view.label)!==idKey221(row.label))throw Error('The saved receipt ID changed. Go back and check this entry again.');views.set(id,view);}
    pages=view.pages;title=view.title;label=view.label;if(!pages?.length)throw Error('No saved page previews are available.');positions[side]=Math.min(positions[side],pages.length-1);src=pages[positions[side]].url;
    const url=new URL(src);if(url.origin!==new URL(scope).origin||!url.pathname.startsWith('/storage/v1/object/sign/scan-documents208/'))throw Error('The saved preview could not be verified.');
   }else{pages=group.pages;title=draft.title;label=group.label;src=(await store('page:'+pages[positions[side]].id))?.data;if(!/^data:image\/(jpeg|png|webp);base64,/.test(src||''))throw Error('The new scan could not be read. Your draft is kept.');}
   if(!active()||ticket!==tickets[side])return;
   const index=positions[side],page=pages[index];node('caption',side).textContent=title+' · '+label;node('page',side).textContent=(index+1)+' / '+pages.length;
   const img=document.createElement('img');img.alt=(side==='saved'?'Saved':'New')+' receipt '+(page.label||label)+' · page '+(index+1);img.referrerPolicy='no-referrer';img.src=src;node('image',side).append(img);
   let timer;try{await Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Preview took too long to load. Retry when connected.')),30000);})]);}finally{clearTimeout(timer);}
   if(!active()||ticket!==tickets[side])return;
   ready[side]=true;images[side]={src,alt:img.alt};node('status',side).textContent=page.label||label;node('prev',side).disabled=index===0;node('next',side).disabled=index===pages.length-1;node('zoom',side).disabled=false;buttons();
  }catch(e){if(finished||ticket!==tickets[side])return;node('status',side).textContent=e.message||'Preview unavailable. Retry when connected.';node('status',side).classList.add('error');node('retry',side).hidden=false;}
 }
 function enlarge(side){
  if(!images[side]||!active())return;zoom=document.createElement('dialog');zoom.className='scan-compare-zoom222';
  zoom.innerHTML=`<header><h2>${side==='saved'?'Currently saved':'Your new scan'}</h2><button type="button" class="scan-action" data-zoom-close222>Back</button></header><p>${esc(images[side].alt)}</p><div class="scan-compare-zoom-stage222"><img src="${esc(images[side].src)}" alt="${esc(images[side].alt)}" referrerpolicy="no-referrer"></div><button type="button" class="scan-action" data-zoom-size222>Zoom in</button>`;
  zoom.onclick=e=>{if(e.target.closest('[data-zoom-close222]'))zoom.close();if(e.target.closest('[data-zoom-size222]')){const big=zoom.querySelector('img').classList.toggle('enlarged');e.target.textContent=big?'Fit image':'Zoom in';}};zoom.onclose=()=>{zoom?.remove();zoom=null;};document.body.append(zoom);zoom.showModal();
 }
 document.body.append(popup);popup.showModal();paintLoading217(true);
 try{return await new Promise((resolve,reject)=>{
  const choose=mode=>{if(finished)return;if((mode==='add'||mode==='replace')&&!(ready.saved&&ready.incoming))return;finished=true;if(mode==='edit'){const e=Error('Edit the entry ID before saving.');e.editGroup222=group.id;reject(e);}else if(mode==='cancel')reject(Error('Save cancelled. Your scans are kept; existing receipts are unchanged.'));else{try{valid();resolve({mode,expected:receipts.map(r=>r.id).sort()});}catch(e){reject(e);}}};
  popup.onclick=e=>{const choice=e.target.closest('[data-receipt-choice]');if(choice)return choose(choice.dataset.receiptChoice);for(const kind of ['prev','next','retry','zoom']){const b=e.target.closest('[data-compare-'+kind+']');if(!b)continue;const side=b.dataset['compare'+kind[0].toUpperCase()+kind.slice(1)];if(kind==='zoom')enlarge(side);else{if(kind!=='retry')positions[side]+=kind==='prev'?-1:1;void load(side,kind==='retry');}}};
  const select=popup.querySelector('[data-compare-document]');if(select)select.onchange=()=>{documentIndex=Number(select.value);positions.saved=0;void load('saved');};
  popup.oncancel=e=>{e.preventDefault();choose('cancel');};popup.onclose=()=>choose('cancel');void load('saved');void load('incoming');
 });}finally{finished=true;zoom?.close();popup.close();popup.remove();views.clear();paintLoading217();}
}
async function rememberIDs215(){
 settings.nextIDs215||={};const current=draft.groups.find(g=>g.id===draft.active&&draft.pages.some(p=>p.group===g.id));for(const g of current?[current]:C.plan(draft)){settings.nextIDs215[g.type]=nextLabel215(g.type,g.label);settings.lastType215=g.type;}
 await store('settings',settings);
}
function setupValue215(){if(!$('setupID215'))return setup215;return {...setup215,type:$('setupType215')?.value||setup215.type,label:$('setupID215').value.trim(),title:$('setupTitle215')?.value.trim()??setup215.title,month:setup215.month};}
async function keepSetup215(){setup215=setupValue215();if(setup215.mode==='start'){settings.pendingSetup215=setup215;await store('settings',settings);}}
const idCheckMoment223=()=>setup215?.mode==='edit'?'saving':'scanning';
let idPicker219=null;
function idField219(label){return `<div class="scan-id-picker219"><label for="setupID215">${esc(label)}</label><div class="scan-id-field219"><input id="setupID215" role="combobox" aria-autocomplete="none" aria-controls="availableIDs215" aria-expanded="false" aria-describedby="idStatus215" value="${esc(setup215.label)}" maxlength="120" autocomplete="off" spellcheck="false"><button type="button" id="showIDs219" aria-label="Show ID suggestions" aria-controls="availableIDs215" aria-expanded="false">▾</button></div><div id="availableIDs215" class="scan-id-options219" role="listbox" tabindex="-1" aria-label="Suggested IDs" hidden></div></div>`;}
function bindIDPicker219(){
 const input=$('setupID215'),list=$('availableIDs215'),toggle=$('showIDs219');let rows=[],active=-1,typing;
 const show=value=>{list.hidden=!value;input.setAttribute('aria-expanded',String(value));toggle.setAttribute('aria-expanded',String(value));if(!value){active=-1;list.removeAttribute('aria-activedescendant');}};
 const highlight=()=>{[...list.children].forEach((n,i)=>n.setAttribute('aria-selected',String(i===active)));if(active>=0&&list.children[active]){list.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}else list.removeAttribute('aria-activedescendant');};
 const refresh=()=>{clearTimeout(typing);if($('setupID215')!==input||!primaryDialog.open)return;void keepSetup215().then(()=>refreshIDs215()).catch(dialogError);};
 const clearError=()=>{primaryDialog.querySelector('.scan-error').textContent='';};
 const choose=index=>{if(!rows[index]||busy)return;clearError();input.value=rows[index].label;++idsRequest215;show(false);toggle.focus({preventScroll:true});refresh();};
 idPicker219={input,update(values,message='No suggestions. You can type an ID above.'){rows=values;active=-1;list.removeAttribute('aria-activedescendant');list.innerHTML=rows.map((r,i)=>`<div id="idOption219-${i}" role="option" aria-selected="false" data-id-index="${i}">${esc(r.label)}</div>`).join('')||`<p class="scan-small215">${esc(message)}</p>`;}};
 input.onfocus=input.onpointerdown=()=>show(false);
 input.oninput=()=>{++idsRequest215;clearError();clearTimeout(typing);idPicker219.update([],input.value.trim()?'Loading ID suggestions…':'Type an ID above.');show(false);$('idStatus215').textContent=input.value.trim()?'ID will be checked before '+idCheckMoment223()+'.':'Type an ID to check it in Accounting.';typing=setTimeout(refresh,300);};
 input.onchange=refresh;
 list.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();show(false);toggle.focus({preventScroll:true});}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(rows.length){active=active<0?(e.key==='ArrowDown'?0:rows.length-1):(active+(e.key==='ArrowDown'?1:-1)+rows.length)%rows.length;highlight();}}else if(e.key==='Enter'&&active>=0){e.preventDefault();choose(active);}};
 input.closest('.scan-id-picker219').onfocusout=e=>{if(!e.currentTarget.contains(e.relatedTarget))show(false);};
 toggle.onclick=()=>{const opening=list.hidden;show(opening);if(opening){list.focus({preventScroll:true});clearTimeout(typing);void keepSetup215().then(()=>refreshIDs215(false,false,true)).catch(dialogError);}};
 list.onpointerdown=e=>{if(e.target.closest('[data-id-index]'))e.preventDefault();};
 list.onclick=e=>{const option=e.target.closest('[data-id-index]');if(option)choose(Number(option.dataset.idIndex));};
 idPicker219.update([],'Loading ID suggestions…');show(false);
}
function laterID219(label,current){return idKey221(label).localeCompare(idKey221(current),undefined,{numeric:true})>0;}
function openSkipID219(current){
 setup215={mode:'skip',groupID:null,type:current.type,label:nextLabel215(current.type,current.label),after:current.label,title:draft.title,month:draft.month};
 dialog=primaryDialog;open('Skip to ID',`<div class="scan-setup215"><p class="scan-small215">Current ID: ${esc(current.label)}</p>${idField219('Choose or type an ID')}<p id="idStatus215" role="status">Checking available IDs…</p><div class="scan-actions">${btn('setup-confirm215','Start scan','primary')}</div></div>`);
 bindIDPicker219();void refreshIDs215(true);
}
async function openSetup215(mode='start',groupID=null){
 valid();if(draft&&draft.completed215===draft.revision&&familyMembers().every(member=>member.backed&&member.linked)&&mode==='start'){await store('current',null);draft=null;pdfCache=null;render();}
 const g=groupID?draft?.groups.find(g=>g.id===groupID):null;
 const prior=mode==='start'&&settings.pendingSetup215?.mode!=='edit'?settings.pendingSetup215:null,type=g?.type||prior?.type||settings.lastType215||'journal';
 setup215={mode,groupID:g?.id||null,type,label:g?.label||prior?.label||requestedEntry208||suggested215(type),title:prior?.title||draft?.title||C.monthTitle(C.monthNow()),month:prior?.month||draft?.month||C.monthNow()};
 dialog=primaryDialog;open(mode==='edit'?'Edit document':'Before scanning',`<div class="scan-setup215"><label>PDF name<input id="setupTitle215" value="${esc(setup215.title)}" maxlength="170"></label><label>Document type<select id="setupType215">${['journal','hr','support'].map(t=>`<option value="${t}" ${t===type?'selected':''}>${typeName215(t)}</option>`).join('')}</select></label>${idField219(mode==='edit'?'Entry ID / name':'Starting ID / name')}<p id="idStatus215" role="status">Checking available IDs…</p><div class="scan-path215"><span id="setupPath215">${esc(destinationName215())}</span>${btn('destination215','Destination')}</div><p class="scan-small215">${draft?.pages.length?draft.pages.length+' pages remain in this PDF. ':''}${mode==='edit'?'Numbered IDs shift later IDs in the same sequence, keeping Next/Skip gaps. IDs are checked when saving.':'Confirm the ID against your documents.'}</p><div class="scan-actions">${btn('setup-confirm215',mode==='edit'?'Apply changes':'Start scan','primary')}${mode==='start'&&draft?.pages.length?btn('batch-view215','View batch'):''}</div></div>`);
 $('setupType215').onchange=()=>run(async()=>{setup215=setupValue215();$('setupID215').value=suggested215($('setupType215').value);await keepSetup215();await refreshIDs215(true);});
 for(const id of ['setupTitle215'])$(id).onchange=()=>run(keepSetup215);
 bindIDPicker219();
 void refreshIDs215(mode==='start'&&!requestedEntry208, !settings.nextIDs215?.[type],true);
}
async function refreshIDs215(choose=false,resume=false,allowFetch=choose){
 const ticket=++idsRequest215,form=setupValue215(),input=$('setupID215');if(!input||!form?.label)return;
 const current=()=>!frozen&&ticket===idsRequest215&&$('setupID215')===input&&primaryDialog.open;
 const session=async()=>{valid();const r=await db.auth.getSession();if(r.error||r.data.session?.user?.id!==owner)throw Error('Sign in again to check IDs.');return r.data.session;};
 let cached=[];
 try{
  const exclude=[];for(const entry of draftIndex){const other=entry.id===draft?.id?draft:await store('draft:'+entry.id);for(const g of other?.groups||[])if(!entry.backed&&!(entry.id===draft?.id&&g.id===form.groupID)&&other.pages.some(p=>p.group===g.id))exclude.push(g.label);}
  if(!current())return;
  cached=cachedIDs221(form,new Set(exclude.map(idKey221)));
  idPicker219.update(cached,allowFetch?'Loading ID suggestions…':'Open the dropdown to load more IDs, or type an ID.');
  if(choose&&cached.length&&(resume||!cached.some(r=>idKey221(r.label)===idKey221(form.label)))){input.value=cached[0].label;await keepSetup215();}
  if(!current())return;
  $('idStatus215').textContent=cached.length?'Saved ID list · checked again before '+idCheckMoment223()+'.':'ID will be checked before '+idCheckMoment223()+'.';
  $('idStatus215').className='';
  if(!allowFetch||cached.some(r=>Date.now()-r.checkedAt<idCacheAge221))return;
  const args={type:form.type,label:form.label,scan:draft?.id,exclude:[...new Set(exclude)],resume:choose&&resume},key=JSON.stringify(args);
  const fetchList=async()=>{
   let pending=idRequests221.get(key);
   if(!pending){pending=(async()=>{const client=ReceiptLinks208.create({url:scope,key:OJM_SUPABASE_ANON_KEY,session});const response=await client.api('suggest-ids',args);valid();await cacheIDs221([...(response.suggestions||[]),response.selected]);return response;})();idRequests221.set(key,pending);void pending.finally(()=>idRequests221.delete(key)).catch(()=>{});}
   return pending;
  };
  if(!cached.length)$('idStatus215').textContent='Checking available IDs…';
  const response=await (cached.length?fetchList():loading217(fetchList,'Loading ID suggestions…'));
  if(!current()||input.value.trim()!==form.label)return;
  const rows=(response.suggestions||[]).filter(r=>!form.after||laterID219(r.label,form.after));let selected=response.selected;
  if(choose&&rows.length&&(resume||!selected?.available)){input.value=rows[0].label;selected=rows[0];await keepSetup215();}
  if(!current())return;
  idPicker219.update(rows);
  $('idStatus215').textContent=selected?.available?'ID list updated · checked again before '+idCheckMoment223()+'.':(selected?.reason||'Choose an existing journal ID.')+(rows.length?' · choose an ID from the suggestions.':' You can type another ID.');
  $('idStatus215').className=selected?.available?'':'unavailable215';
 }catch(e){if(current()){$('idStatus215').textContent=cached.length?'Using saved IDs. Connect to verify before '+idCheckMoment223()+'.':e.message; $('idStatus215').className=cached.length?'':'unavailable215';if(!cached.length)idPicker219.update([],'Could not load IDs. Reopen the dropdown to retry, or type an ID.');}}
}
async function checkDestination215(){
 if(storageMode()==='drive'){
  await connection();if(!driveState.connected)throw Error('Connect Google Drive and choose a folder before scanning.');
  const folder=await api('folder',{id:draft?.folder?.id||settings.folder?.id||'root'});if(!folder.capabilities?.canAddChildren)throw Error('Choose a writable Google Drive folder.');
 }else{
  const folder=settings.localFolders215?.[settings.storage];if(!folder)throw Error('Choose the phone or SD-card folder first.');
  if(nativeUI215())await ReceiptNative214.checkDirectory(folder);
  else {const handle=await browserFolder215();if(!handle||await handle.queryPermission({mode:'readwrite'})!=='granted')throw Error('Choose this folder again to restore permission.');}
 }
}
function idParts223(type,label){
 const text=type==='journal'?idKey221(label):String(label).trim(),main=(type==='journal'?/^(OJM\d{2})(\d{4})$/:/^(HR\d{2})(\d{4})$/i).exec(text),parts=main||/^(.*?)(\d+)$/.exec(text);
 if(!parts||parts[2].length>12)throw Error('Use an ID ending in a number.');return {prefix:parts[1],number:BigInt(parts[2]),width:parts[2].length,text};
}
function editedGroups223(form){
 const groups=structuredClone(draft.groups),at=groups.findIndex(g=>g.id===form.groupID);if(at<0)throw Error('That entry is no longer in this batch.');
 const old=groups[at],changed=[];let label=form.label.trim();if(!label||label.length>120||/[\x00-\x1f]/.test(label))throw Error('Enter an entry ID or document name.');
 if(form.type!=='support')label=idParts223(form.type,label).text;
 if(old.type===form.type&&form.type!=='support'&&old.label!==label){
  const before=idParts223(old.type,old.label),after=idParts223(form.type,label);
  for(let i=at;i<groups.length;i++){
   const g=groups[i];if(g.type!==old.type)continue;let p;try{p=idParts223(g.type,g.label);}catch{continue;}if(p.prefix!==before.prefix)continue;
   const number=after.number+p.number-before.number;if(number<0n||String(number).length>after.width)throw Error('The adjusted IDs exceed this numbering range.');
   changed.push(g.id);g.label=after.prefix+String(number).padStart(after.width,'0');
  }
 }else if(old.label!==label||old.type!==form.type)changed.push(old.id);
 groups[at].label=label;groups[at].type=form.type;
 const labels=new Set();for(const g of groups){const key=g.type==='journal'?idKey221(g.label):g.label;if(labels.has(key))throw Error('The adjusted IDs would duplicate '+g.label+' in this batch. Choose another starting ID.');labels.add(key);}
 return {groups,changed};
}
async function editIDs223(form){
 const update=editedGroups223(form),previous=structuredClone(draft),checks={...draft.idChecks215};
 for(const id of update.changed){const old=draft.groups.find(g=>g.id===id),next=update.groups.find(g=>g.id===id);delete checks[old.label];delete checks[next.label];}
 draft.groups=update.groups;draft.idChecks215=checks;draft.title=form.title.replace(/\.pdf$/i,'');draft.outputName=draft.title+'.pdf';draft.month=form.month;
 for(const type of ['journal','hr']){const last=[...draft.groups].reverse().find(g=>g.type===type);if(last)draft.next[type]=nextLabel215(type,last.label);}
 try{await persist();}catch(e){draft=previous;throw e;}
 delete settings.pendingSetup215;await rememberIDs215();closeDialog();render();status(update.changed.length>1?update.changed.length+' IDs updated. Next/Skip gaps kept; all IDs will be checked when saving.':'Entry updated. Its ID will be checked when saving.');
}
async function idProblem223(row,groupID){
 const popup=document.createElement('dialog');popup.className='scan-receipt-choice218';popup.innerHTML=`<h2>Check entry ID</h2><p><strong>${esc(row.label)}</strong></p><p>${esc(row.reason||'This entry is unavailable.')}</p><p>Your scans are kept. Change the ID before saving.</p><div class="scan-setting-list211"><button type="button" class="scan-action primary" data-id-problem223="edit">Change ID</button><button type="button" class="scan-action" data-id-problem223="cancel">Back to batch</button></div>`;
 document.body.append(popup);popup.showModal();paintLoading217(true);let finished=false;
 try{await new Promise((resolve,reject)=>{const choose=mode=>{if(finished)return;finished=true;const e=Error('Save paused. Your scans are kept.');if(mode==='edit')e.editGroup222=groupID;reject(e);};popup.onclick=e=>{const b=e.target.closest('[data-id-problem223]');if(b)choose(b.dataset.idProblem223);};popup.oncancel=e=>{e.preventDefault();choose('cancel');};popup.onclose=()=>choose('cancel');});}
 finally{popup.close();popup.remove();paintLoading217();}
}
async function confirmSetup215(){
 const form=setupValue215();if(!form.title||/[\\/\x00-\x1f]/.test(form.title))throw Error('Enter a PDF name without slashes.');C.monthTitle(form.month);
 if(form.mode==='edit')return editIDs223(form);
 if(draft?.groups.some(g=>g.id!==form.groupID&&g.label===form.label&&draft.pages.some(p=>p.group===g.id)))throw Error('That ID is already in this PDF. Use Add receipts for its existing entry.');
 const checked=await validateIDs215([{type:form.type,label:form.label}]);form.label=checked[0].label;await checkDestination215();
 const previous=draft?structuredClone(draft):null;
 if(!draft){draft=C.create(form.month,form.label,form.type);draft.pending=[];}
 else if(form.groupID){const g=draft.groups.find(g=>g.id===form.groupID);g.type=form.type;g.label=form.label;draft.active=g.id;}
 else {const empty=draft.groups.find(g=>!draft.pages.some(p=>p.group===g.id)&&!draft.pending.some(p=>p.group===g.id));if(empty){empty.type=form.type;empty.label=form.label;draft.active=empty.id;}else C.addGroup(draft,form.type,form.label);}
 draft.workflow215=true;draft.configured215=true;if(form.mode!=='skip'){draft.title=form.title.replace(/\.pdf$/i,'');draft.outputName=draft.title+'.pdf';draft.month=form.month;draft.folder=settings.folder||{id:'root',name:'My Drive'};}
 draft.next[form.type]=nextLabel215(form.type,form.label);draft.idChecks215={...draft.idChecks215,[form.label]:checked[0]};
 try{await persist();}catch(e){draft=previous;throw e;}
 delete settings.pendingSetup215;await store('settings',settings);closeDialog();render();
 if(form.mode==='edit'){await rememberIDs215();return;}
 return openCamera209(true);
}
function renderBatch215(){
 const groups=C.plan(draft),current=draft.groups.find(g=>g.id===draft.active);
 main.innerHTML=`<section class="scan-card"><div class="scan-group-title"><h1>${esc(draft.title)}</h1>${btn('batch-edit215','Rename')}</div><p>${draft.pages.length} pages · ${groups.length} entries · One PDF per entry ID</p><div class="scan-path215"><span>${esc(destinationName215())}</span>${btn('destination215','Destination')}</div>${draft.completed215===draft.revision?'<p class="available215">Saved and linked to Accounting.</p>':''}<div class="scan-actions scan-draft-actions220">${deleteDraftButton220(draftSummary(draft))}</div></section>${groups.map(g=>`<section class="scan-card scan-group ${g.id===draft.active?'active':''}"><div class="scan-group-title"><div><strong>${esc(g.label)}</strong><small> · ${typeName215(g.type)}</small></div><button class="scan-action" data-scan="edit-id215" data-group="${g.id}">Edit ID</button></div><div class="scan-pages">${g.pages.map(p=>`<div class="scan-page"><button data-scan="preview215" data-page="${p.id}"><img src="${p.thumb}" alt="${esc(p.label)}" loading="lazy"></button><small>${esc(p.label)}</small></div>`).join('')}</div><div class="scan-actions"><button class="scan-action" data-scan="select-id215" data-group="${g.id}">${g.id===draft.active?'Selected':'Select ID'}</button><button class="scan-action" data-scan="group-up" data-group="${g.id}">Move up</button><button class="scan-action" data-scan="group-down" data-group="${g.id}">Move down</button></div></section>`).join('')}${!draft.pages.length?'<p class="scan-empty211">Ready for '+esc(current?.label||'your first entry')+'</p>':''}<div class="scan-capture scan-actions215"><small>Current ID: ${esc(current?.label||'')}</small><div>${btn('add-receipts215','Add receipts')}${btn('next-id215','Next ID')}${btn('skip-id215','Skip ID')}${fileListButton()}${btn('save-pdf215',groups.length>1?'Save PDFs by entry ID':'Save PDF','primary')}</div></div>`;
}
async function nextEntry215(skip=false){
 const current=draft.groups.find(g=>g.id===draft.active);let label=nextLabel215(current.type,current.label);
 if(skip)return openSkipID219(current);
 const candidates=[{type:current.type,label}];
 const rows=await validateIDs215(candidates),next=rows.find(r=>r.available&&!draft.groups.some(g=>g.label===r.label));
 if(!next)throw Error(label+' is unavailable. Use Skip ID to choose another ID.');
 if(draft.pages.some(p=>p.group===current.id))C.addGroup(draft,current.type,next.label);else current.label=next.label;
 draft.idChecks215={...draft.idChecks215,[next.label]:next};draft.next[current.type]=nextLabel215(current.type,next.label);await persist();return openCamera209(true);
}
async function destinationPanel215(){
 destination215=true;dialog=destinationDialog;
 const names={drive:'Google Drive',local:'Phone storage',sd:'SD card'};
 open('Save destination',`<div class="scan-locations216">${Object.entries(names).map(([mode,name])=>`<button type="button" class="scan-location216" data-scan="provider-${mode}215"><strong>${name}</strong><small>${esc(mode==='drive'?drivePath(draft?.folder||settings.folder):localFolderPath(mode))}</small></button>`).join('')}</div>${btn('check-drive-access','Check Drive connection')}<p data-drive-check role="status"></p>`);
}
async function checkCompanyDrive() {
 const result = destinationDialog.querySelector('[data-drive-check]');
 result.textContent = 'Checking the company receipt folder…';
 try {
  const live = await connection();
  const destination = live.companyDefaultFolder || live.companyDestination228;
  if (!destination || !live.companyManaged228 || !live.connected)
   throw Error('The company receipt folder needs an administrator to connect it in Accounting Settings.');
  const folder = await api('folder',{id:destination.id});
  if (folder.id !== destination.id || !folder.capabilities?.canAddChildren)
   throw Error('The company account cannot add files to its receipt folder. Check the folder permissions in Drive.');
  valid();
  result.textContent = live.email + ' can save scans to ' + folder.name + '.';
 } catch (e) {
  result.textContent = e.message;
 }
}
function driveFolder216(r){
 const current=r.parent,locked=r.locked??(driveState.companyManaged228 && !driveState.canChooseCompanyFolder);
 const trail=r.trail?.length?r.trail:[{id:current.id,name:current.name}];
 const crumbs=trail.map((part,i)=>i===trail.length-1?'<strong aria-current="location">'+esc(part.name)+'</strong>':
  !locked && part.id?'<button type="button" data-scan="folder-open" data-folder="'+esc(part.id)+'">'+esc(part.name)+'</button>':'<span>'+esc(part.name)+'</span>').join('<span aria-hidden="true">›</span>');
 const rows=folders.items.map(f=>`<button type="button" class="scan-drive-folder216" data-scan="folder-open" data-folder="${esc(f.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h7l2 3h9v13H3z"/></svg><span>${esc(f.name)}</span><span aria-hidden="true">›</span></button>`).join('');
 const folderURL='https://drive.google.com/drive/folders/'+encodeURIComponent(current.id);
 const navigation=!locked && !trail.some(part=>part.name==='My Drive')?btn('folder-root','My Drive'):'';
 const create=!locked && current.capabilities?.canAddChildren?
  '<details class="scan-create-folder"><summary>New folder</summary><label>Folder name<input id="scanNewFolder" maxlength="180" autocomplete="off"></label>'+btn('folder-create-here','Create folder')+'</details>':'';
 const otherTools=!locked && !driveState.companyManaged228?'<details><summary>Account options</summary>'+btn('connect','Switch account')+'</details>':'';
 open('Choose a Drive folder',`<div class="scan-folder-picker"><small class="scan-picker-account">${esc(driveState.email)}</small><section class="scan-picker-path"><small>${driveState.annual231?'Receipt folder by accounting year':'Current folder'}</small><nav aria-label="Current folder path">${crumbs}</nav>${driveState.annual231?'<small>The PDF goes into the year of its accounting entry.</small>':''}<a href="${esc(folderURL)}" target="_blank" rel="noopener noreferrer">Open in Google Drive</a></section>${navigation}${create}${locked?'':`<div class="scan-drive-folders216">${rows||'<p>No subfolders here.</p>'}</div>`}${folders.next?btn('folder-more','Show more folders'):''}${otherTools}<div class="scan-picker-confirm">${current.capabilities?.canAddChildren?btn('folder-select','Use this folder','primary'):'<small>This folder is read-only.</small>'}${btn('locations215','Back')}</div></div>`);
 status('');
}
async function browserFolder215(value){
 const database=await new Promise((resolve,reject)=>{const r=indexedDB.open('ojm-scan-folders215',1);r.onupgradeneeded=()=>r.result.createObjectStore('folders');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const key=scope+':'+owner+':'+settings.storage;
 return new Promise((resolve,reject)=>{const t=database.transaction('folders',value?'readwrite':'readonly'),r=value?t.objectStore('folders').put(value,key):t.objectStore('folders').get(key);let result;r.onsuccess=()=>result=r.result;t.oncomplete=()=>{database.close();resolve(result);};t.onerror=()=>reject(t.error);});
}
async function browse215(previousStorage=settings.storage){
 if(storageMode()==='drive'){
  await connection();
  if(!driveState.connected){settings.resumeFolder216=true;await store('settings',settings);return action('connect',null);}
  return chooseFolder(draft?.folder?.id||settings.folder?.id||'root');
 }
 let selected;
 if(nativeUI215())selected=await ReceiptNative214.pickDirectory({...settings.localFolders215?.[settings.storage],kind:settings.storage});
 else if(window.showDirectoryPicker){try{const handle=await window.showDirectoryPicker({id:'oonjai-'+settings.storage,mode:'readwrite',...(await browserFolder215()?{startIn:await browserFolder215()}: {})});await browserFolder215(handle);selected={name:handle.name,browser:true};}catch(e){if(e.name!=='AbortError')throw e;selected={cancelled:true};}}
 else throw Error('Choose phone and SD-card folders in the Android app. This browser does not support folder access.');
 if(selected.cancelled){await setStorage(previousStorage);return destinationPanel215();}
 settings.localFolders215||={};settings.localFolders215[settings.storage]=selected;await store('settings',settings);
 return action215('destination-done215',null);
}
async function saveBatch215(){
 if(!draft?.pages.length)throw Error('Scan at least one receipt.');
 // An ID conflict can be cancelled before the batch is separated or any file is written.
 if(C.plan(draft).length>1){
  const groups=C.plan(draft);
  let checked;
  try{checked=await validateIDs215(groups.map(g=>({id:g.id,type:g.type,label:g.label})),true);}
  catch(e){if(e.editGroup222)return openSetup215('edit',e.editGroup222);throw e;}
  draft.idChecks215=Object.fromEntries(checked.map(row=>[row.label,row]));
 }
 await prepareEntryFiles();
 if(familyMembers().length===1)return saveOneEntry();
 return saveEntryFiles(familyMembers());
}
async function saveOneEntry(){
 if(!draft?.pages.length)throw Error('Scan at least one receipt.');
 draft.workflow215=true;const groups=C.plan(draft);let checks;try{checks=await validateIDs215(groups.map(g=>({id:g.id,type:g.type,label:g.label})),true);}catch(e){if(e.editGroup222){draft.active=e.editGroup222;await persist(false);render();await openSetup215('edit',e.editGroup222);throw Error('Update the entry ID before saving.');}throw e;}draft.idChecks215=Object.fromEntries(checks.map(r=>[r.label,r]));await persist(false);await checkDestination215();
 const r=await pdf();draft.outputName=draft.outputName||draft.title+'.pdf';
 if(storageMode()==='drive')await upload(false,true);
 else{
  const file=new File([r.blob],draft.outputName,{type:'application/pdf'}),folder=settings.localFolders215[settings.storage];let saved;
  if(nativeUI215())saved=await ReceiptNative214.savePDF(file,folder,r.sha);
  else{const directory=await browserFolder215(),handle=await directory.getFileHandle(file.name,{create:true}),existing=await handle.getFile();if(existing.size&&await ReceiptLinks208.digest(existing)!==r.sha)throw Error('That filename already exists. Rename the PDF first.');const writer=await handle.createWritable();try{await writer.write(file);await writer.close();}catch(e){await writer.abort().catch(()=>{});throw e;}if(await ReceiptLinks208.digest(await handle.getFile())!==r.sha)throw Error('The local PDF did not pass verification.');saved={verified:true,name:file.name};}
  valid();if(!saved.verified)throw Error('The destination has not confirmed the PDF.');draft.localDestination=destinationName215();draft.localExport={...saved,name:file.name,revision:draft.revision,verified:true};await persist(false);await linkSaved208(r,true);
 }
 if(draft.links208?.status!=='linked')throw Error('The PDF is saved, but Accounting links are pending. '+(draft.links208?.message||'Tap Save PDF to retry linking.'));
 draft.completed215=draft.revision;await rememberIDs215();await persist(false);render();status('PDF saved and linked to the confirmed IDs.');
}
async function action215(name,b){
 if(name==='setup215')return openSetup215();
 if(name==='setup-confirm215')return confirmSetup215();
 if(name==='batch-view215'){closeDialog();return render();}
 if(name==='edit-id215'||name==='batch-edit215')return openSetup215('edit',b?.dataset.group||draft.active);
 if(name==='select-id215'){draft.active=b.dataset.group;await persist(false);return render();}
 if(name==='preview215'){const page=await store('page:'+b.dataset.page);dialog=primaryDialog;open('Scanned receipt',`<img class="scan-preview" src="${page.data}" alt="Scanned receipt">${btn('batch-view215','Done','primary')}`);return;}
 if(name==='add-receipts215')return openCamera209();
 if(name==='next-id215'||name==='skip-id215')return nextEntry215(name==='skip-id215');
 if(name==='save-pdf215')return saveBatch215();
 if(name==='destination215'){if($('setupID215'))await keepSetup215();return destinationPanel215();}
 if(name==='locations215')return destinationPanel215();
 if(name==='provider-drive215'){
  await connection();
  if(!driveState.connected){settings.resumeFolder216=true;await store('settings',settings);return action('connect',null);}
  return chooseFolder(driveState.companyManaged228 && !driveState.canChooseCompanyFolder ? driveState.companyDestination228?.id||'root' : 'root');
 }
 if(/^provider-(local|sd)215$/.test(name)){const previous=settings.storage;await setStorage(name.slice(9,-3));try{return await browse215(previous);}catch(e){await setStorage(previous);await destinationPanel215();throw e;}}
 if(name==='browse215')return browse215();
 if(name==='create-folder215'){
  if(storageMode()==='drive'){await chooseFolder(settings.folder?.id||'root');return action('folder-new',null);}
  const name=prompt('New folder name')?.trim();if(!name)return;const folder=settings.localFolders215?.[settings.storage];if(!folder)throw Error('Choose the parent folder first.');let made;
  if(nativeUI215())made=await ReceiptNative214.createDirectory(folder,name);else{const parent=await browserFolder215(),child=await parent.getDirectoryHandle(name,{create:true});await browserFolder215(child);made={name:parent.name+' / '+child.name,browser:true};}
  settings.localFolders215[settings.storage]=made;await store('settings',settings);return destinationPanel215();
 }
 if(name==='destination-done215'){closeDialog();destination215=false;if($('setupPath215'))$('setupPath215').textContent=destinationName215();else if($('pdfName') && draft)await review(true);else render();return;}
}
async function action(name,b){valid();
 if(name==='check-drive-access')return checkCompanyDrive();
 if(name==='entry-files'){await prepareEntryFiles();return showEntryFiles();}
 if(name==='save-entry-file'){await selectEntryFile(b.dataset.draft);closeDialog();return saveOneEntry();}
 if(name==='review-entry-file'){await selectEntryFile(b.dataset.draft);render();if(nativeUI215()){closeDialog();return;}return review(true);}
 if(name==='save-entry-files'){await prepareEntryFiles();return saveEntryFiles(familyMembers());}
 if(name.endsWith('215'))return action215(name,b);
 if(name==='close'&&destination215&&dialog===destinationDialog)return action215('destination-done215',b);
 if(name==='entry-settings211'){dialog=destinationDialog;const g=draft.groups.find(g=>g.id===(editing?.group||draft.active));open('Entry IDs',`<label>Current group<select id="entryType211"><option value="journal" ${g.type==='journal'?'selected':''}>Journal entry</option><option value="hr" ${g.type==='hr'?'selected':''}>HR document</option><option value="support" ${g.type==='support'?'selected':''}>Named receipts</option></select></label><label>Name / starting ID<input id="entryLabel211" value="${esc(g.label)}" maxlength="120"></label><small>Names scans only. Journal numbers are assigned in Accounting.</small><div class="scan-actions">${btn('entry-settings-save211','Apply','primary')}</div>`);return;}
 if(name==='entry-settings-save211'){const g=draft.groups.find(g=>g.id===(editing?.group||draft.active)),type=$('entryType211').value,label=$('entryLabel211').value.trim();if(!label)throw Error('Enter the name or starting entry ID.');if(draft.groups.some(x=>x.id!==g.id&&x.label===label))throw Error('That entry name is already in this batch.');const next=type!=='support'?C.nextID(label):null,previous=structuredClone(draft);g.type=type;g.label=label;if(next)draft.next[type]=next;try{await persist();}catch(e){draft=previous;throw e;}closeDialog();render();const title=primaryDialog.querySelector('.scan-flow-head211 small');if(title)title.textContent=entryLabel211();return;}
 if(name==='scanner-options211')return scannerOptions211();
 if(name==='page-options211'){dialog=destinationDialog;return pageOptions211(b.dataset.page);}
 if(name==='group-options211'){dialog=destinationDialog;const g=draft.groups.find(g=>g.id===b.dataset.group);open(g.label,`<div class="scan-setting-list211">${btn('rename-group','Rename entry').replace('data-scan=',`data-group="${g.id}" data-scan=`)}${btn('group-up','Move earlier').replace('data-scan=',`data-group="${g.id}" data-scan=`)}${btn('group-down','Move later').replace('data-scan=',`data-group="${g.id}" data-scan=`)}${btn('jump','Skip / jump to entry')}</div>`);return;}
 if(name==='keep-next-receipt211')return acceptPage('camera');if(name==='keep-next-entry211')return acceptPage('next-entry');if(name==='keep-save211')return acceptPage('save');
 if(name==='retake-scan211')return retake211();if(name==='delete-current211')return deleteCurrent211();
 if(name==='retake-page211'){const page=await store('page:'+b.dataset.page),pending=await queueOriginal(page.original,b.dataset.page,draft.pages.find(p=>p.id===b.dataset.page).group,{nativeProcessed:!!page.nativeProcessed,automatic:page.automatic,corners:page.corners});retakeTarget211=pending;return openCamera209();}
 if(name==='back-preview211'){if(editing.beforeAdjust211){Object.assign(editing,editing.beforeAdjust211);editing.source=await C.sourceCanvas(editing.original,editing.rotate);}return cropPreview();}if(name==='toggle-gray211'){editing.gray=!editing.gray;return manualCrop211();}
if(name==='link-accounting208'||name==='link-local208')return linkSaved208(null,name==='link-local208'||draft.links208?.provider==='supabase');if(name==='close'){if(dialog===destinationDialog){closeDialog();if($('pdfName'))return review();return;}captureLoop209=false;retakeTarget211=null;if(editing)return pauseReview();closeDialog();return;}if(name==='settings'||name==='save-destination')return destinationShortcut();if(name==='drafts')return showDrafts();if(name==='resume-pending')return nextPhoto();if(name==='resume-photo')return resumePhoto(b.dataset.pending);if(name==='resume-draft')return resumeDraft(b.dataset.draft);if(name==='protect-imports'){await protectImports();return nextPhoto();}if(name==='start'){const month=$('startMonth').value,kind=$('startKind').value,label=$('startID').value.trim();draft=C.create(month,label,kind);draft.pending=[];draft.folder=settings.folder||{id:'root',name:'My Drive'};await persist();render();if(quickCapture209)return openCamera209();return;}
 if(name==='camera')return draft?.configured215?openCamera209():openSetup215();if(name==='capture-photo209')return capturePhoto209();if(name==='camera-review209'){captureLoop209=false;retakeTarget211=null;closeDialog();render();return;}if(name==='native-camera209'){if(dialog===destinationDialog)closeDialog();$('scanCamera').click();return;}if(name==='import'){if(dialog===destinationDialog)closeDialog();captureLoop209=true;$('scanImport').click();return;}
 if(name==='connect'){if(destination215){settings.resumeFolder216=true;await store('settings',settings);}await checkpointEditing();if(cameraQueue.length)await protectImports();await setStorage('drive');await saveChain;const r=await api('connect',{native214:!!window.ReceiptNative214?.available,native215:window.ReceiptNative214?.preview215===true});if(window.ReceiptNative214?.available){await ReceiptNative214.openConnection(r.authorization_url);return;}location.assign(r.authorization_url);return;}
 if(name==='disconnect'){if(!confirm('Disconnect this scanner from '+driveState.email+'? Existing Drive files remain unchanged.'))return;await api('disconnect');driveState={connected:false};await scannerSettings();return;}
 if(name==='move-saved'){movingSaved=true;return chooseFolder(draft.folder.id);}if(name==='destination'){movingSaved=false;return chooseFolder(draft?.folder?.id||settings.folder?.id||'root');}if(name==='folder-root')return chooseFolder('root');if(name==='folder-up')return chooseFolder(folders.parent.parents[0]);if(name==='folder-open')return chooseFolder(b.dataset.folder);if(name==='folder-more')return chooseFolder(folders.parent.id,true);if(name==='folder-link')return chooseFolder(C.folderID($('folderLink').value));
 if(name==='folder-create-here'){
  const input=$('scanNewFolder'),name=input?.value.trim();
  if(!name){input?.focus();throw Error('Enter the new folder name.');}
  const folder=await api('create-folder',{parent:folders.parent.id,name});
  return chooseFolder(folder.id);
 }
 if(name==='folder-new'){const name=prompt('New folder name');if(!name?.trim())return;await api('create-folder',{parent:folders.parent.id,name});return chooseFolder(folders.parent.id);}
 if(name==='folder-rename'){const name=prompt('Rename this folder',folders.parent.name);if(!name?.trim()||name===folders.parent.name)return;await api('rename-folder',{id:folders.parent.id,name});return chooseFolder(folders.parent.id);}
 if(name==='folder-select'){const f={id:folders.parent.id,name:folders.parent.name,path:folders.parent.path||folders.parent.name};if(destination215){await setStorage('drive');settings.folder=f;settings.driveFolders215||={};if(driveState.email)settings.driveFolders215[driveState.email]=f;await store('settings',settings);if(draft){if(draft.folder?.id!==f.id){draft.file=null;draft.upload=null;}draft.folder=f;await persist(false);}return action215('destination-done215',null);}if(movingSaved){movingSaved=false;if(!confirm('Move the saved PDF to '+f.name+'?'))return;const moved=await api('move-file',{id:draft.file.id,scan:draft.id,parent:f.id,version:draft.file.version});draft.file.version=moved.version;draft.folder=f;await persist(false);closeDialog();render();status('Saved PDF moved to '+f.name+'.');return;}settings.folder=f;await store('settings',settings);if(draft){if(draft.folder?.id!==f.id){draft.folder=f;draft.file=null;draft.upload=null;}await persist(false);render();}closeDialog();status('Destination: '+driveState.email+' / '+f.name);if($('pdfName'))return review();return;}
 if(name==='group'||name==='jump')return groupDialog(name==='jump');if(name==='group-confirm'){const type=$('newType').value,label=$('newLabel').value;const empty=draft.groups.find(g=>g.id===draft.active&&!draft.pages.some(p=>p.group===g.id)&&!draft.pending?.some(p=>p.group===g.id));C.addGroup(draft,type,label);if(empty)draft.groups=draft.groups.filter(g=>g.id!==empty.id);await persist();closeDialog();return render();}
 if(name==='next'){const current=draft.groups.find(g=>g.id===draft.active);if(!draft.pages.some(p=>p.group===current.id))throw Error('Scan a receipt for this entry first.');await advanceGroup211();return openCamera209();}
 if(name==='rename-group'){const g=draft.groups.find(g=>g.id===b.dataset.group),label=prompt('Group name / entry ID',g.label)?.trim();if(!label||label===g.label)return;if(draft.groups.some(x=>x!==g&&x.label===label))throw Error('That group already exists.');if(g.type!=='support')C.nextID(label);g.label=label;await persist();return render();}
 if(name==='group-up'||name==='group-down'){const i=draft.groups.findIndex(g=>g.id===b.dataset.group),j=i+(name==='group-up'?-1:1);if(j<0||j>=draft.groups.length)return;[draft.groups[i],draft.groups[j]]=[draft.groups[j],draft.groups[i]];await persist();return render();}
 if(name==='page-up'||name==='page-down'){const p=draft.pages.find(p=>p.id===b.dataset.page),same=draft.pages.filter(x=>x.group===p.group),i=same.indexOf(p),other=same[i+(name==='page-up'?-1:1)];if(!other)return;const a=draft.pages.indexOf(p),z=draft.pages.indexOf(other);[draft.pages[a],draft.pages[z]]=[draft.pages[z],draft.pages[a]];await persist();return render();}
 if(name==='page')return openPage(b.dataset.page);if(name==='recrop'){const page=await store('page:'+b.dataset.page),meta=draft.pages.find(p=>p.id===b.dataset.page),pending=await queueOriginal(page.original,b.dataset.page,meta.group,{corners:page.corners,rotate:page.rotate||0,gray:!!page.gray,automatic:page.automatic});return editPage(page.original,b.dataset.page,pending,true);}
 if(name==='delete-page'){if(!confirm('Delete this scan?'))return;const id=b.dataset.page,previous=structuredClone(draft);draft.pages=draft.pages.filter(p=>p.id!==id);try{await persist(true,[],['page:'+id]);}catch(e){draft=previous;throw e;}closeDialog();return render();}
 if(name==='move-page'){draft.pages.find(p=>p.id===b.dataset.page).group=$('moveGroup').value;await persist();closeDialog();return render();}
 if(name==='split'){C.split(draft,b.dataset.page,'journal',$('splitID').value);await persist();closeDialog();return render();}
 if(name==='auto-crop'){const found=await C.detectDocument(editing.source);editing.corners=found.corners;editing.automatic=found.automatic;drawCrop();return checkpointEditing();}if(name==='full-crop'){editing.automatic=false;editing.corners=[[0,0],[1,0],[1,1],[0,1]];drawCrop();return checkpointEditing();}if(name==='rotate'){editing.rotate=(editing.rotate+90)%360;editing.source=await C.sourceCanvas(editing.original,editing.rotate);const found=await C.detectDocument(editing.source);editing.corners=found.corners;editing.automatic=found.automatic;drawCrop();return checkpointEditing();}
 if(name==='crop-preview')return cropPreview();if(name==='accept-page')return acceptPage();if(name==='cancel-image')return pauseReview();if(name==='back-crop'){editing.beforeAdjust211={corners:structuredClone(editing.corners),rotate:editing.rotate,gray:editing.gray,automatic:editing.automatic,nativeProcessed:!!editing.nativeProcessed,stage:editing.stage,result:editing.result};return manualCrop211();}
 if(name==='zoom-scan'){const i=$('finalScan');const fit=i.classList.toggle('scan-preview');i.style.width=fit?'':'auto';i.style.maxWidth=fit?'':'none';i.style.maxHeight=fit?'':'none';return;}
 if(name==='local-save')return localExport();if(name==='local-download')return localExport('download');if(name==='local-share')return localExport('share');if(name==='local-review')return download();if(name==='review')return review();if(name==='download')return download();if(name==='upload'||name==='save-new')return upload(name==='save-new');
 if(name==='batch'){open('Batch settings',`<label>PDF title<input id="batchTitle" value="${esc(draft.title)}" maxlength="170"></label><label>Document month<input type="month" id="batchMonth" value="${draft.month}"></label><div class="scan-actions">${btn('batch-save','Save title / month','primary')}${btn('new-batch','Start another batch')}</div><p>Starting another batch keeps this one in Unsaved scans. You can resume it later.</p>`);return;}
 if(name==='batch-save'){const title=$('batchTitle').value.trim(),month=$('batchMonth').value;if(!title)throw Error('Enter a PDF title.');C.monthTitle(month);draft.title=title;draft.month=month;await persist();closeDialog();return render();}
 if(name==='new-batch'){captureLoop209=false;retakeTarget211=null;if(cameraQueue.length)await protectImports();await checkpointEditing();await persist(false);await store('current',null);draft=null;editing=null;pdfCache=null;closeDialog();return render();}
 if(name==='discard-photo'){if(!confirm('Permanently discard this unreviewed photo from this device?'))return;const key=b.dataset.pending,previous=structuredClone(draft);draft.pending=draft.pending.filter(p=>p.key!==key);try{await persist(false,[],['pending:'+key]);}catch(e){draft=previous;throw e;}render();return showDrafts();}
 if(name==='discard-draft')return discardDraft220(b.dataset.draft);

}
let cameraPaused213=false,cameraResumeTimer213=null;
function cameraVisibility213(){
 if(cameraResumeTimer213!==null){clearTimeout(cameraResumeTimer213);cameraResumeTimer213=null;}
 if(document.visibilityState==='hidden'){
  cameraPaused213 ||= !!($('scanLive209')&&primaryDialog.open&&!frozen);
  ReceiptCamera209.stop();
  if(editing)void checkpointEditing().catch(dialogError);
  else if($('scanLive209')){captureLoop209=false;primaryDialog.close();render();status('Camera paused.');}
 }else if(cameraPaused213&&!frozen){
  if(busy){cameraResumeTimer213=setTimeout(cameraVisibility213,100);return;}
  cameraPaused213=false;void run(openCamera209);
 }
}
const loadingJobs217=new Map();let loadingSerial217=0;
function paintLoading217(suspend=false){
 document.querySelectorAll('.scan-wait217').forEach(n=>n.remove());
 const job=suspend||document.querySelector('.scan-receipt-choice218[open]')?null:[...loadingJobs217.values()].reverse().find(j=>j.visible);for(const host of [main,primaryDialog,destinationDialog]){if(job)host.setAttribute('aria-busy','true');else host.removeAttribute('aria-busy');}
 if(!job||frozen)return;const n=document.createElement('div');n.className='scan-wait217';n.setAttribute('role','status');n.setAttribute('aria-live','polite');const spinner=document.createElement('span');spinner.className='scan-spinner217';spinner.setAttribute('aria-hidden','true');n.append(spinner,document.createTextNode(job.label));(destinationDialog.open?destinationDialog:primaryDialog.open?primaryDialog:document.body).prepend(n);
}
async function loading217(fn,label='Loading…'){
 const id=++loadingSerial217,job={label,visible:false};loadingJobs217.set(id,job);const timer=setTimeout(()=>{job.visible=true;paintLoading217();},300);
 try{return await fn();}finally{clearTimeout(timer);loadingJobs217.delete(id);paintLoading217();}
}
async function run(fn,label,button){if(busy||frozen){paintLoading217();return;}busy=true;const original=button?.innerHTML;if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent=label||'Loading…';}try{await loading217(fn,label);}catch(e){dialogError(e);}finally{busy=false;if(button?.isConnected){button.disabled=false;button.removeAttribute('aria-busy');button.innerHTML=original;}}}
const actionLoading217=name=>name==='folder-new'?'Creating folder…':/folder|provider|destination|browse/.test(name)?'Opening destination…':name==='connect'?'Connecting to Google Drive…':/save|upload/.test(name)?'Saving…':'Loading…';
document.addEventListener('click',e=>{const b=e.target.closest('[data-scan]');if(!b)return;e.preventDefault();void run(()=>action(b.dataset.scan,b),actionLoading217(b.dataset.scan),b);});for(const id of ['scanCamera','scanImport'])$(id).onchange=e=>run(async()=>{valid();cameraQueue.push(...Array.from(e.target.files||[]).map((file,i)=>({file,group:retakeTarget211?.group||draft.active,replace:i===0?retakeTarget211?.key:null})));e.target.value='';await protectImports();await nextPhoto();});for(const d of [primaryDialog,destinationDialog])d.addEventListener('cancel',e=>{e.preventDefault();if(!busy)void run(()=>action('close',null));});document.addEventListener('visibilitychange',cameraVisibility213);window.addEventListener('beforeunload',e=>{if(cameraQueue.length){e.preventDefault();e.returnValue='';}});
window.addEventListener('offline',()=>status('Offline: scans stay on this device. Upload when connected.'));window.addEventListener('online',()=>status('Connection available. Pending scans can be uploaded.'));
try{await deviceVault14334.ready;db=supabase.createClient(scope,OJM_SUPABASE_ANON_KEY,{auth:{autoRefreshToken:false,detectSessionInUrl:false}});await deviceVault14334.attach(db);let s;try{s=await db.auth.getSession();if(s.error)throw s.error;}catch(e){if([400,401,403].includes(Number(e.status))||/invalid.*token|revoked|refresh_token_not_found/i.test(e.code+' '+e.message))throw e;const cached=deviceVault14334.readSession?.();if(!cached?.refresh_token||cached.user?.id!==deviceVault14334.actor)throw e;s={data:{session:cached}};}owner=s.data.session?.user?.id||'';valid();settings=await store('settings')||settings;idCache221=await store('id-suggestions221')||[];draftIndex=await store('draft-list')||[];draft=await store('current')||null;if(draft){draft.pending||=[];await persist(false);}render();status('Ready. Readability comes first; review each scan before keeping it.');const params=new URL(location.href).searchParams,error=params.get('connection_error'),showSettings=params.get('settings')==='1';history.replaceState(null,'',location.pathname);if(error)status(error,true);if(window.ReceiptNative214?.available&&await ReceiptNative214.recover()){await ensureDraft211();await nativeScan214(true);}else if(showSettings){if(settings.pendingSetup215)await openSetup215();else await destinationPanel215();if(settings.resumeFolder216&&!error){delete settings.resumeFolder216;await store('settings',settings);destination215=true;dialog=destinationDialog;try{await loading217(()=>chooseFolder(settings.folder?.id||'root'),'Opening Drive folders…');}catch(e){await destinationPanel215();status(e.message,true);}}}else if(quickCapture209){if(draft?.pending.length)await nextPhoto();else await openSetup215();}if(storageMode()==='drive')void connection().then(()=>{if(!dialog.open)render();else if($('settingsStorage'))scannerSettings();}).catch(e=>status('Drive is unavailable. You can still scan and save locally.',false));setInterval(()=>{try{valid();}catch{lockUI();}},1000);}catch(e){lockUI();status(e.message,true);}
window.ReceiptScanner202={version:'143.367',get state(){return {owner,draft,busy,driveState,draftIndex};}};
})();
