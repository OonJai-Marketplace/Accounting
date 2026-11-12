const assert=require('node:assert/strict');
const setup=require('./phase0-browser-fixture.cjs');

(async()=>{
 const f=await setup();
 try{
  const {page,login}=await f.open();
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const qty=1234.5,staffBook=44400246.91/2000,bankBook=66700037.03/3000,payday=22228;
  const records=[
   {account_id:'1222',foreign_balance:-2000,lak_carrying_value:-2000*staffBook,average_rate:null,rate_status:'negative_asset_balance'},
   {account_id:'1041',foreign_balance:3000,lak_carrying_value:3000*bankBook,average_rate:bankBook,rate_status:'available'}
  ];
  await page.route('**/rpc/account_exchange_rates143186',route=>route.fulfill({json:{
   as_of:route.request().postDataJSON().p_as_of,accounts:route.request().postDataJSON().p_as_of==='2026-11-06'?
    [{...records[0],lak_carrying_value:null,rate_status:'missing_valuation'},records[1]]:records
  }}));
  await page.evaluate(records=>{
   switchTab('journal');showJournalEntry98();clearJournalEntry();
   const definitions=[
    ['1222','USD','ASSET'],['1041','USD','ASSET'],['9011','USD','SYSTEM'],
    ['9010','LAK','SYSTEM'],['5419','LAK','EXPENSE']
   ];
   AccountingStore.accounts=AccountingStore.accounts.filter(a=>!definitions.some(([code])=>a.code===code));
   for(const [code,currency,type] of definitions)AccountingStore.accounts.push({
    id:code,code,name:'Fixture '+code,currency,type,baseType:type,isTechnical:type==='SYSTEM',active:true,isPosting:true
   });
   document.querySelector('#jeTransDate').value='2026-11-08';
   JournalModule.entries=records.map(r=>({
    accountId:r.account_id,date:'2026-11-07',currency:'USD',id:'fixture-'+r.account_id,
    debit:Math.max(r.foreign_balance,0),credit:Math.max(-r.foreign_balance,0),
    base_debit:Math.max(r.lak_carrying_value,0),base_credit:Math.max(-r.lak_carrying_value,0)
   }));
   const key='ojm_generator258:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+liveProfile.id;
   localStorage.setItem(key,JSON.stringify({template:'gen268-settlement-USD',date:'2026-11-08',protocolVersion:2,
    memo:'Retained salary draft',rows:[{account_id:'',line_memo:'',debit:'',credit:''}],rates:{},drafts:{}}));
  },records);
  await page.locator('#generateJournal258').evaluate(b=>b.click());
  const d=page.locator('#journalGenerator258');
  assert.equal(await d.locator('[data-template]').inputValue(),'gen268-settlement-USD');
  assert.equal(await d.locator('[data-row]').count(),6,'Recover the old one-blank-row salary draft');
  assert.equal(await d.locator('[data-memo]').inputValue(),'Retained salary draft');
  const line=(row,field)=>d.locator('[data-row="'+row+'"] [data-field="'+field+'"]');
  assert.equal(await line(0,'debit').getAttribute('placeholder'),'Enter debit');
  assert.equal(await line(1,'credit').getAttribute('placeholder'),'Enter credit');
  for(const [row,fields] of [[0,['credit']],[1,['debit']],...[2,3,4,5].map(row=>[row,['debit','credit']])]){
   for(const field of fields)assert.equal(await line(row,field).getAttribute('placeholder'),
    row===2&&field==='debit'||row===3&&field==='credit'?'Auto '+field:null);
  }
  assert.match(await d.locator('[data-row="4"]').innerText(),/Loss → debit · Gain → credit/);
  await d.locator('[data-generate]').click();
  for(const row of [0,1]){
   assert.match(await d.locator('[data-row="'+row+'"] td').nth(1).innerText(),/Choose the .* account/);
   assert.equal(await d.locator('[data-row="'+row+'"] td').nth(1).locator('[aria-invalid=true]').count(),1);
  }
  assert.equal(await line(0,'debit').getAttribute('aria-invalid'),'true');
  await d.locator('[data-memo]').click();
  const remove=i=>d.locator('[data-row="'+i+'"] button[aria-label^="Remove row"]').click();
  const undo=d.locator('[data-undo]');
  await remove(2);assert.equal(await d.locator('[data-row]').count(),5);
  await undo.click();assert.equal(await d.locator('[data-row]').count(),6);
  for(let i=5;i>=0;i--)await remove(i);
  assert.equal(await d.locator('[data-row]').count(),1);
  await d.locator('[data-close]').click();await page.locator('#generateJournal258').click();
  assert.equal(await d.locator('[data-row]').count(),6);
  {
   const changed=await d.locator('[data-row="0"] [data-field=line_memo]').inputValue();
   assert.equal(changed,'Balance payment');
  }
  const codes=()=>d.locator('[data-row] select').evaluateAll(items=>items.map(n=>n.value));
  assert.deepEqual(await codes(),['','','9011','9011','5419','9010']);
  await page.evaluate(()=>{
   const lookup=AccountRates143186.bookRateFor,gate=new Promise(resolve=>window.releaseBookLookup=resolve);
   AccountRates143186.bookRateFor=async(...args)=>{const book=await lookup(...args);await gate;return book;};
  });
  await d.locator('[data-row="0"] select').selectOption('1222',{force:true});
  await d.locator('[data-row="1"] select').selectOption('1041',{force:true});
  await line(0,'book_rate_lak').focus();
  await page.evaluate(()=>releaseBookLookup());
  await page.waitForFunction(()=>document.querySelector('[data-row="0"] [data-field="book_rate_lak"]').value==='22,200.12');
  assert.equal(await line(1,'book_rate_lak').inputValue(),'22,233.35');
  await remove(0);
  await d.locator('[data-template]').selectOption('blank',{force:true});
  await d.locator('[data-template]').selectOption('gen268-settlement-USD',{force:true});
  assert.deepEqual(await codes(),['1222','1041','9011','9011','5419','9010']);
  await d.locator('[data-memo]').fill('Partial USD salary settlement');
  await d.locator('[data-rates] input').fill(String(payday));
  await line(0,'debit').pressSequentially(String(qty));
  assert.equal(await line(0,'debit').inputValue(),'1,234.5');
  const memo=d.locator('[data-memo]'),rate=d.locator('[data-rates] input');
  const templateField=d.locator('[data-template-query]');
  const dateField=d.locator('[data-date]');
  assert.equal(await d.locator('a[href*="protocols"]').count(),0);
  const [dateBox,rateBox,templateBox]=await Promise.all([dateField.boundingBox(),rate.boundingBox(),templateField.boundingBox()]);
  assert(dateBox.width<170&&rateBox.width<140);
  assert(dateBox.x+dateBox.width<=rateBox.x);
  if(templateBox.y===dateBox.y)assert(rateBox.x+rateBox.width<=templateBox.x);
  await memo.fill('');
  await d.locator('[data-generate]').click();
  assert.equal(await memo.getAttribute('aria-invalid'),'true');
  assert.equal(await memo.evaluate(n=>document.activeElement===n),true);
  assert.equal(await d.locator('[data-generator-error]').count(),1);
  assert.match(await d.locator('.generator-error258').innerText(),/general description/);
  const description='Salary 350000 LAK, OJM260329 on 2026-10-07, account 1222, ref 123456';
  await memo.fill(description);
  await rate.click();
  assert.equal(await memo.inputValue(),description.replace('350000','350,000'));
  assert.equal(await memo.getAttribute('aria-invalid'),null);
  await line(0,'line_memo').fill('Staff clearing USD 1234.50 for OJM260329');
  await rate.fill('');
  await d.locator('[data-generate]').click();
  await page.waitForFunction(()=>document.querySelector('[data-rates] input').getAttribute('aria-invalid')==='true');
  assert.equal(await rate.evaluate(n=>document.activeElement===n),true);
  await rate.fill(String(payday));
  assert.equal(await line(0,'line_memo').inputValue(),'Staff clearing USD 1,234.50 for OJM260329');
  await d.locator('[data-close]').click();await page.locator('#generateJournal258').click();
  assert.equal(await d.locator('[data-date]').inputValue(),'2026-11-08');
  assert.equal(await d.locator('[data-template]').inputValue(),'gen268-settlement-USD');
  assert.equal(await d.locator('[data-rates] input').inputValue(),payday.toLocaleString('en-US'));
  const generate=async()=>{
   await d.locator('[data-generate]').click();
   await page.waitForFunction(()=>!document.querySelector('#journalGenerator258 [data-use]').disabled,null,{timeout:4000})
    .catch(async()=>{throw Error(await d.locator('[data-status]').innerText()||'Generate left the draft unverified');});
   return d.locator('[data-row]').evaluateAll(rows=>rows.map(row=>Object.fromEntries(
    [...row.querySelectorAll('input[data-field]')].map(n=>[n.dataset.field,n.value]))));
  };
  const date=d.locator('[data-date]');
  await date.fill('2026-11-06');
  await page.waitForFunction(()=>document.querySelector('[data-row="0"] [data-field=book_rate_lak]').title.includes('No recorded book rate'));
  assert.equal(await line(0,'book_rate_lak').inputValue(),'');
  await d.locator('[data-generate]').click();
  await page.waitForFunction(()=>document.querySelector('#journalGenerator258 [data-status]').textContent.includes('1222'));
  assert.equal(await d.locator('[data-use]').isDisabled(),true);
  await date.fill('2026-11-08');
  await line(0,'book_rate_lak').focus();
  await page.waitForFunction(()=>document.querySelector('[data-row="0"] [data-field=book_rate_lak]').value==='22,200.12');
  const rows=await generate();assert.deepEqual(await codes(),['1222','1041','9011','9011','5419','9010']);
  assert.equal(rows[0].debit,'1,234.5');assert.equal(rows[1].credit,'1,234.5');
  assert.equal(rows[2].debit,'1,234.5');assert.equal(rows[3].credit,'1,234.5');
  const cents=(q,r)=>Math.round(q*r*100);
  const loss=(cents(qty,bankBook)-cents(qty,staffBook))/100;
  assert.equal(rows[4].debit,loss.toLocaleString('en-US'));assert.equal(rows[5].credit,rows[4].debit);
  assert.equal(rows[3].book_rate_lak,payday.toLocaleString('en-US'));
  assert.deepEqual(await generate(),rows);
  await line(1,'book_rate_lak').fill('22000');
  const gain=await generate();assert.equal(gain[4].credit,((cents(qty,staffBook)-cents(qty,22000))/100).toLocaleString('en-US'));
  assert.equal(gain[5].debit,gain[4].credit);assert.deepEqual(await generate(),gain);
  let copyLookups=0;
  page.on('request',request=>{if(request.url().includes('/rpc/account_exchange_rates143186'))copyLookups++;});
  await d.locator('[data-use]').click();await d.waitFor({state:'detached',timeout:3500}).catch(async e=>{throw Error((await d.locator('[data-status]').innerText())+' '+e.message);});
  assert.equal(copyLookups,0,'Copy must reuse the verified balances when the ledger is unchanged');
  assert.equal(await page.locator('#jeGeneralMemo').inputValue(),description.replace('350000','350,000'));
  assert.equal(await page.locator('#jeLinesBody .je-line-memo').first().inputValue(),'Staff clearing USD 1,234.50 for OJM260329');
  assert.equal(await page.locator('#jeLinesBody tr').count(),6);
  assert.equal(await page.locator('#jeLinesBody tr').first().getAttribute('data-book-rate14383'),String(staffBook));
  const postedRows=page.locator('#jeLinesBody tr');
  const staffDebit=postedRows.nth(0).locator('.je-line-dr');
  assert.equal(await staffDebit.getAttribute('placeholder'),'Enter debit');
  assert.equal(await postedRows.nth(1).locator('.je-line-cr').getAttribute('placeholder'),'Enter credit');
  await staffDebit.fill('');
  assert(await staffDebit.evaluate(n=>n.matches(':placeholder-shown')));
  assert.equal(await postedRows.nth(2).locator('[data-template-amount-hint]').count(),0);
  const editable=page.locator('#jeGeneralMemo').locator('..').locator('[contenteditable=true]');
  await editable.fill('Paid 350000.75 LAK in 2026 for OJM260329');
  await editable.blur();
  assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Paid 350,000.75 LAK in 2026 for OJM260329');
  console.log('PASS staff credit balance BR, partial salary, six ordered rows, both FX directions, commas during typing and repeat Generate, full precision copied into Post Entry.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
