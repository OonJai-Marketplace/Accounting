const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const report={id:'60000000-0000-4000-a000-000000000010',version:1,data:{
   kind:'finance',mode:'utilization',status:'draft',date:'2026-11-15',budgetMonth290:'2026-11',recipient:'Office',purpose:'Office supplies',
   lines:[{category:'Supplies',description:'Paper',currency:'USD',amount:100,key117:'paper'}],
   conversions:[{date:'2026-11-15',currency:'USD',target:'LAK',amount:75,targetAmount290:1500000,rate:20000,source:'USD',evidence:'OJM990010'}],
   movements:[{type290:'receipt',inflow:100,currency:'USD',reference:'FUND-1',account:'Owner',destination290:'BCEL — USD'},
    {type290:'spend',outflow:500000,currency:'LAK',budgetKey117:'paper',account:'Cash',reference:'R1'},
    {type290:'spend',outflow:7000,currency:'LAK',destination290:'Transfer fees',account:'Cash',reference:'R2'}],
   receiptReference290:'RECEIPT-TEST'
  }};
  let linked=null;
  await page.route('**/rpc/account_exchange_rates143186',route=>{
   const p=route.request().postDataJSON();
   return route.fulfill({json:{as_of:p.p_as_of,calculated_at:'2026-11-15T01:00:00Z',accounts:[0,1,2].map(i=>({account_id:'00000000-0000-4000-a000-00000000000'+i,average_rate:20000,rate_status:'available'}))}});
  });
  await page.route('**/rest/v1/rpc/budget_utilization_journal',r=>r.fulfill({body:JSON.stringify(linked),contentType:'application/json'}));
  await page.route('**/rest/v1/operational_reports*',r=>r.fulfill({json:new URL(r.request().url()).searchParams.has('id')?report:[report]}));
  await login();await page.evaluate(()=>switchTab('transactions-budget14313'));
  const open=()=>page.evaluate(id=>budgetWorkflow14316.openAllocation(id),report.id);
  await open();
  const popup=page.getByRole('dialog',{name:'Budget Request Utilization Report',exact:true});
  const header=popup.locator('#fundHeader290');
  assert.equal(await header.getByLabel('Reference',{exact:true}).inputValue(),'RECEIPT-TEST');
  for(const width of [1440,1024,768]){
   await page.setViewportSize({width,height:900});
   const fields=await header.locator('label').evaluateAll(labels=>Object.fromEntries(labels.map(label=>{
    const input=label.querySelector('input,textarea'),control=label.querySelector('.oj-date-button104')||input;
    const box=control.getBoundingClientRect();
    return [input.name,{left:box.left,right:box.right,top:box.top,width:box.width}];
   })));
   const primary=['date','receiptReference290','recipient','purpose'].map(k=>fields[k]);
   assert.deepEqual(await header.locator('label').evaluateAll(labels=>labels.slice(0,4).map(l=>l.firstChild.textContent.trim())),['Report date','Reference','Recipient','Purpose']);
   assert(primary.every(f=>Math.abs(f.top-primary[0].top)<=1),JSON.stringify(fields));
   assert(primary.every((f,i)=>!i||f.left>=primary[i-1].right),JSON.stringify(fields));
   assert(fields.notes.top>primary[0].top);
   assert(fields.receiptReference290.width>=150&&fields.budgetMonth290.width>=120,JSON.stringify(fields));
   if(width>=1024)assert.equal(fields.budgetMonth290.top,fields.date.top);
  }
  await page.setViewportSize({width:1440,height:900});
  const cash=popup.locator('[data-cash-summary]'),requests=popup.locator('[data-request-summary]'),paid=popup.locator('[data-disbursements]');
  assert.deepEqual(await popup.locator('.block82 h4').allTextContents(),['Funding Summary','Budget Request Summary','Disbursement Breakdown']);
  const remaining=cash.locator('tfoot tr').last();
  assert.deepEqual(await remaining.locator('td').allTextContents(),['Remaining','$ 25.00','₭ 993,000.00']);
  assert.deepEqual(await paid.locator('thead th').allTextContents(),['Item / Category','USD','LAK','Reference','Action']);
  assert.equal(await requests.getByText('Transfer fees').count(),0);
  assert.equal(await paid.getByText('Transfer fees').count(),1);
  assert.match(await cash.innerText(),/20,000.*LAK \/ USD/);
  const paper=paid.getByRole('row').filter({hasText:'Paper'}),kip=paper.locator('[data-paid-in=LAK]');
  await kip.fill('510000');assert.match(await remaining.innerText(),/983,000/);
  await kip.fill('500000');assert.match(await remaining.innerText(),/993,000/);
  await requests.locator('[data-decision]').selectOption('deduction');
  await requests.locator('[data-adjusted]').fill('90');
  assert.match(await requests.locator('tfoot').innerText(),/90.00/);
  assert.match(await remaining.innerText(),/993,000/);
  await requests.locator('[data-decision]').selectOption('approved');
  const cashCheck=await page.evaluate(data=>{
   const d=structuredClone(data),m=d.movements[1];m.cashDistributed=400000;
   d.movements.push({type290:'refund',currency:'USD',outflow:4});
   const host=document.createElement('div');host.innerHTML=BudgetReport290.summary(d);
   return [...host.querySelectorAll('[data-cash-summary] tfoot tr')].map(r=>[...r.cells].map(c=>c.textContent));
  },report.data);
  assert.deepEqual(cashCheck,[['Remaining','$ 25.00','₭ 1,093,000.00']]);
  for(const width of [1280,1024,768]){
   await page.setViewportSize({width,height:672});
   assert(await popup.evaluate(dialog=>{const body=dialog.querySelector('.ui-body108');return body.scrollWidth<=body.clientWidth+1;}));
  }
  await page.setViewportSize({width:1280,height:900});
  await popup.getByRole('button',{name:'Print',exact:true}).click();
  const signers=page.getByRole('dialog',{name:'Report signatories'});
  await signers.getByRole('button',{name:'Cancel'}).click();
  assert(await popup.isVisible());
  await popup.getByRole('button',{name:'Print',exact:true}).click();
  await signers.getByRole('button',{name:'Open report'}).click();
  await page.getByRole('button',{name:'Add new tab',exact:true}).click();
  const frame=page.frameLocator('#docFrame105');
  await frame.locator('.page-content').filter({hasText:/Funding summary/i}).first().waitFor();
  assert.match((await frame.locator('.page-content').allInnerTexts()).join(' '),/993,000/);
  await page.emulateMedia({media:'screen'});
  await page.evaluate(()=>{
   const definitions=[['1041','BCEL — USD','ASSET','USD'],['3028','Owner Financial Support — Remaining — USD','EQUITY','USD'],['3029','Owner Financial Support — Used — USD','EQUITY','USD'],['3023','Owner Financial Support — Remaining — LAK','EQUITY','LAK'],['3024','Owner Financial Support — Used — LAK','EQUITY','LAK'],['9011','FX bridge — USD','ASSET','USD'],['9010','FX bridge — LAK','ASSET','LAK']];
   for(const [i,[code,name,type,currency]] of definitions.entries()){
    AccountingStore.accounts=AccountingStore.accounts.filter(a=>a.code!==code);
    AccountingStore.accounts.push({id:'00000000-0000-4000-a000-00000000000'+i,code,name,type,currency,isPosting:true,isTechnical:code.startsWith('90')});
   }
   syncCoaDatalist();
  });
  await page.route('**/rest/v1/rpc/budget_utilization_evidence478',r=>r.fulfill({json:{fingerprint:'a'.repeat(32),journals:[{entry_no:'OJM990010',status:'posted',journal_lines:[
   {accounts:{code:'9011'},currency_code:'USD',debit:75,credit:0,fx_rate_lak:20000,book_rate_lak:20000,line_date:'2026-11-15'},
   {accounts:{code:'9010'},currency_code:'LAK',debit:0,credit:1500000,fx_rate_lak:1,book_rate_lak:1,line_date:'2026-11-15'}
  ]}]}}));
  await page.evaluate(()=>{ui117.confirm=async()=>true;switchTab('transactions-budget14313');});await open();
  await popup.locator('#fundHeader290').evaluate(f=>f.closest('details').open=true);
  await popup.getByRole('button',{name:'Post Transaction',exact:true}).click();
  await popup.waitFor({state:'detached'});
  const editor=page.locator('#journalEntry98');
  const lines=editor.locator('#jeLinesBody tr');
  assert.equal(await lines.count(),8);
  assert.equal(Number(await lines.nth(0).locator('.je-line-dr').inputValue()),100);
  assert.equal(Number(await lines.nth(1).locator('.je-line-cr').inputValue()),100);
  assert.match(await lines.nth(0).locator('.je-line-memo').inputValue(),/Funding received/);
  assert.equal(Number(await lines.nth(2).locator('.je-line-dr').inputValue()),75);
  assert.equal(Number(await lines.nth(3).locator('.je-line-cr').inputValue()),75);
  assert.match(await editor.locator('#jeGeneralMemo').inputValue(),/RECEIPT-TEST/);
  const key='budget-use:'+report.id+':1:'+('a'.repeat(32));
  await page.route('**/rpc/post_device_journal335',async route=>{
   const payload=route.request().postDataJSON();assert.equal(payload.p_request_key,key);
   assert.equal(payload.p_entries[0].p_lines.length,8);
   linked={entry_no:payload.p_numbers[0],status:'posted',report_version:1};
   await route.fulfill({json:[{entry_id:'70000000-0000-4000-a000-000000000010',entry_no:linked.entry_no}]});
  });
  const job=await page.evaluate(async()=>{
   const snapshot=snapshotJournal69();restoreJournal69(snapshot);
   const codes=[...document.querySelectorAll('#jeLinesBody .je-line-acc')].map(n=>getSelectedAccountInfo(n.value)?.code);
   if(codes.join(',')!=='1041,3028,3028,9011,9010,3023,3023,3024')throw Error('Unexpected prepared accounts: '+codes.join(','));
   calculateJournalBalance();
   const messages=[],status=window.showCenterStatus,notice=window.showAppNotification;
   window.showCenterStatus=(message,...args)=>{messages.push(message);return status(message,...args);};
   window.showAppNotification=(title,message,...args)=>{messages.push(message);return notice(title,message,...args);};
   await submitJournalEntry();
   if(messages.some(m=>m.includes('Compare the rates')))await submitJournalEntry();
   window.showCenterStatus=status;window.showAppNotification=notice;
   const job=journalDurable14385.pending().find(j=>j.id.startsWith('budget-use:'));
   if(!job)throw Error('No queued summary: '+messages.join(' / ')+' '+JSON.stringify(collectLiveJournalGroups().errors));
   if(BudgetUtilizationJournal.snapshot()){
    let current;try{current=journalDurable14385.payloads();}catch(e){current=e.message;}
    throw Error('Posted draft retained the report link: '+JSON.stringify([messages,current,job.payload]));
   }
   return {id:job.id,lines:job.entries[0].lines};
  });
  assert.equal(job.id,key);assert.equal(job.lines[0].debit,100);assert.equal(job.lines[1].credit,100);assert.equal(job.lines[2].debit,75);assert.equal(job.lines[3].credit,75);
  await page.evaluate(key=>journalDurable14385.sync({targetId:key}),key);
  assert(linked?.entry_no);
  await page.evaluate(()=>switchTab('transactions-budget14313'));await open();
  await popup.locator('#fundHeader290').evaluate(f=>f.closest('details').open=true);
  await popup.getByText('Utilization journal · '+linked.entry_no,{exact:false}).waitFor();
  assert(await popup.getByRole('button',{name:'Post Transaction',exact:true}).isHidden());
  console.log('PASS compact report fields, combined receipt and spending pairs, dual-currency totals, named additional spending, signatory cancellation and editor entry, print widths, summary-only draft and posted reference.');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
