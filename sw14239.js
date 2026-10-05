/* Static app files only. Financial records and authentication stay in account-scoped storage. */
importScripts('offline-assets14239.js');
const VERSION='142.41',CACHE='ojm-accounting-shell-'+VERSION;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  // Reuse the versioned files already loaded by the browser; keep downloads small.
  for(let i=0;i<OJM_OFFLINE_ASSETS.length;i+=2)await Promise.all(OJM_OFFLINE_ASSETS.slice(i,i+2).map(async asset=>{
   const url=new URL(asset,self.registration.scope);if(/\.(js|css)$/.test(asset))url.searchParams.set('v',VERSION);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
   try{const response=await fetch(url,{cache:'force-cache',signal:controller.signal});if(!response.ok)throw Error('Offline file could not download: '+asset);await cache.put(asset,response)}finally{clearTimeout(timer)}
  }));
  await self.skipWaiting();
 }catch(e){await caches.delete(CACHE);throw e}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'ojm-shell-ready',version:VERSION})})()));
self.addEventListener('message',event=>{if(event.data?.type==='ojm-shell-status')event.ports[0]?.postMessage({version:VERSION,ready:true})});
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url),scope=new URL(self.registration.scope);if(r.method!=='GET'||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 const relative=u.pathname.slice(scope.pathname.length)||'index.html';if(!OJM_OFFLINE_ASSETS.includes(relative))return;
 const requested=/\.(js|css)$/.test(relative)?u.searchParams.get('v'):null;
 event.respondWith((async()=>{
  // An open tab can finish using its previous release while the new one activates.
  const name=requested&&requested!==VERSION?'ojm-accounting-shell-'+requested:CACHE;
  const saved=await(await caches.open(name)).match(relative);
  if(r.mode==='navigate'){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);
   try{const response=await fetch(r,{signal:controller.signal});if(response.ok){const body=await response.arrayBuffer();return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers})}}catch{}finally{clearTimeout(timer)}
  }
  return saved||fetch(r);
 })());
});
