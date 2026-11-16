const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const request={id:'00000000-0000-4000-a000-000000000404',version:1,data:{kind:'finance',mode:'request',date:'2026-09-22',budgetMonth290:'2026-10',recipient:'Office',purpose:'Supplies',notes:'',lines:[
   {key117:'rice',category:'Kitchen',description:'Rice',currency:'LAK',amount:500000},
   {key117:'rent',category:'Rent',description:'House rent',currency:'USD',amount:200}
  ]}};
  const records=new Map([[request.id,request]]);
  await page.route('**/rest/v1/operational_reports*',r=>{
   const q=new URL(r.request().url()).searchParams,id=q.get('id')?.slice(3),parent=q.get('data->>requestId14316')?.slice(3);
   return r.fulfill({json:id?records.get(id):[...records.values()].filter(row=>!parent||row.data.requestId14316===parent)});
  });
  await page.route('**/rest/v1/rpc/budget_capabilities14316',r=>r.fulfill({json:{version:14316}}));
  await page.exposeFunction('saveWorksheetFixture',(data,record)=>{
   const row={id:record?.id||'00000000-0000-4000-a000-000000000405',version:(record?.version||0)+1,data};records.set(row.id,row);return row;
  });
  await login();
  await page.evaluate(()=>{window.saveWork82=(kind,data,record)=>window.saveWorksheetFixture(data,record);});
  for(const [key,panel,name] of [['journal','journal','Journal'],['submitted','user-entry-review','Submitted Entries'],['budget','transactions-budget14313','Budget']]){
   await page.evaluate(panel=>window.switchTab(panel),panel);
   await page.locator('#'+panel+' [data-book-history="'+key+'"]').first().click();
   await page.getByRole('button',{name:'Back to '+name,exact:true}).click();
   assert.equal(await page.locator('.tab-content.active').getAttribute('id'),panel);
  }
  const budget=page.locator('#transactions-budget14313');
  await budget.getByRole('button',{name:'New Report',exact:true}).click();
  const requestDialog=page.getByRole('dialog',{name:'New Report',exact:true});
  const box1=await requestDialog.boundingBox();
  for(const name of ['Budget items','Messages','Request details']){
   await requestDialog.getByRole('button',{name,exact:true}).click();
   const box=await requestDialog.boundingBox();assert.equal(box.width,box1.width);assert.equal(box.height,box1.height);
  }
  await requestDialog.getByRole('button',{name:'Close',exact:true}).click();
  await budget.getByRole('row').filter({hasText:'Supplies'}).getByRole('button',{name:'Fund utilization',exact:true}).click();
  const fund=page.getByRole('dialog',{name:'Fund utilization',exact:true}), grid=fund.locator('[data-spending-rows]');
  await grid.waitFor();assert.equal(await grid.locator('tr').count(),2);
  assert.equal(await fund.getByRole('button',{name:/template/i}).count(),0);
  const rice=grid.getByRole('textbox',{name:'Actual spending for Rice'});await rice.fill('325000');
  await fund.getByRole('button',{name:'Add row'}).click();
  const extra=grid.locator('tr').last();await extra.locator('[name=description]').fill('Delivery');
  await extra.locator('select').selectOption('USD');await extra.locator('[name=actualAmount]').fill('10.25');
  await fund.getByRole('button',{name:'Amount received',exact:true}).click();
  let dialog=page.getByRole('dialog',{name:'Amount received',exact:true});
  await dialog.locator('[name=account]').fill('Owner');await dialog.locator('[name=currency]').selectOption('USD');
  await dialog.locator('[name=amount]').fill('100');await dialog.locator('[name=reference]').fill('R1');
  await dialog.getByRole('button',{name:'Add receipt'}).click();
  await fund.getByRole('button',{name:'Currency conversion',exact:true}).click();
  dialog=page.getByRole('dialog',{name:'Currency conversion',exact:true});
  for(const [k,v] of Object.entries({source:'Bank',destination290:'Cash box',amount:'20',targetAmount290:'420000',evidence:'FX1'}))await dialog.locator('[name='+k+']').fill(v);
  await dialog.getByRole('button',{name:'Add conversion'}).click();
  await fund.getByRole('button',{name:'Save report'}).click();await page.waitForFunction(()=>Work82.reports.some(r=>r.data.mode==='utilization'));
  const saved=[...records.values()].find(r=>r.data.mode==='utilization');
  assert.deepEqual(saved.data.lines,request.data.lines);assert.equal(saved.data.movements.length,3);
  assert.equal(saved.data.conversions.length,1);assert.equal(saved.data.movements[0].outflow,325000);
  assert.equal(saved.data.movements[1].description290,'Delivery');assert.equal(saved.data.movements[1].outflow,10.25);
  assert.deepEqual(await page.evaluate(d=>[...BudgetReport290.balances(d)].map(([c,v])=>[c,v.remaining]),saved.data),[['LAK',95000],['USD',69.75]]);
  await rice.fill('350000');await fund.getByRole('button',{name:'Save report'}).click();
  await page.waitForFunction(()=>Work82.reports.some(r=>r.data.mode==='utilization'&&r.version===2));
  const updated=records.get(saved.id);assert.equal(updated.data.movements.length,3);assert.equal(saved.data.movements[0].id290,updated.data.movements[0].id290);
  await fund.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>ui117.confirm=async()=>true);
  await budget.getByRole('button',{name:'Continue',exact:true}).click();await rice.waitFor();assert.equal(Number(await rice.evaluate(e=>e.value)),350000);
  assert.deepEqual(errors,[]);
  console.log('PASS History returns, stable request window, linked worksheet, extra spending, receipts, conversions and save/reopen.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
