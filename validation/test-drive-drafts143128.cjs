const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c={window:{},document:{readyState:'loading',addEventListener(){}},console};vm.createContext(c);vm.runInContext(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'),c);const api=c.window.DriveDrafts143128;
const h=['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo'];
const data=[h,['test-0001','2026-01-09','Withdrawal',1,'bank','1040','LAK',0,100,'2026-01-09',1,'','Bank withdrawal'],['test-0001','2026-01-09','Withdrawal',2,'cash','1010','LAK',100,0,'2026-01-16',1,'','Cash received']];
const chart=[{id:'bank',code:'1040',currency_code:'LAK',is_posting:true,is_active:true},{id:'cash',code:'1010',currency_code:'LAK',is_posting:true,is_active:true}],settings={prefix:'OJM',digits:6};
const rows=api.parse(data).get('test-0001');const result=api.normalize(rows,chart,settings);assert.equal(result.p_lines.length,2);assert.equal(result.p_lines[1].line_date,'2026-01-16');assert.equal(result.p_lines[1].description,'Cash received');
function bad(change,match){const rs=structuredClone(rows);change(rs);assert.throws(()=>api.normalize(rs,chart,settings),match);}
bad(r=>r[1].line_no=1,/unique/);bad(r=>r[1].posting_date='2026-02-30',/share/);bad(r=>r[1].credit=1,/exactly one/);bad(r=>r[1].debit='100',/numeric/);bad(r=>r[1].account_id='missing',/missing/);bad(r=>r[1].currency='USD',/currency/);bad(r=>r[1].account_code='999',/code/);bad(r=>r[1].line_date='2026-02-30',/date/);bad(r=>r[1].debit=Infinity,/numeric/);
assert.throws(()=>api.normalize(rows,[{...chart[0],is_active:false},chart[1]],settings),/inactive/);
const cross=structuredClone(rows);cross[1].line_date='2026-02-03';const normalized=api.normalize(cross,chart,settings);assert.equal(normalized.p_lines[1].line_date,'2026-01-09');assert.match(normalized.p_lines[1].description,/Receipt date: 2026-02-03/);
assert.equal(api.parse([h]).size,0);assert.throws(()=>api.parse([['bad']]),/headers/);assert.equal(api.validDate('2026-02-29'),false);assert.equal(api.validDate('2024-02-29'),true);
console.log('Drive draft validation: 16 cases passed; no live postings.');
