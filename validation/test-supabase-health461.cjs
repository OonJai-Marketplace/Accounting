const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const events=[],listeners={};
const window={OJM_SUPABASE_URL:'https://abcdefghijklmnopqrst.supabase.co',dispatchEvent:e=>events.push(e.type),addEventListener:(name,fn)=>listeners[name]=fn};
vm.runInNewContext(fs.readFileSync('src/core/sync/supabase-health461.js','utf8'),{window,URL,Event,Date});
const health=window.supabaseHealth461;
assert.equal(health.current().kind,'unknown');
assert.equal(health.dashboardURL(),'https://supabase.com/dashboard/project/abcdefghijklmnopqrst');
let checks=0;
for(let i=0;i<100;i++)if(health.beginLogin('admin'))checks++;
assert.equal(checks,1,'navigation/focus/reconnect cannot schedule another login check');
health.record('admin',{status:503,error:{message:'This project is paused'}});
assert.equal(health.current().kind,'paused');assert.equal(health.presentation().title,'Database is paused');
for(let i=0;i<100;i++)assert.equal(health.notices('admin').length,1,'only one bell notice, without accumulating duplicates');
assert.equal(health.notices('admin')[0].critical,true);assert.equal(health.notices('admin')[0].persistent,true);
assert.equal(health.notices('other-user').length,0);
assert.equal(health.beginLogin('admin'),false);assert.equal(health.current().kind,'paused','warning remains until an explicit result');
health.record('admin',{status:200,data:{}});assert.equal(health.current().kind,'healthy');assert.equal(health.notices('admin').length,0);
health.record('admin',{status:503,error:{message:'Failed to fetch'}});assert.equal(health.current().kind,'unavailable');assert.equal(health.presentation().title,'Cannot connect to database');
health.record('admin',{status:503,error:{status:'RESTORING'}});assert.equal(health.current().kind,'pending');
health.record('admin',{offline:true});assert.equal(health.current().kind,'offline');
health.record('admin',{status:403,error:{message:'denied'}});assert.equal(health.current().kind,'access');
health.record('admin',{status:429,error:{message:'rate limited'}});assert.equal(health.current().kind,'limited');
let opens=0;health.setOpen(()=>++opens);health.open();assert.equal(opens,1);
health.endLogin();assert.equal(health.notices('admin').length,0);assert.equal(health.beginLogin('admin'),true,'new login checks once again');
health.record('previous-admin',{status:503,error:{message:'project is paused'}});assert.equal(health.current().kind,'unknown','previous account result cannot leak');
listeners.offline();assert.equal(health.current().kind,'offline');assert.equal(health.notices('admin').length,1,'browser offline signal uses the same persistent notice without requesting the server');
assert.match(health.presentation().detail,/Locally saved work stays on this device/);
const css=fs.readFileSync('src/core/navigation/module-dock14269.css','utf8');
assert.match(css,/supabaseReminder461 3600s/,'the existing warning has one gentle hourly animation');
assert.match(css,/prefers-reduced-motion:reduce/,'reduced motion retains the static warning');
const dock=fs.readFileSync('src/core/navigation/desktop-status-dock.js','utf8');
assert.ok(!/slotRead|retryAt|function slot|setInterval/.test(dock),'no timed or slot-based status retries');
assert.ok(dock.includes("if (window.supabaseHealth461.beginLogin(id)) request('read');"));
assert.ok(!fs.readFileSync('src/core/sync/offline14239.js','utf8').includes('observeFetch'),'ordinary traffic is not observed for this feature');
assert.ok(!/not.*confirmed|cannot be confirmed/.test(fs.readFileSync('src/core/sync/supabase-health461.js','utf8')));
console.log('PASS: one check per login, manual recovery, exact paused wording, single persistent red bell notice, offline/access distinctions, account isolation, no traffic observer or polling');

// Exercise the actual transport in local-login mode: only the read-only status
// request may bypass that mode; writes and refreshes keep their existing guard.
(async()=>{
 const source=fs.readFileSync('src/core/sync/offline14239.js','utf8');
 const transport=source.slice(source.indexOf('function errorResponse('),source.indexOf('let queueCache=null;'));
 let calls=0;
 const browser={OJM_SUPABASE_URL:window.OJM_SUPABASE_URL,sessionCache14333:{localMode:true},deviceVault14334:{offline:true}};
 const context={window:browser,navigator:{onLine:true},Request,Response,Headers,URL,AbortController,readRPC:new Set(),identity:()=> 'admin',actor:()=> 'admin',networkEpoch:0,changed:()=>{},
  nativeFetch:async()=>{calls++;return new Response(JSON.stringify({message:'This project is paused'}),{status:503});},
  setTimeout:(...args)=>setTimeout(...args).unref(),clearTimeout};
 vm.runInNewContext(transport,context);
 const call=action=>browser.fetch(window.OJM_SUPABASE_URL+'/rest/v1/rpc/desktop_dock_status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_action:action})});
 const paused=await call('read');assert.equal(calls,1);assert.equal((await paused.json()).message,'This project is paused');
 await call('refresh');await call('pins');assert.equal(calls,1,'local login cannot refresh or change pins');
 context.navigator.onLine=false;await call('read');assert.equal(calls,1,'no network request without internet');
 console.log('PASS: login status reaches upstream from local login; writes/refresh remain blocked; paused response is retained without cached fallback');
})().catch(error=>{console.error(error);process.exitCode=1;});
