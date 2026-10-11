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
await page.waitForTimeout(1500);
await page.evaluate(async()=>{
 const rows=[];__fixture.tables.accounting_periods=[];
 for(let m=1;m<=10;m++){const month='2026-'+String(m).padStart(2,'0');__fixture.tables.accounting_periods.push({period_month:month+'-01',status:m<10?'closed':'open'});for(let i=0;i<2;i++)rows.push({id:'FIX-'+m,dbEntryId:'db-'+m,date:month+'-05',accountId:__fixture.accounts[i].id,account:__fixture.accounts[i].name,currency:'LAK',debit:i?0:1234567.89,credit:i?1234567.89:0,archived:false,memo:'Trial',generalMemo:'Trial'})}
 __journalFixture=rows;await loadJournalFromSupabase();switchTab('journal');refreshAllTables();
});
assert.equal(await page.locator('#tblJournalHistoryBody tr[data-entry-id="FIX-5"]').count(),0);
assert.equal(await page.locator('#tblJournalHistoryBody tr[data-entry-id="FIX-10"]').count(),3);
await page.evaluate(async()=>{JournalModule.entries.forEach(r=>r.archived=false);await loadJournalFromSupabase({cacheFirst:true});switchTab('transactions-all')});
assert.equal(await page.locator('#archiveMonths67 input[type=month]').inputValue(),'2026-09');
assert.equal(await page.locator('#archiveBody0 tr[data-entry-id="FIX-9"]').count(),3);
await page.locator('#archiveMonths67 input[type=month]').fill('2026-05');
await page.locator('#archiveMonths67 input[type=month]').dispatchEvent('change');
await page.waitForFunction(()=>document.querySelector('#archiveBody0 [data-entry-id="FIX-5"]'));
assert.equal(await page.evaluate(()=>document.querySelector('#archiveMonths67 input').closest('header').classList.contains('history-header14342')),true);
console.log('PASS closed Jan–Sep hidden from Active, available by month in History, including cache restore');
await page.evaluate(async()=>{__fixture.tables.year_closings136=[{year:2024,balances:[],closed_at:'2025-01-01'},{year:2025,balances:[],closed_at:'2026-01-01'}];await carryForward142.load(true)});
assert.equal(await page.locator('#carryForward142 details').count(),1);
assert.equal(await page.locator('#carryForward142 details').getAttribute('data-carry-year'),'2025');
assert.equal(await page.evaluate(()=>document.querySelector('#carryForward142').parentElement.lastElementChild.id),'carryForward142');
assert.equal(await page.locator('#carryForward142 select').count(),0);
await page.waitForTimeout(150);assert.equal(await page.locator('#carryForward142 details').getAttribute('open'),null);
assert((await page.locator('#carryForward142').boundingBox()).height<125);
await page.screenshot({path:path.join(root,'validation/screenshots/history14342.png')});
console.log('PASS compact latest carry-forward at bottom and history header controls');
await page.evaluate(()=>{
 syncAssessment14332.beforeClose=()=>{};ApplicationSettings.system.numberFormat='1,234.56';ApplicationSettings.accounting.decimalPlaces=2;
 window.__check14342={version:14324,month:'2026-10-01',fingerprint:'same',checkedAt:new Date().toISOString(),issues:[],trial:[{currency:'LAK',debit:1234567.89,credit:1234567.89,difference:0}],balances:[{id:'cash',code:'100',name:'Cash',currency:'LAK',balance:1234567.89,cash_candidate:true}],pending:{revision:'p',items:[]}};
 window.__finishes=[];const old=ojmDb.rpc.bind(ojmDb);ojmDb.rpc=async(name,args)=>{if(name==='maintenance_preflight14324')return {data:structuredClone(__check14342),error:null};if(name==='maintenance_finish14324'){__finishes.push(args);__fixture.tables.accounting_periods.find(r=>r.period_month===args.p_month).status=args.p_status;__fixture.tables.audit_log=[{table_name:'accounting_periods',record_id:'2026-10',action:'MAINTENANCE_CLOSE',created_at:new Date().toISOString(),new_data:{kind:'period',check:structuredClone(__check14342),review:structuredClone(args.p_review)}}];return {data:{status:args.p_status},error:null}}return old(name,args)};
 switchTab('period-review');selectReviewPeriod('2026-10');window.__closing=changePeriodStatus('closed');
});
await page.waitForSelector('[data-actual]');
assert.match(await page.locator('.maintenance-modal14324').textContent(),/1,234,567\.89/);
await page.locator('[data-actual]').fill('1,234,567.89');await page.locator('[data-coverage]').check();
assert.equal(await page.locator('[data-difference]').textContent(),'Difference: 0.00');
await page.screenshot({path:path.join(root,'validation/screenshots/reconciliation14342.png')});
await page.locator('.maintenance-modal14324 footer button:last-child').click();
assert.equal(await page.evaluate(async()=>await __closing),true);
assert.equal(await page.evaluate(()=>__finishes[0].p_review.reconciliations.cash.actual),'1234567.89');
assert.equal(await page.locator('.period-closing-bar [onclick*="locked"]').isEnabled(),true);
await page.evaluate(()=>{switchTab('journal');refreshAllTables()});
assert.equal(await page.locator('#tblJournalHistoryBody tr[data-entry-id]').count(),0);
await page.evaluate(async()=>{await loadJournalFromSupabase({cacheFirst:true});refreshAllTables()});
assert.equal(await page.locator('#tblJournalHistoryBody tr[data-entry-id]').count(),0);
await page.evaluate(()=>{switchTab('period-review');selectReviewPeriod('2026-10');window.__closing=changePeriodStatus('locked')});
await page.waitForSelector('.maintenance-modal14324');
assert.match(await page.locator('.maintenance-modal14324').textContent(),/saved reconciliation still matches/);
assert.equal(await page.locator('[data-actual]').count(),0);
await page.locator('.maintenance-modal14324 footer button:last-child').click();
assert.equal(await page.evaluate(async()=>await __closing),true);
assert.equal(await page.evaluate(()=>__finishes.length),2);
console.log('PASS Finish closes, enables Lock immediately, cache cannot reactivate closed rows; Lock reuses identical saved review');
await page.evaluate(()=>{__check14342.fingerprint='changed';ApplicationSettings.system.numberFormat='1.234,56';window.__review=maintenance14324.review('2026-10',{kind:'period',status:'locked'})});
await page.waitForSelector('[data-actual]');
assert.match(await page.locator('.maintenance-modal14324').textContent(),/1\.234\.567,89/);
await page.locator('[data-actual]').fill('-1.234,50');await page.locator('[data-actual]').blur();
assert.equal(await page.locator('[data-actual]').inputValue(),'-1.234,50');
assert.equal(await page.locator('[data-difference]').textContent(),'Difference: -1.235.802,39');
await page.locator('.maintenance-modal14324 footer button:first-child').click();
assert.equal(await page.evaluate(async()=>await __review),null);
assert.equal(await page.evaluate(()=>__finishes.length),2);
console.log('PASS changed records require review; localized negative actual balances parse and format correctly; cancel makes no write');
await page.evaluate(()=>{const host=document.createElement('section');host.id='pickerFixture';host.innerHTML='<section class="work82"><header><h3>History</h3><div class="actions82"></div></header>'+historyMonth14341.control('fixture','2026-10')+'</section>';document.body.append(host);historyMonth14341.bind(host,'fixture',()=>{})});
assert.equal(await page.locator('#pickerFixture header .history-month14341').count(),1);
assert.deepEqual(errors,[]);
await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
