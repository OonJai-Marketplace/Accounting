-- Oon Jai scheduled double-entry journals. Run once in Supabase SQL Editor.
-- Requires the accounting schema and 89-prefix-registry.sql.
-- Sample rows are safe previews: they never post and never enter the ledger.
begin;
create sequence if not exists public.scheduled_journal_number_seq;
create table if not exists public.scheduled_journals (
 id uuid primary key default gen_random_uuid(), schedule_no text unique not null,
 title text not null, memo text not null, currency_code text references public.currencies(code),
 debit_account_id uuid references public.accounts(id),credit_account_id uuid references public.accounts(id),
 amount numeric(20,2), frequency text not null check(frequency in ('weekly','monthly','quarterly','yearly')),
 day_rule text not null check(day_rule in ('same_day','last_day')),
 anchor_day integer not null check(anchor_day between 1 and 31),
 start_date date not null,next_due date not null,end_date date,
 max_occurrences integer check(max_occurrences is null or max_occurrences>0),
 posted_count integer not null default 0,reminder_days integer not null default 3 check(reminder_days between 0 and 90),
 auto_post boolean not null default true,
 status text not null default 'active' check(status in ('active','paused','complete','failed','sample')),
 last_error text,created_by uuid references public.profiles(id),
 is_sample boolean not null default false,sample_data jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 constraint scheduled_real_accounts check(is_sample or (debit_account_id is not null and credit_account_id is not null and debit_account_id<>credit_account_id and amount>0 and currency_code is not null)),
 constraint scheduled_dates check(end_date is null or end_date>=start_date)
);
create table if not exists public.scheduled_journal_occurrences (
 id uuid primary key default gen_random_uuid(),schedule_id uuid not null references public.scheduled_journals(id),
 occurrence_date date not null,journal_entry_id uuid not null unique references public.journal_entries(id),
 posted_at timestamptz not null default now(),posted_early boolean not null default false,
 reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,
 unique(schedule_id,occurrence_date)
);
create index if not exists scheduled_due91 on public.scheduled_journals(next_due) where status='active' and auto_post;
create index if not exists scheduled_review91 on public.scheduled_journal_occurrences(occurrence_date) where reviewed_at is null;
alter table public.scheduled_journals enable row level security;
alter table public.scheduled_journal_occurrences enable row level security;
revoke all on public.scheduled_journals,public.scheduled_journal_occurrences from anon,authenticated;
grant select on public.scheduled_journals,public.scheduled_journal_occurrences to authenticated;
drop policy if exists scheduled_admin_read91 on public.scheduled_journals;
create policy scheduled_admin_read91 on public.scheduled_journals for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active'));
drop policy if exists occurrences_admin_read91 on public.scheduled_journal_occurrences;
create policy occurrences_admin_read91 on public.scheduled_journal_occurrences for select to authenticated using (exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active'));
create or replace function public.schedule_admin91()
returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active')$$;
revoke all on function public.schedule_admin91() from public,anon;
grant execute on function public.schedule_admin91() to authenticated;
create or replace function public.next_schedule_no91()
returns text language plpgsql security definer set search_path=public as $$
declare p text;d integer;n text;
begin
 select schedule_prefix,journal_digits into p,d from public.accounting_id_settings where id=true;
 n:=nextval('public.scheduled_journal_number_seq')::text;
 return coalesce(p,'SCH')||'-'||lpad(n,greatest(coalesce(d,4),length(n)),'0');
end $$;
revoke all on function public.next_schedule_no91() from public,anon,authenticated;
create or replace function public.schedule_next_date91(p_anchor date,p_frequency text,p_rule text,p_day integer,p_index integer)
returns date language plpgsql immutable as $$
declare first_month date;result_month date;
begin
 if p_frequency='weekly' then return p_anchor+(7*p_index);end if;
 first_month:=date_trunc('month',p_anchor)::date;
 result_month:=(first_month+(case p_frequency when 'quarterly' then 3 when 'yearly' then 12 else 1 end*p_index||' months')::interval)::date;
 if p_rule='last_day' then return (result_month+interval '1 month - 1 day')::date;end if;
 return result_month+least(p_day,extract(day from (result_month+interval '1 month - 1 day'))::int)-1;
end $$;
create or replace function public.create_scheduled_journal91(p_title text,p_memo text,p_currency text,p_debit uuid,p_credit uuid,p_amount numeric,p_frequency text,p_rule text,p_start date,p_end date,p_count integer,p_reminder integer,p_auto boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_currency text;v_other text;v_day integer;v_first date;v_anchor date;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_title),'') is null or nullif(trim(p_memo),'') is null then raise exception 'Name and memo are required';end if;
 if p_frequency not in ('weekly','monthly','quarterly','yearly') or p_rule not in ('same_day','last_day') then raise exception 'Invalid frequency or date rule';end if;
 if p_amount is null or p_amount<=0 or p_debit is null or p_credit is null or p_debit=p_credit then raise exception 'Choose two different accounts and a positive amount';end if;
 select currency_code into v_currency from public.accounts where id=p_debit and is_active=true;
 select currency_code into v_other from public.accounts where id=p_credit and is_active=true;
 if v_currency is null or v_other is distinct from v_currency or v_currency is distinct from p_currency then raise exception 'Debit and credit accounts must use the selected currency';end if;
 if p_start is null or p_end is not null and p_end<p_start or p_count is not null and p_count<1 or p_reminder not between 0 and 90 then raise exception 'Invalid schedule dates, count or reminder';end if;
 v_day:=extract(day from p_start)::integer;
 v_first:=public.schedule_next_date91(p_start,p_frequency,p_rule,v_day,0);
 if p_end is not null and p_end<v_first then raise exception 'End date precedes first posting';end if;
 insert into public.scheduled_journals(schedule_no,title,memo,currency_code,debit_account_id,credit_account_id,amount,frequency,day_rule,anchor_day,start_date,next_due,end_date,max_occurrences,reminder_days,auto_post,created_by)
 values(public.next_schedule_no91(),trim(p_title),trim(p_memo),p_currency,p_debit,p_credit,p_amount,p_frequency,p_rule,v_day,p_start,v_first,p_end,p_count,p_reminder,p_auto,auth.uid()) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.create_scheduled_journal91(text,text,text,uuid,uuid,numeric,text,text,date,date,integer,integer,boolean) from public,anon;
