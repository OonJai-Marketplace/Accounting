const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();await page.evaluate(()=>{window.status118?.clear();ApplicationSettings.system.fontSize='normal';fontSize14380.apply();});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluate(()=>{switchTab('settings-tax');settingsStack143176.open('mandatory');});
 const aligned=async(names)=>{const tops=await page.evaluate(names=>names.map(n=>{let el=document.querySelector(`[name="${n}"]`);if(el.matches(".account-source1428"))el=el.parentElement.querySelector(".account-search1428");return el.getBoundingClientRect().top;}),names);assert(Math.max(...tops)-Math.min(...tops)<2,JSON.stringify({names,tops}));};
 for(const width of [1860,1440,1024]){
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>settingsStack143176.sync());
  await aligned(['vatRate','filingPeriod']);await aligned(['ssoEmployeeRate','ssoEmployerRate']);
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('#settings-tax .statutory-block')].map(el=>({client:el.clientWidth,scroll:el.scrollWidth})));assert(overflow.every(x=>x.scroll<=x.client+2),JSON.stringify(overflow));
  await page.evaluate(()=>{settingsStack143176.open('payroll');window.status118?.clear();document.querySelector('[name=minorSickAllowance]').closest('.settings-module94').scrollIntoView({block:'center'});});
  await aligned(['minorSickAllowance','personalAllowance']);await aligned(['latePenaltyFirst','latePenaltySecond']);
  await page.screenshot({path:`/tmp/settings-payroll-${width}.png`});
  await page.evaluate(()=>{settingsStack143176.open('mandatory');window.status118?.clear();});await page.screenshot({path:`/tmp/settings-tax-${width}.png`});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>settingsStack143176.open('users'));assert.equal(await page.locator('#settings-users .settings-page-heading').isVisible(),false);assert(await page.getByRole('button',{name:'+ Add Sub-user',exact:true}).isVisible());const userButtons=await page.locator('#demoUsersList .demo-user-row').first().locator('button').evaluateAll(bs=>bs.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,width:r.width}}));assert(userButtons.every(b=>Math.abs(b.left-userButtons[0].left)<2&&Math.abs(b.width-userButtons[0].width)<2),JSON.stringify(userButtons));await page.screenshot({path:'/tmp/settings-users.png'});
 await page.evaluate(()=>settingsStack143176.open('organization'));assert.equal(await page.locator('.organization-card14231>.je-card-header').isVisible(),false);await page.screenshot({path:'/tmp/settings-organization.png'});
 await page.evaluate(()=>settingsStack143176.open('preferences'));await page.screenshot({path:'/tmp/settings-preferences.png'});
 await page.evaluate(()=>settingsStack143176.open('maintenance'));assert.equal(await page.locator('#settings-maintenance14324 .settings-stack-section143176').count(),1);assert.equal(await page.locator('#settings-maintenance14324 .maintenance-card14324').count(),3);assert.equal(await page.locator('#settings-maintenance14324 details').count(),0);assert.equal(await page.locator('[data-jump143176^="maintenance"]').count(),1);await page.screenshot({path:'/tmp/settings-maintenance.png'});
 await page.evaluate(()=>{
  switchTab('accounts-modular-container');scrollToAccountModule('sec-chart-accounts');
  AccountingStore.accounts=[{id:'fixture-account',code:'1010',name:'Cash on hand with a long account name',currency:'LAK',type:'ASSET',desc:'A long description that should use the space formerly occupied by the action column and remain readable without clipping.'}];
  renderChartOfAccountsTable();
 });
 const row=page.locator('#coaTableBody tr').first();assert.equal(await row.locator('td').count(),5);assert.equal(await page.locator('#tblChartOfAccounts th').count(),5);assert.equal(await row.locator('button').count(),0);
 await row.dblclick();const menu=page.locator('.chart-action-menu143181');assert(await menu.isVisible());assert.deepEqual(await menu.locator('button').allTextContents(),['Edit','Delete','Group']);
 const boxes=await menu.locator('button').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,width:r.width}}));assert.equal(await menu.locator('.chart-delete143181').evaluate(n=>getComputedStyle(n,'::before').content),'none');assert(Number(await menu.evaluate(n=>getComputedStyle(n).paddingLeft.replace('px','')))>=10);await page.screenshot({path:'/tmp/settings-account-menu.png'});assert(boxes.every((b,i)=>!i||b.top>=boxes[i-1].bottom+7&&b.left===boxes[0].left&&b.width===boxes[0].width),JSON.stringify(boxes));
 await page.screenshot({path:'/tmp/settings-account-menu.png'});await page.keyboard.press('Escape');assert.equal(await menu.count(),0);await row.press('Enter');assert(await menu.isVisible());await page.keyboard.press('ArrowDown');assert.equal(await page.locator(':focus').innerText(),'Delete');await page.keyboard.press('Escape');
 await row.dblclick();await menu.getByRole('menuitem',{name:'Edit',exact:true}).click();assert(await page.locator('#modalAccount').isVisible());assert.equal(await page.locator('#accCode').inputValue(),'1010');await page.evaluate(()=>closeModal('modalAccount'));
 await row.dblclick();await menu.getByRole('menuitem',{name:/^Change group for/}).click();await page.locator('#rowGroupForm143180').waitFor();await page.evaluate(()=>document.querySelector('.ui-overlay108:last-child').resolve108(false));await row.dblclick();await page.evaluate(()=>renderChartOfAccountsTable());assert.equal(await menu.count(),0);
 await page.evaluate(()=>{document.getElementById('searchCoa1439').value='not-found';renderChartOfAccountsTable();});assert.equal(await page.locator('#coaTableBody td').getAttribute('colspan'),'5');
 await page.evaluate(()=>{document.getElementById('searchCoa1439').value='';renderChartOfAccountsTable();});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.dataset.device132='phone';settingsStack143176.sync();AccountGroups143180.render();renderChartOfAccountsTable();});assert.equal(await page.locator('#coaTableBody tr').first().locator('td').count(),6);assert.equal(await page.locator('#tblChartOfAccounts th').count(),6);assert.equal(await page.locator('.settings-stack-workspace143176').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS aligned long labels at three widths, unclipped panels, retained heading actions, consolidated maintenance, double-click/keyboard menu, edit action, refresh close, empty table and phone restoration');
 }finally{await f.close();}})().catch(e=>{console.error(e);process.exitCode=1});
