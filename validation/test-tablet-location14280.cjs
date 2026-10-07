const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright'),seed=require('./cold-fixture14241.cjs');
const root=path.resolve(__dirname,'..'),results=[];let fixture;const payload=token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url'))}catch{return {}}},jwt=id=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');let body='';for await(const x of req)body+=x;
 const send=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 if(u.pathname==='/auth/v1/token'){const user=fixture.profiles.find(p=>p.email===JSON.parse(body).email)||fixture.profiles[0];return send({access_token:jwt(user.id),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id:user.id,aud:'authenticated',email:user.email}})}
 if(u.pathname==='/auth/v1/user'){const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub;return send(fixture.profiles.find(x=>x.id===id))}
 if(u.pathname.startsWith('/rest/v1/')){
  const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub,me=fixture.profiles.find(x=>x.id===id);if(!me)return send({code:'42501',message:'Access denied'},403);
  const name=u.pathname.split('/rpc/')[1],p=body?JSON.parse(body):{};
  if(name){const directory=me.role==='admin'?fixture.profiles:fixture.profiles.filter(x=>x.id===id);const values={current_access14228:{profile:me,permissions:me.user_permissions},review_directory14229:directory,review_inbox14229:[],branch_home14229:{users:directory,balances:{},reports:[]},fund_balances136:fixture.balances[p.p_owner]||[],reminder_load14229:{revision:0,items:[]},get_session_policy1443:{timeout_minutes:60,warning_minutes:1},employee_photo113:null,is_admin:me.role==='admin',accounting_workspace_allowed123:true};return send(Object.hasOwn(values,name)?values[name]:[])}
  const table=u.pathname.split('/').pop();let rows=fixture.tables[table]||[];for(const [k,v]of u.searchParams)if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));return send((req.headers.accept||'').includes('object')?rows[0]||null:rows);
 }
 if(u.pathname==='/scripts/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end("window.OJM_SUPABASE_URL=location.origin;window.OJM_SUPABASE_ANON_KEY='fixture-only';window.OJM_PUBLIC_APP_URL='';")}
 try{const f=path.join(root,u.pathname);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.setHeader('Cache-Control','public,max-age=600');res.end(fs.readFileSync(f))}catch{res.statusCode=404;res.end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/tmp/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:768,height:1024},screen:{width:768,height:1024},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage();
  await page.addInitScript(()=>Object.defineProperty(navigator,'platform',{get:()=> 'iPad'}));
  await seed(page);
  await page.goto(base+'/desktop.html',{waitUntil:'load'});
  fixture=await page.evaluate(()=>__fixture);
  fixture.profiles.forEach(u=>u.user_permissions.modules=[]);
  fixture.tables.user_permissions=fixture.profiles.map(u=>({user_id:u.id,...u.user_permissions}));
  await page.locator('#loginEmail').fill(fixture.profiles[0].email);
  await page.locator('#loginPassword').fill('fixture');
  await page.locator('#loginForm button[type=submit]').click();
  await page.waitForFunction(()=>Location69.ready&&!Location69.hydrating&&liveProfile);
  await page.evaluate(()=>switchTab('sub-users-workspace'));
  await page.waitForFunction(()=>liveProfiles.length>0&&!document.body.classList.contains('startup-pending1443'));
  await page.evaluate(()=>{openWorkspaceUser(__fixture.profiles[1].id);personalJournal1437.show(__fixture.profiles[1].id,'journal')});
  const before=await page.evaluate(()=>{
   const font=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).fontSize);
   const date=document.querySelector('#journalEntry98 .transaction-date-field .oj-date-button104').getBoundingClientRect();
   const memo=document.querySelector('#jeGeneralMemo').getBoundingClientRect();
   return {main:document.querySelector('.tab-content.active')?.id,tab:document.querySelector('.personal-tabs1437 button.active')?.dataset.personalTab,
    title:font('#journalEntry98 .je-title'),user:font('.module-header [data-team-user14230][aria-current=page]'),section:font('.personal-tabs1437 button.active'),dateFont:font('#journalEntry98 .transaction-date-field .oj-date-button104'),direction:font('#simpleRows1430 .direction-toggle1439'),memoFont:font('#jeGeneralMemo'),dateRight:date.right,memoLeft:memo.left};
  });
  assert.equal(before.main,'sub-users-workspace');assert.equal(before.tab,'journal');
  assert(before.title>before.dateFont&&before.user>before.dateFont&&before.section>before.dateFont);
  assert(before.dateRight+8<=before.memoLeft);
  await page.evaluate(()=>entry1430.setMode('double'));
  const doubleDate=await page.evaluate(()=>{const n=document.querySelector('#journalEntry98 .transaction-date-field .oj-date-button104'),m=document.querySelector('#jeGeneralMemo'),r=n.getBoundingClientRect();return{overflow:n.scrollWidth>n.clientWidth,separate:r.right+8<=m.getBoundingClientRect().left,font:parseFloat(getComputedStyle(n).fontSize)}});
  assert.equal(doubleDate.overflow,false);assert(doubleDate.separate);assert(doubleDate.font<before.title);
  await page.evaluate(()=>entry1430.setMode('single'));
  await page.locator('#jeGeneralMemo').focus();
  await page.setViewportSize({width:768,height:650});await page.waitForTimeout(250);
  const keyboard=await page.evaluate(()=>{const n=document.activeElement,r=n.getBoundingClientRect(),v=visualViewport,h=n.closest('.workspace-scroll');return{flag:document.documentElement.hasAttribute('data-tablet-keyboard14266'),padding:h&&getComputedStyle(h).paddingBottom,bottom:r.bottom,visibleBottom:v.offsetTop+v.height,autocomplete:n.autocomplete}});
  assert(keyboard.flag);assert.equal(keyboard.padding,'0px');assert.equal(keyboard.autocomplete,'off');assert(keyboard.bottom<=keyboard.visibleBottom-16);
  await page.setViewportSize({width:768,height:1024});
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>Location69.ready&&!Location69.hydrating&&liveProfile);
  const after=await page.evaluate(()=>({main:document.querySelector('.tab-content.active')?.id,tab:document.querySelector('.personal-tabs1437 button.active')?.dataset.personalTab,owner:document.querySelector('#personalWorkspace1437')?.dataset.owner}));
  assert.deepEqual(after,{main:'sub-users-workspace',tab:'journal',owner:fixture.profiles[1].id});
  await context.close();
  console.log('PASS tablet hierarchy, portrait keyboard spacing, and authenticated Journal location after refresh');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
