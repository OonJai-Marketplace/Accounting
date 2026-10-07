const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const prepare = require('../scripts/staff-entry14225.js').prepare;

const accounts = [
  {id:'cash',code:'1010',name:'Cash on Hand',currency:'LAK',isPosting:true},
  {id:'sales',code:'4010',name:'Dine-in Sales',currency:'LAK',isPosting:true},
  {id:'usd',code:'4020',name:'Sales USD',currency:'USD',isPosting:true},
  {id:'other',code:'4990',name:'Unassigned Sales',currency:'LAK',isPosting:true},
];
const rules={fundIds:['cash'],entryIds:['sales','usd'],directions:['in','out'],counterpart:''};
const base={date:'2026-10-07',memo:'Daily closeout',mode:'single',single:[{direction:'in',source:'cash',affected:'sales',amount:'250000',memo:'Dine-in'}]};
const result=prepare(base,accounts,rules);
assert.deepEqual(result.items.map(({direction,fund,account,kind})=>({direction,fund,account,kind})),[
  {direction:'in',fund:'cash',account:'sales',kind:'collection'},
]);
assert.notEqual(result.items[0].account,result.items[0].fund,'Money In must keep the category for the credit side');
assert.throws(()=>prepare({...base,single:[{...base.single[0],affected:'other'}]},accounts,rules),/enabled|assigned/);
assert.throws(()=>prepare({...base,single:[{...base.single[0],affected:'usd'}]},accounts,rules),/Currency mismatch/);
assert.throws(()=>prepare(base,accounts,{...rules,directions:['out']}),/Money In is not enabled/);

const root=path.resolve(__dirname,'..');
const workspaceSource=fs.readFileSync(path.join(root,'scripts/workspace-settings.js'),'utf8');
const savedRowAdapter=workspaceSource.match(/^const workspaceEditableRowsBefore78=.*\nworkspaceEditableRows=function\(user\)\{[^\n]+/m)?.[0];
assert(savedRowAdapter,'saved Money In rows must keep their category on edit');
const context={workspaceEditableRows:()=>[{id:'saved',direction:'in',account_id:'sales',selected_account_id:'cash'}],workspaceRowEdits:{}};
vm.runInNewContext(savedRowAdapter,context);
assert.equal(context.workspaceEditableRows({id:'user'})[0].selected_account_id,'sales');
for(const [name,bundle] of [['entry1430','6'],['personal-journal1437','6'],['staff-entry14225','6'],['workspace-settings','3'],['subusers-final-v56','3'],['workflows-v136','5']]){
  let source=fs.readFileSync(path.join(root,'scripts',name+'.js'),'utf8').trim();
  const packed=fs.readFileSync(path.join(root,'scripts','desktop14245-'+bundle+'.js'),'utf8');
  if(name==='workspace-settings'){
    const submit=/submitWorkspaceForReview=async function\(userId\)\{[^\n]+/;
    const preserved=packed.split('/* scripts/workspace-settings.js */\n')[1].split('\n/* scripts/')[0].match(submit)?.[0];
    assert(preserved?.includes('Reports14253.submit([journal])'),'keep the newer review submission in the bundle');
    source=source.replace(submit,preserved);
    assert.match(source,/p_fund_account_id:row\.fund_account_id\|\|rules\.fundIds\[0\]/);
    assert.match(source,/field==='fund'\?rules\.fundIds:rules\.entryIds/);
  }
  assert(packed.includes('/* scripts/'+name+'.js */\n'+source),name+' must match its packed desktop version');
}
const sql=fs.readFileSync(path.join(root,'setup/INSTALL-MONEY-IN-v142.78.sql'),'utf8');
assert.match(sql,/BEGIN;[\s\S]*COMMIT;/);
assert.match(sql,/NOT \(l\.entry_kind='collection' AND l\.account_id=l\.fund_account_id\)/);
assert.match(sql,/Money In category not assigned/);
console.log('PASS assigned Money In category, accounting mapping, currency isolation, and packed source');
