/* Receipt Drive settings */
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
 // AI inbox recovery can contain an old settings snapshot. Always display a fresh destination.
 if(load){const started=generation;active.textContent='Checking the saved upload destination…';void load().then(latest=>{if(!current()||generation!==started)return;cfg=latest;if(!dirty&&!changing){email.value=cfg.accountEmail228||'';folder.value=cfg.receiptDrive228?.folderURL||'';showNext();}showActive();}).catch(e=>{if(current()&&generation===started){active.textContent='The active upload destination could not be checked.';status(e.message||'Could not load saved company Drive settings. Reopen Settings to retry.',true);}});}
}
window.ReceiptDriveSettings228={details,merge,mount};
})();
;
/* Google-held drafts. Journal entries are written only after explicit review and posting. */
(()=>{'use strict';
const HEAD=['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo'];
let sharedSettings=null,sharedOwner='',sharedLoaded=false,linkEditorOwner='';
const completedDrafts=new Set(),archiveJobs=new Map();let archiveQueue=Promise.resolve(),journalRefresh=Promise.resolve();
let backgroundBusy=null,settingsJob=null,lastConnectionCheck=0,lastDraftRead=0,lastCheckedAt='',backgroundError='',connectionStatus=null,panel=null,settingsPanel=null,view='journal',reviewed=new Map(),busy=false,epoch=0;let pendingDraftNotices=[],lastDraftSignature='';const prepared=new Map();let preparation=null,dispositions=new Map(),restoredKey='',observedOwner='';let aiSourceRefs=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identity=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
observedOwner=identity();
const configKey=()=> 'ojm-drive-drafts-v1:'+location.origin+':'+identity();
const current=()=>!!identity()&&!!window.access113?.can('journal','post');
function config(){try{return {...defaults(),...JSON.parse(localStorage.getItem(configKey())||'{}'),...(sharedOwner===identity()?sharedSettings||{}:{})}}catch{return defaults()}}
function context(){if(!current())throw Error('Sign in with journal posting access.');syncSession();return {owner:identity(),db:ojmDb,epoch,sheet:config().sheet};}
function assert(c){if(c.owner!==identity()||c.db!==ojmDb||c.epoch!==epoch||c.sheet!==config().sheet||!current())throw Error('Account or connection changed. Reopen Drive drafts.');}
function online(){if(!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode)throw Error('Connect online before reading or approving Drive drafts.');}
function message(s){for(const host of [panel,settingsPanel,preparation]){const n=host?.querySelector('[data-drive-status]');if(n)n.textContent=s;}}
function disconnect(){queuedSnapshot143173=null;backgroundBusy=null;lastConnectionCheck=0;lastDraftRead=0;lastCheckedAt='';backgroundError='';prepared.clear();dispositions.clear();restoredKey='';renderPreparation();connectionStatus=null;completedDrafts.clear();archiveJobs.clear();reviewed.clear();pendingDraftNotices=[];lastDraftSignature='';aiSourceRefs.clear();window.refreshNotices1443?.();epoch++;panel?.querySelector('[data-drive-list]')?.replaceChildren();message('');showConnection();}
function syncSession(){const owner=identity();if(owner===observedOwner)return false;observedOwner=owner;disconnect();sharedSettings=null;sharedOwner='';sharedLoaded=false;view='journal';showView();renderSettings();return true;}
// Bound reads without retrying financial mutations or allowing late results to change the UI.
async function timed(task,label,ms=20000){
 const controller=new AbortController();let timer;
 try{return await Promise.race([Promise.resolve().then(()=>task(controller.signal)),new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error(label+' timed out. Press Refresh to retry.'));controller.abort();},ms);})]);}
 finally{clearTimeout(timer);}
}
function readQuery(query,label='Draft check'){return timed(signal=>typeof query.abortSignal==='function'?query.abortSignal(signal):query,label);}
async function bridge(action,payload={},endpoint='google-journal-bridge'){
 const c=context();online();
 return timed(async signal=>{const session=await c.db.auth.getSession();assert(c);if(signal.aborted)throw Error('Google connection check timed out.');const token=session.data?.session?.access_token;if(!token)throw Error('Sign in to Accounting first.');
 const response=await fetch('https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/'+endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,...payload}),signal});const result=await response.json();assert(c);if(!response.ok||result.error)throw Error(result.error||'Google connection unavailable');return result;},'Google connection check',35000);
}
async function connect(){if(prepared.size||editorOccupied())throw Error('Finish or save your current journal work before connecting Google.');const r=await bridge('connect',{},'google-oauth-start'),target=new URL(r.authorization_url);if(target.origin!=='https://accounts.google.com')throw Error('Unexpected Google authorization destination');location.assign(target.href);}
async function api(path,options={}){return bridge('request',{sheet:config().sheet,path,method:options.method||'GET',body:options.body?JSON.parse(options.body):undefined});}
function connectionMessage(){
 if(!identity())return 'Sign in to check the saved Google connection.';
 if(!navigator.onLine||window.offline14239?.offline()||window.sessionCache14333?.localMode)return 'Offline · Reconnect and press Refresh drafts to check for new entries.';
 if(backgroundError)return 'Draft check: '+backgroundError;
 if(!connectionStatus)return 'Press Refresh drafts to check Google Sheets.';
 if(!connectionStatus.connected)return 'Connect the company Google account, then press Refresh drafts.';
 const stamp=Date.parse(lastCheckedAt);
 const checked=Number.isFinite(stamp)?' · Last checked '+new Date(stamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';
 return (connectionStatus.email?'Connected as '+connectionStatus.email:'Google Sheets connected')+checked+' · Checks run when you press Refresh drafts.';
}
function showConnection(){
 if(busy)return;
 const text=connectionMessage();
 for(const host of [panel,settingsPanel]){const n=host?.querySelector('[data-connection-status]');if(n)n.textContent=text;}
 if(!lastDraftSignature&&!prepared.size){const list=panel?.querySelector('[data-drive-list]');if(list&&!reviewed.size)list.textContent=connectionStatus?.connected?'Press Refresh drafts to load the latest drafts.':text;}
}
async function checkBackground(){
 // Cached drafts remain available without contacting Google or the database.
 syncSession();if(window.AIInboxSync143173)await AIInboxSync143173.check();showConnection();
}
let queuedSnapshot143173=null,receiving143173=false;
async function receiveInbox143173(snapshot,meta){
 if(busy||receiving143173){queuedSnapshot143173={snapshot,meta};return;}
 if(meta.owner!==identity())return;receiving143173=true;
 try{
 syncSession();if(!sharedLoaded&&liveProfile.role==='admin')await loadSharedSettings();const c=context();if(c.sheet!==meta.sheet)throw Error('Reload Google settings to use the current submission sheet.');
 if(Array.isArray(snapshot.dispositions))dispositions=new Map(snapshot.dispositions.map(d=>[d.draft,d.status]));else await loadDispositions(c);assert(c);if(restoredKey!==preparationKey()){const count=prepared.size;restorePreparation(c);if(prepared.size!==count)renderPreparation();}readLegacySourceRefs(snapshot.rows);const groups=parse(snapshot.rows);
 connectionStatus={connected:true,email:connectionStatus?.email||''};lastCheckedAt=new Date().toISOString();backgroundError='';
 pendingDraftNotices=[...groups].filter(([id])=>!completedDrafts.has(id)&&!dispositions.has(id)).map(([id,rows])=>({noticeId:id,type:'AI Journal draft',title:rows[0].description,detail:rows[0].posting_date,target:'ai-journal'}));window.refreshNotices1443?.();showConnection();
 const list=panel?.querySelector('[data-drive-list]');if(!list)return;
 const entries=[...groups].filter(([id,rows])=>!completedDrafts.has(id)&&!dispositions.has(id)&&!prepared.has(id)&&(reviewed.get(id)?.retry||snapshot.accountHash&&reviewed.get(id)?.accountHash!==snapshot.accountHash||reviewed.get(id)?.rows!==JSON.stringify(rows)));
 const chart=entries.length?(snapshot.accounts||await accounts()):[];assert(c);
 // Preparation is a separate edited copy. Never redraw it during background discovery.
 for(const [id,rows] of entries){if(busy){queuedSnapshot143173={snapshot,meta};break;}let payload,saved,error='',next='',retry=false,stage='receipt';
 try{saved=await receipt(id);assert(c);if(!saved){const prior=await alreadyPostedAiDraft(id);assert(c);if(prior)saved={result:[{entry_no:prior.entry_no,entry_id:prior.id}]};}if(saved){completedDrafts.add(id);void queueArchive(id,saved.result[0].issued_entry_no||saved.result[0].entry_no,c);}else{stage='validation';payload=normalize(rows,chart,settings());stage='preview';next=await previewEntryId(rows[0].posting_date);}}
 catch(e){error=e.message;retry=stage!=='validation';}assert(c);if(busy||prepared.has(id)){queuedSnapshot143173={snapshot,meta};continue;}
 const old=[...list.querySelectorAll('[data-draft]')].find(n=>n.dataset.draft===id);if(saved){old?.remove();reviewed.delete(id);continue;}
 const fragment=document.createDocumentFragment(),card=display(id,rows,payload,error,null,chart,fragment);if(next&&!error)card.querySelector('[data-entry-id]').textContent='Next available: '+next;
 reviewed.set(id,{rows:JSON.stringify(rows),payload,chart,accountHash:snapshot.accountHash,saved,error,retry,next});if(old)old.replaceWith(card);else{if(!list.querySelector('[data-draft]'))list.replaceChildren();list.querySelectorAll('.gpt-empty143129').forEach(n=>n.remove());list.append(card);}
 }
 for(const [id] of reviewed)if(!groups.has(id)||dispositions.has(id)||completedDrafts.has(id)){reviewed.delete(id);[...list.querySelectorAll('[data-draft]')].find(n=>n.dataset.draft===id)?.remove();}
 orderCards250(list,groups);if(!reviewed.size&&!list.querySelector('[data-draft]'))list.innerHTML='<p class="gpt-empty143129">No pending AI Journal drafts.</p>';
 pendingDraftNotices=pendingDraftNotices.filter(n=>!completedDrafts.has(n.noticeId));lastDraftSignature=JSON.stringify([...groups]);lastDraftRead=Date.now();window.refreshNotices1443?.();
 // Keep transient read failures pending; unchanged cached rows still need validation.
 if([...reviewed].some(([id,r])=>r.retry&&!prepared.has(id)))throw Error('Some draft checks could not finish. Press Refresh drafts to retry.');
 }finally{receiving143173=false;void window.AIInboxSync143173?.persist?.();}
}
function cacheInbox143174(){return {pending:!!queuedSnapshot143173||receiving143173||[...reviewed].some(([id,r])=>r.retry&&!prepared.has(id)),reviewed:[...reviewed],completed:[...completedDrafts],dispositions:[...dispositions],notices:pendingDraftNotices,signature:lastDraftSignature,settings:sharedSettings,refs:[...aiSourceRefs]};}
function restoreInbox143174(saved,meta){
 if(!saved||meta.owner!==identity()||!panel)return false;syncSession();sharedSettings={...(saved.settings||{}),sheet:meta.sheet};sharedOwner=meta.owner;sharedLoaded=true;completedDrafts.clear();for(const id of saved.completed||[])completedDrafts.add(id);dispositions=new Map(saved.dispositions||[]);aiSourceRefs=new Map(saved.refs||[]);reviewed=new Map(saved.reviewed||[]);pendingDraftNotices=saved.notices||[];lastDraftSignature=saved.signature||'';
 const list=panel.querySelector('[data-drive-list]'),fragment=document.createDocumentFragment();for(const [id,r]of orderedGroups250(reviewed)){if(completedDrafts.has(id)||dispositions.has(id))continue;const card=display(id,JSON.parse(r.rows),r.payload,r.error||'',null,r.chart||[],fragment);if(r.next){card.querySelector('[data-entry-id]').textContent='Next available: '+r.next;card.querySelector('[data-entry-id]').title='Last checked availability. Final ID is assigned when posted.';}}list.replaceChildren(fragment);if(!list.children.length)list.innerHTML='<p class="gpt-empty143129">No pending AI Journal drafts.</p>';restorePreparation(context());renderPreparation();renderSettings();showConnection();window.refreshNotices1443?.();return !!saved.signature;
}
function drainInbox143173(){const q=queuedSnapshot143173;if(!q||busy||receiving143173)return;queuedSnapshot143173=null;void receiveInbox143173(q.snapshot,q.meta).catch(e=>{backgroundError=e.message;showConnection();});}
async function readDrafts(){const r=await api('/values/'+encodeURIComponent('Drafts!A1:N10002')+'?valueRenderOption=UNFORMATTED_VALUE');if(r.values?.length>10001)throw Error('Draft sheet exceeds 10,000 lines. Archive reviewed rows first.');return r.values||[];}

async function archivePostedDraft(id,number){
 const c=context();const request=async(...args)=>{assert(c);const result=await api(...args);assert(c);return result;};
 if(!number)throw Error('Cannot archive before posting confirmation.');
 const source=await readDrafts(),indices=[];assert(c);
 source.forEach((r,i)=>{if(i>0&&r[0]===id)indices.push(i)});
 if(!indices.length)return;
 const metadata=await request('?fields=sheets.properties'),draft=metadata.sheets.find(x=>x.properties.title==='Drafts'),archive=metadata.sheets.find(x=>x.properties.title==='Posted Archive');
 if(!draft||!archive)throw Error('Drafts or Posted Archive tab missing; no rows removed.');
 const path='/values/'+encodeURIComponent("'Posted Archive'!A1:P10002")+'?valueRenderOption=UNFORMATTED_VALUE';
 const expected=indices.map(i=>[...Array.from({length:14},(_,c)=>source[i][c]??''),'Posted',number]);
 const matching=rows=>rows.filter(r=>r[0]===id).map(r=>Array.from({length:16},(_,i)=>r[i]??''));
 const same=rows=>{const actual=matching(rows).map(r=>JSON.stringify(r)).sort(),wanted=expected.map(r=>JSON.stringify(r)).sort();return JSON.stringify(actual)===JSON.stringify(wanted);};
 const existing=(await request(path)).values||[];
 if(matching(existing).length){
   if(!same(existing))throw Error('Archive content differs from this draft. Draft retained for review.');
 }else{
   await request('/values/'+encodeURIComponent("'Posted Archive'!A:P")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS',{
     method:'POST',body:JSON.stringify({values:expected})
   });
 }
 const archived=(await request(path)).values||[];
 if(!same(archived))throw Error('Archive content not verified. Draft is unchanged.');
 const latest=await readDrafts();assert(c);
 if(JSON.stringify(latest)!==JSON.stringify(source))throw Error('Draft changed during archiving. Retry safely.');
 await request(':batchUpdate',{method:'POST',body:JSON.stringify({requests:indices.reverse().map(i=>({deleteDimension:{range:{sheetId:draft.properties.sheetId,dimension:'ROWS',startIndex:i,endIndex:i+1}}}))})});
}
function queueArchive(id,number,c=context()){
 if(archiveJobs.has(id))return archiveJobs.get(id);
 const job=archiveQueue.catch(()=>{}).then(()=>{assert(c);return archivePostedDraft(id,number);});
 archiveQueue=job;archiveJobs.set(id,job);
 void job.catch(e=>{if(c.owner===identity()&&c.epoch===epoch)message('Posted as '+number+'. Archive pending: '+e.message);}).finally(()=>{if(archiveJobs.get(id)===job)archiveJobs.delete(id);});
 return job;
}
function openActiveJournal(){
 choose('journal');window.switchTab('journal');window.groupedNavigation14378?.render('journal');
 if($('jeSearchInput'))$('jeSearchInput').value='';
 scrollJournal($('tblJournalHistory')?.closest('.je-card'));
}
function refreshPostedJournal(c,number){
 // Serialize refreshes so a slower, older snapshot cannot overwrite the next post.
 journalRefresh=journalRefresh.catch(()=>{}).then(async()=>{assert(c);window.yearWindow14333?.invalidateMemory?.();await loadJournalFromSupabase();assert(c);await availableIds250();if(view==='journal'&&$('journal')?.classList.contains('active'))showCenterStatus('Posted as '+number+'. Active Journal updated.');});
 void journalRefresh.catch(()=>{if(c.owner===identity()&&c.epoch===epoch){message('Posted as '+number+'. Use Sync to refresh Active Journal.');showCenterStatus('Posted as '+number+'. Use Sync to refresh Active Journal; do not post again.',true);}});
}
function readLegacySourceRefs(rows){
 // Preserve old references only for duplicate detection. Never allocate IDs in Sheets.
 aiSourceRefs=new Map();
 for(const row of rows.slice(1)){const id=String(row[0]||''),ref=String(row[13]||'').trim();if(id&&ref){if(aiSourceRefs.has(id)&&aiSourceRefs.get(id)!==ref)throw Error('Conflicting source references for draft.');aiSourceRefs.set(id,ref);}}
}
async function previewEntryId(date){
 const c=context(),policy=settings();
 const r=await readQuery(c.db.rpc('preview_journal_number143114',{p_date:date,p_prefix:policy.prefix,p_digits:policy.digits}),'Entry ID check');assert(c);
 if(r.error)throw r.error;
 const number=Number(r.data);if(!Number.isSafeInteger(number)||number<1)throw Error('Entry ID unavailable.');
 return formatEntryId143114(policy.prefix,number,date,policy.digits);
}
async function availableIds250(){
 if(!panel||view!=='gpt'||!reviewed.size)return;const c=context(),dates=new Map();
 for(const [id,r]of reviewed){if(completedDrafts.has(id)||dispositions.has(id))continue;const date=JSON.parse(r.rows)[0]?.posting_date;if(!validDate(date))continue;
 try{const year=date.slice(0,4);if(!dates.has(year))dates.set(year,previewEntryId(date));const next=await dates.get(year);assert(c);if(reviewed.get(id)!==r)continue;r.next=next;const card=[...panel.querySelectorAll('[data-draft]')].find(n=>n.dataset.draft===id),label=card?.querySelector('[data-entry-id]');if(label){label.textContent='Next available: '+next;label.title='Not reserved. Accounting assigns the final ID when posted.';}}catch{const label=[...panel.querySelectorAll('[data-draft]')].find(n=>n.dataset.draft===id)?.querySelector('[data-entry-id]');if(label)label.title='Could not refresh availability. The final ID is assigned when posted.';}
 }
}
function sourceOrder250(id){const ref=String(aiSourceRefs.get(id)||id),m=ref.match(/^(?:PDF-(\d{4})-|SRC-(\d{6})-|GPT-(\d{6})-)(\d+)$/);return m?[(m[1]||m[2]?.slice(0,4)||m[3]?.slice(0,4)),Number(m[4])]:null;}
function orderedGroups250(groups){const items=[...groups],sourced=items.filter(([id])=>sourceOrder250(id)).sort(([a],[b])=>{const x=sourceOrder250(a),y=sourceOrder250(b);return x[0].localeCompare(y[0])||x[1]-y[1];});let index=0;return new Map(items.map(item=>sourceOrder250(item[0])?sourced[index++]:item));}
function orderCards250(list,groups){const cards=new Map([...list.querySelectorAll('[data-draft]')].map(n=>[n.dataset.draft,n]));for(const [id]of orderedGroups250(groups)){const card=cards.get(id);if(card)list.append(card);}}
function parse(rows){if(JSON.stringify((rows[0]||[]).slice(0,HEAD.length))!==JSON.stringify(HEAD))throw Error('Draft headers do not match the journal submission format.');const groups=new Map();for(const [index,row]of rows.slice(1).entries()){if(!row.some(x=>x!==''&&x!=null))continue;const v=Object.fromEntries(HEAD.map((h,i)=>[h,row[i]??'']));if(!/^[a-zA-Z0-9_-]{8,64}$/.test(v.draft_id))throw Error('Row '+(index+2)+': use a permanent draft ID of 8–64 letters, numbers, hyphens or underscores.');if(!groups.has(v.draft_id))groups.set(v.draft_id,[]);groups.get(v.draft_id).push(v);}return orderedGroups250(groups);}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function normalize(rows,accounts,settings){const first=rows[0];if(!first||!validDate(first.posting_date)||!String(first.description).trim())throw Error('A valid posting date and description are required.');if(rows.length<2||rows.length>500)throw Error('Provide 2–500 lines per entry.');const numbers=new Set();const lines=rows.map(r=>{if(r.posting_date!==first.posting_date||r.description!==first.description)throw Error('Every line of one draft must share its posting date and description.');const n=Number(r.line_no);if(!Number.isInteger(n)||n<1||numbers.has(n))throw Error('Line numbers must be unique positive integers.');numbers.add(n);const a=accounts.find(a=>a.id===r.account_id);if(!a||a.is_posting===false||a.is_active===false||a.active===false||a.isPosting===false)throw Error('An account is missing, inactive or non-posting. Refresh and correct the draft.');if(String(a.code)!==String(r.account_code)||String(a.currency_code||a.currency)!==r.currency)throw Error('Account code or currency changed. Review the current chart of accounts.');const amount=v=>{if(v==='')return 0;if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('Debit and credit must be nonnegative numeric cells.');return v};const debit=amount(r.debit),credit=amount(r.credit);if((debit>0)===(credit>0))throw Error('Use exactly one positive debit or credit per line.');let date=r.line_date||first.posting_date;if(!validDate(date))throw Error('Invalid line date.');let memo=String(r.line_memo||first.description).trim();if(date.slice(0,7)!==first.posting_date.slice(0,7)){memo+=' [Receipt date: '+date+']';date=first.posting_date;}const rate=v=>{if(v==='')return null;if(typeof v!=='number'||!Number.isFinite(v)||v<=0)throw Error('Exchange rates must be positive numeric cells.');return v;};return {n,line_date:date,account_id:a.id,description:memo,currency_code:r.currency,debit,credit,fx_rate_lak:r.currency==='LAK'?1:rate(r.fx_rate_lak),book_rate_lak:r.currency==='LAK'?null:rate(r.book_rate_lak)};}).sort((a,b)=>a.n-b.n).map(({n,...l})=>l);
 return {p_transaction_date:first.posting_date,p_memo:String(first.description).trim(),p_prefix:settings.prefix,p_digits:settings.digits,p_lines:lines};}
