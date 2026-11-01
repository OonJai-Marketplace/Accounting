const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),calls=[],images=[];let fail=false,hold=null,started=false;
 const linked='OJM261001',missing='OJM261002',unknown='OJM261003';
 await page.route('**/functions/v1/scanner-integration',async route=>{
  const b=route.request().postDataJSON();calls.push(b);
  if(b.action==='receipt-status'){
   if(hold){started=true;await hold;}
   if(fail)return route.fulfill({status:503,json:{error:'Connection interrupted'}});
   return route.fulfill({json:{entries:(b.entries||[]).map(entry=>({entry,hasDocuments:entry===linked?true:entry===unknown?null:false})),staffLines:[]}});
  }
  if(b.action==='list')return route.fulfill({json:{entry:b.entry,resolved:true,documents:b.entry===linked?[{id:'fixture-document',label:linked,title:'Receipt fixture',pages:1}]:[]}});
  assert.equal(b.action,'view');return route.fulfill({json:{label:linked,title:'Receipt fixture',expires:Date.now()+180000,pages:[{label:linked+'A',page:1,url:f.base+'/storage/v1/object/sign/scan-documents208/fixture/page.jpg'}]}});
 });
 await page.route('**/storage/v1/object/sign/scan-documents208/**',route=>{images.push(route.request().url());return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="700"><rect width="500" height="700" fill="white"/><text x="25" y="60">Receipt fixture</text></svg>'})});
 await login();await page.evaluate(()=>idleSync14341.run(false));
 const rows=[linked,missing,unknown].flatMap(id=>[{id,date:'2026-11-01',generalMemo:'Receipt indicator '+id,memo:'',currency:'LAK',account:'Cash',debit:100,credit:0,dbEntryId:'uuid-'+id},{id,date:'2026-11-01',generalMemo:'Receipt indicator '+id,memo:'',currency:'LAK',account:'Expense',debit:0,credit:100,dbEntryId:'uuid-'+id}]);
 await page.evaluate(rows=>{
  status118.clear();window.iconRows226=rows;const fixture=document.createElement('section');fixture.id='icons-fixture226';fixture.style='position:fixed;inset:130px 30px 30px;background:white;overflow:auto;z-index:2000;padding:14px';
  fixture.innerHTML='<h2>Journal — supporting documents</h2><table><tbody id="icons-body226"></tbody></table><p>Ledger entry: <button class="r79-link" data-entry="OJM261001" id="ledger-id226">OJM261001</button></p>';document.body.append(fixture);renderTransactionReviewTable(document.getElementById('icons-body226'),rows,'edit');document.getElementById('ledger-id226').onclick=()=>window.ledgerClicks226=(window.ledgerClicks226||0)+1;
 },rows);
 const icon=id=>page.locator('#icons-body226 .jr-link226[data-receipt-key226="entry:'+id+'"]');
 await page.waitForFunction(()=>document.querySelector('#icons-body226 .jr-link226[data-receipt-key226="entry:OJM261001"]')?.dataset.receiptState226==='linked');
 assert.equal(await icon(missing).getAttribute('data-receipt-state226'),'missing');assert.equal(await icon(missing).isVisible(),false,'no icon for entries without documents');
 assert.equal(await icon(unknown).getAttribute('data-receipt-state226'),'unknown');
 assert.equal(await page.locator('#icons-body226 .jr-link226').count(),3,'one icon per entry, not per journal line');
 assert(calls.some(c=>c.action==='receipt-status'&&[linked,missing,unknown].every(id=>c.entries.includes(id))),'visible IDs are checked together');
 assert.equal(images.length,0);assert.equal(calls.filter(c=>c.action==='view'||c.action==='list').length,0,'indicators do not open previews');
 const position=await icon(linked).evaluate(b=>{const label=b.previousElementSibling.getBoundingClientRect(),icon=b.getBoundingClientRect();return {right:icon.left>=label.right,aligned:Math.abs((icon.top+icon.bottom-label.top-label.bottom)/2)<3,width:icon.width}});
 assert(position.right&&position.aligned);assert.equal(position.width,32);
 await page.screenshot({path:'/tmp/receipt-icons226-'+(process.env.PHASE0_DEVICE||'desktop')+'.png'});
 await page.locator('#icons-body226 [data-entry-menu14387]').first().dblclick();assert.equal(await page.locator('.journal-entry-menu14387').getByRole('menuitem',{name:'Receipts',exact:true}).count(),0);await page.keyboard.press('Escape');
 await icon(linked).click();await page.locator('.journal-receipts224 img').waitFor();assert.equal(images.length,1);assert.equal(await page.locator('.journal-entry-menu14387').count(),0);
 await page.locator('.journal-receipts224').getByRole('button',{name:'Close',exact:true}).click();
 assert.equal(await icon(missing).isVisible(),false);
 await page.locator('#ledger-id226').click();assert.equal(await page.evaluate(()=>ledgerClicks226),1,'ledger ID keeps its own navigation');
 await page.locator('#ledger-id226 + .jr-link226').click();await page.locator('.journal-receipts224 img').waitFor();assert.equal(await page.evaluate(()=>ledgerClicks226),1);await page.locator('.journal-receipts224').getByRole('button',{name:'Close',exact:true}).click();
 fail=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>[...document.querySelectorAll('#icons-body226 .jr-link226')].every(b=>b.dataset.receiptState226==='unknown'),'connection failure never indicates missing');
 fail=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await page.waitForFunction(()=>document.querySelector('#icons-body226 .jr-link226[data-receipt-key226="entry:OJM261001"]').dataset.receiptState226==='linked');
 let release;hold=new Promise(r=>release=r);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
 for(let i=0;!started&&i<80;i++)await page.waitForTimeout(25);assert(started);
 await page.evaluate(()=>{window.originalActor226=liveProfile.id;liveProfile.id='different-actor';deviceVault14334.unlocked=false;});
 await page.waitForFunction(()=>[...document.querySelectorAll('#icons-body226 .jr-link226')].every(b=>b.dataset.receiptState226==='unknown'));
 release();hold=null;await page.waitForTimeout(300);
 assert.equal(await icon(linked).getAttribute('data-receipt-state226'),'unknown','late response cannot restore another account status');
 assert.deepEqual(await page.evaluate(()=>iconRows226),rows);
 console.log('PASS link icon only for attached receipts, batch metadata, hidden missing/unverified links, row menu replacement, no image prefetch, ledger action, retries and account isolation');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
