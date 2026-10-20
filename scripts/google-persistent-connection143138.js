/* Persistent company Google authorization, isolated from existing AI Journal drafting. */
(()=>{'use strict';
const base='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/';
async function call(which,method='GET'){
  const session=await window.ojmDb?.auth?.getSession();
  const token=session?.data?.session?.access_token;
  if(!token)throw Error('Sign in to Accounting first.');
  const response=await fetch(base+which,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
  const result=await response.json();
  if(!response.ok||result.error)throw Error(result.error||'Connection unavailable');
  return result;
}
async function status(){return call('google-journal-bridge')}
async function authorize(){
  const result=await call('google-oauth-start','POST');
  const target=new URL(result.authorization_url);
  if(target.origin!=='https://accounts.google.com')throw Error('Unexpected Google destination');
  window.location.assign(target.href);
}
function install(){
  const host=document.getElementById('googleSheets143129');
  if(!host)return false;
  if(host.querySelector('[data-persistent-google]'))return true;
  const node=document.createElement('div');node.dataset.persistentGoogle='1';node.className='je-card';
  node.innerHTML='<h3>Persistent company Google connection</h3><p data-persistent-status role="status">Checking connection…</p><button type="button" class="je-btn" data-persistent-connect>Authorize persistent connection</button><button type="button" class="je-btn" data-persistent-recheck>Check connection</button>';
  host.prepend(node);
  const line=node.querySelector('[data-persistent-status]');
  const check=async()=>{try{const value=await status();line.textContent=value.connected?'Connected: '+value.email+' (server-managed)':'Not connected persistently yet. '+(value.message||'');}catch(e){line.textContent='Connection status unavailable: '+e.message}};
  node.querySelector('[data-persistent-recheck]').onclick=check;
  node.querySelector('[data-persistent-connect]').onclick=()=>authorize().catch(e=>line.textContent=e.message);
  void check();return true;
}
document.addEventListener('DOMContentLoaded',()=>{if(install())return;let count=0;const timer=setInterval(()=>{if(install()||++count>30)clearInterval(timer)},500)});
window.OonJaiPersistentGoogle={status,authorize};
})();