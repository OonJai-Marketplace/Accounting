import {uuid} from './validation.mjs';

// Only the authenticated user client is supplied. No document paths, images,
// amounts or owner details leave this metadata endpoint.
export async function receiptStatus226(user,request){
 const entries=request.entries??[],staffLines=request.staffLines??[];
 if(!Array.isArray(entries)||!Array.isArray(staffLines)||entries.length+staffLines.length>100)throw Error('Check at most 100 entry IDs at a time.');
 if(entries.some(v=>typeof v!=='string'||!v.trim()||v.length>120)||staffLines.some(v=>!uuid(v)))throw Error('Invalid receipt entry IDs.');
 const labels=[...new Set(entries)],refs=[...new Set(staffLines)];
 async function rows(make){
  const all=[];
  for(let offset=0;offset<10000;offset+=500){
   const r=await make().order('id').range(offset,offset+499);
   if(r.error)throw Error(r.error.message);
   if(!Array.isArray(r.data))throw Error('Receipt status could not be checked.');
   all.push(...r.data);if(r.data.length<500)return all;
  }
  throw Error('Too many matching documents. Open this entry to check its receipts.');
 }
 const [journals,selected]=await Promise.all([
  labels.length?rows(()=>user.from('journal_entries').select('id,entry_no').in('entry_no',labels)):[],
  refs.length?rows(()=>user.from('staff_journal_lines').select('id,staff_journal_id,workspace_entry_no').in('id',refs)):[]
 ]);
 const ids=journals.map(r=>r.id),groups=[...new Set(selected.map(r=>r.staff_journal_id))],names=[...new Set(selected.map(r=>r.workspace_entry_no))];
 const [inherited,siblings]=await Promise.all([
  ids.length?rows(()=>user.from('staff_journal_lines').select('id,journal_entry_id').in('journal_entry_id',ids)):[],
  groups.length?rows(()=>user.from('staff_journal_lines').select('id,staff_journal_id,workspace_entry_no').in('staff_journal_id',groups).in('workspace_entry_no',names)):[]
 ]);
 const staff=[...new Set([...inherited,...siblings].map(r=>r.id))],linkedJournals=new Set(),linkedStaff=new Set();
 // Bound URL size even for a journal entry with many source lines.
 for(let offset=0;offset<Math.max(ids.length,staff.length);offset+=100){
  const main=ids.slice(offset,offset+100),source=staff.slice(offset,offset+100);
  const filters=[main.length?'journal_ids.ov.{'+main.join(',')+'}':'',source.length?'staff_line_ids.ov.{'+source.join(',')+'}':''].filter(Boolean).join(',');
  const docs=await rows(()=>user.from('scanner_documents208').select('id,journal_ids,staff_line_ids').is('superseded_by218',null).or(filters));
  for(const doc of docs){for(const id of doc.journal_ids||[])linkedJournals.add(id);for(const id of doc.staff_line_ids||[])linkedStaff.add(id);}
 }
 return {
  entries:labels.map(entry=>{const matches=journals.filter(r=>r.entry_no===entry),id=matches[0]?.id;return {entry,hasDocuments:matches.length!==1?null:linkedJournals.has(id)||inherited.some(r=>r.journal_entry_id===id&&linkedStaff.has(r.id))};}),
  staffLines:refs.map(staffLine=>{const line=selected.find(r=>r.id===staffLine);return {staffLine,hasDocuments:!line?null:siblings.some(r=>r.staff_journal_id===line.staff_journal_id&&r.workspace_entry_no===line.workspace_entry_no&&linkedStaff.has(r.id))};})
 };
}
