// Reopen a signed-in, synthetic workspace from its installed service worker.
const assert = require('node:assert/strict');
const createFixture = require('./phase0-browser-fixture.cjs');

async function waitForWorkspace(page) {
 await page.waitForFunction(() => window.startup14257?.prepared &&
  document.querySelector('#loginGate').classList.contains('is-authenticated') &&
  !document.body.classList.contains('startup-pending1443'), null, {timeout:45000});
}

async function removeDownloadedPlans(page) {
 return page.evaluate(async () => {
  const db = await new Promise((resolve,reject) => {
   const open = indexedDB.open('ojm-offline14239');
   open.onsuccess = () => resolve(open.result);
   open.onerror = () => reject(open.error);
  });
  let removed=0;
  try {
   await new Promise((resolve,reject) => {
    const tx=db.transaction('snapshots','readwrite'), cursor=tx.objectStore('snapshots').openCursor();
    cursor.onsuccess=()=>{
     const item=cursor.result;
     if(!item)return;
     if(String(item.key).includes('/rpc/list_journal_plans280:')){item.delete();removed++;}
     item.continue();
    };
    tx.oncomplete=resolve;
    tx.onabort=tx.onerror=()=>reject(tx.error);
   });
  } finally { db.close(); }
  return removed;
 });
}

(async () => {
 const fixture=await createFixture();
 try {
  const {page,context,login}=await fixture.open();
  const plan={id:'fixture-plan-293',kind:'recurring',title:'Offline fixture plan',
   memo:'Fixture',status:'active',definition:{},occurrences:[]};
  await page.route('**/rest/v1/rpc/list_journal_plans280',route=>route.fulfill({json:[plan]}));
  page.setDefaultTimeout(60000);
  await login().catch(async error=>{
   console.error('Startup status:',await page.locator('#startup1443 p').textContent(),await page.locator('#recurringPlans280 [role=alert]').allTextContents());
   throw error;
  });
  await page.waitForFunction(()=>navigator.serviceWorker.controller&&offline14239.state().shellReady);
  await page.locator('#nav-module-transactions .nav-header').click();
  await page.locator('#groupMenu14388 [data-group14388="Upcoming"]').click();
  await page.locator('#recurringPlans280 [data-plan="fixture-plan-293"]').waitFor({state:'attached'});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});await waitForWorkspace(page);
  assert.ok(await page.locator('#recurringPlans280 [data-plan="fixture-plan-293"]').count());
  const activity=await page.evaluate(()=>{
   const rail=document.getElementById('appSidebar'),label=document.querySelector('.rail-hover-label');
   const icons=[...rail.querySelectorAll('.nav-header')].filter(b=>b.offsetWidth);
   // Check synchronous handler work, separately from unrelated app activity.
   const fetch=window.fetch,send=XMLHttpRequest.prototype.send;
   let requests=0;
   window.fetch=(...args)=>{requests++;return fetch(...args);};
   XMLHttpRequest.prototype.send=function(...args){requests++;return send.apply(this,args);};
   try{
    for(const button of icons){
     button.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
     if(label.hidden||label.textContent!==button.getAttribute('aria-label')||rail.offsetWidth!==52)
      throw Error('Incorrect offline label or rail width.');
    }
   }finally{window.fetch=fetch;XMLHttpRequest.prototype.send=send;}
   return {icons:icons.length,requests};
  });
  assert.ok(activity.icons>=10);assert.equal(activity.requests,0);
  await page.locator('#nav-module-accounts .nav-header').click();
  assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'accounts-modular-container');
  console.log('PASS offline reload retains plans, module navigation and '+activity.icons+' immediate labels with zero hover requests');
  assert.ok(await removeDownloadedPlans(page)>0);
  await page.reload({waitUntil:'domcontentloaded'});await waitForWorkspace(page);
  await page.locator('#nav-module-transactions .nav-header').click();
  await page.locator('#groupMenu14388 [data-group14388="Upcoming"]').click();
  await page.waitForFunction(()=>document.querySelector('#recurringPlans280 [role=alert]')?.textContent.includes('not been downloaded'));
  assert.equal(await page.locator('#recurringPlans280 [data-plan="fixture-plan-293"]').count(),0);
  await page.locator('#nav-module-accounts .nav-header').click();
  assert.equal(await page.locator('.tab-content.active').getAttribute('id'),'accounts-modular-container');
  console.log('PASS an older device without a plan download can open other screens and sees the download message in Upcoming');
 } finally { await fixture.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
