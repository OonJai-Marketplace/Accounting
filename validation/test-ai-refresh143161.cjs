const fs=require('fs'),assert=require('node:assert/strict');
const {JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const html=fs.readFileSync('desktop.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const tick=()=>new Promise(r=>setTimeout(r,5));
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await tick();}assert.fail('Condition did not settle');};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
(async()=>{
 const dom=new JSDOM(html,{url:'https://accounting.test/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document;
 try{
 const intervals=new Map(),nativeTimeout=w.setTimeout.bind(w);w.setInterval=(fn,ms)=>{intervals.set(ms,fn);return ms;};
 // Exercise real deadline/abort behavior without making the suite wait 35 seconds.
 w.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms>=20000?100:ms,...args);
 const chart=[{id:'bank',code:'1040',name:'Bank',currency_code:'LAK',is_posting:true,is_active:true},{id:'cash',code:'1010',name:'Cash',currency_code:'LAK',is_posting:true,is_active:true}];
 const head=['draft_id','posting_date','description','line_no','account_id','account_code','currency','debit','credit','line_date','fx_rate_lak','book_rate_lak','line_memo','ai_source_ref'];
 const rows=id=>chart.map((a,i)=>[id,'2026-01-09','Withdrawal',i+1,a.id,a.code,'LAK',i?100:0,i?0:100,'2026-01-09',1,'','Cash','']);
 const notice=id=>({noticeId:id,type:'AI Journal draft',title:id,target:'ai-journal'});
 const state={settingsReads:0,inboxReads:0,settingsGate:deferred(),inboxGate:null,metadataGate:null,statusGate:null,connected:true,error:null,notices:[notice('draft-0001'),notice('rejected-001')],rows:[head,...rows('draft-0001')],requests:[],signals:[],bell:0,previewCalls:0};
 let online=true;Object.defineProperty(w.navigator,'onLine',{get:()=>online});
 Object.assign(w,{liveProfile:null,access113:{can:()=>true},ApplicationSettings:{accounting:{journalPrefix:'OJM',journalDigits:4}},JournalModule:{editingEntryId:null},AccountingStore:{accounts:chart},PeriodReview:{pendingAdjustment:null},pendingWorkspacePostJournalId:null,pendingWorkspacePostOwnerId:null,formatEntryId143114:()=> 'OJM260009',formatAppDate:s=>s,formatAppNumber:n=>String(n),parseAppNumber:Number,showCenterStatus:()=>{},loadJournalFromSupabase:async()=>{},submitJournalEntry:()=>assert.fail('Financial posting is outside this test'),confirm:()=>true,entry1430:{mode:'double'},offline14239:{offline:()=>!online},refreshNotices1443:()=>state.bell++,logoutDemoUser:()=>{w.liveProfile=null;}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.switchTab=id=>{d.querySelectorAll('.tab-content').forEach(n=>n.classList.toggle('active',n.id===id));w.dispatchEvent(new w.Event('page113'));};
 d.getElementById('jeGeneralMemo').value='';d.getElementById('jeLinesBody').replaceChildren();
 w.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})},from:table=>{
  const result=async()=>{
   if(table==='budget_settings14313'){state.settingsReads++;if(state.settingsGate)await state.settingsGate.promise;return {data:{id:true,version:1,data:{googleSheets143129:{sheet:'fixture-sheet-1234567890123456',client:'fixture'}}}};}
   if(table==='google_inbox143150'){state.inboxReads++;if(state.inboxGate){const gate=state.inboxGate;state.inboxGate=null;return gate.promise;}return {data:{notices:state.notices,checked_at:'2026-10-22T01:30:00Z',error:state.error}};}
   return {data:chart};
  };const q={select:()=>q,eq:()=>q,order:()=>q,range:()=>q,maybeSingle:()=>q,abortSignal:signal=>{state.signals.push(signal);return q;},then:(res,rej)=>result().then(res,rej)};return q;
 },rpc:async name=>{
  if(name==='drive_draft_dispositions143160')return {data:[{draft:'rejected-001',status:'rejected'}]};
  if(name==='drive_journal_receipt143128')return {data:null};
  if(name==='preview_journal_number143114'){state.previewCalls++;return {data:9};}
  assert.fail('Unexpected RPC '+name);
 }};
 w.fetch=async(url,options)=>{const req=JSON.parse(options.body);state.requests.push(req);state.signals.push(options.signal);
  if(req.action==='status'){if(state.statusGate)await state.statusGate.promise;return {ok:true,json:async()=>({connected:state.connected,email:'fixture@example.test'})};}
  assert.equal(req.sheet,'fixture-sheet-1234567890123456','login must load shared settings before requests');
  if(req.path.includes('fields=sheets')){if(state.metadataGate)await state.metadataGate.promise;return {ok:true,json:async()=>({sheets:['Accounts','Drafts','Posted Archive'].map((title,i)=>({properties:{title,sheetId:i+1,gridProperties:{rowCount:100}}}))})};}
  return {ok:true,json:async()=>req.path.includes('/values/')?{values:state.rows}:{}};
 };
 await new Promise(r=>d.addEventListener('DOMContentLoaded',r));
 let source=fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8').replace('window.DriveDrafts143128={','window.probe={checkBackground,get busy(){return busy},get backgroundBusy(){return !!backgroundBusy}};window.DriveDrafts143128={');
 w.eval(source);await tick();assert.equal(state.inboxReads,0);
 const status=()=>d.querySelector('#gptDrafts143129 [data-connection-status]').textContent;const actionStatus=()=>d.querySelector('#gptDrafts143129 [data-drive-status]').textContent;
 // Login + simultaneous page/focus events share one initialization, with bell updates on Home.
 w.liveProfile={id:'reviewer',role:'admin'};w.dispatchEvent(new w.Event('page113'));w.dispatchEvent(new w.Event('focus'));intervals.get(1500)();await tick();assert.equal(state.settingsReads,1);
 state.settingsGate.resolve();state.settingsGate=null;await until(()=>/Automatic checks active/.test(status()));
 assert.deepEqual(Array.from(w.DriveDrafts143128.notices(),x=>x.noticeId),['draft-0001']);assert.match(status(),/Last checked/);assert.equal(state.requests.filter(r=>r.path?.includes('/values/')).length,0,'Home only reads notification metadata');assert.equal(w.DriveDrafts143128.view,'journal');
 assert.ok(intervals.has(15000));state.notices.push(notice('draft-0002'));intervals.get(15000)();await until(()=>w.DriveDrafts143128.notices().length===2);
 // Opening AI Journal starts its full load automatically, with one ID preview per date.
 state.rows.push(...rows('draft-0002'));w.DriveDrafts143128.open();await until(()=>d.querySelectorAll('[data-draft]').length===2&&!w.probe.busy);assert.equal(state.previewCalls,1);assert.doesNotMatch(actionStatus(),/Refreshing/);
 // Pending manual refresh keeps the table; notification polling continues during the wait.
 const oldTable=d.querySelector('[data-drive-list]').innerHTML;state.metadataGate=deferred();d.querySelector('[data-refresh]').click();await until(()=>w.probe.busy);state.notices.push(notice('draft-0003'));intervals.get(15000)();await until(()=>w.DriveDrafts143128.notices().length===3);assert.equal(d.querySelector('[data-drive-list]').innerHTML,oldTable);
 await until(()=>!w.probe.busy);assert.match(actionStatus(),/timed out/);assert.equal(d.getElementById('gptDrafts143129').inert,false);assert.ok(state.signals.some(s=>s.aborted));assert.equal(d.querySelector('[data-drive-list]').innerHTML,oldTable);
 const heldMetadata=state.metadataGate;state.metadataGate=null;heldMetadata.resolve();await tick();assert.equal(d.querySelector('[data-drive-list]').innerHTML,oldTable,'late response cannot replace the displayed table');
 d.querySelector('[data-refresh]').click();await until(()=>!w.probe.busy);assert.match(actionStatus(),/2 pending drafts loaded/);
 // Checks never replace prepared edits or their status message.
 d.querySelector('[data-draft-action="edit"]').click();await until(()=>w.DriveDrafts143128.preparedCount===1);d.querySelector('[data-preparation]').click();
 const memo=d.querySelector('[data-prepared-draft] [data-field="description"]');memo.value='Keep my adjustment';memo.dispatchEvent(new w.Event('input',{bubbles:true}));const prepStatus=d.querySelector('#aiPreparation143160 [data-drive-status]').textContent;
 state.notices.push(notice('draft-0004'));intervals.get(15000)();await until(()=>w.DriveDrafts143128.notices().length===4);assert.equal(memo.value,'Keep my adjustment');assert.equal(d.querySelector('#aiPreparation143160 [data-drive-status]').textContent,prepStatus);
 // Offline/reconnect automatically resumes; a server error remains visible even if authorization exists.
 online=false;w.dispatchEvent(new w.Event('offline'));assert.match(status(),/Offline/);online=true;state.error='Google authorization expired. Reconnect Google.';w.dispatchEvent(new w.Event('online'));await until(()=>/authorization expired/.test(status()));
 state.error=null;await w.probe.checkBackground();assert.match(status(),/Automatic checks active/);
 // Old-account responses cannot repopulate the bell or block the new account's checks.
 const oldInbox=deferred();state.inboxGate=oldInbox;const oldCheck=w.probe.checkBackground();await until(()=>state.inboxGate===null);
 w.logoutDemoUser();w.liveProfile={id:'other-reviewer',role:'admin'};state.notices=[notice('other-draft-001')];w.dispatchEvent(new w.Event('page113'));await until(()=>w.DriveDrafts143128.notices()[0]?.noticeId==='other-draft-001');oldInbox.resolve({data:{notices:[notice('old-private-001')]}});await oldCheck;assert.deepEqual(Array.from(w.DriveDrafts143128.notices(),n=>n.noticeId),['other-draft-001']);assert.equal(w.probe.backgroundBusy,false);
 // A stuck status check releases its guard and retries on the next automatic cycle.
 state.statusGate=deferred();w.dispatchEvent(new w.Event('online'));await until(()=>/timed out/.test(status())&&!w.probe.backgroundBusy);state.statusGate.resolve();state.statusGate=null;intervals.get(15000)();await until(()=>/Automatic checks active/.test(status()));
 // No Google connection has an actionable status, with no endless checking or draft placeholders.
 state.connected=false;w.dispatchEvent(new w.Event('online'));await until(()=>/Connect the company Google account once/.test(status()));assert.equal(w.DriveDrafts143128.notices().length,0);assert.doesNotMatch(actionStatus(),/Refreshing/);
 assert(!state.requests.some(r=>r.action==='connect'),'login must not start interactive consent');assert.ok(state.bell>0);
 console.log('PASS login/focus single-flight, saved-connection reuse, Home notifications, 15-second polling, automatic table load, shared ID preview, timeout/late-response recovery, nonblocking bell updates, prepared-edit preservation, offline/reconnect, server errors, account isolation and retry. No live financial writes.');
 }finally{dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
