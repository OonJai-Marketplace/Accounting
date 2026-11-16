const assert = require('node:assert/strict');
require('../src/bookkeeping/journal/completion-core258.js');
require('../src/bookkeeping/templates/generation-catalog268.js');
const G = global.JournalCompletion258;
const C = global.JournalTemplateCatalog268;

// In-memory chart and transactions. IDs deliberately differ from account codes.
const chart = [];
function accounts(currency, type, codes) {
 for (const code of codes.split(' ')) chart.push({id:'id-'+code, code, name:code, currency, baseType:type, isTechnical:type==='SYSTEM'});
}
accounts('USD','ASSET','1018 1041 1220 1222 1314');
accounts('THB','ASSET','1017 1224 1312');
accounts('LAK','ASSET','1016 1040 1210 1310');
accounts('LAK','LIABILITY','2111 2112');
accounts('LAK','EQUITY','3023 3024');
accounts('USD','REVENUE','4020 4111 4121 4131');
accounts('THB','REVENUE','4021 4112 4132');
accounts('LAK','REVENUE','4010 4110 4120 4130');
accounts('USD','EXPENSE','5011 5121 5124 5316 5320 5422 5424');
accounts('THB','EXPENSE','5012 5122 5123 5317 5321 5423');
accounts('LAK','EXPENSE','5010 5111 5119 5120 5211 5212 5311 5315 5414 5419 5420 5421');
accounts('USD','SYSTEM','9011 9042 9102 9111 9121 9131 9202 9211 9231 9233 9241 9251 9311 9321 9411');
accounts('THB','SYSTEM','9012 9101 9112 9132 9201 9212 9222 9232 9234 9242');
accounts('LAK','SYSTEM','9010 9041 9190 9290 9390 9490');
const byId = new Map(chart.map(a=>[a.id,a]));
const catalog = [...C.templates(chart), ...C.currencyTemplates(chart)];
const reg = G.registry(chart);
assert.equal(reg.regular.size,21);
const slots = {fund:{LAK:'1040',USD:'1041',THB:'1017'},staff:{LAK:'1210',USD:'1222',THB:'1224'},
 repayment:{USD:'1220'},balance:{USD:'1222'}};
function layout(id) {
 const t=catalog.find(t=>t.id===id||t.id==='gen268-'+id);
 assert(t,id);
 return t.lines.map(l=>({account_id:'id-'+(l.code||slots[l.role]?.[l.currency||'USD']), role:l.role,
  expectedSide:l.side,stage:l.stage,optionalStage:l.optionalStage,
  debit:0,credit:0,...(l.calculated?{generated:'output'}:{})}));
}
const moneyLine=(code,debit,credit,props={})=>({account_id:'id-'+code,debit,credit,...props});
const balances={'id-1041':{quantity:10000,rate:22910.123456789},'id-1018':{quantity:400,rate:22100},'id-1017':{quantity:50000,rate:650},
 'id-1220':{quantity:400,rate:22960},'id-1222':{quantity:-600,rate:22848}};
