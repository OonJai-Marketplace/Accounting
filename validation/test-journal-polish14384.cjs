const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();
for(const width of [1440,1024]){
 await page.setViewportSize({width,height:900});
 await page.evaluate(()=>{clearJournalEntry();switchTab('sub-users-home14229')});
 await page.locator('#nav-module-transactions>.nav-header').click();
 await page.waitForFunction(()=>document.getElementById('journal').classList.contains('active'));
 const book=await page.evaluate(()=>({active:[...document.querySelectorAll('#appSidebar .active-category')].map(n=>n.id),expanded:document.querySelector('#nav-module-transactions>.nav-header').getAttribute('aria-expanded')}));
 assert.deepEqual(book.active,['nav-module-transactions']);assert.equal(book.expanded,'true');
 await page.locator('#nav-module-settings>.nav-header').click();
 await page.waitForFunction(()=>document.getElementById('settings-business').classList.contains('active'));
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#appSidebar .groups-open14378')].map(n=>n.id)),['nav-module-settings']);
 await page.locator('#nav-module-sub-users>.nav-header').click();
 await page.waitForFunction(()=>document.querySelector('.tab-content.active')?.id.startsWith('sub-users'));
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('#appSidebar .groups-open14378')].map(n=>n.id)),[]);
 const headers=[];
 for(const target of ['journal','sub-users-home14229']){
  await page.evaluate(t=>{switchTab(t);const filler=document.createElement('div');filler.className='test-spacer14384';filler.style.height='1800px';document.querySelector('.tab-content.active').append(filler)},target);
  await page.waitForTimeout(100);
  await page.evaluate(()=>{document.querySelector('.workspace-scroll').scrollTop=350});
  await page.waitForTimeout(100);
  headers.push(await page.evaluate(t=>{const n=t==='journal'?document.getElementById('categoryTabShell'):document.querySelector('.tab-content.active>.team-tabs14230'),b=n.querySelector(t==='journal'?'.category-tab.active':'button[aria-current=page]'),s=getComputedStyle(b);return {height:n.getBoundingClientRect().height,top:n.getBoundingClientRect().top,scrollTop:document.querySelector('.workspace-scroll').getBoundingClientRect().top,bg:s.backgroundColor,color:s.color,border:s.borderBottomColor}},target));
  await page.evaluate(()=>{document.querySelectorAll('.test-spacer14384').forEach(n=>n.remove());document.querySelector('.workspace-scroll').scrollTop=0});
 }
 assert.equal(headers[0].height,54);assert.equal(headers[1].height,54);assert.equal(headers[0].bg,headers[1].bg);assert.equal(headers[0].color,headers[1].color);assert.equal(headers[0].border,headers[1].border);for(const h of headers)assert.ok(Math.abs(h.top-h.scrollTop)<=1,JSON.stringify(h));
 await page.evaluate(()=>{switchTab('journal');const s=document.querySelector('.voucher-pick14299 select');s.replaceChildren(new Option('No voucher',''),new Option('H-000001','fixture-voucher'));dropdown1434.open(s)});
 const dropdown=await page.evaluate(()=>{const field=document.querySelector('.voucher-pick14299 input.account-search1428'),box=document.querySelector('.account-list1428');return {field:field.getBoundingClientRect().width,box:box.getBoundingClientRect().width}});assert.ok(Math.abs(dropdown.field-dropdown.box)<=1,JSON.stringify(dropdown));await page.evaluate(()=>dropdown1434.close());
 const main=await page.evaluate(()=>{const n=document.querySelector('#journal .transaction-pages14340'),r=n.getBoundingClientRect(),b=n.lastElementChild.getBoundingClientRect();return {right:r.right-b.right,padding:getComputedStyle(n).padding,gap:getComputedStyle(n).gap}});
 await page.evaluate(()=>openWorkspaceUser(availableSubUsers().find(u=>u.id!==liveProfile.id).id));await page.waitForSelector('#personalWorkspace1437');
 await page.evaluate(()=>{const u=availableSubUsers().find(u=>u.id!==liveProfile.id);personalJournal1437.show(u.id,'journal');tablePagination14383.scan()});
 await page.waitForSelector('.personal-active1437 .table-pages14383');
 const personal=await page.evaluate(()=>{const n=document.querySelector('.personal-active1437 .table-pages14383'),r=n.getBoundingClientRect(),b=n.lastElementChild.getBoundingClientRect();return {right:r.right-b.right,padding:getComputedStyle(n).padding,gap:getComputedStyle(n).gap}});assert.deepEqual(personal,main);
 await page.screenshot({path:'/workspace/scratch/8d0ff51857bf/personal-polish-'+width+'.png'});
}
assert.deepEqual(errors,[]);console.log('PASS exclusive sidebar navigation, shared 54px sticky headers, fitted voucher dropdown and matching journal pagination at 1440/1024');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
