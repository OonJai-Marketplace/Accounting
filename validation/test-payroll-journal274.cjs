const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const chart=[['5311','LAK','Salaries – LAK'],['9231','USD','Salaries — USD Mapping'],['9232','THB','Salaries — THB Mapping'],['9290','LAK','Expense Mapping'],['5211','LAK','PIT Expense'],['5212','LAK','SSO Expense'],['2111','LAK','PIT Payable'],['2112','LAK','SSO Payable'],['9041','LAK','Payroll Tax Bridge – LAK'],['9042','USD','Payroll Tax Bridge – USD'],['9011','USD','FX Exchange Bridge'],['9012','THB','FX Exchange Bridge'],['9010','LAK','FX Exchange Bridge'],['5420','LAK','Rounding Difference'],['1220','USD','Test Foreign'],['1210','LAK','Test Local'],['1224','THB','Test Thai']].map(([code,currency,name])=>({id:code,code,currency,name,active:true,isPosting:true}));
const c={window:{},AccountingStore:{accounts:chart},ApplicationSettings:{tax:{}},payroll95:{results:r=>r.results}};vm.createContext(c);vm.runInContext(fs.readFileSync('src/bridges/payroll-bookkeeping/payroll-template1431.js','utf8'),c);const p=c.window.payrollTemplate1431;
const employee=(id,currency,account,sso=false)=>({employeeId:id,employee:{name:id,currency,payrollAccountId:account,sso},input:{}});
const result=(id,currency,gross,pit=0,sso=0,employerPit=0,employerSso=0)=>({employeeId:id,currency,gross,employeePit:pit,employeeSso:sso,employerPit,employerSso,adjusted:gross-pit-sso,cashAdvance:0,loanRecovery:0,reimbursement:0});
const run=(rows,results,rates={USD:22000,THB:650})=>({status:'finalized',reference:'TEST-PAY',month:'2026-10',rateDate:'2026-10-30',rateSource:'Verified fixture',rates:{LAK:1,...rates},settingsSnapshot:{tax:{}},rows,results});
const evalRun=r=>{const before=JSON.stringify(r),t=p.defaultTemplate(r),e=p.evaluate(r,t);assert.equal(JSON.stringify(r),before,'input payroll is immutable');return {t,e};};
const signed=(e,code)=>e.lines.filter(l=>l.account.code===code).reduce((n,l)=>n+(l.side==='DR'?l.amount:-l.amount),0);
const balanced=e=>{assert.deepEqual(Array.from(e.issues),[]);for(const b of Object.values(e.balances))assert.equal(b.difference,0);};
let r=run([employee('foreign','USD','1220')],[result('foreign','USD',22000000,1100000)]),{t,e}=evalRun(r);balanced(e);
assert.equal(signed(e,'9231'),1000);assert.equal(signed(e,'1220'),-950);assert.equal(signed(e,'9042'),-50);assert.equal(signed(e,'9041'),1100000);assert.equal(signed(e,'2111'),-1100000);assert.equal(signed(e,'5211'),0);assert.equal(signed(e,'5311'),22000000);assert.equal(signed(e,'9290'),-22000000);assert.equal(signed(e,'9011'),0);assert.equal(signed(e,'5420'),0);assert(e.lines.filter(l=>l.account.currency==='USD').every(l=>l.fx_rate_lak===22000));
r=run([employee('local','LAK','1210',true)],[result('local','LAK',3000000,100000,50000,200000,60000)]);({e}=evalRun(r));balanced(e);assert.equal(signed(e,'1210'),-2850000);assert.equal(signed(e,'5211'),200000);assert.equal(signed(e,'2111'),-300000);assert.equal(signed(e,'2112'),-110000);
r=run([employee('foreign','USD','1220',true),employee('local','LAK','1210')],[result('foreign','USD',22294000,903421,123456,250000,300000),result('local','LAK',5000000,100000)],{USD:22294});({t,e}=evalRun(r));balanced(e);assert.equal(signed(e,'5311'),27294000,'saved salary expense retained');assert.equal(signed(e,'5211'),250000,'employee PIT never charged to employer');assert.equal(signed(e,'2111'),-1253421,'saved tax obligation retained');assert.equal(signed(e,'2112'),-423456);assert.equal(signed(e,'9042'),-46.06);assert.equal(signed(e,'5420'),15.36,'salary conversion residual is recorded separately so tax bridges clear');assert(e.lines.every(l=>l.account.code!=='5419'),'no settlement FX at accrual');
// Removing/editing a business amount cannot be hidden behind conversion rows.
let bad=structuredClone(t);bad.lines.find(l=>l.basis==='employeePit'&&l.expectedCurrency==='USD').manual='0';assert.throws(()=>p.buildLines(r,bad),/source amounts/);
bad=structuredClone(t);bad.lines.find(l=>l.basis==='gross'&&l.expectedCurrency==='LAK'&&l.employees==='USD').manual='10';assert.throws(()=>p.buildLines(r,bad),/mapping rows/);
bad=structuredClone(t);bad.lines.find(l=>l.basis==='adjusted'&&l.employees==='USD').manual='900';assert.throws(()=>p.buildLines(r,bad),/source amounts/);
assert.throws(()=>p.buildLines({...r,rateSource:''},t),/source/);assert.throws(()=>p.buildLines({...r,rates:{LAK:1}},t),/exchange rate/);
const thb=run([employee('thai','THB','1224')],[result('thai','THB',650000)]);balanced(evalRun(thb).e);thb.results[0]=result('thai','THB',650000,5000);assert.throws(()=>p.buildLines(thb,p.defaultTemplate(thb)),/Choose THB account/);
const advance=run([employee('local','LAK','1210')],[{...result('local','LAK',3000000),adjusted:2100000,cashAdvance:900000}]);({e}=evalRun(advance));balanced(e);assert.equal(signed(e,'1210'),-3000000,'accrual retains whole entitlement; payment/advance settlement separate');
assert.equal(p.journalDate(r),'2026-10-31');assert.equal(p.journalDate(r,{journalDate:'2026-10-30'}),'2026-10-30');assert.throws(()=>p.journalDate(r,{journalDate:''}),/valid/);assert.throws(()=>p.journalDate(r,{journalDate:'2026-02-30'}),/valid/);
console.log('PASS payroll protocol cases: local, USD, mixed, THB, PIT/SSO, rounding, saved rates/date, advances, missing/edited rows and input immutability. No posting performed.');

