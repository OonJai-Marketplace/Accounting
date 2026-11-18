const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{},escapeHtml:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),formatAppNumber:n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),formatAppDate:v=>v,formatAppRate:v=>v,currencySymbolV6:c=>({USD:'$',LAK:'₭'}[c]||c)});
vm.runInContext(fs.readFileSync('src/budget/requests/budget-report290.js','utf8'),context);
const report=context.window.BudgetReport290;
const d={lines:[{key117:'one',description:'Utilities',category:'Operations',currency:'USD',amount:100}],conversions:[],movements:[{type290:'receipt',currency:'USD',inflow:100,account:'Owner',reference:'F1'},{type290:'spend',currency:'USD',outflow:96,budgetKey117:'one',reference:'R<&1'},{type290:'refund',currency:'USD',outflow:4,reference:'Return'}]};
const original=JSON.stringify(d),before=report.balances(d).get('USD');
assert.equal(before.beforeReturn,4);assert.equal(before.remaining,0);
for(const editable of [false,true]){
 const summary=report.cashSummary(d,editable);
 assert.match(summary,/>Remaining funding<\/td>/);assert.match(summary,/\$ 4\.00/);assert.doesNotMatch(summary,/after handover|before handover|data-edit-/i);
 const paid=report.disbursements(d,editable);
 assert.match(paid,/>Category<\/th>/);assert.match(paid,/>Item<\/th>/);assert.match(paid,/>Reference<\/th>/);
 const requested=report.requestSummary(d,editable);
 assert.match(requested,/>Category<\/th>/);assert.match(requested,/>Item<\/th>/);assert.doesNotMatch(requested,/Item \/ category|Utilities<br>/);assert.match(paid,/R&lt;&amp;1/);
 const item=paid.slice(paid.indexOf('<strong>'),paid.indexOf('</td>',paid.indexOf('<strong>')));
 assert.doesNotMatch(item,/R&lt;&amp;1|data-payment-reference/);
}
assert.equal(JSON.stringify(d),original,'Presentation must preserve handover records and original amounts');
console.log('PASS remaining before handover, independent cash balance, separate category/item/reference columns and unchanged source data.');
