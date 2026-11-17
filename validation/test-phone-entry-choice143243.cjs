const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const {randomUUID} = require('node:crypto');
const permissions = {workspace_entry_mode240:'cashbook',assigned_fund_account_ids:['fund'],
  destination_account_ids:['expense','food'],allowed_directions:['out','in']};
const S = {owner:'one',actor:'one',data:{access:{permissions},
  accounts:['fund','expense','food','alternate'].map(id => ({id,currency:'LAK',code:id,name:id}))}};
const saved = new Map();
const ctx = {S,scope:'test',localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},
  today:()=> '2026-11-03',crypto:{randomUUID},structuredClone,StaffEntry14225:require('../src/subusers/entries/staff-entry14225.js')};
vm.createContext(ctx);
for (const module of ['permissions-and-accounts','draft-persistence','receipt-dates'])
  vm.runInContext(fs.readFileSync('src/subusers/phone/runtime/'+module+'.js','utf8'),ctx);
const switchTo = mode => assert(ctx.changeMode243(mode));
const prepare = () => ctx.preparePhoneEntry(S.draft);
function start(mode,rows) {
  S.draft={...ctx.blankDraft(),mode,memo:'Kitchen purchase',reference:'Voucher',editIds:['entry'],
    [mode==='single'?'single':'lines']:rows};
}
const line=(account='',debit='',credit='',memo='') => ({account,debit,credit,memo});
start('single',[{direction:'in',source:'fund',affected:'expense',amount:'1200',memo:'Keep memo'}]);
switchTo('double');
assert.equal(S.draft.lines[0].debit,'1200');
assert.equal(S.draft.lines[1].credit,'1200');
switchTo('single');
assert.equal(S.draft.single[0].direction,'in');
assert.equal(S.draft.single[0].memo,'Keep memo');

start('double',[line(),line('expense','331000','','Vegetables')]);
S.draft.multiple=true;
S.draft.lines.forEach(l => l.receipt='kitchen-receipt');
Object.assign(S.draft.lines[1],{date:'2026-11-02',reference:'Market'});
const key=S.draft.requestKey;
switchTo('single');
assert.equal(S.draft.single[0].source,'fund');
assert.equal(prepare().items[0].amount,331000);
assert.equal(prepare().items[0].reference,'Market');
S.draft=ctx.normalizeDraft(JSON.parse(JSON.stringify(S.draft)));
S.draft.single[0].amount='341000';
switchTo('double');
assert.equal(S.draft.lines[0].credit,'341000');
assert.equal(S.draft.lines[1].debit,'341000');
assert.equal(S.draft.lines[0].memo,'');
assert.equal(S.draft.lines[1].memo,'Vegetables');
switchTo('single');
assert.equal(S.draft.single[0].date,'2026-11-02');
assert.equal(S.draft.requestKey,key);
assert.deepEqual([...S.draft.editIds],['entry']);

permissions.assigned_fund_account_ids.push('alternate');
start('double',[line('food','50'),line()]);
switchTo('single');
assert.equal(S.draft.single[0].source,'');
assert.throws(prepare,/assigned fund/);
permissions.assigned_fund_account_ids.pop();

for (const original of [
  [line('fund','','30.3'),line('food','10.1','','Rice'),line('expense','20.2','','Soap')],
  [line('food','10.1','','Rice'),line('expense','20.2','','Soap'),line()]
]) {
  start('double',original);
  switchTo('single');
  assert.deepEqual(Array.from(S.draft.single,r=>r.amount),['10.1','20.2']);
  assert.deepEqual(Array.from(prepare().items,r=>r.amount),[10.1,20.2]);
  S.draft.single[0].amount='12.1';
  switchTo('double');
  assert.equal(S.draft.lines.length,3);
  assert.equal(S.draft.lines.find(l=>l.account==='fund').credit,'32.3');
  assert.deepEqual(Array.from(prepare().items,r=>r.memo),['Rice','Soap']);
}

