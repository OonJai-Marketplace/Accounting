const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open('desktop','submitter');await login();await page.evaluate(()=>{openWorkspaceUser(liveProfile.id);personalJournal1437.show(liveProfile.id,'journal');showJournalEntry98();});
 await page.waitForFunction(()=>!startup14257.preparing&&!idleSync14341.running);
 await page.evaluate(()=>{
  window.refreshCalls244=0;window.updateCalls244=0;window.releaseRefresh244=null;window.originalRefresh244=idleSync14341.run;window.originalUpdate244=offline14239.checkForUpdates;window.originalOverview244=idleSync14341.overview;
  idleSync14341.run=()=>{refreshCalls244++;return new Promise(r=>releaseRefresh244=r)};offline14239.checkForUpdates=async()=>{updateCalls244++};idleSync14341.overview=()=>({pending:0});
  window.touch244=(type,target,x,y,count=1)=>{const touch={clientX:x,clientY:y},e=new Event(type,{bubbles:true,cancelable:true});Object.defineProperties(e,{touches:{value:type==='touchend'||type==='touchcancel'?[]:Array.from({length:count},()=>touch)},changedTouches:{value:[touch]}});target.dispatchEvent(e);return e.defaultPrevented};
  window.pull244=async(target=document.querySelector('.workspace-scroll'),dx=0,dy=120)=>{touch244('touchstart',target,200,120);touch244('touchmove',target,200+dx,120+dy);touch244('touchend',target,200+dx,120+dy);};
  document.querySelector('.workspace-scroll').scrollTop=0;
 });
 const amount=page.locator('#jeLinesBody .je-line-dr').first();await amount.fill('9876');await page.locator('#jeLinesBody .memo-link-text143187').first().fill('Keep unfinished entry');await page.evaluate(()=>document.activeElement.blur());
 // Ordinary scrolling to the top is not itself a refresh, nor are short/horizontal gestures.
 await page.evaluate(async()=>{const h=document.querySelector('.workspace-scroll'),spacer=document.createElement('div');spacer.style.height='2000px';h.append(spacer);h.scrollTo({top:100,behavior:'instant'});await pull244();spacer.remove();h.scrollTo({top:0,behavior:'instant'});await pull244(h,0,40);await pull244(h,140,20);});assert.equal(await page.evaluate(()=>refreshCalls244),0);
 await page.evaluate(()=>pull244(document.querySelector('#jeLinesBody .je-line-dr')));assert.equal(await page.evaluate(()=>refreshCalls244),0);
 await page.evaluate(()=>{const h=document.querySelector('.workspace-scroll');touch244('touchstart',h,200,100);touch244('touchmove',h,200,240,2);touch244('touchend',h,200,240);touch244('touchstart',h,200,100);touch244('touchmove',h,200,240);touch244('touchcancel',h,200,240)});assert.equal(await page.evaluate(()=>refreshCalls244),0);
 await page.evaluate(()=>{const h=document.querySelector('.workspace-scroll'),n=document.createElement('div');n.id='nested244';n.style='height:50px;overflow-y:auto';n.innerHTML='<div style="height:200px">Nested scroll area</div>';h.prepend(n);pull244(n);n.remove()});assert.equal(await page.evaluate(()=>refreshCalls244),0);
 await page.evaluate(()=>{const h=document.querySelector('.workspace-scroll');h.scrollTop=0;touch244('touchstart',h,200,100);touch244('touchmove',h,200,220)});assert.equal(await page.locator('#tabletRefresh143244 [data-copy]').innerText(),'Release to refresh');
 await page.evaluate(()=>touch244('touchend',document.querySelector('.workspace-scroll'),200,220));await page.waitForFunction(()=>refreshCalls244===1);assert.equal(await page.locator('#tabletRefresh143244 [data-copy]').innerText(),'Refreshing…');assert.equal(await page.evaluate(()=>updateCalls244),1);
 await page.evaluate(()=>pull244());assert.equal(await page.evaluate(()=>refreshCalls244),1,'in-flight refresh cannot repeat');await page.evaluate(()=>releaseRefresh244());await page.waitForFunction(()=>document.querySelector('#tabletRefresh143244 [data-copy]').textContent==='Refreshed');
 assert.equal(Number((await amount.inputValue()).replaceAll(',','')),9876);assert.equal(await page.locator('#jeLinesBody .memo-link-text143187').first().innerText(),'Keep unfinished entry');
 // Exercise the existing coordinator and fresh database reads with the unfinished form intact.
 const reads=f.requests.length;await page.evaluate(()=>{idleSync14341.run=originalRefresh244;idleSync14341.overview=originalOverview244;pull244()});
 await page.waitForFunction(()=>!document.querySelector('#tabletRefresh143244 [data-spin]')||document.querySelector('#tabletRefresh143244 [data-spin]').hidden,{},{timeout:60000});
 console.log('Coordinator result:',await page.locator('#tabletRefresh143244 [data-copy]').innerText());assert.match(await page.locator('#tabletRefresh143244 [data-copy]').innerText(),/^Refreshed/);assert(f.requests.length>reads,'real refresh must read fresh data');
 assert.equal(Number((await page.locator('#jeLinesBody .je-line-dr').first().inputValue()).replaceAll(',','')),9876);assert.equal(await page.locator('#jeLinesBody .memo-link-text143187').first().innerText(),'Keep unfinished entry');
 await page.screenshot({path:'/workspace/scratch/68e847ad27bd/ipad-refresh143244.png'});
 await page.evaluate(()=>{idleSync14341.run=()=>{refreshCalls244++;return new Promise(r=>releaseRefresh244=r)};idleSync14341.overview=()=>({pending:0});});
 await page.context().setOffline(true);await page.evaluate(()=>pull244());assert.match(await page.locator('#tabletRefresh143244 [data-copy]').innerText(),/Offline/);assert.equal(await page.evaluate(()=>refreshCalls244),1);await page.context().setOffline(false);
 // A changed account never receives the previous account's completion message.
 await page.evaluate(()=>{pull244();});await page.waitForFunction(()=>refreshCalls244===2);await page.evaluate(()=>{window.savedActor244=liveProfile.id;liveProfile.id='different-account';releaseRefresh244()});await page.waitForFunction(()=>document.querySelector('#tabletRefresh143244').hidden);await page.evaluate(()=>liveProfile.id=savedActor244);
 console.log('PASS tablet top-only pull, threshold/direction, excluded editors/nested scrolling, pinch/cancel, progress, duplicate prevention, offline, retained draft and account isolation');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
