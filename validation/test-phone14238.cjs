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
const frame=await (await page.waitForSelector('#connectedPhone132')).contentFrame();await frame.waitForFunction(()=>typeof chooseWorkspace==='function');
await frame.locator('.brand').tap();await frame.locator('#menuSubusers').tap();
const user='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const selectUser=async id=>{await frame.locator('[data-phone-user14236="'+id+'"]').tap();await frame.locator('#home .funds-hero1425').waitFor({state:'visible'});};
await check('Populated workspaces load their own balances without desktop mounting',async()=>{await selectUser(user);assert.match(await frame.locator('#home .funds-hero1425').innerText(),/1,080/);assert.equal(await page.evaluate(()=>document.querySelector('#sub-users-workspace.active')!==null),false);});

await check('A stalled directory lookup does not trap navigation or override a later choice',async()=>{
 await page.evaluate(()=>{const a=PhoneApp132;window.__originalUsers=a.users;window.__originalEnsure=a.ensureUser;a.users=()=>__originalUsers().filter(u=>u.id!=='00000000-0000-4000-8000-000000000003');a.ensureUser=()=>new Promise(r=>window.__directoryResolve=r);});
 await frame.locator('[data-phone-user14236="'+other+'"]').tap();
 await frame.locator('.brand').tap();await frame.locator('#menuDashboard').tap();
 assert.equal(await frame.evaluate(()=>phoneSelection14237().module),'dashboard');
 await page.evaluate(()=>{PhoneApp132.users=__originalUsers;PhoneApp132.ensureUser=__originalEnsure;__directoryResolve(true);});
 await page.waitForTimeout(200);assert.equal(await frame.evaluate(()=>phoneSelection14237().module),'dashboard');
 await frame.locator('.brand').tap();await frame.locator('#menuSubusers').tap();await selectUser(user);
});
await check('Failed refresh retains balances and worklist with an explicit stale-data notice',async()=>{
 await page.evaluate(async()=>{const base=ojmDb.rpc;ojmDb.rpc=async(n,p)=>n==='fund_balances136'?{error:{message:'Weak connection test'}}:base(n,p);await PhoneApp132.loadWorkspace('00000000-0000-4000-8000-000000000002',true).catch(()=>{});ojmDb.rpc=base;});
 await frame.getByText('Showing previously loaded records. Refresh failed: Weak connection test',{exact:true}).waitFor();assert(await frame.locator('#home .funds-hero1425').isVisible());
 await frame.locator('[data-go=entries]').tap();assert.equal(await frame.locator('#entries .entry132').count(),30);
 await frame.getByRole('button',{name:'Try again',exact:true}).tap();await page.waitForFunction(()=>!PhoneApp132.workspaceState('00000000-0000-4000-8000-000000000002').error);
});
await check('Stalled new workspace times out; tabs remain usable; retry ignores the old response',async()=>{
 const third='00000000-0000-4000-8000-000000000004';
 await page.evaluate(()=>{window.__networkBase=ojmDb.rpc;ojmDb.rpc=(n,p)=>n==='fund_balances136'?new Promise(r=>window.__releaseNetworkAudit=r):__networkBase(n,p);});
 await frame.locator('[data-phone-user14236="'+third+'"]').tap();
 await frame.locator('[data-go=accounts]').tap();assert.equal(await frame.evaluate(()=>phoneSelection14237().page),'accounts');
 await frame.getByRole('heading',{name:'Accounts',exact:true}).waitFor();
 await frame.getByRole('button',{name:'Try again',exact:true}).waitFor({timeout:16000});
 assert.match(await frame.locator('#accounts').innerText(),/connection is taking too long/);
 await page.evaluate(()=>ojmDb.rpc=__networkBase);
 await frame.getByRole('button',{name:'Try again',exact:true}).tap();await frame.locator('#accounts .fund-card1425').waitFor();
 await page.evaluate(()=>__releaseNetworkAudit({data:[],error:null}));await page.waitForTimeout(100);assert.equal(await frame.locator('#accounts .fund-card1425').count(),1);
});
await check('No uncaught errors',()=>assert.deepEqual(errors,[]));
fs.writeFileSync(path.join(root,'validation/phone-weak-network14238.json'),JSON.stringify(results,null,2));console.log('RESULT',JSON.stringify(results));await browser.close();server.close();if(results.some(x=>!x.passed))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
