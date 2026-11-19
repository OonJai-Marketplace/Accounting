-- A folder check starts on administrator request. Continue only unfinished work from that request.
select cron.unschedule(jobid) from cron.job where jobname='receipt-drive-preview';

create function private.finish_receipt_check_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.scope is distinct from private.active_receipt_alert_scope() then return null; end if;
 if new.cursor is not null then
   if old.lease is not null and new.last_error is null then perform private.run_receipt_drive_preview(); end if;
 elsif new.alerts_dirty then
   perform pg_advisory_xact_lock(84675198325);
   delete from public.receipt_drive_issues where issue_key<>'connection';
   insert into public.receipt_drive_issues select * from private.receipt_file_problems(new.scope);
   update public.receipt_drive_preview_state set alerts_dirty=false where scope=new.scope;
   perform private.publish_receipt_notice();
 end if;
 return null;
end $$;
revoke all on function private.finish_receipt_check_event() from public,anon,authenticated;
create trigger finish_receipt_check_event after update of lease,alerts_dirty on public.receipt_drive_preview_state
for each row when (new.lease is null and (old.lease is not null or (new.alerts_dirty and not old.alerts_dirty)))
execute function private.finish_receipt_check_event();

-- A new explicit folder check can immediately retry a transient preparation failure.
create or replace function private.receipt_links_after_scan() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.receipt_drive_link_jobs set available=now() where scope=new.scope and state='queued' and attempts>0 and available>now();
 perform private.dispatch_receipt_links(new.scope);
 return new;
end $$;

-- Return a small newest-first list. The caller's row policies govern both sources.
create function public.receipt_login_entries() returns table(entry text)
language sql stable security invoker set search_path='' as $$
 with bounds as (select date_trunc('month', now() at time zone 'Asia/Vientiane') as m),
 attached as (
   select distinct unnest(d.journal_ids) as journal_id from public.scanner_documents208 d
   where d.superseded_by218 is null
 )
 select j.entry_no::text from attached a join public.journal_entries j on j.id=a.journal_id cross join bounds b
 where public.is_admin() and public.can_action113('journal','view') and public.active_account14228()
 and not public.password_change_required14257() and j.transaction_date >= b.m - interval '2 months'
 and j.transaction_date < b.m + interval '1 month' and j.status='posted'
 order by j.transaction_date desc,j.entry_no desc limit 8
$$;
revoke all on function public.receipt_login_entries() from public,anon;
grant execute on function public.receipt_login_entries() to authenticated;
