const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[],api=[],images=[],pdfReads=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('drive.google.com'))pdfReads.push(r.url());});
 const main='OJM260700',source='RY260042',docs=[{id:'document-main',label:main,title:'November receipts',pages:6},{id:'document-source',label:source,title:'Ryan submission',pages:2}];let failImage=true,failList=false,hold=null,viewStarted=false;
 await page.route('**/functions/v1/scanner-integration',async route=>{const b=route.request().postDataJSON();if(b.action==='receipt-status')return route.fulfill({json:{entries:(b.entries||[]).map(entry=>({entry,hasDocuments:entry===main})),staffLines:[]}});api.push(b);assert.ok(['list','view'].includes(b.action),'viewer only reads');
  if(b.action==='list'){if(failList)return route.fulfill({status:503,json:{error:'Connection interrupted.'}});await new Promise(r=>setTimeout(r,350));return route.fulfill({json:{entry:b.entry,documents:b.entry==='EMPTY'?[]:b.entry==='SLOW'?[{...docs[0],id:'document-slow'}]:docs}});}
  if(b.id==='document-slow'){viewStarted=true;if(hold)await hold;}
  const d=docs.find(d=>d.id===b.id)||{...docs[0],id:b.id};return route.fulfill({json:{title:d.title,label:d.label,expires:Date.now()+240000,pdf:'https://drive.google.com/file/d/monthly-fixture/view',pages:Array.from({length:d.pages},(_,i)=>({label:d.label+String.fromCharCode(65+i),page:20+i,url:f.base+'/storage/v1/object/sign/scan-documents208/'+d.id+'/'+i+'.jpg'}))}});
 });
 await page.route('**/storage/v1/object/sign/scan-documents208/**',route=>{images.push(route.request().url());if(failImage&&route.request().url().includes('document-source/0.jpg')){failImage=false;return route.fulfill({status:503,body:'offline'});}return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="'+(route.request().url().endsWith('/1.jpg')?'220':'1100')+'"><rect width="600" height="'+(route.request().url().endsWith('/1.jpg')?'220':'1100')+'" fill="white"/><text x="50" y="70" font-size="28">Receipt preview fixture</text><path d="M50 120H550M50 170H550M50 220H550" stroke="#aaa"/><text x="50" y="320" font-size="24">Total: 125,000 LAK</text></svg>'});});
 await login();await page.evaluate(()=>idleSync14341.run(false));assert.equal(await page.evaluate(()=>JournalReceipts224.enabled()),true);assert.equal(api.length,0,'journal rendering does not download every receipt');
 const rows=[{id:main,dbEntryId:'journal-fixture',date:'2026-11-01',accountId:'cash',account:'Cash',currency:'LAK',debit:125000,credit:0,generalMemo:'Receipt navigation',memo:'Purchase',status:'posted'},{id:main,dbEntryId:'journal-fixture',date:'2026-11-01',accountId:'equity',account:'Equity',currency:'LAK',debit:0,credit:125000,generalMemo:'Receipt navigation',memo:'Payment',status:'posted'}];
 await page.evaluate(rows=>{window.receiptRows224=rows;const fixture=document.createElement('section');fixture.id='receipt-test224';fixture.style='position:fixed;inset:160px 40px 40px;z-index:2000;background:white;overflow:auto';fixture.innerHTML='<h2>History — closed period</h2><table><tbody id="receipt-history224"></tbody></table>';document.body.append(fixture);renderTransactionReviewTable(document.getElementById('receipt-history224'),rows,'none');},rows);
 await page.locator('#receipt-history224 .jr-link226').waitFor();assert.equal(await page.locator('#receipt-history224').getByRole('button',{name:'Edit',exact:true}).count(),0,'closed History keeps edit unavailable');await page.locator('#receipt-history224 .jr-link226').click();
 const viewer=page.locator('.journal-receipts224');await viewer.waitFor();assert.equal(await viewer.evaluate(n=>{const r=n.getBoundingClientRect();return Math.abs((innerWidth-r.width)/2-r.left)<2&&r.top>=0&&r.bottom<=innerHeight;}),true,'receipt popup is centered within the viewport');await viewer.getByRole('status').filter({hasText:'Opening receipts'}).waitFor();await viewer.locator('img').waitFor();
 const control=name=>viewer.getByRole('button',{name,exact:true});
 const bounds=()=>viewer.evaluate(n=>['h2','.rv-count','.rv-prev','.rv-next','.rv-close'].map(s=>{
  const {x,y,width,height}=n.querySelector(s).getBoundingClientRect();return [x,y,width,height];
 }));
 const fixed=await bounds();
 assert.equal(await viewer.locator('h2').innerText(),main);
 assert.equal(await viewer.locator('.rv-count').innerText(),'Page 1 of 8');
 assert(await control('Previous').isDisabled());assert.deepEqual(images.length,1);
 assert.deepEqual(pdfReads,[],'showing an image never fetches the PDF');
 await control('Enlarge').click();
 assert(await viewer.locator('.rv-stage').evaluate(n=>n.scrollHeight>n.clientHeight));
 assert.deepEqual(await bounds(),fixed,'enlargement preserves controls');
 await page.keyboard.press('Escape');assert(await control('Enlarge').isVisible());
 for(let i=1;i<6;i++){
  await control('Next').click();
  await viewer.locator('img').waitFor();
  assert.equal(await viewer.locator('img').count(),1);
  assert.deepEqual(await bounds(),fixed,'portrait and landscape receipts use the same controls');
 }
 await control('Next').click();await viewer.getByRole('alert').waitFor();
 assert.equal(await viewer.locator('.rv-count').innerText(),'Page 7 of 8');
 assert.deepEqual(await bounds(),fixed,'an image error stays inside the stage');
 await control('Retry').click();await viewer.locator('img').waitFor();
 assert.match(await viewer.locator('.rv-caption').innerText(),/RY260042/);
 await control('Next').click();await viewer.locator('img').waitFor();
 assert(await control('Next').isDisabled());await control('Previous').click();
 await viewer.locator('img').waitFor();assert.equal(await viewer.locator('h2').innerText(),main);
 await page.screenshot({path:'/tmp/journal-receipts224-'+(process.env.PHASE0_DEVICE||'desktop')+'.png'});
 await viewer.getByRole('button',{name:'Close',exact:true}).click();await page.evaluate(()=>document.getElementById('receipt-test224').remove());
 // Ledger Entry ID still opens journal details; receipts and accounting source details are separate actions.
 await page.evaluate(({main,rows})=>showJournalSource69(encodeURIComponent(main),rows),{main,rows});await page.locator('#source69').waitFor();assert.equal(await page.locator('#source69').getByRole('button',{name:'Source details',exact:true}).count(),1);await page.locator('#source69').getByRole('button',{name:'Receipts',exact:true}).click();await viewer.locator('img').first().waitFor();await viewer.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('#source69').isVisible(),true,'closing receipts preserves ledger details');await page.locator('#source69').getByRole('button',{name:'Close',exact:true}).click();
 failList=true;await page.evaluate(()=>JournalReceipts224.open('EMPTY'));await viewer.getByRole('alert').waitFor();failList=false;await viewer.getByRole('button',{name:'Retry',exact:true}).click();await viewer.getByText('No receipts are linked to this entry yet.').waitFor();await viewer.getByRole('button',{name:'Close',exact:true}).click();
 let release;hold=new Promise(r=>release=r);await page.evaluate(()=>void JournalReceipts224.open('SLOW'));await viewer.getByText('Loading receipt…').waitFor();for(let i=0;!viewStarted&&i<40;i++)await page.waitForTimeout(25);assert.ok(viewStarted);await viewer.getByRole('button',{name:'Close',exact:true}).click();release();hold=null;await page.waitForTimeout(150);assert.equal(await viewer.isVisible(),false);assert.equal(await viewer.locator('img').count(),0,'late result cannot restore closed images');
 await page.evaluate(main=>JournalReceipts224.open(main),main);await viewer.locator('img').first().waitFor();await control('Enlarge').click();await page.evaluate(()=>{window.originalActor224=liveProfile.id;liveProfile.id='different-account';window.dispatchEvent(new Event('account-access477'));});await page.waitForFunction(()=>!document.querySelector('.journal-receipts224[open]'));assert.equal(await viewer.locator('img').count(),0);await page.evaluate(()=>liveProfile.id=originalActor224);
 assert.deepEqual(pdfReads,[]);assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>receiptRows224),rows,'viewing never changes journal values');
 const phone=await f.open('phone','staff');await phone.login();assert.equal(await phone.page.evaluate(()=>typeof window.JournalReceipts224),'undefined','phone does not load the desktop receipt viewer');assert.equal(await phone.page.evaluate(()=>typeof window.ScanViewer208.open),'function','existing phone viewer remains available');
 console.log('PASS journal/closed History actions, ledger source navigation, fixed across-document paging, on-demand private images, external captions, zoom, retry, close/account isolation, unchanged journal values and phone viewer');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
