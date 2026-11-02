const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const settle=()=>new Promise(r=>setImmediate(r));
(async()=>{
const dom=new JSDOM('',{url:'https://example.test/Accounting/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
let now=Date.parse('2026-11-02T22:59:00Z'),calls=[],ticks=[];w.Date.now=()=>now;w.setInterval=f=>(ticks.push(f),0);w.liveProfile={id:'admin',role:'admin'};w.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};w.fetch=async(_,o)=>{calls.push(JSON.parse(o.body));return {ok:true,json:async()=>({unread:0,pending:0,latest:null})}};
w.eval(fs.readFileSync('src/integrations/hope/word-of-hope183.js','utf8'));await settle();assert.equal(calls.length,1);
for(let i=0;i<100;i++){ticks.forEach(f=>f());w.dispatchEvent(new w.Event('focus'));w.dispatchEvent(new w.Event('online'));}await settle();assert.equal(calls.length,1,'idle clock ticks and focus never repeat the daily read');
now=Date.parse('2026-11-02T23:00:00Z');ticks.forEach(f=>f());await settle();assert.equal(calls.length,2,'next daily read begins at 06:00 Laos');
now+=86400000-1;ticks.forEach(f=>f());await settle();assert.equal(calls.length,2);await w.WordOfHope183.refresh(true);assert.equal(calls.length,3,'explicit Refresh still works');dom.window.close();
const d=new JSDOM('',{url:'https://example.test',runScripts:'outside-only',pretendToBeVisual:true}),a=d.window;let n=0;
a.setInterval=()=>0;a.liveProfile={id:'admin',role:'admin'};a.access113={can:()=>true};a.ojmDb={auth:{getSession:async()=>({data:{session:{access_token:'fixture'}}})}};a.fetch=async()=>{n++;return {ok:true,json:async()=>({sheet:'fixture'})}};
a.eval(fs.readFileSync('src/integrations/google/inbox-sync143173.js','utf8'));for(const event of ['focus','online','page113'])a.dispatchEvent(new a.Event(event));a.document.dispatchEvent(new a.Event('visibilitychange'));await settle();assert.equal(n,0);await a.AIInboxSync143173.check(true);assert.equal(n,1);d.window.close();
console.log('PASS no automatic AI network checks; Word of Hope daily boundary at 06:00 Laos; focus/online deduplication and manual refresh');
})().catch(e=>{console.error(e);process.exitCode=1});
