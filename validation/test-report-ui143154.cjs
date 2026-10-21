const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('src/reports/tax/tax-reports-v102.js','utf8');
const c={window:{switchTab(){}},appLocalDate:()=> '2026-10-21',document:{readyState:'loading',addEventListener(){}},JournalModule:{entries:[{id:'OJM260018',date:'2026-01-31',account:'VAT Expense',debit:1941987,status:'posted'},{id:'VOID',date:'2026-01-31',account:'VAT Expense',debit:99,status:'voided'},{id:'PENDING',date:'2026-01-31',account:'VAT Expense',debit:99,pendingSync:true}]}};
vm.createContext(c);vm.runInContext(source.replace('window.taxReports102={','window.testState=state;window.taxReports102={'),c);
c.window.testState.month='2026-01';const rows=c.window.taxReports102.journalRows();assert.equal(rows.length,1);assert.equal(rows[0].debit,1941987);assert.equal(rows[0].group,'VAT');c.window.testState.month='2026-02';assert.equal(c.window.taxReports102.journalRows().length,0);
const pagination=fs.readFileSync('src/shared/ui/table-pagination14383.js','utf8');assert.match(pagination,/!table.closest\('#transactions-journal,#transactions-all'\)/);assert.match(pagination,/<=100/);
const report=fs.readFileSync('src/reports/financial/reports-desktop-v79.js','utf8');assert.doesNotMatch(report,/rows=rows.slice\(s.page\*100/);
console.log('VAT source/month tests passed; report/account pagination exclusion verified in source');
