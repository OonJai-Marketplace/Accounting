(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),hash=new URLSearchParams(location.hash.slice(1));let db,ready=false,busy=false;
const status=text=>$('status').textContent=text;
async function boundedFetch(input,init={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{return await fetch(input,{...init,signal:controller.signal})}finally{clearTimeout(timer)}}
async function start(){try{
 const problem=params.get('error_description')||hash.get('error_description');if(problem)throw Error(problem+'. Request a new recovery email.');
 if(!window.supabase)throw Error('The secure password service could not load. Reconnect and reload this page.');
 db=supabase.createClient(OJM_SUPABASE_URL,OJM_SUPABASE_ANON_KEY,{global:{fetch:boundedFetch}});
 if(params.get('token_hash')){const r=await db.auth.verifyOtp({token_hash:params.get('token_hash'),type:'recovery'});if(r.error)throw r.error}
 const session=await db.auth.getSession();if(session.error)throw session.error;if(!session.data.session)throw Error('This link is expired or unavailable. Request a new password-reset email.');
 const user=await db.auth.getUser();if(user.error)throw user.error;
 history.replaceState(null,'',location.pathname+(params.has('required')?'?required=1':''));
 if(params.has('required')){const r=await db.rpc('password_change_status14257');if(r.error)throw r.error;if(!r.data?.required){location.replace('index.html');return}}
 ready=true;$('recoveryForm14257').querySelector('fieldset').disabled=false;passwordPolicy14257.scan();status('Choose a new password. All requirements must be met.');
 }catch(e){status(e.message||'Verification could not finish. Reconnect and reload.')}}
$('confirmPassword14257').addEventListener('input',()=>{$('confirmPassword14257').setCustomValidity($('confirmPassword14257').value!==$('newPassword14257').value?'The passwords do not match.':'')});
$('recoveryForm14257').onsubmit=async e=>{e.preventDefault();if(!ready||busy)return;const password=$('newPassword14257').value;if(!passwordPolicy14257.accepted(password))return;if(password!==$('confirmPassword14257').value){status('The passwords do not match.');return}busy=true;const b=e.target.querySelector('button');b.disabled=true;try{
 status('Saving your new password…');const r=await db.auth.updateUser({password});if(r.error)throw r.error;
 const check=await db.rpc('password_change_status14257');if(check.error&&!['PGRST202','42883'].includes(check.error.code))throw check.error;
 if(check.data?.required){await passwordService14264(db,{action:'complete',password});}
 await db.auth.signOut({scope:'local'});ready=false;e.target.reset();e.target.hidden=true;status('Password updated. Sign in with your new password.');
 }catch(error){status(error.message||'The password could not be saved. Your form remains open.')}finally{busy=false;b.disabled=!ready;passwordPolicy14257.scan()}};
window.addEventListener('hashchange',()=>{if(location.hash)location.reload()});
start();
})();

