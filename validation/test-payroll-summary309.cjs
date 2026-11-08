const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const chart=[['5311','LAK'],['9231','USD'],['9290','LAK'],['5211','LAK'],['5212','LAK'],['2111','LAK'],['2112','LAK'],['9041','LAK'],['9042','USD'],['9011','USD'],['9010','LAK'],['5420','LAK'],['1210','LAK'],['1220','USD']].map(([code,currency])=>({id:code,code,name:({5211:"PIT Expense",5212:"SSO Expense",2111:"PIT Payable",2112:"SSO Payable",9042:"Payroll Tax Bridge – USD"}[code]||code),currency,active:true,isPosting:true}));
const round=n=>Math.round(n*100)/100,fmt=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const context={window:{},AccountingStore:{accounts:chart},ApplicationSettings:{tax:{}},payroll95:{results:r=>r.results},num:v=>Number(v)||0,money:fmt,esc:String,textStyle:'',heading:s=>'<h3>'+s+'</h3>',table:(heads,rows)=>'<table><thead><tr>'+heads.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>'};vm.createContext(context);
vm.runInContext(fs.readFileSync('src/bridges/payroll-bookkeeping/payroll-template1431.js','utf8'),context);
const report=fs.readFileSync('src/reports/financial/reports14254.js','utf8');vm.runInContext(report.slice(report.indexOf('function payrollJournalSummary309'),report.indexOf('function payroll(run,results)')),context);
const make=(id,currency,gross,ep,es,cp,cs,advance=0)=>({employeeId:id,employee:{code:id,name:'Synthetic '+id,currency,payrollAccountId:currency==='LAK'?'1210':'1220',sso:es>0},currency,gross,employeePit:ep,employeeSso:es,employerPit:cp,employerSso:cs,pit:ep+cp,pitPayable309:round(ep+cp),net:round(gross-ep-es),adjusted:round(gross-ep-es-advance),cashAdvance:advance,loanRecovery:0,reimbursement:0,rate:currency==='USD'?22294:1});
const local=make('L','LAK',4493295.45,43654.11,247131.25,43654.11,269597.73,3500000);local.pit=87308.21;
const results=[local,make('L2','LAK',1472727.27,0,0,0,0),make('F1','USD',6688200,146910,0,146910,0),make('F2','USD',7134080,169204,0,169204,0),make('F3','USD',8917600,258380,0,258380,0),make('F4','USD',7134080,169204,0,169204,0)];
const run={month:'2026-10',reference:'SYNTHETIC',status:'finalized',rates:{LAK:1,USD:22294},rateSource:'Synthetic rate',settingsSnapshot:{tax:{}},results,rows:results.map(x=>({employeeId:x.employeeId,employee:x.employee,input:{}}))},p=context.window.payrollTemplate1431,template=p.defaultTemplate(run),journal=p.evaluate(run,template);assert.deepEqual(Array.from(journal.issues),[]);assert(Object.values(journal.balances).every(x=>x.difference===0));
assert.equal(journal.lines.filter(l=>l.account.code==='5420').length,1,'one necessary conversion rounding line');assert.equal(journal.lines.find(l=>l.account.code==='5420').amount,29.84);assert.equal(journal.lines.find(l=>l.account.code==='5420').side,'CR');assert.equal(round(journal.lines.filter(l=>['9041','9042'].includes(l.account.code)).reduce((s,l)=>s+(l.side==='DR'?1:-1)*round(l.amount*l.fx_rate_lak),0)),0,'tax bridge clears across currencies');assert(!template.lines.some(r=>['pitRoundingPayable308','pitRoundingOffset308','taxConversionRounding308'].includes(r.derived274)));
const before=JSON.stringify(run),html=context.payrollJournalSummary309(run,results),dom=new JSDOM(html),doc=dom.window.document;
const rows=table=>Object.fromEntries([...table.querySelectorAll('tbody tr')].map(tr=>[tr.cells[0].textContent,[...tr.cells].slice(1).map(x=>Number(x.textContent.replaceAll(',','')))]));
const totals=rows(doc.querySelector('table')),foreign=rows(doc.querySelector('[data-payroll-journal-currency309] table'));
assert.deepEqual(totals['Gross salary'],[5966022.72,29873960,35839982.72]);assert.deepEqual(totals['Net salary payable'],[2175237.36,29130262,31305499.36]);assert.deepEqual(totals['PIT withheld — employee'],[43654.11,743698,787352.11]);assert.deepEqual(totals['PIT expense — company'],totals['PIT withheld — employee']);assert.deepEqual(totals['Total PIT payable'],[87308.22,1487396,1574704.22]);assert.deepEqual(totals['Total SSO payable'],[516728.98,0,516728.98]);
assert.deepEqual(foreign['Gross salary'],[1340,29873960]);assert.deepEqual(foreign['Net salary payable'],[1306.64,29130232.16]);assert.deepEqual(foreign['PIT withheld — employee'],[33.36,743727.84]);assert.equal(foreign['Payroll conversion rounding · CR'][1],29.84);assert(!('Loan recovery allocation' in totals));
for(const [basis,label] of [['gross','Gross salary'],['adjusted','Net salary payable'],['employeePit','PIT withheld — employee']]){const lines=journal.lines.filter(l=>l.account.currency==='USD'&&template.lines[l.ruleIndex].basis===basis);assert.equal(foreign[label][0],round(lines.reduce((s,l)=>s+l.amount,0)));assert.equal(foreign[label][1],round(lines.reduce((s,l)=>s+round(l.amount*l.fx_rate_lak),0)));}
assert.equal(totals['Total PIT payable'][2],round(journal.lines.filter(l=>l.account.code==='2111').reduce((s,l)=>s+(l.side==='CR'?l.amount:-l.amount),0)));assert.equal(totals['Total SSO payable'][2],round(journal.lines.filter(l=>l.account.code==='2112').reduce((s,l)=>s+(l.side==='CR'?l.amount:-l.amount),0)));assert.equal(JSON.stringify(run),before);
// Currency and per-employee rounding must not merge mixed foreign rates.
const missing=context.payrollJournalSummary309({...run,rates:{USD:0}},results);assert.match(missing,/saved exchange rate is missing/);assert.doesNotMatch(missing,/NaN|Infinity/);
// Saved 308 templates remove both obsolete pairs, while retaining unrelated rows.
const legacy=structuredClone(template);legacy.lines.push({...legacy.lines[0],derived274:'taxConversionRounding308'},{...legacy.lines[0],derived274:'pitRoundingPayable308'},{...legacy.lines[0],derived274:'pitRoundingOffset308'});assert.equal(JSON.stringify(p.upgrade308(legacy)),JSON.stringify(template));
dom.window.close();console.log('PASS journal summary matches synthetic posted-line quantities, per-line USD equivalents, local/foreign and grand totals, equal PIT, SSO, recoveries, zero omission and immutable saved payroll; obsolete split rounding pairs removed; foreign tax bridge clears with one conversion rounding credit.');

// Preserve fractional inputs until the posting rule's rounding boundary.
for(const [input,count,grouped,separate] of [[0.005,3,0.02,0.03],[3.005,3,9.02,9.03],[20.075,3,60.23,60.24],[20.075,5,100.38,100.40]]){
 const employees=Array.from({length:count},(_,i)=>({...local,employeeId:'R'+i,gross:input,adjusted:input}));
 const sample={...run,results:employees};
 const debit={account:'5311',expectedCurrency:'LAK',basis:'gross',side:'DR',scope:'total'};
 const credit={...debit,account:'1210',side:'CR'};
 const build=(d,c)=>p.buildLines(sample,{lines:[d,c]});
 assert.deepEqual(Array.from(build(debit,credit),l=>l.amount),[grouped,grouped]);
 const split=build({...debit,scope:'each'},{...credit,scope:'each'});
 assert.equal(p.roundedTotal(split.filter(l=>l.side==='CR').map(l=>l.amount)),separate);
 assert.throws(()=>build(debit,{...credit,scope:'each'}),/balance/);
 const doc=new JSDOM(context.payrollJournalSummary309(sample,employees));
 const summary=rows(doc.window.document.querySelector('table'));
 assert.equal(summary['Gross salary'][2],grouped);
 assert.equal(summary['Net salary payable'][2],separate);
 doc.window.close();
}
assert.equal(p.roundedTotal([40.15,40.15,40.15],2),60.23);
assert.equal(p.roundedTotal([-0.005,-0.005,-0.005]),-0.02);
assert.equal(p.roundedTotal([1e-7,0.0049999]),0.01);
console.log('PASS grouped and individual payroll lines, printed totals, exact rate conversion and mismatched posting rejection.');
