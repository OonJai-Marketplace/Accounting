-- On-demand inboxes and month-close Google history. Accounting saves remain immediate.
-- Run as one transaction. Existing function privileges and search_path stay unchanged.
set lock_timeout='5s';
set statement_timeout='30s';
do $$begin
 if to_regprocedure('public.storage_year_finish231(uuid,bigint[],boolean)') is null then raise exception 'Install yearly storage231 before this update';end if;
 if (select count(*) from cron.job where jobname in ('google-inbox143150','word-of-hope183','accounting-sheet-retry201','accounting-yearly-storage231'))<>4 then raise exception 'Expected background jobs are missing; inspect before applying';end if;
 if exists(select 1 from private.sheet_archive_config194 where lease_until>now()) then raise exception 'An archive copy is still running; wait for it to finish before applying';end if;
end $$;
alter table private.sheet_archive_config194 add column if not exists copy_requested239 boolean not null default false;
update private.sheet_archive_config194 set copy_requested239=true where lease is not null or last_error is not null;

create or replace function private.sheet_archive_capture194() returns trigger
language plpgsql security definer set search_path='' as $$
declare request_copy boolean:=false;
begin
 if TG_OP='UPDATE' and to_jsonb(OLD)=to_jsonb(NEW) then return NEW; end if;
 -- Keep every revision durable until Google readback succeeds, including deleted rows.
 insert into private.sheet_archive_queue194(table_name,operation,record)
 values(TG_TABLE_NAME,TG_OP,case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end);
 update private.sheet_archive_config194 set revision=revision+1 where id;
 if TG_TABLE_NAME='year_closings136' and TG_OP='INSERT' then
  insert into private.sheet_archive_years194(year,closed_at,snapshot)
  values(NEW.year,NEW.closed_at,private.sheet_archive_snapshot194()) on conflict(year) do nothing;
  request_copy:=true;
 elsif TG_TABLE_NAME='accounting_periods' and TG_OP in ('INSERT','UPDATE') then
  request_copy:=to_jsonb(NEW)->>'status' in ('closed','locked')
   and (TG_OP='INSERT' or coalesce(to_jsonb(OLD)->>'status','') not in ('closed','locked'));
 end if;
 if request_copy and current_setting('app.sheet_archive_woken194',true) is distinct from 'yes' then
  perform set_config('app.sheet_archive_woken194','yes',true);
  perform public.sheet_archive_wake194();
 end if;
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;

create or replace function public.sheet_archive_wake194() returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 update private.sheet_archive_config194 set copy_requested239=true where id and enabled;
 if not found then return null; end if;
 select net.http_post(url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/accounting-sheet-archive',
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||public.google_poll_key143150()),
  body:='{"action":"sync"}'::jsonb,timeout_milliseconds:=120000) into n;
 return n;
end $$;

create or replace function public.sheet_archive_job194(p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' as $$
declare c private.sheet_archive_config194; queued jsonb;snapshot jsonb;begin
 -- A manual Save, month closure or existing continuation starts one resumable copy.
 update private.sheet_archive_config194 set copy_requested239=true,lease=p_lease,lease_until=now()+interval '5 minutes'
 where id and enabled and (lease_until is null or lease_until<now()) returning * into c;
 if not found then return null;end if;
 select coalesce(jsonb_agg(q order by id),'[]') into queued from(select * from private.sheet_archive_queue194 q0 order by case when c.annual231 is not null and exists(select 1 from jsonb_array_elements_text(coalesce(q0.accounting_years231,'[]')) y where y::integer>extract(year from now() at time zone 'Asia/Vientiane')::integer) then 1 else 0 end,id limit 1000)q;
 if c.annual231 is not null or c.saved_revision<>c.revision then snapshot:=private.sheet_archive_snapshot194();else snapshot:='{}'::jsonb;end if;
 return jsonb_build_object('config',to_jsonb(c),'tables',snapshot,'queue',queued,'years',(select coalesce(jsonb_agg(y order by year),'[]') from private.sheet_archive_years194 y));
end $$;

create or replace function public.sheet_archive_finish194(p_lease uuid,p_ids bigint[],p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare again boolean;
begin
 if not exists(select 1 from private.sheet_archive_config194 where lease=p_lease) then raise exception 'Archive lease changed'; end if;
 if p_error is null then delete from private.sheet_archive_queue194 where id=any(p_ids); end if;
 update private.sheet_archive_config194 set lease=null,lease_until=null,last_error=p_error,
 last_saved=case when p_error is null then now() else last_saved end,
 copy_requested239=p_error is not null or revision<>saved_revision or exists(select 1 from private.sheet_archive_queue194)
 where lease=p_lease returning copy_requested239 into again;
 if p_error is null and again then perform public.sheet_archive_wake194(); end if;
end $$;

create or replace function public.storage_year_finish231(p_lease uuid,p_ids bigint[],p_continue boolean) returns void
language plpgsql security definer set search_path='' as $$
declare again boolean;
begin
 if not exists(select 1 from private.sheet_archive_config194 where lease=p_lease) then raise exception 'Archive lease changed';end if;
 delete from private.sheet_archive_queue194 where id=any(p_ids);
 -- Future-year rows wait for the existing year-opening job, without daily rewrites.
 update private.sheet_archive_config194 set lease=null,lease_until=null,last_error=null,last_saved=now(),
 copy_requested239=p_continue or revision<>saved_revision where lease=p_lease returning copy_requested239 into again;
 if again then perform public.sheet_archive_wake194();end if;
end $$;

-- Match by job name; no environment-specific numeric job IDs.
select cron.alter_job(jobid,active:=false) from cron.job where jobname='google-inbox143150';
select cron.alter_job(jobid,schedule:='0 23 * * *',command:=$job$
 select net.http_post(url:='https://nhjsesfhapnjtwlxvirm.supabase.co/functions/v1/word-of-hope',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||public.google_poll_key143150()),body:='{"action":"sync"}'::jsonb,timeout_milliseconds:=60000)
 where exists(select 1 from public.hope_messages183 where synced_at is null);
$job$) from cron.job where jobname='word-of-hope183';
select cron.alter_job(jobid,schedule:='10 23 * * *',command:=$job$
 select public.sheet_archive_wake194() where exists(
 select 1 from private.sheet_archive_config194 where enabled and copy_requested239 and (lease_until is null or lease_until<now()));
$job$) from cron.job where jobname='accounting-sheet-retry201';
-- Preserve Dec 30 preparation and Jan 1 routing, checking once daily at 05:45 Laos.
select cron.alter_job(jobid,schedule:='45 22 * * *') from cron.job where jobname='accounting-yearly-storage231';
-- Technical scheduler logs only; retain failed runs and all accounting/audit records.
select cron.schedule('accounting-technical-retention239','20 23 * * *',$job$
 delete from cron.job_run_details where runid in (
  select runid from cron.job_run_details where status='succeeded' and end_time<now()-interval '30 days' order by runid limit 500);
 delete from public.google_states143150 where expires_at<now();
$job$);