// The payroll module and the journal generator must use the same reviewed chart.
const savedLayout=p.defaultTemplate(r),snapshot=JSON.stringify(savedLayout),oldExpense=signed(p.evaluate(r,savedLayout),'5311');
for(const a of chart){a.isTechnical=/^9/.test(a.code);a.type=a.isTechnical?'SYSTEM':/^5/.test(a.code)?'EXPENSE':/^2/.test(a.code)?'LIABILITY':'ASSET';}
for(const [code,currency] of [['5316','USD'],['5317','THB'],['5124','USD']])chart.push({id:code,code,currency,name:code,type:'EXPENSE',active:true,isPosting:true});
vm.runInContext(fs.readFileSync('src/bookkeeping/journal/completion-core258.js','utf8'),c);
c.window.JournalCompletion258=c.JournalCompletion258;
for(const template of [p.defaultTemplate(r),p.upgrade308(savedLayout)]){
 const evaluated=p.evaluate(r,template);balanced(evaluated);
 assert.equal(signed(evaluated,'5316'),1000);
 assert.equal(signed(evaluated,'5311')+signed(evaluated,'5316')*r.rates.USD,oldExpense);
 assert.equal(signed(evaluated,'9231'),0);assert.equal(signed(evaluated,'9290'),0);
 assert.equal(signed(evaluated,'2111'),-1253421);assert.equal(signed(evaluated,'2112'),-423456);
 assert.equal(signed(evaluated,'5420'),15.36);assert.equal(evaluated.lines.find(l=>l.account.code==='5316').book_rate_lak,22294);
 assert.deepEqual(p.upgrade308(template),template);
}
assert.equal(JSON.stringify(savedLayout),snapshot);
const edited=structuredClone(savedLayout);
edited.lines.find(l=>l.basis==='gross'&&l.employees==='USD'&&l.expectedCurrency==='LAK').manual='100';
assert.throws(()=>p.buildLines(r,edited),/saved payroll layout/);
const expenseRun=run([employee('one','USD','1220')],[{...result('one','USD',22000040,211123),reimbursement:199940,adjusted:21988857}]);
const expenseLayout=p.defaultTemplate(expenseRun);
expenseLayout.lines.find(l=>l.basis==='reimbursement').account='5124';
const withReimbursement=p.evaluate(expenseRun,expenseLayout);balanced(withReimbursement);
assert.equal(signed(withReimbursement,'5124'),9.09);assert.equal(signed(withReimbursement,'9290'),0);
const simpleThai=run([employee('thai','THB','1224')],[result('thai','THB',650000)]);
const thaiEval=evalRun(simpleThai).e;balanced(thaiEval);assert.equal(signed(thaiEval,'5317'),1000);
console.log('PASS regular USD/THB payroll, saved template migration, mixed salaries, direct reimbursement, historical immutability and rounding.');
