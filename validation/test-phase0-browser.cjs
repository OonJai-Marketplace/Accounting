const fs=require('node:fs'),assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
const baseline=!!process.env.PHASE0_BASELINE,measurements=[],results=[];
const check=(name)=>{results.push({name,passed:true});console.log('PASS',name)};
(async()=>{const f=await create();try{
 const {page,context,login}=await f.open();
 await login();await page.waitForFunction(()=>offline14239.state().shellReady);
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>startup14257.prepared),true);check('desktop real SDK login and initial data preparation');
 // Instrument actual IDB reads and HTTP requests, without replacing data loaders.
 await page.evaluate(()=>{window.__idbReads=0;const get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.get=function(...args){__idbReads++;return get.apply(this,args)}});
 for(const offline of [false,true]){
  await context.setOffline(offline);
  for(let repeat=0;repeat<3;repeat++)for(const id of ['journal','transactions-all','payroll-employees','payroll-history','settings-users','settings-business','report-gl','sub-users-home14229']){
   const requestCount=f.requests.length;
   const timing=await page.evaluate(async id=>{const reads=__idbReads,start=performance.now();switchTab(id);const synchronous=performance.now()-start;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const painted=performance.now()-start;await new Promise(r=>setTimeout(r,100));return {synchronous,painted,reads:__idbReads-reads,active:document.querySelector('.tab-content.active')?.id,pending:document.body.classList.contains('startup-pending1443')}},id);
   measurements.push({offline,repeat,id,...timing,requests:f.requests.slice(requestCount)});
   assert.equal(timing.active,id);assert.equal(timing.pending,false,'already-prepared navigation must not wait for startup');
  }
 }
 check('desktop module navigation online and offline after preload');
 if(!baseline){
  const reads=await page.evaluate(async()=>{const before=__idbReads;await loadWork82();await loadWork82();return __idbReads-before});assert.equal(reads,0,'loaded payroll should stay in memory');
  check('repeat payroll reads reuse prepared memory');
 }
 if(process.env.PHASE0_BENCHMARK_ONLY)return;
 await context.setOffline(false);await context.close();
 for(const device of ['desktop','phone'])for(const offline of [false,true]){
  const {page,context,login}=await f.open(device,device==='phone'?'staff':'admin');
  await login();await page.waitForFunction(device==='phone'?()=>PhoneWorkspace14242.offlineReady():()=>offline14239.state().shellReady);
  await page.evaluate(()=>localStorage.setItem('phase0-private-draft','KEEP-PRIVATE'));
  let logoutRequest=false;await page.route('**/auth/v1/logout?*',async route=>{logoutRequest=true;await new Promise(r=>setTimeout(r,350));await route.continue()});
  // Save every lock-screen observation outside the encrypted adapter for inspection after reload.
  await page.evaluate(()=>{const raw=__rawSession;raw.setItem('phase0-lock-frames','[]');new MutationObserver(()=>{const node=document.getElementById('deviceLock14334');if(!node)return;const rows=JSON.parse(raw.getItem('phase0-lock-frames'));rows.push({background:getComputedStyle(node).backgroundColor,top:document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('#deviceLock14334')===node,spinner:!!node.querySelector('.loading-orbit1444')});raw.setItem('phase0-lock-frames',JSON.stringify(rows));}).observe(document.body,{childList:true,subtree:true})});
  await context.setOffline(offline);
  if(device==='desktop'){
   await page.evaluate(()=>confirmSignOut());await page.locator('#activeAppConfirm [data-confirm]').click();
  }else{
   await page.locator('#avatar').click();await page.locator('#accountMenu [data-action=signout]').click();await page.locator('#dialog [value=yes]').click();
  }
  await page.waitForFunction(()=>window.deviceVault14334&&!deviceVault14334.unlocked&&document.getElementById('loginForm')&&!document.getElementById('deviceLock14334'));
  const state=await page.evaluate(()=>({draft:localStorage.getItem('phase0-private-draft'),body:document.body.innerText,frames:JSON.parse(__rawSession.getItem('phase0-lock-frames')||'[]'),gate:!!document.querySelector('#loginGate.is-authenticated'),key:Object.keys(__rawSession).some(k=>k.startsWith('ojm-vault14334:')&&k.endsWith(':session'))}));
  assert.equal(state.draft,null);assert.equal(state.key,false);assert.equal(state.gate,false);assert(!/Signed out|signed out successfully/i.test(state.body));assert(state.frames.length&&state.frames.every(x=>x.top&&x.spinner&&x.background==='rgb(255, 250, 241)'),JSON.stringify(state.frames));assert.equal(logoutRequest,!offline);
  check(device+' '+(offline?'offline':'online')+' logout: no success notice, opaque loading surface, locked private data, SDK request when online');
  if(offline){await login();assert.equal(await page.evaluate(()=>localStorage.getItem('phase0-private-draft')),'KEEP-PRIVATE');check(device+' password reauthentication offline retains encrypted draft');}
  await context.close();
 }
}finally{
 fs.writeFileSync(process.env.PHASE0_RESULTS||'/tmp/phase0-browser-results.json',JSON.stringify({baseline,results,measurements},null,2));await f.close();
}})().catch(e=>{console.error(e);process.exitCode=1});
