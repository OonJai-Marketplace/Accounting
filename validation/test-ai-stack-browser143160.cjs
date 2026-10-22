const assert=require('node:assert/strict'),createFixture=require('./phase0-browser-fixture.cjs');
(async()=>{const fx=await createFixture();try{const {page,context,login}=await fx.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>route.request().url().startsWith(fx.base)?route.continue():route.abort());await login();await page.addStyleTag({content:'#status118{display:none!important}'});
await page.evaluate(()=>{
 const h=['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo'];
 const chart=AccountingStore.accounts.filter(a=>a.isPosting!==false&&a.currency==='LAK').slice(0,2);if(chart.length!==2)throw Error('Fixture needs two LAK accounts');
 window.__aiStack={rows:[h,...['draft-0001','draft-0002'].flatMap((id,i)=>chart.map((a,j)=>[id,'2026-01-09',i?'Supplies':'Withdrawal',j+1,a.id,a.code,'LAK',j?100:0,j?0:100,'2026-01-09',1,'',a.name]))],writes:[]};
 const rpc=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=(name,args)=>{
 if(name==='drive_draft_dispositions143160')return Promise.resolve({data:[]});if(name==='drive_journal_receipt143128')return Promise.resolve({data:null});if(name==='preview_journal_number143114')return Promise.resolve({data:9});
 if(name==='approve_drive_journal_batch143160'){__aiStack.writes.push(args);return Promise.resolve({error:{message:'Fixture: batch retained for inspection'}});}return rpc(name,args);};
 const original=window.fetch;window.fetch=async(url,options)=>{
 if(!String(url).includes('/functions/v1/google-'))return original(url,options);const req=JSON.parse(options.body),path=decodeURIComponent(req.path||'');let data={};
 if(req.action==='status')data={connected:true,email:'fixture@example.test'};else if(path.includes('/values/'))data={values:__aiStack.rows};else if(path.includes('fields=sheets'))data={sheets:['Accounts','Drafts','Posted Archive'].map((title,i)=>({properties:{title,sheetId:i,gridProperties:{rowCount:1000}}}))};return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});
 };DriveDrafts143128.open();
});
await page.locator('[data-draft="draft-0001"] [data-draft-action="edit"]').waitFor();
await page.locator('[data-draft="draft-0001"] [data-draft-action="edit"]').click();await page.waitForFunction(()=>DriveDrafts143128.preparedCount===1);
await page.locator('[data-draft="draft-0002"] [data-draft-action="edit"]').click();await page.waitForFunction(()=>DriveDrafts143128.preparedCount===2);assert.equal(await page.evaluate(()=>DriveDrafts143128.view),'gpt');
await page.locator('[data-preparation]').click();await page.locator('#aiPreparation143160').waitFor({state:'visible'});
const a=page.locator('[data-prepared-draft="draft-0001"]');await a.locator('[data-field="description"]').fill('Reviewed withdrawal');
await page.waitForFunction(()=>document.querySelectorAll('#aiPreparation143160 .account-search1428').length===4);
await a.locator('.account-search1428').first().click();await page.locator('.account-options14266 [role="option"]').last().click();
assert.equal(await a.locator('[data-field="description"]').inputValue(),'Reviewed withdrawal');
const measures=await page.locator('#aiPreparation143160 button.je-btn').evaluateAll(bs=>bs.filter(b=>b.getClientRects().length).map(b=>({label:b.textContent,height:b.getBoundingClientRect().height})));assert.ok(measures.every(x=>Math.abs(x.height-32)<1),JSON.stringify(measures));
await page.screenshot({path:'/tmp/ai-stack-live-desktop.png',fullPage:true});await page.setViewportSize({width:820,height:1180});await page.waitForTimeout(500);assert.equal(await page.locator('#aiPreparation143160 .tx72-meta,#aiPreparation143160 #jeNextIdDisplay,#aiPreparation143160 .tx72-editor').count(),0);assert.equal(await page.locator('#aiPreparation143160 table').first().evaluate(t=>getComputedStyle(t).display),'table');assert.equal(await a.locator('[data-ai-amount]').first().evaluate(t=>getComputedStyle(t).borderTopWidth),'0px');assert.equal(await a.locator('td .oj-date-button104').first().evaluate(t=>getComputedStyle(t).borderTopWidth),'0px');assert.ok(await a.locator('th').nth(2).evaluate(t=>t.getBoundingClientRect().width>=150));await page.screenshot({path:'/tmp/ai-stack-live-tablet.png',fullPage:true});
await page.locator('[data-post-all]').click();await page.waitForFunction(()=>__aiStack.writes.length===1);assert.equal(await page.evaluate(()=>__aiStack.writes[0].p_drafts.length),2);assert.equal(await page.evaluate(()=>DriveDrafts143128.preparedCount),2);assert.deepEqual(errors,[]);console.log('PASS full app Chromium: login, queue two drafts without tab switches, stacked editing, searchable accounts, 32px actions, batch routing and retained edits on failure; desktop/tablet screenshots. No live financial writes.');
}finally{await fx.close();}})().catch(e=>{console.error(e);process.exitCode=1});
