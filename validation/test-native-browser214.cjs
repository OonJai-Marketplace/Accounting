const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const ROOT=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{try{const p=path.join(ROOT,new URL(req.url,'http://localhost').pathname);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':p.endsWith('.css')?'text/css':'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/scanner-chrome/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/scripts/device-vault14334.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.deviceVault14334={unlocked:true,actor:'test-owner',attach:async()=>{},pack:(v)=>({actor:'test-owner',data:v}),unpack:v=>v?.data};`}));
 await page.route('**/assets/vendor/supabase.js*',r=>r.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'test-owner'},access_token:'test'}}})}})};`}));
 await page.route('**/functions/v1/accounting-documents',r=>r.fulfill({json:{connected:false,configured:true}}));
 await page.addInitScript(()=>{
  window.nativeCount=60;window.cancelNative=false;
  const read=()=>JSON.parse(localStorage.getItem('test-native')||'null'),write=j=>localStorage.setItem('test-native',JSON.stringify(j));
  window.ReceiptNative214={available:true,platform:'android',recover:async()=>read(),pending:read,
   scan:async context=>{if(window.cancelNative)return null;const job={...context,id:crypto.randomUUID(),paths:Array.from({length:window.nativeCount},(_,i)=>'file:///scan/'+i+'.jpg'),acknowledged:[]};write(job);return job;},
   readPage:async()=>{const c=document.createElement('canvas');c.width=300;c.height=400;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,300,400);x.fillStyle='black';x.fillText('Native scan fixture',30,40);return c.toDataURL('image/jpeg');},
   acknowledge:async(job,i)=>{const j=read();j.acknowledged.push(i);write(j);},
   complete:async job=>{if(read().acknowledged.length!==job.paths.length)throw Error('Premature deletion');localStorage.removeItem('test-native');}
  };
 });
 const idle=()=>page.waitForFunction(()=>window.ReceiptScanner202&&!ReceiptScanner202.state.busy);
 const click=async s=>{await page.click(s);await idle();};
 await page.goto('http://127.0.0.1:'+server.address().port+'/scan.html?entry=OJM26-0100');
 await page.waitForFunction(()=>window.ReceiptScanner202?.state.draft?.pages.length===60);await idle();
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pending.length),0);
 assert.equal(await page.evaluate(()=>new Set(ReceiptScanner202.state.draft.pages.map(p=>p.group)).size),1);
 await page.evaluate(()=>{window.nativeCount=2;});await click('#scanDialog [data-scan=next]');
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),62);
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.groups.at(-1).label),'OJM26-0101');
 const before=await page.evaluate(()=>ReceiptScanner202.state.draft.pages.at(-1).id);
 await page.evaluate(()=>{window.cancelNative=true;});await click('#scanDialog [data-scan=retake-page211]');
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.at(-1).id),before);
 assert.match(await page.locator('#scanStatus').innerText(),/cancelled/);
 assert.equal(await page.locator('#finalScan').count(),1,'cancelled retake reopens the retained scan');
 await page.reload();await idle();
 assert.equal(await page.evaluate(()=>ReceiptScanner202.state.draft.pages.length),62);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);
 console.log('PASS actual phone UI: 60 native pages, next-entry naming, cancelled retake, reload recovery, no extra page confirmations and 390px layout');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
