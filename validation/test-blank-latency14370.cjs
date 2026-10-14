// Real sidebar click timing on a local fixture. Paint opportunities are estimates,
// not a measurement of the physical display or the user's production device.
const assert=require('node:assert/strict'),fs=require('node:fs'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const fixture=await create();try{
 const {page,context,login}=await fixture.open();await login();await page.waitForFunction(()=>offline14239.state().shellReady);
 const session=await context.newCDPSession(page);await session.send('Emulation.setCPUThrottlingRate',{rate:Number(process.env.PHASE0_CPU||1)});
 await page.evaluate(()=>{window.blankMeasurements14370=[];document.addEventListener('click',event=>{if(!event.isTrusted||!event.target.closest('#nav-experiment-Blank .nav-header'))return;const start=performance.now(),row={inputDelayMs:start-event.timeStamp};blankMeasurements14370.push(row);document.addEventListener('click',()=>{row.handlerMs=performance.now()-start;row.active=document.querySelector('.tab-content.active')?.id;row.pending=document.body.classList.contains('startup-pending1443')},{once:true});requestAnimationFrame(()=>requestAnimationFrame(()=>{row.paintOpportunityMs=performance.now()-start;row.finished=true}))},true)});
 const measurements=[],profiles=[];if(process.env.PHASE0_PROFILE)await session.send('Profiler.enable');
 for(const offline of [false,true]){await context.setOffline(offline);for(let repeat=0;repeat<5;repeat++){
  await page.locator('#nav-experiment-Journal .nav-header').click();await page.waitForFunction(()=>document.querySelector('.tab-content.active')?.id==='journal');
  const requests=fixture.requests.length,count=await page.evaluate(()=>blankMeasurements14370.length);if(process.env.PHASE0_PROFILE)await session.send('Profiler.start');await page.locator('#nav-experiment-Blank .nav-header').click();await page.waitForFunction(count=>blankMeasurements14370.length>count&&blankMeasurements14370.at(-1).finished,count);
  if(process.env.PHASE0_PROFILE)profiles.push((await session.send('Profiler.stop')).profile);const row=await page.evaluate(()=>blankMeasurements14370.at(-1));assert.equal(row.active,'navigation-blank14366');assert.equal(row.pending,false);measurements.push({offline,repeat,...row,requests:fixture.requests.slice(requests)});
 }}
 if(profiles.length)fs.writeFileSync('/tmp/blank-profile14370.json',JSON.stringify(profiles));const result={cpuSlowdown:Number(process.env.PHASE0_CPU||1),scope:'Local empty-accounting fixture; real trusted sidebar clicks; two animation frames estimate paint opportunity',measurements};fs.writeFileSync(process.env.PHASE0_RESULTS||'/tmp/blank-latency14370.json',JSON.stringify(result,null,2)+'\n');
 for(const offline of [false,true]){const rows=measurements.filter(x=>x.offline===offline),median=key=>rows.map(x=>x[key]).sort((a,b)=>a-b)[2];console.log(JSON.stringify({offline,handlerMedianMs:median('handlerMs'),paintOpportunityMedianMs:median('paintOpportunityMs'),requests:rows.reduce((n,r)=>n+r.requests.length,0)}))}
 console.log('PASS blank route activates within the click task without a preparation gate, online and offline');
}finally{await fixture.close()}})().catch(e=>{console.error(e);process.exitCode=1});
