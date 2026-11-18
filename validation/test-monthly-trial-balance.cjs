const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');

(async()=>{
 const app=await fixture();
 try{
  const {page,login}=await app.open(),account=app.fixture.tables.accounts[0];
  const chart=app.fixture.tables.accounts;
  for(const [code,name,accountType,currency,posting] of [
   ['2000','Supplier Payables','LIABILITY','LAK',true],['3000','Owner Capital','EQUITY','USD',true],
   ['4000','Sales Group','INCOME','NA',false],['4100','Food Sales','INCOME','LAK',true],
   ['9000','FX Bridge','SYSTEM','USD',true]
  ]){
   chart.push({...account,id:'00000000-0000-4000-8000-00000000'+code,code,name,type:accountType,account_type:accountType,
    currency,currency_code:currency,isPosting:posting,is_posting:posting,is_technical:accountType==='SYSTEM'});
  }
  const postings=[
   ['2025-12-31',300,0,false],['2026-01-01',40,0,true],['2026-01-02',50.25,0,false],
   ['2026-03-02',0,130,false],['2026-10-01',4.5,0,false]
  ];
  app.fixture.journal=postings.map(([date,debit,credit,annualOpening],i)=>({
   id:'TEST-'+i,date,accountId:account.id,account:account.name,accountCode:account.code,currency:'LAK',debit,credit,annualOpening,status:'posted'
  }));
  const usd=app.fixture.tables.accounts[1];
  app.fixture.journal.push({id:'TEST-USD',date:'2026-01-10',accountId:usd.id,account:usd.name,
   accountCode:usd.code,currency:'USD',debit:7.25,credit:0,status:'posted'});
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const rail=page.locator('#desktopStatusDock'),button=rail.getByRole('button',{name:'Account balances'}),dialog=page.locator('dialog.monthly-trial-dialog');
  await button.click();
  const table=dialog.getByRole('table'),period=dialog.getByRole('button',{name:/^Period/});
  await table.waitFor();
  assert.equal(await table.locator('tbody tr:has(th[scope=row])').count(),chart.length,'The whole chart is available in one scrollable table');
  const rowNamed=name=>table.locator('tbody tr').filter({hasText:name});
  assert.ok((await rowNamed('Sales Group').locator('td').allTextContents()).every(cell=>cell===''));
  assert.equal(await table.locator('tfoot tr').filter({hasText:'Total · NA'}).count(),0);
  await dialog.getByText('Edit accounts',{exact:true}).click();
  const search=dialog.getByRole('searchbox'),allAccounts=dialog.getByLabel('All accounts',{exact:true});
  const matches=dialog.locator('.trial-account-list label:visible');
  await search.click();
  for(const [term,names] of [['income',['Sales Group','Food Sales']],['expense',['Supplies']],['2000',['Supplier Payables']],
   ['equity USD',['Owner Capital']],['SYSTEM',['FX Bridge']],['Parent account',['Sales Group']]]){
   await search.fill(term);
   assert.equal(await matches.count(),names.length);
   for(const name of names)assert.equal(await matches.filter({hasText:name}).count(),1);
  }
  await allAccounts.uncheck();await matches.getByRole('checkbox').check();
  assert.equal(await table.locator('tbody tr:has(th[scope=row])').count(),1);assert.equal(await rowNamed('Sales Group').count(),1);
  assert.equal(await table.locator('tfoot tr').count(),0);
  await allAccounts.check();await search.click();await search.fill('');await dialog.getByText('Edit accounts',{exact:true}).click();
  assert.equal(await table.locator('tbody tr:has(th[scope=row])').count(),chart.length);
  async function range(first,last){
   await period.click();
   if(!await dialog.locator('[data-month="'+first+'"]').count())await dialog.locator('[data-step="1"]').click();
   await dialog.locator('[data-month="'+first+'"]').click();
   if(last)await dialog.locator('[data-month="'+last+'"]').click();
   await dialog.locator('[data-apply]').click();
  }
  const cash=table.locator('tbody tr').filter({has:page.getByRole('rowheader',{name:new RegExp('^'+account.code+' .*LAK$')})});
  await range('2026-01','2026-10');
  assert.equal(await table.locator('th[scope=colgroup]').count(),10);
  assert.equal(await cash.count(),1);
  const read=()=>cash.locator('td').evaluateAll(nodes=>nodes.map(n=>parseReportAmount69(n.textContent)));
  const usdRow=table.locator('tbody tr').filter({hasText:new RegExp('^'+usd.code+' .*USD')});
  assert.equal(await usdRow.locator('td').first().evaluate(cell=>parseReportAmount69(cell.textContent)),7.25);
  const lakTotal=table.locator('tfoot tr').filter({hasText:'Total · LAK'});
  assert.equal(await lakTotal.locator('td').first().evaluate(cell=>parseReportAmount69(cell.textContent)),50.25);
  const amounts=await read();
  assert.deepEqual(amounts.slice(0,9),[50.25,0,90.25,0,0,90.25,0,130,-39.75]);
  assert.deepEqual(amounts.slice(-3),[4.5,0,-35.25]);
  assert.match(await cash.locator('td').last().textContent(),/^\(.*\)$/);
  await page.setViewportSize({width:900,height:730});
  const sizes=await cash.evaluate(row=>[row,...[...row.cells].slice(0,3)].map(n=>{const s=getComputedStyle(n);return [n.tagName,n.getBoundingClientRect().height,s.height,s.minHeight,s.padding,s.lineHeight,s.whiteSpace,s.fontSize,n.innerHTML.slice(0,70)]}));
  assert.ok(sizes[0][1]<24,JSON.stringify(sizes));
  const geometry=await dialog.evaluate(box=>{
   const panel=box.querySelector('.monthly-trial-scroll'),cell=panel.querySelector('tbody th');
   const before=cell.getBoundingClientRect().left;
   panel.scrollLeft=panel.scrollWidth;
   return {scrolled:panel.scrollLeft,delta:Math.abs(cell.getBoundingClientRect().left-before)};
  });
  assert(geometry.scrolled>0&&geometry.delta<2,'Account stays visible while scrolling across months');
  await range('2026-03');
  assert.deepEqual(await read(),[0,130,-39.75]);
  await period.click();await dialog.locator('[data-all]').click();
  assert.equal(await table.locator('th[scope=colgroup]').first().textContent(),'Dec 2025');
  assert.deepEqual((await read()).slice(0,6),[300,0,300,50.25,0,90.25]);
  await dialog.locator('[name=trialColumns]').selectOption('balance');
  assert.equal(await cash.locator('td').count(),11);
  await dialog.getByText('Edit accounts',{exact:true}).click();
  await dialog.getByLabel('All accounts',{exact:true}).uncheck();
  await dialog.locator('.trial-account-list label').filter({hasText:account.code+' ·'}).locator('input').check();
  assert.equal(await table.locator('tbody tr:has(th[scope=row])').count(),1);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();await dialog.waitFor({state:'detached'});
  await page.evaluate(()=>{PeriodReview.periods={'2026-01':{status:'closed'},'2026-10':{status:'open'}};switchTab('report-tb')});
  const report=page.locator('#report-tb'),filter=page.locator('dialog.report-dialog299[open]');
  await report.getByRole('button',{name:'Filter',exact:true}).click();
  await filter.locator('[name=trialView]').selectOption('comparative');
  await filter.getByText('Edit accounts',{exact:true}).click();
  const reportSearch=filter.getByRole('searchbox',{name:'Find accounts'});
  await reportSearch.click();await reportSearch.fill('parent account');
  assert.match(await filter.locator('.trial-account-list label:visible').textContent(),/4000 · Sales Group · Parent account$/);
  await filter.getByText('Edit accounts',{exact:true}).click();
  await filter.locator('[name=basis]').selectOption('original');
  await filter.locator('[data-period]').click();
  await filter.locator('[data-month="2026-01"]').click();await filter.locator('[data-month="2026-10"]').click();
  await filter.locator('[data-apply]').click();await filter.getByRole('button',{name:'OK',exact:true}).click();
  const grid=report.locator('.monthly-trial-table');
  await grid.waitFor();assert.equal(await grid.locator('tbody tr').count(),1);
  assert.equal(await grid.locator('tbody td').count(),10);
  assert.equal(await grid.locator('tbody td').last().textContent(),'(35.25)');
  const print=await page.evaluate(()=>{const t=document.createElement('template');t.innerHTML=reportFormats14282.financial('tb');return t.content.textContent});
  assert.ok(print.includes('Oct 2026')&&print.includes('(35.25)'));
  const csv=await page.evaluate(async()=>{let csv;const old=exportCenter14337.fromLink;try{exportCenter14337.fromLink=async a=>{csv=await (await fetch(a.href)).text()};await exportReport79('tb');return csv}finally{exportCenter14337.fromLink=old}});
  assert.ok(csv.includes('Oct 2026 Balance')&&csv.includes('(35.25)'));
  await report.getByRole('button',{name:'Filter',exact:true}).click();
  await filter.locator('[name=trialView]').selectOption('standard');
  await filter.getByRole('button',{name:'OK',exact:true}).click();
  await report.locator('table.trial-columns143116').first().waitFor();
  assert.equal(await grid.count(),0);
  console.log('PASS monthly TB rail, continuous range, annual openings, monthly turnover, idle months, mid-year starting balance, original credit sign, sticky accounts and one-month view');
 }finally{await app.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
