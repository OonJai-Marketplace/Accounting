const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{try{const p=path.join(ROOT,new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/scanner-chrome/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],events=[];page.on('pageerror',e=>errors.push(e.message));let uploaded=null,manifest=null,rejectID=null,failLink=true,putCount=0,driveDisabled=false,delayDrive=0,existingReceipts=[],delayIDs=0;
 await page.route('**/scripts/device-vault14334.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.deviceVault14334={unlocked:true,actor:'test-owner',attach:async()=>{},pack:v=>({actor:'test-owner',data:v}),unpack:v=>v?.data};`}));
 await page.route('**/assets/vendor/supabase.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'test-owner'},access_token:'synthetic'}}})}})};`}));
 const directory={root:{name:'My Drive',parents:[]},receiptsfolder:{name:'Receipts',parents:['root']}};const folder=id=>({id,...directory[id],capabilities:{canAddChildren:true,canRename:true},mimeType:'application/vnd.google-apps.folder'});
 await page.route('**/functions/v1/accounting-documents',async r=>{if(delayDrive)await new Promise(resolve=>setTimeout(resolve,delayDrive));const b=r.request().postDataJSON();let data;if(driveDisabled&&['folder','folders'].includes(b.action))return r.fulfill({status:400,json:{error:'Google Drive: Google Drive API has not been used in project 128865919484 before, or it is disabled.'}});switch(b.action){case 'status':data={connected:true,email:'test@example.test'};break;case 'folder':data=folder(b.id);break;case 'folders':data={parent:folder(b.parent),files:Object.keys(directory).filter(id=>directory[id].parents.includes(b.parent)).map(folder)};break;case 'create-folder':directory.createdfolder={name:b.name,parents:[b.parent]};data=folder('createdfolder');break;case 'reserve-id':data={ids:['pdf123456789']};break;case 'file':events.push('verify');data=uploaded||{error:'File not found 404'};break;case 'upload-start':events.push('start');data={id:b.id,session:'https://www.googleapis.com/upload/drive/v3/files?upload_id=fixture'};break;default:throw Error('Unexpected '+b.action);}return r.fulfill({json:data});});
 await page.route('https://www.googleapis.com/upload/**',r=>{const range=r.request().headers()['content-range'];if(range.startsWith('bytes */'))return r.fulfill({status:uploaded?200:308,body:'{}'});putCount++;events.push('upload');const bytes=r.request().postDataBuffer();uploaded={id:'pdf123456789',name:'October receipts.pdf',version:'1',size:String(bytes.length),sha256Checksum:crypto.createHash('sha256').update(bytes).digest('hex')};fs.writeFileSync('/tmp/scanner-workflow215.pdf',bytes);return r.fulfill({status:200,body:'{}'});});
 await page.route('**/storage/v1/object/scan-documents208/**',r=>r.fulfill({status:200,body:'{}'}));
 await page.route('**/functions/v1/scanner-integration',async r=>{const b=r.request().postDataJSON();if(b.action==='suggest-ids'){if(delayIDs)await new Promise(resolve=>setTimeout(resolve,delayIDs));const labels=Array.from({length:11},(_,i)=>'OJM26'+String(i+10).padStart(4,'0'));const row=label=>({type:b.type,label,available:labels.includes(label)&&label!=='OJM260012'&&!b.exclude.includes(label),reason:'No matching journal'});return r.fulfill({json:{selected:row(b.label),suggestions:labels.filter(label=>label>=b.label&&row(label).available).slice(0,5).map(row)}});}if(b.action==='ids'){events.push('ids');return r.fulfill({json:{ids:b.groups.map(g=>({...g,available:g.label!==rejectID&&g.label!=='OJM260012'&&(g.type!=='journal'||/^OJM2600(1[0-9]|20)$/.test(g.label)),receipts:existingReceipts,reason:g.label===rejectID||g.label==='OJM260012'?'Already used':'No matching journal',journal_ids:g.type==='journal'?['uuid-'+g.label]:[],staff_line_ids:[]}))}});}assert.equal(b.action,'register');events.push('register');assert.ok(uploaded,'link only after Drive saved');assert.ok(events.indexOf('verify')<events.indexOf('register'));manifest=b.manifest;if(failLink){failLink=false;return r.fulfill({status:503,json:{error:'Synthetic link interruption'}});}return r.fulfill({json:{registered:true,pending:0}});});
 await page.addInitScript(()=>{
  window.captureCalls=0;window.captureCount=2;window.pickerCalls=[];const read=()=>JSON.parse(localStorage.getItem('test-native')||'null'),write=j=>localStorage.setItem('test-native',JSON.stringify(j));
  window.ReceiptNative214={available:true,platform:'android',recover:async()=>read(),pending:read,
   scan:async context=>{window.captureCalls++;if(window.cancelCapture)return null;const job={...context,id:crypto.randomUUID(),paths:Array.from({length:captureCount},(_,i)=>'file:///scan/'+i+'.jpg'),acknowledged:[]};write(job);return job;},
   readPage:async()=>{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,300,400);x.fillStyle='black';x.fillText('Receipt test',30,40);return c.toDataURL('image/jpeg');},
   acknowledge:async(job,i)=>{const j=read();j.acknowledged.push(i);write(j);},complete:async()=>localStorage.removeItem('test-native'),
   pickDirectory:async previous=>{pickerCalls.push(previous);return window.cancelDirectory?{cancelled:true}:previous?.id?previous:{id:'content://fixture/tree/'+previous.kind,name:previous.kind==='sd'?'My SD / Receipts':'Phone / Documents'};},checkDirectory:async()=>({}),createDirectory:async(folder,name)=>({id:folder.id+'/'+name,name:folder.name+'/'+name}),savePDF:async()=>({verified:true})
  };
 });
 const idle=()=>page.waitForFunction(()=>window.ReceiptScanner202&&!ReceiptScanner202.state.busy);
 const click=async s=>{await page.click(s);await idle();};
 const idsReady=()=>page.waitForFunction(()=>document.querySelector('#idStatus215')&&!document.querySelector('#idStatus215').textContent.includes('Checking'));
 await page.goto('http://127.0.0.1:'+server.address().port+'/scan.html');await page.waitForSelector('#setupID215');await idle();
 assert.equal(await page.evaluate(()=>captureCalls),0,'setup must precede native capture');
 assert.equal(await page.locator('#settingsButton,datalist').count(),0,'no duplicate header Settings or native datalist');
 assert.equal(await page.locator('#setupMonth215').count(),0,'redundant month removed');await page.fill('#setupID215','UNKNOWN123');await click('[data-scan=setup-confirm215]');assert.equal(await page.evaluate(()=>captureCalls),0,'unknown journal ID blocked');
 await page.fill('#setupTitle215','October receipts');await page.fill('#setupID215','OJM260010');await page.locator('#setupID215').blur();await page.waitForFunction(()=>!document.querySelector('#idStatus215')?.textContent.includes('Checking'));await idle();
 await page.focus('#setupID215');assert.equal(await page.locator('#availableIDs215').isVisible(),false,'focusing the text field does not open suggestions');
 await page.press('#setupID215','ArrowDown');assert.equal(await page.locator('#availableIDs215').isVisible(),false,'editing keys do not open suggestions');
 await click('#showIDs219');assert.equal(await page.locator('#availableIDs215').isVisible(),true,'dropdown arrow opens the list');
 await click('#showIDs219');assert.equal(await page.locator('#availableIDs215').isVisible(),false,'dropdown arrow can close the list');
 await click('#showIDs219');await page.click('#setupID215');assert.equal(await page.locator('#availableIDs215').isVisible(),false,'tapping the text box closes suggestions');assert.equal(await page.locator('#setupID215').evaluate(n=>document.activeElement===n),true,'text field stays editable');
 delayIDs=700;await page.fill('#setupID215','OJM260011');await click('#showIDs219');await page.click('#setupID215');await page.locator('#setupID215').blur();await idsReady();assert.equal(await page.locator('#availableIDs215').isVisible(),false,'late suggestion responses do not reopen the list');delayIDs=0;
 await page.fill('#setupID215','OJM260010');await page.locator('#setupID215').blur();await idsReady();assert.equal(await page.locator('#availableIDs215').isVisible(),false,'manual typing keeps the list closed');
 await click('#showIDs219');await page.waitForSelector('#availableIDs215 [role=option]');
 assert.equal(await page.locator('#setupID215').getAttribute('list'),null,'native suggestion popup is not used');
 assert.ok(await page.locator('#availableIDs215').evaluate(n=>{const s=getComputedStyle(n);return s.backgroundColor==='rgb(255, 255, 255)'&&s.opacity==='1'&&[...n.children].every(c=>!['transparent','rgba(0, 0, 0, 0)'].includes(getComputedStyle(c).backgroundColor));}),'list and rows have opaque backgrounds');
 await page.screenshot({path:'/tmp/scanner-picker219.png',fullPage:true});
 await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await idsReady();assert.equal(await page.locator('#setupID215').inputValue(),'OJM260011','keyboard chooses a suggested ID');
 await page.fill('#setupID215','OJM260010');await page.locator('#setupID215').blur();await idsReady();
 await click('[data-scan=destination215]');assert.equal(await page.locator('[data-scan=browse215],[data-scan=create-folder215],[data-scan=connect]').count(),0);
 await click('[data-scan=provider-sd215]');assert.equal(await page.evaluate(()=>pickerCalls.length),1,'SD opens immediately');assert.match(await page.locator('#setupPath215').innerText(),/My SD \/ Receipts/);
 await click('[data-scan=destination215]');await page.evaluate(()=>cancelDirectory=true);await click('[data-scan=provider-local215]');await page.evaluate(()=>cancelDirectory=false);await click('#destinationDialog204 [data-scan=close]');assert.match(await page.locator('#setupPath215').innerText(),/SD card.*My SD \/ Receipts/,'cancel restores previous destination');await click('[data-scan=destination215]');
 driveDisabled=true;await click('[data-scan=provider-drive215]');assert.match(await page.locator('#destinationDialog204').innerText(),/Drive API is disabled.*128865919484/);assert.equal(await page.evaluate(()=>captureCalls),0);driveDisabled=false;
 delayDrive=700;await page.click('[data-scan=provider-drive215]');await page.waitForSelector('.scan-wait217');assert.ok(await page.locator('.scan-wait217').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&n.closest('dialog')?.open;}),'loader is visible in active dialog');assert.match(await page.locator('.scan-wait217').innerText(),/Opening destination/);await idle();assert.equal(await page.locator('.scan-wait217').count(),0);delayDrive=0;await page.waitForSelector('[data-scan=folder-open][data-folder=receiptsfolder]');await click('[data-scan=folder-open][data-folder=receiptsfolder]');
 await page.screenshot({path:'/tmp/accounting-drive-browser216.png',fullPage:true});page.once('dialog',d=>d.accept('October'));await click('[data-scan=folder-new]');await click('[data-scan=folder-open][data-folder=createdfolder]');await click('[data-scan=folder-select]');assert.match(await page.locator('#setupPath215').innerText(),/October/);
 await click('[data-scan=destination215]');await click('[data-scan=provider-sd215]');assert.equal(await page.evaluate(()=>pickerCalls.at(-1).id),'content://fixture/tree/sd','remembered SD folder passed to native picker');
 await click('[data-scan=destination215]');await click('[data-scan=provider-drive215]');assert.equal(await page.locator('.scan-drive-path216').innerText(),'October','Drive reopens saved folder');await click('[data-scan=folder-select]');
 await click('[data-scan=setup-confirm215]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),2);
 assert.equal(await page.locator('[data-scan=recrop],[data-scan=delete-page]').count(),0,'native return has no duplicate crop/delete controls');
 await click('[data-scan=edit-id215]');await idsReady();assert.equal(await page.locator('#availableIDs215').isVisible(),false,'Edit ID opens with suggestions closed');
 await page.click('#setupID215');assert.equal(await page.locator('#availableIDs215').isVisible(),false);await page.focus('#showIDs219');await page.keyboard.press('Enter');assert.equal(await page.locator('#availableIDs215').isVisible(),true,'keyboard activation of the dropdown button opens the list');
 await page.keyboard.press('Escape');assert.equal(await page.locator('#availableIDs215').isVisible(),false);assert.equal(await page.locator('#scanDialog').isVisible(),true,'Escape closes only the open list');
 await click('#showIDs219');await page.fill('#setupID215','OJM260010');assert.equal(await page.locator('#availableIDs215').isVisible(),false);await click('#scanDialog [data-scan=close]');

 await page.evaluate(()=>captureCount=1);await click('[data-scan=add-receipts215]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),3);
 await page.evaluate(()=>cancelCapture=true);await click('[data-scan=next-id215]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),3);assert.equal(await page.locator('#scanDialog').isVisible(),false,'cancel returns to the Accounting batch');await page.evaluate(()=>cancelCapture=false);await click('[data-scan=add-receipts215]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.groups.at(-1).label),'OJM260011');
 const captures=await page.evaluate(()=>captureCalls);await click('[data-scan=next-id215]');assert.equal(await page.evaluate(()=>captureCalls),captures,'taken next ID cannot silently jump');
 const batchBefore=await page.evaluate(()=>JSON.stringify(ReceiptScanner202.state.draft));
 await click('[data-scan=skip-id215]');await idsReady();
 assert.equal(await page.locator('#scanDialog h2').innerText(),'Skip to ID');
 assert.equal(await page.locator('#availableIDs215').isVisible(),false,'Skip ID also waits for the dropdown button');await click('#showIDs219');
 assert.equal(await page.locator('#scanDialog #setupTitle215,#scanDialog #setupType215,#scanDialog [data-scan=destination215]').count(),0,'skip shows only IDs, not initial setup');
 assert.equal(await page.locator('#setupID215').inputValue(),'OJM260013','first later available ID is suggested');
 assert.ok((await page.locator('#availableIDs215 [role=option]').allTextContents()).every(id=>id>'OJM260011'),'only IDs after current appear');
 assert.equal(await page.evaluate(()=>captureCalls),captures,'opening skip does not launch capture');
 await page.screenshot({path:'/tmp/scanner-skip219.png',fullPage:true});
 await page.locator('#availableIDs215 [role=option]').filter({hasText:'OJM260014'}).click();await idsReady();assert.equal(await page.locator('#setupID215').inputValue(),'OJM260014','touch selects a suggestion');
 await click('#scanDialog [data-scan=close]');assert.equal(await page.evaluate(()=>JSON.stringify(ReceiptScanner202.state.draft)),batchBefore,'cancel preserves active ID, pages and batch settings');
 await click('[data-scan=skip-id215]');await idsReady();
 assert.ok(!(await page.locator('#availableIDs215 [role=option]').allTextContents()).includes('OJM260018'),'manual ID starts outside the suggestion list');await click('#showIDs219');
 await page.fill('#setupID215','OJM260018');assert.equal(await page.locator('#availableIDs215').isVisible(),false,'manual skip editing closes the list');await page.locator('#setupID215').blur();await idsReady();await click('[data-scan=setup-confirm215]');
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.title),'October receipts');assert.match(await page.locator('#scanMain .scan-path215').innerText(),/October/);
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.groups.at(-1).label),'OJM260018','manual ID is used for capture');
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),5);assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.groups.length),3);
 rejectID='OJM260018';await click('[data-scan=save-pdf215]');assert.equal(putCount,0,'recheck failure blocks upload');rejectID=null;
 await click('[data-scan=save-pdf215]');assert.equal(putCount,1);assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.links208.status),'pending');
 await click('[data-scan=save-pdf215]');assert.equal(putCount,1,'retry links without duplicate PDF upload');assert.equal(manifest.workflow,218);assert.equal(manifest.groups.length,3);assert.equal(manifest.pages.length,5);assert.ok(manifest.groups.every(g=>g.type==='journal'&&g.targets.journal_ids.length===1));
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.completed215===ReceiptScanner202.state.draft.revision),true);
 await page.reload();await page.waitForSelector('#setupID215');await idle();assert.equal(await page.locator('#setupID215').inputValue(),'OJM260019');assert.match(await page.locator('#setupPath215').innerText(),/October/);

 // Saved entries remain selectable: cancel, add, replace, and changed-receipt recheck.
 existingReceipts=[{id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',title:'Original receipt',pages:1}];
 await page.fill('#setupID215','OJM260010');await page.locator('#setupID215').blur();await page.waitForTimeout(400);
 const before=await page.evaluate(()=>captureCalls);
 await page.click('[data-scan=setup-confirm215]');await page.waitForSelector('[data-receipt-choice=cancel]');await page.click('[data-receipt-choice=cancel]');await idle();assert.equal(await page.evaluate(()=>captureCalls),before);
 await page.click('[data-scan=setup-confirm215]');await page.waitForSelector('[data-receipt-choice=add]');await page.click('[data-receipt-choice=add]');await idle();assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.idChecks215['OJM260010'].receiptChoice.mode),'add');
 uploaded=null;await click('[data-scan=save-pdf215]');assert.equal(manifest.groups[0].receiptChoice.mode,'add');
 await page.reload();await page.waitForSelector('#setupID215');await idle();await page.fill('#setupID215','OJM260010');await page.locator('#setupID215').blur();await page.waitForTimeout(400);
 await page.click('[data-scan=setup-confirm215]');await page.waitForSelector('[data-receipt-choice=replace]');await page.click('[data-receipt-choice=replace]');await idle();
 existingReceipts.push({id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',title:'Newer receipt',pages:1});
 const uploadsBefore=putCount;await page.click('[data-scan=save-pdf215]');await page.waitForSelector('[data-receipt-choice=cancel]');await page.click('[data-receipt-choice=cancel]');await idle();assert.equal(putCount,uploadsBefore,'changed receipt list must be reviewed before saving');
 uploaded=null;await page.click('[data-scan=save-pdf215]');await page.waitForSelector('[data-receipt-choice=replace]');await page.click('[data-receipt-choice=replace]');await idle();assert.equal(manifest.groups[0].receiptChoice.mode,'replace');assert.equal(manifest.groups[0].receiptChoice.expected.length,2);

 // Device-copy cleanup: reachable after saving; cancelled/failed deletion is non-destructive.
 const saved=await page.evaluate(()=>structuredClone(ReceiptScanner202.state.draft));
 const readRecords=()=>page.evaluate(async()=>{const conn=await new Promise((resolve,reject)=>{const r=indexedDB.open('ojm-scans202',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return await new Promise((resolve,reject)=>{const t=conn.transaction('drafts','readonly'),s=t.objectStore('drafts'),keys=s.getAllKeys(),values=s.getAll();t.oncomplete=()=>{conn.close();resolve(Object.fromEntries(keys.result.map((k,i)=>[k,values.result[i]])));};t.onerror=()=>reject(t.error);});});
 const prefix=await page.evaluate(()=>OJM_SUPABASE_URL+':test-owner:');
 const beforeDelete=await readRecords(),pdfBeforeDelete=JSON.stringify(uploaded),registeredBeforeDelete=JSON.stringify(manifest),eventsBeforeDelete=events.length;
 assert.equal(await page.locator('#scanMain [data-scan=discard-draft]').innerText(),'Delete device copy');
 page.once('dialog',d=>{assert.match(d.message(),/saved and linked/);assert.match(d.message(),/Accounting attachments will remain/);return d.dismiss();});
 await click('#scanMain [data-scan=discard-draft]');assert.deepEqual(await readRecords(),beforeDelete,'cancel retains every local record');
 await page.screenshot({path:'/tmp/scanner-drafts220.png',fullPage:true});
 const selectedDelete=`#scanMain [data-scan=discard-draft][data-draft="${saved.id}"]`;
 await page.evaluate(()=>{window.originalDelete220=IDBObjectStore.prototype.delete;let calls=0;IDBObjectStore.prototype.delete=function(key){if(++calls===2)throw Error('Synthetic local delete failure');return originalDelete220.call(this,key);};});
 page.once('dialog',d=>d.accept());await click(selectedDelete);assert.deepEqual(await readRecords(),beforeDelete,'storage failure rolls back draft, pointer and photo deletion');
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.id),saved.id);
 await page.evaluate(()=>IDBObjectStore.prototype.delete=originalDelete220);
 page.once('dialog',d=>d.accept());await click(selectedDelete);
 const afterDelete=await readRecords();assert.equal(afterDelete[prefix+'draft:'+saved.id],undefined);for(const p of saved.pages)assert.equal(afterDelete[prefix+'page:'+p.id],undefined);assert.equal(afterDelete[prefix+'current'].data,null);
 for(const [key,value] of Object.entries(beforeDelete))if(![prefix+'draft:'+saved.id,prefix+'current',prefix+'draft-list',...saved.pages.map(p=>prefix+'page:'+p.id)].includes(key))assert.deepEqual(afterDelete[key],value,'other draft/settings retained: '+key);
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft),null);assert.equal(JSON.stringify(uploaded),pdfBeforeDelete);assert.equal(JSON.stringify(manifest),registeredBeforeDelete);assert.equal(events.length,eventsBeforeDelete,'cleanup never calls Drive or Accounting APIs');
 await click('#scanDialog [data-scan=close]');await click('#scanMain [data-scan=drafts]');assert.equal(await page.locator(`[data-scan=discard-draft][data-draft="${saved.id}"]`).count(),0,'deleted copy does not reappear from setup');
 const otherID=await page.locator('#scanDialog [data-scan=discard-draft]').first().getAttribute('data-draft');
 page.once('dialog',d=>d.accept());await click(`#scanDialog [data-scan=discard-draft][data-draft="${otherID}"]`);assert.equal((await readRecords())[prefix+'draft:'+otherID],undefined,'older saved copies can also be deleted');
 await click('#scanDialog [data-scan=close]');await click('#scanMain [data-scan=setup215]');await idsReady();
 existingReceipts=[];await page.fill('#setupID215','OJM260019');await page.locator('#setupID215').blur();await idsReady();await click('[data-scan=setup-confirm215]');
 await page.reload();await page.waitForSelector('#setupID215');await idle();await click('#scanDialog [data-scan=batch-view215]');
 const unfinished=await page.evaluate(()=>structuredClone(ReceiptScanner202.state.draft));
 assert.equal(await page.locator('#scanMain [data-scan=discard-draft]').innerText(),'Delete draft');
 page.once('dialog',d=>{assert.match(d.message(),/unsaved scans or changes.*permanently lost/);return d.dismiss();});await click('#scanMain [data-scan=discard-draft]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.id),unfinished.id);
 // The native recovery queue must keep its original batch until recovery finishes.
 await page.evaluate(id=>localStorage.setItem('test-native',JSON.stringify({draftID:id})),unfinished.id);await click('#scanMain [data-scan=discard-draft]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.id),unfinished.id);await page.evaluate(()=>localStorage.removeItem('test-native'));
 // A saved PDF with unfinished links has a distinct confirmation.
 uploaded=null;failLink=true;await click('[data-scan=save-pdf215]');assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.links208.status),'pending');
 page.once('dialog',d=>{assert.match(d.message(),/Accounting links are unfinished/);assert.match(d.message(),/removes the ability to retry/);return d.dismiss();});await click('#scanMain [data-scan=discard-draft]');
 page.once('dialog',d=>d.accept());await click('#scanMain [data-scan=discard-draft]');
 await page.reload();await page.waitForSelector('#setupID215');await idle();await click('#scanDialog [data-scan=close]');await click('#scanMain [data-scan=drafts]');assert.equal(await page.locator(`[data-scan=discard-draft][data-draft="${unfinished.id}"]`).count(),0,'deleted batch stays deleted after restart');
 await click('#scanDialog [data-scan=close]');await click('#scanMain [data-scan=setup215]');await idsReady();await page.fill('#setupID215','OJM260020');await page.locator('#setupID215').blur();await idsReady();await click('[data-scan=setup-confirm215]');
 const unsavedID=await page.evaluate(()=>ReceiptScanner202.state.draft.id),serverBeforeUnsavedDelete=events.length;
 page.once('dialog',d=>{assert.match(d.message(),/permanently lost/);return d.accept();});await click('#scanMain [data-scan=discard-draft]');assert.equal((await readRecords())[prefix+'draft:'+unsavedID],undefined,'confirmed unsaved draft is removed');assert.equal(events.length,serverBeforeUnsavedDelete);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:'/tmp/scanner-setup215.png',fullPage:true});
 console.log('PASS setup before capture; confirmed IDs; immediate Drive/SD browser opening, folder creation, picker cancellation and API-disabled recovery; independent remembered paths; button-only ID suggestions with tap/type/late-response closure and accessible keyboard selection; ID-only Skip ID with cancellation and manual entry; no duplicate Settings; Add receipts/Next ID/Skip ID; 5 pages in one PDF; upload before linking; safe retry; next-ID memory; confirmed saved/unsaved cleanup, atomic rollback, retained PDFs and Accounting links; phone layout');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
