import {storageState231,ensureYear231,storageRPC231} from './storage231.ts';
import {receiptYear231} from './receipt-year231.ts';
// Drive documents are isolated from the journal Sheets connection and from other users.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {admin,connection,googleToken,hash,reply,encrypt,clientID,clientSecret} from './google143150.ts';
const ORIGIN='https://oonjai-marketplace.github.io',HOME=ORIGIN+'/Accounting/scan.html',DRIVE='https://www.googleapis.com/drive/v3',SCOPE='https://www.googleapis.com/auth/drive';
const redirect=()=>Deno.env.get('SUPABASE_URL')+'/functions/v1/google-oauth-callback';
const checked=(r:any)=>{if(r.error)throw Error('Document connection storage unavailable');return r.data;};
export const docKey=(owner:string)=>'documents202:'+owner;
const candidateKey228=(owner:string)=>'documents-admin228:'+owner;
async function companySettings228(){const row=checked(await admin.from('budget_settings14313').select('data').eq('id',true).maybeSingle());return row?.data?.googleSheets143129||{};}
async function manage228(owner:string,req?:Request){const p=await profile(owner);if(p.role!=='admin')throw Error('Administrator required.');if(req){const user=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}},auth:{persistSession:false,autoRefreshToken:false}});const allowed=await user.rpc('can_action113',{p_target:'settings-accounting',p_action:'edit'});if(allowed.error||allowed.data!==true)throw Error('Administrator settings access is required.');}}
export function destination228(cfg:any){const value=cfg?.receiptDrive228?.active;if(!value||!/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]{10,160}$/.test(String(value.folderURL||''))||!value.email)return null;const id=value.folderURL.split('/').pop();if(!/^documents-company228:[\w-]+:[\w-]+$/.test(String(value.connectionKey||'')))return null;return {id,name:String(value.name||'Company receipts').slice(0,180),email:String(value.email).toLowerCase(),folderURL:value.folderURL,connectionKey:value.connectionKey,annual231:value.annual231===true};}
function desktopReturn228(result:string,returnToApp=true){
 if(!returnToApp){
  const messages:Record<string,string>={
   active:'The company receipt folder is connected for every phone. You can close this window.',
   authorized:'Google access is saved. Return to Accounting Settings and verify the receipt folder.',
   cancelled:'Google authorization was cancelled. You can close this window.',
   'wrong-account':'Choose the Google account saved in Accounting Settings.',
   'folder-check':'Google access is saved. Check whether this account can add files to the receipt folder.',
   retry:'Google authorization could not finish. Return to Accounting Settings and try again.'
  };
  return new Response(messages[result]||messages.retry,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }
 const target=new URL('/Accounting/integrations/receipt-drive-result.html',ORIGIN);
 target.hash=result;
 return new Response(null,{status:303,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
async function persistReceiptSettings(owner:string,expected:any,email:string,folderURL:string,active:any=null){
 const r=await admin.rpc('save_receipt_destination_settings',{p_actor:owner,p_expected:expected,p_email:email,p_folder:folderURL,p_active:active});
 if(r.error)throw Error(r.error.message);
 return r.data;
}
async function renewReceiptDestination(cfg:any,candidate:any){
 const destination=destination228(cfg);
 if(!destination||destination.annual231||destination.email!==candidate.email.toLowerCase()||
    cfg.accountEmail228?.toLowerCase()!==destination.email||cfg.receiptDrive228.folderURL!==destination.folderURL)return false;
 const previous=await connection(destination.connectionKey);
 if(!previous||previous.owner!==candidate.owner||previous.email.toLowerCase()!==destination.email)return false;
 const target=await folder(candidate,destination.id);
 if(!target.capabilities?.canAddChildren)throw Error('The saved folder is read-only.');
 const {refresh_token,access_token,expires_at}=candidate;
 const result=await admin.from('google_connections143150').update({refresh_token,access_token,expires_at})
  .eq('sheet',destination.connectionKey).eq('owner',candidate.owner).eq('refresh_token',previous.refresh_token).select('sheet').maybeSingle();
 return !!checked(result);
}
export function fileID(value:any){if(!/^[\w-]{10,160}$/.test(String(value||''))&&value!=='root')throw Error('Choose a valid Google Drive folder or file.');return String(value);}
export function fileName(value:any){const name=String(value||'').trim();if(!name||name.length>180||/[\x00-\x1f/\\]/.test(name))throw Error('Enter a name without slashes, up to 180 characters.');return name;}
export function resumableURL(value:any){const u=new URL(String(value));if(u.origin!=='https://www.googleapis.com'||!/^\/upload\/drive\/v3\/files(?:\/[\w-]+)?$/.test(u.pathname)||!u.searchParams.has('upload_id'))throw Error('Invalid upload session');return u.href;}
async function profile(owner:string){const p=checked(await admin.from('profiles').select('id,role,status').eq('id',owner).maybeSingle());if(p?.status!=='active')throw Error('Active Accounting account required.');return p;}
async function actor(req:Request){const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');if(!token)throw Error('Sign in to Accounting first.');const {data,error}=await admin.auth.getUser(token);if(error||!data.user)throw Error('Accounting session expired. Sign in again.');await profile(data.user.id);const user=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});const permissions=await Promise.all(['sub-users-workspace','journal'].map(p_target=>user.rpc('can_action113',{p_target,p_action:'view'})));if(!permissions.some(r=>!r.error&&r.data===true))throw Error('Accounting workspace permission required.');return data.user.id;}
async function drive(c:any,path:string,method='GET',body?:any){const response=await fetch(DRIVE+path,{method,headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});if(!response.ok){const e=await response.json().catch(()=>({}));throw Error('Google Drive: '+String(e.error?.message||response.status).slice(0,300));}return response.status===204?{}:response.json();}
const fields='id,name,mimeType,parents,trashed,webViewLink,size,md5Checksum,sha256Checksum,version,appProperties,capabilities(canAddChildren,canRename,canEdit)';
async function item(c:any,id:string){return drive(c,'/files/'+fileID(id)+'?supportsAllDrives=true&fields='+encodeURIComponent(fields));}
async function folder(c:any,id:string){const f=await item(c,id);if(f.trashed||f.mimeType!=='application/vnd.google-apps.folder')throw Error('Choose an existing Drive folder.');return f;}
// Return the selected folder and its actual ancestry. Folder IDs distinguish duplicate names.
async function folderTrail(c:any, selected:any) {
 const root=await folder(c,'root'), trail:{id:string,name:string}[]=[], seen=new Set<string>();
 let current=selected;
 while(current && !seen.has(current.id) && trail.length<100) {
  seen.add(current.id);
  trail.unshift({id:current.id,name:current.id===root.id?'My Drive':current.name});
  if(current.id===root.id || !current.parents?.length)return trail;
  const parent=current.parents[0];
  if(parent===root.id){trail.unshift({id:root.id,name:'My Drive'});return trail;}
  try{current=await folder(c,parent);}catch(error){
   if(!/not found|insufficient|permission|forbidden|403|404/i.test(String(error)))throw error;
   break;
  }
 }
 trail.unshift({id:'',name:'…'});
 return trail;
}
async function browseDriveFolders(c:any,b:any,lockedFolder?:string) {
 const current=await folder(c,lockedFolder||fileID(b.parent||'root'));
 const q="'"+current.id+"' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'";
 const [trail,listing]=await Promise.all([folderTrail(c,current),lockedFolder?{files:[]}:drive(c,'/files?'+new URLSearchParams({
  q,fields:'nextPageToken,files(id,name,parents,capabilities(canAddChildren,canRename))',orderBy:'name',pageSize:'100',supportsAllDrives:'true',includeItemsFromAllDrives:'true',
  ...(b.pageToken?{pageToken:String(b.pageToken)}:{})
 }))]);
 const path=trail.map(part=>part.name).join(' › ');
 // Installed Android versions use parent.name for both the chooser heading and saved destination.
 const parent={...current,name:b.folderPicker===true?current.name:path,...(lockedFolder?{parents:[]}:{}),path};
 return {parent,...listing,trail:lockedFolder?trail.map(part=>({name:part.name})):trail,locked:!!lockedFolder};
}
export async function finishDocumentOAuth(saved:any,params:URLSearchParams){
 const returnHome=saved.sheet===docKey(saved.owner)+':native215'?'oonjai-accounting-preview://scan':saved.sheet===docKey(saved.owner)+':native214'?'oonjai-accounting://scan':HOME;
 const returnToApp=saved.sheet===docKey(saved.owner)+':desktopProtected';
 const desktop=returnToApp||saved.sheet===docKey(saved.owner)+':desktop228';
 let failure='retry';
 try{await profile(saved.owner);if(desktop)await manage228(saved.owner);if(![docKey(saved.owner),docKey(saved.owner)+':native214',docKey(saved.owner)+':native215',docKey(saved.owner)+':desktop228',docKey(saved.owner)+':desktopProtected'].includes(saved.sheet))throw Error('Invalid document authorization.');if(params.has('error')){failure='cancelled';throw Error('Google connection cancelled. Your scans are still on this device.');}
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:clientID(),client_secret:clientSecret(),redirect_uri:redirect(),grant_type:'authorization_code',code:params.get('code')||''})});const t=await response.json();if(!response.ok||!t.access_token||!t.refresh_token)throw Error('Google did not grant persistent document access. Connect again.');if(!String(t.scope).split(' ').includes(SCOPE))throw Error('Allow Google Drive access to browse folders and save scans.');
 const identity=await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:'Bearer '+t.access_token}}),info=await identity.json();if(!identity.ok||!info.email||info.email_verified!==true)throw Error('Google account identity could not be verified.');
 const cfg=desktop?await companySettings228():null;
 if(desktop&&cfg.accountEmail228&&String(info.email).toLowerCase()!==String(cfg.accountEmail228).toLowerCase()){failure='wrong-account';throw Error('Choose the Google account saved in Accounting settings.');}
 const candidate={sheet:desktop?candidateKey228(saved.owner):docKey(saved.owner),owner:saved.owner,email:info.email.toLowerCase(),refresh_token:await encrypt(t.refresh_token),access_token:await encrypt(t.access_token),expires_at:new Date(Date.now()+t.expires_in*1000).toISOString()};
 checked(await admin.from('google_connections143150').upsert(candidate));
 if(desktop){failure='folder-check';return desktopReturn228(await renewReceiptDestination(cfg,candidate)?'active':'authorized',returnToApp);}
 return new Response(null,{status:303,headers:{Location:returnHome+'?connected=1','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 }catch(e){if(desktop)return desktopReturn228(failure,returnToApp);return new Response(null,{status:303,headers:{Location:returnHome+'?connection_error='+encodeURIComponent(e.message),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
}
export async function documentHandler(req:Request){
 const origin=req.headers.get('origin')||'';
 if(origin&&!['https://oonjai-marketplace.github.io','https://localhost','capacitor://localhost'].includes(origin))return reply({error:'Origin not allowed.'},403);
 const response=await documentHandler214(req);
 if(origin)response.headers.set('Access-Control-Allow-Origin',origin);
 return response;
}
async function documentHandler214(req:Request){
 try{if(req.method==='OPTIONS')return reply({});if(req.method!=='POST')return reply({error:'Use POST'},405);const owner=await actor(req);const raw=await req.text();if(raw.length>20000)throw Error('Request too large.');const b=JSON.parse(raw||'{}'),key=docKey(owner),personal=await connection(key);if(personal&&personal.owner!==owner)throw Error('Connection owner mismatch.');const cfg=await companySettings228(),destination=destination228(cfg);let c=personal;if(destination&&!(['connect','verify-destination228','save-receipt-details','app-update217'].includes(b.action))){c=await connection(destination.connectionKey);if(!c||c.email.toLowerCase()!==destination.email)throw Error('The company Drive connection needs administrator attention. Your scans are kept.');await manage228(c.owner);}
 // Only the administrator who connected this Drive may choose another folder for their own scans.
 let canChooseCompanyFolder=false;
 if(destination && !destination.annual231 && c?.owner===owner && ['status','folders','folder','create-folder','upload-start'].includes(b.action)){
  try{await manage228(owner,req);canChooseCompanyFolder=true;}catch{ /* Fall back to the protected company destination. */ }
 }
 if(b.action==='status'){
  const nativeLegacy=['https://localhost','capacitor://localhost'].includes(req.headers.get('origin')||'') && b.folderPicker!==true;
  const company=destination?{id:destination.id,name:destination.name,email:destination.email,folderURL:destination.folderURL}:null;
  // Earlier APKs force-reset a selected folder on every status call when this legacy field is set.
  return reply({connected:!!c,email:c?.email||'',configured:!!clientID()&&!!clientSecret(),
   companyDestination228:canChooseCompanyFolder && nativeLegacy?null:company,companyDefaultFolder:company,
   companyManaged228:!!destination && !(canChooseCompanyFolder && nativeLegacy),canChooseCompanyFolder,annual231:destination?.annual231===true});
 }
 if(b.action==='check-receipt-access'){
  await manage228(owner,req);
  if(!destination||!c)throw Error('Verify and activate the receipt folder first.');
  const target=await folder(c,destination.id);
  if(!target.capabilities?.canAddChildren)throw Error('The saved receipt folder is read-only for the company account.');
  return reply({ready:true,email:destination.email,name:target.name});
 }
 if(b.action==='save-receipt-details'){
  await manage228(owner,req);
  return reply({settings:await persistReceiptSettings(owner,b.expected,b.email,b.folderURL)});
 }
 if(b.action==='verify-destination228'){
  if(destination?.annual231)throw Error('Automatic yearly storage is active. Use its company storage controls to change the destination.');
  await manage228(owner,req);const candidate=await connection(candidateKey228(owner))||personal,link=String(cfg.receiptDrive228?.folderURL||'');
  if(!/^https:\/\/drive\.google\.com\/drive\/folders\/[\w-]{10,160}$/.test(link))throw Error('Save a valid receipt folder link first.');
  if(!candidate)throw Error('Details are saved. Connect Google when authorization is available.');
  if(candidate.owner!==owner||cfg.accountEmail228&&candidate.email.toLowerCase()!==String(cfg.accountEmail228).toLowerCase())throw Error('Connect the Google account saved in these settings first.');
  const f=await folder(candidate,link.split('/').pop()!);if(!f.capabilities?.canAddChildren)throw Error('This account cannot save files in that folder. Ask the folder owner for access.');
  const snapshot='documents-company228:'+owner+':'+crypto.randomUUID();checked(await admin.from('google_connections143150').insert({...candidate,sheet:snapshot}));
  const verified={id:f.id,name:f.name,email:candidate.email,folderURL:link,connectionKey:snapshot};
  if(b.activate===true){
   const settings=await persistReceiptSettings(owner,b.expected,candidate.email,link,verified);
   return reply({destination:verified,settings});
  }
  return reply({destination:verified});
 }
 if(b.action==='connect'){if(b.desktop228===true)await manage228(owner,req);else if(destination)throw Error('The company Drive connection is managed in desktop Settings.');if(!clientID()||!clientSecret())throw Error('Google authorization is not configured.');const state=crypto.randomUUID()+crypto.randomUUID();checked(await admin.from('google_states143150').delete().lt('expires_at',new Date().toISOString()));checked(await admin.from('google_states143150').insert({state_hash:await hash(state),owner,sheet:b.desktop228===true?key+(b.returnToApp===true?':desktopProtected':':desktop228'):b.native215===true?key+':native215':b.native214===true?key+':native214':key,expires_at:new Date(Date.now()+600000).toISOString()}));const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');u.search=new URLSearchParams({client_id:clientID(),redirect_uri:redirect(),response_type:'code',scope:SCOPE+' https://www.googleapis.com/auth/userinfo.email',access_type:'offline',prompt:'consent select_account',state,login_hint:b.desktop228===true?(cfg.accountEmail228||personal?.email||''):(c?.email||'oonjaimarketplace@gmail.com')}).toString();return reply({authorization_url:u.href});}
 if(b.action==='disconnect'){if(destination)throw Error('The company connection is managed in desktop Settings.');checked(await admin.from('google_connections143150').delete().eq('sheet',key).eq('owner',owner));return reply({disconnected:true});}
 if(b.action==='app-update217'){
  // Only the published company APK; never accept arbitrary file IDs or expose Drive tokens.
  const releases:Record<string,string>={
   'fb14fc7fc50742b522551b34ab9da84d810dc2624550bf2f2acc75dce89d96d9':'1Xl4XrEa_oXcK2ffPa4VEprnir9WKzRnt',
   '06c9c699c6c82eb02ff8b59793a0e087c00d8b2af769bb11e46e555ec875c94f':'1zp0jP2YoM2nxxZw2n32thUZKEUzvDEje',
   'ac7c6dfd983a526aa502e37457fb8ef1efd1a088a249b666b1bf48b1d6c83f78':'1M_bTFXdO4aV-Nf90JuYf8mnAX9_JptUb',
   '781abd492f368204934ce14016621665244f97337c4c2418aa593c7961a4829a':'14Y2WK94ba80eOWJu8xOvMFZFLuiljkYo'
  };
  const digest=String(b.sha256||'');
  if(!/^[a-f0-9]{64}$/.test(digest)||!Object.hasOwn(releases,digest))throw Error('The published update changed. Check for updates again.');
  const publisherOwner='95db28ba-7a60-4e88-b2c3-aa932a7ca7ce';
  const activePublisher=destination?.email==='oonjaimarketplace@gmail.com'?await connection(destination.connectionKey):null;
  const publisher=activePublisher?.owner===publisherOwner?activePublisher:await connection(docKey(publisherOwner));
  if(!publisher||publisher.email.toLowerCase()!=='oonjaimarketplace@gmail.com')throw Error('The app publisher connection needs administrator attention.');
  await manage228(publisher.owner);
  const id=releases[digest],f=await item(publisher,id);
  if(f.trashed||f.mimeType!=='application/vnd.android.package-archive'||!Number(f.size)||Number(f.size)>104857600||!/^([a-f0-9]{64})$/.test(String(b.sha256))||f.sha256Checksum!==b.sha256)throw Error('The published update changed. Check for updates again.');
  const r=await fetch(DRIVE+'/files/'+id+'?alt=media',{headers:{Authorization:'Bearer '+await googleToken(publisher)},signal:AbortSignal.timeout(120000)});
  if(!r.ok)throw Error('Google Drive could not download the app update.');
  return new Response(r.body,{headers:{'Content-Type':'application/vnd.android.package-archive','Content-Length':String(f.size),'Cache-Control':'no-store'}});
 }
 if(!c)throw Error('Connect Google Drive in scanner Settings first.');
 // Other users can only see the activated destination. Desktop settings own the account and company default.
 if(destination){
  if(b.action==='folders')return reply(await browseDriveFolders(c,b,canChooseCompanyFolder?undefined:destination.id));
  if(b.action==='folder'){
   if(canChooseCompanyFolder && b.id==='root')throw Error('Open Destination, choose a Google Drive folder and tap Use this folder before scanning.');
   return reply(await folder(c,canChooseCompanyFolder?fileID(b.id):destination.id));
  }
  if((b.action==='create-folder' && !canChooseCompanyFolder) || ['rename-folder','move-file'].includes(b.action))throw Error('Manage the company folder in desktop Settings.');
  if(['upload-start','receipt-year231'].includes(b.action)){if(destination.annual231){const state=await storageState231();if(!state.config||state.config.connectionKey!==destination.connectionKey)throw Error('The yearly storage connection changed. Reopen Settings before uploading.');const year=await receiptYear231(req,owner,b),row=await ensureYear231(state.config,year);b.parent=row.receipt_folder;b.verifiedYear231=year;if(b.action==='receipt-year231')return reply({year,folder:row.receipt_folder});}else{
   if(canChooseCompanyFolder){
    if(b.parent==='root')throw Error('Choose a folder in Google Drive and tap Use this folder before saving.');
    b.parent=fileID(b.parent);
   }else{
    if(b.parent && b.parent!=='root' && b.parent!==destination.id)throw Error('The selected folder changed. Reopen Destination and confirm the company receipt folder.');
    b.parent=destination.id;
   }
  }}
 }


 if(b.action==='folders')return reply(await browseDriveFolders(c,b));
 if(b.action==='folder'){return reply(await folder(c,fileID(b.id)));}
 if(b.action==='create-folder'){const p=await folder(c,fileID(b.parent||'root'));if(!p.capabilities?.canAddChildren)throw Error('This folder does not allow new files.');return reply(await drive(c,'/files?supportsAllDrives=true&fields=id,name,parents','POST',{name:fileName(b.name),mimeType:'application/vnd.google-apps.folder',parents:[p.id]}));}
 if(b.action==='rename-folder'){const f=await folder(c,fileID(b.id));if(!f.capabilities?.canRename)throw Error('You cannot rename this folder.');return reply(await drive(c,'/files/'+f.id+'?supportsAllDrives=true&fields=id,name,parents','PATCH',{name:fileName(b.name)}));}
 if(b.action==='move-file'){const f=await item(c,fileID(b.id)),p=await folder(c,fileID(b.parent));if(f.appProperties?.ojmOwner!==owner||f.appProperties?.ojmScan!==String(b.scan)||f.trashed||String(f.version)!==String(b.version))throw Error('The saved PDF changed. Review it before moving.');if(!p.capabilities?.canAddChildren)throw Error('Choose a writable destination.');return reply(await drive(c,'/files/'+f.id+'?'+new URLSearchParams({supportsAllDrives:'true',fields,addParents:p.id,removeParents:(f.parents||[]).filter((id:string)=>id!==p.id).join(',')}),'PATCH',{}));}
 if(b.action==='reserve-id')return reply(await drive(c,'/files/generateIds?count=1&space=drive&type=files'));
 if(b.action==='file'){const f=await item(c,fileID(b.id));if(f.appProperties?.ojmOwner!==owner||f.appProperties?.ojmScan!==String(b.scan))throw Error('This file is not this account’s scan.');return reply(f);}
 if(b.action==='upload-start'){
 const p=await folder(c,fileID(b.parent)),name=fileName(b.name),id=fileID(b.id),scan=String(b.scan||'');if(!name.toLowerCase().endsWith('.pdf')||!/^[-\w]{20,80}$/.test(scan)||!Number.isSafeInteger(b.size)||b.size<=0||b.size>1024*1024*1024)throw Error('Invalid scan PDF.');if(!p.capabilities?.canAddChildren)throw Error('Choose a writable folder.');
 let existing:any=null;try{existing=await item(c,id);}catch(e){if(!/404|not found/i.test(e.message))throw e;}
 if(existing){if(existing.appProperties?.ojmOwner!==owner||existing.appProperties?.ojmScan!==scan||existing.trashed)throw Error('Existing file does not match this scan.');if(String(existing.version)!==String(b.version))throw Error('The PDF changed in Drive. Review it before updating.');if(existing.name!==name||!existing.parents?.includes(p.id))throw Error('For another name or folder, choose Save as new PDF.');}
 if(!existing){const q="'"+p.id+"' in parents and trashed=false and name='"+name.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";const duplicates=await drive(c,'/files?'+new URLSearchParams({q,fields:'files(id)',pageSize:'1',supportsAllDrives:'true',includeItemsFromAllDrives:'true'}));if(duplicates.files?.length)throw Error('A file with this name already exists. Choose a different name; it will not be overwritten.');}
 const metadata=existing?{name}:{id,name,mimeType:'application/pdf',parents:[p.id],appProperties:{ojmOwner:owner,ojmScan:scan,ojmMonth:String(b.month||'').slice(0,7),ojmVersion:'202',...(b.verifiedYear231?{ojmAccountingYear:String(b.verifiedYear231)}:{})}};
 const url='https://www.googleapis.com/upload/drive/v3/files'+(existing?'/'+id:'')+'?uploadType=resumable&supportsAllDrives=true&fields='+encodeURIComponent(fields);
 const r=await fetch(url,{method:existing?'PATCH':'POST',headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json','X-Upload-Content-Type':'application/pdf','X-Upload-Content-Length':String(b.size)},body:JSON.stringify(metadata),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Drive could not start the upload ('+r.status+').');const session=r.headers.get('location');if(!session)throw Error('Drive did not return an upload session.');if(b.verifiedYear231)await storageRPC231('storage_year_receipt231',{p_file:id,p_owner:owner,p_year:b.verifiedYear231});return reply({session:resumableURL(session),id,...b.verifiedYear231?{year:b.verifiedYear231,folder:p.id}:{}});
 }
 throw Error('Unsupported document action.');
 }catch(e){return reply({error:e.message||'Document action failed.'},400);}
}
