/* Only the independent phone workspace is downloaded in this browser. */
const VERSION='143.344', CACHE='ojm-phone-shell-'+VERSION;
const FILES=[
 "docs/protocols/index.html?v=143.338",
 "docs/protocols/Oon-Jai-Accounting-Protocols.pdf?v=143.316",
 "docs/protocols/topics/C01.pdf?v=143.316",
 "docs/protocols/topics/C02.pdf?v=143.316",
 "docs/protocols/topics/C03.pdf?v=143.316",
 "docs/protocols/topics/C04.pdf?v=143.316",
 "docs/protocols/topics/C05.pdf?v=143.316",
 "docs/protocols/topics/F01.pdf?v=143.316",
 "docs/protocols/topics/F02.pdf?v=143.316",
 "docs/protocols/topics/J01.pdf?v=143.316",
 "docs/protocols/topics/J02.pdf?v=143.316",
 "docs/protocols/topics/J03.pdf?v=143.316",
 "docs/protocols/topics/J04.pdf?v=143.316",
 "docs/protocols/topics/O01.pdf?v=143.316",
 "docs/protocols/topics/O02.pdf?v=143.316",
 "docs/protocols/topics/O03.pdf?v=143.316",
 "docs/protocols/topics/O04.pdf?v=143.316",
 "docs/protocols/topics/O05.pdf?v=143.316",
 "docs/protocols/topics/O06.pdf?v=143.316",
 "docs/protocols/topics/O07.pdf?v=143.316",
 "docs/protocols/topics/P01.pdf?v=143.316",
 "docs/protocols/topics/P02.pdf?v=143.316",
 "docs/protocols/topics/P03.pdf?v=143.316",
 "docs/protocols/topics/P04.pdf?v=143.316",
 "docs/protocols/topics/P05.pdf?v=143.316",
 "docs/protocols/topics/P06.pdf?v=143.316",
 "docs/protocols/topics/P07.pdf?v=143.316",
 "docs/protocols/topics/P08.pdf?v=143.316",
 "docs/protocols/topics/P09.pdf?v=143.316",
 "docs/protocols/topics/P10.pdf?v=143.316",
 "docs/protocols/topics/P11.pdf?v=143.316",
 "docs/protocols/topics/S01.pdf?v=143.316",
 "docs/protocols/topics/S02.pdf?v=143.316",
 "scripts/receipt-workflow245.js?v=143.273",
 "scripts/receipt-phone245.js?v=143.273",
 "scripts/receipt-detector-worker213.js?v=143.213",
 "styles/phone-login210.css?v=143.210",
 "scripts/receipt-camera209.js?v=143.213",
 "scripts/receipt-links208.js?v=143.208",
 "scripts/scan-viewer208.js?v=143.226",
 "styles/scan-viewer208.css?v=143.208",
 "manifest.webmanifest",
 "scripts/app-install205.js?v=143.208",
 "styles/app-install205.css?v=143.208",
 "assets/app-icons/accounting-192-v1.png",
 "assets/app-icons/accounting-180-v1.png",
 "assets/app-icons/accounting-512-v1.png",
 "assets/app-icons/accounting-maskable-v1.png",
 "assets/app-icons/accounting-48-v1.png",
 "scan.html",
 "scripts/receipt-core202.js?v=143.213",
 "scripts/receipt-pdf202.js?v=143.208",
 "scripts/receipt-scanner202.js?v=143.240",
 "styles/receipt-scanner202.css?v=143.223",
 "assets/vendor/document14285/jspdf.umd.min.js",
 "scripts/operational-reset143108.js?v=143.184",
 "assets/vendor/noble-gcm14334.js?v=143.34",
 "scripts/device-vault14334.js?v=143.338",
 "styles/controls14305.css?v=143.265",
 "scripts/action-feedback14296.js?v=143.323",
 "scripts/feedback-viewport14295.js?v=143.20",
 "styles/feedback-viewport14295.css?v=143.301",
 "assets/brand/oonjai-logo.png",
 "styles/password-help14278.css?v=142.94",
 "styles/loading1444.css?v=143.241",
 "scripts/login-notifications14293.js?v=142.94",
 "styles/login-notifications14293.css?v=142.94",
 "scripts/loading1444.js?v=143.241",
 "styles/functional-corrections14292.css?v=143.128",
 "recovery.html",
 "scripts/recovery14257.js?v=143.70",
 "scripts/phone-reset-gate14257.js?v=142.57",
 "scripts/numeric-caret14257.js?v=142.57",
 "scripts/password-policy14257.js?v=143.67",
 "index.html",
 "phone.html",
 "styles/phone14242.css?v=143.343",
 "scripts/reconciliation14345.js?v=143.240",
 "styles/final-review14345.css?v=143.301",
 "scripts/phone-runtime14242.js?v=143.344",
 "assets/vendor/supabase.js?v=142.47",
 "scripts/supabase-config.js?v=143.109",
 "deployment-config.js?v=143.109",
 "scripts/staff-entry14225.js?v=143.343",
 "styles/loading1444.css?v=143.241",
 "scripts/loading1444.js?v=143.241",
 "scripts/password-service14264.js?v=142.84",
 "styles/feedback-viewport14295.css?v=143.301"
];
const OPTIONAL=["assets/vendor/document-detector213/ort-api.js","assets/vendor/document-detector213/ort-wasm-simd-threaded.mjs","assets/vendor/document-detector213/ort-wasm-simd-threaded.wasm","assets/vendor/document-detector213/doccornernet_lean.ort",'scripts/phone-tools14242.js?v='+VERSION,'assets/logo.png'];
const scopeURL=new URL(self.registration.scope);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),previous=(await caches.keys()).filter(name=>name.startsWith('ojm-phone-shell-')&&name!==CACHE).reverse();
 try{
  for(let i=0;i<FILES.length;i+=2){const results=await Promise.allSettled(FILES.slice(i,i+2).map(async file=>{
   const u=new URL(file,scopeURL),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{if(u.searchParams.has('v')){for(const name of previous){const saved=await(await caches.open(name)).match(u.href);if(saved?.ok){await cache.put(u.href,saved);return;}}}const response=await fetch(u.href,{cache:/\.html$/.test(file)?'reload':'force-cache',signal:controller.signal});if(!response.ok)throw Error('Phone file did not finish downloading');const body=await response.arrayBuffer();await cache.put(u.href,new Response(body,{status:response.status,headers:response.headers}));}finally{clearTimeout(timer)}
  }));const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;}await self.skipWaiting();
 }catch(e){await caches.delete(CACHE);throw e}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'ojm-phone-ready',version:VERSION});})()));
