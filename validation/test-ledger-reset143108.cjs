const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{performance}=require('node:perf_hooks');
const root=require('node:path').resolve(__dirname,'..');
const ctx={console,URL,Date,Intl,Map,Set,JSON,Number,String,Math,structuredClone,performance,
 document:{readyState:'loading',addEventListener(){},querySelector(){return null}},
 matchMedia:()=>({matches:true,addEventListener(){}}),switchTab(){},refreshAllTables(){},logoutDemoUser(){},
 escapeHtml:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),formatAppNumber:n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),formatAppDate:s=>s,
 AccountingStore:{accounts:[{id:'cash',code:'100',name:'Cash USD',currency:'USD',type:'ASSET',isPosting:true},{id:'income',code:'400',name:'Income',currency:'USD',type:'REVENUE',isPosting:true}]},CurrencyStore:{currencies:[{code:'USD'}]},JournalModule:{entries:[]}
};ctx.window=ctx;vm.createContext(ctx);
const run=path=>vm.runInContext(fs.readFileSync(root+'/'+path,'utf8'),ctx,{filename:path});
run('src/accounts/chart/accounts-v69.js');
ctx.JournalFX14383={base:(l,side)=>Number(l[side]||0)*Number(l.fx_rate_lak||1)};
run('src/reports/financial/reports-desktop-v79.js');
vm.runInContext("Object.assign(Reports79,{kind:'gl',from:'2026-10-01',to:'2026-10-31',basis:'LAK'});",ctx);
ctx.JournalModule.entries=Array.from({length:10000},(_,i)=>({id:'MP-2026-'+String(i+1).padStart(6,'0'),date:'2026-10-01',accountId:i%2?'income':'cash',account:i%2?'Income':'Cash USD',currency:'USD',debit:i%2?0:1,credit:i%2?1:0,fx_rate_lak:10000,memo:'',generalMemo:'Complete description '+i,status:'posted'}));
const before=JSON.stringify(ctx.JournalModule.entries),t=performance.now();
const g=ctx.reportModel79('gl')[0],html=ctx.reportTable79(g.headers,g.values,g.currency),elapsed=performance.now()-t;
assert(!g.headers.includes('Original DR / CR'));assert.equal(g.headers.length,8);assert(g.values.every(r=>r.length===8));assert(g.values.every(r=>r[3].startsWith('Complete description')));assert.equal(g.metrics.find(r=>r[0]==='Period debit')[1],5000000000);assert.equal(g.metrics.find(r=>r[0]==='Period credit')[1],5000000000);
assert.equal((html.match(/data-entry=/g)||[]).length,100);assert(html.includes('1 of 100'));assert(html.includes('data-own-pager14383="1"'));assert(html.includes('data-ledger-column143108="rate"'));
vm.runInContext('renderReports79=()=>{};reportPage143108([...reportPages143108.keys()][0],1)',ctx);
const next=ctx.reportTable79(g.headers,g.values,g.currency);assert(next.includes('2 of 100'));assert(!next.includes('data-entry="MP-2026-010000"'));assert.equal((next.match(/data-entry=/g)||[]).length,100);
const printed=ctx.reportTable79(g.headers,g.values,g.currency,true);assert.equal((printed.match(/data-ledger-column143108="id"/g)||[]).length,10001);assert(!printed.includes('table-pages14383'));assert.equal(JSON.stringify(ctx.JournalModule.entries),before);
vm.runInContext("Reports79.basis='original'",ctx);const original=ctx.reportModel79('gl')[0];assert.equal(original.headers.length,7);assert(!original.headers.includes('LAK rate'));assert.equal(original.metrics.find(r=>r[0]==='Period debit')[1],500000);
ctx.JournalModule.entries=[];const empty=ctx.reportModel79('gl')[0];assert(empty.metrics.every(r=>r[1]===0));assert(ctx.reportTable79(empty.headers,empty.values,empty.currency).includes('1 of 1'));
ctx.OJM_SUPABASE_URL='https://nhjsesfhapnjtwlxvirm.supabase.co';run('src/core/sync/operational-reset143108.js');const reset=ctx.accountingReset143108;assert(reset.enabled());assert(reset.suffix());assert.equal(reset.keepJob({kind:'runs',created:'2026-10-18T01:00:00Z'}),false);assert(reset.keepJob({kind:'runs',created:'2026-10-19T06:00:00Z'}));for(const kind of ['employees','leaves','documents','reports'])assert(reset.keepJob({kind}));ctx.OJM_SUPABASE_URL='https://dfrulsnparrouuzjbtih.supabase.co';assert.equal(reset.enabled(),false);assert.equal(reset.suffix(),'');assert(reset.keepJob({kind:'runs'}));
console.log(`PASS 10,000-line ledger: correct totals, 100 mounted rows, pagination, complete print/export model, original basis, empty ledger, reset isolation and preserved employee jobs (${Math.round(elapsed)} ms model + HTML).`);
