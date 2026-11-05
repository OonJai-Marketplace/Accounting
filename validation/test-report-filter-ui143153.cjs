const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  fixture.fixture.journalReads=[];
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const month='2026-10';
  fixture.fixture.journal=Array.from({length:1200},(_,i)=>({
   id:'GL-TEST-'+i,dbEntryId:'fixture-'+i,date:month+'-05',accountId:'cash',account:'Cash',
   accountCode:'100',currency:'LAK',debit:1,credit:0,base_debit:1,base_credit:0,status:'posted'
  }));
  fixture.fixture.journalRevision='report-fixture-299';
  await page.evaluate(()=>reportWindow143195.preload(true));
  await page.evaluate(()=>{Object.assign(Reports79,{kind:'gl',allMonths14331:true,selectedMonths14331:null});switchTab('report-gl')});
  const content=page.locator('#report-gl .r79-content'),filter=page.locator('#report-gl').getByRole('button',{name:'Filter',exact:true});
  await content.waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('#report-gl .r79-link[data-entry]').length>=1200);
  const reads=fixture.fixture.journalReads.length;
  await page.evaluate(()=>{window.firstLedger=document.querySelector('#report-gl .r79-content');window.modelCalls=0;const original=reportModel79;reportModel79=function(...args){modelCalls++;return original.apply(this,args)}});
  const dialog=page.locator('dialog.report-dialog299[open]');
  await filter.click();
  await dialog.locator('[name=by]').selectOption('account');
  await dialog.locator('[name=basis]').selectOption('original');
  await dialog.locator('[data-period]').click();
  await dialog.locator('[data-now]').click();
  assert.equal(await page.evaluate(()=>Reports79.allMonths14331),true);
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
