const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open();
  let count=0,reads=0,deleted=false;
  await page.route('**/rpc/audit_page143198',async route=>{
   const {p_month,p_offset,p_limit}=route.request().postDataJSON();
   const rows=Array.from({length:count},(_,i)=>({id:String(i+1),category143324:'R2',record_id:'entry-'+i,
    created_at:p_month+'T03:00:00Z',action:'UPDATE',summary143198:true,auditSource1434:'audit_log',reason:'Test'}));
   await route.fulfill({json:{month:p_month.slice(0,7),counts:{red:count},total:count,months:[p_month.slice(0,7)],rows:rows.slice(p_offset,p_offset+p_limit)}});
  });
  await page.route('**/rpc/my_active_journal_notes377',r=>{reads++;return r.fulfill({json:deleted?[]:[{note_key:'test-key',entry_no:'TEST001',edited_at:'2026-11-12T06:10:00Z',reason:'Corrected line memo'}]});});
  await page.route('**/rpc/delete_my_journal_edit_note377',r=>{
   assert.deepEqual(r.request().postDataJSON(),{p_note_key:'test-key'});deleted=true;return r.fulfill({json:true});
  });
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(async()=>{switchTab('transactions-voided');await loadTransactionAudit(true);});
  const cleanup=page.locator('[data-audit-cleanup313]');
  assert.equal(await cleanup.count(),1);
  assert(await cleanup.evaluate(b=>!!b.parentElement.querySelector('[data-history-month14341=audit]')));
  assert.equal(await page.locator('#auditMonths98 .period-empty').evaluate(c=>c.colSpan),6);
  assert.equal(await page.locator('[data-audit-page143198]').count(),0);
  assert.equal(reads,0);
  await page.locator('.journal-edit-reasons377 > button').click();
  await page.getByText('Corrected line memo',{exact:true}).waitFor();
  assert.equal(reads,1);
  const del=page.locator('.journal-edit-reasons377 [data-delete-note]');
  await page.evaluate(()=>{ui117.confirm=async()=>false;});
  await del.click();assert.equal(deleted,false);
  await page.evaluate(()=>{ui117.confirm=async()=>true;});
  await del.click();await page.getByText('No edit notes for this month.').waitFor();assert(deleted);
  for(const n of [50,51]){
   count=n;
   await page.evaluate(()=>loadTransactionAudit(true));
   assert.equal(await page.locator('[data-audit-page143198]').count(),n===50?0:2);
   assert.equal(await cleanup.count(),1);
  }
  const pager=page.locator('#auditMonths98 .audit-pager377');
  assert.equal(await pager.evaluate(n=>getComputedStyle(n).justifyContent),'flex-end');
  await pager.getByText('Next').click();await pager.getByText('51–51 of 51').waitFor();
  assert(await pager.getByText('Next').isDisabled());
  await pager.getByText('Previous').click();await pager.getByText('1–50 of 51').waitFor();
  await cleanup.click();await page.locator('#auditCleanup313').waitFor();
  await page.locator('#auditCleanup313 [data-cancel]').click();
  f.fixture.tables.workspace_todos136=[{id:'fixture',owner_id:f.fixture.profiles[0].id,title:'Review cash',
   steps:[{text:'Count cash',done:false}],sequential:true}];
  await page.evaluate(async()=>{
   switchTab('transactions-recurring');workspace14337.showTodos();
   await workflow136.loadTodos();todos1438.render();
  });
  const card=page.locator('#todo1438-fixture'),summary=card.locator('summary');
  await summary.waitFor();
  assert.equal(await card.evaluate(n=>n.open),false);
  const css=await card.evaluate(n=>({edge:getComputedStyle(n).borderTopColor,thickness:getComputedStyle(n).borderTopWidth,
   header:getComputedStyle(n.querySelector('summary')).backgroundColor,
   arrow:getComputedStyle(n.querySelector('strong'),'::before').transform}));
  assert.equal(css.edge,'rgb(5, 150, 105)');assert.equal(css.thickness,'5px');assert.equal(css.header,'rgb(236, 253, 245)');assert.notEqual(css.arrow,'none');
  await summary.click();assert(await card.getByText('Count cash',{exact:true}).isVisible());
  await page.evaluate(()=>todos1438.render());assert(await card.evaluate(n=>n.open));
  await summary.click();assert.equal(await card.locator('input[type=checkbox]').isVisible(),false);
  console.log('PASS audit toolbar, full empty row, 0/50/51 events, both paging directions, private reasons on demand, and collapsible mint/emerald task cards');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
