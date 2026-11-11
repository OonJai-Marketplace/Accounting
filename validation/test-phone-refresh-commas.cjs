const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..');
const published = JSON.parse(fs.readFileSync(path.join(root,'release-version.json'))).version;
const nextVersion = published.split('.').map((n,i)=>i?Number(n)+1:n).join('.');
let version = '1.0', latest = false;
const legacy = `
  self.addEventListener('install',e=>e.waitUntil((async()=>{
    const c=await caches.open('legacy-phone');await c.add('phone.html');await self.skipWaiting();
  })()));
  self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
  self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname.endsWith('/phone.html'))e.respondWith(caches.match('phone.html'));});
`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://fixture'),file=url.pathname.slice(1);
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');
  if(file==='release-version.json') return res.end(JSON.stringify({version,changes:['Test phone update']}));
  if(file==='phone-sw.js')return res.end(latest?fs.readFileSync(path.join(root,file),'utf8').replace("const VERSION='"+published+"'","const VERSION='"+version+"'"):legacy);
  if(file==='phone.html')return res.end('<h1>Phone '+version+'</h1>');
  if(file==='update.html'||file==='scripts/update14390.js')return res.end(fs.readFileSync(path.join(root,file)));
  res.end('fixture asset');
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
  try{
    const context=await browser.newContext({userAgent:'Mozilla/5.0 (Linux; Android 13) Chrome/143 Mobile Safari/537.36'});
    const page=await context.newPage(),base='http://127.0.0.1:'+server.address().port;
    await page.goto(base+'/phone.html');
    await page.evaluate(async()=>{
      localStorage.setItem('fixture-draft','331000');
      await navigator.serviceWorker.register('phone-sw.js?v=1.0');
      await navigator.serviceWorker.ready;
    });
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    latest=true;version=published;
    await page.reload();
    assert.equal(await page.locator('h1').innerText(),'Phone 1.0','ordinary refresh reproduces old cached page');
    await page.goto(base+'/update.html');
    await page.waitForURL('**/phone.html?v='+published,{timeout:30000});
    assert.equal(await page.locator('h1').innerText(),'Phone '+published);
    assert.equal(await page.evaluate(()=>localStorage.getItem('fixture-draft')),'331000');
    assert((await page.evaluate(()=>navigator.serviceWorker.controller.scriptURL)).includes('phone-sw.js'));
    version=nextVersion;
    await page.reload();
    await page.waitForURL('**/phone.html?v='+nextVersion,{timeout:30000});
    assert.equal(await page.locator('h1').innerText(),'Phone '+nextVersion);
    await context.setOffline(true);await page.reload();
    assert.equal(await page.locator('h1').innerText(),'Phone '+nextVersion);
    assert.equal(await page.evaluate(()=>localStorage.getItem('fixture-draft')),'331000');
    console.log('PASS cached old phone, update link installs phone release, normal reload finds next version, draft and offline reopening preserved');
  }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
