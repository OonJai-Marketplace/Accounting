const assert=require('node:assert/strict');
global.window=global;
const chart=[];
function add(currency,type,codes,technical=false){
 for(const code of codes.split(' '))chart.push({id:code,code,name:code,currency,baseType:type,isTechnical:technical,isPosting:true,active:true});
}
add('USD','ASSET','1041 1220 1314');add('USD','EXPENSE','5121 5316 5422 5424');
add('USD','EQUITY','3028 3029');add('USD','SYSTEM','9011 9042 9211 9231 9241 9311 9321',true);
add('LAK','ASSET','1040');add('LAK','EXPENSE','5111 5311 5414 5419 5420 5421 5211 5212');
add('LAK','EQUITY','3023 3024');add('LAK','LIABILITY','2111 2112');
add('LAK','SYSTEM','9010 9041 9290 9390',true);add('THB','ASSET','1312');add('THB','EXPENSE','5123');
const names={9042:'Payroll Tax Bridge – USD',5211:'PIT Expense',5212:'SSO Expense',2111:'PIT Payable',2112:'SSO Payable'};
for(const a of chart)a.name=names[a.code]||a.code;
global.AccountingStore={accounts:chart};global.ApplicationSettings={tax:{}};
require('../src/bookkeeping/journal/completion-core258.js');
require('../src/bookkeeping/templates/generation-catalog268.js');
require('../src/bookkeeping/recurring/plan-model280.js');
require('../src/bridges/payroll-bookkeeping/payroll-template1431.js');
const G=JournalCompletion258,C=JournalTemplateCatalog268,templates=C.templates(chart);
const layout=id=>templates.find(t=>t.id==='gen268-'+id).lines;
assert.deepEqual(layout('mapping-9211-USD').map(x=>x.code||x.role),['5121','fund']);
assert.deepEqual(layout('mapping-9321-USD').map(x=>x.code).slice(0,2),['3028','3029']);
assert.deepEqual(layout('support-deposit-USD').map(x=>x.code||x.role),['staff','3028','fund','staff']);
assert.equal(layout('payroll-USD')[0].code,'5316');
const line=(account_id,debit,credit,book_rate_lak,role)=>({account_id,debit,credit,book_rate_lak,role});
function complete(rows,rate=22000){
 const result=G.complete({chart,rows,rates:{USD:rate},balances:{}});assert.deepEqual(result.errors,[]);
 return result.rows.filter(l=>l.debit||l.credit);
}
let result=complete([line('5121',10,0),line('1041',0,10,22000)]);
assert.deepEqual(result.map(l=>l.account_id),['5121','1041']);
result=complete([line('5422',0.5,0),line('1041',0,0.5,22010)],22020);
assert.equal(result.find(l=>l.account_id==='5422').fx_rate_lak,22020);
assert.equal(result.find(l=>l.account_id==='1041').book_rate_lak,22010);
assert.equal(result.find(l=>l.account_id==='5419').credit,5);
result=complete([line('1220',100,0,22000,'balance'),line('1041',0,100,22010)]);
assert.deepEqual(result.map(l=>l.account_id),['1220','1041','9011','9011','5419','9010']);
assert.equal(result[4].debit,1000);
result=complete([line('5424',500,0),line('1314',0,500,22123)],23000);
assert.equal(result.length,2);assert(result.every(l=>l.book_rate_lak===22123&&l.fx_rate_lak===22123));
const config={kind:'amortization',amount_basis:'total',allocation:'equal',posting_day:'first',start:'2027-01-01',end:'2027-03-31'};
const releases=JournalPlanModel280.preview(config,[line('5123',3,0,675.123),line('1312',0,3,675.123)],chart);
assert.deepEqual(releases.map(r=>r.lines.length),[2,2,2]);
assert.equal(releases.reduce((n,r)=>n+Math.round(100*r.lines[0].debit*r.lines[0].book_rate_lak),0),202537);
const payroll={month:'2027-01',status:'finalized',reference:'TEST',rates:{USD:22000},rateSource:'Payroll fixture',settingsSnapshot:{tax:{}},rows:[{employeeId:'a',employee:{name:'Test',currency:'USD',payrollAccountId:'1220'},input:{}}],results:[{employeeId:'a',currency:'USD',gross:22000000,adjusted:20900000,employeePit:1100000}]};
const template=payrollTemplate1431.defaultTemplate(payroll);
result=payrollTemplate1431.buildLines(payroll,template);
assert.deepEqual(result.map(x=>x.account.code),['5316','1220','9042','9041','2111']);
assert.equal(result[0].amount,1000);
const receiptAndUse=[
 line('1220',50,0,22000),line('3028',0,50,22000),line('1041',50,0,22000),line('1220',0,50,22000),
 line('3028',70,0,21000),line('3029',0,70,21000)
];
result=complete(receiptAndUse);
assert.deepEqual(result.map(l=>[l.account_id,l.debit,l.credit]).slice(-2),[['3028',70,0],['3029',0,70]]);
assert.equal(result.length,6);
assert.deepEqual(complete(result),result);
const combinedLayout=layout('support-deposit-allocation-USD');
assert.deepEqual(combinedLayout.filter(l=>!l.calculated).map(l=>l.stage),['Receipt','Receipt','Receipt','Receipt','Allocation','Allocation']);
assert(G.complete({chart,rows:receiptAndUse.map(l=>l.account_id==='3028'?{...l,account_id:'9311'}:l),rates:{USD:22000}}).errors.length);
const local={...payroll,rows:['a','b'].map(employeeId=>({employeeId,employee:{name:employeeId,currency:'LAK',payrollAccountId:'1040'}})),
 results:['a','b'].map(employeeId=>({employeeId,currency:'LAK',gross:100.006,adjusted:100.006}))};
const lt=payrollTemplate1431.defaultTemplate(local),snapshot=JSON.stringify(local);
result=payrollTemplate1431.buildLines(local,lt);
assert.deepEqual(result.filter(l=>l.account.code==='5420').map(l=>[l.side,l.amount]),[['DR',0.01]]);
assert.equal(JSON.stringify(local),snapshot);
const underpaid=structuredClone(local);underpaid.results[0].adjusted-=0.01;
assert.throws(()=>payrollTemplate1431.buildLines(underpaid,lt),/balance/);
const tinyTax={...payroll,results:[{employeeId:'a',currency:'USD',gross:22000000,adjusted:21999990,employeePit:10}]};
result=payrollTemplate1431.buildLines(tinyTax,payrollTemplate1431.defaultTemplate(tinyTax));
assert(result.some(l=>l.account.code==='2111'&&l.amount===10&&l.side==='CR'));
assert(!result.some(l=>l.account.code==='9042'));
const edited=structuredClone(template);edited.lines.find(r=>r.basis==='gross').account='9231';
assert.throws(()=>payrollTemplate1431.buildLines(payroll,edited),/Review this payroll rule/);
console.log('Direct purchase, bank fee, salary settlement, owner support, amortization and payroll passed.');
