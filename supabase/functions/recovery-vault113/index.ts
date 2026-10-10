import {administrator,createClient,cors,json,reply} from '../_shared/security14320.ts';
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),base64=(b:ArrayBuffer|Uint8Array)=>btoa(String.fromCharCode(...new Uint8Array(b)));
async function encryptionKey(){const raw=Deno.env.get('RECOVERY_VAULT_KEY');if(!raw)throw Error('Recovery encryption key is missing');const key=bytes(raw);if(key.length!==32)throw Error('Recovery encryption key must be 32 bytes');return crypto.subtle.importKey('raw',key,'AES-GCM',false,['encrypt','decrypt']);}
function validate(v:unknown){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid recovery details');const vault=v as {entries?:Record<string,unknown>;notes?:unknown};if(typeof vault.notes!=='string'||vault.notes.length>10000||!vault.entries||typeof vault.entries!=='object')throw Error('Invalid recovery details');
 const clean:{entries:Record<string,unknown[]>;notes:string}={entries:{},notes:vault.notes};for(const service of ['github','supabase']){const rows=vault.entries[service];if(!Array.isArray(rows)||rows.length>3)throw Error('Use at most three contacts per service');clean.entries[service]=rows.map(row=>{if(!row||typeof row!=='object')throw Error('Invalid contact');return Object.fromEntries(['name','url','email','password'].map(k=>{const value=(row as Record<string,unknown>)[k]??'';if(typeof value!=='string'||value.length>4000)throw Error('Contact value is too long');return [k,value]}))})}return clean;}
async function encrypt(vault:unknown){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('oonjai-recovery-14320')},await encryptionKey(),new TextEncoder().encode(JSON.stringify(validate(vault))));return {iv:base64(iv),ciphertext:base64(cipher)};}
async function decrypt(row:{iv:string;ciphertext:string}){const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(row.iv),additionalData:new TextEncoder().encode('oonjai-recovery-14320')},await encryptionKey(),bytes(row.ciphertext));return validate(JSON.parse(new TextDecoder().decode(plain)));}
async function hash(token:string){return base64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));}
Deno.serve(async req=>{let headers:Record<string,string>={};try{
 headers=cors(req);if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply(405,{error:'POST required'},headers);
 const {admin,user,url,anon}=await administrator(req),body=await json(req),now=new Date().toISOString();
 if(body.action==='unlock'){
  if(typeof body.password!=='string'||body.password.length>128)return reply(400,{error:'Type your current website password'},headers);
  const limit=await admin.rpc('recovery_attempt14320',{p_actor:user.id});if(limit.error)throw limit.error;if(!limit.data)return reply(429,{error:'Too many unlock attempts. Try again after 15 minutes.'},headers);
  const verifier=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}}),check=await verifier.auth.signInWithPassword({email:user.email!,password:body.password});
  if(check.error||check.data.user?.id!==user.id)return reply(403,{error:'Password was not accepted'},headers);
  // Destroy the verification session instead of accumulating Auth sessions.
  if(check.data.session)await verifier.auth.signOut({scope:'local'});
  let r=await admin.from('recovery_vaults14320').select('*').eq('id',true).maybeSingle();if(r.error)throw r.error;
  if(!r.data){const encrypted=await encrypt({entries:{github:[],supabase:[]},notes:''});const insert=await admin.from('recovery_vaults14320').insert({id:true,version:1,...encrypted});if(insert.error&&insert.error.code!=='23505')throw insert.error;r=await admin.from('recovery_vaults14320').select('*').eq('id',true).single();if(r.error)throw r.error;}
  const vault=await decrypt(r.data),token=base64(crypto.getRandomValues(new Uint8Array(32))),expires=new Date(Date.now()+5*60*1000).toISOString();
  const cleanup=await admin.from('recovery_tickets14320').delete().lt('expires',now);if(cleanup.error)throw cleanup.error;
  const saved=await admin.from('recovery_tickets14320').insert({token_hash:await hash(token),actor_id:user.id,expires});if(saved.error)throw saved.error;
  return reply(200,{token,expires,vault:{...vault,version:r.data.version}},headers);
 }
 if(typeof body.token!=='string'||body.token.length>128)return reply(403,{error:'Unlock recovery settings again'},headers);
 const tokenHash=await hash(body.token),ticket=await admin.from('recovery_tickets14320').select('*').eq('token_hash',tokenHash).eq('actor_id',user.id).gt('expires',now).maybeSingle();if(ticket.error)throw ticket.error;if(!ticket.data)return reply(403,{error:'Recovery access expired. Unlock again.'},headers);
 if(body.action==='lock'){const r=await admin.from('recovery_tickets14320').delete().eq('token_hash',tokenHash).eq('actor_id',user.id);if(r.error)throw r.error;return reply(200,{locked:true},headers);}
 const record=await admin.from('recovery_vaults14320').select('*').eq('id',true).single();if(record.error)throw record.error;
 if(body.action==='export')return reply(200,{format:'oonjai-encrypted-recovery-14320',algorithm:'AES-256-GCM',version:record.data.version,iv:record.data.iv,ciphertext:record.data.ciphertext},headers);
 if(!['save','restore'].includes(body.action))return reply(400,{error:'Unsupported action'},headers);
 if(!Number.isInteger(body.version)||body.version!==record.data.version)return reply(409,{error:'Recovery details changed elsewhere. Lock and reopen.'},headers);
 let vault=body.vault;if(body.action==='restore'){if(body.backup?.format!=='oonjai-encrypted-recovery-14320'||body.backup?.algorithm!=='AES-256-GCM')throw Error('Unsupported recovery file. Keep the original service available to export its supported format.');vault=await decrypt(body.backup);}
 const encrypted=await encrypt(vault),saved=await admin.from('recovery_vaults14320').update({...encrypted,version:body.version+1,updated_at:now}).eq('id',true).eq('version',body.version).select('version');if(saved.error)throw saved.error;if(saved.data?.length!==1)return reply(409,{error:'Recovery details changed elsewhere. Lock and reopen.'},headers);
 return reply(200,{version:saved.data[0].version},headers);
}catch(e){return reply(400,{error:e instanceof Error?e.message:String((e as {message?:string})?.message||'Recovery operation could not complete')},headers)}});
