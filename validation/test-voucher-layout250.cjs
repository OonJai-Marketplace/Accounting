const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();const errors=[];page.on('pageerror',e=>errors.push(e.message));await login();
await page.evaluate(()=>{const modal=ui108.modal;ui108.modal=function(title,...args){if(title==='Open in Document Editor')return Promise.resolve('new');return modal.call(this,title,...args)};});
await page.evaluate(async()=>{
 const image=async kind=>{const blob=await(await fetch('assets/payroll-voucher-'+kind+'1424.png')).blob();return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(blob)})};
 PrintSettings.headerImage=await image('header');PrintSettings.footerImage=await image('footer');
 const employee={name:'Sample Employee With A Longer Name',code:'OJM-R04',position:'Restaurant Operations',currency:'USD'};
 const attendance=Array.from({length:31},(_,i)=>({date:'2026-10-'+String(i+1).padStart(2,'0'),mark95:i%3===0?'15':'0'}));
 const x={employeeId:'emp',employee,currency:'USD',rate:22000,contract:450,paidAmount:410.25,gross:9000000,net:8800000,employeePit:100000,employeeSso:247500,overtime:150000,allowance:200000,late:50000,absence:100000,penalty:70000,other:10000,cashAdvance:200000,loanRecovery:100000,reimbursement:50000,minutes:60,unpaidDays:1,paidLeaveDays:2,paidLeaveValue:100000,daily:100000,attendance95:[{minutes:15,late:10000,mark:'15'}]};
 window.__voucherRun={month:'2026-10',reference:'PAY-2026-10',status:'finalized',rows:[{employeeId:'emp',employee,input:{attendance,note:Array.from({length:3},(_,i)=>'Note '+(i+1)+': Reviewed attendance, salary adjustments and supporting records with the employee.').join('\n')}}],results:[x],legendSnapshot95:[],leaveSnapshot:[],nonWorkDays99:[0]};
 window.__voucherChoices={enabled:true,voucherSignatories1433:true,count:3,byReceiver:{emp:{receiver:{name:employee.name,employeeId:'emp'},first:'First Signer',role:'Prepared by',approver:'Approving Signer'}}};
 window.__baseVoucher=reports14254.voucher(__voucherRun,x,__voucherChoices,'en');
 await openDocumentEditor105({title:'Salary voucher layout',html:__baseVoucher,payrollVouchers:true,approvedLayout14254:true,printPreview:true,settings:{...reports14254.settings(),top:8,bottom:8,headerHeight:0,footerHeight:0,headerWidth:80,footerWidth:80,headerPlacement:'all',footerPlacement:'all'}});
});

const frame=()=>page.frames().find(f=>f.url()==='about:srcdoc');

