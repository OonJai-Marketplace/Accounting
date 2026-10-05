/* Static application files only. No authentication, financial API data or uploads here. */
importScripts('offline-assets14239.js');
const VERSION='142.40',CACHE='ojm-accounting-shell-'+VERSION;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);try{for(let i=0;i<OJM_OFFLINE_ASSETS.length;i+=2)await cache.addAll(OJM_OFFLINE_ASSETS.slice(i,i+2));}catch(e){await caches.delete(CACHE);throw e}})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 const relative=u.pathname.slice(new URL(self.registration.scope).pathname.length)||'index.html';if(!OJM_OFFLINE_ASSETS.includes(relative))return;
 // A newer HTML release may ask for newer scripts: don't serve the previous version's code.
 if(/\.(js|css)$/.test(relative)&&u.searchParams.has('v')&&u.searchParams.get('v')!==VERSION)return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);if(r.mode==='navigate'){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);try{const response=await fetch(r,{signal:controller.signal});if(response.ok)return response;}catch{}finally{clearTimeout(timer)}}const saved=await cache.match(relative);return saved||fetch(r)})());
});
