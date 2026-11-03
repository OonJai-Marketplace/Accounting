const assert=require('node:assert/strict');
require('../src/bookkeeping/journal/generator-core257.js');
const G=globalThis.JournalGenerator257;
const account=(code,currency,type,name=code)=>({id:code,code,currency,type,baseType:type,name,isPosting:true,isTechnical:type==='SYSTEM'});
const chart=[account('1010','LAK','ASSET'),account('1011','USD','ASSET'),account('1012','THB','ASSET'),account('1040','LAK','ASSET'),account('1041','USD','ASSET'),account('1220','USD','ASSET','Staff Clearing'),account('2010','LAK','LIABILITY'),...['5010','5111','5311','5414','5419'].map(c=>account(c,'LAK','EXPENSE')),...['4010','4130'].map(c=>account(c,'LAK','REVENUE')),...['9010','9290','9190'].map(c=>account(c,'LAK','SYSTEM')),...['9011','9202','9211','9231','9241','9102','9131'].map(c=>account(c,'USD','SYSTEM')),...['9012','9201','9212','9242','9101','9132'].map(c=>account(c,'THB','SYSTEM'))];
const input={kind:'expense',source:'1011',target:'5111',date:'2026-11-03',amount:100,rate:23000};
const balances={1011:{quantity:1000,rate:22000},1041:{quantity:1000,rate:22500},1012:{quantity:10000,rate:650}};
const run=(data={},b=balances)=>G.build({...input,...data},chart,b);
const get=(r,code,side)=>r.lines.filter(l=>l.code===code).reduce((n,l)=>n+l[side],0);
let r=run();assert.equal(r.fxLoss,-100000);assert.equal(get(r,'5111','debit'),2300000);assert.equal(get(r,'9290','credit'),2200000);assert.equal(get(r,'5419','credit'),100000);assert.equal(r.lines.find(l=>l.code==='1011').fx_rate_lak,23000);assert.equal(r.lines.find(l=>l.code==='1011').book_rate_lak,22000);
r=run({}, {...balances,1011:{quantity:1000,rate:24000}});assert.equal(r.fxLoss,100000);assert.equal(get(r,'5419','debit'),100000);
r=run({rate:22000});assert.equal(r.fxLoss,0);assert.equal(r.lines.length,4);
r=run({source:'1012',amount:1000,rate:670});assert.equal(r.fxLoss,-20000);assert.equal(get(r,'5111','debit'),670000);
r=run({source:'1040',amount:300000,rate:0});assert.equal(r.lines.length,2);assert.equal(r.fxLoss,0);
r=run({target:'5414',amount:5});assert.equal(get(r,'5414','debit'),115000);assert.equal(r.fxLoss,-5000);
r=run({fee:5});assert.equal(get(r,'1011','credit'),105);assert.equal(get(r,'5414','debit'),115000);assert.equal(r.fxLoss,-105000);
r=run({kind:'income',target:'4010'});assert.equal(r.fxLoss,0);assert.equal(get(r,'4010','credit'),2300000);assert.equal(get(r,'1011','debit'),100);
r=run({kind:'transfer',source:'1041',target:'1011',rate:0});assert.equal(r.lines.length,2);assert.equal(r.fxLoss,0);assert(r.lines.every(l=>l.book_rate_lak===22500));
r=run({kind:'transfer',source:'1041',target:'1011',fee:5});assert.equal(get(r,'1041','credit'),105);assert.equal(r.fxLoss,-2500);
r=run({kind:'transfer',target:'1040',received:2300000});assert.equal(get(r,'1040','debit'),2300000);assert.equal(r.fxLoss,-100000);
r=run({kind:'transfer',target:'1012',received:3500,receiveRate:650});assert.equal(r.fxLoss,-75000);assert.equal(get(r,'9010','debit'),75000);
r=run({kind:'transfer',source:'1040',target:'1011',amount:2300000,received:100,receiveRate:23000,rate:0});assert.equal(r.fxLoss,0);
r=run({kind:'payable',source:'1041',target:'1220',amount:950,payableRate:22000,reference:'October payroll'});assert.equal(r.fxLoss,475000);assert.equal(get(r,'5419','debit'),950000);assert.equal(get(r,'5419','credit'),475000);assert(!r.lines.some(l=>l.code==='5311'));assert.equal(r.lines.filter(l=>l.code==='9011').length,2);assert.equal(r.lines.find(l=>l.code==='1220').book_rate_lak,22000);
r=run({kind:'payable',target:'2010',amount:50,discharge:1150000,reference:'Invoice A'});assert.equal(r.fxLoss,-50000);assert.equal(get(r,'2010','debit'),1150000);
r=run({kind:'payable',source:'1040',target:'1220',amount:2300000,discharge:100,payableRate:22000,reference:'Salary',rate:0});assert.equal(r.fxLoss,100000);assert.equal(get(r,'1220','debit'),100);
r=run({kind:'payable',source:'1040',target:'2010',amount:200000,reference:'Supplier'});assert.equal(r.lines.length,2);
for(const [data,message] of [[{amount:0},/positive/],[{rate:0},/positive/],[{amount:1001},/cannot cover/],[{amount:1000,fee:1},/cannot cover/],[{source:'9211'},/cash or bank/],[{target:'5419'},/no approved/],[{kind:'payable',target:'1220',payableRate:22000},/original entry/],[{kind:'payable',target:'1220',reference:'salary'},/positive book/],[{kind:'transfer',target:'1041',received:90},/same amount/],[{amount:1.001},/two decimal/],[{amount:Infinity},/positive/],[{rateUrl:'javascript:alert(1)'},/http/]])assert.throws(()=>run(data),message);
assert.throws(()=>G.build(input,chart.filter(a=>a.code!=='9290'),balances),/Required account 9290/);
assert.throws(()=>G.build(input,chart.map(a=>a.code==='9211'?{...a,isPosting:false}:a),balances),/Required account 9211/);
assert.throws(()=>G.build(input,chart,{}),/recorded book rate/);
// Fractional rates and quantities must balance exactly in both original units
// and rounded LAK valuations; no residual can be silently assigned to FX.
for(let i=1;i<180;i++){const amount=i/100,rate=22195.12345678+i/3,rb=22040.12345678+i/7;r=run({amount,rate},{...balances,1011:{quantity:1000,rate:rb}});assert.equal(Math.round((get(r,'5111','debit')+get(r,'5419','debit'))*100),Math.round((get(r,'9290','credit')+get(r,'5419','credit'))*100));}
console.log('PASS 18 protocol scenarios and 179 fractional valuations; gain/loss signs, separate fees, transfers, payable clearing, exact currency balance, missing mappings and invalid inputs. No database writes.');
