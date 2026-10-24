const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');
let state={},calls=[],remote=[],permissions=true;
function query(table){let op='select',value;const q={select(){return q},eq(){return q},gt(){return q},lt(){return q},in(){return q},single(){return q},maybeSingle(){return q},delete(){op='delete';return q},update(v){op='update';value=v;return q},upsert(v){op='upsert';value=v;return q},insert(v){op='insert';value=v;return q},then(resolve){calls.push({table,op,value});resolve({data:state[table]??null,error:null});}};return q;}
const client={from:query,auth:{getUser:async()=>({data:{user:{id:'admin'}},error:null})},rpc:async(name)=>({data:name==='google_poll_key143150'?'cron-secret':permissions,error:null})};
const env={SUPABASE_URL:'https://project.test',SUPABASE_SERVICE_ROLE_KEY:'fixture-key',SUPABASE_ANON_KEY:'fixture-anon',GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret'};
const ctx={createClient:()=>client,Deno:{env:{get:n=>env[n]}},crypto:globalThis.crypto,TextEncoder,TextDecoder,Uint8Array,Date,Map,JSON,URL,URLSearchParams,Response,Request,AbortSignal,btoa,atob,console,fetch:async(u,o)=>{remote.push([u,o]);return new Response(JSON.stringify(u.includes('values:batchGet')?{valueRanges:[{values:[['draft-0001','2026-01-01','Pending']]}]}:u.includes('fields=')?{sheets:[{properties:{title:'Accounts',sheetId:1}},{properties:{title:'Drafts',sheetId:2}}]}:{values:[['draft_id'],['draft-0001','2026-01-01','Pending'],['draft-0002','2026-01-02','Posted']]}));}};
let src=fs.readFileSync('supabase/functions/_shared/google143150.ts','utf8').replace(/^import .*\n/,'').replace('export async function handler','async function handler');
src=stripTypeScriptTypes(src)+ '\nglobalThis.test={handler,encrypt,decrypt,proxy,poll};';vm.createContext(ctx);vm.runInContext(src,ctx);
(async()=>{
 const p=ctx.test,request=(body,auth)=>new Request('https://project.test/google-journal-bridge',{method:'POST',headers:auth?{Authorization:'Bearer '+auth}:{},body:JSON.stringify(body)});
 let r=await p.handler(request({action:'status'}));assert.equal(r.status,400);assert.match((await r.json()).error,/sign-in/);assert.equal(calls.length,0);
 state.budget_settings14313={data:{googleSheets143129:{sheet:'sheet12345678901234567890',client:'client'}}};
 r=await p.handler(request({action:'status'},'user'));assert.deepEqual(await r.json(),{connected:false,configured:true,email:''});
 permissions=false;r=await p.handler(request({action:'status'},'user'));assert.equal(r.status,400);permissions=true;
 const encrypted=await p.encrypt('refresh-private');assert.notEqual(encrypted,'refresh-private');assert.equal(await p.decrypt(encrypted),'refresh-private');
 const c={sheet:'sheet12345678901234567890',refresh_token:encrypted,access_token:await p.encrypt('access-private'),expires_at:new Date(Date.now()+3600000).toISOString()};
 await assert.rejects(p.proxy(c,'https://evil.test','GET',null),/Unsupported/);
 await assert.rejects(p.proxy(c,':batchUpdate','POST',{requests:[{deleteSheet:{sheetId:1}}]}),/Unsupported/);
 await assert.rejects(p.proxy(c,':batchUpdate','POST',{requests:[{deleteDimension:{range:{sheetId:1,dimension:'ROWS',startIndex:1,endIndex:2}}}]}),/Unsupported/);
 state.operation_receipts14228=[{request_key:'drive-v1:'+c.sheet+':draft-0002'}];
 await p.poll(c);const cache=calls.findLast(x=>x.table==='google_inbox143150'&&x.op==='upsert');assert.equal(cache.value.notices.length,1);assert.equal(cache.value.notices[0].noticeId,'draft-0001');state.google_inbox143150=cache.value;remote=[];await p.poll(c);assert.equal(remote.length,1);assert(remote[0][0].includes('A1:A10002'),'unchanged scheduled notification check reads IDs only');
 assert(!calls.some(x=>x.table==='journal_entries'));r=await p.handler(request({action:'poll'},'wrong'));assert.equal(r.status,400);
 const before=calls.length;r=await p.handler(new Request('https://project.test/google-oauth-callback?state=invalid'));assert.equal(r.status,400);assert.equal(calls.length,before);
 console.log('PASS server auth, permission denial, encrypted tokens, scoped sheet operations, receipt-filtered notifications, invalid cron/state rejection. No live financial writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
