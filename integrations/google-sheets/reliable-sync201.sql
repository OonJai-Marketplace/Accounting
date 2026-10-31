-- Apply after automatic-history194.sql. No financial or HR rows are changed.
alter table private.sheet_archive_config194 add column if not exists saved_revision bigint not null default -1;
create or replace function public.sheet_archive_mark_live201(p_lease uuid,p_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
 update private.sheet_archive_config194 set saved_revision=p_revision where lease=p_lease;
 if not found then raise exception 'Archive lease changed';end if;
end $$;
revoke all on function public.sheet_archive_mark_live201(uuid,bigint) from public,anon,authenticated;
grant execute on function public.sheet_archive_mark_live201(uuid,bigint) to service_role;
-- Event-driven writes remain immediate. This recovers network/quota failures and
-- lost wakeups without rewriting an idle workbook or relying on an open browser.
select cron.schedule('accounting-sheet-retry201','*/5 * * * *',
 $job$select public.sheet_archive_wake194() where exists(
 select 1 from private.sheet_archive_config194 where enabled and (lease_until is null or lease_until<now())
 and (revision<>saved_revision or exists(select 1 from private.sheet_archive_queue194)))$job$);
-- The coherent business snapshot can exceed the API's default eight seconds.
-- Extend this internal RPC only; normal interactive requests keep their limits.
alter function public.sheet_archive_job194(uuid) set statement_timeout='60s';
notify pgrst, 'reload schema';
-- Skip the expensive snapshot while merely draining already mirrored revisions.
create or replace function public.sheet_archive_job194(p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' as $$
declare c private.sheet_archive_config194; queued jsonb; snapshot jsonb; begin
 update private.sheet_archive_config194 set lease=p_lease,lease_until=now()+interval '5 minutes'
 where id and enabled and (lease_until is null or lease_until<now()) returning * into c;
 if not found then return null;end if;
 select coalesce(jsonb_agg(q order by id),'[]') into queued from
 (select * from private.sheet_archive_queue194 order by id limit 1000) q;
 if c.saved_revision<>c.revision then snapshot:=private.sheet_archive_snapshot194();else snapshot:='{}'::jsonb;end if;
 return jsonb_build_object('config',to_jsonb(c),'tables',snapshot,'queue',queued,
 'years',(select coalesce(jsonb_agg(y order by year),'[]') from private.sheet_archive_years194 y));
end $$;
notify pgrst, 'reload schema';
