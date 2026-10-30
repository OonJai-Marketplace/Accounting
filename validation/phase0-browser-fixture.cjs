const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright'),seed=require('./cold-fixture14241.cjs');
const root=process.env.PHASE0_ROOT||path.resolve(__dirname,'..');let fixture;const requests=[];const payload=token=>{try{return JSON.parse(Buffer.from(token.split('.')[1],'base64url'))}catch{return {}}},jwt=id=>Buffer.from('{}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
const server=http.createServer(async(req,res)=>{
 const u=new URL(req.url,'http://localhost');if(u.pathname.startsWith('/auth/')||u.pathname.startsWith('/rest/'))requests.push(req.method+' '+u.pathname+u.search);let body='';for await(const x of req)body+=x;
 const send=(data,status=200)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
 if(u.pathname==='/auth/v1/logout'){res.statusCode=204;return res.end()}
 if(u.pathname==='/auth/v1/token'){if(fixture.authDenied)return send({error:'invalid_grant',error_description:'Refresh token revoked'},401);const user=fixture.profiles.find(p=>p.email===JSON.parse(body).email)||fixture.profiles[0];return send({access_token:jwt(user.id),refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,user:{id:user.id,aud:'authenticated',email:user.email}})}
 if(u.pathname==='/auth/v1/user'){const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub;return send(fixture.profiles.find(x=>x.id===id))}
 if(u.pathname.startsWith('/rest/v1/')){
  const id=payload((req.headers.authorization||'').replace(/^Bearer /,'')).sub,me=fixture.profiles.find(x=>x.id===id);if(!me)return send({code:'42501',message:'Access denied'},403);
  const name=u.pathname.split('/rpc/')[1],p=body?JSON.parse(body):{};
  if(name==='audit_page143198')return send({rows:[],month:String(p.p_month||'').slice(0,7),months:[],counts:{},total:0});
  if(name==='journal_window14333'){fixture.journalReads?.push(p);return send({rows:(fixture.journal||[]).slice(p.p_offset||0,(p.p_offset||0)+500),opening:[],revision:fixture.journalRevision||'journal-fixture'});}if(name==='admin_save_access1441')return send({saved:true,user_id:p.p_user});if(name==='payroll_window14334')return send({rows:[],carry:[],index:[],revision:'payroll-fixture'});if(name){const directory=me.role==='admin'?fixture.profiles:fixture.profiles.filter(x=>x.id===id);const values={password_change_status14257:{required:false},current_access14228:{profile:me,permissions:me.user_permissions},review_directory14229:directory,review_inbox14229:[],branch_home14229:{users:directory,balances:{},reports:[]},fund_balances136:fixture.balances[p.p_owner]||[],reminder_load14229:{revision:0,items:[]},get_session_policy1443:{timeout_minutes:60,warning_minutes:1},employee_photo113:null,is_admin:me.role==='admin',accounting_workspace_allowed123:true};return send(Object.hasOwn(values,name)?values[name]:[])}
  const table=u.pathname.split('/').pop();if(req.method==='POST'&&['payroll_employees','payroll_runs','payroll_leave_records','company_documents105','operational_reports'].includes(table)){const row=JSON.parse(body);fixture.tables[table]||=[];fixture.tables[table].push(row);fixture.deviceWrites=(fixture.deviceWrites||0)+1;return send([row])}let rows=fixture.tables[table]||[];for(const [k,v]of u.searchParams)if(v.startsWith('eq.'))rows=rows.filter(r=>String(r[k])===v.slice(3));return send((req.headers.accept||'').includes('object')?rows[0]||null:rows);
 }
 if(u.pathname==='/scripts/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end("window.OJM_SUPABASE_URL=location.origin;window.OJM_SUPABASE_ANON_KEY='fixture-only';window.OJM_PUBLIC_APP_URL='';")}
 try{const f=path.join(root,u.pathname);res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.html')?'text/html':f.endsWith('.png')?'image/png':f.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.setHeader('Cache-Control','public,max-age=600');res.end(fs.readFileSync(f))}catch{res.statusCode=404;res.end()}
});

module.exports=async function createFixture(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/tmp/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 return {base,browser,requests,get fixture(){return fixture},async open(device='desktop',role='admin',clock=false){
  const phone=device==='phone',tablet=!phone&&process.env.PHASE0_DEVICE==='tablet';
  const context=await browser.newContext({...(process.env.FIXTURE_TIMEZONE?{timezoneId:process.env.FIXTURE_TIMEZONE}:{}),viewport:{width:phone?390:1440,height:900},isMobile:phone,hasTouch:phone,...(tablet?{viewport:{width:1024,height:768},screen:{width:1024,height:768},userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',isMobile:true,hasTouch:true}:{})});
  const page=await context.newPage();page.setDefaultTimeout(25000);if(clock)await page.clock.install({time:Date.now()});if(process.env.FIXTURE_TIME)await page.clock.setFixedTime(new Date(process.env.FIXTURE_TIME));
  await page.addInitScript(()=>{window.__rawLocal=window.localStorage;window.__rawSession=window.sessionStorage;});
  if(process.env.SYNC_ISOLATION==='suspended')await page.addInitScript(()=>{
    window.__syncSuspended={timers:0,observers:0};
    const interval=window.setInterval,timeout=window.setTimeout,Observer=window.MutationObserver;
    window.setInterval=function(fn,ms,...args){const stack=new Error().stack||'';if(/auto-sync14256|idle-sync14341|local-first14333|assigned-ledger14281/.test(stack)||/updateHeaderProfile104\(\);updateBell/.test(String(fn))){__syncSuspended.timers++;return 0;}return interval(fn,ms,...args)};
    window.setTimeout=function(fn,ms,...args){const stack=new Error().stack||'';if(/auto-sync14256/.test(stack)||ms===1000&&/local-first14333/.test(stack)){__syncSuspended.timers++;return 0;}return timeout(fn,ms,...args)};
    window.MutationObserver=class extends Observer{constructor(fn){super(fn);this.syncOnly=/offline14239/.test(new Error().stack||'');}observe(...args){if(this.syncOnly){__syncSuspended.observers++;return;}return super.observe(...args);}};
  });
  // Keep integration tests isolated from the real Google bridge; specific inbox tests override this route.
  await page.route('https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/google-journal-bridge',route=>{
    const action=route.request().postDataJSON()?.action;
    if(action==='inboxes-read'){if(fixture)fixture.inboxChecks=(fixture.inboxChecks||0)+1;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sheet:'fixture-inbox'})});}
    return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Fixture bridge action not configured'})});
  });
  await seed(page);await page.goto(base+(phone?'/phone.html?staff=1':'/desktop.html'));
  fixture=await page.evaluate(()=>__fixture);fixture.profiles.forEach(u=>u.user_permissions.modules=u.role==='admin'?[]:['sub-users']);fixture.tables.user_permissions=fixture.profiles.map(u=>({user_id:u.id,...u.user_permissions}));
  const me=role==='admin'?fixture.profiles[0]:fixture.profiles[1];
  const login=async()=>{await page.locator('#loginEmail').fill(me.email);await page.locator('#loginPassword').fill('fixture-only');await page.locator('#loginForm button[type=submit]').click();
   await page.waitForFunction(phone?()=>window.PhoneWorkspace14242?.ready():()=>window.startup14257?.prepared&&liveProfile&&document.getElementById('loginGate').classList.contains('is-authenticated'));
  };
  return {page,context,me,login};
 },async close(){await browser.close();await new Promise(r=>server.close(r));}};
};
