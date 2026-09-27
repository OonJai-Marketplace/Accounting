-- Apply after 91-scheduled-journals.sql. No existing journal dates are changed.
begin;
alter table public.scheduled_journals add column if not exists credit_amount numeric(20,2);
update public.scheduled_journals set credit_amount=amount where credit_amount is null;
alter table public.scheduled_journal_occurrences add column if not exists schedule_snapshot jsonb;
update public.scheduled_journal_occurrences o set schedule_snapshot=to_jsonb(s) from public.scheduled_journals s where s.id=o.schedule_id and o.schedule_snapshot is null;
alter table public.scheduled_journal_occurrences alter column schedule_id drop not null;
alter table public.scheduled_journal_occurrences drop constraint if exists scheduled_journal_occurrences_schedule_id_fkey;
alter table public.scheduled_journal_occurrences add constraint scheduled_journal_occurrences_schedule_id_fkey foreign key(schedule_id) references public.scheduled_journals(id) on delete set null;
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
 v_post:=s.next_due;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
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
revoke all on function public.post_scheduled_one91(uuid,boolean) from authenticated;

-- Bind each request to the displayed occurrence. Retries return the original ID.
create or replace function public.post_scheduled_one92(p_id uuid,p_expected_due date,p_early boolean default false)
returns text language plpgsql security definer set search_path=public as $$
declare s public.scheduled_journals;n text;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if p_expected_due is null then raise exception 'Scheduled date required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule was deleted or is unavailable';end if;
 select j.entry_no into n from public.scheduled_journal_occurrences o join public.journal_entries j on j.id=o.journal_entry_id where o.schedule_id=p_id and o.occurrence_date=p_expected_due;
 if found then return n;end if;
 if s.next_due<>p_expected_due then raise exception 'Schedule changed. Refresh before posting';end if;
 return public.post_scheduled_one91(p_id,p_early);
