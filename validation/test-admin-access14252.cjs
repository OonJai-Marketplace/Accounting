const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const results=[];async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name)}catch(e){results.push({name,passed:false,error:e.message});console.log('FAIL',name,e.message)}}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const binary={args:['--no-sandbox','--disable-dev-shm-usage'],executablePath:async()=>'/tmp/chromium'};
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
 await Organization14229.loadHome();window.startup14257.interactive=true;Location69.ready=true;Location69.hydrating=false;
});
const frame=await (await page.waitForSelector('#connectedPhone132')).contentFrame();await frame.waitForFunction(()=>typeof chooseWorkspace==='function');

const admin='00000000-0000-4000-8000-000000000001',staff='00000000-0000-4000-8000-000000000002';
await page.evaluate(()=>{window.__adminSaves=[];const rpc=ojmDb.rpc;ojmDb.rpc=async(n,p)=>{if(n==='admin_save_access14281'||n==='admin_save_access1441'){__adminSaves.push(structuredClone(p));const u=__fixture.profiles.find(u=>u.id===p.p_user);u.user_permissions=structuredClone(p.p_permissions);u.role=p.p_role;u.full_name=p.p_name;return {data:{saved:true,ledger_saved:true,user_id:p.p_user},error:null};}return rpc(n,p)};
 AccountingStore.accounts.push({id:'nonposting',name:'Parent',isPosting:false,is_active:true},{id:'inactive',name:'Inactive',isPosting:true,is_active:false});
});
await check('Unloaded chart never submits placeholder account IDs; retry succeeds after loading',async()=>{
 const result=await page.evaluate(async()=>{const original=AccountingStore.accounts,before=__adminSaves.length;
 try {AccountingStore.accounts=[{code:'1000',name:'Startup placeholder'},{id:'undefined',code:'1001'},{id:null,code:'1002'}];await adminAccess14251.sync(liveProfile.id);const seedCalls=__adminSaves.length-before,seedFunds=workspaceRules(liveProfile).fundIds;
 AccountingStore.accounts=[...original,{code:'1003',name:'Still loading'}];await adminAccess14251.sync(liveProfile.id);return {seedCalls,seedFunds,mixedCalls:__adminSaves.length-before};
 }finally{AccountingStore.accounts=original;}});
 assert.equal(result.seedCalls,0);assert.deepEqual(result.seedFunds,[]);assert.equal(result.mixedCalls,0);
});
await check('Existing administrator receives all active posting accounts through authorized RPC',async()=>{await page.evaluate(()=>adminAccess14251.sync(liveProfile.id));const state=await page.evaluate(()=>({saved:__adminSaves.at(-1),rules:workspaceRules(liveProfile)}));assert.equal(state.saved.p_role,'admin');assert.equal(state.saved.p_permissions.user_type,'admin');assert.equal(state.rules.fundIds.length,4);assert.equal(state.rules.entryIds.length,4);assert.deepEqual(state.rules.directions,['out','in']);assert(state.rules.multiple);assert(!state.rules.fundIds.includes('nonposting'));assert(!state.rules.fundIds.includes('inactive'));});
await check('All administrator module actions are allowed without individual checkboxes',async()=>{assert(await page.evaluate(()=>APP_PERMISSION_TREE.every(p=>p.children.every(([id])=>['view','edit','export','approve','post','void'].every(a=>access113.can(id,a))))));});
await check('Administrator account groups and tabs remain available during Home invalidation',async()=>{
 await frame.evaluate(id=>chooseWorkspace(id),admin);await frame.waitForFunction(()=>document.querySelector('.app').getAttribute('aria-busy')==='false');
 await page.evaluate(()=>{const rpc=ojmDb.rpc;window.restoreRpc14251=rpc;ojmDb.rpc=(n,p)=>n==='branch_home14229'?new Promise(resolve=>setTimeout(()=>rpc(n,p).then(resolve),40)):rpc(n,p);Organization14229.invalidate();});
 for(const tab of ['accounts','post','entries','history','home']){await frame.evaluate(tab=>go(tab),tab);await frame.waitForFunction(()=>document.querySelector('.app').getAttribute('aria-busy')==='false');assert.equal((await frame.evaluate(()=>phoneSelection14237())).page,tab);}
 await frame.evaluate(()=>go('accounts'));await frame.waitForFunction(()=>document.querySelector('.app').getAttribute('aria-busy')==='false');assert.equal(await frame.locator('#accounts .account-row14248').count(),4);
 await page.evaluate(()=>{ojmDb.rpc=restoreRpc14251;});
});
await check('Administrator editor shows automatic access; next sub-user retains its restrictions',async()=>{
 await page.evaluate(()=>openUserAccessEditor(liveProfile.id));assert(await page.locator('#adminRoleNotice14251').isVisible());assert(await page.locator('#userFundAccountGrid input').evaluateAll(ns=>ns.every(n=>n.checked&&n.disabled)));assert(await page.locator('#userPermissionGrid input').evaluateAll(ns=>ns.every(n=>n.checked&&n.disabled)));
 await page.locator('#modalUserAccess .modal-close-x').click();await page.evaluate(id=>openUserAccessEditor(id),staff);
 const checks=await page.locator('#userFundAccountGrid input').evaluateAll(ns=>ns.map(n=>({checked:n.checked,disabled:n.disabled})));assert.equal(checks.filter(n=>n.checked).length,1);assert(checks.every(n=>!n.disabled));assert(!(await page.locator('#adminRoleNotice14251').isVisible()));
 await page.locator('#userAccessType').selectOption('admin',{force:true});assert(await page.locator('#userFundAccountGrid input').evaluateAll(ns=>ns.every(n=>n.checked&&n.disabled)));assert.equal(await page.evaluate(()=>access113.editorModules().length),await page.evaluate(()=>APP_PERMISSION_TREE.flatMap(p=>p.children).length));
 await page.locator('#userAccessType').selectOption('sub_user',{force:true});assert.equal(await page.locator('#userFundAccountGrid input:checked').count(),1);assert(await page.locator('#userFundAccountGrid input').evaluateAll(ns=>ns.every(n=>!n.disabled)));await page.locator('#modalUserAccess .modal-close-x').click();
});
await check('Sub-user account restrictions and server-sync boundary remain intact',async()=>{const result=await page.evaluate(async id=>{const user=liveProfiles.find(u=>u.id===id),rules=workspaceRules(user),count=__adminSaves.length;await adminAccess14251.sync(id);return {rules,count,after:__adminSaves.length}},staff);assert.equal(result.rules.fundIds.length,1);assert.equal(result.rules.entryIds.length,1);assert(!result.rules.administrator);assert.equal(result.count,result.after);});
await check('Administrator Money In uses accessible categories without bypassing currency validation',async()=>{const result=await page.evaluate(id=>{const r=PhoneApp132.rules(id),fund=r.fundIds[0],affected=r.entryIds.find(x=>x!==fund&&PhoneApp132.accounts().find(a=>a.id===x)?.currency==='LAK'),data={date:'2026-10-05',memo:'Fixture',mode:'single',single:[{direction:'in',source:fund,affected,amount:'10'}]};const good=PhoneApp132.validateStaff(id,data);let rejected=false;try{PhoneApp132.validateStaff(id,{...data,single:[{...data.single[0],affected:r.entryIds[1]}]})}catch{rejected=true}return {count:good.items.length,rejected}},admin);assert.equal(result.count,1);assert(result.rejected);});
await check('Selecting Administrator saves full grants without manual checkbox selection',async()=>{
 const target='00000000-0000-4000-8000-000000000003';await page.evaluate(id=>openUserAccessEditor(id),target);await page.locator('#userAccessType').selectOption('admin',{force:true});await page.locator('#userEntryInitials').fill('JP');
 await page.locator('#userAccessForm [type=submit]').click();await page.waitForFunction(id=>__adminSaves.some(p=>p.p_user===id),target);
 const payload=await page.evaluate(id=>__adminSaves.find(p=>p.p_user===id),target);assert.equal(payload.p_role,'admin');assert.equal(payload.p_permissions.assigned_fund_account_ids.length,4);assert.equal(payload.p_permissions.destination_account_ids.length,4);assert.deepEqual(payload.p_permissions.allowed_directions,['out','in']);assert(payload.p_permissions.allow_multiple_funds);assert(Object.values(payload.p_permissions.module_actions113).every(row=>row.includes('view')&&row.includes('edit')&&row.includes('export')));
});
await check('Phone Users cards show authority and position without account lists',async()=>{
 await page.locator('#modalUserAccess.active .modal-close-x').click().catch(()=>{});
 await frame.evaluate(()=>settingsGo('users'));await frame.locator('.settings-user133').first().waitFor();
 const cards=frame.locator('.settings-user133'),adminCard=cards.filter({hasText:'Santos Cabbigat'}),staffCard=cards.filter({hasText:'Ryan Santos'});
 assert.equal(await adminCard.locator('.badge').innerText(),'Administrator');assert.equal(await staffCard.locator('.badge').innerText(),'Sub-user');
 assert.equal(await cards.locator(':scope > small').count(),0);assert.equal(await staffCard.getByRole('button',{name:'✎ Edit',exact:true}).count(),1);
 assert(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(root,'validation/screenshots/users14252.png')});
});
await check('Keyboard viewport keeps a bottom field visible and restores the phone layout',async()=>{
 await frame.evaluate(()=>{const area=document.createElement('textarea');area.id='keyboardFixture';area.style.marginTop='600px';document.querySelector('#settings-users').append(area);area.focus();area.value='Keep this draft';});
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>440});visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(250);
 const opened=await frame.evaluate(()=>{const n=document.getElementById('keyboardFixture'),r=n.getBoundingClientRect(),nav=[...document.querySelectorAll('nav.bottom')].find(n=>n.getClientRects().length);return {height:innerHeight,top:r.top,bottom:r.bottom,nav:nav.getBoundingClientRect().top,value:n.value};});
 assert.equal(opened.height,440);assert(opened.top>=0);assert(opened.bottom<=opened.nav);assert.equal(opened.value,'Keep this draft');
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(250);
 assert.equal(await page.locator('html[data-keyboard14252]').count(),0);assert.equal(await frame.evaluate(()=>innerHeight),844);assert.equal(await frame.locator('#keyboardFixture').inputValue(),'Keep this draft');await frame.locator('#keyboardFixture').evaluate(n=>n.remove());
});
await check('User editor input stays above the keyboard without losing its value',async()=>{
 await page.evaluate(()=>openUserAccessEditor(liveProfile.id));await page.locator('#userAccessJob').fill('Administrator');await page.locator('#userAccessJob').focus();
 await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,get:()=>440});visualViewport.dispatchEvent(new Event('resize'));});await page.waitForTimeout(250);
 const box=await page.locator('#userAccessJob').boundingBox();assert(box.y>=0&&box.y+box.height<=440);assert.equal(await page.locator('#userAccessJob').inputValue(),'Administrator');
 await page.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'));});await page.locator('#modalUserAccess .modal-close-x').click();
});
await check('No uncaught browser errors',async()=>assert.deepEqual(errors,[]));
fs.writeFileSync(path.join(root,'validation/admin-access14252.json'),JSON.stringify(results,null,2));await browser.close();server.close();if(results.some(r=>!r.passed))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exit(1)});
