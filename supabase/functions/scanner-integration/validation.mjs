export const BUCKET='scan-documents208';
export const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function validateManifest(value,owner){
 if(!uuid(owner)||!uuid(value?.id)||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision>100000000)throw Error('Invalid document identity.');
 const title=String(value.title||'').trim();if(!title||title.length>180)throw Error('Invalid document name.');
 if(!['supabase','drive'].includes(value.provider)||!/^[0-9a-f]{64}$/.test(value.pdf?.sha256||''))throw Error('A confirmed PDF checksum is required.');
 const root=owner+'/'+value.id+'/'+value.revision+'/';
 if(value.provider==='supabase'&&(value.bucket!==BUCKET||value.pdf.path!==root+'document.pdf'))throw Error('The PDF must belong to your document.');
 if(value.provider==='drive'&&!/^[\w-]{10,160}$/.test(value.pdf.path||''))throw Error('Invalid Drive file.');
 if(!Array.isArray(value.groups)||value.groups.length<1||value.groups.length>100||!Array.isArray(value.pages)||value.pages.length<1||value.pages.length>1000)throw Error('Use 1–100 sections and at most 1,000 pages.');
 const groups=new Map(),pageIDs=new Set();
 for(const g of value.groups){const label=String(g.entryLabel||'').trim();if(!uuid(g.id)||groups.has(g.id)||!label||label.length>120||/[\x00-\x1f]/.test(label))throw Error('Invalid or duplicate section.');groups.set(g.id,{id:g.id,label,pages:[]});}
 for(const p of value.pages){const g=groups.get(p.groupID);if(!g||!uuid(p.id)||pageIDs.has(p.id)||p.preview?.path!==root+p.id+'.jpg'||!Number.isSafeInteger(p.page)||p.page<1||p.page>2000)throw Error('A page does not belong to this document.');pageIDs.add(p.id);g.pages.push({id:p.id,label:String(p.label||g.label).slice(0,160),page:p.page,path:p.preview.path});}
 return {id:value.id,revision:value.revision,title,provider:value.provider,pdf:value.pdf,root,groups:[...groups.values()].filter(g=>g.pages.length)};
}
export function latestGroups(rows){const map=new Map();for(const row of [...rows].sort((a,b)=>b.revision-a.revision)){const key=[row.owner_id,row.scan_id,row.group_id].join(':');if(!map.has(key))map.set(key,row);}return [...map.values()];}
export function pinnedTargets(previous,label){const first=previous.find(r=>r.entry_label===label&&(r.journal_ids?.length||r.staff_line_ids?.length));return first?{journal_ids:first.journal_ids,staff_line_ids:first.staff_line_ids}:null;}
