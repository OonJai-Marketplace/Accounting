const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const file=fs.readFileSync('src/documents/scanner/scanner202.js','utf8');
const code=(a,b)=>file.slice(file.indexOf(a),file.indexOf(b,file.indexOf(a)));
const rows=Array.from({length:416},(_,i)=>({label:'OJM26'+String(i+1).padStart(4,'0'),months:[i<300?'2026-01':'2026-11']}));
const ctx={idKey221:s=>String(s).trim().toUpperCase(),valid(){},frozen:false,owner:'fixture',scope:'local',OJM_SUPABASE_ANON_KEY:'fixture',settings:{},store:async()=>{},Date,ReceiptLinks208:{create:()=>({api:async(_,q)=>{calls++;const start=q.entriesAfter?250:0;return {rows:rows.slice(start,start+250).map(r=>({label:r.label,date:r.months[0]+'-01'})),entriesAfter:start?null:rows[249].label,linesAfter:null}}})}};
let calls=0;vm.createContext(ctx);vm.runInContext(code('let journalIndex369=', 'function bindBrowserStartIDs('),ctx);
(async()=>{
 const index=await ctx.journalIndex();assert.equal(index.rows.length,416);assert.equal(calls,2);await ctx.journalIndex();assert.equal(calls,2);
 for(const digits of ['1','0001','00001'])assert.equal(ctx.matchJournalIDs(index.rows,digits)[0].label,'OJM260001');
 assert.equal(ctx.matchJournalIDs(index.rows,'388','2026-11')[0].label,'OJM260388');assert.equal(ctx.matchJournalIDs(index.rows,'1','2026-11').some(x=>x.label==='OJM260001'),false);
 assert.equal(ctx.matchJournalIDs(index.rows,'').length,416);assert.equal(ctx.matchJournalIDs(index.rows,'0001','',new Set(['OJM260001'])).length,0);
 assert.equal(ctx.matchJournalIDs(index.rows,'0416')[0].label,'OJM260416');
 const linkctx={};vm.createContext(linkctx);vm.runInContext(fs.readFileSync('src/documents/scanner/links208.js','utf8'),linkctx);
 const handlers={},dialog={open:true,addEventListener:(key,fn)=>handlers[key]=fn,getBoundingClientRect:()=>({top:10,left:10,right:50,bottom:50}),close(){this.open=false;}};
 linkctx.ReceiptLinks208.dismissOnBackdrop(dialog);
 for(const x of [25,5]){const event={target:dialog,clientX:x,clientY:25};handlers.pointerdown(event);handlers.click(event);assert.equal(dialog.open,x===25);}
 console.log('PASS 416 IDs across pages, numeric search, early and late IDs, month filtering, active-draft exclusions and receipt dismissal.');
})().catch(e=>{console.error(e);process.exitCode=1});
