import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';

const source=fs.readFileSync('supabase/functions/_shared/documents202.ts','utf8').replace(/^import .*;\n/gm,'').replaceAll('export ','');
const root='drive_root_0001', receipts='receipt_folder1', branch='branch_folder01', chosen='chosen_folder01';
const metadata=new Map([[root,['My Drive']],[receipts,['Receipts',root]],[branch,['Finance',root]],[chosen,['Receipts',branch]]]);
let role='admin', owner='manager', annual=false, hasSettings=true, writtenParent;
const company={email:'sample@example.test',owner:'manager'}, folderURL='https://drive.google.com/drive/folders/'+receipts;
const config=()=>({googleSheets143129:{receiptDrive228:{active:{email:company.email,name:'Receipts',folderURL,connectionKey:'documents-company228:manager:sample',annual231:annual}}}});
const admin={auth:{getUser:async()=>({data:{user:{id:owner}}})},from(table){let id;return {select(){return this},eq(key,value){id=value;return this},async maybeSingle(){return {data:table==='profiles'?{role:id==='manager'?'admin':role,status:'active'}:{data:config()}}}}}};
const createClient=()=>({rpc:async(_,args)=>({data:args.p_target==='settings-accounting'?hasSettings:true})});
const requests=[];
const fetch=async(raw,options={})=>{
 const url=new URL(raw), params=url.searchParams;requests.push(url);
 if(url.pathname.startsWith('/upload/')){writtenParent=JSON.parse(options.body).parents[0];return new Response('',{headers:{location:'https://www.googleapis.com/upload/drive/v3/files?upload_id=sample'}});}
 if(url.pathname==='/drive/v3/files'){
  if(options.method==='POST'){
   const data=JSON.parse(options.body);assert.deepEqual(data.parents,[branch]);metadata.set('created_child01',[data.name,data.parents[0]]);return Response.json({id:'created_child01',name:data.name,parents:data.parents});
  }
  const q=params.get('q'), parent=q.match(/^'([^']+)'/)[1];
  if(q.includes("name='"))return Response.json({files:[]});
  if(params.get('pageToken')==='next')return Response.json({files:[]});
  return Response.json({files:[...metadata].filter(([,v])=>v[1]===parent).map(([id,[name]])=>({id,name})),nextPageToken:'next'});
 }
 let id=url.pathname.split('/').pop();if(id==='root')id=root;
 if(!metadata.has(id))return Response.json({error:{message:'File not found'}},{status:404});
 const [name,parent]=metadata.get(id);return Response.json({name,id,parents:parent?[parent]:[],mimeType:'application/vnd.google-apps.folder',capabilities:{canAddChildren:true}});
};
const env={admin,createClient,fetch,Deno:{env:{get:()=>''}},connection:async key=>key.startsWith('documents-company228:')?company:null,googleToken:async()=>'',reply:(data,status=200)=>Response.json(data,{status}),clientID:()=>true,clientSecret:()=>true};
const handle=new Function(...Object.keys(env),stripTypeScriptTypes(source)+';return documentHandler;')(...Object.values(env));
const call=async(action,options={})=>{const res=await handle(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer fixture',Origin:'https://localhost'},body:JSON.stringify({action,...options})}));return res.json()};
const scan={scan:'fixture_scan_000000001',id:'fixture_file_00001',name:'entry.pdf',size:12};
let result=await call('folders',{parent:'root'});assert.deepEqual(result.files.map(x=>x.id),[receipts,branch]);
result=await call('folders',{parent:branch,pageToken:'next'});assert.deepEqual(result.files,[]);
result=await call('folders',{parent:chosen});assert.equal(result.parent.name,'My Drive › Finance › Receipts');
result=await call('folders',{parent:chosen,folderPicker:true});assert.deepEqual(result.trail.map(x=>x.id),[root,branch,chosen]);assert.equal(result.parent.name,'Receipts');
assert.equal((await call('status')).companyDestination228,null);assert.equal((await call('status')).companyManaged228,false);
const created=await call('create-folder',{parent:branch,name:'New receipts'});
assert.equal((await call('folders',{parent:created.id})).parent.name,'My Drive › Finance › New receipts');
assert.equal((await call('upload-start',{...scan,parent:created.id})).id,scan.id);assert.equal(writtenParent,created.id);
assert.equal((await call('status',{folderPicker:true})).companyDestination228.id,receipts);
assert.equal((await call('folder',{id:chosen})).id,chosen);
assert.match((await call('upload-start',{...scan,parent:'root'})).error,/Choose a folder/);
assert.equal((await call('upload-start',{...scan,parent:chosen})).id,scan.id);assert.equal(writtenParent,chosen);
assert.equal(config().googleSheets143129.receiptDrive228.active.folderURL,folderURL);
for(const mode of ['staff','no settings','another admin','yearly']){
 role=mode==='staff'?'staff':'admin';owner=mode==='staff'||mode==='another admin'?'other':'manager';hasSettings=mode!=='no settings';annual=mode==='yearly';
 const before=requests.length;
 result=await call('folders',{parent:chosen,folderPicker:true});assert.equal(result.parent.id,receipts);assert.deepEqual(result.files,[]);assert.equal(result.locked,true);
 assert.ok(!requests.slice(before).some(url=>url.searchParams.has('q')));assert.ok(result.trail.every(part=>!part.id));
 assert.match((await call('create-folder',{parent:branch,name:'No permission'})).error,/desktop Settings/);
 if(!annual)assert.match((await call('upload-start',{...scan,parent:chosen})).error,/changed/);
}
console.log('PASS Android breadcrumb, root browsing, pagination, duplicate names, selected upload parent, protected default and staff/yearly boundaries.');
