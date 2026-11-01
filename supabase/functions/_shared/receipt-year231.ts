import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import {aliases218,canonicalID218,idRequest} from '../scanner-integration/ids215.mjs';
const checked=(r:any)=>{if(r.error)throw Error(r.error.message);return r.data;};
// Resolve dated journal targets through the same caller permissions as ID selection.
export async function receiptYear231(req:Request,owner:string,b:any){
 const groups=idRequest(b),user=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')!}},auth:{persistSession:false,autoRefreshToken:false}});
 const labels=[...new Set(groups.filter((g:any)=>g.type==='journal').flatMap((g:any)=>aliases218(g.label)))],years=new Set<number>();
 const canEdit=checked(await user.rpc('can_action113',{p_target:'journal',p_action:'edit'})),canOwn=checked(await user.rpc('can_action113',{p_target:'sub-users-workspace',p_action:'view'}));
 const entries=canEdit&&labels.length?checked(await user.from('journal_entries').select('id,entry_no,transaction_date,status').in('entry_no',labels).limit(201)):[];
 const lines=canOwn&&labels.length?checked(await user.from('staff_journal_lines').select('id,workspace_entry_no,transaction_date,staff_journal_id,staff_journals!inner(owner_id)').in('workspace_entry_no',labels).eq('staff_journals.owner_id',owner).limit(10001)):[];
 if(entries.length>=201||lines.length>=10001)throw Error('Check fewer receipt IDs in one PDF.');
 for(const g of groups){if(g.type!=='journal'){const day=String(b.documentDate||'');if(!/^(19|20|21)\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw Error('Choose a valid document date for HR or other supporting documents.');years.add(Number(day.slice(0,4)));continue;}
  const match=entries.filter((e:any)=>canonicalID218(e.entry_no)===canonicalID218(g.label)&&!/void|deleted/i.test(e.status||''));
  const own=lines.filter((e:any)=>canonicalID218(e.workspace_entry_no)===canonicalID218(g.label));
  if(match.length===1)years.add(Number(match[0].transaction_date.slice(0,4)));
  else if(!match.length&&own.length&&new Set(own.map((e:any)=>e.staff_journal_id)).size===1)for(const line of own)years.add(Number(line.transaction_date.slice(0,4)));
  else throw Error('Recheck '+g.label+' before saving its receipts.');
 }
 if(years.size!==1)throw Error('This PDF includes different accounting years. Save each year in a separate batch; your scans are kept.');
 const year=[...years][0],current=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Vientiane',year:'numeric'}).format(new Date()));
 if(!Number.isInteger(year)||year<1900||year>2198)throw Error('The accounting year could not be verified.');
 if(year>current)throw Error('The '+year+' destination is prepared in advance; uploads for that year start on January 1. Your scans are kept.');return year;
}
