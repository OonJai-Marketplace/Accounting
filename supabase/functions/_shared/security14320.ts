import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
export { createClient };
export function cors(req:Request){
 const origins=(Deno.env.get('APP_ORIGINS')||Deno.env.get('APP_ORIGIN')||'').split(',').map(v=>v.trim()).filter(Boolean),origin=req.headers.get('origin');
 if(origin&&!origins.includes(origin))throw Error('Origin not allowed');
 return {'Access-Control-Allow-Origin':origin||origins[0]||'null','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
}
export function reply(status:number,body:unknown,headers:Record<string,string>={}){return new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}})}
export const strong=(v:unknown):v is string=>typeof v==='string'&&[...v].length>=12&&v.length<=128&&v===v.trim()&&/\p{Lu}/u.test(v)&&/\p{Ll}/u.test(v)&&/\p{N}/u.test(v)&&/[^\p{L}\p{N}\s]/u.test(v);
export async function administrator(req:Request){
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw Error('Sign in first');
 const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),anon=Deno.env.get('SUPABASE_ANON_KEY');if(!url||!secret||!anon)throw Error('Server configuration is incomplete');
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const result=await admin.auth.getUser(token);if(result.error||!result.data.user)throw Error('Session is invalid or expired');
 const user=result.data.user,profile=await admin.from('profiles').select('role,status').eq('id',user.id).single();
 if(profile.error||profile.data?.role!=='admin'||profile.data?.status!=='active')throw Error('Active administrator required');
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const allowed=await client.rpc('accounting_workspace_allowed123');if(allowed.error||allowed.data!==true)throw Error('Accounting administrator required');
 return {admin,client,user,url,anon};
}
export async function json(req:Request){const text=await req.text();if(text.length>100000)throw Error('Request is too large');const data=JSON.parse(text);if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Invalid request');return data;}
