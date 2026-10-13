/* Recovery/state regressions for the targeted navigation changes; fixture only. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,context,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 f.fixture.tables.payroll_employees=[{id:'00000000-0000-4000-8000-000000005000',data:{name:'Synthetic Staff Member',code:'E01',active:true,currency:'LAK',salary:3500000}}];
 f.fixture.journal=[{id:'fixture-journal',date:'2026-10-05',accountId:f.fixture.accounts[0].id,currency:'LAK',debit:100,credit:0,memo:'fixture'},{id:'fixture-journal',date:'2026-10-05',accountId:f.fixture.accounts[1].id,currency:'LAK',debit:0,credit:100,memo:'fixture'}];
 await login();await page.waitForFunction(()=>offline14239.state().shellReady);
 const click=async module=>{await page.locator('#nav-module-'+module+' .nav-header').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))};
 await click('transactions');await page.locator('#jeGeneralMemo').fill('UNSAVED navigation regression');
 await click('settings');await page.locator('#settingCompanyName').fill('UNSAVED company marker');
 const before=await page.evaluate(()=>({journal:JSON.stringify(JournalModule.entries),employees:JSON.stringify(Work82.employees)}));
 await page.evaluate(()=>{window.__workCalls=0;const fn=renderWork82;window.renderWork82=function(...args){__workCalls++;return fn.apply(this,args)}});
 const start=f.requests.length;
 for(const offline of [false,true]){await context.setOffline(offline);for(const module of ['settings','accounts','sub-users','dashboard','transactions'])await click(module);assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'UNSAVED navigation regression')}
 await click('settings');assert.equal(await page.locator('#settingCompanyName').inputValue(),'UNSAVED company marker');
 assert.equal(await page.evaluate(()=>__workCalls),0,'unrelated navigation must not call workforce renderers');
 assert.deepEqual(await page.evaluate(()=>({journal:JSON.stringify(JournalModule.entries),employees:JSON.stringify(Work82.employees)})),before,'navigation must not change financial/employee records');
 assert(!f.requests.slice(start).some(r=>/\/rpc\/(post_|save_|finalize)/.test(r)),'navigation must never post');
 console.log('PASS journal draft, financial records and no unrelated workforce renders online/offline');
 await click('hr');assert(await page.locator('#payroll-employees tbody tr').count()>0,'employee table populated');
 // Name scanning must leave unrelated hidden tables untouched until their screen opens.
 await page.evaluate(()=>{const root=document.createElement('table');root.id='hidden-name-regression';root.innerHTML='<tbody><tr><td>Synthetic Staff Member</td></tr></tbody>';document.getElementById('settings-business').append(root)});
 await click('payroll');assert.equal(await page.locator('#hidden-name-regression td').textContent(),'Synthetic Staff Member');
 await click('settings');await page.waitForFunction(()=>document.querySelector('#hidden-name-regression td').textContent==='S. Member');
 await page.evaluate(()=>document.getElementById('hidden-name-regression').remove());
 console.log('PASS employee labels refresh when visible and hidden tables are not scanned');
 // Replaced controls restore from the recovery copy, not just retained DOM.
 await click('transactions');await page.screenshot({path:'/tmp/phase0-navigation-journal.png'});await page.evaluate(()=>{const old=document.getElementById('jeGeneralMemo'),next=old.cloneNode(true);next.value='';old.replaceWith(next)});
 await page.waitForFunction(()=>document.getElementById('jeGeneralMemo').value==='UNSAVED navigation regression');
 await page.evaluate(()=>{Work82.run={month:'2026-10',status:'draft',rows:[],notes:'UNSAVED payroll marker'};Work82.runRecord=null;workspacePendingRows['fixture-owner']=[{id:'fixture-pending',amount:321,memo:'UNSAVED sub-user marker'}];drafts1427.flush()});
 await context.setOffline(false);await page.reload();await page.waitForFunction(()=>startup14257.prepared&&document.querySelector('#loginGate.is-authenticated'));
 await click('transactions');assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'UNSAVED navigation regression');
 assert.equal(await page.evaluate(()=>Work82.run?.notes),'UNSAVED payroll marker');
 assert.equal(await page.evaluate(()=>workspacePendingRows['fixture-owner']?.[0]?.amount),321);
 console.log('PASS replaced controls and reload recover journal, payroll and sub-user drafts');
 // Background data updates still appear on a subsequent visit without any route cache.
 await page.evaluate(()=>{Work82.employees[0].data.position='Updated after sync'});await click('hr');assert.match(await page.locator('#payroll-employees').textContent(),/Updated after sync/);
 await page.screenshot({path:'/tmp/phase0-navigation-hr.png'});
 const headers=await page.locator('#payroll-employees table th').evaluateAll(nodes=>nodes.map(n=>({align:getComputedStyle(n).textAlign,weight:getComputedStyle(n).fontWeight})));
 assert(headers.length&&headers.every(h=>h.align==='left'&&Number(h.weight)>=700));
 assert.deepEqual(errors,[]);console.log('PASS fresh employee data and existing table styling');await context.close();
 const staff=await f.open('desktop','staff');await staff.login();await staff.page.evaluate(()=>switchTab('settings-users'));
 assert.notEqual(await staff.page.locator('.tab-content.active').getAttribute('id'),'settings-users');
 assert.equal(await staff.page.evaluate(()=>canAccessAppTarget('settings-users')),false);console.log('PASS staff permission boundary');await staff.context.close();
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
