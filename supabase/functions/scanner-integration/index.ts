import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {BUCKET,uuid,validateManifest,latestGroups,pinnedTargets} from './validation.mjs';
import {idRequest,idResults,requireAvailable,sameTargets,suggestionRequest217,nextDocumentID217} from './ids215.mjs';
const URL=Deno.env.get('SUPABASE_URL')!,KEY=Deno.env.get('SUPABASE_ANON_KEY')!;
const admin=createClient(URL,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set(['https://oonjai-marketplace.github.io','https://localhost','capacitor://localhost']);
const result=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
const check=(value:any,message:string)=>{if(!value)throw Error(message);};
export async function handler(req:Request){
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://oonjai-marketplace.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
 const reply=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return reply({});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const authorization=req.headers.get('authorization')||'';
  const auth=await admin.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
  if(auth.error||!auth.data.user)return reply({error:'Sign in to Accounting.'},401);
  const owner=auth.data.user.id,user=createClient(URL,KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const active=result(await user.rpc('active_account14228')),password=result(await user.rpc('password_change_required14257'));
  check(active&&!password,'An active, unlocked Accounting account is required.');
  const [workspace,journal,edit]=await Promise.all(['sub-users-workspace','journal','journal'].map((p_target,i)=>user.rpc('can_action113',{p_target,p_action:i===2?'edit':'view'}).then(result)));
  check(workspace||journal,'Document access is not enabled.');
  const raw=await req.text();check(raw.length<=350000,'Request too large.');const b=JSON.parse(raw||'{}');
  async function drive(action:string,args:any={}){
   const r=await fetch(URL+'/functions/v1/accounting-documents',{method:'POST',headers:{Authorization:authorization,apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action,...args}),signal:AbortSignal.timeout(35000)});
   const data=await r.json();check(r.ok&&!data.error,data.error||'Drive request failed.');return data;
  }
  if(b.action==='status')return reply({ready:true,bucket:BUCKET,drive:await drive('status').catch(()=>({connected:false})),canLinkJournal:!!edit});
  async function checkIDs(groups:any[],scan:string){
   const labels=groups.map(g=>g.label),journalLabels=groups.filter(g=>g.type==='journal').map(g=>g.label);
   const [entries,lines,docs]=await Promise.all([
    edit&&journalLabels.length?user.from('journal_entries').select('id,entry_no,status').in('entry_no',journalLabels).limit(201).then(result):[],
    workspace&&journalLabels.length?user.from('staff_journal_lines').select('id,workspace_entry_no,staff_journal_id,staff_journals!inner(owner_id)').in('workspace_entry_no',journalLabels).eq('staff_journals.owner_id',owner).limit(10001).then(result):[],
    user.from('scanner_documents208').select('scan_id,entry_label,journal_ids,staff_line_ids').in('entry_label',labels).limit(10001).then(result)
   ]);
   check(entries.length<201&&lines.length<10001&&docs.length<10001,'Too many matches. Check fewer IDs.');
   return idResults(groups,entries,lines,docs,scan);
  }
  if(b.action==='ids'){
   check(!b.scan||uuid(b.scan),'Invalid scan reference.');
   return reply({ids:await checkIDs(idRequest(b),b.scan||'')});
  }
  if(b.action==='suggest-ids'){
   check(!b.scan||uuid(b.scan),'Invalid scan reference.');
   const q=suggestionRequest217(b);let seed=q.seed;
   if(b.resume===true){
    const previous=result(await user.from('scanner_documents208').select('entry_label').eq('owner_id',owner).like('entry_label',q.prefix+'%').order('created_at',{ascending:false}).order('entry_label',{ascending:false}).limit(1));
    if(previous.length)seed=nextDocumentID217(previous[0].entry_label);
   }
   const selected=/\d$/.test(q.label)||q.type==='support'?(await checkIDs([{type:q.type,label:q.label}],b.scan||''))[0]:{type:q.type,label:q.label,available:false,reason:'Choose a complete ID from the suggestions.'};
   if(q.exclude.has(selected.label)){selected.available=false;selected.reason='Already used by a device batch';}
   const suggestions:any[]=[],seen=new Set();
   // Read existing journal numbers, including gaps larger than 20. Never allocate a journal ID.
   for(let offset=0;offset<5000&&suggestions.length<20;offset+=100){
    let labels:string[]=[];
    if(q.type==='journal'){
     const [entries,lines]=await Promise.all([
      edit?user.from('journal_entries').select('entry_no').like('entry_no',q.prefix+'%').gte('entry_no',seed).order('entry_no').range(offset,offset+99).then(result):[],
      workspace?user.from('staff_journal_lines').select('workspace_entry_no,staff_journals!inner(owner_id)').eq('staff_journals.owner_id',owner).like('workspace_entry_no',q.prefix+'%').gte('workspace_entry_no',seed).order('workspace_entry_no').range(offset,offset+99).then(result):[]
     ]);labels=[...new Set([...entries.map((r:any)=>r.entry_no),...lines.map((r:any)=>r.workspace_entry_no)])].sort();
     if(!labels.length)break;
    }else{for(let i=0;i<100;i++){labels.push(seed);seed=nextDocumentID217(seed);}}
    labels=labels.filter(label=>!seen.has(label)&&!q.exclude.has(label));labels.forEach(label=>seen.add(label));
    for(let i=0;i<labels.length;i+=100){const rows=await checkIDs(labels.slice(i,i+100).map(label=>({type:q.type,label})),b.scan||'');suggestions.push(...rows.filter(r=>r.available));}
   }
   suggestions.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
   return reply({selected,suggestions:suggestions.slice(0,20)});
  }
  if(b.action==='register'){
   const m=validateManifest(b.manifest,owner),files:any[]=[];for(let offset=0;offset<2000;offset+=1000){const batch=result(await admin.storage.from(BUCKET).list(m.root.slice(0,-1),{limit:1000,offset}));files.push(...batch);if(batch.length<1000)break;}
   const byName=new Map(files.map((f:any)=>[f.name,f]));
   for(const group of m.groups)for(const p of group.pages){const f:any=byName.get(p.id+'.jpg');check(f&&f.metadata?.mimetype==='image/jpeg'&&f.metadata?.size>0&&f.metadata?.size<=2097152,'Upload every page preview before linking.');}
   if(m.provider==='supabase'){const f:any=byName.get('document.pdf');check(f&&f.metadata?.mimetype==='application/pdf'&&f.metadata?.size>0,'Upload the PDF before linking.');}
   else{const f=await drive('file',{id:m.pdf.path,scan:m.id});check(!f.trashed&&f.sha256Checksum===m.pdf.sha256,'Drive has not confirmed this PDF version.');}
   const strict=b.manifest.workflow===215;
   const checkedIDs=strict?requireAvailable(await checkIDs(idRequest({groups:b.manifest.groups.map((g:any)=>({type:g.type,label:g.entryLabel}))}),m.id)):[];
   const previous=result(await admin.from('scanner_documents208').select('*').eq('owner_id',owner).eq('scan_id',m.id).order('revision',{ascending:true})),rows=[],linked=[];
   for(const g of m.groups){
    const history=previous.filter((r:any)=>r.group_id===g.id);let targets=pinnedTargets(history,g.label);
    if(strict){const checked=checkedIDs.find((r:any)=>r.label===g.label),submitted=b.manifest.groups.find((r:any)=>r.id===g.id);check(sameTargets(checked,submitted.targets),'The journal identity changed. Verify the IDs again before linking.');targets={journal_ids:checked.journal_ids,staff_line_ids:checked.staff_line_ids};}
    if(!targets){let ids:string[]=[];if(edit){const matches=result(await user.from('journal_entries').select('id').eq('entry_no',g.label).limit(2));if(matches.length===1)ids=[matches[0].id];}
     let staff:string[]=[];if(!ids.length&&workspace){const lines=result(await user.from('staff_journal_lines').select('id,staff_journal_id,staff_journals!inner(owner_id)').eq('workspace_entry_no',g.label).eq('staff_journals.owner_id',owner).limit(1001));check(lines.length<=1000,'Too many matching workspace lines.');if(new Set(lines.map((l:any)=>l.staff_journal_id)).size===1)staff=lines.map((l:any)=>l.id);}
     targets={journal_ids:ids,staff_line_ids:staff};
    }
    const same=history.find((r:any)=>r.revision===m.revision);
    if(same)check(same.pdf_sha256===m.pdf.sha256&&same.entry_label===g.label,'This version was already registered with different contents. Save a new revision.');
    rows.push({...(same?{id:same.id}:{}),owner_id:owner,scan_id:m.id,group_id:g.id,revision:m.revision,title:m.title,entry_label:g.label,...targets,pages:g.pages,pdf_provider:m.provider,pdf_path:m.pdf.path,pdf_sha256:m.pdf.sha256});
    linked.push({label:g.label,linked:strict&&b.manifest.groups.find((r:any)=>r.id===g.id).type!=='journal'||!!(targets.journal_ids.length||targets.staff_line_ids.length)});
   }
   result(await admin.rpc(strict?'scanner_register215':'scanner_register208',{p_rows:rows}));
   return reply({registered:true,groups:linked,pending:linked.filter(g=>!g.linked).length});
  }
  if(b.action==='list'){
   const ids:string[]=[],staff:string[]=[];let entry='';
   if(b.staffLine){check(uuid(b.staffLine),'Invalid workspace entry.');const line=result(await user.from('staff_journal_lines').select('id,workspace_entry_no,staff_journal_id').eq('id',b.staffLine).maybeSingle());if(line){entry=line.workspace_entry_no;const siblings=result(await user.from('staff_journal_lines').select('id').eq('staff_journal_id',line.staff_journal_id).eq('workspace_entry_no',line.workspace_entry_no).limit(1000));staff.push(...siblings.map((l:any)=>l.id));}}
   else if(b.entry){const label=String(b.entry);entry=label;check(label.length<=120,'Invalid entry ID.');const matches=result(await user.from('journal_entries').select('id').eq('entry_no',label).limit(2));if(matches.length===1){ids.push(matches[0].id);const lines=result(await user.from('staff_journal_lines').select('id').eq('journal_entry_id',ids[0]).limit(1000));staff.push(...lines.map((l:any)=>l.id));}}
   if(!ids.length&&!staff.length)return reply({documents:[],entry});
   const filters=[ids.length?'journal_ids.ov.{'+ids.join(',')+'}':'',staff.length?'staff_line_ids.ov.{'+staff.join(',')+'}':''].filter(Boolean).join(',');
   const rows=result(await user.from('scanner_documents208').select('*').or(filters).order('revision',{ascending:false}).limit(500));
   return reply({entry,documents:latestGroups(rows).map((r:any)=>({id:r.id,title:r.title,label:r.entry_label,pages:r.pages.length,revision:r.revision}))});
  }
  if(b.action==='view'){
   check(uuid(b.id),'Invalid document.');const row=result(await user.from('scanner_documents208').select('*').eq('id',b.id).maybeSingle());check(row,'Document unavailable or access denied.');
   const paths=row.pages.map((p:any)=>p.path);if(row.pdf_provider==='supabase')paths.push(row.pdf_path);
   const signed=result(await user.storage.from(BUCKET).createSignedUrls(paths,300)),urls=new Map(signed.filter((r:any)=>!r.error&&r.signedUrl).map((r:any)=>[r.path,r.signedUrl]));
   check(row.pages.every((p:any)=>urls.has(p.path)),'Some page previews are unavailable.');
   return reply({title:row.title,label:row.entry_label,pages:row.pages.map((p:any)=>({...p,url:urls.get(p.path)})),pdf:row.pdf_provider==='drive'?'https://drive.google.com/file/d/'+row.pdf_path+'/view':urls.get(row.pdf_path),expires:Date.now()+240000});
  }
  throw Error('Unsupported scanner action.');
 }catch(e){return reply({error:String(e.message||'Document request failed.').slice(0,300)},400);}
}
Deno.serve(handler);
