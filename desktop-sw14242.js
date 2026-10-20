/* Static application files only. Each release has an isolated cache.
   Never overwrite old version caches: open tabs may still require those bytes. */
const VERSION='143.142',CACHE='ojm-desktop-shell-'+VERSION;
const FILES=[
 "scripts/drive-drafts143128.js?v=143.142",
 "scripts/google-persistent-connection143138.js?v=143.142",
 "scripts/notification-focus143139.js?v=143.142",
 "scripts/operational-reset143108.js?v=143.109",
 "scripts/undo143103.js?v=143.109",
 "scripts/editor-protection14380.js?v=143.80",
 "scripts/font-size14380.js?v=143.80",
 "styles/font-size14380.css?v=143.80",
 "docs/UPDATE-v143.21.md",
 "scripts/hr-calendar14306.js?v=143.119",
 "scripts/desktop14245-1.js?v=143.62",
 "deployment-config.js?v=143.109",
 "scripts/supabase-config.js?v=143.109",
 "scripts/desktop-scale14320.js?v=143.23",
 "styles/desktop-scale14320.css?v=143.20",
 "scripts/installation14320.js?v=143.109",
 "styles/installation14320.css?v=143.119",
 "scripts/feedback-viewport14295.js?v=143.20",
 "scripts/module-dock14269.js?v=143.20",
 "scripts/desktop14245-2.js?v=143.128",
 "scripts/desktop14245-3.js?v=143.128",
 "scripts/desktop14245-4.js?v=143.128",
 "scripts/desktop14245-5.js?v=143.117",
 "scripts/desktop14245-6.js?v=143.142",
 "scripts/local-events14310.js?v=143.109",
 "scripts/offline14239.js?v=143.142",
 "docs/UPDATE-v143.18.md",
 "docs/UPDATE-v143.19.md",
 "scripts/company-accounts14319.js?v=143.20",
 "scripts/hr-calendar-news14309.js?v=143.109",
 "styles/local-events14310.css?v=143.20",
 "scripts/controls14317.js?v=143.52-review2",
 "styles/controls14317.css?v=143.62",
 "scripts/period-closing14317.js?v=143.70",
 "setup/INSTALL-DEFERRED-SUBMISSIONS-v143.17.sql",
 "docs/UPDATE-v143.17.md",
 "scripts/reconciliation14345.js?v=143.109",
 "styles/final-review14345.css?v=143.47",
 "scripts/closing-eligibility14346.js?v=143.47",
 "scripts/budget-workflow14316.js?v=143.78",
 "scripts/navigation-workflow14316.js?v=143.142",
 "styles/workflow14316.css?v=143.20",
 "setup/INSTALL-BUDGET-LIFECYCLE-v143.16.sql",
 "docs/WORKFLOW-v143.16.md",
 "scripts/budget14313.js?v=143.70",
 "scripts/budget-messages14314.js?v=143.70",
 "scripts/action-feedback14296.js?v=143.70",
 "scripts/vouchers14299.js?v=143.88",
 "scripts/navigation-badges14311.js?v=143.49",
 "scripts/layout14256.js?v=143.113",
 "scripts/archive-v128.js?v=143.70",
 "scripts/audit-workspace14232.js?v=143.109",
 "scripts/backup-validation1441.js?v=143.109",
 "scripts/budget-gmail14314.js?v=143.70",
 "styles/budget-messages14314.css?v=143.20",
 "docs/GMAIL-SETUP-v143.14.md",
 "scripts/login-notifications14293.js?v=142.94",
 "styles/login-notifications14293.css?v=142.94",
 "scripts/report-library14285.js?v=143.70",
 "scripts/search-autofill14285.js?v=143.69",
 "styles/report-library14285.css?v=142.86",
 "assets/vendor/document14285/pdf.worker.min.mjs",
 "assets/vendor/document14285/cfb.min.js?v=142.94",
 "assets/vendor/document14285/marked.umd.js?v=142.94",
 "assets/vendor/document14285/pdf.min.mjs",
 "styles/phone-shell14285.css?v=142.86",
 "styles/phone-navigation14285.css?v=142.94",
 "scripts/password-service14264.js?v=142.84",
 "styles/design14284.css?v=143.59",
 "scripts/design14284.js?v=143.70",
 "styles/phone-design14284.css?v=142.94",
 "scripts/report-formats14282.js?v=143.117",
 "scripts/entry-actions14271.js?v=143.59",
 "styles/entry-layout14271.css?v=143.59",
 "styles/module-dock14269.css?v=142.75",
 "scripts/audit-explanation14260.js?v=142.60",
 "scripts/phone-reset-gate14257.js?v=142.57",
 "scripts/account-currency14257.js?v=143.70",
 "recovery.html",
 "scripts/password-policy14257.js?v=143.67",
 "scripts/recovery14257.js?v=143.70",
 "scripts/account-security14257.js?v=143.70",
 "scripts/startup14257.js?v=143.122",
 "scripts/numeric-caret14257.js?v=142.57",
 "scripts/entry-number14257.js?v=143.123",
 "styles/layout14256.css?v=142.76",
 "scripts/auto-sync14256.js?v=143.51-sync1",
 "scripts/workflow14253.js?v=143.128",
 "scripts/account-groups14253.js?v=142.53",
 "scripts/field-focus14253.js?v=143.41",
 "styles/workflow14253.css?v=142.53",
 "scripts/phone-keyboard14252.js?v=142.77",
 "scripts/admin-access14251.js?v=143.114",
 "index.html",
 "phone.html",
 "scripts/editor-numbers1428.js?v=143.52-review2",
 "scripts/phone-pull-refresh1423.js?v=142.47",
 "scripts/phone-account-picker14227.js?v=142.94",
 "scripts/desktop-layout1438.js?v=143.70",
 "scripts/phone-connected.js?v=143.109",
 "styles/editor-numbers1428.css?v=142.47",
 "styles/phone-pull-refresh1423.css?v=142.47",
 "styles/phone-approved14225.css?v=142.47",
 "styles/audit-workspace14232.css?v=142.47",
 "styles/archive-v128.css?v=142.47",
 "styles/phone-finalization1440.css?v=142.47",
 "styles/phone-account-picker14227.css?v=142.94",
 "styles/phone-connected.css?v=142.47",
 "assets/payroll-voucher-footer1424.png",
 "assets/logo.png",
 "assets/payroll-voucher-header1424.png",
 "assets/brush-stroke136.svg",
 "assets/vendor/jszip.min.js?v=142.47",
 "assets/vendor/supabase.js?v=142.47",
 "assets/vendor/docx.js?v=142.47",
 "assets/brand/oonjai-logo.png",
 "styles/phone-approved14247.css?v=142.47",
 "phone-accounting.html",
 "styles/phone-accounting14246.css?v=142.47",
 "assets/banners/transactions.webp",
 "styles/password-help14278.css?v=142.94",
 "styles/desktop14245.css?v=143.128",
 "scripts/tablet-journal14266.js?v=142.80",
 "scripts/workspace-header14266.js?v=142.83",
 "styles/tablet-journal14266.css?v=142.75",
 "styles/workspace-header14266.css?v=143.48",
 "scripts/phone-data14248.js?v=142.48",
 "styles/phone-design14248.css?v=142.50",
 "scripts/reports14254.js?v=143.120",
 "styles/account-parent14287.css?v=142.96",
 "desktop.html",
 "scripts/report-templates14262.js?v=143.109",
 "scripts/report-routes14262.js?v=143.70",
 "scripts/loading1444.js?v=142.93",
 "styles/functional-corrections14292.css?v=143.128",
 "scripts/assigned-ledger14281.js?v=143.70",
 "scripts/journal-description14281.js?v=143.88",
 "styles/settings-polish14281.css?v=142.83",
 "styles/phone-polish14281.css?v=142.94",
 "scripts/account-picker1428.js?v=143.128",
 "styles/account-picker1428.css?v=143.109",
 "scripts/maintenance-engine14324.js?v=143.70",
 "scripts/maintenance14324.js?v=143.82",
 "scripts/system-diagnostics14324.js?v=143.26",
 "styles/maintenance14324.css?v=143.24",
 "assets/maintenance/release14324.json",
 "assets/maintenance/Oon-Jai-Maintenance-Comparison.xlsx",
 "setup/INSTALL-MAINTENANCE-v143.24.sql",
 "docs/MAINTENANCE-v143.24.md",
 "scripts/polish14325.js?v=143.25",
 "styles/polish14325.css?v=143.128",
 "scripts/maintenance-selection14325.js?v=143.25",
 "scripts/maintenance-reports14326.js?v=143.70",
 "assets/maintenance/report-template14326.xlsx",
 "docs/UPDATE-v143.26.md",
 "styles/compact14327.css?v=143.58-polish",
 "docs/UPDATE-v143.27.md",
 "docs/UPDATE-v143.28.md",
 "docs/UPDATE-v143.29.md",
 "scripts/document-downloads14311.js?v=143.75",
 "scripts/hr-workspace14306.js?v=143.70",
 "docs/UPDATE-v143.30.md",
 "scripts/summary-period14331.js?v=143.70",
 "scripts/period-filters14331.js?v=143.70",
 "scripts/workspace14331.js?v=143.93",
 "styles/workspace14331.css?v=143.128",
 "docs/UPDATE-v143.31.md",
 "scripts/sync-assessment14332.js?v=143.109",
 "styles/sync-assessment14332.css?v=143.53",
 "scripts/settings-groups14332.js?v=143.142",
 "styles/settings-groups14332.css?v=143.113",
 "styles/statutory14332.css?v=143.32",
 "scripts/phone-runtime14242.js?v=143.109",
 "scripts/local-first14333.js?v=143.122",
 "scripts/session-cache14333.js?v=143.33",
 "scripts/year-window14333.js?v=143.109",
 "docs/UPDATE-v143.34.md",
 "setup/INSTALL-PAYROLL-YEAR-WINDOW-v143.34.sql",
 "assets/vendor/noble-gcm14334.LICENSE.txt",
 "scripts/payroll-window14334.js?v=143.70",
 "assets/vendor/noble-gcm14334.js?v=143.34",
 "scripts/device-vault14334.js?v=143.70",
 "setup/INSTALL-EDITABLE-TODOS-v143.35.sql",
 "scripts/optional-tools14335.js?v=143.75",
 "scripts/document-import-v1422.js?v=143.75",
 "scripts/document-export-v108.js?v=143.72",
 "docs/UPDATE-v143.35.md",
 "docs/UPDATE-v143.36.md",
 "scripts/export-center14337.js?v=143.70",
 "scripts/workspace14337.js?v=143.88",
 "styles/workspace14337.css?v=143.109",
 "docs/UPDATE-v143.37.md",
 "docs/UPDATE-v143.38.md",
 "docs/UPDATE-v143.39.md",
 "scripts/view-render14340.js?v=143.64",
 "docs/UPDATE-v143.40.md",
 "docs/UPDATE-v143.41.md",
 "scripts/history-month14341.js?v=143.109",
 "scripts/idle-sync14341.js?v=143.122",
 "styles/responsive-work14341.css?v=143.62",
 "docs/UPDATE-v143.42.md",
 "scripts/phone-tools14242.js?v=143.114",
 "styles/feedback-viewport14295.css?v=142.95",
 "scripts/desktop-corrections-v80.js?v=143.70",
 "scripts/payroll-polish-v97.js?v=143.128",
 "scripts/script.js?v=143.128",
 "scripts/transactions-v67.js?v=143.117",
 "scripts/workflows-v136.js?v=143.113",
 "scripts/workspace-consistency14343.js?v=143.109",
 "styles/workspace-consistency14343.css?v=143.96",
 "docs/UPDATE-v143.43.md",
 "phone-sw.js?v=143.109",
 "scripts/personal-journal1437.js?v=143.109",
 "docs/UPDATE-v143.44.md",
 "docs/UPDATE-v143.45.md",
 "scripts/access-v113.js?v=143.109",
 "scripts/organization14229.js?v=143.70",
 "scripts/review-mobile-v78.js?v=143.70",
 "scripts/subusers-final-v56.js?v=143.117",
 "scripts/team-home14227.js?v=143.78",
 "scripts/workspace-settings.js?v=143.114",
 "docs/UPDATE-v143.47.md",
 "setup/INSTALL-RETURNED-SUBMISSIONS-v143.47.sql",
 "docs/UPDATE-v143.46.md",
 "scripts/report-history1443.js?v=143.70",
 "docs/UPDATE-v143.48.md",
 "scripts/final-v117.js?v=143.70",
 "scripts/review-v69.js?v=143.70",
 "docs/UPDATE-v143.49.md",
 "setup/INSTALL-REPORT-POSTING-v143.49.sql",
 "scripts/corrections14231.js?v=143.65",
 "scripts/document-editor-v105.js?v=143.119",
 "scripts/hr-calendar-model14306.js?v=143.70",
 "scripts/opening-balances14234.js?v=143.113",
 "scripts/dashboard-warm-v112.js?v=143.70",
 "scripts/payroll-groups-v96.js?v=143.113",
 "scripts/payroll-reports-v82.js?v=143.121",
 "scripts/reports-system-v71.js?v=143.109",
 "scripts/reports-v118.js?v=143.117",
 "scripts/scheduled-journals-v91.js?v=143.70",
 "scripts/settings-payroll-v94.js?v=143.70",
 "scripts/tax-reports-v102.js?v=143.109",
 "scripts/prepared-workspace14364.js?v=143.109",
 "scripts/transaction-consistency14300.js?v=143.69",
 "scripts/universal-date-v104.js?v=143.117",
 "scripts/layout-consistency-v87.js?v=143.67",
 "scripts/financial-numbers14231.js?v=143.128",
 "scripts/interface-v69.js?v=143.87",
 "scripts/layout-voucher-polish14301.js?v=143.69",
 "scripts/subusers-final-v55.js?v=143.69",
 "styles/voucher-layout14299.css?v=143.84",
 "styles/hr-workspace14306.css?v=143.09",
 "scripts/heading-case14297.js?v=142.97",
 "styles/transaction-consistency14300.css?v=143.04",
 "styles/layout-voucher-polish14301.css?v=143.04",
 "styles/controls14305.css?v=143.08",
 "styles/navigation-badges14311.css?v=143.60",
 "styles/phone14242.css?v=143.59",
 "styles/loading1444.css?v=142.93",
 "scripts/staff-entry14225.js?v=143.70",
 "styles/functional-corrections14292.css?v=143.128",
 "assets/brand/oonjai-logo.png?v=118",
 "styles/feedback-viewport14295.css?v=143.59",
 "styles/loading1444.css?v=142.94",
 "scripts/loading1444.js?v=142.94",
 "assets/vendor/supabase.js?v=142.41",
 "styles/archive-v128.css?v=142.34",
 "styles/audit-workspace14232.css?v=142.34",
 "scripts/audit-engine14232.js?v=143.109",
 "scripts/audit-storage14232.js?v=143.70",
 "scripts/cell-navigation14233.js?v=143.128",
 "scripts/feedback-viewport14295.js?v=142.95",
 "archive.html",
 "styles/setup14320.css?v=143.20",
 "scripts/setup14320.js?v=143.109",
 "setup.html"
];

