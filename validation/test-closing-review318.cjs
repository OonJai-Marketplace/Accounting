const assert = require('node:assert/strict');
const create = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await create();
 try {
  const {page, login} = await fixture.open();
  await login();
  const month = '2026-01';
  const rows = [1, 2].map(n => ({
   id: 'scheduled-' + n, journal_entry_id: 'entry-' + n,
   journal_entries: {entry_no: 'AMO-' + n, transaction_date: month + '-01', status: 'posted'}
  }));
  const confirmed = new Set();
  await page.route('**/rest/v1/scheduled_journal_occurrences?**', route => {
   const isPending = new URL(route.request().url()).searchParams.get('reviewed_at') === 'is.null';
   return route.fulfill({json: isPending ? rows.filter(row => !confirmed.has(row.id)) : []});
  });
  let failOnce = true;
  await page.route('**/rest/v1/rpc/review_scheduled_occurrence91', route => {
   if (failOnce) {
    failOnce = false;
    return route.fulfill({status: 409, json: {message: 'Retry fixture'}});
   }
   confirmed.add(route.request().postDataJSON().p_occurrence);
   return route.fulfill({json: null});
  });
  await page.evaluate(month => finishEditing69(month), month);
  const gate = page.locator('#scheduledReviewGate91');
  const buttons = gate.locator('[data-confirm]');
  const notice=page.locator('#status118 .status-close1440');
  if(await notice.isVisible())await notice.click();
  await buttons.first().click();
  await page.waitForFunction(() => document.querySelector('[data-confirm]')?.textContent === 'Retry confirmation');
  await buttons.first().click();
  await page.waitForFunction(() => document.querySelector('[data-confirm]')?.textContent === 'Confirmed');
  assert.equal(await gate.locator('[data-continue]').isDisabled(), true);
  await buttons.last().click();
  await page.waitForFunction(() => document.querySelector('[data-continue]')?.disabled === false);
  assert.equal(await gate.locator('[role=status]').innerText(), '2 of 2 confirmed');
  await gate.locator('[data-continue]').click();
  assert.equal(confirmed.size, 2);
  assert.equal(await gate.count(), 0);

  await notice.click(); // The fixture has no posted journal in this month.
  const issues = [
   ...['june','october'].map(id => ({id:'report:'+id, title:'Deferred staff report', detail:'Cashier A / '+id+': unposted lines'})),
   ...Array.from({length:120}, (_,n) => ({
    id:'fx:test:'+n, title:'Source review', detail:(n%2?'TEST-21 / account 9290':'TEST-128: original rates')
   })),
   {id:'memo:entry', title:'Missing entry description', detail:'TEST-17'}
  ].map(i => ({...i,severity:'warning'}));
  const check = {version:14324,month:month+'-01',fingerprint:'fixture',issues,trial:[],balances:[],
   entry_checks:[{entry_no:'TEST-21',date:'2026-01-30'},{entry_no:'TEST-128',date:'2026-01-01'}],
   coverage:{version:281},reconciliation305:{version:305,items:[]},
   pending:{revision:'fixture',items:[{id:'october',owner_id:'cashier',owner_name:'Cashier A'}]}};
  await page.route('**/rest/v1/staff_journals?**', route => route.fulfill({json:
   ['june','october'].map(id => ({id,owner_id:'cashier',period_start:'2026-01-01',owner:{user_permissions:{job_title:'Cashier'}}}))}));
  await page.route('**/rest/v1/rpc/maintenance_preflight14324', route => route.fulfill({json:check}));
  await page.evaluate(month => {window.testReview=maintenance14324.review(month)},month);
  const review=page.locator('.maintenance-modal14324');
  const groups=review.locator('[data-review-group]');
  await review.getByText('Accounting follow-up (123)',{exact:true}).click();
  await groups.first().waitFor();
  assert.equal(await groups.count(),3);
  assert.match(await groups.first().locator('legend').innerText(),/Cashier · Cashier A/);
  const fxGroup=groups.filter({hasText:'Foreign currency · posted journals'});
  assert.equal(await fxGroup.locator('details details').count(),2);
  const submit=review.locator('footer button').last();
  assert.equal(await submit.isEnabled(),true);
  await review.locator('[data-common-reason]').fill('Reviewed remaining source records');
  await groups.first().locator('[data-group-reason]').fill('Defer cashier drafts');
  await fxGroup.locator('summary').first().click();
  await fxGroup.locator('details details summary').first().click();
  await review.locator('[data-review-item="fx:test:0"] [data-item-reason]').fill('Opening carrying value reviewed');
  assert.equal(await submit.isEnabled(),true);
  await submit.click();
  const result=await page.evaluate(async()=> (await window.testReview).review);
  assert.deepEqual(Object.keys(result.acknowledgments).sort(),issues.map(i=>i.id).sort());
  assert.equal(result.acknowledgments['report:june'].reason,'Defer cashier drafts');
  assert.equal(result.acknowledgments['fx:test:0'].reason,'Opening carrying value reviewed');
  assert.equal(result.acknowledgments['fx:test:119'].reason,'Reviewed remaining source records');
  await page.evaluate(month=>{window.testReview=maintenance14324.review(month)},month);
  await review.getByText('Accounting follow-up (123)',{exact:true}).waitFor();
  await submit.click();
  const monthly=await page.evaluate(async()=> (await window.testReview).review);
  assert.equal(monthly.acknowledgments['fx:test:0'].reason,'Retained in Data Check for monthly accounting follow-up.');
  check.decisions319=Object.fromEntries(issues.map(i=>[i.id,{saved:{reason:result.acknowledgments[i.id].reason,month:'2025-12-01',allowCarry:false}}]));
  check.decisionRevision319='fixture-decisions';
  await page.evaluate(month=>{window.testReview=maintenance14324.review(month)},month);
  await review.getByText('Previously acknowledged (123)',{exact:true}).waitFor();
  assert.equal(await review.locator('[data-common-reason]').count(),0);
  assert.equal(await submit.isEnabled(),true);
  await submit.click();
  const repeated=await page.evaluate(async()=> (await window.testReview).review);
  assert.equal(repeated.decisionRevision319,'fixture-decisions');
  assert.deepEqual(repeated.acknowledgments,result.acknowledgments);
  // A monthly close through Finish opens the final review directly. The database fixture records only an explicit final click.
  let closeCalls=0;
  await page.route('**/rest/v1/rpc/maintenance_finish14324',route=>{
   fixture.fixture.tables.accounting_periods=[{period_month:month+'-01',status:'closed'}];
   closeCalls++;return route.fulfill({json:{status:'closed'}});
  });
  await page.evaluate(month=>{
   const record={id:'TEST-CLOSE',date:month+'-10',currency:'LAK',memo:'Temporary',account:'Cash',accountId:'fixture'};
   JournalModule.entries.push({...record,debit:10,credit:0},{...record,debit:0,credit:10});
   void finishEditing69(month);
  },month);
  await review.getByText('Previously acknowledged (123)',{exact:true}).waitFor();
  assert.equal(closeCalls,0);
  await review.getByRole('button',{name:'Confirm & Close Month',exact:true}).click();
  await page.waitForFunction(month=>PeriodReview.status(month)==='closed',month);
  assert.equal(closeCalls,1);

  // The year-end action still requires an explicit reason for current findings.
  await page.evaluate(month=>{window.testReview=maintenance14324.review(month,{kind:'year'})},month);
  await review.locator('[data-common-reason]').waitFor();
  assert.match(await review.locator('h3').allTextContents().then(parts=>parts.join(' ')),/annual review \(123\)/i);
  assert.equal(await submit.isDisabled(),true);
  await review.getByRole('button',{name:'Cancel',exact:true}).click();
  check.issues.push({id:'required-reconciliation',severity:'block',title:'Required reconciliation',detail:'Fixture account'});
  const blocked=await page.evaluate(async month=>{
   try{await maintenance14324.review(month);return false}catch(error){return error.message}
  },month);
  assert.match(blocked,/Closing blocked/);
  assert.equal(await review.count(),0);
  console.log('PASS scheduled confirmation retry, same-dialog progress, continuation and grouped per-finding closing acknowledgments');
 } finally { await fixture.close() }
})().catch(error => { console.error(error); process.exitCode=1 });
