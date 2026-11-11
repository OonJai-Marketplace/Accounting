const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function routing(fixture) {
  const {page, context, login, me} = await fixture.open('phone','submitter');
  await login();
  await page.waitForFunction(()=>PhoneWorkspace14242.offlineReady() && navigator.serviceWorker.controller);
  const mobile = await page.evaluate(()=>navigator.userAgent);
  const desktop = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36';
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setUserAgentOverride',{userAgent:desktop});
  await page.reload({waitUntil:'commit'});
  await page.waitForURL('**/desktop.html*');
  await page.waitForFunction(()=>document.documentElement.dataset.device132==='desktop');
  assert.equal(await page.locator('#journalEntry98').count(),1);
  assert(await page.evaluate(()=>innerWidth >= 980),'Desktop site provides a desktop-width journal on the handset');
  if(!await page.evaluate(()=>window.liveProfile||typeof liveProfile!=='undefined'&&liveProfile)){
    const email=page.locator('#loginEmail');
    if(await email.isVisible()){
      await email.fill(me.email);
      await page.locator('#loginPassword').fill('fixture-only');
      await page.locator('#loginForm button[type=submit]').click();
    }
  }
  await page.waitForFunction(()=>window.startup14257?.prepared&&typeof liveProfile!=='undefined'&&liveProfile&&document.getElementById('loginGate').classList.contains('is-authenticated'));
  await page.evaluate(()=>{openWorkspaceUser(liveProfile.id);personalJournal1437.show(liveProfile.id,'journal');showJournalEntry98();});
  const memo=page.locator('#jeGeneralMemo').locator('..').locator('.memo-link-text143187');
  await memo.fill('Draft survives zoom and rotation');
  for(const [width,height,angle] of [[390,900,0],[900,390,90],[390,900,0]]){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,screenWidth:width,screenHeight:height,deviceScaleFactor:2,mobile:true,screenOrientation:{type:angle?'landscapePrimary':'portraitPrimary',angle}});
    await page.waitForFunction(()=>document.documentElement.clientWidth>=1250);
    assert.equal(await page.locator('#journalEntry98').isVisible(),true);
    assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Draft survives zoom and rotation');
    const viewport=await page.locator('meta[name=viewport]').getAttribute('content');
    assert.match(viewport,/user-scalable=yes/);
    assert.match(viewport,/maximum-scale=5/);
    // Exercise Chrome's visual viewport independently of the journal layout.
    // Chromium's headless touchscreen does not implement the Android compositor pinch.
    const fit=width/1280;
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});
    await page.waitForFunction(()=>visualViewport.scale>1.95);
    assert.equal(await page.evaluate(()=>document.documentElement.clientWidth),1280);
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:fit});
    await page.waitForFunction(scale=>Math.abs(visualViewport.scale-scale)<0.03,fit);
    assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Draft survives zoom and rotation');
  }
  await page.goto(fixture.base+'/index.html?staff=1&from=bookmark#entries',{waitUntil:'commit'});
  await page.waitForURL('**/desktop.html*#entries');
  const routed = new URL(page.url());
  assert.equal(routed.searchParams.get('from'),'bookmark');
  assert(!routed.searchParams.has('staff'));
  await cdp.send('Network.setUserAgentOverride',{userAgent:mobile});
  await page.reload({waitUntil:'commit'});
  await page.waitForURL('**/phone.html*#entries');
  await page.locator('#bottom').waitFor({state:'attached'});
  await context.close();
  console.log('PASS Chrome Desktop site on a cached phone session, portrait/landscape desktop journal, visual viewport zoom in and out, retained draft, bookmark, and switch back');
}

