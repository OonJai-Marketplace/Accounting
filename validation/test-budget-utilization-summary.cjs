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
   movements:[{type290:'receipt',inflow:100,currency:'USD',reference:'FUND-1',account:'Owner'},
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
  const examples=await page.evaluate(d=>{
   const dollar={key117:'rent',category:'Rent',description:'House rent',currency:'USD',amount:50};
   const unpaid={...dollar,key117:'next',description:'Unspent request',amount:5};
   const payment={type290:'spend',budgetKey117:'rent',outflow:40,currency:'USD'};
   const read=report=>{
    const host=document.createElement('div');host.innerHTML=BudgetReport290.summary(report);
    const table=[...host.querySelectorAll('table')].find(t=>t.tHead.textContent.includes('Actual spending'));
    return {headings:[...table.tHead.rows[0].cells].map(c=>c.textContent),rows:[...table.tBodies[0].rows].map(r=>[...r.cells].slice(1).map(c=>Array.from(c.childNodes).map(n=>n.textContent).filter(Boolean)))};
   };
   const mixed={...d,lines:[dollar,unpaid,...d.lines],movements:[payment,...d.movements]};
   const usd={...mixed,lines:[dollar,unpaid],movements:[payment,{type290:'receipt',currency:'LAK',inflow:5000}]};
   return {usd:read(usd),mixed:read(mixed),withoutRate:read({...mixed,conversions:[]})};
  },report.data);
  assert.deepEqual(examples.usd.headings,['Item / category','Requested','Funds available','Actual spending','Remaining']);
  assert.deepEqual(examples.mixed.headings,examples.usd.headings);
  assert.deepEqual(examples.usd.rows[0],[['$ 50.00'],['$ 50.00'],['$ 40.00'],['$ 10.00']]);
  assert.deepEqual(examples.mixed.rows[0],examples.usd.rows[0]);
  assert.deepEqual(examples.mixed.rows[1],[['$ 5.00'],['$ 5.00'],['$ 0.00'],['$ 5.00']]);
  assert.deepEqual(examples.mixed.rows[2],[['$ 100.00'],['$ 100.00'],['₭ 500,000.00'],['—']]);
  assert.deepEqual(examples.withoutRate.rows[0],examples.mixed.rows[0]);
  assert.deepEqual(examples.withoutRate.rows[2],examples.mixed.rows[2]);
  assert.deepEqual(examples.mixed.rows.at(-1),[['$ 155.00','₭ 0.00'],['$ 25.00','₭ 1,500,000.00'],['$ 40.00','₭ 507,000.00'],['$ -15.00','₭ 993,000.00']]);
  const worksheet=popup.locator('.spending-worksheet');
  const paper=worksheet.getByRole('row').filter({hasText:'Paper'});
  assert.equal(await paper.locator('td').nth(1).innerText(),'$ 100.00');
  await popup.getByLabel('Show item equivalents').check();
  assert.equal(await paper.locator('td').nth(1).innerText(),'$ 100.00\n₭ 2,000,000.00');
  const actual=paper.locator('td').nth(4),kip=actual.locator('[name=actualAmount]'),usd=actual.locator('[name=equivalentAmount]');
  assert(await kip.isEditable()&&await kip.isVisible()&&await usd.isEditable()&&await usd.isVisible());
  assert((await usd.boundingBox()).y<(await kip.boundingBox()).y);
  assert.equal(await usd.getAttribute('placeholder'),'25.00');
  await kip.click();
  assert(await paper.evaluate(r=>r.classList.contains('table-selected107')));
  const fee=worksheet.getByRole('row').filter({hasText:'Transfer fees'});
  await fee.locator('td').first().click();
  assert(await fee.evaluate(r=>r.classList.contains('table-selected107')));
  assert(!await paper.evaluate(r=>r.classList.contains('table-selected107')));
  const cashCheck=await page.evaluate(data=>{
   const d=structuredClone(data),paid=d.movements[1];
   paid.cashDistributed=400000;paid.budgetAmount290=27;
   d.movements.push({type290:'refund',currency:'USD',outflow:4});
   const cash=BudgetReport290.balances(d).get('USD');
   const amount=()=>BudgetReport290.compare(d,'cash').rows[0].values.USD.used;
   const calculated=amount();paid.cashBudgetAmount=22;
   const box=document.createElement('div');box.innerHTML=BudgetReport290.summary(d);
   const rows=[...box.querySelector('tbody').rows].map(r=>[...r.cells].map(c=>c.textContent));
   if(!rows.some(r=>r[0]==='Cash distributed')||!rows.some(r=>r[0]==='Cash remaining'&&r[1]==='25.00')||
    rows.some(r=>/returned|after returns|before returns/i.test(r[0])))throw Error('Unexpected cash summary '+JSON.stringify(rows));
   return [cash.beforeReturn,cash.remaining,calculated,amount(),BudgetReport290.compare(d).rows[0].values.USD.used];
  },report.data);
  assert.deepEqual(cashCheck,[25,21,20,22,27]);
  await kip.fill('510000');assert.equal(await usd.getAttribute('placeholder'),'25.50');
  await kip.fill('500000');
  await popup.locator('[data-summary] summary').click();
  await popup.locator('[data-budget-balance]').filter({hasText:'Cash remaining'}).waitFor();
  assert.match(await popup.locator('[data-budget-balance]').innerText(),/Cash remaining.*25.00.*993,000/);
  const comparison=popup.locator('table').filter({hasText:/Funds available/i});
  assert.match(await comparison.innerText(),/Transfer fees/);
  for(const width of [1280,1024,768]){
   await page.setViewportSize({width,height:672});
   const pinned=await popup.evaluate(dialog=>{
    const body=dialog.querySelector('.ui-body108');
    const buttons=[...dialog.querySelectorAll('.fund-report-toolbar button:not([hidden])')];
    body.scrollTop=0;
    const before=buttons.map(b=>b.getBoundingClientRect().top);
    body.scrollTop=body.scrollHeight;
    return {scrolled:body.scrollTop,positions:buttons.map((b,i)=>{
     const r=b.getBoundingClientRect();
     return Math.abs(r.top-before[i])<1 && document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===b;
    })};
   });
   assert(pinned.scrolled>100 && pinned.positions.length===11 && pinned.positions.every(Boolean),JSON.stringify(pinned));
  }
  await page.setViewportSize({width:1280,height:900});
  await popup.getByRole('button',{name:'Print / PDF'}).click();
  const signers=page.getByRole('dialog',{name:'Report signatories'});
  await signers.getByRole('button',{name:'Cancel'}).click();
  assert(await popup.isVisible());
  await popup.getByRole('button',{name:'Print / PDF'}).click();
  await signers.getByRole('button',{name:'Open report'}).click();
  await page.getByRole('button',{name:'Add new tab',exact:true}).click();
  await popup.waitFor({state:'detached'});
  const frame=page.frameLocator('#docFrame105');
  const printed=frame.locator('.page-content table').filter({hasText:/Funds available/i}).filter({hasText:'Paper'}).first();
  assert.match(await printed.innerText(),/993,000/);
  const widths=await printed.locator('tbody tr').first().locator('th,td').evaluateAll(cells=>cells.map(c=>c.getBoundingClientRect().width));
  assert(widths.length===5 && widths[0]>Math.max(...widths.slice(1))*1.7,JSON.stringify(widths));
  await page.emulateMedia({media:'print'});
  for(const name of ['total','requested']){
   const colors=await frame.locator('tr[data-budget-summary290="'+name+'"]').first().locator('th,td').evaluateAll(cells=>cells.map(c=>getComputedStyle(c).backgroundColor));
   assert(colors.length>=2&&colors.every(c=>c==='rgb(220, 238, 227)'),JSON.stringify({name,colors}));
  }
  await page.emulateMedia({media:'screen'});
  const equityCheck=await page.evaluate(data=>{
   const acc=(code,name,type,i)=>({id:'00000000-0000-4000-a000-00000000000'+i,code,name,type,currency:'USD',isPosting:true});
   const bank=acc('1041','BCEL – USD','ASSET',0),remaining=acc('3028','Owner Financial Support — Remaining — USD','EQUITY',1);
   const used=acc('3029','Owner Financial Support — Used — USD','EQUITY',2),original=acc('3026','Owner Financial Support Received — USD','EQUITY',3);
   AccountingStore.accounts.push(bank,remaining,used,original);syncCoaDatalist();
   const receipt={type290:'receipt',currency:'USD',inflow:1000,reference:'Bank advice'};
   const spend={type290:'spend',currency:'USD',outflow:900};
   const d={...data,receiptReference290:'',conversions:[],movements:[receipt,spend]};
   const plan=(report,evidence=[])=>BudgetSupportEquity.plan(report,BudgetSupportEquity.groups(report),evidence);
   const fresh=plan(d);
   const coverage={type290:'receipt',account:'Restaurant funds',description290:'Restaurant covered the kip shortage.',currency:'LAK',inflow:10000};
   const fx={currency:'USD',amount:100,target:'LAK',targetAmount290:2000000};
   const mixed={...d,conversions:[fx],movements:[{...receipt,reference:'OJM990001'},{...spend,cashDistributed:800},coverage,
    {type290:'spend',currency:'LAK',outflow:2500000,cashDistributed:2010000},{type290:'refund',currency:'USD',outflow:100}]};
   const prior={entry_no:'OJM990001',status:'posted',journal_lines:[{currency_code:'USD',credit:1000,debit:0,accounts:original,book_rate_lak:20100}]};
   const posted=plan(mixed,[prior]),already=plan(mixed,[{...prior,journal_lines:[{...prior.journal_lines[0],accounts:remaining}]}]);
   const paid=BudgetReport290.balances(mixed).get('LAK');
   const supportHtml=BudgetReport290.summary(mixed);
   const sourceDoc=document.createElement('div');sourceDoc.innerHTML=supportHtml;
   const line=label=>[...sourceDoc.querySelectorAll('tbody tr')].find(r=>r.cells[0].textContent===label)?.cells[2].textContent;
   return {fresh:fresh.pairs.map(p=>[p.debitCode,p.creditCode,p.amount]),notice:fresh.notice,posted:posted.pairs.map(p=>[p.debitCode,p.creditCode,p.amount,p.rate]),already:already.pairs.length,lak:[paid.receipt,paid.coverage,paid.remaining],receiptLabel:line('Funding received'),coverageLabel:line('Shortfall covered by restaurant')};
  },report.data);
  assert.deepEqual(equityCheck.fresh,[['1041','3028',1000],['3028','3029',900]]);assert.match(equityCheck.notice,/100.00 remaining/);
  assert.deepEqual(equityCheck.posted,[['3026','3028',1000,20100],['3028','3029',900,20100]]);
  assert.equal(equityCheck.already,1);assert.deepEqual(equityCheck.lak,[0,10000,0]);
  assert.equal(equityCheck.receiptLabel,'0.00');assert.equal(equityCheck.coverageLabel,'10,000.00');
  await page.evaluate(()=>{ui117.confirm=async()=>true;switchTab('transactions-budget14313');});await open();
  await popup.getByRole('button',{name:'Open in Post Transaction'}).click();
  await popup.waitFor({state:'detached'});
  const editor=page.locator('#journalEntry98');
  const lines=editor.locator('#jeLinesBody tr');
  assert.equal(await lines.count(),4);
  assert.equal(Number(await lines.nth(0).locator('.je-line-dr').inputValue()),100);
  assert.equal(Number(await lines.nth(1).locator('.je-line-cr').inputValue()),100);
  assert.match(await lines.nth(0).locator('.je-line-memo').inputValue(),/Funding received/);
  assert.equal(Number(await lines.nth(2).locator('.je-line-dr').inputValue()),25.35);
  assert.equal(Number(await lines.nth(3).locator('.je-line-cr').inputValue()),25.35);
  assert.match(await editor.locator('#jeGeneralMemo').inputValue(),/RECEIPT-TEST/);
  const key='budget-use:'+report.id+':1';
  await page.route('**/rpc/post_device_journal335',async route=>{
   const payload=route.request().postDataJSON();assert.equal(payload.p_request_key,key);
   assert.equal(payload.p_entries[0].p_lines.length,4);
   linked={entry_no:payload.p_numbers[0],status:'posted',report_version:1};
   await route.fulfill({json:[{entry_id:'70000000-0000-4000-a000-000000000010',entry_no:linked.entry_no}]});
  });
  const job=await page.evaluate(async()=>{
   const snapshot=snapshotJournal69();restoreJournal69(snapshot);
   const codes=[...document.querySelectorAll('#jeLinesBody .je-line-acc')].map(n=>getSelectedAccountInfo(n.value)?.code);
   if(codes.join(',')!=='1041,3028,3028,3029')throw Error('Unexpected prepared accounts: '+codes.join(','));
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
  assert.equal(job.id,key);assert.equal(job.lines[0].debit,100);assert.equal(job.lines[1].credit,100);assert.equal(job.lines[2].debit,25.35);assert.equal(job.lines[3].credit,25.35);
  await page.evaluate(key=>journalDurable14385.sync({targetId:key}),key);
  assert(linked?.entry_no);
  await page.evaluate(()=>switchTab('transactions-budget14313'));await open();
  await popup.getByText('Utilization journal · '+linked.entry_no,{exact:false}).waitFor();
  assert(await popup.getByRole('button',{name:'Open in Post Transaction'}).isHidden());
  console.log('PASS compact report fields, combined receipt and spending pairs, dual-currency totals, named additional spending, signatory cancellation and editor entry, print widths, summary-only draft and posted reference.');
 }finally{await fixture.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
