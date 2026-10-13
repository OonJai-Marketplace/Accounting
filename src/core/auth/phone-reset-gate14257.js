/* Legacy standalone-phone sign-in uses the same server reset requirement. */
(()=>{'use strict';const create=window.supabase?.createClient;if(!create)return;
window.supabase.createClient=function(...args){const db=create.apply(this,args);
 for(const method of ['getSession','signInWithPassword']){const original=db.auth[method].bind(db.auth);db.auth[method]=async function(...values){const result=await original(...values),session=result.data?.session;if(result.error||!session)return result;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{
  const response=await fetch(OJM_SUPABASE_URL+'/rest/v1/rpc/password_change_status14257',{method:'POST',headers:{apikey:OJM_SUPABASE_ANON_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:'{}',signal:controller.signal});const data=await response.json();if(['PGRST202','42883'].includes(data.code))return result;if(!response.ok)throw Error(data.message||'Access could not be verified.');if(data.required){location.replace('recovery.html?required=1');return {data:{session:null,user:null},error:Error('Choose a new password to continue.')}}return result;
 }catch(e){return {data:{session:null,user:null},error:e}}finally{clearTimeout(timer)}};}return db;};
})();
