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
export {admin,auth,connection,googleToken,hash,reply,encrypt,clientID,clientSecret};
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
 const t=await r.json().catch(()=>({}));if(!r.ok||!t.access_token){
  if(t.error==='invalid_grant')throw Error(String(c.sheet).startsWith('documents-company228:')?'Google requires the administrator to reconnect the company account in Accounting Settings. Your scans are kept.':'Google authorization expired or was revoked. Reconnect Google.');
  if(t.error==='invalid_client')throw Error('The Google app credentials need administrator attention.');
  throw Error('Google could not renew access right now. Retry when the connection is available.');
 }
 checked(await admin.from('google_connections143150').update({access_token:await encrypt(t.access_token),expires_at:new Date(Date.now()+t.expires_in*1000).toISOString(),...(t.refresh_token?{refresh_token:await encrypt(t.refresh_token)}:{})}).eq('sheet',c.sheet).eq('refresh_token',c.refresh_token));return t.access_token;
}
async function sheetRequest(c:any,path:string,method='GET',body?:unknown){
 const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(c.sheet)+path,{method,headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw Error('Google Sheets request failed ('+r.status+'). Check workbook access or reconnect Google.');return r.status===204?{}:r.json();
}
// Account-save events copy the authoritative database chart to Google Sheets.
async function readAccounts(){
 const rows:any[]=[];
 for(let offset=0;;offset+=500){
  const page=checked(await admin.from('accounts').select('id,code,name,currency_code,currency_label,account_type,is_posting,is_active,account_purpose,parent_code,is_technical,description').eq('is_active',true).order('code').order('id').range(offset,offset+499));
  rows.push(...page);if(rows.length>10000)throw Error('Account list exceeds 10,000 accounts.');if(page.length<500)return rows;
 }
}
async function syncAccounts(c:any,accounts:any[]){
 const head=['account_id','account_code','name','currency','category','posting','purpose','refreshed_at'];
 const cells=accounts.map(a=>[a.id,a.code,a.name,a.currency_code,a.account_type,a.is_posting,a.account_purpose||'regular']);
 const previous=await sheetRequest(c,'/values/Accounts!A1:H10002?valueRenderOption=UNFORMATTED_VALUE');
 const old=previous.values||[];
 if(JSON.stringify(old[0])===JSON.stringify(head)&&JSON.stringify(old.slice(1).map((r:any[])=>r.slice(0,7)))===JSON.stringify(cells))return {count:accounts.length,changed:false};
 const meta=await sheetRequest(c,'?fields=sheets.properties'),tab=meta.sheets?.find((s:any)=>s.properties.title==='Accounts')?.properties;
 if(!tab)throw Error('Accounts tab is missing.');
 const stamp=new Date().toISOString(),values=[head,...cells.map(row=>[...row,stamp])],count=Math.max(values.length,old.length),requests:any[]=[];
 if(count>10001)throw Error('Accounts sheet exceeds its row limit.');
 if(count>tab.gridProperties.rowCount)requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount:count}},fields:'gridProperties.rowCount'}});
 requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:count,startColumnIndex:0,endColumnIndex:8},rows:values.map(row=>({values:row.map(v=>({userEnteredValue:typeof v==='boolean'?{boolValue:v}:typeof v==='number'?{numberValue:v}:{stringValue:String(v??'')}}))})),fields:'userEnteredValue'}});
 await sheetRequest(c,':batchUpdate','POST',{requests});return {count:accounts.length,changed:true};
}
// Publish only the configured workbook, from one database snapshot; never accept client rates.
async function syncAccountRates(c:any){
 const snapshot=checked(await admin.rpc('account_exchange_rates143186'));
 if(!snapshot||!Array.isArray(snapshot.accounts)||snapshot.accounts.length>10000)throw Error('Account rate snapshot is incomplete');
 const meta=await sheetRequest(c,'?fields=sheets.properties');
 const tab=meta.sheets?.find((s:any)=>s.properties.title==='Account Exchange Rates')?.properties;
 if(!tab)throw Error('Account Exchange Rates tab is missing');
 const headers=['Account ID','Code','Account','Currency','Foreign balance','LAK carrying value','Average rate (LAK/unit)','Rate status','As of','Database checked (UTC)','Last transaction date','Basis','Offline limitation'];
 const values=[headers,...snapshot.accounts.map((a:any)=>[a.account_id,a.account_code,a.account_name,a.currency,a.foreign_balance,a.lak_carrying_value,a.average_rate,a.rate_status,snapshot.as_of,snapshot.calculated_at,a.last_transaction_date,'Posted database records; current year with explicit opening entries','Unsynced device transactions are excluded. Recheck before posting.'])];
 const rows=values.map((row:any[])=>({values:row.map(v=>v==null?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v)}})}));
 const count=Math.max(tab.gridProperties.rowCount,rows.length),requests:any[]=[];
 if(count>tab.gridProperties.rowCount)requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount:count}},fields:'gridProperties.rowCount'}});
 requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:count,startColumnIndex:0,endColumnIndex:13},rows,fields:'userEnteredValue'}});
 await sheetRequest(c,':batchUpdate','POST',{requests});
 return {accounts:snapshot.accounts.length,calculated_at:snapshot.calculated_at};
}

