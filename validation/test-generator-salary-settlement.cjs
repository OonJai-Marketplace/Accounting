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
   as_of:route.request().postDataJSON().p_as_of,accounts:records
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
  },records);
  await page.locator('#generateJournal258').evaluate(b=>b.click());
  const d=page.locator('#journalGenerator258');
  await d.locator('[data-template]').selectOption('gen268-settlement-USD',{force:true});
  const line=(row,field)=>d.locator('[data-row="'+row+'"] [data-field="'+field+'"]');
  assert.equal(await line(0,'debit').getAttribute('placeholder'),'Enter debit');
  assert.equal(await line(1,'credit').getAttribute('placeholder'),'Enter credit');
  for(const [row,fields] of [[0,['credit']],[1,['debit']],...[2,3,4,5].map(row=>[row,['debit','credit']])]){
   for(const field of fields)assert.equal(await line(row,field).getAttribute('placeholder'),null);
  }
  const codes=()=>d.locator('[data-row] select').evaluateAll(items=>items.map(n=>n.value));
  assert.deepEqual(await codes(),['','','9011','9011','5419','9010']);
  await d.locator('[data-row="0"] select').selectOption('1222',{force:true});
  await d.locator('[data-row="1"] select').selectOption('1041',{force:true});
  await page.waitForFunction(()=>document.querySelector('[data-row="0"] [data-field="book_rate_lak"]').value==='22,200.12');
  assert.equal(await line(1,'book_rate_lak').inputValue(),'22,233.35');
  await d.locator('[data-memo]').fill('Partial USD salary settlement');
  await d.locator('[data-rates] input').fill(String(payday));
  await line(0,'debit').pressSequentially(String(qty));
  assert.equal(await line(0,'debit').inputValue(),'1,234.5');
  const generate=async()=>{
   await d.locator('[data-generate]').click();
   await page.waitForFunction(()=>!document.querySelector('#journalGenerator258 [data-use]').disabled,null,{timeout:4000})
    .catch(async()=>{throw Error(await d.locator('[data-status]').innerText()||'Generate left the draft unverified');});
   return d.locator('[data-row]').evaluateAll(rows=>rows.map(row=>Object.fromEntries(
    [...row.querySelectorAll('input[data-field]')].map(n=>[n.dataset.field,n.value]))));
  };
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
  await d.locator('[data-use]').click();await d.waitFor({state:'detached',timeout:3500}).catch(async e=>{throw Error((await d.locator('[data-status]').innerText())+' '+e.message);});
  assert.equal(await page.locator('#jeLinesBody tr').count(),6);
  assert.equal(await page.locator('#jeLinesBody tr').first().getAttribute('data-book-rate14383'),String(staffBook));
  console.log('PASS staff credit balance BR, partial salary, six ordered rows, both FX directions, commas during typing and repeat Generate, full precision copied into Post Entry.');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
