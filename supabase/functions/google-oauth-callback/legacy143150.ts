// Preserve the live v3 callback's Sheets behavior while adding scanner OAuth.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
const origin='https://oonjai-marketplace.github.io', home=origin+'/Accounting/';
const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const clientID=()=>Deno.env.get('GOOGLE_CLIENT_ID')||Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')||'';
const clientSecret=()=>Deno.env.get('GOOGLE_CLIENT_SECRET')||Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')||'';
const redirect=url+'/functions/v1/google-oauth-callback';
const scope='https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
const checked=(r:any)=>{if(r.error)throw Error('Connection storage unavailable');return r.data;};
const b64=(a:Uint8Array)=>btoa(String.fromCharCode(...a));
const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function key(){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY')||service)), 'AES-GCM',false,['encrypt','decrypt']);}
async function encrypt(s:string){const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(),new TextEncoder().encode(s))));}
async function decrypt(s:string){const [iv,data]=s.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},await key(),bytes(data)));}
async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function settings(){const row=checked(await admin.from('budget_settings14313').select('data').eq('id',true).single());const cfg=row.data.googleSheets143129;if(!/^[\w-]{20,120}$/.test(cfg?.sheet||''))throw Error('Save a valid submission sheet in Accounting settings.');return cfg;}
async function auth(req:Request,management=false){
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw Error('Accounting sign-in required');
 const {data,error}=await admin.auth.getUser(token);if(error||!data.user)throw Error('Accounting session expired');
 const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const allowed=await user.rpc('can_action113',{p_target:management?'settings-accounting':'journal',p_action:management?'view':'post'});
 const workspace=await user.rpc('accounting_workspace_allowed123');
 if(allowed.error||allowed.data!==true||workspace.error||workspace.data!==true)throw Error('Accounting permission required');
 if(management){const r=await user.rpc('is_admin');if(r.error||r.data!==true)throw Error('Administrator required');}
 return {id:data.user.id,user};
}
async function connection(sheet:string){return checked(await admin.from('google_connections143150').select('*').eq('sheet',sheet).maybeSingle());}
async function googleToken(c:any){
 if(!c?.refresh_token)throw Error('Connect Google once to activate background checks.');
 if(c.access_token&&Date.parse(c.expires_at)>Date.now()+60000)return decrypt(c.access_token);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientID(),client_secret:clientSecret(),refresh_token:await decrypt(c.refresh_token),grant_type:'refresh_token'})});
 const t=await r.json();if(!r.ok||!t.access_token)throw Error('Google authorization expired or was revoked. Reconnect Google.');
 checked(await admin.from('google_connections143150').update({access_token:await encrypt(t.access_token),expires_at:new Date(Date.now()+t.expires_in*1000).toISOString(),...(t.refresh_token?{refresh_token:await encrypt(t.refresh_token)}:{})}).eq('sheet',c.sheet));return t.access_token;
}
async function sheetRequest(c:any,path:string,method='GET',body?:unknown){
 const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(c.sheet)+path,{method,headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('Google Sheets request failed ('+r.status+'). Check workbook access or reconnect Google.');return r.status===204?{}:r.json();
}
async function poll(c:any){
 const data=await sheetRequest(c,'/values/Drafts!A1:N10002?valueRenderOption=UNFORMATTED_VALUE'),rows=data.values||[];
 if(rows.length>10001||rows[0]?.[0]!=='draft_id')throw Error('Draft sheet headers or row limit need review.');
 const groups=new Map<string,any>();for(const row of rows.slice(1)){if(!row[0])continue;if(!/^[\w-]{8,64}$/.test(row[0]))throw Error('A draft ID needs correction in Google Sheets.');if(!groups.has(row[0]))groups.set(row[0],{noticeId:row[0],type:'AI Journal draft',title:String(row[2]||'Journal draft'),detail:String(row[1]||''),target:'ai-journal'});}
 const ids=[...groups.keys()];for(let i=0;i<ids.length;i+=100){const receipts=checked(await admin.from('operation_receipts14228').select('request_key').eq('operation','journal').in('request_key',ids.slice(i,i+100).map(id=>'drive-v1:'+c.sheet+':'+id)));for(const r of receipts)groups.delete(r.request_key.slice(('drive-v1:'+c.sheet+':').length));}
 checked(await admin.from('google_inbox143150').upsert({sheet:c.sheet,notices:[...groups.values()],checked_at:new Date().toISOString(),error:null}));return {count:groups.size};
}
// Only the fixed configured workbook and the three journal tabs are reachable.
async function proxy(c:any,path:string,method:string,body:any){
 const decoded=decodeURIComponent(path);
 if(method==='GET'&&(decoded==='?fields=sheets.properties'||/^\/values\/(?:Drafts!A1:N10002|'Posted Archive'!A1:P10002)\?valueRenderOption=UNFORMATTED_VALUE$/.test(decoded)))return sheetRequest(c,path);
 if(method==='POST'&&decoded==="/values/'Posted Archive'!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS"&&Array.isArray(body?.values)&&body.values.length<=500&&body.values.every((r:any)=>Array.isArray(r)&&r.length===16&&r[14]==='Posted'))return sheetRequest(c,path,method,body);
 if(method==='POST'&&path===':batchUpdate'&&Array.isArray(body?.requests)&&body.requests.length<=501){
  const meta=await sheetRequest(c,'?fields=sheets.properties'),tabs=Object.fromEntries(meta.sheets.map((s:any)=>[s.properties.title,s.properties.sheetId]));
  const valid=body.requests.every((r:any)=>{
   if(Object.keys(r).length!==1)return false;
   const d=r.deleteDimension?.range;if(d)return d.sheetId===tabs.Drafts&&d.dimension==='ROWS'&&Number.isInteger(d.startIndex)&&d.startIndex>=1&&d.endIndex===d.startIndex+1;
   const u=r.updateCells;if(u)return u.range?.sheetId===tabs.Accounts&&u.range.startRowIndex===0&&u.range.startColumnIndex===0&&u.range.endColumnIndex===8&&u.range.endRowIndex<=20000&&u.fields==='userEnteredValue'&&Array.isArray(u.rows)&&u.rows.length<=10001;
   const p=r.updateSheetProperties;return p?.properties?.sheetId===tabs.Accounts&&p.fields==='gridProperties.rowCount'&&Number.isInteger(p.properties.gridProperties?.rowCount)&&p.properties.gridProperties.rowCount<=10001;
  });if(valid)return sheetRequest(c,path,method,body);
 }
 throw Error('Unsupported journal sheet operation');
}
export async function handler(req:Request){
 try{
  if(req.headers.get('origin')&&req.headers.get('origin')!==origin)throw Error('Origin not allowed');
  if(req.method==='OPTIONS')return new Response(null,{headers});
  const endpoint=new URL(req.url).pathname.split('/').pop();
  if(endpoint==='google-oauth-callback'){
   const params=new URL(req.url).searchParams,state=params.get('state')||'';
   if(!/^[a-f0-9-]{72,74}$/.test(state))throw Error('Invalid authorization state');
   const saved=checked(await admin.from('google_states143150').delete().eq('state_hash',await hash(state)).gt('expires_at',new Date().toISOString()).select().maybeSingle());
   if(!saved)throw Error('Authorization expired. Start Connect Google again.');
   if([`documents202:${saved.owner}`,`documents202:${saved.owner}:native214`,`documents202:${saved.owner}:native215`].includes(saved.sheet)){const {finishDocumentOAuth}=await import('../_shared/documents202.ts');return finishDocumentOAuth(saved,params);}
   const profile=checked(await admin.from('profiles').select('role,status').eq('id',saved.owner).single());if(profile.role!=='admin'||profile.status!=='active')throw Error('Active administrator required');
   if(params.has('error'))throw Error('Google authorization cancelled.');
   const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientID(),client_secret:clientSecret(),redirect_uri:redirect,grant_type:'authorization_code',code:params.get('code')||''})});const token=await r.json();
   if(!r.ok||!token.access_token||!token.refresh_token)throw Error('Google did not grant background access. Try Connect Google again.');
   const identity=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+token.access_token}});const info=await identity.json();
   if(!identity.ok||info.email!=='oonjaimarketplace@gmail.com'||info.email_verified!==true)throw Error('Choose the Oon Jai Marketplace company Google account.');
   if(!String(token.scope).split(' ').includes('https://www.googleapis.com/auth/spreadsheets'))throw Error('Google Sheets permission required');
   const cfg=await settings();if(cfg.sheet!==saved.sheet||cfg.client!==clientID())throw Error('Connection settings changed. Start again.');
   const candidate={sheet:cfg.sheet,owner:saved.owner,email:info.email,refresh_token:await encrypt(token.refresh_token),access_token:await encrypt(token.access_token),expires_at:new Date(Date.now()+token.expires_in*1000).toISOString()};
   await sheetRequest(candidate,'?fields=sheets.properties');checked(await admin.from('google_connections143150').upsert(candidate));
   await poll(candidate);return new Response(null,{status:303,headers:{Location:home+'?google_connected=1','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if(req.method==='GET')return reply({configured:!!clientID()&&!!clientSecret()});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const text=await req.text();if(text.length>2000000)throw Error('Request too large');const body=JSON.parse(text||'{}');
  if(endpoint==='google-journal-bridge'&&body.action==='poll'){
   const result=await admin.rpc('google_poll_key143150');if(result.error||!result.data||req.headers.get('Authorization')!=='Bearer '+result.data)throw Error('Invalid background authorization');
   const cfg=await settings(),c=await connection(cfg.sheet);if(!c)return reply({connected:false});
   try{return reply(await poll(c));}catch(e){checked(await admin.from('google_inbox143150').upsert({sheet:cfg.sheet,error:(e as Error).message}));throw e;}
  }
  const a=await auth(req,endpoint==='google-oauth-start'),cfg=await settings();
  if(endpoint==='google-oauth-start'){
   if(!clientID()||!clientSecret())throw Error('Server Google OAuth credentials must be configured first.');
   if(cfg.client!==clientID())throw Error('Saved Google client ID does not match server configuration.');
   const state=crypto.randomUUID()+crypto.randomUUID();checked(await admin.from('google_states143150').delete().lt('expires_at',new Date().toISOString()));
   checked(await admin.from('google_states143150').insert({state_hash:await hash(state),owner:a.id,sheet:cfg.sheet,expires_at:new Date(Date.now()+600000).toISOString()}));
   const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');target.search=new URLSearchParams({client_id:clientID(),redirect_uri:redirect,response_type:'code',scope,access_type:'offline',prompt:'consent select_account',state,login_hint:'oonjaimarketplace@gmail.com'}).toString();return reply({authorization_url:target.href});
  }
  const c=await connection(cfg.sheet);
  if(body.action==='status')return reply({connected:!!c,configured:!!clientID()&&!!clientSecret(),email:c?.email||''});
  if(!c)throw Error('Connect Google once to activate background checks.');
  if(body.action==='request'){if(body.sheet!==cfg.sheet)throw Error('Submission sheet changed. Refresh settings.');return reply(await proxy(c,String(body.path||''),body.method||'GET',body.body));}
  throw Error('Unsupported action');
 }catch(e){return reply({error:(e as Error).message||'Google connection unavailable'},400);}
}
