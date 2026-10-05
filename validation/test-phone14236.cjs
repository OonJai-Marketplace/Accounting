const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const results=[];async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message)}}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const moduleBinary=require('@sparticuz/chromium');const binary=moduleBinary.default||moduleBinary;
const root=process.argv[2]||path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'validation/screenshots'),{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));try{res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{if(fs.existsSync('/tmp/chromium')&&!fs.statSync('/tmp/chromium').size)fs.unlinkSync('/tmp/chromium');await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||await binary.executablePath(),args:binary.args.filter(a=>!a.includes("disable-web-security"))});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});
await page.addInitScript(()=>{
 const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const profiles=[{id:uid(1),email:'admin@example.invalid',full_name:'Santos Cabbigat',role:'admin',status:'active',user_permissions:{modules:[]}},...['Ryan Santos','Jade Plata','Gee Ann'].map((name,i)=>({id:uid(i+2),email:'staff'+i+'@example.invalid',full_name:name,role:'submitter',status:'active',user_permissions:{manager_id:uid(1),job_title:'Employee',department14229:'Operations',assigned_fund_account_ids:[uid(101+i)],destination_account_ids:[uid(110)],allowed_directions:['out'],module_actions113:{'sub-users-workspace':['view','edit'],'user-entry-review':['view','approve']}}}))];
 const accounts=['LAK','USD','THB'].map((c,i)=>({id:uid(101+i),code:String(101+i),name:'Cash on Hand',currency_code:c,currency:c,type:'ASSET',account_type:'ASSET',is_posting:true,isPosting:true,active:true}));accounts.push({id:uid(110),code:'5100',name:'Supplies',currency_code:'LAK',currency:'LAK',type:'EXPENSE',account_type:'EXPENSE',is_posting:true,isPosting:true,active:true});
 const balances=Object.fromEntries(profiles.slice(1).map((u,i)=>[u.id,[{id:accounts[i].id,account_id:accounts[i].id,name:accounts[i].name,currency:accounts[i].currency,opening:1000,received:100,used:20,handover:0,closing:1080}]]));
 const permissions=profiles.map(u=>({user_id:u.id,...u.user_permissions}));accounts.forEach(a=>a.is_active=true);const tables={business_settings:[{id:true,legal_name:"Fixture Business",display_name:"Fixture Business"}],profiles,accounts,user_permissions:permissions,session_policy1443:[{id:true,timeout_minutes:60,warning_minutes:1}],currencies:[{code:'LAK',symbol:'₭',is_active:true,is_base:true},{code:'USD',symbol:'$',is_active:true},{code:'THB',symbol:'฿',is_active:true}]};
 function query(table){let filters=[];let single=false;let update=null;const q=new Proxy({}, {get(_,k){if(k==='then')return (resolve,reject)=>{const rows=(tables[table]||[]).filter(r=>filters.every(([k,v])=>r[k]===v));if(update){window.__writes.push({table,filters,update});rows.forEach(r=>{Object.assign(r,update);if(table==='user_permissions')Object.assign(profiles.find(u=>u.id===r.user_id).user_permissions,update)})}return Promise.resolve({data:single?rows[0]||null:rows,error:null}).then(resolve,reject)};return (...args)=>{if(k==='eq')filters.push(args);if(k==='single'||k==='maybeSingle')single=true;if(k==='update')update=args[0];return q;}}});return q;}
 window.__pack14232={format:'oonjai-data-113',from:'2026-01-01',to:'2026-12-31',tables:{accounts,sub_accounts:[],currencies:tables.currencies,profiles,user_permissions:permissions,journal_entries:[{id:uid(201),entry_no:'TEST-1',transaction_date:'2026-01-05',memo:'Audit source',status:'posted'}],journal_lines:[{id:uid(301),journal_entry_id:uid(201),account_id:uid(110),currency_code:'LAK',debit:100,credit:0},{id:uid(302),journal_entry_id:uid(201),account_id:uid(101),currency_code:'LAK',debit:0,credit:100}],payroll_runs:[{id:uid(401),period_start:'2026-01-01',data:{results:[{employeeId:uid(501),name:'Audit Employee',net:1000}]}}],payroll_employees:[{id:uid(501),data:{name:'Audit Employee',salary:1000}}]},auditTrail:{audit_log:[]},storage:[]};const rpc=async(name,p={})=>{window.__calls.push(name);let data=[];if(name==='audit_snapshot14232')data=window.__pack14232;if(name==='backup_export113')data=window.__pack14232;if(name==='accounting_archive_preview127')data={rows:{},categories:{},total:0};if(name==='accounting_archive_audit126')data={audit_log:[]};if(name==='scoped_reset_backup14232')data={format:'oonjai-reset-14232',scopes:p.p_scopes,tables:{audit_log:[{id:1}]}};if(name==='scoped_reset14232')data={counts:{audit_log:1},total:1,requiredTables:[],preserved:'All unselected areas'};if(name==='branch_home14229')data={users:profiles.map(u=>({id:u.id,full_name:u.full_name,email:u.email,can_open:true,user_permissions:{assigned_fund_account_ids:u.user_permissions.assigned_fund_account_ids||[]}})),balances,reports:[]};if(name==='review_directory14229')data=profiles;if(name==='current_access14228')data={profile:profiles[0],permissions:profiles[0].user_permissions};if(name==='fund_balances136')data=balances[p.p_owner]||[];if(name==='reminder_load14229')data={revision:0,items:[]};if(name==='employee_photo113')data=null;if(name==='get_session_policy1443')data={timeout_minutes:60,warning_minutes:1};return {data:JSON.parse(JSON.stringify(data)),error:null};};
 window.__writes=[];window.__calls=[];window.__fixture={profiles,accounts,balances,tables};window.__db14231={rpc,from:query,auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>{},signInWithPassword:async()=>{await new Promise(r=>window.__releaseLoginFixture14232=r);return {data:{},error:{message:'Test sign-in rejected'}};},signOut:async()=>({error:null})},storage:{from:()=>({})},functions:{invoke:async()=>({data:{},error:null})}};
});
await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base))return route.continue();if(url.includes('supabase-js'))return route.fulfill({contentType:'text/javascript',body:'window.supabase={createClient:()=>window.__db14231};'});return route.abort();});
await page.goto(base+'/index.html',{waitUntil:'load'});await page.waitForTimeout(500);

