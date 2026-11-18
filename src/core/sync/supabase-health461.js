/* Observe real database traffic only. No polling, credentials or account data. */
(() => {
  'use strict';
  let state={kind:'unknown',at:null}, sequence=0, applied=0, origin='';
  function configuredOrigin() {
    try { return new URL(window.OJM_SUPABASE_URL).origin; } catch { return ''; }
  }
  function resetOrigin() {
    const next=configuredOrigin();
    if (next!==origin) {origin=next;state={kind:'unknown',at:null};applied=++sequence;}
    return next;
  }
  function publish(kind,id,requestOrigin) {
    if (requestOrigin!==configuredOrigin() || id<applied) return;
    applied=id;state={kind,at:new Date().toISOString()};
    window.dispatchEvent(new Event('supabase-health461'));
  }
  function classify(status,body='') {
    // Only explicit upstream pause evidence earns a definitive Paused label.
    if (/\b(?:project|database)\s+(?:is\s+|has been\s+)?(?:paused|inactive)\b|"status"\s*:\s*"(?:INACTIVE|PAUSED)"/i.test(body)) return 'paused';
    if (/"status"\s*:\s*"(?:RESTORING|COMING_UP|GOING_DOWN|PAUSING)"/i.test(body)) return 'pending';
    if (status>=500 || status===404) return 'unavailable';
    if (status===401 || status===403) return 'access';
    if (status===429) return 'limited';
    return status>=200 && status<300?'healthy':null;
  }
  function observeFetch(fetcher) {
    return async function(input,options) {
      const target=resetOrigin();
      let url;
      try {url=new URL(typeof input==='string'?input:input.url);} catch {return fetcher(input,options);}
      if (!target || url.origin!==target || !url.pathname.startsWith('/rest/v1/')) return fetcher(input,options);
      const id=++sequence,started=Date.now();
      try {
        const response=await fetcher(input,options);
        // Service-worker/device snapshots must never clear a cloud failure.
        if (!response.headers.has('X-OJM-Cached')) {
          const kind=classify(response.status);
          if (kind) publish(kind,id,target);
          if (!response.ok) {
            // Read only a bounded error prefix; never retain response content.
            void (async()=>{
              const reader=response.clone().body?.getReader();
              if (!reader) return;
              const decoder=new TextDecoder();let body='';
              try {while(body.length<16384){const {value,done}=await reader.read();if(done)break;body+=decoder.decode(value,{stream:true});}}
              finally {void reader.cancel().catch(()=>{});}
              const detail=classify(response.status,body.slice(0,16384));
              if (detail && detail!==kind) publish(detail,id,target);
            })().catch(()=>{});
          }
        }
        return response;
      } catch(error) {
        // Short caller cancellations are navigation, not an outage. Existing
        // database deadlines run for at least eight seconds.
        if (error?.name!=='AbortError' || Date.now()-started>=7500) publish('unavailable',id,target);
        throw error;
      }
    };
  }
  function current() {
    resetOrigin();
    return {...state,kind:navigator.onLine===false?'offline':state.kind};
  }
  function dashboardURL() {
    try {
      const host=new URL(window.OJM_SUPABASE_URL).hostname;
      const ref=host.match(/^([a-z0-9]{20})\.supabase\.co$/)?.[1];
      return ref?'https://supabase.com/dashboard/project/'+ref:'https://supabase.com/dashboard';
    } catch {return 'https://supabase.com/dashboard';}
  }
  window.supabaseHealth461=Object.freeze({current,dashboardURL,observeFetch});
})();