const scopeURL=new URL(self.registration.scope);
const paths=new Map(FILES.map(file=>[file.split('?')[0],file]));
async function completeResponse(response){
 if(!response.ok||response.type==='opaque')throw Error('Offline file did not finish downloading');
 const bytes=await response.arrayBuffer();
 return new Response(bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
}
let downloadState={type:'ojm-shell-progress',version:VERSION,completed:0,total:FILES.length};
let installing=false;
async function reportDownload(detail={}){
 downloadState={...downloadState,...detail};
 for(const client of await self.clients.matchAll({includeUncontrolled:true})){
  if(new URL(client.url).pathname===new URL('update.html',scopeURL).pathname)client.postMessage(downloadState);
 }
}
async function storageStep(operation){
 let timer;
 try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser storage is not responding')),30000)})]);}
 finally{clearTimeout(timer);}
}
async function downloadFile(cache,file){
 const url=new URL(file,scopeURL);
 // A rejected installation never serves pages. Its complete files are safe to
 // resume; older active releases and all accounting storage remain untouched.
 if(await storageStep(cache.match(url.href)))return;
 for(let retry=0;retry<3;retry++){
  await reportDownload({file:file.split('?')[0],bytes:0,retry});
  const controller=new AbortController();let timer,lastReport=0;
  const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),60000)};
  try{
   const saved=url.searchParams.has('v')?await storageStep(caches.match(url.href)):null;
   let response=saved;
   if(!response){
    arm();response=await fetch(url.href,{cache:'no-cache',signal:controller.signal});
    if(!response.ok||response.type==='opaque')throw Error('Download returned '+response.status);
    if(response.body){
     const reader=response.body.getReader(),chunks=[];let bytes=0;
     try{while(true){const part=await reader.read();if(part.done)break;chunks.push(part.value);bytes+=part.value.byteLength;arm();if(Date.now()-lastReport>500){lastReport=Date.now();await reportDownload({file:file.split('?')[0],bytes,retry});}}}
     finally{reader.releaseLock();}
     response=new Response(new Blob(chunks),{status:response.status,statusText:response.statusText,headers:response.headers});
    }else response=await completeResponse(response);
   }
   clearTimeout(timer);
   await storageStep(cache.put(url.href,response));return;
  }catch(error){
   if(error.name==='QuotaExceededError'||retry===2){error.downloadFile=file.split('?')[0];throw error;}
   await new Promise(resolve=>setTimeout(resolve,1000*(retry+1)));
  }finally{clearTimeout(timer);}
 }
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 installing=true;
 try{
  const cache=await storageStep(caches.open(CACHE));
  for(let offset=0;offset<FILES.length;offset+=2){
   const batch=await Promise.allSettled(FILES.slice(offset,offset+2).map(async file=>{
    await downloadFile(cache,file);
    await reportDownload({completed:downloadState.completed+1,bytes:0});
   }));
   const failed=batch.find(result=>result.status==='rejected');if(failed)throw failed.reason;
  }
  await self.skipWaiting();
 }catch(error){
  await reportDownload({type:'ojm-shell-error',file:error.downloadFile||'',message:error.name==='QuotaExceededError'?'This device has insufficient browser storage for the update.':'A file could not finish downloading. Completed files are saved for retry.'});
  throw error;
 }
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 installing=false;
 await self.clients.claim();
 for(const client of await self.clients.matchAll())client.postMessage({type:'ojm-shell-ready',version:VERSION});
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ojm-shell-status')event.ports[0]?.postMessage({version:VERSION,ready:!installing,progress:installing?downloadState:null});});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==scopeURL.origin||!url.pathname.startsWith(scopeURL.pathname))return;
 const path=url.pathname.slice(scopeURL.pathname.length)||'index.html',file=paths.get(path);if(!file)return;
 const versioned=/\.(js|css)$/.test(path),requestedFile=path+(url.searchParams.has('v')?'?v='+url.searchParams.get('v'):'');
 const canonical=new URL(versioned&&FILES.includes(requestedFile)?requestedFile:file,scopeURL);
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(versioned&&url.searchParams.get('v')!==canonical.searchParams.get('v')){
   // Earlier releases used path-only keys in per-version accounting caches.
   // Read those caches without rewriting them or creating empty legacy caches.
   const requested=url.searchParams.get('v');
   if(requested){
    const names=await caches.keys(),legacy='ojm-accounting-shell-'+requested;
    for(const name of names.filter(name=>name===legacy||name.startsWith('ojm-desktop-shell-')&&name!==CACHE)){
     const prior=await(await caches.open(name)).match(name===legacy?new URL(path,scopeURL).href:url.href);if(prior)return prior;
    }
   }
   return fetch(request);
  }
  const saved=await cache.match(canonical.href);
  // A navigation uses its complete cached release immediately. Updates install
  // separately; ordinary tab changes never depend on this network path.
  if(saved)return saved;
  const response=await completeResponse(await fetch(request));
  await cache.put(canonical.href,response.clone());return response;
 })());
});
