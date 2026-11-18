/* Synthetic data only: no company journals or external database. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={console,structuredClone,formatAppNumber:n=>Number(n).toFixed(2),getSelectedAccountInfo:()=>null,AccountingStore:{accounts:[]}};
context.window=context;vm.createContext(context);
for(const p of ['budget-report290','owner-support-balance','support-equity'])vm.runInContext(fs.readFileSync('src/budget/requests/'+p+'.js','utf8'),context);
const S=context.BudgetSupportEquity;
const accounts=context.AccountingStore.accounts;
for(const [currency,remaining,used,original,bank,bridge] of [['USD','3028','3029','3026','1041','9011'],['LAK','3023','3024','3027','1040','9010'],['THB','3020-02','3020-03','3020-01','1042','9012']]){
 for(const [code,name,type] of [[remaining,'Remaining','EQUITY'],[used,'Used','EQUITY'],[original,'Received','EQUITY'],[bank,'BCEL','ASSET'],[bridge,'FX bridge','ASSET']])accounts.push({id:code,code,name:name+' — '+currency,type,currency,isPosting:true,isTechnical:name==='FX bridge'});
}
accounts.push({id:'staff',code:'1220',name:'Staff Clearing — Santos — USD',type:'ASSET',currency:'USD',isPosting:true});
const a=code=>accounts.find(a=>a.code===code);
const line=(code,dr,cr,rate=20000,extra={})=>({account_id:a(code).id,accounts:a(code),currency_code:a(code).currency,debit:dr,credit:cr,fx_rate_lak:a(code).currency==='LAK'?1:rate,book_rate_lak:a(code).currency==='LAK'?1:rate,line_date:'2027-01-10',description:'Synthetic',...extra});
const j=(ref,ls)=>({entry_no:ref,status:'posted',journal_lines:ls});
const receipt=(amount=1000,currency='USD',reference='',destination290='BCEL — USD')=>({type290:'receipt',currency,inflow:amount,reference,destination290});
const spend=(amount=600,currency='USD',extra={})=>({type290:'spend',currency,outflow:amount,...extra});
const report=(movements,conversions=[])=>({date:'2027-01-10',lines:[],movements,conversions});
const fx=(ref='OJM990002',currency='USD',target='LAK',amount=300,targetAmount290=6000000)=>({evidence:ref,currency,target,amount,targetAmount290});
const basic=report([receipt(),spend()]);
const plan=(d,js=[])=>S.plan(d,S.groups(d),{journals:js,fingerprint:'a'.repeat(32)});
let p=plan(basic);
assert.deepEqual(JSON.parse(JSON.stringify(p.pairs.map(p=>[p.debitCode,p.creditCode,p.amount]))),[['1041','3028',1000],['3028','3029',600]]);
assert.match(p.notice,/400.00 remaining/);
assert.equal(plan(report([receipt(20,'THB','','BCEL — THB'),spend(12,'THB')])).pairs[1].currency,'THB');
assert.equal(plan(report([receipt(20,'LAK','','BCEL — LAK'),spend(12,'LAK')])).pairs[1].rate,1);
assert.equal(plan(report([receipt(100,'USD','','Staff Clearing — Santos — USD'),spend(50)])).pairs[0].debitCode,'1220');
assert.equal(plan(report([receipt(100,'USD','','Unspecified')])).pairs[0].debitCode,'');
const funding=j('OJM990001',[line('1220',1000,0),line('3028',0,1000),line('1041',1000,0),line('1220',0,1000)]);
const bank=j('OJM990002',[line('1041',0,300),line('9011',300,0),line('1040',6000000,0),line('9010',0,6000000)]);
const mixed=report([receipt(1000,'USD','OJM990001'),spend(600),spend(5000000,'LAK')],[fx()]);
p=plan(mixed,[funding,bank]);
assert.equal(p.pairs.length,4);assert(!p.pairs.some(p=>p.roles.includes('asset')));
assert.deepEqual(JSON.parse(JSON.stringify(p.pairs.map(p=>[p.debitCode,p.creditCode,p.amount]))),[['3028','9011',300],['9010','3023',6000000],['3028','3029',600],['3023','3024',5000000]]);
assert.match(p.notice,/USD 1000.00 received · 600.00 used · 100.00 remaining/);
assert.match(p.notice,/LAK 0.00 received · 5000000.00 used · 1000000.00 remaining/);
// Valuation offsets do not turn into a second exchange or replace original rates.
const valued=structuredClone(bank);valued.journal_lines.push(line('9011',300,0,19900,{description:'Technical valuation offset'}),line('9011',0,300,20000,{description:'FX valuation offset'}));
valued.journal_lines.push(line('9010',30000,0,1,{description:'LAK bridge for exchange gain'}));
assert.equal(plan(mixed,[funding,valued]).pairs[0].rate,20000);
// THB transfers retain their own original rate; split slips are grouped once.
const baht=j('OJM990006',[line('1041',0,300,21000),line('9011',300,0,21000),line('1042',9000,0,700),line('9012',0,9000,700)]);
const thb=plan(report([receipt(1000,'USD','OJM990001'),spend(6000,'THB')],[fx('OJM990006','USD','THB',300,9000)]),[funding,baht]);
assert.equal(thb.pairs[1].currency,'THB');assert.equal(thb.pairs[1].rate,700);assert.equal(thb.pairs[2].rate,700);
const split=structuredClone(mixed);split.conversions=[fx('OJM990002','USD','LAK',100,2000000),fx('OJM990002','USD','LAK',200,4000000)];
assert.equal(plan(split,[funding,bank]).pairs[0].amount,300);
// Already allocated native transfers and spending are deducted, not reposted.
const allocated=structuredClone(funding);allocated.journal_lines.push(line('3028',300,0),line('9011',0,300),line('9010',6000000,0),line('3023',0,6000000),line('3028',600,0),line('3029',0,600),line('3023',5000000,0),line('3024',0,5000000));
assert.throws(()=>plan(mixed,[allocated,bank]),/already record/);
const more=structuredClone(mixed);more.movements[1].outflow=650;
p=plan(more,[allocated,bank]);assert.equal(p.pairs.length,1);assert.equal(p.pairs[0].amount,50);
const less=structuredClone(mixed);less.movements[1].outflow=590;assert.throws(()=>plan(less,[allocated,bank]),/already allocate more/);
const missing=structuredClone(mixed);missing.conversions=[];assert.throws(()=>plan(missing,[allocated]),/exchange allocation not matched/);
// Combined source references are checked in full and duplicate receipts rejected.
const combined=report([receipt(1000,'USD','OJM990001 / OJM990003'),spend(600)]);
const first=j('OJM990001',[line('1041',400,0),line('3028',0,400)]),second=j('OJM990003',[line('1041',600,0),line('3028',0,600)]);
assert.equal(plan(combined,[first,second]).pairs.length,1);
assert.throws(()=>plan(combined,[first]),/posted receipt/);
combined.movements.push(receipt(400,'USD','OJM990001'));assert.throws(()=>plan(combined,[first,second]),/counted once/);
// New local use never becomes USD merely because the request was denominated in USD.
assert.equal(plan(report([receipt(),spend(2000000,'LAK')])).pairs[1].currency,'LAK');
// An explicit owner allocation can differ from the expense currency, as reviewed.
assert.equal(plan(report([receipt(),spend(4493295.45,'LAK',{ownerAmount:200,ownerCurrency:'USD'})])).pairs[1].amount,200);
assert.throws(()=>plan(report([receipt(),spend(50,'USD',{ownerAmount:40,ownerCurrency:'USD'}),spend(5)])),/each spending row/);
const old=j('OJM990001',[line('1041',1000,0),line('3026',0,1000,20100)]);
p=plan(report([receipt(1000,'USD','OJM990001'),spend(600)]),[old]);assert.equal(p.pairs[0].debitCode,'3026');assert.equal(p.pairs[0].fixed,true);assert.equal(p.pairs[1].rate,20100);
// Reverse LAK->USD exchanges keep the original asset movement in its own entry.
const reverse=j('OJM990004',[line('1040',0,100000),line('9010',100000,0),line('1041',5,0),line('9011',0,5)]);
p=plan(report([receipt(200000,'LAK','OJM990005','BCEL — LAK'),spend(2,'USD')],[fx('OJM990004','LAK','USD',100000,5)]),[j('OJM990005',[line('1040',200000,0),line('3023',0,200000)]),reverse]);
assert.equal(p.pairs[0].currency,'LAK');assert.equal(p.pairs[1].currency,'USD');assert.equal(p.pairs[2].currency,'USD');
// Editable use/receipt amounts remain balanced; verified conversion values stay fixed.
const linesFor=p=>[line(p.debitCode,p.amount,0,p.rate||20000),line(p.creditCode,0,p.amount,p.rate||20000)];
let pair=plan(basic).pairs[1],entered=linesFor(pair);entered[0].debit=entered[1].credit=610;assert.equal(S.validate(pair,entered),true);
entered[1].credit=600;assert.equal(S.validate(pair,entered),false);
pair=plan(mixed,[funding,bank]).pairs[0];entered=linesFor(pair);entered[0].debit=entered[1].credit=301;assert.equal(S.validate(pair,entered),false);
entered=linesFor(pair);entered[0].account_id='1041';assert.equal(S.validate(pair,entered),false);
entered=linesFor(pair);entered[0].fx_rate_lak=20001;assert.equal(S.validate(pair,entered),false);
assert.throws(()=>plan(mixed,[funding,{...bank,status:'voided'}]),/Verify/);
const rounded=structuredClone(mixed);rounded.conversions[0].targetAmount290=5999999;assert.throws(()=>plan(rounded,[funding,bank]),/exchange amount/);
// Historical company coverage reduces owner use, while a cash handover does not.
p=plan(report([receipt(10000,'LAK','','BCEL — LAK'),spend(9000,'LAK'),{type290:'coverage',currency:'LAK',inflow:2000},{type290:'refund',currency:'LAK',outflow:1000}]));assert.equal(p.pairs[1].amount,7000);
console.log('PASS native currencies, personal receipts, original rates, combined references, reverse FX, prior allocations, editable balanced amounts and mismatch guards');
(async()=>{
 let resolve;context.ojmDb={rpc:()=>new Promise(r=>resolve=r)};context.liveProfile={id:'one'};
 const pending=S.evidence({id:'report',version:2});context.liveProfile={id:'two'};resolve({data:{journals:[],fingerprint:'a'.repeat(32)}});
 await assert.rejects(pending,/account changed/);
 console.log('PASS preparation evidence is account-scoped');
})().catch(e=>{console.error(e);process.exitCode=1;});

const controls={jeTransDate:{value:''},jeGeneralMemo:{value:'',dispatchEvent(){}},journalDocumentRef:{value:''}};
const body={rows:[],replaceChildren(){this.rows=[]},get lastElementChild(){return this.rows.at(-1)}};controls.jeLinesBody=body;
context.document={getElementById:id=>controls[id],querySelectorAll:()=>[]};
context.access113={can:()=>true};context.JournalModule={};context.pendingWorkspacePostJournalId=null;context.pendingWorkspacePostOwnerId=null;context.PeriodReview={};
context.liveProfile={id:'editor-owner'};let flushes=0,selected='';
context.switchTab=x=>selected=x;context.showJournalEntry98=()=>{};context.setJournalDateMode=()=>{};context.calculateJournalBalance=()=>{};
context.JournalFX14383={restore(){}};context.drafts1427={flush(){flushes++}};context.Event=class{};
context.addJournalLineRow=(code,memo,dr,credits)=>body.rows.push({code,memo,dr,credits,dataset:{}});
vm.runInContext(fs.readFileSync('src/budget/requests/utilization-journal.js','utf8'),context);
const J=context.BudgetUtilizationJournal,record={id:'synthetic-report',version:3,data:mixed},proof={journals:[funding,bank],fingerprint:'a'.repeat(32)};
J.open(record,S.groups(record.data),proof);
assert.equal(selected,'journal');assert.equal(flushes,1);assert.equal(body.rows.length,8);
assert.equal(controls.jeTransDate.value,'2027-01-10');assert.equal(body.rows[0].code,'3028');
assert.equal(body.rows[0].dataset.fxRate14383,20000);assert.equal(body.rows[0].memo,body.rows[1].memo);
const snapshot=J.snapshot();J.restore(null);assert.equal(J.snapshot(),null);J.restore(snapshot);
let draft=snapshot.pairs.flatMap(linesFor);
assert.equal(J.postingKey([{p_lines:draft}]),'budget-use:synthetic-report:3:'+('a'.repeat(32)));
// Manual use edits survive reopening; receipts/conversions remain protected.
draft[4].debit=draft[5].credit=610;assert.match(J.postingKey([{p_lines:draft}]),/^budget-use:/);
controls.jeGeneralMemo.value='Reviewed description';J.open(record,S.groups(record.data),proof);assert.equal(controls.jeGeneralMemo.value,'Reviewed description');assert.equal(flushes,1);
draft[0].debit=draft[1].credit=301;assert.throws(()=>J.postingKey([{p_lines:draft}]),/stay unchanged/);
context.liveProfile={id:'different-owner'};assert.equal(J.snapshot(),null);J.restore(snapshot);assert.equal(J.snapshot(),null);
context.liveProfile={id:'editor-owner'};assert.throws(()=>J.open(record,S.groups(record.data),proof),/unfinished/);
context.access113.can=()=>false;assert.throws(()=>J.open(record,S.groups(record.data),proof),/Post permission/);
console.log('PASS editable Post Transaction handoff, draft recovery, immutable source fingerprint, existing-draft protection and account isolation; no posting API invoked');
