const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login}=await f.open();
  const id='20000000-0000-4000-8000-000000000001',child='20000000-0000-4000-8000-000000000002';
  const data={kind:'finance',mode:'request',budgetMonth290:'2026-03',date:'2026-03-01',purpose:'Linked request test',recipient:'Board',notes:'',preparedBy:'Manager',lines:[{category:'Office',description:'Paper',currency:'USD',amount:10,key117:'paper'}],movements:[],conversions:[]};
  const parent={id,data,version:1},draft={id:child,version:1,data:{...data,mode:'utilization',status:'draft',requestId14316:id,requestVersion14316:1,movements:[{type290:'receipt',inflow:100,currency:'USD',account:'Owner',reference:'Receipt'}]}};
  const rows=[parent,draft];
  await page.route('**/rest/v1/operational_reports*',r=>{const q=new URL(r.request().url()).searchParams;const rid=q.get('id')||'';
   return r.fulfill({json:rid.startsWith('eq.')?rows.find(v=>v.id===rid.slice(3))||null:q.get('data->>status')?[]:q.get('data->>requestId14316')?[draft]:rows});});
  let called=0;
  await page.route('**/rpc/append_budget_request_items',r=>{const p=r.request().postDataJSON();assert.equal(p.p_request,id);assert.equal(p.p_version,1);
   assert.equal(p.p_items.length,1);assert.equal(p.p_items[0].description,'New pens');called++;
   parent.version++;parent.data={...parent.data,document14316:p.p_document,lines:[...parent.data.lines,...p.p_items]};
   draft.version++;draft.data={...draft.data,lines:parent.data.lines,requestVersion14316:2};
   return r.fulfill({json:{request:parent,drafts:[draft]}});});
  await login();await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>switchTab('transactions-budget14313'));
  await page.evaluate(id=>budgetWorkflow14316.editRequest(id),id);
  const form=page.locator('.budget-request327');await form.getByRole('button',{name:'Budget items',exact:true}).click();
  await form.locator('[data-item-form] [name=category]').fill('Office');
  await form.locator('[data-item-form] [name=description]').fill('New pens');
  await form.locator('[data-item-form] [name=currency]').selectOption('USD');
  await form.locator('[data-item-form] [name=amount]').fill('15');
  await form.getByRole('button',{name:'Add item',exact:true}).click();
  await form.getByRole('button',{name:'Save request',exact:true}).click();
  try{await form.waitFor({state:'detached',timeout:6000});}catch(e){console.log('Form status:',await form.locator('[role=status]').innerText());throw e;}
  assert.equal(called,1);
  await page.evaluate(id=>budgetWorkflow14316.openAllocation(id),child);
  const popup=page.locator('.fund-popup326');
  assert.equal(await popup.locator('[data-request-summary] tbody tr').count(),2);
  const pens=popup.locator('[data-disbursements] tbody tr').filter({hasText:'New pens'});
  assert.equal(await pens.count(),1);
  assert.match(await popup.locator('[data-cash-summary] tfoot').innerText(),/100.00/);
  console.log('PASS Budget Request > Add item > Save > same linked draft, one requested row and one available payment row, receipts unchanged');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