const rates={USD:23005, THB:670};
function run(rows,options={}) {
 const input={chart,rates,balances,rows,...options};
 const result=G.complete(input);
 assert.deepEqual(result.errors,[]);
 const again=G.complete({...input,rows:result.rows});
 assert.deepEqual(again.errors,[]);
 assert.deepEqual(again.rows,result.rows,'second Generate changed the journal');
 let base=0;
 const totals=new Map();
 for(const l of result.rows){
  const a=byId.get(l.account_id),n=l.debit-l.credit;if(!n)continue;
  totals.set(a.currency,G.round((totals.get(a.currency)||0)+n));
  base=G.round(base+G.round(n*(a.currency==='LAK'?1:l.book_rate_lak)));
 }
 assert.equal(base,0);
 for(const n of totals.values())assert.equal(n,0);
 return result.rows.filter(l=>l.debit||l.credit);
}
const amount=(rows,code)=>G.round(rows.filter(l=>l.account_id==='id-'+code).reduce((sum,l)=>sum+l.debit-l.credit,0));
const codes=rows=>rows.map(l=>byId.get(l.account_id).code);
for(const t of catalog)for(const l of t.lines)if(l.code)assert(!reg.superseded(reg.byCode(l.code,l.currency)),t.id+' uses '+l.code);
for(const [id,rule] of reg.regular) {
 const {code,c,legacy,localCode}=rule;
 const salary=localCode==='5311',idPart=salary?'payroll-'+c:'mapping-'+(legacy||code)+'-'+c;
 const rows=layout(idPart);
 const target=rows.find(l=>l.account_id===id);
 assert(target, idPart);target[target.expectedSide]=10;
 const result=run(rows);
 assert.equal(Math.abs(amount(result,code)),10);
 assert.equal(result.find(l=>l.account_id===id).book_rate_lak,rates[c]);
 assert.equal(amount(result,localCode),0);
}
let rows=layout('mapping-9241-USD');
rows[0].debit=0.75;
let result=run(rows);
assert.equal(result.length,6);
assert.equal(G.round(result[0].debit*result[0].book_rate_lak),17253.75);
assert.equal(G.round(result[1].credit*result[1].book_rate_lak),17182.59);
assert.equal(amount(result,'5419'),-71.16);assert.equal(amount(result,'9010'),71.16);
assert.equal(result.filter(l=>l.account_id==='id-9011').length,2);
assert.equal(run(rows,{balances:{'id-1041':{quantity:10,rate:23005}}}).length,2);
assert.equal(amount(run(rows,{balances:{'id-1041':{quantity:10,rate:23175}}}),'5419'),127.5);
rows=layout('amortization-restaurant');rows[0].debit=12000;rows[1].book_rate_lak=645.3219876;
result=run(rows,{rates:{THB:720}});
assert.deepEqual(codes(result),['5123','1312']);
assert(result.every(l=>l.fx_rate_lak===645.3219876&&l.book_rate_lak===645.3219876));
assert.equal(G.round(result[0].debit*result[0].book_rate_lak),7743863.85);
delete rows[1].book_rate_lak;
assert(G.complete({chart,balances:{},rates,rows}).errors.some(e=>e.needsBook));
rows=[moneyLine('5424',375,0),moneyLine('5424',375,0),moneyLine('1314',0,750,{book_rate_lak:22830})];
assert.equal(run(rows).length,3);
rows=layout('fee-9411-USD');
rows[0].debit=1600;rows[1].credit=1600;rows[2].debit=.12;rows[3].credit=.12;
for(const l of rows.slice(2,4))l.fx_rate_lak=2700/.12;
result=run(rows,{rates:{USD:22830},balances:{'id-1041':{quantity:4000,rate:22910.123456789}}});
assert.equal(result.length,8);assert.equal(amount(result,'5419'),128246.74);
rows=layout('payroll-pit-USD');rows[0].debit=100;rows[1].credit=95;
result=run(rows,{rates:{USD:22848}});
assert.deepEqual(codes(result).sort(),['5316','1222','9042','2111','9041'].sort());
assert.equal(amount(result,'2111'),-114240);assert.equal(amount(result,'9041'),114240);
rows=layout('mixed-payroll');rows[0].debit=750000;rows[1].credit=750000;rows[2].debit=250;
assert.deepEqual(codes(run(rows)).sort(),['5311','1210','5316','1222'].sort());
rows=layout('mixed-payroll-deductions');
for(const [i,n] of [1000000,900000,1000,999,1,1500,6000,114318,16000].entries())rows[i][rows[i].expectedSide]=n;
assert(G.complete({chart,balances,rates:{USD:22848},rows}).errors.length,'Require evidence for the rounding difference');
rows.push(moneyLine('5420',0,30));
result=run(rows,{rates:{USD:22848}});
assert.equal(amount(result,'9041'),22848);assert.equal(amount(result,'5419'),0);
assert.equal(amount(result,'5311'),1000000);assert.equal(amount(result,'5316'),1000);
rows=layout('settlement-USD');rows[0].debit=100;
assert.equal(run(rows).length,6);
rows=layout('housing-repayment-USD');rows[0].debit=95;rows[1].credit=35;rows[2].credit=60;
assert.deepEqual(codes(run(rows,{rates:{USD:22960}})),['1041','1220','4121']);
rows=layout('expense-reimbursement-fee-USD');rows[0].debit=145;rows[1].debit=18.25;rows[2].credit=163.25;rows[3].debit=.12;rows[4].credit=.12;
result=run(rows,{rates:{USD:23050}});
assert.equal(amount(result,'5124'),145);assert.equal(amount(result,'5422'),.12);
rows=layout('fx14383-expense');rows.find(l=>l.account_id==='id-5011').debit=15;
result=run(rows);assert.equal(amount(result,'5011'),15);assert(!codes(result).includes('5010'));
rows=layout('fx14383-income');rows.find(l=>l.account_id==='id-1018').debit=100;rows.find(l=>l.account_id==='id-1016').debit=35000;
result=run(rows);assert.equal(amount(result,'4020'),-100);assert.equal(amount(result,'4010'),-35000);assert.equal(result.length,4);
rows=layout('tender-THB-change-LAK');rows[0].debit=600;rows[1].credit=361500;rows[2].credit=40500;
result=run(rows,{tenderWithChange:true});
assert.equal(amount(result,'4010'),-361500);assert.equal(amount(result,'9012'),-600);
assert.equal(amount(result,'9010'),402000);assert.equal(amount(result,'5419'),0);
rows[2].credit=90000;
assert(G.complete({chart,balances,rates,rows,tenderWithChange:true}).errors.length);
rows=layout('tender-USD-change-LAK');rows[0].debit=20;rows[1].credit=400000;rows[2].credit=60100;
result=run(rows,{tenderWithChange:true});
assert.equal(amount(result,'4010'),-400000);assert.equal(amount(result,'9011'),-20);assert.equal(amount(result,'9010'),460100);
rows[1].credit=460100;
assert(G.complete({chart,balances,rates,rows,tenderWithChange:true}).errors.length);
const stale=G.complete({chart,rates,balances,rows:[moneyLine('9241',1,0),moneyLine('1041',0,1)]});
assert.match(stale.errors[0].message,/5422/);
const partial=chart.filter(a=>a.code!=='5422');
assert(!C.templates(partial).some(t=>t.id==='gen268-mapping-9241-USD'));
assert(catalog.some(t=>t.lines.some(l=>l.code==='9311')&&t.lines.some(l=>l.code==='9390')));
console.log('PASS all 21 regular accounts, native and LAK values, repeat generation, FX, payroll, tender/change, partial charts and equity exceptions.');

