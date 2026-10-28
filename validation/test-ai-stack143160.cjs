const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const html=fs.readFileSync('desktop.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const head=['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo','ai_source_ref'];
const makeRows=(id,memo='Withdrawal')=>[[id,'2026-01-09',memo,1,'bank','1040','LAK',0,100,'2026-01-09',1,'','Bank',''],[id,'2026-01-09',memo,2,'cash','1010','LAK',100,0,'2026-01-16',1,'','Cash','']];
const chart=[{id:'bank',code:'1040',name:'Bank',currency_code:'LAK',is_posting:true,is_active:true},{id:'cash',code:'1010',name:'Cash',currency_code:'LAK',is_posting:true,is_active:true},{id:'usd',code:'1020',name:'USD cash',currency_code:'USD',is_posting:true,is_active:true}];
const tick=()=>new Promise(r=>setTimeout(r,25));
async function fixture(storage={}){
 const dom=new JSDOM(html,{url:'https://accounting.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 const state={rows:[head,...makeRows('draft-0001'),...makeRows('draft-0002','Supplies')],receipts:new Map(),dispositions:new Map(),posted:[],batches:[],archived:[],fail:false,loseResponse:false,duringRead:null};
 Object.assign(w,{liveProfile:{id:'reviewer',role:'admin'},access113:{can:()=>true},ApplicationSettings:{accounting:{journalPrefix:'OJM',journalDigits:4},system:{numberFormat:'1,234.56'}},JournalModule:{editingEntryId:null},AccountingStore:{accounts:chart.map(a=>({...a,currency:a.currency_code}))},PeriodReview:{pendingAdjustment:null},pendingWorkspacePostJournalId:null,pendingWorkspacePostOwnerId:null,formatEntryId143114:()=> 'OJM260009',formatAppDate:s=>s,formatAppNumber:n=>Number(n).toLocaleString('en-US'),parseAppNumber:n=>Number(String(n).replace(/,/g,'')),showCenterStatus:()=>{},loadJournalFromSupabase:async()=>{},submitJournalEntry:()=>{throw Error('AI must not use manual posting')},confirm:()=>true,entry1430:{mode:'double'},offline14239:{offline:()=>false}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLElement.prototype.scrollTo=function({top}){this.scrollTop=top;};w.switchTab=id=>{d.querySelectorAll('.tab-content').forEach(n=>n.classList.toggle('active',n.id===id));w.dispatchEvent(new w.Event('page113'));};
 d.getElementById('jeGeneralMemo').value='';d.getElementById('jeLinesBody').replaceChildren();for(const [key,val]of Object.entries(storage))w.localStorage.setItem(key,val);
 w.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},from:table=>{const result=()=>{if(table==='budget_settings14313')return {data:{id:true,version:1,data:{}}};if(table==='google_inbox143150')return {data:{notices:state.rows.filter((r,i)=>i&&r[3]===1).map(r=>({noticeId:r[0]}))}};if(table==='journal_entries')return {data:[]};if(state.duringRead){const fn=state.duringRead;state.duringRead=null;fn();}return {data:chart};};const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,setHeader:()=>q,maybeSingle:()=>q,ilike:()=>q,limit:()=>q,then:(resolve,reject)=>Promise.resolve(result()).then(resolve,reject)};return q;},rpc:async(name,args)=>{
  if(name==='drive_draft_dispositions143160')return {data:[...state.dispositions].map(([draft,status])=>({draft,status}))};
  if(name==='set_drive_draft_disposition143160'){if(state.receipts.has(args.p_draft))return {error:{message:'already posted'}};if(args.p_status==='pending')state.dispositions.delete(args.p_draft);else state.dispositions.set(args.p_draft,args.p_status);return {data:null};}
  if(name==='drive_journal_receipt143128')return {data:state.receipts.get(args.p_draft)||null};
  if(name==='preview_journal_number143114')return {data:9};
  if(name==='approve_drive_journal_batch143160'){
   state.batches.push(args);if(state.fail)return {error:{message:'Fixture rejected entire batch'}};
   for(const x of args.p_drafts)if(state.dispositions.has(x.draft_id))return {error:{message:'Draft rejected'}};
   const data=args.p_drafts.map(x=>{const result=[{entry_id:'entry-'+x.draft_id,entry_no:'OJM26'+String(9+state.posted.length).padStart(4,'0')}];state.posted.push(x);state.receipts.set(x.draft_id,{payload:[x.entry],result});return {draft_id:x.draft_id,result};});
   if(state.loseResponse){state.loseResponse=false;throw Error('Connection lost after commit');}return {data};
  }throw Error(name);
 }};
 w.fetch=async(url,options)=>{const req=JSON.parse(options.body);if(req.action==='accounts-sync')return {ok:true,json:async()=>({accounts:chart})};if(req.action==='status')return {ok:true,json:async()=>({connected:true,email:'company@test'})};const path=decodeURIComponent(req.path);let data={};
 if(path.includes('fields=sheets'))data={sheets:['Accounts','Drafts','Posted Archive'].map((title,i)=>({properties:{title,sheetId:i+1,gridProperties:{rowCount:200}}}))};
 else if(path.includes(':append'))state.archived.push(...req.body.values);
 else if(path.includes('Posted Archive'))data={values:state.archived};
 else if(path.includes('/values/'))data={values:state.rows};
 else if(path.includes(':batchUpdate'))for(const r of req.body.requests)if(r.deleteDimension)state.rows.splice(r.deleteDimension.range.startIndex,1);
 return {ok:true,json:async()=>data};};
 await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve));
 w.eval(fs.readFileSync('src/settings/application/settings-groups14332.js','utf8'));
 w.eval(fs.readFileSync('src/shared/formatting/financial-numbers14231.js','utf8'));
 w.eval(fs.readFileSync('src/bookkeeping/journal/memo-links143187.js','utf8'));
 w.eval(fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8'));await tick();w.DriveDrafts143128.open();await tick();
 const click=async sel=>{const n=d.querySelector(sel);assert.ok(n,'Missing '+sel);n.click();await tick();};
 const edit=id=>click('[data-draft="'+id+'"] [data-draft-action="edit"]');
 const input=(sel,val)=>{const n=d.querySelector(sel);assert.ok(n,sel);n.value=val;n.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const status=()=>d.querySelector('#gptDrafts143129 [data-drive-status]').textContent;
 return {dom,w,d,state,click,edit,input,status};
}
(async()=>{
 let f=await fixture();let {w,d,state,click,edit,input,status}=f;
 assert.equal(d.querySelectorAll('[data-draft-action="rejected"]').length,2);assert.equal(d.querySelectorAll('[data-draft-action="deleted"]').length,0);assert.equal(d.querySelectorAll('[data-draft-action="post"]').length,2);assert.equal(d.querySelector('[data-preparation],[data-rejected]'),null);
 d.getElementById('jeGeneralMemo').value='Manual work';await edit('draft-0001');assert.match(status(),/unfinished work/);assert.equal(w.DriveDrafts143128.preparedCount,0);d.getElementById('jeGeneralMemo').value='';
 state.duringRead=()=>{w.DriveDrafts143128.choose('journal');d.getElementById('jeGeneralMemo').value='Work during fetch';};await edit('draft-0001');assert.equal(w.DriveDrafts143128.preparedCount,0);assert.match(status(),/editor changed/);d.getElementById('jeGeneralMemo').value='';w.DriveDrafts143128.open();await tick();
 await edit('draft-0001');await edit('draft-0002');assert.equal(w.DriveDrafts143128.preparedCount,2);assert.equal(w.DriveDrafts143128.view,'gpt');assert.equal(state.posted.length,0);
 w.DriveDrafts143128.choose('journal');w.switchTab('journal');await tick();assert.equal(w.DriveDrafts143128.view,'journal');assert.equal(d.getElementById('aiPreparation143160').hidden,false);assert.equal(d.querySelectorAll('[data-prepared-draft]').length,2);
 if(process.env.AI_STACK_PREVIEW_HTML)fs.writeFileSync(process.env.AI_STACK_PREVIEW_HTML,'<!doctype html><html><head>'+d.head.innerHTML+'</head><body><main>'+d.getElementById('journal').outerHTML+'</main></body></html>');
 const a='[data-prepared-draft="draft-0001"] ',b='[data-prepared-draft="draft-0002"] ';
 input(a+'[data-field="description"]','Reviewed withdrawal');input(b+'[data-field="description"]','Reviewed supplies');
 const amount=d.querySelector(a+'[data-line="1"] [data-field="debit"]');amount.focus();amount.setSelectionRange(1,1);assert.equal(amount.value,'100');assert.equal(amount.selectionStart,1);
 amount.setSelectionRange(3,3);amount.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',bubbles:true,cancelable:true}));assert.equal(amount.value,'100,000');input(a+'[data-line="0"] [data-field="credit"]','100,000');
 input(b+'[data-line="1"] [data-field="line_date"]','2026-02-01');assert.match(d.querySelector(b+'[data-date-warning]').textContent,/Other-month/);
 // Check adding/removing a line and a foreign account preserves other entry edits.
 await click(b+'[data-add-line]');input(b+'[data-line="2"] [data-field="account_id"]','usd');assert.ok(d.querySelector(b+'[data-rate="fx_rate_lak"]'));await click(b+'[data-remove-line="2"]');assert.equal(d.querySelector(a+'[data-field="description"]').value,'Reviewed withdrawal');
 w.DriveDrafts143128.open();await tick();w.DriveDrafts143128.choose('journal');w.switchTab('journal');await tick();assert.equal(d.querySelector(b+'[data-field="description"]').value,'Reviewed supplies');
 state.rows[1][2]='Changed source';await click('[data-post-all]');assert.match(status(),/changed in Google Sheets/);assert.equal(state.batches.length,0);state.rows[1][2]='Withdrawal';
 w.offline14239.offline=()=>true;await click('[data-post-all]');assert.match(status(),/Connect online/);assert.equal(state.batches.length,0);w.offline14239.offline=()=>false;
 state.fail=true;await click('[data-post-all]');assert.equal(state.posted.length,0);assert.equal(w.DriveDrafts143128.preparedCount,2);state.fail=false;
 // Reload restores every edited section, still unposted.
 const storage=Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));f.dom.window.close();
 f=await fixture(storage);({w,d,state,click,edit,input,status}=f);assert.equal(w.DriveDrafts143128.preparedCount,2);w.DriveDrafts143128.choose('journal');w.switchTab('journal');await tick();assert.equal(d.querySelector(a+'[data-field="description"]').value,'Reviewed withdrawal');assert.equal(d.querySelector(a+'[data-line="1"] [data-field="debit"]').value,'100,000');
 state.loseResponse=true;await click('[data-post-all]');assert.equal(state.posted.length,2);assert.equal(w.DriveDrafts143128.preparedCount,2);assert.match(status(),/Connection lost/);
 assert.notEqual(state.receipts.get('draft-0001').result[0].entry_no,state.receipts.get('draft-0002').result[0].entry_no);assert.equal(state.posted[0].entry.p_transaction_date,state.posted[1].entry.p_transaction_date);assert.equal(state.posted[0].entry.p_lines[1].debit,100000);assert.equal(state.posted[1].entry.p_lines[1].line_date,'2026-01-09');assert.match(state.posted[1].entry.p_lines[1].description,/Receipt date: 2026-02-01/);
 await click('[data-post-all]');assert.equal(state.posted.length,2);assert.equal(state.batches.length,1);assert.equal(w.DriveDrafts143128.preparedCount,0);assert.equal(state.archived.length,4);assert.equal(state.rows.length,1);f.dom.window.close();
 f=await fixture();({w,d,state,click,edit,input,status}=f);
 await edit('draft-0001');await click('[data-draft="draft-0001"] [data-draft-action="rejected"]');assert.equal(w.DriveDrafts143128.preparedCount,0);assert.equal(d.querySelector('[data-draft="draft-0001"]'),null);assert.equal(w.DriveDrafts143128.notices().some(n=>n.noticeId==='draft-0001'),false);
 await click('[data-refresh]');assert.equal(d.querySelector('[data-draft="draft-0001"]'),null);assert.equal(state.rows.length,5);assert.equal(state.posted.length,0);
 w.confirm=()=>false;await click('[data-draft="draft-0002"] [data-draft-action="rejected"]');assert.equal(state.dispositions.size,1);w.confirm=()=>true;
 await edit('draft-0002');w.DriveDrafts143128.choose('journal');w.switchTab('journal');await tick();await click('[data-remove-prepared]');assert.equal(w.DriveDrafts143128.preparedCount,0);assert.equal(state.rows.length,5);
 f.dom.window.close();
 // Direct posting uses the same guarded endpoint without opening or changing the manual editor.
 f=await fixture();({w,d,state,click,edit,input,status}=f);
 const summary=()=>w.getTodoNotices136().filter(n=>n.target==='ai-journal');
 assert.equal(summary().length,1);assert.equal(summary()[0].title,'2 entries');const firstKey=summary()[0].noticeId;
 d.getElementById('jeGeneralMemo').value='Keep manual work';
 const post=()=>click('[data-draft="draft-0001"] [data-draft-action="post"]');
 state.rows[1][2]='Source changed';await post();assert.match(status(),/changed in Google Sheets/);assert.equal(state.batches.length,0);state.rows[1][2]='Withdrawal';
 w.offline14239.offline=()=>true;await post();assert.equal(state.batches.length,0);w.offline14239.offline=()=>false;
 state.fail=true;await post();assert.equal(state.posted.length,0);assert.ok(d.querySelector('[data-draft="draft-0001"]'));state.fail=false;
 state.loseResponse=true;
 const button=d.querySelector('[data-draft="draft-0001"] [data-draft-action="post"]');button.click();button.click();await tick();
 assert.equal(state.posted.length,1);assert.equal(state.batches.length,2);assert.match(status(),/Connection lost/);assert.equal(w.DriveDrafts143128.preparedCount,0);
 await post();assert.equal(state.posted.length,1);assert.equal(state.batches.length,2);assert.equal(state.archived.length,2);assert.equal(w.DriveDrafts143128.view,'gpt');assert.equal(d.getElementById('jeGeneralMemo').value,'Keep manual work');assert.equal(summary().length,1);assert.equal(summary()[0].title,'1 entry');assert.notEqual(summary()[0].noticeId,firstKey);
 d.getElementById('jeGeneralMemo').value='';await edit('draft-0002');assert.equal(d.querySelector('[data-draft="draft-0002"] [data-draft-action="post"]').disabled,true);
 await click('[data-draft="draft-0002"] [data-draft-action="rejected"]');assert.equal(summary().length,0);assert.equal(w.DriveDrafts143128.preparedCount,0);await click('[data-refresh]');assert.equal(summary().length,0);assert.equal(state.posted.length,1);
 // Same count, different drafts gets a fresh summary identity. Invalid displayed drafts cannot post.
 state.rows.push(...makeRows('draft-0003'));await click('[data-refresh]');const oldKey=summary()[0].noticeId;
 state.rows=state.rows.filter(r=>r[0]!=='draft-0003');state.rows.push(...makeRows('draft-0004'));await click('[data-refresh]');assert.equal(summary()[0].title,'1 entry');assert.notEqual(summary()[0].noticeId,oldKey);
 state.rows.find(r=>r[0]==='draft-0004')[4]='missing-account';await click('[data-refresh]');assert.equal(d.querySelector('[data-draft="draft-0004"] [data-draft-action="post"]').disabled,true);
 f.dom.window.close();console.log('PASS AI stack/direct post: queue without navigation, manual-work/race guards, distinct editable sections, focus/caret and K suffix, FX controls, cross-month receipts, persistence/reload, source-change and offline checks, failed atomic batch, lost-response retry, separate same-date IDs, archive once, reject/removal/cancel, grouped notification counts and membership, direct posting, double-click/lost-response protection, manual-editor preservation, invalid draft blocking. No live writes.');
})().catch(e=>{console.error(e);process.exitCode=1;process.exit(1)});
