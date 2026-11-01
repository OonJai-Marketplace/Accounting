const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function run(code,c){c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('src/shared/formatting/civil-date.js','utf8'),c);vm.runInContext(code,c);return c}
(async()=>{
 // Exercise the retained importer in the independent phone client. The old
 // embedded presentation was retired in v143.233; its device data must survive.
 const storage=()=>{const values=new Map();return {get length(){return values.size},key:i=>[...values.keys()][i],getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear()}};
 const local=storage(),sessionStore=storage(),scope='https://db.example',owner='a';let phoneStored={};
 const c=run(fs.readFileSync('src/subusers/phone/runtime/draft-persistence.js','utf8'),{scope,S:{actor:owner},localStorage:local,sessionStorage:sessionStore,mirrorKey:id=>'mirror:'+id,rules:()=>({directions:['out'],fundIds:['cash']}),today:()=> '2026-11-01',crypto:{randomUUID:()=> 'fixture'},fail:message=>Error(message),record:async(id,fn)=>{assert.equal(id,owner);phoneStored=fn(phoneStored);return phoneStored}});
 const legacy='ojm_phone_draft1427:'+scope+':'+owner;
 local.setItem(legacy,JSON.stringify({staff:{a:{data:{memo:'kept',single:[],lines:{}}},other:{data:{memo:'other account'}}},journal:{data:{memo:'main journal'}}}));
 const imported=await c.migrateLegacy(owner,{});assert.equal(imported.draft.memo,'kept');assert.equal(imported.legacyDraftImported,true);assert.equal(imported.draft.single.length,1);assert.equal(imported.draft.lines.length,2);assert.ok(local.getItem(legacy),'import must preserve old browser data');
 const existing={draft:{memo:'newer'}};assert.equal(await c.migrateLegacy(owner,existing),existing,'new draft wins');
 phoneStored={};local.setItem('mirror:'+owner,'{}');assert.equal(await c.migrateLegacy(owner,phoneStored),phoneStored,'unflushed current draft wins');local.removeItem('mirror:'+owner);
 c.S.actor='other';assert.equal(await c.migrateLegacy(owner,phoneStored),phoneStored,'never import another actor storage');c.S.actor=owner;
 local.setItem(legacy,'invalid json');assert.equal(await c.migrateLegacy(owner,phoneStored),phoneStored,'ignore unreadable presentation draft without erasing it');assert.equal(local.getItem(legacy),'invalid json');local.removeItem(legacy);
 const priorKey='ojm_staff_save14228:'+scope+':'+owner+':pending';
 const items=[{date:'2026-11-01',direction:'out',fund:'cash',account:'expense',amount:5,memo:'pending entry'}];
 const prior={p_owner:owner,p_key:'immutable-request',p_items:items,p_snapshot:{memo:'saved intent',components1437:items}};
 local.setItem(priorKey,JSON.stringify(prior));phoneStored=await c.migrateLegacy(owner,phoneStored);assert.equal(phoneStored.queue.length,1);assert.equal(phoneStored.queue[0].status,'uncertain');assert.equal(phoneStored.queue[0].draft.memo,'saved intent');assert.equal(phoneStored.queue[0].key,prior.p_key);assert.ok(local.getItem(priorKey));
 phoneStored=await c.migrateLegacy(owner,phoneStored);assert.equal(phoneStored.queue.length,1,'repeat import keeps one immutable request');
 local.setItem(priorKey,JSON.stringify({...prior,p_snapshot:{components1437:[]}}));await assert.rejects(c.migrateLegacy(owner,phoneStored),/incomplete/);assert.ok(local.getItem(priorKey),'malformed pending entry remains recoverable');
 console.log('PASS current phone imports own legacy drafts and immutable requests, preserves newer work, rejects incomplete requests, and retains source data');
 const lines=fs.readFileSync('src/bridges/subusers-bookkeeping/budget-workflow14316.js','utf8').split('\n');
 const functionCode=name=>lines.find(l=>l.startsWith('async function '+name+'(')||l.startsWith('function '+name+'('));
 let pages=0,confirm,dialog,errors=[];const button={dataset:{allocationTemplate14316:'501'}};
 const root={querySelectorAll:()=>[button],resolve108(){}};
 const templates=Array.from({length:502},(_,i)=>({id:String(i),data:{kind:'allocation14316',name:'Template '+i,allocations:[{account:'cash',currency:'USD',outflow:1,item:null}]}}));
 const b=run(functionCode('allocationTemplates'),{guard:()=> 'a',context:()=>()=>{},allocation:{},allocationRequest14370:1,capture(){},clone:structuredClone,Finance82:{lines:[],movements:[]},esc:String,num:Number,budgetDialog:(title,html)=>{dialog=html;return {root}},ui117:{confirm:()=>new Promise(r=>confirm=r)},renderAllocation(){},showCenterStatus:e=>errors.push(e),ojmDb:{from:()=>{let start,end;const q={select:()=>q,order:()=>q,range:(a,z)=>{start=a;end=z;return q},then:(yes,no)=>{pages++;return Promise.resolve({data:templates.slice(start,end+1)}).then(yes,no)}};return q}}});
 await b.allocationTemplates(false);assert.equal(pages,2);assert.match(dialog,/Template 501/);let pending=button.onclick();b.Finance82.notes='typed during confirmation';confirm(true);await pending;assert.equal(b.Finance82.movements.length,0);assert.match(errors.pop(),/allocation changed/);pending=button.onclick();confirm(true);await pending;assert.equal(b.Finance82.movements.length,1);assert.equal(b.Finance82.movements[0].reference,'');
 console.log('PASS allocation templates read all pages and preserve edits made during confirmation');
 const controls=[{disabled:false}],saved={id:'allocation',data:{purpose:'Saved allocation',movements:[],lines:[]}};let release;
 const s=run(functionCode('saveAllocation'),{context:()=>()=>{},allocationRecord:null,allocationRequest14370:1,finalTab:'funds',busy:false,form82:()=>true,capture(){},clone:structuredClone,Finance82:{purpose:'Original allocation',lines:[],movements:[],requestId14316:'request',requestVersion14316:1},validateAllocation(){},ensureLifecycle:async()=>{},live:async()=>{},liveProfile:{id:'a',full_name:'Admin'},document:{getElementById:()=>({querySelectorAll:()=>controls}),querySelector:()=>null},saveWork82:()=>new Promise(r=>release=r),showCenterStatus(){},renderAllocation:()=>{throw Error('Must not redraw an inactive allocation')}});
 const saving=s.saveAllocation(false);for(let i=0;i<10&&!release;i++)await Promise.resolve();assert.ok(release);s.Finance82={purpose:'New request draft'};release(saved);await saving;assert.equal(s.Finance82.purpose,'New request draft');assert.equal(s.allocation.purpose,'Saved allocation');assert.equal(controls[0].disabled,false);
 console.log('PASS allocation completion retains the newly opened request and stores the saved allocation separately');
 const v=run(functionCode('validateAllocation'),{validDate14317:()=>true,CurrencyStore:{currencies:[{code:'USD'}]},num:Number,financeTotals117:()=>({USD:{received:Infinity}})});assert.throws(()=>v.validateAllocation({date:'2026-10-01',lines:[],movements:[{account:'cash',reference:'test',currency:'USD',inflow:1,outflow:0}],conversions:[]},false),/supported amount range/);
 console.log('PASS overflowing allocation totals cannot be saved');
})().catch(e=>{console.error(e);process.exitCode=1});
