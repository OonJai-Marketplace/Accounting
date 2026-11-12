const assert = require('node:assert/strict');
const create = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await create();
 try {
  const {page,login} = await fixture.open();
  await login();
  await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{
   const account = AccountingStore.accounts[0].id;
   const original = 'HIST-2026-06-PC-';
   const lines = [2,1].map(line_no=>({line_no,id:'fixture-'+line_no,workspace_entry_no:original+(6+line_no),
    transaction_date:'2026-06-02',account_id:account,fund_account_id:account,currency_code:'LAK',
    amount:321000,memo:'Petty cash supplies and replacement items for the kitchen',direction:'out'}));
   reviewStaffJournals=[{id:'history-fixture',owner_id:liveProfile.id,seed_key:'HISTORY-XLSX:2026-06:STAFF',
    period_start:'2026-06-01',status:'posted',lines}];
   switchTab('transactions-all');budgetWorkflow14316.history('submitted');renderUserEntryReview();
   const month=document.querySelector('[data-history-month14341="submitted"]');
   month.value='2026-06';month.dispatchEvent(new Event('change',{bubbles:true}));
   const card=document.querySelector('#userEntryHistoryCards .final-record-card');
   if(card)card.open=true;
  });
  const table=page.locator('#userEntryHistoryCards .final-source-table table').first();
  await table.waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#userEntryHistoryCards .final-source-table table.workspace-columns376'));
  assert.deepEqual(await table.locator('tbody tr td:first-child').allTextContents(),['HIS2606-PC02','HIS2606-PC01']);
  assert.match(await page.locator('#userEntryHistoryCards .submission-reference143103').textContent(),/HIS2606-STAFF/);
  const dims=await table.evaluate(t=>{
   const [id,date,account,description,amount]=[...t.tHead.rows[0].cells].map(c=>Math.round(c.getBoundingClientRect().width));
   return {id,date,account,description,amount,w:t.offsetWidth,box:t.parentElement.clientWidth};
  });
  assert(Math.abs(dims.w-dims.box)<=2&&dims.description>dims.account&&dims.account>dims.id,JSON.stringify(dims));
  const unchanged=await page.evaluate(()=>reviewStaffJournals[0].lines[0].workspace_entry_no);
  assert.equal(unchanged,'HIST-2026-06-PC-8');
  const normal=await page.evaluate(()=>submissionHistoryIds.entry({line_no:1,workspace_entry_no:'SGC260001'}));
  assert.equal(normal,'SGC260001');
  await page.evaluate(()=>{
   const staff=availableSubUsers()[0];
   const journal={...reviewStaffJournals[0],owner_id:staff.id};
   openWorkspaceUser(staff.id);reviewStaffJournals=[journal];
   personalJournal1437.show(staff.id,'history');
   document.querySelector('#personalWorkspace1437 .final-record-card').open=true;
  });
  const ownTable=page.locator('#personalWorkspace1437 .final-record-card table').first();
  assert.deepEqual(await ownTable.locator('tbody tr td:first-child').allTextContents(),['HIS2606-PC02','HIS2606-PC01']);
  await page.locator('#personalWorkspace1437 [data-history-search]').click();
  await page.locator('#personalWorkspace1437 [data-history-search]').fill('his2606-pc02');
  assert.equal(await page.locator('#personalWorkspace1437 .final-record-card').count(),1);
  console.log('PASS Submitted History shows stable IDs and a full-width source table',dims);
 } finally {await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
