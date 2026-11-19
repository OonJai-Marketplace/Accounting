import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as validation from '../supabase/functions/scanner-integration/validation.mjs';
import * as ids from '../supabase/functions/scanner-integration/ids215.mjs';
const owner='11111111-1111-4111-8111-111111111111',scan='22222222-2222-4222-8222-222222222222',group='33333333-3333-4333-8333-333333333333',page='44444444-4444-4444-8444-444444444444',journal='55555555-5555-4555-8555-555555555555';
let authenticated=true,active=true,canEdit=true,driveSaved=true,registered=null,origin='https://localhost';
const records={journal_entries:[{id:journal,entry_no:'OJM26-0010',status:'posted'}],staff_journal_lines:[],scanner_documents208:[]};
class Query{
 constructor(table){this.table=table;this.filters=[];}
 select(){return this;}order(key,{ascending=true}={}){this.sort=key;this.asc=ascending;return this;}limit(n){this.end=n;return this;}range(a,b){this.start=a;this.end=b+1;return this;}like(key,value){this.filters.push(row=>row[key]?.startsWith(value.slice(0,-1)));return this;}gte(key,value){this.filters.push(row=>row[key]>=value);return this;}
 eq(key,value){this.filters.push(row=>(key==='staff_journals.owner_id'?row.owner_id:row[key])===value);return this;}
 in(key,values){this.filters.push(row=>values.includes(row[key]));return this;}
 then(resolve,reject){return Promise.resolve({data:records[this.table].filter(row=>this.filters.every(f=>f(row))).sort((a,b)=>String(a[this.sort]).localeCompare(String(b[this.sort]))*(this.asc?1:-1)).slice(this.start||0,this.end)}).then(resolve,reject);}
}
const user={rpc:async(name,args)=>({data:name==='password_change_required14257'?false:name==='active_account14228'?active:name==='can_action113'?(args.p_target==='sub-users-workspace'||canEdit):true}),from:table=>new Query(table)};
const admin={auth:{getUser:async()=>authenticated?{data:{user:{id:owner}}}:{error:true,data:{}}},from:table=>new Query(table),storage:{from:()=>({list:async()=>({data:[{name:page+'.jpg',metadata:{mimetype:'image/jpeg',size:123}}]})})},rpc:async(name,args)=>{registered={name,rows:args.p_rows};return {data:true};}};
let creations=0;
const context={...validation,...ids,Request,Response,URLSearchParams,AbortSignal,crypto,console,Deno:{env:{get:()=> 'https://fixture.test'},serve(){}},createClient:()=>++creations===1?admin:user,fetch:async()=>new Response(JSON.stringify({id:'drive123456789',sha256Checksum:driveSaved?'a'.repeat(64):'wrong'}),{status:200})};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/scanner-integration/index.ts','utf8').replace(/^import .*;\n/gm,'').replace('export async function handler','async function handler'))+'\nglobalThis.handler215=handler;';vm.runInContext(source,context);
const invoke=async (body,headers={})=>{const r=await context.handler215(new Request('https://fixture.test',{method:'POST',headers:{Origin:origin,authorization:'Bearer fixture',...headers},body:JSON.stringify(body)}));assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);return {status:r.status,data:await r.json()};};
let r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,true);
canEdit=false;records.staff_journal_lines=[{id:page,staff_journal_id:group,workspace_entry_no:'OJM26-0010',owner_id:'another-owner'}];r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,false,'another user’s staff IDs are excluded');
records.staff_journal_lines[0].owner_id=owner;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,true);canEdit=true;
const manifest={workflow:215,id:scan,revision:1,title:'Receipts',provider:'drive',pdf:{path:'drive123456789',sha256:'a'.repeat(64)},groups:[{id:group,type:'journal',entryLabel:'OJM26-0010',targets:{journal_ids:[journal],staff_line_ids:[]}}],pages:[{id:page,groupID:group,page:2,label:'OJM26-0010A',preview:{path:owner+'/'+scan+'/1/'+page+'.jpg'}}]};
driveSaved=false;r=await invoke({action:'register',manifest});assert.match(r.data.error,/Drive has not confirmed/);assert.equal(registered,null);
driveSaved=true;records.journal_entries[0].id='66666666-6666-4666-8666-666666666666';r=await invoke({action:'register',manifest});assert.match(r.data.error,/identity changed/);assert.equal(registered,null);
records.journal_entries[0].id=journal;r=await invoke({action:'register',manifest});assert.equal(r.data.registered,true);assert.equal(registered.name,'scanner_register215');assert.equal(registered.rows[0].owner_id,owner);
records.staff_journal_lines=[];records.journal_entries=[{id:journal,entry_no:'OJM260001',status:'posted'},{id:page,entry_no:'OJM260050',status:'posted'}];records.scanner_documents208=[];
r=await invoke({action:'suggest-ids',type:'journal',label:'OJM26-0001',exclude:[]});assert.equal(r.data.suggestions[0].label,'OJM260001','use actual database format');
r=await invoke({action:'suggest-ids',type:'journal',label:'OJM260002',exclude:[]});assert.equal(r.data.suggestions[0].label,'OJM260050','find real ID beyond 20-number gaps');
r=await invoke({action:'suggest-ids',type:'journal',label:'OJM26',exclude:['OJM260001']});assert.equal(r.data.suggestions[0].label,'OJM260050','typing suggestions exclude device batches');
records.scanner_documents208=[{owner_id:owner,entry_label:'OJM260001',created_at:'2026-11-01',scan_id:'other'}];r=await invoke({action:'suggest-ids',type:'journal',label:'OJM260001',resume:true,exclude:[]});assert.equal(r.data.suggestions[0].label,'OJM260050','resume after last saved entry');
canEdit=false;r=await invoke({action:'suggest-ids',type:'journal',label:'OJM26',exclude:[]});assert.equal(r.data.suggestions.some(x=>x.label==='OJM260050'),false,'suggestions do not expand access');canEdit=true;
r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM 26 0001'}]});assert.equal(r.data.ids[0].label,'OJM260001');assert.equal(r.data.ids[0].available,true);
records.scanner_documents208=[{id:page,owner_id:owner,group_id:group,revision:1,entry_label:'OJM260001',scan_id:'other',pages:[{page:1}]}];r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0001'}]});assert.equal(r.data.ids[0].requiresChoice,true);assert.equal(r.data.ids[0].available,true);
const modern=structuredClone(manifest);modern.workflow=218;modern.groups[0].entryLabel='OJM260001';modern.groups[0].receiptChoice={mode:'add',expected:[page]};r=await invoke({action:'register',manifest:modern});assert.equal(r.data.registered,true);assert.equal(registered.name,'scanner_register218');
authenticated=false;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.status,401);
authenticated=true;active=false;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.match(r.data.error,/active, unlocked/);
console.log('PASS actual handler: authorized ID lookup, own-staff scope, verified Drive before registration, immutable journal UUID recheck and service-only atomic registration');

