const runtimeErrors=[];
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright'),seed=require('./cold-fixture14241.cjs');
const root=path.resolve(__dirname,'..');let fixture;const ledgerCalls=[];let grants=[0],denyLedger=false,sessionMinutes=60,workspaceDelay=0,directoryDelay=0;const payload=token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url'))}catch{return {}}},jwt=id=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');let body='';for await(const x of req)body+=x;
 const send=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 if(u.pathname==='/auth/v1/token'){const user=fixture.profiles.find(p=>p.email===JSON.parse(body).email)||fixture.profiles[0];return send({access_token:jwt(user.id),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id:user.id,aud:'authenticated',email:user.email}})}
 if(u.pathname==='/auth/v1/logout')return send({});
 if(u.pathname==='/auth/v1/user'){const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub;return send(fixture.profiles.find(x=>x.id===id))}
 if(u.pathname.startsWith('/rest/v1/')){
  const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub,me=fixture.profiles.find(x=>x.id===id);if(!me)return send({code:'42501',message:'Access denied'},403);
  const name=u.pathname.split('/rpc/')[1],p=body?JSON.parse(body):{};if(name==='review_directory14229'&&directoryDelay)await new Promise(r=>setTimeout(r,directoryDelay));if(name==='fund_balances136'&&workspaceDelay)await new Promise(r=>setTimeout(r,workspaceDelay));
  if(name==='assigned_ledger14281'){ledgerCalls.push(p);if(denyLedger)return send({code:'42501',message:'Ledger access denied'},403);return send({accounts:grants.map(i=>({id:fixture.accounts[i].id,code:String(100+i),name:'Assigned '+i,currency:fixture.accounts[i].currency})),rows:p.p_account?[{id:'main-ledger-line',date:p.p_from,reference:'MAIN-1',description:'Main company posting',debit:100,credit:0,balance:200}]:[],opening:100,closing:200})}if(name==='admin_save_access1441'){return send({user_id:p.p_user,saved:true})}if(name){const directory=me.role==='admin'?fixture.profiles:fixture.profiles.filter(x=>x.id===id||(me.user_permissions.module_actions113?.['sub-users-home14229']&&x.user_permissions.manager_id===id));const values={current_access14228:{profile:me,permissions:me.user_permissions},review_directory14229:directory,review_inbox14229:fixture.journals||[],branch_home14229:{users:directory,balances:{},reports:[]},fund_balances136:fixture.balances[p.p_owner]||[],reminder_load14229:{revision:0,items:[]},get_session_policy1443:{timeout_minutes:sessionMinutes,warning_minutes:1},employee_photo113:null,is_admin:me.role==='admin',accounting_workspace_allowed123:true};return send(Object.hasOwn(values,name)?values[name]:[])}
  const table=u.pathname.split('/').pop();if(req.method==='POST'&&table==='session_policy1443')fixture.tables[table]=[JSON.parse(body)];let rows=fixture.tables[table]||[];for(const [k,v]of u.searchParams)if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));return send((req.headers.accept||'').includes('object')?rows[0]||null:rows);
 }
 if(u.pathname==='/scripts/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end("window.OJM_SUPABASE_URL=location.origin;window.OJM_SUPABASE_ANON_KEY='fixture-only';window.OJM_PUBLIC_APP_URL='';")}
 try{const f=path.join(root,u.pathname);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.setHeader('Cache-Control','public,max-age=600');res.end(fs.readFileSync(f))}catch{res.statusCode=404;res.end()}
});

