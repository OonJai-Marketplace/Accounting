const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

(async () => {
  const fixture=await createFixture();
  try {
    const {page,login,me}=await fixture.open('phone','submitter');
    const p=me.user_permissions, fund=p.assigned_fund_account_ids[0], account=p.destination_account_ids[0];
    p.assigned_fund_account_ids=[fund];p.allowed_directions=['out'];
    await login();
    await page.locator('[data-page=post]').click();
    const act=name=>page.locator('[data-action="'+name+'"]'), field=(key,i)=>page.locator('[data-field="'+key+'"]'+(i==null?':not([data-index])':'[data-index="'+i+'"]'));
    const setMode=async mode=>{if(await act('switch-method').getAttribute('data-mode')!==mode)await act('switch-method').tap();};
    await setMode('double');
    for(let i=2;i<10;i++)await act('add-line').tap();
    for(let i=0;i<10;i++){
      await field('account',i).selectOption(i===9?fund:account);
      await field(i===9?'credit':'debit',i).fill(i===9?'9000':'1000');
    }
    await field('memo').fill('Kitchen purchases');
    await page.getByRole('button',{name:'Split receipt on line 5',exact:true}).tap();
    const split=page.locator('[data-split-number="5"]');
    const letters=()=>split.locator('.split-line-heading strong').allTextContents();
    assert.deepEqual(await letters(),['5A','5B']);
    await split.getByRole('button',{name:'+ Add split line'}).tap();
    assert.deepEqual(await letters(),['5A','5B','5C']);
    assert.equal(await page.getByRole('combobox',{name:'Account for line 6',exact:true}).getAttribute('data-index'),'7');
    await split.getByLabel('Receipt reference').fill('SLIP-5');
    for(const [index,amount] of [[4,500],[5,300],[6,200]]){
      await field('account',index).selectOption(account);
      await field('debit',index).fill(String(amount));
    }
    assert.equal(await field('credit',11).inputValue(),'9,000');
    await setMode('single');
    assert.deepEqual(await letters(),['5A','5B','5C']);
    assert.equal(await split.locator('[data-field=source]').count(),1);
    assert.equal(await split.getByLabel('Receipt reference').inputValue(),'SLIP-5');
    await page.reload();
    await split.waitFor();
    assert.deepEqual(await letters(),['5A','5B','5C']);
    await setMode('double');
    assert.equal(await field('credit',11).inputValue(),'9,000');
    const saved=[];
    await page.route('**/rpc/save_staff_editor1437',async route=>{
      const body=route.request().postDataJSON();saved.push(body);
      await route.fulfill({json:{line_ids:body.p_items.map(()=>crypto.randomUUID())}});
    });
    const response=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437'));
    await page.locator('#postForm [type=submit]').tap();await response;
    const body=saved[0],snap=body.p_snapshot, batch=crypto.randomUUID();
    assert.equal(body.p_items.length,11);
    assert.equal(body.p_items.reduce((n,i)=>n+i.amount,0),9000);
    assert.deepEqual(Object.values(snap.splitByLine).map(m=>m.label),['5A','5B','5C']);
    const records=body.p_items.map((item,i)=>({id:crypto.randomUUID(),staff_journal_id:batch,line_no:i+1,
      client_key:body.p_key+':'+(i+1),editor_snapshot1437:snap,editor_group1437:body.p_key+':'+item.date,
      transaction_date:item.date,reference:item.reference,workspace_entry_no:'ENTRY-'+(i+1),
      entry_kind:item.kind,direction:item.direction,fund_account_id:item.fund,account_id:item.account,
      currency_code:'LAK',amount:item.amount,memo:item.memo,status:'draft'}));
    await page.route('**/rest/v1/staff_journals?**',route=>route.fulfill({json:[{id:batch,owner_id:me.id,period_start:snap.date.slice(0,7)+'-01',status:'draft'}]}));
    await page.route('**/rest/v1/staff_journal_lines?**',route=>route.fulfill({json:records}));
    await page.evaluate(()=>PhoneWorkspace14242.refresh());
    await setMode('single');
    await page.locator('#bottom [data-page=entries]').tap();
    const entry=page.locator('details.entry');assert.equal(await entry.count(),1);
    await entry.locator('summary').tap();
    assert.match(await entry.innerText(),/5A/);
    await entry.getByRole('button',{name:'Edit',exact:true}).tap();
    await split.waitFor();assert.deepEqual(await letters(),['5A','5B','5C']);
    const correction=page.waitForResponse(r=>r.url().includes('/rpc/save_staff_editor1437'));
    await page.locator('#postForm [type=submit]').tap();await correction;
    assert.deepEqual(Object.keys(saved[1].p_snapshot.splitByLine),records.slice(4,7).map(l=>l.id));
    await page.waitForFunction(()=>!document.querySelector('[data-field=memo]:not([data-index])')?.value);
    await setMode('single');
    await page.getByRole('button',{name:'Split receipt on line 1',exact:true}).tap();
    const fresh=page.locator('[data-split-number="1"]'), add=fresh.getByRole('button',{name:'+ Add split line'});
    for(let i=2;i<10;i++)await add.tap();
    assert(await add.isDisabled());
    await setMode('double');
    assert.equal(await fresh.locator('.split-line-heading strong').last().innerText(),'1J');
    await setMode('single');
    for(let i=10;i>1;i--)await fresh.locator('[data-action=remove-part]').last().tap();
    assert.equal(await page.locator('.split-receipt').count(),0);
    assert.equal(await act('split-receipt').count(),1);

    const desktop=await fixture.open('desktop','admin');await desktop.login();
    const reports=await desktop.page.evaluate(({records,account,fund})=>{
      const pack={journal:{id:'batch',period_start:records[0].transaction_date.slice(0,7)+'-01',status:'posted',lines:records},user:{full_name:'Kitchen user'},
        accounts:[{id:fund,code:'F',name:'Petty cash',currency:'LAK'},{id:account,code:'E',name:'Kitchen supplies',currency:'LAK'}]};
      // An ordinary receipt has the same typed reference; membership must come from the saved line identity.
      records[0].reference='SLIP-5';
      const op={kind:'subuser',type:'petty',userName:'Kitchen user',status:'posted',opening:0,reference:'Monthly',from:records[0].transaction_date,to:records[0].transaction_date,sourceLines:records};
      const accountDoc=reports14254.accountReport(pack);
      const htmlReports=[accountDoc.html,subReportHtml82(op,false),subReportHtml82(op,true)];
      openDocumentEditor105(accountDoc);
      return htmlReports.map(html=>{
        const root=document.createElement('div');root.innerHTML=html;
        const group=root.querySelector('tbody[data-split-receipt]'),data=[...group.rows].slice(1,-1);
        return {header:group.rows[0].cells[1].textContent,rows:data.map(r=>r.textContent),total:group.rows[group.rows.length-1].textContent,
          span:group.rows[0].cells[0].rowSpan,rule:group.rows[0].cells[0].style.borderLeft,page:root.textContent};
      });
    },{records,account,fund});
    for(const report of reports){
      assert.equal(report.header,'Split receipt 5 · SLIP-5');
      assert.deepEqual(report.rows.map(t=>t.match(/5[A-C]/)[0]),['5A','5B','5C']);
      assert.equal(report.span,5);assert(report.rule);
      assert.match(report.total,/Receipt subtotal.*1,000/);
      assert.match(report.page,/9,000/);
      assert(!report.rows.some(t=>t.includes('SLIP-5')));
    }
    const signers=desktop.page.locator('#reportSignatories275');
    await signers.locator('[name=count]').selectOption('1');
    await signers.locator('[name=person0]').fill('Fixture reviewer');
    await signers.locator('[name=role0]').fill('Manager');
    await desktop.page.locator('.ui-overlay108').filter({has:signers}).locator('footer .primary108').click();
    await desktop.page.getByRole('button',{name:'Add new tab',exact:true}).click();
    await desktop.page.waitForFunction(()=>{
      const doc=document.querySelector('#document-editor105 iframe')?.contentDocument;
      const text=doc?.body?.innerText.toLowerCase() || '';
      return text.includes('split receipt 5 · slip-5') && text.includes('receipt subtotal') && text.includes('5c');
    });
    console.log('PASS line 5 of 10, A–J cap, shared fund, draft refresh, saved edit and both report layouts');
  } finally {await fixture.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
