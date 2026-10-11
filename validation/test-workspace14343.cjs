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





await page.waitForTimeout(1200);
await page.evaluate(()=>{
 AccountingStore.accounts=[{id:'cash',name:'Cash',code:'100',currency:'LAK',type:'ASSET',isPosting:true,active:true}];
 JournalModule.entries=['LAK','USD','THB'].flatMap((currency,i)=>[{id:'H'+i,date:'2026-09-15',accountId:'cash',account:'Cash',currency,debit:100+i,credit:0,archived:true,generalMemo:'History fixture'},{id:'H'+i,date:'2026-09-15',accountId:'cash',account:'Cash',currency,debit:0,credit:100+i,archived:true,generalMemo:'History fixture'}]);
 window.__journalFixture=JournalModule.entries;PeriodReview.periods['2026-09']={status:'closed'};switchTab('transactions-all');renderAllTransactionsTable();
});
await page.waitForTimeout(500);
await page.evaluate(()=>{JournalModule.entries=__journalFixture;PeriodReview.periods['2026-09']={status:'closed'};renderAllTransactionsTable();});
await page.waitForTimeout(100);
await check('History has four summary cards with separate currencies and preserved controls',async()=>{
 assert.equal(await page.locator('.history-summary14343 .period-summary-card').count(),4);
 assert.match(await page.locator('.history-summary14343').textContent(),/CLOSED/);
 assert.match(await page.locator('.history-summary14343').textContent(),/THB/);
 assert.equal(await page.locator('#historySwitch14316 button').first().textContent(),'Journal');
 assert.equal(await page.locator('#archiveMonths67 [data-history-month14341]').count(),1);
 assert.equal(await page.locator('.history-table14343 input[type=search]').count(),1);
 const boxes=await page.evaluate(()=>{const h=document.querySelector('#archiveMonths67 h3').getBoundingClientRect(),a=document.querySelector('#archiveMonths67 .archive-month-actions').getBoundingClientRect();return {h:h.y,a:a.y,hb:h.bottom,ab:a.bottom}});assert(boxes.h<boxes.ab&&boxes.a<boxes.hb);
});
await check('Navigation subtabs follow section banners',async()=>{
 for(const id of ['transactions-all','user-entry-review','transactions-recurring']){
  await page.evaluate(id=>switchTab(id),id);await page.waitForTimeout(250);
  const order=await page.evaluate(id=>{const p=document.getElementById(id),banner=p.querySelector(':scope>.area-banner113'),bar=p.querySelector(':scope>.workflow-switch14316,:scope>.workspace-tabs14337');return !!(banner.compareDocumentPosition(bar)&Node.DOCUMENT_POSITION_FOLLOWING)},id);assert(order,id);
 }
});
await check('Connection popup footer, quiet empty queue and native outside dismissal',async()=>{
 await page.evaluate(()=>{startup14257.preparing=false;idleSync14341.preparation('');idleSync14341.paint();offline14239.open()});
 assert.equal(await page.locator('#syncStatus14341').isVisible(),false);
 assert.equal(await page.locator('#syncStatus14341 button').count(),0);
 assert.equal(await page.locator('dialog [data-sync-now14343]').count(),1);
 assert.match(await page.locator('dialog [data-sync-status14343]').textContent(),/nothing to sync|needs attention/);
 const order=await page.locator('dialog footer').evaluate(n=>[...n.children].map(e=>e.textContent));assert.equal(order[0],'Close');assert.equal(order.at(-1),'Sync now');
 await page.screenshot({path:path.join(root,'validation/screenshots/connection14343.png')});
 await page.mouse.click(5,5);assert.equal(await page.locator('dialog.connection-dialog14239').count(),0);
});
await check('Empty idle tick performs no database refresh',async()=>{
 const result=await page.evaluate(async()=>{const before=__calls.length,now=Date.now;Date.now=()=>now()+120001;window.dispatchEvent(new Event('idle-sync14341'));await new Promise(r=>setTimeout(r,1300));Date.now=now;return __calls.length-before});assert.equal(result,0);
});
await check('Loading animation remains until completion and clears on failure',async()=>{
 await page.evaluate(()=>{window.__delayed14343={async load(){await new Promise(r=>window.__finish14343=r)}};actionFeedback14296.wrap(__delayed14343,'load','Loading records…');window.__wait14343=__delayed14343.load()});
 await page.waitForFunction(()=>typeof __finish14343==='function');assert.equal(await page.locator('#actionProgress14343').isVisible(),true);
 await page.evaluate(async()=>{__finish14343();await __wait14343});assert.equal(await page.locator('#actionProgress14343').isVisible(),false);
 await page.evaluate(async()=>{try{await actionFeedback14296.run(()=>{throw Error('Fixture failure')})}catch{}});assert.equal(await page.locator('#actionProgress14343').isVisible(),false);
});
await page.evaluate(()=>switchTab('transactions-all'));await page.waitForTimeout(300);await page.screenshot({path:path.join(root,'validation/screenshots/history14343.png')});


