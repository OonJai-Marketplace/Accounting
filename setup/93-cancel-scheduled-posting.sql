-- Run after 92-schedule-corrections.sql. Uses the app's existing audited void operation.
begin;
alter table public.scheduled_journal_occurrences add column if not exists cancelled_at timestamptz;
alter table public.scheduled_journal_occurrences add column if not exists cancelled_by uuid references public.profiles(id);
alter table public.scheduled_journal_occurrences add column if not exists cancel_reason text;
create or replace function public.cancel_scheduled_posting93(p_occurrence uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare o public.scheduled_journal_occurrences;j public.journal_entries;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Cancellation reason required';end if;
 select * into o from public.scheduled_journal_occurrences where id=p_occurrence for update;
 if not found then raise exception 'Scheduled posting not found';end if;
 if o.cancelled_at is not null then return;end if;
 select * into j from public.journal_entries where id=o.journal_entry_id for update;
 if not found then raise exception 'Journal entry not found';end if;
 if j.status<>'posted' then raise exception 'This journal is already voided or unavailable';end if;
 if exists(select 1 from public.accounting_periods where period_month=date_trunc('month',j.transaction_date)::date and status<>'open') then raise exception 'Reopen the posting period before cancelling this journal';end if;
 perform public.void_journal_entry(j.id,'Cancelled scheduled occurrence '||o.occurrence_date::text||': '||trim(p_reason));
 if exists(select 1 from public.journal_entries where id=j.id and status='posted') then raise exception 'The journal was not voided';end if;
 update public.scheduled_journal_occurrences set cancelled_at=now(),cancelled_by=auth.uid(),cancel_reason=trim(p_reason),reviewed_at=null,reviewed_by=null where id=o.id;
 -- Keep the consumed occurrence and schedule's next_due. Cancellation never reposts it.
end $$;
revoke all on function public.cancel_scheduled_posting93(uuid,text) from public,anon;
grant execute on function public.cancel_scheduled_posting93(uuid,text) to authenticated;
create or replace function public.post_scheduled_one92(p_id uuid,p_expected_due date,p_early boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare s public.scheduled_journals;n text;entry_status text;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_expected_due is null then raise exception 'Scheduled date required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule was deleted or is unavailable';end if;
 select j.entry_no,j.status into n,entry_status from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id where o.schedule_id=p_id and o.occurrence_date=p_expected_due;
 if found then
  if entry_status<>'posted' then raise exception 'This occurrence was cancelled and will not be reposted';end if;
  return n;
 end if;
 if s.next_due<>p_expected_due then raise exception 'Schedule changed. Refresh before posting';end if;
 return public.post_scheduled_one91(p_id,p_early);
end $$;
revoke all on function public.post_scheduled_one92(uuid,date,boolean) from public,anon;
grant execute on function public.post_scheduled_one92(uuid,date,boolean) to authenticated;
commit;
