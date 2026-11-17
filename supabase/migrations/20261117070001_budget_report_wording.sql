-- Published wording is editable independently of the signed financial snapshot.
create table public.budget_report_wording (
  report_id uuid primary key references public.operational_reports(id) on delete cascade,
  report_version integer not null,
  revision integer not null check (revision > 0),
  notes text not null,
  descriptions jsonb not null check (jsonb_typeof(descriptions) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.budget_report_wording enable row level security;
revoke all on public.budget_report_wording from public, anon, authenticated;
grant select on public.budget_report_wording to authenticated;
create policy budget_wording_read on public.budget_report_wording for select to authenticated
using (public.is_admin() and public.accounting_workspace_allowed123());

create function public.save_budget_report_wording(p_report uuid, p_version integer, p_revision integer, p_notes text, p_descriptions jsonb)
returns integer language plpgsql security definer set search_path=pg_catalog as $$
declare
  snapshot public.operational_reports%rowtype;
  previous integer;
  movement_count integer;
begin
  if auth.uid() is null or public.is_admin() is not true or public.accounting_workspace_allowed123() is not true then
    raise exception 'Accounting administrator access required' using errcode='42501';
  end if;
  select * into snapshot from public.operational_reports where id=p_report for update;
  if not found or snapshot.version is distinct from p_version or snapshot.data->>'kind' is distinct from 'finance' then
    raise exception 'Report changed. Reopen its current version.';
  end if;
  if snapshot.data->>'mode'='utilization' and snapshot.data->>'status' is distinct from 'finalized' then
    raise exception 'Edit the notes in the draft worksheet.';
  end if;
  if snapshot.data->>'mode' is distinct from 'utilization' and not exists
    (select 1 from public.operational_reports where budget_request_id14316=p_report) then
    raise exception 'Edit the notes in the budget request.';
  end if;
  select revision into previous from public.budget_report_wording where report_id=p_report;
  if coalesce(previous,0) is distinct from p_revision then raise exception 'Wording changed. Reopen the report before editing.'; end if;
  movement_count=jsonb_array_length(coalesce(snapshot.data->'movements','[]'));
  if p_notes is null or jsonb_typeof(p_descriptions) is distinct from 'object' then raise exception 'Invalid report wording'; end if;
  if exists(select 1 from jsonb_each(p_descriptions) where
    case when key ~ '^(0|[1-9][0-9]{0,8})$' then key::integer>=movement_count else true end or jsonb_typeof(value)<>'string')
    then raise exception 'Unknown movement description'; end if;
  insert into public.budget_report_wording(report_id,report_version,revision,notes,descriptions)
    values(p_report,p_version,p_revision+1,p_notes,p_descriptions)
    on conflict(report_id) do update set report_version=excluded.report_version,revision=excluded.revision,
      notes=excluded.notes,descriptions=excluded.descriptions,updated_at=now(),updated_by=auth.uid();
  return p_revision+1;
end $$;
revoke all on function public.save_budget_report_wording(uuid,integer,integer,text,jsonb) from public,anon;
grant execute on function public.save_budget_report_wording(uuid,integer,integer,text,jsonb) to authenticated;
notify pgrst,'reload schema';
