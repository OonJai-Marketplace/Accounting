const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');

(async()=>{
  const f=await fixture();
  try{
    for(const device of ['phone','desktop']){
      const {page,login,me}=await f.open(device,device==='phone'?'submitter':'admin');
      const user=device==='phone'?me:f.fixture.profiles.find(u=>u.id!==me.id);
      const id=user.user_permissions.assigned_fund_account_ids[0];
      const account={id,code:'1020',currency:'LAK',name:'Test petty cash'};
      const month='2026-11',date=month+'-03';
      await page.clock.setFixedTime(new Date(date+'T04:00:00Z'));
      const rows=[
        {id:'1',date:month+'-01',reference:'First',description:'Cash received',debit:100,credit:0,balance:100},
        {id:'2',date,reference:'Second',description:'Market payment',debit:0,credit:125,balance:-25},
        {id:'3',date,reference:'Third',description:'Cash returned',debit:25,credit:0,balance:0}
      ];
      let grants=[account],stage='draft',received=100,used=125;
      const movements=()=>stage==='posted'?[]:[
        {id:'a',account:id,date:month+'-01',line_no:1,memo:'Kitchen rice',status:stage,counted:true,amount:-100},
        {id:'b',account:id,date,line_no:2,memo:'Market vegetables',status:stage,counted:true,amount:-25}
      ];
      await page.route('**/rpc/workspace_standing379',route=>route.fulfill({json:{detailVersion:1,asOf:date,
        accounts:[{...account,opening:0,received,used}],lines:movements()}}));
      await page.route('**/rpc/assigned_ledger14281',route=>{
        assert.equal(route.request().postDataJSON().p_owner,user.id);
        return route.fulfill({json:{accounts:grants,opening:0,closing:0,rows}});
      });
      if(device==='phone'){
        const batches=['draft','submitted'].map(status=>({id:status,owner_id:user.id,period_start:month+'-01',status}));
        f.fixture.tables.staff_journals=batches;
        f.fixture.tables.staff_journal_lines=batches.flatMap(j=>[2,1,3].map(n=>({
          id:j.id+n,staff_journal_id:j.id,transaction_date:n===1?month+'-01':date,line_no:n,
          created_at:date+'T01:00:00Z',memo:'Slip '+n,workspace_entry_no:'Slip '+n,
          direction:'out',amount:n,currency_code:'LAK',fund_account_id:id,account_id:user.user_permissions.destination_account_ids[0]
        })));
      }
      await login();
      if(device==='desktop')await page.evaluate(id=>{openWorkspaceUser(id);personalJournal1437.show(id,'home');},user.id);
      const standing=page.locator('[data-standing379]').filter({has:page.getByText('Test petty cash',{exact:true})});
      const card=standing.locator('article');
      await card.locator('strong').first().waitFor();
      const net=()=>card.locator('strong').first().innerText();
      assert.match(await net(),/\(.*25.*\)/);
      const values=()=>card.locator('.fund-breakdown dd').allTextContents();
      let [before,submitted,unsubmitted]=await values();
      assert.match(before,/100/);assert.doesNotMatch(submitted,/125/);assert.match(unsubmitted,/\(.*125.*\)/);
      await card.locator('summary').click();
      assert.deepEqual(await card.locator('.fund-pending li>div:first-child b').allTextContents(),['Market vegetables','Kitchen rice']);
      assert.match(await card.locator('.fund-pending li').first().textContent(),/Remaining \(.*25/);
      const original=await net();
      for(stage of ['submitted','posted']){
        await page.evaluate(()=>WorkingStanding379.refresh());
        assert.equal(await net(),original);
        [before,submitted,unsubmitted]=await values();
        if(stage==='submitted'){assert.match(submitted,/125/);assert.match(await card.locator('li').first().textContent(),/Submitted/);}
        else{assert.match(before,/\(.*25/);assert.equal(await card.locator('li').count(),0);}
        assert.doesNotMatch(unsubmitted,/125/);
      }
      if(device==='phone'){
        await page.locator('#bottom [data-page=ledger]').tap();
        const ledger=page.locator('[data-phone-ledger]');
        assert.equal(await page.locator('#bottom [data-page=ledger]').getAttribute('aria-current'),'page');
        await ledger.getByText('Cash received',{exact:true}).waitFor();
        assert.deepEqual(await ledger.locator('article>b').allTextContents(),['Cash returned','Market payment','Cash received']);
        const balances=await ledger.locator('article .row span:last-child').allTextContents();
        assert.match(balances[0],/0\.00/);assert.match(balances[1],/\(.*25\.00\)/);assert.match(balances[2],/100\.00/);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
        grants=[];await ledger.getByRole('button',{name:'Refresh ledger'}).tap();
        await ledger.getByText('No ledger accounts are assigned to you. Ask your administrator to check Ledger viewing access.').waitFor();
        assert.equal(await ledger.locator('article').count(),0);
        await page.locator('#bottom [data-page=entries]').tap();
        for(const view of ['entries','history']){
          await page.locator('.entry-tabs212 [data-page='+view+']').tap();
          await page.locator('details.entry').first().waitFor();
          assert.deepEqual(await page.locator('details.entry .entry-copy b').allTextContents(),['Slip 3','Slip 2','Slip 1']);
        }
      }else{
        await page.evaluate(id=>personalJournal1437.show(id,'ledger'),user.id);
        const table=page.locator('[data-ledger-results] tbody');
        await table.getByText('Cash received',{exact:true}).waitFor();
        assert.deepEqual(await table.locator('td[data-label="Entry ID"]').allTextContents(),['Third','Second','First']);
        const balances=await table.locator('td[data-label="Running balance"]').allTextContents();
        assert.match(balances[1],/^\(25(?:\.00)?\)$/);assert.doesNotMatch(balances.join(' '),/dr|cr/i);
        await page.locator('[data-ledger-search]').click();
        await page.locator('[data-ledger-search]').fill('payment');
        assert.equal(await table.locator('tr').count(),1);
        assert.equal(await table.locator('td').last().textContent(),balances[1]);
      }
      await page.context().close();
    }
    const admin=await f.open('phone','admin');
    const accounts=Array.from({length:80},(_,i)=>({id:'account-'+i,name:'Fixture account '+i,currency:'LAK',opening:0,received:i,used:0}));
    admin.me.user_permissions.assigned_fund_account_ids=accounts.map(a=>a.id);
    f.fixture.balances[admin.me.id]=accounts.map(a=>({...a,account_id:a.id}));
    let balanceReads=0;
    await admin.page.route('**/rpc/workspace_standing379',route=>{
      balanceReads++;
      return route.fulfill({json:{detailVersion:1,accounts,lines:[],asOf:'2026-11-03'}});
    });
    await admin.login();
    const workspace=admin.page.locator('#workspace');
    await workspace.locator('[data-go=accounts]').waitFor();
    assert.equal(await workspace.locator('[data-standing379]').count(),0);
    assert.doesNotMatch(await workspace.innerText(),/Fixture account/);
    assert.equal(balanceReads,0);
    await workspace.locator('[data-go=accounts]').tap();
    await workspace.getByText('Fixture account 79',{exact:true}).waitFor();
    await admin.page.locator('#bottom [data-page=home]').tap();
    assert.doesNotMatch(await workspace.innerText(),/Fixture account/);
    await admin.context.close();
    console.log('PASS administrator phone Home with 80 assigned accounts');
    console.log('PASS phone and desktop fund balances through submission and posting, newest-first detail, ledger order, debit/credit signs, zero, search and phone grant revocation');
  }finally{await f.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
