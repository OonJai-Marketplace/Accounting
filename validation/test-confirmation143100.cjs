/* A background error must not intercept an explicit confirmation action. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();
 for(const viewport of [{width:1440,height:900},{width:820,height:1000}]){
  await page.setViewportSize(viewport);
  await page.evaluate(()=>{status118.clear();showCenterStatus('Connection required. Your draft is retained; reconnect before approval, final posting or changing saved records.',true);window.__confirmed143100=0;showAppConfirm('Confirm audit check','This changes only synthetic test state.','Continue',()=>window.__confirmed143100++,false)});
  await page.locator('#activeAppConfirm [data-confirm]').click({timeout:3000});
  assert.equal(await page.evaluate(()=>window.__confirmed143100),1);assert.equal(await page.locator('#activeAppConfirm').count(),0);
  assert(await page.locator('#status118').isVisible(),'Underlying warning is retained');
 }
 console.log('PASS desktop/tablet confirmations remain clickable over persistent background warnings');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