const delay=page=>page.waitForTimeout(450);
async function makePage(browser,base,{width,height=1000,tablet=false,phone=false,role=0,customize,onLogin}){
 const context=await browser.newContext({viewport:{width,height},screen:{width,height},isMobile:tablet||phone,hasTouch:tablet||phone,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>runtimeErrors.push(e.message));
 if(tablet)await page.addInitScript(()=>Object.defineProperty(navigator,'platform',{get:()=> 'iPad'}));
 await seed(page);await page.goto(base+'/desktop.html');fixture=await page.evaluate(()=>__fixture);if(customize)customize(fixture);fixture.tables.accounts=fixture.accounts;fixture.tables.profiles=fixture.profiles;fixture.tables.session_policy1443=[{id:true,timeout_minutes:sessionMinutes,warning_minutes:1}];fixture.profiles.forEach(u=>u.user_permissions.modules=[]);fixture.tables.user_permissions=fixture.profiles.map(u=>({user_id:u.id,...u.user_permissions}));
 await page.locator('#loginEmail').fill(fixture.profiles[role].email);await page.locator('#loginPassword').fill('fixture');await page.locator('#loginForm button[type=submit]').click();if(onLogin)await onLogin(page);await page.waitForFunction(()=>Location69.ready&&!Location69.hydrating&&liveProfile);await delay(page);await page.evaluate(async()=>{await loadProfilesFromSupabase();Work82.loaded=true;Work82.employees=[{id:'e',data:{name:'Audit Employee',active:true,salary:6500000,contracts99:[],assessments99:[]}}]});page.setDefaultTimeout(5000);return {context,page};
}
async function mainJournal(page){await page.evaluate(()=>{switchTab('journal');const m=getCurrentMonthPrefix();JournalModule.entries=['01','04'].flatMap((d,i)=>{const id='JRN-2026-10-'+String(i+42).padStart(5,'0');return[{id,dbEntryId:id,date:m+'-'+d,account:'Office supplies and operating expenses',currency:'LAK',memo:'Printer paper, invoice OJ-2026-00817',generalMemo:'Monthly office supplies purchased for the Vientiane main office',debit:100000000000.50,credit:0},{id,dbEntryId:id,date:m+'-'+d,account:'Cash on hand',currency:'LAK',memo:'Payment from main cash fund',generalMemo:'Monthly office supplies purchased for the Vientiane main office',debit:0,credit:100000000000.50}]});renderJournalHistoryTable()});await delay(page)}
async function subJournal(page){await page.evaluate(()=>{switchTab('sub-users-workspace');const id=__fixture.profiles[1].id;openWorkspaceUser(id);personalJournal1437.show(id,'journal');const m=document.querySelector('#personalActive1437 input').value;reviewStaffJournals=[{id:'test',owner_id:id,status:'draft',period_start:m+'-01',lines:['02','01'].map((d,i)=>({id:'line'+i,workspace_entry_no:'SJR-RS-202610-'+String(i+17).padStart(5,'0'),transaction_date:m+'-'+d,direction:'out',fund_account_id:__fixture.accounts[0].id,account_id:__fixture.accounts[3].id,currency_code:'LAK',amount:100000000000.5,memo:'Printer paper, invoice OJ-2026-00817',editor_snapshot1437:{memo:'Monthly office supplies purchased for the Vientiane main office'}}))}];renderSubUserWorkspace();openWorkspaceUser(id);personalJournal1437.show(id,'journal')});await delay(page)}

async function textFits(page,selector){return page.locator(selector).first().evaluate(table=>{
 const problems=[];for(const cell of table.querySelectorAll('tbody td')){const bounds=cell.getBoundingClientRect();if(!bounds.width)continue;const walker=document.createTreeWalker(cell,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){if(!node.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width&&(r.left<bounds.left-1||r.right>bounds.right+1))problems.push({text:node.textContent.trim(),width:Math.round(bounds.width),right:Math.round(r.right-bounds.right)});}}
 return problems;
})}
async function ownJournal(page){await subJournal(page);await page.locator('.module-header [data-team-user14230="00000000-0000-4000-8000-000000000002"]').click();await page.evaluate(()=>personalJournal1437.show(__fixture.profiles[1].id,'journal'));await delay(page)}
async function expire(page,minutes){await page.evaluate(async minutes=>{const saved=readLocation69()||{};SessionTimeoutManager.lastActivity=Date.now()-minutes*60000;localStorage.setItem(locationKey69(),JSON.stringify({...saved,lastActivity:SessionTimeoutManager.lastActivity}));await SessionTimeoutManager.check1434()},minutes);await delay(page)}

function manyAccounts(f){
 const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
 for(const [i,type] of ['DRAWING','LIABILITY','EQUITY','REVENUE','SYSTEM'].entries())f.accounts.push({id:uid(150+i),code:String(9000+i),name:(type==='DRAWING'?'Drawings':type)+' account',currency:'LAK',currency_code:'LAK',type:type==='DRAWING'?'EQUITY':type==='SYSTEM'?'ASSET':type,account_type:type==='DRAWING'?'EQUITY':type==='SYSTEM'?'ASSET':type,is_technical:type==='SYSTEM',is_posting:true,isPosting:true,is_active:true,active:true});
 f.accounts.push({id:uid(180),code:'9999',name:'Parent only',currency:'LAK',currency_code:'LAK',type:'SYSTEM',account_type:'SYSTEM',is_posting:false,isPosting:false,is_active:true});
 f.profiles[0].user_permissions.manager_id=uid(3);f.profiles[2].user_permissions.manager_id=uid(4);f.profiles[3].user_permissions.manager_id=null;
 for(let n=5;n<17;n++)f.profiles.push({id:uid(n),full_name:'User '+String(n).padStart(2,'0'),email:'user'+n+'@example.invalid',role:'submitter',status:'active',user_permissions:{manager_id:uid(1),modules:[],assigned_fund_account_ids:[],destination_account_ids:[],allowed_directions:['out'],module_actions113:{'sub-users-workspace':['view','edit']}}});
}
const phoneFrame=page=>page.frames().find(f=>f.url().includes('phone-accounting.html'));
async function selected(page){return phoneFrame(page).evaluate(()=>phoneSelection14237())}
async function stablePhone14286(page){const frame=phoneFrame(page);await frame.waitForFunction(()=>document.readyState==='complete'&&document.querySelector('.app')?.getAttribute('aria-busy')==='false');await frame.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});}
async function openAssigned(page){await stablePhone14286(page);const frame=page.frameLocator('#connectedPhone132');await frame.locator('.profile').click();await frame.getByRole('button',{name:'Assigned Account Ledger',exact:true}).click();return frame;}
const output=process.env.OJM_APPEARANCE_SHOTS||'/tmp/ojm-appearance14287';fs.mkdirSync(output,{recursive:true});
const report={screens:[],checks:[],errors:runtimeErrors};
async function audit(page,name){
 const failures=await page.evaluate(()=>{
  const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
  const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const found=[];
  for(const n of document.querySelectorAll('.tab-content.active *,main.screen:not(.hidden) *,dialog[open] *,.oj-date-popup104 *,.account-list1428 *,.ui-dialog108 *')){
   if(![...n.childNodes].some(t=>t.nodeType===3&&t.textContent.trim())&&!n.matches('input:not([type=checkbox]):not([type=radio])'))continue;
   if(!n.checkVisibility()||n.getBoundingClientRect().width<5||n.closest('.doc-canvas105'))continue;
   const c=getComputedStyle(n);let bg=[255,255,255],p=n;
   while(p){const v=rgb(getComputedStyle(p).backgroundColor);if(v.length===3||v[3]>.95){bg=v;break}p=p.parentElement}
   const a=lum(rgb(c.color)),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
   if(ratio<4.5)found.push({text:(n.value||n.textContent).trim().slice(0,70),ratio:+ratio.toFixed(2),node:n.tagName+'.'+n.className,bg:p?.tagName+'.'+p?.className,fg:c.color});
  }return found;
 });report.screens.push({name,failures});
}
async function shot(page,name){await page.screenshot({path:path.join(output,name+'.png')})}
async function fingerprint(page){return page.evaluate(()=>{
 const selectors=['#journalEntry98 .je-title','#jeGeneralMemo','#jeNextIdDisplay','#journalEntry98 .je-line-debit'];
 return selectors.map(s=>{const n=document.querySelector(s);if(!n)return null;const c=getComputedStyle(n);return[s,c.fontFamily,c.fontSize,c.fontWeight,c.lineHeight]});
})}
async function desktop(browser,base){
 const {page,context}=await makePage(browser,base,{width:1440,height:1050,customize:manyAccounts});
 await page.evaluate(()=>switchTab('journal'));
 await page.evaluate(()=>OjmAppearance14287.set('dark'));
 await page.locator('#journalEntry98 .oj-date-button104').first().click();
 await page.locator('.oj-date-popup104').waitFor({state:'visible'});await audit(page,'dark-date-picker');await shot(page,'dark-date-picker');await page.keyboard.press('Escape');
 await page.evaluate(()=>OjmAppearance14287.set('light'));
 const fontWith=await fingerprint(page);
 await page.locator('link[href*="appearance14287"]').evaluate(n=>n.disabled=true);
 assert.deepEqual(await fingerprint(page),fontWith,'Existing fonts must remain unchanged');
 await page.locator('link[href*="appearance14287"]').evaluate(n=>n.disabled=false);
 report.checks.push('Existing journal font families, sizes, weight and line heights unchanged');
 const ids=await page.locator('.tab-content[id]').evaluateAll(ns=>ns.map(n=>n.id));
 const shots=new Set(['dashboard','journal','accounts-modular-container','payroll-employees','payroll-overview','report-pl','document-editor105','tax-overview','settings-system','settings-accounting']);
 for(const mode of ['dark','light']){
  await page.evaluate(mode=>OjmAppearance14287.set(mode),mode);
  for(const id of ids){
   await page.evaluate(id=>switchTab(id),id);await page.waitForTimeout(100);
   if(await page.locator('#'+id).evaluate(n=>!n.classList.contains('active')))continue;
   await audit(page,mode+'-'+id);
   if(id==='document-editor105'){
    const paper=page.frameLocator('#docFrame105').locator('.page').first();await paper.waitFor();
    assert.equal(await paper.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)','Document paper remains white');
    assert.equal(await page.frameLocator('#docFrame105').locator('body').evaluate(n=>getComputedStyle(n).backgroundColor),mode==='dark'?'rgb(14, 40, 31)':'rgb(237, 242, 240)','Editor surround follows theme');
   }
   if(shots.has(id))await shot(page,mode+'-'+id);
  }
  await page.evaluate(()=>{switchTab('sub-users-home14229');Organization14229?.loadHome?.()});await page.waitForTimeout(180);
  await audit(page,mode+'-subusers-home');await shot(page,mode+'-subusers-home');
  await page.locator('.module-header [data-team-user14230]').first().click();await page.waitForTimeout(180);
  await audit(page,mode+'-subuser-workspace');await shot(page,mode+'-subuser-workspace');
 }
 await page.evaluate(()=>switchTab('journal'));
 await page.emulateMedia({media:'print'});
 const printColors=()=>page.locator('#journalEntry98').evaluate(n=>{const c=getComputedStyle(n);return[c.color,c.backgroundColor,c.fontFamily,c.fontSize]});
 const printLight=await printColors();await page.evaluate(()=>OjmAppearance14287.set('dark'));
 assert.deepEqual(await printColors(),printLight,'Theme must not affect print media');await page.emulateMedia({media:'screen'});
 await page.locator('#jeGeneralMemo').focus();
 assert.equal(await page.locator('#jeGeneralMemo').evaluate(n=>getComputedStyle(n).outlineWidth),'2px');
 assert.equal(await page.locator('#jeGeneralMemo').evaluate(n=>getComputedStyle(n.closest('.je-field-group')).outlineStyle),'none');
 const sidebarDark=await page.locator('#appSidebar').evaluate(n=>getComputedStyle(n).backgroundColor);
 await page.locator('#themeDock14287').click();
 assert.equal(await page.evaluate(()=>OjmAppearance14287.get()),'light');
 assert.equal(await page.locator('#appSidebar').evaluate(n=>getComputedStyle(n).backgroundColor),sidebarDark);
 await page.reload();assert.equal(await page.evaluate(()=>OjmAppearance14287.get()),'light');
 report.checks.push('Theme switch persists on reload; sidebar color preserved; print colors identical; input-only focus');
 await context.close();
}
async function devices(browser,base){
 for(const width of [1194,834]){
  const {page,context}=await makePage(browser,base,{width,height:width===834?1194:834,tablet:true,customize:manyAccounts});
  for(const id of ['dashboard','journal','payroll-overview','settings-system']){
   await page.evaluate(id=>switchTab(id),id);await page.waitForTimeout(120);await audit(page,'tablet-'+width+'-'+id);await shot(page,'tablet-'+width+'-'+id);
  }await context.close();
 }
 for(const width of [390,320]){
  const {page,context}=await makePage(browser,base,{width,height:844,phone:true,customize:manyAccounts});await stablePhone14286(page);
  const frame=phoneFrame(page);await frame.evaluate(()=>chooseWorkspace('00000000-0000-4000-8000-000000000002'));await page.waitForTimeout(220);
  for(const mode of ['dark','light']){
   await frame.evaluate(mode=>OjmAppearance14287.set(mode),mode);
   await page.waitForFunction(mode=>OjmAppearance14287.get()===mode,mode);
   for(const name of ['home','accounts','post','entries','history']){
    await frame.evaluate(name=>go(name),name);await page.waitForTimeout(160);await audit(frame,'phone-'+width+'-'+mode+'-'+name);await shot(page,'phone-'+width+'-'+mode+'-'+name);
   }
  }
  await frame.evaluate(()=>go('post'));await page.waitForTimeout(120);
  const fit=await frame.locator('.staff-post-header14287').evaluate(n=>{const h=n.querySelector('h1').getBoundingClientRect(),b=n.querySelector('.staff-template-tools14285').getBoundingClientRect();return{sameRow:Math.abs(h.top-b.top)<20,fit:b.right<=innerWidth&&h.right<=b.left}});
  assert.ok(fit.sameRow&&fit.fit,'Template controls fit the Post Entry header at '+width);
  await frame.locator('#staffMemo').fill('Theme focus check');await frame.locator('#staffMemo').focus();
  assert.equal(await frame.locator('#staffMemo').evaluate(n=>getComputedStyle(n.closest('.field')).outlineStyle),'none');
  assert.equal(await frame.locator('#staffMemo').evaluate(n=>getComputedStyle(n).outlineWidth),'2px');
  await frame.evaluate(()=>OjmAppearance14287.set('dark'));
  await frame.getByRole('button',{name:'Add Template',exact:true}).click();await frame.locator('dialog[open]').waitFor();
  await audit(frame,'phone-'+width+'-template-dialog');await shot(page,'phone-'+width+'-template-dialog');
  await frame.getByRole('button',{name:'Close templates',exact:true}).click();
  await frame.locator('.profile').click();await frame.locator('#themePhone14287').waitFor({state:'visible'});const menu=frame.locator('#phoneAccount1424');
  assert.equal(await menu.locator('button').last().textContent(),'Sign out');
  assert.equal(await menu.locator('button').nth((await menu.locator('button').count())-2).getAttribute('id'),'themePhone14287');
  await frame.locator('#themePhone14287').click();await shot(page,'phone-'+width+'-theme-menu');
  report.checks.push('Phone '+width+': header controls fit, isolated input focus, switch above Sign out, frame synchronization');
  await context.close();
 }
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox']});
 try{await desktop(browser,base);await devices(browser,base)}finally{
  fs.writeFileSync(path.join(output,'audit.json'),JSON.stringify(report,null,2));await browser.close();server.close();
 }
 const failures=report.screens.flatMap(s=>s.failures.map(f=>({screen:s.name,...f})));
 console.log(JSON.stringify({screens:report.screens.length,checks:report.checks,contrastFailures:failures.length,output,errors:runtimeErrors},null,2));
 if(failures.length){fs.writeFileSync(path.join(output,'contrast-failures.json'),JSON.stringify(failures,null,2));process.exitCode=1}
})().catch(e=>{console.error(e);process.exitCode=1});
