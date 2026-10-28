const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,context,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const track=()=>{window.__stages=[];const start=()=>new MutationObserver(()=>{const t=document.querySelector('#startup1443 p')?.textContent;if(t?.startsWith('Refreshing ')&&t!==__stages.at(-1))__stages.push(t)}).observe(document.body,{childList:true,subtree:true,characterData:true});if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});};await page.addInitScript(track);await page.evaluate(track);
 await login();await page.waitForFunction(()=>!document.body.classList.contains('startup-pending1443')&&!idleSync14341.running);
 const stages=await page.evaluate(()=>__stages.map(t=>Number(t.match(/(\d) \/ 6/)[1])));assert.deepEqual(stages,[1,2,3,4,5,6]);assert.equal(await page.evaluate(()=>idleSync14341.session.trigger),'login');
 console.log('PASS login completes six ordered database refresh stages before dismissing preparation');
 // Search must render local navigation even if unrelated remote modules never load.
 await page.evaluate(()=>{window.__oldLoadWork=loadWork82;loadWork82=()=>new Promise(()=>{});Work82.loaded=false;});
 const search=page.getByRole('searchbox',{name:'Search entire system'});await search.focus();await search.fill('update');
 const result=page.locator('.universal-search108 button').filter({hasText:'Website Update'});await result.waitFor({state:'visible',timeout:2000});await result.click();
 assert(await page.locator('[data-website-update143104]').isVisible());
 await search.fill('currency');await page.locator('.universal-search108 button').filter({hasText:'Currency Manager'}).first().click();assert(await page.locator('#settingsSection143176-currency').isVisible());
 await page.evaluate(()=>{loadWork82=__oldLoadWork;Work82.loaded=true;});console.log('PASS Update and Currency search open the correct Settings sections without waiting for unrelated reads');
 // Warm a reference cache, then a slow server causes only a browsing fallback.
 await page.evaluate(()=>loadReferenceDataFromSupabase());let writes=0,slow=true;
 await page.route(url=>url.pathname==='/rest/v1/accounts',async route=>{
  if(route.request().method()==='POST'){writes++;const data=route.request().postDataJSON();f.fixture.tables.accounts.push({...data,id:'00000000-0000-4000-8000-000000000188',is_active:true});return route.fulfill({status:201,contentType:'application/json',body:'[]'});}
  if(slow)await new Promise(r=>setTimeout(r,2400));return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(f.fixture.tables.accounts)});
 });
 await page.evaluate(()=>loadReferenceDataFromSupabase());assert.equal(await page.evaluate(()=>offline14239.offline()),false,'slow cached browsing must not mark a working connection offline');
 await page.evaluate(async()=>{offline14239.connectionIssue('Earlier network interruption');openAddAccountModal();const group=document.getElementById('newAccountGroup143180');if(group)group.disabled=true;document.getElementById('formAccount').dataset.group143180='';for(const [id,value]of Object.entries({accCode:'1188',accName:'Fixture Parent',accCurrency:'__PARENT__',accType:'ASSET',accPurpose71:'regular'}))document.getElementById(id).value=value;await handleAccountFormSubmit({preventDefault(){}});syncSubAccountParentDropdown();});
 assert.equal(writes,1,'explicit Save must attempt the database after a stale offline flag');
 assert.equal(await page.locator('#subParentCode option[value="1188"]').count(),1,'confirmed slow reference read includes new parent immediately');
 assert.equal(await page.evaluate(()=>AccountingStore.accounts.find(a=>a.code==='1188').isPosting),false);
 slow=false;await context.setOffline(true);await page.evaluate(()=>loadReferenceDataFromSupabase());assert.equal(await page.evaluate(()=>AccountingStore.accounts.some(a=>a.code==='1188')),true,'confirmed reads replace offline browsing copy');await context.setOffline(false);
 await page.waitForFunction(()=>!idleSync14341.running);
 console.log('PASS slow cached browsing, stale connection recovery, one parent save, immediate sub-account availability, and updated offline copy');
 // Direct posting attempts immediately and reports only a validated database receipt.
 let posts=0;const receipts=new Map();
 await page.route('**/rest/v1/rpc/post_manual_journal14228',async route=>{const p=route.request().postDataJSON();posts++;let r=receipts.get(p.p_request_key);if(!r){r=[{entry_id:'00000000-0000-4000-9000-'+String(receipts.size+188).padStart(12,'0'),entry_no:'TEST-'+(receipts.size+188)}];receipts.set(p.p_request_key,r);}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(r)});});
 const prepare=()=>page.evaluate(()=>{clearJournalEntry();switchTab('journal');entry1430.restore('double',[]);AccountingStore.accounts=[{id:'00000000-0000-4000-8000-000000000103',code:'103',name:'LAK cash',currency:'LAK',type:'ASSET',isPosting:true},{id:'00000000-0000-4000-8000-000000000104',code:'104',name:'LAK offset',currency:'LAK',type:'SYSTEM',isPosting:true}];document.getElementById('jeTransDate').value=new Date().getFullYear()+'-10-15';document.getElementById('jeGeneralMemo').value='Immediate database fixture';document.getElementById('jeLinesBody').replaceChildren();addJournalLineRow('103 — LAK cash','Receipt',10,{});addJournalLineRow('104 — LAK offset','Offset','',{LAK:10});});
 await prepare();await page.evaluate(async()=>{window.__messages188=[];const original=showCenterStatus;window.showCenterStatus=(...a)=>{__messages188.push(a[0]);return original(...a)};offline14239.connectionIssue('Previous read failed');await submitJournalEntry();});
 assert.equal(posts,1);assert(await page.evaluate(()=>__messages188.some(t=>t.startsWith('Journal saved to the database · TEST-188'))));
 assert.equal(await page.evaluate(()=>idleSync14341.overview().pending),0,'confirmed records awaiting view refresh are not unsent uploads');
 await context.setOffline(true);await prepare();await page.evaluate(()=>submitJournalEntry());assert.equal(posts,1);assert.equal(await page.evaluate(()=>journalDurable14385.pending().filter(j=>j.status!=='saved').length),1);
 // Reload with a retained request and an online connection must upload without waiting for idle.
 await context.setOffline(false);await page.reload();await page.waitForFunction(()=>startup14257?.prepared&&!document.body.classList.contains('startup-pending1443')&&!idleSync14341.running);
 assert.equal(receipts.size,2);assert.equal(await page.evaluate(()=>journalDurable14385.pending().filter(j=>j.status!=='saved').length),0);
 await page.evaluate(()=>{offline14239.connectionIssue('Previous slow read');offline14239.open();});assert.equal(await page.locator('#syncSummary143162 [data-action=sync]').isDisabled(),false);await page.locator('#syncSummary143162 [data-action=sync]').click();await page.waitForFunction(()=>!idleSync14341.running);assert.equal(await page.evaluate(()=>idleSync14341.overview().pending),0);
 console.log('PASS immediate online journal receipt, offline retention, reload upload, accurate confirmed counts and manual retry after stale connection');
 const partial=await page.evaluate(async()=>{const previous=AIInboxSync143173;window.AIInboxSync143173={check:async()=>{},state:{error:'Google authorization expired — reconnect'}};try{await idleSync14341.run(false);return idleSync14341.overview()}finally{window.AIInboxSync143173=previous}});
 assert.match(partial.problem,/Google authorization expired/);assert.equal(partial.session.refreshAreas.inboxes,'failed');assert.equal(partial.session.refreshAreas.reference,'updated');assert.match(partial.session.result,/needs attention/);assert(f.fixture.inboxChecks>0);
 console.log('PASS all-area refresh includes AI inboxes, preserves completed database steps and exposes a failed Google connection');
 assert.deepEqual(errors,[]);
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
