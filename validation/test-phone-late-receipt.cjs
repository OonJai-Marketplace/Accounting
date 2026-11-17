const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');

(async()=>{
  const app=await fixture();
  try {
    const {page,login,me}=await app.open('phone','submitter');
    const p=me.user_permissions,fund=p.assigned_fund_account_ids[0],category=p.destination_account_ids[0];
    const saves=[];
    await page.route('**/rpc/save_staff_editor1437',async route=>{
      const body=route.request().postDataJSON();saves.push(body);
      await route.fulfill({json:{line_ids:body.p_items.map(()=>crypto.randomUUID())}});
    });
    await page.clock.setFixedTime(new Date('2026-11-17T04:00:00Z'));
    await login();
    await page.locator('[data-page=post]').tap();
    const act=name=>page.locator('[data-action="'+name+'"]');
    const mode=async m=>{if(await act('switch-method').getAttribute('data-mode')!==m)await act('switch-method').tap();};
    const field=(k,i,root=page)=>root.locator('[data-field="'+k+'"]'+(i==null?':not([data-index])':'[data-index="'+i+'"]'));
    await mode('double');
    await field('memo').fill('Late November 2 kitchen receipt');
    await act('entry-date').tap();
    await page.locator('[data-receipt-date="2026-11-02"]').tap();
    await act('entry-date').tap();await page.getByLabel('Multiple dates').check();
    await field('account',0).selectOption(fund);await field('credit',0).fill('990');
    await field('memo',0).fill('Fund note');await field('reference',0).fill('Bank ref');
    await field('account',1).selectOption(category);await field('debit',1).fill('1000');
    await field('memo',1).fill('Vegetables');await field('reference',1).fill('Slip ref');
    await act('add-line').tap();
    await mode('single');
    const journal=page.locator('[data-journal-parent]');
    assert(await field('credit',0,journal).isVisible());
    await page.locator('#postForm [type=submit]').tap();
    assert.match(await page.locator('#notice').innerText(),/10/);assert.equal(saves.length,0);
    await journal.locator('[data-action=line-date][data-index="0"]').tap();
    await page.locator('[data-receipt-date="2026-11-03"]').tap();
    await field('account',1,journal).selectOption(category);
    await field('credit',0,journal).fill('1000');
    await field('reference',1,journal).fill('Receipt 42');
    await field('memo',1,journal).fill('Market vegetables');
    await page.reload();await field('amount',0).waitFor();
    assert.equal(await field('amount',0).inputValue(),'1,000');
    assert.equal(await field('affected',0).inputValue(),category);
    assert.equal(await field('fundReference',0).inputValue(),'Bank ref');
    assert.equal(await field('memo',0).inputValue(),'Market vegetables');
    assert.equal(await act('fund-date').getAttribute('data-value'),'2026-11-03');
    await act('fund-date').tap();await page.locator('[data-receipt-date="2026-11-04"]').tap();
    await mode('double');
    assert.equal(await field('credit',0).inputValue(),'1,000');
    assert.equal(await act('line-date').first().getAttribute('data-value'),'2026-11-04');
    await act('add-line').tap();
    await mode('single');
    assert.equal(await field('amount',0).count(),1);
    await act('add-receipt').tap(); // Only the default fund and date in the new card.
    const saved=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437'));
    await page.locator('#postForm [type=submit]').tap();await saved;
    assert.equal(saves.length,1);
    const {p_items:items,p_snapshot:snapshot}=saves[0];
    assert.equal(items.length,1);
    assert.deepEqual([items[0].date,items[0].amount,items[0].reference],['2026-11-02',1000,'Receipt 42']);
    assert.deepEqual(snapshot.rows.map(row=>row.date),['2026-11-04','2026-11-02']);
    console.log('PASS fund-first November 2 draft, editable unequal sides and dates, refresh, one cashbook movement, dated blank cards, queue delivery');
  }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
