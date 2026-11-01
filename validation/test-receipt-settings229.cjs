const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/integrations/google/receipt-drive228.js','utf8');
const apiContext={window:{},URL};vm.createContext(apiContext);vm.runInContext(source,apiContext);
const api=apiContext.window.ReceiptDriveSettings228;
const old={sheet:'old-inbox',accountEmail228:'old@example.test',receiptDrive228:{folderURL:'https://drive.google.com/drive/folders/oldfolder123'}};
const active={email:'old@example.test',name:'Existing receipts',folderURL:old.receiptDrive228.folderURL,connectionKey:'keep-active'};
const latest={sheet:'new-inbox',client:'keep-client',links:[['Journal receipts',old.receiptDrive228.folderURL,'receipts'],['New saved link','https://example.test']],accountEmail228:'old@example.test',receiptDrive228:{folderURL:old.receiptDrive228.folderURL,active}};
const pending={...old,accountEmail228:'santos@example.test',receiptDrive228:{folderURL:'https://drive.google.com/drive/folders/newfolder123'}};
// Exercise the actual shared settings writer with an old inbox-recovery snapshot.
const shared=fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8');
const saveSource=shared.slice(shared.indexOf('async function saveSharedSettings('),shared.indexOf('\nfunction googleURL('));
let row={id:true,version:4,data:{otherSettings:'retained',googleSheets143129:structuredClone(latest)}},failCAS=false;
const db={from(){let payload,version;return {select(){return this},eq(k,v){if(k==='version')version=v;return this},async maybeSingle(){return {data:structuredClone(row)}},update(p){payload=p;return this},insert(p){payload=p;return this},then(resolve){const matches=!failCAS&&(version===undefined||version===row.version);if(matches)row=payload;return Promise.resolve({data:matches?[row]:[]}).then(resolve)}}}};
const context={window:apiContext.window,identity:()=> 'admin',ojmDb:db,liveProfile:{role:'admin'},access113:{can:()=>true},online(){},sharedLoaded:true,sharedOwner:'admin',sharedSettings:structuredClone(old),defaults:()=>({}),localStorage:{setItem(){}},configKey:()=> 'test',Date};vm.createContext(context);vm.runInContext(saveSource+'\nglobalThis.save=saveSharedSettings;',context);
(async()=>{
 await assert.rejects(context.save(pending),/changed on another device/,'ordinary Sheets changes retain conflict protection');
 await context.save(pending,'details');assert.equal(row.version,5);assert.equal(row.data.otherSettings,'retained');assert.equal(row.data.googleSheets143129.sheet,'new-inbox');assert.equal(row.data.googleSheets143129.client,'keep-client');assert.equal(row.data.googleSheets143129.receiptDrive228.active.connectionKey,'keep-active');assert.equal(row.data.googleSheets143129.links.length,2);assert.equal(row.data.googleSheets143129.accountEmail228,'santos@example.test');
 const destination={email:pending.accountEmail228,folderURL:pending.receiptDrive228.folderURL,name:'New receipts',connectionKey:'new-active'};
 await context.save({...pending,receiptDrive228:{...pending.receiptDrive228,active:destination}},'activate');assert.equal(row.data.googleSheets143129.links[0][1],destination.folderURL);assert.equal(row.data.googleSheets143129.links.length,2);assert.equal(row.data.googleSheets143129.sheet,'new-inbox');
 row.data.googleSheets143129.accountEmail228='another@example.test';await assert.rejects(context.save({...pending,receiptDrive228:{active:destination}},'activate'),/changed/);
 failCAS=true;await assert.rejects(context.save(pending,'details'),/changed elsewhere/);
 const checked={email:'santos@example.test',folderURL:'https://drive.google.com/drive/folders/archivefolder123'};const archiveLatest={...latest,archiveDrive230:{folderURL:checked.folderURL,verified230:checked,custom:'keep'}};const merged=api.merge(archiveLatest,pending,'details');assert.equal(merged.archiveDrive230.folderURL,checked.folderURL,'old receipt clients cannot erase archive settings');assert.equal(merged.archiveDrive230.custom,'keep');assert.equal(merged.archiveDrive230.verified230,undefined,'account change invalidates prior checks');assert.throws(()=>api.merge(archiveLatest,{archiveDrive230:{verified230:checked}},'verify-folders'),/changed/);
 console.log('PASS stale receipt-only save preserves active destination, concurrent Sheets settings and links; activation and optimistic write conflicts stay protected');
 const {JSDOM}=require('jsdom'),dom=new JSDOM('<main id="host"></main>',{url:'https://accounting.example.test',runScripts:'outside-only'});
 try{
  const w=dom.window,doc=w.document,$=selector=>doc.querySelector(selector),tick=()=>new Promise(resolve=>setTimeout(resolve,0));
  w.eval(source);w.OJM_SUPABASE_URL='https://edge.example.test';w.open=()=>null;
  let server=structuredClone(latest),blockSave=false;const actions=[];
  w.ReceiptDriveSettings228.mount($('#host'),{cfg:old,canEdit:()=>true,load:async()=>server,editing(){},finish(){},save:async(value,mode)=>{if(blockSave)throw Error('Connection interrupted; your changes are still here.');server=w.ReceiptDriveSettings228.merge(server,value,mode);return server;},request:async(action)=>{if(action==='storage-status230')return {archive:{sheet:'currentworkbook1234567890',email:'archive@example.test'}};actions.push(action);if(action==='verify-folders230')return {receipts:{email:server.accountEmail228,folderURL:server.receiptDrive228.folderURL},archive:{email:server.accountEmail228,folderURL:server.archiveDrive230.folderURL}};if(action==='connect')return {authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?state=fixture'};return {destination:{email:server.accountEmail228,folderURL:server.receiptDrive228.folderURL,name:'New receipts',connectionKey:'new-active'}};}});
  const fill=(selector,value)=>{const input=$(selector);input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));};
  await tick();assert.match($('[data-active228]').textContent,/Existing receipts/);
  fill('[data-receipt-email228]','santos@example.test');fill('[data-receipt-folder228]',pending.receiptDrive228.folderURL);fill('[data-archive-folder230]','https://drive.google.com/drive/folders/archivefolder123');
  blockSave=true;$('[data-save228]').click();await tick();assert.match($('[data-result228]').textContent,/Connection interrupted/);
  $('[data-connect228]').click();await tick();assert.match($('[data-result228]').textContent,/Connection interrupted/);assert.equal(actions.length,0);
  blockSave=false;$('[data-save228]').click();await tick();assert.match($('[data-result228]').textContent,/Both destination details saved/);
  assert.equal(server.archiveDrive230.folderURL,'https://drive.google.com/drive/folders/archivefolder123');assert.equal($('[data-receipt-email228]').value,'santos@example.test');assert.match($('[data-active228]').textContent,/old@example.test/);
  $('[data-connect228]').click();await tick();assert.match($('[data-result228]').textContent,/window did not open/);
  const link=[...doc.querySelectorAll('a')].find(a=>a.textContent==='Open Google authorization');assert.equal(link.hidden,false);assert.match(link.href,/^https:\/\/accounts.google.com\//);
  $('[data-check-folders230]').click();await tick();assert.match($('[data-archive-state230]').textContent,/Access checked/);assert.match($('[data-archive-state230]').textContent,/Yearly exports are not active/);assert.match($('[data-archive-state230]').textContent,/archive@example.test/);assert.equal(server.receiptDrive228.active.connectionKey,'keep-active');assert.equal(server.archiveDrive230.active,undefined);
  $('[data-activate228]').click();await tick();assert.match($('[data-active228]').textContent,/santos@example.test/);assert.match($('[data-result228]').textContent,/now active for every phone scanner/);assert.equal(server.sheet,'new-inbox');
  assert.equal(server.archiveDrive230.active,undefined);
  // A slow initial read must not discard edits typed while it is in flight.
  $('#host').innerHTML='';let resolveLoad;
  w.ReceiptDriveSettings228.mount($('#host'),{cfg:old,canEdit:()=>true,load:()=>new Promise(resolve=>resolveLoad=()=>resolve(latest)),editing(){},finish(){}});
  fill('[data-receipt-email228]','keep-typed@example.test');resolveLoad();await tick();assert.equal($('[data-receipt-email228]').value,'keep-typed@example.test');assert.match($('[data-active228]').textContent,/Existing receipts/);
  console.log('PASS DOM workflow refreshes stale destination, preserves drafts and save errors, exposes blocked-popup fallback, and confirms activation visibly');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
