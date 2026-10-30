const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const source=fs.readFileSync('src/core/sync/local-first14333.js','utf8');let owner='a',requests=[];const snapshots=new Map(),rows=Array.from({length:450},(_,i)=>({id:String(i),version:1,title:'Document '+i,kind:i%2?'template':null,employee:null}));
 const db={from(table){let columns,id;const q={select:s=>(columns=s,q),order:()=>q,eq:(k,v)=>(id=v,q),range:async(a,b)=>{requests.push(columns);return {data:rows.slice(a,b+1)};},single:async()=>{requests.push(columns);return {data:{id,version:1,data:{title:'Full document',html:'body'.repeat(250000)}}};}};return q;}};
 const c={actor:()=>owner,ojmDb:db,snapshot:async(k,fn)=>{if(!snapshots.has(k))snapshots.set(k,await fn());return snapshots.get(k)},latestRows:(kind,r)=>r};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('async function loadDocuments('),source.indexOf('\nasync function invalidateConfirmed')),c);
 const index=await c.loadDocuments();assert.equal(index.data.length,450);assert.equal(requests.length,3);assert.ok(requests.every(s=>!s.includes('*')&&!s.includes('html')));assert.ok(index.data.every(r=>r.summary143198&&!r.data.html));
 const full=await c.loadDocument(index.data[0]);assert.equal(full.data.html.length,1000000);assert.equal(requests.length,4);assert.equal(await c.loadDocument(index.data[0]),full);assert.equal(requests.length,4);assert.equal(await c.loadDocument({data:{html:'unsynced draft'}}).then(r=>r.data.html),'unsynced draft');
 console.log('PASS 450 document titles use three bounded metadata reads; a 1MB body downloads only on open, reuses its version cache and leaves local drafts intact');
})().catch(e=>{console.error(e);process.exitCode=1});
