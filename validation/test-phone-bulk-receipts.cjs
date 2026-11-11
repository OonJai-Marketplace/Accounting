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
  async function setMultiple() {
    await page.locator('[data-action=entry-date]').click();
    await button('Multiple dates').click();
    assert.equal(await page.locator('.receipt-calendar').isVisible(),false);
    await button('Apply').click();
    await field('date',0).waitFor({state:'visible'});
  }
  await button('Cashbook').click();
  await setMultiple();
  await field('date',0).fill('2026-11-03');
  await button('+ Add receipt').click();
  await field('date',1).fill('2026-12-02');
  await button('+ Add receipt').click();
  await page.locator('[data-action=entry-date]').click();
  await button('One date').click();
  await button('Apply').click();
  await button('Cancel').click();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-12-02','2026-12-02']);
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

  await button('Double Entry').click();
  await setMultiple();
  await field('date',0).fill('2026-11-03');
  await button('+ Add receipt').click();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-11-03']);
  for(let i=0;i<4;i++){
    await field('account',i).selectOption(i%2?fund:account);
    await field(i%2?'credit':'debit',i).fill(String(i<2?1200:3400));
    await field('memo',i).fill(['Kitchen items','Cash payment','Transport','Cash fare'][i]);
  }
  // Offsetting differences between same-day receipts must never cancel each other.
  await field('credit',1).fill('1100');
  await field('credit',3).fill('3500');
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/100.00 credit/);
  assert.match(await page.locator('[data-card-balance="1"]').innerText(),/100.00 debit/);
  await field('memo').fill('Journal batch');
  assert.match(await page.locator('#entryValidation').innerText(),/unbalanced/);
  await field('credit',1).fill('1200');
  await button('Calculator').click();
  for(const key of ['3','5','0','0','−','1','0','0','='])await page.locator('[data-math="'+key+'"]').click();
  assert.equal(await page.locator('.receipt-calc-display').innerText(),'3400');
  await page.locator('#receiptCalcTarget').selectOption('7');
  await button('Use amount').click();
  await page.waitForFunction(()=>document.querySelector('#liveReceiptBalance').textContent.includes('receipts balanced'));
  assert.equal(await field('credit',3).inputValue(),'3400');
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
  assert.deepEqual(batches[1].p_items.map(l=>[l.date,l.amount]),[['2026-11-03',1200],['2026-11-03',3400]]);
  assert.equal(batches[0].p_snapshot.receiptCards341.length,3);
  assert.equal(batches[0].p_snapshot.receiptCards341[1].single[0].memo,'Receipt 2');
  assert.equal(batches[0].p_items[1].memo,'Receipt 2');
  assert.equal(batches[1].p_snapshot.receiptCards341.length,2);
  assert.deepEqual(batches[1].p_snapshot.receiptCards341.map(c=>[c.memo,c.rows.map(r=>r.memo)]),
    [['Journal batch',['Kitchen items','Cash payment']],['Journal batch',['Transport','Cash fare']]]);
  const journalId=crypto.randomUUID(),batch=batches[1];
  const saved=batch.p_snapshot.receiptCards341.flatMap((snapshot,k)=>snapshot.components1437.map((item,i)=>({
    id:crypto.randomUUID(),staff_journal_id:journalId,line_no:k*10+i+1,status:'draft',transaction_date:item.date,
    fund_account_id:item.fund,account_id:item.account,currency_code:'LAK',direction:item.direction,amount:item.amount,
    memo:item.memo,reference:item.reference,editor_group1437:batch.p_key+':r'+(k+1)+':'+item.date,editor_snapshot1437:snapshot
  })));
  await page.route('**/rest/v1/staff_journals?**',route=>route.fulfill({json:[{id:journalId,owner_id:me.id,period_start:'2026-11-01',status:'draft'}]}));
  await page.route('**/rest/v1/staff_journal_lines?**',route=>route.fulfill({json:saved}));
  await page.evaluate(()=>PhoneWorkspace14242.refresh());
  await page.locator('#bottom [data-page=entries]').click();
  const entries=page.locator('details.entry');
  assert.equal(await entries.count(),2);
  await entries.first().locator('summary').click();
  assert.match(await entries.first().locator('.entry-body').innerText(),/Kitchen items/);
  assert.match(await entries.first().locator('.entry-body').innerText(),/Cash payment/);
  await entries.first().getByRole('button',{name:'Edit',exact:true}).click();
  assert.equal(await field('memo').inputValue(),'Journal batch');
  assert.equal(await field('memo',0).inputValue(),'Kitchen items');
  assert.equal(await field('memo',1).inputValue(),'Cash payment');
  assert.equal(await page.locator('[data-receipt-card]').count(),1);
  await context.close();
  console.log('PASS per-receipt date picker, same-day separation, calculator, live per-receipt balance and memos; multi-month picker, repeated receipt date, dated cashbook and balanced journal, offline queue, and one save request per batch');
}

(async()=>{
  const fixture=await createFixture();
  try {await bulk(fixture);await routing(fixture);} finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
