const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={formatAppDate:s=>s.split('-').reverse().join('/'),wsIsCollection:()=>false};vm.createContext(c);vm.runInContext(fs.readFileSync('src/bridges/subusers-bookkeeping/report-workflow/consolidation.js','utf8'),c);
const j={period_start:'2026-10-01',lines:[
 {id:'a',line_no:8,workspace_entry_no:'PC8',transaction_date:'2026-10-06',fund_account_id:'cash',account_id:'food',currency_code:'LAK',amount:80,direction:'out',memo:'Cooking oil | bread flour',reference:'October - Cook P_C.pdf | item 8'},
 {id:'b',line_no:9,workspace_entry_no:'PC9',transaction_date:'2026-10-06',fund_account_id:'cash',account_id:'kitchen',currency_code:'LAK',amount:8,direction:'out',memo:'Dishwashing liquid',reference:'October - Cook P_C.pdf | item 8'},
 {id:'c',line_no:10,workspace_entry_no:'PC10',transaction_date:'2026-10-07',fund_account_id:'cash',account_id:'kitchen',currency_code:'LAK',amount:26,direction:'out',memo:'Paper towels',reference:'Journal.pdf | entry 364 | item 9 | revised amount'}]};
const rows=c.summarize(j,'fund_totals','2026-10-31');
assert.deepEqual(Array.from(rows,r=>r.description),['8. Cooking oil | bread flour','8. Dishwashing liquid','9. Paper towels','Items 8–9']);
assert.equal(rows.at(-1).credit,114);assert.equal(rows.filter(r=>r.credit).length,1);
const legacy=(l,dated)=>[dated?c.formatAppDate(l.transaction_date):null,l.workspace_entry_no,l.memo,l.reference].filter(Boolean).join(' · ');
for(const dated of [false,true]){
 const old=rows.map(r=>({...r,description:j.lines.filter(l=>r.source_ids.includes(l.id)).reverse().map(l=>legacy(l,dated)).join(' | '),source_ids:[]}));
 const matched=c.matchReportJournal261(j,old,'fund_totals','2026-10-31');assert.deepEqual(Array.from(matched.lines,r=>r.description),Array.from(rows,r=>r.description));
}
const custom='My edited description | keep this note';assert.equal(c.cleanReportMemo261(custom,rows[0],j),custom);
const incomplete=legacy(j.lines[0],false);assert.equal(c.cleanReportMemo261(incomplete,rows.at(-1),j),incomplete);
assert.equal(c.reportItem263({reference:'A.pdf | item 0',line_no:4},2),3);
assert.equal(c.reportItem263({reference:'Invoice.pdf',line_no:4},2),4);
assert.equal(c.reportItem263({reference:'Invoice.pdf',line_no:null},2),3);
console.log('PASS embedded separators, original split-item numbering, single fund credit, old generated memo cleanup, and custom wording preservation');
