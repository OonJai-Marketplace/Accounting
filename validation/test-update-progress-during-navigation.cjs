const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('desktop-sw14242.js','utf8');
const events = {};
const scope = 'https://example.test/Accounting/';
const cached = new Map();
const messages = [];
let releaseSlowFile;
const slowFile = new Promise(resolve => { releaseSlowFile = resolve; });
let releaseClients;
const clientList = new Promise(resolve => { releaseClients = resolve; });
const client = {url:scope+'update.html',postMessage: data => messages.push(data)};
const cache = {
  match: async url => cached.get(url)?.clone(),
  put: async (url,response) => cached.set(url,response.clone())
};
const context = {
  URL, Response, Blob, AbortController, setTimeout, clearTimeout,
  caches:{open:async()=>cache, keys:async()=>[]},
  self:{
    registration:{scope}, clients:{matchAll:()=>clientList,claim:async()=>{}},
    addEventListener:(type,fn)=>{events[type]=fn;}, skipWaiting:async()=>{}
  },
  fetch:async url=>{
    if(new URL(url).pathname.endsWith('/docs/protocols/index.html'))await slowFile;
    return new Response('complete offline file');
  }
};

(async()=>{
  vm.runInNewContext(source,context);
  let installation;
  events.install({waitUntil:promise=>{installation=promise;}});
  try{
    await new Promise(resolve=>setTimeout(resolve,100));
    let status;
    events.message({data:{type:'ojm-shell-status'},ports:[{postMessage:value=>{status=value;}}]});
    assert.equal(status.progress.total,vm.runInNewContext('FILES.length',context));
    assert.ok(status.progress.completed>2,'the first Update visit must progress while browser clients are unavailable');
    assert.equal(messages.length,0);
  }finally{
    releaseClients([client]);
    releaseSlowFile();
    await installation;
  }
  const stats=vm.runInNewContext('downloadState',context);
  assert.equal(stats.completed,stats.total);
  assert.equal(cached.size,vm.runInNewContext('new Set(FILES).size',context));
  console.log('PASS desktop files advance and complete while progress delivery is held on first navigation');
})().catch(e=>{console.error(e);process.exitCode=1;});
