-- Requires scheduled_journal_approval225. Does not change existing journals,
-- restore occurrences, or reset the normal journal counter.
-- Keep AUTO allocation independent from the ordinary journal sequence.
BEGIN;
DO $guard$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='scheduled_manual_only225'
 AND conrelid='public.scheduled_journals'::regclass) THEN
  RAISE EXCEPTION 'Install and verify approval-only scheduled posting first';
 END IF;
END $guard$;
CREATE SEQUENCE IF NOT EXISTS private.scheduled_entry_number_seq AS bigint START WITH 1;
REVOKE ALL ON SEQUENCE private.scheduled_entry_number_seq FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;v_rate numeric;
begin
 if auth.uid() is null or not public.schedule_admin91() then raise exception 'Administrator approval required';end if;
 if current_setting('app.schedule_approval225',true) is distinct from p_id::text then raise exception 'Approve this occurrence before posting';end if;
 select * into s from public.scheduled_journals where id=p_id for update;
 if not found or s.status<>'active' or s.is_sample then raise exception 'Schedule is unavailable for posting';end if;
 v_today:=(now() at time zone 'Asia/Vientiane')::date;
 if not p_early and s.next_due>v_today then raise exception 'Schedule is not due yet';end if;
 if s.end_date is not null and s.next_due>s.end_date or s.max_occurrences is not null and s.posted_count>=s.max_occurrences then raise exception 'Schedule ended';end if;
 v_post:=s.next_due;
 v_rate:=case when s.currency_code='LAK' then 1 else s.fixed_book_rate_lak end;
 if v_rate is null or v_rate<=0 or (s.currency_code<>'LAK' and s.fixed_rate_currency is distinct from s.currency_code) then raise exception 'Set an approved book rate for this foreign-currency schedule before posting';end if;
 if s.credit_amount is null or s.credit_amount<>s.amount then raise exception 'Debit and credit must balance';end if;
 select status into v_status from public.accounting_periods where period_month=date_trunc('month',v_post)::date;
 if coalesce(v_status,'open')<>'open' then raise exception 'Posting period is %',v_status;end if;
 select currency_code into v_currency from public.accounts where id=s.debit_account_id and is_active=true;
 select currency_code into v_other from public.accounts where id=s.credit_account_id and is_active=true;
 if v_currency is null or v_currency is distinct from s.currency_code or v_other is distinct from s.currency_code then raise exception 'Scheduled account is inactive or has changed currency';end if;
 select automated_prefix,journal_digits into v_prefix,v_digits from public.accounting_id_settings where id=true;
 loop
  v_attempt:=v_attempt+1;if v_attempt>1000 then raise exception 'Unable to allocate entry ID';end if;
  v_num:=nextval('private.scheduled_entry_number_seq')::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
  -- Do not reuse an AUTO number retained only in audit history.
  if exists(select 1 from public.audit_log a where a.table_name='journal_entries'
    and (a.new_data->>'entry_no'=v_no or a.old_data->>'entry_no'=v_no)) then continue;end if;
  begin
   insert into public.journal_entries(entry_no,transaction_date,memo,status,source,posted_by,posted_at)
   values(v_no,v_post,s.memo,'posted','recurring',auth.uid(),now()) returning id into v_id;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into public.journal_lines(journal_entry_id,line_no,account_id,description,currency_code,debit,credit,line_date,fx_rate_lak,book_rate_lak) values
 (v_id,1,s.debit_account_id,s.memo,s.currency_code,s.amount,0,v_post,v_rate,v_rate),
 (v_id,2,s.credit_account_id,s.memo,s.currency_code,0,s.amount,v_post,v_rate,v_rate);
 perform public.check_ledger_entry14228(v_id);
 insert into public.scheduled_journal_occurrences(schedule_id,occurrence_date,journal_entry_id,posted_early) values(s.id,s.next_due,v_id,p_early and s.next_due>v_today);
 v_index:=s.posted_count+1;v_next:=public.schedule_next_date91(s.start_date,s.frequency,s.day_rule,s.anchor_day,v_index);
 update public.scheduled_journals set posted_count=v_index,next_due=v_next,status=case when (s.max_occurrences is not null and v_index>=s.max_occurrences) or (s.end_date is not null and v_next>s.end_date) then 'complete' else 'active' end,last_error=null,updated_at=now() where id=s.id;
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'APPROVED_SCHEDULE_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal approved and posted',auth.uid());
 return v_no;
end $function$;

REVOKE ALL ON FUNCTION public.post_scheduled_one91(uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
