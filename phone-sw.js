/* Only the independent phone workspace is downloaded in this browser. */
const VERSION='143.13', CACHE='ojm-phone-shell-'+VERSION;
const FILES=['styles/controls14305.css?v=143.08','scripts/action-feedback14296.js?v=142.96.1','scripts/feedback-viewport14295.js?v=142.95','styles/feedback-viewport14295.css?v=142.96','assets/brand/oonjai-logo.png','styles/password-help14278.css?v=142.94','styles/loading1444.css?v=142.94','scripts/login-notifications14293.js?v=142.94','styles/login-notifications14293.css?v=142.94','scripts/loading1444.js?v=142.94','styles/functional-corrections14292.css?v=142.94','recovery.html','scripts/recovery14257.js?v=142.94','scripts/phone-reset-gate14257.js?v=142.57','scripts/numeric-caret14257.js?v=142.57','scripts/password-policy14257.js?v=142.94','index.html','phone.html','styles/phone14242.css?v=142.47','scripts/phone-runtime14242.js?v=143.13','assets/vendor/supabase.js?v=142.41','scripts/supabase-config.js?v=142.41','scripts/staff-entry14225.js?v=142.81'];
const OPTIONAL=['scripts/phone-tools14242.js?v=142.57','assets/logo.png'];
const scopeURL=new URL(self.registration.scope);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  for(let i=0;i<FILES.length;i+=2)await Promise.all(FILES.slice(i,i+2).map(async file=>{
   const u=new URL(file,scopeURL),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{const response=await fetch(u.href,{cache:/\.html$/.test(file)?'reload':'force-cache',signal:controller.signal});if(!response.ok)throw Error('Phone file did not finish downloading');const body=await response.arrayBuffer();await cache.put(u.href,new Response(body,{status:response.status,headers:response.headers}));}finally{clearTimeout(timer)}
  }));await self.skipWaiting();
 }catch(e){await caches.delete(CACHE);throw e}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'ojm-phone-ready',version:VERSION});})()));
self.addEventListener('message',event=>{if(event.data?.type==='ojm-phone-status')event.source?.postMessage({type:'ojm-phone-ready',version:VERSION});});
self.addEventListener('fetch',event=>{
 const request=event.request,u=new URL(request.url);if(request.method!=='GET'||u.origin!==scopeURL.origin||!u.pathname.startsWith(scopeURL.pathname))return;
 let path=u.pathname.slice(scopeURL.pathname.length)||'index.html';
 if(![...FILES,...OPTIONAL].some(f=>f.split('?')[0]===path))return;
 const file=[...FILES,...OPTIONAL].find(f=>f.split('?')[0]===path),cachedURL=new URL(file,scopeURL).href;
 if(/\.(js|css)$/.test(path)&&u.searchParams.get('v')!==new URL(cachedURL).searchParams.get('v'))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(cachedURL);if(saved)return saved;const response=await fetch(request);if(OPTIONAL.includes(file)&&response.ok){const body=await response.arrayBuffer(),complete=new Response(body,{status:response.status,headers:response.headers});await cache.put(cachedURL,complete.clone());return complete;}return response;})());
});

