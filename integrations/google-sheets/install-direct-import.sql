-- Deployed through Supabase apply_migration: sheets_journal_import_v2.
-- Read-only, invoker permissions; existing RLS remains in effect.
create or replace function public.sheets_journal_import_v2(p_from date,p_to date)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.voucher_admin14299() or public.password_change_required14257() then
  raise exception 'Active accounting administrator required' using errcode='42501';
 end if;
 if p_from is null or p_to is null or p_from>p_to then raise exception 'Invalid date range'; end if;
 with lines as materialized (
  select l.id,l.journal_entry_id,e.entry_no,coalesce(l.line_date,e.transaction_date) as d,l.line_no,
   jsonb_build_array(coalesce(l.line_date,e.transaction_date),e.entry_no,e.status,e.memo,
   l.account_id,a.code,a.name,a.account_type,coalesce(l.currency_code,a.currency_code),
   l.debit,l.credit,l.debit-l.credit,l.description,l.id,e.id,e.reference) as cells
  from public.journal_lines l join public.journal_entries e on e.id=l.journal_entry_id
  left join public.accounts a on a.id=l.account_id
  where e.status='posted' and coalesce(l.line_date,e.transaction_date)<=p_to
  order by coalesce(l.line_date,e.transaction_date),e.entry_no,e.id,l.line_no,l.id
  limit 10001
 ), selected as (select * from lines where d>=p_from),
 rows_pack as (select coalesce(jsonb_agg(cells order by d,entry_no,journal_entry_id,line_no,id),'[]'::jsonb) as rows from lines),
 entry_pack as (select journal_entry_id,entry_no,min(d) as first_date,max(d) as last_date,count(*) as lines from selected group by journal_entry_id,entry_no)
 select jsonb_build_object('version',2,'createdAt',statement_timestamp(),'from',p_from,'to',p_to,
  'rowsJson',(select rows::text from rows_pack),'hash',(select md5(rows::text) from rows_pack),
  'accounts', (select coalesce(jsonb_agg(jsonb_build_array(id,code,name,account_type,currency_code,account_purpose,is_active,description) order by code,id),'[]'::jsonb) from public.accounts),
  'receipt',jsonb_build_object('lines',(select count(*) from selected),'entries',(select count(*) from entry_pack),
   'firstId',(select entry_no from selected order by d,entry_no,journal_entry_id,line_no,id limit 1),
   'lastId',(select entry_no from selected order by d desc,entry_no desc,journal_entry_id desc,line_no desc,id desc limit 1),
   'firstDate',(select min(d) from selected),'lastDate',(select max(d) from selected),
   'priorLines',(select count(*) from lines where d<p_from),'totalLines',(select count(*) from lines)),
  'entryList',(select coalesce(jsonb_agg(jsonb_build_array(entry_no,journal_entry_id,first_date,last_date,lines) order by first_date,entry_no,journal_entry_id),'[]'::jsonb) from entry_pack)
 ) into result;
 if (result->'receipt'->>'totalLines')::int>10000 then raise exception 'Snapshot exceeds 10000 journal lines including opening history; capacity must be extended'; end if;
 if jsonb_array_length(result->'accounts')>5000 then raise exception 'Account capacity exceeded'; end if;
 return result;
end $$;
revoke all on function public.sheets_journal_import_v2(date,date) from public,anon;
grant execute on function public.sheets_journal_import_v2(date,date) to authenticated;
