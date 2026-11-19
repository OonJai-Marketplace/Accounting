-- A small version index covers the elapsed year, including recent December receipts in January.
-- A returning device can spend its preparation budget on the next missing page.
drop function public.receipt_login_index();
create function public.receipt_login_index() returns jsonb language sql stable security invoker set search_path='' as $$
 with bounds as (select date_trunc('month',now() at time zone 'Asia/Vientiane') as m),
 docs as materialized (
  select d.id,d.journal_ids,d.staff_line_ids,md5(d.revision::text||'/'||d.pages::text||'/'||coalesce(d.title,'')) as rev
  from public.scanner_documents208 d where d.superseded_by218 is null and public.is_admin() and public.can_action113('journal','view')
  and public.active_account14228() and not public.password_change_required14257()
 ), links as (
  select d.id,d.rev,unnest(d.journal_ids) journal_id from docs d
  union
  select d.id,d.rev,l.journal_entry_id from docs d cross join lateral unnest(d.staff_line_ids) x(line_id)
   join public.staff_journal_lines l on l.id=x.line_id where l.journal_entry_id is not null
 ), entries as (
  select j.entry_no,j.transaction_date,md5(string_agg(d.id::text||d.rev,'|' order by d.id)) stamp
  from links d join public.journal_entries j on j.id=d.journal_id cross join bounds b
  where j.transaction_date>=least(date_trunc('year',b.m),b.m-interval '2 months') and j.transaction_date<b.m+interval '1 month' and j.status='posted'
  group by j.id,j.entry_no,j.transaction_date
 )
 select coalesce(jsonb_agg(jsonb_build_object('entry',entry_no,'stamp',stamp) order by transaction_date desc,entry_no desc),'[]'::jsonb) from entries
$$;
revoke all on function public.receipt_login_index() from public,anon;
grant execute on function public.receipt_login_index() to authenticated;
notify pgrst,'reload schema';
