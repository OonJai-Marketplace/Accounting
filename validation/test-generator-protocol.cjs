const assert=require('node:assert/strict');
require('../src/bookkeeping/journal/completion-core258.js');
require('../src/bookkeeping/templates/generation-catalog268.js');
const G=global.JournalCompletion258,C=global.JournalTemplateCatalog268;
function account(code,currency,type){return {id:code,code,name:code,currency,type,isTechnical:type==='SYSTEM'};}
const chart=[
 ...['1010','1210'].map(c=>account(c,'LAK','ASSET')),
 ...['1041','1220'].map(c=>account(c,'USD','ASSET')),
 ...['3023','3024'].map(c=>account(c,'LAK','EQUITY')),
 ...['5414','5419','5420'].map(c=>account(c,'LAK','EXPENSE')),
 ...['9010','9390','9290'].map(c=>account(c,'LAK','SYSTEM')),
 ...['9011','9311','9321','9241'].map(c=>account(c,'USD','SYSTEM'))];
const catalog=C.templates(chart);
function layout(id){
 return catalog.find(t=>t.id==='gen268-'+id).lines.map(l=>({
  account_id:l.code||({fund:l.currency==='LAK'?'1010':'1041',staff:'1220',payer:'1210'})[l.role],
  expectedSide:l.side,role:l.role,receiptLeg:l.receiptLeg,stage:l.stage,
  debit:0,credit:0,...(l.calculated?{generated:'output'}:{})}));
}
function calculate(rows,options={}){
 const input={chart,rates:{USD:22000},balances:{'1041':{quantity:100,rate:21000}},rows,...options};
 const result=G.complete(input);assert.deepEqual(result.errors,[]);
 const again=G.complete({...input,rows:result.rows});assert.deepEqual(again.errors,[]);
 assert.deepEqual(again.rows,result.rows);return result.rows;
}
const sum=(rows,code)=>rows.filter(l=>l.account_id===code).reduce((n,l)=>n+l.debit-l.credit,0);
let rows=layout('support-deposit-fee-USD');
rows.find(l=>l.receiptLeg==='receive').debit=80;
rows.find(l=>l.account_id==='5414').debit=3000;
const support=calculate(rows);
assert.equal(support.length,8);assert.equal(sum(support,'3023'),-1760000);assert.equal(sum(support,'1220'),0);
assert.equal(sum(support,'1210'),-3000);assert.equal(sum(support,'5419'),0);
rows=layout('support-exchange-USD-LAK');
rows.find(l=>l.stage==='Receipt'&&l.account_id==='1041').debit=100;
rows.find(l=>l.stage==='Exchange'&&l.account_id==='1041').credit=50;
rows.find(l=>l.stage==='Exchange'&&l.account_id==='1010').debit=1125000;
const compound=calculate(rows);
assert.equal(sum(compound,'5419'),-50000);
assert.equal(sum(compound,'3023'),-2200000);
assert.equal(compound.filter(l=>l.stage==='Exchange'&&l.account_id==='9011').length,3);
rows.find(l=>l.stage==='Exchange'&&l.account_id==='1041').credit=101;
assert(G.complete({chart,rows,rates:{USD:22000},balances:{'1041':{quantity:100,rate:21000}}}).errors.length);
rows=layout('mapping-9321-USD');rows[0].debit=10;rows[0].book_rate_lak=21500;rows[1].book_rate_lak=21500;
const use=calculate(rows);assert.equal(sum(use,'3023'),215000);assert.equal(sum(use,'3024'),-215000);
console.log('PASS support receipt, custody, fees, original-rate reclassification, partial exchange, weighted carrying value and duplicate-free recalculation.');