// A first receipt may start at an October ID, even with no January–September receipts.
active=true;authenticated=true;records.scanner_documents208=[];records.staff_journal_lines=[];
records.journal_entries=[{id:journal,entry_no:'OJM260284',status:'closed',transaction_date:'2026-10-15'}];
for(origin of ['https://oonjai-marketplace.github.io','https://localhost','capacitor://localhost','https://accounting.oonjai.invalid']){
 const preflight=await context.handler215(new Request('https://fixture.test',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey,authorization,content-type'}}));
 assert.equal(preflight.status,200);assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
 r=await invoke({action:'ids',groups:[{type:'journal',label:'OJM260284'}]});assert.equal(r.data.ids[0].available,true);assert.equal(r.data.ids[0].receiptCount,0);
 const october=structuredClone(modern);october.groups[0].entryLabel='OJM260284';october.groups[0].receiptChoice={mode:'new',expected:[]};
 r=await invoke({action:'register',manifest:october});assert.equal(r.data.registered,true);assert.equal(registered.rows[0].entry_label,'OJM260284');
 authenticated=false;r=await invoke({action:'ids',groups:[{type:'journal',label:'OJM260284'}]});assert.equal(r.status,401);authenticated=true;
}
origin='https://accounting.oonjai.invalid';canEdit=false;
r=await invoke({action:'ids',groups:[{type:'journal',label:'OJM260284'}]});assert.equal(r.data.ids[0].available,false,'Hub origin does not grant main-journal permission');
for(const deniedOrigin of ['https://restaurant.oonjai.invalid','http://accounting.oonjai.invalid','https://accounting.oonjai.invalid.evil.test','null']){
 const denied=await context.handler215(new Request('https://fixture.test',{method:'OPTIONS',headers:{Origin:deniedOrigin}}));assert.equal(denied.status,403);assert.notEqual(denied.headers.get('Access-Control-Allow-Origin'),deniedOrigin);
}
console.log('PASS exact native/workspace CORS, October-first receipts in a closed book, and unchanged authentication and journal permissions');

origin='https://accounting.oonjai.invalid';
for(const headers of [{'user-agent':'Mozilla/5.0 (Linux; Android 13) Mobile Safari'}, {'user-agent':'iPhone'}, {'sec-ch-ua-mobile':'?1'}]){
 for(const action of ['ids','journal-id-index','suggest-ids','register']){
  const paused=await invoke({action},headers);
  assert.equal(paused.status,403);assert.equal(paused.data.error,'Feature unavailable. Coming soon.');
 }
 const list=await invoke({action:'list'},headers);
 assert.equal(list.status,200);assert.deepEqual(list.data.documents,[]);
}
const tablet=await invoke({action:'ids',groups:[{type:'journal',label:'SRR260055'}]},{'user-agent':'Mozilla/5.0 (Linux; Android 13; Tablet) Safari'});
assert.equal(tablet.status,200);
console.log('PASS bundled phone capture checks and registration show the notice; phone receipt list and tablet lookup remain available');
