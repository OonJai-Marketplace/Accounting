const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 let source=fs.readFileSync('validation/test-ai-stack143160.cjs','utf8').split('(async()=>{')[0];
 source=source.replace("w.eval(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'));", `
 w.escapeHtml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');w.formatAppRate=n=>n==null?'—':Number(n).toLocaleString('en-US');w.JournalModule.entries=[];w.getSelectedAccountInfo=()=>null;
 w.JournalFX14383={base:(l,side)=>Number(l[side]||0)*Number(l.fx_rate_lak||0)};
 w.yearWindow14333={state:()=>({from:'2026-01-01',to:'2026-12-31',opening:[]})};
 state.rate=22000;const oldRpc=w.ojmDb.rpc;w.ojmDb.rpc=async(name,args)=>name==='account_exchange_rates143186'?{data:{as_of:args.p_as_of,calculated_at:'2026-10-28T11:00:00Z',accounts:[{account_id:'usd',average_rate:state.rate,rate_status:'available'}]}}:oldRpc(name,args);
 const r1=['draft-fx01','2026-01-09','USD transfer [Rate basis](https://www.bcel.com.la/)',1,'usd','1020','USD',10,0,'2026-01-09',22500,21900,'Incoming [Statement](https://example.com/statement)',''];const r2=[...r1];r2[3]=2;r2[7]=0;r2[8]=10;r2[12]='Outgoing';state.rows=[head,r1,r2];
 w.eval(fs.readFileSync('src/bookkeeping/journal/memo-links143187.js','utf8'));
 w.eval(fs.readFileSync('src/bookkeeping/journal/account-rates143186.js','utf8'));
 w.eval(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'));
 `);
 const {fixture}=new Function('require',source+'\nreturn {fixture};')(require);const f=await fixture();const {w,d,state}=f;
 try{
 await new Promise(r=>setTimeout(r,70));
 let notice=d.querySelector('[data-draft="draft-fx01"] .account-rate-review143186');assert(notice);assert.match(notice.textContent,/22,000/);assert.match(notice.textContent,/21,900/);assert.match(notice.textContent,/-100/);
 state.rate=22100;await f.click('[data-draft="draft-fx01"] [data-draft-action="post"]');assert.equal(state.posted.length,0);assert.match(f.status(),/Compare the rates/);
 await f.edit('draft-fx01');notice=d.querySelector('[data-prepared-draft="draft-fx01"] .account-rate-review143186');assert(notice);assert.match(notice.textContent,/22,100/);
 f.input('[data-prepared-draft="draft-fx01"] [data-rate="book_rate_lak"]','22050');assert.match(notice.textContent,/22,050/);assert.match(notice.textContent,/-50/);
 await f.click('[data-post-all]');assert.equal(state.posted.length,1);assert.equal(state.posted[0].entry.p_lines[0].book_rate_lak,22050);assert.equal(state.posted[0].entry.p_lines[0].fx_rate_lak,22500);assert.match(state.posted[0].entry.p_memo,/\[Rate basis\]\(https:/);assert.match(state.posted[0].entry.p_lines[0].description,/\[Statement\]\(https:/);
 console.log('PASS actual AI draft/preparation notices, changed-rate direct-post guard, edited book-rate comparison and unchanged submitted FX/book values');
 }finally{w.close();}
})().catch(e=>{console.error(e);process.exit(1)});
