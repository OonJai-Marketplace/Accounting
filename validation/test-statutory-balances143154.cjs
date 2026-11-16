const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const c={window:{switchTab(){}},appLocalDate:()=> '2026-10-21',document:{readyState:'loading',addEventListener(){}},AccountingStore:{accounts:[{id:'pit',name:'PIT Payable',currency:'LAK',baseType:'LIABILITY'},{id:'vat',name:'VAT Expense',currency:'LAK',baseType:'EXPENSE'},{id:'mapping',name:'PIT Mapping',currency:'USD',baseType:'LIABILITY',isTechnical:true}]},JournalModule:{entries:[]}};
vm.createContext(c);vm.runInContext(fs.readFileSync('src/reports/tax/tax-reports-v102.js','utf8').replace('window.taxReports102={','window.testState=state;window.remittanceSummary=remittanceSummary;window.taxReports102={'),c);
c.window.testState.month='2026-02';
const line=(accountId,date,debit,credit,extra={})=>({accountId,account:c.AccountingStore.accounts.find(a=>a.id===accountId)?.name||'VAT Payable',currency:'LAK',date,debit,credit,status:'posted',...extra});
c.JournalModule.entries=[line('pit','2026-01-01',0,100),line('pit','2026-02-01',0,50),line('pit','2026-02-12',120,0),line('vat','2026-02-28',1941987,0),line('mapping','2026-02-10',0,500,{currency:'USD'}),line('pit','2026-02-12',0,999,{status:'voided'}),line('pit','2026-03-01',0,999),line('pit','2025-12-31',0,999)];
let rows=c.window.taxReports102.statutoryBalances(),pit=rows.find(r=>r.group==='PIT'),vat=rows.find(r=>r.group==='VAT');assert.equal(pit.opening,10000);assert.equal(pit.credits,5000);assert.equal(pit.reductions,12000);assert.equal(pit.due,3000);assert.equal(vat.expense,194198700);assert.equal(vat.due,0);assert.equal(rows.length,2);
c.JournalModule.entries.push(line('pit','2026-02-15',40,0));pit=c.window.taxReports102.statutoryBalances().find(r=>r.group==='PIT');assert.equal(pit.due,0);assert.equal(pit.advance,1000);
c.JournalModule.entries.push(line('unmapped','2026-02-20',0,10,{currency:'USD'}));rows=c.window.taxReports102.statutoryBalances();assert.equal(rows.find(r=>r.currency==='USD').due,1000);
console.log('Statutory balances passed: opening, additions, settlement, direct expense, advances, separate currencies and excluded records');

c.formatAppNumber=n=>Number(n).toFixed(2);
c.AccountingStore.accounts.push({id:'sso',name:'SSO Payable',currency:'LAK',baseType:'LIABILITY'});
c.JournalModule.entries=[line('pit','2026-02-01',0,50.01),line('pit','2026-02-02',0,50.01),line('sso','2026-02-02',0,21.99)];
c.window.remittanceSummary('tax-payment');
assert.deepEqual(JSON.parse(JSON.stringify(c.window.testState.exports.at(-1).rows)),[['PIT','100.02','0.98','101'],['SSO','21.99','0.01','22']]);
console.log('PASS statutory payment report and CSV use one whole-kip ceiling per obligation.');

c.AccountingStore.accounts.push(...[
 ['sale','4010','LAK','REVENUE','4000'],['usd','4020','USD','REVENUE','4000'],['thb','4021','THB','REVENUE','4000'],
 ['tender','1012','THB','ASSET','1000'],['support','4121','USD','REVENUE','4100'],['liability','2110','LAK','LIABILITY','2100']
].map(([id,code,currency,baseType,parentCode])=>({id,code,currency,baseType,parentCode})));
c.accountForLine69=l=>c.AccountingStore.accounts.find(a=>a.id===l.accountId);
c.ApplicationSettings={tax:{vatRate:'10'}};
c.formatAppNumber=String;
c.window.JournalFX14383={base:(l,side)=>l.currency==='LAK'?l[side]:l['base_'+side]??(l[side]?null:0)};
const fixture=(id,dr,cr,extra={})=>line(id,'2026-02-13',dr,cr,extra);
c.JournalModule.entries=[fixture('sale',0,200000),fixture('tender',300,0,{currency:'THB',base_debit:201000}),fixture('usd',0,10,{currency:'USD',base_credit:220000}),fixture('thb',0,20,{currency:'THB',base_credit:13400}),fixture('sale',4000,0),fixture('support',0,15,{currency:'USD',base_credit:330000}),fixture('liability',0,40000),fixture('liability',10000,0),fixture('sale',0,500000,{status:'voided'}),fixture('sale',0,500000,{source:'opening'})];
let sales=c.window.taxReports102.salesVat('2026-02');
assert.deepEqual(Array.from(sales.reconciliation,r=>r[1]),['429400','42940','40000','2940']);
assert.equal(sales.rows.length,3);
delete c.JournalModule.entries[2].base_credit;
assert.equal(c.window.taxReports102.salesVat('2026-02').reconciliation[1][1],'Unavailable');
console.log('PASS monthly VAT uses net merchandise and saved currency valuations, with separate liability credits.');