async function accounts(){const c=context();const all=[];for(let offset=0;;offset+=500){const r=await readQuery(c.db.from('accounts').select('id,code,name,currency_code,currency_label,account_type,is_posting,is_active,account_purpose,parent_code,is_technical,description').eq('is_active',true).order('id').range(offset,offset+499).setHeader('x-ojm-database-only','1'),'Account refresh');assert(c);if(r.error)throw r.error;all.push(...r.data);if(r.data.length<500)return all;if(all.length>10000)throw Error('Account list exceeds the supported limit.');}}
const settings=()=>({prefix:String(ApplicationSettings.accounting?.journalPrefix||businessInitials()||'OJM').trim(),digits:Math.max(3,Math.min(9,Number(ApplicationSettings.accounting?.journalDigits)||4))});
async function syncChart(){const result=await bridge('accounts-sync');if(!Array.isArray(result.accounts))throw Error('Account refresh was not confirmed.');return result.accounts;}
async function receipt(id){const c=context(),r=await readQuery(c.db.rpc('drive_journal_receipt143128',{p_sheet:c.sheet,p_draft:id}),'Posted draft check');assert(c);if(r.error)throw r.error;return r.data;}
const $=id=>document.getElementById(id);
function defaults(){return !!identity()?{sheet:'1lkn2dk1PGJyNhrPiZsyqmueK4bN8iDvTNPau5f6U2pk'}:{links:[]};}
async function loadSharedSettings(){
 syncSession();const owner=identity(),db=ojmDb;if(settingsJob?.owner===owner&&settingsJob.db===db)return settingsJob.promise;
 const job={owner,db,promise:null};settingsJob=job;job.promise=readSharedSettings().finally(()=>{if(settingsJob===job)settingsJob=null;});return job.promise;
}
async function readSharedSettings(){
 syncSession();const owner=identity(),db=ojmDb;if(!owner||liveProfile.role!=='admin')return;
 const r=await readQuery(db.from('budget_settings14313').select('*').eq('id',true).maybeSingle(),'Google settings check');
 if(owner!==identity()||db!==ojmDb)return;if(r.error)throw r.error;if(prepared.size||linkEditorOwner===owner)return;
 if(sharedLoaded&&JSON.stringify(sharedSettings)!==JSON.stringify(r.data?.data?.googleSheets143129||null))disconnect();sharedSettings=r.data?.data?.googleSheets143129||null;sharedOwner=owner;sharedLoaded=true;renderSettings();
}
async function saveSharedSettings(value,receiptMode){
 const owner=identity(),db=ojmDb;if(!owner||liveProfile.role!=='admin'||!access113.can('settings-accounting'))throw Error('Administrator settings access is required.');online();
 const check=()=>{if(owner!==identity()||db!==ojmDb||liveProfile.role!=='admin'||!access113.can('settings-accounting'))throw Error('Account changed. Reopen settings.');};
 const r=await db.from('budget_settings14313').select('*').eq('id',true).maybeSingle();check();if(r.error)throw r.error;
 if(receiptMode)value=window.ReceiptDriveSettings228.merge(r.data?.data?.googleSheets143129||defaults(),value,receiptMode);
 else if(sharedLoaded&&sharedOwner===owner&&JSON.stringify(r.data?.data?.googleSheets143129||null)!==JSON.stringify(sharedSettings))throw Error('Google Sheets settings changed on another device. Click Reload settings before saving.');
 const old=r.data,payload={id:true,version:old?old.version+1:1,data:{...(old?.data||{}),googleSheets143129:value},updated_at:new Date().toISOString(),updated_by:owner};
 const q=old?db.from('budget_settings14313').update(payload).eq('id',true).eq('version',old.version):db.from('budget_settings14313').insert(payload);
 const saved=await q.select('*');check();if(saved.error)throw saved.error;if(!saved.data?.length)throw Error('Settings changed elsewhere. Reload settings and retry.');
 sharedSettings=value;sharedOwner=owner;sharedLoaded=true;localStorage.setItem(configKey(),JSON.stringify(value));
 return value;
}
function googleURL(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)return '';if(u.hostname==='docs.google.com'&&/^\/spreadsheets\/d\/[\w-]+(?:\/|$)/.test(u.pathname)||u.hostname==='drive.google.com'&&/^\/drive\/folders\/[\w-]+(?:\/|$)/.test(u.pathname))return u.href;}catch{}return '';}
function formatDate(value){return typeof formatAppDate==='function'?formatAppDate(value):value;}
function showView(){if(!panel)return;const root=$('journal');root.classList.toggle('gpt-view143129',view==='gpt');root.classList.toggle('ai-preparing143160',prepared.size>0);panel.hidden=view!=='gpt';if(preparation)preparation.hidden=view!=='journal'||!prepared.size;}
// Only the workspace scrolls: scrollIntoView can also move hidden shell ancestors.
function scrollJournal(target){
 const expected=view;requestAnimationFrame(()=>{
  if(view!==expected||!$('journal')?.classList.contains('active'))return;
  const scroller=typeof appWorkspaceScroller==='function'?appWorkspaceScroller():document.querySelector('.workspace-scroll');if(!scroller)return;
  for(let node=scroller.parentElement;node;node=node.parentElement)if(node.scrollTop)node.scrollTop=0;
  const tabs=$('categoryTabShell'),inset=tabs&&scroller.contains(tabs)?tabs.getBoundingClientRect().height:0;
  const top=target&&scroller.contains(target)?scroller.scrollTop+target.getBoundingClientRect().top-scroller.getBoundingClientRect().top-inset-12:0;
  scroller.scrollTo({top:Math.max(0,top),behavior:'instant'});
 });
}
function choose(next){drainInbox143173();view=next==='gpt'?'gpt':'journal';showView();scrollJournal();if(view==='gpt'){void window.AIInboxSync143173?.check();void availableIds250().catch(()=>{});}return true;}
function open(){if(!current()){showCenterStatus('Sign in with journal posting permission.',true);return;}context();choose('gpt');window.switchTab('journal');window.groupedNavigation14378?.render('journal');}
function postedRows(id,p,chart){return p.p_lines.map((l,i)=>({draft_id:id,posting_date:p.p_transaction_date,description:p.p_memo,line_no:i+1,account_id:l.account_id,account_code:chart.find(a=>a.id===l.account_id)?.code||'',currency:l.currency_code,debit:l.debit,credit:l.credit,line_date:l.line_date||p.p_transaction_date,line_memo:l.description,fx_rate_lak:l.fx_rate_lak,book_rate_lak:l.book_rate_lak}));}
function formatAiAmount(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:4}):String(v??'');}
function aiAmountCell(value,row,chart){
 const account=chart.find(a=>a.id===row.account_id),code=String(account?.currency_code||account?.currency||'').toUpperCase();
 const symbol=code?(typeof currencySymbolV6==='function'?currencySymbolV6(code):code):'?';
 return '<td class="num" data-currency="'+esc(code)+'" title="'+esc(code||'Account currency unavailable')+'">'+(value?'<span class="financial-display-symbol14231">'+esc(symbol)+'</span> <span class="financial-display-value14231">'+esc(formatAiAmount(value))+'</span>':'')+'</td>';
}
function display(id,rows,payload,error,receiptData,chart,target=panel.querySelector('[data-drive-list]')){
 if(receiptData?.payload?.[0])rows=postedRows(id,receiptData.payload[0],chart);
 const card=document.createElement('section');card.className='je-card gpt-entry143129';card.dataset.draft=id;
 card.innerHTML='<div class="table-container"><table class="clustered-journal-table"><thead><tr><th>Date</th><th>Account</th><th>Line memo</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody><tr class="gpt-description143129"><td colspan="3"><div><strong>'+journalMemoHtml143187(rows[0].description)+'</strong></div></td><td colspan="2"><span data-action></span></td></tr>'+rows.map(r=>'<tr>'+[formatDate(r.line_date||r.posting_date),r.account_code+' — '+(chart.find(a=>a.id===r.account_id)?.name||'Choose account in editor'),r.line_memo||''].map((v,i)=>'<td>'+(i===2?journalMemoHtml143187(v):esc(v))+'</td>').join('')+aiAmountCell(r.debit,r,chart)+aiAmountCell(r.credit,r,chart)+'</tr>').join('')+'</tbody></table></div><p class="gpt-reference143129"><strong data-entry-id>Entry ID assigned when posted</strong> · '+esc(aiSourceRefs.get(id)||id)+' · <span data-result></span></p>';
 const result=card.querySelector('[data-result]');result.textContent=receiptData?'Posted: '+receiptData.result.map(r=>r.entry_no).join(', '):error||'Awaiting review';
 if(!receiptData){
 const buttons=[['Edit','edit'],['Post','post'],['Reject','rejected']];
 for(const [label,action]of buttons){const b=document.createElement('button');b.type='button';b.className='je-btn';b.textContent=label;b.dataset.draftAction=action;b.disabled=(action==='edit'||action==='post')&&prepared.has(id)||action==='post'&&!payload;if(action==='post'){b.dataset.invalid=payload?'':'true';b.title=prepared.has(id)?'Post from Journal to include your preparation edits.':'Post directly to Active Journal';}b.onclick=()=>run(()=>action==='edit'?editDraft(id):action==='post'?postDraft(id):rejectDraft(id));card.querySelector('[data-action]').append(b);}
 }
 target.append(card);if(!receiptData)window.AccountRates143186?.mount(card,rows,chart);return card;
}
async function refresh(prefetchedRows){
 const c=context();message('Refreshing accounts and reading drafts…');await loadDispositions(c);
 const [a,sourceRows]=await Promise.all([syncChart(),prefetchedRows?Promise.resolve(prefetchedRows):readDrafts()]);assert(c);window.AIInboxSync143173?.retain?.('journal',sourceRows,c.sheet);readLegacySourceRefs(sourceRows);const groups=parse(sourceRows);restorePreparation(c);
 const entries=[...groups].filter(([id])=>!dispositions.has(id));
 const results=new Array(entries.length),previews=new Map();let cursor=0,done=0;
 // Keep the last complete table until every read has settled. Limit concurrency on slow devices.
 await Promise.all(Array.from({length:Math.min(4,entries.length)},async()=>{
  for(;;){const index=cursor++;if(index>=entries.length)return;const [id,rows]=entries[index];let payload,error='',saved,next='';
   try{saved=await receipt(id);assert(c);if(!saved){const already=await alreadyPostedAiDraft(id);assert(c);if(already)saved={result:[{entry_no:already.entry_no,entry_id:already.id}],manualReconciled:true};}
    if(saved?.result?.[0]?.entry_no){completedDrafts.add(id);void queueArchive(id,saved.result[0].issued_entry_no||saved.result[0].entry_no,c);}
    else{payload=normalize(rows,a,settings());const date=rows[0].posting_date;if(!previews.has(date))previews.set(date,previewEntryId(date).catch(()=>''));next=await previews.get(date);}
   }catch(e){error=e.message;}assert(c);results[index]={id,rows,payload,error,saved,next};message('Refreshing drafts… '+(++done)+'/'+entries.length);
  }
 }));assert(c);
 const target=document.createDocumentFragment(),nextReviewed=new Map();
 for(const {id,rows,payload,error,saved,next}of results){if(completedDrafts.has(id))continue;nextReviewed.set(id,{rows:JSON.stringify(rows),payload,chart:a,saved,error,next});const card=display(id,rows,payload,error,saved,a,target);if(!saved&&!error){card.querySelector('[data-entry-id]').textContent=next?'Next available: '+next:'Entry ID: unavailable';card.querySelector('[data-entry-id]').title='Not reserved. Accounting assigns the final ID when posted.';}}
 reviewed=nextReviewed;panel.querySelector('[data-drive-list]').replaceChildren(target);
 const pending=[...groups].filter(([key])=>!dispositions.has(key)&&!completedDrafts.has(key)).map(([key,items])=>({noticeId:key,type:'AI Journal draft',title:items[0]?.description||'Journal draft',detail:items[0]?.posting_date||'',target:'ai-journal'}));pendingDraftNotices=pending;lastDraftSignature=JSON.stringify([...groups].filter(([key])=>!completedDrafts.has(key)).map(([key,items])=>[key,items]));lastDraftRead=Date.now();window.refreshNotices1443?.();
 if(!reviewed.size)panel.querySelector('[data-drive-list]').innerHTML='<p class="gpt-empty143129">No pending AI Journal drafts.</p>';
 renderPreparation();message(reviewed.size+' pending drafts loaded. Post an entry directly, or use Edit and open the Journal tab.');
}
function editorOccupied(){return !!(JournalModule.editingEntryId||pendingWorkspacePostJournalId||pendingWorkspacePostOwnerId||PeriodReview.pendingAdjustment||window.personalJournal1437?.active||window.workflow136?.state.adjustmentReview||$('btnPostJournal')?.dataset.payroll1429||$('jeGeneralMemo').value.trim()||[...document.querySelectorAll('#jeLinesBody .je-line-acc,#jeLinesBody .je-line-dr,#jeLinesBody .je-line-cr')].some(n=>n.value.trim()&&!/^0(?:\.00)?$/.test(n.value))||window.entry1430?.mode==='single'&&window.entry1430.read().some(r=>r.source||r.affected||r.amount||r.memo));}
async function alreadyPostedAiDraft(id){
 const ref=aiSourceRefs.get(id);
 if(!ref)return null;
 const q=await readQuery(ojmDb.from('journal_entries').select('id,entry_no,transaction_date,status,source').ilike('memo',ref+' %').eq('status','posted').limit(2),'Posted source check');
 if(q.error)throw q.error;
 if(q.data?.length>1)throw Error('Multiple posted entries carry AI source '+ref+'. Check Active Journal before continuing.');
 return q.data?.[0]||null;
}
async function loadDispositions(c=context()){
 const r=await readQuery(c.db.rpc('drive_draft_dispositions143160',{p_sheet:c.sheet}),'Draft status check');assert(c);if(r.error)throw r.error;
 dispositions=new Map((r.data||[]).map(d=>[d.draft,d.status]));
}
function preparationKey(){return configKey()+':preparation:'+config().sheet+(window.accountingReset143108?.suffix()||'');}
function persistPreparation(){
 if(!current())return;
 try{if(prepared.size)localStorage.setItem(preparationKey(),JSON.stringify([...prepared.values()].map(({id,source,rows})=>({id,source,rows}))));else localStorage.removeItem(preparationKey());}
 catch{message('This device could not save your preparation. Keep this page open until you post or copy your changes.');}
}
function restorePreparation(c){
 if(editorOccupied())return;const key=preparationKey();if(restoredKey===key)return;restoredKey=key;
 try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved)||saved.length>100)throw Error();
 for(const item of saved){if(!/^[\w-]{8,64}$/.test(item.id)||!Array.isArray(item.rows)||!item.rows.length||item.rows.length>500||typeof item.source!=='string')throw Error();if(!dispositions.has(item.id))prepared.set(item.id,{...item,context:c});}
 }catch{message('Saved AI preparation could not be read. The original drafts are still in Google Sheets.');}
}
async function editDraft(id){
 if(prepared.has(id))return;if(prepared.size>=100)throw Error('Prepare up to 100 entries at a time.');
 if(editorOccupied())throw Error('Your Journal editor contains unfinished work. Post or reset that entry first; it will not be overwritten.');
 const c=context(),review=reviewed.get(id);if(!review||review.saved||dispositions.has(id))throw Error('Refresh this draft before editing.');
 const saved=await receipt(id);assert(c);if(saved)throw Error('This draft is already posted. Refresh to see its journal ID.');
 const chart=await accounts();assert(c);if(view!=='gpt'||editorOccupied())throw Error('The editor changed while the draft was loading. Finish your manual entry first.');
 AccountingStore.accounts=chart.map(a=>({...AccountingStore.accounts.find(old=>old.id===a.id),...a,currency:a.currency_code,displayCurrency:a.currency_label||a.currency_code,baseType:a.account_type,type:a.is_technical?'SYSTEM':a.account_type,purpose:a.account_purpose||'regular',desc:a.description||'',parentCode:a.parent_code||'',isPosting:a.is_posting!==false,isTechnical:a.is_technical===true,trackForeignFunds:a.is_posting!==false&&!!a.currency_code&&!['LAK','NA'].includes(a.currency_code)}));
 prepared.set(id,{id,source:review.rows,rows:JSON.parse(review.rows).sort((a,b)=>Number(a.line_no)-Number(b.line_no)),context:c});
 persistPreparation();renderPreparation();message(prepared.size+' entries in preparation. Add more with Edit, then open the Journal tab.');
}
function removePrepared(id){
 if(busy||!window.confirm('Remove this entry and its local adjustments from preparation? Its Google Sheet draft will remain.'))return;
 prepared.delete(id);persistPreparation();renderPreparation();
}
async function rejectDraft(id){
 const c=context(),item=reviewed.get(id);if(!item)throw Error('Refresh the draft first.');
 const prompt='Reject and remove this draft from AI Journal?';
 if(!window.confirm(prompt+(prepared.has(id)?' Local preparation adjustments for this draft will be removed.':'')))return;
 const [prior,legacy]=await Promise.all([receipt(id),alreadyPostedAiDraft(id)]);assert(c);if(prior||legacy)throw Error('This entry is already posted. Use the posted journal correction controls.');
 const r=await c.db.rpc('set_drive_draft_disposition143160',{p_sheet:c.sheet,p_draft:id,p_status:'rejected'});assert(c);if(r.error)throw r.error;
 dispositions.set(id,'rejected');prepared.delete(id);reviewed.delete(id);
 panel.querySelectorAll('[data-draft]').forEach(card=>{if(card.dataset.draft===id)card.remove();});
 pendingDraftNotices=pendingDraftNotices.filter(n=>n.noticeId!==id);window.refreshNotices1443?.();persistPreparation();renderPreparation();
 if(!reviewed.size)panel.querySelector('[data-drive-list]').innerHTML='<p class="gpt-empty143129">No pending AI Journal drafts.</p>';
 message('Draft rejected and removed from AI Journal.');
}
const inputNumber=value=>value===''||value==null?0:typeof value==='number'?value:parseAppNumber(String(value));
const inputAmount=value=>typeof value==='number'?formatAppNumber(value):String(value??'');
function inputField(field,value,label,extra=''){
 return '<input data-field="'+field+'" aria-label="'+esc(label)+'" value="'+esc(value)+'" '+extra+'>';
}
function stackRows(item){
 const options=AccountingStore.accounts.filter(a=>a.is_posting!==false&&a.isPosting!==false&&a.is_active!==false&&a.active!==false);
 return item.rows.map((r,i)=>'<tr data-line="'+i+'"><td>'+inputField('line_date',r.line_date||r.posting_date,'Receipt date','type="date"')+'</td><td><select data-field="account_id" aria-label="Account"><option value="">Choose account</option>'+options.map(a=>'<option value="'+esc(a.id)+'"'+(a.id===r.account_id?' selected':'')+'>'+esc(a.code+' — '+a.name+' ('+(a.currency_code||a.currency)+')')+'</option>').join('')+'</select></td><td>'+inputField('line_memo',r.line_memo||'','Line memo','type="text"')+'</td><td>'+inputField('debit',inputAmount(r.debit),'Debit','type="text" inputmode="decimal" data-financial-number data-ai-amount data-currency="'+esc(r.currency)+'"')+'</td><td>'+inputField('credit',inputAmount(r.credit),'Credit','type="text" inputmode="decimal" data-financial-number data-ai-amount data-currency="'+esc(r.currency)+'"')+'</td><td><button type="button" class="je-btn" data-remove-line="'+i+'" aria-label="Remove line '+(i+1)+'">×</button></td></tr>').join('');
}
const preparedBookRequests292=new WeakMap();
async function suggestPreparedBook292(item,line){
 const account=AccountingStore.accounts.find(a=>a.id===line.account_id);
 if(!account||!line.currency||line.currency==='LAK'||!window.AccountRates143186)return;
 const actor=identity(),request={},date=line.line_date||line.posting_date;
 preparedBookRequests292.set(line,request);
 const book=await AccountRates143186.bookRateFor(account,date);
 if(preparedBookRequests292.get(line)!==request||actor!==identity()||prepared.get(item.id)!==item||!item.rows.includes(line)||line.account_id!==account.id||date!==(line.line_date||line.posting_date))return;
 line.book_rate_lak=book||'';persistPreparation();
 const card=[...preparation.querySelectorAll('[data-prepared-draft]')].find(c=>c.dataset.preparedDraft===item.id);
 if(!card)return;
 const field=[...card.querySelectorAll('[data-rate="book_rate_lak"]')].find(f=>f.dataset.rateCurrency===line.currency);
 if(field&&document.activeElement!==field){
  const values=[...new Set(item.rows.filter(r=>r.currency===line.currency).map(r=>String(r.book_rate_lak??'')))];
  bindAppRateInput(field,values.length===1?item.rows.find(r=>r.currency===line.currency).book_rate_lak:'');
  field.placeholder=values.length>1?'Mixed rates retained':'Optional carrying rate';
 }
 updateStackTotals(item,card);
}
function stackRates(item){
 return [...new Set(item.rows.map(r=>r.currency).filter(c=>c&&c!=='LAK'))].map(currency=>['fx_rate_lak','book_rate_lak'].map(field=>{
 const values=[...new Set(item.rows.filter(r=>r.currency===currency).map(r=>String(r[field]??'')))],value=values.length===1?(typeof item.rows.find(r=>r.currency===currency)[field]==='number'?formatAppRate(item.rows.find(r=>r.currency===currency)[field]):String(item.rows.find(r=>r.currency===currency)[field]??'')):'';
 return '<label>'+esc(field==='fx_rate_lak'?'LAK / 1 '+currency:'Carrying rate · '+currency)+'<input type="text" inputmode="decimal" data-rate="'+field+'" data-rate-currency="'+esc(currency)+'" value="'+esc(value)+'" placeholder="'+(values.length>1?'Mixed rates retained':'Optional carrying rate')+'"></label>';
 }).join('')).join('');
}
function updateStackTotals(item,card){
 const totals=new Map();for(const r of item.rows){const t=totals.get(r.currency)||[0,0];t[0]+=inputNumber(r.debit);t[1]+=inputNumber(r.credit);totals.set(r.currency,t);}
 window.AccountRates143186?.mount(card,item.rows,AccountingStore.accounts);
 card.querySelector('[data-totals]').textContent=[...totals].map(([c,t])=>c+' · Debit '+formatAppNumber(t[0])+' · Credit '+formatAppNumber(t[1])+' · Difference '+formatAppNumber(t[0]-t[1])).join(' | ');
 const cross=item.rows.some(r=>r.line_date&&r.line_date.slice(0,7)!==r.posting_date.slice(0,7));
 card.querySelector('[data-date-warning]').textContent=cross?'Other-month receipt dates will be kept in line memos; the main date determines the posting month.':'';
}
function renderPreparation(){
 if(!preparation)return;
 panel?.querySelectorAll('[data-draft-action="edit"]').forEach(b=>{const queued=prepared.has(b.closest('[data-draft]').dataset.draft);b.textContent='Edit';b.disabled=queued||busy;});
 updatePostButtons();
 preparation.innerHTML='<div class="je-card-header"><div><h3 class="je-title">Journal Preparation · AI entries</h3><p>Each section posts as a separate entry, even when dates match. Accounting assigns each final journal ID when posted.</p></div><div class="je-header-actions"><button class="je-btn" type="button" data-add-more>Add more AI entries</button><button class="je-btn" type="button" data-post-all>Post all ('+prepared.size+')</button></div></div><p data-drive-status role="status"></p><div data-stack></div>';
 preparation.querySelector('[data-add-more]').onclick=open;preparation.querySelector('[data-post-all]').onclick=()=>run(postPrepared);
 let index=0;for(const item of prepared.values()){
 const card=document.createElement('section');card.className='ai-prepared-entry143160';card.dataset.preparedDraft=item.id;
 card.innerHTML='<div class="je-card-header"><strong>Entry '+(++index)+' · '+esc(aiSourceRefs.get(item.id)||item.id)+'</strong><button class="je-btn" type="button" data-remove-prepared>Remove from preparation</button></div><div class="ai-prepared-fields143160"><label>Posting date'+inputField('posting_date',item.rows[0].posting_date,'Posting date','type="date"')+'</label><label class="ai-prepared-memo143160">General description'+inputField('description',item.rows[0].description,'General description','type="text"')+'</label>'+stackRates(item)+'</div><div class="table-container"><table><thead><tr><th>Receipt date</th><th>Account</th><th>Line memo</th><th>Debit</th><th>Credit</th><th></th></tr></thead><tbody>'+stackRows(item)+'</tbody></table></div><div class="je-actions-bar"><button class="je-btn" type="button" data-add-line>Add line</button><span data-totals></span></div><p data-date-warning role="status"></p><p class="gpt-reference143129">Next available: '+esc(reviewed.get(item.id)?.next||'check availability in AI Journal')+' · Final ID assigned when posted</p>';
 card.querySelectorAll('[data-rate]').forEach(n=>{const values=[...new Set(item.rows.filter(r=>r.currency===n.dataset.rateCurrency).map(r=>String(r[n.dataset.rate]??'')))];if(values.length===1)bindAppRateInput(n,item.rows.find(r=>r.currency===n.dataset.rateCurrency)[n.dataset.rate]??'');});
 card.querySelector('[data-remove-prepared]').onclick=()=>removePrepared(item.id);
 card.querySelector('[data-add-line]').onclick=()=>{if(busy)return;if(item.rows.length>=500){message('An entry supports up to 500 lines.');return;}item.rows.push({draft_id:item.id,posting_date:item.rows[0].posting_date,description:item.rows[0].description,line_date:item.rows[0].posting_date,account_id:'',account_code:'',currency:'',debit:'',credit:'',line_memo:'',fx_rate_lak:'',book_rate_lak:''});persistPreparation();renderPreparation();};
 card.querySelectorAll('[data-remove-line]').forEach(b=>b.onclick=()=>{if(busy)return;if(item.rows.length<=2){message('Each entry needs at least two lines.');return;}item.rows.splice(Number(b.dataset.removeLine),1);persistPreparation();renderPreparation();});
 card.addEventListener('input',e=>{
  if(busy)return;const n=e.target,field=n.dataset.field;
  if(n.dataset.rate){item.rows.filter(r=>r.currency===n.dataset.rateCurrency).forEach(r=>{if(n.dataset.rate==='book_rate_lak')preparedBookRequests292.delete(r);r[n.dataset.rate]=n.value;});}
  else if(field){const row=n.closest('[data-line]');if(row){const line=item.rows[Number(row.dataset.line)];line[field]=n.value;
   if(field==='account_id'){const a=AccountingStore.accounts.find(a=>a.id===n.value),oldCurrency=line.currency;line.account_code=a?.code||'';line.currency=a?.currency_code||a?.currency||'';if(oldCurrency!==line.currency){line.fx_rate_lak=line.currency==='LAK'?1:'';}line.book_rate_lak='';persistPreparation();renderPreparation();void suggestPreparedBook292(item,line);return;}
   if(field==='line_date'&&preparedBookRequests292.has(line))void suggestPreparedBook292(item,line);
  }else item.rows.forEach((r,i)=>{if(field==='posting_date'&&(!r.line_date||r.line_date===r.posting_date)){r.line_date=n.value;const date=card.querySelector('[data-line="'+i+'"] [data-field="line_date"]');date.value=n.value;window.datePicker104?.refresh(date);}r[field]=n.value;if(field==='posting_date'&&preparedBookRequests292.has(r))void suggestPreparedBook292(item,r);});}
  persistPreparation();updateStackTotals(item,card);
 });
 preparation.querySelector('[data-stack]').append(card);updateStackTotals(item,card);
 }
 window.financialNumbers14231?.scan(preparation);showView();
}
function preparedPayload(item,chart){
 const rows=item.rows.map((r,i)=>({...r,line_no:i+1,debit:inputNumber(r.debit),credit:inputNumber(r.credit),fx_rate_lak:r.fx_rate_lak===''?'':inputNumber(r.fx_rate_lak),book_rate_lak:r.book_rate_lak===''||r.book_rate_lak==null?'':inputNumber(r.book_rate_lak)}));
 return normalize(rows,chart,settings());
}
function completePrepared(items,results,stayInInbox=false){
 const numbers=[];for(const item of items){const result=results.get(item.id);if(!Array.isArray(result)||result.length!==1||!result[0].entry_id||!result[0].entry_no)throw Error('Posting confirmation incomplete. Keep this preparation and retry to check the saved receipts.');}
 for(const item of items){const posted=results.get(item.id)[0],number=posted.entry_no;completedDrafts.add(item.id);prepared.delete(item.id);reviewed.delete(item.id);numbers.push(number);
 panel.querySelectorAll('[data-draft]').forEach(card=>{if(card.dataset.draft===item.id)card.remove();});void queueArchive(item.id,posted.issued_entry_no||number,item.context);
 }
 pendingDraftNotices=pendingDraftNotices.filter(n=>!completedDrafts.has(n.noticeId));window.refreshNotices1443?.();persistPreparation();renderPreparation();if(!stayInInbox)openActiveJournal();
 if(!reviewed.size)panel.querySelector('[data-drive-list]').innerHTML='<p class="gpt-empty143129">No pending AI Journal drafts.</p>';
 const text=numbers.length===1?'Posted as '+numbers[0]+'. Saved to Active Journal.':'Posted '+numbers.length+' separate entries: '+numbers.join(', ');message(text);showCenterStatus(text);refreshPostedJournal(items[0].context,numbers.join(', '));
}
function updatePostButtons(){
 panel?.querySelectorAll('[data-draft-action="post"]').forEach(b=>{const queued=prepared.has(b.closest('[data-draft]').dataset.draft);b.disabled=busy||queued||b.dataset.invalid==='true';b.title=queued?'Post from Journal to include your preparation edits.':'Post directly to Active Journal';});
}
async function postDraft(id){
 const c=context(),review=reviewed.get(id);
 if(!review||!review.payload||review.saved||dispositions.has(id)||completedDrafts.has(id))throw Error('Refresh and review this draft before posting.');
 if(prepared.has(id))throw Error('This draft has preparation edits. Open Journal to review and post them.');
 await postItems([{id,source:review.rows,rows:JSON.parse(review.rows),context:c,direct:true}],true);
}
async function postPrepared(){
 if(!prepared.size)throw Error('Add AI entries to preparation first.');
 await postItems([...prepared.values()]);
}
async function postItems(items,stayInInbox=false){
 const c=context();items.forEach(item=>assert(item.context));online();
 for(const item of items)await window.AccountRates143186?.checkReview(item.rows,AccountingStore.accounts);
 message(stayInInbox?'Checking this entry…':'Checking all prepared entries…');const [sourceRows,chart]=await Promise.all([readDrafts(),accounts()]);assert(c);const groups=parse(sourceRows),drafts=[],results=new Map();
 // Resolve committed receipts before checking source rows: a prior successful attempt may already have archived them.
 for(const item of items){
  const [prior,legacy]=await Promise.all([receipt(item.id),alreadyPostedAiDraft(item.id)]);assert(c);
  if(prior){results.set(item.id,prior.result);continue;}if(legacy){results.set(item.id,[{entry_id:legacy.id,entry_no:legacy.entry_no}]);continue;}
  if(JSON.stringify(groups.get(item.id))!==item.source)throw Error('Draft '+item.id+' changed in Google Sheets. '+(item.direct?'Refresh and review its new version before posting.':'Your adjustments are retained. Remove that entry from preparation, refresh, and review its new version.'));
  try{drafts.push({draft_id:item.id,entry:item.direct?normalize(item.rows,chart,settings()):preparedPayload(item,chart)});}catch(e){throw Error('Draft '+item.id+': '+e.message);}
 }
 if(drafts.length){const r=await c.db.rpc('approve_drive_journal_batch143160',{p_sheet:c.sheet,p_drafts:drafts});assert(c);if(r.error)throw r.error;
  if(!Array.isArray(r.data)||r.data.length!==drafts.length)throw Error('Posting confirmation incomplete. Retry this preparation to check the saved receipts.');
  for(const row of r.data)results.set(row.draft_id,row.result);
 }
 completePrepared(items,results,stayInInbox);
}
async function run(fn){
 if(busy)return;busy=true;const e=epoch;const hosts=[panel,settingsPanel,preparation];hosts.forEach(h=>{if(h)h.inert=true;});
 try{if(!sharedLoaded&&identity()&&liveProfile.role==='admin')await loadSharedSettings();await fn();}catch(err){if(e===epoch){message(err.message);showCenterStatus(err.message,true);}}
 finally{busy=false;void window.AIInboxSync143173?.persist?.();drainInbox143173();hosts.forEach(h=>{if(h)h.inert=false;});if(e===epoch){panel?.querySelectorAll('[data-draft-action="edit"]').forEach(b=>b.disabled=prepared.has(b.closest('[data-draft]').dataset.draft));updatePostButtons();}}
}

