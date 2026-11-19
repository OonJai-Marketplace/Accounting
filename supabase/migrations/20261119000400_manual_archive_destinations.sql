-- Company-specific workbook identifiers are provisioned privately in each project.
create table private.manual_archive_destinations (
 purpose text primary key check(purpose in ('current','annual')),
 workbook_id text not null unique check(workbook_id ~ '^[A-Za-z0-9_-]{20,140}$'),
 title text not null, accounting_year integer,
 check((purpose='current' and accounting_year is null) or (purpose='annual' and accounting_year between 1900 and 2200))
);
alter table private.manual_archive_destinations enable row level security;
revoke all on private.manual_archive_destinations from public,anon,authenticated;
create function public.accounting_archive_destinations() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or public.is_admin() is distinct from true or public.active_account14228() is distinct from true
 or public.accounting_workspace_allowed123() is distinct from true or public.password_change_required14257() is distinct from false
 or public.can_action113('settings-accounting','edit') is distinct from true
 then raise exception 'Administrator archive access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',workbook_id,'name',title,'year',accounting_year)
 order by (purpose='current') desc),'[]') from private.manual_archive_destinations);
end $$;
revoke all on function public.accounting_archive_destinations() from public,anon;
grant execute on function public.accounting_archive_destinations() to authenticated;
