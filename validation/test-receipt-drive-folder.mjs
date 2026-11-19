import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';

const source=fs.readFileSync('supabase/functions/receipt-drive-preview/index.ts','utf8').replace(/^import .*;\n/gm,'');
const folderType='application/vnd.google-apps.folder';
const destination={root:'receipt-folder',scope:'fixture',key:'connection',email:'owner@example.test',name:'Receipts'};
async function run(root,resume=false){
 const steps=[],updates=[];
 const admin={
  rpc:async(name,args)=>{
   if(name==='receipt_preview_claim')return {data:{cursor:resume?{folders:[{id:destination.root,name:'Receipts'}]}:null}};
   assert.equal(name,'receipt_preview_step_with_alerts');steps.push(args);return {data:null};
  },
  from(table){
   const data=table==='profiles'?{role:'admin',status:'active'}:{};
   return {select(){return this;},eq(){return this;},update(patch){updates.push(patch);return this;},
    maybeSingle:async()=>({data}),single:async()=>({data}),then(resolve){return Promise.resolve({data}).then(resolve);}};
  }
 };
 const ctx=vm.createContext({admin,connection:async()=>({owner:'owner',email:destination.email}),googleToken:async()=>'token',
  crypto,URLSearchParams,AbortSignal,Deno:{serve(){}},fetch:async url=>{
   const path=new URL(url).pathname;
   if(path.endsWith('/files/'+destination.root))return root;
   if(path.endsWith('/changes/startPageToken'))return Response.json({startPageToken:'start'});
   assert(path.endsWith('/files'));return Response.json({files:[]});
  }});
 vm.runInContext(stripTypeScriptTypes(source),ctx);
 let error;
 try{await ctx.scan(destination);}catch(e){error=e;}
 return {error,steps,updates};
}
for(const resume of [false,true]){
 for(const root of [new Response(null,{status:404}),Response.json({mimeType:folderType,trashed:true}),Response.json({mimeType:'application/pdf'})]){
  const {error,steps,updates}=await run(root,resume);
  assert(error,'An unavailable receipt folder was incorrectly accepted as empty.');
  assert.equal(steps.length,0,'The last successful inventory must survive an unavailable folder.');
  assert(updates.some(x=>x.last_error));assert(updates.some(x=>x.lease===null));
 }
}
const empty=await run(Response.json({mimeType:folderType,trashed:false}));
assert.ifError(empty.error);assert.equal(empty.steps.length,1);assert.equal(empty.steps[0].p_done,true);
console.log('PASS missing, trashed and non-folder destinations preserve saved inventory on fresh and resumed checks; an accessible empty folder completes.');
