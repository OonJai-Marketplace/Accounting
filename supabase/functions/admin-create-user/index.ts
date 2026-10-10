import {administrator,cors,json,reply,strong} from '../_shared/security14320.ts';
// Retries resolve the same email through Auth, then server-side access validation.
Deno.serve(async req=>{let headers:Record<string,string>={};try{
 headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply(405,{error:'POST required'},headers);
 const {admin,user}=await administrator(req),body=await json(req);
 const email=String(body.email||'').trim().toLowerCase(),name=String(body.full_name||'').trim(),role=body.user_type==='admin'?'admin':'submitter';
 if(!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)||email.length>254||!name||name.length>160||!strong(body.password))return reply(400,{error:'Enter a name, valid email and a password meeting all requirements.'},headers);
 if(body.user_type&&!['admin','submitter','cashier','staff','user','sub_user','manager'].includes(body.user_type))return reply(400,{error:'Choose a supported account type'},headers);
 const reserved=await admin.rpc('reserve_account14320',{p_actor:user.id,p_email:email,p_name:name});if(reserved.error)throw reserved.error;
 let id=reserved.data?.user_id;
 if(!id){const created=await admin.auth.admin.createUser({email,password:body.password,email_confirm:true,user_metadata:{full_name:name},app_metadata:{provision_request14320:reserved.data.request_id}});
  if(created.error){const found=await admin.rpc('provisioned_account14320',{p_actor:user.id,p_email:email});if(found.error||!found.data?.user_id)throw created.error;id=found.data.user_id;}else id=created.data.user?.id;
 }
 if(!id)throw Error('Account creation was not confirmed. Retry the same email.');
 const linked=await admin.rpc('link_account14320',{p_actor:user.id,p_email:email,p_user:id,p_name:name});if(linked.error)throw linked.error;
 // The desktop/phone saves the full permission matrix after receiving this ID.
 return reply(200,{user_id:id},headers);
}catch(e){return reply(400,{error:e instanceof Error?e.message:String((e as {message?:string})?.message||'Account creation could not complete. Retry the same email.')},headers)}});