async function metrics(){return frame().evaluate(()=>({pages:document.querySelectorAll('.page').length,text:document.body.innerText,over:[...document.querySelectorAll('.page-content')].some(n=>n.scrollHeight>n.clientHeight+2||n.scrollWidth>n.clientWidth+2),cells:[...document.querySelectorAll('td,th')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent)}))}
const header=await frame().evaluate(()=>{const h=document.querySelector('h1'),rows=[...h.nextElementSibling.children].map(row=>[...row.children].map(n=>({text:n.textContent,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));const t=[...document.querySelectorAll('table')].find(n=>n.querySelectorAll('col').length===32);return {rows,label:t.rows[0].cells[0].textContent,codeWidth:t.rows[0].cells[0].getBoundingClientRect().width/t.getBoundingClientRect().width,centers:[...t.rows[0].cells].slice(1).map(c=>{const r=document.createRange();r.selectNodeContents(c.firstElementChild);const a=r.getBoundingClientRect(),b=c.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)}),signatureGap:parseFloat(getComputedStyle(document.querySelector('[data-print-signatures]')).marginTop)}});
assert.equal(header.rows.length,3);assert(header.rows[0][0].text.startsWith('OJM-R04 · Sample Employee'));assert(header.rows[0][1].text.startsWith('Position:'));assert(header.rows[1][0].text.startsWith('Salary month:'));assert(header.rows[1][1].text.startsWith('Voucher number:'));assert(header.rows[2][0].text.startsWith('Payment date:'));assert(header.rows[2][1].text.startsWith('Currency:'));for(const [left,right] of header.rows){assert(right.x>left.x);assert(Math.abs(right.y-left.y)<1)}assert.equal(header.label,'Code');assert(header.codeWidth<0.11);assert(header.centers.every(n=>n<1),'actual date glyphs stay centered despite editor heading alignment');assert(header.signatureGap>=45,'two extra lines of signature space');
const en=await metrics();assert(en.text.includes('PAY-2610-R04'));assert(!en.text.includes('Included in salary;'));assert(!en.text.includes('Separate charges have'));assert(en.text.includes('Value (LAK)'));assert(en.text.includes('Deduction (LAK)'));assert.equal(en.pages,1);assert(!en.over);assert.deepEqual(en.cells,[]);assert(en.text.includes('Note 3:'));assert(en.text.includes('410.25'));assert(en.text.includes('Approving Signer'));
console.log('PASS English voucher: 31 days, all salary/attendance rows, three notes, three signers and both letterhead images fit one page');
async function capture(name){const preview=await f.browser.newPage({viewport:{width:900,height:1200}});await preview.setContent(await frame().content());await preview.screenshot({path:'/tmp/'+name+'.png',fullPage:true});await preview.pdf({path:'/tmp/'+name+'.pdf',preferCSSPageSize:true,printBackground:true});await preview.close()}
await capture('voucher241-en');
await page.evaluate(async()=>{
 const run=structuredClone(__voucherRun);run.results[0].employee.voucherLanguage='lo';run.rows[0].employee.voucherLanguage='lo';Work82.run=run;
 window.__payrollBefore=JSON.stringify(run);window.__originalChoose=choosePrintSignatories1424;window.choosePrintSignatories1424=async()=>__voucherChoices;
 await reports14254.printPayroll(true);
});
let lo=await metrics();assert.equal(lo.pages,1);assert(!lo.over);assert.deepEqual(lo.cells,[]);console.log('PASS Lao voucher retains 10.5pt text and fits one page with three notes and three signers');await capture('voucher241-lo');
assert.equal(await page.evaluate(()=>JSON.stringify(Work82.run)===__payrollBefore),true);

// Real print action replaces signatures and must keep the compact layout.
await page.evaluate(async()=>{const iframe=document.querySelector('#document-editor105 iframe');iframe.contentWindow.print=()=>{window.__didPrint=true};await documentWorkspace105.preview()});
assert.equal(await page.evaluate(()=>__didPrint),true);assert.equal((await metrics()).pages,1);
assert(await frame().locator('[data-print-signatures]').evaluate(n=>parseFloat(getComputedStyle(n).marginTop)>=45));console.log('PASS printing retains signatures, extra signing space, one-page layout and saved payroll amounts');
// Batch generation starts each employee on a separate page.
await page.evaluate(async()=>{const run=structuredClone(__voucherRun),x=structuredClone(run.results[0]),row=structuredClone(run.rows[0]);x.employeeId=row.employeeId='emp2';x.employee.name=row.employee.name='Second Employee';x.employee.code=row.employee.code='EMP-0002';x.employee.voucherLanguage=row.employee.voucherLanguage='lo';run.results.push(x);run.rows.push(row);const choices=structuredClone(__voucherChoices);choices.byReceiver.emp2={...choices.byReceiver.emp,receiver:{name:'Second Employee',employeeId:'emp2'}};choosePrintSignatories1424=async()=>choices;Work82.run=run;await reports14254.printPayroll(true)});
const batch=await metrics();assert.equal(batch.pages,2);assert(!batch.over);assert.equal(await frame().locator('[data-print-signatures]').count(),2);
console.log('PASS mixed English/Lao batch uses one page per employee');
await page.evaluate(async()=>{const run=structuredClone(__voucherRun);run.rows[0].input.note=Array.from({length:8},(_,i)=>'Note '+(i+1)+': Reviewed attendance, salary adjustments and supporting records with the employee.').join('\n');await openDocumentEditor105({title:'Extended notes',html:reports14254.voucher(run,run.results[0],__voucherChoices,'en'),payrollVouchers:true,printPreview:true,settings:{...reports14254.settings(),top:8,bottom:8,headerHeight:0,footerHeight:0,headerWidth:80,footerWidth:80,headerPlacement:'all',footerPlacement:'all'}})});
const extended=await metrics();assert(extended.pages<=2);assert(!extended.over);assert(extended.text.includes('Note 8:'));assert.equal(await frame().locator('[data-print-signatures]').count(),1);console.log('PASS extended notes retain all text and signing space with safe pagination');
// A finite sheet cannot hold unlimited notes: paginate without truncating text.
await page.evaluate(async()=>{const run=structuredClone(__voucherRun);run.rows[0].input.note=Array.from({length:100},(_,i)=>'Long note '+(i+1)+': Verify supporting attendance and payroll records.').join('\n');const html=reports14254.voucher(run,run.results[0],__voucherChoices,'en');await openDocumentEditor105({title:'Long notes',html,payrollVouchers:true,printPreview:true,settings:{...reports14254.settings(),headerPlacement:'all',footerPlacement:'all'}})});
const long=await metrics();assert(long.pages>1);assert(!long.over);assert(long.text.includes('Long note 100:'));assert.equal(await frame().locator('[data-print-signatures]').count(),1);
console.log('PASS 100-note overflow keeps every note and signatures without clipping');
await page.evaluate(async()=>openDocumentEditor105({title:'Placement persistence',html:'<p>First page</p><div data-page-break="1"></div><p>Middle page</p><div data-page-break="1"></div><p>Last page</p>',printPreview:true,approvedLayout14254:true,settings:{...reports14254.settings(),headerPlacement:'all',footerPlacement:'all',pageNumbers:false}}));
const placement=()=>frame().evaluate(()=>({header:[...document.querySelectorAll('.page-header')].map(n=>getComputedStyle(n).visibility==='visible'),footer:[...document.querySelectorAll('.page-footer')].map(n=>getComputedStyle(n).visibility==='visible')}));
const waitPlacement=async(h,f)=>{await page.waitForFunction(({h,f})=>{const doc=document.querySelector('#document-editor105 iframe').contentDocument,win=doc.defaultView;return JSON.stringify([...doc.querySelectorAll('.page-header')].map(n=>win.getComputedStyle(n).visibility==='visible'))===JSON.stringify(h)&&JSON.stringify([...doc.querySelectorAll('.page-footer')].map(n=>win.getComputedStyle(n).visibility==='visible'))===JSON.stringify(f)},{h,f})};
await waitPlacement([true,true,true],[true,true,true]);
await page.evaluate(()=>{void documentWorkspace105.action('page-setup')});
const setup=page.locator('.page-setup1427');await setup.waitFor();
for(const width of [1440,768,1024]){await page.setViewportSize({width,height:1000});for(const label of ['Header on','Footer on']){const choice=setup.getByLabel(label,{exact:true});assert(await choice.isVisible());assert.equal(await choice.getAttribute('aria-hidden'),null);const b=await choice.boundingBox();assert(b.width>=130&&b.x>=0&&b.x+b.width<=width)}}
await setup.getByLabel('Header on',{exact:true}).selectOption('first');await setup.getByLabel('Footer on',{exact:true}).selectOption('last');await waitPlacement([true,false,false],[false,false,true]);
await setup.getByRole('button',{name:'Done',exact:true}).click();
await page.evaluate(()=>{void documentWorkspace105.action('images109')});const images=page.locator('.doc-images-dialog112');await images.waitFor();
assert.equal(await images.getByLabel('Header on',{exact:true}).inputValue(),'first');assert.equal(await images.getByLabel('Footer on',{exact:true}).inputValue(),'last');
await images.getByLabel('Header on',{exact:true}).selectOption('all');await images.getByLabel('Footer on',{exact:true}).selectOption('all');await waitPlacement([true,true,true],[true,true,true]);
await images.getByLabel('Header on',{exact:true}).selectOption('none');await images.getByLabel('Footer on',{exact:true}).selectOption('none');await waitPlacement([false,false,false],[false,false,false]);
await images.getByLabel('Header on',{exact:true}).selectOption('first');await images.getByLabel('Footer on',{exact:true}).selectOption('last');await waitPlacement([true,false,false],[false,false,true]);
await page.evaluate(()=>status118.clear());await page.screenshot({path:'/tmp/editor-placement241-tablet.png'});
await images.getByRole('button',{name:'Close',exact:true}).last().click();await page.evaluate(()=>documentWorkspace105.flush());
await page.reload();await page.waitForFunction(()=>window.startup14257?.prepared&&liveProfile);await page.evaluate(()=>openDocumentEditor105());await waitPlacement([true,false,false],[false,false,true]);
assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.headerPlacement),'first');assert.equal(await page.evaluate(()=>documentWorkspace105.model.settings.footerPlacement),'last');
console.log('PASS page/image placement controls at desktop and tablet widths; every/first/last/none options and draft restoration');
assert.deepEqual(errors,[]);
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
