const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 for(const device of ['desktop','phone']){
  const {page,context,login}=await f.open(device,device==='phone'?'staff':'admin',true);await login();
  await page.waitForFunction(device==='phone'?()=>PhoneWorkspace14242.offlineReady():()=>offline14239.state().shellReady);
  const activity=()=>{const k=Object.keys(__rawLocal).find(k=>k.endsWith(deviceVault14334.actor+':activity'));return Number(__rawLocal.getItem(k))};
  const initial=await page.evaluate(activity);
  if(device==='desktop'){
   await page.evaluate(async()=>{const r=await ojmDb.auth.refreshSession();if(r.error)throw r.error;await localFirst14333.sync()});assert.equal(await page.evaluate(activity),initial,'SDK refresh/background sync must not touch activity');
  }
  await context.setOffline(true);await page.clock.setFixedTime(initial+43200000);
  await page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));document.dispatchEvent(new Event('visibilitychange'))});
  assert.equal(await page.evaluate(activity),initial,'tab return alone must not extend session');
  await page.keyboard.press('Shift');const touched=await page.evaluate(activity);assert.equal(touched,initial+43200000,'real keyboard activity must reset deadline');
  await context.setOffline(true);await page.clock.setFixedTime(touched+86399999);
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));assert.equal(await page.evaluate(()=>deviceVault14334.unlocked),true);
  await page.clock.setFixedTime(touched+86400000);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.waitForFunction(()=>window.deviceVault14334&&!deviceVault14334.unlocked&&document.querySelector('#loginNotification14293[open]'));
  assert.match(await page.locator('#loginNotification14293').innerText(),/One day without activity/);
  assert.equal(await page.evaluate(()=>localStorage.getItem('sb-'+new URL(OJM_SUPABASE_URL).hostname.split('.')[0]+'-auth-token')),null);
  console.log('PASS',device,'real browser clock, trusted activity, sleep restoration and offline expiry with reauthentication gate');await context.close();
 }
 const {page,context,login}=await f.open();await login();
 await page.route('**/auth/v1/logout?*',async route=>{await new Promise(r=>setTimeout(r,800));return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Fixture service unavailable'})})});
 await page.evaluate(()=>{void ojmDb.auth.signOut({scope:'local'})});await page.waitForSelector('#deviceLock14334');
 await page.screenshot({path:'/tmp/phase0-logout-loading.png'});
 await page.waitForFunction(()=>window.deviceVault14334&&!deviceVault14334.unlocked&&document.querySelector('#loginNotification14293[open]'));
 assert.match(await page.locator('#loginNotification14293').innerText(),/Server sign-out could not be confirmed/);
 console.log('PASS server sign-out failure retains a genuine error notice and locks local access');await context.close();
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
