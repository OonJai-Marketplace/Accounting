const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await login();
 await page.evaluate(()=>switchTab('journal'));
 await page.waitForFunction(()=>startup14257.interactive&&!document.body.classList.contains('startup-pending1443'));
 await page.locator('#nav-module-transactions > .nav-header').click();
 const nav=page.locator('.grouped-children14378>button.active').first();
 await nav.hover();const hovered=await nav.evaluate(n=>getComputedStyle(n).backgroundColor);
 await page.mouse.move(900,800);const selected=await nav.evaluate(n=>({bg:getComputedStyle(n).backgroundColor,height:n.getBoundingClientRect().height}));
 assert.equal(hovered,selected.bg);assert.equal(selected.bg,'rgb(241, 223, 173)');assert(selected.height<=30);
 // Unrelated slow payroll must not hold the restored journal behind a loading gate.
 await page.route('**/rest/v1/rpc/payroll_window14334',()=>new Promise(()=>{}));
 f.requests.length=0;const begin=Date.now();await page.reload();
 await page.waitForFunction(()=>startup14257?.prepared&&liveProfile&&!document.body.classList.contains('startup-pending1443'));
 const elapsed=Date.now()-begin;
 const info=await page.evaluate(()=>({view:Location69.view,journal:startup14257.isPrepared('journal'),payroll:startup14257.isPrepared('payroll'),prepared:workspaceViews14364.state().prepared}));
 assert.equal(info.view,'journal');assert(info.journal);assert(!info.payroll,'unopened payroll must not block return');
 assert(!f.requests.some(x=>x.includes('/rpc/journal_window14333')),'return must use saved journal');
 await page.evaluate(()=>switchTab('chart-of-accounts'));
 await page.waitForFunction(()=>!document.body.classList.contains('startup-pending1443'));
 assert(!errors.length,errors.join('\n'));
 await page.unroute('**/rest/v1/rpc/payroll_window14334');
 await page.evaluate(()=>localFirst14333.saveWork('employees',{name:'Startup queued worker'},null,{data:{name:'Startup queued worker'},version:1}));
 await page.reload();
 await page.waitForFunction(()=>localFirst14333.state().jobs.some(j=>j.row.data.name==='Startup queued worker'&&j.status==='synced'));
 assert.equal(f.fixture.deviceWrites,1,'startup synchronizes queued work once');
 console.log(JSON.stringify({result:'PASS persistent selection, compact children, cached journal refresh, unrelated dataset isolation',elapsed,info,requests:f.requests},null,2));
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
