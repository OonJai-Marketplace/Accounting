// Execute the actual TypeScript handlers with synthetic auth/Drive responses.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
let user='owner-a',active=true,allowed=true,conn={owner:'owner-a',sheet:'documents202:owner-a',email:'first@example.test'},calls=[],existing=null,duplicates=false;
const reply=(b,status=200)=>new Response(JSON.stringify(b),{status});
const admin={auth:{getUser:async()=>({data:{user:user?{id:user}:null},error:!user})},from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{status:active?'active':'inactive'}})})};
let source=fs.readFileSync('supabase/functions/_shared/documents202.ts','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
source=stripTypeScriptTypes(source)+ '\nglobalThis.testAPI={documentHandler,finishDocumentOAuth,fileID,fileName,resumableURL,docKey};';
const context={Request,Response,URL,URLSearchParams,AbortSignal,crypto,console,Deno:{env:{get:()=> 'test'}},admin,reply,createClient:()=>({rpc:async()=>({data:allowed})}),connection:async()=>conn,googleToken:async()=> 'server-only-token',hash:async()=> 'hash',encrypt:async()=> 'encrypted',clientID:()=> 'client',clientSecret:()=> 'secret',fetch:async(url,o={})=>{calls.push({url,o});const u=new URL(url);if(u.pathname.includes('/upload/'))return new Response(null,{status:200,headers:{Location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=test'}});if(u.pathname.endsWith('/files/root')||u.pathname.endsWith('/files/folder123456'))return reply({id:'folder123456',mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true,canRename:true}});if(u.pathname.endsWith('/files/file12345678'))return existing?reply(existing):reply({error:{message:'File not found 404'}},404);if(u.pathname.endsWith('/files'))return reply({files:duplicates?[{id:'otherfile123'}]:[]});throw Error('Unexpected URL '+url)}};
vm.createContext(context);vm.runInContext(source,context);const T=context.testAPI;
async function invoke(body){return T.documentHandler(new Request('https://edge.test/functions/v1/accounting-documents',{method:'POST',headers:{Authorization:'Bearer fake',Origin:'https://oonjai-marketplace.github.io'},body:JSON.stringify(body)}));}
assert.throws(()=>T.resumableURL('https://evil.test/upload/drive/v3/files?upload_id=test'));
assert.throws(()=>T.resumableURL('https://www.googleapis.com/upload/drive/v3/filesEvil?upload_id=test'));
assert.match(T.resumableURL('https://www.googleapis.com/upload/drive/v3/files/file12345678?upload_id=test'),/upload_id/);
assert.throws(()=>T.fileID('../private'));assert.throws(()=>T.fileName('secret/receipt.pdf'));
user=null;assert.match((await (await invoke({action:'status'})).json()).error,/expired/);user='owner-a';
active=false;assert.match((await (await invoke({action:'status'})).json()).error,/Active/);active=true;
allowed=false;assert.match((await (await invoke({action:'status'})).json()).error,/permission/);allowed=true;
conn.owner='other';assert.match((await (await invoke({action:'status'})).json()).error,/owner/);conn.owner='owner-a';
const status=await (await invoke({action:'status'})).json();assert.equal(status.email,'first@example.test');assert(!JSON.stringify(status).includes('server-only-token'));
const data={action:'upload-start',parent:'root',name:'October 2026.pdf',id:'file12345678',scan:'a1234567-b123-c123-d123-e12345678901',size:1234};
duplicates=true;assert.match((await (await invoke(data)).json()).error,/already exists/);duplicates=false;
let result=await (await invoke(data)).json();assert(result.session);assert.equal(calls.at(-1).o.headers.Authorization,'Bearer server-only-token');
existing={id:data.id,name:data.name,parents:['folder123456'],version:'2',appProperties:{ojmOwner:'other',ojmScan:data.scan}};
assert.match((await (await invoke({...data,version:'2'})).json()).error,/does not match/);
existing.appProperties.ojmOwner=user;assert.match((await (await invoke({...data,version:'1'})).json()).error,/changed/);
result=await (await invoke({...data,version:'2'})).json();assert(result.session);assert.equal(calls.at(-1).o.method,'PATCH');
existing.appProperties.ojmOwner='other';assert.match((await (await invoke({action:'file',id:data.id,scan:data.scan})).json()).error,/not this account/);
assert.equal((await T.documentHandler(new Request('https://edge.test',{method:'POST',headers:{Origin:'https://evil.test'}}))).status,403);
console.log('PASS: server auth, permission and owner isolation; folder/session validation; duplicate prevention and version checks');

for(const origin of ['https://localhost','capacitor://localhost']){
 const response=await T.documentHandler(new Request('https://edge.test',{method:'OPTIONS',headers:{Origin:origin}}));assert.equal(response.status,200);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
 user=null;const denied=await T.documentHandler(new Request('https://edge.test',{method:'POST',headers:{Origin:origin,Authorization:'Bearer fake'},body:'{"action":"status"}'}));assert.match((await denied.json()).error,/expired/);user='owner-a';
}
console.log('PASS native origins have explicit CORS and retain session authorization');

// Return destination is bound to a server-owned OAuth state, never a URL supplied
// by an app or by the OAuth callback query.
let savedState=null,savedConnection=null;
admin.from=()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:{status:'active'}}),delete(){return this},lt:async()=>({}),insert:async value=>{savedState=value;return {};},upsert:async value=>{savedConnection=value;return {};}});
await invoke({action:'connect',native214:true,returnUrl:'https://untrusted.test'});
assert.equal(savedState.sheet,'documents202:owner-a:native214');
context.fetch=async url=>url.includes('/token')?reply({access_token:'access',refresh_token:'refresh',scope:'https://www.googleapis.com/auth/drive',expires_in:3600}):reply({email:'owner@example.test',email_verified:true});
let callback=await T.finishDocumentOAuth(savedState,new URLSearchParams({code:'code',returnUrl:'https://untrusted.test'}));
assert.equal(callback.headers.get('Location'),'oonjai-accounting://scan?connected=1');
assert.equal(savedConnection.sheet,'documents202:owner-a');assert.equal(savedConnection.owner,'owner-a');
await invoke({action:'connect',native214:false});
callback=await T.finishDocumentOAuth(savedState,new URLSearchParams({code:'code'}));
assert.equal(callback.headers.get('Location'),'https://oonjai-marketplace.github.io/Accounting/scan.html?connected=1');
callback=await T.finishDocumentOAuth({...savedState,sheet:'documents202:another-user:native214'},new URLSearchParams({code:'code'}));
assert.match(callback.headers.get('Location'),/^https:\/\/oonjai-marketplace.github.io\/Accounting\/scan.html\?connection_error=/);
console.log('PASS native OAuth return is state-bound and web/account ownership remains unchanged');
