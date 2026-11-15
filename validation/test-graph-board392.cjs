const assert = require('node:assert/strict');
const create = require('./phase0-browser-fixture.cjs');

(async () => {
 const fixture = await create();
 try {
  const {page,login} = await fixture.open();
  const errors = [];page.on('pageerror',e=>errors.push(e.message));
  const sample = (code,name,type,currency='LAK') => ({id:'00000009-0000-4000-8000-'+code.padStart(12,'0'),code,name,account_type:type,currency_code:currency,is_posting:true,is_active:true});
  const chart = [sample('4000','Restaurant Sales','REVENUE'),sample('4110','Other income','REVENUE'),sample('5111','Supplies','EXPENSE'),sample('2010','Suppliers','LIABILITY'),sample('1040','BCEL bank','ASSET'),sample('4020','Restaurant Sales USD','REVENUE','USD'),{...sample('9290','Mapping','EXPENSE'),is_technical:true}];
  fixture.fixture.tables.accounts = chart;
  const postings=[
   ['4000','09',0,150],['4000','10',0,200],['4000','11',0,110],
   ['4110','10',0,20],['5111','10',85,0],['5111','11',125,0],
   ['2010','09',0,1000],['2010','10',0,75],['2010','11',200,0],
   ['1040','10',350,0],['4020','10',0,2],['9290','10',900,0]
  ];
  fixture.fixture.journal = postings.map(([code,month,debit,credit],i)=>{
   const a=chart.find(a=>a.code===code);
   return {accountId:a.id,account:a.name,currency:a.currency_code,debit,credit,date:'2026-'+month+'-01',id:'T'+i,dbEntryId:'T'+i,source:'fixture',status:'posted',annualOpening:code==='2010'&&month==='09'};
  });
  const earlier=fixture.fixture.journal[0];
  fixture.fixture.journal.push({...earlier,date:'2025-12-16',credit:345,id:'prior-year',dbEntryId:'prior-year'});
  fixture.fixture.journalReads=[];
  fixture.fixture.tables.payroll_tax_settings=[{id:true,version:1,data:await page.evaluate(()=>({payroll:ApplicationSettings.payroll,tax:ApplicationSettings.tax}))}];
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const dash=page.locator('#dashboard'),tab=t=>dash.locator('[data-tab112="'+t+'"]');
  const dialog=page.locator('dialog.graph-dialog[open]'),main=dash.locator('.graph-main');
  await page.locator('#nav-module-dashboard .nav-header').click();
  assert.equal(await dash.locator('.welcome-glance dt').allTextContents().then(x=>x.join('/')),'Income/Expenses');
  assert.equal(await dash.locator('.overview-summary').count(),0);
  await tab('Overview').click();await dash.locator('.overview-summary').waitFor();
  await tab('Graphs').click();
  if(await dash.locator('[data-month112]').inputValue()!=='2026-11'){
   await dash.locator('[data-month112]').fill('2026-11');await dash.locator('[data-month112]').dispatchEvent('change');
  }
  await dash.locator('[data-graph-period]').selectOption('3');
  assert.equal(await dash.locator('.ledger-graph').count(),3);
  const firstSmall=dash.locator('.graph-small').first();
  if(!process.env.PHASE0_DEVICE||process.env.PHASE0_DEVICE==='tablet')assert((await main.boundingBox()).x>(await firstSmall.boundingBox()).x);
  const checkValues=async(name,index,amounts)=>{
   const card=dash.locator('.ledger-graph').filter({has:page.getByRole('heading',{name:new RegExp('^'+name+'$','i')})});
   const plot=card.locator('[data-graph-plot]');await plot.locator('svg').waitFor();await plot.focus();await plot.press('Home');
   for(let i=0;i<index;i++)await plot.press('ArrowRight');
   assert.deepEqual(await card.locator('li strong').allTextContents(),amounts);
  };
  const month=dash.locator('[data-month112]');
  await month.fill('2026-01');await month.dispatchEvent('change');
  await page.waitForFunction(()=>!yearWindow14333.loading&&yearWindow14333.state().from==='2025-01-01');
  assert(fixture.fixture.journalReads.some(r=>r.p_from==='2025-01-01'&&r.p_to==='2026-12-31'));
  await checkValues('Income & expenses',1,['₭345.00','₭0.00']);
  await month.fill('2026-11');await month.dispatchEvent('change');
  await checkValues('Income & expenses',1,['₭220.00','₭85.00']);
  await checkValues('Financial position',1,['₭350.00','₭1,075.00','—']);
  await checkValues('Financial position',2,['₭350.00','₭875.00','—']);
  await dash.getByRole('button',{name:'Add graph',exact:true}).click();
  await dialog.locator('[name=preset]').selectOption('result');
  await dialog.locator('[name=title]').fill('Monthly comparison');
  await dialog.locator('[data-graph-search]').click();await dialog.locator('[data-graph-search]').fill('2010');
  await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Add graph',exact:true}).click();
  await checkValues('Monthly comparison',1,['₭135.00','₭1,075.00']);
  await checkValues('Monthly comparison',2,['(₭15.00)','₭875.00']);
  await dash.getByRole('button',{name:'Move Monthly comparison'}).click();
  await dialog.locator('[name=position]').selectOption('0');await dialog.getByRole('button',{name:'Apply',exact:true}).click();
  assert.match(await main.locator('h3').innerText(),/Monthly comparison/i);
  await dash.getByRole('button',{name:'Layout',exact:true}).click();await dialog.locator('[name=side]').selectOption('left');
  await dialog.locator('[name=width]').fill('55');
  await dialog.getByRole('button',{name:'Save',exact:true}).click();
  assert((await main.boundingBox()).x<(await firstSmall.boundingBox()).x);
  await dash.locator('[data-currency112]').selectOption('USD');await checkValues('Monthly comparison',1,['$2.00','—']);
  await dash.locator('[data-currency112]').selectOption('LAK');
  const grip=main.locator('.graph-grip'),g=await grip.boundingBox(),drop=await firstSmall.boundingBox();
  await page.mouse.move(g.x+g.width/2,g.y+g.height/2);await page.mouse.down();await page.mouse.move(drop.x+drop.width/2,drop.y+35,{steps:10});await page.mouse.up();
  assert.match(await main.locator('h3').innerText(),/income & expenses/i);
  await dash.getByRole('button',{name:'Edit Income & expenses'}).click();
  await dialog.locator('[data-graph-search]').click();await dialog.locator('[data-graph-search]').fill('5111');await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Save graph'}).click();await checkValues('Income & expenses',1,['₭220.00','₭85.00','₭85.00']);
  if(process.env.GRAPH_SCREENSHOT)await page.screenshot({path:process.env.GRAPH_SCREENSHOT});
  await page.reload();await page.waitForFunction(()=>startup14257.interactive);
  await page.locator('#nav-module-dashboard .nav-header').click();await tab('Graphs').click();
  assert.equal(await dash.locator('.ledger-graph').count(),4);assert.equal(await dash.locator('.graph-board.main-left').count(),1);assert.equal(await dash.locator('[data-graph-period]').inputValue(),'3');
  assert.equal(await dash.locator('.graph-main li').count(),3);
  await dash.getByRole('button',{name:'Move Monthly comparison'}).click();await dialog.getByRole('button',{name:'Remove graph'}).click();
  assert.equal(await dash.locator('.ledger-graph').count(),3);assert.deepEqual(errors,[]);
  console.log('PASS welcome, retained overview, monthly ledger series, negative values, multiple currencies, saved graphs, layout width and position, drag, touch controls and reload');
 } finally {await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
