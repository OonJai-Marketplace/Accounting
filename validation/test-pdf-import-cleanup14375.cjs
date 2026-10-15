const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const root=process.cwd(),server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>PDF import test</title>');return}const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}try{res.setHeader('Content-Type',file.endsWith('.mjs')?'text/javascript':file.endsWith('.js')?'text/javascript':'text/html');res.end(fs.readFileSync(file))}catch{res.writeHead(404).end()}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:'/tmp/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(()=>{window.workerStats={created:0,terminated:0};const Native=Worker;window.Worker=class extends Native{constructor(...args){super(...args);workerStats.created++}terminate(){if(!this.didTerminate){this.didTerminate=true;workerStats.terminated++}return super.terminate()}}});
  for(const name of ['assets/vendor/document14285/jspdf.umd.min.js','src/documents/import-export/document-import-v1422-standalone.js'])await page.addScriptTag({url:'/'+name});
  const result=await page.evaluate(async()=>{
   const makePdf=()=>{const doc=new jspdf.jsPDF();doc.text('PDF import recovery',20,20);return doc.output('arraybuffer')};
   const valid=makePdf(false),encrypted=await (await fetch('/validation/fixtures14285/encrypted14375.pdf')).arrayBuffer(),records=[];
   async function attempt(label,bytes,options={},shouldFail=false){let error=null,value;try{value=await Promise.race([importDocument1422(new File([bytes],'test.pdf'),options),new Promise((_,reject)=>setTimeout(()=>reject(Error('TEST TIMEOUT')),15000))])}catch(e){error=e.message}if(error==='TEST TIMEOUT')throw Error(label+' hung');if(shouldFail!==!!error)throw Error(label+': unexpected result '+error);if(workerStats.created!==workerStats.terminated)throw Error(label+': worker leaked '+JSON.stringify(workerStats));records.push({label,error,workers:workerStats.created});return value}
   await attempt('malformed PDF','%PDF-1.7\ninvalid',{},true);
   window.ui117={prompt:async()=>null};await attempt('password cancellation',encrypted,{},true);
   window.ui117.prompt=async()=>{throw Error('prompt unavailable')};await attempt('rejected password prompt',encrypted,{},true);
   let count=0;window.ui117.prompt=async()=>++count===1?'incorrect':count===2?'secret':null;const unlocked=await attempt('wrong password then correct',encrypted);if(count!==2||!unlocked.html.includes('PDF import recovery'))throw Error('Password retry failed');
   const nativeToDataURL=HTMLCanvasElement.prototype.toDataURL;let failedCanvas;HTMLCanvasElement.prototype.toDataURL=function(){failedCanvas=this;throw Error('PNG export failure')};try{await attempt('canvas conversion failure',valid,{pdfMode:'layout'},true)}finally{HTMLCanvasElement.prototype.toDataURL=nativeToDataURL}if(!failedCanvas||failedCanvas.width||failedCanvas.height)throw Error('Failed canvas not released');
   for(const name of ['missing-image','oversized-image']){const bytes=await (await fetch('/validation/fixtures14285/'+name+'14375.pdf')).arrayBuffer();await attempt(name,bytes,{pdfMode:'layout'},true)}
   // Exercise the production 30-second deadline without a 30-second fixture delay.
   const originalTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>originalTimeout(fn,ms===30000?500:ms,...args);
   let ticks=0;const tick=setInterval(()=>ticks++,20);
   try{const bytes=await (await fetch('/validation/fixtures14285/stalled-function14375.pdf')).arrayBuffer();await attempt('non-advancing PostScript lexer',bytes,{pdfMode:'layout'},true)}finally{clearInterval(tick);window.setTimeout=originalTimeout}
   if(ticks<3)throw Error('PDF parsing blocked the UI thread');
   const text=await attempt('text retry',valid);if(!text.html.includes('PDF import recovery'))throw Error('Text retry failed');const layout=await attempt('layout retry',valid,{pdfMode:'layout'});if(!layout.html.includes('data:image/png;base64,'))throw Error('Layout retry failed');return records;
  });assert.deepEqual(errors,[]);assert.equal(result.length,10);console.log('PASS real PDF.js workers: malformed input, password cancel/rejection/retry, canvas failure cleanup, text/layout recovery',JSON.stringify(result));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
