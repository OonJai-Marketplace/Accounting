alter table public.receipt_drive_preview_state add column change_token text, add column next_change_token text,
  add column shared_drive_id text, add column watched_folders text[] not null default '{}';

-- Small per-entry versions let an unlocked administrator reuse already recorded pages.
create function public.receipt_login_index() returns table(entry text,stamp text)
language sql stable security invoker set search_path='' as $$
 with months as (select date_trunc('month',now() at time zone 'Asia/Vientiane') as m),
 attached as (select distinct unnest(d.journal_ids) as journal_id from public.scanner_documents208 d where d.superseded_by218 is null),
 recent as (
   select j.id,j.entry_no,j.transaction_date from attached a join public.journal_entries j on j.id=a.journal_id cross join months b
   where public.is_admin() and public.can_action113('journal','view') and public.active_account14228() and not public.password_change_required14257()
   and j.transaction_date>=b.m-interval '2 months' and j.transaction_date<b.m+interval '1 month' and j.status='posted'
   order by j.transaction_date desc,j.entry_no desc limit 8
 )
 select r.entry_no::text, md5(string_agg(d.id::text||'/'||d.revision::text||'/'||d.pages::text||'/'||coalesce(d.title,''),'|' order by d.id))
 from recent r join public.scanner_documents208 d on d.superseded_by218 is null and
 (d.journal_ids && array[r.id] or d.staff_line_ids && array(select l.id from public.staff_journal_lines l where l.journal_entry_id=r.id))
 group by r.id,r.entry_no,r.transaction_date order by r.transaction_date desc,r.entry_no desc
$$;
revoke all on function public.receipt_login_index() from public,anon;
grant execute on function public.receipt_login_index() to authenticated;
drop function public.receipt_login_entries();
notify pgrst,'reload schema';
