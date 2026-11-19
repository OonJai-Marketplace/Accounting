const assert=require('node:assert/strict');
const fs=require('node:fs');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const docs=process.env.SAMPLE_METADATA?JSON.parse(process.env.SAMPLE_METADATA):[
   {entry_label:'OJM260002',title:'Test receipt',id:'doc-b',source_page:2},
   {entry_label:'OJM260001',title:'Test receipt',id:'doc-a',source_page:1}
  ];
  const reads=[],images=[],checks=[];let catalog=[...docs];
  await page.route('**/rest/v1/rpc/receipt_login_index',r=>r.fulfill({json:catalog.map(d=>({entry:d.entry_label,stamp:d.id}))}));
  await page.route('**/functions/v1/receipt-drive-preview',r=>{
   checks.push(r.request().postDataJSON().action);return r.fulfill({json:{inspected:0,linking:false,checking:false}});
  });
  await page.route('**/functions/v1/scanner-integration',r=>{
   const b=r.request().postDataJSON();
   if(b.action==='receipt-status')return r.fulfill({json:{entries:(b.entries||[]).map(entry=>({entry,hasDocuments:docs.some(d=>d.entry_label===entry)}))}});
   if(b.action!=='list')throw Error('Unexpected action '+b.action);
   reads.push(b.entry);
   const d=catalog.find(x=>x.entry_label===b.entry);
   return r.fulfill({json:{entry:b.entry,documents:d?[{id:d.id,label:d.entry_label,title:d.title,pages:1}]:[],
    firstPage:d?{selectedPage:0,title:d.title,expires:Date.now()+240000,pages:[{page:+d.source_page,url:fixture.base+'/storage/v1/object/sign/scan-documents208/test/'+d.source_page}]}:undefined}});
  });
  await page.route('**/storage/v1/object/sign/scan-documents208/test/*',r=>{
   const n=Number(r.request().url().split('/').pop());images.push(n);
   if(process.env.SAMPLE_DIRECTORY)return r.fulfill({contentType:'image/jpeg',body:fs.readFileSync(process.env.SAMPLE_DIRECTORY+'/clear-'+(n-1)+'.jpg')});
   return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="40"><rect width="20" height="40" fill="white"/></svg>'});
  });
  await login();
  await page.waitForFunction(()=>window.startup14257?.interactive);
  await page.waitForResponse(res=>res.url().includes('/test/'+docs[1].source_page),{timeout:9000}).catch(()=>{});
  assert.deepEqual(images,docs.map(d=>+d.source_page),'normal login warms linked images in server order');
  assert.deepEqual(checks,['login']);
  const rows=docs.flatMap(d=>[0,1].map(i=>({id:d.entry_label,date:'2026-11-01',account:i?'Cash':'Expense',currency:'LAK',debit:i?0:5,credit:i?5:0,status:'posted'})));
  await page.evaluate(rows=>{
   const s=document.createElement('section');s.style='position:fixed;inset:15% 8%;z-index:3000;background:white;';
   s.innerHTML='<table><tbody id="cache-test"></tbody></table>';document.body.append(s);renderTransactionReviewTable(s.querySelector('tbody'),rows,'none');
  },rows);
  const elapsed=[];
  for(const d of [docs[0],docs[1],docs[0]]){
   const row=page.locator('#cache-test .jr-id226').filter({hasText:d.entry_label});
   const icon=row.locator('.jr-link226');
   await icon.waitFor({state:'visible'});
   const ms=await icon.evaluate(b=>{const t=performance.now();b.click();const v=document.querySelector('.journal-receipts224[open]');if(!v)throw Error('Popup did not open during the click');return performance.now()-t;});elapsed.push(Math.round(ms));
   const popup=page.locator('.journal-receipts224');
   await popup.locator('img[src^="blob:"]').waitFor();
   assert.equal(await popup.locator('h2').innerText(),d.entry_label);
   assert.equal(await popup.locator('.rv-count').innerText(),'Page 1 of 1');
   if(process.env.SAMPLE_DIRECTORY)assert.equal(await popup.locator('img').evaluate(img=>Math.max(img.naturalWidth,img.naturalHeight)),1800);
   await popup.getByRole('button',{name:'Close',exact:true}).click();
  }
  await page.evaluate(()=>{window.dispatchEvent(new Event('focus'));window.dispatchEvent(new Event('page113'));document.dispatchEvent(new Event('scroll'));});
  await page.waitForTimeout(900);
  assert.deepEqual(images,docs.map(d=>+d.source_page));assert.deepEqual(reads,docs.map(d=>d.entry_label));assert.deepEqual(checks,['login']);
  await page.waitForFunction(async key=>(await ReceiptPageCache.entryKeys()).has(key),docs[1].entry_label+':'+docs[1].id);
  async function signInAgain(){
   await page.evaluate(()=>ojmDb.auth.signOut());
   await page.locator('#loginForm button[type=submit]').waitFor({state:'visible'});
   await login();await page.waitForFunction(()=>startup14257.interactive);
  }
  await signInAgain();
  await page.evaluate(()=>ScanViewer208.startLogin());
  await page.waitForTimeout(1200);
  const before=[reads.length,images.length];
  await page.evaluate(e=>JournalReceipts224.open(e),docs[0].entry_label);
  await page.locator('.journal-receipts224 img[src^="blob:"]').waitFor();
  await page.locator('.journal-receipts224 .rv-close').click();
  assert.deepEqual(before,[2,2]);assert.deepEqual([reads.length,images.length],[2,2],'second sign-in reuses encrypted records');
  assert.deepEqual(checks,['login','login']);
  const extra={id:'new-test-page',entry_label:'OJM260099',source_page:1,title:'New receipt fixture'};
  catalog=[extra,...docs];
  await signInAgain();
  await page.waitForFunction(async key=>(await ReceiptPageCache.entryKeys()).has(key),extra.entry_label+':'+extra.id);
  assert.deepEqual(checks,['login','login','login']);assert.deepEqual(reads,[...docs.map(d=>d.entry_label),extra.entry_label]);
  assert.deepEqual(images,[...docs.map(d=>+d.source_page),1]);
  console.log('PASS first sign-in downloads two pages, second sign-in downloads and rechecks zero pages, a new receipt downloads only its own page. Dialog creation (ms)',elapsed.join(', '));
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