end $$;
revoke all on function public.post_scheduled_one92(uuid,date,boolean) from public,anon;
grant execute on function public.post_scheduled_one92(uuid,date,boolean) to authenticated;
create or replace function public.create_scheduled_journal92(p_title text,p_memo text,p_currency text,p_debit uuid,p_credit uuid,p_amount numeric,p_credit_amount numeric,p_frequency text,p_start date,p_end date,p_reminder integer,p_auto boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if p_amount is null or p_credit_amount is null or p_amount<=0 or p_credit_amount<=0 or p_amount::text='NaN' or p_credit_amount::text='NaN' or round(p_amount,2)<>round(p_credit_amount,2) then raise exception 'Positive debit and credit amounts must balance';end if;
 v_id:=public.create_scheduled_journal91(p_title,p_memo,p_currency,p_debit,p_credit,p_amount,p_frequency,'same_day',p_start,p_end,null,p_reminder,p_auto);
 update public.scheduled_journals set credit_amount=p_credit_amount where id=v_id;
 return v_id;
end $$;
revoke all on function public.create_scheduled_journal92(text,text,text,uuid,uuid,numeric,numeric,text,date,date,integer,boolean) from public,anon;
grant execute on function public.create_scheduled_journal92(text,text,text,uuid,uuid,numeric,numeric,text,date,date,integer,boolean) to authenticated;
create or replace function public.update_future_schedule92(p_id uuid,p_title text,p_memo text,p_currency text,p_debit uuid,p_credit uuid,p_amount numeric,p_credit_amount numeric,p_reminder integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_amount is null or p_credit_amount is null or p_amount<=0 or p_credit_amount<=0 or p_amount::text='NaN' or p_credit_amount::text='NaN' or round(p_amount,2)<>round(p_credit_amount,2) then raise exception 'Positive debit and credit amounts must balance';end if;
 perform public.update_future_schedule91(p_id,p_title,p_memo,p_currency,p_debit,p_credit,p_amount,p_reminder);
 update public.scheduled_journals set credit_amount=p_credit_amount where id=p_id;
end $$;
revoke all on function public.update_future_schedule92(uuid,text,text,text,uuid,uuid,numeric,numeric,integer) from public,anon;
grant execute on function public.update_future_schedule92(uuid,text,text,text,uuid,uuid,numeric,numeric,integer) to authenticated;
-- Keep a source snapshot when the schedule itself is subsequently deleted.
create or replace function public.snapshot_scheduled_occurrence92()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 select to_jsonb(s) into new.schedule_snapshot from public.scheduled_journals s where s.id=new.schedule_id;
 return new;
end $$;
drop trigger if exists scheduled_occurrence_snapshot92 on public.scheduled_journal_occurrences;
create trigger scheduled_occurrence_snapshot92 before insert on public.scheduled_journal_occurrences for each row execute function public.snapshot_scheduled_occurrence92();
create or replace function public.audit_schedule92()
returns trigger language plpgsql security definer set search_path=public as $$
declare a text;r text;
begin
 if tg_op='DELETE' then
  a:='DELETE_SCHEDULE';r:=nullif(trim(current_setting('app.schedule_delete_reason92',true)),'');
  if r is null then raise exception 'Deletion reason required';end if;
 elsif tg_op='INSERT' then a:='CREATE_SCHEDULE';r:='Scheduled journal created';
 else
  if new.posted_count is distinct from old.posted_count then a:='SCHEDULE_POST_ADVANCE';r:='Occurrence posted; next date advanced';else a:='UPDATE_SCHEDULE';r:='Future scheduled entry updated';end if;
 end if;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id)
 values('scheduled_journals',coalesce(new.id,old.id)::text,a,case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end,r,auth.uid());
 return coalesce(new,old);
end $$;
drop trigger if exists scheduled_audit92 on public.scheduled_journals;
create trigger scheduled_audit92 after insert or update or delete on public.scheduled_journals for each row execute function public.audit_schedule92();
create or replace function public.delete_scheduled_journal92(p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare s public.scheduled_journals;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 if nullif(trim(p_reason),'') is null then raise exception 'Deletion reason required';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found then raise exception 'Schedule already deleted or unavailable';end if;
 perform set_config('app.schedule_delete_reason92',trim(p_reason),true);
 delete from public.scheduled_journals where id=p_id;
end $$;
revoke all on function public.delete_scheduled_journal92(uuid,text) from public,anon;
grant execute on function public.delete_scheduled_journal92(uuid,text) to authenticated;
-- Explicit repair for an older early posting. The user confirms this in Posting History.
create or replace function public.correct_scheduled_date92(p_occurrence uuid)
returns void language plpgsql security definer set search_path=public as $$
declare o public.scheduled_journal_occurrences;j public.journal_entries;v_after jsonb;
begin
 if not public.schedule_admin91() then raise exception 'Administrator required';end if;
 select * into o from public.scheduled_journal_occurrences where id=p_occurrence for update;
 if not found or not o.posted_early then raise exception 'Early posting not found';end if;
 select * into j from public.journal_entries where id=o.journal_entry_id for update;
 if j.status<>'posted' then raise exception 'Only posted journals can be corrected';end if;
 if j.transaction_date=o.occurrence_date then return;end if;
 if exists(select 1 from public.accounting_periods where period_month in (date_trunc('month',j.transaction_date)::date,date_trunc('month',o.occurrence_date)::date) and status<>'open') then raise exception 'Reopen both affected periods before correcting the date';end if;
 update public.journal_entries set transaction_date=o.occurrence_date where id=j.id;
 update public.journal_lines set line_date=o.occurrence_date where journal_entry_id=j.id;
 select to_jsonb(e) into v_after from public.journal_entries e where e.id=j.id;
 insert into public.audit_log(table_name,record_id,action,old_data,new_data,reason,actor_id) values('journal_entries',j.id::text,'UPDATE',to_jsonb(j),v_after,'Corrected earlier automatic posting to its scheduled occurrence date',auth.uid());
end $$;
revoke all on function public.correct_scheduled_date92(uuid) from public,anon;
grant execute on function public.correct_scheduled_date92(uuid) to authenticated;
commit;
