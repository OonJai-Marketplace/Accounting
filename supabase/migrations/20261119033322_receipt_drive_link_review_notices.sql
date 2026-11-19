-- Keep the folder check and the attachment worker on one bell item for the same problem.
alter function private.receipt_file_problems(text) rename to receipt_name_problems;
create function private.receipt_file_problems(p_scope text)
returns table(issue_key text,title text,detail text,fix text) language sql stable set search_path='' as $$
 with base as materialized(select * from private.receipt_name_problems(p_scope)),
 reviews as materialized(
   select j.file_id,j.name,j.folder,j.state,j.note,j.first_label,j.part,
     substring(j.note from '^(OJM[0-9]{6}) already has a receipt from ') duplicate_entry
   from public.receipt_drive_link_jobs j join public.receipt_drive_preview_files f using(scope,file_id)
   where j.scope=p_scope and j.state in ('review','waiting')
     and (j.name,j.folder,j.content_key,j.pages)=(f.name,f.folder,f.content_key,f.pages)
 ), matched as (
   select b.issue_key,string_agg(format('“%s” is waiting for review.',r.name),' ' order by r.name,r.file_id) waiting
   from base b join reviews r on b.issue_key='overlap:'||r.duplicate_entry||':'||r.part::text
   group by b.issue_key
 )
 select b.issue_key,b.title,b.detail||case when m.waiting is null then ''
   else ' The entry already has a receipt. '||m.waiting end,b.fix
 from base b left join matched m using(issue_key)
 union all
 select 'link:'||r.file_id,
   case when r.duplicate_entry is not null then r.duplicate_entry||' already has a receipt'
    when r.state='waiting' then 'The receipt is waiting for a journal entry'
    when r.note like 'This file changed after linking%' then 'A receipt changed after it was attached'
    else 'A receipt needs review before it can be attached' end,
   format('“%s” in “%s”. ',r.name,r.folder)||
    case when r.duplicate_entry is not null then r.note
     when r.state='waiting' then 'Accounting could not match the filename to one posted journal entry.'
     when r.note like 'This file changed after linking%' then 'The earlier receipt is still attached to the entry.'
     when r.note like 'The Drive file moved or changed%' then 'The file moved or changed while Accounting was reading it.'
     when r.note like '%1,000 pages%' then 'This file has more than 1,000 pages for one entry.'
     when r.note like '%size limit%' then 'The file is too large to open as a receipt.'
     else 'Accounting could not prepare all the receipt pages.' end,
   case when r.duplicate_entry is not null then 'Compare it with the receipt already on the entry. Move a spare copy out of the folder, or name an extra receipt with the next unused part number.'
    when r.state='waiting' then 'Compare the number in the filename with the posted journal. Correct the filename if the number is wrong.'
    when r.note like 'This file changed after linking%' then 'Open the receipt already on the journal entry and compare it with the current Drive file. Save extra pages as a separate numbered part.'
    when r.note like '%1,000 pages%' or r.note like '%size limit%' then 'Split the PDF into smaller files and give each part its own number.'
    else 'Open the file in the company Drive folder. Check the entry number and that every page opens, then save a corrected PDF.' end
 from reviews r where not exists (
  select 1 from base b where b.issue_key='file:'||r.file_id or b.issue_key='entry:'||r.file_id
    or b.issue_key='overlap:'||r.duplicate_entry||':'||r.part::text
 )
$$;
revoke all on function private.receipt_file_problems(text) from public,anon,authenticated;
grant execute on function private.receipt_file_problems(text) to service_role;

-- Only terminal review changes invalidate the existing completed-folder check.
create function private.receipt_link_review_changed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.receipt_drive_preview_state set alerts_dirty=true where scope=new.scope and not alerts_dirty;
 return null;
end $$;
revoke all on function private.receipt_link_review_changed() from public,anon,authenticated;
create trigger receipt_link_review_changed after update of state,note on public.receipt_drive_link_jobs
for each row when ((new.state in ('review','waiting') or old.state in ('review','waiting'))
 and (new.state,new.note) is distinct from (old.state,old.note)) execute function private.receipt_link_review_changed();
update public.receipt_drive_preview_state set alerts_dirty=true where scope=private.active_receipt_alert_scope();
