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
  const lineDate=i=>page.locator('[data-action=line-date][data-index="'+i+'"]');
  const receiptDates=()=>page.locator('[data-action=line-date]').evaluateAll(els=>els.map(el=>el.dataset.value));
  const dateMode=()=>page.getByRole('checkbox',{name:'Multiple dates',exact:true});
  const mainDate=page.locator('[data-action=entry-date]'),toggle=page.locator('.receipt-heading [data-action=switch-method]');
  async function setMode(mode){if(await toggle.getAttribute('data-mode')!==mode)await toggle.tap();}
  async function pick(picker,iso) {
    const [year,month]=iso.split('-').map(Number);
    const current=(await picker.getAttribute('data-value')).split('-').map(Number);
    await picker.click();
    const delta=12*(year-current[0])+month-current[1];
    for(let i=0;i<Math.abs(delta);i++)await button(delta>0?'Next month':'Previous month').click();
    await page.locator('[data-receipt-date="'+iso+'"]').tap();
    await page.waitForFunction(()=>!document.querySelector('#dialog').open);
    await page.waitForFunction(([name,index,value])=>[...document.querySelectorAll('[data-action="'+name+'"]')].some(b=>b.dataset.index===index&&b.dataset.value===value),[await picker.getAttribute('data-action'),await picker.getAttribute('data-index')??undefined,iso]);
  }
  async function setMultiple(){
    await mainDate.click(); assert.equal(await dateMode().isChecked(),false);
    await dateMode().check(); await lineDate(0).waitFor(); assert.equal(await mainDate.count(),0);
  }
  await setMode('single');await toggle.tap();assert.equal(await toggle.getAttribute('data-mode'),'double');
  await toggle.tap();assert.equal(await toggle.getAttribute('data-mode'),'single');
  assert.equal(await page.getByRole('button',{name:'Calculator',exact:true}).count(),0);
  assert.equal(await page.locator('[data-action=line-date]').count(),0);
  await pick(mainDate,'2026-11-03');
  await setMultiple();
  await button('+ Add line').click();
  await pick(lineDate(1),'2026-12-02');
  await button('+ Add line').click();
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-12-02','2026-12-02']);
  await lineDate(1).click();await dateMode().uncheck();await mainDate.waitFor();
  assert.equal(await mainDate.getAttribute('data-value'),'2026-12-02');
  assert.equal(await page.locator('[data-action=line-date]').count(),0);
  await setMultiple(); assert.deepEqual(await receiptDates(),Array(3).fill('2026-12-02'));
  await pick(lineDate(0),'2026-11-03');
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

  await setMode('double');
  await pick(mainDate,'2026-11-03');
  await setMultiple();
  await button('+ Add line').click();
  assert.deepEqual(await receiptDates(),Array(3).fill('2026-11-03'));
  await pick(lineDate(2),'2026-11-04');
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-11-03','2026-11-04']);
  await button('Remove line 3').click();
  await button('+ Add receipt').click();
  assert.deepEqual(await receiptDates(),Array(4).fill('2026-11-03'));
  for(let i=0;i<4;i++){
    await field('account',i).selectOption(i%2?fund:account);
    await field(i%2?'credit':'debit',i).fill(String(i<2?1200:3400));
    await field('reference',i).fill('Ref '+(i+1));
    await field('memo',i).fill(['Kitchen items','Cash payment','Transport','Cash fare'][i]);
  }
  await pick(lineDate(1),'2026-11-04');
  assert.deepEqual(await receiptDates(),['2026-11-03','2026-11-04','2026-11-03','2026-11-03']);
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/1,200.00 credit/);
  await pick(lineDate(1),'2026-11-03');
  // Offsetting differences between same-day receipts must never cancel each other.
  await field('credit',1).fill('1100');
  await field('credit',3).fill('3500');
  assert.match(await page.locator('[data-card-balance="0"]').innerText(),/100.00 credit/);
  assert.match(await page.locator('[data-card-balance="1"]').innerText(),/100.00 debit/);
  await field('memo').fill('Journal batch');
  assert.match(await page.locator('#entryValidation').innerText(),/unbalanced/);
  await field('credit',1).fill('1200');
  await field('credit',3).fill('3400');
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
  assert.equal(await field('reference',0).inputValue(),'Ref 1');
  assert.equal(await field('reference',1).inputValue(),'Ref 2');
  assert.equal(await page.locator('[data-receipt-card]').count(),1);
  // Add a second dated debit/credit pair in the same card, just as a phone user can.
  await page.locator('[data-action=clear-draft]').tap();
  await page.locator('#dialogButtons button[value=yes]').tap();
  await mainDate.waitFor();
  await pick(mainDate,'2026-11-03');
  await setMultiple();
  await button('+ Add line').click();
  await button('+ Add line').click();
  await pick(lineDate(2),'2026-11-04');await pick(lineDate(3),'2026-11-04');
  for(let i=0;i<4;i++){
    await field('account',i).selectOption(i%2?fund:account);
    await field(i%2?'credit':'debit',i).fill(i<2?'1000':'2000');
    await field('reference',i).fill('Line '+(i+1));
  }
  await field('memo').fill('Two dated pairs');
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/Debit .*1,000.00 · Credit .*1,000.00 · Balanced/);
  const posted=page.waitForRequest(r=>r.url().includes('/rpc/save_staff_editor1437')&&r.postDataJSON().p_snapshot.memo==='Two dated pairs');
  await page.locator('#postForm button[type=submit]').tap();
  const mixed=(await posted).postDataJSON();
  assert.deepEqual(mixed.p_items.map(l=>[l.date,l.amount,l.reference]),[['2026-11-03',1000,'Line 1'],['2026-11-04',2000,'Line 3']]);
  assert.deepEqual(mixed.p_snapshot.receiptCards341.map(c=>c.rows.map(r=>r.reference)),[['Line 1','Line 2'],['Line 3','Line 4']]);
  // One petty-cash payment covers two receipt dates, using the existing saved draft.
  await page.waitForFunction(()=>!document.querySelector('[data-field=memo]:not([data-index])').value);
  await pick(mainDate,'2026-11-03');
  await setMultiple();
  await button('+ Add line').click();
  await pick(lineDate(1),'2026-11-04');
  await pick(lineDate(2),'2026-11-04');
  await field('memo').fill('Shared petty cash');
  for(const [i,acc,side,amount] of [[0,account,'debit','331,000'],[1,account,'debit','31,000'],[2,fund,'credit','331,000']]){
    await field('account',i).selectOption(acc);await field(side,i).fill(amount);
    await field('reference',i).fill('Source '+i);
  }
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/31,000.00 credit/);
  const before=batches.length;
  await page.locator('#postForm button[type=submit]').tap();
  assert.equal(await field('memo').inputValue(),'Shared petty cash');
  assert.equal(batches.length,before);
  assert.match(await page.locator('#notice').innerText(),/Add CR 31,000/);
  await field('credit',2).fill('31,000');
  assert.match(await page.locator('#notice').innerText(),/Add CR 331,000/);
  await field('credit',2).fill('350,000');
  assert.match(await page.locator('#notice').innerText(),/Add CR 12,000/);
  await field('credit',2).fill('362,000');
  assert.equal(await page.locator('#notice').innerText(),'');
  await page.locator('[data-page=home]').tap();await page.locator('[data-page=post]').tap();
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/Debit .*362,000.00 · Credit .*362,000.00 · Balanced/);
  const savedPayment=page.waitForRequest(r=>r.url().includes('/rpc/save_staff_editor1437')&&r.postDataJSON().p_snapshot.memo==='Shared petty cash');
  await page.locator('#postForm button[type=submit]').tap();
  const payment=(await savedPayment).postDataJSON();
  assert.deepEqual(payment.p_items.map(i=>[i.date,i.amount,i.fund,i.reference]),
    [['2026-11-03',331000,fund,'Source 0'],['2026-11-04',31000,fund,'Source 1']]);
  for(const card of payment.p_snapshot.receiptCards341){
    assert.equal(card.sharedFundCredit.date,'2026-11-04');
    assert.equal(card.sharedFundCredit.reference,'Source 2');
    assert.equal(card.rows[0].dr,card.rows[1].credits.LAK);
  }
  const paymentRows=payment.p_snapshot.receiptCards341.flatMap((card,k)=>card.components1437.map((item,i)=>({
    ...saved[0],id:crypto.randomUUID(),line_no:100+k*10+i,transaction_date:item.date,amount:item.amount,
    memo:item.memo,reference:item.reference,editor_group1437:payment.p_key+':r'+(k+1)+':'+item.date,editor_snapshot1437:card
  })));
  await page.route('**/rest/v1/staff_journal_lines?**',route=>route.fulfill({json:paymentRows}));
  await page.evaluate(()=>PhoneWorkspace14242.refresh());
  await page.locator('#bottom [data-page=entries]').tap();
  assert.equal(await page.locator('details.entry').count(),2);
  for(const row of paymentRows){
    const entry=page.locator('details[data-group="'+row.id+'"]');
    await entry.locator('summary').tap();
    assert.match(await entry.innerText(),new RegExp(row.reference));
  }
  await page.locator('[data-page=post]').tap();await mainDate.waitFor();
  await field('memo').fill('Shared cash across cards');
  await button('+ Add receipt').tap();
  for(const [i,acc,side,amount] of [[0,account,'debit','331000'],[2,account,'debit','31000'],[3,fund,'credit','362000']]){
    await field('account',i).selectOption(acc);await field(side,i).fill(amount);
  }
  await page.getByRole('button',{name:'Use one petty-cash credit for these receipts'}).tap();
  assert.equal(await page.locator('[data-receipt-card]').count(),1);
  assert.match(await page.locator('#liveReceiptBalance').innerText(),/362,000.00 · Balanced/);
  // Some keyboards commit a visible field just before submit without input/change.
  await field('credit',2).evaluate(el=>{el.value='361,000'});
  await page.locator('#postForm button[type=submit]').tap();
  assert.match(await page.locator('#notice').innerText(),/Add CR 1,000/);
  await field('credit',2).evaluate(el=>{el.value='362,000'});
  const common=page.waitForRequest(r=>r.url().includes('/rpc/save_staff_editor1437')&&r.postDataJSON().p_snapshot.memo==='Shared cash across cards');
  await page.locator('#postForm button[type=submit]').tap();
  assert.deepEqual((await common).postDataJSON().p_items.map(i=>i.amount),[331000,31000]);
  console.log('PASS Money Out phone form: real difference blocked; dated expenses against one credit posted, appeared in Entries, and retained references; explicit shared funding across cards succeeds.');
  await context.close();
  console.log('PASS per-receipt date picker, independent line calendars and references, header mode switch, automatic live per-receipt balance and memos; multi-month picker, repeated receipt date, dated cashbook and balanced journal, offline queue, and one save request per batch');
}

(async()=>{
  const fixture=await createFixture();
  try {await bulk(fixture);await routing(fixture);} finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
