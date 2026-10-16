/* Midnight/month rollover checks on current screens; no saved company records. */
const assert=require('node:assert/strict');
process.env.FIXTURE_TIME='2026-09-30T18:30:00Z';
process.env.FIXTURE_TIMEZONE='Asia/Vientiane';
const create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{
 const {page,login}=await f.open();await login();
 const result=await page.evaluate(()=>{
  switchTab('tax-pit');const tax=document.querySelector('.tab-content.active input[type=month]')?.value;
  const period=staffJournalMonth();switchTab('journal');setTransactionDateToToday(true);
  const today=document.querySelector('#jeTransDate')?.value;
  return {tax,period,today};
 });
 assert.deepEqual(result,{tax:'2026-10',period:'2026-10',today:'2026-10-01'});
 console.log('PASS tax report, staff period and entry date use the local day/month after Lao midnight');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