function renderSettings(){
 if(!settingsPanel)return;
 if(linkEditorOwner&&linkEditorOwner===identity())return;
 linkEditorOwner='';const cfg=config(),owner=identity();
 const canEdit=()=>owner&&owner===identity()&&sharedLoaded&&sharedOwner===owner&&liveProfile?.role==='admin'&&access113.can('settings-accounting','edit');
 settingsPanel.innerHTML='<section data-connection-settings><h3 class="je-title">AI Journal and HR</h3><label>Submission spreadsheet ID or URL<input data-sheet class="je-input"></label><div class="je-actions-bar"><button type="button" class="je-btn" data-save>Save AI spreadsheet</button><button type="button" class="je-btn" data-reload>Reload AI settings</button><button type="button" class="je-btn" data-connect-sheets228>Connect AI workspace account</button></div><p><a data-ai-open target="_blank" rel="noopener noreferrer">Open submission spreadsheet</a></p></section><p data-drive-status role="status"></p><p data-connection-status role="status"></p>';
 const aiLink=settingsPanel.querySelector('[data-ai-open]');
 if(/^[\w-]{20,120}$/.test(cfg.sheet||''))aiLink.href='https://docs.google.com/spreadsheets/d/'+cfg.sheet+'/edit';else aiLink.hidden=true;
 settingsPanel.querySelector('[data-sheet]').value=cfg.sheet||'';
 settingsPanel.querySelector('[data-save]').onclick=()=>{const sheetInput=settingsPanel.querySelector('[data-sheet]').value.trim();void run(async()=>{
  if(linkEditorOwner){message('Save or cancel your link edit first.');return;}
  if(prepared.size){message('Post or remove the prepared AI entries before changing connection settings.');return;}
  try{let sheet=sheetInput.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1]||sheetInput;if(sheet&&!/^[\w-]{20,120}$/.test(sheet))throw Error('Enter a valid submission spreadsheet ID or URL.');await saveSharedSettings({...config(),sheet});disconnect();renderSettings();message('Settings saved to the shared accounting system.');void checkBackground();}catch(e){message(e.message)}
 });};
 settingsPanel.querySelector('[data-reload]').onclick=()=>run(async()=>{if(linkEditorOwner)throw Error('Save or cancel your link edit first.');if(prepared.size)throw Error('Post or remove the prepared AI entries first.');await loadSharedSettings();message('Shared Google Sheets settings reloaded.');lastConnectionCheck=0;void checkBackground();});
 settingsPanel.querySelector('[data-connect-sheets228]').onclick=()=>run(connect);
 window.ReceiptDriveSettings228.mount(settingsPanel,{cfg,canEdit,
  editing:value=>{linkEditorOwner=value?owner:'';},finish:text=>{linkEditorOwner='';renderSettings();if(text)message(text);},
  load:async()=>{if(!canEdit())throw Error('Administrator settings access is required.');online();const db=ojmDb,r=await readQuery(db.from('budget_settings14313').select('data').eq('id',true).maybeSingle(),'Receipt destination check');if(!canEdit()||db!==ojmDb)throw Error('Account changed. Reopen settings.');if(r.error)throw r.error;return r.data?.data?.googleSheets143129||defaults();},
  save:async(value,mode)=>{if(!canEdit())throw Error('Administrator settings access is required.');return await saveSharedSettings(value,mode);},
  request:async(action,args={})=>{if(!canEdit())throw Error('Administrator settings access is required.');online();const db=ojmDb,session=await db.auth.getSession();if(session.error||session.data.session?.user?.id!==owner)throw Error('Sign in again to manage Google Drive.');const response=await fetch(OJM_SUPABASE_URL+'/functions/v1/accounting-documents',{method:'POST',headers:{Authorization:'Bearer '+session.data.session.access_token,apikey:OJM_SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(35000)}),value=await response.json();if(!canEdit()||db!==ojmDb)throw Error('Account changed. Reopen settings.');if(!response.ok||value.error)throw Error(value.error||'Google Drive connection failed.');return value;}
 });
 showConnection();
}

