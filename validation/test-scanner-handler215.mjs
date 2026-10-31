import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import * as validation from '../supabase/functions/scanner-integration/validation.mjs';
import * as ids from '../supabase/functions/scanner-integration/ids215.mjs';
const owner='11111111-1111-4111-8111-111111111111',scan='22222222-2222-4222-8222-222222222222',group='33333333-3333-4333-8333-333333333333',page='44444444-4444-4444-8444-444444444444',journal='55555555-5555-4555-8555-555555555555';
let authenticated=true,active=true,canEdit=true,driveSaved=true,registered=null;
const records={journal_entries:[{id:journal,entry_no:'OJM26-0010',status:'posted'}],staff_journal_lines:[],scanner_documents208:[]};
class Query{
 constructor(table){this.table=table;this.filters=[];}
 select(){return this;}order(){return this;}limit(){return this;}
 eq(key,value){this.filters.push(row=>(key==='staff_journals.owner_id'?row.owner_id:row[key])===value);return this;}
 in(key,values){this.filters.push(row=>values.includes(row[key]));return this;}
 then(resolve,reject){return Promise.resolve({data:records[this.table].filter(row=>this.filters.every(f=>f(row)))}).then(resolve,reject);}
}
const user={rpc:async(name,args)=>({data:name==='password_change_required14257'?false:name==='active_account14228'?active:name==='can_action113'?(args.p_target==='sub-users-workspace'||canEdit):true}),from:table=>new Query(table)};
const admin={auth:{getUser:async()=>authenticated?{data:{user:{id:owner}}}:{error:true,data:{}}},from:table=>new Query(table),storage:{from:()=>({list:async()=>({data:[{name:page+'.jpg',metadata:{mimetype:'image/jpeg',size:123}}]})})},rpc:async(name,args)=>{registered={name,rows:args.p_rows};return {data:true};}};
let creations=0;
const context={...validation,...ids,Request,Response,URLSearchParams,AbortSignal,crypto,console,Deno:{env:{get:()=> 'https://fixture.test'},serve(){}},createClient:()=>++creations===1?admin:user,fetch:async()=>new Response(JSON.stringify({id:'drive123456789',sha256Checksum:driveSaved?'a'.repeat(64):'wrong'}),{status:200})};
vm.createContext(context);
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/scanner-integration/index.ts','utf8').replace(/^import .*;\n/gm,'').replace('export async function handler','async function handler'))+'\nglobalThis.handler215=handler;';vm.runInContext(source,context);
const invoke=async body=>{const r=await context.handler215(new Request('https://fixture.test',{method:'POST',headers:{Origin:'https://localhost',authorization:'Bearer fixture'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};};
let r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,true);
canEdit=false;records.staff_journal_lines=[{id:page,staff_journal_id:group,workspace_entry_no:'OJM26-0010',owner_id:'another-owner'}];r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,false,'another user’s staff IDs are excluded');
records.staff_journal_lines[0].owner_id=owner;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.data.ids[0].available,true);canEdit=true;
const manifest={workflow:215,id:scan,revision:1,title:'Receipts',provider:'drive',pdf:{path:'drive123456789',sha256:'a'.repeat(64)},groups:[{id:group,type:'journal',entryLabel:'OJM26-0010',targets:{journal_ids:[journal],staff_line_ids:[]}}],pages:[{id:page,groupID:group,page:2,label:'OJM26-0010A',preview:{path:owner+'/'+scan+'/1/'+page+'.jpg'}}]};
driveSaved=false;r=await invoke({action:'register',manifest});assert.match(r.data.error,/Drive has not confirmed/);assert.equal(registered,null);
driveSaved=true;records.journal_entries[0].id='66666666-6666-4666-8666-666666666666';r=await invoke({action:'register',manifest});assert.match(r.data.error,/identity changed/);assert.equal(registered,null);
records.journal_entries[0].id=journal;r=await invoke({action:'register',manifest});assert.equal(r.data.registered,true);assert.equal(registered.name,'scanner_register215');assert.equal(registered.rows[0].owner_id,owner);
authenticated=false;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.equal(r.status,401);
authenticated=true;active=false;r=await invoke({action:'ids',scan,groups:[{type:'journal',label:'OJM26-0010'}]});assert.match(r.data.error,/active, unlocked/);
console.log('PASS actual handler: authorized ID lookup, own-staff scope, verified Drive before registration, immutable journal UUID recheck and service-only atomic registration');