// News is read only from the configured Google workbook; history comes from confirmed calendar records.
const newsHeaders=['news_id','revision','section','category','title','summary','location','start','end','confidence','event_status','sources_json','uncertainty','action_suggestion','checked_at'];
const historyHeaders=['news_id','revision','section','title','start','end','attendance_effect','calendar_status','approved_at','approved_by','summary','sources_json','approval_key','record_status'];
async function readNews(c:any){
 const r=await sheetRequest(c,'/values/'+encodeURIComponent("'News Drafts'!A1:O502")+'?valueRenderOption=UNFORMATTED_VALUE');
 const rows=r.values||[];if(JSON.stringify(rows[0])!==JSON.stringify(newsHeaders)||rows.length>501)throw Error('News Drafts headers or 500-item limit need review.');
 const items=rows.slice(1).filter((r:any[])=>r.some(v=>v!==''&&v!=null)).map((r:any[])=>{const v=Object.fromEntries(newsHeaders.map((k,i)=>[k,String(r[i]??'')]));let sources;try{sources=JSON.parse(v.sources_json)}catch{throw Error('News sources need valid JSON: '+v.news_id)}return {id:v.news_id,revision:v.revision,section:v.section,category:v.category,title:v.title,summary:v.summary,location:v.location,start:v.start||null,end:v.end||null,confidence:v.confidence,eventStatus:v.event_status||'scheduled',sources,uncertainty:v.uncertainty,restaurantIdea:v.action_suggestion,checkedAt:v.checked_at};});
 return {schema:1,language:'en',checkedAt:items.map((p:any)=>p.checkedAt).filter(Boolean).sort().at(-1)||new Date().toISOString().slice(0,10),items};
}
async function syncNewsHistory(c:any,user:any){
 const r=await user.from('hr_calendar_settings14306').select('data,version').eq('id',true).maybeSingle();if(r.error)throw Error('Calendar history could not be verified.');
 const data=r.data?.data||{},history=new Map<string,any>();
 for(const h of data.newsCalendarHistory143189||[])history.set(h.id+':'+h.newsRevision14309,h);
 for(const e of data.approvedCalendarNews14309||[]){const d=data.calendarNewsDecisions14309?.[e.id];if(e.newsRevision14309)history.set(e.id+':'+e.newsRevision14309,{...e,approvedAt:e.approvedAt||d?.at||e.updatedAt||'',approvedBy:e.approvedBy||''});}
 const values=[historyHeaders,...[...history].sort(([a],[b])=>a.localeCompare(b)).map(([key,e])=>[e.id,e.newsRevision14309||'',e.newsSection143189||'community',e.title,e.start,e.end,e.effect||'none',e.status||'scheduled',e.approvedAt||'',e.approvedBy||'',e.newsSummary143189||e.notes||'',JSON.stringify(e.sources||[]),key,'Added to Calendar'])];
 const old=await sheetRequest(c,'/values/'+encodeURIComponent("'News Calendar History'!A1:N10002")+'?valueRenderOption=UNFORMATTED_VALUE');
 if(JSON.stringify(old.values||[])===JSON.stringify(values))return {count:history.size};
 const meta=await sheetRequest(c,'?fields=sheets.properties'),tab=meta.sheets?.find((s:any)=>s.properties.title==='News Calendar History')?.properties;if(!tab)throw Error('News Calendar History tab is missing.');
 const count=Math.max(values.length,old.values?.length||1);if(count>10001)throw Error('News history exceeds 10,000 approvals.');
 const requests:any[]=[];if(count>tab.gridProperties.rowCount)requests.push({updateSheetProperties:{properties:{sheetId:tab.sheetId,gridProperties:{rowCount:count}},fields:'gridProperties.rowCount'}});
 requests.push({updateCells:{range:{sheetId:tab.sheetId,startRowIndex:0,endRowIndex:count,startColumnIndex:0,endColumnIndex:14},rows:values.map(row=>({values:row.map(v=>({userEnteredValue:{stringValue:String(v??'')}}))})),fields:'userEnteredValue'}});
 await sheetRequest(c,':batchUpdate','POST',{requests});return {count:history.size};
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
   const profile=checked(await admin.from('profiles').select('role,status').eq('id',saved.owner).single());if(profile.role!=='admin'||profile.status!=='active')throw Error('Active administrator required');
   if(params.has('error'))throw Error('Google authorization cancelled.');
   const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientID(),client_secret:clientSecret(),redirect_uri:redirect,grant_type:'authorization_code',code:params.get('code')||''})});const token=await r.json();
   if(!r.ok||!token.access_token||!token.refresh_token)throw Error('Google did not grant background access. Try Connect Google again.');
   const identity=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+token.access_token}});const info=await identity.json();
   const expectedEmail=String((await settings()).accountEmail228||'oonjaimarketplace@gmail.com').toLowerCase();if(!identity.ok||String(info.email||'').toLowerCase()!==expectedEmail||info.email_verified!==true)throw Error('Choose the company Google account saved in Accounting settings.');
   if(!String(token.scope).split(' ').includes('https://www.googleapis.com/auth/spreadsheets'))throw Error('Google Sheets permission required');
   const cfg=await settings();if(cfg.sheet!==saved.sheet||cfg.client!==clientID())throw Error('Connection settings changed. Start again.');
   const candidate={sheet:cfg.sheet,owner:saved.owner,email:info.email,refresh_token:await encrypt(token.refresh_token),access_token:await encrypt(token.access_token),expires_at:new Date(Date.now()+token.expires_in*1000).toISOString()};
   await sheetRequest(candidate,'?fields=sheets.properties');checked(await admin.from('google_connections143150').upsert(candidate));
   return new Response(null,{status:303,headers:{Location:home+'?google_connected=1','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if(req.method==='GET')return reply({configured:!!clientID()&&!!clientSecret()});
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const text=await req.text();if(text.length>2000000)throw Error('Request too large');const body=JSON.parse(text||'{}');
  const a=await auth(req,endpoint==='google-oauth-start'||body.action==='accounts-sync'),cfg=await settings();
  if(['news-read','news-history'].includes(body.action)){
   const role=await a.user.rpc('is_admin');if(role.error||role.data!==true)throw Error('News administrator required');
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in News and Events → Account & Handover.');
   let history:any;try{history=await syncNewsHistory(c,a.user)}catch(e){history={error:(e as Error).message}}
   if(body.action==='news-history')return reply({sheet:cfg.sheet,history});
   return reply({sheet:cfg.sheet,feed:await readNews(c),history});
  }
  if(body.action==='accounts-sync'){
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in Settings first.');
   const accounts=await readAccounts();await syncAccounts(c,accounts);return reply({sheet:cfg.sheet,accounts,accountHash:await hash(JSON.stringify(accounts))});
  }
  if(endpoint==='google-oauth-start'){
   if(!clientID()||!clientSecret())throw Error('Server Google OAuth credentials must be configured first.');
   if(cfg.client!==clientID())throw Error('Saved Google client ID does not match server configuration.');
   const state=crypto.randomUUID()+crypto.randomUUID();checked(await admin.from('google_states143150').delete().lt('expires_at',new Date().toISOString()));
   checked(await admin.from('google_states143150').insert({state_hash:await hash(state),owner:a.id,sheet:cfg.sheet,expires_at:new Date(Date.now()+600000).toISOString()}));
   const target=new URL('https://accounts.google.com/o/oauth2/v2/auth');target.search=new URLSearchParams({client_id:clientID(),redirect_uri:redirect,response_type:'code',scope,access_type:'offline',prompt:'consent select_account',state,login_hint:cfg.accountEmail228||'oonjaimarketplace@gmail.com'}).toString();return reply({authorization_url:target.href});
  }
  const c=await connection(cfg.sheet);
  if(body.action==='status')return reply({connected:!!c,configured:!!clientID()&&!!clientSecret(),email:c?.email||''});
  if(!c)throw Error('Connect Google once to activate background checks.');
  if(body.action==='rates-refresh')return reply(await syncAccountRates(c));
  throw Error('Unsupported action');
 }catch(e){return reply({error:(e as Error).message||'Google connection unavailable'},400);}
}
