import {admin,connection,googleToken} from './google143150.ts';
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
export const storageRPC231=async(name:string,args:any={})=>checked(await admin.rpc(name,args));
export async function storageState231(){return storageRPC231('storage_year_state231');}
export async function storageConnection231(cfg:any){const c=await connection(cfg.connectionKey);if(!c||c.email.toLowerCase()!==cfg.email.toLowerCase())throw Error('Reconnect the saved company Google account. Existing files are kept.');return c;}
export async function drive231(c:any,path:string,method='GET',body?:any){const r=await fetch('https://www.googleapis.com/drive/v3'+path,{method,headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(35000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error('Company Drive: '+(data.error?.message||r.status));return data;}
export async function sheets231(cfg:any,id:string){const c=await storageConnection231(cfg);const g:any=async(path:string,method='GET',body?:any)=>{const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+path,{method,headers:{Authorization:'Bearer '+await googleToken(c),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error('Accounting workbook: '+(data.error?.message||r.status));return data;};g.owner=cfg.email;return g;}
const safe=(id:string)=>{if(!/^[\w-]{10,160}$/.test(id))throw Error('Invalid saved Drive folder');return id;};
export async function ensureYear231(cfg:any,year:number,initialize?:((g:any,year:number)=>Promise<void>)){
 if(!Number.isInteger(year)||year<1900||year>2198)throw Error('Choose a valid accounting year.');
 const lease=crypto.randomUUID(),row=await storageRPC231('storage_year_claim231',{p_destination:cfg.id,p_year:year,p_lease:lease});
 if(!row)throw Error('This year is being prepared by another request. Your work is kept; retry shortly.');
 let c:any,sheet=row.sheet,folder=row.receipt_folder,initialized=row.initialized;
 const save=async(release=false)=>storageRPC231('storage_year_save231',{p_destination:cfg.id,p_year:year,p_lease:lease,p_sheet:sheet,p_receipt_folder:folder,p_initialized:initialized,p_release:release});
 async function resource(kind:string,parent:string,name:string,id:string|null){
  safe(parent);const mime=kind==='receipts'?'application/vnd.google-apps.folder':'application/vnd.google-apps.spreadsheet',tag=cfg.id+':'+kind+':'+year;
  const fields='id,name,mimeType,parents,trashed,capabilities(canAddChildren,canEdit),appProperties';
  if(id){const f=await drive231(c,'/files/'+safe(id)+'?supportsAllDrives=true&fields='+fields);if(f.trashed||f.mimeType!==mime||!f.parents?.includes(parent))throw Error(name+' was removed or moved. Restore the saved item before continuing; existing data will not be replaced.');if(kind==='receipts'?!f.capabilities?.canAddChildren:!f.capabilities?.canEdit)throw Error('The company account cannot write to '+name);return f.id;}
  // A stable application marker recovers a completed create whose response was lost.
  const q="'"+parent+"' in parents and trashed=false and (appProperties has {key='ojmYear231' and value='"+tag+"'} or name='"+name+"')";
  const found=await drive231(c,'/files?'+new URLSearchParams({q,fields:'files('+fields+'),nextPageToken',pageSize:'100',supportsAllDrives:'true',includeItemsFromAllDrives:'true'}));
  if(found.nextPageToken||found.files?.length>1)throw Error('More than one '+name+' exists. Resolve the duplicate folders/files before preparing this year.');
  if(found.files?.length){const f=found.files[0];if(f.mimeType!==mime||kind!=='receipts'&&f.appProperties?.ojmYear231!==tag)throw Error(name+' already exists but is not this system’s annual workbook. It was preserved.');if(kind==='receipts'?!f.capabilities?.canAddChildren:!f.capabilities?.canEdit)throw Error('The company account cannot write to '+name);return f.id;}
  const f=await drive231(c,'/files?supportsAllDrives=true&fields='+fields,'POST',{name,mimeType:mime,parents:[parent],appProperties:{ojmYear231:tag,ojmYear:String(year)}});return f.id;
 }
 try{
  c=await storageConnection231(cfg);
  folder=await resource('receipts',cfg.receiptRoot,String(year),folder);await save();
  if(initialize){sheet=await resource('accounting',cfg.archiveRoot,'Accounting '+year,sheet);await save();if(!initialized){await initialize(await sheets231(cfg,sheet),year);initialized=true;await save();}}
  await save(true);if(initialized)await storageRPC231('storage_year_notify231',{p_destination:cfg.id,p_year:year});return {...row,sheet,receipt_folder:folder,initialized};
 }catch(e){await save(true).catch(()=>{});throw e;}
}
