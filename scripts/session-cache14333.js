/* Resume an existing, previously verified device session; never create a new offline login. */
(()=>{'use strict';let localMode=false,retryAt=0;
const scope=()=>String(window.OJM_SUPABASE_URL||location.origin),grantKey=()=>scope()+':verified-device-session14333';
function stored(){try{const name='sb-'+new URL(scope()).hostname.split('.')[0]+'-auth-token';return JSON.parse(localStorage.getItem(name)||'null')}catch{return null}}
function grant(){try{return JSON.parse(localStorage.getItem(grantKey())||'null')}catch{return null}}
function allowed(id){const g=grant(),s=stored();return !!id&&g?.id===id&&s?.user?.id===id&&!!s.refresh_token}
function clear(){localMode=false;localStorage.removeItem(grantKey())}
function remember(){if(typeof liveProfile==='undefined'||!liveProfile||liveProfile.status!=='active'||window.workspaceRequest138?.target)return;const s=stored();if(s?.user?.id!==liveProfile.id||localMode||window.offline14239?.offline())return;localStorage.setItem(grantKey(),JSON.stringify({id:liveProfile.id,verifiedAt:new Date().toISOString()}))}
function attach(client){const original=client.auth.getSession.bind(client.auth);client.auth.getSession=async function(){const saved=stored(),canResume=allowed(saved?.user?.id);if(canResume&&(navigator.onLine===false||localMode&&Date.now()<retryAt)){localMode=true;return {data:{session:saved},error:null}}
 let timer;try{const result=await Promise.race([original(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Object.assign(Error('Session refresh timed out.'),{localTransport:true})),5000))]);if(result.error)throw result.error;localMode=false;return result}catch(e){const denied=/invalid.*token|revoked|not found|refresh_token_not_found|refresh_token_already_used/i.test(e.code+' '+e.message)||[400,401,403].includes(Number(e.status));if(canResume&&!denied&&(e.localTransport||navigator.onLine===false||/fetch|network|timeout|connection/i.test(e.message||''))){localMode=true;retryAt=Date.now()+30000;window.offline14239?.connectionIssue(e.message);return {data:{session:saved},error:null}}throw e}finally{clearTimeout(timer)}};
 client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT')clear();if(event==='TOKEN_REFRESHED'){localMode=false;window.dispatchEvent(new Event('session-online14333'))}});
 const signout=client.auth.signOut.bind(client.auth);client.auth.signOut=(...args)=>{clear();return signout(...args)};
}
window.sessionCache14333={attach,remember,clear,allowed,get localMode(){return localMode}};
window.addEventListener('online',()=>{retryAt=0});window.addEventListener('page113',remember);window.addEventListener('session-online14333',remember);
})();
