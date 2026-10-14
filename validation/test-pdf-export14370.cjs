// Exercise the actual canvas-to-PDF export, then parse and render with shipped PDF.js.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',file.endsWith('.mjs')||file.endsWith('.js')?'application/javascript':'text/html');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:'+server.address().port+'/pdf-export-fixture-not-found');
  await page.setContent('<div id="body105"><div class="page" style="width:794px;height:1123px;background:white;color:black"><h1>Portrait export</h1><table><tr><td>Amount</td><td>123.45</td></tr></table></div><div class="page" style="width:1123px;height:794px;background:white;color:black"><h1>Landscape export</h1></div></div>');
  await page.addScriptTag({path:path.join(root,'src/documents/import-export/document-downloads14311.js')});
  const result=await page.evaluate(async()=>{
   const blob=await documentDownloads14311.pdf(document),bytes=new Uint8Array(await blob.arrayBuffer());
   const lib=await import('/assets/vendor/document14285/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc='/assets/vendor/document14285/pdf.worker.min.mjs';
   const loading=lib.getDocument({data:bytes,useWasm:false,isEvalSupported:false}),pdf=await loading.promise,pages=[];
   for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),v=p.getViewport({scale:0.5}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;const ctx=c.getContext('2d');await p.render({canvasContext:ctx,viewport:v}).promise;const data=ctx.getImageData(0,0,c.width,c.height).data;let ink=0;for(let j=0;j<data.length;j+=4)if(data[j]<200&&data[j+1]<200&&data[j+2]<200)ink++;pages.push({width:v.width*2,height:v.height*2,ink});}
   await loading.destroy();return {type:blob.type,size:blob.size,version:jspdf.jsPDF.version,pages};
  });
  assert.equal(result.version,'4.2.1');assert.equal(result.type,'application/pdf');assert.ok(result.size>1000);assert.equal(result.pages.length,2);
  for(const [i,p] of result.pages.entries()){assert.ok(p.ink>100,'Rendered page contains document pixels');assert.ok(Math.abs(p.width-[794,1123][i]*0.75)<1);assert.ok(Math.abs(p.height-[1123,794][i]*0.75)<1)}
  console.log('PASS real PDF export: '+JSON.stringify(result));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
