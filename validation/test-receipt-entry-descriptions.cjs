const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture=await createFixture();
  try {
    const {page,login,me}=await fixture.open('phone','submitter');
    me.user_permissions.workspace_entry_mode240='cashbook';
    const fund=me.user_permissions.assigned_fund_account_ids[0], category=me.user_permissions.destination_account_ids[0];
    const general='Kitchen receipts for the week', memos=Array.from({length:10},(_,i)=>'Market slip '+(i+1)+' & groceries');
    memos[9]=''; // One receipt has only the general description.
    const expected=memos.map(m=>m||general);
    await login();
    await page.locator('[data-page=post]').tap();
    if(await page.locator('[data-action=switch-method]').getAttribute('data-mode')!=='single')
      await page.locator('[data-action=switch-method]').tap();
    await page.locator('[data-field=memo]:not([data-index])').fill(general);
    for(const [i,memo] of memos.entries()){
      if(i)await page.locator('[data-action=add-receipt]').tap();
      const card=page.locator('[data-receipt-card]').nth(i);
      await card.getByLabel('Account / fund').selectOption(fund);
      await card.getByLabel('Category').selectOption(category);
      await card.getByLabel('Amount').fill(String(1000+i));
      if(memo)await card.getByLabel('Line memo').fill(memo);
    }
    let records=[],batch;
    await page.route('**/rpc/save_staff_editor1437',async route=>{
      const body=route.request().postDataJSON(), date=body.p_items[0].date;
      batch={id:crypto.randomUUID(),owner_id:me.id,period_start:date.slice(0,7)+'-01',status:'draft'};
      records=body.p_items.map((item,i)=>({id:crypto.randomUUID(),staff_journal_id:batch.id,line_no:i+1,
        transaction_date:item.date,amount:item.amount,currency_code:'LAK',fund_account_id:item.fund,account_id:item.account,
        direction:item.direction,memo:item.memo,reference:item.reference,entry_kind:item.kind,workspace_entry_no:'RCPT-'+i,
        editor_group1437:body.p_key+':r'+(i+1)+':'+date,editor_snapshot1437:body.p_snapshot.receiptCards341[i]}));
      await route.fulfill({json:{line_ids:records.map(l=>l.id)}});
    });
    await page.route('**/rest/v1/staff_journals?**',route=>route.fulfill({json:batch?[batch]:[]}));
    await page.route('**/rest/v1/staff_journal_lines?**',route=>route.fulfill({json:records}));
    const save=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437'));
    await page.locator('#postForm [type=submit]').tap();await save;
    assert.deepEqual(records.map(l=>l.memo),expected);
    assert(records.every(l=>l.editor_snapshot1437.memo===general));
    await page.evaluate(()=>PhoneWorkspace14242.refresh());
    await page.locator('#bottom [data-page=entries]').tap();
    const titles=page.locator('details.entry summary .entry-copy b');
    await titles.first().waitFor();
    assert.deepEqual(await titles.allTextContents(),expected);
    batch.status='submitted';await page.evaluate(()=>PhoneWorkspace14242.refresh());
    await page.locator('[data-page=history]').tap();
    assert.deepEqual((await titles.allTextContents()).sort(),[...expected].sort());
    await page.locator('#historySearch14359').fill('slip 5');
    assert.deepEqual(await page.locator('details.entry:visible summary .entry-copy b').allTextContents(),[memos[4]]);
    await page.locator('#historySearch14359').fill(general);
    assert.equal(await page.locator('details.entry:visible').count(),10);
    const desktop=await fixture.open('desktop','admin');await desktop.login();
    const active={...batch,status:'draft',lines:records};
    fixture.fixture.tables.staff_journals=[{...batch,status:'draft'}];
    fixture.fixture.tables.staff_journal_lines=records;
    await desktop.page.route('**/rpc/review_inbox14229',route=>route.fulfill({json:[active]}));
    await desktop.page.evaluate(j=>{
      const user=availableSubUsers().find(u=>u.id===j.owner_id);
      user.user_permissions.workspace_entry_mode240='double_full';
      reviewStaffJournals.push(j);
      openWorkspaceUser(user.id);personalJournal1437.show(user.id,'journal');
    },active);
    const table=desktop.page.locator('.personal-active1437 tbody');
    await table.getByText(memos[0],{exact:true}).first().waitFor();
    for(const memo of memos.slice(0,9))assert(await table.getByText(memo,{exact:true}).count()>0);
    assert.deepEqual(await table.locator('.general-description14281').allTextContents(),[general]);
    console.log('PASS desktop Active Journal uses receipt memos with one fallback for the receipt without a memo');
    console.log('PASS ten Cashbook receipts from Save to Entries and submitted History, saved batch description, blank memo fallback, receipt and batch searches');
  } finally {await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