grant execute on function public.create_scheduled_journal91(text,text,text,uuid,uuid,numeric,text,text,date,date,integer,integer,boolean) to authenticated;
create or replace function public.post_scheduled_one91(p_id uuid,p_early boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;
begin
 if auth.uid() is not null and not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=case when p_early and s.next_due>v_today then v_today else s.next_due end;
 select status into v_status from public.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('public.journal_entry_number_seq')::text;
  v_no:=coalesce(v_prefix,'AUTO')||'-'||lpad(v_num,greatest(coalesce(v_digits,4),length(v_num)),'0');
  begin
   insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post);
 insert into public.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update public.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'AUTO_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal posted',auth.uid());
 return v_no;
end $$;
revoke all on function public.post_scheduled_one91(uuid,boolean) from public,anon;
grant execute on function public.post_scheduled_one91(uuid,boolean) to authenticated;
create or replace function public.process_due_scheduled_journals91()
returns void language plpgsql security definer set search_path=public as $$
declare item record;v_today date:=(now() at time zone 'Asia/Vientiane')::date;
begin
 if auth.uid() is not null then raise exception 'Scheduler only';end if;
 for item in select id from public.scheduled_journals where status='active' and auto_post and not is_sample and next_due<=v_today order by next_due for update skip locked loop
  begin
   perform public.post_scheduled_one91(item.id,false);
  exception when others then
   update public.scheduled_journals set status='failed',last_error=sqlerrm,updated_at=now() where id=item.id;
  end;
 end loop;
