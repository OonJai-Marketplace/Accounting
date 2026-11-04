/* Account typing must not copy/encrypt the open payroll/workspace on each key. */
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/subusers/entries/drafts1427.js','utf8');
const prefix='ojm_unsaved1427:https://account.test:',key=prefix+'admin',small=key+':account-forms272';
const accountEntry=name=>({id:'formAccount',panel:'',record:'',fields:{'#accName':name}});
const html='<section class="tab-content active" id="accounts"></section><div class="modal-backdrop" id="modalAccount"><form id="formAccount"><input id="accCode"><input id="accName"><select id="accCurrency"><option>LAK</option><option>USD</option></select></form></div><div class="modal-backdrop" id="modalSubAccount"><form id="formSubAccount"><input id="subName"></form></div><section class="tab-content" id="payroll-entries"><form id="runMeta95"><input id="payAmount"></form></section><button id="outside">Outside</button>';
async function fixture(initial,script=source){
 const dom=new JSDOM(html,{url:'https://account.test',runScripts:'outside-only'}),w=dom.window;
 await new Promise(resolve=>w.document.readyState==='loading'?w.document.addEventListener('DOMContentLoaded',resolve,{once:true}):resolve());
 const store=initial||new Map([[key,JSON.stringify({forms:{'modalAccount|formAccount|':accountEntry('Recovered account')},run:{run:{status:'draft',month:'2026-11',rows:Array.from({length:1500},(_,i)=>({id:i,note:'payroll recovery '.repeat(30)}))},record:{id:'run'}},workspace:{pending:{admin:[{memo:'Existing pending entry'}]},edits:{}}})]]);
 const writes=[],warnings=[],timers=new Map();let cloneCalls=0,modelReads=0,fail=false,nextTimer=0;
 Object.defineProperty(w,'localStorage',{value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('Quota');writes.push({key:k,bytes:Buffer.byteLength(v)});store.set(k,String(v));}}});
 w.setTimeout=fn=>{const id=++nextTimer;timers.set(id,fn);return id};w.clearTimeout=id=>timers.delete(id);w.requestAnimationFrame=()=>0;
 w.structuredClone=v=>{cloneCalls++;return structuredClone(v)};w.liveProfile={id:'admin'};w.Work82={owner:'admin'};w.workspacePendingRows={};w.workspaceRowEdits={};
 w.payroll95={draftState1427:()=>{modelReads++;return {open:{}}},restoreDraftState1427:()=>{}};
 w.showCenterStatus=(...args)=>warnings.push(args);for(const name of ['renderWork82','hydrateSupabaseSession','logoutDemoUser','switchTab','saveWork82','resetJournalLinesForm','saveSettingsGroup','openEmployee82'])w[name]=()=>{};
 w.eval(script);const d=w.document;
 const resetCounts=()=>{writes.length=0;cloneCalls=0;modelReads=0};resetCounts();
 return {dom,w,d,store,writes,warnings,timers,resetCounts,setFail:v=>fail=v,get clones(){return cloneCalls},get modelReads(){return modelReads},edit:(id,value,type='input')=>{const n=d.getElementById(id);n.value=value;n.dispatchEvent(new w.Event(type,{bubbles:true}));},settle:async()=>{await Promise.resolve();await Promise.resolve()},idle:()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn()}},saved:()=>JSON.parse(store.get(small)||'null'),close:()=>dom.window.close()};
}
module.exports={fixture,key,prefix};
if(require.main===module)(async()=>{
 let f=await fixture();assert.equal(f.d.getElementById('accName').value,'Recovered account','legacy account drafts still recover');
 const originalPayroll=f.store.get(key);for(let i=1;i<=40;i++)f.edit('accName','Account '+i);f.edit('accCurrency','USD');f.edit('accCurrency','USD','change');await f.settle();
 assert.equal(f.writes.length,0,'typing and choosing a currency do not write storage synchronously');assert.equal(f.clones,0,'account typing never clones other module drafts');assert.equal(f.modelReads,0);assert.equal(f.timers.size,1);
 f.idle();assert.equal(f.writes.length,1,'one small write after a typing burst');assert.equal(f.writes[0].key,small);assert(f.writes[0].bytes<2000);assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Account 40');assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accCurrency'],'USD');assert.equal(f.store.get(key),originalPayroll,'payroll and workspace recovery remain byte-identical');
 const retained=new Map(f.store);f.close();f=await fixture(retained);assert.equal(f.d.getElementById('accName').value,'Account 40');assert.equal(f.d.getElementById('accCurrency').value,'USD');assert.equal(f.w.Work82.run.rows.length,1500);
 f.edit('accName','Latest before leaving');f.d.getElementById('accName').dispatchEvent(new f.w.FocusEvent('focusout',{bubbles:true,relatedTarget:f.d.getElementById('accCode')}));assert.equal(f.writes.length,0,'moving within the form does not force a write');
 f.d.getElementById('accCode').dispatchEvent(new f.w.FocusEvent('focusout',{bubbles:true,relatedTarget:f.d.getElementById('outside')}));assert.equal(f.writes.length,1);assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Latest before leaving');
 f.resetCounts();f.edit('accName','Latest before save');f.d.getElementById('formAccount').dispatchEvent(new f.w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(f.writes.length,1);assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Latest before save');
 f.edit('accName','Must not return after reset');f.d.getElementById('formAccount').reset();f.idle();assert.equal(Object.keys(f.saved().forms).length,0);const cleared=new Map(f.store);f.close();f=await fixture(cleared);assert.equal(f.d.getElementById('accName').value,'','an empty account copy suppresses stale legacy fields');
 f.edit('subName','Child account');await f.settle();f.idle();assert.equal(f.saved().forms['modalSubAccount|formSubAccount|'].fields['#subName'],'Child account');
 f.resetCounts();f.edit('accName','Leaving immediately');f.w.dispatchEvent(new f.w.Event('pagehide'));assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Leaving immediately');assert.equal(f.timers.size,0);
 f.resetCounts();f.edit('payAmount','250');await f.settle();assert.equal(f.writes.length,0);f.idle();assert(f.clones>0&&f.modelReads>0,'payroll edits retain their model snapshots');assert(f.writes.some(x=>x.key===key));
 f.resetCounts();f.edit('accName','Pending before navigation');f.w.switchTab('accounts');assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Pending before navigation');
 f.resetCounts();f.edit('accName','Pending old user');f.w.liveProfile={id:'other'};f.idle();assert.equal(f.writes.length,0,'pending timer cannot write after actor changes');f.w.drafts1427.restore();f.edit('accName','Other user');f.idle();assert.equal(JSON.parse(f.store.get(prefix+'other:account-forms272')).forms['modalAccount|formAccount|'].fields['#accName'],'Other user');assert.notEqual(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Other user');f.close();
 f=await fixture();f.setFail(true);f.edit('accName','Storage retry');f.idle();assert.equal(f.warnings.length,1);f.w.drafts1427.flush();assert.equal(f.warnings.length,1,'failed recovery write warns once');f.setFail(false);f.w.drafts1427.flush();assert.equal(f.saved().forms['modalAccount|formAccount|'].fields['#accName'],'Storage retry');f.close();
 const baseline=process.env.ACCOUNT_DRAFT_BASELINE;if(baseline){f=await fixture(undefined,fs.readFileSync(baseline,'utf8'));for(let i=1;i<=40;i++)f.edit('accName','Account '+i);await f.settle();console.log(JSON.stringify({baselineKeystrokes:40,writes:f.writes.length,bytes:f.writes.reduce((n,x)=>n+x.bytes,0),modelClones:f.clones,modelReads:f.modelReads}));f.close()}
 console.log('PASS account typing/dropdown batching, bounded recovery writes, legacy recovery, leave/submit/reset/navigation/pagehide, account isolation, storage retry and payroll preservation');
})().catch(e=>{console.error(e);process.exitCode=1});
