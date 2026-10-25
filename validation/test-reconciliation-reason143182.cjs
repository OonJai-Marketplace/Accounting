/* Required reconciliation notes stay visible even with supporting details closed. */
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.message));await login();await page.waitForFunction(()=>!idleSync14341.running);
 await page.evaluate(()=>{document.getElementById('status118')?.remove();currentReport71={id:'reason-fixture',owner:liveProfile.id,status:'draft',account:{code:'1001',name:'Bank LAK'},currency:'LAK',from:'2026-09-01',to:'2026-09-30',dateBasis:'receipt',opening:0,debit:10000,credit:0,closing:10000,lines:[],statement:'',statementReference:'',reviewer:'',preparedBy:'Fixture',createdAt:'2026-10-01',snapshotAt:'2026-10-01',findings:[],attachments:[],notes:''};renderReport71()});
 const reason=page.locator('[data-bank-reason14346]'),input=reason.locator('textarea');
 assert(await reason.isHidden());assert.equal(await page.locator('[data-rec-documents][open]').count(),0);
 await page.locator('#recStatement71').fill('90');assert(await reason.isVisible(),'A required explanation must be visible beside the comparison');assert(await input.evaluate(n=>n.required));assert.equal(await page.locator('[data-rec-documents][open]').count(),0);
 assert.match(await page.evaluate(()=>{try{validateReport71(currentReport71,false);return ''}catch(e){return e.message}}),/Explain the reconciliation difference/);
 await input.fill('Deposit is still outstanding');assert.equal(await page.evaluate(()=>currentReport71.notes),'Deposit is still outstanding');
 assert.equal(await page.evaluate(()=>{try{validateReport71(currentReport71,false);return true}catch{return false}}),true);
 await page.locator('#recStatement71').fill('100');assert(await reason.isVisible(),'Existing notes remain available after the difference clears');assert.equal(await input.evaluate(n=>n.required),false);
 await input.fill('');assert(await reason.isHidden());
 await page.locator('#recStatement71').fill('90');await input.fill('Retained review note');
 await page.setViewportSize({width:390,height:844});assert(await reason.isVisible());assert(await input.evaluate(n=>n.getBoundingClientRect().right<=innerWidth));
 await page.evaluate(()=>{currentReport71.status='reconciled';renderReport71()});assert(await reason.isVisible());assert(await input.isDisabled());
 assert.deepEqual(errors,[]);assert.equal(f.fixture.deviceWrites||0,0);
 console.log('PASS reconciliation differences expose required notes; zero differences hide blank notes, retain existing notes, and preserve read-only snapshots and narrow layout');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
