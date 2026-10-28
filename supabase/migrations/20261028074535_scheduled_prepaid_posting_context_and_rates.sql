DO $review_guard$ BEGIN
IF pg_get_functiondef('public.post_scheduled_one91(uuid,boolean)'::regprocedure) IS DISTINCT FROM $original$CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
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
end $function$
$original$ THEN RAISE EXCEPTION 'Scheduler function changed during review'; END IF;
IF pg_get_functiondef('public.process_due_scheduled_journals91()'::regprocedure) IS DISTINCT FROM $original$CREATE OR REPLACE FUNCTION public.process_due_scheduled_journals91()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
$original$ THEN RAISE EXCEPTION 'Scheduler function changed during review'; END IF;
END $review_guard$;
-- Preserve guarded automatic posting and explicit historical foreign-currency costs.
ALTER TABLE public.scheduled_journals
 ADD COLUMN IF NOT EXISTS fixed_book_rate_lak numeric,
 ADD COLUMN IF NOT EXISTS fixed_rate_currency text;
ALTER TABLE public.scheduled_journals ADD CONSTRAINT scheduled_fixed_rate_currency_check
 CHECK ((fixed_book_rate_lak IS NULL AND fixed_rate_currency IS NULL)
 OR (fixed_book_rate_lak IS NOT NULL AND fixed_book_rate_lak>0
 AND fixed_book_rate_lak NOT IN ('NaN'::numeric,'Infinity'::numeric)
 AND fixed_rate_currency IS NOT NULL AND fixed_rate_currency=currency_code));
COMMENT ON COLUMN public.scheduled_journals.fixed_book_rate_lak IS
 'Approved historical LAK book rate for a foreign-currency recurring release. LAK postings use 1. A foreign schedule without a rate fails before allocating a journal number.';

CREATE OR REPLACE FUNCTION public.post_scheduled_one91(p_id uuid, p_early boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare s public.scheduled_journals;v_id uuid;v_no text;v_num text;v_prefix text;v_digits integer;v_today date;v_post date;v_status text;v_currency text;v_other text;v_attempt integer:=0;v_next date;v_index integer;v_rate numeric;
begin
 if auth.uid() is not null and not public.schedule_admin91() then raise exception 'Administrator required';end if;
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
  v_num:=nextval('public.journal_entry_number_seq')::text;
  v_no:=private.format_entry_id143114(coalesce(v_prefix,'AUTO'),v_post,v_num::bigint,coalesce(v_digits,4));
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
 insert into public.audit_log(table_name,record_id,action,new_data,reason,actor_id) values('journal_entries',v_id::text,'AUTO_POST',jsonb_build_object('schedule_id',s.id,'due_date',s.next_due,'posted_early',p_early,'entry_no',v_no),'Scheduled journal posted',auth.uid());
 return v_no;
end $function$;
CREATE OR REPLACE FUNCTION public.process_due_scheduled_journals91()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 item record;
 v_today date := (now() at time zone 'Asia/Vientiane')::date;
 old_sub text := current_setting('request.jwt.claim.sub', true);
 old_role text := current_setting('request.jwt.claim.role', true);
 old_claims text := current_setting('request.jwt.claims', true);
BEGIN
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'Scheduler only'; END IF;
 -- Only the server can call this function. Each posting remains subject to the
 -- same active-admin and ledger guards as a manual posting by its creator.
 FOR item IN SELECT id, created_by FROM public.scheduled_journals
  WHERE status='active' AND auto_post AND NOT is_sample AND next_due<=v_today
  ORDER BY next_due, id FOR UPDATE SKIP LOCKED
 LOOP
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=item.created_by AND role='admin' AND status='active') THEN
   RAISE LOG 'Scheduled journal % skipped: creator no longer has active administrator access', item.id;
   CONTINUE;
  END IF;
  PERFORM set_config('request.jwt.claim.sub', item.created_by::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', item.created_by, 'role', 'authenticated')::text, true);
  BEGIN
   PERFORM public.post_scheduled_one91(item.id, false);
  EXCEPTION WHEN OTHERS THEN
   UPDATE public.scheduled_journals SET status='failed', last_error=SQLERRM, updated_at=now() WHERE id=item.id;
  END;
  PERFORM set_config('request.jwt.claim.sub', coalesce(old_sub,''), true);
  PERFORM set_config('request.jwt.claim.role', coalesce(old_role,''), true);
  PERFORM set_config('request.jwt.claims', coalesce(old_claims,''), true);
 END LOOP;
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('request.jwt.claim.sub', coalesce(old_sub,''), true);
 PERFORM set_config('request.jwt.claim.role', coalesce(old_role,''), true);
 PERFORM set_config('request.jwt.claims', coalesce(old_claims,''), true);
 RAISE;
END
$function$;


REVOKE ALL ON FUNCTION public.process_due_scheduled_journals91() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_scheduled_one91(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_scheduled_journals91() TO service_role;
GRANT EXECUTE ON FUNCTION public.post_scheduled_one91(uuid,boolean) TO service_role;
