const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{
 const f=await create();
 try{
  const {page,login}=await f.open();
  await login();await page.waitForFunction(()=>startup14257.interactive);
  const result=await page.evaluate(async()=>{
   await journalDurable14385.initialize();
   const s=vouchers14299.state, voucher='00000000-0000-4000-8000-000000000032';
   const row={id:voucher,number:'OJM26-A1102',voucher_date:'2026-11-04',status:'issued',kind:'H',data:{},version:1};
   Object.assign(s,{actor:liveProfile.id,client:ojmDb,rows:[row],ready:true});
   const payload={p_request_key:crypto.randomUUID(),p_transaction_date:'2026-11-04',p_memo:'Voucher test',p_lines:[]};
   await journalDurable14385.create(payload,{voucher});
   const pendingText=document.querySelector('#voucherRows14299').textContent;
   const offered=()=>[...document.querySelector('#jeVoucher14299').options].some(o=>o.value===voucher);
   const pendingOffered=offered();
   let conflict='';try{await journalDurable14385.create({...payload,p_request_key:crypto.randomUUID()},{voucher});}catch(e){conflict=e.message;}
   const dbEntry=crypto.randomUUID();
   vouchers14299.acceptLinked([{...row,status:'linked',version:2,journal_entry_id:dbEntry,data:{journal:{entry_no:'OJM260378'}}}]);
   const ref=vouchers14299.journalReferences().get(dbEntry);
   return {pendingText,pendingOffered,conflict,linkedOffered:offered(),linkedText:document.querySelector('#voucherRows14299').textContent,ref};
  });
  assert.match(result.pendingText,/Pending journal sync/);assert.equal(result.pendingOffered,false);
  assert.match(result.conflict,/already belongs to a saved journal/);
  assert.equal(result.linkedOffered,false);assert.match(result.linkedText,/OJM260378/);assert.equal(result.ref,'OJM26-A1102');
  console.log('PASS reserve on local save, refuse second use, apply confirmed link, resolve Active Journal voucher');
 }finally{await f.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