async function bulk(fixture) {
  const {page,context,login,me} = await fixture.open('phone','submitter');
  me.user_permissions.workspace_entry_mode240 = 'both';
  Object.assign(fixture.fixture.tables.user_permissions.find(p=>p.user_id===me.id),me.user_permissions);
  const fund = me.user_permissions.assigned_fund_account_ids[0], account=me.user_permissions.destination_account_ids[0];
  const batches=[];
  await page.route('**/rpc/save_staff_editor1437', async route=>{
    const batch=route.request().postDataJSON();
    batches.push(batch);
    await route.fulfill({json:{line_ids:batch.p_items.map(()=>crypto.randomUUID())}});
  });
  await login();
  await page.locator('[data-page=post]').click();
  const button=name=>page.getByRole('button',{name,exact:true});
  const field=(name,i)=>page.locator('[data-field="'+name+'"]'+(i===undefined?':not([data-index])':'[data-index="'+i+'"]'));
  const receiptDates=()=>page.locator('input[data-field=date][data-index]').evaluateAll(els=>els.map(el=>el.value));
  async function addDates() {
    await field('date').fill('2026-11-15');
    await button('Multiple dates').click();
    await button('Choose dates').click();
    await page.locator('[data-receipt-date="2026-11-03"]').click();
    await button('Next month').click();
    await page.locator('[data-receipt-date="2026-12-02"]').click();
    await button('Previous month').click();
    assert.equal(await page.locator('[data-receipt-date="2026-11-03"]').getAttribute('aria-pressed'),'true');
    await button('Add dates (2)').click();
    await page.waitForFunction(()=>document.querySelectorAll('[data-index][data-field=date]').length>=2 && document.querySelector('[data-index][data-field=date]').value==='2026-11-03');
  }
  await button('Single Entry (Cashbook)').click();
  await addDates();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-12-02']);
  await button('Multiple dates').click();
  await button('Cancel').click();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-12-02']);
  // Multiple receipts can also share a date.
  await button('Add another entry line').click();
  for (let i=0;i<3;i++){
    await field('source',i).selectOption(fund);
    await field('affected',i).selectOption(account);
    await field('amount',i).fill(String(1000+i));
    await field('memo',i).fill('Receipt '+(i+1));
  }
  await field('memo').fill('Cashbook batch');
  await page.locator('[data-page=home]').click();
  await page.locator('[data-page=post]').click();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-12-02','2026-12-02']);
  await context.setOffline(true);
  await page.locator('#postForm button[type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-field=memo]:not([data-index])').value);
  assert.equal(batches.length,0);
  await page.locator('#connection').click();
  await page.getByText('Cashbook batch',{exact:false}).last().waitFor({state:'visible'});
  await button('Close').click();
  await context.setOffline(false);

  await button('Double Entry Journal').click();
  await addDates();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-11-03','2026-12-02','2026-12-02']);
  for(let i=0;i<4;i++){
    await field('account',i).selectOption(i%2?fund:account);
    await field(i%2?'credit':'debit',i).fill(String(i<2?1200:3400));
  }
  await field('memo').fill('Journal batch');
  await field('date',1).fill('2026-12-02');
  assert.match(await page.locator('#entryValidation').innerText(),/unbalanced/);
  await field('date',1).fill('2026-11-03');
  assert.match(await page.locator('#entryValidation').innerText(),/2 complete entries/);
  const confirmed=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437')&&r.request().postDataJSON().p_snapshot.mode==='double'&&r.ok());
  await page.locator('#postForm button[type=submit]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-field=memo]:not([data-index])').value);
  await confirmed;
  await page.locator('[data-page=home]').click();
  await page.getByText(/0 waiting to sync/).waitFor();
  assert.equal(batches.length,2);
  assert.notEqual(batches[0].p_key,batches[1].p_key);
  for(const batch of batches){
    assert.equal(batch.p_owner,me.id);
    assert.equal(batch.p_snapshot.multiple,true);
    assert.deepEqual(batch.p_snapshot.components1437,batch.p_items);
  }
  assert.deepEqual(batches[0].p_items.map(l=>[l.date,l.amount]),[['2026-11-03',1000],['2026-12-02',1001],['2026-12-02',1002]]);
  assert.deepEqual(batches[1].p_items.map(l=>[l.date,l.amount]),[['2026-11-03',1200],['2026-12-02',3400]]);
  await context.close();
  console.log('PASS multi-month picker, repeated receipt date, dated cashbook and balanced journal, offline queue, and one save request per batch');
}

(async()=>{
  const fixture=await createFixture();
  try {await bulk(fixture);await routing(fixture);} finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
