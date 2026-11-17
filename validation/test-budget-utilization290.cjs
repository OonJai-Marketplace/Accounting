const assert=require('node:assert/strict');
const fixture=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await fixture();
 try{
  const {page,login}=await f.open(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/rest/v1/payroll_tax_settings*',async route=>route.fulfill({json:route.request().method()==='POST'?[route.request().postDataJSON()]:null}));
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.waitForLoadState('networkidle');
  const lines=[
   {key117:'a',category:'Operations',description:'Fuel',currency:'USD',amount:20},
   {key117:'b',category:'Supplies',description:'Paper',currency:'LAK',amount:25000},
   {key117:'c',category:'Operations',description:'Transport',currency:'USD',amount:15}
  ];
  await page.evaluate(()=>switchTab('transactions-budget14313'));
  const panel=page.locator('#transactions-budget14313'),request=page.locator('.budget-request327'),table=request.locator('.budget-items290');
  await panel.getByRole('button',{name:'New Report'}).click();
  await request.locator('[name=budgetMonth290]').fill('2026-10');
  assert.equal(await request.locator('[name=date]').count(),0);
  await request.locator('[name=recipient]').fill('Fixture');await request.locator('[name=purpose]').fill('Kitchen support');
  await request.getByRole('button',{name:'Budget items',exact:true}).click();
  await page.evaluate(lines=>{budgetWorkflow14316.requestData().lines=lines;budgetWorkflow14316.templateApplied()},lines);
  assert.deepEqual(await table.locator('[data-budget-key14316]').evaluateAll(rs=>rs.map(r=>r.dataset.budgetKey14316)),['a','c','b']);
  const item=table.locator('[data-budget-key14316="c"]');
  if(await item.locator('summary').count())await item.locator('summary').click();await item.getByText('Edit',{exact:true}).click();
  assert.equal(await request.locator('[data-item-form] [name=description]').inputValue(),'Transport');
  await request.locator('[data-item-form] [name=amount]').fill('25');
  await request.getByText('Update item',{exact:true}).click();
  assert.equal(await table.locator('[data-budget-key14316]').count(),3);assert.match(await table.innerText(),/USD 45/);
  const template={id:'00000000-0000-4000-a000-000000000290',version:1,data:{name:'Fixture',lines}};
  await page.route('**/rest/v1/budget_templates14313*',route=>route.fulfill({json:[template]}));
  await page.evaluate(id=>{void budget14313.edit(id)},template.id);
  const edit=page.locator('[data-template-edit14319]');await edit.waitFor();
  const second=edit.locator('tbody>tr').nth(1);
  await second.locator('select').selectOption('USD');assert.equal(await second.locator('.money-symbol14231').textContent(),'$');
  await second.locator('select').selectOption('LAK');assert.equal(await second.locator('.money-symbol14231').textContent(),'₭');
  assert.equal(await edit.locator('tbody>tr').first().locator('.money-symbol14231').textContent(),'$');
  await page.locator('.ui-overlay108').last().getByText('Save',{exact:true}).click();
  await edit.waitFor({state:'detached'});
  const db=new Map();
  await page.route('**/rest/v1/operational_reports*',async route=>{
   const req=route.request(),u=new URL(req.url()),id=u.searchParams.get('id')?.slice(3);
   if(req.method()==='POST'){const row=req.postDataJSON();db.set(row.id,row);return route.fulfill({json:[row]});}
   if(req.method()==='PATCH'){const row={...db.get(id),...req.postDataJSON()};db.set(id,row);return route.fulfill({json:[row]});}
   const ids=u.searchParams.get('id')||'',parent=u.searchParams.get('data->>requestId14316')?.slice(3),status=u.searchParams.get('data->>status')?.slice(3);
   if(ids.startsWith('eq.'))return route.fulfill({json:db.get(id)||null});
   return route.fulfill({json:[...db.values()].filter(r=>(!ids||ids.includes(r.id))&&(!parent||r.data.requestId14316===parent)&&(!status||r.data.status===status))});
  });
  const persisted=page.waitForResponse(r=>r.url().includes('/rest/v1/operational_reports')&&r.request().method()==='POST');
  await request.getByRole('button',{name:'Save request'}).click();
  await persisted;
  await page.waitForFunction(()=>Work82.reports.some(r=>r.data.purpose==='Kitchen support'));
  await request.waitFor({state:'detached'});
  const original=[...db.values()].find(r=>r.data.mode==='request');
  await page.evaluate(id=>{void budgetWorkflow14316.openRequest(id)},original.id);
  await page.getByRole('button',{name:'Add new tab',exact:true}).click();
  await page.waitForFunction(()=>documentWorkspace105.model?.budget14316);
  const sheet=page.frameLocator('#docFrame105');
  await sheet.locator('.page-content [data-report-signature-line275]').first().waitFor();
  const band=await sheet.locator('.page-content [data-budget-table14316] tfoot tr').first().evaluate(tr=>[...tr.cells].map(c=>getComputedStyle(c).backgroundColor));
  assert(band.length>=3&&band.every(v=>v===band[0]&&v!=='rgba(0, 0, 0, 0)'),'Full-width total band');
  assert((await sheet.locator('[data-report-signature-line275]').first().boundingBox()).width>40);
  const doc=await page.evaluate(()=>{
   const m=documentWorkspace105.model,parsed=budgetWorkflow14316.parseDocument(m);
   const node=document.createElement('div');node.innerHTML=parsed.html;
   return {data:parsed.data,sub:node.querySelectorAll('[data-budget-summary290]').length,sign:!!node.querySelector('[data-report-signature-line275]'),shaded:[...node.querySelectorAll('tfoot tr>*')].every(c=>!!c.style.backgroundColor)};
  });
  assert.equal(doc.sub,2);assert(doc.sign&&doc.shaded);assert.equal(doc.data.budgetMonth290,'2026-10');assert.equal(doc.data.lines.length,3);
  const legacyDate=await page.evaluate(()=>{
   const model=documentWorkspace105.model;
   const html='<p>Request date: <span data-budget-field14316="date">2026-11-01</span></p>'+model.html;
   return budgetWorkflow14316.parseDocument({...model,html}).data.date;
  });
  assert.equal(legacyDate,'2026-11-01');

  const saved=[...db.values()].find(r=>r.data.mode==='request');assert(saved);
  await page.exposeFunction('testStoreBudget',r=>{db.set(r.id,r);return r});
  await page.evaluate(()=>{
   const save=window.saveWork82;window.saveWork82=(kind,d,record)=>kind==='reports'?window.testStoreBudget({id:record?.id||'00000000-0000-4000-a000-000000000321',version:(record?.version||0)+1,data:d}):save(kind,d,record);
  });
  assert(await page.evaluate(()=>documentWorkspace105.save()),'Save the reviewed document from Editor');
  await page.waitForFunction(async()=>{const m=documentWorkspace105.model.budget14316;const r=await ojmDb.from('operational_reports').select('version').eq('id',m.id).single();return r.data?.version===m.version;});
  assert.equal((await page.evaluate(()=>budgetWorkflow14316.requireSaved())).id,saved.id);
  await page.route('**/rest/v1/rpc/budget_capabilities14316',r=>r.fulfill({json:{version:14316}}));
  await page.locator('#document-editor105').getByRole('button',{name:'Fund utilization',exact:true}).click();
  const popup=page.getByRole('dialog',{name:'Budget Request Utilization Report',exact:true});
  await popup.locator('[data-disbursements]').waitFor();
  async function movement(type,values){
   const group=['receipt','spend'].includes(type)?type:'other';
   await popup.locator('[data-activity="'+group+'"]').click();
   await page.locator('.fund-activity #financeMove82').evaluate((f,{type,values})=>{
    f.elements.type290.value=type;f.onchange();f.elements.date290.value='2026-11-05';
    for(const [k,v] of Object.entries(values))f.elements[k].value=v;
    f.onchange();f.requestSubmit();
   },{type,values});
  }
  await movement('receipt',{account:'Sponsor',destination290:'USD account',currency:'USD',amount:'100',reference:'R1'});
  await popup.getByRole('button',{name:'Exchange',exact:true}).click();
  const fx=page.locator('.fund-activity #financeFx117');
  await fx.evaluate(f=>{for(const [k,v] of Object.entries({date:'2026-11-05',source:'USD account',currency:'USD',amount:'40',target:'LAK',targetAmount290:'800000',destination290:'Cash box',evidence:'FX1'}))f.elements[k].value=v;f.requestSubmit()});
  await movement('spend',{account:'USD account',destination290:'Vendor',currency:'USD',amount:'10',budgetKey117:'a',reference:'S1',description290:'Fuel for delivery route'});
  await movement('coverage',{account:'Restaurant till',currency:'LAK',amount:'1000',reference:'Till receipt'});
  await movement('borrow',{account:'Company petty cash',destination290:'Cash box',currency:'LAK',amount:'100000',reference:'A1'});
  await movement('spend',{account:'Cash box',destination290:'Supplier',currency:'LAK',budgetKey117:'a',amount:'200000',equivalent:'10',reference:'S2'});
  await popup.locator('[data-activity=other]').click();
  const loan=await page.locator('.fund-activity [name=loanId290] option').last().getAttribute('value');
  await page.locator('.fund-activity [data-dismiss]').click();
  await movement('repay',{account:'Cash box',destination290:'Company petty cash',currency:'LAK',amount:'60000',loanId290:loan,reference:'P1'});
  await popup.getByText('Report details',{exact:true}).click();
  await popup.locator('#fundHeader290 [name=receiptReference290]').fill('TEST-RECEIPT');
  await popup.getByRole('button',{name:'Save',exact:true}).click();
  await page.waitForFunction(()=>Work82.reports.some(r=>r.data.mode==='utilization'));
  const report=[...db.values()].find(r=>r.data.mode==='utilization');
  assert.equal(report.data.movements.length,6);assert.equal(report.data.conversions.length,1);
  const result=await page.evaluate(d=>({totals:[...BudgetReport290.balances(d)],debt:BudgetReport290.outstanding(d,d.movements.find(m=>m.type290==='borrow')),html:BudgetReport290.report(d)}),report.data);
  const amounts=Object.fromEntries(result.totals);assert.equal(amounts.USD.remaining,50);assert.equal(amounts.LAK.remaining,641000);assert.equal(result.debt,40000);assert.match(result.html,/October 2026/);assert.match(result.html,/S2/);assert.match(result.html,/Disbursement breakdown/);assert.match(result.html,/TEST-RECEIPT/);assert.match(result.html,/Budget Request Utilization Report/);assert.equal(report.data.movements[0].date290,'2026-11-05');
  await popup.getByRole('button',{name:'Close',exact:true}).click();
  await page.evaluate(()=>switchTab('transactions-budget14313'));
  assert(await panel.getByRole('button',{name:'Open'}).isVisible());
  const count=db.size;
  await panel.locator('header').getByRole('button',{name:'Fund utilization',exact:true}).click();
  await popup.getByRole('button',{name:'Reports'}).click();
  await page.evaluate(()=>{ui117.confirm=async()=>true});
  await page.getByRole('dialog',{name:'Requests and saved reports'}).getByRole('button',{name:'Edit',exact:true}).click();
  await popup.locator('[data-disbursements]').waitFor();
  assert.equal(await popup.locator('#fundHeader290 [name=receiptReference290]').inputValue(),'TEST-RECEIPT');
  assert.equal(await popup.locator('#fundHeader290 [name=date]').inputValue(),report.data.date);
  assert.equal(db.size,count);
  const draftWidth=(await popup.boundingBox()).width;
  await popup.getByRole('button',{name:'Finalize',exact:true}).click();
  await popup.waitFor({state:'detached'});
  assert.equal(db.get(report.id).data.status,'finalized');
  // Another browser can still have the earlier draft when the server has finalized it.
  await page.evaluate(id=>{
   const index=Work82.reports.findIndex(r=>r.id===id),row=Work82.reports[index];
   Work82.reports[index]={...row,version:row.version-1,data:{...row.data,status:'draft'}};
   switchTab('journal');switchTab('transactions-budget14313');
  },report.id);
  await panel.getByRole('button',{name:'View',exact:true}).waitFor();
  await panel.getByRole('button',{name:'View',exact:true}).click();
  await page.route('**/rest/v1/rpc/save_budget_report_wording',route=>{
   const a=route.request().postDataJSON(),r=db.get(a.p_report);
   assert.equal(a.p_version,r.version);assert.equal(a.p_revision,0);
   r.budget_report_wording={revision:1,report_version:r.version,notes:a.p_notes,descriptions:a.p_descriptions};
   return route.fulfill({json:1});
  });
  await popup.getByRole('button',{name:'Wording'}).click();
  const wording=page.getByRole('dialog',{name:'Edit report wording'});
  await wording.getByLabel('Report notes').fill('Amounts verified.');
  await wording.getByText('Movement descriptions',{exact:true}).click();
  await wording.locator('[data-description="0"]').fill('Owner transfer.');
  await wording.getByRole('button',{name:'Save wording'}).click();
  await popup.getByText('Report notes',{exact:true}).click();
  await popup.getByText('Amounts verified.',{exact:true}).waitFor();
  assert.equal(db.get(report.id).budget_report_wording.descriptions['0'],'Owner transfer.');
  assert.equal(db.get(report.id).data.status,'finalized');
  const print=popup.locator('header').getByRole('button',{name:'Print',exact:true});
  await print.waitFor();
  assert.equal((await popup.boundingBox()).width,draftWidth);
  for(const width of [1440,1280,1024,768,390]){
   await page.setViewportSize({width,height:730});
   const dialog=await popup.boundingBox();
   assert(Math.abs(dialog.width-Math.min(1050,width-36))<2,JSON.stringify({width,dialog}));
   const fits=await popup.locator('.ui-body108').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
   assert(fits,'Report body must fit at '+width+'px');
  }
  await page.setViewportSize({width:1280,height:730});
  const y=(await print.boundingBox()).y;
  assert(await popup.locator('.ui-body108').evaluate(el=>{el.scrollTop=el.scrollHeight;return el.scrollTop>0;}));
  assert.equal((await print.boundingBox()).y,y);
  assert.equal(await popup.getByRole('button',{name:'Save'}).count(),0);
  assert.equal(await popup.locator('header [data-final-status]').count(),0);
  await popup.getByRole('button',{name:'Close',exact:true}).last().click();
  await panel.getByRole('row').filter({has:page.getByRole('button',{name:'Open',exact:true})})
   .getByRole('button',{name:'Utilization',exact:true}).click();
  await popup.getByRole('button',{name:'Wording'}).waitFor();
  assert.equal(await popup.getByRole('button',{name:'Save'}).count(),0);
  assert.equal([...db.values()].filter(r=>r.data.mode==='utilization').length,1);
  assert(!f.requests.some(r=>/POST .*post_payroll|POST .*post_journal/.test(r)),'Budget actions must stay inside the budget');
  assert.deepEqual(errors,[]);console.log('PASS category editing and grouped document, full-row totals, signature, independent template currencies, October request with November activities, source/destination, conversion, spending and partial advance repayment. Synthetic storage only.');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
