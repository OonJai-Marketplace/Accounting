/* Optional cloud adapter. Constructing it makes no network requests. */
(function(root){'use strict';
const BUCKET='scan-documents208',digest=async blob=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
function create({url,key,session,request=fetch}){
 async function call(path,options={}){const s=await session();if(!s?.access_token||!s.user?.id)throw Error('Connect your Accounting account first.');const r=await request(url+path,{...options,headers:{apikey:key,Authorization:'Bearer '+s.access_token,...options.headers},signal:AbortSignal.timeout(60000),redirect:'error'});if((await session())?.user?.id!==s.user.id)throw Error('Your account changed. Retry from the current account.');return r;}
 async function api(action,args={}){const r=await call('/functions/v1/scanner-integration',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...args})}),value=await r.json();if(!r.ok||value.error)throw Error(value.error||'Accounting connection failed.');return value;}
 async function put(path,blob,type){const endpoint='/storage/v1/object/'+BUCKET+'/'+path,r=await call(endpoint,{method:'POST',headers:{'Content-Type':type,'x-upsert':'false'},body:blob});if(r.ok)return;if(r.status!==409&&r.status!==400)throw Error('The file could not upload ('+r.status+'). Retry when connected.');const saved=await call(endpoint);if(!saved.ok)throw Error('Upload failed ('+r.status+'). Check your connection, storage access and the 64 MB PDF limit, then retry.');if(await digest(await saved.blob())!==await digest(blob))throw Error('This document version differs from the saved file. Create a new revision.');}
 async function previews(manifest,read){const s=await session();for(const page of manifest.pages){const blob=await read(page.id);if(blob.size>2097152)throw Error('A page preview is too large. Reduce its size and retry.');page.preview={path:s.user.id+'/'+manifest.id+'/'+manifest.revision+'/'+page.id+'.jpg'};await put(page.preview.path,blob,'image/jpeg');}return manifest;}
 return {api,put,previews,register:manifest=>api('register',{manifest})};
}
async function preview(data){const C=root.ReceiptCore202,source=await C.sourceCanvas(data),scale=Math.min(1,1200/source.width,1600/source.height),canvas=C.canvas(Math.round(source.width*scale),Math.round(source.height*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Preview could not be prepared.')),'image/jpeg',.85));}
function dismissOnBackdrop(dialog){
 let beganOutside=false;
 const outside=e=>{if(e.target!==dialog)return false;const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom;};
 dialog.addEventListener('pointerdown',e=>{beganOutside=outside(e);});
 dialog.addEventListener('click',e=>{if(beganOutside&&outside(e)&&dialog.open)dialog.close();beganOutside=false;});
}
function pdfPreview(value,title){
 const url=new URL(value),drive=url.origin==='https://drive.google.com' && /^\/file\/d\/[\w-]+\/view$/.test(url.pathname);
 const stored=root.OJM_SUPABASE_URL && url.origin===new URL(root.OJM_SUPABASE_URL).origin && url.pathname.startsWith('/storage/v1/object/sign/scan-documents208/');
 if(!drive&&!stored)throw Error('This PDF location is unavailable.');
 const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='View full PDF';details.append(summary);
 details.ontoggle=()=>{
  if(!details.open){details.querySelector('iframe')?.remove();details.querySelector('a')?.remove();return;}
  if(details.querySelector('iframe'))return;
  const frame=document.createElement('iframe');frame.title=title||'Receipt PDF';frame.referrerPolicy='no-referrer';frame.style.cssText='display:block;width:100%;height:min(56vh,620px);border:0';
  const preview=new URL(url);if(drive)preview.pathname=preview.pathname.replace(/\/view$/,'/preview');frame.src=preview.href;
  const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Open original PDF';details.append(frame,link);
 };
 return details;
}
root.ReceiptLinks208={create,preview,digest,BUCKET,dismissOnBackdrop,pdfPreview};
})(globalThis);
