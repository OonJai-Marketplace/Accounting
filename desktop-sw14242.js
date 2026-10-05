/* Static app files only. Financial records and authentication stay in account-scoped storage. */
importScripts('offline-assets14239.js');
OJM_OFFLINE_ASSETS=[...OJM_OFFLINE_ASSETS,'desktop.html'];
const VERSION='142.47',STATIC_VERSION='142.47',CACHE='ojm-accounting-shell-'+STATIC_VERSION;
const PHONE_ASSETS14250=['scripts/phone-connected.js','scripts/desktop14245-6.js','styles/phone-design14248.css'];
const PHONE_ASSETS14249=['scripts/phone-connected.js','scripts/phone-account-picker14227.js'];
const PHONE_ASSETS14248=['scripts/phone-connected.js','scripts/phone-data14248.js','styles/phone-design14248.css'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  // Keep the old entry point until both new HTML pages and their worker loader exist.
  const critical=['desktop.html','scripts/offline14239.js','index.html'];
  const complete=await Promise.all(critical.map(async asset=>{const url=new URL(asset,self.registration.scope);if(asset.endsWith('.js'))url.searchParams.set('v',VERSION);const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{cache:'reload',signal:controller.signal});if(!response.ok)throw Error('Offline entry point did not finish');const body=await response.arrayBuffer();return {asset,response:new Response(body,{status:response.status,headers:response.headers})};}finally{clearTimeout(timer)}}));
  for(const item of complete)await cache.put(item.asset,item.response);
  // Reuse the versioned files already loaded by the browser; keep downloads small.
  for(let i=0;i<OJM_OFFLINE_ASSETS.length;i+=2)await Promise.all(OJM_OFFLINE_ASSETS.slice(i,i+2).map(async asset=>{
   if(critical.includes(asset))return;
   const url=new URL(asset,self.registration.scope);if(/\.(js|css)$/.test(asset))url.searchParams.set('v',PHONE_ASSETS14250.includes(asset)?'142.50':PHONE_ASSETS14249.includes(asset)?'142.49':PHONE_ASSETS14248.includes(asset)?'142.48':STATIC_VERSION);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{if(await cache.match(asset)&&asset!=='phone-accounting.html'&&!PHONE_ASSETS14248.includes(asset)&&!PHONE_ASSETS14249.includes(asset)&&!PHONE_ASSETS14250.includes(asset))return;const response=await fetch(url,{cache:'force-cache',signal:controller.signal});if(!response.ok)throw Error('Offline file could not download: '+asset);await cache.put(asset,response.clone());if(PHONE_ASSETS14250.includes(asset))await(await caches.open('ojm-accounting-shell-142.50')).put(asset,response.clone());if(PHONE_ASSETS14249.includes(asset))await(await caches.open('ojm-accounting-shell-142.49')).put(asset,response.clone());if(PHONE_ASSETS14248.includes(asset))await(await caches.open('ojm-accounting-shell-142.48')).put(asset,response)}finally{clearTimeout(timer)}
  }));
  await self.skipWaiting();
 }catch(e){throw e}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'ojm-shell-ready',version:VERSION})})()));
self.addEventListener('message',event=>{if(event.data?.type==='ojm-shell-status')event.ports[0]?.postMessage({version:VERSION,ready:true})});
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url),scope=new URL(self.registration.scope);if(r.method!=='GET'||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const relative=u.pathname.slice(scope.pathname.length)||'index.html';if(!OJM_OFFLINE_ASSETS.includes(relative))return;
 const requested=/\.(js|css)$/.test(relative)?u.searchParams.get('v'):null;
 event.respondWith((async()=>{
  // An open tab can finish using its previous release while the new one activates.
  const name=requested&&requested!==STATIC_VERSION&&!(relative==='scripts/offline14239.js'&&requested===VERSION)?'ojm-accounting-shell-'+requested:CACHE;
  const saved=await(await caches.open(name)).match(relative);
  if(r.mode==='navigate'){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
   try{const response=await fetch(r,{signal:controller.signal});if(response.ok){const body=await response.arrayBuffer();const complete=new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});if(relative==='phone-accounting.html')await(await caches.open(CACHE)).put(relative,complete.clone());return complete}}catch{}finally{clearTimeout(timer)}
  }
  if(saved)return saved;const response=await fetch(r);if(response.ok&&[...PHONE_ASSETS14248,...PHONE_ASSETS14249,...PHONE_ASSETS14250].includes(relative)){const bytes=await response.arrayBuffer(),complete=new Response(bytes,{status:response.status,headers:response.headers});await(await caches.open(name)).put(relative,complete.clone());return complete;}return response;
 })());
});
