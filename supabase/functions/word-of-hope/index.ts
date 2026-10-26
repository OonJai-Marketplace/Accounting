import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const origin='https://oonjai-marketplace.github.io';
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const sheet='1lkn2dk1PGJyNhrPiZsyqmueK4bN8iDvTNPau5f6U2pk',tab="'Word of Hope'";
const restaurantURL='https://dfrulsnparrouuzjbtih.supabase.co',restaurantKey='sb_publishable_quyTKmIUS7NUWpN6tqWrhw_bWIZj1tm';
const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const check=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('');
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const base64=(b:Uint8Array)=>btoa(String.fromCharCode(...b));
async function key(){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY')||service)),'AES-GCM',false,['encrypt','decrypt']);}
async function decrypt(s:string){const [iv,data]=s.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(),bytes(data)));}
async function encrypt(s:string){const iv=crypto.getRandomValues(new Uint8Array(12));return base64(iv)+'.'+base64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(s))));}
async function googleToken(){
 const c=check(await db.from('google_connections143150').select('*').eq('sheet',sheet).single());
 if(c.access_token&&Date.parse(c.expires_at)>Date.now()+60000)return decrypt(c.access_token);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:Deno.env.get('GOOGLE_CLIENT_ID')||Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')||'',client_secret:Deno.env.get('GOOGLE_CLIENT_SECRET')||Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')||'',refresh_token:await decrypt(c.refresh_token),grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
 const t=await r.json();if(!r.ok||!t.access_token)throw Error('Reconnect Google in Accounting settings.');
 check(await db.from('google_connections143150').update({access_token:await encrypt(t.access_token),expires_at:new Date(Date.now()+t.expires_in*1000).toISOString(),...(t.refresh_token?{refresh_token:await encrypt(t.refresh_token)}:{})}).eq('sheet',sheet));return t.access_token;
}
async function sheets(token:string,path:string,method='GET',body?:unknown){const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+sheet+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Google Sheets unavailable ('+r.status+').');return r.json();}
async function sync(){
 const lease=crypto.randomUUID();if(!check(await db.rpc('hope_lock183',{p_token:lease})))return {pending:true};
 let complete=false;
 try{
  const rows=check(await db.from('hope_messages183').select('*').is('synced_at',null).order('created_at').limit(50));
  if(!rows.length){complete=true;return {synced:0};}
  const token=await googleToken(),index=await sheets(token,'/values/'+encodeURIComponent(tab+'!A1:A100002'));
  if(index.values?.[0]?.[0]!=='Submission ID')throw Error('Word of Hope headers need review.');
  const positions=new Map<string,number>();(index.values||[]).forEach((r:any,i:number)=>{if(i&&r[0]){if(positions.has(String(r[0])))throw Error('Duplicate Word of Hope IDs need review.');positions.set(String(r[0]),i+1);}});
  let next=(index.values||[]).length+1;if(next+rows.length>100001)throw Error('Word of Hope sheet needs archiving.');
  const meta=await sheets(token,'?fields=sheets.properties'),info=meta.sheets.find((s:any)=>s.properties.title==='Word of Hope')?.properties;
  if(!info)throw Error('Word of Hope tab is missing.');
  if(info.gridProperties.rowCount<next+rows.length)await sheets(token,':batchUpdate','POST',{requests:[{updateSheetProperties:{properties:{sheetId:info.sheetId,gridProperties:{rowCount:next+rows.length+1000}},fields:'gridProperties.rowCount'}}]});
  const data=rows.map((r:any)=>{const n=positions.get(r.id)||next++;return {range:tab+'!A'+n+':H'+n,values:[[r.id,new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Vientiane',dateStyle:'medium',timeStyle:'medium'}).format(new Date(r.created_at)),r.display_name,r.message,r.consent?'Yes':'No','Restaurant customer website',r.accounting_opened_at||'',r.restaurant_opened_at||'']]};});
  // A leased writer and ID reconciliation make retries update an existing row.
  await sheets(token,'/values:batchUpdate','POST',{valueInputOption:'RAW',data});
  for(const r of rows)check(await db.from('hope_messages183').update({synced_at:new Date().toISOString()}).eq('id',r.id).eq('revision',r.revision));
  complete=true;return {synced:rows.length};
 }finally{
  // Keep the lease after ambiguous timeouts; the next scheduled retry reconciles IDs.
  if(complete)check(await db.from('hope_sync183').update({lease_until:new Date(0).toISOString()}).eq('id',true).eq('lease_token',lease));
 }
}
async function staff(req:Request,app:string){
 if(!['accounting','restaurant'].includes(app))throw Error('Choose a valid workspace.');
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw Error('Sign in to read messages.');
 const client=createClient(app==='restaurant'?restaurantURL:url,app==='restaurant'?restaurantKey:Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const user=await client.auth.getUser(token);if(user.error||!user.data.user)throw Error('Sign in again.');
 const allowed=await client.rpc('is_admin');if(allowed.error||allowed.data!==true)throw Error('Administrator access required.');
 return user.data.user.id;
}
Deno.serve(async(req:Request)=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 try{
  const raw=await req.text();if(raw.length>12000)return reply({error:'Message is too large.'},413);
  const b=JSON.parse(raw),action=b.action;
  if(action==='submit'){
   if(b.website)return reply({error:'Submission could not be accepted.'},400);
   const message=String(b.message||'').trim(),name=String(b.name||'').trim()||'Anonymous';
   if(message.length<10||message.length>1500||name.length>80||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.id||''))return reply({error:'Enter a message of 10–1,500 characters and a name of up to 80 characters.'},400);
   if(typeof b.device!=='string'||b.device.length<8||b.device.length>100)return reply({error:'Reload this page and try again.'},400);
   const day=new Date().toISOString().slice(0,10),ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';
   const payloadHash=await hash(JSON.stringify([message,name,b.consent===true]));
   const result=check(await db.rpc('hope_submit183',{p_id:b.id,p_message:message,p_name:name,p_consent:b.consent===true,p_payload_hash:payloadHash,p_device:await hash(service+day+b.device),p_ip:await hash(service+day+ip)}));
   let copied=false;try{await sync();copied=!!check(await db.from('hope_messages183').select('synced_at').eq('id',b.id).single()).synced_at;}catch{console.warn('Word of Hope copy pending; scheduled retry will recover.');}
   return reply({saved:true,id:result.id,sheet_synced:copied});
  }
  if(action==='sync'){
   const secret=check(await db.rpc('google_poll_key143150'));if(!secret||req.headers.get('Authorization')!=='Bearer '+secret)return reply({error:'Unauthorized.'},401);
   return reply(await sync());
  }
  const actor=await staff(req,b.app);
  if(action==='list'||action==='summary')return reply(check(await db.rpc('hope_inbox183',{p_app:b.app,p_actor:actor,p_before:typeof b.before==='string'?b.before:null,p_summary:action==='summary'})));
  if(action==='open'){
   const row=check(await db.from('hope_messages183').select('id,created_at,display_name,message,consent,synced_at').eq('id',b.id).single());
   return reply({row});
  }
  if(action==='mark-read'){
   check(await db.rpc('hope_open183',{p_id:b.id,p_app:b.app,p_actor:actor}));
   return reply({read:true});
  }
  return reply({error:'Unknown action.'},400);
 }catch(e){const msg=(e as Error).message;const safe=/Too many|changed|Sign in|Administrator|valid workspace/.test(msg)?msg:'Could not complete the request. Your message is kept; please retry.';return reply({error:safe},/Too many/.test(msg)?429:400);}
});
