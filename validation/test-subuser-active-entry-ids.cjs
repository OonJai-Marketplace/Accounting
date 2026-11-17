const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');

(async()=>{
  const f=await fixture();
  try {
    for(const device of ['phone','desktop']){
      const {page,login,me}=await f.open(device,device==='phone'?'submitter':'admin');
      const user=device==='phone'?me:f.fixture.profiles.find(p=>p.id!==me.id);
      const permissions=user.user_permissions;
      permissions.workspace_entry_mode240=device==='phone'?'cashbook':'double_full';
      Object.assign(f.fixture.tables.user_permissions.find(p=>p.user_id===user.id),permissions);
      const fund=permissions.assigned_fund_account_ids[0],account=permissions.destination_account_ids[0];
      const batch={id:crypto.randomUUID(),owner_id:user.id,status:'draft',period_start:'2026-11-01'};
      const rows=[];
      for(const [base,date,count] of [[54,'2026-11-20',2],[62,'2026-11-20',1],[63,'2026-11-11',2],[65,'2026-11-02',2]]){
        const components=Array.from({length:count},(_,i)=>({date,direction:'out',fund,account,amount:100+i,kind:'payment',memo:'Receipt '+base,reference:''}));
        const snapshot={mode:'double',receiptEditor341:true,date,memo:'Receipt '+base,components1437:components,rows:[]};
        for(const [i,item] of components.entries())rows.push({
          id:crypto.randomUUID(),staff_journal_id:batch.id,editor_group1437:'receipt-'+base,editor_snapshot1437:snapshot,
          line_no:base+i,workspace_entry_no:'SRR26'+String(base+i).padStart(4,'0'),transaction_date:date,
          fund_account_id:fund,account_id:account,currency_code:'LAK',direction:'out',entry_kind:'payment',
          amount:item.amount,reference:'',memo:i===0?'Corrected '+base:item.memo
        });
      }
      // A corrected receipt has one persisted number, even when an older editor rewrites its group metadata.
      for(const n of [54,65]){
        const parts=rows.filter(l=>l.editor_group1437==='receipt-'+n);
        parts[1].receipt_parent_id=parts[0].id;
        parts[1].workspace_entry_no=parts[0].workspace_entry_no;
        parts[1].editor_group1437='later-component-edit-'+n;
      }
      const numbers=['SRR260065','SRR260063','SRR260062','SRR260054'];
      const anchor=rows.find(l=>l.workspace_entry_no===numbers[0]).id;
      const order=device==='phone'?[...rows].reverse():rows;
      f.fixture.tables.staff_journals=[batch];
      f.fixture.tables.staff_journal_lines=order;
      await page.route('**/rpc/review_inbox14229',route=>route.fulfill({json:[{...batch,lines:order}]}));
      await login();
      if(device==='phone'){
        await page.locator('#bottom [data-page=entries]').tap();
        const entries=page.locator('details.entry');
        const read=()=>entries.locator('.entry-copy small').allTextContents().then(text=>text.map(s=>s.match(/SRR\d+/)[0]));
        await entries.first().waitFor();
        assert.deepEqual(await read(),numbers);
        const target=page.locator('details[data-group="'+anchor+'"]');
        await target.locator('summary').tap();
        assert.equal(await target.locator('.entry-body p').count(),4);
        assert.match(await target.innerText(),/Corrected 65/);
        await page.getByRole('button',{name:'Sort by Entry ID, lowest first'}).tap();
        assert.deepEqual(await read(),numbers.toReversed());
        await target.locator('summary').tap();
        await target.getByRole('button',{name:'Edit',exact:true}).tap();
        await page.locator('#postForm').waitFor();
        assert.equal(await page.locator('#postForm').innerText().then(s=>s.includes('Corrected 65'))||await page.locator('#postForm input,#postForm textarea').evaluateAll(items=>items.some(item=>item.value.includes('Corrected 65'))),true);
      }else{
        await page.evaluate(id=>{openWorkspaceUser(id);personalJournal1437.show(id,'journal');},user.id);
        const journal=page.locator('.personal-active1437');
        const ids=journal.locator('[data-entry-menu14387]');
        await ids.first().waitFor();
        assert.deepEqual(await ids.allTextContents(),numbers);
        assert.equal(await journal.locator('tr[data-entry-id="'+anchor+'"]:has(td.num)').count(),4);
        await journal.getByRole('button',{name:'Sort by Entry ID, lowest first'}).click();
        assert.deepEqual(await ids.allTextContents(),numbers.toReversed());
        await page.evaluate(()=>personalJournal1437.chooseMode('single'));
        assert.deepEqual(await ids.allTextContents(),numbers.toReversed());
        assert.equal(await journal.locator('tr[data-entry-id="'+anchor+'"]').count(),2);
      }
      await page.context().close();
    }
    console.log('PASS matching saved IDs and four current receipt lines, reversed fetch order, backdated entries, cashbook, double entry, ascending and descending.');
  } finally {await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
