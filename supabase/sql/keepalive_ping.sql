-- Deployed as Supabase migration add_isolated_keepalive_ping.
-- Only a constant is returned. No accounting table is read or changed.
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
