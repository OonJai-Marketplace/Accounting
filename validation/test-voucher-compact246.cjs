const assert=require('node:assert/strict'),create=require('./phase0-browser-fixture.cjs');
(async()=>{const f=await create();try{const {page,login}=await f.open();await login();
const result=await page.evaluate(()=>{
 const employee={name:'Voucher Test Employee',code:'EMP-01',position:'Cook',currency:'LAK'},x={employeeId:'e',employee,currency:'LAK',rate:1,contract:2200000,gross:2200000,paidAmount:2200000,paidLeaveDays:2,paidLeaveValue:200000,daily:100000,attendance95:[{mark:'EX:149',minutes:149,paidDays:0,deductible:0},{mark:'EX',minutes:0,paidDays:0,deductible:0}]};
 const run={month:'2026-10',reference:'PAY-2026-10',status:'draft',rows:[{employeeId:'e',employee,input:{attendance:[]}}]};
 const div=document.createElement('div');div.innerHTML=reports14254.voucher(run,x,{enabled:false});
 const details=reports14254.attendanceDetails(run,x),late=details.find(d=>d.label==='Late time'),excused=details.find(d=>d.label==='Excused late');
 return {first:div.children[0].textContent,next:div.children[1].textContent,headers:[...div.querySelectorAll('th')].map(n=>n.textContent),salaryRows:[...div.querySelector('table').querySelectorAll('tbody tr')].map(n=>n.cells[0].textContent),text:div.textContent,late,excused};
});
assert.equal(result.first,'Salary Payment Voucher');assert(result.next.startsWith('EMP-01 · Voucher Test Employee'));assert(!result.headers.includes('Voucher number'));assert(result.text.includes('PAY-2610-EMP01'));assert.deepEqual(result.salaryRows,['Contract salary','Gross earnings','Final payment']);assert(!result.text.includes('Cash advance recovery'));assert(!result.text.includes('Unpaid leave'));assert(result.text.includes('Paid leave / holiday'));assert(result.text.includes('200,000.00'));assert.equal(result.late.count,0);assert.equal(result.late.minutes,'0 / 0');assert.equal(result.excused.count,2);assert.equal(result.excused.minutes,'149 / 0');assert.equal(result.excused.deduction,0);
console.log('PASS employee below title, plain metadata, zero optional rows omitted, required salary totals retained and excused late separate from paid leave/holiday');
}finally{await f.close()}})().catch(e=>{console.error(e);process.exitCode=1});
