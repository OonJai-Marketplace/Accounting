const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
const views=['dashboard','journal','journal-submissions','fund-allocation','period-review','scheduled-journals','budget-request','sub-users-workspace','accounts-modular-container','payroll-employees','payroll-entries','payroll-history','report-tb','report-gl','report-pl','news-events','document-editor105','tax-overview','app-settings'];
async function metrics(page){
 return page.evaluate(()=>{
  const nav=document.querySelector('#appSidebar'),work=document.querySelector('.app-layout>.main-content-area');
  const n=nav.getBoundingClientRect(),w=work.getBoundingClientRect(),logo=nav.querySelector('#companyLogo101')?.getBoundingClientRect();
  const visible=e=>e&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
  return {rail:n.width,x:w.x,width:w.width,logoOffset:logo?Math.abs(logo.x+logo.width/2-n.x-n.width/2):null,menu:visible(nav.querySelector('.nav-rail-toggle291'))||false,full:!!document.querySelector('#dashFull112'),raw:[...nav.querySelectorAll('#nav-module-transactions>.nav-links button')].filter(visible).map(b=>b.textContent.trim()),active:document.querySelector('.tab-content.active')?.id};
 });
}
async function routeTest(device,role='admin'){
 const tablet=device.startsWith('tablet');process.env.PHASE0_DEVICE=tablet?'tablet':'desktop';
 const f=await fixture();try{
  const {page,context,login}=await f.open(device==='phone'?'phone':'desktop',role);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await login();
  if(device==='phone'){assert.equal(await page.locator('#dashFull112,.nav-rail-toggle291').count(),0);console.log('phone shell remains separate');return;}
  if(device==='tablet-portrait')await page.setViewportSize({width:768,height:1024});
  if(device==='laptop')await page.setViewportSize({width:1024,height:730});
  const allowed=await page.evaluate(()=>[...document.querySelectorAll('.tab-content[id]')].map(v=>v.id));
  const tested=[];
  const tabs=role==='admin'?[...new Set([...views.filter(v=>allowed.includes(v)),...allowed.filter(v=>!v.startsWith('template'))])]:['sub-users-workspace'];
  for(const view of tabs){
   await page.evaluate(id=>switchTab(id),view);
   await page.mouse.move(400,68);
   const before=await metrics(page);
   if(!before.active||before.active!==view)continue;
   if(tablet)await page.getByRole('button',{name:'Expand navigation',exact:true}).click();
   else await page.mouse.move(20,150);
   const after=await metrics(page);
   assert.equal(before.full,false,view+' Full screen control');assert.equal(before.rail,52,view+' collapsed width');
   assert.equal(before.menu,tablet,view+' device toggle');assert.ok(before.logoOffset<=1.5,view+' collapsed logo offset '+before.logoOffset);
   assert.equal(after.rail,tablet?238:52,view+' navigation width after interaction');
   assert.ok(before.x===after.x&&before.width===after.width,view+' workspace shifted');assert.deepEqual(after.raw,[],view+' duplicate Bookkeeping links');
   if(tablet)await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
   else await page.mouse.move(400,68);
   tested.push(view);
  }
  console.log(device,role,'screens',tested.length,tested.join(','));assert.ok(tested.length>=(role==='admin'?10:1));
  if(!tablet){
   const tip=page.locator('.rail-hover-label');
   const icons=page.locator('#appSidebar .nav-header:visible');
   for(const offline of [false,true]){
    await context.setOffline(offline);
    for(const icon of await icons.all()){
     await icon.hover();
     assert.equal(await tip.innerText(),await icon.getAttribute('aria-label'));
     assert.ok(await tip.isVisible());
     const bounds=await tip.boundingBox();assert.ok(bounds.x>=52&&bounds.y>=0);
     assert.equal((await metrics(page)).rail,52);
    }
   }
   await page.keyboard.press('Escape');assert.ok(await tip.isHidden());
   const search=page.locator('.rail-search-button');
   await search.click();
   const input=page.getByRole('searchbox',{name:'Search entire system'});
   const field=await input.boundingBox();assert.ok(field.x>=52,'search opens beside the rail');
   await input.fill('sync');
   const result=page.locator('.universal-search108 button').filter({hasText:'Sync / Connection details'});
   await result.waitFor({state:'visible'});
   assert.ok(await result.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'search results must be fully clickable');
   await page.keyboard.press('Escape');assert.ok(await input.isHidden());assert.ok(await search.evaluate(b=>b===document.activeElement));
   await page.keyboard.press('Tab');assert.ok(await tip.isVisible());assert.equal((await metrics(page)).rail,52);
   if(role==='admin'){
    const books=page.locator('#nav-module-transactions>.nav-header');
    await books.focus();await page.keyboard.press('Enter');
    const menu=page.locator('#groupMenu14388');
    assert.deepEqual(await menu.locator('button').evaluateAll(bs=>bs.map(b=>b.dataset.group14388)),['Journal','Upcoming','History']);
    await menu.locator('[data-group14388="Upcoming"]').click();
    assert.equal((await metrics(page)).active,'transactions-recurring');
   }
   await context.setOffline(false);
   console.log('PASS labels online and offline, keyboard, search hit testing, fixed workspace');
  }
  if(role==='admin'){
   await page.evaluate(()=>{switchTab('journal');clearJournalEntry();entry1430.restore('double',[]);});
   await page.route('**/rest/v1/rpc/account_exchange_rates143186',r=>{const d=r.request().postDataJSON();return r.fulfill({json:{as_of:d.p_as_of,accounts:[{account_id:'rate-bank',average_rate:22229.210927,rate_status:'available'}]}})});
   await page.evaluate(()=>{
    const bank={id:'rate-bank',code:'1041',name:'BCEL USD',currency:'USD',type:'ASSET',isPosting:true},local={id:'rate-lak',code:'1010',name:'Cash LAK',currency:'LAK',type:'ASSET',isPosting:true};AccountingStore.accounts=[bank,local];
    document.querySelector('#jeLinesBody').replaceChildren();addJournalLineRow('1041 — BCEL USD','Bank fee',0.5,{});addJournalLineRow('1010 — Cash LAK','','',{LAK:1});AccountRates143186.refresh();
   });
   await page.waitForFunction(()=>document.querySelector('#jeLinesBody input[aria-label="Book rate"]:not([hidden])')?.value==='22,229.21');
   const geometry=await page.evaluate(()=>{const table=document.querySelector('#jeHeaderRow').closest('table'),box=table.parentElement;return {tableWidth:table.getBoundingClientRect().width,box:box.clientWidth,viewport:document.documentElement.clientWidth,bodyWidth:document.documentElement.scrollWidth,cols:[...table.tHead.rows[0].cells].map(h=>[h.textContent.trim(),h.getBoundingClientRect().width]).filter(([,w])=>w)};});
   console.log(device,'rate widths',JSON.stringify(geometry));
   for(const [label,width] of geometry.cols.filter(([l])=>/^(exchange|book) rate$/i.test(l)))assert.ok(width<=110&&width>=75,'Rate field width '+width);
   if(process.env.RAIL_QA_DIR){await page.locator('#journalEntry98').scrollIntoViewIfNeeded();await page.screenshot({path:process.env.RAIL_QA_DIR+'/'+device+'.png'});}
   if(device==='laptop')assert.ok(geometry.tableWidth<=geometry.box+1,'Foreign columns must fit the laptop table');
   assert.ok(geometry.bodyWidth<=geometry.viewport+1,'Whole page overflow');
   const generator=page.locator('#journalGenerator258');
   await page.getByRole('button',{name:'Generate',exact:true}).click();
   await generator.locator('select[aria-label="Account row 1"]').selectOption('rate-bank');
   await page.waitForFunction(()=>document.querySelector('#journalGenerator258 input[aria-label="Book rate row 1"]')?.value==='22,229.21');
   await generator.getByRole('button',{name:'Close',exact:true}).click();
   const cash=await page.evaluate(()=>{document.querySelector('#jeLinesBody').replaceChildren();addJournalLineRow('1010 — Cash LAK','Cash',1,{});addJournalLineRow();AccountRates143186.refresh();return true});assert.ok(cash);
   await page.waitForFunction(()=>!document.querySelector('#journalEntry98').classList.contains('foreign-lines291'));
  }
  assert.deepEqual(errors,[]);
 }finally{await f.close();}
}
(async()=>{const device=process.argv[2]||'desktop';await routeTest(device,process.argv[3]||'admin')})().catch(e=>{console.error(e);process.exitCode=1});
