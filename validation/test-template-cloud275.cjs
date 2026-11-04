const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const key='ojm_transaction_templates_v1',server=new Map();let fail=false,afterRead=null,afterWrite=null;
const copy=x=>x===undefined?undefined:structuredClone(x);
function client(){return {from:()=>{let op='read',value,filters={};const q={select:()=>q,eq:(k,v)=>(filters[k]=v,q),update:v=>(op='update',value=v,q),insert:v=>(op='insert',value=v,q),maybeSingle:async()=>{
 if(fail)return {error:{message:'Network unavailable'}};
 const owner=filters.owner_id||value.owner_id,old=server.get(owner);
 if(op==='read'){const data=copy(old)||null;if(afterRead){const f=afterRead;afterRead=null;await f();}return {data};}
 if(op==='insert'&&old)return {error:{message:'Duplicate owner'}};
 if(op==='update'&&filters.version!==old?.version)return {data:null};
 const data={...copy(value),updated_at:'2026-11-04T06:00:00Z'};server.set(owner,data);
 if(afterWrite){const f=afterWrite;afterWrite=null;await f();}return {data:copy(data)};
 }};return q;}};}
const tpl=(id,name)=>({id,name,lines:[{accountId:'a',side:'debit',memo:'Kept'},{accountId:'b',side:'credit'}]});
function device(owner='a'){
 const dom=new JSDOM('<div id="templateManagerList"></div>',{url:'https://fixture.test',runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{structuredClone,liveProfile:{id:owner},deviceVault14334:{actor:owner,unlocked:true},ojmDb:client(),AccountingStore:{accounts:[]},JournalFX14383:{templates:()=>[]},showAppNotification:()=>{},ui117:{confirm:async()=>true},escapeHtml:String});
 w.eval(fs.readFileSync('src/bookkeeping/templates/transaction-templates.js','utf8')+'\nwindow.store=TemplateStore;\n'+fs.readFileSync('src/bookkeeping/templates/template-cloud275.js','utf8'));
 w.store.load();return {w,close:()=>w.close(),cloud:w.TemplateCloud275,store:w.store};
}
async function save(d,items){d.store.templates=copy(items);await d.w.ensureTemplateNumbers143125();await d.store.save();}
(async()=>{
 const a=device(),b=device();await save(a,[tpl('one','Original')]);assert(await a.cloud.sync());assert.equal(server.get('a').version,1);assert(await b.cloud.sync());assert.equal(b.store.templates[0].name,'Original');assert.equal(b.cloud.snapshot().numbers.ids.one,1);
 await save(a,[tpl('one','First device'),tpl('two','Second template')]);await a.cloud.sync();await save(b,[{...tpl('one','Original'),lines:[{accountId:'a',side:'credit'}]}]);assert.equal(await b.cloud.sync(),false);assert.match(b.cloud.status(),/two devices/);assert.equal(server.get('a').data.templates[0].name,'First device','conflict never overwrites cloud');
 // Explicit conflict choice retains a disjoint remote addition.
 const local=b.cloud.snapshot(),remote=copy(server.get('a').data);assert(await b.cloud.sync({choices:{one:'device'},expected:{local,server:remote}}));assert.equal(b.store.templates.length,2);assert.equal(b.store.templates[0].lines[0].side,'credit');
 await a.cloud.sync();await save(a,[...a.store.templates,{id:'three',name:'Offline copy',lines:[]}]);fail=true;assert.equal(await a.cloud.sync(),false);assert(a.cloud.snapshot().templates.some(t=>t.id==='three'));fail=false;assert(await a.cloud.sync());assert(await b.cloud.sync());assert.equal(b.store.templates.length,3);
 // Lost write response is reconciled by reading the matching server revision.
 await save(a,a.store.templates.map(t=>t.id==='three'?{...t,name:'Lost response'}:t));afterWrite=async()=>{throw Error('Lost response')};assert.equal(await a.cloud.sync(),false);assert(await a.cloud.sync());assert.equal(server.get('a').version,5);
 // A change in another local tab while reading stays local and pending.
 afterRead=async()=>{const items=JSON.parse(a.w.localStorage.getItem(key));items[0].name='New tab';a.w.localStorage.setItem(key,JSON.stringify(items));};assert.equal(await a.cloud.sync(),false);assert.equal(JSON.parse(a.w.localStorage.getItem(key))[0].name,'New tab');assert(await a.cloud.sync());
 // Account change during a cloud read cannot install another account's copy.
 const c=device();afterRead=async()=>{c.w.liveProfile={id:'b'};c.w.deviceVault14334.actor='b';c.w.localStorage.clear();};assert.equal(await c.cloud.sync(),false);assert.equal(c.w.localStorage.getItem(key),null);
 // Server revision changes between read and write preserve pending device work.
 await save(a,a.store.templates.map(t=>t.id==='three'?{...t,name:'CAS pending'}:t));afterRead=async()=>{server.get('a').version++;};assert.equal(await a.cloud.sync(),false);assert.match(a.cloud.status(),/pending/);assert(await a.cloud.sync());
 const empty={templates:[],numbers:{next:1,ids:{}}};const x={templates:[tpl('x','X')],numbers:{next:2,ids:{x:1}}},y={templates:[tpl('y','Y')],numbers:{next:2,ids:{y:1}}};assert(a.cloud.merge(empty,x,y).numberConflict,'number collisions never renumber silently');
 const before=copy(a.cloud.snapshot());await save(a,a.store.templates.map(t=>t.id==='three'?{id:t.id,deleted:true}:t));await a.cloud.sync();await b.cloud.sync();assert(b.store.templates.find(t=>t.id==='three').deleted,'deletions sync as retained tombstones');assert.equal(b.cloud.snapshot().numbers.ids.three,before.numbers.ids.three);
 assert.throws(()=>a.cloud.validate({templates:[],numbers:{next:3,ids:{x:1,y:1}}}),/duplicate/);
 a.w.localStorage.setItem(key+':previous274',JSON.stringify(before.templates));a.cloud.recover();assert.match(a.w.document.body.textContent,/Restore this version/);await a.cloud.restoreOne(before.templates.find(t=>t.id==='three'));assert.equal(a.store.templates.find(t=>t.id==='three').deleted,false);assert.equal(a.cloud.snapshot().numbers.ids.three,before.numbers.ids.three);await a.cloud.sync();
 a.w.localStorage.setItem(key,'{damaged');assert.equal(await a.cloud.sync(),false);await a.w.renderTemplateManager();assert.match(a.w.document.body.textContent,/Restore verified cloud copy/);assert(await a.cloud.restoreCloud());assert.equal(JSON.parse(a.w.localStorage.getItem(key+':damaged275')).templates,'{damaged');assert.equal(a.store.templates.length,3);
 const recovered=device('recovery');recovered.w.localStorage.setItem(key,JSON.stringify([{id:'tpl-deleted',deleted:true}]));recovered.w.localStorage.setItem(key+':numbers143125',JSON.stringify({next:4,ids:{'tpl-retained':1,'tpl-absent':2,'tpl-deleted':3}}));recovered.w.localStorage.setItem(key+':previous274',JSON.stringify([tpl('tpl-retained','Retained original'),tpl('tpl-deleted','Do not resurrect')]));assert(await recovered.cloud.sync());assert.equal(recovered.store.templates.find(t=>t.id==='tpl-retained').name,'Retained original');assert.equal(recovered.cloud.snapshot().numbers.ids['tpl-retained'],1);assert(recovered.store.templates.find(t=>t.id==='tpl-deleted').deleted);assert.equal(recovered.cloud.missingContent().length,1);assert.match(recovered.cloud.status(),/no saved content/);recovered.close();
 a.w.deviceVault14334.unlocked=false;assert.equal(await a.cloud.sync(),false);
 [a,b,c].forEach(d=>d.close());console.log('PASS cloud recovery, offline save/retry, lost response, stale tabs, CAS conflicts, owner changes, tombstones, stable numbers and explicit recovery.');
})().catch(e=>{console.error(e);process.exit(1)});
