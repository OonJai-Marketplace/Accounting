const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('desktop-sw14242.js','utf8').replace(/const FILES=\[[\s\S]*?\n\];/,"const FILES=['ready.js?v=1','blocked.js?v=1'];");
async function scenario(kind){
 const events={},messages=[],saved=new Map(),scope='https://fixture.test/Accounting/';let activated=false,attempts=0;
 const cache={match:async url=>saved.get(url)?.clone(),put:async(url,response)=>{
  if(url.includes('blocked')&&kind==='storage')return new Promise(()=>{});
  if(url.includes('blocked')&&kind==='quota')throw new DOMException('full','QuotaExceededError');
  saved.set(url,new Response(await response.arrayBuffer()));
 }};
 const context={URL,Map,Response,Blob,AbortController,Date,Promise,Error,console,
  setTimeout:(fn,ms)=>setTimeout(fn,ms>=30000?30:1),clearTimeout,
  caches:{open:async()=>cache,keys:async()=>[],match:async()=>null,delete:()=>{throw Error('Must not delete release caches')}},
  self:{registration:{scope},addEventListener:(type,fn)=>events[type]=fn,
   clients:{matchAll:async()=>[{url:scope+'update.html',postMessage:m=>messages.push({...m})}]},skipWaiting:async()=>{activated=true}},
  fetch:async(url,{signal})=>{
   if(!url.includes('blocked'))return new Response('ready');attempts++;
   if(kind==='network')return new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1]));signal.addEventListener('abort',()=>controller.error(new DOMException('timeout','AbortError')));}}));
   return new Response('complete');
  }
 };
 vm.runInNewContext(source,context);let installation;
 events.install({waitUntil:p=>installation=p});await assert.rejects(installation);
 assert.equal(activated,false,'incomplete release never activates');
 assert.ok(saved.has(scope+'ready.js?v=1'),'completed file remains resumable');
 assert.equal(attempts,kind==='quota'?1:3);
 const failure=messages.find(m=>m.type==='ojm-shell-error');assert.ok(failure);
 assert.match(failure.message,kind==='quota'?/insufficient browser storage/:/Completed files are saved/);
 assert.equal(failure.file,'blocked.js');
}
async function reuseAtQuota(){
 const scope='https://fixture.test/Accounting/',events={},writes=[],reads=[];
 const previous='ojm-desktop-shell-143.383',unrelated='other-workspace';
 const contents=new Map([['ready.js?v=1','ready'],['blocked.js?v=1','blocked']]);
 const cache={match:async()=>undefined,put:async url=>{writes.push(url);throw new DOMException('full','QuotaExceededError')}};
 const context={URL,Response,Blob,AbortController,Date,Promise,Error,console,setTimeout,clearTimeout,
  caches:{open:async()=>cache,keys:async()=>[unrelated,previous],match:async(url,{cacheName})=>{
   reads.push(cacheName);const text=contents.get(url.replace(scope,''));if(cacheName===previous&&text)return new Response(text);
  }},
  self:{registration:{scope},addEventListener:(type,fn)=>events[type]=fn,clients:{matchAll:async()=>[]},skipWaiting:async()=>{}},
  fetch:async()=>{throw Error('An existing exact version must load offline')}
 };
 vm.runInNewContext(source,context);let installing;
 events.install({waitUntil:p=>installing=p});await installing;
 for(const [path,expected] of contents){
  let response;events.fetch({request:{method:'GET',url:scope+path},respondWith:p=>response=p});
  assert.equal(await (await response).text(),expected);
 }
 assert.deepEqual(writes,[]);assert(reads.length>=4&&reads.every(name=>name===previous));
}
(async()=>{for(const kind of ['network','storage','quota'])await scenario(kind);await reuseAtQuota();console.log('PASS bounded network/storage retries, incomplete release isolation and offline reuse of exact-version desktop files at quota');})().catch(e=>{console.error(e);process.exit(1)});