start('double',[line('expense','100','','Supplies'),line('fund','','100','Petty cash')]);
const before=prepare();
switchTo('single');
assert.equal(S.draft.single.length,1);
assert.equal(S.draft.single[0].fundMemo,'Petty cash');
assert.equal(JSON.stringify(prepare()),JSON.stringify(before));
switchTo('double');
assert.deepEqual(Array.from(S.draft.lines,r=>r.memo),['Supplies','Petty cash']);
S.draft.lines[1].credit='99';
switchTo('single');
assert.throws(prepare,/unbalanced/);
switchTo('double');
assert.equal(S.draft.lines[1].credit,'99');
// A receipt date or a preselected cash fund alone is a placeholder; a
// reference, memo, or account entered by the user must still be checked.
for (const fundFirst of [true,false]) {
  const rows=[line('expense','331000','','Vegetables'),line('fund','','331000','Cash paid')];
  if(fundFirst)rows.reverse();
  start('double',rows);
  Object.assign(S.draft,{multiple:true,date:'2026-11-02'});
  rows.forEach((l,i)=>Object.assign(l,{date:S.draft.date,receipt:'slip',reference:'R'+i}));
  rows.splice(1,0,{...line(),date:'2026-11-03',receipt:'slip'});
  rows.push({...line(),date:'2026-11-04',receipt:'empty'});
  const posted=prepare();
  assert.equal(posted.items.length,1);
  assert.equal(posted.items[0].date,S.draft.date);
  switchTo('single');
  const active=S.draft.single[0];
  assert.equal(active.amount,'331000');
  assert.equal(active.affected,'expense');
  assert.equal(active.fundMemo,'Cash paid');
  assert.equal(JSON.stringify(prepare()),JSON.stringify(posted));
  S.draft=ctx.normalizeDraft(JSON.parse(JSON.stringify(S.draft)));
  S.draft.single[0].fundReference='New fund reference';
  S.draft.single[0].amount='400000';
  switchTo('double');
  const entered=S.draft.lines.filter(l=>l.account && l.receipt==='slip');
  assert.equal(entered.length,2);
  assert.equal(entered[0].account,fundFirst?'fund':'expense');
  assert.equal(entered.find(l=>l.credit).reference,'New fund reference');
  assert.equal(entered.find(l=>l.credit).credit,'400000');
  assert.equal(prepare().items.length,1);
}
start('single',[{source:'fund',affected:'expense',amount:'10',direction:'out'},{source:'fund',date:'2026-11-02'}]);
assert.equal(prepare().items.length,1);
S.draft.single[1].reference='Unfinished';
assert.throws(prepare,/amount/);
start('double',[{...line(),reference:'Unfinished'}]);
assert.throws(prepare,/account/);
// Credit lines in earlier receipts disappear in Cashbook. The physical slip
// still has its original number when printed or reopened.
start('double',[1,2,3].flatMap(i=>[
  {...line('expense','100'),receipt:'receipt-'+i},{...line('fund','','100'),receipt:'receipt-'+i}]));
ctx.addReceiptPart(S.draft,4);
S.draft.lines[4].debit='60';
Object.assign(S.draft.lines[5],{account:'food',debit:'40'});
switchTo('single');
const cards=prepare().snapshot.receiptCards341;
assert.deepEqual(Object.values(cards[2].splitParts).map(p=>p.label),['5A','5B']);
switchTo('double');
assert.equal(S.draft.lines[6].credit,'100');

permissions.assigned_fund_account_ids.push('alternate');
permissions.destination_account_ids.push('fund','alternate');
start('single',[{direction:'in',source:'fund',affected:'alternate',amount:'20',memo:'Transfer'}]);
const transfer = prepare().items;
switchTo('double');
assert.deepEqual(prepare().items,transfer);
switchTo('single');
assert.deepEqual(prepare().items,transfer);
// A fund credit entered on a different card is still one payment when saved
// or converted. Its actual date survives the receipt allocation.
for (const direction of ['out','in']) {
  const out=direction==='out';
  start('double',[
    {...line('food',out?'0.3':'',out?'':'0.3','Fruit'),date:'2026-11-02',receipt:'food'},
    {...line('fund',out?'':'0.3',out?'0.3':'','Till'),date:'2026-11-10',receipt:'fund'}
  ]);
  S.draft.multiple=true;
  assert.equal(prepare().items.length,1);
  switchTo('single');
  assert.equal(S.draft.single.length,1);
  assert.equal(S.draft.single[0].fundDate,'2026-11-10');
  const prepared=prepare();
  assert.equal(prepared.items.length,1);
  assert.equal(prepared.items[0].direction,direction);
  assert.equal(prepared.items[0].date,'2026-11-02');
  assert.deepEqual(Array.from(prepared.snapshot.rows,r=>r.date),['2026-11-02','2026-11-10']);
}
start('double',[
  {...line('food','0.1'),receipt:'food'},
  {...line('expense','0.2'),receipt:'other'},
  {...line('fund','','0.3'),receipt:'fund'}
]);
assert.deepEqual(Array.from(prepare().items,l=>l.amount),[0.1,0.2]);
switchTo('single');
assert.equal(S.draft.single.length,2);
assert.deepEqual(Array.from(prepare().items,l=>l.amount),[0.1,0.2]);
// The first match in this transfer would strand a category-only debit.
// Reassign the flexible debit rather than rejecting the balanced journal.
start('double',[line('fund','10'),line('food','10'),line('alternate','','10'),line('expense','','10')]);
assert.deepEqual(Array.from(prepare().items,l=>[l.fund,l.account,l.direction,l.amount]),
  [['fund','expense','in',10],['alternate','food','out',10]]);
S.owner='two';S.data.target={permissions:{workspace_entry_mode240:'double_simple'}};
assert.equal(ctx.preferredMode243(),'double');
console.log('PASS phone round trips, partial and shared fund payments, receipt detail and per-user isolation');
