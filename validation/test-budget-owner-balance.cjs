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
console.log('PASS owner receipts, gross funded share, paired equity, handovers, other sources, missing evidence and funding currencies');
