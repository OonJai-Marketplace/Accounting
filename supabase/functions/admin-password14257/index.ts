import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
// Deploy with JWT verification enabled. Authenticate and authorize again here.
const origin = Deno.env.get('APP_ORIGIN') || 'https://oonjai-marketplace.github.io';
const cors = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Vary':'Origin'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const strong=(v:unknown):v is string=>typeof v==='string'&&[...v].length>=12&&v.length<=128&&v===v.trim()&&/\p{Lu}/u.test(v)&&/\p{Ll}/u.test(v)&&/\p{N}/u.test(v)&&/[^\p{L}\p{N}\s]/u.test(v);
Deno.serve(async req=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply(403,{error:'Origin not allowed'});
 if(req.method==='OPTIONS')return new Response(null,{headers:{...cors,'Access-Control-Allow-Methods':'POST, OPTIONS'}});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply(401,{error:'Sign in first'});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const auth=await admin.auth.getUser(token);if(auth.error||!auth.data.user)return reply(401,{error:'Session is invalid or expired'});
 const actor=auth.data.user.id;
 try{
  const body=await req.json();
  if(body.action==='complete'){
   if(!strong(body.password))return reply(400,{error:'The new password must meet all password requirements.'});
   const result=await admin.rpc('password_reset_service14257',{p_action:'complete',p_user:actor,p_password:body.password});if(result.error)throw result.error;
   return reply(200,result.data);
  }
  if(body.action!=='issue')return reply(400,{error:'Unsupported action'});
  if(!strong(body.password))return reply(400,{error:'Use 12–128 characters, uppercase, lowercase, a number and a symbol, without surrounding spaces.'});
  if(typeof body.user_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.user_id))return reply(400,{error:'Choose a valid user'});
  const profile=await admin.from('profiles').select('role,status').eq('id',actor).single();
  if(profile.error||profile.data.role!=='admin'||profile.data.status!=='active')return reply(403,{error:'Active administrator required'});
  const request=crypto.randomUUID();
  const prepare=await admin.rpc('password_reset_service14257',{p_action:'prepare',p_user:body.user_id,p_actor:actor,p_request:request});if(prepare.error)throw prepare.error;
  // Once preparation starts, the target is locked until setup and change finish.
  const update=await admin.auth.admin.updateUserById(body.user_id,{password:body.password});if(update.error)throw update.error;
  const confirm=await admin.rpc('password_reset_service14257',{p_action:'confirm',p_user:body.user_id,p_actor:actor,p_request:request});if(confirm.error)throw confirm.error;
  return reply(200,{confirmed:true});
 }catch(e){return reply(400,{error:e instanceof Error?e.message:String((e as {message?:string})?.message||'Password operation could not complete. Retry the same user; do not create another account.')})}
});