await check('Reopened book actions stay together and reopening shows actual loading progress',async()=>{
 await page.evaluate(()=>{PeriodReview.periods['2026-09']={status:'open',reopenedAt:'2026-10-11',reopenReason:'Fixture'};workflow136.state.sessions=[{id:'session-fixture',month:'2026-09-01',operations:[],created_at:'2026-10-11',reason:'Fixture'}];switchTab('journal');renderReopened67()});
 assert.equal(await page.locator('#reopened-2026-09 .reopen-actions14343>button').count(),2);
 const gap=await page.locator('#reopened-2026-09 .reopen-actions14343').evaluate(n=>{const [a,b]=[...n.children].map(c=>c.getBoundingClientRect());return b.left-a.right});assert(gap>=0&&gap<=12);
 await page.screenshot({path:path.join(root,'validation/screenshots/reopened14343.png')});
 await page.evaluate(()=>{workflow136.state.sessions=[];PeriodReview.periods['2026-09']={status:'closed'};PeriodReview.selectedMonth='2026-09';window.__oldPrompt14343=ui117.prompt;ui117.prompt=async()=> 'Test reopening';window.__oldLoad14343=loadJournalFromSupabase;loadJournalFromSupabase=async()=>new Promise(r=>window.__releaseReopen14343=r);window.__oldRpc14343=workflow136.state.rawRpc;workflow136.state.client=ojmDb;workflow136.state.rawRpc=async()=>({data:{id:'new-session-fixture',month:'2026-09-01',operations:[]},error:null});window.__reopen14343=changePeriodStatus('open')});
 await page.waitForFunction(()=>typeof __releaseReopen14343==='function');assert.equal(await page.locator('#actionProgress14343').isVisible(),true);
 await page.evaluate(async()=>{__releaseReopen14343();await __reopen14343;ui117.prompt=__oldPrompt14343;loadJournalFromSupabase=__oldLoad14343;workflow136.state.rawRpc=__oldRpc14343});assert.equal(await page.locator('#actionProgress14343').isVisible(),false);assert.equal(await page.locator('#journal').evaluate(n=>n.classList.contains('active')),true);
});
await check('Reminders are optional, no reminders suppress alerts, and chips are consistent',async()=>{
 await page.evaluate(()=>switchTab('transactions-recurring'));await page.waitForTimeout(200);
 assert.equal(await page.locator('#transactions-recurring [data-print14282]').count(),0);await page.evaluate(()=>openUpcomingEditor92());
 await page.locator('[data-reminder-unit14343=days]').click();await page.locator('#reminderCount').fill('1');await page.locator('#reminderFields14343 button').click();
 assert.match(await page.locator('#pendingReminderList').textContent(),/1 day before/);
 assert.equal(await page.locator('.reminder-chip').evaluate(n=>getComputedStyle(n).borderRadius),'6px');
 await page.locator('[data-reminder-unit14343=none]').click();assert.equal(await page.locator('#reminderFields14343').isVisible(),false);
 const result=await page.evaluate(async()=>{const old=PrivateReminders14229.mutate,ready=PrivateReminders14229.ready;PrivateReminders14229.mutate=async fn=>{fn();return true};PrivateReminders14229.ready=()=>true;document.getElementById('recurringMemo').value='Optional reminder test';document.getElementById('recurringNextDate').value='2026-01-01';const saved=await saveRecurringTransaction();const item=RecurringStore.items.find(x=>x.memo==='Optional reminder test');const alerted=getActiveRecurringWarnings().some(x=>x.id===item.id);PrivateReminders14229.mutate=old;PrivateReminders14229.ready=ready;return {saved,reminders:item.reminders.length,alerted}});assert.deepEqual(result,{saved:true,reminders:0,alerted:false});
 await page.evaluate(()=>openUpcomingEditor92());await page.locator('[data-reminder-unit14343=months]').click();await page.locator('#reminderCount').fill('2');await page.locator('#reminderFields14343 button').click();await page.screenshot({path:path.join(root,'validation/screenshots/recurring14343.png')});
});
await check('Phone native popups dismiss outside without accepting the action',async()=>{
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/phone.html?staff=1',{waitUntil:'load'});await page.waitForFunction(()=>!!window.PhoneWorkspace14242);
 await page.evaluate(()=>{const d=document.getElementById('dialog');document.getElementById('dialogBody').innerHTML='<h2>Dismissal fixture</h2>';d.returnValue='yes';d.showModal()});
 await page.mouse.click(2,2);assert.equal(await page.locator('#dialog').evaluate(n=>n.open),false);assert.equal(await page.locator('#dialog').evaluate(n=>n.returnValue),'cancel');
});
assert.deepEqual(errors,[]);console.log('PASS shared workspace checks');await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
