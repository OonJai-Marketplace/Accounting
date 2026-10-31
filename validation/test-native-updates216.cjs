const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{try{const p=path.join(ROOT,new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',/\.m?js$/.test(p)?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({executablePath:'/tmp/scanner-chrome/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/mobile/connected-accounting/src/updates.mjs');
  await page.setContent('<link rel="stylesheet" href="/styles/phone14242.css"><div id="accountMenu"><button data-accounting-install>Install Accounting</button></div><input id="draft" value="Unsaved journal"><nav id="bottom">Home Accounts Post Entries Scan</nav>');
  await page.evaluate(async()=>{
   localStorage.setItem('test-draft','saved draft');window.downloads=[];window.checkCalls=0;window.failCheck=false;window.build='143215';
   window.release={schema:1,applicationId:'org.oonjai.accounting.preview',signerSha256:'58124eaeb0ff570eeb67d3cbe2121db02369d82fb47a4b3bc1889b233b1bfa8c',version:'143.216-test',versionCode:143216,sha256:'a'.repeat(64),url:'https://drive.google.com/file/d/123456789012345/view',notes:['Update controls and direct folder browsing.']};
   const {installAndroidUpdates}=await import('/mobile/connected-accounting/src/updates.mjs');installAndroidUpdates({getInfo:async()=>({id:'org.oonjai.accounting.preview',build:window.build,version:'143.215-test'}),getManifest:async()=>{checkCalls++;if(failCheck)throw Error('Offline');return release;},openDownload:async url=>downloads.push(url),onResume:callback=>window.resumeUpdate=callback,autoDelay:-1});
  });
  assert.equal(await page.locator('[data-accounting-install]').count(),0);
  await page.click('#nativeUpdate216');await page.waitForSelector('[data-update-download]:visible');
  assert.match(await page.locator('#nativeUpdateDialog216').innerText(),/143.216-test/);
  await page.screenshot({path:'/tmp/accounting-update216.png',fullPage:true});await page.click('[data-update-download]');assert.equal(await page.evaluate(()=>downloads.length),1);
  assert.equal(await page.locator('#draft').inputValue(),'Unsaved journal');assert.equal(await page.evaluate(()=>localStorage.getItem('test-draft')),'saved draft');
  await page.evaluate(()=>{build='143216';});await page.click('[data-update-check]');await page.waitForFunction(()=>document.querySelector('[data-update-status]').textContent==='Your app is up to date.');assert.equal(await page.locator('[data-update-download]').isVisible(),false);
  await page.evaluate(()=>failCheck=true);await page.click('[data-update-check]');await page.waitForFunction(()=>document.querySelector('[data-update-status]').textContent.includes('Could not check'));assert.equal(await page.locator('[data-update-download]').isVisible(),false);
  await page.click('[data-update-close]');assert.equal(await page.locator('#nativeUpdateDialog216').isVisible(),false);assert.equal(await page.locator('#draft').inputValue(),'Unsaved journal');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS actual update dialog: current/new versions, explicit download handoff, offline retry, close, no reload and untouched drafts');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
