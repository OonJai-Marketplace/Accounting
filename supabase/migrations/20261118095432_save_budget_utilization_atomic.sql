-- One foreground request replaces capability, parent, record and receipt preflights.
-- Existing RLS, finalized-record guards and linked-request validation still apply.
create or replace function public.save_budget_utilization(p_report uuid, p_base_version integer, p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog set lock_timeout='5s' as $$
declare r public.operational_reports%rowtype; wanted integer=coalesce(p_base_version,0)+1;
begin
 if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true then
  raise exception 'Accounting administrator access required' using errcode='42501';
 end if;
 if p_report is null or p_base_version<1 or jsonb_typeof(p_data) is distinct from 'object'
  or p_data->>'kind' is distinct from 'finance' or p_data->>'mode' is distinct from 'utilization'
  or coalesce(p_data->>'status','') not in ('draft','finalized') then
  raise exception 'Invalid fund utilization save' using errcode='22023';
 end if;
 -- Serialize retries of the same new UUID, including two tabs receiving a lost reply.
 perform pg_advisory_xact_lock(hashtextextended(p_report::text,143470));
 select * into r from public.operational_reports where id=p_report for update;
 if found then
  if r.data->>'kind' is distinct from 'finance' or r.data->>'mode' is distinct from 'utilization' then
   raise exception 'Choose a fund utilization report' using errcode='22023';
  end if;
  if r.version=wanted and r.data=p_data then return to_jsonb(r); end if;
  if p_base_version is null or r.version<>p_base_version then
   raise exception 'This record changed in another session. Reopen its current version.' using errcode='40001';
  end if;
  update public.operational_reports set data=p_data,version=wanted where id=p_report and version=p_base_version returning * into r;
  if not found then raise exception 'Report is no longer editable.' using errcode='42501'; end if;
 else
  if p_base_version is not null then raise exception 'This record changed in another session. Reopen its current version.' using errcode='40001'; end if;
  insert into public.operational_reports(id,data,version) values(p_report,p_data,wanted) returning * into r;
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.save_budget_utilization(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_budget_utilization(uuid,integer,jsonb) to authenticated;
notify pgrst,'reload schema';
