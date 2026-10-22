const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let resolveLoad,resolveArchive,removed=false,scrolled=false,viewChanges=[],archiveCalls=0;
const list={innerHTML:''},card={dataset:{draft:'draft-001'},remove(){removed=true}},nodes={
 journal:{classList:{contains:()=>true}},jeSearchInput:{value:'old search'},
 tblJournalHistory:{closest:()=>({scrollIntoView(){scrolled=true}})}
};
const ctx={console,Set,Map,Promise,location:{origin:'test'},navigator:{onLine:true},liveProfile:{id:'owner'},ojmDb:{},localStorage:{getItem:()=>null},
 document:{readyState:'loading',addEventListener(){},getElementById:id=>nodes[id]},requestAnimationFrame:fn=>fn(),
 showCenterStatus(){},loadJournalFromSupabase:()=>new Promise(r=>resolveLoad=r),
 window:{access113:{can:()=>true},switchTab:x=>viewChanges.push(x),groupedNavigation14378:{render(){}},yearWindow14333:{invalidateMemory(){}}}};
vm.createContext(ctx);
let source=fs.readFileSync('src/bookkeeping/journal/drive-drafts143128.js','utf8');
source=source.replace("window.DriveDrafts143128={",`window.testApi={completePrepared,queueArchive,refreshPostedJournal,context,completedDrafts,reviewed,setup(){panel={querySelector:s=>s==='[data-drive-list]'?list:null,querySelectorAll:()=>[card]};renderPreparation=()=>{};persistPreparation=()=>{};choose=v=>{view=v};archivePostedDraft=()=>{archiveCalls++;return new Promise(r=>resolveArchive=r)};},get busy(){return busy}};window.DriveDrafts143128={`);
Object.assign(ctx,{list,card,get archiveCalls(){return archiveCalls}});ctx.archiveCalls=0;
vm.runInContext(source,ctx);const api=ctx.window.testApi;api.setup();
const c=api.context(),edit={id:'draft-001',card,context:c};api.reviewed.set(edit.id,{});
assert.throws(()=>api.completePrepared([edit],new Map([[edit.id,[]]])),/confirmation incomplete/);assert.equal(removed,false);
api.completePrepared([edit],new Map([[edit.id,[{entry_id:'entry-1',entry_no:'OJM-1'}]]]));
assert.equal(removed,true);assert.equal(api.reviewed.size,0);assert.equal(api.completedDrafts.has(edit.id),true);
assert.equal(nodes.jeSearchInput.value,'');assert.equal(scrolled,true);assert.deepEqual(viewChanges,['journal']);

(async()=>{await new Promise(r=>setImmediate(r));assert.equal(typeof resolveLoad,'function');assert.equal(typeof ctx.resolveArchive,'function');
 // A duplicate archive request shares the same job, while the UI is already usable.
 const a=api.queueArchive(edit.id,'OJM-1',c),b=api.queueArchive(edit.id,'OJM-1',c);assert.equal(a,b);assert.equal(ctx.archiveCalls,1);
 resolveLoad();ctx.resolveArchive();await a;
 console.log('Post transition: confirmed removal/navigation before slow journal load and archive; invalid receipts retained; archive deduplicated.');
})().catch(e=>{console.error(e);process.exitCode=1});
