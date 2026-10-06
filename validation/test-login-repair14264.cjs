const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
const path=require('node:path'),root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name)}
function policy(response,cached){
 const saved=new Map(cached?[['ojm-session-policy1443:https://test:a',JSON.stringify(cached)]]:[]);
 const c={window:{OJM_SUPABASE_URL:'https://test'},location:{origin:'https://test'},ApplicationSettings:{system:{}},APP_SETTINGS_KEY:'settings',liveProfile:{id:'a'},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},document:{readyState:'loading',addEventListener(){}},setTimeout,clearTimeout,ojmDb:{from:()=>({select:()=>({eq:()=>({maybeSingle:()=>typeof response==='function'?response(c):Promise.resolve(response)})})})}};
 vm.runInNewContext(read('scripts/session-policy1443.js'),c);return c;
}
function service(result,options={}){
 const calls=[];let refresh=0;
 const db={auth:{getSession:async()=>({data:{session:options.noSession?null:{access_token:'current',expires_at:options.expired?1:Date.now()/1000+1000}}}),refreshSession:async()=>{refresh++;return {data:{session:{access_token:'fresh'}}}}},functions:{invoke:async(name,args)=>{calls.push({name,...args});return result}}};
 const c={window:{},Date};vm.runInNewContext(read('scripts/password-service14264.js'),c);return {invoke:body=>c.window.passwordService14264(db,body),calls,refresh:()=>refresh};
}
async function handler(authUser,role='admin',pendingError=false){
 let serve,updates=0,rpcs=[];
 const admin={auth:{getUser:async()=>authUser?{data:{user:{id:'actor'}}}:{error:{message:'invalid'},data:{}},admin:{updateUserById:async()=>{updates++;return {}}}},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role,status:'active'}})})})}),rpc:async(name,args)=>{rpcs.push(args.p_action);return pendingError?{error:{message:'Active administrator required'}}:{data:{confirmed:true}}}};
 let ts=read('supabase/functions/admin-password14257/index.ts').replace(/^import .*;\n/,'');
 const c={createClient:()=>admin,Deno:{env:{get:k=>k==='APP_ORIGIN'?'https://oonjai-marketplace.github.io':'test'},serve:fn=>serve=fn},Response,crypto:require('node:crypto').webcrypto};vm.runInNewContext(stripTypeScriptTypes(ts),c);
 const request=body=>new Request('https://test',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)});
 return {invoke:body=>serve(request(body)),updates:()=>updates,rpcs};
}
(async()=>{
 const row={timeout_minutes:60,warning_minutes:1};
 await test('active account receives configured timeout',async()=>{const c=policy({data:row});await c.window.loadSessionPolicy1443('a');assert.equal(c.ApplicationSettings.system.sessionTimeout,'60')});
 await test('hidden settings explain the targeted SQL repair',async()=>{const c=policy({data:null},row);await assert.rejects(c.window.loadSessionPolicy1443('a'),/missing or hidden.*FIX-SESSION-POLICY-v142.63/);assert.equal(c.ApplicationSettings.system.sessionTimeout,undefined)});
 await test('invalid timeout is rejected',async()=>{await assert.rejects(policy({data:{...row,timeout_minutes:0}}).window.loadSessionPolicy1443('a'),/invalid/)});
 await test('cached policy works on transport failure',async()=>{const c=policy({error:{message:'Failed to fetch'}},row);await c.window.loadSessionPolicy1443('a');assert.equal(c.ApplicationSettings.system.sessionTimeout,'60')});
 await test('authorization failure cannot use cached policy',async()=>{await assert.rejects(policy({error:{code:'42501',message:'permission denied'}},row).window.loadSessionPolicy1443('a'),/permission denied/)});
 await test('pending password gate stays closed',async()=>{await assert.rejects(policy({error:{code:'PT403',message:'PASSWORD_CHANGE_REQUIRED'}},row).window.loadSessionPolicy1443('a'),/required password change/)});
 await test('account switch cannot apply another policy',async()=>{const c=policy(ctx=>{ctx.liveProfile={id:'b'};return Promise.resolve({data:row})});await assert.rejects(c.window.loadSessionPolicy1443('a'),/Account changed/);assert.equal(c.ApplicationSettings.system.sessionTimeout,undefined)});
 await test('expired token refreshes before one password request',async()=>{const s=service({data:{confirmed:true}},{expired:true});await s.invoke({action:'issue'});assert.equal(s.refresh(),1);assert.equal(s.calls.length,1);assert.equal(s.calls[0].headers.Authorization,'Bearer fresh')});
 await test('gateway JWT error identifies function configuration',async()=>{const s=service({error:{context:new Response(JSON.stringify({message:'Invalid JWT'}),{status:401})}});await assert.rejects(s.invoke({action:'issue'}),/Verify JWT/);assert.equal(s.calls.length,1)});
 await test('service error preserves actual backend explanation',async()=>{const s=service({error:{context:new Response(JSON.stringify({error:'Another reset is still in progress'}),{status:400})}});await assert.rejects(s.invoke({action:'issue'}),/Another reset/)});
 await test('missing session never invokes password service',async()=>{const s=service({},{noSession:true});await assert.rejects(s.invoke({action:'issue'}),/expired/);assert.equal(s.calls.length,0)});
 const body={action:'issue',user_id:'00000000-0000-0000-0000-000000000001',password:'StrongTest123!'};
 await test('function rejects invalid token with gateway check disabled',async()=>{const h=await handler(false);assert.equal((await h.invoke(body)).status,401);assert.equal(h.updates(),0);assert.equal(h.rpcs.length,0)});
 await test('function rejects ordinary sub-user issuance',async()=>{const h=await handler(true,'staff');assert.equal((await h.invoke(body)).status,403);assert.equal(h.updates(),0)});
 await test('SQL authorization failure prevents password mutation',async()=>{const h=await handler(true,'admin',true);assert.equal((await h.invoke(body)).status,400);assert.equal(h.updates(),0)});
 await test('administrator prepare-update-confirm flow remains enforced',async()=>{const h=await handler(true);assert.equal((await h.invoke(body)).status,200);assert.equal(h.updates(),1);assert.deepEqual(h.rpcs,['prepare','confirm'])});
 await test('deployed bundle matches repaired session source',async()=>{const bundle=read('scripts/desktop14245-6.js'),marker='/* scripts/session-policy1443.js */\n',a=bundle.indexOf(marker)+marker.length,b=bundle.indexOf('\n;\n/* scripts/organization14229.js */',a);assert.equal(bundle.slice(a,b),read('scripts/session-policy1443.js'));assert(!bundle.includes('Cannot load session settings. Check the connection and install'))});
 await test('HTML loads password helper before consumers',async()=>{for(const [file,consumer] of [['desktop.html','account-security14257.js'],['recovery.html','recovery14257.js']]){const html=read(file);assert(html.indexOf('password-service14264.js')<html.indexOf(consumer));assert(html.includes(consumer+'?v=142.64'))}});
 console.log(`${checks} regression checks passed. Live Supabase configuration was not modified.`);
})().catch(e=>{console.error(e);process.exitCode=1});
