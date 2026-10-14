const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
(async()=>{
let text='',writes=0,calls=0,active=false;const listeners={};
const node={get textContent(){return text},set textContent(v){text=v;writes++}},journal={classList:{contains:()=>active}};
const c={Date,Number,String,Math,JournalModule:{},ApplicationSettings:{accounting:{}},liveProfile:{id:'test-user'},document:{readyState:'complete',getElementById:id=>id==='journal'?journal:node},ojmDb:{rpc:async()=>{calls++;return {data:8}}},addEventListener:(n,f)=>listeners[n]=f};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('src/bookkeeping/journal/entry-number14257.js','utf8'),c);
const initial=writes;c.entryNumber14257.paint();assert.equal(writes,initial,'unchanged preview must not mutate DOM');listeners.page113();await new Promise(r=>setImmediate(r));assert.equal(calls,0,'blank/other pages must not fetch journal preview');active=true;listeners.page113();await new Promise(r=>setImmediate(r));assert.equal(calls,1);assert.equal(text,'JRN-0008');c.JournalModule.editingEntryId='JRN-0002';c.entryNumber14257.paint();assert.equal(text,'Editing: JRN-0002');const last=writes;c.entryNumber14257.paint();assert.equal(writes,last);console.log('PASS preview only requests on Journal, preserves editing ID, avoids unchanged hidden DOM writes');
})().catch(e=>{console.error(e);process.exitCode=1});
