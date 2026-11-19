const assert=require('node:assert/strict');
const createFixture=require('./phase0-browser-fixture.cjs');

(async()=>{
 const fixture=await createFixture();
 try{
  const {page,login}=await fixture.open();
  const row={name:'OJM260001-OJM260024.pdf',folder:'November 2026',pages:24,target:{first:'OJM260001',last:'OJM260024',expected:24}};
  const active={folderURL:'https://drive.google.com/drive/folders/Folder123456789',name:'Journal receipts',email:'receipts@example.test',connectionKey:'fixture'};
  await page.route('**/rest/v1/budget_settings14313*',r=>r.fulfill({json:{id:true,version:4,data:{googleSheets143129:{accountEmail228:active.email,receiptDrive228:{folderURL:active.folderURL,active}}}}}));
  const offsets=[];
  await page.route('**/functions/v1/receipt-drive-preview',r=>{
   const {action,offset}=r.request().postDataJSON();
   if(action==='login')return r.fulfill({json:{checking:false,linking:false}});
   assert.equal(action,offset?'preview':'check');offsets.push(offset);
   return r.fulfill({json:{files:offset?[{...row,name:'OJM260040-part02.pdf',target:{first:'OJM260040',part:2}}]:[row],more:!offset,state:{last_complete:'2026-11-19T03:00:00Z'}}});
  });
  await login();
  await page.waitForFunction(()=>startup14257.interactive);
  await page.evaluate(()=>{window.offline14239.offline=()=>false;Object.defineProperty(window,'sessionCache14333',{value:{...window.sessionCache14333,localMode:false},configurable:true});switchTab('settings-accounting');settingsGroups14332.chooseAccounting('google');});
  const openButton=page.locator('#googleSheets143129 [data-receipt-preview]');
  await openButton.waitFor({state:'visible'});
  assert.equal(offsets.length,0,'opening settings does not scan Drive');
  await page.getByRole('button',{name:'Check Drive receipts'}).click();
  await page.getByText('24 pages. Page 1 goes to OJM260001. Page 24 goes to OJM260024.').waitFor();
  const tablet=process.env.PHASE0_DEVICE==='tablet';
  await page.setViewportSize(tablet?{width:768,height:1024}:{width:390,height:844});
  if(!tablet) await page.waitForFunction(()=>!settingsStack143176.enabled());
  await page.getByLabel('PDF page').fill('25');
  await page.getByText('Enter a page from 1 to 24.').waitFor();
  await page.getByLabel('PDF page').fill('12');
  await page.getByText('→ OJM260012').waitFor();
  await page.getByRole('button',{name:'Next files'}).click();
  await page.getByText('24 pages for OJM260040 · Part 2.').waitFor();
  assert.deepEqual(offsets,[0,25]);
  console.log('PASS admin preview, page lookup and pagination at '+(tablet?'tablet':'narrow desktop')+' width');
 } finally {await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
