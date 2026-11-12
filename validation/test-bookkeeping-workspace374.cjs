const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();page.on('pageerror',e=>console.error('Browser:',e.message));
 await page.route('**/rest/v1/rpc/reconciliation_workspace306',r=>r.fulfill({json:{months:[],month:null,progress:{items:[]}}}));
 await login();await page.waitForFunction(()=>window.startup14257?.interactive);
 await page.keyboard.press('Control+Alt+b');await page.keyboard.press('j');
 const tabs=page.locator('#categoryTabs [data-section14378]');
 const labels=['Journal','Submitted','Reconcile','Data Check','Closing','Budget','Documents','Recurring','Amortization','To-do List','Audits'];
 await page.waitForFunction(()=>document.querySelectorAll('#categoryTabs [data-section14378]').length===11);
 assert.deepEqual(await tabs.allTextContents(),labels);
 for(const [tab,area] of [['Journal','journal'],['Submitted','submitted'],['Budget','budget']]){
  await page.locator('#categoryTabs [data-section14378="'+tab+'"]').click();
  await page.locator('.tab-content.active [data-book-history="'+area+'"]').click({timeout:12000});
  await page.waitForFunction(([area,tab])=>budgetWorkflow14316.historyTab===area&&document.querySelector('.tab-content.active').id==='transactions-all'&&document.querySelector('#categoryTabs .active').textContent===tab,[area,tab]);
  assert.deepEqual(await tabs.allTextContents(),labels);console.log(tab,'history and navigation verified');
 }
 await page.keyboard.press('Control+Alt+b');await page.keyboard.press('r');
 await page.locator('#reconciliationList71 button:has-text("History")').click();
 await page.locator('#reconciliationLocalHistory [data-reconciliation-summary306]').waitFor();
 await page.getByRole('button',{name:'Back to Reconcile'}).click();assert(await page.locator('#reconciliationList71').isVisible());
 for(const label of labels.slice(7)){await page.locator('#categoryTabs [data-section14378="'+label+'"]').click();assert.equal(await page.locator('#categoryTabs button.active').textContent(),label);}
 await page.locator('#nav-module-transactions .nav-header').click();assert.equal(await page.locator('#groupMenu14388:visible,#nav-module-transactions .grouped-children14378:visible,#gptDrafts143129,#hr-ai-inbox').count(),0);
 await page.evaluate(()=>switchTab('settings-accounting'));
 await page.waitForFunction(()=>document.querySelector('#googleSheets143129 .receipt-drive228'));
 assert.equal(await page.locator('#googleSheets143129 [data-connect-sheets228],#googleSheets143129 [data-sheet]').count(),0);
 console.log('All bookkeeping routes, receipt settings, sidebar and reconciliation history passed.');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
