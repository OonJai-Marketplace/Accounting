// Exercise the own-account Entries screen with existing links in the browser fixture.
const assert=require('node:assert/strict');
const createFixture=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await createFixture();
 try{
  const {page,login,me}=await fixture.open('phone','submitter');
  const entry='RY260042',line='00000000-0000-4000-8000-000000002225',batch=crypto.randomUUID();
  const fund=me.user_permissions.assigned_fund_account_ids[0],account=me.user_permissions.destination_account_ids[0];
  await page.clock.setFixedTime(new Date('2026-11-19T04:00:00Z'));
  await page.route('**/rest/v1/staff_journals?**',route=>route.fulfill({json:[{id:batch,owner_id:me.id,period_start:'2026-11-01',status:'draft'}]}));
  await page.route('**/rest/v1/staff_journal_lines?**',route=>route.fulfill({json:[{id:line,staff_journal_id:batch,line_no:1,
   transaction_date:'2026-11-18',workspace_entry_no:entry,direction:'out',entry_kind:'cashbook',
   fund_account_id:fund,account_id:account,currency_code:'LAK',amount:1000,memo:'Kitchen supplies',status:'draft'}]}));
  let linked=true,release,slowStarted;
  const pause=new Promise(done=>release=done),started=new Promise(done=>slowStarted=done);
  const calls=[],images=[],pdfReads=[];
  await page.route('**/functions/v1/scanner-integration',async route=>{
   const b=route.request().postDataJSON();calls.push(b);
   if(b.action==='list'){
    assert.deepEqual(b,{action:'list',staffLine:line});
    return route.fulfill({json:{entry,documents:linked?[{id:'one',title:'October receipts',pages:2},{id:'two',title:'Second document',pages:1}]:[]}});
   }
   assert.equal(b.action,'view');
   if(b.id==='two'){slowStarted();await pause;}
   const n=b.id==='two'?1:2;
   return route.fulfill({json:{title:b.id,label:entry,expires:Date.parse('2026-11-19T04:00:00Z')+240000,pdf:'https://drive.google.com/file/d/fixture/view',
    pages:Array.from({length:n},(_,i)=>({page:i+2,label:b.id+'-'+i,url:fixture.base+'/storage/v1/object/sign/scan-documents208/'+b.id+'/'+i+'.jpg'}))}});
  });
  await page.route('**/storage/v1/object/sign/scan-documents208/**',route=>{
   images.push(route.request().url());
   const tall=!route.request().url().endsWith('/1.jpg');
   return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="'+(tall?1600:300)+'"><rect width="100%" height="100%" fill="white"/><text x="20" y="65">Receipt preview</text></svg>'});
  });
  await page.route('https://drive.google.com/**',route=>{pdfReads.push(route.request().url());return route.fulfill({contentType:'text/html',body:'PDF fixture'});});
  await login();await page.locator('#bottom [data-page=entries]').tap();
  const row=page.locator('details.entry').first();await row.locator('summary').tap();
  const trigger=row.getByRole('button',{name:'Open receipts for '+entry});
  assert.equal(calls.length,0);
  await trigger.tap();
  const viewer=page.locator('.scan-viewer208'),image=viewer.locator('img');
  const control=name=>viewer.getByRole('button',{name,exact:true});
  const fixed=()=>viewer.evaluate(n=>['h2','.rv-count','.rv-prev','.rv-next','.rv-close'].map(selector=>{
   const {x,y,width,height}=n.querySelector(selector).getBoundingClientRect();return [x,y,width,height];
  }));
  await image.waitFor();assert.equal(await viewer.locator('h2').innerText(),entry);
  assert.equal(images.length,1);assert.deepEqual(pdfReads,[]);
  assert(await control('Previous').isDisabled());assert.equal(await viewer.locator('.rv-count').innerText(),'Page 1 of 3');
  const first=await fixed();await control('Enlarge').tap();assert.deepEqual(await fixed(),first);
  assert(await viewer.locator('.rv-stage').evaluate(n=>n.scrollHeight>n.clientHeight));
  await control('Next').tap();await image.waitFor();assert(await control('Enlarge').isVisible());
  assert.deepEqual(await fixed(),first);assert.equal(await image.count(),1);
  await control('Next').tap();await started;assert.equal(await viewer.locator('.rv-count').innerText(),'Page 3 of 3');
  assert(await control('Next').isDisabled());await control('Previous').tap();await image.waitFor();
  await Promise.all([page.waitForResponse(r=>r.url().includes('scanner-integration')&&r.request().postDataJSON().id==='two'),Promise.resolve().then(release)]);
  assert.equal(await image.getAttribute('alt'),'one-1');
  await control('Next').tap();await image.waitFor();assert.equal(await image.getAttribute('alt'),'two-0');assert.deepEqual(await fixed(),first);
  assert.equal(images.some(u=>u.endsWith('/two/1.jpg')),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/scan-viewer208-phone.png'});
  assert.deepEqual(pdfReads,[]);await Promise.all([page.waitForRequest(r=>r.url().endsWith('/fixture/preview')),control('Full PDF').tap()]);
  const checkFullPDF=require('./full-receipt-pdf.cjs'),original='https://drive.google.com/file/d/fixture/view';
  await checkFullPDF(page,original);
  const portrait=page.viewportSize();
  await page.setViewportSize({width:portrait.height,height:portrait.width});
  await checkFullPDF(page,original);
  await page.setViewportSize(portrait);
  await page.getByRole('button',{name:'Close PDF'}).tap();await image.waitFor();
  assert.equal(await viewer.locator('.rv-count').innerText(),'Page 3 of 3');
  await control('Close').tap();assert(await row.getAttribute('open')!==null);
  const viewsBefore=calls.filter(c=>c.action==='view').length;
  await trigger.tap();await image.waitFor();
  assert.equal(calls.filter(c=>c.action==='view').length,viewsBefore,'reopening the same page reuses its authorized URL');
  await control('Close').tap();
  linked=false;await trigger.tap();await viewer.getByText('No receipts are linked to this entry yet.').waitFor();
  assert.equal(await viewer.getByRole('link',{name:'Open receipt scanner'}).getAttribute('href'),'scan.html?entry='+entry);
  console.log('PASS own-account Entries, linked PDFs, stable controls, zoom, out-of-order replies, empty entry and on-demand PDF.');
 }finally{await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
