/* A confirmed account mutation requests one background spreadsheet update. No polling. */
(()=>{'use strict';
const endpoint='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/google-journal-bridge';
const memory=new Map();let job=null,timer=null,lastError='';
const identity=()=>typeof liveProfile==='undefined'?'':liveProfile?.id||'';
const database=()=>typeof ojmDb==='undefined'?null:ojmDb;
const key=c=>'ojm-account-sheet143191:'+String(window.OJM_SUPABASE_URL||location.origin)+':'+c.owner;
const current=c=>!!c.owner&&identity()===c.owner&&database()===c.db;
function pending(c){if(memory.has(key(c)))return memory.get(key(c));try{return JSON.parse(localStorage.getItem(key(c))||'null');}catch{return null;}}
function remember(c,value){try{localStorage.setItem(key(c),JSON.stringify(value));memory.delete(key(c));}catch{memory.set(key(c),value);lastError='Google Sheet update pending. Keep this page open; this browser could not retain its retry.';}}
function forget(c,token){if(pending(c)?.token!==token)return;memory.delete(key(c));try{localStorage.removeItem(key(c));}catch{}}
function schedule(){clearTimeout(timer);timer=setTimeout(()=>{timer=null;void flush();},250);}
function changed(c={owner:identity(),db:database()}){
 if(!c.owner||!c.db)return;
 remember(c,{token:crypto.randomUUID(),at:new Date().toISOString()});if(current(c))schedule();
}
async function flush(){
 const c={owner:identity(),db:database()};if(!current(c)||navigator.onLine===false||window.sessionCache14333?.localMode||window.deviceVault14334?.offline)return false;
 const item=pending(c);if(!item)return true;if(job)return job.promise;
 const operation={c,token:item.token,promise:null};job=operation;
 operation.promise=(async()=>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),35000);
  try{
   const session=await c.db.auth.getSession();if(!current(c))return false;
   const auth=session.data?.session;if(!auth?.access_token||auth.user?.id&&auth.user.id!==c.owner)throw Error('Sign in again to update Google Sheets.');
   const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({action:'accounts-sync'}),signal:controller.signal});
   const result=await response.json();if(!current(c))return false;
   if(!response.ok||result.error||!Array.isArray(result.accounts)||!result.sheet)throw Error(result.error||'The Google Sheet update was not confirmed.');
   forget(c,item.token);lastError='';
   // Inbox validation is secondary: a display error must not undo confirmed delivery.
   try{await window.AIInboxSync143173?.accountsChanged?.(result);}catch{}
   if(current(c)&&!pending(c))window.showCenterStatus?.('Account saved. Google Sheet Accounts updated.');
   return true;
  }catch(e){if(current(c)){lastError='Account saved. Google Sheet update pending: '+(e.name==='AbortError'?'connection timed out.':e.message)+' It will retry when you reconnect or reopen Oon Jai.';window.showCenterStatus?.(lastError,true);}return false;}
  finally{clearTimeout(timeout);if(job===operation){job=null;const next={owner:identity(),db:database()},retained=current(next)&&pending(next);if(retained&&(next.owner!==c.owner||retained.token!==item.token))schedule();}}
 })();return operation.promise;
}
window.AccountSheet143191={changed,flush,get state(){const c={owner:identity(),db:database()};return {pending:!!(current(c)&&pending(c)),busy:!!job,error:lastError};}};
// These events only retry a retained failed update; idle/opening without one sends nothing.
window.addEventListener('storage',event=>{const c={owner:identity(),db:database()};if(current(c)&&event.key===key(c)&&event.newValue){memory.delete(key(c));schedule();}});
for(const event of ['online','focus','page113','session-online14333'])window.addEventListener(event,()=>void flush());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void flush();});
})();