const fs=require('node:fs'),vm=require('node:vm');
const sample={id:'tpl-payroll-sample',name:'Monthly Payroll — Sample',generalMemo:'Payroll',lines:['Salaries & Wages (USD)','Payroll Tax Payable (LAK)','SSO Payable (LAK)'].map((account,i)=>({account,memo:'Saved memo '+i}))};
let stored=JSON.stringify([sample]);
const env={liveProfile:{id:'test'},AccountingStore:{accounts:chart},JournalTemplateCatalog268:C,localStorage:{getItem:()=>stored}};
env.window=env;vm.createContext(env);vm.runInContext(fs.readFileSync('src/bookkeeping/templates/transaction-templates.js','utf8'),env);
const saved=()=>env.availableTransactionTemplates().find(t=>t.id===sample.id);
assert.deepEqual(Array.from(saved().lines,l=>l.code||l.role),['5316','staff','9042','2111','2112','9041']);
assert.deepEqual(Array.from(saved().lines).filter(l=>['5316','2111','2112'].includes(l.code)).map(l=>l.memo),sample.lines.map(l=>l.memo));
assert.equal(stored,JSON.stringify([sample]));
stored=JSON.stringify([{...sample,lines:[{account:'My custom salary'},...sample.lines.slice(1)]}]);
assert.equal(saved().lines[0].account,'My custom salary');
console.log('PASS saved payroll sample keeps its ID and memos on the current chart, and custom edits keep their saved layout.');

const history=G.historicalMappings(chart);
assert.equal(history.get('9231'),'Use 5316 for new entries');
assert(history.has('9190')&&history.has('9290')&&history.has('9490'));
for(const code of ['5316','5422','9311','9321','9011','9042','9390'])assert(!history.has(code),code);
const newMapping={id:'other-food',code:'9261',parentCode:'9200',currency:'EUR',type:'SYSTEM'};
assert(!G.historicalMappings([...chart,newMapping]).has('9290'),'a current expense mapping keeps its shared offset');
