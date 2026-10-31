const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{for(const name of ['phone-sw.js','desktop-sw14242.js']){
 const base='https://fixture.test/Accounting/',events={},stores=new Map(),downloads=[];let offline=false;
 const cached=n=>{if(!stores.has(n)){const records=new Map();stores.set(n,{match:async u=>records.get(u)?.clone(),put:async(u,v)=>records.set(u,v.clone())});}return stores.get(n);};
 const caches={open:async n=>cached(n),keys:async()=>[...stores.keys()],delete:async n=>stores.delete(n),match:async url=>{for(const c of stores.values()){const r=await c.match(url);if(r)return r;}}};
 const ctx={URL,Map,Set,Response,Request,AbortController,setTimeout,clearTimeout,Promise,Date,caches,self:{registration:{scope:base},addEventListener:(n,f)=>events[n]=f},fetch:async request=>{if(offline)throw Error('Offline');const url=String(request.url||request);downloads.push(url);return new Response('complete model bytes',{headers:{'Content-Type':'application/wasm'}});}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(name,'utf8'),ctx);
 const request=async path=>{let work;events.fetch({request:new Request(base+path),respondWith:p=>work=p});assert.ok(work,'worker handles lazy scanner asset');return work;};
 const model='assets/vendor/document-detector213/doccornernet_lean.ort',wasm='assets/vendor/document-detector213/ort-wasm-simd-threaded.wasm';
 let r=await request(model);assert.equal(await r.text(),'complete model bytes');assert.equal(downloads.length,1);offline=true;r=await request(model);assert.equal(await r.text(),'complete model bytes');assert.equal(downloads.length,1,'loaded model works offline');
 await cached('prior-release').put(base+wasm,new Response('previous immutable wasm'));r=await request(wasm);assert.equal(await r.text(),'previous immutable wasm','model assets survive shell upgrades offline');
 console.log('PASS',name,'lazy complete asset caching, offline reuse and reuse across app releases');
}})().catch(e=>{console.error(e);process.exitCode=1});
