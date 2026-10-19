const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const{page,login}=await f.open();await login();
 const header=m=>page.locator('#nav-module-'+m+' .nav-header');
 const group=(m,g)=>page.locator('#nav-module-'+m+' [data-group14378="'+g+'"]');
 const tab=t=>page.locator('#categoryTabs [data-section14378="'+t+'"]');
 const toggle=m=>page.locator('#nav-module-'+m+' .group-toggle143111');
 const expanded=()=>page.locator('#nav-module-transactions .grouped-children14378').isVisible();
 async function selected(module,target,label){
  await page.waitForFunction(id=>document.querySelector('.tab-content.active')?.id===id,target);
  const state=await page.evaluate(()=>({selected:[...document.querySelectorAll('#appSidebar .nav-category')].filter(n=>n.matches('.active-category,.current-module136,.is-active')||n.querySelector('.nav-header.nav-selected109,.nav-header.active,.nav-header[aria-current=page]')).map(n=>n.dataset.module),tab:document.querySelector('#categoryTabs .active')?.textContent.trim(),stale:[...document.querySelectorAll('.grouped-children14378 .active')].filter(b=>!b.closest('.current-module136')).length}));
  assert.deepEqual(state.selected,[module],JSON.stringify(state));assert.equal(state.stale,0);if(label)assert.equal(state.tab,label);
 }
 assert(await expanded());
 await header('accounts').click();await selected('accounts','accounts-modular-container');
 await header('transactions').click();await selected('transactions','journal','Journal');assert(await expanded());
 await tab('Reconcile').click();await selected('transactions','user-entry-review','Reconcile');
 await header('hr').click();await selected('hr','payroll-employees');
 await header('transactions').click();await selected('transactions','user-entry-review','Reconcile');assert(await expanded());
 await group('transactions','Upcoming').click();await tab('Calendar').click();await selected('transactions','transactions-recurring','Calendar');
 await group('transactions','Journal').click();await selected('transactions','user-entry-review','Reconcile');
 await group('transactions','Upcoming').click();await selected('transactions','transactions-recurring','Calendar');
 await header('accounts').click();await selected('accounts','accounts-modular-container');
 await toggle('transactions').click();assert(!await expanded());await selected('accounts','accounts-modular-container');
 await header('transactions').click();await selected('transactions','transactions-recurring','Calendar');assert(!await expanded(),'manual collapsed preference preserved');
 await toggle('transactions').click();assert(await expanded());
 await header('transactions').click();await selected('transactions','transactions-recurring','Calendar');assert(await expanded(),'repeat module selection does not collapse');
 // Keyboard activation keeps navigation and expansion separate too.
 await toggle('transactions').focus();await page.keyboard.press('Enter');assert(!await expanded());
 await page.keyboard.press('Enter');assert(await expanded());
 await header('hr').click();await header('transactions').focus();await page.keyboard.press('Enter');await selected('transactions','transactions-recurring','Calendar');
 await header('settings').click();await toggle('settings').click();
 await group('settings','Accounting').click();await tab('Payroll').click();await selected('settings','settings-payroll','Payroll');
 await header('hr').click();await header('settings').click();await selected('settings','settings-payroll','Payroll');
 await group('settings','Company').click();await group('settings','Accounting').click();await selected('settings','settings-payroll','Payroll');
 await header('accounts').click();await selected('accounts','accounts-modular-container');
 await page.screenshot({path:'/tmp/sidebar143111-accounts.png'});
 await header('transactions').click();await selected('transactions','transactions-recurring','Calendar');
 await page.screenshot({path:'/tmp/sidebar143111-bookkeeping.png'});
 // Compact rails retain the section menu without falsely selecting its parent.
 await page.evaluate(()=>workspaceFullscreen1440.set(true));
 await header('accounts').click();await selected('accounts','accounts-modular-container');
 assert(await toggle('transactions').isHidden());
 await header('transactions').click();await page.waitForSelector('#groupMenu14388');await selected('accounts','accounts-modular-container');
 await page.locator('#groupMenu14388 [data-group14388="Upcoming"]').click();await selected('transactions','transactions-recurring','Calendar');
 await page.evaluate(()=>workspaceFullscreen1440.set(false));
 // Reduced permissions must invalidate a remembered destination.
 await page.evaluate(()=>{const old=access113.can;access113.can=function(id){return id==='transactions-recurring'?false:old.call(this,id)};});
 await header('hr').click();await header('transactions').click();await selected('transactions','journal','Journal');
 console.log('PASS single active module, HR/Accounts return to remembered Bookkeeping section, per-group memory, explicit collapse without selection, keyboard controls, Settings memory, permission-safe fallback');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exit(1)});
