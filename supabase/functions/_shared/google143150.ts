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
export {admin,auth,connection,googleToken,hash,reply};
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

async function poll(c:any){
 const data=await sheetRequest(c,'/values/Drafts!A1:A10002?valueRenderOption=UNFORMATTED_VALUE'),rows=data.values||[];
 if(rows.length>10001||rows[0]?.[0]!=='draft_id')throw Error('Draft sheet headers or row limit need review.');
 const positions=new Map<string,number>();for(let i=1;i<rows.length;i++){const id=String(rows[i][0]||'');if(!id)continue;if(!/^[\w-]{8,64}$/.test(id))throw Error('A draft ID needs correction in Google Sheets.');if(!positions.has(id))positions.set(id,i+1);}
 const ids=[...positions.keys()];for(let i=0;i<ids.length;i+=100){const receipts=checked(await admin.from('operation_receipts14228').select('request_key').eq('operation','journal').in('request_key',ids.slice(i,i+100).map(id=>'drive-v1:'+c.sheet+':'+id)));for(const r of receipts)positions.delete(r.request_key.slice(('drive-v1:'+c.sheet+':').length));}
 const previous=checked(await admin.from('google_inbox143150').select('notices').eq('sheet',c.sheet).maybeSingle());
 const groups=new Map<string,any>((previous?.notices||[]).filter((n:any)=>positions.has(n.noticeId)).map((n:any)=>[n.noticeId,n]));
 const missing=[...positions].filter(([id])=>!groups.has(id));for(let i=0;i<missing.length;i+=100){const batch=missing.slice(i,i+100),result=await sheetRequest(c,'/values:batchGet?'+batch.map(([,row])=>'ranges='+encodeURIComponent('Drafts!A'+row+':C'+row)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');for(let n=0;n<batch.length;n++){const row=result.valueRanges?.[n]?.values?.[0];if(!row||String(row[0])!==batch[n][0])throw Error('Draft rows moved during the notification check. The next check will retry.');groups.set(row[0],{noticeId:row[0],type:'AI Journal draft',title:String(row[2]||'Journal draft'),detail:String(row[1]||''),target:'ai-journal'});}}
 checked(await admin.from('google_inbox143150').upsert({sheet:c.sheet,notices:[...groups.values()],checked_at:new Date().toISOString(),error:null}));
 let rates:any;try{rates=await syncAccountRates(c);}catch(e){rates={error:(e as Error).message};}
 const issue=rates?.error||'';
 if(issue)checked(await admin.from('google_inbox143150').update({error:issue}).eq('sheet',c.sheet));
 return {count:groups.size,rates};
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
  });if(valid){
   // Older browsers may send an old cached chart. Replace it from the database.
   const chartWrite=body.requests.some((r:any)=>r.updateCells||r.updateSheetProperties);
   if(chartWrite){if(body.requests.some((r:any)=>r.deleteDimension))throw Error('Do not mix chart and draft changes.');return syncAccounts(c,await readAccounts());}
   return sheetRequest(c,path,method,body);
  }
 }
 throw Error('Unsupported journal sheet operation');
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
  const a=await auth(req,endpoint==='google-oauth-start'||body.action==='accounts-sync'),cfg=await settings();
  if(['news-read','news-history'].includes(body.action)){
   const role=await a.user.rpc('is_admin');if(role.error||role.data!==true)throw Error('News administrator required');
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in AI Journal to load news.');
   let history:any;try{history=await syncNewsHistory(c,a.user)}catch(e){history={error:(e as Error).message}}
   if(body.action==='news-history')return reply({sheet:cfg.sheet,history});
   return reply({sheet:cfg.sheet,feed:await readNews(c),history});
  }
  if(body.action==='accounts-sync'){
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in Settings first.');
   const accounts=await readAccounts();await syncAccounts(c,accounts);return reply({sheet:cfg.sheet,accounts,accountHash:await hash(JSON.stringify(accounts))});
  }
  if(body.action==='inboxes-read'){
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in Settings first.');
   const isAdmin=await a.user.rpc('is_admin');if(isAdmin.error)throw Error('HR permission check failed');
   const known=body.sheet===cfg.sheet?body.hashes||{}:{};
   async function delta(values:any[],name:string){
    if(values.length>10001)throw Error(name+' inbox exceeds its row limit.');
    const groups=new Map<string,any[]>();for(const row of values.slice(1)){if(!row.some((v:any)=>v!==''&&v!=null))continue;const id=String(row[0]||'');if(!id)throw Error(name+' request ID is missing.');if(!groups.has(id))groups.set(id,[]);groups.get(id)!.push(row);}
    const changed=[];for(const [id,rows] of groups){const digest=await hash(JSON.stringify(rows));if(known[name]?.[id]!==digest)changed.push({id,rows,hash:digest});}
    return {header:values[0]||[],ids:[...groups.keys()],changed};
   }
   let journal:any,hr:any=null;
   if(body.missingOnly===true){
    const names=isAdmin.data===true?['journal','hr']:['journal'],tabs:any={journal:'Drafts',hr:"'HR Submission Inbox'"},ends:any={journal:'N',hr:'T'};
    const index=await sheetRequest(c,'/values:batchGet?'+names.map(name=>'ranges='+encodeURIComponent(tabs[name]+'!A1:A10002')).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');
    const output:any={};
    for(let n=0;n<names.length;n++){const name=names[n],values=index.valueRanges?.[n]?.values||[];if(values.length>10001)throw Error(name+' inbox exceeds its row limit.');const ids=[...new Set<string>(values.slice(1).filter((r:any)=>r[0]!==''&&r[0]!=null).map((r:any)=>String(r[0])))];
     const versions=name==='hr'&&body.sheet===cfg.sheet?body.hrVersions||{}:{};
     const ranges:string[]=[],blocks:number[][]=[];let start=-1,last=-1;
     for(let i=1;i<values.length;i++){const id=String(values[i]?.[0]||'');if(id&&!Object.prototype.hasOwnProperty.call(known[name]||{},id)&&!Object.prototype.hasOwnProperty.call(versions,id)){if(start<0)start=i;last=i;}else if(start>=0){blocks.push([start,last]);start=-1;}}
     if(start>=0)blocks.push([start,last]);
     let header=body.sheet===cfg.sheet?body.headers?.[name]:null;const needsHeader=!Array.isArray(header)||!header.length;if(needsHeader)ranges.push(tabs[name]+'!A1:'+ends[name]+'1');
     for(const [from,to]of blocks)ranges.push(tabs[name]+'!A'+(from+1)+':'+ends[name]+(to+1));
     const rows:any[]=[];for(let offset=0;offset<ranges.length;offset+=100){const data=await sheetRequest(c,'/values:batchGet?'+ranges.slice(offset,offset+100).map(r=>'ranges='+encodeURIComponent(r)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');for(let j=0;j<(data.valueRanges||[]).length;j++){const part=data.valueRanges[j].values||[];if(needsHeader&&offset===0&&j===0)header=part[0]||[];else rows.push(...part);}}
     output[name]={...await delta([header||[],...rows],name),ids};
    }
    journal=output.journal;hr=output.hr||null;
    const statuses=await a.user.rpc('drive_draft_dispositions143160',{p_sheet:cfg.sheet});if(statuses.error)throw Error('Journal review status unavailable');journal.dispositions=statuses.data||[];
   }else{
    const ranges=['Drafts!A1:N10002',...(isAdmin.data===true?["'HR Submission Inbox'!A1:T10002"]:[])];
    const source=await sheetRequest(c,'/values:batchGet?'+ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&')+'&valueRenderOption=UNFORMATTED_VALUE');
    journal=await delta(source.valueRanges?.[0]?.values||[],'journal');if(isAdmin.data===true)hr=await delta(source.valueRanges?.[1]?.values||[],'hr');
   }
   if(isAdmin.data===true){const versions=body.sheet===cfg.sheet?body.hrVersions||{}:{};const changedIds=[];
    for(let offset=0;;offset+=500){const r=await a.user.from('hr_inbox143168').select('request_id,version').eq('sheet',cfg.sheet).order('request_id').range(offset,offset+499);if(r.error)throw Error('HR versions unavailable');for(const row of r.data)if(versions[row.request_id]!==row.version)changedIds.push(row.request_id);if(r.data.length<500)break;}
    hr.records=[];for(let offset=0;offset<changedIds.length;offset+=100){const r=await a.user.from('hr_inbox143168').select('*').eq('sheet',cfg.sheet).in('request_id',changedIds.slice(offset,offset+100));if(r.error)throw Error('HR drafts unavailable');hr.records.push(...r.data);}
   }
   // Routine inbox checks never scan or copy the chart. Explicit opening/refresh reads it once.
   if(body.refreshAccounts===true){const accounts=await readAccounts();journal.accounts=accounts;journal.accountHash=await hash(JSON.stringify(accounts));}
   if(!journal.dispositions){const statuses=await a.user.rpc('drive_draft_dispositions143160',{p_sheet:cfg.sheet});if(statuses.error)throw Error('Journal review status unavailable');journal.dispositions=statuses.data||[];}
   return reply({sheet:cfg.sheet,journal,hr});
  }
  if(['hr-read','hr-status'].includes(body.action)){
   const isAdmin=await a.user.rpc('is_admin');if(isAdmin.error||isAdmin.data!==true)throw Error('HR administrator required');
   const c=await connection(cfg.sheet);if(!c)throw Error('Connect Google in Settings first.');
   const source=await sheetRequest(c,"/values/"+encodeURIComponent("'HR Submission Inbox'!A1:T10002")+'?valueRenderOption=UNFORMATTED_VALUE');
   if(source.values?.length>10001)throw Error('HR inbox exceeds 10,000 rows.');
   if(body.action==='hr-read')return reply({sheet:cfg.sheet,values:source.values||[]});
   const records=[];for(let offset=0;;offset+=500){const r=await a.user.from('hr_inbox143168').select('request_id,status,updated_at,updated_by,data,source').eq('sheet',cfg.sheet).order('request_id').range(offset,offset+499);if(r.error)throw Error('HR status unavailable');records.push(...r.data);if(r.data.length<500)break;}
   const byId=new Map(records.map(r=>[r.request_id,r]));const data=(source.values||[]).slice(1).flatMap((row:any,i:number)=>{const r=byId.get(row[0]);return r?[{range:"'HR Submission Inbox'!R"+(i+2)+':T'+(i+2),values:[[r.status,r.updated_at,r.updated_by||'']]}]:[];});
   if(data.length)await sheetRequest(c,'/values:batchUpdate','POST',{valueInputOption:'RAW',data});
   // The source is retained; reviewed details feed separate draft/history views.
   const meta=await sheetRequest(c,'?fields=sheets.properties'),review=meta.sheets?.find((s:any)=>s.properties.title==='HR Reviewed Data')?.properties;
   if(!review)throw Error('HR Reviewed Data tab is missing. Restore the HR workbook tabs.');
   if(records.length>10000)throw Error('HR review history exceeds 10,000 requests.');
   const people=await a.user.from('payroll_employees').select('id,data');if(people.error)throw Error('Employee names could not be refreshed');
   const names=new Map((people.data||[]).map((e:any)=>[e.id,e.data.name]));
   const rows=records.map((r:any)=>{const d=r.data;return [r.request_id,d.type,d.scope==='all'?'all':(d.employeeIds||[]).join(';'),d.scope==='all'?'All active employees':(d.employeeIds||[]).map((id:string)=>names.get(id)||id).join('; '),d.start,d.end,d.reason,d.work,d.pay,d.status,d.minutes,d.amount,d.currency,d.adjustment,d.leaveType,d.notes,JSON.stringify(d.exceptions||[]),r.status,r.updated_at,r.updated_by||''].map(v=>({userEnteredValue:{stringValue:String(v??'')}}));});
   await sheetRequest(c,':batchUpdate','POST',{requests:[{updateCells:{range:{sheetId:review.sheetId,startRowIndex:1,endRowIndex:review.gridProperties.rowCount,startColumnIndex:0,endColumnIndex:20},rows:rows.map(values=>({values})),fields:'userEnteredValue'}}]});
   return reply({updated:data.length,drafts:records.filter(r=>r.status==='pending').length,history:records.filter(r=>r.status!=='pending').length});
  }
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
  if(body.action==='rates-refresh')return reply(await syncAccountRates(c));
  if(body.action==='request'){if(body.sheet!==cfg.sheet)throw Error('Submission sheet changed. Refresh settings.');return reply(await proxy(c,String(body.path||''),body.method||'GET',body.body));}
  throw Error('Unsupported action');
 }catch(e){return reply({error:(e as Error).message||'Google connection unavailable'},400);}
}
