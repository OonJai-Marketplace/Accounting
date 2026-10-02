-- Adds personal print defaults and an administrator-only audit-log action.
-- Run once in Supabase SQL Editor. Installing this does not delete any records.
begin;
create table if not exists public.user_print_preferences1434 (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 data jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.user_print_preferences1434 enable row level security;
drop policy if exists own_print_defaults1434 on public.user_print_preferences1434;
create policy own_print_defaults1434 on public.user_print_preferences1434
 for all to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select,insert,update,delete on public.user_print_preferences1434 to authenticated;
revoke all on public.user_print_preferences1434 from anon;
create or replace function public.audit_month1434(
 p_month date, p_confirm boolean default false,
 p_audit_ids text[] default array[]::text[], p_deletion_ids text[] default array[]::text[]
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare start_at timestamptz; end_at timestamptz; audit_ids text[]; deletion_ids text[]; removed integer:=0; n integer;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access required'; end if;
 if p_month is null or p_month<>date_trunc('month',p_month)::date then raise exception 'Select a valid month'; end if;
 start_at:=p_month::timestamp at time zone 'UTC';
 end_at:=(p_month+interval '1 month')::timestamp at time zone 'UTC';
 if not p_confirm then
  select coalesce(array_agg(id::text),array[]::text[]) into audit_ids from public.audit_log
   where created_at>=start_at and created_at<end_at
   and table_name in ('journal_entries','accounting_periods','period_findings','scheduled_journals');
  if to_regclass('public.record_deletions108') is not null then
   execute 'select coalesce(array_agg(id::text),array[]::text[]) from public.record_deletions108 where deleted_at >= $1 and deleted_at < $2' into deletion_ids using start_at,end_at;
  end if;
  return jsonb_build_object('audit_ids',audit_ids,'deletion_ids',coalesce(deletion_ids,array[]::text[]));
 end if;
 -- Delete only the IDs previewed and explicitly confirmed. New arrivals survive.
 delete from public.audit_log where id::text=any(p_audit_ids) and created_at>=start_at and created_at<end_at
  and table_name in ('journal_entries','accounting_periods','period_findings','scheduled_journals');
 get diagnostics n=row_count; removed:=removed+n;
 if to_regclass('public.record_deletions108') is not null then
  execute 'delete from public.record_deletions108 where id::text=any($1) and deleted_at >= $2 and deleted_at < $3' using p_deletion_ids,start_at,end_at;
  get diagnostics n=row_count; removed:=removed+n;
 end if;
 return jsonb_build_object('deleted',removed);
end $$;
revoke all on function public.audit_month1434(date,boolean,text[],text[]) from public;
grant execute on function public.audit_month1434(date,boolean,text[],text[]) to authenticated;


-- Read the saved source and its posted ledger together. Staff cannot fetch other
-- owners' records or drafts through this report function.
create or replace function public.staff_report1434(p_journal uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.staff_journals%rowtype; actor_permissions jsonb; owner_permissions jsonb;
 source_lines jsonb; posted_entries jsonb; account_rows jsonb; user_data jsonb;
 linked uuid[]; permitted boolean; reviewer boolean;
begin
 if auth.uid() is null then raise exception 'Sign in to print'; end if;
 select * into j from public.staff_journals where id=p_journal;
 if not found then raise exception 'Saved report not found'; end if;
 select to_jsonb(p) into actor_permissions from public.user_permissions p where user_id=auth.uid();
 select to_jsonb(p) into owner_permissions from public.user_permissions p where user_id=j.owner_id;
 permitted:=coalesce(actor_permissions->'module_actions113'->'document-editor105','[]'::jsonb) @> '["view","export"]'::jsonb;
 reviewer:=coalesce(actor_permissions->'module_actions113'->'user-entry-review','[]'::jsonb) @> '["view","export"]'::jsonb
  and owner_permissions->>'manager_id'=auth.uid()::text;
 if not public.is_admin() then
  if not coalesce(permitted,false) or not (j.owner_id=auth.uid() or coalesce(reviewer,false)) then raise exception 'Report print permission required'; end if;
  if j.status::text not in ('approved','posted','reviewed','approved_posted') then raise exception 'Only approved reports can be printed'; end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(l) order by l.transaction_date,l.line_no),'[]'::jsonb),
  coalesce(array_agg(distinct l.journal_entry_id) filter(where l.journal_entry_id is not null),array[]::uuid[])
 into source_lines,linked from public.staff_journal_lines l where staff_journal_id=j.id;
 select coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('lines',
  (select coalesce(jsonb_agg(to_jsonb(l) order by l.id),'[]'::jsonb) from public.journal_lines l where l.journal_entry_id=e.id))),'[]'::jsonb)
 into posted_entries from public.journal_entries e where e.id=any(linked) and e.status::text='posted';
 if jsonb_array_length(posted_entries)<>cardinality(linked) then raise exception 'A linked journal is missing or no longer posted. Review this report before printing'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.code,'name',a.name,
  'currency_code',a.currency_code,'account_type',a.account_type,'parent_code',to_jsonb(a)->>'parent_code')),'[]'::jsonb)
 into account_rows from public.accounts a;
 select jsonb_build_object('id',p.id,'full_name',p.full_name,'email',p.email,'role',p.role,'job_title',owner_permissions->>'job_title') into user_data
 from public.profiles p where p.id=j.owner_id;
 return jsonb_build_object('journal',to_jsonb(j)||jsonb_build_object('lines',source_lines),
  'user',user_data,'accounts',account_rows,'posted',posted_entries);
end $$;
revoke all on function public.staff_report1434(uuid) from public;
grant execute on function public.staff_report1434(uuid) to authenticated;
commit;