await page.evaluate(()=>{liveProfile=__fixture.profiles[0];livePermission=__fixture.profiles[0].user_permissions;liveProfiles=__fixture.profiles;ojmDb=__db14231;window.ojmDb=ojmDb;DemoAccess.currentUser={...liveProfile,name:liveProfile.full_name,active:true};AccountingStore.accounts=__fixture.accounts;CurrencyStore.currencies=[{code:'LAK',symbol:'₭'},{code:'USD',symbol:'$'},{code:'THB',symbol:'฿'}];document.getElementById('loginGate').classList.add('is-authenticated');document.documentElement.classList.remove('session-checking1444');window.permissions1441.verified=true;});



await page.evaluate(async()=>{await Organization14229.loadHome();});
const frame=await (await page.waitForSelector('#connectedPhone132')).contentFrame();
await frame.waitForFunction(()=>typeof chooseWorkspace==='function');
await frame.locator('.brand').tap();await frame.locator('#menuSubusers').tap();
const tabs=frame.locator('#phoneUserTabs14236');
await check('Home and all named phone workspace tabs appear',async()=>{
 await tabs.waitFor({state:'visible'});assert.equal(await tabs.locator('button').count(),5);
 assert.match(await tabs.innerText(),/S. Cabbigat/);assert.match(await tabs.innerText(),/R. Santos/);
});
await check('Administrator own account opens from the Home list',async()=>{
 await frame.locator('[data-team-action=user][data-value="00000000-0000-4000-8000-000000000001"]').tap();
 await frame.locator('#home .funds-hero1425').waitFor({state:'visible'});
 assert.equal(await tabs.locator('[aria-current=page]').getAttribute('data-phone-user14236'),'00000000-0000-4000-8000-000000000001');
});
await check('Each named user tab opens Accounts, Post, Entries and Totals',async()=>{
 for(const id of ['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004']){
  await tabs.locator('[data-phone-user14236="'+id+'"]').tap();
  await frame.locator('#home .funds-hero1425').waitFor({state:'visible'});
  assert.equal(await tabs.locator('[aria-current=page]').getAttribute('data-phone-user14236'),id);
  for(const view of ['accounts','post','entries','totals']){await frame.locator('nav.bottom [data-go="'+view+'"]').tap();assert(await frame.locator('#'+view).isVisible());}
 }
 await tabs.locator('[data-phone-user14236=home]').tap();assert(await frame.locator('#workspace-home').isVisible());
 await page.screenshot({path:path.join(root,'validation/screenshots/phone-tabs14236.png')});
});
await check('A failed directory load shows a phone error and Retry recovers',async()=>{
 await page.evaluate(()=>{liveProfiles=[__fixture.profiles[0]];const rpc=ojmDb.rpc;window.__restoreRpc14236=rpc;ojmDb.rpc=async(n,p)=>n==='review_directory14229'?{error:{message:'Connection unavailable'}}:rpc(n,p);});
 const id='00000000-0000-4000-8000-000000000002';await tabs.locator('[data-phone-user14236="'+id+'"]').tap();
 await frame.locator('#workspaceNotice14236[role=alert]').waitFor({state:'visible'});
 assert.match(await frame.locator('#workspaceNotice14236').innerText(),/Connection unavailable/);
 await page.evaluate(()=>ojmDb.rpc=__restoreRpc14236);
 await frame.getByRole('button',{name:'Try again',exact:true}).tap();
 await frame.locator('#home .funds-hero1425').waitFor({state:'visible'});
});
await check('No page overflow or uncaught errors',async()=>{assert.deepEqual(errors,[]);assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));});
console.log('RESULT',JSON.stringify(results));await browser.close();server.close();if(results.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
