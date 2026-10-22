const assert=require('node:assert/strict'),createFixture=require('./phase0-browser-fixture.cjs');
(async()=>{const fx=await createFixture();try{
 const {page,context,login}=await fx.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let notices=[{noticeId:'login-draft-001',type:'AI Journal draft',title:'Automatic login notification',target:'ai-journal'}],statusReads=0;
 await context.route('**/*',route=>route.request().url().startsWith(fx.base)?route.continue():route.abort());
 await context.route('**/rest/v1/google_inbox143150*',route=>route.fulfill({json:{notices,checked_at:new Date().toISOString(),error:null}}));
 await context.route('**/functions/v1/google-journal-bridge',route=>{const r=route.request().postDataJSON();if(r.action==='status'){statusReads++;return route.fulfill({json:{connected:true,email:'fixture@example.test'}});}if(String(r.path).includes('/values/'))return route.fulfill({json:{values:[['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo']]}});if(String(r.path).includes('fields=sheets'))return route.fulfill({json:{sheets:[{properties:{title:'Accounts',sheetId:1,gridProperties:{rowCount:1000}}}]}});return route.fulfill({json:{}});});
 await login();await page.waitForFunction(()=>window.DriveDrafts143128?.notices().some(n=>n.noticeId==='login-draft-001'));
 assert.equal(await page.evaluate(()=>DriveDrafts143128.view),'journal','login must not redirect to AI Journal');
 await page.waitForFunction(()=>document.querySelector('#gptDrafts143129 [data-connection-status]')?.textContent.includes('Automatic checks active'));
 assert(statusReads>=1);await page.locator('#upcomingBell101').click();await page.getByText('Automatic login notification',{exact:true}).waitFor();await page.locator('#headerNotices104 header button').click();
 notices.push({noticeId:'return-draft-002',type:'AI Journal draft',title:'Return notification',target:'ai-journal'});await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForFunction(()=>DriveDrafts143128.notices().some(n=>n.noticeId==='return-draft-002'));
 await page.evaluate(()=>DriveDrafts143128.open());await page.waitForFunction(()=>document.querySelector('#gptDrafts143129 [data-drive-status]').textContent.includes('0 pending drafts loaded'));
 assert.match(await page.locator('#gptDrafts143129 [data-connection-status]').textContent(),/Last checked/);assert.equal(await page.locator('#gptDrafts143129').evaluate(n=>n.inert),false);
 await page.screenshot({path:'/tmp/ai-refresh-desktop.png',fullPage:true});await page.setViewportSize({width:820,height:1180});await page.screenshot({path:'/tmp/ai-refresh-tablet.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS full-app Chromium: sign-in automatically supplies the bell on Home; return-to-app reads new notices; AI Journal loads without Refresh; connection time and completed status display separately on desktop/tablet. No live financial writes.');
}finally{await fx.close();}})().catch(e=>{console.error(e);process.exitCode=1});
