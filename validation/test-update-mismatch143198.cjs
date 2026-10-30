const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{MessageChannel}=require('node:worker_threads');
(async()=>{
 const version=JSON.parse(fs.readFileSync('data/release-notes.json')).version;
 let served='143.195',opened='',registrations=0;const elements={updateStatus:{},updateRetry:{hidden:true,addEventListener(type,fn){this.click=fn;}},updateProgress:{removeAttribute(){}},updateNotes:{replaceChildren(){}}};
 const worker={state:'activated',scriptURL:'https://fixture.invalid/desktop-sw14242.js?v='+version,postMessage(data,ports){ports[0].postMessage({ready:true,version:served});ports[0].close();}};
 const reg={active:worker,installing:null,waiting:null,addEventListener(){},removeEventListener(){},update:async()=>{}};
 const timers=new Set();const c={URL,MessageChannel,AbortController,Date,Promise,Error,setTimeout:(fn,ms)=>{const id=setTimeout(fn,ms);timers.add(id);return id},clearTimeout,setInterval:(fn,ms)=>{const id=setInterval(fn,ms);timers.add(id);return id},clearInterval,document:{getElementById:id=>elements[id]},navigator:{onLine:true,serviceWorker:{register:async()=>{registrations++;return reg},addEventListener(){}}},location:{href:'https://fixture.invalid/update.html',replace:url=>opened=url},fetch:async()=>({ok:true,json:async()=>({version,changes:[]})})};
 try{
  vm.runInNewContext(fs.readFileSync('src/core/sync/update14390.js','utf8'),c);
  for(let i=0;i<20&&!elements.updateRetry.hidden===false;i++)await new Promise(r=>setTimeout(r,5));
  await new Promise(r=>setTimeout(r,20));assert.match(elements.updateStatus.textContent,/release files do not match/);assert.ok(!/no connection|when connected/i.test(elements.updateStatus.textContent));assert.equal(opened,'');assert.equal(registrations,1);
  served=version;await elements.updateRetry.click();assert.equal(opened,'https://fixture.invalid/desktop.html?v='+version);assert.equal(elements.updateProgress.value,1);
  console.log('PASS online version mismatch gives publication error, no false connection diagnosis, manual retry activates matching release');
 }finally{for(const id of timers){clearTimeout(id);clearInterval(id);}}
})().catch(e=>{console.error(e);process.exitCode=1});
