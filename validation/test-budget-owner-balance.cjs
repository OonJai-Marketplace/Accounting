const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({window:{},BudgetReport290:{kind:m=>m.type290},Date});
vm.runInContext(fs.readFileSync('src/budget/requests/owner-support-balance.js','utf8')+'\nthis.owner=BudgetOwnerBalance;',context);
const {calculate,validateShare}=context.owner;
const ref='OJM990001';
const row=(kind,amount,extra={})=>({type290:kind,currency:'USD',...(kind==='receipt'?{inflow:amount,reference:ref}:{outflow:amount}),...extra});
const report={movements:[row('receipt',100),row('spend',90),row('refund',10)]};
const evidence={amounts:[{entry_no:ref,currency:'USD',received:100,debited:90,used:90}],links:{}};
const usd=(r,e=evidence,id)=>calculate(r,id,e).rows.get('USD');
assert.equal(usd(report).balance,1000);
assert.equal(usd(report).basis,'Posted equity');
const other=row('receipt',40,{reference:'OJM990003',ownerSource:'other'});
const reviewed={movements:[row('receipt',100,{ownerSource:'owner'}),other,row('coverage',10),row('borrow',8),
 row('spend',80,{ownerAmount:70,ownerCurrency:'USD',cashDistributed:58}),
 row('spend',30000,{currency:'LAK',ownerCurrency:'USD',ownerAmount:2}),row('spend',5,{ownerCurrency:'USD',ownerAmount:0}),row('refund',10)],
 conversions:[{currency:'USD',amount:2,target:'LAK',targetAmount290:30000}]};
assert.equal(usd(reviewed,null).balance,2800);
assert.equal(usd(reviewed).difference,true);
const unposted={movements:[row('receipt',100,{ownerSource:'owner'}),row('spend',8)]};
assert.equal(usd(unposted,null).balance,null);
assert.equal(calculate(report,undefined,null).rows.size,0);
const separate={amounts:[{entry_no:ref,currency:'USD',received:100,used:0,debited:0},
 {entry_no:'OJM990002',currency:'USD',received:0,used:100,debited:100}],links:{r:'OJM990002'}};
assert.equal(usd(report,separate,'r').balance,0);
assert.equal(usd(report,{...evidence,links:{r:ref}},'r').balance,1000);
const kip=row('receipt',20000,{currency:'LAK',ownerSource:'owner',reference:'cash'});
const r=calculate({movements:[...reviewed.movements,kip]},null,evidence);
assert.equal(r.rows.get('LAK').balance,2000000);
assert.throws(()=>validateShare(row('spend',50,{ownerAmount:51,ownerCurrency:'USD'})));
const nativeReport={movements:[row('receipt',100),row('spend',50)],conversions:[{evidence:'OJM990004'}]};
const nativeEvidence={amounts:[
 {entry_no:ref,currency:'USD',received:100,used:50,debited:50},
 {entry_no:'OJM990004',currency:'USD',received:0,used:0,debited:30,exchanged_out:30,exchanged_in:0},
 {entry_no:'OJM990004',currency:'LAK',received:0,used:400000,debited:400000,exchanged_in:600000,exchanged_out:0}
],links:{}};
const native=calculate(nativeReport,null,nativeEvidence);
assert.equal(native.rows.get('USD').balance,2000);
assert.equal(native.rows.get('USD').postedUsed,5000);
assert.equal(native.rows.get('LAK').balance,20000000);
assert.equal(native.rows.get('LAK').received,0);
assert.equal(native.rows.get('LAK').exchangedIn,60000000);
assert.ok(!native.rows.get('LAK').basis.includes('Check journal'));
// Reverse exchanges credit USD Remaining without becoming new contributions.
const reversed=structuredClone(nativeEvidence);
reversed.amounts[1].exchanged_in=5;
reversed.amounts[2].exchanged_out=100000;
reversed.amounts[2].debited=500000;
assert.equal(usd(nativeReport,reversed).balance,2500);
assert.equal(calculate(nativeReport,null,reversed).rows.get('LAK').balance,10000000);
const broken=structuredClone(nativeEvidence);broken.amounts[1].debited=31;
assert.equal(usd(nativeReport,broken).balance,null);
assert.equal(usd(nativeReport,broken).basis,'Check journal match');
// A single reimbursement receipt can be supported by multiple original entries.
const combined={movements:[row('receipt',100,{reference:ref+' and OJM990005'}),row('spend',80)]};
const combinedEvidence={amounts:[{entry_no:ref,currency:'USD',received:40,used:30,debited:30},
 {entry_no:'OJM990005',currency:'USD',received:60,used:50,debited:50}],links:{}};
assert.equal(usd(combined,combinedEvidence).balance,2000);
assert.equal(usd(combined,combinedEvidence).postedReceived,10000);
const duplicate={movements:[...combined.movements,row('receipt',40)]};
assert.equal(usd(duplicate,combinedEvidence).balance,null);
const separateSpending={movements:[row('receipt',100),row('spend',120,{reference:'OJM990006'})]};
const spendEvidence={amounts:[{entry_no:ref,currency:'USD',received:100,used:0,debited:0},
 {entry_no:'OJM990006',currency:'USD',received:0,used:120,debited:120}],links:{}};
assert.equal(usd(separateSpending,spendEvidence).balance,-2000);
assert.equal(usd(separateSpending,spendEvidence).postedUsed,12000);
console.log('PASS owner receipts, gross funding, native and reverse exchanges, mismatches, combined references and missing evidence');
(async()=>{
 let calls=0,args;
 context.ojmDb={rpc:async(name,p)=>{calls++;args=p;return {data:nativeEvidence};}};
 context.liveProfile={id:'synthetic-owner'};
 const record={id:'synthetic-report',data:{movements:[...nativeReport.movements,row('spend',5,{reference:'OJM990006'})],conversions:nativeReport.conversions}};
 const [a,b]=await Promise.all([context.owner.load([record]),context.owner.load([record])]);
 assert.equal(calls,1);assert.equal(a,b);
 assert.deepEqual(Array.from(args.p_refs),[ref,'OJM990004','OJM990006']);
 await context.owner.load([record]);assert.equal(calls,1);
 context.liveProfile={id:'another-owner'};
 await context.owner.load([record]);assert.equal(calls,2);
 console.log('PASS shared targeted evidence read, allocation references, reuse and account isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
