/* Restored desktop tab and offline update checks. All accounts and caches are synthetic. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const read=path=>fs.readFileSync(path,'utf8');

async function checkWake(){
 const src=read('src/core/sync/offline14239.js');
 const fragment=src.slice(src.indexOf('let wakeCheck='),src.indexOf('async function readCopy'));
 let owner='alice',reachable=true,health='healthy',requests=0,resolve,changes=0;
 const recorded=[];
 const ctx=vm.createContext({
  window:{supabaseHealth461:{current:()=>({kind:health}),record:(id,result)=>{recorded.push([id,result]);health=result.error?'unavailable':'healthy';}}},
  navigator:{onLine:true},document:{hidden:false},actor:()=>owner,changed:()=>changes++,
  ojmDb:{rpc(name){assert.equal(name,'current_access14228');return {setHeader(key,value){
    assert.equal(key,'x-ojm-database-only');assert.equal(value,'1');requests++;
    return new Promise(done=>{resolve=done;});
  }};}},canRefresh14338:()=>true,reachable,connectionError:''
 });
 const run=code=>vm.runInContext(code,ctx);run(fragment);
 run('recoverConnection()');assert.equal(requests,0);
 ctx.reachable=false;ctx.document.hidden=true;run('recoverConnection()');assert.equal(requests,0);
 ctx.document.hidden=false;ctx.navigator.onLine=false;run('recoverConnection()');assert.equal(requests,0);
 ctx.navigator.onLine=true;
 const focus=run('recoverConnection()');assert.equal(run('recoverConnection()'),focus);assert.equal(requests,1);
 resolve({status:200});await focus;assert.equal(ctx.reachable,true);assert.equal(recorded.length,1);
 ctx.reachable=false;run('recoverConnection()');assert.equal(requests,1);
 const retry=run('++networkEpoch;recoverConnection(true)');resolve({status:503,error:{message:'Database unavailable'}});await retry;
 assert.equal(ctx.reachable,false);assert.match(ctx.connectionError,/unavailable/);
 const stale=run('++networkEpoch;recoverConnection(true)');owner='bob';resolve({status:200});await stale;
 assert.equal(recorded.length,2);assert.equal(ctx.reachable,false);
 const disconnected=run('recoverConnection()');run('++networkEpoch');ctx.navigator.onLine=false;resolve({status:200});await disconnected;
 assert.equal(recorded.length,2);assert.equal(ctx.reachable,false);assert.ok(changes>0);
}
async function checkPanel(){
 const {JSDOM}=require('jsdom');
 const dom=new JSDOM('<body><input id="period" value="2026-10"><input id="draft" value="unsaved edit"></body>',{url:'https://test.invalid',runScripts:'outside-only'});
 const w=dom.window,src=read('src/core/sync/offline14239.js');let scans=0;const measured=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 Object.assign(w,{actor:()=>'alice',dialog:null,state:()=>({online:false,deviceOnline:true}),canRefresh14338:()=>false,
  idleSync14341:{bytes:String,feedback:()=>null,overview(options){measured.push(options.measureBytes);return {groups:[],pending:0,synced:0};}},
  dataSize143162:{actor:'',value:null},checkingStorage14335:false,storageCheck14335:'',
  checkForUpdates(){},checkStorage14335(){},recoverConnection(){},measureDeviceData(){scans++;}});
 w.eval(src.slice(src.indexOf('function open(findingId='),src.indexOf('function paint('))+';window.showNetwork=open;');
 const panel=w.showNetwork();assert.equal(scans,0);assert.equal(measured.at(-1),false);
 assert.match(panel.textContent,/Device online · database unconfirmed/);
 const click=action=>panel.querySelector('[data-action="'+action+'"]').click();
 click('view-tools');click('measure-storage');assert.equal(scans,1);
 click('view-details');assert.equal(measured.at(-1),true);assert.equal(scans,1);
 assert.equal(w.document.querySelector('#period').value,'2026-10');assert.equal(w.document.querySelector('#draft').value,'unsaved edit');dom.window.close();
}
async function checkWorker(){
 const scope='https://test.invalid/Accounting/';const href=path=>new URL(path,scope).href;
 const versioned='app.js?v=101',missing='new.js?v=102',logo='assets/logo.png';
 const bytes=fs.readFileSync(logo),names=['old-a','old-b','old-c'].map(s=>'ojm-desktop-shell-'+s);
 const stores=new Map(names.map(n=>[n,new Map()]));
 stores.get(names[1]).set(href(versioned),'previous code');
 stores.get(names[0]).set(href(logo),'wrong image');stores.get(names[2]).set(href(logo),bytes);
 let listings=0,indexReads=0,reads=0,sends=0,fetches=0;
 const asCache=files=>({keys:async()=>{indexReads++;return [...files.keys()].map(url=>({url}));},
  match:async url=>files.has(url)?new Response(files.get(url)):undefined,delete:url=>files.delete(url),
  put:async(url,response)=>files.set(url,Buffer.from(await response.arrayBuffer()))});
 const ctx=vm.createContext({self:{registration:{scope},addEventListener(){},clients:{matchAll:async()=>[{url:href('update.html'),postMessage(){sends++;}}]}},
  caches:{keys:async()=>{listings++;return [...names,'ojm-other-app'];},open:async n=>asCache(stores.get(n)),
   match:async(url,{cacheName})=>{reads++;return asCache(stores.get(cacheName)).match(url);}},
  URL,Response,Blob,crypto:webcrypto,Uint8Array,AbortController,setTimeout,clearTimeout,
  fetch:async()=>{fetches++;return new Response('new code');}});
 const run=code=>vm.runInContext(code,ctx);run(read('desktop-sw14242.js'));
 const shared=path=>ctx.sharedDesktopFile(new URL(path,scope));
 await Promise.all(Array.from({length:40},(_,i)=>shared('changed'+i+'.js?v=102')));
 assert.equal(listings,1);assert.equal(indexReads,names.length);assert.equal(reads,0);
 assert.equal(await (await shared(versioned)).text(),'previous code');
 assert.deepEqual(Buffer.from(await (await shared(logo)).arrayBuffer()),bytes);
 assert.equal(await shared('desktop.html'),undefined);
 const targetFiles=new Map(),target=asCache(targetFiles);
 await ctx.downloadFile(target,versioned);await ctx.downloadFile(target,missing);await ctx.downloadFile(target,missing);
 assert.equal(fetches,1);assert.equal(targetFiles.size,1);assert.equal(stores.get(names[1]).size,1);
 sends=0;run('lastProgressNotice=-Infinity');
 for(let i=0;i<20;i++)await ctx.reportDownload({completed:i});assert.equal(sends,1);
 await ctx.reportDownload({completed:run('FILES.length')});assert.equal(sends,2);
 await ctx.reportDownload({type:'ojm-shell-error'});assert.equal(sends,3);
}
(async()=>{await checkWake();await checkPanel();await checkWorker();console.log('PASS restored connection, stale responses, on-demand storage and queue sizing, retained period and draft, indexed cache reuse, verified bytes, resumable download and progress');})().catch(e=>{console.error(e);process.exitCode=1;});
