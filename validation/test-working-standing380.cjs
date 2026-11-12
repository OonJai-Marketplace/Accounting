const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {document:{addEventListener(){}},window:{addEventListener(){}}};
vm.runInNewContext(fs.readFileSync('src/subusers/accounts/working-standing379.js','utf8'),context);
const {projected} = context.window.WorkingStanding379;
const data = {asOf:'2026-11-12',accounts:[{id:'cash',start:'2026-10-31',opening:400000,received:0,used:400000}],lines:[]};
const line = (fund,account,amount,direction='in')=>({fund,account,amount,direction,date:'2026-11-12'});
const request = {p_key:'split',p_items:[line('cash','sales',600),line('bank','sales',900),line('bank','cash',20)]};
const net = (source,queue)=>{const [row]=projected(source,queue);return (row.available-row.out)/100};
assert.equal(net(data,[]),0);
assert.equal(net(data,[request,request]),580);
const saved = {...data,accounts:[{...data.accounts[0],received:600,used:400020}],lines:[
 {id:'1',account:'cash',group:'split:2026-11-12',amount:600},
 {id:'3',account:'cash',group:'split:2026-11-12',amount:-20}]};
assert.equal(net(saved,[request]),580);
assert.equal(net(saved,[{p_key:'edit',p_edit_ids:['1','2','3'],p_items:[line('cash','sales',350)]}]),350);
assert.equal(net(data,[{p_key:'handover',p_items:[line('cash','main',100,'out')]}]),-100);
console.log('PASS: settled opening, split tender, cash change, handover, retries and replacement edits');