self.addEventListener('message',event=>{if(event.data?.type==='ojm-phone-status')event.source?.postMessage({type:'ojm-phone-ready',version:VERSION});});
self.addEventListener('fetch',event=>{
 const request=event.request,u=new URL(request.url);if(request.method!=='GET'||u.origin!==scopeURL.origin||!u.pathname.startsWith(scopeURL.pathname))return;
 let path=u.pathname.slice(scopeURL.pathname.length)||'index.html';
 if(![...FILES,...OPTIONAL].some(f=>f.split('?')[0]===path))return;
 const candidates=[...FILES,...OPTIONAL],requested=path+(u.searchParams.has('v')?'?v='+u.searchParams.get('v'):'');
 const file=candidates.includes(requested)?requested:candidates.find(f=>f.split('?')[0]===path),cachedURL=new URL(file,scopeURL).href;
 if(/\.(js|css)$/.test(path)&&u.searchParams.get('v')!==new URL(cachedURL).searchParams.get('v'))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),saved=await cache.match(cachedURL);if(saved)return saved;if(file.startsWith('assets/vendor/document-detector213/')){const previous=await caches.match(cachedURL);if(previous?.ok)return previous;}const response=await fetch(request);if(OPTIONAL.includes(file)&&response.ok){const body=await response.arrayBuffer(),complete=new Response(body,{status:response.status,headers:response.headers});await cache.put(cachedURL,complete.clone());return complete;}return response;})());
});

