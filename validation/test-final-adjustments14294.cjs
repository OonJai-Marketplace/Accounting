const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const results=[];async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message)}}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const binary={args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:async()=>'/tmp/chromium'};
const root=process.argv[2]||path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'validation/screenshots'),{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{if(fs.existsSync('/tmp/chromium')&&!fs.statSync('/tmp/chromium').size)fs.unlinkSync('/tmp/chromium');await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||await binary.executablePath(),args:binary.args.filter(a=>!a.includes("disable-web-security"))});
const context=await browser.newContext({viewport:{width:1280,height:900},isMobile:false,hasTouch:false});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});
await page.addInitScript(()=>{
 const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const profiles=[{id:uid(1),email:'admin@example.invalid',full_name:'Santos Cabbigat',role:'admin',status:'active',user_permissions:{modules:[]}},...['Ryan Santos','Jade Plata','Gee Ann'].map((name,i)=>({id:uid(i+2),email:'staff'+i+'@example.invalid',full_name:name,role:'submitter',status:'active',user_permissions:{manager_id:uid(1),job_title:'Employee',department14229:'Operations',assigned_fund_account_ids:[uid(101+i)],destination_account_ids:[uid(110)],allowed_directions:['out'],module_actions113:{'sub-users-workspace':['view','edit'],'user-entry-review':['view','approve']}}}))];
 const accounts=['LAK','USD','THB'].map((c,i)=>({id:uid(101+i),code:String(101+i),name:'Cash on Hand',currency_code:c,currency:c,type:'ASSET',account_type:'ASSET',is_posting:true,isPosting:true,active:true}));accounts.push({id:uid(110),code:'5100',name:'Supplies',currency_code:'LAK',currency:'LAK',type:'EXPENSE',account_type:'EXPENSE',is_posting:true,isPosting:true,active:true});
 const balances=Object.fromEntries(profiles.slice(1).map((u,i)=>[u.id,[{id:accounts[i].id,account_id:accounts[i].id,name:accounts[i].name,currency:accounts[i].currency,opening:1000,received:100,used:20,handover:0,closing:1080}]]));
 const permissions=profiles.map(u=>({user_id:u.id,...u.user_permissions}));accounts.forEach(a=>a.is_active=true);const tables={report_types14253:[{id:uid(700),name:'Cashier report',active:true},{id:uid(701),name:'Expense report',active:true}],business_settings:[{id:true,legal_name:"Fixture Business",display_name:"Fixture Business"}],profiles,accounts,user_permissions:permissions,session_policy1443:[{id:true,timeout_minutes:60,warning_minutes:1}],currencies:[{code:'LAK',symbol:'₭',is_active:true,is_base:true},{code:'USD',symbol:'$',is_active:true},{code:'THB',symbol:'฿',is_active:true}]};
 function query(table){let filters=[];let single=false;let update=null;const q=new Proxy({}, {get(_,k){if(k==='then')return (resolve,reject)=>{const rows=(tables[table]||[]).filter(r=>filters.every(([k,v])=>r[k]===v));if(update){window.__writes.push({table,filters,update});rows.forEach(r=>{Object.assign(r,update);if(table==='user_permissions')Object.assign(profiles.find(u=>u.id===r.user_id).user_permissions,update)})}return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject)};return (...args)=>{if(k==='eq')filters.push(args);if(k==='single'||k==='maybeSingle')single=true;if(k==='update')update=args[0];return q;}}});return q;}
 window.__pack14232={format:'oonjai-data-113',from:'2026-01-01',to:'2026-12-31',tables:{accounts,sub_accounts:[],currencies:tables.currencies,profiles,user_permissions:permissions,journal_entries:[{id:uid(201),entry_no:'TEST-1',transaction_date:'2026-01-05',memo:'Audit source',status:'posted'}],journal_lines:[{id:uid(301),journal_entry_id:uid(201),account_id:uid(110),currency_code:'LAK',debit:100,credit:0},{id:uid(302),journal_entry_id:uid(201),account_id:uid(101),currency_code:'LAK',debit:0,credit:100}],payroll_runs:[{id:uid(401),period_start:'2026-01-01',data:{results:[{employeeId:uid(501),name:'Audit Employee',net:1000}]}}],payroll_employees:[{id:uid(501),data:{name:'Audit Employee',salary:1000}}]},auditTrail:{audit_log:[]},storage:[]};const rpc=async(name,p={})=>{window.__calls.push(name);let data=[];if(name==='admin_save_access1441')data={saved:true,user_id:p.p_user};if(name==='workflow_capabilities14253')data={version:14253};if(name==='submit_report14253'){window.__submitted14253=structuredClone(p);data=null;}if(name==='audit_snapshot14232')data=window.__pack14232;if(name==='backup_export113')data=window.__pack14232;if(name==='accounting_archive_preview127')data={rows:{},categories:{},total:0};if(name==='accounting_archive_audit126')data={audit_log:[]};if(name==='scoped_reset_backup14232')data={format:'oonjai-reset-14232',scopes:p.p_scopes,tables:{audit_log:[{id:1}]}};if(name==='scoped_reset14232')data={counts:{audit_log:1},total:1,requiredTables:[],preserved:'All unselected areas'};if(name==='branch_home14229')data={users:profiles.map(u=>({id:u.id,full_name:u.full_name,email:u.email,can_open:true,user_permissions:{assigned_fund_account_ids:u.user_permissions.assigned_fund_account_ids||[]}})),balances,reports:[]};if(name==='review_directory14229')data=profiles;if(name==='current_access14228')data={profile:profiles[0],permissions:profiles[0].user_permissions};if(name==='fund_balances136')data=balances[p.p_owner]||[];if(name==='reminder_load14229')data={revision:0,items:[]};if(name==='employee_photo113')data=null;if(name==='get_session_policy1443')data={timeout_minutes:60,warning_minutes:1};return {data:JSON.parse(JSON.stringify(data)),error:null};};
 window.__writes=[];window.__calls=[];window.__fixture={profiles,accounts,balances,tables};window.__db14231={rpc,from:query,auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>{},signInWithPassword:async()=>{await new Promise(r=>window.__releaseLoginFixture14232=r);return {data:{},error:{message:'Test sign-in rejected'}};},signOut:async()=>({error:null})},storage:{from:()=>({})},functions:{invoke:async()=>({data:{},error:null})}};
});
await page.route('**/*',route=>{const url=route.request().url();if(url.includes('assets/vendor/supabase.js')||url.includes('supabase-js'))return route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__db14231};'});if(url.startsWith(base))return route.continue();return route.abort();});
await page.goto(base+'/index.html',{waitUntil:'load'});await page.waitForTimeout(500);

await page.evaluate(()=>{liveProfile=__fixture.profiles[0];livePermission=__fixture.profiles[0].user_permissions;liveProfiles=__fixture.profiles;ojmDb=__db14231;window.ojmDb=ojmDb;DemoAccess.currentUser={...liveProfile,name:liveProfile.full_name,active:true};AccountingStore.accounts=__fixture.accounts;CurrencyStore.currencies=[{code:'LAK',symbol:'₭'},{code:'USD',symbol:'$'},{code:'THB',symbol:'฿'}];document.getElementById('loginGate').classList.add('is-authenticated');document.documentElement.classList.remove('session-checking1444');window.permissions1441.verified=true;});




page.setDefaultTimeout(8000);
const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.evaluate(async()=>{
 const f=__fixture;window.__auditSaves=[];window.__auditSubmits=[];
 window.__auditReports=f.profiles.slice(1).flatMap((u,i)=>['2026-07','2026-08','2026-09','2026-10'].map((month,j)=>({id:'audit-report-'+i+'-'+j,owner_id:u.id,period_start:month+'-01',status:['draft','submitted','returned','posted'][j],lines:Array.from({length:40},(_,k)=>({id:'audit-line-'+i+'-'+j+'-'+k,staff_journal_id:'audit-report-'+i+'-'+j,transaction_date:month+'-05',memo:'Worklist '+u.full_name+' '+j+' '+k,amount:100+k,currency_code:f.accounts[i].currency,direction:'out',fund_account_id:f.accounts[i].id,account_id:f.accounts[3].id}))})));
 const base=ojmDb.rpc;ojmDb.rpc=async(n,p)=>{
  if(n==='review_inbox14229')return {data:structuredClone(__auditReports),error:null};
  if(n==='save_staff_editor1437'){
   __auditSaves.push(structuredClone(p));let batch=__auditReports.find(j=>j.owner_id===p.p_owner&&j.period_start===p.p_items[0].date.slice(0,7)+'-01');
   if(!batch){batch={id:'saved-batch',owner_id:p.p_owner,period_start:p.p_items[0].date.slice(0,7)+'-01',status:'draft',lines:[]};__auditReports.push(batch);}
   if(p.p_edit_ids?.length)for(const b of __auditReports)b.lines=b.lines.filter(l=>!p.p_edit_ids.includes(l.id));
   const ids=p.p_items.map((l,i)=>'saved-'+__auditSaves.length+'-'+i);batch.lines.push(...p.p_items.map((l,i)=>({id:ids[i],staff_journal_id:batch.id,transaction_date:l.date,memo:l.memo,amount:l.amount,currency_code:'LAK',direction:l.direction,fund_account_id:l.fund,account_id:l.account,editor_group1437:'group-'+__auditSaves.length,editor_snapshot1437:p.p_snapshot})));
   return {data:{line_ids:ids},error:null};
  }
  if(n==='submit_staff_journal'){__auditSubmits.push(p);__auditReports.find(j=>j.id===p.p_journal_id).status='submitted';return {data:true,error:null};}
  return base(n,p);
 };
 await Organization14229.loadHome();
});

await check('Actual workspace Submit asks for report types and never calls legacy submission',async()=>{
 await page.evaluate(()=>{const j=__auditReports.find(j=>j.status==='draft');window.__testReport14293=j;currentWorkspaceJournal=()=>j;window.__submitPromise14293=submitWorkspaceForReview(j.owner_id);});
 await page.locator('#reportSelect14253 input').first().check();
 await page.locator('.ui-overlay108').last().getByRole('button',{name:'Submit',exact:true}).click();
 await page.evaluate(()=>__submitPromise14293);
 const r=await page.evaluate(()=>({sent:__submitted14253,legacy:__auditSubmits}));assert.equal(r.sent.p_types.length,1);assert.equal(r.sent.p_journal,'audit-report-0-0');assert.equal(r.legacy.length,0);
});
await check('Selected report types become General Description on journal preparation',async()=>{
 const memo=await page.evaluate(()=>{const j=structuredClone(__testReport14293);j.report_types14253=[{name:'Cashier Report'},{name:'Expense Report'}];Reports14253.prepare(j);return document.getElementById('jeGeneralMemo').value;});assert.equal(memo,'Cashier Report / Expense Report — July 2026');
});
await check('Sign-in has no inline status; progress is silent and incorrect credentials show a box',async()=>{
 await page.evaluate(()=>{loginMessageTarget14293().textContent='Signing in…'});assert.equal(await page.locator('#loginError').count(),0);assert.equal(await page.locator('#loginNotification14293[open]').count(),0);
 await page.evaluate(()=>{loginMessageTarget14293().textContent='Invalid login credentials'});assert(await page.locator('#loginNotification14293').isVisible());assert.match(await page.locator('#loginNotificationText14293').innerText(),/email or password is incorrect/);await page.locator('#loginNotification14293 button').click();
});

await check('Loading feedback uses only animation and never queues stale attention messages',async()=>{
 await page.evaluate(()=>{status118.clear();status118.pending('Loading Needs Your Attention…')});assert.equal(await page.locator('#status118 .status-copy118').innerText(),'');assert.equal(await page.locator('#status118 .loading-orbit1444').count(),1);assert(await page.locator('#status118 button').isHidden());
 await page.evaluate(()=>{status118.error('Incorrect password');status118.pending('Loading…')});assert.equal(await page.locator('#status118 .status-copy118').innerText(),'Incorrect password');await page.locator('#status118 button').click();assert(await page.locator('#status118').isHidden());
});
await check('Password requirements stay hidden until typing, then hide on blur',async()=>{
 await page.evaluate(()=>{openUserAccessEditor(__fixture.profiles[1].id);passwordPolicy14257.scan()});const input=page.locator('#userAccessPassword'),help=page.locator('#userAccessPassword + [data-password-help14257]');await input.focus();assert(await help.isHidden());await input.fill('Weak');assert(await help.isVisible());await input.fill('StrongPassword123!');assert.match(await help.innerText(),/Meets password requirements/);await page.locator('#userAccessName').focus();assert(await help.isHidden());await page.locator('#modalUserAccess .modal-close-x').click();
});
await check('Sub-account controls share a contained toolbar and notifications stay centered',async()=>{
 for(const size of [{width:1440,height:900},{width:834,height:1194},{width:768,height:1024},{width:390,height:844}]){
  await page.setViewportSize(size);await page.evaluate(()=>{scrollToAccountModule('sec-sub-accounts')});
  await page.waitForSelector('#sec-sub-accounts .subaccount-actions14294 [data-print14282]',{state:'attached'});
  const r=await page.locator('#sec-sub-accounts').evaluate(n=>{const a=n.querySelector('.subaccount-actions14294'),add=a.querySelector('[onclick]'),print=a.querySelector('[data-print14282]'),b=n.getBoundingClientRect();return {count:a.children.length,add:!!add,print:!!print,contained:[...a.children].every(x=>{const r=x.getBoundingClientRect();return r.left>=b.left-1&&r.right<=b.right+1})}});assert.deepEqual(r,{count:2,add:true,print:true,contained:true});
  await page.evaluate(()=>loginNotice14293('Invalid login credentials'));const box=await page.locator('#loginNotification14293').boundingBox();const viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert(Math.abs(box.x+box.width/2-viewport.width/2)<3);assert(Math.abs(box.y+box.height/2-viewport.height/2)<3);await page.locator('#loginNotification14293 button').click();
 }
 await page.setViewportSize({width:1280,height:900});
});
await check('Recovery hides empty guidance, removes technical footer, and signs out on cancellation',async()=>{
 const recoveryContext=await browser.newContext({viewport:{width:390,height:844}}),recovery=await recoveryContext.newPage();let signsOut=0;
 await recovery.route('**/assets/vendor/supabase.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'staff'}}}}),getUser:async()=>({data:{user:{id:'staff'}}}),signOut:async()=>{window.__signedOut14294=true;return {}},updateUser:async()=>({})},rpc:async()=>({data:{required:true}})})};`}));
 await recovery.route('**/index.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><p>Sign in</p>'}));
 await recovery.goto(base+'/recovery.html?required=1');await recovery.waitForFunction(()=>!document.querySelector('fieldset').disabled);const input=recovery.locator('#newPassword14257'),help=recovery.locator('[data-password-help14257]');assert(await help.isHidden());assert.equal(await recovery.locator('small').count(),0);await input.fill('Weak');assert(await help.isVisible());await recovery.locator('#confirmPassword14257').focus();assert(await help.isHidden());
 await recovery.evaluate(()=>{const original=supabase.createClient;window.__captureReturn14294=false;});
 const signed= new Promise(resolve=>recovery.on('console',m=>{if(m.text()==='signed-out-confirmed')resolve()}));
 await recovery.evaluate(()=>{const a=document.querySelector('#returnToLogin14294'),fn=a.onclick;a.onclick=async e=>{await fn(e)};window.addEventListener('pagehide',()=>{if(window.__signedOut14294)console.log('signed-out-confirmed')})});
 await recovery.locator('#returnToLogin14294').click();await recovery.waitForURL('**/index.html');await signed;assert.equal(await recovery.locator('#loginNotification14293').count(),0);await recoveryContext.close();
});
await check('Session expiry clears notifications and returns directly to login',async()=>{
 await page.evaluate(async()=>{SessionTimeoutManager.hideWarning();await endExpiredSession14284();});assert(!await page.locator('#loginGate').evaluate(n=>n.classList.contains('is-authenticated')));assert.equal(await page.locator('#loginNotification14293[open]').count(),0);
});
await check('Workspace menu includes accounting, public restaurant and back office',async()=>{
 await page.evaluate(()=>{liveProfile=__fixture.profiles[0];workspaceLinks123.menu()});const text=await page.locator('#workspaceApps1432').innerText();assert(text.includes('Oon Jai Accounting'));assert(text.includes('Public Restaurant Website'));assert(text.includes('Restaurant Back Office'));const url=await page.evaluate(()=>workspaceDestinations14234.resolve('publicRestaurant').href);assert.equal(url,'https://oonjai-marketplace.github.io/web/');
});
await check('Reports chooser shows only the controls for the selected period',async()=>{
 await page.evaluate(()=>{clearLoginNotice14293();liveProfile=__fixture.profiles[0];livePermission=__fixture.profiles[0].user_permissions;documentWorkspace105.closeTools=()=>{};void ReportLibrary14285.open()});
 const form=page.locator('#reportChooser14285');await form.waitFor();assert(await form.locator('[data-month14285]').isVisible());assert(!await form.locator('[data-year14285]').isVisible());await form.locator('[name=mode]').selectOption('quarterly');assert(await form.locator('[data-year14285]').isVisible());assert(await form.locator('[data-quarter14285]').isVisible());assert(!await form.locator('[data-month14285]').isVisible());await form.locator('[name=mode]').selectOption('yearly');assert(await form.locator('[data-year14285]').isVisible());assert(!await form.locator('[data-quarter14285]').isVisible());
});
await check('Changed flows have no uncaught browser errors',async()=>assert.deepEqual(errors,[]));
fs.writeFileSync(path.join(root,'validation/final-adjustments14294.json'),JSON.stringify(results,null,2));await browser.close();server.close();if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