end $$;
revoke all on function public.process_due_scheduled_journals91() from public,anon,authenticated;
create or replace function public.set_scheduled_status91(p_id uuid,p_status text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_status not in ('active','paused') then raise exception 'Invalid status';end if;
 update public.scheduled_journals set status=p_status,last_error=null,updated_at=now() where id=p_id and not is_sample and status in ('active','paused','failed');
 if not found then raise exception 'Schedule cannot be changed';end if;
end $$;
revoke all on function public.set_scheduled_status91(uuid,text) from public,anon;
grant execute on function public.set_scheduled_status91(uuid,text) to authenticated;
create or replace function public.update_future_schedule91(p_id uuid,p_title text,p_memo text,p_currency text,p_debit uuid,p_credit uuid,p_amount numeric,p_reminder integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_currency text;v_other text;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select currency_code into v_currency from public.accounts where id=p_debit and is_active=true;
 select currency_code into v_other from public.accounts where id=p_credit and is_active=true;
 if nullif(trim(p_title),'') is null or nullif(trim(p_memo),'') is null or p_amount<=0 or p_debit=p_credit or v_currency is null or v_currency is distinct from p_currency or v_other is distinct from p_currency or p_reminder not between 0 and 90 then raise exception 'Enter a name, memo, two active accounts of one currency, amount, and valid reminder';end if;
 update public.scheduled_journals set title=trim(p_title),memo=trim(p_memo),currency_code=p_currency,debit_account_id=p_debit,credit_account_id=p_credit,amount=p_amount,reminder_days=p_reminder,updated_at=now() where id=p_id and status in ('active','paused','failed') and not is_sample;
 if not found then raise exception 'Schedule is unavailable for editing';end if;
end $$;
revoke all on function public.update_future_schedule91(uuid,text,text,text,uuid,uuid,numeric,integer) from public,anon;
grant execute on function public.update_future_schedule91(uuid,text,text,text,uuid,uuid,numeric,integer) to authenticated;
create or replace function public.review_scheduled_occurrence91(p_occurrence uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 update public.scheduled_journal_occurrences set reviewed_by=auth.uid(),reviewed_at=now() where id=p_occurrence and exists(select 1 from public.journal_entries j where j.id=journal_entry_id and j.status='posted');
 if not found then raise exception 'Posted occurrence not found';end if;
end $$;
revoke all on function public.review_scheduled_occurrence91(uuid) from public,anon;
grant execute on function public.review_scheduled_occurrence91(uuid) to authenticated;
create or replace function public.unreview_scheduled_journal91()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.scheduled_journal_occurrences set reviewed_by=null,reviewed_at=null where journal_entry_id=coalesce(new.journal_entry_id,old.journal_entry_id);
 return coalesce(new,old);
end $$;
drop trigger if exists scheduled_line_change91 on public.journal_lines;
create trigger scheduled_line_change91 after insert or update or delete on public.journal_lines for each row execute function public.unreview_scheduled_journal91();
create or replace function public.unreview_scheduled_header91()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status is distinct from old.status or new.transaction_date is distinct from old.transaction_date or new.memo is distinct from old.memo then
 update public.scheduled_journal_occurrences set reviewed_by=null,reviewed_at=null where journal_entry_id=new.id;
 end if;return new;
end $$;
drop trigger if exists scheduled_header_change91 on public.journal_entries;
create trigger scheduled_header_change91 after update on public.journal_entries for each row execute function public.unreview_scheduled_header91();
create or replace function public.block_unreviewed_archive91()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('closed','locked') and (tg_op='INSERT' or old.status is distinct from new.status) and exists(
  select 1 from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id
  where date_trunc('month',j.transaction_date)::date=new.period_month and o.reviewed_at is null and j.status='posted'
 ) then raise exception 'Review all automated journals before closing this period';end if;
 return new;
end $$;
drop trigger if exists scheduled_archive_gate91 on public.accounting_periods;
create trigger scheduled_archive_gate91 before insert or update on public.accounting_periods for each row execute function public.block_unreviewed_archive91();
-- SQL samples only; account names are illustrative until you select real accounts.
insert into public.scheduled_journals(id,schedule_no,title,memo,amount,frequency,day_rule,anchor_day,start_date,next_due,max_occurrences,reminder_days,auto_post,status,is_sample,sample_data)
values
('00000000-0000-4000-8000-000000000091',public.next_schedule_no91(),'Monthly bank service fee','Monthly bank service fee — confirm against statement',25000,'monthly','same_day',15,'2026-09-15','2026-10-15',12,3,false,'sample',true,'{"debit":"Bank Charges Expense","credit":"BCEL Bank","currency":"LAK"}'::jsonb),
('00000000-0000-4000-8000-000000000092',public.next_schedule_no91(),'Monthly prepaid rent allocation','Monthly allocation of annual prepaid rent',3000000,'monthly','last_day',30,'2026-09-30','2026-10-31',12,2,false,'sample',true,'{"debit":"Rent Expense","credit":"Prepaid Rent","currency":"LAK"}'::jsonb)
on conflict(id) do nothing;
commit;
-- Scheduler activation is separate so data setup remains usable if pg_cron is unavailable.
create extension if not exists pg_cron;
select cron.schedule('oonjai-scheduled-journals91','*/5 * * * *','select public.process_due_scheduled_journals91()');
select schedule_no,title,status,next_due from public.scheduled_journals order by is_sample desc,created_at;
