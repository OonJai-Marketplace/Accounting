/* Synthetic browser records only; no company services are contacted. */
const assert=require('node:assert/strict'),fs=require('node:fs'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.route('**/rest/v1/payroll_tax_settings*',async route=>{const req=route.request();if(req.method()==='POST')return route.fulfill({json:[req.postDataJSON()]});return route.fulfill({json:null});});
 await page.route('**/rest/v1/rpc/reconciliation_workspace306',route=>route.fulfill({json:{months:[],month:null,progress:{items:[]}}}));
 await login();await page.waitForFunction(()=>startup14257.interactive);await page.waitForLoadState('networkidle');
 await page.evaluate(()=>{switchTab('payroll-entries');switchTab('dashboard');document.querySelector('#nav-module-payroll .nav-header').click()});
 assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'payroll-entries');
 for(const [module,target] of [['reports','report-gl'],['hr','hr-contracts'],['accounts','sec-sub-accounts'],['tax-sso','tax-payment'],['local-events','local-events-account']]){
  await page.evaluate(({module,target})=>{if(target.startsWith('sec-'))scrollToAccountModule(target);else switchTab(target);switchTab('dashboard');document.querySelector('#nav-module-'+module+' .nav-header').click()},{module,target});
  assert.equal(await page.evaluate(module=>navigationMemory312.get(module),module),target);
  if(module!=='accounts')assert.equal(await page.locator('.tab-content.active').getAttribute('id'),target);
 }
 await page.evaluate(()=>{switchTab('dashboard');document.querySelector('#dashboard [data-tab112=Finance]').click();switchTab('payroll-overview');document.querySelector('#nav-module-dashboard .nav-header').click()});
 assert.equal(await page.locator('#dashboard [aria-selected=true]').getAttribute('data-tab112'),'Finance');
 // A physical two-step keyboard sequence routes through the grouped controller.
 await page.keyboard.press('Control+Alt+b');await page.keyboard.press('r');
 assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'user-entry-review');
 assert.equal(await page.evaluate(()=>budgetWorkflow14316.finalTab),'reconciliation');
 await page.keyboard.press('Control+Alt+b');await page.keyboard.press('Control+Alt+r');
 assert.equal(await page.evaluate(()=>budgetWorkflow14316.finalTab),'reconciliation');
 await page.evaluate(()=>{navigationWorkflow14316.cancel();switchTab('dashboard');groupedNavigation14378.choose(groupedNavigation14378.rememberedChoice('transactions'))});
 assert.equal(await page.evaluate(()=>budgetWorkflow14316.finalTab),'reconciliation');
 // Every grouped Bookkeeping and Settings destination remains selected on return.
 const grouped=await page.evaluate(()=>[...groupedNavigation14378.books,...groupedNavigation14378.settings].flatMap(g=>g.items).filter(groupedNavigation14378.allowed).map(i=>({label:i.label,target:i.target,kind:i.kind,value:i.value,module:groupedNavigation14378.settings.some(g=>g.items.includes(i))?'settings':'transactions'})));
 for(const expected of grouped){
  const actual=await page.evaluate(i=>{const groups=i.module==='settings'?groupedNavigation14378.settings:groupedNavigation14378.books;const item=groups.flatMap(g=>g.items).find(x=>x.label===i.label&&x.target===i.target&&x.kind===i.kind&&x.value===i.value);groupedNavigation14378.choose(item);switchTab('dashboard');document.querySelector('#nav-module-'+i.module+' .nav-header').click();const group=groups.find(g=>g.items.includes(item));document.querySelector('#groupMenu14388 [data-group14388="'+group.label+'"]')?.click();const saved=groupedNavigation14378.rememberedChoice(i.module);return {target:saved.target,kind:saved.kind,value:saved.value,active:document.querySelector('.tab-content.active')?.id};},expected);
  assert.equal(actual.target,expected.target,expected.label);assert.equal(actual.kind,expected.kind,expected.label);assert.equal(actual.value,expected.value,expected.label);assert.equal(actual.active,expected.target,expected.label);
 }
 // Navigation metadata must survive a reload and remain isolated by signed-in owner.
 await page.evaluate(()=>{switchTab('payroll-entries');switchTab('dashboard')});
 await page.reload();await page.waitForFunction(()=>startup14257.interactive);
 await page.locator('#nav-module-payroll .nav-header').click();
 assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'payroll-entries');
 const isolation=await page.evaluate(()=>{const owner=liveProfile.id;const previous=navigationMemory312.get('payroll');liveProfile.id='fixture-other-owner-312';const other=navigationMemory312.get('payroll');liveProfile.id=owner;return {previous,other,restored:navigationMemory312.get('payroll')}});
 assert.equal(isolation.other,undefined);assert.equal(isolation.restored,isolation.previous);
 // Simulate idle time only inside the navigation clock; do not trigger account/session expiry.
 await page.evaluate(()=>{const now=Date.now;Date.now=()=>now()+13*60*60*1000;navigationMemory312.get('payroll');document.querySelector('#nav-module-payroll .nav-header').click();Date.now=now});
 assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'payroll-overview');
 assert.equal(await page.evaluate(()=>groupedNavigation14378.rememberedChoice('transactions').value),'journal');
 await page.evaluate(()=>{const results=[{employeeId:'a',currency:'USD',gross:4400000,employeePit:100000,employeeSso:0,net:4300000,paidAmount:195.45},{employeeId:'b',currency:'LAK',gross:3000000,employeePit:50000,employeeSso:165000,net:2785000,paidAmount:2785000}];const employees=[{name:'Sample Foreign Worker',code:'TEST-A',currency:'USD',salary:200},{name:'Sample Local Worker',code:'TEST-B',currency:'LAK',salary:3000000}];Work82.run={month:'2026-10',reference:'Payroll · October 2026',status:'finalized',results,rows:results.map((x,i)=>({employeeId:x.employeeId,employee:employees[i],input:{}}))};renderWork82()});
 assert.match(await page.locator('.payroll-metrics312').innerText(),/7,400,000/);
 assert.match(await page.locator('.payroll-payment312').innerText(),/195.45/);
 assert.match(await page.locator('.payroll-payment312').innerText(),/2,785,000/);
 assert.equal(await page.locator('.payroll-summary312 tbody tr').count(),2);
 fs.mkdirSync('/tmp/workspace312',{recursive:true});await page.screenshot({path:'/tmp/workspace312/payroll-desktop.png'});
 await page.setViewportSize({width:1024,height:900});await page.screenshot({path:'/tmp/workspace312/payroll-tablet.png'});
 await page.evaluate(()=>{Object.assign(Finance82,{date:'2026-11-06',budgetMonth290:'2026-10',recipient:'Fixture recipient',purpose:'October support',notes:'Internal test report',lines:[{key117:'fuel',category:'Transport',description:'Fuel',amount:100,currency:'USD'}],movements:[],conversions:[]});Work82.reportRecord=null;switchTab('transactions-budget14313');renderWork82()});
 await page.screenshot({path:'/tmp/workspace312/budget-request.png'});
 await page.getByRole('button',{name:'Fund utilization',exact:true}).click();
 assert(await page.locator('#categoryTabs').isVisible(),'Budget retains main horizontal navigation');
 const popup=page.getByRole('dialog',{name:'Fund utilization',exact:true});
 assert(await popup.locator('#financeMove82').isVisible());
 await popup.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('#categoryTabs').getByRole('tab',{name:'Journal',exact:true}).click();
 assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'journal');
 await page.evaluate(()=>switchTab('transactions-budget14313'));
 await page.getByRole('button',{name:'Fund utilization',exact:true}).click();
 const db=new Map();
 await page.route('**/rest/v1/rpc/budget_capabilities14316',r=>r.fulfill({json:{version:14316}}));
 await page.route('**/rest/v1/operational_reports*',async route=>{const req=route.request(),u=new URL(req.url()),id=u.searchParams.get('id')?.slice(3);if(req.method()==='POST'){const row=req.postDataJSON();db.set(row.id,row);return route.fulfill({json:[row]})}return route.fulfill({json:id?(db.get(id)||null):[...db.values()].filter(r=>r.data.requestId14316===u.searchParams.get('data->>requestId14316')?.slice(3))})});
 await page.getByRole('button',{name:'Record actual spending',exact:true}).click();
 const move=page.locator('#financeMove82');assert.equal(await move.locator('[name=type290]').inputValue(),'spend');
 await move.evaluate(form=>{for(const [k,v] of Object.entries({account:'Cash box',destination290:'Fuel supplier',amount:'25',currency:'USD',budgetKey117:'fuel',reference:'TEST-1',description290:'Fuel for food delivery'}))form.elements[k].value=v;form.requestSubmit()});
 assert.match(await page.locator('#budgetFunds290').innerText(),/Fuel for food delivery/);
 assert.match(await page.locator('#budgetFunds290').innerText(),/USD 75/);
 await page.screenshot({path:'/tmp/workspace312/fund-utilization.png',fullPage:true});
 await popup.getByRole('button',{name:'Save report',exact:true}).click();
 await page.waitForFunction(()=>Work82.reports.some(r=>r.data.mode==='utilization'));
 assert.equal([...db.values()].filter(r=>r.data.mode==='request').length,1);
 assert(!f.requests.some(r=>/POST .*post_payroll|POST .*post_journal/.test(r)));
 assert.deepEqual(errors,[]);console.log('PASS remembered tabs, 12-hour reset, two-step shortcuts, payroll currency summaries, budget exit navigation, direct request save, editable spending and comparison. Synthetic browser fixture only.');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
