const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const results=[];async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message);throw e}}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const binary={args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:async()=>'/tmp/chromium'};
const root=process.argv[2]||path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'validation/screenshots'),{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{if(fs.existsSync('/tmp/chromium')&&!fs.statSync('/tmp/chromium').size)fs.unlinkSync('/tmp/chromium');await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||await binary.executablePath(),args:binary.args.filter(a=>!a.includes("disable-web-security"))});
const context=await browser.newContext({serviceWorkers:'block',viewport:{width:1280,height:900},isMobile:false,hasTouch:false,timezoneId:'Asia/Vientiane'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.stack||e.message)});
await page.addInitScript(()=>{
window.__rafPerf={};const raf=requestAnimationFrame;window.requestAnimationFrame=fn=>{const key=String(fn).slice(0,160);return raf(time=>{const start=performance.now();try{return fn(time)}finally{const p=window.__rafPerf[key]||={calls:0,ms:0};p.calls++;p.ms+=performance.now()-start}})};

 const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const profiles=[{id:uid(1),email:'admin@example.invalid',full_name:'Santos Cabbigat',role:'admin',status:'active',user_permissions:{modules:[]}},...['Ryan Santos','Jade Plata','Gee Ann'].map((name,i)=>({id:uid(i+2),email:'staff'+i+'@example.invalid',full_name:name,role:'submitter',status:'active',user_permissions:{manager_id:uid(1),job_title:'Employee',department14229:'Operations',assigned_fund_account_ids:[uid(101+i)],destination_account_ids:[uid(110)],allowed_directions:['out'],module_actions113:{'sub-users-workspace':['view','edit'],'user-entry-review':['view','approve']}}}))];
 const accounts=['LAK','USD','THB'].map((c,i)=>({id:uid(101+i),code:String(101+i),name:'Cash on Hand',currency_code:c,currency:c,type:'ASSET',account_type:'ASSET',is_posting:true,isPosting:true,active:true}));accounts.push({id:uid(110),code:'5100',name:'Supplies',currency_code:'LAK',currency:'LAK',type:'EXPENSE',account_type:'EXPENSE',is_posting:true,isPosting:true,active:true});
 const balances=Object.fromEntries(profiles.slice(1).map((u,i)=>[u.id,[{id:accounts[i].id,account_id:accounts[i].id,name:accounts[i].name,currency:accounts[i].currency,opening:1000,received:100,used:20,handover:0,closing:1080}]]));
 const permissions=profiles.map(u=>({user_id:u.id,...u.user_permissions}));accounts.forEach(a=>a.is_active=true);const tables={report_types14253:[{id:uid(700),name:'Cashier report',active:true},{id:uid(701),name:'Expense report',active:true}],business_settings:[{id:true,legal_name:"Fixture Business",display_name:"Fixture Business"}],profiles,accounts,user_permissions:permissions,session_policy1443:[{id:true,timeout_minutes:60,warning_minutes:1}],currencies:[{code:'LAK',symbol:'₭',is_active:true,is_base:true},{code:'USD',symbol:'$',is_active:true},{code:'THB',symbol:'฿',is_active:true}]};
 function query(table){let filters=[];let single=false;let update=null;const q=new Proxy({}, {get(_,k){if(k==='then')return (resolve,reject)=>{const rows=(tables[table]||[]).filter(r=>filters.every(([k,v])=>(k.includes('->>')?r[k.split('->>')[0]]?.[k.split('->>')[1]]:r[k])===v));if(update){window.__writes.push({table,filters,update});rows.forEach(r=>{Object.assign(r,update);if(table==='user_permissions')Object.assign(profiles.find(u=>u.id===r.user_id).user_permissions,update)})}return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject)};return (...args)=>{if(k==='eq')filters.push(args);if(k==='single'||k==='maybeSingle')single=true;if(k==='update')update=args[0];if(k==='insert'){const row={id:crypto.randomUUID(),version:1,updated_at:new Date().toISOString(),...args[0]};(tables[table]||= []).push(row);filters.push(['id',row.id]);window.__writes.push({table,insert:row});}return q;}}});return q;}
 window.__pack14232={format:'oonjai-data-113',from:'2026-01-01',to:'2026-12-31',tables:{accounts,sub_accounts:[],currencies:tables.currencies,profiles,user_permissions:permissions,journal_entries:[{id:uid(201),entry_no:'TEST-1',transaction_date:'2026-01-05',memo:'Audit source',status:'posted'}],journal_lines:[{id:uid(301),journal_entry_id:uid(201),account_id:uid(110),currency_code:'LAK',debit:100,credit:0},{id:uid(302),journal_entry_id:uid(201),account_id:uid(101),currency_code:'LAK',debit:0,credit:100}],payroll_runs:[{id:uid(401),period_start:'2026-01-01',data:{results:[{employeeId:uid(501),name:'Audit Employee',net:1000}]}}],payroll_employees:[{id:uid(501),data:{name:'Audit Employee',salary:1000}}]},auditTrail:{audit_log:[]},storage:[]};const rpc=async(name,p={})=>{window.__calls.push(name);let data=[];if(name==='journal_window14333')data={rows:(window.__journalFixture||[]).slice(p.p_offset||0,(p.p_offset||0)+500),opening:[],revision:'fixture-'+JSON.stringify(window.__journalFixture||[])};if(name==='payroll_window14334')data={rows:[],revision:'fixture'};if(name==='budget_capabilities14316')data=window.__missingLifecycle?null:{version:14316};if(name==='delete_budget14316'){const ids=new Set([p.p_id,...(tables.operational_reports||[]).filter(r=>r.data.requestId14316===p.p_id).map(r=>r.id)]);tables.operational_reports=(tables.operational_reports||[]).filter(r=>!ids.has(r.id));data={deletedIds:[...ids]}}if(name==='admin_save_access1441')data={saved:true,user_id:p.p_user};if(name==='workflow_capabilities14253')data={version:14253};if(name==='submit_report14253'){window.__submitted14253=structuredClone(p);data=null;}if(name==='audit_snapshot14232')data=window.__pack14232;if(name==='backup_export113')data=window.__pack14232;if(name==='accounting_archive_preview127')data={rows:{},categories:{},total:0};if(name==='accounting_archive_audit126')data={audit_log:[]};if(name==='scoped_reset_backup14232')data={format:'oonjai-reset-14232',scopes:p.p_scopes,tables:{audit_log:[{id:1}]}};if(name==='scoped_reset14232')data={counts:{audit_log:1},total:1,requiredTables:[],preserved:'All unselected areas'};if(name==='branch_home14229')data={users:profiles.map(u=>({id:u.id,full_name:u.full_name,email:u.email,can_open:true,user_permissions:{assigned_fund_account_ids:u.user_permissions.assigned_fund_account_ids||[]}})),balances,reports:[]};if(name==='review_directory14229')data=profiles;if(name==='current_access14228')data={profile:profiles[0],permissions:profiles[0].user_permissions};if(name==='fund_balances136')data=balances[p.p_owner]||[];if(name==='reminder_load14229')data={revision:0,items:[]};if(name==='employee_photo113')data=null;if(name==='get_session_policy1443')data={timeout_minutes:60,warning_minutes:1};return {data:JSON.parse(JSON.stringify(data)),error:null};};
 window.__writes=[];window.__calls=[];window.__fixture={profiles,accounts,balances,tables};window.__db14231={rpc,from:query,auth:{getSession:async()=>({data:{session:null},error:null}),updateUser:async()=>({data:{},error:null}),onAuthStateChange:()=>{},refreshSession:async()=>({data:{session:null},error:null}),signInWithPassword:async()=>{await new Promise(r=>window.__releaseLoginFixture14232=r);return {data:{},error:{message:'Test sign-in rejected'}};},signOut:async()=>({error:null})},storage:{from:()=>({})},functions:{invoke:async()=>({data:{},error:null})}};
});
const gmailCalls=[];let gmailCode=200;
await page.route('**/*',async route=>{
 const url=route.request().url();
 if(url.includes('accounts.google.com/gsi/client'))return route.fulfill({contentType:'text/javascript',body:`window.google={accounts:{oauth2:{hasGrantedAllScopes:r=>!window.__denyScope,initTokenClient:options=>({requestAccessToken:()=>{window.__oauthScopes=options.scope;if(window.__lateOAuth){window.__lateCallback=()=>options.callback({access_token:'fixture-token',expires_in:3600});return}if(window.__cancelOAuth)return options.error_callback({type:'popup_closed'});setTimeout(()=>options.callback({access_token:'fixture-token',expires_in:window.__expiry||3600}),0)}})}}};`});
 if(url.includes('www.googleapis.com/oauth2/v3/userinfo'))return route.fulfill({contentType:'application/json',body:JSON.stringify({email:'sender@gmail.com',email_verified:true})});
 if(url.includes('gmail.googleapis.com/gmail/v1/users/me/messages/send')){gmailCalls.push(JSON.parse(route.request().postData()));await new Promise(r=>setTimeout(r,180));return route.fulfill({status:gmailCode,contentType:'application/json',body:JSON.stringify(gmailCode===200?{id:'fixture-mail-'+gmailCalls.length}:{error:{code:gmailCode}})});}
 if(url.includes('assets/vendor/supabase.js')||url.includes('supabase-js'))return route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__db14231};'});
 if(url.startsWith(base))return route.continue();return route.abort();
});
await page.goto(base+'/index.html',{waitUntil:'load'});await page.waitForTimeout(500);

