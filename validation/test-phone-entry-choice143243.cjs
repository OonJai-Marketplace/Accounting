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
assert.equal(S.draft.single[0].journalLines.length,2);
assert.equal(JSON.stringify(prepare()),JSON.stringify(before));
switchTo('double');
assert.deepEqual(Array.from(S.draft.lines,r=>r.memo),['Supplies','Petty cash']);
S.draft.lines[1].credit='99';
switchTo('single');
assert.throws(prepare,/unbalanced/);
switchTo('double');
assert.equal(S.draft.lines[1].credit,'99');
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
S.owner='two';S.data.target={permissions:{workspace_entry_mode240:'double_simple'}};
assert.equal(ctx.preferredMode243(),'double');
console.log('PASS phone round trips, partial and shared fund payments, receipt detail and per-user isolation');
