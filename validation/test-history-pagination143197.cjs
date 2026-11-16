const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login}=await f.open();await login();
  await page.waitForFunction(()=>!window.idleSync14341?.running);
  await page.evaluate(()=>{
   const account=AccountingStore.accounts[0];
   window.setTestEntries=(sizes)=>{
    const rows=sizes.flatMap((size,entry)=>Array.from({length:size},(_,line)=>({
     id:'PAGER'+String(sizes.length-entry).padStart(3,'0'),dbEntryId:'pager-'+entry,date:'2026-09-30',
     created_at:'2026-09-30T12:00:00Z',account:account.name,accountId:account.id,currency:'LAK',
     debit:line%2?0:1000,credit:line%2?1000:0,memo:'September payroll line '+line,generalMemo:'Payroll',archived:false
    })));
    JournalModule.entries=rows;historyMonth14341.setMonth('journal','2026-09');renderAllTransactionsTable();
   };
   switchTab('transactions-all');setTestEntries([98,7,118,1]);
  });
  const area=page.locator('#transactions-all'),bar=area.getByRole('navigation',{name:'Transaction pagination'});
  const controls=area.locator('.history-header14342:visible .archive-month-actions');
  for(const name of ['Back','Review','Export'])assert(await controls.getByRole('button',{name,exact:true}).isVisible(),name);
  assert.equal(await area.locator('.transaction-pages-top143197').count(),0);
  const search=controls.locator('input[type=search]');
  const rows=area.locator('#archiveBody0 tr[data-entry-id]:not(.journal-description14281)');
  const ids=()=>rows.evaluateAll(rs=>[...new Set(rs.map(r=>r.dataset.entryId))]);
  const checkBottom=async()=>{await page.waitForFunction(()=>{
   const bar=document.querySelector('.tab-content.active [data-current-pager]');if(!bar)return false;
   const r=bar.getBoundingClientRect();return r.height>0&&r.width<360&&Math.abs(innerHeight-r.bottom)<20;
  });};
  await checkBottom();assert.equal(await rows.count(),105);assert.deepEqual(await ids(),['PAGER004','PAGER003']);
  assert.equal(await bar.locator('span').innerText(),'1 of 3');assert(await bar.getByRole('button',{name:'Previous'}).isDisabled());
  await page.locator('#printableDocArea').evaluate(n=>n.scrollTop=600);await checkBottom();
  await bar.getByRole('button',{name:'Next'}).click();assert.equal(await rows.count(),118);assert.deepEqual(await ids(),['PAGER002']);
  assert.equal(await bar.locator('span').innerText(),'2 of 3');
  await bar.getByRole('button',{name:'Next'}).click();assert.equal(await rows.count(),1);assert.deepEqual(await ids(),['PAGER001']);await checkBottom();
  assert(await bar.getByRole('button',{name:'Next'}).isDisabled());
  await bar.getByRole('button',{name:'Previous'}).click();assert.equal(await rows.count(),118);
  for(const sizes of [[],[3],[100],[156],[98,7]]){
   await page.evaluate(s=>setTestEntries(s),sizes);assert.equal(await bar.count(),0);
  }
  await page.evaluate(()=>setTestEntries([100,1]));await checkBottom();assert.equal(await rows.count(),100);
  await bar.getByRole('button',{name:'Next'}).click();assert.equal(await rows.count(),1);
  // Ledger lines may be interleaved by receipt date. No page break splits an ID or changes date order.
  assert.deepEqual(await page.evaluate(()=>{const ids=Array.from({length:107},(_,i)=>i===90||i===103?'one':String(i));return entryPageRanges14340(ids,id=>id);}),[[0,104],[104,107]]);
  await search.click();await search.fill('PAGER001');assert.equal(await rows.count(),1);assert.equal(await bar.count(),0);
  await search.fill('');await checkBottom();assert.equal(await rows.count(),100);
  await controls.getByRole('button',{name:'Back',exact:true}).click();assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'journal');
  console.log('PASS compact History header, one floating pager, complete Entry IDs, boundary and short last pages.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
