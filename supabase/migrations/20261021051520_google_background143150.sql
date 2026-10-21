create extension if not exists pg_net;

-- Server-only encrypted credentials and short-lived OAuth states. No journal writes.
create table if not exists public.google_connections143150 (
 sheet text primary key, owner uuid not null references auth.users(id), email text not null,
 refresh_token text not null, access_token text, expires_at timestamptz
);
create table if not exists public.google_states143150 (
 state_hash text primary key, owner uuid not null references auth.users(id), sheet text not null,
 expires_at timestamptz not null
);
create table if not exists public.google_inbox143150 (
 sheet text primary key, notices jsonb not null default '[]', checked_at timestamptz, error text
);
alter table public.google_connections143150 enable row level security;
alter table public.google_states143150 enable row level security;
alter table public.google_inbox143150 enable row level security;
revoke all on public.google_connections143150,public.google_states143150,public.google_inbox143150 from public,anon,authenticated;
grant all on public.google_connections143150,public.google_states143150,public.google_inbox143150 to service_role;
grant select on public.google_inbox143150 to authenticated;
create policy google_inbox_review143150 on public.google_inbox143150 for select to authenticated
 using (public.accounting_workspace_allowed123() and public.can_action113('journal','post') and
 sheet=(select data->'googleSheets143129'->>'sheet' from public.budget_settings14313 where id=true));
-- Store the scheduler credential in Vault; never return it to browser roles.
do $$begin
 if not exists(select 1 from vault.secrets where name='google_poll143150') then
 perform vault.create_secret(gen_random_uuid()::text||gen_random_uuid()::text,'google_poll143150');
 end if;
end$$;
create or replace function public.google_poll_key143150() returns text
 language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='google_poll143150';
$$;
revoke all on function public.google_poll_key143150() from public,anon,authenticated;
grant execute on function public.google_poll_key143150() to service_role;
select cron.schedule('google-inbox143150','* * * * *', $cron$
 select net.http_post(
 url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/google-journal-bridge',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||public.google_poll_key143150()),
 body:='{"action":"poll"}'::jsonb,timeout_milliseconds:=55000)
 where exists(select 1 from public.google_connections143150);
 delete from public.google_states143150 where expires_at<now();
$cron$);
