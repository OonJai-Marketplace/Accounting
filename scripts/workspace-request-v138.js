/* Per-tab effective workspace. The Supabase Auth session remains the administrator. */
(function(){'use strict';
const context=window.workspaceRequest138={target:null,actor:null,busy:false};
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,options={}){
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.href);
 const base=window.OJM_SUPABASE_URL?new URL(window.OJM_SUPABASE_URL):null;
 const effective=context.target;
 const send=(request,init)=>nativeFetch(request,init).then(response=>{
  if(base&&url.origin===base.origin&&url.pathname.startsWith('/rest/v1/')&&context.target!==effective)throw new DOMException('Account changed while this request was loading.','AbortError');
  return response;
 });
 if(context.target&&base&&url.origin===base.origin){
  if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='refresh_token'||url.pathname==='/auth/v1/logout'||url.pathname==='/auth/v1/user'&&(options.method||'GET').toUpperCase()==='GET')return nativeFetch(input,options);
  if(!url.pathname.startsWith('/rest/v1/'))return Promise.resolve(new Response(JSON.stringify({message:'Return to your administrator account before using account authentication or file storage.'}),{status:403,headers:{'Content-Type':'application/json'}}));
  const headers=new Headers(input instanceof Request?input.headers:options.headers);if(options.headers)new Headers(options.headers).forEach((v,k)=>headers.set(k,v));headers.set('x-ojm-workspace',context.target);
  return send(input,{...options,headers});
 }
 return send(input,options);
};
})();
