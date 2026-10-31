const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/documents/scanner/scanner202.js','utf8'),C=require('../src/documents/scanner/core202.js');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
function fixture(){const records=new Map(),calls=[];let rejectWrite=false;const draft=C.create('2026-10','OJM26-0007');draft.pending=[];
 const ctx={C,structuredClone,crypto,valid(){},draft,editing:null,cameraQueue:[],retakeTarget211:null,captureLoop209:true,store:async key=>records.get(key),persist:async(change,entries=[],deletes=[])=>{if(rejectWrite)throw Error('Quota exceeded');for(const [k,v]of entries)records.set(k,structuredClone(v));for(const k of deletes)records.delete(k);},render(){},status(){},navigator:{},readFile:async f=>f,closeDialog(){},checkpointEditing:async()=>{},confirm:()=>true,openCamera209:async()=>calls.push('camera'),review:async()=>calls.push('save'),nextPhoto:async()=>calls.push('pending'),Error};
 ctx.C={...C,image:async()=>({}),canvas:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=> 'thumbnail'})};
 vm.createContext(ctx);vm.runInContext(between('async function queueOriginal(', 'async function resumePhoto(')+between('async function acceptPage(', 'async function nextPhoto('),ctx);
 return {ctx,records,calls,fail:()=>rejectWrite=true,recover:()=>rejectWrite=false};}
(async()=>{
 const f=fixture(),c=f.ctx;let p=await c.queueOriginal('old-photo');assert.equal(f.records.get('pending:'+p.key).original,'old-photo');c.editing={pendingKey:p.key,original:'old-photo',id:null,group:c.draft.active,corners:[[0,0],[1,0],[1,1],[0,1]],result:{data:'straightened',width:700,height:1000}};
 await c.retake211();assert.equal(c.draft.pending.length,1);assert.equal(f.records.get('pending:'+p.key).original,'old-photo','opening retake preserves original');
 c.cameraQueue.push({original:'replacement',group:p.group,replace:p.key});f.fail();await assert.rejects(c.protectImports(),/not yet protected/);assert.equal(f.records.get('pending:'+p.key).original,'old-photo');assert.equal(c.cameraQueue.length,1);
 f.recover();await c.protectImports();assert.equal(f.records.get('pending:'+p.key).original,'replacement');assert.equal(c.draft.pending.length,1,'replacement must not duplicate pending pages');assert.equal(c.retakeTarget211,null);
 c.editing={pendingKey:p.key,original:'replacement',id:null,group:c.draft.active,result:{data:'straightened',width:700,height:1000}};
 f.fail();await assert.rejects(c.acceptPage('next-entry'),/Quota/);assert.equal(c.draft.pages.length,0);assert.equal(c.draft.pending.length,1);assert.ok(c.editing);
 f.recover();c.captureLoop209=false;await c.acceptPage('next-entry');assert.equal(c.draft.pages.length,1);assert.equal(c.draft.pending.length,0);assert.equal(c.draft.groups.at(-1).label,'OJM26-0008');assert.equal(c.draft.pages[0].group,c.draft.groups[0].id);assert.equal(f.calls.at(-1),'camera');
 p=await c.queueOriginal('second');c.editing={pendingKey:p.key,original:'second',group:c.draft.active,result:{data:'second-crop',width:600,height:900}};await c.acceptPage('save');assert.equal(f.calls.at(-1),'save');assert.equal(c.draft.pages.length,2);assert.equal(c.draft.pending.length,0);
 p=await c.queueOriginal('discard');c.editing={pendingKey:p.key};await c.deleteCurrent211();assert.equal(c.draft.pending.length,0);assert.equal(c.draft.pages.length,2);assert.equal(f.records.has('pending:'+p.key),false);assert.equal(f.calls.at(-1),'camera');
 c.workflow211=()=>{};c.esc=x=>x;c.icon211=()=>'';vm.runInContext(between('async function openPage(', 'async function openCamera209('),c);await c.openPage(c.draft.pages[0].id);assert.equal(c.draft.active,c.draft.pages[0].group,'reviewing an earlier entry keeps subsequent receipts in that entry');
 console.log('PASS durable retake replacement, quota retry without duplication, next-entry grouping, save handoff and deleting only the selected scan');
})().catch(e=>{console.error(e);process.exitCode=1});
