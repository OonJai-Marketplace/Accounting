const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const data=new Map(),local=new Map(),scope='https://nhjsesfhapnjtwlxvirm.supabase.co',id='owner';
const storage={getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v),removeItem:k=>local.delete(k),key:i=>[...local.keys()][i],get length(){return local.size}};
const db={transaction(){const tx={objectStore(){return {get(k){const r={};setTimeout(()=>{r.result=structuredClone(data.get(k));r.onsuccess?.();setTimeout(()=>tx.oncomplete?.(),0)},0);return r},put(v,k){data.set(k,structuredClone(v))}}}};return tx}};
const ctx={console,URL,Date,JSON,Map,Set,String,Error,structuredClone,setTimeout,clearTimeout,Event,liveProfile:{id},location:{origin:scope},OJM_SUPABASE_URL:scope,localStorage:storage,document:{readyState:'loading',addEventListener(){}},dispatchEvent(){},indexedDB:{open(){const r={};setTimeout(()=>{r.result=db;r.onsuccess()},0);return r}}};ctx.window=ctx;vm.createContext(ctx);
const run=p=>vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../',p),'utf8'),ctx);
run('src/core/sync/operational-reset143108.js');run('src/core/sync/local-first14333.js');
(async()=>{
 const oldKey=scope+':'+id+':outbox';data.set(oldKey,[{id:'old-payroll',kind:'runs',created:'2026-10-18T00:00:00Z'},{id:'employee',kind:'employees'},{id:'new-payroll',kind:'runs',created:'2026-10-19T06:00:00Z'}]);
 const oldSnapshot=scope+':'+id+':snapshot:payroll:2026',oldJournal=scope+':'+id+':journal-outbox14385';data.set(oldSnapshot,{runs:['old']});data.set(oldJournal,[{id:'old-journal'}]);
 local.set('ojm_pending_posts99_'+id,JSON.stringify([{id:'legacy',payload:{old:true}}]));local.set('ojm-main14333:'+scope+':'+id+':old',JSON.stringify({id:'old',payload:{old:true}}));
 assert.equal(await ctx.localFirst14333.edit(id,'snapshot:payroll:2026'),undefined);assert.equal(await ctx.localFirst14333.edit(id,'journal-outbox14385'),undefined);
 assert.deepEqual(Array.from(await ctx.localFirst14333.edit(id,'outbox'),j=>j.id),['employee','new-payroll']);assert.equal(ctx.localFirst14333.mainLoad(id).length,0);
 await ctx.localFirst14333.edit(id,'journal-outbox14385',()=>[{id:'new-journal'}]);assert.equal((await ctx.localFirst14333.edit(id,'journal-outbox14385'))[0].id,'new-journal');assert.equal(data.get(oldJournal)[0].id,'old-journal','old recovery bytes retained');assert.equal(data.get(oldSnapshot).runs[0],'old');assert.equal(data.get(oldKey).length,3,'read isolation does not delete employee or recovery data');
 ctx.localFirst14333.mainSave({id:'fresh',payload:{fresh:true}},id);assert.deepEqual(Array.from(ctx.localFirst14333.mainLoad(id),j=>j.id),['fresh']);
 const draft={employee:{salary:2700000},journal:{old:true},run:{old:true},forms:{salary:{panel:'payroll-employees'},post:{panel:'journal'},schedule:{panel:'transactions-recurring'}},templates:[{name:'Retain'}]};ctx.accountingReset143108.drafts(draft);assert.equal(draft.journal,undefined);assert.equal(draft.run,undefined);assert.equal(draft.employee.salary,2700000);assert(draft.forms.salary&&draft.forms.schedule&&!draft.forms.post);assert.equal(draft.templates[0].name,'Retain');draft.journal={fresh:true};ctx.accountingReset143108.drafts(draft);assert(draft.journal.fresh);
 ctx.OJM_SUPABASE_URL='https://other.supabase.co';assert.equal(ctx.accountingReset143108.suffix(),'');
 console.log('PASS actual device storage: old journal/snapshots excluded; employee and new payroll jobs retained; fresh journal saves readable; recovery bytes retained; unrelated database unaffected.');
})().catch(e=>{console.error(e);process.exitCode=1});