function draftNoticeSummary(){
 const drafts=[...new Map(pendingDraftNotices.filter(n=>!completedDrafts.has(n.noticeId)&&!dispositions.has(n.noticeId)).map(n=>[n.noticeId,n])).values()];
 if(!drafts.length)return [];
 // Changing draft membership must count as new, even when the total stays the same.
 return [{count:drafts.length,noticeId:'ai-journal:'+JSON.stringify(drafts.map(n=>n.noticeId).sort()),type:'AI Journal draft',title:drafts.length+(drafts.length===1?' entry':' entries'),detail:'',target:'ai-journal'}];
}
function ready(){
 if(!$('journal'))return;
 const style=document.createElement('style');style.textContent='#gptDrafts143129 [data-drive-status]:empty,#googleSheets143129 [data-drive-status]:empty{display:none}#journal.gpt-view143129>:not(#gptDrafts143129):not(.area-banner113):not(.module-header):not(#categoryTabShell):not(#settingsSections14335){display:none!important}#journal:not(.gpt-view143129)>#gptDrafts143129{display:none!important}#journal.ai-preparing143160 #journalEntry98{display:none!important}.gpt-description143129 td{background:#e9f3ec;border-top:2px solid #9ab8a1}.gpt-description143129 td>div{display:flex;align-items:center;justify-content:space-between;gap:12px}.gpt-description143129 strong{white-space:normal;overflow-wrap:anywhere}.gpt-description143129 [data-action]{display:flex;justify-content:flex-end;gap:6px;white-space:nowrap}.gpt-description143129 [data-draft-action=edit]:disabled{background:#e5e7eb!important;color:#6b7280!important;border-color:#cbd0d6!important}.gpt-reference143129{padding:8px 12px;margin:0;color:#526357}#gptDrafts143129 .gpt-entry143129{margin-top:10px;overflow:hidden;min-height:0;height:auto;padding-bottom:0}#gptDrafts143129 .gpt-entry143129>.table-container{min-height:0!important;height:auto!important;max-height:none!important;margin-bottom:0!important;padding-bottom:0!important}#gptDrafts143129 .gpt-reference143129{margin:0!important;padding:6px 12px!important}#gptDrafts143129 .gpt-entry143129 :is(th,td){padding-top:6px;padding-bottom:6px}.gpt-entry143129 table{table-layout:fixed;min-width:760px}.gpt-entry143129 th:nth-child(1){width:110px}.gpt-entry143129 th:nth-child(2){width:220px}.gpt-entry143129 th:nth-child(4),.gpt-entry143129 th:nth-child(5){width:145px}.gpt-entry143129 td{overflow-wrap:anywhere}.gpt-links143129{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}#googleSheets143129 label{display:block;margin:12px 0}#googleSheets143129 input,#googleSheets143129 textarea{display:block;width:100%;max-width:850px}.gpt-empty143129{padding:24px 12px;color:#64748b}#aiPreparation143160[hidden]{display:none!important}#aiPreparation143160 .ai-prepared-entry143160{border:1px solid #9ab8a1;border-radius:6px;margin:14px 0;overflow:hidden}#aiPreparation143160 .ai-prepared-entry143160>.je-card-header{background:#e9f3ec}#aiPreparation143160 .ai-prepared-fields143160{display:flex;flex-wrap:wrap;gap:12px;padding:12px}#aiPreparation143160 label{display:flex;flex-direction:column;gap:4px}#aiPreparation143160 .ai-prepared-memo143160{flex:1;min-width:220px}#aiPreparation143160 .table-container{overflow-x:auto;max-width:100%}#aiPreparation143160 table{width:100%;min-width:960px;table-layout:fixed}#aiPreparation143160 th:first-child{width:125px}#aiPreparation143160 th:nth-child(2){width:230px}#aiPreparation143160 th:nth-child(3){width:200px}#aiPreparation143160 th:nth-child(4),#aiPreparation143160 th:nth-child(5){width:145px}#aiPreparation143160 th:last-child{width:44px}#aiPreparation143160 td{padding:6px;border:1px solid #d6ded8}#aiPreparation143160 td input,#aiPreparation143160 td select{width:100%;min-width:0;border:0;background:transparent;padding:4px}html body #journal #aiPreparation143160 td :is(input,select,textarea,.oj-date-button104,.account-choice14231){border:0!important;background:transparent!important;box-shadow:none!important}html body #journal #aiPreparation143160 :is(input,select,textarea):focus{outline:1px solid #60a5fa!important;box-shadow:none!important}#aiPreparation143160 .je-card-header,#gptDrafts143129 .je-header-actions,#gptDrafts143129 [data-action]{flex-wrap:wrap;gap:6px}#gptDrafts143129 [data-action]{display:flex}#aiPreparation143160 [data-totals]{font-size:12px}#aiPreparation143160 [data-date-warning]{padding:0 12px;color:#92400e} ';document.head.append(style);
 const originalTodoNotices=window.getTodoNotices136;window.getTodoNotices136=function(...args){const existing=typeof originalTodoNotices==='function'?originalTodoNotices.apply(this,args):[];return [...existing,...draftNoticeSummary()];};
 panel=document.createElement('section');panel.id='gptDrafts143129';panel.hidden=true;panel.innerHTML='<div class="je-card"><div class="je-card-header"><div><h3 class="je-title">AI Journal</h3><p class="je-subtitle">Post reviewed drafts directly, or use Edit to prepare them in Journal.</p></div><div class="je-header-actions"><button type="button" class="je-btn" data-connect>Connect Google</button><button type="button" class="je-btn" data-refresh>Refresh drafts</button></div></div><p data-connection-status role="status">Press Refresh drafts to check Google Sheets.</p><p data-drive-status role="status"></p></div><div data-drive-list><p class="gpt-empty143129">Press Refresh drafts to check Google Sheets.</p></div>';$('journal').append(panel);
 preparation=document.createElement('section');preparation.id='aiPreparation143160';preparation.className='je-card';preparation.hidden=true;$('journalEntry98').after(preparation);
 panel.querySelector('.je-card')?.append(panel.querySelector('[data-drive-list]'));panel.querySelector('[data-connect]').onclick=()=>run(connect);panel.querySelector('[data-refresh]').onclick=()=>run(()=>window.AIInboxSync143173?AIInboxSync143173.check(true):refresh());
 settingsPanel=document.createElement('section');settingsPanel.id='googleSheets143129';settingsPanel.className='settings-module94';settingsPanel.hidden=true;$('settings-accounting')?.append(settingsPanel);renderSettings();
 // Prepared entries stay separate from the manual editor and its saved drafts.
 for(const name of ['loadEntryForEdit','applyTemplate','startFindingAdjustment','prepareComparedForm69']){const fn=window[name];if(typeof fn==='function')window[name]=function(...args){if(prepared.size){showCenterStatus('Post or remove the prepared AI entries first.',true);return;}return fn.apply(this,args)};}
 const submit=window.submitJournalEntry;if(typeof submit==='function')window.submitJournalEntry=function(...args){return prepared.size?run(postPrepared):submit.apply(this,args)};
 const logout=window.logoutDemoUser;if(typeof logout==='function')window.logoutDemoUser=function(...args){if(busy){showCenterStatus('Wait for the current AI Journal operation to finish.',true);return;}persistPreparation();disconnect();return logout.apply(this,args)};
 window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
 const settingsEntry=()=>{if($('settings-accounting')?.classList.contains('active')&&!sharedLoaded&&identity()&&liveProfile.role==='admin')void loadSharedSettings().catch(e=>message(e.message));};
 window.addEventListener('page113',()=>{showView();settingsEntry();void checkBackground();});
 window.addEventListener('focus',()=>{lastDraftRead=0;void checkBackground();});
 window.addEventListener('online',()=>{lastConnectionCheck=0;lastDraftRead=0;void checkBackground();});
 window.addEventListener('offline',showConnection);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lastDraftRead=0;void checkBackground();}});
 setInterval(()=>{if(syncSession())void checkBackground();},1500);
 settingsEntry();void checkBackground();
}
window.AIInboxSync143173?.register('journal',{checked:()=>{connectionStatus={connected:true,email:connectionStatus?.email||''};lastCheckedAt=new Date().toISOString();backgroundError='';showConnection();},cache:cacheInbox143174,restore:restoreInbox143174,receive:receiveInbox143173,reset:()=>{if(!syncSession()){disconnect();sharedLoaded=false;}},error:e=>{backgroundError=e;showConnection();}});
window.DriveDrafts143128={open,choose,scrollToTop:()=>scrollJournal(),parse,normalize,validDate,googleURL,notices:()=>pendingDraftNotices.slice(),get view(){return view},get editing(){return prepared.size>0},get preparedCount(){return prepared.size}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
