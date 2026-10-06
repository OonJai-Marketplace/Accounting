/* Password requests authenticate in the function; never retry a mutation automatically. */
(()=>{'use strict';
window.passwordService14264=async function(db,body){
 let session=await db.auth.getSession();if(session.error)throw session.error;
 if(session.data?.session?.expires_at&&session.data.session.expires_at*1000<=Date.now()+60000){session=await db.auth.refreshSession();if(session.error)throw session.error;}
 const token=session.data?.session?.access_token;if(!token)throw Error('Your session has expired. Sign out and sign in again.');
 const result=await db.functions.invoke('admin-password14257',{body,headers:{Authorization:'Bearer '+token}});
 if(result.error){
  const response=result.error.context;let detail='';try{const data=await response.clone().json();detail=data.error?.message||data.error||data.message||'';}catch{}
  if(response?.status===401&&/invalid jwt|missing authorization/i.test(String(detail)))throw Error('The password service rejected the session before running. Administrator: turn off Verify JWT for admin-password14257 only; this function verifies the signed-in user itself.');
  if(response?.status===401)throw Error(typeof detail==='string'&&detail?detail:'Your session was rejected. Sign out and sign in again.');
  if(response?.status===404)throw Error('The password service is unavailable. Administrator: deploy admin-password14257 from the current repository.');
  throw Error(typeof detail==='string'&&detail?detail:result.error.message||'The password operation was not confirmed.');
 }
 return result.data;
};
})();
