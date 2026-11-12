const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  fixture.fixture.journalReads=[];
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const month='2026-10';
  await page.evaluate(m=>{PeriodReview.periods[m]={status:'closed'}},month);
  fixture.fixture.journal=Array.from({length:1200},(_,i)=>({
   id:'GL-TEST-'+i,dbEntryId:'fixture-'+i,date:month+'-05',accountId:'cash',account:'Cash',
   accountCode:'100',currency:'LAK',debit:1,credit:0,base_debit:1,base_credit:0,status:'posted'
  }));
  fixture.fixture.journalRevision='report-fixture-299';
  await page.evaluate(()=>reportWindow143195.preload(true));
  await page.evaluate(()=>{Object.assign(Reports79,{kind:'gl',allMonths14331:true,selectedMonths14331:null});switchTab('report-gl')});
  const content=page.locator('#report-gl .r79-content'),filter=page.locator('#report-gl').getByRole('button',{name:'Filter',exact:true});
  await content.waitFor();
  const ledger=page.locator('#report-gl .ledger-columns143108');
  await ledger.locator('tbody[data-ledger-block300] .r79-link[data-entry]').first().waitFor();
  assert.ok(await ledger.locator('.r79-link[data-entry]').count()<150,'only nearby rows are mounted');
  const last=ledger.locator('tbody[data-ledger-block300]').last();await last.scrollIntoViewIfNeeded();
  await last.locator('button[data-entry]').first().waitFor();
  const ordered=await page.evaluate(()=>reportModel79('gl',true)[0].values.map(r=>r[1]));
  assert.equal(ordered.length,1200,'complete output for print/export');
  assert.equal(await last.locator('button[data-entry]').last().getAttribute('data-entry'),ordered.at(-1));
  await page.keyboard.press('Control+f');
  assert.deepEqual(await ledger.locator('button[data-entry]').evaluateAll(nodes=>nodes.map(b=>b.dataset.entry)),ordered,'browser Find sees every ordered row');
  await page.evaluate(()=>{switchTab('report-tb');switchTab('report-gl')});
  await filter.scrollIntoViewIfNeeded();
  const reads=fixture.fixture.journalReads.length;
  await page.evaluate(()=>{window.firstLedger=document.querySelector('#report-gl .r79-content');window.modelCalls=0;const original=reportModel79;reportModel79=function(...args){modelCalls++;return original.apply(this,args)}});
  const dialog=page.locator('dialog.report-dialog299[open]');
  await filter.click();
  await dialog.locator('[name=by]').selectOption('account');
  await dialog.locator('[name=basis]').selectOption('original');
  await dialog.locator('[data-period]').click();
  await dialog.locator('[data-all]').click();
  assert.equal(await page.evaluate(()=>Reports79.allMonths14331),false);
  assert.equal(await page.evaluate(()=>Reports79.basis),'LAK');
  assert.equal(await page.evaluate(()=>modelCalls),0);
  await dialog.getByRole('button',{name:'Cancel'}).click();
  await dialog.waitFor({state:'detached'});
  await filter.click();
  assert.equal(await dialog.locator('[name=by]').inputValue(),'date');
  await dialog.locator('[name=by]').selectOption('account');
  await dialog.locator('[name=direction]').selectOption('asc');
  await dialog.locator('[name=basis]').selectOption('original');
  await dialog.getByRole('button',{name:'OK',exact:true}).click();
  assert.equal(await page.evaluate(()=>Reports79.basis),'original');
  assert.equal(await page.evaluate(()=>firstLedger===document.querySelector('#report-gl .r79-content')),false);
  await page.evaluate(()=>{window.firstLedger=document.querySelector('#report-gl .r79-content');switchTab('report-tb')});
  await page.locator('#report-tb .r79-content').waitFor();
  const trial=page.locator('#report-tb .trial-columns143116').first();
  assert.deepEqual((await trial.locator('thead th').allTextContents()).map(h=>h.toLowerCase()),['account','classification','opening balance','period debit','period credit','closing balance']);
  assert.ok(await trial.locator('[data-trial-column143116="classification"] .balance-badge118').count());
  assert.ok(await trial.evaluate(t=>t.offsetWidth<=t.parentElement.clientWidth+1));
  for(const basis of ['original','LAK']){
   const report=await page.evaluate(basis=>{
    const previous=Reports79.basis;
    try{
     Reports79.basis=basis;
     const group=reportModel79('tb',true).find(g=>g.headers.includes('Classification')&&g.values.length);
     const print=document.createElement('template');print.innerHTML=reportFormats14282.financial('tb');
     return {headers:group.headers,row:group.values.find(row=>String(row[1]).startsWith('DR')),print:[...print.content.querySelectorAll('thead tr')].map(r=>[...r.cells].map(c=>c.textContent.trim().toLowerCase()))};
    }finally{Reports79.basis=previous}
   },basis);
   assert.equal(report.headers.length,6);
   assert.ok(report.row[1].startsWith('DR'));assert.equal(report.row[5],report.row[3]);
   assert.ok(report.print.some(h=>h.join('|')===report.headers.join('|').toLowerCase()),'six print columns in '+basis);
  }



  await page.evaluate(()=>{Reports79.notes.tb='Fixture note';modelCalls=0;for(let i=0;i<3;i++){switchTab('report-gl');switchTab('report-tb')}switchTab('report-gl')});
  assert.equal(await page.evaluate(()=>firstLedger===document.querySelector('#report-gl .r79-content')),true);
  assert.equal(await page.evaluate(()=>modelCalls),0,'revisits reuse the rendered ledger and trial balance');
  assert.equal(fixture.fixture.journalReads.length,reads,'no repeated journal downloads');
  for(const kind of ['pl','bs','cf','activity','expense','payroll']){
   await page.evaluate(k=>switchTab('report-'+k),kind);
   const panel=page.locator('#report-'+kind);
   await panel.getByRole('button',{name:'Filter',exact:true}).filter({visible:true}).first().click();
   await dialog.waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS 1,200-line full ledger, draft period/basis/sort, Cancel and OK, report dialogs, three round trips with zero model runs or journal reads.');
 }finally{await fixture.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
