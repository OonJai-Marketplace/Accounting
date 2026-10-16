/* Current application boundaries. Synthetic state only; no hosted requests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const run=(path,c)=>{c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path,'utf8'),c);return c};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
async function profileIsolation(){
 for(const changed of ['epoch','client','newer request']){
  const pending=[];const client={from:()=>({select(){return this},eq(){return this},single(){const job=deferred();pending.push(job);return job.promise}})};
  const c=run('src/core/auth/live-session-and-recovery.js',{DemoAccess:{currentUser:null},sessionEpoch1430:1});c.client=client;vm.runInContext('ojmDb=client',c);
  const first=c.loadLiveProfile({id:'first'});let next;
  if(changed==='epoch')c.sessionEpoch1430++;
  if(changed==='client')vm.runInContext('ojmDb={}',c);
  if(changed==='newer request'){next=c.loadLiveProfile({id:'second'});pending[1].resolve({data:{id:'second',role:'admin',status:'active'}});await next;}
  pending[0].resolve({data:{id:'first',role:'admin',status:'active'}});
  await assert.rejects(first,/changed|superseded/i,changed);
  assert.equal(vm.runInContext('liveProfile?.id||null',c),changed==='newer request'?'second':null);
 }
 console.log('PASS profile loading rejects replaced sessions, clients and superseded requests');
}
async function permissionIsolation(){
 for(const failed of [false,true]){
  let ready;const c=run('src/core/permissions/permissions1441.js',{
   liveProfile:null,livePermission:null,liveProfiles:[],sessionEpoch1430:1,ojmDb:null,
   document:{body:{},hidden:false,addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')ready=fn},getElementById:()=>null,querySelector:()=>null},
   access113:{can:()=>true,currentTarget:()=>'',enforce(){}},MutationObserver:class{observe(){}},
   addEventListener(){},setInterval(){},setTimeout,clearTimeout,requestAnimationFrame(){},openModal(){},switchTab(){},saveUserAccess(){},logoutDemoUser:async()=>{throw Error('Stale request signed out current client')}
  });ready();c.liveProfile={id:'same-user',role:'admin',status:'active'};
  const old=deferred(),fresh=deferred();let newCalls=0;c.ojmDb={rpc:()=>old.promise};const first=c.permissions1441.verify();
  c.ojmDb={rpc:()=>{newCalls++;return fresh.promise}};const second=c.permissions1441.verify();
  old.resolve(failed?{error:{code:'42501',message:'Old access denied'}}:{data:{profile:{id:'same-user',role:'admin',status:'inactive'},permissions:{old:true}}});
  await first;assert.equal(newCalls,1,'A new client must start its own verification');assert.equal(c.liveProfile.status,'active');assert.equal(c.permissions1441.verified,true);
  fresh.resolve({data:{profile:{id:'same-user',role:'admin',status:'active'},permissions:{fresh:true}}});await second;assert.equal(c.livePermission.fresh,true);
 }
 console.log('PASS replaced-client access checks neither overwrite nor sign out the new session');
}
async function demoCleanup(){
 const c=run('src/core/auth/demo-access-compatibility.js',{});
 assert.equal(vm.runInContext('DemoAccess.currentUser',c),null);
 assert.equal(vm.runInContext('typeof DemoAccess.load',c),'undefined');
 assert.equal(vm.runInContext('typeof applyDemoAccess',c),'undefined');
 assert(!fs.readFileSync('src/core/auth/demo-access-compatibility.js','utf8').includes('password:'));
 console.log('PASS compatibility state contains no demo credentials or local authentication path');
}
async function staleHydration(){
 const old=deferred(),client={from:()=>({select(){return this},eq(){return this},single:()=>old.promise})};
 const c=run('src/core/auth/live-session-and-recovery.js',{DemoAccess:{currentUser:null},document:{readyState:'loading',addEventListener(){},getElementById(){throw Error('Stale hydration touched the current login screen')}},livePermission:{fresh:true},client});
 vm.runInContext(fs.readFileSync('src/core/startup/authenticated-session-loading.js','utf8'),c);
 vm.runInContext('ojmDb=client',c);const pending=c.hydrateSupabaseSession({user:{id:'old'}});
 vm.runInContext("ojmDb={};liveProfile={id:'new',status:'active'};DemoAccess.currentUser={id:'new'}",c);
 old.resolve({data:{id:'old',status:'active'}});await pending;
 assert.equal(vm.runInContext('liveProfile.id',c),'new');assert.equal(c.DemoAccess.currentUser.id,'new');assert.equal(c.livePermission.fresh,true);
 console.log('PASS stale hydration does not clear the replacement profile or login state');
}
(async()=>{let failures=0;for(const check of [profileIsolation,permissionIsolation,staleHydration,demoCleanup])try{await check()}catch(e){failures++;console.error('FAIL',check.name,e.message)}if(failures)process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
