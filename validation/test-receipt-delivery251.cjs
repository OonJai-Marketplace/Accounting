// User-facing phone entry and PDF delivery; all account and share calls are isolated.
const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open('phone','admin'),errors=[],previews=[];let issues=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/rest/v1/rpc/receipt_preview245',async r=>{const p=r.request().postDataJSON();previews.push(p);if(p.p_date==='2026-10-03')await new Promise(resolve=>setTimeout(resolve,120));await r.fulfill({json:['OJM'+p.p_date.slice(2,4)+'-A'+p.p_date.slice(5,7)+'02']});});
 await page.route('**/rest/v1/rpc/receipt_layout245',r=>r.fulfill({json:{}}));
 await page.route('**/rest/v1/rpc/voucher_issue14299',r=>{issues++;return r.fulfill({status:500,json:{message:'No issuing expected in this test'}})});
 await login();await page.locator('#avatar').click();await page.locator('#issueReceipt245').click();
 const form=page.locator('.receipt-phone245'),available=form.locator('[data-available]');
 await available.filter({hasText:'Available receipt ID: OJM'}).waitFor();assert.equal(await form.locator('[name=date]').inputValue(),'');assert.equal(await form.locator('[name=currency]').inputValue(),'');assert.equal(await form.locator('[name=paymentMethod]').inputValue(),'');assert.equal(await form.locator('[name=words]').inputValue(),'');assert(await form.locator('[data-preview-area]').isHidden());assert.equal(issues,0);
 await form.locator('[name=date]').fill('2026-10-03');await form.locator('[name=date]').dispatchEvent('change');await form.locator('[name=date]').fill('2026-12-03');await form.locator('[name=date]').dispatchEvent('change');await available.filter({hasText:'OJM26-A1202'}).waitFor();await page.waitForTimeout(180);assert.match(await available.innerText(),/OJM26-A1202/);assert.equal(issues,0);
 await form.locator('[data-row="0"][data-key=amount]').pressSequentially('100000000.25');assert.equal(await form.locator('[data-row="0"][data-key=amount]').inputValue(),'100,000,000.25');assert.match(await form.locator('[name=words]').inputValue(),/^One hundred million/);
 console.log('PASS independent phone admin menu: ID visible before Preview, blank defaults, date-change race protection, live commas and no ID allocation');
 await page.evaluate(()=>{
  window.__shares251=[];window.__file251=new File(['%PDF-1.4\nfixture'], 'OJM26-A1202.pdf',{type:'application/pdf'});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{__shares251.push(data.files[0].name)}});
  const b=document.createElement('button');b.id='shareTest251';b.textContent='Share test';b.onclick=()=>Receipt245.release(__file251,()=>{},'share');document.querySelector('.receipt-phone245').append(b);
 });
 await page.locator('#shareTest251').click();assert.deepEqual(await page.evaluate(()=>__shares251),['OJM26-A1202.pdf']);assert.equal(await page.locator('.receipt-delivery245').count(),0);
 await page.evaluate(()=>{Object.defineProperty(navigator,'userActivation',{configurable:true,value:{isActive:false}});Receipt245.release(__file251,()=>{},'share')});await page.locator('.receipt-delivery245 [data-share]').click();assert.equal(await page.evaluate(()=>__shares251.length),2);await page.locator('.receipt-delivery245 [data-close]').click();await page.locator('.receipt-delivery245').waitFor({state:'detached'});
 await page.evaluate(()=>{window.ReceiptNative214={sharePDF:async file=>__shares251.push('native:'+file.name)};Receipt245.release(__file251,()=>{},'share')});assert.equal(await page.evaluate(()=>__shares251.at(-1)),'native:OJM26-A1202.pdf');assert.equal(await page.locator('.receipt-delivery245').count(),0);
 assert.equal(await page.evaluate(()=>{try{Receipt245.release(__file251,()=>{throw Error('Account changed')},'share')}catch{return true}return false}),true);assert.equal(await page.evaluate(()=>__shares251.length),3);
 console.log('PASS direct web/native Share, browser tap fallback and account-change protection; no actual messages sent');
 for(const newer of [false,true]){
  await page.evaluate(async newer=>{
   ReceiptPhone245.close();const fields={mode:'typed',count:'1',date:'2026-12-03',currency:'LAK',paymentMethod:'Cash',party:'Saved payer',rows:[{description:'Saved receipt',amount:'100'}]};
   window.__recovery251={draft:structuredClone(fields),pending:{p_kind:'E',p_request_key:'saved-request',p_data:{typedFields245:fields}},issues:[]};if(newer)__recovery251.draft.party='New unfinished payer';
   await ReceiptPhone245.open({check:()=>{},today:()=> '2026-12-03',getDraft:async()=>__recovery251.draft,saveDraft:async d=>__recovery251.draft=d,getPending:async()=>__recovery251.pending,savePending:async p=>__recovery251.pending=p,list:async()=>[],get:async()=>null,rpc:async(name,args)=>{if(name==='receipt_layout245')return {};if(name==='receipt_preview245')return ['OJM26-A1203'];if(name==='voucher_issue14299'){__recovery251.issues.push(args.p_request_key);return [{number:'OJM26-A1202'}]}throw Error(name)}});
  },newer);
  assert.equal(await form.locator('[name=party]').inputValue(),newer?'New unfinished payer':'');assert.equal(await form.locator('[name=date]').inputValue(),newer?'2026-12-03':'');assert.equal(await page.evaluate(()=>__recovery251.pending),null);assert.deepEqual(await page.evaluate(()=>__recovery251.issues),['saved-request']);assert.equal(await page.evaluate(()=>__recovery251.draft===null),!newer);
 }
 console.log('PASS recovered issued receipt clears only its matching draft; newer unfinished details are preserved');
 assert.deepEqual(errors,[]);
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
