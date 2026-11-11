// Simulate the missing Safari networking APIs against a synthetic accounting server.
const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await create();
 try {
  const first=await fixture.open();
  await first.login();
  const ipad=await fixture.open();
  await ipad.page.addInitScript(()=>{
   for(const key of ['timeout','any'])Object.defineProperty(AbortSignal,key,{value:undefined,configurable:true});
  });
  await ipad.page.reload();
  await ipad.login();
  assert(await first.page.evaluate(()=>deviceVault14334.unlocked));
  assert(await ipad.page.evaluate(()=>deviceVault14334.unlocked&&!deviceVault14334.offline));
  assert(!fixture.requests.some(r=>r.startsWith('POST /auth/v1/logout')));

  const fresh=await fixture.open();
  const loginForm=async()=>{
   await fresh.page.locator('#loginEmail').fill(fresh.me.email);
   await fresh.page.locator('#loginPassword').fill('fixture-only');
   await fresh.page.locator('#loginForm button[type=submit]').click();
  };
  const message=fresh.page.locator('#loginNotification14293[open]');
  await fresh.page.route('**/rest/v1/profiles?*',r=>{
   if(new URL(r.request().url()).searchParams.get('select')==='id,status,role')return r.abort('failed');
   return r.continue();
  });
  await loginForm();await message.waitFor();assert.match(await message.innerText(),/could not verify your Accounting profile/);
  assert.equal(await fresh.page.evaluate(()=>deviceVault14334.unlocked),false);
  await message.locator('button').click();
  await fresh.page.unroute('**/rest/v1/profiles?*');
  await fresh.page.route('**/auth/v1/token?*',r=>r.fulfill({status:400,json:{code:'invalid_credentials',message:'Invalid login credentials'}}));
  await loginForm();await message.waitFor();assert.match(await message.innerText(),/email or password is incorrect/i);
  assert.equal(await fresh.page.evaluate(()=>deviceVault14334.unlocked),false);
  await message.locator('button').click();
  await fresh.page.unroute('**/auth/v1/token?*');
  await fresh.page.route('**/auth/v1/token?*',route=>route.abort('failed'));
  await loginForm();await message.waitFor();assert.match(await message.innerText(),/could not reach the Accounting sign-in service/);
  assert.equal(await fresh.page.evaluate(()=>deviceVault14334.unlocked),false);
  await message.locator('button').click();
  await fresh.context.setOffline(true);
  await loginForm();await message.waitFor();assert.match(await message.innerText(),/browser reports it is offline/);
  console.log('PASS new iPad sign-in without AbortSignal.any or timeout, independent active browsers, profile failure, invalid credentials and first offline sign-in');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
