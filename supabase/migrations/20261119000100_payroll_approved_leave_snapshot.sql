-- Both writers take the month lock before the usual leave/finalization guards.
create or replace function private.guard_payroll_approved_leave() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  month_key text;
  expected jsonb;
  supplied jsonb;
begin
  if tg_table_name='payroll_leave_records' then
    for month_key in
      select distinct m from unnest(array[
        case when tg_op<>'INSERT' then old.data->>'month' end,
        case when tg_op<>'DELETE' then new.data->>'month' end
      ]) m where m ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' order by m
    loop
      perform pg_advisory_xact_lock(143488,replace(month_key,'-','')::int);
    end loop;
    if tg_op='DELETE' then
      if old.data->>'status'='approved' and exists (
        select 1 from public.payroll_runs p cross join lateral jsonb_array_elements(p.data->'rows') row_data
        where p.data->>'status'='finalized' and p.data->>'month'=old.data->>'month'
          and row_data->>'employeeId'=old.data->>'employeeId'
      ) then raise exception 'Finalized payroll retains its approved leave.'; end if;
      return old;
    end if;
    return new;
  end if;
  if new.data->>'status' is distinct from 'finalized'
    or (tg_op='UPDATE' and old.data->>'status'='finalized')
    or new.data->'correction277' is not null
    or (tg_op='INSERT' and new.data->'historicalImport199' is not null)
  then return new; end if;
  month_key:=new.data->>'month';
  if month_key is null or month_key !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' then raise exception 'Invalid payroll month'; end if;
  perform pg_advisory_xact_lock(143488,replace(month_key,'-','')::int);
  select coalesce(jsonb_agg(l.data || jsonb_build_object('id',l.id) order by l.id::text),'[]') into expected
  from public.payroll_leave_records l where l.data->>'month'=month_key and l.data->>'status'='approved';
  if jsonb_typeof(new.data->'leaveSnapshot') is distinct from 'array' then raise exception 'Approved leave snapshot required before closing payroll.'; end if;
  select coalesce(jsonb_agg(v order by v->>'id'),'[]') into supplied from jsonb_array_elements(new.data->'leaveSnapshot') v;
  if expected is distinct from supplied then raise exception 'Approved leave changed. Reload attendance and review payroll before closing.'; end if;
  return new;
end $$;
revoke all on function private.guard_payroll_approved_leave() from public,anon,authenticated;
create trigger a_check_approved_leave_close before insert or update on public.payroll_runs
for each row execute function private.guard_payroll_approved_leave();
create trigger a_lock_approved_leave_change before insert or update or delete on public.payroll_leave_records
for each row execute function private.guard_payroll_approved_leave();
