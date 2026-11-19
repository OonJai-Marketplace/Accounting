-- One administrator refresh at a time. Refresh calls renew this only while data is moving.
create table private.manual_archive_lease (
 singleton boolean primary key default true check(singleton),
 actor uuid not null, operation uuid not null, expires_at timestamptz not null
);
alter table private.manual_archive_lease enable row level security;
revoke all on private.manual_archive_lease from public,anon,authenticated;
create function public.accounting_archive_job(p_operation uuid,p_action text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_admin() or not public.active_account14228() or not public.accounting_workspace_allowed123()
 or public.password_change_required14257() or not public.can_action113('settings-accounting','edit')
 then raise exception 'Administrator archive access required' using errcode='42501'; end if;
 if p_operation is null then raise exception 'Missing refresh ID'; end if;
 if p_action='start' then
  insert into private.manual_archive_lease as current(actor,operation,expires_at)
  values(auth.uid(),p_operation,clock_timestamp()+interval '10 minutes')
  on conflict(singleton) do update set actor=excluded.actor,operation=excluded.operation,expires_at=excluded.expires_at
  where current.expires_at<clock_timestamp() or (current.operation=p_operation and current.actor=auth.uid());
 elsif p_action='renew' then
  update private.manual_archive_lease set expires_at=clock_timestamp()+interval '10 minutes'
  where operation=p_operation and actor=auth.uid() and expires_at>clock_timestamp();
 elsif p_action='finish' then
  delete from private.manual_archive_lease where operation=p_operation and actor=auth.uid();
 else raise exception 'Unknown archive operation'; end if;
 return found;
end $$;
revoke all on function public.accounting_archive_job(uuid,text) from public,anon;
grant execute on function public.accounting_archive_job(uuid,text) to authenticated;
