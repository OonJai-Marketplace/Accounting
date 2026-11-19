import {admin, connection, googleToken, hash} from '../_shared/google143150.ts';
import {previewTarget} from '../receipt-drive-preview/names.mjs';
import {PDFiumLibrary} from 'npm:@hyzyla/pdfium@3.0.0/inline';
import jpeg from 'npm:jpeg-js@0.4.4';

const bucket = admin.storage.from('scan-documents208');
const api = 'https://www.googleapis.com/drive/v3/files/';
const maxBytes = 64 * 1024 * 1024;
function checked(r:any) { if (r.error) throw new Error(r.error.message); return r.data; }
async function file(id:string, params:Record<string,string>, token:string) {
  const response = await fetch(api + encodeURIComponent(id) + '?' + new URLSearchParams({...params,supportsAllDrives:'true'}), {
    headers:{Authorization:'Bearer '+token}, signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('Drive could not read the protected receipt.');
  return response;
}
async function run(scope:string,refresh?:{scan:string,page:number}) {
  const cfg=checked(await admin.from('budget_settings14313').select('data').eq('id',true).single()).data.googleSheets143129.receiptDrive228.active;
  const root=/^https:\/\/drive\.google\.com\/drive\/folders\/([\w-]+)$/.exec(cfg?.folderURL)?.[1];
  if (!root || await hash(cfg.connectionKey+'/'+root)!==scope) return 'inactive';
  const lease=crypto.randomUUID();
  const job=refresh ? checked(await admin.from('receipt_drive_link_jobs').select('*').eq('scope',scope).eq('scan_id',refresh.scan).eq('state','linked').maybeSingle()) :
    checked(await admin.rpc('claim_receipt_drive_link',{p_scope:scope,p_lease:lease}));
  if (!job) return 'idle';
  let next=refresh?.page || job.next_page;
  if(refresh && next>job.pages)throw Error('Unknown receipt page.');
  const progress=async(state:string,note:string|null=null)=>checked(await admin.rpc('progress_receipt_drive_link',{
    p_scan:job.scan_id,p_lease:lease,p_page:next,p_state:state,p_note:note
  }));
  try {
    const target=previewTarget(job.name,job.pages,job.folder);
    if (target.issue || (!target.last && job.pages>1000)) {
      if(refresh)throw Error('File name or page count changed.');
      await progress('review',target.issue || 'Split this entry into numbered parts of up to 1,000 pages each.');return 'review';
    }
    const c=await connection(cfg.connectionKey);
    if (!c || c.email?.toLowerCase()!==cfg.email?.toLowerCase()) throw new Error('Verify the company receipt folder connection.');
    const profile=checked(await admin.from('profiles').select('role,status').eq('id',c.owner).maybeSingle());
    if (profile?.role!=='admin' || profile.status!=='active') throw new Error('Verify the company receipt connection with an active administrator.');
    const plan=(finish:boolean,digest:string|null=null)=>admin.rpc('plan_receipt_drive_link',{
      p_scan:job.scan_id,p_lease:lease,p_first:target.first,p_last:target.last||null,p_part:target.part||1,
      p_finish:finish,p_owner:c.owner,p_hash:digest
    }).then(checked);
    const verdict=refresh?'ready':await plan(false);
    if (verdict!=='ready') return verdict;
    const token=await googleToken(c);
    const meta=await (await file(job.file_id,{fields:'id,name,parents,trashed,mimeType,size,md5Checksum,sha256Checksum,version'},token)).json();
    const parent=meta.parents?.[0];
    let inFolder=parent===root;
    if (parent && !inFolder) {
      const dir=await (await file(parent,{fields:'name,parents,trashed'},token)).json();
      inFolder=!dir.trashed && dir.parents?.includes(root) && dir.name===job.folder;
    }
    if (!inFolder || meta.trashed || meta.name!==job.name || meta.mimeType!=='application/pdf' || (meta.md5Checksum||meta.version)!==job.content_key) {
      if(refresh)throw Error('Source file changed.');
      await progress('review','The Drive file moved or changed. Check its current name and folder.');return 'review';
    }
    const size=Number(meta.size);
    if (!size || size>maxBytes) {if(refresh)throw Error('Invalid source size.');await progress('review','The PDF exceeds the receipt preview size limit.');return 'review';}
    const bytes=new Uint8Array(await (await file(job.file_id,{alt:'media'},token)).arrayBuffer());
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if (bytes.length!==size || digest!==meta.sha256Checksum) throw new Error('The receipt changed while downloading.');
    if(refresh){
      const path='drive-linked/'+job.scan_id+'/'+next+'.jpg';
      const rows=checked(await admin.from('scanner_documents208').select('id').eq('scan_id',job.scan_id).eq('pdf_sha256',digest)
        .is('superseded_by218',null).filter('pages','cs',JSON.stringify([{path}])).limit(1));
      if(!rows?.length)throw Error('No current linked page matches this source.');
    }
    const library=await PDFiumLibrary.init({disableBase64Warning:true});
    try {
      const doc=await library.loadDocument(bytes);
      try {
        if (doc.getPageCount()!==job.pages) throw new Error('The PDF page count changed.');
        const started=Date.now();
        for (;next<=job.pages;next++) {
          const page=doc.getPage(next-1);
          try {
            const {originalWidth:w,originalHeight:h}=page.getOriginalSize();
            if (!(w>0 && h>0)) throw new Error('Invalid PDF page size.');
            const rendered=await page.render({scale:Math.min(3.2,1800/Math.max(w,h)),render:'bitmap',transparent:false});
            const image=jpeg.encode({data:rendered.data,width:rendered.width,height:rendered.height},85).data;
            const saved=await bucket.upload('drive-linked/'+job.scan_id+'/'+next+'.jpg',image,{contentType:'image/jpeg',cacheControl:'3600',upsert:!!refresh});
            if (saved.error && (refresh || !['409','Duplicate'].includes(String(saved.error.statusCode||saved.error.error)))) throw saved.error;
            if(refresh)return 'refreshed';
          } finally {page.close();}
          if (next<job.pages && Date.now()-started>650) {next++;await progress('queued');return 'continued';}
        }
      } finally {doc.destroy();}
    } finally {library.destroy();}
    return await plan(true,digest);
  } catch (error) {
    console.error('Receipt linking failed',error instanceof Error?error.message:String(error?.message||error));
    if(refresh)return 'failed';
    await progress('retry','Could not finish preparing this receipt. Check the Drive connection and PDF.');return 'retry';
  }
}
Deno.serve(async req=>{
  if (req.method!=='POST') return new Response(null,{status:405});
  const key=req.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if (key.length!==64 || !checked(await admin.rpc('receipt_preview_job_allowed',{p_key:key}))) return new Response(null,{status:403});
  const {scope,refresh}=await req.json();
  if(refresh && (!/^[0-9a-f-]{36}$/i.test(refresh.scan)||!Number.isSafeInteger(refresh.page)||refresh.page<1))return new Response(null,{status:400});
  if (!/^[a-f0-9]{64}$/.test(scope)) return new Response(null,{status:400});
  return Response.json({result:await run(scope,refresh)});
});
