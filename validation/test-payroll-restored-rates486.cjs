const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {JSDOM} = require('jsdom');

const w = new JSDOM('<table><tbody id="jeLinesBody"></tbody></table>').window;
const body = w.document.getElementById('jeLinesBody');
const app = {
  window:w, document:w.document, calculateJournalBalance(){},
  pendingWorkspacePostOwnerId:null,pendingWorkspacePostJournalId:null,pendingWorkspacePostIsLocal:false,
  addJournalLineRow(){const row=w.document.createElement('tr');row.innerHTML='<td><input class="je-line-date"></td>';body.appendChild(row);}
};
w.payrollJournal1429={snapshot:()=>({id:'example'})};
const src=fs.readFileSync('src/core/navigation/interface-v69.js','utf8');
const begin=src.indexOf('function snapshotJournal69()'),end=src.indexOf('\nfunction ',src.indexOf('else fill();}',begin));
vm.createContext(app);vm.runInContext(src.slice(begin,end),app);
function restore(rows){
  app.restoreJournal69({payrollDraft:{id:'example'},rows});
  return app.snapshotJournal69().rows;
}
const base={account:'USD',fxRate:'22294',credits:{}};
const rows=restore([
  {...base,averageBookRate:true,bookRate:'22000'},
  {...base,bookRate:'22451.1234'},
  {...base,savedRate:false,averageBookRate:true,bookRate:'22100'}
]);
assert.equal(rows[0].savedRate,true);assert.equal(rows[0].bookRate,'');assert.equal(rows[0].averageBookRate,undefined);
assert.equal(rows[1].bookRate,'22451.1234');assert.equal(rows[1].fxRate,'22294');
assert.equal(rows[2].savedRate,false);assert.equal(rows[2].averageBookRate,true);assert.equal(rows[2].bookRate,'22100');
assert.deepEqual(restore(rows),rows);
w.close();console.log('PASS payroll drafts retain applied payroll valuation, explicit book overrides and separately added journal lines after restore');
