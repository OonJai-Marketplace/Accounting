-- Deployed migration: allow_constant_only_activity_probe
-- No accounting table is accessed. The exception is exact path, role and method.
create or replace function public.keepalive_ping()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.keepalive_ping() from public, authenticated, service_role;
grant execute on function public.keepalive_ping() to anon;

create or replace function public.account_request_gate14258()
returns void
language plpgsql
set search_path to 'pg_catalog'
as $$
begin
  if current_user = 'anon'
     and auth.uid() is null
     and current_setting('request.path', true) = '/rpc/keepalive_ping'
     and current_setting('request.method', true) = 'POST'
  then
    return;
  end if;
  perform public.password_gate14257();
  perform public.workspace_pre_request138();
  perform public.password_gate14257();
end
$$;