await page.evaluate(()=>{localStorage.setItem('ojm_header_icons112_00000000-0000-4000-8000-000000000001',JSON.stringify({'main:dashboard':{data:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="none" stroke="white" stroke-width="1.5" d="M20 3C8 3 4 8 4 15a5 5 0 0 0 5 5c7 0 12-4 11-17ZM4 20c4-6 8-9 13-11"/></svg>')}}));liveProfile=__fixture.profiles[0];livePermission=__fixture.profiles[0].user_permissions;liveProfiles=__fixture.profiles;ojmDb=__db14231;window.ojmDb=ojmDb;DemoAccess.currentUser={...liveProfile,name:liveProfile.full_name,active:true};AccountingStore.accounts=__fixture.accounts;CurrencyStore.currencies=[{code:'LAK',symbol:'₭'},{code:'USD',symbol:'$'},{code:'THB',symbol:'฿'}];document.getElementById('loginGate').classList.add('is-authenticated');document.documentElement.classList.remove('session-checking1444');window.permissions1441.verified=true;});





page.setDefaultTimeout(10000);
await page.waitForTimeout(1000);await page.evaluate(()=>{syncAssessment14332.beforeClose=()=>{}});

await check('Single-entry returned report opens editable journal above an existing draft without filter failure',async()=>{
 await page.evaluate(()=>{const id=__fixture.profiles[1].id;window.__owner=id;const base={owner_id:id,period_start:'2026-10-01',lines:[]};const line={id:'returned-line',staff_journal_id:'returned-book',workspace_entry_no:1,transaction_date:'2026-10-01',direction:'out',fund_account_id:__fixture.accounts[0].id,account_id:__fixture.accounts[3].id,currency_code:'LAK',amount:20,memo:'Returned groceries',editor_snapshot1437:{mode:'single',memo:'Returned groceries',components1437:[{date:'2026-10-01',direction:'out',fund:__fixture.accounts[0].id,account:__fixture.accounts[3].id,amount:20,memo:'Returned groceries'}]}};reviewStaffJournals=[{...base,id:'returned-book',status:'returned',return_note:'Check receipt',lines:[line]},{...base,id:'draft-book',status:'draft',lines:[{...line,id:'draft-line',staff_journal_id:'draft-book',transaction_date:'2026-10-12',memo:'Existing saved entry',editor_snapshot1437:null}]}];window.__returnedFixture=structuredClone(reviewStaffJournals);const rpc=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=async(n,a)=>n==='review_inbox14229'?{data:structuredClone(__returnedFixture),error:null}:rpc(n,a);openWorkspaceUser(id);personalJournal1437.show(id,'journal');});
 assert.equal(await page.locator('[data-edit-personal="returned-line"]').count(),0);assert(await page.locator('[data-edit-personal="draft-line"]').isVisible());await page.evaluate(()=>openWorkspaceReview(__owner,'review'));assert((await page.locator('[data-personal-panel=review]').innerText()).includes('Check receipt'));await page.evaluate(()=>openReturnedBook('returned-book'));
 assert.equal(await page.locator('#returnedBookOverlay').count(),0);assert(await page.locator('#personalActive1437').isVisible());assert.equal(await page.locator('#personalActive1437 tbody tr').first().getAttribute('data-entry-id'),'returned-line');assert(await page.locator('[data-edit-personal="returned-line"]').isVisible());assert(await page.locator('[data-edit-personal="draft-line"]').isVisible());
 await page.locator('[data-edit-personal="returned-line"]').click();assert.equal(await page.locator('#jeGeneralMemo').inputValue(),'Returned groceries');assert.deepEqual(await page.evaluate(()=>document.getElementById('journalEntry98')._editIds1437),['returned-line']);
});
await check('Review badge and returned record retained; correction opens directly on tablet too',async()=>{
 await page.evaluate(()=>{navigationBadges14311.render();});
 const buttons=page.locator('[onclick*="openWorkspaceReview"]');assert(await buttons.count()>0);assert.equal(await buttons.locator('.nav-count14311').count(),0);
 await page.setViewportSize({width:820,height:1000});await page.evaluate(()=>{renderSubUserWorkspace();openReturnedBook('returned-book')});assert(await page.locator('#personalActive1437').isVisible());assert(await page.locator('[data-edit-personal="returned-line"]').isVisible());
 await page.setViewportSize({width:1280,height:900});
});
await check('Open period cannot reopen, prompt or create a correction session',async()=>{
 const r=await page.evaluate(async()=>{PeriodReview.selectedMonth='2026-10';PeriodReview.periods['2026-10']={status:'open'};switchTab('period-review');selectReviewPeriod('2026-10');const before=__calls.length;const result=await changePeriodStatus('open');return {result,calls:__calls.length-before}});assert.equal(r.result,false);assert.equal(r.calls,0);await page.waitForTimeout(100);assert(await page.locator('#period-review button[onclick="changePeriodStatus(\'open\')"]').isDisabled());
});
await check('Finalization does not acquire settings or sub-user blank strips',async()=>{
 await page.evaluate(()=>{switchTab('user-entry-review');workspaceConsistency14343.layout()});await page.waitForTimeout(400);assert.equal(await page.locator('#user-entry-review>#settingsSections14335').count(),0);assert.equal(await page.locator('#user-entry-review>.sub-user-tabs-shell:visible').count(),0);
});
await check('Workspace actions are right aligned and recent amounts stay on one line',async()=>{
 await page.evaluate(()=>{openWorkspaceUser(__owner);personalJournal1437.show(__owner,'home')});await page.waitForTimeout(200);assert(await page.locator('#subUserWorkspacePanel .v49-desktop-user-heading>.v49-desktop-user-actions').isVisible());
 const v=await page.evaluate(()=>{const n=document.querySelector('.personal-recent1437>b');n.textContent='100,000,000.00 KIP';const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {whiteSpace:getComputedStyle(n).whiteSpace,fits:r.right<=p.right+1}});assert.equal(v.whiteSpace,'nowrap');assert.equal(v.fits,true);
 const pos=await page.evaluate(()=>{const end=actionFeedback14296.begin(null,'Processing book…');const n=document.getElementById('actionProgress14343'),r=n.getBoundingClientRect();end();return {top:r.top,center:r.left+r.width/2,width:innerWidth}});assert.equal(pos.top,16);assert(Math.abs(pos.center-pos.width/2)<2);
});
await check('Page banners and titles absent; navigation stays at top; named account stays visible',async()=>{
 await page.evaluate(()=>{openWorkspaceUser(__owner);workspaceConsistency14343.layout()});await page.waitForTimeout(300);
 assert(await page.locator('#subUserWorkspacePanel .v49-desktop-user-heading h2').isVisible());
 assert.equal(await page.locator('[data-personal-tab="reports"]').count(),0);
 for(const target of ['journal','transactions-all','user-entry-review','settings-system','sub-users-workspace']){
  await page.evaluate(id=>{switchTab(id);workspaceConsistency14343.layout()},target);await page.waitForTimeout(200);
  const result=await page.evaluate(()=>{const panel=document.querySelector('.tab-content.active'),rows=[...panel.querySelectorAll(':scope>.sticky-tabs14344')].filter(n=>n.getClientRects().length);return {id:panel.id,banners:[...panel.querySelectorAll(':scope>.area-banner113,:scope>.module-header')].filter(n=>n.getClientRects().length).length,rows:rows.map(n=>({position:getComputedStyle(n).position,top:parseFloat(getComputedStyle(n).top)}))}});
  assert.equal(result.banners,0,JSON.stringify(result));assert(result.rows.length>0,JSON.stringify(result));assert.equal(result.rows[0].top,0,JSON.stringify(result));assert(result.rows.every(n=>n.position==='sticky'));
 }
 await page.evaluate(()=>{switchTab('transactions-all');workspaceConsistency14343.layout();const spacer=document.createElement('div');spacer.id='scrollFixture14348';spacer.style.height='2400px';document.querySelector('.tab-content.active').append(spacer);});await page.waitForTimeout(200);await page.evaluate(()=>document.querySelector('.workspace-scroll').scrollTop=500);await page.waitForTimeout(100);
 const boxes=await page.evaluate(()=>({top:document.querySelector('.workspace-scroll').getBoundingClientRect().top,rows:[...document.querySelectorAll('.tab-content.active>.sticky-tabs14344')].filter(n=>n.getClientRects().length).map(n=>{const b=n.getBoundingClientRect();return {top:b.top,bottom:b.bottom}})}));assert(Math.abs(boxes.rows[0].top-boxes.top)<2,JSON.stringify(boxes));for(let i=1;i<boxes.rows.length;i++)assert(Math.abs(boxes.rows[i].top-boxes.rows[i-1].bottom)<2);await page.evaluate(()=>{document.getElementById('scrollFixture14348').remove();document.querySelector('.workspace-scroll').scrollTop=0});
 await page.evaluate(()=>{switchTab('dashboard');workspaceConsistency14343.layout()});await page.waitForTimeout(200);assert(await page.locator('#dashboard .dash-hero112').isVisible());
 await page.evaluate(()=>{openWorkspaceUser(__owner);personalJournal1437.show(__owner,'home');workspaceConsistency14343.layout()});await page.waitForTimeout(200);assert.equal(await page.locator('.v49-desktop-user-actions').evaluate(n=>getComputedStyle(n).justifyContent),'flex-end');assert.equal(await page.locator('[data-report-history1443]').count(),0);await page.screenshot({path:'/tmp/workspace14348.png'});
});
await check('Correction Cancel returns to Review; active journal has all months and Finish reuses submission',async()=>{
 await page.evaluate(()=>{openWorkspaceUser(__owner);personalJournal1437.openCorrection('returned-book')});
 assert.equal(await page.locator('[data-personal-month]').count(),0);
 assert(await page.locator('.personal-correction14349').isVisible());
 assert.equal(await page.locator('.team-back14227:visible').count(),0);
 await page.getByRole('button',{name:'Cancel',exact:true}).last().click();
 assert(await page.locator('[data-personal-panel=review]').isVisible());
 await page.waitForTimeout(100);
 assert.equal(await page.locator('[onclick*=openWorkspaceReview] .nav-count14311').first().innerText(),'1');
 await page.evaluate(()=>{personalJournal1437.openCorrection('returned-book');clearJournalEntry();window.__originalSubmit=Reports14253.submit;Reports14253.submit=async batches=>{window.__finishBatches=batches.map(j=>j.id);return false}});
 await page.locator('.personal-correction14349').getByRole('button',{name:'Finish',exact:true}).click();
 assert.deepEqual(await page.evaluate(()=>__finishBatches),['returned-book']);
 await page.evaluate(()=>{Reports14253.submit=__originalSubmit;personalJournal1437.endCorrection(__owner);reviewStaffJournals.push({...reviewStaffJournals.find(j=>j.id==='draft-book'),id:'old-draft',period_start:'2026-09-01',lines:[{...reviewStaffJournals.find(j=>j.id==='draft-book').lines[0],id:'old-line',transaction_date:'2026-09-20'}]});personalJournal1437.show(__owner,'home');renderSubUserWorkspace();personalJournal1437.show(__owner,'journal')});
 assert(await page.locator('[data-edit-personal="old-line"]').isVisible());
});
await check('Posting choices keep dates, detailed counterpart lines and source IDs in one RPC',async()=>{
 await page.evaluate(()=>{switchTab('journal');const a=__fixture.accounts;window.__postingReport={id:'report-test',owner_id:__owner,period_start:'2026-10-01',lines:[10,20,30].map((amount,i)=>({id:'source-'+i,workspace_entry_no:101+i,transaction_date:i<2?'2026-10-05':'2026-10-06',direction:'out',fund_account_id:a[0].id,account_id:a[3].id,currency_code:'LAK',amount,memo:'Receipt '+i}))};PeriodReview.periods['2026-10']={status:'open'};window.__prep=prepareComparedForm69(__postingReport)});
 await page.getByRole('button',{name:'Consolidated fund entry',exact:true}).click();await page.evaluate(()=>__prep);
 assert.equal(await page.locator('#jeLinesBody tr').count(),5);
 assert.deepEqual(await page.locator('#jeLinesBody .je-line-date').evaluateAll(ns=>[...new Set(ns.map(n=>n.value))].sort()),['2026-10-05','2026-10-06']);
 assert((await page.locator('#jeLinesBody .je-line-memo').evaluateAll(ns=>ns.map(n=>n.value).join('|'))).includes('101, 102'));
 await page.evaluate(()=>{window.__prep=prepareComparedForm69(__postingReport)});
 await page.getByRole('button',{name:'Full transaction detail',exact:true}).click();await page.evaluate(()=>__prep);
 assert.equal(await page.locator('#jeLinesBody tr').count(),6);
 await page.evaluate(async()=>{const original=ojmDb.rpc;ojmDb.rpc=async(n,p)=>{if(n==='post_report14349'){window.__postedReport=structuredClone(p);return {error:{message:'Fixture stops before writing'}}}return original(n,p)};await submitJournalEntry();ojmDb.rpc=original;});
 const p=await page.evaluate(()=>__postedReport);assert.equal(p.p_mode,'detailed');assert.equal(p.p_journal,'report-test');assert.equal(p.p_lines.length,6);assert.equal(new Set(p.p_lines.map(l=>l.line_date)).size,2);assert(p.p_lines.every(l=>l.source_ids.length===1&&l.description.includes('Sub-user Entry ID:')));
});
await check('Confirmed report posting stays successful when its display refresh fails',async()=>{
 const result=await page.evaluate(async()=>{const rpc=ojmDb.rpc,load=loadJournalFromSupabase,status=showCenterStatus;const messages=[];let posts=0;ojmDb.rpc=async(n,p)=>n==='post_report14349'?(posts++,{data:{entry_id:'confirmed-report',entry_no:'TEST-POSTED'},error:null}):rpc(n,p);loadJournalFromSupabase=async()=>{throw Error('Fixture display refresh failure')};showCenterStatus=m=>messages.push(m);try{await submitJournalEntry();return {messages,posts,pending:pendingWorkspacePostJournalId}}finally{ojmDb.rpc=rpc;loadJournalFromSupabase=load;showCenterStatus=status}});
 assert.equal(result.posts,1);assert.equal(result.pending,'');assert(result.messages.some(x=>x.includes('Report posted as TEST-POSTED')&&x.includes('do not post the report again')));
});
await check('A fulfilled stale journal refresh warns after a confirmed post; a fresh read restores it without reposting',async()=>{
 await page.evaluate(()=>{window.__prep=prepareComparedForm69(__postingReport)});
 await page.getByRole('button',{name:'Full transaction detail',exact:true}).click();await page.evaluate(()=>__prep);
 const result=await page.evaluate(async()=>{
  const rpc=ojmDb.rpc,load=loadJournalFromSupabase,status=showCenterStatus,entries=JournalModule.entries,fixture=window.__journalFixture,periods=__fixture.tables.accounting_periods;
  const receipt={entry_id:'00000000-0000-4000-8000-000000000902',entry_no:'TEST-POSTED-STALE'},messages=[];
  let posts=0;
  ojmDb.rpc=async(n,p)=>n==='post_report14349'?(posts++,{data:receipt,error:null}):rpc(n,p);
  // A matching display number must not pass verification when the database UUID differs.
  loadJournalFromSupabase=async()=>{JournalModule.entries=[{id:receipt.entry_no,dbEntryId:'different-entry',date:'2026-10-05',debit:60,credit:0},{id:receipt.entry_no,dbEntryId:'different-entry',date:'2026-10-05',debit:0,credit:60}]};
  showCenterStatus=(message,isError)=>messages.push({message,isError:!!isError});
  try{
   await submitJournalEntry();const pending=pendingWorkspacePostJournalId;
   const staleVisible=JournalModule.entries.some(row=>row.dbEntryId===receipt.entry_id);
   window.__journalFixture=[{account:__fixture.accounts[3].name,accountId:__fixture.accounts[3].id,accountCode:__fixture.accounts[3].code,debit:60,credit:0},{account:__fixture.accounts[0].name,accountId:__fixture.accounts[0].id,accountCode:__fixture.accounts[0].code,debit:0,credit:60}].map(row=>({...row,id:receipt.entry_no,dbEntryId:receipt.entry_id,date:'2026-10-05',currency:'LAK',memo:'Confirmed report',generalMemo:'Confirmed report',archived:false}));
   __fixture.tables.accounting_periods=[{period_month:'2026-10-01',status:'open'}];
   loadJournalFromSupabase=load;switchTab('journal');document.getElementById('jeSearchInput').value='';
   const before=__calls.filter(n=>n==='journal_window14333').length;await loadJournalFromSupabase();
   const visibleRows=[...document.querySelectorAll('#tblJournalHistoryBody tr[data-entry-id]:not(.journal-description14281)')].filter(row=>row.dataset.entryId===receipt.entry_no&&row.getClientRects().length);
   return {messages,posts,freshReads:__calls.filter(n=>n==='journal_window14333').length-before,pending,staleVisible,confirmedLines:JournalModule.entries.filter(row=>row.dbEntryId===receipt.entry_id).length,visibleLines:visibleRows.length};
  }finally{ojmDb.rpc=rpc;loadJournalFromSupabase=load;showCenterStatus=status;JournalModule.entries=entries;window.__journalFixture=fixture;__fixture.tables.accounting_periods=periods;}
 });
 assert.equal(result.posts,1);assert(result.freshReads>0);assert.equal(result.pending,'');assert.equal(result.staleVisible,false);assert.equal(result.confirmedLines,2);assert.equal(result.visibleLines,2);
 assert(result.messages.some(x=>x.isError&&x.message.includes('Report posted as TEST-POSTED-STALE')&&x.message.includes('not in the downloaded journal yet')&&x.message.includes('do not post the report again')));
 assert(!result.messages.some(x=>x.message.includes('Original report and entry references retained')));
});
await check('Reconciliation and explanation inputs are marked as non-credential fields',async()=>{
 const fields=await page.evaluate(()=>submissionReconciliation14345.fields({asOf:'2026-10-12',responsible:'Test',funds:[{account_id:'test',code:'100',name:'Cash',currency:'LAK',posted:0,unposted:0}]}));assert(fields.includes('data-lpignore="true"'));assert(fields.includes('name="fund-balance-test"'));
 await page.evaluate(()=>{window.__promptResult=ui117.prompt('Reason for returning submission')});assert.equal(await page.locator('#prompt117').evaluate(n=>n.tagName),'TEXTAREA');assert.equal(await page.locator('#prompt117').getAttribute('autocomplete'),'off');await page.locator('.ui-overlay108:last-child [data-dismiss]').click();
});

assert.deepEqual(errors,[]);await browser.close();server.close();console.log('All return workflow checks passed');
})().catch(e=>{console.error(e);server.close();process.exit(1)});
