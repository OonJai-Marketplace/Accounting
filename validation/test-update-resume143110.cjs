/* Real service-worker upgrade: interruption at the main bundle, resume, slow
   streaming, old/offline release retention and accounting-storage preservation. */
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const old=execFileSync('git',['show','3d56800c796bd8cc833f13a54e6202a3b7609f54:desktop-sw14242.js'],{cwd:root,encoding:'utf8'});
const current=fs.readFileSync(path.join(root,'desktop-sw14242.js'),'utf8');
const version=current.match(/const VERSION='([^']+)'/)[1];
let latest=false,fail=true;const requests=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=url.pathname;requests.push({p,url:req.url,latest});
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.json')?'application/json':p.endsWith('.css')?'text/css':'text/html');
 if(p==='/desktop-sw14242.js')return res.end(latest?current:old);
 if(p==='/release-version.json')return res.end(JSON.stringify({version,changes:['Resumable update']}));
 if(p==='/desktop.html')return res.end('<h1>'+(latest?'NEW '+version:'OLD 143.108')+'</h1>');
 if(latest&&p==='/scripts/desktop14245-3.js'){
  if(fail){res.statusCode=503;return res.end('Interrupted download');}
  let chunks=0;const interval=setInterval(()=>{res.write(' '.repeat(8192));if(++chunks===28){clearInterval(interval);res.end();}},800);
  res.on('close',()=>clearInterval(interval));return;
 }
 if(['/update.html','/scripts/update14390.js'].includes(p))return res.end(fs.readFileSync(path.join(root,p)));
 res.end('/* fixture */');
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();page.setDefaultTimeout(90000);
  await page.goto(base+'/harness');
  await page.evaluate(async()=>{
   localStorage.setItem('journal-draft-sentinel','keep draft');
   const db=await new Promise((ok,no)=>{const r=indexedDB.open('journal-test',1);r.onupgradeneeded=()=>r.result.createObjectStore('entries');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
   await new Promise((ok,no)=>{const tx=db.transaction('entries','readwrite');tx.objectStore('entries').put('pending-entry','sentinel');tx.oncomplete=ok;tx.onerror=no});db.close();
   await navigator.serviceWorker.register('desktop-sw14242.js?v=143.108');await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  latest=true;
  await page.goto(base+'/update.html');
  await page.waitForSelector('#updateRetry:not([hidden])');
  assert.match(await page.textContent('#updateStatus'),/Completed files are saved/);
  assert.ok(requests.filter(r=>r.latest&&r.p==='/scripts/desktop14245-3.js').length>=3,'automatic retries before offering manual retry (browser may also start its own update check)');
  assert.equal(await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL.includes('143.108')),true,'old release stays active on failed upgrade');
  const completed=await page.evaluate(async v=>(await(await caches.open('ojm-desktop-shell-'+v)).keys()).map(r=>r.url),version);
  assert.ok(completed.length>=16,'complete files retained after failed install');
  const before=requests.length;fail=false;await page.click('#updateRetry');
  await page.waitForFunction(()=>/KB/.test(document.getElementById('updateStatus')?.textContent||''));
  assert.equal(await page.locator('#updateRetry').isHidden(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'short progress fits phone');
  // Reopening the updater must recover an in-progress download's status.
  await page.reload();await page.waitForFunction(()=>/KB/.test(document.getElementById('updateStatus')?.textContent||''));
  await page.waitForURL('**/desktop.html?v='+version);
  assert.equal(await page.textContent('h1'),'NEW '+version);
  const after=requests.slice(before);
  assert.ok(!after.some(r=>completed.some(u=>new URL(u).pathname+new URL(u).search===r.url)),'retry reuses completed files');
  const preserved=await page.evaluate(async()=>{
   const db=await new Promise(ok=>{const r=indexedDB.open('journal-test');r.onsuccess=()=>ok(r.result)});
   const entry=await new Promise(ok=>{const r=db.transaction('entries').objectStore('entries').get('sentinel');r.onsuccess=()=>ok(r.result)});db.close();
   return {draft:localStorage.getItem('journal-draft-sentinel'),entry,caches:await caches.keys()};
  });
  assert.equal(preserved.draft,'keep draft');assert.equal(preserved.entry,'pending-entry');
  assert.ok(preserved.caches.includes('ojm-desktop-shell-143.108'));
  assert.ok(preserved.caches.includes('ojm-desktop-shell-'+version));
  await context.setOffline(true);await page.reload();assert.equal(await page.textContent('h1'),'NEW '+version);
  assert.ok(!requests.some(r=>/^\/(rest|auth)/.test(r.p)));
  console.log('PASS phone update: 3 automatic attempts, retained partial download, manual resume without redownloading, slow stream >20 seconds, reopened updater status, verified activation, offline reopening, old release and accounting storage preserved');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exit(1)});
