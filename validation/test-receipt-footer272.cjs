const assert=require('node:assert/strict'),fs=require('node:fs'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 f.fixture.tables.voucher_settings14299=[{id:1,prefix:'OJM',handwritten_code:'H',editor_code:'E',digits:4}];f.fixture.tables.vouchers14299=[];f.fixture.tables.voucher_sequences14299=[];
 await page.route('**/rest/v1/rpc/receipt_preview245',r=>r.fulfill({json:['OJM26-A1103']}));
 await page.route('**/rest/v1/rpc/receipt_layout245',r=>r.fulfill({json:{}}));
 await login();await page.evaluate(()=>{ui108.confirm=async()=>true;const modal=ui108.modal.bind(ui108);ui108.modal=(t,...args)=>t==='Open in Document Editor'?Promise.resolve('new'):modal(t,...args)});
 await page.evaluate(async()=>{const img=async kind=>'data:image/png;base64,'+await Receipt245.base64(await(await fetch('assets/payroll-voucher-'+kind+'1424.png')).blob());PrintSettings.headerImage=await img('header');PrintSettings.footerImage=await img('footer');await vouchers14299.createReceipt()});
 const frame=()=>page.frameLocator('#document-editor105 iframe');
 await frame().locator('tbody tr').first().waitFor();
 assert.equal(await frame().locator('thead th').nth(1).innerText(),'Quantity');
 await frame().locator('[data-receipt-choice249="currency:LAK"]').click();
 await frame().locator('tbody tr').first().locator('td').nth(2).fill('200000');
 await frame().locator('[data-receipt-field245="receiver"]').click();await page.keyboard.type('Santos Cabbigat');
 await page.waitForFunction(()=>document.querySelector('#docFrame105').contentDocument.querySelector('[data-receipt-field245="receiver"]').textContent.includes('Santos Cabbigat'));
 assert.equal(await frame().locator('[data-receipt-field245="amount-heading"]').innerText(),'Amount (LAK)');
 assert.equal(await frame().locator('[data-voucher-total14298]').innerText(),'200,000');
 assert.equal(await frame().locator('tfoot td').last().innerText(),'LAK 200,000');
 assert.equal(await frame().locator('tbody tr').first().locator('td').nth(2).innerText(),'200,000');
 const name=await frame().locator('[data-receipt-field245="receiver"]').evaluate(n=>({text:n.textContent,line:getComputedStyle(n).borderBottomStyle,bottom:n.getBoundingClientRect().bottom,label:n.nextElementSibling.getBoundingClientRect().top}));assert.equal(name.line,'solid');assert(name.label>=name.bottom-1);
 await frame().locator('[data-voucher-date14299]').dblclick();const picker=frame().locator('input[type=date]');await picker.fill('2026-11-04');
 assert.equal(await frame().locator('[data-voucher-date14299]').evaluate(n=>getComputedStyle(n).borderBottomStyle),'solid');
 await frame().locator('[data-voucher-date14299]').dblclick();await frame().locator('input[type=date]').fill('2026-11-05');
 assert.equal(await frame().locator('[data-voucher-date14299]').evaluate(n=>getComputedStyle(n).borderBottomStyle),'solid');
 // Currency changes update the heading, numeric rows and separate total prefix without changing the amount.
 await frame().locator('[data-receipt-choice249="currency:USD"]').click();assert.equal(await frame().locator('tbody tr').first().locator('td').nth(2).innerText(),'200,000.00');assert.equal(await frame().locator('tfoot td').last().innerText(),'USD 200,000.00');
 await frame().locator('[data-receipt-choice249="currency:LAK"]').click();
 await page.evaluate(()=>{void documentWorkspace105.action('page-setup')});
 const position=page.locator('.page-setup1427 [data-doc-setting="footerPosition"]'),placement=page.locator('.page-setup1427 [data-doc-setting="footerPlacement"]');
 assert.equal(await position.inputValue(),'bottom');
 const bottomY=await frame().locator('.page-footer').evaluate(n=>n.getBoundingClientRect().top);
 await position.selectOption('after-content');
 await page.waitForFunction(()=>document.querySelector('#docFrame105').contentDocument.querySelector('.page-footer').style.top.endsWith('mm'));
 const inlineY=await frame().locator('.page-footer').evaluate(n=>n.getBoundingClientRect().top);assert(inlineY<bottomY-20);
 assert.equal(await frame().locator('.page').count(),1);
 
 await page.evaluate(()=>documentWorkspace105.flush());assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.footerPosition),'after-content');
 await page.locator('.page-setup1427').getByRole('button',{name:'Done',exact:true}).click();
 await page.evaluate(()=>status118.clear());const receiptPreview=await f.browser.newPage({viewport:{width:900,height:1200}});await receiptPreview.setContent(await page.frames().find(x=>x.url()==='about:srcdoc').content());await receiptPreview.emulateMedia({media:'print'});await receiptPreview.locator('.page').screenshot({path:'/tmp/receipt-footer271.png'});await receiptPreview.pdf({path:'/tmp/receipt-footer271.pdf',preferCSSPageSize:true,printBackground:true});await receiptPreview.close();
 // Dialog controls stay in sync and do not turn a disabled footer on.
 await page.evaluate(()=>documentWorkspace105.action('images109'));
 const dialog=page.locator('.doc-images-dialog112');await dialog.locator('[data-doc-setting="footerPlacement"]').selectOption('none');await dialog.locator('[data-doc-setting="footerPosition"]').selectOption('bottom');assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.applyFooter),false);await dialog.locator('[data-doc-setting="footerPlacement"]').selectOption('last');await dialog.locator('[data-doc-setting="footerPosition"]').selectOption('after-content');await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await dialog.waitFor({state:'detached'});
 await page.evaluate(()=>{void documentWorkspace105.action('page-setup')});assert.equal(await position.inputValue(),'after-content');await page.locator('.page-setup1427').getByRole('button',{name:'Done',exact:true}).click();
 console.log('PASS quantity/currency/number formatting, editable name above line, date underline after repeated date selection, receipt stays one page, footer controls synchronized');
 // Full editor: mixed content, deliberate page break, table, typing and print.
 await page.evaluate(async()=>{const footer=documentWorkspace105.model.settings.footerImage;await documentWorkspace105.newTab({title:'Footer placement verification',html:'<p>Page one text</p><p data-page-break="1"><br></p><p>Page two text</p><table><tbody><tr><td>Final table row</td><td>42</td></tr></tbody></table><p><br></p>',settings:{paper:'A4',applyHeader:false,applyFooter:true,footerPlacement:'all',footerPosition:'after-content',footerImage:footer,pageNumbers:true,size:10}})});
 await frame().locator('.page').nth(1).waitFor();
 const geometry=()=>frame().locator('.page').evaluateAll(pages=>pages.map(p=>{const m=p.querySelector('main'),f=p.querySelector('footer'),table=m.querySelector('table'),last=table||m.querySelector('p');return{visible:getComputedStyle(f).visibility,top:f.getBoundingClientRect().top,last:last.getBoundingClientRect().bottom,bottom:f.getBoundingClientRect().bottom,pageBottom:p.getBoundingClientRect().bottom}}));
 let dims=await geometry();assert.equal(dims.length,2);assert(dims.every(g=>g.visible==='visible'&&g.top>=g.last&&g.bottom<g.pageBottom));
 const before=await frame().locator('.page-footer').nth(1).evaluate(n=>parseFloat(n.style.top));await frame().locator('.page').nth(1).locator('td').first().evaluate(n=>{n.textContent='Final table row that grows. '.repeat(20);n.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}))});
 await page.waitForFunction(y=>parseFloat(document.querySelector('#docFrame105').contentDocument.querySelectorAll('.page-footer')[1].style.top)>y+5,before);
 dims=await geometry();assert(dims.every(g=>g.top>=g.last&&g.bottom<g.pageBottom));
 await page.evaluate(()=>{void documentWorkspace105.action('page-setup')});await placement.selectOption('last');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#docFrame105').contentDocument.querySelector('.page-footer')).visibility==='hidden');dims=await geometry();assert.equal(dims[1].visible,'visible');
 await position.selectOption('bottom');await page.waitForFunction(()=>!document.querySelector('#docFrame105').contentDocument.querySelectorAll('.page-footer')[1].style.top);dims=await geometry();assert(dims[1].top>dims[1].last+100);
 await position.selectOption('after-content');await page.waitForFunction(()=>document.querySelector('#docFrame105').contentDocument.querySelectorAll('.page-footer')[1].style.top.endsWith('mm'));
 await page.locator('.page-setup1427').getByRole('button',{name:'Done',exact:true}).click();
 const html=await page.frames().find(x=>x.url()==='about:srcdoc').content();const print=await f.browser.newPage();await print.setContent(html);await print.emulateMedia({media:'print'});const printed=await print.locator('.page').evaluateAll(pages=>pages.map(p=>{const f=p.querySelector('footer'),m=p.querySelector('main');return{visible:getComputedStyle(f).visibility,top:f.getBoundingClientRect().top,last:(m.querySelector('table')||m.querySelector('p')).getBoundingClientRect().bottom,bottom:f.getBoundingClientRect().bottom,pageBottom:p.getBoundingClientRect().bottom}}));assert(printed.filter(p=>p.visible==='visible').every(p=>p.top>=p.last&&p.bottom<p.pageBottom));await print.pdf({path:'/tmp/footer-placement271.pdf',preferCSSPageSize:true,printBackground:true});await print.close();
 // Pagination reserves the footer space even when content needs several pages.
 await page.evaluate(async()=>{const settings=documentWorkspace105.model.settings;await documentWorkspace105.newTab({title:'Long footer verification',html:'<table><thead><tr><th>Item</th></tr></thead><tbody>'+Array.from({length:110},(_,i)=>'<tr><td>Item '+(i+1)+'</td></tr>').join('')+'</tbody></table>',settings:{...settings,footerPlacement:'all',footerPosition:'after-content'}})});
 await page.waitForFunction(()=>document.querySelector('#docFrame105').contentDocument.querySelectorAll('.page').length>2);const rows=await frame().locator('tbody tr').count();assert.equal(rows,110);dims=await geometry();assert(dims.every(g=>g.top>=g.last-1&&g.bottom<g.pageBottom));
 await page.evaluate(()=>documentWorkspace105.flush());const state=await page.evaluate(()=>({id:documentWorkspace105.tabs.find(t=>t.active).id,settings:documentWorkspace105.model.settings}));await page.reload();try{await page.waitForFunction(()=>window.startup14257?.prepared&&liveProfile,null,{timeout:5000})}catch{const notice=page.locator('#loginNotification14293[open]');if(await notice.count())await notice.getByRole('button',{name:'Close',exact:true}).click();await login()}await page.evaluate(()=>openDocumentEditor105());await page.waitForFunction(id=>documentWorkspace105.tabs.some(t=>t.id===id),state.id);await page.evaluate(id=>documentWorkspace105.activateTab(id),state.id);assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.footerPosition),'after-content');
 assert.equal(await page.locator('#appSidebar #syncStatus14341').count(),0);assert.deepEqual(errors,[]);console.log('PASS footer per-page/last-page/bottom modes, content growth, print geometry, table pagination and saved draft restoration; no browser errors');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
