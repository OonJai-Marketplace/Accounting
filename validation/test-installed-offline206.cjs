/* Local-only launch and offline-cache regression. No production API requests. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
function launch({worker='',query='',hash=''}={}){
 const location={href:'https://fixture.test/Accounting/'+query+hash,search:query,hash,replace(value){this.destination=value;}};
 const window={},navigator={serviceWorker:{controller:worker?{scriptURL:'https://fixture.test/Accounting/'+worker}:null}};
 for(const match of read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInNewContext(match[1],{location,window,navigator,URL,URLSearchParams});
 return new URL(location.destination);
}
function required(page){return [...read(page).matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].map(m=>m[1]).filter(s=>!s.startsWith('http'));}
async function checkWorker(worker,pages){
 const events={},stores=new Map(),scope='https://fixture.test/Accounting/';let online=true,network=0;
 const caches={open:async name=>{
  if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);
  return {match:async key=>store.get(String(key))?.clone(),put:async(key,response)=>store.set(String(key),response.clone())};
 },keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),match:async key=>{for(const store of stores.values()){const response=store.get(String(key));if(response)return response.clone();}}};
 const self={registration:{scope},addEventListener:(event,fn)=>events[event]=fn,clients:{claim:async()=>{},matchAll:async()=>[]},skipWaiting:async()=>{}};
 const ctx={self,caches,URL,Response,Blob,AbortController,Map,Promise,setTimeout,clearTimeout,fetch:async input=>{
  network++;if(!online)throw Error('Network unavailable');const url=new URL(String(input.url||input));assert.ok(fs.existsSync(url.pathname.slice('/Accounting/'.length)),url.href);return new Response(url.href);
 }};
 vm.runInNewContext(read(worker),ctx);let installation;events.install({waitUntil:p=>installation=p});await installation;online=false;const before=network;
 async function cached(path){let result;events.fetch({request:{method:'GET',url:scope+path,mode:path.endsWith('.html')?'navigate':'cors'},respondWith:p=>result=p});assert.ok(result,worker+' does not intercept '+path);return (await result).text();}
 for(const page of pages){assert.equal(await cached(page),scope+page);for(const asset of required(page))assert.equal(await cached(asset),scope+asset,page+' dependency '+asset);}
 assert.equal(await cached(''),scope+'index.html');
 assert.equal(network,before,'complete offline reopening must not fetch missing dependencies');
 let intercepted=false;events.fetch({request:{method:'GET',url:'https://database.test/rest/v1/accounts'},respondWith:()=>intercepted=true});assert.equal(intercepted,false,'database traffic is separate from app cache');
 console.log('PASS '+worker+': '+pages.length+' pages and every referenced script/style reopen without network');
}
(async()=>{
 for(const worker of ['phone-sw.js?v=143.206','phone-sw.js']){const url=launch({worker,query:'?from=installed',hash:'#home'});assert.equal(url.pathname,'/Accounting/phone.html');assert.equal(url.searchParams.get('staff'),'1');assert.equal(url.searchParams.get('from'),'installed');assert.equal(url.hash,'#home');}
 for(const worker of ['','desktop-sw14242.js?v=143.206'])assert.equal(launch({worker}).pathname,'/Accounting/desktop.html');
 assert.equal(launch({query:'?staff=1'}).pathname,'/Accounting/phone.html');
 for(const worker of ['phone-sw.js?v=143.206','desktop-sw14242.js?v=143.206']){const u=launch({worker,query:'?password-recovery=1',hash:'#type=recovery'});assert.equal(u.pathname,'/Accounting/recovery.html');assert.equal(u.hash,'#type=recovery');}
 assert.match(read('scan.html'),/href="index.html" aria-label="Back to Accounting"/);
 assert.match(read('src/documents/scanner/scanner202.js'),/href="index.html">Open Accounting sign-in/);
 await checkWorker('phone-sw.js',['index.html','phone.html','scan.html','recovery.html']);
 await checkWorker('desktop-sw14242.js',['index.html','desktop.html','phone.html','phone-accounting.html','scan.html','recovery.html']);
 console.log('PASS installed staff/main routing, scanner return, explicit staff links, recovery parameters, and shared manifest identity');
})().catch(error=>{console.error(error);process.exitCode=1;});
