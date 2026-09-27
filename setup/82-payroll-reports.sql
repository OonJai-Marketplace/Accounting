-- Oon Jai: payroll, leave and operational reports. Run once in the existing Supabase project.
-- Uses existing public.is_admin(); no existing business records or settings are changed.
begin;
create table if not exists public.payroll_employees (
 id uuid primary key default gen_random_uuid(), data jsonb not null check(jsonb_typeof(data)='object'),
 version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid not null default auth.uid() references public.profiles(id)
);
create table if not exists public.payroll_leave_records (like public.payroll_employees including all);
create table if not exists public.payroll_runs (like public.payroll_employees including all);
create table if not exists public.operational_reports (like public.payroll_employees including all);
create unique index if not exists payroll_employee_code_unique on public.payroll_employees(lower(data->>'code')) where coalesce(data->>'code','')<>'';
create or replace function public.guard_payroll_report_record82() returns trigger language plpgsql set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required'; end if;
 if tg_op='UPDATE' then
  if new.version<>old.version+1 then raise exception 'Record version conflict'; end if;
  if tg_table_name='payroll_runs' and old.data->>'status'='finalized' then raise exception 'Finalized payroll is immutable. Create a new correction run.'; end if;
  new.created_at=old.created_at;
 end if;

 if tg_table_name='payroll_employees' and (coalesce(trim(new.data->>'code'),'')='' or coalesce(trim(new.data->>'name'),'')='') then raise exception 'Employee code and name are required'; end if;
 if tg_table_name='payroll_runs' then
  if coalesce(new.data->>'status','') not in ('draft','finalized') or coalesce(new.data->>'month','') !~ '^\d{4}-(0[1-9]|1[0-2])$' or jsonb_typeof(new.data->'rows') is distinct from 'array' then raise exception 'Invalid payroll run'; end if;
  if new.data->>'status'='finalized' and (jsonb_typeof(new.data->'results') is distinct from 'array' or jsonb_typeof(new.data->'config') is distinct from 'object' or jsonb_array_length(new.data->'results')=0) then raise exception 'Finalized payroll requires calculated results and applied rules'; end if;
 end if;
 if tg_table_name='payroll_leave_records' then
  if coalesce(new.data->>'status','') not in ('pending','approved','cancelled') or not exists(select 1 from public.payroll_employees where id::text=new.data->>'employeeId') then raise exception 'Invalid leave record or employee'; end if;
  if exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=new.data->>'month' and employee->>'employeeId'=new.data->>'employeeId') then raise exception 'Payroll for this employee and month is finalized; retain the leave record and document corrections in a later period'; end if;
  if tg_op='UPDATE' and exists(select 1 from public.payroll_runs r cross join lateral jsonb_array_elements(r.data->'rows') employee where r.data->>'status'='finalized' and r.data->>'month'=old.data->>'month' and employee->>'employeeId'=old.data->>'employeeId') then raise exception 'Leave included in finalized payroll is immutable'; end if;
 end if;
 if tg_table_name='operational_reports' and coalesce(new.data->>'kind','') not in ('subuser','finance') then raise exception 'Invalid report type'; end if;
 new.updated_at=now();new.updated_by=auth.uid();return new;
end $$;
do $$ declare t text;begin
 foreach t in array array['payroll_employees','payroll_leave_records','payroll_runs','operational_reports'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select, insert, update on public.%I to authenticated',t);
 execute format('drop policy if exists admin_records82 on public.%I',t);
 execute format('create policy admin_records82 on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
 execute format('drop trigger if exists guard_record82 on public.%I',t);
 execute format('create trigger guard_record82 before insert or update on public.%I for each row execute function public.guard_payroll_report_record82()',t);
 end loop;
end $$;
commit;
