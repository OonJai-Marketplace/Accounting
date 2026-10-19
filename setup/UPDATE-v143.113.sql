-- Shared payroll/statutory configuration. Applied to the live database.
create table public.payroll_tax_settings (
 id boolean primary key default true check (id),
 data jsonb not null check (jsonb_typeof(data->'payroll')='object' and jsonb_typeof(data->'tax')='object' and data ? 'payroll' and data ? 'tax'),
 version integer not null default 1 check(version>0),
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.payroll_tax_settings enable row level security;
revoke all on public.payroll_tax_settings from anon, authenticated;
grant select,insert,update on public.payroll_tax_settings to authenticated;
create policy payroll_tax_admin on public.payroll_tax_settings for all to authenticated
 using (public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257())
 with check (public.is_admin() and public.active_account14228() and public.accounting_workspace_allowed123() and not public.password_change_required14257() and updated_by=(select auth.uid()));
create or replace function public.check_payroll_tax_settings() returns trigger language plpgsql security invoker set search_path=public as $$
declare config public.payroll_tax_settings%rowtype;
begin
 if new.data->>'status'='finalized' and (TG_OP='INSERT' or old.data->>'status' is distinct from 'finalized') then
  select * into config from public.payroll_tax_settings where id=true for share;
  if not found or (new.data->>'settingsVersion') is distinct from config.version::text or
     new.data->'settingsSnapshot'->'payroll' is distinct from config.data->'payroll' or
     new.data->'settingsSnapshot'->'tax' is distinct from config.data->'tax' then
   raise exception 'Payroll and tax settings changed or have not been shared. Refresh and review payroll before finalizing.';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.check_payroll_tax_settings() from public,anon,authenticated;
create trigger check_payroll_tax_settings before insert or update on public.payroll_runs for each row execute function public.check_payroll_tax_settings();
