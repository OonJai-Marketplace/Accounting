const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../src/bookkeeping/journal/completion-core258.js');
require('../src/bookkeeping/templates/generation-catalog268.js');
const G = global.JournalCompletion258;
const C = global.JournalTemplateCatalog268;

// Posting account codes only. All amounts, rates, balances and names are synthetic.
const chart = [];
function accounts(currency, type, codes, isTechnical = false) {
 for (const code of codes.split(' ')) chart.push({id: code, code, name: code, currency, baseType: type, isTechnical, isPosting: true, active: true});
}
accounts('LAK','ASSET','1010 1040 1016 1110 1111 1112 1210 1310 1311 1313 1410 1511');
accounts('USD','ASSET','1011 1018 1041 1220');
accounts('THB','ASSET','1012 1017 1224 1312');
accounts('LAK','LIABILITY','2010 2111 2112 2113');
accounts('LAK','EQUITY','3010 3023 3024 3031 3041 3042 3110 3200');
accounts('LAK','REVENUE','4010 4011 4012 4013 4014 4019 4110 4120 4130');
accounts('LAK','EXPENSE','5010 5110 5111 5113 5114 5115 5116 5117 5118 5119 5120 5210 5211 5212 5213 5311 5312 5313 5315 5410 5411 5412 5413 5414 5416 5417 5418 5419 5420 5421');
accounts('LAK','SYSTEM','9010 9041 9190 9290 9390 9490',true);
accounts('USD','SYSTEM','9011 9042 9102 9111 9121 9131 9202 9211 9231 9233 9241 9251 9311 9321 9331 9411',true);
accounts('THB','SYSTEM','9012 9101 9112 9132 9201 9212 9232 9234 9242 9312 9322 9332',true);
accounts('THB','EXPENSE','9222',true);
const fx = {LAK: 1, USD: 23000, THB: 670};
const book = {LAK: 1, USD: 22000, THB: 650};
const localPair = {
 '3010':['1010','3010'], '3023':['1010','3023'], '3024':['3023','3024'], '3031':['1010','3031'],
 '3041':['3041','1040'], '3042':['3042','1410'], '4011':['1110','4011'], '4012':['1111','4012'], '4013':['1112','4013'],
 '5211':['5211','2111'], '5212':['5212','2112'], '5213':['5213','2113'], '5311':['5311','1210'],
 '5416':['5416','1410'], '5417':['5417','1511']
};
const mapActual = {
 9101:'4010',9102:'4010',9111:'4110',9112:'4110',9121:'4120',9131:'4130',9132:'4130',
 9201:'5010',9202:'5010',9211:'5111',9212:'5111',9222:'5119',9231:'5311',9232:'5311',
 9233:'5315',9234:'5315',9241:'5414',9242:'5414',9251:'5120',9311:'3023',9312:'3023',
 9321:'3024',9322:'3024',9331:'3031',9332:'3031',9411:'1310'
};
const balances = Object.fromEntries(chart.map(a=>[a.id,{quantity:10000,rate:book[a.currency],uniform:true}]));
const legacyContext = {window:{},document:{readyState:'loading',addEventListener(){}},AccountingStore:{accounts:chart}};
vm.runInNewContext(fs.readFileSync(require.resolve('../src/bookkeeping/journal/foreign-currency14383.js'),'utf8'),legacyContext);
const catalog = [...C.templates(chart), ...legacyContext.window.JournalFX14383.templates()];
const fund = {LAK:['1010','1040'], USD:['1011','1041'], THB:['1012','1017']};
const staff = {LAK:'1210',USD:'1220',THB:'1224'};
const sums = (rows,id)=>rows.filter(l=>l.account_id===id).reduce((v,l)=>v+l.debit-l.credit,0);
const checked = new Set();
for (const t of catalog) {
 const id=t.id.replace('gen268-','');
 const [kind,code,currency]=id.split('-');
 const rows=t.lines.map(l=>{
  const c=l.currency||code;
  const roles={staff:staff[c],payer:'1210',balance:staff[c],prepaid:'1313',expense:'5110',fund:fund[c]?.[l.side==='credit'?1:0]};
  return {account_id:l.code||roles[l.role],role:l.role,receiptLeg:l.receiptLeg,stage:l.stage,expectedSide:l.side,
   debit:0,credit:0,...(l.calculated?{generated:'output'}:{})};
 });
 const expected={};
 function set(line,side,value){assert(line,id);line[side]=value;}
 function expect(account,value){expected[account]=(expected[account]||0)+value;}
 function expectFX(value){expect('5419',value);}
 const business=rows.filter(l=>!l.generated);
 if(kind==='local'){
  if(code==='5420'){
   set(business[0],'debit',999.6);set(business[1],'debit',0.4);
   expect('2010',999.6);expect('5420',0.4);expect('1040',-1000);
  }else{
   const pair=localPair[code]||(code.startsWith('4')?['1010',code]:[code,'1040']);
   set(business[0],'debit',100);expect(pair[0],100);expect(pair[1],-100);
  }
 }else if(kind==='mapping'&&mapActual[code]==='3024'){
  const old=book[currency]-5;for(const l of business)l.book_rate_lak=old;
  set(business[0],'debit',100);expect('3023',100*old);expect('3024',-100*old);expectFX(0);
 }else if(kind==='mapping'||kind==='fee'){
  const c=currency,actual=mapActual[code],income=code.startsWith('91')||code.startsWith('93');
  assert(actual,id);for(const l of business) set(l,l.expectedSide,100);
  if(kind==='fee'){
   const fee=business.find(l=>['9241','9242'].includes(l.account_id));fee.debit=2;
   if(business.length===4)business[3].credit=2;else business.find(l=>l.role==='fund').credit=102;
   expect('5414',2*fx[c]);
  }
  expect(actual,(income?-100:100)*fx[c]);const paid=kind==='fee'?102:100;
  expect(code,income?-100:100);expect(fund[c][income?0:1],income?100:-paid);
  if(kind==='fee')expect(c==='USD'?'9241':'9242',2);
  expectFX(income?0:-paid*(fx[c]-book[c]));
  if(income){expect(code.startsWith('91')?'9190':'9390',100*fx[c]);}
 }else if(id.startsWith('support-deposit')){
  const c=t.lines[0].currency;
  set(business[0],'debit',1250);
  if(id.includes('-fee-')){set(business.find(l=>l.account_id==='5414'),'debit',3500);expect('5414',3500);expect('1210',-3500);}
  expect(fund[c][0],1250);expect(c==='USD'?'9311':'9312',-1250);
  expect('3023',-1250*fx[c]);expect('9390',1250*fx[c]);expect(staff[c],0);expectFX(0);
  expect('9010',0);expect(c==='USD'?'9011':'9012',0);
 }else if(id.startsWith('support-exchange')){
  const c=id.split('-')[2],to=id.split('-')[3];
  const receipt=business.find(l=>l.stage==='Receipt'&&l.role==='fund');
  const paid=business.find(l=>l.stage==='Exchange'&&l.expectedSide==='credit');
  paid.account_id=receipt.account_id;set(receipt,'debit',100);set(paid,'credit',50);
  const received=to==='LAK'?50*fx[c]:50;
  set(business.find(l=>l.stage==='Exchange'&&l.expectedSide==='debit'),'debit',received);
  expect('3023',-100*fx[c]);expect('9390',100*fx[c]);
  const carrying=(10000*book[c]+100*fx[c])/10100;
  expectFX(Math.round(50*carrying*100)/100-received*fx[to]);
 }else if(kind==='payroll'||id==='mixed-payroll'){
  const taxRows=id.includes('pit')||id.includes('tax-sso');
  for(const l of business){
   const a=chart.find(a=>a.id===l.account_id),c=a.currency;
   if(['9231','9232'].includes(a.code)){set(l,'debit',100);expect('5311',100*fx[c]);expect('9290',-100*fx[c]);}
   else if(l.role==='staff'){set(l,'credit',taxRows?90:100);expect(a.code,taxRows?-90:-100);}
   else if(a.code==='9042')set(l,'credit',10);
   else if(a.code==='2111'||a.code==='2112'){const v=id.includes('tax-sso')?5:10;set(l,'credit',v*fx.USD);expect(a.code,-v*fx.USD);}
  }
  expectFX(0);
 }else if(kind==='exchange'){
  const from=code,to=currency,paid=from==='LAK'?2*fx[to]:100;
  const received=from==='LAK'?2:to==='LAK'?paid*fx[from]:2;
  set(business[0],'credit',paid);set(business[1],'debit',received);
  expect(fund[from][1],-paid);expect(fund[to][0],received);expectFX(paid*book[from]-received*fx[to]);
 }else if(kind==='transfer'||kind==='settlement'){
  set(business[0],'debit',100);set(business[1],'credit',100);
  expect(kind==='transfer'?fund[code][0]:staff[code],100);expect(fund[code][1],-100);expectFX(0);
 }else if(kind==='remit'){
  set(business[0],'debit',100.12);expect(code==='PIT'?'2111':'2112',100.12);expect('5420',.88);expect('1040',-101);
 }else if(kind==='amortization'){
  const [expense,asset]=({wifi:['5110','1311'],rent:['5421','1310'],restaurant:['5119','1312'],insurance:['5110','1313'],other:['5110','1313']})[code];
  set(business[0],'debit',100);if(code==='restaurant')business[1].book_rate_lak=book.THB;
  expect(expense,100*(code==='restaurant'?book.THB:1));expect(asset,-100);expectFX(0);
 }else if(id.startsWith('fx14383-')){
  for(const l of business){
   const a=chart.find(a=>a.id===l.account_id);
   if(a.currency==='LAK'){if(a.code==='1016')set(l,'debit',100);if(a.code==='4010')set(l,'credit',100+10*(fx.USD+fx.THB));continue;}
   set(l,id.endsWith('income')===G.fund(a)?'debit':'credit',10);
  }
  if(id.endsWith('income')){expect('4010',-100-10*(fx.USD+fx.THB));expectFX(0);}
  else {expect('5010',10*(fx.USD+fx.THB));expectFX(-10*(fx.USD+fx.THB-book.USD-book.THB));}
 }else throw Error('Missing scenario '+id);
 // Exercise the same populated BR column that a user actually brings into Generate.
 for(const l of business){
  const a=chart.find(a=>a.id===l.account_id);
  if(a?.currency!=='LAK'&&!l.book_rate_lak){l.autoBook=true;l.book_rate_lak=book[a.currency]-1;}
 }
 const input={chart,rows,balances,rates:fx};
 const result=G.complete(input);assert.deepEqual(result.errors,[],id+' '+JSON.stringify(result.errors));
 for(const [account,value] of Object.entries(expected))assert(Math.abs(sums(result.rows,account)-value)<.005,id+' '+account+' expected '+value+' got '+sums(result.rows,account));
 for(const l of result.rows){
  if(l.expectedSide&&l.generated!=='output')assert.equal(l[l.expectedSide==='debit'?'credit':'debit'],0,'Template side '+id);
 }
 if(id.startsWith('support-deposit')||kind==='mapping'&&(code.startsWith('91')||code.startsWith('93'))){
  assert(!result.rows.some(l=>['5419','9010','9011','9012'].includes(l.account_id)),id+' unexpected settlement or FX line');
 }
 const again=G.complete({...input,rows:result.rows});assert.deepEqual(again.rows,result.rows,'Repeat '+id);
 assert(!checked.has(id));checked.add(id);
}
assert(!checked.has('local-3110')&&!checked.has('local-3200'));
assert.equal(checked.size,111);
console.log('PASS economic outcome and repeat generation for '+checked.size+' distinct built-in templates with prefilled book rates.');
