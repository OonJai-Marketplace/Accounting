const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();await page.waitForFunction(()=>!idleSync14341.running);
 let attempts=[],fail=true,allowed=true;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('__opening164',async(name,p)=>{if(name==='annual_opening_status143109')return {data:{available:allowed,generation:'fixture-generation',opening_count:3,reason:'Year is finalized.'}};attempts.push(p);if(fail){fail=false;return {error:{message:'Connection interrupted'}}}return {data:[{entry_id:'fixture-opening-'+attempts.length,entry_no:'TEST-'+attempts.length}]};});
 await page.evaluate(()=>{
  const rpc=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=(name,p)=>['annual_opening_status143109','post_annual_opening143109'].includes(name)?window.__opening164(name,p):rpc(name,p);
  groupedNavigation14378.choose(groupedNavigation14378.books[0].items[0]);
  const a={id:'test-opening-bank',code:'TEST100',name:'Opening test bank',currency:'LAK',type:'ASSET',isPosting:true},b={id:'test-opening-equity',code:'TEST300',name:'Opening test equity',currency:'LAK',type:'EQUITY',isPosting:true};AccountingStore.accounts.push(a,b);window.__openingTestAccount=a;
  window.collectLiveJournalGroups=()=>({errors:[],differences:[],grouped:{[document.getElementById('jeTransDate').value]:{lines:[{account:a,memo:'Discovered bank balance',currency:'LAK',debit:100,credit:0,fx_rate_lak:1},{account:b,memo:'Opening offset',currency:'LAK',debit:0,credit:100,fx_rate_lak:1}]}}});
 });
 const prepare=async date=>page.evaluate(date=>{document.getElementById('jeTransDate').value=date;document.getElementById('jeMultipleDates').checked=false;document.getElementById('jeGeneralMemo').value='Previously omitted balance';openingBalances14234.check();document.getElementById('status118')?.remove();},date);
 const click=async()=>{await page.locator('#jeOptions14389').click();await page.locator('#journalOpening143112').click();};
 await prepare('2026-05-12');await click();
 assert.match(await page.locator('body').innerText(),/opening balance adjustment.*does not change January/s);
 await page.screenshot({path:'/tmp/opening-adjustment143164-confirmation.png'});
 await page.getByRole('button',{name:'Record Opening Balance',exact:true}).click();
 await page.waitForFunction(()=>openingBalances14234.pending()&&document.getElementById('journalOpening143112').textContent==='Retry Opening Balance');
 assert.equal(attempts.length,1);assert.equal(attempts[0].p_entries[0].p_transaction_date,'2026-05-12');
 assert.match(attempts[0].p_entries[0].p_memo,/^Opening balance adjustment 2026/);
 assert(attempts[0].p_entries[0].p_lines.every(l=>/^Opening balance adjustment — /.test(l.description)));
 await page.evaluate(()=>submitJournalEntry());assert.equal(attempts.length,1);
 await prepare('2026-06-10');await page.evaluate(()=>openingBalances14234.post());assert.deepEqual(attempts[0],attempts[1]);
 assert.equal(await page.evaluate(()=>openingBalances14234.pending()),null);
 assert.equal(await page.locator('#journalOpening143112').getAttribute('hidden'),null);assert(!(await page.locator('#journalOpening143112').isDisabled()));
 // Cancel creates no request.
 await prepare('2026-06-10');await click();await page.getByRole('button',{name:'Cancel',exact:true}).last().click();assert.equal(attempts.length,2);
 // Existing openings do not hide/disable the option; next year's Jan 1 has the initial label.
 await prepare('2027-01-01');await click();assert.match(await page.locator('body').innerText(),/add to any opening balances already saved/);
 await page.getByRole('button',{name:'Record Opening Balance',exact:true}).click();await page.waitForFunction(()=>!openingBalances14234.pending()&&!document.getElementById('journalOpening143112').disabled);
 assert.equal(attempts.length,3);assert.equal(attempts[2].p_entries[0].p_memo,'Annual opening balances 2027');assert.equal(attempts[2].p_year,2027);
 assert(attempts[2].p_entries[0].p_lines.every(l=>!l.description.startsWith('Opening balance adjustment')));
 // A failed date/access preflight leaves the control visible and enabled.
 allowed=false;await prepare('2026-05-12');await page.evaluate(()=>openingBalances14234.post());assert.equal(attempts.length,3);assert(!(await page.locator('#journalOpening143112').isDisabled()));
 // Same source feeds GL and reconciliation: May adjustment never changes January.
 const totals=await page.evaluate(()=>{
  const a=__openingTestAccount,key=accountKey69(a),base={accountId:a.id,accountCode:a.code,account:a.name,currency:a.currency,status:'posted',credit:0};
  JournalModule.entries=[{...base,id:'INITIAL',date:'2026-01-01',annualOpening:true,debit:1000,generalMemo:'Annual opening balances 2026',memo:'Initial'},{...base,id:'INITIAL-ADD',date:'2026-01-01',annualOpening:true,debit:200,generalMemo:'Annual opening balances 2026',memo:'Initial addition'},{...base,id:'LATE',date:'2026-05-12',annualOpening:false,debit:100,generalMemo:'Opening balance adjustment 2026 — Omitted balance',memo:'Opening balance adjustment — Bank'},{...base,id:'NEXT',date:'2027-01-01',annualOpening:true,debit:1300,generalMemo:'Annual opening balances 2027',memo:'Next year'}];
  const read=(from,to)=>{Object.assign(Accounts69,{from,to,account:key});const ledger=accountData69().find(r=>r.key===key),bank=reconciliationAccount71(key,from,to);return [ledger,bank].map(r=>[r.opening,r.debit,r.closing,r.lines.map(l=>l.id)])};
  return {january:read('2026-01-01','2026-01-31'),may:read('2026-05-01','2026-05-31'),next:read('2027-01-01','2027-01-31')};
 });
 assert.deepEqual(totals.january,[[120000,0,120000,[]],[120000,0,120000,[]]]);
 assert.deepEqual(totals.may,[[120000,10000,130000,['LATE']],[120000,10000,130000,['LATE']]]);
 assert.deepEqual(totals.next,[[130000,0,130000,[]],[130000,0,130000,[]]]);
 assert.deepEqual(errors,[]);console.log('PASS: always-visible opening option; concise confirmation; actual late date and labels; initial/next-year classification; unchanged January; repeated openings; immutable retry and ordinary-post guard');
 }finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
