const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();
 await page.route('**/functions/v1/scanner-integration',route=>{const b=route.request().postDataJSON();return route.fulfill({json:{entries:(b.entries||[]).map(entry=>({entry,hasDocuments:entry==='OJM261001'})),staffLines:[]}})});
 await login();await page.evaluate(()=>idleSync14341.run(false));
 const memo='Payment reference BCEL-001 · [Receipt reference](https://example.invalid/receipt)';
 const records=['OJM261001','OJM261002'].flatMap(id=>[0,1].map(i=>({id,dbEntryId:'original-'+id,date:'2026-11-01',generalMemo:'November supplies',memo,currency:'LAK',account:i?'Expense':'Cash',debit:i?0:100,credit:i?100:0})));
 await page.evaluate(rows=>{
  status118.clear();window.rows227=rows;const fixture=document.createElement('section');fixture.id='journal-fixture227';fixture.style='position:fixed;inset:100px 24px 24px;background:white;overflow:auto;z-index:2000;padding:12px';
  fixture.innerHTML='<h2>Journal</h2><table class="clustered-journal-table"><thead><tr><th>Date</th><th>Entry ID</th><th>Account</th><th>Memo / Reference</th><th>Rate</th><th>Debit</th><th>Credit</th></tr></thead><tbody id="journal-body227"></tbody></table>';
  document.getElementById('printableDocArea').append(fixture);window.render227=()=>renderTransactionReviewTable(document.getElementById('journal-body227'),rows227,'edit');render227();
 },records);
 await page.waitForSelector('#journal-body227 .jr-link226:not([hidden])');
 // A redraw with an entry heading used to retain stale menu actions and leave
 // the new Edit/Void buttons in the entry cell instead of decorating that row.
 await page.evaluate(()=>{rows227.forEach(r=>r.dbEntryId='current-'+r.id);render227();});
 assert.equal(await page.locator('#journal-body227 .transaction-review-actions').count(),0,'redraw keeps Edit/Void out of entry cells');
 await page.evaluate(()=>JournalEntryMenu14387.decorate(document.getElementById('journal-body227'),rows227));
 assert.equal(await page.locator('#journal-body227 [data-entry-menu14387]').count(),2);
 const lines=page.locator('#journal-body227 tr[data-line-index]:not(.journal-description14281)');
 assert.equal(await lines.count(),4);
 for(const line of await lines.all()){
  assert((await line.innerText()).includes('Payment reference BCEL-001'),'saved line memo stays in its line');
  assert.equal(await line.locator('a[href="https://example.invalid/receipt"]').count(),1,'saved reference remains clickable on each line');
 }
 assert.deepEqual(await page.locator('#journal-body227 .general-description14281').allTextContents(),['November supplies','November supplies']);
 await page.waitForSelector('#journal-body227 .jr-link226:not([hidden])');
 assert.equal(await page.locator('#journal-body227 .jr-link226:not([hidden])').count(),1);
 await page.evaluate(()=>{window.voidLiveJournalEntry=(...args)=>window.void227=args;window.loadEntryForEdit=id=>window.edit227=id;});
 const id=page.locator('#journal-body227 [data-entry-menu14387="OJM261001"]');
 await id.dblclick();const menu=page.locator('.journal-entry-menu14387');
 assert.deepEqual(await menu.locator('button').allTextContents(),process.env.PHASE0_DEVICE==='tablet'?['View entry','Edit','Void']:['Edit','Void']);
 await menu.getByRole('menuitem',{name:'Void',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>void227),['current-OJM261001','OJM261001'],'redraw uses current record actions');
 await id.dblclick();await menu.getByRole('menuitem',{name:'Edit',exact:true}).click();
 assert.equal(await page.evaluate(()=>edit227),'OJM261001');
 await page.screenshot({path:'/tmp/journal-display227-'+(process.env.PHASE0_DEVICE||'desktop')+'.png'});
 assert.deepEqual(await page.evaluate(()=>rows227.map(({dbEntryId,...r})=>r)),records.map(({dbEntryId,...r})=>r),'rendering leaves saved data unchanged');
 console.log('PASS repeated journal redraw, original Edit/Void menu and current handlers, complete memo/reference text, receipt-only link indicator');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
