const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fs=require('node:fs');
 assert(!fs.existsSync('scripts/budget-gmail14314.js'));
 assert(!fs.readFileSync('scripts/reports-v117.js','utf8').includes('wa.me/'));
 assert(!fs.readFileSync('desktop.html','utf8').includes('scripts/budget-gmail14314.js'));
 const f=await create();
 try{
  const {page,context,login}=await f.open();
  const errors=[],outbound=[],records=new Map(),templates=[];let settings=null;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/gmail\.googleapis|wa\.me|api\.whatsapp/.test(r.url()))outbound.push(r.url())});
  await page.route('**/rest/v1/budget_settings14313*',async route=>{
   const req=route.request();if(['POST','PATCH'].includes(req.method())){settings=req.postDataJSON();return route.fulfill({json:[settings]})}
   return route.fulfill({json:settings});
  });
  await page.route('**/rest/v1/budget_templates14313*',async route=>{
   if(route.request().method()==='POST'){const row={...route.request().postDataJSON(),id:'00000000-0000-4000-8000-000000000327'};templates.push(row);return route.fulfill({json:[row]})}
   return route.fulfill({json:templates});
  });
  await page.route('**/rest/v1/operational_reports*',async route=>{
   const req=route.request(),u=new URL(req.url()),id=u.searchParams.get('id')?.slice(3);
   if(req.method()==='POST'){const row=req.postDataJSON();records.set(row.id,row);return route.fulfill({json:[row]})}
   return route.fulfill({json:id?records.get(id)||null:[]});
  });
  await page.route('**/rest/v1/payroll_tax_settings*',r=>r.fulfill({json:r.request().method()==='POST'?[r.request().postDataJSON()]:null}));
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>switchTab('transactions-budget14313'));
  const main=page.locator('#transactions-budget14313'),actions=main.locator('.work82>header .actions82 button');
  assert.deepEqual((await actions.allTextContents()).map(t=>t.trim()),['Fund utilization','New Report','Print / PDF']);
  assert.equal(await main.locator('form').count(),0);
  await main.getByRole('button',{name:'New Report',exact:true}).click();
  const editor=page.locator('.budget-request327'),details=editor.locator('[data-pane=details]'),form=editor.locator('[data-item-form]');
  assert.equal(await details.locator('[name=date]').count(),0);
  const [monthBox,recipientBox,purposeBox,notesBox]=await Promise.all(['budgetMonth290','recipient','purpose','notes'].map(name=>details.locator('label').filter({has:page.locator('[name='+name+']')}).boundingBox()));
  assert(monthBox.y===recipientBox.y&&monthBox.y===purposeBox.y&&monthBox.x<recipientBox.x&&recipientBox.x<purposeBox.x);
  assert(notesBox.y>monthBox.y&&notesBox.width>purposeBox.width);
  await details.locator('[name=budgetMonth290]').fill('2026-11');
  await details.locator('[name=recipient]').fill('Jonathan');
  await details.locator('[name=purpose]').fill('Budget Request for November 2026');
  const notes='For the first delivery.\nPlease confirm the remaining balance.';
  await details.locator('[name=notes]').fill(notes);
  await editor.getByRole('button',{name:'Budget items',exact:true}).click();
  assert.equal(await details.isVisible(),false);
  await editor.getByRole('button',{name:'Categories',exact:true}).click();
  await editor.locator('[name=newCategory]').fill('Supplies');
  await editor.getByRole('button',{name:'Save category'}).click();
  await page.waitForFunction(()=>budget14313.config().categories.includes('Supplies'));
  async function add(description,amount,currency,category='Supplies'){
   await form.locator('[name=category]').fill(category);await form.locator('[name=description]').fill(description);
   await form.locator('[name=currency]').selectOption(currency);await form.locator('[name=amount]').fill(amount);
   await form.getByRole('button',{name:'Add item',exact:true}).click();
  }
  await add('Rice','120000','LAK');await add('Vegetables','50000','LAK');await add('Delivery','25','USD','Transport');
  await add('Freight','2.75','USD');await add('Parking','10000','LAK','Transport');
  await editor.getByRole('button',{name:'Add Template',exact:true}).click();
  const naming=page.getByRole('dialog',{name:'Add budget template',exact:true});
  await naming.locator('input').fill('Recurring kitchen items');await naming.getByRole('button',{name:'Save',exact:true}).click();
  await editor.getByRole('button',{name:'Messages',exact:true}).click();
  const body=await editor.getByLabel('Email message',{exact:true}).inputValue(),short=await editor.getByLabel('WhatsApp message',{exact:true}).inputValue();
  assert.equal(await editor.getByLabel('Email subject',{exact:true}).inputValue(),'Budget Request for November 2026');
  assert(body.includes('Rice')&&body.includes('LAK 170,000')&&body.includes(notes)&&!body.includes('Request date'));
  assert(short.includes('• Supplies — LAK 170,000.00 + USD 2.75'));
  assert(short.includes('• Transport — USD 25.00 + LAK 10,000.00'));
  assert(short.includes('Total requested: LAK 180,000.00 + USD 27.75'));
  assert(short.includes('Note:\n'+notes)&&!short.includes('Rice')&&short.length<body.length);
  for(const message of [body,short])assert.equal(message.match(/budget request/gi).length,1);
  const specific=await page.evaluate(()=>budgetMessages14314.texts({...budgetWorkflow14316.requestData(),purpose:'Restaurant operating expenses',notes:'  '}));
  assert.equal(specific.subject,'Budget Request for November 2026');
  for(const message of [specific.detail,specific.summary])assert(message.includes('Restaurant operating expenses')&&!message.includes('Note:'));
  await context.grantPermissions(['clipboard-read','clipboard-write']);
  await editor.getByRole('button',{name:'Copy WhatsApp message'}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),short);
  await editor.getByRole('button',{name:'Save request',exact:true}).click();
  await page.waitForFunction(()=>Work82.reports.some(r=>r.data?.purpose==='Budget Request for November 2026'));
  assert.equal(records.size,1);assert.deepEqual(settings.data.categories,['Supplies']);assert.equal(templates.length,1);
  await editor.getByRole('button',{name:'Close',exact:true}).click();
  await main.getByRole('button',{name:'Print / PDF',exact:true}).click();
  const picker=page.getByRole('dialog',{name:'Print / PDF',exact:true});
  await page.evaluate(()=>{window.print82=(title,html)=>{window.printedRequest327={title,html}}});
  await picker.getByRole('button',{name:'Print / PDF',exact:true}).click();
  await page.waitForFunction(()=>window.printedRequest327?.html.includes('Vegetables'));
  assert(!(await page.evaluate(()=>window.printedRequest327.html)).includes('Request date'));
  await main.getByRole('button',{name:'Open request'}).click();
  await editor.getByRole('button',{name:'Messages',exact:true}).click();
  assert.equal(await editor.getByLabel('WhatsApp message',{exact:true}).inputValue(),short);
  await editor.getByRole('button',{name:'Budget items',exact:true}).click();
  assert.equal(await editor.locator('[data-budget-key14316]').count(),5);
  await editor.getByRole('button',{name:'Close',exact:true}).click();
  await main.getByRole('button',{name:'New Report'}).click();await editor.getByRole('button',{name:'Budget items',exact:true}).click();
  await editor.getByRole('button',{name:'Templates',exact:true}).click();
  await page.getByRole('button',{name:'Use template',exact:true}).click();
  assert.equal(await editor.locator('[data-budget-key14316]').count(),5);
  assert.equal(records.size,1);assert.deepEqual(outbound,[]);assert.deepEqual(errors,[]);
  console.log('PASS three main actions, separate request sections, category and template persistence, mixed-currency totals, manual copying, save and reopen');
 }finally{await f.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
