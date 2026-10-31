/* Browser behavior with synthetic receipts only; every request stays in fixtures. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/scanner-chrome/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});let requests=[],slow=false;
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());requests.push(u.pathname);
   if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><table><tr data-entry-id="OJM26-0001"><td><div class="entry-id-stack"><span>OJM26-0001</span></div></td></tr></table><p><button class="r79-link" data-entry="OJM26-0002">OJM26-0002</button></p>'});
   if(u.pathname.startsWith('/preview/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#fff"/><text x="50" y="90" font-size="25">Synthetic receipt</text></svg>'});
   if(u.pathname==='/functions/v1/scanner-integration'){
    const b=route.request().postDataJSON();
    if(b.action==='list')return route.fulfill({json:{entry:b.entry,documents:b.entry==='OJM26-0002'?[]:[{id:'one',title:'October receipts',pages:2},{id:'two',title:'Second document',pages:1}]}});
    assert.equal(b.action,'view');if(b.id==='two'&&slow)await new Promise(r=>setTimeout(r,250));
    return route.fulfill({json:{title:b.id==='two'?'Second document':'October receipts',label:b.id==='two'?'SECOND':'OJM26-0001',pages:[{url:'https://fixture.test/preview/1.svg',page:2,label:'Page A'},{url:'https://fixture.test/preview/2.svg',page:3,label:'Page B'}],pdf:'https://fixture.test/original.pdf',expires:Date.now()+240000}});
   }
   throw Error('Unexpected network request '+u.href);
  });
  await page.goto('https://fixture.test/');
  await page.evaluate(()=>{window.deviceVault14334={unlocked:true,actor:'owner'};window.OJM_SUPABASE_URL='https://fixture.test';window.OJM_SUPABASE_ANON_KEY='public-fixture';window.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture',user:{id:'owner'}}}})}};});
  await page.addStyleTag({path:path.resolve('src/documents/scanner/viewer208.css')});
  await page.addScriptTag({path:path.resolve('src/documents/scanner/links208.js')});
  await page.addScriptTag({path:path.resolve('src/documents/scanner/viewer208.js')});
  assert.equal(await page.locator('.scan-support-link208').count(),2);
  assert.equal(requests.filter(p=>p.includes('functions')).length,0,'no automatic journal-wide fetching');
  await page.locator('.scan-support-link208').first().click();await page.locator('dialog img').waitFor();
  assert.equal(await page.locator('dialog h2').innerText(),'OJM26-0001');
  await page.getByRole('button',{name:'Next',exact:true}).click();assert.match(await page.locator('.scan-viewer-navigation208').innerText(),/2 \/ 2/);
  assert.equal(requests.includes('/original.pdf'),false,'preview never downloads the PDF');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'phone fits viewport');
  slow=true;await page.locator('#scanDocument208').selectOption('two');await page.locator('#scanDocument208').selectOption('one');await page.waitForTimeout(350);
  assert.equal(await page.locator('dialog h2').innerText(),'OJM26-0001','late request cannot replace latest selection');
  await page.screenshot({path:'/tmp/scan-viewer208-phone.png',fullPage:true});
  await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.scan-support-link208').last().click();await page.getByText('No scans are linked to this entry yet.').waitFor();
  assert.equal(await page.getByRole('link',{name:'Open receipt scanner'}).getAttribute('href'),'scan.html?entry=OJM26-0002');
  await page.evaluate(()=>{deviceVault14334.unlocked=false;});await page.waitForFunction(()=>!document.querySelector('dialog').open);
  await page.locator('.scan-support-link208').first().click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/Sign in/);
  console.log('PASS: lazy private previews, phone layout, PDF avoidance, navigation, response races, scanner entry shortcut and sign-out clearing');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
