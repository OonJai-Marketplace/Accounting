-- Cover Google request timeouts and the bounded batch acknowledgement loop.
create or replace function public.hope_lock183(p_token uuid) returns boolean language plpgsql set search_path='' as $$
begin
 update public.hope_sync183 set lease_token=p_token,lease_until=now()+interval '5 minutes' where id and lease_until<now();return found;
end $$;
-- These are deliberately service-only tables; no client policy grants access.
create policy hope_service183 on public.hope_messages183 for all to service_role using(true) with check(true);
create policy hope_reads_service183 on public.hope_reads183 for all to service_role using(true) with check(true);
create policy hope_sync_service183 on public.hope_sync183 for all to service_role using(true) with check(true);
