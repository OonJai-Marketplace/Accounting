const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const fixture=await create();
 try{
  const {page,login}=await fixture.open();
  const report={id:'60000000-0000-4000-a000-000000000010',version:1,data:{
   kind:'finance',mode:'utilization',status:'draft',date:'2026-11-15',budgetMonth290:'2026-11',recipient:'Office',purpose:'Office supplies',
   lines:[{category:'Supplies',description:'Paper',currency:'USD',amount:100,key117:'paper'}],
   conversions:[{date:'2026-11-15',currency:'USD',target:'LAK',amount:75,targetAmount290:1500000,rate:20000,source:'USD',evidence:'FX-1'}],
   movements:[{type290:'spend',outflow:500000,currency:'LAK',budgetKey117:'paper',account:'Cash',reference:'R1'},
    {type290:'spend',outflow:7000,currency:'LAK',destination290:'Transfer fees',account:'Cash',reference:'R2'}],
   receiptReference290:'RECEIPT-TEST'
  }};
  let linked=null;
  await page.route('**/rpc/account_exchange_rates143186',route=>{
   const p=route.request().postDataJSON();
   return route.fulfill({json:{as_of:p.p_as_of,calculated_at:'2026-11-15T01:00:00Z',accounts:[0,1].map(i=>({account_id:'00000000-0000-4000-a000-00000000000'+i,average_rate:20000,rate_status:'available'}))}});
  });
  await page.route('**/rest/v1/rpc/budget_utilization_journal',r=>r.fulfill({body:JSON.stringify(linked),contentType:'application/json'}));
  await page.route('**/rest/v1/operational_reports*',r=>r.fulfill({json:new URL(r.request().url()).searchParams.has('id')?report:[report]}));
  await login();await page.evaluate(()=>switchTab('transactions-budget14313'));
  const open=()=>page.evaluate(id=>budgetWorkflow14316.openAllocation(id),report.id);
  await open();
  const popup=page.getByRole('dialog',{name:'Budget Request Utilization Report',exact:true});
  await popup.locator('[data-summary] summary').click();
  assert.match(await popup.locator('[data-budget-balance]').innerText(),/74.65.*1,493,000/);
  const comparison=popup.locator('table').filter({hasText:/Funding remaining|Budget remaining/i});
  assert.match(await comparison.innerText(),/Transfer fees/);
  await popup.getByRole('button',{name:'Print / PDF'}).click();
  const signers=page.getByRole('dialog',{name:'Report signatories'});
  await signers.getByRole('button',{name:'Cancel'}).click();
  assert(await popup.isVisible());
  await popup.getByRole('button',{name:'Print / PDF'}).click();
  await signers.getByRole('button',{name:'Open report'}).click();
  await page.getByRole('button',{name:'Add new tab',exact:true}).click();
  await popup.waitFor({state:'detached'});
  const frame=page.frameLocator('#docFrame105');
  const printed=frame.locator('.page-content table').filter({hasText:'remaining'}).filter({hasText:'Paper'}).first();
  assert.match(await printed.innerText(),/1,493,000/);
  const widths=await printed.locator('thead th').evaluateAll(cells=>cells.map(c=>c.getBoundingClientRect().width));
  assert(widths[0]>widths[1]*1.7,JSON.stringify(widths));
  await page.evaluate(()=>{ui117.confirm=async()=>true;switchTab('transactions-budget14313');});await open();
  await popup.getByRole('button',{name:'Open in Post Transaction'}).click();
  await popup.waitFor({state:'detached'});
  const editor=page.locator('#journalEntry98');
  const lines=editor.locator('#jeLinesBody tr');
  assert.equal(await lines.count(),2);
  assert.equal(Number(await lines.nth(0).locator('.je-line-dr').inputValue()),25.35);
  assert.equal(Number(await lines.nth(1).locator('.je-line-cr').inputValue()),25.35);
  assert.match(await editor.locator('#jeGeneralMemo').inputValue(),/RECEIPT-TEST/);
  const key='budget-use:'+report.id+':1';
  await page.route('**/rpc/post_device_journal335',async route=>{
   const payload=route.request().postDataJSON();assert.equal(payload.p_request_key,key);
   assert.equal(payload.p_entries[0].p_lines.length,2);
   linked={entry_no:payload.p_numbers[0],status:'posted',report_version:1};
   await route.fulfill({json:[{entry_id:'70000000-0000-4000-a000-000000000010',entry_no:linked.entry_no}]});
  });
  const job=await page.evaluate(async()=>{
   const snapshot=snapshotJournal69();restoreJournal69(snapshot);
   const accounts=['Remaining','Used'].map((name,i)=>({id:'00000000-0000-4000-a000-00000000000'+i,code:String(9311+i),name,currency:'USD',type:'EQUITY',isPosting:true}));
   AccountingStore.accounts.push(...accounts);syncCoaDatalist();
   const rows=[...document.querySelectorAll('#jeLinesBody tr')];
   rows.forEach((r,i)=>{
    const input=r.querySelector('.je-line-acc');input.value=accounts[i].code+' — '+accounts[i].name;
    input.dispatchEvent(new Event('change',{bubbles:true}));
   });
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
  assert.equal(job.id,key);assert.equal(job.lines[0].debit,25.35);assert.equal(job.lines[1].credit,25.35);
  await page.evaluate(key=>journalDurable14385.sync({targetId:key}),key);
  assert(linked?.entry_no);
  await page.evaluate(()=>switchTab('transactions-budget14313'));await open();
  await popup.getByText('Utilization journal · '+linked.entry_no,{exact:false}).waitFor();
  assert(await popup.getByRole('button',{name:'Open in Post Transaction'}).isHidden());
  console.log('PASS dual-currency totals, named additional spending, signatory cancellation and editor entry, print widths, summary-only draft and posted reference.');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
