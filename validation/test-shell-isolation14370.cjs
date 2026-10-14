'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('desktop-sw14242.js','utf8');
function fixture(fail=false){
 const scope='https://fixture.test/accounting/',events={},stores=new Map(),writes=[],requests=[];let activated=false;
 const caches={keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name),open:async name=>{if(!stores.has(name))stores.set(name,new Map());return {match:async key=>stores.get(name)?.get(String(key))?.clone(),put:async(key,value)=>{writes.push(name);stores.get(name).set(String(key),value.clone())}}}};
 const c={URL,Response,AbortController,Map,Promise,setTimeout,clearTimeout,caches,fetch:async input=>{const url=String(input.url||input);requests.push(url);if(fail&&url.includes('deployment-config.js'))throw Error('download interrupted');return new Response('new '+url)},registration:{scope},addEventListener:(type,fn)=>events[type]=fn,skipWaiting:async()=>{activated=true},clients:{claim:async()=>{},matchAll:async()=>[]}};c.self=c;vm.createContext(c);vm.runInContext(source,c);
 return {c,caches,stores,writes,requests,events,scope,activated:()=>activated,install:()=>{let result;events.install({waitUntil:p=>result=p});return result},read:async(path,mode='cors')=>{let result;events.fetch({request:{url:scope+path,method:'GET',mode},respondWith:p=>result=p});return result}};
}
(async()=>{
 const broken=fixture(true),old=await broken.caches.open('ojm-accounting-shell-143.69');await old.put(broken.scope+'scripts/desktop14245-3.js',new Response('old release'));
 await assert.rejects(broken.install(),/interrupted/);assert.equal(broken.activated(),false);assert.equal(broken.stores.has('ojm-desktop-shell-143.70'),false);assert.equal(await(await old.match(broken.scope+'scripts/desktop14245-3.js')).text(),'old release');
 const f=fixture(),prior=await f.caches.open('ojm-accounting-shell-100');await prior.put(f.scope+'scripts/desktop14245-3.js',new Response('version 100'));f.writes.length=0;
 await f.install();assert(f.activated());assert(f.writes.every(name=>name==='ojm-desktop-shell-143.70'));
 const before=f.requests.length;assert.match(await(await f.read('desktop.html','navigate')).text(),/desktop.html/);assert.equal(f.requests.length,before,'cached navigation must not wait for network');
 assert.equal(await(await f.read('scripts/desktop14245-3.js?v=100')).text(),'version 100');assert.equal(f.requests.length,before);assert.equal(await f.read('../private'),undefined);assert.equal(await f.read('not-an-asset.json'),undefined);
 const version=vm.runInContext("new URL(paths.get('scripts/desktop14245-3.js'),'https://fixture.test/accounting/').searchParams.get('v')",f.c);
 assert.match(await(await f.read('scripts/desktop14245-3.js?v='+version)).text(),/new /);assert.equal(f.requests.length,before);
 console.log('PASS interrupted installation preserves old release; only new cache is written; cached navigation is immediate; explicit old asset versions remain isolated');
})().catch(e=>{console.error(e);process.exitCode=1});
