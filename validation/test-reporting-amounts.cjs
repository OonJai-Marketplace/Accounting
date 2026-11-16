const assert=require('node:assert/strict');
const create=require('./phase0-browser-fixture.cjs');

(async()=>{
 const app=await create();
 try{
  const {page,login}=await app.open();await login();
  const result=await page.evaluate(async()=>{
   const accounts=[
    ['5000','Kitchen Supplies – LAK','LAK'],['5001','Kitchen Supplies — USD','USD'],
    ['5002','Kitchen Supplies — THB','THB'],['5100','Unlinked supplies','USD']
   ].map(([code,name,currency])=>({id:code,code,name,currency,type:'EXPENSE',baseType:'EXPENSE',isPosting:true}));
   const source=(code,date,debit,credit,rate)=>({date,id:'POST-'+code+'-'+date,accountId:code,accountCode:code,account:accounts.find(a=>a.code===code).name,currency:accounts.find(a=>a.code===code).currency,debit,credit,base_debit:debit*rate,base_credit:credit*rate,book_rate_lak:rate,fx_rate_lak:rate,fxRateKind288:'valuation',status:'posted'});
   const rows=[source('5000','2026-10-03',50,0,1),source('5001','2026-09-01',10,0,20),source('5001','2026-10-01',10,0,30),source('5002','2026-10-04',2,0,5),source('5100','2026-10-04',1,0,25),source('5001','2026-11-01',50,0,1000)];
   AccountingStore.accounts=accounts;AccountingStore.subAccounts=['5001','5002'].map(id=>({postingAccountId14285:id,reportLakId:'5000'}));
   const original=JSON.stringify(rows);JournalModule.entries=rows;
   const snapshot=reportWindow143195.snapshot;reportWindow143195.snapshot=()=>({rows,opening:[]});
   const state={...Reports79};const from='2026-10-01',to='2026-10-31';
   try{
    for(const key of ['2026-08','2026-09','2026-10'])PeriodReview.periods[key]={status:'closed'};
    Object.assign(Reports79,{kind:'tb',mode:'monthly',month:'2026-10',year:2026,from,to,basis:'reporting',currency:'',query:'',account:'',selectedMonths14331:null,allMonths14331:false});
    const tb=reportModel79('tb'),pl=reportModel79('pl'),bs=reportModel79('bs');
    const printed=reportFormats14282.financial('tb');
    let csv;const save=exportCenter14337.fromLink;exportCenter14337.fromLink=async a=>{csv=await (await fetch(a.href)).text()};try{await exportReport79('tb')}finally{exportCenter14337.fromLink=save}
    Reports79.account='report:5000';const gl=reportModel79('gl');Reports79.account='';
    const compare=monthlyTrialModel(rows,['2026-09','2026-10'],{basis:'reporting',columns:'balance'});
    const comparePrinted=monthlyTrialTable(compare,true);
    const missing={...source('5100','2026-10-20',1,0,10),base_debit:null,book_rate_lak:null,fx_rate_lak:null};
    rows.push(missing);const review=reportModel79('tb');rows.pop();
    Reports79.basis='original';const native=reportModel79('gl');
    return {tb,pl,bs,gl,printed,csv,compare,comparePrinted,review,native,displayDate:formatAppDate(to),unchanged:original===JSON.stringify(rows),html:reportTable79(gl[2].headers,gl[2].values,gl[2].currency)};
   }finally{Object.assign(Reports79,state);reportWindow143195.snapshot=snapshot}
  });
  const {tb,pl,bs,gl,compare,review}=result;
  const summary=tb[0].values.find(r=>r[0]==='5000 · Kitchen Supplies');
  const number=v=>Number(v.replace(/,/g,''));
  assert.deepEqual(summary.slice(2).map(number),[250,310,0,560]);
  assert.equal(tb[0].values.length,2);assert.equal(tb[1].values.length,4);
  assert.equal(tb[1].values.find(r=>r[2]==='THB')[4],'5 LAK/THB');
  assert.ok(tb[1].values.every(r=>r[5]==='2026-10-31'));
  assert.equal(number(pl[0].values.find(r=>r[0].startsWith('5000'))[4]),310);
  assert.equal(number(bs.filter(g=>g.currency.startsWith('Reporting Amount')).at(-1).values.at(-1)[2].replace(/[()]/g,'')),585);
  assert.equal(gl[2].values.length,3);assert.match(JSON.stringify(gl[2].values),/VR 30 \/ BR 30 LAK\/USD/);
  assert.match(result.html,/data-entry="POST-5001/);
  for(const content of [result.printed,result.csv])for(const value of ['Kitchen Supplies','25 LAK/USD',content===result.csv?'2026-10-31':result.displayDate,'560'])assert.ok(content.includes(value),value);
  assert.ok(result.comparePrinted.includes('2026-09-30'));assert.deepEqual(compare.values[0].slice(1).map(number),[200,560]);
  assert.ok(JSON.stringify(compare.values).includes('20 LAK/USD'));
  assert.ok(review[0].values.some(r=>r[0].includes('Unlinked')&&r.at(-1)==='Review'));assert.ok(review[0].note.includes('Closing debit'));
  assert.match(JSON.stringify(result.native),/VR 30 \/ BR 30 LAK\/USD/);assert.ok(result.unchanged);
  console.log('PASS grouped dated rates, combined/native totals, changing monthly rate, statements, selected ledger and original evidence, missing rate, printable tables and CSV');
 }finally{await app.close()}
})().catch(error=>{console.error(error);process.exit(1)});
