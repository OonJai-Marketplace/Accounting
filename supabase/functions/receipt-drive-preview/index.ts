import {PDFDocument} from 'npm:pdf-lib@1.17.1';
import {admin, auth, connection, googleToken, hash} from '../_shared/google143150.ts';
import {previewTarget} from './names.mjs';

const api = 'https://www.googleapis.com/drive/v3/files';
const folderType = 'application/vnd.google-apps.folder';
const origins = new Set(['https://oonjai-marketplace.github.io', 'https://localhost', 'capacitor://localhost', 'https://accounting.oonjai.invalid']);
const maxBytes = 64 * 1024 * 1024;
type Folder = {id:string, name:string};
type Cursor = {folders:Folder[], token?:string, watched?:string[]};
function checked(result:any) {
  if (result.error) throw new Error('The receipt preview could not read or save its progress.');
  return result.data;
}
async function destination() {
  const row = checked(await admin.from('budget_settings14313').select('data').eq('id', true).maybeSingle());
  const active = row?.data?.googleSheets143129?.receiptDrive228?.active;
  const root = /^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]{10,160})$/.exec(active?.folderURL || '')?.[1];
  if (!root || !active?.connectionKey || !active.email) throw new Error('Activate the company receipt folder in Accounting Settings first.');
  return {root, name:active.name, email:active.email.toLowerCase(), key:active.connectionKey, scope:await hash(active.connectionKey + '/' + root)};
}
async function drive(path:string, params:Record<string,string>, bearer:string) {
  return await fetch(api + path + '?' + new URLSearchParams({...params, supportsAllDrives:'true'}), {
    headers:{Authorization:'Bearer ' + bearer}, signal:AbortSignal.timeout(18000)
  });
}
async function inspect(file:any, token:string) {
  if (Number(file.size) > maxBytes) return {pages:null, issue:'This PDF exceeds the 64 MB preview limit.'};
  const response = await drive('/' + encodeURIComponent(file.id), {alt:'media'}, token);
  if (!response.ok) throw new Error('Drive could not read the PDF. The next check will retry.');
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    return {pages:null, issue:'This PDF exceeds the 64 MB preview limit.'};
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) return {pages:null, issue:'This PDF exceeds the 64 MB preview limit.'};
  if (bytes.byteLength !== Number(file.size)) throw new Error('The file changed while it was being read. The next check will retry.');
  try {
    const pdf = await PDFDocument.load(bytes, {updateMetadata:false});
    const pages = pdf.getPageCount();
    if (pages > 0) return {pages, issue:null};
  } catch { /* Invalid and password-protected PDFs need a new revision. */ }
  return {pages:null, issue:'The pages could not be counted. Check that the PDF opens without a password.'};
}
async function changesPage(path:string,params:Record<string,string>,bearer:string){
  const r=await fetch('https://www.googleapis.com/drive/v3/changes'+path+'?'+new URLSearchParams({...params,supportsAllDrives:'true'}),{
    headers:{Authorization:'Bearer '+bearer},signal:AbortSignal.timeout(12000)
  });
  return r.ok ? await r.json() : null;
}
// Check only the change log after the last completed folder inventory.
// A missing checkpoint or a large backlog safely falls back to the saved metadata inventory.
async function relevantChanges(dest:Awaited<ReturnType<typeof destination>>,state:any,bearer:string){
  const folders=new Set<string>([dest.root,...(state.watched_folders||[])]);
  let token=state.change_token;
  for(let i=0;i<3;i++){
    const list=await changesPage('',{pageToken:token,pageSize:'100',includeItemsFromAllDrives:'true',
      ...(state.shared_drive_id?{driveId:state.shared_drive_id}:{}),fields:'changes(fileId,removed,file(mimeType,parents,trashed)),nextPageToken,newStartPageToken'},bearer);
    if(!list)return null;
    const changed=(list.changes||[]).filter((c:any)=>c.fileId);
    if(changed.some((c:any)=>folders.has(c.fileId)||((c.file?.mimeType===folderType||c.file?.mimeType==='application/pdf') && c.file?.parents?.some((parent:string)=>folders.has(parent)))))return null;
    // Moved and removed PDFs may no longer report their old parent.
    if(changed.length){
      const known=checked(await admin.from('receipt_drive_preview_files').select('file_id').eq('scope',dest.scope).in('file_id',changed.map((c:any)=>c.fileId)).limit(1));
      if(known.length)return null;
    }
    if(list.newStartPageToken)return list.newStartPageToken;
    if(!list.nextPageToken)return null;
    token=list.nextPageToken;
  }
  return null;
}
async function scan(dest:Awaited<ReturnType<typeof destination>>) {
  const lease = crypto.randomUUID();
  const state = checked(await admin.rpc('receipt_preview_claim', {p_scope:dest.scope, p_lease:lease}));
  if (!state) return {busy:true};
  try {
    const c = await connection(dest.key);
    if (!c || c.email?.toLowerCase() !== dest.email) throw new Error('Reconnect the company receipt folder in Accounting Settings.');
    const owner = checked(await admin.from('profiles').select('role,status').eq('id', c.owner).maybeSingle());
    if (owner?.role !== 'admin' || owner.status !== 'active') throw new Error('Verify the company receipt connection with an active administrator.');
    const bearer = await googleToken(c), started = Date.now();
    const progress=checked(await admin.from('receipt_drive_preview_state').select('change_token,next_change_token,shared_drive_id,watched_folders,last_error').eq('scope',dest.scope).single());
    const save=(patch:Record<string,unknown>)=>admin.from('receipt_drive_preview_state').update(patch).eq('scope',dest.scope).eq('lease',lease).select('scope').single().then(checked);
    if(!state.cursor && progress.change_token && !progress.last_error){
      const retries=checked(await admin.from('receipt_drive_preview_files').select('file_id').eq('scope',dest.scope).eq('retry',true).limit(1));
      const token=!retries.length?await relevantChanges(dest,progress,bearer):null;
      if(token){
        await save({change_token:token,last_complete:new Date().toISOString(),last_error:null});
        return {complete:true,inspected:0,unchanged:true};
      }
    }
    // An inaccessible parent can return a successful, empty child listing.
    const rootMeta=await drive('/'+encodeURIComponent(dest.root),{fields:'driveId,mimeType,trashed'},bearer);
    if(!rootMeta.ok)throw new Error('Drive could not open the saved receipt folder. Check the folder and the connected account.');
    const rootFolder=await rootMeta.json();
    if(rootFolder.trashed || rootFolder.mimeType!==folderType)
      throw new Error('The saved receipt folder is unavailable. Restore it from Trash or select the correct folder in Accounting Settings.');
    if(!state.cursor){
      // Capture before inventory so concurrent uploads are included in the next check.
      const driveId=rootFolder.driveId;
      const start=await changesPage('/startPageToken',driveId?{driveId}:{},bearer);
      progress.next_change_token=start?.startPageToken||null;
      await save({next_change_token:progress.next_change_token,shared_drive_id:driveId||null});
    }
    let cursor:Cursor = state.cursor || {folders:[{id:dest.root,name:dest.name}]};
    let complete = false, inspected = 0;
    do {
      const current = cursor.folders[0], root = current.id === dest.root;
      let available = true;
      if (!root) {
        const r = await drive('/' + encodeURIComponent(current.id), {fields:'parents,trashed'}, bearer);
        if (!r.ok && r.status !== 404) throw new Error('Drive could not check the monthly folder. The next check will retry.');
        const f = r.ok ? await r.json() : null;
        available = !!f && !f.trashed && f.parents?.includes(dest.root);
      }
      const condition = root ? "(mimeType='application/pdf' or mimeType='" + folderType + "')" : "mimeType='application/pdf'";
      let listing:any = {files:[]};
      if (available) {
        const r = await drive('', {q:"'" + current.id + "' in parents and trashed=false and " + condition, fields:'incompleteSearch,nextPageToken,files(id,name,mimeType,version,md5Checksum,size,modifiedTime)', pageSize:'10', includeItemsFromAllDrives:'true', ...(cursor.token ? {pageToken:cursor.token} : {})}, bearer);
        if (!r.ok) {
          if (cursor.token && r.status === 400) {
            cursor = {folders:[{id:dest.root, name:dest.name}]};
            checked(await admin.rpc('receipt_preview_step_with_alerts', {p_scope:dest.scope,p_lease:lease,p_files:[],p_cursor:cursor,p_done:false}));
          }
          throw new Error('Drive could not list the receipt folder. The next check will retry.');
        }
        listing = await r.json();
        if (listing.incompleteSearch) throw new Error('Drive returned an incomplete folder listing. The next check will retry.');
      }
      const docs = listing.files.filter((f:any) => f.mimeType === 'application/pdf');
      const cached = docs.length ? checked(await admin.from('receipt_drive_preview_files').select('file_id,content_key,pages,issue,retry,seen').eq('scope', dest.scope).in('file_id', docs.map((f:any) => f.id))) : [];
      const files = [];
      let partial = false;
      for (const f of docs) {
        const contentKey = f.md5Checksum || f.version, old = cached.find((x:any) => x.file_id === f.id);
        let count = old, retry = old?.retry || false;
        if (!old || old.content_key !== contentKey || (old.retry && old.seen !== state.generation)) {
          if (files.length && Date.now() - started >= 23000) { partial = true; break; }
          try { inspected++; count = await inspect(f, bearer); retry = false; }
          catch { count = {pages:null,issue:'Drive could not finish reading this PDF. The next check will retry.'}; retry = true; }
        }
        files.push({file_id:f.id, name:f.name, folder:current.name, content_key:contentKey, modified:f.modifiedTime, pages:count.pages, issue:count.issue, retry, target:previewTarget(f.name,count.pages,current.name)});
      }
      if (partial) {
        checked(await admin.rpc('receipt_preview_step_with_alerts', {p_scope:dest.scope,p_lease:lease,p_files:files,p_cursor:cursor,p_done:false}));
        break;
      }
      const folders = [...cursor.folders];
      if (root) for (const f of listing.files) {
        if (f.mimeType === folderType && !folders.some(x => x.id === f.id)) folders.push({id:f.id,name:f.name});
      }
      const watched=root?[...new Set([...(cursor.watched||[]),...folders.map(f=>f.id)])]:cursor.watched;
      if (!listing.nextPageToken) folders.shift();
      cursor = {folders, token:listing.nextPageToken,watched};
      complete = folders.length === 0;
      checked(await admin.rpc('receipt_preview_step_with_alerts', {p_scope:dest.scope, p_lease:lease, p_files:files, p_cursor:cursor, p_done:complete}));
    } while (!complete && Date.now() - started < 23000);
    if(complete)await save({change_token:progress.next_change_token,next_change_token:null,watched_folders:cursor.watched||[dest.root]});
    return {complete,inspected};
  } catch (e) {
    checked(await admin.from('receipt_drive_preview_state').update({last_error:(e instanceof Error ? e.message : 'Drive check failed.').slice(0,240)}).eq('scope',dest.scope).eq('lease',lease));
    throw e;
  } finally {
    checked(await admin.from('receipt_drive_preview_state').update({lease:null,lease_until:null}).eq('scope',dest.scope).eq('lease',lease));
  }
}
Deno.serve(async (req:Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':origins.has(origin) ? origin : 'https://oonjai-marketplace.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const reply = (value:unknown, code=200) => new Response(JSON.stringify(value), {status:code, headers});
  if (origin && !origins.has(origin)) return reply({error:'Origin not allowed.'},403);
  if (req.method === 'OPTIONS') return reply({});
  if (req.method !== 'POST') return reply({error:'Use POST.'},405);
  try {
    const body = await req.json();
    if (body.action === 'scan') {
      const secret = req.headers.get('Authorization')?.replace(/^Bearer /,'') || '';
      if (secret.length !== 64 || !checked(await admin.rpc('receipt_preview_job_allowed',{p_key:secret}))) return reply({error:'Scheduler access required.'},403);
      return reply(await scan(await destination()));
    }
    if (!['check','login','preview','progress'].includes(body.action)) return reply({error:'Unknown preview action.'},400);
    const {user} = await auth(req,true);
    const [active, reset] = await Promise.all([user.rpc('active_account14228'),user.rpc('password_change_required14257')]);
    if (checked(active) !== true || checked(reset) !== false) return reply({error:'Sign in with an active administrator account.'},403);
    const manual = body.action === 'check' || body.action === 'login';
    if (manual && checked(await user.rpc('can_action113',{p_target:'settings-accounting',p_action:'edit'})) !== true)
      return reply({error:'Receipt settings edit access is required.'},403);
    const dest = await destination();
    const offset = Number(body.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return reply({error:'Invalid page.'},400);
    const check = manual ? await scan(dest) : null;
    const [status, rows, jobs] = await Promise.all([
      admin.from('receipt_drive_preview_state').select('last_complete,last_error,cursor,lease_until').eq('scope',dest.scope).maybeSingle(),
      body.action==='login' || body.action==='progress' ? {data:[],error:null} : admin.from('receipt_drive_preview_files').select('name,folder,pages,issue').eq('scope',dest.scope).order('modified',{ascending:false}).order('file_id').range(offset,offset+25),
      admin.from('receipt_drive_link_jobs').select('state,attempts,note').eq('scope',dest.scope).in('state',['queued','working']).limit(100)
    ]);
    const items = checked(rows);
    const state = checked(status), pending = checked(jobs);
    const retry = pending.some((j:any)=>j.attempts>0 && j.state==='queued');
    return reply({inspected:check?.inspected||0,checking:!state?.last_error && (!!state?.cursor || Date.parse(state?.lease_until)>Date.now() || check?.busy),
      linking:pending.length>0 && !retry,retry,state:{last_complete:state?.last_complete,last_error:state?.last_error},more:items.length>25,files:items.slice(0,25).map((f:any)=>({...f,target:previewTarget(f.name,f.pages,f.folder)}))});
  } catch (e) {return reply({error:e instanceof Error ? e.message : 'Receipt preview unavailable.'},400);}
});
