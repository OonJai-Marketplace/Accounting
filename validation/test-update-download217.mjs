import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
let savedState;
const query={select(){return this;},eq(){return this;},lt(){return this;},delete(){return this;},insert(value){savedState=value;return this;},maybeSingle:async()=>({data:{status:'active'}}),then(resolve){return Promise.resolve({data:null}).then(resolve);}};
const context={Request,Response,URL,URLSearchParams,AbortSignal,crypto,console,Date,Deno:{env:{get:()=> 'https://fixture.test'}},
 admin:{from:()=>query,auth:{getUser:async()=>({data:{user:{id:'owner'}}})}},createClient:()=>({rpc:async()=>({data:true})}),
 connection:async()=>null,clientID:()=> 'test-client',clientSecret:()=> 'test-secret',hash:async()=> 'hashed-state',
 reply:(value,status=200)=>new Response(JSON.stringify(value),{status}),encrypt:async value=>value,googleToken:async()=>'',fetch(){throw Error('Cancelled OAuth must not exchange a token');}};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/_shared/documents202.ts','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,''));
vm.runInContext(source+'\nglobalThis.finish=finishDocumentOAuth;globalThis.handle=documentHandler;',context);
for(const [body,suffix,target]of [[{},'','https://oonjai-marketplace.github.io/Accounting/scan.html'],[{native214:true},':native214','oonjai-accounting://scan'],[{native214:true,native215:true},':native215','oonjai-accounting-preview://scan']]){
 const response=await context.handle(new Request('https://fixture.test',{method:'POST',headers:{Origin:'https://localhost',Authorization:'Bearer fixture'},body:JSON.stringify({action:'connect',...body})}));
 assert.equal(response.status,200);assert.equal(savedState.sheet,'documents202:owner'+suffix);
 const returned=await context.finish(savedState,new URLSearchParams({error:'access_denied'}));
 assert.equal(returned.status,303);assert.equal(returned.headers.get('Location').split('?')[0],target);
 assert.match(returned.headers.get('Location'),/connection_error=/);
}
console.log('PASS server-owned OAuth state returns web, original app and preview app to distinct destinations; cancellation exchanges no tokens');
let media=0,paths=[];context.connection=async()=>({owner:'owner'});context.googleToken=async()=> 'private-token';
context.fetch=async(url,options)=>{paths.push(url);if(url.includes('alt=media')){media++;assert.equal(options.headers.Authorization,'Bearer private-token');return new Response(new Uint8Array([1,2,3]));}return new Response(JSON.stringify({id:'1zp0jP2YoM2nxxZw2n32thUZKEUzvDEje',mimeType:'application/vnd.android.package-archive',size:'3',sha256Checksum:'a'.repeat(64)}));};
const request=body=>context.handle(new Request('https://fixture.test',{method:'POST',headers:{Origin:'https://localhost',Authorization:'Bearer fixture'},body:JSON.stringify({action:'app-update217',...body})}));
let r=await request({sha256:'a'.repeat(64),id:'ignored-other-file'});assert.equal(r.status,200);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),new Uint8Array([1,2,3]));assert.equal(r.headers.get('Access-Control-Allow-Origin'),'https://localhost');assert.ok(paths.every(url=>url.includes('1zp0jP2YoM2nxxZw2n32thUZKEUzvDEje')));assert.equal(media,1);
r=await request({sha256:'b'.repeat(64)});assert.equal(r.status,400);assert.equal(media,1,'changed APK blocked before media transfer');context.connection=async()=>null;r=await request({sha256:'a'.repeat(64)});assert.equal(r.status,400);assert.match(await r.text(),/Connect Google Drive/);assert.equal(media,1);
console.log('PASS authenticated update stream: fixed APK only, expected hash required, no token disclosure, owned Drive connection required');
